'use client'

import { useMemo } from 'react'
import type { GameState, PortKind, Resource, TileType } from '@/types/game'
import { axialToPixel, buildGraphFromTiles, hexCorners } from '@/lib/shared/boardGeometry'

function tileLabel(type: TileType) {
  switch (type) {
    case 'wood': return 'Erdő'
    case 'brick': return 'Agyag'
    case 'wheat': return 'Búza'
    case 'sheep': return 'Juh'
    case 'ore': return 'Érc'
    case 'desert': return 'Sivatag'
  }
}

function portLabel(kind: PortKind) {
  if (kind === 'threeToOne') return '3:1'
  const map: Record<Resource, string> = { wood: 'Fa', brick: 'Tégla', wheat: 'Búza', sheep: 'Juh', ore: 'Érc' }
  return map[kind];
}

export function Board({
  game,
  me,
  onPlaceSettlement,
  onPlaceRoad,
  buildMode,
  onBuildSettlement,
  onBuildRoad,
  onBuildCity,
  onMoveRobber,
}: {
  game: GameState
  me: string
  onPlaceSettlement: (nodeId: string) => void
  onPlaceRoad: (edgeId: string) => void
  buildMode: 'none' | 'road' | 'settlement' | 'city'
  onBuildSettlement: (nodeId: string) => void
  onBuildRoad: (edgeId: string) => void
  onBuildCity: (nodeId: string) => void
  onMoveRobber?: (tileId: string) => void
}) {

const robberMoveMode = Boolean((game as any).robber?.pending) && (game as any).robber?.byPlayerId === me && !Boolean((game as any).robber?.awaitingSteal)

  const size = 48 // base hex size in px (SVG units)
  const graph = useMemo(() => buildGraphFromTiles(game.tiles, size), [game.tiles])

  const boardCenter = useMemo(() => {
    if (!game.tiles.length) return { x: 0, y: 0 }
    let sx = 0
    let sy = 0
    for (const t of game.tiles) {
      const c = axialToPixel(t.q, t.r, size)
      sx += c.x
      sy += c.y
    }
    return { x: sx / game.tiles.length, y: sy / game.tiles.length }
  }, [game.tiles, size])
  const placementsByNode = useMemo(() => {
    const m = new Map<string, { playerId: string; kind: 'settlement' | 'city' }>()
    for (const n of game.nodes) m.set(n.nodeId, { playerId: n.playerId, kind: n.kind })
    return m
  }, [game.nodes])
  const placementsByEdge = useMemo(() => {
    const m = new Map<string, string>()
    for (const e of game.edges) m.set(e.edgeId, e.playerId)
    return m
  }, [game.edges])
  const playerColor = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of game.players) m.set(p._id, p.color)
    return m
  }, [game.players])

  const isMyTurn = game.currentPlayerId === me
  const canPlaceSettlement = game.phase === 'setup' && isMyTurn && game.setupStep === 'place_settlement'
  const canPlaceRoad = game.phase === 'setup' && isMyTurn && game.setupStep === 'place_road'

  const canBuildInMain = game.phase === 'main' && isMyTurn
  const canBuildRoad = canBuildInMain && buildMode === 'road'
  const canBuildSettlement = canBuildInMain && buildMode === 'settlement'
  const canBuildCity = canBuildInMain && buildMode === 'city'

  const extents = useMemo(() => {
    // During first render, the game state might not be loaded yet.
    // Guard against empty arrays so we never emit an invalid viewBox (Infinity/NaN).
    if (!graph.nodes.length) {
      return { minX: -200, minY: -200, w: 400, h: 400 }
    }
    const xs = graph.nodes.map((n) => n.p.x)
    const ys = graph.nodes.map((n) => n.p.y)
    const minX = Math.min(...xs) - size * 1.2
    const maxX = Math.max(...xs) + size * 1.2
    const minY = Math.min(...ys) - size * 1.2
    const maxY = Math.max(...ys) + size * 1.2
    const w = Math.max(1, maxX - minX)
    const h = Math.max(1, maxY - minY)
    return { minX, minY, w, h }
  }, [graph.nodes, size])

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-2 shadow-xl shadow-black/20 md:p-3">
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/10">
        <svg
          viewBox={`${extents.minX} ${extents.minY} ${extents.w} ${extents.h}`}
          className="h-[55vh] w-full min-h-[380px] select-none md:h-[62vh] lg:h-[68vh]"
          role="img"
          aria-label="Catan tábla"
        >
          <defs>
            <pattern id="p_wood" width="12" height="12" patternUnits="userSpaceOnUse">
              <path d="M0 12 L12 0" stroke="rgba(34,197,94,.35)" strokeWidth="2" />
            </pattern>
            <pattern id="p_brick" width="14" height="10" patternUnits="userSpaceOnUse">
              <path d="M0 5 H14" stroke="rgba(251,113,133,.35)" strokeWidth="2" />
              <path d="M0 0 H14" stroke="rgba(251,113,133,.20)" strokeWidth="2" />
              <path d="M0 10 H14" stroke="rgba(251,113,133,.20)" strokeWidth="2" />
            </pattern>
            <pattern id="p_wheat" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.6" fill="rgba(250,204,21,.35)" />
              <circle cx="8" cy="6" r="1.6" fill="rgba(250,204,21,.25)" />
            </pattern>
            <pattern id="p_sheep" width="12" height="12" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="2" fill="rgba(134,239,172,.28)" />
              <circle cx="9" cy="9" r="2" fill="rgba(134,239,172,.18)" />
            </pattern>
            <pattern id="p_ore" width="12" height="12" patternUnits="userSpaceOnUse">
              <path d="M2 10 L6 2 L10 10 Z" fill="rgba(148,163,184,.35)" />
            </pattern>
            <pattern id="p_desert" width="14" height="14" patternUnits="userSpaceOnUse">
              <path d="M0 14 L14 0" stroke="rgba(251,191,36,.20)" strokeWidth="2" />
              <path d="M-4 10 L10 -4" stroke="rgba(251,191,36,.12)" strokeWidth="2" />
            </pattern>
          </defs>

          {/* Tiles */}
          {game.tiles.map((t) => {
            const c = axialToPixel(t.q, t.r, size)
            const corners = hexCorners(c, size)
            const d = corners.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
            const fill = `url(#p_${t.type})`
            return (
              <g key={t.id}>
                <path
                  d={d}
                  fill={fill}
                  stroke={robberMoveMode ? "rgba(248,113,113,.55)" : "rgba(255,255,255,.14)"}
                  strokeWidth={robberMoveMode ? 3 : 2}
                  className={robberMoveMode ? "cursor-pointer hover:opacity-95" : undefined}
                  onClick={robberMoveMode && onMoveRobber ? () => onMoveRobber(t.id) : undefined}
                />

                {/* number token */}
                {t.numberToken ? (
                  <g>
                    <circle cx={c.x} cy={c.y} r={16} fill="rgba(2,6,23,.55)" stroke="rgba(255,255,255,.16)" />
                    <text x={c.x} y={c.y + 5} textAnchor="middle" fontSize={14} fontWeight={800} fill={`${t.numberToken === 6 || t.numberToken === 8 ? '#ff4f4f' : 'rgba(226,232,240,.95)'}`}>
                      {t.numberToken}
                    </text>
                  </g>
                ) : (
                  <g>
                    <text x={c.x} y={c.y + 5} textAnchor="middle" fontSize={12} fontWeight={700} fill="rgba(226,232,240,.6)">
                      {tileLabel(t.type)}
                    </text>
                  </g>
                )}

                {/* robber */}
                {t.hasRobber ? (
                  <g>
                    <circle cx={c.x + 20} cy={c.y - 18} r={10} fill="rgba(15,23,42,.85)" stroke="rgba(255,255,255,.18)" />
                    <text x={c.x + 20} y={c.y - 14} textAnchor="middle" fontSize={10} fontWeight={800} fill="rgba(248,113,113,.9)">
                      R
                    </text>
                  </g>
                ) : null}
              </g>
            )
          })}

          {/* Ports (dock starts from a corner; label sits off the edge mid) */}
          {(game.ports ?? []).map((p) => {
            const a = graph.nodes.find((n) => n.id === p.nodeA)?.p
            const b = graph.nodes.find((n) => n.id === p.nodeB)?.p
            if (!a || !b) return null

            // Midpoint of the shoreline edge.
            const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }

            // Outward normal from the edge (choose the direction that points away from the board center).
            const ex = b.x - a.x
            const ey = b.y - a.y
            const elen = Math.hypot(ex, ey) || 1
            const tx = ex / elen
            const ty = ey / elen
            // normals
            let nx = -ty
            let ny = tx
            const cx = mid.x - boardCenter.x
            const cy = mid.y - boardCenter.y
            if (nx * cx + ny * cy < 0) {
              nx = -nx
              ny = -ny
            }

            // Port marker sits 20px off the edge midpoint, outward.
            const offset = 20
            const labelPos = { x: mid.x + nx * offset, y: mid.y + ny * offset }

            // Two piers: one from each shoreline corner to the marker.
            const startA = a
            const startB = b

            // Dock head (a small platform) at the marker end, oriented perpendicular to the pier.
            // Use the midpoint-to-marker vector to orient the dock head.
            const pvx = labelPos.x - mid.x
            const pvy = labelPos.y - mid.y
            const plen = Math.hypot(pvx, pvy) || 1
            const pux = pvx / plen
            const puy = pvy / plen
            const px = -puy
            const py = pux
            const headLen = 10
            const halfW = 8
            const back = { x: labelPos.x - pux * headLen, y: labelPos.y - puy * headLen }
            const dockPoints = [
              `${labelPos.x + px * halfW},${labelPos.y + py * halfW}`,
              `${labelPos.x - px * halfW},${labelPos.y - py * halfW}`,
              `${back.x - px * halfW},${back.y - py * halfW}`,
              `${back.x + px * halfW},${back.y + py * halfW}`,
            ].join(' ')

            return (
              <g key={p.id}>
                {/* two piers (one from each corner) */}
                <line
                  x1={startA.x}
                  y1={startA.y}
                  x2={labelPos.x}
                  y2={labelPos.y}
                  stroke="rgba(226,232,240,.22)"
                  strokeWidth={6}
                  strokeLinecap="round"
                />
                <line
                  x1={startB.x}
                  y1={startB.y}
                  x2={labelPos.x}
                  y2={labelPos.y}
                  stroke="rgba(226,232,240,.22)"
                  strokeWidth={6}
                  strokeLinecap="round"
                />

                {/* platform */}
                <polygon points={dockPoints} fill="rgba(2,6,23,.70)" stroke="rgba(255,255,255,.18)" strokeWidth={2} />

                {/* label marker */}
                <circle cx={labelPos.x} cy={labelPos.y} r={14} fill="rgba(2,6,23,.70)" stroke="rgba(255,255,255,.18)" />
                <text x={labelPos.x} y={labelPos.y + 4} textAnchor="middle" fontSize={10} fontWeight={900} fill="rgba(226,232,240,.95)">
                  {portLabel(p.kind)}
                </text>
              </g>
            )
          })}

          {/* Roads */}
          {graph.edges.map((e) => {
            const owner = placementsByEdge.get(e.id)
            if (!owner) return null
            const a = graph.nodes.find((n) => n.id === e.a)!.p
            const b = graph.nodes.find((n) => n.id === e.b)!.p
            return (
              <line
                key={e.id}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={playerColor.get(owner) ?? 'white'}
                strokeWidth={8}
                strokeLinecap="round"
                opacity={0.9}
              />
            )
          })}

          {/* Settlements */}
          {graph.nodes.map((n) => {
            const pl = placementsByNode.get(n.id)
            if (!pl) return null
            const col = playerColor.get(pl.playerId) ?? 'white'
            return (
              <g key={n.id}>
                <circle cx={n.p.x} cy={n.p.y} r={10} fill={col} opacity={0.9} />
                <circle cx={n.p.x} cy={n.p.y} r={11} fill="none" stroke="rgba(2,6,23,.55)" strokeWidth={3} />
              </g>
            )
          })}

          {/* Clickable nodes (setup settlement) */}
          {canPlaceSettlement
            ? graph.nodes.map((n) => {
              const occupied = placementsByNode.has(n.id)
              return (
                <circle
                  key={`clickN_${n.id}`}
                  cx={n.p.x}
                  cy={n.p.y}
                  r={13}
                  strokeWidth={2}
                  className={(occupied ? '' : 'cursor-pointer hover:opacity-90') + ` ${occupied ? 'fill-transparent' : 'fill-sky-400/5 hover:fill-sky-400/20'} ${occupied ? 'stroke-transparent' : 'stroke-sky-400/30 hover:stroke-sky-400/80'}`}
                  onClick={() => {
                    if (occupied) return
                    onPlaceSettlement(n.id)
                  }}
                />
              )
            })
            : null}

          {/* Clickable nodes (main build settlement) */}
          {canBuildSettlement
            ? graph.nodes.map((n) => {
              const occupied = placementsByNode.has(n.id)
              return (
                <circle
                  key={`buildSet_${n.id}`}
                  cx={n.p.x}
                  cy={n.p.y}
                  r={14}
                  strokeWidth={2}
                  className={(occupied ? '' : 'cursor-pointer hover:opacity-90') + ` ${occupied ? 'fill-transparent' : 'fill-emerald-400/5 hover:fill-emerald-400/20'} ${occupied ? 'stroke-transparent' : 'stroke-emerald-400/30 hover:stroke-emerald-400/80'}`}
                  onClick={() => {
                    if (occupied) return
                    onBuildSettlement(n.id)
                  }}
                />
              )
            })
            : null}

          {/* Clickable nodes (main upgrade city) */}
          {canBuildCity
            ? graph.nodes.map((n) => {
              const pl = placementsByNode.get(n.id)
              const can = pl && pl.playerId === me && pl.kind === 'settlement'
              return (
                <circle
                  key={`buildCity_${n.id}`}
                  cx={n.p.x}
                  cy={n.p.y}
                  r={14}
                  strokeWidth={2}
                  className={(can ? '' : 'cursor-pointer hover:opacity-90') + ` ${can ? 'fill-transparent' : 'fill-amber-400/5 hover:fill-amber-400/20'} ${can ? 'stroke-transparent' : 'stroke-amber-400/30 hover:stroke-amber-400/80'}`}

                  onClick={() => {
                    if (!can) return
                    onBuildCity(n.id)
                  }}
                />
              )
            })
            : null}

          {/* Clickable edges (setup road) */}
          {canPlaceRoad
            ? graph.edges.map((e) => {
              const occupied = placementsByEdge.has(e.id)
              const a = graph.nodes.find((n) => n.id === e.a)!.p
              const b = graph.nodes.find((n) => n.id === e.b)!.p
              return (
                <line
                  key={`clickE_${e.id}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  strokeWidth={12}
                  strokeLinecap="round"
                  opacity={occupied ? 0 : 0.6}
                  className={(occupied ? '' : 'cursor-pointer') + ` ${(occupied ? 'stroke-transparent' : 'stroke-sky-400/20 hover:stroke-sky-400')}`}
                  onClick={() => {
                    if (occupied) return
                    onPlaceRoad(e.id)
                  }}
                />
              )
            })
            : null}

          {/* Clickable edges (main build road) */}
          {canBuildRoad
            ? graph.edges.map((e) => {
              const occupied = placementsByEdge.has(e.id)
              const a = graph.nodes.find((n) => n.id === e.a)!.p
              const b = graph.nodes.find((n) => n.id === e.b)!.p
              return (
                <line
                  key={`buildRoad_${e.id}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={occupied ? 'transparent' : 'rgba(59,130,246,.40)'}
                  strokeWidth={12}
                  strokeLinecap="round"
                  opacity={occupied ? 0 : 0.6}
                  className={(occupied ? '' : 'cursor-pointer') + ` ${(occupied ? 'stroke-transparent' : 'stroke-sky-400/20 hover:stroke-sky-400')}`}
                  onClick={() => {
                    if (occupied) return
                    onBuildRoad(e.id)
                  }}
                />
              )
            })
            : null}
        </svg>

        <div className="absolute left-2 top-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-slate-200">
          Tile-k: SVG pattern · Reszponzív viewBox
        </div>
      </div>

      <div className="mt-2 px-1 text-xs text-slate-400">
        {game.phase === 'setup'
          ? 'Setup-ban a táblára kattintva raksz le. (A szerver validál – hibánál piros toast.)'
          : buildMode === 'none'
            ? 'Fő játék: válassz építést jobb oldalt, vagy dobj és fejezd be a kört.'
            : buildMode === 'road'
              ? 'Építés mód: út (kattints egy élre).'
              : buildMode === 'settlement'
                ? 'Építés mód: település (kattints egy csomópontra).'
                : 'Építés mód: város (kattints a saját településedre).'}
      </div>
    </section>
  )
}
