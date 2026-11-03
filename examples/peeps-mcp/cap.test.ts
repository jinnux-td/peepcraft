// The daily cap with a Map for the Durable Object's storage: places run out, a new UTC day starts again, a limit of 0 lets none through.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PhotoCap, takePlace, type CapNamespace } from './cap.ts'

function namespace() {
  const map = new Map<string, unknown>()
  const cap = new PhotoCap({ storage: { get: async <T>(k: string) => map.get(k) as T | undefined, put: async (k, v) => { map.set(k, v) } } })
  const ns: CapNamespace = { idFromName: (n) => n, get: () => ({ fetch: (url: string) => cap.fetch(new Request(url)) }) }
  return { ns, map }
}

test('the daily cap: the limit is reached, the next day starts again, 0 lets none through', async (t) => {
  const { ns, map } = namespace()
  const taken = []
  for (let i = 0; i < 4; i++) taken.push(await takePlace(ns, 3))
  assert.deepEqual(taken, [true, true, true, false])
  t.mock.timers.enable({ apis: ['Date'], now: Date.now() + 86_400_000 })
  assert.equal(await takePlace(ns, 3), true, 'a new UTC day')
  assert.equal((map.get('count') as { used: number }).used, 1)
  t.mock.timers.reset()
  assert.equal(await takePlace(namespace().ns, 0), false)
})
