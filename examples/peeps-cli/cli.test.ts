// The CLI over an in-memory io: its pictures are the engine's golden SVGs, byte for byte, and its errors and exit codes are as documented.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
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
  assert.match(err[1], /no head "afroo"\. Did you mean afro\? Known: afro, .*\(48\)$/)
  const notJson = io({ 'a.json': '{' })
  assert.equal(await run(['render', 'a.json'], notJson.it), 1); assert.match(notJson.err[0], /a\.json is not JSON/)
  const big = io({ 'b.json': JSON.stringify({ v: 1, pad: ' '.repeat(17_000) }) })
  assert.equal(await run(['render', 'b.json'], big.it), 1); assert.match(big.err[0], /at most 16384 bytes/)
})

test('usage mistakes: exit 2, what went wrong, a guess, and where the help is', async () => {
  const cases: [string[], RegExp][] = [
    [['rendr'], /^peep: no command "rendr"\. Did you mean render\?\nRun peep --help for usage\.$/],
    [['render', 'x.json', '--sav'], /no option --sav\. Did you mean --save\?\nRun peep render --help/],
    [['render'], /which document\?/],
    [['render', 'x.json', '-o', 'x.jpg'], /-o is a folder, or a file ending in \.svg or \.png/],
    [['render', 'x.json', '--scale', '9'], /--scale is 1, 2, 3 or 4/],
    [['random', '--type', 'stading'], /not "stading"\. Did you mean standing\?/],
    [['parts', 'hed'], /no category "hed"\. Did you mean head\?/],
    [['completion', 'zhs'], /Did you mean zsh\?/],
    [['help', 'rander'], /Did you mean render\?/],
  ]
  for (const [argv, expected] of cases) {
    const { it, err } = io()
    assert.equal(await run(argv, it), 2, argv.join(' '))
    assert.match(err.join('\n'), expected, argv.join(' '))
  }
})

test('help: the overview, each command, and --help anywhere; --version', async () => {
  const all = io()
  assert.equal(await run(['--help'], all.it), 0)
  for (const c of ['render', 'random', 'parts', 'share', 'open', 'completion']) assert.match(all.out[0], new RegExp(`\\n  ${c} `), c)
  const one = io()
  assert.equal(await run(['render', 'x.json', '--help'], one.it), 0, 'help wins over a missing file')
  assert.match(one.out[0], /^peep render: draw a document/); assert.match(one.out[0], /-o, --output PATH/); assert.match(one.out[0], /Examples\n {2}peep render me\.json --save/)
  assert.ok(one.out[0].split('\n').every((l) => l.length <= 80), 'wrapped for a terminal')
  const via = io()
  await run(['help', 'parts'], via.it)
  assert.match(via.out[0], /-q, --query WORDS/)
  const none = io()
  assert.equal(await run([], none.it), 2, 'no command: the overview, exit 2')
  const v = io()
  await run(['-v'], v.it); assert.equal(v.out[0], 'dev')
})

test('a mistyped id gets a guess before the list', async () => {
  const { it, err } = io({}, '{"v":1,"parts":{"head":"afroo","face":"calmm"}}')
  assert.equal(await run(['render', '-'], it), 1)
  assert.match(err[0], /^parts\.head: no head "afroo"\. Did you mean afro\? Known: afro, /)
  assert.match(err[1], /Did you mean calm\?/)
})

