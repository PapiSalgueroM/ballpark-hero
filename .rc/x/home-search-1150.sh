#!/usr/bin/env bash
# Remote-only home search recovery proof. No application edits.
set -uo pipefail
test "${GITHUB_ACTIONS:-}" = true || exit 2
test -n "${RC_OUT:-}" && test -n "${RUNNER_TEMP:-}" || exit 2
BASE_HEAD=c623e77d22541ac88c30f48b078a9a8a9c699e1d
CHECKED_HEAD=30d489f8f1ede9fadf05f684c017a0d90d9727ff
CHECKED_TREE=7bed73763bd8073ecf055814d4ad04e498f625a4
REQUEST_HEAD=$(git rev-parse HEAD)
WORK=$(mktemp -d "$RUNNER_TEMP/home-search-1150.XXXXXX") || exit 2
E="$WORK/evidence"
mkdir -p "$E/logs" "$E/dependencies" "$RC_OUT" || exit 2
export WORK E BASE_HEAD CHECKED_HEAD CHECKED_TREE REQUEST_HEAD
export CI=true TZ=UTC SIM_NETWORK=offline ENGINES=chromium SEO_SPLIT_BASE_REF=HEAD
export PARENT_ROOT="$WORK/parent" PLAYWRIGHT_BROWSERS_PATH="$WORK/chromium-cache"
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
  # Native writes useful partial evidence directly beneath E.
  if test "$execution_complete" = 1 && test ! -f "$E/native/report.json"; then failed=1; fi
  printf '%s\n' "$failed" > "$E/intended-gate-failures.txt" || failed=1
  timeout -k 10 20 tar --version > "$E/dependencies/tar-version.txt" || failed=1
  timeout -k 10 20 xz --version > "$E/dependencies/xz-version.txt" || failed=1
  printf 'tar -c -I "xz -T2 -8" -f archive -C evidence .\n' > "$E/compression.txt" || failed=1
  archive="$WORK/home-search-1150-evidence.tar.xz"
  timeout -k 10 180 tar -c -I "xz -T2 -8" -f "$archive" -C "$E" .; packed=$?
  bytes=$(stat -c %s "$archive" 2>/dev/null || echo unavailable)
  if test "$packed" = 0 && test "$bytes" -le 24000000; then
    timeout -k 10 30 cp "$archive" "$RC_OUT/home-search-1150-evidence.tar.xz" || failed=1
    timeout -k 10 20 sha256sum "$RC_OUT/home-search-1150-evidence.tar.xz" > "$RC_OUT/evidence.sha256" || failed=1
    printf 'checked=%s\nrequest=%s\nbytes=%s\nfailed=%s\nexecution_complete=%s\nending=%s\n' "$CHECKED_HEAD" "$REQUEST_HEAD" "$bytes" "$failed" "$execution_complete" "$ending" > "$RC_OUT/receipt.txt" || failed=1
  else
    printf 'EVIDENCE CAP FAILURE: pack_exit=%s bytes=%s limit=24000000; full payload retained only at runner path %s, no truncated evidence accepted.\n' "$packed" "$bytes" "$archive" | tee "$RC_OUT/EVIDENCE-CAP-FAILURE.txt"
    failed=1
  fi
  printf 'Home search1150 strict label: failed=%s, complete=%s, source=%s, request=%s.\n' "$failed" "$execution_complete" "$CHECKED_HEAD" "$REQUEST_HEAD"
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
run identity 30 bash -euo pipefail -c '
  test "$(git rev-parse HEAD^)" = "$CHECKED_HEAD"
  test "$(git rev-parse "$CHECKED_HEAD^")" = "$BASE_HEAD"
  test "$(git rev-parse "$CHECKED_HEAD^{tree}")" = "$CHECKED_TREE"
  git diff --exit-code HEAD
  printf "%s\n" .github/workflows/lane-remote-check.yml .rc/request.txt .rc/run.sh .rc/x/home-search-1150.sh .rc/x/home-search-1150.mjs | LC_ALL=C sort > "$E/allowed-overlay.txt"
  git diff --name-only --no-renames "$CHECKED_HEAD" HEAD | LC_ALL=C sort > "$E/actual-overlay.txt"
  cmp "$E/allowed-overlay.txt" "$E/actual-overlay.txt"
  printf "%s\n" "08035c993e999878d0e7593031123011d9e8bbf7c006fbd028cb9548a99f1cbb  .rc/request.txt" "668aeb520674d130f1af2e88494775afff6b8055d9911c715a8b646056b4b62f  .rc/run.sh" "447a4eca8616f708831ec5e6b7bf90ba68afc606054c0e0d0b27b4cb84abec20  .github/workflows/lane-remote-check.yml" "2e541d16728532f16c7d175e1d614ae6f7bd7ae3d885b51ea5aae363cee1d85e  .rc/x/home-search-1150.mjs" "ec6210206d4007a6a6912b0e32c931d44778dcada8889aff90d972cad7aad519  src/pages/Index.tsx" > "$E/reviewed-inputs.sha256"
  sha256sum -c "$E/reviewed-inputs.sha256"
  sha256sum .rc/x/home-search-1150.sh > "$E/dispatched-shell.sha256"
  printf "%s\n" docs/PROJECT-STATE.md src/pages/Index.tsx | LC_ALL=C sort > "$E/allowed-candidate.txt"
  git diff --name-only --no-renames "$BASE_HEAD" "$CHECKED_HEAD" | LC_ALL=C sort > "$E/actual-candidate.txt"
  cmp "$E/allowed-candidate.txt" "$E/actual-candidate.txt"
  git rev-parse HEAD HEAD^ "HEAD^{tree}" > "$E/identity.txt"
  git ls-tree -r HEAD > "$E/git-runtime-manifest.txt"
  git ls-tree -r "$CHECKED_HEAD" > "$E/git-checked-manifest.txt"
  git ls-tree -r "$BASE_HEAD" > "$E/git-base-manifest.txt"
  git ls-files -z > "$E/runtime-paths.nul"
  git ls-files -z | sort -z | xargs -0 sha256sum > "$E/source-before.sha256"
  git diff "$BASE_HEAD" "$CHECKED_HEAD" -- src/pages/Index.tsx > "$E/product.diff"
  selected=(src/pages/Index.tsx src/pages/Search.tsx src/lib/siteSearch.ts src/lib/freshBuild.ts src/main.tsx src/App.tsx src/data/gameRegistry.ts src/data/searchKeywords.json package.json package-lock.json vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json tailwind.config.ts postcss.config.js index.html scripts/lib/hostLikeServer.mjs scripts/lib/offlineTransport.cjs scripts/runAllSims.mjs scripts/simSiteSearch.mjs scripts/simAdsense.mjs scripts/simBrand.mjs scripts/simHeadTags.mjs scripts/simHiddenPages.mjs scripts/simHubs.mjs scripts/simIndexNow.mjs scripts/simIndexing.mjs scripts/simInternalLinks.mjs scripts/simNoRivalNames.mjs scripts/simPrerender.mjs scripts/simPrerenderBoot.mjs scripts/simRetiredRoutes.mjs scripts/simSchema.mjs scripts/simSitemap.mjs scripts/simSnapshotAssets.mjs)
  git ls-files --error-unmatch -- "${selected[@]}" > "$E/selected-source-paths.txt"
  git archive "$CHECKED_HEAD" -- "${selected[@]}" > "$E/selected-source.tar"
  git archive "$BASE_HEAD" -- "${selected[@]}" > "$E/selected-parent-source.tar"
  git archive HEAD -- .rc .github/workflows/lane-remote-check.yml > "$E/request-inputs.tar"
  sha256sum "$E/selected-source.tar" "$E/selected-parent-source.tar" "$E/request-inputs.tar" > "$E/archives.sha256"
  cp package.json package-lock.json "$E/dependencies/"
  find node_modules -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dependencies/app-ci.sha256"
  find node_modules -type l -printf "%p\t%l\n" | sort > "$E/dependencies/app-ci-links.tsv"
