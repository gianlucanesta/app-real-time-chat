import type { Request, Response, NextFunction } from "express";
import type {
  RegisterBody,
  LoginBody,
  LogoutBody,
} from "../interfaces/api.interface.js";
import * as UserModel from "../models/user.model.js";
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "../services/token.service.js";
import { hashPassword, comparePassword } from "../services/password.service.js";
import { env } from "../config/env.js";

/**
 * Helper: set the refresh token as an HttpOnly Secure cookie.
 * The cookie is inaccessible from JavaScript, preventing XSS token theft.
 */
function setRefreshCookie(res: Response, token: string): void {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: env.REFRESH_EXPIRES_MS,
    path: "/",
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });
}

/** POST /api/auth/register */
export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      email,
      password,
      displayName,
      phone = "",
    } = req.body as RegisterBody;

    // Input validation
    if (!email || !password || !displayName) {
      res
        .status(422)
        .json({ error: "email, password and displayName are required" });
      return;
    }
    if (
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      res.status(422).json({ error: "Invalid email format" });
      return;
    }
    if (typeof password !== "string" || password.length < 8) {
      res.status(422).json({ error: "Password must be at least 8 characters" });
      return;
    }

    // Check uniqueness
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    // Hash & create
    const passwordHash = await hashPassword(password);
    const user = await UserModel.create({
      email,
      passwordHash,
      displayName,
      phone,
    });

    // Issue tokens
    const accessToken = signAccessToken(user);
    const refreshRaw = generateRefreshToken();
    const refreshHash = hashRefreshToken(refreshRaw);
    const expiresAt = new Date(Date.now() + env.REFRESH_EXPIRES_MS);

    await UserModel.saveRefreshToken(user.id, refreshHash, expiresAt);

    setRefreshCookie(res, refreshRaw);
    res.status(201).json({ accessToken, user });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/login */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password } = req.body as LoginBody;

    if (!email || !password) {
      res.status(422).json({ error: "email and password are required" });
      return;
    }

    const user = await UserModel.findByEmail(email);
    // Constant-time comparison: run bcrypt even when user is not found
    const hash =
      user?.password_hash ||
      "$2a$12$invalidhashfortimingprotection00000000000000000000000000";
    const match = await comparePassword(password, hash);

    if (!user || !match) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const accessToken = signAccessToken(user);
    const refreshRaw = generateRefreshToken();
    const refreshHash = hashRefreshToken(refreshRaw);
    const expiresAt = new Date(Date.now() + env.REFRESH_EXPIRES_MS);

    await UserModel.saveRefreshToken(user.id, refreshHash, expiresAt);

    // Strip password_hash before sending
    const { password_hash: _omit, ...safeUser } = user;
    setRefreshCookie(res, refreshRaw);
    res.status(200).json({ accessToken, user: safeUser });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/refresh */
export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Accept from HttpOnly cookie (preferred) or body (backwards compat)
    const refreshToken: string | undefined =
      req.cookies?.refreshToken ||
      (req.body as { refreshToken?: string })?.refreshToken;

    if (!refreshToken) {
      res.status(422).json({ error: "refreshToken is required" });
      return;
    }

    const tokenHash = hashRefreshToken(refreshToken);
    const row = await UserModel.findRefreshToken(tokenHash);
    if (!row) {
      res.status(401).json({ error: "Invalid or expired refresh token" });
      return;
    }

    const user = await UserModel.findById(row.user_id);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    // Rotate: delete old token, issue new pair
    await UserModel.deleteRefreshToken(tokenHash);
    const accessToken = signAccessToken(user);
    const newRefreshRaw = generateRefreshToken();
    const newRefreshHash = hashRefreshToken(newRefreshRaw);
    await UserModel.saveRefreshToken(
      user.id,
      newRefreshHash,
      new Date(Date.now() + env.REFRESH_EXPIRES_MS),
    );

    setRefreshCookie(res, newRefreshRaw);
    res.status(200).json({ accessToken });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/logout (requires auth middleware) */
export async function logout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Accept from cookie (preferred) or body (backwards compat)
    const refreshToken: string | undefined =
      req.cookies?.refreshToken || (req.body as LogoutBody)?.refreshToken;

    if (refreshToken) {
      const tokenHash = hashRefreshToken(refreshToken);
      await UserModel.deleteRefreshToken(tokenHash).catch(() => {});
    }

    clearRefreshCookie(res);
    res.status(200).json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
}
