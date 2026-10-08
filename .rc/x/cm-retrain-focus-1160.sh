#!/usr/bin/env bash
# Remote-only actual TrainingScreen keyboard focus proof. No application edits.
set -uo pipefail
test "${GITHUB_ACTIONS:-}" = true || exit 2
test -n "${RC_OUT:-}" && test -n "${RUNNER_TEMP:-}" || exit 2
BASE_HEAD=795926e37621e437afa986c78185b3b4383636c8
CHECKED_HEAD=dd97e4d95b0981a3f8beef16c08fc2991ce37464
CHECKED_TREE=7457b4d890ca06a2ae66a69b22a65fdab27b265c
REQUEST_HEAD=$(git rev-parse HEAD)
WORK=$(mktemp -d "$RUNNER_TEMP/retrain-1160.XXXXXX") || exit 2
E="$WORK/evidence"
mkdir -p "$E/logs" "$E/dependencies" "$RC_OUT" || exit 2
BASE_ROOT="$WORK/base-root"
export PLAYWRIGHT_BROWSERS_PATH="$WORK/pw-browsers"
export WORK E BASE_HEAD CHECKED_HEAD CHECKED_TREE REQUEST_HEAD BASE_ROOT
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
  # All native captures are written directly into evidence throughout the run.
  printf '%s\n' "$failed" > "$E/intended-gate-failures.txt" || failed=1
  archive="$WORK/cm-retrain-1160-evidence.tar.xz"
  timeout -k 10 180 tar -c -I "xz -T2 -8" -f "$archive" -C "$E" .; packed=$?
  bytes=$(stat -c %s "$archive" 2>/dev/null || echo unavailable)
  if test "$packed" = 0 && test "$bytes" -le 24000000; then
    timeout -k 10 30 cp "$archive" "$RC_OUT/cm-retrain-1160-evidence.tar.xz" || failed=1
    timeout -k 10 20 sha256sum "$RC_OUT/cm-retrain-1160-evidence.tar.xz" > "$RC_OUT/evidence.sha256" || failed=1
    printf 'checked=%s\nrequest=%s\nbytes=%s\nfailed=%s\nexecution_complete=%s\nending=%s\n' "$CHECKED_HEAD" "$REQUEST_HEAD" "$bytes" "$failed" "$execution_complete" "$ending" > "$RC_OUT/receipt.txt" || failed=1
  else
    printf 'EVIDENCE CAP FAILURE: pack_exit=%s bytes=%s limit=24000000; full payload retained only at runner path %s, no truncated evidence accepted.\n' "$packed" "$bytes" "$archive" | tee "$RC_OUT/EVIDENCE-CAP-FAILURE.txt"
    failed=1
  fi
  printf 'Club Manager retrain1160 strict label: failed=%s, complete=%s, source=%s, request=%s.\n' "$failed" "$execution_complete" "$CHECKED_HEAD" "$REQUEST_HEAD"
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
  test "$(git rev-parse "$CHECKED_HEAD^")" = "$BASE_HEAD"
  test "$(git rev-parse "$CHECKED_HEAD^{tree}")" = "$CHECKED_TREE"
  git diff --exit-code HEAD
  printf "%s\n" .github/workflows/lane-remote-check.yml .rc/request.txt .rc/run.sh .rc/x/cm-retrain-focus-1160.sh | LC_ALL=C sort > "$E/allowed-overlay.txt"
  git diff --name-only --no-renames "$CHECKED_HEAD" HEAD | LC_ALL=C sort > "$E/actual-overlay.txt"
  cmp "$E/allowed-overlay.txt" "$E/actual-overlay.txt"
  printf "%s\n" "1921b7cd28af55e1e2dd0dfdb4a92844b5d467a4c3d7f02155ebe2d77b727c46  .rc/request.txt" "668aeb520674d130f1af2e88494775afff6b8055d9911c715a8b646056b4b62f  .rc/run.sh" "447a4eca8616f708831ec5e6b7bf90ba68afc606054c0e0d0b27b4cb84abec20  .github/workflows/lane-remote-check.yml" > "$E/reviewed-kit.sha256"
  sha256sum -c "$E/reviewed-kit.sha256"
  sha256sum .rc/x/cm-retrain-focus-1160.sh > "$E/dispatched-shell.sha256"
  printf "%s\n" "537fd0590afba1ce802ecb1c65b4e63f1b1596c08e550b5c640b86be9b786b71  src/components/club-manager/TrainingScreen.tsx" > "$E/reviewed-source.sha256"
  sha256sum -c "$E/reviewed-source.sha256"
  printf "%s\n" docs/PROJECT-STATE.md src/components/club-manager/TrainingScreen.tsx | LC_ALL=C sort > "$E/allowed-candidate.txt"
  git diff --name-only --no-renames "$BASE_HEAD" "$CHECKED_HEAD" | LC_ALL=C sort > "$E/actual-candidate.txt"
  cmp "$E/allowed-candidate.txt" "$E/actual-candidate.txt"
  git rev-parse HEAD HEAD^ "HEAD^{tree}" > "$E/identity.txt"
  git ls-tree -r HEAD > "$E/git-runtime-manifest.txt"
  git ls-tree -r "$CHECKED_HEAD" > "$E/git-checked-manifest.txt"
  git ls-tree -r "$BASE_HEAD" > "$E/git-base-manifest.txt"
  git ls-files -z > "$E/runtime-paths.nul"
  git ls-files -z | sort -z | xargs -0 sha256sum > "$E/source-before.sha256"
  git diff "$BASE_HEAD" "$CHECKED_HEAD" -- src/components/club-manager/TrainingScreen.tsx > "$E/component-only.diff"
  command -v xz; xz --version
  selected=(
    src/components/club-manager/TrainingScreen.tsx src/lib/clubManager.ts src/lib/positionFit.ts src/hooks/useRevealScroll.ts src/components/club-manager/SquadScreen.tsx src/lib/utils.ts src/index.css
    package.json package-lock.json vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json tailwind.config.ts postcss.config.js index.html
    scripts/runAllSims.mjs scripts/simAdsense.mjs scripts/simBrand.mjs scripts/simHeadTags.mjs scripts/simHiddenPages.mjs scripts/simHubs.mjs scripts/simIndexNow.mjs scripts/simIndexing.mjs scripts/simInternalLinks.mjs scripts/simNoRivalNames.mjs scripts/simPrerender.mjs scripts/simPrerenderBoot.mjs scripts/simRetiredRoutes.mjs scripts/simSchema.mjs scripts/simSitemap.mjs scripts/simSnapshotAssets.mjs
    scripts/lib/offlineTransport.cjs scripts/lib/atomicWrite.mjs scripts/lib/retiredRoutes.mjs scripts/lib/playwrightLoader.mjs scripts/genHiddenStubs.mjs scripts/genRetiredStubs.mjs scripts/genSeoMetaParts.mjs scripts/logo/gen_logo.py
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
cat > "$E/native-worker.mjs" <<'NATIVE_WORKER'
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2));
const clone = value => JSON.parse(JSON.stringify(value));
const fontSheet = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap';
const fontDir = path.join(process.env.E, 'font-cache');
const fontAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36';
const fontUrls = css => [...new Set([...css.matchAll(/url\(['"]?(https:\/\/fonts\.gstatic\.com\/[^)'"\s]+)['"]?\)/g)].map(match => match[1]))];
export function validateFontCss(css) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, ''), faces = [], groups = new Set();
  for (const match of clean.matchAll(/@font-face\s*\{([^}]+)\}/g)) {
    const body = match[1], family = body.match(/\bfont-family:\s*(['"])([^'"]+)\1\s*;/)?.[2];
    const weight = body.match(/\bfont-weight:\s*([0-9]+)\s*;/)?.[1];
    assert(['Inter', 'Space Grotesk'].includes(family), 'Only declared font families');
    assert(['400', '500', '600', '700'].includes(weight), 'Only requested font weights');
    assert(/\bfont-style:\s*normal\s*;/.test(body), 'Declared font faces have normal style');
    const source = body.match(/\bsrc:\s*url\((['"]?)([^)'"\s]+)\1\)\s*format\((['"])woff2\3\)\s*;/);
    assert(source, 'Every declared face uses a concrete woff2 source');
    const url = source[2];
    assert(url.startsWith('https://fonts.gstatic.com/'), 'Declared font URL stays on exact HTTPS origin');
    assert.equal(new URL(url).origin, 'https://fonts.gstatic.com', 'Declared font URL stays on exact HTTPS origin');
    faces.push({ family, weight: Number(weight), url }); groups.add(family + '/' + weight);
  }
  const requested = ['Inter/400', 'Inter/500', 'Inter/600', 'Inter/700', 'Space Grotesk/400', 'Space Grotesk/500', 'Space Grotesk/600', 'Space Grotesk/700'];
  assert.deepEqual([...groups].sort(), requested, 'Every requested normal family and weight is declared');
  const urls = [...new Set(faces.map(face => face.url))];
  assert(urls.length > 1);
  const allUrls = [...new Set([...clean.matchAll(/url\((['"]?)([^)'"\s]+)\1\)/g)].map(match => match[2]))];
  assert.deepEqual(allUrls, urls, 'Every CSS URL is a validated declared woff2 face');
  return { faces, urls };
}
async function prepareFonts() {
  assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Remote-only font preparation');
  const template = fs.readFileSync('index.html', 'utf8');
  assert.equal([...template.matchAll(/<link\b[^>]*>/g)].filter(tag => /\brel=["']stylesheet["']/.test(tag[0]) && tag[0].includes(fontSheet)).length, 1, 'Exact declared template font stylesheet');
  fs.mkdirSync(fontDir, { recursive: true });
  const entries = [];
  let declared;
  save(path.join(fontDir, 'partial-manifest.json'), { executionComplete: false, fontSheet, fontAgent, entries });
  const fetchAsset = async url => {
    assert(url === fontSheet || declared?.urls.includes(url), 'Only exact actual declared font assets');
    const response = await fetch(url, { headers: { 'User-Agent': fontAgent }, signal: AbortSignal.timeout(20000), redirect: 'error' });
    assert.equal(response.status, 200, 'Actual font asset ' + url);
    const bytes = Buffer.from(await response.arrayBuffer()), file = hash(Buffer.from(url));
    assert(bytes.length > 0); fs.writeFileSync(path.join(fontDir, file), bytes);
    entries.push({ url, file, bytes: bytes.length, sha256: hash(bytes), contentType: response.headers.get('content-type'), status: response.status });
    save(path.join(fontDir, 'partial-manifest.json'), { executionComplete: false, fontSheet, fontAgent, entries });
    return bytes;
  };
  const original = (await fetchAsset(fontSheet)).toString('utf8'); declared = validateFontCss(original);
  const controls = [], mutations = [
    { name: 'origin', from: declared.urls[0], to: declared.urls[0].replace('https://fonts.gstatic.com/', 'https://invalid.example/'), message: 'Declared font URL stays on exact HTTPS origin' },
    { name: 'family', from: "font-family: 'Inter';", to: "font-family: 'Unlisted Font';", message: 'Only declared font families' },
    { name: 'missing-weight', from: 'font-weight: 700;', to: 'font-weight: 600;', message: 'Every requested normal family and weight is declared' },
    { name: 'normal-style', from: 'font-style: normal;', to: 'font-style: italic;', message: 'Declared font faces have normal style' },
    { name: 'woff2-format', from: "format('woff2')", to: "format('truetype')", message: 'Every declared face uses a concrete woff2 source' },
    { name: 'weight-whitelist', from: 'font-weight: 700;', to: 'font-weight: 800;', message: 'Only requested font weights' },
    { name: 'undeclared-url', from: original, to: original + "\n.undeclared-control{background-image:url('https://fonts.gstatic.com/undeclared-control.woff2')}\n", message: 'Every CSS URL is a validated declared woff2 face' },
  ];
  fs.writeFileSync(path.join(fontDir, 'controls-baseline.css'), original);
  for (const mutation of mutations) {
    assert(original.includes(mutation.from)); assert.notEqual(mutation.from, mutation.to); assert(!original.includes(mutation.to) || mutation.name === 'missing-weight');
    const controlled = original.replaceAll(mutation.from, mutation.to); assert.notEqual(controlled, original, 'Copied actual CSS mutation is effective');
    const file = 'control-' + mutation.name + '.css'; fs.writeFileSync(path.join(fontDir, file), controlled);
    let error; try { validateFontCss(controlled); } catch (caught) { error = caught; }
    assert(error instanceof assert.AssertionError); assert(error.message.startsWith(mutation.message));
    controls.push({ ...mutation, file, sha256: hash(Buffer.from(controlled)), bytes: Buffer.byteLength(controlled), intendedFailure: { name: error.name, message: error.message, actual: error.actual, expected: error.expected, operator: error.operator } });
    save(path.join(fontDir, 'controls-partial.json'), { executionComplete: false, baselineSha256: hash(Buffer.from(original)), controls });
  }
  save(path.join(fontDir, 'controls.json'), { baselineFile: 'controls-baseline.css', baselineSha256: hash(Buffer.from(original)), baselineBytes: Buffer.byteLength(original), declared, controls, scope: 'Copied actual CSS validation only, no bad URL is fetched' });
  for (const url of declared.urls) await fetchAsset(url);
  let local = original;
  for (const entry of entries.slice(1)) local = local.replaceAll(entry.url, '/held-fonts/' + entry.file);
  assert.equal(fontUrls(local).length, 0); fs.writeFileSync(path.join(fontDir, 'local.css'), local);
  save(path.join(fontDir, 'manifest.json'), { fontSheet, fontAgent, templateSha256: hash(Buffer.from(template)), entries, declared, originalSha256: hash(Buffer.from(original)), localSha256: hash(Buffer.from(local)), localBytes: Buffer.byteLength(local) });
  console.log('Fonts1160 PASS: actual template CSS and all referenced declared-family woff2 bodies retained and mapped to local serving.');
}

export function assertTransport(row) {
  assert.deepEqual(row.blocked, [], 'No external HTTP attempts');
  assert.deepEqual(row.sockets, [], 'No WebSocket attempts');
}
export function assertPickerFocus(data) {
  assert.equal(data.focus.picker, true, 'Focus returns to the permanent player picker');
}
function isEntry() {
  return process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
}

async function main() {
  assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Remote-only worker');
  const root = process.cwd(), out = path.join(process.env.E, 'native');
  fs.mkdirSync(out, { recursive: true });
  const browserTemp = path.join(process.env.WORK, 't');
  fs.mkdirSync(browserTemp, { recursive: true });
  for (const name of ['TMPDIR', 'TEMP', 'TMP']) process.env[name] = browserTemp;
  const require = createRequire(path.join(root, 'package.json'));
  const { chromium } = require('playwright'), { build } = require('esbuild');
  const epoch = Date.UTC(2026, 0, 1, 12);
  const core = ['src/components/club-manager/TrainingScreen.tsx', 'src/lib/clubManager.ts', 'src/lib/positionFit.ts', 'src/hooks/useRevealScroll.ts', 'src/components/club-manager/SquadScreen.tsx'];
  let inverse = fs.readFileSync(path.join(root, core[0]), 'utf8');
  for (const [from, to] of [
    ["import { useRef, useState } from 'react';", "import { useState } from 'react';"],
    ['  const pickRef = useRef<HTMLSelectElement>(null);\n', ''],
    ['    pickRef.current?.focus({ preventScroll: true });\n', ''],
    ['          ref={pickRef}\n', ''],
  ]) {
    assert.equal(inverse.split(from).length, 2, 'Exactly one reviewed inverse anchor'); inverse = inverse.replace(from, to);
  }
  assert.equal(inverse, fs.readFileSync(path.join(process.env.BASE_ROOT, core[0]), 'utf8'), 'Exact four-anchor inverse binds the untouched parent');
  for (const source of core.slice(1)) assert.equal(hash(fs.readFileSync(path.join(root, source))), hash(fs.readFileSync(path.join(process.env.BASE_ROOT, source))), 'Actual parent helpers held: ' + source);
  const fonts = JSON.parse(fs.readFileSync(path.join(fontDir, 'manifest.json')));
  assert.equal(fonts.fontSheet, fontSheet); assert.equal(fonts.fontAgent, fontAgent);
  assert.equal(fonts.templateSha256, hash(fs.readFileSync(path.join(root, 'index.html'))));
  const originalFontCss = fs.readFileSync(path.join(fontDir, fonts.entries[0].file), 'utf8'), declared = validateFontCss(originalFontCss);
  assert.deepEqual(fonts.declared, declared);
  const fontAssets = new Map();
  for (const entry of fonts.entries) {
    const file = path.join(fontDir, entry.file), bytes = fs.readFileSync(file);
    assert.equal(bytes.length, entry.bytes); assert.equal(hash(bytes), entry.sha256); assert.equal(entry.status, 200);
    assert.equal(entry.file, hash(Buffer.from(entry.url)));
    assert(entry.url === fontSheet || declared.urls.includes(entry.url));
    if (entry.url !== fontSheet) fontAssets.set('/held-fonts/' + entry.file, { file, type: entry.contentType });
  }
  assert.equal(fonts.entries[0].url, fontSheet);
  assert.deepEqual(declared.urls, fonts.entries.slice(1).map(entry => entry.url));
  let localFontCss = originalFontCss;
  for (const entry of fonts.entries.slice(1)) localFontCss = localFontCss.replaceAll(entry.url, '/held-fonts/' + entry.file);
  assert.equal(localFontCss, fs.readFileSync(path.join(fontDir, 'local.css'), 'utf8'));
  assert.equal(hash(Buffer.from(originalFontCss)), fonts.originalSha256);
  assert.equal(hash(Buffer.from(localFontCss)), fonts.localSha256); assert.equal(Buffer.byteLength(localFontCss), fonts.localBytes);
  fontAssets.set('/held-fonts.css', { file: path.join(fontDir, 'local.css'), type: 'text/css' });
  const viteBindings = [], viteSeen = new Set(), viteDir = path.join(out, 'vite-core');
  fs.mkdirSync(viteDir, { recursive: true });
  for (const name of fs.readdirSync(path.join(root, 'dist/assets')).filter(name => name.endsWith('.js.map'))) {
    const file = path.join(root, 'dist/assets', name), bytes = fs.readFileSync(file), map = JSON.parse(bytes), matches = [];
    assert(Array.isArray(map.sources) && map.sources.length === map.sourcesContent.length);
    for (let i = 0; i < map.sources.length; i++) for (const source of core) {
      const normalized = map.sources[i].replaceAll('\\', '/');
      if (normalized !== source && !normalized.endsWith('/' + source)) continue;
      assert.equal(typeof map.sourcesContent[i], 'string');
      const sourceHash = hash(Buffer.from(map.sourcesContent[i])); assert.equal(sourceHash, hash(fs.readFileSync(path.join(root, source))));
      viteSeen.add(source); matches.push({ source, index: i, sha256: sourceHash });
    }
    if (matches.length) {
      const js = file.slice(0, -4), body = fs.readFileSync(js);
      fs.writeFileSync(path.join(viteDir, name), bytes); fs.writeFileSync(path.join(viteDir, path.basename(js)), body);
      viteBindings.push({ map: name, mapSha256: hash(bytes), js: path.basename(js), jsSha256: hash(body), matches });
    }
  }
  assert.deepEqual([...viteSeen].sort(), [...core].sort()); save(path.join(out, 'vite-bindings.json'), viteBindings);
  const servers = [], variants = [], results = [];
  save(path.join(out, 'partial-summary.json'), { executionComplete: false, results });
  const executable = chromium.executablePath();
  assert(executable.startsWith(process.env.PLAYWRIGHT_BROWSERS_PATH + path.sep));
  const runtime = { executablePath: executable, executableSha256: hash(fs.readFileSync(executable)), privateCache: process.env.PLAYWRIGHT_BROWSERS_PATH, temp: { directory: browserTemp, TMPDIR: process.env.TMPDIR, TEMP: process.env.TEMP, TMP: process.env.TMP } };
  save(path.join(out, 'browser-runtime.json'), runtime);
  const browser = await chromium.launch({ headless: true, executablePath: executable });
  save(path.join(out, 'browser-runtime.json'), { ...runtime, version: browser.version() });
  let careerTemplate;
  try {
    for (const [variant, sourceRoot] of [['candidate', root], ['base', process.env.BASE_ROOT]]) {
      const variantOut = path.join(out, variant), browserDir = path.join(variantOut, 'browser');
      fs.mkdirSync(browserDir, { recursive: true });
      const engineEntry = `globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
export const engine=await import(${JSON.stringify(sourceRoot + '/src/lib/clubManager.ts')});
export const positions=await import(${JSON.stringify(sourceRoot + '/src/lib/positionFit.ts')});`;
      const clientEntry = `import React from 'react';
import {createRoot} from 'react-dom/client';
import {TrainingScreen} from ${JSON.stringify(sourceRoot + '/src/components/club-manager/TrainingScreen.tsx')};
import {startRetraining} from ${JSON.stringify(sourceRoot + '/src/lib/clubManager.ts')};
export function mount(fixture){
 let current=JSON.parse(JSON.stringify(fixture)), calls=[], planCalls=[], stopCalls=[];
 const view=createRoot(document.getElementById('fixture-root'));
 function render(){view.render(<TrainingScreen career={current} onSetPlan={plan=>planCalls.push(plan)} onStopRetrain={id=>stopCalls.push(id)} onRetrain={(id,to)=>{
  calls.push({id,to}); const next=startRetraining(current,id,to); if(next){current=next;render();}
 }}/>);}
 window.__retrain1160={snapshot:()=>({career:JSON.parse(JSON.stringify(current)),calls:JSON.parse(JSON.stringify(calls)),planCalls:JSON.parse(JSON.stringify(planCalls)),stopCalls:[...stopCalls]})};
 render();
}`;
      const bindBuild = (result, outfile, virtualName, virtualBytes, requiredCore) => {
        const metadata = result.metafile, mapPath = outfile + '.map';
        save(outfile + '.metafile.json', metadata);
        const nodeRoot = fs.realpathSync(path.join(root, 'node_modules')) + path.sep;
        const inputRows = Object.entries(metadata.inputs).map(([input, info]) => {
          const resolved = path.resolve(sourceRoot, input);
          const virtual = !fs.existsSync(resolved) && resolved === path.resolve(sourceRoot, virtualName);
          assert(virtual || fs.statSync(resolved).isFile(), 'Actual regular bundle input: ' + input);
          const file = virtual ? resolved : fs.realpathSync(resolved);
          const bytes = virtual ? Buffer.from(virtualBytes) : fs.readFileSync(file);
          assert.equal(info.bytes, bytes.length, 'Actual input bytes: ' + input);
          return { input, file, virtual, bytes: bytes.length, sha256: hash(bytes) };
        });
        assert.equal(inputRows.filter(row => row.virtual).length, 1, 'Only the exact retained stdin entry is virtual');
        save(outfile + '.inputs.json', inputRows);
        const consumed = new Map(inputRows.map(row => [row.file, row]));
        const packageSources = new Map(), mapProviders = [];
        const retainedDir = path.join(variantOut, 'dependency-maps');
        fs.mkdirSync(retainedDir, { recursive: true });
        for (const input of inputRows) {
          if (input.virtual || !input.file.startsWith(nodeRoot)) continue;
          const bytes = fs.readFileSync(input.file);
          assert.equal(hash(bytes), input.sha256);
          const refs = [...bytes.toString('utf8').matchAll(/^[\t ]*\/\/[#@]\s*sourceMappingURL=(\S+)[\t ]*\r?$/gm)];
          const references = [...new Set(refs.map(row => row[1]))];
          assert(references.length <= 1, 'At most one unique actual consumed package map reference');
          if (!references.length) continue;
          const reference = references[0];
          assert(!/^(?:\w+:|\/)/.test(reference), 'Actual relative installed package map reference');
          const mapFile = fs.realpathSync(path.resolve(path.dirname(input.file), reference));
          assert(mapFile.startsWith(nodeRoot) && fs.statSync(mapFile).isFile(), 'Provider map stays inside held installed packages');
          const raw = fs.readFileSync(mapFile), published = JSON.parse(raw);
          assert(Array.isArray(published.sources));
          assert(published.sourcesContent === undefined || Array.isArray(published.sourcesContent));
          if (published.sourcesContent !== undefined) assert.equal(published.sources.length, published.sourcesContent.length);
          assert(published.sourceRoot === undefined || typeof published.sourceRoot === 'string');
          const mapSha256 = hash(raw), retained = path.join(retainedDir, mapSha256 + '.map');
          const inputRetained = path.join(retainedDir, input.sha256 + '.input');
          fs.writeFileSync(retained, raw); fs.writeFileSync(inputRetained, bytes);
          const proof = { input: input.file, inputSha256: input.sha256, sourceMappingURL: reference, mapFile, mapSha256, retained, inputRetained };
          mapProviders.push(proof);
          for (let index = 0; index < published.sources.length; index++) {
            assert.equal(typeof published.sources[index], 'string');
            const name = path.resolve(path.dirname(mapFile), published.sourceRoot ?? '', published.sources[index]);
            let content, contentProof;
            if (typeof published.sourcesContent?.[index] === 'string') {
              content = Buffer.from(published.sourcesContent[index]);
              contentProof = { contentKind: 'published sourcesContent' };
            } else {
              if (!name.startsWith(nodeRoot) || !fs.existsSync(name)) continue;
              const sourceFile = fs.realpathSync(name);
              assert(sourceFile === name && sourceFile.startsWith(nodeRoot) && fs.statSync(sourceFile).isFile(), 'Map-named installed original source remains inside held packages');
              content = fs.readFileSync(sourceFile);
              const sourceRetained = path.join(retainedDir, hash(content) + '.source');
              fs.writeFileSync(sourceRetained, content);
              contentProof = { contentKind: 'published map named installed source', sourceFile, sourceRetained, sourceSha256: hash(content) };
            }
            const contentHash = hash(content);
            packageSources.set(name + '\0' + contentHash, { ...proof, index, ...contentProof });
          }
        }
        save(outfile + '.providers.json', mapProviders);
        const map = JSON.parse(fs.readFileSync(mapPath)), bindings = [], seen = new Set();
        assert.equal(map.sources.length, map.sourcesContent.length);
        for (let i = 0; i < map.sources.length; i++) {
          assert.equal(typeof map.sourcesContent[i], 'string');
          const file = path.resolve(path.dirname(mapPath), map.sources[i]);
          const actualHash = hash(Buffer.from(map.sourcesContent[i]));
          const input = consumed.get(file);
          if (!input) {
            assert(file.startsWith(nodeRoot), 'Missing app/core/entry mapped sources fail closed: ' + file);
            const provider = packageSources.get(file + '\0' + actualHash);
            assert(provider, 'Dependency original must match a consumed actual package map: ' + file);
            bindings.push({ source: map.sources[i], file, sha256: actualHash, virtual: false, kind: 'consumed package map original', provider });
            continue;
          }
          assert.equal(actualHash, input.sha256, 'Actual consumed emitted source content: ' + file);
          for (const source of requiredCore) if (file === path.join(sourceRoot, source)) seen.add(source);
          bindings.push({ source: map.sources[i], file, sha256: actualHash, virtual: input.virtual, kind: input.virtual ? 'retained stdin entry' : 'actual consumed input' });
        }
        assert.deepEqual([...seen].sort(), [...requiredCore].sort(), 'All actual core bodies bound');
        const js = fs.readFileSync(outfile);
        assert(js.toString().includes('//# sourceMappingURL=' + path.basename(mapPath)));
        const record = { js: outfile, jsSha256: hash(js), map: mapPath, mapSha256: hash(fs.readFileSync(mapPath)), inputRows, bindings, requiredCore, mapProviders };
        save(outfile + '.bindings.json', record); return record;
      };
      fs.writeFileSync(path.join(variantOut, 'engine-entry.mjs'), engineEntry);
      const engineFile = path.join(variantOut, 'actual-engine.mjs');
      const engineBuild = await build({ absWorkingDir: sourceRoot, stdin: { contents: engineEntry, sourcefile: '1160-engine-entry.mjs', resolveDir: sourceRoot, loader: 'js' }, outfile: engineFile, bundle: true, platform: 'node', format: 'esm', sourcemap: true, metafile: true, alias: { '@': path.join(sourceRoot, 'src') }, tsconfig: path.join(sourceRoot, 'tsconfig.app.json') });
      const engineBinding = bindBuild(engineBuild, engineFile, '1160-engine-entry.mjs', engineEntry, core.slice(1, 3));
      const { engine, positions } = await import(pathToFileURL(engineFile).href);
      assert(Array.isArray(positions.ALL_POSITIONS) && positions.ALL_POSITIONS.length > 2);
      if (!careerTemplate) {
        const RealDate = globalThis.Date, originalRandom = Math.random; let seed = 1160;
        try {
          globalThis.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [epoch])); } static now() { return epoch; } };
          Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
          careerTemplate = clone(engine.startCareer('Sunderland'));
        } finally { globalThis.Date = RealDate; Math.random = originalRandom; }
        assert(careerTemplate && typeof careerTemplate === 'object');
        assert(careerTemplate.squad.every(p => !p.retraining));
        save(path.join(out, 'actual-start-career-template.json'), careerTemplate);
      }
      fs.writeFileSync(path.join(variantOut, 'client-entry.jsx'), clientEntry);
      const clientFile = path.join(browserDir, 'fixture.js');
      const clientBuild = await build({ absWorkingDir: sourceRoot, stdin: { contents: clientEntry, sourcefile: '1160-client-entry.jsx', resolveDir: sourceRoot, loader: 'jsx' }, outfile: clientFile, bundle: true, platform: 'browser', format: 'esm', sourcemap: true, metafile: true, alias: { '@': path.join(sourceRoot, 'src') }, tsconfig: path.join(sourceRoot, 'tsconfig.app.json') });
      const clientBinding = bindBuild(clientBuild, clientFile, '1160-client-entry.jsx', clientEntry, core);
      const dist = path.join(root, 'dist'), css = [];
      const builtIndexFile = path.join(variantOut, 'built-index.html');
      const builtIndex = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
      fs.writeFileSync(builtIndexFile, builtIndex);
      const knownExternalFontHref = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap';
      const classifyStylesheet = href => href === knownExternalFontHref ? 'held external font declaration' : href && href.startsWith('/assets/') && href.endsWith('.css') ? 'local application CSS' : 'unsupported stylesheet';
      const stylesheetRefs = text => [...text.matchAll(/<link\b[^>]*>/g)].filter(tag => /\brel=["']stylesheet["']/.test(tag[0])).map(tag => {
        const href = tag[0].match(/\bhref=["']([^"']+)["']/)?.[1] ?? null;
        return { tag: tag[0], href, classification: classifyStylesheet(href) };
      });
      const references = stylesheetRefs(builtIndex);
      save(path.join(variantOut, 'stylesheet-refs.json'), references);
      const sourceIndex = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
      assert.equal(stylesheetRefs(sourceIndex).filter(row => row.href === knownExternalFontHref).length, 1, 'One exact held font declaration exists in the original source');
      const selectApplicationCss = refs => {
        assert(refs.every(row => classifyStylesheet(row.href) !== 'unsupported stylesheet'), 'Every stylesheet is the exact held font declaration or local application CSS');
        const selected = refs.filter(row => classifyStylesheet(row.href) === 'local application CSS');
        assert(selected.length > 0, 'Actual built application CSS is required');
        return selected;
      };
      const selected = selectApplicationCss(references);
      assert.equal(references.filter(row => row.href === knownExternalFontHref).length, 1, 'One exact held font declaration exists in the actual built index');
      const controlReferences = references.map(row => row.href === knownExternalFontHref ? { ...row, href: 'https://invalid.example/unknown.css', classification: classifyStylesheet('https://invalid.example/unknown.css') } : { ...row });
      assert.equal(controlReferences.filter(row => row.classification === 'unsupported stylesheet').length, 1, 'The copied unknown stylesheet control changes one actual declaration');
      let controlFailure;
      try { selectApplicationCss(controlReferences); } catch (error) { controlFailure = error; }
      assert(controlFailure instanceof assert.AssertionError);
      assert.equal(controlFailure.message, 'Every stylesheet is the exact held font declaration or local application CSS');
      assert.deepEqual(controlReferences.filter(row => row.classification === 'local application CSS'), selected, 'The copied control keeps the real local CSS baseline');
      const cssSelection = { builtIndex: builtIndexFile, builtIndexSha256: hash(Buffer.from(builtIndex)), sourceIndexSha256: hash(Buffer.from(sourceIndex)), knownExternalFontHref, references, selected, controlReferences, intendedFailure: { name: controlFailure.name, message: controlFailure.message, actual: controlFailure.actual, expected: controlFailure.expected } };
      save(path.join(variantOut, 'stylesheet-selection.json'), cssSelection);
      const assertCssBytes = bytes => assert(bytes.length > 0, 'Selected application CSS has positive bytes');
      for (const row of selected) {
        const href = row.href;
        const bytes = fs.readFileSync(path.join(dist, href.slice(1)));
        assertCssBytes(bytes);
        css.push({ url: href, sha256: hash(bytes), bytes: bytes.length });
      }
      assert(css.length > 0, 'Actual built application CSS used by the component fixture');
      const emptyCss = Buffer.alloc(0), emptyCssFile = path.join(variantOut, 'empty-css-control.css');
      fs.writeFileSync(emptyCssFile, emptyCss);
      assert.notEqual(hash(emptyCss), css[0].sha256, 'The copied empty CSS control changes the actual selected payload');
      let emptyCssFailure;
      try { assertCssBytes(emptyCss); } catch (error) { emptyCssFailure = error; }
      assert(emptyCssFailure instanceof assert.AssertionError);
      assert.equal(emptyCssFailure.message, 'Selected application CSS has positive bytes');
      const cssByteControl = { baseline: css[0], controlledFile: emptyCssFile, controlledBytes: emptyCss.length, controlledSha256: hash(emptyCss), intendedFailure: { name: emptyCssFailure.name, message: emptyCssFailure.message, actual: emptyCssFailure.actual, expected: emptyCssFailure.expected } };
      save(path.join(variantOut, 'css-byte-control.json'), cssByteControl);
      const html = `<!doctype html><html class="dark"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/held-fonts.css">${css.map(c => `<link rel="stylesheet" href="${c.url}">`).join('')}</head><body class="bg-background text-foreground"><main id="fixture-root" class="mx-auto max-w-2xl p-4"></main><div data-test-scroll-runway="1" aria-hidden="true" style="height:900px"></div><script type="module">import{mount}from'/fixture.js';mount(window.__retrainFixture);</script></body></html>`;
      fs.writeFileSync(path.join(browserDir, 'index.html'), html);
      save(path.join(variantOut, 'fixture-build.json'), { scope: 'Actual TrainingScreen direct component with held retraining helper, not ClubManager route or saves', engine: engineBinding, client: clientBinding, css, cssSelection, cssByteControl, fonts, htmlSha256: hash(Buffer.from(html)) });
      const records = [], payloadDir = path.join(variantOut, 'served-payloads'); fs.mkdirSync(payloadDir);
      const server = http.createServer((req, res) => {
        try {
          assert.equal(req.method, 'GET');
          const requestPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
          const font = fontAssets.get(requestPath);
          const source = font ? 'held-template-font' : requestPath === '/' ? 'component-fixture' : ['/fixture.js', '/fixture.js.map'].includes(requestPath) ? 'component-bundle' : 'candidate-dist';
          const file = font ? font.file : source === 'component-fixture' ? path.join(browserDir, 'index.html') : source === 'component-bundle' ? path.join(browserDir, requestPath.slice(1)) : path.resolve(dist, requestPath.slice(1));
          assert(source !== 'candidate-dist' || file.startsWith(dist + path.sep));
          const bytes = fs.readFileSync(file), sha256 = hash(bytes);
          fs.writeFileSync(path.join(payloadDir, sha256), bytes);
          records.push({ method: req.method, url: requestPath, file, source, sha256, bytes: bytes.length });
          save(path.join(variantOut, 'served.json'), records);
          const ext = path.extname(file);
          res.writeHead(200, { 'Content-Type': font ? font.type : ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json' })[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(bytes);
        } catch (error) { records.push({ method: req.method, url: req.url, error: String(error) }); save(path.join(variantOut, 'served.json'), records); res.writeHead(404); res.end('Unavailable'); }
      });
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); servers.push(server);
      const origin = 'http://127.0.0.1:' + server.address().port;
      const poolOf = state => [...state.squad].filter(p => p.position !== 'GK' && !p.retraining).sort((a, b) => b.rating - a.rating);
      const targetsOf = player => positions.ALL_POSITIONS.filter(pos => pos !== 'GK' && !engine.heldPositions(player).includes(pos));
      const cases = variant === 'candidate' ? [[390, 'normal'], [1280, 'normal'], [390, 'empty-pool'], [1280, 'empty-pool']] : [[390, 'focus-control'], [1280, 'focus-control']];
      for (const [width, action] of cases) {
        const name = variant + '-' + width + '-' + action, dir = path.join(out, name); fs.mkdirSync(dir);
        let fixture = clone(careerTemplate);
        const initialPool = poolOf(fixture); assert(initialPool.length >= 2);
        if (action === 'empty-pool') for (const player of initialPool.slice(1)) {
          const to = targetsOf(player)[0]; assert(to); assert.equal(engine.retrainRefusal(player, to), null);
          const next = engine.startRetraining(fixture, player.id, to); assert(next); fixture = next;
        }
        const pool = poolOf(fixture), picked = pool[0], targets = targetsOf(picked), to = targets[0];
        assert(picked && to); assert.equal(engine.retrainRefusal(picked, to), null);
        if (action === 'empty-pool') assert.equal(pool.length, 1); else assert(pool.length >= 2);
        const expected = engine.startRetraining(clone(fixture), picked.id, to); assert(expected);
        assert.equal(poolOf(expected).length, pool.length - 1);
        save(path.join(dir, 'actual-engine-fixture.json'), fixture);
        save(path.join(dir, 'expected-held-helper-state.json'), expected);
        const row = { name, variant, width, action, pickedId: picked.id, target: to, targets, initialPool: pool.map(p => p.id), fixtureSha256: hash(fs.readFileSync(path.join(dir, 'actual-engine-fixture.json'))), expectedStateSha256: hash(fs.readFileSync(path.join(dir, 'expected-held-helper-state.json'))), status: 'failed', pageErrors: [], localFailures: [], localRequests: [], blocked: [], sockets: [], checks: {} };
        let context, page;
        const snapshot = async stage => {
          const board = page.locator('#fixture-root');
          const data = await board.evaluate(el => {
            const pick = el.querySelector('[data-cm-retrain-pick]'), active = document.activeElement, r = el.getBoundingClientRect();
            return { html: el.outerHTML, text: el.innerText,
              picker: { value: pick.value, disabled: pick.disabled, label: pick.getAttribute('aria-label'), options: [...pick.options].map(o => ({ value: o.value, text: o.textContent })) },
              targets: [...el.querySelectorAll('[data-cm-retrain-to]')].map(b => ({ to: b.dataset.cmRetrainTo, text: b.innerText, type: b.type })),
              learning: [...el.querySelectorAll('[data-cm-retraining]')].map(n => ({ id: n.dataset.cmRetraining, to: n.dataset.cmRetrainingTo, weeks: Number(n.querySelector('[data-cm-retrain-left]').dataset.cmRetrainLeft), text: n.innerText, progress: Number(n.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')) })),
              refusals: [...el.querySelectorAll('[data-cm-retrain-refusal]')].map(n => n.innerText),
              focus: { picker: active === pick, tag: active?.tagName ?? null, target: active?.getAttribute('data-cm-retrain-to') ?? null },
              geometry: { x: r.x, width: r.width, documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth, scrollY, runwayHeight: document.querySelector('[data-test-scroll-runway]').getBoundingClientRect().height } };
          });
          data.aria = await board.ariaSnapshot(); data.state = await page.evaluate(() => window.__retrain1160.snapshot());
          save(path.join(dir, stage + '.json'), data); await page.screenshot({ path: path.join(dir, stage + '.png') }); return data;
        };
        const assertState = (data, state) => {
          assert.deepEqual(data.state.career, state); assert.deepEqual(data.state.planCalls, []); assert.deepEqual(data.state.stopCalls, []);
          assert.equal(data.picker.label, 'Player to retrain'); assert.equal(data.picker.disabled, false);
          assert.deepEqual(data.picker.options, [{ value: '', text: 'Pick a man' }, ...poolOf(state).map(p => ({ value: p.id, text: `${p.position} ${p.name} (${p.rating})` }))]);
          assert.deepEqual(data.learning.map(p => ({ id: p.id, to: p.to, weeks: p.weeks, progress: p.progress })), state.squad.filter(p => p.retraining).map(p => ({ id: p.id, to: p.retraining.to, weeks: p.retraining.weeksLeft, progress: Math.round(100 * (p.retraining.weeksTotal - p.retraining.weeksLeft) / Math.max(1, p.retraining.weeksTotal)) })));
          assert.deepEqual(data.refusals, []); assert.equal(data.geometry.viewportWidth, width); assert(data.geometry.documentWidth <= width); assert.equal(data.geometry.runwayHeight, 900);
        };
        try {
          context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
          await context.routeWebSocket('**/*', socket => { row.sockets.push(socket.url()); socket.close(); });
          await context.route('**/*', async route => {
            const request = route.request(), url = request.url();
            if (!url.startsWith(origin + '/')) { row.blocked.push({ url, method: request.method() }); await route.abort(); return; }
            row.localRequests.push({ url: new URL(url).pathname, method: request.method() });
            if (request.method() !== 'GET') { row.localFailures.push({ url, error: 'Unexpected local write' }); await route.abort(); return; }
            await route.continue();
          });
          await context.addInitScript(fixture => { window.__retrainFixture = fixture; }, fixture);
          page = await context.newPage();
          page.on('pageerror', error => row.pageErrors.push({ name: error.name, message: error.message, stack: error.stack }));
          page.on('requestfailed', request => { if (request.url().startsWith(origin + '/')) row.localFailures.push({ url: request.url(), error: request.failure() }); });
          page.on('response', response => { if (response.url().startsWith(origin + '/') && response.status() >= 400) row.localFailures.push({ url: response.url(), status: response.status() }); });
          await page.goto(origin, { waitUntil: 'networkidle' }); await page.locator('[data-cm-retrain-card]').waitFor();
          row.fonts = await page.evaluate(async () => {
            await document.fonts.ready; const faces = [];
            for (const family of ['Inter', 'Space Grotesk']) for (const weight of [400, 500, 600, 700]) {
              const loaded = await document.fonts.load(`${weight} 16px "${family}"`, 'Retraining');
              faces.push({ family, weight, loaded: loaded.map(face => ({ family: face.family, weight: face.weight, status: face.status })) });
            }
            return faces;
          });
          assert.equal(row.fonts.length, 8); assert(row.fonts.every(row => row.loaded.length && row.loaded.every(face => face.status === 'loaded' && face.family.replaceAll('"', '') === row.family && face.weight === String(row.weight))), 'All eight actual declared font faces loaded');
          row.before = await snapshot('before'); assertState(row.before, fixture);
          assert.deepEqual(row.before.state.calls, []); assert.equal(row.before.picker.value, ''); assert.deepEqual(row.before.targets, []);
          const picker = page.getByRole('combobox', { name: 'Player to retrain', exact: true }); assert.equal(await picker.count(), 1);
          await picker.focus(); await picker.press('Home'); await picker.press('ArrowDown');
          await page.locator('[data-cm-retrain-targets="' + picked.id + '"]').waitFor();
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
          row.picked = await snapshot('picked'); assertState(row.picked, fixture);
          assert.equal(row.picked.picker.value, picked.id); assertPickerFocus(row.picked);
          assert.deepEqual(row.picked.targets, targets.map(to => ({ to, type: 'button', text: `${to}\nabout ${engine.retrainWeeks(fixture, picked, to)} weeks` })));
          assert.deepEqual(row.picked.state.calls, []);
          await page.keyboard.press('Tab');
          row.tabbed = await snapshot('tabbed'); assert.equal(row.tabbed.focus.tag, 'BUTTON'); assert.equal(row.tabbed.focus.target, to); assert.equal(row.tabbed.focus.picker, false);
          assert.deepEqual(row.tabbed.state, row.picked.state); assert.equal(row.tabbed.picker.value, picked.id);
          await page.keyboard.press('Enter');
          await page.locator('[data-cm-retrain-targets]').waitFor({ state: 'detached' });
          await page.locator('[data-cm-retraining="' + picked.id + '"]').waitFor();
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          row.after = await snapshot('after'); assertState(row.after, expected);
          assert.deepEqual(row.after.state.calls, [{ id: picked.id, to }]); assert.deepEqual(row.after.targets, []); assert.equal(row.after.picker.value, '');
          const beforeOther = fixture.squad.filter(p => p.id !== picked.id), afterOther = row.after.state.career.squad.filter(p => p.id !== picked.id);
          assert.deepEqual(afterOther, beforeOther, 'All other players stay unchanged');
          assert.equal(row.after.geometry.scrollY, row.tabbed.geometry.scrollY, 'Starting retraining does not change window scroll');
          if (variant === 'base') {
            assert.equal(row.after.focus.tag, 'BODY'); assert.equal(row.after.focus.target, null); assert.equal(row.after.focus.picker, false);
            let error; try { assertPickerFocus(row.after); } catch (caught) { error = caught; }
            assert(error instanceof assert.AssertionError); assert.equal(error.actual, false); assert.equal(error.expected, true); assert.equal(error.operator, 'strictEqual');
            assert(error.message.startsWith('Focus returns to the permanent player picker'));
            row.intendedFocusFailure = { name: error.name, message: error.message, actual: error.actual, expected: error.expected, operator: error.operator };
          } else assertPickerFocus(row.after);
          const requested = new Set(row.localRequests.filter(r => r.method === 'GET').map(r => r.url));
          assert(requested.has('/fixture.js') && requested.has('/held-fonts.css')); assert([...requested].some(url => url.startsWith('/held-fonts/'))); for (const style of css) assert(requested.has(style.url));
          row.checks = { actualKeyboardSelect: true, actualTab: true, actualEnter: true, callbackOnce: true, fullHeldHelperState: true, targetsUnmounted: true, pickerCleared: true, stableScroll: true, remainingPool: poolOf(expected).length, candidateFocus: variant === 'candidate', intendedParentFocusLoss: variant === 'base' };
          assertTransport(row); row.status = 'passed';
        } catch (error) { row.error = { name: error.name, message: error.message, stack: error.stack }; }
        finally {
          if (context) try { await context.close(); } catch (error) { row.closeError = String(error); row.status = 'failed'; }
          if (row.pageErrors.length || row.localFailures.length) row.status = 'failed';
          try { assertTransport(row); } catch (error) { row.transportError = { name: error.name, message: error.message, actual: error.actual, expected: error.expected }; row.status = 'failed'; }
          save(path.join(dir, 'result.json'), row); results.push(row); save(path.join(out, 'partial-summary.json'), { executionComplete: false, results });
        }
      }
      assert(records.every(r => !r.error)); for (const row of results.filter(r => r.variant === variant)) for (const request of row.localRequests) assert(records.some(r => r.url === request.url && r.method === request.method && !r.error));
      variants.push({ variant, engineBinding, clientBinding, servedRecords: records.length });
    }
    for (const width of [390, 1280]) {
      const candidate = results.find(r => r.name === `candidate-${width}-normal`), base = results.find(r => r.name === `base-${width}-focus-control`);
      assert(candidate && base && candidate.before && base.before && candidate.after && base.after);
      assert.deepEqual(candidate.before, base.before); assert.deepEqual(candidate.picked, base.picked); assert.deepEqual(candidate.tabbed, base.tabbed);
      assert.deepEqual(candidate.after.state, base.after.state); assert.deepEqual(candidate.after.picker, base.after.picker); assert.deepEqual(candidate.after.learning, base.after.learning); assert.deepEqual(candidate.after.geometry, base.after.geometry);
    }
    assert.equal(results.filter(r => r.variant === 'candidate').length, 4); assert.equal(results.filter(r => r.variant === 'base').length, 2); assert(results.every(r => r.status === 'passed'));
    const baselineName = 'candidate-390-normal', baselineFile = path.join(out, baselineName, 'result.json');
    const baseline = JSON.parse(fs.readFileSync(baselineFile)); assert.equal(baseline.status, 'passed'); assertTransport(baseline);
    const controls = [];
    for (const key of ['blocked', 'sockets']) {
      const controlled = clone(baseline); controlled[key] = key === 'blocked' ? [{ url: 'https://invalid.example/blocked-control', method: 'GET' }] : ['wss://invalid.example/socket-control'];
      assert.notDeepEqual(controlled, baseline); assert.deepEqual({ ...controlled, [key]: baseline[key] }, baseline);
      let error; try { assertTransport(controlled); } catch (caught) { error = caught; }
      assert(error instanceof assert.AssertionError); assert.deepEqual(error.actual, controlled[key]); assert.deepEqual(error.expected, []); assert.equal(error.operator, 'deepStrictEqual');
      assert(error.message.startsWith(key === 'blocked' ? 'No external HTTP attempts' : 'No WebSocket attempts'));
      controls.push({ key, controlled, intendedFailure: { name: error.name, message: error.message, actual: error.actual, expected: error.expected, operator: error.operator } });
    }
    save(path.join(out, 'transport-controls.json'), { baselineName, baselineSha256: hash(fs.readFileSync(baselineFile)), baseline, controls, scope: 'Effective copied-record validator checks, not actual external requests' });
  } finally {
    await browser.close(); for (const server of servers) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
  save(path.join(out, 'summary.json'), { executionComplete: true, healthy: 4, effectiveBaseControls: 2, variants, results, scope: 'Direct actual TrainingScreen with helper-derived state and keyboard focus; identical test-owned trailing 900px scroll runway, no whole route/save/backend or event.isTrusted claim' });
  console.log('Native1160 PASS: four candidate retraining focus journeys and two untouched-parent actual focus-loss controls.');
}
if (isEntry()) (process.argv.includes('--prefetch-fonts-only') ? prepareFonts() : main()).catch(error => { console.error(error); process.exitCode = 1; });
NATIVE_WORKER
run syntax 30 bash -euo pipefail -c 'bash -n .rc/x/cm-retrain-focus-1160.sh; node --check "$E/native-worker.mjs"; printf "%s\n" "6153c50b1853c7d2b8f62645dfba2cbc836f06e3d74bf5f5ea0486b38de2b502  $E/native-worker.mjs" | sha256sum -c -'
if test "${gates[syntax]}" = 0; then
  run fonts 120 node "$E/native-worker.mjs" --prefetch-fonts-only
else skip fonts; fi
if test "${gates[fonts]}" = 0; then
  run font-hold 30 bash -euo pipefail -c '
    find "$E/font-cache" -type f -print0 | sort -z | xargs -0 sha256sum > "$E/font-cache-before.sha256"
    find "$E/font-cache" -type l -printf "%p\t%l\n" | sort > "$E/font-cache-before-links.tsv"
  '
else skip font-hold; fi
run base-prepare 60 bash -euo pipefail -c '
  mkdir -p "$BASE_ROOT"
  git archive "$BASE_HEAD" | tar -xf - -C "$BASE_ROOT"
  ln -s "$PWD/node_modules" "$BASE_ROOT/node_modules"
  git ls-tree -r --name-only "$BASE_HEAD" > "$E/base-paths.txt"
  (cd "$BASE_ROOT"; while IFS= read -r file; do sha256sum "$file"; done < "$E/base-paths.txt") > "$E/base-source-before.sha256"
  find "$BASE_ROOT/src" "$BASE_ROOT/scripts" "$BASE_ROOT/.github" "$BASE_ROOT/public" -type f | sort > "$E/base-authored-paths-before.txt"
  git archive "$BASE_HEAD" -- src/components/club-manager/TrainingScreen.tsx src/lib/clubManager.ts src/lib/positionFit.ts src/hooks/useRevealScroll.ts src/components/club-manager/SquadScreen.tsx src/lib/utils.ts src/index.css > "$E/base-core-source.tar"
'
run types 120 node_modules/.bin/tsc --noEmit -p tsconfig.app.json
run base-types 120 bash -euo pipefail -c 'cd "$BASE_ROOT"; node_modules/.bin/tsc --noEmit -p tsconfig.app.json'
run build 180 env NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" npm run build -- --sourcemap
# The untouched parent is bundled directly inside native; no parent Vite build or route claim.
if test "${gates[build]}" = 0; then
  run build-hold 30 bash -euo pipefail -c '
    sha256sum --quiet -c "$E/source-before.sha256"; git diff --exit-code HEAD
    (cd "$BASE_ROOT"; sha256sum --quiet -c "$E/base-source-before.sha256")
    find dist -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dist-before.sha256"
    find dist -type l -printf "%p\t%l\n" | sort > "$E/dist-before-links.tsv"


  '
else skip build-hold; fi
if test "${gates[syntax]}" = 0 && test "${gates[types]}" = 0 && test "${gates[base-types]}" = 0 && test "${gates[build-hold]}" = 0 && test "${gates[runtime]}" = 0 && test "${gates[font-hold]}" = 0; then
  run native 240 env NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" node "$E/native-worker.mjs"
else skip native; fi
run native-hold 30 bash -euo pipefail -c '
  test -d "$E/native"
  find "$E/native" -type f -print0 | sort -z | xargs -0 sha256sum > "$E/native-before.sha256"
  find "$E/native" -type l -printf "%p\t%l\n" | sort > "$E/native-before-links.tsv"
'
if test "${gates[native]}" = 0; then
  run native-receipts 60 node --input-type=module - <<'NODE'
import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import {createHash} from 'node:crypto'; import {pathToFileURL} from 'node:url';
const {assertTransport,assertPickerFocus,validateFontCss}=await import(pathToFileURL(process.env.E+'/native-worker.mjs').href);
const digest=b=>createHash('sha256').update(b).digest('hex'), read=f=>JSON.parse(fs.readFileSync(f)), out=process.env.E+'/native';
const summary=read(out+'/summary.json');
const expected=['candidate-390-normal','candidate-1280-normal','candidate-390-empty-pool','candidate-1280-empty-pool','base-390-focus-control','base-1280-focus-control'];
assert.equal(summary.executionComplete,true); assert.equal(summary.healthy,4); assert.equal(summary.effectiveBaseControls,2);
assert.deepEqual(summary.results.map(r=>r.name),expected);
for(const variant of ['candidate','base']) {
  const dir=out+'/'+variant, proof=read(dir+'/fixture-build.json'), served=read(dir+'/served.json');
  for(const [kind,binding] of [['engine',proof.engine],['client',proof.client]]) {
    assert.equal(digest(fs.readFileSync(binding.js)),binding.jsSha256); assert.equal(digest(fs.readFileSync(binding.map)),binding.mapSha256);
    const map=read(binding.map), meta=read(binding.js+'.metafile.json');
    assert.equal(Object.keys(meta.inputs).length,binding.inputRows.length); assert.equal(map.sources.length,map.sourcesContent.length);
    for(const input of binding.inputRows) {
      const bytes=fs.readFileSync(input.virtual ? dir+'/'+(kind==='engine'?'engine-entry.mjs':'client-entry.jsx') : input.file);
      assert.equal(bytes.length,input.bytes); assert.equal(digest(bytes),input.sha256); assert.equal(meta.inputs[input.input].bytes,input.bytes);
    }
    assert.deepEqual(binding.inputRows,read(binding.js+'.inputs.json'));
    assert.deepEqual(binding.mapProviders,read(binding.js+'.providers.json'));
    const consumed=new Map(binding.inputRows.map(row=>[row.file,row]));
    const nodeRoot=fs.realpathSync('node_modules')+path.sep;
    for(const provider of binding.mapProviders) {
      const input=consumed.get(provider.input);
      assert(input&&!input.virtual); assert.equal(input.sha256,provider.inputSha256);
      assert(provider.input.startsWith(nodeRoot)&&provider.mapFile.startsWith(nodeRoot));
      const compiled=fs.readFileSync(provider.inputRetained), raw=fs.readFileSync(provider.retained);
      assert.equal(digest(compiled),provider.inputSha256); assert.equal(digest(fs.readFileSync(provider.input)),provider.inputSha256);
      assert.equal(digest(raw),provider.mapSha256); assert.equal(digest(fs.readFileSync(provider.mapFile)),provider.mapSha256);
      const refs=[...compiled.toString('utf8').matchAll(/^[\t ]*\/\/[#@]\s*sourceMappingURL=(\S+)[\t ]*\r?$/gm)];
      const references=[...new Set(refs.map(row=>row[1]))];
      assert.equal(references.length,1); assert.equal(references[0],provider.sourceMappingURL);
      assert.equal(fs.realpathSync(path.resolve(path.dirname(provider.input),provider.sourceMappingURL)),provider.mapFile);
    }
    assert.equal(binding.bindings.length,map.sources.length);
    const seen=new Set();
    for(let i=0;i<map.sources.length;i++) {
      const row=binding.bindings[i], body=digest(Buffer.from(map.sourcesContent[i]));
      assert.equal(row.source,map.sources[i]); assert.equal(row.sha256,body);
      assert.equal(row.file,path.resolve(path.dirname(binding.map),row.source));
      const input=consumed.get(row.file);
      if(row.kind==='consumed package map original') {
        assert(!input&&row.file.startsWith(nodeRoot)&&!row.virtual);
        const p=row.provider;
        assert(binding.mapProviders.some(r=>r.input===p.input&&r.inputSha256===p.inputSha256&&r.mapFile===p.mapFile&&r.mapSha256===p.mapSha256&&r.retained===p.retained&&r.inputRetained===p.inputRetained&&r.sourceMappingURL===p.sourceMappingURL));
        const published=read(p.retained); assert(Number.isInteger(p.index)&&p.index>=0&&p.index<published.sources.length);
        assert.equal(row.file,path.resolve(path.dirname(p.mapFile),published.sourceRoot??'',published.sources[p.index]));
        if(p.contentKind==='published sourcesContent') {
          assert.equal(typeof published.sourcesContent?.[p.index],'string');
          assert.equal(digest(Buffer.from(published.sourcesContent[p.index])),body);
        } else {
          assert.equal(p.contentKind,'published map named installed source');
          assert.equal(p.sourceFile,row.file); assert(p.sourceFile.startsWith(nodeRoot));
          assert.equal(fs.realpathSync(p.sourceFile),p.sourceFile);
          assert.equal(p.sourceSha256,body);
          assert.equal(digest(fs.readFileSync(p.sourceRetained)),body);
          assert.equal(digest(fs.readFileSync(p.sourceFile)),body);
        }
      } else {
        assert(input); assert.equal(input.sha256,body); assert.equal(input.virtual,row.virtual);
        assert.equal(row.kind,input.virtual?'retained stdin entry':'actual consumed input');
        for(const source of binding.requiredCore) if(row.file.endsWith('/'+source)) seen.add(source);
      }
    }
    assert.equal(binding.requiredCore.length,kind==='engine'?2:5);
    assert.deepEqual([...seen].sort(),[...binding.requiredCore].sort());
  }
  const cssSelection=read(dir+'/stylesheet-selection.json'), builtIndex=fs.readFileSync(dir+'/built-index.html','utf8');
  assert.deepEqual(proof.cssSelection,cssSelection);
  assert.equal(digest(Buffer.from(builtIndex)),cssSelection.builtIndexSha256);
  assert.equal(digest(fs.readFileSync('dist/index.html')),cssSelection.builtIndexSha256);
  assert.equal(digest(fs.readFileSync('index.html')),cssSelection.sourceIndexSha256);
  assert.deepEqual(cssSelection.references,read(dir+'/stylesheet-refs.json'));
  const known='https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap';
  assert.equal(cssSelection.knownExternalFontHref,known);
  const classify=href=>href===known?'held external font declaration':href&&href.startsWith('/assets/')&&href.endsWith('.css')?'local application CSS':'unsupported stylesheet';
  const actual=[...builtIndex.matchAll(/<link\b[^>]*>/g)].filter(tag=>/\brel=["']stylesheet["']/.test(tag[0])).map(tag=>{const href=tag[0].match(/\bhref=["']([^"']+)["']/)?.[1]??null;return{tag:tag[0],href,classification:classify(href)};});
  assert.deepEqual(actual,cssSelection.references);
  assert.equal(actual.filter(r=>r.href===known).length,1);
  assert(actual.every(r=>r.classification!=='unsupported stylesheet'));
  assert.deepEqual(actual.filter(r=>r.classification==='local application CSS'),cssSelection.selected);
  assert(cssSelection.selected.length>0);
  assert.deepEqual(proof.css.map(r=>r.url),cssSelection.selected.map(r=>r.href));
  const changed=actual.map(r=>r.href===known?{...r,href:'https://invalid.example/unknown.css',classification:classify('https://invalid.example/unknown.css')}:{...r});
  assert.deepEqual(changed,cssSelection.controlReferences);
  assert.equal(changed.filter(r=>r.classification==='unsupported stylesheet').length,1);
  assert.deepEqual(changed.filter(r=>r.classification==='local application CSS'),cssSelection.selected);
  assert.deepEqual(cssSelection.intendedFailure,{name:'AssertionError',message:'Every stylesheet is the exact held font declaration or local application CSS',actual:false,expected:true});
  const byteControl=read(dir+'/css-byte-control.json');
  assert.deepEqual(proof.cssByteControl,byteControl);
  assert.deepEqual(byteControl.baseline,proof.css[0]);
  const emptyCss=fs.readFileSync(dir+'/empty-css-control.css');
  assert.equal(emptyCss.length,0); assert.equal(byteControl.controlledBytes,0);
  assert.equal(digest(emptyCss),byteControl.controlledSha256);
  assert.notEqual(byteControl.controlledSha256,byteControl.baseline.sha256);
  assert.deepEqual(byteControl.intendedFailure,{name:'AssertionError',message:'Selected application CSS has positive bytes',actual:false,expected:true});
  for(const css of proof.css) {
    assert(css.bytes>0);
    const actualCss=fs.readFileSync('dist/'+css.url.slice(1));
    assert.equal(actualCss.length,css.bytes); assert.equal(digest(actualCss),css.sha256);
    const responses=served.filter(r=>r.url===css.url&&r.method==='GET');
    assert(responses.length>0);
    for(const response of responses) {
      const raw=fs.readFileSync(dir+'/served-payloads/'+response.sha256);
      assert.equal(response.bytes,css.bytes); assert.equal(response.sha256,css.sha256);
      assert.equal(raw.length,css.bytes); assert.equal(digest(raw),css.sha256);
    }
  }
  assert.equal(digest(fs.readFileSync(dir+'/browser/index.html')),proof.htmlSha256);
  assert(served.length>0); assert(served.every(r=>!r.error&&r.method==='GET'));
  for(const response of served) {
    const raw=fs.readFileSync(dir+'/served-payloads/'+response.sha256);
    assert.equal(raw.length,response.bytes); assert.equal(digest(raw),response.sha256); assert.equal(digest(fs.readFileSync(response.file)),response.sha256);
  }
  const engine=await import(pathToFileURL(dir+'/actual-engine.mjs').href), pool=s=>[...s.squad].filter(p=>p.position!=='GK'&&!p.retraining).sort((a,b)=>b.rating-a.rating);
  for(const row of summary.results.filter(r=>r.variant===variant)) {
    assert.deepEqual(row,read(out+'/'+row.name+'/result.json')); assert.equal(row.status,'passed'); assert(!row.error&&!row.closeError&&!row.transportError);
    assert.deepEqual(row.pageErrors,[]); assert.deepEqual(row.localFailures,[]); assertTransport(row);
    const caseDir=out+'/'+row.name, fixture=read(caseDir+'/actual-engine-fixture.json'), expected=read(caseDir+'/expected-held-helper-state.json');
    assert.equal(digest(fs.readFileSync(caseDir+'/actual-engine-fixture.json')),row.fixtureSha256);
    assert.equal(digest(fs.readFileSync(caseDir+'/expected-held-helper-state.json')),row.expectedStateSha256);
    const picked=pool(fixture)[0], targets=engine.positions.ALL_POSITIONS.filter(to=>to!=='GK'&&!engine.engine.heldPositions(picked).includes(to));
    assert.equal(row.pickedId,picked.id); assert.deepEqual(row.targets,targets); assert.equal(row.target,targets[0]); assert.equal(engine.engine.retrainRefusal(picked,row.target),null);
    assert.deepEqual(row.initialPool,pool(fixture).map(p=>p.id)); assert.deepEqual(engine.engine.startRetraining(fixture,picked.id,row.target),expected);
    for(const stage of ['before','picked','tabbed','after']) {
      assert.deepEqual(row[stage],read(caseDir+'/'+stage+'.json')); assert(fs.readFileSync(caseDir+'/'+stage+'.png').length>0);
      const state=stage==='after'?expected:fixture, data=row[stage]; assert.deepEqual(data.state.career,state); assert.deepEqual(data.state.planCalls,[]); assert.deepEqual(data.state.stopCalls,[]);
      assert.equal(data.picker.disabled,false); assert.equal(data.picker.label,'Player to retrain');
      assert.deepEqual(data.picker.options,[{value:'',text:'Pick a man'},...pool(state).map(p=>({value:p.id,text:`${p.position} ${p.name} (${p.rating})`}))]);
      assert.deepEqual(data.refusals,[]); assert.equal(data.geometry.documentWidth<=row.width,true); assert.equal(data.geometry.viewportWidth,row.width); assert.equal(data.geometry.runwayHeight,900);
      assert.deepEqual(data.learning.map(p=>({id:p.id,to:p.to,weeks:p.weeks,progress:p.progress})),state.squad.filter(p=>p.retraining).map(p=>({id:p.id,to:p.retraining.to,weeks:p.retraining.weeksLeft,progress:Math.round(100*(p.retraining.weeksTotal-p.retraining.weeksLeft)/Math.max(1,p.retraining.weeksTotal))})));
      assert.deepEqual(data.state.calls,stage==='after'?[{id:picked.id,to:row.target}]:[]);
    }
    assert.equal(row.before.picker.value,''); assert.deepEqual(row.before.targets,[]);
    assert.equal(row.picked.picker.value,picked.id); assertPickerFocus(row.picked);
    assert.deepEqual(row.picked.targets,targets.map(to=>({to,type:'button',text:`${to}\nabout ${engine.engine.retrainWeeks(fixture,picked,to)} weeks`})));
    assert.equal(row.tabbed.focus.tag,'BUTTON'); assert.equal(row.tabbed.focus.target,row.target); assert.equal(row.tabbed.focus.picker,false);
    assert.equal(row.tabbed.picker.value,picked.id); assert.deepEqual(row.tabbed.targets,row.picked.targets);
    assert.equal(row.after.picker.value,''); assert.deepEqual(row.after.targets,[]); assert.equal(row.after.geometry.scrollY,row.tabbed.geometry.scrollY);
    assert.deepEqual(row.after.state.career.squad.filter(p=>p.id!==picked.id),fixture.squad.filter(p=>p.id!==picked.id));
    assert.deepEqual(row.checks,{actualKeyboardSelect:true,actualTab:true,actualEnter:true,callbackOnce:true,fullHeldHelperState:true,targetsUnmounted:true,pickerCleared:true,stableScroll:true,remainingPool:pool(expected).length,candidateFocus:variant==='candidate',intendedParentFocusLoss:variant==='base'});
    if(variant==='candidate'){assertPickerFocus(row.after);assert(!row.intendedFocusFailure);}else{
      assert.equal(row.after.focus.tag,'BODY');assert.equal(row.after.focus.target,null);assert.equal(row.after.focus.picker,false);
      let error;try{assertPickerFocus(row.after);}catch(caught){error=caught;}assert(error instanceof assert.AssertionError);
      assert.deepEqual(row.intendedFocusFailure,{name:error.name,message:error.message,actual:error.actual,expected:error.expected,operator:error.operator});assert.equal(error.actual,false);assert.equal(error.expected,true);
    }
    if(row.action==='empty-pool'){assert.equal(pool(fixture).length,1);assert.equal(pool(expected).length,0);assert.equal(row.after.picker.options.length,1);}else assert(pool(fixture).length>=2);
    assert.equal(row.fonts.length,8);assert(row.fonts.every(r=>r.loaded.length&&r.loaded.every(f=>f.status==='loaded'&&f.family.replaceAll('"','')===r.family&&f.weight===String(r.weight))));
    for(const request of row.localRequests)assert(served.some(r=>r.url===request.url&&r.method===request.method));
    assert(row.localRequests.some(r=>r.url==='/fixture.js'&&r.method==='GET'));assert(served.filter(r=>r.url==='/fixture.js').every(r=>r.sha256===proof.client.jsSha256));
    assert(row.localRequests.some(r=>r.url==='/held-fonts.css'&&r.method==='GET'));assert(row.localRequests.some(r=>r.url.startsWith('/held-fonts/')&&r.method==='GET'));
    for(const css of proof.css)assert(row.localRequests.some(r=>r.url===css.url&&r.method==='GET')&&served.some(r=>r.url===css.url&&r.sha256===css.sha256));
  }
}
for(const width of [390,1280]) {
  const candidate=summary.results.find(r=>r.name===`candidate-${width}-normal`), base=summary.results.find(r=>r.name===`base-${width}-focus-control`);
  assert.deepEqual(candidate.before,base.before);assert.deepEqual(candidate.picked,base.picked);assert.deepEqual(candidate.tabbed,base.tabbed);
  assert.deepEqual(candidate.after.state,base.after.state);assert.deepEqual(candidate.after.picker,base.after.picker);assert.deepEqual(candidate.after.learning,base.after.learning);assert.deepEqual(candidate.after.geometry,base.after.geometry);
}
const transport=read(out+'/transport-controls.json'), baseline=read(out+'/'+transport.baselineName+'/result.json');
assert.equal(transport.baselineName,'candidate-390-normal');assert.equal(transport.baselineSha256,digest(fs.readFileSync(out+'/'+transport.baselineName+'/result.json')));assert.deepEqual(transport.baseline,baseline);assertTransport(baseline);
assert.deepEqual(transport.controls.map(r=>r.key),['blocked','sockets']);
for(const control of transport.controls){const key=control.key,changed=structuredClone(baseline);changed[key]=key==='blocked'?[{url:'https://invalid.example/blocked-control',method:'GET'}]:['wss://invalid.example/socket-control'];assert.deepEqual(control.controlled,changed);assert.notDeepEqual(changed,baseline);assert.deepEqual({...changed,[key]:baseline[key]},baseline);let error;try{assertTransport(changed);}catch(caught){error=caught;}assert(error instanceof assert.AssertionError);assert.deepEqual(control.intendedFailure,{name:error.name,message:error.message,actual:error.actual,expected:error.expected,operator:error.operator});assert.deepEqual(error.actual,changed[key]);assert.deepEqual(error.expected,[]);assert.equal(error.operator,'deepStrictEqual');}
const runtime=read(out+'/browser-runtime.json');assert.equal(runtime.privateCache,process.env.PLAYWRIGHT_BROWSERS_PATH);assert.equal(runtime.executableSha256,digest(fs.readFileSync(runtime.executablePath)));assert(runtime.executablePath.startsWith(runtime.privateCache+'/'));assert.equal(typeof runtime.version,'string');assert.deepEqual(runtime.temp,{directory:process.env.WORK+'/t',TMPDIR:process.env.WORK+'/t',TEMP:process.env.WORK+'/t',TMP:process.env.WORK+'/t'});
const fonts=read(process.env.E+'/font-cache/manifest.json');
assert.equal(fonts.fontSheet,'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
assert.equal(fonts.templateSha256,digest(fs.readFileSync('index.html')));
const original=fs.readFileSync(process.env.E+'/font-cache/'+fonts.entries[0].file,'utf8'), declared=validateFontCss(original);
assert.equal(fonts.entries[0].url,fonts.fontSheet); assert.equal(digest(Buffer.from(original)),fonts.originalSha256);assert.deepEqual(fonts.declared,declared);
assert.deepEqual(declared.urls,fonts.entries.slice(1).map(r=>r.url));
for(const entry of fonts.entries) {
  assert(entry.url===fonts.fontSheet||declared.urls.includes(entry.url));
  assert.equal(entry.file,digest(Buffer.from(entry.url))); assert.equal(entry.status,200);
  const bytes=fs.readFileSync(process.env.E+'/font-cache/'+entry.file); assert.equal(bytes.length,entry.bytes); assert.equal(digest(bytes),entry.sha256);
}
let local=original; for(const entry of fonts.entries.slice(1)) local=local.replaceAll(entry.url,'/held-fonts/'+entry.file);
assert.equal(local,fs.readFileSync(process.env.E+'/font-cache/local.css','utf8')); assert.equal(digest(Buffer.from(local)),fonts.localSha256); assert.equal(Buffer.byteLength(local),fonts.localBytes);
const fontControls=read(process.env.E+'/font-cache/controls.json');
assert.equal(fontControls.baselineFile,'controls-baseline.css');assert.equal(fontControls.baselineSha256,digest(Buffer.from(original)));assert.equal(fontControls.baselineBytes,Buffer.byteLength(original));
assert.equal(fs.readFileSync(process.env.E+'/font-cache/'+fontControls.baselineFile,'utf8'),original);assert.deepEqual(fontControls.declared,declared);
assert.deepEqual(fontControls.controls.map(r=>r.name),['origin','family','missing-weight','normal-style','woff2-format','weight-whitelist','undeclared-url']);
const mutations=[
  {name:'origin',from:declared.urls[0],to:declared.urls[0].replace('https://fonts.gstatic.com/','https://invalid.example/'),message:'Declared font URL stays on exact HTTPS origin'},
  {name:'family',from:"font-family: 'Inter';",to:"font-family: 'Unlisted Font';",message:'Only declared font families'},
  {name:'missing-weight',from:'font-weight: 700;',to:'font-weight: 600;',message:'Every requested normal family and weight is declared'},
  {name:'normal-style',from:'font-style: normal;',to:'font-style: italic;',message:'Declared font faces have normal style'},
  {name:'woff2-format',from:"format('woff2')",to:"format('truetype')",message:'Every declared face uses a concrete woff2 source'},
  {name:'weight-whitelist',from:'font-weight: 700;',to:'font-weight: 800;',message:'Only requested font weights'},
  {name:'undeclared-url',from:original,to:original+"\n.undeclared-control{background-image:url('https://fonts.gstatic.com/undeclared-control.woff2')}\n",message:'Every CSS URL is a validated declared woff2 face'},
];
for(const [index,control] of fontControls.controls.entries()) {
  const mutation=mutations[index];assert.equal(control.from,mutation.from);assert.equal(control.to,mutation.to);assert.equal(control.message,mutation.message);assert(original.includes(mutation.from));assert.notEqual(mutation.from,mutation.to);
  const expected=original.replaceAll(mutation.from,mutation.to),raw=fs.readFileSync(process.env.E+'/font-cache/'+control.file,'utf8');assert.equal(control.file,'control-'+control.name+'.css');assert.equal(raw,expected);assert.notEqual(raw,original);
  assert.equal(control.sha256,digest(Buffer.from(raw)));assert.equal(control.bytes,Buffer.byteLength(raw));
  let error;try{validateFontCss(raw);}catch(caught){error=caught;}
  assert(error instanceof assert.AssertionError);assert(error.message.startsWith(mutation.message));
  assert.deepEqual(control.intendedFailure,{name:error.name,message:error.message,actual:error.actual,expected:error.expected,operator:error.operator});
}
for(const variant of ['candidate','base']) {
  const proof=read(out+'/'+variant+'/fixture-build.json'), served=read(out+'/'+variant+'/served.json'); assert.deepEqual(proof.fonts,fonts);
  for(const response of served.filter(r=>r.source==='held-template-font')) {
    const expected=response.url==='/held-fonts.css'?{sha256:fonts.localSha256,bytes:fonts.localBytes}:fonts.entries.find(r=>response.url==='/held-fonts/'+r.file);
    assert(expected); assert.equal(response.sha256,expected.sha256); assert.equal(response.bytes,expected.bytes);
  }
}
const required=['src/components/club-manager/TrainingScreen.tsx','src/lib/clubManager.ts','src/lib/positionFit.ts','src/hooks/useRevealScroll.ts','src/components/club-manager/SquadScreen.tsx'], seen=new Set();
for(const binding of read(out+'/vite-bindings.json')) {
  const raw=fs.readFileSync(out+'/vite-core/'+binding.map), js=fs.readFileSync(out+'/vite-core/'+binding.js);
  assert.equal(digest(raw),binding.mapSha256); assert.equal(digest(js),binding.jsSha256);
  assert.equal(digest(fs.readFileSync('dist/assets/'+binding.map)),binding.mapSha256); assert.equal(digest(fs.readFileSync('dist/assets/'+binding.js)),binding.jsSha256);
  const map=JSON.parse(raw);
  for(const row of binding.matches) {
    assert(required.includes(row.source)); assert(map.sources[row.index].replaceAll('\\','/').endsWith('/'+row.source)||map.sources[row.index]===row.source);
    assert.equal(digest(Buffer.from(map.sourcesContent[row.index])),row.sha256); assert.equal(digest(fs.readFileSync(row.source)),row.sha256); seen.add(row.source);
  }
}
assert.deepEqual([...seen].sort(),required.sort());
console.log('All six exact TrainingScreen rows, full helper-derived retraining states, actual parent focus failures, fonts, inputs/maps and served bytes are retained.');
NODE
else skip native-receipts; fi
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
  find "$WORK/browser/node_modules" -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dependencies/browser-close.sha256"; cmp "$E/dependencies/browser.sha256" "$E/dependencies/browser-close.sha256"
  sha256sum --quiet -c "$E/dependencies/browser.sha256"
  test "$(readlink "$BASE_ROOT/node_modules")" = "$PWD/node_modules"
  find "$PLAYWRIGHT_BROWSERS_PATH" -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dependencies/chromium-close.sha256"; cmp "$E/dependencies/chromium-before.sha256" "$E/dependencies/chromium-close.sha256"
  find "$PLAYWRIGHT_BROWSERS_PATH" -type l -printf "%p\t%l\n" | sort > "$E/dependencies/chromium-close-links.tsv"; cmp "$E/dependencies/chromium-before-links.tsv" "$E/dependencies/chromium-close-links.tsv"
  find "$WORK/browser/node_modules" -type l -printf "%p\t%l\n" | sort > "$E/dependencies/browser-close-links.tsv"; cmp "$E/dependencies/browser-links.tsv" "$E/dependencies/browser-close-links.tsv"
  find dist -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dist-close.sha256"; cmp "$E/dist-before.sha256" "$E/dist-close.sha256"
  find dist -type l -printf "%p\t%l\n" | sort > "$E/dist-close-links.tsv"; cmp "$E/dist-before-links.tsv" "$E/dist-close-links.tsv"
  find "$E/font-cache" -type f -print0 | sort -z | xargs -0 sha256sum > "$E/font-cache-close.sha256"; cmp "$E/font-cache-before.sha256" "$E/font-cache-close.sha256"
  find "$E/font-cache" -type l -printf "%p\t%l\n" | sort > "$E/font-cache-close-links.tsv"; cmp "$E/font-cache-before-links.tsv" "$E/font-cache-close-links.tsv"
  find "$E/native" -type f -print0 | sort -z | xargs -0 sha256sum > "$E/native-close.sha256"; cmp "$E/native-before.sha256" "$E/native-close.sha256"
  find "$E/native" -type l -printf "%p\t%l\n" | sort > "$E/native-close-links.tsv"; cmp "$E/native-before-links.tsv" "$E/native-close-links.tsv"
  (cd "$BASE_ROOT"; sha256sum --quiet -c "$E/base-source-before.sha256")
  find "$BASE_ROOT/src" "$BASE_ROOT/scripts" "$BASE_ROOT/.github" "$BASE_ROOT/public" -type f | sort > "$E/base-authored-paths-close.txt"; cmp "$E/base-authored-paths-before.txt" "$E/base-authored-paths-close.txt"


'
run dependency-cache-hold 30 node --input-type=module - <<'NODE'
import assert from 'node:assert/strict'; import fs from 'node:fs';
const e=process.env.E, read=n=>new Map(fs.readFileSync(e+'/dependencies/'+n,'utf8').trim().split('\n').map(x=>[x.slice(66),x.slice(0,64)]));
const before=read('app-ci.sha256'), after=read('app-close.sha256');
for(const [file,hash] of before) assert.equal(after.get(file),hash,file);
for(const file of after.keys()) if(!before.has(file)) assert(/^node_modules\/\.(?:vite(?:-temp)?|cache)\//.test(file),'Only ordinary new build/test cache files: '+file);
console.log('Every original application package byte is held; only ordinary new cache files are allowed. The complete held template-font cache is checked separately at closing.');
NODE
run strict-gates 30 node --input-type=module - <<'NODE'
import assert from 'node:assert/strict'; import fs from 'node:fs';
const expected=['identity','locked-packages','runtime','brand-runtime','syntax','fonts','font-hold','base-prepare','types','base-types','build','build-hold','native','native-hold','native-receipts',...process.env.READERS.split(',').map(x=>'reader-'+x),'reader-receipts','closing','dependency-cache-hold'];
const entries=fs.readFileSync(process.env.E+'/gates.tsv','utf8').trim().split('\n').map(x=>x.split('\t'));
fs.writeFileSync(process.env.E+'/strict-gates.json',JSON.stringify({expected,actual:entries},null,2));
assert.deepEqual(entries.map(x=>x[0]),expected); assert(entries.every(x=>x[1]==='0'));
console.log('Every actual named preparation/native/base-control/reader/source/dependency/build gate succeeded.');
NODE
execution_complete=1
exit "$failed"
