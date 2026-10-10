/* Round 964: the world editor. Any club, any league, before kickoff.

   What this pins, each section against a baseline:

   0. NO EDIT IS TODAY'S GAME. With no edit (absent, null, an edit swapped
      back to nothing, or a stale edit some screen left registered) a new
      career is byte identical, at kickoff and after a whole season and its
      summer rollover, to the same career started under the same random
      stream by THIS branch's engine with this round's edit hunks taken out
      (stripped by the same mutate() the controls use, so a hunk that moves
      fails closed). Review fix: the baseline used to be origin/main's
      engine, which compares main with itself once this round lands and goes
      red on any branch where another round legitimately changed the engine.
      The one time proof that the round changed nothing else was made
      against origin/main at 4c5622f8 (2196 checks, 0 failures).
   1. EVERY SWAP KEEPS THE WORLD WHOLE. A long random chain of swaps across
      all 22 leagues, checked after EVERY step (not just the end): each
      league holds exactly its real number of clubs, no club is in two
      leagues, the clubs are exactly today's clubs, and the edit validates.
   2. THE SEASON PLAYS THE EDITED WORLD. Full seasons on edited worlds:
      my league's table and every league fixture are the edited lineup, every
      other league's world table is its edited lineup, no club plays in two
      tables, the domestic cup draws from the edited country, the calendar
      has the round count the edited league's size needs, and the summer
      rollover keeps every size and every club once. Europe: season one is
      my club's real world answer wherever the edit put it, and next
      season's Champions League field is the one the PLAYED tables earn
      (review fix: it was read after the new memberships registered, so a
      club promoted into the Premier League handed it the Championship's top
      four).
   3. THE BOARD READS THE NEW LEAGUE. A top club moved down is asked for the
      title, a weak club moved up is asked to survive, and walking every
      Scottish club into the Premier League one at a time, the demand never
      gets kinder as the club gets stronger.
   4. THE SAVE KEEPS THE EDIT. Save, drop every registration, load: the
      edit, the league lookups and the next match all come back.

   Negative controls, each refuses to run when the source it mutates is not
   there (SIM_WORLD_EDITOR_CONTROL=<name>):
     noregister  startCareer skips registering the edit   -> section 2 red
     leak        a null edit leaves a mark on the save     -> section 0 red
     dupe        a swap forgets to move the second club    -> section 1 red
     staticrank  the club def map ranks the REAL leagues   -> section 3 red
     stature     a title stature club keeps it when moved   -> section 3 red
     noload      loadCareer drops the save's memberships   -> section 4 red
     lateucl     next season's field read after the swap   -> section 2 red
     euroone     season one Europe reads the edited league -> section 2 red
     homecountry a moved club's nationality ask follows the league -> section 3 red
     observer    drops one observed actual league report -> three section 2 counts red
     tablecount  copies own W+D+L minus one -> three section 2 table counts red
     historycount copies full h2h count minus one -> three section 2 history counts red
     calendarcount copies completed week minus one -> three section 2 completion counts red

   Measured headroom (SIM_SEED unset and 1, 2, 3, 4): section 3 is
   deterministic (stature comes from the baked rosters, no draw), and its
   one count, the middle asks across the two Bundesliga ladders, measured 7
   against a floor of 4 (the reasoning is beside the check); sections 0, 1,
   2 and 4 are exact identities, so there is no band to set. Their counts
   are printed so a run shows it did the work.

   Run: node scripts/simWorldEditor.mjs */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_FWD = ROOT.replaceAll('\\', '/');
let failures = 0;
const failureMessages = [];
let checks = 0;
const fail = m => { failures += 1; failureMessages.push(m); console.error('  FAIL: ' + m); };
const ok = (cond, m) => { checks += 1; if (!cond) fail(m); return cond; };
const CONTROL = process.env.SIM_WORLD_EDITOR_CONTROL ?? '';
const CONTROLS = ['', 'noregister', 'leak', 'dupe', 'staticrank', 'stature', 'noload', 'lateucl', 'euroone', 'homecountry', 'observer', 'tablecount', 'historycount', 'calendarcount'];
if (!CONTROLS.includes(CONTROL)) { console.error(`unknown control ${CONTROL}`); process.exit(1); }

/* A worktree has no node_modules of its own, so esbuild is found by walking up. */
function findEsbuild() {
  for (let d = ROOT; ; d = path.dirname(d)) {
    const bin = path.join(d, 'node_modules', '.bin', 'esbuild');
    if (fs.existsSync(bin) || fs.existsSync(bin + '.cmd')) return bin;
    if (path.dirname(d) === d) throw new Error('no esbuild found above ' + ROOT);
  }
}
const ESBUILD = findEsbuild();
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'worldedit-'));

