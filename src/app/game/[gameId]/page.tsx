'use client'

import useSWR from 'swr'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { GameState } from '@/types/game'
import { getJSON, postJSON } from '@/lib/api'
import { TopBar } from '@/components/TopBar'
import { PlayersPanel } from '@/components/PlayersPanel'
import { ActionsPanel } from '@/components/ActionsPanel'
import { Board } from '@/components/Board'
import { LogPanel } from '@/components/LogPanel'
import { ResourceCardsPanel } from '@/components/ResourceCardsPanel'
import { BankPanel } from '@/components/BankPanel'
import { TradePanel } from '@/components/TradePanel'
import { ChatPanel } from '@/components/ChatPanel'
import { DevCardsPanel } from '@/components/DevCardsPanel'
import { StatsPanel } from '@/components/StatsPanel'
import { MenuIcon, ResourceIcon } from '@/components/icons'
import { HU } from '@/types/translate'

function useLocalPlayerId(gameId: string) {
  // Tri-state:
  //   undefined => still loading from storage
  //   null      => confirmed missing
  //   string    => found
  const [playerId, setPlayerId] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    if (!gameId) return
    try {
      const key = `catan:player:${gameId}`
      const stored = localStorage.getItem(key)
      setPlayerId(stored)
    } catch {
      setPlayerId(null)
    }
  }, [gameId])
  return playerId
}

