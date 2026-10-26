import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { catalogue, defaults, Peep, lookup, type Category } from '../src/index.ts'

const counts: Record<Category, number> = { accessories: 9, body: 30, face: 30, facialHair: 17, head: 46, sitting: 11, standing: 23 }

test('every atom of the pack is in the catalogue', () => {
  for (const [category, n] of Object.entries(counts)) assert.equal(catalogue[category as Category].size, n, category)
})

test('every atom renders a group with paths, and takes ink and paper', () => {
  for (const [category, atoms] of Object.entries(catalogue)) for (const A of atoms.values()) {
    const html = renderToStaticMarkup(createElement(A, { ink: '#112233', paper: '#ddeeff' }))
    assert.match(html, /^<g>/, `${category}/${A.id}`)
    assert.doesNotMatch(html, /#000000|#FFFFFF/i, `${category}/${A.id} keeps a hard-coded black or white`)
  }
})

test('defaults name real atoms', () => {
  for (const [type, d] of Object.entries(defaults)) {
    const body = type === 'bust' ? 'body' : (type as 'standing' | 'sitting')
    lookup(body, d.body); lookup('head', d.head); lookup('face', d.face); lookup('facialHair', d.facialHair); lookup('accessories', d.accessories)
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
  assert.deepEqual(new Peep().layout().map((p) => p.slot), ['body', 'head', 'face', 'facialHair', 'accessories'])
  assert.match(a, /^<svg viewBox="0 0 1647 2500"/)
})

test('two copies of the mask atom on one page do not share ids', () => {
  const html = renderToStaticMarkup(createElement('svg', null, createElement(lookup('sitting', 'one-leg-up-2')), createElement(lookup('sitting', 'one-leg-up-2'))))
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1])
  assert.equal(new Set(ids).size, ids.length)
  assert.ok(ids.length >= 4)
  for (const m of html.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)) assert.ok(ids.includes(m[1] ?? m[2]), `dangling ${m[0]}`)
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
