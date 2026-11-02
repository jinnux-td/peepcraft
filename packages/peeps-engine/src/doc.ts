// The PeepCraft document: one picture as versioned JSON, the drawable part of CreatorState. The web app, the CLI and the MCP server all take
// it, check it the same way (validate), and turn it into a state (resolve) that the exports draw. Everything but `v` may be left out: the
// rest is what PeepCraft opens with (initialState), and a part left out is the default of the type.
import { catalogue, defaults, lookup, slotOrder, type PartColors, type PeepType, type Slot } from '@kit/peeps'
import { catalogue as things, extras, lookup as lookupThing } from '@kit/things'
import { catalogue as figures } from '@kit/transhumans'
import { feet } from './frame.ts'
import { LIFT, SCENE, sceneWidth } from './scene.ts'
import { categoryOf, SIZES } from './state.ts'
import { initialState, RATIOS, type CreatorState, type Parts, type Ratio, type SceneEntry } from './types.ts'

export const DOC_VERSION = 1

/** One member of a scene: a peep (the default), a whole figure, or a thing. */
export interface DocMember {
  type?: PeepType
  parts?: Parts
  figure?: string
  thing?: string
  extra?: { id: string; ink?: string; paper?: string }
  ink?: string
  paper?: string
  skin?: string
  partColors?: PartColors
  /** Colours of a thing's named parts. */
  colors?: Record<string, string>
  mono?: boolean
  flip?: boolean
  /** Centre from the left, in scene units (the scene is 4800 tall; its width follows the ratio). Left out: spread like the creator does. */
  x?: number
  /** 1 is the default size of its kind. */
  size?: number
  /** Height above the ground, in scene units. */
  lift?: number
}

export interface PeepcraftDoc {
  v: typeof DOC_VERSION
  type?: PeepType
  parts?: Parts
  figure?: string | null
  extra?: { id: string; ink?: string; paper?: string }
  ink?: string
  paper?: string
  skin?: string
  partColors?: PartColors
  mono?: boolean
  /** '#rrggbb' or 'transparent'. */
  bg?: string
  scale?: number
  rotate?: number
  flip?: boolean
  /** Not empty: the picture is this scene, not the single peep. */
  scene?: DocMember[]
  frame?: { ratio?: Ratio; zoom?: number }
}

export interface DocError { path: string; message: string; choices?: string[] }

/** What a document may hold. The ranges are the creator's sliders. */
export const LIMITS = {
  bytes: 16 * 1024,
  members: 24,
  scale: [0.5, 1.5],
  rotate: [-180, 180],
  zoom: [0.5, 2],
  size: [SIZES.min, SIZES.max],
  lift: [LIFT.min * SCENE, LIFT.max * SCENE],
} as const

const TYPES: readonly PeepType[] = ['standing', 'sitting', 'bust']
const HEX = /^#[0-9a-f]{6}$/i
const DOC_KEYS = ['v', 'type', 'parts', 'figure', 'extra', 'ink', 'paper', 'skin', 'partColors', 'mono', 'bg', 'scale', 'rotate', 'flip', 'scene', 'frame']
const MEMBER_KEYS = ['type', 'parts', 'figure', 'thing', 'extra', 'ink', 'paper', 'skin', 'partColors', 'colors', 'mono', 'flip', 'x', 'size', 'lift']

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