function mutate(src, needle, replacement, what) {
  if (!src.includes(needle)) {
    console.error(`${CONTROL ? `control ${CONTROL}` : 'baseline'}: the ${what} to mutate is not in the source, refusing a dead control or a stale baseline`);
    process.exit(1);
  }
  return src.replace(needle, replacement);
}

/* The branch's engine and editor, with the control's mutation if any. */
const cmOriginal = fs.readFileSync(path.join(ROOT, 'src/lib/clubManager.ts'), 'utf8');
let cmSrc = cmOriginal;
let weSrc = fs.readFileSync(path.join(ROOT, 'src/lib/clubManagerWorldEdit.ts'), 'utf8');
if (CONTROL === 'noregister') cmSrc = mutate(cmSrc, 'registerLeagueOverrides(worldEdit);', 'registerLeagueOverrides(null);', 'edit registration');
if (CONTROL === 'leak') cmSrc = mutate(cmSrc, 'if (worldEdit) state.leagueOverrides = worldEdit;', 'if (worldEdit || edit === null) state.leagueOverrides = worldEdit ?? {};', 'save write of the edit');
if (CONTROL === 'staticrank') cmSrc = mutate(cmSrc, 'for (const league of REAL_LEAGUES.map(effectiveLeague)) {', 'for (const league of REAL_LEAGUES) {', 'effective league ranking');
if (CONTROL === 'stature') cmSrc = mutate(cmSrc, 'TITLE_STATURE.has(clubName) && playsInRealLeague(clubName);', 'TITLE_STATURE.has(clubName);', 'real league stature guard');
if (CONTROL === 'noload') cmSrc = mutate(cmSrc, 'registerLeagueOverrides(parsed.leagueOverrides ?? null);', 'registerLeagueOverrides(null);', 'load registration');
if (CONTROL === 'dupe') weSrc = mutate(weSrc, '.map(c => (c === b ? a : c));', '.map(c => c);', 'second half of the swap');
/* The old order: next season's memberships registered first, then the field read. */
if (CONTROL === 'lateucl') cmSrc = mutate(cmSrc, 'const nextUclField = uclQualifiersFrom(career);', 'const nextUclField = (registerLeagueOverrides(pr.overrides), uclQualifiersFrom(career));', 'played world Europe read');
const QUAL_LEAGUE = 'const qualLeague = worldEdit ? (REAL_LEAGUES.find(l => l.clubs.includes(club.name)) ?? league) : league;';
if (CONTROL === 'euroone') cmSrc = mutate(cmSrc, QUAL_LEAGUE, 'const qualLeague = league;', 'season one real league read');
/* The board's transfer asks, bundled against the same engine copy. */
let baSrc = fs.readFileSync(path.join(ROOT, 'src/lib/clubManagerBoardAsks.ts'), 'utf8');
if (CONTROL === 'homecountry') baSrc = mutate(baSrc, 'LEAGUE_NATIONS[(home ?? careerLeagueOf(career)).id]', 'LEAGUE_NATIONS[careerLeagueOf(career).id]', 'real league country read');
const cmPath = path.join(TMP, 'clubManager.ts').replaceAll('\\', '/');
fs.writeFileSync(cmPath, cmSrc);
fs.writeFileSync(path.join(TMP, 'clubManagerWorldEdit.ts'), weSrc.replace("from '@/lib/clubManager'", `from '${cmPath}'`));
fs.writeFileSync(path.join(TMP, 'clubManagerBoardAsks.ts'), baSrc.replaceAll("from '@/lib/clubManager'", `from '${cmPath}'`));
/* The baseline section 0 compares against: this branch's engine, unmutated,
   with every hunk through which an edit reaches a career taken out. It moves
   with every other round's change to the engine, so it measures the edit
   plumbing and nothing else, and a hunk that is renamed or moved stops the
   run rather than leaving a baseline that quietly includes it. */
let baseSrc = cmOriginal;
baseSrc = mutate(baseSrc, 'registerLeagueOverrides(worldEdit);', 'registerLeagueOverrides(null);', 'baseline: edit registration');
baseSrc = mutate(baseSrc, 'if (worldEdit) state.leagueOverrides = worldEdit;', '', 'baseline: save write of the edit');
baseSrc = mutate(baseSrc, 'TITLE_STATURE.has(clubName) && playsInRealLeague(clubName);', 'TITLE_STATURE.has(clubName);', 'baseline: real league stature guard');
baseSrc = mutate(baseSrc, QUAL_LEAGUE, 'const qualLeague = league;', 'baseline: season one real league read');
const basePath = path.join(TMP, 'clubManager.base.ts').replaceAll('\\', '/');
fs.writeFileSync(basePath, baseSrc);

