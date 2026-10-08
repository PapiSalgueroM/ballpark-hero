#!/usr/bin/env bash
# Remote-only derived guide outputs, separate from build and release acceptance.
set -uo pipefail
test "${GITHUB_ACTIONS:-}" = true || exit 2
test -n "${RC_OUT:-}" && test -n "${RUNNER_TEMP:-}" || exit 2
PARENT_HEAD=795926e37621e437afa986c78185b3b4383636c8
CHECKED_HEAD=bdcb30031521d3fd78e6cd50fe826a8f73a3ce20
CHECKED_TREE=3a8cfedd1b8627448f3a3a4cd12b619fbb5e043f
REQUEST_HEAD=$(git rev-parse HEAD)
WORK=$(mktemp -d "$RUNNER_TEMP/guide-generator-1157.XXXXXX") || exit 2
E="$WORK/evidence"
mkdir -p "$E/logs" "$E/commands" "$E/before" "$E/after" "$E/controls" "$E/dependencies" "$WORK/tmp" "$RC_OUT" || exit 2
export WORK E PARENT_HEAD CHECKED_HEAD CHECKED_TREE REQUEST_HEAD
export CI=true TZ=UTC SIM_NETWORK=offline TMPDIR="$WORK/tmp" TEMP="$WORK/tmp" TMP="$WORK/tmp"
declare -A gates
failed=0 execution_complete=0 ending=normal active= current_phase= watchdog=
deadline=$(( $(date +%s) + 3600 ))
finalize() {
  local exit_code=$? archive packed bytes
  trap - EXIT TERM INT HUP
  test -z "$watchdog" || kill -TERM -- "-$watchdog" 2>/dev/null || true
  test "$exit_code" = 0 && test "$execution_complete" = 1 || failed=1
  printf 'exit=%s\nexecution_complete=%s\nending=%s\nlast_phase=%s\n' "$exit_code" "$execution_complete" "$ending" "$current_phase" > "$E/execution.txt" || failed=1
  # Retain current outputs and useful temporary generator bytes even on early red.
  for pair in 'src/data/searchKeywords.json:searchKeywords.json' 'scripts/data/guideHeadingsFrozen.json:guideHeadingsFrozen.json'; do
    timeout -k 10 15 cp "${pair%%:*}" "$E/after/${pair#*:}" || failed=1
  done
  timeout -k 10 30 cp -a "$WORK/tmp/." "$E/generator-temp/" || failed=1
  printf '%s\n' "$failed" > "$E/intended-gate-failures.txt" || failed=1
  archive="$WORK/guide-generator-1157-evidence.tar.xz"
  timeout -k 10 180 tar -c -I "xz -T2 -8" -f "$archive" -C "$E" .; packed=$?
  bytes=$(stat -c %s "$archive" 2>/dev/null || echo unavailable)
  if test "$packed" = 0 && test "$bytes" -le 24000000; then
    timeout -k 10 30 cp "$archive" "$RC_OUT/guide-generator-1157-evidence.tar.xz" || failed=1
    timeout -k 10 20 sha256sum "$RC_OUT/guide-generator-1157-evidence.tar.xz" > "$RC_OUT/evidence.sha256" || failed=1
    printf 'checked=%s\nrequest=%s\nbytes=%s\nfailed=%s\nexecution_complete=%s\nending=%s\n' "$CHECKED_HEAD" "$REQUEST_HEAD" "$bytes" "$failed" "$execution_complete" "$ending" > "$RC_OUT/receipt.txt" || failed=1
  else
    printf 'EVIDENCE CAP FAILURE: pack_exit=%s bytes=%s limit=24000000; no truncated evidence accepted.\n' "$packed" "$bytes" | tee "$RC_OUT/EVIDENCE-CAP-FAILURE.txt"
    failed=1
  fi
  printf 'Guide generator1157 strict label: failed=%s, complete=%s, source=%s, request=%s. Generator delivery only.\n' "$failed" "$execution_complete" "$CHECKED_HEAD" "$REQUEST_HEAD"
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
setsid bash -c 'sleep 3600; kill -TERM "$1"' _ "$$" & watchdog=$!
run() {
  local name=$1 seconds=$2 rc remaining; shift 2
  current_phase=$name
  printf '%s\n' "$*" > "$E/commands/$name.txt"
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
  printf '%s exit=%s\n' "$name" "$rc"; tail -n 4 "$E/logs/$name.log"
  test "$rc" = 0 || failed=1
  return 0
}
skip() { gates["$1"]=skipped; printf '%s\tskipped\n' "$1" >> "$E/gates.tsv"; failed=1; }
run identity 45 bash -euo pipefail -c '
  test "$(git rev-parse HEAD^)" = "$CHECKED_HEAD"
  test "$(git rev-parse "$CHECKED_HEAD^")" = "$PARENT_HEAD"
  test "$(git rev-parse "$CHECKED_HEAD^{tree}")" = "$CHECKED_TREE"
  git diff --exit-code HEAD
  printf "%s\n" .github/workflows/lane-remote-check.yml .rc/request.txt .rc/run.sh .rc/x/guide-generator-1157.sh | LC_ALL=C sort > "$E/allowed-overlay.txt"
  git diff --name-only --no-renames "$CHECKED_HEAD" HEAD | LC_ALL=C sort > "$E/actual-overlay.txt"
  cmp "$E/allowed-overlay.txt" "$E/actual-overlay.txt"
  printf "%s\n" "ac81da34112040a3c231a7cfafe8a9b28dc87de2acc24e0577feee590880ee9b  .rc/request.txt" "668aeb520674d130f1af2e88494775afff6b8055d9911c715a8b646056b4b62f  .rc/run.sh" "447a4eca8616f708831ec5e6b7bf90ba68afc606054c0e0d0b27b4cb84abec20  .github/workflows/lane-remote-check.yml" > "$E/reviewed-kit.sha256"
  sha256sum -c "$E/reviewed-kit.sha256"
  sha256sum .rc/x/guide-generator-1157.sh > "$E/dispatched-shell.sha256"
  printf "%s\n" docs/PROJECT-STATE.md src/data/gameContent/baseball.ts src/data/gameContent/basketball.ts src/data/gameContent/football.ts src/data/gameContent/hockey.ts src/data/gameContent/soccer2.ts | LC_ALL=C sort > "$E/allowed-candidate.txt"
  git diff --name-only --no-renames "$PARENT_HEAD" "$CHECKED_HEAD" | LC_ALL=C sort > "$E/actual-candidate.txt"
  cmp "$E/allowed-candidate.txt" "$E/actual-candidate.txt"
  git rev-parse HEAD HEAD^ "HEAD^{tree}" > "$E/identity.txt"
  git ls-tree -r HEAD > "$E/git-runtime-manifest.txt"
  git ls-tree -r "$CHECKED_HEAD" > "$E/git-checked-manifest.txt"
  git ls-tree -r "$PARENT_HEAD" > "$E/git-parent-manifest.txt"
  git ls-files -z | sort -z | xargs -0 sha256sum > "$E/source-before-all.sha256"
  git ls-files -z -- . ":(exclude)src/data/searchKeywords.json" ":(exclude)scripts/data/guideHeadingsFrozen.json" | sort -z | xargs -0 sha256sum > "$E/source-held.sha256"
  git diff "$PARENT_HEAD" "$CHECKED_HEAD" > "$E/prospective-source.diff"
  cp src/data/searchKeywords.json "$E/before/searchKeywords.json"
  cp scripts/data/guideHeadingsFrozen.json "$E/before/guideHeadingsFrozen.json"
  sha256sum src/data/searchKeywords.json scripts/data/guideHeadingsFrozen.json > "$E/derived-before.sha256"
  selected=(src/data/gameContent src/data/gameRegistry.ts src/components/seo/GameSeoContent.tsx scripts/genSearchKeywords.mjs scripts/simGuideHeadings.mjs scripts/lib/atomicWrite.mjs scripts/lib/offlineTransport.cjs package.json package-lock.json tsconfig.json tsconfig.app.json tsconfig.node.json)
  git ls-files -- "${selected[@]}" > "$E/selected-source-paths.txt"
  git ls-tree -r "$CHECKED_HEAD" -- "${selected[@]}" > "$E/selected-source-git-manifest.txt"
  git archive "$CHECKED_HEAD" -- "${selected[@]}" > "$E/selected-source.tar"
  sha256sum "$E/selected-source.tar" > "$E/selected-source.sha256"
  git archive HEAD -- .rc .github/workflows/lane-remote-check.yml > "$E/request-inputs.tar"
  cp package.json package-lock.json "$E/dependencies/"
  find node_modules -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dependencies/app-before.sha256"
  find node_modules -type l -printf "%p\t%l\n" | sort > "$E/dependencies/app-before-links.tsv"
  tar -cf "$E/dependencies/typescript-package.tar" -C node_modules typescript
  node --version; tar --version; xz --version
'
if test "${gates[identity]}" != 0; then exit 1; fi
run locked-packages 45 node --input-type=module - <<'PACKAGES'
import assert from 'node:assert/strict'; import fs from 'node:fs'; import { createHash } from 'node:crypto';
const lock=JSON.parse(fs.readFileSync('package-lock.json')), rows=[];
for(const [file, p] of Object.entries(lock.packages)) {
  if(!file.startsWith('node_modules/') || p.link) continue;
  if(!fs.existsSync(file+'/package.json')) { assert(p.optional, 'Required locked package installed: '+file); continue; }
  const actual=JSON.parse(fs.readFileSync(file+'/package.json')).version;
  assert.equal(actual, p.version, file); rows.push({file, version:actual});
}
assert(rows.length>0); fs.writeFileSync(process.env.E+'/dependencies/locked-packages.json',JSON.stringify(rows,null,2)+'\n');
const tools=['typescript','esbuild','react','react-dom','react-router-dom','react-helmet-async'];
const runtime=tools.map(name=>{ const bytes=fs.readFileSync('node_modules/'+name+'/package.json'); return {name, package:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')}; });
fs.writeFileSync(process.env.E+'/dependencies/generator-runtime.json',JSON.stringify({node:process.versions,packages:runtime},null,2)+'\n');
console.log('Verified '+rows.length+' actual installed locked package versions.');
PACKAGES
if test "${gates[locked-packages]}" = 0; then run type-before 180 node_modules/.bin/tsc --noEmit -p tsconfig.app.json; else skip type-before; fi
export SIM_OFFLINE_RECEIPT="$E/offline-transport.log"
export NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs"
: > "$SIM_OFFLINE_RECEIPT"
if test "${gates[type-before]}" = 0; then
  run keywords 120 node scripts/genSearchKeywords.mjs
else skip keywords; fi
if test "${gates[keywords]}" = 0; then
  run refresh-1 120 node scripts/simGuideHeadings.mjs --refresh /nba-my-career
  run refresh-2 120 node scripts/simGuideHeadings.mjs --refresh /nfl-my-career
  run refresh-3 120 node scripts/simGuideHeadings.mjs --refresh /mlb-my-career
  run refresh-4 120 node scripts/simGuideHeadings.mjs --refresh /nhl-my-career
  run refresh-5 120 node scripts/simGuideHeadings.mjs --refresh /build-your-xi
else for name in refresh-1 refresh-2 refresh-3 refresh-4 refresh-5; do skip "$name"; done; fi
run type-after 180 node_modules/.bin/tsc --noEmit -p tsconfig.app.json
cat > "$E/generator-receipts.mjs" <<'GENERATOR_RECEIPTS'
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

async function main() {
  assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Remote-only generator receipt');
  const root = process.cwd(), out = process.env.E;
  assert(out && process.env.TMPDIR, 'Owned external evidence and temp roots');
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
  const write = (file, value) => fs.writeFileSync(path.join(out, file), JSON.stringify(value, null, 2) + '\n');
  const routes = ['/nba-my-career', '/nfl-my-career', '/mlb-my-career', '/nhl-my-career', '/build-your-xi'];
  const parts = ['howToPlay', 'rules', 'example', 'tips'];
  const guideDir = path.join(root, 'src/data/gameContent');
  const inputFiles = fs.readdirSync(guideDir).sort();
  assert.equal(inputFiles.length, 17, 'Exact current guide fingerprint input inventory');
  const inputs = inputFiles.map(file => {
    const bytes = fs.readFileSync(path.join(guideDir, file));
    return { file: 'src/data/gameContent/' + file, bytes: bytes.length, sha256: hash(bytes) };
  });
  const source = hash(Buffer.from(inputFiles.map(file => fs.readFileSync(path.join(guideDir, file), 'utf8').replace(/\r\n/g, '\n')).join('\n'))).slice(0, 16);
  const bundle = path.join(process.env.TMPDIR, 'dukbSearchKeywords.bundle.mjs');
  const entry = path.join(process.env.TMPDIR, 'dukbSearchKeywordsEntry.mjs');
  assert.equal(fs.readFileSync(entry, 'utf8'), `\nexport { GAME_CONTENT } from '${root}/src/data/gameContent/index.ts';\nexport { flatGuide } from '${root}/src/data/gameContent/guideShape.ts';\nexport { CATEGORIES } from '${root}/src/data/gameRegistry.ts';\n`, 'Actual keyword generator entry imports exact held sources');
  const generated = await import(pathToFileURL(bundle).href);
  const games = generated.CATEGORIES.flatMap(category => category.games);
  const projection = Object.fromEntries(routes.map(route => {
    const content = generated.GAME_CONTENT[route];
    assert(content && games.some(game => game.path === route), 'Actual registered guide: ' + route);
    const flat = generated.flatGuide(content);
    for (const part of parts) assert(Array.isArray(flat[part]) && flat[part].length > 0 && flat[part].every(line => typeof line === 'string' && line.length > 0), route + '/' + part);
    return [route, Object.fromEntries(parts.map(part => [part, flat[part]]))];
  }));
  write('actual-guide-projection.json', projection);
  const keywords = read('src/data/searchKeywords.json');
  const beforeKeywords = read(path.join(out, 'before/searchKeywords.json'));
  const frozen = read('scripts/data/guideHeadingsFrozen.json');
  const beforeFrozen = read(path.join(out, 'before/guideHeadingsFrozen.json'));
  const keywordCheck = candidate => {
    assert.equal(candidate.v, 1, 'Actual keyword schema version');
    assert.equal(candidate.source, source, 'Keyword fingerprint matches all actual guide inputs');
    assert.deepEqual(Object.keys(candidate.k).sort(), [...new Set(games.map(game => game.path))].sort(), 'Keyword coverage equals actual registry');
    assert(Object.values(candidate.k).every(words => typeof words === 'string' && words.trim().length > 0), 'Every keyword row contains words');
  };
  const frozenCheck = candidate => {
    assert.deepEqual(Object.keys(candidate).sort(), Object.keys(beforeFrozen).sort(), 'Frozen fixture top-level keys held');
    for (const key of Object.keys(beforeFrozen).filter(key => key !== 'routes')) assert.deepEqual(candidate[key], beforeFrozen[key], 'Existing fixture metadata held: ' + key);
    assert.deepEqual(Object.keys(candidate.routes), Object.keys(beforeFrozen.routes), 'Existing frozen route inventory and order held');
    for (const route of Object.keys(beforeFrozen.routes)) {
      assert.deepEqual(candidate.routes[route], routes.includes(route) ? projection[route] : beforeFrozen.routes[route], 'Frozen route text equals actual projection or held baseline: ' + route);
    }
  };
  keywordCheck(keywords); frozenCheck(frozen);
  assert.notEqual(beforeKeywords.source, source, 'Prospective guide source differs from stale keyword input');
  assert.notDeepEqual(beforeFrozen.routes[routes[0]], projection[routes[0]], 'NBA prospective text differs from its original frozen record');
  const controls = [];
  const catchIntended = (name, baseline, changed, check, message) => {
    assert.notDeepEqual(changed, baseline, 'Copied control changes actual output: ' + name);
    write('controls/' + name + '.json', changed);
    let error;
    try { check(changed); } catch (caught) { error = caught; }
    assert(error && error.name === 'AssertionError' && error.message.includes(message), 'Exact intended copied-output failure: ' + name);
    controls.push({ name, baselineSha256: hash(Buffer.from(JSON.stringify(baseline))), changedSha256: hash(Buffer.from(JSON.stringify(changed))), error: { name: error.name, message: error.message, actual: error.actual, expected: error.expected, operator: error.operator } });
    check(baseline);
  };
  const staleKeywords = structuredClone(keywords);
  staleKeywords.source = beforeKeywords.source;
  catchIntended('stale-keyword-fingerprint', keywords, staleKeywords, keywordCheck, 'Keyword fingerprint matches all actual guide inputs');
  const staleFrozen = structuredClone(frozen);
  staleFrozen.routes[routes[0]] = beforeFrozen.routes[routes[0]];
  catchIntended('stale-nba-frozen-record', frozen, staleFrozen, frozenCheck, 'Frozen route text equals actual projection or held baseline: /nba-my-career');
  const stages = [{ name: 'keywords', command: ['node', 'scripts/genSearchKeywords.mjs'] }, ...routes.map((route, index) => ({ name: 'refresh-' + (index + 1), command: ['node', 'scripts/simGuideHeadings.mjs', '--refresh', route] }))];
  const stdout = stages.map(stage => {
    const bytes = fs.readFileSync(path.join(out, 'logs', stage.name + '.log'));
    const text = bytes.toString('utf8');
    if (stage.name === 'keywords') assert(text.includes('source hash ' + source), 'Actual keyword command printed current source fingerprint');
    else assert(text.includes('simGuideHeadings: refreshed ' + stage.command[3] + ' from its actual guide ('), 'Actual refresh command printed its exact route');
    assert.equal(fs.readFileSync(path.join(out, 'commands', stage.name + '.txt'), 'utf8'), stage.command.join(' ') + '\n', 'Exact executed generator command');
    return { ...stage, stdoutBytes: bytes.length, stdoutSha256: hash(bytes) };
  });
  const changedFrozenRoutes = Object.keys(frozen.routes).filter(route => JSON.stringify(frozen.routes[route]) !== JSON.stringify(beforeFrozen.routes[route]));
  assert(changedFrozenRoutes.every(route => routes.includes(route)), 'Only reviewed frozen records change');
  const changedKeywordRoutes = [...new Set([...Object.keys(beforeKeywords.k), ...Object.keys(keywords.k)])].filter(route => beforeKeywords.k[route] !== keywords.k[route]);
  const file = name => { const bytes = fs.readFileSync(name); return { file: name, bytes: bytes.length, sha256: hash(bytes) }; };
  write('generator-receipt.json', { disposition: 'GENERATOR_DELIVERY_ONLY', source, inputs, stages: stdout, projectionSha256: hash(fs.readFileSync(path.join(out, 'actual-guide-projection.json'))), outputs: [file('src/data/searchKeywords.json'), file('scripts/data/guideHeadingsFrozen.json')], temporaryBundle: [file(entry), file(bundle)], changedFrozenRoutes, changedKeywordRoutes, controls, limitations: ['No build, reader, browser, public snapshot, gameplay, engine, integration, production or release acceptance.'] });
  console.log('Guide generator receipt1157: PASS, actual two outputs, five refreshed routes, all other frozen records held and two effective copied-output controls.');
}

await main();
GENERATOR_RECEIPTS
printf '%s\n' '8f519bd17143c0695c3a5c9e5481d4ce4d325687fbace08b7f81279a1b69863d  generator-receipts.mjs' > "$E/receipt-worker.sha256"
(cd "$E" && sha256sum -c receipt-worker.sha256) || failed=1
if test "${gates[keywords]}" = 0 && test "${gates[refresh-1]}" = 0 && test "${gates[refresh-2]}" = 0 && test "${gates[refresh-3]}" = 0 && test "${gates[refresh-4]}" = 0 && test "${gates[refresh-5]}" = 0; then
  run derived-receipts 90 node "$E/generator-receipts.mjs"
else skip derived-receipts; fi
run closing 60 bash -euo pipefail -c '
  sha256sum -c "$E/source-held.sha256" > "$E/source-held-check.log"
  git diff --exit-code HEAD -- . ":(exclude)src/data/searchKeywords.json" ":(exclude)scripts/data/guideHeadingsFrozen.json"
  git ls-files --others --exclude-standard -- src scripts public .github/workflows package.json package-lock.json index.html > "$E/untracked-authored-source.txt"
  test ! -s "$E/untracked-authored-source.txt"
  git ls-files -z | sort -z | xargs -0 sha256sum > "$E/source-after-all.sha256"
  git diff -- src/data/searchKeywords.json scripts/data/guideHeadingsFrozen.json > "$E/actual-derived.diff"
  sha256sum src/data/searchKeywords.json scripts/data/guideHeadingsFrozen.json > "$E/derived-after.sha256"
  cp src/data/searchKeywords.json "$E/after/searchKeywords.json"
  cp scripts/data/guideHeadingsFrozen.json "$E/after/guideHeadingsFrozen.json"
  find node_modules -type f -print0 | sort -z | xargs -0 sha256sum > "$E/dependencies/app-after.sha256"
  cmp "$E/dependencies/app-before.sha256" "$E/dependencies/app-after.sha256"
  find node_modules -type l -printf "%p\t%l\n" | sort > "$E/dependencies/app-after-links.tsv"
  cmp "$E/dependencies/app-before-links.tsv" "$E/dependencies/app-after-links.tsv"
  test ! -s "$E/offline-transport.log"
'
expected=(identity locked-packages type-before keywords refresh-1 refresh-2 refresh-3 refresh-4 refresh-5 type-after derived-receipts closing)
for name in "${expected[@]}"; do test "${gates[$name]:-missing}" = 0 || failed=1; done
test "${#gates[@]}" = "${#expected[@]}" || failed=1
gates[strict-gates]=$failed
printf 'strict-gates\t%s\n' "$failed" >> "$E/gates.tsv"
printf 'Generator-phase only: no source adoption, snapshots, build, full readers or release acceptance.\n' > "$E/scope.txt"
execution_complete=1
exit "$failed"
