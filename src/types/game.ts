export type Resource = 'wood' | 'brick' | 'wheat' | 'sheep' | 'ore'
export type TileType = Resource | 'desert'

export type DevCardKind = 'knight' | 'victory' | 'road_building' | 'year_of_plenty' | 'monopoly'

export type DevCard = { id: string; kind: DevCardKind; boughtTurn: number }

export type Phase = 'lobby' | 'setup' | 'main' | 'finished'

export type MapType = 'classic' | 'large' | 'islands' | 'world' | 'custom'

export type MapTemplatePortKind = 'threeToOne' | Resource | 'random'

export type MapTemplate = {
  _id: string
  name: string
  hexes: { q: number; r: number }[]
  ports: { q: number; r: number; edge: 0 | 1 | 2 | 3 | 4 | 5; kind: MapTemplatePortKind }[]
  createdAt?: string
  updatedAt?: string
}

export type GameSettings = { maxVictoryPoints: number; maxPlayers: number }

export type SetupStep = 'place_settlement' | 'place_road'

export type PlayerPublic = {
  _id: string
  name: string
  color: string
  victoryPoints: number
  roads: number
  settlements: number
  cities: number
  resourceCount: number // hide details (no login / fairness)
}

export type PlayerPrivate = {
  _id: string
  resources: Record<Resource, number>
  ports?: {
    threeToOne: boolean
    twoToOne: Partial<Record<Resource, boolean>>
  }
}

export type PortKind = 'threeToOne' | Resource

export type Port = {
  id: string
  kind: PortKind
  nodeA: string
  nodeB: string
  mid: { x: number; y: number }
}

export type HexTile = {
  id: string
  q: number
  r: number
  type: TileType
  numberToken: number | null
  hasRobber: boolean
}

export type NodePlacement = {
  nodeId: string
  playerId: string
  kind: 'settlement' | 'city'
}

export type EdgePlacement = {
  edgeId: string
  playerId: string
}

export type GameState = {
  _id: string
  mapType?: MapType
  mapTemplateId?: string | null
  settings?: GameSettings
  createdAt: string
  updatedAt: string

  phase: Phase
  setupStep: SetupStep
  setupRound?: number
  setupDirection?: 'forward' | 'backward'

  players: PlayerPublic[]
  currentPlayerId: string

  tiles: HexTile[]
  ports?: Port[]
  nodes: NodePlacement[]
  edges: EdgePlacement[]

  log: { ts: string; msg: string }[]
  chat: { ts: string; playerId: string | null; name: string; text: string }[]

  tradeOffers?: {
    id: string
    fromPlayerId: string
    toPlayerId: string | null
    give: Record<Resource, number>
    get: Record<Resource, number>
    status: 'open' | 'accepted' | 'rejected' | 'cancelled'
    ts: string
  }[]

  lastRoll?: {
    ts: string
    playerId: string
    d1: number
    d2: number
    sum: number
  } | null

  // main phase convenience
  turnHasRolled?: boolean
  turnNumber?: number
  devDeckCount?: number
  devPlayedThisTurn?: boolean
  largestArmyPlayerId?: string | null
  largestArmySize?: number
  longestRoadPlayerId?: string | null
  longestRoadLength?: number

  robber?: {
    pending: boolean
    byPlayerId: string
    reason: 'roll7' | 'knight'
    awaitingSteal: boolean
    candidates: { playerId: string; name: string; color: string; resourceCount: number; resources?: Partial<Record<Resource, number>> }[]
  }

  // client convenience
  you?: {
    playerId: string
    name: string
    victoryCardCount?: number
    totalVictoryPoints?: number
    resources: Record<Resource, number>
    ports?: {
      threeToOne: boolean
      twoToOne: Partial<Record<Resource, boolean>>
    }
    devCards?: DevCard[]
    knightsPlayed?: number
    freeRoadsToPlace?: number
  }
}
