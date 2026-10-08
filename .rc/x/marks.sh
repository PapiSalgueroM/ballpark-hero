#!/usr/bin/env bash
# marks.sh (fixer scratch, Round 1103, never committed). Runs on the GitHub runner from the repo root.
# Re-derives the NBA part of the Hall marks ledger on this tree, the way scripts/genCareerHallMarks.mjs says to
# (six measuring runs, the generator, the table pasted, six runs and the generator again), for the NBA only, in a
# separate checkout so the other request lines are not disturbed. Measures the Hall rate at each trial scale,
# then runs the whole of simCareerHall nba (and its controls) on the new ledger.
#   usage: bash .rc/x/marks.sh "<trial scales, space separated>"
set -u
SCALES="${1:-}"
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
    const gen = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const others = o => JSON.stringify({ ...o, nba: 0 });
    const before = others(whole.sports) + others(whole.excluded) + others(whole.labels) + JSON.stringify(whole.rules);
    whole.sports.nba = gen.sports.nba; whole.excluded.nba = gen.excluded.nba; whole.labels.nba = gen.labels.nba;
    if (others(whole.sports) + others(whole.excluded) + others(whole.labels) + JSON.stringify(gen.rules) !== before) { console.error("another sport or a rule moved"); process.exit(1); }
    fs.writeFileSync(process.argv[2], JSON.stringify(whole, null, 1) + "\n");
  ' "$1" "$2"
}

echo "== pass 1: the marks on this tree's line"
six_runs "$D/p1"
MARKS_OUT="$D/p1/nba.json" node "$GEN" "$D/p1" > "$D/p1/gen.log" 2>&1; echo "gen pass 1 exit=$?"
grep -E "standout:|base terms|within five" "$D/p1/gen.log" | cut -c1-300
splice "$D/p1/nba.json" "$D/p1/ledger.json" || exit 1
cp "$D/p1/ledger.json" scripts/data/careerHallMarks.json
node "$REPO/.rc/x/patchNbaHallTable.mjs" "$D/p1/ledger.json" src/lib/nbaMyCareer.ts | head -1

echo "== pass 2: the outcome and the bands on the committed table and constant"
six_runs "$D/p2"
MARKS_OUT="$D/p2/nba.json" node "$GEN" "$D/p2" > "$D/p2/gen.log" 2>&1; echo "gen pass 2 exit=$?"
cat "$D/p2/gen.log"
splice "$D/p2/nba.json" "$D/p2/ledger.json" || exit 1
cp "$D/p2/ledger.json" "$RC_OUT/careerHallMarks.json"
cp "$D/p2/ledger.json" scripts/data/careerHallMarks.json
node "$REPO/.rc/x/patchNbaHallTable.mjs" "$D/p2/ledger.json" src/lib/nbaMyCareer.ts | head -1
rm -f "$GEN"

echo "== the Hall rate on the new table: the committed constant, then each trial scale (full size, five seeds)"
( t="$D/sense-c"; mkdir -p "$t"; export TMPDIR="$t" TEMP="$t" TMP="$t"
  node scripts/simNbaAwardsSense.mjs > "$RC_OUT/sense-committed.log" 2>&1; echo "  committed constant exit=$?" ) &
for S in $SCALES; do
  ( t="$D/sense-$S"; mkdir -p "$t"; export TMPDIR="$t" TEMP="$t" TMP="$t"
    SENSE_TRY_SCALE="$S" node scripts/simNbaAwardsSense.mjs > "$RC_OUT/sense-scale-$S.log" 2>&1; echo "  scale $S exit=$?" ) &
done
wait
for S in committed $(for S in $SCALES; do echo "scale-$S"; done); do
  echo "-- $S"; grep -E "Hall of Fame inducted, percent|first ballot, percent|inducted, modern|inducted, 2003|legacy score p50|^simNbaAwardsSense|red sections|FAIL" "$RC_OUT/sense-$S.log" | cut -c1-260
done

echo "== simCareerHall nba on the new ledger and table (the whole harness, board included)"
node scripts/simCareerHall.mjs nba > "$RC_OUT/hall-nba.log" 2>&1; echo "simCareerHall nba exit=$?"
grep -E "^  1[5-9] |^  20 |17 \(|19 \(|16 never|FAIL|RED|GREEN|simCareerHall nba" "$RC_OUT/hall-nba.log" | cut -c1-420 | tail -40
echo "== its controls for the sections the ledger feeds (board skipped, as its header runs them)"
for C in markdrift todrift noramp catchersteals nostandout below; do
  ( t="$D/ctl-$C"; mkdir -p "$t"; export TMPDIR="$t" TEMP="$t" TMP="$t"
    SIM_SKIP_BOARD=1 SIM_CONTROL="$C" node scripts/simCareerHall.mjs nba > "$D/ctl-$C.log" 2>&1; echo "  control $C exit=$? | $(tail -1 "$D/ctl-$C.log" | cut -c1-200)" )
done
cd "$REPO" && git worktree remove --force "$TREE" > /dev/null 2>&1
echo "marks.sh done"
