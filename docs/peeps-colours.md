# Peeps: using the creator, setting default colours, setting up the pieces of an item

Three tasks, three places (and, in section 4, how the `Peep` class is put together):

| You want to | Where | Rebuild needed |
|---|---|---|
| Make a peep and save it | the creator (`npm run example:peeps`) | no |
| Change the colour an item comes in (its default) | the refine page, or `colors` in `packages/peeps/scripts/skin-labels.json` | yes, `build-peeps-skin.ts write` |
| Change which area of a drawing is skin, hair, top, a tie, ... (any piece name) | the refine page, or `packages/peeps/scripts/skin-labels.json` | yes, `build-peeps-skin.ts write` |

---

## 1. Using the creator

```bash
npm run example:peeps        # builds and serves http://127.0.0.1:4183
```

**Layout.** Tabs on the left (Type, Body, Hair, Face, Facial hair, Accessories, Figures, Scene), the items of the open tab, the stage in the
middle, the look and Save on the right.

**Picking items.** Click an item. Click a part of the peep on the stage to open its tab. Every item comes in its own colours, so what its
picture shows is what you get.

**Header of a tab**, left to right:

| Control | Does |
|---|---|
| Colour dots (Top, Bottoms, Hair, Tie, Skin, ...) | One per piece the current item carries (`atom.pieces`). Click one to open its swatches; hover for the hex. A colour you pick stays until you choose another item in that tab; any item chosen, even the same one again, comes in its own colours. "Back to its own colour" undoes a pick. |
| **On peep** | Off: each picture shows the item alone (easy to compare). On: each item on the whole peep. Off on every load. |
| Grid / list button | Grid of pictures, or a list with the full name of each. |
| Padlock | Locks this part: **Shuffle all** leaves it alone. The dice of the tab still changes it. |
| Dice | A random item in this tab only. |

**Which dots each tab shows:**

| Tab | Dots |
|---|---|
| Type | Skin, Lines, Fill |
| Hair | the pieces of the head (Hair, Hat, ...), Skin |
| Body | the pieces of the outfit (Top, Jacket, Bottoms, Shoes, a Tie, ...), Clothes (every white area no piece names), Skin |
| Face | Face |
| Facial hair | the pieces of the beard (Facial hair); none for no beard |
| Accessories | Accessories (its lines); Frame for glasses-4 (the white frame) |
| Figures | Lines, Fill |

**Right panel.** Background (with its own padlock), **Contrast** (black lines on white only, as the original pack; turning it off brings all
colours back, including your picks), Scale and Rotate (a tick marks the default; a drag that comes near it snaps onto it), Flip (or `F`),
PNG size, Save as SVG / PNG.

**Toolbar.** Shuffle all (skips what is locked; a transparent background stays), Undo, Redo, Reset, theme.

**Scene tab.** Add copies the current peep into a picture of many; each member keeps its colours and can be moved, resized, flipped and
recoloured there.

### In code

```ts
import { Peep } from '@kit/peeps'

new Peep({
  type: 'standing',                                   // 'standing' | 'sitting' | 'bust'
  body: 'walking-2', head: 'bun', accessories: 'glasses-4',
  skin: '#ffdbbe',
  colors: {
    head: { hair: '#6b2d1a', hat: '#9ddadb' },
    body: { top: '#ffffff', bottoms: '#2c3e5c', shoes: '#111111' },
  },
}).render()                                           // an <svg>; .group() for a <g>
```

`Peep` alone draws black on white: the default colours (skin `#ffdbbe`, outfit colours, white eye whites and glasses frame) come from the
creator, which passes them in as `skin` and `colors`. Each item carries its pieces and the colour each comes in:
`lookup('head', 'bun').pieces` is `{ hair: '#111111', hat: '#90a7e0' }`. Piece names are open: `hair`, `hat`, `top`, `jacket`, `bottoms`,
`shoes`, and any a label adds (`tie`, `sleeves`). Things do the same: `lookup('potted-plant').pieces` is `{ leaves: '#52b788' }`.

---

## 2. Setting the default colours of items

Each item carries its colours: `atom.pieces`, from the `colors` table of `packages/peeps/src/skin.ts`, which `build-peeps-skin.ts write`
fills in from the rules (`scripts/peeps-item-colors.ts`) and, over them, the colours set by hand in the labels. The creator draws each piece
in its item's colour until one is picked.

### One item, by hand

In the refine page (section 3), pick the colour of a piece under **Pieces of this item**; `apply`, then `write`. Or add `colors` to the
item's label in `skin-labels.json`. Pieces you leave out keep the colours the rules pick.

```json
"facialHair/moustache-6": {"skin": [], "colors": {"hair": "#e8e1e1"}},
"standing/walking-2": {"skin": [1, 4, 5, 6, 9], "top": ["k0", "k1"], "colors": {"top": "#ffffff", "shoes": "#111111"}},
```

