#!/usr/bin/env bash
# Remote-only direct component proof for named Club Manager bracket keyboard actions. No application edits.
set -uo pipefail
test "${GITHUB_ACTIONS:-}" = true || exit 2
test -n "${RC_OUT:-}" && test -n "${RUNNER_TEMP:-}" || exit 2
BASE_HEAD=795926e37621e437afa986c78185b3b4383636c8
CHECKED_HEAD=bf2dc9629a05cdabb1b1141da8157779a960bd03
CHECKED_TREE=665fc6d2de85893a01a3ea97303fe7264b079265
REQUEST_HEAD=$(git rev-parse HEAD)
WORK=$(mktemp -d "$RUNNER_TEMP/bracket-1159.XXXXXX") || exit 2
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
  archive="$WORK/cm-bracket-1159-evidence.tar.xz"
  timeout -k 10 180 tar -c -I "xz -T2 -8" -f "$archive" -C "$E" .; packed=$?
  bytes=$(stat -c %s "$archive" 2>/dev/null || echo unavailable)
  if test "$packed" = 0 && test "$bytes" -le 24000000; then
    timeout -k 10 30 cp "$archive" "$RC_OUT/cm-bracket-1159-evidence.tar.xz" || failed=1
    timeout -k 10 20 sha256sum "$RC_OUT/cm-bracket-1159-evidence.tar.xz" > "$RC_OUT/evidence.sha256" || failed=1
    printf 'checked=%s\nrequest=%s\nbytes=%s\nfailed=%s\nexecution_complete=%s\nending=%s\n' "$CHECKED_HEAD" "$REQUEST_HEAD" "$bytes" "$failed" "$execution_complete" "$ending" > "$RC_OUT/receipt.txt" || failed=1
  else
    printf 'EVIDENCE CAP FAILURE: pack_exit=%s bytes=%s limit=24000000; full payload retained only at runner path %s, no truncated evidence accepted.\n' "$packed" "$bytes" "$archive" | tee "$RC_OUT/EVIDENCE-CAP-FAILURE.txt"
    failed=1
  fi
  printf 'Club Manager bracket1159 strict label: failed=%s, complete=%s, source=%s, request=%s.\n' "$failed" "$execution_complete" "$CHECKED_HEAD" "$REQUEST_HEAD"
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
  printf "%s\n" .github/workflows/lane-remote-check.yml .rc/request.txt .rc/run.sh .rc/x/cm-bracket-keyboard-1159.sh | LC_ALL=C sort > "$E/allowed-overlay.txt"
  git diff --name-only --no-renames "$CHECKED_HEAD" HEAD | LC_ALL=C sort > "$E/actual-overlay.txt"
  cmp "$E/allowed-overlay.txt" "$E/actual-overlay.txt"
  printf "%s\n" "84a3ca9aa1cc009251471ced62397947765ad1036a8f77a5e421b96e830e5644  .rc/request.txt" "668aeb520674d130f1af2e88494775afff6b8055d9911c715a8b646056b4b62f  .rc/run.sh" "447a4eca8616f708831ec5e6b7bf90ba68afc606054c0e0d0b27b4cb84abec20  .github/workflows/lane-remote-check.yml" > "$E/reviewed-kit.sha256"
  sha256sum -c "$E/reviewed-kit.sha256"
  sha256sum .rc/x/cm-bracket-keyboard-1159.sh > "$E/dispatched-shell.sha256"
  printf "%s\n" "c25ea538cb3615e0d7da3633dfe35cb1c55aabe0d000f3ae414d81563233e758  src/components/club-manager/CupBracketCard.tsx" > "$E/reviewed-source.sha256"
  sha256sum -c "$E/reviewed-source.sha256"
  printf "%s\n" docs/PROJECT-STATE.md src/components/club-manager/CupBracketCard.tsx | LC_ALL=C sort > "$E/allowed-candidate.txt"
  git diff --name-only --no-renames "$BASE_HEAD" "$CHECKED_HEAD" | LC_ALL=C sort > "$E/actual-candidate.txt"
  cmp "$E/allowed-candidate.txt" "$E/actual-candidate.txt"
  git rev-parse HEAD HEAD^ "HEAD^{tree}" > "$E/identity.txt"
  git ls-tree -r HEAD > "$E/git-runtime-manifest.txt"
  git ls-tree -r "$CHECKED_HEAD" > "$E/git-checked-manifest.txt"
  git ls-tree -r "$BASE_HEAD" > "$E/git-base-manifest.txt"
  git ls-files -z > "$E/runtime-paths.nul"
  git ls-files -z | sort -z | xargs -0 sha256sum > "$E/source-before.sha256"
  git diff "$BASE_HEAD" "$CHECKED_HEAD" -- src/components/club-manager/CupBracketCard.tsx > "$E/component-only.diff"
  command -v xz; xz --version
  selected=(
    src/components/club-manager/CupBracketCard.tsx src/lib/clubManager.ts src/lib/clubManagerSlots.ts src/components/club-manager/UclBracketCard.tsx src/lib/utils.ts src/components/club-manager/Celebration.tsx src/components/club-manager/CelebrationStyles.tsx src/index.css
    package.json package-lock.json vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json tailwind.config.ts postcss.config.js index.html
    scripts/runAllSims.mjs scripts/simAdsense.mjs scripts/simBrand.mjs scripts/simHeadTags.mjs scripts/simHiddenPages.mjs scripts/simHubs.mjs scripts/simIndexNow.mjs scripts/simIndexing.mjs scripts/simInternalLinks.mjs scripts/simNoRivalNames.mjs scripts/simPrerender.mjs scripts/simPrerenderBoot.mjs scripts/simRetiredRoutes.mjs scripts/simSchema.mjs scripts/simSitemap.mjs scripts/simSnapshotAssets.mjs
    scripts/lib/offlineTransport.cjs scripts/lib/atomicWrite.mjs scripts/lib/retiredRoutes.mjs scripts/lib/playwrightLoader.mjs scripts/genHiddenStubs.mjs scripts/genRetiredStubs.mjs scripts/genSeoMetaParts.mjs scripts/logo/gen_logo.py
    src/App.tsx src/pages/ClubManager.tsx src/data/gameRegistry.ts scripts/data/lastmod.json
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
const fontSheet = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap';
const fontDir = path.join(process.env.E, 'font-cache');
const fontAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36';
const fontUrls = css => [...new Set([...css.matchAll(/url\(['"]?(https:\/\/fonts\.gstatic\.com\/[^)'"\s]+)['"]?\)/g)].map(match => match[1]))];
export function assertTransport(row) {
  assert.deepEqual(row.blocked, [], 'No external HTTP attempts');
  assert.deepEqual(row.sockets, [], 'No WebSocket attempts');
}
function isEntry() {
  return process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
}

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
  console.log('Fonts1159 PASS: actual template CSS and all referenced declared-family woff2 bodies retained and mapped to local serving.');
}

