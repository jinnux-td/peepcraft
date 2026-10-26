// A figure is a whole illustration as a React component that draws a <g> in its own canvas (1080 wide). The same shape as an atom of @kit/peeps,
// repeated here so this package stands alone.
import { createElement, type ReactElement, type SVGProps } from 'react'

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

export type Figure = ((props: FigureProps) => ReactElement) & FigureMeta

export const INK = '#000000'
export const PAPER = '#FFFFFF'

export function figure(meta: FigureMeta, paths: ReadonlyArray<{ d: string; paper: boolean }>): Figure {
  const Component = ({ ink = INK, paper = PAPER, ...rest }: FigureProps) =>
    createElement('g', rest, ...paths.map((p, i) => createElement('path', { key: i, d: p.d, fill: p.paper ? paper : ink })))
  Component.displayName = `Figure.${meta.id}`
  return Object.assign(Component, meta)
}
