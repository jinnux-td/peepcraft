#!/bin/sh
# Proves each package works outside this repo: copy it (and the @kit packages it names in its dependencies or devDependencies) to a temp folder,
# install, typecheck, test. A leaf package must work alone; an assembly (@kit/map-view) works with the leaves it lists. Usage: scripts/standalone.sh [package ...]
set -e
root=$(cd "$(dirname "$0")/.." && pwd)
pkgs=${*:-$(ls "$root/packages")}
# every @kit package it needs, through the ones it needs (dependencies and devDependencies)
needs() { node -e "const seen=new Set(),walk=(n)=>{const p=require('$root/packages/'+n+'/package.json');for(const k of Object.keys({...p.dependencies,...p.devDependencies}))if(k.startsWith('@kit/')&&!seen.has(k.slice(5))){seen.add(k.slice(5));walk(k.slice(5))}};walk('$1');seen.delete('$1');console.log([...seen].join(' '))"; }
for p in $pkgs; do
  tmp=$(mktemp -d); mkdir "$tmp/packages"
  for d in $p $(needs "$p"); do cp -R "$root/packages/$d" "$tmp/packages/$d"; done
  printf '{"private":true,"workspaces":["packages/*"]}\n' > "$tmp/package.json"
  (cd "$tmp" && npm install --silent --no-audit --no-fund && cd "packages/$p" && npm run --silent typecheck && npm test --silent 2>&1 | grep -E "^# (tests|pass|fail)")
  echo "standalone ok: $p ($(echo $p $(needs "$p") | tr ' ' '+'))"
  rm -rf "$tmp"
done
