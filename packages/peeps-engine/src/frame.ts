// The window on a picture. The creator used to measure the drawn outline in the DOM (getBBox) once per type, figure and type with an extra;
// Node and Workers have no DOM, so the outlines are measured once at build time (boxes.ts) and every host frames from the same numbers.
import type { Box, PeepType } from '@kit/peeps'
import { extras } from '@kit/things'
import { figures } from '@kit/transhumans'
import { boxes } from './boxes.ts'
import { boxKey, drawn, fallbackBox, squareAround, type Look } from './scene.ts'
import type { CreatorState } from './types.ts'

type Framed = Pick<CreatorState, 'type' | 'figure' | 'extra'>

/** Every look the creator frames on its own: each type, each type with each extra, each figure. */
export function boxKeys(): Framed[] {
  const types: PeepType[] = ['standing', 'sitting', 'bust']
  return [
    ...types.map((type) => ({ type, figure: null })),
    ...types.flatMap((type) => extras.map((t) => ({ type, figure: null, extra: { id: t.id, ink: t.ink ?? '#111111', paper: t.paper ?? '#ffffff' } }))),
    ...figures.map((f) => ({ type: 'standing' as PeepType, figure: f.id })),
  ]
}

/** The measured outline of a look, in its own canvas; undefined for a thing or an upload, which are framed by their canvas. */
export const outline = (s: Framed): Box | undefined => boxes[boxKey(s)]

/** The square window the single picture is drawn in: the measured outline with air around it, or the canvas when there is none. */
export function pictureBox(s: Framed): Box {
  const b = outline(s)
  return b ? squareAround(b) : fallbackBox(s)
}

/** Where a scene member's feet are in its own canvas: the bottom of its outline, or of its canvas for a thing or an upload. */
export function feet(e: Framed & Look): number {
  const b = e.thing || e.upload ? undefined : outline(e)
  return b ? b.y + b.height : drawn(e).height
}