'
if test "${gates[identity]}" != 0; then exit 1; fi
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
    find "$PLAYWRIGHT_BROWSERS_PATH" -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dependencies/chromium-cache.sha256"
    find "$PLAYWRIGHT_BROWSERS_PATH" -type l -printf "%p\t%l\n" | sort > "$E/dependencies/chromium-cache-links.tsv"
  '
else skip runtime; fi
run brand-runtime 120 bash -euo pipefail -c 'python3 -m venv "$WORK/python"; "$WORK/python/bin/python" -m pip install fonttools pillow; "$WORK/python/bin/python" -m pip list --format=json > "$E/dependencies/python-packages.json"'
export PATH="$WORK/python/bin:$PATH"
run syntax 20 bash -euo pipefail -c 'bash -n .rc/x/home-search-1150.sh; node --check .rc/x/home-search-1150.mjs'
run types 120 node_modules/.bin/tsc --noEmit -p tsconfig.app.json
run build 180 env NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" npm run build -- --sourcemap
if test "${gates[build]}" = 0; then
  run build-hold 30 bash -euo pipefail -c 'find dist -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dist-before.sha256"; find dist -type l -printf "%p\t%l\n" | sort > "$E/dist-before-links.tsv"; sha256sum --quiet -c "$E/source-before.sha256"; git diff --exit-code HEAD'
