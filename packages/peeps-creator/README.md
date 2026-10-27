# @kit/peeps-creator

**Assembly:** a character creator for [`@kit/peeps`](../peeps) as one React component. Drop it in a page or in a dashboard panel; `@kit/peeps` itself stays free of any UI, so other packages can use `Peep` alone.

```tsx
import { PeepCreator } from '@kit/peeps-creator'

<PeepCreator
  defaultState={{ type: 'sitting', bg: 'transparent' }}   // anything left out is the default
  onChange={(state) => save(state)}                       // the whole state, after every change
  onExport={({ kind, name, blob }) => upload(name, blob)} // without it, Save downloads the file
  theme={theme} onThemeChange={setTheme}                  // or defaultTheme="noir" and let it keep the theme
  showThemeButton title="Avatar" className="my-panel"
/>
```

- **Parts:** a tab per category (type, body, hair, face, facial hair, accessories), each an option grid of small pictures on the current figure.
- **Figures:** a last tab with the 38 whole illustrations of [`@kit/transhumans`](../transhumans) (and a tile to go back to building a peep). A figure replaces the peep on the stage; colours, scale, rotate, flip, background and both exports work on it, parts do not apply, and the dice of the tab picks another figure.
- **Scene:** the last tab composes a picture of many: **Add** copies the current peep or figure into the scene, and the stage shows the scene while the tab is open. The left panel holds what can be added; the right panel lists the members, as tall as the window allows, then scrolling. Drag a member on the stage to move it across or up and down (one undo step per drag), or pick it (its tile, or a click on the stage) to set its position, size and lift (height above the ground, from -20 % to 80 %: a mug on a table is 25 %), flip it (`F`), send it back or to the front, or remove it. Everyone stands on one ground line (the feet come from the measured outline), on the scene's background. Each member keeps the colours it was added with; Save exports the whole scene (`scene.svg`, `scene.png`). **Things** adds one of the 18 drawings of [`@kit/things`](../things) in the current colours. **Uploads** takes a PNG, JPEG, WebP, GIF or SVG (5 MB at most) and keeps it in this browser (IndexedDB `kit-peeps-creator`), never on a server: it stays after a reload until its × is pressed, which also takes it out of the scene, or until the site's data is cleared. An upload is drawn as an `<image>` with a data URL, so an SVG's scripts never run and the exports carry the picture. Undo covers add, remove, flip and order. The scene is `state.scene`, so `defaultState` and `onChange` carry it. It is drawn with the `Scene` of `@kit/peeps`.
- **Dice:** one per tab changes that tab only (never to the same choice twice); **Shuffle all** changes every part. A transparent background is left alone by Shuffle.
- **Look:** background (a colour, or **transparent**), foreground and paper colours, scale, rotate, flip (also the `F` key), undo / redo / reset.
- **Export:** SVG and PNG at 1024 px. Transparent stays transparent in both (no rectangle in the SVG, alpha in the PNG).
- **Themes:** `sunny`, `glass`, `noir`, `violet`, scoped to the component (`data-pc-theme`), so a host page is never restyled. The stylesheet ships inside the component.
- **Size:** the layout follows the width of the component (container queries), not the window: three columns when wide, stacked in a narrow panel or on a phone.

## Folders
```
src/state.ts, random.ts, scene.ts, export.ts, types.ts   plain TypeScript: choosing, history, dice, the picture, the exports (tested with node --test)
src/styles.ts                                            the stylesheet and the four themes
src/components/                                          PeepCreator (the whole), PartPicker, SceneSources and SceneMembers, Thumb, Stage, Swatches, Slider, ThemeMenu, icons
```
Each piece is exported, so a dashboard can use the whole creator or only, say, `PartPicker` with its own state.

Depends on `@kit/peeps`, `@kit/transhumans` and `@kit/things`; peer dependencies `react` and `react-dom` (>= 18). Node >= 22.23.4 for the tests; the components are `.tsx` and need a bundler (esbuild, Vite). `npm test` and `npm run typecheck` run inside the copy (copy `peeps`, `transhumans` and `things` with it). The browser test is `examples/peeps/e2e.test.ts`.
