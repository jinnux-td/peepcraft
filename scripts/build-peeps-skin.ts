// Finds the white areas of each body, pose, head and beard atom of @kit/peeps, as enclosed by its lines, and its solid black shapes (hair, a
// black shirt), so the skin and each piece (hair, hat, top, jacket, bottoms, shoes) can take its own colour: the pack draws skin, clothes and
// hats as one white shape, and hair and black clothes in the ink of the lines. Two steps, needs Chromium (playwright-core, a root dev dependency):
//   node scripts/build-peeps-skin.ts sheets <dir> [atoms]   numbered contact sheets of every area (white 0, 1, ...; solid k0, k1, ...)
//   node scripts/build-peeps-skin.ts review [dir]   a picture per atom in test colours with its areas numbered (default review/skin)
//   node scripts/build-peeps-skin.ts write          packages/peeps/scripts/skin-labels.json -> packages/peeps/src/skin.ts
// The labels list, per atom, the numbers of its skin areas, of the things it holds (props) and of each role. Numbers are stable for the same
// art, K, gap closing, cuts and splits. A head or a beard's unlabelled pieces are its hair.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { chromium, type Page } from 'playwright-core'
import { catalogue, type Atom, type Category } from '../packages/peeps/src/index.ts'

/** Raster scale: 1 px is 4 units, finer than the lines (12 to 20 units) that the edges hide under. */
const K = 0.25
/** How far (px) a solid black shape's recolourable inside stays from its edge: the dark rim left is its outline. */
const RIM = 3
const CATEGORIES: Category[] = ['body', 'standing', 'sitting', 'head', 'facialHair']
const LABELS = new URL('../packages/peeps/scripts/skin-labels.json', import.meta.url)
const OUT = new URL('../packages/peeps/src/skin.ts', import.meta.url)

interface Area { area: number; cx: number; cy: number; runs: [number, number, number][] }

/** In the page: draw the atom (paper red, ink black), find the 4-connected red areas, give every drawn pixel to the nearest one, return row runs. */
async function segment([svg, w, h, k, close]: [string, number, number, number, number]): Promise<Area[]> {
  const img = new Image()
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  await img.decode()
  const W = Math.ceil(w * k), H = Math.ceil(h * k)
  const g = new OffscreenCanvas(W, H).getContext('2d')!
  g.drawImage(img, 0, 0, W, H)
  const px = g.getImageData(0, 0, W, H).data
  const red = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) red[i] = px[4 * i + 3] > 200 && px[4 * i] > 180 && px[4 * i + 1] < 90 && px[4 * i + 2] < 90 ? 1 : 0
  // `close` px: white that near a line counts as line, which seals the small gaps where a sleeve's line stops short of the body's.
  if (close > 0) {
    const dark = (i: number) => px[4 * i + 3] > 200 && px[4 * i] < 100 && px[4 * i + 1] < 100 && px[4 * i + 2] < 100
    const near = new Uint8Array(W * H)
    for (let i = 0; i < W * H; i++) if (dark(i)) { const x = i % W, y = (i / W) | 0; for (let dy = -close; dy <= close; dy++) for (let dx = -close; dx <= close; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H) near[ny * W + nx] = 1 } }
    for (let i = 0; i < W * H; i++) if (near[i]) red[i] = 0
  }
  const seen = new Uint8Array(W * H), found: { cells: number[] }[] = []
  for (let s = 0; s < W * H; s++) {
    if (!red[s] || seen[s]) continue
    const cells: number[] = [], stack = [s]
    seen[s] = 1
    while (stack.length) {
      const i = stack.pop()!, x = i % W, y = (i / W) | 0
      cells.push(i)
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) if (j >= 0 && red[j] && !seen[j]) { seen[j] = 1; stack.push(j) }
    }
    if (cells.length >= 6) found.push({ cells })
  }
  // Numbers by size, largest first, so they stay put for the same art.
  found.sort((a, b) => b.cells.length - a.cells.length)
  // Every drawn pixel near an area (lines, thin slivers of white under them, tiny areas) goes to the nearest one, spreading from all areas at
  // once: the borders run down the middle of the lines, and no sliver of white is left out of the skin.
  const owner = new Int32Array(W * H).fill(-1), dist = new Int32Array(W * H)
  let queue: number[] = []
  found.forEach(({ cells }, n) => { for (const i of cells) { owner[i] = n; queue.push(i) } })
  for (let step = 1; queue.length; step++) {
    const next: number[] = []
    for (const i of queue) {
      const x = i % W, y = (i / W) | 0
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) if (j >= 0 && owner[j] < 0 && px[4 * j + 3] > 30) { owner[j] = owner[i]; dist[j] = step; next.push(j) }
    }
    queue = next
  }
  // How far (px) an area reaches past its own white, over lines and black: one line or two, never across a black shirt and its speckles. A
  // speck of white too small to be an area reaches twice as far, so a gap left between two lines still goes with its side.
  const REACH = 5
  for (let i = 0; i < W * H; i++) if (dist[i] > REACH && !(dist[i] <= 2 * REACH && px[4 * i] > 120 && px[4 * i + 1] < 90)) owner[i] = -1
  const runsOf = found.map(() => [] as [number, number, number][])
  for (let y = 0; y < H; y++) {
    let x = 0
    while (x < W) {
      const n = owner[y * W + x]
      if (n < 0) { x++; continue }
      let e = x
      while (e + 1 < W && owner[y * W + e + 1] === n) e++
      runsOf[n].push([y, x, e])
      x = e + 1
    }
  }
  return found.map(({ cells }, n) => {
    let sx = 0, sy = 0
    for (const i of cells) { sx += i % W; sy += (i / W) | 0 }
    // Where its number goes: the area's own pixel nearest its centre, so an L-shaped area is not numbered outside itself.
    const mx = sx / cells.length, my = sy / cells.length
    let best = cells[0], d = Infinity
    for (const i of cells) { const e = (i % W - mx) ** 2 + (((i / W) | 0) - my) ** 2; if (e < d) { d = e; best = i } }
    return { area: cells.length, cx: (best % W) / k, cy: ((best / W) | 0) / k, runs: runsOf[n] }
  })
}

