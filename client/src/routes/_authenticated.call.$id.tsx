import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";
import { JoinCallScreen } from "../components/chat/JoinCallScreen";

export const Route = createFileRoute("/_authenticated/call/$id")({
  component: CallRoomPage,
});

function CallRoomPage() {
  const { id: roomId } = Route.useParams();
  const { user } = useAuth();
  const { webrtc, socket } = useChat();
  const [peerWaiting, setPeerWaiting] = useState(false);
  const [joined, setJoined] = useState(false);
  const joinedRef = useRef(false);
  const peerUserIdRef = useRef<string | null>(null);
  const withVideoRef = useRef(true);

  const myInitials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "";
  const myGradient =
    user?.avatarGradient ?? "linear-gradient(135deg,#2563EB,#7C3AED)";

  // Join the socket room when mounting
  useEffect(() => {
    if (!socket) return;

    socket.emit("call:join-room", { roomId });

    const handlePeerJoined = (data: {
      userId: string;
      displayName: string;
      roomId: string;
    }) => {
      if (data.roomId !== roomId) return;
      peerUserIdRef.current = data.userId;
      setPeerWaiting(true);

      // If we already clicked "Join", start the call to this peer
      if (joinedRef.current) {
        void webrtc.startCall(data.userId, withVideoRef.current);
      }
    };

    const handlePeerInRoom = (data: {
      userId: string;
      displayName: string;
      roomId: string;
    }) => {
      if (data.roomId !== roomId) return;
      peerUserIdRef.current = data.userId;
      setPeerWaiting(true);
    };

    const handlePeerLeft = (data: { userId: string; roomId: string }) => {
      if (data.roomId !== roomId) return;
      if (peerUserIdRef.current === data.userId) {
        peerUserIdRef.current = null;
        setPeerWaiting(false);
      }
    };

    socket.on("call:peer-joined", handlePeerJoined);
    socket.on("call:peer-in-room", handlePeerInRoom);
    socket.on("call:peer-left", handlePeerLeft);

    return () => {
      socket.emit("call:leave-room", { roomId });
      socket.off("call:peer-joined", handlePeerJoined);
      socket.off("call:peer-in-room", handlePeerInRoom);
      socket.off("call:peer-left", handlePeerLeft);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, roomId]);

  // Auto-answer incoming call when we are on a call page and have joined
  useEffect(() => {
    if (joined && webrtc.incomingCall && webrtc.status === "incoming") {
      void webrtc.answerCall();
    }
  }, [joined, webrtc.incomingCall, webrtc.status, webrtc]);

  const handleJoin = useCallback(
    (withVideo: boolean) => {
      setJoined(true);
      joinedRef.current = true;
      withVideoRef.current = withVideo;

      // If a peer is already in the room, initiate the call
      if (peerUserIdRef.current) {
        void webrtc.startCall(peerUserIdRef.current, withVideo);
      }
      // Otherwise, wait for peer-joined event (handled above)
    },
    [webrtc],
  );

  const isInCall = webrtc.status !== "idle";

  return (
    <JoinCallScreen
      roomId={roomId}
      displayName={user?.displayName ?? ""}
      avatarUrl={user?.avatarUrl}
      initials={myInitials}
      gradient={myGradient}
      peerWaiting={peerWaiting}
      isInCall={isInCall}
      onJoin={handleJoin}
    />
  );
}
