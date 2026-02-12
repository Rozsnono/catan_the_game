import { nanoid } from 'nanoid'
import type { GameDoc } from '@/models/Game'
import { MapTemplate } from '@/models/MapTemplate'
import type { HexTile, Port, PortKind, Resource, TileType, MapType } from '@/types/game'
import { axialToPixel, buildGraphFromTiles, hexCorners, nodeDistanceOk, pointToNodeId } from '@/lib/shared/boardGeometry'

const COLORS = ['#60a5fa', '#f59e0b', '#34d399', '#f472b6']

// Robust id comparison: some saved games might have non-string ids.
const asId = (x: any) => (x == null ? '' : typeof x === 'string' ? x : String(x))
const idEq = (a: any, b: any) => asId(a) === asId(b)

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashStringToSeed(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}


export type DevCardKind = 'knight' | 'victory' | 'road_building' | 'year_of_plenty' | 'monopoly'

function makeDevDeck(gameId: string): DevCardKind[] {
  // Standard Catan dev deck: 25 cards
  const seed = hashStringToSeed(gameId + ':devdeck')
  const rand = mulberry32(seed)
  const deck: DevCardKind[] = [
    ...Array.from({ length: 14 }).map(() => 'knight' as const),
    ...Array.from({ length: 5 }).map(() => 'victory' as const),
    ...Array.from({ length: 2 }).map(() => 'road_building' as const),
    ...Array.from({ length: 2 }).map(() => 'year_of_plenty' as const),
    ...Array.from({ length: 2 }).map(() => 'monopoly' as const),
  ]
  return shuffle(deck, rand)
}

function ensureDevFields(game: GameDoc) {
  if (typeof (game as any).turnNumber !== 'number') (game as any).turnNumber = 1
  if (!Array.isArray((game as any).devDeck)) (game as any).devDeck = []
  if (typeof (game as any).devPlayedThisTurn !== 'boolean') (game as any).devPlayedThisTurn = false
  if (typeof (game as any).largestArmySize !== 'number') (game as any).largestArmySize = 0
  if ((game as any).largestArmyPlayerId === undefined) (game as any).largestArmyPlayerId = null
}

function ensureLongestRoadFields(game: GameDoc) {
  if ((game as any).longestRoadPlayerId === undefined) (game as any).longestRoadPlayerId = null
  if (typeof (game as any).longestRoadLength !== 'number') (game as any).longestRoadLength = 0
}


function ensureRobberFields(game: GameDoc) {
  if (!(game as any).robber) {
    ; (game as any).robber = { pending: false, byPlayerId: null, reason: null, awaitingSteal: false, candidates: [] }
  }
  const r = (game as any).robber
  if (typeof r.pending !== 'boolean') r.pending = false
  if (r.byPlayerId === undefined) r.byPlayerId = null
  if (r.reason === undefined) r.reason = null
  if (typeof r.awaitingSteal !== 'boolean') r.awaitingSteal = false
  if (!Array.isArray(r.candidates)) r.candidates = []
}

function startRobber(game: GameDoc, playerId: string, reason: 'roll7' | 'knight') {
  ensureRobberFields(game)
    ; (game as any).robber.pending = true
    ; (game as any).robber.byPlayerId = playerId
    ; (game as any).robber.reason = reason
    ; (game as any).robber.awaitingSteal = false
    ; (game as any).robber.candidates = []
}

function clearRobber(game: GameDoc) {
  ensureRobberFields(game)
    ; (game as any).robber.pending = false
    ; (game as any).robber.byPlayerId = null
    ; (game as any).robber.reason = null
    ; (game as any).robber.awaitingSteal = false
    ; (game as any).robber.candidates = []
}

function randomStealResource(from: any): Resource | null {
  const keys = ['wood', 'brick', 'wheat', 'sheep', 'ore'] as Resource[]
  const bag: Resource[] = []
  for (const k of keys) {
    const n = Number(from.resources?.[k] ?? 0)
    for (let i = 0; i < n; i++) bag.push(k)
  }
  if (bag.length === 0) return null
  const pick = bag[Math.floor(Math.random() * bag.length)]
  return pick
}

function stealHalfResources(game: GameDoc) {
  const allPlayers = game.players;
  for (const player of allPlayers) {
    const from = player;
    if (!from) break;
    const total = Object.values(from.resources ?? {}).reduce((a, b) => a + Number(b), 0);
    if (total > 7) addLog(game, `${from.name} túl sok erőforrással rendelkezik (${total}), ezért a rabló miatt elveszíti a felét (kerekítve lefelé).`)
    else break;
    const toSteal = Math.floor(total / 2) >= 7 ? total - 7 : Math.floor(total / 2);
    if (toSteal <= 0) break;
    for (let i = 0; i < toSteal; i++) {
      const res = randomStealResource(from);
      if (!res) break;
      from.resources![res] = (from.resources![res] ?? 0) - 1;
    }
  }
}

function ensurePlayerDev(p: any) {
  if (!Array.isArray(p.devCards)) p.devCards = []
  if (typeof p.knightsPlayed !== 'number') p.knightsPlayed = 0
  if (typeof p.freeRoadsToPlace !== 'number') p.freeRoadsToPlace = 0
}
export function makeClassicTiles(gameId: string): HexTile[] {
  // Radius 2 axial coords => 19 tiles
  const coords: Array<{ q: number; r: number }> = []
  const radius = 2
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const s = -q - r
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= radius) {
        coords.push({ q, r })
      }
    }
  }

  const seed = hashStringToSeed(gameId)
  const rand = mulberry32(seed)

  const resources: TileType[] = shuffle(
    [
      'wood', 'wood', 'wood', 'wood',
      'brick', 'brick', 'brick',
      'wheat', 'wheat', 'wheat', 'wheat',
      'sheep', 'sheep', 'sheep', 'sheep',
      'ore', 'ore', 'ore',
      'desert',
    ],
    rand
  )

  // Standard number tokens (no 7), 18 tokens
  const tokens = shuffle([2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12], rand)

  let tokenIdx = 0
  const tiles: HexTile[] = coords.map((c, i) => {
    const type = resources[i]
    const isDesert = type === 'desert'
    const numberToken = isDesert ? null : tokens[tokenIdx++]
    return {
      id: `T${i}_${c.q}_${c.r}`,
      q: c.q,
      r: c.r,
      type,
      numberToken,
      hasRobber: isDesert,
    }
  })

  return tiles
}

export function makeTiles(gameId: string, mapType: MapType = 'classic'): HexTile[] {
  switch (mapType) {
    case 'large':
      return makeRadiusTiles(gameId, 3, { deserts: 2 })
    case 'islands':
      return makeIslandsTiles(gameId)
    case 'world':
      return makeWorldTiles(gameId)
    case 'classic':
    default:
      return makeClassicTiles(gameId)
  }
}

