import { ExtractedReportData, ExtractedRecommendation } from "./analyst-types";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "anthropic/claude-3.5-haiku";

const EXTRACTION_PROMPT = `You are an expert at extracting structured data from analyst reports. An email may cover one or multiple companies. Extract the following information:

Report-level fields:
1. Investment bank name (the bank/firm that published the report)
2. Analyst name(s) (individual analyst(s) who authored the report)

Per-company fields (one entry per company covered):
1. Target company name
2. Target price and currency
3. Recommendation (e.g., buy, hold, sell, overweight, underweight, outperform, underperform)
4. A brief 1-2 sentence summary of the key thesis for that company
5. investmentBank: if this recommendation is attributed to a DIFFERENT bank than the report-level investmentBank (e.g., aggregator emails like Børsextra that summarize recommendations from multiple banks), include the actual originating bank name per recommendation. Omit if same as report-level bank.
6. previousTargetPrice: if the text mentions the previous/old target price (e.g., "raised from 150 to 180", "previously 120"), include the previous target price as a number.
7. previousRecommendation: if the text mentions a change in recommendation (e.g., "upgraded from hold to buy", "reiterated buy"), include the previous recommendation.

Return your response as a JSON object with these fields:
- investmentBank: string (the investment bank name)
- analystNames: string[] (array of analyst names)
- recommendations: array of objects, one per company, each with:
  - companyName: string (the target company name)
  - targetPrice: number (just the number, no currency symbol)
  - targetCurrency: string (e.g., "NOK", "USD", "EUR")
  - recommendation: string (normalized to: buy, hold, sell, overweight, underweight, outperform, underperform)
  - summary: string (1-2 sentence summary)
  - investmentBank: string (only if different from report-level bank, e.g., for aggregator emails)
  - previousTargetPrice: number (previous target price if mentioned)
  - previousRecommendation: string (previous recommendation if mentioned)

If a field cannot be determined from the content, omit it from the response.
Only include a company in the recommendations array if you can determine a specific, non-zero target price for it. Do NOT include entries with targetPrice 0 or without a target price.
If the email is a market overview or commentary without specific company target prices, return an empty recommendations array.
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
  subject: string = "",
  options?: { guidance?: string; feedback?: string }
): Promise<ExtractedReportData> {
  const apiKey = getApiKey();

  // Build system prompt with optional guidance and feedback
  let systemPrompt = EXTRACTION_PROMPT;
  if (options?.guidance) {
    systemPrompt += `\n\n## Standing Instructions\n${options.guidance}`;
  }
  if (options?.feedback) {
    systemPrompt += `\n\n## Specific Instructions for This Report\n${options.feedback}`;
  }

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
          content: systemPrompt,
        },
        {
          role: "user",
          content: truncatedContent,
        },
      ],
      temperature: 0.1,
      max_tokens: 2000,
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

    // Build result
    const result: ExtractedReportData = { recommendations: [] };

    if (typeof parsed.investmentBank === "string" && parsed.investmentBank) {
      result.investmentBank = parsed.investmentBank.trim();
    }

    if (Array.isArray(parsed.analystNames)) {
      result.analystNames = parsed.analystNames
        .filter((n: unknown) => typeof n === "string" && n)
        .map((n: string) => n.trim());
    }

    // Handle recommendations array
    if (Array.isArray(parsed.recommendations)) {
      result.recommendations = parsed.recommendations
        .map((rec: Record<string, unknown>): ExtractedRecommendation => {
          const extracted: ExtractedRecommendation = {};
          if (typeof rec.companyName === "string" && rec.companyName) {
            extracted.companyName = (rec.companyName as string).trim();
          }
          if (typeof rec.companyIsin === "string" && rec.companyIsin) {
            extracted.companyIsin = (rec.companyIsin as string).trim();
          }
          if (typeof rec.targetPrice === "number" && !isNaN(rec.targetPrice) && rec.targetPrice > 0) {
            extracted.targetPrice = rec.targetPrice;
          }
          if (typeof rec.targetCurrency === "string" && rec.targetCurrency) {
            extracted.targetCurrency = (rec.targetCurrency as string).toUpperCase().trim();
          }
          if (typeof rec.recommendation === "string" && rec.recommendation) {
            extracted.recommendation = normalizeRecommendation(rec.recommendation as string);
          }
          if (typeof rec.summary === "string" && rec.summary) {
            extracted.summary = (rec.summary as string).trim();
          }
          if (typeof rec.investmentBank === "string" && rec.investmentBank) {
            extracted.investmentBank = (rec.investmentBank as string).trim();
          }
          if (typeof rec.previousTargetPrice === "number" && !isNaN(rec.previousTargetPrice) && rec.previousTargetPrice > 0) {
            extracted.previousTargetPrice = rec.previousTargetPrice;
          }
          if (typeof rec.previousRecommendation === "string" && rec.previousRecommendation) {
            extracted.previousRecommendation = normalizeRecommendation(rec.previousRecommendation as string);
          }
          return extracted;
        })
        .filter((rec: ExtractedRecommendation) => rec.targetPrice);
    }

    // Backward-compat fallback: if LLM returns top-level companyName/targetPrice (old format),
    // wrap in a single-element recommendations array
    if (result.recommendations.length === 0 && parsed.companyName) {
      const fallback: ExtractedRecommendation = {};
      if (typeof parsed.companyName === "string" && parsed.companyName) {
        fallback.companyName = parsed.companyName.trim();
      }
      if (typeof parsed.targetPrice === "number" && !isNaN(parsed.targetPrice) && parsed.targetPrice > 0) {
        fallback.targetPrice = parsed.targetPrice;
      }
      if (typeof parsed.targetCurrency === "string" && parsed.targetCurrency) {
        fallback.targetCurrency = parsed.targetCurrency.toUpperCase().trim();
      }
      if (typeof parsed.recommendation === "string" && parsed.recommendation) {
        fallback.recommendation = normalizeRecommendation(parsed.recommendation);
      }
      if (typeof parsed.summary === "string" && parsed.summary) {
        fallback.summary = parsed.summary.trim();
      }
      if (fallback.targetPrice) {
        result.recommendations.push(fallback);
      }
    }

    return result;
  } catch (parseError) {
    throw new Error(`Failed to parse extraction response: ${parseError}`);
  }
}

// Normalize recommendation to standard values
export function normalizeRecommendation(rec: string): string {
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
