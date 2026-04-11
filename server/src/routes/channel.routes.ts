import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import * as ctrl from "../controllers/channel.controller.js";

export const channelRouter = Router();

/**
 * @openapi
 * /api/channels:
 *   get:
 *     tags: [Channels]
 *     summary: List all channels
 *     description: Returns all public channels and channels the current user follows. Supports optional search filter.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Filter channels by name (case-insensitive substring match)
 *     responses:
 *       200:
 *         description: List of channels
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 channels:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       avatarUrl:
 *                         type: string
 *                         nullable: true
 *                       privacy:
 *                         type: string
 *                         enum: [public, private]
 *                       followerCount:
 *                         type: integer
 *                       isFollowing:
 *                         type: boolean
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
channelRouter.get("/", authMiddleware, ctrl.list);

/**
 * @openapi
 * /api/channels:
 *   post:
 *     tags: [Channels]
 *     summary: Create a new channel
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, description]
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *               avatarUrl:
 *                 type: string
 *                 nullable: true
 *               privacy:
 *                 type: string
 *                 enum: [public, private]
 *                 default: public
 *     responses:
 *       201:
 *         description: Channel created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 channel:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
channelRouter.post("/", authMiddleware, ctrl.create);

/**
 * @openapi
 * /api/channels/{id}:
 *   get:
 *     tags: [Channels]
 *     summary: Get channel by ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Channel details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 channel:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Channel not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
channelRouter.get("/:id", authMiddleware, ctrl.getById);

/**
 * @openapi
 * /api/channels/{id}/follow:
 *   post:
 *     tags: [Channels]
 *     summary: Follow a channel
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully followed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 followed:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Channel not found
 */
channelRouter.post("/:id/follow", authMiddleware, ctrl.follow);

/**
 * @openapi
 * /api/channels/{id}/follow:
 *   delete:
 *     tags: [Channels]
 *     summary: Unfollow a channel
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully unfollowed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 unfollowed:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 */
channelRouter.delete("/:id/follow", authMiddleware, ctrl.unfollowChannel);

/**
 * @openapi
 * /api/channels/{id}:
 *   delete:
 *     tags: [Channels]
 *     summary: Delete a channel
 *     description: Only the channel owner can delete it.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Channel deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deleted:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Channel not found or not owned by you
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
channelRouter.delete("/:id", authMiddleware, ctrl.remove);

// ── Channel Messages ─────────────────────────────────────────────

/**
 * @openapi
 * /api/channels/{id}/messages:
 *   get:
 *     tags: [Channels]
 *     summary: List channel messages
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *         description: Message ID to paginate before
 *     responses:
 *       200:
 *         description: List of channel messages
 */
channelRouter.get("/:id/messages", authMiddleware, ctrl.listMessages);

/**
 * @openapi
 * /api/channels/{id}/messages:
 *   post:
 *     tags: [Channels]
 *     summary: Post a message to a channel (owner only)
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
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *               mediaUrl:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Message created
 *       403:
 *         description: Only the channel owner can post
 *       422:
 *         description: Validation error
 */
channelRouter.post("/:id/messages", authMiddleware, ctrl.createMessage);
