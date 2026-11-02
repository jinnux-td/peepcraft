// Names for the colours PeepCraft offers (its swatches), so a colour can be typed and tab-completed as a word: `--ink navy`. A colour is
// also taken as hex with or without '#' (`1d3557`, `#1d3557`, `0cf`); '#' alone starts a comment in shells with interactivecomments.
import { swatches, toHex } from '@kit/peeps-engine'

export const NAMES: Readonly<Record<string, string>> = {
  black: '#000000', charcoal: '#545454', grey: '#737373', silver: '#a6a6a6', 'light-grey': '#d9d9d9', smoke: '#f2f2f2', white: '#ffffff',
  red: '#ff3131', 'coral-red': '#ff5757', pink: '#ff66c4', lilac: '#e2a9f1', orchid: '#cb6ce6', violet: '#8c52ff', indigo: '#5e17eb',
  teal: '#0097b2', cyan: '#0cc0df', aqua: '#5ce1e6', sky: '#38b6ff', blue: '#5271ff', 'royal-blue': '#004aad', 'deep-blue': '#1800ad',
  green: '#00bf63', lime: '#7ed957', chartreuse: '#c1ff72', yellow: '#ffde59', amber: '#ffbd59', orange: '#ff914d', tangerine: '#ff751f',
  sunny: '#f7d56e', peach: '#ffb4a2', 'sea-mist': '#a8dadc', sage: '#b8e0a5', lavender: '#cdb4ff', night: '#1f2937', salmon: '#ff6b6b',
  jet: '#111111', navy: '#1d3557', brown: '#6b2d1a', forest: '#2d6a4f', purple: '#7b2cbf',
  cream: '#fde9d0', butter: '#ffe066', mint: '#cdeac0', 'ice-blue': '#d6e4ff',
  porcelain: '#ffe2cb', ivory: '#ffdbbe', fair: '#ffdbac', beige: '#ffcf9e', sand: '#f1c27d', honey: '#e0ac69', tan: '#d08b5b',
  caramel: '#c68642', taupe: '#987161', bronze: '#8d5524', chestnut: '#5c3a21', espresso: '#4f3e35',
  'dark-brown': '#3b2219', auburn: '#a55728', blond: '#d6b370', platinum: '#e8e1d1', ginger: '#b33a3a',
  crimson: '#e63946', jade: '#52b788', rose: '#ff8fa3', wood: '#c9773e', walnut: '#7b4a2a',
}
const BY_HEX: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(NAMES).map(([n, h]) => [h, n]))

/** A typed colour as '#rrggbb' (or 'transparent' where allowed), or null. */
export function toColour(text: string, transparent = false): string | null {
  const t = text.trim().toLowerCase()
  if (transparent && t === 'transparent') return t
  return NAMES[t] ?? toHex(t)
}

export const nameOf = (hex: string) => BY_HEX[hex.toLowerCase()]

/** Which swatches to offer first for a colour: what the creator shows there, then the rest by name. */
export type ColourUse = 'ink' | 'paper' | 'skin' | 'bg' | 'hair' | 'clothes'
export function suggestColours(use: ColourUse): { value: string; hex: string }[] {
  const first: readonly string[] = use === 'bg' ? swatches.bg : use === 'ink' ? swatches.ink : use === 'paper' ? swatches.paper : use === 'skin' ? swatches.skin : use === 'hair' ? swatches.hair : swatches.clothes
  const order = [...new Set([...first, ...swatches.all, ...Object.values(NAMES)])]
  return [...(use === 'bg' ? [{ value: 'transparent', hex: 'no background' }] : []), ...order.map((hex) => ({ value: BY_HEX[hex] ?? hex.slice(1), hex }))]
}
