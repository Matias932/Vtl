"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Copy, Check, MessageCircle, SlidersHorizontal, Users, Crown, LogOut, Film } from "lucide-react"
import { openChannel, type RealtimeChannel } from "@/lib/realtime/channel"
import { detectSource, type Stage } from "@/lib/media"
import { StageView } from "./stage-view"
import type { HyperbeamHandle } from "./shared-browser"
import type { PlaybackState, PlayerHandle } from "./sync-video"
import { ChatPanel, type ChatMessage } from "./chat-panel"
import { VirtualControls } from "./virtual-controls"
import { PlayerControls } from "./player-controls"
import { VoiceCall } from "./voice-call"
import { cn } from "@/lib/utils"

type Member = { id: string; name: string; host: boolean }

type RoomShellProps = {
  code: string
  name: string
  isHost: boolean
}

type SidebarTab = "chat" | "controls" | "people"

export function RoomShell({ code, name, isHost }: RoomShellProps) {
  const selfId = useMemo(() => (typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36)), [])
  const browserRef = useRef<HyperbeamHandle | null>(null)
  const playerRef = useRef<PlayerHandle | null>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [connected, setConnected] = useState(false)
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState<SidebarTab>("chat")

  const [stage, setStage] = useState<Stage | null>(null)
  const [playback, setPlayback] = useState<PlaybackState | null>(null)
  const [localUrl, setLocalUrl] = useState<string | null>(null)

  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const [creatingBrowser, setCreatingBrowser] = useState(false)
  const [browserError, setBrowserError] = useState<string | null>(null)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const seqRef = useRef(0)
  // Espejos para responder a quien entra tarde sin re-suscribir el canal.
  const stageRef = useRef<Stage | null>(null)
  stageRef.current = stage
  const embedUrlRef = useRef<string | null>(null)
  embedUrlRef.current = embedUrl

  // Libera la URL del archivo local al cambiarla o salir.
  useEffect(() => {
    return () => {
      if (localUrl) URL.revokeObjectURL(localUrl)
    }
  }, [localUrl])

  // --- Canal de tiempo real: presencia, chat, escenario y reproducción ---
  useEffect(() => {
    const channel = openChannel({
      channel: `room-${code}`,
      clientId: selfId,
      meta: { id: selfId, name, host: isHost },
      onOpen: () => {
        setConnected(true)
        if (!isHost) channel.send("stage-request", { from: selfId })
      },
      onClose: () => setConnected(false),
    })
    channelRef.current = channel

    channel.on("presence", (payload: { members: Member[] }) => {
      setMembers(payload?.members ?? [])
    })

    channel.on("chat", (payload: { id: string; name: string; text: string; ts: number }) => {
      setMessages((prev) => [
        ...prev,
        { id: payload.id, name: payload.name, text: payload.text, ts: payload.ts, self: false },
      ])
    })

    channel.on("stage", (payload: { stage: Stage | null; embed_url?: string | null }) => {
      setStage(payload?.stage ?? null)
      setPlayback(null)
      if (payload?.embed_url !== undefined) setEmbedUrl(payload.embed_url ?? null)
    })

    channel.on("playback", (payload: PlaybackState) => {
      if (!payload) return
      console.log("[v0] playback recibido:", payload)
      setPlayback((prev) => (prev && payload.seq < prev.seq ? prev : payload))
    })

    // El anfitrión pone al día a quien acaba de entrar.
    channel.on("stage-request", () => {
      if (!isHost) return
      channel.send("stage", { stage: stageRef.current, embed_url: embedUrlRef.current })
      const state = playerRef.current?.getState()
      if (state) {
        seqRef.current += 1
        channel.send("playback", { ...state, at: Date.now(), seq: seqRef.current })
      }
    })

    return () => {
      channel.close()
      channelRef.current = null
      setConnected(false)
    }
  }, [code, name, isHost, selfId])

  // --- Acciones del anfitrión ---
  const publishStage = useCallback((next: Stage | null) => {
    setStage(next)
    setPlayback(null)
    channelRef.current?.send("stage", { stage: next })
  }, [])

  const handleSubmitLink = useCallback(
    (raw: string) => {
      const detected = detectSource(raw)
      if (detected) publishStage(detected)
    },
    [publishStage],
  )

  const handlePickLocalFile = useCallback(
    (file: File) => {
      setLocalUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(file)
      })
      // Solo el anfitrión define el escenario; el invitado únicamente abre su copia.
      if (isHost) publishStage({ kind: "local", src: file.name, label: file.name })
    },
    [isHost, publishStage],
  )

  const handleChangeSource = useCallback(() => {
    setLocalUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setEmbedUrl(null)
    setBrowserError(null)
    publishStage(null)
  }, [publishStage])

  const handleHostState = useCallback((state: { playing: boolean; time: number }) => {
    seqRef.current += 1
    channelRef.current?.send("playback", { ...state, at: Date.now(), seq: seqRef.current })
  }, [])

  const handleResync = useCallback(() => {
    const state = playerRef.current?.getState()
    if (state) handleHostState(state)
  }, [handleHostState])

  const handleOpenFullBrowser = useCallback(async () => {
    setCreatingBrowser(true)
    setBrowserError(null)
    try {
      const res = await fetch("/api/hyperbeam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) {
        setBrowserError(data?.message || "No se pudo crear la sesión.")
        return
      }
      setEmbedUrl(data.embed_url)
      const next: Stage = { kind: "hyperbeam", src: data.embed_url, label: "Navegador compartido" }
      setStage(next)
      setPlayback(null)
      channelRef.current?.send("stage", { stage: next, embed_url: data.embed_url })
    } catch {
      setBrowserError("Error de red al crear la sesión.")
    } finally {
      setCreatingBrowser(false)
    }
  }, [])

  const sendMessage = useCallback(
    (text: string) => {
      const msg = { id: crypto.randomUUID(), name, text, ts: Date.now() }
      setMessages((prev) => [...prev, { ...msg, self: true }])
      channelRef.current?.send("chat", msg)
    },
    [name],
  )

  function copyCode() {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const isPlayerStage = stage?.kind === "youtube" || stage?.kind === "video" || stage?.kind === "local"

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-2 border-b border-border bg-card px-3 py-2.5 md:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            href="/"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"
            aria-label="Inicio"
          >
            <Film className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div className="min-w-0">
            <button
              type="button"
              onClick={copyCode}
              className="flex items-center gap-1.5 text-sm font-semibold transition hover:text-primary"
              title="Copiar código de sala"
            >
              Sala {code}
              {copied ? (
                <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              )}
            </button>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <span
                className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-primary" : "bg-muted-foreground")}
                aria-hidden="true"
              />
              {connected ? `${members.length} en la sala` : "Conectando..."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <VoiceCall roomCode={code} selfId={selfId} />
          <Link
            href="/"
            aria-label="Salir de la sala"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-h-0 shrink-0 p-2 md:p-3 lg:min-h-full lg:flex-1">
          {/* Los videos respetan 16:9; el navegador y el selector necesitan más alto en móvil. */}
          <div className={cn("w-full lg:aspect-auto lg:h-full", isPlayerStage ? "aspect-video" : "h-[58vh]")}>
            <StageView
              stage={stage}
              isHost={isHost}
              playback={playback}
              onHostState={handleHostState}
              playerRef={playerRef}
              localUrl={localUrl}
              onPickLocalFile={handlePickLocalFile}
              onSubmitLink={handleSubmitLink}
              onChangeSource={handleChangeSource}
              embedUrl={embedUrl}
              browserRef={browserRef}
              creatingBrowser={creatingBrowser}
              browserError={browserError}
              onOpenFullBrowser={handleOpenFullBrowser}
            />
          </div>
        </div>

        <aside className="flex min-h-0 flex-1 flex-col border-t border-border bg-card lg:w-[360px] lg:flex-none lg:border-l lg:border-t-0">
          <div className="grid grid-cols-3 gap-1 border-b border-border p-2">
            <TabButton
              active={tab === "chat"}
              onClick={() => setTab("chat")}
              icon={<MessageCircle className="h-4 w-4" />}
            >
              Chat
            </TabButton>
            <TabButton
              active={tab === "controls"}
              onClick={() => setTab("controls")}
              icon={<SlidersHorizontal className="h-4 w-4" />}
            >
              Controles
            </TabButton>
            <TabButton active={tab === "people"} onClick={() => setTab("people")} icon={<Users className="h-4 w-4" />}>
              Personas
            </TabButton>
          </div>

          <div className="min-h-0 flex-1">
            {tab === "chat" && <ChatPanel messages={messages} onSend={sendMessage} />}
            {tab === "controls" &&
              (stage?.kind === "hyperbeam" ? (
                <VirtualControls browserRef={browserRef} disabled={!embedUrl} />
              ) : (
                <PlayerControls
                  playerRef={playerRef}
                  isHost={isHost}
                  active={Boolean(isPlayerStage)}
                  onResync={handleResync}
                />
              ))}
            {tab === "people" && <PeopleList members={members} selfId={selfId} />}
          </div>
        </aside>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition sm:text-sm",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}

function PeopleList({ members, selfId }: { members: Member[]; selfId: string }) {
  return (
    <div className="p-4">
      <ul className="space-y-2">
        {members.length === 0 && <li className="text-sm text-muted-foreground">Nadie más por ahora.</li>}
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 rounded-xl bg-secondary/60 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {(m.name?.slice(0, 1) || "").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {m.name}
                {m.id === selfId && <span className="text-muted-foreground"> (tú)</span>}
              </p>
            </div>
            {m.host && (
              <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2 py-1 text-xs font-medium text-primary">
                <Crown className="h-3 w-3" aria-hidden="true" />
                Anfitrión
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
