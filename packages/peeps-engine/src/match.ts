// A description of a person (from a vision model reading a photo, a tool call or a form) to a document: every part of each slot is scored
// against the description by its traits (@kit/peeps traits.ts), the best one is taken, and the colours are snapped to the creator's
// swatches. Plain code: the same description and seed give the same peep, and no model is needed to test it.
//
// A field left out of the description is not scored; a slot with nothing described keeps the type's default part. An optional trait a
// part does not have counts as 'none' (a face without wrinkles, a body that holds nothing), so `holds: 'none'` prefers empty hands.
import { traitsOf, type AccessoryTraits, type FaceTraits, type FacialHairTraits, type HeadTraits, type OutfitTraits, type PeepType, type Slot } from '@kit/peeps'
import { DOC_VERSION, validate, type DocError, type PeepCraftDoc } from './doc.ts'
import { seeded } from './random.ts'
import { DocInvalid } from './render.ts'
import { categoryOf, optionsFor } from './state.ts'
import { swatches, type Parts } from './types.ts'

/** Traits as a description says them: every field optional, a flag (bangs, wrinkles) true or false, and an optional trait also 'none'. */
type Described<T> = { [K in keyof T]?: NonNullable<T[K]> extends true ? boolean : undefined extends T[K] ? NonNullable<T[K]> | 'none' : T[K] }

/** What can be said about a person, in the words of the traits. Every field is optional. */
export interface Attributes {
  /** 'bust' when only the head and shoulders show (the default), 'standing' or 'sitting' for a whole figure. */
  type?: PeepType
  hair?: Described<HeadTraits>
  face?: Described<Omit<FaceTraits, 'fantasy'>>
  facialHair?: Described<FacialHairTraits>
  eyewear?: Described<AccessoryTraits>
  mask?: 'none' | 'medical' | 'respirator'
  outfit?: Described<OutfitTraits>
  /** '#rrggbb', as seen: snapped to the nearest swatch. */
  colours?: { skin?: string; hair?: string; top?: string; bottom?: string }
}

/** Why a slot got its part: the traits that matched, and the score out of the most it could have had. */
export interface MatchReason { slot: Slot; id: string; score: number; of: number; matched: string[] }

export interface MatchResult { doc: PeepCraftDoc; reasons: MatchReason[] }

// How much each trait counts, per slot. A near miss (medium for long, wavy for curly, a smile for a grin) gets `near` of its weight.
const W = {
  head: { length: 3, texture: 2, style: 2, bangs: 1, cover: 4 },
  face: { mood: 3, mouth: 2, eyes: 1, wrinkles: 1 },
  facialHair: { kind: 4, size: 2, moustache: 1, styled: 1 },
  accessories: { kind: 4, frame: 2, thick: 1, light: 1 },
  mask: { kind: 1 },
  body: { top: 3, sleeves: 1, pattern: 1, bottom: 1, pose: 1, holds: 2, aid: 3 },
} as const
const NEAR = 0.5
/** A head whose hair takes a colour, when the hair seen is not near black. */
const HAIR_COLOUR_BONUS = 1.5
/** A body whose outer garment takes a colour, when the colour seen is not near black. */
const GARMENT_COLOUR_BONUS = 1
/** A masked face (eyes only) when a mask is worn. */
const MASKED_BONUS = 3

// Values one step apart on a scale, or in the same family, are a near miss.
const NEARBY: Record<string, readonly (readonly string[])[]> = {
  length: [['none', 'short', 'medium', 'long']],
  texture: [['straight', 'wavy', 'curly', 'coily']],
  size: [['small', 'medium', 'large']],
  mood: [['happy', 'playful', 'confident'], ['sad', 'tired', 'worried'], ['worried', 'scared', 'surprised']],
  mouth: [['smile', 'grin'], ['neutral', 'frown'], ['open', 'grin']],
  eyes: [['closed', 'narrow'], ['open', 'wide']],
  kind: [['glasses', 'sunglasses'], ['beard', 'goatee'], ['goatee', 'moustache']],
  top: [['tee', 'tank', 'polo'], ['shirt', 'polo'], ['sweater', 'turtleneck', 'hoodie'], ['jacket', 'blazer', 'lab-coat'], ['scrubs', 'lab-coat']],
  bottom: [['trousers', 'jeans']],
}
function near(field: string, a: string, b: string): boolean {
  return (NEARBY[field] ?? []).some((scale) => {
    const i = scale.indexOf(a), j = scale.indexOf(b)
    // A scale (length, texture, size) counts one step; a family any member.
    return i >= 0 && j >= 0 && (field === 'length' || field === 'texture' || field === 'size' ? Math.abs(i - j) === 1 : true)
  })
}

