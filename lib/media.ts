// Utilidades para reconocer qué tipo de contenido puso el anfitrión.

export type StageKind = "video" | "youtube" | "local" | "web" | "hyperbeam"

export type Stage = {
  kind: StageKind
  /** URL del video, id de YouTube, URL del sitio o nombre del archivo local. */
  src: string
  /** Texto para mostrar en la interfaz. */
  label: string
}

const VIDEO_EXT = /\.(mp4|webm|ogv|ogg|mov|m4v|m3u8|mpd)(\?|#|$)/i

export function isHls(url: string): boolean {
  return /\.m3u8(\?|#|$)/i.test(url)
}

export function youtubeId(raw: string): string | null {
  const value = raw.trim()
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/i,
    /(?:youtu\.be\/)([\w-]{11})/i,
    /(?:youtube\.com\/embed\/)([\w-]{11})/i,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/i,
    /(?:youtube\.com\/live\/)([\w-]{11})/i,
  ]
  for (const pattern of patterns) {
    const match = value.match(pattern)
    if (match) return match[1]
  }
  // Un id pegado directamente.
  if (/^[\w-]{11}$/.test(value)) return value
  return null
}

export function normalizeUrl(raw: string): string {
  const value = raw.trim()
  if (!value) return ""
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value}`
}

/** Adivina el tipo de fuente a partir de lo que escribió el anfitrión. */
export function detectSource(raw: string): Stage | null {
  const value = raw.trim()
  if (!value) return null

  const yt = youtubeId(value)
  if (yt) return { kind: "youtube", src: yt, label: "YouTube" }

  const url = normalizeUrl(value)
  let host = ""
  try {
    host = new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return null
  }

  if (VIDEO_EXT.test(url)) {
    return { kind: "video", src: url, label: host }
  }
  return { kind: "web", src: url, label: host }
}
