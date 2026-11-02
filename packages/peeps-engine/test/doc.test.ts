import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadAll } from '@kit/peeps'
import { exportSvg, pictureBox, fromState, initialState, randomDoc, renderSvg, resolve, search, validate, DocInvalid, nameOf, type PeepcraftDoc } from '../src/index.ts'

// No loadAll() before the first test: renderSvg must load what it draws by itself.
test('renderSvg loads its own parts: the same SVG as the creator exports once everything is loaded', async () => {
  const { svg, state } = await renderSvg({ v: 1, type: 'standing', parts: { head: 'afro', face: 'calm' } })
  await loadAll()
  assert.equal(svg, exportSvg(state, pictureBox(state)))
  assert.ok(svg.length > 20_000, `a whole peep, not empty groups (${svg.length} bytes)`)
})

test('an empty document is what PeepCraft opens with', async () => {
  const { locked: _, ...start } = initialState
  assert.deepEqual(resolve({ v: 1 }), start)
  const { svg } = await renderSvg({ v: 1 })
  assert.equal(svg, exportSvg(start, pictureBox(start)))
})

const errors = (doc: unknown) => { const r = validate(doc); assert.equal(r.ok, false, 'should not validate'); return r.ok ? [] : r.errors }

test('an unknown id is reported with the choices', () => {
  const [e] = errors({ v: 1, parts: { head: 'afroo' } })
  assert.equal(e.path, 'parts.head'); assert.match(e.message, /no head "afroo"/); assert.ok(e.choices?.includes('afro'))
  const [b] = errors({ v: 1, type: 'bust', parts: { body: 'crossed-arms-1' } })
  assert.equal(b.path, 'parts.body'); assert.match(b.message, /for the type bust/); assert.ok(b.choices?.includes('tee-1'), 'a bust takes a torso')
})

test('every problem is listed, each at its path', () => {
  const all = errors({ v: 2, type: 'lying', ink: 'red', bg: 'blue', scale: 9, frame: { ratio: '2:1' }, extra: { id: 'chair' }, colour: '#fff' })
  assert.deepEqual(all.map((e) => e.path).sort(), ['bg', 'colour', 'extra.id', 'frame.ratio', 'ink', 'scale', 'type', 'v'])
  assert.deepEqual(errors({ v: 1, scale: 0.4 }).map((e) => e.message), ['a number from 0.5 to 1.5'])
  assert.deepEqual(errors([]).map((e) => e.message), ['a document is a JSON object'])
})

test('part colours: only the pieces the worn item has', () => {
  assert.ok(validate({ v: 1, partColors: { body: { top: '#1d3557', ink: '#3048c8' }, head: { bandana: '#6b2d1a' } } }).ok, 'the default tee and bun')
  const [e] = errors({ v: 1, parts: { head: 'afro' }, partColors: { head: { bandana: '#6b2d1a' } } })
  assert.equal(e.path, 'partColors.head.bandana'); assert.ok(e.choices?.includes('ink'))
})

test('uploads stay in the browser; a member is one kind; things take their own part colours', () => {
  const [u] = errors({ v: 1, scene: [{ upload: { id: 'x', name: 'a.png', href: 'https://example.com/a.png', width: 1, height: 1 } }] })
  assert.equal(u.path, 'scene[0].upload'); assert.match(u.message, /uploads stay in the browser/)
  assert.ok(errors({ v: 1, scene: [{ figure: 'runner', thing: 'chair' }] }).some((e) => e.message.includes('not two')))
  assert.ok(validate({ v: 1, scene: [{ thing: 'potted-plant', colors: { leaves: '#2d6a4f' } }] }).ok)
  assert.equal(errors({ v: 1, scene: [{ thing: 'potted-plant', colors: { lid: '#c9773e' } }] })[0].path, 'scene[0].colors.lid')
  assert.equal(errors({ v: 1, scene: Array.from({ length: 25 }, () => ({})) })[0].message, 'at most 24 members')
})

test('renderSvg throws DocInvalid with the errors', async () => {
  await assert.rejects(renderSvg({ v: 1, parts: { face: 'grin' } }), (e: unknown) => e instanceof DocInvalid && e.errors[0].path === 'parts.face')
})

test('a scene: members spread across the ground, things in their own colours, named after its members', async () => {
  const doc: PeepcraftDoc = { v: 1, bg: 'transparent', frame: { ratio: '16:9' }, scene: [{ type: 'standing', parts: { head: 'afro' } }, { figure: 'runner' }, { thing: 'potted-plant' }] }
  const { svg, state } = await renderSvg(doc)
  assert.equal(state.scene.length, 3)
  assert.deepEqual(state.scene.map((e) => Math.round(e.x / 4800 / (16 / 9) * 100)), [50, 20, 80])
  assert.match(svg, /^<svg[^>]*width="1024" height="576"/)
  assert.ok(!svg.includes('<rect'), 'transparent: no background rectangle')
  assert.match(svg, /data-figure|runner|<path/)
  assert.equal(nameOf(state, 'svg'), 'scene_standing-afro-smile-crossed-arms-1_figure-runner_potted-plant.svg')
})

test('the same seed gives the same random document, and it is valid', () => {
  const a = randomDoc({ seed: 7 }), b = randomDoc({ seed: 7 })
  assert.deepEqual(a, b)
  assert.ok(validate(a).ok, JSON.stringify(a))
  assert.notDeepEqual(randomDoc({ seed: 8 }), a)
  const kept = randomDoc({ type: 'sitting', keep: { v: 1, parts: { head: 'afro' }, bg: '#ffffff' }, seed: 3 })
  assert.equal(kept.type, 'sitting'); assert.equal(kept.parts?.head, 'afro'); assert.equal(kept.bg, '#ffffff')
  assert.equal(kept.parts?.mask, undefined, 'no mask unless kept'); assert.equal(kept.extra, undefined, 'no extra unless kept')
})

test('a state to a document and back draws the same', () => {
  const s = resolve({ v: 1, type: 'sitting', parts: { head: 'afro' }, ink: '#1d3557', partColors: { body: { pants: '#52b788' } }, scene: [{ thing: 'chair', x: 1000 }, { figure: 'runner', flip: true }] })
  const { doc, dropped } = fromState(s)
  assert.equal(dropped, 0)
  assert.deepEqual(resolve(doc), s)
  assert.deepEqual(fromState({ ...s, scene: [...s.scene, { ...s.scene[0], upload: { id: 'u', name: 'a.png', href: 'data:', width: 1, height: 1 } }] }).dropped, 1)
  assert.deepEqual(fromState(resolve({ v: 1 })).doc, { v: 1 }, 'nothing but the version when nothing changed')
})

test('search: by category, by type, by words', () => {
  assert.deepEqual(search({ category: 'head', query: 'afro' }).map((i) => i.id), ['afro', 'long-afro'])
  assert.ok(search({ type: 'bust' }).every((i) => i.category !== 'standing' && i.category !== 'sitting'))
  assert.ok(search({ query: 'coffee' }).length > 0)
  const bubble = search({ category: 'thing' }).find((i) => i.extra)
  assert.ok(bubble, 'some things are extras a peep wears')
})
