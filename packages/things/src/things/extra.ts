// Extras a peep can wear in the creator: speech bubbles now, more later (an aura). Each says where it goes by the head (`place`); in a scene
// one can also stand alone.
import { ellipse, thing } from '../thing.ts'

// Every bubble is 900 x 700 with its tail's tip at (150, 680), placed so that tip is just right of the head, at 0.7 of its size.
const BY_HEAD = { x: 620 - 150 * 0.7, y: 260 - 680 * 0.7, scale: 0.7 }
const LOOK = { group: 'extra', width: 900, height: 700, ink: '#111111', paper: '#f2f2f2', place: BY_HEAD } as const

/** A speech bubble: one outline with its tail at the bottom left, so no line crosses where they meet. */
export const bubble = thing({ id: 'bubble', label: 'Speech bubble', ...LOOK }, [
  ['M200 20H700A180 180 0 0 1 880 200V340A180 180 0 0 1 700 520H380L150 680L230 520H200A180 180 0 0 1 20 340V200A180 180 0 0 1 200 20Z'],
])

/** An oval speech bubble: the long way round the oval, then the tail. */
export const roundBubble = thing({ id: 'round-bubble', label: 'Round bubble', ...LOOK }, [
  ['M395 556A430 270 0 1 0 223 511L150 680Z'],
])

/** A thought bubble: an oval, and two dots down to the tip. */
export const thoughtBubble = thing({ id: 'thought-bubble', label: 'Thought bubble', ...LOOK }, [
  [ellipse(480, 290, 420, 260)],
  [ellipse(250, 590, 45)],
  [ellipse(160, 660, 25)],
])

/** An aura: a glow in the shape of the peep wearing it, gold lines on pale yellow. On its own, a glowing oval with rays. */
export const aura = thing({ id: 'aura', label: 'Aura', group: 'extra', width: 900, height: 1100, ink: '#f4b400', paper: '#fff3bf', place: { around: 150 } }, [
  ['M450 30V90M450 1010V1070M40 550H100M800 550H860M160 170L200 215M740 170L700 215M160 930L200 885M740 930L700 885', 'none'],
  [ellipse(450, 550, 330, 440)],
])
