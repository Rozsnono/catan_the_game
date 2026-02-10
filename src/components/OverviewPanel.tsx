import type { GameState, Resource } from '@/types/game'
import { PlayersPanel } from '@/components/PlayersPanel'
import { ResourceCardsPanel } from '@/components/ResourceCardsPanel'
import { BankPanel } from '@/components/BankPanel'
import { TradePanel } from '@/components/TradePanel'
import { DevCardsPanel } from '@/components/DevCardsPanel'

export function OverviewPanel({
  game,
  me,
  onBankTrade,
  onTradeCreate,
  onTradeAccept,
  onTradeReject,
  onTradeCancel,
  onDevBuy,
  onDevPlay,
}: {
  game: GameState
  me: string
  onBankTrade: (give: Resource, get: Resource) => void
  onTradeCreate: (args: { toPlayerId: string; give: Partial<Record<Resource, number>>; get: Partial<Record<Resource, number>> }) => void
  onTradeAccept: (offerId: string) => void
  onTradeReject: (offerId: string) => void
  onTradeCancel: (offerId: string) => void
  onDevBuy: () => void
  onDevPlay: (cardId: string, payload?: any) => void
}) {
  return (
    <div className="space-y-3">
      <details open className="rounded-xl border border-white/10 bg-white/5">
        <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-slate-100">
          Játékosok
        </summary>
        <div className="p-2 pt-0">
          <PlayersPanel game={game} me={me} />
        </div>
      </details>

      <details open className="rounded-xl border border-white/10 bg-white/5">
        <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-slate-100">
          Kártyák & Bank
        </summary>
        <div className="p-2 pt-0">
          <ResourceCardsPanel game={game} />
          <div className="mt-3">
            <BankPanel game={game} onTrade={onBankTrade} />
          </div>
        </div>
      </details>

      <details className="rounded-xl border border-white/10 bg-white/5">
        <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-slate-100">
          Cserék
        </summary>
        <div className="p-2 pt-0">
          <TradePanel
            game={game}
            me={me}
            onCreate={onTradeCreate}
            onAccept={onTradeAccept}
            onReject={onTradeReject}
            onCancel={onTradeCancel}
          />
        </div>
      </details>

      <details className="rounded-xl border border-white/10 bg-white/5">
        <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-slate-100">
          Fejlesztési kártyák
        </summary>
        <div className="p-2 pt-0">
          <DevCardsPanel game={game} me={me} onBuy={onDevBuy} onPlay={onDevPlay} />
        </div>
      </details>
    </div>
  )
}
