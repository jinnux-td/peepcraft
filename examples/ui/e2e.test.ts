// Browser test of the UI gallery (examples/ui): in light, dark and every brand, the text measured on the rendered page passes WCAG
// contrast, every keyboard stop shows a focus ring that passes 3:1, and every control is at least 24 × 24 px (44 on touch for the
// main buttons); the keyboard paths of tabs, segmented control, menu, dialog and tooltip; toasts, field errors, busy buttons; a phone.
// Needs Chromium (playwright-core finds the one Playwright installed).
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';
import type { Browser, Page } from 'playwright-core';
import { serveUi } from './serve.ts';

execFileSync('node', [new URL('build.mjs', import.meta.url).pathname], { stdio: 'pipe' });
const server = await serveUi(0);
const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/`;
const browser: Browser = await chromium.launch();
test.after(async () => { await browser.close(); server.close(); });

const THEMES = ['light', 'dark', 'sunny', 'glass', 'noir', 'violet'];
const errors: string[] = [];
async function open(theme = 'light', o: { width?: number; height?: number; touch?: boolean } = {}): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: o.width ?? 1280, height: o.height ?? 900 }, hasTouch: o.touch, isMobile: o.touch, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text())); page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${url}?theme=${theme}`);
  await page.waitForFunction(() => (window as any).__ui);
  return page;
}

// Runs in the page: colour maths on computed styles. The background under an element is every background up its ancestors,
// composited over the page colour (--k-page; a gradient page-fill is checked through it, see @kit/tokens).
const HELPERS = `
window.__a = (() => {
  const probe = document.createElement('i'); document.body.append(probe);
  const rgba = (c) => {
    let m = /^rgba?\\(([^)]+)\\)/.exec(c);
    if (m) { const p = m[1].split(/[\\s,\\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; }
    m = /^color\\(srgb ([^)]+)\\)/.exec(c);
    if (m) { const p = m[1].split(/[\\s\\/]+/).filter(Boolean).map(Number); return [p[0] * 255, p[1] * 255, p[2] * 255, p[3] ?? 1]; }
    probe.style.color = c; const r = getComputedStyle(probe).color; probe.style.color = ''; return r === c ? null : rgba(r);
  };
  const over = (t, b) => [0, 1, 2].map((i) => t[i] * t[3] + b[i] * (1 - t[3])).concat(1);
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const page = () => rgba(getComputedStyle(document.documentElement).getPropertyValue('--k-page').trim());
  const bg = (el) => { const s = []; for (let e = el; e; e = e.parentElement) { const c = rgba(getComputedStyle(e).backgroundColor); if (c && c[3] > 0) { s.push(c); if (c[3] === 1) break; } } return s.reverse().reduce((b, c) => over(c, b), page()); };
  const opacity = (el) => { let o = 1; for (let e = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity); return o; };
  const name = (el) => el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).join('.') : '') + ' "' + (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24) + '"';
  // every visible run of text under root: [what, ratio, needed]; disabled controls (opacity < 1) are exempt in WCAG
  const text = (root) => {
    const out = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const el = n.parentElement;
      if (!n.textContent.trim() || !el || el.closest('[aria-hidden=true],script,style,option') || !el.checkVisibility({ visibilityProperty: true })) continue;
      const cs = getComputedStyle(el), fg = rgba(cs.color);
      if (!fg || fg[3] === 0 || opacity(el) < 1) continue;
      const size = parseFloat(cs.fontSize), large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
      const b = bg(el);
      out.push([name(el), Math.round(ratio(over(fg, b), b) * 100) / 100, large ? 3 : 4.5]);
    }
    return out;
  };
  // the focus ring of the focused element: drawn as an outline on it (or on its card)
  const ring = () => {
    const el = document.activeElement, host = el.classList.contains('k-card-link') ? el.closest('.k-card') : el, cs = getComputedStyle(host);
    if (cs.outlineStyle === 'none' || parseFloat(cs.outlineWidth) < 2) return [name(el), 0];
    const c = rgba(cs.outlineColor), inset = parseFloat(cs.outlineOffset) < 0, b = bg(inset ? host : host.parentElement);
    return [name(el), Math.round(ratio(over(c, b), b) * 100) / 100];
  };
  return { text, ring, name };
})();`;

