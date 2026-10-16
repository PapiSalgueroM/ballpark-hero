#!/usr/bin/env bash
# Round 1346 fixer: run one harness's controls and print each one's exit code and last line.
# usage: bash ctl.sh <family>
# A control is counted as working when its exit code is the one the harness documents for "fired":
#   ret, skips: exit 1 and a last line "CONTROL <name> FIRED"
#   poach, prospect: exit 0 (the harness asserts the exact intended failures itself)
#   predraft: exit 1, "control <name>: mutated" and "simCareerPreDraft ... FAILURE(S)" in the log (the workflow's test)
set -u
fam="$1"; s=0; out="${RC_OUT:-/tmp}/ctl-$fam"; mkdir -p "$out"
run() { # name env-assignment script
  local name="$1" envset="$2" script="$3" log="$out/$1.log"
  env "$envset" node "$script" > "$log" 2>&1; local e=$?
  local last; last=$(grep -v '^\s*$' "$log" | tail -1 | cut -c1-200)
  echo "$name exit=$e | $last"
  case "$fam" in
    ret|skips) [ "$e" -eq 1 ] && grep -q "CONTROL $name FIRED" "$log" || s=1 ;;
    poach|prospect) [ "$e" -eq 0 ] || s=1 ;;
    predraft) [ "$e" -eq 1 ] && grep -qF "control $name: mutated" "$log" && grep -qE "simCareerPreDraft .*FAILURE\(S\)" "$log" || s=1 ;;
  esac
}
case "$fam" in
  ret) for c in drift early noretire noguard nosit noaccept norefresh; do run "$c" "US_COACH_RETIRE_CONTROL=$c" scripts/simUsCoachRetirement.mjs; done ;;
  skips) for c in noundo leak graded clamp; do run "$c" "US_CAREER_SKIPS_CONTROL=$c" scripts/simUsCareerSkips.mjs; done ;;
  poach) for c in phantom credit rng; do run "$c" "US_COACH_POACHING_CONTROL=$c" scripts/simUsCoachPoaching.mjs; done ;;
  prospect) for c in before save restore handoff duplicate choice invalid showcase undrafted archive corrupt back rules historical outcome; do run "$c" "US_CAREER_PROSPECT_CONTROL=$c" scripts/simUsCareerProspect.mjs; done ;;
  predraft) for c in randomteam flatstock flatlottery mathrandom cardwords showcasewords erarule ceiling ladderskip undraftedtop squeeze laterlottery flatlater loadershallow gradeshift extradraw; do run "$c" "SIM_PRE_DRAFT_CONTROL=$c" scripts/simCareerPreDraft.mjs; done ;;
  *) echo "unknown family $fam"; exit 2 ;;
esac
echo "family $fam: $([ $s -eq 0 ] && echo 'every control fired as documented' || echo 'A CONTROL DID NOT FIRE AS DOCUMENTED')"
exit $s
