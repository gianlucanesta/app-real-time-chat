import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import * as ctrl from "../controllers/community.controller.js";

export const communityRouter = Router();

// ── Community CRUD ──

/**
 * @openapi
 * /api/communities:
 *   get:
 *     tags: [Communities]
 *     summary: List communities for current user
 *     description: Returns all communities the authenticated user belongs to.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of communities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 communities:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 */
communityRouter.get("/", authMiddleware, ctrl.list);

/**
 * @openapi
 * /api/communities:
 *   post:
 *     tags: [Communities]
 *     summary: Create a new community
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 2048
 *               iconUrl:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Community created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 community:
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
communityRouter.post("/", authMiddleware, ctrl.create);

/**
 * @openapi
 * /api/communities/{id}:
 *   get:
 *     tags: [Communities]
 *     summary: Get community by ID
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
 *         description: Community details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 community:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Community not found
 */
communityRouter.get("/:id", authMiddleware, ctrl.getById);

/**
 * @openapi
 * /api/communities/{id}:
 *   patch:
 *     tags: [Communities]
 *     summary: Update community info
 *     description: Only community admins can update.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *               iconUrl:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Community updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only admins can update community info
 *       404:
 *         description: Community not found
 *       422:
 *         description: Validation error
 */
communityRouter.patch("/:id", authMiddleware, ctrl.update);

/**
 * @openapi
 * /api/communities/{id}:
 *   delete:
 *     tags: [Communities]
 *     summary: Delete a community
 *     description: Only the community creator can delete it.
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
 *         description: Community deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Community not found or not owned by you
 */
communityRouter.delete("/:id", authMiddleware, ctrl.remove);

// ── Members ──

/**
 * @openapi
 * /api/communities/{id}/members:
 *   get:
 *     tags: [Communities]
 *     summary: List community members
 *     description: Only accessible to community members.
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
 *         description: List of members
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 members:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not a member of this community
 */
communityRouter.get("/:id/members", authMiddleware, ctrl.listMembers);

/**
 * @openapi
 * /api/communities/{id}/members:
 *   post:
 *     tags: [Communities]
 *     summary: Add a member to the community
 *     description: Only admins can add members. Max 2000 members per community.
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
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Member added
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only admins can add members
 *       409:
 *         description: User is already a member
 *       422:
 *         description: Community is full or invalid userId
 */
communityRouter.post("/:id/members", authMiddleware, ctrl.addMember);

/**
 * @openapi
 * /api/communities/{id}/members/{userId}:
 *   delete:
 *     tags: [Communities]
 *     summary: Remove a member from the community
 *     description: Admins can remove anyone; members can remove themselves.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only admins can remove members
 *       404:
 *         description: Member not found
 */
communityRouter.delete(
  "/:id/members/:userId",
  authMiddleware,
  ctrl.removeMember,
);

/**
 * @openapi
 * /api/communities/{id}/members/{userId}:
 *   patch:
 *     tags: [Communities]
 *     summary: Update a member's role
 *     description: Only admins can change roles.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, member]
 *     responses:
 *       200:
 *         description: Role updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only admins can change roles
 *       404:
 *         description: Member not found
 *       422:
 *         description: "role must be 'admin' or 'member'"
 */
communityRouter.patch(
  "/:id/members/:userId",
  authMiddleware,
  ctrl.updateMemberRole,
);

// ── Groups ──

/**
 * @openapi
 * /api/communities/{id}/groups:
 *   get:
 *     tags: [Communities]
 *     summary: List groups in a community
 *     description: Only accessible to community members.
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
 *         description: List of groups
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 groups:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not a member of this community
 */
communityRouter.get("/:id/groups", authMiddleware, ctrl.listGroups);

/**
 * @openapi
 * /api/communities/{id}/groups:
 *   post:
 *     tags: [Communities]
 *     summary: Create a group in a community
 *     description: Only admins can create groups.
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
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               iconUrl:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Group created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only admins can create groups
 *       422:
 *         description: Validation error
 */
communityRouter.post("/:id/groups", authMiddleware, ctrl.createGroup);

/**
 * @openapi
 * /api/communities/{id}/groups/{groupId}:
 *   delete:
 *     tags: [Communities]
 *     summary: Remove a group from a community
 *     description: Only admins can remove groups.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Group removed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only admins can remove groups
 *       404:
 *         description: Group not found
 */
communityRouter.delete(
  "/:id/groups/:groupId",
  authMiddleware,
  ctrl.removeGroup,
);

// ── Announcements ──

/**
 * @openapi
 * /api/communities/{id}/announcements:
 *   get:
 *     tags: [Communities]
 *     summary: List announcements
 *     description: Only accessible to community members. Supports pagination.
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
 *           maximum: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of announcements
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 announcements:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not a member of this community
 */
communityRouter.get(
  "/:id/announcements",
  authMiddleware,
  ctrl.listAnnouncements,
);

/**
 * @openapi
 * /api/communities/{id}/announcements:
 *   post:
 *     tags: [Communities]
 *     summary: Post an announcement
 *     description: Only admins can post announcements. Max 4096 characters.
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
 *                 maxLength: 4096
 *     responses:
 *       201:
 *         description: Announcement created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only admins can post announcements
 *       422:
 *         description: Validation error
 */
communityRouter.post(
  "/:id/announcements",
  authMiddleware,
  ctrl.createAnnouncement,
);

/**
 * @openapi
 * /api/communities/{id}/announcements/{announcementId}:
 *   delete:
 *     tags: [Communities]
 *     summary: Delete an announcement
 *     description: Only admins can delete announcements.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: announcementId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Announcement deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only admins can delete announcements
 *       404:
 *         description: Announcement not found
 */
communityRouter.delete(
  "/:id/announcements/:announcementId",
  authMiddleware,
  ctrl.removeAnnouncement,
);
