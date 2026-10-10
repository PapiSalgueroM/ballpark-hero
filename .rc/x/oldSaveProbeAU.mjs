// Release AU: an old save loads and plays. Saves are MADE by one tree's code (origin/release-at-gate) and PLAYED by
// another's (the integrated head). Adapted from Release AT's .tmp-fx/oldSaveProbe.mjs: Soccer Career, Club Manager
// and, new here, the four US My Careers.
// usage: node oldSaveProbeAU.mjs make <file>     (cwd = the tree that makes the saves)
//        node oldSaveProbeAU.mjs play <file>     (cwd = the tree that plays them)
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [mode, file] = process.argv.slice(2);
if ((mode !== 'make' && mode !== 'play') || !file) { console.error('usage: oldSaveProbeAU.mjs make|play <file>'); process.exit(2); }
const root = process.cwd();
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'old-save-'));
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
const require = createRequire(import.meta.url);
async function load(name, rels) {
  const entry = path.join(work, `${name}.ts`), outfile = path.join(work, `${name}.cjs`);
  fs.writeFileSync(entry, rels.filter(([, rel]) => fs.existsSync(path.join(root, rel)))
    .map(([as, rel]) => `export * as ${as} from '${path.join(root, rel).split(path.sep).join('/')}';`).join('\n'));
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile, logLevel: 'silent', alias: { '@': path.join(root, 'src') },
    define: { 'import.meta.env': '{"PROD":true,"DEV":false}' }, loader: { '.css': 'empty', '.svg': 'empty', '.png': 'empty', '.jpg': 'empty', '.webp': 'empty' } });
  return require(outfile);
}
const realRandom = Math.random;
function seeded(seed) { let x = (seed * 2654435761) >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
const withSeed = (seed, fn) => { Math.random = seeded(seed); try { return fn(); } finally { Math.random = realRandom; } };
const sha = v => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);
const copy = v => JSON.parse(JSON.stringify(v));
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
  ['role', 'src/lib/soccerCareerRole.ts'], ['preparation', 'src/lib/soccerCareerPreparation.ts'],
  ['programme', 'src/lib/soccerCareerProgramme.ts'], ['cups', 'src/lib/soccerSeasonCompetitions.ts'], ['calendar', 'src/lib/soccerSeasonCalendar.ts'],
  ['wheel', 'src/lib/careerChanceWheel.ts'], ['usProgramme', 'src/lib/usCareerProgramme.ts'],
  ['nfl', 'src/lib/nflCareerSport.ts'], ['nba', 'src/lib/nbaCareerSport.ts'], ['mlb', 'src/lib/mlbCareerSport.ts'], ['nhl', 'src/lib/nhlCareerSport.ts'],
  ['appearance', 'src/lib/soccerCareerAppearance.ts'],
]);
const E = B.soccer, clubs = E.FALLBACK_CLUBS, CM = B.cm;
const US = [['nfl', B.nfl?.NFL_CAREER_SPORT], ['nba', B.nba?.NBA_CAREER_SPORT], ['mlb', B.mlb?.MLB_CAREER_SPORT], ['nhl', B.nhl?.NHL_CAREER_SPORT]];
// One season of a US career, the calls the board makes around sport.simSeason (UsCareerBoard.tsx). The planning
// calls are there only when the tree has them (the old tree does not).
function usSeason(sport, slug, c, rng, P) {
  if (c.contractYears <= 0) c.contractYears = 2;
  if (P) P.expireUsCareerProgramme(c);
  sport.campBattle(c, 75, rng);
  const prep = P ? P.prepareUsCareerProgramme(c, slug) : null;
  const { line } = sport.simSeason(c, 75, rng);
  if (P) P.restoreUsCareerProgramme(c, prep);
  sport.progress(c, rng);
  const result = P ? P.settleUsCareerProgramme(c, line, slug, prep) : null;
  if (sport.shouldRetire(c)) c.retired = true;
  return { line, prep, result };
}

