import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import * as ctrl from "../controllers/group.controller.js";

export const groupRouter = Router();

groupRouter.get("/", authMiddleware, ctrl.list);
groupRouter.post("/", authMiddleware, ctrl.create);
groupRouter.get("/:id", authMiddleware, ctrl.getById);
groupRouter.patch("/:id", authMiddleware, ctrl.update);
groupRouter.delete("/:id", authMiddleware, ctrl.deleteGroup);
groupRouter.post("/:id/members", authMiddleware, ctrl.addMembers);
groupRouter.delete("/:id/members/:userId", authMiddleware, ctrl.removeMember);
groupRouter.patch(
  "/:id/members/:userId/role",
  authMiddleware,
  ctrl.updateMemberRole,
);
