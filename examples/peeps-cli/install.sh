#!/bin/sh
# Installs the peep command on this computer only (the package is private: npm will not publish it), with tab completion.
#   npm run install:peep        (from the repository root)
#   npm uninstall -g peepcraft  (to remove it; rm the completion file below too)
set -e
cd "$(dirname "$0")"
node build.mjs
tmp=$(mktemp -d)
npm pack --silent --pack-destination "$tmp" > /dev/null
npm install -g "$tmp"/peepcraft-*.tgz --no-audit --no-fund --silent
rm -rf "$tmp"
echo "installed: $(command -v peep) ($(peep --version))"

# zsh: a completion file in a folder on fpath. oh-my-zsh puts its cache/completions there; otherwise ~/.zfunc, which ~/.zshrc must add.
if [ -d "${ZSH:-$HOME/.oh-my-zsh}/cache" ]; then
  dir="${ZSH:-$HOME/.oh-my-zsh}/cache/completions"
  mkdir -p "$dir"
  peep completion zsh > "$dir/_peep"
  find "$HOME" -maxdepth 1 -type f -name ".zcompdump*" -delete   # zsh rebuilds its completion cache, now with _peep
  echo "zsh completion: $dir/_peep (open a new terminal)"
else
  mkdir -p "$HOME/.zfunc"
  peep completion zsh > "$HOME/.zfunc/_peep"
  echo "zsh completion: ~/.zfunc/_peep; add before compinit in ~/.zshrc: fpath=(~/.zfunc \$fpath)"
fi
echo 'bash completion: add to ~/.bashrc: eval "$(peep completion bash)"'
