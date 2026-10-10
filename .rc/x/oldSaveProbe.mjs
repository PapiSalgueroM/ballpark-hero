// Release AT: an old save loads and plays. Saves are MADE by one tree's code (origin/main) and PLAYED by another's.
// usage: node oldSaveProbe.mjs make <file>     (cwd = the tree that makes the saves)
//        node oldSaveProbe.mjs play <file>     (cwd = the tree that plays them)
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [mode, file] = process.argv.slice(2);
if ((mode !== 'make' && mode !== 'play') || !file) { console.error('usage: oldSaveProbe.mjs make|play <file>'); process.exit(2); }
const root = process.cwd();
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'old-save-'));
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
const require = createRequire(import.meta.url);
async function load(name, rels) {
  const entry = path.join(work, `${name}.ts`), outfile = path.join(work, `${name}.cjs`);
  fs.writeFileSync(entry, rels.filter(([, rel]) => fs.existsSync(path.join(root, rel)))
    .map(([as, rel]) => `export * as ${as} from '${path.join(root, rel).split(path.sep).join('/')}';`).join('\n'));
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile, logLevel: 'silent', alias: { '@': path.join(root, 'src') } });
  return require(outfile);
}
const realRandom = Math.random;
function seeded(seed) { let x = (seed * 2654435761) >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
const withSeed = (seed, fn) => { Math.random = seeded(seed); try { return fn(); } finally { Math.random = realRandom; } };
const sha = v => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);
const stats = v => ({ pace: v, shooting: v, passing: v, dribbling: v, defending: v, physical: v, reflexes: v });
const POSITIONS = ['ST', 'CM', 'CB', 'GK', 'LW', 'CAM', 'RB', 'CDM'];

// Every pause the engine can raise between seasons is answered (the switch simCareerLeagueFinish uses).
function step(e, clubs, s) {
  switch (s.phase) {
    case 'youth': return e.advanceYouthYear(s, clubs);
    case 'contract_offer': { const offers = s.pendingOffers || []; return offers.length ? e.acceptOffer(s, offers[0]) : { ...s, phase: 'playing' }; }
    case 'playing': return e.advanceProSeason(s, clubs);
    case 'newspaper': return e.dismissNewspaper(s);
    case 'season_summary': return e.dismissSummary(s, clubs);
    case 'international_debut': return e.dismissDebut(s, clubs);
    case 'world_cup': return e.dismissWorldCup(s, clubs);
    case 'rehab_choice': return e.applyRehabChoice(s, 1);
    case 'rivalry_event': return e.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return e.dismissBallonDor(s, clubs);
    case 'bdor_speech': return e.applyBdorSpeech(s, 0);
    case 'wc_speech': return e.applyWorldCupSpeech(s, 0);
    case 'moral_dilemma': return e.dismissMoralDilemma(s, clubs);
    case 'social_media_action': return e.dismissSocialMediaPhase(s, clubs);
    case 'red_card_appeal_result': return e.dismissAppealResult(s, clubs);
    case 'retirement_suggestion': return e.acceptRetirementSuggestion(s);
    case 'retirement_ceremony': case 'retired': return { ...s, retired: true };
    case 'random_events': {
      const ev = (s.pendingEvents || [])[0];
      if (!ev || !ev.choices || !ev.choices.length) return { ...s, phase: 'playing', pendingEvents: [] };
      return e.applyEventChoice(s, ev.choices.length - 1, clubs);
    }
    case 'contract_expiring': case 'transfer_window': return e.stayAtClub(s);
    default: { const n = e.advanceProSeason(s, clubs); return n.phase === s.phase ? { ...n, retired: true } : n; }
  }
}
const played = s => (s.seasons || []).filter(r => r.type === 'playing').length;

const B = await load('bundle', [
  ['soccer', 'src/lib/soccerCareerEngine.ts'], ['cm', 'src/lib/clubManager.ts'],
  ['ambitions', 'src/lib/soccerCareerAmbitions.ts'], ['records', 'src/lib/soccerCareerRecords.ts'], ['seasonHistory', 'src/lib/soccerCareerSeasonHistory.ts'],
  ['derbyHistory', 'src/lib/soccerCareerDerbyHistory.ts'], ['squad', 'src/lib/soccerClubSquad.ts'], ['sheet', 'src/lib/soccerClubSquadSheet.ts'],
  ['milestone', 'src/lib/soccerCareerMilestone.ts'], ['role', 'src/lib/soccerCareerRole.ts'], ['preparation', 'src/lib/soccerCareerPreparation.ts'],
  ['fixtures', 'src/lib/clubManagerFixtures.ts'],
]);
const E = B.soccer, clubs = E.FALLBACK_CLUBS, CM = B.cm;

