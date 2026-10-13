#!/usr/bin/env bash
# Round 1319: run named controls of simCareerPreDraft and print, for each, the exit code, the closing line
# and the sections its FAIL lines sit in. Never committed. Usage: bash ctl.sh <outdir> control...
out="$1"; shift
mkdir -p "$out"
for c in "$@"; do
  SIM_PRE_DRAFT_CONTROL="$c" node scripts/simCareerPreDraft.mjs > "$out/$c.log" 2>&1
  code=$?
  secs=$(awk '/^[0-9]+b?\. /{sec=$1} /FAIL:/{print sec}' "$out/$c.log" | sort | uniq -c | tr '\n' ' ' | tr -s ' ')
  mut=$(grep -c "control $c: mutated" "$out/$c.log")
  echo "$c exit=$code mutated=$mut | fails by section: $secs| $(tail -1 "$out/$c.log" | cut -c1-90)"
done
