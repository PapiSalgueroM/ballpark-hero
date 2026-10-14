#!/usr/bin/env bash
# Run a harness once per control and print each control's exit code and last line.
#   bash ctl.sh <ENV_NAME> <script> <control> [<control> ...]
# A control is good when it exits 1 and its last line says it fired (or names the failure).
VAR=$1; SCRIPT=$2; shift 2
bad=0
for c in "$@"; do
  env "$VAR=$c" node "$SCRIPT" > /tmp/ctl-$c.txt 2>&1; e=$?
  echo "$c exit=$e | $(tail -1 /tmp/ctl-$c.txt | cut -c1-220)"
  [ "$e" = 1 ] || bad=1
done
echo "ctl: $([ $bad = 0 ] && echo "every control exited 1" || echo "A CONTROL DID NOT EXIT 1")"
exit $bad
