// Bundles the `peep` command into one file, dist/peep.js: the CLI, @kit/peeps-engine, all the art, React. Only playwright-core stays
// outside (a dependency, loaded for PNG alone). The art paths are not rounded, so the output stays the engine's golden SVGs.
import { build } from 'esbuild'
import { chmodSync, readFileSync } from 'node:fs'

const here = new URL('.', import.meta.url)
const { version } = JSON.parse(readFileSync(new URL('package.json', here), 'utf8'))
await build({
  entryPoints: [new URL('main.ts', here).pathname], outfile: new URL('dist/peep.js', here).pathname,
  bundle: true, minify: true, format: 'esm', platform: 'node', target: 'node22', legalComments: 'none',
  external: ['playwright-core'],
  define: { PEEP_VERSION: JSON.stringify(version), 'process.env.NODE_ENV': '"production"' },
  // React's CommonJS asks for require(); an ES module has none until given one.
  banner: { js: "import { createRequire as __peepRequire } from 'node:module'; const require = __peepRequire(import.meta.url);" },
})
chmodSync(new URL('dist/peep.js', here), 0o755)
const size = readFileSync(new URL('dist/peep.js', here)).length
console.log(`examples/peeps-cli/dist/peep.js ${(size / 1024 / 1024).toFixed(2)} MB (peepcraft ${version})`)
