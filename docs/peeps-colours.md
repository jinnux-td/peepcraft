# Peeps: using the creator, the colours of items, how `Peep` draws them

| You want to | Where | Rebuild needed |
|---|---|---|
| Make a peep and save it | the creator (`npm run example:peeps`) | no |
| Change the colour an item comes in (its default) | its layer group's fill in the [Figma file](https://www.figma.com/design/7dm10kbNL4Ip7vvZZTM7cx/open-peeps), page Symbols; for a standing or sitting pose, `before` in `packages/peeps/scripts/build-figma.ts` | yes, `build-figma.ts` |
| Change what can be coloured apart (a piece) | the layer groups of the symbol in Figma: one group per piece | yes, `build-figma.ts` |

---

## 1. Using the creator

```bash
npm run example:peeps        # builds and serves http://127.0.0.1:4183
```

**Layout.** Tabs on the left (Type, Body, Hair, Face, Facial hair, Mask, Accessories, Extra, Figures, Scene), the items of the open tab, the
stage in the middle, the look and Save on the right.

**Picking items.** Click an item. Click a part of the peep on the stage to open its tab. Every item comes in its own colours, so what its
picture shows is what you get.

**Header of a tab**, left to right:

| Control | Does |
|---|---|
| Colour dots (Top, Pants, Bandana, Mask, Skin, ...) | One per piece the current item carries (`atom.pieces`). Click one to open its swatches; hover for the hex. A colour you pick stays until you choose another item in that tab; any item chosen, even the same one again, comes in its own colours. "Back to its own colour" undoes a pick. |
| **On peep** | Off: each picture shows the item alone. On: each item on the whole peep. Off on every load. |
| Grid / list button | Grid of pictures, or a list with the full name of each. |
| Padlock | Locks this part (on Type, the type; on Extra, the extra): **Shuffle all** leaves it alone. The dice of the tab still changes it. |
| Dice | A random item in this tab only. |

**Which dots each tab shows:**

| Tab | Dots |
|---|---|
| Type | Skin, Lines |
| Hair | the pieces of the head (Hair, Bandana, Cap, ...), its Line, Skin |
| Body | the pieces of the outfit (Top, Jacket, Pants, Shoes, Cup, ...), its Line, Skin |
| Face | Face (its lines) |
| Facial hair | Facial hair for a grey beard, its Line |
| Mask | Mask, its Line |
| Accessories | Accessories (its lines); Frame for glasses-4 (the white frame) |
| Figures | Lines, Fill |

**Shuffle all** rolls, in order, the type, then each part of that type, the extra (or none), the skin, the lines and the fill; never the same
choice twice in a row, and lines and fill never in one colour. Whatever is locked stays: the type, the mask and the extra are locked at
first (so a shuffle keeps the type and adds no mask or extra until you unlock them). The colours of the whole peep (Skin, Lines, Fill) have
a padlock beside their swatches; a locked one shows a small padlock on its dot. The eyes-only faces (`masked-*`) come up only while a mask
is worn.

**Right panel.** Background (with its own padlock), **Contrast** (lines in Lines, everything else in Fill; turning it off brings all colours
back, picks included), Scale and Rotate, Flip (or `F`), PNG size, Save as SVG / PNG.

### In code

```ts
import { Peep } from '@kit/peeps'

new Peep({
  type: 'standing',                                   // 'standing' | 'sitting' | 'bust'
  body: 'doctor-nurse-2', head: 'bun', face: 'masked-calm', mask: 'medical-mask',
  skin: '#8d5524',
  colors: { head: { bandana: '#9ddadb' }, body: { top: '#ffffff', scrubs: '#2c3e5c' } },
}).render()                                           // an <svg>; .group() for a <g>
new Peep({ mono: true }).render()                     // black lines on white
```

