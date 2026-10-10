// Release AT review, area sc-engine. Run on a GitHub runner from the repo root:
//   node .rc/x/scEngine.mjs <base worktree> <arm>
// It never edits a tracked file: the inverse is applied in memory by an esbuild plugin.
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HEAD_ROOT = process.cwd();
const BASE_ROOT = process.argv[2];
const ARM = process.argv[3] || 'eq';
const BUDGET_MS = Number(process.env.SC_BUDGET_MS || 540000);
const T0 = Date.now();
const overBudget = () => Date.now() - T0 > BUDGET_MS;
if (!BASE_ROOT || !fs.existsSync(path.join(BASE_ROOT, 'src/lib/soccerCareerEngine.ts'))) { console.error('ABORT: no base worktree at ' + BASE_ROOT); process.exit(2); }
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-engine-'));
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
const require = createRequire(import.meta.url);
const ENGINE_REL = 'src/lib/soccerCareerEngine.ts';
const headSrc = fs.readFileSync(path.join(HEAD_ROOT, ENGINE_REL), 'utf8');
const baseSrc = fs.readFileSync(path.join(BASE_ROOT, ENGINE_REL), 'utf8');

function count(src, needle) { let n = 0, at = 0; for (;;) { at = src.indexOf(needle, at); if (at < 0) return n; n += 1; at += needle.length; } }
function must(cond, msg) { if (!cond) { console.error('ABORT (the probe refuses to run): ' + msg); process.exit(2); } }
function block(src, start, end, who) {
  must(count(src, start) === 1, `${who}: start marker not exactly once: ${start}`);
  must(count(src, end) === 1, `${who}: end marker not exactly once: ${end}`);
  const a = src.indexOf(start), b = src.indexOf(end);
  must(a < b, `${who}: markers out of order: ${start}`);
  return src.slice(a, b);
}
const BLOCKS = [
  ['event6', '{ id: 6, emoji:', '{ id: 7, emoji:'],
  ['event12', '{ id: 12, emoji:', '{ id: 13, emoji:'],
  ['newsTally', 'totalGoals > 0 && (totalGoals === 100', 'yearsPlaying >= 5 && s.currentClubTier <= 2 && ovr >= 78'],
  ['news100', 'totalGoals >= 100 && totalGoals - season.goals < 100,', 's.intStats.caps >= 100 && (s.intStats.caps'],
];
const FORM = ' + recentClubForm(state).swing';
const ROLE = ' + reducedRoleSwing(state)';
const NEWS_RETURN = 'return personalGoalMilestoneNews(out, s, season, NEWSPAPERS[0]);';
/** which: a set of names out of form, role, event6, event12, newsTally, news100, newsReturn */
function inverseOf(src, which) {
  let out = src; const applied = [];
  if (which.has('form')) { must(count(out, FORM) === 1, 'form anchor'); out = out.replace(FORM, ''); applied.push('form'); }
  if (which.has('role')) { must(count(out, ROLE) === 1, 'role anchor'); out = out.replace(ROLE, ''); applied.push('role'); }
  for (const [name, start, end] of BLOCKS) {
    if (!which.has(name)) continue;
    const mine = block(out, start, end, 'head ' + name), theirs = block(baseSrc, start, end, 'base ' + name);
    must(mine !== theirs, `${name}: head and base blocks are already equal, the inverse would change nothing`);
    out = out.replace(mine, () => theirs); applied.push(name);
  }
  if (which.has('newsReturn')) { must(count(out, NEWS_RETURN) === 2, 'news return anchor twice'); out = out.split(NEWS_RETURN).join('return out;'); applied.push('newsReturn'); }
  must(applied.length === which.size, 'unknown inverse name in ' + [...which].join(','));
  must(which.size === 0 || out !== src, 'the inverse changed nothing');
  return out;
}
const ALL_INVERSE = new Set(['form', 'event6', 'event12', 'newsTally', 'news100', 'newsReturn']);

const EXTRA = [
  ['ambitions', 'src/lib/soccerCareerAmbitions.ts'], ['records', 'src/lib/soccerCareerRecords.ts'],
  ['milestone', 'src/lib/soccerCareerMilestone.ts'], ['role', 'src/lib/soccerCareerRole.ts'],
  ['preparation', 'src/lib/soccerCareerPreparation.ts'], ['mentor', 'src/lib/soccerCareerMentor.ts'],
  ['selection', 'src/lib/soccerCareerSelection.ts'], ['squad', 'src/lib/soccerClubSquad.ts'],
  ['sheet', 'src/lib/soccerClubSquadSheet.ts'], ['phone', 'src/lib/soccerPhone.ts'],
  ['seasonHistory', 'src/lib/soccerCareerSeasonHistory.ts'], ['derbyHistory', 'src/lib/soccerCareerDerbyHistory.ts'],
  ['discipline', 'src/lib/soccerDiscipline.ts'],
];
let bundleNo = 0;
async function load(root, label, inverse = new Set()) {
  const id = `${label}-${bundleNo++}`;
  const entry = path.join(work, `${id}.ts`), outfile = path.join(work, `${id}.cjs`);
  const rels = [['soccer', ENGINE_REL], ...EXTRA].filter(([, rel]) => fs.existsSync(path.join(root, rel)));
  fs.writeFileSync(entry, rels.map(([as, rel]) => `export * as ${as} from '${path.join(root, rel).split(path.sep).join('/')}';`).join('\n'));
  const enginePath = path.join(root, ENGINE_REL);
  const plugin = { name: 'inverse', setup(b) {
    b.onLoad({ filter: /soccerCareerEngine\.ts$/ }, args => {
      if (path.resolve(args.path) !== path.resolve(enginePath) || inverse.size === 0) return null;
      return { contents: inverseOf(fs.readFileSync(args.path, 'utf8'), inverse), loader: 'ts', resolveDir: path.dirname(args.path) };
    });
  } };
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile, logLevel: 'silent', alias: { '@': path.join(root, 'src') }, plugins: [plugin] });
  return require(outfile);
}

