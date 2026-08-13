/**
 * Round 70 harness: headless Club Manager careers across all five real
 * leagues. Bundles the engine with esbuild and drives full seasons the way
 * the page would, asserting the things tsc can't see:
 *  - every one of the 96 clubs starts a valid career (squad, XI, objectives)
 *  - full seasons run to the summary with no crash, NaN or nameless cup
 *  - cup draws only produce real league clubs (the "grilna" class of bug)
 *  - the market is the full baked universe with sane real-value prices
 * Run: node scripts/simClubManager.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/cmSimEntry.mjs';
const BUNDLE = '/tmp/cmSim.bundle.mjs';

// Two-stage entry: ES module imports evaluate before the entry's own
// statements, so the localStorage stub must be installed in a wrapper that
// dynamically imports the engine (same trick as the other sim harnesses).
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT}/src/lib/clubManager.ts');
export const engine = mod;
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const cm = (await import(BUNDLE)).engine;
const {
  REAL_LEAGUES, NATIONS, playableClubs, clubPreviewRating, startCareer, playNextEntry,
  finishSeason, startNextSeason, buildMarket, buyPlayer, sellPlayer, objectiveStatuses,
  xiAverageRating, sortedTable, leagueOf, nextFixture,
  startNegotiation, makeOffer, walkAway, payClause, releaseClauseOf, loanIn, loanEligible,
  loanFeeOf, activeLoans, acceptBid, rejectBid,
} = cm;

let failures = 0;
const fail = msg => { failures += 1; console.error('  FAIL: ' + msg); };
const isNum = v => typeof v === 'number' && Number.isFinite(v);

/* ---------- 1. Static shape ---------- */
console.log('1) Nations and leagues');
if (NATIONS.length !== 8) fail(`expected 8 nations, got ${NATIONS.length}`);
let totalClubs = 0;
for (const n of NATIONS) {
  for (const leagueId of n.leagueIds) {
    const clubs = playableClubs(leagueId);
    totalClubs += clubs.length;
    const lg = REAL_LEAGUES.find(l => l.id === leagueId);
    if (!lg) { fail(`nation ${n.name} points at missing league ${leagueId}`); continue; }
    if (clubs.length !== lg.clubs.length) fail(`${lg.name}: ${clubs.length} playable vs ${lg.clubs.length} in league`);
    for (const c of clubs) {
      if (!isNum(c.budget) || c.budget < 5) fail(`${c.name}: bad budget ${c.budget}`);
      if (!isNum(c.expectation) || c.expectation < 1 || c.expectation > lg.clubs.length) fail(`${c.name}: bad expectation ${c.expectation}`);
      if (![1, 2, 3, 4].includes(c.tier)) fail(`${c.name}: bad tier ${c.tier}`);
      const xi = clubPreviewRating(c.name);
      if (!isNum(xi) || xi < 48 || xi > 95) fail(`${c.name}: XI preview ${xi} out of range`);
    }
  }
}
if (totalClubs !== 186) fail(`expected 186 playable clubs, got ${totalClubs}`);
const ordering = [
  ['Real Madrid', 'Racing Santander'], ['Bayern Munich', 'Paderborn'], ['PSG', 'Le Havre'],
  ['Liverpool', 'Hull City'], ['Wolves', 'Lincoln City'], ['Al-Hilal', 'Al-Riyadh'],
  ['Inter Miami', 'San Jose Earthquakes'], ['Ajax', 'Telstar'],
];
for (const [a, b] of ordering) {
  if (!(clubPreviewRating(a) > clubPreviewRating(b))) fail(`${a} (${clubPreviewRating(a)}) not stronger than ${b} (${clubPreviewRating(b)})`);
}
// Round 72 anchors: the verified summer window is in the shipped data.
const rosterHas = (club, frag) => (cm.CM_ROSTERS[club] ?? []).some(p => p.n.includes(frag));
if (!rosterHas('Chicago Fire', 'Lewandowski')) fail('Lewandowski not at Chicago Fire in bake');
if (!rosterHas('Ajax', 'ter Stegen')) fail('ter Stegen not at Ajax in bake');
if (!rosterHas('Chelsea', 'Morgan Rogers')) fail('Rogers not at Chelsea in bake');
if (!rosterHas('Al-Nassr', 'Ronaldo')) fail('Ronaldo not at Al-Nassr in bake');
if (rosterHas('Barcelona', 'Lewandowski')) fail('Lewandowski still at Barcelona in bake');
// UCL gating: European leagues only.
{
  const rm = startCareer('Real Madrid');
  if (!rm.uclGroup) fail('Real Madrid did not start in the UCL');
  const hilal = startCareer('Al-Hilal');
  if (hilal.uclGroup) fail('Al-Hilal started in the UCL (non-euro league)');
  const miami = startCareer('Inter Miami');
  if (miami.uclGroup) fail('Inter Miami started in the UCL (non-euro league)');
  // Round 72: every league length now fits a full cup run.
  for (const probe of ['Inter Miami', 'Wolves', 'Ajax', 'Al-Nassr', 'Arsenal']) {
    const s = startCareer(probe);
    if (!s.calendar.some(e => e.type === 'cup' && e.cupRound === 'F')) fail(`${probe}: calendar missing the cup final`);
    if (!s.calendar.some(e => e.type === 'window')) fail(`${probe}: calendar missing the January window`);
  }
}

