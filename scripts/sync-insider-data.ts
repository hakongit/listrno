import { getDb, initializeInsiderDatabase, resetInsiderDatabase } from "../lib/db";
import { slugify } from "../lib/utils";

// Euronext press releases page for Oslo market
const EURONEXT_URL = "https://live.euronext.com/en/listview/company-press-releases/1061";

interface EuronextNewsItem {
  date: string;
  company: string;
  title: string;
  url: string;
  topic: string;
}

interface ParsedTrade {
  insiderName: string;
  insiderRole: string | null;
  issuerName: string;
  isin: string | null;
  tradeType: "buy" | "sell" | "other";
  shares: number | null;
  price: number | null;
  totalValue: number | null;
  currency: string;
  tradeDate: string | null;
}

// Extract numbers from text with European format (comma as decimal separator)
function parseEuropeanNumber(text: string): number | null {
  // Remove spaces, replace comma with dot for decimals
  const cleaned = text.replace(/\s/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Parse trades from PDF text content
function parsePdfTrades(pdfText: string, defaultCompany: string, defaultDate: string): ParsedTrade[] {
  const trades: ParsedTrade[] = [];

  // Check if this is a Norwegian format PDF (KRT-1500 form)
  const isNorwegianFormat = pdfText.includes("Etternavn") && pdfText.includes("Fornavn");

  // Check if this is an English format PDF
  const isEnglishFormat = pdfText.includes("Details of the person discharging managerial responsibilities");

  if (!isNorwegianFormat && !isEnglishFormat) {
    return trades;
  }

  // For Norwegian format, parse differently
  if (isNorwegianFormat) {
    // Extract last name: "Etternavn   LASTNAME" or "Etternavn   Lastname"
    const lastNameMatch = pdfText.match(/Om primærinnsider\s+Etternavn\s+([A-ZÆØÅa-zæøå]+)/i);
    // Extract first name: "Fornavn   FIRSTNAME" or "Fornavn   Firstname"
    const firstNameMatch = pdfText.match(/Om primærinnsider\s+Etternavn\s+[A-ZÆØÅa-zæøå]+\s+Fornavn\s+([A-ZÆØÅa-zæøå\s]+?)(?:\s+Stilling|\s+Foretaksnavn)/i);
    // Extract role: "Stilling / Rolle   CEO"
    const roleMatch = pdfText.match(/Stilling\s*\/?\s*Rolle\s+([A-Za-zÆØÅæøå\s]+?)(?:\s+Ny melding|\s+Om|$)/i);

    let insiderName = defaultCompany;
    let insiderRole: string | null = null;

    if (lastNameMatch && firstNameMatch) {
      const lastName = lastNameMatch[1].trim();
      const firstName = firstNameMatch[1].trim();
      // Capitalize properly: "LARSEN" -> "Larsen", "Svend Egil" stays as is
      const formatName = (n: string) => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
      insiderName = `${firstName} ${lastName.toUpperCase() === lastName ? formatName(lastName) : lastName}`;
    }

    if (roleMatch) {
      insiderRole = roleMatch[1].trim();
    }

    // Extract issuer name from "Foretaksnavn   Nordic Financials ASA"
    let issuerName = defaultCompany;
    const issuerMatch = pdfText.match(/Informasjon om utstederen[^F]*Foretaksnavn\s+([A-ZÆØÅa-zæøå\s]+(?:ASA|AS))/i);
    if (issuerMatch) {
      issuerName = issuerMatch[1].trim();
    }

    // Determine trade type from Norwegian keywords
    let tradeType: "buy" | "sell" | "other" = "other";
    const textLower = pdfText.toLowerCase();
    if (textLower.includes("transaksjonstype   kjøp") || textLower.includes("kjøp")) {
      tradeType = "buy";
    } else if (textLower.includes("transaksjonstype   salg") || textLower.includes("salg")) {
      tradeType = "sell";
    }

    // Extract ISIN: "ISIN-kode   NO0013683409"
    let isin: string | null = null;
    const isinMatch = pdfText.match(/ISIN-kode\s+([A-Z]{2}[A-Z0-9]{10})/i);
    if (isinMatch) {
      isin = isinMatch[1];
    }

    // Extract price: "Pris per enhet   1,7254"
    let price: number | null = null;
    const priceMatch = pdfText.match(/Pris per enhet\s+([\d\s,.]+)/i);
    if (priceMatch) {
      price = parseEuropeanNumber(priceMatch[1]);
    }

    // Extract shares/volume: "Volum   1 149" or "Aggregert volum   1 149"
    // Numbers may have spaces as thousand separators
    let shares: number | null = null;
    const volumeMatch = pdfText.match(/Aggregert volum\s+([\d\s]+)/i);
    if (volumeMatch) {
      const volStr = volumeMatch[1].replace(/\s/g, "").trim();
      shares = parseInt(volStr, 10);
      if (isNaN(shares)) shares = null;
    }
    // Fallback to simple Volum if no Aggregert volum
    if (!shares) {
      const simpleVolumeMatch = pdfText.match(/Volum\s+([\d\s]+?)(?:\s+Aggregert|\s+Total|\s*$)/i);
      if (simpleVolumeMatch) {
        const volStr = simpleVolumeMatch[1].replace(/\s/g, "").trim();
        shares = parseInt(volStr, 10);
        if (isNaN(shares)) shares = null;
      }
    }

    // Extract total value: "Total sum   1 982,484600"
    let totalValue: number | null = null;
    const totalMatch = pdfText.match(/Total sum\s+([\d\s,.]+)/i);
    if (totalMatch) {
      totalValue = parseEuropeanNumber(totalMatch[1]);
    }

    // Extract trade date: "Dato   27.01.2026"
    let tradeDate: string | null = defaultDate;
    const dateMatch = pdfText.match(/Dato\s+(\d{2})\.(\d{2})\.(\d{4})/);
    if (dateMatch) {
      // Convert DD.MM.YYYY to YYYY-MM-DD
      tradeDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
    }

    // Only add if we extracted a valid name
    if (insiderName && insiderName !== defaultCompany && insiderName.split(/\s+/).length >= 2) {
      trades.push({
        insiderName,
        insiderRole,
        issuerName,
        isin,
        tradeType,
        shares,
        price,
        totalValue,
        currency: "NOK",
        tradeDate,
      });
    }

    return trades;
  }

  // English format - split by page breaks
  const pages = pdfText.split(/\n\n+/);

  for (const pageText of pages) {
    if (!pageText.includes("Details of the person discharging managerial responsibilities")) {
      continue;
    }

    let insiderName = defaultCompany;
    let insiderRole: string | null = null;

    // Method 1: Look for "closely associated with [Name]" pattern
    // e.g., "A company closely associated with Trine Teigland, member of the board"
    const closelyAssociatedMatch = pageText.match(
      /closely associated with\s+([A-ZÆØÅ][a-zæøå]+(?:\s+[A-ZÆØÅa-zæøå]+){1,3})\s*,?\s*((?:member of the board|board member|CEO|CFO|CTO|COO|CIO|Chairman|director|primary insider)[^,]*)?/i
    );
    if (closelyAssociatedMatch) {
      insiderName = closelyAssociatedMatch[1].trim();
      insiderRole = closelyAssociatedMatch[2]?.trim() || "Primary insider";
    }

    // Method 2: Look for "a) Name [Name]" followed by role in Position/status
    if (insiderName === defaultCompany) {
      const nameFieldMatch = pageText.match(/a\)\s+Name\s+([A-ZÆØÅ][a-zæøå]+(?:\s+[A-ZÆØÅa-zæøå]+){1,3})\s+(?:\d|[A-Z])/i);
      if (nameFieldMatch) {
        const candidateName = nameFieldMatch[1].trim();
        // Check if this looks like a person name (not a company)
        if (!candidateName.match(/\b(AS|ASA|AB|Ltd|Inc|Holding|Eiendom|Invest)\b/i)) {
          insiderName = candidateName;
        }
      }
    }

    // Method 3: Standard pattern - "Place of the transaction [Name] [Role]"
    if (insiderName === defaultCompany) {
      const roles = [
        "CEO", "CFO", "CTO", "COO", "CIO", "EVP\\/CFO", "EVP Product and Price",
        "EVP", "SVP", "VP", "Chairman", "Board member", "Styreleder", "Styremedlem",
        "Director", "Head of[^A-Z]*", "President", "Secretary", "General Manager",
        "Managing Director", "Adm\\.?\\s*dir\\.?",
      ];
      const rolePattern = roles.join("|");

      const nameRoleMatch = pageText.match(
        new RegExp(
          `(?:Place of the transaction|transaction)\\s+([A-ZÆØÅ][a-zæøå]+(?:\\s+[A-ZÆØÅa-zæøå]+){1,3})\\s+(${rolePattern})\\s+`,
          "i"
        )
      );

      if (nameRoleMatch) {
        insiderName = nameRoleMatch[1].trim();
        insiderRole = nameRoleMatch[2].trim();
      } else {
        // Alternative: look for name followed by role anywhere
        const altMatch = pageText.match(
          new RegExp(`([A-ZÆØÅ][a-zæøå]+(?:\\s+[A-ZÆØÅa-zæøå]+){1,3})\\s+(${rolePattern})\\s+[A-ZÆØÅ]`, "i")
        );
        if (altMatch) {
          insiderName = altMatch[1].trim();
          insiderRole = altMatch[2].trim();
        }
      }
    }

    // Extract role from Position/status if not found yet
    if (!insiderRole) {
      const positionMatch = pageText.match(/Position\/status\s+([^0-9]+?)(?:\s+\d|\s+Initial|\s+Amendment)/i);
      if (positionMatch) {
        const posText = positionMatch[1].trim();
        if (posText.includes("board")) insiderRole = "Board member";
        else if (posText.includes("CEO")) insiderRole = "CEO";
        else if (posText.includes("CFO")) insiderRole = "CFO";
        else if (posText.includes("director")) insiderRole = "Director";
        else if (posText.length < 50) insiderRole = posText;
      }
    }

    // Extract issuer name - appears before LEI (20 character code)
    let issuerName = defaultCompany;
    const issuerMatch = pageText.match(
      /([A-ZÆØÅ][a-zæøå]+(?:\s+[A-ZÆØÅ][a-zæøå]+)*)\s+(ASA|AS)\s+[0-9A-Z]{20}/
    );
    if (issuerMatch) {
      issuerName = `${issuerMatch[1]} ${issuerMatch[2]}`;
    }

    // Extract ISIN
    let isin: string | null = null;
    const isinMatch = pageText.match(/ISIN[:\s]+([A-Z]{2}[A-Z0-9]{10})/i);
    if (isinMatch) {
      isin = isinMatch[1];
    }

    // Determine trade type
    let tradeType: "buy" | "sell" | "other" = "other";
    const textLower = pageText.toLowerCase();
    if (
      textLower.includes("purchase of shares") ||
      textLower.includes("[purchase/sale] of shares") ||
      textLower.includes("acquisition") ||
      textLower.includes("subscription")
    ) {
      tradeType = "buy";
    } else if (
      textLower.includes("sale of shares") ||
      textLower.includes("disposal") ||
      textLower.includes("sold")
    ) {
      tradeType = "sell";
    }

    // Extract price, volume and date together using the standard pattern:
    // "NOK price   volume volume price date"
    let price: number | null = null;
    let shares: number | null = null;
    let tradeDate: string | null = null;
    let currency = "NOK";

    const dataMatch = pageText.match(
      /(?:NOK|EUR)\s+([\d,.\s]+?)\s+(\d+)\s+(\d+)\s+([\d,.\s]+?)\s+(\d{4}-\d{2}-\d{2})/
    );

    if (dataMatch) {
      currency = pageText.includes("EUR ") ? "EUR" : "NOK";
      price = parseEuropeanNumber(dataMatch[1]);
      shares = parseInt(dataMatch[2], 10);
      tradeDate = dataMatch[5];
    } else {
      // Fallback: try to extract individual values
      const priceMatch = pageText.match(/(?:NOK|EUR)\s+([\d,.\s]+)/);
      if (priceMatch) {
        price = parseEuropeanNumber(priceMatch[1]);
        currency = pageText.includes("EUR ") ? "EUR" : "NOK";
      }

      const dateMatch = pageText.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        tradeDate = dateMatch[1];
      }
    }

    // Calculate total value
    let totalValue: number | null = null;
    if (shares && price) {
      totalValue = shares * price;
    }

    // Only add if we have a valid insider name
    if (insiderName && insiderName !== defaultCompany && insiderName.split(/\s+/).length >= 2) {
      trades.push({
        insiderName,
        insiderRole,
        issuerName: issuerName || defaultCompany,
        isin,
        tradeType,
        shares,
        price,
        totalValue,
        currency,
        tradeDate: tradeDate || defaultDate,
      });
    }
  }

  return trades;
}

