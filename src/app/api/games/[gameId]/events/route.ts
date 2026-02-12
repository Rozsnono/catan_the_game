import { onGameUpdate } from '@/lib/realtimeBus'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { gameId: string } }) {
  const encoder = new TextEncoder()
  const gameId = params.gameId

  let keepAlive: any = null
  let unsubscribe: null | (() => void) = null

  const stream = new ReadableStream({
    start(controller) {
      const send = (obj: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))
      }

      // Initial hello so clients know the channel is alive.
      send({ type: 'hello', gameId, at: Date.now() })

      unsubscribe = onGameUpdate(gameId, (evt) => send(evt))

      // Keep-alive ping every 15s to reduce proxy timeouts.
      keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`))
        } catch {
          // ignore
        }
      }, 15000)
    },
    cancel() {
      if (keepAlive) clearInterval(keepAlive)
      if (unsubscribe) unsubscribe()
      keepAlive = null
      unsubscribe = null
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
