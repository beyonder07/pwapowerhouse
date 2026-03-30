type LimitBucket = {
  count: number;
  resetAt: number;
};

type LimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

declare global {
  var __powerhouseRateLimitStore: Map<string, LimitBucket> | undefined;
}

function getStore() {
  if (!globalThis.__powerhouseRateLimitStore) {
    globalThis.__powerhouseRateLimitStore = new Map<string, LimitBucket>();
  }

  return globalThis.__powerhouseRateLimitStore;
}

export function getRequestIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

export function consumeRateLimit(key: string, max: number, windowMs: number): LimitResult {
  const store = getStore();
  const now = Date.now();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs
    });
    return {
      allowed: true,
      retryAfterSeconds: Math.ceil(windowMs / 1000)
    };
  }

  if (current.count >= max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    };
  }

  current.count += 1;
  store.set(key, current);
  return {
    allowed: true,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
  };
}
