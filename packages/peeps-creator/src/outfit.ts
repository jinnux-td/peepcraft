// Every item comes in its own colours, which it carries (`atom.pieces`, its layer groups in the Figma file, by packages/peeps/scripts/build-figma.ts),
// so its thumbnail and the peep wearing it agree: the hair of a head, its bandana, the top, pants and shoes of a body. A colour the person picks for a
// piece is drawn over them until another item is chosen there; choosing the item again brings its own back.
import { bodyCategory, defaults, lookup, type Category, type PartColors, type PeepType, type Slot } from '@kit/peeps'
import type { Parts } from './types.ts'

const slots: readonly Slot[] = ['body', 'head', 'face', 'facialHair', 'mask', 'accessories']

/** The atom a slot draws: "standing/walking-2", "head/bun". */
export const atomKey = (type: PeepType, slot: Slot, id: string) => `${slot === 'body' ? bodyCategory[type] : slot}/${id}`

/** The colours an item comes in, one per piece, by atom key: `itemColors('head/bun')` is `{ bandana: '#9fd8e5' }`. */
export function itemColors(key: string): Readonly<Record<string, string>> {
  const [category, id] = key.split('/') as [Category, string]
  return lookup(category, id).pieces
}

/** A slot's colours without its pieces: its lines and fill, which stay when another item is chosen. */
export function plain(c: PartColors[Slot]): PartColors[Slot] {
  const kept = Object.entries(c ?? {}).filter(([k]) => k === 'ink' || k === 'paper')
  return kept.length ? Object.fromEntries(kept) : undefined
}

/** What is drawn: each worn item's own colours, under the ones picked. The whites of a face (eyes, teeth) and of glasses stay white whatever
 *  the fill. */
export function wornColors(type: PeepType, parts: Parts, picked: PartColors = {}): PartColors {
  return Object.fromEntries(slots.map((slot) => [slot, { ...(slot === 'face' || slot === 'accessories' ? { paper: '#ffffff' } : {}), ...itemColors(atomKey(type, slot, parts[slot] ?? defaults[type][slot])), ...picked[slot] }]))
}
