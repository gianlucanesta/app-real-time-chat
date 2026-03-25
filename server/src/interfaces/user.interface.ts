/**
 * User entity as stored in PostgreSQL.
 * Used as the return type from all User model queries.
 */
export interface IUser {
  id: string;
  email: string;
  display_name: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
  avatar_url: string | null;
  initials: string | null;
  avatar_gradient: string;
  email_verified: boolean;
  created_at: string;
  settings: Record<string, unknown>;
}

/**
 * Internal-only: includes password_hash for the login flow.
 * Never returned to the client.
 */
export interface IUserWithPassword extends IUser {
  password_hash: string;
}

/** Parameters for creating a new user. */
export interface IUserCreate {
  email: string;
  passwordHash: string;
  displayName: string;
  phone?: string;
}

/** Refresh token row from PostgreSQL. */
export interface IRefreshToken {
  id: string;
  user_id: string;
  expires_at: string;
}