// Parse trade details from title and body text (non-PDF fallback)
function parseTradeDetails(
  title: string,
  bodyText: string,
  company: string
): {
  tradeType: "buy" | "sell" | "other";
  insiderName: string;
  insiderRole: string | null;
  shares: number | null;
  price: number | null;
  totalValue: number | null;
  sharesAfter: number | null;
  currency: string;
} {
  const combinedText = `${title} ${bodyText}`;
  const textLower = combinedText.toLowerCase();

  // Determine trade type
  let tradeType: "buy" | "sell" | "other" = "other";

  const buyKeywords = [
    "kjøp",
    "purchase",
    "acquisition",
    "acquired",
    "buy",
    "bought",
    "erverv",
    "tegn",
    "subscription",
    "subscribed",
    "grant of share",
    "granted",
    "tildeling",
    "tildelt",
    "awarded",
    "received",
    "mottatt",
  ];

  const sellKeywords = ["salg", "sale", "sold", "sell", "selling", "disposal", "disposed", "avhend", "solgt"];

  if (buyKeywords.some((kw) => textLower.includes(kw))) {
    tradeType = "buy";
  }
  if (sellKeywords.some((kw) => textLower.includes(kw))) {
    tradeType = "sell";
  }

  // Extract insider name
  let insiderName: string = company;
  let insiderRole: string | null = null;

  const namePatterns = [
    /(?:Primary insider|Primærinnsider|PDMR)[:\s-]+([A-ZÆØÅa-zæøå][A-ZÆØÅa-zæøå\s.-]+?)(?:\s*[,(]\s*([^,)]+))?(?:\s+has|\s+har|\s*,|\s*-|\s*$)/i,
    /(?:Name|Navn)[:\s]+([A-ZÆØÅa-zæøå][A-ZÆØÅa-zæøå\s.-]+?)(?:\s*[,(]\s*([^,)]+))?(?:\s*$|\s*,)/im,
    /(?:CEO|CFO|CTO|COO|Chairman|Styreleder|Adm\.?\s*dir\.?)[:\s]+([A-ZÆØÅa-zæøå][A-ZÆØÅa-zæøå\s.-]+?)(?:\s+has|\s+har)/i,
    /by\s+([A-ZÆØÅ][a-zæøå]+(?:\s+[A-ZÆØÅ][a-zæøå]+)+)\s*$/,
    /-\s+([A-ZÆØÅ][a-zæøå]+(?:\s+[A-ZÆØÅ][a-zæøå]+)+)\s*$/,
  ];

  // Names to exclude (generic terms that aren't actual people)
  const excludedNames = [
    "primary insider",
    "primary insiders",
    "primærinnsider",
    "primærinnsidere",
    "close associate",
    "closely associated",
    "nærstående",
  ];

  for (const pattern of namePatterns) {
    const match = combinedText.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      const nameLower = name.toLowerCase();
      // Check it's a valid name (2+ words, reasonable length, not a generic term)
      if (
        name.length > 3 &&
        name.length < 50 &&
        name.split(/\s+/).length >= 2 &&
        !excludedNames.some((excluded) => nameLower.includes(excluded))
      ) {
        insiderName = name;
        insiderRole = match[2]?.trim() || null;
        break;
      }
    }
  }

  return {
    tradeType,
    insiderName,
    insiderRole,
    shares: null,
    price: null,
    totalValue: null,
    sharesAfter: null,
    currency: "NOK",
  };
}

