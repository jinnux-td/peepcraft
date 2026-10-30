// Peepcraft's load on a mid-range phone, against docs/ui/performance.md (tool: LCP ≤ 2.5 s, INP ≤ 200 ms): 4× slower CPU, slow 4G
// (1.6 Mbps down, 150 ms), the page served gzip-compressed as a static host serves it. Three runs, the median. Build first.
// Usage: npm run perf:peeps (in kit)
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
// served as a static host would: gzip-compressed (the kit's own example server sends files as they are)
const dist = new URL('./dist/', import.meta.url);
const s: any = await new Promise((res) => { const v = createServer(async (q, r) => { let path = new URL(q.url!, 'http://x').pathname; if (path === '/') path = '/index.html';
  try { const b = await readFile(new URL('.' + path, dist)); r.writeHead(200, { 'content-type': path.endsWith('.js') ? 'text/javascript' : 'text/html', 'content-encoding': 'gzip' }); r.end(gzipSync(b)); } catch { r.writeHead(404); r.end(); } });
  v.listen(0, '127.0.0.1', () => res(v)); });
const url = 'http://127.0.0.1:' + s.address().port + '/';
const b = await chromium.launch();
const runs: any[] = [];
for (let i = 0; i < 3; i++) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const p = await ctx.newPage(), cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.addInitScript(() => {
    (window as any).__lcp = 0; (window as any).__events = [];
    new PerformanceObserver((l) => { for (const e of l.getEntries()) (window as any).__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries() as any) (window as any).__events.push({ name: e.name, d: e.duration }); }).observe({ type: 'event', durationThreshold: 16, buffered: true } as any);
  });
  const t0 = Date.now();
  await p.goto(url, { waitUntil: 'load', timeout: 120000 });
  await p.waitForSelector('.pc-stage svg', { timeout: 120000 });
  const ready = Date.now() - t0;
  await p.waitForTimeout(1500);
  await p.getByRole('tab', { name: /Body/ }).first().tap().catch(() => p.getByRole('tab', { name: /Body/ }).first().click());
  await p.waitForTimeout(800);
  await p.locator('.pc-grid [role=radio], .pc-grid button').nth(2).tap().catch(() => {});
  await p.waitForTimeout(800);
  const r = await p.evaluate(() => ({ lcp: Math.round((window as any).__lcp), inp: Math.round(Math.max(0, ...(window as any).__events.filter((e: any) => /pointer|click|key/.test(e.name)).map((e: any) => e.d))) }));
  runs.push({ ...r, ready });
  await ctx.close();
}
console.log(runs);
const med = (k: string) => runs.map((r) => r[k]).sort((a, c) => a - c)[1];
console.log('median  LCP', med('lcp'), 'ms  INP~', med('inp'), 'ms  stage ready', med('ready'), 'ms');
await b.close(); s.close();
