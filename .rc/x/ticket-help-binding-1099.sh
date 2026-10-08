#!/usr/bin/env bash
# Remote-only proof for the distinct actual ticket rules-modal bindings. No application edits.
set -uo pipefail
test "${GITHUB_ACTIONS:-}" = true || exit 2
test -n "${RC_OUT:-}" && test -n "${RUNNER_TEMP:-}" || exit 2
BASE_HEAD=cd496098d1aa629ef8c49472fe09ee9ba08e938d
CHECKED_HEAD=01a9e8677e3de148dbc5a293e308f5e2ffc55df4
CHECKED_TREE=cdad1e3ac8fb34624683374d409f59e7a1c068a6
REQUEST_HEAD=$(git rev-parse HEAD)
WORK=$(mktemp -d "$RUNNER_TEMP/ticket-1099.XXXXXX") || exit 2
E="$WORK/evidence"
mkdir -p "$E/logs" "$E/dependencies" "$RC_OUT" || exit 2
export WORK E BASE_HEAD CHECKED_HEAD CHECKED_TREE REQUEST_HEAD
export CI=true TZ=UTC SIM_NETWORK=offline ENGINES=chromium SEO_SPLIT_BASE_REF=HEAD
declare -A gates
failed=0
execution_complete=0
ending=normal
active=
current_phase=
watchdog=
deadline=$(( $(date +%s) + 3600 ))
finalize() {
  local exit_code=$? archive packed bytes retained
  trap - EXIT TERM INT HUP
  test -z "$watchdog" || kill -TERM -- "-$watchdog" 2>/dev/null || true
  test "$exit_code" = 0 && test "$execution_complete" = 1 || failed=1
  printf 'exit=%s\nexecution_complete=%s\nending=%s\nlast_phase=%s\n' "$exit_code" "$execution_complete" "$ending" "$current_phase" > "$E/execution.txt" || failed=1
  # Preserve actual partial worker output on an early exit as well as normal completion.
  if test -d tycoon-ticket-policy-artifacts; then
    timeout -k 10 60 cp -R tycoon-ticket-policy-artifacts "$E/candidate-proof"; retained=$?
    printf 'candidate-proof\t%s\n' "$retained" >> "$E/retention.tsv"; test "$retained" = 0 || failed=1
  elif test "$execution_complete" = 1; then failed=1; printf 'candidate-proof\tmissing\n' >> "$E/retention.tsv"; fi
  printf '%s\n' "$failed" > "$E/intended-gate-failures.txt" || failed=1
  archive="$WORK/tycoon-ticket-1099-evidence.tar.xz"
  timeout -k 10 180 tar -c -I "xz -T2 -8" -f "$archive" -C "$E" .; packed=$?
  bytes=$(stat -c %s "$archive" 2>/dev/null || echo unavailable)
  if test "$packed" = 0 && test "$bytes" -le 24000000; then
    timeout -k 10 30 cp "$archive" "$RC_OUT/tycoon-ticket-1099-evidence.tar.xz" || failed=1
    timeout -k 10 20 sha256sum "$RC_OUT/tycoon-ticket-1099-evidence.tar.xz" > "$RC_OUT/evidence.sha256" || failed=1
    printf 'checked=%s\nrequest=%s\nbytes=%s\nfailed=%s\nexecution_complete=%s\nending=%s\n' "$CHECKED_HEAD" "$REQUEST_HEAD" "$bytes" "$failed" "$execution_complete" "$ending" > "$RC_OUT/receipt.txt" || failed=1
  else
    printf 'EVIDENCE CAP FAILURE: pack_exit=%s bytes=%s limit=24000000; full payload retained only at runner path %s, no truncated evidence accepted.\n' "$packed" "$bytes" "$archive" | tee "$RC_OUT/EVIDENCE-CAP-FAILURE.txt"
    failed=1
  fi
  printf 'Ticket modal1099 strict label: failed=%s, complete=%s, source=%s, request=%s.\n' "$failed" "$execution_complete" "$CHECKED_HEAD" "$REQUEST_HEAD"
  exit "$failed"
}
terminate() {
  ending="signal:$1"; failed=1
  if test -n "$active"; then
    printf '%s\tinterrupted\n' "$current_phase" >> "$E/gates.tsv"
    kill -TERM -- "-$active" 2>/dev/null || true
    sleep 2
    kill -KILL -- "-$active" 2>/dev/null || true
    wait "$active" 2>/dev/null || true
    active=
  fi
  exit 124
}
trap finalize EXIT
trap 'terminate TERM' TERM
trap 'terminate INT' INT
trap 'terminate HUP' HUP
# Leave at least ten minutes for bounded raw evidence retention before the kit timeout.
setsid bash -c 'sleep 3600; kill -TERM "$1"' _ "$$" & watchdog=$!
run() {
  local name=$1 seconds=$2 rc remaining; shift 2
  current_phase=$name
  remaining=$(( deadline - $(date +%s) ))
  if test "$remaining" -le 0; then
    gates["$name"]=124; printf '%s\t124\n' "$name" >> "$E/gates.tsv"
    ending=internal-deadline; failed=1; exit 124
  fi
  test "$seconds" -le "$remaining" || seconds=$remaining
  setsid timeout -k 10 "$seconds" "$@" <&0 > "$E/logs/$name.log" 2>&1 & active=$!
  wait "$active"; rc=$?; active=
  gates["$name"]=$rc
  printf '%s\t%s\n' "$name" "$rc" >> "$E/gates.tsv"
  printf '%s exit=%s\n' "$name" "$rc"; tail -n 5 "$E/logs/$name.log"
  test "$rc" = 0 || failed=1
  return 0
}
skip() { gates["$1"]=skipped; printf '%s\tskipped\n' "$1" >> "$E/gates.tsv"; failed=1; }
# Phase caps total 3330 seconds before small controller overhead; the 3600-second deadline leaves retention slack.
run identity 30 bash -euo pipefail -c '
  test "$(git rev-parse HEAD^)" = "$CHECKED_HEAD"
  test "$(git rev-parse "$CHECKED_HEAD^")" = "$BASE_HEAD"
  test "$(git rev-parse "$CHECKED_HEAD^{tree}")" = "$CHECKED_TREE"
  git diff --exit-code HEAD
  printf "%s\n" .github/workflows/lane-remote-check.yml .rc/request.txt .rc/run.sh .rc/x/ticket-help-binding-1099.sh | LC_ALL=C sort > "$E/allowed-overlay.txt"
  git diff --name-only --no-renames "$CHECKED_HEAD" HEAD | LC_ALL=C sort > "$E/actual-overlay.txt"
  cmp "$E/allowed-overlay.txt" "$E/actual-overlay.txt"
  printf "%s\n" "fbbae1f620ea4ea98a491319868f6f57f0135518d355e16e179a50dc013f9480  .rc/request.txt" "668aeb520674d130f1af2e88494775afff6b8055d9911c715a8b646056b4b62f  .rc/run.sh" "447a4eca8616f708831ec5e6b7bf90ba68afc606054c0e0d0b27b4cb84abec20  .github/workflows/lane-remote-check.yml" > "$E/reviewed-kit.sha256"
  sha256sum -c "$E/reviewed-kit.sha256"
  sha256sum .rc/x/ticket-help-binding-1099.sh > "$E/dispatched-shell.sha256"
  printf "%s\n" "dc06bdd2f161cd14a0fa79e80871f4f64aea05676b872eb6a94baf9362c9ffbc  src/test/tycoonTicketPolicy.test.tsx" "fb0c955f580d9202727a4b0e2551aca4bc0674645354ad287ddf31c67b33ce8f  scripts/simTycoonTicketPolicy.mjs" > "$E/reviewed-source.sha256"
  sha256sum -c "$E/reviewed-source.sha256"
  printf "%s\n" docs/PROJECT-STATE.md scripts/simTycoonTicketPolicy.mjs src/test/tycoonTicketPolicy.test.tsx | LC_ALL=C sort > "$E/allowed-candidate.txt"
  git diff --name-only --no-renames "$BASE_HEAD" "$CHECKED_HEAD" | LC_ALL=C sort > "$E/actual-candidate.txt"
  cmp "$E/allowed-candidate.txt" "$E/actual-candidate.txt"
  git rev-parse HEAD HEAD^ "HEAD^{tree}" > "$E/identity.txt"
  git ls-tree -r HEAD > "$E/git-runtime-manifest.txt"
  git ls-tree -r "$CHECKED_HEAD" > "$E/git-checked-manifest.txt"
  git ls-tree -r "$BASE_HEAD" > "$E/git-base-manifest.txt"
  git ls-files -z > "$E/runtime-paths.nul"
  git ls-files -z | sort -z | xargs -0 sha256sum > "$E/source-before.sha256"
  git diff "$BASE_HEAD" "$CHECKED_HEAD" -- src/test/tycoonTicketPolicy.test.tsx scripts/simTycoonTicketPolicy.mjs > "$E/test-only.diff"
  git show "$BASE_HEAD:src/test/tycoonTicketPolicy.test.tsx" > "$E/parent-test.tsx"
  git show "$BASE_HEAD:scripts/simTycoonTicketPolicy.mjs" > "$E/parent-wrapper.mjs"
  command -v xz; xz --version
  selected=(
    src/test/tycoonTicketPolicy.test.tsx scripts/simTycoonTicketPolicy.mjs
    src/lib/stadiumTycoon.ts src/hooks/useStadiumTycoon.ts src/components/tycoon/TicketPolicyCard.tsx src/pages/StadiumTycoon.tsx src/main.tsx
    src/test/tycoonPitch.test.tsx src/lib/leagueCore.ts src/lib/tycoonRewards.ts src/hooks/useOwnedTimeouts.ts src/lib/wonderkidFactory.ts src/components/tycoon/TycoonPitch.tsx
    src/test/fixtures/tycoonSaves.json scripts/fixtures/tycoon1080Baseline/stadiumTycoon.ts scripts/fixtures/tycoon1080Baseline/useStadiumTycoon.ts
    src/test/dailyReload/mocks.ts src/test/dailyReload/harness.tsx src/test/setup.ts
    package.json package-lock.json vitest.config.ts vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json tailwind.config.ts postcss.config.js index.html
    scripts/runAllSims.mjs scripts/simAdsense.mjs scripts/simBrand.mjs scripts/simHeadTags.mjs scripts/simHiddenPages.mjs scripts/simHubs.mjs scripts/simIndexNow.mjs scripts/simIndexing.mjs scripts/simInternalLinks.mjs scripts/simNoRivalNames.mjs scripts/simPrerender.mjs scripts/simPrerenderBoot.mjs scripts/simRetiredRoutes.mjs scripts/simSchema.mjs scripts/simSitemap.mjs scripts/simSnapshotAssets.mjs
    scripts/lib/offlineTransport.cjs scripts/lib/atomicWrite.mjs scripts/lib/retiredRoutes.mjs scripts/lib/playwrightLoader.mjs scripts/genHiddenStubs.mjs scripts/genRetiredStubs.mjs scripts/logo/gen_logo.py
    src/App.tsx src/data/gameRegistry.ts scripts/data/lastmod.json
  )
  git ls-files --error-unmatch -- "${selected[@]}" > "$E/selected-source-paths.txt"
  git ls-tree -r "$CHECKED_HEAD" -- "${selected[@]}" > "$E/selected-source-git-manifest.txt"
  git archive "$CHECKED_HEAD" -- "${selected[@]}" > "$E/selected-source.tar"
  sha256sum "$E/selected-source.tar" > "$E/selected-source.sha256"
  cp package.json package-lock.json "$E/dependencies/"
  find node_modules -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dependencies/app-ci.sha256"
  find node_modules -type l -printf "%p\t%l\n" | sort > "$E/dependencies/app-ci-links.tsv"
  git archive HEAD -- .rc .github/workflows/lane-remote-check.yml | gzip > "$E/request-inputs.tar.gz"
