// Turns the symbols of the Open Peeps Figma file into the atoms: src/atoms/<category>/<Name>.ts, one plain path per layer group of a symbol
// (✋ Skin, 👕 Top, 👖 Pants, 🖍 Ink, ...), each a piece that takes its own colour, in the symbol's own colours and paint order.
// Usage: node scripts/build-figma.ts <symbols.svg>
// <symbols.svg> is the whole Symbols page (0:808) exported as SVG with layer names as ids (Figma MCP `download_assets`, format svg). Figma
// scales a page that big down to 4096 wide: scripts/figma-symbols.json holds that scale, the page's origin and where each symbol sits on it.
// The ids, labels, sizes and file names of the atoms are kept from the files already there, so a Peep lays them out as before; a symbol with no
// atom yet becomes a new one, listed after them.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'

const ATOMS = new URL('../src/atoms/', import.meta.url)
const { scale, origin, components } = JSON.parse(readFileSync(new URL('./figma-symbols.json', import.meta.url), 'utf8')) as
  { scale: number; origin: [number, number]; components: [string, number, number, number, number][] }

const folders: Record<string, string> = {
  accessories: 'accessories', body: 'body', face: 'face', 'face/With_Mask': 'face', 'facial-hair': 'facialHair', head: 'head', mask: 'mask', 'pose/standing': 'standing', 'pose/sitting': 'sitting',
}
/** Symbols named otherwise than the pack's file, or than Figma (the faces to wear under a mask, the doctors numbered alike). */
const renamed: Record<string, string> = {
  'body/jacket': 'body/fur-jacket', 'body/jacket-polka-dots': 'body/polka-dot-jacket',
  'face/With_Mask/Cheers': 'face/masked-cheers', 'face/With_Mask/Calm': 'face/masked-calm', 'face/With_Mask/Smile': 'face/masked-smile',
  'mask/*no-mask': 'mask/none', 'pose/standing/doctor-nurse-01': 'standing/doctor-nurse-1',
  'pose/standing/doctor-nurse-02': 'standing/doctor-nurse-2', 'pose/standing/doctor-nurse-03': 'standing/doctor-nurse-3',
}
/** Symbols not made atoms: where two share a name ("Name_2" is the second), the one not drawn like the atom (a bun without the bandana, a
 *  newer Short 4); and the doctors' heads, not wanted. */
const skipped = new Set(['head/Bun', 'head/Short 4', 'accessories/Glasses 5', 'head/doctor-nurse-2', 'head/doctor-nurse-2_2', 'head/doctor-nurse-3'])
/** Layers named by Figma's defaults, by what they are: the yellow of a polo, the black of a face, a beard's grey. */
const pieceNames: Record<string, string> = { path: 'top', shape: 'ink', 'path-4': 'ink', 'fill-4': 'clips', 'fill-6': 'clips' }
/** The colours the standing and sitting poses came in before (the pack's, by the labels), kept over Figma's: their combinations read better;
 *  and Tee 1, the first peep's body, in white.
 *  Not closed-legs-2, whose Figma colours are kept. */
