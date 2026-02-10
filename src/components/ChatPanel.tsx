'use client'

import { useState } from 'react'
import type { GameState } from '@/types/game'

export function ChatPanel({ game, me, onSend }: { game: GameState; me: string; onSend: (text: string) => void }) {
  const [text, setText] = useState('')
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/20">
      <h3 className="mb-3 text-sm font-semibold text-slate-100">Chat</h3>
      <div className="max-h-[280px] overflow-auto rounded-xl border border-white/10 bg-black/10 p-3 text-xs text-slate-300">
        {game.chat.length === 0 ? <div className="text-slate-500">Nincs üzenet.</div> : null}
        <div className="grid gap-2">
          {game.chat
            .slice()
            .reverse()
            .map((c, idx) => {
            const isMe = c.playerId === me
            return (
              <div key={`${c.ts}-${c.playerId ?? 'anon'}-${idx}`} className={isMe ? 'text-sky-100' : ''}>
                <span className="text-slate-500">{new Date(c.ts).toLocaleTimeString()} </span>
                <span className="font-semibold">{c.name}:</span> <span>{c.text}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Üzenet..."
          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400/50"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const t = text.trim()
              if (!t) return
              onSend(t)
              setText('')
            }
          }}
        />
        <button
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-white/10"
          onClick={() => {
            const t = text.trim()
            if (!t) return
            onSend(t)
            setText('')
          }}
        >
          Küld
        </button>
      </div>
    </section>
  )
}
