// Records which version of each @kit package a repository uses, in its kit.lock.json, so anyone can trace what it was built from.
//   node ../kit/scripts/kit-lock.ts           write the lock (run it from the consuming repository, with kit beside it at ../kit)
//   node ../kit/scripts/kit-lock.ts --check   fail if what is on disk is not what the lock says; needs no kit for vendored packages
//   node ../kit/scripts/kit-lock.ts --verify  --check, and also compare the lock with kit's tags. --check catches drift; only this catches an edited lock
// Two ways to use a package: linked ("file:../kit/packages/ui" in package.json), or vendored, a copy inside the repository, named in package.json
// as "kit": { "vendored": ["ui"] } and refreshed from kit here. A package is only recorded at a released version: if it has changed since its tag,
// two different codes would carry one version number, which is the mistake this exists to prevent. Hashes and vendored copies come from the tagged
// commit, never the working tree, so an untracked file in a package folder cannot reach a consumer.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';

export interface Entry { version: string; tag: string; commit: string; hash: string; path: string }
export interface Lock { source: string; packages: Record<string, Entry> }

/** Install output and Finder's files: no package tracks them. */
const SKIP = new Set(['node_modules', '.DS_Store']);
const LOCK = 'kit.lock.json';
const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

/** The content of a package folder, the same wherever the folder is: paths and bytes, nothing about the machine. */
export function hashFolder(root: string): string {
  const h = createHash('sha256');
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (SKIP.has(e.name)) continue;
      const path = join(dir, e.name);
      if (e.isDirectory()) walk(path);
      else h.update(relative(root, path)).update('\0').update(readFileSync(path)).update('\0');
    }
  };
  walk(root);
  return `sha256:${h.digest('hex')}`;
}

const kitDeps = (pkg: { dependencies?: Record<string, string>; peerDependencies?: Record<string, string> }) =>
  Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies }).filter((n) => n.startsWith('@kit/')).map((n) => n.slice('@kit/'.length));

