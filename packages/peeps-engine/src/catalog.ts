// What a document can name, as plain data: for search in the CLI and the MCP server, and for the MCP catalog resource.
import { catalogue, defaults, slotOrder, type Category, type PeepType, type Slot } from '@kit/peeps'
import { things } from '@kit/things'
import { figures } from '@kit/transhumans'
import { LIMITS } from './doc.ts'
import { categoryOf } from './state.ts'
import { RATIOS } from './types.ts'

export interface CatalogItem {
  /** An atom category, or 'figure' or 'thing'. */
  category: Category | 'figure' | 'thing'
  id: string
  label: string
  /** The pieces that take their own colour, with the colour each comes in (partColors for a part, colors for a thing). */
  pieces: Record<string, string>
  /** A thing: its group, and whether a peep can wear it as an extra. */
  group?: string
  extra?: boolean
}

export interface Catalog {
  types: readonly PeepType[]
  /** For each type, the category each slot draws from: a pose for standing and sitting, a torso for a bust. */
  slots: Record<PeepType, Record<Slot, Category>>
  defaults: typeof defaults
  ratios: string[]
  limits: typeof LIMITS
  items: CatalogItem[]
}

const TYPES: readonly PeepType[] = ['standing', 'sitting', 'bust']

let made: Catalog | undefined
export function catalog(): Catalog {
  return (made ??= {
    types: TYPES,
    slots: Object.fromEntries(TYPES.map((t) => [t, Object.fromEntries(slotOrder.map((s) => [s, categoryOf(t, s)]))])) as Catalog['slots'],
    defaults,
    ratios: Object.keys(RATIOS),
    limits: LIMITS,
    items: [
      ...(Object.keys(catalogue) as Category[]).flatMap((category) => [...catalogue[category].values()].map((a) => ({ category, id: a.id, label: a.label, pieces: { ...a.pieces } }))),
      ...figures.map((f) => ({ category: 'figure' as const, id: f.id, label: f.label, pieces: {} })),
      ...things.map((t) => ({ category: 'thing' as const, id: t.id, label: t.label, pieces: { ...t.pieces }, group: t.group, extra: !!t.place })),
    ],
  })
}

/** Items by category (an atom category, 'figure' or 'thing'), by the type's slots, and by words in the id or label. */
export function search({ category, type, query }: { category?: string; type?: PeepType; query?: string } = {}): CatalogItem[] {
  const c = catalog(), words = (query ?? '').toLowerCase().split(/[\s-]+/).filter(Boolean)
  const allowed = type ? new Set<string>([...Object.values(c.slots[type]), 'figure', 'thing']) : undefined
  return c.items.filter((i) => (!category || i.category === category) && (!allowed || allowed.has(i.category))
    && words.every((w) => i.id.includes(w) || i.label.toLowerCase().includes(w)))
}
