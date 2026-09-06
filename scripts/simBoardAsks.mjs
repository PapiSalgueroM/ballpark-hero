/**
 * Round 474 harness: every board ask can actually be met, and nobody real is
 * quoted anywhere in the inbox that carries them.
 *
 * His words (docs/TWEAKS-2026-08-28.md, the Club Manager arc): "Board asks get
 * specific: nationality quotas (usually the club's own country), experience
 * counts, position targets, a 90+ potential signing, a 100m+ marquee buy
 * scaled to era." And: "The messages inbox needs a major update: more kinds of
 * messages, choices that actually move relationships and futures."
 *
 * THE MEASUREMENT THAT MATTERS is section 1, and it is deliberately not a
 * restatement of the builder's own arithmetic. It walks every playable club in
 * every era, takes the two asks that club's board really hands out, and then
 * GOES AND MEETS THEM through the engine's own buyPlayer: cheapest satisfying
 * name for the first ask, then cheapest satisfying name for the second out of
 * what is left of the pot, and holds that objectiveStatuses grades both done.
 * That is the whole point of the round. A board that asks a modest 2005 club
 * for a hundred million pound signing is not a hard board, it is a broken one,
 * and the only honest proof that it is not doing that is to spend the money.
 *
 * The other four sections: the candidate headroom every ask carries, the
 * grading flipping where it should at the final whistle, a save written before
 * this round opening and being repaired, and the five new inbox senders being
 * checked for a real person's words.
 *
 * NEGATIVE CONTROLS, three of them, each reproducing a defect this round
 * either had or was one line away from having:
 *   BOARD_ASKS_CONTROL=typed     the marquee ask goes back to a typed 100m
 *     threshold with no reachability guard, which is exactly the shape the
 *     owner's line describes and exactly what would be impossible at a small
 *     club or in a 2005 world. Section 1 must go red.
 *   BOARD_ASKS_CONTROL=quote     the agent message puts words in the mouth of
 *     the real player it is about, which is the legal line in CLAUDE.md and
 *     the easiest one to cross by accident in generated narrative copy.
 *     Section 5 must go red.
 *   BOARD_ASKS_CONTROL=nomigrate ensureBoardAsks does nothing, the shape a
 *     save from before this round would be left in. Section 4 must go red.
 * Each control refuses to run if its rewrite found nothing to rewrite.
 *
 * Numbers, measured on this tree 2026-09-06 (the harness prints all of them):
 *   club and era combinations walked      470          floor 400
 *   asks issued across them               940          floor 900
 *   asks met by buying somebody           940 of 940   nothing less passes
 *   worst share of a pot both asks cost   84.8%        ceiling 100%
 *   candidate headroom, worst per ask     natQuota 6, veterans 139, posGap 51,
 *                                         youngStar 5, marquee 3   floor 2
 *   position lines a board can ask for    4 of 4       floor 4
 *   inbox messages harvested              see output   floor 40
 *   new sender kinds seen                 5 of 5       nothing less passes
 *
 * Run: node scripts/simBoardAsks.mjs
 */
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const CONTROL = process.env.BOARD_ASKS_CONTROL || '';
if (CONTROL && !['typed', 'quote', 'nomigrate'].includes(CONTROL)) {
  console.error(`BOARD_ASKS_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* Windows checkouts write these files with CRLF; every needle below is spelt
   with bare newlines, so normalise before matching. The Round 469 gate fix
   went in for exactly this. */
const lf = s => s.replace(/\r\n/g, '\n');

const ASKS_SRC = path.join(ROOT, 'src', 'lib', 'clubManagerBoardAsks.ts');
const ENGINE_SRC = path.join(ROOT, 'src', 'lib', 'clubManager.ts');
let asksPath = `${ROOT_URL}/src/lib/clubManagerBoardAsks.ts`;
let enginePath = `${ROOT_URL}/src/lib/clubManager.ts`;

function rewrite(file, edits, outName, what) {
  let src = lf(fs.readFileSync(file, 'utf8'));
  for (const [from, to] of edits) {
    if (!src.includes(from)) {
      console.error(`control cannot run: ${what} is not in the shape BOARD_ASKS_CONTROL=${CONTROL} rewrites (${from.slice(0, 70)}...)`);
      process.exit(1);
    }
    src = src.replace(from, to);
  }
  const out = `${TMP}/${process.pid}.${outName}`;
  fs.writeFileSync(out, src);
  return out;
}

if (CONTROL === 'typed') {
  asksPath = rewrite(ASKS_SRC, [[
    `      const raw = Math.min(priced[2], budget * 0.7);
      const feeMin = niceFloor(raw);
      const hits = affordable.filter(p => p.price >= feeMin);
      if (feeMin >= 0.5 && hits.length >= 3) {
        out.push({
          targets: hits.length,
          minSpend: cheapest(hits),`,
    `      const feeMin = 100;
      const hits = affordable.filter(p => p.price >= feeMin);
      if (feeMin >= 0.5) {
        out.push({
          targets: hits.length,
          minSpend: 0,`,
  ]], 'boardAsks.typed.ts', 'the marquee threshold');
  console.log('NEGATIVE CONTROL ON: the marquee ask is a typed 100m with no reachability guard; section 1 must go red');
}
if (CONTROL === 'quote') {
  enginePath = rewrite(ENGINE_SRC, [[
    'text: `An agent has been in touch about ${expiring.name}, who is ${expiring.age} and has a year left.',
    'text: `${expiring.name} says: "Get me a new deal or I am gone." He is ${expiring.age} and has a year left.',
  ]], 'clubManager.quote.ts', 'the agent message');
  console.log('NEGATIVE CONTROL ON: the agent message quotes the real player it is about; section 5 must go red');
}
if (CONTROL === 'nomigrate') {
  asksPath = rewrite(ASKS_SRC, [[
    `export function ensureBoardAsks(state: CareerState): void {
  if (state.boardAsksVersion === BOARD_ASKS_VERSION) return;`,
    `export function ensureBoardAsks(state: CareerState): void {
  if (BOARD_ASKS_VERSION > 0) return;
  if (state.boardAsksVersion === BOARD_ASKS_VERSION) return;`,
  ]], 'boardAsks.nomigrate.ts', 'the save repair');
  console.log('NEGATIVE CONTROL ON: a save from before this round is never repaired; section 4 must go red');
}

/* ---- bundle the REAL modules ---- */
const ENTRY = `${TMP}/boardAsks.${process.pid}.entry.mjs`;
const BUNDLE = `${TMP}/boardAsks.${process.pid}.bundle.mjs`;
fs.writeFileSync(ENTRY, `
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
};
export const cm = await import('${enginePath}');
export const asks = await import('${asksPath}');
export const nations = await import('${ROOT_URL}/src/data/playerNationalities.ts');
export const fin = await import('${ROOT_URL}/src/lib/clubManagerFinances.ts');
`);
execSync(
  `"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node`
  + ` --alias:@/lib/clubManagerBoardAsks=${asksPath} --alias:@/lib/clubManager=${enginePath}`
  + ` --alias:@=${ROOT_URL}/src --outfile="${BUNDLE}" --log-level=error`,
  { stdio: 'inherit' },
);
const { cm, asks, nations, fin } = await import(pathToFileURL(BUNDLE).href);
const {
  REAL_LEAGUES, playableClubs, CM_ERAS, eraLeaguesFor, eraPlayableClubs,
  startCareer, buildMarket, buyPlayer, objectiveStatuses, groupOf, loadCareer,
  playNextEntry, answerMessage,
} = cm;
const { setTicketPolicy } = fin;
const { isBoardAsk, askCandidates, askExplainer } = asks;
const { nationalityOf } = nations;

/* Every playable save in the game: club plus era. */
const worlds = [];
for (const league of REAL_LEAGUES) {
  for (const c of playableClubs(league.id)) worlds.push({ era: 'now', club: c.name });
}
for (const era of CM_ERAS.filter(e => e.id !== 'now')) {
  for (const league of eraLeaguesFor(era.id)) {
    for (const c of eraPlayableClubs(era.id, league.id)) worlds.push({ era: era.id, club: c.name });
  }
}

/** The cheapest name on this market that would satisfy this ask, or null. */
function satisfier(objective, market, budget, eraId) {
  let best = null;
  for (const p of market) {
    if (p.price > budget) continue;
    let ok = false;
    if (objective.id === 'natQuota') ok = nationalityOf(eraId, p.name) === objective.country;
    else if (objective.id === 'veterans') ok = p.age >= objective.minAge;
    else if (objective.id === 'posGap') ok = groupOf(p.position) === objective.posGroup;
    else if (objective.id === 'youngStar') ok = p.age <= objective.maxAge && p.rating >= objective.minRating;
    else if (objective.id === 'marquee') ok = p.price >= objective.feeMin;
    if (!ok) continue;
    if (!best || p.price < best.price) best = p;
  }
  return best;
}

/* ================================================================== */
console.log('1) Every ask a board makes is met by going and buying somebody');
/* ================================================================== */
const askCount = {};
const posLines = new Set();
let worstShare = 0, worstWhere = '';
let issued = 0, met = 0, sample = [];
{
  for (const w of worlds) {
    let state = startCareer(w.club, w.era);
    const startPot = state.budget;
    const mine = (state.boardObjectives ?? []).filter(o => isBoardAsk(o.id));
    for (const o of mine) {
      issued += 1;
      askCount[o.id] = (askCount[o.id] ?? 0) + 1;
      if (o.id === 'posGap') posLines.add(o.posGroup);
      const target = satisfier(o, buildMarket(state), state.budget, state.eraId);
      if (!target) {
        fail(`${w.era} ${w.club} (pot ${startPot}): nothing on the market meets "${o.label}"`);
        continue;
      }
      const next = buyPlayer(state, target);
      if (!next) {
        fail(`${w.era} ${w.club}: the engine refused to sign ${target.name} at ${target.price} out of ${state.budget}`);
        continue;
      }
      state = next;
      const status = objectiveStatuses(state).find(s => s.objective.id === o.id);
      if (!status || status.status !== 'done') {
        fail(`${w.era} ${w.club}: signed ${target.name} for "${o.label}" and it still grades ${status ? status.status : 'missing'}`);
        continue;
      }
      met += 1;
    }
    const share = startPot > 0 ? (startPot - state.budget) / startPot : 0;
    if (share > worstShare) { worstShare = share; worstWhere = `${w.era} ${w.club}, ${(startPot - state.budget).toFixed(1)} of ${startPot}`; }
    if (sample.length < 6 && mine.length === 2) {
      sample.push(`   e.g. ${w.era} ${w.club} (pot ${startPot}): ${mine.map(o => o.label).join(' + ')}`);
    }
  }
  console.log(`   ${worlds.length} club and era combinations walked, ${issued} asks issued`);
  console.log(`   ${met} of ${issued} met by signing somebody the engine actually let through`);
  console.log(`   worst pot share both asks cost: ${(worstShare * 100).toFixed(1)}% (${worstWhere})`);
  console.log(`   asks by shape: ${Object.entries(askCount).sort().map(([k, v]) => `${k} ${v}`).join(', ')}`);
  console.log(sample.join('\n'));
  if (worlds.length < 400) fail(`only ${worlds.length} club and era combinations, the world shrank`);
  if (issued < 900) fail(`only ${issued} asks issued across ${worlds.length} saves, boards went quiet`);
  if (met !== issued) fail(`${issued - met} asks could not be met, which is the whole rule`);
  if (worstShare >= 1) fail(`a board's two asks cost ${(worstShare * 100).toFixed(0)}% of the pot, which is more than the club has`);
  if (Object.keys(askCount).length < 5) fail(`only ${Object.keys(askCount).length} ask shapes are ever handed out, one is dead code`);
  if (posLines.size < 4) fail(`the board only ever asks for ${[...posLines].join(', ')}, so ${4 - posLines.size} line(s) are unreachable`);
}

/* ================================================================== */
console.log('2) Every candidate ask carries measured headroom');
/* ================================================================== */
{
  const headroom = {};
  let candidates = 0;
  for (const w of worlds) {
    const state = startCareer(w.club, w.era);
    for (const c of askCandidates(state)) {
      candidates += 1;
      (headroom[c.objective.id] ??= []).push(c.targets);
      if (c.targets < 2) {
        fail(`${w.era} ${w.club}: "${c.objective.label}" has ${c.targets} way(s) of being met, which is a coin flip`);
      }
      if (c.minSpend > state.budget) {
        fail(`${w.era} ${w.club}: "${c.objective.label}" costs at least ${c.minSpend} out of a ${state.budget} pot`);
      }
    }
  }
  for (const [k, v] of Object.entries(headroom).sort()) {
    v.sort((a, b) => a - b);
    console.log(`   ${k}: ${v.length} candidates, worst ${v[0]} ways, median ${v[Math.floor(v.length / 2)]}`);
  }
  console.log(`   ${candidates} candidate asks measured`);
  if (candidates < 1800) fail(`only ${candidates} candidates over ${worlds.length} saves, the pool collapsed`);
}

/* ================================================================== */
console.log('3) The asks grade where they should at the final whistle');
/* ================================================================== */
{
  const base = startCareer('Everton');
  const withObj = (career, obj) => ({ ...career, boardObjectives: [obj] });
  const statusOf = (career, obj) => objectiveStatuses(withObj(career, obj))[0].status;
  const ended = career => ({ ...career, week: career.calendar.length });

  // A country quota nobody has met, at the whistle.
  const nat = { id: 'natQuota', target: 99, country: 'England', label: 'Have 99 players from England in the squad' };
  if (statusOf(ended(base), nat) !== 'failed') fail('an unmet country quota at the whistle grades ' + statusOf(ended(base), nat));
  const natEasy = { ...nat, target: 1 };
  const withEnglishman = {
    ...base,
    squad: [...base.squad, { ...base.squad[0], id: 'x1', name: 'Harry Kane', age: 30, rating: 88 }],
  };
  if (statusOf(ended(withEnglishman), natEasy) !== 'done') fail('a met country quota at the whistle grades ' + statusOf(ended(withEnglishman), natEasy));

  // Experience, same shape.
  const vet = { id: 'veterans', target: 99, minAge: 30, label: 'Have 99 players aged 30 or over in the squad' };
  if (statusOf(ended(base), vet) !== 'failed') fail('an unmet experience count at the whistle grades ' + statusOf(ended(base), vet));
  if (statusOf(ended(base), { ...vet, target: 1, minAge: 0 }) !== 'done') fail('an experience count every player meets still grades short');

  // A signing ask reads the season's ins, not the squad it was already given.
  const kid = { ...base.squad[0], id: 'k1', name: 'A Signed Kid', age: 19, rating: 82 };
  const bought = { ...base, squad: [...base.squad, kid], seasonSignings: [{ dir: 'in', name: 'A Signed Kid', fee: 30 }] };
  const ys = { id: 'youngStar', target: 1, maxAge: 21, minRating: 80, label: 'Sign someone 21 or under rated 80 or better' };
  if (statusOf(ended(bought), ys) !== 'done') fail('a bought 19 year old rated 82 misses an 80 floor');
  if (statusOf(ended(base), ys) !== 'failed') fail('an unmet young star ask at the whistle grades ' + statusOf(ended(base), ys));
  const loaned = { ...base, squad: [...base.squad, kid], seasonSignings: [{ dir: 'in', name: 'A Signed Kid', fee: 3, loan: true }] };
  if (statusOf(ended(loaned), ys) !== 'failed') fail('a LOAN counts as a permanent young star signing');

  // The marquee reads the fee, and a loan fee is not a marquee buy.
  const mq = { id: 'marquee', target: 1, feeMin: 40, label: 'Spend £40m or more on one signing' };
  if (statusOf(ended({ ...base, seasonSignings: [{ dir: 'in', name: 'B', fee: 41 }] }), mq) !== 'done') fail('a 41m fee misses a 40m marquee ask');
  if (statusOf(ended({ ...base, seasonSignings: [{ dir: 'in', name: 'B', fee: 39 }] }), mq) !== 'failed') fail('a 39m fee passes a 40m marquee ask');
  if (statusOf(ended({ ...base, seasonSignings: [{ dir: 'in', name: 'B', fee: 90, loan: true }] }), mq) !== 'failed') fail('a 90m LOAN fee passes a marquee buy');

  // Mid season it reads on track while a window is still coming and behind
  // once the last one has shut.
  const early = { ...base, week: 2, transferWindow: 'summer' };
  if (statusOf(early, mq) !== 'onTrack') fail('an unmet marquee in an open window grades ' + statusOf(early, mq));
  const noWindowLeft = {
    ...base,
    week: base.calendar.length - 1,
    transferWindow: null,
    calendar: base.calendar.map(e => (e.type === 'window' ? { ...e, type: 'league' } : e)),
  };
  if (statusOf(noWindowLeft, mq) !== 'behind') fail('an unmet marquee with no window left grades ' + statusOf(noWindowLeft, mq));

  // The position ask reads the LINE, not the headcount.
  const gk = { id: 'posGap', target: 1, posGroup: 'GK', label: 'Sign a goalkeeper this season' };
  const boughtGk = {
    ...base,
    squad: [...base.squad, { ...base.squad[0], id: 'g1', name: 'A Signed Keeper', position: 'GK' }],
    seasonSignings: [{ dir: 'in', name: 'A Signed Keeper', fee: 4 }],
  };
  if (statusOf(ended(boughtGk), gk) !== 'done') fail('a signed keeper misses a keeper ask');
  if (statusOf(ended(bought), gk) !== 'failed') fail('a signed teenage forward passes a keeper ask');
  console.log('   country, experience, position, young star and marquee all flip at the whistle');
  console.log('   loans are refused on the young star and the marquee, and accepted on the position ask');
  console.log('   an ask with no window left reads behind rather than on track');
}

/* ================================================================== */
console.log('4) A save written before this round opens and is repaired');
/* ================================================================== */
{
  const fresh = startCareer('Arsenal');
  // The shape a pre Round 474 save has on disk: the old objectives, no asks,
  // no version stamp, and none of the new fields anywhere.
  const old = JSON.parse(JSON.stringify(fresh));
  old.boardObjectives = (old.boardObjectives ?? []).filter(o => !isBoardAsk(o.id));
  delete old.boardAsksVersion;
  const oldCount = old.boardObjectives.length;
  if (oldCount === 0) fail('the pre round save has no objectives at all, the fixture is wrong');
  localStorage.setItem('dukb-club-manager-save', JSON.stringify(old));
  const opened = loadCareer();
  if (!opened) {
    fail('a save written before this round does not open at all');
  } else {
    const kept = (opened.boardObjectives ?? []).filter(o => !isBoardAsk(o.id)).length;
    const gained = (opened.boardObjectives ?? []).filter(o => isBoardAsk(o.id)).length;
    if (kept !== oldCount) fail(`opening an old save lost ${oldCount - kept} of its original objectives`);
    if (gained === 0) fail('an old save opened in an open window and gained no board asks');
    if (opened.boardAsksVersion !== asks.BOARD_ASKS_VERSION) fail('the repaired save was never stamped, so it repairs itself forever');
    // And it grades without throwing.
    const graded = objectiveStatuses(opened);
    if (graded.length !== (opened.boardObjectives ?? []).length) fail('the repaired save does not grade every objective');
    console.log(`   old save opened: ${kept} original objectives kept, ${gained} asks added, all ${graded.length} graded`);
  }
  // And a mid season save whose last window has already shut is left alone,
  // because an ask it could not meet is the exact thing this round stops.
  const late = JSON.parse(JSON.stringify(old));
  late.week = late.calendar.length - 1;
  late.transferWindow = null;
  late.calendar = late.calendar.map(e => (e.type === 'window' ? { ...e, type: 'league' } : e));
  localStorage.setItem('dukb-club-manager-save', JSON.stringify(late));
  const opened2 = loadCareer();
  const bolted = ((opened2 && opened2.boardObjectives) ?? []).filter(o => isBoardAsk(o.id)).length;
  if (bolted > 0) fail(`a mid season save past its last window had ${bolted} signing ask(s) bolted on it cannot meet`);
  console.log('   a mid season save past its last window gains no ask it could not meet');
  localStorage.removeItem('dukb-club-manager-save');
  // Every ask carries the line that says how it is judged.
  for (const w of worlds.slice(0, 40)) {
    const st = startCareer(w.club, w.era);
    for (const o of (st.boardObjectives ?? []).filter(x => isBoardAsk(x.id))) {
      if (!askExplainer(o)) fail(`"${o.label}" ships with no line saying how it is graded`);
    }
  }
  console.log('   every ask on the first 40 saves carries its own grading line');
  /* A club you founded is a save shape too, and it is the one where the
     league, the squad and the money are all made at the founding rather
     than baked, so it is the one most likely to hand the builder something
     it did not expect. */
  const CREST = { shape: 0, pattern: 2, color1: '#7c3aed', color2: '#f8fafc', initials: 'RA' };
  let customChecked = 0;
  for (const leagueId of ['premier', 'eredivisie', 'scottish']) {
    for (const budgetTier of ['small', 'mid', 'big']) {
      const spec = { name: 'Real Anthony', stadium: 'Salguero Park', crest: { ...CREST }, budgetTier, leagueId, replacedClub: '' };
      let st;
      try {
        st = startCareer('Real Anthony', 'now', spec);
      } catch (e) {
        fail(`a founded club in ${leagueId} on a ${budgetTier} budget threw building its board: ${e.message}`);
        continue;
      }
      const mine = (st.boardObjectives ?? []).filter(o => isBoardAsk(o.id));
      if (mine.length === 0) {
        fail(`a founded club in ${leagueId} on a ${budgetTier} budget got no asks at all`);
        continue;
      }
      for (const o of mine) {
        customChecked += 1;
        const target = satisfier(o, buildMarket(st), st.budget, st.eraId);
        if (!target) {
          fail(`founded club in ${leagueId} (${budgetTier}, pot ${st.budget}): nothing meets "${o.label}"`);
          continue;
        }
        const next = buyPlayer(st, target);
        if (!next) { fail(`founded club could not sign ${target.name} at ${target.price}`); continue; }
        st = next;
        const status = objectiveStatuses(st).find(x => x.objective.id === o.id);
        if (!status || status.status !== 'done') fail(`founded club met "${o.label}" and it grades ${status ? status.status : 'missing'}`);
      }
    }
  }
  console.log(`   ${customChecked} asks on nine founded clubs (three leagues, three budgets) all met by signing somebody`);
  if (customChecked < 12) fail(`only ${customChecked} founded club asks checked, that path barely ran`);
}

/* ================================================================== */
console.log('5) The inbox: five new senders, and nobody real is quoted');
/* ================================================================== */
{
  /* Every real name the four bakes can put on a teamsheet. A message may
     narrate any of them; none of them may be made to speak. */
  const realNames = new Set();
  for (const f of ['clubManagerRosters', 'clubManagerEra2005', 'clubManagerEra2010', 'clubManagerEra2015']) {
    const src = lf(fs.readFileSync(path.join(ROOT, 'src', 'data', `${f}.ts`), 'utf8'));
    for (const m of src.matchAll(/\{\s*n:\s*'((?:[^'\\]|\\.)*)'/g)) {
      realNames.add(m[1].replace(/\\'/g, "'"));
    }
  }
  if (realNames.size < 4000) fail(`only harvested ${realNames.size} real names, the harvest is broken`);

  const kinds = {};
  const seen = [];
  /* Every objective label these careers ever carried, gathered as they run.
     The board quotes its own objective back at you and nothing else, so this
     is the whole allowlist for quoted text below. */
  const labelSet = new Set();
  const clubs = ['Everton', 'Barcelona', 'Napoli', 'Celtic', 'Ajax', 'Lyon'];
  /* Answers rotate rather than always taking the first option, for two
     reasons: every effect gets exercised rather than only the first one on
     each message, and always taking option zero would switch the thing that
     generates the message off (the trust only writes on premium prices, and
     option zero puts them back to standard, so the first draft of this
     harness saw exactly one trust letter in six careers). */
  let answerSpin = 0;
  for (let i = 0; i < clubs.length; i++) {
    let st = startCareer(clubs[i]);
    const premium = i % 2 === 0;
    if (premium) st = setTicketPolicy(st, 2);
    for (let guard = 0; guard < 400 && st.week < st.calendar.length; guard++) {
      const res = playNextEntry(st, { skipHalftime: true });
      st = res.state;
      if (st.sacked) break;
      if (premium && (st.finance?.ticketTier ?? 1) !== 2) st = setTicketPolicy(st, 2);
      for (const o of st.boardObjectives ?? []) labelSet.add(o.label);
      for (const m of st.inbox ?? []) {
        if (seen.some(x => x.id === m.id)) continue;
        seen.push(m);
        kinds[m.kind] = (kinds[m.kind] ?? 0) + 1;
      }
      for (const m of (st.inbox ?? []).filter(x => !x.resolved)) {
        answerSpin += 1;
        st = answerMessage(st, m.id, answerSpin % m.options.length);
      }
      for (const m of st.inbox ?? []) {
        const already = seen.find(x => x.id === m.id);
        if (already) already.resolved = m.resolved;
      }
    }
  }
  let quoted = 0;
  for (const m of seen) {
    const blob = [m.text, m.from ?? '', m.resolved ?? '', ...m.options.map(o => o.label)].join(' \u0001 ');
    if (/[\u2013\u2014]/.test(blob)) fail(`em or en dash in an inbox message: "${m.text.slice(0, 60)}"`);
    // Nobody real is ever the SENDER.
    if (m.from && realNames.has(m.from)) fail(`a real player is the sender of a message: ${m.from}`);
    if (m.from && [...realNames].some(n => m.from.startsWith(n + ','))) fail(`a real player is named as the sender: ${m.from}`);
    /* And every quoted span in the copy is one of the board's own objective
       labels. That is the only thing this game quotes, and anything else
       inside quotation marks is somebody being made to say something. */
    for (const q of blob.matchAll(/"([^"]{4,})"/g)) {
      quoted += 1;
      if (!labelSet.has(q[1])) {
        fail(`a quoted span that is not a board objective label: "${q[1].slice(0, 60)}" in a ${m.kind} message`);
      }
    }
    for (const q of blob.matchAll(/\u201c([^\u201d]{4,})\u201d/g)) {
      quoted += 1;
      if (!labelSet.has(q[1])) fail(`a curly quoted span that is not a board objective label: ${q[1].slice(0, 60)}`);
    }
  }
  console.log(`   ${seen.length} inbox messages harvested over ${clubs.length} careers`);
  console.log(`   by kind: ${Object.entries(kinds).sort().map(([k, v]) => `${k} ${v}`).join(', ')}`);
  console.log(`   ${quoted} quoted spans checked against ${labelSet.size} objective labels these saves really carried`);
  if (seen.length < 60) fail(`only ${seen.length} messages harvested, the check barely fired`);
  /* Two of each, not one: a single sighting is a sighting the next seed can
     lose, and a check that can quietly stop firing is worse than no check. */
  for (const want of ['boardChase', 'agent', 'coachTip', 'fanGroup', 'reporter']) {
    if ((kinds[want] ?? 0) < 2) fail(`only ${kinds[want] ?? 0} "${want}" message(s) were generated, so almost nothing checked it`);
  }
}

/* ================================================================== */
console.log('6) The words on every ask label');
/* ================================================================== */
{
  let labels = 0;
  const shapes = new Set();
  for (const w of worlds) {
    for (const o of (startCareer(w.club, w.era).boardObjectives ?? []).filter(x => isBoardAsk(x.id))) {
      labels += 1;
      shapes.add(o.label.replace(/\d+(\.\d+)?/g, 'N'));
      if (/[\u2013\u2014]/.test(o.label)) fail(`em or en dash in "${o.label}"`);
      if (o.label.length > 70) fail(`label is a paragraph: "${o.label}"`);
      // Round 145's rule, which covers every objective label on this screen.
      if (/top \d+/i.test(o.label)) fail(`positional phrase in "${o.label}"`);
      // The pluralisation this round shipped wrong first time round.
      if (/\b1 players\b/.test(o.label)) fail(`"${o.label}" says one players`);
    }
  }
  console.log(`   ${labels} ask labels checked, ${shapes.size} distinct shapes`);
  if (shapes.size < 5) fail(`only ${shapes.size} distinct ask shapes across the world`);
}

console.log('');
if (failures > 0) {
  console.error(`simBoardAsks: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simBoardAsks: green. Every ask a board makes can be met, and nobody real is quoted.');
