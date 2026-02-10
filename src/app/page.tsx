'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Select from '@/components/Select'

type MapType = 'classic' | 'large' | 'islands' | 'world'

type ListedGame = {
  gameId: string
  phase: 'lobby' | 'setup' | 'main'
  turnNumber: number
  setupStep: string | null
  players: { _id: string; name: string; color: string }[]
  playerCount: number
  updatedAt: string
  createdAt: string
  mapType: MapType
  settings: { maxVictoryPoints: number; maxPlayers: number }
}

async function postJSON<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

function phaseLabel(p: ListedGame['phase']) {
  if (p === 'lobby') return 'Lobby'
  if (p === 'setup') return 'Setup'
  return 'Main'
}

function mapLabel(t: MapType) {
  if (t === 'classic') return 'Klasszikus'
  if (t === 'large') return 'Nagy'
  if (t === 'islands') return 'Szigetek'
  return 'Világ'
}

export default function Home() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  // New game settings
  const [mapType, setMapType] = useState<MapType>('classic')
  const [maxVictoryPoints, setMaxVictoryPoints] = useState(10)
  const [maxPlayers, setMaxPlayers] = useState<2 | 3 | 4>(4)

  // Running games
  const [games, setGames] = useState<ListedGame[]>([])
  const [listError, setListError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  const canContinue = useMemo(() => name.trim().length >= 2, [name])

  async function refreshGames() {
    try {
      setListError(null)
      const data = await getJSON<{ games: ListedGame[] }>(`/api/games/list?limit=50`)
      setGames(data.games || [])
    } catch (e: any) {
      setListError(e?.message ?? 'Nem sikerült betölteni a játéklistát.')
    }
  }

  useEffect(() => {
    refreshGames()
    const t = setInterval(refreshGames, 4000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredGames = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return games
    return games.filter((g) => {
      if (g.gameId.toLowerCase().includes(q)) return true
      if ((g.players || []).some((p) => p.name.toLowerCase().includes(q))) return true
      return false
    })
  }, [games, filter])

  return (
    <div className="grid gap-4 md:gap-6">
      <header className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xl font-extrabold tracking-tight md:text-2xl">Catan Online</div>
          <div className="text-sm text-slate-300">Lobby a főoldalon + aktív játék lista + beállítások.</div>
        </div>
        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-200">Next.js + MongoDB</div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left: create/join */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/20">
          <h2 className="mb-3 text-base font-semibold text-slate-100">Játék indítása / csatlakozás</h2>

          <div className="grid gap-3">
            <div>
              <div className="mb-1 text-xs font-semibold text-slate-300">Név</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Pl. Bence"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400/50"
              />
              <p className="mt-1 text-xs text-slate-400">Minimum 2 karakter.</p>
            </div>

            <div className="grid gap-2 rounded-xl border border-white/10 bg-black/10 p-3">
              <div className="text-xs font-semibold text-slate-300">Új játék beállításai</div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xs font-semibold text-slate-300">Térkép</div>
                <Select
                  label={
                    <span className="inline-flex items-center gap-2">
                      <span className="font-semibold text-slate-100">{mapLabel(mapType)}</span>
                      <span className="text-xs text-slate-400">választás</span>
                    </span>
                  }
                  items={[
                    { label: 'Klasszikus (19 hex)', onClick: () => setMapType('classic') },
                    { label: 'Nagy (37 hex)', onClick: () => setMapType('large') },
                    { label: 'Szigetek', onClick: () => setMapType('islands') },
                    { label: 'Világ', onClick: () => setMapType('world') },
                  ]}
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 hover:bg-black/25"
                  disabled={loading}
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs font-semibold text-slate-300">Max pont</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={5}
                      max={20}
                      value={maxVictoryPoints}
                      onChange={(e) => setMaxVictoryPoints(parseInt(e.target.value, 10))}
                      className="w-full"
                      disabled={loading}
                    />
                    <div className="min-w-[2.5rem] rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-center text-sm text-slate-100">
                      {maxVictoryPoints}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-xs font-semibold text-slate-300">Max játékos</div>
                  <Select
                    label={<span className="font-semibold text-slate-100">{maxPlayers}</span>}
                    items={[
                      { label: '2 játékos', onClick: () => setMaxPlayers(2) },
                      { label: '3 játékos', onClick: () => setMaxPlayers(3) },
                      { label: '4 játékos', onClick: () => setMaxPlayers(4) },
                    ]}
                    className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 hover:bg-black/25"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <button
              disabled={!canContinue || loading}
              onClick={async () => {
                setLoading(true)
                try {
                  const data = await postJSON<{ gameId: string; playerId: string }>('/api/games/create', {
                    name: name.trim(),
                    mapType,
                    maxVictoryPoints,
                    maxPlayers,
                  })
                  localStorage.setItem(`catan:player:${data.gameId}`, data.playerId)
                  router.push(`/game/${data.gameId}`)
                } finally {
                  setLoading(false)
                }
              }}
              className="rounded-xl border border-white/10 bg-sky-500/20 px-4 py-3 font-semibold text-sky-100 hover:bg-sky-500/25 disabled:opacity-50"
            >
              Új játék létrehozása
            </button>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Game ID (példa: 7Vf3... )"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400/50"
              />
              <button
                disabled={!canContinue || !code.trim() || loading}
                onClick={async () => {
                  setLoading(true)
                  try {
                    const data = await postJSON<{ gameId: string; playerId: string }>('/api/games/join', {
                      gameId: code.trim(),
                      name: name.trim(),
                    })
                    localStorage.setItem(`catan:player:${data.gameId}`, data.playerId)
                    router.push(`/game/${data.gameId}`)
                  } finally {
                    setLoading(false)
                  }
                }}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-slate-100 hover:bg-white/10 disabled:opacity-50"
              >
                Csatlakozás
              </button>
            </div>

            <p className="text-xs text-slate-400">Tipp: a futó játékoknál is tudsz csatlakozni / folytatni.</p>
          </div>
        </section>

        {/* Right: running games */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-slate-100">Éppen futó játékok</h2>
            <button
              onClick={refreshGames}
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-black/25"
            >
              Frissítés
            </button>
          </div>

          <div className="mt-3 grid gap-2">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Szűrés: gameId vagy játékosnév…"
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400/50"
            />

            {listError ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">{listError}</div>
            ) : null}

            {filteredGames.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-black/10 p-3 text-sm text-slate-300">
                Nincs aktív játék (lobby/setup/main).
              </div>
            ) : (
              <div className="grid gap-2">
                {filteredGames.map((g) => {
                  const storedPlayerId =
                    typeof window !== 'undefined' ? localStorage.getItem(`catan:player:${g.gameId}`) : null
                  const canJoin = g.playerCount < (g.settings?.maxPlayers ?? 4)
                  return (
                    <div
                      key={g.gameId}
                      className="rounded-xl border border-white/10 bg-black/10 p-3 hover:bg-black/15"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-[14rem]">
                          <div className="font-mono text-sm font-semibold text-slate-100">{g.gameId}</div>
                          <div className="mt-1 text-xs text-slate-300">
                            {phaseLabel(g.phase)} • {g.playerCount}/{g.settings?.maxPlayers ?? 4} játékos • Max pont: {g.settings?.maxVictoryPoints ?? 10} • Térkép: {mapLabel(g.mapType)}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {(g.players || []).map((p) => (
                              <span
                                key={p._id}
                                className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-xs text-slate-100"
                                title={p._id}
                              >
                                {p.name}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={async () => {
                              await navigator.clipboard.writeText(g.gameId)
                            }}
                            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-black/25"
                          >
                            Másol
                          </button>

                          {storedPlayerId ? (
                            <button
                              onClick={() => router.push(`/game/${g.gameId}`)}
                              className="rounded-lg border border-white/10 bg-sky-500/20 px-3 py-2 text-xs font-semibold text-sky-100 hover:bg-sky-500/25"
                            >
                              Folytatás
                            </button>
                          ) : (
                            <button
                              disabled={!canContinue || loading || !canJoin}
                              onClick={async () => {
                                setLoading(true)
                                try {
                                  const data = await postJSON<{ gameId: string; playerId: string }>('/api/games/join', {
                                    gameId: g.gameId,
                                    name: name.trim(),
                                  })
                                  localStorage.setItem(`catan:player:${data.gameId}`, data.playerId)
                                  router.push(`/game/${data.gameId}`)
                                } finally {
                                  setLoading(false)
                                }
                              }}
                              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10 disabled:opacity-50"
                              title={!canJoin ? 'A játék tele van.' : undefined}
                            >
                              Csatlakozás
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-base font-semibold">Gyors infó</h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-slate-300">
          <li>A futó játékok listája 4 mp-enként frissül.</li>
          <li>„Folytatás” akkor jelenik meg, ha ebben a böngészőben már csatlakoztál az adott Game ID-hoz.</li>
          <li>A térkép (mapType), max pont és max játékos a játék létrehozásakor rögzül.</li>
        </ul>
      </section>
    </div>
  )
}
