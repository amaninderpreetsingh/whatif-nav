import { HttpsError } from "firebase-functions/v2/https";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS_PER_MINUTE = 30;

export function checkRateLimit(userId: string): void {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return;
  }

  if (entry.count >= MAX_REQUESTS_PER_MINUTE) {
    throw new HttpsError("resource-exhausted", "Rate limit exceeded. Slow down.");
  }

  entry.count++;
}
