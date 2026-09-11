/* Career season truth fence.

   The original 2025-2026 fallback batch was authored before the season was
   complete, then copied into the live seed. It is quarantined as a generated
   projection tranche, not relabeled as completed-season fact.

   1. The ledger matches the seed, historical fallback and Git evidence.
   2. The current fallback's 2025-2026 rows are exactly the 27 researched
      tuples (Round 531: the fallback is baked from the live table).
   3. Two exact, fail-closed migrations cover all 77 live seed tuples.
   4. The 27 later researched live tuples remain outside the quarantine.
   5. After both migrations are applied, live must equal those 27 tuples.

   Set CAREER_SEASON_LOCAL_ONLY=1 to run sections 1 through 4 without reading
   live state. The live section remains mandatory in the normal suite.

   Negative controls:
     SIM_CAREER_SEASON_CONTROL=sources
     SIM_CAREER_SEASON_CONTROL=evidence
     SIM_CAREER_SEASON_CONTROL=fallback
     SIM_CAREER_SEASON_CONTROL=migration
     SIM_CAREER_SEASON_CONTROL=preserve
     SIM_CAREER_SEASON_CONTROL=live

   Each control changes an in-memory fixture, then must turn only its own
   section red. All six controls work with CAREER_SEASON_LOCAL_ONLY=1.

   Run locally:
     CAREER_SEASON_LOCAL_ONLY=1 node scripts/simCareerSeasonTruth.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_CAREER_SEASON_CONTROL || '';
const LOCAL_ONLY = process.env.CAREER_SEASON_LOCAL_ONLY === '1';
const CONTROLS = ['sources', 'evidence', 'fallback', 'migration', 'preserve', 'live'];
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error('Unknown control "' + CONTROL + '". Expected ' + CONTROLS.join(', '));
  process.exit(1);
}

const failures = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
let section = 0;
const fail = message => {
  failures[section] += 1;
  console.error('  FAIL: ' + message);
};
const abort = message => {
  console.error(message);
  process.exit(1);
};
const read = relativePath => fs.readFileSync(path.join(ROOT, relativePath), 'utf8').replaceAll('\r\n', '\n');
const clone = value => JSON.parse(JSON.stringify(value));
const tupleKey = row => [
  row.player,
  row.season,
  row.club,
  row.goals,
  row.assists,
  row.appearances,
  row.marketValue,
].join('|');
const liveTupleKey = row => tupleKey(row) + '|' + row.sortOrder;
const transferTupleKey = row => [row.player, row.season, row.club].join('|');
const namesKey = rows => [...new Set(rows.map(row => row.player))].sort().join('|');
const countMatches = (source, pattern) => (source.match(pattern) || []).length;

function compareSets(label, expectedRows, actualRows, keyOf) {
  const expected = new Set(expectedRows.map(keyOf));
  const actual = new Set(actualRows.map(keyOf));
  const missing = [...expected].filter(key => !actual.has(key));
  const extra = [...actual].filter(key => !expected.has(key));
  if (actualRows.length !== actual.size) fail(label + ' contains duplicate exact tuples');
  if (missing.length) fail(label + ' is missing ' + missing.length + ' exact tuple(s)');
  if (extra.length) fail(label + ' contains ' + extra.length + ' untracked tuple(s)');
}

function parseFallback(source) {
  const rows = [];
  const playerPattern = /\{\s*name:\s*"([^"]+)"[\s\S]*?career:\s*\[([\s\S]*?)\]\s*,?\s*\}/g;
  const seasonPattern = /\{\s*season:\s*"([^"]+)",\s*club:\s*"([^"]+)",\s*goals:\s*(-?\d+),\s*assists:\s*(null|-?\d+),\s*appearances:\s*(-?\d+),\s*marketValue:\s*(-?\d+)\s*\}/g;
  for (const playerMatch of source.matchAll(playerPattern)) {
    for (const seasonMatch of playerMatch[2].matchAll(seasonPattern)) {
      rows.push({
        player: playerMatch[1],
        season: seasonMatch[1],
        club: seasonMatch[2],
        goals: Number(seasonMatch[3]),
        assists: seasonMatch[4] === 'null' ? null : Number(seasonMatch[4]),
        appearances: Number(seasonMatch[5]),
        marketValue: Number(seasonMatch[6]),
      });
    }
  }
  return rows;
}

function parseCompactCareers(source) {
  const rows = [];
  for (const line of source.replaceAll('\r\n', '\n').split('\n')) {
    if (!line.trim()) continue;
    const bar = line.indexOf('|');
    const player = line.slice(0, bar);
    for (const spell of line.slice(bar + 1).split(';')) {
      const colon = spell.lastIndexOf(':');
      const club = spell.slice(0, colon);
      let years = spell.slice(colon + 1);
      const calendar = years.endsWith('c');
      if (calendar) years = years.slice(0, -1);
      const range = years.includes('-') ? years.split('-').map(Number) : [Number(years), Number(years)];
      for (let year = range[0]; year <= range[1]; year++) {
        rows.push({ player, club, season: calendar ? String(year) : year + '-' + (year + 1) });
      }
    }
  }
  return rows;
}

function parseSeed(source) {
  const names = new Map();
  const playerPattern = /\('([a-f0-9-]+)',\s*'((?:''|[^'])*)',\s*'((?:''|[^'])*)',\s*'((?:''|[^'])*)'\)/g;
  for (const match of source.matchAll(playerPattern)) {
    names.set(match[1], match[2].replaceAll("''", "'"));
  }
  const rows = [];
  const rowPattern = /\('([a-f0-9-]+)',\s*'(2025-2026)',\s*'((?:''|[^'])*)',\s*(-?\d+),\s*(null|-?\d+),\s*(-?\d+),\s*(-?\d+),\s*(-?\d+)\)/g;
  for (const match of source.matchAll(rowPattern)) {
    rows.push({
      player: names.get(match[1]),
      season: match[2],
      club: match[3].replaceAll("''", "'"),
      goals: Number(match[4]),
      assists: match[5] === 'null' ? null : Number(match[5]),
      appearances: Number(match[6]),
      marketValue: Number(match[7]),
      sortOrder: Number(match[8]),
    });
  }
  return rows;
}

function parseMigration(source, relativePath) {
  const code = source.replace(/^\s*--.*$/gm, '');
  const values = code.match(/from\s+\(values([\s\S]*?)\)\s+as rows\s*\(/i)?.[1];
  if (!values) abort('Could not find the VALUES table in ' + relativePath);
  const rows = [];
  const tuplePattern = /\('((?:''|[^'])*)',\s*'((?:''|[^'])*)',\s*'((?:''|[^'])*)',\s*(-?\d+),\s*(null|-?\d+),\s*(-?\d+),\s*(-?\d+),\s*(-?\d+)\)/g;
  for (const match of values.matchAll(tuplePattern)) {
    rows.push({
      player: match[1].replaceAll("''", "'"),
      season: match[2].replaceAll("''", "'"),
      club: match[3].replaceAll("''", "'"),
      goals: Number(match[4]),
      assists: match[5] === 'null' ? null : Number(match[5]),
      appearances: Number(match[6]),
      marketValue: Number(match[7]),
      sortOrder: Number(match[8]),
    });
  }
  return { code, rows, relativePath };
}

function readHistoricalFallback(snapshot) {
  try {
    return execFileSync(
      'git',
      ['show', snapshot.commit + ':' + snapshot.file],
      { cwd: ROOT, encoding: 'utf8' },
    );
  } catch (error) {
    abort('Could not read the declared fallback snapshot: ' + error.message);
  }
}

function checkMigrationShape(parsed, expectedCount) {
  if (parsed.rows.length !== expectedCount) {
    fail(parsed.relativePath + ' carries ' + parsed.rows.length + ' tuples instead of ' + expectedCount);
  }
  if (!/matching_rows\s*<>\s*1/i.test(parsed.code)) {
    fail(parsed.relativePath + ' does not abort when one exact old tuple has drifted');
  }
  if (!new RegExp('removed_rows\\s*<>\\s*' + expectedCount, 'i').test(parsed.code)) {
    fail(parsed.relativePath + ' does not assert its exact removal count');
  }
  const comparisons = [
    /p\.player_name\s*=\s*rejected\.player_name/gi,
    /s\.season\s*=\s*rejected\.season/gi,
    /s\.club\s*=\s*rejected\.club/gi,
    /s\.goals\s*=\s*rejected\.goals/gi,
    /s\.assists\s*=\s*rejected\.assists/gi,
    /s\.appearances\s*=\s*rejected\.appearances/gi,
    /s\.market_value\s*=\s*rejected\.market_value/gi,
    /s\.sort_order\s*=\s*rejected\.sort_order/gi,
  ];
  for (const pattern of comparisons) {
    if (countMatches(parsed.code, pattern) !== 2) {
      fail(parsed.relativePath + ' does not compare every tuple field in both precondition and delete');
      break;
    }
  }
  if (countMatches(parsed.code, /delete\s+from\s+public\.career_seasons/gi) !== 1) {
    fail(parsed.relativePath + ' does not contain exactly one scoped career_seasons delete');
  }
}

const ledger = JSON.parse(read('scripts/data/careerSeasonTruth.json'));

section = 1;
console.log('1) Ledger provenance matches the seed, fallback snapshot and Git history');
{
  const checked = clone(ledger);
  if (CONTROL === 'sources') {
    const before = checked.individuallyDisprovenRows[0].sources.length;
    checked.individuallyDisprovenRows[0].sources.pop();
    if (checked.individuallyDisprovenRows[0].sources.length !== before - 1) abort('sources control changed nothing');
    console.log('   NEGATIVE CONTROL ON: one disproven tuple has only one source');
  }
  if (CONTROL === 'evidence') {
    const before = checked.batchEvidence.authoringBatches[0].tupleCount;
    checked.batchEvidence.authoringBatches[0].tupleCount -= 1;
    if (checked.batchEvidence.authoringBatches[0].tupleCount !== before - 1) abort('evidence control changed nothing');
    console.log('   NEGATIVE CONTROL ON: the authoring evidence accounts for only 76 tuples');
  }

  const batch = checked.batchEvidence;
  if (batch.classification !== 'generated projection tranche, not verified completed-season data') {
    fail('the batch classification was weakened or changed');
  }
  if (!Array.isArray(batch.evidence) || batch.evidence.length < 4) {
    fail('the batch has fewer than four recorded evidence findings');
  }
  const authored = batch.authoringBatches.reduce((sum, item) => sum + item.tupleCount, 0);
  if (authored !== 77) fail('Git authoring batches account for ' + authored + ' tuples instead of 77');
  const commits = batch.authoringBatches.flatMap(item => item.commits);
  if (new Set(commits).size !== 19) fail('expected 19 distinct authoring commits, found ' + new Set(commits).size);
  for (const item of batch.authoringBatches) {
    if (item.date >= '2026-06-01') fail('authoring batch ' + item.date + ' is not pre-completion evidence');
    for (const commit of item.commits) {
      let date;
      try {
        date = execFileSync('git', ['show', '-s', '--format=%aI', commit], { cwd: ROOT, encoding: 'utf8' }).trim().slice(0, 10);
      } catch (error) {
        abort('Could not inspect evidence commit ' + commit + ': ' + error.message);
      }
      if (date !== item.date) fail('evidence commit ' + commit + ' has date ' + date + ', ledger says ' + item.date);
    }
  }

  const parsedSeed = parseSeed(read(batch.seedMigration));
  const historical = parseFallback(readHistoricalFallback(batch.sourceSnapshot)).filter(row => row.season === batch.season);
  compareSets('live seed ledger', parsedSeed, checked.liveSeedRows, liveTupleKey);
  compareSets('fallback projection ledger', historical, checked.fallbackProjectionRows, tupleKey);
  if (parsedSeed.length !== 77) fail('seed migration has ' + parsedSeed.length + ' 2025-2026 tuples instead of 77');
  if (historical.length !== 77) fail('fallback snapshot has ' + historical.length + ' 2025-2026 tuples instead of 77');
  if (namesKey(parsedSeed) !== namesKey(historical)) fail('seed and fallback player name sets differ');
  if (new Set(parsedSeed.map(row => row.player)).size !== 77) fail('seed player names are not one row per player');

  const seedByPlayer = new Map(parsedSeed.map(row => [row.player, row]));
  const variants = historical.filter(row => tupleKey(row) !== tupleKey(seedByPlayer.get(row.player)));
  if (historical.length - variants.length !== 73) fail('seed and fallback have ' + (historical.length - variants.length) + ' exact tuple matches instead of 73');
  if (variants.length !== 4) fail('seed and fallback have ' + variants.length + ' tuple variants instead of 4');
  if (namesKey(variants) !== namesKey(batch.seedFallbackVariants)) fail('the four seed and fallback variants are not tracked exactly');

  const counts = batch.counts;
  const expectedCounts = {
    liveSeedTuples: 77,
    fallbackProjectionTuples: 77,
    samePlayerNames: 77,
    exactSeedFallbackMatches: 73,
    seedFallbackVariants: 4,
    firstMigrationTuples: 8,
    secondMigrationTuples: 69,
    preservedResearchedLiveTuples: 27,
  };
  for (const [name, expected] of Object.entries(expectedCounts)) {
    if (counts[name] !== expected) fail('batch count ' + name + ' is ' + counts[name] + ', expected ' + expected);
  }

  if (checked.individuallyDisprovenRows.length !== 10) {
    fail('expected 10 individually disproven tuples, found ' + checked.individuallyDisprovenRows.length);
  }
  for (const row of checked.individuallyDisprovenRows) {
    if (!Array.isArray(row.sources) || row.sources.length < 2) {
      fail(row.player + ' ' + row.season + ' at ' + row.club + ' has fewer than two sources');
      continue;
    }
    const hosts = new Set();
    for (const source of row.sources) {
      try {
        hosts.add(new URL(source).hostname.replace(/^www\./, ''));
      } catch {
        fail(row.player + ' has an invalid source URL: ' + source);
      }
    }
    if (hosts.size < 2) fail(row.player + ' ' + row.season + ' has fewer than two independent source hosts');
  }
  console.log('   77 seed tuples, 77 fallback tuples, 73 exact matches, 4 variants, 19 evidence commits');
}

section = 2;
console.log('2) Current fallback carries exactly the 27 researched 2025-2026 rows and no projection');
{
  const fallbackRows = parseFallback(read('src/data/careerPlayers.ts'));
  if (fallbackRows.length < 1500) abort('fallback parser found only ' + fallbackRows.length + ' season rows');
  if (CONTROL === 'fallback') {
    const before = fallbackRows.length;
    fallbackRows.push(clone(ledger.fallbackProjectionRows[0]));
    if (fallbackRows.length !== before + 1) abort('fallback control changed nothing');
    console.log('   NEGATIVE CONTROL ON: restored one quarantined fallback tuple in memory');
  }
  /* Round 531: the fallback is baked from the live table, so it carries the
     same 27 researched 2025-2026 tuples section 5 pins on live, and nothing
     else from that season. Before the bake the file was hand typed and the
     rule was simply "none", because every 2025-2026 row it had was a
     projection. */
  const currentSeason = fallbackRows.filter(row => row.season === '2025-2026');
  compareSets('fallback 2025-2026 rows', ledger.preservedResearchedLiveRows, currentSeason, tupleKey);
  const present = new Set(fallbackRows.map(tupleKey));
  const lingering = ledger.fallbackProjectionRows.filter(row => present.has(tupleKey(row)));
  if (lingering.length) fail(lingering.length + ' exact quarantined fallback tuple(s) remain');

  const impact = ledger.batchEvidence.transferPathImpact;
  const transferRows = parseCompactCareers(read(impact.careerPullFile));
  const transferCurrent = transferRows.filter(row => row.season === '2025-2026');
  const transferPresent = new Set(transferRows.map(transferTupleKey));
  const lingeringSeed = ledger.liveSeedRows.filter(row => transferPresent.has(transferTupleKey(row)));
  const missingPreserved = ledger.preservedResearchedLiveRows.filter(row => !transferPresent.has(transferTupleKey(row)));
  if (lingeringSeed.length) fail(lingeringSeed.length + ' quarantined seed spell(s) remain in the Transfer Path pull');
  if (missingPreserved.length) fail(missingPreserved.length + ' researched spell(s) are missing from the Transfer Path pull');
  if (transferCurrent.length !== 27) fail('Transfer Path pull has ' + transferCurrent.length + ' 2025-2026 spells instead of the 27 preserved rows');

  const puzzleIds = read(impact.puzzlePullFile).split('\n').filter(Boolean).map(line => line.split('|')[0]);
  const quarantinedIds = impact.quarantinedPuzzleIds;
  if (quarantinedIds.length !== 17 || new Set(quarantinedIds).size !== 17) fail('Transfer Path impact does not track 17 unique puzzle ids');
  const lingeringPuzzles = quarantinedIds.filter(id => puzzleIds.includes(id));
  if (lingeringPuzzles.length) fail(lingeringPuzzles.length + ' unreachable Transfer Path puzzle(s) remain in the pull');
  if (puzzleIds.length !== impact.retainedPuzzleCount || puzzleIds.length !== 885) fail('Transfer Path pull has ' + puzzleIds.length + ' puzzles instead of 885');

  console.log('   ' + fallbackRows.length + ' fallback seasons and ' + transferRows.length + ' Transfer Path spells parsed');
  console.log('   all 77 projected tuples absent, 27 researched spells preserved, 17 unreachable puzzles quarantined');
}

