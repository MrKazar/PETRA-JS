import type { AppData, PlannedSet, Program, ProgramExercise } from '../data/types'
import type { Finisher, FinisherItem } from '../data/finishers'
import { finishersOf } from '../data/finishers'
import { CATALOG } from '../data/catalog'
import { uid } from './util'

/**
 * Partage par QR code : une séance (programme), le planning de la semaine, les semaines A/B (avec leurs
 * séances) ou un finisher. Le contenu est réduit (sans identifiants), compressé puis encodé en texte
 * « PETRA1:… », que le QR code transporte et que le scanner de l'appli relit.
 */
export const SHARE_PREFIX = 'PETRA1:'
/** Au-delà, le QR code devient trop dense pour être lu par un téléphone. */
export const MAX_QR_CHARS = 2300

type PlainSet = Partial<PlannedSet>
type PlainExercise = { c?: string; n?: string; g?: string; pc?: 1; pdc?: 1; l?: number; r: number; s: PlainSet[]; no?: string; ss?: 1 }
type PlainProgram = { n: string; no?: string; e: PlainExercise[] }
type PlainFinisher = { t: Finisher['type']; n: string; i: FinisherItem[] }
/** Planning : 7 cases (lundi → dimanche), numéro de séance dans `p` ou -1 pour repos. */
type Week = number[]

export type SharePayload =
  | { k: 'programme'; p: PlainProgram[] }
  | { k: 'semaine'; p: PlainProgram[]; a: Week }
  | { k: 'ab'; p: PlainProgram[]; a: Week; b: Week }
  | { k: 'finisher'; f: PlainFinisher }

const catalogName = (id?: string) => (id ? CATALOG.find((c) => c.id === id) : undefined)

function plainSet(s: PlannedSet): PlainSet {
  const out: PlainSet = { phase: s.phase }
  for (const k of ['reps', 'weight', 'durationSec', 'unit', 'pct', 'restSec'] as const) if (s[k] != null) (out as Record<string, unknown>)[k] = s[k]
  if (s.toFailure) out.toFailure = true
  return out
}

function plainExercise(e: ProgramExercise): PlainExercise {
  const cat = catalogName(e.catalogId)
  const out: PlainExercise = { r: e.restSec, s: e.sets.map(plainSet) }
  if (e.catalogId) out.c = e.catalogId
  // Nom et groupe repris du catalogue s'ils n'ont pas été modifiés.
  if (!cat || cat.nom !== e.name) out.n = e.name
  if (!cat || cat.groupe_musculaire !== e.group) out.g = e.group
  if (e.parCote) out.pc = 1
  if (e.usesLoad === false) out.pdc = 1
  if (e.workLoad != null) out.l = e.workLoad
  if (e.note) out.no = e.note
  if (e.linkNext) out.ss = 1
  return out
}

const plainProgram = (p: Program): PlainProgram => ({ n: p.name, ...(p.notes ? { no: p.notes } : {}), e: p.exercises.map(plainExercise) })

function toExercise(x: PlainExercise): ProgramExercise {
  const cat = catalogName(x.c)
  return {
    id: uid(),
    ...(x.c ? { catalogId: x.c } : {}),
    name: x.n ?? cat?.nom ?? 'Exercice',
    group: x.g ?? cat?.groupe_musculaire ?? 'autre',
    parCote: x.pc === 1,
    ...(x.pdc ? { usesLoad: false } : {}),
    ...(x.l != null ? { workLoad: x.l } : {}),
    restSec: x.r ?? 90,
    sets: (x.s ?? []).map((s) => ({ ...s, phase: s.phase ?? 'travail' }) as PlannedSet),
    ...(x.no ? { note: x.no } : {}),
    ...(x.ss ? { linkNext: true } : {}),
  }
}

const toProgram = (p: PlainProgram): Program => ({ id: uid(), name: p.n, ...(p.no ? { notes: p.no } : {}), exercises: (p.e ?? []).map(toExercise), createdAt: Date.now() })

/** Séances utilisées par un planning, et le planning réécrit avec leur numéro. */
function weekOf(plans: Record<number, string | undefined>[], programs: Program[]): { p: PlainProgram[]; weeks: Week[] } {
  const used: string[] = []
  const weeks = plans.map((plan) =>
    Array.from({ length: 7 }, (_, d) => {
      const id = plan[d]
      if (!id || !programs.some((x) => x.id === id)) return -1
      if (!used.includes(id)) used.push(id)
      return used.indexOf(id)
    }),
  )
  return { p: used.map((id) => plainProgram(programs.find((x) => x.id === id)!)), weeks }
}

