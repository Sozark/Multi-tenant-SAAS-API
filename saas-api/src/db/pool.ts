import { Pool } from 'pg';
import { env } from '../config/env';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected DB pool error', err);
  process.exit(1);
});

// Returns a client scoped to a specific tenant's schema
export async function getTenantClient(tenantId: string) {
  const client = await pool.connect();
  // Sanitize tenantId — never interpolate raw user input into SQL
  if (!/^[a-z0-9_]+$/.test(tenantId)) {
    client.release();
    throw new Error('Invalid tenant ID format');
  }
  await client.query(`SET search_path TO tenant_${tenantId}, public`);
  return client;
}