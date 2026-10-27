import { test } from 'node:test'
import assert from 'node:assert/strict'
import { exportSvg } from '../src/export.ts'
import { fallbackBox, sceneTransform, squareAround } from '../src/scene.ts'
import { initialState } from '../src/types.ts'

const box = fallbackBox('bust')

test('a transparent background leaves no rectangle in the export; a colour leaves one', () => {
  const clear = exportSvg({ ...initialState, bg: 'transparent' }, box)
  const solid = exportSvg(initialState, box)
  assert.doesNotMatch(clear, /data-layer="background"/)
  assert.match(solid, /<rect [^>]*fill="#f7d56e"[^>]*data-layer="background"/)
  assert.match(clear, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="/)
})

test('the export is the same bytes for the same state', () => {
  assert.equal(exportSvg(initialState, box), exportSvg({ ...initialState }, box))
})

test('scale, rotate and flip turn about the centre of the window', () => {
  const b = { x: 0, y: 0, width: 100, height: 100 }
  assert.equal(sceneTransform({ ...initialState, scale: 1.5, rotate: 30, flip: true }, b), 'translate(50 50) rotate(30) scale(-1.5 1.5) translate(-50 -50)')
  assert.match(exportSvg({ ...initialState, flip: true }, box), /scale\(-1 1\)/)
})

test('the window is a square around the outline with air', () => {
  const w = squareAround({ x: 10, y: 20, width: 100, height: 300 })
  assert.equal(w.width, w.height)
  assert.ok(w.width > 300)
  assert.equal(w.x + w.width / 2, 60)
  assert.equal(w.y + w.height / 2, 170)
})

test('a figure on the stage is drawn instead of the peep, in the ink and paper colours, and exported with it', () => {
  const s = { ...initialState, figure: 'runner', ink: '#112233', paper: '#ddeeff' }
  const svg = exportSvg(s, fallbackBox(s))
  assert.match(svg, /<g data-figure="runner">/)
  assert.doesNotMatch(svg, /data-slot=/)
  assert.match(svg, /fill="#112233"/); assert.match(svg, /fill="#ddeeff"/)
  assert.match(svg, /viewBox="-/, 'the window is a square around the 1080 canvas')
  assert.match(exportSvg(initialState, fallbackBox(initialState)), /data-slot="body"/)
  assert.throws(() => exportSvg({ ...s, figure: 'nope' }, fallbackBox(initialState)), /no figure "nope"/)
})

test('the stage keeps one measured outline per peep type and per figure', async () => {
  const { boxKey } = await import('../src/scene.ts')
  assert.equal(boxKey(initialState), 'bust')
  assert.equal(boxKey({ ...initialState, figure: 'astro' }), 'figure:astro')
})

test('the scene export: every member on the ground, back to front, no selection outline', async () => {
  const { exportSceneSvg } = await import('../src/export.ts')
  const { addToScene } = await import('../src/state.ts')
  const { entryBox, GROUND, SCENE } = await import('../src/scene.ts')
  const s = addToScene(addToScene({ ...initialState, type: 'standing' }, { x: 0, y: 150, width: 1000, height: 3000 }), undefined)
  const two = addToScene({ ...s, figure: 'runner' })
  const svg = exportSceneSvg(two)
  assert.match(svg, new RegExp(`^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SCENE} ${SCENE}" width="1024" height="1024"><g><rect [^>]*fill="#f7d56e"`))
  assert.deepEqual([...svg.matchAll(/data-item="(\d)"/g)].map((m) => m[1]), ['0', '1', '2'])
  assert.doesNotMatch(svg, /pc-selected|data-selected/)
  const feet = two.scene.map((e) => { const b = entryBox(e); return b.y + e.bottom * (b.height / (e.figure ? 1080 : 3291)) })
  for (const f of feet) assert.ok(Math.abs(f - GROUND) < 1e-6, `feet at ${f}`)
  assert.doesNotMatch(exportSceneSvg({ ...two, bg: 'transparent' }), /<rect/)
})

test('things and uploads join the scene in the current colours, stand on the ground or are lifted, and an upload goes with its file', async () => {
  const { exportSceneSvg } = await import('../src/export.ts')
  const { addToScene, dropUpload, updateEntry } = await import('../src/state.ts')
  const { entryBox, GROUND } = await import('../src/scene.ts')
  const upload = { id: 'u1', name: 'logo', href: 'data:image/png;base64,iVBORw0KGgo=', width: 2800, height: 1400 }
  let s = addToScene({ ...initialState, figure: 'runner', ink: '#112233', paper: '#ddeeff' }, undefined, { thing: 'table' })
  s = addToScene(s, { x: 0, y: 0, width: 10, height: 10 }, { upload })
  assert.equal(s.scene[0].figure, null, 'a thing is not the figure on the stage')
  assert.equal(s.scene[0].thing, 'table'); assert.equal(s.scene[0].bottom, 1350, 'a thing stands on the bottom of its canvas')
  assert.equal(s.scene[1].bottom, 1400, 'an outline measured for the peep does not apply to an upload')
  const b = entryBox(s.scene[0]); assert.equal(b.y + b.height, GROUND)
  s = updateEntry(s, 0, { lift: 300 })
  assert.equal(entryBox(s.scene[0]).y, b.y - 300)

  const svg = exportSceneSvg(s)
  assert.match(svg, /<g stroke="#112233"[^>]*><path [^>]*fill="#ddeeff"/, 'the table is drawn in the colours it was added with')
  assert.match(svg, /<image href="data:image\/png;base64,iVBORw0KGgo=" width="2800" height="1400" preserveAspectRatio="none" data-upload="u1">/)
  assert.deepEqual(dropUpload(s, 'u1').scene.map((e) => e.thing), ['table'])
  assert.throws(() => exportSceneSvg(addToScene(initialState, undefined, { thing: 'nope' })), /no thing "nope"/)
})
