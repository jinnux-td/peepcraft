// Serves examples/peeps/dist/index.html on 127.0.0.1 only. Usage: npm run example:peeps [-- --port 4183]
import { serve } from '../world/serve.ts';
export const servePeeps = (port = 0) => serve(port, new URL('dist/index.html', import.meta.url));
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const i = process.argv.indexOf('--port'), s = await servePeeps(i > 0 ? Number(process.argv[i + 1]) : 4183);
  console.log(`http://127.0.0.1:${(s.address() as { port: number }).port}`);
}
