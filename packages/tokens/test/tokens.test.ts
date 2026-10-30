import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BRANDS, COLOR_ROLES, MODES, SCALES, TOKEN_NAMES, brandColors, unknownTokens, type Colors } from '../src/tokens.ts';
import { OUTPUTS, SHADCN, tokensCss, tailwindCss, toShadcnCss, fromShadcnCss, tokensJson } from '../src/build.ts';
import { contrast, over, parseHex } from '../src/color.ts';

const sets: [string, Colors][] = [
  ['light', MODES.light], ['dark', MODES.dark],
  ...Object.entries(BRANDS).map(([n, b]) => [`brand ${n}`, brandColors(b)] as [string, Colors]),
];

// docs/ui/tokens.md "Checks" and docs/ui/rules.md 7. A translucent colour is measured over what it sits on.
// [foreground, background, minimum]; a background other than page sits on page.
const PAIRS: [string, string, number][] = [
  ['text', 'page', 4.5], ['text', 'surface', 4.5], ['text', 'surface-2', 4.5],
  ['muted', 'page', 4.5], ['muted', 'surface', 4.5], ['muted', 'surface-2', 4.5],
  ['text', 'popover', 4.5], ['muted', 'popover', 4.5], ['focus', 'popover', 3],
  ['on-accent', 'accent', 4.5], ['on-danger', 'danger', 4.5],
  ['focus', 'page', 3], ['focus', 'surface', 3],
  ['line-strong', 'page', 3], ['line-strong', 'surface', 3],
  ['danger', 'page', 4.5], ['danger', 'surface', 4.5], // error messages are text
  // translucent surfaces lighten or darken as they nest: a card in a section, a control's track inside a card in a section
  ['text', 'surface>surface', 4.5], ['muted', 'surface>surface', 4.5],
  ['text', 'surface>surface>surface', 4.5], ['text', 'surface>surface-2>surface', 4.5], ['muted', 'surface>surface-2', 4.5], ['muted', 'surface>surface>surface-2', 4.5],
  ['text', 'popover>surface-2>surface', 4.5], ['danger', 'surface>surface', 4.5],
  ['success', 'page', 3], ['warning', 'page', 3],
];

for (const [name, c] of sets) {
  test(`contrast: ${name}`, () => {
    // `on` is one role, or layers from the outside in ("surface>surface-2": a surface-2 inset inside a surface), all on the page
    const bg = (on: string) => [...on.split('>').filter((r) => r !== 'page').reverse().map((r) => c[r as keyof Colors]), c.page];
    for (const [fg, on, min] of PAIRS) {
      const back = bg(on), ratio = contrast(over(c[fg as keyof Colors], ...back), over(back[0], ...back.slice(1)));
      assert.ok(ratio >= min, `${name}: ${fg} on ${on} is ${ratio.toFixed(2)}, needs ${min}`);
    }
  });
}

test('popover is opaque in every set', () => {
  for (const [name, c] of sets) assert.equal(parseHex(c.popover)[3], 1, name);
});

