import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import * as ctrl from "../controllers/user.controller.js";

export const userRouter = Router();

/**
 * @openapi
 * /api/users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get current user profile
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user object
 *       404:
 *         description: User not found
 */
userRouter.get("/me", authMiddleware, ctrl.me);

/**
 * @openapi
 * /api/users/me/settings:
 *   get:
 *     tags: [Users]
 *     summary: Get user settings
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User settings object
 */
userRouter.get("/me/settings", authMiddleware, ctrl.getSettings);

/**
 * @openapi
 * /api/users/me/settings:
 *   patch:
 *     tags: [Users]
 *     summary: Update user settings
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Partial settings object — only provided keys are updated
 *     responses:
 *       200:
 *         description: Updated settings
 *       422:
 *         description: Invalid body
 */
userRouter.patch("/me/settings", authMiddleware, ctrl.updateSettings);

/**
 * @openapi
 * /api/users/search:
 *   get:
 *     tags: [Users]
 *     summary: Search users by name or email
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query (min 2 chars)
 *     responses:
 *       200:
 *         description: List of matching users
 *       422:
 *         description: Query too short
 */
userRouter.get("/search", authMiddleware, ctrl.search);

/**
 * @openapi
 * /api/users/lookup-phone:
 *   get:
 *     tags: [Users]
 *     summary: Look up a user by phone number
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: phone
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User found (or { found: false })
 *       422:
 *         description: Invalid phone param
 */
userRouter.get("/lookup-phone", authMiddleware, ctrl.lookupPhone);

/**
 * @openapi
 * /api/users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Update user profile
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserBody'
 *     responses:
 *       200:
 *         description: Updated user object
 *       403:
 *         description: Cannot update another user
 *       404:
 *         description: User not found
 *       422:
 *         description: No updatable fields
 */
userRouter.patch("/:id", authMiddleware, ctrl.update);
