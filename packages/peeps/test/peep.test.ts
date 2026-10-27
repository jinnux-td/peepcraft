import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { catalogue, defaults, Peep, lookup, type Category, type PartColors } from '../src/index.ts'

const counts: Record<Category, number> = { accessories: 9, body: 30, face: 30, facialHair: 17, head: 46, sitting: 11, standing: 23 }

test('every atom of the pack is in the catalogue', () => {
  for (const [category, n] of Object.entries(counts)) assert.equal(catalogue[category as Category].size, n, category)
})

test('every atom renders a group with paths, and takes ink and paper', () => {
  for (const [category, atoms] of Object.entries(catalogue)) for (const A of atoms.values()) {
    const html = renderToStaticMarkup(createElement(A, { ink: '#112233', paper: '#ddeeff' }))
    assert.match(html, /^<g>/, `${category}/${A.id}`)
    // A mask's white is how much shows, not a colour: one-leg-up-2 masks its lines, and a paper-coloured mask faded them.
    assert.doesNotMatch(html.replace(/<mask[^>]*>/g, ''), /#000000|#FFFFFF/i, `${category}/${A.id} keeps a hard-coded black or white`)
  }
})

test('defaults name real atoms', () => {
  for (const [type, d] of Object.entries(defaults)) {
    const body = type === 'bust' ? 'body' : (type as 'standing' | 'sitting')
    lookup(body, d.body); lookup('head', d.head); lookup('face', d.face); lookup('facialHair', d.facialHair); lookup('accessories', d.accessories)
  }
})

test('a missing part becomes the default of its type', () => {
  for (const type of ['standing', 'sitting', 'bust'] as const) {
    assert.deepEqual(new Peep({ type }).parts, defaults[type])
    assert.deepEqual(new Peep({ type, face: 'calm' }).parts, { ...defaults[type], face: 'calm' })
  }
  assert.equal(new Peep({ type: 'full' }).type, 'standing')
  assert.equal(new Peep({ type: 'half' }).type, 'bust')
  assert.equal(new Peep().type, 'standing')
})

test('a body of the wrong type or an unknown id is refused, naming the choices', () => {
  assert.throws(() => new Peep({ type: 'bust', body: 'crossed-arms-1' }).layout(), /no body atom "crossed-arms-1"; known: .*tee-1/)
  assert.throws(() => new Peep({ head: 'nope' }).layout(), /no head atom "nope"/)
})

test('layout is deterministic and puts parts back to front', () => {
  const a = renderToStaticMarkup(new Peep({ type: 'sitting', head: 'afro' }).render())
  assert.equal(a, renderToStaticMarkup(new Peep({ type: 'sitting', head: 'afro' }).render()))
  assert.deepEqual(new Peep().layout().map((p) => p.slot), ['body', 'head', 'face', 'facialHair', 'accessories'])
  assert.match(a, /^<svg viewBox="0 0 1647 2500"/)
})

test('two copies of the mask atom on one page do not share ids', () => {
  const html = renderToStaticMarkup(createElement('svg', null, createElement(lookup('sitting', 'one-leg-up-2')), createElement(lookup('sitting', 'one-leg-up-2'))))
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1])
  assert.equal(new Set(ids).size, ids.length)
  assert.ok(ids.length >= 4)
  for (const m of html.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)) assert.ok(ids.includes(m[1] ?? m[2]), `dangling ${m[0]}`)
})

test('a background is a rectangle over the box, or nothing when transparent', async () => {
  const { Background } = await import('../src/index.ts')
  const box = { x: -10, y: 5, width: 100, height: 200 }
  assert.equal(renderToStaticMarkup(new Background('#f7d56e').render(box)), '<rect x="-10" y="5" width="100" height="200" fill="#f7d56e" data-layer="background"></rect>')
  for (const none of [undefined, 'transparent', 'Transparent', '  ', '']) {
    const b = new Background(none)
    assert.equal(b.transparent, true, String(none))
    assert.equal(b.render(box), null)
  }
})