if (mode === 'make') {
  const soccer = [], manager = [], us = [];
  for (let seed = 1; seed <= 36; seed++) {
    const want = 1 + (seed % 9);
    const s = withSeed(seed * 7919 + 13, () => {
      let c = E.initCareer(`Old ${seed}`, ['England', 'Spain', 'Brazil', 'Germany'][seed % 4], POSITIONS[seed % POSITIONS.length], '2020-24', stats(60 + (seed % 5) * 6), 60 + (seed % 5) * 6, 2020, clubs, null, 82);
      for (let guard = 0; !c.retired && guard < 700 && played(c) < want; guard++) c = step(E, clubs, c);
      for (let extra = 0; extra < seed % 3 && !c.retired; extra++) c = step(E, clubs, c);
      return c;
    });
    soccer.push({ seed, phase: s.phase, seasons: (s.seasons || []).length, state: copy(s) });
  }
  const CLUBS = ['Everton', 'Arsenal', 'Real Madrid', 'Napoli', 'Ajax', 'Wolves', 'Bayern Munich', 'Wrexham'];
  for (let i = 0; i < CLUBS.length; i++) for (const entries of [0, 6, 21]) {
    let c = null;
    try {
      c = withSeed(5000 + i * 31 + entries, () => {
        let state = CM.startCareer(CLUBS[i]);
        for (let k = 0; k < entries; k++) { const r = CM.playNextEntry(state, { skipHalftime: true }); state = r.state; if (r.kind === 'seasonOver' || state.sacked) break; }
        return state;
      });
    } catch (err) { console.log(`make: no Club Manager career at ${CLUBS[i]}: ${String(err).slice(0, 120)}`); continue; }
    const pairs = [0, 1, 7].map(round => JSON.stringify(CM.careerRoundPairs(c, round)));
    manager.push({ club: CLUBS[i], entries, week: c.week, key: c.realLeagueFixtures ?? null, pairs, state: copy(c) });
  }
  const paused = withSeed(6100, () => { let st = CM.startCareer('Everton'); for (let k = 0; k < 40; k++) { const r = CM.playNextEntry(st); st = r.state; if (r.kind === 'halftime') return st; } return null; });
  if (paused) manager.push({ club: 'Everton', entries: -1, week: paused.week, halftime: true, key: paused.realLeagueFixtures ?? null, pairs: [0, 1, 7].map(round => JSON.stringify(CM.careerRoundPairs(paused, round))), state: copy(paused) });
  for (const [slug, sport] of US) {
    const positions = Object.keys(sport.create.archetypes);
    for (let seed = 1; seed <= 8; seed++) {
      const rng = seeded(900 + seed * 17 + slug.length);
      const pos = positions[seed % positions.length], era = sport.create.eras[seed % sport.create.eras.length].id;
      const c = sport.startCareer(`Old ${slug} ${seed}`, pos, sport.create.archetypes[pos][0], rng, B.appearance.defaultAppearance(), era);
      for (let k = 0; k < seed % 5 && !c.retired; k++) usSeason(sport, slug, c, rng, null);
      us.push({ slug, seed, pos, era, seasons: c.seasons.length, retired: !!c.retired, state: copy(c) });
    }
  }
  fs.writeFileSync(file, JSON.stringify({ madeBy: root, soccer, manager, us }));
  console.log(`oldSaveProbeAU make: ${soccer.length} Soccer Career saves (${soccer.filter(s => s.phase !== 'playing').length} not at a season start, ${soccer.filter(s => s.seasons >= 7).length} with seven or more recorded rows), ${manager.length} Club Manager saves (${manager.filter(m => m.key).length} on a real fixture list, ${manager.filter(m => m.halftime).length} at half time), ${us.length} US career saves (${US.map(([slug]) => slug + ' ' + us.filter(u => u.slug === slug).length).join(', ')}; ${us.filter(u => u.seasons > 0).length} with seasons played); sha ${sha({ soccer, manager, us })}`);
  process.exit(0);
}

