import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import * as ctrl from "../controllers/status.controller.js";

export const statusRouter = Router();

// My status
statusRouter.get("/me", authMiddleware, ctrl.getMyStatus);

// Feed (contacts' statuses)
statusRouter.get("/feed", authMiddleware, ctrl.getFeed);

// Add a status item
statusRouter.post("/", authMiddleware, ctrl.addItem);

// Mark item as viewed
statusRouter.patch("/:itemId/view", authMiddleware, ctrl.markViewed);

// Delete a status item
statusRouter.delete("/:itemId", authMiddleware, ctrl.deleteItem);

// Update privacy settings
statusRouter.patch("/privacy", authMiddleware, ctrl.updatePrivacy);
