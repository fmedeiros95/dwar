import type { NextFunction, Request, Response } from 'express';

const rateLimitedPaths = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/register/challenge',
]);

export function createRequestGuardMiddleware() {
  const origin = process.env.WEB_ORIGIN ?? 'http://localhost:5180';
  const allowedOrigins = new Set([origin]);
  const localOrigin = new URL(origin);
  if (
    process.env.NODE_ENV !== 'production' &&
    ['localhost', '127.0.0.1'].includes(localOrigin.hostname)
  ) {
    localOrigin.hostname = localOrigin.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
    allowedOrigins.add(localOrigin.origin);
  }
  const attempts = new Map<string, { count: number; until: number }>();
  const cleanup = setInterval(() => {
    for (const [key, value] of attempts) if (value.until < Date.now()) attempts.delete(key);
  }, 60_000);
  cleanup.unref();

  return (request: Request, response: Response, next: NextFunction) => {
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
      !allowedOrigins.has(request.headers.origin ?? '')
    ) {
      response.status(403).json({ message: 'Origem da solicitação inválida. Recarregue o jogo.' });
      return;
    }
    if (rateLimitedPaths.has(request.path)) {
      const key = request.ip ?? 'local';
      const now = Date.now();
      const prior = attempts.get(key);
      const attempt = prior && prior.until > now ? prior : { count: 0, until: now + 60_000 };
      if (attempts.size >= 10_000 && !attempts.has(key)) {
        response.status(429).json({ message: 'Muitas solicitações. Aguarde um minuto.' });
        return;
      }
      attempts.set(key, attempt);
      if (++attempt.count > 15) {
        response.setHeader('Retry-After', Math.ceil((attempt.until - now) / 1000));
        response.status(429).json({ message: 'Muitas tentativas. Aguarde um minuto.' });
        return;
      }
    }
    next();
  };
}
