# Round 1502 fixer: can E5 be held out of a release? Revert 4fccf89f (the proof's --holder-off) and 84f2a9ca (E5)
# in a throwaway worktree, keep the head's simWorldUcl.mjs (it reads E5's library only when it is there), then the
# type gate and simWorldUcl sections 0, 5, 6 and 1 on that tree. Exit 0 when the hold works.
R=$PWD; W=/tmp/e5off
git worktree add -q --detach $W HEAD && ln -s $R/node_modules $W/node_modules && cd $W || exit 2
git -c user.email=rc@example.com -c user.name=rc revert --no-commit 4fccf89f 84f2a9ca
echo "revert exit $?; conflicted: $(git diff --name-only --diff-filter=U | tr '\n' ' ')"
git checkout HEAD -- scripts/simWorldUcl.mjs
git status --short | head -20
if [ -n "$(git diff --name-only --diff-filter=U)" ]; then echo "E5HOLD: conflicts remain"; exit 1; fi
echo "holder lib present: $(test -f scripts/lib/worldUclHolder1502.mjs && echo yes || echo no); uclHolderOf in clubManager.ts: $(grep -c uclHolderOf src/lib/clubManager.ts)"
node_modules/.bin/tsc --noEmit -p tsconfig.app.json || { echo "E5HOLD: tsc red"; exit 1; }
mkdir -p $W-tmp
TMPDIR=$W-tmp WORLD_UCL_ONLY=0,5,6 node scripts/simWorldUcl.mjs | tail -6; s1=${PIPESTATUS[0]}
TMPDIR=$W-tmp WORLD_UCL_ONLY=1 WORLD_UCL_SEEDS=1,2 node scripts/simWorldUcl.mjs | tail -8; s2=${PIPESTATUS[0]}
echo "E5HOLD: sections 0,5,6 exit $s1; section 1 exit $s2"
[ "$s1" = 0 ] && [ "$s2" = 0 ]
