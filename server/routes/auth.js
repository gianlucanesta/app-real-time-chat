"use strict";
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");
const User = require("../models/User");
const { readBody, sendJSON } = require("../utils/http");

const BCRYPT_ROUNDS = 12;
const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || "15m";
const REFRESH_EXPIRES = process.env.REFRESH_EXPIRES_IN || "7d";
const REFRESH_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;

// ── Token helpers ──────────────────────────────────────────────────────────────

function signAccess(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, displayName: user.display_name },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES },
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(40).toString("hex");
}

// ── Handlers ───────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Body: { email, password, displayName, phone? }
 */
async function register(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch {
    return sendJSON(res, 400, { error: "Invalid JSON body" });
  }

  const { email, password, displayName, phone = "" } = body;

  // ── Input validation ────────────────────────────────────────────────────
  if (!email || !password || !displayName) {
    return sendJSON(res, 422, {
      error: "email, password and displayName are required",
    });
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return sendJSON(res, 422, { error: "Invalid email format" });
  }
  if (typeof password !== "string" || password.length < 8) {
    return sendJSON(res, 422, {
      error: "Password must be at least 8 characters",
    });
  }

  try {
    // ── Check uniqueness ────────────────────────────────────────────────
    const existing = await User.findByEmail(email);
    if (existing)
      return sendJSON(res, 409, { error: "Email already registered" });

    // ── Hash & create ───────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({ email, passwordHash, displayName, phone });

    // ── Issue tokens ────────────────────────────────────────────────────
    const accessToken = signAccess(user);
    const refreshRaw = generateRefreshToken();
    const refreshHash = crypto
      .createHash("sha256")
      .update(refreshRaw)
      .digest("hex");
    const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_MS);

    await User.saveRefreshToken(user.id, refreshHash, expiresAt);

    return sendJSON(res, 201, { accessToken, refreshToken: refreshRaw, user });
  } catch (err) {
    console.error("[auth] register error:", err.message);
    return sendJSON(res, 500, { error: "Internal server error" });
  }
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
async function login(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch {
    return sendJSON(res, 400, { error: "Invalid JSON body" });
  }

  const { email, password } = body;
  if (!email || !password) {
    return sendJSON(res, 422, { error: "email and password are required" });
  }

  try {
    const user = await User.findByEmail(email);
    // Constant-time comparison: run bcrypt even when user is not found to prevent timing attacks
    const hash =
      user?.password_hash ||
      "$2a$12$invalidhashfortimingprotection00000000000000000000000000";
    const match = await bcrypt.compare(password, hash);

    if (!user || !match) {
      return sendJSON(res, 401, { error: "Invalid email or password" });
    }

    const accessToken = signAccess(user);
    const refreshRaw = generateRefreshToken();
    const refreshHash = crypto
      .createHash("sha256")
      .update(refreshRaw)
      .digest("hex");
    const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_MS);

    await User.saveRefreshToken(user.id, refreshHash, expiresAt);

    // Strip password_hash before sending
    const { password_hash: _omit, ...safeUser } = user;
    return sendJSON(res, 200, {
      accessToken,
      refreshToken: refreshRaw,
      user: safeUser,
    });
  } catch (err) {
    console.error("[auth] login error:", err.message);
    return sendJSON(res, 500, { error: "Internal server error" });
  }
}

/**
 * POST /api/auth/refresh
 * Body: { refreshToken }
 */
async function refresh(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch {
    return sendJSON(res, 400, { error: "Invalid JSON body" });
  }

  const { refreshToken } = body;
  if (!refreshToken)
    return sendJSON(res, 422, { error: "refreshToken is required" });

  try {
    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");
    const row = await User.findRefreshToken(tokenHash);
    if (!row)
      return sendJSON(res, 401, { error: "Invalid or expired refresh token" });

    const user = await User.findById(row.user_id);
    if (!user) return sendJSON(res, 401, { error: "User not found" });

    // Rotate: delete old token, issue new pair
    await User.deleteRefreshToken(tokenHash);
    const accessToken = signAccess(user);
    const newRefreshRaw = generateRefreshToken();
    const newRefreshHash = crypto
      .createHash("sha256")
      .update(newRefreshRaw)
      .digest("hex");
    await User.saveRefreshToken(
      user.id,
      newRefreshHash,
      new Date(Date.now() + REFRESH_EXPIRES_MS),
    );

    return sendJSON(res, 200, { accessToken, refreshToken: newRefreshRaw });
  } catch (err) {
    console.error("[auth] refresh error:", err.message);
    return sendJSON(res, 500, { error: "Internal server error" });
  }
}

/**
 * POST /api/auth/logout  (requires auth middleware)
 * Body: { refreshToken }
 */
async function logout(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch {
    body = {};
  }

  if (body.refreshToken) {
    const tokenHash = crypto
      .createHash("sha256")
      .update(body.refreshToken)
      .digest("hex");
    await User.deleteRefreshToken(tokenHash).catch(() => {});
  }

  return sendJSON(res, 200, { message: "Logged out" });
}

module.exports = { register, login, refresh, logout };
