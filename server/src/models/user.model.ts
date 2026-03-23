import { pool } from "../config/db.js";
import type {
  IUser,
  IUserWithPassword,
  IUserCreate,
  IRefreshToken,
} from "../interfaces/user.interface.js";

const SAFE_COLUMNS =
  "id, email, display_name, first_name, last_name, phone, role, avatar_url, initials, avatar_gradient, created_at";

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
