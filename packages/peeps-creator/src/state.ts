// The creator's state as plain functions: choosing, history. No React, so it is tested without a browser.
import { catalogue, defaults, type Atom, type Box, type Category, type PeepType, type Slot } from '@kit/peeps'
import { drawn, GROUND, LIFT, SCENE, sceneWidth } from './scene.ts'
import { plain } from './outfit.ts'
import { RATIOS, type CreatorState, type Lockable, type Ratio, type SceneEntry } from './types.ts'

export const bodyCategory = (type: PeepType): Category => (type === 'bust' ? 'body' : type)
export const categoryOf = (type: PeepType, slot: Slot): Category => (slot === 'body' ? bodyCategory(type) : slot)

/** The atoms one slot can take, in the pack's order. */
export const optionsFor = (type: PeepType, slot: Slot): Atom[] => [...catalogue[categoryOf(type, slot)].values()]

/** The id used for a slot: the user's choice, else the default of the type. */
export const partId = (s: CreatorState, slot: Slot): string => s.parts[slot] ?? defaults[s.type][slot]

/** Another item in a slot comes in its own colours: the pieces picked for the last one go, its lines and fill stay. */
export function choose(s: CreatorState, slot: Slot, id: string | undefined): CreatorState {
  const { [slot]: was, ...rest } = s.partColors, kept = plain(was)
  return { ...s, parts: { ...s.parts, [slot]: id }, partColors: kept ? { ...rest, [slot]: kept } : rest }
}

/** Locks or unlocks the background or a part against "Shuffle all". */
export const toggleLock = (s: CreatorState, what: Lockable): CreatorState =>
  ({ ...s, locked: s.locked?.includes(what) ? s.locked.filter((x) => x !== what) : [...(s.locked ?? []), what] })

/** Body ids belong to one type (a pose is not a torso), so changing type drops the chosen body. */
export const setType = (s: CreatorState, type: PeepType): CreatorState => (type === s.type ? s : { ...choose(s, 'body', undefined), type })

/** Back to building a peep (or onto a figure): a figure and the parts are two ways to fill the stage. */
export const chooseFigure = (s: CreatorState, id: string | null): CreatorState => ({ ...s, figure: id })
export const showPeep = (s: CreatorState, type: PeepType): CreatorState => ({ ...setType(s, type), figure: null })

/** Where new members stand, as a share of the width, so a second one does not hide behind the first. */
const SPREAD = [0.5, 0.2, 0.8, 0.35, 0.65]

/** Copies the current peep or figure into the scene, or adds a thing or an upload in the current colours. `outline` is the measured outline
 *  of the peep or figure; without one the feet are the bottom of the canvas. */
export function addToScene(s: CreatorState, outline?: Box, what: Pick<SceneEntry, 'thing' | 'upload'> = {}): CreatorState {
  const other = !!(what.thing || what.upload)
  const look = { type: s.type, parts: s.parts, figure: other ? null : s.figure, ink: s.ink, paper: s.paper, partColors: s.partColors, skin: s.skin, ...(s.mono ? { mono: true } : {}), ...what }
  const bottom = outline && !other ? outline.y + outline.height : drawn(look).height
  const entry: SceneEntry = { ...look, flip: other ? false : s.flip, x: sceneWidth(s) * SPREAD[s.scene.length % SPREAD.length], size: 1, bottom }
  return { ...s, scene: [...s.scene, entry] }
}

/** Members drawn from an upload go when the upload is deleted. */
export const dropUpload = (s: CreatorState, id: string): CreatorState => ({ ...s, scene: s.scene.filter((e) => e.upload?.id !== id) })

export const updateEntry = (s: CreatorState, i: number, patch: Partial<Pick<SceneEntry, 'x' | 'size' | 'flip' | 'lift' | 'ink' | 'paper' | 'colors' | 'partColors' | 'skin'>>): CreatorState =>
  ({ ...s, scene: s.scene.map((e, j) => (j === i ? { ...e, ...patch } : e)) })

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** A member dragged by (dx, dy) scene units from where it started: across moves x, up and down moves lift; both stay in range. */
export const dragEntry = (s: CreatorState, i: number, from: { x: number; lift: number }, dx: number, dy: number): CreatorState =>
  updateEntry(s, i, { x: clamp(from.x + dx, 0, sceneWidth(s)), lift: clamp(from.lift - dy, LIFT.min * SCENE, LIFT.max * SCENE) })

