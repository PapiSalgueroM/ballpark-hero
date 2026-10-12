#!/usr/bin/env bash
# Round 1308 review (run lens): does any byte the site ships move? A vite build of origin/main and of the head, same runner.
set -u
git worktree add -q /tmp/basemain origin/main || exit 2
ln -s "$PWD/node_modules" /tmp/basemain/node_modules
echo "base $(git -C /tmp/basemain rev-parse --short HEAD), head $(git rev-parse --short HEAD)"
echo "files that differ between them: $(git diff --name-only origin/main HEAD | wc -l)"
(cd /tmp/basemain && node_modules/.bin/vite build --outDir /tmp/out-base > /tmp/b-base.log 2>&1) || { tail -5 /tmp/b-base.log; exit 2; }
node_modules/.bin/vite build --outDir /tmp/out-head > /tmp/b-head.log 2>&1 || { tail -5 /tmp/b-head.log; exit 2; }
(cd /tmp/out-base && find . -type f | sort | xargs sha1sum) > /tmp/base.sums
(cd /tmp/out-head && find . -type f | sort | xargs sha1sum) > /tmp/head.sums
echo "base files $(wc -l < /tmp/base.sums), head files $(wc -l < /tmp/head.sums)"
diff /tmp/base.sums /tmp/head.sums | head -12
echo "card strings in the head's build: $(grep -rlE 'No playoffs this year|data-bracket-scroll|You have the bye|Through. The rest of this round' /tmp/out-head | wc -l) files"
if diff -q /tmp/base.sums /tmp/head.sums > /dev/null; then echo "BUILD BYTE IDENTICAL: every file of the head's build is the base's"; else echo "BUILD DIFFERS: $(diff /tmp/base.sums /tmp/head.sums | grep -c '^>') files of the head not in the base"; fi
