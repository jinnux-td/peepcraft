// An atom is one drawn part (a hairstyle, a face, ...) as a React component that draws a <g> in the part's own hi-res canvas: one plain path
// per piece of the Figma symbol (its skin, top, pants, ink, ...), each in its own colour unless given another. The meta and the pieces are
// here at once (menus, colour targets); the paths load on demand, one module per atom, because they are most of the package's weight. An
// atom draws an empty <g> until its paths are in, then draws again (the same way as the figures of @kit/transhumans).
import { createElement, useSyncExternalStore, type ReactElement, type SVGProps } from 'react'

export type Category = 'accessories' | 'body' | 'face' | 'facialHair' | 'head' | 'mask' | 'standing' | 'sitting'

/** A piece of an atom, named after its layer group in Figma: 'skin', 'ink' (the lines), 'top', 'pants', 'shoes', 'jacket', 'hair', 'hat'... */
export type Role = string

export interface AtomProps extends Omit<SVGProps<SVGGElement>, 'ref'> {
  /** Colour of the lines, the piece 'ink'. */
  ink?: string
  /** Colour of the pieces that come in white (shoes, the whites of the eyes, a lens), and of everything but the lines in `mono`. */
  paper?: string
  /** A colour per piece, over its own: `{ skin: '#8d5524', top: '#e63946' }`. */
  colors?: Partial<Record<Role, string>>
  /** Black and white: the lines in `ink`, every other piece in `paper`, whatever its colour. */
  mono?: boolean
}

export interface AtomMeta {
  category: Category
  /** Kebab-case key, unique inside its category ("long-curly", "none"). */
  id: string
  /** The source file's name ("Long Curly"), for menus. A function's own `name` is read-only, hence not `name`. */
  label: string
  /** Size of the part's own canvas, in the hi-res units shared by every atom. */
  width: number
  height: number
}

/** One path of an atom: the piece it belongs to, the colour it comes in, and, for a line drawn as a stroke, its width. */
export interface Shape { piece: Role; fill: string; d: string; stroke?: number }

/** The meta, the pieces that can take their own colour (hair, a top, a hat) with the colour each comes in: `{ top: '#90a7e0' }` (the skin and
 *  the lines are not among them, nor the pieces of a face or accessory, which take its paper), and the shapes once loaded. */
export type Atom = ((props: AtomProps) => ReactElement) & AtomMeta & {
  pieces: Readonly<Record<Role, string>>
  /** The paths: empty until load() has resolved. */
  readonly shapes: readonly Shape[]
  /** Fetches the paths once (later calls share it); a drawn atom calls it itself. Await it (or pending()) before rendering to a string. */
  load: () => Promise<readonly Shape[]>
}

export const INK = '#000000'
export const PAPER = '#FFFFFF'

/** The colour a shape is drawn in. */
export function fillOf(s: Shape, { ink = INK, paper = PAPER, colors, mono }: Pick<AtomProps, 'ink' | 'paper' | 'colors' | 'mono'>): string {
  if (s.piece === 'ink') return colors?.ink ?? ink
  if (mono) return paper
  return colors?.[s.piece] ?? (s.fill === '#ffffff' ? paper : s.fill)
}

// Every load under way, so a host can wait for what is on screen before exporting it (pending()).
const inflight = new Set<Promise<unknown>>()
/** Resolves when every atom asked for so far has its paths (a failed one is skipped; drawing it again retries). */
export async function pending(): Promise<void> {
  while (inflight.size) await Promise.allSettled([...inflight])
}

const NONE: readonly Shape[] = []

export function atom(meta: AtomMeta, pieces: Record<Role, string>, source: () => Promise<{ shapes: readonly Shape[] }>): Atom {
  let loading: Promise<readonly Shape[]> | undefined
  const listeners = new Set<() => void>()
  // A failed fetch is forgotten, so the next draw tries again.
  const load = () => {
    if (loading) return loading
    const p = source().then((m) => { self.shapes = m.shapes; listeners.forEach((l) => l()); return m.shapes }, (e) => { loading = undefined; throw e })
    const done = p.finally(() => inflight.delete(done)).catch(() => {})
    inflight.add(done)
    return (loading = p)
  }
  const subscribe = (l: () => void) => { listeners.add(l); load().catch(console.error); return () => { listeners.delete(l) } }
  const current = () => self.shapes
  const Component = ({ ink, paper, colors, mono, ...rest }: AtomProps) =>
    createElement('g', rest, ...useSyncExternalStore(subscribe, current, current).map((s, i) => {
      const fill = fillOf(s, { ink, paper, colors, mono })
      return createElement('path', s.stroke ? { key: i, d: s.d, fill: 'none', stroke: fill, strokeWidth: s.stroke, 'data-piece': s.piece } : { key: i, d: s.d, fill, fillRule: 'evenodd', 'data-piece': s.piece })
    }))
  Component.displayName = `Peep${meta.category}.${meta.id}`
  const self = Object.assign(Component, meta, { pieces, load, shapes: NONE })
  return self
}