/* ---------- 2. Every club can start ---------- */
console.log('2) startCareer for all 186 clubs');
const allClubNames = REAL_LEAGUES.flatMap(l => l.clubs);
for (const name of allClubNames) {
  const s = startCareer(name);
  if (s.clubName !== name) fail(`${name}: career started as ${s.clubName}`);
  if (s.squad.length < 16) fail(`${name}: squad only ${s.squad.length}`);
  const xi = s.xiIds.filter(Boolean).length;
  if (xi !== 11) fail(`${name}: auto XI picked ${xi}/11`);
  if (!s.boardObjectives || s.boardObjectives.length < 3) fail(`${name}: only ${s.boardObjectives?.length ?? 0} board objectives`);
  const realCount = s.squad.filter(p => !p.isYouth).length;
  // Partial-data clubs are youth padded by design and labeled in the UI.
  if (realCount < 7 && !cm.isPartialClub(name)) fail(`${name}: only ${realCount} real players and not flagged partial`);
  const cup = s.cupDraw.R16;
  if (!cup || !leagueOf(name).clubs.includes(cup)) fail(`${name}: cup R16 draw "${cup}" not a league club`);
  for (const p of s.squad) {
    if (!isNum(p.rating) || p.rating < 40 || p.rating > 95) fail(`${name}: ${p.name} rating ${p.rating}`);
    if (p.value !== undefined && (!isNum(p.value) || p.value <= 0)) fail(`${name}: ${p.name} value ${p.value}`);
  }
  const rivalObj = s.boardObjectives.find(o => o.id === 'rival');
  if (rivalObj && !leagueOf(name).clubs.includes(rivalObj.rivalName)) fail(`${name}: rival "${rivalObj.rivalName}" not in league`);
}

/* ---------- 3. Market ---------- */
console.log('3) Transfer market');
{
  const s = startCareer('Sunderland');
  const market = buildMarket(s);
  if (market.length < 2500) fail(`market only ${market.length} players (expected 2500+)`);
  for (const m of market.slice(0, 400)) {
    if (!isNum(m.price) || m.price <= 0 || m.price > 250) fail(`market price ${m.price} for ${m.name}`);
    if (m.value !== undefined && m.price > m.value * 1.3 + 0.5) fail(`${m.name}: price ${m.price} way above value ${m.value}`);
  }
  const affordable = market.find(m => m.price <= s.budget);
  if (!affordable) fail('Sunderland cannot afford anyone at all');
  else {
    const bought = buyPlayer(s, affordable);
    if (!bought) fail('buyPlayer refused an affordable summer signing');
    else {
      if (!bought.squad.some(p => p.name === affordable.name)) fail('bought player not in squad');
      const sellable = bought.squad.filter(p => p.position !== 'GK');
      const sold = sellPlayer(bought, sellable[sellable.length - 1].id);
      if (!sold) fail('sellPlayer refused a legal sale');
      else if (!isNum(sold.budget) || sold.budget < 0) fail(`budget after sale: ${sold.budget}`);
    }
  }
  const top = market[0];
  if (top.rating < 88) fail(`best market player only rated ${top.rating}`);
}

