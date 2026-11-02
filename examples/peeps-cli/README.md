# peepcraft: the `peep` command

Draw [Open Peeps](https://www.openpeeps.com/) characters and scenes from the terminal. One small JSON document describes a picture; `peep` checks it, draws it as SVG or PNG, and gives a link that opens it in [PeepCraft](https://peepcraft.jinnux.com/) to keep editing. It draws exactly what PeepCraft draws, and names files the way its Save button does.

```bash
cd ~/services/kit && npm run install:peep   # this computer only; Node 22 or later

peep random --seed 7 > me.json             # a random peep (the same seed, the same peep)
peep render me.json --save                 # ./standing-shaved-1-hectic-goatee-2-glasses-4-doctor-nurse-1.svg
peep render me.json --save --png --scale 2 # the same name as a 2048 px PNG
peep share me.json                         # a link that opens it in PeepCraft
```

## A document
```json
{ "v": 1, "type": "sitting", "parts": { "head": "afro", "face": "calm", "facialHair": "full" }, "ink": "#1d3557", "skin": "#8d5524", "bg": "#a8dadc" }
```
`{ "v": 1 }` alone is PeepCraft's default bust; add only what should differ.

- `type`: `standing`, `sitting` or `bust`.
- `parts`: `head`, `face`, `facialHair`, `mask`, `accessories` and `body` (a pose for standing and sitting, a torso for a bust).
- Colours: `ink` (lines), `paper` (what comes in white), `skin`, `bg` (or `"transparent"`), and `partColors` for single pieces: `{ "body": { "top": "#e63946" } }`.
- More: `extra` (a speech bubble or an aura), `figure` (a whole Transhumans illustration), `mono`, `scale`, `rotate`, `flip`.
- A **scene**: `"scene": [{ "type": "standing", "parts": { "head": "afro" } }, { "figure": "runner" }, { "thing": "potted-plant" }]`, with `"frame": { "ratio": "16:9" }`.

## Install (this computer only)
`npm run install:peep` (kit root) bundles the command, installs it globally from a local tarball, and sets up zsh tab completion: into oh-my-zsh's `cache/completions` when there is one, else `~/.zfunc` (add it to `fpath`). The package is `private`, so `npm publish` refuses it. Run it again after a change to update; `npm uninstall -g peepcraft` removes it. Under nvm the command belongs to the Node version that was active when it was installed.

Bash: `eval "$(peep completion bash)"` in `~/.bashrc`.

## Like any command
- `peep --help`, `peep <command> --help` (or `peep help <command>`): usage, options, examples. `peep -v` prints the version.
- A typo gets a guess: `peep rendr` → `Did you mean render?`; `--sav` → `--save`; a part id `afroo` → `afro`, before the list of known ids.
- Tab completes commands, options, option values (`--type`, `--scale`), categories, part ids after `parts CATEGORY -q`, and files for documents and `-o`.
- Exit codes: 0 done, 1 a document or file problem, 2 a usage mistake.

## Commands
| Command | Does |
|---|---|
| `peep parts [category] [-q words] [--type T]` | the ids a document can name, with the pieces each can colour (`peep parts head -q curly`, `peep parts thing`) |
| `peep random [--type T] [--seed N] [--keep DOC]` | a random document; `--keep` holds the parts and colours it names |
| `peep render DOC` | the SVG on stdout |
| `peep render DOC --save [--png] [--scale 1-4]` | saved in this folder under PeepCraft's name; `-o FOLDER/` for another folder, `-o name.svg` for a name of your own |
| `peep share DOC` / `peep open LINK` | a document to a PeepCraft link, and back |

`DOC` is a file, `-` for stdin, or a PeepCraft link. A mistake in a document is reported one line per problem with the valid choices, and exits with 1:
```
parts.head: no head "afroo"; known: afro, bangs-2, bangs, bantu-knots, bear, bun-2, bun, buns, ... (48)
```

PNG is drawn by the Chrome or Edge on your computer (through `playwright-core`), so nothing big is downloaded; without either, run `npx playwright install chromium`. SVG needs no browser. `peep` works offline and writes only the file you ask for.

Art: [Open Peeps](https://www.openpeeps.com/) and Transhumans by Pablo Stanley, both CC0.

## In the kit repo
`npm run peep -- <command>` runs it from source. `cli.ts` is the command: one table (`COMMANDS`) drives the help, the guesses and the completion, and `run(argv, io)` is tested in memory by `cli.test.ts`. `main.ts` wires it to the process, `png.ts` drives the browser, `build.mjs` bundles everything but `playwright-core` into `dist/peep.js`, `install.sh` installs it.
