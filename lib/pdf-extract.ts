// Extract text from PDF buffers using pdfjs-dist

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