for (const theme of THEMES) {
  test(`${theme}: rendered text passes contrast (page, open dialog, open menu, toasts, tooltip)`, async () => {
    const page = await open(theme);
    await page.addScriptTag({ content: HELPERS });
    const fails = (rows: [string, number, number][]) => rows.filter(([, r, need]) => r < need).map(([n, r, need]) => `${n}: ${r} < ${need}`);
    const main = await page.evaluate(() => (window as any).__a.text(document.body));
    assert.ok(main.length > 60, `measured ${main.length} runs of text`);
    assert.deepEqual(fails(main), [], 'page');
    await page.click('#toast-info'); await page.click('#toast-success'); await page.click('#toast-error');
    assert.deepEqual(fails(await page.evaluate(() => (window as any).__a.text(document.querySelector('.k-toasts')))), [], 'toasts');
    await page.focus('#menu-button'); await page.keyboard.press('ArrowDown');
    assert.deepEqual(fails(await page.evaluate(() => (window as any).__a.text(document.getElementById('menu')))), [], 'menu');
    await page.keyboard.press('Escape'); await page.keyboard.press('Tab'); // focus is back on the menu button; the next stop is Help
    assert.deepEqual(fails(await page.evaluate(() => (window as any).__a.text(document.querySelector('.k-tip')))), [], 'tooltip');
    await page.click('#open-dialog');
    assert.deepEqual(fails(await page.evaluate(() => (window as any).__a.text(document.getElementById('dialog')))), [], 'dialog');
    await page.context().close();
  });

  test(`${theme}: every keyboard stop shows a 2 px focus ring at 3:1, every control is at least 24 × 24 px`, async () => {
    const page = await open(theme);
    await page.addScriptTag({ content: HELPERS });
    const seen: [string, number][] = [];
    await page.keyboard.press('Tab');
    for (let i = 0; i < 80; i++) {
      if (await page.evaluate(() => document.activeElement === document.body)) break; // past the last stop
      const r = await page.evaluate(() => (window as any).__a.ring());
      if (seen.length && r[0] === seen[0][0]) break;
      seen.push(r); await page.keyboard.press('Tab');
    }
    assert.ok(seen.length > 35, `${seen.length} stops`);
    assert.deepEqual(seen.filter(([, c]) => c < 3).map(([n, c]) => `${n}: ${c}`), []);
    const small = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('button,a[href],input,select,textarea')].filter((el) => el.checkVisibility()).map((el) => {
      const box = (el.classList.contains('k-card-link') ? el.closest('.k-card')! : el.closest('.k-check') ?? el).getBoundingClientRect(); // the whole label, the whole card
      return [(window as any).__a.name(el), Math.round(box.width), Math.round(box.height)] as [string, number, number];
    }).filter(([, w, h]) => w < 24 || h < 24));
    assert.deepEqual(small, []);
    await page.context().close();
  });
}

test('tabs: arrows move and select, Home and End, only the selected panel shows', async () => {
  const page = await open();
  await page.focus('#t-overview'); await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 't-activity');
  assert.equal(await page.getAttribute('#t-activity', 'aria-selected'), 'true');
  assert.equal(await page.isVisible('#p-activity'), true); assert.equal(await page.isVisible('#p-overview'), false);
  await page.keyboard.press('End'); assert.equal(await page.evaluate(() => document.activeElement?.id), 't-settings');
  await page.keyboard.press('ArrowRight'); assert.equal(await page.evaluate(() => document.activeElement?.id), 't-overview', 'wraps');
  await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement?.id), 'p-overview', 'one tab stop, then the panel');
  await page.context().close();
});

test('segmented control: arrows pick and skip a disabled option; one tab stop; the theme control themes the page', async () => {
  const page = await open();
  const view = page.locator('#view [role=radio]');
  await view.nth(0).focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  assert.equal(await view.nth(3).getAttribute('aria-checked'), 'true', 'Month (disabled) skipped');
  assert.deepEqual(await view.evaluateAll((els) => els.map((e) => (e as HTMLElement).tabIndex)), [-1, -1, -1, 0]);
  await page.click('#theme [data-set-brand=noir]');
  assert.equal(await page.getAttribute('html', 'data-brand'), 'noir');
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), 'dark');
  await page.context().close();
});

