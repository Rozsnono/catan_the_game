'use client'

import type { GameState } from '@/types/game'

export function LogPanel({ game }: { game: GameState }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/20">
      <h3 className="mb-3 text-sm font-semibold text-slate-100">Log</h3>
      <div className="max-h-[280px] overflow-auto rounded-xl border border-white/10 bg-black/10 p-3 text-xs text-slate-300">
        {game.log.length === 0 ? <div className="text-slate-500">Még nincs esemény.</div> : null}
        <div className="grid gap-2">
          {game.log.slice().reverse().map((l, idx) => (
            <div key={idx} className="flex gap-2">
              <span className="text-slate-500">{new Date(l.ts).toLocaleTimeString()}</span>
              <span>{l.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
