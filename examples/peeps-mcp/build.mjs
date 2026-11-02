// Bundles the Worker into dist/worker.js, all art included (no code splitting in a Worker), and checks it against the size budget:
// Workers Free takes 3 MB gzipped; past 2.8 MB the build fails, to leave room (see kit/docs/peepcraft-platform.md §7).
// The art paths are not rounded here (the web build rounds them): the MCP server must draw the golden SVGs byte for byte.
import { build } from 'esbuild'
import { gzipSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

const BUDGET = 2.8 * 1024 * 1024
const here = new URL('.', import.meta.url)
const out = await build({
  entryPoints: [new URL('worker.ts', here).pathname], bundle: true, minify: true, write: false, format: 'esm',
  platform: 'browser', conditions: ['workerd', 'worker', 'browser'], target: 'es2022', jsx: 'automatic', legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"' },
})
const code = out.outputFiles[0].contents, gz = gzipSync(code).length
mkdirSync(new URL('dist/', here), { recursive: true })
writeFileSync(new URL('dist/worker.js', here), code)
const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB'
console.log(`examples/peeps-mcp/dist/worker.js ${mb(code.length)}, ${mb(gz)} gzip (budget ${mb(BUDGET)}, Workers Free limit 3 MB)`)
if (gz > BUDGET) { console.error('over the Worker budget: move to Workers Paid (10 MB) or leave the figures out of MCP'); process.exit(1) }
