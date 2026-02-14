import { getDb } from "../lib/db";
import {
  initializeAnalystDatabase,
  updateAnalystReportExtraction,
  markAnalystReportFailed,
  getExtractionGuidance,
  getPreviousRecommendation,
  getBankNameForDomain,
  isAggregatorSource,
} from "../lib/analyst-db";
import { extractReportData } from "../lib/analyst-extraction";
import { enrichWithPreviousRecommendations, withRetry } from "../lib/email-processor";
import type { ExtractedReportData } from "../lib/analyst-types";

const BATCH_SIZE = 20;
const DELAY_BETWEEN_BATCHES = 1000;

async function main() {
  console.log("=== Reprocess Pending & Failed Reports ===\n");

  await initializeAnalystDatabase();
  const db = getDb();
  const guidance = await getExtractionGuidance();
  console.log(`LLM guidance: ${guidance.length} chars\n`);

  // Get all pending and failed reports
  const result = await db.execute(
    `SELECT id, from_domain, subject, received_date, email_body, attachment_texts, extraction_status
     FROM analyst_reports
     WHERE extraction_status IN ('pending', 'failed')
     ORDER BY received_date DESC`
  );

  const total = result.rows.length;
  console.log(`Found ${total} reports to process (pending + failed)\n`);

  if (total === 0) return;

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = result.rows.slice(i, i + BATCH_SIZE);
    console.log(`--- Batch ${Math.floor(i / BATCH_SIZE) + 1}: reports ${i + 1}-${Math.min(i + BATCH_SIZE, total)} of ${total} ---`);

    for (const row of batch) {
      const id = Number(row.id);
      const emailBody = row.email_body ? String(row.email_body) : "";
      const attachmentTexts = row.attachment_texts ? JSON.parse(String(row.attachment_texts)) as string[] : [];
      const subject = String(row.subject || "");
      const fromDomain = String(row.from_domain || "");
      const receivedDate = String(row.received_date || "");

      if (!emailBody && attachmentTexts.length === 0) {
        processed++;
        failed++;
        continue;
      }

      try {
        const extracted = await withRetry(
          () => extractReportData(emailBody, attachmentTexts, subject, { guidance }),
          3,
          2000
        );

        // Set investment bank from domain whitelist if LLM didn't find one
        const bankName = await getBankNameForDomain(fromDomain);
        if (!extracted.investmentBank && bankName && !isAggregatorSource(bankName)) {
          extracted.investmentBank = bankName;
        }

        // Enrich with previous recommendations
        await enrichWithPreviousRecommendations(extracted, receivedDate);

        await updateAnalystReportExtraction(id, extracted);
        succeeded++;
        const recCount = extracted.recommendations.length;
        process.stdout.write(`  #${id}: ${recCount} rec(s) - ${subject.substring(0, 50)}\n`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        await markAnalystReportFailed(id, errorMsg);
        failed++;
        process.stdout.write(`  #${id}: FAILED - ${errorMsg.substring(0, 60)}\n`);
      }

      processed++;
    }

    console.log(`  Progress: ${processed}/${total} (${succeeded} ok, ${failed} failed)\n`);

    if (i + BATCH_SIZE < total) {
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_BATCHES));
    }
  }

  console.log(`\n=== Complete ===`);
  console.log(`Total:     ${total}`);
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Failed:    ${failed}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