function makePortsFromTemplate(
  tiles: HexTile[],
  templatePorts: Array<{ q: number; r: number; edge: number; kind: PortKind | 'random' }>,
  seedStr = 'ports'
): Port[] {
  const size = 48
  const byCoord = new Map<string, HexTile>()
  for (const t of tiles) byCoord.set(`${t.q},${t.r}`, t)

  // Resolve 'random' placeholder kinds into concrete port kinds.
  const randomCount = templatePorts.filter((p) => p.kind === 'random').length
  const rng = mulberry32(hashStringToSeed(`${seedStr}|${tiles.length}|${randomCount}`))

  let randomPool: PortKind[] = []
  if (randomCount) {
    // Roughly Catan-like distribution: ~40% 3:1, rest split across 2:1 resources.
    const threeCount = Math.max(1, Math.round(randomCount * 0.4))
    const rest = Math.max(0, randomCount - threeCount)
    randomPool = []
    for (let i = 0; i < threeCount; i++) randomPool.push('threeToOne')

    const resources: Resource[] = ['wood', 'brick', 'wheat', 'sheep', 'ore']
    // Fill remaining with resources (cycled), then shuffle.
    for (let i = 0; i < rest; i++) randomPool.push(resources[i % resources.length] as PortKind)

    // Shuffle pool
    for (let i = randomPool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      const tmp = randomPool[i]
      randomPool[i] = randomPool[j]
      randomPool[j] = tmp
    }
  }

  const ports: Port[] = []
  let i = 0
  let poolIdx = 0
  for (const p of templatePorts) {
    const tile = byCoord.get(`${p.q},${p.r}`)
    if (!tile) continue
    const center = axialToPixel(tile.q, tile.r, size)
    const corners = hexCorners(center, size)
    const a = corners[p.edge % 6]
    const b = corners[(p.edge + 1) % 6]
    const nodeA = pointToNodeId(a)
    const nodeB = pointToNodeId(b)
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }

    const kind: PortKind =
      p.kind === 'random'
        ? (randomPool[poolIdx++ % Math.max(1, randomPool.length)] ?? 'threeToOne')
        : (p.kind as PortKind)

    ports.push({ id: `P_custom_${i++}`, kind, nodeA, nodeB, mid })
  }
  return ports
}


function buildRadiusCoords(radius: number): Array<{ q: number; r: number }> {
  const coords: Array<{ q: number; r: number }> = []
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const s = -q - r
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= radius) coords.push({ q, r })
    }
  }
  return coords
}

function makeResourceBag(count: number, deserts: number, rand: () => number): TileType[] {
  const land = count - deserts
  // Rough, Catan-like distribution.
  const weights: Array<[Exclude<TileType, 'desert'>, number]> = [
    ['wood', 22],
    ['sheep', 22],
    ['wheat', 22],
    ['brick', 17],
    ['ore', 17],
  ]
  const bag: TileType[] = []
  let remaining = land
  for (let i = 0; i < weights.length; i++) {
    const [t, w] = weights[i]
    const n = i === weights.length - 1 ? remaining : Math.max(0, Math.round((land * w) / 100))
    for (let k = 0; k < n; k++) bag.push(t)
    remaining -= n
  }
  while (bag.length < land) bag.push('wood')
  while (bag.length > land) bag.pop()
  for (let i = 0; i < deserts; i++) bag.push('desert')
  return shuffle(bag, rand)
}

function makeTokenBag(need: number, rand: () => number): number[] {
  // Classic token distribution (no 7), repeated and trimmed.
  const base = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12]
  const tokens: number[] = []
  while (tokens.length < need) tokens.push(...base)
  return shuffle(tokens.slice(0, need), rand)
}

function makeTilesFromCoords(gameId: string, coords: Array<{ q: number; r: number }>, opts?: { deserts?: number; seedTag?: string }): HexTile[] {
  const seed = hashStringToSeed(gameId + ':' + (opts?.seedTag ?? 'tiles'))
  const rand = mulberry32(seed)
  const deserts = Math.min(Math.max(1, opts?.deserts ?? 1), Math.max(1, coords.length - 1))
  const resources = makeResourceBag(coords.length, deserts, rand)
  const tokens = makeTokenBag(coords.length - deserts, rand)

  let tokenIdx = 0
  let robberPlaced = false
  return coords.map((c, i) => {
    const type = resources[i]
    const isDesert = type === 'desert'
    const numberToken = isDesert ? null : tokens[tokenIdx++]
    const hasRobber = !robberPlaced && isDesert
    if (hasRobber) robberPlaced = true
    return {
      id: `T${i}_${c.q}_${c.r}`,
      q: c.q,
      r: c.r,
      type,
      numberToken,
      hasRobber,
    }
  })
}

function makeRadiusTiles(gameId: string, radius: number, opts?: { deserts?: number }) {
  const coords = buildRadiusCoords(radius)
  return makeTilesFromCoords(gameId, coords, { deserts: opts?.deserts ?? (radius >= 3 ? 2 : 1), seedTag: `radius${radius}` })
}

function makeIslandsTiles(gameId: string): HexTile[] {
  // Two main islands with a bit of separation (holes = ocean).
  const coords: Array<{ q: number; r: number }> = []
  const islandA = buildRadiusCoords(2).map(({ q, r }) => ({ q: q - 2, r }))
  const islandB = buildRadiusCoords(2).map(({ q, r }) => ({ q: q + 2, r }))
  // A small third islet
  const islet = buildRadiusCoords(1).map(({ q, r }) => ({ q, r: r + 3 }))

  const key = (c: any) => `${c.q},${c.r}`
  const seen = new Set<string>()
  for (const c of [...islandA, ...islandB, ...islet]) {
    const k = key(c)
    if (seen.has(k)) continue
    seen.add(k)
    coords.push(c)
  }

  // Total tiles ~ 19 + 19 + 7 - overlaps => around 45, but still very manageable.
  // Use 3 deserts to keep robber play interesting on larger maps.
  return makeTilesFromCoords(gameId, coords, { deserts: 3, seedTag: 'islands' })
}

function makeWorldTiles(gameId: string): HexTile[] {
  // One big continent + a few outer archipelagos.
  const coords: Array<{ q: number; r: number }> = []
  const continent = buildRadiusCoords(3)
  const arch1 = buildRadiusCoords(1).map(({ q, r }) => ({ q: q - 5, r: r + 1 }))
  const arch2 = buildRadiusCoords(1).map(({ q, r }) => ({ q: q + 5, r: r - 1 }))
  const arch3 = buildRadiusCoords(1).map(({ q, r }) => ({ q: q, r: r + 6 }))

  const key = (c: any) => `${c.q},${c.r}`
  const seen = new Set<string>()
  for (const c of [...continent, ...arch1, ...arch2, ...arch3]) {
    const k = key(c)
    if (seen.has(k)) continue
    seen.add(k)
    coords.push(c)
  }

  return makeTilesFromCoords(gameId, coords, { deserts: 3, seedTag: 'world' })
}

function portLabel(kind: PortKind): string {
  if (kind === 'threeToOne') return '3:1'
  const map: Record<Resource, string> = { wood: 'Fa', brick: 'Tégla', wheat: 'Búza', sheep: 'Juh', ore: 'Érc' }
  return `2:1 ${map[kind]}`
}

export function makeClassicPorts(gameId: string, tiles: HexTile[]): Port[] {
  // Deterministic, "good enough" port placement around the rim.
  // We select 9 boundary edges based on angle around center.
  const size = 48
  const graph = buildGraphFromTiles(tiles as any, size)
  const nodePos = new Map(graph.nodes.map((n) => [n.id, n.p]))

  const center = graph.nodes.reduce(
    (acc, n) => ({ x: acc.x + n.p.x, y: acc.y + n.p.y }),
    { x: 0, y: 0 }
  )
  center.x /= Math.max(1, graph.nodes.length)
  center.y /= Math.max(1, graph.nodes.length)

  // boundary-ish: nodes with <= 2 neighbors (outer rim corners/edges)
  const boundaryNode = new Set(
    Object.entries(graph.nodeNeighbors)
      .filter(([, nbs]) => (nbs?.length ?? 0) <= 2)
      .map(([id]) => id)
  )

  const candidateEdges = graph.edges
    .filter((e) => boundaryNode.has(e.a) || boundaryNode.has(e.b))
    .map((e) => {
      const a = nodePos.get(e.a)!
      const b = nodePos.get(e.b)!
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const ang = Math.atan2(mid.y - center.y, mid.x - center.x)
      return { e, mid, ang }
    })
    .sort((x, y) => x.ang - y.ang)

  // Pick 9 edges roughly evenly spaced.
  const picked: Array<{ e: any; mid: any }> = []
  const used = new Set<string>()
  for (let i = 0; i < 9; i++) {
    const idx = Math.floor((i / 9) * candidateEdges.length)
    // step forward until we find unused
    let j = idx
    while (j < candidateEdges.length && used.has(candidateEdges[j].e.id)) j++
    if (j >= candidateEdges.length) {
      j = 0
      while (j < candidateEdges.length && used.has(candidateEdges[j].e.id)) j++
    }
    if (!candidateEdges[j]) break
    used.add(candidateEdges[j].e.id)
    picked.push({ e: candidateEdges[j].e, mid: candidateEdges[j].mid })
  }

  const seed = hashStringToSeed(`${gameId}:ports`)
  const rand = mulberry32(seed)
  const kinds = shuffle<PortKind>(
    ['threeToOne', 'threeToOne', 'threeToOne', 'threeToOne', 'wood', 'brick', 'wheat', 'sheep', 'ore'],
    rand
  )

  return picked.slice(0, 9).map((p, idx) => ({
    id: `P${idx}`,
    kind: kinds[idx] ?? 'threeToOne',
    nodeA: p.e.a,
    nodeB: p.e.b,
    mid: p.mid,
  }))
}

