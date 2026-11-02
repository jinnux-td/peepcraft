// The CLI over an in-memory io: its pictures are the engine's golden SVGs, byte for byte, and its errors and exit codes are as documented.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { chromium } from 'playwright-core'
import { run, type Io } from './cli.ts'

const golden = new URL('../../packages/peeps-engine/test/golden/', import.meta.url)

function io(files: Record<string, string> = {}, stdin = '', dirs: string[] = ['.', 'out']) {
  const out: string[] = [], err: string[] = [], written: Record<string, string | Uint8Array> = {}
  const it: Io = {
    out: (t) => out.push(t), err: (t) => err.push(t), stdin: async () => stdin,
    readFile: async (p) => { if (!(p in files)) throw new Error(`ENOENT: ${p}`); return files[p] },
    writeFile: async (p, d) => { written[p] = d },
    isDir: async (p) => dirs.includes(p),
    png: async (svg, w, h) => (await import('./png.ts')).svgToPng(svg, w, h),
  }
  return { it, out, err, written }
}

test('render: every golden document gives the golden SVG (the CLI draws what the web app draws)', async () => {
  for (const f of readdirSync(golden).filter((n) => n.endsWith('.json'))) {
    const { it, out } = io({ [f]: readFileSync(new URL(f, golden), 'utf8') })
    assert.equal(await run(['render', f], it), 0, f)
    assert.equal(out.join(''), readFileSync(new URL(f.replace('.json', '.svg'), golden), 'utf8'), f)
  }
})

test('a bad document: one line per problem, with the choices, exit 1', async () => {
  const { it, err } = io({}, '{"v":1,"parts":{"head":"afroo"},"ink":"red"}')
  assert.equal(await run(['render', '-'], it), 1)
  assert.deepEqual(err.map((l) => l.split(':')[0]), ['ink', 'parts.head'])
  assert.match(err[1], /no head "afroo"; known: afro, .*\(48\)$/)
  const notJson = io({ 'a.json': '{' })
  assert.equal(await run(['render', 'a.json'], notJson.it), 1); assert.match(notJson.err[0], /a\.json is not JSON/)
  const big = io({ 'b.json': JSON.stringify({ v: 1, pad: ' '.repeat(17_000) }) })
  assert.equal(await run(['render', 'b.json'], big.it), 1); assert.match(big.err[0], /at most 16384 bytes/)
})

test('usage mistakes: exit 2 with the usage', async () => {
  for (const argv of [['draw'], ['render'], ['render', 'x.json', '-o', 'x.jpg'], ['render', 'x.json', '--scale', '9'], ['random', '--type', 'lying'], ['parts', '--nope']]) {
    const { it, err } = io()
    assert.equal(await run(argv, it), 2, argv.join(' '))
    assert.match(err.join('\n'), /peeps render DOC/)
  }
  const help = io()
  assert.equal(await run(['help'], help.it), 0)
})

test('random: the same seed prints the same document; --keep keeps what it names', async () => {
  const a = io(), b = io()
  await run(['random', '--seed', '7'], a.it); await run(['random', '--seed', '7'], b.it)
  assert.equal(a.out.join(''), b.out.join(''))
  const k = io({ 'k.json': '{"v":1,"type":"sitting","parts":{"head":"afro"}}' })
  await run(['random', '--seed', '3', '--keep', 'k.json'], k.it)
  const doc = JSON.parse(k.out.join(''))
  assert.equal(doc.type, 'sitting'); assert.equal(doc.parts.head, 'afro')
})

test('share and open: the link carries the document; render takes the link too', async () => {
  const doc = readFileSync(new URL('sitting.json', golden), 'utf8')
  const s = io({ 'd.json': doc })
  assert.equal(await run(['share', 'd.json', '--base', 'http://localhost:4183/'], s.it), 0)
  const link = s.out[0]
  assert.match(link, /^http:\/\/localhost:4183\/#d=[\w-]+$/)
  const o = io()
  await run(['open', link], o.it)
  assert.deepEqual(JSON.parse(o.out.join('')), JSON.parse(doc))
  const r = io()
  await run(['render', link], r.it)
  assert.equal(r.out.join(''), readFileSync(new URL('sitting.svg', golden), 'utf8'))
})

test('parts: by category and words, with the pieces to colour', async () => {
  const { it, out } = io()
  assert.equal(await run(['parts', 'head', '-q', 'afro'], it), 0)
  assert.deepEqual(out.map((l) => l.split(/\s+/)[0]), ['head/afro', 'head/long-afro'])
  const things = io()
  await run(['parts', 'thing', '-q', 'plant'], things.it)
  assert.match(things.out.join('\n'), /thing\/potted-plant\s+Potted plant\s+pieces: leaves/)
  const none = io()
  assert.equal(await run(['parts', 'head', '-q', 'zzz'], none.it), 1)
})

test('--save and -o FOLDER name the file as PeepCraft\'s Save button does', async () => {
  const files = { 'd.json': readFileSync(new URL('sitting.json', golden), 'utf8'), 's.json': readFileSync(new URL('scene.json', golden), 'utf8') }
  const saved = io(files)
  assert.equal(await run(['render', 'd.json', '--save'], saved.it), 0)
  assert.deepEqual(Object.keys(saved.written), ['sitting-long-curly-smile-full-crossed-legs.svg'], 'type, then head to toe, parts at none left out')
  assert.equal(saved.written['sitting-long-curly-smile-full-crossed-legs.svg'], readFileSync(new URL('sitting.svg', golden), 'utf8'))
  const folder = io(files)
  await run(['render', 's.json', '-o', 'out'], folder.it)
  assert.deepEqual(Object.keys(folder.written), ['out/scene_standing-afro-smile-crossed-arms-1_figure-runner_potted-plant.svg'], 'a scene: each member in drawing order')
  const slash = io(files, '', [])
  await run(['render', 'd.json', '-o', 'new/'], slash.it)
  assert.deepEqual(Object.keys(slash.written), ['new/sitting-long-curly-smile-full-crossed-legs.svg'], 'a trailing slash is a folder')
  const named = io(files)
  await run(['render', 'd.json', '-o', 'me.svg', '--save'], named.it)
  assert.deepEqual(Object.keys(named.written), ['me.svg'], 'a file name given wins')
  const mixed = io(files)
  assert.equal(await run(['render', 'd.json', '-o', 'me.svg', '--png'], mixed.it), 2)
})

// PNG needs Chromium (npx playwright install chromium); skipped without it.
const hasChromium = existsSync(chromium.executablePath())
test('render -o x.png: a PNG at 1024 x scale, transparent where the picture is', { skip: !hasChromium && 'no Chromium' }, async () => {
  const { it, written, err } = io({ 's.json': readFileSync(new URL('scene.json', golden), 'utf8') })
  assert.equal(await run(['render', 's.json', '--save', '--png', '--scale', '2'], it), 0, err.join('\n'))
  const name = 'scene_standing-afro-smile-crossed-arms-1_figure-runner_potted-plant.png'
  assert.deepEqual(Object.keys(written), [name], 'named as PeepCraft names the PNG')
  const png = written[name] as Uint8Array, view = new DataView(png.buffer, png.byteOffset)
  assert.deepEqual([...png.subarray(1, 4)].map((c) => String.fromCharCode(c)).join(''), 'PNG')
  assert.deepEqual([view.getUint32(16), view.getUint32(20)], [2048, 1152], 'the 16:9 scene, twice 1024 wide')
  assert.equal(png[25], 6, 'RGBA: the transparent background stays transparent')
  assert.match(err[0], /potted-plant\.png {2}2048x1152/)
})