// Generate a unique message ID from the URL
function extractMessageId(url: string): string {
  const match = url.match(/company-news\/(.+)$/);
  return match ? match[1] : url.replace(/[^a-zA-Z0-9-]/g, "-");
}

// Extract PDF attachment URLs from announcement page
async function fetchPdfUrls(pageUrl: string): Promise<string[]> {
  try {
    const response = await fetch(pageUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 (compatible; listr.no/1.0)",
      },
    });

    if (!response.ok) return [];

    const html = await response.text();

    // Look for PDF links in the attachments section
    const pdfUrls: string[] = [];
    const pdfRegex = /href="([^"]+\.pdf)"/gi;
    let match;

    while ((match = pdfRegex.exec(html)) !== null) {
      let url = match[1];
      if (!url.startsWith("http")) {
        url = `https://live.euronext.com${url}`;
      }
      pdfUrls.push(url);
    }

    return pdfUrls;
  } catch {
    return [];
  }
}

// Fetch and parse PDF using pdfjs-dist
async function parsePdfFromUrl(pdfUrl: string): Promise<string> {
  try {
    // Dynamic import for ESM module
    const pdfjsModule = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const { getDocument } = pdfjsModule;

    const response = await fetch(pdfUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; listr.no/1.0)",
      },
    });

    if (!response.ok) {
      console.log(`  Failed to fetch PDF: ${response.status}`);
      return "";
    }

    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    const loadingTask = getDocument({ data });
    const pdf = await loadingTask.promise;

    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pageText = textContent.items.map((item: any) => item.str || "").join(" ");
      fullText += pageText + "\n\n";
    }

    return fullText;
  } catch (error) {
    console.log(`  PDF parse error: ${error}`);
    return "";
  }
}