const before: Record<string, Record<string, string>> = {
  'body/tee-1': { top: '#ffffff' },
  'standing/blazer-1': { top: '#111111', jacket: '#d9a441', pants: '#c8b48a', shoes: '#d9a441' },
  'standing/blazer-2': { top: '#111111', jacket: '#8fae8b', pants: '#111111', shoes: '#8ead8a' },
  'standing/blazer-3': { top: '#111111', jacket: '#c49a6c', pants: '#7a6a45', shoes: '#7a6a45' },
  'standing/blazer-4': { top: '#111111', jacket: '#a99cc8', pants: '#111111', shoes: '#a89cc7' },
  'standing/crossed-arms-1': { top: '#ffffff', pants: '#111111', shoes: '#ffffff' },
  'standing/crossed-arms-2': { top: '#111111', pants: '#6b4a35', shoes: '#6b4a34' },
  'standing/easing-1': { top: '#111111', jacket: '#9ddadb', pants: '#111111', shoes: '#9cdada' },
  'standing/easing-2': { top: '#111111', jacket: '#fbcc75', pants: '#c8b48a', shoes: '#fbcc75' },
  'standing/pointing-finger-1': { top: '#ffffff', pants: '#111111', shoes: '#ffffff' },
  'standing/pointing-finger-2': { top: '#111111', pants: '#aa7941', shoes: '#feffff' },
  'standing/polka-dots': { top: '#e7c9a9', pants: '#6b4a35', shoes: '#111111' },
  'standing/resting-1': { top: '#111111', pants: '#5b7aa6', shoes: '#111111' },
  'standing/resting-2': { top: '#111111', pants: '#4a3b2f', shoes: '#111111' },
  'standing/robot-dance-1': { top: '#ffffff', pants: '#111111', shoes: '#feffff' },
  'standing/robot-dance-2': { top: '#111111', pants: '#8aa6c8', shoes: '#8aa6c8' },
  'standing/robot-dance-3': { top: '#ffffff', pants: '#7a6a45', shoes: '#7a6a45' },
  'standing/shirt-1': { top: '#ffffff', pants: '#4b5563', shoes: '#ffffff' },
  'standing/shirt-2': { top: '#111111', pants: '#7d2e3a', shorts: '#7d2e3a', shoes: '#7d2e3a' },
  'standing/shirt-3': { top: '#ffffff', pants: '#111111', shoes: '#ffffff' },
  'standing/shirt-4': { top: '#111111', pants: '#c8b48a', shoes: '#c8b48a' },
  'standing/walking-1': { top: '#d9a441', pants: '#111111', shoes: '#feffff' },
  'standing/walking-2': { top: '#111111', pants: '#8aa6c8', shoes: '#8aa6c8' },
  'standing/walking-3': { top: '#feffff', pants: '#111111', shoes: '#feffff' },
  'sitting/bike': { top: '#111111', jacket: '#a99cc8', pants: '#111111', shoes: '#111111' },
  'sitting/closed-legs-1': { top: '#111111', jacket: '#8fae8b', pants: '#111111', shoes: '#111111' },
  'sitting/crossed-legs': { top: '#ffffff', pants: '#111111', shoes: '#ffffff' },
  'sitting/hands-back-1': { top: '#111111', pants: '#7d2e3a', shoes: '#7d2e3a' },
  'sitting/hands-back-2': { top: '#a99cc8', pants: '#111111', shoes: '#111111' },
  'sitting/mid-1': { top: '#111111', pants: '#7a6a45', shoes: '#111111' },
  'sitting/mid-2': { top: '#ffffff', pants: '#111111', shoes: '#ffffff' },
  'sitting/one-leg-up-1': { top: '#ffffff', pants: '#7a6a45', shoes: '#7a6a45' },
  'sitting/one-leg-up-2': { top: '#ffffff', pants: '#111111', shoes: '#ffffff' },
  'sitting/wheelchair': { top: '#111111', jacket: '#5aa7a0', pants: '#2c3e5c', shoes: '#111111' },
}
/** Pieces whose Figma layer cannot take a colour, redrawn here. Gray Short's "Hair" is only the hairline, a sliver, so the hair
 *  was the skin's colour whatever was picked; this is the skin silhouette above that hairline (computed once with paper.js
 *  path booleans, 2026-11-04). Cornrows' "Hair" is only the line along the ponytail; this is the skin silhouette behind that line. */
