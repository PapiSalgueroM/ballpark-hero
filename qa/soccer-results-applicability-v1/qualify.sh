#!/usr/bin/env bash
# Remote-only, Node + Git + shell standard tools; no npm/browser/build.
set -euo pipefail
root="$(pwd)"
probe="$root/scripts/qa/soccerResultsApplicability.mjs"
out="$(printenv RESULTS_APPLICABILITY_OUT || true)"
test -n "$out" || out="$root/results-applicability-artifacts"
test ! -e "$root/node_modules"
mkdir -p "$out"
out="$(cd "$out" && pwd)"
sha256sum src/lib/soccerCareerEngine.ts scripts/qa/soccerResultsLayout.mjs scripts/playSoccerResultsLayout.mjs scripts/qa/soccerResultsApplicability.mjs .github/workflows/soccer-results-layout.yml package.json package-lock.json > "$out/source-before.sha256"
base="afd8f6863681507693a3af34b6038e049dfcd419"
runner_temp="$(printenv RUNNER_TEMP || true)"
test -n "$runner_temp" || runner_temp="/tmp"
temp="$(mktemp -d "$runner_temp/results-applicability.XXXXXX")"
cleanup() { git worktree remove --force "$temp/base" >/dev/null 2>&1 || true; rmdir "$temp" 2>/dev/null || true; }
trap cleanup EXIT
git worktree add --detach "$temp/base" "$base" > "$out/base-worktree.log" 2>&1
run_gate() {
  local target="$1" id="$2" status=0
  test ! -e "$out/$id-later-setup.marker"
  (node "$probe" "$target" "$out/$id.json" && printf 'LATER_SETUP_REACHED\n' > "$out/$id-later-setup.marker") > "$out/$id.log" 2>&1 || status=$?
  printf '%s\n' "$status" > "$out/$id.exit"
}
run_gate "$root" current
run_gate "$temp/base" equal
cp "$temp/base/src/lib/soccerCareerEngine.ts" "$out/base-engine-original.ts"
node --input-type=module - "$temp/base/src/lib/soccerCareerEngine.ts" <<'NODE'
import fs from 'node:fs';
const file=process.argv[2],source=fs.readFileSync(file,'utf8');
fs.writeFileSync(file,' \r\n'+source.replaceAll('\n','\r\n')+'\r\n \t');
NODE
cp "$temp/base/src/lib/soccerCareerEngine.ts" "$out/normalized-engine.ts"
run_gate "$temp/base" normalized
cp "$out/base-engine-original.ts" "$temp/base/src/lib/soccerCareerEngine.ts"
printf '\nvoid 0;\n' >> "$temp/base/src/lib/soccerCareerEngine.ts"
cp "$temp/base/src/lib/soccerCareerEngine.ts" "$out/changed-engine.ts"
run_gate "$temp/base" changed
cp "$out/base-engine-original.ts" "$temp/base/src/lib/soccerCareerEngine.ts"
cmp "$out/base-engine-original.ts" "$temp/base/src/lib/soccerCareerEngine.ts"
run_gate "$temp/base" restored
run_gate "$temp/missing" infrastructure
node --input-type=module - "$out" <<'NODE'
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const out=process.argv[2],read=id=>JSON.parse(fs.readFileSync(path.join(out,id+'.json'),'utf8'));
for(const[id,exit,result,marker]of[['current',1,'mismatch',false],['equal',0,'match',true],['normalized',0,'match',true],['changed',1,'mismatch',false],['restored',0,'match',true],['infrastructure',2,'error',false]]){
 assert.equal(Number(fs.readFileSync(path.join(out,id+'.exit'),'utf8')),exit,id+': exact exit');
 const row=read(id);assert.equal(row.result,result,id+': exact result');
 assert.equal(fs.existsSync(path.join(out,id+'-later-setup.marker')),marker,id+': later setup boundary');
}
const current=read('current'),equal=read('equal'),normalized=read('normalized'),changed=read('changed'),restored=read('restored');
assert.equal(equal.expected.commit,'afd8f6863681507693a3af34b6038e049dfcd419');
assert.equal(equal.current.commit,equal.expected.commit);
assert.equal(equal.expected.blob,'185e25df98b8299ebc1132facf1998908e9198bd');
assert.equal(equal.current.worktreeBlob,equal.expected.blob);
assert.equal(current.expected.commit,equal.expected.commit);
assert.notEqual(current.current.worktreeBlob,equal.expected.blob,'Current is a genuine different engine');
assert.equal(normalized.current.commit,equal.current.commit);
assert.notEqual(normalized.current.rawSha256,equal.current.rawSha256,'Normalization control changed actual raw bytes');
assert.notEqual(normalized.current.worktreeBlob,equal.current.worktreeBlob);
assert.equal(normalized.current.normalizedSha256,equal.current.normalizedSha256,'Same exact normalization accepts CRLF and outer whitespace');
assert.equal(changed.current.commit,equal.current.commit,'Physical fault keeps HEAD unchanged');
assert.equal(changed.current.headBlob,equal.current.headBlob);
assert.notEqual(changed.current.worktreeBlob,equal.current.worktreeBlob,'Physical fault changed actual bytes');
assert.notEqual(changed.current.normalizedSha256,equal.current.normalizedSha256);
assert.deepEqual(restored,equal,'Exact same-copy restoration restores full comparison');
console.log('PASS applicability: current refusal, BASE acceptance, physical normalization/byte fault/restoration, infrastructure refusal, all setup markers');
NODE
sha256sum --check "$out/source-before.sha256" > "$out/source-held.log"
git diff --exit-code HEAD -- src scripts .github/workflows package.json package-lock.json >> "$out/source-held.log"
printf 'PASS canonical source held; no dependency installation/build/browser executed\n'
