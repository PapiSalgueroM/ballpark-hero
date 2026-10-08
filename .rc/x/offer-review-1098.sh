#!/usr/bin/env bash
# Remote-only proof for the three stale currency expectations. No application edits.
set -uo pipefail
test "${GITHUB_ACTIONS:-}" = true || exit 2
test -n "${RC_OUT:-}" && test -n "${RUNNER_TEMP:-}" || exit 2
BASE_HEAD=cd496098d1aa629ef8c49472fe09ee9ba08e938d
CHECKED_HEAD=c48919a9c22d036280a29253bb0044068ed04ac9
CHECKED_TREE=4531aa6e7667a692ec922fb103ec5bf1aed7bb17
REQUEST_HEAD=$(git rev-parse HEAD)
WORK=$(mktemp -d "$RUNNER_TEMP/offer-1098.XXXXXX") || exit 2
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
  if test -d soccer-offer-review-artifacts; then
    timeout -k 10 60 cp -R soccer-offer-review-artifacts "$E/candidate-proof"; retained=$?
    printf 'candidate-proof\t%s\n' "$retained" >> "$E/retention.tsv"; test "$retained" = 0 || failed=1
  elif test "$execution_complete" = 1; then failed=1; printf 'candidate-proof\tmissing\n' >> "$E/retention.tsv"; fi
  if test -d "$WORK/parent/soccer-offer-review-artifacts/native"; then
    mkdir -p "$E/parent-native" || failed=1
    timeout -k 10 30 cp -R "$WORK/parent/soccer-offer-review-artifacts/native/." "$E/parent-native/"; retained=$?
    printf 'parent-native\t%s\n' "$retained" >> "$E/retention.tsv"; test "$retained" = 0 || failed=1
  fi
  printf '%s\n' "$failed" > "$E/intended-gate-failures.txt" || failed=1
  timeout -k 10 20 tar --version > "$E/dependencies/tar-version.txt" || failed=1
  timeout -k 10 20 xz --version > "$E/dependencies/xz-version.txt" || failed=1
  printf 'tar -cf - -C evidence . | xz -T2 -8\n' > "$E/compression.txt" || failed=1
  archive="$WORK/soccer-offer-1098-evidence.tar.xz"
  timeout -k 10 180 bash -o pipefail -c 'tar -cf - -C "$E" . | xz -T2 -8 > "$WORK/soccer-offer-1098-evidence.tar.xz"'; packed=$?
  bytes=$(stat -c %s "$archive" 2>/dev/null || echo unavailable)
  if test "$packed" = 0 && test "$bytes" -le 24000000; then
    timeout -k 10 30 cp "$archive" "$RC_OUT/soccer-offer-1098-evidence.tar.xz" || failed=1
    timeout -k 10 20 sha256sum "$RC_OUT/soccer-offer-1098-evidence.tar.xz" > "$RC_OUT/evidence.sha256" || failed=1
    printf 'checked=%s\nrequest=%s\nbytes=%s\nfailed=%s\nexecution_complete=%s\nending=%s\n' "$CHECKED_HEAD" "$REQUEST_HEAD" "$bytes" "$failed" "$execution_complete" "$ending" > "$RC_OUT/receipt.txt" || failed=1
  else
    printf 'EVIDENCE CAP FAILURE: pack_exit=%s bytes=%s limit=24000000; full payload retained only at runner path %s, no truncated evidence accepted.\n' "$packed" "$bytes" "$archive" | tee "$RC_OUT/EVIDENCE-CAP-FAILURE.txt"
    failed=1
  fi
  printf 'Soccer offer1098 strict label: failed=%s, complete=%s, source=%s, request=%s.\n' "$failed" "$execution_complete" "$CHECKED_HEAD" "$REQUEST_HEAD"
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
run identity 60 bash -euo pipefail -c '
  test "$(git rev-parse HEAD^)" = "$CHECKED_HEAD"
  test "$(git rev-parse "$CHECKED_HEAD^{tree}")" = "$CHECKED_TREE"
  git diff --exit-code HEAD
  printf "%s\n" .github/workflows/lane-remote-check.yml .rc/request.txt .rc/run.sh .rc/x/offer-review-1098.sh | LC_ALL=C sort > "$E/allowed-overlay.txt"
  git diff --name-only --no-renames "$CHECKED_HEAD" HEAD | LC_ALL=C sort > "$E/actual-overlay.txt"
  cmp "$E/allowed-overlay.txt" "$E/actual-overlay.txt"
  printf "%s\n" "7db457d26dd66d64760de332104b8c7a74c438c90a4533d073ec5c55400e3067  .rc/request.txt" "668aeb520674d130f1af2e88494775afff6b8055d9911c715a8b646056b4b62f  .rc/run.sh" "447a4eca8616f708831ec5e6b7bf90ba68afc606054c0e0d0b27b4cb84abec20  .github/workflows/lane-remote-check.yml" > "$E/reviewed-kit.sha256"
  sha256sum -c "$E/reviewed-kit.sha256"
  sha256sum .rc/x/offer-review-1098.sh > "$E/dispatched-shell.sha256"
  test "$(git diff --name-only "$BASE_HEAD" "$CHECKED_HEAD" -- src scripts)" = scripts/playSoccerOfferReview1082.mjs
  test "$(git diff --numstat "$BASE_HEAD" "$CHECKED_HEAD" -- scripts/playSoccerOfferReview1082.mjs)" = "$(printf "3\t3\tscripts/playSoccerOfferReview1082.mjs")"
  git rev-parse HEAD HEAD^ "HEAD^{tree}" > "$E/identity.txt"
  git ls-tree -r HEAD > "$E/git-runtime-manifest.txt"
  git ls-tree -r "$CHECKED_HEAD" > "$E/git-checked-manifest.txt"
  git ls-tree -r "$BASE_HEAD" > "$E/git-base-manifest.txt"
  git ls-files -z > "$E/runtime-paths.nul"
  git ls-files -z | sort -z | xargs -0 sha256sum > "$E/source-before.sha256"
  git diff "$BASE_HEAD" "$CHECKED_HEAD" -- scripts/playSoccerOfferReview1082.mjs > "$E/fixture.diff"
  git show "$BASE_HEAD:scripts/playSoccerOfferReview1082.mjs" > "$E/parent-harness.mjs"
  cp package.json package-lock.json "$E/dependencies/"
  find node_modules -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dependencies/app-ci.sha256"
  find node_modules -type l -printf "%p\t%l\n" | sort > "$E/dependencies/app-ci-links.tsv"
  git archive HEAD -- .rc .github/workflows/lane-remote-check.yml | gzip > "$E/request-inputs.tar.gz"
