// Extract text from PDF buffers using pdfjs-dist

// Find PDF URLs in email body text
export function extractPdfUrls(text: string): string[] {
  const urls: string[] = [];
  // Match URLs in angle brackets: <https://...pdf>
  const angleBracketRegex = /<(https?:\/\/[^>]+\.pdf[^>]*)>/gi;
  for (const match of text.matchAll(angleBracketRegex)) {
    urls.push(match[1]);
  }
  // Match bare URLs ending in .pdf or containing common PDF download patterns
  const bareUrlRegex = /(?<![<"'])(https?:\/\/[^\s<>"']+\.pdf(?:\?[^\s<>"']*)?)/gi;
  for (const match of text.matchAll(bareUrlRegex)) {
    if (!urls.includes(match[1])) {
      urls.push(match[1]);
    }
  }
  // Match DownloadFile URLs (common pattern for research portals)
  const downloadRegex = /(?<![<"'])(https?:\/\/[^\s<>"']*DownloadFile[^\s<>"']*)/gi;
  for (const match of text.matchAll(downloadRegex)) {
    if (!urls.includes(match[1])) {
      urls.push(match[1]);
    }
  }
  return urls;
}

// Download a PDF from URL and extract text
export async function fetchAndExtractPdfFromUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      console.error(`PDF download failed (${response.status}): ${url}`);
      return "";
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("pdf") && !url.toLowerCase().includes(".pdf")) {
      console.log(`Skipping non-PDF content-type (${contentType}): ${url}`);
      return "";
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return await extractTextFromPdf(buffer);
  } catch (error) {
    console.error(`Failed to fetch PDF from ${url}:`, error);
    return "";
  }
}

// Extract text from all linked PDFs in email body
export async function extractLinkedPdfTexts(emailBody: string): Promise<string[]> {
  const urls = extractPdfUrls(emailBody);
  if (urls.length === 0) return [];
  console.log(`[pdf-extract] Found ${urls.length} PDF URL(s) in email body:`, urls);
  const texts: string[] = [];
  for (const url of urls) {
    const text = await fetchAndExtractPdfFromUrl(url);
    if (text) texts.push(text);
  }
  return texts;
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const pdfjsModule = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const { getDocument } = pdfjsModule;

    const data = new Uint8Array(buffer);
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

    return fullText.trim();
  } catch (error) {
    console.error("PDF extraction error:", error);
    return "";
  }
}
