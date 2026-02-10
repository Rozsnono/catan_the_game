import { NextResponse } from 'next/server'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { dbConnect } from '@/lib/mongodb'
import { MapTemplate } from '@/models/MapTemplate'

const HexCoord = z.object({ q: z.number().int(), r: z.number().int() })
const TemplatePort = z.object({
  q: z.number().int(),
  r: z.number().int(),
  edge: z.number().int().min(0).max(5),
  kind: z.enum(['threeToOne', 'wood', 'brick', 'wheat', 'sheep', 'ore', 'random']),
})

const CreateBody = z.object({
  name: z.string().min(2).max(32),
  hexes: z.array(HexCoord).min(1).max(200),
  ports: z.array(TemplatePort).max(30).optional(),
})

export async function GET() {
  await dbConnect()
  const templates = await MapTemplate.find({}, { _id: 1, name: 1, hexes: 1, ports: 1, createdAt: 1, updatedAt: 1 })
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean()
  return NextResponse.json({ templates })
}

export async function POST(req: Request) {
  const body = CreateBody.parse(await req.json())
  await dbConnect()
  const id = nanoid(10)
  const t = await MapTemplate.create({
    _id: id,
    name: body.name.trim(),
    hexes: body.hexes,
    ports: body.ports ?? [],
  })
  return NextResponse.json({ templateId: t._id })
}
