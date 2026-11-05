# PeepCraft

The web app, CLI and MCP server are `examples/peeps`, `examples/peeps-cli` and `examples/peeps-mcp`; the packages they share are in `packages/*`. See `README.md`.

## Before changing UI
1. **Tokens only.** Only `--k-*` tokens (`packages/tokens`); a package's own variables use its own prefix and default to a token. `examples/css-guard.test.ts` fails on a raw colour in a package stylesheet.
2. **Controls come from `@kit/ui`.** A new one is added there with its states, and to the gallery (`examples/ui`).
3. **Responsive.** Packages arrange by their own container; check 390, 768 and 1280 px. The whole page fits the window at 1280 x 720 and up.
4. **Contrast in every theme** (light, dark, sunny, glass, noir, violet), focus, keyboard, all states.
5. **Budget.** Initial JS at most 200 KB gzip, CSS 40 KB, LCP 2.5 s, CLS 0.1, TBT 200 ms. Heavy art loads on demand.
6. **Verify.** `npm test`, `npm run typecheck`, `npm run e2e`, `npm run perf:peeps`. The browser tests run under the page's real CSP (`dist/_headers`).

After changing art, run `npm run measure:peeps`; after a deliberate drawing change, `UPDATE_GOLDEN=1 npm test` in `packages/peeps-engine`.
