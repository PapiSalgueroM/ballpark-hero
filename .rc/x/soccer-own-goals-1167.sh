#!/usr/bin/env bash
# Remote-only Soccer Career own-goal metadata, measured exposure and actual viewer proof. No application edits.
set -uo pipefail
test "${GITHUB_ACTIONS:-}" = true || exit 2
test -n "${RC_OUT:-}" && test -n "${RUNNER_TEMP:-}" || exit 2
BASE_HEAD=68064f38c0a69b5d3903241e435c8706571f9878
CHECKED_HEAD=e5d9cdc7b7544e02a4002182556c01c5bfebf6c4
CHECKED_TREE=bcd3e74f5cc81ed04d19bc74f7f3a1d7471a0a3a
REQUEST_HEAD=$(git rev-parse HEAD)
WORK=$(mktemp -d "$RUNNER_TEMP/own-goals-1167.XXXXXX") || exit 2
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
  archive="$WORK/soccer-own-goals-1167-evidence.tar.xz"
  timeout -k 10 180 tar -c -I "xz -T2 -8" -f "$archive" -C "$E" .; packed=$?
  bytes=$(stat -c %s "$archive" 2>/dev/null || echo unavailable)
  if test "$packed" = 0 && test "$bytes" -le 24000000; then
    timeout -k 10 30 cp "$archive" "$RC_OUT/soccer-own-goals-1167-evidence.tar.xz" || failed=1
    timeout -k 10 20 sha256sum "$RC_OUT/soccer-own-goals-1167-evidence.tar.xz" > "$RC_OUT/evidence.sha256" || failed=1
    printf 'checked=%s\nrequest=%s\nbytes=%s\nfailed=%s\nexecution_complete=%s\nending=%s\n' "$CHECKED_HEAD" "$REQUEST_HEAD" "$bytes" "$failed" "$execution_complete" "$ending" > "$RC_OUT/receipt.txt" || failed=1
  else
    printf 'EVIDENCE CAP FAILURE: pack_exit=%s bytes=%s limit=24000000; full payload retained only at runner path %s, no truncated evidence accepted.\n' "$packed" "$bytes" "$archive" | tee "$RC_OUT/EVIDENCE-CAP-FAILURE.txt"
    failed=1
  fi
  printf 'Soccer own-goals1167 strict label: failed=%s, complete=%s, source=%s, request=%s.\n' "$failed" "$execution_complete" "$CHECKED_HEAD" "$REQUEST_HEAD"
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
  printf "%s\n" .github/workflows/lane-remote-check.yml .rc/request.txt .rc/run.sh .rc/x/soccer-own-goals-1167.sh | LC_ALL=C sort > "$E/allowed-overlay.txt"
  git diff --name-only --no-renames "$CHECKED_HEAD" HEAD | LC_ALL=C sort > "$E/actual-overlay.txt"
  cmp "$E/allowed-overlay.txt" "$E/actual-overlay.txt"
  printf "%s\n" "ab384139f68e2a8fee3dfd8dc3abc38958cfb96fc54876f2bf5b63d5df41b276  .rc/request.txt" "668aeb520674d130f1af2e88494775afff6b8055d9911c715a8b646056b4b62f  .rc/run.sh" "447a4eca8616f708831ec5e6b7bf90ba68afc606054c0e0d0b27b4cb84abec20  .github/workflows/lane-remote-check.yml" > "$E/reviewed-kit.sha256"
  sha256sum -c "$E/reviewed-kit.sha256"
  sha256sum .rc/x/soccer-own-goals-1167.sh > "$E/dispatched-shell.sha256"
  printf "%s\n" "7a467f4c87bf97d7a92a368fccad9b4f221c6d1fc5d1f7a4397ee864c27794ef  src/lib/season/core.ts" "01a5ee13ee0d9d51f30728870ab1257dcf59e3f3fce4582a3aaa3f51e67a5b1f  src/lib/season/soccerEvents.ts" "5c6f16c1e1458dbbe554ce925663293c301ebbac8431f39411ed10751e456911  src/components/soccer-career/SoccerSeasonCentre.tsx" "f86adbd3879c0d3e89589a18810538b351c40d983d97cf491f36820ac8721716  scripts/simSoccerOwnGoals.mjs" > "$E/reviewed-source.sha256"
  sha256sum -c "$E/reviewed-source.sha256"
  printf "%s\n" docs/PROJECT-STATE.md src/lib/season/core.ts src/lib/season/soccerEvents.ts src/components/soccer-career/SoccerSeasonCentre.tsx scripts/simSoccerOwnGoals.mjs | LC_ALL=C sort > "$E/allowed-candidate.txt"
  git diff --name-only --no-renames "$BASE_HEAD" "$CHECKED_HEAD" | LC_ALL=C sort > "$E/actual-candidate.txt"
  cmp "$E/allowed-candidate.txt" "$E/actual-candidate.txt"
  git rev-parse HEAD HEAD^ "HEAD^{tree}" > "$E/identity.txt"
  git ls-tree -r HEAD > "$E/git-runtime-manifest.txt"
  git ls-tree -r "$CHECKED_HEAD" > "$E/git-checked-manifest.txt"
  git ls-tree -r "$BASE_HEAD" > "$E/git-base-manifest.txt"
  git ls-files -z > "$E/runtime-paths.nul"
  git ls-files -z | sort -z | xargs -0 sha256sum > "$E/source-before.sha256"
  git diff "$BASE_HEAD" "$CHECKED_HEAD" -- src/lib/season/core.ts src/lib/season/soccerEvents.ts src/components/soccer-career/SoccerSeasonCentre.tsx scripts/simSoccerOwnGoals.mjs > "$E/component-only.diff"
  command -v xz; xz --version
  selected=(
    src/components/soccer-career/SoccerSeasonCentre.tsx
    src/components/season-centre/SeasonCentre.tsx
    src/components/season-centre/MatchClock.tsx
    src/components/season-centre/SeasonCentreHelp.tsx
    src/components/soccer-career/useSoccerMoments.tsx
    src/lib/season/core.ts
    src/lib/season/soccer.ts
    src/lib/season/soccerEvents.ts
    src/lib/season/soccerMoments.ts
    src/lib/season/momentsSave.ts
    src/lib/keyedRng.ts
    src/lib/soccerCareerSave.ts
    src/lib/soccerCareerEngine.ts
    src/lib/safeStorage.ts
    src/lib/utils.ts
    src/hooks/useRevealScroll.ts
    src/index.css
    package.json
    package-lock.json
    vite.config.ts
    tsconfig.json
    tsconfig.app.json
    tsconfig.node.json
    tailwind.config.ts
    postcss.config.js
    index.html
    scripts/runAllSims.mjs
    scripts/simAdsense.mjs
    scripts/simBrand.mjs
    scripts/simHeadTags.mjs
    scripts/simHiddenPages.mjs
    scripts/simHubs.mjs
    scripts/simIndexNow.mjs
    scripts/simIndexing.mjs
    scripts/simInternalLinks.mjs
    scripts/simNoRivalNames.mjs
    scripts/simPrerender.mjs
    scripts/simPrerenderBoot.mjs
    scripts/simRetiredRoutes.mjs
    scripts/simSchema.mjs
    scripts/simSitemap.mjs
    scripts/simSnapshotAssets.mjs
    scripts/lib/offlineTransport.cjs
    scripts/lib/atomicWrite.mjs
    scripts/lib/retiredRoutes.mjs
    scripts/lib/playwrightLoader.mjs
    scripts/genHiddenStubs.mjs
    scripts/genRetiredStubs.mjs
    scripts/genSeoMetaParts.mjs
    scripts/logo/gen_logo.py
    src/App.tsx
    src/pages/SoccerCareer.tsx
    src/data/gameRegistry.ts
    scripts/data/lastmod.json
    scripts/simSoccerOwnGoals.mjs
    scripts/simSeasonCentreAgreement.mjs
    scripts/simSeasonMoments.mjs
    scripts/lib/careerAwardsNightProbe.mjs
    scripts/lib/careerAwardsNightBundle.mjs
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
  console.log('Fonts1167 PASS: actual template CSS and all referenced declared-family woff2 bodies retained and mapped to local serving.');
}


