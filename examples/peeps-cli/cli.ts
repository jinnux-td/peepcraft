// PeepCraft in a terminal: the same document, checks and drawing as the web app (@kit/peeps-engine), with no browser for SVG and no
// network. `run` takes the arguments and an io object, so the tests drive it without spawning a process.
import { parseArgs } from 'node:util'
import type { PeepType, Slot } from '@kit/peeps'
import { NAMES, suggestColours, toColour, type ColourUse } from './colours.ts'
import { categoryOf, decodeShare, DocInvalid, frameSize, LIMITS, nameOf, randomDoc, renderSvg, search, shareUrl, SIZE, validate, type PeepCraftDoc } from '@kit/peeps-engine'

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
/** A Tab candidate, with what the shell shows beside it. */
export type Candidate = string | { value: string; about?: string }
type Completer = (ctx: { words: string[]; current: string }) => readonly Candidate[] | 'files'
interface Option { long: string; short?: string; value?: string; help: string; multiple?: boolean; complete?: Completer }
interface Command { name: string; args: string; summary: string; about?: string; options: Option[]; examples: string[]; complete?: (positionals: string[]) => readonly Candidate[] | 'files' }

/** The flag of each slot on `peep random`. */
const SLOT_FLAGS: Record<Slot, string> = { body: 'body', head: 'head', face: 'face', facialHair: 'facial-hair', mask: 'mask', accessories: 'accessories' }
const SLOTS = Object.keys(SLOT_FLAGS) as Slot[]
const PART_HELP: Record<Slot, string> = { body: 'a pose for standing and sitting, a torso for a bust', head: 'the hair (or a hat)', face: 'the face', facialHair: 'a beard or moustache, or none', mask: 'a face mask, or none', accessories: 'glasses, or none' }

