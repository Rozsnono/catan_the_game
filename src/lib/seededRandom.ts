// src/lib/seededRandom.ts
export type RNG = () => number

// Deterministic hash from string -> 32-bit integer
function xfnv1a(str: string) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Mulberry32 PRNG (fast, deterministic)
export function mulberry32(seed: number): RNG {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function rngFromSeed(seed: string): RNG {
  return mulberry32(xfnv1a(seed))
}

export function shuffleInPlace<T>(arr: T[], rng: RNG): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function pickOne<T>(arr: T[], rng: RNG): T {
  return arr[Math.floor(rng() * arr.length)]
}
