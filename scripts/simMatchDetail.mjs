/**
 * Round 157 harness: the structured match detail.
 *
 * The report grew a detail block (stats, cards, timeline, momentum, player
 * ratings) that every match screen now renders, and the rule it must hold is
 * the repo's oldest one: the screen never lies about the sim. So this drives
 * real careers down BOTH play paths (quick sim and the halftime interval,
 * with subs made) and asserts internal consistency between the detail block
 * and the match it decorates, plus the two Round 157 state books (last-5
 * form for every simulated club, cross-season head-to-head).
 *
 * What it checks, per match:
 *  - detail present, goals in the timeline equal the scoreline exactly
 *  - stats sane: possession within bounds and consistent, shots >= on target
 *    >= goals on both sides, xG positive and finite
 *  - every card and injury names a player who was actually in my XI, minutes
 *    in 1..90, cards sorted
 *  - halftime subs recorded exactly when subs were made, and never on quick sim
 *  - ratings: one line per starter, 4.5..10, exactly one man of the match
 *  - momentum: 9 buckets, all within [-1, 1]
 * And across a season:
 *  - xG tracks goals (mean absolute gap under a measured ceiling)
 *  - clubForm holds at most 5 entries per club and my own form matches state.form
 *  - h2h survives into season two while resultLog resets
 * Run: node scripts/simMatchDetail.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/cmDetailEntry.mjs';
const BUNDLE = '/tmp/cmDetail.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT}/src/lib/clubManager.ts');
export const engine = mod;
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const cm = (await import(BUNDLE)).engine;
const {
  startCareer, playNextEntry, resumeMatch, makeHalftimeSub, finishSeason,
  startNextSeason, matchFacts, benchForHalftime,
} = cm;

let failures = 0;
const fail = msg => { failures += 1; console.error('  FAIL: ' + msg); };
const isNum = v => typeof v === 'number' && Number.isFinite(v);

function checkDetail(report, ctx, { viaHalftime, subsMade }) {
  const d = report.detail;
  if (!d) { fail(`${ctx}: report has no detail block`); return; }
  const myGoals = report.home === report.away ? 0 : (report.homeGoals + report.awayGoals) - (report.won || report.drawn ? 0 : 0);
  // Read my goals off the report the same way the screen does.
  const iAmHome = report.homeGoals >= 0 && report.home && report.away && report.home !== report.away
    ? null : null;
  void myGoals; void iAmHome;

  // Timeline goals must equal the scoreline exactly, side by side.
  const tlMyGoals = d.timeline.filter(e => e.kind === 'goal' && e.side === 'me').length;
  const tlOppGoals = d.timeline.filter(e => e.kind === 'goal' && e.side === 'opp').length;
  const total = report.homeGoals + report.awayGoals;
  if (tlMyGoals + tlOppGoals !== total) {
    fail(`${ctx}: timeline holds ${tlMyGoals + tlOppGoals} goals, scoreline says ${total}`);
  }
  if (tlMyGoals !== report.myScorers.length) fail(`${ctx}: timeline my-goals ${tlMyGoals} vs scorer lines ${report.myScorers.length}`);
  if (tlOppGoals !== report.oppScorers.length) fail(`${ctx}: timeline opp-goals ${tlOppGoals} vs opp scorer lines ${report.oppScorers.length}`);

  // Stats sanity, both sides.
  const s = d.stats;
  if (!isNum(s.possession) || s.possession < 20 || s.possession > 80) fail(`${ctx}: possession ${s.possession}`);
  for (const [shots, sot, goals, tag] of [
    [s.shots, s.onTarget, report.myScorers.length, 'mine'],
    [s.oppShots, s.oppOnTarget, report.oppScorers.length, 'theirs'],
  ]) {
    if (!isNum(shots) || shots < goals) fail(`${ctx}: ${tag} shots ${shots} below goals ${goals}`);
    if (!isNum(sot) || sot < goals || sot > shots) fail(`${ctx}: ${tag} on target ${sot} vs shots ${shots}, goals ${goals}`);
  }
  if (!isNum(s.xg) || s.xg <= 0) fail(`${ctx}: xg ${s.xg}`);
  if (!isNum(s.oppXg) || s.oppXg <= 0) fail(`${ctx}: oppXg ${s.oppXg}`);
  if (!isNum(s.fouls) || !isNum(s.oppFouls)) fail(`${ctx}: fouls not numbers`);

  // Cards and injuries: real XI names, real minutes, sorted cards.
  const xiNames = new Set(d.myRatings.map(r => r.name));
  for (const c of d.cards) {
    if (!xiNames.has(c.name)) fail(`${ctx}: card for ${c.name}, who has no rating line (not in XI)`);
    if (!isNum(c.minute) || c.minute < 1 || c.minute > 90) fail(`${ctx}: card minute ${c.minute}`);
  }
  for (let i = 1; i < d.cards.length; i++) {
    if (d.cards[i].minute < d.cards[i - 1].minute) fail(`${ctx}: cards out of minute order`);
  }
  for (const inj of d.injuries) {
    if (!xiNames.has(inj.name)) fail(`${ctx}: injury for ${inj.name}, not in the XI`);
    if (!isNum(inj.weeks) || inj.weeks < 1) fail(`${ctx}: injury weeks ${inj.weeks}`);
  }

  // Subs: recorded exactly when made, never invented on a quick sim.
  if (!viaHalftime && d.subs.length > 0) fail(`${ctx}: quick sim reported ${d.subs.length} subs, none were possible`);
  if (viaHalftime && subsMade > 0 && d.subs.length !== subsMade) {
    fail(`${ctx}: made ${subsMade} halftime subs, report shows ${d.subs.length}`);
  }

  // Ratings: bounded, exactly one man of the match.
  if (d.myRatings.length < 7) fail(`${ctx}: only ${d.myRatings.length} rating lines`);
  for (const r of d.myRatings) {
    if (!isNum(r.rating) || r.rating < 4.5 || r.rating > 10) fail(`${ctx}: rating ${r.rating} for ${r.name}`);
  }
  const motm = d.myRatings.filter(r => r.motm).length;
  if (motm !== 1) fail(`${ctx}: ${motm} men of the match`);

  // Momentum: 9 buckets in [-1, 1].
  if (d.momentum.length !== 9) fail(`${ctx}: ${d.momentum.length} momentum buckets`);
  for (const m of d.momentum) if (!isNum(m) || m < -1 || m > 1) fail(`${ctx}: momentum ${m}`);

  // Timeline bookends.
  if (d.timeline[0]?.kind !== 'kickoff') fail(`${ctx}: timeline does not open with kickoff`);
  if (d.timeline[d.timeline.length - 1]?.kind !== 'fulltime') fail(`${ctx}: timeline does not close with fulltime`);
  for (let i = 1; i < d.timeline.length; i++) {
    if (d.timeline[i].minute < d.timeline[i - 1].minute) { fail(`${ctx}: timeline out of order`); break; }
  }
}

/* ---------- 1. Quick sim path: a full season of detail ---------- */
console.log('1) Quick sim path (Everton, full season)');
let state = startCareer('Everton');
let matches = 0;
let xgGapSum = 0;
let goalsSum = 0;
let guard = 0;
while (state.week < state.calendar.length && guard < 90) {
  guard += 1;
  const res = playNextEntry(state, { skipHalftime: true });
  state = res.state;
  if (res.kind === 'window') continue;
  if (res.kind === 'seasonOver') break;
  if (res.kind === 'match' && res.report) {
    matches += 1;
    checkDetail(res.report, `QS match ${matches}`, { viaHalftime: false, subsMade: 0 });
    const d = res.report.detail;
    if (d) {
      const myGoals = res.report.myScorers.length;
      xgGapSum += Math.abs(d.stats.xg - myGoals);
      goalsSum += myGoals;
    }
  }
}
if (matches < 30) fail(`only ${matches} matches played in a season`);
/* xG must TRACK goals, not equal them. Measured over five full Everton
   seasons the mean absolute gap ran 0.44 to 0.53 with the 0.55/0.45 blend,
   so 0.85 is about 60 percent of headroom above the worst observed run while
   still failing a detached xG (a pure-lambda xG would sit near the lambda's
   own mean absolute deviation from goals, which is Poisson-wide: measured
   about 0.95 on the same seasons). */
