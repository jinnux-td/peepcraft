# @kit/ui

The kit's shared controls (layer 2 of `~/services/docs/ui`): **CSS on native elements**, plus a few DOM helpers for what the browser
doesn't do. **No dependencies.** Every value is a kit token (`--k-*`, `@kit/tokens`), so light, dark and every brand theme work
without extra CSS. The same classes work in plain DOM and in React (`className`).

```ts
import { TOKENS_CSS } from '@kit/tokens'          // or import "@kit/tokens/tokens.css" in an app
import { ensureUiStyles, tabs, segmented, menu, dialog, tooltip, toaster, setBusy, setError, bindOutput } from '@kit/ui'

ensureUiStyles()                                    // adds UI_CSS to the document once
```

```html
<button class="k-btn" data-variant="primary">Save</button>
<button class="k-btn" data-size="sm" data-variant="ghost" data-icon aria-label="Close">×</button>
```

## Components

| Component | Markup | Variants and states | Helper |
|---|---|---|---|
| Button | `button.k-btn` or `a.k-btn` | `data-variant` primary, (secondary), ghost, danger · `data-size` sm, (md), lg · `data-icon` square · `aria-pressed` · `:disabled` / `aria-disabled` · `aria-busy` | `setBusy(button, true)` |
| Field | `.k-field` > `label.k-label` + `.k-input` + `p.k-hint` / `p.k-error` | `.k-input` on `input`, `textarea`, `select` · `aria-invalid` · `:disabled` | `setError(input, message)` |
| Checkbox, radio | `label.k-check` > `input` + text | `:checked`, `:disabled` (the whole label is the target) | |
| Switch | `label.k-check` > `input.k-switch[type=checkbox][role=switch]` + text | `:checked`, `:disabled` | |
| Slider | `.k-slider` > `input[type=range]` + `output` | `:disabled` | `bindOutput(range, output, format)` |
| Segmented | `.k-seg[role=radiogroup]` > `button[role=radio]` | `aria-checked` · `:disabled` | `segmented(group, { onSelect })` |
| Tabs | `.k-tabs[role=tablist]` > `button[role=tab][aria-controls]`, panels `.k-tabpanel[role=tabpanel]` | `aria-selected` · `:disabled` | `tabs(list, { onSelect })` |
| Card | `.k-card` (`article`, `section`, `div`) | `data-variant=raised` · a whole-card link: one `a.k-card-link` inside | |
| Chip | `span.k-chip` or `button.k-chip` | `data-status` success, warning, danger (a dot beside the word) · `aria-pressed` | |
| Dialog | `dialog` with `.k-dialog-title` and `.k-dialog-actions` | a bottom sheet under 768 px | `dialog(el).open(opener)` |
| Menu | a button + an element of `button[role=menuitem]` (or `menuitemradio`, `menuitemcheckbox`), `hr[role=separator]` | `aria-disabled`, `aria-checked` | `menu(button, el, { onSelect })` |
| Tooltip | made by the helper (`.k-tip`, `role=tooltip`) | | `tooltip(trigger, text)` |
| Toast | made by the helper in one `.k-toasts` region (`role=status`) | `data-kind` info, success, error | `toaster().show(text, { kind, timeout })` |
| States | `.k-skeleton`, `.k-spinner[role=status][aria-label]`, `.k-empty`, `.k-banner` | `.k-banner[data-kind]` error, warning | |

## Behaviour

| Helper | Keyboard and focus |
|---|---|
| `tabs` | one tab stop (roving tabindex); arrows move and select, Home and End; only the selected panel shows |
| `segmented` | one tab stop; every arrow moves and picks; disabled options are skipped |
| `menu` | Down, Enter or Space opens on the first item, Up on the last; arrows, Home, End and typeahead move; Esc, Tab or a click outside closes; picking calls `onSelect` and focus goes back to the button. It's placed below the button, or above it when there's no room |
| `dialog` | modal; Esc and a backdrop click close it (`dismissible: false` keeps the backdrop); focus goes back to the opener; the title names it |
| `tooltip` | shows on hover only where the device can hover, and on keyboard focus; hides on leave, blur or Esc; linked by `aria-describedby` |
| `toaster` | polite live region made before the first message; a toast waits while it's hovered or focused, and has a dismiss button; `timeout: 0` keeps it |

The decisions (`step`, `typeahead`, `place`) have no DOM and are tested alone (`test/logic.test.ts`).

## Rules the CSS keeps

- Tokens only, and no raw colour (tested). The button's own variables are `--ku-btn-*`.
- States come from attributes and pseudo-classes, never from a state class (tested).
- Hover is only under `@media (hover:hover)` (tested), so it never sticks on touch.
- Focus: `outline: 2px solid var(--k-focus); outline-offset: 2px` on every control (tested); inset on tabs and menu items.
- Targets: at least 24 × 24 px. Buttons other than `sm` are 48 px tall on a coarse pointer.
- `prefers-reduced-motion`: no transitions, no shimmer, a slower spinner.

## Gallery and browser tests

`npm run example:ui` in `kit` builds and serves `examples/ui` on http://127.0.0.1:4184. It shows every component in every state, with a
theme control (or `?theme=light|dark|sunny|glass|noir|violet`). `examples/ui/e2e.test.ts` checks in Chromium, in all six themes:

- **contrast:** every run of text measured on the rendered page, including the open dialog, the menu, toasts and the tooltip
- **focus:** every keyboard stop has a 2 px ring at 3:1
- **targets:** every control is at least 24 × 24 px
- **keyboard:** the paths in the table above
- **phone:** no sideways scroll, the dialog is a sheet, 44 px touch targets
- **console:** no errors

## Use it elsewhere

Copy this folder (and `packages/tokens` for the tests). Node >= 22.23.4 or a bundler that handles `.ts`. `npm test` and `npm run typecheck` run inside the copy.
