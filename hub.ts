// Hub de tiempo real en memoria: canales, difusión de eventos y presencia.
// Vive en el proceso del servidor, así no necesitamos servicios externos ni claves.

type Subscriber = {
  clientId: string
  send: (data: string) => void
  meta: Record<string, unknown> | null
}

type Channel = {
  subscribers: Map<string, Subscriber>
}

// Guardamos el hub en globalThis para que sobreviva a los recargues de HMR en desarrollo.
const globalForHub = globalThis as unknown as {
  __watchHub?: Map<string, Channel>
}

const channels: Map<string, Channel> = (globalForHub.__watchHub ??= new Map())

function getChannel(name: string): Channel {
  let channel = channels.get(name)
  if (!channel) {
    channel = { subscribers: new Map() }
    channels.set(name, channel)
  }
  return channel
}

function serialize(event: string, payload: unknown): string {
  return `data: ${JSON.stringify({ event, payload })}\n\n`
}

/** Difunde un evento a todos los suscriptores del canal, opcionalmente excluyendo al emisor. */
export function publish(channelName: string, event: string, payload: unknown, excludeClientId?: string) {
  const channel = channels.get(channelName)
  if (!channel) return

  const frame = serialize(event, payload)
  for (const sub of channel.subscribers.values()) {
    if (excludeClientId && sub.clientId === excludeClientId) continue
    try {
      sub.send(frame)
    } catch {
      channel.subscribers.delete(sub.clientId)
    }
  }
}

/** Lista actual de miembros del canal (para presencia). */
export function getPresence(channelName: string): Record<string, unknown>[] {
  const channel = channels.get(channelName)
  if (!channel) return []
  return [...channel.subscribers.values()].filter((s) => s.meta !== null).map((s) => s.meta as Record<string, unknown>)
}

function broadcastPresence(channelName: string) {
  publish(channelName, "presence", { members: getPresence(channelName) })
}

export function subscribe(
  channelName: string,
  clientId: string,
  meta: Record<string, unknown> | null,
  send: (data: string) => void,
): () => void {
  const channel = getChannel(channelName)

  // Si el mismo cliente ya estaba (reconexión), reemplazamos su suscripción.
  channel.subscribers.set(clientId, { clientId, send, meta })
  broadcastPresence(channelName)

  return () => {
    const current = channels.get(channelName)
    if (!current) return
    current.subscribers.delete(clientId)
    if (current.subscribers.size === 0) {
      channels.delete(channelName)
    } else {
      broadcastPresence(channelName)
    }
  }
}
