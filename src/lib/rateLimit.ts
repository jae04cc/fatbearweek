// Dead-simple fixed-window rate limiter, in-memory.
//
// This is a single-container deployment (see the Docker setup), so a shared
// process-memory map is sufficient — no Redis, no cross-instance coordination.
// It exists to blunt online brute-forcing of the login password and the shared
// signup invite code; it is not a defense against a distributed attacker, and
// isn't meant to be. State resets on restart, which is fine for this purpose.

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

// Opportunistic sweep so the map can't grow without bound from unique keys
// (e.g. one entry per attacker IP). Runs at most once a minute, inline.
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, w] of windows) {
    if (w.resetAt <= now) windows.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

/**
 * Records one attempt against `key` and reports whether it's allowed.
 * Allows up to `limit` attempts per `windowMs`; further attempts in the same
 * window are rejected until it rolls over.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = windows.get(key);
  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfterSeconds: 0 };
}

// Best-effort client IP from the proxy's forwarding headers. Falls back to a
// fixed bucket so a missing header degrades to a shared limit rather than no
// limit at all.
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
