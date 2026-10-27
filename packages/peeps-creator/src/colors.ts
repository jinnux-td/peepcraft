// What can be coloured, as plain data for the colour chips: a peep's lines, fill, parts and pieces, or a thing's lines, fill and named parts.
import { defaults, type PartColors, type PeepType, type Role, type Slot } from '@kit/peeps'
import { lookup as lookupThing } from '@kit/things'
import { wornColors } from './outfit.ts'
import { SKIN, swatches, type Parts } from './types.ts'

/** One thing that can be coloured: a label for its chip, its colour now, the dots offered first, and how to set or clear it. */
export interface ColorTarget { id: string; label: string; value: string; options: readonly string[]; onChange: (c: string) => void; reset?: { label: string; run: () => void } }

type Look = { ink: string; paper: string; partColors?: PartColors; skin?: string; type?: PeepType; parts?: Parts }

/** The colours of a peep: its skin (one colour for face, neck and hands), its hair and the pieces of its outfit, its parts, then all its
 *  lines and fills. A body's paper, once the skin has its own colour, is the clothes: every white piece no role names. */
const parts: ReadonlyArray<[id: string, label: string, slot: Slot, key: 'ink' | 'paper' | Role, options: readonly string[]]> = [
  ['hair', 'Hair', 'head', 'hair', swatches.hair],
  ['hat', 'Hat', 'head', 'hat', swatches.clothes],
  ['top', 'Top', 'body', 'top', swatches.clothes],
  ['jacket', 'Jacket', 'body', 'jacket', swatches.clothes],
  ['bottoms', 'Bottoms', 'body', 'bottoms', swatches.clothes],
  ['shoes', 'Shoes', 'body', 'shoes', swatches.clothes],
  ['clothes', 'Clothes', 'body', 'paper', swatches.clothes],
  ['face', 'Face', 'face', 'ink', swatches.ink],
  ['facialHair', 'Facial hair', 'facialHair', 'hair', swatches.hair],
  ['accessories', 'Accessories', 'accessories', 'ink', swatches.ink],
  ['frame', 'Frame', 'accessories', 'paper', swatches.clothes],
]
/** Accessories with a white part of their own (a frame between black outlines); the others are lines only. */
const framed = new Set(['glasses-4'])
/** Pieces only some heads and outfits have (a hat, a jacket): a chip for them shows when the item worn has one. */
const optional = new Set(['hat', 'top', 'jacket', 'bottoms', 'shoes'])

/** `whole` keeps only Lines and Fill, for a figure, whose parts cannot be told apart. */
export function peepTargets(look: Look, set: (patch: Partial<Look>) => void, whole = false): ColorTarget[] {
  const pc = look.partColors ?? {}
  // Each item comes in its own colours (outfit.ts); a picked one is drawn over them.
  const own = look.type ? wornColors(look.type, look.parts ?? {}) : {}, worn = look.type ? wornColors(look.type, look.parts ?? {}, pc) : pc
  const setPart = (slot: Slot, key: 'ink' | 'paper' | Role, c: string | undefined) => {
    const next = { ...pc[slot], [key]: c }
    if (c === undefined) delete next[key]
    set({ partColors: { ...pc, [slot]: next } })
  }
  const all: ColorTarget[] = [
    { id: 'skin', label: 'Skin', value: look.skin ?? look.paper, options: swatches.skin, onChange: (skin) => set({ skin }), reset: look.skin !== SKIN ? { label: 'Back to its own colour', run: () => set({ skin: SKIN }) } : undefined },
    ...parts.filter(([id, , slot, key]) => id === 'frame' ? !look.type || framed.has(look.parts?.accessories ?? defaults[look.type].accessories)
      : !optional.has(id) || !look.type || worn[slot]?.[key] !== undefined)
      .map(([id, label, slot, key, options]): ColorTarget => {
        // Hair is black ink until it has a colour; any other piece is the part's paper (the clothes, for a body).
        const base = key === 'ink' || key === 'hair' ? 'ink' : 'paper'
        const back = own[slot]?.[key] ? 'its own colour' : base === 'ink' ? 'Lines' : slot === 'body' && key !== 'paper' ? 'Clothes' : 'Fill'
        return {
          id, label, options, value: worn[slot]?.[key] ?? pc[slot]?.[base] ?? look[base], onChange: (c) => setPart(slot, key, c),
          reset: pc[slot]?.[key] ? { label: `Back to ${back}`, run: () => setPart(slot, key, undefined) } : undefined,
        }
      }),
    { id: 'ink', label: 'Lines', value: look.ink, options: swatches.ink, onChange: (ink) => set({ ink }) },
    { id: 'paper', label: 'Fill', value: look.paper, options: swatches.paper, onChange: (paper) => set({ paper }) },
  ]
  return whole ? all.filter((t) => t.id === 'ink' || t.id === 'paper') : all
}

/** The colours each builder tab shows above its items, in order: the Hair tab the hair, a hat and the skin of the face. */
export const tabColors: Partial<Record<string, readonly string[]>> = {
  type: ['skin', 'ink', 'paper'], head: ['hair', 'hat', 'skin'], body: ['top', 'jacket', 'bottoms', 'shoes', 'clothes', 'skin'],
  face: ['face'], facialHair: ['facialHair'], accessories: ['accessories', 'frame'], figures: ['ink', 'paper'],
}

/** The colours of a thing: lines, fill, and each of its named parts (the leaves and the pot of a plant). */
export function thingTargets(look: { ink: string; paper: string; thing: string; colors?: Partial<Record<string, string>> }, set: (patch: { ink?: string; paper?: string; colors?: Partial<Record<string, string>> }) => void): ColorTarget[] {
  return [
    { id: 'ink', label: 'Lines', value: look.ink, options: swatches.ink, onChange: (ink) => set({ ink }) },
    { id: 'paper', label: 'Fill', value: look.paper, options: swatches.paper, onChange: (paper) => set({ paper }) },
    ...lookupThing(look.thing).slots.map((s): ColorTarget => ({
      id: s, label: s[0].toUpperCase() + s.slice(1), value: look.colors?.[s] ?? look.paper, options: swatches.parts,
      onChange: (c) => set({ colors: { ...look.colors, [s]: c } }),
    })),
  ]
}
