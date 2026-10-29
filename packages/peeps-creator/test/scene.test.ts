import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { lookup } from '@kit/transhumans'
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

test('a figure on the stage is drawn instead of the peep, in the ink and paper colours, and exported with it', async () => {
  const s = { ...initialState, figure: 'runner', ink: '#112233', paper: '#ddeeff' }
  assert.doesNotMatch(exportSvg(s, fallbackBox(s)), /fill="#112233"/, 'not loaded yet: an empty figure')
  await lookup('runner').load()
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
  assert.match(svg, new RegExp(`^<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SCENE} ${SCENE}" width="1024" height="1024"><rect [^>]*fill="#f7d56e"`))
  assert.deepEqual([...svg.matchAll(/data-item="(\d)"/g)].map((m) => m[1]), ['0', '1', '2'])
  assert.doesNotMatch(svg, /pc-selected|data-selected|data-remove/)
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

test('a member keeps its own colours: lines, fill, and the named parts of a thing, each its own until picked', async () => {
  const { exportSceneSvg } = await import('../src/export.ts')
  const { addToScene, updateEntry } = await import('../src/state.ts')
  let s = addToScene({ ...addToScene(initialState, undefined, { thing: 'potted-plant' }), mono: true })
  s = updateEntry(s, 0, { ink: '#1d3557', paper: '#c9773e', colors: { leaves: '#2d6a4f' } })
  s = updateEntry(s, 1, { paper: '#ffe066' })
  const svg = exportSceneSvg(s)
  assert.match(svg, /<g stroke="#1d3557"/)
  assert.match(svg, /fill="#2d6a4f" data-part="leaves"/)
  assert.match(svg, /fill="#c9773e"/, 'the pot takes the fill')
  assert.match(svg, /fill="#ffe066"/, 'the peep in Contrast takes its own paper')
  assert.match(exportSceneSvg(updateEntry(s, 0, { colors: undefined })), /fill="#52b788" data-part="leaves"/, 'unpicked, the leaves come in their own green')
})

test('the frame: a ratio widens the scene and keeps members in place across it, zoom closes in about the ground, the PNG follows the shape', async () => {
  const { exportSceneSvg } = await import('../src/export.ts')
  const { addToScene, setRatio } = await import('../src/state.ts')
  const { frameBox, frameSize, GROUND, SCENE, sceneWidth } = await import('../src/scene.ts')
  const s = addToScene(initialState)
  const wide = setRatio(s, '16:9')
  assert.ok(Math.abs(sceneWidth(wide) - SCENE * 16 / 9) < 1e-6)
  assert.ok(Math.abs(wide.scene[0].x / sceneWidth(wide) - s.scene[0].x / SCENE) < 1e-9, 'the member stays in the middle')
  assert.deepEqual(frameSize(wide), { width: 1024, height: 576 })
  assert.deepEqual(frameSize(setRatio(s, '9:16')), { width: 576, height: 1024 })
  const near = frameBox({ frame: { ratio: '1:1', zoom: 2 } })
  assert.deepEqual(near, { x: SCENE / 4, y: GROUND / 2, width: SCENE / 2, height: SCENE / 2 })
  assert.equal(near.y + near.height - GROUND, (SCENE - GROUND) / 2, 'the ground keeps its place in the picture')
  const far = { ...s, frame: { ratio: '1:1' as const, zoom: 0.5 } }
  assert.match(exportSceneSvg(far), new RegExp(`viewBox="${-SCENE / 2} ${-GROUND} ${SCENE * 2} ${SCENE * 2}"[^>]*><rect x="${-SCENE / 2}" y="${-GROUND}" width="${SCENE * 2}"`), 'zoomed out, the background still fills the picture')
})

test('part colours: one skin for head and body, each piece of an item apart, carried into the scene and the colours of the design', async () => {
  const { exportSceneSvg, exportSvg } = await import('../src/export.ts')
  const { addToScene, designColors } = await import('../src/state.ts')
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
  const { itemColors } = await import('../src/outfit.ts')
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

test('the picked member has a × at its top right corner, clear of the resize handle and inside the frame', async () => {
  const { renderToStaticMarkup } = await import('react-dom/server')
  const { addToScene } = await import('../src/state.ts')
  const { entryBox, frameBox, SceneView } = await import('../src/scene.ts')
  const s = addToScene(initialState)
  assert.doesNotMatch(renderToStaticMarkup(createElement(SceneView, { state: s })), /data-remove/, 'nothing picked, no ×')
  const html = renderToStaticMarkup(createElement(SceneView, { state: s, selected: 0 }))
  const [cx, cy] = html.match(/data-remove="0"[^]*?<circle cx="([\d.]+)" cy="(-?[\d.]+)"/)!.slice(1).map(Number)
  const b = entryBox(s.scene[0]), f = frameBox(s), r = f.width * 0.008
  assert.ok(cx > b.x + b.width && cy < b.y, 'beyond the top right corner')
  assert.ok(Math.hypot(cx - (b.x + b.width), cy - b.y) > r * 2.5 + r * 2.2, 'clear of the handle')
  assert.match(html, /aria-label="Remove from the scene"/)
})