async function main() {
  assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Remote-only worker');
  const root = process.cwd(), out = path.join(process.env.E, 'native');
  fs.mkdirSync(out, { recursive: true });
  const require = createRequire(path.join(root, 'package.json'));
  const { chromium } = require('playwright'), { build } = require('esbuild');
  const epoch = Date.UTC(2026, 0, 1, 12);
  const core = ['src/components/club-manager/CupBracketCard.tsx', 'src/lib/utils.ts'];
  const original = fs.readFileSync(path.join(process.env.BASE_ROOT, core[0]), 'utf8');
  let inverse = fs.readFileSync(path.join(root, core[0]), 'utf8');
  const pairs = [
    ["  const Line = onClubClick ? 'button' : 'div';\n", ''],
    ["    <Line\n      type={onClubClick ? 'button' : undefined}", '    <div'],
    ["onClubClick && 'w-full text-left cursor-pointer hover:bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'", "onClubClick && 'cursor-pointer hover:bg-secondary/50'"],
    ["    </Line>\n  );\n  if (!lands) return line;", "    </div>\n  );\n  if (!lands) return line;"],
  ];
  for (const [from, to] of pairs) { assert.equal(inverse.split(from).length, 2); inverse = inverse.replace(from, to); }
  assert.equal(inverse, original, 'Exact reviewed source inverse recreates the untouched parent');
  assert.equal(hash(fs.readFileSync(path.join(root, core[1]))), hash(fs.readFileSync(path.join(process.env.BASE_ROOT, core[1]))));
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
  save(path.join(out, 'partial-summary.json'), { executionComplete: false, results });
  const executable = chromium.executablePath();
  assert(executable.startsWith(process.env.PLAYWRIGHT_BROWSERS_PATH + path.sep));
  const browser = await chromium.launch({ headless: true, executablePath: executable });
  save(path.join(out, 'browser-runtime.json'), { version: browser.version(), executablePath: executable, executableSha256: hash(fs.readFileSync(executable)), privateCache: process.env.PLAYWRIGHT_BROWSERS_PATH });
  try {
    for (const [variant, sourceRoot] of [['candidate', root], ['base', process.env.BASE_ROOT]]) {
      const variantOut = path.join(out, variant), browserDir = path.join(variantOut, 'browser');
      fs.mkdirSync(browserDir, { recursive: true });
      const clientEntry = `import React from 'react';
import {createRoot} from 'react-dom/client';
import {BracketSide} from ${JSON.stringify(sourceRoot + '/src/components/club-manager/CupBracketCard.tsx')};
export function mount(fixture){
 const input=JSON.parse(JSON.stringify(fixture)); let calls=[],submits=0;
 const root=createRoot(document.getElementById('fixture-root'));
 const snapshot=()=>({fixture:JSON.parse(JSON.stringify(input)),calls:[...calls],submits});
 const publish=()=>{document.getElementById('callback-output').textContent=JSON.stringify(calls);};
 window.__bracket1159={snapshot,reset:()=>{calls=[];publish();}};
 root.render(<form onSubmit={e=>{e.preventDefault();submits++;}}>
  <button type="button" data-sentinel="before">Before bracket</button>
  <section data-bracket-board className="bg-card border border-border rounded-2xl p-3 space-y-2">
   {input.rows.map(row=><div key={row.id} data-bracket-row={row.id}><BracketSide {...row.props} onClubClick={input.interactive?name=>{calls.push(name);publish();}:undefined}/></div>)}
  </section>
  <button type="button" data-sentinel="after">After bracket</button>
  <output id="callback-output" data-callback-output>[]</output>
 </form>);
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
      fs.writeFileSync(path.join(variantOut, 'client-entry.jsx'), clientEntry);
      const clientFile = path.join(browserDir, 'fixture.js');
      const clientBuild = await build({ absWorkingDir: sourceRoot, stdin: { contents: clientEntry, sourcefile: '1159-client-entry.jsx', resolveDir: sourceRoot, loader: 'jsx' }, outfile: clientFile, bundle: true, platform: 'browser', format: 'esm', sourcemap: true, metafile: true, alias: { '@': path.join(sourceRoot, 'src') }, tsconfig: path.join(sourceRoot, 'tsconfig.app.json') });
      const clientBinding = bindBuild(clientBuild, clientFile, '1159-client-entry.jsx', clientEntry, core);
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
      const html = `<!doctype html><html class="dark"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/held-fonts.css">${css.map(c => `<link rel="stylesheet" href="${c.url}">`).join('')}</head><body class="bg-background text-foreground"><main id="fixture-root" class="mx-auto max-w-2xl p-4"></main><script type="module">import{mount}from'/fixture.js';mount(window.__bracketFixture);</script></body></html>`;
      fs.writeFileSync(path.join(browserDir, 'index.html'), html);
      save(path.join(variantOut, 'fixture-build.json'), { scope: 'Actual BracketSide direct component, not ClubManager route or save persistence', client: clientBinding, css, cssSelection, cssByteControl, fonts, htmlSha256: hash(Buffer.from(html)) });
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
      const plans = variant === 'candidate' ? [
        [320, 'enter-home'], [1280, 'enter-home'], [320, 'space-away'], [1280, 'space-away'],
        [320, 'pointer'], [1280, 'pointer'], [320, 'passive'], [1280, 'passive'],
      ] : [[320, 'keyboard-control'], [1280, 'keyboard-control']];
      for (const [width, action] of plans) {
        const name = `${variant}-${width}-${action}`, dir = path.join(out, name); fs.mkdirSync(dir);
        const pending = { round: 'QF', slot: 0, home: 'Northbank XI', away: 'Riverside XI', homeGoals: null, awayGoals: null, winner: null };
        const settled = { ...pending, slot: 1, homeGoals: 2, awayGoals: 1, winner: 'Northbank XI' };
        const fixture = { synthetic: 'Neutral test-owned labels and synthetic ties, no factual club results', interactive: action !== 'passive', rows: [
          { id: 'pending-home', props: { name: pending.home, tie: pending, isHome: true, clubName: pending.home } },
          { id: 'pending-away', props: { name: pending.away, tie: pending, isHome: false, clubName: pending.home } },
          { id: 'settled-home', props: { name: settled.home, tie: settled, isHome: true, clubName: settled.home, landing: true, delay: '0.1s' } },
          { id: 'settled-away', props: { name: settled.away, tie: settled, isHome: false, clubName: settled.home, landing: true, delay: '0.1s' } },
        ] };
        save(path.join(dir, 'fixture.json'), fixture);
        const row = { name, variant, width, action, fixtureSha256: hash(fs.readFileSync(path.join(dir, 'fixture.json'))), status: 'failed', pageErrors: [], localFailures: [], localRequests: [], blocked: [], sockets: [], checks: {} };
        let context, page;
        const snapshot = async stage => {
          const board = page.locator('[data-bracket-board]');
          const data = await board.evaluate(el => ({ html: el.outerHTML, text: el.innerText, rows: [...el.querySelectorAll('[data-bracket-row]')].map(node => {
            const line=node.querySelector('span').parentElement, spans=line.querySelectorAll('span'), r=line.getBoundingClientRect();
            const score=spans[1], wrapper=line.parentElement;
            return { id:node.dataset.bracketRow, tag:line.tagName, type:line.getAttribute('type'), tabIndex:line.tabIndex, className:line.className,
              name:spans[0].textContent, nameClass:spans[0].className, score:score.textContent, scoreClass:score.className,
              scoreStyle:score.getAttribute('style'), landed:score.getAttribute('data-cm-bracket-landed'),
              through:wrapper.getAttribute('data-cm-bracket-through'), wrapperClass:wrapper===node?null:wrapper.className, wrapperStyle:wrapper===node?null:wrapper.getAttribute('style'),
              text:line.textContent, focused:line===document.activeElement, geometry:{x:r.x,y:r.y,width:r.width,height:r.height} };
          }), geometry:{width:el.getBoundingClientRect().width,documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth},
          focus:{tag:document.activeElement?.tagName,sentinel:document.activeElement?.getAttribute('data-sentinel'),row:document.activeElement?.closest('[data-bracket-row]')?.getAttribute('data-bracket-row')??null} }));
          data.state=await page.evaluate(()=>window.__bracket1159.snapshot()); data.aria=await board.ariaSnapshot();
          save(path.join(dir,stage+'.json'),data); await board.screenshot({path:path.join(dir,stage+'.png')}); return data;
        };
        const assertHeldRows = data => {
          assert.deepEqual(data.state.fixture, fixture); assert.equal(data.state.submits, 0); assert.equal(data.rows.length, 4);
          for (let i=0;i<fixture.rows.length;i++) {
            const expected=fixture.rows[i], actual=data.rows[i], p=expected.props;
            assert.equal(actual.id,expected.id); assert.equal(actual.name,p.name); assert.equal(actual.score,String((p.isHome?p.tie.homeGoals:p.tie.awayGoals)??''));
            assert.equal(actual.landed,expected.id==='settled-home'?'QF-1':null);
            assert.equal(actual.through,expected.id==='settled-home'?'QF-1':null);
            assert.equal(actual.scoreStyle,expected.id==='settled-home'?'animation-delay: 0.1s;':null);
            assert.equal(actual.wrapperStyle,expected.id==='settled-home'?'animation-delay: 0.1s;':null);
            assert.equal(actual.scoreClass.includes('cm-slam'),expected.id==='settled-home');
            assert.equal(actual.className.includes('opacity-45'),expected.id==='settled-away');
            assert(actual.geometry.width>0&&actual.geometry.height>0); assert(actual.geometry.x>=0&&actual.geometry.x+actual.geometry.width<=width);
          }
          assert.equal(data.geometry.viewportWidth,width); assert(data.geometry.documentWidth<=width);
        };
        const buttonAt = async id => {
          const props=fixture.rows.find(r=>r.id===id).props, score=props.isHome?props.tie.homeGoals:props.tie.awayGoals;
          const expectedName=props.name+(score===null?'':' '+score);
          const button=page.locator(`[data-bracket-row="${id}"]`).getByRole('button',{name:expectedName,exact:true});
          assert.equal(await button.count(),1,'Exactly one native bracket action named '+expectedName); assert.equal(await button.getAttribute('type'),'button'); return button;
        };
        try {
          context=await browser.newContext({viewport:{width,height:900}});
          await context.routeWebSocket('**/*',socket=>{row.sockets.push(socket.url());socket.close();});
          await context.route('**/*',async route=>{const request=route.request(),url=request.url();if(!url.startsWith(origin+'/')){row.blocked.push({url,method:request.method()});await route.abort();return;}row.localRequests.push({url:new URL(url).pathname,method:request.method()});if(request.method()!=='GET'){row.localFailures.push({url,error:'Unexpected local write'});await route.abort();return;}await route.continue();});
          await context.addInitScript(input=>{window.__bracketFixture=input;},fixture);
          page=await context.newPage(); await page.clock.install({time:epoch-1000}); await page.clock.pauseAt(epoch);
          page.on('pageerror',error=>row.pageErrors.push({name:error.name,message:error.message,stack:error.stack}));
          page.on('requestfailed',request=>{if(request.url().startsWith(origin+'/'))row.localFailures.push({url:request.url(),error:request.failure()});});
          page.on('response',response=>{if(response.url().startsWith(origin+'/')&&response.status()>=400)row.localFailures.push({url:response.url(),status:response.status()});});
          await page.goto(origin,{waitUntil:'networkidle'}); await page.locator('[data-bracket-row="settled-away"]').waitFor();
          row.fonts=await page.evaluate(async()=>{await document.fonts.ready;const faces=[];for(const family of ['Inter','Space Grotesk'])for(const weight of [400,500,600,700]){const loaded=await document.fonts.load(`${weight} 16px "${family}"`,'Bracket');faces.push({family,weight,loaded:loaded.map(face=>({family:face.family,weight:face.weight,status:face.status}))});}return faces;});
          assert.equal(row.fonts.length,8); assert(row.fonts.every(r=>r.loaded.length&&r.loaded.every(f=>f.status==='loaded'&&f.family.replaceAll('"','')===r.family&&f.weight===String(r.weight))));
          row.before=await snapshot('before'); assertHeldRows(row.before); assert.deepEqual(row.before.state.calls,[]);
          const before=page.locator('[data-sentinel="before"]'), after=page.locator('[data-sentinel="after"]');
          if(action==='keyboard-control') {
            assert.equal(await page.locator('[data-bracket-board]').getByRole('button').count(),0);
            await page.locator('[data-bracket-row="pending-home"]').click(); await page.getByText('["Northbank XI"]',{exact:true}).waitFor({state:'attached'});
            row.pointerBaseline=await snapshot('pointer-baseline'); assertHeldRows(row.pointerBaseline); assert.deepEqual(row.pointerBaseline.state.calls,['Northbank XI']);
            await page.evaluate(()=>window.__bracket1159.reset()); await before.focus(); await page.keyboard.press('Tab');
            row.tab=await snapshot('tab'); assert.equal(row.tab.focus.sentinel,'after'); assert.equal(row.tab.focus.row,null);
            await page.keyboard.press('Enter'); await page.keyboard.press('Space'); row.after=await snapshot('after'); assertHeldRows(row.after); assert.deepEqual(row.after.state.calls,[]);
            let intended; try { assert.equal(row.tab.focus.row,'pending-home','Tab reaches the intended home bracket action'); } catch(error){intended=error;}
            assert(intended instanceof assert.AssertionError); assert.equal(intended.actual,null); assert.equal(intended.expected,'pending-home');
            row.intendedFailure={name:intended.name,message:intended.message,actual:intended.actual,expected:intended.expected};
            row.checks={pointerBaselinePassed:true,actualTabSkippedAllClubRows:true,actualEnterAndSpaceCouldNotActivateClub:true,intendedFocusAssertionFailed:true,callbackCount:0};
          } else if(action==='passive') {
            assert.equal(await page.locator('[data-bracket-board]').getByRole('button').count(),0);
            assert(row.before.rows.every(r=>r.tag==='DIV'&&r.type===null&&r.tabIndex===-1));
            await page.locator('[data-bracket-row="pending-home"]').click(); await page.locator('[data-bracket-row="settled-home"]').click();
            await before.focus(); await page.keyboard.press('Tab'); assert(await after.evaluate(el=>el===document.activeElement));
            await page.keyboard.press('Enter'); await page.keyboard.press('Space'); row.after=await snapshot('after'); assertHeldRows(row.after); assert.deepEqual(row.after.state,row.before.state);
            row.checks={passivePendingAndSettled:true,noButtonRoles:true,actualTabSkippedAllPassiveRows:true,pointerAndKeysNoCallback:true,completeFixtureUnchanged:true};
          } else {
            for(const entry of fixture.rows) await buttonAt(entry.id);
            if(action==='pointer') {
              await (await buttonAt('pending-away')).click(); await (await buttonAt('settled-home')).click();
              await page.getByText('["Riverside XI","Northbank XI"]',{exact:true}).waitFor({state:'attached'});
              row.after=await snapshot('after'); assertHeldRows(row.after); assert.deepEqual(row.after.state.calls,['Riverside XI','Northbank XI']);
              row.checks={actualPointerPendingAndLanding:true,exactOncePerRequestedClub:true,callbackCount:2,noFormSubmit:true};
            } else {
              const target=action==='enter-home'?'pending-home':'settled-away', tabs=action==='enter-home'?1:4;
              await before.focus(); row.tabPath=[];
              for(let i=0;i<tabs;i++){await page.keyboard.press('Tab');row.tabPath.push(await page.evaluate(()=>document.activeElement?.closest('[data-bracket-row]')?.getAttribute('data-bracket-row')??null));}
              const expectedPath=fixture.rows.slice(0,tabs).map(r=>r.id); assert.deepEqual(row.tabPath,expectedPath);
              const button=await buttonAt(target); assert(await button.evaluate(el=>el===document.activeElement));
              row.tab=await snapshot('tab'); const expectedClub=fixture.rows.find(r=>r.id===target).props.name;
              await page.keyboard.press(action==='enter-home'?'Enter':'Space'); await page.getByText(JSON.stringify([expectedClub]),{exact:true}).waitFor({state:'attached'});
              row.after=await snapshot('after'); assertHeldRows(row.after); assert.deepEqual(row.after.state.calls,[expectedClub]);
              row.checks={actualTab:true,key:action==='enter-home'?'Enter':'Space',target,expectedClub,callbackCount:1,noFormSubmit:true,fixtureRowsHeld:true};
            }
          }
          assertHeldRows(row.after); const requested=new Set(row.localRequests.filter(r=>r.method==='GET').map(r=>r.url));
          assert(requested.has('/fixture.js')); assert(requested.has('/held-fonts.css')); assert([...requested].some(url=>url.startsWith('/held-fonts/'))); for(const style of css)assert(requested.has(style.url));
          assertTransport(row); row.status='passed';
        } catch(error){row.error={name:error.name,message:error.message,stack:error.stack};}
        finally {
          if(context)try{await context.close();}catch(error){row.closeError=String(error);row.status='failed';}
          if(row.pageErrors.length||row.localFailures.length)row.status='failed';
          try { assertTransport(row); } catch(error) { row.transportError={name:error.name,message:error.message,actual:error.actual,expected:error.expected}; row.status='failed'; }
          save(path.join(dir,'result.json'),row);results.push(row);save(path.join(out,'partial-summary.json'),{executionComplete:false,results});
        }
      }
      assert(records.every(r=>!r.error)); for(const row of results.filter(r=>r.variant===variant))for(const request of row.localRequests)assert(records.some(r=>r.url===request.url&&r.method===request.method&&!r.error));
      variants.push({variant,clientBinding,servedRecords:records.length});
    }
    for(const width of [320,1280]) {
      const candidate=results.find(r=>r.name===`candidate-${width}-enter-home`),base=results.find(r=>r.name===`base-${width}-keyboard-control`); assert(candidate&&base&&candidate.before&&base.before);
      const visible=data=>data.rows.map(({tag,type,tabIndex,className,focused,...row})=>({...row,dimmed:className.includes('opacity-45')}));
      assert.deepEqual(visible(candidate.before),visible(base.before));assert.deepEqual(candidate.before.state,base.before.state);assert.deepEqual(candidate.before.geometry,base.before.geometry);
    }
    assert.equal(results.filter(r=>r.variant==='candidate').length,8);assert.equal(results.filter(r=>r.variant==='base').length,2);assert(results.every(r=>r.status==='passed'));
    const baselineName='candidate-320-enter-home', baselineFile=path.join(out,baselineName,'result.json');
    const baseline=JSON.parse(fs.readFileSync(baselineFile)); assert.equal(baseline.status,'passed'); assertTransport(baseline);
    const controls=[];
    for(const key of ['blocked','sockets']) {
      const controlled=JSON.parse(JSON.stringify(baseline));
      controlled[key]=key==='blocked'?[{url:'https://invalid.example/blocked-control',method:'GET'}]:['wss://invalid.example/socket-control'];
      assert.notDeepEqual(controlled,baseline,'The copied record actually changes its selected empty transport collection');
      assert.deepEqual({...controlled,[key]:baseline[key]},baseline,'Exactly the selected transport collection changes');
      let error; try { assertTransport(controlled); } catch(caught) { error=caught; }
      assert(error instanceof assert.AssertionError); assert.deepEqual(error.actual,controlled[key]); assert.deepEqual(error.expected,[]); assert.equal(error.operator,'deepStrictEqual');
      const intendedMessage=key==='blocked'?'No external HTTP attempts':'No WebSocket attempts'; assert(error.message.startsWith(intendedMessage));
      controls.push({key,controlled,intendedFailure:{name:error.name,message:error.message,actual:error.actual,expected:error.expected,operator:error.operator}});
    }
    save(path.join(out,'transport-controls.json'),{baselineName,baselineSha256:hash(fs.readFileSync(baselineFile)),baseline,controls,scope:'Effective copied-record validator checks, not actual external requests'});
  } finally {await browser.close();for(const server of servers)await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
  save(path.join(out,'summary.json'),{executionComplete:true,healthy:8,effectiveBaseControls:2,variants,results,scope:'Actual BracketSide direct component and callback outcomes; no whole ClubManager route, save, engine result or event.isTrusted claim'});
  console.log('Native1159 PASS: eight candidate component cases and two untouched-parent actual Tab controls, exact keyboard/pointer callbacks, passive rows and held scores/landing.');
}
if (isEntry()) (process.argv.includes('--prefetch-fonts-only')?prepareFonts():main()).catch(error=>{console.error(error);process.exitCode=1;});
NATIVE_WORKER
run syntax 30 bash -euo pipefail -c 'bash -n .rc/x/cm-bracket-keyboard-1159.sh; node --check "$E/native-worker.mjs"; printf "%s\n" "4fa44d2268c3ab8686f754d262f26deacc99064f5e65f769fea884499d570c96  $E/native-worker.mjs" | sha256sum -c -'
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
  git archive "$BASE_HEAD" -- src/components/club-manager/CupBracketCard.tsx src/lib/clubManager.ts src/lib/clubManagerSlots.ts src/components/club-manager/UclBracketCard.tsx src/lib/utils.ts src/components/club-manager/Celebration.tsx src/components/club-manager/CelebrationStyles.tsx src/index.css > "$E/base-core-source.tar"
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
const {assertTransport}=await import((await import('node:url')).pathToFileURL(process.env.E+'/native-worker.mjs').href);
const summary=read(out+'/summary.json');
const expected=['candidate-320-enter-home','candidate-1280-enter-home','candidate-320-space-away','candidate-1280-space-away','candidate-320-pointer','candidate-1280-pointer','candidate-320-passive','candidate-1280-passive','base-320-keyboard-control','base-1280-keyboard-control'];
assert.equal(summary.executionComplete,true); assert.equal(summary.healthy,8); assert.equal(summary.effectiveBaseControls,2);
assert.deepEqual(summary.results.map(r=>r.name),expected);
for(const variant of ['candidate','base']) {
  const dir=out+'/'+variant, proof=read(dir+'/fixture-build.json'), served=read(dir+'/served.json');
  for(const [kind,binding] of [['client',proof.client]]) {
    assert.equal(digest(fs.readFileSync(binding.js)),binding.jsSha256); assert.equal(digest(fs.readFileSync(binding.map)),binding.mapSha256);
    const map=read(binding.map), meta=read(binding.js+'.metafile.json');
    assert.equal(Object.keys(meta.inputs).length,binding.inputRows.length); assert.equal(map.sources.length,map.sourcesContent.length);
    for(const input of binding.inputRows) {
      const bytes=fs.readFileSync(input.virtual ? dir+'/client-entry.jsx' : input.file);
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
    assert.deepEqual(binding.requiredCore,['src/components/club-manager/CupBracketCard.tsx','src/lib/utils.ts']);
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
    assert.deepEqual(row.pageErrors,[]);assert.deepEqual(row.localFailures,[]);assert(!row.closeError);assertTransport(row);assert(!row.transportError);
    const fixture=read(out+'/'+row.name+'/fixture.json');assert.equal(digest(fs.readFileSync(out+'/'+row.name+'/fixture.json')),row.fixtureSha256);
    assert.equal(fixture.interactive,row.action!=='passive');assert.equal(fixture.rows.length,4);
    const captures=['before','after',...(row.tab?['tab']:[]),...(row.pointerBaseline?['pointer-baseline']:[])];
    for(const stage of captures) {
      const data=row[stage==='pointer-baseline'?'pointerBaseline':stage];assert.deepEqual(data,read(out+'/'+row.name+'/'+stage+'.json'));
      const image=fs.readFileSync(out+'/'+row.name+'/'+stage+'.png');assert(image.length>8);assert.equal(image.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
      assert.deepEqual(data.state.fixture,fixture);assert.equal(data.state.submits,0);assert.equal(data.rows.length,4);
      assert.equal(data.geometry.viewportWidth,row.width);assert(data.geometry.documentWidth<=row.width);
      for(let i=0;i<4;i++) {
        const actual=data.rows[i],input=fixture.rows[i],p=input.props;
        assert.equal(actual.id,input.id);assert.equal(actual.name,p.name);assert.equal(actual.score,String((p.isHome?p.tie.homeGoals:p.tie.awayGoals)??''));
        const lands=input.id==='settled-home';assert.equal(actual.landed,lands?'QF-1':null);assert.equal(actual.through,lands?'QF-1':null);
        assert.equal(actual.scoreStyle,lands?'animation-delay: 0.1s;':null);assert.equal(actual.wrapperStyle,lands?'animation-delay: 0.1s;':null);
        assert.equal(actual.scoreClass.includes('cm-slam'),lands);assert.equal(actual.className.includes('opacity-45'),input.id==='settled-away');
        assert.equal(actual.tag,variant==='candidate'&&fixture.interactive?'BUTTON':'DIV');assert.equal(actual.type,actual.tag==='BUTTON'?'button':null);
        assert(actual.geometry.width>0&&actual.geometry.height>0&&actual.geometry.x>=0&&actual.geometry.x+actual.geometry.width<=row.width);
      }
    }
    assert.deepEqual(row.before.state.calls,[]);
    assert.equal(row.fonts.length,8);assert(row.fonts.every(r=>r.loaded.length&&r.loaded.every(f=>f.status==='loaded'&&f.family.replaceAll('"','')===r.family&&f.weight===String(r.weight))));
    assert(row.localRequests.some(r=>r.url==='/fixture.js'&&r.method==='GET'));assert(row.localRequests.some(r=>r.url==='/held-fonts.css'&&r.method==='GET'));assert(row.localRequests.some(r=>r.url.startsWith('/held-fonts/')&&r.method==='GET'));
    for(const css of proof.css)assert(row.localRequests.some(r=>r.url===css.url&&r.method==='GET'));
    for(const request of row.localRequests)assert(served.some(r=>r.url===request.url&&r.method===request.method));
    const jsResponse=served.filter(r=>r.url==='/fixture.js');assert(jsResponse.length>0);assert(jsResponse.every(r=>r.sha256===proof.client.jsSha256));
    if(row.action==='keyboard-control') {
      assert.deepEqual(row.pointerBaseline.state.calls,['Northbank XI']);assert.equal(row.tab.focus.sentinel,'after');assert.equal(row.tab.focus.row,null);assert.deepEqual(row.after.state.calls,[]);
      assert.equal(row.intendedFailure.name,'AssertionError');assert.equal(row.intendedFailure.actual,null);assert.equal(row.intendedFailure.expected,'pending-home');assert(row.intendedFailure.message.includes('Tab reaches the intended home bracket action'));
      assert.deepEqual(row.checks,{pointerBaselinePassed:true,actualTabSkippedAllClubRows:true,actualEnterAndSpaceCouldNotActivateClub:true,intendedFocusAssertionFailed:true,callbackCount:0});
    } else if(row.action==='passive') {
      assert.deepEqual(row.after.state,row.before.state);assert.equal(row.after.focus.sentinel,'after');assert(row.before.rows.every(r=>r.tag==='DIV'&&r.type===null&&r.tabIndex===-1));
      assert.deepEqual(row.checks,{passivePendingAndSettled:true,noButtonRoles:true,actualTabSkippedAllPassiveRows:true,pointerAndKeysNoCallback:true,completeFixtureUnchanged:true});
    } else if(row.action==='pointer') {
      assert.deepEqual(row.after.state.calls,['Riverside XI','Northbank XI']);assert.deepEqual(row.checks,{actualPointerPendingAndLanding:true,exactOncePerRequestedClub:true,callbackCount:2,noFormSubmit:true});
    } else {
      const enter=row.action==='enter-home',target=enter?'pending-home':'settled-away',club=enter?'Northbank XI':'Riverside XI';
      assert.deepEqual(row.tabPath,fixture.rows.slice(0,enter?1:4).map(r=>r.id));assert.equal(row.tab.focus.row,target);assert.equal(row.tab.focus.tag,'BUTTON');assert.deepEqual(row.after.state.calls,[club]);
      assert.deepEqual(row.checks,{actualTab:true,key:enter?'Enter':'Space',target,expectedClub:club,callbackCount:1,noFormSubmit:true,fixtureRowsHeld:true});
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
const required=['src/components/club-manager/CupBracketCard.tsx','src/lib/utils.ts'], seen=new Set();
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
for(const width of [320,1280]) {
  const candidate=summary.results.find(r=>r.name===`candidate-${width}-enter-home`),base=summary.results.find(r=>r.name===`base-${width}-keyboard-control`);
  const visible=data=>data.rows.map(({tag,type,tabIndex,className,focused,...row})=>({...row,dimmed:className.includes('opacity-45')}));
  assert.deepEqual(visible(candidate.before),visible(base.before));assert.deepEqual(candidate.before.state,base.before.state);assert.deepEqual(candidate.before.geometry,base.before.geometry);
}
const transport=read(out+'/transport-controls.json');
assert.equal(transport.baselineName,'candidate-320-enter-home');
assert.equal(transport.baselineSha256,digest(fs.readFileSync(out+'/'+transport.baselineName+'/result.json')));
assert.deepEqual(transport.baseline,read(out+'/'+transport.baselineName+'/result.json'));assert.equal(transport.baseline.status,'passed');assertTransport(transport.baseline);
assert.deepEqual(transport.controls.map(r=>r.key),['blocked','sockets']);
for(const control of transport.controls) {
  const selected=control.key==='blocked'?[{url:'https://invalid.example/blocked-control',method:'GET'}]:['wss://invalid.example/socket-control'];
  assert.deepEqual(control.controlled[control.key],selected);assert.notDeepEqual(control.controlled,transport.baseline);
  assert.deepEqual({...control.controlled,[control.key]:transport.baseline[control.key]},transport.baseline);
  let error;try{assertTransport(control.controlled);}catch(caught){error=caught;}
  assert(error instanceof assert.AssertionError);assert.deepEqual(control.intendedFailure,{name:error.name,message:error.message,actual:error.actual,expected:error.expected,operator:error.operator});
  assert.deepEqual(error.actual,selected);assert.deepEqual(error.expected,[]);assert.equal(error.operator,'deepStrictEqual');
  assert(error.message.startsWith(control.key==='blocked'?'No external HTTP attempts':'No WebSocket attempts'));
}
console.log('All ten exact actual bracket rows, real keyboard and pointer callbacks, passive/parent controls, fonts, input/maps and served payload hashes are retained.');
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
  find "$WORK/browser/node_modules" -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dependencies/browser-close.sha256"; cmp "$E/dependencies/browser.sha256" "$E/dependencies/browser-close.sha256"
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
