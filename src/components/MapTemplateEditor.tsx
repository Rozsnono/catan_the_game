'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { MapTemplate, MapTemplatePortKind } from '@/types/game'
import Select from '@/components/shared/Select'
import { axialToPixel, hexCorners } from '@/lib/shared/boardGeometry'

type EditorMode = 'add' | 'erase' | 'select';

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function jsonRequest<T>(url: string, method: string, body?: any): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

function key(q: number, r: number) {
  return `${q},${r}`
}

function pixelToAxial(x: number, y: number, size: number): { q: number; r: number } {
  // Pointy-top axial conversion + cube rounding
  const qf = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / size
  const rf = ((2 / 3) * y) / size

  // cube coords
  let xf = qf
  let zf = rf
  let yf = -xf - zf

  let rx = Math.round(xf)
  let ry = Math.round(yf)
  let rz = Math.round(zf)

  const xDiff = Math.abs(rx - xf)
  const yDiff = Math.abs(ry - yf)
  const zDiff = Math.abs(rz - zf)

  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz
  } else if (yDiff > zDiff) {
    ry = -rx - rz
  } else {
    rz = -rx - ry
  }

  return { q: rx, r: rz }
}

export default function MapTemplateEditor(props: {
  onTemplateCreated?: (id: string) => void
}) {
  const size = 48
  const svgRef = useRef<SVGSVGElement | null>(null)

  const [templates, setTemplates] = useState<MapTemplate[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [name, setName] = useState('')

  const [mode, setMode] = useState<EditorMode>('add')
  const [hexes, setHexes] = useState<Array<{ q: number; r: number }>>([{ q: 0, r: 0 }])
  const [ports, setPorts] = useState<MapTemplate['ports']>([])
  const [selectedHex, setSelectedHex] = useState<{ q: number; r: number } | null>(null)
  const [portKind, setPortKind] = useState<MapTemplatePortKind>('random')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    const data = await getJSON<{ templates: MapTemplate[] }>(`/api/templates`)
    setTemplates(data.templates ?? [])
  }

  useEffect(() => {
    refresh().catch(() => { })
  }, [])

  useEffect(() => {
    const t = templates.find((x) => x._id === selectedId)
    if (!t) return
    setName(t.name)
    setHexes(t.hexes)
    setPorts(t.ports ?? [])
    setSelectedHex(null)
  }, [selectedId, templates])

  const hexSet = useMemo(() => {
    const s = new Set<string>()
    for (const h of hexes) s.add(key(h.q, h.r))
    return s
  }, [hexes])

  const extents = useMemo(() => {
    if (!hexes.length) return { minX: -240, minY: -240, w: 480, h: 480 }
    const pts = hexes.map((h) => axialToPixel(h.q, h.r, size))
    const xs = pts.map((p) => p.x)
    const ys = pts.map((p) => p.y)
    const minX = Math.min(...xs) - size * 2.2
    const maxX = Math.max(...xs) + size * 2.2
    const minY = Math.min(...ys) - size * 2.2
    const maxY = Math.max(...ys) + size * 2.2
    return { minX, minY, w: maxX - minX, h: maxY - minY }
  }, [hexes])

  function toggleHex(q: number, r: number) {
    const k = key(q, r)
    if (mode === 'erase') {
      if (!hexSet.has(k)) return
      const next = hexes.filter((h) => key(h.q, h.r) !== k)
      setHexes(next.length ? next : [{ q: 0, r: 0 }])
      // Remove ports that reference this hex
      setPorts((ps) => ps.filter((p) => !(p.q === q && p.r === r)))
      if (selectedHex && selectedHex.q === q && selectedHex.r === r) setSelectedHex(null)
      return
    }
    if (hexSet.has(k)) {
      setSelectedHex({ q, r })
      return
    }
    setSelectedHex(null);
    if (mode === 'select') {
      setSelectedHex({ q, r })
      return
    }
    setHexes([...hexes, { q, r }]);

  }

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return
    const loc = pt.matrixTransform(ctm.inverse())
    const ar = pixelToAxial(loc.x, loc.y, size)
    toggleHex(ar.q, ar.r)
  }

  function togglePortOnEdge(edge: 0 | 1 | 2 | 3 | 4 | 5) {
    if (!selectedHex) return
    const exists = ports.some((p) => p.q === selectedHex.q && p.r === selectedHex.r && p.edge === edge)
    if (exists) {
      // If it exists, clicking the same edge updates its kind (or removes if kind is already the same)
      setPorts((ps) =>
        ps.map((p) =>
          p.q === selectedHex.q && p.r === selectedHex.r && p.edge === edge ? { ...p, kind: portKind } : p
        )
      )
      return
    }
    setPorts([...ports, { q: selectedHex.q, r: selectedHex.r, edge, kind: portKind }])
  }

  function removePort(q: number, r: number, edge: number) {
    setPorts((ps) => ps.filter((p) => !(p.q === q && p.r === r && p.edge === edge)))
  }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      if (selectedId) {
        await jsonRequest(`/api/templates/${selectedId}`, 'PUT', { name: name.trim(), hexes, ports })
      } else {
        const data = await jsonRequest<{ templateId: string }>(`/api/templates`, 'POST', { name: name.trim(), hexes, ports })
        setSelectedId(data.templateId)
        props.onTemplateCreated?.(data.templateId)
      }
      await refresh()
    } catch (e: any) {
      setError(e?.message ?? 'Hiba mentés közben.')
    } finally {
      setBusy(false)
    }
  }

  async function del() {
    if (!selectedId) return
    setBusy(true)
    setError(null)
    try {
      await jsonRequest(`/api/templates/${selectedId}`, 'DELETE')
      setSelectedId(null)
      setName('')
      setHexes([{ q: 0, r: 0 }])
      setPorts([])
      await refresh()
    } catch (e: any) {
      setError(e?.message ?? 'Hiba törlés közben.')
    } finally {
      setBusy(false)
    }
  }

  const portLines = useMemo(() => {
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number; label: string; q: number; r: number; edge: number }> = []
    for (const p of ports) {
      const c = axialToPixel(p.q, p.r, size)
      const corners = hexCorners(c, size)
      const a = corners[p.edge]
      const b = corners[(p.edge + 1) % 6]
      const label = p.kind === 'random' ? 'Random' : p.kind === 'threeToOne' ? '3:1' : `2:1 ${p.kind}`
      lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, label, q: p.q, r: p.r, edge: p.edge })
    }
    return lines
  }, [ports])

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/20">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-100">Térképszerkesztő</h2>
          <button
            onClick={() => refresh().catch(() => { })}
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-black/25"
          >
            Frissítés
          </button>
        </div>

        <div className="mt-3 grid gap-3">
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-300">Sablon</div>
            <Select
              label={<span className="text-sm font-semibold text-slate-100">{selectedId ? templates.find((t) => t._id === selectedId)?.name ?? 'Sablon' : 'Új sablon'}</span>}
              items={[
                { label: '➕ Új sablon', onClick: () => setSelectedId(null) },
                ...templates.map((t) => ({ label: t.name, onClick: () => setSelectedId(t._id) })),
              ]}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 hover:bg-black/25"
              disabled={busy} />
            <p className="mt-1 text-xs text-slate-400">Kattintással töltsd a hexákat a rácsra. Létező hexre kattintva kiválasztod.</p>
          </div>

          <div>
            <div className="mb-1 text-xs font-semibold text-slate-300">Név</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Pl. Szigetvilág #1"
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400/50" />
          </div>

          <div className="grid gap-2 rounded-xl border border-white/10 bg-black/10 p-3">
            <div className="text-xs font-semibold text-slate-300">Hex eszköz</div>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('add')}
                className={`rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold ${mode === 'add' ? 'bg-sky-500/20 text-sky-100' : 'bg-black/20 text-slate-100 hover:bg-black/25'}`}
              >
                Hozzáadás
              </button>
              <button
                onClick={() => setMode('erase')}
                className={`rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold ${mode === 'erase' ? 'bg-sky-500/20 text-sky-100' : 'bg-black/20 text-slate-100 hover:bg-black/25'}`}
              >
                Törlés
              </button>
              <button
                onClick={() => setMode('select')}
                className={`rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold ${mode === 'select' ? 'bg-sky-500/20 text-sky-100' : 'bg-black/20 text-slate-100 hover:bg-black/25'}`}
              >
                Kiválasztás
              </button>
            </div>
            <div className="text-xs text-slate-400">Hexek: <span className="font-semibold text-slate-200">{hexes.length}</span></div>
          </div>

          <div className="grid gap-2 rounded-xl border border-white/10 bg-black/10 p-3">
            <div className="text-xs font-semibold text-slate-300">Kikötő</div>
            <div className="text-xs text-slate-400">
              Kiválasztott hex: <span className="font-mono text-slate-200">{selectedHex ? `${selectedHex.q},${selectedHex.r}` : '—'}</span>
            </div>

            <div className="grid gap-2">
              <div className="text-xs text-slate-400">
                <span className="font-semibold text-slate-200">Tipp:</span> válassz egy hexát (kattints rá), majd{" "}
                <span className="font-semibold text-slate-200">kattints a hex élére</span> a térképen a kikötő helyének
                felvételéhez / módosításához.
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xs font-semibold text-slate-300">Típus</div>
                <Select
                  label={<span className="text-sm font-semibold text-slate-100">
                    {portKind === 'random'
                      ? 'Random'
                      : portKind === 'threeToOne'
                        ? '3:1'
                        : `2:1 ${portKind}`}
                  </span>}
                  items={[
                    { label: 'Random (később generálja)', onClick: () => setPortKind('random') },
                    { label: '3:1', onClick: () => setPortKind('threeToOne') },
                    { label: '2:1 wood', onClick: () => setPortKind('wood') },
                    { label: '2:1 brick', onClick: () => setPortKind('brick') },
                    { label: '2:1 wheat', onClick: () => setPortKind('wheat') },
                    { label: '2:1 sheep', onClick: () => setPortKind('sheep') },
                    { label: '2:1 ore', onClick: () => setPortKind('ore') },
                  ]}
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 hover:bg-black/25"
                  disabled={busy} />
              </div>
            </div>

            <div className="max-h-[9rem] overflow-auto rounded-lg border border-white/10 bg-black/20 p-2 text-xs text-slate-200">
              {ports.length === 0 ? (
                <div className="text-slate-400">Nincs kikötő. (Ha üresen hagyod, a játék automatikusan generál.)</div>
              ) : (
                <div className="grid gap-1">
                  {ports.map((p) => (
                    <div key={`${p.q},${p.r},${p.edge}`} className="flex items-center justify-between gap-2">
                      <div className="font-mono">({p.q},{p.r}) e{p.edge} • {p.kind === 'threeToOne' ? '3:1' : `2:1 ${p.kind}`}</div>
                      <button
                        onClick={() => removePort(p.q, p.r, p.edge)}
                        className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-slate-100 hover:bg-black/40"
                      >
                        Törlés
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</div> : null}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={save}
            disabled={busy || name.trim().length < 2 || hexes.length < 1}
            className="rounded-xl border border-white/10 bg-sky-500/20 px-4 py-3 font-semibold text-sky-100 hover:bg-sky-500/25 disabled:opacity-50"
          >
            {selectedId ? 'Mentés' : 'Sablon létrehozása'}
          </button>
          {selectedId ? (
            <button
              onClick={del}
              disabled={busy}
              className="rounded-xl border border-white/10 bg-red-500/15 px-4 py-3 font-semibold text-red-100 hover:bg-red-500/20 disabled:opacity-50"
            >
              Törlés
            </button>
          ) : null}
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-2 shadow-xl shadow-black/20 md:p-3">
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/10">
          <svg
            ref={svgRef}
            onClick={handleSvgClick}
            viewBox={`${extents.minX} ${extents.minY} ${extents.w} ${extents.h}`}
            className="h-[60vh] w-full min-h-[420px] select-none"
          >
            <defs>
              <linearGradient id="g_ocean_editor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(2, 132, 199, .10)" />
                <stop offset="60%" stopColor="rgba(30, 58, 138, .10)" />
                <stop offset="100%" stopColor="rgba(2, 6, 23, .10)" />
              </linearGradient>
              <pattern id="p_waves_editor" width="120" height="60" patternUnits="userSpaceOnUse">
                <path d="M0 42 C 20 30, 40 30, 60 42 S 100 54, 120 42" fill="none" stroke="rgba(226,232,240,.12)" strokeWidth="2" />
              </pattern>
            </defs>

            <rect x={extents.minX} y={extents.minY} width={extents.w} height={extents.h} fill="url(#p_waves_editor)" opacity={0.85} />

            {hexes.map((h) => {
              const c = axialToPixel(h.q, h.r, size)
              const corners = hexCorners(c, size)
              const d = corners.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
              const isSelected = selectedHex && selectedHex.q === h.q && selectedHex.r === h.r
              return (
                <path
                  key={key(h.q, h.r)}
                  d={d}
                  fill={isSelected ? 'rgba(15, 54, 70, 0.76)' : 'rgba(15,23,42,.80)'}
                  stroke={isSelected ? 'rgba(56,189,248,.65)' : 'rgba(226,232,240,.12)'}
                  strokeWidth={2} />
              )
            })}
            {selectedHex ? (() => {
              const c = axialToPixel(selectedHex.q, selectedHex.r, size)
              const corners = hexCorners(c, size)
              const hasPort = (edge: number) => ports.some((p) => p.q === selectedHex.q && p.r === selectedHex.r && p.edge === edge)
              return (
                <g>
                  {Array.from({ length: 6 }).map((_, edge) => {
                    const a = corners[edge]
                    const b = corners[(edge + 1) % 6]
                    const active = hasPort(edge)
                    return (
                      <line
                        key={`edge-${edge}`}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke={active ? 'rgba(34,211,238,.95)' : 'rgba(226,232,240,.35)'}
                        strokeWidth={12}
                        strokeLinecap="round"
                        opacity={0.75}
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          togglePortOnEdge(edge as any)
                        }} />
                    )
                  })}
                  <text x={c.x} y={c.y + size * 1.05} fontSize={12} textAnchor="middle" dominantBaseline="middle" fill="rgba(226,232,240,.85)">
                    Kikötő: kattints egy élre
                  </text>
                </g>
              )
            })() : null}


            {portLines.map((l) => (
              <g key={`${l.q},${l.r},${l.edge}`}>
                <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="rgba(251,191,36,.85)" strokeWidth={5} strokeLinecap="round" />
                <text
                  x={(l.x1 + l.x2) / 2}
                  y={(l.y1 + l.y2) / 2}
                  fontSize={12}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="rgba(251,191,36,.95)"
                >
                  {l.label}
                </text>
              </g>
            ))}

            {/* Hint */}
            <text x={extents.minX + 16} y={extents.minY + 24} fontSize={12} fill="rgba(226,232,240,.7)">
              Kattintás: {mode === 'add' ? 'hex hozzáadás / kiválasztás' : 'hex törlés'} • Tipp: válts “Hozzáadás”-ra és kattints meglévő hexre a portoláshoz
            </text>
          </svg>
        </div>
      </div>
    </div>
  )
}
