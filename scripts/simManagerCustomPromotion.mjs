/* Actual Quick Sim seasons, legal creator settings, no manufactured standings.
   The retained finish and independently seeded summer are browser inputs. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(process.env.MANAGER_REPORT_ARTIFACTS || '.tmp-fx/manager-reports/natural');
fs.mkdirSync(OUT, { recursive: true });
const sha = value => createHash('sha256').update(value).digest('hex');
const sourcePath = path.join(ROOT, 'src/lib/clubManager.ts'), original = fs.readFileSync(sourcePath);
const bundle = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'manager-promotion-')), 'engine.mjs');
await build({ stdin: { contents: `export * from './src/lib/clubManager'; export { saveFence } from './src/lib/saveFence';`, resolveDir: ROOT, loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', outfile: bundle, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error' });
const store = new Map();
globalThis.localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, String(value)), removeItem: key => store.delete(key), clear: () => store.clear() };
const cm = await import(pathToFileURL(bundle).href);
const NOW = 1791979200000, originalNow = Date.now, originalRandom = Math.random;
Date.now = () => NOW;
function seeded(seed, run) {
  let value = seed | 0;
  const draws = [];
  Math.random = () => {
    value = (value + 0x6d2b79f5) | 0;
    let n = Math.imul(value ^ (value >>> 15), 1 | value);
    n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
    const draw = ((n ^ (n >>> 14)) >>> 0) / 4294967296;
    draws.push(draw); return draw;
  };
  try { return { value: run(), draws }; } finally { Math.random = originalRandom; }
}
function write(name, value) {
  const bytes = typeof value === 'string' ? value : JSON.stringify(value);
  fs.writeFileSync(path.join(OUT, name), bytes); return sha(bytes);
}
function view(state) {
  return { clubName: state.clubName, customClub: state.customClub, season: state.season, history: state.history,
    leagueClubs: state.leagueClubs, leagueOverrides: state.leagueOverrides, calendar: state.calendar,
    table: state.table, uclGroup: state.uclGroup, uclField: state.uclField, boardObjectives: state.boardObjectives };
}
const manifest = { now: NOW, saveKey: cm.SAVE_KEY, cases: [], source: { before: sha(original) } };
try {
  for (const [index, pair] of cm.PYRAMIDS.entries()) {
    const id = pair.second, clubName = `Promotion ${index + 1} Athletic`, seasonSeed = 136900 + index;
    cm.registerCustomClub(null); cm.registerLeagueOverrides(null); store.clear(); cm.saveFence.release(cm.SAVE_KEY);
    const played = seeded(seasonSeed, () => {
      let state = cm.startCareer(clubName, 'now', { name: clubName, leagueId: id, stadium: 'Promotion Park',
        budgetTier: 'big', quality: 88, crest: { shape: 0, pattern: 0, color1: '#2563eb', color2: '#ffffff', initials: 'PA' }, replacedClub: '' });
      const reports = [];
      for (let step = 0; step < 180 && state.week < state.calendar.length; step++) {
        let result = cm.playNextEntry(state);
        if (result.kind === 'halftime') result = cm.resumeMatch(cm.coachQuickMatch(result.state));
        state = result.state;
        if (result.report) reports.push(result.report);
        if (result.kind === 'seasonOver') break;
      }
      assert.equal(state.week, state.calendar.length, `${id}: actual full season must finish`);
      assert.equal(state.sacked, false, `${id}: browser winner must still have a job`);
      const finish = cm.finishSeason(state);
      assert.ok(finish.summary.position <= pair.count, `${id}: declared sample must actually earn promotion, position ${finish.summary.position}`);
      assert.equal(reports.filter(row => row.competition === 'league').length, cm.leagueRounds(state.leagueClubs.length));
      return { input: finish.state, reports, position: finish.summary.position };
    });
    const input = played.value.input, inputBytes = JSON.stringify(input), proxy = input.customClub.replacedClub, seed = 236900 + index;
    const summer = seeded(seed, () => cm.startNextSeason(input)), expected = summer.value;
    assert.equal(JSON.stringify(input), inputBytes, `${id}: rollover must not mutate the finished season`);
    assert.equal(cm.careerLeagueOf(expected).id, pair.top);
    assert.equal(expected.customClub.leagueId, pair.top); assert.equal(expected.customClub.replacedClub, proxy);
    assert.equal(expected.uclGroup, null, `${id}: the second division does not qualify for Europe`);
    assert.equal(expected.history.at(-1).position, played.value.position);
    assert.equal(expected.history.at(-1).club, clubName);
    assert.equal(expected.calendar.filter(row => row.type === 'league').length, cm.leagueRounds(expected.leagueClubs.length));
    const originalClubs = cm.REAL_LEAGUES.flatMap(row => row.clubs).sort();
    const actualClubs = cm.REAL_LEAGUES.flatMap(row => expected.leagueOverrides?.[row.id] ?? row.clubs).sort();
    assert.deepEqual(actualClubs, originalClubs); assert.equal(new Set(actualClubs).size, originalClubs.length);
    assert.equal(cm.saveCareer(input), true);
    const raw = store.get(cm.SAVE_KEY), rawFile = `${id}-save.json`;
    const loaded = cm.loadCareer(); assert.ok(loaded);
    assert.deepEqual(view(loaded), view(input), `${id}: actual writer/reader retains the summer inputs`);
    const loadedSummer = seeded(seed, () => cm.startNextSeason(loaded));
    assert.deepEqual(view(loadedSummer.value), view(expected)); assert.deepEqual(loadedSummer.draws, summer.draws);
    /* A resumed page has a fresh engine module and youth serial counter. */
    cm.saveFence.release(cm.SAVE_KEY); store.clear();
    const cold = await import(`${pathToFileURL(bundle).href}?summer=${index}`);
    store.set(cold.SAVE_KEY, raw);
    const coldLoaded = cold.loadCareer(); assert.ok(coldLoaded);
    const coldSummer = seeded(seed, () => cold.startNextSeason(coldLoaded));
    assert.deepEqual(view(coldSummer.value), view(expected)); assert.deepEqual(coldSummer.draws, summer.draws);
    assert.equal(cold.saveCareer(coldSummer.value), true);
    const expectedSave = store.get(cm.SAVE_KEY);
    cold.saveFence.release(cold.SAVE_KEY);
    const row = { id, clubName, proxy, seed, now: NOW, seasonSeed, outcome: 'promotion', fromLeague: id, toLeague: pair.top,
      position: played.value.position, matches: played.value.reports.length, rawFile, rawSha256: write(rawFile, raw),
      inputFile: `${id}-input.json`, expectedFile: `${id}-expected.json`,
      expectedSaveFile: `${id}-expected-save.json`, expectedSaveSha256: write(`${id}-expected-save.json`, expectedSave),
      inputSha256: write(`${id}-input.json`, input), expectedSha256: write(`${id}-expected.json`, coldSummer.value),
      reportsSha256: write(`${id}-reports.json`, played.value.reports),
      drawsSha256: write(`${id}-draws.json`, { season: played.draws, summer: summer.draws }),
      storageChars: raw.length, summerDraws: summer.draws.length };
    manifest.cases.push(row);
    console.log(`PASS ${id}: played ${row.matches} matches, finished ${row.position}, promoted to ${pair.top}, proxy ${proxy}, saved ${raw.length} characters`);
  }
  assert.equal(manifest.cases.length, 5);
  manifest.source.after = sha(fs.readFileSync(sourcePath)); assert.equal(manifest.source.after, manifest.source.before);
  console.log(`PASS all five actual seasons: unchanged real-club union, division counts, pinned slots and no immediate European qualification`);
  console.log(`PASS all five actual save/load summers: identical outcomes and RNG draws; source bytes held`);
} finally {
  Date.now = originalNow; Math.random = originalRandom;
  manifest.source.after = sha(fs.readFileSync(sourcePath));
  write('manifest.json', manifest);
}
