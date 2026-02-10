import { NextResponse } from 'next/server'
import { z } from 'zod'
import { dbConnect } from '@/lib/mongodb'
import { MapTemplate } from '@/models/MapTemplate'

const HexCoord = z.object({ q: z.number().int(), r: z.number().int() })
const TemplatePort = z.object({
  q: z.number().int(),
  r: z.number().int(),
  edge: z.number().int().min(0).max(5),
  kind: z.enum(['threeToOne', 'wood', 'brick', 'wheat', 'sheep', 'ore', 'random']),
})

const UpdateBody = z.object({
  name: z.string().min(2).max(32).optional(),
  hexes: z.array(HexCoord).min(1).max(200).optional(),
  ports: z.array(TemplatePort).max(30).optional(),
})

export async function PUT(req: Request, { params }: { params: { templateId: string } }) {
  const body = UpdateBody.parse(await req.json())
  await dbConnect()
  const t = await MapTemplate.findById(params.templateId)
  if (!t) return new NextResponse('Nincs ilyen sablon.', { status: 404 })
  if (body.name !== undefined) (t as any).name = body.name.trim()
  if (body.hexes !== undefined) (t as any).hexes = body.hexes
  if (body.ports !== undefined) (t as any).ports = body.ports
  await t.save()
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: { templateId: string } }) {
  await dbConnect()
  await MapTemplate.findByIdAndDelete(params.templateId)
  return NextResponse.json({ ok: true })
}
