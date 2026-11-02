// What can be coloured, as plain data for the colour chips: a peep's lines, fill, parts and the pieces its items carry, or a thing's lines,
// fill and named parts.
import { defaults, type PartColors, type PeepType, type Slot } from '@kit/peeps'
import { lookup as lookupThing } from '@kit/things'
import { wornColors, SKIN, swatches, type Parts } from '@kit/peeps-engine'

/** One thing that can be coloured: a label for its chip, its colour now, the dots offered first, and how to set or clear it. `slot`, for a
 *  piece an item carries (hair, a top, a tie): the slot of that item. */
export interface ColorTarget {
  id: string; label: string; value: string; options: readonly string[]; onChange: (c: string) => void; reset?: { label: string; run: () => void }; slot?: Slot
  /** The skin, the one colour of the whole peep, can be kept as it is when shuffling all. */
  lock?: { locked: boolean; toggle: () => void }
}

type Look = { ink: string; paper: string; partColors?: PartColors; skin?: string; type?: PeepType; parts?: Parts; extra?: { id: string; ink: string; paper: string } }

type Part = [id: string, label: string, slot: Slot, key: string, options: readonly string[]]
/** The colours of a peep: its skin (one colour for face, neck and hands), the pieces its items carry (the hair and bandana of a head, the
 *  top, pants and shoes of a body), its parts, then all its lines. Every piece has a colour of its own, so the fill shows only in Contrast. */
const fixed: Record<string, Part> = {
  face: ['face', 'Face', 'face', 'ink', swatches.ink],
  accessories: ['accessories', 'Accessories', 'accessories', 'ink', swatches.ink],
  frame: ['frame', 'Frame', 'accessories', 'paper', swatches.clothes],
}
/** Accessories with a white part of their own (a frame between black outlines); the others are lines only. */
const framed = new Set(['glasses-4'])
/** "sleeve-cuffs" as "Sleeve cuffs". */
const title = (s: string) => s[0].toUpperCase() + s.slice(1).replace(/-/g, ' ')

/** The pieces the worn items carry, in order: head, body, beard, mask, each item's followed by its black lines, its "Line" (the part's ink). A
 *  beard's hair is "Facial hair"; a name two items share gets its slot. */
function pieceParts(own: PartColors, worn: (slot: Slot) => boolean): Part[] {
  const taken = new Set(['skin', 'ink', 'paper', 'facialHair', ...Object.keys(fixed)])
  return (['head', 'body', 'facialHair', 'mask'] as const).flatMap((slot) => {
    const part = (k: string): Part => {
      const beard = slot === 'facialHair' && k === 'hair', id = beard ? 'facialHair' : taken.has(k) ? `${slot}-${k}` : k
      taken.add(id)
      return [id, beard ? 'Facial hair' : title(k), slot, k, k === 'hair' ? swatches.hair : swatches.clothes]
    }
    const line: Part[] = worn(slot) ? [[`${slot}-line`, 'Line', slot, 'ink', swatches.ink]] : []
    return [...Object.keys(own[slot] ?? {}).filter((k) => k !== 'ink' && k !== 'paper').map(part), ...line]
  })
}

