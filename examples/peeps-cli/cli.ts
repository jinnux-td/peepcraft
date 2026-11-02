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
  /** Bold headings in help: stdout is a terminal and NO_COLOR is not set. */
  color?: boolean
  /** SVG to PNG at a pixel size; Chromium in main.ts. */
  png: (svg: string, width: number, height: number) => Promise<Uint8Array>
}

export const BASE = 'https://peepcraft.jinnux.com/'
const TYPES: readonly PeepType[] = ['standing', 'sitting', 'bust']

/** The package version, set by build.mjs; 'dev' when run from the repo. */
declare const PEEP_VERSION: string | undefined
export const version = typeof PEEP_VERSION === 'string' ? PEEP_VERSION : 'dev'

// Every command, its options and examples, in one table: the help, the "did you mean" and the shell completion all read it.
interface Option { long: string; short?: string; value?: string; help: string; complete?: () => readonly string[] | 'files' }
interface Command { name: string; args: string; summary: string; about?: string; options: Option[]; examples: string[]; complete?: (positionals: string[]) => readonly string[] | 'files' }

const CATEGORIES = ['head', 'face', 'facialHair', 'mask', 'accessories', 'body', 'standing', 'sitting', 'figure', 'thing']
const typeOption: Option = { long: 'type', value: 'T', help: 'standing, sitting or bust', complete: () => TYPES }
const help: Option = { long: 'help', short: 'h', help: 'show this help' }

export const COMMANDS: readonly Command[] = [
  {
    name: 'render', args: 'DOC', summary: 'draw a document as SVG or PNG',
    about: 'SVG goes to stdout unless it is saved. --save and -o FOLDER name the file as PeepCraft\'s Save button does: the type, then the parts head to toe (bust-afro-smile-tee-1.svg); a scene is scene_ and each member. PNG is 1024 px on the long side, times --scale, drawn by the Chrome or Edge on this computer.',
    options: [
      { long: 'save', help: 'save in this folder (or -o FOLDER) under PeepCraft\'s name' },
      { long: 'png', help: 'save as PNG rather than SVG' },
      { long: 'output', short: 'o', value: 'PATH', help: 'a folder, or a file of your own ending in .svg or .png', complete: () => 'files' },
      { long: 'scale', value: 'N', help: 'PNG size: 1, 2, 3 or 4 times 1024 px', complete: () => ['1', '2', '3', '4'] },
      help,
    ],
    examples: ['peep render me.json --save', 'peep render me.json --save --png --scale 2', 'peep render me.json -o out/', 'peep random | peep render - > me.svg'],
    complete: () => 'files',
  },
  {
    name: 'random', args: '', summary: 'print a random document',
    about: 'As PeepCraft\'s Shuffle all makes one: no mask and no extra unless kept. The same seed gives the same document.',
    options: [typeOption, { long: 'seed', value: 'N', help: 'a whole number, to get the same document again' }, { long: 'keep', value: 'DOC', help: 'a document whose parts and colours stay', complete: () => 'files' }, help],
    examples: ['peep random --seed 7 > me.json', 'peep random --type sitting --keep me.json'],
  },
  {
    name: 'parts', args: '[CATEGORY]', summary: 'list the ids a document can name',
    about: `Categories: ${CATEGORIES.join(', ')}. Each id comes with the pieces it can colour (partColors in a document).`,
    options: [{ long: 'query', short: 'q', value: 'WORDS', help: 'words in the id or the name', complete: () => [] }, typeOption, { long: 'json', help: 'print JSON' }, help],
    examples: ['peep parts head -q curly', 'peep parts thing', 'peep parts --type bust'],
    complete: (p) => (p.length ? [] : CATEGORIES),
  },
  {
    name: 'share', args: 'DOC', summary: 'print a link that opens the document in PeepCraft',
    options: [{ long: 'base', value: 'URL', help: `the page the link opens (default ${BASE})` }, help],
    examples: ['peep share me.json'],
    complete: () => 'files',
  },
  { name: 'open', args: 'LINK', summary: 'print the document in a PeepCraft link', options: [help], examples: ["peep open 'https://peepcraft.jinnux.com/#d=...' > me.json"] },
  { name: 'completion', args: 'SHELL', summary: 'print tab completion for zsh or bash', about: 'zsh: peep completion zsh > ~/.oh-my-zsh/cache/completions/_peep (or a folder on your fpath). bash: add eval "$(peep completion bash)" to ~/.bashrc.', options: [help], examples: ['peep completion zsh'], complete: (p) => (p.length ? [] : ['zsh', 'bash']) },
  { name: 'help', args: '[COMMAND]', summary: 'show help for peep or one command', options: [], examples: ['peep help render'], complete: (p) => (p.length ? [] : COMMANDS.map((c) => c.name)) },
]
const commandNamed = (name: string) => COMMANDS.find((c) => c.name === name)

