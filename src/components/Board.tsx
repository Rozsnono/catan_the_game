'use client'

import { useCallback, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react'
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

function portIcon(kind: PortKind) {
  // Small icon for port marker (purely visual).
  const common = { fill: 'none', stroke: 'rgba(226,232,240,.92)', strokeWidth: 2.1, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (kind === 'threeToOne') {
    return (
      <g transform="translate(0 -5) scale(0.95)">
        <path d="M -7 2 C -3 -2, 3 -2, 7 2" {...common} opacity={0.9} />
        <path d="M -6 -4 L -2 -8" {...common} opacity={0.75} />
        <path d="M 6 -4 L 2 -8" {...common} opacity={0.75} />
      </g>
    )
  }
  switch (kind) {
    case 'wood':
      return (
        <g transform="translate(0 -6)">
          <path d="M 0 -7 C -4 -5, -4 -1, 0 1 C 4 -1, 4 -5, 0 -7 Z" {...common} opacity={0.9} />
          <path d="M 0 1 L 0 7" {...common} opacity={0.75} />
        </g>
      )
    case 'brick':
      return (
        <g transform="translate(0 -6)">
          <rect x={-7} y={-6} width={14} height={10} rx={2} ry={2} fill="rgba(2,6,23,.30)" stroke="rgba(226,232,240,.85)" strokeWidth={2} />
          <path d="M -7 -1 H 7" {...common} opacity={0.6} />
          <path d="M 0 -6 V 4" {...common} opacity={0.6} />
        </g>
      )
    case 'wheat':
      return (
        <g transform="translate(0 -6)">
          <path d="M -1 7 V -7" {...common} opacity={0.8} />
          <path d="M -1 -4 C -4 -4, -4 -1, -1 -1" {...common} opacity={0.85} />
          <path d="M -1 -1 C -4 -1, -4 2, -1 2" {...common} opacity={0.75} />
          <path d="M -1 -4 C 2 -4, 2 -1, -1 -1" {...common} opacity={0.65} />
          <path d="M -1 -1 C 2 -1, 2 2, -1 2" {...common} opacity={0.55} />
        </g>
      )
    case 'sheep':
      return (
        <g transform="translate(0 -6)">
          <path d="M -6 0 C -6 -4, -2 -6, 1 -4 C 4 -6, 7 -3, 6 1 C 6 5, 2 6, -1 4 C -4 6, -6 4, -6 0 Z" {...common} opacity={0.85} />
        </g>
      )
    case 'ore':
      return (
        <g transform="translate(0 -6)">
          <path d="M -7 5 L -2 -6 L 2 -2 L 7 5 Z" {...common} opacity={0.9} />
          <path d="M -2 -6 L 2 -2" {...common} opacity={0.6} />
        </g>
      )
  }
}

export function Board({
  game,
  me,
  highlightRollNumber,
  highlightRollKey,
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
  highlightRollNumber?: number | null
  highlightRollKey?: number | null
  onPlaceSettlement: (nodeId: string) => void
  onPlaceRoad: (edgeId: string) => void
  buildMode: 'none' | 'road' | 'settlement' | 'city'
  onBuildSettlement: (nodeId: string) => void
  onBuildRoad: (edgeId: string) => void
  onBuildCity: (nodeId: string) => void
  onMoveRobber?: (tileId: string) => void
}) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [panZoom, setPanZoom] = useState({ scale: 1, tx: 0, ty: 0 })
  const dragRef = useRef<{ active: boolean; pointerId: number | null; start: { x: number; y: number } | null; origin: { tx: number; ty: number } }>(
    { active: false, pointerId: null, start: null, origin: { tx: 0, ty: 0 } }
  )

  const [hoverEdgeId, setHoverEdgeId] = useState<string | null>(null)
  const [hoverTileId, setHoverTileId] = useState<string | null>(null)
  const [hoverClientPos, setHoverClientPos] = useState<{ x: number; y: number } | null>(null)

  const clientToSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const inv = ctm.inverse()
    const sp = pt.matrixTransform(inv)
    return { x: sp.x, y: sp.y }
  }, [])

  const onWheel = useCallback((e: WheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    const svg = svgRef.current
    if (!svg) return

    const { x: cx, y: cy } = clientToSvg(e.clientX, e.clientY)
    setPanZoom((v) => {
      const zoomFactor = e.deltaY > 0 ? 0.92 : 1.08
      const nextScale = Math.min(3, Math.max(0.5, v.scale * zoomFactor))
      // model point under cursor before zoom
      const px = (cx - v.tx) / v.scale
      const py = (cy - v.ty) / v.scale
      // new translate so that px,py stays under cursor
      const nextTx = cx - px * nextScale
      const nextTy = cy - py * nextScale
      return { scale: nextScale, tx: nextTx, ty: nextTy }
    })
  }, [clientToSvg])

  const onPointerDown = useCallback((e: PointerEvent<SVGSVGElement>) => {
    // Pan only with SHIFT + drag (so it doesn't break build/click interactions)
    if (e.button !== 0 || !e.shiftKey) return
    const svg = svgRef.current
    if (!svg) return
    try { svg.setPointerCapture(e.pointerId) } catch { }

    const p = clientToSvg(e.clientX, e.clientY)
    dragRef.current.active = true
    dragRef.current.pointerId = e.pointerId
    dragRef.current.start = p
    dragRef.current.origin = { tx: panZoom.tx, ty: panZoom.ty }
  }, [clientToSvg, panZoom.tx, panZoom.ty])

  const onPointerMove = useCallback((e: PointerEvent<SVGSVGElement>) => {
    // Keep tooltip anchored to the pointer while hovering a tile.
    if (hoverTileId) {
      const rect = svgRef.current?.getBoundingClientRect()
      if (rect) setHoverClientPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }

    if (!dragRef.current.active) return
    if (dragRef.current.pointerId !== e.pointerId) return
    const start = dragRef.current.start
    if (!start) return
    const p = clientToSvg(e.clientX, e.clientY)
    const dx = p.x - start.x
    const dy = p.y - start.y
    const origin = dragRef.current.origin
    setPanZoom((v) => ({ ...v, tx: origin.tx + dx, ty: origin.ty + dy }))
  }, [clientToSvg, hoverTileId])

  const endDrag = useCallback((e: PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current.active) return
    dragRef.current.active = false
    dragRef.current.pointerId = null
    dragRef.current.start = null
    const svg = svgRef.current
    if (svg) {
      try { svg.releasePointerCapture(e.pointerId) } catch { }
    }
  }, [])

  const robberMoveMode = Boolean((game as any).robber?.pending) && (game as any).robber?.byPlayerId === me && !Boolean((game as any).robber?.awaitingSteal)

  const tileById = useMemo(() => {
    const m = new Map<string, (typeof game.tiles)[number]>()
    for (const t of game.tiles) m.set(t.id, t)
    return m
  }, [game.tiles])

  const hoveredTile = hoverTileId ? tileById.get(hoverTileId) : null

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

  const tilePolys = useMemo(() => {
    return game.tiles.map((t) => {
      const c = axialToPixel(t.q, t.r, size)
      return hexCorners(c, size)
    })
  }, [game.tiles, size])

  const pointInPolygon = (p: { x: number; y: number }, poly: { x: number; y: number }[]) => {
    // Ray-casting algorithm
    let inside = false
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y
      const xj = poly[j].x, yj = poly[j].y
      const intersect = ((yi > p.y) !== (yj > p.y)) && (p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-9) + xi)
      if (intersect) inside = !inside
    }
    return inside
  }

  const pointInAnyHex = (p: { x: number; y: number }) => {
    for (const poly of tilePolys) {
      if (pointInPolygon(p, poly)) return true
    }
    return false
  }
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

  const myCol = playerColor.get(me) ?? 'white'

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
        <div className="pointer-events-none absolute right-2 top-2 rounded-lg bg-black/40 px-2 py-1 text-[11px] text-white/80">
          Zoom: görgő • Mozgatás: <span className="font-semibold">Shift</span> + húzás
        </div>
        <svg
          ref={svgRef}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={(e) => {
            endDrag(e)
            setHoverTileId(null)
            setHoverClientPos(null)
          }}
          style={{ touchAction: 'none' }}
          viewBox={`${extents.minX} ${extents.minY} ${extents.w} ${extents.h}`}
          className="h-[55vh] w-full min-h-[380px] select-none md:h-[62vh] lg:h-[68vh]"
          role="img"
          aria-label="Catan tábla"
        >
          <defs>
            <filter id="f_softShadow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="rgba(0,0,0,.55)" />
            </filter>
            <filter id="f_tokenShadow" x="-60%" y="-60%" width="220%" height="220%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="rgba(0,0,0,.55)" />
            </filter>

            {/* Build-mode glow helpers */}
            <filter id="f_glowSky" x="-80%" y="-80%" width="260%" height="260%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="rgba(56,189,248,.55)" />
              <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="rgba(56,189,248,.35)" />
            </filter>
            <filter id="f_glowGreen" x="-80%" y="-80%" width="260%" height="260%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="rgba(52,211,153,.55)" />
              <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="rgba(52,211,153,.35)" />
            </filter>
            <filter id="f_glowAmber" x="-80%" y="-80%" width="260%" height="260%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="rgba(251,191,36,.55)" />
              <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="rgba(251,191,36,.35)" />
            </filter>
            <filter id="f_glowRed" x="-90%" y="-90%" width="280%" height="280%">
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="rgba(248,113,113,.55)" />
              <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="rgba(248,113,113,.30)" />
            </filter>
            <radialGradient id="g_token" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="rgba(226,232,240,.22)" />
              <stop offset="55%" stopColor="rgba(2,6,23,.65)" />
              <stop offset="100%" stopColor="rgba(2,6,23,.90)" />
            </radialGradient>
            <linearGradient id="g_ocean" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(2, 132, 199, .1)" />
              <stop offset="60%" stopColor="rgba(30, 58, 138, .1)" />
              <stop offset="100%" stopColor="rgba(2, 6, 23, .1)" />
            </linearGradient>
            <pattern id="p_waves" width="120" height="60" patternUnits="userSpaceOnUse">
              <path d="M0 42 C 20 30, 40 30, 60 42 S 100 54, 120 42" fill="none" stroke="rgba(226,232,240,.10)" strokeWidth="2" />
            </pattern>
            <pattern id="p_wood" width="12" height="12" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="10" height="10" fill="rgb(16, 20, 35)" />
              <rect x="0" y="0" width="14" height="14" fill="rgba(0, 92, 8, 0.33)" />
              <path d="M0 12 L12 0" stroke="rgba(34,197,94,.35)" strokeWidth="2" />
            </pattern>
            <pattern id="p_brick" width="14" height="10" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="10" height="10" fill="rgb(16, 20, 35)" />
              <rect x="0" y="0" width="14" height="10" fill="rgba(35, 5, 5, .4)" />
              <path d="M0 5 H14" stroke="rgba(251,113,133,.35)" strokeWidth="2" />
              <path d="M0 0 H14" stroke="rgba(251,113,133,.20)" strokeWidth="2" />
              <path d="M0 10 H14" stroke="rgba(251,113,133,.20)" strokeWidth="2" />
            </pattern>
            <pattern id="p_wheat" width="10" height="10" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="10" height="10" fill="rgb(16, 20, 35)" />
              <rect x="0" y="0" width="10" height="10" fill="rgba(250,204,21,.35)" />
              <circle cx="2" cy="2" r="1.6" fill="rgba(250,204,21,.35)" />
              <circle cx="8" cy="6" r="1.6" fill="rgba(250,204,21,.25)" />
            </pattern>
            <pattern id="p_sheep" width="12" height="12" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="10" height="10" fill="rgb(16, 20, 35)" />
              <rect x="0" y="0" width="14" height="14" fill="rgba(0, 255, 34, 0.25)" />
              <circle cx="3" cy="3" r="2" fill="rgba(134,239,172,.4)" />
              <circle cx="9" cy="9" r="2" fill="rgba(134,239,172,.3)" />
            </pattern>
            <pattern id="p_ore" width="12" height="12" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="10" height="10" fill="rgb(16, 20, 35)" />
              <rect x="0" y="0" width="14" height="14" fill="rgba(148,163,184,.35)" />
              <path d="M2 10 L6 2 L10 10 Z" fill="rgba(148,163,184,.35)" />
            </pattern>
            <pattern id="p_desert" width="14" height="14" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="14" height="14" fill="rgb(44, 34, 9)" />
              <path d="M0 14 L14 0" stroke="rgba(251,191,36,.20)" strokeWidth="2" />
              <path d="M-4 10 L10 -4" stroke="rgba(251,191,36,.12)" strokeWidth="2" />
            </pattern>
          </defs>
          <g transform={`translate(${panZoom.tx} ${panZoom.ty}) scale(${panZoom.scale})`}>

            {/* Ocean background */}
            <rect x={extents.minX} y={extents.minY} width={extents.w} height={extents.h} fill="url(#p_waves)" opacity={0.45} />

            {/* Tiles */}
            {game.tiles.map((t) => {
              const c = axialToPixel(t.q, t.r, size)
              const corners = hexCorners(c, size)
              const d = corners.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
              const fill = `url(#p_${t.type})`
              const isRollHit =
                !!highlightRollNumber &&
                t.numberToken === highlightRollNumber &&
                !t.hasRobber &&
                t.type !== 'desert'
              return (
                <g key={t.id}>
                  <path
                    d={d}
                    fill={fill}
                    filter="url(#f_softShadow)"
                    stroke={
                      robberMoveMode
                        ? t.hasRobber
                          ? 'rgba(148,163,184,.22)'
                          : 'rgba(248,113,113,.55)'
                        : 'rgba(255,255,255,.16)'
                    }
                    strokeWidth={robberMoveMode ? 2.4 : 2.2}
                    className={robberMoveMode && onMoveRobber ? 'cursor-pointer' : undefined}
                    onPointerEnter={(e) => {
                      setHoverTileId(t.id)
                      const rect = svgRef.current?.getBoundingClientRect()
                      if (rect) setHoverClientPos({ x: (e as any).clientX - rect.left, y: (e as any).clientY - rect.top })
                    }}
                    onPointerLeave={() => {
                      setHoverTileId(null)
                      setHoverClientPos(null)
                    }}
                    onClick={robberMoveMode && onMoveRobber ? () => onMoveRobber(t.id) : undefined}
                  />

                  {/* Brief pulse on tiles that produced on the last roll */}
                  {isRollHit ? (
                    <path
                      key={`rollhit:${t.id}:${highlightRollKey ?? ''}`}
                      d={d}
                      fill="transparent"
                      stroke="rgba(34,197,94,.78)"
                      strokeWidth={6}
                      filter="url(#f_glowGreen)"
                      className="svg-rollHit"
                      pointerEvents="none"
                      opacity={0.9}
                    />
                  ) : null}
                  {robberMoveMode && !t.hasRobber ? (
                    <path
                      d={d}
                      fill="transparent"
                      stroke={hoverTileId === t.id ? 'rgba(248,113,113,.92)' : 'rgba(248,113,113,.70)'}
                      strokeWidth={hoverTileId === t.id ? 6.5 : 5}
                      filter="url(#f_glowRed)"
                      opacity={hoverTileId === t.id ? 0.9 : 0.65}
                      pointerEvents="none"
                    />
                  ) : null}

                  {/* number token */}
                  {t.numberToken ? (
                    <g>
                      <circle cx={c.x} cy={c.y} r={18} fill="url(#g_token)" stroke="rgba(255,255,255,.22)" filter="url(#f_tokenShadow)" />
                      <circle cx={c.x} cy={c.y} r={18} fill="transparent" stroke="rgba(148,163,184,.18)" strokeWidth={2} />
                      <text x={c.x} y={c.y + 5} textAnchor="middle" fontSize={15} fontWeight={900} fill={`${t.numberToken === 6 || t.numberToken === 8 ? 'rgba(251,113,133,.95)' : 'rgba(226,232,240,.96)'}`}>
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
                    <g className="svg-robber" transform={`translate(${c.x} ${c.y - 28})`} filter="url(#f_tokenShadow)">
                      <circle cx={0} cy={-7} r={6} fill="rgba(2,6,23,.78)" stroke="rgba(255,255,255,.20)" />
                      <path
                        d="M -10 12 C -8 2, -5 -1, 0 -1 C 5 -1, 8 2, 10 12 C 6 15, -6 15, -10 12 Z"
                        fill="rgba(2,6,23,.78)"
                        stroke="rgba(255,255,255,.20)"
                        strokeWidth={1.6}
                        strokeLinejoin="round"
                      />
                      <path d="M -4 2 C -2 0, 2 0, 4 2" fill="none" stroke="rgba(251,113,133,.85)" strokeWidth={2} strokeLinecap="round" />
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


              // Choose the outward normal by sampling which side is "sea".
              const ex = b.x - a.x
              const ey = b.y - a.y
              const elen = Math.hypot(ex, ey) || 1
              const tx = ex / elen
              const ty = ey / elen
              // One of the two normals
              let nx = -ty
              let ny = tx

              const sampleDist = size * 0.65
              const aSide = { x: mid.x + nx * sampleDist, y: mid.y + ny * sampleDist }
              const bSide = { x: mid.x - nx * sampleDist, y: mid.y - ny * sampleDist }
              const aInside = pointInAnyHex(aSide)
              const bInside = pointInAnyHex(bSide)

              // Prefer the direction that points outside all land hexes.
              if (aInside && !bInside) { nx = -nx; ny = -ny }
              else if (aInside === bInside) {
                // Fallback: pick the direction that points away from the board center
                const cx = mid.x - boardCenter.x
                const cy = mid.y - boardCenter.y
                if (nx * cx + ny * cy < 0) { nx = -nx; ny = -ny }
              }

              // Port marker sits off the edge midpoint, outward (big enough to be clearly outside the hex).
              const offset = size * 0.82
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
                    stroke="rgba(146, 102, 63, 0.5)"
                    strokeWidth={6}
                    strokeLinecap="round"
                  />
                  <line
                    x1={startB.x}
                    y1={startB.y}
                    x2={labelPos.x}
                    y2={labelPos.y}
                    stroke="rgba(146, 102, 63, 0.5)"
                    strokeWidth={6}
                    strokeLinecap="round"
                  />

                  {/* platform */}
                  <polygon points={dockPoints} fill="rgba(2,6,23,.70)" stroke="rgba(255,255,255,.18)" strokeWidth={2} />

                  {/* label marker */}
                  <g className="svg-portMarker" transform={`translate(${labelPos.x} ${labelPos.y})`} filter="url(#f_tokenShadow)">
                    <g className="port-marker">
                      <rect x={-18} y={-18} width={36} height={36} rx={12} ry={12} fill="rgba(2,6,23,.72)" stroke="rgba(255,255,255,.18)" />
                    </g>
                    {portIcon(p.kind)}
                    <text x={0} y={12} textAnchor="middle" fontSize={10} fontWeight={900} fill="rgba(226,232,240,.95)">
                      {portLabel(p.kind)}
                    </text>
                  </g>
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
                <g key={e.id}>
                  {/* dark underlay for contrast */}
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="rgba(2,6,23,.55)"
                    strokeWidth={11}
                    strokeLinecap="round"
                    opacity={0.9}
                  />
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={playerColor.get(owner) ?? 'white'}
                    strokeWidth={8}
                    strokeLinecap="round"
                    opacity={0.95}
                  />
                </g>
              )
            })}

            {/* Buildings */}
            {graph.nodes.map((n) => {
              const pl = placementsByNode.get(n.id)
              if (!pl) return null
              const col = playerColor.get(pl.playerId) ?? 'white'
              const isCity = pl.kind === 'city'
              const stroke = 'rgba(2,6,23,.65)'

              const house = (w: number, h: number) => {
                const roofH = h * 0.48
                const bodyTop = -h / 2 + roofH
                const bodyBottom = h / 2
                const bodyW = w * 0.74
                const roofW = w
                const path = [
                  `M 0 ${-h / 2}`,
                  `L ${roofW / 2} ${bodyTop}`,
                  `L ${bodyW / 2} ${bodyTop}`,
                  `L ${bodyW / 2} ${bodyBottom}`,
                  `L ${-bodyW / 2} ${bodyBottom}`,
                  `L ${-bodyW / 2} ${bodyTop}`,
                  `L ${-roofW / 2} ${bodyTop}`,
                  'Z',
                ].join(' ')
                const door = {
                  d: `M ${-w * 0.10} ${bodyBottom} L ${-w * 0.10} ${bodyBottom - h * 0.30} L ${w * 0.10} ${bodyBottom - h * 0.30} L ${w * 0.10} ${bodyBottom}`,
                }
                return { path, door, bodyBottom }
              }

              // Settlement: single small house. City: a small cluster (2 houses + a center hall).
              const settle = house(22, 20)
              const cityHouse = house(16, 16)
              const cityHall = house(20, 22)

              return (
                <g key={n.id} className="svg-popIn" transform={`translate(${n.p.x} ${n.p.y})`} filter="url(#f_tokenShadow)">
                  {!isCity ? (
                    <g>
                      <path d={settle.path} fill={col} opacity={0.95} stroke={stroke} strokeWidth={2.2} strokeLinejoin="round" />
                      <path d={settle.door.d} fill="rgba(2,6,23,.18)" stroke="rgba(2,6,23,.35)" strokeWidth={1.6} />
                    </g>
                  ) : (
                    <g>
                      {/* side houses */}
                      <g transform="translate(-10 4)">
                        <path d={cityHouse.path} fill={col} opacity={0.95} stroke={stroke} strokeWidth={2.0} strokeLinejoin="round" />
                      </g>
                      <g transform="translate(10 4)">
                        <path d={cityHouse.path} fill={col} opacity={0.95} stroke={stroke} strokeWidth={2.0} strokeLinejoin="round" />
                      </g>
                      {/* center hall */}
                      <g transform="translate(0 -2)">
                        <path d={cityHall.path} fill={col} opacity={0.97} stroke={stroke} strokeWidth={2.4} strokeLinejoin="round" />
                        <path d={cityHall.door.d} fill="rgba(2,6,23,.18)" stroke="rgba(2,6,23,.35)" strokeWidth={1.6} />
                      </g>
                      {/* little window dots */}
                      <circle cx={-6} cy={6} r={1.7} fill="rgba(2,6,23,.22)" />
                      <circle cx={6} cy={6} r={1.7} fill="rgba(2,6,23,.22)" />
                    </g>
                  )}
                </g>
              )
            })}
            {/* Clickable nodes (setup settlement) */}
            {canPlaceSettlement
              ? graph.nodes.map((n) => {
                const occupied = placementsByNode.has(n.id)
                const can = !occupied
                return (
                  <g key={`clickN_${n.id}`}>
                    {/* invalid markers stay faint so the board is readable */}
                    {!can ? (
                      <circle cx={n.p.x} cy={n.p.y} r={11} fill="rgba(2,6,23,.10)" stroke="rgba(148,163,184,.12)" strokeWidth={2} />
                    ) : (
                      <circle
                        cx={n.p.x}
                        cy={n.p.y}
                        r={13}
                        fill="rgba(56,189,248,.10)"
                        stroke="rgba(56,189,248,.65)"
                        strokeWidth={2.5}
                        filter="url(#f_glowSky)"
                      />
                    )}
                    {/* clickable hit target */}
                    <circle
                      cx={n.p.x}
                      cy={n.p.y}
                      r={14}
                      fill="transparent"
                      className={can ? 'cursor-pointer' : ''}
                      onClick={() => {
                        if (!can) return
                        onPlaceSettlement(n.id)
                      }}
                    />
                  </g>
                )
              })
              : null}

            {/* Clickable nodes (main build settlement) */}
            {canBuildSettlement
              ? graph.nodes.map((n) => {
                const occupied = placementsByNode.has(n.id)
                const can = !occupied
                return (
                  <g key={`buildSet_${n.id}`}>
                    {!can ? (
                      <circle cx={n.p.x} cy={n.p.y} r={11.5} fill="rgba(2,6,23,.10)" stroke="rgba(148,163,184,.12)" strokeWidth={2} />
                    ) : (
                      <circle
                        cx={n.p.x}
                        cy={n.p.y}
                        r={14}
                        fill="rgba(52,211,153,.10)"
                        stroke="rgba(52,211,153,.65)"
                        strokeWidth={2.6}
                        filter="url(#f_glowGreen)"
                      />
                    )}
                    <circle
                      cx={n.p.x}
                      cy={n.p.y}
                      r={15}
                      fill="transparent"
                      className={can ? 'cursor-pointer' : ''}
                      onClick={() => {
                        if (!can) return
                        onBuildSettlement(n.id)
                      }}
                    />
                  </g>
                )
              })
              : null}

            {/* Clickable nodes (main upgrade city) */}
            {canBuildCity
              ? graph.nodes.map((n) => {
                const pl = placementsByNode.get(n.id)
                const can = pl && pl.playerId === me && pl.kind === 'settlement'
                return (
                  <g key={`buildCity_${n.id}`}>
                    {!can ? (
                      <circle cx={n.p.x} cy={n.p.y} r={11.5} fill="rgba(2,6,23,.10)" stroke="rgba(148,163,184,.12)" strokeWidth={2} />
                    ) : (
                      <circle
                        cx={n.p.x}
                        cy={n.p.y}
                        r={14}
                        fill="rgba(251,191,36,.10)"
                        stroke="rgba(251,191,36,.70)"
                        strokeWidth={2.6}
                        filter="url(#f_glowAmber)"
                      />
                    )}
                    <circle
                      cx={n.p.x}
                      cy={n.p.y}
                      r={15}
                      fill="transparent"
                      className={can ? 'cursor-pointer' : ''}
                      onClick={() => {
                        if (!can) return
                        onBuildCity(n.id)
                      }}
                    />
                  </g>
                )
              })
              : null}

            {/* Clickable edges (setup road) */}
            {canPlaceRoad
              ? graph.edges.map((e) => {
                const occupied = placementsByEdge.has(e.id)
                const a = graph.nodes.find((n) => n.id === e.a)!.p
                const b = graph.nodes.find((n) => n.id === e.b)!.p
                const can = !occupied
                return (
                  <g key={`clickE_${e.id}`}>
                    {!can ? (
                      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(148,163,184,.10)" strokeWidth={9} strokeLinecap="round" />
                    ) : (
                      <line
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke="rgba(56,189,248,.55)"
                        strokeWidth={12}
                        strokeLinecap="round"
                      />
                    )}
                    <line
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="transparent"
                      strokeWidth={18}
                      strokeLinecap="round"
                      className={can ? 'cursor-pointer' : ''}
                      onPointerEnter={() => {
                        if (can) setHoverEdgeId(e.id)
                      }}
                      onPointerLeave={() => setHoverEdgeId(null)}
                      onClick={() => {
                        if (!can) return
                        onPlaceRoad(e.id)
                      }}
                    />
                  </g>
                )
              })
              : null}

            {/* Clickable edges (main build road) */}
            {canBuildRoad
              ? graph.edges.map((e) => {
                const occupied = placementsByEdge.has(e.id)
                const a = graph.nodes.find((n) => n.id === e.a)!.p
                const b = graph.nodes.find((n) => n.id === e.b)!.p
                const can = !occupied
                return (
                  <g key={`buildRoad_${e.id}`}>
                    {!can ? (
                      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(148,163,184,.10)" strokeWidth={9} strokeLinecap="round" />
                    ) : (
                      <line
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke="rgba(56,189,248,.55)"
                        strokeWidth={12}
                        strokeLinecap="round"
                      />
                    )}
                    <line
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="transparent"
                      strokeWidth={18}
                      strokeLinecap="round"
                      className={can ? 'cursor-pointer' : ''}
                      onPointerEnter={() => {
                        if (can) setHoverEdgeId(e.id)
                      }}
                      onPointerLeave={() => setHoverEdgeId(null)}
                      onClick={() => {
                        if (!can) return
                        onBuildRoad(e.id)
                      }}
                    />
                  </g>
                )
              })
              : null}
          </g>
        </svg>

        {/* Hex hover tooltip */}
        {hoveredTile && hoverClientPos ? (
          <div
            className="pointer-events-none absolute z-20 max-w-[220px] -translate-y-2 rounded-xl border border-white/10 bg-black/70 px-3 py-2 text-xs text-slate-100 shadow-xl shadow-black/40"
            style={{ left: hoverClientPos.x + 12, top: hoverClientPos.y + 12 }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold">
                {tileLabel(hoveredTile.type)}
              </div>
              {typeof hoveredTile.numberToken === 'number' ? (
                <div className="rounded-full bg-white/10 px-2 py-0.5 font-extrabold">
                  {hoveredTile.numberToken}
                </div>
              ) : null}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-200/80">
              {hoveredTile.hasRobber ? (
                <span className="rounded-full bg-red-500/15 px-2 py-0.5 font-semibold text-red-200">Rabló</span>
              ) : (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-200">Termel</span>
              )}
              <span className="text-slate-300/70">•</span>
              <span className="text-slate-200/80">Mutató: hover</span>
            </div>
          </div>
        ) : null}

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
