import { NextResponse } from 'next/server'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { dbConnect } from '@/lib/mongodb'
import { Game } from '@/models/Game'
import { addPlayer } from '@/lib/gameLogic'

const Body = z.object({ name: z.string().min(2).max(24) })

export async function POST(req: Request) {
  const body = Body.parse(await req.json())
  await dbConnect()
  const gameId = nanoid(8)
  const game = new Game({ _id: gameId, phase: 'lobby', setupStep: 'place_settlement', currentPlayerId: null, tiles: [], players: [], nodes: [], edges: [], log: [], chat: [] })
  const playerId = addPlayer(game as any, body.name.trim())
  await game.save()
  return NextResponse.json({ gameId, playerId })
}
