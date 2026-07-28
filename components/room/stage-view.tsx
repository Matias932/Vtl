"use client"

import type React from "react"
import { useRef } from "react"
import { RefreshCw, FolderOpen, Clapperboard } from "lucide-react"
import type { Stage } from "@/lib/media"
import { SyncVideo, type PlaybackState, type PlayerHandle } from "./sync-video"
import { SyncYouTube } from "./sync-youtube"
import { WebFrame } from "./web-frame"
import { SharedBrowser, type HyperbeamHandle } from "./shared-browser"
import { SourcePicker } from "./source-picker"

type StageViewProps = {
  stage: Stage | null
  isHost: boolean
  playback: PlaybackState | null
  onHostState: (state: { playing: boolean; time: number }) => void
  playerRef: React.RefObject<PlayerHandle | null>
  localUrl: string | null
  onPickLocalFile: (file: File) => void
  onSubmitLink: (raw: string) => void
  onChangeSource: () => void
  embedUrl: string | null
  browserRef: React.RefObject<HyperbeamHandle | null>
  creatingBrowser: boolean
  browserError: string | null
  onOpenFullBrowser: () => void
}

export function StageView({
  stage,
  isHost,
  playback,
  onHostState,
  playerRef,
  localUrl,
  onPickLocalFile,
  onSubmitLink,
  onChangeSource,
  embedUrl,
  browserRef,
  creatingBrowser,
  browserError,
  onOpenFullBrowser,
}: StageViewProps) {
  // Nada elegido todavía.
  if (!stage) {
    return isHost ? (
      <SourcePicker
        onSubmitLink={onSubmitLink}
        onPickLocalFile={onPickLocalFile}
        onOpenFullBrowser={onOpenFullBrowser}
        creatingBrowser={creatingBrowser}
        browserError={browserError}
      />
    ) : (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-6 text-center">
        <Clapperboard className="h-9 w-9 text-primary" aria-hidden="true" />
        <p className="font-medium">Esperando al anfitrión</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          En cuanto elija qué ver, aparecerá aquí y se reproducirá en sincronía.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col gap-2">
      <div className="flex items-center justify-between gap-2 rounded-xl bg-card px-3 py-2">
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          Viendo: <span className="font-medium text-foreground">{stage.label}</span>
        </p>
        {isHost && (
          <button
            type="button"
            onClick={onChangeSource}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-medium text-secondary-foreground transition hover:bg-accent"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Cambiar
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1">
        {stage.kind === "youtube" && (
          <SyncYouTube
            ref={playerRef}
            videoId={stage.src}
            isHost={isHost}
            playback={playback}
            onHostState={onHostState}
          />
        )}

        {stage.kind === "video" && (
          <SyncVideo ref={playerRef} src={stage.src} isHost={isHost} playback={playback} onHostState={onHostState} />
        )}

        {stage.kind === "local" &&
          (localUrl ? (
            <SyncVideo ref={playerRef} src={localUrl} isHost={isHost} playback={playback} onHostState={onHostState} />
          ) : (
            <LocalFilePrompt fileName={stage.src} onPickLocalFile={onPickLocalFile} />
          ))}

        {stage.kind === "web" && <WebFrame url={stage.src} />}

        {stage.kind === "hyperbeam" && (
          <SharedBrowser
            ref={browserRef}
            embedUrl={embedUrl}
            isHost={isHost}
            onCreateSession={onOpenFullBrowser}
            creating={creatingBrowser}
            errorMessage={browserError}
          />
        )}
      </div>
    </div>
  )
}

/** El archivo no viaja por la red: cada quien abre su propia copia. */
function LocalFilePrompt({
  fileName,
  onPickLocalFile,
}: {
  fileName: string
  onPickLocalFile: (file: File) => void
}) {
  const fileRef = useRef<HTMLInputElement | null>(null)

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-6 text-center">
      <FolderOpen className="h-9 w-9 text-primary" aria-hidden="true" />
      <p className="font-medium text-pretty">{`El anfitrión está viendo "${fileName}"`}</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        Abre tu copia del mismo archivo y la reproducción quedará sincronizada.
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onPickLocalFile(file)
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        <FolderOpen className="h-4 w-4" aria-hidden="true" />
        Elegir mi archivo
      </button>
    </div>
  )
}
