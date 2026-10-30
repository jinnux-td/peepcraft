// Bundles main.ts into one offline file, dist/index.html (also opens from file://).
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const here = new URL('.', import.meta.url);
const out = await build({ entryPoints: [new URL('main.ts', here).pathname], bundle: true, minify: true, write: false, format: 'iife' });
const js = out.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
mkdirSync(new URL('dist/', here), { recursive: true });
writeFileSync(new URL('dist/index.html', here), readFileSync(new URL('template.html', here), 'utf8').replace('/*BUNDLE*/', () => js));
console.log('examples/ui/dist/index.html', Math.round(js.length / 1024) + ' KB');
