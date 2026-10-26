import { origins, type Box, type Slot } from '@kit/peeps'
import type { Figure } from '@kit/transhumans'
import { fallbackBox, peepOf, squareAround } from '../scene.ts'
import type { CreatorState } from '../types.ts'

/** Measured outlines, by `boxKey`: a peep type or a figure. */
export type Boxes = Partial<Record<string, Box>>

/** A small picture of one choice on the current figure: the whole figure for a body, the head for the rest, with only that slot swapped. */
export function Thumb({ state, slot, id, boxes }: { state: CreatorState; slot: Slot; id: string; boxes: Boxes }) {
  const peep = peepOf(state, { [slot]: id })
  const head = origins[state.type].head
  // Hairstyles reach above the head's own canvas, so the head crop starts higher than the head.
  const box: Box = slot === 'body'
    ? (boxes[state.type] ? squareAround(boxes[state.type]!) : fallbackBox(state.type))
    : { x: head.x - 40, y: head.y - 150, width: 553, height: 750 }
  const placed = peep.layout().filter((p) => slot === 'body' || p.slot !== 'body')
  return (
    <svg viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`} aria-hidden="true" style={state.bg === 'transparent' ? undefined : { background: state.bg }}>
      {placed.map(({ slot: sl, atom: A, at }) => <g key={sl} transform={`translate(${at.x} ${at.y})`}><A ink={state.ink} paper={state.paper} /></g>)}
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
