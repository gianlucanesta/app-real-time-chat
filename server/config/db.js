"use strict";
require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost")
    ? false
    : { rejectUnauthorized: false }, // required on Render Postgres
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  console.error("[pg] unexpected pool error", err.message);
});

/**
 * Run the initial schema migration on first boot.
 * Idempotent – uses CREATE TABLE IF NOT EXISTS.
 */
async function initSchema() {
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
  `);
  console.log("[pg] schema ready");
}

module.exports = { pool, initSchema };
