# @kit/things

Things to put in a peeps scene, drawn in code: 18 objects in four groups, each a React component that recolours with `ink` and `paper` like the [Open Peeps](../peeps) atoms and the [Transhumans](../transhumans) figures.

| Group | Things |
|---|---|
| `furniture` | chair, stool, sofa, table, desk |
| `home` | potted-plant, tall-plant, floor-lamp, bookshelf, rug |
| `small` | laptop, mug, books, phone, ball, balloon |
| `pets` | cat, dog |

```tsx
import { lookup, things } from '@kit/things'

const Chair = lookup('chair')
<svg viewBox={`0 0 ${Chair.width} ${Chair.height}`}><Chair ink="#1d3557" paper="#fde9d0" /></svg>
new Scene({ width: 4800, height: 4800 }).add(Chair, { x: 600, ground: 4500 })   // the Scene of @kit/peeps takes a thing as it is
```

- **Scale:** the peeps' hi-res units (a standing peep is about 3100 tall, so about 18 units per cm): a chair seat is 45 cm high, a table top 75 cm. The bottom edge of each canvas is the floor; a small thing sits on a table when lifted by the table's height (1350).
- **Style:** ink outlines (`LINE` = 20 units, round caps) on paper fills, with some ink fills. Drawn by hand in code, so cleaner and more even than the brush lines of the Open Peeps pack.
- **Named parts:** a part filled with a name (`'leaves'`, `'pot'`) takes its colour from `colors` (`<Plant colors={{ leaves: '#52b788' }} />`) and falls back to `paper`; `thing.slots` lists the names, for a menu. 11 things have them: seat, cushions, top, drawers, leaves, shade, books, centre, covers.
- **Add one:** `thing(meta, parts)` with a list of `[pathData, 'paper' | 'ink' | 'none']`, back to front; `rect`, `ellipse`, `poly`, `leaf` and `vein` build the path data. `test/things.test.ts` checks every point stays inside the canvas and that no colour is hard-coded.

Copy this folder. Node >= 22.23.4; React >= 18 is a peer dependency. `npm test` and `npm run typecheck` run inside the copy. The drawings were made for this kit.