/** In the page: the solid black shapes of the atom (hair, a black shirt), as row runs, without the strokes. Every black pixel less than `rim`
 *  px from a non-black one is dropped: strokes (3 to 5 px wide) go entirely, a solid shape keeps its inside and its edge stays a dark line. */
async function solids([svg, w, h, k, rim]: [string, number, number, number, number]): Promise<Area[]> {
  const img = new Image()
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  await img.decode()
  const W = Math.ceil(w * k), H = Math.ceil(h * k)
  const g = new OffscreenCanvas(W, H).getContext('2d')!
  g.drawImage(img, 0, 0, W, H)
  const px = g.getImageData(0, 0, W, H).data
  // Chamfer distance (3 per step, 4 per diagonal) from each black pixel to the nearest other one, in two passes.
  const D = new Int32Array(W * H)
  for (let i = 0; i < W * H; i++) D[i] = px[4 * i + 3] > 200 && px[4 * i] < 100 && px[4 * i + 1] < 100 && px[4 * i + 2] < 100 ? 1 << 20 : 0
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : D[y * W + x])
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (D[y * W + x]) D[y * W + x] = Math.min(D[y * W + x], at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4)
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) if (D[y * W + x]) D[y * W + x] = Math.min(D[y * W + x], at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4)
  const seen = new Uint8Array(W * H), found: number[][] = []
  for (let s = 0; s < W * H; s++) {
    if (D[s] < rim * 3 || seen[s]) continue
    const cells: number[] = [], stack = [s]
    seen[s] = 1
    while (stack.length) {
      const i = stack.pop()!, x = i % W, y = (i / W) | 0
      cells.push(i)
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, j = ny * W + nx
        if (nx >= 0 && ny >= 0 && nx < W && ny < H && D[j] >= rim * 3 && !seen[j]) { seen[j] = 1; stack.push(j) }
      }
    }
    // Smaller than a few strokes' crossing: a blot where lines meet, not a shape.
    if (cells.length >= 40) found.push(cells)
  }
  found.sort((a, b) => b.length - a.length)
  return found.map((cells) => {
    const on = new Set(cells), runs: [number, number, number][] = []
    for (const i of [...cells].sort((a, b) => a - b)) if (!on.has(i - 1) || i % W === 0) { let e = i; while (on.has(e + 1) && (e + 1) % W) e++; runs.push([(i / W) | 0, i % W, e % W]) }
    let sx = 0, sy = 0
    for (const i of cells) { sx += i % W; sy += (i / W) | 0 }
    const mx = sx / cells.length, my = sy / cells.length
    let best = cells[0], d = Infinity
    for (const i of cells) { const e = (i % W - mx) ** 2 + (((i / W) | 0) - my) ** 2; if (e < d) { d = e; best = i } }
    return { area: cells.length, cx: (best % W) / k, cy: ((best / W) | 0) / k, runs }
  })
}

