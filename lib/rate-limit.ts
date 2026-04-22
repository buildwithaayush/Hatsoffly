/**
 * In-memory rate limits for local MVP. Replace with Redis keys from the spec in production:
 * rl:signup:ip:{ip}, rl:signup:email:{email}, rl:verifyresend:{user_id}, rl:verifycheck:{user_id}
 */

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

function key(prefix: string, id: string) {
  return `${prefix}:${id}`;
}

export function rateLimitHit(
  prefix: string,
  id: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const k = key(prefix, id);
  const now = Date.now();
  let b = store.get(k);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    store.set(k, b);
  }
  if (b.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true };
}
