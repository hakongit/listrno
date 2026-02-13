import { initializeAnalystDatabase, getSyncState, setSyncState } from "../lib/analyst-db";
import { createImapClient, getMailboxState, fetchEmailsByUidRange } from "../lib/imap";
import { processEmail } from "../lib/email-processor";
import { getExtractionGuidance } from "../lib/analyst-db";

const BATCH_SIZE = 50;
const CONCURRENCY = 5;

interface Stats {
  processed: number;
  imported: number;
  skipped: number;
  failed: number;
  total: number;
}

async function main() {
  console.log("=== Bulk Email Import ===\n");

  // Initialize database schema
  await initializeAnalystDatabase();

  // Load guidance once
  const guidance = await getExtractionGuidance();
  console.log(`LLM guidance: ${guidance ? guidance.length + " chars" : "none"}\n`);

  // Connect via IMAP
  console.log("Connecting to imap.gmail.com...");
  const client = createImapClient();
  await client.connect();
  console.log("Connected!\n");

  try {
    const state = await getMailboxState(client);
    console.log(`Mailbox: ${state.messageCount} messages, uidValidity=${state.uidValidity}, uidNext=${state.uidNext}\n`);

    // Check UIDVALIDITY
    const savedValidity = await getSyncState("imap_uid_validity");
    if (savedValidity && parseInt(savedValidity) !== state.uidValidity) {
      console.log("WARNING: UIDVALIDITY changed! Gmail may have reassigned UIDs.");
      console.log(`  Saved: ${savedValidity}, Current: ${state.uidValidity}`);
      console.log("  Resetting checkpoint to start from UID 1.\n");
      await setSyncState("imap_last_uid", "0");
    }
    await setSyncState("imap_uid_validity", String(state.uidValidity));

    // Get checkpoint
    const lastUidStr = await getSyncState("imap_last_uid");
    const lastUid = lastUidStr ? parseInt(lastUidStr) : 0;
    const startUid = lastUid + 1;

    if (startUid >= state.uidNext) {
      console.log(`Already up to date. Last processed UID: ${lastUid}, next available: ${state.uidNext}`);
      return;
    }

    console.log(`Resuming from UID ${startUid} (last processed: ${lastUid})`);
    console.log(`Fetching UIDs ${startUid} to ${state.uidNext - 1}\n`);

    const stats: Stats = { processed: 0, imported: 0, skipped: 0, failed: 0, total: 0 };

    // Process in batches
    let batchStart = startUid;
    while (batchStart < state.uidNext) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, state.uidNext - 1);
      const uidRange = `${batchStart}:${batchEnd}`;

      console.log(`--- Batch: UIDs ${batchStart}-${batchEnd} ---`);

      // Fetch batch from IMAP
      const fetched = await fetchEmailsByUidRange(client, uidRange, (current, total) => {
        process.stdout.write(`\r  Fetching ${current}/${total}...`);
      });
      console.log(`\n  Fetched ${fetched.length} emails`);

      stats.total += fetched.length;

      // Process with limited concurrency
      const chunks: typeof fetched[] = [];
      for (let i = 0; i < fetched.length; i += CONCURRENCY) {
        chunks.push(fetched.slice(i, i + CONCURRENCY));
      }

      for (const chunk of chunks) {
        const results = await Promise.allSettled(
          chunk.map(async ({ email }) => {
            try {
              const result = await processEmail(email, { guidance });
              if (!result) return "failed";
              if (result.alreadyExisted) return "skipped";
              if (result.extractionFailed) return "failed";
              return "imported";
            } catch (err) {
              console.error(`  Error processing ${email.id}: ${err}`);
              return "failed";
            }
          })
        );

        for (const r of results) {
          if (r.status === "fulfilled") {
            stats.processed++;
            if (r.value === "imported") stats.imported++;
            else if (r.value === "skipped") stats.skipped++;
            else stats.failed++;
          } else {
            stats.processed++;
            stats.failed++;
          }
        }

        // Log progress
        const recs = chunk.map(({ email }) => `${email.fromDomain}: ${email.subject.substring(0, 50)}`);
        for (const rec of recs) {
          console.log(`  ${rec}`);
        }
      }

      // Checkpoint after each batch
      const highestUid = fetched.length > 0
        ? Math.max(...fetched.map((f) => f.uid))
        : batchEnd;
      await setSyncState("imap_last_uid", String(highestUid));
      console.log(`  Checkpoint: UID ${highestUid}`);
      console.log(`  Progress: ${stats.processed}/${stats.total} (${stats.imported} imported, ${stats.skipped} skipped, ${stats.failed} failed)\n`);

      batchStart = batchEnd + 1;
    }

    console.log("\n=== Complete ===");
    console.log(`Processed: ${stats.processed}`);
    console.log(`Imported:  ${stats.imported}`);
    console.log(`Skipped:   ${stats.skipped} (already in DB)`);
    console.log(`Failed:    ${stats.failed}`);
    console.log(`Total:     ${stats.total}`);
  } finally {
    await client.logout();
    console.log("\nDisconnected from IMAP.");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
