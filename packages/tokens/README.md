# @kit/tokens

The kit's design tokens: **one set of `--k-*` CSS variables** for light, dark and brand themes, and the files generated from
them. **No dependencies.** Layer 1 of the UI system (`~/services/docs/ui/tokens.md`); every other layer reads these names.

```
src/tokens.ts ──npm run build──► css/tokens.css       --k-* for light, dark, each brand
                                 css/tailwind.css     Tailwind v4 theme on the tokens
                                 css/to-shadcn.css    shadcn variables from the tokens
                                 css/from-shadcn.css  the tokens from a shadcn theme
                                 tokens.json          W3C design tokens (Figma, Tokens Studio)
```

`src/tokens.ts` is the only file to edit. The generated files are committed. A test fails when they are stale, so run `npm run build` after a change.

## Use

**Kit package (injects its own `<style>`):**

```ts
import { TOKENS_CSS, BREAKPOINTS } from '@kit/tokens'
```

**App with Tailwind v4 (the kit owns the theme):**

```css
@import "tailwindcss";
@import "@kit/tokens/tokens.css";
@import "@kit/tokens/tailwind.css";   /* bg-page, text-muted, border-line, rounded-md, shadow-md, font-display, tablet:, desktop:, wide: */
```

**App that also uses shadcn/ui widgets:** add `@import "@kit/tokens/to-shadcn.css";`. Then delete the `:root` and `.dark` colour
blocks that `shadcn init` writes, and make `dark:` follow the kit's attribute:

```css
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
```

**Kit piece inside an existing shadcn app (the app owns the theme):**

```css
@import "./globals.css";                  /* the app's shadcn :root and .dark */
@import "@kit/tokens/tokens.css";
@import "@kit/tokens/from-shadcn.css";
```

> Never import `to-shadcn.css` and `from-shadcn.css` together. Each maps the other's names, which makes a cycle, and the browser
> drops every colour without an error.

## Themes

| Attribute | Values | Effect |
|---|---|---|
| `data-theme` | `light`, `dark` | the mode. With no attribute, the root follows `prefers-color-scheme` |
| `data-brand` | `sunny`, `glass`, `noir`, `violet` | a brand theme: a full colour set on top of its mode (`noir` and `violet` are dark), plus fonts, radius, shadow and blur |

Both work on `<html>` or on any element, and nest: `<div data-brand="noir"><div data-theme="light">` is light colours with noir's radius.
Every block is wrapped in `:where()` (specificity 0), so a plain `:root { --k-accent: … }` in a host overrides it.

## Names

| Group | Names |
|---|---|
| Colours | `page`, `page-fill`, `surface`, `surface-2`, `popover`, `text`, `muted`, `line`, `line-strong`, `accent`, `on-accent`, `focus`, `danger`, `on-danger`, `success`, `warning`, `overlay`, `over` |
| Type | `font-sans`, `font-display`, `font-serif`, `font-mono`, `text-xs` … `text-6xl`, `text-display`, `leading-tight`, `-snug`, `-normal` |
| Space | `space-1` … `space-32` (N × 4 px), `gutter`, `section`, `content` |
| Shape | `radius-sm`, `-md`, `-lg`, `-xl`, `-full`, `shadow-sm`, `-md`, `-lg`, `blur` |
| Motion, layers | `dur-fast`, `-base`, `-slow`, `ease-out`, `ease-in-out`, `z-sticky`, `-dropdown`, `-overlay`, `-dialog`, `-toast` |

- `page-fill` is the page `background` (a gradient in glass, noir and violet).
- `page` is the solid colour that contrast is checked against. A brand with a gradient sets it to the stop with the least contrast to its text.
- `popover` is the opaque background of what floats in the top layer (dialog, menu, tooltip, toast), where a translucent surface would show the backdrop. `on-danger` is the text on a solid danger button.
- `line` is a divider and has no contrast rule. `line-strong` is a boundary that identifies a control (an input, a checkbox) and needs 3:1.
- With Tailwind, durations, layers and `page-fill` have no theme namespace. Use `duration-(--k-dur-base)`, `z-(--k-z-dialog)` and `bg-(image:--k-page-fill)`.

`TOKEN_NAMES` lists every name without the prefix. Packages read only names on that list: `unknownTokens(sourceText)` returns the ones that aren't, and each package that reads tokens tests it is empty. A package names `@kit/tokens` as a **dev** dependency, because only its test imports it.

## Checks (`npm test`)

- **WCAG contrast** for light, dark and each brand, with translucent colours composited over the page:
  - 4.5:1 for `text` on page, surface, surface-2 and popover; `muted` on page, surface, surface-2 and popover; `on-accent` on accent; `on-danger` on danger; `danger` (error text) on page and surface
  - the same for translucent surfaces nested up to three deep (a card in a section, a control's track inside a card)
  - 3:1 for `focus` on page, surface and popover, `line-strong` on page and surface, and `success` and `warning` on page
  - `popover` is opaque in every theme
- `tokens.css` declares exactly `TOKEN_NAMES`, and the bridges read only those names.
- The generated files match `src/tokens.ts`.

The browser test `kit/examples/tokens/e2e.test.ts` (`npm run e2e` in `kit`) checks in Chromium that modes, the system mode,
nested themes, brands, a host override and both shadcn bridges resolve as described here.

## Brand themes

The four Peepcraft themes come from `packages/peeps-creator/src/styles.ts`, where they are still the creator's own `--pc-*` values (phase 6 moves the creator onto these tokens). Glass, noir and violet were changed where the creator's values missed the contrast checks:

| Brand | Changed | Why |
|---|---|---|
| glass | `muted` #5b6275 → #3f4659; accent #3d6bff → #2f5cf0; status colours darker; `line-strong` #575e71 added | muted 3.1, white on accent 4.4 |
| noir | `muted` #9a978e → #b5b2a9; danger #ff8a82; surfaces less opaque (#ffffff0d → #ffffff0a); `line-strong` and `popover` (#1c1c20, the creator's menu colour) added | muted on a surface nested in a surface was 4.2 |
| violet | the gradient is darker (#7a6bd6/#8f86e0/#6b5fc9 → #4b3fb3/#5346bd/#4235a3); surfaces less opaque (#ffffff24 → #ffffff0f); text on accent #fff → #2b0614; status colours are light tints (danger #ffeded); `popover` #6457c4 | white text on the old page was 3.2, on nested surfaces 4.3; white on pink 2.9 |

Not carried over yet, because they need tokens that don't exist: the creator's `glow`, glass's uppercase labels (`caps`, `track`) and the menu colour. Add the token here first, then use it.
