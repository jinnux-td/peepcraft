// Dice. One per tab changes that slot only; the toolbar one changes every part.
import type { Slot } from '@kit/peeps'
import { optionsFor, partId, setType } from './state.ts'
import { swatches, type CreatorState } from './types.ts'

export type Rng = () => number
export type Target = 'all' | 'type' | Slot

const types = ['standing', 'sitting', 'bust'] as const
export const slots: readonly Slot[] = ['body', 'head', 'face', 'facialHair', 'accessories']

/** A random item that is not `current` (when there is another), so a press is always seen. */
function other<T>(list: readonly T[], current: T, rng: Rng): T {
  const rest = list.filter((x) => x !== current)
  const from = rest.length ? rest : list
  return from[Math.min(from.length - 1, Math.floor(rng() * from.length))]
}

export function randomize(s: CreatorState, target: Target, rng: Rng = Math.random): CreatorState {
  if (target === 'type') return setType(s, other(types, s.type, rng))
  if (target !== 'all') return { ...s, parts: { ...s.parts, [target]: other(optionsFor(s.type, target).map((a) => a.id), partId(s, target), rng) } }
  const parts = Object.fromEntries(slots.map((slot) => [slot, other(optionsFor(s.type, slot).map((a) => a.id), partId(s, slot), rng)]))
  // A transparent background is a decision, not a colour to shuffle.
  return { ...s, parts, bg: s.bg === 'transparent' ? s.bg : other(swatches.bg, s.bg, rng) }
}