**The key** is `<kind>/<item id>`:

| Kind | For |
|---|---|
| `body/` | bust bodies (Type: bust) |
| `standing/`, `sitting/` | poses |
| `head/` | hair styles and hats |
| `facialHair/` | beards and moustaches |

The item id is its file name in kebab-case; the pictures in `review/roles/` are named after it (`standing-walking-2.png` is
`standing/walking-2`). A colour for a piece the item does not have does nothing.

### All items, by rule

When a label sets no colour for a piece, `itemColors()` in `scripts/peeps-item-colors.ts` picks one from the item's name (the same every
build):

| Piece | Rule | Change it in |
|---|---|---|
| Skin | `#ffdbbe` for every peep | `SKIN` in `packages/peeps-creator/src/types.ts` (reload) |
| Line 1, Line 2 (`line-1`, ...) | white, as drawn: the white lines over black that are no area (found by the segmenter, specks under 3 px dropped) | `itemColors` |
| Hair, a beard's too | black (`#111111`); another colour only set by hand in the label (`colors`) | `itemColors` |
| Any piece drawn black in the art | stays black | `itemColors()` |
| Outfit | one theme, warm or cold, three colours at most: jacket and hat an accent, trousers a dark (or light denim / khaki), the top white under a dark jacket or trousers and black under a light one, shoes repeat one of the others | `themes` (accent and dark lists per theme) and `itemColors()` |
| Any other piece (a tie, sleeves) | the outfit's accent | `itemColors()` |
| Eye whites, teeth, tears, glasses frame | white whatever the Fill | `wornColors()` in `packages/peeps-creator/src/outfit.ts` |

The swatches offered when you click a dot (not the defaults) are `swatches.hair`, `swatches.clothes`, `swatches.skin`, ... in
`packages/peeps-creator/src/types.ts`. A thing's colours are the third argument of `thing()` in `packages/things/src/things/*.ts`.

### Check

```bash
node scripts/build-peeps-skin.ts write && cd packages/peeps-creator && npm test
```

A test checks every outfit keeps the rules (three colours at most, shoes repeat a colour, the top under a jacket white or black). A colour
set by hand may break those rules on purpose; if it fails that test, that is the reason.

---

## 3. Setting up the pieces of an item

The original drawings have one white shape for skin, clothes and hats, and draw hair and black clothes in the same black as the lines.
`scripts/build-peeps-skin.ts` cuts every drawing into numbered areas; `packages/peeps/scripts/skin-labels.json` says what each area is;
`write` turns that into `packages/peeps/src/skin.ts`, which the library uses.

### See the areas

```bash
node scripts/build-peeps-skin.ts review review/roles      # one picture per item, test colours, areas numbered
node scripts/build-peeps-skin.ts sheets /tmp/s standing/walking-2,head/bun   # bigger numbered sheets of a few items
```

In a review picture:

- **left:** the item in test colours. Brown skin, red hair, purple hat, light blue top, teal jacket, dark blue bottoms, orange shoes,
  white things held, **grey not labelled**.
- **right:** every area numbered. White areas are `0, 1, 2, ...`; solid black shapes are `k0, k1, ...`. Dashed red lines are cuts.

### Label an item

One line per item in `skin-labels.json`:

```json
"standing/walking-2": {"skin": [1, 4, 5, 6, 9], "top": ["k0", "k1"], "bottoms": [0], "shoes": [2, 3, 7, 8, 10]},
```

