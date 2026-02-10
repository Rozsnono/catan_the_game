'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Select from '@/components/Select'

async function postJSON<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export default function Home() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const canContinue = useMemo(() => name.trim().length >= 2, [name])

  return (
    <div className="grid gap-4 md:gap-6">
      <header className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xl font-extrabold tracking-tight md:text-2xl">Catan Online</div>
          <div className="text-sm text-slate-300">Nincs valós idejű socket – kliens pollinggal frissít (SWR).</div>
        </div>
        <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-slate-200">
          Next.js + MongoDB
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/20">
          <h2 className="mb-3 text-base font-semibold text-slate-100">1) Név</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Pl. Bence"
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400/50"
          />
          <p className="mt-2 text-xs text-slate-400">Minimum 2 karakter.</p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/20">
          <h2 className="mb-3 text-base font-semibold text-slate-100">2) Szoba</h2>
          <div className="grid gap-3">
            <button
              disabled={!canContinue || loading}
              onClick={async () => {
                setLoading(true)
                try {
                  const data = await postJSON<{ gameId: string; playerId: string }>(
                    '/api/games/create',
                    { name: name.trim() }
                  )
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
                    const data = await postJSON<{ gameId: string; playerId: string }>(
                      '/api/games/join',
                      { gameId: code.trim(), name: name.trim() }
                    )
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
            <p className="text-xs text-slate-400">
              Tipp: ha már bent vagy a játékban, a felső sávból kimásolhatod a Game ID-t.
            </p>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-base font-semibold">Mit tud ez az MVP?</h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-slate-300">
          <li>Reszponzív UI (telefon/tablet/desktop)</li>
          <li>Hex tábla SVG-vel, mintázott (pattern) tile-okkal</li>
          <li>Szoba alapú játék API-val (polling), nincs websocket</li>
          <li>Setup fázis: település + út lerakása (alap validáció)</li>
          <li>Main fázis: dobás, kör vége, log/CHAT</li>
        </ul>
      </section>
    </div>
  )
}
