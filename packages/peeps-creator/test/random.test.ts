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
  for (const slot of slots.filter((x) => x !== 'mask')) assert.notEqual(partId(a, slot), partId(initialState, slot), slot)
  assert.ok((swatches.bg as readonly string[]).includes(a.bg))
  assert.notEqual(a.skin, initialState.skin, 'the skin too'); assert.equal(a.ink, initialState.ink, 'lines are never shuffled'); assert.equal(a.paper, initialState.paper, 'nor the fill')
  assert.equal(a.type, 'bust', 'the type is locked at first'); assert.equal(partId(a, 'mask'), 'none', 'so are the mask'); assert.equal(a.extra, undefined, 'and the extra')
})

test('unlocked, Shuffle all rolls the type first and then parts of that type, a mask and an extra; a locked colour stays', async () => {
  const { toggleLock } = await import('../src/state.ts')
  const open = (['type', 'mask', 'extra'] as const).reduce((t, w) => toggleLock(t, w), toggleLock(initialState, 'skin'))
  assert.deepEqual(open.locked, ['skin'])
  // One after another, as pressed: never the same item twice in a row, so None comes back after a mask or an extra.
  const rng = seeded(7), rolls: CreatorState[] = []
  for (let i = 0, t = open; i < 40; i++) rolls.push(t = randomize(t, 'all', rng))
  assert.ok(rolls.some((r) => r.type !== 'bust'), 'another type')
  for (const r of rolls) {
    assert.ok(optionsFor(r.type, 'body').some((a) => a.id === partId(r, 'body')), `${r.type} wears a body of its own type`)
    assert.equal(r.skin, initialState.skin, 'the locked skin stays')
  }
  assert.ok(rolls.some((r) => partId(r, 'mask') !== 'none') && rolls.some((r) => r.extra), 'masks and extras come up')
  assert.ok(rolls.some((r) => !r.extra), 'and none of them too')
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

test('the dice of the figures tab picks another figure; with a figure on stage, shuffle all picks another figure and leaves the parts', async () => {
  const { figures } = await import('@kit/transhumans')
  const first = randomize(initialState, 'figures', seeded(2))
  assert.ok(first.figure && figures.some((f) => f.id === first.figure))
  for (let i = 1; i < 40; i++) {
    assert.notEqual(randomize(first, 'figures', seeded(i)).figure, first.figure)
    const all = randomize({ ...first, parts: { head: 'afro' } }, 'all', seeded(i))
    assert.notEqual(all.figure, first.figure)
    assert.equal(all.parts.head, 'afro')
  }
})

test('the dice of the type tab takes a figure off the stage', () => {
  const s = randomize({ ...initialState, figure: 'astro' }, 'type', seeded(5))
  assert.equal(s.figure, null)
  assert.notEqual(s.type, 'bust')
})

test('shuffle all leaves what is locked: the background, a part', async () => {
  const { toggleLock } = await import('../src/state.ts')
  let s: CreatorState = toggleLock(toggleLock({ ...initialState, parts: { head: 'afro' } }, 'bg'), 'head')
  assert.deepEqual(s.locked, ['type', 'mask', 'extra', 'bg', 'head'])
  assert.notEqual(partId(randomize(s, 'all'), 'body'), 'tee-1', 'the rest still rolls')
  for (let i = 0; i < 20; i++) s = randomize(s, 'all')
  assert.equal(s.bg, initialState.bg); assert.equal(s.parts.head, 'afro')
  assert.equal(randomize(s, 'head', () => 0).parts.head !== 'afro', true, 'the dice of the tab still changes a locked part')
  assert.deepEqual(toggleLock(s, 'head').locked, ['type', 'mask', 'extra', 'bg'])
})
