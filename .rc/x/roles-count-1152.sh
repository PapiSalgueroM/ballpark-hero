#!/usr/bin/env bash
# Remote-only actual RolesScreen component proof. No application edits.
set -uo pipefail
test "${GITHUB_ACTIONS:-}" = true || exit 2
test -n "${RC_OUT:-}" && test -n "${RUNNER_TEMP:-}" || exit 2
BASE_HEAD=c623e77d22541ac88c30f48b078a9a8a9c699e1d
CHECKED_HEAD=3f81eaa04550055864746af1067c3ba300886676
CHECKED_TREE=f6d60a34cb333701f6aef19659ce6c90861ec37a
REQUEST_HEAD=$(git rev-parse HEAD)
WORK=$(mktemp -d "$RUNNER_TEMP/roles-count-1152.XXXXXX") || exit 2
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
  archive="$WORK/roles-count-1152-evidence.tar.xz"
  timeout -k 10 180 tar -c -I "xz -T2 -8" -f "$archive" -C "$E" .; packed=$?
  bytes=$(stat -c %s "$archive" 2>/dev/null || echo unavailable)
  if test "$packed" = 0 && test "$bytes" -le 24000000; then
    timeout -k 10 30 cp "$archive" "$RC_OUT/roles-count-1152-evidence.tar.xz" || failed=1
    timeout -k 10 20 sha256sum "$RC_OUT/roles-count-1152-evidence.tar.xz" > "$RC_OUT/evidence.sha256" || failed=1
    printf 'checked=%s\nrequest=%s\nbytes=%s\nfailed=%s\nexecution_complete=%s\nending=%s\n' "$CHECKED_HEAD" "$REQUEST_HEAD" "$bytes" "$failed" "$execution_complete" "$ending" > "$RC_OUT/receipt.txt" || failed=1
  else
    printf 'EVIDENCE CAP FAILURE: pack_exit=%s bytes=%s limit=24000000; full payload retained only at runner path %s, no truncated evidence accepted.\n' "$packed" "$bytes" "$archive" | tee "$RC_OUT/EVIDENCE-CAP-FAILURE.txt"
    failed=1
  fi
  printf 'Roles count1152 strict label: failed=%s, complete=%s, source=%s, request=%s.\n' "$failed" "$execution_complete" "$CHECKED_HEAD" "$REQUEST_HEAD"
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
  printf "%s\n" .github/workflows/lane-remote-check.yml .rc/request.txt .rc/run.sh .rc/x/roles-count-1152.sh .rc/x/roles-count-1152.mjs | LC_ALL=C sort > "$E/allowed-overlay.txt"
  git diff --name-only --no-renames "$CHECKED_HEAD" HEAD | LC_ALL=C sort > "$E/actual-overlay.txt"
  cmp "$E/allowed-overlay.txt" "$E/actual-overlay.txt"
  printf "%s\n" "0387620515472753db7cff91e1a51eee5d2ebce6c3aad148c0f618995abd3bf1  .rc/request.txt" "668aeb520674d130f1af2e88494775afff6b8055d9911c715a8b646056b4b62f  .rc/run.sh" "447a4eca8616f708831ec5e6b7bf90ba68afc606054c0e0d0b27b4cb84abec20  .github/workflows/lane-remote-check.yml" "464b0346d96d640c4528c0608baabce9a975ce7423663b6c0eebbed13a676061  .rc/x/roles-count-1152.mjs" "90f6b7e7bb88b96b82a84fe09ea38312a83628a9432c4d2a9ad4619008a8faf8  src/components/club-manager/RolesScreen.tsx" > "$E/reviewed-inputs.sha256"
  sha256sum -c "$E/reviewed-inputs.sha256"
  sha256sum .rc/x/roles-count-1152.sh > "$E/dispatched-shell.sha256"
  printf "%s\n" docs/PROJECT-STATE.md src/components/club-manager/RolesScreen.tsx | LC_ALL=C sort > "$E/allowed-candidate.txt"
  git diff --name-only --no-renames "$BASE_HEAD" "$CHECKED_HEAD" | LC_ALL=C sort > "$E/actual-candidate.txt"
  cmp "$E/allowed-candidate.txt" "$E/actual-candidate.txt"
  git rev-parse HEAD HEAD^ "HEAD^{tree}" > "$E/identity.txt"
  git ls-tree -r HEAD > "$E/git-runtime-manifest.txt"
  git ls-tree -r "$CHECKED_HEAD" > "$E/git-checked-manifest.txt"
  git ls-tree -r "$BASE_HEAD" > "$E/git-base-manifest.txt"
  git ls-files -z > "$E/runtime-paths.nul"
  git ls-files -z | sort -z | xargs -0 sha256sum > "$E/source-before.sha256"
  git diff "$BASE_HEAD" "$CHECKED_HEAD" -- src/components/club-manager/RolesScreen.tsx > "$E/product.diff"
  selected=(src/components/club-manager/RolesScreen.tsx src/lib/clubManager.ts src/hooks/useRevealScroll.ts src/lib/utils.ts src/index.css src/main.tsx src/App.tsx package.json package-lock.json vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json tailwind.config.ts postcss.config.js index.html scripts/lib/offlineTransport.cjs scripts/runAllSims.mjs scripts/simAdsense.mjs scripts/simBrand.mjs scripts/simHeadTags.mjs scripts/simHiddenPages.mjs scripts/simHubs.mjs scripts/simIndexNow.mjs scripts/simIndexing.mjs scripts/simInternalLinks.mjs scripts/simNoRivalNames.mjs scripts/simPrerender.mjs scripts/simPrerenderBoot.mjs scripts/simRetiredRoutes.mjs scripts/simSchema.mjs scripts/simSitemap.mjs scripts/simSnapshotAssets.mjs)
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
run syntax 20 bash -euo pipefail -c 'bash -n .rc/x/roles-count-1152.sh; node --check .rc/x/roles-count-1152.mjs'
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
if test "${gates[build-hold]}" = 0 && test "${gates[parent-prepare]}" = 0 && test "${gates[runtime]}" = 0 && test "${gates[syntax]}" = 0; then
  run native 360 env NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" node .rc/x/roles-count-1152.mjs
