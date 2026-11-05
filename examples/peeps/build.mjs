// Bundles main.tsx into dist/index.html, with the drawing of each figure in its own dist/figures/*.js, fetched after the page paints (so it
// needs http, not file://).
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import { initialState } from '../../packages/peeps-engine/src/types.ts';   // the creator's first state (types.ts has no JSX)
import { Peep } from '@kit/peeps';
import { TOKENS_CSS } from '@kit/tokens';
import { pages } from './pages.mjs';
const here = new URL('.', import.meta.url);
// The generated drawings carry 2 to 3 decimals; 0.1 of a unit on a 500 to 1080 canvas is not visible, and rounding cuts the page by about 30%.
// Safe because every path is plain space-separated numbers in M L C H V Z (no arcs, no ".5" or exponent forms).
const roundPaths = { name: 'round-paths', setup: (b) => b.onLoad({ filter: /\/(atoms|figures)\/.+\.ts$/ }, ({ path }) => ({ loader: 'ts',
  contents: readFileSync(path, 'utf8').replace(/ d: "([^"]*)"/g, (_, d) => ` d: "${d.replace(/-?\d+\.\d+/g, (n) => String(+(+n).toFixed(1)))}"`) })) };
const dist = new URL('dist/', here).pathname;
const out = await build({ entryPoints: { main: new URL('main.tsx', here).pathname }, bundle: true, minify: true, write: false, format: 'esm', splitting: true, outdir: dist,
  chunkNames: 'figures/[name]-[hash]', metafile: true, jsx: 'automatic', loader: { '.json': 'json' }, plugins: [roundPaths] });
// The entry goes inline into the page (one request before the first paint); its import() of a chunk resolves against the page, next to it.
const entry = out.outputFiles.find((f) => f.path === dist + 'main.js'), chunks = out.outputFiles.filter((f) => f !== entry);
rmSync(dist, { recursive: true, force: true }); mkdirSync(dist + 'figures', { recursive: true });
for (const f of chunks) writeFileSync(f.path, f.contents);
// The share card and the icons (npm run og:peeps), and what search engines read.
for (const f of ['og.png', 'favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'robots.txt', 'sitemap.xml']) copyFileSync(new URL(f, here), dist + f);
copyFileSync(new URL('apple-touch-icon.png', here), dist + 'apple-touch-icon-precomposed.png');   // older iOS asks for this name
// The chunks the entry imports up front (esbuild's shared helpers) are hinted in the head, so they download alongside the page, not after it.
// So are the paths of the parts the first stage draws (the default peep: an atom per part, each its own chunk): without the hint they
// would only be asked for once the page's script has run.
const atomsDir = new URL('../../packages/peeps/src/atoms/', here).pathname;
const moduleOf = ({ category, id }) => readFileSync(`${atomsDir}${category}/index.ts`, 'utf8').match(new RegExp(`id: "${id}".*import\\('\\./(\\w+)\\.ts'\\)`))?.[1];
const firstParts = new Peep({ type: initialState.type, ...initialState.parts }).layout().map((p) => `${atomsDir}${p.atom.category}/${moduleOf(p.atom)}.ts`);
const chunkOf = (file) => Object.entries(out.metafile.outputs).find(([, o]) => o.entryPoint && new URL(o.entryPoint, `file://${process.cwd()}/`).pathname === file)?.[0];
const firstChunks = firstParts.map(chunkOf).filter(Boolean).map((o) => relative(dist, new URL(o, `file://${process.cwd()}/`).pathname));
const preload = [...new Set([...[...entry.text.matchAll(/from"\.\/(figures\/chunk-[\w-]+\.js)"/g)].map((m) => m[1]), ...firstChunks])].map((h) => `<link rel="modulepreload" href="${h}">`).join('');
writeFileSync(dist + 'index.html', readFileSync(new URL('template.html', here), 'utf8').replace('</head>', () => preload + '</head>').replace('/*BUNDLE*/', () => entry.text.replace(/<\/script/g, '<\\/script')));
for (const [name, p] of Object.entries(pages)) writeFileSync(dist + name + '.html', readFileSync(new URL('page.html', here), 'utf8').replace('/*TOKENS*/', () => TOKENS_CSS)
  .replace('<!--TITLE-->', () => p.title).replace('<!--DESCRIPTION-->', () => p.description).replace('<!--BODY-->', () => p.body));
// The page holds a visitor's API key, so what it may run and call is listed. The one inline script is allowed by its hash, so an injected one is not.
// Inline styles stay allowed: React's style attributes and the packages' own sheets. Beacon: Cloudflare Web Analytics.
const html = readFileSync(dist + 'index.html', 'utf8'), open = '<script type="module">', at = html.lastIndexOf(open);
const inline = html.slice(at + open.length, html.indexOf('</script>', at));
const csp = [
  "default-src 'self'", `script-src 'self' 'sha256-${createHash('sha256').update(inline).digest('base64')}' https://static.cloudflareinsights.com`, "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:", "font-src 'self' data:", "connect-src 'self' https://api.anthropic.com https://cloudflareinsights.com",
  "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'",
].join('; ');
writeFileSync(dist + '_headers', `/*
  Content-Security-Policy: ${csp}
  Strict-Transport-Security: max-age=31536000
  Permissions-Policy: camera=(), microphone=(), geolocation=()

# The chunks have their content's hash in the name.
/figures/*
  Cache-Control: public, max-age=31536000, immutable
`);
const kb = (n) => Math.round(n / 1024) + ' KB';
console.log('examples/peeps/dist/index.html', kb(entry.contents.length), `+ ${chunks.length} chunks`, kb(chunks.reduce((n, f) => n + f.contents.length, 0)));
