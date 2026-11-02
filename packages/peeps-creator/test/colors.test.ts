import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadAll } from '@kit/peeps'
import { choose, fallbackBox, initialState } from '@kit/peeps-engine'

// The colour chips of the creator (colors.ts), over the engine's state. The atoms' paths load on demand; these tests draw them.
await loadAll()

test('part colours: one skin for head and body, each piece of an item apart, carried into the scene and the colours of the design', async () => {
  const { exportSceneSvg, exportSvg } = await import('@kit/peeps-engine')
  const { addToScene, designColors } = await import('@kit/peeps-engine')
  const { peepTargets, tabColors } = await import('../src/colors.ts')
  let s = { ...initialState }
  const set = (p: Partial<typeof s>) => { s = { ...s, ...p } }
  const t = () => Object.fromEntries(peepTargets(s, set).map((x) => [x.id, x]))
  const piece = (svg: string, name: string) => [...svg.matchAll(new RegExp(`fill="([^"]+)"[^>]*data-piece="${name}"`, 'g'))].map((m) => m[1])
  assert.deepEqual(Object.keys(t()), ['skin', 'bandana', 'head-line', 'top', 'body-line', 'face', 'accessories', 'ink'], 'a tee and a bun with a bandana, as grouped in Figma; the lines of each part')
  assert.equal(t()['body-line'].label, 'Line')
  t()['body-line'].onChange('#3048c8'); assert.deepEqual(s.partColors, { body: { ink: '#3048c8' } }, "a part's lines are its ink")
  assert.deepEqual(new Set(piece(exportSvg(s, fallbackBox(s)), 'ink')), new Set(['#3048c8', '#111111'])); s = { ...s, partColors: {} }
  const bangs = { ...initialState, parts: { head: 'bangs' } }
  assert.deepEqual(tabColors('head', peepTargets(bangs, () => {})).map((x) => x.label), ['Hair', 'Line', 'Skin'], 'a head with a hair layer of its own')
  assert.deepEqual(peepTargets(s, set, true).map((x) => x.id), ['ink', 'paper'], 'a figure has only lines and fill')
  t().skin.onChange('#c68642'); t().bandana.onChange('#6b2d1a')
  assert.equal(s.skin, '#c68642')
  assert.deepEqual(s.partColors, { head: { bandana: '#6b2d1a' } })
  const { itemColors } = await import('@kit/peeps-engine')
  assert.equal(t().top.value, itemColors('body/tee-1').top, 'an untouched piece shows the colour its item comes in'); assert.equal(t().top.reset, undefined)
  t().top.onChange('#1d3557')
  assert.equal(t().top.reset?.label, 'Back to its own colour'); assert.equal(t().bandana.reset?.label, 'Back to its own colour')
  const svg = exportSvg(s, fallbackBox(s))
  assert.deepEqual(piece(svg, 'top'), ['#1d3557'], 'the tee in its colour')
  assert.equal(t().face.value, s.ink, 'an untouched part shows the peep colour'); assert.equal(t().face.reset, undefined)
  assert.deepEqual(piece(svg, 'skin'), ['#c68642', '#c68642'], 'the skin of the body and of the head')
  assert.match(svg, /data-slot="head">(?:(?!data-slot).)*fill="#6b2d1a"/s, 'the bandana is inside the head')
  t().skin.reset!.run()
  assert.equal(s.skin, '#d08b5b', 'back to the skin a peep starts with, the one of the Figma symbols'); assert.equal(t().skin.reset, undefined)
  const scene = addToScene({ ...s, skin: '#8d5524' })
  assert.match(exportSceneSvg(scene), /fill="#8d5524"/)
  assert.ok(designColors(scene).includes('#8d5524') && designColors(scene).includes('#6b2d1a'))
})

test('a mask: its own tab and colour, left alone by Shuffle all; the eyes-only faces only come up under one', async () => {
  const { randomize } = await import('@kit/peeps-engine')
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

test('glasses with a white frame have a Frame colour, white whatever the fill; a grey beard has a hair colour', async () => {
  const { peepTargets } = await import('../src/colors.ts')
  const { itemColors } = await import('@kit/peeps-engine')
  const ids = (accessories: string) => peepTargets({ ...initialState, paper: '#fde9d0', parts: { accessories } }, () => {}).map((t) => t.id)
  assert.ok(ids('glasses-4').includes('frame')); assert.ok(!ids('glasses').includes('frame'), 'other glasses are lines only')
  const frame = peepTargets({ ...initialState, paper: '#fde9d0', parts: { accessories: 'glasses-4' } }, () => {}).find((t) => t.id === 'frame')!
  assert.equal(frame.value, '#ffffff')
  assert.equal(itemColors('facialHair/moustache-9').hair, '#e8e1e1')
})
