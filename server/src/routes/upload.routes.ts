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

/**
 * @openapi
 * /api/upload:
 *   post:
 *     tags: [Upload]
 *     summary: Upload a file to Cloudinary
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: "Max 25 MB. Allowed: image, video, audio, document."
 *     responses:
 *       200:
 *         description: Upload result with URL and media metadata
 *       400:
 *         description: No file / file too large / unsupported type
 */
uploadRouter.post(
  "/",
  authMiddleware,
  uploadMiddleware.single("file"),
  ctrl.upload,
);

/**
 * @openapi
 * /api/upload:
 *   delete:
 *     tags: [Upload]
 *     summary: Delete a Cloudinary asset
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [publicId]
 *             properties:
 *               publicId:
 *                 type: string
 *               resourceType:
 *                 type: string
 *                 enum: [image, video, raw]
 *     responses:
 *       200:
 *         description: Asset deleted
 */
uploadRouter.delete("/", authMiddleware, ctrl.deleteUpload);

/**
 * @openapi
 * /api/upload/link-preview:
 *   get:
 *     tags: [Upload]
 *     summary: Generate a link preview (Open Graph)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *           format: uri
 *     responses:
 *       200:
 *         description: Link preview metadata
 */
uploadRouter.get("/link-preview", authMiddleware, ctrl.getLinkPreview);
