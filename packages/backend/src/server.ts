import { createApp } from './app.js';
import { closeDb } from './db/index.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
if (Number.isNaN(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error(`Invalid PORT: ${process.env.PORT}. Must be 1-65535.`);
}

async function start() {
  const app = await createApp();

  // Graceful shutdown
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info(`Received ${signal}, shutting down gracefully...`);
    try {
      await app.close();
      await closeDb();
      app.log.info('Server and database connections closed');
      process.exit(0);
    } catch (err) {
      app.log.error(err, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    app.log.info(`Server listening on port ${PORT}`);
  } catch (err) {
    if (app) {
      app.log.error(err);
    } else {
      console.error('Failed to start server:', err);
    }
    process.exit(1);
  }
}

start().catch((err) => {
  console.error('Unhandled error during startup:', err);
  process.exit(1);
});
