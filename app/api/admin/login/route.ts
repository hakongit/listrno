import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, createSession } from "@/lib/admin-auth";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimitResult = checkRateLimit(ip, "login");

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "For mange forsøk. Prøv igjen senere." },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    if (!verifyPassword(password)) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    await createSession();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
