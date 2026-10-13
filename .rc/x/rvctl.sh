#!/usr/bin/env bash
# Reviewer (run lens), Round 1319: run ONE control of simCareerPreDraft on one seed set and exit with the
# harness's own exit code. The last line names the control, the exit code, whether the needle was mutated,
# the sections the FAIL lines sit in, and the harness's own closing line. Never committed.
# Usage: bash rvctl.sh <control> [seedset]
c="$1"; ss="${2:-a}"
log="${RC_OUT:-/tmp}/ctl-$c-$ss.log"
mkdir -p "$(dirname "$log")"
SEEDSET="$ss" SIM_PRE_DRAFT_CONTROL="$c" node scripts/simCareerPreDraft.mjs > "$log" 2>&1
code=$?
secs=$(awk '/^[0-9]+b?\. /{sec=$1} /FAIL:/{print sec}' "$log" | sort | uniq -c | tr '\n' ' ' | tr -s ' ')
mut=$(grep -c "control $c: mutated" "$log")
threw=$(grep -c "threw" "$log")
refused=$(grep -c "Refusing to run" "$log")
echo "CTL $c seed=$ss exit=$code mutated=$mut threw=$threw refused=$refused | sections: $secs| $(tail -1 "$log" | cut -c1-100)"
exit $code
