import type { Request, Response, NextFunction } from "express";
import { cloudinary } from "../config/cloudinary.js";
import { deleteCloudinaryAsset } from "../services/cloudinary.service.js";

const ALLOWED_TYPES: Record<string, string[]> = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  video: ["video/mp4", "video/webm", "video/quicktime"],
  audio: ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    "application/zip",
    "application/x-rar-compressed",
    "application/x-zip-compressed",
  ],
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
    let mediaType: "image" | "video" | "audio" | "document" = "document";

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
    } else if (ALLOWED_TYPES.document.includes(file.mimetype)) {
      // Documents uploaded as raw assets on Cloudinary
      resourceType = "raw";
      mediaType = "document";
    } else {
      res.status(400).json({ error: "Unsupported file type" });
      return;
    }

    // Sanitise original filename to make it safe for Cloudinary
    const originalName = file.originalname;
    const safeBaseName =
      originalName
        .replace(/\.[^.]+$/, "") // strip extension
        .replace(/[^a-zA-Z0-9_\-]/g, "_") // replace unsafe chars
        .slice(0, 80) || "file";

    const result = await new Promise<{
      secure_url: string;
      duration?: number;
      original_filename?: string;
      public_id?: string;
    }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder: "ephemeral-chat",
          use_filename: true,
          unique_filename: true,
          public_id: safeBaseName,
        },
        (error, result) => {
          if (error) reject(error);
          else
            resolve({
              secure_url: result!.secure_url,
              duration: result!.duration,
              original_filename: result!.original_filename,
            });
        },
      );
      stream.end(file.buffer);
    });

    res.status(200).json({
      url: result.secure_url,
      mediaType,
      duration: result.duration || null,
      fileName: originalName,
    });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/upload — delete a Cloudinary asset by URL */
export async function deleteUpload(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { url } = req.body as { url?: string };
    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "url is required" });
      return;
    }

    await deleteCloudinaryAsset(url, "image");
    res.status(200).json({ deleted: true });
  } catch (err) {
    next(err);
  }
}

// ── Private IP SSRF guard ──────────────────────────────────────────────────
const PRIVATE_IP_RE =
  /^(localhost|127\.|0\.0\.0\.0|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|::1|fc[0-9a-f]{2}:|fd[0-9a-f]{2}:)/i;

function isPrivateHost(hostname: string): boolean {
  return PRIVATE_IP_RE.test(hostname);
}

function extractMeta(html: string, property: string): string | null {
  // Try og:<property> content attr (either order)
  let m =
    html.match(
      new RegExp(
        `<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`,
        "i",
      ),
    ) ||
    html.match(
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${property}["']`,
        "i",
      ),
    );
  if (m) return m[1];
  // Fallback to twitter:<property>
  m =
    html.match(
      new RegExp(
        `<meta[^>]+name=["']twitter:${property}["'][^>]+content=["']([^"']+)["']`,
        "i",
      ),
    ) ||
    html.match(
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:${property}["']`,
        "i",
      ),
    );
  return m ? m[1] : null;
}

/** GET /api/link-preview?url=... — fetch OG metadata for a URL */
export async function getLinkPreview(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rawUrl = req.query.url;
    if (!rawUrl || typeof rawUrl !== "string") {
      res.status(400).json({ error: "url is required" });
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      res.status(400).json({ error: "Invalid URL" });
      return;
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      res.status(400).json({ error: "Invalid URL" });
      return;
    }

    if (isPrivateHost(parsed.hostname)) {
      res.status(400).json({ error: "Invalid URL" });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let html: string;
    try {
      const response = await fetch(parsed.href, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; EphemeralChat/1.0; +https://github.com)",
          Accept: "text/html",
        },
        redirect: "follow",
      });
      clearTimeout(timeout);
      if (!response.ok) {
        res.status(200).json({
          url: parsed.href,
          title: null,
          description: null,
          image: null,
          siteName: null,
        });
        return;
      }
      const ct = response.headers.get("content-type") || "";
      if (!ct.includes("text/html")) {
        res.status(200).json({
          url: parsed.href,
          title: null,
          description: null,
          image: null,
          siteName: null,
        });
        return;
      }
      // Read only first 100 KB to stay fast
      const reader = response.body?.getReader();
      if (!reader) {
        res.status(200).json({
          url: parsed.href,
          title: null,
          description: null,
          image: null,
          siteName: null,
        });
        return;
      }
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      while (bytes < 100_000) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        chunks.push(value);
        bytes += value.length;
      }
      reader.cancel();
      html = new TextDecoder().decode(
        chunks.reduce((acc, c) => {
          const merged = new Uint8Array(acc.length + c.length);
          merged.set(acc);
          merged.set(c, acc.length);
          return merged;
        }, new Uint8Array()),
      );
    } catch {
      clearTimeout(timeout);
      res.status(200).json({
        url: parsed.href,
        title: null,
        description: null,
        image: null,
        siteName: null,
      });
      return;
    }

    const title =
      extractMeta(html, "title") ||
      html.match(/<title[^>]*>([^<]{1,200})<\/title>/i)?.[1]?.trim() ||
      null;
    const description = extractMeta(html, "description") || null;
    let image = extractMeta(html, "image") || null;
    const siteName = extractMeta(html, "site_name") || parsed.hostname;

    // Resolve relative image URLs
    if (image && !image.startsWith("http")) {
      try {
        image = new URL(image, parsed.href).href;
      } catch {
        image = null;
      }
    }

    res.status(200).json({
      url: parsed.href,
      title,
      description,
      image,
      siteName,
    });
  } catch (err) {
    next(err);
  }
}
