import type { EmailMessage } from "./gmail";
import {
  createAnalystReport,
  getAnalystReportByGmailId,
  updateAnalystReportExtraction,
  markAnalystReportFailed,
  updateAnalystReportAttachmentTexts,
  getExtractionGuidance,
  getPreviousRecommendation,
  getBankNameForDomain,
} from "./analyst-db";
import { extractReportData } from "./analyst-extraction";
import { extractTextFromPdf, extractLinkedPdfTexts } from "./pdf-extract";
import type { ExtractedReportData, ExtractedRecommendation } from "./analyst-types";

export interface ProcessEmailResult {
  reportId: number;
  alreadyExisted: boolean;
  extracted?: ExtractedReportData;
  extractionFailed?: boolean;
  extractionError?: string;
}

export async function processEmail(
  email: EmailMessage,
  options?: {
    skipExtraction?: boolean;
    guidance?: string;
  }
): Promise<ProcessEmailResult | null> {
  // Dedup check
  const existing = await getAnalystReportByGmailId(email.id);
  if (existing) {
    return {
      reportId: existing.id,
      alreadyExisted: true,
      extracted:
        existing.extractionStatus === "processed"
          ? {
              investmentBank: existing.investmentBank,
              analystNames: existing.analystNames,
              recommendations: existing.recommendations.map((r) => ({
                companyName: r.companyName,
                companyIsin: r.companyIsin,
                targetPrice: r.targetPrice,
                targetCurrency: r.targetCurrency,
                recommendation: r.recommendation,
                summary: r.summary,
                investmentBank: r.investmentBank,
                previousTargetPrice: r.previousTargetPrice,
                previousRecommendation: r.previousRecommendation,
              })),
            }
          : undefined,
    };
  }

  // Extract PDF texts from attachments
  const attachmentTexts: string[] = [];
  for (const att of email.attachments) {
    if (
      att.contentType === "application/pdf" ||
      att.filename.toLowerCase().endsWith(".pdf")
    ) {
      const text = await extractTextFromPdf(att.content);
      if (text) attachmentTexts.push(text);
    }
  }

  // Also extract linked PDFs from email body
  const linkedPdfTexts = await extractLinkedPdfTexts(email.body);
  attachmentTexts.push(...linkedPdfTexts);

  // Look up bank name from domain whitelist
  const bankName = await getBankNameForDomain(email.fromDomain);

  // Create report
  const reportId = await createAnalystReport({
    gmailMessageId: email.id,
    fromEmail: email.fromEmail,
    fromDomain: email.fromDomain,
    subject: email.subject,
    receivedDate: email.date,
    emailBody: email.body,
    attachmentTexts: attachmentTexts.length > 0 ? attachmentTexts : undefined,
  });

  if (options?.skipExtraction) {
    return { reportId, alreadyExisted: false };
  }

  // Run LLM extraction
  const guidance = options?.guidance ?? (await getExtractionGuidance());

  try {
    const extracted = await withRetry(
      () =>
        extractReportData(email.body, attachmentTexts, email.subject, {
          guidance,
        }),
      3,
      2000
    );

    // Set investment bank from domain whitelist if LLM didn't find one
    if (!extracted.investmentBank && bankName) {
      extracted.investmentBank = bankName;
    }

    // Enrich with previous recommendations from DB
    await enrichWithPreviousRecommendations(extracted, email.date);

    await updateAnalystReportExtraction(reportId, extracted);

    // Update attachment texts if we got any
    if (attachmentTexts.length > 0) {
      await updateAnalystReportAttachmentTexts(reportId, attachmentTexts);
    }

    return {
      reportId,
      alreadyExisted: false,
      extracted,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await markAnalystReportFailed(reportId, errorMsg);
    return {
      reportId,
      alreadyExisted: false,
      extractionFailed: true,
      extractionError: errorMsg,
    };
  }
}

export async function enrichWithPreviousRecommendations(
  extracted: ExtractedReportData,
  receivedDate: string
): Promise<void> {
  for (const rec of extracted.recommendations) {
    // Only look up previous if LLM didn't already extract it
    if (rec.previousTargetPrice || rec.previousRecommendation) continue;
    if (!rec.companyName) continue;

    const bank = rec.investmentBank || extracted.investmentBank;
    if (!bank) continue;

    try {
      const previous = await getPreviousRecommendation(
        rec.companyName,
        bank,
        receivedDate
      );
      if (previous) {
        if (previous.targetPrice && !rec.previousTargetPrice) {
          rec.previousTargetPrice = previous.targetPrice;
        }
        if (previous.recommendation && !rec.previousRecommendation) {
          rec.previousRecommendation = previous.recommendation;
        }
      }
    } catch {
      // Non-critical, continue
    }
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 2000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxRetries) {
        // Check if it's a rate limit error (429)
        const isRateLimit = lastError.message.includes("429");
        const delay = isRateLimit
          ? baseDelay * Math.pow(2, attempt) + Math.random() * 1000
          : baseDelay;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