test('menu: keyboard opens, moves, typeahead, Esc and picking hand focus back; outside click closes', async () => {
  const page = await open();
  const active = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.textContent?.trim());
  await page.focus('#menu-button'); await page.keyboard.press('Enter');
  assert.equal(await page.getAttribute('#menu-button', 'aria-expanded'), 'true');
  assert.equal(await page.evaluate(() => document.getElementById('menu')!.matches(':popover-open')), true);
  assert.equal(await active(), 'Copy');
  await page.keyboard.press('ArrowDown'); assert.equal(await active(), 'Cut');
  await page.keyboard.press('End'); assert.equal(await active(), 'Duplicate');
  await page.keyboard.press('ArrowDown'); assert.equal(await active(), 'Copy', 'wraps');
  await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp'); assert.equal(await active(), 'Paste', 'disabled Delete skipped');
  await page.keyboard.press('d'); assert.equal(await active(), 'Duplicate', 'typeahead skips the disabled Delete');
  await page.keyboard.press('Escape');
  assert.equal(await active(), 'menu-button'); assert.equal(await page.getAttribute('#menu-button', 'aria-expanded'), 'false');
  await page.keyboard.press('ArrowUp'); assert.equal(await active(), 'Duplicate', 'ArrowUp opens on the last item');
  await page.keyboard.press('ArrowUp'); await page.keyboard.press('Enter');
  assert.equal(await page.textContent('#picked'), 'Picked: Paste'); assert.equal(await active(), 'menu-button');
  await page.click('#menu-button'); await page.mouse.click(5, 300);
  assert.equal(await page.getAttribute('#menu-button', 'aria-expanded'), 'false');
  const [b, m] = await Promise.all([page.locator('#menu-button').boundingBox(), (async () => { await page.click('#menu-button'); return page.locator('#menu').boundingBox(); })()]);
  assert.ok(m!.y >= b!.y + b!.height, 'placed below its button');
  await page.context().close();
});

test('dialog: modal, named by its title, Esc and the backdrop close it, focus returns to the opener', async () => {
  const page = await open();
  await page.focus('#open-dialog'); await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => (document.getElementById('dialog') as HTMLDialogElement).open), true);
  assert.equal(await page.getByRole('dialog', { name: 'Delete project?' }).count(), 1);
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => (document.getElementById('dialog') as HTMLDialogElement).open), false);
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'open-dialog');
  await page.click('#open-dialog'); await page.mouse.click(5, 5);
  assert.equal(await page.evaluate(() => (document.getElementById('dialog') as HTMLDialogElement).open), false, 'backdrop click');
  await page.context().close();
});

test('tooltip on keyboard focus, described-by, Esc hides; toasts in a polite region; field error linked; busy keeps the width', async () => {
  const page = await open();
  await page.focus('#open-dialog'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'help');
  assert.equal(await page.getByRole('tooltip').isVisible(), true);
  assert.equal(await page.getByRole('button', { name: 'Help' }).getAttribute('aria-describedby') !== null, true);
  assert.equal(await page.evaluate(() => document.getElementById(document.getElementById('help')!.getAttribute('aria-describedby')!)?.textContent), 'Shortcuts and documentation');
  await page.keyboard.press('Escape'); assert.equal(await page.getByRole('tooltip').isVisible(), false);
  await page.click('#toast-success');
  assert.equal(await page.getByRole('status').filter({ hasText: 'Payment sent.' }).count(), 1);
  assert.equal(await page.getAttribute('.k-toasts', 'aria-live'), 'polite');
  await page.click('.k-toast [aria-label=Dismiss]'); assert.equal(await page.locator('.k-toast').count(), 0);
  assert.equal(await page.getAttribute('#f-email', 'aria-invalid'), 'true');
  assert.equal(await page.evaluate(() => document.getElementById(document.getElementById('f-email')!.getAttribute('aria-describedby')!)?.textContent), 'Enter an email address, like name@example.com.');
  const before = await page.locator('#busy').boundingBox();
  await page.click('#busy');
  assert.equal(await page.getAttribute('#busy', 'aria-busy'), 'true');
  assert.equal((await page.locator('#busy').boundingBox())!.width, before!.width);
  await page.context().close();
});

test('phone: no sideways scroll, the dialog is a bottom sheet, main buttons are 44 px on touch', async () => {
  const page = await open('dark', { width: 390, height: 844, touch: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const short = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.k-btn:not([data-size=sm])')].filter((b) => b.checkVisibility()).map((b) => b.getBoundingClientRect().height).filter((h) => h < 44));
  assert.deepEqual(short, []);
  await page.click('#open-dialog');
  const box = (await page.locator('#dialog').boundingBox())!;
  assert.equal(Math.round(box.y + box.height), 844); assert.equal(Math.round(box.width), 390);
  await page.context().close();
});

test('no console errors', () => assert.deepEqual(errors, []));
