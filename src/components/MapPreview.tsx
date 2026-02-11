'use client'

import { useMemo } from 'react'
import { axialToPixel, hexCorners } from '@/lib/shared/boardGeometry'
import { presetCoords, type HexCoord, type MapType } from '@/lib/shared/mapCoords'

function hexPath(q: number, r: number, size: number) {
  const c = axialToPixel(q, r, size)
  const pts = hexCorners(c, size)
  return `M ${pts.map((p) => `${p.x},${p.y}`).join(' L ')} Z`
}

function bounds(coords: HexCoord[], size: number) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const h of coords) {
    const c = axialToPixel(h.q, h.r, size)
    const pts = hexCorners(c, size)
    for (const p of pts) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
  }
  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 1, maxY: 1 }
  return { minX, minY, maxX, maxY }
}

export default function MapPreview({
  seed,
  mapType,
  templateHexes,
  className,
  compact = false,
}: {
  seed: string
  mapType: MapType
  templateHexes?: HexCoord[]
  className?: string
  compact?: boolean
}) {
  const size = compact ? 10 : 12

  const coords = useMemo(() => {
    if (mapType === 'custom' && templateHexes?.length) {
      return templateHexes
    }
    return presetCoords((mapType === 'custom' ? 'classic' : (mapType as MapType)))
  }, [seed, mapType, templateHexes])

  const b = useMemo(() => bounds(coords, size), [coords, size])
  const pad = compact ? 6 : 10
  const vb = `${b.minX - pad} ${b.minY - pad} ${(b.maxX - b.minX) + pad * 2} ${(b.maxY - b.minY) + pad * 2}`

  return (
    <svg
      viewBox={vb}
      className={className ?? ''}
      role="img"
      aria-label="Térkép előnézet"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* background */}
      <rect x={b.minX - pad} y={b.minY - pad} width={(b.maxX - b.minX) + pad * 2} height={(b.maxY - b.minY) + pad * 2} rx={compact ? 10 : 14} className="fill-black/20" />

      {/* hexes */}
      {coords.map((h, i) => (
        <path
          key={`${h.q},${h.r},${i}`}
          d={hexPath(h.q, h.r, size)}
          className="fill-white/10 stroke-white/20"
          strokeWidth={1}
        />
      ))}

      {/* center dot (nice orientation cue) */}
      <circle cx={(b.minX + b.maxX) / 2} cy={(b.minY + b.maxY) / 2} r={compact ? 2.2 : 2.8} className="fill-sky-300/70" />
    </svg>
  )
}