function ensurePortsShape(player: any) {
  player.ports = player.ports ?? { threeToOne: false, twoToOne: { wood: false, brick: false, wheat: false, sheep: false, ore: false } }
  player.ports.twoToOne = player.ports.twoToOne ?? { wood: false, brick: false, wheat: false, sheep: false, ore: false }
}

function maybeGrantPort(game: GameDoc, playerId: string, nodeId: string) {
  const ports = ((game as any).ports ?? []) as Port[]
  if (!ports.length) return
  const p = game.players.find((x) => idEq(x._id, playerId))
  if (!p) return
  ensurePortsShape(p as any)

  for (const port of ports) {
    if (port.nodeA !== nodeId && port.nodeB !== nodeId) continue
    if (port.kind === 'threeToOne') {
      if (!(p as any).ports.threeToOne) {
        ; (p as any).ports.threeToOne = true
        addLog(game, `${p.name} kikötőt szerzett: ${portLabel(port.kind)}.`)
      }
    } else {
      const res = port.kind as Resource
      if (!((p as any).ports.twoToOne?.[res] ?? false)) {
        ; (p as any).ports.twoToOne[res] = true
        addLog(game, `${p.name} kikötőt szerzett: ${portLabel(port.kind)}.`)
      }
    }
  }
}


export function addLog(game: GameDoc, msg: string) {
  game.log.push({ ts: new Date(), msg })
  if (game.log.length > 200) game.log = game.log.slice(-200)
}

export function addChat(game: GameDoc, name: string, playerId: string | null, text: string) {
  game.chat.push({ ts: new Date(), name, playerId, text })
  if (game.chat.length > 200) game.chat = game.chat.slice(-200)
}

function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

function computeLongestRoadForPlayer(game: GameDoc, playerId: string): number {
  const graph = buildGraphFromTiles(game.tiles as any, 48)

  const ownedEdgeIds = new Set(
    game.edges.filter((e: any) => idEq(e.playerId, playerId)).map((e: any) => String(e.edgeId))
  )

  // Build adjacency only from owned edges.
  const adj = new Map<string, string[]>()
  for (const edgeId of ownedEdgeIds) {
    const en = graph.edgeNodes[edgeId]
    if (!en) continue
    const { a, b } = en
    if (!adj.has(a)) adj.set(a, [])
    if (!adj.has(b)) adj.set(b, [])
    adj.get(a)!.push(b)
    adj.get(b)!.push(a)
  }

  if (adj.size === 0) return 0

  // Nodes that are occupied by an opponent settlement/city block traversal.
  const blocked = new Set<string>()
  for (const n of game.nodes as any[]) {
    if (!idEq(n.playerId, playerId)) blocked.add(String(n.nodeId))
  }

  let best = 0

  function dfs(u: string, used: Set<string>, length: number) {
    if (length > best) best = length
    // You can end at a blocked node, but cannot pass through it.
    if (blocked.has(u)) return
    const neigh = adj.get(u) ?? []
    for (const v of neigh) {
      const k = edgeKey(u, v)
      if (used.has(k)) continue
      used.add(k)
      dfs(v, used, length + 1)
      used.delete(k)
    }
  }

  for (const start of adj.keys()) {
    dfs(start, new Set(), 0)
  }

  return best
}

function recomputeLongestRoadAward(game: GameDoc) {
  ensureLongestRoadFields(game)

  const minLength = 5
  const prevHolder = (game as any).longestRoadPlayerId ? String((game as any).longestRoadPlayerId) : null
  const prevLen = Number((game as any).longestRoadLength ?? 0)

  // IMPORTANT: make award idempotent (no point stacking).
  // First, remove any previously-applied longest-road bonus from whoever had it.
  for (const p of game.players as any[]) {
    if (p.longestRoadAward) {
      p.victoryPoints = Math.max(0, Number(p.victoryPoints ?? 0) - 2)
      p.longestRoadAward = false
    }
  }

  // Compute current best lengths
  const lengths = game.players.map((p: any) => ({
    playerId: asId(p._id),
    len: computeLongestRoadForPlayer(game, asId(p._id)),
  }))

  const bestLen = Math.max(0, ...lengths.map((x) => x.len))
  const bestPlayers = lengths.filter((x) => x.len === bestLen).map((x) => x.playerId)

  // Nobody qualifies
  if (bestLen < minLength) {
    ;(game as any).longestRoadPlayerId = null
    ;(game as any).longestRoadLength = 0
    return
  }

  let finalHolder: string | null = null
  let finalLen = bestLen

  // Tie handling:
  // - If there's a current holder and they are among tied best, keep.
  // - If there's a current holder not among tied best, keep (award doesn't change on tie).
  // - If no holder and tie, no award is granted.
  if (bestPlayers.length > 1) {
    if (prevHolder) {
      finalHolder = prevHolder
      finalLen = Math.max(prevLen, bestLen)
    } else {
      finalHolder = null
      finalLen = bestLen
    }
  } else {
    const winnerId = bestPlayers[0]

    if (prevHolder && idEq(prevHolder, winnerId)) {
      finalHolder = winnerId
      finalLen = bestLen
    } else if (prevHolder && bestLen <= prevLen) {
      // Not strictly greater than previous record -> keep previous holder
      finalHolder = prevHolder
      finalLen = Math.max(prevLen, bestLen)
    } else {
      finalHolder = winnerId
      finalLen = bestLen
    }
  }

  ;(game as any).longestRoadPlayerId = finalHolder
  ;(game as any).longestRoadLength = finalLen

  if (finalHolder) {
    const holder: any = game.players.find((p: any) => idEq(p._id, finalHolder))
    if (holder) {
      holder.victoryPoints = Number(holder.victoryPoints ?? 0) + 2
      holder.longestRoadAward = true
    }
  }
}


export function addPlayer(game: GameDoc, name: string): string {
  const maxPlayers = (game as any).settings?.maxPlayers ?? 4
  if (game.players.length >= maxPlayers) throw new Error(`A játék tele van (max ${maxPlayers} játékos).`)
  const playerId = nanoid(10)
  const color = COLORS[game.players.length % COLORS.length]
  game.players.push({
    _id: playerId,
    name,
    color,
    victoryPoints: 0,
    roads: 0,
    settlements: 0,
    cities: 0,
    resources: { wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 },
    ports: {
      threeToOne: false,
      twoToOne: { wood: false, brick: false, wheat: false, sheep: false, ore: false },
    },
    devCards: [],
    knightsPlayed: 0,
    freeRoadsToPlace: 0,
  })
  addLog(game, `${name} csatlakozott.`)
  return playerId
}