const meanGap = matches ? xgGapSum / matches : 99;
console.log(`   ${matches} matches, mean |xG - goals| = ${meanGap.toFixed(2)}, ${goalsSum} goals scored`);
if (meanGap > 0.85) fail(`xG has come detached from the football: mean gap ${meanGap.toFixed(2)}`);

/* Form book: capped at 5 everywhere, and my own book matches state.form. */
const formBook = state.clubForm ?? {};
const formClubs = Object.keys(formBook);
if (formClubs.length < 20) fail(`clubForm only covers ${formClubs.length} clubs after a season`);
for (const club of formClubs) {
  if (formBook[club].length > 5) fail(`${club} carries ${formBook[club].length} form entries`);
}
const myBook = (formBook['Everton'] ?? []).join('');
const myForm = (state.form ?? []).join('');
if (myBook !== myForm) fail(`my clubForm "${myBook}" disagrees with state.form "${myForm}"`);

/* ---------- 2. Halftime path with subs ---------- */
console.log('2) Halftime path with substitutions');
let ht = startCareer('Fulham');
let htMatches = 0;
let htGuard = 0;
while (htMatches < 6 && ht.week < ht.calendar.length && htGuard < 40) {
  htGuard += 1;
  const res = playNextEntry(ht);
  ht = res.state;
  if (res.kind === 'window') continue;
  if (res.kind === 'seasonOver') break;
  if (res.kind === 'halftime') {
    let subs = 0;
    const htMy = ht.live?.myGoals ?? 0;
    const htOpp = ht.live?.oppGoals ?? 0;
    const bench = benchForHalftime(ht);
    const onPitch = ht.live?.onPitch ?? [];
    if (bench.length > 0 && onPitch.length > 0) {
      const next = makeHalftimeSub(ht, onPitch[onPitch.length - 1], bench[0].id);
      if (next) { ht = next; subs = 1; }
    }
    const done = resumeMatch(ht);
    ht = done.state;
    if (done.report) {
      htMatches += 1;
      checkDetail(done.report, `HT match ${htMatches}`, { viaHalftime: true, subsMade: subs });
      /* Round 157's half-split fix: the scorer minutes must agree with the
         scoreboard the manager saw at the break. Before it, a match that
         stood 1-0 at the interval could report its only goal in the 80th. */
      const h1MyLines = done.report.myScorers.filter(sc => sc.minute <= 45).length;
      const h1OppLines = done.report.oppScorers.filter(sc => sc.minute <= 45).length;
      if (h1MyLines !== htMy) fail(`HT match ${htMatches}: saw ${htMy}-${htOpp} at the break but ${h1MyLines} of my scorer minutes are first half`);
      if (h1OppLines !== htOpp) fail(`HT match ${htMatches}: saw ${htMy}-${htOpp} at the break but ${h1OppLines} of their scorer minutes are first half`);
      if (subs > 0) {
        const d = done.report.detail;
        if (d && d.subs[0] && d.subs[0].minute !== 46) fail(`sub minute ${d.subs[0].minute}, expected 46`);
      }
    }
  }
}
if (htMatches < 4) fail(`only ${htMatches} halftime-path matches exercised`);

