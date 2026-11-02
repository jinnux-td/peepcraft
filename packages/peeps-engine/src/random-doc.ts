// A random document: the open parts are rolled (body, head, face, facial hair, accessories), everything else is what PeepCraft starts
// with unless `keep` sets it. Type, mask and extra start locked in the creator, so they stay at their start (bust, none, none); colours are
// never rolled (ink, paper, skin, background), only taken from `keep`. A piece colour for a part left open (`partColors.head.hair`) rolls
// among the items that have that piece. A `keep` that contradicts itself is an error (DocInvalid), never silently dropped.
import { catalogue, lookup, type PeepType, type Slot } from '@kit/peeps'
import { DOC_VERSION, fromState, resolve, validate, type DocError, type PeepCraftDoc } from './doc.ts'
import { randomize, seeded, type Rng } from './random.ts'
import { DocInvalid } from './render.ts'
import { categoryOf } from './state.ts'
import { initialState, type Lockable, type Parts } from './types.ts'

const PLAIN = ['ink', 'paper']

/** The pieces an item can colour, with its lines and fill. */
const piecesOf = (type: PeepType, slot: Slot, id: string) => [...PLAIN, ...Object.keys(lookup(categoryOf(type, slot), id).pieces)]

export function randomDoc({ type, keep = { v: DOC_VERSION }, seed }: { type?: PeepType; keep?: PeepCraftDoc; seed?: number } = {}): PeepCraftDoc {
  const rng: Rng = seed === undefined ? Math.random : seeded(seed)
  const { figure, partColors = {}, ...rest } = keep
  const fail = (errors: DocError[]) => { throw new DocInvalid(errors) }
  if (type && rest.type && type !== rest.type) fail([{ path: 'type', message: `asked for ${type} but the document keeps ${rest.type}` }])
  // The piece colours wait: which pieces exist depends on the items, some of them not rolled yet.
  const checked = validate({ ...rest, v: DOC_VERSION, ...(type ? { type } : {}) })
  if (!checked.ok) fail(checked.errors)
  const t: PeepType = type ?? rest.type ?? initialState.type
  const parts: Parts = { ...rest.parts }
  const errors: DocError[] = []
  for (const [slot, colours] of Object.entries(partColors) as [Slot, Record<string, string>][]) {
    const wanted = Object.keys(colours ?? {}).filter((p) => !PLAIN.includes(p))
    const chosen = parts[slot]
    if (chosen) {
      const has = piecesOf(t, slot, chosen)
      for (const p of wanted) if (!has.includes(p)) errors.push({ path: `partColors.${slot}.${p}`, message: `${chosen} has no piece "${p}"`, choices: has })
      continue
    }
    if (!wanted.length) continue
    // Roll among the items that have every piece asked for.
    const ids = [...catalogue[categoryOf(t, slot)].keys()]
    const fit = ids.filter((id) => wanted.every((p) => piecesOf(t, slot, id).includes(p)))
    if (fit.length) parts[slot] = fit[Math.min(fit.length - 1, Math.floor(rng() * fit.length))]
    else errors.push({ path: `partColors.${slot}.${wanted.find((p) => !ids.some((id) => piecesOf(t, slot, id).includes(p))) ?? wanted[0]}`, message: `no ${categoryOf(t, slot)} item has all of ${wanted.join(', ')}`, choices: [...new Set(ids.flatMap((id) => piecesOf(t, slot, id)))] })
  }
  if (errors.length) fail(errors)

  const base = resolve({ ...rest, v: DOC_VERSION, type: t, parts, partColors })
  // Locked: what the creator locks at first (type, mask, extra), every colour, and every part given.
  const locked: Lockable[] = ['type', 'mask', 'extra', 'bg', 'skin', ...(Object.keys(parts) as Slot[])]
  const rolled = randomize({ ...base, locked: [...new Set(locked)] }, 'all', rng)
  const { doc } = fromState({ ...rolled, locked: undefined })
  const out = figure ? { ...doc, figure } : doc
  const final = validate(out)
  if (!final.ok) fail(final.errors)
  return out
}
