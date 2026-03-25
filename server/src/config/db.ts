import { Pool } from "pg";
import { env } from "./env.js";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_URL.includes("localhost")
    ? false
    : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  // Keep TCP connections alive so Render/cloud firewalls don't silently drop
  // idle pool connections (which causes "Connection terminated due to
  // connection timeout" on the next query).
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
});

pool.on("error", (err) => {
  // Stale idle clients emit this when the server closes the connection.
  // The pool removes them automatically; just log so it's visible.
  console.warn("[pg] idle client evicted:", err.message);
});

/**
 * Run the initial schema migration on first boot.
 * Idempotent – uses CREATE TABLE IF NOT EXISTS.
 */
export async function initSchema(): Promise<void> {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    CREATE TABLE IF NOT EXISTS users (
      id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      email         TEXT        UNIQUE NOT NULL,
      password_hash TEXT        NOT NULL,
      display_name  TEXT        NOT NULL,
      phone         TEXT        NOT NULL DEFAULT '',
      role          TEXT        NOT NULL DEFAULT '',
      avatar_url    TEXT,
      initials      TEXT,
      avatar_gradient TEXT      DEFAULT 'linear-gradient(135deg,#2563EB,#7C3AED)',
      created_at    TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT        NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      display_name TEXT        NOT NULL,
      phone        TEXT        NOT NULL DEFAULT '',
      initials     TEXT        NOT NULL DEFAULT '',
      gradient     TEXT        NOT NULL DEFAULT 'linear-gradient(135deg,#2563EB,#7C3AED)',
      linked_user_id UUID      REFERENCES users(id) ON DELETE SET NULL,
      created_at   TIMESTAMPTZ DEFAULT now(),
      UNIQUE (owner_id, phone)
    );

    -- Idempotent migration: add first_name / last_name
    ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name  TEXT NOT NULL DEFAULT '';

    -- Idempotent migration: email verification
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified            BOOLEAN     DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token        TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMPTZ;

    -- Idempotent migration: password reset
    ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token   TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMPTZ;

    -- Idempotent migration: Google OAuth
    ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;
    -- Idempotent migration: Facebook OAuth
    ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_id TEXT UNIQUE;
    -- Allow social-only accounts to have no password hash
    ALTER TABLE users ALTER COLUMN password_hash SET DEFAULT '';

    -- Idempotent migration: user settings (JSONB)
    ALTER TABLE users ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}';

    -- Idempotent migration: blocked users
    CREATE TABLE IF NOT EXISTS blocked_users (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      blocker_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at  TIMESTAMPTZ DEFAULT now(),
      UNIQUE (blocker_id, blocked_id)
    );
  `);
  console.log("[pg] schema ready");
}