/* ---------- 3. The pre-match facts ---------- */
console.log('3) Pre-match facts');
const facts = matchFacts(ht);
if (!facts) fail('matchFacts returned null with a fixture on the calendar');
else {
  const o = facts.odds;
  if (o.win + o.draw + o.loss !== 100) fail(`odds sum to ${o.win + o.draw + o.loss}`);
  if (o.win <= 0 || o.loss <= 0) fail(`degenerate odds ${JSON.stringify(o)}`);
  if (!facts.opponent) fail('facts carry no opponent');
  if (facts.myForm.length > 5 || facts.oppForm.length > 5) fail('facts form longer than 5');
  if (facts.oppDanger.length === 0) fail(`no danger men listed for ${facts.opponent}`);
  console.log(`   next: ${facts.opponent}, odds ${o.win}/${o.draw}/${o.loss}, they have ${facts.oppDanger.length} names to watch`);
}

/* ---------- 4. Head-to-head survives the summer, the result log does not ---------- */
console.log('4) H2H across seasons');
let s2 = state;
if (s2.week < s2.calendar.length) {
  // Fast-forward the remainder so the season can be closed out.
  let g2 = 0;
  while (s2.week < s2.calendar.length && g2 < 90) {
    g2 += 1;
    const res = playNextEntry(s2, { skipHalftime: true });
    s2 = res.state;
    if (res.kind === 'seasonOver') break;
  }
}
const beforeH2h = (s2.h2h ?? []).length;
if (beforeH2h < 30) fail(`h2h book holds only ${beforeH2h} entries after a full season`);
const fin = finishSeason(s2);
const next = startNextSeason(fin.state);
if ((next.h2h ?? []).length !== beforeH2h) {
  fail(`h2h shrank over the summer: ${beforeH2h} -> ${(next.h2h ?? []).length}`);
}
if ((next.resultLog ?? []).length > 0) {
  // The season fixture log has always reset; h2h is the book that survives.
  fail(`resultLog carried ${(next.resultLog ?? []).length} entries into the new season`);
}


