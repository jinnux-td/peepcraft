// The picture: background, then the figure scaled / rotated / flipped about the centre of its window. Used on the stage and by the exports.
import { createElement, type ReactElement } from 'react'
import { Background, canvas, Peep, type Box, type PeepType } from '@kit/peeps'
import { lookup as lookupFigure } from '@kit/transhumans'
import type { CreatorState } from './types.ts'

export const SIZE = 1024

export const peepOf = (s: CreatorState, override: Partial<Record<string, string>> = {}): Peep => new Peep({ type: s.type, ink: s.ink, paper: s.paper, ...s.parts, ...override })

/** A square window on a measured outline, with air around it. */
export function squareAround(b: Box): Box {
  const side = Math.max(b.width, b.height) * 1.14
  return { x: b.x + b.width / 2 - side / 2, y: b.y + b.height / 2 - side / 2, width: side, height: side }
}

/** What the stage draws: a peep of one of three types, or a whole figure. Measured outlines are kept per key. */
export const boxKey = (s: CreatorState): string => (s.figure ? `figure:${s.figure}` : s.type)

/** Before the figure is measured: its canvas. */
export function fallbackBox(s: CreatorState | PeepType): Box {
  if (typeof s !== 'string' && s.figure) { const f = lookupFigure(s.figure); return squareAround({ x: 0, y: 0, width: f.width, height: f.height }) }
  return squareAround({ x: 0, y: 0, ...canvas[typeof s === 'string' ? s : s.type] })
}

export function sceneTransform(s: CreatorState, box: Box): string {
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2, k = s.scale
  return `translate(${cx} ${cy}) rotate(${s.rotate}) scale(${s.flip ? -k : k} ${k}) translate(${-cx} ${-cy})`
}

/** `measure` receives the group holding the figure, in its own unscaled space, to take its bounding box. */
export function Scene({ state, box, measure }: { state: CreatorState; box: Box; measure?: (el: SVGGElement | null) => void }): ReactElement {
  return createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: `${box.x} ${box.y} ${box.width} ${box.height}`, width: SIZE, height: SIZE },
    new Background(state.bg).render(box),
    createElement('g', { transform: sceneTransform(state, box) }, createElement('g', { ref: measure }, state.figure ? createElement('g', { 'data-figure': state.figure }, createElement(lookupFigure(state.figure), { ink: state.ink, paper: state.paper })) : peepOf(state).group())))
}
