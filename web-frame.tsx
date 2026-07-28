"use client"

import { useEffect, useState } from "react"
import { ExternalLink, ShieldAlert } from "lucide-react"

type WebFrameProps = {
  url: string
}

export function WebFrame({ url }: WebFrameProps) {
  const [loaded, setLoaded] = useState(false)
  const [slow, setSlow] = useState(false)

  // Si a los 4s no cargó nada, casi siempre es porque el sitio bloquea el embebido.
  useEffect(() => {
    setLoaded(false)
    setSlow(false)
    const timer = window.setTimeout(() => setSlow(true), 4000)
    return () => window.clearTimeout(timer)
  }, [url])

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-black">
      <iframe
        src={url}
        title="Sitio compartido"
        onLoad={() => setLoaded(true)}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
        referrerPolicy="no-referrer"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        className="h-full w-full flex-1 bg-black"
      />

      {!loaded && slow && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card p-6 text-center">
          <ShieldAlert className="h-9 w-9 text-destructive" aria-hidden="true" />
          <p className="font-medium">Este sitio no permite ser embebido</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Muchos sitios de streaming bloquean mostrarse dentro de otra web. Ábrelo en una pestaña y usen el chat y la
            llamada para verlo a la par.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Abrir en pestaña nueva
          </a>
        </div>
      )}
    </div>
  )
}