const redrawn: Record<string, Record<string, string>> = {
  'head/cornrows': { hair: "M79.88 589.62C75.71 592.41 71.25 595.9 65.85 594.74C62.44 595.96 58.93 597.08 55.42 597.92C51.72 598.77 50.3 593.51 53.81 592.31C55.42 591.78 56.94 591.22 58.55 590.63C57.51 589.39 56.75 587.93 56.37 586.25C45.56 535.78 34.66 485.32 23.85 434.86C-6.48 304.5 -54.55 104.81 98.08 33.88C124.98 23.67 158.53 34.25 172.05 58.26L172.03 58.28C172.6 62.67 172.5 68.12 172.22 73.42C171.84 78.81 171.27 84.07 170.7 88C170.42 89.96 170.23 91.58 170.04 92.72C169.94 93.29 169.85 93.73 169.85 94.03L169.75 94.2L169.75 94.5L169.66 94.8L169.47 94.98L169.47 94.99L169.37 95.01L169.28 95.08L168.9 95.36C168.61 95.61 168.05 95.97 167.38 96.44C166.15 97.38 164.25 98.74 161.98 100.4C157.43 103.76 151.17 108.38 144.54 113.46C131.07 123.62 115.81 135.6 108.23 142.93C106.42 144.7 104.53 147.54 102.54 151.23C100.55 154.91 98.56 159.37 96.57 164.33C92.58 174.25 88.7 186.11 85.19 197.51C81.78 208.92 78.84 219.87 76.66 227.97C75.61 232.03 74.86 235.36 74.19 237.68C73.91 238.84 73.72 239.75 73.62 240.37L73.43 240.79L73.43 241.07L73.34 241.2L79.97 309.29L80.16 310.3L79.12 310.1C79.12 310.1 79.03 310.1 78.93 310.1C78.74 310.12 78.46 310.16 78.08 310.32C77.42 310.63 76.37 311.39 75.23 313.28C72.96 317.1 70.59 325.4 70.59 343.23C70.59 360.79 79.41 370.89 88.32 376.63C92.68 379.5 97.13 381.28 100.45 382.35C102.16 382.88 103.49 383.23 104.53 383.45C105 383.55 105.38 383.63 105.57 383.67C105.76 383.69 105.86 383.71 105.86 383.72C105.95 383.73 105.95 383.73 105.95 383.74L106.33 383.79L106.52 384.04L149.65 444.62L149.65 444.69L149.75 444.76L159.13 466.58L159.32 466.88L159.13 467.19C159.79 467.51 159.13 467.19 159.13 467.19L159.13 467.24L159.04 467.41L159.04 467.55C158.95 467.68 158.85 467.86 158.76 468.08C158.47 468.66 158.09 469.53 157.62 470.63C156.67 472.84 155.25 476.02 153.64 479.91C150.32 487.68 145.86 498.27 141.41 509.54C136.95 520.81 132.5 532.75 129.18 543.24C128.89 544.22 128.51 545.19 128.23 546.14C127.28 547.62 126.33 549.08 125.39 550.53L125.38 550.58C113.71 567.89 98.94 582.09 79.88 589.62Z" },
  'head/gray-short': { hair: "M63.21 126.82C69.19 120.03 77.81 115.97 84.07 109.02C89.66 102.95 94.97 96.73 101.42 91.92C121.23 76.88 155.27 68.87 176.6 65.1C265.52 45.86 333.87 80.44 414.55 109.6C409.91 121.21 403.46 131.79 396.06 141.65C414.29 148.45 408.28 163 395.39 171.97L386.33 171.97L383.23 170.47C382.66 167.55 381.85 163.96 380.71 160.35C379.38 156.09 377.67 151.84 375.4 148.58C373.12 145.31 370.47 143.16 367.43 142.86C364.21 142.54 359.94 143.8 354.92 146.01C350.09 148.19 344.59 151.24 339.09 154.36C338.61 154.65 338.05 154.96 337.57 155.26L337.48 155.28C332.64 158.08 327.71 160.86 323.26 163.01C318.42 165.39 313.87 167.07 310.36 167.07C308.66 167.07 306.1 166.6 302.97 165.82C299.75 165.03 295.86 163.91 291.5 162.57C287.23 161.23 282.4 159.68 277.18 158C271.97 156.32 266.37 154.52 260.59 152.74C237.65 145.58 211.77 138.47 193.57 138.47C175.36 138.47 158.49 145.98 144.65 156.26C130.71 166.53 119.91 179.55 113.74 190.45C107.77 201.07 112.13 213.06 118.29 222.6C121.33 227.34 124.84 231.41 127.49 234.3C128.82 235.74 129.95 236.88 130.81 237.66C131.19 238.05 131.57 238.35 131.76 238.55C131.85 238.66 131.95 238.73 132.04 238.78L132.04 238.86L132.61 239.32L132.13 239.88L132.13 239.95C132.13 239.99 132.04 240.06 131.95 240.15C131.85 240.32 131.66 240.58 131.38 240.91C130.9 241.58 130.14 242.53 129.29 243.73C127.58 246.11 125.31 249.38 122.94 252.98C120.66 256.58 118.39 260.48 116.68 264.13C114.88 267.79 113.84 271.09 113.84 273.51C113.84 278.41 114.78 288.33 115.86 297.41C115.91 297.86 115.97 298.31 116.02 298.75C116.49 303.46 117.06 307.84 117.44 311.05C117.63 312.65 117.82 313.97 118.01 314.87C118.01 315.32 118.1 315.68 118.1 315.92L118.1 316.29C118.1 316.29 118.76 316.19 118.1 316.29L118.29 317.47L117.16 317.1L117.16 317.08L116.97 317.03C116.78 316.98 116.59 316.91 116.3 316.82C115.73 316.64 114.88 316.39 113.93 316.08C111.85 315.48 109 314.66 105.87 313.85C99.97 312.35 92.94 310.86 87.51 310.62C87.01 310.6 86.53 310.59 86.06 310.59C80.66 310.59 75.92 313.61 72.41 316.72C71.73 317.33 71.09 317.95 70.52 318.54C69.64 319.43 68.9 320.27 68.33 320.97C67.86 321.55 67.57 322.04 67.29 322.37C67.29 322.43 67.2 322.49 67.2 322.54C67.1 322.62 67.1 322.7 67.01 322.76L67.01 322.82L66.91 322.85L66.91 322.88L66.72 323.22L64.72 323.22C46.66 278.1 35.13 170.86 63.21 126.82Z" },
}
/** Categories whose pieces are offered as colours of their own (a face's eyes and glasses' lenses are its fill). */
const offered = new Set(['body', 'standing', 'sitting', 'head', 'facialHair', 'mask'])
/** A piece by what it is where Figma names it vaguely: a beard's "Background" is its grey hair, a mask's "Color" the
 *  mask; the doctors' "Clothes" are told apart by colour, scrubs, a white coat, a top (a cardigan on the first). */
