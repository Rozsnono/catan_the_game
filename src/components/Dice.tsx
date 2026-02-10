'use client'

import React from 'react'

function Pip({ className }: { className: string }) {
  return <span className={`absolute h-1.5 w-1.5 rounded-full bg-white/90 ${className}`} />
}

export function Die({ value }: { value: number }) {
  // positions: TL, TC, TR, ML, MC, MR, BL, BC, BR
  const p = {
    tl: 'left-2 top-2',
    tc: 'left-1/2 top-2 -translate-x-1/2',
    tr: 'right-2 top-2',
    ml: 'left-2 top-1/2 -translate-y-1/2',
    mc: 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
    mr: 'right-2 top-1/2 -translate-y-1/2',
    bl: 'left-2 bottom-2',
    bc: 'left-1/2 bottom-2 -translate-x-1/2',
    br: 'right-2 bottom-2',
  }

  const pips: string[] = (() => {
    switch (value) {
      case 1:
        return [p.mc]
      case 2:
        return [p.tl, p.br]
      case 3:
        return [p.tl, p.mc, p.br]
      case 4:
        return [p.tl, p.tr, p.bl, p.br]
      case 5:
        return [p.tl, p.tr, p.mc, p.bl, p.br]
      case 6:
        return [p.tl, p.ml, p.bl, p.tr, p.mr, p.br]
      default:
        return []
    }
  })()

  return (
    <div className="relative h-12 w-12 rounded-2xl border border-white/15 bg-black/25 shadow-lg shadow-black/20">
      {pips.map((cls, i) => (
        <Pip key={i} className={cls} />
      ))}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-slate-400">
        {value}
      </div>
    </div>
  )
}

export function DiceRow({ d1, d2, sum }: { d1: number; d2: number; sum: number }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/10 px-3 py-3">
      <div className="flex items-center gap-2">
        <Die value={d1} />
        <span className="text-slate-500">+</span>
        <Die value={d2} />
      </div>
      <div className="text-right">
        <div className="text-xs text-slate-400">Dobás</div>
        <div className="text-2xl font-extrabold text-slate-100">{sum}</div>
      </div>
    </div>
  )
}
