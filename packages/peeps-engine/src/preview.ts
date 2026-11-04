// A PNG preview of a picture renderSvg drew, with no browser and no dependency, so it runs in a Worker (resvg is MPL-2.0 and too big for one:
// kit rule 4, docs/peepcraft-platform.md §12). It reads only what the art uses: g, rect and path, fills, round strokes, transforms. The fill
// is signed-area coverage accumulation, as in font-rs (Apache-2.0). Saving a picture still goes through a real browser, this is for looking.
type Matrix = [number, number, number, number, number, number]
type Point = [number, number]

const multiply = (m: Matrix, [a, b, c, d, e, f]: Matrix): Matrix => [m[0] * a + m[2] * b, m[1] * a + m[3] * b, m[0] * c + m[2] * d, m[1] * c + m[3] * d, m[0] * e + m[2] * f + m[4], m[1] * e + m[3] * f + m[5]]

function parseTransform(text: string): Matrix {
  let m: Matrix = [1, 0, 0, 1, 0, 0]
  for (const [, name, list] of text.matchAll(/(\w+)\(([^)]*)\)/g)) {
    const n = list.trim().split(/[\s,]+/).map(Number)
    if (name === 'translate') m = multiply(m, [1, 0, 0, 1, n[0], n[1] ?? 0])
    else if (name === 'scale') m = multiply(m, [n[0], 0, 0, n[1] ?? n[0], 0, 0])
    else if (name === 'rotate') { const r = (n[0] * Math.PI) / 180; m = multiply(m, [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0]) }
    else throw new Error(`preview: no transform ${name}`)
  }
  return m
}

const NUMBER = /[\s,]*([-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?)/y, FLAG = /[\s,]*([01])/y, COMMAND = /[\s,]*([a-zA-Z])/y

/** An arc as cubics (the SVG implementation notes' endpoint to centre conversion), called with each cubic's three points. */
function arc(x0: number, y0: number, rx: number, ry: number, degrees: number, large: number, sweep: number, x: number, y: number, cubic: (a: Point, b: Point, c: Point) => void) {
  rx = Math.abs(rx); ry = Math.abs(ry)
  if (!rx || !ry) return cubic([x0, y0], [x, y], [x, y])
  const phi = (degrees * Math.PI) / 180, cos = Math.cos(phi), sin = Math.sin(phi)
  const dx = (x0 - x) / 2, dy = (y0 - y) / 2, px = cos * dx + sin * dy, py = cos * dy - sin * dx
  const grow = Math.max(1, Math.sqrt((px * px) / (rx * rx) + (py * py) / (ry * ry))); rx *= grow; ry *= grow
  const rest = rx * rx * py * py + ry * ry * px * px
  const k = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, (rx * rx * ry * ry - rest) / rest))
  const cx = (k * rx * py) / ry, cy = (-k * ry * px) / rx
  const start = Math.atan2((py - cy) / ry, (px - cx) / rx)
  let delta = Math.atan2((-py - cy) / ry, (-px - cx) / rx) - start
  if (sweep && delta < 0) delta += 2 * Math.PI
  if (!sweep && delta > 0) delta -= 2 * Math.PI
  const parts = Math.ceil(Math.abs(delta) / (Math.PI / 2) - 1e-9) || 1, step = delta / parts, t = (4 / 3) * Math.tan(step / 4)
  const place = (u: number, v: number): Point => [cos * rx * u - sin * ry * v + (x0 + x) / 2, sin * rx * u + cos * ry * v + (y0 + y) / 2]
  for (let i = 0; i < parts; i++) {
    const a = start + i * step, b = a + step, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), ox = cx / rx, oy = cy / ry
    cubic(place(ox + ca - t * sa, oy + sa + t * ca), place(ox + cb + t * sb, oy + sb - t * cb), place(ox + cb, oy + sb))
  }
}