function pieceOf(category: string, id: string, s: Shape): string {
  if (s.piece === 'background' && category === 'facialHair') return 'hair'
  if (s.piece === 'color' && category === 'mask') return 'mask'
  if (s.piece === 'clothes') return ({ '#8fa7df': 'scrubs', '#ffffff': 'coat', '#9fd8e5': id === 'doctor-nurse-1' ? 'jacket' : 'top' })[s.fill] ?? s.piece
  return s.piece
}

const kebab = (s: string) => s.replace(/^\*\s*/, '').replace(/[^A-Za-z0-9]+/g, ' ').trim().toLowerCase().replace(/ /g, '-')
const str = (s: string) => JSON.stringify(s)
const hex = (c: string) => ({ white: '#ffffff', black: '#000000' })[c] ?? c.toLowerCase()
/** The ids are the layer names as UTF-8 bytes in numeric entities, Figma's way. */
const decode = (s: string) => Buffer.from(s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)), 'latin1').toString('utf8')

interface Shape { piece: string; fill: string; d: string; stroke?: number }

/** Page coordinates (scaled, absolute commands only) into a symbol's own, two decimals. */
function local(d: string, at: [number, number]): string {
  const x = (v: string) => +(+v / scale + origin[0] - at[0]).toFixed(2), y = (v: string) => +(+v / scale + origin[1] - at[1]).toFixed(2)
  return d.replace(/([MLCHVZ])([^MLCHVZ]*)/g, (_, cmd: string, args: string) => {
    const n = args.trim().split(/[\s,]+/).filter(Boolean)
    if (/[a-z]/.test(cmd)) throw new Error(`relative command ${cmd}`)
    return cmd + (cmd === 'H' ? n.map(x) : cmd === 'V' ? n.map(y) : n.map((v, i) => (i % 2 ? y(v) : x(v)))).join(' ')
  })
}

