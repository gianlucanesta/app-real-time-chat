import { useRef, useState, useCallback, useEffect } from "react";
import type { TypedSocket } from "./useSocket";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

const ICE_RESTART_TIMEOUT_MS = 8_000;
const MAX_FULL_RETRIES = 2;

/** Build getUserMedia constraints using saved device preferences. */
function getMediaConstraints(withVideo: boolean): MediaStreamConstraints {
  const micId = localStorage.getItem("ephemeral-mic-id");
  const camId = localStorage.getItem("ephemeral-camera-id");
  return {
    audio: micId ? { deviceId: { ideal: micId } } : true,
    video: withVideo ? (camId ? { deviceId: { ideal: camId } } : true) : false,
  };
}

export type CallStatus =
  | "idle"
  | "calling"
  | "incoming"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "failed"
  | "ended";

export interface IncomingCallData {
  from: string;
  fromName: string;
  withVideo: boolean;
  offer: RTCSessionDescriptionInit;
}

export function useWebRTC(socket: TypedSocket | null) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const retryCount = useRef(0);
  const iceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetUserRef = useRef<string | null>(null);
  const withVideoRef = useRef(true);

  const [status, setStatus] = useState<CallStatus>("idle");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(
    null,
  );
  const [callWithVideo, setCallWithVideo] = useState(true);

  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const clearIceTimer = useCallback(() => {
    if (iceTimerRef.current) {
      clearTimeout(iceTimerRef.current);
      iceTimerRef.current = null;
    }
  }, []);

  const cleanupMedia = useCallback(() => {
    localStream?.getTracks().forEach((t) => t.stop());
    screenTrackRef.current?.stop();
    screenTrackRef.current = null;
    originalVideoTrackRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setIsScreenSharing(false);
    setIsMuted(false);
    setIsCameraOff(false);
  }, [localStream]);

  // ── Create PeerConnection ───────────────────────────────────────────────
  const createPC = useCallback(
    (stream: MediaStream): RTCPeerConnection => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.onicecandidate = ({ candidate }) => {
        if (candidate && targetUserRef.current && socket) {
          socket.emit("call:ice", {
            to: targetUserRef.current,
            candidate: candidate.toJSON(),
          });
        }
      };

      const remote = new MediaStream();
      pc.ontrack = (e) => {
        remote.addTrack(e.track);
        // Create new MediaStream each time to trigger React re-render
        setRemoteStream(new MediaStream(remote.getTracks()));
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.log("[webrtc] ICE state:", state);

        if (state === "connected" || state === "completed") {
          clearIceTimer();
          retryCount.current = 0;
          setStatus("connected");
        }

        if (state === "failed" || state === "disconnected") {
          handleIceFailed();
        }
      };

      return pc;
    },
    [socket, clearIceTimer],
  );

  // ── ICE restart (level 1) ──────────────────────────────────────────────
  const triggerFullRetry = useCallback(async () => {
    if (retryCount.current >= MAX_FULL_RETRIES) {
      setStatus("failed");
      console.warn("[webrtc] Max retries reached — giving up");
      return;
    }

    retryCount.current += 1;
    console.log(
      `[webrtc] Full retry ${retryCount.current}/${MAX_FULL_RETRIES}`,
    );

    pcRef.current?.close();
    pcRef.current = null;

    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        getMediaConstraints(withVideoRef.current),
      );
      setLocalStream(stream);
      const pc = createPC(stream);
      pcRef.current = pc;

      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      if (targetUserRef.current && socket) {
        socket.emit("call:offer", {
          to: targetUserRef.current,
          withVideo: withVideoRef.current,
          offer,
        });
      }
      setStatus("connecting");
    } catch (err) {
      console.error("[webrtc] Full retry failed:", err);
      setStatus("failed");
    }
  }, [createPC, socket]);

  const handleIceFailed = useCallback(() => {
    const pc = pcRef.current;
    if (!pc) return;
    setStatus("reconnecting");
    clearIceTimer();

    console.log(
      `[webrtc] ICE failed — restart attempt (retry ${retryCount.current + 1}/${MAX_FULL_RETRIES})`,
    );

    try {
      pc.restartIce();
    } catch {
      void triggerFullRetry();
      return;
    }

    iceTimerRef.current = setTimeout(() => {
      void triggerFullRetry();
    }, ICE_RESTART_TIMEOUT_MS);
  }, [clearIceTimer, triggerFullRetry]);

  // ── Start a call (caller) ──────────────────────────────────────────────
  const startCall = useCallback(
    async (toUserId: string, withVideo = true) => {
      if (!socket || status !== "idle") return;
      targetUserRef.current = toUserId;
      withVideoRef.current = withVideo;
      retryCount.current = 0;
      setCallWithVideo(withVideo);
      setStatus("calling");

      try {
        const stream = await navigator.mediaDevices.getUserMedia(
          getMediaConstraints(withVideo),
        );
        setLocalStream(stream);
        if (withVideo) {
          originalVideoTrackRef.current = stream.getVideoTracks()[0] ?? null;
        }

        const pc = createPC(stream);
        pcRef.current = pc;

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("call:offer", { to: toUserId, withVideo, offer });
        setStatus("connecting");
      } catch (err) {
        console.error("[webrtc] Failed to start call:", err);
        setStatus("failed");
      }
    },
    [socket, status, createPC],
  );

  // ── Answer a call (callee) ─────────────────────────────────────────────
  const answerCall = useCallback(async () => {
    if (!socket || !incomingCall) return;
    const { from, withVideo, offer } = incomingCall;
    targetUserRef.current = from;
    withVideoRef.current = withVideo;
    retryCount.current = 0;
    setCallWithVideo(withVideo);
    setIncomingCall(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        getMediaConstraints(withVideo),
      );
      setLocalStream(stream);
      if (withVideo) {
        originalVideoTrackRef.current = stream.getVideoTracks()[0] ?? null;
      }

      const pc = createPC(stream);
      pcRef.current = pc;

      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("call:answer", { to: from, answer });
      setStatus("connecting");
    } catch (err) {
      console.error("[webrtc] Failed to answer call:", err);
      setStatus("failed");
    }
  }, [socket, incomingCall, createPC]);

  // ── Reject incoming call ───────────────────────────────────────────────
  const rejectCall = useCallback(() => {
    if (!socket || !incomingCall) return;
    socket.emit("call:reject", { to: incomingCall.from });
    setIncomingCall(null);
  }, [socket, incomingCall]);

  // ── End call ───────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    clearIceTimer();
    pcRef.current?.close();
    pcRef.current = null;
    cleanupMedia();
    setStatus("idle");
    if (targetUserRef.current && socket) {
      socket.emit("call:end", { to: targetUserRef.current });
    }
    targetUserRef.current = null;
    retryCount.current = 0;
  }, [cleanupMedia, socket, clearIceTimer]);

  // ── Toggle mute ────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMuted((prev) => !prev);
  }, [localStream]);

  // ── Toggle camera ──────────────────────────────────────────────────────
  const toggleCamera = useCallback(() => {
    localStream?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsCameraOff((prev) => !prev);
  }, [localStream]);

  // ── Screen sharing ─────────────────────────────────────────────────────
  const toggleScreenShare = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !localStream) return;

    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;

        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(screenTrack);
        }
        setIsScreenSharing(true);

        screenTrack.onended = () => {
          void stopScreenShare();
        };
      } catch (err) {
        console.warn("[webrtc] Screen share denied:", err);
      }
    } else {
      await stopScreenShare();
    }
  }, [isScreenSharing, localStream]);

  const stopScreenShare = useCallback(async () => {
    const pc = pcRef.current;
    const camTrack = originalVideoTrackRef.current;
    if (!pc) return;

    screenTrackRef.current?.stop();
    screenTrackRef.current = null;

    if (camTrack) {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) {
        await sender.replaceTrack(camTrack);
      }
    }
    setIsScreenSharing(false);
  }, []);

  // ── Retry from failed state ────────────────────────────────────────────
  const retryCall = useCallback(() => {
    if (status !== "failed" || !targetUserRef.current) return;
    const target = targetUserRef.current;
    cleanupMedia();
    pcRef.current?.close();
    pcRef.current = null;
    setStatus("idle");
    retryCount.current = 0;
    // Re-initiate after cleanup
    setTimeout(() => {
      void startCall(target, withVideoRef.current);
    }, 200);
  }, [status, cleanupMedia, startCall]);

  // ── Socket event listeners ─────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleIncoming = (data: IncomingCallData) => {
      // If already in a call, send busy signal
      if (status !== "idle" || pcRef.current) {
        socket.emit("call:reject", { to: data.from });
        return;
      }
      setIncomingCall(data);
      setStatus("incoming");
    };

    const handleAnswer = async (data: {
      from: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(data.answer);
      }
    };

    const handleIce = async (data: {
      from: string;
      candidate: RTCIceCandidateInit;
    }) => {
      try {
        await pcRef.current?.addIceCandidate(
          new RTCIceCandidate(data.candidate),
        );
      } catch (err) {
        console.warn("[webrtc] addIceCandidate error:", err);
      }
    };

    const handleEnded = () => {
      clearIceTimer();
      pcRef.current?.close();
      pcRef.current = null;
      cleanupMedia();
      setStatus("idle");
      targetUserRef.current = null;
      retryCount.current = 0;
    };

    const handleRejected = () => {
      clearIceTimer();
      pcRef.current?.close();
      pcRef.current = null;
      cleanupMedia();
      setStatus("idle");
      targetUserRef.current = null;
      retryCount.current = 0;
    };

    socket.on("call:incoming", handleIncoming);
    socket.on("call:answer", handleAnswer);
    socket.on("call:ice", handleIce);
    socket.on("call:ended", handleEnded);
    socket.on("call:rejected", handleRejected);

    return () => {
      socket.off("call:incoming", handleIncoming);
      socket.off("call:answer", handleAnswer);
      socket.off("call:ice", handleIce);
      socket.off("call:ended", handleEnded);
      socket.off("call:rejected", handleRejected);
    };
  }, [socket, status, cleanupMedia, clearIceTimer]);

  return {
    status,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    isScreenSharing,
    incomingCall,
    callWithVideo,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    retryCall,
  };
}
