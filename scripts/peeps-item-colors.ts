// The colours each item of @kit/peeps comes in, picked once from its name when build-peeps-skin.ts writes skin.ts: the hair of a head, its
// hat, the top and shoes of a body, and any other piece a label names (a tie, sleeves). A colour set by hand in a label wins over the rules.

/** The pieces the rules know, in the order chips show them; any other name a label gives comes after, as an accent. */
export const KNOWN = ['hair', 'hat', 'top', 'jacket', 'bottoms', 'shoes'] as const

/** FNV-1a: the same name gives the same colours on every build. */
const hash = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0 }

const INK = '#111111', WHITE = '#ffffff'

/** Muted colours by temperature, so an outfit holds together: accents for a jacket, a top or a hat; trousers mostly dark, some light (light
 *  denim, khaki). Black comes from pieces drawn black. */
const themes = {
  cold: { accent: ['#90a7e0', '#9ddadb', '#7d9cc4', '#5aa7a0', '#8fae8b', '#a99cc8'], dark: ['#2c3e5c', '#3b4a5e', '#5b7aa6', '#4b5563', '#8aa6c8'] },
  warm: { accent: ['#fbcc75', '#d98a9a', '#d9a441', '#c49a6c', '#b5653a', '#e7c9a9'], dark: ['#6b4a35', '#4a3b2f', '#7a6a45', '#7d2e3a', '#c8b48a'] },
}

/** A dark colour takes a white top under it, a light one a black top. */
const isDark = (c: string) => { const n = parseInt(c.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) < 110 }

/** The colours an item comes in, one per piece it has (`paper`: white areas, `ink`: solid black ones), known pieces first. Hair, a beard's
 *  too, is black, its hair-2 white, white lines (line-1, ...) white. An outfit keeps to one theme (warm or cold): a piece drawn black stays black; a jacket takes an accent,
 *  trousers a dark; the top under them is white when they are dark and black when they are not (alone, it takes the accent); shoes repeat one
 *  of the others; any other piece takes the accent. `hand` is laid over the result. */
export function itemColors(key: string, pieces: Readonly<Record<string, { paper?: unknown; ink?: unknown }>>, hand: Readonly<Record<string, string>> = {}): Record<string, string> {
  let seed = hash(key)
  const pick = <T,>(list: readonly T[]): T => { seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0; return list[seed % list.length] }
  const theme = pick([themes.cold, themes.warm]), accent = pick(theme.accent)
  const drawnBlack = (r: string) => !!pieces[r] && !pieces[r].paper
  const out: Record<string, string> = {}
  if (pieces.hair) out.hair = INK
  if (pieces.hat) out.hat = drawnBlack('hat') ? INK : accent
  if (pieces.jacket) out.jacket = drawnBlack('jacket') ? INK : accent
  if (pieces.bottoms) out.bottoms = drawnBlack('bottoms') ? INK : pick(theme.dark)
  if (pieces.top) {
    const outer = out.jacket ?? out.bottoms
    out.top = drawnBlack('top') ? INK : !outer ? pick([accent, accent, WHITE]) : out.jacket ? (isDark(out.jacket) ? WHITE : INK) : isDark(outer) ? pick([WHITE, accent]) : INK
  }
  if (pieces.shoes) { const worn = [out.top, out.jacket, out.bottoms].filter((c): c is string => !!c); out.shoes = drawnBlack('shoes') ? INK : pick(worn.length ? worn : theme.dark) }
  const ordered: Record<string, string> = {}
  for (const r of KNOWN) if (out[r]) ordered[r] = out[r]
  // hair-2 is the white in hair (dots, beads, the parting of cornrows), so it starts white.
  // line-1, line-2: white lines over black, white as drawn.
  for (const r of Object.keys(pieces)) if (!(r in ordered)) ordered[r] = r === 'hair-2' || /^line-\d+$/.test(r) ? WHITE : drawnBlack(r) ? INK : accent
  for (const [r, c] of Object.entries(hand)) if (r in ordered) ordered[r] = c
  return ordered
}
// Self-check: known pieces come first, a piece the rules don't know takes a colour, a colour set by hand wins.
{ const c = itemColors('body/x', { tie: { paper: true }, top: { paper: true } }, { top: '#123456' })
  if (Object.keys(c).join() !== 'top,tie' || c.top !== '#123456' || !/^#[0-9a-f]{6}$/.test(c.tie)) throw new Error('itemColors') }