/** In the page: the see-through spots a face's lines close in (the whites of the eyes, teeth, a tear), grown by `grow` px to tuck under the
 *  lines, as row runs. The pack leaves them empty, so the skin shows through; a face drawn on top of them gets them in its paper. */
async function enclosed([svg, w, h, k, grow]: [string, number, number, number, number]): Promise<[number, number, number][]> {
  const img = new Image()
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  await img.decode()
  const W = Math.ceil(w * k), H = Math.ceil(h * k)
  const g = new OffscreenCanvas(W, H).getContext('2d')!
  g.drawImage(img, 0, 0, W, H)
  const px = g.getImageData(0, 0, W, H).data
  // Outside: every clear pixel reached from the border; what is clear and not reached is closed in.
  const out = new Uint8Array(W * H), stack: number[] = []
  const clear = (i: number) => px[4 * i + 3] < 128
  for (let x = 0; x < W; x++) for (const y of [0, H - 1]) stack.push(y * W + x)
  for (let y = 0; y < H; y++) for (const x of [0, W - 1]) stack.push(y * W + x)
  while (stack.length) {
    const i = stack.pop()!
    if (out[i] || !clear(i)) continue
    out[i] = 1
    const x = i % W, y = (i / W) | 0
    if (x > 0) stack.push(i - 1); if (x < W - 1) stack.push(i + 1); if (y > 0) stack.push(i - W); if (y < H - 1) stack.push(i + W)
  }
  let on = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) on[i] = clear(i) && !out[i] ? 1 : 0
  for (let n = 0; n < grow; n++) {
    const next = on.slice()
    for (let i = 0; i < W * H; i++) if (on[i]) { const x = i % W, y = (i / W) | 0; for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) if (j >= 0 && !out[j]) next[j] = 1 }
    on = next
  }
  const runs: [number, number, number][] = []
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (on[y * W + x]) { let e = x; while (e + 1 < W && on[y * W + e + 1]) e++; runs.push([y, x, e]); x = e }
  return runs
}

/** The points of a closed line that keep every other point within `eps` of it (Douglas-Peucker, split at the point farthest from the first). */
function simplify(pts: [number, number][], eps: number): [number, number][] {
  if (pts.length < 4) return pts
  const far = (a: number, b: number) => {
    let best = -1, d = eps
    const [ax, ay] = pts[a], [bx, by] = pts[b % pts.length], len = Math.hypot(bx - ax, by - ay)
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i], e = len ? Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len : Math.hypot(px - ax, py - ay)
      if (e > d) { d = e; best = i }
    }
    return best
  }
  const keep = new Set([0])
  const split = (a: number, b: number) => { const m = far(a, b); if (m < 0) return; keep.add(m); split(a, m); split(m, b) }
  let mid = 0, d = 0
  pts.forEach(([x, y], i) => { const e = Math.hypot(x - pts[0][0], y - pts[0][1]); if (e > d) { d = e; mid = i } })
  keep.add(mid); split(0, mid); split(mid, pts.length)
  return [...keep].sort((a, b) => a - b).map((i) => pts[i])
}

/** Row runs (of one area or several) as one outline, in atom units: the boundary of the pixels, walked with the inside on the right, through
 *  the middle of each pixel edge so a staircase becomes a slope. One path without inner edges, so no seams where strips would meet. */