/* ---------- 5. Round 169: assists, the clock and the crowd ---------- */
console.log('5) Assists are real teammates, stoppage and attendance stay in band');
{
  let s = startCareer('Real Madrid');
  let matches = 0;
  let assistsSeen = 0;
  let guard = 0;
  while (matches < 25 && guard < 90) {
    guard += 1;
    const res = playNextEntry(s, { skipHalftime: true });
    s = res.state;
    if (res.kind !== 'match' || !res.report) continue;
    const rep = res.report;
    const d = rep.detail;
    matches += 1;
    if (!d) { fail('a match arrived with no detail'); continue; }
    const squadNames = new Set(s.squad.map(p => p.name));
    const gkNames = new Set(s.squad.filter(p => p.position === 'GK').map(p => p.name));
    // Every assist credits a real teammate who is not the scorer or a keeper.
    for (const sc of rep.myScorers) {
      if (!sc.assist) continue;
      assistsSeen += 1;
      if (!squadNames.has(sc.assist)) fail(`assist by ${sc.assist}, who is not in the squad`);
      if (sc.assist === sc.name) fail(`${sc.name} assisted his own goal`);
      if (gkNames.has(sc.assist)) fail(`the keeper ${sc.assist} was credited with an outfield assist`);
      const row = d.timeline.find(e => e.kind === 'goal' && e.side === 'me' && e.minute === sc.minute && e.text.includes(sc.name));
      if (!row || !row.text.includes(`assist: ${sc.assist}`)) fail(`the timeline does not carry ${sc.name}'s assist`);
    }
    // The referee's board stays in its bands and the clock rows carry it.
    if (!d.added) fail('no stoppage time on the detail');
    else {
      if (d.added.h1 < 1 || d.added.h1 > 4) fail(`h1 stoppage ${d.added.h1} out of band`);
      if (d.added.h2 < 2 || d.added.h2 > 6) fail(`h2 stoppage ${d.added.h2} out of band`);
      const ht = d.timeline.find(e => e.kind === 'halftime');
      const ft = d.timeline.find(e => e.kind === 'fulltime');
      if (!ht || !ht.text.includes(`+${d.added.h1}'`)) fail('half time row does not show its stoppage');
      if (!ft || !ft.text.includes(`+${d.added.h2}'`)) fail('full time row does not show its stoppage');
    }
    // The crowd: banded, never an invented capacity for a real ground.
    if (d.attendance === undefined) fail('no attendance on the detail');
    else {
      if (d.attendance < 9000 || d.attendance > 78000) fail(`attendance ${d.attendance} outside every band`);
      if (d.capacity !== null && d.capacity !== undefined) fail('a real ground was given an invented capacity');
    }
  }
  if (matches < 20) fail(`only ${matches} matches sampled`);
  if (assistsSeen < 5) fail(`only ${assistsSeen} assists across ${matches} matches, the 70 percent roll looks broken`);
  console.log(`   ${matches} matches, ${assistsSeen} assists verified, stoppage and crowds in band`);

  // A custom club's ground DOES know its capacity, and the crowd fits it.
  const spec = {
    name: 'Harbour City FC', stadium: 'Harbour Park',
    crest: { shape: 0, pattern: 2, color1: '#224488', color2: '#ffffff', initials: 'HC' },
    budgetTier: 'mid', leagueId: 'eredivisie', replacedClub: '',
    quality: 70, identity: 'balanced', capacity: 28000,
  };
  let c = startCareer('Harbour City FC', undefined, spec);
  let seenHome = 0;
  guard = 0;
  while (seenHome < 3 && guard < 40) {
    guard += 1;
    const res = playNextEntry(c, { skipHalftime: true });
    c = res.state;
    if (res.kind !== 'match' || !res.report?.detail) continue;
    const d = res.report.detail;
    if (d.venue === 'home') {
      seenHome += 1;
      if (d.capacity !== 28000) fail(`the custom ground's capacity reads ${d.capacity}`);
      if (d.attendance > 28000) fail(`crowd ${d.attendance} in a 28000 seat ground`);
      if (d.attendance < 28000 * 0.7) fail(`crowd ${d.attendance} under 70 percent of a custom ground`);
    }
  }
  if (seenHome < 3) fail('never saw three custom home matches');
  console.log(`   custom ground: ${seenHome} home crowds fit the chosen 28k capacity`);
}

