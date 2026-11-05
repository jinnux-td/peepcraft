// Makes og.png (1200 x 630), the card a link to PeepCraft shows on LinkedIn, Slack and the like: the name, the line, and peeps from the avatar
// route. Run it after changing the words: npm run og:peeps. Inter is SIL OFL 1.1 (og/OFL-Inter.txt), never a system font, whose licence may not cover a published image.
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { avatar } from '../peeps-mcp/avatar.ts';

const peep = async (seed: string) => (await avatar(new Request('https://x/'), `/avatar/${seed}.svg`)).text();
const seeds = ['grace', 'heidi', 'alice', 'judy', 'erin'];
const tiles = (await Promise.all(seeds.map(peep))).map((svg) => `<div class="tile">${svg}</div>`).join('');
// In the page itself: a page set with setContent may not load a file:// font, and would fall back to a system one with no error.
const font = `data:font/woff2;base64,${readFileSync(new URL('og/inter-latin.woff2', import.meta.url)).toString('base64')}`;
const card = `<!doctype html><meta charset="utf-8"><style>
@font-face { font-family: OgSans; src: url(${font}) format("woff2"); font-weight: 100 900; }
html, body { margin: 0; width: 1200px; height: 630px; background: #f7d56e; color: #111; font-family: OgSans; }
main { box-sizing: border-box; height: 100%; padding: 64px; display: flex; flex-direction: column; justify-content: space-between; }
h1 { margin: 0; font-size: 104px; font-weight: 800; letter-spacing: -.03em; line-height: 1; }
p { margin: 16px 0 0; font-size: 38px; font-weight: 500; }
.row { display: flex; gap: 20px; }
.tile { width: 200px; height: 200px; border-radius: 32px; overflow: hidden; border: 4px solid #111; }
.tile svg { display: block; width: 100%; height: 100%; transform: scale(1.06); }
</style><main><div><h1>PeepCraft</h1><p>Draw Open Peeps characters and scenes</p></div><div class="row">${tiles}</div></main>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(card, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
if (!(await page.evaluate(() => document.fonts.check('800 104px OgSans')))) throw new Error('Inter did not load');
await page.screenshot({ path: new URL('og.png', import.meta.url).pathname });
await browser.close();
