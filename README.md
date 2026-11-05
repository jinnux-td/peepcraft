# kit

Small building blocks extracted from [kmap](../kmap). Every package works **on its own**: it imports nothing from its
siblings, has its own `package.json`, `tsconfig.json`, tests and README, and runs TypeScript directly (Node >= 22.23.4).
To reuse one, copy its folder into another project.

| Package | What it is | Dependencies |
|---|---|---|
| [`@kit/ui`](packages/ui) | **foundation**: the shared controls as CSS on native elements (button, field, checkbox, switch, slider, segmented, tabs, card, chip, dialog, menu, tooltip, toast, states) plus small DOM helpers for keyboard and focus; a gallery in every theme with browser tests for contrast, focus, target size and keyboard (`examples/ui`) | none (reads `@kit/tokens`) |
| [`@kit/tokens`](packages/tokens) | **foundation**: the design tokens, one set of `--k-*` CSS variables for light, dark and brand themes (`data-theme`, `data-brand`), with generated Tailwind v4 and shadcn/ui bridges and `tokens.json`; WCAG contrast checked for every theme | none |
| [`@kit/notes-graph`](packages/notes-graph) | markdown folder to a graph (links, prerequisites, lineage, incremental cache) | none (Node built-ins) |
| [`@kit/layout`](packages/layout) | deterministic, local layouts: disc, timeline lanes, 3D | none |
| [`@kit/data-layer`](packages/data-layer) | map-agnostic data layers: catalogue, providers (static, polled, pushed), time window, counts, legend, plus a layers panel and time bar (`/panel`, plain DOM) | none in the core; `ui` for `/panel` |
| [`@kit/panel`](packages/panel) | a dashboard panel that **holds a view**: title bar, options form drawn from what the view declares, loading / error / empty states, full screen, and a view that cannot break its neighbours | `ui` |
| [`@kit/heatmap`](packages/heatmap) | activity heat map (a square per day) fed with **per-day counts**, not records: a `‹ year ›` selector that asks the host for one window, replay, scrubber, tooltip | `ui` |
| [`@kit/shell`](packages/shell) | the frame of a dashboard page: header with tab bar, actions and theme mode, a bar for filters, sidebar (a drawer on a phone), main; theme tokens reach every kit module | `ui` |
| [`@kit/folio`](packages/folio) | a portfolio page: header, a hero made of named parts, sections, footer; the same parts take six arrangements (type, character, world, object, work, quiet) at one switch, and a picker to switch them | `ui` (the picker) |
| [`@kit/carousel`](packages/carousel) | seven carousel components with any content inside: Poster, Curve, Fan, Spine, Select, Arc, Cylinder; each has its own render, behaviour, typed slots and CSS on a small core, and the host fills the slots. Design: `docs/carousel.md`; see them in the Storybook: `npm run storybook` | `ui` |
| [`@kit/peeps`](packages/peeps) | Open Peeps illustrations as React components (177 atoms): a `Peep` that composes them, with defaults per type (standing, sitting, bust), and a `Scene` that puts peeps and figures on one background | `react` (peer) |
| [`@kit/transhumans`](packages/transhumans) | Transhumans illustrations (Pablo Stanley, CC0): 38 whole black and white figures as React components that recolour (ink and paper) | `react` (peer) |
| [`@kit/things`](packages/things) | things for a peeps scene, drawn in code in the same ink and paper style: 22 in five groups (furniture, plants and home, small props, pets, extras a peep wears) | `react` (peer) |
| [`@kit/peeps-engine`](packages/peeps-engine) | **assembly, headless**: what a PeepCraft picture is (`CreatorState`, a versioned JSON document) and how it becomes an SVG with no DOM: validation with choices, rendering to a string, dice, scenes, catalogue search; used by the creator, the CLI and the MCP server | `peeps` + `transhumans` + `things` |
| [`@kit/peeps-creator`](packages/peeps-creator) | **assembly**: a character creator for peeps and transhumans figures as one React component (`<PeepCreator />`): a tab per part with a dice each, a Figures tab, a Scene tab (peeps, figures, things and your own uploads on one ground), colours, transparent background, scale / rotate / flip, undo, four themes, SVG and PNG export, a share link, From photo when the host passes it | `peeps` + `peeps-engine` + `transhumans` + `things` + `ui` |
| [`@kit/map-view`](packages/map-view) | **assembly**: a world map with data layers from tables (`lat`/`lon` columns), layers panel and controls included, ready to drop in a div or a panel: `createMapView(el).update(frames)` | `data-layer` + `worldmap` + `ui` |
| [`@kit/worldmap`](packages/worldmap) | world map, flat or globe (MapLibre), draws resolved layers; Natural Earth basemap bundled, works offline | `maplibre-gl` (BSD-3) + `ui` |

