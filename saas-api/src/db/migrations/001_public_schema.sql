CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tenant registry
CREATE TABLE tenants (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  plan        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  rate_limit  INTEGER NOT NULL DEFAULT 100,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

-- Global user table (auth only — profile data lives in tenant schema)
CREATE TABLE users (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  email        TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Maps users to tenants with a role
CREATE TABLE tenant_memberships (
  user_id    TEXT NOT NULL REFERENCES users(id),
  tenant_id  TEXT NOT NULL REFERENCES tenants(id),
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, tenant_id)
);

-- API keys for machine-to-machine auth
CREATE TABLE api_keys (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id  TEXT NOT NULL REFERENCES tenants(id),
  key_hash   TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used  TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);