import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import * as ctrl from "../controllers/message.controller.js";

export const messageRouter = Router();

/**
 * @openapi
 * /api/messages/{conversationId}:
 *   get:
 *     tags: [Messages]
 *     summary: List messages in a conversation
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Array of messages (max 200, sorted by createdAt)
 *       400:
 *         description: Missing conversationId
 */
messageRouter.get("/:conversationId", authMiddleware, ctrl.list);

/**
 * @openapi
 * /api/messages:
 *   post:
 *     tags: [Messages]
 *     summary: Send a new message
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMessageBody'
 *     responses:
 *       201:
 *         description: Message created
 *       422:
 *         description: Validation error
 */
messageRouter.post("/", authMiddleware, ctrl.create);

/**
 * @openapi
 * /api/messages:
 *   delete:
 *     tags: [Messages]
 *     summary: Delete specific messages by IDs
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeleteMessagesBody'
 *     responses:
 *       200:
 *         description: Messages deleted
 *       422:
 *         description: Validation error
 */
messageRouter.delete("/", authMiddleware, ctrl.deleteMessages);
messageRouter.patch("/mark-all-read", authMiddleware, ctrl.markAllAsRead);
messageRouter.patch("/mark-unread", authMiddleware, ctrl.markAsUnread);

/**
 * @openapi
 * /api/messages/{conversationId}:
 *   delete:
 *     tags: [Messages]
 *     summary: Clear all messages in a conversation
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation cleared
 */
messageRouter.delete(
  "/:conversationId",
  authMiddleware,
  ctrl.clearConversation,
);