export default function GamePage() {
  const params = useParams<{ gameId: string }>()
  const gameId = params.gameId
  const router = useRouter()
  const playerId = useLocalPlayerId(gameId)

  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])

  const { data, error, mutate, isLoading } = useSWR<GameState>(
    hydrated && playerId ? `/api/games/${gameId}?playerId=${playerId}` : null,
    (url) => getJSON<GameState>(url),
    { refreshInterval: 2000 }
  )

  const youAreInGame = useMemo(() => {
    if (!data || !playerId) return false
    return data.players.some((p) => p._id === playerId)
  }, [data, playerId])

  useEffect(() => {
    if (!data?.robber?.awaitingSteal) setRobberPick(null)
  }, [data?.robber?.awaitingSteal])

  useEffect(() => {
    if (!playerId) return
    if (data && !youAreInGame) {
      // localStorage mismatch, go home
      router.push('/')
    }
  }, [data, playerId, youAreInGame, router])

  const [toast, setToast] = useState<string | null>(null)
  const [buildMode, setBuildMode] = useState<'none' | 'road' | 'settlement' | 'city'>('none')
  const [panel, setPanel] = useState<
    null | 'players' | 'actions' | 'resources' | 'bank' | 'trade' | 'chat' | 'dev' | 'log' | 'overview' | 'stats'
  >(null)

  // Robber steal flow: pick victim first, then pick a resource from them.
  const [robberPick, setRobberPick] = useState<null | { playerId: string; name: string; resources?: any }>(null)


  const jumpTo = (id: string) => {
    if (typeof document === 'undefined') return
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function act(type: string, payload?: any) {
    if (!playerId) return
    try {
      const next = await postJSON<GameState>(`/api/games/${gameId}/action`, { playerId, type, payload })
      mutate(next, false)
      if (type === 'end_turn') setBuildMode('none')
      if (type === 'build_road' || type === 'build_settlement' || type === 'build_city') setBuildMode('none')
    } catch (e: any) {
      setToast(e?.message ?? String(e))
      setTimeout(() => setToast(null), 2500)
    }
  }

  // Keep the first paint identical between server and client, then decide.
  if (!hydrated || playerId === undefined) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-slate-300">Betöltés…</div>
      </div>
    )
  }

  if (playerId === null) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-slate-300">Válassz vagy hozz létre játékot újra (nincs playerId).</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="font-semibold">Hiba</div>
        <div className="mt-2 text-sm text-slate-300">{String(error)}</div>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-slate-300">Játék betöltése…</div>
      </div>
    )
  }



  const me = data.you
  const waitingForPlayers = data.players.length < 2
  const winner = data.phase === 'finished'
    ? data.players.find((p) => p._id === data.winnerPlayerId) ?? [...data.players].sort((a, b) => (b.victoryPoints ?? 0) - (a.victoryPoints ?? 0))[0]
    : null

  const PanelShell = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="text-sm font-semibold text-slate-100">{title}</div>
        <button
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
          onClick={() => setPanel(null)}
        >
          Bezár
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 gap-1 flex flex-col">{children}</div>
    </div>
  )

  return (
    <div className="relative min-h-[calc(100vh-1rem)]">
      {toast ? (
        <div className="fixed left-1/2 top-3 z-50 w-[min(520px,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100 backdrop-blur">
          {toast}
        </div>
      ) : null}

      <div className="fixed left-1/2 top-3 z-50 w-[min(520px,calc(100vw-2rem))] -translate-x-1/2 bg-transparent">
        {waitingForPlayers ? (
          <div className="fixed left-1/2 top-14 z-40 -translate-x-1/2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 backdrop-blur">
            Várakozás a többi játékosra…
          </div>
        ) : null}

        {data.phase === 'finished' && winner ? (
          <div className="fixed inset-0 z-50 grid place-items-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-emerald-400/30 bg-slate-950/90 p-4 shadow-2xl">
              <div className="text-sm font-semibold text-slate-100">🏁 Játék vége</div>
              <div className="mt-1 text-sm text-slate-200">
                Győztes: <span className="font-semibold" style={{ color: winner.color }}>{winner.name}</span>
                <span className="text-slate-400"> — {winner.victoryPoints} pont</span>
              </div>
              {data.finishedAt ? (
                <div className="mt-1 text-xs text-slate-400">Befejezve: {new Date(data.finishedAt).toLocaleString()}</div>
              ) : null}
              <div className="mt-4 flex gap-2">
                <button
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10"
                  onClick={() => router.push('/')}
                >
                  Vissza a lobbyba
                </button>
                <button
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10"
                  onClick={() => setPanel('stats')}
                >
                  Statisztika
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {data.robber?.pending && data.robber.byPlayerId === playerId && !data.robber.awaitingSteal ? (
          <div className="fixed left-1/2 top-14 z-40 -translate-x-1/2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100 backdrop-blur">
            Válassz mezőt a rablónak (kattints egy hexre).
          </div>
        ) : null}
        {data.robber?.pending && data.robber.byPlayerId === playerId && data.robber.awaitingSteal ? (
          <div className="fixed inset-0 z-50 grid place-items-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/90 p-4 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-100">Rablás</div>
                  {!robberPick ? (
                    <div className="mt-1 text-xs text-slate-400">Válassz játékost, akitől rabolni szeretnél.</div>
                  ) : (
                    <div className="mt-1 text-xs text-slate-400">
                      Válassz egy erőforrást {robberPick.name} játékostól.
                    </div>
                  )}
                </div>
                {robberPick ? (
                  <button
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
                    onClick={() => setRobberPick(null)}
                  >
                    Vissza
                  </button>
                ) : null}
              </div>

              {!robberPick ? (
                <div className="mt-3 grid gap-2">
                  {(data.robber.candidates ?? []).map((c) => (
                    <button
                      key={c.playerId}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 hover:bg-white/10"
                      onClick={() => setRobberPick({ playerId: c.playerId, name: c.name, resources: (c as any).resources })}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                        {c.name}
                      </span>
                      <span className="text-xs text-slate-400">{c.resourceCount} lap</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(['wood', 'brick', 'wheat', 'sheep', 'ore'] as const).map((r) => {
                    const n = Number(robberPick.resources?.[r] ?? 0)
                    const disabled = n <= 0
                    return (
                      <button
                        key={r}
                        disabled={disabled}
                        className={`flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-100 ${disabled ? 'bg-white/5 opacity-40' : 'bg-white/5 hover:bg-white/10'
                          }`}
                        onClick={() => act('robber_steal', { targetPlayerId: robberPick.playerId, resource: r })}
                      >
                        <span className="inline-flex items-center gap-2">
                          <ResourceIcon resource={r} className="h-4 w-4" />
                          {HU[r]}
                        </span>
                        <span className="text-xs text-slate-400">{n}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="sticky top-0 z-30">
        <TopBar game={data} />
      </div>

      <div className="relative mx-auto mt-3 w-full max-w-[1400px] px-3 pb-6">
        {/* Board as the main focus */}
        <div className="flex flex-col gap-3 lg:flex-row">
          <aside className="shrink-0 lg:w-[300px] xl:w-[300px]">
            <ResourceCardsPanel game={data} />
          </aside>
          <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
            <Board
              game={data}
              me={playerId}
              onPlaceSettlement={(nodeId) => act('place_settlement', { nodeId })}
              onPlaceRoad={(edgeId) => act('place_road', { edgeId })}
              buildMode={buildMode}
              onBuildSettlement={(nodeId) => act('build_settlement', { nodeId })}
              onBuildRoad={(edgeId) => act('build_road', { edgeId })}
              onBuildCity={(nodeId) => act('build_city', { nodeId })}
              onMoveRobber={(tileId) => act('robber_move', { tileId })}
            />

            {/* Right-side minimal toolbar */}
            <div className="absolute right-4 top-12 z-20 flex flex-col gap-2">
              <button
                className="rounded-xl border border-white/10 bg-slate-950/60 p-2 text-slate-200 hover:bg-slate-950/80 flex items-center gap-1 justify-center"
                onClick={() => setPanel(panel === 'overview' ? null : 'overview')}
                title="Áttekintés"
              >
                <span className="text-2xl">
                  <MenuIcon type="overview" />
                </span>
              </button>
              <button
                className="rounded-xl border border-white/10 bg-slate-950/60 p-2 text-slate-200 hover:bg-slate-950/80 flex items-center gap-1 justify-center"
                onClick={() => setPanel(panel === 'actions' ? null : 'actions')}
                title="Akciók"
              >
                <span className="text-2xl text-yellow-400">
                  <MenuIcon type="actions" />
                </span>
              </button>
              <button
                className="rounded-xl border border-white/10 bg-slate-950/60 p-2 text-slate-200 hover:bg-slate-950/80 flex items-center gap-1 justify-center"
                onClick={() => setPanel(panel === 'dev' ? null : 'dev')}
                title="Fejlesztési kártyák"
              >
                <span className="text-2xl text-red-400">
                  <MenuIcon type="dev" />
                </span>
              </button>
              <button
                className="rounded-xl border border-white/10 bg-slate-950/60 p-2 text-slate-200 hover:bg-slate-950/80 flex items-center gap-1 justify-center"
                onClick={() => setPanel(panel === 'trade' ? null : 'trade')}
                title="Csere"
              >
                <span className="text-2xl text-green-400">
                  <MenuIcon type="trade" />
                </span>
              </button>
              <button
                className="rounded-xl border border-white/10 bg-slate-950/60 p-2 text-slate-200 hover:bg-slate-950/80 flex items-center gap-1 justify-center"
                onClick={() => setPanel(panel === 'bank' ? null : 'bank')}
                title="Bank"
              >
                <span className="text-2xl text-blue-400">
                  <MenuIcon type="bank" />
                </span>
              </button>
              <button
                className="rounded-xl border border-white/10 bg-slate-950/60 p-2 text-slate-200 hover:bg-slate-950/80 flex items-center gap-1 justify-center"
                onClick={() => setPanel(panel === 'chat' ? null : 'chat')}
                title="Chat"
              >
                <span className="text-2xl text-pink-400">
                  <MenuIcon type="chat" />
                </span>
              </button>
              <button
                className="rounded-xl border border-white/10 bg-slate-950/60 p-2 text-slate-200 hover:bg-slate-950/80 flex items-center gap-1 justify-center"
                onClick={() => setPanel(panel === 'players' ? null : 'players')}
                title="Játékosok"
              >
                <span className="text-2xl text-purple-400">
                  <MenuIcon type="players" />
                </span>
              </button>

              <button
                className="rounded-xl border border-white/10 bg-slate-950/60 p-2 text-slate-200 hover:bg-slate-950/80 flex items-center gap-1 justify-center"
                onClick={() => setPanel(panel === 'log' ? null : 'log')}
                title="Napló"
              >
                <span className="text-2xl text-gray-400">
                  <MenuIcon type="log" />
                </span>
              </button>

              <button
                className="rounded-xl border border-white/10 bg-slate-950/60 p-2 text-slate-200 hover:bg-slate-950/80 flex items-center gap-1 justify-center"
                onClick={() => setPanel(panel === 'stats' ? null : 'stats')}
                title="Statisztika"
              >
                <span className="text-2xl text-slate-200">
                  <MenuIcon type="stats" />
                </span>
              </button>
            </div>
          </div>
          <aside className="shrink-0 lg:w-[300px] xl:w-[300px]">
            <ActionsPanel
              game={data}
              me={playerId}
              onRoll={() => act('roll')}
              onEndTurn={() => act('end_turn')}
              buildMode={buildMode}
              setBuildMode={setBuildMode}
              onJumpTrade={() => setPanel('trade')}
              onJumpDev={() => setPanel('dev')}
            />
          </aside>
        </div>

        {/* Drawer */}
        {panel ? (
          <div className="fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPanel(null)} />
            <div className="absolute right-0 top-0 h-full w-[min(420px,calc(100vw-2.5rem))] border-l border-white/10 bg-slate-950/85 shadow-2xl">
              {panel === 'overview' ? (
                <PanelShell title="Játék áttekintése">
                  <ActionsPanel
                    game={data}
                    me={playerId}
                    onRoll={() => act('roll')}
                    onEndTurn={() => act('end_turn')}
                    buildMode={buildMode}
                    setBuildMode={setBuildMode}
                    onJumpTrade={() => setPanel('trade')}
                    onJumpDev={() => setPanel('dev')}
                  />

                  <ResourceCardsPanel game={data} />

                  <DevCardsPanel
                    game={data}
                    me={playerId}
                    onBuy={() => act('dev_buy')}
                    onPlay={(cardId, payload) => act('dev_play', { cardId, payload })}
                  />

                  <BankPanel game={data} onTrade={(give, get) => act('trade_bank', { give, get })} />
                </PanelShell>
              ) : null}

              {panel === 'actions' ? (
                <PanelShell title="Akciók">
                  <ActionsPanel
                    game={data}
                    me={playerId}
                    onRoll={() => act('roll')}
                    onEndTurn={() => act('end_turn')}
                    buildMode={buildMode}
                    setBuildMode={setBuildMode}
                    onJumpTrade={() => setPanel('trade')}
                    onJumpDev={() => setPanel('dev')}
                  />
                </PanelShell>
              ) : null}

              {panel === 'dev' ? (
                <PanelShell title="Fejlesztési kártyák">
                  <DevCardsPanel
                    game={data}
                    me={playerId}
                    onBuy={() => act('dev_buy')}
                    onPlay={(cardId, payload) => act('dev_play', { cardId, payload })}
                  />
                </PanelShell>
              ) : null}

              {panel === 'trade' ? (
                <PanelShell title="Csere">
                  <TradePanel
                    game={data}
                    me={playerId}
                    onCreate={({ toPlayerId, give, get }) => act('trade_offer_create', { toPlayerId, give, get })}
                    onAccept={(offerId) => act('trade_offer_accept', { offerId })}
                    onReject={(offerId) => act('trade_offer_reject', { offerId })}
                    onCancel={(offerId) => act('trade_offer_cancel', { offerId })}
                  />
                </PanelShell>
              ) : null}

              {panel === 'chat' ? (
                <PanelShell title="Chat">
                  <ChatPanel game={data} me={playerId} onSend={(text) => act('chat', { text })} />
                </PanelShell>
              ) : null}

              {panel === 'players' ? (
                <PanelShell title="Játékosok">
                  <PlayersPanel game={data} me={playerId} />
                </PanelShell>
              ) : null}

              {panel === 'bank' ? (
                <PanelShell title="Bank">
                  <ResourceCardsPanel game={data} />
                  <div className="mt-3">
                    <BankPanel game={data} onTrade={(give, get) => act('trade_bank', { give, get })} />
                  </div>
                </PanelShell>
              ) : null}

              {panel === 'log' ? (
                <PanelShell title="Napló">
                  <LogPanel game={data} />
                </PanelShell>
              ) : null}

              {panel === 'stats' ? (
                <PanelShell title="Statisztika">
                  <StatsPanel game={data} />
                </PanelShell>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}