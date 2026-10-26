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
