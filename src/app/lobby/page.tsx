'use client'

import useSWR from 'swr'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { nanoid } from 'nanoid'
import MapPreview from '@/components/MapPreview'
import RangeInput from '@/components/shared/Range'

type MapType = 'classic' | 'large' | 'islands' | 'world' | 'custom'

type MapTemplate = { _id: string; name: string; hexes?: { q: number; r: number }[] }

type ListedGame = {
  gameId: string
  phase: 'lobby' | 'setup' | 'main' | 'finished' | string
  turnNumber: number
  setupStep: string | null
  players: { _id: string; name: string; color: string }[]
  playerCount: number
  updatedAt: string
  createdAt: string
  mapType?: MapType
  mapTemplateId?: string | null
  settings?: { maxVictoryPoints: number; maxPlayers: number; discardOnSeven?: boolean }
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: 'GET', cache: 'no-store' })
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

function phaseLabel(phase: string) {
  if (phase === 'lobby') return 'Lobby'
  if (phase === 'setup') return 'Setup'
  if (phase === 'main') return 'Játék'
  if (phase === 'finished') return 'Vége'
  return phase
}

function mapLabel(t: MapType) {
  if (t === 'classic') return 'Klasszikus'
  if (t === 'large') return 'Nagy'
  if (t === 'islands') return 'Szigetek'
  if (t === 'world') return 'Világ'
  return 'Sablon'
}