/** The value after `--flag` among the words typed so far. */
const valueOf = (words: string[], flag: string) => { const i = words.lastIndexOf(flag); return i >= 0 ? words[i + 1] : undefined }
const typeIn = (words: string[]): PeepType => (TYPES.includes(valueOf(words, '--type') as PeepType) ? valueOf(words, '--type') as PeepType : 'bust')
const idsFor = (type: PeepType, slot: Slot): Candidate[] => search({ category: categoryOf(type, slot) }).map((i) => ({ value: i.id, about: `${i.label}${Object.keys(i.pieces).length ? ` (${Object.keys(i.pieces).join(', ')})` : ''}` }))
const colours = (use: ColourUse, prefix = ''): Candidate[] => suggestColours(use).map((c) => ({ value: prefix + c.value, about: c.hex }))
/** The pieces --color can set: those of the item given for a slot, or of any item the slot may roll. */
function pieceCandidates(words: string[]): Candidate[] {
  const t = typeIn(words)
  return SLOTS.flatMap((slot) => {
    const chosen = valueOf(words, `--${SLOT_FLAGS[slot]}`)
    const items = search({ category: categoryOf(t, slot) }).filter((i) => !chosen || i.id === chosen)
    const counts = new Map<string, number>()
    for (const i of items) for (const p of Object.keys(i.pieces)) counts.set(p, (counts.get(p) ?? 0) + 1)
    return [
      { value: `${slot}.ink=`, about: `lines of the ${slot}` }, { value: `${slot}.paper=`, about: `what comes in white on the ${slot}` },
      ...[...counts].map(([p, n]) => ({ value: `${slot}.${p}=`, about: chosen ? `${p} of ${chosen}` : `${p}: ${n} of ${items.length} items have it (rolls among them)` })),
    ]
  })
}
const useOf = (piece: string): ColourUse => (piece === 'ink' ? 'ink' : piece === 'paper' ? 'paper' : piece === 'hair' ? 'hair' : 'clothes')

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
    name: 'random', args: '', summary: 'print a random document, with what you choose fixed',
    about: 'Rolls the parts you leave open: body, head, face, facial hair and glasses. Everything else is what PeepCraft starts with: a bust, no mask, no extra, its colours. A flag fixes what it names. A --color for a part you leave open rolls among the items that have that piece. A flag that contradicts another, or --keep, is an error. Colours are names (Tab lists them) or hex such as 1d3557.',
    options: [
      typeOption,
      ...SLOTS.map((slot): Option => ({ long: SLOT_FLAGS[slot], value: 'ID', help: PART_HELP[slot], complete: ({ words }) => idsFor(typeIn(words), slot) })),
      { long: 'extra', value: 'ID', help: 'something worn beside the peep: bubble, round-bubble, thought-bubble, aura', complete: () => search({ category: 'thing' }).filter((i) => i.extra).map((i) => ({ value: i.id, about: i.label })) },
      { long: 'ink', value: 'COLOUR', help: 'the lines', complete: () => colours('ink') },
      { long: 'paper', value: 'COLOUR', help: 'what comes in white (shoes, eyes, lenses)', complete: () => colours('paper') },
      { long: 'skin', value: 'COLOUR', help: 'one skin colour', complete: () => colours('skin') },
      { long: 'bg', value: 'COLOUR', help: 'the background, or transparent', complete: () => colours('bg') },
      { long: 'color', value: 'SLOT.PIECE=COLOUR', multiple: true, help: 'one piece of a part, such as body.top=crimson (repeat it)', complete: ({ words, current }) => {
        const m = current.match(/^([A-Za-z-]+)\.([A-Za-z-]+)=/)
        return m ? colours(useOf(m[2]), m[0]) : pieceCandidates(words)
      } },
      { long: 'mono', help: 'black lines on white only' },
      { long: 'seed', value: 'N', help: 'a whole number, to get the same document again' },
      { long: 'keep', value: 'DOC', help: 'a document whose parts and colours stay', complete: () => 'files' },
      help,
    ],
    examples: ['peep random --seed 7 > me.json', 'peep random --type sitting --head afro --ink navy', 'peep random --head bun --color head.bandana=crimson --bg transparent', 'peep random --keep me.json --face calm | peep render - --save'],
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
    if (name === '__complete') { const c = complete(rest); if (c === 'files') io.out('__files__'); else if (c.length) io.out(candidateLines(c).join('\n')); return 0 }
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
function args(command: string, rest: string[]): { values: Record<string, string | boolean | string[] | undefined>; positionals: string[] } {
  const spec = commandNamed(command)!
  const options = Object.fromEntries(spec.options.map((o) => [o.long, { type: o.value ? 'string' as const : 'boolean' as const, ...(o.short ? { short: o.short } : {}), ...(o.multiple ? { multiple: true } : {}) }]))
  try { return parseArgs({ args: rest, options, allowPositionals: true, strict: true }) as { values: Record<string, string | boolean | string[] | undefined>; positionals: string[] } }
  catch (e) {
    const bad = (e as Error).message.match(/Unknown option '(-{1,2}[^']+)'/)?.[1]
    const names = spec.options.flatMap((o) => [`--${o.long}`, ...(o.short ? [`-${o.short}`] : [])])
    throw new Usage(bad ? `${command}: no option ${bad}.${didYouMean(bad, names)}` : `${command}: ${(e as Error).message.split('. ')[0].replace(/\.$/, '')}`, command)
  }
}

/** What Tab offers after `peep <words>`: the last word is the one being typed. 'files' leaves it to the shell. */
export function complete(words: string[]): readonly Candidate[] | 'files' {
  const current = words.at(-1) ?? '', before = words.slice(0, -1)
  if (before.length === 0) return current.startsWith('-') ? ['--help', '--version'] : COMMANDS.map((c) => ({ value: c.name, about: c.summary }))
  const command = commandNamed(before[0])
  if (!command) return []
  const optionOf = (w: string) => command.options.find((o) => w === `--${o.long}` || w === `-${o.short}`)
  const prev = optionOf(before.at(-1) ?? '')
  if (prev?.value) {
    // The ids of the category being listed, for parts CATEGORY -q.
    if (command.name === 'parts' && prev.long === 'query') { const cat = before.slice(1).find((w) => CATEGORIES.includes(w)); return cat ? search({ category: cat }).map((i) => ({ value: i.id, about: i.label })) : [] }
    return prev.complete?.({ words: before, current }) ?? []
  }
  if (current.startsWith('-')) return command.options.filter((o) => o.multiple || !before.includes(`--${o.long}`)).map((o) => ({ value: `--${o.long}`, about: o.help }))
  const positionals = before.slice(1).filter((w, i, all) => !w.startsWith('-') && !optionOf(all[i - 1] ?? '')?.value)
  return command.complete?.(positionals) ?? []
}

/** Candidates as the completion scripts read them: one a line, `value<TAB>about`. */
export const candidateLines = (c: readonly Candidate[]) => c.map((x) => (typeof x === 'string' ? x : x.about ? `${x.value}\t${x.about}` : x.value))

