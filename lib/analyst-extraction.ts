import { ExtractedReportData } from "./analyst-types";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-3.5-haiku";

const EXTRACTION_PROMPT = `You are an expert at extracting structured data from analyst reports. Extract the following information from the provided analyst report content:

1. Investment bank name (the bank/firm that published the report)
2. Analyst name(s) (individual analyst(s) who authored the report)
3. Target company name (the company being analyzed)
4. Target price and currency
5. Recommendation (e.g., buy, hold, sell, overweight, underweight, outperform, underperform)
6. A brief 1-2 sentence summary of the key thesis or main point of the report

Return your response as a JSON object with these fields:
- investmentBank: string (the investment bank name)
- analystNames: string[] (array of analyst names)
- companyName: string (the target company name)
- targetPrice: number (just the number, no currency symbol)
- targetCurrency: string (e.g., "NOK", "USD", "EUR")
- recommendation: string (normalized to: buy, hold, sell, overweight, underweight, outperform, underperform)
- summary: string (1-2 sentence summary)

If a field cannot be determined from the content, omit it from the response.
Only return the JSON object, no other text.`;

interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }
  return key;
}

export async function extractReportData(
  emailBody: string,
  attachmentTexts: string[] = [],
  subject: string = ""
): Promise<ExtractedReportData> {
  const apiKey = getApiKey();

  // Combine all content
  const contentParts = [
    `Email Subject: ${subject}`,
    "",
    "Email Body:",
    emailBody,
  ];

  if (attachmentTexts.length > 0) {
    contentParts.push("", "Attachment Content:");
    attachmentTexts.forEach((text, i) => {
      contentParts.push(`\n--- Attachment ${i + 1} ---\n${text}`);
    });
  }

  const content = contentParts.join("\n");

  // Truncate if too long (reserve space for system prompt)
  const maxContentLength = 100000;
  const truncatedContent =
    content.length > maxContentLength
      ? content.slice(0, maxContentLength) + "\n\n[Content truncated...]"
      : content;

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://listr.no",
      "X-Title": "Listr Analyst Reports",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: EXTRACTION_PROMPT,
        },
        {
          role: "user",
          content: truncatedContent,
        },
      ],
      temperature: 0.1,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${error}`);
  }

  const data: OpenRouterResponse = await response.json();
  const responseContent = data.choices[0]?.message?.content;

  if (!responseContent) {
    throw new Error("Empty response from OpenRouter");
  }

  // Parse JSON response
  try {
    // Try to extract JSON from the response (in case there's extra text)
    const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and normalize the response
    const result: ExtractedReportData = {};

    if (typeof parsed.investmentBank === "string" && parsed.investmentBank) {
      result.investmentBank = parsed.investmentBank.trim();
    }

    if (Array.isArray(parsed.analystNames)) {
      result.analystNames = parsed.analystNames
        .filter((n: unknown) => typeof n === "string" && n)
        .map((n: string) => n.trim());
    }

    if (typeof parsed.companyName === "string" && parsed.companyName) {
      result.companyName = parsed.companyName.trim();
    }

    if (typeof parsed.targetPrice === "number" && !isNaN(parsed.targetPrice)) {
      result.targetPrice = parsed.targetPrice;
    }

    if (typeof parsed.targetCurrency === "string" && parsed.targetCurrency) {
      result.targetCurrency = parsed.targetCurrency.toUpperCase().trim();
    }

    if (typeof parsed.recommendation === "string" && parsed.recommendation) {
      result.recommendation = normalizeRecommendation(parsed.recommendation);
    }

    if (typeof parsed.summary === "string" && parsed.summary) {
      result.summary = parsed.summary.trim();
    }

    return result;
  } catch (parseError) {
    throw new Error(`Failed to parse extraction response: ${parseError}`);
  }
}

// Normalize recommendation to standard values
function normalizeRecommendation(rec: string): string {
  const normalized = rec.toLowerCase().trim();

  // Map various recommendation terms to standard values
  const mappings: Record<string, string> = {
    buy: "buy",
    køb: "buy",
    kjøp: "buy",
    strong_buy: "buy",
    "strong buy": "buy",
    accumulate: "buy",

    hold: "hold",
    neutral: "hold",
    "market perform": "hold",

    sell: "sell",
    selg: "sell",
    sælg: "sell",
    reduce: "sell",
    "strong sell": "sell",

    overweight: "overweight",
    "over weight": "overweight",

    underweight: "underweight",
    "under weight": "underweight",

    outperform: "outperform",
    "out perform": "outperform",
    "sector outperform": "outperform",

    underperform: "underperform",
    "under perform": "underperform",
    "sector underperform": "underperform",
  };

  return mappings[normalized] || normalized;
}

// Check if OpenRouter is configured
export function isOpenRouterConfigured(): boolean {
  try {
    getApiKey();
    return true;
  } catch {
    return false;
  }
}
