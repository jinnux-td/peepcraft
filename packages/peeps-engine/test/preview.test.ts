// The preview's pixels: fills, holes, strokes, arcs and transforms on small pictures, and every figure and thing without an error.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { catalog, previewPng, renderSvg } from '../src/index.ts'

/** Reads back an 8-bit RGB PNG with no line filters, as previewPng writes it, and checks each chunk's length. */
async function pixels(svg: string, size = 100) {
  const { png, width, height } = await previewPng(svg, size)
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
  const view = new DataView(png.buffer, png.byteOffset), names: string[] = []
  let idat: Uint8Array | undefined
  for (let at = 8; at < png.length;) {
    const n = view.getUint32(at), name = String.fromCharCode(...png.subarray(at + 4, at + 8))
    names.push(name)
    if (name === 'IDAT') idat = png.subarray(at + 8, at + 8 + n)
    at += 12 + n
  }
  assert.deepEqual(names, ['IHDR', 'IDAT', 'IEND'])
  const raw = new Uint8Array(await new Response(new Blob([idat! as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer())
  assert.equal(raw.length, (width * 3 + 1) * height)
  return { width, height, at: (x: number, y: number) => [...raw.subarray(y * (width * 3 + 1) + 1 + x * 3, y * (width * 3 + 1) + 1 + x * 3 + 3)] }
}
const picture = (body: string, box = '0 0 100 100') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" width="1024" height="1024">${body}</svg>`
const RED = [255, 0, 0], WHITE = [255, 255, 255], BLUE = [0, 0, 255]

test('fills a rect on white, in the viewBox, in later-over-earlier order', async () => {
  const p = await pixels(picture('<rect x="10" y="10" width="20" height="20" fill="#ff0000"></rect><rect x="20" y="20" width="20" height="20" fill="#00f"></rect>', '10 10 100 100'))
  assert.deepEqual(p.at(5, 5), RED); assert.deepEqual(p.at(25, 25), BLUE); assert.deepEqual(p.at(60, 60), WHITE)
})

test('even-odd leaves the hole; non-zero fills it', async () => {
  const d = 'M10 10H90V90H10ZM30 30H70V70H30Z'
  const odd = await pixels(picture(`<path d="${d}" fill="#ff0000" fill-rule="evenodd"></path>`))
  assert.deepEqual(odd.at(50, 50), WHITE); assert.deepEqual(odd.at(20, 50), RED)
  const non = await pixels(picture(`<path d="${d}" fill="#ff0000"></path>`))
  assert.deepEqual(non.at(50, 50), RED)
})

test('transforms nest; groups in defs or under a filter are not drawn', async () => {
  const p = await pixels(picture('<g transform="translate(50 0)"><g transform="scale(2 2)"><rect x="0" y="0" width="10" height="10" fill="#ff0000"></rect></g></g><defs><g><rect x="0" y="50" width="10" height="10" fill="#0000ff"></rect></g></defs><g filter="url(#a)"><g><rect x="0" y="70" width="10" height="10" fill="#0000ff"></rect></g></g><rect x="90" y="90" width="10" height="10" fill="#0000ff"></rect>'))
  assert.deepEqual(p.at(60, 10), RED); assert.deepEqual(p.at(40, 10), WHITE); assert.deepEqual(p.at(5, 55), WHITE); assert.deepEqual(p.at(5, 75), WHITE); assert.deepEqual(p.at(95, 95), BLUE, 'drawing goes on after them')
  const turned = await pixels(picture('<g transform="translate(50 50) rotate(90)"><rect x="10" y="-5" width="30" height="10" fill="#ff0000"></rect></g>'))
  assert.deepEqual(turned.at(50, 75), RED); assert.deepEqual(turned.at(75, 50), WHITE)
})

test('a stroke is solid where its boxes and discs overlap, with round ends', async () => {
  const p = await pixels(picture('<path d="M20 50H80V80" fill="none" stroke="#ff0000" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"></path>'))
  for (const [x, y] of [[20, 50], [50, 50], [80, 50], [80, 65], [80, 80]]) assert.deepEqual(p.at(x, y), RED, `${x},${y}`)
  assert.deepEqual(p.at(50, 60), WHITE); assert.deepEqual(p.at(13, 44), WHITE, 'a round end, not a square one')
})

test('curves, arcs and relative commands land where they should', async () => {
  const arc = await pixels(picture('<path d="M20 50A30 30 0 0 1 80 50A30 30 0 0 1 20 50Z" fill="#ff0000"></path>'))
  assert.deepEqual(arc.at(50, 50), RED); assert.deepEqual(arc.at(50, 22), RED); assert.deepEqual(arc.at(50, 78), RED); assert.deepEqual(arc.at(22, 22), WHITE)
  const glued = await pixels(picture('<path d="m20 50a30 30 0 01 60 0a30 30 0 01-60 0z" fill="#ff0000"></path>'))
  assert.deepEqual(glued.at(50, 22), RED)
  const curve = await pixels(picture('<path d="M10 90C10 10 90 10 90 90S50 50 10 90ZM40 95Q50 80 60 95T80 95" fill="#ff0000"></path>'))
  assert.deepEqual(curve.at(50, 40), RED); assert.deepEqual(curve.at(5, 5), WHITE)
})

test('off the picture: clipped, and what lies left of it still counts for the row', async () => {
  const p = await pixels(picture('<rect x="-50" y="-50" width="100" height="100" fill="#ff0000"></rect><rect x="80" y="80" width="500" height="500" fill="#0000ff"></rect>'))
  assert.deepEqual(p.at(0, 0), RED); assert.deepEqual(p.at(49, 49), RED); assert.deepEqual(p.at(60, 60), WHITE); assert.deepEqual(p.at(99, 99), BLUE); assert.deepEqual(p.at(79, 99), WHITE)
})

test('a path wholly off the picture leaves nothing behind for the next one', async () => {
  const p = await pixels(picture('<rect x="-50" y="10" width="20" height="80" fill="#0000ff"></rect><rect x="150" y="10" width="20" height="80" fill="#0000ff"></rect><rect x="40" y="40" width="20" height="20" fill="#ff0000"></rect>'))
  for (const [x, y] of [[0, 50], [1, 50], [30, 50], [70, 50], [99, 50]]) assert.deepEqual(p.at(x, y), WHITE, `${x},${y}`)
  assert.deepEqual(p.at(50, 50), RED)
})

test('keeps the shape of the picture, and refuses what it cannot read', async () => {
  const wide = await previewPng(picture('', '0 0 1600 900'), 512)
  assert.deepEqual([wide.width, wide.height], [512, 288])
  await assert.rejects(previewPng('<svg></svg>'), /no viewBox/)
  await assert.rejects(previewPng(picture('<path d="M0 0B1 1" fill="#000000"></path>')), /no path command/)
})

test('every figure and thing draws', async () => {
  for (const item of catalog().items) {
    const member = item.category === 'figure' ? { figure: item.id } : item.category === 'thing' ? { thing: item.id } : undefined
    if (!member) continue
    const { svg } = await renderSvg({ v: 1, scene: [member] })
    const { png } = await previewPng(svg, 64)
    assert.ok(png.length > 100, item.id)
  }
})
