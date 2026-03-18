import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Socket } from "socket.io";
import type { SocketData } from "../interfaces/socket.interface.js";

/** JWT handshake middleware for Socket.io connections. */
export function authSocketHandler(
  socket: Socket<any, any, any, SocketData>,
  next: (err?: Error) => void,
): void {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Authentication error: token missing"));

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as SocketData["user"];
    socket.data.user = payload;
    next();
  } catch {
    next(new Error("Authentication error: invalid or expired token"));
  }
}