section = 3;
console.log('3) Two fail-closed migrations cover all 77 exact live seed tuples');
{
  const parsed = ledger.batchEvidence.quarantineMigrations.map(entry => ({
    ...parseMigration(read(entry.file), entry.file),
    expectedCount: entry.tupleCount,
  }));
  if (parsed.length !== 2) fail('expected two quarantine migrations, found ' + parsed.length);
  for (const migration of parsed) checkMigrationShape(migration, migration.expectedCount);
  if (CONTROL === 'migration') {
    const before = parsed[1].rows.length;
    parsed[1].rows.pop();
    if (parsed[1].rows.length !== before - 1) abort('migration control changed nothing');
    console.log('   NEGATIVE CONTROL ON: removed one exact tuple from the second migration in memory');
  }
  const allRows = parsed.flatMap(migration => migration.rows);
  compareSets('quarantine migration union', ledger.liveSeedRows, allRows, liveTupleKey);
  const first = new Set(parsed[0].rows.map(liveTupleKey));
  const overlap = parsed[1].rows.filter(row => first.has(liveTupleKey(row)));
  if (overlap.length) fail('the two migrations overlap on ' + overlap.length + ' tuple(s)');
  if (allRows.length !== 77) fail('the migration union carries ' + allRows.length + ' tuples instead of 77');
  console.log('   ' + parsed.map(item => item.rows.length).join(' + ') + ' exact tuples, full preconditions and removal guards present');
}

