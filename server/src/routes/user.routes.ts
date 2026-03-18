import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import * as ctrl from "../controllers/user.controller.js";

export const userRouter = Router();

userRouter.get("/me", authMiddleware, ctrl.me);
userRouter.get("/search", authMiddleware, ctrl.search);
userRouter.get("/lookup-phone", authMiddleware, ctrl.lookupPhone);
userRouter.patch("/:id", authMiddleware, ctrl.update);
