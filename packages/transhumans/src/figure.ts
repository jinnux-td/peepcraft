// A figure is a whole illustration as a React component that draws a <g> in its own canvas (1080 wide). The same shape as an atom of @kit/peeps,
// repeated here so this package stands alone. Its paths load on demand (they are most of the package's weight): an empty <g> until then.
import { createElement, useSyncExternalStore, type ReactElement, type SVGProps } from 'react'

export interface FigureProps extends Omit<SVGProps<SVGGElement>, 'ref'> {
  /** Line colour (the drawing's black). */
  ink?: string
  /** Fill (the drawing's white): shirts, faces, helmets. */
  paper?: string
}

export interface FigureMeta {
  /** Kebab-case key ("walking-contradiction"). */
  id: string
  /** The source file's name ("Walking Contradiction"), for menus. */
  label: string
  width: number
  height: number
}

export type Paths = ReadonlyArray<{ d: string; paper: boolean }>

export type Figure = ((props: FigureProps) => ReactElement) & FigureMeta & {
  /** Fetches the paths once (later calls share it); a drawn figure calls it itself. Await it before rendering to a string. */
  load: () => Promise<Paths>
}

export const INK = '#000000'
export const PAPER = '#FFFFFF'

export function figure(meta: FigureMeta, source: () => Promise<{ paths: Paths }>): Figure {
  let paths: Paths | null = null, loading: Promise<Paths> | undefined
  const listeners = new Set<() => void>()
  // A failed fetch is forgotten, so the next draw tries again.
  const load = () => (loading ??= source().then((m) => { paths = m.paths; listeners.forEach((l) => l()); return m.paths }, (e) => { loading = undefined; throw e }))
  const subscribe = (l: () => void) => { listeners.add(l); load().catch(console.error); return () => { listeners.delete(l) } }
  const current = () => paths
  const Component = ({ ink = INK, paper = PAPER, ...rest }: FigureProps) =>
    createElement('g', rest, ...(useSyncExternalStore(subscribe, current, current) ?? []).map((p, i) => createElement('path', { key: i, d: p.d, fill: p.paper ? paper : ink })))
  Component.displayName = `Figure.${meta.id}`
  return Object.assign(Component, meta, { load })
}