export async function startIfPossible(game: GameDoc) {
  if (game.phase !== 'lobby') return
  if (game.players.length < 2) return
  const mapType = ((game as any).mapType ?? 'classic') as any

  if (mapType === 'custom' && (game as any).mapTemplateId) {
    const tmpl = await MapTemplate.findById((game as any).mapTemplateId).lean()
    if (tmpl && Array.isArray(tmpl.hexes) && tmpl.hexes.length > 0) {
      game.tiles = makeTilesFromCoords(game._id, tmpl.hexes as any, { deserts: 1, seedTag: 'custom' })
      const tPorts = (tmpl.ports ?? []) as any[]
      ;(game as any).ports = tPorts.length ? makePortsFromTemplate(game.tiles as any, tPorts, game._id) : makeClassicPorts(game._id, game.tiles as any)
    } else {
      game.tiles = makeTiles(game._id, 'classic')
      ;(game as any).ports = makeClassicPorts(game._id, game.tiles as any)
    }
  } else {
    game.tiles = makeTiles(game._id, mapType)
    ;(game as any).ports = makeClassicPorts(game._id, game.tiles as any)
  }
  game.phase = 'setup'
  game.setupStep = 'place_settlement'
  game.setup.round = 1
  game.setup.direction = 'forward'
  game.setup.pendingSettlementNodeId = null
  game.setup.done = new Map()
  game.currentPlayerId = game.players[0]._id
    ; (game as any).turnHasRolled = false
  ensureDevFields(game)
  ensureLongestRoadFields(game)
    ; (game as any).turnNumber = 1
    ; (game as any).devDeck = makeDevDeck(game._id)
    ; (game as any).devPlayedThisTurn = false
    ; (game as any).largestArmyPlayerId = null
    ; (game as any).largestArmySize = 0
  addLog(game, `Játék indult. Setup: ${game.players[0].name} jön.`)
}

function requireTurn(game: GameDoc, playerId: string) {
  if (game.currentPlayerId !== playerId) throw new Error('Nem te jössz.')
}

export function placeSettlement(game: GameDoc, playerId: string, nodeId: string) {
  if (game.phase !== 'setup') throw new Error('Települést most csak setup fázisban lehet lerakni (MVP).')
  if (game.setupStep !== 'place_settlement') throw new Error('Most út lerakása következik.')
  requireTurn(game, playerId)

  const donePairs = game.setup.done.get(playerId) ?? 0
  if (donePairs >= 2) throw new Error('Setup-ban már leraktad mindkét település+út párost.')

  const occupied = new Set(game.nodes.map((n) => n.nodeId))
  const graph = buildGraphFromTiles(game.tiles as any, 48)
  if (!graph.nodeNeighbors[nodeId]) throw new Error('Érvénytelen csomópont.')
  if (!nodeDistanceOk(nodeId, occupied, graph.nodeNeighbors)) throw new Error('Nem lehet ide települést: foglalt vagy szomszédos.')

  game.nodes.push({ nodeId, playerId, kind: 'settlement' })
  const p = game.players.find((x) => idEq(x._id, playerId))!
  ensurePortsShape(p as any)
  maybeGrantPort(game, playerId, nodeId)
  p.settlements += 1
  p.victoryPoints += 1
  recomputeLongestRoadAward(game)

  // Classic Catan rule: after placing your SECOND settlement in setup,
  // you immediately receive starting resources from adjacent hexes.
  if (game.setup.round === 2 && donePairs === 1) {
    const gains: Partial<Record<Resource, number>> = {}
    const size = 48
    for (const t of game.tiles as any as HexTile[]) {
      if (t.type === 'desert') continue
      if (t.hasRobber) continue
      const res = t.type as Resource
      const center = axialToPixel(t.q, t.r, size)
      const corners = hexCorners(center, size)
      const cornerNodeIds = corners.map((pt) => pointToNodeId(pt))
      if (!cornerNodeIds.includes(nodeId)) continue
      p.resources[res] = (p.resources[res] ?? 0) + 1
      gains[res] = ((gains[res] ?? 0) as number) + 1
    }

    const gainsText = Object.entries(gains)
      .filter(([, v]) => (v ?? 0) > 0)
      .map(([r, v]) => `+${v} ${r}`)
      .join(', ')
    addLog(game, gainsText ? `${p.name} kezdő erőforrásokat kapott: ${gainsText}.` : `${p.name} nem kapott kezdő erőforrást (sivatag/rabló vagy víz mellett).`)
  }

  game.setup.pendingSettlementNodeId = nodeId
  game.setupStep = 'place_road'
  addLog(game, `${p.name} települést rakott.`)
}

type Cost = Partial<Record<Resource, number>>

function emptyResourceLine(): Record<Resource, number> {
  return { wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 }
}

function ensureStatsFields(game: GameDoc) {
  const stats = ((game as any).stats = (game as any).stats ?? {})
  stats.rollCounts = stats.rollCounts ?? new Map()
  stats.resourceGains = stats.resourceGains ?? new Map()
}

function incRollCount(game: GameDoc, sum: number) {
  ensureStatsFields(game)
  const m: Map<string, number> = (game as any).stats.rollCounts
  const key = String(sum)
  m.set(key, Number(m.get(key) ?? 0) + 1)
}

function addResourceGain(game: GameDoc, playerId: string, gain: Partial<Record<Resource, number>>) {
  ensureStatsFields(game)
  const m: Map<string, Record<Resource, number>> = (game as any).stats.resourceGains
  const cur = m.get(playerId) ?? emptyResourceLine()
  for (const [k, v] of Object.entries(gain) as [Resource, number][]) {
    if (!v) continue
    cur[k] = Number(cur[k] ?? 0) + Number(v)
  }
  m.set(playerId, cur)
}

export function maybeFinishGame(game: GameDoc) {
  if (game.phase !== 'main') return
  if (game.phase === 'finished') return
  const maxVP = Number((game as any).settings?.maxVictoryPoints ?? 10)
  const winners = (game.players as any[]).filter((p) => Number(p.victoryPoints ?? 0) >= maxVP)
  if (!winners.length) return

  // If multiple players reach the goal simultaneously, the current player wins.
  let winner: any = winners.find((p) => String(p._id) === String(game.currentPlayerId))
  if (!winner) winner = winners[0]

  game.phase = 'finished'
  ;(game as any).winnerPlayerId = String(winner._id)
  ;(game as any).finishedAt = new Date()
  addLog(game, `🏁 Játék vége! Győztes: ${winner.name} (${winner.victoryPoints} pont).`)
}

const COSTS: Record<'road' | 'settlement' | 'city', Cost> = {
  road: { wood: 1, brick: 1 },
  settlement: { wood: 1, brick: 1, wheat: 1, sheep: 1 },
  city: { wheat: 2, ore: 3 },
}

function requireResources(p: any, cost: Cost) {
  for (const [k, v] of Object.entries(cost)) {
    const have = (p.resources?.[k as Resource] ?? 0) as number
    if (have < (v ?? 0)) {
      throw new Error(`Nincs elég erőforrás: ${k} (${have}/${v}).`)
    }
  }
}

function payResources(p: any, cost: Cost) {
  for (const [k, v] of Object.entries(cost)) {
    p.resources[k as Resource] = (p.resources[k as Resource] ?? 0) - (v ?? 0)
  }
}

function edgeTouchesNode(edgeId: string, nodeId: string, graph: any) {
  const en = graph.edgeNodes[edgeId]
  return en && (en.a === nodeId || en.b === nodeId)
}

function hasPlayerRoadTouchingNode(game: GameDoc, playerId: string, nodeId: string, graph: any) {
  return game.edges.some((e) => e.playerId === playerId && edgeTouchesNode(e.edgeId, nodeId, graph))
}

function canBuildRoadAtEdge(game: GameDoc, playerId: string, edgeId: string) {
  if (game.edges.some((e) => e.edgeId === edgeId)) throw new Error('Ez az él már foglalt.')
  const graph = buildGraphFromTiles(game.tiles as any, 48)
  const en = graph.edgeNodes[edgeId]
  if (!en) throw new Error('Érvénytelen él.')

  // Must connect to your existing road or settlement/city.
  const touchesOwnSettlement = game.nodes.some((n) => n.playerId === playerId && (n.nodeId === en.a || n.nodeId === en.b))
  const touchesOwnRoad = game.edges.some((e) => {
    if (e.playerId !== playerId) return false
    const other = graph.edgeNodes[e.edgeId]
    if (!other) return false
    return other.a === en.a || other.b === en.a || other.a === en.b || other.b === en.b
  })

  if (!touchesOwnSettlement && !touchesOwnRoad) {
    throw new Error('Az út csak a saját hálózatodhoz csatlakozva építhető.')
  }
}

