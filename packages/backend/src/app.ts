import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { healthRoute } from './routes/health.js';
import { todoRoutes } from './routes/todos.js';

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

  // Rate limiting — configurable via RATE_LIMIT_MAX env var (default 100)
  const rateLimitMax = Number(process.env.RATE_LIMIT_MAX) || 100;
  await app.register(rateLimit, {
    max: rateLimitMax,
    timeWindow: '1 minute',
  });

  // Routes
  await app.register(healthRoute);
  await app.register(todoRoutes);

  return app;
}
