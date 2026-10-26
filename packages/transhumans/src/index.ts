export { figure, INK, PAPER, type Figure, type FigureMeta, type FigureProps } from './figure.ts'
export { figures } from './figures/index.ts'
import { figures } from './figures/index.ts'
import type { Figure } from './figure.ts'

/** Every figure by id. */
export const catalogue: ReadonlyMap<string, Figure> = new Map(figures.map((f) => [f.id, f]))

export function lookup(id: string): Figure {
  const found = catalogue.get(id)
  if (!found) throw new Error(`no figure "${id}"; known: ${[...catalogue.keys()].join(', ')}`)
  return found
}
