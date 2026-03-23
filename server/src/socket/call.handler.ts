import type { Socket } from "socket.io";
import type { TypedServer } from "./index.js";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../interfaces/socket.interface.js";

type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

/** Register WebRTC call-signaling event handlers on a socket. */
export function registerCallHandlers(
  io: TypedServer,
  socket: TypedSocket,
): void {
  const userId = socket.data.user.sub;
  const displayName = socket.data.user.displayName;

  // ── Relay offer to callee ──
  socket.on("call:offer", ({ to, withVideo, offer }) => {
    if (typeof to !== "string" || !to) return;
    io.to(`user:${to}`).emit("call:incoming", {
      from: userId,
      fromName: displayName,
      withVideo,
      offer,
    });
  });

  // ── Relay answer to caller ──
  socket.on("call:answer", ({ to, answer }) => {
    if (typeof to !== "string" || !to) return;
    io.to(`user:${to}`).emit("call:answer", { from: userId, answer });
  });

  // ── Relay ICE candidate ──
  socket.on("call:ice", ({ to, candidate }) => {
    if (typeof to !== "string" || !to) return;
    io.to(`user:${to}`).emit("call:ice", { from: userId, candidate });
  });

  // ── Call ended ──
  socket.on("call:end", ({ to }) => {
    if (typeof to !== "string" || !to) return;
    io.to(`user:${to}`).emit("call:ended", { from: userId });
  });

  // ── Call rejected ──
  socket.on("call:reject", ({ to }) => {
    if (typeof to !== "string" || !to) return;
    io.to(`user:${to}`).emit("call:rejected", { from: userId });
  });
}
