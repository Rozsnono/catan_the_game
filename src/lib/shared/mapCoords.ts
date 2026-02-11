export type MapType = 'classic' | 'large' | 'islands' | 'world' | 'custom'

export type HexCoord = { q: number; r: number }

function buildRadiusCoords(radius: number): HexCoord[] {
  const coords: HexCoord[] = []
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const s = -q - r
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= radius) {
        coords.push({ q, r })
      }
    }
  }
  return coords
}

export function presetCoords(mapType: MapType): HexCoord[] {
  if (mapType === 'large') return buildRadiusCoords(3)
  if (mapType === 'islands') {
    const islandA = buildRadiusCoords(2).map(({ q, r }) => ({ q: q - 2, r }))
    const islandB = buildRadiusCoords(2).map(({ q, r }) => ({ q: q + 2, r }))
    const islet = buildRadiusCoords(1).map(({ q, r }) => ({ q, r: r + 3 }))
    const seen = new Set<string>()
    const out: HexCoord[] = []
    for (const c of [...islandA, ...islandB, ...islet]) {
      const k = `${c.q},${c.r}`
      if (seen.has(k)) continue
      seen.add(k)
      out.push(c)
    }
    return out
  }
  if (mapType === 'world') {
    const continent = buildRadiusCoords(3)
    const arch1 = buildRadiusCoords(1).map(({ q, r }) => ({ q: q - 5, r: r + 1 }))
    const arch2 = buildRadiusCoords(1).map(({ q, r }) => ({ q: q + 5, r: r - 1 }))
    const arch3 = buildRadiusCoords(1).map(({ q, r }) => ({ q, r: r + 6 }))
    const seen = new Set<string>()
    const out: HexCoord[] = []
    for (const c of [...continent, ...arch1, ...arch2, ...arch3]) {
      const k = `${c.q},${c.r}`
      if (seen.has(k)) continue
      seen.add(k)
      out.push(c)
    }
    return out
  }
  // classic (default)
  return buildRadiusCoords(2)
}
