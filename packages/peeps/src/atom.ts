// An atom is one hand-drawn part (a hairstyle, a face, ...) as a React component that draws a <g> in the part's own hi-res canvas.
import { createElement, useId, type ReactElement, type SVGProps } from 'react'

export type Category = 'accessories' | 'body' | 'face' | 'facialHair' | 'head' | 'standing' | 'sitting'

export interface AtomProps extends Omit<SVGProps<SVGGElement>, 'ref'> {
  /** Line colour (the drawing's black). */
  ink?: string
  /** Fill behind the lines (the drawing's white): skin of the hands, hat body, glasses lenses. */
  paper?: string
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

/** The meta, plus the pieces that can take their own colour (hair, a top, a tie) with the colour each comes in: `{ top: '#90a7e0' }`.
 *  A Peep draws them only when given a colour; the creator draws each in its own until one is picked. Empty for a face or an accessory. */
export type Atom = ((props: AtomProps) => ReactElement) & AtomMeta & { pieces: Readonly<Record<string, string>> }

export interface Draw {
  ink: string
  paper: string
  /** Makes a document-unique id for a mask or clip, so two copies of one atom on a page never share it. */
  ref: (id: string) => string
}

export const INK = '#000000'
export const PAPER = '#FFFFFF'

export function atom(meta: AtomMeta, draw: (c: Draw) => ReactElement[]): Atom {
  const Component = ({ ink = INK, paper = PAPER, ...rest }: AtomProps) => {
    const uid = useId().replace(/:/g, '')
    return createElement('g', rest, ...draw({ ink, paper, ref: (id) => `${uid}-${id}` }))
  }
  Component.displayName = `Peep${meta.category}.${meta.id}`
  return Object.assign(Component, meta, { pieces: {} })
}
