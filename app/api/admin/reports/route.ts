import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
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
} from "@/lib/analyst-db";
import { fetchEmails } from "@/lib/gmail";
import { extractReportData, isOpenRouterConfigured } from "@/lib/analyst-extraction";

// GET: List all analyst reports
export async function GET(request: NextRequest) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
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

    // Fetch email from POP3
    const emails = await fetchEmails({ maxResults: 100 });
    const email = emails.find(e => e.id === messageId);

    if (!email) {
      return NextResponse.json(
        { error: "Email not found" },
        { status: 404 }
      );
    }

    // Create report record
    const reportId = await createAnalystReport({
      gmailMessageId: messageId,
      fromEmail: email.fromEmail,
      fromDomain: email.fromDomain,
      subject: email.subject,
      receivedDate: email.date,
    });

    // Auto-process if requested and OpenRouter is configured
    if (autoProcess && isOpenRouterConfigured()) {
      try {
        // Extract data using LLM
        const extracted = await extractReportData(email.body, [], email.subject);

        // Try to get bank name from domain whitelist
        if (!extracted.investmentBank) {
          const bankName = await getBankNameForDomain(email.fromDomain);
          if (bankName) {
            extracted.investmentBank = bankName;
          }
        }

        // Update report with extracted data
        await updateAnalystReportExtraction(reportId, extracted);

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
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting report:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete report" },
      { status: 500 }
    );
  }
}