// One seeded stream per engine instance, with a draw counter.
function stream(seed) {
  let x = (seed * 2654435761) >>> 0 || 1; const st = { draws: 0 };
  st.next = () => { st.draws += 1; x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  return st;
}
const realRandom = Math.random;
function withStream(st, fn) { Math.random = st.next; try { return fn(); } finally { Math.random = realRandom; } }
// The driver's own choices never touch Math.random: a hash of the seed and the step.
function h32(a, b) { let h = (a * 374761393 + b * 668265263) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return (h ^ (h >>> 16)) >>> 0; }
const stats = v => ({ pace: v, shooting: v, passing: v, dribbling: v, defending: v, physical: v, reflexes: v });
const POSITIONS = ['ST', 'CM', 'CB', 'GK', 'LW', 'CAM', 'RB', 'CDM'];
const ERAS = [['2025', 2025], ['2020-24', 2020], ['2010-14', 2010], ['2025', 2025], ['2000-04', 2000], ['2025', 2025]];
const NATIONS = ['England', 'Spain', 'Brazil', 'Germany', 'France', 'Argentina'];
const played = s => (s.seasons || []).filter(r => r.type === 'playing').length;
const clone = v => JSON.parse(JSON.stringify(v));

// Every pause the engine raises is answered. pol 0 is the builder's driver (last choice, stay, accept the
// suggestion). pol 1 moves: it takes offers and loans, answers events by hash, rushes rehab, keeps playing.
function step(e, clubs, s, pol, seed, n) {
  const r = h32(seed, n);
  switch (s.phase) {
    case 'youth': return e.advanceYouthYear(s, clubs);
    case 'contract_offer': { const offers = s.pendingOffers || []; return offers.length ? e.acceptOffer(s, offers[pol ? r % offers.length : 0]) : { ...s, phase: 'playing' }; }
    case 'playing': return e.advanceProSeason(s, clubs);
    case 'newspaper': return e.dismissNewspaper(s);
    case 'season_summary': return e.dismissSummary(s, clubs);
    case 'international_debut': return e.dismissDebut(s, clubs);
    case 'world_cup': return e.dismissWorldCup(s, clubs);
    case 'rehab_choice': return e.applyRehabChoice(s, pol ? r % 2 : 1);
    case 'rivalry_event': return e.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return e.dismissBallonDor(s, clubs);
    case 'bdor_speech': return e.applyBdorSpeech(s, 0);
    case 'wc_speech': return e.applyWorldCupSpeech(s, 0);
    case 'moral_dilemma': return e.dismissMoralDilemma(s, clubs);
    case 'social_media_action': return e.dismissSocialMediaPhase(s, clubs);
    case 'red_card_appeal_result': return e.dismissAppealResult(s, clubs);
    case 'retirement_suggestion': return pol && s.age < 35 ? e.declineRetirementSuggestion(s, clubs) : e.acceptRetirementSuggestion(s);
    case 'retirement_ceremony': case 'retired': return { ...s, retired: true };
    case 'random_events': {
      const ev = (s.pendingEvents || [])[0];
      if (!ev || !ev.choices || !ev.choices.length) return { ...s, phase: 'playing', pendingEvents: [] };
      return e.applyEventChoice(s, pol ? r % ev.choices.length : ev.choices.length - 1, clubs);
    }
    case 'contract_expiring': case 'transfer_window': {
      if (pol) {
        const offers = (s.transferSituation && s.transferSituation.offers) || [], loans = s.pendingLoanOffers || [];
        const k = r % 10;
        if (k < 3 && offers.length) { const o = offers[(r >>> 4) % offers.length]; return o.isLoan ? e.acceptLoan(s, o) : e.acceptOffer(s, o); }
        if (k < 5 && loans.length && !s.loan) return e.acceptLoan(s, loans[(r >>> 4) % loans.length]);
      }
      return e.stayAtClub(s);
    }
    default: { const next = e.advanceProSeason(s, clubs); return next.phase === s.phase ? { ...next, retired: true } : next; }
  }
}
function firstDiffs(a, b, p = '', out = []) {
  if (out.length >= 8 || a === b) return out;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') { out.push(`${p}: base ${String(JSON.stringify(a)).slice(0, 150)} | head ${String(JSON.stringify(b)).slice(0, 150)}`); return out; }
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) firstDiffs(a[k], b[k], p + '.' + k, out);
  return out;
}
function setupOf(seed) {
  const [era, startYear] = ERAS[seed % ERAS.length];
  return { era, startYear, pos: POSITIONS[seed % POSITIONS.length], ovr: 58 + (seed % 6) * 5, nation: NATIONS[seed % NATIONS.length], pot: 80 + (seed % 15) };
}
function start(E, clubs, seed) {
  const c = setupOf(seed);
  return E.initCareer(`Probe ${seed}`, c.nation, c.pos, c.era, stats(c.ovr), c.ovr, c.startYear, clubs, null, c.pot);
}