'
if test "${gates[identity]}" != 0; then
  printf 'Exact checked source identity failed; no application commands were executed.\n'
  exit 1
fi
run locked-packages 30 node --input-type=module - <<'NODE'
import assert from 'node:assert/strict'; import fs from 'node:fs';
const lock=JSON.parse(fs.readFileSync('package-lock.json')), rows=[];
for(const [file,p] of Object.entries(lock.packages)) {
  if(!file.startsWith('node_modules/') || p.link) continue;
  if(!fs.existsSync(file+'/package.json')) { assert(p.optional,'Required locked package is installed: '+file); continue; }
  const actual=JSON.parse(fs.readFileSync(file+'/package.json')).version; assert.equal(actual,p.version,file); rows.push({file,version:actual});
}
assert(rows.length>0); fs.writeFileSync(process.env.E+'/dependencies/locked-packages.json',JSON.stringify(rows,null,2));
console.log('Verified '+rows.length+' actual installed locked package versions.');
NODE
if test "${gates[locked-packages]}" = 0; then
  run runtime 300 bash -euo pipefail -c '
    browser="$WORK/browser"; mkdir -p "$browser"
    npm install --prefix "$browser" --no-save --package-lock=false playwright@1.64.0
    test ! -e node_modules/playwright && test ! -e node_modules/playwright-core
    ln -s "$browser/node_modules/playwright" node_modules/playwright
    ln -s "$browser/node_modules/playwright-core" node_modules/playwright-core
    node "$browser/node_modules/playwright/cli.js" install --with-deps chromium
    node "$browser/node_modules/playwright/cli.js" --version
    find node_modules -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dependencies/app-runtime.sha256"
    cmp "$E/dependencies/app-ci.sha256" "$E/dependencies/app-runtime.sha256"
    find node_modules -type l -printf "%p\t%l\n" | sort > "$E/dependencies/app-runtime-links.tsv"
    grep -v -E "^node_modules/playwright(-core)?[[:space:]]" "$E/dependencies/app-runtime-links.tsv" > "$E/dependencies/app-original-links.tsv"
    cmp "$E/dependencies/app-ci-links.tsv" "$E/dependencies/app-original-links.tsv"
    test "$(readlink node_modules/playwright)" = "$browser/node_modules/playwright"
    test "$(readlink node_modules/playwright-core)" = "$browser/node_modules/playwright-core"
    find "$browser/node_modules" -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dependencies/browser.sha256"
    find "$browser/node_modules" -type l -printf "%p\t%l\n" | sort > "$E/dependencies/browser-links.tsv"
    tar -cf "$E/dependencies/browser-packages.tar" -C "$browser" node_modules
    cp "$browser/node_modules/playwright/package.json" "$E/dependencies/playwright-package.json"
    cp "$browser/node_modules/playwright-core/package.json" "$E/dependencies/playwright-core-package.json"
  '
