// Every atom by category and id, so a Peep can look a part up by name.
import type { Atom, Category } from './atom.ts'
import { atoms as accessories } from './atoms/accessories/index.ts'
import { atoms as body } from './atoms/body/index.ts'
import { atoms as face } from './atoms/face/index.ts'
import { atoms as facialHair } from './atoms/facialHair/index.ts'
import { atoms as head } from './atoms/head/index.ts'
import { atoms as mask } from './atoms/mask/index.ts'
import { atoms as sitting } from './atoms/sitting/index.ts'
import { atoms as standing } from './atoms/standing/index.ts'

const index = (list: readonly Atom[]): ReadonlyMap<string, Atom> => new Map(list.map((a) => [a.id, a]))

export const catalogue: Record<Category, ReadonlyMap<string, Atom>> = {
  accessories: index(accessories), body: index(body), face: index(face), facialHair: index(facialHair),
  head: index(head), mask: index(mask), sitting: index(sitting), standing: index(standing),
}

export function lookup(category: Category, id: string): Atom {
  const found = catalogue[category].get(id)
  if (!found) throw new Error(`no ${category} atom "${id}"; known: ${[...catalogue[category].keys()].join(', ')}`)
  return found
}
