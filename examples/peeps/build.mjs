// Bundles main.ts into one offline file, dist/index.html (also opens from file://).
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const here = new URL('.', import.meta.url);
// The generated drawings carry 2 to 3 decimals; 0.1 of a unit on a 500 to 1080 canvas is not visible, and rounding cuts the page by about 30%.
// Safe because every path is plain space-separated numbers in M L C H V Z (no arcs, no ".5" or exponent forms).
const roundPaths = { name: 'round-paths', setup: (b) => b.onLoad({ filter: /\/(atoms|figures)\/.+\.ts$/ }, ({ path }) => ({ loader: 'ts',
  contents: readFileSync(path, 'utf8').replace(/ d: "([^"]*)"/g, (_, d) => ` d: "${d.replace(/-?\d+\.\d+/g, (n) => String(+(+n).toFixed(1)))}"`) })) };
const out = await build({ entryPoints: [new URL('main.tsx', here).pathname], bundle: true, minify: true, write: false, format: 'iife', jsx: 'automatic', loader: { '.json': 'json' }, plugins: [roundPaths] });
const js = out.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
mkdirSync(new URL('dist/', here), { recursive: true });
writeFileSync(new URL('dist/index.html', here), readFileSync(new URL('template.html', here), 'utf8').replace('/*BUNDLE*/', () => js));
console.log('examples/peeps/dist/index.html', Math.round(js.length / 1024) + ' KB');