test('tab completion: commands, options, values, categories, part ids, files', async () => {
  const c = async (...words: string[]) => { const { it, out } = io(); await run(['__complete', ...words], it); return out.join('\n').split('\n').filter(Boolean).map((l) => l.split('\t')[0]) }
  assert.deepEqual(await c(''), ['render', 'random', 'parts', 'share', 'open', 'from-image', 'completion', 'help'])
  assert.ok((await c('render', '--')).includes('--save'))
  assert.deepEqual(await c('render', ''), ['__files__'])
  assert.deepEqual(await c('render', 'x.json', '--scale', ''), ['1', '2', '3', '4'])
  assert.deepEqual(await c('random', '--type', ''), ['standing', 'sitting', 'bust'])
  assert.ok((await c('parts', '')).includes('facialHair'))
  assert.ok((await c('parts', 'head', '-q', '')).includes('long-curly'), 'ids of the category')
  assert.deepEqual(await c('completion', ''), ['zsh', 'bash'])
  const zsh = io(); await run(['completion', 'zsh'], zsh.it)
  assert.match(zsh.out[0], /^#compdef peep/); assert.match(zsh.out[0], /peep __complete/)
  const bash = io(); await run(['completion', 'bash'], bash.it)
  assert.match(bash.out[0], /complete -o default -F _peep peep/)
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

test('the published bundle (dist/peep.js) draws the golden SVGs and knows its version', async () => {
  const dir = new URL('./', import.meta.url).pathname
  execFileSync('node', [dir + 'build.mjs'], { stdio: 'pipe' })
  const peep = (...a: string[]) => execFileSync(dir + 'dist/peep.js', a, { encoding: 'utf8' })
  assert.equal(peep('--version').trim(), JSON.parse(readFileSync(dir + 'package.json', 'utf8')).version)
  for (const name of ['scene', 'mono']) assert.equal(peep('render', new URL(`${name}.json`, golden).pathname), readFileSync(new URL(`${name}.svg`, golden), 'utf8') + '\n', name)
})

test('random with flags: what they name is fixed, the rest rolls, colours stay unless given', async () => {
  const doc = async (...argv: string[]) => { const { it, out, err } = io(); const code = await run(['random', ...argv], it); assert.equal(code, 0, err.join('\n')); return JSON.parse(out.join('')) }
  const d = await doc('--type', 'sitting', '--head', 'afro', '--body', 'crossed-legs', '--ink', 'navy', '--skin', '8d5524', '--bg', 'transparent', '--color', 'body.top=crimson', '--seed', '3')
  assert.equal(d.type, 'sitting'); assert.equal(d.parts.head, 'afro'); assert.equal(d.parts.body, 'crossed-legs')
  assert.equal(d.ink, '#1d3557'); assert.equal(d.skin, '#8d5524'); assert.equal(d.bg, 'transparent'); assert.deepEqual(d.partColors, { body: { top: '#e63946' } })
  const plain = await doc('--seed', '5')
  assert.deepEqual(Object.keys(plain).sort(), ['parts', 'v'], 'nothing but parts rolled: bust, PeepCraft colours, no mask, no extra')
  const bandana = await doc('--color', 'head.bandana=crimson', '--seed', '2')
  assert.ok(['bun', 'bun-2'].includes(bandana.parts.head) || bandana.parts.head, 'a head with a bandana was rolled')
  const facial = await doc('--facial-hair', 'full', '--color', 'facial-hair.ink=brown')
  assert.equal(facial.parts.facialHair, 'full'); assert.equal(facial.partColors.facialHair.ink, '#6b2d1a')
})

test('random: contradictions are errors, named by their flags', async () => {
  const fails = async (argv: string[], files: Record<string, string> = {}) => { const { it, err } = io(files); const code = await run(['random', ...argv], it); return { code, text: err.join('\n') } }
  let r = await fails(['--head', 'afro', '--color', 'head.bandana=red'])
  assert.equal(r.code, 1); assert.match(r.text, /^--color head\.bandana: afro has no piece "bandana"/)
  r = await fails(['--type', 'bust', '--body', 'crossed-legs'])
  assert.equal(r.code, 1); assert.match(r.text, /^--body: no body "crossed-legs" for the type bust/)
  r = await fails(['--color', 'head.hair=red', '--color', 'head.hair=blue'])
  assert.equal(r.code, 2); assert.match(r.text, /given twice/)
  r = await fails(['--keep', 'k.json', '--head', 'afro', '--ink', 'navy', '--type', 'bust'], { 'k.json': '{"v":1,"type":"bust","parts":{"head":"bun"},"ink":"#111111"}' })
  assert.equal(r.code, 2); assert.match(r.text, /--head "afro" but k\.json has parts\.head "bun"/); assert.match(r.text, /--ink "#1d3557" but k\.json has ink "#111111"/)
  r = await fails(['--keep', 'k.json', '--type', 'sitting'], { 'k.json': '{"v":1,"type":"bust"}' })
  assert.equal(r.code, 2); assert.match(r.text, /--type "sitting" but k\.json has type "bust"/)
  r = await fails(['--ink', 'navvy'])
  assert.equal(r.code, 2); assert.match(r.text, /Did you mean navy\?/)
  r = await fails(['--color', 'hed.hair=red'])
  assert.equal(r.code, 2); assert.match(r.text, /no slot "hed"\. Did you mean head\?/)
  r = await fails(['afro'])
  assert.equal(r.code, 2); assert.match(r.text, /parts are flags, such as --head afro/)
  r = await fails(['--keep', 'k.json', '--head', 'bun'], { 'k.json': '{"v":1,"parts":{"head":"bun"}}' })
  assert.equal(r.code, 0, 'the same value twice is no contradiction')
})

test('tab completion for random: ids of the type, the pieces of the chosen item, colours by name', async () => {
  const c = async (...words: string[]) => { const { it, out } = io(); await run(['__complete', ...words], it); return out.join('\n').split('\n').filter(Boolean).map((l) => l.split('\t')) }
  const sitting = await c('random', '--type', 'sitting', '--body', '')
  assert.ok(sitting.some(([v]) => v === 'crossed-legs')); assert.ok(!sitting.some(([v]) => v === 'tee-1'), 'poses of the type, not bust torsos')
  assert.ok((await c('random', '--body', '')).some(([v]) => v === 'tee-1'), 'a bust when no type is given')
  const afro = await c('random', '--head', 'afro', '--color', '')
  assert.deepEqual(afro.filter(([v]) => v.startsWith('head.')).map(([v]) => v), ['head.ink=', 'head.paper='], 'afro has only its lines and fill')
  const open = await c('random', '--color', '')
  assert.ok(open.some(([v, about]) => v === 'head.bandana=' && /rolls among them/.test(about)))
  const hair = await c('random', '--color', 'head.hair=')
  assert.deepEqual(hair[0], ['head.hair=jet', '#111111']); assert.ok(hair.some(([v]) => v === 'head.hair=auburn'))
  assert.deepEqual((await c('random', '--ink', ''))[1], ['navy', '#1d3557'])
  assert.deepEqual((await c('random', '--bg', ''))[0], ['transparent', 'no background'])
  assert.ok((await c('random', '--')).some(([v]) => v === '--facial-hair'))
  assert.ok(!(await c('random', '--head', 'afro', '--')).some(([v]) => v === '--head'), 'a flag given is not offered again')
})

test('colour names: every PeepCraft swatch has one, one name a colour', async () => {
  const { NAMES, nameOf } = await import('./colours.ts')
  const { swatches } = await import('@kit/peeps-engine')
  for (const hex of Object.values(swatches).flat()) assert.ok(nameOf(hex), `${hex} has a name`)
  assert.equal(new Set(Object.values(NAMES)).size, Object.keys(NAMES).length)
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

// from-image over a fake model: nothing is sent anywhere.
const described = (over: Record<string, unknown> = {}) => ({
  stop_reason: 'end_turn',
  content: [{ type: 'text', text: JSON.stringify({
    person: 'one', type: 'bust',
    hair: { length: 'none', texture: 'none', style: 'bald', bangs: false, cover: 'none' },
    face: { mood: 'happy', eyes: 'closed', mouth: 'grin', wrinkles: false },
    facialHair: { kind: 'beard', size: 'large', moustache: true, styled: 'none' },
    eyewear: { kind: 'none', frame: 'none', thick: false, light: false },
    mask: 'none',
    outfit: { top: 'hoodie', sleeves: 'long', pattern: 'plain', bottom: 'none', pose: 'relaxed', holds: 'none' },
    colours: { skin: '#c68642', hair: null, top: '#38b6ff', bottom: null },
    ...over,
  }) }],
})

function photoIo(reply: () => Promise<any>) {
  const t = io(), sent: any[] = []
  t.it.readBytes = async (p) => { if (p !== 'me.jpg' && p !== 'me.PNG') throw new Error(`ENOENT: ${p}`); return new Uint8Array([0xff, 0xd8, 0xff]) }
  t.it.perceive = async (req) => { sent.push(req); return reply() }
  return { ...t, sent }
}

test('from-image: a file to a document on stdout, why on stderr; the document renders', async () => {
  const t = photoIo(async () => described())
  assert.equal(await run(['from-image', 'me.jpg', '--seed', '1'], t.it), 0, t.err.join('\n'))
  const doc = JSON.parse(t.out.join(''))
  assert.equal(doc.parts.facialHair, 'full-3')
  assert.equal(doc.skin, '#c68642')
  assert.match(t.err.join('\n'), /^facialHair: full-3 \(kind, size, moustache/m)
  assert.deepEqual(t.sent[0].messages[0].content[0].source, { type: 'base64', media_type: 'image/jpeg', data: '/9j/' })
  assert.equal(t.sent[0].model, 'claude-opus-5-5')
  const r = io({ 'me.json': t.out.join('') })
  assert.equal(await run(['render', 'me.json'], r.it), 0)
})

test('from-image: a URL and --model go into the request', async () => {
  const t = photoIo(async () => described())
  assert.equal(await run(['from-image', 'https://example.com/me.webp', '--model', 'claude-haiku-5-5'], t.it), 0)
  assert.deepEqual(t.sent[0].messages[0].content[0].source, { type: 'url', url: 'https://example.com/me.webp' })
  assert.equal(t.sent[0].model, 'claude-haiku-5-5')
})

test('from-image: usage mistakes exit 2; a photo it cannot read exits 1 with the reason', async () => {
  const code = async (argv: string[], reply = async () => described()) => { const t = photoIo(reply); return [await run(argv, t.it), t.err.join('\n')] as const }
  assert.equal((await code(['from-image']))[0], 2)
  assert.equal((await code(['from-image', 'me.bmp']))[0], 2)
  assert.equal((await code(['from-image', 'me.jpg', '--seed', 'x']))[0], 2)
  const [noPerson, msg] = await code(['from-image', 'me.jpg'], async () => described({ person: 'none' }))
  assert.equal(noPerson, 1); assert.match(msg, /no person/)
  const [http, why] = await code(['from-image', 'http://example.com/a.jpg'])
  assert.equal(http, 1); assert.match(why, /https/)
  const [refused, r] = await code(['from-image', 'me.jpg'], async () => ({ ...described(), stop_reason: 'refusal' }))
  assert.equal(refused, 1); assert.match(r, /declined/)
})

test('from-image is in the help and completes files', async () => {
  const t = io()
  assert.equal(await run(['help', 'from-image'], t.it), 0)
  assert.match(t.out.join(''), /ANTHROPIC_API_KEY/)
  const c = io()
  await run(['__complete', 'from-image', ''], c.it)
  assert.equal(c.out.join(''), '__files__')
})
