import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import {
  getAnalystReportById,
  updateAnalystReportExtraction,
  getExtractionGuidance,
  getBankNameForDomain,
} from "@/lib/analyst-db";
import { extractReportData } from "@/lib/analyst-extraction";
import { revalidateTag } from "next/cache";

export const maxDuration = 60;

// POST: Re-process a report with optional feedback
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
    const { reportId, feedback } = await request.json();

    if (!reportId) {
      return NextResponse.json({ error: "reportId is required" }, { status: 400 });
    }

    const report = await getAnalystReportById(reportId);
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (!report.emailBody && (!report.attachmentTexts || report.attachmentTexts.length === 0)) {
      return NextResponse.json(
        { error: "Report has no stored content to re-process" },
        { status: 400 }
      );
    }

    const guidance = await getExtractionGuidance();

    const extracted = await extractReportData(
      report.emailBody || "",
      report.attachmentTexts || [],
      report.subject,
      {
        guidance: guidance || undefined,
        feedback: feedback || undefined,
      }
    );

    // Try to get bank name from domain whitelist if not extracted
    if (!extracted.investmentBank) {
      const bankName = await getBankNameForDomain(report.fromDomain);
      if (bankName) {
        extracted.investmentBank = bankName;
      }
    }

    await updateAnalystReportExtraction(reportId, extracted);
    revalidateTag("public-analyst-reports");

    return NextResponse.json({ success: true, extracted });
  } catch (error) {
    console.error("Error re-processing report:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to re-process report" },
      { status: 500 }
    );
  }
}
