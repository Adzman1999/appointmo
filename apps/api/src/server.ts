import { createApp } from './app';
import { config } from './config';
import { runMigrations } from './db/migrate';

async function startServer() {
  if (config.env !== 'test') {
    await runMigrations();
  }

  const app = createApp();
  app.listen(config.port, () => {
    console.log(`Appointmo API listening on http://localhost:${config.port}`);
    console.log(`Environment: ${config.env}`);
  });
}

startServer().catch((error: unknown) => {
  console.error('API startup failed:', error);
  process.exit(1);
});
