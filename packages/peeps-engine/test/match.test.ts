import { test } from 'node:test'
import assert from 'node:assert/strict'
import { traitsOf } from '@kit/peeps'
import { match, nearest, renderSvg, swatches, validate, DocInvalid, type Attributes } from '../src/index.ts'

const reason = (r: ReturnType<typeof match>, slot: string) => r.reasons.find((x) => x.slot === slot)

test('nothing described: the type and its default parts, a valid document', () => {
  const { doc, reasons } = match({})
  assert.deepEqual(doc, { v: 1, type: 'bust', parts: {} })
  assert.equal(reasons.length, 0)
  assert.ok(validate(doc).ok)
})

test('a head is picked by its traits', () => {
  const afro = match({ hair: { length: 'long', texture: 'coily', style: 'afro' } }).doc.parts!.head
  assert.equal(afro, 'long-afro')
  const bald = match({ hair: { length: 'none', style: 'bald' } }).doc.parts!.head!
  assert.equal(traitsOf('head', bald)?.style, 'bald')
  assert.equal(traitsOf('head', match({ hair: { cover: 'hijab' } }).doc.parts!.head!)?.cover, 'hijab')
})

test('every described head trait is honoured when one part has them all', () => {
  for (const id of ['bangs', 'medium-bangs-2', 'twists', 'mohawk', 'gray-bun', 'turban']) {
    const t = traitsOf('head', id)!
    const got = match({ hair: { ...t, bangs: !!t.bangs, cover: t.cover ?? 'none' } }).doc.parts!.head!
    assert.deepEqual(traitsOf('head', got), t, `${id} → ${got}`)
  }
})

test('a near miss beats a far one: wavy and long hair goes to a long head before a short one', () => {
  const id = match({ hair: { length: 'long', texture: 'curly', style: 'ponytail' } }).doc.parts!.head!
  assert.equal(traitsOf('head', id)?.length, 'long')
})

test('faces: by mood and mouth; never a fantasy face; a masked face only under a mask', () => {
  assert.equal(match({ face: { mood: 'happy', eyes: 'open', mouth: 'smile' } }).doc.parts!.face, 'smile')
  for (let seed = 0; seed < 20; seed++) {
    const id = match({ face: { mood: 'surprised', eyes: 'wide' } }, { seed }).doc.parts!.face!
    assert.ok(!traitsOf('face', id)?.fantasy, id)
    assert.notEqual(traitsOf('face', id)?.mouth, 'none', id)
  }
  const masked = match({ mask: 'medical', face: { mood: 'happy', eyes: 'closed' } }).doc
  assert.equal(masked.parts!.mask, 'medical-mask')
  assert.equal(masked.parts!.face, 'masked-cheers')
})

test('facial hair and eyewear: kind first, then the details; none means none', () => {
  assert.equal(match({ facialHair: { kind: 'none' } }).doc.parts!.facialHair, 'none')
  assert.equal(match({ facialHair: { kind: 'beard', size: 'large' } }).doc.parts!.facialHair, 'full-3')
  assert.equal(traitsOf('facialHair', match({ facialHair: { kind: 'moustache', styled: 'handlebar', size: 'large' } }).doc.parts!.facialHair!)?.styled, 'handlebar')
  assert.equal(match({ eyewear: { kind: 'glasses', frame: 'cat-eye' } }).doc.parts!.accessories, 'glasses-4')
  assert.equal(match({ eyewear: { kind: 'glasses', frame: 'round', thick: false } }).doc.parts!.accessories, 'glasses-2')
  assert.equal(match({ eyewear: { kind: 'none' } }).doc.parts!.accessories, 'none')
})

test('outfit: the body of the type; holds none prefers empty hands', () => {
  assert.equal(match({ outfit: { top: 'hoodie', holds: 'none' } }).doc.parts!.body, 'hoodie')
  assert.equal(match({ outfit: { top: 'hoodie', holds: 'controller' } }).doc.parts!.body, 'gaming')
  const standing = match({ type: 'standing', outfit: { top: 'tee', pose: 'walking', bottom: 'jeans' } }).doc
  assert.equal(standing.type, 'standing')
  assert.equal(standing.parts!.body, 'walking-2')
  assert.equal(match({ type: 'sitting', outfit: { aid: 'wheelchair' } }).doc.parts!.body, 'wheelchair')
})