function completion(rest: string[], io: Io): number {
  const shell = rest[0]
  if (shell === 'zsh') {
    io.out(`#compdef peep
# Tab completion for peep (peepcraft ${version}). Asks peep itself, so part ids, pieces and colours complete, each with a note.
_peep() {
  local -a lines vals descs open odescs
  local l v
  lines=("\${(@f)$(peep __complete "\${(@)words[2,CURRENT]}" 2>/dev/null)}")
  if [[ "\${lines[1]}" == "__files__" ]]; then _files; return; fi
  for l in "\${lines[@]}"; do
    [[ -z "$l" ]] && continue
    v="\${l%%$'\\t'*}"
    # An entry ending in = (body.top=) waits for its value: no space after it.
    if [[ "$v" == *= ]]; then open+=("$v"); odescs+=("\${l/$'\\t'/  -- }"); else vals+=("$v"); descs+=("\${l/$'\\t'/  -- }"); fi
  done
  (( \${#vals} )) && compadd -l -d descs -- "\${vals[@]}"
  (( \${#open} )) && compadd -S '' -l -d odescs -- "\${open[@]}"
}
compdef _peep peep`)
    return 0
  }
  if (shell === 'bash') {
    io.out(`# Tab completion for peep (peepcraft ${version}): eval "$(peep completion bash)" in ~/.bashrc.
_peep() {
  local IFS=$'\\n' line="\${COMP_LINE:0:COMP_POINT}" cur l p
  local -a words out vals
  IFS=' ' read -ra words <<< "$line"
  [[ "$line" == *" " ]] && words+=("")
  cur="\${words[\${#words[@]}-1]}"
  out=($(peep __complete "\${words[@]:1}" 2>/dev/null))
  if [[ "\${out[0]}" == "__files__" ]]; then COMPREPLY=($(compgen -f -- "$cur")); return; fi
  for l in "\${out[@]}"; do vals+=("\${l%%$'\\t'*}"); done
  COMPREPLY=($(compgen -W "\${vals[*]}" -- "$cur"))
  # bash splits words at =; give back only what follows it.
  if [[ "$cur" == *=* ]]; then p="\${cur%=*}="; COMPREPLY=("\${COMPREPLY[@]#"$p"}"); fi
  if [[ \${#COMPREPLY[@]} -eq 1 && "\${COMPREPLY[0]}" == *= ]] && type compopt &>/dev/null; then compopt -o nospace; fi
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

/** A document from a file, stdin (-) or a share link, as JSON, not yet checked (random checks it with the flags over it). */
async function readJson(source: string, io: Io): Promise<PeepCraftDoc> {
  if (/^https?:\/\/|^#/.test(source)) return decodeShare(source)
  let text: string
  try { text = source === '-' ? await io.stdin() : await io.readFile(source) }
  catch (e) { throw new Error((e as NodeJS.ErrnoException).code === 'ENOENT' ? `no file ${source}` : (e as Error).message) }
  try { return JSON.parse(text) as PeepCraftDoc } catch (e) { throw new Error(`${source === '-' ? 'stdin' : source} is not JSON: ${(e as Error).message}`) }
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

/** A colour flag's value as '#rrggbb': a name or hex; anything else is a usage mistake with a guess. */
function colourFlag(flag: string, value: string, transparent = false): string {
  const hex = toColour(value, transparent)
  if (hex) return hex
  throw new Usage(`random: ${flag} "${value}" is not a colour.${didYouMean(value, Object.keys(NAMES))} Use a name (Tab lists them) or hex such as 1d3557.`, 'random')
}

/** The document a set of flags asks for, and which document paths each flag set (to name the flag in an error). */
function fromFlags(values: Record<string, string | boolean | string[] | undefined>): { doc: PeepCraftDoc; flags: Map<string, string> } {
  const doc: PeepCraftDoc = { v: 1 }, flags = new Map<string, string>()
  const parts: Partial<Record<Slot, string>> = {}
  for (const slot of SLOTS) { const id = values[SLOT_FLAGS[slot]]; if (typeof id === 'string') { parts[slot] = id; flags.set(`parts.${slot}`, `--${SLOT_FLAGS[slot]}`) } }
  if (Object.keys(parts).length) doc.parts = parts
  if (typeof values.extra === 'string') { doc.extra = { id: values.extra }; flags.set('extra', '--extra') }
  for (const c of ['ink', 'paper', 'skin', 'bg'] as const) {
    const v = values[c]
    if (typeof v === 'string') { doc[c] = colourFlag(`--${c}`, v, c === 'bg'); flags.set(c, `--${c}`) }
  }
  if (values.mono) { doc.mono = true; flags.set('mono', '--mono') }
  const partColors: Record<string, Record<string, string>> = {}
  for (const entry of (values.color as string[] | undefined) ?? []) {
    const m = entry.match(/^([A-Za-z-]+)\.([A-Za-z-]+)=(.+)$/)
    if (!m) throw new Usage(`random: --color is SLOT.PIECE=COLOUR, such as body.top=crimson, not "${entry}"`, 'random')
    const slot = (Object.entries(SLOT_FLAGS).find(([k, f]) => m[1] === k || m[1] === f)?.[0]) as Slot | undefined
    if (!slot) throw new Usage(`random: --color ${entry}: no slot "${m[1]}".${didYouMean(m[1], SLOTS)} Slots: ${SLOTS.join(', ')}`, 'random')
    const hex = colourFlag(`--color ${slot}.${m[2]}`, m[3])
    const had = partColors[slot]?.[m[2]]
    if (had && had !== hex) throw new Usage(`random: --color ${slot}.${m[2]} is given twice, as ${had} and ${hex}`, 'random')
    ;(partColors[slot] ??= {})[m[2]] = hex
    flags.set(`partColors.${slot}.${m[2]}`, `--color ${slot}.${m[2]}`)
  }
  if (Object.keys(partColors).length) doc.partColors = partColors
  return { doc, flags }
}

/** The kept document with the flags over it; a flag that says otherwise than --keep is a conflict, all of them listed. */
function mergeKeep(keep: PeepCraftDoc, flagged: PeepCraftDoc, flags: Map<string, string>, file: string): PeepCraftDoc {
  const at = (doc: PeepCraftDoc, path: string): unknown => path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), doc)
  const conflicts = [...flags].flatMap(([path, flag]) => {
    const was = at(keep, path), now = at(flagged, path)
    const same = JSON.stringify(path === 'extra' ? (was as { id?: string } | undefined)?.id : was) === JSON.stringify(path === 'extra' ? (now as { id: string }).id : now)
    return was !== undefined && !same ? [`${flag} ${JSON.stringify(path === 'extra' ? (now as { id: string }).id : now)} but ${file} has ${path} ${JSON.stringify(path === 'extra' ? (was as { id?: string }).id : was)}`] : []
  })
  if (conflicts.length) throw new Usage(`random: these contradict --keep:\n  ${conflicts.join('\n  ')}`, 'random')
  const partColors: Record<string, Record<string, string | undefined>> = { ...keep.partColors }
  for (const [slot, c] of Object.entries(flagged.partColors ?? {})) partColors[slot] = { ...partColors[slot], ...c }
  return { ...keep, ...flagged, parts: { ...keep.parts, ...flagged.parts }, ...(Object.keys(partColors).length ? { partColors: partColors as PeepCraftDoc['partColors'] } : {}) }
}

async function random(rest: string[], io: Io): Promise<number> {
  const { values, positionals } = args('random', rest)
  if (positionals.length) throw new Usage(`random: takes no ${positionals.length > 1 ? 'words' : 'word'} "${positionals.join(' ')}"; parts are flags, such as --head ${positionals[0]}`, 'random')
  const seed = values.seed === undefined ? undefined : Number(values.seed)
  if (seed !== undefined && !Number.isInteger(seed)) throw new Usage('random: --seed is a whole number', 'random')
  const t = type(values.type)
  const { doc: flagged, flags } = fromFlags(values)
  let keep = flagged
  if (typeof values.keep === 'string') {
    const kept = await readJson(values.keep, io)
    if (t && kept.type && kept.type !== t) throw new Usage(`random: these contradict --keep:\n  --type "${t}" but ${values.keep} has type "${kept.type}"`, 'random')
    keep = mergeKeep(kept, flagged, flags, values.keep)
  }
  if (t) flags.set('type', '--type')
  try { io.out(JSON.stringify(randomDoc({ type: t, keep, seed }), null, 2)) }
  catch (e) {
    // Name the flag that set a wrong value, not the document path it became.
    if (e instanceof DocInvalid) throw new DocInvalid(e.errors.map((x) => { const f = [...flags].find(([path]) => x.path === path || x.path.startsWith(`${path}.`)); return f ? { ...x, path: f[1] } : x }))
    throw e
  }
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
