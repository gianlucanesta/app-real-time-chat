import { Router } from "express";
import { authLimiter } from "../middleware/rate-limiter.middleware.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import * as ctrl from "../controllers/auth.controller.js";

export const authRouter = Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterBody'
 *     responses:
 *       201:
 *         description: Account created — verification email sent
 *       409:
 *         description: Email or phone already registered
 *       422:
 *         description: Validation error
 */
authRouter.post("/register", authLimiter, ctrl.register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Authenticate user
 *     description: Returns a JWT access token and sets an HttpOnly refresh-token cookie.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginBody'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Email not verified
 *       422:
 *         description: Validation error
 */
authRouter.post("/login", authLimiter, ctrl.login);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     description: Uses the HttpOnly refresh-token cookie (or body) to issue a new access token. Rotates the refresh token.
 *     responses:
 *       200:
 *         description: New access token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *       401:
 *         description: Invalid or expired refresh token
 *       422:
 *         description: Refresh token missing
 */
authRouter.post("/refresh", authLimiter, ctrl.refresh);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
authRouter.post("/logout", authMiddleware, ctrl.logout);

/**
 * @openapi
 * /api/auth/verify-email:
 *   get:
 *     tags: [Auth]
 *     summary: Verify email address
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email verified
 *       400:
 *         description: Invalid or expired token
 *       422:
 *         description: Token missing
 */
authRouter.get("/verify-email", ctrl.verifyEmail);

/**
 * @openapi
 * /api/auth/resend-verification:
 *   post:
 *     tags: [Auth]
 *     summary: Resend verification email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Verification email resent (always 200 to prevent enumeration)
 */
authRouter.post("/resend-verification", authLimiter, ctrl.resendVerification);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Reset email sent (always 200 to prevent enumeration)
 */
authRouter.post("/forgot-password", authLimiter, ctrl.forgotPassword);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password with token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
authRouter.post("/reset-password", authLimiter, ctrl.resetPassword);

/**
 * @openapi
 * /api/auth/google:
 *   get:
 *     tags: [Auth]
 *     summary: Start Google OAuth2 flow
 *     description: Redirects the user to Google's consent screen.
 *     responses:
 *       302:
 *         description: Redirect to Google
 */
authRouter.get("/google", ctrl.googleAuth);

/**
 * @openapi
 * /api/auth/google/callback:
 *   get:
 *     tags: [Auth]
 *     summary: Google OAuth2 callback
 *     description: Handles the redirect from Google after authentication.
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirect to client with auth tokens
 */
authRouter.get("/google/callback", ctrl.googleCallback);

/**
 * @openapi
 * /api/auth/facebook:
 *   get:
 *     tags: [Auth]
 *     summary: Start Facebook OAuth2 flow
 *     description: Redirects the user to Facebook's consent screen.
 *     responses:
 *       302:
 *         description: Redirect to Facebook
 */
authRouter.get("/facebook", ctrl.facebookAuth);

/**
 * @openapi
 * /api/auth/facebook/callback:
 *   get:
 *     tags: [Auth]
 *     summary: Facebook OAuth2 callback
 *     description: Handles the redirect from Facebook after authentication.
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirect to client with auth tokens
 */
authRouter.get("/facebook/callback", ctrl.facebookCallback);