section = 4;
console.log('4) The 27 later researched live tuples stay outside quarantine');
{
  const preserved = clone(ledger.preservedResearchedLiveRows);
  if (CONTROL === 'preserve') {
    const planted = { ...clone(ledger.liveSeedRows[0]), observedCreatedAt: '2026-07-10 00:00:00+00' };
    const before = preserved.length;
    preserved.push(planted);
    if (preserved.length !== before + 1) abort('preserve control changed nothing');
    console.log('   NEGATIVE CONTROL ON: mislabeled one seed tuple as a preserved researched row');
  }
  if (preserved.length !== 27) fail('preserved fixture has ' + preserved.length + ' rows instead of 27');
  if (new Set(preserved.map(liveTupleKey)).size !== preserved.length) fail('preserved fixture has duplicate exact tuples');
  if (preserved.some(row => row.season !== '2025-2026')) fail('preserved fixture contains a different season');
  if (preserved.some(row => !/^2026-07-(08|10)/.test(row.observedCreatedAt || ''))) {
    fail('preserved fixture contains a row outside the observed July 8 and July 10 research batches');
  }
  const seedKeys = new Set(ledger.liveSeedRows.map(liveTupleKey));
  const seedNames = new Set(ledger.liveSeedRows.map(row => row.player));
  const exactOverlap = preserved.filter(row => seedKeys.has(liveTupleKey(row)));
  const nameOverlap = preserved.filter(row => seedNames.has(row.player));
  if (exactOverlap.length) fail(exactOverlap.length + ' preserved tuple(s) overlap the seed quarantine');
  if (nameOverlap.length) fail(nameOverlap.length + ' preserved player name(s) overlap the seed tranche');
  const migrationRows = ledger.batchEvidence.quarantineMigrations.flatMap(entry => parseMigration(read(entry.file), entry.file).rows);
  const migrationKeys = new Set(migrationRows.map(liveTupleKey));
  const endangered = preserved.filter(row => migrationKeys.has(liveTupleKey(row)));
  if (endangered.length) fail(endangered.length + ' preserved tuple(s) are named by a quarantine migration');
  console.log('   27 exact July research tuples are unique and disjoint from all 77 quarantine tuples');
}