// ARM eq / eqr / eqc-<name>: Release AS source against the merged engine with the declared inverse applied.
// With `scrub` (arms ev6 and ev12) one event is left as the train wrote it, and the compare takes out only what
// that event says it adds: its saved field, its own log lines and its card's words. Everything else must be equal.
function scrubbed(state, scrub) {
  const walk = v => {
    if (Array.isArray(v)) { const out = []; for (const x of v) { if (typeof x === 'string' && scrub.re.test(x)) continue; out.push(walk(x)); } return out; }
    if (v && typeof v === 'object') {
      const o = {}; for (const [k, x] of Object.entries(v)) o[k] = walk(x);
      if (o.id === scrub.id && Array.isArray(o.choices) && typeof o.title === 'string') { o.description = ''; o.choices = o.choices.map(c => ({ ...c, label: '', consequence: '' })); }
      return o;
    }
    return v;
  };
  const c = walk(JSON.parse(JSON.stringify(state)));
  for (const k of scrub.stateDel) delete c[k];
  for (const row of c.seasons || []) for (const k of scrub.rowDel) delete row[k];
  if (c.pendingSummary) for (const k of scrub.rowDel) delete c.pendingSummary[k];
  return JSON.stringify(c);
}
async function armEq({ reload, inverse, expectRed, maxSeed, scrub = null }) {
  const base = await load(BASE_ROOT, 'base'), head = await load(HEAD_ROOT, 'head', inverse);
  const A = base.soccer, B = head.soccer, clubsA = A.FALLBACK_CLUBS, clubsB = B.FALLBACK_CLUBS;
  const t = { careers: 0, equal: 0, different: 0, steps: 0, rows: 0, draws: 0, formWouldMove: 0, event6: 0, event12: 0, tallyNews: 0, reloads: 0, retiredCareers: 0 };
  const phases = {}; const firsts = [];
  for (let seed = 1; seed <= maxSeed && !overBudget(); seed++) for (const pol of [0, 1]) {
    const ra = stream(seed * 7919 + 13 + pol), rb = stream(seed * 7919 + 13 + pol);
    let a = withStream(ra, () => start(A, clubsA, seed)), b = withStream(rb, () => start(B, clubsB, seed));
    let same = true; t.careers += 1;
    for (let n = 0; n < 900; n++) {
      const ja = scrub ? scrubbed(a, scrub) : JSON.stringify(a), jb = scrub ? scrubbed(b, scrub) : JSON.stringify(b);
      if (ja !== jb || ra.draws !== rb.draws) {
        same = false;
        if (firsts.length < 6) firsts.push(`seed ${seed} pol ${pol} step ${n} phase ${a.phase}/${b.phase} draws ${ra.draws}/${rb.draws} rows ${played(a)}: ` + firstDiffs(JSON.parse(ja), JSON.parse(jb)).join(' ;; '));
        break;
      }
      if (a.retired) { t.retiredCareers += 1; break; }
      phases[a.phase] = (phases[a.phase] || 0) + 1;
      if (a.phase === 'playing' && head.selection && head.selection.recentClubForm(b).swing !== 0) t.formWouldMove += 1;
      if (a.phase === 'random_events' && a.pendingEvents && a.pendingEvents[0]) { if (a.pendingEvents[0].id === 6) t.event6 += 1; if (a.pendingEvents[0].id === 12) t.event12 += 1; }
      if (a.phase === 'newspaper' && (a.pendingNews || []).some(x => /Club Record For Goals|100th Career Goal/.test(x.headline))) t.tallyNews += 1;
      // eqr: BOTH trees load the save Release AS wrote (a reloaded event card is answered differently from one in
      // memory on main too, Rounds 667 and 725, so the fair compare reloads both sides)
      const inB = reload ? B.repairCareer(JSON.parse(ja)) : b;
      if (reload) { t.reloads += 1; a = A.repairCareer(JSON.parse(ja)); }
      a = withStream(ra, () => step(A, clubsA, a, pol, seed, n));
      b = withStream(rb, () => step(B, clubsB, inB, pol, seed, n));
      t.steps += 1;
    }
    if (same) t.equal += 1; else t.different += 1;
    t.rows += played(a); t.draws += ra.draws;
  }
  console.log(JSON.stringify(t)); console.log('phases ' + JSON.stringify(phases));
  for (const f of firsts) console.log('  DIFF ' + f);
  const name = `${scrub ? scrub.name : reload ? 'eqr' : 'eq'}[inverse ${[...inverse].join('+') || 'none'}]`;
  if (scrub && (scrub.id === 6 ? t.event6 : t.event12) < 10) { console.log(`${name}: INCONCLUSIVE, the event came up only ${scrub.id === 6 ? t.event6 : t.event12} times.`); process.exit(3); }
  if (expectRed) {
    if (t.different > 0) { console.log(`${name}: CONTROL FIRED. ${t.different} of ${t.careers} careers differ from Release AS, as they must with this part of the inverse left out.`); process.exit(1); }
    console.log(`${name}: CONTROL DID NOT FIRE. ${t.careers} careers equal with part of the inverse left out: the compare cannot see that change.`); process.exit(0);
  }
  if (t.careers < 20) { console.log(`${name}: INCONCLUSIVE, only ${t.careers} careers inside the budget.`); process.exit(3); }
  if (t.different) { console.log(`${name}: RED. ${t.different} of ${t.careers} careers differ from Release AS (54e3820a) after the declared inverse.`); process.exit(1); }
  console.log(`${name}: GREEN. ${t.equal} of ${t.careers} whole careers byte equal to Release AS at every one of ${t.steps} steps (state JSON and draw count), ${t.rows} playing rows, ${t.draws} draws.`);
  process.exit(0);
}

const YEAR_OUT = ['BANNED', 'BANNED (PED)', 'PRISON', 'CONVICTED'];
const NEW_STATE = ['seasonAmbition', 'seasonPreparation', 'mentor', 'reducedRole'];
const NEW_ROW = ['ambition', 'preparation', 'reducedRole'];
const nextYearOf = s => ((s.seasons[s.seasons.length - 1] || {}).year || 0) + 1;
const EXAMPLES = [];
function picks(H, s, seed, n) {
  if (s.phase !== 'playing' || s.retired) return s;
  const r = h32(seed + 77, n);
  const opts = H.ambitions.ambitionOptions(s);
  if (opts.length && r % 4 !== 0) s = H.ambitions.pickCareerAmbition(s, opts[(r >>> 2) % opts.length].id);
  const k = (r >>> 6) % 3;
  s = H.preparation.pickCareerPreparation(s, k === 0 ? 'push' : k === 1 ? 'recovery' : null);
  return s;
}

