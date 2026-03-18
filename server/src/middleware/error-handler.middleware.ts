import type { ErrorRequestHandler } from "express";

/**
 * Centralized error handler.
 * Must be the LAST middleware registered on the Express app.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(`[error] ${err.message}`);
  const status = err.statusCode ?? 500;
  res.status(status).json({
    error: err.message || "Internal server error",
  });
};
