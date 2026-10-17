#!/usr/bin/env bash
# Light probe: does every commit-forming kit helper still form its base on this tree? Each helper runs exactly as the
# kit calls it (from BIG-gate/x), with LIFEBH_HEAD/HEAD at the ref given as $1 (default HEAD) via a detached index only.
# Prints one line per helper: exit code and the commit it printed. Writes git objects only, never the work tree.
X=${HX:-.rc/x}
run() { local label=$1; shift; out=$("$@" 2>/tmp/hf.err); s=$?; out=$(printf '%s\n' "$out" | tail -1); echo "$label: exit $s ${out:0:12} $(grep -v '^$' /tmp/hf.err | tail -1 | cut -c1-140)"; }
# GROUP=a runs the coreBE and lifeBH lines only, GROUP=b everything else (each half stays under the tool timeout).
if [ "${GROUP:-a}" = a ]; then
for r in f727cfbf ffc16131 80084c4b 50f49993 33b722fb 26cad60f 25c6b0d2; do run "coreBE $r" bash $X/coreBE.sh $r; done
for r in 527ca178f6b3a0be194b7aeac09d412db49088d4 42a7f7c999cb13bb24bf0992537e4ff84b112f6d 1b383132351440d16753d67af94550608a85ba87 bd3b62443d992b92c22bd303437cb3aa1c5eae5c; do run "lifeBH ${r:0:8}" bash $X/lifeBH.sh $r; done
exit 0
fi
run "minus1335" bash $X/minus1335.sh
run "minus1343" bash $X/minus1343.sh
run "lifeMinus 286" bash $X/lifeMinus.sh 286
run "lifeMinus 302" bash $X/lifeMinus.sh 302
run "phoneMinus 289" bash $X/phoneMinus.sh 289
run "phoneMinus 297" bash $X/phoneMinus.sh 297
for m in 284 296 287 301; do run "minus$m" bash $X/minus$m.sh; done
run "twm 1337" node scripts/lib/treeWithoutMerge.mjs 33d1b7b6 c2f8d746
[ -n "$M20" ] && run "twm 1334" node scripts/lib/treeWithoutMerge.mjs $M20 33d1b7b6
run "twm 1332" node scripts/lib/treeWithoutMerge.mjs b9df63b4 26eadaaa
run "twm 1338" node scripts/lib/treeWithoutMerge.mjs a7094670 e814c2de
run "twm 1344" node scripts/lib/treeWithoutMerge.mjs 54100f6e b31c9894