/** Checks a document and lists every problem, each with its path and, where there is a list to pick from, the choices. */
export function validate(input: unknown): { ok: true; doc: PeepcraftDoc } | { ok: false; errors: DocError[] } {
  const errors: DocError[] = []
  const fail = (path: string, message: string, choices?: readonly string[]) => errors.push(choices ? { path, message, choices: [...choices] } : { path, message })
  if (!isObject(input)) return { ok: false, errors: [{ path: '', message: 'a document is a JSON object' }] }
  if (input.v !== DOC_VERSION) fail('v', `the version must be ${DOC_VERSION}`)
  look(input, '', DOC_KEYS, fail)
  if (input.bg !== undefined && input.bg !== 'transparent') colour(input.bg, 'bg', fail)
  range(input.scale, 'scale', LIMITS.scale, fail)
  range(input.rotate, 'rotate', LIMITS.rotate, fail)
  if (input.frame !== undefined) {
    if (!isObject(input.frame)) fail('frame', 'the frame is an object: { ratio, zoom }')
    else {
      for (const k of Object.keys(input.frame)) if (k !== 'ratio' && k !== 'zoom') fail(`frame.${k}`, 'not a field of the frame', ['ratio', 'zoom'])
      if (input.frame.ratio !== undefined && !(typeof input.frame.ratio === 'string' && input.frame.ratio in RATIOS)) fail('frame.ratio', 'not a ratio', Object.keys(RATIOS))
      range(input.frame.zoom, 'frame.zoom', LIMITS.zoom, fail)
    }
  }
  if (input.scene !== undefined) {
    if (!Array.isArray(input.scene)) fail('scene', 'the scene is a list of members')
    else {
      if (input.scene.length > LIMITS.members) fail('scene', `at most ${LIMITS.members} members`)
      input.scene.forEach((m: unknown, i: number) => member(m, `scene[${i}]`, fail))
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true, doc: input as unknown as PeepcraftDoc }
}

type Fail = (path: string, message: string, choices?: readonly string[]) => void
const at = (base: string, key: string) => (base ? `${base}.${key}` : key)

function colour(x: unknown, path: string, fail: Fail) {
  if (typeof x !== 'string' || !HEX.test(x)) fail(path, 'a colour is "#rrggbb"')
}

function range(x: unknown, path: string, [lo, hi]: readonly [number, number], fail: Fail) {
  if (x === undefined) return
  if (typeof x !== 'number' || !Number.isFinite(x) || x < lo || x > hi) fail(path, `a number from ${lo} to ${hi}`)
}

function flag(x: unknown, path: string, fail: Fail) {
  if (x !== undefined && typeof x !== 'boolean') fail(path, 'true or false')
}

/** The fields a peep and a scene member share: type, parts, figure, extra and colours. */
function look(o: Record<string, unknown>, base: string, keys: readonly string[], fail: Fail) {
  for (const k of Object.keys(o)) if (!keys.includes(k)) fail(at(base, k), k === 'upload' ? 'uploads stay in the browser that made them' : 'not a field here', k === 'upload' ? undefined : keys)
  const type = (o.type ?? initialState.type) as PeepType
  if (o.type !== undefined && !TYPES.includes(o.type as PeepType)) fail(at(base, 'type'), 'not a type', TYPES)
  for (const c of ['ink', 'paper', 'skin'] as const) if (o[c] !== undefined) colour(o[c], at(base, c), fail)
  flag(o.mono, at(base, 'mono'), fail)
  flag(o.flip, at(base, 'flip'), fail)
  if (o.figure !== undefined && o.figure !== null && !(typeof o.figure === 'string' && figures.has(o.figure))) fail(at(base, 'figure'), 'not a figure', [...figures.keys()])
  const typeOk = TYPES.includes(type)
  const worn: Partial<Record<Slot, string>> = {}
  if (o.parts !== undefined) {
    if (!isObject(o.parts)) fail(at(base, 'parts'), 'parts is an object: { head: "afro", ... }')
    else for (const [slot, id] of Object.entries(o.parts)) {
      const path = at(base, `parts.${slot}`)
      if (!slotOrder.includes(slot as Slot)) { fail(path, 'not a slot', slotOrder); continue }
      if (!typeOk) continue
      const category = categoryOf(type, slot as Slot)
      if (typeof id !== 'string' || !catalogue[category].has(id)) fail(path, `no ${category} "${String(id)}"${slot === 'body' ? ` for the type ${type}` : ''}`, [...catalogue[category].keys()])
      else worn[slot as Slot] = id
    }
  }
  if (o.extra !== undefined) {
    const path = at(base, 'extra')
    if (!isObject(o.extra)) fail(path, 'an extra is an object: { id, ink, paper }')
    else {
      for (const k of Object.keys(o.extra)) if (!['id', 'ink', 'paper'].includes(k)) fail(`${path}.${k}`, 'not a field of an extra', ['id', 'ink', 'paper'])
      const id = o.extra.id
      if (!extras.some((t) => t.id === id)) fail(`${path}.id`, 'not an extra', extras.map((t) => t.id))
      for (const c of ['ink', 'paper'] as const) if (o.extra[c] !== undefined) colour(o.extra[c], `${path}.${c}`, fail)
    }
  }
  if (o.partColors !== undefined) {
    if (!isObject(o.partColors)) fail(at(base, 'partColors'), 'partColors is an object: { body: { top: "#1d3557" }, ... }')
    else for (const [slot, colours] of Object.entries(o.partColors)) {
      const path = at(base, `partColors.${slot}`)
      if (!slotOrder.includes(slot as Slot)) { fail(path, 'not a slot', slotOrder); continue }
      if (!isObject(colours)) { fail(path, 'an object of piece to colour: { ink, paper, top, ... }'); continue }
      // The pieces of the item worn there: known only when the type and the id are good.
      const id = worn[slot as Slot] ?? (o.parts === undefined || (isObject(o.parts) && !(slot in o.parts)) ? (typeOk ? defaults[type][slot as Slot] : undefined) : undefined)
      const pieces = id && typeOk ? ['ink', 'paper', ...Object.keys(lookup(categoryOf(type, slot as Slot), id).pieces)] : undefined
      for (const [piece, c] of Object.entries(colours)) {
        if (pieces && !pieces.includes(piece)) fail(`${path}.${piece}`, `not a piece of ${id}`, pieces)
        else colour(c, `${path}.${piece}`, fail)
      }
    }
  }
}

function member(m: unknown, base: string, fail: Fail) {
  if (!isObject(m)) return fail(base, 'a member is an object')
  look(m, base, MEMBER_KEYS, fail)
  const kinds = (['figure', 'thing'] as const).filter((k) => m[k] !== undefined && m[k] !== null)
  if (kinds.length > 1) fail(base, 'a member is a peep, a figure or a thing, not two')
  if (m.thing !== undefined) {
    if (!(typeof m.thing === 'string' && things.has(m.thing))) fail(`${base}.thing`, 'not a thing', [...things.keys()])
    else if (m.colors !== undefined) {
      if (!isObject(m.colors)) fail(`${base}.colors`, 'an object of part to colour')
      else {
        const pieces = Object.keys(lookupThing(m.thing).pieces)
        for (const [k, c] of Object.entries(m.colors)) pieces.includes(k) ? colour(c, `${base}.colors.${k}`, fail) : fail(`${base}.colors.${k}`, `not a part of ${m.thing}`, pieces)
      }
    }
  } else if (m.colors !== undefined) fail(`${base}.colors`, 'colors are for a thing; a peep takes partColors')
  if (m.x !== undefined && (typeof m.x !== 'number' || !Number.isFinite(m.x))) fail(`${base}.x`, 'a number')
  range(m.size, `${base}.size`, LIMITS.size, fail)
  range(m.lift, `${base}.lift`, LIMITS.lift, fail)
}

/** Where members without an x stand, as a share of the width (as the creator adds them). */
const SPREAD = [0.5, 0.2, 0.8, 0.35, 0.65]

/** The state a valid document draws: what is left out is PeepCraft's start (initialState) and, for a scene member, the document's own look. */
export function resolve(doc: PeepcraftDoc): CreatorState {
  const s: CreatorState = {
    ...initialState,
    type: doc.type ?? initialState.type,
    parts: { ...doc.parts },
    figure: doc.figure ?? null,
    ink: doc.ink ?? initialState.ink,
    paper: doc.paper ?? initialState.paper,
    skin: doc.skin ?? initialState.skin,
    partColors: { ...doc.partColors },
    bg: doc.bg ?? initialState.bg,
    scale: doc.scale ?? 1,
    rotate: doc.rotate ?? 0,
    flip: doc.flip ?? false,
    frame: { ratio: doc.frame?.ratio ?? '1:1', zoom: doc.frame?.zoom ?? 1 },
    scene: [],
  }
  delete s.locked
  if (doc.mono) s.mono = true
  if (doc.extra) s.extra = withColours(doc.extra)
  s.scene = (doc.scene ?? []).map((m, i) => entry(s, m, i))
  return s
}

const withColours = (x: { id: string; ink?: string; paper?: string }) => {
  const t = lookupThing(x.id)
  return { id: x.id, ink: x.ink ?? t.ink ?? '#111111', paper: x.paper ?? t.paper ?? '#ffffff' }
}

function entry(s: CreatorState, m: DocMember, i: number): SceneEntry {
  const own = m.thing ? lookupThing(m.thing) : undefined
  const e: SceneEntry = {
    type: m.type ?? s.type, parts: { ...m.parts }, figure: m.figure ?? null,
    ink: m.ink ?? own?.ink ?? s.ink, paper: m.paper ?? own?.paper ?? s.paper, flip: m.flip ?? false,
    x: m.x ?? sceneWidth(s) * SPREAD[i % SPREAD.length], size: m.size ?? 1, bottom: 0,
  }
  if (m.thing) { e.thing = m.thing; if (m.colors) e.colors = { ...m.colors } }
  else {
    if (m.partColors) e.partColors = { ...m.partColors }
    e.skin = m.skin ?? s.skin
    if (m.extra && !m.figure) e.extra = withColours(m.extra)
  }
  if (m.mono) e.mono = true
  if (m.lift !== undefined) e.lift = m.lift
  e.bottom = feet(e)
  return e
}

/** The document of a state, without what equals PeepCraft's start, so a share link stays short. Uploads cannot travel: their members are
 *  left out, and counted. */
export function fromState(s: CreatorState): { doc: PeepcraftDoc; dropped: number } {
  const doc: PeepcraftDoc = { v: DOC_VERSION }
  if (s.type !== initialState.type) doc.type = s.type
  if (Object.keys(s.parts).some((k) => s.parts[k as Slot] !== undefined)) doc.parts = clean(s.parts)
  if (s.figure) doc.figure = s.figure
  if (s.extra) doc.extra = { ...s.extra }
  if (s.ink !== initialState.ink) doc.ink = s.ink
  if (s.paper !== initialState.paper) doc.paper = s.paper
  if (s.skin && s.skin !== initialState.skin) doc.skin = s.skin
  if (Object.keys(s.partColors).length) doc.partColors = s.partColors
  if (s.mono) doc.mono = true
  if (s.bg !== initialState.bg) doc.bg = s.bg
  if (s.scale !== 1) doc.scale = s.scale
  if (s.rotate !== 0) doc.rotate = s.rotate
  if (s.flip) doc.flip = true
  if (s.frame.ratio !== '1:1' || s.frame.zoom !== 1) doc.frame = { ...s.frame }
  const kept = s.scene.filter((e) => !e.upload)
  if (kept.length) doc.scene = kept.map((e) => {
    const m: DocMember = { x: e.x, size: e.size }
    if (e.thing) { m.thing = e.thing; if (e.colors && Object.keys(e.colors).length) m.colors = e.colors as Record<string, string> }
    else if (e.figure) m.figure = e.figure
    else {
      m.type = e.type
      if (Object.keys(e.parts).length) m.parts = clean(e.parts)
      if (e.partColors && Object.keys(e.partColors).length) m.partColors = e.partColors
      if (e.skin) m.skin = e.skin
      if (e.extra) m.extra = { ...e.extra }
    }
    m.ink = e.ink; m.paper = e.paper
    if (e.flip) m.flip = true
    if (e.mono) m.mono = true
    if (e.lift) m.lift = e.lift
    return m
  })
  return { doc, dropped: s.scene.length - kept.length }
}

const clean = (p: Parts): Parts => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined))

