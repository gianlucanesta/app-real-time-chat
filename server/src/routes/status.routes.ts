import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import * as ctrl from "../controllers/status.controller.js";

export const statusRouter = Router();

/**
 * @openapi
 * /api/status/me:
 *   get:
 *     tags: [Status]
 *     summary: Get my own status
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Status object or null
 */
statusRouter.get("/me", authMiddleware, ctrl.getMyStatus);

/**
 * @openapi
 * /api/status/feed:
 *   get:
 *     tags: [Status]
 *     summary: Get status feed (contacts' statuses)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Array of statuses from other users
 */
statusRouter.get("/feed", authMiddleware, ctrl.getFeed);

/**
 * @openapi
 * /api/status:
 *   post:
 *     tags: [Status]
 *     summary: Add a status item
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StatusItemBody'
 *     responses:
 *       201:
 *         description: Status created / updated
 *       422:
 *         description: Validation error
 */
statusRouter.post("/", authMiddleware, ctrl.addItem);

/**
 * @openapi
 * /api/status/{itemId}/view:
 *   patch:
 *     tags: [Status]
 *     summary: Mark a status item as viewed
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Marked as viewed
 */
statusRouter.patch("/:itemId/view", authMiddleware, ctrl.markViewed);

/**
 * @openapi
 * /api/status/{itemId}:
 *   delete:
 *     tags: [Status]
 *     summary: Delete a status item
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item deleted
 *       404:
 *         description: Item not found
 */
statusRouter.delete("/:itemId", authMiddleware, ctrl.deleteItem);

/**
 * @openapi
 * /api/status/privacy:
 *   patch:
 *     tags: [Status]
 *     summary: Update status privacy settings
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               visibility:
 *                 type: string
 *                 enum: [everyone, contacts, nobody]
 *     responses:
 *       200:
 *         description: Privacy settings updated
 */
statusRouter.patch("/privacy", authMiddleware, ctrl.updatePrivacy);