// ARM inv: the merged engine as it ships, with every new decision taken, walked twice from one seed:
// once in memory and once through a save and a reload before EVERY step. Rules checked on every new row.
async function armInv({ maxSeed, reload }) {
  const H = await load(HEAD_ROOT, 'head'); const E = H.soccer, clubs = E.FALLBACK_CLUBS;
  const t = { careers: 0, steps: 0, rows: 0, failures: 0, reloadEqual: 0, reloadDifferent: 0,
    ambAchieved: 0, ambMissed: 0, ambInterrupted: 0, ambDroppedByMove: 0, prepCompleted: 0, prepInterrupted: 0, prepZeroAdjust: 0,
    roleQueued: 0, roleServed: 0, roleInterrupted: 0, roleCancelledByMove: 0, mentorCreated: 0, mentorGraduated: 0, mentorEnded: 0, mentorSeasons: 0,
    moves: 0, loans: 0, formUp: 0, formDown: 0, formNone: 0, formRowLeagueOverApps: 0, formRowLeagueOverAppsPre2026: 0,
    leagueOverAppsRows: 0, milestoneNews: 0, retired: 0 };
  const fails = []; const fail = m => { t.failures += 1; if (fails.length < 30) fails.push(m); };
  for (let seed = 1; seed <= maxSeed && !overBudget(); seed++) {
    const pol = 1; const rx = stream(seed * 104729 + 7), ry = stream(seed * 104729 + 7);
    let x = withStream(rx, () => start(E, clubs, seed)), y = withStream(ry, () => start(E, clubs, seed));
    t.careers += 1; let same = true; const tag = `seed ${seed}`;
    for (let n = 0; n < 900 && !x.retired; n++) {
      if (reload) x = E.repairCareer(clone(x));
      x = picks(H, x, seed, n);
      const pre = { amb: H.ambitions.ambitionForNextSeason(x), prep: H.preparation.preparationForSeason(x), role: H.role.reducedRoleForSeason(x),
        hadRole: x.reducedRole !== undefined, rows: x.seasons.length, mentor: x.mentor ? clone(x.mentor) : null, club: x.currentClub, loan: !!x.loan,
        form: x.phase === 'playing' ? H.selection.recentClubForm(x) : null, phase: x.phase, ev: x.phase === 'random_events' && x.pendingEvents[0] ? x.pendingEvents[0].id : null, year: nextYearOf(x) };
      x = withStream(rx, () => step(E, clubs, x, pol, seed, n)); t.steps += 1; void y; void ry;
      const fresh = x.seasons.slice(pre.rows).filter(r => r.type === 'playing');
      if (x.currentClub !== pre.club) {
        if (x.loan && !pre.loan) t.loans += 1; else t.moves += 1;
        if (x.reducedRole !== undefined) fail(`${tag} step ${n}: a reduced role plan survived a club change ${pre.club} to ${x.currentClub}`);
        if (pre.hadRole) t.roleCancelledByMove += 1;
        if (x.seasonAmbition !== undefined || x.seasonPreparation !== undefined) fail(`${tag} step ${n}: a target or a preseason plan survived a club change`);
        if (pre.mentor && (pre.mentor.status === 'active' || pre.mentor.status === 'paused') && pre.mentor.club === pre.club && x.mentor.status !== 'ended') fail(`${tag} step ${n}: the mentorship did not end on leaving ${pre.club}: ${x.mentor.status}`);
      }
      if (pre.ev === 6 && !pre.mentor && x.mentor) t.mentorCreated += 1;
      if (pre.ev === 12 && !pre.hadRole && x.reducedRole) { t.roleQueued += 1; if (x.reducedRole.year !== pre.year || x.reducedRole.club !== pre.club) fail(`${tag} step ${n}: queued plan ${JSON.stringify(x.reducedRole)} is not next year ${pre.year} at ${pre.club}`); }
      if (fresh.length > 1) fail(`${tag} step ${n}: ${fresh.length} playing rows appended by one step`);
      for (const row of fresh) checkRow(H, t, fail, tag, x, pre, row);
      if (x.mentor && pre.mentor && pre.mentor.status !== 'ended' && x.mentor.status === 'ended') t.mentorEnded += 1;
      if (x.phase === 'newspaper' && pre.phase !== 'newspaper' && (x.pendingNews || []).some(a => a.headline.endsWith(' Senior Club Goals'))) t.milestoneNews += 1;
      if (x.retired) { t.retired += 1;
        for (const k of ['seasonAmbition', 'seasonPreparation', 'reducedRole']) if (x[k] !== undefined) fail(`${tag}: retired with ${k} still held`);
        if (x.mentor && x.mentor.status !== 'ended' && x.mentor.status !== 'graduated') fail(`${tag}: retired with the mentorship ${x.mentor.status}`); }
    }
    void same;
  }
  const name = reload ? 'invr (a save and a reload before every step)' : 'inv (in memory)';
  console.log(JSON.stringify(t)); for (const f of fails) console.log('  FAIL ' + f); for (const e of EXAMPLES) console.log('  EXAMPLE ' + e);
  if (t.careers < 20) { console.log(`${name}: INCONCLUSIVE, only ${t.careers} careers inside the budget.`); process.exit(3); }
  if (t.failures) { console.log(`${name}: RED. ${t.failures} failure(s) over ${t.careers} careers and ${t.rows} playing rows.`); process.exit(1); }
  console.log(`${name}: GREEN. ${t.careers} careers, ${t.rows} playing rows, ${t.steps} steps: every rule held on every new row.`);
  process.exit(0);
}
function checkRow(H, t, fail, tag, x, pre, row) {
  t.rows += 1;
  for (const k of ['apps', 'goals', 'assists', 'cleanSheets', 'yellowCards', 'redCards']) if (!Number.isInteger(row[k]) || row[k] < 0) fail(`${tag} ${row.year}: ${k} is ${row[k]}`);
  if (row.leagueApps !== undefined && (!Number.isInteger(row.leagueApps) || row.leagueApps < 0 || row.leagueApps > 38)) fail(`${tag} ${row.year}: leagueApps ${row.leagueApps}`);
  if (typeof row.leagueApps === 'number' && row.leagueApps > row.apps) t.leagueOverAppsRows += 1;
  if (x.seasonAmbition !== undefined || x.seasonPreparation !== undefined) fail(`${tag} ${row.year}: a target or plan is still held after its year was recorded`);
  const out = YEAR_OUT.includes(row.club);
  // the season target
  if (pre.amb && row.year === pre.amb.year && (row.club === pre.amb.club || out)) {
    const a = row.ambition;
    if (!a) fail(`${tag} ${row.year}: a held target left no result on the row`);
    else if (a.outcome === 'achieved') { t.ambAchieved += 1;
      if (!(a.actual >= a.target) || row[pre.amb.stat] !== a.actual) fail(`${tag} ${row.year}: achieved but actual ${a.actual} target ${a.target} row ${row[pre.amb.stat]}`);
      if ((x.statBoostNextSeason || {})[a.rewardStat] !== 1) fail(`${tag} ${row.year}: achieved target banked ${(x.statBoostNextSeason || {})[a.rewardStat]} ${a.rewardStat}, expected exactly 1`);
    } else if (a.outcome === 'missed') { t.ambMissed += 1; if (!(a.actual < a.target) || a.rewardStat) fail(`${tag} ${row.year}: missed but actual ${a.actual} target ${a.target} reward ${a.rewardStat}`);
    } else if (a.outcome === 'interrupted') { t.ambInterrupted += 1;
      if (!(row.injurySevere || !(row.apps > 0) || out || (pre.amb.stat === 'rating' && row.apps < 10)) || a.rewardStat) fail(`${tag} ${row.year}: interrupted without a reason: apps ${row.apps} severe ${row.injurySevere}`);
    } else fail(`${tag} ${row.year}: target outcome ${a.outcome}`);
  } else { if (row.ambition) fail(`${tag} ${row.year}: a target result with no held target for this year and club`); if (pre.amb) t.ambDroppedByMove += 1; }
  // the preseason plan
  if (pre.prep && row.year === pre.prep.year && (row.club === pre.prep.club || out)) {
    const p = row.preparation;
    if (!p) fail(`${tag} ${row.year}: a held preseason plan left no result on the row`);
    else if (p.outcome === 'completed') { t.prepCompleted += 1;
      if (!(row.apps > 0) || row.injurySevere || out || row.club !== pre.prep.club) fail(`${tag} ${row.year}: plan completed in a year that should interrupt it`);
      const want = pre.prep.id === 'push' ? 1 : -1;
      if (p.adjustment !== want) { if (p.adjustment === 0 && (x[p.skill] === 99 || x[p.skill] === 20)) t.prepZeroAdjust += 1; else fail(`${tag} ${row.year}: ${pre.prep.id} saved adjustment ${p.adjustment} with ${p.skill} at ${x[p.skill]}`); }
    } else if (p.outcome === 'interrupted') { t.prepInterrupted += 1;
      if (p.adjustment !== 0) fail(`${tag} ${row.year}: interrupted plan with adjustment ${p.adjustment}`);
      if (row.apps > 0 && !row.injurySevere && !out) fail(`${tag} ${row.year}: plan interrupted in a played, uninjured year (apps ${row.apps})`);
    } else fail(`${tag} ${row.year}: plan outcome ${p.outcome}`);
  } else if (row.preparation) fail(`${tag} ${row.year}: a plan result with no held plan for this year and club`);
  // the reduced role
  if (pre.role && row.year === pre.role.year && (row.club === pre.role.club || out)) {
    const q = row.reducedRole;
    if (!q || q.plannedReduction !== 4) fail(`${tag} ${row.year}: a held reduced role left no result on the row`);
    else { const served = row.apps > 0 && !row.injurySevere && row.club === pre.role.club;
      if (q.outcome === 'served') t.roleServed += 1; else t.roleInterrupted += 1;
      if ((q.outcome === 'served') !== served) fail(`${tag} ${row.year}: role outcome ${q.outcome} with apps ${row.apps} severe ${row.injurySevere}`); }
    if (x.reducedRole !== undefined) fail(`${tag} ${row.year}: the reduced role is still held after its year`);
  } else if (row.reducedRole) fail(`${tag} ${row.year}: a role result with no plan for this year and club`);
  // form
  if (pre.form) {
    if (pre.form.swing > 0) t.formUp += 1; else if (pre.form.swing < 0) t.formDown += 1; else t.formNone += 1;
    if (pre.form.swing !== 0 && pre.form.row.leagueApps > pre.form.row.apps) { t.formRowLeagueOverApps += 1;
      if (EXAMPLES.length < 6) EXAMPLES.push(`${tag}: form ${pre.form.swing} for ${row.year} read the ${pre.form.row.year} row at ${pre.form.row.club}: apps ${pre.form.row.apps}, leagueApps ${pre.form.row.leagueApps}, rating ${pre.form.row.rating}, injury ${pre.form.row.injury} (severe ${pre.form.row.injurySevere}); the line shown: ${pre.form.reason}`); if (pre.form.row.year < 2026) t.formRowLeagueOverAppsPre2026 += 1; }
  }
  // the mentor
  const m0 = pre.mentor, m1 = x.mentor;
  if (m0 && (m0.status === 'ended' || m0.status === 'graduated') && JSON.stringify(m1) !== JSON.stringify(m0)) fail(`${tag} ${row.year}: a finished mentorship changed`);
  if (m0 && (m0.status === 'active' || m0.status === 'paused') && row.year > m0.lastYear && row.year >= m0.startYear) {
    t.mentorSeasons += 1;
    const last = m1.history[m1.history.length - 1];
    if (m1.history.length !== m0.history.length + 1 || !last || last.year !== row.year) { fail(`${tag} ${row.year}: mentor history did not gain exactly this year`); return; }
    const qualifies = row.club === m0.club && !row.injurySevere && row.apps >= 10;
    if (last.progress !== m0.progress + (qualifies ? 1 : 0)) fail(`${tag} ${row.year}: mentor progress ${m0.progress} to ${last.progress}, qualifies ${qualifies}`);
    if (m1.progress > 3 || m1.progress !== last.progress) fail(`${tag} ${row.year}: mentor progress ${m1.progress} against its history ${last.progress}`);
    if (last.age !== 16 + row.year - m0.startYear + 1) fail(`${tag} ${row.year}: mentor age ${last.age}`);
    if (qualifies && last.progress === 3 && last.status !== 'graduated') fail(`${tag} ${row.year}: three years and not graduated`);
    if (last.status === 'graduated') { t.mentorGraduated += 1; if (last.progress !== 3) fail(`${tag} ${row.year}: graduated on ${last.progress}`); }
    if (row.club !== m0.club && !out && last.status !== 'ended') fail(`${tag} ${row.year}: a season at another club did not end the mentorship`);
    for (let i = 1; i < m1.history.length; i++) if (m1.history[i].year <= m1.history[i - 1].year) fail(`${tag} ${row.year}: mentor history years out of order`);
  }
}
function stripNew(s) { const c = clone(s); for (const k of NEW_STATE) delete c[k]; return c; }
// Pro states at a season start, taken from seeded walks of the merged engine (no picks), new fields removed.
function samples(H, maxSeed, perCareer) {
  const E = H.soccer, clubs = E.FALLBACK_CLUBS, out = [];
  for (let seed = 1; seed <= maxSeed && !overBudget(); seed++) {
    const rx = stream(seed * 31337 + 5); let x = withStream(rx, () => start(E, clubs, seed)); let taken = 0;
    for (let n = 0; n < 700 && !x.retired && taken < perCareer; n++) {
      if (x.phase === 'playing' && played(x) >= 1 && (n + seed) % 3 === 0) { out.push({ seed, n, state: stripNew(x) }); taken += 1; }
      x = withStream(rx, () => step(E, clubs, x, 1, seed, n));
    }
  }
  return out;
}
// One season from a season start: the advance, and Keep Playing when the retirement talk stops it.
function season(E, clubs, s, S) {
  const st = stream(S);
  const out = withStream(st, () => { let r = E.advanceProSeason(clone(s), clubs); if (r.phase === 'retirement_suggestion') r = E.declineRetirementSuggestion(r, clubs); return r; });
  const row = out.seasons.length > s.seasons.length ? out.seasons[out.seasons.length - 1] : null;
  return { out, row, draws: st.draws };
}
const SKILLS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'];
const coreOf = r => r && JSON.stringify([r.year, r.club, r.apps, r.leagueApps, r.goals, r.assists, r.cleanSheets, r.rating, r.injury, r.injuryWeeks, r.injurySevere, r.suspensionMatches]);

