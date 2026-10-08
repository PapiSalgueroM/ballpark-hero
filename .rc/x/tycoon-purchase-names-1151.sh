#!/usr/bin/env bash
# Remote-only native proof for named Legacy purchases. No application edits.
set -uo pipefail
test "${GITHUB_ACTIONS:-}" = true || exit 2
test -n "${RC_OUT:-}" && test -n "${RUNNER_TEMP:-}" || exit 2
BASE_HEAD=c623e77d22541ac88c30f48b078a9a8a9c699e1d
CHECKED_HEAD=e729073b4cdf133cacd92a821da9c547be0ba91f
CHECKED_TREE=b5dd694a9679fb63bb2cc6dee55b6b70a37b8de8
REQUEST_HEAD=$(git rev-parse HEAD)
WORK=$(mktemp -d "$RUNNER_TEMP/purchase-1151.XXXXXX") || exit 2
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
  archive="$WORK/tycoon-purchase-1151-evidence.tar.xz"
  timeout -k 10 180 tar -c -I "xz -T2 -8" -f "$archive" -C "$E" .; packed=$?
  bytes=$(stat -c %s "$archive" 2>/dev/null || echo unavailable)
  if test "$packed" = 0 && test "$bytes" -le 24000000; then
    timeout -k 10 30 cp "$archive" "$RC_OUT/tycoon-purchase-1151-evidence.tar.xz" || failed=1
    timeout -k 10 20 sha256sum "$RC_OUT/tycoon-purchase-1151-evidence.tar.xz" > "$RC_OUT/evidence.sha256" || failed=1
    printf 'checked=%s\nrequest=%s\nbytes=%s\nfailed=%s\nexecution_complete=%s\nending=%s\n' "$CHECKED_HEAD" "$REQUEST_HEAD" "$bytes" "$failed" "$execution_complete" "$ending" > "$RC_OUT/receipt.txt" || failed=1
  else
    printf 'EVIDENCE CAP FAILURE: pack_exit=%s bytes=%s limit=24000000; full payload retained only at runner path %s, no truncated evidence accepted.\n' "$packed" "$bytes" "$archive" | tee "$RC_OUT/EVIDENCE-CAP-FAILURE.txt"
    failed=1
  fi
  printf 'Legacy purchase1151 strict label: failed=%s, complete=%s, source=%s, request=%s.\n' "$failed" "$execution_complete" "$CHECKED_HEAD" "$REQUEST_HEAD"
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
  printf "%s\n" .github/workflows/lane-remote-check.yml .rc/request.txt .rc/run.sh .rc/x/tycoon-purchase-names-1151.sh | LC_ALL=C sort > "$E/allowed-overlay.txt"
  git diff --name-only --no-renames "$CHECKED_HEAD" HEAD | LC_ALL=C sort > "$E/actual-overlay.txt"
  cmp "$E/allowed-overlay.txt" "$E/actual-overlay.txt"
  printf "%s\n" "62747f1b8991b3c6aa56c08d4d6d9756a52f34d74c117010c0fdff464de0730e  .rc/request.txt" "668aeb520674d130f1af2e88494775afff6b8055d9911c715a8b646056b4b62f  .rc/run.sh" "447a4eca8616f708831ec5e6b7bf90ba68afc606054c0e0d0b27b4cb84abec20  .github/workflows/lane-remote-check.yml" > "$E/reviewed-kit.sha256"
  sha256sum -c "$E/reviewed-kit.sha256"
  sha256sum .rc/x/tycoon-purchase-names-1151.sh > "$E/dispatched-shell.sha256"
  printf "%s\n" "dc1bceef15fa8691d7b9d02b63b1d0dc59216e64b8824f5ec94c25ffb8c66beb  src/pages/StadiumTycoon.tsx" > "$E/reviewed-source.sha256"
  sha256sum -c "$E/reviewed-source.sha256"
  printf "%s\n" docs/PROJECT-STATE.md src/pages/StadiumTycoon.tsx | LC_ALL=C sort > "$E/allowed-candidate.txt"
  git diff --name-only --no-renames "$BASE_HEAD" "$CHECKED_HEAD" | LC_ALL=C sort > "$E/actual-candidate.txt"
  cmp "$E/allowed-candidate.txt" "$E/actual-candidate.txt"
  git rev-parse HEAD HEAD^ "HEAD^{tree}" > "$E/identity.txt"
  git ls-tree -r HEAD > "$E/git-runtime-manifest.txt"
  git ls-tree -r "$CHECKED_HEAD" > "$E/git-checked-manifest.txt"
  git ls-tree -r "$BASE_HEAD" > "$E/git-base-manifest.txt"
  git ls-files -z > "$E/runtime-paths.nul"
  git ls-files -z | sort -z | xargs -0 sha256sum > "$E/source-before.sha256"
  git diff "$BASE_HEAD" "$CHECKED_HEAD" -- src/pages/StadiumTycoon.tsx > "$E/page-only.diff"
  command -v xz; xz --version
  selected=(
    src/pages/StadiumTycoon.tsx src/hooks/useStadiumTycoon.ts src/lib/stadiumTycoon.ts src/components/tycoon/TicketPolicyCard.tsx src/main.tsx
    src/lib/leagueCore.ts src/lib/tycoonRewards.ts src/hooks/useOwnedTimeouts.ts src/lib/wonderkidFactory.ts src/components/tycoon/TycoonPitch.tsx src/components/CookieConsent.tsx
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

const hash = value => createHash('sha256').update(value).digest('hex');
const save = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2));

