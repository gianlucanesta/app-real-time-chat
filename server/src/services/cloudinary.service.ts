import { cloudinary } from "../config/cloudinary.js";

/**
 * Extract the Cloudinary public_id from a secure_url.
 * E.g. "https://res.cloudinary.com/xxx/image/upload/v1234/ephemeral-chat/abc123.jpg"
 *   → "ephemeral-chat/abc123"
 */
function extractPublicId(url: string): string | null {
  try {
    const match = url.match(
      /\/upload\/(?:v\d+\/)?(ephemeral-chat\/.+?)(?:\.\w+)?$/,
    );
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Determine the Cloudinary resource_type from our mediaType field.
 * Cloudinary stores audio under "video" resource_type.
 */
function getResourceType(mediaType: string): "image" | "video" {
  return mediaType === "image" ? "image" : "video";
}

/**
 * Delete a single media asset from Cloudinary given its URL and mediaType.
 * Logs warnings on failure but never throws.
 */
export async function deleteCloudinaryAsset(
  mediaUrl: string,
  mediaType: string,
): Promise<void> {
  const publicId = extractPublicId(mediaUrl);
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: getResourceType(mediaType),
    });
  } catch (err) {
    console.warn(
      `[cloudinary] failed to delete ${publicId}:`,
      (err as Error).message,
    );
  }
}

/**
 * Delete Cloudinary assets for an array of message documents.
 * Accepts lean documents with optional mediaUrl/mediaType fields.
 */
export async function deleteCloudinaryAssetsForMessages(
  messages: Array<{ mediaUrl?: string | null; mediaType?: string | null }>,
): Promise<void> {
  const tasks = messages
    .filter((m) => m.mediaUrl && m.mediaType)
    .map((m) => deleteCloudinaryAsset(m.mediaUrl!, m.mediaType!));

  if (tasks.length > 0) {
    await Promise.allSettled(tasks);
  }
}
