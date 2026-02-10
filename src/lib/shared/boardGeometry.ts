import type { HexTile } from '@/types/game'

export type Point = { x: number; y: number }

export type BoardGraph = {
  nodes: { id: string; p: Point }[]
  edges: { id: string; a: string; b: string }[]
  nodeNeighbors: Record<string, string[]>
  edgeNodes: Record<string, { a: string; b: string }>
}

// Keep node id encoding consistent between client and server.
// NOTE: This intentionally mirrors the historical encoding used in buildGraphFromTiles.
export function pointToNodeId(p: Point): string {
  const k = roundKey(p, 10) // 0.1 precision
  return `N_${k.replace(',', '_').replace('-', 'm').replace('.', 'd')}`
}

// Pointy-top hex
export function axialToPixel(q: number, r: number, size: number): Point {
  const x = size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r)
  const y = size * ((3 / 2) * r)
  return { x, y }
}

export function hexCorners(center: Point, size: number): Point[] {
  const pts: Point[] = []
  for (let i = 0; i < 6; i++) {
    const angle = ((60 * i - 30) * Math.PI) / 180
    pts.push({
      x: center.x + size * Math.cos(angle),
      y: center.y + size * Math.sin(angle),
    })
  }
  return pts
}

function roundKey(p: Point, precision = 1): string {
  const x = Math.round(p.x * precision) / precision
  const y = Math.round(p.y * precision) / precision
  // Avoid -0
  const fx = Object.is(x, -0) ? 0 : x
  const fy = Object.is(y, -0) ? 0 : y
  return `${fx},${fy}`
}

export function buildGraphFromTiles(tiles: HexTile[], size: number): BoardGraph {
  const nodeByKey = new Map<string, { id: string; p: Point }>()
  const nodeIds: string[] = []

  // Collect unique corner points
  for (const t of tiles) {
    const c = axialToPixel(t.q, t.r, size)
    const corners = hexCorners(c, size)
    for (const p of corners) {
      const k = roundKey(p, 10) // 0.1 precision
      if (!nodeByKey.has(k)) {
        const id = `N_${k.replace(',', '_').replace('-', 'm').replace('.', 'd')}`
        nodeByKey.set(k, { id, p: { x: parseFloat(k.split(',')[0]), y: parseFloat(k.split(',')[1]) } })
        nodeIds.push(id)
      }
    }
  }

  const nodes = Array.from(nodeByKey.values())

  // Build edges by hex sides (pairs of consecutive corners)
  const edgeMap = new Map<string, { id: string; a: string; b: string }>()

  function getNodeId(p: Point): string {
    const k = roundKey(p, 10)
    const n = nodeByKey.get(k)
    if (!n) throw new Error('node missing')
    return n.id
  }

  for (const t of tiles) {
    const c = axialToPixel(t.q, t.r, size)
    const corners = hexCorners(c, size)
    for (let i = 0; i < 6; i++) {
      const a = getNodeId(corners[i])
      const b = getNodeId(corners[(i + 1) % 6])
      const key = [a, b].sort().join('|')
      if (!edgeMap.has(key)) {
        const id = `E_${key.replaceAll('|', '__')}`
        edgeMap.set(key, { id, a, b })
      }
    }
  }

  const edges = Array.from(edgeMap.values())

  // Neighbors
  const nodeNeighbors: Record<string, string[]> = {}
  for (const n of nodes) nodeNeighbors[n.id] = []
  for (const e of edges) {
    nodeNeighbors[e.a].push(e.b)
    nodeNeighbors[e.b].push(e.a)
  }

  const edgeNodes: Record<string, { a: string; b: string }> = {}
  for (const e of edges) edgeNodes[e.id] = { a: e.a, b: e.b }

  return { nodes, edges, nodeNeighbors, edgeNodes }
}

export function nodeDistanceOk(nodeId: string, occupied: Set<string>, nodeNeighbors: Record<string, string[]>): boolean {
  // Catan distance rule: no adjacent settlements
  if (occupied.has(nodeId)) return false
  for (const nb of nodeNeighbors[nodeId] ?? []) {
    if (occupied.has(nb)) return false
  }
  return true
}