'
if test "${gates[identity]}" != 0; then
  printf 'Exact checked source identity failed; no application commands were executed.\n'
  exit 1
fi
run locked-packages 60 node --input-type=module - <<'NODE'
import assert from 'node:assert/strict'; import fs from 'node:fs';
const lock=JSON.parse(fs.readFileSync('package-lock.json')), rows=[];
for(const [file,p] of Object.entries(lock.packages)) {
  if(!file.startsWith('node_modules/') || p.link) continue;
  if(!fs.existsSync(file+'/package.json')) { assert(p.optional, 'Required locked package is installed: '+file); continue; }
  const actual=JSON.parse(fs.readFileSync(file+'/package.json')).version; assert.equal(actual,p.version,file); rows.push({file,version:actual});
}
assert(rows.length>0); fs.writeFileSync(process.env.E+'/dependencies/locked-packages.json',JSON.stringify(rows,null,2));
console.log('Verified '+rows.length+' actual installed locked package versions.');
NODE
if test "${gates[identity]}" = 0 && test "${gates[locked-packages]}" = 0; then
  run runtime 360 bash -euo pipefail -c '
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
    tar -czf "$E/dependencies/browser-packages.tar.gz" -C "$browser" node_modules
    cp "$browser/node_modules/playwright/package.json" "$E/dependencies/playwright-package.json"
    cp "$browser/node_modules/playwright-core/package.json" "$E/dependencies/playwright-core-package.json"
  '