function bundle(name, body) {
  const entry = path.join(TMP, `${name}.entry.mjs`);
  const out = path.join(TMP, `${name}.bundle.mjs`);
  fs.writeFileSync(entry, body);
  execSync(`"${ESBUILD}" "${entry}" --bundle --format=esm --platform=node --outfile="${out}" --log-level=error --alias:@=${ROOT_FWD}/src`, { stdio: 'inherit' });
  return out;
}
const branchBundle = bundle('branch', `export * as cm from '${cmPath}';\nexport * as we from '${path.join(TMP, 'clubManagerWorldEdit.ts').replaceAll('\\', '/')}';\nexport * as ba from '${path.join(TMP, 'clubManagerBoardAsks.ts').replaceAll('\\', '/')}';\n`);
const baseBundle = bundle('base', `export * as cm from '${basePath}';\n`);

const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
  clear: () => { store.clear(); },
};
const { cm, we, ba } = await import(pathToFileURL(branchBundle).href);
const { cm: baseCm } = await import(pathToFileURL(baseBundle).href);

/* A resettable stream for the identity checks: both engines must see the same draws. */
function withSeed(seed, fn) {
  const saved = Math.random;
  let a = seed >>> 0;
  Math.random = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const savedNow = Date.now;
  Date.now = () => 1790000000000;
  try { return fn(); } finally { Math.random = saved; Date.now = savedNow; }
}
const SEED = Number.isFinite(Number(process.env.SIM_SEED)) ? Number(process.env.SIM_SEED) : 964;