/** Each symbol's layers as shapes, by its name, "_2" on a repeated name as Figma writes it. */
function symbols(svg: string): Map<string, { at: [number, number]; shapes: Shape[] }> {
  const where = new Map<string, [number, number]>(), seen = new Map<string, number>()
  for (const [name, x, y] of components) { const n = (seen.get(name) ?? 0) + 1; seen.set(name, n); where.set(n > 1 ? `${name}_${n}` : name, [x, y]) }
  const out = new Map<string, { at: [number, number]; shapes: Shape[] }>()
  let current: { at: [number, number]; shapes: Shape[] } | null = null, depth = 0
  for (const m of svg.matchAll(/<(\/?)(g|path|rect)\b([^>]*?)(\/?)>/g)) {
    const [, close, tag, attrs, self] = m
    if (close) { if (--depth === 0) current = null; continue }
    const attr = (k: string) => attrs.match(new RegExp(` ${k}="([^"]*)"`))?.[1]
    const id = decode(attr('id') ?? '')
    if (depth === 0 && tag === 'g') {
      // Only the atoms' symbols: the whole persons and masks have groups inside.
      const at = where.get(id)
      current = at && folders[id.slice(0, id.lastIndexOf('/'))] ? { at, shapes: [] } : null
      if (current) out.set(id, current)
    } else if (current && depth === 1 && tag !== 'g') {
      const name = kebab(id.replace(/_\d+$/, '')), piece = pieceNames[name] ?? name
      // A rectangle (a cup, a pocket) as a path.
      const d = tag === 'rect' ? `M${attr('x') ?? 0} ${attr('y') ?? 0}H${+(attr('x') ?? 0) + +attr('width')!}V${+(attr('y') ?? 0) + +attr('height')!}H${attr('x') ?? 0}Z` : attr('d')!
      const stroke = attr('stroke')
      current.shapes.push({ piece, fill: hex(stroke ?? attr('fill') ?? 'black'), d: local(d, current.at), ...(stroke ? { stroke: +(+attr('stroke-width')! / scale).toFixed(2) } : {}) })
    } else if (current && depth > 1) throw new Error(`${id}: a group inside a symbol`)
    if (tag === 'g' && !self) depth++
  }
  return out
}

/** The atoms already there: export name, meta and order, per category; none for a new category. */
function existing(category: string): { ident: string; meta: string; id: string }[] {
  const dir = new URL(`${category}/`, ATOMS)
  if (!existsSync(dir)) return []
  // index.ts holds one line per atom, in order: atom({ meta }, { pieces }, () => import('./Ident.ts'))
  const lines = [...readFileSync(new URL('index.ts', dir), 'utf8').matchAll(/atom\((\{ category: [^}]*\}), .*import\('\.\/(\w+)\.ts'\)/g)]
  if (lines.length !== readdirSync(dir).length - 1) throw new Error(`${category}: index.ts does not list every atom`)
  return lines.map(([, meta, ident]) => {
    if (!meta) throw new Error(`${category}/${ident}: no meta`)
    return { ident, meta, id: meta.match(/id: "([^"]+)"/)![1] }
  })
}

