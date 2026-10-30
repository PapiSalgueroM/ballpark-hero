#!/usr/bin/env bash
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel)"
PRODUCT=c18c4b7a805a790288fa82d1dbe89085dec8eb1a
TREE=9c36f9ab516e27655c4c71fc60792010cb7f115a
FILES=5492
OUT="$RUNNER_TEMP/rc-out/full"
TOOLS="$RUNNER_TEMP/release-default-tools-$GITHUB_RUN_ID-a$GITHUB_RUN_ATTEMPT"
[[ "$PRODUCT" =~ ^[a-f0-9]{40}$ && "$TREE" =~ ^[a-f0-9]{40}$ && "$FILES" =~ ^[1-9][0-9]*$ ]] || { echo 'UNBOUND_FINAL_SOURCE'; exit 2; }
CAPTURE_ALLOW_FAILURE=0
mkdir -p "$OUT"
capture() {
  local label="$1" seconds="$2" raw started ended; shift 2
  mkdir -p "$OUT/$label"
  started=$(date -u +%FT%TZ)
  set +e
  timeout --kill-after=10s "$seconds" "$@" > "$OUT/$label/stdout.log" 2> "$OUT/$label/stderr.log"
  raw=$?
  set -e
  ended=$(date -u +%FT%TZ)
  jq -n --arg start "$started" --arg end "$ended" --argjson status "$raw" '{start:$start,end:$end,status:$status,timeout:($status==124),credit:"REQUIRES_ACTUAL_OUTPUT_ADMISSION"}' > "$OUT/$label/process.json"
  wc -c "$OUT/$label/stdout.log" "$OUT/$label/stderr.log" > "$OUT/$label/raw-bytes.txt"
  sha256sum "$OUT/$label/stdout.log" "$OUT/$label/stderr.log" > "$OUT/$label/raw-sha256.txt"
  gzip -n "$OUT/$label/stdout.log" "$OUT/$label/stderr.log"
  echo "$label raw=$raw"
  if test "$CAPTURE_ALLOW_FAILURE" = 1; then return 0; fi
  return "$raw"
}
source_map() { git ls-files -z | sort -z | xargs -0 sha256sum; }
deps_map() { find node_modules -type f -print0 | sort -z | xargs -0 sha256sum; }
retention_finalize() {
  find "$OUT" -type f -name '*.log' -print0 | xargs -0 -r gzip -n
  find "$OUT" -type f -size +80M -print0 | while IFS= read -r -d '' file; do
    sha256sum "$file" >> "$OUT/SPLIT-REASSEMBLY-SHA256.txt"
    split -b 64M -d -a 4 -- "$file" "$file.part-"
    original=$(sha256sum "$file" | cut -d ' ' -f 1)
    reassembled=$(cat "$file".part-* | sha256sum | cut -d ' ' -f 1)
    test "$original" = "$reassembled"
    rm -- "$file"
  done
  find "$OUT" -type f -print0 | sort -z | xargs -0 sha256sum > "$RUNNER_TEMP/release-full-manifest.txt"
  cp "$RUNNER_TEMP/release-full-manifest.txt" "$OUT/ALL-OUTPUT-SHA256.txt"
}
collect_hold() {
  local label="$1" target="$2" raw started ended; shift 2
  mkdir -p "$OUT/holds"
  started=$(date -u +%FT%TZ)
  set +e
  "$@" > "$OUT/$target" 2> "$OUT/holds/$label.stderr.log"
  raw=$?
  set -e
  ended=$(date -u +%FT%TZ)
  jq -n --arg label "$label" --arg target "$target" --arg start "$started" --arg end "$ended" --argjson status "$raw" '{label:$label,stdout:$target,start:$start,end:$end,status:$status}' > "$OUT/holds/$label.process.json"
  if test "$raw" -ne 0; then holds_failed=1; fi
  return 0
}
member_map() { find . -path ./.git -prune -o -path ./node_modules -prune -o -path ./dist -prune -o -type f -printf '%P\n' | sort; }
link_map() { find node_modules -type l -printf '%p -> %l\n' | sort; }
file_map() { find "$1" -type f -print0 | sort -z | xargs -0 sha256sum; }
index_map() { sha256sum "$(git rev-parse --git-path index)"; }
case "$1" in
prepare)
  test "$(git rev-parse HEAD^)" = "$PRODUCT"
  test "$(git rev-parse HEAD^:)" = "$TREE"
  git ls-tree -r HEAD^ > "$OUT/product-tree.txt"
  test "$(wc -l < "$OUT/product-tree.txt")" -eq "$FILES"
  test "$(git hash-object scripts/runAllSims.mjs)" = a7d56d224a472b8eacfe1c4fd2f672f962259d28
  test "$(git hash-object scripts/lib/offlineTransport.cjs)" = 0fda542a2649fe5da937c6976fd0f5b6073e74b6
  test "$(git hash-object scripts/simFootleKitNumbers.mjs)" = 7156493c7aa31e8ef74e5ec418a34d8cb447914a
  git rev-parse HEAD HEAD^ HEAD^: > "$OUT/identity.txt"
  git diff --name-status HEAD^ HEAD > "$OUT/qa-diff.txt"
  git diff --name-only HEAD^ HEAD | sort > "$OUT/qa-paths.actual"
  printf '%s\n' .github/workflows/lane-remote-check.yml .rc/request.txt .rc/run.sh .rc/default-support.sh .rc/fonts.cjs .rc/child-journal.cjs .rc/admitted-plan.json .rc/admitResultCache.mjs | sort > "$OUT/qa-paths.expected"
  cmp "$OUT/qa-paths.expected" "$OUT/qa-paths.actual"
  test "$(git ls-tree -r HEAD | wc -l)" -eq "$((FILES+8))"
  while IFS= read -r file; do if git cat-file -e "$PRODUCT:$file" 2>/dev/null; then echo 'Unexpected existing QA path'; exit 2; fi; done < "$OUT/qa-paths.expected"
  git archive --format=tar HEAD | gzip -n > "$OUT/source.tar.gz"
  source_map > "$OUT/source.before"
  find . -path ./.git -prune -o -path ./node_modules -prune -o -path ./dist -prune -o -type f -printf '%P\n' | sort > "$OUT/all-source-members.before"
  GIT_OPTIONAL_LOCKS=0 git for-each-ref --format='%(refname) %(objectname)' > "$OUT/refs.before"
  sha256sum "$(git rev-parse --git-path index)" > "$OUT/index.before"
  capture inventory 120 env -u ONLY -u BROWSER SIM_NETWORK=offline node scripts/runAllSims.mjs --plan-json
  gzip -dc "$OUT/inventory/stdout.log.gz" | jq -S . > "$OUT/inventory.actual.normalized.json"
  jq -S . .rc/admitted-plan.json > "$OUT/inventory.admitted.normalized.json"
  cmp "$OUT/inventory.actual.normalized.json" "$OUT/inventory.admitted.normalized.json"
  capture playwright-install 600 npm install --prefix "$TOOLS" --no-save --package-lock=false playwright@1.64.0
  ln -s "$TOOLS/node_modules/playwright" node_modules/playwright
  ln -s "$TOOLS/node_modules/playwright-core" node_modules/playwright-core
  capture chromium-install 600 env PLAYWRIGHT_BROWSERS_PATH="$TOOLS/browsers" node "$TOOLS/node_modules/playwright/cli.js" install --with-deps chromium
  capture prepared-fonts 300 env FREE_KICK_FONT_CACHE="$OUT/fonts" PLAYWRIGHT_BROWSERS_PATH="$TOOLS/browsers" node scripts/qa/freeKickLab1070.mjs --prefetch-fonts-only
  deps_map > "$OUT/dependencies.before"
  find node_modules -type l -printf '%p -> %l\n' | sort > "$OUT/dependency-links.before"
  find "$TOOLS" -type f -print0 | sort -z | xargs -0 sha256sum > "$OUT/tools.before"
  find "$OUT/fonts" -type f -print0 | sort -z | xargs -0 sha256sum > "$OUT/fonts.before"
  capture ordinary-build 900 env NODE_OPTIONS="--require=$ROOT/scripts/lib/offlineTransport.cjs" SIM_NETWORK=offline npm run build
  find dist -type f -print0 | sort -z | xargs -0 sha256sum > "$OUT/dist.before"
  ;;
