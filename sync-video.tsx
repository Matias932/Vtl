"use client"

import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react"
import { Play } from "lucide-react"
import { isHls } from "@/lib/media"

export type PlaybackState = { playing: boolean; time: number; at: number; seq: number }

export type PlayerHandle = {
  togglePlay: () => void
  seekBy: (seconds: number) => void
  setVolume: (value: number) => void
  requestFullscreen: () => void
  getState: () => { playing: boolean; time: number } | null
}

type SyncVideoProps = {
  /** URL remota o URL de objeto de un archivo local. */
  src: string
  isHost: boolean
  playback: PlaybackState | null
  onHostState: (state: { playing: boolean; time: number }) => void
}

/** Diferencia máxima tolerada antes de corregir el tiempo del invitado. */
const DRIFT_TOLERANCE = 0.8

export const SyncVideo = forwardRef<PlayerHandle, SyncVideoProps>(function SyncVideo(
  { src, isHost, playback, onHostState },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [needsGesture, setNeedsGesture] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Evita que la corrección del invitado se reenvíe como si fuera acción del anfitrión.
  const applying = useRef(false)

  useImperativeHandle(ref, () => ({
    togglePlay() {
      const video = videoRef.current
      if (!video) return
      if (video.paused) void video.play().catch(() => setNeedsGesture(true))
      else video.pause()
    },
    seekBy(seconds) {
      const video = videoRef.current
      if (!video) return
      video.currentTime = Math.max(0, video.currentTime + seconds)
    },
    setVolume(value) {
      const video = videoRef.current
      if (!video) return
      video.muted = value === 0
      video.volume = value
    },
    requestFullscreen() {
      void videoRef.current?.requestFullscreen?.().catch(() => {})
    },
    getState() {
      const video = videoRef.current
      if (!video) return null
      return { playing: !video.paused, time: video.currentTime }
    },
  }))

  // --- Carga de la fuente (con soporte HLS cuando el navegador no lo trae) ---
  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return
    setError(null)

    const nativeHls = video.canPlayType("application/vnd.apple.mpegurl") !== ""
    if (!isHls(src) || nativeHls) {
      video.src = src
      return
    }

    let destroyed = false
    let hls: { destroy: () => void } | null = null

    void (async () => {
      const Hls = (await import("hls.js")).default
      if (destroyed || !videoRef.current) return
      if (!Hls.isSupported()) {
        setError("Tu navegador no puede reproducir este stream.")
        return
      }
      const instance = new Hls()
      instance.loadSource(src)
      instance.attachMedia(videoRef.current)
      hls = instance
    })()

    return () => {
      destroyed = true
      hls?.destroy()
    }
  }, [src])

  // --- El anfitrión manda su estado cuando reproduce, pausa o salta ---
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isHost) return

    const report = () => {
      if (applying.current) return
      onHostState({ playing: !video.paused, time: video.currentTime })
    }

    video.addEventListener("play", report)
    video.addEventListener("pause", report)
    video.addEventListener("seeked", report)
    // Latido para mantener alineado al invitado durante la reproducción.
    const heartbeat = window.setInterval(() => {
      if (!video.paused) report()
    }, 3000)

    return () => {
      video.removeEventListener("play", report)
      video.removeEventListener("pause", report)
      video.removeEventListener("seeked", report)
      window.clearInterval(heartbeat)
    }
  }, [isHost, onHostState, src])

  // --- El invitado aplica el estado recibido ---
  useEffect(() => {
    const video = videoRef.current
    if (!video || isHost || !playback) return

    applying.current = true

    // Compensa el tiempo que tardó el mensaje en llegar.
    const elapsed = playback.playing ? (Date.now() - playback.at) / 1000 : 0
    const target = playback.time + elapsed

    if (Number.isFinite(target) && Math.abs(video.currentTime - target) > DRIFT_TOLERANCE) {
      video.currentTime = target
    }

    if (playback.playing && video.paused) {
      video.play().catch(() => setNeedsGesture(true))
    } else if (!playback.playing && !video.paused) {
      video.pause()
    }

    const timer = window.setTimeout(() => {
      applying.current = false
    }, 250)
    return () => window.clearTimeout(timer)
  }, [playback, isHost])

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border bg-black">
      <video
        ref={videoRef}
        // El anfitrión manda: solo él tiene controles nativos.
        controls={isHost}
        playsInline
        className="h-full w-full bg-black"
        onError={() => setError("No se pudo cargar el video. Revisa el enlace.")}
      />

      {needsGesture && (
        <button
          type="button"
          onClick={() => {
            setNeedsGesture(false)
            void videoRef.current?.play().catch(() => setNeedsGesture(true))
          }}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/70 text-center"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Play className="h-7 w-7" aria-hidden="true" />
          </span>
          <span className="px-6 text-sm font-medium text-foreground">Toca para unirte a la reproducción</span>
        </button>
      )}

      {error && (
        <div className="absolute inset-x-0 bottom-0 z-10 bg-destructive/90 px-4 py-2 text-center text-xs font-medium text-primary-foreground">
          {error}
        </div>
      )}
    </div>
  )
})
