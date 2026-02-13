import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import {
  initializeAnalystDatabase,
  getSyncState,
  setSyncState,
} from "@/lib/analyst-db";
import { createImapClient, getMailboxState, fetchEmailsByUidRange } from "@/lib/imap";
import { processEmail } from "@/lib/email-processor";
import { getExtractionGuidance } from "@/lib/analyst-db";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  // Authenticate via CRON_SECRET
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await initializeAnalystDatabase();

    const guidance = await getExtractionGuidance();

    // Connect via IMAP
    const client = createImapClient();
    await client.connect();

    let newReports = 0;

    try {
      const state = await getMailboxState(client);

      // Check UIDVALIDITY
      const savedValidity = await getSyncState("imap_uid_validity");
      if (savedValidity && parseInt(savedValidity) !== state.uidValidity) {
        console.log("[cron] UIDVALIDITY changed, resetting checkpoint");
        await setSyncState("imap_last_uid", "0");
      }
      await setSyncState("imap_uid_validity", String(state.uidValidity));

      // Get checkpoint
      const lastUidStr = await getSyncState("imap_last_uid");
      const lastUid = lastUidStr ? parseInt(lastUidStr) : 0;
      const startUid = lastUid + 1;

      if (startUid >= state.uidNext) {
        await setSyncState("last_sync_at", new Date().toISOString());
        return NextResponse.json({
          message: "Already up to date",
          lastUid,
          uidNext: state.uidNext,
        });
      }

      console.log(`[cron] Syncing UIDs ${startUid} to ${state.uidNext - 1}`);

      // Fetch new emails
      const fetched = await fetchEmailsByUidRange(
        client,
        `${startUid}:${state.uidNext - 1}`
      );

      console.log(`[cron] Fetched ${fetched.length} new emails`);

      // Process sequentially (cron typically sees 0-10 new emails)
      let highestUid = lastUid;
      for (const { uid, email } of fetched) {
        try {
          const result = await processEmail(email, { guidance });
          if (result && !result.alreadyExisted && !result.extractionFailed) {
            newReports++;
          }
        } catch (err) {
          console.error(`[cron] Error processing UID ${uid}:`, err);
        }
        highestUid = Math.max(highestUid, uid);
      }

      // Update checkpoint
      await setSyncState("imap_last_uid", String(highestUid));
      await setSyncState("last_sync_at", new Date().toISOString());

      // Revalidate public cache if new reports were imported
      if (newReports > 0) {
        revalidateTag("public-analyst-reports");
      }

      return NextResponse.json({
        message: `Synced ${fetched.length} emails, ${newReports} new reports`,
        fetched: fetched.length,
        newReports,
        highestUid,
      });
    } finally {
      await client.logout();
    }
  } catch (err) {
    console.error("[cron] Sync error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
