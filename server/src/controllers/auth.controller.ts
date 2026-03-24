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
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../services/email.service.js";
import { env } from "../config/env.js";
import crypto from "node:crypto";

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

    if (phone) {
      const existingPhone = await UserModel.findByPhone(phone);
      if (existingPhone) {
        res.status(409).json({ error: "Phone number already registered" });
        return;
      }
    }

    // Hash & create
    const passwordHash = await hashPassword(password);
    const user = await UserModel.create({
      email,
      passwordHash,
      displayName,
      phone,
    });

    // Generate verification token (raw → hash for DB)
    const verifyRaw = crypto.randomBytes(32).toString("hex");
    const verifyHash = crypto
      .createHash("sha256")
      .update(verifyRaw)
      .digest("hex");
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await UserModel.setVerificationToken(user.id, verifyHash, verifyExpires);

    // Send verification email (fire & forget — don't block registration)
    sendVerificationEmail(email, displayName, verifyRaw).catch((err) =>
      console.error("[email] Failed to send verification email:", err),
    );

    res.status(201).json({
      message:
        "Account created! Please check your email to verify your address.",
      requiresVerification: true,
    });
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

    // Check email verification
    if (!user.email_verified) {
      res.status(403).json({
        error: "Please verify your email before logging in.",
        emailNotVerified: true,
      });
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

// ── Email verification ──────────────────────────────────────────────────────

/** GET /api/auth/verify-email?token=... */
export async function verifyEmail(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { token } = req.query as { token?: string };

    if (!token || typeof token !== "string") {
      res.status(422).json({ error: "Verification token is required" });
      return;
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await UserModel.findByVerificationToken(tokenHash);
    if (!user) {
      res.status(400).json({ error: "Invalid or expired verification link" });
      return;
    }

    await UserModel.markEmailVerified(user.id);
    res
      .status(200)
      .json({ message: "Email verified successfully! You can now log in." });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/resend-verification */
export async function resendVerification(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email } = req.body as { email?: string };

    if (!email || typeof email !== "string") {
      res.status(422).json({ error: "Email is required" });
      return;
    }

    const user = await UserModel.findByEmail(email);

    // Always return success to prevent email enumeration
    if (!user || user.email_verified) {
      res.status(200).json({
        message:
          "If this email is registered and not yet verified, a new verification link has been sent.",
      });
      return;
    }

    const verifyRaw = crypto.randomBytes(32).toString("hex");
    const verifyHash = crypto
      .createHash("sha256")
      .update(verifyRaw)
      .digest("hex");
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await UserModel.setVerificationToken(user.id, verifyHash, verifyExpires);

    sendVerificationEmail(email, user.display_name, verifyRaw).catch((err) =>
      console.error("[email] Failed to resend verification email:", err),
    );

    res.status(200).json({
      message:
        "If this email is registered and not yet verified, a new verification link has been sent.",
    });
  } catch (err) {
    next(err);
  }
}

// ── Forgot / reset password ─────────────────────────────────────────────────

/** POST /api/auth/forgot-password */
export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email } = req.body as { email?: string };

    if (!email || typeof email !== "string") {
      res.status(422).json({ error: "Email is required" });
      return;
    }

    // Always return success to prevent email enumeration
    const user = await UserModel.findByEmail(email);
    if (user) {
      const resetRaw = crypto.randomBytes(32).toString("hex");
      const resetHash = crypto
        .createHash("sha256")
        .update(resetRaw)
        .digest("hex");
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await UserModel.setResetPasswordToken(user.id, resetHash, resetExpires);

      sendPasswordResetEmail(email, user.display_name, resetRaw).catch((err) =>
        console.error("[email] Failed to send password reset email:", err),
      );
    }

    res.status(200).json({
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/reset-password */
export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { token, password } = req.body as {
      token?: string;
      password?: string;
    };

    if (!token || typeof token !== "string") {
      res.status(422).json({ error: "Reset token is required" });
      return;
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      res.status(422).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await UserModel.findByResetToken(tokenHash);
    if (!user) {
      res.status(400).json({ error: "Invalid or expired reset link" });
      return;
    }

    const newHash = await hashPassword(password);
    await UserModel.updatePassword(user.id, newHash);

    res
      .status(200)
      .json({ message: "Password reset successfully! You can now log in." });
  } catch (err) {
    next(err);
  }
}

// ── Google OAuth2 ───────────────────────────────────────────────────────────

/**
 * GET /api/auth/google
 * Redirect the browser to Google's OAuth2 consent screen.
 */
export function googleAuth(_req: Request, res: Response): void {
  if (!env.GOOGLE_CLIENT_ID) {
    res.status(503).json({ error: "Google OAuth not configured" });
    return;
  }

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_CALLBACK_URL,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

/**
 * GET /api/auth/google/callback
 * Exchange the authorization code, upsert user, issue tokens.
 */
export async function googleCallback(
  req: Request,
  res: Response,
): Promise<void> {
  const { code, error: oauthError } = req.query as {
    code?: string;
    error?: string;
  };

  const failRedirect = `${env.CLIENT_URL}/login?error=google_failed`;

  if (oauthError || !code) {
    res.redirect(failRedirect);
    return;
  }

  try {
    // 1. Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_CALLBACK_URL,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("[google] token exchange failed:", await tokenRes.text());
      res.redirect(failRedirect);
      return;
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      id_token?: string;
    };

    // 2. Fetch user info from Google
    const userInfoRes = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      },
    );

    if (!userInfoRes.ok) {
      console.error("[google] userinfo failed:", await userInfoRes.text());
      res.redirect(failRedirect);
      return;
    }

    const profile = (await userInfoRes.json()) as {
      sub: string;
      email: string;
      name?: string;
      picture?: string;
    };

    if (!profile.sub || !profile.email) {
      res.redirect(failRedirect);
      return;
    }

    // 3. Upsert user in PostgreSQL
    const user = await UserModel.upsertGoogleUser({
      googleId: profile.sub,
      email: profile.email,
      displayName: profile.name || profile.email.split("@")[0],
      avatarUrl: profile.picture,
    });

    // 4. Issue access + refresh tokens
    const accessToken = signAccessToken(user);
    const refreshRaw = generateRefreshToken();
    const refreshHash = hashRefreshToken(refreshRaw);
    await UserModel.saveRefreshToken(
      user.id,
      refreshHash,
      new Date(Date.now() + env.REFRESH_EXPIRES_MS),
    );

    setRefreshCookie(res, refreshRaw);

    // 5. Redirect frontend to the OAuth callback route with accessToken
    res.redirect(
      `${env.CLIENT_URL}/oauth-callback?accessToken=${encodeURIComponent(accessToken)}`,
    );
  } catch (err) {
    console.error("[google] callback error:", (err as Error).message);
    res.redirect(failRedirect);
  }
}

