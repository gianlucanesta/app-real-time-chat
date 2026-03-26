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

/** Register community-related event handlers on a socket. */
export function registerCommunityHandlers(
  _io: TypedServer,
  socket: TypedSocket,
): void {
  // Join a community room for real-time updates
  socket.on("join:community", (communityId: string) => {
    if (!communityId || typeof communityId !== "string") return;
    socket.join("community:" + communityId);
  });

  // Leave a community room
  socket.on("leave:community", (communityId: string) => {
    if (!communityId || typeof communityId !== "string") return;
    socket.leave("community:" + communityId);
  });
}
