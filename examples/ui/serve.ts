// Serves examples/ui/dist/index.html on 127.0.0.1 only. Usage: npm run example:ui [-- --port 4184]
import { serve } from '../world/serve.ts';
export const serveUi = (port = 0) => serve(port, new URL('dist/index.html', import.meta.url));
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const i = process.argv.indexOf('--port'), s = await serveUi(i > 0 ? Number(process.argv[i + 1]) : 4184);
  console.log(`http://127.0.0.1:${(s.address() as { port: number }).port}`);
}