else skip runtime; fi
run brand-runtime 180 bash -euo pipefail -c 'python3 -m venv "$WORK/python"; "$WORK/python/bin/python" -m pip install fonttools pillow; "$WORK/python/bin/python" -m pip list --format=json > "$E/dependencies/python-packages.json"'
export PATH="$WORK/python/bin:$PATH"
run syntax 60 bash -euo pipefail -c 'bash -n .rc/x/offer-review-1098.sh; node --check scripts/playSoccerOfferReview1082.mjs; node --check scripts/simSoccerOfferReview.mjs; node --check scripts/qa/soccerOfferReview1082.mjs'
run types 180 node_modules/.bin/tsc --noEmit -p tsconfig.app.json
run build 240 env NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" npm run build -- --sourcemap
if test "${gates[build]}" = 0; then
  find dist -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dist-before.sha256"
  run assets 600 node scripts/qa/soccerOfferAssets1082.mjs
  if test "${gates[assets]}" = 0; then
    run asset-cache-hold 60 bash -euo pipefail -c '
      cache=soccer-offer-review-artifacts/font-cache
      test -f "$cache/manifest.json"
      find "$cache" -type f -print0 | sort -z | xargs -0 sha256sum > "$E/cache-before.sha256"
      find "$cache" -type l -printf "%p\t%l\n" | sort > "$E/cache-before-links.tsv"
    '
  else skip asset-cache-hold; fi
else skip assets; skip asset-cache-hold; fi
run helper 600 env NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" node scripts/simSoccerOfferReview.mjs
run helper-receipt 60 node --input-type=module - <<'NODE'
import assert from 'node:assert/strict'; import fs from 'node:fs';
const r=JSON.parse(fs.readFileSync('soccer-offer-review-artifacts/report.json'));
assert.equal(r.complete,true); assert.equal(r.passed,true); assert.equal(r.normal.checks.length,9);
assert(r.normal.checks.every(x=>x.status==='passed' && x.records>0)); assert.equal(r.controls.length,19);
assert(r.controls.every(x=>x.effective && x.independentBaselinePassed)); assert.deepEqual(r.sourceAfter,r.sourceBefore);
assert.equal(Object.keys(r.raw).length,20); console.log('Accepted actual9 helper groups and19 effective controls.');
NODE
if test "${gates[runtime]}" = 0 && test "${gates[build]}" = 0 && test "${gates[assets]}" = 0 && test "${gates[asset-cache-hold]}" = 0; then
  run native 600 env SOCCER_OFFER_REVIEW_ASSET_CACHE="$PWD/soccer-offer-review-artifacts/font-cache/manifest.json" NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" node scripts/playSoccerOfferReview1082.mjs
  run native-receipt 60 node --input-type=module - <<'NODE'
import assert from 'node:assert/strict'; import fs from 'node:fs';
const r=JSON.parse(fs.readFileSync('soccer-offer-review-artifacts/native/report.json'));
assert.equal(r.complete,true); assert.equal(r.cases.length,9); assert(r.cases.every(x=>x.complete));
assert.equal(r.controls.length,12); assert.equal(r.forwardedWrites,0); assert.deepEqual(r.sourceAfter,r.sourceBefore); assert.deepEqual(r.buildAfter,r.buildBefore);
for(const c of r.cases) { for(const k of ['unexpectedRequests','errors','consoleErrors','assetErrors','webSockets']) assert.deepEqual(c[k],[]); assert(c.network.every(x=>x.method==='GET')); }
console.log('Accepted actual9 native journeys and12 restored DOM controls.');
NODE
  run parent 600 bash -euo pipefail -c '
    p="$WORK/parent"; mkdir -p "$p"; git archive "$BASE_HEAD" src scripts index.html package.json package-lock.json | tar -x -C "$p"
    ln -s "$PWD/node_modules" "$p/node_modules"; ln -s "$PWD/dist" "$p/dist"
    set +e
    (cd "$p"; SOCCER_OFFER_REVIEW_ASSET_CACHE="$OLDPWD/soccer-offer-review-artifacts/font-cache/manifest.json" NODE_OPTIONS="--require=$OLDPWD/scripts/lib/offlineTransport.cjs" node scripts/playSoccerOfferReview1082.mjs) > "$E/logs/parent-raw.log" 2>&1
    rc=$?; set -e; printf "%s\n" "$rc" > "$E/parent-exit.txt"
    cp -R "$p/soccer-offer-review-artifacts/native" "$E/parent-native"
    test "$rc" = 1
  '
  run parent-receipt 60 node --input-type=module - <<'NODE'
