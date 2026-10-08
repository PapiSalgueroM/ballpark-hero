#!/usr/bin/env bash
# Remote-only final committed guide source gate, separate from feature integration.
set -uo pipefail
test "${GITHUB_ACTIONS:-}" = true || exit 2
test -n "${RC_OUT:-}" && test -n "${RUNNER_TEMP:-}" || exit 2
PARENT_HEAD=bdcb30031521d3fd78e6cd50fe826a8f73a3ce20
CHECKED_HEAD=fa36b48ef72bcaac8055e6c8a48501775d1e760c
CHECKED_TREE=e6f75827b06eb742f8808fe09d9e90e4e81f830d
REQUEST_HEAD=$(git rev-parse HEAD)
WORK=$(mktemp -d "$RUNNER_TEMP/guide-final-1157.XXXXXX") || exit 2
E="$WORK/evidence"
mkdir -p "$E/logs" "$E/dependencies" "$RC_OUT" || exit 2
export PLAYWRIGHT_BROWSERS_PATH="$WORK/pw-browsers"
export WORK E PARENT_HEAD CHECKED_HEAD CHECKED_TREE REQUEST_HEAD
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
  printf '%s\n' "$failed" > "$E/intended-gate-failures.txt" || failed=1
  archive="$WORK/career-guide-final-1157-evidence.tar.xz"
  timeout -k 10 180 tar -c -I "xz -T2 -8" -f "$archive" -C "$E" .; packed=$?
  bytes=$(stat -c %s "$archive" 2>/dev/null || echo unavailable)
  if test "$packed" = 0 && test "$bytes" -le 24000000; then
    timeout -k 10 30 cp "$archive" "$RC_OUT/career-guide-final-1157-evidence.tar.xz" || failed=1
    timeout -k 10 20 sha256sum "$RC_OUT/career-guide-final-1157-evidence.tar.xz" > "$RC_OUT/evidence.sha256" || failed=1
    printf 'checked=%s\nrequest=%s\nbytes=%s\nfailed=%s\nexecution_complete=%s\nending=%s\n' "$CHECKED_HEAD" "$REQUEST_HEAD" "$bytes" "$failed" "$execution_complete" "$ending" > "$RC_OUT/receipt.txt" || failed=1
  else
    printf 'EVIDENCE CAP FAILURE: pack_exit=%s bytes=%s limit=24000000; full payload retained only at runner path %s, no truncated evidence accepted.\n' "$packed" "$bytes" "$archive" | tee "$RC_OUT/EVIDENCE-CAP-FAILURE.txt"
    failed=1
  fi
  printf 'Career guide final1157 strict label: failed=%s, complete=%s, source=%s, request=%s.\n' "$failed" "$execution_complete" "$CHECKED_HEAD" "$REQUEST_HEAD"
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
# A fixed 3600-second deadline leaves bounded evidence packing slack before the kit timeout.
run identity 30 bash -euo pipefail -c '
  test "$(git rev-parse HEAD^)" = "$CHECKED_HEAD"
  test "$(git rev-parse "$CHECKED_HEAD^")" = "$PARENT_HEAD"
  test "$(git rev-parse "$CHECKED_HEAD^{tree}")" = "$CHECKED_TREE"
  git diff --exit-code HEAD
  printf "%s\n" .github/workflows/lane-remote-check.yml .rc/request.txt .rc/run.sh .rc/x/career-guide-final-1157.sh | LC_ALL=C sort > "$E/allowed-overlay.txt"
  git diff --name-only --no-renames "$CHECKED_HEAD" HEAD | LC_ALL=C sort > "$E/actual-overlay.txt"
  cmp "$E/allowed-overlay.txt" "$E/actual-overlay.txt"
  printf "%s\n" "ee31e31e8ff3a819a2f4575daa795b1df0fbb3aa324452cdd396a00acb0de7e8  .rc/request.txt" "668aeb520674d130f1af2e88494775afff6b8055d9911c715a8b646056b4b62f  .rc/run.sh" "447a4eca8616f708831ec5e6b7bf90ba68afc606054c0e0d0b27b4cb84abec20  .github/workflows/lane-remote-check.yml" > "$E/reviewed-kit.sha256"
  sha256sum -c "$E/reviewed-kit.sha256"
  sha256sum .rc/x/career-guide-final-1157.sh > "$E/dispatched-shell.sha256"
  printf "%s\n" "58373ed0951ba47535a4aac35753d1558639673a6723c44583733a812540ba8e  src/data/searchKeywords.json" "660d7cbfec3775cd71f224ce0b6161b3003ce0ed4c92bf13a645cb8ffb43791b  scripts/data/guideHeadingsFrozen.json" > "$E/reviewed-derived.sha256"
  sha256sum -c "$E/reviewed-derived.sha256"
  printf "%s\n" docs/PROJECT-STATE.md scripts/data/guideHeadingsFrozen.json src/data/searchKeywords.json | LC_ALL=C sort > "$E/allowed-candidate.txt"
  git diff --name-only --no-renames "$PARENT_HEAD" "$CHECKED_HEAD" | LC_ALL=C sort > "$E/actual-candidate.txt"
  cmp "$E/allowed-candidate.txt" "$E/actual-candidate.txt"
  git rev-parse HEAD HEAD^ "HEAD^{tree}" > "$E/identity.txt"
  git ls-tree -r HEAD > "$E/git-runtime-manifest.txt"
  git ls-tree -r "$CHECKED_HEAD" > "$E/git-checked-manifest.txt"
  git ls-tree -r "$PARENT_HEAD" > "$E/git-base-manifest.txt"
  git ls-files -z > "$E/runtime-paths.nul"
  git ls-files -z | sort -z | xargs -0 sha256sum > "$E/source-before.sha256"
  git diff "$PARENT_HEAD" "$CHECKED_HEAD" > "$E/final-source.diff"
  command -v xz; xz --version; tar --version; node --version
  selected=(
    src/data/gameContent src/data/searchKeywords.json scripts/data/guideHeadingsFrozen.json src/lib/siteSearch.ts src/pages/Search.tsx src/components/seo/GameSeoContent.tsx src/components/game/Footer.tsx
    scripts/genSearchKeywords.mjs scripts/simGuideHeadings.mjs scripts/simSiteSearch.mjs scripts/runAllSims.mjs scripts/lib/offlineTransport.cjs scripts/lib/hostLikeServer.mjs scripts/lib/playwrightLoader.mjs
    scripts/simAdsense.mjs scripts/simBrand.mjs scripts/simHeadTags.mjs scripts/simHiddenPages.mjs scripts/simHubs.mjs scripts/simIndexNow.mjs scripts/simIndexing.mjs scripts/simInternalLinks.mjs scripts/simNoRivalNames.mjs scripts/simPrerender.mjs scripts/simPrerenderBoot.mjs scripts/simRetiredRoutes.mjs scripts/simSchema.mjs scripts/simSitemap.mjs scripts/simSnapshotAssets.mjs
    scripts/lib/atomicWrite.mjs scripts/lib/retiredRoutes.mjs scripts/genHiddenStubs.mjs scripts/genRetiredStubs.mjs scripts/genSeoMetaParts.mjs scripts/logo/gen_logo.py
    package.json package-lock.json vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json tailwind.config.ts postcss.config.js index.html src/App.tsx src/data/gameRegistry.ts scripts/data/lastmod.json
  )
  git ls-files --error-unmatch -- "${selected[@]}" > "$E/selected-source-paths.txt"
  git ls-tree -r "$CHECKED_HEAD" -- "${selected[@]}" > "$E/selected-source-git-manifest.txt"
  git archive "$CHECKED_HEAD" -- "${selected[@]}" > "$E/selected-source.tar"
  sha256sum "$E/selected-source.tar" > "$E/selected-source.sha256"
  cp package.json package-lock.json "$E/dependencies/"
  tar -cf "$E/dependencies/typescript-package.tar" -C node_modules typescript
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
const installed=JSON.parse(fs.readFileSync('node_modules/typescript/package.json'));
assert.equal(installed.version,lock.packages['node_modules/typescript'].version);
const main=fs.realpathSync('node_modules/typescript/'+installed.main);
assert(main.startsWith(fs.realpathSync('node_modules/typescript')+'/'));
fs.writeFileSync(process.env.E+'/dependencies/typescript-runtime.json',JSON.stringify({version:installed.version,main:installed.main,resolvedMain:main,nodeVersions:process.versions},null,2));
console.log('Verified '+rows.length+' actual installed locked package versions, including parser TypeScript '+installed.version+'.');
NODE
if test "${gates[locked-packages]}" = 0; then
  run runtime 240 bash -euo pipefail -c '
    browser="$WORK/browser"; mkdir -p "$browser"
    npm install --prefix "$browser" --no-save --package-lock=false playwright@1.64.0
    test ! -e node_modules/playwright && test ! -e node_modules/playwright-core
    ln -s "$browser/node_modules/playwright" node_modules/playwright
    ln -s "$browser/node_modules/playwright-core" node_modules/playwright-core
    node "$browser/node_modules/playwright/cli.js" install --with-deps chromium
    node "$browser/node_modules/playwright/cli.js" --version
    find "$PLAYWRIGHT_BROWSERS_PATH" -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dependencies/chromium-before.sha256"
    find "$PLAYWRIGHT_BROWSERS_PATH" -type l -printf "%p\t%l\n" | sort > "$E/dependencies/chromium-before-links.tsv"
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
run syntax 30 bash -euo pipefail -c 'bash -n .rc/x/career-guide-final-1157.sh; node --check scripts/genSearchKeywords.mjs; node --check scripts/simGuideHeadings.mjs; node --check scripts/simSiteSearch.mjs'
run types 120 node_modules/.bin/tsc --noEmit -p tsconfig.app.json
run build 180 env NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" npm run build
if test "${gates[build]}" = 0; then
  run build-hold 30 bash -euo pipefail -c '
    sha256sum --quiet -c "$E/source-before.sha256"; git diff --exit-code HEAD
    find dist -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dist-before.sha256"
    find dist -type l -printf "%p\t%l\n" | sort > "$E/dist-before-links.tsv"
    tar -cf "$E/actual-dist.tar" dist
  '
