import { NextResponse } from 'next/server'
import { z } from 'zod'
import { dbConnect } from '@/lib/mongodb'
import { Game } from '@/models/Game'
import {
  acceptTradeOffer,
  addChat,
  buildCity,
  buildRoad,
  buildSettlement,
  buyDevCard,
  cancelTradeOffer,
  createTradeOffer,
  endTurn,
  moveRobber,
  placeRoad,
  placeSettlement,
  playDevCard,
  rejectTradeOffer,
  robberSteal,
  rollDice,
  sanitizeForClient,
  tradeWithBank,
  validateResourceName,
  checkGameEnd,
} from '@/lib/gameLogic'

const Body = z.object({
  playerId: z.string().min(3),
  type: z.enum([
    'place_settlement',
    'place_road',
    'build_settlement',
    'build_road',
    'build_city',
    'roll',
    'end_turn',
    'trade_bank',
    'trade_offer_create',
    'trade_offer_accept',
    'trade_offer_reject',
    'trade_offer_cancel',
    'chat',
    'dev_buy',
    'dev_play',
    'robber_move',
    'robber_steal',
  ]),
  payload: z.any().optional(),
})

export async function POST(req: Request, { params }: { params: { gameId: string } }) {
  const body = Body.parse(await req.json())
  await dbConnect()
  const game = await Game.findById(params.gameId)
  if (!game) return new NextResponse('Nincs ilyen játék.', { status: 404 })

  try {
    switch (body.type) {
      case 'place_settlement': {
        const nodeId = z.string().min(2).parse(body.payload?.nodeId)
        placeSettlement(game as any, body.playerId, nodeId)
        break
      }
      case 'place_road': {
        const edgeId = z.string().min(2).parse(body.payload?.edgeId)
        placeRoad(game as any, body.playerId, edgeId)
        break
      }
      case 'build_settlement': {
        const nodeId = z.string().min(2).parse(body.payload?.nodeId)
        buildSettlement(game as any, body.playerId, nodeId)
        break
      }
      case 'build_road': {
        const edgeId = z.string().min(2).parse(body.payload?.edgeId)
        buildRoad(game as any, body.playerId, edgeId)
        break
      }
      case 'build_city': {
        const nodeId = z.string().min(2).parse(body.payload?.nodeId)
        buildCity(game as any, body.playerId, nodeId)
        break
      }
      case 'roll': {
        rollDice(game as any, body.playerId)
        break
      }
      case 'end_turn': {
        endTurn(game as any, body.playerId)
        break
      }
      case 'trade_bank': {
        const give = z.string().parse(body.payload?.give)
        const get = z.string().parse(body.payload?.get)
        if (!validateResourceName(give) || !validateResourceName(get)) throw new Error('Érvénytelen erőforrás.')
        tradeWithBank(game as any, body.playerId, give, get)
        break
      }
      case 'trade_offer_create': {
        const toPlayerId = body.payload?.toPlayerId === null || body.payload?.toPlayerId === undefined ? null : z.string().min(3).parse(body.payload?.toPlayerId)
        const giveLine = z.any().parse(body.payload?.give)
        const getLine = z.any().parse(body.payload?.get)
        createTradeOffer(game as any, body.playerId, toPlayerId, giveLine, getLine)
        break
      }
      case 'trade_offer_accept': {
        const offerId = z.string().min(3).parse(body.payload?.offerId)
        acceptTradeOffer(game as any, body.playerId, offerId)
        break
      }
      case 'trade_offer_reject': {
        const offerId = z.string().min(3).parse(body.payload?.offerId)
        rejectTradeOffer(game as any, body.playerId, offerId)
        break
      }
      case 'trade_offer_cancel': {
        const offerId = z.string().min(3).parse(body.payload?.offerId)
        cancelTradeOffer(game as any, body.playerId, offerId)
        break
      }

      case 'dev_buy': {
        buyDevCard(game as any, body.playerId)
        break
      }
      case 'dev_play': {
        const cardId = z.string().min(3).parse(body.payload?.cardId)
        const payload = body.payload?.payload
        playDevCard(game as any, body.playerId, cardId, payload)
        break
      }


      case 'robber_move': {
        const tileId = z.string().min(2).parse(body.payload?.tileId)
        moveRobber(game as any, body.playerId, tileId)
        break
      }
      case 'robber_steal': {
        const targetPlayerId = z.string().min(3).parse(body.payload?.targetPlayerId)
        const resource = z.string().parse(body.payload?.resource)
        if (!validateResourceName(resource)) throw new Error('Érvénytelen erőforrás.')
        robberSteal(game as any, body.playerId, targetPlayerId, resource)
        break
      }

      case 'chat': {

        const text = z.string().min(1).max(300).parse(body.payload?.text)
        const p = (game as any).players.find((x: any) => x._id === body.playerId)
        const name = p?.name ?? 'Ismeretlen'
        addChat(game as any, name, body.playerId, text)
        break
      }
    }

    // End game automatically when someone reaches 10 VP.
    // Chat stays usable after finish.
    checkGameEnd(game as any, body.playerId)

    await game.save()
    return NextResponse.json(sanitizeForClient(game as any, body.playerId))
  } catch (e: any) {
    return new NextResponse(e?.message ?? 'Hiba', { status: 400 })
  }
}