run)
  name="$2"
  [[ "$name" =~ ^(sim|play|sweep)[A-Za-z0-9]*\.mjs$ ]]
  jq -e --arg name "$name" '(.nodeGroup+.browserGroup)|index($name)!=null' .rc/admitted-plan.json > /dev/null
  mkdir -p "$OUT/$name/journal" "$OUT/$name/font-receipts" "$OUT/$name/artifacts" "$OUT/$name/shots"
  manifest=$(sha256sum "$OUT/fonts/manifest.json" | cut -d ' ' -f 1)
  redirects=("RC_OUT=$OUT/$name/artifacts" "SHOTS=$OUT/$name/shots")
  case "$name" in
    simCareerAwardsNight.mjs) redirects+=("SIM_AWARDS_NIGHT_ARTIFACTS=$OUT/$name/artifacts/awards-night");;
    simCareerLeagueFinish.mjs) redirects+=("SIM_LEAGUE_FINISH_ARTIFACTS=$OUT/$name/artifacts/league-finish");;
    simCareerStoryRole.mjs) redirects+=("CAREER_STORY_ROLE_ARTIFACTS=$OUT/$name/artifacts/story-role");;
    simCareerTrophyRuns.mjs) redirects+=("CAREER_TROPHY_RUNS_ARTIFACTS=$OUT/$name/artifacts/trophy-runs");;
    simCareerProgramme.mjs) redirects+=("CAREER_PROGRAMME_OUT=$OUT/$name/artifacts/programme");;
    simCmShootoutResults.mjs) redirects+=("CM_SHOOTOUT_RESULTS_OUT=$OUT/$name/artifacts/fresh-shootout-results");;
    simCmShirtSales.mjs) redirects+=("ARTIFACT_DIR=$OUT/$name/artifacts/shirt-sales");;
    playCookiePolicy1446.mjs) redirects+=("COOKIE_POLICY_BROWSER_OUT=$OUT/$name/artifacts/cookie-policy");;
    playConsentPrivacy1442.mjs) redirects+=("LEGAL_PRIVACY_OUT=$OUT/$name/artifacts/privacy");;
    playGameReports.mjs) redirects+=("REPORT_EVIDENCE=$OUT/$name/artifacts/game-reports");;
    playCmRealFixtures.mjs) redirects+=("CM_REAL_FIXTURE_NATIVE_ARTIFACTS=$OUT/$name/artifacts/native-fixtures");;
    playSoccerVeteranTalks.mjs) redirects+=("SOCCER_VETERAN_TALKS_BROWSER_OUT=$OUT/$name/artifacts/veteran-browser");;
  esac
  seconds=1800; if test "$name" = playGames.mjs || test "$name" = sweepGames.mjs; then seconds=7500; fi
  capture "$name" "$seconds" env "${redirects[@]}" RELEASE_ROOT="$ROOT" SIM_NETWORK=offline SIM_FULL_OUTPUT=1 ONLY="$name" BROWSER=1 ENGINES=chromium PLAYWRIGHT_BROWSERS_PATH="$TOOLS/browsers" FREE_KICK_FONT_CACHE="$OUT/fonts" FONT_CACHE_MANIFEST_SHA256="$manifest" SWEEP_CONTEXT_RECEIPT="$OUT/$name/font-receipts/contexts.jsonl" FONT_CACHE_USE_RECEIPT="$OUT/$name/font-receipts/fonts.jsonl" SWEEP_FLAG_RECEIPT="$OUT/$name/font-receipts/flags.jsonl" STADIUM_CHILD_JOURNAL_DIR="$OUT/$name/journal" NODE_OPTIONS="--require=$ROOT/scripts/lib/offlineTransport.cjs --require=$ROOT/.rc/fonts.cjs --require=$ROOT/.rc/child-journal.cjs" node "$ROOT/scripts/runAllSims.mjs" --browser
  ;;