else skip runtime; fi
run brand-runtime 120 bash -euo pipefail -c 'python3 -m venv "$WORK/python"; "$WORK/python/bin/python" -m pip install fonttools pillow; "$WORK/python/bin/python" -m pip list --format=json > "$E/dependencies/python-packages.json"'
export PATH="$WORK/python/bin:$PATH"
run syntax 30 bash -euo pipefail -c 'bash -n .rc/x/ticket-help-binding-1099.sh; node --check scripts/simTycoonTicketPolicy.mjs'
run types 120 node_modules/.bin/tsc --noEmit -p tsconfig.app.json
run build 180 env NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" npm run build -- --sourcemap
if test "${gates[build]}" = 0; then
  run build-hold 30 bash -euo pipefail -c 'find dist -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dist-before.sha256"; find dist -type l -printf "%p\t%l\n" | sort > "$E/dist-before-links.tsv"'
else skip build-hold; fi
run helper 360 env TYCOON_TICKET_POLICY_CONTROL=all NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" node scripts/simTycoonTicketPolicy.mjs
run helper-receipt 30 node --input-type=module - <<'NODE'
import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import {createHash} from 'node:crypto';
const base='tycoon-ticket-policy-artifacts/outcomes', read=f=>JSON.parse(fs.readFileSync(path.join(base,f))), hash=t=>createHash('sha256').update(t).digest('hex');
const summary=read('summary.json'), expected=['legacy','standard','demand','gate','concessions','payroll','growth','money','tap','rng','offline','migration','restore','prestige','display','label','helpbinding','selection','session','save','failure','retry','recover','hide'];
assert.equal(summary.normal.name,'normal'); assert.equal(summary.normal.passed,21); assert.equal(summary.normal.failed,0); assert.equal(summary.normal.skipped,0);
assert.deepEqual(summary.controls.map(c=>c.name),expected);
const normal=read('normal-report.json').testResults.flatMap(t=>t.assertionResults); assert.equal(normal.length,21); assert(normal.every(t=>t.status==='passed'));
for(const control of summary.controls) {
  assert.equal(control.passed,1); assert.equal(control.failed,1); assert.equal(control.skipped,19);
  const raw=read(control.name+'-report.json').testResults.flatMap(t=>t.assertionResults), mutation=read(control.name+'-mutation.json');
  assert.equal(raw.length,21); assert.equal(raw.filter(t=>t.status==='passed').length,1); assert.equal(raw.filter(t=>t.status==='failed').length,1); assert.equal(raw.filter(t=>t.status==='skipped').length,19);
  assert.equal(raw.find(t=>t.title===mutation.baseline)?.status,'passed'); assert.equal(raw.find(t=>t.title===mutation.intended)?.status,'failed');
  assert.equal(mutation.baseline,'independent upgrade purchase keeps original cost and money accounting'); assert.equal(mutation.intended,control.intended);
  const source=fs.readFileSync(mutation.file,'utf8').replaceAll('\r\n','\n'), copy=fs.readFileSync(path.join(base,mutation.copy),'utf8');
  assert.equal(source.split(mutation.from).length-1,1); assert.equal(copy,source.replace(mutation.from,mutation.to)); assert.notEqual(copy,source);
  assert.equal(hash(source),mutation.originalSha256); assert.equal(hash(copy),mutation.copiedSha256);
  if(control.name==='helpbinding') { assert.equal(source.split(mutation.to).length-1,0); assert.equal(copy.split(mutation.to).length-1,1); assert.equal(copy.replace(mutation.to,mutation.from),source); }
}
assert.deepEqual(read('source-after.json'),read('source-before.json'));
for(const [file,value] of Object.entries(read('source-before.json'))) assert.equal(hash(fs.readFileSync(file,'utf8').replaceAll('\r\n','\n')),value,file);
const ordinary='Premium adds 25% to the gate money each fan pays, but only 75% of your supporters turn up and they grow 25% slower.';
for(const [name,values,sentence] of [['normal',[25,75,40],'Premium adds 25% to the gate money each fan pays, but only 75% of your supporters turn up and they grow 40% slower.'],['helpbinding',[40,75,25],'Premium adds 40% to the gate money each fan pays, but only 75% of your supporters turn up and they grow 25% slower.']]) {
  const capture=read(name+'-help-bindings.json'); assert.equal(capture.normal.sentence,ordinary); assert.deepEqual(capture.normal.values,[25,75,25]); assert.equal(capture.distinct.sentence,sentence); assert.deepEqual(capture.distinct.values,values);
  assert.deepEqual(capture.fixturePercentages,[25,75,40]); assert.deepEqual(capture.distinctTerms,{id:'premium',label:'Premium',gate:1.25,demand:0.75,growth:0.6});
  assert.equal(capture.engineBefore.policy,'premium'); assert.equal(capture.engineBefore.crowd,67); assert.equal(capture.engineBefore.gatePerSec,4.1875); assert(capture.engineBefore.growthPerSec>0); assert.deepEqual(capture.engineAfter,capture.engineBefore);
  assert.deepEqual(capture.restoredTerms,{id:'premium',label:'Premium',gate:1.25,demand:0.75,growth:0.75});
}
assert.equal(read('measurements.json').length,216);
console.log('Accepted actual21 normal outcomes and24 effective copied controls, including actual distinct25/75/40 versus swapped40/75/25, with unchanged real economy.');
NODE
readers=(simAdsense simBrand simHeadTags simHiddenPages simHubs simIndexNow simIndexing simInternalLinks simNoRivalNames simPrerender simPrerenderBoot simRetiredRoutes simSchema simSitemap simSnapshotAssets)
export READERS="$(IFS=,; echo "${readers[*]}")"
for reader in "${readers[@]}"; do
  if test "${gates[build]}" = 0 && test "${gates[runtime]}" = 0; then run "reader-$reader" 120 env NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" ONLY="$reader" node scripts/runAllSims.mjs --browser; else skip "reader-$reader"; fi