function canBuildSettlementAtNode(game: GameDoc, playerId: string, nodeId: string) {
  const occupied = new Set(game.nodes.map((n) => n.nodeId))
  const graph = buildGraphFromTiles(game.tiles as any, 48)
  if (!graph.nodeNeighbors[nodeId]) throw new Error('Érvénytelen csomópont.')
  if (!nodeDistanceOk(nodeId, occupied, graph.nodeNeighbors)) throw new Error('Nem lehet ide települést: foglalt vagy szomszédos.')

  // Must connect to your road.
  if (!hasPlayerRoadTouchingNode(game, playerId, nodeId, graph)) {
    throw new Error('Település csak a saját utadhoz kapcsolódva építhető.')
  }
}

function canUpgradeToCity(game: GameDoc, playerId: string, nodeId: string) {
  const existing = game.nodes.find((n) => n.nodeId === nodeId)
  if (!existing) throw new Error('Nincs itt település.')
  if (existing.playerId !== playerId) throw new Error('Csak a saját településedet fejlesztheted várossá.')
  if (existing.kind !== 'settlement') throw new Error('Ez már város.')
}


export function buildRoad(game: GameDoc, playerId: string, edgeId: string) {
  if (game.phase !== 'main') throw new Error('Utat most csak a fő játékban lehet építeni.')
  requireTurn(game, playerId)
  const p: any = game.players.find((x) => idEq(x._id, playerId))!
  ensurePlayerDev(p)

  const hasFree = Number(p.freeRoadsToPlace ?? 0) > 0
  if (!hasFree) {
    requireResources(p as any, COSTS.road)
  }
  canBuildRoadAtEdge(game, playerId, edgeId)

  if (hasFree) {
    p.freeRoadsToPlace = Number(p.freeRoadsToPlace ?? 0) - 1
    addLog(game, `${p.name} ingyen utat épített (Fejlesztési kártya).`)
  } else {
    payResources(p as any, COSTS.road)
    addLog(game, `${p.name} utat épített. (-1 fa, -1 tégla)`)
  }

  game.edges.push({ edgeId, playerId })
  p.roads += 1
  recomputeLongestRoadAward(game)
}

export function buildSettlement(game: GameDoc, playerId: string, nodeId: string) {
  if (game.phase !== 'main') throw new Error('Települést most csak a fő játékban lehet építeni.')
  requireTurn(game, playerId)
  const p = game.players.find((x) => idEq(x._id, playerId))!
  requireResources(p as any, COSTS.settlement)
  canBuildSettlementAtNode(game, playerId, nodeId)
  payResources(p as any, COSTS.settlement)
  game.nodes.push({ nodeId, playerId, kind: 'settlement' })
  p.settlements += 1
  p.victoryPoints += 1
  recomputeLongestRoadAward(game)
  ensurePortsShape(p as any)
  maybeGrantPort(game, playerId, nodeId)
  addLog(game, `${p.name} települést épített. (-1 fa, -1 tégla, -1 búza, -1 juh)`)
}

export function buildCity(game: GameDoc, playerId: string, nodeId: string) {
  if (game.phase !== 'main') throw new Error('Várost most csak a fő játékban lehet építeni.')
  requireTurn(game, playerId)
  const p = game.players.find((x) => idEq(x._id, playerId))!
  requireResources(p as any, COSTS.city)
  canUpgradeToCity(game, playerId, nodeId)
  payResources(p as any, COSTS.city)
  const n = game.nodes.find((x) => x.nodeId === nodeId)!
  n.kind = 'city'
  p.cities += 1
  p.settlements = Math.max(0, p.settlements - 1)
  p.victoryPoints += 1 // settlement already counted 1
  recomputeLongestRoadAward(game)
  addLog(game, `${p.name} várossá fejlesztett. (-2 búza, -3 érc)`)
}

export function placeRoad(game: GameDoc, playerId: string, edgeId: string) {
  if (game.phase !== 'setup') throw new Error('Utat most csak setup fázisban lehet lerakni (MVP).')
  if (game.setupStep !== 'place_road') throw new Error('Most települést kell lerakni.')
  requireTurn(game, playerId)

  if (game.edges.some((e) => e.edgeId === edgeId)) throw new Error('Ez az él már foglalt.')
  const graph = buildGraphFromTiles(game.tiles as any, 48)
  const en = graph.edgeNodes[edgeId]
  if (!en) throw new Error('Érvénytelen él.')

  const pending = game.setup.pendingSettlementNodeId
  if (!pending) throw new Error('Nincs pending település (belső hiba).')
  if (en.a !== pending && en.b !== pending) throw new Error('Setup-ban az út a frissen lerakott településhez kell csatlakozzon.')

  game.edges.push({ edgeId, playerId })
  const p = game.players.find((x) => idEq(x._id, playerId))!
  p.roads += 1
  recomputeLongestRoadAward(game)
  addLog(game, `${p.name} utat rakott.`)

  // Mark setup progress
  const done = (game.setup.done.get(playerId) ?? 0) + 1
  game.setup.done.set(playerId, done)
  game.setup.pendingSettlementNodeId = null
  game.setupStep = 'place_settlement'

  // Advance turn with snake order
  const idx = game.players.findIndex((pl) => idEq(pl._id, playerId))
  const last = game.players.length - 1

  let customNextLog: string | null = null

  const allDone2 = () => game.players.every((pl) => (game.setup.done.get(pl._id) ?? 0) >= 2)

  if (game.setup.direction === 'forward') {
    if (idx === last) {
      // switch to backward for round 2, current stays last
      game.setup.direction = 'backward'
      game.setup.round = 2
      game.currentPlayerId = game.players[last]._id
      customNextLog = `Setup 2. kör (visszafelé) indul: ${game.players[last].name} jön.`
    } else {
      game.currentPlayerId = game.players[idx + 1]._id
    }
  } else {
    // backward
    if (idx === 0) {
      if (allDone2()) {
        game.phase = 'main'
        game.currentPlayerId = game.players[0]._id
          ; (game as any).turnHasRolled = false
        ensureDevFields(game)
          ; (game as any).turnNumber = 1
          ; (game as any).devDeck = makeDevDeck(game._id)
          ; (game as any).devPlayedThisTurn = false
          ; (game as any).largestArmyPlayerId = null
          ; (game as any).largestArmySize = 0
        addLog(game, `Setup kész. Fő játék indul, ${game.players[0].name} jön.`)
        return
      }
      // should not happen, but keep it stable
      game.currentPlayerId = game.players[0]._id
    } else {
      game.currentPlayerId = game.players[idx - 1]._id
    }
  }

  const next = game.players.find((x) => x._id === game.currentPlayerId)!
  addLog(game, customNextLog ?? `Következő: ${next.name}.`)
}