import assert from 'node:assert/strict'; import fs from 'node:fs';
const e=process.env.E, p=JSON.parse(fs.readFileSync(e+'/parent-native/report.json')), c=JSON.parse(fs.readFileSync('soccer-offer-review-artifacts/native/report.json'));
assert.equal(p.complete,false); assert.equal(p.error.name,'AssertionError'); assert(p.error.message.startsWith('Visible signed wage equals the actual acceptance outcome'));
assert.equal(p.cases.length,1); assert.equal(p.cases[0].complete,undefined); assert.equal(p.controls.length,0);
assert.deepEqual(p.cases[0].terms,c.cases[0].terms); assert.deepEqual(p.buildBefore,c.buildBefore); assert.deepEqual(p.buildAfter,p.buildBefore); assert.deepEqual(p.sourceAfter,p.sourceBefore);
const changed=Object.keys(c.sourceBefore).filter(f=>p.sourceBefore[f]!==c.sourceBefore[f]); assert.deepEqual(changed,['scripts/playSoccerOfferReview1082.mjs']);
const file=p.cases[0].id+'-expected-signature.json'; assert.deepEqual(JSON.parse(fs.readFileSync(e+'/parent-native/'+file)),JSON.parse(fs.readFileSync('soccer-offer-review-artifacts/native/'+file)));
console.log('Untouched main rejects the identical first signed terms at its exact stale euro assertion.');
NODE
else skip native; skip native-receipt; skip parent; skip parent-receipt; fi
readers=(simAdsense simBrand simHeadTags simHiddenPages simHubs simIndexNow simIndexing simInternalLinks simNoRivalNames simPrerender simPrerenderBoot simRetiredRoutes simSchema simSitemap simSnapshotAssets)
export READERS="$(IFS=,; echo "${readers[*]}")"
for reader in "${readers[@]}"; do
  if test "${gates[build]}" = 0 && test "${gates[runtime]}" = 0; then run "reader-$reader" 180 env ONLY="$reader" node scripts/runAllSims.mjs --browser; else skip "reader-$reader"; fi
