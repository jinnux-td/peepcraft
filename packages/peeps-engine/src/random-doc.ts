// A random document, as Shuffle all rolls one: what `keep` names stays, the rest is rolled. No mask and no extra unless kept, as in the creator.
import type { PeepType, Slot } from '@kit/peeps'
import { DOC_VERSION, fromState, resolve, type PeepcraftDoc } from './doc.ts'
import { randomize, seeded } from './random.ts'
import type { Lockable } from './types.ts'

export function randomDoc({ type, keep = { v: DOC_VERSION }, seed }: { type?: PeepType; keep?: PeepcraftDoc; seed?: number } = {}): PeepcraftDoc {
  const { figure, ...rest } = keep
  const base = resolve({ ...rest, v: DOC_VERSION, ...(type ? { type } : {}) })
  const locked: Lockable[] = ['mask', 'extra', ...(Object.keys(rest.parts ?? {}) as Slot[])]
  if (type || rest.type) locked.push('type')
  if (rest.bg) locked.push('bg')
  if (rest.skin) locked.push('skin')
  if (rest.extra) locked.splice(locked.indexOf('extra'), 1)
  const rolled = randomize({ ...base, locked: [...new Set(locked)] }, 'all', seed === undefined ? Math.random : seeded(seed))
  const { doc } = fromState({ ...rolled, extra: rest.extra ? base.extra : rolled.extra })
  return figure ? { ...doc, figure } : doc
}