else skip native; fi
run native-receipt 30 node --input-type=module - <<'NODE'
import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import {createHash} from 'node:crypto';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const report=JSON.parse(fs.readFileSync(process.env.E+'/native/report.json'));
assert.equal(report.checked,process.env.CHECKED_HEAD); assert.equal(report.parent,process.env.BASE_HEAD); assert.equal(report.componentOnly,true); assert.equal(report.expectedRows,13); assert.equal(report.rows.length,13); assert.equal(report.captureErrors.length,0);
const expected=[]; for(const arm of ['candidate','parent']) for(const total of [0,1,5,6,8]) expected.push(`${arm}-390-${total}`); for(const arm of ['candidate','parent']) expected.push(`${arm}-1280-6`); expected.push('preview-control-390-6');
assert.deepEqual(report.rows.map(r=>r.id),expected);
const defects=report.rows.filter(r=>r.parentCountDefect); assert.deepEqual(defects.map(r=>r.id),['parent-390-6','parent-390-8','parent-1280-6']);
for(const row of report.rows) {
  assert.equal(row.accepted,true,row.id); assert.equal(row.pageErrors.length,0); assert.equal(row.unexpectedConsole.length,0); assert(!row.finalizationError && !row.infrastructureError); assert.equal(row.fixture.expected.broken.length,row.total); assert.deepEqual(row.fixture.expected.broken.map(p=>p.id),row.fixture.expected.ids); assert.equal(row.groups.length,5);
  assert(row.responses.some(r=>r.file.endsWith('/roles.js'))); assert(row.responses.some(r=>r.file.endsWith('/index.html'))); assert(row.responses.some(r=>r.file.startsWith('css/')));
  if(row.arm==='preview-control') { assert.equal(row.status,'failed'); assert.equal(row.stage,'preview-count'); assert.equal(row.error.name,'AssertionError'); assert(row.error.message.includes('Preview remains capped at five')); assert.equal(row.previewNames.length,6); assert(row.captures.includes('00-front') && row.captures.includes('failure')); }
  else { assert.equal(row.status,'completed'); assert.equal(row.previewNames.length,Math.min(row.total,5)); assert.deepEqual(row.previewNames,row.fixture.expected.broken.slice(0,5).map(p=>p.name)); assert(row.captures.includes('00-front') && row.captures.includes('04-returned')); if(row.total>5) { assert(row.captures.includes('03-sixth-detail')); assert.deepEqual(row.rungNames,row.fixture.expected.groups.find(g=>g.role==='star').names); } const state=JSON.parse(fs.readFileSync(process.env.E+'/native/cases/'+row.id+'/04-returned.json')); assert.deepEqual(state.callbacks,[]); assert(state.careerUnchanged); if(row.total) assert(state.activations.some(a=>a.type==='keydown' && a.key==='Enter' && a.trusted)); }
}
assert.equal(report.fixturePairs.length,6); assert(report.fixturePairs.every(p=>p.same && p.candidate===p.parent)); assert.equal(report.bundles.candidate.componentSha256,'90f6b7e7bb88b96b82a84fe09ea38312a83628a9432c4d2a9ad4619008a8faf8'); assert.notEqual(report.bundles.parent.componentSha256,report.bundles.candidate.componentSha256); assert.notEqual(report.bundles['preview-control'].componentSha256,report.bundles.candidate.componentSha256);
const change=JSON.parse(fs.readFileSync(process.env.E+'/native/preview-control-source/change.json')); assert.equal(change.originalSha256,report.bundles.candidate.componentSha256); assert.equal(change.changedSha256,report.bundles['preview-control'].componentSha256);
for(const arm of ['candidate','parent','preview-control']) {
  const bundle=report.bundles[arm], dir=process.env.E+'/native/fixtures/'+arm;
  assert.equal(bundle.matches.length,3); assert.equal(hash(fs.readFileSync(dir+'/roles.js')),bundle.jsSha256); assert.equal(hash(fs.readFileSync(dir+'/roles.js.map')),bundle.mapSha256); assert.equal(hash(fs.readFileSync(bundle.component)),bundle.componentSha256);
  for(const input of bundle.inputs) { const bytes=fs.readFileSync(input.file); assert.equal(bytes.length,input.bytes); assert.equal(hash(bytes),input.sha256); }
}
for(const row of report.rows) for(const response of row.responses) { const bytes=fs.readFileSync(path.join(process.env.E,'native',response.file)); assert.equal(bytes.length,response.bytes); assert.equal(hash(bytes),response.sha256); }
console.log('All12 actual component journeys, three observed parent clipped totals and one effective preview-cap control passed their exact contracts.');
NODE
readers=(simAdsense simBrand simHeadTags simHiddenPages simHubs simIndexNow simIndexing simInternalLinks simNoRivalNames simPrerender simPrerenderBoot simRetiredRoutes simSchema simSitemap simSnapshotAssets)
export READERS="$(IFS=,; echo "${readers[*]}")"
for reader in "${readers[@]}"; do
  if test "${gates[build]}" = 0 && test "${gates[runtime]}" = 0; then run "reader-$reader" 120 env NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" ONLY="$reader" node scripts/runAllSims.mjs --browser; else skip "reader-$reader"; fi
