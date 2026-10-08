#!/usr/bin/env bash
# Remote-only direct component proof for named Club Manager facility actions. No application edits.
set -uo pipefail
test "${GITHUB_ACTIONS:-}" = true || exit 2
test -n "${RC_OUT:-}" && test -n "${RUNNER_TEMP:-}" || exit 2
BASE_HEAD=795926e37621e437afa986c78185b3b4383636c8
CHECKED_HEAD=c6ae660da550f17406cf4d0d36f06ae034adf680
CHECKED_TREE=d08bc48919e962b5f93bea9a8286dd926ddef96e
REQUEST_HEAD=$(git rev-parse HEAD)
WORK=$(mktemp -d "$RUNNER_TEMP/facilities-1158.XXXXXX") || exit 2
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
  archive="$WORK/cm-facilities-1158-evidence.tar.xz"
  timeout -k 10 180 tar -c -I "xz -T2 -8" -f "$archive" -C "$E" .; packed=$?
  bytes=$(stat -c %s "$archive" 2>/dev/null || echo unavailable)
  if test "$packed" = 0 && test "$bytes" -le 24000000; then
    timeout -k 10 30 cp "$archive" "$RC_OUT/cm-facilities-1158-evidence.tar.xz" || failed=1
    timeout -k 10 20 sha256sum "$RC_OUT/cm-facilities-1158-evidence.tar.xz" > "$RC_OUT/evidence.sha256" || failed=1
    printf 'checked=%s\nrequest=%s\nbytes=%s\nfailed=%s\nexecution_complete=%s\nending=%s\n' "$CHECKED_HEAD" "$REQUEST_HEAD" "$bytes" "$failed" "$execution_complete" "$ending" > "$RC_OUT/receipt.txt" || failed=1
  else
    printf 'EVIDENCE CAP FAILURE: pack_exit=%s bytes=%s limit=24000000; full payload retained only at runner path %s, no truncated evidence accepted.\n' "$packed" "$bytes" "$archive" | tee "$RC_OUT/EVIDENCE-CAP-FAILURE.txt"
    failed=1
  fi
  printf 'Club Manager facilities1158 strict label: failed=%s, complete=%s, source=%s, request=%s.\n' "$failed" "$execution_complete" "$CHECKED_HEAD" "$REQUEST_HEAD"
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
  printf "%s\n" .github/workflows/lane-remote-check.yml .rc/request.txt .rc/run.sh .rc/x/cm-facility-button-names-1158.sh | LC_ALL=C sort > "$E/allowed-overlay.txt"
  git diff --name-only --no-renames "$CHECKED_HEAD" HEAD | LC_ALL=C sort > "$E/actual-overlay.txt"
  cmp "$E/allowed-overlay.txt" "$E/actual-overlay.txt"
  printf "%s\n" "6a91440b409bd361ff3b962f285a32e4f75b2dc9f5f6fbfd2460f7cd50c331ee  .rc/request.txt" "668aeb520674d130f1af2e88494775afff6b8055d9911c715a8b646056b4b62f  .rc/run.sh" "447a4eca8616f708831ec5e6b7bf90ba68afc606054c0e0d0b27b4cb84abec20  .github/workflows/lane-remote-check.yml" > "$E/reviewed-kit.sha256"
  sha256sum -c "$E/reviewed-kit.sha256"
  sha256sum .rc/x/cm-facility-button-names-1158.sh > "$E/dispatched-shell.sha256"
  printf "%s\n" "1e0bd3d5a1e0b1d844a64313d12c87f24ec1c694636c1938ae08323bd1c0b1b2  src/components/club-manager/FacilitiesScreen.tsx" > "$E/reviewed-source.sha256"
  sha256sum -c "$E/reviewed-source.sha256"
  printf "%s\n" docs/PROJECT-STATE.md src/components/club-manager/FacilitiesScreen.tsx | LC_ALL=C sort > "$E/allowed-candidate.txt"
  git diff --name-only --no-renames "$BASE_HEAD" "$CHECKED_HEAD" | LC_ALL=C sort > "$E/actual-candidate.txt"
  cmp "$E/allowed-candidate.txt" "$E/actual-candidate.txt"
  git rev-parse HEAD HEAD^ "HEAD^{tree}" > "$E/identity.txt"
  git ls-tree -r HEAD > "$E/git-runtime-manifest.txt"
  git ls-tree -r "$CHECKED_HEAD" > "$E/git-checked-manifest.txt"
  git ls-tree -r "$BASE_HEAD" > "$E/git-base-manifest.txt"
  git ls-files -z > "$E/runtime-paths.nul"
  git ls-files -z | sort -z | xargs -0 sha256sum > "$E/source-before.sha256"
  git diff "$BASE_HEAD" "$CHECKED_HEAD" -- src/components/club-manager/FacilitiesScreen.tsx > "$E/component-only.diff"
  command -v xz; xz --version
  selected=(
    src/components/club-manager/FacilitiesScreen.tsx src/lib/clubManager.ts src/lib/clubManagerFacilities.ts src/components/club-manager/deskCue.tsx src/lib/utils.ts src/components/club-manager/Celebration.tsx src/components/club-manager/CelebrationStyles.tsx src/index.css
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
async function prepareFonts() {
  assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Remote-only font preparation');
  const template = fs.readFileSync('index.html', 'utf8');
  assert.equal([...template.matchAll(/<link\b[^>]*>/g)].filter(tag => /\brel=["']stylesheet["']/.test(tag[0]) && tag[0].includes(fontSheet)).length, 1, 'Exact declared template font stylesheet');
  fs.mkdirSync(fontDir, { recursive: true });
  const entries = [];
  save(path.join(fontDir, 'partial-manifest.json'), { executionComplete: false, fontSheet, fontAgent, entries });
  const fetchAsset = async url => {
    assert(url === fontSheet || /^https:\/\/fonts\.gstatic\.com\/s\/(?:inter|spacegrotesk)\/[A-Za-z0-9_./-]+\.woff2$/.test(url), 'Only actual declared family font assets');
    const response = await fetch(url, { headers: { 'User-Agent': fontAgent }, signal: AbortSignal.timeout(20000), redirect: 'error' });
    assert.equal(response.status, 200, 'Actual font asset ' + url);
    const bytes = Buffer.from(await response.arrayBuffer()), file = hash(Buffer.from(url));
    assert(bytes.length > 0); fs.writeFileSync(path.join(fontDir, file), bytes);
    entries.push({ url, file, bytes: bytes.length, sha256: hash(bytes), contentType: response.headers.get('content-type'), status: response.status });
    save(path.join(fontDir, 'partial-manifest.json'), { executionComplete: false, fontSheet, fontAgent, entries });
    return bytes;
  };
  const original = (await fetchAsset(fontSheet)).toString('utf8'), urls = fontUrls(original);
  const allUrls = [...new Set([...original.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)].map(match => match[1]))];
  assert.deepEqual(allUrls, urls, 'Every original CSS URL belongs to the exact declared font asset set');
  assert(urls.length > 1); assert(urls.some(url => url.includes('/inter/')) && urls.some(url => url.includes('/spacegrotesk/')));
  for (const url of urls) await fetchAsset(url);
  let local = original;
  for (const entry of entries.slice(1)) local = local.replaceAll(entry.url, '/held-fonts/' + entry.file);
  assert.equal(fontUrls(local).length, 0); fs.writeFileSync(path.join(fontDir, 'local.css'), local);
  save(path.join(fontDir, 'manifest.json'), { fontSheet, fontAgent, templateSha256: hash(Buffer.from(template)), entries, originalSha256: hash(Buffer.from(original)), localSha256: hash(Buffer.from(local)), localBytes: Buffer.byteLength(local) });
  console.log('Fonts1158 PASS: actual template CSS and all referenced declared-family woff2 bodies retained and mapped to local serving.');
}

async function main() {
  assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Remote-only worker');
  const root = process.cwd(), out = path.join(process.env.E, 'native');
  const require = createRequire(path.join(root, 'package.json'));
  const { chromium } = require('playwright'), { build } = require('esbuild');
  const epoch = Date.UTC(2026, 0, 1, 12);
  const core = ['src/components/club-manager/FacilitiesScreen.tsx', 'src/lib/clubManager.ts', 'src/lib/clubManagerFacilities.ts', 'src/components/club-manager/deskCue.tsx'];
  const ids = ['stadium', 'trainingGround', 'medical', 'dressingRoom'];
  const labels = ['Stadium', 'Training ground', 'Medical', 'Dressing room'];
  const sourceLabel = '                      aria-label={`${info.label}: ${cost === null ? \'Maxed\' : `Upgrade ${money(cost)}`}`}\n';
  const actualSource = fs.readFileSync(path.join(root, core[0]), 'utf8');
  assert.equal(actualSource.split(sourceLabel).length, 2, 'Exactly one reviewed executable facility label line');
  assert.equal(actualSource.replace(sourceLabel, ''), fs.readFileSync(path.join(process.env.BASE_ROOT, core[0]), 'utf8'), 'Exact one-line inverse binds the actual untouched parent component');
  for (const source of core.slice(1)) assert.equal(hash(fs.readFileSync(path.join(root, source))), hash(fs.readFileSync(path.join(process.env.BASE_ROOT, source))), 'Actual parent helpers held: ' + source);
  const fonts = JSON.parse(fs.readFileSync(path.join(fontDir, 'manifest.json')));
  assert.equal(fonts.fontSheet, fontSheet); assert.equal(fonts.fontAgent, fontAgent);
  assert.equal(fonts.templateSha256, hash(fs.readFileSync(path.join(root, 'index.html'))));
  const fontAssets = new Map();
  for (const entry of fonts.entries) {
    const file = path.join(fontDir, entry.file), bytes = fs.readFileSync(file);
    assert.equal(bytes.length, entry.bytes); assert.equal(hash(bytes), entry.sha256); assert.equal(entry.status, 200);
    assert.equal(entry.file, hash(Buffer.from(entry.url)));
    assert(entry.url === fontSheet || /^https:\/\/fonts\.gstatic\.com\/s\/(?:inter|spacegrotesk)\/[A-Za-z0-9_./-]+\.woff2$/.test(entry.url));
    if (entry.url !== fontSheet) fontAssets.set('/held-fonts/' + entry.file, { file, type: entry.contentType });
  }
  const originalFontCss = fs.readFileSync(path.join(fontDir, fonts.entries[0].file), 'utf8');
  assert.equal(fonts.entries[0].url, fontSheet);
  assert.deepEqual(fontUrls(originalFontCss), fonts.entries.slice(1).map(entry => entry.url));
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
  fs.mkdirSync(out, { recursive: true });
  save(path.join(out, 'partial-summary.json'), { executionComplete: false, results });
  const executable = chromium.executablePath();
  assert(executable.startsWith(process.env.PLAYWRIGHT_BROWSERS_PATH + path.sep));
  const browser = await chromium.launch({ headless: true, executablePath: executable });
  save(path.join(out, 'browser-runtime.json'), { version: browser.version(), executablePath: executable, executableSha256: hash(fs.readFileSync(executable)), privateCache: process.env.PLAYWRIGHT_BROWSERS_PATH });
  let careerTemplate;
  try {
    for (const [variant, sourceRoot] of [['candidate', root], ['base', process.env.BASE_ROOT]]) {
      const variantOut = path.join(out, variant), browserDir = path.join(variantOut, 'browser');
      fs.mkdirSync(browserDir, { recursive: true });
      const engineEntry = `globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
export const engine=await import(${JSON.stringify(sourceRoot + '/src/lib/clubManager.ts')});
export const facilities=await import(${JSON.stringify(sourceRoot + '/src/lib/clubManagerFacilities.ts')});`;
      const clientEntry = `import React from 'react';
import {createRoot} from 'react-dom/client';
import {FacilitiesScreen} from ${JSON.stringify(sourceRoot + '/src/components/club-manager/FacilitiesScreen.tsx')};
import {upgradeFacility} from ${JSON.stringify(sourceRoot + '/src/lib/clubManagerFacilities.ts')};
export function mount(fixture){
 let current=JSON.parse(JSON.stringify(fixture)), calls=[];
 const view=createRoot(document.getElementById('fixture-root'));
 function render(){view.render(<FacilitiesScreen career={current} onUpgrade={id=>{
  calls.push(id); const next=upgradeFacility(current,id); if(next){current=next;render();}
 }}/>);}
 window.__facilities1158={snapshot:()=>({career:JSON.parse(JSON.stringify(current)),calls:[...calls]})};
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
      const engineBuild = await build({ absWorkingDir: sourceRoot, stdin: { contents: engineEntry, sourcefile: '1158-engine-entry.mjs', resolveDir: sourceRoot, loader: 'js' }, outfile: engineFile, bundle: true, platform: 'node', format: 'esm', sourcemap: true, metafile: true, alias: { '@': path.join(sourceRoot, 'src') }, tsconfig: path.join(sourceRoot, 'tsconfig.app.json') });
      const engineBinding = bindBuild(engineBuild, engineFile, '1158-engine-entry.mjs', engineEntry, core.slice(1, 3));
      const { engine, facilities } = await import(pathToFileURL(engineFile).href);
      assert.deepEqual(facilities.FACILITY_IDS, ids);
      assert.deepEqual(ids.map(id => facilities.CLUB_FACILITY_INFO[id].label), labels);
      assert.equal(facilities.FACILITY_MAX, 10);
      if (!careerTemplate) {
        const RealDate = globalThis.Date, originalRandom = Math.random;
        let seed = 1158;
        try {
          globalThis.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [epoch])); } static now() { return epoch; } };
          Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
          careerTemplate = clone(engine.startCareer('Sunderland'));
        } finally { globalThis.Date = RealDate; Math.random = originalRandom; }
        assert(careerTemplate && typeof careerTemplate === 'object');
        save(path.join(out, 'actual-start-career-template.json'), careerTemplate);
      }
      fs.writeFileSync(path.join(variantOut, 'client-entry.jsx'), clientEntry);
      const clientFile = path.join(browserDir, 'fixture.js');
      const clientBuild = await build({ absWorkingDir: sourceRoot, stdin: { contents: clientEntry, sourcefile: '1158-client-entry.jsx', resolveDir: sourceRoot, loader: 'jsx' }, outfile: clientFile, bundle: true, platform: 'browser', format: 'esm', sourcemap: true, metafile: true, alias: { '@': path.join(sourceRoot, 'src') }, tsconfig: path.join(sourceRoot, 'tsconfig.app.json') });
      const clientBinding = bindBuild(clientBuild, clientFile, '1158-client-entry.jsx', clientEntry, core);
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
      const html = `<!doctype html><html class="dark"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/held-fonts.css">${css.map(c => `<link rel="stylesheet" href="${c.url}">`).join('')}</head><body class="bg-background text-foreground"><main id="fixture-root" class="mx-auto max-w-2xl p-4"></main><script type="module">import{mount}from'/fixture.js';mount(window.__facilitiesFixture);</script></body></html>`;
      fs.writeFileSync(path.join(browserDir, 'index.html'), html);
      save(path.join(variantOut, 'fixture-build.json'), { scope: 'Actual FacilitiesScreen direct component, not ClubManager route or saves', engine: engineBinding, client: clientBinding, css, cssSelection, cssByteControl, fonts, htmlSha256: hash(Buffer.from(html)) });
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
      const effect = (state, id) => {
        const line = facilities.facilityEffectLine(state, id);
        if (id !== 'trainingGround' || facilities.facilityLevel(state, id) <= 1) return line;
        const n = engine.growingAtCeiling(state, () => true).length;
        return n === 0 ? line : `${line} ${n === 1 ? 'As a regular, one player would' : `As regulars, ${n} players would`} be growing as fast as anyone can, so ${n === 1 ? 'he' : 'they'} would get less of the lift.`;
      };
      const cases = variant === 'candidate' ? [...ids.flatMap(id => [[320, id], [1280, id]]), [320, 'zero'], [320, 'maxed']] : [[320, 'missing-name'], [1280, 'missing-name']];
      for (const [width, action] of cases) {
        const name = variant + '-' + width + '-' + action, dir = path.join(out, name); fs.mkdirSync(dir);
        const fixture = clone(careerTemplate), full = action === 'maxed';
        fixture.budget = action === 'zero' ? 0 : 100;
        fixture.facilities = { v: facilities.FACILITIES_VERSION, ...Object.fromEntries(ids.map(id => [id, full ? 10 : 1])), seasonSpend: 0 };
        assert(facilities.isValidFacilities(fixture.facilities));
        assert.deepEqual(ids.map(id => facilities.facilityUpgradeCost(fixture, id)), full ? [null, null, null, null] : [6, 4, 3, 2]);
        save(path.join(dir, 'actual-engine-fixture.json'), fixture);
        const row = { name, variant, width, action, fixtureSha256: hash(fs.readFileSync(path.join(dir, 'actual-engine-fixture.json'))), status: 'failed', pageErrors: [], localFailures: [], localRequests: [], blocked: [], sockets: [], checks: {} };
        let context, page;
        const snapshot = async stage => {
          const board = page.locator('[data-facilities-desk]');
          const data = await board.evaluate(el => ({ html: el.outerHTML, text: el.innerText, live: el.querySelector('[data-desk-cue-live]').textContent, rows: [...el.querySelectorAll('[data-facility]')].map(node => { const button = node.querySelector('button'), r = button.getBoundingClientRect(); return { id: node.dataset.facility, level: Number(node.dataset.facilityLevel), text: node.innerText, current: node.querySelector('[data-facility-current]').textContent, currentFresh: node.querySelector('[data-facility-current]').dataset.facilityFresh ?? null, preview: node.querySelector('[data-facility-preview]')?.innerText ?? null, freshPips: [...node.querySelectorAll('[data-facility-pip-fresh]')].map(pip => [...pip.parentElement.children].indexOf(pip)), pipCount: node.querySelectorAll('.flex.gap-0\\.5 > span').length, button: { text: button.textContent, className: button.className, label: button.getAttribute('aria-label'), disabled: button.disabled, height: r.height } }; }) }));
          data.aria = await board.ariaSnapshot(); data.state = await page.evaluate(() => window.__facilities1158.snapshot());
          data.geometry = await board.evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.x, width: r.width, documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth, scrollY }; });
          data.clock = await page.evaluate(() => ({ dateNow: Date.now(), performanceNow: performance.now() }));
          save(path.join(dir, stage + '.json'), data); await board.screenshot({ path: path.join(dir, stage + '.png') }); return data;
        };
        const buttonText = (state, id) => {
          const cost = facilities.facilityUpgradeCost(state, id);
          return cost === null ? 'Maxed' : 'Upgrade ' + engine.moneyIn(state)(cost);
        };
        const assertNamed = async (id, state) => {
          const text = buttonText(state, id), name = labels[ids.indexOf(id)] + ': ' + text;
          const button = page.getByRole('button', { name, exact: true });
          assert.equal(await button.count(), 1, 'Exactly one native facility button named ' + name);
          assert.equal(await button.textContent(), text); return button;
        };
        const assertRows = (data, state, active = null) => {
          assert.deepEqual(data.rows.map(row => row.id), ids);
          for (const row of data.rows) {
            const id = row.id, next = facilities.upgradeFacility(clone(state), id);
            assert.equal(row.level, facilities.facilityLevel(state, id)); assert.equal(row.pipCount, 10);
            assert.equal(row.current, 'Now: ' + effect(state, id));
            assert.equal(row.button.text, buttonText(state, id)); assert(row.button.height >= 44);
            assert.equal(row.button.disabled, next === null);
            assert.equal(row.preview, next ? `Next, level ${facilities.facilityLevel(next, id)}: ${effect(next, id)}\n\nLeaves ${engine.moneyIn(state)(next.budget)} in the transfer kitty.` : null);
            assert.deepEqual(row.freshPips, active === id ? [row.level - 1] : []);
            assert.equal(row.currentFresh, active === id ? 'yes' : null);
          }
          assert(data.geometry.documentWidth <= width); assert.equal(data.geometry.viewportWidth, width);
        };
        try {
          context = await browser.newContext({ viewport: { width, height: 900 } });
          await context.routeWebSocket('**/*', socket => { row.sockets.push(socket.url()); socket.close(); });
          await context.route('**/*', async route => {
            const request = route.request(), url = request.url();
            if (!url.startsWith(origin + '/')) { row.blocked.push({ url, method: request.method() }); await route.abort(); return; }
            row.localRequests.push({ url: new URL(url).pathname, method: request.method() });
            if (request.method() !== 'GET') { row.localFailures.push({ url, error: 'Unexpected local write' }); await route.abort(); return; }
            await route.continue();
          });
          await context.addInitScript(fixture => { window.__facilitiesFixture = fixture; }, fixture);
          page = await context.newPage(); await page.clock.install({ time: epoch - 1000 }); await page.clock.pauseAt(epoch);
          page.on('pageerror', error => row.pageErrors.push({ name: error.name, message: error.message, stack: error.stack }));
          page.on('requestfailed', request => { if (request.url().startsWith(origin + '/')) row.localFailures.push({ url: request.url(), error: request.failure() }); });
          page.on('response', response => { if (response.url().startsWith(origin + '/') && response.status() >= 400) row.localFailures.push({ url: response.url(), status: response.status() }); });
          await page.goto(origin, { waitUntil: 'networkidle' }); await page.locator('[data-facilities-desk]').waitFor();
          row.fonts = await page.evaluate(async () => {
            await document.fonts.ready; const faces = [];
            for (const family of ['Inter', 'Space Grotesk']) for (const weight of [400, 500, 600, 700]) {
              const loaded = await document.fonts.load(`${weight} 16px "${family}"`, 'Facilities');
              faces.push({ family, weight, loaded: loaded.map(face => ({ family: face.family, weight: face.weight, status: face.status })) });
            }
            return faces;
          });
          assert.equal(row.fonts.length, 8);
          assert(row.fonts.every(row => row.loaded.length && row.loaded.every(face => face.status === 'loaded' && face.family.replaceAll('"', '') === row.family && face.weight === String(row.weight))), 'All eight actual declared font faces loaded');
          row.before = await snapshot('before'); assertRows(row.before, fixture);
          assert.deepEqual(row.before.state.career, fixture); assert.deepEqual(row.before.state.calls, []); assert.equal(row.before.live, '');
          if (action === 'missing-name') {
            const desired = labels[0] + ': ' + buttonText(fixture, ids[0]);
            assert.equal(await page.getByRole('button', { name: buttonText(fixture, ids[0]), exact: true }).count(), 1);
            let intendedFailure;
            try { await assertNamed(ids[0], fixture); } catch (error) { intendedFailure = error; }
            assert(intendedFailure instanceof assert.AssertionError); assert.equal(intendedFailure.actual, 0); assert.equal(intendedFailure.expected, 1);
            assert(intendedFailure.message.includes('Exactly one native facility button named ' + desired));
            row.intendedNameFailure = { name: intendedFailure.name, message: intendedFailure.message, actual: intendedFailure.actual, expected: intendedFailure.expected };
            for (const id of ids) assert.equal(await page.getByRole('button', { name: labels[ids.indexOf(id)] + ': ' + buttonText(fixture, id), exact: true }).count(), 0);
            assert(row.before.rows.every(row => row.button.label === null && !row.button.disabled));
            row.checks = { priceOnlyNames: 4, desiredNamedActionCount: 0, intendedNameAssertionFailed: true, unrelatedFullStateBaselinePassed: true };
          } else {
            for (const id of ids) await assertNamed(id, fixture);
            if (action === 'zero' || action === 'maxed') {
              for (const id of ids) { assert(await (await assertNamed(id, fixture)).isDisabled()); assert.equal(facilities.upgradeFacility(clone(fixture), id), null, 'Held helper refuses disabled upgrade'); }
              row.after = await snapshot('after'); assertRows(row.after, fixture); assert.deepEqual(row.after.state, row.before.state); assert.equal(row.after.live, '');
              row.checks = { allFourDisabled: true, heldHelperRefused: true, completeStateUnchanged: true, noCue: true };
            } else {
              const button = await assertNamed(action, fixture); assert(await button.isEnabled());
              await button.focus(); assert(await button.evaluate(el => el === document.activeElement)); await button.press('Enter');
              const expected = facilities.upgradeFacility(clone(fixture), action); assert(expected); assert.notDeepEqual(expected, fixture);
              const cue = `${labels[ids.indexOf(action)]} is level ${facilities.facilityLevel(expected, action)} of 10 now. ${effect(expected, action)}`;
              await page.locator(`[data-facility="${action}"][data-facility-level="2"]`).waitFor();
              await page.getByText(cue, { exact: true }).waitFor({ state: 'attached' });
              row.after = await snapshot('after'); assertRows(row.after, expected, action);
              save(path.join(dir, 'expected-held-helper-state.json'), expected); row.expectedStateSha256 = hash(fs.readFileSync(path.join(dir, 'expected-held-helper-state.json')));
              assert.deepEqual(row.after.state.career, expected); assert.deepEqual(row.after.state.calls, [action]); assert.equal(row.after.live, cue);
              const cost = facilities.facilityUpgradeCost(fixture, action);
              assert.equal(expected.budget, fixture.budget - cost); assert.equal(expected.facilities.seasonSpend, cost); assert.equal(expected.facilities[action], 2);
              for (const id of ids) if (id !== action) assert.equal(expected.facilities[id], fixture.facilities[id]);
              for (const id of ids) await assertNamed(id, expected);
              assert.equal(row.after.clock.dateNow, epoch); assert.equal(row.after.clock.performanceNow, row.before.clock.performanceNow); assert.equal(row.after.geometry.scrollY, row.before.geometry.scrollY);
              row.checks = { actualEnter: true, actionCalls: 1, intendedFacility: action, cost, budgetBefore: fixture.budget, budgetAfter: expected.budget, selectedBefore: 1, selectedAfter: 2, otherThreeLevelsHeld: true, fullHeldHelperStateEqual: true, actualPreviewAndEffect: true, actualFreshPip: true, actualLiveCue: cue };
            }
          }
          const requested = new Set(row.localRequests.filter(r => r.method === 'GET').map(r => r.url));
          assert(requested.has('/fixture.js') && requested.has('/held-fonts.css'), 'Actual component bundle and locally held original template font CSS loaded');
          assert([...requested].some(url => url.startsWith('/held-fonts/')), 'Actual held font payloads loaded');
          for (const style of css) assert(requested.has(style.url), 'Case loaded actual built application CSS');
          assert.equal(row.blocked.length, 0); assert.equal(row.sockets.length, 0);
          row.status = 'passed';
        } catch (error) { row.error = { name: error.name, message: error.message, stack: error.stack }; }
        finally {
          if (context) try { await context.close(); } catch (error) { row.closeError = String(error); row.status = 'failed'; }
          if (row.pageErrors.length || row.localFailures.length) row.status = 'failed';
          save(path.join(dir, 'result.json'), row); results.push(row);
          save(path.join(out, 'partial-summary.json'), { executionComplete: false, results });
        }
      }
      assert(records.every(r => !r.error));
      for (const row of results.filter(r => r.variant === variant)) for (const request of row.localRequests) assert(records.some(r => r.url === request.url && r.method === request.method && !r.error));
      variants.push({ variant, engineBinding, clientBinding, servedRecords: records.length });
    }
    for (const width of [320, 1280]) {
      const base = results.find(r => r.name === 'base-' + width + '-missing-name'), candidate = results.find(r => r.name === 'candidate-' + width + '-stadium');
      assert(base && candidate);
      const visible = data => data.rows.map(({ button, ...row }) => ({ ...row, button: { text: button.text, className: button.className, disabled: button.disabled, height: button.height } }));
      assert.deepEqual(visible(candidate.before), visible(base.before)); assert.deepEqual(candidate.before.state, base.before.state);
      assert.equal(candidate.before.geometry.width, base.before.geometry.width); assert.equal(candidate.before.geometry.documentWidth, base.before.geometry.documentWidth);
    }
    assert.equal(results.filter(r => r.variant === 'candidate').length, 10); assert.equal(results.filter(r => r.variant === 'base').length, 2);
    assert(results.every(r => r.status === 'passed'));
  } finally {
    await browser.close();
    for (const server of servers) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
  save(path.join(out, 'summary.json'), { executionComplete: true, healthy: 10, effectiveBaseControls: 2, variants, results, scope: 'Direct actual FacilitiesScreen component and actual held facilities helper, not ClubManager route or save persistence' });
  console.log('Native1158 PASS: ten actual candidate component cases and two untouched-parent name controls. Native Enter upgrades each named facility with full held-helper consequences, actual preview/effect/desk cue, zero-budget and maxed refusals.');
}
(process.argv.includes('--prefetch-fonts-only') ? prepareFonts() : main()).catch(error => { console.error(error); process.exitCode = 1; });
NATIVE_WORKER
run syntax 30 bash -euo pipefail -c 'bash -n .rc/x/cm-facility-button-names-1158.sh; node --check "$E/native-worker.mjs"; printf "%s\n" "5ca7d7faac6654754d3f3d9367fd0f3a95f67934be2e4b642fcb0ed59d650932  $E/native-worker.mjs" | sha256sum -c -'
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
  git archive "$BASE_HEAD" -- src/components/club-manager/FacilitiesScreen.tsx src/lib/clubManager.ts src/lib/clubManagerFacilities.ts src/components/club-manager/deskCue.tsx src/lib/utils.ts src/components/club-manager/Celebration.tsx src/components/club-manager/CelebrationStyles.tsx src/index.css > "$E/base-core-source.tar"
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
import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import {createHash} from 'node:crypto';
const digest=b=>createHash('sha256').update(b).digest('hex'), read=f=>JSON.parse(fs.readFileSync(f)), out=process.env.E+'/native';
const summary=read(out+'/summary.json');
const ids=['stadium','trainingGround','medical','dressingRoom'];
const expected=[...ids.flatMap(id=>['candidate-320-'+id,'candidate-1280-'+id]),'candidate-320-zero','candidate-320-maxed','base-320-missing-name','base-1280-missing-name'];
assert.equal(summary.executionComplete,true); assert.equal(summary.healthy,10); assert.equal(summary.effectiveBaseControls,2);
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
    assert.equal(binding.requiredCore.length,kind==='engine'?2:4);
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
  for(const row of summary.results.filter(r=>r.variant===variant)) {
    assert.deepEqual(row,read(out+'/'+row.name+'/result.json')); assert.equal(row.status,'passed');
    assert.equal(row.pageErrors.length,0); assert.equal(row.localFailures.length,0); assert(!row.error&&!row.closeError);
    assert.equal(digest(fs.readFileSync(out+'/'+row.name+'/actual-engine-fixture.json')),row.fixtureSha256);
    assert.deepEqual(row.before,read(out+'/'+row.name+'/before.json')); assert.equal(row.before.rows.length,4);
    assert.deepEqual(row.before.rows.map(r=>r.id),ids);
    assert.equal(row.before.state.calls.length,0); assert.equal(row.before.live,'');
    assert.equal(row.blocked.length,0); assert.equal(row.sockets.length,0);
    assert.equal(row.fonts.length,8); assert(row.fonts.every(r=>r.loaded.length&&r.loaded.every(f=>f.status==='loaded'&&f.family.replaceAll('"','')===r.family&&f.weight===String(r.weight))));
    for(const request of row.localRequests) assert(served.some(r=>r.url===request.url&&r.method===request.method));
    const script=served.filter(r=>r.url==='/fixture.js'); assert(script.length>0); assert(script.every(r=>r.sha256===proof.client.jsSha256));
    assert(row.localRequests.some(r=>r.url==='/fixture.js'&&r.method==='GET'));
    assert(row.localRequests.some(r=>r.url==='/held-fonts.css'&&r.method==='GET'));
    assert(row.localRequests.some(r=>r.url.startsWith('/held-fonts/')&&r.method==='GET'));
    for(const css of proof.css) assert(row.localRequests.some(r=>r.url===css.url&&r.method==='GET')&&served.some(r=>r.url===css.url&&r.sha256===css.sha256));
    if(ids.includes(row.action)) {
      assert.equal(digest(fs.readFileSync(out+'/'+row.name+'/expected-held-helper-state.json')),row.expectedStateSha256);
      assert.deepEqual(row.after,read(out+'/'+row.name+'/after.json')); assert.deepEqual(row.after.state.career,read(out+'/'+row.name+'/expected-held-helper-state.json'));
      assert.deepEqual(row.after.state.calls,[row.action]); assert.equal(row.checks.fullHeldHelperStateEqual,true);
      assert.equal(row.checks.actualEnter,true); assert.equal(row.checks.actionCalls,1); assert.equal(row.checks.intendedFacility,row.action);
      assert.equal(row.before.state.career.budget,100); assert.equal(row.after.state.career.budget,100-row.checks.cost);
      assert.equal(row.before.state.career.facilities[row.action],1); assert.equal(row.after.state.career.facilities[row.action],2);
      for(const id of ids) if(id!==row.action) assert.equal(row.after.state.career.facilities[id],row.before.state.career.facilities[id]);
      assert.equal(row.after.live,row.checks.actualLiveCue);
      assert.equal(row.after.rows.filter(r=>r.currentFresh==='yes').length,1);
      assert.deepEqual(row.after.rows.find(r=>r.id===row.action).freshPips,[1]);
    } else if(row.action==='missing-name') {
      assert.equal(row.intendedNameFailure.name,'AssertionError'); assert.equal(row.intendedNameFailure.actual,0); assert.equal(row.intendedNameFailure.expected,1);
      assert.equal(row.checks.priceOnlyNames,4); assert.equal(row.checks.unrelatedFullStateBaselinePassed,true);
      assert(row.before.rows.every(r=>r.button.label===null&&!r.button.disabled));
    } else {
      assert.deepEqual(row.after,read(out+'/'+row.name+'/after.json')); assert.deepEqual(row.after.state,row.before.state); assert.equal(row.checks.heldHelperRefused,true);
      assert.equal(row.checks.allFourDisabled,true); assert(row.after.rows.every(r=>r.button.disabled)); assert.equal(row.after.live,'');
    }
  }
}
const fonts=read(process.env.E+'/font-cache/manifest.json');
const fontUrls=css=>[...new Set([...css.matchAll(/url\(['"]?(https:\/\/fonts\.gstatic\.com\/[^)'"\s]+)['"]?\)/g)].map(m=>m[1]))];
assert.equal(fonts.fontSheet,'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
assert.equal(fonts.templateSha256,digest(fs.readFileSync('index.html')));
for(const entry of fonts.entries) {
  assert(entry.url===fonts.fontSheet||/^https:\/\/fonts\.gstatic\.com\/s\/(?:inter|spacegrotesk)\/[A-Za-z0-9_./-]+\.woff2$/.test(entry.url));
  assert.equal(entry.file,digest(Buffer.from(entry.url))); assert.equal(entry.status,200);
  const bytes=fs.readFileSync(process.env.E+'/font-cache/'+entry.file); assert.equal(bytes.length,entry.bytes); assert.equal(digest(bytes),entry.sha256);
}
const original=fs.readFileSync(process.env.E+'/font-cache/'+fonts.entries[0].file,'utf8');
assert.equal(fonts.entries[0].url,fonts.fontSheet); assert.equal(digest(Buffer.from(original)),fonts.originalSha256);
assert.deepEqual(fontUrls(original),fonts.entries.slice(1).map(r=>r.url));
assert.deepEqual([...new Set([...original.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)].map(m=>m[1]))],fontUrls(original));
let local=original; for(const entry of fonts.entries.slice(1)) local=local.replaceAll(entry.url,'/held-fonts/'+entry.file);
assert.equal(local,fs.readFileSync(process.env.E+'/font-cache/local.css','utf8')); assert.equal(digest(Buffer.from(local)),fonts.localSha256); assert.equal(Buffer.byteLength(local),fonts.localBytes);
for(const variant of ['candidate','base']) {
  const proof=read(out+'/'+variant+'/fixture-build.json'), served=read(out+'/'+variant+'/served.json'); assert.deepEqual(proof.fonts,fonts);
  for(const response of served.filter(r=>r.source==='held-template-font')) {
    const expected=response.url==='/held-fonts.css'?{sha256:fonts.localSha256,bytes:fonts.localBytes}:fonts.entries.find(r=>response.url==='/held-fonts/'+r.file);
    assert(expected); assert.equal(response.sha256,expected.sha256); assert.equal(response.bytes,expected.bytes);
  }
}
const required=['src/components/club-manager/FacilitiesScreen.tsx','src/lib/clubManager.ts','src/lib/clubManagerFacilities.ts','src/components/club-manager/deskCue.tsx'], seen=new Set();
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
console.log('All twelve exact actual component rows, complete helper/effect/cue states, parent controls, fonts, app/core/input/maps and served payload hashes are retained.');
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
