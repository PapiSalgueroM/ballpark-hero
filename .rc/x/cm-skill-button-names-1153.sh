#!/usr/bin/env bash
# Remote-only direct component proof for named Club Manager skill actions. No application edits.
set -uo pipefail
test "${GITHUB_ACTIONS:-}" = true || exit 2
test -n "${RC_OUT:-}" && test -n "${RUNNER_TEMP:-}" || exit 2
BASE_HEAD=c623e77d22541ac88c30f48b078a9a8a9c699e1d
CHECKED_HEAD=4ec4150acc77c8bbd9c579ad884846569185493e
CHECKED_TREE=8f74a87b34950b18179cad4852bdf79d0fbdd17e
REQUEST_HEAD=$(git rev-parse HEAD)
WORK=$(mktemp -d "$RUNNER_TEMP/skills-1153.XXXXXX") || exit 2
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
  archive="$WORK/tycoon-skills-1153-evidence.tar.xz"
  timeout -k 10 180 tar -c -I "xz -T2 -8" -f "$archive" -C "$E" .; packed=$?
  bytes=$(stat -c %s "$archive" 2>/dev/null || echo unavailable)
  if test "$packed" = 0 && test "$bytes" -le 24000000; then
    timeout -k 10 30 cp "$archive" "$RC_OUT/tycoon-skills-1153-evidence.tar.xz" || failed=1
    timeout -k 10 20 sha256sum "$RC_OUT/tycoon-skills-1153-evidence.tar.xz" > "$RC_OUT/evidence.sha256" || failed=1
    printf 'checked=%s\nrequest=%s\nbytes=%s\nfailed=%s\nexecution_complete=%s\nending=%s\n' "$CHECKED_HEAD" "$REQUEST_HEAD" "$bytes" "$failed" "$execution_complete" "$ending" > "$RC_OUT/receipt.txt" || failed=1
  else
    printf 'EVIDENCE CAP FAILURE: pack_exit=%s bytes=%s limit=24000000; full payload retained only at runner path %s, no truncated evidence accepted.\n' "$packed" "$bytes" "$archive" | tee "$RC_OUT/EVIDENCE-CAP-FAILURE.txt"
    failed=1
  fi
  printf 'Club Manager skills1153 strict label: failed=%s, complete=%s, source=%s, request=%s.\n' "$failed" "$execution_complete" "$CHECKED_HEAD" "$REQUEST_HEAD"
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
  printf "%s\n" .github/workflows/lane-remote-check.yml .rc/request.txt .rc/run.sh .rc/x/cm-skill-button-names-1153.sh | LC_ALL=C sort > "$E/allowed-overlay.txt"
  git diff --name-only --no-renames "$CHECKED_HEAD" HEAD | LC_ALL=C sort > "$E/actual-overlay.txt"
  cmp "$E/allowed-overlay.txt" "$E/actual-overlay.txt"
  printf "%s\n" "7d3f4e2bf7502c714fc38a654842a8b4f9f62ec850a9bcf235597552893b5384  .rc/request.txt" "668aeb520674d130f1af2e88494775afff6b8055d9911c715a8b646056b4b62f  .rc/run.sh" "447a4eca8616f708831ec5e6b7bf90ba68afc606054c0e0d0b27b4cb84abec20  .github/workflows/lane-remote-check.yml" > "$E/reviewed-kit.sha256"
  sha256sum -c "$E/reviewed-kit.sha256"
  sha256sum .rc/x/cm-skill-button-names-1153.sh > "$E/dispatched-shell.sha256"
  printf "%s\n" "e5ff6ae58b924627951ed9dea2caf932eaa38470198f4d1b479db7746cf99aba  src/components/club-manager/XpScreen.tsx" > "$E/reviewed-source.sha256"
  sha256sum -c "$E/reviewed-source.sha256"
  printf "%s\n" docs/PROJECT-STATE.md src/components/club-manager/XpScreen.tsx | LC_ALL=C sort > "$E/allowed-candidate.txt"
  git diff --name-only --no-renames "$BASE_HEAD" "$CHECKED_HEAD" | LC_ALL=C sort > "$E/actual-candidate.txt"
  cmp "$E/allowed-candidate.txt" "$E/actual-candidate.txt"
  git rev-parse HEAD HEAD^ "HEAD^{tree}" > "$E/identity.txt"
  git ls-tree -r HEAD > "$E/git-runtime-manifest.txt"
  git ls-tree -r "$CHECKED_HEAD" > "$E/git-checked-manifest.txt"
  git ls-tree -r "$BASE_HEAD" > "$E/git-base-manifest.txt"
  git ls-files -z > "$E/runtime-paths.nul"
  git ls-files -z | sort -z | xargs -0 sha256sum > "$E/source-before.sha256"
  git diff "$BASE_HEAD" "$CHECKED_HEAD" -- src/components/club-manager/XpScreen.tsx > "$E/component-only.diff"
  command -v xz; xz --version
  selected=(
    src/components/club-manager/XpScreen.tsx src/lib/clubManager.ts src/lib/clubManagerXp.ts src/lib/gmXp.ts src/lib/utils.ts src/components/club-manager/Celebration.tsx src/components/club-manager/CelebrationStyles.tsx src/index.css
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

async function main() {
  assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Remote-only worker');
  const root = process.cwd(), out = path.join(process.env.E, 'native');
  const require = createRequire(path.join(root, 'package.json'));
  const { chromium } = require('playwright'), { build } = require('esbuild');
  const epoch = Date.UTC(2026, 0, 1, 12);
  const core = ['src/components/club-manager/XpScreen.tsx', 'src/lib/clubManager.ts', 'src/lib/clubManagerXp.ts', 'src/lib/gmXp.ts'];
  const trees = ['tactics', 'recruitment', 'negotiation', 'youth', 'manManagement', 'finance', 'media'];
  const treeLabels = ['Tactics', 'Recruitment', 'Negotiation', 'Youth', 'Man Management', 'Finance', 'Media'];
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
export const xp=await import(${JSON.stringify(sourceRoot + '/src/lib/clubManagerXp.ts')});`;
      const clientEntry = `import React from 'react';
import {createRoot} from 'react-dom/client';
import {XpScreen} from ${JSON.stringify(sourceRoot + '/src/components/club-manager/XpScreen.tsx')};
import {spendSkillPoint,pointsFree,xpOf} from ${JSON.stringify(sourceRoot + '/src/lib/clubManagerXp.ts')};
export function mount(fixture){
 let current=JSON.parse(JSON.stringify(fixture)), calls=[];
 const view=createRoot(document.getElementById('fixture-root'));
 function render(){view.render(<XpScreen career={current} onSpendPoint={tree=>{
  calls.push(tree); const next=spendSkillPoint(current,tree); if(next){current=next;render();}
 }}/>);}
 window.__skills1153={snapshot:()=>({career:JSON.parse(JSON.stringify(current)),free:pointsFree(xpOf(current)),calls:[...calls]})};
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
      const engineBuild = await build({ absWorkingDir: sourceRoot, stdin: { contents: engineEntry, sourcefile: '1153-engine-entry.mjs', resolveDir: sourceRoot, loader: 'js' }, outfile: engineFile, bundle: true, platform: 'node', format: 'esm', sourcemap: true, metafile: true, alias: { '@': path.join(sourceRoot, 'src') }, tsconfig: path.join(sourceRoot, 'tsconfig.app.json') });
      const engineBinding = bindBuild(engineBuild, engineFile, '1153-engine-entry.mjs', engineEntry, core.slice(1));
      const { engine, xp } = await import(pathToFileURL(engineFile).href);
      assert.deepEqual(xp.SKILL_TREES, trees);
      assert.deepEqual(trees.map(tree => xp.TREE_INFO[tree].label), treeLabels);
      assert.equal(xp.MAX_TREE_POINTS, 5);
      if (!careerTemplate) {
        const RealDate = globalThis.Date, originalRandom = Math.random;
        let seed = 1153;
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
      const clientBuild = await build({ absWorkingDir: sourceRoot, stdin: { contents: clientEntry, sourcefile: '1153-client-entry.jsx', resolveDir: sourceRoot, loader: 'jsx' }, outfile: clientFile, bundle: true, platform: 'browser', format: 'esm', sourcemap: true, metafile: true, alias: { '@': path.join(sourceRoot, 'src') }, tsconfig: path.join(sourceRoot, 'tsconfig.app.json') });
      const clientBinding = bindBuild(clientBuild, clientFile, '1153-client-entry.jsx', clientEntry, core);
      const dist = path.join(root, 'dist'), css = [];
      const builtIndex = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
      for (const tag of builtIndex.matchAll(/<link\b[^>]*>/g)) if (/\brel=["']stylesheet["']/.test(tag[0])) {
        const href = tag[0].match(/\bhref=["']([^"']+)["']/)?.[1];
        assert(href && href.startsWith('/assets/') && href.endsWith('.css'));
        const bytes = fs.readFileSync(path.join(dist, href.slice(1)));
        css.push({ url: href, sha256: hash(bytes), bytes: bytes.length });
      }
      assert(css.length > 0, 'Actual built application CSS used by the component fixture');
      const html = `<!doctype html><html class="dark"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">${css.map(c => `<link rel="stylesheet" href="${c.url}">`).join('')}</head><body class="bg-background text-foreground"><main id="fixture-root" class="mx-auto max-w-2xl p-4"></main><script type="module">import{mount}from'/fixture.js';mount(window.__skillsFixture);</script></body></html>`;
      fs.writeFileSync(path.join(browserDir, 'index.html'), html);
      save(path.join(variantOut, 'fixture-build.json'), { scope: 'Actual XpScreen direct component, not ClubManager route or saves', engine: engineBinding, client: clientBinding, css, htmlSha256: hash(Buffer.from(html)) });
      const records = [], payloadDir = path.join(variantOut, 'served-payloads'); fs.mkdirSync(payloadDir);
      const server = http.createServer((req, res) => {
        try {
          assert.equal(req.method, 'GET');
          const requestPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
          const source = requestPath === '/' ? 'component-fixture' : ['/fixture.js', '/fixture.js.map'].includes(requestPath) ? 'component-bundle' : 'candidate-dist';
          const file = source === 'component-fixture' ? path.join(browserDir, 'index.html') : source === 'component-bundle' ? path.join(browserDir, requestPath.slice(1)) : path.resolve(dist, requestPath.slice(1));
          assert(source !== 'candidate-dist' || file.startsWith(dist + path.sep));
          const bytes = fs.readFileSync(file), sha256 = hash(bytes);
          fs.writeFileSync(path.join(payloadDir, sha256), bytes);
          records.push({ method: req.method, url: requestPath, file, source, sha256, bytes: bytes.length });
          save(path.join(variantOut, 'served.json'), records);
          const ext = path.extname(file);
          res.writeHead(200, { 'Content-Type': ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json' })[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(bytes);
        } catch (error) { records.push({ method: req.method, url: req.url, error: String(error) }); save(path.join(variantOut, 'served.json'), records); res.writeHead(404); res.end('Unavailable'); }
      });
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); servers.push(server);
      const origin = 'http://127.0.0.1:' + server.address().port;
      const cases = variant === 'candidate' ? [[320, 'tactics'], [1280, 'tactics'], [320, 'finance'], [1280, 'finance'], [320, 'zero'], [320, 'full']] : [[320, 'duplicate'], [1280, 'duplicate']];
      for (const [width, action] of cases) {
        const name = variant + '-' + width + '-' + action, dir = path.join(out, name); fs.mkdirSync(dir);
        const fixture = clone(careerTemplate), block = xp.defaultXp();
        block.xp = action === 'zero' ? 0 : xp.xpForLevel(action === 'full' ? 8 : 3);
        if (action === 'full') block.points.tactics = xp.MAX_TREE_POINTS;
        fixture.managerXp = block;
        assert(xp.isValidXp(block)); assert.equal(xp.pointsFree(block), action === 'zero' ? 0 : 2);
        assert.deepEqual(Object.keys(block.points).sort(), [...trees].sort());
        assert(trees.every(tree => block.points[tree] === (action === 'full' && tree === 'tactics' ? 5 : 0)));
        save(path.join(dir, 'actual-engine-fixture.json'), fixture);
        const row = { name, variant, width, action, fixtureSha256: hash(fs.readFileSync(path.join(dir, 'actual-engine-fixture.json'))), status: 'failed', pageErrors: [], localFailures: [], localRequests: [], blocked: [], sockets: [], checks: {} };
        let context, page;
        const snapshot = async stage => {
          const board = page.locator('[data-cm-xp]');
          const data = await board.evaluate(el => ({ html: el.outerHTML, text: el.innerText, rows: [...el.querySelectorAll('.grid > div')].map((node, index) => ({ index, text: node.innerText, className: node.className, button: { text: node.querySelector('button').textContent, className: node.querySelector('button').className, label: node.querySelector('button').getAttribute('aria-label'), title: node.querySelector('button').title, disabled: node.querySelector('button').disabled } })) }));
          data.aria = await board.ariaSnapshot(); data.state = await page.evaluate(() => window.__skills1153.snapshot());
          data.geometry = await board.evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.x, width: r.width, documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth }; });
          data.clock = await page.evaluate(() => ({ dateNow: Date.now(), performanceNow: performance.now() }));
          save(path.join(dir, stage + '.json'), data); await board.screenshot({ path: path.join(dir, stage + '.png') }); return data;
        };
        const assertNamed = async (tree, have = 0, full = false) => {
          const text = full ? 'Full' : `Spend a point (${have}/5)`;
          const name = text + ': ' + treeLabels[trees.indexOf(tree)];
          const button = page.getByRole('button', { name, exact: true });
          assert.equal(await button.count(), 1, 'Exactly one native skill button named ' + name);
          assert.equal(await button.textContent(), text); return button;
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
          await context.addInitScript(fixture => { window.__skillsFixture = fixture; }, fixture);
          page = await context.newPage(); await page.clock.install({ time: epoch - 1000 }); await page.clock.pauseAt(epoch);
          page.on('pageerror', error => row.pageErrors.push({ name: error.name, message: error.message, stack: error.stack }));
          page.on('requestfailed', request => { if (request.url().startsWith(origin + '/')) row.localFailures.push({ url: request.url(), error: request.failure() }); });
          page.on('response', response => { if (response.url().startsWith(origin + '/') && response.status() >= 400) row.localFailures.push({ url: response.url(), status: response.status() }); });
          await page.goto(origin, { waitUntil: 'networkidle' }); await page.locator('[data-cm-xp]').waitFor();
          row.before = await snapshot('before'); assert.equal(row.before.rows.length, 7);
          assert.deepEqual(row.before.state.career, fixture); assert.equal(row.before.state.calls.length, 0);
          assert.equal(row.before.state.free, action === 'zero' ? 0 : 2);
          if (action === 'duplicate') {
            assert.equal(await page.getByRole('button', { name: 'Spend a point (0/5)', exact: true }).count(), 7);
            let intendedFailure;
            try { await assertNamed('tactics'); } catch (error) { intendedFailure = error; }
            assert(intendedFailure); assert.equal(intendedFailure.name, 'AssertionError'); assert.equal(intendedFailure.actual, 0); assert.equal(intendedFailure.expected, 1);
            assert(intendedFailure.message.includes('Exactly one native skill button named Spend a point (0/5): Tactics'));
            row.intendedNameFailure = { name: intendedFailure.name, message: intendedFailure.message, actual: intendedFailure.actual, expected: intendedFailure.expected };
            assert(row.before.rows.every(r => r.button.label === null && r.button.text === 'Spend a point (0/5)' && !r.button.disabled));
            row.checks = { duplicateNames: 7, desiredNamedActionCount: 0, intendedNameAssertionFailed: true, unrelatedFullStateBaselinePassed: true };
          } else {
            for (const tree of trees) await assertNamed(tree, action === 'full' && tree === 'tactics' ? 5 : 0, action === 'full' && tree === 'tactics');
            if (action === 'zero' || action === 'full') {
              const target = await assertNamed('tactics', action === 'full' ? 5 : 0, action === 'full');
              assert(await target.isDisabled());
              assert.equal(xp.spendSkillPoint(fixture, 'tactics'), null, 'Held helper refuses the disabled spend');
              if (action === 'zero') assert(row.before.rows.every(r => r.button.disabled));
              else assert(await (await assertNamed('finance')).isEnabled());
              row.after = await snapshot('after'); assert.deepEqual(row.after.state, row.before.state);
              row.checks = { disabledTarget: true, allSevenDisabled: action === 'zero', fullTree: action === 'full', heldHelperRefused: true, completeStateUnchanged: true };
            } else {
              const button = await assertNamed(action); assert(await button.isEnabled());
              await button.focus(); assert(await button.evaluate(el => el === document.activeElement)); await button.press('Enter');
              await page.getByRole('button', { name: 'Spend a point (1/5): ' + treeLabels[trees.indexOf(action)], exact: true }).waitFor();
              row.after = await snapshot('after');
              const expected = xp.spendSkillPoint(row.before.state.career, action); assert(expected); assert.notDeepEqual(expected, row.before.state.career);
              save(path.join(dir, 'expected-held-helper-state.json'), expected);
              row.expectedStateSha256 = hash(fs.readFileSync(path.join(dir, 'expected-held-helper-state.json')));
              assert.deepEqual(row.after.state.career, expected); assert.deepEqual(row.after.state.calls, [action]);
              assert.equal(row.after.state.free, 1); assert.equal(row.after.state.career.managerXp.points[action], 1);
              for (const tree of trees) if (tree !== action) assert.equal(row.after.state.career.managerXp.points[tree], row.before.state.career.managerXp.points[tree]);
              assert.equal(row.after.state.career.managerXp.xp, row.before.state.career.managerXp.xp);
              assert.equal(row.after.clock.dateNow, epoch); assert.equal(row.after.clock.performanceNow, row.before.clock.performanceNow);
              for (const tree of trees) await assertNamed(tree, tree === action ? 1 : 0);
              row.checks = { actualEnter: true, actionCalls: 1, intendedTree: action, freeBefore: 2, freeAfter: 1, selectedBefore: 0, selectedAfter: 1, otherTreesHeld: true, xpHeld: true, fullHeldHelperStateEqual: true };
            }
          }
          assert(row.before.geometry.documentWidth <= width);
          const requested = new Set(row.localRequests.filter(r => r.method === 'GET').map(r => r.url));
          assert(requested.has('/fixture.js'), 'Case loaded actual component bundle');
          for (const style of css) assert(requested.has(style.url), 'Case loaded actual built application CSS');
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
      const base = results.find(r => r.name === 'base-' + width + '-duplicate'), candidate = results.find(r => r.name === 'candidate-' + width + '-tactics');
      assert(base && candidate);
      const visible = data => data.rows.map(({ button, ...row }) => ({ ...row, button: { text: button.text, className: button.className, title: button.title, disabled: button.disabled } }));
      assert.deepEqual(visible(candidate.before), visible(base.before)); assert.deepEqual(candidate.before.state, base.before.state);
      assert.equal(candidate.before.geometry.width, base.before.geometry.width); assert.equal(candidate.before.geometry.documentWidth, base.before.geometry.documentWidth);
    }
    assert.equal(results.filter(r => r.variant === 'candidate').length, 6); assert.equal(results.filter(r => r.variant === 'base').length, 2);
    assert(results.every(r => r.status === 'passed'));
  } finally {
    await browser.close();
    for (const server of servers) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
  save(path.join(out, 'summary.json'), { executionComplete: true, healthy: 6, effectiveBaseControls: 2, variants, results, scope: 'Direct actual XpScreen component and actual held XP helper, not ClubManager route or save persistence' });
  console.log('Native1153 PASS: six actual candidate component cases and two untouched-parent name controls. Native Enter spent the named tree only, with full held-helper consequences, zero/full refusals and all seven current names.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
NATIVE_WORKER
run syntax 30 bash -euo pipefail -c 'bash -n .rc/x/cm-skill-button-names-1153.sh; node --check "$E/native-worker.mjs"; printf "%s\n" "25360dd2232551eb7b90b8bdade2f18e535b20c3d9297cc9101333e825576b80  $E/native-worker.mjs" | sha256sum -c -'
run base-prepare 60 bash -euo pipefail -c '
  mkdir -p "$BASE_ROOT"
  git archive "$BASE_HEAD" | tar -xf - -C "$BASE_ROOT"
  ln -s "$PWD/node_modules" "$BASE_ROOT/node_modules"
  git ls-tree -r --name-only "$BASE_HEAD" > "$E/base-paths.txt"
  (cd "$BASE_ROOT"; while IFS= read -r file; do sha256sum "$file"; done < "$E/base-paths.txt") > "$E/base-source-before.sha256"
  find "$BASE_ROOT/src" "$BASE_ROOT/scripts" "$BASE_ROOT/.github" "$BASE_ROOT/public" -type f | sort > "$E/base-authored-paths-before.txt"
  git archive "$BASE_HEAD" -- src/components/club-manager/XpScreen.tsx src/lib/clubManager.ts src/lib/clubManagerXp.ts src/lib/gmXp.ts src/lib/utils.ts src/components/club-manager/Celebration.tsx src/components/club-manager/CelebrationStyles.tsx src/index.css > "$E/base-core-source.tar"
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
if test "${gates[syntax]}" = 0 && test "${gates[types]}" = 0 && test "${gates[base-types]}" = 0 && test "${gates[build-hold]}" = 0 && test "${gates[runtime]}" = 0; then
  run native 240 env NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" node "$E/native-worker.mjs"
else skip native; fi
if test "${gates[native]}" = 0; then
  run native-receipts 60 node --input-type=module - <<'NODE'
import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import {createHash} from 'node:crypto';
const digest=b=>createHash('sha256').update(b).digest('hex'), read=f=>JSON.parse(fs.readFileSync(f)), out=process.env.E+'/native';
const summary=read(out+'/summary.json');
const expected=['candidate-320-tactics','candidate-1280-tactics','candidate-320-finance','candidate-1280-finance','candidate-320-zero','candidate-320-full','base-320-duplicate','base-1280-duplicate'];
assert.equal(summary.executionComplete,true); assert.equal(summary.healthy,6); assert.equal(summary.effectiveBaseControls,2);
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
    assert.equal(binding.requiredCore.length,kind==='engine'?3:4);
    assert.deepEqual([...seen].sort(),[...binding.requiredCore].sort());
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
    assert.deepEqual(row.before,read(out+'/'+row.name+'/before.json')); assert.equal(row.before.rows.length,7);
    for(const request of row.localRequests) assert(served.some(r=>r.url===request.url&&r.method===request.method));
    const script=served.filter(r=>r.url==='/fixture.js'); assert(script.length>0); assert(script.every(r=>r.sha256===proof.client.jsSha256));
    assert(row.localRequests.some(r=>r.url==='/fixture.js'&&r.method==='GET'));
    for(const css of proof.css) assert(row.localRequests.some(r=>r.url===css.url&&r.method==='GET')&&served.some(r=>r.url===css.url&&r.sha256===css.sha256));
    if(row.action==='tactics'||row.action==='finance') {
      assert.equal(digest(fs.readFileSync(out+'/'+row.name+'/expected-held-helper-state.json')),row.expectedStateSha256);
      assert.deepEqual(row.after,read(out+'/'+row.name+'/after.json')); assert.deepEqual(row.after.state.career,read(out+'/'+row.name+'/expected-held-helper-state.json'));
      assert.deepEqual(row.after.state.calls,[row.action]); assert.equal(row.before.state.free,2); assert.equal(row.after.state.free,1);
    } else if(row.action==='duplicate') {
      assert.equal(row.intendedNameFailure.name,'AssertionError'); assert.equal(row.intendedNameFailure.actual,0); assert.equal(row.intendedNameFailure.expected,1);
      assert.equal(row.checks.duplicateNames,7); assert.equal(row.checks.unrelatedFullStateBaselinePassed,true);
    } else {
      assert.deepEqual(row.after,read(out+'/'+row.name+'/after.json')); assert.deepEqual(row.after.state,row.before.state); assert.equal(row.checks.heldHelperRefused,true);
    }
  }
}
console.log('All eight exact actual component rows, complete raw states/helper consequences, parent controls, source/input/maps and served payload hashes are retained.');
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
  (cd "$BASE_ROOT"; sha256sum --quiet -c "$E/base-source-before.sha256")
  find "$BASE_ROOT/src" "$BASE_ROOT/scripts" "$BASE_ROOT/.github" "$BASE_ROOT/public" -type f | sort > "$E/base-authored-paths-close.txt"; cmp "$E/base-authored-paths-before.txt" "$E/base-authored-paths-close.txt"


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
const expected=['identity','locked-packages','runtime','brand-runtime','syntax','base-prepare','types','base-types','build','build-hold','native','native-receipts',...process.env.READERS.split(',').map(x=>'reader-'+x),'reader-receipts','closing','dependency-cache-hold'];
const entries=fs.readFileSync(process.env.E+'/gates.tsv','utf8').trim().split('\n').map(x=>x.split('\t'));
fs.writeFileSync(process.env.E+'/strict-gates.json',JSON.stringify({expected,actual:entries},null,2));
assert.deepEqual(entries.map(x=>x[0]),expected); assert(entries.every(x=>x[1]==='0'));
console.log('Every actual named preparation/native/base-control/reader/source/dependency/build gate succeeded.');
NODE
execution_complete=1
exit "$failed"
