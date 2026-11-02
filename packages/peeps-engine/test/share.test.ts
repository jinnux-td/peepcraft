import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decodeShare, DocInvalid, encodeShare, fromState, MAX_SHARE, resolve, shareUrl, type PeepCraftDoc } from '../src/index.ts'

const scene: PeepCraftDoc = { v: 1, bg: 'transparent', frame: { ratio: '16:9' }, scene: [{ type: 'standing', parts: { head: 'afro' } }, { figure: 'runner', flip: true }, { thing: 'potted-plant' }] }

test('a document survives the link, from a whole URL, a fragment or the payload', async () => {
  const url = await shareUrl(scene, 'https://peepcraft.jinnux.com/#old')
  assert.ok(url?.startsWith('https://peepcraft.jinnux.com/#d='), url ?? 'null')
  assert.deepEqual(await decodeShare(url!), scene)
  assert.deepEqual(await decodeShare(url!.slice(url!.indexOf('#'))), scene)
  assert.deepEqual(await decodeShare(await encodeShare(scene)), scene)
})

test('a link stays short: the start is a few characters, a 3-member scene well under the limit', async () => {
  assert.ok((await encodeShare({ v: 1 })).length < 20)
  const n = (await encodeShare(scene)).length
  assert.ok(n < 300, `${n} characters`)
  const { doc } = fromState(resolve(scene))
  assert.ok((await encodeShare(doc)).length < 400)
})

test('a link is checked like any document', async () => {
  await assert.rejects(decodeShare('#d=' + await encodeShare({ v: 1, parts: { head: 'afroo' } } as PeepCraftDoc)), (e) => e instanceof DocInvalid && e.errors[0].path === 'parts.head')
  await assert.rejects(decodeShare('#x=1'), /no document in the link/)
  await assert.rejects(decodeShare('#d=not*base64'), /base64url only/)
  await assert.rejects(decodeShare('#d=AAAA'), /does not hold a document/)
  await assert.rejects(decodeShare('#d=' + 'A'.repeat(MAX_SHARE + 1)), /at most/)
})

test('a payload that inflates past 16 KB is refused before it is all read', async () => {
  const bomb = { v: 1, ink: '#000000', pad: ' '.repeat(200_000) }
  const payload = await encodeShare(bomb as unknown as PeepCraftDoc)
  assert.ok(payload.length < MAX_SHARE, 'small enough to be a link')
  await assert.rejects(decodeShare(payload), /over 16384 bytes/)
})

test('a document too big for a link gives no URL', async () => {
  // Noise does not compress: 12 KB of it is past the 8 KB a link carries.
  let x = 1
  const noise = Array.from({ length: 12_000 }, () => String.fromCharCode(33 + ((x = (x * 48271) % 2147483647) % 90))).join('')
  assert.equal(await shareUrl({ v: 1, pad: noise } as unknown as PeepCraftDoc, 'https://p/'), null)
})
