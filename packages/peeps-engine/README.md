# @kit/peeps-engine

**Assembly, headless.** What a PeepCraft picture is and how it becomes an SVG, with no UI and no DOM. Taken out of [`@kit/peeps-creator`](../peeps-creator), which now imports it, so the web app, the CLI (`examples/peeps-cli`) and the MCP server (`examples/peeps-mcp`) all draw the same picture from the same document. Design: [`docs/peepcraft-platform.md`](../../docs/peepcraft-platform.md).

```ts
import { renderSvg, validate, randomDoc, search } from '@kit/peeps-engine'

const { svg, state } = await renderSvg({ v: 1, type: 'sitting', parts: { head: 'afro' }, ink: '#1d3557' })
validate({ v: 1, parts: { head: 'afroo' } })
// { ok: false, errors: [{ path: 'parts.head', message: 'no head "afroo"', choices: ['afro', 'bangs', ...] }] }
randomDoc({ type: 'bust', seed: 7 })          // the same seed, the same document
search({ category: 'head', query: 'curly' })  // [{ category, id, label, pieces }]
```

- **The document** (`PeepcraftDoc`, `doc.ts`): the drawable part of `CreatorState` plus `v: 1`. Everything but `v` may be left out; `{ v: 1 }` is what PeepCraft opens with. `validate` lists every problem with its path and, where there is a list, the choices; it rejects unknown fields, uploads (they stay in the browser that made them), colours that are not `#rrggbb`, and numbers outside the creator's sliders (`LIMITS`). `resolve` turns a valid document into a `CreatorState`; `fromState` goes back, leaving out what equals the start.
- **Rendering** (`render.ts`): `renderSvg` validates (throws `DocInvalid` with the errors), loads the paths it needs (`load`), and draws as the creator's exports do: the scene when it has members, else the peep or figure on its background, 1024 on the long side. `nameOf` names the file as the creator names a download.
- **State** (`types.ts`, `state.ts`, `scene.ts`, `outfit.ts`, `random.ts`, `export.ts`): the creator's state and the plain functions on it: choosing, history, dice, scenes, the picture, the SVG exports. `seeded(n)` is a random number generator that repeats.
- **Catalog** (`catalog.ts`): every atom, figure and thing a document can name, with the pieces each can colour; `search` filters by category, type and words.

React stays: atoms, figures and things are React components, and `react-dom/server` renders them to a string in Node, Workers and browsers.

Dependencies: `@kit/peeps`, `@kit/things`, `@kit/transhumans`; `react` and `react-dom` (MIT) as peers.
