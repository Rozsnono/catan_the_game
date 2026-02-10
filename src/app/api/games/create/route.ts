import { NextResponse } from 'next/server'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { dbConnect } from '@/lib/mongodb'
import { Game } from '@/models/Game'
import { addPlayer } from '@/lib/gameLogic'

const Body = z.object({
  name: z.string().min(2).max(24),
  mapType: z.enum(['classic','large','islands','world']).optional(),
  templateId: z.string().min(3).optional(),
  maxVictoryPoints: z.coerce.number().int().min(5).max(20).optional(),
  maxPlayers: z.coerce.number().int().min(2).max(4).optional(),
})

export async function POST(req: Request) {
  const body = Body.parse(await req.json())
  await dbConnect()
  const gameId = nanoid(8)
  const isCustom = !!body.templateId
  const game = new Game({
    _id: gameId,
    mapType: isCustom ? 'custom' : body.mapType ?? 'classic',
    mapTemplateId: body.templateId ?? null,
    settings: { maxVictoryPoints: body.maxVictoryPoints ?? 10, maxPlayers: body.maxPlayers ?? 4 },
    phase: 'lobby',
    setupStep: 'place_settlement',
    currentPlayerId: null,
    tiles: [],
    players: [],
    nodes: [],
    edges: [],
    log: [],
    chat: [],
  })
  const playerId = addPlayer(game as any, body.name.trim())
  await game.save()
  return NextResponse.json({ gameId, playerId })
}
