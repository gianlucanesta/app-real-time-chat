import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import * as ctrl from "../controllers/contact.controller.js";

export const contactRouter = Router();

contactRouter.get("/", authMiddleware, ctrl.list);
contactRouter.post("/", authMiddleware, ctrl.create);
contactRouter.delete("/:id", authMiddleware, ctrl.remove);
