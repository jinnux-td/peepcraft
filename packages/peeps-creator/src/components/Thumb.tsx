import { createElement } from 'react'
import { origins, Peep, type Box, type Slot } from '@kit/peeps'
import type { Figure } from '@kit/transhumans'
import { drawn, fallbackBox, peepOf, squareAround, type Look } from '../scene.ts'
import type { CreatorState } from '../types.ts'

/** Measured outlines, by `boxKey`: a peep type or a figure. */
export type Boxes = Partial<Record<string, Box>>

/** A small picture of one choice: `alone`, the item by itself, so choices are told apart; else on the current figure, the whole figure for a
 *  body and the head for the rest, with only that slot swapped. */
export function Thumb({ state, slot, id, boxes, alone = false }: { state: CreatorState; slot: Slot; id: string; boxes: Boxes; alone?: boolean }) {
  const peep = peepOf(state, { [slot]: id })
  const head = origins[state.type].head
  const own = peep.layout().find((p) => p.slot === slot)!
  // Hairstyles reach above the head's own canvas, so the head crop starts higher than the head.
  const box: Box = alone && slot !== 'head' ? squareAround({ x: own.at.x, y: own.at.y, width: own.atom.width, height: own.atom.height })
    : slot === 'body' ? (boxes[state.type] ? squareAround(boxes[state.type]!) : fallbackBox(state.type))
    : { x: head.x - 40, y: head.y - 150, width: 553, height: 750 }
  const placed = alone ? [own] : peep.layout().filter((p) => slot === 'body' || p.slot !== 'body')
  return (
    <svg viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`} aria-hidden="true" style={state.bg === 'transparent' ? undefined : { background: state.bg }}>
      {placed.map((p) => peep.part(p))}
    </svg>
  )
}

/** A whole figure, on its own canvas, on the current background. */
export function FigureThumb({ state, figure: F }: { state: CreatorState; figure: Figure }) {
  return (
    <svg viewBox={`0 0 ${F.width} ${F.height}`} aria-hidden="true" style={state.bg === 'transparent' ? undefined : { background: state.bg }}>
      <F ink={state.ink} paper={state.paper} />
    </svg>
  )
}

/** A whole peep, figure, thing or upload, as the scene keeps it, on its canvas. */
export function LookThumb({ look, bg }: { look: Look & { flip?: boolean }; bg: string }) {
  const { item, width, height } = drawn(look)
  const box = squareAround({ x: 0, y: 0, width, height })
  return (
    <svg viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`} aria-hidden="true" style={bg === 'transparent' ? undefined : { background: bg }}>
      <g transform={look.flip ? `translate(${width} 0) scale(-1 1)` : undefined}>{item instanceof Peep ? item.group() : createElement(item, { ink: look.ink, paper: look.paper })}</g>
    </svg>
  )
}
