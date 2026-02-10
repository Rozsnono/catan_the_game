'use client'

import type { GameState } from '@/types/game'
import { CopyIcon } from './icons'
import { useState } from 'react'

export function TopBar({ game }: { game: GameState }) {
  const current = game.players.find((p) => p._id === game.currentPlayerId)

  const [isCopied, setIsCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(game._id);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }

  return (
    <header className="w-full border-b border-white/10 bg-slate-950/70 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-3 py-2">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold tracking-tight">Catan</div>
          <div className="hidden h-4 w-px bg-white/10 sm:block" />
          <div className="text-xs text-slate-400">
            Fázis: <span className="text-slate-200">{game.phase}</span>
            {game.phase === 'setup' ? (
              <>
                {' '}· Setup: <span className="text-slate-200">{game.setupStep}</span>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="text-slate-400">Következő:</div>
          <div className="font-semibold" style={{ color: current?.color || undefined }}>
            {current?.name ?? '—'}
          </div>
          <div className="hidden rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-200 sm:inline-flex">
            Turn {game.turnNumber ?? 0}
          </div>

          <div className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-200 inline-flex items-center gap-1 cursor-pointer" onClick={handleCopy}>
            {game._id}
            <CopyIcon isCopied={isCopied} />
          </div>

        </div>
      </div>
    </header>
  )
}
