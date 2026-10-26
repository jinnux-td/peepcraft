import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomize, slots } from '../src/random.ts'
import { optionsFor, partId } from '../src/state.ts'
import { initialState, swatches, type CreatorState } from '../src/types.ts'

const seeded = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }

test('the dice of one tab changes that slot only, to another valid option', () => {
  for (const slot of slots) for (const type of ['standing', 'sitting', 'bust'] as const) {
    const before: CreatorState = { ...initialState, type }
    const rng = seeded(7)
    for (let i = 0; i < 20; i++) {
      const after = randomize(before, slot, rng)
      assert.notEqual(partId(after, slot), partId(before, slot), `${type}/${slot} must change`)
      assert.ok(optionsFor(type, slot).some((a) => a.id === partId(after, slot)))
      for (const other of slots.filter((s) => s !== slot)) assert.equal(partId(after, other), partId(before, other), `${slot} dice touched ${other}`)
      assert.equal(after.bg, before.bg); assert.equal(after.ink, before.ink); assert.equal(after.type, before.type)
    }
  }
})

test('the dice of all changes every part, deterministically for one seed', () => {
  const a = randomize(initialState, 'all', seeded(3)), b = randomize(initialState, 'all', seeded(3))
  assert.deepEqual(a, b)
  for (const slot of slots) assert.notEqual(partId(a, slot), partId(initialState, slot), slot)
  assert.ok((swatches.bg as readonly string[]).includes(a.bg))
})

test('the dice of all leaves a transparent background alone', () => {
  for (let i = 1; i < 30; i++) assert.equal(randomize({ ...initialState, bg: 'transparent' }, 'all', seeded(i)).bg, 'transparent')
})

test('the dice of the type tab picks another type and drops the body', () => {
  const s = randomize({ ...initialState, parts: { body: 'dress', head: 'afro' } }, 'type', seeded(1))
  assert.notEqual(s.type, 'bust')
  assert.equal(s.parts.body, undefined)
  assert.equal(s.parts.head, 'afro')
})

test('every option can come up', () => {
  const seen = new Set<string>()
  const rng = seeded(11)
  for (let i = 0; i < 2000; i++) seen.add(partId(randomize(initialState, 'head', rng), 'head'))
  // the current head is never drawn again, so every other one is
  assert.equal(seen.size, optionsFor('bust', 'head').length - 1)
})