test('a part can take its own ink and paper: hair and skin on the head, the rest keeps the peep colours', () => {
  const html = renderToStaticMarkup(new Peep({ ink: '#111111', paper: '#ffffff', colors: { head: { ink: '#6b2d1a', paper: '#c68642' }, accessories: { ink: '#1d3557' } } }).group())
  const slot = (name: string) => html.slice(html.indexOf(`data-slot="${name}"`), html.indexOf('data-slot=', html.indexOf(`data-slot="${name}"`) + 1) >>> 0)
  assert.match(slot('head'), /fill="#6b2d1a"/); assert.match(slot('head'), /fill="#c68642"/)
  assert.match(slot('body'), /fill="#ffffff"/); assert.doesNotMatch(slot('body'), /#c68642/)
  assert.deepEqual(new Peep().colors, {})
})

test('one skin colour for head and body: the parts are drawn again in it, masked to their skin areas; the clothes keep their own', async () => {
  const { skinAreas } = await import('../src/index.ts')
  const html = renderToStaticMarkup(new Peep({ type: 'bust', body: 'tee-1', skin: '#8d5524', colors: { body: { paper: '#38b6ff' } } }).group())
  assert.equal((html.match(/<mask/g) ?? []).length, 2, 'head and body')
  assert.match(html, /data-skin=""><g><g [^>]*><path[^>]*fill="#8d5524"/)
  assert.match(html, /fill="#38b6ff"/)
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1])
  assert.equal(new Set(ids).size, ids.length, 'mask ids are unique')
  assert.doesNotMatch(renderToStaticMarkup(new Peep({ type: 'bust' }).group()), /<mask/, 'no skin colour, no second copy')
  for (const c of ['body', 'standing', 'sitting', 'head'] as const) for (const a of catalogue[c].values()) if (a.id !== 'none') assert.ok(`${c}/${a.id}` in skinAreas, `${c}/${a.id} has skin areas`)
})

test('what a body holds keeps the peep paper when the clothes take a colour', () => {
  const held = (colors: PartColors) => renderToStaticMarkup(new Peep({ type: 'bust', body: 'device', paper: '#fff', colors }).group())
  assert.match(held({ body: { paper: '#38b6ff' } }), /data-prop=""><g><g [^>]*><path[^>]*fill="#fff"/, 'the phone is drawn again in the paper')
  assert.doesNotMatch(held({}), /data-prop/, 'clothes in the paper colour, nothing to keep')
})

test('a gap the art leaves unpainted inside the skin is filled in the skin colour, under the atom', () => {
  const html = (skin?: string) => renderToStaticMarkup(new Peep({ type: 'sitting', body: 'mid-1', skin }).group())
  assert.match(html('#8d5524'), /data-slot="body"><path [^>]*fill="#8d5524" data-hole=""/)
  assert.doesNotMatch(html(), /data-hole/, 'no skin colour, the art as it is')
})

test('a role colours only its piece: white pieces as paper, solid black ones (hair, a black shirt) as ink', () => {
  const html = (colors: PartColors, o: { body?: string; head?: string; facialHair?: string } = {}) =>
    renderToStaticMarkup(new Peep({ type: 'standing', body: 'walking-2', head: 'bun', ...o, colors }).group())
  const both = html({ body: { top: '#c0392b', shoes: '#f39c12' }, head: { hair: '#e67e22', hat: '#8e44ad' } })
  const copy = (name: string) => both.match(new RegExp(`data-${name}="">(.*?)</g></g>`))?.[1] ?? ''
  assert.match(copy('top-ink'), /fill="#c0392b"/, 'the black tee is drawn again in its colour as ink')
  assert.match(copy('shoes'), /^<g><g [^>]*><path[^>]*fill="#f39c12"/, 'the white shoes are drawn again in their colour as paper')
  assert.match(both, /data-hair-ink=""/, 'black hair')
  assert.match(both, /data-hat=""/, 'the band of the bun, a white piece')
  assert.doesNotMatch(both, /data-bottoms/, 'a role with no colour draws nothing')
  assert.doesNotMatch(html({}), /<mask/, 'no colours, no second copies')
  // A pencil moustache has no hair shape: its hair colour is its ink.
  assert.match(html({ facialHair: { hair: '#a0522d' } }, { facialHair: 'moustache-8' }), /data-slot="facialHair">[^]*?stroke="#a0522d"|data-slot="facialHair">[^]*?fill="#a0522d"/)
})
