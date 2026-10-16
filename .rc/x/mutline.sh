#!/usr/bin/env bash
# Reviewer mutation line (Round 1342), runner only: apply one mutation, run the named checks, restore, summarize.
# usage: bash .rc/x/mutline.sh <mutation id> <check>...   checks: tsc | ns | ns:<SECTIONS> | vt:<file,file> | sim:<name>
# Exit 1 = the mutation was CAUGHT (some check red), 0 = NOT CAUGHT (all green), 2 = could not run.
id="$1"; shift
node .rc/x/mut.mjs "$id" || { git checkout -- src scripts; echo "MUT $id CANNOT RUN"; exit 2; }
res=""; any=0
for c in "$@"; do
  log="$TMPDIR/$id-$(printf '%s' "$c" | tr -c 'A-Za-z0-9' '_').log"
  case "$c" in
    tsc) node_modules/.bin/tsc --noEmit -p tsconfig.app.json > "$log" 2>&1 ;;
    ns) node scripts/simCmNoSack.mjs > "$log" 2>&1 ;;
    ns:*) SECTION="${c#ns:}" node scripts/simCmNoSack.mjs > "$log" 2>&1 ;;
    vt:*) node_modules/.bin/vitest run $(printf '%s' "${c#vt:}" | tr ',' ' ') --testTimeout=300000 --hookTimeout=120000 > "$log" 2>&1 ;;
    sim:*) node "scripts/${c#sim:}.mjs" > "$log" 2>&1 ;;
    *) echo "unknown check $c"; git checkout -- src scripts; exit 2 ;;
  esac
  rc=$?
  echo "---- $c exit=$rc"
  grep -E "FAIL|Tests |Test Files|CANNOT|error TS|✗|×" "$log" | head -8
  tail -1 "$log"
  res="$res $c=$rc"
  [ "$rc" -ne 0 ] && any=1
done
git checkout -- src scripts
if [ "$any" -eq 1 ]; then echo "MUT $id CAUGHT:$res"; exit 1; fi
echo "MUT $id NOT CAUGHT (all green):$res"
exit 0
