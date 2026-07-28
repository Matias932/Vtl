"use client"

// Cliente de tiempo real basado en Server-Sent Events.
// No requiere claves ni servicios externos: habla con /api/realtime.

export type ChannelHandler = (payload: any) => void

export type RealtimeChannel = {
  on: (event: string, handler: ChannelHandler) => void
  send: (event: string, payload?: unknown, options?: { echo?: boolean }) => void
  close: () => void
}

export function openChannel(options: {
  channel: string
  clientId: string
  meta?: Record<string, unknown>
  onOpen?: () => void
  onClose?: () => void
}): RealtimeChannel {
  const { channel, clientId, meta, onOpen, onClose } = options
  const handlers = new Map<string, Set<ChannelHandler>>()

  const params = new URLSearchParams({ channel, client: clientId })
  if (meta) params.set("meta", JSON.stringify(meta))

  const source = new EventSource(`/api/realtime?${params.toString()}`)

  source.onmessage = (e) => {
    let parsed: { event: string; payload: unknown }
    try {
      parsed = JSON.parse(e.data)
    } catch {
      return
    }
    if (parsed.event === "ready") {
      onOpen?.()
      return
    }
    handlers.get(parsed.event)?.forEach((handler) => handler(parsed.payload))
  }

  source.onerror = () => {
    // EventSource reintenta automáticamente; solo avisamos del corte.
    if (source.readyState === EventSource.CLOSED) onClose?.()
  }

  return {
    on(event, handler) {
      let set = handlers.get(event)
      if (!set) {
        set = new Set()
        handlers.set(event, set)
      }
      set.add(handler)
    },
    send(event, payload, sendOptions) {
      void fetch("/api/realtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          event,
          payload,
          from: clientId,
          echo: sendOptions?.echo ?? false,
        }),
        keepalive: true,
      }).catch(() => {})
    },
    close() {
      handlers.clear()
      source.close()
      onClose?.()
    },
  }
}
