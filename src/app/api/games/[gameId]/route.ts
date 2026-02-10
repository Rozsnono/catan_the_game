import { NextResponse } from 'next/server'
import { dbConnect } from '@/lib/mongodb'
import { Game } from '@/models/Game'
import { sanitizeForClient } from '@/lib/gameLogic'

export async function GET(req: Request, { params }: { params: { gameId: string } }) {
  const url = new URL(req.url)
  const playerId = url.searchParams.get('playerId') ?? undefined
  await dbConnect()
  const game = await Game.findById(params.gameId)
  if (!game) return new NextResponse('Nincs ilyen játék.', { status: 404 })
  return NextResponse.json(sanitizeForClient(game as any, playerId))
}