else skip build-hold; fi
if test "${gates[syntax]}" = 0 && test "${gates[types]}" = 0; then
  run guide-headings 180 env -u GUIDE_HEADINGS_CONTROL NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" node scripts/simGuideHeadings.mjs
  run site-search 180 env -u SIM_SEARCH_CONTROL NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" node scripts/simSiteSearch.mjs
else skip guide-headings; skip site-search; fi
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
const guide=fs.readFileSync(process.env.E+'/logs/guide-headings.log','utf8');
const search=fs.readFileSync(process.env.E+'/logs/site-search.log','utf8');
assert(/^simGuideHeadings: green\. 131 guides /m.test(guide),'Actual131 guide headings outcome');
assert(/^simSiteSearch: green\. Every game is findable by name,/m.test(search),'Actual search outcome');
assert(!/^\s*FAIL:/m.test(guide+search),'No unwaived guide/search findings');
console.log('All15 actual named dist/public readers and actual guide/search guards printed their passing outcomes.');
NODE
run closing 120 bash -euo pipefail -c '
  sha256sum --quiet -c "$E/source-before.sha256"; git diff --exit-code HEAD
  git ls-files --others --exclude-standard -- src scripts .rc .github/workflows public index.html package.json package-lock.json > "$E/untracked-inputs.txt"; test ! -s "$E/untracked-inputs.txt"
  git rev-parse HEAD HEAD^ "HEAD^{tree}" > "$E/identity-close.txt"; cmp "$E/identity.txt" "$E/identity-close.txt"
  cmp package.json "$E/dependencies/package.json"; cmp package-lock.json "$E/dependencies/package-lock.json"
  find node_modules -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dependencies/app-close.sha256"; sha256sum --quiet -c "$E/dependencies/app-ci.sha256"
  find node_modules -type l -printf "%p\t%l\n" | sort > "$E/dependencies/app-close-links.tsv"; cmp "$E/dependencies/app-runtime-links.tsv" "$E/dependencies/app-close-links.tsv"
  sha256sum --quiet -c "$E/dependencies/browser.sha256"
  find "$WORK/browser/node_modules" -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dependencies/browser-close.sha256"; cmp "$E/dependencies/browser.sha256" "$E/dependencies/browser-close.sha256"
  find "$PLAYWRIGHT_BROWSERS_PATH" -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dependencies/chromium-close.sha256"; cmp "$E/dependencies/chromium-before.sha256" "$E/dependencies/chromium-close.sha256"
  find "$PLAYWRIGHT_BROWSERS_PATH" -type l -printf "%p\t%l\n" | sort > "$E/dependencies/chromium-close-links.tsv"; cmp "$E/dependencies/chromium-before-links.tsv" "$E/dependencies/chromium-close-links.tsv"
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
const expected=['identity','locked-packages','runtime','brand-runtime','syntax','types','build','build-hold','guide-headings','site-search',...process.env.READERS.split(',').map(x=>'reader-'+x),'reader-receipts','closing','dependency-cache-hold'];
const entries=fs.readFileSync(process.env.E+'/gates.tsv','utf8').trim().split('\n').map(x=>x.split('\t'));
fs.writeFileSync(process.env.E+'/strict-gates.json',JSON.stringify({expected,actual:entries},null,2));
assert.deepEqual(entries.map(x=>x[0]),expected); assert(entries.every(x=>x[1]==='0'));
console.log('Every actual named final committed guide/source/dependency/build/reader gate succeeded. Feature integration and publication remain separate.');
NODE
execution_complete=1
exit "$failed"
