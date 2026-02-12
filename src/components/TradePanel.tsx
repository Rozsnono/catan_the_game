'use client'

import { useMemo, useState } from 'react'
import type { GameState, Resource } from '@/types/game'
import Select from './Select'
import { ResourcePill } from './icons'

const RESOURCES: Resource[] = ['wood', 'brick', 'wheat', 'sheep', 'ore']

const HU: Record<Resource, string> = {
  wood: 'Fa',
  brick: 'Tégla',
  wheat: 'Búza',
  sheep: 'Juh',
  ore: 'Érc',
}

const resourceItems = (onPick: (r: Resource) => void) =>
  RESOURCES.map((r) => ({ label: <ResourcePill resource={r} label={HU[r]} />, onClick: () => onPick(r) }))

function emptyLine(): Record<Resource, number> {
  return { wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 }
}

function sumLine(line: Record<Resource, number>): number {
  return RESOURCES.reduce((a, r) => a + (line[r] ?? 0), 0)
}

function formatLine(line: Record<Resource, number>): string {
  const parts = RESOURCES.filter((r) => (line[r] ?? 0) > 0).map((r) => `${HU[r]}×${line[r]}`)
  return parts.length ? parts.join(', ') : '–'
}

export function TradePanel({
  game,
  me,
  onCreate,
  onAccept,
  onReject,
  onCancel,
}: {
  game: GameState
  me: string
  onCreate: (args: { toPlayerId: string | null; give: Record<Resource, number>; get: Record<Resource, number> }) => void
  onAccept: (offerId: string) => void
  onReject: (offerId: string) => void
  onCancel: (offerId: string) => void
}) {
  const [toPlayerId, setToPlayerId] = useState<string | 'any'>('any')
  const [giveRes, setGiveRes] = useState<Resource>('wood')
  const [giveQty, setGiveQty] = useState<number>(1)
  const [getRes, setGetRes] = useState<Resource>('brick')
  const [getQty, setGetQty] = useState<number>(1)

  const canTrade = useMemo(() => {
    // UI convenience; server validates too
    return game.phase === 'main' && game.currentPlayerId === me && (game.turnHasRolled ?? false)
  }, [game.phase, game.currentPlayerId, game.turnHasRolled, me])

  const offers = (game.tradeOffers ?? []).filter((o) => o.status === 'open')

  function submit() {
    const give = emptyLine()
    const get = emptyLine()
    give[giveRes] = Math.max(1, Math.min(10, giveQty))
    get[getRes] = Math.max(1, Math.min(10, getQty))
    if (sumLine(give) === 0 || sumLine(get) === 0) return
    onCreate({ toPlayerId: toPlayerId === 'any' ? null : toPlayerId, give, get })
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-100">Kereskedelem (játékosok)</div>
        <div className="text-xs text-slate-400">
          {canTrade ? 'Nyitva' : 'Dobás után, a saját körödben'}
        </div>
      </div>

      <div className="grid gap-2">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-1">
          <div className="rounded-xl border border-white/10 bg-white/5 p-2">
            <div className="text-xs text-slate-400">Kinek</div>

            <Select
              className="mt-1"
              label={toPlayerId === 'any' ? 'Bárkinek' : game.players.find((p) => p._id === toPlayerId)?.name ?? 'Ismeretlen'}
              items={[
                { label: 'Bárkinek', onClick: () => setToPlayerId('any') },
                ...game.players
                  .filter((p) => p._id !== me)
                  .map((p) => ({ label: p.name, onClick: () => setToPlayerId(p._id) })),
              ]}
            />
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-2">
            <div className="text-xs text-slate-400">Mit adsz</div>
            <div className="mt-1 grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">

              <Select
                className=""
                label={<ResourcePill resource={giveRes} label={HU[giveRes]} />}
                items={resourceItems(setGiveRes)}
                disabled={!canTrade}
              />
              <input
                type="number"
                min={1}
                max={10}
                className="w-16 rounded-lg border border-white/10 bg-black/20 px-2 py-2 text-sm text-slate-100"
                value={giveQty}
                onChange={(e) => setGiveQty(Number(e.target.value))}
                disabled={!canTrade}
              />
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-2">
            <div className="text-xs text-slate-400">Mit kérsz</div>
            <div className="mt-1 grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
              <Select
                className=""
                label={<ResourcePill resource={getRes} label={HU[getRes]} />}
                items={resourceItems(setGetRes)}
                disabled={!canTrade}
              />
              <input
                type="number"
                min={1}
                max={10}
                className="w-16 rounded-lg border border-white/10 bg-black/20 px-2 py-2 text-sm text-slate-100"
                value={getQty}
                onChange={(e) => setGetQty(Number(e.target.value))}
                disabled={!canTrade}
              />
            </div>

            <button
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100 hover:bg-white/15 disabled:opacity-40"
              onClick={submit}
              disabled={!canTrade}
            >
              Ajánlat küldése
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-2">
          <div className="text-xs font-semibold text-slate-200">Nyitott ajánlatok</div>
          {offers.length === 0 ? (
            <div className="mt-2 text-xs text-slate-400">Nincs nyitott ajánlat.</div>
          ) : (
            <div className="mt-2 grid gap-2">
              {offers.map((o) => {
                const from = game.players.find((p) => p._id === o.fromPlayerId)?.name ?? 'Ismeretlen'
                const to = o.toPlayerId ? game.players.find((p) => p._id === o.toPlayerId)?.name ?? 'Valaki' : 'Bárki'

                const iAmTarget = !o.toPlayerId || o.toPlayerId === me
                const iAmFrom = o.fromPlayerId === me

                return (
                  <div key={o.id} className="rounded-xl border border-white/10 bg-black/10 p-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs text-slate-200">
                        <span className="font-semibold">{from}</span> → <span className="text-slate-300">{to}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {new Date(o.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div className="mt-1 grid gap-1 text-xs text-slate-300">
                      <div>
                        Ad: <span className="text-slate-100">{formatLine(o.give as any)}</span>
                      </div>
                      <div>
                        Kér: <span className="text-slate-100">{formatLine(o.get as any)}</span>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {iAmFrom ? (
                        <button
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-100 hover:bg-white/10"
                          onClick={() => onCancel(o.id)}
                        >
                          Visszavon
                        </button>
                      ) : null}

                      {!iAmFrom && iAmTarget ? (
                        <>
                          <button
                            className="rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-100 hover:bg-white/15"
                            onClick={() => onAccept(o.id)}
                          >
                            Elfogad
                          </button>
                          {o.toPlayerId ? (
                            <button
                              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-100 hover:bg-white/10"
                              onClick={() => onReject(o.id)}
                            >
                              Elutasít
                            </button>
                          ) : null}
                        </>
                      ) : null}

                      {!iAmFrom && !iAmTarget ? (
                        <div className="text-xs text-slate-400">Nem neked szól</div>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
