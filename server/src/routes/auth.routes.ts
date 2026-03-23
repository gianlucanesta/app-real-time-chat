import { Router } from "express";
import { authLimiter } from "../middleware/rate-limiter.middleware.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import * as ctrl from "../controllers/auth.controller.js";

export const authRouter = Router();

authRouter.post("/register", authLimiter, ctrl.register);
authRouter.post("/login", authLimiter, ctrl.login);
authRouter.post("/refresh", authLimiter, ctrl.refresh);
authRouter.post("/logout", authMiddleware, ctrl.logout);
