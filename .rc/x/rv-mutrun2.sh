#!/usr/bin/env bash
# Reviewer (runner lens): apply ONE mutation on the runner's checkout, run the named checks one after another,
# put the tree back, and end on one line "MUT <name>: check=exit ...". Needs #!serial in the request.
set -u
NAME="$1"; shift
OUT="${RC_OUT:-/tmp}/mut-$NAME.txt"
: > "$OUT"
if ! node .rc/x/rv-mut2.mjs "$NAME"; then echo "MUT $NAME: NOT APPLIED"; exit 9; fi
git diff --stat | tail -3
RES=""
for chk in "$@"; do
  case "$chk" in
    truth) cmd="node scripts/simNflTruth.mjs" ;;
    bank) cmd="node scripts/simUsCareerBank.mjs" ;;
    banking) cmd="node scripts/simCareerBanking.mjs" ;;
    digest) cmd="node_modules/.bin/vitest run src/test/usCareerTruthDigest.test.ts --testTimeout=1800000 --hookTimeout=120000" ;;
    vround) cmd="node_modules/.bin/vitest run src/test/usCareerBank.test.ts src/test/usCareerRookieDeal.test.ts src/test/usCareerSmallItems1104.test.ts src/test/usFranchiseYears.test.ts src/test/usSeason.test.ts src/test/usCareerProspect.test.tsx src/test/careerPreDraft.test.tsx --testTimeout=300000 --hookTimeout=120000" ;;
    vwide) cmd="node_modules/.bin/vitest run src/test/usCareerStatLines.test.tsx src/test/usCareerReveals.test.tsx src/test/careerSeasonReview.test.tsx src/test/careerRecordedStats.test.tsx src/test/usCareerSummer.test.tsx src/test/careerHall.test.tsx --testTimeout=300000 --hookTimeout=120000" ;;
    nflcareer) cmd="node scripts/simNflCareer.mjs" ;;
    awards) cmd="node scripts/simAwards.mjs" ;;
    realism) cmd="node scripts/simCareerRealism.mjs" ;;
    parity) cmd="node scripts/simCareerParity.mjs" ;;
    badges) cmd="node scripts/simCareerBadges.mjs" ;;
    boardparity) cmd="node scripts/simUsBoardParity.mjs" ;;
    deckc) cmd="node scripts/simUsCareerDeckC.mjs" ;;
    prospect) cmd="node scripts/simUsCareerProspect.mjs" ;;
    predraft) cmd="node scripts/simCareerPreDraft.mjs" ;;
    facts) cmd="node scripts/simCareerFacts.mjs" ;;
    nbacareer) cmd="node scripts/simNbaCareer.mjs" ;;
    *) cmd="echo unknown check $chk; false" ;;
  esac
  bash -c "$cmd" > "/tmp/mut-$NAME-$chk.log" 2>&1
  rc=$?
  last=$(sed 's/\x1b\[[0-9;]*m//g' "/tmp/mut-$NAME-$chk.log" | grep -v '^\s*$' | tail -1 | cut -c1-200)
  echo "$chk exit=$rc | $last" >> "$OUT"
  grep -a "FAIL\|RED\|✗\|×\|AssertionError\|needs its needle" "/tmp/mut-$NAME-$chk.log" | sed 's/\x1b\[[0-9;]*m//g' | head -6 | cut -c1-240 >> "$OUT"
  RES="$RES $chk=$rc"
done
git checkout -q -- src scripts
cat "$OUT"
echo "MUT $NAME:$RES"