/* ---------- 6. Round 178: the opposition ratings sheet ---------- */
console.log('6) Their eleven get rated too, honestly');
{
  /* A Premier League save: every opponent is a dense real club, so the
     sheet must exist for every match, hold a real eleven, and agree with
     the football that was played. */
  let c = startCareer('Everton');
  let seen = 0, guard6 = 0, scorerChecks = 0, gkChecks = 0;
  while (seen < 12 && guard6 < 60) {
    guard6 += 1;
    const res = playNextEntry(c, { skipHalftime: true });
    c = res.state;
    if (res.kind !== 'match' || !res.report?.detail) continue;
    /* LEAGUE matches only: every Premier League opponent is a dense club,
       so a missing sheet there is a real failure. Cup draws can pull thin
       lower-division squads whose worlds cannot field a named eleven, and
       for those a missing sheet is the honesty rule working (the thin-world
       control below pins that side on purpose). */
    if (res.report.competition !== 'league') continue;
    const d = res.report.detail;
    seen += 1;
    if (!d.oppRatings) { fail(`match ${seen}: a dense league opponent shipped no ratings sheet`); continue; }
    if (d.oppRatings.length !== 11) fail(`match ${seen}: opposition sheet holds ${d.oppRatings.length}, an XI is eleven`);
    if (!d.oppRatings.some(p => p.pos === 'GK')) fail(`match ${seen}: no keeper on the opposition sheet`);
    for (const p of d.oppRatings) {
      if (!isNum(p.rating) || p.rating < 4.5 || p.rating > 10) fail(`match ${seen}: opp rating ${p.rating} for ${p.name}`);
    }
    // Sorted best first, and the header's danger man IS the top of it.
    for (let i = 1; i < d.oppRatings.length; i++) {
      if (d.oppRatings[i].rating > d.oppRatings[i - 1].rating) { fail(`match ${seen}: opposition sheet out of order`); break; }
    }
    if (d.oppBest !== d.oppRatings[0].name) fail(`match ${seen}: oppBest "${d.oppBest}" is not the top of the sheet "${d.oppRatings[0].name}"`);
    // Every opposition scorer is ON the sheet with his goals counted.
    for (const sc of res.report.oppScorers) {
      scorerChecks += 1;
      const line = d.oppRatings.find(p => p.name === sc.name);
      if (!line) fail(`match ${seen}: scorer ${sc.name} is not on the opposition sheet`);
    }
    const sheetGoals = d.oppRatings.reduce((s, p) => s + p.goals, 0);
    if (sheetGoals !== res.report.oppScorers.length) fail(`match ${seen}: sheet credits ${sheetGoals} goals, they scored ${res.report.oppScorers.length}`);
    // A clean sheet they kept must show on their keeper (base + 0.5 floor).
    const gk = d.oppRatings.find(p => p.pos === 'GK');
    const myGoals = res.report.myScorers.length;
    if (gk && myGoals === 0) {
      gkChecks += 1;
      const oppWon = res.report.won === false && res.report.drawn === false;
      const floor = (oppWon ? 7.0 : res.report.drawn ? 6.4 : 5.7) + 0.5 - 0.6;
      if (gk.rating < floor - 0.001) fail(`match ${seen}: their keeper kept a clean sheet and rates ${gk.rating}, floor ${floor.toFixed(1)}`);
    }
  }
  if (seen < 12) fail(`only ${seen} matches sampled for opposition sheets`);
  console.log(`   ${seen} sheets checked: XIs of 11, ${scorerChecks} scorers all on the pitch, ${gkChecks} clean-sheet keepers floored right`);

  /* The honesty edge: an opponent whose world cannot field a real eleven
     (a KNOWN_EMPTY youth-padded club) must ship NO sheet rather than an
     invented one. Austria Lustenau bakes zero real players, so a Ried save
     meets them inside a 12 club league quickly. */
  let thin = startCareer('Ried');
  let thinSeen = 0, emptySheetHits = 0, guard7 = 0;
  while (guard7 < 60 && thinSeen < 40) {
    guard7 += 1;
    const res = playNextEntry(thin, { skipHalftime: true });
    thin = res.state;
    if (res.kind === 'seasonOver') break;
    if (res.kind !== 'match' || !res.report?.detail) continue;
    thinSeen += 1;
    const opp = res.report.home === 'Ried' ? res.report.away : res.report.home;
    if (opp === 'Austria Lustenau') {
      emptySheetHits += 1;
      if (res.report.detail.oppRatings) fail('a zero-player club got an invented ratings sheet');
    }
  }
  if (emptySheetHits === 0) fail('a full Austrian season never met Lustenau, the thin-world control never ran');
  console.log(`   thin-world control: ${emptySheetHits} Lustenau meetings, all sheetless as designed`);
}

if (failures > 0) {
  console.error(`simMatchDetail: ${failures} FAILURES`);
  process.exit(1);
}
console.log('simMatchDetail: all green');
