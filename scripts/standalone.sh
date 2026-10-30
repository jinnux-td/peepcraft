#!/bin/sh
# Proves each package works outside this repo: copy it (and the @kit packages it names in its dependencies or devDependencies) to a temp folder,
# install, typecheck, test. A leaf package must work alone; an assembly (@kit/map-view) works with the leaves it lists. Usage: scripts/standalone.sh [package ...]
set -e
root=$(cd "$(dirname "$0")/.." && pwd)
pkgs=${*:-$(ls "$root/packages")}
needs() { node -e "const p=require('$root/packages/$1/package.json'),d={...p.dependencies,...p.devDependencies};console.log(Object.keys(d).filter(k=>k.startsWith('@kit/')).map(k=>k.slice(5)).join(' '))"; }
for p in $pkgs; do
  tmp=$(mktemp -d); mkdir "$tmp/packages"
  for d in $p $(needs "$p"); do cp -R "$root/packages/$d" "$tmp/packages/$d"; done
  printf '{"private":true,"workspaces":["packages/*"]}\n' > "$tmp/package.json"
  (cd "$tmp" && npm install --silent --no-audit --no-fund && cd "packages/$p" && npm run --silent typecheck && npm test --silent 2>&1 | grep -E "^# (tests|pass|fail)")
  echo "standalone ok: $p ($(echo $p $(needs "$p") | tr ' ' '+'))"
  rm -rf "$tmp"
done