/** Bold headings when printing to a terminal (and NO_COLOR is not set). */
let bold = (t: string) => t

export function overview(): string {
  const w = Math.max(...COMMANDS.map((c) => `${c.name} ${c.args}`.length))
  return `peep ${version}: draw Open Peeps characters and scenes from a JSON document, as PeepCraft does.

${bold('Usage')}
  peep <command> [options]

${bold('Commands')}
${COMMANDS.map((c) => `  ${`${c.name} ${c.args}`.padEnd(w)}   ${c.summary}`).join('\n')}

${bold('A document')}
  { "v": 1 } is PeepCraft's default bust; add only what should differ:
  { "v": 1, "type": "sitting", "parts": { "head": "afro" }, "ink": "#1d3557", "bg": "#a8dadc" }
  DOC is a file, - for stdin, or a PeepCraft link.

${bold('Examples')}
  peep random --seed 7 > me.json
  peep render me.json --save --png
  peep parts head -q curly

Run peep <command> --help for its options. -v, --version prints the version.
Art: Open Peeps and Transhumans by Pablo Stanley (CC0). https://peepcraft.jinnux.com/`
}

/** Text wrapped at 78 columns, for help. */
const wrap = (text: string, indent = '') => text.split(' ').reduce<string[]>((lines, word) => {
  const last = lines.at(-1)!
  if ((last + ' ' + word).trimStart().length > 78 - indent.length && last.trim()) lines.push(word); else lines[lines.length - 1] = last ? `${last} ${word}` : word
  return lines
}, ['']).map((l) => indent + l).join('\n')

export function commandHelp(c: Command): string {
  const flag = (o: Option) => `${o.short ? `-${o.short}, ` : '    '}--${o.long}${o.value ? ` ${o.value}` : ''}`
  const w = Math.max(...c.options.map((o) => flag(o).length), 0)
  return `peep ${c.name}: ${c.summary}

${bold('Usage')}
  peep ${c.name}${c.args ? ` ${c.args}` : ''}${c.options.length ? ' [options]' : ''}
${c.about ? `\n${wrap(c.about)}\n` : ''}${c.options.length ? `\n${bold('Options')}\n${c.options.map((o) => `  ${flag(o).padEnd(w)}   ${o.help}`).join('\n')}\n` : ''}
${bold('Examples')}
${c.examples.map((e) => `  ${e}`).join('\n')}`
}

/** Edit distance with swapped neighbours as one edit (zhs, zsh), for "did you mean". */
function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)))
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
  }
  return d[a.length][b.length]
}
/** The closest of `choices` to a mistyped `word`, when it is close enough to be a typo (or the word is a prefix of it). */
export function closest(word: string, choices: readonly string[]): string | undefined {
  const w = word.toLowerCase()
  const prefix = choices.filter((c) => c.toLowerCase().startsWith(w))
  if (w.length >= 2 && prefix.length === 1) return prefix[0]
  let best: string | undefined, score = Infinity
  for (const c of choices) { const d = distance(w, c.toLowerCase()); if (d < score) { score = d; best = c } }
  return best !== undefined && score <= Math.max(1, Math.floor(word.length / 3)) ? best : undefined
}
const didYouMean = (word: string, choices: readonly string[]) => { const m = closest(word, choices); return m ? ` Did you mean ${m}?` : '' }

/** A usage mistake (exit 2), as opposed to a document that does not validate (exit 1). `command` points at its help. */
class Usage extends Error {
  readonly command?: string
  constructor(message: string, command?: string) { super(message); this.command = command }
}

