import fs from 'fs';
import path from 'path';
import { pool } from './pool';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// Run public schema migrations (called once at startup)
export async function runPublicMigrations() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Simple migration tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        filename TEXT PRIMARY KEY,
        run_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const { rows } = await client.query('SELECT filename FROM _migrations');
    const completed = new Set(rows.map((r: any) => r.filename));

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql') && !f.includes('tenant_schema'))
      .sort();

    for (const file of files) {
      if (completed.has(file)) continue;
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`Running migration: ${file}`);
      await client.query(sql);
      await client.query('INSERT INTO _migrations(filename) VALUES($1)', [file]);
    }

    await client.query('COMMIT');
    console.log('Public migrations complete');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Provision a fresh schema for a new tenant (called on signup)
export async function provisionTenantSchema(tenantId: string) {
  // Hard validation before any SQL interpolation
  if (!/^[a-z0-9]{8,}$/.test(tenantId)) {
    throw new Error(`Invalid tenant ID: ${tenantId}`);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const template = fs.readFileSync(
      path.join(MIGRATIONS_DIR, '002_tenant_schema.sql'),
      'utf8'
    );

    // Replace placeholder — tenantId is validated above, safe to interpolate
    const sql = template.replaceAll('TENANT_ID', tenantId);
    await client.query(sql);

    await client.query('COMMIT');
    console.log(`Provisioned schema for tenant: ${tenantId}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}