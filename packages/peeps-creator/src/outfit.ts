// Every item of the pack comes in its own colours, picked once from its name, so its thumbnail and the peep wearing it agree: the hair of a
// head, its hat, the top and shoes of a body. A colour the person picks for a slot is drawn over them until another item is chosen there.
import { defaults, roleAreas, type PartColors, type PeepType, type Role, type Slot } from '@kit/peeps'
import { swatches, type Parts } from './types.ts'

const slots: readonly Slot[] = ['body', 'head', 'face', 'facialHair', 'accessories']

/** FNV-1a: the same name gives the same colours on every load. */
const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0 }

/** The atom a slot draws: "standing/walking-2", "head/bun". */
export const atomKey = (type: PeepType, slot: Slot, id: string) => `${slot === 'body' ? (type === 'bust' ? 'body' : type) : slot}/${id}`

/** Items whose colours are not left to their name: a white moustache. */
const own: Partial<Record<string, Partial<Record<Role, string>>>> = { 'facialHair/moustache-6': { hair: '#e8e1e1' } }

const INK = '#111111', WHITE = '#ffffff'

/** Muted colours by temperature, so an outfit holds together: accents for a jacket, a top or a hat; trousers mostly dark, some light (light
 *  denim, khaki). Black comes from pieces drawn black. */
const themes = {
  cold: { accent: ['#90a7e0', '#9ddadb', '#7d9cc4', '#5aa7a0', '#8fae8b', '#a99cc8'], dark: ['#2c3e5c', '#3b4a5e', '#5b7aa6', '#4b5563', '#8aa6c8'] },
  warm: { accent: ['#fbcc75', '#d98a9a', '#d9a441', '#c49a6c', '#b5653a', '#e7c9a9'], dark: ['#6b4a35', '#4a3b2f', '#7a6a45', '#7d2e3a', '#c8b48a'] },
}

/** A dark colour takes a white top under it, a light one a black top. */
const isDark = (c: string) => { const n = parseInt(c.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) < 110 }

/** The colours an item comes in, one per piece it has, picked once from its name. Hair is mostly black, a beard black or white. An outfit
 *  keeps to one theme (warm or cold) and three colours at most: a piece drawn black stays black; a jacket takes an accent, trousers a dark;
 *  the top under them is white when they are dark and black when they are not (alone, it takes the accent); shoes repeat one of the others. */
export function itemColors(key: string): Partial<Record<Role, string>> {
  const pieces = roleAreas[key] ?? {}
  let seed = hash(key)
  const pick = <T,>(list: readonly T[]): T => { seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0; return list[seed % list.length] }
  const theme = pick([themes.cold, themes.warm]), accent = pick(theme.accent)
  const drawnBlack = (r: Role) => !!pieces[r] && !pieces[r]!.paper
  const out: Partial<Record<Role, string>> = {}
  if (pieces.hair) out.hair = own[key]?.hair ?? pick(key.startsWith('facialHair/') ? swatches.beardOwn : swatches.hairOwn)
  if (pieces.hat) out.hat = drawnBlack('hat') ? INK : accent
  if (pieces.jacket) out.jacket = drawnBlack('jacket') ? INK : accent
  if (pieces.bottoms) out.bottoms = drawnBlack('bottoms') ? INK : pick(theme.dark)
  if (pieces.top) {
    const outer = out.jacket ?? out.bottoms
    out.top = drawnBlack('top') ? INK : !outer ? pick([accent, accent, WHITE]) : out.jacket ? (isDark(out.jacket) ? WHITE : INK) : isDark(outer) ? pick([WHITE, accent]) : INK
  }
  if (pieces.shoes) { const worn = [out.top, out.jacket, out.bottoms].filter((c): c is string => !!c); out.shoes = drawnBlack('shoes') ? INK : pick(worn.length ? worn : theme.dark) }
  return out
}

/** A slot's colours without its pieces: its lines and fill, which stay when another item is chosen. */
export function plain(c: PartColors[Slot]): PartColors[Slot] {
  const kept = Object.entries(c ?? {}).filter(([k]) => k === 'ink' || k === 'paper')
  return kept.length ? Object.fromEntries(kept) : undefined
}

/** What is drawn: each worn item's own colours, under the ones picked. The whites of a face (eyes, teeth) and of glasses stay white whatever
 *  the fill. */
export function wornColors(type: PeepType, parts: Parts, picked: PartColors = {}): PartColors {
  return Object.fromEntries(slots.map((slot) => [slot, { ...(slot === 'face' || slot === 'accessories' ? { paper: '#ffffff' } : {}), ...itemColors(atomKey(type, slot, parts[slot] ?? defaults[type][slot])), ...picked[slot] }]))
}
