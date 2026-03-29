import { Router, type Request, type Response } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { env } from "../config/env.js";

export const turnRouter = Router();

/**
 * @openapi
 * /api/turn/credentials:
 *   get:
 *     tags: [WebRTC]
 *     summary: Get ICE server configuration for WebRTC calls
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ICE servers array
 */
turnRouter.get(
  "/credentials",
  authMiddleware,
  (_req: Request, res: Response) => {
    const iceServers: RTCIceServer[] = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ];

    // Append TURN servers if configured
    if (env.TURN_URLS && env.TURN_USERNAME && env.TURN_CREDENTIAL) {
      const turnUrls = env.TURN_URLS.split(",").map((u) => u.trim());
      for (const url of turnUrls) {
        iceServers.push({
          urls: url,
          username: env.TURN_USERNAME,
          credential: env.TURN_CREDENTIAL,
        });
      }
    }

    res.json({ iceServers });
  },
);
