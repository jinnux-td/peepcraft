// Rule 4 of ~/services/docs/ui/rules.md: no raw colour in a package's stylesheet outside @kit/tokens. Every stylesheet a package injects
// (a template string assigned to a name with "css" in it) is found here, not listed, so a new package or a new rule is checked too.
// Allowed: a colour as the last fallback of var(--token, …) (a package still draws alone, phase 2), and the exceptions below, each with
// its reason. Colours of artwork and data (a heat map's ramp, a map's basemap, the peeps' ink) live outside stylesheets and are not checked.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(import.meta.dirname, '..');
const RAW = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\([^)]*\)|(?<![\w-])(?:white|black)(?![\w-])/gi;

// [file, what may stay, why]
const EXCEPTIONS: [string, RegExp, string][] = [
  ['packages/folio/src/css.ts', /rgb\(0 0 0\/[^)]*\)\)?/g, 'the scrim and text shadow over a photo: black behind white text, the same in every theme'],
  ['packages/peeps-creator/src/styles.ts', /repeating-conic-gradient\(#d4d4d4 0 25%,#fff 0 50%\)/g, 'the checkerboard that shows a transparent background, as image editors draw it'],
  ['packages/peeps-creator/src/styles.ts', /\.pc-swatch\.pc-clear\{[^}]*\}/g, 'the "no colour" swatch: a red slash on the checkerboard'],
  ['packages/peeps-creator/src/styles.ts', /\.pc-selected\{[^}]*\}|\.pc-member-x[^{]*\{[^}]*\}|\.pc-remove[^{]*\{[^}]*\}|\.pc-handle[^{]*\{[^}]*\}/g,
    'controls drawn on the artwork (selection, remove, resize): black and white with a red hover, to read against any drawing'],
];

function stylesheets(): { file: string; css: string }[] {
  const out: { file: string; css: string }[] = [];
  const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
  // Folders only: macOS leaves a .DS_Store beside them.
  for (const pkg of readdirSync(join(root, 'packages'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)) {
    if (pkg === 'tokens') continue;
    for (const path of walk(join(root, 'packages', pkg, 'src'))) {
      if (!/\.tsx?$/.test(path) || /\/(atoms|figures)\//.test(path)) continue;
      const src = readFileSync(path, 'utf8');
      for (const m of src.matchAll(/(?:const|let)\s+\w*css\w*\s*(?::[^=]+)?=\s*`/gi)) {
        let i = m.index! + m[0].length, end = i;
        while (end < src.length && !(src[end] === '`' && src[end - 1] !== '\\')) end++;
        out.push({ file: relative(root, path), css: src.slice(i, end) });
      }
    }
  }
  return out;
}

// The fallback part of every var(--name, …), with nested parentheses: there a raw colour is allowed.
function withoutFallbacks(css: string): string {
  let out = '', i = 0;
  while (i < css.length) {
    const m = /var\(--[\w-]+\s*,/.exec(css.slice(i));
    if (!m) { out += css.slice(i); break; }
    const start = i + m.index + m[0].length;
    out += css.slice(i, start);
    let depth = 1, j = start;
    while (j < css.length && depth) { if (css[j] === '(') depth++; else if (css[j] === ')') depth--; j++; }
    out += ')'; i = j;
  }
  return out;
}

test('the guard itself: a raw colour is caught, a fallback inside var() is allowed', () => {
  const caught = (css: string) => [...withoutFallbacks(css).matchAll(RAW)].map((m) => m[0]);
  assert.deepEqual(caught('a{color:#123;background:rgb(0 0 0/.5);border-color:white}'), ['#123', 'rgb(0 0 0/.5)', 'white']);
  assert.deepEqual(caught('a{color:var(--kh-text,var(--k-text,#dbe7f2));box-shadow:var(--k-shadow-lg,0 6px 20px #0004)}'), []);
  assert.deepEqual(caught('a{color:var(--k-text);outline-color:#f00}'), ['#f00']);
});

test('every package stylesheet is found (the guard checks something)', () => {
  const files = new Set(stylesheets().map((s) => s.file));
  for (const f of ['packages/ui/src/css.ts', 'packages/shell/src/css.ts', 'packages/folio/src/css.ts', 'packages/heatmap/src/css.ts', 'packages/panel/src/css.ts',
    'packages/data-layer/src/panel/css.ts', 'packages/peeps-creator/src/styles.ts', 'packages/map-view/src/view.ts', 'packages/worldmap/src/renderer.ts'])
    assert.ok(files.has(f), f);
});

test('no raw colour in a package stylesheet outside the tokens (rule 4)', () => {
  const found: string[] = [];
  for (const { file, css } of stylesheets()) {
    let rest = withoutFallbacks(css);
    for (const [f, allowed] of EXCEPTIONS) if (f === file) rest = rest.replace(allowed, '');
    for (const m of rest.matchAll(RAW)) found.push(`${file}: ${m[0]}  …${rest.slice(Math.max(0, m.index! - 40), m.index!).replace(/\s+/g, ' ')}`);
  }
  assert.deepEqual(found, [], 'use a --k-* token (or add the case to EXCEPTIONS with its reason)');
});

test('each exception still matches something (a stale one is removed)', () => {
  const all = stylesheets();
  for (const [file, allowed, why] of EXCEPTIONS) assert.ok(all.some((s) => s.file === file && new RegExp(allowed.source).test(withoutFallbacks(s.css))), `${file}: ${why}`);
});
