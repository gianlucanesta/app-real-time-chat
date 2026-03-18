import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export interface JwtPayload {
  sub: string;
  email: string;
  displayName: string;
}

// Extend Express Request to include user payload
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * JWT Bearer authentication middleware.
 * Reads `Authorization: Bearer <token>`, verifies signature,
 * and attaches decoded payload to `req.user`.
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const token = header.slice(7);

  try {
    req.user = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    next();
  } catch (err) {
    const message =
      (err as Error).name === "TokenExpiredError"
        ? "Token expired"
        : "Invalid token";
    res.status(401).json({ error: message });
  }
}