/** A path's d as polylines in pixels, curves flattened to a quarter of a pixel; closed tells a stroke to join the ends. */
function flatten(d: string, m: Matrix): { points: Point[]; closed: boolean }[] {
  const place = (x: number, y: number): Point => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
  const out: { points: Point[]; closed: boolean }[] = []
  let line: Point[] = [], x = 0, y = 0, sx = 0, sy = 0, cx = 0, cy = 0, at = 0, command = ''
  const read = (re: RegExp) => { re.lastIndex = at; const hit = re.exec(d); if (!hit) throw new Error(`preview: bad path at ${at}`); at = re.lastIndex; return Number(hit[1]) }
  const end = (closed: boolean) => { if (line.length > 1) out.push({ points: line, closed }); line = [] }
  const cubic = (a: Point, b: Point, c: Point) => {
    const p0 = place(x, y), p1 = place(a[0], a[1]), p2 = place(b[0], b[1]), p3 = place(c[0], c[1])
    // How many segments keep the curve within a quarter pixel (Wang's bound).
    const bend = Math.max(Math.hypot(p0[0] - 2 * p1[0] + p2[0], p0[1] - 2 * p1[1] + p2[1]), Math.hypot(p1[0] - 2 * p2[0] + p3[0], p1[1] - 2 * p2[1] + p3[1]))
    const n = Math.min(64, Math.max(1, Math.ceil(Math.sqrt(3 * bend))))
    for (let i = 1; i <= n; i++) {
      const t = i / n, u = 1 - t, q0 = u * u * u, q1 = 3 * u * u * t, q2 = 3 * u * t * t, q3 = t * t * t
      line.push([q0 * p0[0] + q1 * p1[0] + q2 * p2[0] + q3 * p3[0], q0 * p0[1] + q1 * p1[1] + q2 * p2[1] + q3 * p3[1]])
    }
    cx = b[0]; cy = b[1]; x = c[0]; y = c[1]
  }
  while (at < d.length) {
    COMMAND.lastIndex = at
    const hit = COMMAND.exec(d)
    if (hit) { command = hit[1]; at = COMMAND.lastIndex } else if (!d.slice(at).trim()) break
    const rel = command === command.toLowerCase(), ox = rel ? x : 0, oy = rel ? y : 0, kind = command.toUpperCase()
    if (kind === 'M') { end(false); x = sx = read(NUMBER) + ox; y = sy = read(NUMBER) + oy; line.push(place(x, y)); command = rel ? 'l' : 'L'; cx = x; cy = y }
    else if (kind === 'L' || kind === 'H' || kind === 'V') {
      if (kind !== 'V') x = read(NUMBER) + ox
      if (kind !== 'H') y = read(NUMBER) + oy
      line.push(place(x, y)); cx = x; cy = y
    } else if (kind === 'C') { const a: Point = [read(NUMBER) + ox, read(NUMBER) + oy], b: Point = [read(NUMBER) + ox, read(NUMBER) + oy]; cubic(a, b, [read(NUMBER) + ox, read(NUMBER) + oy]) }
    else if (kind === 'S') { const a: Point = [2 * x - cx, 2 * y - cy], b: Point = [read(NUMBER) + ox, read(NUMBER) + oy]; cubic(a, b, [read(NUMBER) + ox, read(NUMBER) + oy]) }
    else if (kind === 'Q' || kind === 'T') {
      const q: Point = kind === 'Q' ? [read(NUMBER) + ox, read(NUMBER) + oy] : [2 * x - cx, 2 * y - cy], c: Point = [read(NUMBER) + ox, read(NUMBER) + oy]
      cubic([x + (2 / 3) * (q[0] - x), y + (2 / 3) * (q[1] - y)], [c[0] + (2 / 3) * (q[0] - c[0]), c[1] + (2 / 3) * (q[1] - c[1])], c); cx = q[0]; cy = q[1]
    } else if (kind === 'A') {
      const rx = read(NUMBER), ry = read(NUMBER), angle = read(NUMBER), large = read(FLAG), sweep = read(FLAG), ex = read(NUMBER) + ox, ey = read(NUMBER) + oy
      arc(x, y, rx, ry, angle, large, sweep, ex, ey, cubic); x = ex; y = ey
    } else if (kind === 'Z') { end(true); x = sx; y = sy; line.push(place(x, y)); cx = x; cy = y; command = '' }
    else throw new Error(`preview: no path command ${command}`)
  }
  end(false)
  return out
}

/** Fills polygons on the pixels. */
class Canvas {
  readonly width: number
  readonly height: number
  readonly rgb: Uint8Array
  private readonly a: Float32Array
  private readonly row: number
  constructor(width: number, height: number) {
    this.width = width; this.height = height
    this.rgb = new Uint8Array(width * height * 3).fill(255) // on white: a transparent picture's black lines would vanish on a dark terminal
    this.row = width + 2
    this.a = new Float32Array(this.row * height)
  }