export function rollDice(game: GameDoc, playerId: string) {
  if (game.phase !== 'main') throw new Error('Dobni csak a fő játékban lehet.')
  requireTurn(game, playerId)
  if ((game as any).turnHasRolled) throw new Error('Ebben a körben már dobtál.')
  const d1 = 1 + Math.floor(Math.random() * 6)
  const d2 = 1 + Math.floor(Math.random() * 6)
  const sum = d1 + d2
  const p = game.players.find((x) => idEq(x._id, playerId))!
    ; (game as any).lastRoll = { ts: new Date(), playerId, d1, d2, sum }
    ; (game as any).turnHasRolled = true
  addLog(game, `${p.name} dobott: ${sum} (${d1}+${d2}).`)

  // Stats
  incRollCount(game, sum)

  // Resource distribution (sum != 7)
  if (sum === 7) {
    startRobber(game, playerId, 'roll7')
    stealHalfResources(game);
    addLog(game, `7-es dobás: helyezd át a rablót.`)
    return sum
  }

  const size = 48
  const payouts: Record<string, Partial<Record<Resource, number>>> = {}

  for (const t of game.tiles as any as HexTile[]) {
    if (!t.numberToken || t.numberToken !== sum) continue
    if (t.hasRobber) continue
    if (t.type === 'desert') continue
    const res = t.type as Resource

    const center = axialToPixel(t.q, t.r, size)
    const corners = hexCorners(center, size)
    const cornerNodeIds = corners.map((pt) => pointToNodeId(pt))

    for (const pl of game.nodes) {
      if (!cornerNodeIds.includes(pl.nodeId)) continue
      const amount = pl.kind === 'city' ? 2 : 1
      const target = game.players.find((pp) => pp._id === pl.playerId)
      if (!target) continue
      target.resources[res] = (target.resources[res] ?? 0) + amount
      payouts[target._id] = payouts[target._id] ?? {}
      payouts[target._id]![res] = ((payouts[target._id]![res] ?? 0) as number) + amount
    }
  }

  // Stats: resource gains from dice payouts
  for (const [pid, byRes] of Object.entries(payouts)) {
    addResourceGain(game, pid, byRes as any)
  }

  const parts: string[] = []
  for (const [pid, byRes] of Object.entries(payouts)) {
    const name = game.players.find((x) => x._id === pid)?.name ?? pid
    const gains = Object.entries(byRes)
      .filter(([, v]) => (v ?? 0) > 0)
      .map(([r, v]) => `+${v} ${r}`)
      .join(', ')
    if (gains) parts.push(`${name}: ${gains}`)
  }
  addLog(game, parts.length ? `Kiosztás (${sum}): ${parts.join(' · ')}` : `Kiosztás (${sum}): nincs (nincs érintett település/város).`)
  return sum
}

export function endTurn(game: GameDoc, playerId: string) {
  if (game.phase !== 'main') throw new Error('Kör vége csak a fő játékban.')
  requireTurn(game, playerId)
  ensureDevFields(game)

  const idx = game.players.findIndex((pl) => idEq(pl._id, playerId))
  const nextIdx = (idx + 1) % game.players.length
  game.currentPlayerId = game.players[nextIdx]._id

    ; (game as any).turnHasRolled = false
    ; (game as any).devPlayedThisTurn = false
    ; (game as any).turnNumber = Number((game as any).turnNumber ?? 1) + 1

  addLog(game, `Kör vége. Következő: ${game.players[nextIdx].name}.`)
}

export function buyDevCard(game: GameDoc, playerId: string) {
  if (game.phase !== 'main') throw new Error('Fejlesztési kártyát csak a fő játékban lehet venni.')
  requireTurn(game, playerId)
  ensureDevFields(game)
  const p: any = game.players.find((x) => idEq(x._id, playerId))!
  ensurePlayerDev(p)
  if (!(game as any).turnHasRolled) throw new Error('Előbb dobj.')
  const deck: DevCardKind[] = (game as any).devDeck ?? []
  if (deck.length <= 0) throw new Error('Elfogyott a fejlesztési pakli.')
  requireResources(p, { wheat: 1, sheep: 1, ore: 1 } as any)
  payResources(p, { wheat: 1, sheep: 1, ore: 1 } as any)
  const kind = deck.shift()!
  const card = { id: nanoid(10), kind, boughtTurn: Number((game as any).turnNumber ?? 1) }
  p.devCards.push(card)

  if (kind === 'victory') {
    p.victoryPoints += 1
    addLog(game, `${p.name} fejlesztési kártyát vett. (+1 VP)`)
  } else {
    addLog(game, `${p.name} fejlesztési kártyát vett.`)
  }
}

function takeAllOfResource(from: any, res: Resource): number {
  const amt = Number(from.resources?.[res] ?? 0)
  if (amt > 0) from.resources[res] = 0
  return amt
}

export function playDevCard(game: GameDoc, playerId: string, cardId: string, payload?: any) {
  if (game.phase !== 'main') throw new Error('Fejlesztési kártyát csak a fő játékban lehet kijátszani.')
  requireTurn(game, playerId)
  ensureDevFields(game)
  const p: any = game.players.find((x) => idEq(x._id, playerId))!
  ensurePlayerDev(p)
  if (!(game as any).turnHasRolled) throw new Error('Előbb dobj.')
  if ((game as any).devPlayedThisTurn) throw new Error('Ebben a körben már játszottál ki fejlesztési kártyát.')

  const turn = Number((game as any).turnNumber ?? 1)
  const idx = (p.devCards ?? []).findIndex((c: any) => c.id === cardId)
  if (idx < 0) throw new Error('Nincs ilyen fejlesztési kártyád.')
  const card = p.devCards[idx]
  if (card.kind === 'victory') throw new Error('A győzelmi pont kártyát nem kell kijátszani.')
  if (Number(card.boughtTurn ?? 0) >= turn) throw new Error('Most vetted — ebben a körben nem játszható ki.')

  // consume card
  p.devCards.splice(idx, 1)
    ; (game as any).devPlayedThisTurn = true

  if (card.kind === 'road_building') {
    p.freeRoadsToPlace = Number(p.freeRoadsToPlace ?? 0) + 2
    addLog(game, `${p.name} kijátszotta: Útépítés (+2 ingyen út).`)
    return
  }

  if (card.kind === 'year_of_plenty') {
    const r1 = payload?.r1 as Resource | undefined
    const r2 = payload?.r2 as Resource | undefined
    if (!r1 || !validateResourceName(r1)) throw new Error('Hiányzó/érvénytelen erőforrás (1).')
    if (!r2 || !validateResourceName(r2)) throw new Error('Hiányzó/érvénytelen erőforrás (2).')
    p.resources[r1] = Number(p.resources[r1] ?? 0) + 1
    p.resources[r2] = Number(p.resources[r2] ?? 0) + 1
    addLog(game, `${p.name} kijátszotta: Bőség éve (+1 ${r1}, +1 ${r2}).`)
    return
  }

  if (card.kind === 'monopoly') {
    const res = payload?.resource as Resource | undefined
    if (!res || !validateResourceName(res)) throw new Error('Hiányzó/érvénytelen erőforrás.')
    let total = 0
    for (const other of game.players as any[]) {
      if (idEq(other._id, playerId)) continue
      total += takeAllOfResource(other, res)
    }
    p.resources[res] = Number(p.resources[res] ?? 0) + total
    addLog(game, `${p.name} kijátszotta: Monopólium (${res}) (+${total}).`)
    return
  }

  if (card.kind === 'knight') {
    p.knightsPlayed = Number(p.knightsPlayed ?? 0) + 1
    startRobber(game, playerId, 'knight')
    addLog(game, `${p.name} kijátszotta: Lovag. Helyezd át a rablót.`)
    // Largest Army (>=3)
    const size = Number(p.knightsPlayed ?? 0)
    const curOwner = (game as any).largestArmyPlayerId as string | null
    const curSize = Number((game as any).largestArmySize ?? 0)
    if (size >= 3 && size > curSize && curOwner !== playerId) {
      // transfer points
      if (curOwner) {
        const old = (game as any).players.find((x: any) => x._id === curOwner)
        if (old) old.victoryPoints = Math.max(0, Number(old.victoryPoints ?? 0) - 2)
      }
      p.victoryPoints = Number(p.victoryPoints ?? 0) + 2
        ; (game as any).largestArmyPlayerId = playerId
        ; (game as any).largestArmySize = size
      addLog(game, `${p.name} megszerezte: Legnagyobb hadsereg (+2 VP).`)
    } else if (curOwner === playerId) {
      ; (game as any).largestArmySize = Math.max(curSize, size)
    }
    return
  }

  throw new Error('Ismeretlen fejlesztési kártya.')
}


