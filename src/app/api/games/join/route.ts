import { NextResponse } from 'next/server'
import { z } from 'zod'
import { dbConnect } from '@/lib/mongodb'
import { Game } from '@/models/Game'
import { addPlayer, startIfPossible } from '@/lib/gameLogic'

const Body = z.object({ gameId: z.string().min(4), name: z.string().min(2).max(24) })

export async function POST(req: Request) {
  const body = Body.parse(await req.json())
  await dbConnect()

  const game = await Game.findById(body.gameId)
  if (!game) return new NextResponse('Nincs ilyen játék.', { status: 404 })

  const playerId = addPlayer(game as any, body.name.trim())
  startIfPossible(game as any) // auto-start when 2nd player joins
  await game.save()

  return NextResponse.json({ gameId: game._id, playerId })
}
