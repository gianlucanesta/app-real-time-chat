"use strict";
const { pool } = require("../config/db");

/**
 * Low-level data-access object for the `users` table.
 * No ORM – plain parameterised SQL queries via the pg Pool.
 */

/**
 * Find a user by primary key.
 * @param {string} id  UUID
 * @returns {Promise<object|null>}
 */
async function findById(id) {
  const { rows } = await pool.query(
    "SELECT id, email, display_name, phone, role, avatar_url, initials, avatar_gradient, created_at FROM users WHERE id = $1",
    [id],
  );
  return rows[0] ?? null;
}

/**
 * Find a user by email (used during login).
 * Returns password_hash too – only expose internally.
 * @param {string} email
 * @returns {Promise<object|null>}
 */
async function findByEmail(email) {
  const { rows } = await pool.query(
    "SELECT id, email, password_hash, display_name, phone, role, avatar_url, initials, avatar_gradient, created_at FROM users WHERE email = $1",
    [email.toLowerCase().trim()],
  );
  return rows[0] ?? null;
}

/**
 * Full-text search on display_name (simple ILIKE).
 * @param {string} query
 * @param {number} [limit=20]
 * @returns {Promise<object[]>}
 */
async function search(query, limit = 20) {
  const { rows } = await pool.query(
    `SELECT id, email, display_name, initials, avatar_gradient, avatar_url
     FROM users
     WHERE display_name ILIKE $1
     ORDER BY display_name
     LIMIT $2`,
    [`%${query}%`, limit],
  );
  return rows;
}

/**
 * Insert a new user.
 * @param {{ email: string, passwordHash: string, displayName: string, phone?: string }} data
 * @returns {Promise<object>}  the created user row (no password_hash)
 */
async function create({ email, passwordHash, displayName, phone = "" }) {
  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, display_name, phone, initials)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, display_name, phone, role, avatar_url, initials, avatar_gradient, created_at`,
    [
      email.toLowerCase().trim(),
      passwordHash,
      displayName.trim(),
      phone,
      initials,
    ],
  );
  return rows[0];
}

/**
 * Look up a user by their phone number (exact match after normalisation).
 * Returns the user row (no password_hash) or null.
 * @param {string} phone  e.g. "+39 355 999 99 99" or "+39355999999"
 * @returns {Promise<object|null>}
 */
async function findByPhone(phone) {
  // Strip all non-digit/plus characters for a loose match
  const normalized = phone.replace(/[^+\d]/g, "");
  const { rows } = await pool.query(
    `SELECT id, email, display_name, initials, avatar_gradient, avatar_url
     FROM users
     WHERE regexp_replace(phone, '[^+\\d]', '', 'g') = $1
     LIMIT 1`,
    [normalized],
  );
  return rows[0] ?? null;
}

/**
 * Partial update – only the fields present in `fields` are changed.
 * Allowed columns (whitelist to prevent SQL injection):
 */
const UPDATABLE_COLUMNS = new Set([
  "display_name",
  "phone",
  "role",
  "avatar_url",
  "initials",
  "avatar_gradient",
]);

async function update(id, fields) {
  const keys = Object.keys(fields).filter((k) => UPDATABLE_COLUMNS.has(k));
  if (!keys.length) return findById(id);

  const setClauses = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
  const values = keys.map((k) => fields[k]);

  const { rows } = await pool.query(
    `UPDATE users SET ${setClauses} WHERE id = $1
     RETURNING id, email, display_name, phone, role, avatar_url, initials, avatar_gradient, created_at`,
    [id, ...values],
  );
  return rows[0] ?? null;
}

/**
 * Store a hashed refresh token tied to a user.
 */
async function saveRefreshToken(userId, tokenHash, expiresAt) {
  await pool.query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [userId, tokenHash, expiresAt],
  );
}

/**
 * Find a valid (non-expired) refresh token row.
 * @param {string} tokenHash
 * @returns {Promise<object|null>}
 */
async function findRefreshToken(tokenHash) {
  const { rows } = await pool.query(
    "SELECT id, user_id, expires_at FROM refresh_tokens WHERE token_hash = $1 AND expires_at > now()",
    [tokenHash],
  );
  return rows[0] ?? null;
}

/**
 * Delete a specific refresh token on logout.
 */
async function deleteRefreshToken(tokenHash) {
  await pool.query("DELETE FROM refresh_tokens WHERE token_hash = $1", [
    tokenHash,
  ]);
}

module.exports = {
  findById,
  findByEmail,
  search,
  findByPhone,
  create,
  update,
  saveRefreshToken,
  findRefreshToken,
  deleteRefreshToken,
};
