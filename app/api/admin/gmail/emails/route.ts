import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import {
  fetchEmails,
  filterByDomains,
  isGmailConfigured,
} from "@/lib/gmail";
import { getAllAnalystDomains, getAnalystReportByGmailId } from "@/lib/analyst-db";

// GET: List emails from whitelisted domains
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

  try {
    const searchParams = request.nextUrl.searchParams;
    const maxResults = parseInt(searchParams.get("maxResults") || "20", 10);
    const filterDomain = searchParams.get("domain") || undefined;

    // Get whitelisted domains
    const domains = await getAllAnalystDomains();

    if (domains.length === 0) {
      return NextResponse.json({
        emails: [],
        message: "No whitelisted domains. Add analyst domains first.",
      });
    }

    // Fetch emails via POP3
    const allEmails = await fetchEmails({ maxResults: maxResults * 3 });

    // Filter by domains
    const domainList = filterDomain
      ? [filterDomain]
      : domains.map(d => d.domain);
    const filteredEmails = filterByDomains(allEmails, domainList).slice(0, maxResults);

    // Check import status for each email
    const emailsWithStatus = await Promise.all(
      filteredEmails.map(async (email) => {
        const existingReport = await getAnalystReportByGmailId(email.id);
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
    const emails = await fetchEmails({ maxResults: 100 });
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