export function moveRobber(game: GameDoc, playerId: string, tileId: string) {
  if (game.phase !== 'main') throw new Error('Rablót csak a fő játékban lehet mozgatni.')
  requireTurn(game, playerId)
  ensureRobberFields(game)
  const r = (game as any).robber
  if (!r.pending || r.byPlayerId !== playerId) throw new Error('Most nem mozgathatod a rablót.')
  const tile = (game.tiles as any as HexTile[]).find((t) => t.id === tileId)
  if (!tile) throw new Error('Nincs ilyen mező.')
  // Move robber
  for (const t of game.tiles as any as HexTile[]) t.hasRobber = false
  tile.hasRobber = true

  // Determine steal candidates: players with settlements/cities on any adjacent node, excluding mover, and who have resources.
  const size = 48
  const center = axialToPixel(tile.q, tile.r, size)
  const corners = hexCorners(center, size)
  const nodeIds = corners.map((p) => pointToNodeId(p))
  const candidateIds = new Set<string>()
  for (const n of game.nodes as any[]) {
    if (!nodeIds.includes(n.nodeId)) continue
    if (n.playerId === playerId) continue
    candidateIds.add(n.playerId)
  }

  const candidates = Array.from(candidateIds).filter((pid) => {
    const pl: any = (game.players as any[]).find((x) => x._id === pid)
    if (!pl) return false
    const totalRes = Object.values(pl.resources ?? {}).reduce((a: number, b: any) => a + Number(b ?? 0), 0)
    return totalRes > 0
  })

  if (candidates.length === 0) {
    addLog(game, `Rabló áthelyezve. Nincs kitől rabolni.`)
    clearRobber(game)
    return
  }

  r.awaitingSteal = true
  r.candidates = candidates
  addLog(game, `Rabló áthelyezve. Válassz játékost a rabláshoz.`)
}

export function robberSteal(game: GameDoc, playerId: string, targetPlayerId: string, resource: Resource) {
  if (game.phase !== 'main') throw new Error('Rablás csak a fő játékban.')
  requireTurn(game, playerId)
  ensureRobberFields(game)
  const r = (game as any).robber
  if (!r.pending || r.byPlayerId !== playerId || !r.awaitingSteal) throw new Error('Most nem rabolhatsz.')
  if (!Array.isArray(r.candidates) || !r.candidates.includes(targetPlayerId)) throw new Error('Érvénytelen célpont.')
  const me: any = (game.players as any[]).find((x) => idEq(x._id, playerId))
  const victim: any = (game.players as any[]).find((x) => x._id === targetPlayerId)
  if (!me || !victim) throw new Error('Játékos nem található.')
  const have = Number(victim.resources?.[resource] ?? 0)
  if (have <= 0) throw new Error(`A kiválasztott lap (${resource}) nincs ${victim.name} kezében.`)
  victim.resources[resource] = Math.max(0, have - 1)
  me.resources[resource] = Number(me.resources?.[resource] ?? 0) + 1
  addLog(game, `${me.name} rabolt: ${resource} (${victim.name} játékostól).`)
  clearRobber(game)
}

export function tradeWithBank(game: GameDoc, playerId: string, give: Resource, get: Resource) {
  if (game.phase !== 'main') throw new Error('Bank csere csak a fő játékban.')
  requireTurn(game, playerId)
  if (give === get) throw new Error('Ugyanarra az erőforrásra nem cserélhetsz.')
  const p = game.players.find((x) => idEq(x._id, playerId))!
  ensurePortsShape(p as any)

  const twoToOne = !!(p as any).ports?.twoToOne?.[give]
  const threeToOne = !!(p as any).ports?.threeToOne
  const rate = twoToOne ? 2 : threeToOne ? 3 : 4

  const have = (p as any).resources[give] ?? 0
  if (have < rate) throw new Error(`Nincs elég ${give}: ${have}/${rate}.`)

    ; (p as any).resources[give] = have - rate
    ; (p as any).resources[get] = ((p as any).resources[get] ?? 0) + 1

  addLog(game, `${p.name} bankot cserélt: -${rate} ${give} → +1 ${get} (${rate}:1).`)
}

export function sanitizeForClient(game: GameDoc, maybePlayerId?: string) {
  ensureDevFields(game)
  ensureLongestRoadFields(game)
  ensureStatsFields(game)
  const players = game.players.map((p) => ({
    _id: asId(p._id),
    name: p.name,
    color: p.color,
    victoryPoints: p.victoryPoints,
    roads: p.roads,
    settlements: p.settlements,
    cities: p.cities,
    resourceCount: Object.values(p.resources as any).reduce((a: number, b: number) => a + (b as number), 0),
  }))

  const you = maybePlayerId
    ? (() => {
      const p = game.players.find((x) => idEq(x._id, maybePlayerId))
      if (!p) return undefined
      ensurePortsShape(p as any)
      return {
        playerId: asId(p._id),
        name: p.name,
        resources: p.resources as Record<Resource, number>,
        ports: (p as any).ports,
        devCards: (p as any).devCards ?? [],
        knightsPlayed: Number((p as any).knightsPlayed ?? 0),
        freeRoadsToPlace: Number((p as any).freeRoadsToPlace ?? 0),
      }
    })()
    : undefined

  return {
    _id: game._id,
    mapType: ((game as any).mapType ?? 'classic') as any,
    mapTemplateId: (game as any).mapTemplateId ?? null,
    settings: (game as any).settings ?? { maxVictoryPoints: 10, maxPlayers: 4 },
    createdAt: game.createdAt.toISOString(),
    updatedAt: game.updatedAt.toISOString(),
    phase: game.phase,
    setupStep: game.setupStep,
    setupRound: game.setup?.round ?? 1,
    setupDirection: game.setup?.direction ?? 'forward',
    players,
    currentPlayerId: game.currentPlayerId,
    tiles: game.tiles,
    ports: (game as any).ports ?? [],
    nodes: game.nodes,
    edges: game.edges,
    log: game.log.map((l) => ({ ts: l.ts.toISOString(), msg: l.msg })),
    chat: game.chat.map((c) => ({ ts: c.ts.toISOString(), playerId: c.playerId ?? null, name: c.name, text: c.text })),
    tradeOffers: ((game as any).tradeOffers ?? []).map((t: any) => ({
      id: t.id,
      fromPlayerId: t.fromPlayerId,
      toPlayerId: t.toPlayerId ?? null,
      give: t.give,
      get: t.get,
      status: t.status,
      ts: (t.ts instanceof Date ? t.ts : new Date(t.ts)).toISOString(),
    })),
    lastRoll: (game as any).lastRoll
      ? {
        ts: (game as any).lastRoll.ts.toISOString(),
        playerId: (game as any).lastRoll.playerId,
        d1: (game as any).lastRoll.d1,
        d2: (game as any).lastRoll.d2,
        sum: (game as any).lastRoll.sum,
      }
      : null,

    // End-of-game
    winnerPlayerId: (game as any).winnerPlayerId ?? null,
    finishedAt: (game as any).finishedAt ? (new Date((game as any).finishedAt)).toISOString() : null,

    // Statistics
    stats: (() => {
      const s = (game as any).stats ?? {}
      const rc: any = s.rollCounts instanceof Map ? Object.fromEntries(s.rollCounts) : (s.rollCounts ?? {})
      const rg: any = s.resourceGains instanceof Map ? Object.fromEntries(s.resourceGains) : (s.resourceGains ?? {})
      return { rollCounts: rc, resourceGains: rg }
    })(),
    turnHasRolled: (game as any).turnHasRolled ?? false,
    turnNumber: Number((game as any).turnNumber ?? 1),
    devDeckCount: Array.isArray((game as any).devDeck) ? (game as any).devDeck.length : 0,
    devPlayedThisTurn: (game as any).devPlayedThisTurn ?? false,
    largestArmyPlayerId: (game as any).largestArmyPlayerId ?? null,
    largestArmySize: Number((game as any).largestArmySize ?? 0),
    longestRoadPlayerId: (game as any).longestRoadPlayerId ?? null,
    longestRoadLength: Number((game as any).longestRoadLength ?? 0),
    robber: (() => {
      ensureRobberFields(game)
      const r = (game as any).robber
      const viewerIsMover = maybePlayerId && String(r.byPlayerId ?? '') === String(maybePlayerId)
      const cands = (r.candidates ?? []).map((pid: string) => {
        const p = (game.players as any[]).find((x) => x._id === pid)
        return p
          ? {
            playerId: asId(p._id),
            name: p.name,
            color: p.color,
            resourceCount: Object.values(p.resources as any).reduce((a: number, b: number) => a + (b as number), 0),
            // Only the robber mover sees exact stealable resources (requested feature).
            ...(viewerIsMover && Boolean(r.awaitingSteal)
              ? {
                resources: {
                  wood: Number(p.resources?.wood ?? 0),
                  brick: Number(p.resources?.brick ?? 0),
                  wheat: Number(p.resources?.wheat ?? 0),
                  sheep: Number(p.resources?.sheep ?? 0),
                  ore: Number(p.resources?.ore ?? 0),
                } as Record<Resource, number>,
              }
              : {}),
          }
          : null
      }).filter(Boolean)
      return {
        pending: Boolean(r.pending),
        byPlayerId: String(r.byPlayerId ?? ''),
        reason: (r.reason ?? null) as any,
        awaitingSteal: Boolean(r.awaitingSteal),
        candidates: cands as any,
      }
    })(),
    ...(you ? { you } : {}),
  }
}

