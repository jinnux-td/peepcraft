# @kit/transhumans

[Transhumans](https://pablostanley.gumroad.com/l/transhumans) (Pablo Stanley, CC0) as React components: 38 full-figure black and white illustrations, each a ready-made pose with its own clothes, props and prosthetics (runner, reader on an armchair, astronaut, couple, ...).

```tsx
import { lookup, figures } from '@kit/transhumans'

const Runner = lookup('runner')
<svg viewBox={`0 0 ${Runner.width} ${Runner.height}`}><Runner ink="#1d3557" paper="#fde9d0" /></svg>
figures.map((f) => f.label)        // for a menu
```

- **Ink and paper:** the drawing's black is `ink`, its white is `paper`, so a figure recolours. Defaults are black and white.
- **Loaded on demand:** `figures` and `lookup` hold the names and sizes; each drawing is its own module, fetched the first time the figure is drawn (an empty `<g>` until then, then it redraws). A bundler that splits code keeps the 38 drawings out of the first download. `await f.load()` before rendering to a string (`renderToStaticMarkup`), which cannot wait.
- **Whole figures only.** The source SVGs are flat paths with no groups, and the heads, hands and props differ per figure, so there are no separate parts to swap. Parts are in [`@kit/peeps`](../peeps).
- **Canvas:** 1080 wide, 1080 tall (one is 1099); the figure sits inside with some air, so measure it with `getBBox()` to crop.

## Regenerate
```
node scripts/build-figures.ts "<path to>/transhumans art/SVG"    # writes src/figures/<Name>.ts (the paths) and index.ts (names, sizes, loaders); stops on any tag or attribute it does not know
```
Path data is copied verbatim. License of the art: CC0; crediting Pablo Stanley is a courtesy, not a duty.

Copy this folder. Node >= 22.23.4; React >= 18 is a peer dependency. `npm test` and `npm run typecheck` run inside the copy.
