// Serves examples/ui/dist/index.html on 127.0.0.1 only. Usage: npm run example:ui [-- --port 4184]
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import type { Server } from 'node:http';
export const serveUi = (port = 0): Promise<Server> => new Promise((resolve) => {
  const s = createServer((_, res) => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(readFileSync(new URL('dist/index.html', import.meta.url))); });
  s.listen(port, '127.0.0.1', () => resolve(s));
});
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const i = process.argv.indexOf('--port'), s = await serveUi(i > 0 ? Number(process.argv[i + 1]) : 4184);
  console.log(`http://127.0.0.1:${(s.address() as { port: number }).port}`);
}
