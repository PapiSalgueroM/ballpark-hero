#!/usr/bin/env bash
# Round 1513 fixer, runner only, never committed: runs the named simCmSavePoints controls one at a time.
# Each must exit 1 with a last line saying it FIRED; prints each control's real exit code and last line.
bad=0
for c in "$@"; do
  out=$(SIM_CM_POINTS_CONTROL=$c node scripts/simCmSavePoints.mjs 2>&1); s=$?
  last=$(printf '%s\n' "$out" | tail -1)
  bysec=$(printf '%s\n' "$out" | grep 'failures by section' | tail -1)
  echo "control $c exit=$s | $last | $bysec"
  case "$last" in *FIRED*) [ "$s" -eq 1 ] || bad=1 ;; *) bad=1 ;; esac
done
if [ "$bad" -eq 0 ]; then echo "ctl1513: every control FIRED ($*)"; else echo "ctl1513: a control did not fire ($*)"; exit 1; fi
