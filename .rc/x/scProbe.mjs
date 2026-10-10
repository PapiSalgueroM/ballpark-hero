// Release AU adversarial review, lens sc-engine. One process loads TWO engines: the base tree's (origin/release-at-gate,
// a second worktree) and the head's (cwd), drives both with the same seeded Math.random and compares whole saves.
// usage: BASE_ROOT=/tmp/base node scProbe.mjs <section> [more sections]   sections: A B C D E F G (default: all)
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HEAD_ROOT = process.cwd();
const BASE_ROOT = process.env.BASE_ROOT || '/tmp/base';
const OUT = process.env.RC_OUT || os.tmpdir();
const want = new Set(process.argv.slice(2).length ? process.argv.slice(2) : ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-probe-'));
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
const require = createRequire(import.meta.url);
async function load(name, root, rels) {
  const entry = path.join(work, `${name}.ts`), outfile = path.join(work, `${name}.cjs`);
  fs.writeFileSync(entry, rels.filter(([, rel]) => fs.existsSync(path.join(root, rel)))
    .map(([as, rel]) => `export * as ${as} from '${path.join(root, rel).split(path.sep).join('/')}';`).join('\n'));
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile, logLevel: 'silent', alias: { '@': path.join(root, 'src') },
    define: { 'import.meta.env': '{"PROD":true,"DEV":false}' }, loader: { '.css': 'empty', '.svg': 'empty', '.png': 'empty', '.jpg': 'empty', '.webp': 'empty' } });
  return require(outfile);
}
const RELS = [
  ['soccer', 'src/lib/soccerCareerEngine.ts'], ['programme', 'src/lib/soccerCareerProgramme.ts'], ['cups', 'src/lib/soccerSeasonCompetitions.ts'],
  ['calendar', 'src/lib/soccerSeasonCalendar.ts'], ['wheel', 'src/lib/careerChanceWheel.ts'], ['cup', 'src/lib/soccerCareerCup.ts'], ['role', 'src/lib/soccerCareerRole.ts'],
];
const realRandom = Math.random;
let draws = 0;
function seeded(seed) { let x = (seed * 2654435761) >>> 0 || 1; return () => { draws++; x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
const withSeed = (seed, fn) => { Math.random = seeded(seed); try { return fn(); } finally { Math.random = realRandom; } };
const sha = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex').slice(0, 12);
const copy = v => JSON.parse(JSON.stringify(v));
const stats = v => ({ pace: v, shooting: v, passing: v, dribbling: v, defending: v, physical: v, reflexes: v });
const POSITIONS = ['ST', 'CM', 'CB', 'GK', 'LW', 'CAM', 'RB', 'CDM', 'LB', 'RW'];
const NATIONS = ['England', 'Spain', 'Brazil', 'Germany', 'France', 'Italy'];
const playedRows = s => (s.seasons || []).filter(r => r.type === 'playing').length;

// The declared additions of PR216 on a career that chose no plan: the wheel's receipt and the opening cup tie.
function project(state) {
  const s = copy(state);
  delete s.chanceWheel;
  const walk = v => { if (!v || typeof v !== 'object') return; if (v.cupRun && typeof v.cupRun === 'object') delete v.cupRun.opening; for (const k of Object.keys(v)) walk(v[k]); };
  walk(s);
  return s;
}
function firstDiff(a, b, at = '') {
  if (a === b) return null;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return `${at}: ${JSON.stringify(a)?.slice(0, 90)} vs ${JSON.stringify(b)?.slice(0, 90)}`;
  if (Array.isArray(a) !== Array.isArray(b)) return `${at}: array vs object`;
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  for (const k of keys) { const d = firstDiff(a[k], b[k], `${at}.${k}`); if (d) return d; }
  return null;
}
function allDiffs(a, b, at = '', out = []) {
  if (out.length > 40) return out;
  if (a === b) return out;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object' || Array.isArray(a) !== Array.isArray(b)) { out.push(at); return out; }
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) allDiffs(a[k], b[k], `${at}.${k}`, out);
  return out;
}

// Every pause the engine can raise is answered. `pick` varies the answers by a counter, so the branches with odds are reached.
function makeStep(e, clubs) {
  return function step(s, ctx) {
    const n = ctx.n++;
    switch (s.phase) {
      case 'youth': return e.advanceYouthYear(s, clubs);
      case 'contract_offer': { const offers = s.pendingOffers || []; return offers.length ? e.acceptOffer(s, offers[n % offers.length]) : { ...s, phase: 'playing' }; }
      case 'playing': return e.advanceProSeason(s, clubs);
      case 'newspaper': return e.dismissNewspaper(s);
      case 'season_summary': return e.dismissSummary(s, clubs);
      case 'international_debut': return e.dismissDebut(s, clubs);
      case 'world_cup': return e.dismissWorldCup(s, clubs);
      case 'rehab_choice': return e.applyRehabChoice(s, n % 3);
      case 'rivalry_event': return e.dismissRivalryEvent(s, clubs);
      case 'ballon_dor': return e.dismissBallonDor(s, clubs);
      case 'bdor_speech': return e.applyBdorSpeech(s, 0, clubs);
      case 'wc_speech': return e.applyWorldCupSpeech(s, 0, clubs);
      case 'moral_dilemma': return s.pendingMoralDilemma ? e.applyMoralDilemmaChoice(s, n % 2) : e.dismissMoralDilemma(s, clubs);
      case 'social_media_action': return e.dismissSocialMediaPhase(s, clubs);
      case 'red_card_appeal_result': return e.dismissAppealResult(s, clubs);
      case 'retirement_suggestion': return ctx.keepPlaying && n % 2 ? e.declineRetirementSuggestion(s, clubs) : e.acceptRetirementSuggestion(s);
      case 'retirement_ceremony': case 'retired': return { ...s, retired: true };
      case 'random_events': {
        const ev = (s.pendingEvents || [])[0];
        if (!ev || !ev.choices || !ev.choices.length) return { ...s, phase: 'playing', pendingEvents: [] };
        return e.applyEventChoice(s, n % ev.choices.length, clubs);
      }
      case 'contract_expiring': case 'transfer_window': {
        const sit = s.transferSituation;
        if (ctx.move && n % 3 === 0 && sit && sit.offer && !sit.offer.isLoan) return e.acceptOffer(s, sit.offer);
        return e.stayAtClub(s);
      }
      default: { const nx = e.advanceProSeason(s, clubs); return nx.phase === s.phase ? { ...nx, retired: true } : nx; }
    }
  };
}
const fails = [];
const notes = [];
const fail = (section, msg) => { fails.push(`[${section}] ${msg}`); if (fails.length <= 60) console.log(`FAIL [${section}] ${msg}`); };
const note = (section, msg) => { notes.push(`[${section}] ${msg}`); console.log(`note [${section}] ${msg}`); };

const BASE = await load('base', BASE_ROOT, RELS);
const HEAD = await load('head', HEAD_ROOT, RELS);
const EB = BASE.soccer, EH = HEAD.soccer, P = HEAD.programme;
if (BASE.programme) note('setup', 'the base tree HAS soccerCareerProgramme.ts: it is not the release line before PR216');
if (!P) { console.log('the head has no programme module'); process.exit(2); }
const clubsB = EB.FALLBACK_CLUBS, clubsH = EH.FALLBACK_CLUBS;
const stepB = makeStep(EB, clubsB), stepH = makeStep(EH, clubsH);
function newCareer(E, clubs, seed) {
  const v = 58 + (seed % 7) * 5;
  return E.initCareer(`Probe ${seed}`, NATIONS[seed % NATIONS.length], POSITIONS[seed % POSITIONS.length], '2020-24', stats(v), v, 2020 + (seed % 4), clubs, null, 80 + (seed % 15));
}
const snapshots = [];   // saves made by the BASE engine, kept for sections B to G
const eventStates = []; // BASE made saves that wait on an event card or a dilemma, for section F
function mkRng(seed) { let x = (seed * 2654435761) >>> 0 || 1; const f = () => { f.count++; x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; f.count = 0; return f; }
const under = (rng, fn) => { Math.random = rng; try { return fn(); } finally { Math.random = realRandom; } };
/** Play both engines from the same save with the same stream; returns the first difference or null. */
function lockstep(startB, startH, seed, ctxSeed, stop, onStep) {
  let b = startB, h = startH;
  const rb = mkRng(seed), rh = mkRng(seed), cb = { n: ctxSeed, keepPlaying: ctxSeed % 2, move: ctxSeed % 3 === 0 }, ch = { ...cb };
  for (let guard = 0; guard < 900; guard++) {
    if (stop(b, guard)) return { b, h, diff: null, steps: guard };
    const phase = b.phase;
    let nb, nh;
    try { nb = under(rb, () => stepB(b, cb)); } catch (err) { return { b, h, diff: `BASE threw at step ${guard} phase ${phase}: ${err.message}`, baseThrew: true, steps: guard }; }
    try { nh = under(rh, () => stepH(h, ch)); } catch (err) { return { b, h, diff: `HEAD threw at step ${guard} phase ${phase}: ${String(err.stack).split('\n').slice(0, 3).join(' | ')}`, steps: guard }; }
    if (rb.count !== rh.count) return { b: nb, h: nh, diff: `draw count differs after step ${guard} (phase ${phase}): base ${rb.count}, head ${rh.count}`, steps: guard };
    const pb = project(nb), ph = project(nh);
    if (JSON.stringify(pb) !== JSON.stringify(ph)) return { b: nb, h: nh, diff: `save differs after step ${guard} (phase ${phase} to ${nb.phase}/${nh.phase}): ${firstDiff(pb, ph)}`, steps: guard };
    if (onStep) onStep(nb, nh, phase);
    b = nb; h = nh;
  }
  return { b, h, diff: null, steps: 900 };
}

{
  // A. A career that chooses no plan: whole saves and the stream, base against head, every step.
  const N = Number(process.env.FLEET || 70), SEASONS = Number(process.env.SEASONS || 15);
  let steps = 0, careers = 0, wheels = 0, openings = 0, seasons = 0, bad = 0, plansSeen = 0, cupRuns = 0, refused = 0;
  const seenCat = new Map();
  const t0 = Date.now();
  for (let seed = 1; seed <= N; seed++) {
    const rInit = mkRng(seed * 7919 + 13), rInit2 = mkRng(seed * 7919 + 13);
    let b, h;
    try { b = under(rInit, () => newCareer(EB, clubsB, seed)); h = under(rInit2, () => newCareer(EH, clubsH, seed)); } catch (err) { fail('A', `initCareer threw for seed ${seed}: ${err.message}`); continue; }
    if (JSON.stringify(b) !== JSON.stringify(h)) { fail('A', `seed ${seed}: a NEW career differs before any step: ${firstDiff(b, h)}`); bad++; continue; }
    let lastWheel = null;
    const res = lockstep(b, h, seed * 104729 + 7, seed, (s) => s.retired || playedRows(s) >= SEASONS, (nb, nh, phase) => {
      steps++;
      if (nh.chanceWheel && JSON.stringify(nh.chanceWheel) !== lastWheel) { wheels++; lastWheel = JSON.stringify(nh.chanceWheel); }
      if (nh.programme !== undefined) plansSeen++;
      const lastRow = [...(nb.seasons || [])].reverse().find(r => r.type === 'playing'), yr = (nb.seasons[nb.seasons.length - 1] || {}).year;
      const cat = `${nb.phase}|${nb.loan ? 'loan' : ''}|${nb.retired ? 'retired' : ''}|${nb.pendingSummary && nb.pendingSummary.cupRun ? 'cup' : ''}|${nb.pendingRehab ? 'rehab' : ''}` + (nb.phase === 'playing' ? `|${nb.isClubCaptain && nb.captainClub === nb.currentClub ? 'capt' : ''}|${lastRow && lastRow.club !== nb.currentClub ? 'moved' : ''}|${(nb.seriousInjuries || []).some(x => x && x.year === yr) ? 'inj' : ''}|${nb.position}` : '');
      const have = seenCat.get(cat) || 0;
      if (have < (nb.phase === 'playing' ? 2 : 4) && (nb.seasons || []).length >= 1) { seenCat.set(cat, have + 1); snapshots.push({ cat, seed, state: copy(nb) }); }
      if ((nb.phase === 'random_events' || (nb.phase === 'moral_dilemma' && nb.pendingMoralDilemma)) && eventStates.length < 160) eventStates.push({ seed, state: copy(nb) });
    });
    careers++;
    seasons += playedRows(res.h);
    for (const row of res.h.seasons || []) if (row.cupRun && row.cupRun.opening) openings++;
    for (const row of res.h.seasons || []) if (row.cupRun) { cupRuns++; if (!HEAD.cup.readCupRun(row)) { refused++; fail('A', `seed ${seed}: the head's own reader refuses the cup run it wrote for ${row.year} at ${row.club}: ${JSON.stringify(row.cupRun).slice(0, 200)}`); } }
    { const loaded = EH.repairCareer(copy(res.h)); for (let i = 0; i < (res.h.seasons || []).length; i++) if (res.h.seasons[i].cupRun && !loaded.seasons[i].cupRun) fail('A', `seed ${seed}: a load dropped the cup run of ${res.h.seasons[i].year}`); }
    if (res.diff) { bad++; fail('A', `seed ${seed} (${POSITIONS[seed % POSITIONS.length]}): ${res.diff}`); }
  }
  console.log(`A: ${careers} careers, ${seasons} played seasons, ${steps} compared steps, ${wheels} wheel receipts and ${openings} opening ties on the head, ${plansSeen} steps held plan state, ${bad} careers differ; ${cupRuns} saved cup runs, ${refused} refused by the head's own reader. ${Math.round((Date.now() - t0) / 1000)} s`);
  console.log(`A: snapshot kinds kept for the later sections: ${[...seenCat.entries()].map(([k, v]) => `${k} x${v}`).join('; ')}`);
  if (plansSeen) fail('A', `plan state appeared on ${plansSeen} steps of careers that chose no plan`);
  if (!wheels || !openings) fail('A', `the fleet met ${wheels} wheels and ${openings} opening ties: the projection was not exercised`);
}

if (want.has('B')) {
  // B. A save made by the base engine: read by every new reader, then played on by BOTH engines with one stream.
  let read = 0, playedOn = 0, bad = 0;
  for (const snap of snapshots) {
    const s = copy(snap.state);
    try {
      const repaired = EH.repairCareer(copy(s));
      P.programmeOptions(repaired); P.programmeEffects(repaired); P.nextProgrammeYear(repaired); P.programmePromiseBroken(repaired);
      HEAD.wheel.validChanceWheel(repaired.chanceWheel); HEAD.wheel.acknowledgeChanceWheel(repaired);
      for (const row of repaired.seasons || []) { const comps = HEAD.cups.savedSeasonCompetitions(repaired, row); HEAD.calendar.cupCalendar(comps, 38); HEAD.cup.readCupRun(row); }
      read++;
    } catch (err) { bad++; fail('B', `a new reader threw on an old save (${snap.cat}, seed ${snap.seed}): ${String(err.stack).split('\n').slice(0, 3).join(' | ')}`); continue; }
    if (s.programme !== undefined || s.chanceWheel !== undefined) fail('B', `a base made save holds a new field (${snap.cat})`);
    const n0 = playedRows(s), rows0 = (s.seasons || []).length, before = JSON.stringify(s.seasons || []);
    const res = lockstep(EB.repairCareer(copy(s)), EH.repairCareer(copy(s)), snap.seed * 31 + 5, snap.seed + 1, (x) => x.retired || playedRows(x) >= n0 + 2);
    if (res.diff && !res.baseThrew) { bad++; fail('B', `old save (${snap.cat}, seed ${snap.seed}) plays differently: ${res.diff}`); continue; }
    if (res.h.programme !== undefined) fail('B', `plan state appeared on an old save that chose none (${snap.cat})`);
    const after = (res.h.seasons || []).slice(0, rows0);
    for (let i = 0; i < after.length; i++) {
      const was = JSON.parse(before)[i];
      if (after[i].programme && !was.programme) fail('B', `old row ${i} gained a plan receipt (${snap.cat})`);
      if (after[i].cupRun && after[i].cupRun.opening && !(was.cupRun && was.cupRun.opening) && i < rows0 - 1) fail('B', `old row ${i} gained an opening tie (${snap.cat})`);
    }
    playedOn++;
  }
  console.log(`B: ${snapshots.length} saves made by the base engine; ${read} read by every new reader; ${playedOn} played two more seasons the same way on both engines; ${bad} bad.`);
}
/** One season on the head from a save in the playing phase: every pause answered until the next playing phase. */
function seasonOnHead(start, seed, ctxSeed, opts = {}) {
  const rng = mkRng(seed), ctx = { n: ctxSeed, keepPlaying: 1, move: false };
  let s = copy(start), first = null;
  const n0 = (s.seasons || []).length;
  for (let guard = 0; guard < 60; guard++) {
    if (guard > 0 && (s.phase === 'playing' || s.retired)) break;
    s = under(rng, () => stepH(s, ctx));
    if (!first && (s.seasons || []).length > n0) first = copy(s);
    if (opts.roundtrip) s = copy(s);
  }
  return { state: s, first, draws: rng.count, rows: (s.seasons || []).slice(n0) };
}
let cardOnPlainToo = 0; const cardExamples = [];
/** A reload at every step against none. A card dealt behind a random gate answers differently after a reload on the base too
 *  (Round 667 and 725), so a difference is the plan's only when the plan fields or the season itself differ, or when the no plan arm holds. */
function reloadVerdict(a, b, plainOf, plainReloadedOf) {
  if (JSON.stringify(a.state) === JSON.stringify(b.state) && a.draws === b.draws) return 'same';
  const planOf = st => JSON.stringify([st.programme, (st.seasons || []).map(r => r.programme || null)]);
  if (JSON.stringify(a.first) !== JSON.stringify(b.first)) return `a reload changed the season itself: ${firstDiff(a.first, b.first)}`;
  if (planOf(a.state) !== planOf(b.state)) return `a reload changed the plan fields: ${firstDiff(JSON.parse(planOf(a.state)), JSON.parse(planOf(b.state)))}`;
  const p = plainOf(), pr = plainReloadedOf();
  if (JSON.stringify(p.state) !== JSON.stringify(pr.state)) cardOnPlainToo++;
  if (cardExamples.length < 4) cardExamples.push(firstDiff(a.state, b.state));
  return 'card';
}
const playingSaves = () => snapshots.filter(x => x.state.phase === 'playing' && !x.state.retired && playedRows(x.state) >= 1).map(x => ({ ...x, state: EH.repairCareer(copy(x.state)) }));
const receiptsOf = s => (s.programme && Array.isArray(s.programme.receipts) ? s.programme.receipts : []);

if (want.has('C')) {
  // C. Each plan: chosen once, settled once, a reload at every step changes nothing, and the effect the card states.
  const flags = x => x.cat.split('|').slice(1, 8).filter(Boolean).length;
  const saves = playingSaves().sort((x, y) => flags(y) - flags(x)).slice(0, Number(process.env.C_SAVES || 18));
  const SEEDS = Number(process.env.PLAN_SEEDS || 5);
  const agg = {};
  let arms = 0, reloadEqual = 0, settledOnce = 0, cancels = 0, emptyReceipts = 0, cardReload = 0, bonusPaid = 0, unrounded = 0, roundedLater = 0;
  const add = (key, a, b) => { const x = agg[key] || (agg[key] = { n: 0, base: 0, plan: 0 }); x.n++; x.base += a; x.plan += b; };
  for (const snap of saves) {
    const s = snap.state, year = P.nextProgrammeYear(s);
    const views = P.programmeOptions(s);
    for (const view of views) for (const choice of view.choices) {
      const chosen = P.chooseProgramme(s, view.id, choice.id);
      if (!choice.eligible) { if (chosen !== s) fail('C', `an ineligible choice was applied: ${view.id}/${choice.id} (${choice.reason})`); continue; }
      if (view.id === 'negotiation') continue;
      if (chosen === s) { fail('C', `an eligible choice did nothing: ${view.id}/${choice.id}`); continue; }
      if (P.chooseProgramme(chosen, view.id, choice.id) !== chosen) fail('C', `choosing ${view.id}/${choice.id} twice made a new save`);
      // chosen then cancelled: the season is the no plan season but for the plan fields
      const cancelled = P.cancelProgramme(chosen, view.id);
      const seed0 = snap.seed * 977 + 3;
      const zero = seasonOnHead(s, seed0, snap.seed), can = seasonOnHead(cancelled, seed0, snap.seed);
      const dc = allDiffs(zero.state, can.state).filter(p => !/^\.programme|\.programme(\.|$)/.test(p));
      if (dc.length || zero.draws !== can.draws) fail('C', `chosen then cancelled (${view.id}/${choice.id}) is not the no plan season: draws ${zero.draws}/${can.draws}, ${dc.slice(0, 4).join(', ')}`);
      else cancels++;
      if (can.rows.some(r => r.programme)) emptyReceipts++;
      if (can.rows.some(r => r.programme) && emptyReceipts === 1) note('C', `a cancelled plan still left a receipt on the row (${view.id}/${choice.id}): ${JSON.stringify(can.rows.find(r => r.programme).programme).slice(0, 160)}`);
      for (let k = 0; k < SEEDS; k++) {
        const seed = snap.seed * 977 + 3 + k * 131;
        const plain = k === 0 ? zero : seasonOnHead(s, seed, snap.seed);
        const a = seasonOnHead(chosen, seed, snap.seed), b = seasonOnHead(chosen, seed, snap.seed, { roundtrip: true });
        arms++;
        { const verdict = reloadVerdict(a, b, () => plain, () => seasonOnHead(s, seed, snap.seed, { roundtrip: true })); if (verdict === 'same') reloadEqual++; else if (verdict === 'card') cardReload++; else fail('C', `${view.id}/${choice.id}: ${verdict}`); }
        const mine = receiptsOf(a.state).filter(r => r.year === year);
        const row = a.rows.find(r => r.year === year);
        if (mine.length > 1) fail('C', `${view.id}/${choice.id}: ${mine.length} receipts for ${year}`);
        if (a.state.programme && a.state.programme.plan && a.state.programme.plan.year === year) fail('C', `${view.id}/${choice.id}: the plan for ${year} is still held after ${year} was recorded`);
        if (mine.length === 1 && row) {
          settledOnce++;
          if (JSON.stringify(row.programme) !== JSON.stringify(mine[0])) fail('C', `${view.id}/${choice.id}: the row's receipt and the save's differ: ${firstDiff(row.programme, mine[0])}`);
          if (mine[0].club !== s.currentClub) fail('C', `${view.id}/${choice.id}: the receipt names ${mine[0].club}, the plan was made at ${s.currentClub}`);
          // settle again and interrupt again on the save as it stood right after the season: nothing may move
          if (a.first) { const again = copy(a.first), was = JSON.stringify(again); const last = again.seasons[again.seasons.length - 1]; P.settleSoccerProgramme(again, last); P.interruptSoccerProgramme(again, last); if (JSON.stringify(again) !== was) fail('C', `${view.id}/${choice.id}: settling a second time changed the save: ${firstDiff(JSON.parse(was), again)}`); }
        } else if (row && row.club === s.currentClub) fail('C', `${view.id}/${choice.id}: ${year} was recorded at ${row.club} with no receipt (${mine.length})`);
        const r0 = plain.rows.find(r => r.year === year);
        if (row && r0 && row.club === r0.club && row.apps > 0 && r0.apps > 0) {
          const key = `${view.id}/${choice.id}`;
          add(`${key} apps`, r0.apps, row.apps); add(`${key} leagueApps`, r0.leagueApps || 0, row.leagueApps || 0); add(`${key} goals`, r0.goals, row.goals); add(`${key} assists`, r0.assists, row.assists);
          add(`${key} cleanSheets`, r0.cleanSheets, row.cleanSheets); add(`${key} yellow`, r0.yellowCards, row.yellowCards); add(`${key} injured`, r0.injury ? 1 : 0, row.injury ? 1 : 0);
        }
        if (view.id === 'bonuses' && a.first && plain.first) {
          const d = allDiffs(plain.first, a.first).filter(p => !/programme/.test(p));
          const paid = mine[0] ? mine[0].bonusEuros : 0;
          const extra = d.filter(p => p !== '.netWorth' && p !== '.totalEarnings');
          if (extra.length || plain.draws !== a.draws) fail('C', `a bonus clause changed more than the money: draws ${plain.draws}/${a.draws}, ${extra.slice(0, 5).join(', ')}`);
          const gain = a.first.netWorth - plain.first.netWorth, earned = a.first.totalEarnings - plain.first.totalEarnings;
          if (paid > 0) { bonusPaid++; if (!Number.isInteger(Math.round(a.first.netWorth * 1e6) / 1e4)) unrounded++; }
          const endGain = a.state.netWorth - plain.state.netWorth; if (paid > 0 && Math.abs(endGain - paid / 1e6) > 1e-9) roundedLater++;
          if (Math.abs(gain - paid / 1e6) > 1e-9 || Math.abs(earned - paid / 1e6) > 1e-9) fail('C', `bonus ${choice.id}: receipt says EUR ${paid}, net worth moved by ${gain} M`);
          if (paid > 0 && row) { const met = choice.id === 'appearances' ? row.leagueApps >= 24 : choice.id === 'goals' ? row.goals >= 15 : row.assists >= 10; if (!met) fail('C', `bonus ${choice.id} paid EUR ${paid} on ${row.leagueApps} league games, ${row.goals} goals, ${row.assists} assists`); }
          add(`bonuses/${choice.id} paidShare`, 1, paid > 0 ? 1 : 0);
        }
        if (view.id === 'promise' && mine[0] && row) {
          const target = choice.id === 'starter' ? 26 : 18, v = mine[0].promise;
          if ((v === 'met') !== (row.leagueApps >= target)) fail('C', `promise ${choice.id}: verdict ${v} on ${row.leagueApps} league games`);
          if (v === 'broken' && (row.injury || row.suspensionMatches > 0)) fail('C', `promise ${choice.id}: broken in a year with ${row.injury || 'a ban'}`);
          add(`promise/${choice.id} ${v}`, 1, 1);
        }
      }
    }
  }
  console.log(`C: ${saves.length} saves in the playing phase, ${arms} planned seasons; ${reloadEqual} equal under a reload at every step (${cardReload} more differ only after an event card whose reload differs with NO plan too, plan fields equal); ${settledOnce} settled exactly once and unmoved by a second settle; ${cancels} chosen then cancelled seasons equal the no plan season, ${emptyReceipts} of them still wrote an empty receipt on the row.`);
  console.log(`C: of the seasons that differ only after the season and outside the plan fields, ${cardOnPlainToo} differ under a reload with NO plan on the same stream too. Examples: ${cardExamples.join(' || ')}`);
  console.log(`C: ${bonusPaid} bonuses paid; right after the season net worth and total earnings moved by exactly the receipt's sum every time; ${unrounded} of those left net worth off the game's two decimals; by the next season start the gain differed from the receipt's sum ${roundedLater} times (later money steps round).`);
  for (const [key, x] of Object.entries(agg).sort()) console.log(`C effect ${key}: n ${x.n}, no plan ${x.base}, plan ${x.plan}, ratio ${(x.plan / Math.max(1e-9, x.base)).toFixed(3)}`);
}
if (want.has('D')) {
  // D. A promise of games beside the base's own selection systems: a reduced role, a ban, form.
  const saves = playingSaves().filter(x => !x.state.loan).slice(0, Number(process.env.D_SAVES || 14));
  const SEEDS = Number(process.env.D_SEEDS || 40);
  const tally = {};
  const bump = (arm, key, n = 1) => { const x = tally[arm] || (tally[arm] = {}); x[key] = (x[key] || 0) + n; };
  let maxApps = { plain: 0, loaded: 0 }, over60 = { plain: 0, loaded: 0 }, rowsSeen = 0;
  for (const snap of saves) {
    const s = snap.state, year = P.nextProgrammeYear(s);
    const starter = P.chooseProgramme(s, 'promise', 'starter');
    if (starter === s) { note('D', `no starter promise on offer for seed ${snap.seed} (${s.position}, ${s.currentClub})`); continue; }
    let loaded = starter;
    for (const [id, c] of [['captain', 'rally'], ['adaptation', 'integrate'], ['fitness', 'full']]) loaded = P.chooseProgramme(loaded, id, c);
    const arms = {
      plain: s, starter, role: { ...s, reducedRole: { club: s.currentClub, year } }, starterRole: { ...starter, reducedRole: { club: s.currentClub, year } },
      starterRoleBan: { ...starter, reducedRole: { club: s.currentClub, year }, pendingSuspensionMatches: 5 }, loaded,
    };
    for (let k = 0; k < SEEDS; k++) for (const [arm, start] of Object.entries(arms)) {
      let out;
      try { out = seasonOnHead(start, snap.seed * 613 + k * 17 + 1, snap.seed); } catch (err) { fail('D', `${arm} threw: ${String(err.stack).split('\n').slice(0, 3).join(' | ')}`); continue; }
      const row = out.rows.find(r => r.year === year);
      if (!row || row.club !== s.currentClub) { bump(arm, 'no row at the club'); continue; }
      rowsSeen++;
      bump(arm, 'rows');
      if (!(row.apps >= 0) || !Number.isInteger(row.apps)) fail('D', `${arm}: apps ${row.apps}`);
      if (row.leagueApps !== undefined && (!(row.leagueApps >= 0) || row.leagueApps > 38 || !Number.isInteger(row.leagueApps))) fail('D', `${arm}: league apps ${row.leagueApps}`);
      if (row.leagueApps > row.apps) bump(arm, 'league games above all games');
      if (arm === 'plain' || arm === 'loaded') { maxApps[arm] = Math.max(maxApps[arm], row.apps); if (row.apps > 60) over60[arm]++; }
      bump(arm, 'leagueAppsSum', row.leagueApps || 0); bump(arm, 'appsSum', row.apps);
      const rec = row.programme;
      if (rec && rec.promise) bump(arm, `promise ${rec.promise}`);
      if (rec && rec.promise === 'broken' && row.reducedRole && row.reducedRole.outcome === 'served') bump(arm, 'promise broken in a served reduced role year');
      if (rec && rec.promise === 'met' && row.reducedRole && row.reducedRole.outcome === 'served') bump(arm, 'promise met in a served reduced role year');
      if (start.reducedRole && !row.reducedRole) bump(arm, 'reduced role not written on the row');
    }
  }
  console.log(`D: ${saves.length} saves, ${rowsSeen} seasons at the planned club.`);
  for (const [arm, x] of Object.entries(tally)) console.log(`D ${arm}: ${Object.entries(x).map(([k, v]) => `${k} ${v}`).join('; ')}`);
  console.log(`D apps: the most in a season, no plan ${maxApps.plain}, every games plan at once ${maxApps.loaded}; seasons above 60 games: ${over60.plain} against ${over60.loaded}`);
}
const BAD = [null, 5, 'x', {}, [], -1, 1.5, true];
const getAt = (o, p) => p.reduce((v, k) => (v == null ? undefined : v[k]), o);
function setAt(o, p, value) { const c = copy(o); let v = c; for (let i = 0; i < p.length - 1; i++) v = v[p[i]]; v[p[p.length - 1]] = value; return c; }
function pathsUnder(o, root, out = []) { const v = getAt(o, root); if (v === undefined) return out; out.push(root); if (v && typeof v === 'object') for (const k of Object.keys(v)) pathsUnder(o, [...root, k], out); return out; }
function chooseAll(s, wanted) { let c = s; for (const [id, choices] of wanted) for (const ch of choices) { const n = P.chooseProgramme(c, id, ch); if (n !== c) { c = n; break; } } return c; }
const WANTED = [['tactics', ['finisher', 'cover']], ['promise', ['starter']], ['bonuses', ['goals', 'appearances']], ['set_pieces', ['penalties']], ['position', ['CM', 'CAM', 'RB', 'LB', 'RW', 'LW', 'ST', 'CB', 'CDM']], ['captain', ['calm']], ['adaptation', ['settle']], ['fitness', ['managed']]];
function readers(d) {
  P.programmeOptions(d); P.programmeEffects(d); P.nextProgrammeYear(d); P.programmePromiseBroken(d);
  P.chooseProgramme(d, 'tactics', 'creator'); P.cancelProgramme(d, 'tactics'); P.chooseProgramme(d, 'negotiation', 'wage');
  HEAD.wheel.validChanceWheel(d.chanceWheel); HEAD.wheel.acknowledgeChanceWheel(d);
  for (const row of (d.seasons || []).slice(-3)) { const comps = HEAD.cups.savedSeasonCompetitions(d, row); HEAD.calendar.cupCalendar(comps, 38); HEAD.cup.readCupRun(row); }
}
function richSave(snap) {
  const first = chooseAll(snap.state, WANTED);
  if (first === snap.state) return null;
  const one = seasonOnHead(first, snap.seed * 409 + 11, snap.seed).state;
  if (one.retired || one.phase !== 'playing' || !receiptsOf(one).length) return null;
  const again = chooseAll(one, WANTED);
  if (!again.programme || !again.programme.plan) return null;
  const year = P.nextProgrammeYear(again);
  const rich = copy(again);
  rich.programme.negotiated = [{ year, club: 'Probe Town', mode: 'wage', accepted: true }];
  rich.chanceWheel = { title: 'Probe', chance: 0.3, roll: 0.5, hit: 'Hit', miss: 'Miss', result: false, seen: false };
  return rich;
}

if (want.has('E')) {
  // E. Every new optional field damaged one at a time: no reader throws, a season plays, and the damage has no effect.
  const riches = [];
  for (const snap of playingSaves()) { if (riches.length >= Number(process.env.E_SAVES || 4)) break; let r = null; try { r = richSave(snap); } catch (err) { fail('E', `building a planned save threw: ${err.message}`); } if (r && (r.seasons || []).slice(-2).some(row => row.cupRun && row.cupRun.opening)) riches.push({ snap, rich: r }); }
  if (!riches.length) fail('E', 'no save with a plan, a receipt and an opening tie could be built');
  let cases = 0, readerThrew = 0, engineThrew = 0, asValid = 0, asAbsent = 0, other = 0, hidesRun = 0, openingCases = 0, runDeleted = 0, deletedOnLoad = 0;
  const ignored = new Set();
  const others = [];
  for (const { snap, rich } of riches) {
    const seed = snap.seed * 733 + 9, n = rich.seasons.length;
    const strip = st => { const c = copy(st); delete c.programme; delete c.chanceWheel; for (const row of c.seasons || []) { delete row.programme; } if (c.pendingSummary) delete c.pendingSummary.programme; return c; };
    const valid = seasonOnHead(rich, seed, snap.seed), noPlan = copy(rich); delete noPlan.programme;
    const absent = seasonOnHead(noPlan, seed, snap.seed);
    const V = JSON.stringify(strip(valid.state)), A = JSON.stringify(strip(absent.state));
    if (V === A) note('E', `seed ${snap.seed}: the planned season equals the no plan season, so "as valid" and "as absent" cannot be told apart here`);
    const roots = [['programme'], ['chanceWheel']];
    for (const i of [n - 1, n - 2]) if (i >= 0) { roots.push(['seasons', i, 'programme']); roots.push(['seasons', i, 'cupRun', 'opening']); }
    let paths = [];
    for (const root of roots) paths = paths.concat(pathsUnder(rich, root));
    paths = paths.filter(p => !(p[0] === 'programme' && p[1] === 'receipts' && typeof p[2] === 'string' && Number(p[2]) < rich.programme.receipts.length - 1));
    for (const p of paths) for (const bad of BAD) {
      if (JSON.stringify(getAt(rich, p)) === JSON.stringify(bad)) continue;
      const d = setAt(rich, p, bad), label = `${p.join('.')} = ${JSON.stringify(bad)}`;
      cases++;
      try { readers(d); } catch (err) { readerThrew++; fail('E', `a reader threw on ${label}: ${String(err.stack).split('\n').slice(0, 2).join(' | ')}`); }
      if (p.includes('opening')) { openingCases++; const row = d.seasons[p[1]]; if (HEAD.cup.readCupRun(rich.seasons[p[1]]) && !HEAD.cup.readCupRun(row)) hidesRun++; }
      let out;
      try { out = seasonOnHead(d, seed, snap.seed); } catch (err) { engineThrew++; fail('E', `the season threw on ${label}: ${String(err.stack).split('\n').slice(0, 3).join(' | ')}`); continue; }
      const D = strip(out.state);
      if (p.includes('opening')) { const row = D.seasons[p[1]], good = JSON.parse(V).seasons[p[1]].cupRun; if (!row.cupRun) { runDeleted++; if (EH.repairCareer(copy(d)).seasons[p[1]].cupRun === undefined) deletedOnLoad++; row.cupRun = good; const keys = Object.keys(row); const order = Object.keys(JSON.parse(V).seasons[p[1]]); const sorted = {}; for (const k of order) if (k in row) sorted[k] = row[k]; for (const k of keys) if (!(k in sorted)) sorted[k] = row[k]; D.seasons[p[1]] = sorted; } else row.cupRun.opening = good.opening; }
      const S = JSON.stringify(D);
      if (S === V) { asValid++; if (p[0] === 'programme') ignored.add(p.map(k => (/^d+$/.test(String(k)) ? '#' : k)).join('.')); } else if (S === A) asAbsent++; else { other++; if (others.length < 30) others.push(`${label}: vs valid ${firstDiff(JSON.parse(V), D)}`); }
    }
    // an OLD field the new code reads every season once a plan exists
    for (const bad of [[null], 5, 'x', {}]) {
      const d = { ...copy(rich), seriousInjuries: bad }, label = `seriousInjuries = ${JSON.stringify(bad)}`;
      let withPlan = 'ok', withoutPlan = 'ok', onBase = 'ok';
      try { seasonOnHead(d, seed, snap.seed); } catch (err) { withPlan = `THREW ${err.message}`; }
      const np = copy(d); delete np.programme; delete np.chanceWheel;
      try { seasonOnHead(np, seed, snap.seed); } catch (err) { withoutPlan = `THREW ${err.message}`; }
      try { const rng = mkRng(seed), ctx = { n: snap.seed, keepPlaying: 1, move: false }; let s = copy(np); for (let g = 0; g < 60; g++) { if (g > 0 && (s.phase === 'playing' || s.retired)) break; s = under(rng, () => stepB(s, ctx)); } } catch (err) { onBase = `THREW ${err.message}`; }
      note('E', `old field ${label}: head with a plan ${withPlan}; head with no plan ${withoutPlan}; base ${onBase}`);
    }
  }
  console.log(`E: ${riches.length} planned saves, ${cases} damaged saves: ${readerThrew} made a reader throw, ${engineThrew} made the season throw; the season equals the undamaged one ${asValid} times, the no plan one ${asAbsent} times, something else ${other} times.`);
  console.log(`E: ${openingCases} damaged opening ties, ${hidesRun} of them make the WHOLE cup run unreadable (readCupRun null) where the undamaged row reads.`);
  console.log(`E: ${runDeleted} of those seasons END with the row's whole cupRun deleted from the save (${deletedOnLoad} of them by repairCareer on load alone).`);
  console.log(`E: plan paths whose damage left the planned season exactly as it was (read as valid or not read): ${[...ignored].join(', ') || 'none'}`);
  for (const line of others) console.log(`E other: ${line}`);
}
if (want.has('F')) {
  // F. The wheel: every answer of every waiting card, base against head on one stream; the receipt IS the draw.
  let answers = 0, receipts = 0, same = 0, hit = 0, staleUnseen = 0;
  const titles = new Set();
  for (const ev of eventStates) {
    const s = ev.state, dilemma = s.phase === 'moral_dilemma';
    const count = dilemma ? 3 : ((s.pendingEvents || [])[0]?.choices || []).length;
    for (let idx = 0; idx < count; idx++) for (let k = 0; k < 3; k++) {
      const seed = ev.seed * 59 + idx * 7 + k * 1009 + 1, rb = mkRng(seed), rh = mkRng(seed);
      let b, h;
      try { b = under(rb, () => dilemma ? EB.applyMoralDilemmaChoice(copy(s), idx) : EB.applyEventChoice(EB.repairCareer(copy(s)), idx, clubsB)); } catch { continue; }
      try { h = under(rh, () => dilemma ? EH.applyMoralDilemmaChoice(copy(s), idx) : EH.applyEventChoice(EH.repairCareer(copy(s)), idx, clubsH)); } catch (err) { fail('F', `the head threw on an answer the base takes: ${err.message}`); continue; }
      answers++;
      if (rb.count !== rh.count || JSON.stringify(project(b)) !== JSON.stringify(project(h))) { fail('F', `answer ${idx} of ${dilemma ? s.pendingMoralDilemma.id : s.pendingEvents[0].title}: draws ${rb.count}/${rh.count}, ${firstDiff(project(b), project(h))}`); continue; }
      same++;
      const w = h.chanceWheel;
      if (!w || JSON.stringify(w) === JSON.stringify(s.chanceWheel)) { if (w && !w.seen) staleUnseen++; continue; }
      receipts++; titles.add(w.title);
      if (!HEAD.wheel.validChanceWheel(w)) fail('F', `a fresh receipt is not valid: ${JSON.stringify(w)}`);
      if (w.seen !== false) fail('F', `a fresh receipt is already seen`);
      if (w.result) hit++;
      // the roll kept is one of the draws this answer made, and the result is that roll against the stated chance
      const replay = mkRng(seed), seenDraws = []; for (let i = 0; i < rh.count; i++) seenDraws.push(replay());
      if (!seenDraws.includes(w.roll)) fail('F', `the receipt's roll ${w.roll} is not a draw of this answer (${w.title})`);
      if (w.result !== (w.roll < w.chance)) fail('F', `result ${w.result} against roll ${w.roll} and chance ${w.chance}`);
      // a reload and the reveal: nothing but "seen" may move, and a second reveal moves nothing
      const reloaded = EH.repairCareer(copy(h));
      if (JSON.stringify(reloaded.chanceWheel) !== JSON.stringify(w)) fail('F', `a reload changed the receipt (${w.title})`);
      const ack = HEAD.wheel.acknowledgeChanceWheel(reloaded), d = allDiffs(reloaded, ack);
      if (d.length !== 1 || d[0] !== '.chanceWheel.seen') fail('F', `the reveal changed ${d.join(', ')}`);
      if (HEAD.wheel.acknowledgeChanceWheel(ack) !== ack) fail('F', 'a second reveal made a new save');
      // the same card cannot be answered again from the saved result
      if (!dilemma && (h.pendingEvents || []).length >= s.pendingEvents.length) fail('F', `the answered card is still waiting (${w.title})`);
      if (dilemma && h.pendingMoralDilemma) fail('F', `the answered dilemma is still waiting (${w.title})`);
    }
  }
  console.log(`F: ${eventStates.length} saves waiting on a card or a dilemma, ${answers} answers on both engines, ${same} the same save and stream; ${receipts} receipts (${hit} hits), ${titles.size} different wheels: ${[...titles].slice(0, 40).join(' / ')}`);
  if (!receipts) fail('F', 'no wheel receipt was produced: the section tested nothing');
}

if (want.has('G')) {
  // G. Loan to buy at the loan return boundary, beside the base's loan return.
  const saves = playingSaves().filter(x => !x.state.loan && playedRows(x.state) >= 1).slice(0, Number(process.env.G_SAVES || 8));
  let loans = 0, bought = 0, returned = 0, interrupted = 0, reloadSame = 0, nextSeason = 0, noLine = 0, damaged = 0;
  for (const snap of saves) {
    const s = snap.state;
    const club = clubsH.find(c => c.name !== s.currentClub && c.tier >= Math.min(4, s.currentClubTier + 1)) || clubsH.find(c => c.name !== s.currentClub);
    let onLoan;
    try { onLoan = under(mkRng(snap.seed + 3), () => EH.acceptLoan({ ...copy(s), phase: 'transfer_window' }, { club, contractYears: 1, wage: s.weeklyWage, transferFee: 0, isLoan: true })); } catch (err) { fail('G', `acceptLoan threw: ${err.message}`); continue; }
    if (!onLoan.loan) { note('G', `acceptLoan left no loan for seed ${snap.seed} (phase ${onLoan.phase})`); continue; }
    if (onLoan.phase !== 'playing') onLoan = { ...onLoan, phase: 'playing', transferSituation: null };
    loans++;
    const view = P.programmeOptions(onLoan).find(v => v.id === 'loan'), choice = view && view.choices[0];
    if (!choice || !choice.eligible) { fail('G', `a player on loan cannot arrange the option: ${choice && choice.reason}`); continue; }
    const plan = P.chooseProgramme(onLoan, 'loan', 'buy'), year = P.nextProgrammeYear(onLoan), parent = onLoan.loan.parentClub, wage = onLoan.weeklyWage;
    for (let k = 0; k < Number(process.env.G_SEEDS || 12); k++) {
      const seed = snap.seed * 271 + k * 37 + 5;
      const a = seasonOnHead(plan, seed, snap.seed), b = seasonOnHead(plan, seed, snap.seed, { roundtrip: true }), zero = seasonOnHead(onLoan, seed, snap.seed);
      { const verdict = reloadVerdict(a, b, () => zero, () => seasonOnHead(onLoan, seed, snap.seed, { roundtrip: true })); if (verdict === 'same' || verdict === 'card') reloadSame++; else fail('G', verdict); }
      const row = a.rows.find(r => r.year === year), after = a.first || a.state;
      if (!row) continue;
      const done = !after.loan && after.currentClub === club.name;
      if (done) {
        bought++;
        if (row.apps === 0 || row.injurySevere) fail('G', `the deal completed on an interrupted year (${row.apps} games, ${row.injury})`);
        if (after.contractYearsLeft !== 2) fail('G', `contract years after the deal: ${after.contractYearsLeft}`);
        if (after.weeklyWage !== wage) fail('G', `the wage moved with the deal: ${wage} to ${after.weeklyWage}`);
        if (after.currentClubCountry !== club.country) fail('G', `country after the deal: ${after.currentClubCountry} for ${club.name} (${club.country})`);
        if (after.programme && after.programme.loanBuy) fail('G', 'the option is still held after the deal');
        if (!(row.programme && row.programme.outcomes && /permanent/.test(row.programme.outcomes.loan || ''))) fail('G', `the row's receipt does not say the move became permanent: ${JSON.stringify(row.programme && row.programme.outcomes)}`);
        const lines = (after.events || []).filter(e => /permanent|Loan over|signed/i.test(e));
        if (!lines.some(e => /permanent/i.test(e))) noLine++;
        if ((after.events || []).some(e => /Loan over/.test(e))) fail('G', 'the season log says the loan is over AND the deal completed');
        if (zero.first && zero.first.currentClub !== parent && !zero.first.loan) fail('G', `with no plan the same season did not go back to ${parent}: ${zero.first.currentClub}`);
        try { const more = seasonOnHead(a.state, seed + 1, snap.seed); if (more.rows.length && more.rows[0].club === club.name) nextSeason++; else if (!a.state.retired && a.state.phase === 'playing') note('G', `after the deal the next row is at ${more.rows[0] && more.rows[0].club}`); } catch (err) { fail('G', `the season after the deal threw: ${err.message}`); }
      } else if (after.loan) { interrupted++; if (after.programme && after.programme.loanBuy) note('G', `still on loan after ${year} (${row.injury || 'no injury'}), option kept: ${JSON.stringify(after.programme.loanBuy)}`); }
      else { returned++; if (!(row.apps === 0 || row.injurySevere)) note('G', `a played loan year (${row.apps} games, club ${row.club}) with the option arranged went back to ${after.currentClub}`); }
    }
    // the option's own fields, damaged one at a time
    for (const p of pathsUnder(plan, ['programme', 'loanBuy'])) for (const bad of BAD) {
      if (JSON.stringify(getAt(plan, p)) === JSON.stringify(bad)) continue;
      damaged++;
      try { const d = setAt(plan, p, bad); readers(d); seasonOnHead(d, snap.seed * 271 + 5, snap.seed); } catch (err) { fail('G', `damaged ${p.join('.')} = ${JSON.stringify(bad)} threw: ${String(err.stack).split('\n').slice(0, 2).join(' | ')}`); }
    }
  }
  console.log(`G: ${loans} loans, option arranged; ${bought} deals completed, ${returned} went back to the parent, ${interrupted} still on loan after the year; ${reloadSame} seasons equal under a reload at every step; ${nextSeason} next seasons played at the bought club; ${noLine} completed deals left no line in the season log; ${damaged} damaged option fields played.`);
}

if (want.has('H')) {
  // H. The seams the plan's own words name: a club move, repeated presses, a ban year, a loan away, an invalid plan.
  const saves = playingSaves().filter(x => !x.state.loan);
  const YEAR_OUT = ['BANNED', 'BANNED (PED)', 'PRISON', 'CONVICTED'];
  let moves = 0, moveNeutral = 0, moveReceipt = 0, presses = 0, oneYearLearned = 0, twoYear = 0, twoYearLearned = 0, gapLearned = 0, gaps = 0;
  let loanAway = 0, loanLost = 0, locked = 0, lockedAfterSeason = 0, banReturns = 0, banAdaptation = 0, baseReload = 0, baseReloadDiff = 0;
  for (const snap of saves.slice(0, Number(process.env.H_SAVES || 30))) {
    const s = snap.state, seed = snap.seed * 389 + 1, year = P.nextProgrammeYear(s);
    // 1. a plan, then a permanent move before the season: the season must be the moved season with no plan
    const planned = chooseAll(s, WANTED);
    if (planned !== s) {
      const club = clubsH.find(c => c.name !== s.currentClub && c.tier === s.currentClubTier) || clubsH.find(c => c.name !== s.currentClub);
      const offer = { club, contractYears: 3, wage: s.weeklyWage, transferFee: 0 };
      let m0, m1;
      try { m0 = under(mkRng(seed), () => EH.acceptOffer({ ...copy(s), phase: 'transfer_window' }, offer)); m1 = under(mkRng(seed), () => EH.acceptOffer({ ...copy(planned), phase: 'transfer_window' }, offer)); } catch (err) { fail('H', `acceptOffer threw: ${err.message}`); }
      if (m0 && m1 && m0.currentClub === club.name) {
        m0 = { ...m0, phase: 'playing', transferSituation: null }; m1 = { ...m1, phase: 'playing', transferSituation: null };
        moves++;
        const fx = P.programmeEffects(m1);
        if (Object.values(fx).some((v, i) => v !== (i === 1 ? 0 : 1))) fail('H', `a plan made at ${s.currentClub} still has effects at ${club.name}: ${JSON.stringify(fx)}`);
        const a = seasonOnHead(m0, seed, snap.seed), b = seasonOnHead(m1, seed, snap.seed);
        const d = allDiffs(a.state, b.state).filter(p => !/^\.programme/.test(p));
        if (!d.length && a.draws === b.draws) moveNeutral++; else fail('H', `after a move the planned season differs from the no plan one: draws ${a.draws}/${b.draws}, ${d.slice(0, 4).join(', ')}`);
        if (receiptsOf(b.state).some(r => r.year === year) || b.rows.some(r => r.programme)) { moveReceipt++; fail('H', `a plan made at ${s.currentClub} was settled at ${club.name}: ${JSON.stringify(b.rows.find(r => r.programme)?.programme).slice(0, 200)}`); }
        if (b.state.programme && b.state.programme.plan) fail('H', `the old club's plan is still held a season after the move: ${JSON.stringify(b.state.programme.plan)}`);
      }
    }
    // 2. the second position: pressed many times, one played season is one season; two in a row learn it; a gap starts again
    const pos = P.programmeOptions(s).find(v => v.id === 'position'), target = pos && pos.choices.find(c => c.eligible);
    if (target) {
      let c = s;
      for (let i = 0; i < 6; i++) { c = P.chooseProgramme(c, 'position', target.id); c = P.cancelProgramme(c, 'position'); }
      c = P.chooseProgramme(c, 'position', target.id);
      for (let i = 0; i < 4; i++) c = P.chooseProgramme(c, 'position', target.id);
      presses++;
      const y1 = seasonOnHead(c, seed + 1, snap.seed), r1 = y1.rows.find(r => r.year === year);
      if (y1.state.programme && y1.state.programme.secondaryPosition) { oneYearLearned++; fail('H', `the second position was learned after ONE season of presses: ${JSON.stringify(y1.state.programme.secondaryPosition)}`); }
      const okYear = r1 && r1.apps > 0 && !r1.injurySevere && r1.club === s.currentClub && y1.state.phase === 'playing' && !y1.state.retired && y1.state.currentClub === s.currentClub && y1.state.position === s.position;
      if (okYear) {
        const again = P.chooseProgramme(y1.state, 'position', target.id);
        if (again !== y1.state) {
          const y2 = seasonOnHead(again, seed + 2, snap.seed), r2 = y2.rows.find(r => r.year === year + 1);
          if (r2 && r2.apps > 0 && !r2.injurySevere && r2.club === s.currentClub) { twoYear++; if (y2.first && y2.first.programme && y2.first.programme.secondaryPosition) twoYearLearned++; else fail('H', `two played training seasons in a row did not teach ${target.id}: ${JSON.stringify(y2.first && y2.first.programme && y2.first.programme.secondaryTraining)}`); }
        }
        // a year with no training in between, then training again: the count must start at one
        const idle = seasonOnHead(y1.state, seed + 3, snap.seed);
        if (idle.state.phase === 'playing' && !idle.state.retired && idle.state.currentClub === s.currentClub && idle.state.position === s.position) {
          const late = P.chooseProgramme(idle.state, 'position', target.id);
          if (late !== idle.state) { const y3 = seasonOnHead(late, seed + 4, snap.seed); gaps++; if (y3.first && y3.first.programme && y3.first.programme.secondaryPosition) { gapLearned++; fail('H', 'a second position was learned across a year without training'); } }
        }
      }
      // a learned second position, then a year on loan: is it still there back home?
      const learned = copy(s); learned.programme = { version: 1, receipts: [], secondaryPosition: { club: s.currentClub, primary: s.position, position: target.id } };
      if (P.programmeEffects(learned).appsMult === 1.03) {
        const away = clubsH.find(c2 => c2.name !== s.currentClub && c2.tier >= s.currentClubTier) || clubsH.find(c2 => c2.name !== s.currentClub);
        try {
          let l = under(mkRng(seed), () => EH.acceptLoan({ ...learned, phase: 'transfer_window' }, { club: away, contractYears: 1, wage: s.weeklyWage, transferFee: 0, isLoan: true }));
          if (l.loan) { l = { ...l, phase: 'playing', transferSituation: null }; const back = seasonOnHead(l, seed + 5, snap.seed); if (!back.state.loan && back.state.currentClub === s.currentClub && back.state.position === s.position) { loanAway++; if (!(back.state.programme && back.state.programme.secondaryPosition)) loanLost++; } }
        } catch (err) { fail('H', `the loan away threw: ${err.message}`); }
      }
    }
    // 3. an invalid plan state: nothing applies, and does a played season ever clear it?
    const broken = { ...copy(s), programme: { version: 1, receipts: 'x' } };
    if (P.chooseProgramme(broken, 'tactics', 'cover') === broken && P.programmeOptions(broken).every(v => v.choices.every(c => !c.eligible))) {
      locked++;
      const after = seasonOnHead(broken, seed + 6, snap.seed).state;
      if (after.phase === 'playing' && !after.retired && P.programmeOptions(after).every(v => v.choices.every(c => !c.eligible))) lockedAfterSeason++;
    }
    // 4. a reload at every step with NO plan, on the BASE engine: does the base itself differ?
    { const run = (rt) => { const rng = mkRng(seed + 7), ctx = { n: snap.seed, keepPlaying: 1, move: false }; let x = copy(s); for (let g = 0; g < 60; g++) { if (g > 0 && (x.phase === 'playing' || x.retired)) break; x = under(rng, () => stepB(x, ctx)); if (rt) x = copy(x); } return JSON.stringify(x); };
      try { baseReload++; if (run(false) !== run(true)) baseReloadDiff++; } catch { baseReload--; } }
  }
  // 5. back from a year out at the same club: is "New club adaptation" on offer?
  for (let seed = 1; seed <= Number(process.env.H_FLEET || 220); seed++) {
    const rng = mkRng(seed * 7919 + 13), ctx = { n: seed, keepPlaying: 1, move: false };
    let h; try { h = under(rng, () => newCareer(EH, clubsH, seed)); } catch { continue; }
    for (let guard = 0; guard < 500 && !h.retired && playedRows(h) < 14; guard++) {
      try { h = under(rng, () => stepH(h, ctx)); } catch (err) { fail('H', `seed ${seed} threw: ${err.message}`); break; }
      const rows = (h.seasons || []).filter(r => r.type === 'playing'), last = rows[rows.length - 1], before = rows[rows.length - 2];
      if (h.phase === 'playing' && !h.retired && !h.loan && last && before && YEAR_OUT.includes(last.club) && before.club === h.currentClub) {
        banReturns++;
        const v = P.programmeOptions(h).find(x => x.id === 'adaptation');
        if (v && v.choices.some(c => c.eligible)) banAdaptation++;
      }
    }
  }
  console.log(`H move: ${moves} plans carried through a permanent move; ${moveNeutral} seasons equal the no plan season at the new club; ${moveReceipt} settled at the wrong club.`);
  console.log(`H second position: ${presses} saves pressed 11 times; learned after one season ${oneYearLearned}; two played seasons in a row ${twoYear}, learned ${twoYearLearned}; with a year's gap ${gaps}, learned ${gapLearned}.`);
  console.log(`H loan away: ${loanAway} players with a learned second position went on loan for a year and came back to the same club and position; ${loanLost} of them came back WITHOUT it.`);
  console.log(`H invalid plan: ${locked} saves with an invalid plan state offer no choice at all; ${lockedAfterSeason} still offer none after a played season.`);
  console.log(`H ban return: ${banReturns} seasons start back at the same club after a year out (ban or prison); "New club adaptation" is on offer in ${banAdaptation} of them.`);
  console.log(`H base reload: with no plan, a reload at every step changes the season on the BASE engine in ${baseReloadDiff} of ${baseReload} saves.`);
}

console.log(`scProbe: ${fails.length} failure(s), ${notes.length} note(s). Sections run: ${[...want].join(' ')}.`);
if (fails.length > 60) console.log(`(${fails.length - 60} more failures not printed)`);
fs.writeFileSync(path.join(OUT, 'scProbe-result.json'), JSON.stringify({ fails, notes }, null, 1));
process.exit(fails.length ? 1 : 0);