else skip build-hold; fi
run parent-prepare 60 bash -euo pipefail -c '
  mkdir -p "$PARENT_ROOT"
  git archive "$BASE_HEAD" | tar -xf - -C "$PARENT_ROOT"
  cmp package.json "$PARENT_ROOT/package.json"; cmp package-lock.json "$PARENT_ROOT/package-lock.json"
  git ls-tree -r --name-only "$BASE_HEAD" > "$E/parent-paths.txt"
  (cd "$PARENT_ROOT"; while IFS= read -r file; do sha256sum "$file"; done < "$E/parent-paths.txt") > "$E/parent-source-before.sha256"
  ln -s "$PWD/node_modules" "$PARENT_ROOT/node_modules"
  test "$(readlink "$PARENT_ROOT/node_modules")" = "$PWD/node_modules"
'
if test "${gates[parent-prepare]}" = 0 && test "${gates[runtime]}" = 0; then
  run parent-build 180 bash -euo pipefail -c 'cd "$PARENT_ROOT"; NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" npm run build -- --sourcemap; find dist -type f -print0 | sort -z | xargs -0 sha256sum > "$E/parent-dist-before.sha256"; find dist -type l -printf "%p\t%l\n" | sort > "$E/parent-dist-before-links.tsv"; sha256sum --quiet -c "$E/parent-source-before.sha256"'
else skip parent-build; fi
if test "${gates[build-hold]}" = 0 && test "${gates[parent-build]}" = 0 && test "${gates[runtime]}" = 0 && test "${gates[syntax]}" = 0; then
  run native 660 env NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" node .rc/x/home-search-1150.mjs
else skip native; fi
run native-receipt 30 node --input-type=module - <<'NODE'
import assert from 'node:assert/strict'; import fs from 'node:fs';
const report=JSON.parse(fs.readFileSync(process.env.E+'/native/report.json'));
assert.equal(report.checked,process.env.CHECKED_HEAD); assert.equal(report.base,process.env.BASE_HEAD); assert.equal(report.expectedCases,14); assert.equal(report.rows.length,14);
const expected=[]; for(const width of [390,1280]) for(const target of ['candidate','parent']) for(const kind of target==='candidate'?['pending','failure','failure-encoded','healthy']:['pending','failure','healthy']) expected.push(`${target}-${width}-${kind}`);
assert.deepEqual(report.rows.map(r=>r.id),expected);
for(const row of report.rows) { assert(row.fold.first.top<=430); assert(row.fold.accountRows.length<=2); if(row.target==='candidate'&&row.kind==='healthy') { assert(row.foldPushControl.first.top>430); assert(row.accountAskControl.accountRows.length>2); assert(row.foldRestored.first.top<=430); assert(row.foldRestored.accountRows.length<=2); } }
for(const row of report.rows) { assert.equal(row.status,'completed',row.id); assert.equal(row.pageErrors.length,0); assert.equal(row.captureErrors.length,0); assert.equal(row.unexpectedConsole.length,0); assert(row.captures.length>=3 || row.target==='parent'&&row.kind==='failure'&&row.captures.length===2); if(row.target==='parent') assert(row.observedDefect); if(row.kind!=='healthy') assert.equal(row.faults.length,1); }
console.log('All14 actual finite candidate/parent journeys passed their exact contracts, with six explicit parent defect controls.');
NODE
run search-ranking 90 env NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" ONLY=simSiteSearch node scripts/runAllSims.mjs
readers=(simAdsense simBrand simHeadTags simHiddenPages simHubs simIndexNow simIndexing simInternalLinks simNoRivalNames simPrerender simPrerenderBoot simRetiredRoutes simSchema simSitemap simSnapshotAssets)
export READERS="$(IFS=,; echo "${readers[*]}")"
for reader in "${readers[@]}"; do
  if test "${gates[build]}" = 0 && test "${gates[runtime]}" = 0; then run "reader-$reader" 120 env NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" ONLY="$reader" node scripts/runAllSims.mjs --browser; else skip "reader-$reader"; fi
