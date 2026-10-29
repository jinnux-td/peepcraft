import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { catalogue, figure, figures, lookup } from '../src/index.ts'

test('all 38 figures of the pack are there, with unique ids, on a 1080 canvas', () => {
  assert.equal(figures.length, 38)
  assert.equal(catalogue.size, 38)
  for (const f of figures) { assert.equal(f.width, 1080, f.id); assert.ok(f.height >= 1080 && f.height <= 1100, f.id) }
})

test('a figure draws an empty group until its paths load; load() fetches them once, and again after a failure', async () => {
  let calls = 0, fail = true
  const f = figure({ id: 'x', label: 'X', width: 10, height: 10 }, async () => { calls++; if (fail) throw new Error('offline'); return { paths: [{ d: 'M0 0H1', paper: false }] } })
  assert.equal(renderToStaticMarkup(createElement(f)), '<g></g>')
  await assert.rejects(f.load(), /offline/)
  fail = false
  await Promise.all([f.load(), f.load()])
  assert.equal(calls, 2, 'one fetch for the failure, one shared by both calls after it')
  assert.equal(renderToStaticMarkup(createElement(f)), '<g><path d="M0 0H1" fill="#000000"></path></g>')
})

test('every figure draws paths in the ink and paper colours it is given, and nothing hard-coded', async () => {
  await Promise.all(figures.map((f) => f.load()))
  for (const f of figures) {
    const html = renderToStaticMarkup(createElement(f, { ink: '#112233', paper: '#ddeeff' }))
    assert.match(html, /^<g><path /, f.id)
    assert.match(html, /fill="#112233"/, f.id)
    assert.doesNotMatch(html, /fill="(black|white|#000000|#FFFFFF)"/i, f.id)
  }
})

test('the default colours are black and white, like the source', async () => {
  await lookup('astro').load()
  const html = renderToStaticMarkup(createElement(lookup('astro')))
  assert.match(html, /fill="#000000"/); assert.match(html, /fill="#FFFFFF"/)
})

test('an unknown id is refused and the choices are named', () => {
  assert.throws(() => lookup('nope'), /no figure "nope"; known: astro,/)
})