| Field | Holds |
|---|---|
| `skin` | white areas that are skin (face, neck, hands, ankles). A plain list `[1, 4]` means skin only. |
| any other name (`hair`, `hat`, `top`, `jacket`, `bottoms`, `shoes`, `tie`, ...) | the areas of that piece: a number for a white area, `"k0"` for a solid black shape. Letters, digits and dashes. |
| `colors` | the colour each piece comes in, set by hand: `{"top": "#ffffff"}`, over the rules |
| `props` | things held (phone, bike, wheelchair, prosthetic): they keep the white when the clothes take a colour |
| `cuts` | extra black lines (SVG path data, in the item's own units) that split a white area the art leaves open |
| `splits` | extra white lines that split a solid black shape (a black shirt over black trousers) |
| `close` | pixels of gap closing: seals small gaps where a line stops short (try `1` or `2`) |
| `holes` | paths filled with skin under the drawing, for a gap the art leaves unpainted |

Defaults, so you only label what differs:

- On a **head** or a **beard**, every area that is not skin or another piece is hair. Only label hats, bands and beads (`hat`).
- On a **body or pose**, an unlabelled area follows the **Clothes** colour (patterns: white specks on a black sweater, stripes, a logo).
  An unlabelled solid stays black (thin slivers inside thick lines: leave them).
- **Faces** need no labels: the eye whites, teeth and tears they enclose are found and filled white automatically.

### When an area is wrong

| Problem | Fix |
|---|---|
| An area has the wrong piece | move its number to the right list |
| Two things share one number (an arm and a shirt) | add a `cuts` line across the gap that joins them, then look at the new numbers |
| Black shirt and black trousers are one `k` | add a `splits` line along the waist |
| A tiny gap joins two areas | `"close": 2` |

To find coordinates for a cut or split, draw the item with a grid: render it with a viewBox around the spot and lines every 20 units (see
how `review/roles` pictures are drawn in `build-peeps-skin.ts`), or read them off the right half of its review picture. Cuts are 8 units wide.

**Numbers are ordered by size and can change** when a cut, split or `close` changes the areas of that item: after such a change, run
`review` again and check that item's numbers before writing.

### Fix areas by hand in a page

```bash
node scripts/build-peeps-skin.ts refine        # http://127.0.0.1:4184, saves packages/peeps/scripts/skin-feedback.json as you go
node scripts/build-peeps-skin.ts apply         # feedback -> skin-labels.json (areas, lassos, colours); prints notes
```

| Tool | Does |
|---|---|
| Pick (`1`) | Click an area: a menu of pieces; or press its letter (`s` skin, `p` props, `h` hair, `a` hat, `t` top, `j` jacket, `b` bottoms, `o` shoes, `n` none; added pieces have no letter) |
| Paint (`2`) | Click areas: each takes the brush |
| Lasso (`3`) | Draw around a part: what it covers takes the brush, over the numbered areas, with a note. Saved in the label as `lasso`, applied to pixels, so it never renumbers areas |
| Smooth | The lasso stabiliser: the line trails the pointer on a string this many screen pixels long (0: off), so a shaky hand draws a calm line |
| Eraser (`5`), − Subtract (`X`) | Click a lasso row under Layers to pick that layer. The Eraser rubs it out where you drag (size: the Eraser slider); with Subtract on, Lasso and Points cut their shape out of it instead of adding a layer. Undo works |
| line (Pieces of this item) | The item's black lines: a colour set here is saved as `colors.line` and written to `skin.ts` as the item's `ink`, which the creator's Line chip starts from. Line 1 (its white lines over black) is listed too, white by default |
| Join ⤓ | On a lasso row: each shape goes into the area of its piece under it (or next to it) and becomes part of the drawing's own areas, under the lassos (`joins` in the label). ↩ under "Joined to the drawing" turns one back into a lasso |
| Points (`4`) | A lasso placed point by point: click around a part; click the first point, double-click or Enter to close; Backspace takes the last point off, Esc cancels |
| Layers | The lassos and the zones of the item's own drawing (grey rows: its areas of one piece, `skin`, `top`) as layers, top first, moved with ▲ ▼. A lasso over a zone covers it; under it, it shows only where the zone is not. A head or a beard has no `none`: every area not labelled otherwise is hair, its own zone. On other items, unlabelled areas lie under everything. Saved as `zonesAt`: per zone, how many lassos lie under it. The eye hides a layer to look under it, in the page only: not saved, not in the build |
| Auto-merge, Merge neighbours | With the tick on, a new or moved lasso goes into the layer under it when both are one piece and touch. The button merges every run of same-piece layers next to each other in the list, touching or not. Shapes that overlap or come within 1% of the item become one outline (traced on a bitmap, gaps closed, a hole filled); shapes further apart stay separate shapes of one layer |

Pinch or ctrl+wheel zooms, wheel or alt+drag pans, `0` fits, ↑/↓ change item, ⌘Z undoes.

The right panel:

| Section | Does |
|---|---|
| Pieces of this item | the colour each piece comes in (↺ back to the rules' colour); ✕ takes the piece off this item, its areas go back to what the label made them |
| All pieces | every piece name, with how many items use it; ✕ removes the name and takes it off every item (hair stays: a head draws unlabelled areas as hair) |
| New piece | type a name (`tie`, `sleeves`) and Add, or **+ Piece** in the brush row: it becomes the brush, Paint or Lasso the areas |

A new piece shows in its test colour until `apply` and `write` give it the outfit's accent, or you pick its colour.

### Write and check

```bash
node scripts/build-peeps-skin.ts write                    # skin-labels.json -> packages/peeps/src/skin.ts
node scripts/build-peeps-skin.ts review review/roles       # look again
npm test && npm run typecheck && npm run e2e
```

`write` stops with an error naming the item when a label points at an area that does not exist, or when a body, pose or head has no label
at all (a new item from `build-atoms.ts`: add a line for it).

---

## 4. How `Peep` is built

`packages/peeps/src/peep.ts`. A `Peep` is plain data plus drawing methods; it holds no React state.

### What it takes: `PeepOptions` (all optional)

| Option | Meaning | Left out |
|---|---|---|
| `type` | `'standing'`, `'sitting'`, `'bust'` (`'full'` = standing, `'half'` = bust): canvas size and where each part sits | `'standing'` |
| `body`, `head`, `face`, `facialHair`, `accessories` | the item of each part, by id | `defaults[type]` (bust: `tee-1`, `bun-2`, `smile`, `none`, `none`) |
| `ink` | lines, every part | black |
| `paper` | white areas, every part | white |
| `skin` | one colour for face, neck, hands, arms, ankles | none: skin stays the paper |
| `colors` | per part (`PartColors`): `{ ink?, paper?, [piece]?: colour }`, a piece by its name (`hair`, `top`, `tie`, ...) | everything in `ink` / `paper` |

An unknown type or item id throws and lists the choices.

### What it keeps

`type`, `ink`, `paper`, `colors`, `skin`, and `parts` (all five ids, defaults filled in), all `readonly`.

### Methods

| Method | Returns |
|---|---|
| `layout()` | `Placed[]`: `{ slot, atom, at }` per part, back to front: body, head, face, facialHair, accessories. `atom` is the drawing (a React component taking `ink` and `paper`), `at` its offset on the canvas (`src/layout.ts`). |
| `size` | `{ width, height }` of the type's canvas, the viewBox |
| `part(placed)` | one part as `<g data-slot="…" transform="translate(at)">`, in its colours (a thumbnail draws one part this way) |
| `group(props?)` | every part in one `<g>`, to place in a bigger picture (`Scene` uses it) |
| `render(props?)` | a whole `<svg viewBox="0 0 width height">` |

### How `part()` draws one part

Its colours first: `ink` = `colors[slot].ink` else the peep's `ink`; `paper` = `colors[slot].paper` else the peep's `paper`. A pencil moustache
(no hair shape) takes its `hair` colour as ink. Then, bottom to top:

| Layer | When | From `skin.ts` |
|---|---|---|
| 1. skin hole: a gap in the art filled with the skin colour | `skin` set, the atom has one | `holes` |
| 2. face whites: eyes, teeth, a tear, in the part's paper | a face that encloses them | `whites` |
| 3. **the atom**, once, in `ink` and `paper` | always | |
| 4. things held (phone, bike) drawn again in the peep's own paper | the part's paper differs from the peep's | `props` |
| 5. each piece with a colour drawn again: a white piece with the colour as paper, a solid black one with it as ink | `colors[slot][piece]` set | `roles` |
| 6. skin drawn again in the skin colour | `skin` set | `skin` |

Layers 4 to 6 draw the whole atom again inside an SVG `<mask>` cut to their areas (a mask, not a clip: a clip leaves a faint line under black
shapes). The mask ids come from React's `useId`, so draw several peeps in **one** React tree (or one SVG file each): two separate
`renderToStaticMarkup` calls pasted into one page reuse ids and borrow each other's masks.

### Who passes what

```
creator state ──► peepOf(state)                         packages/peeps-creator/src/scene.ts
                    │  Contrast on: new Peep({ type, ink, paper, ...parts })   (no colours)
                    └► wornColors(type, parts, partColors)                     outfit.ts
                         each item's own colours (atom.pieces) under the picks,
                         face and glasses paper white
                    ──► new Peep({ type, ink, paper, skin, colors, ...parts })
                    ──► .group() on the stage, in thumbnails (.part()), in exports and the scene
```

`Peep` itself has no idea of default outfit colours or of the default skin: those live in the creator. Used on its own, it draws the pack's
black on white unless given `skin` and `colors`.

---

## Files

| File | What |
|---|---|
| `packages/peeps/src/peep.ts` | `Peep`: draws a peep, its pieces, skin and face whites |
| `packages/peeps/src/skin.ts` | generated: `skin`, `props`, `holes`, `roles` (areas of each piece), `colors` (the colour each piece comes in), `whites` |
| `packages/peeps/src/registry.ts` | gives each atom its `pieces` from `colors` |
| `packages/peeps/scripts/skin-labels.json` | hand-made labels: areas and colours |
| `scripts/build-peeps-skin.ts` | finds the areas; `sheets`, `review`, `write`, `refine`, `apply` |
| `scripts/peeps-item-colors.ts` | the rules for default colours (`themes`, `itemColors`) |
| `packages/peeps-creator/src/outfit.ts` | `wornColors`: each item's own colours under the picks |
| `packages/peeps-creator/src/colors.ts` | the colour dots: from the worn items' pieces, per tab (`tabColors`) |
| `packages/peeps-creator/src/types.ts` | `SKIN`, swatches |
| `review/roles/` | review pictures (not committed) |