// ARM ab: each new decision against the same season without it, from the same save and the same seed.
async function armAb({ maxSeed }) {
  const H = await load(HEAD_ROOT, 'head'); const E = H.soccer, clubs = E.FALLBACK_CLUBS;
  const pool = samples(H, maxSeed, 5);
  const t = { samples: pool.length, failures: 0, ambPairs: 0, ambAchieved: 0, ambEqualElsewhere: 0, prepPairs: 0, prepSameInjury: 0, prepDrawsEqual: 0,
    pushInjured: 0, noneInjured: 0, recoveryInjured: 0, injuryTrials: 0, rolePairs: 0, roleLeagueCut: 0, roleAppsCut: 0, roleRows: 0, mentorPairs: 0, mentorEqualElsewhere: 0,
    composeCases: 0, composeSkipped: 0, composeLow: 0, banCases: 0, banZeroApps: 0, formCases: 0 };
  const fails = []; const fail = m => { t.failures += 1; if (fails.length < 30) fails.push(m); };
  const clampN = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  for (const sm of pool) {
    if (overBudget()) break;
    const s0 = sm.state, S = h32(sm.seed, sm.n) + 11, tag = `seed ${sm.seed} step ${sm.n}`, Y = nextYearOf(s0), C = s0.currentClub;
    const base = season(E, clubs, s0, S);
    if (!base.row || base.row.type !== 'playing') continue;
    // 1. the season target: nothing but its own result, its line and one point may differ
    for (const opt of H.ambitions.ambitionOptions(s0)) {
      const withIt = season(E, clubs, H.ambitions.pickCareerAmbition(s0, opt.id), S); t.ambPairs += 1;
      const a = withIt.row && withIt.row.ambition; const achieved = a && a.outcome === 'achieved'; if (achieved) t.ambAchieved += 1;
      if (base.row.club === C && !a) fail(`${tag}: target ${opt.id} left no result`);
      const got = (withIt.out.statBoostNextSeason || {})[opt.rewardStat] || 0, had = (base.out.statBoostNextSeason || {})[opt.rewardStat] || 0;
      if (got - had !== (achieved ? 1 : 0)) fail(`${tag}: target ${opt.id} ${a && a.outcome}: banked ${got} against ${had} without it`);
      const norm = r => { const c = clone(r.out); delete c.statBoostNextSeason; c.events = c.events.filter(e => !e.includes('Ambition ')); for (const row of c.seasons) delete row.ambition; if (c.pendingSummary) delete c.pendingSummary.ambition; return JSON.stringify(c); };
      if (norm(withIt) === norm(base) && withIt.draws === base.draws) t.ambEqualElsewhere += 1; else fail(`${tag}: target ${opt.id} changed more than its own result: ` + firstDiffs(JSON.parse(norm(base)), JSON.parse(norm(withIt))).join(' ;; '));
    }
    // 2. the preseason plan: one point on one skill after growth, when the injury is the same
    for (const id of ['push', 'recovery']) {
      const withIt = season(E, clubs, H.preparation.pickCareerPreparation(s0, id), S); t.prepPairs += 1;
      if (!withIt.row || !withIt.row.preparation) { if (base.row.club === C) fail(`${tag}: ${id} left no result`); continue; }
      if (coreOf(withIt.row) !== coreOf(base.row)) continue;
      t.prepSameInjury += 1; if (withIt.draws === base.draws) t.prepDrawsEqual += 1;
      const p = withIt.row.preparation;
      for (const k of SKILLS) { const d = withIt.out[k] - base.out[k]; const want = k === p.skill ? p.adjustment : 0;
        if (d !== want && withIt.draws === base.draws) fail(`${tag}: ${id}: ${k} differs by ${d}, saved adjustment on ${p.skill} is ${p.adjustment}`); }
      if (p.outcome === 'completed' && p.adjustment !== (id === 'push' ? 1 : -1) && !(base.out[p.skill] === 99 || base.out[p.skill] === 20)) fail(`${tag}: ${id} completed with ${p.adjustment} from ${base.out[p.skill]}`);
    }
    // 3. injury risk: the same draws, so recovery can only remove an injury and a push can only add one
    for (let k = 0; k < 40; k++) {
      const roll = v => withStream(stream(S + k * 97), () => E.calcAppearances(s0.overall, s0.currentClubTier, s0.age, v)).injured;
      const none = roll(s0), push = roll({ ...s0, seasonPreparation: { id: 'push', year: Y, club: C } }), rec = roll({ ...s0, seasonPreparation: { id: 'recovery', year: Y, club: C } });
      t.injuryTrials += 1; if (none) t.noneInjured += 1; if (push) t.pushInjured += 1; if (rec) t.recoveryInjured += 1;
      if ((rec && !none) || (none && !push)) fail(`${tag}: injury order broken: recovery ${rec} none ${none} push ${push}`);
    }
    abCompose(H, t, fail, tag, s0, S, base, clampN);
  }
  console.log(JSON.stringify(t)); for (const f of fails) console.log('  FAIL ' + f);
  const n = t.injuryTrials || 1;
  console.log(`injury rate over ${t.injuryTrials} paired draws: recovery ${(t.recoveryInjured / n).toFixed(4)}, none ${(t.noneInjured / n).toFixed(4)}, push ${(t.pushInjured / n).toFixed(4)} (the rule says minus 0.04 and plus 0.03 before the 0.04 to 0.42 clamp)`);
  if (t.samples < 60) { console.log(`ab: INCONCLUSIVE, only ${t.samples} samples.`); process.exit(3); }
  if (t.failures) { console.log(`ab: RED. ${t.failures} failure(s) over ${t.samples} season starts.`); process.exit(1); }
  console.log(`ab: GREEN. ${t.samples} season starts: each new decision changed only what it says (targets ${t.ambPairs}, plans ${t.prepPairs}, roles ${t.rolePairs}, mentors ${t.mentorPairs}, selection sums ${t.composeCases}, bans ${t.banCases}).`);
  process.exit(0);
}
function abCompose(H, t, fail, tag, s0, S, base, clampN) {
  const E = H.soccer, clubs = E.FALLBACK_CLUBS, Y = nextYearOf(s0), C = s0.currentClub;
  const last = s0.seasons[s0.seasons.length - 1];
  const settled = last && last.type === 'playing' && last.club === C && !YEAR_OUT.includes(C) && !s0.loan;
  // 4. the reduced role over a whole season
  if (!s0.loan) {
    const withIt = season(E, clubs, { ...s0, reducedRole: { club: C, year: Y } }, S); t.rolePairs += 1;
    if (withIt.row && withIt.row.type === 'playing' && base.row.club === C) {
      if (!withIt.row.reducedRole) fail(`${tag}: a reduced role left no result on the row`);
      if (withIt.out.reducedRole !== undefined) fail(`${tag}: the reduced role is still held after its season`);
      if (typeof withIt.row.leagueApps === 'number' && typeof base.row.leagueApps === 'number' && !withIt.row.injury && !base.row.injury && !(s0.frozenOut > 0)) {
        t.roleRows += 1; t.roleLeagueCut += base.row.leagueApps - withIt.row.leagueApps; t.roleAppsCut += base.row.apps - withIt.row.apps;
      }
    }
  }
  // 5. a running mentorship: no draw, and nothing but itself and its lines
  {
    const mentor = { generated: true, name: 'Probe Mentor', position: 'CM', club: C, startYear: Y, lastYear: Y - 1, age: 16, progress: 0, status: 'active', history: [] };
    const withM = season(E, clubs, { ...s0, mentor }, S); t.mentorPairs += 1;
    const norm = r => { const c = clone(r.out); delete c.mentor; c.events = c.events.filter(e => !e.includes('academy') && !e.includes('mentorship')); return JSON.stringify(c); };
    if (norm(withM) === norm(base) && withM.draws === base.draws) t.mentorEqualElsewhere += 1;
    else fail(`${tag}: a mentorship changed more than itself: ` + firstDiffs(JSON.parse(norm(base)), JSON.parse(norm(withM))).join(' ;; '));
  }
  // 6. the selection sum, exactly: band draw, phone, form, role, then the clamp, then the freeze
  if (settled) {
    const phone = H.phone.phoneAppsSwing(s0);
    const mk = (rating, role, frozen) => { const v = clone(s0); const r = v.seasons[v.seasons.length - 1]; r.rating = rating; r.leagueApps = 20; if (role) v.reducedRole = { club: C, year: Y }; v.frozenOut = frozen; return v; };
    for (let k = 0; k < 4; k++) {
      const seedK = S + 1000 + k * 13;
      const L = v => withStream(stream(seedK), () => E.calcAppearances(s0.overall, s0.currentClubTier, s0.age, v)).leagueApps;
      const L0 = L(mk(7.0, false, 0));
      if (!(L0 > 0 && L0 < 38)) { t.composeSkipped += 1; continue; }
      const r = L0 - phone;
      for (const [rating, form] of [[7.0, 0], [8.0, 2], [7.6, 2], [6.0, -2], [6.4, -2], [7.5, 0], [6.5, 0]]) for (const role of [false, true]) for (const frozen of [0, 1]) {
        const got = L(mk(rating, role, frozen));
        let want = clampN(r + phone + form + (role ? -4 : 0), 0, 38);
        if (frozen) want = Math.min(8, Math.round(want * 0.25));
        t.composeCases += 1; if (want <= 4) t.composeLow += 1; if (form !== 0) t.formCases += 1;
        if (got !== want) fail(`${tag}: selection sum: band draw ${r}, phone ${phone}, form ${form}, role ${role}, frozen ${frozen}: got ${got}, the rule gives ${want}`);
      }
    }
  }
  // 7. a ban on top of a reduced role and poor form: served once, never below zero
  if (settled) {
    for (const ban of [3, 60]) {
      const v = clone(s0); v.pendingSuspensionMatches = ban; v.reducedRole = { club: C, year: Y };
      const lr = v.seasons[v.seasons.length - 1]; lr.rating = 6.0; lr.leagueApps = 20;
      const got = season(E, clubs, v, S); t.banCases += 1;
      const row = got.row; if (!row || row.type !== 'playing' || YEAR_OUT.includes(row.club)) continue;
      if (!Number.isInteger(row.apps) || row.apps < 0 || !Number.isInteger(row.leagueApps) || row.leagueApps < 0 || row.leagueApps > 38) fail(`${tag}: ban ${ban}: apps ${row.apps} leagueApps ${row.leagueApps}`);
      const remaining = got.out.pendingSuspensionMatches || 0;
      if ((row.suspensionMatches || 0) + remaining !== ban) fail(`${tag}: ban ${ban}: served ${row.suspensionMatches} and ${remaining} left do not add up`);
      if (row.apps === 0) { t.banZeroApps += 1;
        if (row.goals !== 0 || row.assists !== 0 || row.redCards !== 0) fail(`${tag}: ban ${ban}: no appearances but goals ${row.goals} assists ${row.assists} reds ${row.redCards}`);
        if (row.reducedRole && row.reducedRole.outcome !== 'interrupted') fail(`${tag}: ban ${ban}: no appearances and the role reads ${row.reducedRole.outcome}`); }
      if (!row.reducedRole) fail(`${tag}: ban ${ban}: the reduced role left no result`);
    }
  }
}
function readers(H, v) {
  const E = H.soccer;
  H.ambitions.ambitionOptions(v); H.ambitions.ambitionForNextSeason(v);
  H.preparation.preparationForSeason(v); H.preparation.preparationInjuryDelta(v);
  H.role.reducedRoleForSeason(v); H.role.reducedRoleSwing(v);
  H.records.careerRecordBook(v);
  for (const row of v.seasons) { H.role.readReducedRoleResult(row); H.milestone.personalGoalMilestone(v.seasons, row); if (H.seasonHistory.savedSeasonAvailability) H.seasonHistory.savedSeasonAvailability(row); }
  const rows = H.seasonHistory.seasonHistoryRows ? H.seasonHistory.seasonHistoryRows(v) : [];
  const pair = H.seasonHistory.defaultSeasonComparison ? H.seasonHistory.defaultSeasonComparison(rows) : null;
  if (pair) H.seasonHistory.compareSavedSeasons(v, pair[0], pair[1]);
  const at = H.squad.squadNow(v);
  if (at) { const trust = H.squad.managerTrust(v, at); H.sheet.planLine(trust); H.sheet.trustLines(v, at, trust); }
  withStream(stream(5), () => E.getAllEvents(v));
}
// what CareerMentorTile reads when its dialog is opened
function mentorDialog(v) { const m = v.mentor; if (!m) return; void `${m.name} ${m.position} ${m.progress}`; void [...m.history].reverse().map(e => `${e.year} ${e.status} ${e.reason} ${e.progress} ${e.age}`); void m.history.length; }