// Fetch announcement body as fallback
async function fetchAnnouncementBody(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 (compatible; listr.no/1.0)",
      },
    });

    if (!response.ok) return "";

    const html = await response.text();

    const bodyPatterns = [
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<div[^>]*class="[^"]*field--name-body[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class="[^"]*node__content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    ];

    for (const pattern of bodyPatterns) {
      const match = html.match(pattern);
      if (match) {
        return match[1]
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 5000);
      }
    }

    return "";
  } catch {
    return "";
  }
}

async function fetchPressReleases(page: number = 0): Promise<EuronextNewsItem[]> {
  const url = `${EURONEXT_URL}?page=${page}`;
  console.log(`Fetching page ${page + 1}: ${url}`);

  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; listr.no/1.0)",
      "Accept-Language": "en-US,en;q=0.9,nb;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch press releases: ${response.status}`);
  }

  const html = await response.text();
  const items: EuronextNewsItem[] = [];

  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) {
    console.log("No table body found");
    return items;
  }

  const tbody = tbodyMatch[1];
  const rowMatches = tbody.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

  for (const row of rowMatches) {
    const cells = row.match(/<td[^>]*>[\s\S]*?<\/td>/gi) || [];
    if (cells.length < 3) continue;

    // Cell 0: Date
    const cell0 = cells[0] || "";
    const dateSpans = cell0.match(/<span[^>]*class='nowrap'[^>]*>\s*([^<]+)\s*<\/span>/g) || [];
    let dateStr = "";
    if (dateSpans.length >= 1 && dateSpans[0]) {
      const dateMatch = dateSpans[0].match(/>([^<]+)</);
      dateStr = dateMatch ? dateMatch[1].trim() : "";
    }

    // Cell 1: Company name
    const companyHtml = cells[1].replace(/<[^>]+>/g, "").trim();
    const company = companyHtml;

    // Cell 2: Title with link
    const titleLinkMatch = cells[2].match(/href="([^"]+)"[^>]*>([^<]+)<\/a>/);
    const urlPath = titleLinkMatch ? titleLinkMatch[1] : "";
    const title = titleLinkMatch ? titleLinkMatch[2].trim() : "";
    const fullUrl = urlPath.startsWith("http") ? urlPath : `https://live.euronext.com${urlPath}`;

    // Cell 4: Topic
    const topicHtml = cells[4]?.replace(/<[^>]+>/g, "").trim() || "";
    const topic = topicHtml;

    // Only include PDMR notifications
    const isPDMR =
      topic.toLowerCase().includes("mandatory notification") ||
      topic.toLowerCase().includes("primary insider") ||
      topic.toLowerCase().includes("pdmr");

    if (company && title && isPDMR) {
      items.push({ date: dateStr, company, title, url: fullUrl, topic });
    }
  }

  return items;
}