done
run reader-receipts 30 node --input-type=module - <<'NODE'
import assert from 'node:assert/strict'; import fs from 'node:fs';
for(const name of process.env.READERS.split(',')) {
  const gate='reader-'+name, log=fs.readFileSync(process.env.E+'/logs/'+gate+'.log','utf8').replace(/\x1b\[[0-9;]*m/g,'');
  assert.equal([...log.matchAll(new RegExp('^\\s*PASS\\s+'+name+'\\.mjs\\s','gm'))].length,1,'Actual named reader ran: '+name); assert(!/^\s*FAIL:/m.test(log));
}
console.log('All15 actual dist/public readers printed passing outcomes.');
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
  (cd "$PARENT_ROOT"; sha256sum --quiet -c "$E/parent-source-before.sha256")
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
const expected=['identity','locked-packages','runtime','brand-runtime','syntax','types','build','build-hold','parent-prepare','native','native-receipt',...process.env.READERS.split(',').map(x=>'reader-'+x),'reader-receipts','closing','dependency-cache-hold'];
const entries=fs.readFileSync(process.env.E+'/gates.tsv','utf8').trim().split('\n').map(x=>x.split('\t'));
fs.writeFileSync(process.env.E+'/strict-gates.json',JSON.stringify({expected,actual:entries},null,2)); assert.deepEqual(entries.map(x=>x[0]),expected); assert(entries.every(x=>x[1]==='0'));
console.log('Every actual named gate succeeded; no skipped or red reader is waived.');
NODE
execution_complete=1
exit "$failed"
