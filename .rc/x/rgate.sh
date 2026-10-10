#!/usr/bin/env bash
# Reviewer's compact gate for one mutation: bash .rc/x/rgate.sh <mutation> <fleet|nofleet> [extra harness names...]
# Prints "MUT <name>: h1=exit h2=exit ..." and exits 1 when ANY harness went red (the mutation was killed),
# 0 when every harness stayed green (the mutation SURVIVED).
M="$1"; F="$2"; shift; shift
B=46e4231cc82b6c047da6e0b4bdb5dfae5628a928
mkdir -p "$RC_OUT/$M"
out=""; any=0
run() {
  local n="$1"; shift
  timeout 900 env TZ=UTC "$@" > "$RC_OUT/$M/$n.log" 2>&1
  local s=$?
  out="$out $n=$s"
  [ $s -eq 0 ] || any=1
}
run leaguefx CM_LEAGUE_FIXTURES_EXPECT=10 CM_LEAGUE_FIXTURES_EXPECT_FROZEN=10 CM_LEAGUE_FIXTURES_EXPECT_BOUND=10 node scripts/simCmLeagueFixtures.mjs
for L in premier laliga bundesliga championship; do
  run "cmfix-$L" CM_FIXTURE_BASE=$B CM_REAL_FIXTURE_LEAGUE=$L node scripts/simCmRealFixtures.mjs
done
if [ "$F" = "fleet" ]; then run fleet CM_FIXTURE_BASE=$B node scripts/simCmFixtureFleet.mjs; fi
run daily node scripts/simDailyDeals.mjs
run fixbal node scripts/simFixtureBalance.mjs
for h in "$@"; do run "$h" node "scripts/$h.mjs"; done
# One line of evidence for each red harness.
for f in "$RC_OUT/$M"/*.log; do
  n=$(basename "$f" .log)
  case "$out" in *" $n=0"*) ;; *) echo "  $n: $(grep -E 'FAIL|RED|FAILURE|Error' "$f" | head -1 | cut -c1-200)";; esac
done
echo "MUT $M:$out"
exit $any