export const shareProgram = (p: Program): SharePayload => ({ k: 'programme', p: [plainProgram(p)] })
export const shareFinisher = (f: Finisher): SharePayload => ({ k: 'finisher', f: { t: f.type, n: f.name, i: f.items } })
export function shareWeek(d: Pick<AppData, 'weekPlan' | 'programs'>): SharePayload {
  const { p, weeks } = weekOf([d.weekPlan], d.programs)
  return { k: 'semaine', p, a: weeks[0] }
}
export function shareWeeksAB(d: Pick<AppData, 'weekPlan' | 'weekPlanB' | 'programs'>): SharePayload {
  const { p, weeks } = weekOf([d.weekPlan, d.weekPlanB], d.programs)
  return { k: 'ab', p, a: weeks[0], b: weeks[1] }
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(out).arrayBuffer())
}
const toB64 = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
function fromB64(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

/** Texte à mettre dans le QR code. */
export async function encodeShare(p: SharePayload): Promise<string> {
  const packed = await pipe(new TextEncoder().encode(JSON.stringify(p)), new CompressionStream('deflate-raw'))
  return SHARE_PREFIX + toB64(packed)
}

/** Relit un QR code PETRA ; lève une erreur si ce n'en est pas un. */
export async function decodeShare(text: string): Promise<SharePayload> {
  const t = text.trim()
  if (!t.startsWith(SHARE_PREFIX)) throw new Error('Ce QR code ne vient pas de PETRA')
  const raw = await pipe(fromB64(t.slice(SHARE_PREFIX.length)), new DecompressionStream('deflate-raw'))
  const p = JSON.parse(new TextDecoder().decode(raw)) as SharePayload
  if (!p || !['programme', 'semaine', 'ab', 'finisher'].includes(p.k)) throw new Error('QR code PETRA illisible')
  return p
}

/** Résumé affiché avant l'import. */
export function describeShare(p: SharePayload): { title: string; lines: string[] } {
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
  const week = (w: Week, progs: PlainProgram[]) => w.map((i, d) => `${days[d]} : ${i >= 0 ? progs[i]?.n ?? '?' : 'repos'}`).join(' · ')
  const count = (x: PlainProgram) => `${x.n} (${x.e.length} exercice${x.e.length > 1 ? 's' : ''})`
  switch (p.k) {
    case 'programme':
      return { title: `Séance « ${p.p[0].n} »`, lines: p.p[0].e.map((e) => e.n ?? catalogName(e.c)?.nom ?? 'Exercice') }
    case 'semaine':
      return { title: 'Planning de la semaine', lines: [week(p.a, p.p), ...p.p.map(count)] }
    case 'ab':
      return { title: 'Planning semaines A / B', lines: [`A · ${week(p.a, p.p)}`, `B · ${week(p.b, p.p)}`, ...p.p.map(count)] }
    case 'finisher':
      return { title: `Finisher « ${p.f.n} »`, lines: p.f.i.map((i) => i.name) }
  }
}

/** Nom libre : ajoute « (importé) » si un programme porte déjà ce nom. */
const freeName = (name: string, taken: string[]) => (taken.includes(name) ? `${name} (importé)` : name)

/** Applique l'import aux données ; renvoie les nouvelles données et un message. */
export function applyShare(d: AppData, p: SharePayload): { data: AppData; message: string } {
  if (p.k === 'finisher') {
    const f: Finisher = { id: uid(), type: p.f.t, name: p.f.n, items: p.f.i }
    return { data: { ...d, finishers: [...finishersOf(d), f] }, message: `Finisher « ${f.name} » ajouté` }
  }
  const taken = d.programs.map((x) => x.name)
  const programs = p.p.map((x) => ({ ...toProgram(x), name: freeName(x.n, taken) }))
  const next = { ...d, programs: [...d.programs, ...programs] }
  const plan = (w: Week) => Object.fromEntries(w.map((i, day) => [day, i >= 0 ? programs[i]?.id : undefined]))
  if (p.k === 'programme') return { data: next, message: `Séance « ${programs[0].name} » ajoutée` }
  if (p.k === 'semaine') return { data: { ...next, weekPlan: plan(p.a), settings: { ...d.settings, abWeeks: false } }, message: `Planning importé avec ${programs.length} séance${programs.length > 1 ? 's' : ''}` }
  return { data: { ...next, weekPlan: plan(p.a), weekPlanB: plan(p.b), settings: { ...d.settings, abWeeks: true } }, message: `Semaines A / B importées avec ${programs.length} séance${programs.length > 1 ? 's' : ''}` }
}
