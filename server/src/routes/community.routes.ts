import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import * as ctrl from "../controllers/community.controller.js";

export const communityRouter = Router();

// ── Community CRUD ──
communityRouter.get("/", authMiddleware, ctrl.list);
communityRouter.post("/", authMiddleware, ctrl.create);
communityRouter.get("/:id", authMiddleware, ctrl.getById);
communityRouter.patch("/:id", authMiddleware, ctrl.update);
communityRouter.delete("/:id", authMiddleware, ctrl.remove);

// ── Members ──
communityRouter.get("/:id/members", authMiddleware, ctrl.listMembers);
communityRouter.post("/:id/members", authMiddleware, ctrl.addMember);
communityRouter.delete(
  "/:id/members/:userId",
  authMiddleware,
  ctrl.removeMember,
);
communityRouter.patch(
  "/:id/members/:userId",
  authMiddleware,
  ctrl.updateMemberRole,
);

// ── Groups ──
communityRouter.get("/:id/groups", authMiddleware, ctrl.listGroups);
communityRouter.post("/:id/groups", authMiddleware, ctrl.createGroup);
communityRouter.delete(
  "/:id/groups/:groupId",
  authMiddleware,
  ctrl.removeGroup,
);

// ── Announcements ──
communityRouter.get(
  "/:id/announcements",
  authMiddleware,
  ctrl.listAnnouncements,
);
communityRouter.post(
  "/:id/announcements",
  authMiddleware,
  ctrl.createAnnouncement,
);
communityRouter.delete(
  "/:id/announcements/:announcementId",
  authMiddleware,
  ctrl.removeAnnouncement,
);
