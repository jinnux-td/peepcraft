import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { catalogue, lookup, things } from '../src/index.ts'

test('18 things in four groups, ids unique and kebab-case', () => {
  assert.equal(things.length, 18)
  assert.equal(catalogue.size, things.length)
  assert.deepEqual([...new Set(things.map((t) => t.group))], ['furniture', 'home', 'small', 'pets'])
  for (const t of things) assert.match(t.id, /^[a-z]+(-[a-z]+)*$/)
  assert.throws(() => lookup('nope'), /no thing "nope"; known: chair/)
})

test('every thing takes ink and paper and keeps no colour of its own', () => {
  for (const T of things) {
    const html = renderToStaticMarkup(createElement(T, { ink: '#112233', paper: '#ddeeff' }))
    assert.match(html, /^<g stroke="#112233"/, T.id)
    assert.doesNotMatch(html, /#000000|#FFFFFF|NaN|undefined/i, T.id)
  }
})

test('every point is inside the canvas, so the bottom edge is the floor', () => {
  for (const T of things) {
    const html = renderToStaticMarkup(createElement(T))
    // Arc commands carry radii and flags, so only M/L/H/V/C/Q/S coordinates are checked, by axis.
    for (const [, cmd, args] of html.matchAll(/([MLCQSHV])([-\d. ]+)/g)) {
      const nums = args.trim().split(/\s+/).map(Number)
      const xs = cmd === 'V' ? [] : cmd === 'H' ? nums : nums.filter((_, i) => i % 2 === 0)
      const ys = cmd === 'H' ? [] : cmd === 'V' ? nums : nums.filter((_, i) => i % 2 === 1)
      for (const x of xs) assert.ok(x >= 0 && x <= T.width, `${T.id}: x ${x} outside 0..${T.width}`)
      for (const y of ys) assert.ok(y >= 0 && y <= T.height, `${T.id}: y ${y} outside 0..${T.height}`)
    }
  }
})

test('named parts take their own colour and fall back to paper; the menu lists them once, in drawing order', () => {
  const plant = lookup('potted-plant')
  assert.deepEqual(plant.slots, ['leaves'])
  assert.deepEqual(lookup('desk').slots, ['drawers', 'top'])
  assert.deepEqual(lookup('mug').slots, [])
  const html = renderToStaticMarkup(createElement(plant, { paper: '#eeeeee', colors: { leaves: '#2d6a4f' } }))
  assert.match(html, /fill="#2d6a4f" data-part="leaves"/)
  assert.match(html, /fill="#eeeeee"/, 'the pot keeps the paper colour')
  assert.match(renderToStaticMarkup(createElement(plant, { paper: '#eeeeee' })), /fill="#eeeeee" data-part="leaves"/)
})
