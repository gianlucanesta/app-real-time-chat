import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import * as ctrl from "../controllers/channel.controller.js";

export const channelRouter = Router();

channelRouter.get("/", authMiddleware, ctrl.list);
channelRouter.post("/", authMiddleware, ctrl.create);
channelRouter.get("/:id", authMiddleware, ctrl.getById);
channelRouter.post("/:id/follow", authMiddleware, ctrl.follow);
channelRouter.delete("/:id/follow", authMiddleware, ctrl.unfollowChannel);
channelRouter.delete("/:id", authMiddleware, ctrl.remove);
