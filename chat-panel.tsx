"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Send } from "lucide-react"
import { cn } from "@/lib/utils"

export type ChatMessage = {
  id: string
  name: string
  text: string
  ts: number
  self: boolean
  system?: boolean
}

type ChatPanelProps = {
  messages: ChatMessage[]
  onSend: (text: string) => void
}

export function ChatPanel({ messages, onSend }: ChatPanelProps) {
  const [text, setText] = useState("")
  const composingRef = useRef(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  function submit() {
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed)
    setText("")
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return
    if (composingRef.current || e.nativeEvent.isComposing || e.keyCode === 229) return
    e.preventDefault()
    submit()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Aún no hay mensajes. ¡Escribe algo lindo!
          </p>
        )}
        {messages.map((m) =>
          m.system ? (
            <p key={m.id} className="text-center text-xs text-muted-foreground">
              {m.text}
            </p>
          ) : (
            <div key={m.id} className={cn("flex flex-col", m.self ? "items-end" : "items-start")}>
              {!m.self && <span className="mb-0.5 px-1 text-xs text-muted-foreground">{m.name}</span>}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                  m.self
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "rounded-bl-sm bg-secondary text-secondary-foreground",
                )}
              >
                {m.text}
              </div>
            </div>
          ),
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => (composingRef.current = true)}
            onCompositionEnd={() => (composingRef.current = false)}
            placeholder="Escribe un mensaje..."
            className="flex-1 rounded-full border border-input bg-background px-4 py-2.5 text-sm outline-none ring-ring/50 transition placeholder:text-muted-foreground focus:ring-2"
          />
          <button
            type="button"
            onClick={submit}
            aria-label="Enviar mensaje"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90 active:scale-95"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
