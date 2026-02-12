'use client'

import type { GameState, Resource } from '@/types/game'
import { ResourceLabel } from '@/components/icons'

function fmtRes(r: Resource) {
  switch (r) {
    case 'wood':
      return 'Fa'
    case 'brick':
      return 'Tégla'
    case 'wheat':
      return 'Búza'
    case 'sheep':
      return 'Juh'
    case 'ore':
      return 'Érc'
  }
}

const RES_ORDER: Resource[] = ['wood', 'brick', 'wheat', 'sheep', 'ore']

export function StatsPanel({ game }: { game: GameState }) {
  const rollCounts = game.stats?.rollCounts ?? {}
  const gains = game.stats?.resourceGains ?? {}

  const rollRows = Array.from({ length: 11 }, (_, i) => i + 2).map((n) => ({
    n,
    count: Number(rollCounts[String(n)] ?? 0),
  }))

  const totalRolls = rollRows.reduce((a, b) => a + b.count, 0)
  const maxRollCount = Math.max(1, ...rollRows.map((r) => r.count))

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/20">
      <h3 className="mb-3 text-sm font-semibold text-slate-100">Statisztika</h3>

      <div className="grid gap-3">
        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-200">Dobások eloszlása (2–12)</div>
            <div className="text-[11px] text-slate-400">Összes dobás: {totalRolls}</div>
          </div>

          {/* Compact bar chart (still readable on mobile) */}
          <div className="mt-3 grid grid-cols-1 gap-2">
            {rollRows.map((r) => {
              const pct = Math.round((r.count / maxRollCount) * 100)
              const hot = r.n === 6 || r.n === 8
              return (
                <div key={r.n} className="flex items-center gap-3">
                  <div className={`w-6 text-right text-sm font-semibold ${hot ? 'text-rose-300' : 'text-slate-200'}`}>{r.n}</div>
                  <div className="relative h-7 flex-1 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                    <div
                      className={`h-full ${hot ? 'bg-rose-400/25' : 'bg-sky-400/20'}`}
                      style={{ width: `${pct}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-end px-2 text-xs font-semibold text-slate-100">
                      {r.count}×
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <div className="text-xs font-semibold text-slate-200">Kiosztott erőforrások (csak dobásokból)</div>
          <div className="mt-3 grid gap-2">
            {game.players.map((p) => {
              const line: Record<Resource, number> = {
                wood: Number(gains[p._id]?.wood ?? 0),
                brick: Number(gains[p._id]?.brick ?? 0),
                wheat: Number(gains[p._id]?.wheat ?? 0),
                sheep: Number(gains[p._id]?.sheep ?? 0),
                ore: Number(gains[p._id]?.ore ?? 0),
              }
              const total = RES_ORDER.reduce((a, k) => a + line[k], 0)
              const maxLine = Math.max(1, ...RES_ORDER.map((k) => line[k]))
              return (
                <div key={p._id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold" style={{ color: p.color }}>{p.name}</div>
                    <div className="text-xs text-slate-300">Összesen: <span className="font-semibold text-slate-100">{total}</span></div>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {RES_ORDER.map((res) => {
                      const pct = Math.round((line[res] / maxLine) * 100)
                      return (
                        <div key={res} className="flex items-center gap-3">
                          <div className="w-24">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-3 py-1 text-xs text-slate-200">
                              <ResourceLabel resource={res}>{fmtRes(res)}</ResourceLabel>
                            </div>
                          </div>
                          <div className="relative h-7 flex-1 overflow-hidden rounded-lg border border-white/10 bg-black/10">
                            <div className="h-full bg-emerald-400/15" style={{ width: `${pct}%` }} />
                            <div className="absolute inset-0 flex items-center justify-end px-2 text-xs font-semibold text-slate-100">
                              +{line[res]}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
