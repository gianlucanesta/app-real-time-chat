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

/** Register typing indicator event handlers on a socket. */
export function registerTypingHandlers(
  _io: TypedServer,
  socket: TypedSocket,
): void {
  const userId = socket.data.user.sub;
  const displayName = socket.data.user.displayName;

  socket.on("typing:start", (conversationId: string) => {
    if (typeof conversationId !== "string") return;
    socket.to("conv:" + conversationId).emit("typing", {
      userId,
      displayName,
      typing: true,
    });
  });

  socket.on("typing:stop", (conversationId: string) => {
    if (typeof conversationId !== "string") return;
    socket.to("conv:" + conversationId).emit("typing", {
      userId,
      displayName,
      typing: false,
    });
  });
}
