'use client'

import React from 'react'
import type { GameState, Resource } from '@/types/game'
import Select from './shared/Select';
import { HU } from '@/types/translate';
import { ResourcePill } from './icons'

const RESOURCES: Array<{ id: Resource; name: string }> = [
  { id: 'wood', name: 'Fa' },
  { id: 'brick', name: 'Tégla' },
  { id: 'wheat', name: 'Búza' },
  { id: 'sheep', name: 'Juh' },
  { id: 'ore', name: 'Érc' },
]

function getRate(game: GameState, give: Resource): number {
  const ports = game.you?.ports
  if (ports?.twoToOne?.[give]) return 2
  if (ports?.threeToOne) return 3
  return 4
}

export function BankPanel({ game, onTrade }: { game: GameState; onTrade: (give: Resource, get: Resource) => void }) {
  const you = game.you
  const [give, setGive] = React.useState<Resource>('wood')
  const [get, setGet] = React.useState<Resource>('brick')

  const rate = getRate(game, give)
  const have = you?.resources?.[give] ?? 0
  const can = game.phase === 'main' && game.currentPlayerId === you?.playerId && have >= rate && give !== get

  const ownedTwoToOne = RESOURCES.filter((r) => !!you?.ports?.twoToOne?.[r.id]).map((r) => `2:1 ${r.name}`)
  const ownedThree = you?.ports?.threeToOne ? ['3:1'] : []
  const owned = [...ownedThree, ...ownedTwoToOne]

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/20">
      <h3 className="mb-3 text-sm font-semibold text-slate-100">Bank / Kikötők</h3>

      <div className="mb-3 rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-xs text-slate-300">
        Aktív arány: <span className="font-semibold text-slate-100">{rate}:1</span> ({give} → bármi)
        {owned.length ? (
          <div className="mt-1 text-slate-400">Kikötőid: {owned.join(' · ')}</div>
        ) : (
          <div className="mt-1 text-slate-500">Nincs kikötőd (alap: 4:1)</div>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
        <Select
          className="col-start-1"
          label={give ? <ResourcePill resource={give} label={HU[give]} /> : 'Adok'}
          items={RESOURCES.map((r) => ({ label: <ResourcePill resource={r.id} label={r.name} />, onClick: () => setGive(r.id) }))}
        />
        <div className="text-center text-xs text-slate-400">→</div>
        <Select
          className="col-start-3"
          label={get ? <ResourcePill resource={get} label={HU[get]} /> : 'Kérek'}
          items={RESOURCES.map((r) => ({ label: <ResourcePill resource={r.id} label={r.name} />, onClick: () => setGet(r.id) }))}
        />
        <button
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!can}
          onClick={() => onTrade(give, get)}
        >
          Csere
        </button>
      </div>

      <div className="mt-2 text-xs text-slate-500">
        Költség: <span className="font-semibold text-slate-300">-{rate} {give}</span> → <span className="font-semibold text-slate-300">+1 {get}</span>
        <span className="ml-2">(Nálad: {have})</span>
      </div>
    </section>
  )
}
