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
  const iceCandidateBuffer = useRef<RTCIceCandidateInit[]>([]);

  const [status, setStatus] = useState<CallStatus>("idle");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteIsScreenSharing, setRemoteIsScreenSharing] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(
    null,
  );
  const [callWithVideo, setCallWithVideo] = useState(true);
  const [callContactId, setCallContactId] = useState<string | null>(null);

  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);

  // ── Refs that mirror state so socket handlers stay stable ────────────
  const statusRef = useRef<CallStatus>("idle");
  const localStreamRef = useRef<MediaStream | null>(null);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const clearIceTimer = useCallback(() => {
    if (iceTimerRef.current) {
      clearTimeout(iceTimerRef.current);
      iceTimerRef.current = null;
    }
  }, []);

  /** Stop all media tracks and reset stream state. Uses ref — no deps. */
  const cleanupMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenTrackRef.current?.stop();
    screenTrackRef.current = null;
    originalVideoTrackRef.current = null;
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setIsScreenSharing(false);
    setRemoteIsScreenSharing(false);
    setIsMuted(false);
    setIsCameraOff(false);
  }, []);

  // ── Create PeerConnection ───────────────────────────────────────────────
  const createPC = useCallback(
    (stream: MediaStream): RTCPeerConnection => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      stream.getTracks().forEach((t) => {
        pc.addTrack(t, stream);
        console.log("[webrtc] added local track:", t.kind, t.id);
      });

      pc.onicecandidate = ({ candidate }) => {
        if (candidate && targetUserRef.current && socket) {
          socket.emit("call:ice", {
            to: targetUserRef.current,
            candidate: candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (e) => {
        console.log(
          "[webrtc] ontrack fired — kind:",
          e.track.kind,
          "readyState:",
          e.track.readyState,
          "muted:",
          e.track.muted,
          "streams:",
          e.streams.length,
        );
        // Use the browser-managed stream when available (recommended)
        if (e.streams[0]) {
          setRemoteStream(e.streams[0]);
        } else {
          // Fallback: build stream from individual tracks
          setRemoteStream((prev) => {
            const ms = prev ?? new MediaStream();
            if (!ms.getTrackById(e.track.id)) {
              ms.addTrack(e.track);
            }
            // Return new ref to trigger React re-render
            return new MediaStream(ms.getTracks());
          });
        }
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

      pc.onconnectionstatechange = () => {
        console.log("[webrtc] Connection state:", pc.connectionState);
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
      localStreamRef.current = stream;
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
      if (!socket || statusRef.current !== "idle") return;
      targetUserRef.current = toUserId;
      withVideoRef.current = withVideo;
      retryCount.current = 0;
      setCallWithVideo(withVideo);
      setCallContactId(toUserId);
      setStatus("calling");

      try {
        console.log(
          "[webrtc] startCall — getting user media, withVideo:",
          withVideo,
        );
        const stream = await navigator.mediaDevices.getUserMedia(
          getMediaConstraints(withVideo),
        );
        console.log(
          "[webrtc] got local stream, tracks:",
          stream
            .getTracks()
            .map((t) => `${t.kind}:${t.readyState}`)
            .join(", "),
        );
        localStreamRef.current = stream;
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
    [socket, createPC],
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
      console.log(
        "[webrtc] answerCall — getting user media, withVideo:",
        withVideo,
      );
      const stream = await navigator.mediaDevices.getUserMedia(
        getMediaConstraints(withVideo),
      );
      console.log(
        "[webrtc] got local stream, tracks:",
        stream
          .getTracks()
          .map((t) => `${t.kind}:${t.readyState}`)
          .join(", "),
      );
      localStreamRef.current = stream;
      setLocalStream(stream);
      if (withVideo) {
        originalVideoTrackRef.current = stream.getVideoTracks()[0] ?? null;
      }

      const pc = createPC(stream);
      pcRef.current = pc;

      console.log("[webrtc] setting remote description (offer)...");
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log(
        "[webrtc] remote description set, signalingState:",
        pc.signalingState,
      );
      // Flush any ICE candidates that arrived during the ringing phase
      const buffered = iceCandidateBuffer.current.splice(0);
      console.log(
        "[webrtc] flushing",
        buffered.length,
        "buffered ICE candidates",
      );
      for (const c of buffered) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        } catch (err) {
          console.warn("[webrtc] buffered addIceCandidate error:", err);
        }
      }
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log("[webrtc] answer created & set, emitting to caller");
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
    setCallContactId(null);
    setIncomingCall(null);
  }, [socket, incomingCall]);

  // ── End call ───────────────────────────────────────────────────────────
  // endCall also needs to clear callContactId
  const endCall = useCallback(() => {
    clearIceTimer();
    pcRef.current?.close();
    pcRef.current = null;
    cleanupMedia();
    setStatus("idle");
    setCallContactId(null);
    if (targetUserRef.current && socket) {
      socket.emit("call:end", { to: targetUserRef.current });
    }
    targetUserRef.current = null;
    retryCount.current = 0;
    iceCandidateBuffer.current = [];
  }, [cleanupMedia, socket, clearIceTimer]);

  // ── Toggle mute ────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMuted((prev) => !prev);
  }, []);

  // ── Toggle camera ──────────────────────────────────────────────────────
  const toggleCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsCameraOff((prev) => !prev);
  }, []);

  // ── Screen sharing ─────────────────────────────────────────────────────
  const toggleScreenShare = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !localStreamRef.current) return;

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
        // Notify remote peer that screen sharing has started
        if (targetUserRef.current && socket) {
          socket.emit("call:screenshare", {
            to: targetUserRef.current,
            active: true,
          });
        }

        screenTrack.onended = () => {
          void stopScreenShare();
        };
      } catch (err) {
        console.warn("[webrtc] Screen share denied:", err);
      }
    } else {
      await stopScreenShare();
    }
  }, [isScreenSharing]);

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
    // Notify remote peer that screen sharing has stopped
    if (targetUserRef.current && socket) {
      socket.emit("call:screenshare", {
        to: targetUserRef.current,
        active: false,
      });
    }
  }, [socket]);

  // ── Retry from failed state ────────────────────────────────────────────
  const retryCall = useCallback(() => {
    if (statusRef.current !== "failed" || !targetUserRef.current) return;
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
  }, [cleanupMedia, startCall]);

  // ── Socket event listeners ─────────────────────────────────────────────
  // Handlers read current values from refs so this effect only depends on
  // `socket` and never re-registers mid-call.
  useEffect(() => {
    if (!socket) return;

    const handleIncoming = (data: IncomingCallData) => {
      // If already in a call, send busy signal
      if (statusRef.current !== "idle" || pcRef.current) {
        socket.emit("call:reject", { to: data.from });
        return;
      }
      setCallContactId(data.from);
      setIncomingCall(data);
      setStatus("incoming");
    };

    const flushIceBuffer = async (pc: RTCPeerConnection) => {
      const candidates = iceCandidateBuffer.current.splice(0);
      for (const c of candidates) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        } catch (err) {
          console.warn("[webrtc] buffered addIceCandidate error:", err);
        }
      }
    };

    const handleAnswer = async (data: {
      from: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      console.log("[webrtc] received answer from:", data.from);
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(
          new RTCSessionDescription(data.answer),
        );
        console.log(
          "[webrtc] remote description (answer) set, signalingState:",
          pcRef.current.signalingState,
        );
        await flushIceBuffer(pcRef.current);
      }
    };

    const handleIce = async (data: {
      from: string;
      candidate: RTCIceCandidateInit;
    }) => {
      const pc = pcRef.current;
      if (!pc || !pc.remoteDescription) {
        // PC not ready yet — buffer for later
        iceCandidateBuffer.current.push(data.candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) {
        console.warn("[webrtc] addIceCandidate error:", err);
      }
    };

    const doFullCleanup = () => {
      clearIceTimer();
      pcRef.current?.close();
      pcRef.current = null;
      iceCandidateBuffer.current = [];
      // Stop media via ref (no stale closure)
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenTrackRef.current?.stop();
      screenTrackRef.current = null;
      originalVideoTrackRef.current = null;
      localStreamRef.current = null;
      setLocalStream(null);
      setRemoteStream(null);
      setIsScreenSharing(false);
      setRemoteIsScreenSharing(false);
      setIsMuted(false);
      setIsCameraOff(false);
      setStatus("idle");
      setCallContactId(null);
      targetUserRef.current = null;
      retryCount.current = 0;
    };

    const handleEnded = (data?: { from?: string }) => {
      // Only clean up if the ended signal is from our current call peer
      if (
        data?.from &&
        targetUserRef.current &&
        data.from !== targetUserRef.current
      )
        return;
      doFullCleanup();
    };
    const handleRejected = (data?: { from?: string }) => {
      if (
        data?.from &&
        targetUserRef.current &&
        data.from !== targetUserRef.current
      )
        return;
      doFullCleanup();
    };

    const handleRemoteScreenShare = (data: {
      from: string;
      active: boolean;
    }) => {
      if (targetUserRef.current && data.from !== targetUserRef.current) return;
      setRemoteIsScreenSharing(data.active);
    };

    socket.on("call:incoming", handleIncoming);
    socket.on("call:answer", handleAnswer);
    socket.on("call:ice", handleIce);
    socket.on("call:ended", handleEnded);
    socket.on("call:rejected", handleRejected);
    socket.on("call:screenshare", handleRemoteScreenShare);

    return () => {
      socket.off("call:incoming", handleIncoming);
      socket.off("call:answer", handleAnswer);
      socket.off("call:ice", handleIce);
      socket.off("call:ended", handleEnded);
      socket.off("call:rejected", handleRejected);
      socket.off("call:screenshare", handleRemoteScreenShare);
    };
    // Only re-register when socket instance changes — handlers read refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  return {
    status,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    isScreenSharing,
    remoteIsScreenSharing,
    incomingCall,
    callContactId,
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
