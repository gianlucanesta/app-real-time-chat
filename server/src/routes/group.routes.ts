import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import * as ctrl from "../controllers/group.controller.js";

export const groupRouter = Router();

groupRouter.get("/", authMiddleware, ctrl.list);
groupRouter.post("/", authMiddleware, ctrl.create);
