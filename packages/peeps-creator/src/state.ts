// The creator's state as plain functions: choosing, history. No React, so it is tested without a browser.
import { catalogue, defaults, type Atom, type Category, type PeepType, type Slot } from '@kit/peeps'
import type { CreatorState } from './types.ts'

export const bodyCategory = (type: PeepType): Category => (type === 'bust' ? 'body' : type)
export const categoryOf = (type: PeepType, slot: Slot): Category => (slot === 'body' ? bodyCategory(type) : slot)

/** The atoms one slot can take, in the pack's order. */
export const optionsFor = (type: PeepType, slot: Slot): Atom[] => [...catalogue[categoryOf(type, slot)].values()]

/** The id used for a slot: the user's choice, else the default of the type. */
export const partId = (s: CreatorState, slot: Slot): string => s.parts[slot] ?? defaults[s.type][slot]

export const choose = (s: CreatorState, slot: Slot, id: string): CreatorState => ({ ...s, parts: { ...s.parts, [slot]: id } })

/** Body ids belong to one type (a pose is not a torso), so changing type drops the chosen body. */
export const setType = (s: CreatorState, type: PeepType): CreatorState => (type === s.type ? s : { ...s, type, parts: { ...s.parts, body: undefined } })

/** Back to building a peep (or onto a figure): a figure and the parts are two ways to fill the stage. */
export const chooseFigure = (s: CreatorState, id: string | null): CreatorState => ({ ...s, figure: id })
export const showPeep = (s: CreatorState, type: PeepType): CreatorState => ({ ...setType(s, type), figure: null })

export interface History { past: CreatorState[]; now: CreatorState; future: CreatorState[] }

const LIMIT = 50
export const startHistory = (now: CreatorState): History => ({ past: [], now, future: [] })
/** A choice the undo list remembers. */
export const commit = (h: History, next: CreatorState): History => ({ past: [...h.past.slice(-(LIMIT - 1)), h.now], now: next, future: [] })
/** A continuous change (slider, colour): replaces the current state without a step of its own. */
export const tweak = (h: History, next: CreatorState): History => ({ ...h, now: next })
export const undo = (h: History): History => (h.past.length ? { past: h.past.slice(0, -1), now: h.past[h.past.length - 1], future: [h.now, ...h.future] } : h)
export const redo = (h: History): History => (h.future.length ? { past: [...h.past, h.now], now: h.future[0], future: h.future.slice(1) } : h)