function outline(runs: [number, number, number][], [ox, oy]: Box): string {
  if (!runs.length) return ''
  let W = 0, H = 0
  for (const [y, , b] of runs) { W = Math.max(W, b + 1); H = Math.max(H, y + 1) }
  const on = new Uint8Array((W + 2) * (H + 2))
  for (const [y, a, b] of runs) for (let x = a; x <= b; x++) on[(y + 1) * (W + 2) + x + 1] = 1
  const at = (x: number, y: number) => on[(y + 1) * (W + 2) + x + 1] === 1
  // Edges by start corner (corner id y * (W + 1) + x); a corner where two areas touch diagonally has two.
  const V = W + 1, edges = new Map<number, number[]>()
  const edge = (x0: number, y0: number, x1: number, y1: number) => { const k = y0 * V + x0; (edges.get(k) ?? edges.set(k, []).get(k)!).push(y1 * V + x1) }
  for (const [y, a, b] of runs) for (let x = a; x <= b; x++) {
    if (!at(x, y - 1)) edge(x, y, x + 1, y)
    if (!at(x + 1, y)) edge(x + 1, y, x + 1, y + 1)
    if (!at(x, y + 1)) edge(x + 1, y + 1, x, y + 1)
    if (!at(x - 1, y)) edge(x, y + 1, x, y)
  }
  const out: string[] = []
  const u = (v: number) => v / 2 / K // doubled px to atom units
  for (const [s0] of edges) {
    while (edges.get(s0)?.length) {
      // One loop: corners in order, turning right where there is a choice, which keeps areas that touch at a corner apart.
      const pts: [number, number][] = []
      let cur = s0, dx = 0, dy = 0
      do {
        const nexts = edges.get(cur)!, cx = cur % V, cy = (cur / V) | 0
        let pick = 0
        if (nexts.length > 1) {
          const turn = (n: number) => { const ex = (n % V) - cx, ey = ((n / V) | 0) - cy; return ex === -dy && ey === dx ? 0 : ex === dx && ey === dy ? 1 : 2 }
          pick = nexts.reduce((best, n, i) => (turn(n) < turn(nexts[best]) ? i : best), 0)
        }
        const n = nexts.splice(pick, 1)[0]
        pts.push([cx, cy])
        dx = (n % V) - cx; dy = ((n / V) | 0) - cy
        cur = n
      } while (cur !== s0)
      // Edge middles (doubled px), then each the mean of its neighbours, which irons the pixel steps out of a border that crosses white (the
      // border under lines moves less than a line is wide), then only the points needed to stay within a quarter pixel.
      const mids = pts.map(([x, y], i) => { const [x1, y1] = pts[(i + 1) % pts.length]; return [x + x1, y + y1] as [number, number] })
      const n = mids.length, at = (i: number) => mids[(i + n) % n]
      const smooth = n < 12 ? mids : mids.map((_, i) => [0, 1].map((c) => (at(i - 2)[c] + at(i - 1)[c] + at(i)[c] + at(i + 1)[c] + at(i + 2)[c]) / 5) as [number, number])
      const keep = simplify(smooth, 0.5)
      const r = (v: number) => Math.round(u(v) * 10) / 10
      let d = `M${Math.round((u(keep[0][0]) + ox) * 10) / 10} ${Math.round((u(keep[0][1]) + oy) * 10) / 10}l`
      for (let i = 1; i < keep.length; i++) d += `${r(keep[i][0] - keep[i - 1][0])} ${r(keep[i][1] - keep[i - 1][1])} `
      out.push(d.trimEnd() + 'z')
    }
  }
  return out.join('')
}

/** A part of an atom's plane: x, y, width, height. */
type Box = [number, number, number, number]

/** What an atom draws, which can pass its own box (an arm, a hand, a bike wheel), snapped out to whole pixels so the pixels inside the box
 *  stay where they were: areas cut at the box would leave the skin square at its edge. */
const boxOf = async (page: Page, A: Atom): Promise<Box> => {
  const [x0, y0, x1, y1] = await page.evaluate((svg) => {
    document.body.innerHTML = svg
    const b = (document.querySelector('svg') as SVGSVGElement).getBBox()
    return [b.x, b.y, b.x + b.width, b.y + b.height]
  }, markup(A, '#000', '#fff'))
  const P = 1 / K, M = 16 // line half-widths past the geometry getBBox measures
  const lo = (v: number) => Math.floor(Math.min(0, v - M) / P) * P, hi = (v: number, e: number) => Math.ceil(Math.max(e, v + M) / P) * P
  const x = lo(x0), y = lo(y0)
  return [x, y, hi(x1, A.width) - x, hi(y1, A.height) - y]
}

