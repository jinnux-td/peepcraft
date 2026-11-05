// Makes og.png (1200 x 630), the card a link to PeepCraft shows on LinkedIn, Slack and the like: the name, the line, and peeps from the avatar
// route; and the icons, the default bust cut to its head: favicon.svg, apple-touch-icon.png (180), favicon.ico (16/32/48, needs ImageMagick 7).
// Run it after changing the words or the default peep: npm run og:peeps. Inter is SIL OFL 1.1 (og/OFL-Inter.txt), never a system font, whose licence may not cover a published image.
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { renderSvg } from '@kit/peeps-engine';
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
// The icons: the bust as PeepCraft starts it, cut to the head, or a whole figure is a smudge at 16 px; corners as rounded as the portfolio's mark.
const here = (name: string) => new URL(name, import.meta.url).pathname;
const CROP = { x: 150, y: 30, size: 900 }, SUNNY = '#f7d56e';
const { svg: bust } = await renderSvg({ v: 1 });
const mark = bust.replace(/^<svg [^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${CROP.x} ${CROP.y} ${CROP.size} ${CROP.size}"><clipPath id="r"><rect x="${CROP.x}" y="${CROP.y}" width="${CROP.size}" height="${CROP.size}" rx="${CROP.size * 7 / 32}"/></clipPath><g clip-path="url(#r)">`).replace(/<\/svg>$/, '</g></svg>');
writeFileSync(here('favicon.svg'), mark + '\n');
const draw = async (size: number, path: string, omitBackground = true) => {
  const icon = await browser.newPage({ viewport: { width: size, height: size } });
  await icon.setContent(`<!doctype html><style>html,body{margin:0;background:${omitBackground ? 'transparent' : SUNNY}}svg{display:block;width:${size}px;height:${size}px}</style>${mark}`);
  await icon.screenshot({ path, omitBackground });
  await icon.close();
};
await draw(180, here('apple-touch-icon.png'), false);
const sizes = [16, 32, 48].map((n) => here(`og/icon-${n}.png`));
await Promise.all([16, 32, 48].map((n, i) => draw(n, sizes[i])));
execFileSync('magick', [...sizes, here('favicon.ico')]);
for (const f of sizes) rmSync(f);
await browser.close();