// ARM mal: a malformed new field must change nothing and break nothing.
async function armMal({ maxSeed }) {
  const H = await load(HEAD_ROOT, 'head'); const E = H.soccer, clubs = E.FALLBACK_CLUBS;
  const pool = samples(H, maxSeed, 2).filter(sm => !sm.state.loan).slice(0, 24);
  const t = { samples: pool.length, cases: 0, threw: 0, changed: 0, readerThrew: 0, dialogThrew: 0, formCases: 0, formMoved: 0 };
  const by = {}; const lines = [];
  const note = (field, kind, msg) => { by[field] = by[field] || { cases: 0, threw: 0, changed: 0, readerThrew: 0, dialogThrew: 0 }; by[field][kind] += 1; t[kind] += 1; if (kind !== 'cases' && lines.length < 60 && !lines.some(l => l.startsWith(`${field} ${kind}: ${msg.slice(0, 40)}`))) lines.push(`${field} ${kind}: ${msg}`); };
  const norm = out => { const c = clone(out); for (const k of NEW_STATE) delete c[k]; for (const row of c.seasons) for (const k of NEW_ROW) delete row[k]; if (c.pendingSummary) for (const k of NEW_ROW) delete c.pendingSummary[k]; return JSON.stringify(c); };
  for (const sm of pool) {
    const s0 = sm.state, S = h32(sm.seed, sm.n) + 23, Y = nextYearOf(s0), C = s0.currentClub;
    const control = season(E, clubs, s0, S), want = norm(control.out);
    const amb = { id: 'goals', stat: 'goals', label: 'Score 5 club goals', target: 5, rewardStat: 'shooting', year: Y, club: C };
    const men = { generated: true, name: 'Probe Mentor', position: 'CM', club: C, startYear: Y, lastYear: Y - 1, age: 16, progress: 0, status: 'active', history: [] };
    const CASES = {
      seasonAmbition: [null, 0, 7, 'x', true, [], {}, { ...amb, target: '5' }, { ...amb, target: -1 }, { ...amb, rewardStat: 'overall' }, { ...amb, rewardStat: 'morale' }, { ...amb, year: Y + 0.5 }, { ...amb, stat: 'apps', id: 'apps' }, { ...amb, club: 7 }, { ...amb, label: '' }, { ...amb, year: Y - 3 }, { ...amb, club: 'Nowhere FC' }, { ...amb, id: 'assists' }],
      seasonPreparation: [null, 0, 7, 'x', true, [], {}, { id: 'sprint', year: Y, club: C }, { id: 'push', year: String(Y), club: C }, { id: 'push', year: Y, club: 7 }, { id: 'push', year: Y - 3, club: C }, { id: 'push', year: Y, club: 'Nowhere FC' }, { id: 'push' }],
      reducedRole: [null, 0, 7, 'x', true, [], {}, { club: C }, { year: Y }, { club: C, year: String(Y) }, { club: C, year: Y + 0.5 }, { club: C, year: -1 }, { club: 'BANNED', year: Y }, { club: 'Nowhere FC', year: Y }, { club: C, year: Y - 3 }, { club: '', year: Y }],
      mentor: [null, 0, 7, 'x', true, [], {}, { status: 'active' }, { ...men, history: null }, { ...men, history: 'none' }, { ...men, progress: 'two' }, { ...men, startYear: 'x', lastYear: null }, { ...men, status: 'weird' }, { ...men, club: 7 }, { generated: true, name: 'A', status: 'paused' }],
    };
    const run = (field, value, v) => {
      note(field, 'cases', '');
      const label = JSON.stringify(value);
      try { const got = season(E, clubs, v, S); const mine = norm(got.out);
        if (mine !== want || got.draws !== control.draws) note(field, 'changed', `${label}: ` + firstDiffs(JSON.parse(want), JSON.parse(mine)).slice(0, 2).join(' ;; '));
      } catch (err) { note(field, 'threw', `${label}: playing the season threw ${String(err && err.message).slice(0, 110)}`); }
      try { readers(H, clone(v)); } catch (err) { note(field, 'readerThrew', `${label}: ${String(err && err.stack).split('\n').slice(0, 2).join(' | ').slice(0, 200)}`); }
      try { mentorDialog(clone(v)); } catch (err) { note(field, 'dialogThrew', `${label}: ${String(err && err.message).slice(0, 110)}`); }
    };
    for (const [field, values] of Object.entries(CASES)) for (const value of values) { const v = clone(s0); v[field] = value; run(field, value, v); }
    for (const field of NEW_ROW) for (const value of ['x', 7, true, [], {}, null]) { const v = clone(s0); v.seasons[v.seasons.length - 1][field] = value; run('row.' + field, value, v); }
    // a previous row the form rule must refuse
    const last = s0.seasons[s0.seasons.length - 1];
    if (last && last.type === 'playing' && last.club === C) for (const [k, bad] of [['leagueApps', '12'], ['leagueApps', null], ['leagueApps', 12.5], ['leagueApps', -3], ['leagueApps', 99], ['leagueApps', 9], ['rating', '8'], ['rating', null], ['rating', 11], ['rating', -1]]) {
      const v = clone(s0); const r = v.seasons[v.seasons.length - 1]; r.rating = 8.0; r.leagueApps = 20; r[k] = bad; t.formCases += 1;
      if (H.selection.recentClubForm(v).swing !== 0) { t.formMoved += 1; if (lines.length < 60) lines.push(`form moved on a row with ${k} ${JSON.stringify(bad)}`); }
    }
  }
  console.log(JSON.stringify(t)); console.log('by field ' + JSON.stringify(by)); for (const l of lines) console.log('  ' + l);
  if (t.samples < 12) { console.log(`mal: INCONCLUSIVE, only ${t.samples} samples.`); process.exit(3); }
  const bad = t.threw + t.changed + t.readerThrew + t.dialogThrew + t.formMoved;
  if (bad) { console.log(`mal: RED. Over ${t.cases} malformed saves on ${t.samples} season starts: ${t.threw} threw while playing, ${t.changed} changed the season, ${t.readerThrew} threw in a reader, ${t.dialogThrew} threw in the mentor dialog's reads, ${t.formMoved} moved form.`); process.exit(1); }
  console.log(`mal: GREEN. ${t.cases} malformed saves on ${t.samples} season starts changed nothing and broke nothing.`);
  process.exit(0);
}