/* ---------- 4. Full seasons ---------- */
console.log('4) Full-season sims');
const SAMPLE = ['Real Madrid', 'Barcelona', 'Sunderland', 'Manchester City', 'Wolves', 'Lincoln City', 'Inter Milan', 'Monza', 'Bayern Munich', 'Schalke 04', 'PSG', 'Le Mans', 'Ajax', 'Cambuur', 'Al-Nassr', 'Al-Riyadh', 'Chicago Fire', 'Inter Miami', 'San Diego FC', 'Como', 'Union Berlin'];
let cupLabelsSeen = 0;
for (const clubName of SAMPLE) {
  let s = startCareer(clubName);
  const knownNames = new Set([
    ...REAL_LEAGUES.flatMap(l => l.clubs),
    'Benfica', 'Porto', 'Sporting CP', 'Celtic', 'Rangers',
    'Galatasaray', 'Fenerbahçe', 'Club Brugge', 'RB Salzburg', 'Olympiacos', 'Galacticos XI',
  ]);
  for (let season = 1; season <= 2; season++) {
    let guard = 0;
    for (;;) {
      guard += 1;
      if (guard > 110) { fail(`${clubName}: season ${season} never ended (110 entries)`); break; }
      const res = playNextEntry(s);
      s = res.state;
      if (res.kind === 'seasonOver') break;
      if (res.kind === 'match') {
        const r = res.report;
        if (!r.compLabel || r.compLabel.includes('undefined')) fail(`${clubName}: bad compLabel "${r.compLabel}"`);
        if (r.competition === 'cup') {
          cupLabelsSeen += 1;
          // Round 95: the test accepts the first job offer at the end of
          // season one, so by season two the club (and its cup) may have
          // changed. Grade against where the manager actually IS.
          const cupName = leagueOf(s.clubName).cupName;
          if (!r.compLabel.includes(cupName)) fail(`${clubName} (now at ${s.clubName}): cup label "${r.compLabel}" missing "${cupName}"`);
        }
        const opp = r.home === s.clubName ? r.away : r.home;
        if (!knownNames.has(opp)) fail(`${clubName}: unknown opponent "${opp}" (grilna class bug)`);
        if (!isNum(r.homeGoals) || !isNum(r.awayGoals)) fail(`${clubName}: NaN scoreline`);
        if (!isNum(s.boardConfidence)) fail(`${clubName}: NaN confidence`);
        if (s.sacked) break;
      }
    }
    if (s.sacked) break;
    const { state: fin, summary } = finishSeason(s);
    s = fin;
    if (!summary.objectives || summary.objectives.length < 4) fail(`${clubName}: summary graded ${summary.objectives?.length ?? 0} objectives`);
    if (!isNum(summary.seasonScore)) fail(`${clubName}: NaN season score`);
    const table = sortedTable(s.table);
    const rounds = 2 * (s.leagueClubs.length - 1);
    for (const row of table) {
      const gp = row.w + row.d + row.l;
      if (gp !== rounds) fail(`${clubName}: ${row.club} played ${gp}/${rounds}`);
    }
    if (season === 1) {
      const offer = summary.offers[0];
      s = startNextSeason(s, offer ? offer.club : undefined);
      if (!s.boardObjectives || s.boardObjectives.length < 4) fail(`${clubName}: next season objectives missing`);
      if (s.squad.length < 16) fail(`${clubName}: next season squad ${s.squad.length}`);
    }
  }
  // live objective statuses never throw and cover every objective
  const st = objectiveStatuses(s);
  if (st.length !== (s.boardObjectives?.length ?? 0)) fail(`${clubName}: statuses ${st.length} vs objectives ${s.boardObjectives?.length}`);
  const avg = xiAverageRating(s);
  if (!isNum(avg) || avg < 45 || avg > 96) fail(`${clubName}: XI avg ${avg}`);
}
if (cupLabelsSeen === 0) fail('no cup matches were played across 14 careers (calendar broken?)');

