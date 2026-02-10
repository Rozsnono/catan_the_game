'use client'

import type { GameState, Resource } from '@/types/game'
import { ResourcePill } from './icons'

const LABEL: Record<Resource, string> = {
  wood: 'Fa',
  brick: 'Tégla',
  wheat: 'Búza',
  sheep: 'Juh',
  ore: 'Érc',
}

export function HandPanel({ game }: { game: GameState }) {
  const you = game.you
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/20">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">A te kártyáid</h3>
        <div className="text-xs text-slate-400">(MVP: erőforrás kiosztás még nincs)</div>
      </div>

      {!you ? (
        <div className="mt-3 text-sm text-slate-400">Nem azonosított játékos.</div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(you.resources).map(([k, v]) => (
            <div
              key={k}
              className="rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-sm text-slate-100"
            >
              <span className="font-semibold">
                <ResourcePill resource={k as Resource} label={LABEL[k as Resource]} />
              </span>{' '}
              <span className="text-slate-300">x{v as number}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
