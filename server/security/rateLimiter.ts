import type { Request, Response, NextFunction } from 'express';

export interface RateLimiterOptions {
  routeKey: string;
  windowMs: number;
  maxRequests: number;
  message?: string;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

/**
 * Resolve o IP efetivo do cliente sem confiar cegamente em X-Forwarded-For.
 * Somente utiliza X-Forwarded-For quando TRUST_PROXY estiver explicitamente habilitado ('true' ou '1').
 */
export function resolveClientIp(req: Request): string {
  const trustProxy = process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1';
  if (trustProxy) {
    const xff = req.headers['x-forwarded-for'];
    const raw = Array.isArray(xff) ? xff[0] : xff;
    if (typeof raw === 'string' && raw.trim().length > 0) {
      const firstIp = raw.split(',')[0].trim();
      if (firstIp) return firstIp;
    }
  }
  return req.socket?.remoteAddress || req.ip || 'unknown';
}

/**
 * Rate limiter nativo em memória (zero dependências externas).
 * Projetado para arquitetura de instância única (single-instance).
 * Limpa automaticamente registros expirados para evitar crescimento indefinido de memória.
 */
export function createInMemoryRateLimiter(options: RateLimiterOptions) {
  const buckets = new Map<string, RateLimitBucket>();

  const cleanupIntervalMs = Math.max(1_000, Math.min(options.windowMs, 60_000));
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (now >= bucket.resetAt) {
        buckets.delete(key);
      }
    }
  }, cleanupIntervalMs);
  cleanupTimer.unref();

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
    const now = Date.now();
    const clientIp = resolveClientIp(req);
    const key = `${options.routeKey}:${clientIp}`;

    const existing = buckets.get(key);
    if (!existing || now >= existing.resetAt) {
      buckets.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      next();
      return;
    }

    existing.count += 1;
    if (existing.count > options.maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({
        error:
          options.message ||
          'Muitas tentativas em sequência. Aguarde alguns instantes e tente novamente.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterSeconds,
      });
      return;
    }

    next();
  };
}
