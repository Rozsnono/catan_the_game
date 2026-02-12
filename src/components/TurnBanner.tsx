'use client'

import type { GameState } from '@/types/game'

export function TurnBanner({ game, meId }: { game: GameState; meId: string }) {
  const current = game.players.find((p) => p._id === game.currentPlayerId)
  const isYou = game.currentPlayerId === meId

  if (game.phase === 'finished') {
    const winner = game.players.find((p) => p._id === (game.winnerPlayerId ?? ''))
    return (
      <div className="mx-auto max-w-[1400px] px-3 pt-2">
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          <span className="font-semibold">Játék vége.</span> Győztes: <span className="font-semibold" style={{ color: winner?.color || undefined }}>{winner?.name ?? '—'}</span>
        </div>
      </div>
    )
  }

  if (!current) return null

  return (
    <div className="mx-auto max-w-[1400px] px-3 pt-2">
      <div
        className={
          isYou
            ? 'turn-banner turn-banner--you'
            : 'turn-banner'
        }
      >
        {isYou ? (
          <span className="font-semibold">Te jössz!</span>
        ) : (
          <>
            <span className="text-slate-200">Most</span>{' '}
            <span className="font-semibold" style={{ color: current.color || undefined }}>{current.name}</span>{' '}
            <span className="text-slate-200">jön.</span>
          </>
        )}
        <span className="ml-2 text-xs text-slate-300">Turn {game.turnNumber ?? 0}</span>
      </div>
    </div>
  )
}
