import { cookies } from "next/headers";
import { timingSafeEqual, createHmac, randomBytes } from "crypto";

const COOKIE_NAME = "admin_session";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface SessionPayload {
  exp: number; // Expiration timestamp
  iat: number; // Issued at timestamp
  nonce: string; // Random nonce for uniqueness
}

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not set");
  }
  return secret;
}

function getAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error("ADMIN_PASSWORD is not set");
  }
  return password;
}

// Constant-time string comparison to prevent timing attacks
function secureCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      // Compare with self to maintain constant time
      timingSafeEqual(bufA, bufA);
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// Create HMAC signature for session
function signPayload(payload: SessionPayload): string {
  const data = JSON.stringify(payload);
  const signature = createHmac("sha256", getSecret())
    .update(data)
    .digest("base64url");
  return `${Buffer.from(data).toString("base64url")}.${signature}`;
}

// Verify and decode session token
function verifyToken(token: string): SessionPayload | null {
  try {
    const [dataB64, signature] = token.split(".");
    if (!dataB64 || !signature) return null;

    const data = Buffer.from(dataB64, "base64url").toString();
    const expectedSignature = createHmac("sha256", getSecret())
      .update(data)
      .digest("base64url");

    if (!secureCompare(signature, expectedSignature)) {
      return null;
    }

    const payload = JSON.parse(data) as SessionPayload;

    // Check expiration
    if (Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// Verify admin password
export function verifyPassword(password: string): boolean {
  return secureCompare(password, getAdminPassword());
}

// Create a new session and set cookie
export async function createSession(): Promise<void> {
  const now = Date.now();
  const payload: SessionPayload = {
    exp: now + SESSION_DURATION_MS,
    iat: now,
    nonce: randomBytes(16).toString("hex"),
  };

  const token = signPayload(payload);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  });
}

// Destroy current session
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Check if current request has valid admin session
export async function isAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return false;
    return verifyToken(token) !== null;
  } catch {
    return false;
  }
}

// Get session info (for admin UI)
export async function getSession(): Promise<{ expiresAt: Date } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    return {
      expiresAt: new Date(payload.exp),
    };
  } catch {
    return null;
  }
}

// Middleware helper to require authentication
export async function requireAuth(): Promise<{ authenticated: true } | { authenticated: false; redirectTo: string }> {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return { authenticated: false, redirectTo: "/admin" };
  }
  return { authenticated: true };
}