/** `whole` keeps only Lines and Fill, for a figure, whose parts cannot be told apart. */
export function peepTargets(look: Look, set: (patch: Partial<Look>) => void, whole = false): ColorTarget[] {
  const pc = look.partColors ?? {}
  // Each item comes in its own colours (outfit.ts); a picked one is drawn over them.
  const own = look.type ? wornColors(look.type, look.parts ?? {}) : {}, worn = look.type ? wornColors(look.type, look.parts ?? {}, pc) : pc
  const setPart = (slot: Slot, key: string, c: string | undefined) => {
    const next = { ...pc[slot], [key]: c }
    if (c === undefined) delete next[key]
    set({ partColors: { ...pc, [slot]: next } })
  }
  const wearing = (slot: Slot) => !!look.type && (look.parts?.[slot] ?? defaults[look.type][slot]) !== 'none'
  const pieces = pieceParts(own, wearing), framedNow = !look.type || framed.has(look.parts?.accessories ?? defaults[look.type].accessories)
  const all: ColorTarget[] = [
    { id: 'skin', label: 'Skin', value: look.skin ?? look.paper, options: swatches.skin, onChange: (skin) => set({ skin }), reset: look.skin !== SKIN ? { label: 'Back to its own colour', run: () => set({ skin: SKIN }) } : undefined },
    ...[...pieces.filter(([, , slot]) => slot === 'head' || slot === 'body'), fixed.face, ...pieces.filter(([, , slot]) => slot === 'facialHair' || slot === 'mask'), fixed.accessories, ...(framedNow ? [fixed.frame] : [])]
      .map(([id, label, slot, key, options]): ColorTarget => {
        // A piece is drawn in its own colour; the clothes and a frame are the part's paper, a face and accessories its lines.
        const base = key === 'ink' || key === 'hair' ? 'ink' : 'paper'
        const back = own[slot]?.[key] ? 'its own colour' : base === 'ink' ? 'Lines' : 'Fill'
        return {
          id, label, options, value: worn[slot]?.[key] ?? pc[slot]?.[base] ?? look[base], onChange: (c) => setPart(slot, key, c),
          reset: pc[slot]?.[key] ? { label: `Back to ${back}`, run: () => setPart(slot, key, undefined) } : undefined,
          slot: pieces.some((p) => p[0] === id) ? slot : undefined,
        }
      }),
    { id: 'ink', label: 'Lines', value: look.ink, options: swatches.ink, onChange: (ink) => set({ ink }) },
    ...(whole ? [{ id: 'paper', label: 'Fill', value: look.paper, options: swatches.paper, onChange: (paper: string) => set({ paper }) }] : []),
    // The extra worn (a speech bubble) has its own lines and fill, black on light grey until picked.
    ...(look.extra ? ((x) => [
      { id: 'extraInk', label: 'Extra lines', value: x.ink, options: swatches.ink, onChange: (ink: string) => set({ extra: { ...x, ink } }) },
      { id: 'extraPaper', label: 'Extra fill', value: x.paper, options: swatches.paper, onChange: (paper: string) => set({ extra: { ...x, paper } }) },
    ])(look.extra) : []),
  ]
  return whole ? all.filter((t) => t.id === 'ink' || t.id === 'paper') : all
}

/** The colours each builder tab shows above its items after the pieces of the item in its slot: the Hair tab the hair and a hat, then the
 *  skin of the face. Each tab has its own lines; only the skin is shared. */
const tabExtras: Partial<Record<string, readonly string[]>> = {
  type: ['skin'], head: ['skin'], body: ['skin'], face: ['face'], accessories: ['accessories', 'frame'], figures: ['ink', 'paper'], extra: ['extraInk', 'extraPaper'],
}
export const tabColors = (tab: string, targets: readonly ColorTarget[]): ColorTarget[] =>
  [...targets.filter((t) => t.slot === tab), ...(tabExtras[tab] ?? []).flatMap((id) => targets.filter((t) => t.id === id))]

/** The colours of a thing: lines, fill, and each of its named parts (the leaves and the pot of a plant). */
export function thingTargets(look: { ink: string; paper: string; thing: string; colors?: Partial<Record<string, string>> }, set: (patch: { ink?: string; paper?: string; colors?: Partial<Record<string, string>> }) => void): ColorTarget[] {
  return [
    { id: 'ink', label: 'Lines', value: look.ink, options: swatches.ink, onChange: (ink) => set({ ink }) },
    { id: 'paper', label: 'Fill', value: look.paper, options: swatches.paper, onChange: (paper) => set({ paper }) },
    ...Object.entries(lookupThing(look.thing).pieces).map(([s, own]): ColorTarget => ({
      id: s, label: title(s), value: look.colors?.[s] ?? own, options: swatches.parts,
      onChange: (c) => set({ colors: { ...look.colors, [s]: c } }),
    })),
  ]
}
