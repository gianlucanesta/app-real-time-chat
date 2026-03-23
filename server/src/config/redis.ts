import IORedis from "ioredis";
import type { Server } from "socket.io";
import type { Model, Document } from "mongoose";
import { env } from "./env.js";
import { deleteCloudinaryAsset } from "../services/cloudinary.service.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RedisClass = (IORedis as any).default ?? IORedis;

// Publisher client (used for SET / GET / DEL)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const redis: any = new RedisClass(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
  retryStrategy: (times: number) => {
    if (times > 3) return null; // Stop retrying after 3 attempts
    return Math.min(times * 100, 3_000);
  },
});

// Subscriber client (dedicated – cannot share with publisher for SUBSCRIBE)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sub: any = new RedisClass(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
  retryStrategy: (times: number) => {
    if (times > 3) return null; // Stop retrying after 3 attempts
    return Math.min(times * 100, 3_000);
  },
});

redis.on("connect", () => console.log("[redis] publisher connected"));
redis.on("error", (e: Error) =>
  console.error("[redis] publisher error:", e.message),
);
sub.on("connect", () => console.log("[redis] subscriber connected"));
sub.on("error", (e: Error) =>
  console.error("[redis] subscriber error:", e.message),
);

/**
 * Enable keyspace notifications for key-expiry events and subscribe.
 * When a message's Redis key expires, the corresponding MongoDB document
 * is deleted and a `message:expired` event is emitted via Socket.io.
 */
export async function initKeyspaceExpiry(
  io: Server,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MessageModel: Model<any>,
): Promise<void> {
  try {
    await redis.config("SET", "notify-keyspace-events", "KEx");
  } catch (err) {
    console.warn(
      "[redis] CONFIG SET not permitted (managed Redis?):",
      (err as Error).message,
    );
  }

  await sub.subscribe("__keyevent@0__:expired");

  sub.on("message", async (_channel: string, key: string) => {
    if (!key.startsWith("msg:")) return;

    const msgId = key.slice(4);
    try {
      const msg = await MessageModel.findByIdAndDelete(msgId).lean();
      if (msg && "conversationId" in msg) {
        const convId = (msg as Record<string, unknown>)
          .conversationId as string;
        io.to("conv:" + convId).emit("message:expired", { id: msgId });
        console.log(`[ttl] removed message ${msgId} from conv ${convId}`);

        // Clean up Cloudinary media if present
        const mediaUrl = (msg as Record<string, unknown>).mediaUrl as
          | string
          | undefined;
        const mediaType = (msg as Record<string, unknown>).mediaType as
          | string
          | undefined;
        if (mediaUrl && mediaType) {
          deleteCloudinaryAsset(mediaUrl, mediaType).catch(() => {});
        }
      }
    } catch (err) {
      console.error(
        "[ttl] error removing expired message:",
        (err as Error).message,
      );
    }
  });

  console.log("[redis] keyspace expiry listener active");
}
