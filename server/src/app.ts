import express from "express";
import cors, { type CorsOptions } from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { swaggerSpec } from "./config/swagger.js";
import { globalLimiter } from "./middleware/rate-limiter.middleware.js";
import { errorHandler } from "./middleware/error-handler.middleware.js";
import { healthRouter } from "./routes/health.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { userRouter } from "./routes/user.routes.js";
import { contactRouter } from "./routes/contact.routes.js";
import { channelRouter } from "./routes/channel.routes.js";
import { messageRouter } from "./routes/message.routes.js";
import { conversationRouter } from "./routes/conversation.routes.js";
import { uploadRouter } from "./routes/upload.routes.js";
import { statusRouter } from "./routes/status.routes.js";
import { communityRouter } from "./routes/community.routes.js";
import { turnRouter } from "./routes/turn.routes.js";

/**
 * Express app factory.
 * Creates and configures the Express application with all middleware and routes.
 * Exported for both the main server and Supertest-based integration tests.
 */
export function createApp(): express.Express {
  const app = express();

  // ── Global middleware ──────────────────────────────────────────────────────

  // CORS must come before helmet so preflight responses aren't blocked by
  // Cross-Origin-Resource-Policy: same-origin (helmet default).
  const corsOptions: CorsOptions = {
    origin:
      env.ALLOWED_ORIGINS.length === 1 && env.ALLOWED_ORIGINS[0] === "*"
        ? true // reflect origin (needed for credentials)
        : env.ALLOWED_ORIGINS,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // required for cookies
  };

  // Explicit preflight handler — catches OPTIONS before any other middleware.
  app.options("*", cors(corsOptions));
  app.use(cors(corsOptions));

  app.use(
    helmet({
      // Allow cross-origin resource reads so our API responses are not blocked.
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(globalLimiter);

  // ── Routes ─────────────────────────────────────────────────────────────────

  // Swagger UI needs 'unsafe-inline' for its bundled scripts/styles — override
  // helmet's default CSP only for this route (headers can be changed until
  // res.end() is called, so this overwrite runs before anything is flushed).
  app.use(
    "/api/docs",
    (
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;",
      );
      next();
    },
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: "Ephemeral Chat API Docs",
    }),
  );
  app.get("/api/docs.json", (_req, res) => res.json(swaggerSpec));
  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/users", userRouter);
  app.use("/api/contacts", contactRouter);
  app.use("/api/channels", channelRouter);
  app.use("/api/messages", messageRouter);
  app.use("/api/conversations", conversationRouter);
  app.use("/api/upload", uploadRouter);
  app.use("/api/status", statusRouter);
  app.use("/api/communities", communityRouter);
  app.use("/api/turn", turnRouter);

  // ── Error handler (must be last) ───────────────────────────────────────────
  app.use(errorHandler);

  return app;
}