## Rules
1. **Standalone.** Leaf packages (`notes-graph`, `layout`, `data-layer`, `worldmap`, `panel`, `heatmap`, `shell`, `folio`, `carousel`, `peeps`, `transhumans`, `things`) import nothing from each other or from outside their folder, except the **foundation** packages (`@kit/tokens`, `@kit/ui`), which a leaf may name in its `package.json` (decision D1, `~/services/docs/ui/migration.md`). A runtime dependency on another kit package is written `"file:../ui"`, so a host that links kit packages by path (the portfolio) never asks the npm registry for `@kit/*`. An **assembly** (`map-view`, `peeps-engine`, `peeps-creator`) may import the leaves it names in its `package.json`; nothing imports an assembly except a host, with one exception: a UI assembly may import the headless assembly it draws (`peeps-creator` imports `peeps-engine`, so the web app, the CLI and the MCP server draw the same picture). `scripts/standalone.sh` copies each package out of the repo and runs its typecheck and tests there.
2. **Extract, don't invent.** A package comes from code that already works in an app and has, or is about to have, a
   second user. Keep its tests with it.
3. **Small public API:** everything exported goes through `src/index.ts`.
4. **No network, no telemetry.** Dependencies stay minimal and MIT/Apache/BSD; record any new one in the package README. Root dev dependencies (for the examples and their tests only): `esbuild` (MIT), `playwright-core` (Apache-2.0), `@anthropic-ai/sdk` (Apache-2.0; only PeepCraft's own-key chunk, loaded when a visitor uses their key), `typescript` (Apache-2.0), `world-atlas` and `topojson-client` (ISC), `storybook`, `@storybook/html-vite`, `@storybook/addon-a11y` and `vite` (MIT; telemetry off in `examples/storybook/config/main.ts`).
5. Never publish or push without being asked.

## Commands
```
npm install
npm test                    # every package's tests + examples
npm run typecheck          # packages + examples (examples/contract.ts checks the seam between data-layer and worldmap)
npm run e2e                # the examples, the token CSS and every Storybook story in a real browser
npm run storybook          # every finished component, http://localhost:6006 (examples/storybook): carousels, @kit/ui, folio, heat map, panel, shell, map, peeps, creator
scripts/standalone.sh       # copy each package out of the repo and test it alone
npm run peep -- help       # PeepCraft from the terminal (examples/peeps-cli)
claude plugin marketplace add ./claude-marketplace   # the jinnux Claude Code marketplace: plugin peepcraft (MCP + skill)
npm run deploy:peeps       # PeepCraft to Cloudflare Pages: main is production, any other branch a preview at <branch>.peepcraft.pages.dev
npm run measure:peeps       # measure the window on each PeepCraft look into peeps-engine/src/boxes.ts (Chromium)
```

## Example
`npm run example:panel` builds and serves `examples/panel` on http://127.0.0.1:4181: four panels holding different views (two maps with their own options, a table, and a view that throws). `npm run example` builds and serves `examples/world` on http://127.0.0.1:4180: six layers, each pulled from a pretend server, on the world map with the layers panel, time window and 2D/3D. `npm run example:peeps` builds `examples/peeps` (the creator full screen, on http://127.0.0.1:4183). `npm run example:dashboard` builds and serves `examples/dashboard` on http://127.0.0.1:4182: the shell, two heat maps that ask for one window at a time, and the map on a second tab. `npm run example:ui` serves the `@kit/ui` gallery on http://127.0.0.1:4184. `npm run e2e` runs the browser tests of every example, the token CSS and every Storybook story (needs Chromium). Design: `docs/map-and-data-layer.md`, `docs/worldmap.md`, `docs/architecture.md`, `docs/carousel.md`, `docs/peepcraft-platform.md`. Diagrams: `docs/diagrams/overview.html` (the flows) and `components.html` (inside the packages), drafts in `docs/diagrams/src/`.

## Peeps
Five packages make the peeps family: three leaves that draw, a headless assembly that turns a document into a picture, and one that edits.

| Package | Kind | Role |
|---|---|---|
| `@kit/peeps` | leaf | the parts (atoms) of Open Peeps, a `Peep` that puts one together per type (standing, sitting, bust), `Background`, and a `Scene` that lays many items on one ground |
| `@kit/transhumans` | leaf | 38 whole figures; the source paths are flat, so they cannot be split into parts or mixed with peeps parts |
| `@kit/things` | leaf | 22 drawings made in code, in the peeps' units, with named parts to colour (`leaves`, `pot`, ...) |
| `@kit/peeps-engine` | assembly, headless | the document (`PeepCraftDoc`), `validate`, `renderSvg`, the creator's state and its plain functions; no UI, no DOM |
| `@kit/peeps-creator` | assembly | `<PeepCreator />`: a tab per part with dice and locks, Figures, Scene (peeps, figures, things, uploads), colours, Contrast, undo, themes, SVG / PNG export |

- **One contract:** every atom, figure and thing is a React component with `width`, `height`, `ink` and `paper` (and `colors` for named pieces), so `Scene` takes any of them without importing the others. `examples/contract.ts` stops compiling if the shapes drift.
- **Units:** the atoms' hi-res units. A standing peep is about 3300 tall, a figure 1080, so scale a figure up to stand beside a peep (the creator draws figures at 2.6 and peeps at 0.9).
- **Generated code:** `packages/peeps/src/atoms` (from the Symbols page of the Open Peeps Figma file, `scripts/build-figma.ts`) and `packages/transhumans/src/figures` (`scripts/build-figures.ts`) are written by scripts. Never edit them by hand, and grep with `--exclude-dir`. The source packs are in `packages/peeps/docs/art` (Git LFS). Each script takes its input as an argument: `build-figures.ts` reads the pack's SVG folder, and `build-figma.ts` reads an SVG export of the Figma file's Symbols page.
- **Colours:** how pieces get their default colours and how to set one: `docs/peeps-colours.md`.
- **Try it:** `npm run example:peeps`, then open http://127.0.0.1:4183. Browser tests: `examples/peeps/e2e.test.ts`.
- **Known gaps:** the faces "Smiling" and "Happy Grin" appear in templates but have no atom. A `Peep`'s viewBox is its canvas, not its drawn bounds, so the window on each look comes from a table measured once in Chromium (`packages/peeps-engine/src/boxes.ts`, `npm run measure:peeps`). Each atom's paths load on demand (its own chunk), so a page fetches only the parts it draws; await `peep.load()` or `pending()` before rendering to a string.

## Candidates not extracted yet
Graph view (2D/3D engines, needs React), frames and query cache, secret box + SQLite store. Extract when a second app needs one.

## Licence
MIT, see `LICENSE`. Bundled work keeps its own terms: Open Peeps and Transhumans by Pablo Stanley are CC0 (`packages/peeps/docs/art/README.md`), Inter is SIL OFL 1.1 (`examples/peeps/og/OFL-Inter.txt`).
