import Pop3Command from "node-pop3";

interface EmailMessage {
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

// Parse email headers from raw email
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

// Parse email body from raw email (simplified - handles plain text and basic MIME)
function parseBody(raw: string): string {
  const parts = raw.split(/\r?\n\r?\n/);
  if (parts.length < 2) return "";

  const headers = parseHeaders(raw);
  const contentType = headers["content-type"] || "text/plain";
  const body = parts.slice(1).join("\n\n");

  // Handle base64 encoded content
  const transferEncoding = headers["content-transfer-encoding"] || "";
  if (transferEncoding.toLowerCase() === "base64") {
    try {
      return Buffer.from(body.replace(/\s/g, ""), "base64").toString("utf-8");
    } catch {
      return body;
    }
  }

  // Handle quoted-printable
  if (transferEncoding.toLowerCase() === "quoted-printable") {
    return body
      .replace(/=\r?\n/g, "")
      .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }

  // For multipart, try to find text/plain part
  if (contentType.includes("multipart")) {
    const boundaryMatch = contentType.match(/boundary="?([^";\s]+)"?/);
    if (boundaryMatch) {
      const boundary = boundaryMatch[1];
      const sections = body.split(new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));

      for (const section of sections) {
        if (section.includes("text/plain")) {
          const sectionParts = section.split(/\r?\n\r?\n/);
          if (sectionParts.length >= 2) {
            const sectionHeaders = parseHeaders(section);
            let content = sectionParts.slice(1).join("\n\n").trim();

            // Handle encoding in this part
            const partEncoding = sectionHeaders["content-transfer-encoding"] || "";
            if (partEncoding.toLowerCase() === "base64") {
              try {
                content = Buffer.from(content.replace(/\s/g, ""), "base64").toString("utf-8");
              } catch {
                // Keep as is
              }
            } else if (partEncoding.toLowerCase() === "quoted-printable") {
              content = content
                .replace(/=\r?\n/g, "")
                .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
            }

            return content;
          }
        }
      }

      // Fallback to text/html if no plain text
      for (const section of sections) {
        if (section.includes("text/html")) {
          const sectionParts = section.split(/\r?\n\r?\n/);
          if (sectionParts.length >= 2) {
            let content = sectionParts.slice(1).join("\n\n").trim();
            // Strip HTML tags
            content = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
            return content;
          }
        }
      }
    }
  }

  return body;
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
): Promise<EmailMessage[]> {
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
    await pop3.connect();
    report({ stage: "connected", current: 0, total: 0, message: "Tilkoblet! Henter meldingsliste..." });

    // Get list of messages - returns [[msgNum, size], ...]
    const listResult = await pop3.LIST();
    const list = (listResult as unknown) as Array<[number, number]>;
    const messages: EmailMessage[] = [];

    // Process most recent messages first (highest numbers are newest in POP3)
    const messageIds = list
      .map((item) => item[0])
      .sort((a, b) => b - a)
      .slice(0, maxResults * 2); // Fetch extra in case we filter some out

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
        const raw = await pop3.RETR(msgNum);
        const headers = parseHeaders(raw);

        const from = decodeMimeWord(headers["from"] || "");
        const { email: fromEmail } = parseFromHeader(from);
        const fromDomain = extractDomain(fromEmail);
        const subject = decodeMimeWord(headers["subject"] || "(No subject)");
        const dateStr = headers["date"] || "";
        const messageId = headers["message-id"] || `pop3-${msgNum}`;

        // Parse date and filter if afterDate specified
        let date: Date;
        try {
          date = new Date(dateStr);
        } catch {
          date = new Date();
        }

        if (options.afterDate && date < options.afterDate) {
          continue;
        }

        const body = parseBody(raw);

        const emailMsg: EmailMessage = {
          id: messageId.replace(/[<>]/g, ""),
          from,
          fromEmail,
          fromDomain,
          subject,
          date: date.toISOString(),
          body,
          attachments: [],
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
            date: date.toLocaleDateString("nb-NO"),
          }
        });
      } catch (err) {
        console.error(`Error fetching message ${msgNum}:`, err);
      }
    }

    report({ stage: "done", current: messages.length, total: messages.length, message: `Ferdig! Hentet ${messages.length} e-poster.` });

    await pop3.QUIT();
    return messages;
  } catch (error) {
    try {
      await pop3.QUIT();
    } catch {
      // Ignore quit errors
    }
    throw error;
  }
}

// Fetch emails (simple version without progress)
export async function fetchEmails(options: {
  maxResults?: number;
  afterDate?: Date;
} = {}): Promise<EmailMessage[]> {
  return fetchEmailsWithProgress(options);
}

// Get a single email by message-id (searches through recent emails)
export async function getEmailById(messageId: string): Promise<EmailMessage | null> {
  const emails = await fetchEmails({ maxResults: 100 });
  return emails.find(e => e.id === messageId) || null;
}

// Filter emails by domain
export function filterByDomains(emails: EmailMessage[], domains: string[]): EmailMessage[] {
  const domainSet = new Set(domains.map(d => d.toLowerCase()));
  return emails.filter(e => domainSet.has(e.fromDomain));
}
