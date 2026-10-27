import { test } from 'node:test'
import assert from 'node:assert/strict'
import { choose, commit, optionsFor, partId, redo, setType, startHistory, tweak, undo } from '../src/state.ts'
import { initialState } from '../src/types.ts'

test('partId is the choice, else the default of the type', () => {
  assert.equal(partId(initialState, 'face'), 'smile')
  assert.equal(partId(choose(initialState, 'face', 'calm'), 'face'), 'calm')
  assert.equal(partId(initialState, 'body'), 'tee-1')
  assert.equal(partId(setType(initialState, 'sitting'), 'body'), 'crossed-legs')
})

test('changing type drops the body (a pose is not a torso) and keeps the other choices', () => {
  const s = setType(choose(choose(initialState, 'body', 'dress'), 'head', 'afro'), 'standing')
  assert.equal(s.parts.body, undefined)
  assert.equal(s.parts.head, 'afro')
  assert.equal(setType(initialState, 'bust'), initialState)
})

test('options of a slot come from the category of the type', () => {
  assert.equal(optionsFor('bust', 'body').length, 30)
  assert.equal(optionsFor('standing', 'body').length, 23)
  assert.equal(optionsFor('sitting', 'body').length, 11)
  assert.equal(optionsFor('sitting', 'head').length, 46)
})

test('history: commit is undoable and redoable, a new commit clears redo, a tweak is not a step', () => {
  let h = startHistory(initialState)
  h = commit(h, choose(h.now, 'face', 'calm'))
  h = tweak(h, { ...h.now, scale: 1.3 })
  assert.equal(h.past.length, 1)
  assert.equal(h.now.scale, 1.3)
  h = undo(h)
  assert.equal(h.now.parts.face, undefined)
  h = redo(h)
  assert.equal(h.now.parts.face, 'calm')
  h = undo(h); h = commit(h, choose(h.now, 'head', 'afro'))
  assert.equal(h.future.length, 0)
  assert.equal(undo(startHistory(initialState)).now, initialState)
})

test('history keeps the last 50 steps', () => {
  let h = startHistory(initialState)
  for (let i = 0; i < 80; i++) h = commit(h, { ...h.now, rotate: i })
  assert.equal(h.past.length, 50)
})

test('the scene: add copies the look, members spread out, update, reorder and remove', async () => {
  const { addToScene, moveEntry, removeEntry, updateEntry } = await import('../src/state.ts')
  const { SCENE } = await import('../src/scene.ts')
  let s = addToScene(choose(initialState, 'head', 'afro'), { x: 0, y: 100, width: 900, height: 1400 })
  s = addToScene({ ...s, figure: 'runner', ink: '#112233' })
  assert.equal(s.scene.length, 2)
  assert.deepEqual({ ...s.scene[0], x: 0 }, { type: 'bust', parts: { head: 'afro' }, figure: null, ink: '#111111', paper: '#ffffff', flip: false, x: 0, size: 1, bottom: 1500 })
  assert.equal(s.scene[1].bottom, 1080, 'unmeasured: the bottom of the canvas')
  assert.equal(s.scene[1].ink, '#112233')
  assert.notEqual(s.scene[0].x, s.scene[1].x, 'the second member does not stand on the first')
  assert.ok(s.scene.every((e) => e.x > 0 && e.x < SCENE))

  const moved = updateEntry(s, 1, { x: 100, flip: true })
  assert.equal(moved.scene[1].x, 100); assert.equal(moved.scene[1].flip, true); assert.equal(moved.scene[0], s.scene[0])
  assert.deepEqual(moveEntry(s, 0, 1).scene.map((e) => e.figure), ['runner', null])
  assert.equal(moveEntry(s, 0, -1), s, 'the back member cannot go further back')
  assert.equal(moveEntry(s, 1, 1), s)
  assert.deepEqual(removeEntry(s, 0).scene.map((e) => e.figure), ['runner'])
})

test('dragging moves across and lifts up and down, inside the scene and the lift range', async () => {
  const { addToScene, dragEntry } = await import('../src/state.ts')
  const { LIFT, SCENE } = await import('../src/scene.ts')
  const s = addToScene(initialState)
  const from = { x: 1000, lift: 0 }
  const moved = dragEntry(s, 0, from, 500, -300).scene[0]
  assert.equal(moved.x, 1500); assert.equal(moved.lift, 300, 'up the screen is a higher lift')
  const far = dragEntry(s, 0, from, -9999, 99999).scene[0]
  assert.equal(far.x, 0); assert.equal(far.lift, LIFT.min * SCENE)
  assert.equal(dragEntry(s, 0, from, 99999, -99999).scene[0].lift, LIFT.max * SCENE)
})

test('resizing from the bottom-right handle keeps the top-left corner and stays in range', async () => {
  const { addToScene, resizeEntry, SIZES } = await import('../src/state.ts')
  const { entryBox } = await import('../src/scene.ts')
  const s = addToScene(initialState, undefined, { thing: 'table' })
  const e = s.scene[0], b = entryBox(e)
  const big = resizeEntry(s, 0, { x: e.x, lift: 0, size: 1 }, b.width / 2, 0).scene[0]
  assert.equal(big.size, 1.5)
  const nb = entryBox(big)
  assert.ok(Math.abs(nb.x - b.x) < 1e-6 && Math.abs(nb.y - b.y) < 1e-6, 'the top-left corner stays')
  assert.equal(resizeEntry(s, 0, { x: e.x, lift: 0, size: 1 }, -99999, -99999).scene[0].size, SIZES.min)
  assert.equal(resizeEntry(s, 0, { x: e.x, lift: 0, size: 1 }, 99999, 0).scene[0].size, SIZES.max)
})

test('colours: a typed hex becomes #rrggbb, a name goes to the browser, the design lists its colours once', async () => {
  const { addToScene, designColors, toHex, updateEntry } = await import('../src/state.ts')
  assert.equal(toHex('#0CF'), '#00ccff'); assert.equal(toHex(' 00c4cc '), '#00c4cc')
  assert.equal(toHex('#12345'), null); assert.equal(toHex('blue'), null, 'no name parser in Node')
  assert.equal(toHex('blue', (t) => (t === 'blue' ? '#0000ff' : null)), '#0000ff')
  let s = addToScene({ ...initialState, bg: 'transparent' }, undefined, { thing: 'potted-plant' })
  s = updateEntry(s, 0, { ink: '#1D3557', colors: { leaves: '#52b788' } })
  assert.deepEqual(designColors(s), ['#111111', '#ffffff', '#1d3557', '#52b788'])
})
