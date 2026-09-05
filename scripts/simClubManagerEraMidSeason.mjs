/* Club Manager: an era save's league tables are live mid season, and the
   Cups tab shows the cup it names.

   Round 451. Two P1s from the owner's 2026-08-28 review, items 2 and 3 of
   docs/TWEAKS-2026-08-28.md, both hit three matches into a 2005/06 Barcelona
   save:

     2. La Liga's own table was right, every OTHER league still read
        "pre-season, alphabetical order" with no points and no games, and La
        Liga appeared twice in the picker (the starred one right, the other
        all zeros).
     3. The Cups tab listed the Copa del Rey as alive and rendered the
        Champions League table under it, and the projected quarter finals
        left out his second placed club.

   Round 312 fixed the causes the same day: syncWorld walked the MODERN
   league list (ids premier, laliga) so an era world keyed premier2005 never
   advanced a round, the picker came off the same modern list, and the cups
   panel had never mounted the domestic bracket card at all, so the UCL
   groups sat straight under the cup line. The reconciliation table still
   called both OPEN and unverified, because nothing had driven his exact save
   to his exact week and asked what his screenshots asked. This harness does,
   through the engine's own loop, and it is the fence.

   Sections:
     1) HIS SAVE, HIS WEEK. 2005/06 Barcelona, three matches played the way
        the page plays them (kick off, the interval, resume), then the January
        window, round 19 and the final whistle, over several careers, plus
        Chelsea 2005, Barcelona 2010 and Juventus 2015 so every era's world is
        covered. At every checkpoint: my table and every world table have the
        league's own clubs, games played equal to the rounds passed, points
        equal to three wins plus draws, goals for equal to goals against
        across the league, wins equal to losses, and positions in the order
        sortedTable promises; every world league sits on the round my own
        progress puts it on; the picker lists the era's leagues once each and
        the world simulates exactly that list; and no other league reads
        "pre-season" once I have played three rounds (the reported line).
     2) THE MODERN WORLD, the control the fix must not break, Arsenal and an
        odd sized MLS conference through the same checks.
     3) THE CUPS TAB DATA, checked after every step of every career in 1: the
        alive flags exactly as ClubManager.tsx derives them agree with the
        bracket, the line's next opponent is the bracket's, the domestic draw
        is sixteen clubs of the era's own league and never a Champions League
        group opponent, and every cup round is settled and the next one drawn
        once its week has passed, whether or not I am still in it.
     4) THE CUPS TAB RENDERED. The real CupBracketCard and UclGroupsCard
        through react-dom/server on his day one and three match states: the
        cup card names the cup and all sixteen clubs and never a European
        opponent; the UCL card names Group A and my three opponents and never
        the cup.
     5) THE PROJECTION FOLLOWS THE TABLE, at every group matchday of every
        career: top two in Group A means I am in the projected quarter finals,
        third or fourth means I am not, nobody is projected from outside a
        top two, no group is paired against itself, and the real draw at
        matchday 6 includes me exactly when the table says so.
     6) SOURCE SHAPE, comment stripped: the cups panel runs cup line, cup
        bracket, Champions League header, UCL groups, in that order; syncWorld
        iterates worldLeagueDefs(state); WorldTablesCard builds its picker
        from worldLeagueDefs(career).

   Negative controls (house rule: prove the checks can fail, and refuse to run
   if the rewrite finds nothing to rewrite):
     CM_ERA_CONTROL=world      bundles a copy of the engine with syncWorld's
       loop put back on REAL_LEAGUES, the exact pre-312 line. Section 1 must
       go red (measured: every era world league on round zero and reading
       "pre-season, alphabetical order" at every checkpoint from his three
       match week to the final whistle, and no frozen save healing, 120
       findings) while section 2 stays green, because the modern ids still
       match.
     CM_ERA_CONTROL=cupspanel  reads ClubManager.tsx with the CupBracketCard
       mount removed from the cups panel, the pre-312 page. Section 6 must go
       red (measured: 1 finding).

   Sample floors are the measured counts with headroom, not a number that felt
   right. On the harness stream: 55 era checkpoints (floor 40), 11 three match
   weeks (floor 8), 12 frozen leagues healed (floor 8), 44 cards rendered
   (floor 40), 1133 looks at a passed cup round (floor 300), my club second in
   20 of 60 group matchday checks (floor 4; 12 on the control's stream, 16
   and 18 on two other seeds), 12 real draws (floor 8), 10 modern checkpoints
   (floor 6; 7 on the control's stream, where a sacking cut one career short).

   Run: node scripts/simClubManagerEraMidSeason.mjs
*/
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const CONTROL = process.env.CM_ERA_CONTROL || '';
if (CONTROL && CONTROL !== 'world' && CONTROL !== 'cupspanel') {
  console.error(`CM_ERA_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

/* Findings are kept per concern so each section reports its own, whatever
   order the driver found them in. */
const buckets = { world: [], modern: [], cups: [], render: [], proj: [], shape: [] };
const note = (bucket, m) => buckets[bucket].push(m);
const lf = s => s.replaceAll('\r\n', '\n');
const stripComments = s => lf(s).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

/* ---- the engine, regressed to the pre-312 loop when the control asks ---- */
const ENGINE = path.join(ROOT, 'src', 'lib', 'clubManager.ts');
let enginePath = `${ROOT_URL}/src/lib/clubManager.ts`;
if (CONTROL === 'world') {
  const src = lf(fs.readFileSync(ENGINE, 'utf8'));
  const fixed = '  for (const lg of worldLeagueDefs(state)) {\n    const w = state.world[lg.id];';
  const broken = '  for (const lg of REAL_LEAGUES.map(effectiveLeague)) {\n    const w = state.world[lg.id];';
  if (!src.includes(fixed)) {
    console.error('control cannot run: syncWorld is not in the shape CM_ERA_CONTROL=world rewrites');
    process.exit(1);
  }
  enginePath = `${TMP}/clubManagerEraMidSeason.control.ts`;
  fs.writeFileSync(enginePath, src.replace(fixed, broken));
  console.log('NEGATIVE CONTROL ON: syncWorld walks the modern league list again, so every era world league must freeze on round zero');
}

/* The engine and the two real cards in one CommonJS bundle, because
   react-dom/server is CommonJS and wants node builtins (the simFantasyDraftPool
   recipe). Under the world control the cards import the untouched engine on
   disk while the driver runs the rewritten copy; the cards are pure functions
   of the state they are handed, so that is fine. */
const ENTRY = `${TMP}/clubManagerEraMidSeason.entry.mjs`;
const BUNDLE = `${TMP}/clubManagerEraMidSeason.bundle.cjs`;
fs.writeFileSync(ENTRY, `
export * as cm from '${enginePath}';
export { CupBracketCard } from '${ROOT_URL}/src/components/club-manager/CupBracketCard.tsx';
export { UclGroupsCard } from '${ROOT_URL}/src/components/club-manager/UclGroupsCard.tsx';
import React from '${ROOT_URL}/node_modules/react/index.js';
import { renderToStaticMarkup } from '${ROOT_URL}/node_modules/react-dom/server.node.js';
export const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=cjs --platform=node --jsx=automatic --alias:@=${ROOT_URL}/src --outfile="${BUNDLE}" --log-level=error`, {
  stdio: 'inherit',
  env: { ...process.env, NODE_PATH: `${ROOT}/node_modules` },
});
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const { cm, CupBracketCard, UclGroupsCard, render } = createRequire(import.meta.url)(BUNDLE);
const {
  startCareer, playNextEntry, resumeMatch, sortedTable, worldLeagueDefs, careerLeagueOf,
  leagueRounds, projectedUclBracket, ERA_LEAGUES,
} = cm;

/* ---------- driving the engine the way the page does ---------- */
const leaguePlayed = s => s.calendar.slice(0, s.week).filter(e => e.type === 'league').length;

/** My next n matches through the dressing room: kick off, stop at the
    interval, resume. Every other harness fast forwards past it; the owner's
    three matches did not. */
function playMatchesLive(s, n, onStep) {
  let played = 0, guard = 0;
  while (played < n && guard++ < 60) {
    const r = playNextEntry(s);
    s = r.state;
    if (r.kind === 'halftime') { s = resumeMatch(s).state; played += 1; }
    else if (r.kind === 'match') played += 1;
    else if (r.kind === 'seasonOver') break;
    onStep?.(s);
  }
  return s;
}

/** Fast forward until stop(state, result) says so, or the season ends. */
function playUntil(s, stop, onStep) {
  let guard = 0;
  while (guard++ < 160) {
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    onStep?.(s);
    if (r.kind === 'seasonOver' || s.sacked) break;
    if (stop(s, r)) break;
  }
  return s;
}

/* ---------- the table invariants ---------- */
function checkTable(bucket, label, rows, clubs, roundsPlayed) {
  const even = clubs.length % 2 === 0;
  const set = new Set(rows.map(r => r.club));
  if (set.size !== rows.length) note(bucket, `${label}: a club appears twice in the table`);
  if (set.size !== clubs.length || clubs.some(c => !set.has(c))) note(bucket, `${label}: the table is not the league's own clubs`);
  let gf = 0, ga = 0, w = 0, l = 0;
  for (const r of rows) {
    const played = r.w + r.d + r.l;
    /* An odd sized league carries a bye, so a club can be up to two games
       short of the round count over a season; an even one plays every round. */
    const bad = even ? played !== roundsPlayed : (played > roundsPlayed || played < roundsPlayed - 2);
    if (bad) note(bucket, `${label}: ${r.club} has played ${played} after ${roundsPlayed} rounds`);
    if (r.pts !== 3 * r.w + r.d) note(bucket, `${label}: ${r.club} has ${r.pts} points from ${r.w} wins and ${r.d} draws`);
    if (![r.gf, r.ga].every(v => Number.isInteger(v) && v >= 0)) note(bucket, `${label}: ${r.club} goals read ${r.gf}:${r.ga}`);
    gf += r.gf; ga += r.ga; w += r.w; l += r.l;
  }
  if (gf !== ga) note(bucket, `${label}: goals for ${gf} do not equal goals against ${ga}`);
  if (w !== l) note(bucket, `${label}: ${w} wins against ${l} losses`);
  const sorted = sortedTable(rows);
  const key = r => [r.pts, r.gf - r.ga, r.gf];
  for (let i = 1; i < sorted.length; i++) {
    const a = key(sorted[i - 1]), b = key(sorted[i]);
    if ((a[0] - b[0] || a[1] - b[1] || a[2] - b[2]) < 0) {
      note(bucket, `${label}: ${sorted[i].club} sits below ${sorted[i - 1].club} with the better record`);
    }
  }
  return rows.length;
}

/** Everything the world tables screen reads, at one checkpoint. */
function checkWorld(bucket, label, s, isEra) {
  const my = careerLeagueOf(s);
  const myPlayed = leaguePlayed(s);
  const myTotal = leagueRounds(my.clubs.length);
  const out = { rows: 0, leagues: 0, frozen: 0, adjacentLevel: 0, adjacentPairs: 0 };
  out.rows += checkTable(bucket, `${label}, ${my.name}`, s.table, s.leagueClubs, myPlayed);
  const defs = worldLeagueDefs(s);
  // The card's own list: my league first, then the rest of the save's world.
  const picker = [my, ...defs.filter(l => l.id !== my.id)];
  const names = picker.map(l => l.name);
  if (new Set(names).size !== names.length) note(bucket, `${label}: the picker repeats a league name (${names.join(', ')})`);
  if (isEra) {
    const eraIds = new Set((ERA_LEAGUES[s.eraId] ?? []).map(l => l.id));
    for (const l of picker) if (!eraIds.has(l.id)) note(bucket, `${label}: the picker offers ${l.id}, which is not a ${s.eraId} league`);
  }
  const worldIds = Object.keys(s.world ?? {}).sort().join(',');
  const wantIds = defs.filter(l => l.id !== my.id).map(l => l.id).sort().join(',');
  if (worldIds !== wantIds) note(bucket, `${label}: the world simulates [${worldIds}] where the picker lists [${wantIds}]`);
  for (const lg of defs) {
    if (lg.id === my.id) continue;
    const w = s.world?.[lg.id];
    if (!w) { note(bucket, `${label}: ${lg.id} has no world entry`); continue; }
    out.leagues += 1;
    const total = leagueRounds(lg.clubs.length);
    const target = Math.min(total, Math.round(total * Math.min(1, myTotal > 0 ? myPlayed / myTotal : 0)));
    if (w.round !== target) note(bucket, `${label}: ${lg.name} is on round ${w.round} where my ${myPlayed} of ${myTotal} puts it on ${target}`);
    // The card's own preseason test, the line his screenshot showed.
    const preseason = w.table.every(r => r.w + r.d + r.l === 0);
    if (myPlayed >= 3 && preseason) {
      out.frozen += 1;
      note(bucket, `${label}: ${lg.name} still reads "pre-season, alphabetical order" after ${myPlayed} of my rounds (the reported bug)`);
    }
    out.rows += checkTable(bucket, `${label}, ${lg.name}`, w.table, lg.clubs, w.round);
  }
  /* Information for the record, never asserted: how often the final table
     has neighbours level on points. Spain and Italy split those on head to
     head, which the engine does not keep (it stores no per pair results), so
     every level pair here is split on goal difference instead. */
  if (myPlayed === myTotal) {
    const sorted = sortedTable(s.table);
    for (let i = 1; i < sorted.length; i++) {
      out.adjacentPairs += 1;
      if (sorted[i].pts === sorted[i - 1].pts) out.adjacentLevel += 1;
    }
  }
  return out;
}

/** Round 312 said an era save frozen by the old loop heals itself through
    syncWorld's catch up path. Nothing ever proved it: take a real mid season
    state, zero its world the way the old engine left it, and one step of the
    engine must bring every league back to the round my progress puts it on. */
function checkHeal(bucket, label, s, isEra, tally) {
  const frozen = JSON.parse(JSON.stringify(s));
  for (const w of Object.values(frozen.world ?? {})) {
    w.round = 0;
    for (const r of w.table) { r.w = 0; r.d = 0; r.l = 0; r.gf = 0; r.ga = 0; r.pts = 0; }
  }
  const healed = playNextEntry(frozen, { skipHalftime: true }).state;
  if (healed.live || healed.sacked) return;
  const before = Object.values(frozen.world ?? {}).length;
  const o = checkWorld(bucket, `${label}, frozen save after one step`, healed, isEra);
  tally.healed += before;
  tally.rows += o.rows;
}

/* ---------- the cups tab, exactly as ClubManager.tsx derives it ---------- */
const CUP_ROUNDS = ['R16', 'QF', 'SF', 'F'];
function checkCups(label, s, ctx) {
  if (s.live) return;
  const lg = careerLeagueOf(s);
  const cupAlive = s.cupRound !== 'out' && s.cupRound !== 'won';
  const uclAlive = (s.uclGroup !== null && s.uclKoRound === null) || (!!s.uclKoRound && s.uclKoRound !== 'out' && s.uclKoRound !== 'won');
  const br = s.cupBracket ?? [];
  ctx.steps += 1;
  if (!br.length) { note('cups', `${label}: no ${lg.cupName} bracket at all, so the tab has nothing to show under the cup line`); return; }
  const r16 = br.filter(t => t.round === 'R16');
  const r16Clubs = r16.flatMap(t => [t.home, t.away]);
  if (r16.length !== 8 || new Set(r16Clubs).size !== 16) note('cups', `${label}: the ${lg.cupName} last sixteen is ${r16.length} ties over ${new Set(r16Clubs).size} clubs`);
  if (!r16.some(t => t.mine && (t.home === s.clubName || t.away === s.clubName))) note('cups', `${label}: I am not in the ${lg.cupName} last sixteen`);
  if (ctx.isEra) {
    const own = new Set(lg.clubs);
    for (const c of r16Clubs) if (c !== s.clubName && !own.has(c)) note('cups', `${label}: ${c} is in the ${lg.cupName} draw and not in ${lg.name} that season`);
  }
  const euro = new Set(s.uclGroup?.opponents ?? []);
  for (const c of r16Clubs) if (euro.has(c)) note('cups', `${label}: ${c} is a Champions League group opponent AND in the ${lg.cupName} draw`);
  if (cupAlive) {
    const tie = br.find(t => t.round === s.cupRound && t.mine);
    if (!tie) note('cups', `${label}: the tab says ${lg.cupName} alive at the ${s.cupRound} and the bracket has no tie for me there`);
    else {
      if (tie.winner !== null) note('cups', `${label}: ${lg.cupName} reads alive at the ${s.cupRound} but that tie is already settled (${tie.winner})`);
      const opp = tie.home === s.clubName ? tie.away : tie.home;
      if (s.cupDraw[s.cupRound] !== opp) note('cups', `${label}: the cup line names ${s.cupDraw[s.cupRound]} and the bracket names ${opp}`);
    }
    ctx.alive += 1;
  } else if (s.cupRound === 'out') {
    const tie = br.find(t => t.round === (s.cupExit ?? 'R16') && t.mine);
    if (!tie || tie.winner === null || tie.winner === s.clubName) note('cups', `${label}: the tab says out at the ${s.cupExit} and the bracket disagrees`);
    ctx.out += 1;
  } else if (s.cupRound === 'won') {
    const f = br.find(t => t.round === 'F');
    if (!f || f.winner !== s.clubName) note('cups', `${label}: the tab says the cup is won and the final says ${f?.winner}`);
    ctx.won += 1;
  }
  // The bracket moves with the calendar whether or not I am still in it.
  CUP_ROUNDS.forEach((R, i) => {
    const idx = s.calendar.findIndex(e => e.type === 'cup' && e.cupRound === R);
    if (idx < 0 || s.week <= idx) return;
    const ties = br.filter(t => t.round === R);
    if (ties.length !== (8 >> i)) note('cups', `${label}: the ${R} has ${ties.length} ties after its week`);
    if (ties.some(t => t.winner === null)) note('cups', `${label}: the ${R} week has passed and a tie in it is still unplayed`);
    const next = CUP_ROUNDS[i + 1];
    if (next && br.filter(t => t.round === next).length !== (8 >> (i + 1))) note('cups', `${label}: the ${R} is done and the ${next} is not drawn`);
    ctx.settled += 1;
  });
  // Europe's own alive flag against the bracket it came from.
  if (uclAlive && s.uclKoRound && !(s.uclBracket ?? []).some(t => t.round === s.uclKoRound && t.mine)) {
    note('cups', `${label}: alive in the Champions League ${s.uclKoRound} with no tie in the bracket`);
  }
}

/* ---------- the projection against the group table ---------- */
function checkProjection(label, s, ctx) {
  if (s.live || !s.uclGroup) return;
  const g = s.uclGroup;
  const pos = sortedTable(g.table).findIndex(r => r.club === s.clubName) + 1;
  if (s.uclKoRound !== null) {
    if (ctx.drawChecked) return;
    ctx.drawChecked = true;
    const inDraw = (s.uclBracket ?? []).some(t => t.round === 'QF' && (t.home === s.clubName || t.away === s.clubName));
    if ((pos <= 2) !== inDraw) note('proj', `${label}: I finished ${pos}${pos === 1 ? 'st' : pos === 2 ? 'nd' : pos === 3 ? 'rd' : 'th'} in Group A and the real quarter final draw ${inDraw ? 'has' : 'does not have'} me`);
    return;
  }
  if (g.matchday < 1 || g.matchday === ctx.lastMd) return;
  ctx.lastMd = g.matchday;
  const proj = projectedUclBracket(s);
  if (!proj || !proj.length) { note('proj', `${label}: no projected bracket at MD${g.matchday}`); return; }
  ctx.mdChecks += 1;
  if (pos === 2) ctx.secondChecks += 1;
  const inProj = proj.some(p => p.home === s.clubName || p.away === s.clubName);
  if (pos <= 2 && !inProj) note('proj', `${label}: my club is ${pos === 1 ? 'top' : 'second'} of Group A at MD${g.matchday} and missing from the projected quarter finals (the reported bug)`);
  if (pos > 2 && inProj) note('proj', `${label}: my club is ${pos}th of Group A at MD${g.matchday} and still projected through`);
  const groupOf = new Map(g.table.map(r => [r.club, 'A']));
  const topTwo = new Set(sortedTable(g.table).slice(0, 2).map(r => r.club));
  for (const w of s.uclWorld ?? []) {
    for (const c of w.clubs) groupOf.set(c, w.letter);
    for (const r of sortedTable(w.table).slice(0, 2)) topTwo.add(r.club);
  }
  const clubs = proj.flatMap(p => [p.home, p.away]);
  if (new Set(clubs).size !== clubs.length) note('proj', `${label}: a club is projected into two quarter finals at MD${g.matchday}`);
  for (const c of clubs) if (!topTwo.has(c)) note('proj', `${label}: ${c} is projected through from outside its group's top two at MD${g.matchday}`);
  for (const p of proj) if (groupOf.get(p.home) && groupOf.get(p.home) === groupOf.get(p.away)) note('proj', `${label}: ${p.home} v ${p.away} pairs a group against itself at MD${g.matchday}`);
}

/* ---------- the rendered cards ---------- */
function checkRender(label, s, ctx) {
  const lg = careerLeagueOf(s);
  const cupHtml = render(CupBracketCard, { career: s });
  const uclHtml = render(UclGroupsCard, { career: s });
  ctx.renders += 2;
  if (!cupHtml.includes(`${lg.cupName} bracket`)) note('render', `${label}: the cup card does not title itself "${lg.cupName} bracket" (${cupHtml.length} chars rendered)`);
  const r16Clubs = (s.cupBracket ?? []).filter(t => t.round === 'R16').flatMap(t => [t.home, t.away]);
  for (const c of r16Clubs) if (!cupHtml.includes(c)) note('render', `${label}: the cup card never prints ${c}`);
  if (/Champions League|UCL Group/.test(cupHtml)) note('render', `${label}: the cup card mentions the Champions League`);
  for (const c of s.uclGroup?.opponents ?? []) if (cupHtml.includes(c)) note('render', `${label}: the cup card prints my European opponent ${c}`);
  if (!uclHtml.includes('UCL Group A')) note('render', `${label}: the UCL card does not show Group A`);
  for (const c of s.uclGroup?.opponents ?? []) if (!uclHtml.includes(c)) note('render', `${label}: the UCL card never prints my group opponent ${c}`);
  if (uclHtml.includes(lg.cupName)) note('render', `${label}: the UCL card mentions the ${lg.cupName}`);
  /* Round 462: an era with a round of 16 projects that round; the heading
     names whichever round the engine will actually seed. */
  const projected = cm.uclFirstKoRound(s) === 'R16' ? 'Projected round of 16' : 'Projected quarter-finals';
  if (!uclHtml.includes(projected)) note('render', `${label}: the UCL card has no "${projected}"`);
}

/* ---------- the driver: one career, every checkpoint ---------- */
function runCareer(bucket, tag, club, eraId, tally) {
  const isEra = !!eraId;
  const ctxCups = { isEra, steps: 0, alive: 0, out: 0, won: 0, settled: 0 };
  const ctxProj = { lastMd: 0, mdChecks: 0, secondChecks: 0, drawChecked: false };
  const step = st => { checkCups(tag, st, ctxCups); checkProjection(tag, st, ctxProj); };
  const world = (label, st) => {
    const o = checkWorld(bucket, `${tag} ${label}`, st, isEra);
    tally.checkpoints += 1; tally.rows += o.rows; tally.leagues += o.leagues; tally.frozen += o.frozen;
    tally.adjacentLevel += o.adjacentLevel; tally.adjacentPairs += o.adjacentPairs;
  };
  let s = eraId ? startCareer(club, eraId) : startCareer(club);
  world('day one', s);
  step(s);
  if (isEra) checkRender(`${tag} day one`, s, tally);
  s = playMatchesLive(s, 3, step);
  if (isEra && leaguePlayed(s) !== 3) note(bucket, `${tag}: three matches in, ${leaguePlayed(s)} league rounds have passed rather than three`);
  world('three matches', s);
  tally.threeMatchWeeks += 1;
  if (isEra) checkRender(`${tag} three matches`, s, tally);
  s = playUntil(s, (st, r) => r.kind === 'window', step);
  if (!s.sacked) world('January window', s);
  s = playUntil(s, st => leaguePlayed(st) >= 19, step);
  if (!s.sacked) { world('round 19', s); checkHeal(bucket, `${tag} round 19`, s, isEra, tally); }
  s = playUntil(s, () => false, step);
  if (!s.sacked) {
    world('final whistle', s);
    const my = careerLeagueOf(s);
    if (leaguePlayed(s) !== leagueRounds(my.clubs.length)) note(bucket, `${tag}: the season ended after ${leaguePlayed(s)} of ${leagueRounds(my.clubs.length)} rounds`);
  } else tally.sacked += 1;
  tally.cupSteps += ctxCups.steps; tally.cupAlive += ctxCups.alive; tally.cupOut += ctxCups.out; tally.cupWon += ctxCups.won; tally.cupSettled += ctxCups.settled;
  tally.mdChecks += ctxProj.mdChecks; tally.secondChecks += ctxProj.secondChecks; if (ctxProj.drawChecked) tally.draws += 1;
}
const newTally = () => ({ checkpoints: 0, rows: 0, leagues: 0, frozen: 0, threeMatchWeeks: 0, sacked: 0, healed: 0, adjacentLevel: 0, adjacentPairs: 0,
  cupSteps: 0, cupAlive: 0, cupOut: 0, cupWon: 0, cupSettled: 0, mdChecks: 0, secondChecks: 0, draws: 0, renders: 0 });

const era = newTally();
for (let i = 0; i < 8; i++) runCareer('world', `Barcelona 2005 career ${i + 1}`, 'Barcelona', 'era2005', era);
runCareer('world', 'Chelsea 2005', 'Chelsea', 'era2005', era);
runCareer('world', 'Barcelona 2010', 'Barcelona', 'era2010', era);
runCareer('world', 'Juventus 2015', 'Juventus', 'era2015', era);
const modern = newTally();
runCareer('modern', 'Arsenal', 'Arsenal', undefined, modern);
runCareer('modern', 'Inter Miami', 'Inter Miami', undefined, modern);

/* ---------- the report ---------- */
let failures = 0;
function section(title, bucket, lines, extra) {
  console.log(title);
  for (const l of lines) console.log('   ' + l);
  extra?.();
  for (const m of buckets[bucket]) console.error('  FAIL: ' + m);
  failures += buckets[bucket].length;
}

section('1) His save, his week: 2005/06 Barcelona, three matches through the dressing room, then the window, round 19 and the final whistle', 'world', [
  `${era.checkpoints} world checkpoints over 11 era careers (${era.threeMatchWeeks} of them his three match week): ${era.rows} table rows across ${era.leagues} other league tables checked, ${era.frozen} still reading pre-season`,
  `${era.healed} world leagues zeroed the way the old engine left them and put through one step of the engine`,
  `final tables: ${era.adjacentLevel} of ${era.adjacentPairs} neighbouring pairs level on points, all split on goal difference (Spain and Italy split those on head to head, which the engine does not keep)`,
], () => {
  if (era.checkpoints < 40) note('world', `only ${era.checkpoints} era checkpoints, the sample is too thin to mean anything (floor 40, measured 55)`);
  if (era.threeMatchWeeks < 8) note('world', `only ${era.threeMatchWeeks} three match weeks checked (floor 8, measured 11)`);
  if (era.healed < 8) note('world', `only ${era.healed} frozen world leagues put through the heal (floor 8, measured 13)`);
  if (era.sacked > 2) note('world', `${era.sacked} era careers ended in the sack before the final whistle`);
});

section('2) The modern world still advances (the control the fix must not break)', 'modern', [
  `${modern.checkpoints} checkpoints over Arsenal and an odd sized MLS conference: ${modern.rows} rows across ${modern.leagues} other league tables, ${modern.frozen} frozen`,
], () => {
  if (modern.checkpoints < 6) note('modern', `only ${modern.checkpoints} modern checkpoints (floor 6, measured 10)`);
});

section('3) The Cups tab data agrees with the bracket at every step', 'cups', [
  `${era.cupSteps + modern.cupSteps} steps checked: the cup read alive on ${era.cupAlive + modern.cupAlive}, out on ${era.cupOut + modern.cupOut}, won on ${era.cupWon + modern.cupWon}; ${era.cupSettled + modern.cupSettled} looks at a cup round whose week had passed found it settled with the next round drawn`,
], () => {
  if (era.cupOut + modern.cupOut === 0) note('cups', 'no career ever went out of the cup, so the bracket was never checked carrying on without me');
  if (era.cupSettled + modern.cupSettled < 300) note('cups', `only ${era.cupSettled + modern.cupSettled} looks at passed cup rounds (floor 300, measured 1162)`);
});

section('4) The Cups tab rendered: the cup card is the cup, the UCL card is Europe', 'render', [
  `${era.renders} cards rendered through react-dom/server on day one and three match states`,
], () => {
  if (era.renders < 40) note('render', `only ${era.renders} cards rendered (floor 40, measured 44)`);
});

section('5) The projected quarter finals follow the group table, and the real draw agrees', 'proj', [
  `${era.mdChecks + modern.mdChecks} group matchdays checked, my club second in ${era.secondChecks + modern.secondChecks} of them; ${era.draws + modern.draws} real draws checked against the final group position`,
], () => {
  if (era.secondChecks + modern.secondChecks < 4) note('proj', `my club was second in only ${era.secondChecks + modern.secondChecks} matchday checks, so the reported case was barely exercised (floor 4, measured 9)`);
  if (era.draws + modern.draws < 8) note('proj', `only ${era.draws + modern.draws} real draws checked (floor 8, measured 13)`);
});

/* ---------- 6. source shape ---------- */
{
  let page = fs.readFileSync(path.join(ROOT, 'src', 'pages', 'ClubManager.tsx'), 'utf8');
  if (CONTROL === 'cupspanel') {
    const mount = '<CupBracketCard career={c} onClubClick={setClubView} />';
    if (!lf(page).includes(mount)) {
      console.error('control cannot run: the cups panel does not mount CupBracketCard in the shape CM_ERA_CONTROL=cupspanel removes');
      process.exit(1);
    }
    page = lf(page).replace(mount, '');
    console.log('NEGATIVE CONTROL ON: the CupBracketCard mount removed from the cups panel in memory, the pre-312 page, section 6 must go red');
  }
  const code = stripComments(page);
  const start = code.indexOf("hubPanel === 'cups'");
  const end = start >= 0 ? code.indexOf("hubPanel === 'finance'", start) : -1;
  const block = start >= 0 && end > start ? code.slice(start, end) : '';
  if (!block) note('shape', 'cannot find the cups panel in ClubManager.tsx');
  else {
    const cupLine = block.indexOf('cupName');
    const cupCard = block.indexOf('<CupBracketCard');
    const uclHead = block.indexOf('Champions League');
    const uclGroups = block.indexOf('<UclGroupsCard');
    if (cupCard < 0) note('shape', 'the cups panel never mounts CupBracketCard, so the cup line is followed by whatever comes next (the pre-312 shape)');
    else if (!(cupLine >= 0 && cupLine < cupCard && cupCard < uclHead && uclHead < uclGroups)) {
      note('shape', 'the cups panel does not run cup line, cup bracket, Champions League header, UCL groups in that order');
    }
  }
  const eng = stripComments(fs.readFileSync(ENGINE, 'utf8'));
  const syncStart = eng.indexOf('function syncWorld');
  const syncBody = syncStart >= 0 ? eng.slice(syncStart, eng.indexOf('\nfunction ', syncStart + 10)) : '';
  if (!/for \(const lg of worldLeagueDefs\(state\)\)/.test(syncBody)) note('shape', 'syncWorld does not iterate worldLeagueDefs(state), so era worlds would freeze again');
  const card = stripComments(fs.readFileSync(path.join(ROOT, 'src', 'components', 'club-manager', 'WorldTablesCard.tsx'), 'utf8'));
  if (!/worldLeagueDefs\(career\)/.test(card)) note('shape', 'WorldTablesCard does not build its picker from worldLeagueDefs(career)');
  section('6) Source shape: the cups panel order, the era aware loop, the era aware picker', 'shape', [
    'cups panel, syncWorld and WorldTablesCard read on the comment stripped source',
  ]);
}

console.log('');
if (CONTROL === 'world') {
  /* The old loop must freeze every era world and leave the modern one
     moving. A sample floor tripping on the control's shifted stream is not a
     frozen modern league, so only the freeze findings decide this verdict. */
  const isFreeze = m => /pre-season|is on round/.test(m);
  const hit = buckets.world.filter(isFreeze).length;
  const modernFrozen = buckets.modern.filter(isFreeze).length;
  if (hit > 0 && modernFrozen === 0) { console.log(`simClubManagerEraMidSeason control: green. The pre-312 loop froze the era world and was reported (${hit} freeze findings, ${buckets.world.length} in all; the modern world kept moving).`); process.exit(0); }
  console.error(`simClubManagerEraMidSeason control: RED. The pre-312 loop went unreported (${hit} era freeze findings, ${modernFrozen} modern).`); process.exit(1);
}
if (CONTROL === 'cupspanel') {
  if (buckets.shape.length > 0) { console.log(`simClubManagerEraMidSeason control: green. The unmounted cup bracket was reported (${buckets.shape.length} finding).`); process.exit(0); }
  console.error('simClubManagerEraMidSeason control: RED. The pre-312 cups panel went unreported.'); process.exit(1);
}
if (failures > 0) { console.error(`\nsimClubManagerEraMidSeason: ${failures} FAILURE(S)`); process.exit(1); }
console.log('simClubManagerEraMidSeason: PASS. His 2005 save plays every league, the picker lists one La Liga, and the Cups tab shows the cup it names.');