if (mode === 'make') {
  const soccer = [], manager = [];
  for (let seed = 1; seed <= 36; seed++) {
    const want = 1 + (seed % 9);
    const s = withSeed(seed * 7919 + 13, () => {
      let c = E.initCareer(`Old ${seed}`, ['England', 'Spain', 'Brazil', 'Germany'][seed % 4], POSITIONS[seed % POSITIONS.length], '2020-24', stats(60 + (seed % 5) * 6), 60 + (seed % 5) * 6, 2020, clubs, null, 82);
      for (let guard = 0; !c.retired && guard < 700 && played(c) < want; guard++) c = step(E, clubs, c);
      // half of them stop in the middle of whatever came next, so a save is not always at a clean season start
      for (let extra = 0; extra < seed % 3 && !c.retired; extra++) c = step(E, clubs, c);
      return c;
    });
    soccer.push({ seed, phase: s.phase, seasons: (s.seasons || []).length, state: JSON.parse(JSON.stringify(s)) });
  }
  const CLUBS = ['Everton', 'Arsenal', 'Real Madrid', 'Napoli', 'Ajax', 'Wolves'];
  for (let i = 0; i < CLUBS.length; i++) for (const entries of [0, 6, 21]) {
    const c = withSeed(5000 + i * 31 + entries, () => {
      let state = CM.startCareer(CLUBS[i]);
      for (let k = 0; k < entries; k++) { const r = CM.playNextEntry(state, { skipHalftime: true }); state = r.state; if (r.kind === 'seasonOver' || state.sacked) break; }
      return state;
    });
    manager.push({ club: CLUBS[i], entries, week: c.week, state: JSON.parse(JSON.stringify(c)) });
  }
  // one Club Manager save stopped at half time, the hardest place to load from
  const paused = withSeed(6100, () => { let st = CM.startCareer('Everton'); for (let k = 0; k < 40; k++) { const r = CM.playNextEntry(st); st = r.state; if (r.kind === 'halftime') return st; } return null; });
  if (paused) manager.push({ club: 'Everton', entries: -1, week: paused.week, halftime: true, state: JSON.parse(JSON.stringify(paused)) });
  fs.writeFileSync(file, JSON.stringify({ madeBy: root, soccer, manager }));
  console.log(`oldSaveProbe make: ${soccer.length} Soccer Career saves (${soccer.filter(s => s.phase !== 'playing').length} not at a season start, ${soccer.filter(s => s.seasons >= 7).length} with seven or more recorded rows), ${manager.length} Club Manager saves (${manager.filter(m => m.halftime).length} at half time); sha ${sha({ soccer, manager })}`);
  process.exit(0);
}

