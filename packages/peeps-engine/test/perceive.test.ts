import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ATTRIBUTES_SCHEMA, checkImage, match, perceiveRequest, PerceiveError, readPerception, validate } from '../src/index.ts'

// A reply as the schema shapes it: the model's words for a person with long wavy hair, glasses, a red sweater.
const reply = (over: Record<string, unknown> = {}, stop = 'end_turn') => ({
  stop_reason: stop,
  content: [{ type: 'thinking', text: '' }, { type: 'text', text: JSON.stringify({
    person: 'one', type: 'bust',
    hair: { length: 'long', texture: 'wavy', style: 'loose', bangs: false, cover: 'none' },
    face: { mood: 'happy', eyes: 'open', mouth: 'smile', wrinkles: false },
    facialHair: { kind: 'none', size: 'none', moustache: false, styled: 'none' },
    eyewear: { kind: 'glasses', frame: 'round', thick: false, light: false },
    mask: 'none',
    outfit: { top: 'sweater', sleeves: 'long', pattern: 'plain', bottom: 'none', pose: 'relaxed', holds: 'none' },
    colours: { skin: '#e0b090', hair: '#5a3a22', top: '#d03a3a', bottom: null },
    ...over,
  }) }],
})

test('the schema: every object closed and every field required, as structured outputs need', () => {
  const walk = (s: any, path: string) => {
    if (s.type === 'object') {
      assert.equal(s.additionalProperties, false, path)
      assert.deepEqual([...s.required].sort(), Object.keys(s.properties).sort(), path)
      for (const [k, v] of Object.entries(s.properties)) walk(v, `${path}.${k}`)
    }
    for (const k of ['minimum', 'maximum', 'minLength', 'maxLength', 'pattern']) assert.ok(!(k in s), `${path}: ${k} is not supported`)
  }
  walk(ATTRIBUTES_SCHEMA, '$')
  assert.ok(!('aid' in (ATTRIBUTES_SCHEMA.properties.outfit as any).properties), 'a mobility aid is never read from a photo')
})

test('the request: the image first, then the prompt; the schema as the output format; a fallback for a declined request', () => {
  const r = perceiveRequest({ data: 'AAAA', mediaType: 'image/png' })
  assert.equal(r.model, 'claude-opus-5-5')
  assert.deepEqual(r.messages[0].content[0], { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAAA' } })
  assert.equal(r.messages[0].content[1].type, 'text')
  assert.equal(r.output_config.format.schema, ATTRIBUTES_SCHEMA)
  assert.equal(r.output_config.effort, 'low')
  assert.equal(r.fallbacks, 'default')
  assert.deepEqual(r.betas, ['server-side-fallback-2026-07-01'])
  assert.equal(perceiveRequest({ url: 'https://x.test/a.jpg' }, { model: 'claude-haiku-5-5' }).model, 'claude-haiku-5-5')
  assert.deepEqual(perceiveRequest({ url: 'https://x.test/a.jpg' }).messages[0].content[0], { type: 'image', source: { type: 'url', url: 'https://x.test/a.jpg' } })
  assert.ok(!('temperature' in r) && !('thinking' in r) && !('tool_choice' in r))
})

test('reading a reply: a description the matcher takes, a valid document', () => {
  const { attributes, people } = readPerception(reply())
  assert.equal(people, 'one')
  assert.deepEqual(attributes.colours, { skin: '#e0b090', hair: '#5a3a22', top: '#d03a3a' })
  const { doc } = match(attributes)
  assert.ok(validate(doc).ok)
  assert.equal(doc.parts!.accessories, 'glasses-2')
})

test('a colour that is not #rrggbb is left out, not an error', () => {
  const { attributes } = readPerception(reply({ colours: { skin: 'tan', hair: '#000000', top: null, bottom: null } }))
  assert.deepEqual(attributes.colours, { hair: '#000000' })
})

test('errors: refusal, cut off, no person, not JSON', () => {
  const code = (f: () => unknown) => { try { f(); return 'none' } catch (e) { return e instanceof PerceiveError ? e.code : String(e) } }
  assert.equal(code(() => readPerception(reply({}, 'refusal'))), 'refusal')
  assert.equal(code(() => readPerception(reply({}, 'max_tokens'))), 'truncated')
  assert.equal(code(() => readPerception(reply({ person: 'none' }))), 'no-person')
  assert.equal(code(() => readPerception({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'a smiling person' }] })), 'reply')
})

test('images: the types and size the API takes, https URLs only', () => {
  assert.doesNotThrow(() => checkImage({ data: 'AAAA', mediaType: 'image/jpeg' }))
  assert.throws(() => checkImage({ data: 'AAAA', mediaType: 'image/bmp' }), PerceiveError)
  assert.throws(() => checkImage({ data: 'A'.repeat(7 * 1024 * 1024 + 4), mediaType: 'image/png' }), /limit is 5 MB/)
  assert.throws(() => checkImage({ url: 'http://x.test/a.jpg' }), /https/)
})
