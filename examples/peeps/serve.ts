// Serves examples/peeps/dist on 127.0.0.1 only: the page and the figure chunks it fetches. Usage: npm run example:peeps [-- --port 4183]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import type { Server } from 'node:http';
const dist = new URL('dist/', import.meta.url);
const types: Record<string, string> = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', svg: 'image/svg+xml', ico: 'image/x-icon', png: 'image/png' };
export const servePeeps = (port = 0): Promise<Server> => new Promise((resolve) => {
  const s = createServer(async (req, res) => {
    const path = new URL(req.url ?? '/', 'http://x').pathname.slice(1) || 'index.html';
    // Only names the build writes (one dot, before the extension), so ".." cannot reach outside dist/.
    const ext = /^[\w/-]+\.(html|js|svg|ico|png)$/.exec(path)?.[1];
    const body = ext && await readFile(new URL(path, dist)).catch(() => null);
    if (!body) { res.writeHead(404).end(); return; }
    // The policy the live site sends (dist/_headers), so the browser tests run under it.
    const csp = readFileSync(new URL('_headers', dist), 'utf8').match(/Content-Security-Policy: (.+)/)![1];
    res.writeHead(200, { 'content-type': types[ext], 'content-security-policy': csp }).end(body);
  });
  s.listen(port, '127.0.0.1', () => resolve(s));
});
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const i = process.argv.indexOf('--port'), s = await servePeeps(i > 0 ? Number(process.argv[i + 1]) : 4183);
  console.log(`http://127.0.0.1:${(s.address() as { port: number }).port}`);
}