/** A part's value for a field, with a missing optional trait as 'none' (or false). */
const valueOf = (traits: object, field: string, wanted: unknown): unknown => {
  const v = (traits as Record<string, unknown>)[field]
  if (v !== undefined) return v
  return typeof wanted === 'boolean' ? false : 'none'
}

function score(traits: object, wanted: object, weights: Record<string, number>): { score: number; of: number; matched: string[] } {
  let total = 0, of = 0
  const matched: string[] = []
  for (const [field, want] of Object.entries(wanted)) {
    const w = weights[field]
    if (w === undefined || want === undefined) continue
    of += w
    const have = valueOf(traits, field, want)
    if (have === want) { total += w; matched.push(field) }
    else if (typeof have === 'string' && typeof want === 'string' && near(field, have, want)) { total += w * NEAR; matched.push(`~${field}`) }
  }
  return { score: total, of, matched }
}

// --- colours

const HEX = /^#[0-9a-f]{6}$/i
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]
/** "Redmean" distance: close to how far apart two colours look, without a colour space conversion. */
function distance(a: string, b: string): number {
  const [r1, g1, b1] = rgb(a), [r2, g2, b2] = rgb(b), r = (r1 + r2) / 2
  return Math.sqrt((2 + r / 256) * (r1 - r2) ** 2 + 4 * (g1 - g2) ** 2 + (2 + (255 - r) / 256) * (b1 - b2) ** 2)
}
export const nearest = (hex: string, palette: readonly string[]): string =>
  palette.reduce((best, c) => (distance(hex, c) < distance(hex, best) ? c : best))
/** A colour seen in a photo that the ink (near black) would not draw well: hair or a garment drawn in ink would lose it. */
const notInk = (hex: string) => distance(hex, swatches.hair[0]) > 120
// The garment pieces, outermost first: the colour seen on a person is their outer layer.
const OUTER = ['jacket', 'coat', 'scrubs', 'top'] as const
const LOWER = ['pants', 'shorts'] as const

// --- the slots

interface Candidate { id: string; score: number; of: number; matched: string[] }

/** The best candidate; ties broken by the seed, so another seed may give another of the equally good parts. */
function pick(cands: Candidate[], rng: () => number): Candidate | undefined {
  if (!cands.length) return undefined
  const best = Math.max(...cands.map((c) => c.score))
  const top = cands.filter((c) => c.score === best)
  return top[Math.min(top.length - 1, Math.floor(rng() * top.length))]
}