/* ---------- 5. next fixture preview ---------- */
console.log('5) Fixture preview');
{
  const s = startCareer('Arsenal');
  const fx = nextFixture(s);
  if (fx.kind !== 'match') fail(`Arsenal first fixture kind ${fx.kind}`);
  else {
    if (!fx.compLabel.includes('Premier League')) fail(`first fixture label "${fx.compLabel}"`);
    if (!isNum(fx.oppStrength) || fx.oppStrength < 48 || fx.oppStrength > 96) fail(`opp strength ${fx.oppStrength}`);
  }
}

/* ---------- 6. Round 71: negotiations, clauses, loans, incoming bids ---------- */
console.log('6) Negotiations and the deadline-day machinery');
{
  // 300 negotiations with random strategies must always terminate legally.
  let agreed = 0, collapsed = 0, hijacked = 0, walked = 0;
  for (let i = 0; i < 300; i++) {
    let s = startCareer(['Arsenal', 'Como', 'Sunderland', 'Real Madrid', 'Mainz', 'Lens'][i % 6]);
    const market = buildMarket(s);
    const affordable = market.filter(m => m.price <= s.budget * 0.9);
    if (!affordable.length) { fail('no affordable targets at all'); break; }
    const target = affordable[Math.floor(Math.random() * Math.min(affordable.length, 60))];
    const s1 = startNegotiation(s, target);
    if (!s1) { fail(`startNegotiation refused ${target.name}`); continue; }
    s = s1;
    let rounds = 0;
    while (s.negotiation && s.negotiation.status === 'open') {
      rounds += 1;
      if (rounds > 30) { fail('negotiation never terminated in 30 rounds'); break; }
      const neg = s.negotiation;
      const roll = Math.random();
      if (roll < 0.15) { s = walkAway(s); walked += 1; break; }
      const mult = roll < 0.35 ? 0.7 : roll < 0.7 ? 0.88 : roll < 0.9 ? 0.97 : 1.0;
      let amount = neg.theirAsk * mult;
      if (neg.rivalOffer !== null && roll >= 0.7) amount = Math.max(amount, neg.rivalOffer * 1.06);
      const s2 = makeOffer(s, amount);
      if (!s2) { fail('makeOffer returned null on an open negotiation'); break; }
      s = s2;
      if (!isNum(s.budget) || s.budget < -0.01) { fail(`budget went negative: ${s.budget}`); break; }
    }
    const st = s.negotiation?.status;
    if (st === 'agreed') {
      agreed += 1;
      const paid = s.seasonSignings.find(t => t.name === s.negotiation.player.name);
      if (!paid) fail('agreed deal missing from seasonSignings');
      else {
        const base = s.negotiation.player.value ?? s.negotiation.player.price;
        if (paid.fee > base * 2.8 + 1) fail(`agreed fee ${paid.fee} absurd vs value ${base}`);
      }
      if (!s.squad.some(p => p.name === s.negotiation.player.name)) fail('agreed player not in squad');
      if (!(s.transferLog ?? []).some(n => n.name === s.negotiation.player.name)) fail('agreed deal not in transfer log');
    } else if (st === 'collapsed') {
      collapsed += 1;
      if (!(s.coldNames ?? []).includes(s.negotiation.player.name)) fail('collapsed seller not marked cold');
    } else if (st === 'hijacked') {
      hijacked += 1;
      if (!s.goneNames.includes(s.negotiation.player.name)) fail('hijacked player still on the market');
    }
  }
  console.log(`   300 negotiations: ${agreed} agreed, ${collapsed} collapsed, ${hijacked} hijacked, ${walked} walked`);
  if (agreed === 0) fail('no negotiation ever agreed (broken convergence)');
  if (collapsed === 0) fail('no negotiation ever collapsed (patience never burns)');

  // Release clauses: deterministic, instant, priced above value.
  let s = startCareer('Barcelona');
  const market = buildMarket(s);
  const withClause = market.filter(m => releaseClauseOf(m, s.season) !== null);
  if (withClause.length < market.length * 0.25 || withClause.length > market.length * 0.45) {
    fail(`clause share ${withClause.length}/${market.length} outside 25-45%`);
  }
  const cheapClause = withClause.filter(m => releaseClauseOf(m, s.season) <= s.budget)[0];
  if (cheapClause) {
    const c1 = releaseClauseOf(cheapClause, s.season);
    const c2 = releaseClauseOf(cheapClause, s.season);
    if (c1 !== c2) fail('release clause not deterministic');
    const paid = payClause(s, cheapClause);
    if (!paid) fail('payClause refused a payable clause');
    else if (!paid.squad.some(p => p.name === cheapClause.name)) fail('clause signing not in squad');
  }

  // Loans: cap of 2, loanees leave at season end.
  s = startCareer('Racing Santander');
  const loanables = buildMarket(s).filter(m => loanEligible(s, m) && loanFeeOf(m) <= s.budget && m.rating >= 70).slice(0, 5);
  if (loanables.length < 3) fail('fewer than 3 affordable loan targets for a minnow');
  const superstarLoan = buildMarket(s).filter(m => loanEligible(s, m) && m.rating >= 88);
  if (superstarLoan.length) fail(`superstars loanable to a minnow: ${superstarLoan.slice(0, 3).map(m => m.name).join(', ')}`);
  else {
    let l1 = loanIn(s, loanables[0]);
    if (!l1) fail('first loan refused');
    else {
      let l2 = loanIn(l1, loanables[1]);
      if (!l2) fail('second loan refused');
      else {
        if (activeLoans(l2) !== 2) fail(`activeLoans ${activeLoans(l2)} after two loans`);
        if (loanIn(l2, loanables[2])) fail('third loan allowed past the cap');
        // run the season out, loanees must leave
        let st2 = l2;
        let guard = 0;
        for (;;) {
          guard += 1;
          if (guard > 90) { fail('loan season never ended'); break; }
          const res = playNextEntry(st2);
          st2 = res.state;
          if (res.kind === 'seasonOver') break;
          if (st2.sacked) break;
        }
        if (!st2.sacked && guard <= 90) {
          const { state: fin } = finishSeason(st2);
          const nextS = startNextSeason(fin);
          if (nextS.squad.some(p => p.onLoan)) fail('loan player survived into next season');
        }
      }
    }
  }

  // Incoming bids: accept pays out, reject either improves once or ends.
  let found = false;
  for (let i = 0; i < 40 && !found; i++) {
    const c = startCareer('Tottenham');
    const bids = c.incomingBids ?? [];
    if (!bids.length) continue;
    found = true;
    const bid = bids[0];
    const before = c.budget;
    const acc = acceptBid(c, bid.playerId);
    if (!acc) fail('acceptBid refused a legal sale');
    else {
      if (Math.round((acc.budget - before - bid.offer) * 10) / 10 !== 0) fail(`acceptBid paid ${acc.budget - before} not ${bid.offer}`);
      if (acc.squad.some(p => p.id === bid.playerId)) fail('sold player still in squad');
      if (!acc.careerStats.mostExpensiveSale) fail('sale did not track mostExpensiveSale');
    }
    const rej = rejectBid(c, bid.playerId);
    const after = (rej.incomingBids ?? []).find(b => b.playerId === bid.playerId);
    if (after && after.status !== 'improved') fail('rejected bid neither improved nor removed');
    if (after && after.offer <= bid.offer) fail('improved bid not higher');
  }
  if (!found) fail('no incoming bids generated across 40 window opens');

  // Window close kills the machinery.
  let w = startCareer('Lyon');
  const t = buildMarket(w).find(m => m.price <= w.budget);
  w = startNegotiation(w, t) ?? w;
  let guard = 0;
  for (;;) {
    guard += 1;
    if (guard > 20) { fail('never played a match'); break; }
    const res = playNextEntry(w);
    w = res.state;
    if (res.kind === 'match') break;
  }
  if (w.negotiation !== null) fail('negotiation survived the window closing');
  if ((w.incomingBids ?? []).length !== 0) fail('incoming bids survived the window closing');
}

