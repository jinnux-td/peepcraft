# @kit/peeps

[Open Peeps](https://www.opeeps.fun/) (Pablo Stanley, CC0) as React components. Every separate atom of the pack (166: hair, faces, facial hair, glasses, torsos, standing and sitting poses) is a component; a `Peep` puts them on one canvas and fills what you leave out with the defaults of its type.

```ts
import { Peep } from '@kit/peeps'

new Peep({ type: 'sitting', head: 'afro', face: 'calm', ink: '#1b1b1b', paper: '#fff' }).render()   // an <svg>, back to front
new Peep({ type: 'half' }).parts      // { body: 'tee-1', head: 'bun-2', face: 'smile', facialHair: 'none', accessories: 'none' }
peep.group()                           // just the <g>, to place inside a bigger scene
```

- **Types:** `standing` (alias `full`), `sitting`, `bust` (alias `half`: head and shoulders). `body` is a pose for the first two and a torso for a bust.
- **Ids:** kebab-case file names: `long-curly`, `smile-teeth-gap`, `glasses-4`, `none`. An unknown id throws and lists the choices. Menus: `catalogue.head.values()` (`.id`, `.label`, `.width`, `.height`).
- **Background:** `new Background('#f7d56e')` or `new Background()` (transparent) draws a rectangle over a box, or nothing, so an export keeps its alpha.
- **Colours:** every atom takes `ink` (the black of the drawing) and `paper` (its white). Nothing is hard-coded, so a theme is two props.
- **Scene:** `new Scene({ width, height, background })` then `.add(item, { x, y, scale, flip, ink, paper })`, back to front; `ground` instead of `y` puts the bottom of the item's canvas on a line, `fitHeight` instead of `scale` sets its height in the scene (both use the canvas, which has air around the art); `.render()` gives one `<svg>`, `.group()` a `<g>` (so a scene nests in a scene). An item is a `Peep`, another `Scene`, or any component with `width` and `height` that takes `ink` and `paper` (an atom, a `@kit/transhumans` figure). Units are the items' own: a standing peep is about 3300 tall, a figure 1080, so scale one to match the other.

```ts
new Scene({ width: 4200, height: 3400, background: '#f7d56e' })
  .add(new Peep({ head: 'afro' }), { ground: 3350 })
  .add(lookupFigure('runner'), { x: 1000, ground: 3350, fitHeight: 3240, ink: '#1d3557', paper: '#fde9d0' })
  .add(new Peep(), { x: 3000, ground: 3350, flip: true })
  .render()
```
- **Placement:** `src/layout.ts` holds the origin of each slot per type, in the atoms' shared hi-res units. `test/templates.test.ts` checks them against the 302 templates of the pack.

## Regenerate the atoms
```
node scripts/build-atoms.ts "<path to>/Flat Assets/Separate Atoms"     # writes src/atoms/<category>/<Name>.ts, no dependencies
PEEPS_ASSETS="<path to>/Flat Assets" npm test                         # adds the template check
```
Path data is copied verbatim. The pack's two faces `Smiling` and `Happy Grin` appear in templates only (no separate file), so they are not atoms.

The UI to pick parts is a separate package, [`@kit/peeps-creator`](../peeps-creator); this one has no UI.

Copy this folder. Node >= 22.23.4 for the tests and the script; React >= 18 is a peer dependency. `npm test` and `npm run typecheck` run inside the copy. Dev dependencies: `react`, `react-dom` (MIT), `typescript` (Apache-2.0).
