import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import crypto from "node:crypto";
import { env } from "../config/env.js";

/**
 * Sign a short-lived access token (JWT).
 */
export function signAccessToken(user: {
  id: string;
  email: string;
  display_name: string;
}): string {
  const payload = {
    sub: user.id,
    email: user.email,
    displayName: user.display_name,
  };

  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as unknown as number,
  };

  return jwt.sign(payload, env.JWT_SECRET, options);
}

/**
 * Generate a cryptographically random refresh token (hex string).
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString("hex");
}

/**
 * Hash a refresh token with SHA-256 for safe storage.
 */
export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
