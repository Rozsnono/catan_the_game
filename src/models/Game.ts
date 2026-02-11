import mongoose, { Schema, type InferSchemaType, type HydratedDocument, type Model } from 'mongoose'

const TileSchema = new Schema(
  {
    id: { type: String, required: true },
    q: { type: Number, required: true },
    r: { type: Number, required: true },
    type: { type: String, required: true },
    numberToken: { type: Number, default: null },
    hasRobber: { type: Boolean, default: false },
  },
  { _id: false }
)

const DevCardSchema = new Schema(
  {
    id: { type: String, required: true },
    kind: { type: String, required: true },
    boughtTurn: { type: Number, required: true },
  },
  { _id: false }
)

const PlayerSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    color: { type: String, required: true },
    victoryPoints: { type: Number, default: 0 },
    roads: { type: Number, default: 0 },
    settlements: { type: Number, default: 0 },
    cities: { type: Number, default: 0 },
    resources: {
      wood: { type: Number, default: 0 },
      brick: { type: Number, default: 0 },
      wheat: { type: Number, default: 0 },
      sheep: { type: Number, default: 0 },
      ore: { type: Number, default: 0 },
    },
    ports: {
      threeToOne: { type: Boolean, default: false },
      twoToOne: {
        wood: { type: Boolean, default: false },
        brick: { type: Boolean, default: false },
        wheat: { type: Boolean, default: false },
        sheep: { type: Boolean, default: false },
        ore: { type: Boolean, default: false },
      },
    },
    devCards: { type: [DevCardSchema], default: [] },
    knightsPlayed: { type: Number, default: 0 },
    freeRoadsToPlace: { type: Number, default: 0 },
    longestRoadAward: { type: Boolean, default: false },
  },
  { _id: false }
)

const PortSchema = new Schema(
  {
    id: { type: String, required: true },
    kind: { type: String, required: true }, // 'threeToOne' | resource
    nodeA: { type: String, required: true },
    nodeB: { type: String, required: true },
    mid: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },
  },
  { _id: false }
)

const NodePlacementSchema = new Schema(
  {
    nodeId: { type: String, required: true },
    playerId: { type: String, required: true },
    kind: { type: String, enum: ['settlement', 'city'], required: true },
  },
  { _id: false }
)

const EdgePlacementSchema = new Schema(
  {
    edgeId: { type: String, required: true },
    playerId: { type: String, required: true },
  },
  { _id: false }
)

const LogSchema = new Schema(
  {
    ts: { type: Date, required: true },
    msg: { type: String, required: true },
  },
  { _id: false }
)

const ChatSchema = new Schema(
  {
    ts: { type: Date, required: true },
    playerId: { type: String, default: null },
    name: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
)

const LastRollSchema = new Schema(
  {
    ts: { type: Date, required: true },
    playerId: { type: String, required: true },
    d1: { type: Number, required: true },
    d2: { type: Number, required: true },
    sum: { type: Number, required: true },
  },
  { _id: false }
)

const TradeLineSchema = new Schema(
  {
    wood: { type: Number, default: 0 },
    brick: { type: Number, default: 0 },
    wheat: { type: Number, default: 0 },
    sheep: { type: Number, default: 0 },
    ore: { type: Number, default: 0 },
  },
  { _id: false }
)

const TradeOfferSchema = new Schema(
  {
    id: { type: String, required: true },
    fromPlayerId: { type: String, required: true },
    // null => anyone can accept
    toPlayerId: { type: String, default: null },
    give: { type: TradeLineSchema, required: true },
    get: { type: TradeLineSchema, required: true },
    status: { type: String, enum: ['open', 'accepted', 'rejected', 'cancelled'], default: 'open' },
    ts: { type: Date, required: true },
  },
  { _id: false }
)

const GameSchema = new Schema(
  {
    _id: { type: String, required: true },
    // Board preset used when the game starts.
    mapType: { type: String, default: "classic" }, // "classic" | "large" | "islands" | "world" | "custom"
    mapTemplateId: { type: String, default: null },
    settings: {
      maxVictoryPoints: { type: Number, default: 10 },
      maxPlayers: { type: Number, default: 4 },
    },
    phase: { type: String, required: true, default: 'lobby' },
    setupStep: { type: String, required: true, default: 'place_settlement' },
    currentPlayerId: { type: String, default: null },
    tiles: { type: [TileSchema], default: [] },
    ports: { type: [PortSchema], default: [] },
    players: { type: [PlayerSchema], default: [] },
    nodes: { type: [NodePlacementSchema], default: [] },
    edges: { type: [EdgePlacementSchema], default: [] },
    log: { type: [LogSchema], default: [] },
    chat: { type: [ChatSchema], default: [] },
    lastRoll: { type: LastRollSchema, default: null },

    tradeOffers: { type: [TradeOfferSchema], default: [] },

    // main phase bookkeeping
    turnHasRolled: { type: Boolean, default: false },
    turnNumber: { type: Number, default: 1 },
    devDeck: { type: [String], default: [] },
    devPlayedThisTurn: { type: Boolean, default: false },
    largestArmyPlayerId: { type: String, default: null },
    largestArmySize: { type: Number, default: 0 },

    longestRoadPlayerId: { type: String, default: null },
    longestRoadLength: { type: Number, default: 0 },

    robber: {
      pending: { type: Boolean, default: false },
      byPlayerId: { type: String, default: null },
      reason: { type: String, default: null }, // 'roll7' | 'knight'
      awaitingSteal: { type: Boolean, default: false },
      candidates: { type: [String], default: [] }, // playerIds
    },
    // setup bookkeeping
    setup: {
      round: { type: Number, default: 1 }, // 1..2
      direction: { type: String, enum: ['forward', 'backward'], default: 'forward' },
      pendingSettlementNodeId: { type: String, default: null },
      done: { type: Map, of: Number, default: {} }, // playerId -> how many settlements placed in setup
    },
  },
  { timestamps: true }
)

export type GameDoc = HydratedDocument<InferSchemaType<typeof GameSchema>>

export const Game: Model<InferSchemaType<typeof GameSchema>> =
  mongoose.models.Game || mongoose.model('Game', GameSchema)