test('every set has every role, and every colour but a gradient page-fill is a hex colour', () => {
  for (const [name, c] of sets) for (const r of COLOR_ROLES) {
    assert.ok(c[r], `${name}: ${r}`);
    if (!(r === 'page-fill' && /gradient\(/.test(c[r]))) assert.doesNotThrow(() => parseHex(c[r]), `${name}: ${r} = ${c[r]}`);
  }
});

test('a brand with a solid page-fill keeps page and page-fill the same; a gradient includes its page stop', () => {
  for (const [name, c] of sets) {
    if (c['page-fill'].startsWith('#')) assert.equal(c['page-fill'], c.page, name);
    else assert.ok(c['page-fill'].includes(c.page), `${name}: page ${c.page} is a stop of ${c['page-fill']}`);
  }
});

test('the names: roles and scales, unique, and the spacing steps are N × 4 px', () => {
  assert.equal(new Set(TOKEN_NAMES).size, TOKEN_NAMES.length);
  for (const [k, v] of Object.entries(SCALES)) {
    const m = /^space-(\d+)$/.exec(k);
    if (m) assert.equal(v, `${Number(m[1]) * 4}px`, k);
  }
  for (const b of Object.values(BRANDS)) for (const k of Object.keys(b.scales ?? {})) assert.ok(k in SCALES, k);
});

const declared = (css: string) => new Set([...css.matchAll(/(--k-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
const read = (css: string) => new Set([...css.matchAll(/var\((--k-[a-z0-9-]+)\)/g)].map((m) => m[1]));
const NAMES = new Set(TOKEN_NAMES.map((n) => `--k-${n}`));

test('tokens.css declares exactly the names on the list, and the bridges read or write only those', () => {
  assert.deepEqual([...declared(tokensCss())].sort(), [...NAMES].sort());
  for (const css of [tailwindCss(), toShadcnCss()]) for (const n of read(css)) assert.ok(NAMES.has(n), n);
  for (const n of declared(fromShadcnCss())) assert.ok(NAMES.has(n), n);
});

test('tokens.css: each mode and brand block sets every colour role and its color-scheme', () => {
  const css = tokensCss();
  const blocks = [...css.matchAll(/(:where\([^{]+\))\s*\{([^}]*)\}/g)].filter(([, , body]) => body.includes('--k-page:'));
  assert.equal(blocks.length, 3 + Object.keys(BRANDS).length); // light, system dark, explicit dark, brands
  for (const [, sel, body] of blocks) {
    assert.match(body, /color-scheme: (light|dark);/, sel);
    for (const r of COLOR_ROLES) assert.ok(body.includes(`--k-${r}:`), `${sel} ${r}`);
  }
  assert.match(css, /@media \(prefers-color-scheme: dark\) \{\n  :where\(:root:not\(\[data-theme=light\]\)\)/);
  for (const name of Object.keys(BRANDS)) assert.ok(css.includes(`:where([data-brand=${name}])`), name);
});

test('the shadcn bridges go both ways over the same names and are redeclared where a theme changes', () => {
  const to = toShadcnCss(), from = fromShadcnCss();
  for (const [s] of SHADCN) assert.ok(to.includes(`--${s}: var(--k-`), s);
  assert.ok(to.includes(':where(:root, [data-theme], [data-brand])'));
  assert.ok(from.includes(':where(:root, .dark, [data-theme], [data-brand])'));
  for (const s of ['background', 'foreground', 'card', 'muted', 'muted-foreground', 'border', 'input', 'primary', 'primary-foreground', 'ring', 'destructive', 'radius'])
    assert.ok(from.includes(`var(--${s})`), s);
  // the two files must never be loaded together: each maps the other's names, which is a cycle
  assert.ok(to.includes('never together with from-shadcn.css') && from.includes('never together with to-shadcn.css'));
});

test('tailwind.css: v4 theme blocks, tablet/desktop/wide breakpoints, spacing on the 4 px step', () => {
  const css = tailwindCss();
  assert.match(css, /@theme \{\n  --breakpoint-\*: initial;\n  --breakpoint-tablet: 768px;\n  --breakpoint-desktop: 1024px;\n  --breakpoint-wide: 1440px;\n\}/);
  assert.ok(css.includes('@theme inline {'));
  assert.ok(css.includes('--spacing: var(--k-space-1);'));
  for (const r of COLOR_ROLES.filter((r) => r !== 'page-fill')) assert.ok(css.includes(`--color-${r}: var(--k-${r});`), r);
});

test('tokens.json parses and holds every set', () => {
  const json = JSON.parse(tokensJson());
  for (const k of ['scale', 'light', 'dark', ...Object.keys(BRANDS).map((b) => `brand/${b}`)]) assert.ok(json[k], k);
  assert.equal(json.light.page.$value, MODES.light.page);
  assert.equal(json.light.page.$type, 'color');
});

test('the generated files on disk are up to date (run npm run build)', () => {
  for (const [path, make] of Object.entries(OUTPUTS)) assert.equal(readFileSync(join(import.meta.dirname, '..', path), 'utf8'), make(), path);
});

test('CSS braces balance (a broken rule would swallow the rest)', () => {
  for (const css of [tokensCss(), tailwindCss(), toShadcnCss(), fromShadcnCss()]) assert.equal(css.split('{').length, css.split('}').length);
});

test('unknownTokens names what is not on the list, once each, and ignores other prefixes', () => {
  assert.deepEqual(unknownTokens('a{color:var(--k-text);--k-tetx:1;b:var(--k-tetx);--kh-line:var(--k-line,#000);--kf-x:1}'), ['tetx']);
  assert.deepEqual(unknownTokens(tokensCss()), []);
});
