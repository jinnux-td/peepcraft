// PeepCraft in a terminal: the same document, checks and drawing as the web app (@kit/peeps-engine), with no browser for SVG and no
// network. `run` takes the arguments and an io object, so the tests drive it without spawning a process.
import { parseArgs } from 'node:util'
import type { PeepType } from '@kit/peeps'
import { decodeShare, DocInvalid, frameSize, LIMITS, nameOf, randomDoc, renderSvg, search, shareUrl, SIZE, validate, type PeepCraftDoc } from '@kit/peeps-engine'

export interface Io {
  out: (text: string) => void
  err: (text: string) => void
  /** The whole of stdin, for `-`. */
  stdin: () => Promise<string>
  readFile: (path: string) => Promise<string>
  writeFile: (path: string, data: string | Uint8Array) => Promise<void>
  /** True for an existing folder: -o into it takes the name PeepCraft's Save gives. */
  isDir: (path: string) => Promise<boolean>
  /** SVG to PNG at a pixel size; Chromium in main.ts. */
  png: (svg: string, width: number, height: number) => Promise<Uint8Array>
}

export const BASE = 'https://peepcraft.jinnux.com/'
const TYPES: readonly PeepType[] = ['standing', 'sitting', 'bust']

/** The package version, set by build.mjs; 'dev' when run from the repo. */
declare const PEEP_VERSION: string | undefined
export const version = typeof PEEP_VERSION === 'string' ? PEEP_VERSION : 'dev'

export const usage = `peep: PeepCraft from the terminal. One JSON document describes a picture; { "v": 1 } is the default bust.

  peep parts [category] [--type T] [--query WORDS] [--json]
      what a document can name: head, face, body, standing, sitting, facialHair, accessories, mask, figure, thing
  peep random [--type T] [--seed N] [--keep DOC]       a random document (the same seed, the same document)
  peep render DOC [-o FILE.svg|FILE.png] [--scale 1-4] the picture; SVG to stdout without -o; PNG is 1024 px on the long side x scale
  peep render DOC --save [--png] [-o DIR]              saved under the name PeepCraft's Save gives it (bust-afro-smile-tee-1.svg),
                                                        in the current folder or DIR; -o DIR alone does the same
  peep share DOC [--base URL]                          a link that opens the picture in PeepCraft
  peep open LINK                                       the document in a link

DOC is a JSON file, - for stdin, or a share link. T is standing, sitting or bust.
PNG uses the Chrome or Edge installed on this computer. Open Peeps and Transhumans art by Pablo Stanley (CC0).
https://peepcraft.jinnux.com/`

/** A usage mistake (exit 2), as opposed to a document that does not validate (exit 1). */
class Usage extends Error {}

/** Runs one command; the exit code. */
export async function run(argv: string[], io: Io): Promise<number> {
  try {
    const [command, ...rest] = argv
    switch (command) {
      case 'parts': return parts(rest, io)
      case 'random': return await random(rest, io)
      case 'render': return await render(rest, io)
      case 'share': return await share(rest, io)
      case 'open': return await open(rest, io)
      case undefined: case 'help': case '--help': case '-h': io.out(usage); return command ? 0 : 2
      case 'version': case '--version': case '-v': io.out(version); return 0
      default: throw new Usage(`no command "${command}"`)
    }
  } catch (e) {
    if (e instanceof DocInvalid) { for (const x of e.errors) io.err(line(x)); return 1 }
    if (e instanceof Usage) { io.err(`${e.message}\n\n${usage}`); return 2 }
    io.err((e as Error).message); return 1
  }
}

/** One error a line: `parts.head: no head "afroo"; known: afro, bangs, ...` (the first 12 choices). */
const line = ({ path, message, choices }: { path: string; message: string; choices?: string[] }) =>
  `${path || '(document)'}: ${message}${choices ? `; known: ${choices.slice(0, 12).join(', ')}${choices.length > 12 ? `, ... (${choices.length})` : ''}` : ''}`

function args(rest: string[], options: NonNullable<Parameters<typeof parseArgs>[0]>['options']): { values: Record<string, string | boolean | undefined>; positionals: string[] } {
  try { return parseArgs({ args: rest, options, allowPositionals: true, strict: true }) as { values: Record<string, string | boolean | undefined>; positionals: string[] } }
  catch (e) { throw new Usage((e as Error).message) }
}

const type = (t: unknown): PeepType | undefined => {
  if (t === undefined) return undefined
  if (!TYPES.includes(t as PeepType)) throw new Usage(`--type is one of ${TYPES.join(', ')}`)
  return t as PeepType
}