done
run reader-receipts 60 node --input-type=module - <<'NODE'
import assert from 'node:assert/strict'; import fs from 'node:fs';
for(const name of process.env.READERS.split(',')) {
  const log=fs.readFileSync(process.env.E+'/logs/reader-'+name+'.log','utf8').replace(/\x1b\[[0-9;]*m/g,'');
  assert.equal([...log.matchAll(new RegExp('^\\s*PASS\\s+'+name+'\\.mjs\\s','gm'))].length,1,'Actual named reader ran: '+name);
  assert(!/^\s*FAIL:/m.test(log),'Reader has no raw red assertions: '+name);
}
console.log('All15 actual named dist/public readers printed their passing outcomes.');
NODE
if test "${gates[build]}" = 0; then
  run core-maps 120 node --input-type=module - <<'NODE'
import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex'), e=process.env.E;
const core=['src/pages/SoccerCareer.tsx','src/components/soccer-career/SoccerOfferReview.tsx','src/lib/soccerOfferReview.ts','src/lib/soccerCareerEngine.ts','src/main.tsx'];
const tracked=new Set(fs.readFileSync(e+'/runtime-paths.nul','utf8').split('\0').filter(Boolean)), selected=new Set([...core,'index.html','package.json','package-lock.json','vite.config.ts','tsconfig.app.json','scripts/playSoccerOfferReview1082.mjs','scripts/simSoccerOfferReview.mjs','scripts/qa/soccerOfferReview1082.mjs','scripts/qa/soccerOfferAssets1082.mjs','scripts/lib/playwrightLoader.mjs','scripts/lib/hostLikeServer.mjs','scripts/lib/offlineTransport.cjs','scripts/runAllSims.mjs']);
for(const name of fs.readdirSync('soccer-offer-review-artifacts/bundles')) if(name.endsWith('.meta.json')) for(const file of Object.keys(JSON.parse(fs.readFileSync('soccer-offer-review-artifacts/bundles/'+name)).inputs)) if(tracked.has(file)) selected.add(file);
const oracle=JSON.parse(fs.readFileSync('soccer-offer-review-artifacts/native/independent-engine-metafile.json')); for(const file of Object.keys(oracle.inputs)) if(tracked.has(file)) selected.add(file);
const rows=[], seen=new Set(); fs.mkdirSync(e+'/core-dist/assets',{recursive:true});
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
for(const file of ['dist/index.html','dist/soccer-career/index.html',...fs.readdirSync('dist/assets').filter(x=>x.endsWith('.css')).map(x=>'dist/assets/'+x)]) { const out=e+'/core-dist/'+file.slice(5); fs.mkdirSync(path.dirname(out),{recursive:true}); fs.copyFileSync(file,out); }
for(const r of process.env.READERS?.split(',')||[]) selected.add('scripts/'+r+'.mjs');
fs.writeFileSync(e+'/core-map-bindings.json',JSON.stringify(rows,null,2)); fs.writeFileSync(e+'/selected-source-paths.nul',[...selected].filter(f=>tracked.has(f)).sort().join('\0')+'\0');
console.log('Bound all5 actual product source bodies to their emitted JavaScript maps.');
NODE
else skip core-maps; fi
run closing 180 bash -euo pipefail -c '
  sha256sum --quiet -c "$E/source-before.sha256"; git diff --exit-code HEAD
  git ls-files --others --exclude-standard -- src scripts .rc .github/workflows public index.html package.json package-lock.json > "$E/untracked-inputs.txt"; test ! -s "$E/untracked-inputs.txt"
  git rev-parse HEAD HEAD^ "HEAD^{tree}" > "$E/identity-close.txt"; cmp "$E/identity.txt" "$E/identity-close.txt"
  cmp package.json "$E/dependencies/package.json"; cmp package-lock.json "$E/dependencies/package-lock.json"
  find node_modules -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dependencies/app-close.sha256"; sha256sum --quiet -c "$E/dependencies/app-ci.sha256"
  find node_modules -type l -printf "%p\t%l\n" | sort > "$E/dependencies/app-close-links.tsv"; cmp "$E/dependencies/app-runtime-links.tsv" "$E/dependencies/app-close-links.tsv"
  sha256sum --quiet -c "$E/dependencies/browser.sha256"
  find "$WORK/browser/node_modules" -type l -printf "%p\t%l\n" | sort > "$E/dependencies/browser-close-links.tsv"; cmp "$E/dependencies/browser-links.tsv" "$E/dependencies/browser-close-links.tsv"
  find dist -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dist-close.sha256"; cmp "$E/dist-before.sha256" "$E/dist-close.sha256"
  cache=soccer-offer-review-artifacts/font-cache
  find "$cache" -type f -print0 | sort -z | xargs -0 sha256sum > "$E/cache-close.sha256"; cmp "$E/cache-before.sha256" "$E/cache-close.sha256"
  find "$cache" -type l -printf "%p\t%l\n" | sort > "$E/cache-close-links.tsv"; cmp "$E/cache-before-links.tsv" "$E/cache-close-links.tsv"
  sha256sum --quiet -c "$E/cache-before.sha256"
  mapfile -d "" selected < "$E/selected-source-paths.nul"
  git archive "$CHECKED_HEAD" -- "${selected[@]}" | gzip > "$E/selected-source.tar.gz"
'
run dependency-cache-hold 60 node --input-type=module - <<'NODE'
import assert from 'node:assert/strict'; import fs from 'node:fs';
const e=process.env.E, read=n=>new Map(fs.readFileSync(e+'/dependencies/'+n,'utf8').trim().split('\n').map(x=>[x.slice(66),x.slice(0,64)]));
const before=read('app-ci.sha256'), after=read('app-close.sha256');
for(const [file,hash] of before) assert.equal(after.get(file),hash,file);
for(const file of after.keys()) if(!before.has(file)) assert(/^node_modules\/\.(?:vite(?:-temp)?|cache)\//.test(file),'Only ordinary new build/test cache files: '+file);
console.log('Every original application package byte is held; only ordinary new cache files are allowed.');
NODE
execution_complete=1
exit "$failed"
