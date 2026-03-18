import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import * as ctrl from "../controllers/conversation.controller.js";

export const conversationRouter = Router();

conversationRouter.get("/", authMiddleware, ctrl.list);
