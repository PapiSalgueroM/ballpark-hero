// Remote saved-season comparison and availability proof.
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
assert(process.env.CI, 'Season history proof runs only in remote CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = 'fa24b3848d99e29367486489b081a483dc544206', BASE_TREE = 'd9175fa74fc5784ba6acfd1a62f4592cb106f22f';
const OUT = path.resolve(ROOT, process.env.SEASON_HISTORY_ARTIFACTS || '.tmp-fx/season-history/outcomes');
const HELPER = 'src/lib/soccerCareerSeasonHistory.ts';
const copy = value => JSON.parse(JSON.stringify(value)), sha = value => createHash('sha256').update(value).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
const text = file => fs.readFileSync(path.join(ROOT, file), 'utf8').replaceAll('\r\n', '\n');
const heldFiles = [HELPER, 'src/lib/soccerCareerEngine.ts', 'src/lib/careerSeasonRatings.ts', 'src/lib/soccerSeasonCompetitions.ts', 'src/components/soccer-career/SeasonRatings.tsx', 'src/components/soccer-career/SoccerSeasonHistory.tsx', 'src/pages/SoccerCareer.tsx', 'scripts/data/careerLeagueWorldSaves1100.json', 'scripts/qa/seasonHistory1193.mjs', 'scripts/qa/playSeasonHistory1193.mjs', 'scripts/simSoccerSeasonHistory.mjs'];
function hashes() { const out = {}; for (const file of heldFiles) { const bytes = fs.readFileSync(path.join(ROOT, file)); out[file] = sha(bytes); } return out; }
const write = (dir, name, value) => { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, name + '.json'), JSON.stringify(value, null, 2)); };
export function withSeasonHistorySeed(seed, fn) {
  const random = Math.random, now = Date.now, draws = []; let state = seed >>> 0;
  Math.random = () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); const value = ((t ^ t >>> 14) >>> 0) / 4294967296; draws.push(value); return value; };
  Date.now = () => 1791586800000;
  try { return { value: fn(), draws }; } finally { Math.random = random; Date.now = now; }
}
export async function bundleSeasonHistory({ original = false, patch } = {}) {
  const receipts = [], loaded = [], require = createRequire(path.join(ROOT, 'package.json'));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'season-history-')), output = path.join(tmp, 'bundle.cjs');
  const stdin = "export * as soccer from './src/lib/soccerCareerEngine'; export * as reader from './src/lib/soccerSeasonCompetitions'; export * as ratings from './src/lib/careerSeasonRatings'; export * as fixtures from './src/test/fixtures/soccerSeasonCompetitions1173';" + (original ? '' : "export * as history from './src/lib/soccerCareerSeasonHistory';");
  const plugin = { name: 'season-history-source', setup(b) { b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
    const rel = path.relative(ROOT, args.path).replaceAll('\\', '/'); if (!rel.startsWith('src/')) return;
    let source = original ? execFileSync('git', ['show', BASE + ':' + rel], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).replaceAll('\r\n', '\n') : fs.readFileSync(args.path, 'utf8').replaceAll('\r\n', '\n');
    const before = sha(source);
    if (patch && rel === patch.file) {
      assert.equal(source.split(patch.from).length - 1, 1, patch.name + ': unique source anchor');
      source = source.replace(patch.from, patch.to); assert.notEqual(sha(source), before, patch.name + ': effective copied source change');
      receipts.push({ name: patch.name, file: rel, beforeSha256: before, afterSha256: sha(source), effective: true });
    }
    loaded.push({ file: rel, beforeSha256: before, compiledSha256: sha(source), changed: before !== sha(source) });
    return { contents: source, loader: rel.endsWith('.tsx') ? 'tsx' : rel.endsWith('.json') ? 'json' : 'ts' };
  }); } };
  try {
    await build({ stdin: { contents: stdin, resolveDir: ROOT, loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', outfile: output, alias: { '@': path.join(ROOT, 'src') }, plugins: [plugin], define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' }, loader: { '.css': 'empty', '.svg': 'empty', '.png': 'empty', '.jpg': 'empty', '.webp': 'empty' }, logLevel: 'error' });
    if (patch) assert.equal(receipts.length, 1, 'Copied helper defect was loaded exactly once');
    return { ...require(output), receipts, loaded };
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
// Independent raw-save oracle. This deliberately imports no production season readers.
const integer = value => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
const name = value => typeof value === 'string' && value.trim().length ? value : null;
const ovr = value => Number.isInteger(value) && value >= 1 && value <= 99 ? value : null;
export function rawAvailability(row) {
  const apps = integer(row.apps), injury = name(row.injury), severe = typeof row.injurySevere === 'boolean' ? row.injurySevere : null;
  const status = { BANNED: 'Banned', 'BANNED (PED)': 'Banned', PRISON: 'Prison', CONVICTED: 'Convicted' };
  return { apps, injury, injuryRecorded: row.injury === null || injury !== null, injuryWeeks: integer(row.injuryWeeks), injurySevere: severe, suspensionMatches: integer(row.suspensionMatches), zeroAppsReason: apps !== 0 ? null : (Object.prototype.hasOwnProperty.call(status, row.club) ? status[row.club] : null) ?? (injury ? severe === true ? 'Severe injury recorded' : 'Injury recorded' : 'No appearances recorded') };
}
export function rawHistory(career) {
  return career.seasons.flatMap((row, index) => {
    if (row.type !== 'playing') return [];
    const back = ['CB', 'LB', 'RB'].includes(career.position), keys = career.position === 'GK' ? ['apps', 'cleanSheets'] : back ? ['apps', 'cleanSheets', 'goals'] : ['apps', 'goals', 'assists'];
    const labels = { apps: 'Apps', goals: 'Goals', assists: 'Assists', cleanSheets: 'Clean sheets' };
    const apps = integer(row.apps), rating = apps !== null && apps > 0 && Number.isFinite(row.rating) && row.rating >= 3 && row.rating <= 10 ? row.rating : null;
    const metrics = [{ key: 'ovr', label: 'Saved OVR', digits: 0, value: ovr(row.ovr) }, { key: 'rating', label: 'Match rating', digits: 1, value: rating }, ...keys.map(key => ({ key, label: labels[key], digits: 0, value: back && key === 'cleanSheets' && apps > 0 && ovr(row.ovr) === null && row.cleanSheets === 0 ? null : integer(row[key]) }))];
    return [{ index, year: integer(row.year), age: integer(row.age), club: name(row.club), onLoanFrom: name(row.onLoanFrom), metrics, availability: rawAvailability(row) }];
  });
}
export function rawComparison(career, firstIndex, secondIndex) {
  if (!Number.isInteger(firstIndex) || !Number.isInteger(secondIndex) || firstIndex === secondIndex) return null;
  const rows = rawHistory(career), first = rows.find(row => row.index === firstIndex), second = rows.find(row => row.index === secondIndex);
  if (!first || !second) return null;
  return { first, second, metrics: first.metrics.map(metric => { const other = second.metrics.find(row => row.key === metric.key); return { key: metric.key, label: metric.label, digits: metric.digits, first: metric.value, second: other.value, delta: metric.value === null || other.value === null ? null : Number((other.value - metric.value).toFixed(metric.digits)) }; }) };
}
export function historyFixtures(carrier) {
  return ['ST', 'CB', 'GK'].map((position, caseIndex) => {
    const career = copy(carrier), base = copy(career.seasons.at(-1));
    career.position = position; career.overall = 97; career.age = 48; career.events = []; career.story = []; career.pendingEvents = []; career.pendingNews = []; career.pendingBallonDor = null; career.pendingSummary = null;
    career.seasons = Array.from({ length: 30 }, (_, i) => ({ ...copy(base), type: 'playing', year: 2020 + i, age: 19 + i, club: carrier.currentClub, apps: 20 + i, leagueApps: Math.min(38, 18 + i), goals: 2 + i, assists: i, cleanSheets: i, rating: Number((6.5 + i / 10).toFixed(1)), ovr: 65 + i, injury: null, injuryWeeks: 0, injurySevere: false, suspensionMatches: i % 3, ballonDor: false, ballonDorRank: null, championsLeague: false, worldCup: false }));
    career.seasons[0].type = 'youth';
    delete career.seasons[1].ovr; delete career.seasons[1].injury; delete career.seasons[1].injuryWeeks; delete career.seasons[1].injurySevere; delete career.seasons[1].suspensionMatches; career.seasons[1].cleanSheets = 0;
    Object.assign(career.seasons[2], { year: career.seasons[1].year, club: 'FC Twente', onLoanFrom: 'Anderlecht', apps: 18, goals: 15, assists: 3, cleanSheets: 6, rating: 7.2, ovr: 72 });
    Object.assign(career.seasons[3], { apps: 0, leagueApps: 0, goals: 0, assists: 0, cleanSheets: 0, rating: 0, injury: 'Recorded ankle injury', injuryWeeks: 5, injurySevere: true, suspensionMatches: 2 });
    Object.assign(career.seasons[4], { apps: 0, leagueApps: 0, goals: 0, assists: 0, cleanSheets: 0, rating: 0, club: 'BANNED (PED)', suspensionMatches: 3 });
    career.seasons[5].type = 'manager';
    career.retired = caseIndex === 1; career.phase = career.retired ? 'retired' : 'playing';
    if (caseIndex === 2) {
      career.phase = 'newspaper'; const last = career.seasons.at(-1); last.ballonDor = true; last.ballonDorRank = 1;
      career.pendingSummary = copy(last); career.pendingBallonDor = { year: last.year, nominees: [], playerNominated: true, playerRank: 1, playerWon: true, revealed: false, speech: null };
      career.awards = [...career.awards.filter(award => award.name !== "Ballon d'Or"), { year: last.year, name: "Ballon d'Or", emoji: '🏆' }];
      career.pendingNews = [{ newspaper: 'Career Post', type: 'positive', headline: "Recorded Ballon d'Or win", body: 'A fictional saved award result awaiting its ceremony.' }];
    }
    return { id: ['playing-empty-events', 'retired-defender', 'pending-keeper'][caseIndex], simulation: 'Explicit fictional display inputs on an engine-recorded save. No real season result is claimed.', career, first: 1, second: 2, availability: 3, unknown: 1, suspended: 4 };
  });
}
function campaigns(B, carrier) {
  return [['modern-europe','England',2027],['historical-europe','England',1980],['libertadores','Argentina',2027],['afc','Japan',2027],['caf','Egypt',2027],['concacaf','USA',2027]].map(([id,country,year]) => {
    const club = B.soccer.FALLBACK_CLUBS.find(club => club.country === country); assert(club);
    return { id, state: { ...copy(carrier), currentClub: club.name, currentClubCountry: country, currentClubTier: 1, overall: 99, position: 'ST', seasons: [{ ...copy(carrier.seasons.at(-1)), year: year - 1, club: club.name, clubCountry: country }] }, row: { ...copy(B.fixtures.cupSeason), year, club: club.name, clubCountry: country, domesticCup: false, cupRun: undefined, championsLeague: country === 'England', clubCupTitle: undefined } };
  });
}
const CONTROLS = [
  { name: 'wrong-row', file: HELPER, from: 'rows.find(row => row.index === firstIndex)', to: 'rows.find(row => row.index === secondIndex)', failed: ['comparison', 'identity rejection'] },
  { name: 'missing-as-zero', file: HELPER, from: 'value: readOvr(row.ovr)', to: 'value: readOvr(row.ovr) ?? 0', failed: ['saved rows', 'comparison'] },
  { name: 'reversed-delta', file: HELPER, from: 'other.value - metric.value', to: 'metric.value - other.value', failed: ['comparison'] },
  { name: 'current-ovr', file: HELPER, from: 'value: readOvr(row.ovr)', to: 'value: readOvr(career.overall)', failed: ['saved rows', 'comparison'] },
  { name: 'default-order', file: HELPER, from: '[rows[rows.length - 2].index, rows[rows.length - 1].index]', to: '[rows[0].index, rows[1].index]', failed: ['defaults'] },
  { name: 'same-row', file: HELPER, from: ' || firstIndex === secondIndex', to: '', failed: ['identity rejection'] },
  { name: 'input-mutation', file: HELPER, from: 'const rows = seasonHistoryRows(career);', to: 'career.overall = 1; const rows = seasonHistoryRows(career);', failed: ['read boundary'] },
  { name: 'weeks-as-matches', file: HELPER, from: 'suspensionMatches: count(row.suspensionMatches)', to: 'suspensionMatches: count(row.injuryWeeks)', failed: ['saved rows', 'comparison', 'availability'] },
];
async function run(B, A, carrier, fixtures, dir) {
  const report = { head: git('rev-parse','HEAD'), tree: git('rev-parse','HEAD^{tree}'), baseHead: BASE, baseTree: BASE_TREE, cases: [], failed: [], counts: {}, receipts: B.receipts, loaded: B.loaded, originalLoaded: A.loaded };
  const group = async (name, fn) => { try { await fn(); report.cases.push({ name, passed: true }); console.log('PASS ' + name); } catch (error) { report.cases.push({ name, passed: false, errorName: error.name, error: String(error.stack || error) }); report.failed.push(name); console.log('FAIL ' + name + ': ' + error.message); } };
  await group('engine baseline', () => {
    const pairs = [];
    for (let i=0;i<24;i++) { const input=copy(carrier);Object.assign(input,{phase:'playing',pendingSummary:null,pendingEvents:[],pendingBallonDor:null});const before=structuredClone(input),seed=1193100+i,original=withSeasonHistorySeed(seed,()=>A.soccer.advanceProSeason(copy(input),A.soccer.FALLBACK_CLUBS)),current=withSeasonHistorySeed(seed,()=>B.soccer.advanceProSeason(copy(input),B.soccer.FALLBACK_CLUBS));pairs.push({seed,input,original,current});assert.deepEqual(current,original);assert.deepEqual(input,before); }
    write(dir,'engine-pairs',pairs);report.counts.enginePairs=pairs.length;
  });
  await group('campaign baseline', () => {
    const pairs=[];
    for(const item of campaigns(B,carrier))for(let i=0;i<32;i++){const seed=1193200+i,original=withSeasonHistorySeed(seed,()=>A.soccer.simulateUCL(copy(item.state),copy(item.row))),current=withSeasonHistorySeed(seed,()=>B.soccer.simulateUCL(copy(item.state),copy(item.row)));pairs.push({id:item.id,seed,input:item.state,row:item.row,original,current});assert.deepEqual(current,original);}
    write(dir,'campaign-pairs',pairs);report.counts.campaignPairs=pairs.length;
  });
  await group('existing readers',()=>{const pairs=[];for(const item of fixtures){const ratingsOld=A.ratings.soccerRatingRows(item.career.seasons,item.career.position),ratingsNow=B.ratings.soccerRatingRows(item.career.seasons,item.career.position);assert.deepEqual(ratingsNow,ratingsOld);for(const row of item.career.seasons){const original=A.reader.savedSeasonCompetitions(copy(item.career),copy(row)),current=B.reader.savedSeasonCompetitions(copy(item.career),copy(row));pairs.push({id:item.id,year:row.year,original,current});assert.deepEqual(current,original);}}write(dir,'existing-reader-pairs',pairs);report.counts.readerPairs=pairs.length;});
  await group('saved rows',()=>{for(const item of fixtures){const expected=rawHistory(item.career),actual=B.history.seasonHistoryRows(copy(item.career));write(dir,item.id+'-rows',{input:item.career,expected,actual});assert.deepEqual(actual,expected);}report.counts.historyRows=fixtures.reduce((n,item)=>n+rawHistory(item.career).length,0);});
  await group('comparison',()=>{const observations=[];for(const item of fixtures)for(const [first,second]of[[1,2],[2,1],[3,4],[28,29]]){const expected=rawComparison(item.career,first,second),actual=B.history.compareSavedSeasons(copy(item.career),first,second);observations.push({id:item.id,first,second,expected,actual});write(dir,'comparisons',observations);assert.deepEqual(actual,expected);}write(dir,'comparisons',observations);report.counts.comparisons=observations.length;});
  await group('availability',()=>{const observations=[];for(const item of fixtures)for(const row of item.career.seasons){const expected=rawAvailability(row),actual=B.history.savedSeasonAvailability(copy(row));observations.push({id:item.id,year:row.year,expected,actual});write(dir,'availability',observations);assert.deepEqual(actual,expected);}write(dir,'availability',observations);report.counts.availabilityRows=observations.length;});
  await group('defaults',()=>{for(const item of fixtures){const rows=rawHistory(item.career);assert.deepEqual(B.history.defaultSeasonComparison(rows),[28,29]);assert.equal(B.history.defaultSeasonComparison(rows.slice(0,1)),null);assert.equal(B.history.defaultSeasonComparison([]),null);}});
  await group('identity rejection',()=>{for(const item of fixtures)for(const [first,second]of[[1,1],[0,2],[5,2],[-1,2],[1,99],[1.5,2]])assert.equal(B.history.compareSavedSeasons(copy(item.career),first,second),null);});
  await group('read boundary',()=>{for(const item of fixtures){const input=copy(item.career),before=structuredClone(input),observed=withSeasonHistorySeed(1193,()=>({rows:B.history.seasonHistoryRows(input),defaults:B.history.defaultSeasonComparison(rawHistory(input)),comparison:B.history.compareSavedSeasons(input,1,2),availability:input.seasons.map(row=>B.history.savedSeasonAvailability(row))}));assert.deepEqual(observed.draws,[]);assert.deepEqual(input,before);}});
  report.status=report.failed.length?'failed':'passed';write(dir,'report',report);return report;
}
if(process.env.SEASON_HISTORY_IMPORT_ONLY!=='1'){
  assert.equal(git('rev-parse',BASE+'^{tree}'),BASE_TREE,'Exact unchanged AR source tree');
  const before=hashes(),A=await bundleSeasonHistory({original:true}),B=await bundleSeasonHistory();
  const recorded=JSON.parse(text('scripts/data/careerLeagueWorldSaves1100.json')).saves.find(save=>save.id==='ere').state,carrier=B.soccer.repairCareer(copy(recorded)),fixtures=historyFixtures(carrier);
  const healthy=await run(B,A,carrier,fixtures,path.join(OUT,'healthy'));healthy.sourceBefore=before;healthy.sourceAfter=hashes();healthy.sourceHeld=JSON.stringify(before)===JSON.stringify(healthy.sourceAfter);write(path.join(OUT,'healthy'),'report',healthy);
  assert.equal(healthy.sourceHeld,true);assert.deepEqual(healthy.failed,[]);assert.equal(healthy.cases.length,9);write(OUT,'native-fixtures',{carrier,cases:fixtures});
  const controls=[];
  if(process.env.SEASON_HISTORY_CONTROL==='all')for(const patch of CONTROLS){const faulty=await bundleSeasonHistory({patch}),result=await run(faulty,A,carrier,fixtures,path.join(OUT,patch.name));assert.deepEqual([...result.failed].sort(),[...patch.failed].sort(),patch.name+': exact intended failed groups');assert(result.cases.filter(row=>!row.passed).every(row=>row.errorName==='AssertionError'));assert.equal(result.cases.length,9);for(const name of['engine baseline','campaign baseline','existing readers'])assert(result.cases.find(row=>row.name===name).passed,patch.name+': independent AR contracts remain green');controls.push({name:patch.name,failed:result.failed,effective:faulty.receipts[0].effective,receipts:faulty.receipts});console.log('CONTROL FIRED('+patch.name+'): '+result.failed.join(', '));}
  write(OUT,'controls',{head:healthy.head,tree:healthy.tree,controls,sourceHeld:JSON.stringify(before)===JSON.stringify(hashes())});
  console.log('Season history: '+healthy.cases.length+' groups,24 full AR season pairs,192 full campaign/RNG pairs,'+controls.length+' effective controls; artifacts '+OUT);
}
