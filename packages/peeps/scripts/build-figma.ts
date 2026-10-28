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
/** The colours the standing and sitting poses came in before (the pack's, by the labels), kept over Figma's: their combinations read better.
 *  Not closed-legs-2, whose Figma colours are kept. */
const before: Record<string, Record<string, string>> = {
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
  const order = [...readFileSync(new URL('index.ts', dir), 'utf8').matchAll(/import \{ (\w+) \}/g)].map((m) => m[1])
  if (order.length !== readdirSync(dir).length - 1) throw new Error(`${category}: index.ts does not list every atom`)
  return order.map((ident) => {
    const meta = readFileSync(new URL(`${ident}.ts`, dir), 'utf8').match(/atom\((\{ category: [^}]*\})/)?.[1]
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
  for (const { ident, meta, id, found } of atoms) {
    if (!found) throw new Error(`no symbol for ${category}/${id}`)
    const own = before[`${category}/${id}`] ?? {}
    const shapes = found.shapes.map((s) => ({ ...s, piece: pieceOf(category, id, s) })).map((s) => ({ ...s, fill: own[s.piece] ?? s.fill }))
    const pieces: Record<string, string> = {}
    if (offered.has(category)) for (const s of shapes) if (s.piece !== 'skin' && s.piece !== 'ink') pieces[s.piece] ??= s.fill
    const list = shapes.map((s) => `  { piece: ${str(s.piece)}, fill: ${str(s.fill)}, ${s.stroke ? `stroke: ${s.stroke}, ` : ''}d: ${str(s.d)} },`).join('\n')
    writeFileSync(new URL(`${category}/${ident}.ts`, ATOMS), `// Generated by scripts/build-figma.ts from the Figma symbol "${found.name}". Do not edit.
import { atom } from '../../atom.ts'

export const ${ident} = atom(${meta}, ${JSON.stringify(pieces)}, [
${list}
])
`)
    byKey.delete(`${category}/${id}`)
    total++
  }
  writeFileSync(new URL(`${category}/index.ts`, ATOMS), `// Generated by scripts/build-figma.ts. Do not edit.
${atoms.map((a) => `import { ${a.ident} } from './${a.ident}.ts'`).join('\n')}

export const atoms = [
${atoms.map((a) => `  ${a.ident},`).join('\n')}
] as const
export type Id = (typeof atoms)[number]['id']
`)
  console.log(category.padEnd(12), atoms.length)
}
console.log('atoms', total, '; symbols not used:', [...byKey.values()].map((s) => s.name).join(', ') || 'none')
