"use client"

import { useEffect, useImperativeHandle, useRef, forwardRef } from "react"
import type { PlaybackState, PlayerHandle } from "./sync-video"

type YTPlayer = {
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  getCurrentTime: () => number
  getPlayerState: () => number
  setVolume: (value: number) => void
  destroy: () => void
}

declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, config: unknown) => YTPlayer; PlayerState: { PLAYING: number } }
    onYouTubeIframeAPIReady?: () => void
  }
}

const DRIFT_TOLERANCE = 1.2

// Estados de la API de YouTube: 1 = reproduciendo, 3 = cargando.
// Contamos "cargando" como reproduciendo para no pausar al invitado
// cada vez que al anfitrión se le llena el búfer.
function isPlaying(state: number | undefined): boolean {
  return state === 1 || state === 3
}

/** Carga la API de YouTube una sola vez y la comparte entre montajes. */
let apiPromise: Promise<void> | null = null
function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (window.YT?.Player) return Promise.resolve()
  if (apiPromise) return apiPromise

  apiPromise = new Promise<void>((resolve) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve()
    }
    const script = document.createElement("script")
    script.src = "https://www.youtube.com/iframe_api"
    document.head.appendChild(script)
  })
  return apiPromise
}

type SyncYouTubeProps = {
  videoId: string
  isHost: boolean
  playback: PlaybackState | null
  onHostState: (state: { playing: boolean; time: number }) => void
}

export const SyncYouTube = forwardRef<PlayerHandle, SyncYouTubeProps>(function SyncYouTube(
  { videoId, isHost, playback, onHostState },
  ref,
) {
  const holderRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const readyRef = useRef(false)
  const applying = useRef(false)
  const onHostStateRef = useRef(onHostState)
  onHostStateRef.current = onHostState

  useImperativeHandle(ref, () => ({
    togglePlay() {
      const player = playerRef.current
      if (!player || !readyRef.current) return
      if (isPlaying(player.getPlayerState())) player.pauseVideo()
      else player.playVideo()
    },
    seekBy(seconds) {
      const player = playerRef.current
      if (!player || !readyRef.current) return
      player.seekTo(Math.max(0, player.getCurrentTime() + seconds), true)
    },
    setVolume(value) {
      playerRef.current?.setVolume(Math.round(value * 100))
    },
    requestFullscreen() {
      void holderRef.current?.requestFullscreen?.().catch(() => {})
    },
    getState() {
      const player = playerRef.current
      if (!player || !readyRef.current) return null
      return { playing: isPlaying(player.getPlayerState()), time: player.getCurrentTime() }
    },
  }))

  useEffect(() => {
    let destroyed = false
    readyRef.current = false

    void loadYouTubeApi().then(() => {
      if (destroyed || !holderRef.current || !window.YT?.Player) return

      playerRef.current = new window.YT.Player(holderRef.current, {
        videoId,
        playerVars: { controls: isHost ? 1 : 0, disablekb: isHost ? 0 : 1, rel: 0, playsinline: 1, modestbranding: 1 },
        events: {
          onReady: () => {
            readyRef.current = true
          },
          onStateChange: () => {
            if (!isHost || applying.current) return
            const player = playerRef.current
            if (!player) return
            onHostStateRef.current({
              playing: isPlaying(player.getPlayerState()),
              time: player.getCurrentTime(),
            })
          },
        },
      })
    })

    return () => {
      destroyed = true
      try {
        playerRef.current?.destroy()
      } catch {
        // noop
      }
      playerRef.current = null
      readyRef.current = false
    }
  }, [videoId, isHost])

  // Latido del anfitrión para mantener alineado al invitado.
  useEffect(() => {
    if (!isHost) return
    const heartbeat = window.setInterval(() => {
      const player = playerRef.current
      if (!player || !readyRef.current) return
      if (!isPlaying(player.getPlayerState())) return
      onHostStateRef.current({ playing: true, time: player.getCurrentTime() })
    }, 3000)
    return () => window.clearInterval(heartbeat)
  }, [isHost])

  // El invitado obedece al anfitrión.
  useEffect(() => {
    const player = playerRef.current
    if (!player || isHost || !playback || !readyRef.current) return

    applying.current = true
    const elapsed = playback.playing ? (Date.now() - playback.at) / 1000 : 0
    const target = playback.time + elapsed

    if (Math.abs(player.getCurrentTime() - target) > DRIFT_TOLERANCE) {
      player.seekTo(target, true)
    }
    const playing = player.getPlayerState() === (window.YT?.PlayerState.PLAYING ?? 1)
    if (playback.playing && !playing) player.playVideo()
    if (!playback.playing && playing) player.pauseVideo()

    const timer = window.setTimeout(() => {
      applying.current = false
    }, 250)
    return () => window.clearTimeout(timer)
  }, [playback, isHost])

  return (
    <div className="h-full w-full overflow-hidden rounded-2xl border border-border bg-black">
      <div ref={holderRef} className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full" />
    </div>
  )
})