/** Runs one command; the exit code. */
export async function run(argv: string[], io: Io): Promise<number> {
  if (io.color) bold = (t) => `\x1b[1m${t}\x1b[22m`
  const [name, ...rest] = argv
  try {
    if (name === undefined || name === '--help' || name === '-h') { io.out(overview()); return name ? 0 : 2 }
    if (name === '--version' || name === '-v' || name === 'version') { io.out(version); return 0 }
    if (name === '__complete') { const c = complete(rest); if (c === 'files') io.out('__files__'); else if (c.length) io.out(c.join('\n')); return 0 }
    const command = commandNamed(name)
    if (!command) throw new Usage(`no command "${name}".${didYouMean(name, COMMANDS.map((c) => c.name))}`)
    if (command.name === 'help') {
      const about = rest[0] && commandNamed(rest[0])
      if (rest[0] && !about) throw new Usage(`no command "${rest[0]}".${didYouMean(rest[0], COMMANDS.map((c) => c.name))}`)
      io.out(about ? commandHelp(about) : overview()); return 0
    }
    if (rest.includes('--help') || rest.includes('-h')) { io.out(commandHelp(command)); return 0 }
    switch (command.name) {
      case 'parts': return parts(rest, io)
      case 'random': return await random(rest, io)
      case 'render': return await render(rest, io)
      case 'share': return await share(rest, io)
      case 'open': return await open(rest, io)
      case 'completion': return completion(rest, io)
    }
    return 2
  } catch (e) {
    if (e instanceof DocInvalid) { for (const x of e.errors) io.err(line(x)); return 1 }
    if (e instanceof Usage) { io.err(`peep: ${e.message}\nRun peep ${e.command ? `${e.command} ` : ''}--help for usage.`); return 2 }
    io.err(`peep: ${(e as Error).message}`); return 1
  }
}

/** One error a line, with a guess for a mistyped id: `parts.head: no head "afroo". Did you mean afro? Known: afro, bangs, ... (48)`. */
const line = ({ path, message, choices }: { path: string; message: string; choices?: string[] }) => {
  const typed = message.match(/"([^"]+)"/)?.[1]
  const guess = typed && choices ? didYouMean(typed, choices) : ''
  return `${path || '(document)'}: ${message}${guess ? `.${guess}` : ''}${choices ? `${guess ? ' Known' : '; known'}: ${choices.slice(0, 12).join(', ')}${choices.length > 12 ? `, ... (${choices.length})` : ''}` : ''}`
}

/** Parses a command's options from its table entry; an unknown option gets a guess. */
function args(command: string, rest: string[]): { values: Record<string, string | boolean | undefined>; positionals: string[] } {
  const spec = commandNamed(command)!
  const options = Object.fromEntries(spec.options.map((o) => [o.long, { type: o.value ? 'string' as const : 'boolean' as const, ...(o.short ? { short: o.short } : {}) }]))
  try { return parseArgs({ args: rest, options, allowPositionals: true, strict: true }) as { values: Record<string, string | boolean | undefined>; positionals: string[] } }
  catch (e) {
    const bad = (e as Error).message.match(/Unknown option '(-{1,2}[^']+)'/)?.[1]
    const names = spec.options.flatMap((o) => [`--${o.long}`, ...(o.short ? [`-${o.short}`] : [])])
    throw new Usage(bad ? `${command}: no option ${bad}.${didYouMean(bad, names)}` : `${command}: ${(e as Error).message.split('. ')[0].replace(/\.$/, '')}`, command)
  }
}

/** What Tab offers after `peep <words>`: the last word is the one being typed. 'files' leaves it to the shell. */
export function complete(words: string[]): readonly string[] | 'files' {
  const current = words.at(-1) ?? '', before = words.slice(0, -1)
  if (before.length === 0) return current.startsWith('-') ? ['--help', '--version'] : COMMANDS.map((c) => c.name)
  const command = commandNamed(before[0])
  if (!command) return []
  const flags = command.options.flatMap((o) => [`--${o.long}`, ...(o.short ? [`-${o.short}`] : [])])
  const optionOf = (w: string) => command.options.find((o) => w === `--${o.long}` || w === `-${o.short}`)
  const prev = optionOf(before.at(-1) ?? '')
  if (prev?.value) {
    // The ids of the category being listed, for parts CATEGORY -q.
    if (command.name === 'parts' && prev.long === 'query') { const cat = before.slice(1).find((w) => CATEGORIES.includes(w)); return cat ? search({ category: cat }).map((i) => i.id) : [] }
    return prev.complete?.() ?? []
  }
  if (current.startsWith('-')) return flags
  const positionals = before.slice(1).filter((w, i, all) => !w.startsWith('-') && !optionOf(all[i - 1] ?? '')?.value)
  return command.complete?.(positionals) ?? []
}

