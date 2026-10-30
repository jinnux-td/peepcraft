// The performance budget of a built site (~/services/docs/ui/performance.md), checked in a real browser on a mid-range phone: 4× slower
// CPU, slow 4G (1.6 Mbps down, 150 ms), the files served gzip-compressed as a static host serves them. Three runs, the median of each
// measure; exits with 1 when one is over its budget. Run it after building.
//   node scripts/budget.ts --dist <folder> --kind content|tool [--page /] [--tap "<css selector>"]
// --tap taps an element after the page has loaded, for INP (a tool's main interaction).
import { chromium } from 'playwright-core';
import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
const dist = resolve(arg('dist') ?? ''), kind = arg('kind') as 'content' | 'tool', page = arg('page') ?? '/', tap = arg('tap');
if (!arg('dist') || (kind !== 'content' && kind !== 'tool')) throw new Error('usage: node scripts/budget.ts --dist <folder> --kind content|tool [--page /] [--tap <selector>]');

// [measure, unit, budget; null = reported, not checked]
const BUDGET: Record<string, number | null> = kind === 'content'
  ? { lcp: 2500, cls: 0.1, tbt: 200, inp: 200, js: 60, css: 20, dom: 1500 }
  : { lcp: 2500, cls: 0.1, tbt: 200, inp: 200, js: 200, css: 40, dom: null };
const UNIT: Record<string, string> = { lcp: 'ms', cls: '', tbt: 'ms', inp: 'ms', js: 'KB gzip', css: 'KB gzip', dom: 'nodes' };

const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json', '.xml': 'application/xml' };
const server: Server = await new Promise((done) => {
  const s = createServer(async (q, r) => {
    let path = decodeURIComponent(new URL(q.url!, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    try {
      const body = await readFile(join(dist, path)), type = TYPES[extname(path)] ?? 'application/octet-stream';
      const zip = /text|javascript|json|xml|svg/.test(type);
      r.writeHead(200, { 'content-type': type, ...(zip ? { 'content-encoding': 'gzip' } : {}) }); r.end(zip ? gzipSync(body) : body);
    } catch { r.writeHead(404); r.end(); }
  });
  s.listen(0, '127.0.0.1', () => done(s));
});
const url = `http://127.0.0.1:${(server.address() as { port: number }).port}${page}`;

const browser = await chromium.launch();
const runs: Record<string, number>[] = [];
for (let i = 0; i < 3; i++) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const p = await ctx.newPage(), cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.addInitScript(() => {
    const w = window as any; w.__m = { lcp: 0, cls: 0, tbt: 0, inp: 0 };
    new PerformanceObserver((l) => { for (const e of l.getEntries()) w.__m.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries() as any) if (!e.hadRecentInput) w.__m.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) w.__m.tbt += Math.max(0, e.duration - 50); }).observe({ type: 'longtask', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries() as any) if (/pointer|click|key/.test(e.name)) w.__m.inp = Math.max(w.__m.inp, e.duration); }).observe({ type: 'event', durationThreshold: 16, buffered: true } as any);
  });
  await p.goto(url, { waitUntil: 'load', timeout: 120000 });
  await p.waitForTimeout(3000);   // what loads after the load event (a tool's art) and the long tasks it causes
  if (tap) { await p.locator(tap).first().tap(); await p.waitForTimeout(800); }
  const m = await p.evaluate(() => {
    const w = window as any, load = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const early = (performance.getEntriesByType('resource') as PerformanceResourceTiming[]).filter((r) => r.startTime <= load.loadEventEnd);
    return {
      ...w.__m, dom: document.getElementsByTagName('*').length,
      js: early.filter((r) => r.initiatorType === 'script' || r.name.endsWith('.js')).reduce((n, r) => n + r.transferSize, 0),
      css: early.filter((r) => r.name.endsWith('.css')).reduce((n, r) => n + r.transferSize, 0),
      inlineJs: [...document.querySelectorAll('script:not([src])')].map((s) => s.textContent ?? '').join(''),
      inlineCss: [...document.querySelectorAll('style')].map((s) => s.textContent ?? '').join(''),
    };
  });
  // inline code arrives inside the page, compressed with it: count it at its compressed size
  runs.push({ lcp: m.lcp, cls: m.cls, tbt: m.tbt, inp: m.inp, dom: m.dom,
    js: (m.js + gzipSync(m.inlineJs).length) / 1024, css: (m.css + (m.inlineCss ? gzipSync(m.inlineCss).length : 0)) / 1024 });
  await ctx.close();
}
await browser.close(); server.close();

let over = 0;
console.log(`${kind} budget, ${url} (median of 3, mid-range phone, slow 4G)`);
for (const k of Object.keys(BUDGET)) {
  if (k === 'inp' && !tap) continue;
  const v = runs.map((r) => r[k]).sort((a, b) => a - b)[1], b = BUDGET[k];
  const ok = b === null || v <= b; over += +!ok;
  const shown = k === 'cls' ? v.toFixed(3) : k === 'js' || k === 'css' ? v.toFixed(1) : Math.round(v);
  console.log(`  ${ok ? 'ok  ' : 'OVER'} ${k.padEnd(4)} ${String(shown).padStart(7)} ${UNIT[k].padEnd(8)} budget ${b === null ? 'none (reported)' : b}`);
}
process.exit(over ? 1 : 0);
