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
- **Dice:** one per tab changes that tab only (never to the same choice twice); **Shuffle all** changes every part. A transparent background is left alone by Shuffle.
- **Look:** background (a colour, or **transparent**), foreground and paper colours, scale, rotate, flip (also the `F` key), undo / redo / reset.
- **Export:** SVG and PNG at 1024 px. Transparent stays transparent in both (no rectangle in the SVG, alpha in the PNG).
- **Themes:** `sunny`, `glass`, `noir`, `violet`, scoped to the component (`data-pc-theme`), so a host page is never restyled. The stylesheet ships inside the component.
- **Size:** the layout follows the width of the component (container queries), not the window: three columns when wide, stacked in a narrow panel or on a phone.

## Folders
```
src/state.ts, random.ts, scene.ts, export.ts, types.ts   plain TypeScript: choosing, history, dice, the picture, the exports (tested with node --test)
src/styles.ts                                            the stylesheet and the four themes
src/components/                                          PeepCreator (the whole), PartPicker, Thumb, Stage, Swatches, Slider, ThemeMenu, icons
```
Each piece is exported, so a dashboard can use the whole creator or only, say, `PartPicker` with its own state.

Depends on `@kit/peeps`; peer dependencies `react` and `react-dom` (>= 18). Node >= 22.23.4 for the tests; the components are `.tsx` and need a bundler (esbuild, Vite). `npm test` and `npm run typecheck` run inside the copy (copy `peeps` with it). The browser test is `examples/peeps/e2e.test.ts`.
