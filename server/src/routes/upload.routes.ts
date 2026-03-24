import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../middleware/auth.middleware.js";
import * as ctrl from "../controllers/upload.controller.js";

const storage = multer.memoryStorage();
const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

export const uploadRouter = Router();

uploadRouter.post(
  "/",
  authMiddleware,
  uploadMiddleware.single("file"),
  ctrl.upload,
);

uploadRouter.delete("/", authMiddleware, ctrl.deleteUpload);
uploadRouter.get("/link-preview", authMiddleware, ctrl.getLinkPreview);