/** A document from a file, stdin (-) or a share link, checked. */
async function read(source: string | undefined, io: Io): Promise<PeepCraftDoc> {
  if (!source) throw new Usage('which document? a file, - for stdin, or a share link')
  if (/^https?:\/\/|^#/.test(source)) return decodeShare(source)
  let text: string
  try { text = source === '-' ? await io.stdin() : await io.readFile(source) }
  catch (e) { throw new Error((e as NodeJS.ErrnoException).code === 'ENOENT' ? `no file ${source}` : (e as Error).message) }
  if (new TextEncoder().encode(text).length > LIMITS.bytes) throw new Error(`a document is at most ${LIMITS.bytes} bytes`)
  let json: unknown
  try { json = JSON.parse(text) } catch (e) { throw new Error(`${source === '-' ? 'stdin' : source} is not JSON: ${(e as Error).message}`) }
  const checked = validate(json)
  if (!checked.ok) throw new DocInvalid(checked.errors)
  return checked.doc
}

function parts(rest: string[], io: Io): number {
  const { values, positionals } = args(rest, { type: { type: 'string' }, query: { type: 'string', short: 'q' }, json: { type: 'boolean' } })
  const found = search({ category: positionals[0], type: type(values.type), query: values.query as string | undefined })
  if (values.json) { io.out(JSON.stringify(found, null, 2)); return 0 }
  if (!found.length) { io.err('nothing found'); return 1 }
  const width = Math.max(...found.map((i) => `${i.category}/${i.id}`.length))
  for (const i of found) {
    const pieces = Object.keys(i.pieces)
    io.out(`${`${i.category}/${i.id}`.padEnd(width)}  ${i.label}${i.extra ? ' (extra)' : ''}${pieces.length ? `  pieces: ${pieces.join(', ')}` : ''}`)
  }
  return 0
}

async function random(rest: string[], io: Io): Promise<number> {
  const { values } = args(rest, { type: { type: 'string' }, seed: { type: 'string' }, keep: { type: 'string' } })
  const seed = values.seed === undefined ? undefined : Number(values.seed)
  if (seed !== undefined && !Number.isInteger(seed)) throw new Usage('--seed is a whole number')
  const keep = values.keep ? await read(values.keep as string, io) : undefined
  io.out(JSON.stringify(randomDoc({ type: type(values.type), keep, seed }), null, 2))
  return 0
}

async function render(rest: string[], io: Io): Promise<number> {
  const { values, positionals } = args(rest, { output: { type: 'string', short: 'o' }, scale: { type: 'string' }, save: { type: 'boolean' }, png: { type: 'boolean' } })
  const out = values.output as string | undefined, scale = Number(values.scale ?? 1)
  if (![1, 2, 3, 4].includes(scale)) throw new Usage('--scale is 1, 2, 3 or 4')
  // A file named by -o, or a folder (-o DIR, --save) where the file takes the name PeepCraft's Save button gives it.
  const folder = out === undefined ? (values.save ? '.' : undefined) : /[\\/]$/.test(out) || (await io.isDir(out)) ? out : undefined
  if (out !== undefined && folder === undefined) {
    if (!/\.(svg|png)$/i.test(out)) throw new Usage('-o is a folder, or a file ending in .svg or .png')
    if (values.png && !/\.png$/i.test(out)) throw new Usage('--png with -o FILE.svg: name the file .png, or give a folder')
  }
  const { svg, state } = await renderSvg(await read(positionals[0], io))
  if (out === undefined && folder === undefined) { io.out(svg); return 0 }
  const kind = folder !== undefined ? (values.png ? 'png' : 'svg') : /\.png$/i.test(out!) ? 'png' : 'svg'
  const file = folder !== undefined ? `${folder.replace(/[\\/]+$/, '') || '.'}/${nameOf(state, kind)}`.replace(/^\.\//, '') : out!
  if (kind === 'svg') { await io.writeFile(file, svg); io.err(`${file}  ${Math.round(svg.length / 1024)} KB`); return 0 }
  const base = state.scene.length ? frameSize(state) : { width: SIZE, height: SIZE }
  const png = await io.png(svg, base.width * scale, base.height * scale)
  await io.writeFile(file, png)
  io.err(`${file}  ${base.width * scale}x${base.height * scale}  ${Math.round(png.length / 1024)} KB`)
  return 0
}

async function share(rest: string[], io: Io): Promise<number> {
  const { values, positionals } = args(rest, { base: { type: 'string' } })
  const link = await shareUrl(await read(positionals[0], io), (values.base as string | undefined) ?? BASE)
  if (!link) { io.err('too big for a link; share the JSON file instead'); return 1 }
  io.out(link)
  return 0
}

async function open(rest: string[], io: Io): Promise<number> {
  const { positionals } = args(rest, {})
  if (!positionals[0]) throw new Usage('which link?')
  io.out(JSON.stringify(await decodeShare(positionals[0]), null, 2))
  return 0
}