/* ---------- 7. Round 73: stat lines, calendar log, the inbox ---------- */
console.log('7) Stat lines, fixture log and player DMs');
{
  const { answerMessage } = cm;
  let inboxSeen = 0, promiseBreaks = 0;
  for (const clubName of ['Arsenal', 'Inter Miami', 'Al-Nassr', 'Swansea City']) {
    let s = startCareer(clubName);
    let guard = 0;
    for (;;) {
      guard += 1;
      if (guard > 110) { fail(`${clubName}: stat season never ended`); break; }
      const res = playNextEntry(s);
      s = res.state;
      if (res.kind === 'seasonOver' || s.sacked) break;
      // Answer any open message with a random option; count promises.
      const open = (s.inbox ?? []).find(m => !m.resolved && m.options.length > 0);
      if (open) {
        inboxSeen += 1;
        const idx = Math.floor(Math.random() * open.options.length);
        if (open.options[idx].effect === 'promise') promiseBreaks += 1;
        const s2 = answerMessage(s, open.id, idx);
        if (!s2 || s2 === s) fail(`${clubName}: answerMessage did nothing`);
        else {
          const answered = (s2.inbox ?? []).find(m => m.id === open.id);
          if (!answered?.resolved) fail(`${clubName}: message not marked resolved`);
          s = s2;
        }
      }
    }
    // Stat integrity at season end.
    const gf = s.table.find(r => r.club === clubName)?.gf ?? 0;
    const playerLeagueGoals = s.squad.reduce((t, p) => t + p.seasonGoals, 0);
    // seasonGoals also count cup/UCL goals, so player total must be >= league gf is
    // not guaranteed either way; assert the softer invariants instead:
    for (const p of s.squad) {
      const apps = p.apps ?? 0;
      if (apps > 0) {
        const avg = (p.ratingSum ?? 0) / apps;
        if (!isNum(avg) || avg < 4.4 || avg > 10.01) fail(`${clubName}: ${p.name} avg rating ${avg.toFixed(2)}`);
      }
      if ((p.cleanSheets ?? 0) > apps) fail(`${clubName}: ${p.name} more clean sheets than apps`);
      if ((p.seasonYellows ?? 0) > apps * 2) fail(`${clubName}: ${p.name} absurd yellow count`);
    }
    const totalApps = s.squad.reduce((t, p) => t + (p.apps ?? 0), 0);
    if (!s.sacked && totalApps < 11 * 20) fail(`${clubName}: only ${totalApps} total apps recorded`);
    if (playerLeagueGoals === 0 && gf > 5) fail(`${clubName}: team scored ${gf} but no player has a goal`);
    // Fixture log covers every match played.
    const logLen = (s.resultLog ?? []).length;
    const played = s.careerStats.played;
    if (!s.sacked && logLen !== Math.min(played, 60)) fail(`${clubName}: resultLog ${logLen} vs played ${played}`);
    // Season rollover wipes the stat lines.
    if (!s.sacked) {
      const { state: fin } = finishSeason(s);
      const nxt = startNextSeason(fin);
      if ((nxt.resultLog ?? []).length !== 0) fail(`${clubName}: resultLog survived the season`);
      if (nxt.squad.some(p => (p.apps ?? 0) > 0 && !p.onLoan)) fail(`${clubName}: apps survived the season`);
      if ((nxt.inbox ?? []).length !== 0) fail(`${clubName}: inbox survived the season`);
    }
  }
  if (inboxSeen < 4) fail(`only ${inboxSeen} player messages across 4 seasons (generator too quiet)`);
  console.log(`   ${inboxSeen} messages answered across 4 seasons (${promiseBreaks} promises made)`);
}

console.log(failures === 0 ? '\nALL CLUB MANAGER SIMS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
