import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { getExtractionGuidance, updateExtractionGuidance } from "@/lib/analyst-db";

// GET: Return current guidance text
export async function GET() {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const guidance = await getExtractionGuidance();
    return NextResponse.json({ guidance });
  } catch (error) {
    console.error("Error fetching guidance:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch guidance" },
      { status: 500 }
    );
  }
}

// PATCH: Update guidance text
export async function PATCH(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(ip, "api");
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: getRateLimitHeaders(rl) });
  }

  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { guidance } = await request.json();

    if (typeof guidance !== "string") {
      return NextResponse.json({ error: "guidance must be a string" }, { status: 400 });
    }

    await updateExtractionGuidance(guidance);
    return NextResponse.json({ success: true, guidance });
  } catch (error) {
    console.error("Error updating guidance:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update guidance" },
      { status: 500 }
    );
  }
}
