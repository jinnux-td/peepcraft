// Where each part sits. Numbers come from the "a person/{bust,sitting,standing}.svg" files of the Open Peeps pack, in the atoms' shared hi-res
// units; test/templates.test.ts re-derives them from the 302 ready-made templates when the pack is at hand.
import type { Category } from './atom.ts'

export type PeepType = 'standing' | 'sitting' | 'bust'
export type Slot = 'body' | 'head' | 'face' | 'facialHair' | 'accessories'
export interface Point { x: number; y: number }

/** Which atom category fills the body slot of each type. */
export const bodyCategory: Record<PeepType, Category> = { standing: 'standing', sitting: 'sitting', bust: 'body' }

/** Draw order, back to front. */
export const slotOrder: readonly Slot[] = ['body', 'head', 'face', 'facialHair', 'accessories']

/** Origin of the body and of the head, per type. */
export const origins: Record<PeepType, { body: Point; head: Point }> = {
  standing: { body: { x: -121, y: 634 }, head: { x: 404, y: 180 } },
  sitting: { body: { x: -81, y: 637 }, head: { x: 345, y: 180 } },
  bust: { body: { x: 147, y: 639 }, head: { x: 372, y: 180 } },
}

/** Origin of the face parts, relative to the head origin; the same for every type. */
export const onHead: Record<'face' | 'facialHair' | 'accessories', Point> = {
  face: { x: 159, y: 186 },
  facialHair: { x: 123, y: 338 },
  accessories: { x: 47, y: 241 },
}

/** The canvas of the full figure in "a person/*.svg": everything of a peep fits inside it. */
export const canvas: Record<PeepType, { width: number; height: number }> = {
  standing: { width: 1179, height: 3291 },
  sitting: { width: 1647, height: 2500 },
  bust: { width: 1136, height: 1533 },
}
