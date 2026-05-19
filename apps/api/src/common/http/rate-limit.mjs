import { AppError } from '../errors/app-error.mjs';

const defaultWindowMs = 60_000;
const defaultMaxRequests = 120;

export class InMemoryRateLimiter {
  constructor({ windowMs = defaultWindowMs, maxRequests = defaultMaxRequests } = {}) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.buckets = new Map();
  }

  check({ key, now = Date.now() }) {
    const current = this.buckets.get(key);

    if (!current || current.resetAt <= now) {
      const bucket = {
        count: 1,
        resetAt: now + this.windowMs
      };
      this.buckets.set(key, bucket);
      return bucket;
    }

    current.count += 1;

    if (current.count > this.maxRequests) {
      throw new AppError(429, 'RATE_LIMITED', 'Too many requests. Please retry shortly.', {
        retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000)
      });
    }

    return current;
  }
}
