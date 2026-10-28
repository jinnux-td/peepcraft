import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { catalogue, defaults, Peep, lookup, type Category, type PartColors } from '../src/index.ts'

const counts: Record<Category, number> = { accessories: 9, body: 30, face: 33, facialHair: 17, head: 48, mask: 3, sitting: 11, standing: 26 }

test('every atom of the pack is in the catalogue', () => {
  for (const [category, n] of Object.entries(counts)) assert.equal(catalogue[category as Category].size, n, category)
})

test('every atom renders a group with paths, and takes ink and paper', () => {
  for (const [category, atoms] of Object.entries(catalogue)) for (const A of atoms.values()) {
    const html = renderToStaticMarkup(createElement(A, { ink: '#112233', paper: '#ddeeff' }))
    assert.match(html, /^<g>/, `${category}/${A.id}`)
    // A mask's white is how much shows, not a colour: one-leg-up-2 masks its lines, and a paper-coloured mask faded them.
    assert.doesNotMatch(html.replace(/<mask[^>]*>/g, ''), /#000000|#FFFFFF/i, `${category}/${A.id} keeps a hard-coded black or white`)
  }
})

test('defaults name real atoms', () => {
  for (const [type, d] of Object.entries(defaults)) {
    const body = type === 'bust' ? 'body' : (type as 'standing' | 'sitting')
    lookup(body, d.body); lookup('head', d.head); lookup('face', d.face); lookup('facialHair', d.facialHair); lookup('mask', d.mask); lookup('accessories', d.accessories)
  }
})

test('a missing part becomes the default of its type', () => {
  for (const type of ['standing', 'sitting', 'bust'] as const) {
    assert.deepEqual(new Peep({ type }).parts, defaults[type])
    assert.deepEqual(new Peep({ type, face: 'calm' }).parts, { ...defaults[type], face: 'calm' })
  }
  assert.equal(new Peep({ type: 'full' }).type, 'standing')
  assert.equal(new Peep({ type: 'half' }).type, 'bust')
  assert.equal(new Peep().type, 'standing')
})

test('a body of the wrong type or an unknown id is refused, naming the choices', () => {
  assert.throws(() => new Peep({ type: 'bust', body: 'crossed-arms-1' }).layout(), /no body atom "crossed-arms-1"; known: .*tee-1/)
  assert.throws(() => new Peep({ head: 'nope' }).layout(), /no head atom "nope"/)
})

test('layout is deterministic and puts parts back to front', () => {
  const a = renderToStaticMarkup(new Peep({ type: 'sitting', head: 'afro' }).render())
  assert.equal(a, renderToStaticMarkup(new Peep({ type: 'sitting', head: 'afro' }).render()))
  assert.deepEqual(new Peep().layout().map((p) => p.slot), ['body', 'head', 'face', 'facialHair', 'mask', 'accessories'])
  assert.match(a, /^<svg viewBox="0 0 1647 2500"/)
})

test('an atom is plain paths, one per layer group of its Figma symbol, no masks or ids', () => {
  const html = renderToStaticMarkup(createElement('svg', null, createElement(lookup('sitting', 'one-leg-up-2'))))
  assert.doesNotMatch(html, / id="|<mask|<clipPath/)
  assert.deepEqual([...new Set([...html.matchAll(/data-piece="([^"]+)"/g)].map((m) => m[1]))], ['skin', 'shoes', 'top', 'ink'])
})

test('a background is a rectangle over the box, or nothing when transparent', async () => {
  const { Background } = await import('../src/index.ts')
  const box = { x: -10, y: 5, width: 100, height: 200 }
  assert.equal(renderToStaticMarkup(new Background('#f7d56e').render(box)), '<rect x="-10" y="5" width="100" height="200" fill="#f7d56e" data-layer="background"></rect>')
  for (const none of [undefined, 'transparent', 'Transparent', '  ', '']) {
    const b = new Background(none)
    assert.equal(b.transparent, true, String(none))
    assert.equal(b.render(box), null)
  }
})

test('every piece comes in its Figma colour: the skin, a top, the black lines; white ones take the paper', () => {
  const html = renderToStaticMarkup(new Peep({ type: 'bust', body: 'coffee', paper: '#fde9d0' }).group())
  const fills = (piece: string) => new Set([...html.matchAll(new RegExp(`fill="([^"]+)"[^>]*data-piece="${piece}"`, 'g'))].map((m) => m[1]))
  assert.deepEqual(fills('skin'), new Set(['#d08b5b']))
  assert.deepEqual(fills('top'), new Set(['#9ddadb']))
  assert.deepEqual(fills('cup'), new Set(['#fdea6b']))
  assert.deepEqual(fills('ink'), new Set(['#000000']))
  assert.match(renderToStaticMarkup(new Peep({ type: 'bust', face: 'awe', paper: '#fde9d0' }).group()), /fill="#fde9d0"[^>]*data-piece="eye"/, 'the whites of the eyes are the paper')
})

test('a part can take its own ink, paper and pieces; the rest keeps the peep colours', () => {
  const html = renderToStaticMarkup(new Peep({ ink: '#111111', colors: { head: { ink: '#6b2d1a', bandana: '#c68642' }, body: { top: '#e63946' } } }).group())
  const slot = (name: string) => html.slice(html.indexOf(`data-slot="${name}"`), html.indexOf('data-slot=', html.indexOf(`data-slot="${name}"`) + 1) >>> 0)
  assert.match(slot('head'), /fill="#6b2d1a"[^>]*data-piece="ink"/); assert.match(slot('head'), /fill="#c68642"[^>]*data-piece="bandana"/)
  assert.match(slot('body'), /fill="#111111"[^>]*data-piece="ink"/); assert.match(slot('body'), /fill="#e63946"[^>]*data-piece="top"/)
  assert.deepEqual(new Peep().colors, {})
})

test('one skin colour for head and body, under a part\'s own', () => {
  const skins = (o: ConstructorParameters<typeof Peep>[0]) => new Set([...renderToStaticMarkup(new Peep({ type: 'bust', ...o }).group()).matchAll(/fill="([^"]+)"[^>]*data-piece="skin"/g)].map((m) => m[1]))
  assert.deepEqual(skins({ skin: '#8d5524' }), new Set(['#8d5524']))
  assert.deepEqual(skins({ skin: '#8d5524', colors: { head: { skin: '#ffdbac' } } }), new Set(['#8d5524', '#ffdbac']))
  for (const c of ['body', 'standing', 'sitting', 'head'] as const) for (const a of catalogue[c].values()) if (a.id !== 'none') assert.ok(a.shapes.some((s) => s.piece === 'skin'), `${c}/${a.id} has skin`)
})

test('mono: the lines in the ink, every other piece in the paper', () => {
  const html = renderToStaticMarkup(new Peep({ type: 'sitting', body: 'bike', mono: true, ink: '#111111', paper: '#ffffff', skin: '#8d5524', colors: { body: { top: '#e63946' } } }).group())
  assert.deepEqual(new Set([...html.matchAll(/(?:fill|stroke)="(#[^"]+)"/g)].map((m) => m[1])), new Set(['#111111', '#ffffff']))
})

test('an item offers its pieces with their colours; the standing and sitting poses keep the colours they came in before', () => {
  assert.deepEqual(lookup('sitting', 'bike').pieces, { shoes: '#111111', 'bicycle-iron': '#ffffff', 'bicycle-frame': '#ec7495', jacket: '#a99cc8', top: '#111111' })
  assert.deepEqual(lookup('sitting', 'closed-legs-2').pieces, { shoes: '#ffffff', pants: '#ffcf77', jacket: '#ffffff', top: '#ffffff' }, 'but closed-legs-2, in its Figma colours')
  assert.deepEqual(lookup('standing', 'blazer-1').pieces, { pants: '#c8b48a', shoes: '#d9a441', jacket: '#d9a441' })
  assert.deepEqual(lookup('face', 'awe').pieces, {}, 'a face\'s eyes are its paper')
  assert.deepEqual(lookup('facialHair', 'full-4').pieces, { hair: '#e8e1e1' }, 'a beard\'s grey is its hair')
})

test('a mask goes over the face and the beard, under the glasses; the doctors come with scrubs', () => {
  const peep = new Peep({ type: 'standing', body: 'doctor-nurse-2', head: 'dreads-1', face: 'masked-calm', mask: 'medical-mask', accessories: 'glasses' })
  assert.deepEqual(peep.layout().map((p) => [p.slot, p.atom.id]).slice(3), [['facialHair', 'none'], ['mask', 'medical-mask'], ['accessories', 'glasses']])
  assert.deepEqual(peep.layout()[4].at, { x: 404 + 23, y: 180 + 281 }, 'where the Figma file puts it on the head')
  const html = renderToStaticMarkup(peep.group({}))
  assert.match(html, /data-slot="mask"><g><path[^>]*fill="#ffffff"[^>]*data-piece="mask"/i, "white, so the paper")
  assert.deepEqual(lookup('mask', 'respirator').pieces, { mask: '#9ddadb' })
  assert.deepEqual(lookup('standing', 'doctor-nurse-2').pieces, { scrubs: '#8fa7df', shoes: '#ffffff', coat: '#ffffff', top: '#9fd8e5' })
})
