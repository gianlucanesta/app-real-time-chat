import { pool } from "../config/db.js";
import type {
  IUser,
  IUserWithPassword,
  IUserCreate,
  IRefreshToken,
} from "../interfaces/user.interface.js";

const SAFE_COLUMNS =
  "id, email, display_name, first_name, last_name, phone, role, avatar_url, initials, avatar_gradient, email_verified, settings, created_at";

/** Find a user by primary key (UUID). */
export async function findById(id: string): Promise<IUser | null> {
  const { rows } = await pool.query<IUser>(
    `SELECT ${SAFE_COLUMNS} FROM users WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

/** Find a user by email. Returns password_hash too — internal only. */
export async function findByEmail(
  email: string,
): Promise<IUserWithPassword | null> {
  const { rows } = await pool.query<IUserWithPassword>(
    `SELECT ${SAFE_COLUMNS}, password_hash FROM users WHERE email = $1`,
    [email.toLowerCase().trim()],
  );
  return rows[0] ?? null;
}

/** Full-text search on display_name (simple ILIKE). */
export async function search(
  query: string,
  limit = 20,
  excludeUserId?: string,
): Promise<IUser[]> {
  const params: (string | number)[] = [`%${query}%`];
  let whereClause = `WHERE display_name ILIKE $1`;
  if (excludeUserId) {
    whereClause += ` AND id <> $2`;
    params.push(excludeUserId);
  }
  params.push(limit);
  const limitIdx = params.length;
  const { rows } = await pool.query<IUser>(
    `SELECT id, email, display_name, initials, avatar_gradient, avatar_url
     FROM users
     ${whereClause}
     ORDER BY display_name
     LIMIT $${limitIdx}`,
    params,
  );
  return rows;
}

/** Insert a new user. Returns the created row (no password_hash). */
export async function create({
  email,
  passwordHash,
  displayName,
  phone = "",
}: IUserCreate): Promise<IUser> {
  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const { rows } = await pool.query<IUser>(
    `INSERT INTO users (email, password_hash, display_name, phone, initials)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${SAFE_COLUMNS}`,
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
 * Look up a user by phone number (exact match after normalisation).
 * Returns the user row (no password_hash) or null.
 */
export async function findByPhone(phone: string): Promise<IUser | null> {
  const normalized = phone.replace(/[^+\d]/g, "");
  const { rows } = await pool.query<IUser>(
    `SELECT id, email, display_name, initials, avatar_gradient, avatar_url
     FROM users
     WHERE regexp_replace(phone, '[^+\\d]', '', 'g') = $1
     LIMIT 1`,
    [normalized],
  );
  return rows[0] ?? null;
}

/** Partial update — only the fields present in `fields` are changed. */
const UPDATABLE_COLUMNS = new Set([
  "display_name",
  "first_name",
  "last_name",
  "phone",
  "role",
  "avatar_url",
  "initials",
  "avatar_gradient",
]);

export async function update(
  id: string,
  fields: Record<string, string>,
): Promise<IUser | null> {
  const keys = Object.keys(fields).filter((k) => UPDATABLE_COLUMNS.has(k));
  if (!keys.length) return findById(id);

  const setClauses = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
  const values = keys.map((k) => fields[k]);

  const { rows } = await pool.query<IUser>(
    `UPDATE users SET ${setClauses} WHERE id = $1
     RETURNING ${SAFE_COLUMNS}`,
    [id, ...values],
  );
  return rows[0] ?? null;
}

// ── User settings ───────────────────────────────────────────────────────

/** Get settings JSONB for a user. */
export async function getSettings(
  userId: string,
): Promise<Record<string, unknown>> {
  const { rows } = await pool.query<{ settings: Record<string, unknown> }>(
    `SELECT settings FROM users WHERE id = $1`,
    [userId],
  );
  return rows[0]?.settings ?? {};
}

/** Merge partial settings into the existing JSONB (shallow merge). */
export async function updateSettings(
  userId: string,
  partial: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { rows } = await pool.query<{ settings: Record<string, unknown> }>(
    `UPDATE users SET settings = settings || $2::jsonb WHERE id = $1
     RETURNING settings`,
    [userId, JSON.stringify(partial)],
  );
  return rows[0]?.settings ?? {};
}

/** Store a hashed refresh token tied to a user. */
export async function saveRefreshToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  await pool.query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [userId, tokenHash, expiresAt],
  );
}

/** Find a valid (non-expired) refresh token row. */
export async function findRefreshToken(
  tokenHash: string,
): Promise<IRefreshToken | null> {
  const { rows } = await pool.query<IRefreshToken>(
    "SELECT id, user_id, expires_at FROM refresh_tokens WHERE token_hash = $1 AND expires_at > now()",
    [tokenHash],
  );
  return rows[0] ?? null;
}

/** Delete a specific refresh token (on logout or rotation). */
export async function deleteRefreshToken(tokenHash: string): Promise<void> {
  await pool.query("DELETE FROM refresh_tokens WHERE token_hash = $1", [
    tokenHash,
  ]);
}

// ── Email verification ──────────────────────────────────────────────────────

/** Store a verification token for a user. */
export async function setVerificationToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  await pool.query(
    `UPDATE users SET verification_token = $1, verification_token_expires = $2 WHERE id = $3`,
    [tokenHash, expiresAt, userId],
  );
}

/** Find user by a valid (non-expired) verification token hash. */
export async function findByVerificationToken(
  tokenHash: string,
): Promise<IUser | null> {
  const { rows } = await pool.query<IUser>(
    `SELECT ${SAFE_COLUMNS} FROM users WHERE verification_token = $1 AND verification_token_expires > now()`,
    [tokenHash],
  );
  return rows[0] ?? null;
}

/** Mark user email as verified and clear the token. */
export async function markEmailVerified(userId: string): Promise<void> {
  await pool.query(
    `UPDATE users SET email_verified = true, verification_token = NULL, verification_token_expires = NULL WHERE id = $1`,
    [userId],
  );
}

// ── Password reset ──────────────────────────────────────────────────────────

/** Store a password reset token for a user. */
export async function setResetPasswordToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  await pool.query(
    `UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3`,
    [tokenHash, expiresAt, userId],
  );
}

/** Find user by a valid (non-expired) reset token hash. Returns password_hash too. */
export async function findByResetToken(
  tokenHash: string,
): Promise<IUserWithPassword | null> {
  const { rows } = await pool.query<IUserWithPassword>(
    `SELECT ${SAFE_COLUMNS}, password_hash FROM users WHERE reset_password_token = $1 AND reset_password_expires > now()`,
    [tokenHash],
  );
  return rows[0] ?? null;
}

// ── Google OAuth ────────────────────────────────────────────────────────────

/** Find a user by their Google subject ID. */
export async function findByGoogleId(googleId: string): Promise<IUser | null> {
  const { rows } = await pool.query<IUser>(
    `SELECT ${SAFE_COLUMNS} FROM users WHERE google_id = $1`,
    [googleId],
  );
  return rows[0] ?? null;
}

/**
 * Find-or-create a Google OAuth user.
 * - If the google_id already exists → return existing user.
 * - If the email exists but google_id is NULL → link and return.
 * - Otherwise → create new user (email pre-verified, no password).
 */
export async function upsertGoogleUser({
  googleId,
  email,
  displayName,
  firstName,
  lastName,
  avatarUrl,
}: {
  googleId: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}): Promise<IUser> {
  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const { rows } = await pool.query<IUser>(
    `INSERT INTO users (email, password_hash, display_name, first_name, last_name, initials, avatar_url, google_id, email_verified)
     VALUES ($1, '', $2, $3, $4, $5, $6, $7, true)
     ON CONFLICT (email) DO UPDATE
       SET google_id      = EXCLUDED.google_id,
           email_verified = true,
           first_name     = COALESCE(NULLIF(users.first_name, ''), EXCLUDED.first_name),
           last_name      = COALESCE(NULLIF(users.last_name, ''), EXCLUDED.last_name),
           avatar_url     = COALESCE(users.avatar_url, EXCLUDED.avatar_url)
     RETURNING ${SAFE_COLUMNS}`,
    [
      email.toLowerCase().trim(),
      displayName.trim(),
      firstName ?? null,
      lastName ?? null,
      initials,
      avatarUrl ?? null,
      googleId,
    ],
  );
  return rows[0];
}

// ── Facebook OAuth ──────────────────────────────────────────────────────────

/**
 * Find-or-create a Facebook OAuth user.
 * - If the facebook_id already exists → return existing user.
 * - If the email exists but facebook_id is NULL → link and return.
 * - Otherwise → create new user (email pre-verified, no password).
 */
export async function upsertFacebookUser({
  facebookId,
  email,
  displayName,
  firstName,
  lastName,
  avatarUrl,
}: {
  facebookId: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}): Promise<IUser> {
  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const { rows } = await pool.query<IUser>(
    `INSERT INTO users (email, password_hash, display_name, first_name, last_name, initials, avatar_url, facebook_id, email_verified)
     VALUES ($1, '', $2, $3, $4, $5, $6, $7, true)
     ON CONFLICT (email) DO UPDATE
       SET facebook_id    = EXCLUDED.facebook_id,
           email_verified = true,
           first_name     = COALESCE(NULLIF(users.first_name, ''), EXCLUDED.first_name),
           last_name      = COALESCE(NULLIF(users.last_name, ''), EXCLUDED.last_name),
           avatar_url     = COALESCE(users.avatar_url, EXCLUDED.avatar_url)
     RETURNING ${SAFE_COLUMNS}`,
    [
      email.toLowerCase().trim(),
      displayName.trim(),
      firstName ?? null,
      lastName ?? null,
      initials,
      avatarUrl ?? null,
      facebookId,
    ],
  );
  return rows[0];
}

/** Update password and clear reset token. */
export async function updatePassword(
  userId: string,
  newPasswordHash: string,
): Promise<void> {
  await pool.query(
    `UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2`,
    [newPasswordHash, userId],
  );
}

// ── Blocked users ───────────────────────────────────────────────────────────

export interface BlockedUserRow {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  display_name: string;
  initials: string;
  avatar_url: string | null;
  avatar_gradient: string;
}

/** Block a user. Returns the blocked row or null if already blocked. */
export async function blockUser(
  blockerId: string,
  blockedId: string,
): Promise<BlockedUserRow | null> {
  const { rows } = await pool.query<BlockedUserRow>(
    `INSERT INTO blocked_users (blocker_id, blocked_id)
     VALUES ($1, $2)
     ON CONFLICT (blocker_id, blocked_id) DO NOTHING
     RETURNING *`,
    [blockerId, blockedId],
  );
  if (!rows[0]) return null;
  // Fetch display info for blocked user
  const info = await findById(blockedId);
  return {
    ...rows[0],
    display_name: info?.display_name ?? "",
    initials: info?.initials ?? "",
    avatar_url: info?.avatar_url ?? null,
    avatar_gradient: info?.avatar_gradient ?? "",
  };
}

/** Unblock a user. Returns true if a row was deleted. */
export async function unblockUser(
  blockerId: string,
  blockedId: string,
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2`,
    [blockerId, blockedId],
  );
  return (rowCount ?? 0) > 0;
}

/** Delete a user account and all associated data (FK CASCADE handles related tables). */
export async function deleteAccount(userId: string): Promise<boolean> {
  const { rowCount } = await pool.query(`DELETE FROM users WHERE id = $1`, [
    userId,
  ]);
  return (rowCount ?? 0) > 0;
}

/** List all blocked users with their profile info. */
export async function listBlockedUsers(
  blockerId: string,
): Promise<BlockedUserRow[]> {
  const { rows } = await pool.query<BlockedUserRow>(
    `SELECT bu.id, bu.blocker_id, bu.blocked_id, bu.created_at,
            u.display_name, u.initials, u.avatar_url, u.avatar_gradient
     FROM blocked_users bu
     JOIN users u ON u.id = bu.blocked_id
     WHERE bu.blocker_id = $1
     ORDER BY bu.created_at DESC`,
    [blockerId],
  );
  return rows;
}