/** The package exactly as its commit has it, in a throwaway folder. */
function atCommit<T>(kit: string, commit: string, name: string, use: (folder: string) => T): T {
  const tmp = mkdtempSync(join(tmpdir(), 'kit-lock-'));
  try {
    const tar = execFileSync('git', ['-C', kit, 'archive', '--format=tar', commit, `packages/${name}`], { maxBuffer: 2 ** 31 - 1, stdio: ['ignore', 'pipe', 'pipe'] });
    execFileSync('tar', ['-x', '-C', tmp], { input: tar, maxBuffer: 2 ** 31 - 1 });
    return use(join(tmp, 'packages', name));
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

function entry(kit: string, name: string, path: string, vendorTo?: string): Entry {
  const git = (...args: string[]) => execFileSync('git', ['-C', kit, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const folder = `packages/${name}`, { version } = json(join(kit, folder, 'package.json')), tag = `@kit/${name}@${version}`;
  let commit: string;
  try { commit = git('rev-parse', `${tag}^{commit}`); }
  catch { throw new Error(`${tag} has no tag in kit: release it first (node scripts/release.ts ${name} patch)`); }
  if (git('status', '--porcelain', '--', folder) || git('diff', '--name-only', commit, 'HEAD', '--', folder)) {
    throw new Error(`@kit/${name} has changed since ${tag}: release it first (node scripts/release.ts ${name} patch)`);
  }
  const hash = atCommit(kit, commit, name, (at) => {
    if (vendorTo) { rmSync(vendorTo, { recursive: true, force: true }); cpSync(at, vendorTo, { recursive: true }); }
    return hashFolder(at);
  });
  return { version, tag, commit, hash, path };
}

/** Where the repository's own package.json says each package is: a lock pointing elsewhere must not pass. */
function expected(app: string, pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string>; kit?: { vendored?: string[] } }) {
  const at = new Map<string, string>();
  for (const [n, v] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) if (n.startsWith('@kit/') && v.startsWith('file:')) at.set(n, relative(app, resolve(app, v.slice('file:'.length))));
  for (const n of pkg.kit?.vendored ?? []) at.set(`@kit/${n}`, join('packages', n));
  return at;
}

/** Writes the lock for the repository at `app`, from kit at `kit`, copying vendored packages in first. */
export function write(app: string, kit: string): Lock {
  const pkg = json(join(app, 'package.json'));
  const vendored = new Set<string>(pkg.kit?.vendored ?? []);
  const linked = Object.entries<string>({ ...pkg.dependencies, ...pkg.devDependencies }).filter(([n, v]) => n.startsWith('@kit/') && v.startsWith('file:')).map(([n]) => n.slice('@kit/'.length));
  const seen = new Set<string>(), walk = (name: string) => {
    if (seen.has(name)) return;
    seen.add(name);
    kitDeps(json(join(kit, 'packages', name, 'package.json'))).forEach(walk);
  };
  [...linked, ...vendored].forEach(walk);
  const packages: Record<string, Entry> = {};
  for (const name of [...seen].sort()) {
    const isVendored = vendored.has(name);
    const path = isVendored ? join('packages', name) : relative(app, join(kit, 'packages', name));
    packages[`@kit/${name}`] = entry(kit, name, path, isVendored ? join(app, path) : undefined);
  }
  const lock: Lock = { source: 'https://github.com/jinnux-td/kit', packages };
  writeFileSync(join(app, LOCK), JSON.stringify(lock, null, 2) + '\n');
  return lock;
}

/** Every way what is on disk differs from the lock; none means the repository is what it says it is. */
export function check(app: string): string[] {
  if (!existsSync(join(app, LOCK))) return [`no ${LOCK}: run kit-lock.ts`];
  const lock: Lock = json(join(app, LOCK)), problems: string[] = [];
  const at = expected(app, json(join(app, 'package.json')));
  for (const [name, path] of at) {
    if (!lock.packages[name]) problems.push(`${name} is used but not in ${LOCK}`);
    else if (lock.packages[name].path !== path) problems.push(`${name}: package.json uses ${path}, ${LOCK} says ${lock.packages[name].path}`);
  }
  for (const [name, e] of Object.entries(lock.packages)) {
    const folder = resolve(app, e.path);
    if (!existsSync(join(folder, 'package.json'))) { problems.push(`${name}: nothing at ${e.path}`); continue; }
    const found = json(join(folder, 'package.json')).version;
    if (found !== e.version) problems.push(`${name}: locked at ${e.version}, found ${found}`);
    else if (hashFolder(folder) !== e.hash) problems.push(`${name}: ${e.path} is not ${e.tag} (its files differ)`);
  }
  return problems;
}

/** check(), and also that each entry is what kit's tag says: the tag still points at that commit, and that commit's files have that hash. */
export function verify(app: string, kit: string): string[] {
  const problems = check(app);
  if (!existsSync(join(app, LOCK))) return problems;
  for (const [name, e] of Object.entries((json(join(app, LOCK)) as Lock).packages)) {
    let commit: string;
    try { commit = execFileSync('git', ['-C', kit, 'rev-parse', `${e.tag}^{commit}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
    catch { problems.push(`${name}: kit has no tag ${e.tag}`); continue; }
    if (commit !== e.commit) problems.push(`${name}: ${e.tag} is ${commit.slice(0, 7)} in kit, ${LOCK} says ${e.commit.slice(0, 7)}`);
    else if (atCommit(kit, commit, name.slice('@kit/'.length), hashFolder) !== e.hash) problems.push(`${name}: the hash in ${LOCK} is not the hash of ${e.tag}`);
  }
  return problems;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const app = process.cwd();
  try {
    if (process.argv.includes('--check') || process.argv.includes('--verify')) {
      const problems = process.argv.includes('--verify') ? verify(app, resolve(app, '../kit')) : check(app);
      if (problems.length) { console.error(`${LOCK} does not match:\n${problems.map((p) => `  ${p}`).join('\n')}\nRun kit-lock.ts to take the new versions, or restore the files.`); process.exit(1); }
      console.log(`${LOCK} ok`);
    } else {
      const lock = write(app, resolve(app, '../kit'));
      for (const [name, e] of Object.entries(lock.packages)) console.log(`${name} ${e.version} ${e.commit.slice(0, 7)}`);
    }
  } catch (e) { console.error((e as Error).message); process.exit(1); }
}
