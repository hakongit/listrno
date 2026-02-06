import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/admin-auth";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import {
  getAllAnalystDomains,
  addAnalystDomain,
  removeAnalystDomain,
} from "@/lib/analyst-db";

function getRateLimitedResponse(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const result = checkRateLimit(ip, "api");
  if (!result.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: getRateLimitHeaders(result) }
    );
  }
  return null;
}

// GET: List all whitelisted domains
export async function GET() {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const domains = await getAllAnalystDomains();
    return NextResponse.json({ domains });
  } catch (error) {
    console.error("Error listing domains:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list domains" },
      { status: 500 }
    );
  }
}

// POST: Add a new whitelisted domain
export async function POST(request: NextRequest) {
  const rateLimited = getRateLimitedResponse(request);
  if (rateLimited) return rateLimited;

  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { domain, bankName } = await request.json();

    if (!domain || !bankName) {
      return NextResponse.json(
        { error: "domain and bankName are required" },
        { status: 400 }
      );
    }

    // Basic domain validation
    const cleanDomain = domain.toLowerCase().trim();
    if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(cleanDomain)) {
      return NextResponse.json(
        { error: "Invalid domain format" },
        { status: 400 }
      );
    }

    await addAnalystDomain(cleanDomain, bankName.trim());

    const domains = await getAllAnalystDomains();
    return NextResponse.json({ success: true, domains });
  } catch (error) {
    console.error("Error adding domain:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add domain" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a whitelisted domain
export async function DELETE(request: NextRequest) {
  const rateLimited = getRateLimitedResponse(request);
  if (rateLimited) return rateLimited;

  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { domain } = await request.json();

    if (!domain) {
      return NextResponse.json(
        { error: "domain is required" },
        { status: 400 }
      );
    }

    await removeAnalystDomain(domain);

    const domains = await getAllAnalystDomains();
    return NextResponse.json({ success: true, domains });
  } catch (error) {
    console.error("Error removing domain:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove domain" },
      { status: 500 }
    );
  }
}
