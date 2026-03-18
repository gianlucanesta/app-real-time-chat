import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import * as ctrl from "../controllers/message.controller.js";

export const messageRouter = Router();

messageRouter.get("/:conversationId", authMiddleware, ctrl.list);
messageRouter.post("/", authMiddleware, ctrl.create);
messageRouter.delete("/", authMiddleware, ctrl.deleteMessages);
messageRouter.delete("/:conversationId", authMiddleware, ctrl.clearConversation);
