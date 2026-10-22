#!/usr/bin/env bash
# Round 1326 fix pass 2: a trial join with Round 1328 on the runner (never pushed anywhere).
#   bash join1328.sh merge          merge origin/r1328-cm-hub-landing into the checkout; the one conflict
#                                   (What's New, both rounds add an entry on top) keeps both entries
#   bash join1328.sh build <port>   a plain vite build into dist-<port>, served by hostLikeServer on <port>
set -u
case "${1:-}" in
  merge)
    echo "trial join: $(git rev-parse HEAD) with origin/r1328-cm-hub-landing $(git rev-parse origin/r1328-cm-hub-landing)"
    git -c user.name=trial -c user.email=trial@invalid merge --no-edit --no-ff origin/r1328-cm-hub-landing > /tmp/join.log 2>&1
    tail -5 /tmp/join.log
    U=$(git diff --name-only --diff-filter=U)
    echo "unmerged: ${U:-none}"
    if [ "$U" != "src/pages/WhatsNew.tsx" ]; then echo "FAIL: the conflict set is not What's New alone"; exit 1; fi
    sed -i -E '/^(<<<<<<< |=======$|>>>>>>> )/d' src/pages/WhatsNew.tsx
    if grep -n -E '^(<<<<<<<|=======|>>>>>>>)' -r src scripts --include='*.ts' --include='*.tsx' --include='*.mjs' | head -3 | grep -q .; then echo "FAIL: markers left"; exit 1; fi
    grep -c 'clearer money and cleaner words\|your new job starts on your club' src/pages/WhatsNew.tsx
    git -c user.name=trial -c user.email=trial@invalid commit -q -am "trial join with Round 1328" && echo "joined at $(git rev-parse HEAD)"
    ;;
  build)
    P="$2"
    node_modules/.bin/vite build --outDir "dist-$P" --emptyOutDir > "/tmp/build-$P.log" 2>&1 || { tail -20 "/tmp/build-$P.log"; exit 2; }
    tail -2 "/tmp/build-$P.log"
    nohup node scripts/lib/hostLikeServer.mjs "dist-$P" "$P" > "/tmp/server-$P.log" 2>&1 &
    for i in 1 2 3 4 5 6 7 8 9 10; do curl -s -o /dev/null "http://localhost:$P/club-manager" && break; sleep 1; done
    curl -s -o /dev/null -w "served on $P: %{http_code}\n" "http://localhost:$P/club-manager"
    ;;
  *) echo "say merge or build <port>"; exit 2 ;;
esac