Without `colors`, every piece is drawn in the colour it comes in. `lookup('head', 'bun').pieces` is `{ bandana: '#9fd8e5' }`; the pieces of a
face and of glasses are not offered (their whites take the part's paper).

---

## 2. Where the colours and pieces come from

Every atom is generated from its symbol in the Figma file (page Symbols) by `packages/peeps/scripts/build-figma.ts`. A symbol's top-level
layers are its pieces, each one plain path in the atom: `✋ Skin` is `skin`, `🖍 Ink` is `ink` (the lines and black solids: black hair, a black
tee), `👕 Top` is `top`, `👖 Pants` is `pants`, and so on, named after the layer without its emoji. A few vague names are renamed in
`pieceOf()`: a beard's `Background` is `hair`, a doctor's `cap`, a mask's `Color` is `mask`, the doctors' `Clothes` are `scrubs`, `coat`, `top`
(a `jacket` on doctor 1) by colour.

Each piece comes in its layer's fill, except the standing and sitting poses (not `closed-legs-2`), which keep the colours they came in before
the Figma vectors: the `before` table in `build-figma.ts`, by piece.

To change them:

1. Edit the symbol in Figma (a layer's fill, or the layer groups).
2. Export the page Symbols (`0:808`) whole as SVG with layer names as ids: the Figma MCP's `download_assets` on that node, format svg.
3. If a symbol moved or was added, update its row in `packages/peeps/scripts/figma-symbols.json` (name, x, y, width, height on the page).
4. Run it and the tests:

```bash
cd packages/peeps && node scripts/build-figma.ts <symbols.svg> && npm test && cd ../peeps-creator && npm test
```

The generator keeps the ids, labels, sizes and file names of the atoms already there; a symbol with no atom yet becomes a new one after them.

---

## 3. How `Peep` is built

`packages/peeps/src/peep.ts`. A `Peep` is plain data plus drawing methods; it holds no React state.

### What it takes: `PeepOptions` (all optional)

| Option | Meaning | Left out |
|---|---|---|
| `type` | `'standing'`, `'sitting'`, `'bust'` (`'full'` = standing, `'half'` = bust): canvas size and where each part sits | `'standing'` |
| `body`, `head`, `face`, `facialHair`, `mask`, `accessories` | the item of each part, by id | `defaults[type]` (bust: `tee-1`, `bun-2`, `smile`, `none`, `none`, `none`) |
| `ink` | the lines (piece `ink`), every part | black |
| `paper` | the pieces that come in white (shoes, eye whites, a lens), every part | white |
| `skin` | the `skin` piece of head and body | each keeps its own |
| `colors` | per part (`PartColors`): `{ ink?, paper?, [piece]?: colour }` | each piece its own |
| `mono` | lines in `ink`, every other piece in `paper` | off |

An unknown type or item id throws and lists the choices.

### Methods

| Method | Returns |
|---|---|
| `layout()` | `Placed[]`: `{ slot, atom, at }` per part, back to front: body, head, face, facialHair, mask, accessories (`src/layout.ts`) |
| `size` | `{ width, height }` of the type's canvas, the viewBox |
| `part(placed)` | one part as `<g data-slot="…" transform="translate(at)">`, in its colours (a thumbnail draws one part this way) |
| `group(props?)` | every part in one `<g>`, to place in a bigger picture (`Scene` uses it) |
| `render(props?)` | a whole `<svg viewBox="0 0 width height">` |

Each part is its atom's paths, one `<path data-piece="…">` per shape, filled by `fillOf()` in `src/atom.ts`: `ink` for the lines; in `mono`
`paper` for the rest; else the piece's colour from `colors` (the peep's `skin` under a part's own), else `paper` for a piece that comes in
white, else the colour it comes in. No masks, no ids: any number of peeps can share a page.

### Who passes what

```
creator state ──► peepOf(state)                         packages/peeps-creator/src/scene.ts
                    │  Contrast on: new Peep({ type, ink, paper, mono: true, ...parts })
                    └► wornColors(type, parts, partColors)                     outfit.ts
                         each item's own colours (atom.pieces) under the picks,
                         face and glasses paper white
                    ──► new Peep({ type, ink, paper, skin, colors, ...parts })
                    ──► .group() on the stage, in thumbnails (.part()), in exports and the scene
```

---

## Files

| File | What |
|---|---|
| `packages/peeps/src/atom.ts` | `atom()`, `fillOf()`: an atom's shapes and the colour of each |
| `packages/peeps/src/peep.ts` | `Peep`: the parts of a peep, in their colours |
| `packages/peeps/src/atoms/` | generated: one file per atom, its shapes and pieces |
| `packages/peeps/scripts/build-figma.ts` | the Figma symbols to the atoms; `before` (old pose colours), `pieceOf` (renamed pieces) |
| `packages/peeps/scripts/figma-symbols.json` | the page's scale and origin, where each symbol sits |
| `packages/peeps-creator/src/outfit.ts` | `wornColors`: each item's own colours under the picks |
| `packages/peeps-creator/src/colors.ts` | the colour dots: from the worn items' pieces, per tab (`tabColors`) |
| `packages/peeps-creator/src/types.ts` | `SKIN` (`#d08b5b`, the Figma skin), swatches |
