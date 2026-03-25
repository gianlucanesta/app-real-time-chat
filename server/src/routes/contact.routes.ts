import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import * as ctrl from "../controllers/contact.controller.js";

export const contactRouter = Router();

/**
 * @openapi
 * /api/contacts:
 *   get:
 *     tags: [Contacts]
 *     summary: List all contacts
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Array of contacts
 */
contactRouter.get("/", authMiddleware, ctrl.list);

/**
 * @openapi
 * /api/contacts:
 *   post:
 *     tags: [Contacts]
 *     summary: Create or upsert a contact
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateContactBody'
 *     responses:
 *       201:
 *         description: Contact created
 *       422:
 *         description: Validation error
 */
contactRouter.post("/", authMiddleware, ctrl.create);

/**
 * @openapi
 * /api/contacts/{id}:
 *   delete:
 *     tags: [Contacts]
 *     summary: Delete a contact
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
 *         description: Contact deleted
 *       404:
 *         description: Contact not found
 */
contactRouter.delete("/:id", authMiddleware, ctrl.remove);
