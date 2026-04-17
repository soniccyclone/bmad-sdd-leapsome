import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';

const REQUIRED_ENV = ['DATABASE_URL', 'FRONTEND_URL'] as const;

export async function createApp() {
  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
  }

  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty' }
        : undefined,
    },
  });

  // CORS — allow requests from the frontend origin
  await app.register(cors, {
    origin: process.env.FRONTEND_URL!,
  });

  // Rate limiting — 100 requests per minute per IP
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Routes will be registered here in subsequent stories

  return app;
}
