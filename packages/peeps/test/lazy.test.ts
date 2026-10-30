import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { catalogue, lookup, Peep, pending } from '../src/index.ts'

// Run alone (node --test runs each file in its own process), so no atom has been loaded yet.

test('an atom has its meta and pieces at once, and its paths only once loaded; loading is shared', async () => {
  const a = lookup('head', 'afro')
  assert.equal(a.label.length > 0 && a.width > 0, true)
  assert.equal(a.shapes.length, 0, 'no paths before load')
  assert.equal(renderToStaticMarkup(createElement(a)), '<g></g>', 'an empty group until then')
  const [x, y] = [a.load(), a.load()]
  assert.equal(x, y, 'one fetch for both calls')
  assert.ok((await x).length > 0)
  assert.equal(a.shapes, await y)
  assert.match(renderToStaticMarkup(createElement(a)), /<path /)
})

test('a peep loads only its own parts; pending() waits for what was asked', async () => {
  const p = new Peep({ type: 'bust', head: 'bun', face: 'calm' })
  const parts = p.layout().map((x) => x.atom)
  const drawn = parts.filter((a) => a.id !== 'none')   // "none" parts (no beard, no mask) have no paths at all
  assert.ok(drawn.every((a) => a.shapes.length === 0))
  void p.load()
  await pending()
  assert.ok(drawn.every((a) => a.shapes.length > 0), 'its parts are in')
  const others = [...catalogue.head.values()].filter((a) => a.id !== 'bun' && a.id !== 'afro')
  assert.ok(others.every((a) => a.shapes.length === 0), 'no other hairstyle was fetched')
})