export function match(attrs: Attributes, { seed = 0 }: { seed?: number } = {}): MatchResult {
  const rng = seeded(seed)
  const type: PeepType = attrs.type ?? 'bust'
  const errors: DocError[] = []
  for (const [k, v] of Object.entries(attrs.colours ?? {})) if (v !== undefined && !HEX.test(v)) errors.push({ path: `colours.${k}`, message: `"${v}" is not a #rrggbb colour` })
  if (errors.length) throw new DocInvalid(errors)

  const hairHex = attrs.colours?.hair
  const masked = attrs.mask !== undefined && attrs.mask !== 'none'
  const parts: Parts = {}
  const reasons: MatchReason[] = []

  // A bonus (a colour the part can take, a masked face) counts toward the most a slot could score only when it is in play, so a reason
  // never reads more than its whole.
  const choose = (slot: Slot, wanted: object | undefined, weights: Record<string, number>,
    { filter = () => true, bonus = () => 0, bonusMax = 0 }: { filter?: (id: string, t: object) => boolean; bonus?: (id: string, t: object) => number; bonusMax?: number } = {}) => {
    if (!wanted || !Object.values(wanted).some((v) => v !== undefined)) return
    const category = categoryOf(type, slot)
    const cands = optionsFor(type, slot).flatMap((a) => {
      const t = traitsOf(category, a.id)
      if (!t || !filter(a.id, t)) return []
      const s = score(t, wanted, weights), b = bonus(a.id, t)
      return [{ id: a.id, score: s.score + b, of: s.of + bonusMax, matched: b > 0 ? [...s.matched, 'colour'] : s.matched }]
    })
    const won = pick(cands, rng)
    if (!won) return
    parts[slot] = won.id
    reasons.push({ slot, ...won })
  }

  const hasPiece = (slot: Slot, id: string, piece: string) => piece in (optionsFor(type, slot).find((a) => a.id === id)?.pieces ?? {})

  // The mask first: it decides which faces fit.
  if (attrs.mask) choose('mask', { kind: attrs.mask }, W.mask)
  const lightHair = !!hairHex && notInk(hairHex)
  const hairBonus = lightHair ? HAIR_COLOUR_BONUS : 0
  choose('head', attrs.hair, W.head, {
    bonus: (id, t) => (lightHair && !(t as HeadTraits).cover && hasPiece('head', id, 'hair') ? hairBonus : 0), bonusMax: hairBonus })
  choose('face', attrs.face, W.face, {
    filter: (_, t) => !(t as FaceTraits).fantasy && (masked || (t as FaceTraits).mouth !== 'none'),
    bonus: (_, t) => (masked && (t as FaceTraits).mouth === 'none' ? MASKED_BONUS : 0), bonusMax: masked ? MASKED_BONUS : 0 })
  choose('facialHair', attrs.facialHair, W.facialHair, {
    bonus: (id) => (lightHair && hasPiece('facialHair', id, 'hair') ? hairBonus : 0), bonusMax: attrs.facialHair?.kind === 'none' ? 0 : hairBonus })
  choose('accessories', attrs.eyewear, W.accessories)
  const { top: topHex, bottom: bottomHex } = attrs.colours ?? {}
  const outer = (id: string) => OUTER.find((p) => hasPiece('body', id, p))
  const lowerOf = (id: string) => LOWER.find((p) => hasPiece('body', id, p))
  const topBonus = topHex && notInk(topHex) ? GARMENT_COLOUR_BONUS : 0
  const bottomBonus = type !== 'bust' && bottomHex && notInk(bottomHex) ? GARMENT_COLOUR_BONUS / 2 : 0
  choose('body', attrs.outfit, W.body, {
    bonus: (id) => (outer(id) ? topBonus : 0) + (lowerOf(id) ? bottomBonus : 0), bonusMax: topBonus + bottomBonus })

  // Colours: the skin for head and body; the hair and the top only where the chosen part has that piece.
  const doc: PeepCraftDoc = { v: DOC_VERSION, type, parts }
  const c = attrs.colours ?? {}
  if (c.skin) doc.skin = nearest(c.skin, swatches.skin.slice(1))
  const partColors: NonNullable<PeepCraftDoc['partColors']> = {}
  if (c.hair) for (const slot of ['head', 'facialHair'] as const) {
    const id = parts[slot]
    if (id && hasPiece(slot, id, 'hair')) partColors[slot] = { hair: nearest(c.hair, swatches.hair) }
  }
  const body: Record<string, string> = {}
  const top = parts.body && outer(parts.body), lower = parts.body && lowerOf(parts.body)
  if (c.top && top) body[top] = nearest(c.top, swatches.clothes)
  if (c.bottom && lower) body[lower] = nearest(c.bottom, swatches.clothes)
  if (Object.keys(body).length) partColors.body = body
  if (Object.keys(partColors).length) doc.partColors = partColors

  const checked = validate(doc)
  if (!checked.ok) throw new DocInvalid(checked.errors)
  return { doc, reasons }
}

/** The traits a description can name, per slot, with the weight each carries: for a schema, a prompt, or a person tuning the match. */
export const MATCH_WEIGHTS = W
