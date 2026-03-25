import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import * as ctrl from "../controllers/conversation.controller.js";

export const conversationRouter = Router();

/**
 * @openapi
 * /api/conversations:
 *   get:
 *     tags: [Conversations]
 *     summary: List all conversations for the current user
 *     description: Returns conversations with partner profile info and latest message snippet.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Array of conversation objects
 */
conversationRouter.get("/", authMiddleware, ctrl.list);
