// Opt-in: PEEPS_ASSETS="<path to>/Flat Assets" re-derives the layout from the pack's 302 ready-made templates.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { catalogue, onHead, origins, type PeepType } from '../src/index.ts'
import { loadAll } from '../src/registry.ts'

// The atoms' paths load on demand; these tests draw them, so load them all first.
await loadAll()

const root = process.env.PEEPS_ASSETS
// Faces the templates use that the pack ships no separate atom for (56 of 302 templates).
const notAtoms = new Set(['face/smiling', 'face/happy-grin'])
const kinds: Array<[string, PeepType]> = [['Standing', 'standing'], ['Sitting', 'sitting'], ['Bust', 'bust']]
const kebab = (s: string) => s.replace(/^\*-?/, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
const at = (g?: RegExpMatchArray | null): [number, number] | undefined => {
  const m = g && /translate\(([-\d.]+),\s*([-\d.]+)\)/.exec(g[0])
  return m ? [Number(m[1]), Number(m[2])] : undefined
}

for (const [folder, type] of kinds) test(`${folder} templates: names resolve and offsets keep the proportions of the layout`, { skip: !root }, () => {
  const dir = join(root!, 'Templates', folder)
  const files = readdirSync(dir).filter((f) => f.endsWith('.svg'))
  assert.ok(files.length > 10)
  const o = origins[type]
  const bodyCat = type === 'bust' ? 'body' : type
  for (const f of files) {
    const svg = readFileSync(join(dir, f), 'utf8')
    const g = (prefix: string) => svg.match(new RegExp(`<g id="${prefix}[^"]*"[^>]*>`))
    const name = (m?: RegExpMatchArray | null) => /id="[^"]*?\/([^"/]*)"/.exec(m?.[0] ?? '')?.[1]
    const parts: Array<[Parameters<typeof catalogue['face']['get']>[0] | undefined, 'accessories' | 'body' | 'face' | 'facialHair' | 'head' | 'standing' | 'sitting', string]> = [
      [name(g(type === 'bust' ? 'body/' : 'pose/')), bodyCat, 'body'], [name(g('head/')), 'head', 'head'], [name(g('face/')), 'face', 'face'],
      [name(g('facial-hair/')), 'facialHair', 'facialHair'], [name(g('accessories/')), 'accessories', 'accessories'],
    ]
    for (const [n, cat, slot] of parts) assert.ok((!n && (slot === 'facialHair' || slot === 'accessories')) || n && (catalogue[cat].has(kebab(n)) || notAtoms.has(`${slot}/${kebab(n)}`)), `${f}: ${slot} "${n}"`)
    const head = at(type === 'bust' ? g('head/') : g('Head'))!, face = at(g('face/'))!, body = at(type === 'bust' ? g('body/') : g('pose/'))!
    const scale = type === 'bust' ? (face[0] - head[0]) / onHead.face.x : face[0] / onHead.face.x
    const rel = (p?: [number, number]) => p && (type === 'bust' ? [p[0] - head[0], p[1] - head[1]] : p)
    for (const slot of ['face', 'facialHair', 'accessories'] as const) {
      const t = rel(at(g(slot === 'facialHair' ? 'facial-hair/' : slot + '/')))
      if (t) { assert.ok(Math.abs(t[0] / scale - onHead[slot].x) < 1.5, `${f} ${slot} x`); assert.ok(Math.abs(t[1] / scale - onHead[slot].y) < 1.5, `${f} ${slot} y`) }
    }
    assert.ok(Math.abs((body[0] - head[0]) / scale - (o.body.x - o.head.x)) < 1.5, `${f} body x`)
    assert.ok(Math.abs((body[1] - head[1]) / scale - (o.body.y - o.head.y)) < 1.5, `${f} body y`)
  }
})