  private edge(ax: number, ay: number, bx: number, by: number) {
    if (ay === by) return
    const dir = ay < by ? 1 : -1, x0 = dir > 0 ? ax : bx, y0 = dir > 0 ? ay : by, x1 = dir > 0 ? bx : ax, y1 = dir > 0 ? by : ay
    const slope = (x1 - x0) / (y1 - y0), W = this.width, a = this.a
    const first = Math.max(0, Math.floor(y0)), last = Math.min(this.height, Math.ceil(y1))
    for (let y = first; y < last; y++) {
      const top = Math.max(y, y0), bottom = Math.min(y + 1, y1), d = (bottom - top) * dir, base = y * this.row
      // Clamped to the picture: what lies left of it still counts for the row, what lies right of it never does.
      const p = Math.min(W, Math.max(0, x0 + (top - y0) * slope)), q = Math.min(W, Math.max(0, x0 + (bottom - y0) * slope))
      const lo = Math.min(p, q), hi = Math.max(p, q), floor = Math.floor(lo), i = floor, j = Math.ceil(hi)
      if (j <= i + 1) { const f = (lo + hi) / 2 - floor; a[base + i] += d - d * f; a[base + i + 1] += d * f; continue }
      const s = 1 / (hi - lo), f0 = lo - floor, a0 = 0.5 * s * (1 - f0) * (1 - f0), f1 = hi - j + 1, am = 0.5 * s * f1 * f1
      a[base + i] += d * a0
      if (j === i + 2) a[base + i + 1] += d * (1 - a0 - am)
      else {
        const a1 = s * (1.5 - f0)
        a[base + i + 1] += d * (a1 - a0)
        for (let k = i + 2; k < j - 1; k++) a[base + k] += d * s
        a[base + j - 1] += d * (1 - (a1 + (j - i - 3) * s) - am)
      }
      a[base + j] += d * am
    }
  }

  fill(polygons: Point[][], colour: [number, number, number], evenOdd: boolean) {
    let top = Infinity, bottom = -Infinity
    for (const poly of polygons) for (let i = 0, n = poly.length; i < n; i++) {
      const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % n]
      this.edge(ax, ay, bx, by)
      if (ay < top) top = ay
      if (ay > bottom) bottom = ay
    }
    const from = Math.max(0, Math.floor(top)), to = Math.min(this.height, Math.ceil(bottom)), [r, g, b] = colour, { a, rgb, row, width } = this
    for (let y = from; y < to; y++) {
      let sum = 0, base = y * row, px = y * width * 3
      for (let x = 0; x < width; x++, px += 3) {
        const v = a[base + x]
        if (v) { sum += v; a[base + x] = 0 }
        let cover = Math.abs(sum)
        if (evenOdd) { cover %= 2; if (cover > 1) cover = 2 - cover } else if (cover > 1) cover = 1
        if (cover < 0.004) continue
        if (cover > 0.996) { rgb[px] = r; rgb[px + 1] = g; rgb[px + 2] = b; continue }
        rgb[px] += (r - rgb[px]) * cover; rgb[px + 1] += (g - rgb[px + 1]) * cover; rgb[px + 2] += (b - rgb[px + 2]) * cover
      }
      a[base + width] = 0; a[base + width + 1] = 0
    }
  }
}

/** A round-capped, round-joined stroke: a box per segment and a disc per point, all wound one way, so that they add up to their union. */
function strokePolygons(lines: { points: Point[]; closed: boolean }[], half: number): Point[][] {
  const out: Point[][] = [], sides = Math.max(8, Math.min(24, Math.ceil(half * 4)))
  const disc = ([x, y]: Point) => out.push(Array.from({ length: sides }, (_, i): Point => [x + half * Math.cos((i * 2 * Math.PI) / sides), y + half * Math.sin((i * 2 * Math.PI) / sides)]))
  for (const { points, closed } of lines) {
    const n = points.length
    for (let i = 0; i < n; i++) disc(points[i])
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const [ax, ay] = points[i], [bx, by] = points[(i + 1) % n], len = Math.hypot(bx - ax, by - ay)
      if (!len) continue
      const ux = ((by - ay) / len) * half, uy = ((ax - bx) / len) * half
      out.push([[ax + ux, ay + uy], [bx + ux, by + uy], [bx - ux, by - uy], [ax - ux, ay - uy]])
    }
  }
  return out
}

