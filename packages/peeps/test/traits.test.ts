import { test } from 'node:test'
import assert from 'node:assert/strict'
import { catalogue, traits, traitsOf, type Category } from '../src/index.ts'

test('every atom has traits, and every row names an atom', () => {
  for (const category of Object.keys(catalogue) as Category[]) {
    const ids = [...catalogue[category].keys()].sort(), rows = Object.keys(traits[category]).sort()
    assert.deepEqual(rows.filter((id) => !catalogue[category].has(id)), [], `${category}: rows without an atom`)
    assert.deepEqual(ids.filter((id) => !traitsOf(category, id)), [], `${category}: atoms without traits`)
  }
})

test('traits agree with themselves', () => {
  for (const [id, t] of Object.entries(traits.head)) {
    if (t.length === 'none' || t.length === 'hidden') assert.equal(t.texture, undefined, id)
    else assert.ok(t.texture, `${id}: visible hair needs a texture`)
    if (t.style === 'covered') assert.ok(t.cover, id)
  }
  for (const [id, t] of Object.entries(traits.facialHair)) assert.equal(t.kind === 'none', t.size === undefined, id)
  for (const [id, t] of Object.entries(traits.accessories)) assert.equal(t.kind === 'glasses' || t.kind === 'sunglasses', !!t.frame, id)
  for (const [id, t] of Object.entries(traits.body)) assert.equal(t.bottom, undefined, `${id}: a bust shows no bottom`)
  for (const c of ['standing', 'sitting'] as const) for (const [id, t] of Object.entries(traits[c])) assert.ok(t.bottom, `${c}/${id}`)
})

test('traitsOf: none for an unknown id or an inherited key', () => {
  assert.equal(traitsOf('head', 'nope'), undefined)
  assert.equal(traitsOf('head', 'toString'), undefined)
  assert.equal(traitsOf('facialHair', 'none')?.kind, 'none')
})
