import { pool, getTenantClient } from '../db/pool';
import { provisionTenantSchema } from '../db/migrate';
import { TenantContext } from '../types';
import bcrypt from 'bcrypt';

export async function createTenant(
  name: string,
  slug: string,
  ownerEmail: string,
  ownerPassword: string
): Promise<{ tenantId: string; userId: string }> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. Create tenant record
    const { rows: [tenant] } = await client.query(
      `INSERT INTO tenants (slug, name) VALUES ($1, $2) RETURNING id`,
      [slug, name]
    );

    // 2. Create owner user
    const passwordHash = await bcrypt.hash(ownerPassword, 12);
    const { rows: [user] } = await client.query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
      [ownerEmail, passwordHash]
    );

    // 3. Link user to tenant as owner
    await client.query(
      `INSERT INTO tenant_memberships (user_id, tenant_id, role) VALUES ($1, $2, 'owner')`,
      [user.id, tenant.id]
    );

    await client.query('COMMIT');

    // 4. Provision the tenant's isolated schema (outside the transaction
    //    since schema DDL auto-commits in Postgres anyway)
    await provisionTenantSchema(tenant.id);

    // 5. Create the owner's profile in the new tenant schema
    const tenantClient = await getTenantClient(tenant.id);
    try {
      await tenantClient.query(
        `INSERT INTO user_profiles (user_id, display_name) VALUES ($1, $2)`,
        [user.id, ownerEmail.split('@')[0]]
      );
    } finally {
      tenantClient.release();
    }

    return { tenantId: tenant.id, userId: user.id };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getTenantById(id: string): Promise<TenantContext | null> {
  const { rows } = await pool.query(
    `SELECT id, name, plan, rate_limit FROM tenants WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  if (!rows[0]) return null;
  return {
    id: rows[0].id,
    name: rows[0].name,
    plan: rows[0].plan,
    rateLimit: rows[0].rate_limit,
  };
}