async function syncInsiderData() {
  const shouldReset = process.argv.includes("--reset");
  const fetchDetails = !process.argv.includes("--skip-details");
  const parsePdfs = process.argv.includes("--with-pdfs");
  const maxPages = process.argv.includes("--full") ? 500 : 50;

  if (shouldReset) {
    console.log("Resetting insider database...");
    await resetInsiderDatabase();
  }

  console.log("Initializing insider database...");
  await initializeInsiderDatabase();

  console.log("Fetching PDMR notifications from Euronext...");
  console.log(
    `Mode: ${fetchDetails ? "with details" : "quick"}${parsePdfs ? " + PDFs" : ""}, max pages: ${maxPages}`
  );

  let allItems: EuronextNewsItem[] = [];
  let page = 0;
  let emptyPages = 0;

  // Fetch pages until we get no more PDMR items
  while (page < maxPages && emptyPages < 3) {
    try {
      const items = await fetchPressReleases(page);

      if (items.length === 0) {
        emptyPages++;
      } else {
        emptyPages = 0;
        allItems = allItems.concat(items);
        console.log(`  Found ${items.length} PDMR items (total: ${allItems.length})`);
      }

      page++;
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error);
      break;
    }
  }

  console.log(`\nTotal PDMR items fetched: ${allItems.length}`);

  if (allItems.length === 0) {
    console.log("No items to process.");
    return;
  }

  // Process items
  const insertStatements: { sql: string; args: (string | number | null)[] }[] = [];
  let processed = 0;
  let tradesFromPdfs = 0;

  for (const item of allItems) {
    processed++;

    if (processed % 10 === 0) {
      console.log(`Processing ${processed}/${allItems.length}...`);
    }

    // If PDF parsing is enabled, try to get detailed data from PDFs
    let gotPdfTrades = false;
    if (parsePdfs && fetchDetails) {
      const pdfUrls = await fetchPdfUrls(item.url);
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (pdfUrls.length > 0) {
        for (const pdfUrl of pdfUrls) {
          const pdfText = await parsePdfFromUrl(pdfUrl);
          await new Promise((resolve) => setTimeout(resolve, 200));

          if (pdfText) {
            const trades = parsePdfTrades(pdfText, item.company, item.date.split("T")[0]);

            for (const trade of trades) {
              const messageId = `${extractMessageId(item.url)}-${slugify(trade.insiderName)}`;
              const insiderSlug = slugify(trade.insiderName);
              const companySlug = slugify(trade.issuerName || item.company);

              insertStatements.push({
                sql: `INSERT OR IGNORE INTO insider_trades
                      (message_id, isin, issuer_name, ticker, insider_name, insider_slug, insider_role,
                       trade_type, shares, price, total_value, currency, trade_date,
                       published_date, shares_after, related_party, source_url, company_slug)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [
                  messageId,
                  trade.isin,
                  trade.issuerName || item.company,
                  null,
                  trade.insiderName,
                  insiderSlug,
                  trade.insiderRole,
                  trade.tradeType,
                  trade.shares,
                  trade.price,
                  trade.totalValue,
                  trade.currency,
                  trade.tradeDate || item.date.split("T")[0],
                  item.date,
                  null,
                  null,
                  item.url,
                  companySlug,
                ],
              });
              tradesFromPdfs++;
            }

            // Mark that we got trades from PDF
            if (trades.length > 0) gotPdfTrades = true;
          }
        }
      }
    }

    // Skip HTML fallback if we got trades from PDFs
    if (gotPdfTrades) continue;

    // Fallback: use HTML body parsing
    let bodyText = "";
    if (fetchDetails && !parsePdfs) {
      bodyText = await fetchAnnouncementBody(item.url);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    const messageId = extractMessageId(item.url);
    const details = parseTradeDetails(item.title, bodyText, item.company);
    const insiderSlug = slugify(details.insiderName);
    const companySlug = slugify(item.company);

    insertStatements.push({
      sql: `INSERT OR IGNORE INTO insider_trades
            (message_id, isin, issuer_name, ticker, insider_name, insider_slug, insider_role,
             trade_type, shares, price, total_value, currency, trade_date,
             published_date, shares_after, related_party, source_url, company_slug)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        messageId,
        null,
        item.company,
        null,
        details.insiderName,
        insiderSlug,
        details.insiderRole,
        details.tradeType,
        details.shares,
        details.price,
        details.totalValue,
        details.currency,
        item.date.split("T")[0],
        item.date,
        details.sharesAfter,
        null,
        item.url,
        companySlug,
      ],
    });
  }

  // Batch insert
  console.log("\nInserting records...");
  if (parsePdfs) {
    console.log(`  Including ${tradesFromPdfs} trades extracted from PDFs`);
  }

  const BATCH_SIZE = 50;
  let inserted = 0;

  for (let i = 0; i < insertStatements.length; i += BATCH_SIZE) {
    const batch = insertStatements.slice(i, i + BATCH_SIZE);
    await getDb().batch(batch);
    inserted += batch.length;
    if (inserted % 100 === 0 || inserted === insertStatements.length) {
      console.log(`Inserted ${inserted}/${insertStatements.length} records`);
    }
  }

  // Print stats
  const tradeCount = await getDb().execute("SELECT COUNT(*) as count FROM insider_trades");
  const dateRange = await getDb().execute(
    "SELECT MIN(trade_date) as min_date, MAX(trade_date) as max_date FROM insider_trades"
  );
  const typeBreakdown = await getDb().execute(
    "SELECT trade_type, COUNT(*) as count FROM insider_trades GROUP BY trade_type ORDER BY count DESC"
  );
  const uniqueInsiders = await getDb().execute(
    "SELECT COUNT(DISTINCT insider_name) as count FROM insider_trades"
  );
  const uniqueCompanies = await getDb().execute(
    "SELECT COUNT(DISTINCT issuer_name) as count FROM insider_trades"
  );
  const withShares = await getDb().execute(
    "SELECT COUNT(*) as count FROM insider_trades WHERE shares IS NOT NULL"
  );

  console.log("\n=== Insider trades database stats ===");
  console.log(`Total trades: ${tradeCount.rows[0].count}`);
  console.log(`Date range: ${dateRange.rows[0].min_date} to ${dateRange.rows[0].max_date}`);
  console.log(`Unique insiders: ${uniqueInsiders.rows[0].count}`);
  console.log(`Unique companies: ${uniqueCompanies.rows[0].count}`);
  console.log(`Trades with share count: ${withShares.rows[0].count}`);
  console.log("\nBy type:");
  for (const row of typeBreakdown.rows) {
    console.log(`  ${row.trade_type}: ${row.count}`);
  }
}

syncInsiderData()
  .then(() => {
    console.log("\nSync completed!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Sync failed:", err);
    process.exit(1);
  });