// ── Facebook OAuth2 ─────────────────────────────────────────────────────────

/**
 * GET /api/auth/facebook
 * Redirect the browser to Facebook's OAuth2 dialog.
 */
export function facebookAuth(_req: Request, res: Response): void {
  if (!env.FACEBOOK_APP_ID) {
    res.status(503).json({ error: "Facebook OAuth not configured" });
    return;
  }

  const params = new URLSearchParams({
    client_id: env.FACEBOOK_APP_ID,
    redirect_uri: env.FACEBOOK_CALLBACK_URL,
    response_type: "code",
    scope: "public_profile,email",
  });

  res.redirect(`https://www.facebook.com/v22.0/dialog/oauth?${params}`);
}

/**
 * GET /api/auth/facebook/callback
 * Exchange the authorization code, upsert user, issue tokens.
 */
export async function facebookCallback(
  req: Request,
  res: Response,
): Promise<void> {
  const { code, error: oauthError } = req.query as {
    code?: string;
    error?: string;
  };

  const failRedirect = `${env.CLIENT_URL}/login?error=facebook_failed`;

  if (oauthError || !code) {
    res.redirect(failRedirect);
    return;
  }

  try {
    // 1. Exchange code for access token
    const tokenParams = new URLSearchParams({
      client_id: env.FACEBOOK_APP_ID,
      client_secret: env.FACEBOOK_APP_SECRET,
      redirect_uri: env.FACEBOOK_CALLBACK_URL,
      code,
    });

    const tokenRes = await fetch(
      `https://graph.facebook.com/v22.0/oauth/access_token?${tokenParams}`,
    );

    if (!tokenRes.ok) {
      console.error("[facebook] token exchange failed:", await tokenRes.text());
      res.redirect(failRedirect);
      return;
    }

    const tokenData = (await tokenRes.json()) as { access_token: string };

    // 2. Fetch user profile (id, name, email, picture)
    const userParams = new URLSearchParams({
      fields: "id,name,email,picture.type(large)",
      access_token: tokenData.access_token,
    });

    const userInfoRes = await fetch(
      `https://graph.facebook.com/v22.0/me?${userParams}`,
    );

    if (!userInfoRes.ok) {
      console.error("[facebook] userinfo failed:", await userInfoRes.text());
      res.redirect(failRedirect);
      return;
    }

    const profile = (await userInfoRes.json()) as {
      id: string;
      name?: string;
      email?: string;
      picture?: { data?: { url?: string } };
    };

    if (!profile.id) {
      res.redirect(failRedirect);
      return;
    }

    // Facebook may not return an email (phone-only accounts).
    // Fall back to a stable placeholder so the UNIQUE constraint is satisfied.
    const email = profile.email ?? `fb_${profile.id}@facebook.invalid`;

    // 3. Upsert user in PostgreSQL
    const user = await UserModel.upsertFacebookUser({
      facebookId: profile.id,
      email,
      displayName: profile.name || email.split("@")[0],
      avatarUrl: profile.picture?.data?.url,
    });

    // 4. Issue access + refresh tokens
    const accessToken = signAccessToken(user);
    const refreshRaw = generateRefreshToken();
    const refreshHash = hashRefreshToken(refreshRaw);
    await UserModel.saveRefreshToken(
      user.id,
      refreshHash,
      new Date(Date.now() + env.REFRESH_EXPIRES_MS),
    );

    setRefreshCookie(res, refreshRaw);

    // 5. Redirect frontend to the OAuth callback route with accessToken
    res.redirect(
      `${env.CLIENT_URL}/oauth-callback?accessToken=${encodeURIComponent(accessToken)}`,
    );
  } catch (err) {
    console.error("[facebook] callback error:", (err as Error).message);
    res.redirect(failRedirect);
  }
}
