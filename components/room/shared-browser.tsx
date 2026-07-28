"use client"

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react"
import { Loader2, MonitorPlay, AlertTriangle } from "lucide-react"

export type HyperbeamHandle = {
  sendEvent: (event: Record<string, unknown>) => void
}

type SharedBrowserProps = {
  embedUrl: string | null
  isHost: boolean
  onCreateSession?: () => void
  creating: boolean
  errorMessage: string | null
}

export const SharedBrowser = forwardRef<HyperbeamHandle, SharedBrowserProps>(function SharedBrowser(
  { embedUrl, isHost, onCreateSession, creating, errorMessage },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const hbRef = useRef<{ sendEvent?: (e: unknown) => void; destroy?: () => void } | null>(null)
  const [loading, setLoading] = useState(false)

  useImperativeHandle(ref, () => ({
    sendEvent(event) {
      try {
        hbRef.current?.sendEvent?.(event)
      } catch {
        // ignora eventos no soportados
      }
    },
  }))

  useEffect(() => {
    let cancelled = false

    async function init() {
      if (!embedUrl || !containerRef.current) return
      setLoading(true)
      try {
        const Hyperbeam = (await import("@hyperbeam/web")).default
        if (cancelled || !containerRef.current) return
        const hb = await Hyperbeam(containerRef.current, embedUrl, {
          // ambos participantes pueden controlar el navegador
          delegateKeyboard: true,
        })
        const instance = hb as { destroy?: () => void }
        if (cancelled) {
          instance?.destroy?.()
          return
        }
        hbRef.current = hb as never
      } catch (err) {
        console.log("[v0] Error al iniciar Hyperbeam:", err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    init()

    return () => {
      cancelled = true
      try {
        hbRef.current?.destroy?.()
      } catch {
        // noop
      }
      hbRef.current = null
      if (containerRef.current) containerRef.current.innerHTML = ""
    }
  }, [embedUrl])

  // Estado: sin sesión todavía
  if (!embedUrl) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
          {creating ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
          ) : errorMessage ? (
            <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
          ) : (
            <MonitorPlay className="h-8 w-8 text-primary" aria-hidden="true" />
          )}
        </div>

        {errorMessage ? (
          <div className="max-w-sm">
            <p className="font-medium text-destructive">No se pudo abrir el navegador</p>
            <p className="mt-1 text-sm text-muted-foreground">{errorMessage}</p>
          </div>
        ) : creating ? (
          <p className="text-sm text-muted-foreground">Abriendo el navegador compartido...</p>
        ) : isHost ? (
          <div className="max-w-sm">
            <p className="font-medium">Inicia el navegador compartido</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Se abrirá un Chrome real que ambos pueden ver y controlar. Podrás entrar a Stremio, YouTube, tu servicio de
              streaming favorito y más.
            </p>
            <button
              type="button"
              onClick={onCreateSession}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:opacity-90 active:scale-[0.99]"
            >
              <MonitorPlay className="h-4 w-4" aria-hidden="true" />
              Abrir navegador
            </button>
          </div>
        ) : (
          <p className="max-w-sm text-sm text-muted-foreground">
            Esperando a que el anfitrión abra el navegador compartido...
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border bg-black">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        </div>
      )}
      <div ref={containerRef} className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full" />
    </div>
  )
})
