const rateLimit = new Map<string, { count: number; resetTime: number }>();

const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_LOGIN = 5; // 5 login attempts per minute
const MAX_REQUESTS_API = 30; // 30 API requests per minute

// Clean up stale entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimit) {
    if (now > value.resetTime) {
      rateLimit.delete(key);
    }
  }
}, 60 * 1000);

export function checkRateLimit(
  identifier: string,
  type: "login" | "api" = "api"
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const maxRequests = type === "login" ? MAX_REQUESTS_LOGIN : MAX_REQUESTS_API;
  const key = `${type}:${identifier}`;

  const entry = rateLimit.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimit.set(key, { count: 1, resetTime: now + WINDOW_MS });
    return { allowed: true, remaining: maxRequests - 1, resetIn: WINDOW_MS };
  }

  entry.count++;

  if (entry.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.resetTime - now,
    };
  }

  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetIn: entry.resetTime - now,
  };
}

export function getRateLimitHeaders(result: {
  remaining: number;
  resetIn: number;
}): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetIn / 1000)),
  };
}