done
run reader-receipts 30 node --input-type=module - <<'NODE'
import assert from 'node:assert/strict'; import fs from 'node:fs';
for(const name of process.env.READERS.split(',')) {
  const log=fs.readFileSync(process.env.E+'/logs/reader-'+name+'.log','utf8').replace(/\x1b\[[0-9;]*m/g,'');
  assert.equal([...log.matchAll(new RegExp('^\\s*PASS\\s+'+name+'\\.mjs\\s','gm'))].length,1,'Actual named reader ran: '+name);
  assert(!/^\s*FAIL:/m.test(log),'Reader has no raw red assertions: '+name);
}
console.log('All15 actual named dist/public readers printed their passing outcomes.');
NODE
if test "${gates[build]}" = 0; then
  run core-maps 90 node --input-type=module - <<'NODE'
import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex'), e=process.env.E, core=['src/pages/StadiumTycoon.tsx','src/hooks/useStadiumTycoon.ts','src/lib/stadiumTycoon.ts','src/components/tycoon/TicketPolicyCard.tsx','src/main.tsx'];
const rows=[],seen=new Set(); fs.mkdirSync(e+'/core-dist/assets',{recursive:true});
for(const name of fs.readdirSync('dist/assets').filter(x=>x.endsWith('.map'))) {
  const file='dist/assets/'+name, raw=fs.readFileSync(file), m=JSON.parse(raw), found=[]; assert.equal(m.sources.length,m.sourcesContent.length);
  for(let i=0;i<m.sources.length;i++) for(const source of core) if(m.sources[i].replaceAll('\\','/').endsWith('/'+source)) {
    assert.equal(hash(Buffer.from(m.sourcesContent[i])),hash(fs.readFileSync(source)),source); seen.add(source); found.push({source,sha256:hash(fs.readFileSync(source))});
  }
  if(!found.length) continue;
  const js=file.slice(0,-4), body=fs.readFileSync(js); assert(body.toString().includes('//# sourceMappingURL='+name));
  for(const f of [file,js]) fs.copyFileSync(f,e+'/core-dist/assets/'+path.basename(f)); rows.push({map:file,mapSha256:hash(raw),js,jsSha256:hash(body),sources:found});
}
assert.deepEqual([...seen].sort(),core.slice().sort());
for(const file of ['dist/index.html','dist/stadium-tycoon/index.html',...fs.readdirSync('dist/assets').filter(x=>x.endsWith('.css')).map(x=>'dist/assets/'+x)]) { const out=e+'/core-dist/'+file.slice(5); fs.mkdirSync(path.dirname(out),{recursive:true}); fs.copyFileSync(file,out); }
fs.writeFileSync(e+'/core-map-bindings.json',JSON.stringify(rows,null,2));
console.log('Bound all5 actual product source bodies to their emitted JavaScript maps. No browser or layout proof is claimed by this helper lane.');
NODE
else skip core-maps; fi
run closing 120 bash -euo pipefail -c '
  sha256sum --quiet -c "$E/source-before.sha256"; git diff --exit-code HEAD
  git ls-files --others --exclude-standard -- src scripts .rc .github/workflows public index.html package.json package-lock.json > "$E/untracked-inputs.txt"; test ! -s "$E/untracked-inputs.txt"
  git rev-parse HEAD HEAD^ "HEAD^{tree}" > "$E/identity-close.txt"; cmp "$E/identity.txt" "$E/identity-close.txt"
  cmp package.json "$E/dependencies/package.json"; cmp package-lock.json "$E/dependencies/package-lock.json"
  find node_modules -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dependencies/app-close.sha256"; sha256sum --quiet -c "$E/dependencies/app-ci.sha256"
  find node_modules -type l -printf "%p\t%l\n" | sort > "$E/dependencies/app-close-links.tsv"; cmp "$E/dependencies/app-runtime-links.tsv" "$E/dependencies/app-close-links.tsv"
  sha256sum --quiet -c "$E/dependencies/browser.sha256"
  find "$WORK/browser/node_modules" -type l -printf "%p\t%l\n" | sort > "$E/dependencies/browser-close-links.tsv"; cmp "$E/dependencies/browser-links.tsv" "$E/dependencies/browser-close-links.tsv"
  find dist -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dist-close.sha256"; cmp "$E/dist-before.sha256" "$E/dist-close.sha256"
  find dist -type l -printf "%p\t%l\n" | sort > "$E/dist-close-links.tsv"; cmp "$E/dist-before-links.tsv" "$E/dist-close-links.tsv"
'
run dependency-cache-hold 30 node --input-type=module - <<'NODE'
import assert from 'node:assert/strict'; import fs from 'node:fs';
const e=process.env.E, read=n=>new Map(fs.readFileSync(e+'/dependencies/'+n,'utf8').trim().split('\n').map(x=>[x.slice(66),x.slice(0,64)]));
const before=read('app-ci.sha256'), after=read('app-close.sha256');
for(const [file,hash] of before) assert.equal(after.get(file),hash,file);
for(const file of after.keys()) if(!before.has(file)) assert(/^node_modules\/\.(?:vite(?:-temp)?|cache)\//.test(file),'Only ordinary new build/test cache files: '+file);
console.log('Every original application package byte is held; only ordinary new cache files are allowed. No presentation cache is used in this lane.');
NODE
run strict-gates 30 node --input-type=module - <<'NODE'
import assert from 'node:assert/strict'; import fs from 'node:fs';
const expected=['identity','locked-packages','runtime','brand-runtime','syntax','types','build','build-hold','helper','helper-receipt',...process.env.READERS.split(',').map(x=>'reader-'+x),'reader-receipts','core-maps','closing','dependency-cache-hold'];
const entries=fs.readFileSync(process.env.E+'/gates.tsv','utf8').trim().split('\n').map(x=>x.split('\t'));
fs.writeFileSync(process.env.E+'/strict-gates.json',JSON.stringify({expected,actual:entries},null,2));
assert.deepEqual(entries.map(x=>x[0]),expected); assert(entries.every(x=>x[1]==='0'));
console.log('Every actual named preparation/helper/reader/source/dependency/build gate succeeded.');
NODE
execution_complete=1
exit "$failed"