async function main() {
  assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Remote-only worker');
  const out = path.join(process.env.E, 'native');
  fs.mkdirSync(out, { recursive: true });
  const candidateRoot = process.cwd(), baseRoot = process.env.BASE_ROOT;
  const require = createRequire(path.join(candidateRoot, 'package.json'));
  const { chromium } = require('playwright'), { build } = require('esbuild');
  const epoch = Date.UTC(2026, 0, 1, 12);
  const core = ['src/pages/StadiumTycoon.tsx', 'src/hooks/useStadiumTycoon.ts', 'src/lib/stadiumTycoon.ts', 'src/components/tycoon/TicketPolicyCard.tsx', 'src/main.tsx'];
  const executable = chromium.executablePath(); assert(executable.startsWith(process.env.PLAYWRIGHT_BROWSERS_PATH + path.sep));
  const servers = [], browser = await chromium.launch({ headless: true, executablePath: executable });
  save(path.join(out, 'browser-runtime.json'), { version: browser.version(), executablePath: executable, executableSha256: hash(fs.readFileSync(executable)), privateCache: process.env.PLAYWRIGHT_BROWSERS_PATH });
  const results = [];
  try {
    for (const [variant, root] of [['candidate', candidateRoot], ['base', baseRoot]]) {
      const variantOut = path.join(out, variant); fs.mkdirSync(variantOut, { recursive: true });
      const bundle = path.join(variantOut, 'actual-engine.mjs');
      await build({ absWorkingDir: root, entryPoints: ['src/lib/stadiumTycoon.ts'], outfile: bundle, bundle: true, platform: 'node', format: 'esm', tsconfig: 'tsconfig.app.json' });
      const engine = await import(pathToFileURL(bundle).href);
      const zeroPerks = Object.fromEntries(engine.LEGACY_PERKS.map(p => [p.id, 0]));
      assert.deepEqual(Object.keys(zeroPerks).sort(), ['away', 'charm', 'payroll', 'rolling', 'roots', 'shield', 'sway', 'voltage']);
      assert(Object.values(zeroPerks).every(level => level === 0));
      const dist = path.join(root, 'dist'), records = [], maps = [], seen = new Set();
      for (const name of fs.readdirSync(path.join(dist, 'assets')).filter(n => n.endsWith('.map'))) {
        const raw = fs.readFileSync(path.join(dist, 'assets', name)), map = JSON.parse(raw), bindings = [];
        assert.equal(map.sources.length, map.sourcesContent.length);
        for (let i = 0; i < map.sources.length; i++) for (const source of core) if (map.sources[i].replaceAll('\\', '/').endsWith('/' + source)) {
          assert.equal(hash(Buffer.from(map.sourcesContent[i])), hash(fs.readFileSync(path.join(root, source))), source);
          seen.add(source); bindings.push({ source, sha256: hash(fs.readFileSync(path.join(root, source))) });
        }
        if (!bindings.length) continue;
        const jsName = name.slice(0, -4), js = fs.readFileSync(path.join(dist, 'assets', jsName));
        assert(js.toString().includes('//# sourceMappingURL=' + name));
        fs.mkdirSync(path.join(variantOut, 'core-dist', 'assets'), { recursive: true });
        for (const file of [name, jsName]) fs.copyFileSync(path.join(dist, 'assets', file), path.join(variantOut, 'core-dist', 'assets', file));
        maps.push({ map: name, mapSha256: hash(raw), url: '/assets/' + jsName, jsSha256: hash(js), bindings });
      }
      assert.deepEqual([...seen].sort(), [...core].sort()); save(path.join(variantOut, 'core-maps.json'), maps);
      fs.copyFileSync(path.join(dist, 'index.html'), path.join(variantOut, 'built-spa-index.html'));
      const payloadDir = path.join(variantOut, 'served-payloads'); fs.mkdirSync(payloadDir);
      const server = http.createServer((req, res) => {
        try {
          assert.equal(req.method, 'GET');
          const url = new URL(req.url, 'http://localhost'), requestPath = decodeURIComponent(url.pathname);
          const relative = requestPath === '/stadium-tycoon' || requestPath === '/stadium-tycoon/' ? 'index.html' : requestPath.replace(/^\/+/, '');
          const file = path.resolve(dist, relative);
          assert(file.startsWith(dist + path.sep));
          const bytes = fs.readFileSync(file), sha256 = hash(bytes);
          fs.writeFileSync(path.join(payloadDir, sha256), bytes);
          records.push({ method: req.method, url: requestPath, file: path.relative(dist, file).replaceAll('\\', '/'), sha256, bytes: bytes.length, delivery: relative === 'index.html' ? 'built-spa' : 'dist-file' });
          const ext = path.extname(file), contentType = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' }[ext] || 'application/octet-stream';
          res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-store' }); res.end(bytes);
        } catch (error) { records.push({ method: req.method, url: req.url, error: String(error) }); res.writeHead(404); res.end('Unavailable'); }
      });
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); servers.push(server);
      const origin = 'http://127.0.0.1:' + server.address().port;
      const cases = variant === 'candidate'
        ? [[320, 'rolling'], [1280, 'rolling'], [320, 'roots'], [1280, 'roots'], [320, 'disabled'], [320, 'maxed']]
        : [[320, 'duplicate'], [1280, 'duplicate']];
      for (const [width, action] of cases) {
        const name = variant + '-' + width + '-' + action, dir = path.join(out, name); fs.mkdirSync(dir);
        const fixture = engine.newTycoon(epoch); fixture.legacyPoints = action === 'disabled' ? 0 : 3;
        if (action === 'maxed') fixture.legacyPerks = Object.fromEntries(engine.LEGACY_PERKS.map(p => [p.id, p.costs.length]));
        const originalRaw = engine.serializeTycoon(fixture, epoch); fs.writeFileSync(path.join(dir, 'original-engine-fixture.json'), originalRaw);
        const canonical = engine.deserializeTycoon(originalRaw, epoch); assert(canonical);
        const expectedPerks = action === 'maxed' ? fixture.legacyPerks : zeroPerks;
        assert.equal(canonical.legacyPoints, action === 'disabled' ? 0 : 3); assert.deepEqual(canonical.legacyPerks, expectedPerks);
        const raw = engine.serializeTycoon(canonical, epoch), restored = engine.deserializeTycoon(raw, epoch);
        assert(restored); assert.deepEqual(restored, canonical);
        fs.writeFileSync(path.join(dir, 'engine-fixture.json'), raw);
        const row = { name, variant, width, action, fixtureSha256: hash(raw), status: 'failed', pageErrors: [], localFailures: [], localRequests: [], blocked: [], sockets: [], checks: {} };
        let context, page;
        const snapshot = async label => {
          const board = page.locator('[data-legacy-board]');
          const data = await board.evaluate(el => ({ html: el.outerHTML, text: el.innerText, rows: [...el.querySelectorAll('[data-perk]')].map(node => ({ id: node.getAttribute('data-perk'), text: node.innerText, className: node.className, button: node.querySelector('button') ? { text: node.querySelector('button').textContent, className: node.querySelector('button').className, label: node.querySelector('button').getAttribute('aria-label'), disabled: node.querySelector('button').disabled } : null })) }));
          data.aria = await board.ariaSnapshot(); data.rawSave = await page.evaluate(key => localStorage.getItem(key), engine.TYCOON_SAVE_KEY);
          data.clock = await page.evaluate(() => ({ dateNow: Date.now(), performanceNow: performance.now() })); assert.equal(data.clock.dateNow, epoch);
          data.geometry = await board.evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.x, width: r.width, documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth }; });
          save(path.join(dir, label + '.json'), data); await board.screenshot({ path: path.join(dir, label + '.png') }); return data;
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
          await context.addInitScript(({ raw, key }) => { localStorage.setItem(key, raw); localStorage.setItem('cookie-consent', 'essential'); }, { raw, key: engine.TYCOON_SAVE_KEY });
          page = await context.newPage();
          await page.clock.install({ time: epoch - 1000 }); await page.clock.pauseAt(epoch);
          page.on('pageerror', error => row.pageErrors.push({ name: error.name, message: error.message, stack: error.stack }));
          page.on('requestfailed', request => { if (request.url().startsWith(origin + '/')) row.localFailures.push({ url: request.url(), error: request.failure() }); });
          page.on('response', response => { if (response.url().startsWith(origin + '/') && response.status() >= 400) row.localFailures.push({ url: response.url(), status: response.status() }); });
          await page.goto(origin + '/stadium-tycoon', { waitUntil: 'networkidle' });
          await page.getByRole('heading', { name: 'STADIUM TYCOON', exact: true }).waitFor();
          await page.locator('[data-office-panel="legacy"]').click();
          await page.locator('[data-legacy-board]').waitFor();
          row.before = await snapshot('before'); assert.equal(row.before.rows.length, 8);
          const rollingName = 'Buy Rolling Investment, level 1, 1 pt', rootsName = 'Buy Deep Roots, level 1, 1 pt';
          const assertNamed = async name => {
            const button = page.getByRole('button', { name, exact: true });
            assert.equal(await button.count(), 1, 'Exactly one native purchase button named ' + name);
            assert.equal(await button.textContent(), '1 pt');
          };
          if (action === 'duplicate') {
            assert.equal(await page.locator('[data-legacy-board]').getByRole('button', { name: '1 pt', exact: true }).count(), 2);
            assert.equal(await page.getByRole('button', { name: rollingName, exact: true }).count(), 0);
            assert.equal(await page.getByRole('button', { name: rootsName, exact: true }).count(), 0);
            let intendedFailure;
            try { await assertNamed(rollingName); } catch (error) { intendedFailure = error; }
            assert(intendedFailure); assert.equal(intendedFailure.name, 'AssertionError'); assert.equal(intendedFailure.actual, 0); assert.equal(intendedFailure.expected, 1);
            assert(intendedFailure.message.includes('Exactly one native purchase button named ' + rollingName));
            row.intendedNameFailure = { name: intendedFailure.name, message: intendedFailure.message, actual: intendedFailure.actual, expected: intendedFailure.expected };
            assert(row.before.rows.filter(r => r.id === 'rolling' || r.id === 'roots').every(r => r.button.text === '1 pt' && r.button.label === null && !r.button.disabled));
            const actual = engine.deserializeTycoon(row.before.rawSave, epoch); assert(actual); assert.equal(actual.legacyPoints, 3); assert.deepEqual(actual.legacyPerks, zeroPerks);
            row.checks = { unchangedBase: true, duplicateNames: 2, namedPerkButtons: 0, intendedNameContractFailed: true, unrelatedBoardAndSaveBaselinePassed: true };
          } else if (action === 'maxed') {
            assert.equal(await page.locator('[data-legacy-board] button').count(), 0);
            assert(row.before.rows.every(r => r.text.includes('MAXED') && r.button === null));
            for (const p of engine.LEGACY_PERKS) assert.equal(engine.perkCostOf(restored, p.id), null);
            row.checks = { maxedRows: 8, purchaseButtons: 0 };
          } else {
            for (const name of [rollingName, rootsName]) await assertNamed(name);
            if (action === 'disabled') {
              assert(await page.getByRole('button', { name: rollingName, exact: true }).isDisabled()); assert(await page.getByRole('button', { name: rootsName, exact: true }).isDisabled());
              row.after = await snapshot('after'); const actual = engine.deserializeTycoon(row.after.rawSave, epoch); assert.equal(actual.legacyPoints, 0); assert.deepEqual(actual.legacyPerks, zeroPerks);
              row.checks = { namedDisabledButtons: 2, points: 0, noPerkBought: true };
            } else {
              const name = action === 'rolling' ? rollingName : rootsName, button = page.getByRole('button', { name, exact: true }); assert(await button.isEnabled());
              await button.focus(); assert(await button.evaluate(el => el === document.activeElement)); await button.press('Enter');
              const nextName = action === 'rolling' ? 'Buy Rolling Investment, level 2, 2 pts' : 'Buy Deep Roots, level 2, 3 pts';
              const next = page.getByRole('button', { name: nextName, exact: true }); await next.waitFor();
              const before = engine.deserializeTycoon(row.before.rawSave, epoch); assert(before);
              const expected = engine.buyPerk(before, action); assert.notDeepEqual(expected, before);
              const expectedRaw = engine.serializeTycoon(expected, epoch); fs.writeFileSync(path.join(dir, 'expected-engine-save.json'), expectedRaw);
              row.after = await snapshot('after'); const actual = engine.deserializeTycoon(row.after.rawSave, epoch); assert(actual);
              assert.equal(row.after.clock.performanceNow, row.before.clock.performanceNow); assert.deepEqual(actual, expected);
              row.expectedEngineSaveSha256 = hash(expectedRaw);
              assert.equal(actual.legacyPoints, 2); assert.equal(engine.perkLevelOf(actual, action), 1); assert.equal(engine.perkLevelOf(actual, action === 'rolling' ? 'roots' : 'rolling'), 0);
              assert.equal(engine.perkCostOf(actual, action), action === 'rolling' ? 2 : 3); assert.equal(await next.isDisabled(), action === 'roots');
              row.checks = { enterActivated: true, pointsBefore: 3, pointsAfter: 2, selectedLevel: 1, otherLevel: 0, nextCost: action === 'rolling' ? 2 : 3, nextDisabled: action === 'roots' };
            }
          }
          const requested = new Set(row.localRequests.filter(r => r.method === 'GET').map(r => r.url));
          for (const map of maps) assert(requested.has(map.url), 'Case loaded actual core built JS: ' + map.url);
          row.status = 'passed';
        } catch (error) { row.error = { name: error.name, message: error.message, stack: error.stack }; }
        finally {
          if (context) try { await context.close(); } catch (error) { row.closeError = String(error); row.status = 'failed'; }
          if (row.pageErrors.length || row.localFailures.length) row.status = 'failed';
          save(path.join(dir, 'result.json'), row); results.push(row);
          save(path.join(out, 'partial-summary.json'), { executionComplete: false, results });
        }
      }
      save(path.join(variantOut, 'served.json'), records);
      assert(records.every(r => !r.error));
      for (const row of results.filter(r => r.variant === variant)) for (const req of row.localRequests) assert(records.some(r => r.url === req.url && r.method === req.method && !r.error));
    }
    for (const width of [320, 1280]) {
      const base = results.find(r => r.name === 'base-' + width + '-duplicate'), candidate = results.find(r => r.name === 'candidate-' + width + '-rolling');
      assert(base && candidate); assert.deepEqual(candidate.before.rows.map(({ button, ...r }) => ({ ...r, button: button && { text: button.text, className: button.className, disabled: button.disabled } })), base.before.rows.map(({ button, ...r }) => ({ ...r, button: button && { text: button.text, className: button.className, disabled: button.disabled } })));
      assert.equal(candidate.before.geometry.width, base.before.geometry.width); assert.equal(candidate.before.geometry.documentWidth, base.before.geometry.documentWidth);
    }
    assert.equal(results.filter(r => r.variant === 'candidate').length, 6); assert.equal(results.filter(r => r.variant === 'base').length, 2); assert(results.every(r => r.status === 'passed'));
    save(path.join(out, 'summary.json'), { executionComplete: true, healthy: 6, effectiveBaseControls: 2, results });
    console.log('Native1151 PASS: six actual candidate cases and two unchanged-base name controls. Enter purchases persist real selected perk and actual next costs.');
  } finally { await browser.close(); for (const server of servers) await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
NATIVE_WORKER
run syntax 30 bash -euo pipefail -c 'bash -n .rc/x/tycoon-purchase-names-1151.sh; node --check "$E/native-worker.mjs"; printf "%s\n" "5eed027d4abc573ac0d5cb1516ea87110994f7a0888d1fdb5129e2624df3c649  $E/native-worker.mjs" | sha256sum -c -'
run base-prepare 60 bash -euo pipefail -c '
  mkdir -p "$BASE_ROOT"
  git archive "$BASE_HEAD" | tar -xf - -C "$BASE_ROOT"
  ln -s "$PWD/node_modules" "$BASE_ROOT/node_modules"
  git ls-tree -r --name-only "$BASE_HEAD" > "$E/base-paths.txt"
  (cd "$BASE_ROOT"; while IFS= read -r file; do sha256sum "$file"; done < "$E/base-paths.txt") > "$E/base-source-before.sha256"
  find "$BASE_ROOT/src" "$BASE_ROOT/scripts" "$BASE_ROOT/.github" "$BASE_ROOT/public" -type f | sort > "$E/base-authored-paths-before.txt"
  git archive "$BASE_HEAD" -- src/pages/StadiumTycoon.tsx src/hooks/useStadiumTycoon.ts src/lib/stadiumTycoon.ts src/components/tycoon/TicketPolicyCard.tsx src/main.tsx > "$E/base-core-source.tar"
'
run types 120 node_modules/.bin/tsc --noEmit -p tsconfig.app.json
run base-types 120 bash -euo pipefail -c 'cd "$BASE_ROOT"; node_modules/.bin/tsc --noEmit -p tsconfig.app.json'
run build 180 env NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" npm run build -- --sourcemap
run base-build 180 bash -euo pipefail -c 'cd "$BASE_ROOT"; NODE_OPTIONS="--require=$BASE_ROOT/scripts/lib/offlineTransport.cjs" npm run build -- --sourcemap'
if test "${gates[build]}" = 0 && test "${gates[base-build]}" = 0; then
  run build-hold 30 bash -euo pipefail -c '
    sha256sum --quiet -c "$E/source-before.sha256"; git diff --exit-code HEAD
    (cd "$BASE_ROOT"; sha256sum --quiet -c "$E/base-source-before.sha256")
    find dist -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dist-before.sha256"
    find dist -type l -printf "%p\t%l\n" | sort > "$E/dist-before-links.tsv"
    (cd "$BASE_ROOT"; find dist -type f -print0 | sort -z | xargs -0 sha256sum) > "$E/base-dist-before.sha256"
    (cd "$BASE_ROOT"; find dist -type l -printf "%p\t%l\n" | sort) > "$E/base-dist-before-links.tsv"
  '
else skip build-hold; fi
if test "${gates[syntax]}" = 0 && test "${gates[types]}" = 0 && test "${gates[base-types]}" = 0 && test "${gates[build-hold]}" = 0 && test "${gates[runtime]}" = 0; then
  run native 240 env NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs" node "$E/native-worker.mjs"
else skip native; fi
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
  (cd "$BASE_ROOT"; find dist -type f -print0 | sort -z | xargs -0 sha256sum) > "$E/base-dist-close.sha256"; cmp "$E/base-dist-before.sha256" "$E/base-dist-close.sha256"
  (cd "$BASE_ROOT"; find dist -type l -printf "%p\t%l\n" | sort) > "$E/base-dist-close-links.tsv"; cmp "$E/base-dist-before-links.tsv" "$E/base-dist-close-links.tsv"
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
const expected=['identity','locked-packages','runtime','brand-runtime','syntax','base-prepare','types','base-types','build','base-build','build-hold','native',...process.env.READERS.split(',').map(x=>'reader-'+x),'reader-receipts','closing','dependency-cache-hold'];
const entries=fs.readFileSync(process.env.E+'/gates.tsv','utf8').trim().split('\n').map(x=>x.split('\t'));
fs.writeFileSync(process.env.E+'/strict-gates.json',JSON.stringify({expected,actual:entries},null,2));
assert.deepEqual(entries.map(x=>x[0]),expected); assert(entries.every(x=>x[1]==='0'));
console.log('Every actual named preparation/native/base-control/reader/source/dependency/build gate succeeded.');
NODE
execution_complete=1
exit "$failed"