done
run reader-receipts 30 node --input-type=module - <<'NODE'
import assert from 'node:assert/strict'; import fs from 'node:fs';
for(const name of ['simSiteSearch',...process.env.READERS.split(',')]) {
  const gate=name==='simSiteSearch'?'search-ranking':'reader-'+name, log=fs.readFileSync(process.env.E+'/logs/'+gate+'.log','utf8').replace(/\x1b\[[0-9;]*m/g,'');
  assert.equal([...log.matchAll(new RegExp('^\\s*PASS\\s+'+name+'\\.mjs\\s','gm'))].length,1,'Actual named reader ran: '+name); assert(!/^\s*FAIL:/m.test(log));
}
console.log('All15 actual dist/public readers and the existing search ranking guard printed passing outcomes.');
NODE
run closing 120 bash -euo pipefail -c '
  sha256sum --quiet -c "$E/source-before.sha256"; git diff --exit-code HEAD
  git ls-files --others --exclude-standard -- src scripts .rc .github/workflows public index.html package.json package-lock.json > "$E/untracked-inputs.txt"; test ! -s "$E/untracked-inputs.txt"
  git rev-parse HEAD HEAD^ "HEAD^{tree}" > "$E/identity-close.txt"; cmp "$E/identity.txt" "$E/identity-close.txt"
  cmp package.json "$E/dependencies/package.json"; cmp package-lock.json "$E/dependencies/package-lock.json"
  find node_modules -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dependencies/app-close.sha256"; sha256sum --quiet -c "$E/dependencies/app-ci.sha256"
  find node_modules -type l -printf "%p\t%l\n" | sort > "$E/dependencies/app-close-links.tsv"; cmp "$E/dependencies/app-runtime-links.tsv" "$E/dependencies/app-close-links.tsv"
  sha256sum --quiet -c "$E/dependencies/browser.sha256"
  find "$WORK/browser/node_modules" -type l -printf "%p\t%l\n" | sort > "$E/dependencies/browser-close-links.tsv"; cmp "$E/dependencies/browser-links.tsv" "$E/dependencies/browser-close-links.tsv"
  find "$PLAYWRIGHT_BROWSERS_PATH" -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dependencies/chromium-cache-close.sha256"; cmp "$E/dependencies/chromium-cache.sha256" "$E/dependencies/chromium-cache-close.sha256"
  find "$PLAYWRIGHT_BROWSERS_PATH" -type l -printf "%p\t%l\n" | sort > "$E/dependencies/chromium-cache-close-links.tsv"; cmp "$E/dependencies/chromium-cache-links.tsv" "$E/dependencies/chromium-cache-close-links.tsv"
  find dist -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dist-close.sha256"; cmp "$E/dist-before.sha256" "$E/dist-close.sha256"
  find dist -type l -printf "%p\t%l\n" | sort > "$E/dist-close-links.tsv"; cmp "$E/dist-before-links.tsv" "$E/dist-close-links.tsv"
  (cd "$PARENT_ROOT"; sha256sum --quiet -c "$E/parent-source-before.sha256"; find dist -type f -print0 | sort -z | xargs -0 sha256sum > "$E/parent-dist-close.sha256"; find dist -type l -printf "%p\t%l\n" | sort > "$E/parent-dist-close-links.tsv")
  cmp "$E/parent-dist-before.sha256" "$E/parent-dist-close.sha256"; cmp "$E/parent-dist-before-links.tsv" "$E/parent-dist-close-links.tsv"
  test "$(readlink "$PARENT_ROOT/node_modules")" = "$PWD/node_modules"
'
run dependency-cache-hold 30 node --input-type=module - <<'NODE'
import assert from 'node:assert/strict'; import fs from 'node:fs';
const e=process.env.E, read=n=>new Map(fs.readFileSync(e+'/dependencies/'+n,'utf8').trim().split('\n').map(x=>[x.slice(66),x.slice(0,64)]));
const before=read('app-ci.sha256'), after=read('app-close.sha256');
for(const [file,hash] of before) assert.equal(after.get(file),hash,file);
for(const file of after.keys()) if(!before.has(file)) assert(/^node_modules\/\.(?:vite(?:-temp)?|cache)\//.test(file),'Only ordinary new build/test cache files: '+file);
console.log('Original app package bytes/links held, with only ordinary new build cache bytes permitted. Browser package bytes and installed Chromium cache paths/bytes/links are separately held.');
NODE
run strict-gates 30 node --input-type=module - <<'NODE'
import assert from 'node:assert/strict'; import fs from 'node:fs';
const expected=['identity','locked-packages','runtime','brand-runtime','syntax','types','build','build-hold','parent-prepare','parent-build','native','native-receipt','search-ranking',...process.env.READERS.split(',').map(x=>'reader-'+x),'reader-receipts','closing','dependency-cache-hold'];
const entries=fs.readFileSync(process.env.E+'/gates.tsv','utf8').trim().split('\n').map(x=>x.split('\t'));
fs.writeFileSync(process.env.E+'/strict-gates.json',JSON.stringify({expected,actual:entries},null,2)); assert.deepEqual(entries.map(x=>x[0]),expected); assert(entries.every(x=>x[1]==='0'));
console.log('Every actual named gate succeeded; no skipped or red reader is waived.');
NODE
execution_complete=1
exit "$failed"
