# Round 1314 reviewer (run lens): the three rewritten node harnesses on origin/main 48cb9d4b and on this head,
# outputs diffed, so a section the round did not mean to change shows any line it moved.
set -u
O=${RC_OUT:-/tmp/rcout}; mkdir -p "$O"
BASE_SHA=48cb9d4bbe8d8f4922113326d9db5d120dcb0b09
git worktree add -q /tmp/base "$BASE_SHA" || { echo "worktree add failed"; exit 3; }
ln -s "$PWD/node_modules" /tmp/base/node_modules
echo "base $(git -C /tmp/base rev-parse --short HEAD), head $(git rev-parse --short HEAD)"
for h in simSafari simActivityNotCompletion simGmXp; do
  ( cd /tmp/base && node scripts/$h.mjs > "$O/base-$h.log" 2>&1; echo "exit=$?" >> "$O/base-$h.log" )
  node scripts/$h.mjs > "$O/head-$h.log" 2>&1; echo "exit=$?" >> "$O/head-$h.log"
  echo "=================== $h: base $(tail -1 "$O/base-$h.log"), head $(tail -1 "$O/head-$h.log"); diff base to head:"
  diff "$O/base-$h.log" "$O/head-$h.log" | cut -c1-220 | head -60
done
exit 0
