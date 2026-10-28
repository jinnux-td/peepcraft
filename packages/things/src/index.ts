export { ellipse, INK, leaf, LINE, PAPER, poly, rect, thing, vein, type Group, type Part, type Thing, type ThingMeta, type ThingProps } from './thing.ts'
import type { Thing } from './thing.ts'
import { chair, desk, sofa, stool, table } from './things/furniture.ts'
import { bookshelf, floorLamp, pottedPlant, rug, tallPlant } from './things/home.ts'
import { ball, balloon, books, laptop, mug, phone } from './things/small.ts'
import { cat, dog } from './things/pets.ts'
import { aura, bubble, roundBubble, thoughtBubble } from './things/extra.ts'

/** Every thing, grouped in menu order. */
export const things: readonly Thing[] = [
  chair, stool, sofa, table, desk,
  pottedPlant, tallPlant, floorLamp, bookshelf, rug,
  laptop, mug, books, phone, ball, balloon,
  cat, dog,
  bubble, roundBubble, thoughtBubble, aura,
]

export const catalogue: ReadonlyMap<string, Thing> = new Map(things.map((t) => [t.id, t]))

export function lookup(id: string): Thing {
  const found = catalogue.get(id)
  if (!found) throw new Error(`no thing "${id}"; known: ${[...catalogue.keys()].join(', ')}`)
  return found
}

/** The extras a peep can wear in the creator (the Extra tab): things with a place by the head. */
export const extras: readonly Thing[] = things.filter((t) => t.place)