const made = JSON.parse(fs.readFileSync(file, 'utf8'));
let failures = 0;
const NL = String.fromCharCode(10);
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const why = err => String(err?.stack || err).split(NL).slice(0, 2).join(' | ');
const t = { soccer: 0, readers: 0, seasonsPlayed: 0, retired: 0, planned: 0, plannedReceipts: 0, wheels: 0, openingsOnNewRows: 0, manager: 0, keyed: 0, entriesPlayed: 0, matches: 0, us: 0, usSeasons: 0, usPlanned: 0, usResults: 0 };
const P = B.programme, U = B.usProgramme;
for (const row of made.soccer) {
  const loaded = copy(row.state);
  t.soccer += 1;
  for (const k of ['programme', 'chanceWheel']) if (k in loaded) fail(`Soccer Career save ${row.seed} already carries ${k}: the save is not old`);
  if ((loaded.seasons || []).some(r => r.programme || r.cupRun?.opening)) fail(`Soccer Career save ${row.seed}: an old row already carries a plan receipt or an opening tie`);
  try {
    B.ambitions?.ambitionOptions(loaded); B.records?.careerRecordBook(loaded);
    B.role?.reducedRoleForSeason(loaded); B.preparation?.preparationForSeason(loaded);
    const options = P.programmeOptions(loaded); P.programmeEffects(loaded); P.nextProgrammeYear(loaded);
    if (options.length !== 10) fail(`Soccer Career save ${row.seed}: ${options.length} plans, not ten`);
    for (const r of loaded.seasons || []) { const comps = B.cups.savedSeasonCompetitions(loaded, r); B.calendar.cupCalendar(comps, 38); }
    B.squad.squadView(loaded);
    if (B.wheel.validChanceWheel(loaded.chanceWheel)) fail(`Soccer Career save ${row.seed}: a wheel on an old save`);
    t.readers += 1;
  } catch (err) { fail(`Soccer Career save ${row.seed} (${row.phase}, ${row.seasons} rows): a new reader threw: ${why(err)}`); }
  try {
    const before = played(loaded), rowsBefore = (loaded.seasons || []).length;
    const after = withSeed(row.seed * 104729 + 7, () => {
      let c = loaded;
      for (let guard = 0; !c.retired && guard < 400 && played(c) < before + 2; guard++) c = step(E, clubs, c);
      return c;
    });
    copy(after);
    t.seasonsPlayed += played(after) - before;
    if (after.retired) t.retired += 1;
    if (!after.retired && played(after) < before + 2) fail(`Soccer Career save ${row.seed}: stuck in phase ${after.phase} after ${played(after) - before} more seasons`);
    if (after.programme !== undefined) fail(`Soccer Career save ${row.seed}: a plan state appeared with no plan chosen`);
    if (after.seasons.slice(0, rowsBefore).some(r => r.programme || r.cupRun?.opening)) fail(`Soccer Career save ${row.seed}: an OLD row gained a plan receipt or an opening tie`);
    t.openingsOnNewRows += after.seasons.slice(rowsBefore).filter(r => r.cupRun?.opening).length;
    if (after.chanceWheel !== undefined) {
      t.wheels += 1;
      const w = after.chanceWheel;
      if (!B.wheel.validChanceWheel(w)) fail(`Soccer Career save ${row.seed}: the saved wheel is not a valid receipt`);
      const reloaded = E.repairCareer(copy(after));
      if (JSON.stringify(reloaded.chanceWheel) !== JSON.stringify(w)) fail(`Soccer Career save ${row.seed}: a reload changed the saved wheel`);
      const seen = B.wheel.acknowledgeChanceWheel(B.wheel.acknowledgeChanceWheel(copy(after))).chanceWheel;
      if (seen.roll !== w.roll || seen.result !== w.result || seen.seen !== true) fail(`Soccer Career save ${row.seed}: showing the wheel changed its draw`);
    }
  } catch (err) { fail(`Soccer Career save ${row.seed} (${row.phase}, ${row.seasons} rows): playing on threw: ${why(err)}`); }
  // The same old save with one plan chosen, where the game offers it: it must settle on a recorded row or be dropped, never throw.
  try {
    let c = copy(row.state);
    /* the saves stop in the screens after a season: answer them (on this tree) until the next season can be planned */
    c = withSeed(row.seed * 17 + 3, () => { let s = c; for (let guard = 0; !s.retired && guard < 200 && s.phase !== 'playing'; guard++) s = step(E, clubs, s); return s; });
    const offered = !c.retired && c.phase === 'playing' ? P.programmeOptions(c).find(o => o.id === 'tactics')?.choices.find(x => x.eligible) : null;
    if (offered) {
      const chosen = P.chooseProgramme(c, 'tactics', offered.id);
      if (chosen.programme?.plan?.choices?.tactics !== offered.id) fail(`Soccer Career save ${row.seed}: the offered tactical role was not kept`);
      t.planned += 1;
      const rowsBefore = chosen.seasons.length;
      const after = withSeed(row.seed * 31 + 5, () => { let s = chosen; for (let guard = 0; !s.retired && guard < 200 && s.seasons.length === rowsBefore; guard++) s = step(E, clubs, s); return s; });
      copy(after);
      if (after.seasons.slice(rowsBefore).some(r => r.programme)) t.plannedReceipts += 1;
    }
  } catch (err) { fail(`Soccer Career save ${row.seed}: playing on with a plan threw: ${why(err)}`); }
}
for (const row of made.manager) {
  t.manager += 1;
  const loaded = copy(row.state);
  const id = `Club Manager save ${row.club}/${row.entries}`;
  try {
    if (loaded.live?.varReviews) fail(`${id}: an old save has reviews on its live match`);
    if ((loaded.realLeagueFixtures ?? null) !== row.key) fail(`${id}: the fixture key changed on load`);
    const cover = CM.careerFixtureCoverage(loaded);
    if (row.key) { t.keyed += 1; if (!cover) fail(`${id}: a save on the real list (${row.key}) lost its coverage`); }
    else if (cover) fail(`${id}: an old save with no key now claims a real fixture list`);
    [0, 1, 7].forEach((round, i) => { if (JSON.stringify(CM.careerRoundPairs(loaded, round)) !== row.pairs[i]) fail(`${id}: round ${round} is not the list the old code read for this save`); });
    const done = withSeed(7000 + t.manager, () => {
      let state = loaded, entries = 0, matches = 0, reviews = 0;
      const seen = r => { if ((r.report?.detail?.timeline ?? []).some(e => e.kind === 'var')) reviews += 1; if (r.state?.live?.varReviews) reviews += 1; };
      if (row.halftime) { const second = CM.startSecondHalf(state); const r = CM.resumeMatch(second); state = r.state; if (r.kind === 'match') matches += 1; seen(r); }
      for (let k = 0; k < 70; k++) {
        const r = CM.playNextEntry(state, { skipHalftime: true });
        state = r.state; entries += 1; if (r.kind === 'match') matches += 1; seen(r);
        if (r.kind === 'seasonOver' || state.sacked) break;
      }
      return { state, entries, matches, reviews };
    });
    copy(done.state);
    if (done.reviews) fail(`${id}: ${done.reviews} match(es) played with a review while the switch is off`);
    if ((done.state.realLeagueFixtures ?? null) !== row.key && done.state.season === loaded.season) fail(`${id}: the fixture key changed during the same season`);
    t.entriesPlayed += done.entries; t.matches += done.matches;
  } catch (err) { fail(`${id}: playing on threw: ${why(err)}`); }
}
const usOf = Object.fromEntries(US);
for (const row of made.us) {
  t.us += 1;
  const sport = usOf[row.slug], id = `${row.slug} career ${row.seed} (${row.pos}, ${row.seasons} seasons)`;
  for (const k of ['programme', 'programmeResults', 'programmePartnership']) if (k in row.state) fail(`${id} already carries ${k}: the save is not old`);
  if (row.retired) continue;
  try {
    const c = sport.repairNetWorth(copy(row.state));
    if (!U.usProgrammeStateValid(c)) fail(`${id}: an old save reads as an incomplete plan record`);
    if (U.usProgrammeMenus(c, row.slug).length !== 6) fail(`${id}: the panel does not offer six sections`);
    if (U.currentUsCareerProgramme(c, row.slug) !== null || U.usProgrammeResults(c).length) fail(`${id}: a plan or a result on an old save`);
    const before = c.seasons.length, rng = seeded(4000 + row.seed * 13 + row.slug.length);
    const one = usSeason(sport, row.slug, c, rng, U);
    copy(c);
    if (one.prep !== null || one.result !== null) fail(`${id}: the usual routine prepared or settled a plan`);
    if (c.seasons.length !== before + 1) fail(`${id}: ${c.seasons.length - before} season rows were added by one season`);
    for (const k of ['programme', 'programmeResults', 'programmePartnership']) if (k in c) fail(`${id}: ${k} appeared with no plan chosen`);
    t.usSeasons += 1;
    // the same old save with a plan chosen, then one season
    const d = sport.repairNetWorth(copy(row.state));
    if (d.contractYears <= 0) d.contractYears = 2;
    const planned = U.saveUsCareerProgramme(d, row.slug, { ...U.usProgrammeDefaults(), workload: 'push', expectation: 'steady' });
    if ((planned.suspendedSeasons ?? 0) > 0) continue;
    if (!U.currentUsCareerProgramme(planned, row.slug)) { fail(`${id}: a chosen plan was not kept`); continue; }
    t.usPlanned += 1;
    const two = usSeason(sport, row.slug, planned, seeded(4000 + row.seed * 13 + row.slug.length), U);
    copy(planned);
    if (!two.result) fail(`${id}: a planned season left no result`);
    else { t.usResults += 1; if (U.usProgrammeResults(planned).length !== 1) fail(`${id}: ${U.usProgrammeResults(planned).length} results after one planned season`); }
  } catch (err) { fail(`${id}: playing on threw: ${why(err)}`); }
}
console.log(JSON.stringify(t));
console.log(`oldSaveProbeAU play: ${t.soccer} Soccer Career saves made by ${made.madeBy} loaded, ${t.readers} read by every new reader, ${t.seasonsPlayed} more seasons played (${t.retired} retired on the way), ${t.planned} played on with a plan chosen (${t.plannedReceipts} left a receipt on the row), ${t.wheels} ended holding a wheel that a reload and a second look left as it was; ${t.manager} Club Manager saves loaded (${t.keyed} on a real fixture list), ${t.entriesPlayed} entries and ${t.matches} matches played on with no review; ${t.us} US career saves loaded, ${t.usSeasons} played one more season on the usual routine and ${t.usPlanned} with a plan (${t.usResults} results kept)`);
if (failures) { console.error(`oldSaveProbeAU: ${failures} FAILURE(S)`); process.exit(1); }
console.log('oldSaveProbeAU: green. Every save made by the old code loads, is read by the new screens and plays on.');