/** The atom as an SVG; `cuts` are extra ink lines, for segmenting only, that split a white area the art leaves open (bangs and forehead),
 *  `splits` extra paper lines that split a solid black one (a black shirt over black trousers). */
const markup = (A: Atom, ink: string, paper: string, cuts: string[] = [], [x, y, w, h]: Box = [0, 0, A.width, A.height], splits: string[] = []) => renderToStaticMarkup(createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: `${x} ${y} ${w} ${h}`, width: w, height: h },
  createElement(A, { ink, paper }), ...[...cuts.map((d) => [d, ink]), ...splits.map((d) => [d, paper])].map(([d, stroke], i) => createElement('path', { key: i, d, fill: 'none', stroke, strokeWidth: 8, strokeLinecap: 'round', strokeLinejoin: 'round' }))))

/** What a part of an outfit or a head is, for its own colour. */
const ROLES = ['hair', 'hat', 'top', 'jacket', 'bottoms', 'shoes'] as const
type Role = (typeof ROLES)[number]
/** A white area by its number, or a solid black shape as "k" and its number. */
type Ref = number | `k${number}`
/** A label is the list of skin areas, or that list with the areas of what the atom holds (props, which keep the peep's paper when the
 *  clothes take a colour), the areas of each role, the gap closing (px) and the cuts it was segmented with. */
type Label = number[] | ({ skin: number[]; props?: number[]; close?: number; cuts?: string[]; splits?: string[]; holes?: string[] } & { [R in Role]?: Ref[] })
const labelsOf = (): Record<string, Label> => JSON.parse(readFileSync(LABELS, 'utf8'))
const skinOf = (l: Label | undefined) => (Array.isArray(l) ? l : l?.skin ?? [])
const propsOf = (l: Label | undefined) => (Array.isArray(l) ? [] : l?.props ?? [])
const cutsOf = (l: Label | undefined) => (Array.isArray(l) ? [] : l?.cuts ?? [])
const splitsOf = (l: Label | undefined) => (Array.isArray(l) ? [] : l?.splits ?? [])
const holesOf = (l: Label | undefined) => (Array.isArray(l) ? [] : l?.holes ?? [])
const runsOf = (areas: Area[], list: number[]) => list.flatMap((i) => areas[i].runs)
/** The white areas and solids of each role. A head or a beard's are hair unless labelled otherwise (a hat, a band): its solids, and its
 *  white areas that are not skin. */
function rolesOf(key: string, l: Label | undefined, areas: Area[], black: Area[]): Record<Role, { white: number[]; solid: number[] }> {
  const out = Object.fromEntries(ROLES.map((r) => [r, { white: [] as number[], solid: [] as number[] }])) as Record<Role, { white: number[]; solid: number[] }>
  const taken = new Set<string>(skinOf(l).map(String))
  for (const r of ROLES) for (const ref of (Array.isArray(l) ? [] : l?.[r]) ?? []) {
    const solid = typeof ref === 'string', n = solid ? Number(ref.slice(1)) : ref
    if (!(solid ? black : areas)[n]) throw new Error(`${key} has no ${solid ? 'solid' : 'area'} ${ref}; was the art, K, close or a cut changed?`)
    out[r][solid ? 'solid' : 'white'].push(n)
    taken.add(String(ref))
  }
  if (key.startsWith('head/') || key.startsWith('facialHair/')) {
    out.hair.white.push(...areas.map((_, i) => i).filter((i) => !taken.has(String(i))))
    out.hair.solid.push(...black.map((_, i) => i).filter((i) => !taken.has(`k${i}`)))
  }
  return out
}
const closeArg = Number(process.argv.find((a) => a.startsWith('--close='))?.slice(8) ?? NaN)

