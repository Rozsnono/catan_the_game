import { NextResponse } from 'next/server'
import { z } from 'zod'
import { dbConnect } from '@/lib/mongodb'
import { Game } from '@/models/Game'

const Query = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export async function GET(req: Request) {
  const url = new URL(req.url)
  const { limit } = Query.parse(Object.fromEntries(url.searchParams.entries()))

  await dbConnect()

  const games = await Game.find({ phase: { $in: ['lobby', 'setup', 'main'] } })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select('_id phase players updatedAt createdAt turnNumber setupStep')
    .lean()

  return NextResponse.json({
    games: games.map((g: any) => ({
      gameId: g._id,
      phase: g.phase,
      turnNumber: g.turnNumber ?? 1,
      setupStep: g.setupStep ?? null,
      players: (g.players || []).map((p: any) => ({ _id: p._id, name: p.name, color: p.color })),
      playerCount: (g.players || []).length,
      updatedAt: g.updatedAt,
      createdAt: g.createdAt,
    })),
  })
}
