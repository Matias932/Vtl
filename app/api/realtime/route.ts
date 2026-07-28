import type { NextRequest } from "next/server"
import { publish, subscribe } from "@/lib/realtime/hub"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
// Mantenemos el stream abierto el mayor tiempo posible.
export const maxDuration = 300

/** GET: abre un stream SSE para escuchar los eventos del canal. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const channel = searchParams.get("channel")
  const clientId = searchParams.get("client")
  const metaRaw = searchParams.get("meta")

  if (!channel || !clientId) {
    return new Response("channel y client son obligatorios", { status: 400 })
  }

  let meta: Record<string, unknown> | null = null
  if (metaRaw) {
    try {
      meta = JSON.parse(metaRaw)
    } catch {
      meta = null
    }
  }

  const encoder = new TextEncoder()
  let unsubscribe: (() => void) | null = null
  let heartbeat: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream({
    start(controller) {
      let closed = false
      const push = (data: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(data))
        } catch {
          closed = true
        }
      }

      push(`retry: 2000\n\n`)
      push(`data: ${JSON.stringify({ event: "ready", payload: { clientId } })}\n\n`)

      unsubscribe = subscribe(channel, clientId, meta, push)

      // Comentario periódico para que proxies no cierren la conexión.
      heartbeat = setInterval(() => push(`: ping\n\n`), 15000)

      const abort = () => {
        closed = true
        if (heartbeat) clearInterval(heartbeat)
        unsubscribe?.()
        try {
          controller.close()
        } catch {
          // ya estaba cerrado
        }
      }

      req.signal.addEventListener("abort", abort)
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat)
      unsubscribe?.()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}

/** POST: publica un evento en el canal. */
export async function POST(req: NextRequest) {
  let body: { channel?: string; event?: string; payload?: unknown; from?: string; echo?: boolean }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 })
  }

  const { channel, event, payload, from, echo } = body
  if (!channel || !event) {
    return Response.json({ error: "channel y event son obligatorios" }, { status: 400 })
  }

  publish(channel, event, payload, echo ? undefined : from)
  return Response.json({ ok: true })
}
