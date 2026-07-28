"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Phone, PhoneOff, Mic, MicOff, Loader2 } from "lucide-react"
import { openChannel, type RealtimeChannel } from "@/lib/realtime/channel"
import { cn } from "@/lib/utils"

type VoiceCallProps = {
  roomCode: string
  selfId: string
}

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }]

export function VoiceCall({ roomCode, selfId }: VoiceCallProps) {
  const [status, setStatus] = useState<"idle" | "connecting" | "in-call">("idle")
  const [muted, setMuted] = useState(false)
  const [remoteActive, setRemoteActive] = useState(false)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const cleanupPeer = useCallback(() => {
    pcRef.current?.close()
    pcRef.current = null
    setRemoteActive(false)
  }, [])

  const createPeer = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

    localStreamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current as MediaStream)
    })

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        channelRef.current?.send("voice-ice", { from: selfId, candidate: e.candidate.toJSON() })
      }
    }

    pc.ontrack = (e) => {
      if (audioRef.current) {
        audioRef.current.srcObject = e.streams[0]
        audioRef.current.play().catch(() => {})
      }
      setRemoteActive(true)
      setStatus("in-call")
    }

    pcRef.current = pc
    return pc
  }, [selfId])

  const join = useCallback(async () => {
    setStatus("connecting")

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      localStreamRef.current = stream
    } catch {
      setStatus("idle")
      alert("No pudimos acceder a tu micrófono. Revisa los permisos.")
      return
    }

    const channel = openChannel({
      channel: `voice-${roomCode}`,
      clientId: selfId,
      onOpen: () => {
        setStatus("connecting")
        channel.send("voice-join", { from: selfId })
      },
    })
    channelRef.current = channel

    channel.on("voice-join", async (payload: { from: string }) => {
      if (payload.from === selfId) return
      // Resolución de conflicto: el id mayor inicia la oferta.
      if (selfId > payload.from) {
        const pc = pcRef.current ?? createPeer()
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        channel.send("voice-offer", { from: selfId, to: payload.from, sdp: offer })
      }
    })

    channel.on("voice-offer", async (payload: { from: string; to: string; sdp: RTCSessionDescriptionInit }) => {
      if (payload.to !== selfId) return
      const pc = pcRef.current ?? createPeer()
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      channel.send("voice-answer", { from: selfId, to: payload.from, sdp: answer })
    })

    channel.on("voice-answer", async (payload: { to: string; sdp: RTCSessionDescriptionInit }) => {
      if (payload.to !== selfId) return
      await pcRef.current?.setRemoteDescription(new RTCSessionDescription(payload.sdp))
    })

    channel.on("voice-ice", async (payload: { from: string; candidate: RTCIceCandidateInit }) => {
      if (payload.from === selfId) return
      try {
        await pcRef.current?.addIceCandidate(new RTCIceCandidate(payload.candidate))
      } catch {
        // candidato descartado
      }
    })

    channel.on("voice-leave", (payload: { from: string }) => {
      if (payload.from === selfId) return
      cleanupPeer()
      setStatus("connecting")
    })
  }, [roomCode, selfId, createPeer, cleanupPeer])

  const leave = useCallback(() => {
    channelRef.current?.send("voice-leave", { from: selfId })
    cleanupPeer()
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    channelRef.current?.close()
    channelRef.current = null
    setStatus("idle")
    setMuted(false)
  }, [selfId, cleanupPeer])

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setMuted(!track.enabled)
  }, [])

  useEffect(() => {
    return () => {
      pcRef.current?.close()
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
      channelRef.current?.close()
    }
  }, [])

  return (
    <div className="flex items-center gap-2">
      {/* audio remoto */}
      <audio ref={audioRef} autoPlay playsInline className="hidden" />

      {status === "idle" ? (
        <button
          type="button"
          onClick={join}
          className="flex items-center gap-2 rounded-full bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition hover:bg-accent"
        >
          <Phone className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Llamar</span>
        </button>
      ) : (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Activar micrófono" : "Silenciar micrófono"}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full transition",
              muted ? "bg-secondary text-muted-foreground" : "bg-primary text-primary-foreground",
            )}
          >
            {muted ? <MicOff className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
          </button>

          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              remoteActive ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
            )}
          >
            {status === "connecting" && !remoteActive ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                Conectando
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                En llamada
              </>
            )}
          </span>

          <button
            type="button"
            onClick={leave}
            aria-label="Colgar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive text-white transition hover:opacity-90"
          >
            <PhoneOff className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