async function areasOfAll() {
  const labels = labelsOf()
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const all = new Map<string, { atom: Atom; box: Box; areas: Area[]; solids: Area[] }>()
  for (const c of CATEGORIES) for (const A of catalogue[c].values()) {
    if (A.id === 'none') continue
    const key = `${c}/${A.id}`, l = labels[key]
    // --close=n tries a gap closing on the atoms listed for sheets, before it is written into their labels.
    const close = Number.isFinite(closeArg) ? closeArg : Array.isArray(l) || !l ? 0 : l.close ?? 0
    const box = await boxOf(page, A)
    const areas = await page.evaluate(segment, [markup(A, '#000000', '#ff0000', cutsOf(l), box), box[2], box[3], K, close] as [string, number, number, number, number])
    const black = await page.evaluate(solids, [markup(A, '#000000', '#ffffff', [], box, splitsOf(l)), box[2], box[3], K, RIM] as [string, number, number, number, number])
    const shift = (a: Area) => ({ ...a, cx: a.cx + box[0], cy: a.cy + box[1] })
    all.set(key, { atom: A, box, areas: areas.map(shift), solids: black.map(shift) })
  }
  return { all, page, browser }
}

const mode = process.argv[2]
const { all, page, browser } = await areasOfAll()
if (mode === 'sheets') {
  const dir = process.argv[3]
  mkdirSync(dir, { recursive: true })
  const hue = (i: number) => `hsl(${(i * 67) % 360} 85% 55%)`
  for (const c of CATEGORIES) {
    // An optional list of atoms ("body/coffee,sitting/bike") draws only those, larger, to check a label up close.
    const only = process.argv[4]?.startsWith('--') ? undefined : process.argv[4]?.split(',')
    const keys = [...all.keys()].filter((k) => k.startsWith(c + '/') && (!only || only.includes(k)))
    const per = only ? 4 : c === 'head' || c === 'body' ? 12 : 6, cols = only ? Math.min(2, only.length) : c === 'head' || c === 'body' ? 4 : 3
    for (let s = 0; s * per < keys.length; s++) {
      const cells = keys.slice(s * per, s * per + per).map((key) => {
        const { atom: A, box, areas, solids: black } = all.get(key)!
        const art = markup(A, '#000000', '#ffffff', [], box).replace(/^<svg[^>]*>|<\/svg>$/g, '')
        const fs = Math.max(A.width, A.height) / 22
        const marks = areas.map((a, i) => `<path d="${outline(a.runs, box)}" fill="${hue(i)}" fill-opacity=".55"/><text x="${a.cx}" y="${a.cy}" font-size="${fs}" font-family="sans-serif" font-weight="700" text-anchor="middle" dominant-baseline="middle" fill="#000" stroke="#fff" stroke-width="${fs / 8}" paint-order="stroke">${i}</text>`).join('') +
          black.map((a, i) => `<path d="${outline(a.runs, box)}" fill="hsl(${(i * 67 + 20) % 360} 90% 50%)" fill-opacity=".8"/><text x="${a.cx}" y="${a.cy}" font-size="${fs}" font-family="sans-serif" font-weight="700" text-anchor="middle" dominant-baseline="middle" fill="#fff" stroke="#000" stroke-width="${fs / 8}" paint-order="stroke">k${i}</text>`).join('')
        return `<figure style="margin:0;border:1px solid #ccc"><svg viewBox="${box.join(' ')}" style="width:100%;display:block">${art}${marks}</svg><figcaption style="font:600 18px sans-serif;padding:4px">${key}</figcaption></figure>`
      })
      await page.setViewportSize({ width: 1400, height: 900 })
      await page.setContent(`<body style="margin:8px;background:#fff"><div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:8px">${cells.join('')}</div></body>`)
      await page.screenshot({ path: `${dir}/${c}-${s + 1}.png`, fullPage: true })
    }
  }
  console.log(`sheets in ${dir}; areas per atom:`, [...all].map(([k, v]) => `${k}:${v.areas.length}`).join(' '))
} else if (mode === 'review') {
  // One picture per atom, to check by eye: left, the atom in test colours (skin brown, props white, each role its own, the rest grey);
  // right, every area numbered in the same colours (solids as k0, k1, ...), cuts dashed red. Also a sheet of the left halves, 12 to a page.
  const dir = process.argv[3] ?? 'review/skin'
  mkdirSync(dir, { recursive: true })
  const labels = labelsOf()
  const SKIN = '#8d5524', CLOTHES = '#cfcfcf', PROP = '#ffffff'
  const TEST: Record<Role, string> = { hair: '#e0533d', hat: '#8e44ad', top: '#38b6ff', jacket: '#16a085', bottoms: '#3048c8', shoes: '#f39c12' }
  const pictures: [string, string][] = []
  for (const [key, { atom: A, box, areas, solids: black }] of all) {
    const l = labels[key], skin = new Set(skinOf(l)), props = new Set(propsOf(l)), roles = rolesOf(key, l, areas, black)
    const roleOf = (i: number, solid = false) => ROLES.find((r) => roles[r][solid ? 'solid' : 'white'].includes(i))
    const valid = (set: Set<number>) => [...set].filter((i) => areas[i])
    const art = (paper: string, ink = '#111111') => markup(A, ink, paper, [], box).replace(/^<svg[^>]*>|<\/svg>$/g, '')
    const id = key.replace('/', '-')
    const clipped = (name: string, list: number[], paper: string, from = areas, ink?: string) => list.length ? `<mask id="${name}${id}"><path fill="#fff" d="${outline(runsOf(from, list), box)}"/></mask><g mask="url(#${name}${id})">${art(ink ? '#ffffff' : paper, ink)}</g>` : ''
    const roleLayers = ROLES.map((r) => clipped(`w${r}`, roles[r].white, TEST[r]) + clipped(`b${r}`, roles[r].solid, '', black, TEST[r])).join('')
    const holes = holesOf(l).map((d) => `<path d="${d}" fill="${SKIN}"/>`).join('')
    const coloured = `<svg viewBox="${box.join(' ')}" style="width:100%;display:block;background:#f7d56e">${holes}${art(CLOTHES)}${clipped('p', valid(props), PROP)}${roleLayers}${clipped('s', valid(skin), SKIN)}</svg>`
    const fs = Math.max(A.width, A.height) / 20
    const fill = (i: number) => (skin.has(i) ? SKIN : props.has(i) ? PROP : TEST[roleOf(i)!] ?? CLOTHES)
    const cuts = cutsOf(l).map((c) => `<path d="${c}" fill="none" stroke="#e00" stroke-width="10" stroke-dasharray="24 16"/>`).join('')
    const marks = areas.map((a, i) => `<path d="${outline(a.runs, box)}" fill="${fill(i)}" fill-opacity="${skin.has(i) ? 0.85 : 0.55}"/><text x="${a.cx}" y="${a.cy}" font-size="${fs}" font-family="sans-serif" font-weight="800" text-anchor="middle" dominant-baseline="middle" fill="${skin.has(i) ? '#fff' : '#000'}" stroke="${skin.has(i) ? '#000' : '#fff'}" stroke-width="${fs / 7}" paint-order="stroke">${i}</text>`).join('') +
      black.map((a, i) => `<path d="${outline(a.runs, box)}" fill="${TEST[roleOf(i, true)!] ?? '#555'}" fill-opacity=".8"/><text x="${a.cx}" y="${a.cy}" font-size="${fs * 0.8}" font-family="sans-serif" font-weight="800" text-anchor="middle" dominant-baseline="middle" fill="#fff" stroke="#000" stroke-width="${fs / 7}" paint-order="stroke">k${i}</text>`).join('')
    const numbered = `<svg viewBox="${box.join(' ')}" style="width:100%;display:block;background:#fff">${art('#ffffff')}${marks}${cuts}</svg>`
    pictures.push([key, coloured])
    await page.setViewportSize({ width: 1200, height: 700 })
    await page.setContent(`<body style="margin:0;font:600 20px sans-serif"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px">${coloured}${numbered}</div><div style="padding:0 12px 12px">${key} &middot; skin areas: ${[...skin].join(', ') || 'none'} &middot; props: ${[...props].join(', ') || 'none'}${ROLES.map((r) => roles[r].white.length || roles[r].solid.length ? ` &middot; ${r}: ${[...roles[r].white, ...roles[r].solid.map((i) => `k${i}`)].join(', ')}` : '').join('')} &middot; ${areas.length} areas, ${black.length} solids</div></body>`)
    await page.screenshot({ path: `${dir}/${id}.png`, fullPage: true })
  }
  for (let s = 0; s * 12 < pictures.length; s++) {
    await page.setViewportSize({ width: 1400, height: 900 })
    await page.setContent(`<body style="margin:8px"><div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px">${pictures.slice(s * 12, s * 12 + 12).map(([k, svg]) => `<figure style="margin:0">${svg}<figcaption style="font:600 13px sans-serif">${k}</figcaption></figure>`).join('')}</div></body>`)
    await page.screenshot({ path: `${dir}/_sheet-${String(s + 1).padStart(2, '0')}.png`, fullPage: true })
  }
  console.log(`${pictures.length} pictures in ${dir}`)
} else if (mode === 'write') {
  const labels = labelsOf()
  const skin: string[] = [], props: string[] = [], holes: string[] = [], roles: string[] = [], whites: string[] = []
  for (const A of catalogue.face.values()) {
    const box = await boxOf(page, A)
    const runs = await page.evaluate(enclosed, [markup(A, '#000000', '#ffffff', [], box), box[2], box[3], K, 2] as [string, number, number, number, number])
    if (runs.length) whites.push(`  ${JSON.stringify(`face/${A.id}`)}: ${JSON.stringify(outline(runs, box))},`)
  }
  for (const [key, { box, areas, solids: black }] of all) {
    if (!labels[key] && !key.startsWith('facialHair/')) throw new Error(`no label for ${key}: add its skin areas to skin-labels.json (an empty list for none)`)
    const parts = Object.entries(rolesOf(key, labels[key], areas, black)).flatMap(([r, { white, solid }]) => white.length || solid.length
      ? [`${r}: { ${[white.length ? `paper: ${JSON.stringify(outline(runsOf(areas, white), box))}` : '', solid.length ? `ink: ${JSON.stringify(outline(runsOf(black, solid), box))}` : ''].filter(Boolean).join(', ')} }`] : [])
    if (parts.length) roles.push(`  ${JSON.stringify(key)}: { ${parts.join(', ')} },`)
    if (key.startsWith('facialHair/')) continue
    const s = skinOf(labels[key]), p = propsOf(labels[key])
    for (const i of [...s, ...p]) if (!areas[i]) throw new Error(`${key} has no area ${i} (it has ${areas.length}); was the art, K, close or a cut changed?`)
    skin.push(`  ${JSON.stringify(key)}: ${JSON.stringify(outline(runsOf(areas, s), box))},`)
    if (p.length) props.push(`  ${JSON.stringify(key)}: ${JSON.stringify(outline(runsOf(areas, p), box))},`)
    if (holesOf(labels[key]).length) holes.push(`  ${JSON.stringify(key)}: ${JSON.stringify(holesOf(labels[key]).join(''))},`)
  }
  writeFileSync(OUT, `// Generated by scripts/build-peeps-skin.ts from scripts/skin-labels.json. Do not edit.
// In each atom's own units: clips for drawing a body, pose or head atom again in another paper.
/** The skin of each atom, for the skin colour. */
export const skin: Readonly<Record<string, string>> = {\n${skin.join('\n')}\n}
/** What an atom holds (a phone, a bike), which keeps the peep's paper when its clothes take a colour. */
export const props: Readonly<Record<string, string>> = {\n${props.join('\n')}\n}
/** Gaps the art leaves unpainted inside the skin (the inside of an elbow), filled in the skin colour under the atom. */
export const holes: Readonly<Record<string, string>> = {\n${holes.join('\n')}\n}
/** What a part of an outfit or a head is, for its own colour. */
export type Role = ${ROLES.map((r) => `'${r}'`).join(' | ')}
/** The areas of each role: \`paper\`, white areas, drawn again in the role's colour as paper; \`ink\`, solid black shapes (hair, a black shirt)
 *  less their edge, drawn again in it as ink. */
export const roles: Readonly<Record<string, Partial<Record<Role, { paper?: string; ink?: string }>>>> = {\n${roles.join('\n')}\n}
/** The whites of each face the pack leaves see-through (eyes, teeth, a tear), filled in the face's paper under its lines. */
export const whites: Readonly<Record<string, string>> = {\n${whites.join('\n')}\n}\n`)
  console.log(`wrote ${OUT.pathname}: ${skin.length} atoms, ${props.length} with props, ${(readFileSync(OUT).length / 1024).toFixed(0)} KB`)
} else console.log('usage: build-peeps-skin.ts sheets <dir> [atoms] | review [dir] | write')
await browser.close()