section = 5;
console.log('5) Live 2025-2026 state equals the 27 preserved researched tuples');
{
  let liveRows = null;
  if (LOCAL_ONLY && CONTROL !== 'live') {
    console.log('   SKIPPED BY CAREER_SEASON_LOCAL_ONLY=1. Live is not claimed checked.');
  } else if (LOCAL_ONLY && CONTROL === 'live') {
    liveRows = clone(ledger.preservedResearchedLiveRows);
    const before = liveRows.length;
    liveRows.push(clone(ledger.liveSeedRows[0]));
    if (liveRows.length !== before + 1) abort('live control changed nothing');
    console.log('   NEGATIVE CONTROL ON: injected one seed tuple into the local live-response fixture');
  } else {
    const client = read('src/integrations/supabase/client.ts');
    const url = client.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)?.[1];
    const key = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*["']([^"']+)["']/)?.[1];
    if (!url || !key) abort('Could not read the pinned Supabase URL and public key');
    const endpoint = new URL(url + '/rest/v1/career_seasons');
    endpoint.searchParams.set('select', 'season,club,goals,assists,appearances,market_value,sort_order,career_players!inner(player_name)');
    endpoint.searchParams.set('season', 'eq.2025-2026');
    endpoint.searchParams.set('limit', '500');
    let response;
    try {
      response = await fetch(endpoint, { headers: { apikey: key, Authorization: 'Bearer ' + key } });
    } catch (error) {
      abort('Supabase unreachable, nothing was checked: ' + error.message);
    }
    if (!response.ok) abort('Supabase career query failed ' + response.status + ': ' + (await response.text()).slice(0, 300));
    const body = await response.json();
    if (!Array.isArray(body)) abort('Live query returned a non-array response');
    liveRows = body.map(row => ({
      player: row.career_players?.player_name,
      season: row.season,
      club: row.club,
      goals: row.goals,
      assists: row.assists,
      appearances: row.appearances,
      marketValue: row.market_value,
      sortOrder: row.sort_order,
    }));
    if (CONTROL === 'live') {
      const before = liveRows.length;
      liveRows.push(clone(ledger.liveSeedRows[0]));
      if (liveRows.length !== before + 1) abort('live control changed nothing');
      console.log('   NEGATIVE CONTROL ON: injected one seed tuple into the live response');
    }
  }

  if (liveRows) {
    compareSets('live preserved state', ledger.preservedResearchedLiveRows, liveRows, liveTupleKey);
    const seedKeys = new Set(ledger.liveSeedRows.map(liveTupleKey));
    const lingering = liveRows.filter(row => seedKeys.has(liveTupleKey(row)));
    if (lingering.length) fail(lingering.length + ' seed-derived live tuple(s) remain');
    if (liveRows.length !== 27) fail('live has ' + liveRows.length + ' 2025-2026 rows instead of 27');
    console.log('   ' + liveRows.length + ' exact live tuples checked against the preservation fixture');
  }
}

const total = Object.values(failures).reduce((sum, count) => sum + count, 0);
if (CONTROL) {
  const ownSection = { sources: 1, evidence: 1, fallback: 2, migration: 3, preserve: 4, live: 5 }[CONTROL];
  const otherFailures = Object.entries(failures)
    .filter(([number]) => Number(number) !== ownSection)
    .reduce((sum, [, count]) => sum + count, 0);
  if (failures[ownSection] > 0 && otherFailures === 0) {
    console.log('\ncontrol "' + CONTROL + '": section ' + ownSection + ' failed and every other section stayed green, the check works');
    process.exit(0);
  }
  abort('\ncontrol "' + CONTROL + '" did not fail only section ' + ownSection + ': ' + JSON.stringify(failures));
}
if (total > 0) {
  console.error('\nsimCareerSeasonTruth: ' + total + ' failure(s)');
  process.exit(1);
}
console.log('\nsimCareerSeasonTruth: all green');
