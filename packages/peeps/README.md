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
- **Colours:** every atom takes `ink` (the black of the drawing) and `paper` (its white). Nothing is hard-coded, so a theme is two props. `skin` is one colour for the skin of head and body (face, neck, hands, arms, ankles), and `colors` sets single parts and their pieces: `new Peep({ skin: '#8d5524', colors: { head: { hair, hat }, body: { paper: clothes, top, jacket, bottoms, shoes }, facialHair: { hair } } })`. A piece (a `Role`) takes its colour inside its outline only: a white piece (a shoe, a band) as paper, a solid black one (hair, a black shirt, black trousers) as ink, its edge kept as a dark line; a piece left out keeps the part's ink or paper, and a pencil moustache with no hair shape takes its hair colour as ink. The pack draws skin, clothes and hats as one white shape, so `src/skin.ts` (generated) holds the skin areas of every head, body and pose, and a skinned part is drawn again in the skin colour, masked to them (a mask, not a clip: a clip's soft edge shows the paper under black shapes as a faint line). It also holds what a body holds (`propAreas`: a phone, a laptop, a bike, a wheelchair), drawn again in the peep's paper when the clothes take a colour. Where the pack has no line between skin and hair or clothes (white bangs, a fur collar), the labels add a cut line for segmenting. The pack leaves the whites of 14 faces see-through (eyes, teeth, a tear), so the skin shows in them: `faceWhites` holds what their lines close in, filled in the face's paper under it. The pieces are `roleAreas` in the same file, per atom `{ [piece]: { paper, ink } }`: the white areas of the piece, and its solid black shapes less a 12-unit rim (strokes, 12 to 20 units wide, drop out entirely). Piece names are open (`hair`, `top`, `tie`, any a label gives), and each atom carries its pieces with the colour each comes in: `lookup('head', 'bun').pieces` is `{ hair: '#111111', hat: '#90a7e0' }`. `Peep` draws a piece only when `colors` gives it one; the creator passes each item's own until one is picked.
- **Scene:** `new Scene({ width, height, background })` then `.add(item, { x, y, scale, flip, ink, paper })`, back to front; `ground` instead of `y` puts the bottom of the item's canvas on a line, `fitHeight` instead of `scale` sets its height in the scene (both use the canvas, which has air around the art); `.render()` gives one `<svg>`, `.group()` a `<g>` (so a scene nests in a scene). An item is a `Peep`, another `Scene`, or any component with `width` and `height` that takes `ink` and `paper` (an atom, a `@kit/transhumans` figure). Units are the items' own: a standing peep is about 3300 tall, a figure 1080, so scale one to match the other.

```ts
new Scene({ width: 4200, height: 3400, background: '#f7d56e' })
  .add(new Peep({ head: 'afro' }), { ground: 3350 })
  .add(lookupFigure('runner'), { x: 1000, ground: 3350, fitHeight: 3240, ink: '#1d3557', paper: '#fde9d0' })
  .add(new Peep(), { x: 3000, ground: 3350, flip: true })
  .render()
```
- **Placement:** `src/layout.ts` holds the origin of each slot per type, in the atoms' shared hi-res units. `test/templates.test.ts` checks them against the 302 templates of the pack.

## Regenerate the skin areas and pieces
```
node ../../scripts/build-peeps-skin.ts sheets <dir> [atoms]    # numbered sheets of every white area and solid (k0, k1, ...), to label by eye (needs Chromium)
node ../../scripts/build-peeps-skin.ts review [dir]              # a picture per atom in test colours, to check (default review/skin)
node ../../scripts/build-peeps-skin.ts write                    # scripts/skin-labels.json -> src/skin.ts
```
The labels list, per atom, the numbers of its skin areas, or `{ skin, props, close, cuts, splits, holes, lasso, zonesAt, colors }` and, under any other name, the areas of that piece (`hair`, `top`, `tie`); `colors` sets the colour a piece comes in by hand, over the rules of `scripts/peeps-item-colors.ts`:
the areas of what it holds and of each piece (a white area by number, a solid as `"k0"`), a gap closing in pixels, extra ink lines (path data)
that split a white area the art leaves open, and extra paper lines that split a solid (a black shirt over black trousers). A head or a
beard's unlabelled pieces are its hair; a body's are its clothes. Every atom is measured over all it draws, past its own box (an arm, a
bike wheel). Rebuild them when the atoms change.

## Regenerate the atoms
```
node scripts/build-atoms.ts "<path to>/Flat Assets/Separate Atoms"     # writes src/atoms/<category>/<Name>.ts, no dependencies
PEEPS_ASSETS="<path to>/Flat Assets" npm test                         # adds the template check
```
Path data is copied verbatim. The pack's two faces `Smiling` and `Happy Grin` appear in templates only (no separate file), so they are not atoms.

The UI to pick parts is a separate package, [`@kit/peeps-creator`](../peeps-creator); this one has no UI.

Copy this folder. Node >= 22.23.4 for the tests and the script; React >= 18 is a peer dependency. `npm test` and `npm run typecheck` run inside the copy. Dev dependencies: `react`, `react-dom` (MIT), `typescript` (Apache-2.0).