if (ARM === 'eq') await armEq({ reload: false, inverse: ALL_INVERSE, expectRed: false, maxSeed: 500 });
else if (ARM === 'eqr') await armEq({ reload: true, inverse: ALL_INVERSE, expectRed: false, maxSeed: 500 });
else if (ARM.startsWith('eqc-')) {
  const drop = ARM.slice(4);
  const inverse = new Set([...ALL_INVERSE].filter(k => drop === 'all' ? false : drop === 'news' ? !k.startsWith('news') : k !== drop));
  must(inverse.size < ALL_INVERSE.size, 'unknown control ' + drop);
  await armEq({ reload: false, inverse, expectRed: true, maxSeed: 80 });
}
else if (ARM === 'ev6') await armEq({ reload: false, inverse: new Set([...ALL_INVERSE].filter(k => k !== 'event6')), expectRed: false, maxSeed: 500,
  scrub: { name: 'ev6 (the Youth Mentor event as shipped)', id: 6, re: /mentor/i, stateDel: ['mentor'], rowDel: [] } });
else if (ARM === 'ev12') await armEq({ reload: false, inverse: new Set([...[...ALL_INVERSE].filter(k => k !== 'event12'), 'role']), expectRed: false, maxSeed: 500,
  scrub: { name: 'ev12 (the New Manager event as shipped, the swing term taken out)', id: 12, re: /reduced role/i, stateDel: ['reducedRole'], rowDel: ['reducedRole'] } });
else if (ARM === 'inv') await armInv({ maxSeed: 500, reload: false });
else if (ARM === 'invr') await armInv({ maxSeed: 500, reload: true });
else if (ARM === 'ab') await armAb({ maxSeed: 80 });
else if (ARM === 'mal') await armMal({ maxSeed: 30 });
else { console.error('ABORT: unknown arm ' + ARM); process.exit(2); }
