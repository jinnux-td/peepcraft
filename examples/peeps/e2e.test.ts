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

test('whole figures from Transhumans: pick one, roll another, export it, go back to the peep builder', async () => {
  const page = await open(); const full = page.locator('#full');
  await full.getByRole('tab', { name: 'Figures', exact: true }).click();
  assert.equal(await full.getByRole('radiogroup', { name: 'Figures' }).getByRole('radio').count(), 39, 'the peep tile and 38 figures');
  await full.getByRole('radio', { name: 'Runner', exact: true }).click();
  assert.equal(await full.locator('[data-testid=pc-stage] [data-figure=runner]').count(), 1);
  assert.equal(await full.locator('[data-testid=pc-stage] [data-slot]').count(), 0, 'no peep parts under a figure');

  await full.getByRole('button', { name: 'Random figures' }).click();
  assert.equal(await full.locator('[data-testid=pc-stage] [data-figure=runner]').count(), 0, 'the dice picked another figure');
  assert.equal(await full.locator('[data-testid=pc-stage] [data-figure]').count(), 1);

  await full.getByRole('tab', { name: 'Hair', exact: true }).click();
  assert.ok(await full.getByRole('button', { name: 'Random hair' }).isDisabled(), 'no parts to roll on a figure');
  const [svg] = await Promise.all([page.waitForEvent('download'), full.getByRole('button', { name: 'Save as SVG' }).click()]);
  const text = readFileSync((await svg.path())!, 'utf8');
  assert.match(text, /data-figure="/); assert.doesNotMatch(text, /data-slot=/);

  await full.getByRole('button', { name: 'Back to the peep builder' }).click();
  assert.equal(await full.locator('[data-testid=pc-stage] [data-figure]').count(), 0);
  assert.equal(await full.locator('[data-testid=pc-stage] [data-slot]').count(), 6, 'body, head, face, facial hair, mask, accessories');
  await full.getByRole('button', { name: 'Undo' }).click();
  assert.equal(await full.locator('[data-testid=pc-stage] [data-figure]').count(), 1, 'undo puts the figure back');
  await page.close();
});

test('a scene: add a peep and a figure, pick one on the stage, flip, reorder, remove, export the whole scene', async () => {
  const page = await open(); const full = page.locator('#full');
  const stage = full.getByTestId('pc-stage');
  await full.getByRole('tab', { name: 'Scene', exact: true }).click();
  assert.equal(await stage.getAttribute('data-view'), 'scene');
  assert.equal(await stage.locator('[data-item]').count(), 0);
  assert.ok(await full.getByRole('button', { name: 'Shuffle all' }).isDisabled(), 'shuffle acts on the builder, not the scene');
  await full.getByRole('button', { name: 'Add', exact: true }).click();

  await full.getByRole('tab', { name: 'Figures', exact: true }).click();
  await full.getByRole('radio', { name: 'Runner', exact: true }).click();
  await full.getByRole('tab', { name: 'Scene', exact: true }).click();
  await full.getByRole('button', { name: 'Add', exact: true }).click();
  assert.equal(await stage.locator('[data-item]').count(), 2);
  assert.equal(await stage.locator('[data-selected="1"]').count(), 1, 'the new member is picked');

  await stage.locator('[data-item="0"] [data-slot=body]').click();
  assert.equal(await stage.locator('[data-selected="0"]').count(), 1, 'a click on the stage picks that member');
  await page.keyboard.press('f');
  assert.match((await stage.locator('[data-item="0"]').getAttribute('transform'))!, /scale\(-/);
  // Boxes relative to the stage: a click on the toolbar can scroll the page.
  const at = async () => { const [m, st] = [(await stage.locator('[data-item="0"]').boundingBox())!, (await stage.boundingBox())!]; return { x: m.x - st.x, y: m.y - st.y, cx: m.x + m.width / 2, cy: m.y + m.height / 2 } };
  const before = await at();
  await page.mouse.move(before.cx, before.cy);
  await page.mouse.down(); await page.mouse.move(before.cx + 80, before.cy - 60, { steps: 5 }); await page.mouse.up();
  const after = await at();
  assert.ok(Math.abs(after.x - before.x - 80) < 3 && Math.abs(after.y - before.y + 60) < 3, `dragged across and up (${after.x - before.x}, ${after.y - before.y})`);
  await full.getByRole('button', { name: 'Undo' }).click();
  const back = await at();
  assert.ok(Math.abs(back.x - before.x) < 1 && Math.abs(back.y - before.y) < 1, 'one undo takes the whole drag back');
  await full.getByRole('button', { name: 'Front', exact: true }).click();
  assert.equal(await stage.locator('[data-item="1"] [data-slot]').count(), 6, 'the peep is now drawn last');

  const [svg] = await Promise.all([page.waitForEvent('download'), full.getByRole('button', { name: 'Save as SVG' }).click()]);
  assert.equal(svg.suggestedFilename(), 'scene.svg');
  const text = readFileSync((await svg.path())!, 'utf8');
  assert.equal([...text.matchAll(/data-item=/g)].length, 2); assert.doesNotMatch(text, /data-selected/);

  await full.getByRole('button', { name: 'Remove', exact: true }).click();
  assert.equal(await stage.locator('[data-item]').count(), 1);
  await full.getByRole('button', { name: 'Undo' }).click();
  assert.equal(await stage.locator('[data-item]').count(), 2, 'undo brings the member back');
  await stage.locator('[data-item="1"] [data-slot=body]').click();
  await stage.locator('[data-remove]').click();
  assert.equal(await stage.locator('[data-item]').count(), 1, 'the × at the corner of the picked member removes it');
  assert.equal(await stage.locator('[data-remove]').count(), 0, 'and nothing is picked');
  await full.getByRole('button', { name: 'Undo' }).click();
  assert.equal(await stage.locator('[data-item]').count(), 2);
  await full.getByRole('tab', { name: 'Hair', exact: true }).click();
  assert.equal(await stage.getAttribute('data-view'), null, 'other tabs show the builder again');
  await page.close();
});

test('things and uploads: add a table and a mug on it, upload a picture, keep it after a reload, delete it from the browser', async () => {
  const page = await open(); const full = page.locator('#full');
  const stage = full.getByTestId('pc-stage');
  await full.getByRole('tab', { name: 'Scene', exact: true }).click();
  await full.locator('[aria-label=Things]').getByRole('button', { name: 'Add table' }).click();
  await full.locator('[aria-label=Things]').getByRole('button', { name: 'Add mug' }).click();
  assert.equal(await stage.locator('[data-item]').count(), 2);
  const lift = full.getByRole('group', { name: 'Member 2' }).getByRole('slider').nth(2);
  await lift.fill('25');
  const [table, mug] = [await stage.locator('[data-item="0"]').boundingBox(), await stage.locator('[data-item="1"]').boundingBox()];
  assert.ok(mug!.y + mug!.height < table!.y + table!.height - 20, 'the lifted mug is above the floor');

  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4nGP4z8DwH4QZYAwAR8oH+Rq28akAAAAASUVORK5CYII=', 'base64');
  await full.getByLabel('Upload a picture').setInputFiles([{ name: 'logo.png', mimeType: 'image/png', buffer: png }, { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') }]);
  await full.getByRole('button', { name: 'Add logo' }).waitFor();
  assert.match(await full.locator('.pc-note[role=status]').innerText(), /"notes.txt" is not a PNG/);
  await full.getByRole('button', { name: 'Add logo' }).click();
  assert.equal(await stage.locator('image[data-upload]').count(), 1);

  const [svg] = await Promise.all([page.waitForEvent('download'), full.getByRole('button', { name: 'Save as SVG' }).click()]);
  assert.match(readFileSync((await svg.path())!, 'utf8'), /<image href="data:image\/png;base64,/);
  const [pngOut] = await Promise.all([page.waitForEvent('download'), full.getByRole('button', { name: 'Save as PNG' }).click()]);
  assert.ok(readFileSync((await pngOut.path())!).length > 1000, 'the PNG export draws with an upload in it');

  await page.reload(); await page.locator('#full [data-testid=pc-stage] svg').waitFor();
  await full.getByRole('tab', { name: 'Scene', exact: true }).click();
  await full.getByRole('button', { name: 'Add logo' }).click();
  assert.equal(await stage.locator('image[data-upload]').count(), 1, 'the upload is still in this browser after a reload');
  await full.getByRole('button', { name: 'Delete logo' }).click();
  assert.equal(await full.getByRole('button', { name: 'Add logo' }).count(), 0);
  assert.equal(await stage.locator('image[data-upload]').count(), 0, 'its members go with it');
  // The delete is written to IndexedDB in the background; wait for it before reloading.
  await page.waitForFunction(() => new Promise((done) => { const r = indexedDB.open('kit-peeps-creator'); r.onsuccess = () => { const q = r.result.transaction('uploads').objectStore('uploads').count(); q.onsuccess = () => { r.result.close(); done(q.result === 0) } } }));
  await page.reload(); await page.locator('#full [data-testid=pc-stage] svg').waitFor();
  await full.getByRole('tab', { name: 'Scene', exact: true }).click();
  assert.equal(await full.getByRole('button', { name: 'Add logo' }).count(), 0, 'and it is gone from the browser');

  for (const t of ['chair', 'stool', 'sofa', 'desk', 'rug', 'cat', 'dog', 'ball', 'phone', 'books', 'laptop', 'bookshelf']) await full.locator('[aria-label=Things]').getByRole('button', { name: `Add ${t}`, exact: true }).click();
  const list = await full.locator('[aria-label=Scene]').evaluate((el) => ({ shown: el.clientHeight, all: el.scrollHeight }));
  assert.ok(list.all > list.shown, `a long member list scrolls (${list.shown} of ${list.all})`);
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(50);
  const side = (await full.locator('.pc-side').boundingBox())!;
  assert.ok(side.y >= 0 && side.y + side.height <= 900 + 1, `the side panel with the members fits the window (${side.y} + ${side.height})`);
  const things = await full.locator('[aria-label=Things]').evaluate((el) => ({ shown: el.clientHeight, all: el.scrollHeight }));
  assert.ok(things.shown <= 330 && things.all > things.shown, `the things scroll (${things.shown} of ${things.all})`);
  await page.close();
});

test('a short window: the side panel of the scene fits, with nothing cut off inside it', async () => {
  const page = await open(1280, 720); const full = page.locator('#full');
  await full.getByRole('tab', { name: 'Scene', exact: true }).click();
  for (let i = 0; i < 12; i++) await full.getByRole('button', { name: 'Add', exact: true }).click();
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(50);
  const fit = await full.locator('.pc-side').evaluate((el) => ({ bottom: el.getBoundingClientRect().bottom, inner: innerHeight, all: el.scrollHeight, shown: el.clientHeight }));
  assert.ok(fit.bottom + 16 <= fit.inner + 1, `the panel and the creator's edge are in view (${fit.bottom} of ${fit.inner})`);
  assert.ok(fit.all <= fit.shown + 1, `the panel itself does not scroll; the list does (${fit.all} > ${fit.shown})`);
  assert.ok(await full.getByRole('button', { name: 'Save as PNG' }).isVisible());
  await page.close();
});

test('scene colours: the leaves and the pot of a plant apart, and the own lines of a peep', async () => {
  const page = await open(); const full = page.locator('#full'); const stage = full.getByTestId('pc-stage');
  await full.getByRole('tab', { name: 'Scene', exact: true }).click();
  await full.locator('[aria-label=Things]').getByRole('button', { name: 'Add potted plant', exact: true }).click();
  const roles = full.getByRole('radiogroup', { name: 'Colour of' });
  assert.deepEqual(await roles.getByRole('radio').allInnerTexts(), ['Lines', 'Fill', 'Leaves']);
  await roles.getByRole('radio', { name: 'Leaves' }).click();
  await full.getByRole('button', { name: 'Leaves #2d6a4f' }).click();
  await roles.getByRole('radio', { name: 'Fill' }).click();
  await full.getByRole('button', { name: 'Fill #fde9d0' }).click();
  assert.equal(await stage.locator('[data-part=leaves][fill="#2d6a4f"]').count(), 7);
  assert.ok(await stage.locator('[data-item="0"] path[fill="#fde9d0"]').count() > 0, 'the pot takes the fill');

  await full.getByRole('button', { name: 'Add', exact: true }).click();
  assert.deepEqual(await roles.getByRole('radio').allInnerTexts(), ['Skin', 'Bandana', 'Top', 'Face', 'Accessories', 'Lines'], 'a peep has its parts, and the pieces its head and outfit have');
  await roles.getByRole('radio', { name: 'Lines' }).click();
  await full.getByRole('button', { name: 'Lines #1d3557' }).click();
  assert.ok(await stage.locator('[data-item="1"] [fill="#1d3557"]').count() > 0);
  assert.equal(await stage.locator('[data-part=leaves][fill="#2d6a4f"]').count(), 7, 'the plant keeps its colours');
  await page.close();
});

test('scene frame: 16:9 widens the stage and the PNG, zoom closes in, the corner handle resizes the picked member', async () => {
  const page = await open(); const full = page.locator('#full'); const stage = full.getByTestId('pc-stage');
  await full.getByRole('tab', { name: 'Scene', exact: true }).click();
  await full.locator('[aria-label=Things]').getByRole('button', { name: 'Add table', exact: true }).click();
  await full.getByRole('radiogroup', { name: 'Ratio' }).getByRole('radio', { name: '16:9' }).click();
  const box = (await stage.boundingBox())!;
  assert.ok(Math.abs(box.width / box.height - 16 / 9) < 0.02, `the stage is 16:9 (${box.width} x ${box.height})`);

  assert.equal(await stage.locator('[data-handle]').count(), 4, 'a handle at each corner');
  const handle = stage.locator('[data-handle][data-corner="1,1"]');
  const before = (await stage.locator('[data-item="0"]').boundingBox())!;
  const h = (await handle.boundingBox())!;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down(); await page.mouse.move(h.x + h.width / 2 + before.width / 2, h.y + h.height / 2, { steps: 5 }); await page.mouse.up();
  const after = (await stage.locator('[data-item="0"]').boundingBox())!;
  assert.ok(Math.abs(after.width / before.width - 1.5) < 0.03, `half again as wide (${after.width / before.width})`);
  assert.ok(Math.abs(after.x - before.x) < 2 && Math.abs(after.y - before.y) < 2, 'the top-left corner stays');

  const zoom = full.locator('.pc-frame input[type=range]');
  await zoom.fill('2');
  const near = (await stage.locator('[data-item="0"]').boundingBox())!;
  assert.ok(Math.abs(near.width / after.width - 2) < 0.03, 'zoom 2 shows it twice as big');

  const [png] = await Promise.all([page.waitForEvent('download'), full.getByRole('button', { name: 'Save as PNG' }).click()]);
  const b64 = readFileSync((await png.path())!).toString('base64');
  const size = await page.evaluate(async (data) => { const img = new Image(); img.src = `data:image/png;base64,${data}`; await img.decode(); return [img.width, img.height]; }, b64);
  assert.deepEqual(size, [1024, 576]);

  await full.getByRole('radiogroup', { name: 'PNG size' }).getByRole('radio', { name: '2×' }).click();
  const [png2] = await Promise.all([page.waitForEvent('download'), full.getByRole('button', { name: 'Save as PNG' }).click()]);
  const b642 = readFileSync((await png2.path())!).toString('base64');
  assert.deepEqual(await page.evaluate(async (data) => { const img = new Image(); img.src = `data:image/png;base64,${data}`; await img.decode(); return [img.width, img.height]; }, b642), [2048, 1152]);
  await page.close();
});

test('numbers: a slider drags onto 1×, a typed number is kept in range, the reset icon goes back to the default', async () => {
  const page = await open(); const full = page.locator('#full');
  await full.getByRole('tab', { name: 'Scene', exact: true }).click();
  await full.getByRole('button', { name: 'Add', exact: true }).click();
  const zoom = full.locator('.pc-frame input[type=range]'), zoomBox = full.getByLabel('Zoom value');
  await zoomBox.fill('0.5'); await zoomBox.blur();
  const r = (await zoom.boundingBox())!, seen = new Set<string>();
  await page.mouse.move(r.x + 2, r.y + r.height / 2); await page.mouse.down();
  for (let i = 0; i <= 80; i++) { await page.mouse.move(r.x + 2 + ((r.width - 4) * i) / 80, r.y + r.height / 2); seen.add(await zoom.inputValue()); }
  await page.mouse.up();
  assert.ok(seen.has('1'), `the drag passes through 1 (${[...seen].join(' ')})`);

  await zoomBox.fill('1.5'); await zoomBox.blur();
  assert.equal(await zoom.inputValue(), '1.5');
  await zoomBox.fill('9'); await zoomBox.blur();
  assert.equal(await zoomBox.inputValue(), '2', 'kept in range');
  await full.getByRole('button', { name: 'Reset zoom' }).click();
  assert.equal(await zoom.inputValue(), '1');
  assert.ok(await full.getByRole('button', { name: 'Reset zoom' }).isDisabled(), 'nothing to reset at the default');

  const pos = full.getByLabel('Position value');
  await pos.fill('25'); await pos.blur();
  const at = await full.getByTestId('pc-stage').locator('[data-item="0"]').getAttribute('transform');
  await full.getByRole('button', { name: 'Reset position' }).click();
  assert.notEqual(await full.getByTestId('pc-stage').locator('[data-item="0"]').getAttribute('transform'), at);
  assert.equal(await pos.inputValue(), '50');
  await page.close();
});

test('more colours: the full set, the colours already in the picture, and a typed name or hex', async () => {
  const page = await open(); const full = page.locator('#full'); const stage = full.getByTestId('pc-stage');
  await full.getByRole('button', { name: 'Background: more colours' }).click();
  assert.equal(await full.getByRole('group', { name: 'Background: default colours' }).getByRole('button').count(), 28);
  assert.ok(await full.getByRole('group', { name: 'Background: in this design' }).getByRole('button', { name: 'Background #f7d56e' }).isVisible());
  await full.getByRole('group', { name: 'Background: default colours' }).getByRole('button', { name: 'Background #5271ff' }).click();
  assert.equal(await stage.locator('rect[data-layer=background]').getAttribute('fill'), '#5271ff');
  await full.getByLabel('Background: colour name or hex').fill('tomato');
  assert.equal(await stage.locator('rect[data-layer=background]').getAttribute('fill'), '#ff6347');
  await full.getByLabel('Background: colour name or hex').fill('#0cf');
  assert.equal(await stage.locator('rect[data-layer=background]').getAttribute('fill'), '#00ccff');
  await full.getByLabel('Background: colour name or hex').fill('not a colour');
  assert.equal(await full.getByLabel('Background: colour name or hex').getAttribute('aria-invalid'), 'true');
  assert.equal(await stage.locator('rect[data-layer=background]').getAttribute('fill'), '#00ccff', 'a bad name changes nothing');
  await full.getByRole('button', { name: 'Background: more colours' }).click();
  assert.equal(await full.getByRole('group', { name: 'Background: default colours' }).count(), 0, 'the button closes it again');
  await page.close();
});

/** Opens a builder tab, then one of the colours over its items, and picks a swatch there. */
const pickIn = async (full: Locator, tab: string, part: string, colour: string) => {
  await full.getByRole('tab', { name: tab, exact: true }).click();
  const dot = full.getByRole('radiogroup', { name: 'Colour of' }).getByRole('radio', { name: part, exact: true });
  if ((await dot.getAttribute('aria-checked')) !== 'true') await dot.click();
  await full.getByRole('button', { name: `${part} ${colour}`, exact: true }).click();
};

test('part colours in the builder: each tab shows the colours of its items, skin tones for Skin, back to the default skin', async () => {
  const page = await open(); const full = page.locator('#full'); const stage = full.getByTestId('pc-stage');
  const dots = async (tab: string) => { await full.getByRole('tab', { name: tab, exact: true }).click(); return full.getByRole('radiogroup', { name: 'Colour of' }).getByRole('radio').allInnerTexts(); };
  assert.deepEqual(await dots('Hair'), ['Bandana', 'Line', 'Skin'], 'the bun has a bandana, and its own lines');
  assert.deepEqual(await dots('Body'), ['Top', 'Line', 'Skin'], 'a tee: no jacket, no shoes');
  await full.getByRole('tab', { name: 'Hair', exact: true }).click();
  await full.getByRole('radiogroup', { name: 'Colour of' }).getByRole('radio', { name: 'Skin', exact: true }).click();
  assert.ok(await full.getByRole('button', { name: 'Skin #c68642' }).isVisible(), 'skin tones are offered first');
  await pickIn(full, 'Hair', 'Skin', '#c68642'); await pickIn(full, 'Hair', 'Bandana', '#52b788');
  await pickIn(full, 'Body', 'Top', '#e63946'); await pickIn(full, 'Face', 'Face', '#1d3557');
  const slot = (s: string) => stage.locator(`[data-slot=${s}] path`);
  assert.ok(await slot('head').evaluateAll((ps) => ps.some((p) => p.getAttribute('fill') === '#c68642')), 'skin');
  assert.ok(await stage.locator('[data-slot=head] [data-piece=bandana][fill="#52b788"]').count() > 0, 'bandana');
  assert.ok(await stage.locator('[data-slot=body] [data-piece=top][fill="#e63946"]').count() > 0, 'the top in its own colour');
  assert.ok(await slot('face').evaluateAll((ps) => ps.some((p) => p.getAttribute('fill') === '#1d3557')), 'face');

  await full.getByRole('tab', { name: 'Type', exact: true }).click();
  await full.getByRole('radiogroup', { name: 'Colour of' }).getByRole('radio', { name: 'Skin', exact: true }).click();
  await full.getByRole('button', { name: 'Back to its own colour' }).click();
  assert.ok(!(await slot('head').evaluateAll((ps) => ps.some((p) => p.getAttribute('fill') === '#c68642'))), 'the picked skin is gone');
  assert.ok(await slot('head').evaluateAll((ps) => ps.some((p) => p.getAttribute('fill') === '#d08b5b')), 'back to the skin a peep starts with');
  assert.ok(await stage.locator('[data-slot=head] [data-piece=bandana][fill="#52b788"]').count() > 0, 'the bandana stays');
  await page.close();
});

test('items come in their own colours: thumbnails show them, another item drops the colour picked for the last', async () => {
  const page = await open(); const full = page.locator('#full'); const stage = full.getByTestId('pc-stage');
  await pickIn(full, 'Body', 'Top', '#e63946');
  assert.ok(await stage.locator('[data-piece=top][fill="#e63946"]').count() > 0);
  const tiles = full.getByRole('radiogroup', { name: 'Body' }).getByRole('radio');
  const fills = await tiles.evaluateAll((ts) => ts.slice(0, 8).map((t) => [...t.querySelectorAll('[data-piece=top]')].map((p) => p.getAttribute('fill')).join()));
  assert.ok(new Set(fills.filter(Boolean)).size > 2, 'the tops of the thumbnails differ');
  await full.getByRole('radio', { name: 'Sweater', exact: true }).click();
  assert.equal(await stage.locator('[fill="#e63946"]').count(), 0, 'the sweater in its own colour');
  assert.ok(await stage.locator('[data-slot=body] [data-piece=top]').count() > 0, 'which has a top');
  await page.close();
});

test('click a part on the stage: its tab opens, with its colours', async () => {
  const page = await open(); const full = page.locator('#full'); const stage = full.getByTestId('pc-stage');
  const tab = async () => (await full.getByRole('tab', { selected: true }).innerText()).trim();
  await full.getByRole('tab', { name: 'Face', exact: true }).click();
  const body = (await stage.locator('[data-slot=body]').boundingBox())!;
  await page.mouse.click(body.x + body.width / 2, body.y + body.height * 0.75);
  assert.equal(await tab(), 'Body');
  assert.ok(await full.getByRole('radiogroup', { name: 'Colour of' }).getByRole('radio', { name: 'Top', exact: true }).isVisible());
  // The hair is drawn in odd shapes; a click sent to one of its paths is the click on the hair.
  await stage.locator('[data-slot=head] path').first().dispatchEvent('click');
  assert.equal(await tab(), 'Hair');
  await page.close();
});

test('one skin colour reaches the neck and the hands; the top leaves them alone', async () => {
  const page = await open(); const full = page.locator('#full'); const stage = full.getByTestId('pc-stage');
  await pickIn(full, 'Body', 'Skin', '#8d5524'); await pickIn(full, 'Body', 'Top', '#38b6ff');
  assert.ok(await stage.locator('[data-slot=body] [data-piece=skin][fill="#8d5524"]').count() > 0, 'the skin of the body');
  assert.ok(await stage.locator('[data-slot=head] [data-piece=skin][fill="#8d5524"]').count() > 0, 'the skin of the head');
  assert.ok(await stage.locator('[data-slot=body] [data-piece=top][fill="#38b6ff"]').count() > 0, 'the top is blue');
  assert.equal(await stage.locator('[data-piece=skin][fill="#38b6ff"]').count(), 0, 'and the skin is not');
  await page.close();
});

test('locks: Shuffle all keeps a locked background and a locked part', async () => {
  const page = await open(); const full = page.locator('#full'); const stage = full.getByTestId('pc-stage');
  await full.getByRole('tab', { name: 'Hair', exact: true }).click();
  await full.getByRole('radio', { name: 'Afro', exact: true }).click();
  await full.getByRole('button', { name: 'Lock Hair' }).click();
  await full.getByRole('button', { name: 'Lock Background' }).click();
  assert.equal(await full.getByRole('button', { name: 'Lock Hair' }).getAttribute('aria-pressed'), 'true');
  const bg = await stage.locator('svg').first().innerHTML();
  const head = async () => full.getByRole('radiogroup', { name: 'Hair' }).getByRole('radio', { checked: true }).getAttribute('data-tip');
  const body = async () => { await full.getByRole('tab', { name: 'Body', exact: true }).click(); return full.getByRole('radiogroup', { name: 'Body' }).getByRole('radio', { checked: true }).getAttribute('data-tip'); };
  const before = await body();
  for (let i = 0; i < 3; i++) await full.getByRole('button', { name: 'Shuffle all' }).click();
  assert.notEqual(await body(), before, 'the body is not locked');
  await full.getByRole('tab', { name: 'Hair', exact: true }).click();
  assert.equal(await head(), 'Afro');
  assert.equal((await stage.locator('svg').first().innerHTML()).match(/<rect[^>]*>/)?.[0], bg.match(/<rect[^>]*>/)?.[0], 'the background stays');
  await page.close();
});

test('thumbnails show each item by itself, or on the whole peep with "On peep"; the page and a tab open at the top', async () => {
  const page = await open(); const full = page.locator('#full');
  assert.equal(await page.evaluate(() => scrollY), 0, 'the page loads at its top');
  await full.getByRole('tab', { name: 'Body', exact: true }).click();
  assert.equal(await full.locator('#pc-options .pc-grid').evaluate((g) => g.scrollTop), 0, 'the tab opens at the top of its items');
  const tile = full.getByRole('radio', { name: 'Hoodie' });
  assert.equal(await tile.locator('[data-slot=head]').count(), 0, 'the item by itself');
  await full.getByRole('button', { name: 'On peep' }).click();
  assert.equal(await full.getByRole('button', { name: 'On peep' }).getAttribute('aria-pressed'), 'true');
  assert.equal(await tile.locator('[data-slot=head]').count(), 1, 'on the whole peep');
  await page.close();
});

test('a slider marks its default and pulls a drag that comes near it onto it', async () => {
  const page = await open(); const full = page.locator('#full');
  assert.equal(await full.locator('.pc-side .pc-slider').first().locator('.pc-tick').count(), 1);
  const r = (await full.getByRole('slider', { name: 'Scale' }).boundingBox())!;
  await page.mouse.click(r.x + r.width * 0.8, r.y + r.height / 2);
  assert.notEqual(await full.getByRole('spinbutton', { name: 'Scale value' }).inputValue(), '1');
  await page.mouse.click(r.x + r.width * 0.53, r.y + r.height / 2);
  assert.equal(await full.getByRole('spinbutton', { name: 'Scale value' }).inputValue(), '1', 'near the default lands on it');
  await page.close();
});

test('contrast: the peep and its thumbnails in black and white, the dots down to Lines and Fill, back in colour when off', async () => {
  const page = await open(); const full = page.locator('#full'); const stage = full.getByTestId('pc-stage');
  const colour = 'path[data-piece]:not([data-piece=ink]):not([fill="#ffffff"])', coloured = () => stage.locator(colour).count();
  assert.ok(await coloured() > 0);
  await full.getByRole('button', { name: 'Contrast' }).click();
  assert.equal(await coloured(), 0, 'black and white');
  await full.getByRole('tab', { name: 'Body', exact: true }).click();
  assert.equal(await full.getByRole('radiogroup', { name: 'Colour of' }).count(), 0, 'no part colours to pick');
  assert.equal(await full.getByRole('radiogroup', { name: 'Body' }).locator(colour).count(), 0, 'thumbnails too');
  await full.getByRole('button', { name: 'Contrast' }).click();
  assert.ok(await coloured() > 0, 'the colours come back');
  await page.close();
});

test('items as a grid or a list, a name tooltip on each, a light grey behind them in Contrast', async () => {
  const page = await open(); const full = page.locator('#full');
  const items = full.getByRole('radiogroup', { name: 'Hair' });
  assert.equal(await items.getByRole('radio', { name: 'Afro', exact: true }).getAttribute('data-tip'), 'Afro');
  await full.getByRole('button', { name: 'Show as a list' }).click();
  assert.equal(await items.evaluate((g) => getComputedStyle(g).gridTemplateColumns.split(' ').length), 1, 'one item a row');
  await full.getByRole('button', { name: 'Contrast' }).click();
  assert.equal(await items.locator('svg').first().evaluate((s) => getComputedStyle(s).backgroundColor), 'rgb(242, 242, 242)');
  await page.close();
});

test('a tooltip floats over the page: the list of items does not grow under it', async () => {
  const page = await open(); const full = page.locator('#full');
  const grid = full.getByRole('radiogroup', { name: 'Hair' });
  const before = await grid.evaluate((g) => g.scrollHeight);
  // A scroll hides the tooltip, so the item is brought into view first.
  await grid.getByRole('radio').last().scrollIntoViewIfNeeded(); await page.waitForTimeout(100);
  await grid.getByRole('radio').last().hover();
  const tip = page.locator('body > .pc-tip');
  assert.equal(await tip.innerText(), await grid.getByRole('radio').last().getAttribute('data-tip'));
  assert.equal(await grid.evaluate((g) => g.scrollHeight), before, 'the list keeps its height');
  await page.mouse.move(2, 2);
  assert.equal(await tip.count(), 0, 'gone when the pointer leaves');
  await page.close();
});
