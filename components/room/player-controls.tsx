"use client"

import type React from "react"
import { useState } from "react"
import { Play, Pause, RotateCcw, RotateCw, Volume2, Maximize, RefreshCw } from "lucide-react"
import type { PlayerHandle } from "./sync-video"

type PlayerControlsProps = {
  playerRef: React.RefObject<PlayerHandle | null>
  isHost: boolean
  active: boolean
  onResync: () => void
}

export function PlayerControls({ playerRef, isHost, active, onResync }: PlayerControlsProps) {
  const [volume, setVolume] = useState(1)

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      {!active && (
        <p className="rounded-xl bg-secondary/60 px-3 py-2 text-center text-xs text-muted-foreground">
          Elige algo para ver y aquí tendrás los controles a mano.
        </p>
      )}

      {isHost ? (
        <>
          <button
            type="button"
            disabled={!active}
            onClick={() => playerRef.current?.togglePlay()}
            className="flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            <Pause className="h-4 w-4" aria-hidden="true" />
            Reproducir / Pausar
          </button>

          <div className="grid grid-cols-2 gap-2">
            <ControlButton disabled={!active} onClick={() => playerRef.current?.seekBy(-10)} icon={<RotateCcw />}>
              -10s
            </ControlButton>
            <ControlButton disabled={!active} onClick={() => playerRef.current?.seekBy(10)} icon={<RotateCw />}>
              +10s
            </ControlButton>
          </div>

          <ControlButton disabled={!active} onClick={onResync} icon={<RefreshCw />}>
            Sincronizar ahora
          </ControlButton>
        </>
      ) : (
        <p className="rounded-xl bg-secondary/60 px-3 py-2 text-center text-xs text-muted-foreground">
          El anfitrión controla la reproducción. Tú puedes ajustar tu volumen y pantalla completa.
        </p>
      )}

      <div className="rounded-2xl bg-secondary/60 p-3">
        <label htmlFor="volume" className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Volume2 className="h-4 w-4" aria-hidden="true" />
          Mi volumen
        </label>
        <input
          id="volume"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          disabled={!active}
          onChange={(e) => {
            const next = Number(e.target.value)
            setVolume(next)
            playerRef.current?.setVolume(next)
          }}
          className="mt-2 w-full accent-primary"
        />
      </div>

      <ControlButton disabled={!active} onClick={() => playerRef.current?.requestFullscreen()} icon={<Maximize />}>
        Pantalla completa
      </ControlButton>
    </div>
  )
}

function ControlButton({
  onClick,
  icon,
  children,
  disabled,
}: {
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center gap-2 rounded-xl bg-secondary py-3 text-sm font-medium text-secondary-foreground transition hover:bg-accent active:scale-[0.98] disabled:opacity-50"
    >
      <span className="[&>svg]:h-4 [&>svg]:w-4" aria-hidden="true">
        {icon}
      </span>
      {children}
    </button>
  )
}
