import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { EmailMessage } from "./gmail";
import { extractDomain } from "./gmail";

function getCredentials() {
  const email = process.env.GMAIL_EMAIL;
  const password = process.env.GMAIL_APP_PASSWORD;

  if (!email || !password) {
    throw new Error("GMAIL_EMAIL and GMAIL_APP_PASSWORD must be set");
  }

  return { email, password };
}

export function createImapClient(): ImapFlow {
  const { email, password } = getCredentials();

  return new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: {
      user: email,
      pass: password,
    },
    logger: false,
  });
}

export interface MailboxState {
  uidValidity: number;
  uidNext: number;
  messageCount: number;
}

export async function getMailboxState(client: ImapFlow): Promise<MailboxState> {
  const mailbox = await client.getMailboxLock("INBOX");
  try {
    const mb = client.mailbox;
    if (!mb) throw new Error("Failed to open INBOX");
    return {
      uidValidity: Number(mb.uidValidity),
      uidNext: Number(mb.uidNext),
      messageCount: mb.exists,
    };
  } finally {
    mailbox.release();
  }
}

export interface FetchedEmail {
  uid: number;
  email: EmailMessage;
}

export async function fetchEmailsByUidRange(
  client: ImapFlow,
  uidRange: string,
  onProgress?: (current: number, total: number) => void
): Promise<FetchedEmail[]> {
  const results: FetchedEmail[] = [];
  const lock = await client.getMailboxLock("INBOX");

  try {
    let current = 0;
    // Estimate total from range
    const rangeParts = uidRange.split(":");
    const rangeStart = parseInt(rangeParts[0]);
    const rangeEnd = rangeParts[1] === "*" ? 0 : parseInt(rangeParts[1]);
    const estimatedTotal = rangeEnd > 0 ? rangeEnd - rangeStart + 1 : 100;

    for await (const message of client.fetch(uidRange, {
      uid: true,
      source: true,
    })) {
      current++;
      if (onProgress) onProgress(current, estimatedTotal);

      try {
        const raw = message.source;
        if (!raw) continue;

        const parsed = await simpleParser(raw);

        const fromAddr = parsed.from?.value?.[0];
        const fromEmail = fromAddr?.address || "";
        const fromName = fromAddr?.name || fromEmail;
        const fromDomain = extractDomain(fromEmail);
        const subject = parsed.subject || "(No subject)";
        const messageId = (parsed.messageId || `imap-${message.uid}`).replace(
          /[<>]/g,
          ""
        );

        const body =
          parsed.text ||
          (parsed.html
            ? parsed.html
                .replace(/<[^>]*>/g, " ")
                .replace(/\s+/g, " ")
                .trim()
            : "");

        const attachments = (parsed.attachments || []).map((att) => ({
          filename: att.filename || "unnamed",
          content: att.content,
          contentType: att.contentType || "application/octet-stream",
        }));

        if (!fromEmail) continue;

        results.push({
          uid: message.uid,
          email: {
            id: messageId,
            from: fromName,
            fromEmail,
            fromDomain,
            subject,
            date: (parsed.date || new Date()).toISOString(),
            body,
            attachments,
          },
        });
      } catch (err) {
        console.error(`Error parsing IMAP message UID ${message.uid}:`, err);
      }
    }
  } finally {
    lock.release();
  }

  return results;
}