function runSeason(engine, s, observe) {
  let guard = 0;
  while (s.week < s.calendar.length && guard < 200) {
    guard++;
    const week = s.week;
    const r = engine.playNextEntry(s, { skipHalftime: true });
    if (observe && r.report) observe({ week, kind: r.kind, report: r.report });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return s;
}
const realClubs = id => cm.REAL_LEAGUES.find(l => l.id === id).clubs;
const sameSet = (a, b) => a.length === b.length && new Set(a).size === a.length && b.every(c => a.includes(c));

function sectionZero() {
  console.log('0) no edit is today\'s game, byte for byte');
  for (const club of ['Celtic', 'Arsenal', 'Hull City', 'Real Madrid']) {
    const base = withSeed(SEED, () => JSON.stringify(baseCm.startCareer(club)));
    const absent = withSeed(SEED, () => JSON.stringify(cm.startCareer(club)));
    const nul = withSeed(SEED, () => JSON.stringify(cm.startCareer(club, undefined, undefined, undefined, undefined, null)));
    ok(absent === base, `${club}: a career with no edit argument differs from the engine without the edit at kickoff`);
    ok(nul === base, `${club}: a career with a null edit differs from the engine without the edit at kickoff`);
    /* A swap made and undone is no edit, and an edit some preview left
       registered never reaches a career started without one. */
    const undone = we.swapClubs(we.swapClubs(null, club, 'Brentford'), club, 'Brentford');
    const back = withSeed(SEED, () => JSON.stringify(cm.startCareer(club, undefined, undefined, undefined, undefined, undone)));
    ok(back === base, `${club}: a swap made and undone differs from the engine without the edit at kickoff`);
    cm.registerLeagueOverrides(we.swapClubs(null, 'Celtic', 'Real Madrid'));
    const stale = withSeed(SEED, () => JSON.stringify(cm.startCareer(club)));
    ok(stale === base, `${club}: a stale registered edit leaked into a career started without one`);
  }
  /* Whole seasons and their summers, on both engines, one stream each:
     a league no pyramid touches, and one whose summer promotes and relegates. */
  const playOut = (engine, club, edit) => withSeed(SEED + 1, () => {
    const s = edit === 'absent' ? engine.startCareer(club) : engine.startCareer(club, undefined, undefined, undefined, undefined, null);
    const end = runSeason(engine, s);
    const next = engine.startNextSeason(end);
    return { end: JSON.stringify(end), next: JSON.stringify(next), table: end.table.length };
  });
  let bytes = 0;
  for (const club of ['Celtic', 'Hull City']) {
    const base = playOut(baseCm, club, 'absent');
    const mine = playOut(cm, club, null);
    ok(mine.end === base.end, `${club}: a null edit season ends differently from the engine without the edit`);
    ok(mine.next === base.next, `${club}: a null edit summer rollover differs from the engine without the edit`);
    bytes += base.end.length;
  }
  console.log(`   4 kickoffs x 4 call shapes and two seasons plus their summers compared (${bytes} bytes)`);
}

function sectionOne() {
  console.log('1) a long chain of swaps keeps every league its size and every club once');
  const leagues = cm.REAL_LEAGUES;
  const everyone = leagues.flatMap(l => l.clubs);
  const sorted = [...everyone].sort().join('|');
  let edit = null;
  const startFailures = failures;
  let steps = 0;
  let moved = 0;
  const STEPS = 200;
  for (let i = 0; i < STEPS; i++) {
    const a = everyone[Math.floor(Math.random() * everyone.length)];
    const b = everyone[Math.floor(Math.random() * everyone.length)];
    const before = edit;
    edit = we.swapClubs(edit, a, b);
    if (edit === before) continue;
    steps += 1;
    let bad = 0;
    for (const l of leagues) if (we.editedClubsOf(edit, l.id).length !== l.clubs.length) bad += 1;
    ok(bad === 0, `step ${i}: ${bad} leagues changed size after swapping ${a} and ${b}`);
    const all = leagues.flatMap(l => we.editedClubsOf(edit, l.id));
    ok(new Set(all).size === all.length, `step ${i}: a club is in two leagues after swapping ${a} and ${b}`);
    ok([...all].sort().join('|') === sorted, `step ${i}: the world's clubs are not today's clubs after swapping ${a} and ${b}`);
    ok(JSON.stringify(we.validWorldEdit(edit)) === JSON.stringify(edit), `step ${i}: the edit does not validate`);
    ok(we.editedLeagueIdOf(edit, a) !== null && we.editedLeagueIdOf(edit, b) !== null, `step ${i}: a swapped club is in no league`);
    moved = we.worldEditMoves(edit).length;
    if (failures - startFailures > 5) break;
  }
  ok(steps > STEPS / 2, `only ${steps} of ${STEPS} draws made a swap`);
  console.log(`   ${steps} swaps applied and checked one at a time, ${moved} clubs away from home at the end`);
  return edit;
}

const leagueRounds = s => s.calendar.filter(e => e.type === 'league').length;

/* One full season on an edited world, managing `club`, checked against the edit. */
function seasonOn(edit, club, label) {
  const L = we.editedLeagueIdOf(edit, club);
  const lineup = we.editedClubsOf(edit, L);
  const s0 = cm.startCareer(club, undefined, undefined, undefined, undefined, edit);
  ok(JSON.stringify(s0.leagueOverrides) === JSON.stringify(edit), `${label}: the save does not carry the edit`);
  ok(sameSet(s0.leagueClubs, lineup), `${label}: my league at kickoff is not the edited ${L} lineup`);
  ok(sameSet(s0.table.map(r => r.club), lineup), `${label}: my table at kickoff is not the edited ${L} lineup`);
  /* The calendar a real member of that league gets, with no edit at all. */
  const realMember = cm.REAL_LEAGUES.find(l => l.id === L).clubs.find(c => lineup.includes(c));
  const realCal = leagueRounds(cm.startCareer(realMember));
  /* Season one's Europe is who really qualified, wherever they play now: my
     club is in it on the edited world exactly when it is in the real one. */
  const homeEurope = !!cm.startCareer(club).uclGroup;
  const s = cm.startCareer(club, undefined, undefined, undefined, undefined, edit);
  ok(!!s.uclGroup === homeEurope, `${label}: season one Europe is ${!!s.uclGroup} on the edited world and ${homeEurope} in the real one`);
  ok(leagueRounds(s) === realCal, `${label}: ${leagueRounds(s)} league rounds, a real ${L} club plays ${realCal}`);
  const returnedReports = [], observedLeagueReports = [];
  let omitted = false;
  const end = runSeason(cm, s, entry => {
    returnedReports.push(entry);
    if (entry.report.competition !== 'league') return;
    if (CONTROL === 'observer' && !omitted) { omitted = true; return; }
    observedLeagueReports.push(entry.report);
  });
  const leagueOpps = observedLeagueReports.map(r => r.home === club ? r.away : r.home);
  ok(leagueOpps.length === realCal, `${label}: played ${leagueOpps.length} league matches of ${realCal}`);
  const own = end.table.find(r => r.club === club);
  const ownPlayed = own ? own.w + own.d + own.l : null;
  const leagueHistory = (end.h2h ?? []).filter(r => r.season === end.season && r.comp === 'league');
  const originalStateBytes = JSON.stringify(end), originalReportBytes = JSON.stringify(returnedReports);
  const actualObservation = { ownPlayed, leagueHistoryCount: leagueHistory.length, week: end.week, calendarLength: end.calendar.length };
  const observation = { ...actualObservation };
  const observedKey = { tablecount: 'ownPlayed', historycount: 'leagueHistoryCount', calendarcount: 'week' }[CONTROL];
  if (observedKey) observation[observedKey] -= 1;
  ok(observation.ownPlayed === realCal, `${label}: final own table records ${observation.ownPlayed} league matches of ${realCal}`);
  ok(observation.leagueHistoryCount === realCal, `${label}: full season head-to-head records ${observation.leagueHistoryCount} league matches of ${realCal}`);
  ok(observation.week === observation.calendarLength, `${label}: calendar completed at ${observation.week} of ${observation.calendarLength}`);
  let observedControl = null;
  if (observedKey) {
    const changedKeys = Object.keys(actualObservation).filter(key => observation[key] !== actualObservation[key]);
    const restored = { ...observation, [observedKey]: actualObservation[observedKey] };
    const effective = changedKeys.length === 1 && changedKeys[0] === observedKey && observation[observedKey] === actualObservation[observedKey] - 1;
    const stateHeld = JSON.stringify(end) === originalStateBytes, reportsHeld = JSON.stringify(returnedReports) === originalReportBytes;
    ok(effective && ownPlayed === realCal && leagueHistory.length === realCal && end.week === end.calendar.length, `${label}: ${CONTROL} must change only its one observed count over a healthy actual season`);
    ok(JSON.stringify(restored) === JSON.stringify(actualObservation) && stateHeld && reportsHeld, `${label}: ${CONTROL} must restore its entire observation with all original engine state and reports held`);
    observedControl = { kind: 'Copied actual outcome observation', key: observedKey, before: actualObservation, after: observation, restored, changedKeys, effective, stateHeld, reportsHeld };
  }
  const retainedLog = end.resultLog ?? [];
  const actualLeagueReports = returnedReports.filter(r => r.report.competition === 'league');
  const logComposition = Object.fromEntries(['league', 'cup', 'uclGroup', 'uclKo'].map(id => [id, retainedLog.filter(r => r.competition === id).length]));
  const receiptRoot = path.resolve(ROOT, 'manager-ucl-league-artifacts', 'world-editor');
  fs.mkdirSync(receiptRoot, { recursive: true });
  fs.writeFileSync(path.join(receiptRoot, `${CONTROL || 'healthy'}-${label.replace(/[^A-Za-z0-9]+/g, '-').toLowerCase()}.json`), JSON.stringify({
    label, realCal, returnedReports, observedLeagueReports, actualLeagueCount: actualLeagueReports.length,
    observedLeagueCount: leagueOpps.length, ownPlayed, leagueHistory, complete: end.week === end.calendar.length,
    resultLogCap: cm.SAVE_CAPS.resultLog, logComposition, retainedLog, finalState: end,
    control: CONTROL === 'observer' ? { kind: 'Actual returned-report observer omission', omitted, before: actualLeagueReports.length, after: leagueOpps.length } : observedControl,
  }, null, 2));
  if (CONTROL === 'observer') ok(omitted && actualLeagueReports.length === realCal && leagueOpps.length === realCal - 1, `${label}: observer omission must change exactly one actual returned league report`);
  console.log(`   returned ${actualLeagueReports.length} league reports, table ${ownPlayed}, full history ${leagueHistory.length}; retained log ${logComposition.league} league/${retainedLog.length} total (cap ${cm.SAVE_CAPS.resultLog})`);
  const strangers = leagueOpps.filter(o => !lineup.includes(o));
  ok(strangers.length === 0, `${label}: league fixtures against clubs outside the edited ${L}: ${[...new Set(strangers)].slice(0, 4).join(', ')}`);
  ok(sameSet(end.table.map(r => r.club), lineup), `${label}: my final table is not the edited ${L} lineup`);
  /* Every other league's world table is its edited lineup, and nobody plays twice. */
  const seen = new Map(end.table.map(r => [r.club, L]));
  let worldBad = 0;
  for (const [id, w] of Object.entries(end.world ?? {})) {
    if (!sameSet(w.table.map(r => r.club), we.editedClubsOf(edit, id))) worldBad += 1;
    for (const r of w.table) {
      ok(!seen.has(r.club), `${label}: ${r.club} plays in ${seen.get(r.club)} and ${id}`);
      seen.set(r.club, id);
    }
  }
  ok(worldBad === 0, `${label}: ${worldBad} world tables are not their edited lineups`);
  ok(seen.size === cm.REAL_LEAGUES.reduce((n, l) => n + l.clubs.length, 0), `${label}: ${seen.size} clubs played a league season`);
  /* The domestic cup draws from the edited country. */
  const lgDef = cm.REAL_LEAGUES.find(l => l.id === L);
  if (lgDef.cupName !== null) {
    const nation = cm.NATIONS.find(n => n.leagueIds.includes(L));
    const ids = nation.leagueIds.filter(id => cm.leagueRulesOf(id).cup === lgDef.cupName);
    const country = new Set(ids.flatMap(id => we.editedClubsOf(edit, id)));
    const cupClubs = (end.cupBracket ?? []).flatMap(t => [t.home, t.away]).filter(Boolean);
    ok(cupClubs.length >= 16, `${label}: the ${lgDef.cupName} bracket has ${cupClubs.length} entries`);
    const outsiders = cupClubs.filter(c => !country.has(c));
    ok(outsiders.length === 0, `${label}: the ${lgDef.cupName} drew clubs outside the edited country: ${[...new Set(outsiders)].slice(0, 4).join(', ')}`);
  }
  /* The summer keeps the world whole, and leagues no pyramid touches keep their edit. */
  const next = cm.startNextSeason(end);
  /* Next season's Champions League is what the PLAYED tables earned: each
     European league's table as it was played, mine read as league L whatever
     the summer moved my club into, through the engine's own rule. */
  const played = cm.REAL_LEAGUES.filter(l => l.euro).map(league => ({
    league,
    clubs: (league.id === L ? cm.sortedWorldTable(end, L, end.table) : end.world?.[league.id] ? cm.sortedWorldTable(end, league.id, end.world[league.id].table) : []).map(r => r.club),
  }));
  const fieldSize = next.uclFormat === 'league36' || next.uclGroup?.format === 'league36' ? 36 : 32;
  const earned = cm.uclFieldFromTables(played, end.uclBracket?.find(t => t.round === 'F')?.winner, fieldSize);
  const field = next.uclField ?? [];
  ok(field.length > 0 && JSON.stringify(field) === JSON.stringify(earned), `${label}: next season's Champions League is not the one the played tables earned (${field.slice(0, 4).join(', ')} against ${earned.slice(0, 4).join(', ')})`);
  const europeans = new Set(played.flatMap(t => t.clubs));
  const outsiders = field.filter(c => !europeans.has(c));
  ok(outsiders.length === 0, `${label}: next season's Champions League has clubs that played outside Europe's leagues: ${outsiders.slice(0, 4).join(', ')}`);
  const myMove = cm.careerLeagueOf(next).id !== L ? ` (${club} moved ${L} to ${cm.careerLeagueOf(next).id})` : '';
  const ov = next.leagueOverrides ?? {};
  const all = cm.REAL_LEAGUES.flatMap(l => ov[l.id] ?? l.clubs);
  ok(new Set(all).size === all.length && all.length === seen.size, `${label}: the summer rollover broke the world (${all.length} slots, ${new Set(all).size} clubs)`);
  for (const l of cm.REAL_LEAGUES) ok((ov[l.id] ?? l.clubs).length === l.clubs.length, `${label}: ${l.id} is ${(ov[l.id] ?? l.clubs).length} clubs after the summer`);
  const paired = new Set(cm.PYRAMIDS.flatMap(p => [p.top, p.second]));
  for (const l of cm.REAL_LEAGUES) {
    if (paired.has(l.id)) continue;
    ok(sameSet(ov[l.id] ?? l.clubs, we.editedClubsOf(edit, l.id)), `${label}: ${l.id} lost its edit over the summer`);
  }
  return { L, rounds: realCal, cupTies: (end.cupBracket ?? []).length, europe: `season one Europe ${!!s.uclGroup}, next field ${field.length}${myMove}` };
}

/* startCareer leaves its world registered, so each read puts the real world back. */
const leagueAsk = (club, edit) => {
  const ask = cm.startCareer(club, undefined, undefined, undefined, undefined, edit).boardObjectives.find(o => o.id === 'league');
  cm.registerLeagueOverrides(null);
  return ask;
};
const isSurvive = ask => /stay up|avoid relegation/i.test(ask.label);

function sectionThree() {
  console.log('3) the board reads the club against its NEW league');
  const weakestScot = cm.playableClubs('scottish').at(-1).name;
  const bigDown = we.swapClubs(null, 'Manchester City', weakestScot);
  const cityAsk = leagueAsk('Manchester City', bigDown);
  ok(cityAsk.target === 1, `Manchester City moved to Scotland is asked "${cityAsk.label}", not the title`);
  const smallAsk = leagueAsk(weakestScot, bigDown);
  ok(isSurvive(smallAsk), `${weakestScot} moved to the Premier League is asked "${smallAsk.label}", not to survive`);
  const celticHome = leagueAsk('Celtic', null);
  const celticUp = leagueAsk('Celtic', we.swapClubs(null, 'Celtic', 'Brentford'));
  ok(celticHome.target === 1 && celticUp.target > 1, `Celtic: "${celticHome.label}" at home and "${celticUp.label}" in the Premier League, the title carried over`);
  /* The help's worked example, word for word what it promises. */
  const brentfordScot = leagueAsk('Brentford', we.swapClubs(null, 'Celtic', 'Brentford'));
  ok(isSurvive(celticUp), `the help says Celtic in the Premier League are asked to stay up, the board says "${celticUp.label}"`);
  ok(brentfordScot.label === 'Win the Scottish Premiership', `the help says Brentford in Scotland are asked to win the Scottish Premiership, the board says "${brentfordScot.label}"`);
  /* Review fix: the league is new, the club is not. A moved club's board
     asks for players from its OWN country, the same country it asks for at
     home (it used to follow the league: Celtic in the Premier League were
     asked for English players). */
  const natAsk = (club, edit) => {
    const c = ba.askCandidates(cm.startCareer(club, undefined, undefined, undefined, undefined, edit)).find(x => x.objective.id === 'natQuota');
    cm.registerLeagueOverrides(null);
    return c ? c.objective.country : 'none';
  };
  /* The fix reads the club's real league, which equals its league on every
     unedited save only because promotion never crosses a border. */
  const crossBorder = cm.PYRAMIDS.filter(p => cm.LEAGUE_NATIONS[p.top] !== cm.LEAGUE_NATIONS[p.second]);
  ok(cm.PYRAMIDS.length > 0 && crossBorder.length === 0, `promotion crosses a border: ${crossBorder.map(p => `${p.top}/${p.second}`).join(', ')}`);
  const swapCB = we.swapClubs(null, 'Celtic', 'Brentford');
  const nat = [['Celtic', 'Scotland'], ['Brentford', 'England']].map(([club, home]) => ({ club, home, atHome: natAsk(club, null), moved: natAsk(club, swapCB) }));
  for (const r of nat) {
    ok(r.atHome === r.home, `${r.club}'s board asks for players from ${r.atHome} at home, measured ${r.home}`);
    ok(r.moved === r.home, `${r.club} moved by the editor are asked for players from ${r.moved}, not their own ${r.home}`);
  }
  console.log(`   nationality asks, home and moved: ${nat.map(r => `${r.club} ${r.atHome}/${r.moved}`).join(', ')}`);
  /* Ladders: every club of one league moved into another, one at a time,
     strongest first. The ask may never get kinder as the club gets stronger
     (an inversion), and between two leagues of similar strength it has to
     span the board, from the title down to staying up. */
  const walk = (from, partner) => cm.playableClubs(from).map(c => ({ club: c.name, ask: leagueAsk(c.name, we.swapClubs(null, c.name, partner)) }));
  const inversions = rows => rows.slice(1).filter((r, i) => r.ask.target < rows[i].ask.target).length;
  const show = rows => rows.map(r => r.ask.target).join(' ');
  const listed = rows => rows.map(r => `${r.club} ${r.ask.target}`).join(', ');
  const scotUp = walk('scottish', 'Brentford');
  ok(inversions(scotUp) === 0, `the Scottish ladder into the Premier League inverts: ${listed(scotUp)}`);
  ok(isSurvive(scotUp.at(-1).ask), `the weakest Scottish club in the Premier League is asked "${scotUp.at(-1).ask.label}"`);
  const weakestBuli = cm.playableClubs('bundesliga').at(-1).name;
  const ladders = [
    ['Bundesliga into the Premier League', walk('bundesliga', 'Brentford'), true],
    ['Premier League into the Bundesliga', walk('premier', weakestBuli), false],
  ];
  /* Between the title and staying up the board has middle asks too, not two
     answers. Measured on the baked rosters (deterministic, every seed): the
     Bundesliga ladder into the Premier League has 1 middle ask (1 5 17x16)
     and the Premier League ladder into the Bundesliga 6 (1x14 4 4 5 5 6 6),
     7 in all. Review fix: this used to be "at least 3 different asks" per
     ladder, which the first ladder met with exactly 3 and no headroom, so one
     re-bake moving one club out of the 5 band turned it red with nothing
     broken. A floor of 4 of the measured 7 leaves room for a re-bake to move
     three clubs between bands and still fails a board that only ever says
     win it or stay up. */
  const middle = ladders.flatMap(([, rows]) => rows).filter(r => r.ask.target > 1 && !isSurvive(r.ask)).length;
  ok(middle >= 4, `only ${middle} middle asks (neither the title nor survival) across both ladders, measured 7`);
  for (const [name, rows, up] of ladders) {
    ok(inversions(rows) === 0, `the ${name} ladder inverts: ${listed(rows)}`);
    ok(rows[0].ask.target === 1, `the strongest club of the ${name} ladder is asked "${rows[0].ask.label}"`);
    /* Measured: the weakest Premier League squad is still a Conference League
       side in the Bundesliga, so only a ladder into the stronger league ends on survival. */
    if (up) ok(isSurvive(rows.at(-1).ask), `the weakest club of the ${name} ladder is asked "${rows.at(-1).ask.label}"`);
  }
  /* And the top flight moved down a level: far more title asks than at home. */
  const down = walk('premier', weakestScot);
  const downTitles = down.filter(r => r.ask.target === 1).length;
  const homeTitles = cm.playableClubs('premier').filter(c => leagueAsk(c.name, null).target === 1).length;
  ok(downTitles > homeTitles, `${downTitles} Premier League clubs are asked for the title in Scotland, ${homeTitles} at home`);
  console.log(`   title asks for Premier League clubs in Scotland ${downTitles}, at home ${homeTitles}`);
  console.log(`   Scottish clubs in the PL: ${show(scotUp)}`);
  console.log(`   middle asks across the two Bundesliga ladders: ${middle} (floor 4)`);
  for (const [name, rows] of ladders) console.log(`   ${name}: ${show(rows)}`);
}

function sectionFour() {
  console.log('4) the save keeps the edited world');
  const edit = we.swapClubs(we.swapClubs(null, 'Celtic', 'Brentford'), 'Rangers', 'Real Madrid');
  let s = cm.startCareer('Celtic', undefined, undefined, undefined, undefined, edit);
  for (let i = 0; i < 6; i++) s = cm.playNextEntry(s, { skipHalftime: true }).state;
  ok(cm.saveCareer(s), 'the edited career did not save');
  cm.registerLeagueOverrides(null);
  cm.startCareer('Arsenal');
  ok(cm.leagueOf('Celtic').id === 'scottish', 'the real world did not come back between save and load');
  const back = cm.loadCareer();
  ok(!!back, 'the edited save did not load');
  if (!back) return;
  ok(JSON.stringify(back.leagueOverrides) === JSON.stringify(edit), 'the loaded save lost its edit');
  ok(cm.leagueOf('Celtic').id === 'premier' && cm.leagueOf('Rangers').id === 'laliga' && cm.leagueOf('Real Madrid').id === 'scottish', 'the loaded save does not answer league lookups with its edit');
  ok(cm.careerLeagueOf(back).id === 'premier', 'the loaded career is not in the Premier League');
  const after = cm.playNextEntry(back, { skipHalftime: true }).state;
  const leagueOpps = (after.resultLog ?? []).filter(r => r.competition === 'league').map(r => r.opp);
  const lineup = we.editedClubsOf(edit, 'premier');
  ok(leagueOpps.every(o => lineup.includes(o)), 'a match after the reload was against a club outside the edited league');
  /* An old save with no overrides loads on the real world. */
  const KEY = 'dukb-club-manager-save';
  const old = JSON.parse(store.get(KEY));
  delete old.leagueOverrides;
  store.set(KEY, JSON.stringify(old));
  const oldBack = cm.loadCareer();
  ok(!!oldBack && cm.leagueOf('Celtic').id === 'scottish', 'a save without overrides did not load on the real world');
  console.log(`   ${leagueOpps.length} league matches played across the reload`);
}

const sections = [
  ['0', sectionZero],
  ['1', sectionOne],
  ['3', sectionThree],
  ['4', sectionFour],
];
let chaos = null;
for (const [id, fn] of sections) {
  const before = failures;
  try {
    const r = fn();
    if (id === '1') chaos = r;
  } catch (e) {
    fail(`section ${id} threw: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`);
  }
  if (failures > before) console.log(`   section ${id}: RED`);
}

function sectionTwo(chaosEdit) {
  console.log('2) full seasons play the edited world');
  const champ = cm.playableClubs('championship').at(-1).name;
  const runs = [
    [we.swapClubs(null, 'Celtic', 'Brentford'), 'Celtic', 'Celtic in the Premier League'],
    [we.swapClubs(null, 'Real Madrid', champ), 'Real Madrid', `Real Madrid in the Championship for ${champ}`],
  ];
  /* The chaos world from section 1, managing its first club whose new league is a different size from home. */
  const moves = chaosEdit ? we.worldEditMoves(chaosEdit) : [];
  const size = id => realClubs(id).length;
  const pick = moves.find(m => size(m.to) !== size(m.from)) ?? moves[0];
  if (pick) runs.push([chaosEdit, pick.club, `${pick.club} in ${pick.to} on a ${moves.length} move world`]);
  ok(runs.length === 3, 'section 1 left no edited world to play');
  for (const [edit, club, label] of runs) {
    const t0 = Date.now();
    const r = seasonOn(edit, club, label);
    console.log(`   ${label}: ${r.rounds} league rounds, ${r.cupTies} cup ties, ${r.europe}, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }
}
{
  const before = failures;
  try { sectionTwo(chaos); } catch (e) { fail(`section 2 threw: ${e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e}`); }
  if (failures > before) console.log('   section 2: RED');
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\nsimWorldEditor${CONTROL ? ` (control ${CONTROL})` : ''}: ${checks} checks, ${failures} failures`);
if (CONTROL === 'observer') {
  if (failures !== 3 || failureMessages.some(m => !/played \d+ league matches of \d+$/.test(m))) {
    throw new Error('Observer control requires exactly the three real returned-report count failures, no unrelated failures');
  }
  console.log('CONTROL observer FIRED: exactly three changed returned-report count assertions, all table/history/calendar predicates held.');
}
const observedFailures = {
  tablecount: /final own table records \d+ league matches of \d+$/,
  historycount: /full season head-to-head records \d+ league matches of \d+$/,
  calendarcount: /calendar completed at \d+ of \d+$/,
};
if (observedFailures[CONTROL]) {
  if (failures !== 3 || failureMessages.some(m => !observedFailures[CONTROL].test(m))) {
    throw new Error(`${CONTROL} requires exactly its three copied-observation assertion failures, no unrelated failures`);
  }
  console.log(`CONTROL ${CONTROL} FIRED: exactly three changed ${CONTROL} assertions, all other predicates and full original engine state/reports held; copied observations restored.`);
}
process.exit(failures ? 1 : 0);
