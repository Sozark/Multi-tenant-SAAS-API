-- Note: schema name is injected by the migration runner, not raw user input
CREATE SCHEMA IF NOT EXISTS "tenant_TENANT_ID";
SET search_path TO "tenant_TENANT_ID";

-- Tenant-local user profiles (linked to public.users by same ID)
CREATE TABLE user_profiles (
  user_id     TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  avatar_url  TEXT,
  settings    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Your app's main resource (customize to your domain)
CREATE TABLE resources (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  owner_id    TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        JSONB NOT NULL DEFAULT '{}',
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_resources_owner ON resources(owner_id);
CREATE INDEX idx_resources_status ON resources(status);

-- Usage events for the dashboard
CREATE TABLE usage_events (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT,
  endpoint    TEXT NOT NULL,
  method      TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usage_events_created ON usage_events(created_at DESC);