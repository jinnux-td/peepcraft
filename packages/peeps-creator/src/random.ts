// Dice. One per tab changes that slot only; the toolbar one changes every part.
import type { Slot } from '@kit/peeps'
import { figures } from '@kit/transhumans'
import { extras } from '@kit/things'
import { choose, chooseExtra, optionsFor, partId, showPeep } from './state.ts'
import { swatches, type CreatorState } from './types.ts'

export type Rng = () => number
export type Target = 'all' | 'type' | 'figures' | 'extra' | Slot

const types = ['standing', 'sitting', 'bust'] as const
/** What Shuffle all rolls: not the mask, which is a choice to make, not chance. */
export const slots: readonly Slot[] = ['body', 'head', 'face', 'facialHair', 'accessories']

/** The items a dice picks from: the faces drawn to wear under a mask (eyes only) only when one is worn. */
const ids = (s: CreatorState, slot: Slot) =>
  optionsFor(s.type, slot).map((a) => a.id).filter((id) => slot !== 'face' || !id.startsWith('masked-') || partId(s, 'mask') !== 'none')

/** A random item that is not `current` (when there is another), so a press is always seen. */
function other<T>(list: readonly T[], current: T | null, rng: Rng): T {
  const rest = list.filter((x) => x !== current)
  const from = rest.length ? rest : list
  return from[Math.min(from.length - 1, Math.floor(rng() * from.length))]
}

export function randomize(s: CreatorState, target: Target, rng: Rng = Math.random): CreatorState {
  if (target === 'figures') return { ...s, figure: other(figures.map((f) => f.id), s.figure, rng) }
  if (target === 'type') return showPeep(s, other(types, s.type, rng))
  if (target === 'extra') return chooseExtra(s, other(extras.map((t) => t.id), s.extra?.id ?? null, rng))
  if (target !== 'all') return choose(s, target, other(ids(s, target), partId(s, target), rng))
  // A transparent background is a decision, not a colour to shuffle; a locked one or a locked part stays too.
  const bg = s.bg === 'transparent' || s.locked?.includes('bg') ? s.bg : other(swatches.bg, s.bg, rng)
  // On a figure there are no parts to roll: shuffle picks another figure.
  if (s.figure) return { ...s, figure: other(figures.map((f) => f.id), s.figure, rng), bg }
  const rolled = slots.filter((slot) => !s.locked?.includes(slot)).reduce((t, slot) => choose(t, slot, other(ids(t, slot), partId(t, slot), rng)), s)
  return { ...rolled, bg }
}
