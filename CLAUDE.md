# kit

Standalone building blocks (`packages/*`) and the apps built from them in `examples/*`; PeepCraft is `examples/peeps`. Package rules are in
`README.md` (standalone, extract don't invent, small API); the UI system they follow is `~/services/docs/ui/`; the state of the work is in
`~/services/docs/status.md`.

## Before generating or changing UI: the checklist

From `~/services/docs/ui/README.md`, with what it means here.

1. **Taste.** Profiles in `~/services/docs/ui/taste.md`: dashboards (`shell`, `panel`, the world and dashboard examples) quiet, flat, cool, dark by default; PeepCraft (`peeps-creator`) playful, rounded, four brand themes.
2. **Tokens.** Only `--k-*` tokens (`packages/tokens`); a package's own variables use its own prefix and default to a token. A new value is added to `packages/tokens/src/tokens.ts` first (then `npm run build` there). `examples/css-guard.test.ts` fails on a raw colour in a package stylesheet.
3. **Components.** Controls are `@kit/ui` (`packages/ui`); a new one is added there with every state in `components.md`, and to the gallery (`examples/ui`). A finished component gets stories in `examples/storybook`, one `<name>.stories.ts` each, on SAMPLE content; `npm run e2e` draws every story in light and dark and runs axe on it.
4. **Responsive.** Packages arrange by their own container, not the window; check 390, 768 and 1280 px.
5. **Rules.** Contrast in every theme (light, dark, sunny, glass, noir, violet, dashboard light and dark), focus, keyboard, all states; the mode comes from the page (`modeOf`, `watchMode`), never a flag passed down.
6. **Performance.** Tool budget for PeepCraft and dashboards: initial JS ≤ 200 KB gzip, CSS ≤ 40 KB, LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 200 ms. Heavy art loads on demand (atoms, figures).
7. **Verify.** `npm test`, `npm run typecheck`, `npm run e2e` (one suite at a time if the machine is busy), `scripts/standalone.sh <package>`, and for PeepCraft `npm run perf:peeps`. Screenshot desktop, phone and dark. Report what was not checked.

## Commands

```
npm test                     # every package + the guards in examples/ (css-guard, contract)
npm run typecheck
npm run e2e                  # the examples in Chromium
npm run example:ui           # the UI gallery, http://127.0.0.1:4184 (also :panel, :dashboard, :peeps, and `example` for the world)
npm run storybook            # the finished components, http://localhost:6006 (examples/storybook)
npm run perf:peeps           # PeepCraft's budget on a mid-range phone (scripts/budget.ts; exits 1 when over)
scripts/standalone.sh ui     # copy a package (and the @kit packages it needs) out of the repo and test it there
```
