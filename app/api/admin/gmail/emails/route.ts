import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import {
  fetchEmailsWithProgress,
  isGmailConfigured,
} from "@/lib/gmail";
import { getAllAnalystDomains, getAnalystReportByGmailId } from "@/lib/analyst-db";

// GET: List emails from whitelisted domains with streaming progress
export async function GET(request: NextRequest) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isGmailConfigured()) {
    return NextResponse.json(
      { error: "Gmail not configured. Set GMAIL_EMAIL and GMAIL_APP_PASSWORD." },
      { status: 400 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const maxResults = parseInt(searchParams.get("maxResults") || "20", 10);
  const filterDomain = searchParams.get("domain") || undefined;
  const stream = searchParams.get("stream") === "true";

  // Get whitelisted domains (for highlighting, not filtering)
  const domains = await getAllAnalystDomains();
  const whitelistedDomains = new Set(domains.map(d => d.domain.toLowerCase()));

  // Stream mode - return Server-Sent Events
  if (stream) {
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        try {
          send("status", { message: "Kobler til Gmail POP3..." });

          const allEmails = await fetchEmailsWithProgress(
            { maxResults },
            (progress) => {
              send("progress", progress);
            }
          );

          send("status", { message: "Sjekker importstatus..." });

          // Check import status for each email (no domain filtering)
          const emailsWithStatus = await Promise.all(
            allEmails.map(async (email) => {
              const existingReport = await getAnalystReportByGmailId(email.id);
              const isWhitelisted = whitelistedDomains.has(email.fromDomain.toLowerCase());
              return {
                id: email.id,
                from: { email: email.fromEmail, name: email.from },
                domain: email.fromDomain,
                subject: email.subject,
                date: email.date,
                snippet: email.body.substring(0, 200) + (email.body.length > 200 ? "..." : ""),
                attachmentCount: email.attachments.length,
                imported: !!existingReport,
                reportId: existingReport?.id,
                isWhitelisted,
              };
            })
          );

          send("complete", {
            emails: emailsWithStatus,
            domains: domains.map((d) => ({ domain: d.domain, bankName: d.bankName })),
          });
        } catch (error) {
          send("error", { message: error instanceof Error ? error.message : "Failed to fetch emails" });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  }

  // Non-stream mode (fallback)
  try {
    const allEmails = await fetchEmailsWithProgress({ maxResults });

    const emailsWithStatus = await Promise.all(
      allEmails.map(async (email) => {
        const existingReport = await getAnalystReportByGmailId(email.id);
        const isWhitelisted = whitelistedDomains.has(email.fromDomain.toLowerCase());
        return {
          id: email.id,
          from: { email: email.fromEmail, name: email.from },
          domain: email.fromDomain,
          subject: email.subject,
          date: email.date,
          snippet: email.body.substring(0, 200) + (email.body.length > 200 ? "..." : ""),
          attachmentCount: email.attachments.length,
          imported: !!existingReport,
          reportId: existingReport?.id,
          isWhitelisted,
        };
      })
    );

    return NextResponse.json({
      emails: emailsWithStatus,
      domains: domains.map((d) => ({ domain: d.domain, bankName: d.bankName })),
    });
  } catch (error) {
    console.error("Error listing emails:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list emails" },
      { status: 500 }
    );
  }
}

// POST: Get full email content for processing
export async function POST(request: NextRequest) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isGmailConfigured()) {
    return NextResponse.json(
      { error: "Gmail not configured" },
      { status: 400 }
    );
  }

  try {
    const { messageId } = await request.json();

    if (!messageId) {
      return NextResponse.json(
        { error: "messageId is required" },
        { status: 400 }
      );
    }

    // Fetch all recent emails and find the one we want
    const emails = await fetchEmailsWithProgress({ maxResults: 100 });
    const email = emails.find(e => e.id === messageId);

    if (!email) {
      return NextResponse.json(
        { error: "Email not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: email.id,
      from: email.fromEmail,
      domain: email.fromDomain,
      subject: email.subject,
      date: email.date,
      body: email.body,
      attachments: email.attachments.map(a => ({
        filename: a.filename,
        contentType: a.contentType,
      })),
    });
  } catch (error) {
    console.error("Error fetching email:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch email" },
      { status: 500 }
    );
  }
}
