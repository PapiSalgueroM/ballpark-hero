#!/usr/bin/env bash
# rec.sh (fixer scratch, Round 1103, never committed). Runs on the GitHub runner from the repo root.
# Round 1051's own recipe (scripts/genCareerHallMarks.mjs, "WHICH TABLE THE MARKS GO INTO"): before the release
# that first ships calibration 2, a round that moves the marks records calibration 2 again with SIM_RECORD_V2=1.
# This does it for the NBA only, in a separate checkout so the other request lines read the committed file,
# proves the other three sports' part of the recording did not move, hands the file back, and then runs the
# whole of simCareerHall nba (and its v2drift control) against the new recording.
set -u
REPO="$PWD"
D="$(mktemp -d)"
git worktree add --detach "$D/tree" HEAD > /dev/null 2>&1 || { echo "worktree add failed"; exit 2; }
ln -s "$REPO/node_modules" "$D/tree/node_modules"
cd "$D/tree" || exit 2
mkdir -p "$RC_OUT" "$D/tmp"
export TMPDIR="$D/tmp" TEMP="$D/tmp" TMP="$D/tmp"

echo "== before the recording (the committed file, board skipped): expect v2replay red on the table only"
SIM_SKIP_BOARD=1 node scripts/simCareerHall.mjs nba > "$D/before.log" 2>&1; echo "exit $?"
grep -E "15 \(d\)|v2replay|^simCareerHall" "$D/before.log" | cut -c1-400

cp scripts/data/careerHallV2.json "$D/v2-before.json"
echo "== recording"
SIM_RECORD_V2=1 SIM_SKIP_BOARD=1 node scripts/simCareerHall.mjs nba > "$D/record.log" 2>&1; echo "exit $? (a recording run never ends green)"
grep -E "15 \(d\)|^simCareerHall" "$D/record.log" | cut -c1-400

node -e '
  const fs = require("fs");
  const a = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  const b = JSON.parse(fs.readFileSync("scripts/data/careerHallV2.json", "utf8"));
  const others = o => JSON.stringify({ ...o.sports, nba: 0 }) + JSON.stringify(o.rules) + JSON.stringify(o.note);
  if (others(a) !== others(b)) { console.error("another sport, the rules or the note moved in the recording"); process.exit(1); }
  const ra = a.sports.nba.readings, rb = b.sports.nba.readings;
  const moved = rb.filter((r, i) => JSON.stringify(r) !== JSON.stringify(ra[i])).length + Math.abs(ra.length - rb.length);
  console.log("other sports, rules, note: unchanged. nba table changed: " + (JSON.stringify(a.sports.nba.table) !== JSON.stringify(b.sports.nba.table)) + "; nba readings: " + rb.length + ", told something else than Round 1051 recorded: " + moved + "; with a standout: " + rb.filter(r => r.standout).length);
' "$D/v2-before.json" || exit 1
cp scripts/data/careerHallV2.json "$RC_OUT/careerHallV2.json"
sha256sum scripts/data/careerHallV2.json

echo "== the whole harness on the new recording"
node scripts/simCareerHall.mjs nba > "$D/full.log" 2>&1; FULL=$?
grep -E "15 \(d\)|^\s+(ok|FAIL)\s+(v2replay|words|marks|standoutcap|halfrule|v1replay)|^simCareerHall" "$D/full.log" | cut -c1-300
cp "$D/full.log" "$RC_OUT/hall-nba-on-new-recording.log"
echo "full run exit $FULL"

echo "== control v2drift on the new recording (board skipped): must go red on v2replay"
SIM_CONTROL=v2drift SIM_SKIP_BOARD=1 node scripts/simCareerHall.mjs nba > "$D/drift.log" 2>&1; echo "exit $?"
grep -E "v2replay|control|^simCareerHall" "$D/drift.log" | cut -c1-300 | tail -5
exit $FULL