const colourOf = (text: string): [number, number, number] => {
  const hex = text.length === 4 ? [...text.slice(1)].map((c) => c + c).join('') : text.slice(1)
  const n = parseInt(hex, 16)
  if (!/^[0-9a-f]{6}$/i.test(hex)) throw new Error(`preview: no colour ${text}`)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const TABLE = /* @__PURE__ */ Uint32Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
function chunk(name: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length), view = new DataView(out.buffer)
  view.setUint32(0, data.length)
  for (let i = 0; i < 4; i++) out[4 + i] = name.charCodeAt(i)
  out.set(data, 8)
  let crc = 0xffffffff
  for (let i = 4; i < 8 + data.length; i++) crc = TABLE[(crc ^ out[i]) & 255] ^ (crc >>> 8)
  view.setUint32(8 + data.length, (crc ^ 0xffffffff) >>> 0)
  return out
}

async function encodePng(rgb: Uint8Array, width: number, height: number): Promise<Uint8Array> {
  const raw = new Uint8Array((width * 3 + 1) * height)
  for (let y = 0; y < height; y++) raw.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), y * (width * 3 + 1) + 1)
  const deflated = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer())
  const header = new Uint8Array(13), view = new DataView(header.buffer)
  view.setUint32(0, width); view.setUint32(4, height); header[8] = 8; header[9] = 2 // 8 bits, RGB
  const parts = [Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10), chunk('IHDR', header), chunk('IDAT', deflated), chunk('IEND', new Uint8Array())]
  const png = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) { png.set(p, at); at += p.length }
  return png
}

/** The picture as an opaque PNG, on white, longSide pixels on its long side. shortcut: the Aura extra's glow (an SVG filter) is left out, draw it here if a preview must show it. */
export async function previewPng(svg: string, longSide = 512): Promise<{ png: Uint8Array; width: number; height: number }> {
  const box = /viewBox="([^"]+)"/.exec(svg)?.[1].split(/[\s,]+/).map(Number)
  if (!box || box.length !== 4) throw new Error('preview: no viewBox')
  const scale = longSide / Math.max(box[2], box[3]), width = Math.max(1, Math.round(box[2] * scale)), height = Math.max(1, Math.round(box[3] * scale))
  const canvas = new Canvas(width, height)
  const stack: Matrix[] = [[scale, 0, 0, scale, -box[0] * scale, -box[1] * scale]]
  let skip = 0 // inside defs or a filtered group: not drawn as itself
  for (const [, close, name, body, empty] of svg.matchAll(/<(\/?)(\w+)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>/g)) {
    if (name !== 'g' && name !== 'defs' && name !== 'path' && name !== 'rect') continue
    if (close) { if (name === 'g' || name === 'defs') { stack.pop(); if (skip) skip-- } continue }
    const attr = (key: string) => new RegExp(`\\s${key}="([^"]*)"`).exec(body)?.[1]
    const transform = attr('transform'), m = transform ? multiply(stack[stack.length - 1], parseTransform(transform)) : stack[stack.length - 1]
    if (name === 'g' || name === 'defs') {
      if (skip || name === 'defs' || attr('filter')) skip++
      if (!empty) stack.push(m)
      else if (skip) skip--
      continue
    }
    if (skip) continue
    const fill = attr('fill'), stroke = attr('stroke')
    const lines = name === 'path' ? flatten(attr('d') ?? '', m) : (() => {
      const x = Number(attr('x') ?? 0), y = Number(attr('y') ?? 0), w = Number(attr('width')), h = Number(attr('height'))
      return flatten(`M${x} ${y}H${x + w}V${y + h}H${x}Z`, m)
    })()
    if (fill !== 'none') canvas.fill(lines.map((l) => l.points), colourOf(fill ?? '#000000'), attr('fill-rule') === 'evenodd')
    if (stroke && stroke !== 'none') canvas.fill(strokePolygons(lines, (Number(attr('stroke-width') ?? 1) * Math.hypot(m[0], m[1])) / 2), colourOf(stroke), false)
  }
  return { png: await encodePng(canvas.rgb, width, height), width, height }
}
