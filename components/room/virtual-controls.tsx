"use client"

import type React from "react"

import { useRef, useState } from "react"
import { MousePointer2, Keyboard, ChevronUp, ChevronDown, CornerDownLeft, Delete } from "lucide-react"
import type { HyperbeamHandle } from "./shared-browser"
import { cn } from "@/lib/utils"

type VirtualControlsProps = {
  browserRef: React.RefObject<HyperbeamHandle | null>
  disabled: boolean
}

export function VirtualControls({ browserRef, disabled }: VirtualControlsProps) {
  const [tab, setTab] = useState<"trackpad" | "keyboard">("trackpad")
  const cursor = useRef({ x: 0.5, y: 0.5 })
  const padRef = useRef<HTMLDivElement | null>(null)
  const last = useRef<{ x: number; y: number } | null>(null)
  const moved = useRef(false)
  const keyInputRef = useRef<HTMLInputElement | null>(null)

  function send(event: Record<string, unknown>) {
    if (disabled) return
    browserRef.current?.sendEvent(event)
  }

  function moveCursor() {
    send({ type: "mousemove", x: cursor.current.x, y: cursor.current.y })
  }

  function click(button: "left" | "right") {
    send({ type: "mousedown", x: cursor.current.x, y: cursor.current.y, button })
    send({ type: "mouseup", x: cursor.current.x, y: cursor.current.y, button })
  }

  function handlePointerDown(e: React.PointerEvent) {
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    last.current = { x: e.clientX, y: e.clientY }
    moved.current = false
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!last.current || !padRef.current) return
    const rect = padRef.current.getBoundingClientRect()
    const dx = (e.clientX - last.current.x) / rect.width
    const dy = (e.clientY - last.current.y) / rect.height
    if (Math.abs(dx) > 0.005 || Math.abs(dy) > 0.005) moved.current = true
    // sensibilidad 1.6x para movernos cómodo por toda la pantalla
    cursor.current.x = Math.min(1, Math.max(0, cursor.current.x + dx * 1.6))
    cursor.current.y = Math.min(1, Math.max(0, cursor.current.y + dy * 1.6))
    last.current = { x: e.clientX, y: e.clientY }
    moveCursor()
  }

  function handlePointerUp() {
    if (!moved.current) {
      // tap = clic izquierdo
      click("left")
    }
    last.current = null
  }

  function scroll(direction: 1 | -1) {
    send({ type: "wheel", deltaX: 0, deltaY: direction * 120, x: cursor.current.x, y: cursor.current.y })
  }

  function sendKey(key: string) {
    send({ type: "keydown", key })
    send({ type: "keyup", key })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    e.preventDefault()
    sendKey(e.key)
  }

  function handleInput(e: React.FormEvent<HTMLInputElement>) {
    // fallback para teclados de móvil que no disparan keydown con la tecla real
    const value = (e.target as HTMLInputElement).value
    const char = value.slice(-1)
    if (char) sendKey(char)
    ;(e.target as HTMLInputElement).value = ""
  }

  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-2 gap-1 border-b border-border p-2">
        <button
          type="button"
          onClick={() => setTab("trackpad")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
            tab === "trackpad" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <MousePointer2 className="h-4 w-4" aria-hidden="true" />
          Mouse
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("keyboard")
            setTimeout(() => keyInputRef.current?.focus(), 50)
          }}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
            tab === "keyboard" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Keyboard className="h-4 w-4" aria-hidden="true" />
          Teclado
        </button>
      </div>

      {disabled && (
        <p className="px-4 pt-3 text-center text-xs text-muted-foreground">
          Abre el navegador compartido para usar los controles.
        </p>
      )}

      {tab === "trackpad" ? (
        <div className="flex flex-1 flex-col gap-3 p-3">
          <div
            ref={padRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="flex flex-1 touch-none select-none items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/60 text-center"
            style={{ minHeight: 160 }}
          >
            <span className="pointer-events-none px-6 text-xs text-muted-foreground">
              Desliza para mover el cursor · toca para hacer clic
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => click("left")}
              className="rounded-xl bg-secondary py-3 text-sm font-medium text-secondary-foreground transition hover:bg-accent active:scale-[0.98]"
            >
              Clic izquierdo
            </button>
            <button
              type="button"
              onClick={() => click("right")}
              className="rounded-xl bg-secondary py-3 text-sm font-medium text-secondary-foreground transition hover:bg-accent active:scale-[0.98]"
            >
              Clic derecho
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => scroll(-1)}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-secondary py-3 text-sm font-medium text-secondary-foreground transition hover:bg-accent active:scale-[0.98]"
            >
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
              Subir
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-secondary py-3 text-sm font-medium text-secondary-foreground transition hover:bg-accent active:scale-[0.98]"
            >
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
              Bajar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-3 p-3">
          <input
            ref={keyInputRef}
            type="text"
            inputMode="text"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="Toca aquí y escribe..."
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none ring-ring/50 focus:ring-2"
          />
          <p className="text-center text-xs text-muted-foreground">
            Lo que escribas aquí se envía al navegador compartido.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => sendKey("Enter")}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-secondary py-3 text-sm font-medium text-secondary-foreground transition hover:bg-accent active:scale-[0.98]"
            >
              <CornerDownLeft className="h-4 w-4" aria-hidden="true" />
              Enter
            </button>
            <button
              type="button"
              onClick={() => sendKey("Backspace")}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-secondary py-3 text-sm font-medium text-secondary-foreground transition hover:bg-accent active:scale-[0.98]"
            >
              <Delete className="h-4 w-4" aria-hidden="true" />
              Borrar
            </button>
            <button
              type="button"
              onClick={() => sendKey(" ")}
              className="rounded-xl bg-secondary py-3 text-sm font-medium text-secondary-foreground transition hover:bg-accent active:scale-[0.98]"
            >
              Espacio
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