function completion(rest: string[], io: Io): number {
  const shell = rest[0]
  if (shell === 'zsh') {
    io.out(`#compdef peep
# Tab completion for peep (peepcraft ${version}). Asks peep itself, so part ids complete too.
_peep() {
  local -a out
  out=("\${(@f)$(peep __complete "\${(@)words[2,CURRENT]}" 2>/dev/null)}")
  if [[ "\${out[1]}" == "__files__" ]]; then _files; return; fi
  (( \${#out} )) && [[ -n "\${out[1]}" ]] && compadd -- "\${out[@]}"
}
compdef _peep peep`)
    return 0
  }
  if (shell === 'bash') {
    io.out(`# Tab completion for peep (peepcraft ${version}): eval "$(peep completion bash)" in ~/.bashrc.
_peep() {
  local IFS=$'\n' cur="\${COMP_WORDS[COMP_CWORD]}" out
  out=($(peep __complete "\${COMP_WORDS[@]:1:COMP_CWORD}" 2>/dev/null))
  if [[ "\${out[0]}" == "__files__" ]]; then COMPREPLY=($(compgen -f -- "$cur")); else COMPREPLY=($(compgen -W "\${out[*]}" -- "$cur")); fi
}
complete -o default -F _peep peep`)
    return 0
  }
  throw new Usage(shell ? `completion: no shell "${shell}"; zsh or bash.${didYouMean(shell, ['zsh', 'bash'])}` : 'completion: which shell? zsh or bash', 'completion')
}

const type = (t: unknown): PeepType | undefined => {
  if (t === undefined) return undefined
  if (!TYPES.includes(t as PeepType)) throw new Usage(`--type is standing, sitting or bust, not "${String(t)}".${didYouMean(String(t), TYPES)}`)
  return t as PeepType
}

/** A document from a file, stdin (-) or a share link, checked. */
async function read(source: string | undefined, io: Io): Promise<PeepCraftDoc> {
  if (!source) throw new Usage('which document? a file, - for stdin, or a PeepCraft link')
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
  const { values, positionals } = args('parts', rest)
  if (positionals[0] && !CATEGORIES.includes(positionals[0])) throw new Usage(`parts: no category "${positionals[0]}".${didYouMean(positionals[0], CATEGORIES)} Categories: ${CATEGORIES.join(', ')}`, 'parts')
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
  const { values } = args('random', rest)
  const seed = values.seed === undefined ? undefined : Number(values.seed)
  if (seed !== undefined && !Number.isInteger(seed)) throw new Usage('random: --seed is a whole number', 'random')
  const keep = values.keep ? await read(values.keep as string, io) : undefined
  io.out(JSON.stringify(randomDoc({ type: type(values.type), keep, seed }), null, 2))
  return 0
}

async function render(rest: string[], io: Io): Promise<number> {
  const { values, positionals } = args('render', rest)
  const out = values.output as string | undefined, scale = Number(values.scale ?? 1)
  if (![1, 2, 3, 4].includes(scale)) throw new Usage('render: --scale is 1, 2, 3 or 4', 'render')
  // A file named by -o, or a folder (-o DIR, --save) where the file takes the name PeepCraft's Save button gives it.
  const folder = out === undefined ? (values.save ? '.' : undefined) : /[\\/]$/.test(out) || (await io.isDir(out)) ? out : undefined
  if (out !== undefined && folder === undefined) {
    if (!/\.(svg|png)$/i.test(out)) throw new Usage('render: -o is a folder, or a file ending in .svg or .png', 'render')
    if (values.png && !/\.png$/i.test(out)) throw new Usage('render: --png with -o FILE.svg; name the file .png, or give a folder', 'render')
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
  const { values, positionals } = args('share', rest)
  const link = await shareUrl(await read(positionals[0], io), (values.base as string | undefined) ?? BASE)
  if (!link) { io.err('too big for a link; share the JSON file instead'); return 1 }
  io.out(link)
  return 0
}

async function open(rest: string[], io: Io): Promise<number> {
  const { positionals } = args('open', rest)
  if (!positionals[0]) throw new Usage('open: which link?', 'open')
  io.out(JSON.stringify(await decodeShare(positionals[0]), null, 2))
  return 0
}
