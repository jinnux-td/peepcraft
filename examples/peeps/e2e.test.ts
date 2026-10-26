// Browser test of the creator: a dice per tab, shuffle all, transparent background in the exports, theme button, undo, the panel layout, a phone.
// Needs Chromium (playwright-core finds the one Playwright installed).
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import type { Browser, Locator, Page } from 'playwright-core';
import { servePeeps } from './serve.ts';

execFileSync('node', [new URL('build.mjs', import.meta.url).pathname], { stdio: 'pipe' });
const server = await servePeeps(0);
const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/`;
const browser: Browser = await chromium.launch();
test.after(async () => { await browser.close(); server.close(); });

const errors: string[] = [];
async function open(width = 1440, height = 900): Promise<Page> {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text())); page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url);
  await page.locator('#full [data-testid=pc-stage] svg').waitFor();
  return page;
}
const TABS = ['Type', 'Body', 'Hair', 'Face', 'Facial hair', 'Accessories'];
/** What each tab has selected, read by opening each tab in turn. */
async function selection(full: Locator): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const t of TABS) {
    await full.getByRole('tab', { name: t, exact: true }).click();
    out[t] = (await full.locator('[role=radio][aria-checked=true] span:last-child').first().innerText()).trim();
  }
  return out;
}
test.afterEach(() => { assert.deepEqual(errors.splice(0), []); });

test('the dice of a tab changes that tab only; the toolbar one changes every tab', async () => {
  const page = await open(); const full = page.locator('#full');
  const before = await selection(full);
  await full.getByRole('tab', { name: 'Face', exact: true }).click();
  await full.getByRole('button', { name: 'Random face' }).click();
  const afterFace = await selection(full);
  assert.notEqual(afterFace.Face, before.Face);
  for (const t of TABS.filter((t) => t !== 'Face')) assert.equal(afterFace[t], before[t], `${t} must not change`);
  await full.getByRole('button', { name: 'Shuffle all' }).click();
  const all = await selection(full);
  for (const t of ['Body', 'Hair', 'Face', 'Facial hair', 'Accessories']) assert.notEqual(all[t], afterFace[t], `${t} must change`);
  assert.equal(all.Type, afterFace.Type);
  await page.close();
});

test('undo takes a dice back, redo returns it', async () => {
  const page = await open(); const full = page.locator('#full');
  await full.getByRole('tab', { name: 'Hair', exact: true }).click();
  const hair = async () => (await full.locator('[role=radio][aria-checked=true] span:last-child').first().innerText()).trim();
  const start = await hair();
  await full.getByRole('button', { name: 'Random hair' }).click();
  const rolled = await hair();
  assert.notEqual(rolled, start);
  await full.getByRole('button', { name: 'Undo' }).click(); assert.equal(await hair(), start);
  await full.getByRole('button', { name: 'Redo' }).click(); assert.equal(await hair(), rolled);
  await page.close();
});

test('a transparent background: checkerboard on the stage, no rectangle in the SVG, alpha in the PNG', async () => {
  const page = await open(); const full = page.locator('#full');
  assert.equal(await full.locator('rect[data-layer=background]').count(), 1);
  await full.getByRole('button', { name: 'Background: transparent' }).click();
  assert.equal(await full.locator('rect[data-layer=background]').count(), 0);
  assert.equal(await full.getByTestId('pc-stage').getAttribute('data-transparent'), 'true');

  const [svg] = await Promise.all([page.waitForEvent('download'), full.getByRole('button', { name: 'Save as SVG' }).click()]);
  const text = readFileSync((await svg.path())!, 'utf8');
  assert.match(text, /^<svg /); assert.doesNotMatch(text, /data-layer="background"/);

  const [png] = await Promise.all([page.waitForEvent('download'), full.getByRole('button', { name: 'Save as PNG' }).click()]);
  const b64 = readFileSync((await png.path())!).toString('base64');
  const corner = await page.evaluate(async (data) => {
    const img = new Image(); img.src = `data:image/png;base64,${data}`; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d')!; g.drawImage(img, 0, 0);
    return { size: img.width, corner: [...g.getImageData(2, 2, 1, 1).data] };
  }, b64);
  assert.equal(corner.size, 1024);
  assert.equal(corner.corner[3], 0, 'the corner of a transparent export is transparent');

  await full.getByRole('button', { name: 'Background #f7d56e' }).click();
  const [solid] = await Promise.all([page.waitForEvent('download'), full.getByRole('button', { name: 'Save as SVG' }).click()]);
  assert.match(readFileSync((await solid.path())!, 'utf8'), /fill="#f7d56e" data-layer="background"/);
  await page.close();
});

test('the theme button changes the theme of this creator, and the choice is kept', async () => {
  const page = await open(); const full = page.locator('#full .pc');
  await full.getByTestId('pc-theme-button').click();
  await page.getByRole('menuitemradio', { name: 'Noir' }).first().click();
  assert.equal(await full.getAttribute('data-pc-theme'), 'noir');
  assert.equal(await page.evaluate(() => localStorage.getItem('peeps-theme')), 'noir');
  await page.reload(); await page.locator('#full [data-testid=pc-stage] svg').waitFor();
  assert.equal(await page.locator('#full .pc').getAttribute('data-pc-theme'), 'noir');
  await page.close();
});

test('in a 560 px panel the creator stacks by its own width, the stage first', async () => {
  const page = await open(1440, 900);
  const stage = (await page.locator('#panel [data-testid=pc-stage]').boundingBox())!;
  const picker = (await page.locator('#panel [aria-label=Parts]').boundingBox())!;
  assert.ok(picker.y > stage.y + stage.height - 1, 'the picker sits below the stage');
  const wide = (await page.locator('#full [data-testid=pc-stage]').boundingBox())!;
  const widePicker = (await page.locator('#full [aria-label=Parts]').boundingBox())!;
  assert.ok(widePicker.x < wide.x, 'on a wide page the picker is on the left');
  await page.close();
});

test('a phone: no sideways scroll, the options are reachable', async () => {
  const page = await open(390, 844);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal scroll');
  await page.locator('#full').getByRole('tab', { name: 'Accessories', exact: true }).click();
  assert.ok(await page.locator('#full').getByRole('radio', { name: /Glasses/ }).first().isVisible());
  await page.close();
});