const pascal = (s: string) => s.replace(/[^A-Za-z0-9]+/g, ' ').trim().split(' ').map((w) => w[0].toUpperCase() + w.slice(1)).join('')
const svgPath = process.argv[2]
if (!svgPath) throw new Error('usage: node scripts/build-figma.ts <symbols.svg>')
const drawn = symbols(readFileSync(svgPath, 'latin1'))
// Every symbol of the atoms' folders, an empty one ("* None") too, by atom key, in the order of the page.
const byKey = new Map<string, { name: string; shapes: Shape[]; size: [number, number]; label: string }>(), seen = new Map<string, number>()
for (const [figmaName, , , w, h] of components) {
  const n = (seen.get(figmaName) ?? 0) + 1, name = n > 1 ? `${figmaName}_${n}` : figmaName
  seen.set(figmaName, n)
  const i = name.lastIndexOf('/'), category = folders[name.slice(0, i)], leaf = name.slice(i + 1).replace(/_\d+$/, '')
  if (!category || skipped.has(name)) continue
  const key = renamed[name] ?? `${category}/${kebab(leaf)}`, id = key.split('/')[1]
  const label = id === 'none' ? '* None' : renamed[name] ? id.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') : leaf
  byKey.set(key, { name, shapes: drawn.get(name)?.shapes ?? [], size: [w, h], label })
}

let total = 0
for (const category of new Set(Object.values(folders))) {
  // The atoms there, then the symbols that have none yet.
  const atoms = existing(category).map((a) => ({ ...a, found: byKey.get(`${category}/${a.id}`) }))
  for (const [key, found] of byKey) if (key.startsWith(`${category}/`) && !atoms.some((a) => a.id === key.split('/')[1])) {
    const id = key.split('/')[1], ident = pascal(found.label.replace(/^\*\s*/, ''))
    if (atoms.some((a) => a.ident === ident)) throw new Error(`${key}: ${ident} is taken`)
    atoms.push({ ident, id, found, meta: `{ category: ${str(category)}, id: ${str(id)}, label: ${str(found.label)}, width: ${found.size[0]}, height: ${found.size[1]} }` })
  }
  mkdirSync(new URL(`${category}/`, ATOMS), { recursive: true })
  const entries: string[] = []
  for (const { ident, meta, id, found } of atoms) {
    if (!found) throw new Error(`no symbol for ${category}/${id}`)
    const own = before[`${category}/${id}`] ?? {}
    const fixed = redrawn[`${category}/${id}`] ?? {}
    const shapes = found.shapes.map((s) => ({ ...s, piece: pieceOf(category, id, s) })).map((s) => ({ ...s, fill: own[s.piece] ?? s.fill, d: fixed[s.piece] ?? s.d }))
    const pieces: Record<string, string> = {}
    if (offered.has(category)) for (const s of shapes) if (s.piece !== 'skin' && s.piece !== 'ink') pieces[s.piece] ??= s.fill
    const list = shapes.map((s) => `  { piece: ${str(s.piece)}, fill: ${str(s.fill)}, ${s.stroke ? `stroke: ${s.stroke}, ` : ''}d: ${str(s.d)} },`).join('\n')
    // The paths go in the atom's own module, loaded on demand; the meta and the pieces go in index.ts, loaded at once.
    writeFileSync(new URL(`${category}/${ident}.ts`, ATOMS), `// Generated by scripts/build-figma.ts from the Figma symbol "${found.name}". Do not edit.
// The paths of ${ident}; its meta and pieces are in index.ts, which loads this module on demand.
import type { Shape } from '../../atom.ts'

export const shapes: readonly Shape[] = [
${list}
]
`)
    entries.push(`  atom(${meta}, ${JSON.stringify(pieces)}, () => import('./${ident}.ts')),`)
    byKey.delete(`${category}/${id}`)
    total++
  }
  writeFileSync(new URL(`${category}/index.ts`, ATOMS), `// Generated by scripts/build-figma.ts. Do not edit.
import { atom } from '../../atom.ts'

export const atoms = [
${entries.join('\n')}
] as const
export type Id = (typeof atoms)[number]['id']
`)
  console.log(category.padEnd(12), atoms.length)
}
console.log('atoms', total, '; symbols not used:', [...byKey.values()].map((s) => s.name).join(', ') || 'none')
