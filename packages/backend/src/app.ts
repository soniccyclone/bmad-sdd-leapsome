import Fastify from 'fastify';

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

  // Plugins and routes will be registered here in subsequent stories

  return app;
}
