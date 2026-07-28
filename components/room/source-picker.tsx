"use client"

import type React from "react"
import { useRef, useState } from "react"
import { Link2, FolderOpen, PlaySquare, Globe, MonitorPlay, Loader2 } from "lucide-react"
import { detectSource } from "@/lib/media"

type SourcePickerProps = {
  onSubmitLink: (raw: string) => void
  onPickLocalFile: (file: File) => void
  onOpenFullBrowser: () => void
  creatingBrowser: boolean
  browserError: string | null
}

export function SourcePicker({
  onSubmitLink,
  onPickLocalFile,
  onOpenFullBrowser,
  creatingBrowser,
  browserError,
}: SourcePickerProps) {
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const detected = detectSource(value)
    if (!detected) {
      setError("Escribe un enlace válido, por ejemplo un video de YouTube.")
      return
    }
    setError(null)
    setValue("")
    onSubmitLink(value)
  }

  return (
    <div className="flex h-full w-full flex-col justify-center gap-5 overflow-y-auto rounded-2xl border border-border bg-card p-5">
      <div>
        <h2 className="text-lg font-semibold text-pretty">¿Qué vemos hoy?</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Pega un enlace y se reproduce igual en los dos dispositivos. Tú controlas play, pausa y el minuto exacto.
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-input bg-background px-3">
          <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="source-link" className="sr-only">
            Enlace del video o sitio
          </label>
          <input
            id="source-link"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Pega un enlace de YouTube o video"
            className="flex-1 bg-transparent py-3 text-base outline-none placeholder:text-muted-foreground"
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button
          type="submit"
          className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-90 active:scale-[0.99]"
        >
          Reproducir juntos
        </button>
      </form>

      <div className="flex flex-col gap-2">
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
          className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-left text-sm font-medium text-secondary-foreground transition hover:bg-accent"
        >
          <FolderOpen className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            Abrir un archivo de mi dispositivo
            <span className="block text-xs font-normal text-muted-foreground">
              Cada uno abre su copia y la reproducción va sincronizada
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={onOpenFullBrowser}
          disabled={creatingBrowser}
          className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3 text-left text-sm font-medium text-secondary-foreground transition hover:bg-accent disabled:opacity-60"
        >
          {creatingBrowser ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
          ) : (
            <MonitorPlay className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          )}
          <span>
            Navegador completo en la nube
            <span className="block text-xs font-normal text-muted-foreground">
              Chrome real que ambos controlan · requiere clave de Hyperbeam
            </span>
          </span>
        </button>
        {browserError && <p className="text-xs text-destructive">{browserError}</p>}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <PlaySquare className="h-3.5 w-3.5" aria-hidden="true" />
          YouTube
        </span>
        <span className="flex items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
          {"Video directo (mp4, m3u8)"}
        </span>
        <span className="flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5" aria-hidden="true" />
          Sitios que permiten embebido
        </span>
      </div>
    </div>
  )
}
