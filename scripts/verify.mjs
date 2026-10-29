import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireFromApi = createRequire(path.join(projectRoot, 'apps/api/package.json'));
requireFromApi('dotenv').config({ path: path.join(projectRoot, 'apps/api/.env') });

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  console.error('Set TEST_DATABASE_URL in apps/api/.env before running the verification suite.');
  process.exit(1);
}

let testDatabase;
try {
  testDatabase = new URL(testDatabaseUrl);
} catch {
  console.error('TEST_DATABASE_URL must be a valid PostgreSQL connection URL.');
  process.exit(1);
}

const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
const databaseName = decodeURIComponent(testDatabase.pathname.replace(/^\//, ''));
if (!localHosts.has(testDatabase.hostname) || !databaseName.endsWith('_test')) {
  console.error('Verification requires a local PostgreSQL database whose name ends in _test.');
  process.exit(1);
}

const commandEnvironment = {
  ...process.env,
  DATABASE_URL: testDatabaseUrl,
  NODE_ENV: 'test',
};

function runPnpm(args) {
  console.log(`\n> pnpm ${args.join(' ')}`);
  const result = spawnSync('pnpm', args, {
    cwd: projectRoot,
    env: commandEnvironment,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Verification database: localhost/${databaseName}`);
runPnpm(['typecheck']);
runPnpm(['db:migrate']);
runPnpm(['test']);
runPnpm(['build']);
console.log('\nVerification completed successfully.');
