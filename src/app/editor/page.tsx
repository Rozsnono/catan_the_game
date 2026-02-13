'use client'

import { useRouter } from 'next/navigation'
import MapTemplateEditor from '@/components/MapTemplateEditor'

export default function EditorPage() {
  const router = useRouter()

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-6 shadow-xl shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Térképszerkesztő</h1>
          <p className="mt-1 text-sm text-slate-300">
            Készíts saját sablon térképet, mentsd el, és válaszd ki a lobbyban új játék indításánál.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/lobby')}
          className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-black/25"
        >
          ← Vissza a lobbyba
        </button>
      </header>

      <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/20">
        <MapTemplateEditor />
      </section>
    </div>
  )
}
