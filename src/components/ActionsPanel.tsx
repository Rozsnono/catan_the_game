'use client'

import type { GameState } from '@/types/game'
import { DiceRow } from '@/components/Dice'
import { ChatIcon, CityIcon, DiceIcon, RoadIcon, SettlementIcon, TradeIcon, TrophyIcon } from '@/components/icons'

function Btn({ children, onClick, disabled, tone }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; tone?: 'primary' | 'danger' }) {
  const base = 'rounded-xl border px-4 py-3 text-sm font-semibold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50'
  const style = tone === 'primary'
    ? 'border-sky-400/20 bg-sky-500/20 text-sky-100 hover:bg-sky-500/25'
    : tone === 'danger'
      ? 'border-rose-400/20 bg-rose-500/15 text-rose-100 hover:bg-rose-500/20'
      : 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10'

  return (
    <button className={`${base} ${style}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

export function ActionsPanel({
  game,
  me,
  onRoll,
  onEndTurn,
  rolling,
  rollAnim,
  buildMode,
  setBuildMode,
  onJumpTrade,
  onJumpDev: onJumpDev,
}: {
  game: GameState
  me: string
  onRoll: () => void
  onEndTurn: () => void
  rolling?: boolean
  rollAnim?: { d1: number; d2: number }
  buildMode: 'none' | 'road' | 'settlement' | 'city'
  setBuildMode: (m: 'none' | 'road' | 'settlement' | 'city') => void
  onJumpTrade?: () => void
  onJumpDev?: () => void
}) {
  const isMyTurn = game.currentPlayerId === me
  const lastRollName = game.lastRoll
    ? game.players.find((p) => p._id === game.lastRoll!.playerId)?.name ?? '—'
    : null
  const hint = (() => {
    if (game.phase === 'setup') {
      if (!isMyTurn) return 'Setup: várj a körödre.'
      return game.setupStep === 'place_settlement'
        ? 'Setup: település lerakása (kattints a táblán egy pontra).'
        : 'Setup: út lerakása (kattints a település melletti élre).'
    }
    if (game.phase === 'main') {
      if (!isMyTurn) return 'Várj a körödre.'
      if (!game.turnHasRolled) return 'Dobás → építés/akciók → Kör vége.'
      return buildMode === 'none'
        ? 'Építéshez válassz módot (út/település/város), vagy fejezd be a kört.'
        : buildMode === 'road'
          ? 'Út építés: kattints egy élre. (költség: 1 fa, 1 tégla)'
          : buildMode === 'settlement'
            ? 'Település építés: kattints egy csomópontra. (költség: 1 fa, 1 tégla, 1 búza, 1 juh)'
            : 'Város fejlesztés: kattints egy saját településre. (költség: 2 búza, 3 érc)'
    }
    return '—'
  })()

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/20">
      <h3 className="mb-3 text-sm font-semibold text-slate-100">Kör akciók</h3>
      <div className="mb-3 rounded-xl border border-white/10 bg-black/10 px-3 py-2 text-xs text-slate-300">
        {hint}
      </div>

      {/* {false && (rolling && rollAnim) ? (
        <div className="mb-3">
          <div className="mb-2 text-xs text-slate-400">Dobás…</div>
          <DiceRow d1={rollAnim.d1} d2={rollAnim.d2} sum={rollAnim.d1 + rollAnim.d2} />
        </div>
      ) : null} */}

      {game.phase === 'main' && game.lastRoll ? (
        <div>
          <div className="mb-2 text-xs text-slate-400">
            Utolsó dobás: <span className="font-semibold text-slate-200">{lastRollName}</span>
          </div>
          <DiceRow d1={game.lastRoll.d1} d2={game.lastRoll.d2} sum={game.lastRoll.sum} />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <Btn tone="primary" onClick={onRoll} disabled={!isMyTurn || game.phase !== 'main' || !!game.turnHasRolled}>
          <span className="inline-flex items-center gap-2">
            <DiceIcon className="text-base" /> Dobás
          </span>
        </Btn>
        <Btn tone="danger" onClick={onEndTurn} disabled={!isMyTurn || game.phase !== 'main'}>
          <span className="inline-flex items-center gap-2">
            <TrophyIcon className="text-base" /> Kör vége
          </span>
        </Btn>
        <Btn onClick={onJumpTrade} disabled={!onJumpTrade}>
          <span className="inline-flex items-center gap-2">
            <TradeIcon className="text-base" /> Csere
          </span>
        </Btn>
        <Btn onClick={onJumpDev} disabled={!onJumpDev}>
          <span className="inline-flex items-center gap-2">
            <ChatIcon className="text-base" /> Fejlesztési
          </span>
        </Btn>
      </div>

      {game.phase === 'main' ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-black/10 p-3">
          <div className="mb-2 text-xs font-semibold text-slate-200">Építés mód</div>
          <div className="flex flex-wrap gap-2">
            <button
              className={`rounded-full border px-3 py-1 text-xs transition ${buildMode === 'road' ? 'border-sky-400/40 bg-sky-500/20 text-sky-100' : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'}`}
              onClick={() => setBuildMode(buildMode === 'road' ? 'none' : 'road')}
              disabled={!isMyTurn}
            >
              <span className="inline-flex items-center gap-2">
                <RoadIcon className="text-sm" /> Út (1 fa + 1 tégla)
              </span>
            </button>
            <button
              className={`rounded-full border px-3 py-1 text-xs transition ${buildMode === 'settlement' ? 'border-sky-400/40 bg-sky-500/20 text-sky-100' : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'}`}
              onClick={() => setBuildMode(buildMode === 'settlement' ? 'none' : 'settlement')}
              disabled={!isMyTurn}
            >
              <span className="inline-flex items-center gap-2">
                <SettlementIcon className="text-sm" /> Település (fa+tégla+búza+juh)
              </span>
            </button>
            <button
              className={`rounded-full border px-3 py-1 text-xs transition ${buildMode === 'city' ? 'border-amber-400/40 bg-amber-500/15 text-amber-100' : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'}`}
              onClick={() => setBuildMode(buildMode === 'city' ? 'none' : 'city')}
              disabled={!isMyTurn}
            >
              <span className="inline-flex items-center gap-2">
                <CityIcon className="text-sm" /> Város (2 búza + 3 érc)
              </span>
            </button>
          </div>
          {!isMyTurn ? (
            <div className="mt-2 text-xs text-slate-500">Csak a saját körödben építhetsz.</div>
          ) : !game.turnHasRolled ? (
            <div className="mt-2 text-xs text-slate-500">Tipp: dobhatsz előbb, de az építés nincs roll-hoz kötve.</div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 text-xs text-slate-500">
        Frissítés: 2 mp polling. Ha több böngészőben nyitod meg, működik a „multiplayer”.
      </div>
    </section>
  )
}
