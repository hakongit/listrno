import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import {
  createAnalystReport,
  getAllAnalystReports,
  getAnalystReportById,
  getAnalystReportByGmailId,
  updateAnalystReportExtraction,
  markAnalystReportFailed,
  deleteAnalystReport,
  getBankNameForDomain,
  getAnalystReportCount,
  getExtractionGuidance,
} from "@/lib/analyst-db";
import { getEmailById } from "@/lib/gmail";
import { extractReportData, isOpenRouterConfigured } from "@/lib/analyst-extraction";
import { extractTextFromPdf, extractLinkedPdfTexts } from "@/lib/pdf-extract";
import { revalidateTag } from "next/cache";

// POP3 fetch + PDF extraction + LLM call can take time
export const maxDuration = 60;

// GET: List all analyst reports
export async function GET(request: NextRequest) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);
    const status = searchParams.get("status") as "pending" | "processed" | "failed" | undefined;

    const [reports, total, pendingCount, processedCount, failedCount] = await Promise.all([
      getAllAnalystReports({ limit, offset, status }),
      getAnalystReportCount(),
      getAnalystReportCount("pending"),
      getAnalystReportCount("processed"),
      getAnalystReportCount("failed"),
    ]);

    return NextResponse.json({
      reports,
      total,
      counts: {
        pending: pendingCount,
        processed: processedCount,
        failed: failedCount,
      },
    });
  } catch (error) {
    console.error("Error listing reports:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list reports" },
      { status: 500 }
    );
  }
}

// POST: Import and process an email by message ID
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(ip, "api");
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: getRateLimitHeaders(rl) });
  }

  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { messageId, autoProcess = true } = await request.json();

    if (!messageId) {
      return NextResponse.json(
        { error: "messageId is required" },
        { status: 400 }
      );
    }

    // Check if already imported
    const existing = await getAnalystReportByGmailId(messageId);
    if (existing) {
      return NextResponse.json(
        { error: "Report already imported", reportId: existing.id },
        { status: 409 }
      );
    }

    // Fetch email from cache or POP3
    const email = await getEmailById(messageId);

    if (!email) {
      return NextResponse.json(
        { error: "Email not found" },
        { status: 404 }
      );
    }

    // Extract text from PDF attachments
    const pdfAttachments = email.attachments.filter(
      a => a.contentType === "application/pdf" || a.filename.toLowerCase().endsWith(".pdf")
    );
    const attachmentTexts: string[] = [];
    for (const att of pdfAttachments) {
      const text = await extractTextFromPdf(att.content);
      if (text) {
        attachmentTexts.push(text);
      }
    }

    // Extract text from PDFs linked in email body
    if (email.body) {
      const linkedTexts = await extractLinkedPdfTexts(email.body);
      attachmentTexts.push(...linkedTexts);
    }

    // Create report record with email body and attachment texts
    const reportId = await createAnalystReport({
      gmailMessageId: messageId,
      fromEmail: email.fromEmail,
      fromDomain: email.fromDomain,
      subject: email.subject,
      receivedDate: email.date,
      emailBody: email.body || undefined,
      attachmentTexts: attachmentTexts.length > 0 ? attachmentTexts : undefined,
    });

    // Auto-process if requested and OpenRouter is configured
    if (autoProcess && isOpenRouterConfigured()) {
      try {
        // Fetch global guidance for LLM extraction
        const guidance = await getExtractionGuidance();

        // Extract data using LLM (now with actual PDF content)
        const extracted = await extractReportData(
          email.body,
          attachmentTexts,
          email.subject,
          { guidance: guidance || undefined }
        );

        // Try to get bank name from domain whitelist
        if (!extracted.investmentBank) {
          const bankName = await getBankNameForDomain(email.fromDomain);
          if (bankName) {
            extracted.investmentBank = bankName;
          }
        }

        // Update report with extracted data
        await updateAnalystReportExtraction(reportId, extracted);
        revalidateTag("public-analyst-reports");

        const updatedReport = await getAnalystReportById(reportId);
        return NextResponse.json({
          success: true,
          report: updatedReport,
          extracted,
        });
      } catch (extractError) {
        console.error("Extraction error:", extractError);
        await markAnalystReportFailed(
          reportId,
          extractError instanceof Error ? extractError.message : "Extraction failed"
        );

        const report = await getAnalystReportById(reportId);
        return NextResponse.json({
          success: true,
          report,
          extractionFailed: true,
          extractionError: extractError instanceof Error ? extractError.message : "Unknown error",
        });
      }
    }

    const report = await getAnalystReportById(reportId);
    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error("Error importing report:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import report" },
      { status: 500 }
    );
  }
}

// PATCH: Update report extraction data
export async function PATCH(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(ip, "api");
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: getRateLimitHeaders(rl) });
  }

  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, ...data } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const report = await getAnalystReportById(id);
    if (!report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    await updateAnalystReportExtraction(id, data);
    revalidateTag("public-analyst-reports");

    const updated = await getAnalystReportById(id);
    return NextResponse.json({ success: true, report: updated });
  } catch (error) {
    console.error("Error updating report:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update report" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a report
export async function DELETE(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(ip, "api");
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: getRateLimitHeaders(rl) });
  }

  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    await deleteAnalystReport(id);
    revalidateTag("public-analyst-reports");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting report:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete report" },
      { status: 500 }
    );
  }
}
