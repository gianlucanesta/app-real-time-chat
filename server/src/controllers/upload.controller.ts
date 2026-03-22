import type { Request, Response, NextFunction } from "express";
import { cloudinary } from "../config/cloudinary.js";

const ALLOWED_TYPES: Record<string, string[]> = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
  audio: ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"],
};

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

/** POST /api/upload — upload a file to Cloudinary */
export async function upload(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      res.status(400).json({ error: "File too large (max 25 MB)" });
      return;
    }

    // Determine resource type
    let resourceType: "image" | "video" | "raw" = "raw";
    let mediaType: "image" | "video" | "audio" = "audio";

    if (ALLOWED_TYPES.image.includes(file.mimetype)) {
      resourceType = "image";
      mediaType = "image";
    } else if (ALLOWED_TYPES.video.includes(file.mimetype)) {
      resourceType = "video";
      mediaType = "video";
    } else if (ALLOWED_TYPES.audio.includes(file.mimetype)) {
      // Cloudinary treats audio as "video" resource type
      resourceType = "video";
      mediaType = "audio";
    } else {
      res.status(400).json({ error: "Unsupported file type" });
      return;
    }

    const result = await new Promise<{ secure_url: string; duration?: number }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: resourceType,
            folder: "ephemeral-chat",
          },
          (error, result) => {
            if (error) reject(error);
            else
              resolve({
                secure_url: result!.secure_url,
                duration: result!.duration,
              });
          },
        );
        stream.end(file.buffer);
      },
    );

    res.status(200).json({
      url: result.secure_url,
      mediaType,
      duration: result.duration || null,
    });
  } catch (err) {
    next(err);
  }
}