function emptyTradeLine(): Record<Resource, number> {
  return { wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 }
}

function normalizeTradeLine(line: any): Record<Resource, number> {
  const out = emptyTradeLine()
  for (const k of Object.keys(out) as Resource[]) {
    const v = Number(line?.[k] ?? 0)
    out[k] = Number.isFinite(v) && v > 0 ? Math.floor(v) : 0
  }
  return out
}

function total(line: Record<Resource, number>): number {
  return (Object.values(line) as number[]).reduce((a, b) => a + b, 0)
}

function hasResources(p: any, need: Record<Resource, number>): boolean {
  for (const k of Object.keys(need) as Resource[]) {
    if ((p.resources?.[k] ?? 0) < (need[k] ?? 0)) return false
  }
  return true
}

function applyDelta(p: any, delta: Record<Resource, number>) {
  for (const k of Object.keys(delta) as Resource[]) {
    p.resources[k] = (p.resources?.[k] ?? 0) + (delta[k] ?? 0)
  }
}

function requireMainTradeWindow(game: GameDoc, playerId: string) {
  if (game.phase !== 'main') throw new Error('Kereskedni csak main fázisban lehet.')
  requireTurn(game, playerId)
  if (!((game as any).turnHasRolled ?? false)) throw new Error('Dobás után lehet kereskedni.')
}

export function createTradeOffer(game: GameDoc, playerId: string, toPlayerId: string | null, giveLine: any, getLine: any) {
  requireMainTradeWindow(game, playerId)
  const from = game.players.find((x) => idEq(x._id, playerId))
  if (!from) throw new Error('Ismeretlen játékos.')

  if (toPlayerId) {
    const exists = game.players.some((x) => x._id === toPlayerId)
    if (!exists) throw new Error('Cél játékos nem létezik.')
    if (toPlayerId === playerId) throw new Error('Magadnak nem küldhetsz ajánlatot.')
  }

  const give = normalizeTradeLine(giveLine)
  const get = normalizeTradeLine(getLine)
  if (total(give) <= 0 || total(get) <= 0) throw new Error('Adj meg mit adsz és mit kérsz.')
  if (total(give) > 10 || total(get) > 10) throw new Error('Túl nagy ajánlat (max 10 kártya oldalanként).')

  if (!hasResources(from as any, give)) throw new Error('Nincs elég erőforrásod az ajánlathoz.')

    ; (game as any).tradeOffers = (game as any).tradeOffers ?? []
  const id = nanoid(10)
    ; (game as any).tradeOffers.push({ id, fromPlayerId: playerId, toPlayerId: toPlayerId ?? null, give, get, status: 'open', ts: new Date() })
  addLog(game, `${from.name} kereskedelmi ajánlatot tett.`)
}

export function cancelTradeOffer(game: GameDoc, playerId: string, offerId: string) {
  const offers = ((game as any).tradeOffers ?? []) as any[]
  const t = offers.find((x) => x.id === offerId)
  if (!t) throw new Error('Nincs ilyen ajánlat.')
  if (t.fromPlayerId !== playerId) throw new Error('Csak az ajánlat tevője törölheti.')
  if (t.status !== 'open') throw new Error('Ez az ajánlat már nem nyitott.')
  t.status = 'cancelled'
  t.ts = new Date()
  const from = game.players.find((x) => idEq(x._id, playerId))
  addLog(game, `${from?.name ?? 'Valaki'} visszavonta az ajánlatot.`)
}

export function rejectTradeOffer(game: GameDoc, playerId: string, offerId: string) {
  const offers = ((game as any).tradeOffers ?? []) as any[]
  const t = offers.find((x) => x.id === offerId)
  if (!t) throw new Error('Nincs ilyen ajánlat.')
  if (t.status !== 'open') throw new Error('Ez az ajánlat már nem nyitott.')
  if (t.toPlayerId && t.toPlayerId !== playerId) throw new Error('Ez az ajánlat nem neked szól.')
  t.status = 'rejected'
  t.ts = new Date()
  const p = game.players.find((x) => idEq(x._id, playerId))
  addLog(game, `${p?.name ?? 'Valaki'} elutasította az ajánlatot.`)
}

export function acceptTradeOffer(game: GameDoc, playerId: string, offerId: string) {
  // Offers are accepted during the offerer's turn (classic flow)
  if (game.phase !== 'main') throw new Error('Most nem lehet elfogadni ajánlatot.')
  const offers = ((game as any).tradeOffers ?? []) as any[]
  const t = offers.find((x) => x.id === offerId)
  if (!t) throw new Error('Nincs ilyen ajánlat.')
  if (t.status !== 'open') throw new Error('Ez az ajánlat már nem nyitott.')
  if (t.toPlayerId && t.toPlayerId !== playerId) throw new Error('Ez az ajánlat nem neked szól.')
  if (t.fromPlayerId === playerId) throw new Error('A saját ajánlatodat nem fogadhatod el.')

  if (game.currentPlayerId !== t.fromPlayerId) throw new Error('Csak az ajánlat tevőjének körében fogadható el.')

  const from = game.players.find((x) => x._id === t.fromPlayerId) as any
  const to = game.players.find((x) => idEq(x._id, playerId)) as any
  if (!from || !to) throw new Error('Játékos nem található.')

  const give = normalizeTradeLine(t.give)
  const get = normalizeTradeLine(t.get)

  if (!hasResources(from, give)) throw new Error('Az ajánlat tevőjénél már nincs meg az erőforrás.')
  if (!hasResources(to, get)) throw new Error('Nálad nincs meg az erőforrás a cseréhez.')

  // Transfer: from gives "give" to "to"; to gives "get" to "from"
  applyDelta(from, { wood: -give.wood, brick: -give.brick, wheat: -give.wheat, sheep: -give.sheep, ore: -give.ore } as any)
  applyDelta(to, give)

  applyDelta(to, { wood: -get.wood, brick: -get.brick, wheat: -get.wheat, sheep: -get.sheep, ore: -get.ore } as any)
  applyDelta(from, get)

  t.status = 'accepted'
  t.ts = new Date()
  addLog(game, `${to.name} elfogadta ${from.name} ajánlatát.`)
}

export function validateResourceName(x: string): x is Resource {
  return x === 'wood' || x === 'brick' || x === 'wheat' || x === 'sheep' || x === 'ore'
}
