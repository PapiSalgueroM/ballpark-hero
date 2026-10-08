#!/usr/bin/env bash
# Round 1051 fixer scratch. Travels as .rc/x/rc-controls.sh. Every simCareerHall control that needs no board loop,
# for one sport, one after another, each with its own temp folder. A control is "as expected" when its exit code is
# the one named here: 1 is FIRED, 2 is a refusal (its string is not in the source, or it cannot fire in the sport).
# usage: bash .rc/x/rc-controls2.sh <nfl|nba|mlb|nhl>
S="$1"; fail=0; n=0
run() { # mode control wanted
  local mode="$1" c="$2" want="$3" T got last
  T=$(mktemp -d)
  TMPDIR="$T" TEMP="$T" TMP="$T" SIM_SKIP_BOARD=1 SIM_CONTROL="$c" node scripts/simCareerHall.mjs "$S" > "$T/log" 2>&1
  got=$?
  last=$(tail -1 "$T/log" | cut -c1-230)
  n=$((n + 1))
  if [ "$got" = "$want" ]; then echo "ok   $S $c exit=$got | $last"
  elif [ "$mode" = info ]; then echo "info $S $c exit=$got (no expectation recorded for this sport) | $last"
  else echo "MISS $S $c exit=$got wanted $want | $last"; fail=$((fail + 1)); fi
}
# Round 1051's controls that fire in every sport.
for c in v1drift calflip v2drift below nostandout markdrift todrift noramp catchersteals twofamilies examplelie nocardline clausealways wholesheet plantbase seasonbig nostamp ballotflip anchorwiki; do run must "$c" 1; done
# The ones that fire where they can and refuse elsewhere.
case "$S" in
  nfl) run must nobase 1; run must standoutbig 1; run must standoutgone 2; run must decisionback 1; run must basebig 1 ;;
  nba) run must nobase 2; run must standoutbig 1; run must standoutgone 2; run must decisionback 2; run must basebig 2 ;;
  mlb) run must nobase 2; run must standoutbig 1; run must standoutgone 2; run must decisionback 1; run must basebig 2 ;;
  nhl) run must nobase 2; run must standoutbig 2; run must standoutgone 1; run must decisionback 2; run must basebig 2 ;;
esac
# The engine loop controls of Rounds 915 and 1039 (the lift and the stamp moved lines they rewrite). The builder
# saw all fourteen fire in basketball; the other sports are printed for the record.
M=info; [ "$S" = nba ] && M=must
for c in everyonein bindhof outcomeswap nominationgone waitoff flatfirst nopromise mathrandom sharesides farewelloff retireoff notalk jerseyfirst jerseyraw; do run "$M" "$c" 1; done
if [ "$S" = mlb ]; then run must oldcurve 1; run must shownraw 1; fi
echo "controls $S: $n run, $fail not as expected"
[ "$fail" = 0 ]
