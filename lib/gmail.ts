import Pop3Command from "node-pop3";
import { simpleParser } from "mailparser";

// Timeout wrapper for POP3 operations
function withTimeout<T>(promise: Promise<T>, ms: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${operation} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

export interface EmailMessage {
  id: string;
  from: string;
  fromEmail: string;
  fromDomain: string;
  subject: string;
  date: string;
  body: string;
  attachments: { filename: string; content: Buffer; contentType: string }[];
}

function getCredentials() {
  const email = process.env.GMAIL_EMAIL;
  const password = process.env.GMAIL_APP_PASSWORD;

  if (!email || !password) {
    throw new Error("GMAIL_EMAIL and GMAIL_APP_PASSWORD must be set");
  }

  return { email, password };
}

// Check if Gmail is configured
export function isGmailConfigured(): boolean {
  try {
    getCredentials();
    return true;
  } catch {
    return false;
  }
}

// No OAuth setup needed with POP3
export function needsOAuthSetup(): boolean {
  return false;
}

// Parse email headers from raw email (used for fast header pre-filtering)
function parseHeaders(raw: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const headerSection = raw.split(/\r?\n\r?\n/)[0];
  const lines = headerSection.split(/\r?\n/);

  let currentKey = "";
  let currentValue = "";

  for (const line of lines) {
    if (line.startsWith(" ") || line.startsWith("\t")) {
      // Continuation of previous header
      currentValue += " " + line.trim();
    } else {
      // Save previous header
      if (currentKey) {
        headers[currentKey.toLowerCase()] = currentValue;
      }
      // Start new header
      const colonIndex = line.indexOf(":");
      if (colonIndex > 0) {
        currentKey = line.substring(0, colonIndex);
        currentValue = line.substring(colonIndex + 1).trim();
      }
    }
  }
  // Save last header
  if (currentKey) {
    headers[currentKey.toLowerCase()] = currentValue;
  }

  return headers;
}

// Decode MIME encoded words (=?UTF-8?B?...?= or =?UTF-8?Q?...?=)
function decodeMimeWord(text: string): string {
  return text.replace(/=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi, (_, charset, encoding, encoded) => {
    try {
      if (encoding.toUpperCase() === "B") {
        return Buffer.from(encoded, "base64").toString("utf-8");
      } else if (encoding.toUpperCase() === "Q") {
        const decoded = encoded.replace(/_/g, " ").replace(/=([0-9A-F]{2})/gi, (_: string, hex: string) =>
          String.fromCharCode(parseInt(hex, 16))
        );
        return decoded;
      }
    } catch {
      // Fall through
    }
    return encoded;
  });
}

// Parse From header to get email and name
export function parseFromHeader(from: string): { email: string; name?: string } {
  const decoded = decodeMimeWord(from);
  const match = decoded.match(/(?:"?([^"<]*)"?\s*)?<?([^>]+@[^>]+)>?/);
  if (match) {
    return {
      email: match[2].trim(),
      name: match[1]?.trim() || undefined,
    };
  }
  return { email: decoded };
}

// Extract domain from email address
export function extractDomain(email: string): string {
  const match = email.match(/@([^>]+)/);
  return match ? match[1].toLowerCase() : "";
}

// --- Email cache (5-min TTL to avoid redundant POP3 sessions) ---
const EMAIL_CACHE_TTL = 5 * 60 * 1000;
let emailCache: { emails: EmailMessage[]; totalOnServer: number; fetchedAt: number } | null = null;

function getCachedEmails(): { emails: EmailMessage[]; totalOnServer: number } | null {
  if (emailCache && Date.now() - emailCache.fetchedAt < EMAIL_CACHE_TTL) {
    return { emails: emailCache.emails, totalOnServer: emailCache.totalOnServer };
  }
  emailCache = null;
  return null;
}

function setCachedEmails(emails: EmailMessage[], totalOnServer: number) {
  emailCache = { emails, totalOnServer, fetchedAt: Date.now() };
}

export interface FetchProgress {
  stage: string;
  current: number;
  total: number;
  message: string;
  email?: {
    from: string;
    subject: string;
    date: string;
  };
}

// Fetch emails from Gmail via POP3 with progress callback
export async function fetchEmailsWithProgress(
  options: {
    maxResults?: number;
    afterDate?: Date;
  } = {},
  onProgress?: (progress: FetchProgress) => void
): Promise<{ messages: EmailMessage[]; totalOnServer: number }> {
  // Check cache first (only for non-progress requests or when no date filter)
  if (!options.afterDate) {
    const cached = getCachedEmails();
    if (cached && cached.emails.length >= (options.maxResults || 20)) {
      const limited = cached.emails.slice(0, options.maxResults || 20);
      if (onProgress) {
        onProgress({ stage: "done", current: limited.length, total: limited.length, message: `Ferdig! ${limited.length} e-poster (fra cache).` });
      }
      return { messages: limited, totalOnServer: cached.totalOnServer };
    }
  }

  const { email, password } = getCredentials();
  const maxResults = options.maxResults || 20;

  const report = (progress: FetchProgress) => {
    if (onProgress) onProgress(progress);
  };

  report({ stage: "connect", current: 0, total: 0, message: "Kobler til pop.gmail.com..." });

  const pop3 = new Pop3Command({
    host: "pop.gmail.com",
    port: 995,
    tls: true,
    user: email,
    password: password,
  });

  try {
    // Don't call pop3.connect() manually — it only opens the socket without
    // authenticating. The first command (LIST) calls _connect() internally
    // which handles both socket + USER/PASS authentication.
    report({ stage: "connected", current: 0, total: 0, message: "Kobler til og autentiserer..." });

    // Skip STAT — Gmail POP3 sometimes rejects it with "bad command".
    // Go straight to LIST which also triggers connect + auth and gives us
    // both the message count and the message numbers we need.
    // Use longer timeout for LIST as it can be slow with large mailboxes
    const listResult = await withTimeout(pop3.LIST(), 45000, "POP3 LIST");
    const list = (listResult as unknown) as Array<[number, number]>;
    const messages: EmailMessage[] = [];

    // Process most recent messages first (highest numbers are newest in POP3)
    const messageIds = list
      .map((item) => item[0])
      .sort((a, b) => b - a);

    const totalToFetch = Math.min(messageIds.length, maxResults);
    report({ stage: "list", current: 0, total: totalToFetch, message: `Fant ${list.length} meldinger, henter ${totalToFetch}...` });

    for (let i = 0; i < messageIds.length; i++) {
      const msgNum = messageIds[i];
      if (messages.length >= maxResults) break;

      report({
        stage: "fetching",
        current: i + 1,
        total: totalToFetch,
        message: `Laster melding ${i + 1}/${totalToFetch}...`
      });

      try {
        const raw = await withTimeout(pop3.RETR(msgNum), 20000, `Fetch message ${msgNum}`);

        // Quick header pre-filtering using our fast parser
        const rawHeaders = parseHeaders(raw);
        const dateStr = rawHeaders["date"] || "";
        let date: Date;
        try {
          date = new Date(dateStr);
        } catch {
          date = new Date();
        }

        if (options.afterDate && date < options.afterDate) {
          continue;
        }

        // Full MIME parsing with simpleParser (handles attachments, encoding, etc.)
        const parsed = await simpleParser(raw);

        const fromAddr = parsed.from?.value?.[0];
        const fromEmail = fromAddr?.address || "";
        const fromName = fromAddr?.name || fromEmail;
        const fromDomain = extractDomain(fromEmail);
        const subject = parsed.subject || "(No subject)";
        const messageId = (parsed.messageId || `pop3-${msgNum}`).replace(/[<>]/g, "");

        const body = parsed.text || (parsed.html ? parsed.html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "");

        const attachments = (parsed.attachments || []).map((att) => ({
          filename: att.filename || "unnamed",
          content: att.content,
          contentType: att.contentType || "application/octet-stream",
        }));

        // Skip emails with no sender — likely corrupted or empty messages
        if (!fromEmail) {
          continue;
        }

        const emailMsg: EmailMessage = {
          id: messageId,
          from: fromName,
          fromEmail,
          fromDomain,
          subject,
          date: (parsed.date || date).toISOString(),
          body,
          attachments,
        };

        messages.push(emailMsg);

        report({
          stage: "fetched",
          current: messages.length,
          total: totalToFetch,
          message: `Hentet ${messages.length}/${totalToFetch}`,
          email: {
            from: fromEmail,
            subject: subject.substring(0, 60) + (subject.length > 60 ? "..." : ""),
            date: (parsed.date || date).toLocaleDateString("nb-NO"),
          }
        });
      } catch (err) {
        console.error(`Error fetching message ${msgNum}:`, err);
      }
    }

    const totalOnServer = messageIds.length;
    report({ stage: "done", current: messages.length, total: messages.length, message: `Ferdig! Hentet ${messages.length} av ${totalOnServer} e-poster.` });

    // Cache the fetched emails (preserve real server total)
    setCachedEmails(messages, totalOnServer);

    await withTimeout(pop3.QUIT(), 5000, "POP3 QUIT").catch(() => {});
    return { messages, totalOnServer };
  } catch (error) {
    try {
      await withTimeout(pop3.QUIT(), 5000, "POP3 QUIT").catch(() => {});
    } catch {
      // Ignore quit errors
    }

    // Provide more helpful error messages
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("timed out")) {
      throw new Error(`POP3-operasjon tok for lang tid. Prøv igjen eller reduser antall e-poster. (${errorMessage})`);
    }
    throw error;
  }
}

// Fetch emails (simple version without progress)
export async function fetchEmails(options: {
  maxResults?: number;
  afterDate?: Date;
} = {}): Promise<EmailMessage[]> {
  const result = await fetchEmailsWithProgress(options);
  return result.messages;
}

// Get a single email by message-id (checks cache first, avoids redundant POP3)
export async function getEmailById(messageId: string): Promise<EmailMessage | null> {
  // Check cache first
  const cached = getCachedEmails();
  if (cached) {
    return cached.emails.find(e => e.id === messageId) || null;
  }

  // Fetch from POP3 if not cached
  const emails = await fetchEmails({ maxResults: 100 });
  return emails.find(e => e.id === messageId) || null;
}

// Filter emails by domain
export function filterByDomains(emails: EmailMessage[], domains: string[]): EmailMessage[] {
  const domainSet = new Set(domains.map(d => d.toLowerCase()));
  return emails.filter(e => domainSet.has(e.fromDomain));
}