finish)
  trap retention_finalize EXIT
  holds_failed=0
  collect_hold archive-matched holds/archive-matched.stdout.log tar --exclude=./.git --exclude=./node_modules --exclude=./dist -czf "$OUT/matched-final.tar.gz" -C "$ROOT" .
  collect_hold archive-dist holds/archive-dist.stdout.log tar -czf "$OUT/dist.tar.gz" -C dist .
  collect_hold source-snapshot source.after source_map
  collect_hold source-bodies holds/source-bodies.stdout.log cmp "$OUT/source.before" "$OUT/source.after"
  collect_hold tracked-diff final-tracked-diff.txt env GIT_OPTIONAL_LOCKS=0 git diff --exit-code HEAD --
  collect_hold member-snapshot all-source-members.after member_map
  collect_hold source-members holds/source-members.stdout.log cmp "$OUT/all-source-members.before" "$OUT/all-source-members.after"
  collect_hold refs-snapshot refs.after env GIT_OPTIONAL_LOCKS=0 git for-each-ref '--format=%(refname) %(objectname)'
  collect_hold index-snapshot index.after index_map
  collect_hold refs-held holds/refs-held.stdout.log cmp "$OUT/refs.before" "$OUT/refs.after"
  collect_hold index-held holds/index-held.stdout.log cmp "$OUT/index.before" "$OUT/index.after"
  collect_hold dependency-snapshot dependencies.after deps_map
  collect_hold dependency-links-snapshot dependency-links.after link_map
  collect_hold dependency-links-held holds/dependency-links-held.stdout.log cmp "$OUT/dependency-links.before" "$OUT/dependency-links.after"
  collect_hold tools-snapshot tools.after file_map "$TOOLS"
  collect_hold fonts-snapshot fonts.after file_map "$OUT/fonts"
  collect_hold tools-held holds/tools-held.stdout.log cmp "$OUT/tools.before" "$OUT/tools.after"
  collect_hold fonts-held holds/fonts-held.stdout.log cmp "$OUT/fonts.before" "$OUT/fonts.after"
  collect_hold dist-snapshot dist.after file_map dist
  collect_hold dist-held holds/dist-held.stdout.log cmp "$OUT/dist.before" "$OUT/dist.after"
  collect_hold dependency-cache-admission holds/dependency-cache-admission.stdout.log node .rc/admitResultCache.mjs "$OUT"
  printf '%s\n' "$holds_failed" > "$OUT/finish.exit"
  exit "$holds_failed"
  ;;
*) exit 2;;
esac



