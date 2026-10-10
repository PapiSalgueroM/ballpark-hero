// Saved Trophy Cabinet campaigns. Runtime belongs to remote CI only.
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
assert(process.env.CI, 'Run this proof only in remote CI');
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* Release AT: the base is the tree just before this round's own merge on the release line (2ee41bd6, Rounds 1188 to
   1191 merged), not Release AR: the release line gained Round 1185's form swing before this round met it. */
const BASE = '2ee41bd6de85e07161522e83b7249a7fe071d58c', BASE_TREE = 'bc65f852d6f069c8c6ea0d6b999e40454432205b';
const OUT = path.resolve(ROOT, process.env.CAREER_TROPHY_RUNS_ARTIFACTS || '.tmp-fx/career-trophy-runs/outcomes');
const CABINET = 'src/components/soccer-career/TrophyCabinet.tsx', READER = 'src/lib/soccerSeasonCompetitions.ts';
const sha = value => createHash('sha256').update(value).digest('hex'), copy = value => JSON.parse(JSON.stringify(value));
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
const text = file => fs.readFileSync(path.join(ROOT, file), 'utf8').replaceAll('\r\n', '\n');
const heldFiles = [CABINET, READER, 'src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerContinental.ts', 'src/lib/uclTieRule.ts', 'src/lib/uclFormatHistory.ts', 'src/pages/SoccerCareer.tsx', 'src/test/fixtures/soccerSeasonCompetitions1173.ts', 'scripts/data/careerLeagueWorldSaves1100.json', 'scripts/simCareerTrophyRuns.mjs'];
function sourceHashes() { const hashes = {}; for (const file of heldFiles) { const bytes = fs.readFileSync(path.join(ROOT, file)); hashes[file] = sha(bytes); } return hashes; }
function write(dir, name, value) { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(value, null, 2)); }
export function withTrophySeed(seed, fn) {
  const oldRandom = Math.random, oldNow = Date.now, draws = []; let state = seed >>> 0;
  Math.random = () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); const value = ((t ^ t >>> 14) >>> 0) / 4294967296; draws.push(value); return value; };
  Date.now = () => 1791586800000;
  try { return { value: fn(), draws }; } finally { Math.random = oldRandom; Date.now = oldNow; }
}
export async function bundleTrophyRuns({ original = false, patch } = {}) {
  const receipts = [], loaded = [], require = createRequire(path.join(ROOT, 'package.json'));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'trophy-runs-')), output = path.join(tmp, 'bundle.cjs');
  const stdin = `export * as soccer from './src/lib/soccerCareerEngine'; export * as reader from './src/lib/soccerSeasonCompetitions'; export * as fixtures from './src/test/fixtures/soccerSeasonCompetitions1173'; ${original ? '' : "import * as React from 'react'; import { renderToStaticMarkup } from 'react-dom/server'; import { TrophyClubCampaign } from './src/components/soccer-career/TrophyCabinet'; export * as cabinet from './src/components/soccer-career/TrophyCabinet'; export const renderCampaign=(career,row)=>renderToStaticMarkup(React.createElement(TrophyClubCampaign,{career,row}));"}`;
  const plugin = { name: 'trophy-source', setup(b) { b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
    const rel = path.relative(ROOT, args.path).replaceAll('\\', '/'); if (!rel.startsWith('src/')) return;
    let source = original ? execFileSync('git', ['show', `${BASE}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).replaceAll('\r\n', '\n') : fs.readFileSync(args.path, 'utf8').replaceAll('\r\n', '\n');
    const sourceBeforeSha256 = sha(source);
    if (patch && rel === patch.file) {
      assert.equal(source.split(patch.from).length - 1, 1, `${patch.name}: unique source anchor`);
      const before = sha(source); source = source.replace(patch.from, patch.to); assert.notEqual(sha(source), before, `${patch.name}: effective copied source change`);
      receipts.push({ name: patch.name, file: rel, beforeSha256: before, afterSha256: sha(source), effective: true });
    }
    loaded.push({ file: rel, beforeSha256: sourceBeforeSha256, compiledSha256: sha(source), changed: sourceBeforeSha256 !== sha(source) });
    return { contents: source, loader: rel.endsWith('.tsx') ? 'tsx' : rel.endsWith('.json') ? 'json' : 'ts' };
  }); } };
  try {
    await build({ stdin: { contents: stdin, resolveDir: ROOT, loader: 'tsx' }, bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', outfile: output, alias: { '@': path.join(ROOT, 'src') }, plugins: [plugin], define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' }, loader: { '.css': 'empty', '.svg': 'empty', '.png': 'empty', '.jpg': 'empty', '.webp': 'empty' }, logLevel: 'error' });
    if (patch) assert.equal(receipts.length, 1, 'Copied product control was loaded exactly once');
    return { ...require(output), receipts, loaded };
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
// The oracle below derives display fields directly from saved games, independently of the production reader.
export function expectedCampaign(career, row) {
  const run = row.clubCupRun ?? career.lastUCLResult;
  const valid = run?.qualified && run.seasonYear === row.year && run.club === row.club && Array.isArray(run.matches);
  if (!valid) return { missing: true, matches: [] };
  const rounds = { R16: 'Round of 16', QF: 'Quarter-final', SF: 'Semi-final', Final: 'Final', PO: 'Play-off' };
  const first = (run.firstStage?.stages ?? []).flatMap(stage => stage.games.map(game => ({ round: `${stage.label}, game ${game.matchday}`, opponent: game.opponent, score: `${game.goalsFor}-${game.goalsAgainst}`, home: game.home ? 'Home' : 'Away', playerGoals: `Your goals in this game: ${game.playerGoals}`, note: null, extraTime: null })));
  const twoLegFinal = run.matches.some(match => match.round === 'Final' && match.leg === 2);
  const knockout = run.matches.map(game => {
    const leg = game.round !== 'Final' || twoLegFinal, notes = [];
    if (game.aggFor !== undefined && game.aggAgainst !== undefined) notes.push(`${game.aggFor}-${game.aggAgainst} on aggregate`);
    if (game.decidedBy === 'penalties') notes.push(Number.isInteger(game.pensFor) && Number.isInteger(game.pensAgainst) ? `${game.pensFor}-${game.pensAgainst} on penalties` : 'Settled on penalties. Penalty score not recorded.');
    else if (game.decidedBy === 'awayGoals') notes.push('Settled on away goals');
    else if (game.decidedBy === 'extraTime' || game.afterExtraTime) notes.push('After extra time');
    const et = game.afterExtraTime || game.decidedBy === 'extraTime', recordedET = Number.isInteger(game.etFor) && game.etFor >= 0 && Number.isInteger(game.etAgainst) && game.etAgainst >= 0;
    return { round: `${rounds[game.round] ?? game.round}${leg ? `, leg ${game.leg}` : ''}`, opponent: game.opponent, score: `${game.goalsFor}-${game.goalsAgainst}`, home: leg ? game.home ? 'Home' : 'Away' : null, playerGoals: `Your goals in this game: ${game.playerGoals}`, note: notes.join(' · ') || null, extraTime: et && (recordedET || !notes.includes('After extra time')) ? recordedET ? `Goals in extra time: ${game.etFor}-${game.etAgainst} (included in the score).` : 'After extra time' : null };
  });
  return { missing: first.length + knockout.length === 0, name: run.competition ?? 'European club cup', result: run.result, goals: `Your saved campaign goals: ${run.playerGoals}`, format: run.simplified ?? null, matches: [...first, ...knockout] };
}
export function renderedCampaign(html) {
  const dom = new JSDOM(html), document = dom.window.document, get = (root, key) => root.querySelector(`[data-trophy-campaign-${key}]`)?.textContent ?? null;
  try { return { missing: !!document.querySelector('[data-trophy-campaign-missing]'), name: get(document, 'name'), result: get(document, 'result'), goals: get(document, 'goals'), format: get(document, 'format'), matches: [...document.querySelectorAll('[data-trophy-campaign-match]')].map(row => Object.fromEntries(['round', 'opponent', 'score', 'home', 'player-goals', 'note', 'extra-time'].map(key => [{ 'player-goals': 'playerGoals', 'extra-time': 'extraTime' }[key] ?? key, get(row, key)]))) }; }
  finally { dom.window.close(); }
}
const captured = () => JSON.parse(text('scripts/data/careerLeagueWorldSaves1100.json')).saves.find(save => save.id === 'ere').state;
function fixtureCases(B) {
  const F = B.fixtures, caseOf = (id, row, run) => ({ id, row: { ...copy(row), championsLeague: row.clubCountry === 'England', clubCupTitle: row.clubCountry !== 'England' ? run?.competition ?? 'Club cup' : undefined, clubCupRun: copy(run) }, career: { lastUCLResult: null } });
  const rows = [caseOf('held-quarter-final', F.cupSeason, F.clubCampaign), caseOf('held-first-stage', F.cupSeason, F.firstStageCampaign), caseOf('held-caf-final', F.twoLegFinalSeason, F.twoLegFinalCampaign), caseOf('held-neutral-final', F.cupSeason, F.neutralFinalCampaign)];
  const pens = copy(F.neutralFinalCampaign); Object.assign(pens.matches[0], { goalsFor: 1, goalsAgainst: 1, decidedBy: 'penalties', pensFor: 5, pensAgainst: 4, afterExtraTime: true, etFor: 0, etAgainst: 0 });
  rows.push(caseOf('held-penalties-extra-time', F.cupSeason, pens));
  const awayGoals = copy(F.clubCampaign); awayGoals.matches[1].decidedBy = 'awayGoals'; rows.push(caseOf('held-away-goals', F.cupSeason, awayGoals));
  for (const [id, change] of [['missing', run => undefined], ['wrong-year', run => ({ ...run, seasonYear: run.seasonYear - 1 })], ['wrong-club', run => ({ ...run, club: 'A different recorded club' })], ['unanchored', run => { delete run.seasonYear; delete run.club; return run; }]]) {
    const item = caseOf(id, F.cupSeason, F.neutralFinalCampaign); item.row.clubCupRun = change(item.row.clubCupRun); item.career.lastUCLResult = id === 'missing' ? null : copy(F.neutralFinalCampaign); if (id === 'unanchored') item.career.lastUCLResult = null; rows.push(item);
  }
  return rows;
}
export async function prepareTrophyFixtures(B) {
  const carrier = B.soccer.repairCareer(copy(captured())), scenarios = [
    { id: 'modern-europe', country: 'England', year: 2027 }, { id: 'historical-europe', country: 'England', year: 1980 },
    { id: 'libertadores', country: 'Argentina', year: 2027 }, { id: 'afc', country: 'Japan', year: 2027 },
    { id: 'caf', country: 'Egypt', year: 2027 }, { id: 'concacaf', country: 'USA', year: 2027 },
  ];
  for (const scenario of scenarios) {
    const club = B.soccer.FALLBACK_CLUBS.find(club => club.country === scenario.country); assert(club, `${scenario.id}: verified existing club pool supplies the simulated club`);
    const state = { ...copy(carrier), currentClub: club.name, currentClubCountry: club.country, currentClubTier: 1, overall: 99, position: 'ST', seasons: [{ ...copy(carrier.seasons.at(-1)), year: scenario.year - 1, club: club.name, clubCountry: club.country }] };
    const row = { ...copy(B.fixtures.cupSeason), year: scenario.year, club: club.name, clubCountry: club.country, domesticCup: false, cupRun: undefined, championsLeague: scenario.country === 'England', clubCupTitle: undefined };
    scenario.state = state; scenario.row = row;
    let winner;
    for (let attempt = 0; attempt < 1024 && !winner; attempt++) { const seed = 119200 + attempt, draw = withTrophySeed(seed, () => B.soccer.simulateUCL(copy(state), copy(row))); if (draw.value.result === 'Winner') winner = { seed, ...draw }; }
    assert(winner, `${scenario.id}: bounded search supplies an actual saved simulated win`);
    scenario.winner = winner; scenario.row.clubCupRun = { ...copy(winner.value), seasonYear: row.year, club: row.club }; if (scenario.country !== 'England') scenario.row.clubCupTitle = winner.value.competition;
  }
  return { carrier, scenarios };
}
const CONTROLS = [
  { name: 'score', file: CABINET, from: '`${game.goalsFor}-${game.goalsAgainst}`', to: '`${game.goalsFor + 1}-${game.goalsAgainst}`', failed: ['saved markup', 'actual campaign markup'] },
  { name: 'opponent', file: CABINET, from: "{game.opponent ?? 'Opponent not recorded'}", to: "{'A wrong opponent'}", failed: ['saved markup', 'actual campaign markup'] },
  { name: 'venue', file: CABINET, from: "{game.home !== undefined && <p", to: "{true && <p", failed: ['saved markup', 'actual campaign markup'] },
  { name: 'settlement', file: CABINET, from: '{game.note && <p', to: '{false && <p', failed: ['saved markup', 'actual campaign markup'] },
  { name: 'firstStage', file: READER, from: '(run.firstStage?.stages ?? [])', to: '([])', failed: ['reader baseline', 'saved markup', 'actual campaign markup'] },
  { name: 'anchor', file: READER, from: 'run.seasonYear !== row.year || run.club !== row.club || ', to: '', failed: ['reader baseline', 'missing markup', 'snapshot precedence'] },
  { name: 'mutation', file: CABINET, from: 'const run = savedClubCampaign(career, row);', to: 'career.money = (career.money ?? 0) + 1; const run = savedClubCampaign(career, row);', failed: ['read boundary'] },
];
async function run(B, A, prepared, dir) {
  const report = { head: git('rev-parse', 'HEAD'), tree: git('rev-parse', 'HEAD^{tree}'), baseHead: BASE, baseTree: BASE_TREE, cases: [], failed: [], receipts: B.receipts, loaded: B.loaded, counts: {} };
  const group = async (name, fn) => { try { await fn(); report.cases.push({ name, passed: true }); console.log(`PASS ${name}`); } catch (error) { report.cases.push({ name, passed: false, errorName: error.name, error: String(error.stack || error) }); report.failed.push(name); console.log(`FAIL ${name}: ${error.message}`); } };
  await group('engine baseline', () => {
    const pairs = [];
    for (let seed = 0; seed < 24; seed++) {
      const input = copy(prepared.carrier); input.phase = 'playing'; input.pendingSummary = null; input.pendingEvents = []; input.pendingBallonDor = null;
      const before = structuredClone(input), old = withTrophySeed(1192100 + seed, () => A.soccer.advanceProSeason(copy(input), A.soccer.FALLBACK_CLUBS)), current = withTrophySeed(1192100 + seed, () => B.soccer.advanceProSeason(copy(input), B.soccer.FALLBACK_CLUBS));
      pairs.push({ seed: 1192100 + seed, input, original: old, current }); assert.deepEqual(current, old); assert.deepEqual(input, before);
    }
    write(dir, 'engine-pairs', pairs); report.counts.enginePairs = pairs.length;
  });
  const held = fixtureCases(B), raw = [];
  await group('reader baseline', () => { for (const item of held) { const original = A.reader.savedSeasonCompetitions(copy(item.career), copy(item.row)), current = B.reader.savedSeasonCompetitions(copy(item.career), copy(item.row)); raw.push({ ...item, original, current }); assert.deepEqual(current, original); } });
  await group('saved markup', () => { for (const item of held.filter(item => !['missing', 'wrong-year', 'wrong-club', 'unanchored'].includes(item.id))) { const expected = expectedCampaign(item.career, item.row), actual = renderedCampaign(B.renderCampaign(copy(item.career), copy(item.row))); write(dir, `held-${item.id}`, { ...item, expected, actual }); assert.deepEqual(actual, expected); } report.counts.heldCampaigns = 6; });
  await group('missing markup', () => { for (const item of held.slice(6)) { const actual = renderedCampaign(B.renderCampaign(copy(item.career), copy(item.row))); write(dir, `held-${item.id}`, { ...item, actual }); assert.equal(actual.missing, true); assert.deepEqual(actual.matches, []); assert.equal(actual.result, null); assert.equal(actual.goals, null); } report.counts.missingCampaigns = 4; });
  await group('actual campaign baseline', () => {
    const pairs = [];
    for (const scenario of prepared.scenarios) for (let seed = 0; seed < 32; seed++) { const original = withTrophySeed(1192200 + seed, () => A.soccer.simulateUCL(copy(scenario.state), copy(scenario.row))), current = withTrophySeed(1192200 + seed, () => B.soccer.simulateUCL(copy(scenario.state), copy(scenario.row))); pairs.push({ id: scenario.id, seed: 1192200 + seed, input: scenario.state, row: scenario.row, original, current }); assert.deepEqual(current, original); }
    write(dir, 'campaign-pairs', pairs); report.counts.campaignPairs = pairs.length;
  });
  await group('actual campaign markup', () => { for (const scenario of prepared.scenarios) { const career = { lastUCLResult: null }, expected = expectedCampaign(career, scenario.row), actual = renderedCampaign(B.renderCampaign(copy(career), copy(scenario.row))); write(dir, `actual-${scenario.id}`, { ...scenario, expected, actual }); assert.deepEqual(actual, expected); assert(actual.matches.length > 0); } report.counts.actualCampaigns = prepared.scenarios.length; });
  await group('snapshot precedence', () => { const row = copy(held[0].row), career = { lastUCLResult: copy(held[3].row.clubCupRun) }; assert.deepEqual(B.reader.savedClubCampaign(career, row), row.clubCupRun); const old = { ...row }; delete old.clubCupRun; career.lastUCLResult = copy(row.clubCupRun); assert.deepEqual(B.reader.savedClubCampaign(career, old), row.clubCupRun); career.lastUCLResult.seasonYear--; assert.equal(B.reader.savedClubCampaign(career, old), null); });
  await group('read boundary', () => { for (const item of [...held, ...prepared.scenarios.map(scenario => ({ career: copy(prepared.carrier), row: scenario.row }))]) { const career = copy(item.career), row = copy(item.row), before = structuredClone({ career, row }); const observed = withTrophySeed(1192, () => ({ run: B.reader.savedClubCampaign(career, row), competitions: B.reader.savedSeasonCompetitions(career, row), markup: B.renderCampaign(career, row) })); assert.deepEqual(observed.draws, []); assert.deepEqual({ career, row }, before); } });
  await group('winning seasons', () => { const seasons = prepared.scenarios.map(scenario => copy(scenario.row)), career = { seasons }; const before = structuredClone(career); for (const category of ['ucl', 'club']) { const field = category === 'ucl' ? 'championsLeague' : 'clubCupTitle'; assert.deepEqual(B.cabinet.trophyWins(career, category), seasons.filter(row => !!row[field]).sort((a, b) => b.year - a.year)); } assert.deepEqual(career, before); });
  write(dir, 'reader-pairs', raw); report.status = report.failed.length ? 'failed' : 'passed'; write(dir, 'report', report); return report;
}
if (process.env.CAREER_TROPHY_RUNS_IMPORT_ONLY !== '1') {
  assert.equal(git('rev-parse', `${BASE}^{tree}`), BASE_TREE, 'Exact unchanged AR source tree');
  const before = sourceHashes(), A = await bundleTrophyRuns({ original: true }), B = await bundleTrophyRuns(), prepared = await prepareTrophyFixtures(B);
  const healthy = await run(B, A, prepared, path.join(OUT, 'healthy')); healthy.sourceBefore = before; healthy.sourceAfter = sourceHashes(); healthy.sourceHeld = JSON.stringify(healthy.sourceBefore) === JSON.stringify(healthy.sourceAfter); write(path.join(OUT, 'healthy'), 'report', healthy);
  assert.equal(healthy.sourceHeld, true); assert.deepEqual(healthy.failed, [], 'All nine healthy outcome groups pass'); assert.equal(healthy.cases.length, 9);
  const nativeCases = ['modern-europe', 'historical-europe', 'caf'].map(id => { const scenario = prepared.scenarios.find(scenario => scenario.id === id); return { id, category: scenario.country === 'England' ? 'ucl' : 'club', row: scenario.row, seed: scenario.winner.seed, simulation: 'Actual seeded simulated campaign, not a real historical result' }; });
  nativeCases.push({ id: 'older-missing', category: 'ucl', row: { ...copy(B.fixtures.cupSeason), championsLeague: true, clubCupRun: undefined }, simulation: 'Explicit held fictional trophy row without recorded matches' });
  write(OUT, 'native-fixtures', { carrier: prepared.carrier, cases: nativeCases });
  const controls = [];
  if (process.env.CAREER_TROPHY_RUNS_CONTROL === 'all') for (const patch of CONTROLS) {
    const faulty = await bundleTrophyRuns({ patch }), result = await run(faulty, A, prepared, path.join(OUT, patch.name));
    assert.deepEqual([...result.failed].sort(), [...patch.failed].sort(), `${patch.name}: exact intended failed groups`); assert(result.cases.filter(row => !row.passed).every(row => row.errorName === 'AssertionError'), `${patch.name}: assertion outcomes, not setup errors`); assert.equal(result.cases.length, healthy.cases.length);
    assert(result.cases.find(row => row.name === 'engine baseline').passed && result.cases.find(row => row.name === 'actual campaign baseline').passed, `${patch.name}: original AR full-state and RNG contracts still pass`);
    controls.push({ name: patch.name, failed: result.failed, effective: faulty.receipts[0].effective, receipts: faulty.receipts }); console.log(`CONTROL FIRED(${patch.name}): ${result.failed.join(', ')}`);
  }
  write(OUT, 'controls', { head: healthy.head, tree: healthy.tree, controls, sourceHeld: JSON.stringify(before) === JSON.stringify(sourceHashes()) });
  console.log(`Trophy campaigns: ${healthy.cases.length} groups, ${healthy.counts.enginePairs} full AR season pairs, ${healthy.counts.campaignPairs} full campaign/RNG pairs, ${controls.length} effective controls; artifacts ${OUT}`);
}
