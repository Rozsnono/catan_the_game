'use client'

import type { GameState, Resource } from '@/types/game'
import { LargestArmyIcon, ResourceIcon, RoadIcon } from './icons'

const order: { key: Resource; label: string; pattern: string }[] = [
  { key: 'wood', label: 'Fa', pattern: 'p_wood' },
  { key: 'brick', label: 'Tégla', pattern: 'p_brick' },
  { key: 'wheat', label: 'Búza', pattern: 'p_wheat' },
  { key: 'sheep', label: 'Juh', pattern: 'p_sheep' },
  { key: 'ore', label: 'Érc', pattern: 'p_ore' },
]

function HexIcon({ patternId }: { patternId: string }) {
  // 64px wide hex
  const size = 32
  const w = size * 2
  const h = Math.sqrt(3) * size
  const cx = w / 2
  const cy = h / 2
  const corners = Array.from({ length: 6 }).map((_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6
    return {
      x: cx + size * Math.cos(a),
      y: cy + size * Math.sin(a),
    }
  })
  const d = corners.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-14" aria-hidden>
      <defs>
        {/* Same patterns as the board for a consistent look */}
        <pattern id="p_wood_r" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M0 12 L12 0" stroke="rgba(34,197,94,.35)" strokeWidth="2" />
        </pattern>
        <pattern id="p_brick_r" width="14" height="10" patternUnits="userSpaceOnUse">
          <path d="M0 5 H14" stroke="rgba(251,113,133,.35)" strokeWidth="2" />
          <path d="M0 0 H14" stroke="rgba(251,113,133,.20)" strokeWidth="2" />
          <path d="M0 10 H14" stroke="rgba(251,113,133,.20)" strokeWidth="2" />
        </pattern>
        <pattern id="p_wheat_r" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.6" fill="rgba(250,204,21,.35)" />
          <circle cx="8" cy="6" r="1.6" fill="rgba(250,204,21,.25)" />
        </pattern>
        <pattern id="p_sheep_r" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="2" fill="rgba(134,239,172,.28)" />
          <circle cx="9" cy="9" r="2" fill="rgba(134,239,172,.18)" />
        </pattern>
        <pattern id="p_ore_r" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M2 10 L6 2 L10 10 Z" fill="rgba(148,163,184,.35)" />
        </pattern>
      </defs>

      <path d={d} fill={`url(#${patternId}_r)`} stroke="rgba(255,255,255,.16)" strokeWidth={2} />
    </svg>
  )
}

export function ResourceCardsPanel({ game }: { game: GameState }) {
  const r = game.you?.resources

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/20">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-100">Kártyáid</h3>
        <div className="text-xs text-slate-500">
          {r ? 'Publikus: csak a sajátod' : 'Betöltés…'}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-1 lg:grid-cols-1">
        {order.map((it) => (
          <div
            key={it.key}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/10 p-3"
          >
            <div className="relative">
              <HexIcon patternId={it.pattern} />
              <div className="absolute inset-0 flex items-center justify-center text-slate-100">
                <ResourceIcon resource={it.key} className="h-6 w-6 opacity-90" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-100">{it.label}</div>
              <div className="mt-0.5 text-xs text-slate-400">
                Mennyiség: <span className="font-mono text-slate-200">{r ? r[it.key] : 0}</span>
              </div>
            </div>
          </div>
        ))}

        {
          game.largestArmyPlayerId === game.you?.playerId || true && (
            <div
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/10 p-3"
            >
              <div className="relative">
                <HexIcon patternId={''} />
                <div className="absolute inset-0 flex items-center justify-center text-slate-100">
                  <LargestArmyIcon className="h-6 w-6 opacity-90" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-100">Legnagyobb hadsereg</div>
                <div className="mt-0.5 text-xs text-slate-400">
                  +2 VP
                </div>
              </div>
            </div>
          )
        }

        {
          game.largestArmyPlayerId === game.you?.playerId || true && (
            <div
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/10 p-3"
            >
              <div className="relative">
                <HexIcon patternId={''} />
                <div className="absolute inset-0 flex items-center justify-center text-slate-100">
                  <LargestArmyIcon className="h-6 w-6 opacity-90" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-100">Legnagyobb hadsereg</div>
                <div className="mt-0.5 text-xs text-slate-400">
                  +2 VP
                </div>
              </div>
            </div>
          )
        }
      </div>

      <div className="mt-3 text-xs text-slate-500">
        Dobáskor automatikusan kiosztja az erőforrásokat (település: 1, város: 2).
      </div>
    </section>
  )
}
