#!/usr/bin/env bash
# rec4.sh (fixer scratch, Round 1103, never committed). Runs on the GitHub runner from the repo root.
# Round 1104's digest ledger, through its own gate: DIGEST_RECORD=1 with DIGEST_ALLOW naming the keys this round
# means to move. It fails, and writes nothing, if a career outside the allow list moved. Done in a checkout of the
# branch's real head (HEAD^ here), so the other request lines keep reading the committed fixture.
set -u
REPO="$PWD"
D="$(mktemp -d)"
REAL="$(git rev-parse HEAD^)"
git worktree add --detach "$D/tree" "$REAL" > /dev/null 2>&1 || { echo "worktree add failed"; exit 2; }
ln -s "$REPO/node_modules" "$D/tree/node_modules"
cd "$D/tree" || exit 2
mkdir -p "$RC_OUT" "$D/tmp"
export TMPDIR="$D/tmp" TEMP="$D/tmp" TMP="$D/tmp"
F=src/test/fixtures/usCareerTruthDigest.json
cp "$F" "$D/before.json"
echo "== the gate: DIGEST_RECORD=1 DIGEST_ALLOW='nba|*' on $REAL"
DIGEST_RECORD=1 DIGEST_ALLOW='nba|*' node_modules/.bin/vitest run src/test/usCareerTruthDigest.test.ts --testTimeout=1800000 --hookTimeout=120000 > "$D/record.log" 2>&1; R=$?
grep -E "digest:|digest moved:|Tests |FAIL|AssertionError" "$D/record.log" | cut -c1-700
echo "record exit $R"
[ $R -eq 0 ] || { tail -30 "$D/record.log" | cut -c1-300; exit 1; }
node -e '
  const fs = require("fs");
  const a = JSON.parse(fs.readFileSync(process.argv[1], "utf8")), b = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  const by = {};
  for (const k of Object.keys(b.keys)) { const s = k.split("|")[0]; by[s] = by[s] || { keys: 0, moved: 0, careers: 0 }; by[s].keys++; if (a.keys[k].digest !== b.keys[k].digest) by[s].moved++; b.keys[k].c.forEach((c, i) => { if (c.split(":")[0] !== a.keys[k].c[i].split(":")[0]) by[s].careers++; }); }
  for (const s of Object.keys(by)) console.log(s + ": " + by[s].moved + " of " + by[s].keys + " keys moved, " + by[s].careers + " careers");
' "$D/before.json" "$F"
cp "$F" "$RC_OUT/usCareerTruthDigest.json"
sha256sum "$F"
echo "== the plain run on the new fixture"
node_modules/.bin/vitest run src/test/usCareerTruthDigest.test.ts --testTimeout=1800000 --hookTimeout=120000 > "$D/plain.log" 2>&1; P=$?
grep -E "Tests |FAIL|AssertionError" "$D/plain.log" | cut -c1-300
echo "plain exit $P"; exit $P
