// Bundles main.tsx into dist/index.html, with the drawing of each figure in its own dist/figures/*.js, fetched after the page paints (so it
// needs http, not file://).
import { build } from 'esbuild';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
const here = new URL('.', import.meta.url);
// The generated drawings carry 2 to 3 decimals; 0.1 of a unit on a 500 to 1080 canvas is not visible, and rounding cuts the page by about 30%.
// Safe because every path is plain space-separated numbers in M L C H V Z (no arcs, no ".5" or exponent forms).
const roundPaths = { name: 'round-paths', setup: (b) => b.onLoad({ filter: /\/(atoms|figures)\/.+\.ts$/ }, ({ path }) => ({ loader: 'ts',
  contents: readFileSync(path, 'utf8').replace(/ d: "([^"]*)"/g, (_, d) => ` d: "${d.replace(/-?\d+\.\d+/g, (n) => String(+(+n).toFixed(1)))}"`) })) };
const dist = new URL('dist/', here).pathname;
const out = await build({ entryPoints: { main: new URL('main.tsx', here).pathname }, bundle: true, minify: true, write: false, format: 'esm', splitting: true, outdir: dist,
  chunkNames: 'figures/[name]-[hash]', jsx: 'automatic', loader: { '.json': 'json' }, plugins: [roundPaths] });
// The entry goes inline into the page (one request before the first paint); its import() of a chunk resolves against the page, next to it.
const entry = out.outputFiles.find((f) => f.path === dist + 'main.js'), chunks = out.outputFiles.filter((f) => f !== entry);
rmSync(dist, { recursive: true, force: true }); mkdirSync(dist + 'figures', { recursive: true });
for (const f of chunks) writeFileSync(f.path, f.contents);
// The chunks the entry imports up front (esbuild's shared helpers) are hinted in the head, so they download alongside the page, not after it.
const preload = [...entry.text.matchAll(/from"\.\/(figures\/chunk-[\w-]+\.js)"/g)].map((m) => `<link rel="modulepreload" href="${m[1]}">`).join('');
writeFileSync(dist + 'index.html', readFileSync(new URL('template.html', here), 'utf8').replace('</head>', () => preload + '</head>').replace('/*BUNDLE*/', () => entry.text.replace(/<\/script/g, '<\\/script')));
const kb = (n) => Math.round(n / 1024) + ' KB';
console.log('examples/peeps/dist/index.html', kb(entry.contents.length), `+ ${chunks.length} chunks`, kb(chunks.reduce((n, f) => n + f.contents.length, 0)));
