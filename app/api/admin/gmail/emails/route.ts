import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import {
  fetchEmailsWithProgress,
  getEmailById,
  isGmailConfigured,
} from "@/lib/gmail";
import { getAllAnalystDomains, getAnalystReportByGmailId, createAnalystReport } from "@/lib/analyst-db";
import { extractTextFromPdf } from "@/lib/pdf-extract";

// POP3 can take 30-60s to connect + fetch emails
export const maxDuration = 60;

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

          // Auto-import whitelisted emails that aren't already imported
          const toAutoImport = emailsWithStatus.filter(e => e.isWhitelisted && !e.imported);
          if (toAutoImport.length > 0) {
            send("status", { message: `Auto-importerer ${toAutoImport.length} godkjente e-poster...` });
            for (let i = 0; i < toAutoImport.length; i++) {
              const emailStatus = toAutoImport[i];
              const fullEmail = allEmails.find(e => e.id === emailStatus.id);
              if (!fullEmail) continue;

              send("progress", {
                stage: "auto-import",
                current: i + 1,
                total: toAutoImport.length,
                message: `Importerer: ${emailStatus.subject}`,
              });

              try {
                // Extract text from PDF attachments
                const pdfAttachments = fullEmail.attachments.filter(
                  a => a.contentType === "application/pdf" || a.filename.toLowerCase().endsWith(".pdf")
                );
                const attachmentTexts: string[] = [];
                for (const att of pdfAttachments) {
                  const text = await extractTextFromPdf(att.content);
                  if (text) attachmentTexts.push(text);
                }

                const reportId = await createAnalystReport({
                  gmailMessageId: fullEmail.id,
                  fromEmail: fullEmail.fromEmail,
                  fromDomain: fullEmail.fromDomain,
                  subject: fullEmail.subject,
                  receivedDate: fullEmail.date,
                  emailBody: fullEmail.body || undefined,
                  attachmentTexts: attachmentTexts.length > 0 ? attachmentTexts : undefined,
                });

                // Update status in the list
                emailStatus.imported = true;
                emailStatus.reportId = reportId;

                send("progress", {
                  stage: "auto-import",
                  current: i + 1,
                  total: toAutoImport.length,
                  message: `Importert: ${emailStatus.subject}`,
                });
              } catch (err) {
                send("progress", {
                  stage: "auto-import-error",
                  current: i + 1,
                  total: toAutoImport.length,
                  message: `Feil ved import av ${emailStatus.subject}: ${err instanceof Error ? err.message : "Ukjent feil"}`,
                });
              }
            }
          }

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

    // Fetch from cache or POP3
    const email = await getEmailById(messageId);

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
