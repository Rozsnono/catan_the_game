import { EventEmitter } from 'events'

// In-memory pub/sub to deliver near real-time updates via SSE.
// Works for a single Node process (typical "play with friends" hosting).
const emitter = new EventEmitter()
emitter.setMaxListeners(0)

function topic(gameId: string) {
  return `game:${gameId}`
}

export type GameUpdateEvent = {
  type: 'update'
  gameId: string
  at: number
}

export function publishGameUpdate(gameId: string) {
  const evt: GameUpdateEvent = { type: 'update', gameId, at: Date.now() }
  emitter.emit(topic(gameId), evt)
}

export function onGameUpdate(gameId: string, handler: (evt: GameUpdateEvent) => void) {
  const t = topic(gameId)
  emitter.on(t, handler)
  return () => emitter.off(t, handler)
}
