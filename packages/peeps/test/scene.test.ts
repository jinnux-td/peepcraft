import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { Background, lookup, Peep, Scene } from '../src/index.ts'

test('a scene draws its background, then items back to front', () => {
  const scene = new Scene({ width: 4000, height: 3500, background: '#f7d56e' })
    .add(new Peep({ type: 'standing' }), { x: 100, y: 100 })
    .add(new Peep({ type: 'sitting', head: 'afro' }), { x: 1500, y: 900, scale: 0.5 })
  const html = renderToStaticMarkup(scene.render())
  assert.match(html, /^<svg viewBox="0 0 4000 3500" xmlns="http:\/\/www.w3.org\/2000\/svg"><g><rect x="0" y="0" width="4000" height="3500" fill="#f7d56e"/)
  assert.ok(html.indexOf('data-item="0"') < html.indexOf('data-item="1"'))
  assert.match(html, /<g transform="translate\(100 100\) scale\(1 1\)" data-item="0">/)
  assert.match(html, /<g transform="translate\(1500 900\) scale\(0.5 0.5\)" data-item="1">/)
  assert.equal(html, renderToStaticMarkup(scene.render()))
})

test('a transparent scene has no rectangle', () => {
  for (const background of [undefined, 'transparent', new Background()]) {
    const html = renderToStaticMarkup(new Scene({ width: 10, height: 10, background }).add(new Peep()).render())
    assert.doesNotMatch(html, /<rect/)
  }
})

test('art takes its colours from the placement; a peep keeps its own', () => {
  const html = renderToStaticMarkup(new Scene({ width: 2000, height: 2000 })
    .add(lookup('head', 'afro'), { ink: '#112233', paper: '#ddeeff' })
    .add(new Peep({ ink: '#445566' }))
    .render())
  assert.match(html, /#112233/)
  assert.match(html, /#ddeeff/)
  assert.match(html, /#445566/)
})

test('flip mirrors inside the same box', () => {
  const head = lookup('head', 'afro')
  const html = renderToStaticMarkup(new Scene({ width: 5000, height: 5000 }).add(head, { x: 10, y: 20, scale: 2, flip: true }).render())
  assert.match(html, new RegExp(`transform="translate\\(${10 + head.width * 2} 20\\) scale\\(-2 2\\)"`))
})

test('a scene nests inside another', () => {
  const inner = new Scene({ width: 1200, height: 3300, background: '#abcdef' }).add(new Peep())
  const html = renderToStaticMarkup(new Scene({ width: 3000, height: 3300 }).add(inner, { x: 1000 }).render())
  assert.match(html, /<g transform="translate\(1000 0\) scale\(1 1\)" data-item="0"><g><rect x="0" y="0" width="1200" height="3300" fill="#abcdef"/)
})

test('two copies of one peep do not share mask ids', () => {
  const peep = new Peep({ type: 'sitting', body: 'one-leg-up-2' })
  const html = renderToStaticMarkup(new Scene({ width: 4000, height: 3000 }).add(peep).add(peep, { x: 2000 }).render())
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1])
  assert.ok(ids.length >= 4)
  assert.equal(new Set(ids).size, ids.length)
})

test('a scene without a size is refused', () => {
  assert.throws(() => new Scene({ width: 0, height: 10 }), /positive width and height/)
  assert.throws(() => new Scene({ width: Number.NaN, height: 10 }), /positive width and height/)
})

test('fitHeight sets the scale, ground puts the bottom of the canvas on a line', () => {
  const head = lookup('head', 'afro')
  const scene = new Scene({ width: 5000, height: 4000 })
    .add(new Peep(), { fitHeight: 3291 / 2, ground: 3000 })
    .add(head, { x: 2000, scale: 2, ground: 3000 })
  const [peep, art] = scene.items.map((i) => i.at)
  assert.equal(peep.scale, 0.5)
  assert.equal(peep.y, 3000 - 3291 / 2)
  assert.equal(art.y + head.height * art.scale, 3000)
})

test('conflicting placements are refused', () => {
  const scene = new Scene({ width: 10, height: 10 })
  assert.throws(() => scene.add(new Peep(), { y: 1, ground: 2 }), /y or ground/)
  assert.throws(() => scene.add(new Peep(), { scale: 1, fitHeight: 2 }), /scale or fitHeight/)
  assert.throws(() => scene.add(new Peep(), { fitHeight: 0 }), /fitHeight must be positive/)
  assert.equal(scene.items.length, 0)
})
