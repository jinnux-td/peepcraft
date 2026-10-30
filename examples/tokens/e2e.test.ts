// The generated token CSS in a real browser: modes, the system mode, nested themes, brands, a host override, and both shadcn
// bridges resolve where the docs say (docs/ui/tokens.md). Needs Chromium (npx playwright-core install chromium).
import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const T = join(import.meta.dirname, '../../packages/tokens/css/');
const css = (f: string) => readFileSync(T + f, 'utf8');
const page = async (scheme: 'light' | 'dark', styles: string, body: string, rootAttr = '') => {
  const p = await browser.newPage({ colorScheme: scheme });
  await p.setContent(`<html ${rootAttr}><head><style>${styles}</style></head><body>${body}</body></html>`);
  return p;
};
const get = (p: Page, sel: string, prop: string) => p.$eval(sel, (e: Element, n: string) => getComputedStyle(e).getPropertyValue(n).trim(), prop);
const browser = await chromium.launch();

test('kit tokens and to-shadcn: mode, system mode, nested theme, brand, host override', async () => {
  let p = await page('light', css('tokens.css') + css('to-shadcn.css'), '<i id=a></i><div data-theme=dark><i id=b></i></div><div data-brand=noir><i id=c></i><div data-theme=light><i id=d></i></div></div>');
  assert.equal(await get(p, '#a', '--k-page'), '#f6f5f1', 'light root --k-page');
  assert.equal(await get(p, '#b', '--background'), '#121211', 'nested dark --background (to-shadcn)');
  assert.equal(await get(p, '#c', '--primary'), '#f0a431', 'brand noir --primary');
  assert.equal(await get(p, '#c', '--k-radius-lg'), '14px', 'brand noir radius-lg');
  assert.equal(await get(p, '#d', '--k-page'), '#f6f5f1', 'light inside noir --k-page');
  assert.equal(await get(p, '#d', '--k-radius-lg'), '14px', 'light inside noir keeps brand radius');
  p = await page('dark', css('tokens.css'), '<i id=a></i>');
  assert.equal(await get(p, '#a', '--k-page'), '#121211', 'system dark, no attribute');
  assert.equal(await get(p, 'html', 'color-scheme'), 'dark', 'system dark color-scheme');
  p = await page('dark', css('tokens.css'), '<i id=a></i>', 'data-theme=light');
  assert.equal(await get(p, '#a', '--k-page'), '#f6f5f1', 'system dark, data-theme=light wins');
  p = await page('dark', css('tokens.css'), '<i id=a></i>', 'data-brand=sunny');
  assert.equal(await get(p, '#a', '--k-page'), '#fffbf0', 'system dark, brand sunny wins');
    // a plain host rule beats the :where() blocks
  p = await page('light', css('tokens.css') + ':root{--k-accent:#ff0000}', '<i id=a></i>');
  assert.equal(await get(p, '#a', '--k-accent'), '#ff0000', 'host :root override');
});

test('an existing shadcn app with from-shadcn: kit tokens follow its :root and .dark', async () => {
  const shad = ':root{--background:#fafafa;--card:#fff;--muted:#f4f4f5;--foreground:#09090b;--muted-foreground:#71717a;--border:#e4e4e7;--input:#e4e4e7;--primary:#18181b;--primary-foreground:#fafafa;--ring:#a1a1aa;--destructive:#e7000b;--radius:.625rem}.dark{--background:#09090b;--primary:#fafafa}';
  let p = await page('dark', shad + css('tokens.css') + css('from-shadcn.css'), '<i id=a></i>');
  assert.equal(await get(p, '#a', '--k-page'), '#fafafa', 'shadcn light app, system dark: --k-page follows shadcn');
  assert.equal(await get(p, 'html', 'color-scheme'), 'light', 'shadcn light app color-scheme');
  assert.equal(await get(p, '#a', '--k-radius-lg'), 'calc(.625rem + 6px)', 'shadcn radius-lg');
  p = await page('light', shad + css('tokens.css') + css('from-shadcn.css'), '<i id=a></i>', 'class=dark');
  assert.equal(await get(p, '#a', '--k-page'), '#09090b', 'shadcn .dark: --k-page');
  assert.equal(await get(p, '#a', '--k-accent'), '#fafafa', 'shadcn .dark: --k-accent');
});

test.after(() => browser.close());
