#!/usr/bin/env bash
# marks.sh (fixer scratch, Round 1103, never committed). Runs on the GitHub runner from the repo root.
# Re-derives the NBA standout marks on this tree, the way scripts/genCareerHallMarks.mjs says to (six measuring
# runs, the generator, the table pasted, six runs and the generator again), for the NBA only, in a separate
# checkout so the other request lines are not disturbed. Then measures the Hall rate at each trial scale.
#   usage: bash .rc/x/marks.sh "<scales, space separated; the first one gets the second pass>"
set -u
SCALES="${1:-1}"
REPO="$PWD"
D="$(mktemp -d)"
TREE="$D/tree"
git worktree add --detach "$TREE" HEAD > /dev/null 2>&1 || { echo "worktree add failed"; exit 2; }
ln -s "$REPO/node_modules" "$TREE/node_modules"
cd "$TREE" || exit 2
mkdir -p "$RC_OUT"

# The generator, held to the NBA: the committed file with its sport loop narrowed, nothing else touched.
GEN=scripts/zzGenNbaOnly.mjs
sed 's/^for (const sport of Object.keys(POSITIONS)) {$/for (const sport of ["nba"]) {/' scripts/genCareerHallMarks.mjs > "$GEN"
if [ "$(grep -c '^for (const sport of \["nba"\]) {$' "$GEN")" != "1" ]; then echo "the generator's sport loop is not where this script narrows it"; exit 2; fi

six_runs() { # $1 = directory for the rows
  local dir="$1"; mkdir -p "$dir"
  one() { local label="$1" seed="$2"; local t="$dir/tmp-$label"; mkdir -p "$t"
    ( export TMPDIR="$t" TEMP="$t" TMP="$t" SIM_SKIP_BOARD=1 SIM_DUMP_ROWS="$dir/rows-nba-$label.json"
      if [ -n "$seed" ]; then export SIM_SEED="$seed"; fi
      node scripts/simCareerHall.mjs nba 2000 > "$dir/run-$label.log" 2>&1; echo "  run $label exit=$? (3 is the skipped board, expected) $(tail -1 "$dir/run-$label.log" | cut -c1-120)" ); }
  one base "" & one 1 1 & one 2 2 & wait
  one 3 3 & one 4 4 & one 5 5 & wait
}
splice() { # $1 = nba only ledger, $2 = where the whole ledger goes
  node -e '
    const fs = require("fs");
    const whole = JSON.parse(fs.readFileSync("scripts/data/careerHallMarks.json", "utf8"));
    const before = JSON.stringify({ ...whole.sports, nba: 0 });
    whole.sports.nba = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).sports.nba;
    if (JSON.stringify({ ...whole.sports, nba: 0 }) !== before) { console.error("another sport moved"); process.exit(1); }
    fs.writeFileSync(process.argv[2], JSON.stringify(whole, null, 1) + "\n");
  ' "$1" "$2"
}

echo "== pass 1: the marks on this tree's line"
six_runs "$D/p1"
MARKS_OUT="$D/p1/nba.json" node "$GEN" "$D/p1" > "$D/p1/gen.log" 2>&1; echo "gen pass 1 exit=$?"
cat "$D/p1/gen.log"
splice "$D/p1/nba.json" "$D/p1/ledger.json" || exit 1
cp "$D/p1/ledger.json" "$RC_OUT/careerHallMarks-pass1.json"
cp "$D/p1/ledger.json" scripts/data/careerHallMarks.json
node "$REPO/.rc/x/patchNbaHallTable.mjs" "$D/p1/ledger.json" src/lib/nbaMyCareer.ts > "$RC_OUT/table.txt" 2>&1; echo "table patch exit=$?"
cat "$RC_OUT/table.txt"

echo "== the Hall rate at each trial scale, on the new table (full size, five seeds)"
for S in $SCALES; do
  ( t="$D/sense-$S"; mkdir -p "$t"; export TMPDIR="$t" TEMP="$t" TMP="$t"
    SENSE_TRY_SCALE="$S" node scripts/simNbaAwardsSense.mjs > "$RC_OUT/sense-scale-$S.log" 2>&1
    echo "  scale $S exit=$? | $(grep -E '\[H\]' "$RC_OUT/sense-scale-$S.log" | cut -c1-230 | tr '\n' '|')" ) &
done
wait
for S in $SCALES; do grep -E "Hall of Fame inducted, percent|first ballot, percent|inducted, modern|inducted, 2003|legacy score p50|^simNbaAwardsSense|red sections" "$RC_OUT/sense-scale-$S.log" | cut -c1-200; done

FIRST="$(echo $SCALES | cut -d' ' -f1)"
echo "== pass 2 at scale $FIRST: the outcome and the bands on the new table"
sed -i "s/^export const NBA_LEGACY_NEW_LINE_SCALE: number = [0-9.]*;$/export const NBA_LEGACY_NEW_LINE_SCALE: number = $FIRST;/" src/lib/nbaMyCareer.ts
grep -n "^export const NBA_LEGACY_NEW_LINE_SCALE" src/lib/nbaMyCareer.ts
six_runs "$D/p2"
MARKS_OUT="$D/p2/nba.json" node "$GEN" "$D/p2" > "$D/p2/gen.log" 2>&1; echo "gen pass 2 exit=$?"
cat "$D/p2/gen.log"
splice "$D/p2/nba.json" "$D/p2/ledger.json" || exit 1
cp "$D/p2/ledger.json" "$RC_OUT/careerHallMarks-pass2-scale-$FIRST.json"
cp "$D/p2/ledger.json" scripts/data/careerHallMarks.json
node "$REPO/.rc/x/patchNbaHallTable.mjs" "$D/p2/ledger.json" src/lib/nbaMyCareer.ts | head -1
echo "== simCareerHall nba on the new ledger and table at scale $FIRST (the whole harness, board included)"
node scripts/simCareerHall.mjs nba > "$RC_OUT/hall-nba-scale-$FIRST.log" 2>&1; echo "simCareerHall nba exit=$?"
grep -E "17 \(|19 \(|16 never|FAIL|RED|GREEN|simCareerHall nba" "$RC_OUT/hall-nba-scale-$FIRST.log" | cut -c1-400 | tail -40
rm -f "$GEN"
cd "$REPO" && git worktree remove --force "$TREE" > /dev/null 2>&1
echo "marks.sh done"
