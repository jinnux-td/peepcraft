# @kit/peeps

[Open Peeps](https://www.opeeps.fun/) (Pablo Stanley, CC0) as React components. Every separate atom of the pack and its Figma file (177: hair, faces, facial hair, glasses, torsos, standing and sitting poses) is a component; a `Peep` puts them on one canvas and fills what you leave out with the defaults of its type.

```ts
import { Peep } from '@kit/peeps'

new Peep({ type: 'sitting', head: 'afro', face: 'calm', ink: '#1b1b1b', paper: '#fff' }).render()   // an <svg>, back to front
new Peep({ type: 'half' }).parts      // { body: 'tee-1', head: 'bun-2', face: 'smile', facialHair: 'none', accessories: 'none' }
peep.group()                           // just the <g>, to place inside a bigger scene
```

- **Mask:** a slot of its own, `mask: 'medical-mask' | 'respirator' | 'none'`, over the face and beard and under the glasses, where the Figma file's persons put it.
- **Types:** `standing` (alias `full`), `sitting`, `bust` (alias `half`: head and shoulders). `body` is a pose for the first two and a torso for a bust.
- **Ids:** kebab-case file names: `long-curly`, `smile-teeth-gap`, `glasses-4`, `none`. An unknown id throws and lists the choices. Menus: `catalogue.head.values()` (`.id`, `.label`, `.width`, `.height`).
- **Background:** `new Background('#f7d56e')` or `new Background()` (transparent) draws a rectangle over a box, or nothing, so an export keeps its alpha.
- **Colours:** every atom is plain paths, one per layer group of its symbol in the [Open Peeps Figma file](https://www.figma.com/design/7dm10kbNL4Ip7vvZZTM7cx/open-peeps) (page Symbols): its pieces, `skin`, `ink` (the lines and black solids), and per item `top`, `pants`, `shoes`, `jacket`, `hair`, `bandana`, `cup`, ... Each comes in its Figma colour; the standing and sitting poses (but `closed-legs-2`) keep the colours they came in before. `ink` colours the lines, `paper` every piece that comes in white (shoes, the whites of the eyes, a lens), `skin` the skin of head and body, and `colors` single parts and their pieces: `new Peep({ skin: '#8d5524', colors: { head: { bandana }, body: { top, pants, shoes }, facialHair: { ink } } })`. `mono: true` is black and white: the lines in `ink`, every other piece in `paper`. Each atom carries its shapes (`.shapes`: `{ piece, fill, d }`) and the pieces offered as colours with the colour each comes in: `lookup('head', 'bun').pieces` is `{ bandana: '#9fd8e5' }` (not the skin and lines, nor the pieces of a face or glasses, which take its paper).
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
node scripts/build-figma.ts <symbols.svg>    # writes src/atoms/<category>/<Name>.ts, keeping their ids, labels, sizes and file names
PEEPS_ASSETS="<path to>/Flat Assets" npm test   # adds the template check
```
`<symbols.svg>` is the Figma page Symbols exported whole as SVG with layer names as ids (the Figma MCP's `download_assets` on node `0:808`, format svg). Figma scales that page down to 4096 wide; `scripts/figma-symbols.json` holds the scale, the page origin and where each symbol sits, to put each path back in its symbol's own units. Symbols Figma has beyond the pack are atoms too, after the pack's: Dreads 1 and 2, the doctor and nurse poses (`doctor-nurse-1` to `3`), the eyes-only faces to wear under a mask (`masked-calm`, `masked-cheers`, `masked-smile`) and the masks.

The UI to pick parts is a separate package, [`@kit/peeps-creator`](../peeps-creator); this one has no UI.

Copy this folder. Node >= 22.23.4 for the tests and the script; React >= 18 is a peer dependency. `npm test` and `npm run typecheck` run inside the copy. Dev dependencies: `react`, `react-dom` (MIT), `typescript` (Apache-2.0).
