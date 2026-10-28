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
  assert.equal(optionsFor('standing', 'body').length, 26)
  assert.equal(optionsFor('sitting', 'body').length, 11)
  assert.equal(optionsFor('sitting', 'head').length, 48)
  assert.deepEqual(optionsFor('bust', 'mask').map((a) => a.id), ['medical-mask', 'respirator', 'none'])
})

test('a mask: its own tab and colour, left alone by Shuffle all; the eyes-only faces only come up under one', async () => {
  const { randomize } = await import('../src/random.ts')
  const { peepTargets, tabColors } = await import('../src/colors.ts')
  const masked = choose(initialState, 'mask', 'respirator')
  assert.deepEqual(tabColors('mask', peepTargets(masked, () => {})).map((t) => t.label), ['Mask', 'Line'])
  let rng = 0
  const seq = () => (rng = (rng * 9301 + 49297) % 233280) / 233280
  for (let i = 0; i < 60; i++) {
    const bare = randomize(initialState, 'all', seq), worn = randomize(masked, 'all', seq)
    assert.equal(bare.parts.mask, undefined); assert.equal(worn.parts.mask, 'respirator')
    assert.ok(!(bare.parts.face ?? '').startsWith('masked-'), bare.parts.face)
  }
  assert.ok(Array.from({ length: 60 }, () => randomize(masked, 'face', seq).parts.face).some((f) => f?.startsWith('masked-')), 'under a mask, they do')
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
  assert.deepEqual({ ...s.scene[0], x: 0 }, { type: 'bust', parts: { head: 'afro' }, figure: null, ink: '#111111', paper: '#ffffff', partColors: {}, skin: '#d08b5b', flip: false, x: 0, size: 1, bottom: 1500 })
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
test('resizing from the top-left handle keeps the bottom-right corner', async () => {
  const { addToScene, resizeEntry } = await import('../src/state.ts')
  const { entryBox } = await import('../src/scene.ts')
  const s = addToScene(initialState, undefined, { thing: 'table' })
  const e = s.scene[0], b = entryBox(e)
  const big = resizeEntry(s, 0, { x: e.x, lift: 0, size: 1 }, -b.width / 2, 0, [-1, -1]).scene[0], nb = entryBox(big)
  assert.equal(big.size, 1.5)
  assert.ok(Math.abs(nb.x + nb.width - b.x - b.width) < 1e-6 && Math.abs(nb.y + nb.height - b.y - b.height) < 1e-6, 'the bottom-right corner stays')
})

test('colours: a typed hex becomes #rrggbb, a name goes to the browser, the design lists its colours once', async () => {
  const { addToScene, designColors, toHex, updateEntry } = await import('../src/state.ts')
  assert.equal(toHex('#0CF'), '#00ccff'); assert.equal(toHex(' 00c4cc '), '#00c4cc')
  assert.equal(toHex('#12345'), null); assert.equal(toHex('blue'), null, 'no name parser in Node')
  assert.equal(toHex('blue', (t) => (t === 'blue' ? '#0000ff' : null)), '#0000ff')
  let s = addToScene({ ...initialState, bg: 'transparent' }, undefined, { thing: 'potted-plant' })
  s = updateEntry(s, 0, { ink: '#1D3557', colors: { leaves: '#52b788' } })
  assert.deepEqual(designColors(s), ['#111111', '#ffffff', '#d08b5b', '#1d3557', '#52b788'])
})

test('another item comes in its own colours: the pieces picked for the last one go, its lines and fill stay', async () => {
  const { atomKey, itemColors, wornColors } = await import('../src/outfit.ts')
  assert.deepEqual(itemColors('body/tee-1'), itemColors('body/tee-1'), 'the same colours on every load')
  assert.ok(itemColors('standing/walking-2').shoes && itemColors('head/bun').bandana, 'one per piece the item has')
  const s = { ...initialState, partColors: { body: { top: '#123456', ink: '#1d3557' }, head: { hair: '#a55728' } } }
  const next = choose(s, 'body', 'gym-shirt')
  assert.deepEqual(next.partColors, { body: { ink: '#1d3557' }, head: { hair: '#a55728' } })
  assert.equal(wornColors(next.type, next.parts, next.partColors).body?.top, itemColors('body/gym-shirt').top)
  assert.equal(wornColors(s.type, s.parts, s.partColors).body?.top, '#123456', 'a picked colour wins over the item own')
  const back = choose(next, 'body', s.parts.body ?? 'tee-1')
  assert.equal(wornColors(back.type, back.parts, back.partColors).body?.top, itemColors(atomKey(back.type, 'body', 'tee-1')).top, 'chosen again, it comes in its own colours')
})

test('glasses with a white frame have a Frame colour, white whatever the fill; a grey beard has a hair colour', async () => {
  const { peepTargets } = await import('../src/colors.ts')
  const { itemColors } = await import('../src/outfit.ts')
  const ids = (accessories: string) => peepTargets({ ...initialState, paper: '#fde9d0', parts: { accessories } }, () => {}).map((t) => t.id)
  assert.ok(ids('glasses-4').includes('frame')); assert.ok(!ids('glasses').includes('frame'), 'other glasses are lines only')
  const frame = peepTargets({ ...initialState, paper: '#fde9d0', parts: { accessories: 'glasses-4' } }, () => {}).find((t) => t.id === 'frame')!
  assert.equal(frame.value, '#ffffff')
  assert.equal(itemColors('facialHair/moustache-9').hair, '#e8e1e1')
})

test('contrast: black lines on white only, the colours kept for when it is off', async () => {
  const { peepOf } = await import('../src/scene.ts')
  const { renderToStaticMarkup } = await import('react-dom/server')
  const s = { ...initialState, partColors: { body: { top: '#123456' } } }
  const html = (x: typeof s) => renderToStaticMarkup(peepOf(x).group())
  assert.match(html(s), /#123456/); assert.match(html(s), /#d08b5b/)
  const mono = html({ ...s, mono: true })
  assert.deepEqual(new Set([...mono.matchAll(/(?:fill|stroke)="(#[^"]+)"/g)].map((m) => m[1])), new Set(['#111111', '#ffffff']), 'no colours, no skin')
  assert.deepEqual(s.partColors, { body: { top: '#123456' } })
})

test('an extra on the peep: comes in its own colours, again when chosen again, goes into the scene with the peep, grows its canvas', async () => {
  const { addToScene, chooseExtra } = await import('../src/state.ts')
  const { drawn, withExtra } = await import('../src/scene.ts')
  const { canvas } = await import('@kit/peeps')
  const s = chooseExtra(initialState, 'bubble')
  assert.deepEqual(s.extra, { id: 'bubble', ink: '#111111', paper: '#f2f2f2' })
  const red = { ...s, extra: { ...s.extra!, paper: '#e63946' } }
  assert.equal(chooseExtra(red, 'bubble').extra!.paper, '#f2f2f2', 'chosen again: its own colours')
  assert.equal(chooseExtra(red, null).extra, undefined)
  assert.deepEqual(addToScene(red).scene[0].extra, red.extra)
  assert.equal(addToScene(red, undefined, { thing: 'mug' }).scene[0].extra, undefined, 'a thing wears none')
  const c = canvas.bust, w = withExtra('bust', 'bubble'), d = drawn({ ...red, figure: null })
  assert.ok(w.width > c.width && w.height >= c.height, 'room for the bubble')
  assert.deepEqual([d.width, d.height], [w.width, w.height])
  assert.equal(drawn({ ...red, figure: null }).item, d.item, 'one drawing per look, so a click on it is not lost')
})

test('dragging a member to another place in the order: the others close up around it', async () => {
  const { addToScene, reorderEntry } = await import('../src/state.ts')
  const s = ['chair', 'table', 'mug'].reduce((t, thing) => addToScene(t, undefined, { thing }), initialState)
  assert.deepEqual(reorderEntry(s, 0, 2).scene.map((e) => e.thing), ['table', 'mug', 'chair'])
  assert.deepEqual(reorderEntry(s, 2, 0).scene.map((e) => e.thing), ['mug', 'chair', 'table'])
  assert.equal(reorderEntry(s, 1, 1), s); assert.equal(reorderEntry(s, 0, 9), s)
})
