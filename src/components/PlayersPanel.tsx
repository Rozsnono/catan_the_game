'use client'

import type { GameState } from '@/types/game'
import { RoadIcon, SettlementIcon, TrophyIcon } from '@/components/icons'

export function PlayersPanel({ game, me }: { game: GameState; me: string }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/20">
      <h3 className="mb-3 text-sm font-semibold text-slate-100">Játékosok</h3>
      <div className="grid gap-2">
        {game.players.map((p) => {
          const isMe = p._id === me
          const isTurn = p._id === game.currentPlayerId
          return (
            <div
              key={p._id}
              className={[
                'rounded-xl border px-3 py-2',
                isTurn ? 'border-sky-400/30 bg-sky-500/10' : 'border-white/10 bg-black/10',
              ].join(' ')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                  <div className="font-semibold" style={{ color: p.color }}>{p.name}{isMe ? ' (Te)' : ''}</div>
                </div>
                <div className="text-xs text-slate-300">
                  <span className="inline-flex items-center gap-1">
                    <TrophyIcon className="text-sm" />
                    <span className="font-semibold text-slate-100">{p.victoryPoints}</span>
                  </span>
                </div>
              </div>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1"><SettlementIcon className="text-sm" />{p.settlements}</span>
                <span className="inline-flex items-center gap-1"><RoadIcon className="text-sm" />{p.roads}</span>
                <span>Kártya: {p.resourceCount}</span>
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Megjegyzés: bejelentkezés nélküli MVP-ben a többiek konkrét erőforrásai rejtve vannak.
      </p>
    </section>
  )
}
