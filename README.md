# kit

Small building blocks extracted from [kmap](../kmap). Every package works **on its own**: it imports nothing from its
siblings, has its own `package.json`, `tsconfig.json`, tests and README, and runs TypeScript directly (Node >= 22.23.4).
To reuse one, copy its folder into another project.

| Package | What it is | Dependencies |
|---|---|---|
| [`@kit/notes-graph`](packages/notes-graph) | markdown folder to a graph (links, prerequisites, lineage, incremental cache) | none (Node built-ins) |
| [`@kit/layout`](packages/layout) | deterministic, local layouts: disc, timeline lanes, 3D | none |
| [`@kit/data-layer`](packages/data-layer) | map-agnostic data layers: catalogue, providers (static, polled, pushed), time window, counts, legend, plus a layers panel and time bar (`/panel`, plain DOM) | none |
| [`@kit/panel`](packages/panel) | a dashboard panel that **holds a view**: title bar, options form drawn from what the view declares, loading / error / empty states, full screen, and a view that cannot break its neighbours | none |
| [`@kit/heatmap`](packages/heatmap) | activity heat map (a square per day) fed with **per-day counts**, not records: a `‹ year ›` selector that asks the host for one window, replay, scrubber, tooltip | none |
| [`@kit/shell`](packages/shell) | the frame of a dashboard page: header with tab bar, actions and theme mode, a bar for filters, sidebar (a drawer on a phone), main; theme tokens reach every kit module | none |
| [`@kit/peeps`](packages/peeps) | Open Peeps illustrations as React components (166 atoms) and a `Peep` that composes them, with defaults per type (standing, sitting, bust) | `react` (peer) |
| [`@kit/transhumans`](packages/transhumans) | Transhumans illustrations (Pablo Stanley, CC0): 38 whole black and white figures as React components that recolour (ink and paper) | `react` (peer) |
| [`@kit/peeps-creator`](packages/peeps-creator) | **assembly**: a character creator for peeps and transhumans figures as one React component (`<PeepCreator />`): a tab per part with a dice each, a Figures tab, colours, transparent background, scale / rotate / flip, undo, four themes, SVG and PNG export | `peeps` |
| [`@kit/worldmap`](packages/worldmap) | world map, flat or globe (MapLibre), draws resolved layers; Natural Earth basemap bundled, works offline | `maplibre-gl` (BSD-3) |

## Rules
1. **Standalone.** Leaf packages (`notes-graph`, `layout`, `data-layer`, `worldmap`, `panel`, `heatmap`, `shell`, `peeps`, `transhumans`) import nothing from each other or from outside their folder. An **assembly** (`map-view`, `peeps-creator`) may import the leaves it names in its `package.json`; nothing imports an assembly except a host. `scripts/standalone.sh` copies each package out of the repo and runs its typecheck and tests there.
2. **Extract, don't invent.** A package comes from code that already works in an app and has, or is about to have, a
   second user. Keep its tests with it.
3. **Small public API:** everything exported goes through `src/index.ts`.
4. **No network, no telemetry.** Dependencies stay minimal and MIT/Apache/BSD; record any new one in the package README. Root dev dependencies (for the example and its test only): `esbuild` (MIT), `playwright-core` (Apache-2.0), `typescript` (Apache-2.0), `world-atlas` and `topojson-client` (ISC).
5. Never publish or push without being asked.

## Commands
```
npm install
npm test                    # every package's tests + examples
npm run typecheck          # packages + examples (examples/contract.ts checks the seam between data-layer and worldmap)
npm run e2e                # the world example in a real browser
scripts/standalone.sh       # copy each package out of the repo and test it alone
```

| [`@kit/map-view`](packages/map-view) | **assembly**: a world map with data layers from tables (`lat`/`lon` columns), layers panel and controls included, ready to drop in a div or a panel: `createMapView(el).update(frames)` | `data-layer` + `worldmap` |

## Example
`npm run example:panel` builds and serves `examples/panel` on http://127.0.0.1:4181: four panels holding different views (two maps with their own options, a table, and a view that throws). `npm run example` builds and serves `examples/world` on http://127.0.0.1:4180: six layers, each pulled from a pretend server, on the world map with the layers panel, time window and 2D/3D. `npm run example:peeps` builds `examples/peeps` (the creator as a page and inside a 560 px panel, on http://127.0.0.1:4183). `npm run example:dashboard` builds and serves `examples/dashboard` on http://127.0.0.1:4182: the shell, two heat maps that ask for one window at a time, and the map on a second tab. `npm run e2e` runs the browser tests of all four examples (needs Chromium). Design: `docs/map-and-data-layer.md`, `docs/worldmap.md`. Peeps: `docs/peeps-handoff.md`.

## Candidates not extracted yet
Graph view (2D/3D engines, needs React), frames and query cache, secret box + SQLite store. Extract when a second app needs one.
