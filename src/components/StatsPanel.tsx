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

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/20">
      <h3 className="mb-3 text-sm font-semibold text-slate-100">Statisztika</h3>

      <div className="grid gap-3">
        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-200">Dobások eloszlása</div>
            <div className="text-[11px] text-slate-400">Összes dobás: {totalRolls}</div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            {rollRows.map((r) => (
              <div key={r.n} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <div className="text-sm font-semibold text-slate-100">{r.n}</div>
                <div className="text-xs text-slate-200">{r.count}×</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <div className="text-xs font-semibold text-slate-200">Kiosztott erőforrások (dobásokból)</div>
          <div className="mt-2 grid gap-2">
            {game.players.map((p) => {
              const line: Record<Resource, number> = {
                wood: Number(gains[p._id]?.wood ?? 0),
                brick: Number(gains[p._id]?.brick ?? 0),
                wheat: Number(gains[p._id]?.wheat ?? 0),
                sheep: Number(gains[p._id]?.sheep ?? 0),
                ore: Number(gains[p._id]?.ore ?? 0),
              }
              const total = RES_ORDER.reduce((a, k) => a + line[k], 0)
              return (
                <div key={p._id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold" style={{ color: p.color }}>{p.name}</div>
                    <div className="text-xs text-slate-300">Összesen: <span className="font-semibold text-slate-100">{total}</span></div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {RES_ORDER.map((res) => (
                      <div key={res} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/10 px-3 py-1 text-xs text-slate-200">
                        <ResourceLabel resource={res}>{fmtRes(res)}</ResourceLabel>
                        <span className="font-semibold text-slate-100">+{line[res]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Megjegyzés: ez csak a dobásokból kiosztott erőforrásokat összegzi (setup kezdő + dev kártyák nélkül).
          </div>
        </div>
      </div>
    </section>
  )
}
