#!/usr/bin/env bash
# Run each named harness (scripts/<name>.mjs) one after another and print "name exit=N | last line" for each, so a
# request line can carry a list. With EACH_ENV="VAR=value ..." every run gets those variables. Exits 0 when every
# run exited as EACH_WANT says (default 0), else 1 and names the ones that did not.
want="${EACH_WANT:-0}"; bad=""
for n in "$@"; do
  out=$(env $EACH_ENV node "scripts/$n.mjs" 2>&1); code=$?
  last=$(printf '%s\n' "$out" | grep -v '^\s*$' | tail -1 | cut -c1-220)
  echo "$n exit=$code | $last"
  [ "$code" = "$want" ] || bad="$bad $n"
done
echo "each: $# run, ${bad:+NOT AS WANTED:$bad}${bad:-all as wanted (exit $want)}"
[ -z "$bad" ]
