import { createHash } from 'crypto';
import { readFile, readdir } from 'fs/promises';
import path from 'path';
import { pool } from './index';

type MigrationFile = {
  version: string;
  filePath: string;
};

const migrationDirectory = path.join(__dirname, 'migrations');
const migrationLockKey = 'appointmo:schema-migrations';

async function listMigrations(): Promise<MigrationFile[]> {
  const fileNames = await readdir(migrationDirectory);
  return fileNames
    .filter((fileName) => /^\d{3}_[a-z0-9_]+\.sql$/i.test(fileName))
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => ({
      version: fileName,
      filePath: path.join(migrationDirectory, fileName),
    }));
}

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  let lockAcquired = false;

  try {
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [migrationLockKey]);
    lockAcquired = true;

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        checksum CHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const appliedResult = await client.query<{ version: string; checksum: string }>(
      'SELECT version, checksum FROM schema_migrations'
    );
    const appliedMigrations = new Map(
      appliedResult.rows.map((migration) => [migration.version, migration.checksum])
    );

    for (const migration of await listMigrations()) {
      const sql = await readFile(migration.filePath, 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const appliedChecksum = appliedMigrations.get(migration.version);

      if (appliedChecksum) {
        if (appliedChecksum !== checksum) {
          throw new Error(
            `Applied migration ${migration.version} has changed. Add a new migration instead of editing it.`
          );
        }
        continue;
      }

      console.log(`Applying database migration ${migration.version}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)',
          [migration.version, checksum]
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    console.log('Database migrations are up to date.');
  } finally {
    try {
      if (lockAcquired) {
        await client.query('SELECT pg_advisory_unlock(hashtext($1))', [migrationLockKey]);
      }
    } finally {
      client.release();
    }
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => pool.end())
    .catch((error: unknown) => {
      console.error('Database migration failed:', error);
      process.exit(1);
    });
}
