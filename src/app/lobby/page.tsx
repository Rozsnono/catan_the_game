'use client'

import useSWR from 'swr'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { nanoid } from 'nanoid'

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: 'GET' })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${txt}`)
  }
  return res.json()
}

async function postJSON<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${txt}`)
  }
  return res.json()
}

type ListedGame = {
  gameId: string
  phase: 'lobby' | 'setup' | 'main' | string
  turnNumber: number
  setupStep: string | null
  players: { _id: string; name: string; color: string }[]
  playerCount: number
  updatedAt: string
  createdAt: string
}

function phaseLabel(phase: string) {
  if (phase === 'lobby') return 'Lobby'
  if (phase === 'setup') return 'Setup'
  if (phase === 'main') return 'Játék'
  return phase
}

export default function LobbyPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  const defaultName = useMemo(() => `Player-${nanoid(4)}`, [])
  const safeName = (name.trim() || defaultName).slice(0, 18)

  const { data, error, mutate, isLoading } = useSWR<{ games: ListedGame[] }>(
    '/api/games/list?limit=25',
    (url) => getJSON(url),
    { refreshInterval: 4000 }
  )

  // cache local "resume" ids for listed games
  const [resumeMap, setResumeMap] = useState<Record<string, string | null>>({})
  useEffect(() => {
    if (!data?.games) return
    try {
      const next: Record<string, string | null> = {}
      for (const g of data.games) {
        next[g.gameId] = localStorage.getItem(`catan:player:${g.gameId}`)
      }
      setResumeMap(next)
    } catch {
      // ignore
    }
  }, [data?.games])

  const games = useMemo(() => {
    const list = data?.games || []
    const q = filter.trim().toLowerCase()
    if (!q) return list
    return list.filter((g) => {
      if (g.gameId.toLowerCase().includes(q)) return true
      if (g.players.some((p) => p.name.toLowerCase().includes(q))) return true
      return false
    })
  }, [data?.games, filter])

  const humanUpdated = (iso: string) => {
    try {
      const d = new Date(iso)
      return d.toLocaleString()
    } catch {
      return iso
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-6 shadow-xl shadow-black/20">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Lobby</h1>
          <p className="text-sm text-slate-300">
            Adj nevet, hozz létre új játékot, vagy csatlakozz egy futóhoz. (A lista 4 másodpercenként frissül.)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Saját név: <span className="text-slate-100">{safeName}</span></span>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Next.js + MongoDB</span>
        </div>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        {/* Left: create / join */}
        <section className="lg:col-span-2">
          <div className="grid gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
              <h2 className="text-base font-semibold text-slate-100">1) Játékos név</h2>
              <div className="mt-3 flex gap-2">
                <input
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                  placeholder={defaultName}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <button
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100 hover:bg-white/15"
                  onClick={() => setName(defaultName)}
                  type="button"
                >
                  random
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400">Minimum 2 karakter ajánlott, max 18.</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
              <h2 className="text-base font-semibold text-slate-100">2) Új játék</h2>
              <p className="mt-2 text-sm text-slate-300">Létrehoz egy új gameId-t, amit megoszthatsz a többiekkel.</p>

              <button
                disabled={busy || safeName.trim().length < 2}
                className="mt-4 inline-flex w-full justify-center rounded-xl border border-white/10 bg-sky-500/20 px-4 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-500/25 disabled:opacity-50"
                onClick={async () => {
                  setErr(null)
                  setBusy(true)
                  try {
                    const data = await postJSON<{ gameId: string; playerId: string }>(
                      '/api/games/create',
                      { name: safeName }
                    )
                    localStorage.setItem(`catan:player:${data.gameId}`, data.playerId)
                    router.push(`/game/${data.gameId}`)
                  } catch (e: any) {
                    setErr(e.message || 'Hiba')
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                Új játék létrehozása
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
              <h2 className="text-base font-semibold text-slate-100">3) Csatlakozás gameId-val</h2>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                  placeholder="Game ID (pl. 7Vf3aB1c)"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.trim())}
                />
                <button
                  disabled={busy || safeName.trim().length < 2 || !joinCode.trim()}
                  className="inline-flex justify-center rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/15 disabled:opacity-50"
                  onClick={async () => {
                    setErr(null)
                    setBusy(true)
                    try {
                      const data = await postJSON<{ gameId: string; playerId: string }>(
                        '/api/games/join',
                        { gameId: joinCode.trim(), name: safeName }
                      )
                      localStorage.setItem(`catan:player:${data.gameId}`, data.playerId)
                      router.push(`/game/${data.gameId}`)
                    } catch (e: any) {
                      setErr(e.message || 'Hiba')
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  Csatlakozom
                </button>
              </div>
              <div className="mt-2 text-xs text-slate-400">Ha már bent vagy ebben a játékban, akkor inkább a jobb oldali listából „Folytatás”.</div>
            </div>

            {(err || error) && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                {err || (error as any)?.message || 'Hiba'}
              </div>
            )}
          </div>
        </section>

        {/* Right: running games */}
        <section className="lg:col-span-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-100">Futó játékok</h2>
                <p className="mt-1 text-sm text-slate-300">Kattints „Folytatás”-ra, ha ez a böngésző már csatlakozott korábban.</p>
              </div>
              <div className="flex gap-2">
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Szűrés: gameId vagy játékos név…"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400/50 sm:w-72"
                />
                <button
                  className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100 hover:bg-white/15"
                  onClick={() => mutate()}
                  type="button"
                >
                  frissít
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {isLoading && (
                <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                  Betöltés…
                </div>
              )}

              {!isLoading && games.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                  Nincs aktív játék. Hozz létre egy újat a bal oldalon.
                </div>
              )}

              {games.map((g) => {
                const resumeId = resumeMap[g.gameId] || null
                const youAreIn = resumeId ? g.players.some((p) => p._id === resumeId) : false
                const canResume = Boolean(resumeId && youAreIn)
                return (
                  <div
                    key={g.gameId}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate font-mono text-sm text-slate-100">{g.gameId}</div>
                          <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-xs text-slate-200">
                            {phaseLabel(g.phase)}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-xs text-slate-200">
                            {g.playerCount}/4 játékos
                          </span>
                          {g.phase !== 'lobby' && (
                            <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-xs text-slate-200">
                              Kör {g.turnNumber}
                            </span>
                          )}
                          {canResume && (
                            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-200">
                              te bent vagy
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
                          {g.players.map((p) => (
                            <span
                              key={p._id}
                              className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5"
                              title={p._id}
                            >
                              {p.name}
                            </span>
                          ))}
                          {g.players.length === 0 && <span className="text-slate-400">nincs játékos</span>}
                        </div>

                        <div className="mt-2 text-xs text-slate-400">
                          Frissítve: {humanUpdated(g.updatedAt)}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100 hover:bg-white/15"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(g.gameId)
                            } catch {
                              // ignore
                            }
                          }}
                          type="button"
                        >
                          Másol
                        </button>

                        {canResume ? (
                          <button
                            className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/20"
                            onClick={() => router.push(`/game/${g.gameId}`)}
                            type="button"
                          >
                            Folytatás
                          </button>
                        ) : (
                          <button
                            disabled={busy || safeName.trim().length < 2 || g.playerCount >= 4}
                            className="rounded-xl border border-white/10 bg-sky-500/20 px-3 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-500/25 disabled:opacity-50"
                            onClick={async () => {
                              setErr(null)
                              setBusy(true)
                              try {
                                const data = await postJSON<{ gameId: string; playerId: string }>(
                                  '/api/games/join',
                                  { gameId: g.gameId, name: safeName }
                                )
                                localStorage.setItem(`catan:player:${data.gameId}`, data.playerId)
                                router.push(`/game/${data.gameId}`)
                              } catch (e: any) {
                                setErr(e.message || 'Hiba')
                              } finally {
                                setBusy(false)
                              }
                            }}
                            type="button"
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
          </div>
        </section>
      </div>
    </div>
  )
}
