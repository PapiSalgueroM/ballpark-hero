#!/usr/bin/env bash
# Remote-only actual runner selection proof with early child sentinels. No application edits.
set -uo pipefail
test "${GITHUB_ACTIONS:-}" = true || exit 2
test -n "${RC_OUT:-}" && test -n "${RUNNER_TEMP:-}" || exit 2
PARENT_HEAD=783049d48edd689169e947ee1797ce19bf02979d
CHECKED_HEAD=45754e9751cdef19a11e2332239910c6b1b4fda7
CHECKED_TREE=171b0a57191f29134db714ec891a6b0cdf9d86ba
REQUEST_HEAD=$(git rev-parse HEAD)
WORK=$(mktemp -d "$RUNNER_TEMP/runner-1154.XXXXXX") || exit 2
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
retain_discovery() {
  local folders=()
  shopt -s nullglob
  folders=("$PWD"/.sim-control/browser-discovery-*)
  shopt -u nullglob
  test "${#folders[@]}" = 0 && return 0
  test "${#folders[@]}" = 1 && test -d "${folders[0]}" || return 1
  mkdir -p "$E/discovery" || return 1
  timeout -k 10 30 cp -a "${folders[0]}/." "$E/discovery/fixture/"
  local copied=$?
  printf '%s\n' "$copied" > "$E/discovery/finalizer-copy-exit.txt"
  return "$copied"
}
finalize() {
  local exit_code=$? archive packed bytes retained
  trap - EXIT TERM INT HUP
  test -z "$watchdog" || kill -TERM -- "-$watchdog" 2>/dev/null || true
  test "$exit_code" = 0 && test "$execution_complete" = 1 || failed=1
  printf 'exit=%s\nexecution_complete=%s\nending=%s\nlast_phase=%s\n' "$exit_code" "$execution_complete" "$ending" "$current_phase" > "$E/execution.txt" || failed=1
  retain_discovery || failed=1
  printf '%s\n' "$failed" > "$E/intended-gate-failures.txt" || failed=1
  archive="$WORK/runner-discovery-1154-evidence.tar.xz"
  timeout -k 10 180 tar -c -I "xz -T2 -8" -f "$archive" -C "$E" .; packed=$?
  bytes=$(stat -c %s "$archive" 2>/dev/null || echo unavailable)
  if test "$packed" = 0 && test "$bytes" -le 24000000; then
    timeout -k 10 30 cp "$archive" "$RC_OUT/runner-discovery-1154-evidence.tar.xz" || failed=1
    timeout -k 10 20 sha256sum "$RC_OUT/runner-discovery-1154-evidence.tar.xz" > "$RC_OUT/evidence.sha256" || failed=1
    printf 'checked=%s\nrequest=%s\nbytes=%s\nfailed=%s\nexecution_complete=%s\nending=%s\n' "$CHECKED_HEAD" "$REQUEST_HEAD" "$bytes" "$failed" "$execution_complete" "$ending" > "$RC_OUT/receipt.txt" || failed=1
  else
    printf 'EVIDENCE CAP FAILURE: pack_exit=%s bytes=%s limit=24000000; full payload retained only at runner path %s, no truncated evidence accepted.\n' "$packed" "$bytes" "$archive" | tee "$RC_OUT/EVIDENCE-CAP-FAILURE.txt"
    failed=1
  fi
  printf 'Runner discovery1154 strict label: failed=%s, complete=%s, source=%s, request=%s.\n' "$failed" "$execution_complete" "$CHECKED_HEAD" "$REQUEST_HEAD"
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
  printf "%s\n" .github/workflows/lane-remote-check.yml .rc/request.txt .rc/run.sh .rc/x/runner-discovery-1154.sh | LC_ALL=C sort > "$E/allowed-overlay.txt"
  git diff --name-only --no-renames "$CHECKED_HEAD" HEAD | LC_ALL=C sort > "$E/actual-overlay.txt"
  cmp "$E/allowed-overlay.txt" "$E/actual-overlay.txt"
  printf "%s\n" "81500337afc0dde0d13ed5286bc7fb92349727324c19eef94e271c84bc562b0f  .rc/request.txt" "668aeb520674d130f1af2e88494775afff6b8055d9911c715a8b646056b4b62f  .rc/run.sh" "447a4eca8616f708831ec5e6b7bf90ba68afc606054c0e0d0b27b4cb84abec20  .github/workflows/lane-remote-check.yml" > "$E/reviewed-kit.sha256"
  sha256sum -c "$E/reviewed-kit.sha256"
  sha256sum .rc/x/runner-discovery-1154.sh > "$E/dispatched-shell.sha256"
  printf "%s\n" "f221ed09268c855739712dd0a0021bcbf84d55540ca0d305f0bc7b1da7801d4a  scripts/runAllSims.mjs" "4bdd2dda3126fba33f14a183efda6d223ca06f3446f090a89095afbbbdbc497a  scripts/simBrowserHarnessDiscovery.mjs" > "$E/reviewed-source.sha256"
  sha256sum -c "$E/reviewed-source.sha256"
  printf "%s\n" docs/PROJECT-STATE.md scripts/runAllSims.mjs scripts/simBrowserHarnessDiscovery.mjs | LC_ALL=C sort > "$E/allowed-candidate.txt"
  git diff --name-only --no-renames "$PARENT_HEAD" "$CHECKED_HEAD" | LC_ALL=C sort > "$E/actual-candidate.txt"
  cmp "$E/allowed-candidate.txt" "$E/actual-candidate.txt"
  git rev-parse HEAD HEAD^ "HEAD^{tree}" > "$E/identity.txt"
  git ls-tree -r HEAD > "$E/git-runtime-manifest.txt"
  git ls-tree -r "$CHECKED_HEAD" > "$E/git-checked-manifest.txt"
  git ls-tree -r "$PARENT_HEAD" > "$E/git-base-manifest.txt"
  git ls-files -z > "$E/runtime-paths.nul"
  git ls-files -z | sort -z | xargs -0 sha256sum > "$E/source-before.sha256"
  git diff "$PARENT_HEAD" "$CHECKED_HEAD" -- scripts > "$E/runner-only.diff"
  command -v xz; xz --version; tar --version; node --version
  test ! -d .sim-control || test -z "$(find .sim-control -mindepth 1 -maxdepth 1 -type d -name "browser-discovery-*" -print -quit)"
  selected=(
    scripts/runAllSims.mjs scripts/simBrowserHarnessDiscovery.mjs scripts/lib/offlineTransport.cjs scripts/lib/hostLikeServer.mjs scripts/lib/playwrightLoader.mjs
    scripts/playSoccerHubGrid1089.mjs scripts/playSoccerOfferReview1082.mjs scripts/playTycoonSaleReview1083.mjs scripts/simBracketMoment.mjs
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
cat > "$E/discovery-receipts.mjs" <<'DISCOVERY_RECEIPTS'
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Remote-only retained runner proof');
const root = process.cwd(), out = path.join(process.env.E, 'discovery');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const candidates = fs.readdirSync(path.join(root, '.sim-control'), { withFileTypes: true })
  .filter(row => row.isDirectory() && row.name.startsWith('browser-discovery-'));
assert.equal(candidates.length, 1, 'Exactly one actual owned discovery fixture');
const folder = path.join(root, '.sim-control', candidates[0].name);
fs.mkdirSync(out, { recursive: true });
fs.cpSync(folder, path.join(out, 'fixture'), { recursive: true, dereference: false });
const reportFile = path.join(folder, 'report.json');
const report = JSON.parse(fs.readFileSync(reportFile));
const held = ['scripts/runAllSims.mjs', 'scripts/lib/offlineTransport.cjs', 'scripts/lib/hostLikeServer.mjs',
  'scripts/playSoccerHubGrid1089.mjs', 'scripts/playSoccerOfferReview1082.mjs',
  'scripts/playTycoonSaleReview1083.mjs', 'scripts/simBracketMoment.mjs', 'scripts/simNoRivalNames.mjs'];
assert.deepEqual(Object.keys(report.before), held);
for (const file of held) assert.equal(digest(fs.readFileSync(path.join(root, file))), report.before[file], 'Held actual source: ' + file);
const actual = held.slice(3).map(file => ({ file: path.basename(file), browser: file !== 'scripts/simNoRivalNames.mjs', source: fs.readFileSync(path.join(root, file), 'utf8'), actualSourceSha256: report.before[file] }));
const synthetic = [
  { file: 'simStaticNamed.mjs', browser: true, source: "import { chromium } from 'playwright';" },
  { file: 'simStaticLoader.mjs', browser: true, source: "import { chromium } from './lib/playwrightLoader.mjs';" },
  { file: 'simDirectRequire.mjs', browser: true, source: "const module = require('playwright');" },
  { file: 'simDynamicSpaced.mjs', browser: true, source: "await import /* actual import */ ('./lib/playwrightLoader.mjs');" },
  { file: 'simLineComment.mjs', browser: false, source: "// import './lib/playwrightLoader.mjs';" },
  { file: 'simBlockComment.mjs', browser: false, source: "/* require('playwright'); */" },
  { file: 'simQuotedSource.mjs', browser: false, source: 'const example = "await import(\'./lib/playwrightLoader.mjs\')";' },
  { file: 'simTemplateSource.mjs', browser: false, source: 'const example = `import "playwright";`;' },
  { file: 'simPlainNode.mjs', browser: false, source: "import os from 'node:os'; const note = 'playwright';" },
];
const fixtures = [...actual, ...synthetic];
assert.equal(fixtures.length, 14);
assert.deepEqual(report.fixtures, fixtures.map(({ source, ...row }) => row));
for (const row of fixtures) {
  const prelude = `const _dukbDiscovery = await import('node:fs');\n` +
    `_dukbDiscovery.appendFileSync(process.env.DISCOVERY_MARKER, JSON.stringify({file:${JSON.stringify(row.file)},only:process.env.ONLY??null,browser:process.env.BROWSER??null,base:process.env.BASE??null,sweep:process.env.SWEEP_BASE??null})+'\\n');\n` +
    `console.log(${JSON.stringify(row.file + '\nOwned child selected\nNo game or browser executed\nSelection receipt complete')});\nprocess.exit(0);\n`;
  assert.equal(fs.readFileSync(path.join(folder, 'scripts', row.file), 'utf8'), prelude + row.source, 'Actual sentinel plus untouched source body: ' + row.file);
}
const runner = fs.readFileSync(path.join(root, held[0]), 'utf8').replace(/\r\n/g, '\n');
const anchor = 'node.expression.kind === ts.SyntaxKind.ImportKeyword';
assert.equal(runner.split(anchor).length - 1, 1);
const controlled = runner.replace(anchor, 'false');
assert.notEqual(controlled, runner);
assert.equal(controlled.split(anchor).length - 1, 0);
assert.equal(controlled.replace('false\n        || ts.isIdentifier(node.expression)', anchor + '\n        || ts.isIdentifier(node.expression)'), runner, 'Exact one-anchor control inverse');
assert.equal(fs.readFileSync(path.join(folder, 'scripts', 'runAllSims.mjs'), 'utf8'), controlled);
const normal = fixtures.filter(row => !row.browser).map(row => row.file).sort();
const all = fixtures.map(row => row.file).sort();
const five = [...held.slice(3, 7).map(file => path.basename(file)), 'simDynamicSpaced.mjs'].sort();
assert.equal(normal.length, 6); assert.equal(five.length, 5);
const expected = [normal, all, [...normal, ...five].sort()];
assert.equal(report.observations.length, 3);
for (let i = 0; i < 3; i++) {
  const row = report.observations[i], names = row.rows.map(r => r.file).sort();
  assert.equal(row.browser, i === 1); assert.equal(row.code, 0);
  assert.equal(row.sourceSha256, digest(i === 2 ? controlled : runner));
  assert.deepEqual(names, expected[i], 'Exact actual child set: ' + i);
  assert.equal(new Set(names).size, names.length, 'Each actual selected child ran once');
  assert(row.rows.every(r => r.only === null && r.browser === null), 'No runner selection controls leak');
  for (const child of row.rows) {
    if (i === 1 && fixtures.find(r => r.file === child.file).browser) {
      assert.match(child.base, /^http:\/\/127\.0\.0\.1:\d+$/); assert.equal(child.sweep, child.base);
    }
    assert.equal([...row.output.matchAll(new RegExp('^\\s*PASS\\s+' + child.file.replaceAll('.', '\\.') + '\\s', 'gm'))].length, 1, 'Actual printed child PASS: ' + child.file);
  }
  assert(!/^\s*(?:FAIL|EMPTY)\s+\S+\.mjs\s/m.test(row.output));
}
assert.deepEqual(report.observations[2].intendedFailure.actual, expected[2]);
assert.deepEqual(report.observations[2].intendedFailure.expected, normal);
assert.equal(report.observations[2].intendedFailure.name, 'AssertionError');
assert(report.observations[2].intendedFailure.message.startsWith('Default runner omits every actual and synthetic browser import'));
const marker = fs.readFileSync(path.join(folder, 'children.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
assert.deepEqual(marker, report.observations[2].rows, 'Actual final child marker file');
assert.equal(fs.readFileSync(path.join(folder, 'scripts/lib/offlineTransport.cjs')).equals(fs.readFileSync(path.join(root, 'scripts/lib/offlineTransport.cjs'))), true);
assert.equal(fs.readFileSync(path.join(folder, 'scripts/lib/hostLikeServer.mjs')).equals(fs.readFileSync(path.join(root, 'scripts/lib/hostLikeServer.mjs'))), true);
assert.equal(fs.readFileSync(path.join(folder, 'scripts/lib/playwrightLoader.mjs'), 'utf8'), 'export const chromium = {};\n');
assert.equal(fs.realpathSync(path.join(folder, 'node_modules/typescript')), fs.realpathSync(path.join(root, 'node_modules/typescript')));
const installed = JSON.parse(fs.readFileSync('node_modules/typescript/package.json'));
const lock = JSON.parse(fs.readFileSync('package-lock.json'));
assert.equal(installed.version, lock.packages['node_modules/typescript'].version);
assert.equal(digest(fs.readFileSync('node_modules/typescript/' + installed.main)), digest(fs.readFileSync(path.join(folder, 'node_modules/typescript', installed.main))));
const rawFiles = [];
function visit(dir) { for (const row of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, row.name); if (row.isDirectory()) visit(file); else if (row.isSymbolicLink()) rawFiles.push({ path: path.relative(folder, file), link: fs.readlinkSync(file), realpath: fs.realpathSync(file) }); else { const bytes = fs.readFileSync(file); rawFiles.push({ path: path.relative(folder, file), bytes: bytes.length, sha256: digest(bytes) }); } } }
visit(folder);
fs.writeFileSync(path.join(out, 'receipt.json'), JSON.stringify({ scope: 'Actual runner selection through early child sentinels, no game/browser execution', fixture: folder, reportSha256: digest(fs.readFileSync(reportFile)), baselineSourceSha256: digest(runner), controlledSourceSha256: digest(controlled), exactInverse: true, normalChildren: normal, browserOptInChildren: all, effectiveAddedChildren: five, totalActualChildReceipts: 31, installedTypeScript: { version: installed.version, main: installed.main, mainSha256: digest(fs.readFileSync('node_modules/typescript/' + installed.main)) }, rawFiles }, null, 2));
console.log('Actual selection proof PASS: 6 default node children, all 14 browser opt-in children and exactly 5 effective copied dynamic-import additions.');
console.log('All 31 child marker/PASS receipts, full fixture sources, concrete helper bytes and locked installed TypeScript binding are retained.');
DISCOVERY_RECEIPTS
run syntax 30 bash -euo pipefail -c 'bash -n .rc/x/runner-discovery-1154.sh; node --check scripts/runAllSims.mjs; node --check scripts/simBrowserHarnessDiscovery.mjs; node --check "$E/discovery-receipts.mjs"; printf "%s\n" "78e6fcb3d7a11c2e3a39d4f230a71af37ce7b755f5bd6b9a14cd0fcb585a08f5  $E/discovery-receipts.mjs" | sha256sum -c -'
run types 120 node_modules/.bin/tsc --noEmit -p tsconfig.app.json
run build 180 env NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" npm run build
if test "${gates[build]}" = 0; then
  run build-hold 30 bash -euo pipefail -c '
    sha256sum --quiet -c "$E/source-before.sha256"; git diff --exit-code HEAD
    find dist -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dist-before.sha256"
    find dist -type l -printf "%p\t%l\n" | sort > "$E/dist-before-links.tsv"
  '
else skip build-hold; fi
if test "${gates[syntax]}" = 0 && test "${gates[types]}" = 0 && test "${gates[build-hold]}" = 0; then
  run discovery 180 env -u ONLY -u BROWSER -u BASE -u SWEEP_BASE NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" node scripts/simBrowserHarnessDiscovery.mjs
else skip discovery; fi
if test "${gates[discovery]}" = 0; then
  run discovery-receipts 60 node "$E/discovery-receipts.mjs"
else skip discovery-receipts; fi
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
run closing 120 bash -euo pipefail -c '
  sha256sum --quiet -c "$E/source-before.sha256"; git diff --exit-code HEAD
  git ls-files --others --exclude-standard -- src scripts .rc .github/workflows public index.html package.json package-lock.json > "$E/untracked-inputs.txt"; test ! -s "$E/untracked-inputs.txt"
  git rev-parse HEAD HEAD^ "HEAD^{tree}" > "$E/identity-close.txt"; cmp "$E/identity.txt" "$E/identity-close.txt"
  cmp package.json "$E/dependencies/package.json"; cmp package-lock.json "$E/dependencies/package-lock.json"
  find node_modules -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dependencies/app-close.sha256"; sha256sum --quiet -c "$E/dependencies/app-ci.sha256"
  find node_modules -type l -printf "%p\t%l\n" | sort > "$E/dependencies/app-close-links.tsv"; cmp "$E/dependencies/app-runtime-links.tsv" "$E/dependencies/app-close-links.tsv"
  sha256sum --quiet -c "$E/dependencies/browser.sha256"
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
const expected=['identity','locked-packages','runtime','brand-runtime','syntax','types','build','build-hold','discovery','discovery-receipts',...process.env.READERS.split(',').map(x=>'reader-'+x),'reader-receipts','closing','dependency-cache-hold'];
const entries=fs.readFileSync(process.env.E+'/gates.tsv','utf8').trim().split('\n').map(x=>x.split('\t'));
fs.writeFileSync(process.env.E+'/strict-gates.json',JSON.stringify({expected,actual:entries},null,2));
assert.deepEqual(entries.map(x=>x[0]),expected); assert(entries.every(x=>x[1]==='0'));
console.log('Every actual named preparation/actual-runner-selection/control/reader/source/dependency/build gate succeeded.');
NODE
execution_complete=1
exit "$failed"