async function main() {
  assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Remote-only viewer');
  const root=process.cwd(), parent=process.env.PARENT, evidence=process.env.E;
  for (const value of [parent,evidence,process.env.WORK,process.env.OWN_GOAL_UI_FIXTURES]) assert(value, 'Required remote paths');
  const out=path.join(evidence,'viewer');fs.mkdirSync(out,{recursive:true});
  const browserTemp=path.join(process.env.WORK,'t');fs.mkdirSync(browserTemp,{recursive:true});for(const name of ['TMPDIR','TEMP','TMP'])process.env[name]=browserTemp;
  const require=createRequire(path.join(root,'package.json'));
  const {chromium}=require('playwright'),{build}=require('esbuild');
  const builtIndex=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
  const cssRefs=[...builtIndex.matchAll(/<link\b[^>]*>/g)].filter(m=>/\brel=["']stylesheet["']/.test(m[0])).map(m=>m[0].match(/\bhref=["']([^"']+)["']/)?.[1]).filter(h=>h?.startsWith('/assets/')&&h.endsWith('.css'));
  assert.equal(cssRefs.length,1,'One actual built entry application stylesheet');
  const appCss=fs.readFileSync(path.join(root,'dist',cssRefs[0].slice(1)));const assertCssBytes=bytes=>assert(bytes.length>0,'Actual built application CSS has a positive body');assertCssBytes(appCss);
  const emptyCss=Buffer.alloc(0);fs.writeFileSync(path.join(out,'empty-css-control.css'),emptyCss);assert.notEqual(hash(emptyCss),hash(appCss),'Copied empty CSS changes actual selected body');
  let emptyCssFailure;try{assertCssBytes(emptyCss);}catch(error){emptyCssFailure=error;}assert(emptyCssFailure instanceof assert.AssertionError);assert.equal(emptyCssFailure.message,'Actual built application CSS has a positive body');
  save(path.join(out,'css-byte-control.json'),{baselineBytes:appCss.length,baselineSha256:hash(appCss),controlledFile:'empty-css-control.css',controlledBytes:0,controlledSha256:hash(emptyCss),effective:true,intendedFailure:{name:emptyCssFailure.name,message:emptyCssFailure.message,actual:emptyCssFailure.actual,expected:emptyCssFailure.expected}});fs.writeFileSync(path.join(out,'actual-built-index.html'),builtIndex);
  for(const rel of ['src/index.css','tailwind.config.ts','postcss.config.js']) assert.equal(hash(fs.readFileSync(path.join(root,rel))),hash(fs.readFileSync(path.join(parent,rel))),'Parent style sources held '+rel);
  fs.writeFileSync(path.join(out,'actual-app.css'),appCss);
  const fonts=JSON.parse(fs.readFileSync(path.join(fontDir,'manifest.json'),'utf8'));
  const fontCss=fs.readFileSync(path.join(fontDir,'local.css'));
  assert.equal(fonts.fontSheet,fontSheet);assert.equal(fonts.fontAgent,fontAgent);assert.equal(fonts.templateSha256,hash(fs.readFileSync(path.join(root,'index.html'))));
  const originalFontCss=fs.readFileSync(path.join(fontDir,fonts.entries[0].file),'utf8'),declared=validateFontCss(originalFontCss);
  assert.deepEqual(fonts.declared,declared);assert.equal(fonts.entries[0].url,fontSheet);assert.deepEqual(declared.urls,fonts.entries.slice(1).map(e=>e.url));
  let rewritten=originalFontCss;
  for(const entry of fonts.entries){const bytes=fs.readFileSync(path.join(fontDir,entry.file));assert.equal(bytes.length,entry.bytes);assert.equal(hash(bytes),entry.sha256);assert.equal(entry.status,200);assert.equal(entry.file,hash(Buffer.from(entry.url)));if(entry.url!==fontSheet)rewritten=rewritten.replaceAll(entry.url,'/held-fonts/'+entry.file);}
  assert.equal(rewritten,fontCss.toString('utf8'));assert.equal(hash(Buffer.from(originalFontCss)),fonts.originalSha256);assert.equal(hash(fontCss),fonts.localSha256);assert.equal(fontCss.length,fonts.localBytes);

  const roles=['you','teammate','opponent'];
  const fixtures=new Map(roles.map(role=>{
    const bytes=fs.readFileSync(path.join(process.env.OWN_GOAL_UI_FIXTURES,role+'.json'));
    const fixture=JSON.parse(bytes);
    assert.equal(fixture.event.ownGoalBy,role,'Naturally observed UI role');
    assert.equal(fixture.marked.games[fixture.md-1].events.filter(e=>e.kind==='goal'&&e.ownGoalBy===role).length>0,true,'Role exists in actual measured classifier output');
    return[role,{bytes,fixture}];
  }));
  const bundles={},assets=[],served=[],maps=[];
  for(const [arm,source] of [['candidate',root],['parent',parent]]) {
    const dir=path.join(process.env.WORK,'viewer-'+arm);fs.mkdirSync(dir,{recursive:true});
    const sourceRoot=source,variantOut=path.join(out,arm+'-providers');fs.mkdirSync(variantOut,{recursive:true});
    const entry=path.join(dir,'entry.tsx'),bundle=path.join(out,arm+'-bundle.js');
    const R=source.replaceAll('\\','/');
    const entryText=
      'import "'+R+'/src/lib/safeStorage";\n'+
      'import React from "react";\nimport {createRoot} from "react-dom/client";\n'+
      'import SoccerSeasonCentre from "'+R+'/src/components/soccer-career/SoccerSeasonCentre";\n'+
      'const fixture=await(await fetch("./fixture.json")).json();\n'+
      'window.__ogInitial=JSON.stringify(fixture);window.__ogFixture=fixture;window.__ogClose=0;\n'+
      'createRoot(document.getElementById("root")).render(<SoccerSeasonCentre career={fixture.career} clubs={fixture.clubs} row={fixture.row} mode="watch" onClose={()=>window.__ogClose++}/>);\n';
    fs.writeFileSync(entry,entryText);
    const result=await build({entryPoints:[entry],bundle:true,format:'esm',platform:'browser',jsx:'automatic',alias:{'@':R+'/src'},nodePaths:[path.join(root,'node_modules')],absWorkingDir:source,
      define:{'process.env.NODE_ENV':'"production"'},loader:{'.css':'css','.module.css':'local-css','.png':'empty','.svg':'empty','.jpg':'empty','.webp':'empty'},
      sourcemap:true,sourcesContent:true,metafile:true,outfile:bundle,logLevel:'error'});
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
        assert.equal(inputRows.filter(row => row.virtual).length, 0, 'Every viewer input is a regular original body');
        assert.equal(inputRows.filter(row=>row.file===fs.realpathSync(entry)&&row.sha256===hash(Buffer.from(entryText))).length,1,'Exact physical retained viewer entry consumed');
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

    const binding=bindBuild(result,bundle,undefined,undefined,['src/components/soccer-career/SoccerSeasonCentre.tsx','src/components/season-centre/SeasonCentre.tsx','src/components/season-centre/MatchClock.tsx','src/components/season-centre/SeasonCentreHelp.tsx','src/components/soccer-career/useSoccerMoments.tsx','src/lib/season/core.ts','src/lib/season/soccer.ts','src/lib/season/soccerEvents.ts']);
    const rawMap=fs.readFileSync(bundle+'.map'),map=JSON.parse(rawMap);
    assert.equal(map.sources.length,map.sourcesContent.length,'Complete original source providers');
    const bodies=map.sources.map((rel,i)=>{
      const file=binding.bindings[i].file,original=Buffer.from(map.sourcesContent[i]);
      assert.equal(hash(original),binding.bindings[i].sha256,'Emitted content matches qualified consumed-input or consumed-provider-map original '+rel);
      const target=path.join(out,arm+'-source-'+i+'.txt');fs.writeFileSync(target,original);
      return{source:file,evidenceFile:path.basename(target),bytes:original.length,sha256:hash(original),binding:binding.bindings[i]};
    });
    assert(bodies.some(x=>x.source===path.join(source,'src/components/soccer-career/SoccerSeasonCentre.tsx')),'Actual unmodified default component consumed');
    fs.writeFileSync(path.join(out,arm+'-bundle.js'),fs.readFileSync(bundle));
    fs.writeFileSync(path.join(out,arm+'-bundle.js.map'),rawMap);
    fs.writeFileSync(path.join(out,arm+'-entry.tsx'),entryText);
    save(path.join(out,arm+'-metafile.json'),result.metafile);
    maps.push({arm,source,bodies,binding,entrySha256:hash(Buffer.from(entryText)),bundleSha256:hash(fs.readFileSync(bundle)),mapSha256:hash(rawMap)});
    bundles[arm]=fs.readFileSync(bundle);
  }
  const html=Buffer.from('<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/fonts.css"></head><body><div id="root"></div><script type="module" src="./bundle.js"></script></body></html>');
  const server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://127.0.0.1'),bits=url.pathname.split('/').filter(Boolean);let bytes,type;
    if(url.pathname==='/styles.css'){bytes=appCss;type='text/css';}
    else if(url.pathname==='/fonts.css'){bytes=fontCss;type='text/css';}
    else if(bits[0]==='held-fonts'&&bits.length===2){const f=fonts.entries.find(e=>e.file===bits[1]);if(f){bytes=fs.readFileSync(path.join(fontDir,f.file));type=f.contentType;}}
    else if(['candidate','parent'].includes(bits[0])&&roles.includes(bits[1])){
      if(bits.length===2){bytes=html;type='text/html';}
      else if(bits[2]==='bundle.js'){bytes=bundles[bits[0]];type='text/javascript';}
      else if(bits[2]==='fixture.json'){bytes=fixtures.get(bits[1]).bytes;type='application/json';}
    }
    if(!bytes){res.writeHead(404);res.end('missing');return;}
    served.push({method:req.method,url:req.url,status:200,bytes:bytes.length,sha256:hash(bytes),contentType:type});
    res.writeHead(200,{'content-type':type,'content-length':bytes.length});res.end(bytes);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
  const executable=chromium.executablePath();assert(process.env.PLAYWRIGHT_BROWSERS_PATH);assert(executable.startsWith(process.env.PLAYWRIGHT_BROWSERS_PATH+path.sep),'Actual executable is inside held private browser cache');
  const runtime={executablePath:executable,executableSha256:hash(fs.readFileSync(executable)),privateCache:process.env.PLAYWRIGHT_BROWSERS_PATH,temp:{directory:browserTemp,TMPDIR:process.env.TMPDIR,TEMP:process.env.TEMP,TMP:process.env.TMP}};
  save(path.join(out,'browser-runtime.json'),runtime);
  const browser=await chromium.launch({headless:true,executablePath:executable});save(path.join(out,'browser-runtime.json'),{...runtime,version:browser.version()});
  const rows=[],controls=[];save(path.join(out,'partial.json'),{complete:false,maps,rows,controls});
  const words=(e,us,them)=>{
    if(e.kind==='goal'){
      if(e.ownGoalBy==='you')return'⚽ You (O.G), goal for '+them;
      if(e.ownGoalBy==='teammate')return'⚽ A teammate (O.G), goal for '+them;
      if(e.ownGoalBy==='opponent')return'⚽ An opponent (O.G), goal for '+us;
      return e.side==='us'?(e.mine?'⚽ You score!':'⚽ Goal, '+us):'⚽ Goal, '+them;
    }
    return{assist:'🅰️ You set it up',yellow:'🟨 You go in the book',red:'🟥 Sent off',injury:'🚑 You go off injured',on:'🔁 You come on',off:'🔁 You come off'}[e.kind];
  };
  try{
    for(const width of [390,1280])for(const role of roles)for(const arm of ['candidate','parent']){
      const {fixture}=fixtures.get(role),context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage();
      const blocked=[],sockets=[],errors=[],responses=[],localFailures=[];
      await context.routeWebSocket('**/*',socket=>{sockets.push(socket.url());socket.close();});
      page.on('requestfailed',r=>{if(r.url().startsWith(origin+'/'))localFailures.push({url:r.url(),error:r.failure()});});
      page.on('pageerror',e=>errors.push(String(e)));page.on('websocket',s=>sockets.push(s.url()));
      await page.route('**/*',route=>{const u=route.request().url();if(u.startsWith(origin+'/')&&route.request().method()==='GET')return route.continue();blocked.push(u);return route.abort();});
      page.on('response',response=>{responses.push({url:response.url(),status:response.status()});});
      const clicks=[];
      await page.goto(origin+'/'+arm+'/'+role+'/',{waitUntil:'networkidle'});
      await page.locator('[data-season-help]').waitFor();
      const help=await page.locator('[data-season-help]').innerText();
      if(arm==='candidate')assert(help.includes('(O.G)'),'Reopenable worked own-goal example');
      await page.getByRole('button',{name:'Got it',exact:true}).click();clicks.push('Got it');
      await page.getByRole('button',{name:'▶ Kick off',exact:true}).click();clicks.push('Kick off');
      for(let guard=0;guard<fixture.md*3+4;guard++){
        const matchday=page.locator('[data-matchday]');const shown=await matchday.count()?await matchday.getAttribute('data-matchday'):null;
        if(Number(shown)===fixture.md)break;
        const next=page.locator('[data-centre-bar]').getByRole('button',{name:/^▶ (Matchday|League game) \d+$/});
        await next.waitFor();clicks.push(await next.innerText());await next.click();
      }
      assert.equal(Number(await page.locator('[data-matchday]').getAttribute('data-matchday')),fixture.md,'Reached actual target through native controls');
      await page.locator('[data-full-time]').waitFor();
      const loadedFontPairs=await page.evaluate(async()=>{await document.fonts.ready;const pairs=[];for(const family of ['Inter','Space Grotesk'])for(const weight of [400,500,600,700]){const loaded=await document.fonts.load(weight+' 16px "'+family+'"','Own goal fixture');pairs.push({family,weight,loaded:loaded.map(face=>({family:face.family,weight:face.weight,status:face.status}))});}return pairs;});
      assert.equal(loadedFontPairs.length,8);assert(loadedFontPairs.every(p=>p.loaded.length&&p.loaded.every(f=>f.status==='loaded'&&f.family.replaceAll('"','')===p.family&&f.weight===String(p.weight))),'Every actual requested family/weight is loaded');
      const expectedSeason=arm==='candidate'?fixture.marked:fixture.derived,game=expectedSeason.games[fixture.md-1],us=fixture.row.club,them=expectedSeason.labels[game.opp].named?expectedSeason.labels[game.opp].name:'another club';
      const expected=game.events.map(e=>({minute:e.min+"'",body:words(e,us,them)}));
      const actual=await page.locator('[data-clock-events] li').evaluateAll(items=>items.map(li=>({minute:li.children[0].textContent,body:li.children[1].textContent})));
      assert.deepEqual(actual,expected,'Full actual event feed matches event ownership oracle');
      assert.equal(await page.locator('[data-match-clock]').getAttribute('data-score'),game.us+'-'+game.them,'Same actual goal beneficiary score');
      const marker='⚽ '+({you:'You',teammate:'A teammate',opponent:'An opponent'}[role])+' (O.G), goal for '+(role==='opponent'?us:them);
      const count=actual.filter(e=>e.body===marker).length;
      const assertMarker=()=>assert.equal(count,fixture.marked.games[fixture.md-1].events.filter(e=>e.kind==='goal'&&e.ownGoalBy===role).length,'Exact requested own-goal marker count');
      if(arm==='candidate')assertMarker();
      else{
        let failure;try{assertMarker();}catch(e){failure=e;}
        assert(failure instanceof assert.AssertionError);assert.equal(failure.actual,0);assert.equal(failure.expected,fixture.marked.games[fixture.md-1].events.filter(e=>e.kind==='goal'&&e.ownGoalBy===role).length);assert(failure.expected>0);
        controls.push({width,role,kind:'actual-parent-missing-marker',effective:true,actual:failure.actual,expected:failure.expected,message:failure.message});
      }
      if(arm==='candidate')await page.locator('[data-clock-events] li').filter({hasText:marker}).first().scrollIntoViewIfNeeded();
      const snapshot=await page.evaluate(()=>({
        feed:document.querySelector('[data-clock-events]').outerHTML,
        score:document.querySelector('[data-match-clock]').getAttribute('data-score'),
        line:document.querySelector('[data-his-line]')?.textContent??null,
        table:document.querySelector('[data-centre-table]')?.textContent??null,
        soFar:document.querySelector('[data-so-far-desktop]')?.textContent??document.querySelector('[data-so-far]')?.textContent??null,
        fixtureHeld:JSON.stringify(window.__ogFixture)===window.__ogInitial,
        pageScroll:{x:window.scrollX,y:window.scrollY},
        documentWidth:document.documentElement.scrollWidth,viewport:innerWidth,
        loadedFonts:[...document.fonts].filter(f=>f.status==='loaded').map(f=>({family:f.family,weight:f.weight,status:f.status})),
        bodyFont:getComputedStyle(document.body).fontFamily
      }));
      assert(snapshot.fixtureHeld,'Full input career/row/ledger held by read-only visit');assert.equal(snapshot.documentWidth,width,'No document horizontal overflow');
      assertTransport({blocked,sockets});assert.deepEqual(errors,[],'No actual component page error');assert(responses.every(r=>r.status===200),'Actual viewer response status');
      const stage=arm+'-'+role+'-'+width;await page.screenshot({path:path.join(out,stage+'.png')});save(path.join(out,stage+'.json'),{arm,role,width,md:fixture.md,actual,expected,marker,count,clicks,snapshot,loadedFontPairs,blocked,sockets,errors,responses,localFailures});
      const row={arm,role,width,md:fixture.md,actual,expected,marker,count,clicks,snapshot,loadedFontPairs,stage};rows.push(row);save(path.join(out,'partial.json'),{complete:false,maps,rows,controls});
      if(arm==='parent'){const candidate=rows.find(r=>r.arm==='candidate'&&r.role===role&&r.width===width);for(const field of ['score','line','table','soFar'])assert.equal(snapshot[field],candidate.snapshot[field],'Actual parent/candidate held '+field);}
      await page.getByRole('button',{name:'How the Season Centre works',exact:true}).click();
      await page.locator('[data-season-help]').waitFor();
      const reopened=await page.locator('[data-season-help]').innerText();
      assert.equal(reopened,help,'Worked instructions reopen unchanged');
      await page.getByRole('button',{name:'Got it',exact:true}).click();
      assert.equal(await page.evaluate(()=>window.__ogClose),0,'Help closed without closing career');
      await page.locator('[data-centre-exit]').click();
      assert.equal(await page.evaluate(()=>window.__ogClose),1,'Native exit callback exactly once');
      await context.close();
      assertTransport({blocked,sockets});assert.deepEqual(errors,[],'Closing page errors remain empty');assert.deepEqual(localFailures,[],'Closing local request failures remain empty');assert(responses.every(r=>r.status===200),'Closing actual responses all succeed');
      row.closing={contextClosed:true,blocked,sockets,errors,localFailures,responses};save(path.join(out,stage+'.json'),row);save(path.join(out,'partial.json'),{complete:false,maps,rows,controls});
    }
    assert.equal(rows.length,12);assert.equal(controls.length,6);
    save(path.join(out,'summary.json'),{complete:true,browserVersion:browser.version(),rows,controls,maps,served,assets:{cssSource:cssRefs[0],builtIndexSha256:hash(Buffer.from(builtIndex)),cssBytes:appCss.length,cssSha256:hash(appCss),fontCssSha256:hash(fontCss),fixtureBodies:roles.map(role=>({role,bytes:fixtures.get(role).bytes.length,sha256:hash(fixtures.get(role).bytes)}))},scope:'Actual default SoccerSeasonCentre component, read-only watch visits, native finite navigation at390/1280; no whole route, save/reload, live publication or clinical real-world frequency claim.'});
    console.log('Viewer1167 PASS: 6 actual candidate journeys and6 effective actual-parent missing-marker controls; all goal roles, scores, player lines, tables, full input saves held.');
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));save(path.join(out,'served.json'),served);assert.equal(hash(fs.readFileSync(executable)),runtime.executableSha256,'Actual browser binary held through closure');}
}
if(isEntry()){if(process.argv[2]==='fonts')await prepareFonts();else await main();}
NATIVE_WORKER
cat > "$E/sim-receipts.mjs" <<'SIM_RECEIPT'
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(), e=process.env.E, hash=b=>createHash('sha256').update(b).digest('hex');
const read=f=>JSON.parse(fs.readFileSync(f)), save=(f,x)=>fs.writeFileSync(f,JSON.stringify(x,null,2));
const strip=s=>({...s,games:s.games.map(g=>({...g,events:g.events.map(event=>{const {ownGoalBy,...rest}=event;return rest;})}))});
const rows=[];
function ledger(file,names,exit='0'){
  const got=fs.readFileSync(file,'utf8').trim().split('\n').map(x=>x.split('\t'));
  assert.deepEqual(got.map(x=>x[0]),names);assert(got.every(x=>x[1]===exit));return got;
}
ledger(e+'/sims/cohort-gates.tsv',['seed-0','seed-1','seed-2']);
const kinds=['self','teammate','opponent','points','mine','preceding-mine','assist','origin','mirror','kind','missed','before','after','on','between','empty','duplicates'];
for(const seed of [0,1,2]){
  const folder=e+'/sims/cohorts/seed-'+seed, summary=read(folder+'/summary.json'), m=read(folder+'/measurement.json');
  assert.equal(summary.complete,true);assert.equal(summary.control,null);assert.equal(summary.careers,120);assert.equal(summary.seedset,seed);assert.equal(summary.parentCompared,true);assert(summary.checks>0);
  assert.equal(m.seedset,seed);assert.equal(m.careers,120);assert.equal(m.checks,summary.checks);assert.deepEqual(m.counts,summary.counts);
  assert.equal(m.seasonRows.length,m.seasons);assert.equal(m.careerRows.length,120);
  const sum=(list,key)=>list.reduce((n,r)=>n+r[key],0);
  assert.equal(sum(m.seasonRows,'goals'),m.goals);assert.equal(sum(m.seasonRows,'eligible'),m.eligible.us+m.eligible.them);
  assert.equal(sum(m.seasonRows,'tags'),m.tagged.you+m.tagged.teammate+m.tagged.opponent);assert.equal(sum(m.seasonRows,'self'),m.tagged.you);
  assert.equal(sum(m.careerRows,'seasons'),m.seasons);assert.equal(sum(m.careerRows,'tags'),sum(m.seasonRows,'tags'));assert.equal(sum(m.careerRows,'self'),m.tagged.you);
  assert.equal(sum(m.careerRows,'taggedSeasons'),m.taggedSeasons);assert.equal(sum(m.careerRows,'selfSeasons'),m.selfSeasons);
  assert.equal(m.playingRows,m.seasons+Object.values(m.refused).reduce((n,v)=>n+v,0));assert.equal(m.games,m.playedGames+m.missedGames);
  assert.equal(m.goals,m.excludedAny+m.eligible.us+m.eligible.them);
  assert.equal(m.eligible.them,m.eligible.onPitchThem+m.eligible.offPitchThem+m.eligible.missedThem);
  assert.equal(m.parentDerived,m.seasons);assert.equal(m.tagged.you,m.roleZeroDraws);assert.equal(m.roleDraws.length,11);assert.equal(m.roleOpportunities,m.roleDraws.reduce((n,v)=>n+v,0));
  assert.equal(m.momentMixtures,m.seasonRows.reduce((n,r)=>n+2**r.momentCount,0));assert(m.distinctChangedMixtures>0&&m.distinctChangedMixtures<=m.momentMixtures);
  assert(m.seasons>0&&m.eligible.us>0&&m.eligible.onPitchThem>0);
  assert.equal(summary.counts['parent-derived'],m.seasons);assert.equal(summary.counts['parent-decisions'],m.momentMixtures);
  const log=fs.readFileSync(folder+'/stdout.log','utf8');assert(new RegExp('^simSoccerOwnGoals: '+summary.checks+' checks, 0 failed$','m').test(log));
  const functional=[];
  for(const kind of kinds){
    const f=read(folder+'/functional-'+kind+'.json');
    assert.deepEqual(f.sourceAfter,f.source);assert.deepEqual(f.momentsAfter,f.moments);assert.deepEqual(strip(f.marked),f.source);
    for(const g of f.marked.games)for(const event of g.events)if(event.ownGoalBy){
      assert.equal(event.kind,'goal');assert.equal(event.pts,1);assert(!event.mine);assert(!f.moments.some(x=>x.mirrorMd===g.md||x.md===g.md&&x.minute===event.min));
      assert(!(event.side==='us'&&g.events.some(x=>x.kind==='assist'&&x.mine&&x.min===event.min)));
      assert(event.side==='us'?event.ownGoalBy==='opponent':['you','teammate'].includes(event.ownGoalBy));
      if(event.ownGoalBy==='you')assert(g.played&&event.min>=(g.onAt??1)&&event.min<(g.offAt??91));
    }
    functional.push({kind,key:f.source.key,sha256:hash(fs.readFileSync(folder+'/functional-'+kind+'.json'))});
  }
  const boundaryNames=['played-false','before-on','at-on','at-off','before-off'], keys=[];
  for(const name of boundaryNames){
    const f=read(folder+'/boundary-'+name+'.json');assert.deepEqual(f.sourceAfter,f.source);assert.deepEqual(strip(f.marked),f.source);keys.push(f.source.key);
    const by=f.marked.games[0].events[0].ownGoalBy;assert.equal(by,['at-on','before-off'].includes(name)?'you':'teammate');
  }
  assert.equal(new Set(keys).size,1);assert.equal(keys[0],read(folder+'/functional-self.json').source.key);
  for(const name of ['absent','malformed','stale','used','banked']){
    const f=read(folder+'/ledger-'+name+'.json');assert.deepEqual(f.rawAfter,f.rawBefore);assert.deepEqual(f.actualRead,f.expectedRead);assert.deepEqual(f.actualEntries,f.expectedEntries);
  }
  for(const name of ['events','game']){
    const f=read(folder+'/insertion-'+name+'.json');assert.deepEqual(strip(f.marked),f.source);assert.deepEqual(strip(f.insertedMarked),f.insertedSource);
  }
  rows.push({seed,checks:summary.checks,denominators:m,structural:functional});
}
const intended={points:'eligibility',mine:'eligibility',assist:'eligibility',origin:'eligibility',mirror:'eligibility',kind:'eligibility',pitch:'self-pitch',beneficiary:'beneficiary',role:'local-policy',gate:'local-policy',score:'metadata-inverse',filteredordinal:'local-policy',input:'input-immutable',ordinal:'insertion-stability',rng:'ambient-rng',ledgerdata:'ledger-reader',ledgerkey:'ledger-reader',stream:'parent-derived'};
ledger(e+'/sims/control-gates.tsv',Object.keys(intended));
const controls=[];
for(const [name,check] of Object.entries(intended)){
  const folder=e+'/sims/controls/'+name, result=read(folder+'/control-result.json'), summary=read(folder+'/summary.json'), changes=read(folder+'/candidate/mutations.json');
  assert.equal(summary.complete,true);assert.equal(summary.control,name);assert.equal(result.control,name);assert.equal(result.intendedCheck,check);
  assert.equal(result.changedSource,true);assert.equal(result.failure.name,'AssertionError');assert.equal(result.failure.check,check);
  assert.equal(changes.length,1);const mutation=changes[0], before=fs.readFileSync(folder+'/candidate/control-before.ts','utf8'),after=fs.readFileSync(folder+'/candidate/control-after.ts','utf8');
  assert.equal(hash(before),mutation.beforeSha256);assert.equal(hash(after),mutation.afterSha256);assert.notEqual(before,after);assert.equal(before.split(mutation.from).length-1,1);assert.equal(before.replace(mutation.from,mutation.to),after);
  assert.equal(before,fs.readFileSync(path.join(root,mutation.file),'utf8').replace(/\r\n/g,'\n'));
  const log=fs.readFileSync(folder+'/stdout.log','utf8');assert(log.includes('CONTROL '+name+': effective copied source, intended '+check+' AssertionError'));
  controls.push({name,check,mutation,failure:result.failure});
}
function baseline(name){
  const log=fs.readFileSync(e+'/logs/'+name+'.log','utf8');const sim=name==='agreement-baseline'?'simSeasonCentreAgreement':'simSeasonMoments';
  const match=log.match(new RegExp('^'+sim+': ([0-9]+) checks, 0 failed$','m'));assert(match&&Number(match[1])>0);assert(!/^FAIL /m.test(log));return{sim,checks:Number(match[1]),logSha256:hash(log)};
}
ledger(e+'/sims/moments-control-gates.tsv',['share','closeshort','double'],'1');
const legacyControls=[];
for(const name of ['share','closeshort','double']){
  const log=fs.readFileSync(e+'/sims/moments-'+name+'.stdout.log','utf8'), match=log.match(new RegExp('^simSeasonMoments: ([0-9]+) checks, ([0-9]+) failed \\(control '+name+'\\)$','m'));
  assert(match&&Number(match[1])>0&&Number(match[2])>0);assert(log.includes('CONTROL '+name+':'));assert(/^FAIL (?:\[8\b|8 )/m.test(log),'Intended actual bank check failed: '+name);
  legacyControls.push({name,checks:Number(match[1]),failed:Number(match[2]),stdoutSha256:hash(log),scope:'Unchanged tracked regression command with retained source/stdout/stderr, no legacy bundle-map claim.'});
}
const natural=[];
for(const role of ['you','teammate','opponent']){
  const file=e+'/ui-fixtures/'+role+'.json', f=read(file), game=f.marked.games.find(g=>g.md===f.md);
  assert.equal(f.population.seedset,0);assert(f.population.career>=0&&f.population.career<120);assert.deepEqual(strip(f.marked),f.derived);
  assert.deepEqual(game.events[f.eventIndex],f.event);assert.equal(f.event.ownGoalBy,role);
  assert(!f.plannedMoments.some(m=>m.mirrorMd===f.md||m.md===f.md&&m.minute===f.event.min));
  natural.push({role,file,bytes:fs.statSync(file).size,sha256:hash(fs.readFileSync(file)),population:f.population});
}
save(e+'/sim-receipt.json',{complete:true,cohorts:rows,controls,baselines:[baseline('agreement-baseline'),baseline('moments-baseline')],legacyControls,natural,scope:'Exact finite outcomes and measured fictional exposure; no frequency threshold or policy acceptance. Cohort full seasons are not all returned, raw structural/natural fixtures and per-season denominators are retained.'});
console.log('OwnGoal1167 sim receipt PASS: three actual 120-career cohorts, 18 effective copied-source assertions, unchanged regressions and three natural viewer roles.');
SIM_RECEIPT
cat > "$E/bundle-provenance.mjs" <<'BUNDLE_PROVENANCE'
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(), e=process.env.E, hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const save=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)), read=file=>JSON.parse(fs.readFileSync(file));
const nodeBundles=[];
const bundleSpecs=[];
for(const seed of [0,1,2])for(const arm of ['candidate','parent'])bundleSpecs.push({folder:e+'/sims/cohorts/seed-'+seed+'/'+arm,arm});
for(const name of ['points','mine','assist','origin','mirror','kind','pitch','beneficiary','role','gate','score','filteredordinal','input','ordinal','rng','ledgerdata','ledgerkey','stream']){
  bundleSpecs.push({folder:e+'/sims/controls/'+name+'/candidate',arm:'candidate'});
  if(name==='stream')bundleSpecs.push({folder:e+'/sims/controls/'+name+'/parent',arm:'parent'});
}
for(const spec of bundleSpecs){
  const sourceRoot=spec.arm==='candidate'?root:process.env.BASE_ROOT,bundleDir=spec.folder;
  const outfile=path.join(bundleDir,'bundle.cjs'), entry=path.join(bundleDir,'entry.ts'), entryText=fs.readFileSync(entry,'utf8');
  const mutations=read(path.join(bundleDir,'mutations.json'));
  const originalInputs=read(path.join(bundleDir,'inputs.json')), metadata=read(path.join(bundleDir,'metafile.json'));
  assert.equal(Object.keys(metadata.inputs).length,originalInputs.length);
  for(const row of originalInputs){
    const bytes=fs.readFileSync(row.path);assert.equal(bytes.length,row.bytes);assert.equal(hash(bytes),row.sha256);
    assert.equal(row.path,path.resolve(sourceRoot,row.name));assert(Object.hasOwn(metadata.inputs,row.name));
  }
  if(mutations.length){
    assert.equal(mutations.length,1);const m=mutations[0], before=fs.readFileSync(path.join(bundleDir,'control-before.ts'),'utf8'),after=fs.readFileSync(path.join(bundleDir,'control-after.ts'),'utf8');
    assert.equal(hash(before),m.beforeSha256);assert.equal(hash(after),m.afterSha256);assert.equal(before.split(m.from).length-1,1);assert.equal(before.replace(m.from,m.to),after);assert.notEqual(before,after);
  }
  const variantOut=path.join(bundleDir,'provenance');fs.mkdirSync(variantOut,{recursive:true});
const bindBuild = (result, outfile, virtualName, virtualBytes, requiredCore) => {
        const metadata = result.metafile, mapPath = outfile + '.map';
        save(outfile + '.metafile.json', metadata);
        const nodeRoot = fs.realpathSync(path.join(root, 'node_modules')) + path.sep;
        const inputRows = Object.entries(metadata.inputs).map(([input, info]) => {
          const resolved = path.resolve(sourceRoot, input);
          const virtual = !fs.existsSync(resolved) && resolved === path.resolve(sourceRoot, virtualName);
          assert(virtual || fs.statSync(resolved).isFile(), 'Actual regular bundle input: ' + input);
          const file = virtual ? resolved : fs.realpathSync(resolved);
          const originalBytes = fs.readFileSync(file);
          const controlled = mutations.find(row => path.resolve(sourceRoot, row.file) === file);
          const bytes = controlled ? fs.readFileSync(path.join(bundleDir, 'control-after.ts')) : originalBytes;
          if (controlled) {
            assert.equal(hash(originalBytes), controlled.beforeSha256, 'Actual original controlled source');
            assert.equal(hash(bytes), controlled.afterSha256, 'Actual consumed copied source');
          }
          assert.equal(info.bytes, bytes.length, 'Actual consumed input bytes: ' + input);
          return { input, file, virtual, controlled: !!controlled, bytes: bytes.length, sha256: hash(bytes), originalBytes: originalBytes.length, originalSha256: hash(originalBytes) };
        });
        assert.equal(inputRows.filter(row => row.virtual).length, 0, 'Every viewer input is a regular original body');
        assert.equal(inputRows.filter(row=>row.file===fs.realpathSync(entry)&&row.sha256===hash(Buffer.from(entryText))).length,1,'Exact physical retained harness entry consumed');
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
        const references = [...js.toString().matchAll(/^[\t ]*\/\/[#@]\s*sourceMappingURL=(\S+)[\t ]*\r?$/gm)].map(row=>row[1]);
        assert(references.length <= 1 && (!references.length || references[0] === path.basename(mapPath)), 'External map output has no contradictory map reference');
        for (const file of [outfile, mapPath]) {
          const outputs = Object.entries(metadata.outputs).filter(([name]) => path.resolve(sourceRoot, name) === file);
          assert.equal(outputs.length, 1, 'Actual emitted metadata output membership');
          assert.equal(outputs[0][1].bytes, fs.statSync(file).size, 'Actual emitted output byte count');
        }
        const record = { js: outfile, jsSha256: hash(js), map: mapPath, mapSha256: hash(fs.readFileSync(mapPath)), inputRows, bindings, requiredCore, mapProviders };
        save(outfile + '.bindings.json', record); return record;
      };
  const requiredCore=['src/lib/soccerCareerEngine.ts','src/lib/season/core.ts','src/lib/season/soccer.ts','src/lib/season/soccerEvents.ts','src/lib/season/momentsSave.ts','src/lib/keyedRng.ts','src/lib/soccerCareerSave.ts'];
  const binding=bindBuild({metafile:metadata},outfile,undefined,undefined,requiredCore);
  assert.equal(binding.inputRows.filter(row=>row.controlled).length,mutations.length);
  const map=read(outfile+'.map');
  const bodies=map.sourcesContent.map((content,index)=>{
    const bytes=Buffer.from(content), row=binding.bindings[index], file=path.join(variantOut,'body-'+index+'.txt');
    assert.equal(hash(bytes),row.sha256);fs.writeFileSync(file,bytes);return{file,source:row.file,bytes:bytes.length,sha256:row.sha256,kind:row.kind};
  });
  nodeBundles.push({folder:bundleDir,arm:spec.arm,binding,bodies,mutations});
}
assert.equal(nodeBundles.length,25);
save(e+'/bundle-provenance.json',{complete:true,bundles:nodeBundles,scope:'All new node harness bundle inputs and emitted sources, controlled copied bodies and concrete consumed dependency providers. Legacy agreement/moments emitted maps are not claimed.'});
console.log('OwnGoal1167 provenance PASS: all25 actual new node bundles, every input and emitted source/provider byte retained.');
BUNDLE_PROVENANCE
cat > "$E/native-receipts.mjs" <<'VIEWER_RECEIPT'
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const e=process.env.E,out=e+'/viewer',root=process.cwd(),digest=b=>createHash('sha256').update(b).digest('hex'),read=f=>JSON.parse(fs.readFileSync(f));
const {assertTransport,validateFontCss}=await import(pathToFileURL(e+'/native-worker.mjs').href);
const summary=read(out+'/summary.json'), required=['src/components/soccer-career/SoccerSeasonCentre.tsx','src/components/season-centre/SeasonCentre.tsx','src/components/season-centre/MatchClock.tsx','src/components/season-centre/SeasonCentreHelp.tsx','src/components/soccer-career/useSoccerMoments.tsx','src/lib/season/core.ts','src/lib/season/soccer.ts','src/lib/season/soccerEvents.ts'];
assert.equal(summary.complete,true);assert.equal(summary.rows.length,12);assert.equal(summary.controls.length,6);
const expected=[];for(const width of [390,1280])for(const role of ['you','teammate','opponent'])for(const arm of ['candidate','parent'])expected.push(arm+'-'+role+'-'+width);
assert.deepEqual(summary.rows.map(row=>row.stage),expected);
for(const mapped of summary.maps){
  const binding=mapped.binding,map=read(binding.map),meta=read(binding.js+'.metafile.json');
  assert.equal(digest(fs.readFileSync(binding.js)),binding.jsSha256);assert.equal(digest(fs.readFileSync(binding.map)),binding.mapSha256);
  assert.equal(mapped.bundleSha256,binding.jsSha256);assert.equal(mapped.mapSha256,binding.mapSha256);
  assert.deepEqual(binding.inputRows,read(binding.js+'.inputs.json'));assert.deepEqual(binding.mapProviders,read(binding.js+'.providers.json'));
  assert.equal(Object.keys(meta.inputs).length,binding.inputRows.length);assert(binding.inputRows.every(row=>!row.virtual));
  const consumed=new Map(binding.inputRows.map(row=>[row.file,row])),nodeRoot=fs.realpathSync('node_modules')+path.sep;
  for(const input of binding.inputRows){const bytes=fs.readFileSync(input.file);assert.equal(bytes.length,input.bytes);assert.equal(digest(bytes),input.sha256);assert.equal(meta.inputs[input.input].bytes,input.bytes);}
  for(const provider of binding.mapProviders){
    const input=consumed.get(provider.input);assert(input&&!input.virtual);assert.equal(input.sha256,provider.inputSha256);
    assert(provider.input.startsWith(nodeRoot)&&provider.mapFile.startsWith(nodeRoot));
    const compiled=fs.readFileSync(provider.inputRetained),raw=fs.readFileSync(provider.retained);
    assert.equal(digest(compiled),provider.inputSha256);assert.equal(digest(fs.readFileSync(provider.input)),provider.inputSha256);
    assert.equal(digest(raw),provider.mapSha256);assert.equal(digest(fs.readFileSync(provider.mapFile)),provider.mapSha256);
    const refs=[...compiled.toString('utf8').matchAll(/^[\t ]*\/\/[#@]\s*sourceMappingURL=(\S+)[\t ]*\r?$/gm)],references=[...new Set(refs.map(row=>row[1]))];
    assert.equal(references.length,1);assert.equal(references[0],provider.sourceMappingURL);assert.equal(fs.realpathSync(path.resolve(path.dirname(provider.input),provider.sourceMappingURL)),provider.mapFile);
  }
  assert.equal(map.sources.length,map.sourcesContent.length);assert.equal(binding.bindings.length,map.sources.length);const seen=new Set();
  for(let i=0;i<map.sources.length;i++){
    const row=binding.bindings[i],body=digest(Buffer.from(map.sourcesContent[i])),input=consumed.get(row.file);
    assert.equal(row.source,map.sources[i]);assert.equal(row.sha256,body);assert.equal(row.file,path.resolve(path.dirname(binding.map),row.source));
    if(row.kind==='consumed package map original'){
      assert(!input&&row.file.startsWith(nodeRoot)&&!row.virtual);const p=row.provider;
      assert(binding.mapProviders.some(r=>r.input===p.input&&r.inputSha256===p.inputSha256&&r.mapFile===p.mapFile&&r.mapSha256===p.mapSha256&&r.retained===p.retained&&r.inputRetained===p.inputRetained&&r.sourceMappingURL===p.sourceMappingURL));
      const published=read(p.retained);assert(Number.isInteger(p.index)&&p.index>=0&&p.index<published.sources.length);
      assert.equal(row.file,path.resolve(path.dirname(p.mapFile),published.sourceRoot??'',published.sources[p.index]));
      if(p.contentKind==='published sourcesContent'){assert.equal(typeof published.sourcesContent?.[p.index],'string');assert.equal(digest(Buffer.from(published.sourcesContent[p.index])),body);}
      else{assert.equal(p.contentKind,'published map named installed source');assert.equal(p.sourceFile,row.file);assert(p.sourceFile.startsWith(nodeRoot));assert.equal(fs.realpathSync(p.sourceFile),p.sourceFile);assert.equal(p.sourceSha256,body);assert.equal(digest(fs.readFileSync(p.sourceRetained)),body);assert.equal(digest(fs.readFileSync(p.sourceFile)),body);}
    }else{
      assert(input&&!input.virtual);assert.equal(input.sha256,body);assert.equal(row.kind,'actual consumed input');
      for(const source of required)if(row.file===path.join(mapped.source,source))seen.add(source);
    }
    const retained=mapped.bodies[i];assert.equal(retained.source,row.file);assert.equal(retained.sha256,body);assert.equal(digest(fs.readFileSync(out+'/'+retained.evidenceFile)),body);
  }
  assert.deepEqual(binding.requiredCore,required);assert.deepEqual([...seen].sort(),[...required].sort());
  const entry=fs.readFileSync(out+'/'+mapped.arm+'-entry.tsx');assert.equal(digest(entry),mapped.entrySha256);assert(binding.inputRows.some(input=>input.sha256===mapped.entrySha256&&input.file.endsWith('/entry.tsx')));
}
const roles=['you','teammate','opponent'],fixtures=new Map(roles.map(role=>[role,read(e+'/ui-fixtures/'+role+'.json')]));
function words(event,us,them){
  if(event.kind==='goal'){
    if(event.ownGoalBy==='you')return '⚽ You (O.G), goal for '+them;
    if(event.ownGoalBy==='teammate')return '⚽ A teammate (O.G), goal for '+them;
    if(event.ownGoalBy==='opponent')return '⚽ An opponent (O.G), goal for '+us;
    return event.side==='us'?(event.mine?'⚽ You score!':'⚽ Goal, '+us):'⚽ Goal, '+them;
  }
  return {assist:'🅰️ You set it up',yellow:'🟨 You go in the book',red:'🟥 Sent off',injury:'🚑 You go off injured',on:'🔁 You come on',off:'🔁 You come off'}[event.kind];
}
for(const row of summary.rows){
  const fixture=fixtures.get(row.role), season=row.arm==='candidate'?fixture.marked:fixture.derived,game=season.games.find(g=>g.md===fixture.md);
  const us=fixture.row.club,them=season.labels[game.opp].named?season.labels[game.opp].name:'another club';
  const expectedFeed=game.events.map(event=>({minute:event.min+"'",body:words(event,us,them)}));
  assert.deepEqual(row.actual,expectedFeed);assert.deepEqual(row.expected,expectedFeed);assert.equal(row.md,fixture.md);
  assert.equal(row.snapshot.score,game.us+'-'+game.them);assert.equal(row.snapshot.fixtureHeld,true);assert.equal(row.snapshot.documentWidth,row.width);assert.equal(row.snapshot.viewport,row.width);
  const marker='⚽ '+({you:'You',teammate:'A teammate',opponent:'An opponent'}[row.role])+' (O.G), goal for '+(row.role==='opponent'?us:them);
  assert.equal(row.marker,marker);assert.equal(row.count,row.actual.filter(event=>event.body===marker).length);
  const wanted=fixture.marked.games.find(g=>g.md===fixture.md).events.filter(event=>event.kind==='goal'&&event.ownGoalBy===row.role).length;assert(wanted>0);
  assert.equal(row.count,row.arm==='candidate'?wanted:0);
  assert.equal(row.loadedFontPairs.length,8);assert.deepEqual(row.loadedFontPairs.map(p=>p.family+'/'+p.weight),['Inter/400','Inter/500','Inter/600','Inter/700','Space Grotesk/400','Space Grotesk/500','Space Grotesk/600','Space Grotesk/700']);
  assert(row.loadedFontPairs.every(p=>p.loaded.length&&p.loaded.every(f=>f.status==='loaded'&&f.family.replaceAll('"','')===p.family&&f.weight===String(p.weight))));
  assert.equal(row.closing.contextClosed,true);assertTransport(row.closing);assert.deepEqual(row.closing.errors,[]);assert.deepEqual(row.closing.localFailures,[]);assert(row.closing.responses.length>0&&row.closing.responses.every(r=>r.status===200));
  assert.deepEqual(read(out+'/'+row.stage+'.json'),row);assert(fs.statSync(out+'/'+row.stage+'.png').size>0);
  assert.equal(row.clicks[0],'Got it');assert.equal(row.clicks[1],'Kick off');
  if(row.arm==='parent'){
    const candidate=summary.rows.find(other=>other.arm==='candidate'&&other.role===row.role&&other.width===row.width);
    for(const field of ['score','line','table','soFar'])assert.equal(row.snapshot[field],candidate.snapshot[field]);
    const control=summary.controls.find(c=>c.width===row.width&&c.role===row.role);assert(control);assert.equal(control.kind,'actual-parent-missing-marker');assert.equal(control.effective,true);assert.equal(control.actual,0);assert.equal(control.expected,wanted);assert(control.message.startsWith('Exact requested own-goal marker count'));
  }
}
const runtime=read(out+'/browser-runtime.json');assert.equal(runtime.version,summary.browserVersion);
assert(runtime.executablePath.startsWith(runtime.privateCache+path.sep));assert.equal(runtime.privateCache,process.env.PLAYWRIGHT_BROWSERS_PATH);assert.equal(digest(fs.readFileSync(runtime.executablePath)),runtime.executableSha256);
assert.equal(runtime.temp.directory,path.join(process.env.WORK,'t'));for(const key of ['TMPDIR','TEMP','TMP'])assert.equal(runtime.temp[key],runtime.temp.directory);
const font=read(e+'/font-cache/manifest.json'),original=fs.readFileSync(e+'/font-cache/'+font.entries[0].file,'utf8'),declarations=validateFontCss(original);
assert.deepEqual(declarations,font.declared);assert.equal(digest(original),font.originalSha256);assert.equal(digest(fs.readFileSync('index.html')),font.templateSha256);
assert.deepEqual(font.entries.slice(1).map(row=>row.url),declarations.urls);
let local=original;for(const entry of font.entries.slice(1))local=local.replaceAll(entry.url,'/held-fonts/'+entry.file);
assert.equal(fs.readFileSync(e+'/font-cache/local.css','utf8'),local);assert.equal(digest(local),font.localSha256);
for(const entry of font.entries){const raw=fs.readFileSync(e+'/font-cache/'+entry.file);assert.equal(raw.length,entry.bytes);assert.equal(digest(raw),entry.sha256);assert.equal(entry.status,200);}
const fontControl=read(e+'/font-cache/controls.json');assert.equal(fontControl.baselineSha256,digest(original));assert.deepEqual(fontControl.controls.map(row=>row.name),['origin','family','missing-weight','normal-style','woff2-format','weight-whitelist','undeclared-url']);
for(const control of fontControl.controls){
  const raw=fs.readFileSync(e+'/font-cache/'+control.file,'utf8');assert.equal(raw,original.replaceAll(control.from,control.to));assert.notEqual(raw,original);assert.equal(digest(raw),control.sha256);assert.equal(Buffer.byteLength(raw),control.bytes);
  let error;try{validateFontCss(raw);}catch(caught){error=caught;}assert(error instanceof assert.AssertionError);assert(error.message.startsWith(control.message));assert.deepEqual(control.intendedFailure,{name:error.name,message:error.message,actual:error.actual,expected:error.expected,operator:error.operator});
}
const built=fs.readFileSync('dist/index.html'),css=fs.readFileSync('dist/'+summary.assets.cssSource.slice(1));
assert.equal(digest(built),summary.assets.builtIndexSha256);assert.equal(digest(fs.readFileSync(out+'/actual-built-index.html')),summary.assets.builtIndexSha256);
assert(css.length>0);assert.equal(css.length,summary.assets.cssBytes);assert.equal(digest(css),summary.assets.cssSha256);assert.equal(digest(fs.readFileSync(out+'/actual-app.css')),summary.assets.cssSha256);
assert.equal(summary.assets.fontCssSha256,digest(Buffer.from(local)));
const empty=read(out+'/css-byte-control.json');assert.equal(empty.effective,true);assert.equal(empty.baselineBytes,css.length);assert.equal(empty.baselineSha256,digest(css));assert.equal(fs.statSync(out+'/'+empty.controlledFile).size,0);assert.equal(empty.controlledBytes,0);assert.equal(empty.controlledSha256,digest(Buffer.alloc(0)));assert.equal(empty.intendedFailure.name,'AssertionError');assert.equal(empty.intendedFailure.message,'Actual built application CSS has a positive body');
const html=Buffer.from('<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/fonts.css"></head><body><div id="root"></div><script type="module" src="./bundle.js"></script></body></html>');
const pool=e+'/served-payloads';fs.mkdirSync(pool,{recursive:true});const deliveries=read(out+'/served.json');assert.deepEqual(deliveries,summary.served);
for(const response of deliveries){
  assert.equal(response.method,'GET');assert.equal(response.status,200);const bits=response.url.split('?')[0].split('/').filter(Boolean);let bytes;
  if(response.url==='/styles.css')bytes=css;else if(response.url==='/fonts.css')bytes=Buffer.from(local);else if(bits[0]==='held-fonts'&&bits.length===2)bytes=fs.readFileSync(e+'/font-cache/'+bits[1]);
  else if(['candidate','parent'].includes(bits[0])&&roles.includes(bits[1])){
    if(bits.length===2)bytes=html;else if(bits[2]==='bundle.js')bytes=fs.readFileSync(out+'/'+bits[0]+'-bundle.js');else if(bits[2]==='fixture.json')bytes=fs.readFileSync(e+'/ui-fixtures/'+bits[1]+'.json');
  }
  assert(bytes,'Every actual served URL has a bound original body');assert.equal(bytes.length,response.bytes);assert.equal(digest(bytes),response.sha256);fs.writeFileSync(pool+'/'+response.sha256,bytes);
}
const vite=[],viteSeen=new Set(),viteDir=e+'/vite-core';fs.mkdirSync(viteDir,{recursive:true});
for(const name of fs.readdirSync('dist/assets').filter(name=>name.endsWith('.js.map'))){
  const raw=fs.readFileSync('dist/assets/'+name),map=JSON.parse(raw),matches=[];
  for(let i=0;i<map.sources.length;i++)for(const source of required){
    const normalized=map.sources[i].replaceAll('\\','/');if(!(normalized.endsWith('/'+source)||normalized===source))continue;
    assert.equal(typeof map.sourcesContent?.[i],'string');const sha256=digest(Buffer.from(map.sourcesContent[i]));assert.equal(sha256,digest(fs.readFileSync(source)));matches.push({source,index:i,sha256});viteSeen.add(source);
  }
  if(matches.length){const js=name.slice(0,-4),body=fs.readFileSync('dist/assets/'+js);fs.writeFileSync(viteDir+'/'+name,raw);fs.writeFileSync(viteDir+'/'+js,body);vite.push({map:name,mapSha256:digest(raw),js,jsSha256:digest(body),matches});}
}
assert.deepEqual([...viteSeen].sort(),[...required].sort());
const baseline=summary.rows[0].closing,transportControls=[];
assertTransport(baseline);
for(const key of ['blocked','sockets']){
  const changed=structuredClone(baseline);changed[key]=['https://invalid.example/control'];let error;try{assertTransport(changed);}catch(caught){error=caught;}
  assert(error instanceof assert.AssertionError);assert.equal(error.operator,'deepStrictEqual');assert.notDeepEqual(changed,baseline);transportControls.push({key,baseline,controlled:changed,intendedFailure:{name:error.name,message:error.message,actual:error.actual,expected:error.expected,operator:error.operator}});
}
fs.writeFileSync(e+'/native-receipt.json',JSON.stringify({complete:true,rows:summary.rows.map(row=>({stage:row.stage,sha256:digest(fs.readFileSync(out+'/'+row.stage+'.json')),pngSha256:digest(fs.readFileSync(out+'/'+row.stage+'.png'))})),controls:summary.controls,transportControls,deliveries,vite,scope:'12 actual component watch rows with natural own-goal fixture exposure; no event.isTrusted, full-route, reload/save, real-world balance or current-main claim.'},null,2));
const retainedArtifacts=[];
for(const directory of [e+'/served-payloads',e+'/vite-core'])for(const name of fs.readdirSync(directory)){
  const file=path.join(directory,name);assert(fs.statSync(file).isFile());const bytes=fs.readFileSync(file);retainedArtifacts.push({file,bytes:bytes.length,sha256:digest(bytes)});
}
for(const file of [e+'/sim-receipt.json',e+'/bundle-provenance.json',e+'/native-receipt.json']){const bytes=fs.readFileSync(file);retainedArtifacts.push({file,bytes:bytes.length,sha256:digest(bytes)});}
fs.writeFileSync(e+'/receipt-artifacts-before.json',JSON.stringify(retainedArtifacts,null,2));
fs.writeFileSync(e+'/receipt-artifacts-before.sha256',retainedArtifacts.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0).map(row=>row.sha256+'  '+row.file).join('\n')+'\n');
console.log('OwnGoal1167 viewer receipt PASS: six candidate/six effective actual-parent rows, 12 captures, actual source providers/fonts/served bodies and held Vite cores.');
VIEWER_RECEIPT
run syntax 30 bash -euo pipefail -c 'bash -n .rc/x/soccer-own-goals-1167.sh; node --check "$E/native-worker.mjs"; node --check "$E/sim-receipts.mjs"; node --check "$E/bundle-provenance.mjs"; node --check "$E/native-receipts.mjs"; printf "%s\n" "f3194e97f50bd839d640644a0e6c59309d58ee41e434280d9bd68c85c13e89d9  $E/native-worker.mjs" | sha256sum -c -'
if test "${gates[syntax]}" = 0; then
  run fonts 120 node "$E/native-worker.mjs" fonts
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
  git archive "$BASE_HEAD" -- src/components/soccer-career/SoccerSeasonCentre.tsx src/components/season-centre/SeasonCentre.tsx src/components/season-centre/MatchClock.tsx src/components/season-centre/SeasonCentreHelp.tsx src/components/soccer-career/useSoccerMoments.tsx src/lib/season/core.ts src/lib/season/soccer.ts src/lib/season/soccerEvents.ts src/lib/season/soccerMoments.ts src/lib/season/momentsSave.ts src/lib/keyedRng.ts src/lib/soccerCareerSave.ts src/lib/soccerCareerEngine.ts src/lib/safeStorage.ts src/lib/utils.ts src/hooks/useRevealScroll.ts src/index.css package.json package-lock.json vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json tailwind.config.ts postcss.config.js index.html scripts/runAllSims.mjs scripts/simAdsense.mjs scripts/simBrand.mjs scripts/simHeadTags.mjs scripts/simHiddenPages.mjs scripts/simHubs.mjs scripts/simIndexNow.mjs scripts/simIndexing.mjs scripts/simInternalLinks.mjs scripts/simNoRivalNames.mjs scripts/simPrerender.mjs scripts/simPrerenderBoot.mjs scripts/simRetiredRoutes.mjs scripts/simSchema.mjs scripts/simSitemap.mjs scripts/simSnapshotAssets.mjs scripts/lib/offlineTransport.cjs scripts/lib/atomicWrite.mjs scripts/lib/retiredRoutes.mjs scripts/lib/playwrightLoader.mjs scripts/genHiddenStubs.mjs scripts/genRetiredStubs.mjs scripts/genSeoMetaParts.mjs scripts/logo/gen_logo.py src/App.tsx src/pages/SoccerCareer.tsx src/data/gameRegistry.ts scripts/data/lastmod.json scripts/simSeasonCentreAgreement.mjs scripts/simSeasonMoments.mjs scripts/lib/careerAwardsNightProbe.mjs scripts/lib/careerAwardsNightBundle.mjs > "$E/base-core-source.tar"
'
run types 120 node_modules/.bin/tsc --noEmit -p tsconfig.app.json
run base-types 120 bash -euo pipefail -c 'cd "$BASE_ROOT"; node_modules/.bin/tsc --noEmit -p tsconfig.app.json'
run build 180 env NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" npm run build -- --sourcemap
# The untouched parent is bundled by the new sim and viewer; no parent Vite build or route claim.
if test "${gates[build]}" = 0; then
  run build-hold 30 bash -euo pipefail -c '
    sha256sum --quiet -c "$E/source-before.sha256"; git diff --exit-code HEAD
    (cd "$BASE_ROOT"; sha256sum --quiet -c "$E/base-source-before.sha256")
    find dist -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dist-before.sha256"
    find dist -type l -printf "%p\t%l\n" | sort > "$E/dist-before-links.tsv"


  '
else skip build-hold; fi
mkdir -p "$E/sims/cohorts" "$E/sims/controls" "$E/ui-fixtures"
cat > "$E/run-cohorts.sh" <<'COHORTS'
#!/usr/bin/env bash
set -uo pipefail
failed=0
for seed in 0 1 2; do
  dir="$E/sims/cohorts/seed-$seed"; mkdir -p "$dir"
  if test "$seed" = 0; then
    timeout -k 10 600 env CAREERS=120 SEEDSET="$seed" OWN_GOAL_EVIDENCE_DIR="$dir" OWN_GOAL_PARENT_ROOT="$BASE_ROOT" OWN_GOAL_UI_FIXTURES="$E/ui-fixtures" node scripts/simSoccerOwnGoals.mjs > "$dir/stdout.log" 2> "$dir/stderr.log"; rc=$?
  else
    timeout -k 10 600 env -u OWN_GOAL_UI_FIXTURES CAREERS=120 SEEDSET="$seed" OWN_GOAL_EVIDENCE_DIR="$dir" OWN_GOAL_PARENT_ROOT="$BASE_ROOT" node scripts/simSoccerOwnGoals.mjs > "$dir/stdout.log" 2> "$dir/stderr.log"; rc=$?
  fi
  printf 'seed-%s\t%s\n' "$seed" "$rc" >> "$E/sims/cohort-gates.tsv"
  tail -n 4 "$dir/stdout.log"; test "$rc" = 0 || failed=1
done
exit "$failed"
COHORTS
cat > "$E/run-own-controls.sh" <<'CONTROLS'
#!/usr/bin/env bash
set -uo pipefail
failed=0
controls=(points mine assist origin mirror kind pitch beneficiary role gate score filteredordinal input ordinal rng ledgerdata ledgerkey stream)
for control in "${controls[@]}"; do
  dir="$E/sims/controls/$control"; mkdir -p "$dir"
  if test "$control" = stream; then
    timeout -k 10 60 env -u OWN_GOAL_UI_FIXTURES CAREERS=1 SEEDSET=0 OWN_GOAL_CONTROL="$control" OWN_GOAL_EVIDENCE_DIR="$dir" OWN_GOAL_PARENT_ROOT="$BASE_ROOT" node scripts/simSoccerOwnGoals.mjs > "$dir/stdout.log" 2> "$dir/stderr.log"; rc=$?
  else
    timeout -k 10 30 env -u OWN_GOAL_UI_FIXTURES -u OWN_GOAL_PARENT_ROOT CAREERS=1 SEEDSET=0 OWN_GOAL_CONTROL="$control" OWN_GOAL_EVIDENCE_DIR="$dir" node scripts/simSoccerOwnGoals.mjs > "$dir/stdout.log" 2> "$dir/stderr.log"; rc=$?
  fi
  printf '%s\t%s\n' "$control" "$rc" >> "$E/sims/control-gates.tsv"
  tail -n 3 "$dir/stdout.log"; test "$rc" = 0 || failed=1
done
exit "$failed"
CONTROLS
cat > "$E/run-moments-controls.sh" <<'MOMENTS_CONTROLS'
#!/usr/bin/env bash
set -uo pipefail
failed=0
for control in share closeshort double; do
  timeout -k 10 120 env CAREERS=40 SEEDSET=0 MOMENTS_CONTROL="$control" node scripts/simSeasonMoments.mjs > "$E/sims/moments-$control.stdout.log" 2> "$E/sims/moments-$control.stderr.log"; rc=$?
  printf '%s\t%s\n' "$control" "$rc" >> "$E/sims/moments-control-gates.tsv"
  test "$rc" = 1 || failed=1
  tail -n 3 "$E/sims/moments-$control.stdout.log"
done
exit "$failed"
MOMENTS_CONTROLS
if test "${gates[types]}" = 0 && test "${gates[base-types]}" = 0 && test "${gates[build-hold]}" = 0; then
  run cohorts 1800 bash "$E/run-cohorts.sh"
  run own-controls 600 bash "$E/run-own-controls.sh"
  run agreement-baseline 180 env CAREERS=120 SEEDSET=0 node scripts/simSeasonCentreAgreement.mjs
  run moments-baseline 180 env CAREERS=40 SEEDSET=0 node scripts/simSeasonMoments.mjs
  run moments-controls 420 bash "$E/run-moments-controls.sh"
else
  skip cohorts; skip own-controls; skip agreement-baseline; skip moments-baseline; skip moments-controls
fi
run sim-receipts 120 node "$E/sim-receipts.mjs"
run bundle-provenance 180 node "$E/bundle-provenance.mjs"
if test "${gates[syntax]}" = 0 && test "${gates[cohorts]}" = 0 && test "${gates[bundle-provenance]}" = 0 && test "${gates[sim-receipts]}" = 0 && test "${gates[runtime]}" = 0 && test "${gates[font-hold]}" = 0; then
  run native 480 env PARENT="$BASE_ROOT" OWN_GOAL_UI_FIXTURES="$E/ui-fixtures" node "$E/native-worker.mjs"
else skip native; fi
run native-hold 30 bash -euo pipefail -c '
  test -d "$E/viewer"; test -d "$E/sims"
  find "$E/viewer" "$E/sims" "$E/ui-fixtures" -type f -print0 | sort -z | xargs -0 sha256sum > "$E/proof-before.sha256"
  find "$E/viewer" "$E/sims" "$E/ui-fixtures" -type l -printf "%p\t%l\n" | sort > "$E/proof-before-links.tsv"
'
if test "${gates[native]}" = 0; then
  run native-receipts 120 node "$E/native-receipts.mjs"
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
  find "$E/viewer" "$E/sims" "$E/ui-fixtures" -type f -print0 | sort -z | xargs -0 sha256sum > "$E/proof-close.sha256"; cmp "$E/proof-before.sha256" "$E/proof-close.sha256"
  find "$E/viewer" "$E/sims" "$E/ui-fixtures" -type l -printf "%p\t%l\n" | sort > "$E/proof-close-links.tsv"; cmp "$E/proof-before-links.tsv" "$E/proof-close-links.tsv"
  find "$E/served-payloads" "$E/vite-core" -type f -print0 > "$E/receipt-close-paths.nul"
  printf "%s\0" "$E/sim-receipt.json" "$E/bundle-provenance.json" "$E/native-receipt.json" >> "$E/receipt-close-paths.nul"
  sort -z "$E/receipt-close-paths.nul" | xargs -0 sha256sum > "$E/receipt-artifacts-close.sha256"
  cmp "$E/receipt-artifacts-before.sha256" "$E/receipt-artifacts-close.sha256"
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
const expected=['identity','locked-packages','runtime','brand-runtime','syntax','fonts','font-hold','base-prepare','types','base-types','build','build-hold','cohorts','own-controls','agreement-baseline','moments-baseline','moments-controls','sim-receipts','bundle-provenance','native','native-hold','native-receipts',...process.env.READERS.split(',').map(x=>'reader-'+x),'reader-receipts','closing','dependency-cache-hold'];
const entries=fs.readFileSync(process.env.E+'/gates.tsv','utf8').trim().split('\n').map(x=>x.split('\t'));
fs.writeFileSync(process.env.E+'/strict-gates.json',JSON.stringify({expected,actual:entries},null,2));
assert.deepEqual(entries.map(x=>x[0]),expected); assert(entries.every(x=>x[1]==='0'));
console.log('Every actual tailored own-goal preparation/cohort/source-control/viewer/reader/source/dependency/build gate succeeded.');
NODE
execution_complete=1
exit "$failed"
