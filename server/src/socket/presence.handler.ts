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

/** Track which users are online: Map<userId, Set<socketId>> */
const onlineUsers = new Map<string, Set<string>>();

/** Register presence-related event handlers on a socket. */
export function registerPresenceHandlers(
  io: TypedServer,
  socket: TypedSocket,
): void {
  const userId = socket.data.user.sub;

  // Join personal notification room
  socket.join("user:" + userId);

  // Mark online
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  const wasOffline = onlineUsers.get(userId)!.size === 0;
  onlineUsers.get(userId)!.add(socket.id);

  if (wasOffline) {
    io.emit("presence:online", { userId });
  }

  // Send current online list to this socket
  socket.emit("presence:list", [...onlineUsers.keys()]);

  // Join/leave conversation rooms
  socket.on("join:conversation", (conversationId: string) => {
    if (typeof conversationId !== "string" || !conversationId) return;
    socket.join("conv:" + conversationId);
  });

  socket.on("leave:conversation", (conversationId: string) => {
    if (typeof conversationId !== "string" || !conversationId) return;
    socket.leave("conv:" + conversationId);
  });

  // Disconnect
  socket.on("disconnect", (reason: string) => {
    console.log(`[socket] disconnected: ${socket.id} (${reason})`);
    const sockets = onlineUsers.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        onlineUsers.delete(userId);
        io.emit("presence:offline", { userId });
      }
    }
  });
}
