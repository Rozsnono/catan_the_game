'use client'

import { useMemo, useState } from 'react'
import type { DevCardKind, GameState, Resource } from '@/types/game'
import { TrophyIcon, ResourcePill } from '@/components/icons'
import Select from './Select'

const RES_LABEL: Record<Resource, string> = {
  wood: 'Fa',
  brick: 'Tégla',
  wheat: 'Búza',
  sheep: 'Juh',
  ore: 'Érc',
}

const RESOURCE_ITEMS = (onPick: (r: Resource) => void) =>
  (Object.keys(RES_LABEL) as Resource[]).map((r) => ({
    label: <ResourcePill resource={r} label={RES_LABEL[r]} />,
    onClick: () => onPick(r),
  }))

const CARD_LABEL: Record<DevCardKind, string> = {
  knight: 'Lovag',
  victory: 'Győzelmi pont',
  road_building: 'Útépítés',
  year_of_plenty: 'Bőség éve',
  monopoly: 'Monopólium',
}

function canAffordDev(game: GameState): boolean {
  const you = game.you
  if (!you) return false
  return (you.resources.wheat ?? 0) >= 1 && (you.resources.sheep ?? 0) >= 1 && (you.resources.ore ?? 0) >= 1
}

export function DevCardsPanel({
  game,
  me,
  onBuy,
  onPlay,
}: {
  game: GameState
  me: string
  onBuy: () => void
  onPlay: (cardId: string, payload?: any) => void
}) {
  const isMyTurn = game.currentPlayerId === me
  const you = game.you

  const cards = (you?.devCards ?? []) as { id: string; kind: DevCardKind; boughtTurn: number }[]
  const turn = Number(game.turnNumber ?? 1)

  const playable = useMemo(() => {
    return cards.map((c) => ({
      ...c,
      isPlayable:
        c.kind !== 'victory' &&
        isMyTurn &&
        game.phase === 'main' &&
        !Boolean(game.devPlayedThisTurn) &&
        (c.boughtTurn ?? 0) < turn,
    }))
  }, [cards, isMyTurn, game.phase, game.devPlayedThisTurn, turn])

  const [modal, setModal] = useState<null | { id: string; kind: DevCardKind }>(null)
  const [choice, setChoice] = useState<{ r1?: Resource; r2?: Resource; resource?: Resource }>({})

  const openPlay = (id: string, kind: DevCardKind) => {
    if (kind === 'year_of_plenty' || kind === 'monopoly') {
      setChoice({})
      setModal({ id, kind })
    } else {
      onPlay(id)
    }
  }

  const submitModal = () => {
    if (!modal) return
    if (modal.kind === 'year_of_plenty') {
      onPlay(modal.id, { r1: choice.r1, r2: choice.r2 })
    } else if (modal.kind === 'monopoly') {
      onPlay(modal.id, { resource: choice.resource })
    }
    setModal(null)
  }

  const buyDisabled =
    !isMyTurn ||
    game.phase !== 'main' ||
    !canAffordDev(game) ||
    Number(game.devDeckCount ?? 0) <= 0

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/20">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-100">Fejlesztési kártyák</h3>
        <div className="text-xs text-slate-400">Pakli: <span className="font-semibold text-slate-200">{game.devDeckCount ?? 0}</span></div>
      </div>

      <div className="mt-3 grid gap-2">
        <button
          className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${buyDisabled ? 'cursor-not-allowed border-white/10 bg-white/5 text-slate-400 opacity-70' : 'border-sky-400/20 bg-sky-500/20 text-sky-100 hover:bg-sky-500/25'}`}
          onClick={onBuy}
          disabled={buyDisabled}
          title="Költség: 1 búza + 1 juh + 1 érc"
        >
          <span className="inline-flex items-center gap-2">
            <TrophyIcon className="text-base" /> Fejlesztési kártya vétele (1 búza + 1 juh + 1 érc)
          </span>
        </button>

        {you ? (
          <div className="rounded-xl border border-white/10 bg-black/10 p-3 text-xs text-slate-300">
            Össz VP (rejtettel): <span className="font-semibold text-slate-100">{Number(you.totalVictoryPoints ?? 0)}</span>
            {' '}• Rejtett VP kártyák: <span className="font-semibold text-slate-100">{Number(you.victoryCardCount ?? 0)}</span>
            {' '}• Ingyen utak: <span className="font-semibold text-slate-100">{Number(you.freeRoadsToPlace ?? 0)}</span>
            {' '}• Lovagok: <span className="font-semibold text-slate-100">{Number(you.knightsPlayed ?? 0)}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-3 space-y-2">
        {playable.length === 0 ? (
          <div className="text-sm text-slate-400">Nincs fejlesztési kártyád.</div>
        ) : (
          playable.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/10 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-100">{CARD_LABEL[c.kind]}</div>
                {c.kind !== 'victory' ? (
                  <div className="text-xs text-slate-400">
                    {(c.boughtTurn ?? 0) < turn ? '' : 'Most vetted — nem játszható ki ebben a körben.'}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">Rejtett VP (csak te látod pontosan).</div>
                )}
              </div>

              {c.kind !== 'victory' ? (
                <button
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    c.isPlayable ? 'border-sky-400/30 bg-sky-500/20 text-sky-100 hover:bg-sky-500/25' : 'border-white/10 bg-white/5 text-slate-400 opacity-70'
                  }`}
                  disabled={!c.isPlayable}
                  onClick={() => openPlay(c.id, c.kind)}
                >
                  Kijátszom
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>

      {modal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/90 p-4 shadow-2xl">
            <div className="text-sm font-semibold text-slate-100">{CARD_LABEL[modal.kind]}</div>

            {modal.kind === 'year_of_plenty' ? (
              <div className="mt-3 grid gap-2">
                <label className="text-xs text-slate-400">1. erőforrás</label>
                <Select
                  label={choice.r1 ? <ResourcePill resource={choice.r1} label={RES_LABEL[choice.r1]} /> : 'Válassz…'}
                  items={RESOURCE_ITEMS((r) => setChoice((c) => ({ ...c, r1: r })))}
                />

                <label className="text-xs text-slate-400">2. erőforrás</label>
                <Select
                  label={choice.r2 ? <ResourcePill resource={choice.r2} label={RES_LABEL[choice.r2]} /> : 'Válassz…'}
                  items={RESOURCE_ITEMS((r) => setChoice((c) => ({ ...c, r2: r })))}
                />
              </div>
            ) : null}

            {modal.kind === 'monopoly' ? (
              <div className="mt-3 grid gap-2">
                <label className="text-xs text-slate-400">Erőforrás</label>
                <Select
                  label={
                    choice.resource ? <ResourcePill resource={choice.resource} label={RES_LABEL[choice.resource]} /> : 'Válassz…'
                  }
                  items={RESOURCE_ITEMS((r) => setChoice((c) => ({ ...c, resource: r })))}
                />
              </div>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
                onClick={() => setModal(null)}
              >
                Mégse
              </button>
              <button
                className="rounded-xl border border-sky-400/20 bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-500/25"
                onClick={submitModal}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
