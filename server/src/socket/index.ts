import type { Server } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData,
} from "../interfaces/socket.interface.js";
import { authSocketHandler } from "./auth.handler.js";
import { registerMessageHandlers } from "./message.handler.js";
import { registerPresenceHandlers } from "./presence.handler.js";
import { registerTypingHandlers } from "./typing.handler.js";
import { registerCallHandlers } from "./call.handler.js";

export type TypedServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

/**
 * Attach all Socket.io event handlers to the given server instance.
 */
export function initSocket(io: TypedServer): void {
  // Auth middleware
  io.use(authSocketHandler);

  io.on("connection", (socket) => {
    console.log(
      `[socket] connected: ${socket.id} (user: ${socket.data.user.sub})`,
    );

    // Register all handler groups
    registerPresenceHandlers(io, socket);
    registerMessageHandlers(io, socket);
    registerTypingHandlers(io, socket);
    registerCallHandlers(io, socket);
  });
}