const made = JSON.parse(fs.readFileSync(file, 'utf8'));
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const t = { soccer: 0, seasonsPlayed: 0, retired: 0, readers: 0, newFieldsOnLoad: 0, manager: 0, entriesPlayed: 0, matches: 0, realFixturesOnOld: 0, varOnOldLive: 0 };
const NEW_SAVE_FIELDS = ['seasonAmbition', 'seasonPreparation', 'mentor', 'reducedRole'];
for (const row of made.soccer) {
  const loaded = JSON.parse(JSON.stringify(row.state));
  t.soccer += 1;
  for (const k of NEW_SAVE_FIELDS) if (k in loaded) t.newFieldsOnLoad += 1;
  try {
    // the readers the eighteen rounds add, on the save exactly as it was made
    B.ambitions?.ambitionOptions(loaded); B.ambitions?.ambitionForNextSeason(loaded);
    B.records?.careerRecordBook(loaded);
    const rows = B.seasonHistory?.seasonHistoryRows(loaded) ?? [];
    const pair = B.seasonHistory?.defaultSeasonComparison(rows);
    if (pair) B.seasonHistory.compareSavedSeasons(loaded, pair[0], pair[1]);
    for (const r of loaded.seasons || []) { B.seasonHistory?.savedSeasonAvailability(r); B.milestone?.personalGoalMilestone(loaded.seasons, r); }
    const derbies = B.derbyHistory?.savedDerbyHistory(loaded);
    if (derbies) B.derbyHistory.savedDerbyRivalRecords(derbies);
    B.role?.reducedRoleForSeason(loaded); B.preparation?.preparationForSeason(loaded);
    const at = B.squad?.squadNow(loaded);
    if (at) { const trust = B.squad.managerTrust(loaded, at); B.sheet?.planLine(trust); B.sheet?.trustLines(loaded, at, trust); }
    t.readers += 1;
  } catch (err) { fail(`Soccer Career save ${row.seed} (${row.phase}, ${row.seasons} rows): a new reader threw: ${String(err?.stack || err).split('\n').slice(0, 2).join(' | ')}`); }
  try {
    const before = played(loaded);
    const after = withSeed(row.seed * 104729 + 7, () => {
      let c = loaded;
      for (let guard = 0; !c.retired && guard < 400 && played(c) < before + 2; guard++) c = step(E, clubs, c);
      return c;
    });
    JSON.parse(JSON.stringify(after));
    t.seasonsPlayed += played(after) - before;
    if (after.retired) t.retired += 1;
    if (!after.retired && played(after) < before + 2) fail(`Soccer Career save ${row.seed}: stuck in phase ${after.phase} after ${played(after) - before} more seasons`);
  } catch (err) { fail(`Soccer Career save ${row.seed} (${row.phase}, ${row.seasons} rows): playing on threw: ${String(err?.stack || err).split('\n').slice(0, 2).join(' | ')}`); }
}
for (const row of made.manager) {
  t.manager += 1;
  const loaded = JSON.parse(JSON.stringify(row.state));
  try {
    if (loaded.realLeagueFixtures) t.realFixturesOnOld += 1;
    if (loaded.live?.varReviews) t.varOnOldLive += 1;
    const cover = CM.careerFixtureCoverage ? CM.careerFixtureCoverage(loaded) : null;
    if (cover) fail(`Club Manager save ${row.club}/${row.entries}: an old save claims the real fixture list`);
    if (CM.careerRoundPairs && CM.roundPairs && Array.isArray(loaded.leagueClubs)) {
      for (const round of [0, 1, 7]) {
        const a = JSON.stringify(CM.careerRoundPairs(loaded, round)), b = JSON.stringify(CM.roundPairs(loaded.leagueClubs, round, !!loaded.balancedFixtures));
        if (a !== b) fail(`Club Manager save ${row.club}/${row.entries}: round ${round} is not the generated list an old save had`);
      }
    }
    const done = withSeed(7000 + t.manager, () => {
      let state = loaded, entries = 0, matches = 0;
      if (row.halftime) { const second = CM.startSecondHalf(state); const r = CM.resumeMatch(second); state = r.state; if (r.kind === 'match') matches += 1; if (r.report && (r.report.detail?.timeline ?? []).some(e => e.kind === 'var')) throw new Error('an old half time save came back with a review'); }
      for (let k = 0; k < 70; k++) {
        const r = CM.playNextEntry(state, { skipHalftime: true, varReviews: true });
        state = r.state; entries += 1; if (r.kind === 'match') matches += 1;
        if (r.kind === 'seasonOver' || state.sacked) break;
      }
      return { state, entries, matches };
    });
    JSON.parse(JSON.stringify(done.state));
    t.entriesPlayed += done.entries; t.matches += done.matches;
  } catch (err) { fail(`Club Manager save ${row.club}/${row.entries}: playing on threw: ${String(err?.stack || err).split('\n').slice(0, 2).join(' | ')}`); }
}
if (t.newFieldsOnLoad) fail(`${t.newFieldsOnLoad} new save fields were already on saves made by the old code: the saves are not old`);
if (t.realFixturesOnOld || t.varOnOldLive) fail(`old saves carry the new keys (realLeagueFixtures ${t.realFixturesOnOld}, live.varReviews ${t.varOnOldLive}): the saves are not old`);
console.log(JSON.stringify(t));
console.log(`oldSaveProbe play: ${t.soccer} Soccer Career saves made by ${made.madeBy} loaded, ${t.readers} read by every new reader, ${t.seasonsPlayed} more seasons played (${t.retired} retired on the way); ${t.manager} Club Manager saves loaded, ${t.entriesPlayed} entries and ${t.matches} matches played on with reviews on`);
if (failures) { console.error(`oldSaveProbe: ${failures} FAILURE(S)`); process.exit(1); }
console.log('oldSaveProbe: green. Every save made by the old code loads, is read by the new screens and plays on.');