export default function LobbyPage() {
  const router = useRouter()

  // Identity
  const [name, setName] = useState('')
  const defaultName = useMemo(() => `Player-${nanoid(4)}`, [])
  const safeName = (name.trim() || defaultName).slice(0, 18)

  // Create/join
  const [joinCode, setJoinCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // New game settings
  const [mapSource, setMapSource] = useState<'preset' | 'template'>('preset')
  const [mapType, setMapType] = useState<MapType>('classic')
  const [templateId, setTemplateId] = useState<string>('')
  const [maxVictoryPoints, setMaxVictoryPoints] = useState(10)
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [discardOnSeven, setDiscardOnSeven] = useState(true)

  const { data: gamesData, error: gamesError, mutate: refreshGames, isLoading: gamesLoading } = useSWR<{ games: ListedGame[] }>(
    '/api/games/list?limit=25',
    (url) => getJSON(url),
    { refreshInterval: 4000 }
  )

  const { data: templatesData, mutate: refreshTemplates } = useSWR<{ templates: MapTemplate[] }>(
    '/api/templates',
    (url) => getJSON(url),
    { refreshInterval: 0 }
  )

  const templates = templatesData?.templates ?? []
  const [filter, setFilter] = useState('')

  // cache local "resume" ids for listed games
  const [resumeMap, setResumeMap] = useState<Record<string, string | null>>({})
  useEffect(() => {
    const list = gamesData?.games
    if (!list) return
    try {
      const next: Record<string, string | null> = {}
      for (const g of list) next[g.gameId] = localStorage.getItem(`catan:player:${g.gameId}`)
      setResumeMap(next)
    } catch {
      // ignore
    }
  }, [gamesData?.games])

  const games = useMemo(() => {
    const list = gamesData?.games || []
    const q = filter.trim().toLowerCase()
    if (!q) return list
    return list.filter((g) => {
      if (g.gameId.toLowerCase().includes(q)) return true
      if ((g.players ?? []).some((p) => p.name.toLowerCase().includes(q))) return true
      return false
    })
  }, [gamesData?.games, filter])

  const canProceed = safeName.trim().length >= 2

  const humanUpdated = (iso: string) => {
    try {
      return new Date(iso).toLocaleString()
    } catch {
      return iso
    }
  }

  const selectedTemplate = useMemo(() => templates.find((t) => t._id === templateId) ?? null, [templates, templateId])
  const canCreate = canProceed && (mapSource === 'preset' ? true : Boolean(templateId))

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-6 shadow-xl shadow-black/20 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Catan Online – Lobby</h1>
          <p className="mt-1 text-sm text-slate-300">
            Új játék indítása, csatlakozás és futó játékok. A térképszerkesztő külön oldalon van.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
              Saját név: <span className="text-slate-100">{safeName}</span>
            </span>
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Next.js + MongoDB</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.push('/editor')}
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-black/25"
          >
            Térképszerkesztő
          </button>
          <button
            type="button"
            onClick={() => {
              refreshGames()
              refreshTemplates()
            }}
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/15"
          >
            Frissítés
          </button>
        </div>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-12">
        {/* Left column: identity + create + join */}
        <section className="lg:col-span-5">
          <div className="grid gap-4">
            {/* Name */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
              <h2 className="text-base font-semibold text-slate-100">Játékos név</h2>
              <div className="mt-3 flex gap-2">
                <input
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                  placeholder={defaultName}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <button
                  className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-white/15"
                  onClick={() => setName(defaultName)}
                  type="button"
                >
                  random
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400">Minimum 2 karakter ajánlott, max 18.</p>
            </div>

            {/* New game */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-100">Új játék</h2>
                  <p className="mt-1 text-sm text-slate-300">Állítsd be a térképet és a szabályokat, majd hozd létre a játékot.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300">
                  {mapSource === 'preset' ? (
                    <span>
                      Térkép: <span className="text-slate-100">{mapLabel(mapType)}</span>
                    </span>
                  ) : (
                    <span>
                      Sablon: <span className="text-slate-100">{selectedTemplate?.name ?? '—'}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-4">
                {/* Map source tabs */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`flex-1 rounded-2xl border px-4 py-2 text-sm font-semibold ${mapSource === 'preset'
                      ? 'border-sky-400/50 bg-sky-500/15 text-sky-100'
                      : 'border-white/10 bg-black/10 text-slate-100 hover:bg-black/15'
                      }`}
                    onClick={() => setMapSource('preset')}
                    disabled={busy}
                  >
                    Beépített térképek
                  </button>
                  <button
                    type="button"
                    className={`flex-1 rounded-2xl border px-4 py-2 text-sm font-semibold ${mapSource === 'template'
                      ? 'border-sky-400/50 bg-sky-500/15 text-sky-100'
                      : 'border-white/10 bg-black/10 text-slate-100 hover:bg-black/15'
                      }`}
                    onClick={() => setMapSource('template')}
                    disabled={busy}
                  >
                    Saját sablon
                  </button>
                </div>

                {/* Map picker */}
                {mapSource === 'preset' ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {([
                      { id: 'classic' as const, title: 'Klasszikus', sub: '19 hex' },
                      { id: 'large' as const, title: 'Nagy', sub: '37 hex' },
                      { id: 'islands' as const, title: 'Szigetek', sub: 'szigetes' },
                      { id: 'world' as const, title: 'Világ', sub: 'világos' },
                    ]).map((opt) => {
                      const active = mapType === opt.id
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={busy}
                          onClick={() => setMapType(opt.id)}
                          className={`group rounded-3xl border p-2 text-left transition ${active ? 'border-sky-400/60 bg-sky-500/10' : 'border-white/10 bg-black/10 hover:bg-black/15'}`}
                        >
                          <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-black/10">
                            <MapPreview seed={`preset:${opt.id}`} mapType={opt.id} className="h-full w-full" compact />
                          </div>
                          <div className="mt-2">
                            <div className="text-sm font-semibold text-slate-100">{opt.title}</div>
                            <div className="text-xs text-slate-400">{opt.sub}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {templates.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm text-slate-300">
                        Még nincs sablonod. Készíts egyet a <button className="underline" type="button" onClick={() => router.push('/editor')}>térképszerkesztőben</button>.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {templates.map((t) => {
                          const active = templateId === t._id
                          return (
                            <button
                              key={t._id}
                              type="button"
                              disabled={busy}
                              onClick={() => setTemplateId(t._id)}
                              className={`group rounded-3xl border p-2 text-left transition ${active ? 'border-sky-400/60 bg-sky-500/10' : 'border-white/10 bg-black/10 hover:bg-black/15'}`}
                            >
                              <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-black/10">
                                <MapPreview
                                  seed={`tpl:${t._id}`}
                                  mapType="custom"
                                  templateHexes={t.hexes ?? []}
                                  className="h-full w-full"
                                  compact
                                />
                              </div>
                              <div className="mt-2">
                                <div className="text-sm font-semibold text-slate-100 truncate" title={t.name}>{t.name}</div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Settings */}
                <div className="grid gap-4 rounded-3xl border border-white/10 bg-black/10 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="mb-2 text-xs font-semibold text-slate-300">Max győzelmi pont</div>
                      <RangeInput
                        id="max-victory-points"
                        min={5}
                        max={20}
                        value={maxVictoryPoints}
                        onChange={setMaxVictoryPoints}
                        disabled={busy}
                      />
                    </div>
                    <div>
                      <div className="mb-2 text-xs font-semibold text-slate-300">Max játékos</div>
                      <RangeInput
                        id="max-players"
                        min={2}
                        max={4}
                        value={maxPlayers}
                        onChange={setMaxPlayers}
                        disabled={busy}
                      />
                    </div>
                  </div>

                  <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-100">7-es dobás: eldobás</div>
                      <div className="mt-0.5 text-xs text-slate-400">
                        Ha be van kapcsolva, aki 7-nél több lapot tart, eldobja a felét (lefelé kerekítve).
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={discardOnSeven}
                      onChange={(e) => setDiscardOnSeven(e.target.checked)}
                      className="h-5 w-5 accent-sky-400"
                      disabled={busy}
                    />
                  </label>
                </div>

                {/* Create */}
                <button
                  disabled={busy || !canCreate}
                  className="inline-flex w-full justify-center rounded-2xl border border-white/10 bg-sky-500/20 px-4 py-3 text-sm font-semibold text-sky-100 hover:bg-sky-500/25 disabled:opacity-50"
                  onClick={async () => {
                    setErr(null)
                    setBusy(true)
                    try {
                      const payload: any = {
                        name: safeName,
                        maxVictoryPoints,
                        maxPlayers,
                        discardOnSeven,
                      }
                      if (mapSource === 'preset') payload.mapType = mapType
                      else payload.templateId = templateId
                      const resp = await postJSON<{ gameId: string; playerId: string }>(
                        '/api/games/create',
                        payload
                      )
                      localStorage.setItem(`catan:player:${resp.gameId}`, resp.playerId)
                      router.push(`/game/${resp.gameId}`)
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
            </div>

            {/* Join */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
              <h2 className="text-base font-semibold text-slate-100">Csatlakozás gameId-val</h2>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                  placeholder="Game ID (pl. 7Vf3aB1c)"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.trim())}
                />
                <button
                  disabled={busy || !canProceed || !joinCode.trim()}
                  className="inline-flex justify-center rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-white/15 disabled:opacity-50"
                  onClick={async () => {
                    setErr(null)
                    setBusy(true)
                    try {
                      const resp = await postJSON<{ gameId: string; playerId: string }>(
                        '/api/games/join',
                        { gameId: joinCode.trim(), name: safeName }
                      )
                      localStorage.setItem(`catan:player:${resp.gameId}`, resp.playerId)
                      router.push(`/game/${resp.gameId}`)
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
              <div className="mt-2 text-xs text-slate-400">Ha már bent voltál, a jobb oldali listában lesz „Folytatás”.</div>
            </div>

            {(err || gamesError) && (
              <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                {err || (gamesError as any)?.message || 'Hiba'}
              </div>
            )}
          </div>
        </section>

        {/* Right column: games list */}
        <section className="lg:col-span-7">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-100">Futó játékok</h2>
                <p className="mt-1 text-sm text-slate-300">
                  A lista automatikusan frissül. „Folytatás” akkor jelenik meg, ha ez a böngésző már csatlakozott.
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Szűrés: gameId vagy játékosnév…"
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400/50 sm:w-80"
                />
                <button
                  className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-white/15"
                  onClick={() => refreshGames()}
                  type="button"
                >
                  frissít
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {gamesLoading && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">Betöltés…</div>
              )}

              {!gamesLoading && games.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                  Nincs aktív játék. Hozz létre egy újat a bal oldalon.
                </div>
              )}

              {games.map((g) => {
                const resumeId = resumeMap[g.gameId] || null
                const youAreIn = resumeId ? g.players.some((p) => p._id === resumeId) : false
                const canResume = Boolean(resumeId && youAreIn)
                const maxP = g.settings?.maxPlayers ?? 4
                const canJoin = g.playerCount < maxP

                const showPreview = g.mapType && (g.mapType !== 'custom' || g.mapTemplateId)
                const template = g.mapType === 'custom' ? templates.find((t) => t._id === (g.mapTemplateId ?? '')) : null

                return (
                  <div key={g.gameId} className="rounded-3xl border border-white/10 bg-black/20 p-4">
                    <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                      <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-black/10">
                        {showPreview ? (
                          <MapPreview
                            seed={`game:${g.gameId}`}
                            mapType={(g.mapType as any) ?? 'classic'}
                            templateHexes={template?.hexes ?? []}
                            className="h-full w-full"
                            compact
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">nincs előnézet</div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="truncate font-mono text-sm text-slate-100">{g.gameId}</div>
                          <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-xs text-slate-200">
                            {phaseLabel(g.phase)}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-xs text-slate-200">
                            {g.playerCount}/{maxP} játékos
                          </span>
                          {g.phase !== 'lobby' && (
                            <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-xs text-slate-200">
                              Kör {g.turnNumber}
                            </span>
                          )}
                          {g.mapType ? (
                            <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-xs text-slate-200">
                              {g.mapType === 'custom' ? (template?.name ? `Sablon: ${template.name}` : 'Sablon') : `Térkép: ${mapLabel(g.mapType)}`}
                            </span>
                          ) : null}
                          {canResume && (
                            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-200">
                              te bent vagy
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
                          {g.players.map((p) => (
                            <span key={p._id} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5" title={p._id}>
                              {p.name}
                            </span>
                          ))}
                          {g.players.length === 0 && <span className="text-slate-400">nincs játékos</span>}
                        </div>

                        <div className="mt-2 text-xs text-slate-400">Frissítve: {humanUpdated(g.updatedAt)}</div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100 hover:bg-white/15"
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
                              className="rounded-2xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/20"
                              onClick={() => router.push(`/game/${g.gameId}`)}
                              type="button"
                            >
                              Folytatás
                            </button>
                          ) : (
                            <button
                              disabled={busy || !canProceed || !canJoin}
                              className="rounded-2xl border border-white/10 bg-sky-500/20 px-3 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-500/25 disabled:opacity-50"
                              onClick={async () => {
                                setErr(null)
                                setBusy(true)
                                try {
                                  const resp = await postJSON<{ gameId: string; playerId: string }>(
                                    '/api/games/join',
                                    { gameId: g.gameId, name: safeName }
                                  )
                                  localStorage.setItem(`catan:player:${resp.gameId}`, resp.playerId)
                                  router.push(`/game/${resp.gameId}`)
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
