// `npm run build`: writes every generated file next to package.json. The test fails when a file is stale.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { OUTPUTS } from './build.ts';

const root = join(import.meta.dirname, '..');
for (const [path, make] of Object.entries(OUTPUTS)) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), make());
  console.log(`wrote ${path}`);
}