export const SIZES = { min: 0.2, max: 2 }

/** Resizing from the bottom-right handle: the size follows the pointer, (dx, dy) scene units from where the drag started, and the top-left
 *  corner stays where it was. */
export function resizeEntry(s: CreatorState, i: number, from: { x: number; lift: number; size: number }, dx: number, dy: number): CreatorState {
  const e = s.scene[i], { width, height, base } = drawn(e), k0 = base * from.size
  const left = from.x - (width * k0) / 2, top = GROUND - e.bottom * k0 - from.lift
  // The larger stretch wins, so a drag along either edge resizes.
  const grow = Math.max((width * k0 + dx) / (width * k0), (height * k0 + dy) / (height * k0))
  const size = clamp(from.size * grow, SIZES.min, SIZES.max), k = base * size
  return updateEntry(s, i, { size, x: left + (width * k) / 2, lift: clamp(GROUND - e.bottom * k - top, LIFT.min * SCENE, LIFT.max * SCENE) })
}

/** Another shape for the scene: members keep their place as a share of the width. */
export function setRatio(s: CreatorState, ratio: Ratio): CreatorState {
  const k = RATIOS[ratio] / RATIOS[s.frame.ratio]
  return { ...s, frame: { ...s.frame, ratio }, scene: s.scene.map((e) => ({ ...e, x: e.x * k })) }
}

export const removeEntry = (s: CreatorState, i: number): CreatorState => ({ ...s, scene: s.scene.filter((_, j) => j !== i) })

/** One step to the front (+1, drawn later) or the back (-1); at either end nothing changes. */
export function moveEntry(s: CreatorState, i: number, by: 1 | -1): CreatorState {
  const j = i + by
  if (j < 0 || j >= s.scene.length) return s
  const scene = [...s.scene];
  [scene[i], scene[j]] = [scene[j], scene[i]]
  return { ...s, scene }
}

const parts = (pc: CreatorState['partColors'] = {}) => Object.values(pc).flatMap((c) => Object.values(c ?? {}))

/** Every colour the picture uses, for "In this design": background, the builder's colours, and each scene member's. */
export const designColors = (s: CreatorState): string[] =>
  [...new Set([s.bg, s.ink, s.paper, s.skin, ...parts(s.partColors), ...s.scene.flatMap((e) => [e.ink, e.paper, e.skin, ...Object.values(e.colors ?? {}), ...parts(e.partColors)])]
    .filter((c): c is string => !!c && c.toLowerCase() !== 'transparent').map((c) => c.toLowerCase()))]

/** A typed colour as #rrggbb: a hex ("#0cf", "00c4cc") here, a name ("blue") with `named`, the browser's own parser. Null when it is not one. */
export function toHex(text: string, named?: (t: string) => string | null): string | null {
  const t = text.trim().toLowerCase()
  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/.exec(t)?.[1]
  if (hex) return `#${hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex}`
  return t && named ? named(t) : null
}

export interface History { past: CreatorState[]; now: CreatorState; future: CreatorState[] }

const LIMIT = 50
export const startHistory = (now: CreatorState): History => ({ past: [], now, future: [] })
/** A choice the undo list remembers. */
export const commit = (h: History, next: CreatorState): History => ({ past: [...h.past.slice(-(LIMIT - 1)), h.now], now: next, future: [] })
/** A continuous change (slider, colour): replaces the current state without a step of its own. */
export const tweak = (h: History, next: CreatorState): History => ({ ...h, now: next })
export const undo = (h: History): History => (h.past.length ? { past: h.past.slice(0, -1), now: h.past[h.past.length - 1], future: [h.now, ...h.future] } : h)
export const redo = (h: History): History => (h.future.length ? { past: [...h.past, h.now], now: h.future[0], future: h.future.slice(1) } : h)