test('colours snap to the swatches; hair only on a part that takes it', () => {
  assert.equal(nearest('#c08040', swatches.skin), '#c68642')
  const dark = match({ hair: { length: 'short', texture: 'coily', style: 'twists' }, colours: { skin: '#8a5a2b', hair: '#140c08' } }).doc
  assert.ok(swatches.skin.includes(dark.skin as never))
  assert.equal(dark.partColors, undefined, 'twists draw their hair in ink')
  const blond = match({ hair: { length: 'medium', texture: 'straight' }, colours: { hair: '#d9b87a' } })
  const head = blond.doc.parts!.head!
  assert.equal(blond.doc.partColors?.head?.hair, '#d6b370', head)
  assert.ok(reason(blond, 'head')!.matched.includes('colour'))
})

test('garment colours go on the outer layer and the trousers', () => {
  assert.deepEqual(match({ outfit: { top: 'hoodie', holds: 'none' }, colours: { top: '#e02030' } }).doc.partColors?.body, { jacket: '#e63946' })
  assert.deepEqual(match({ outfit: { top: 'tee', pattern: 'stripes', pose: 'relaxed' }, colours: { top: '#30a0f0' } }).doc.partColors?.body, { top: '#38b6ff' })
  const s = match({ type: 'standing', outfit: { top: 'blazer', pose: 'hands-on-hips', aid: 'none' }, colours: { top: '#d0a040', bottom: '#202a50' } }).doc
  assert.deepEqual(s.partColors?.body, { jacket: '#ffe066', pants: '#1d3557' }, s.parts!.body)
  // A plain black tee draws in ink: a colour seen favours a tee that takes one.
  assert.ok(match({ outfit: { top: 'tee', pattern: 'plain' }, colours: { top: '#52b788' } }).doc.partColors?.body?.top)
})

test('light hair favours a beard that takes a colour; a trouser colour favours trousers that take one', () => {
  const { doc } = match({ facialHair: { kind: 'moustache', size: 'medium' }, colours: { hair: '#d0d0d0' } })
  assert.equal(doc.parts!.facialHair, 'moustache-9')
  assert.equal(doc.partColors?.facialHair?.hair, '#e8e1d1')
  const s = match({ type: 'standing', outfit: { top: 'blazer', aid: 'none' }, colours: { top: '#d0a040', bottom: '#c8b48a' } }).doc
  assert.ok(s.partColors?.body?.pants, s.parts!.body)
})

test('a reason never scores above its whole', () => {
  const r = match({ hair: { length: 'medium' }, facialHair: { kind: 'beard' }, outfit: { top: 'sweater' }, mask: 'medical', face: { mood: 'happy' }, colours: { hair: '#d9b87a', top: '#e8574f' } })
  for (const x of r.reasons) assert.ok(x.score <= x.of, JSON.stringify(x))
})

test('a bad colour is an error naming the field', () => {
  assert.throws(() => match({ colours: { skin: 'tan' } }), (e: unknown) => e instanceof DocInvalid && e.errors[0].path === 'colours.skin')
})

test('the same description and seed give the same peep; reasons explain each slot', () => {
  const a: Attributes = { hair: { length: 'short' }, face: { mood: 'happy' }, eyewear: { kind: 'glasses' } }
  assert.deepEqual(match(a, { seed: 7 }), match(a, { seed: 7 }))
  const r = match(a, { seed: 7 })
  for (const x of r.reasons) assert.ok(x.score <= x.of && x.matched.length > 0, `${x.slot}: ${JSON.stringify(x)}`)
  const seen = new Set(Array.from({ length: 12 }, (_, seed) => match(a, { seed }).doc.parts!.head))
  assert.ok(seen.size > 1, 'ties are broken by the seed')
})

test('a full description renders', async () => {
  const { doc } = match({
    hair: { length: 'long', texture: 'wavy', bangs: true }, face: { mood: 'happy', mouth: 'grin' },
    facialHair: { kind: 'none' }, eyewear: { kind: 'sunglasses' }, outfit: { top: 'tee', pattern: 'stripes' },
    colours: { skin: '#f1c27d', hair: '#a55728', top: '#52b788' },
  })
  const { svg } = await renderSvg(doc)
  assert.match(svg, /^<svg/)
})
