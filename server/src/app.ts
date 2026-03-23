import express from "express";
import cors, { type CorsOptions } from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { globalLimiter } from "./middleware/rate-limiter.middleware.js";
import { errorHandler } from "./middleware/error-handler.middleware.js";
import { healthRouter } from "./routes/health.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { userRouter } from "./routes/user.routes.js";
import { contactRouter } from "./routes/contact.routes.js";
import { messageRouter } from "./routes/message.routes.js";
import { conversationRouter } from "./routes/conversation.routes.js";
import { uploadRouter } from "./routes/upload.routes.js";

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
  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/users", userRouter);
  app.use("/api/contacts", contactRouter);
  app.use("/api/messages", messageRouter);
  app.use("/api/conversations", conversationRouter);
  app.use("/api/upload", uploadRouter);

  // ── Error handler (must be last) ───────────────────────────────────────────
  app.use(errorHandler);

  return app;
}
