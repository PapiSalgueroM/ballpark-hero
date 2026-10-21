/**
 * Round 1503: the Champions League screen in Club Manager, walked on a real build at 320x640, 390x844 and 1280x900.
 *
 * The saves are made by the engine itself (scripts/lib/worldUclFleet.mjs bundles src/lib/clubManager.ts and plays
 * them on a held random stream), planted from /robots.txt on the served build, and the page is pressed like a
 * player would. Supabase and the ad hosts are aborted; nothing reaches the network.
 *   (a) a today's world Chelsea save just after matchday 4 (Chelsea watch, the engine's own answer): Cups, the
 *       Champions League tile, Table (36 rows, eight through, sixteen to the play-offs, twelve out, the legend),
 *       Matchdays on matchday 4 (18 scores) paged to matchday 5 (18 fixtures, no score), a club tapped (its run:
 *       four recorded nights and four to come), back, Knockouts (drawn after matchday 8), Final (still to come)
 *   (b) the same save at the season's end: the season review's line is, word for word and in its order,
 *       "Champions League: <winner> beat <runner-up> in the final.", the final the engine's evaluation played
 *       (today's world plays its final after the last league game)
 *   (c) an era 2005 watcher (Villarreal, or the next still in the job at the final): Groups (eight pills, four rows
 *       a group), Final won by the engine's winner
 *   (d) a Real Madrid participant: Table is the old groups card, Matchdays read from the adapter, and the ? says the
 *       game's stand in for today's world (group winners into the quarter-finals), never a round of 16
 *   (k) the (a) save's stream stopped once 11 nights are done (on this stream the entry lands on 12: the play-offs
 *       and both legs of the round of 16 played, measured on the runner 2026-10-17): every
 *       play-off and round of 16 card read against the engine's ties (first leg, second leg the right way round,
 *       the aggregate and how it was won), Matchdays paged back to the play-off second legs with every row as the
 *       engine played it, and one club's run holding its second leg (added by the review fix, run lens major 1)
 *   (o) an era 2015 save in it from outside the real 32 (the first club of the 2015 leagues that is not one of the
 *       32 and starts in it, the engine's own answer): the screen names the club and the real club whose place it
 *       takes, word for word, and the field line says there is one change; the real club left over is read off the
 *       engine's groups and the era's verified 32, never off the screen's code (closing check, finding 1)
 *   (r) the (d) save played on until both semi-finals are settled: Matchdays paged back from the last night played
 *       through the semi-final and quarter-final nights, each first leg night holding every tie home first with leg
 *       one's score and each second leg night every tie at the other ground with leg two turned, as the bracket
 *       holds them (both legs stored home first, UclTie in clubManager.ts), and one club's run holding its second
 *       leg away (closing check, finding 2: the participant's second leg night was guarded by the unit file only)
 *   Round 1509, the Europa League (one walk with the Champions League's, ruling 5):
 *   (u) the (a) stream stopped once the Europa League has played 4 nights: Cups shows a third tile, Europa League;
 *       its screen follows it from outside in the 36 club format; Table (36 rows, 8, 16, 12), Matchdays on night 4
 *       with the engine's scores and the engine's date (a Thursday), paged to night 5 (fixtures, no score), a club's
 *       run with how it got in (the slice's own route, in the screen's words), Knockouts, Final, and its ?
 *   (v) a club that earned a place by its cup: an Everton season played to its end with the cup final's winner
 *       set to Everton (crafted, so the line can be read), then rolled over: the tile says the place was earned and
 *       its nights are not played yet, and the screen's first line names the cup, word for word
 *   (c) and (d) also: the 2005 save shows three tiles (Round 1510: the super cup beside them) and no Europa League; the Real Madrid participant shows the
 *       Europa League tile, and its screen follows it from outside
 *   (e) on every view of (a), (c), (k), (o), (r), (u), (v) and the new views of (d): scrollY and the document height the same before a
 *       tile and after its back button, every new control at least 44 px tall, no new text under 12 px, no
 *       sideways scroll, nothing cut by its box or off the screen, no one word name broken in the middle of the word,
 *       no two controls on top of each other, and the season review's line fully drawn; under
 *       reduced motion nothing in the panel animates
 * Exit 0 green, 1 red (or a control that fired), 2 could not run, 3 a control that did not fire.
 *
 * Negative controls (PLAY_WORLD_CONTROL; each patches one line of the tree, asserted present exactly once, builds a
 * second dist into its own temp folder, puts the file back, serves that dist and walks one case at one size):
 *   notile  the Champions League tile is drawn only for a club in it      (a) red: no tile for a watcher
 *   ahead   the adapter evaluates one night past the week                  (a) red: matchday 5 shows scores
 *   oldcols the table's number columns as wide as the first draft          (c) at 320 red: a one word name breaks
 *   legflip a tie card prints its second leg's score the wrong way round  (k) red: a card not as the engine played it
 *   swapfinal the season review swaps the winner and the runner-up         (b) red: the line names the final wrongly
 *   r16help the ? for the club in it in today's world tells the eras' rule (d) red: a round of 16 the game never plays
 *   instandin the view forgets the stand in of the club in it              (o) red: the club from outside not named
 *   inswap  the screen's line for it names the two clubs the wrong way round (o) red: the line not word for word
 *   legturn the club in it's second leg night keeps leg two unturned       (r) red: a night not as the bracket holds it
 *   notileuel (Round 1509) the Europa League tile is not drawn             (u) red: no Europa League tile
 *   wednesday (Round 1509) the Europa League's nights keep the Champions League's Wednesday (u) red: night 4 dated otherwise
 *           (the run reviewer's mutation M7, which the walk let through before case (r))
 * (notile and ahead walk (a) at 390; oldcols walks (c) at 320; legflip (k), swapfinal (b) and r16help (d) at 390;
 *  instandin and inswap (o) and legturn (r) at 390.
 *  Controls patch the checkout one at a time, so a request runs them under #!serial.)
 * Runs only on a runner (CI set): it builds and serves. Request lines, with #!serve and #!playwright:
 *   walk: node scripts/playWorldUcl.mjs
 *   walk-notile: PLAY_WORLD_CONTROL=notile node scripts/playWorldUcl.mjs
 * Pictures go to $RC_OUT/shots.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { engineOf, tape } from './lib/worldUclFleet.mjs';
import { chromium } from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.PLAY_WORLD_CONTROL || '';
/* PLAY_WORLD_CASES (for example "c") and PLAY_WORLD_SIZES (for example "390") narrow a run while a finding is chased;
   a narrowed run is never the round's proof, and says so on its last line. */
const ALL_CASES = 'abcdkoruv';
const CASES = process.env.PLAY_WORLD_CASES || ALL_CASES;
const SIZES = [[320, 640], [390, 844], [1280, 900]].filter(([w]) => !process.env.PLAY_WORLD_SIZES || process.env.PLAY_WORLD_SIZES.split(',').includes(String(w)));
const NARROW = CASES !== ALL_CASES || SIZES.length !== 3;
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-world-ucl-walk-'));
const SHOTS = path.join(process.env.RC_OUT || TEMP, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const cannot = why => { console.log(`playWorldUcl: could not run. ${why}`); process.exit(2); };
if (!process.env.CI) cannot('it builds and serves the site, so it runs on a runner only (CI is not set)');

const CONTROLS = {
  notile: { file: 'src/components/club-manager/WorldCompScreen.tsx',
    from: `<Tile icon="⭐" title="Champions League" value={status.value} sub={status.sub} testId="ucl" onClick={() => go({ ...HOME, at: 'ucl' })} />`,
    to: `{career.uclGroup !== null && <Tile icon="⭐" title="Champions League" value={status.value} sub={status.sub} testId="ucl" onClick={() => go({ ...HOME, at: 'ucl' })} />}`,
    finding: 'no Champions League tile' },
  ahead: { file: 'src/lib/clubManagerWorldView.ts',
    from: '    result = evalWorldComp(career, comp);',
    to: '    result = evalWorldComp(career, comp, worldCompNightsDone(career, comp) + 1);',
    finding: 'matchday 5 shows' },
  oldcols: { file: 'src/components/club-manager/WorldCompScreen.tsx',
    from: "const cols = 'grid grid-cols-[1.25rem_1fr_1.1rem_1.1rem_1.1rem_1.75rem_1.75rem] gap-x-1 items-center';",
    to: "const cols = 'grid grid-cols-[1.5rem_1fr_1.4rem_1.4rem_1.4rem_2rem_2rem] gap-x-1 items-center';",
    finding: 'breaks in the middle of the word', run: 'c', size: [320, 640] },
  legflip: { file: 'src/components/club-manager/WorldCompScreen.tsx',
    from: 'Second leg: {t.away} {t.leg2[1]}-{t.leg2[0]} {t.home}',
    to: 'Second leg: {t.away} {t.leg2[0]}-{t.leg2[1]} {t.home}',
    finding: 'card not as the engine played it', run: 'k' },
  swapfinal: { file: 'src/components/club-manager/ClubManagerSeasonSummary.tsx',
    from: '{ winner: r.winner, runnerUp: r.runnerUp }',
    to: '{ winner: r.runnerUp, runnerUp: r.winner }',
    finding: 'the season review does not name the final', run: 'b' },
  r16help: { file: 'src/components/club-manager/WorldCompScreen.tsx',
    from: ") : view.mode === 'in' && view.firstKo === 'QF' ? (",
    to: ') : false ? (',
    finding: 'the ? for the club in it', run: 'd' },
  instandin: { file: 'src/lib/clubManagerWorldView.ts',
    from: '    ...(standIn ? { standIn } : {}),',
    to: '    ...(false ? { standIn } : {}),',
    finding: 'the club in it from outside the real 32', run: 'o' },
  inswap: { file: 'src/components/club-manager/WorldCompScreen.tsx',
    from: '`${view.standIn.club} are in it in this save, in the place of ${view.standIn.for}, one of the real 32 of ${eraSeason}.`',
    to: '`${view.standIn.for} are in it in this save, in the place of ${view.standIn.club}, one of the real 32 of ${eraSeason}.`',
    finding: 'the club in it from outside the real 32', run: 'o' },
  legturn: { file: 'src/lib/clubManagerWorldView.ts',
    from: 'homeGoals: t.leg2 ? t.leg2.awayGoals : null, awayGoals: t.leg2 ? t.leg2.homeGoals : null',
    to: 'homeGoals: t.leg2 ? t.leg2.homeGoals : null, awayGoals: t.leg2 ? t.leg2.awayGoals : null',
    finding: 'knockout night not as the bracket holds it', run: 'r' },
  notileuel: { file: 'src/components/club-manager/WorldCompScreen.tsx',
    from: `{uelOn && <Tile icon="🌍" title="Europa League" value={uelStatus.value} sub={uelStatus.sub} testId="uel" onClick={() => go({ ...HOME, at: 'uel' })} />}`,
    to: '',
    finding: 'no Europa League tile', run: 'u' },
  wednesday: { file: 'src/lib/clubManagerCalendar.ts',
    from: "  const thursday = comp === 'uel' ? 1 : 0;",
    to: '  const thursday = 0;',
    finding: 'night 4 dated', run: 'u' },
};
if (CONTROL && !CONTROLS[CONTROL]) cannot(`unknown control ${CONTROL} (${Object.keys(CONTROLS).join(', ')})`);

/* ---------- the saves, made by the engine ---------- */
const E = await engineOf(ROOT, 'walk', {}, cannot);
const opts = { skipHalftime: true, noCoach: true };
async function play(club, era, seed, until) {
  const M = await E.fresh();
  let s = tape(seed, () => (era ? M.cm.startCareer(club, era) : M.cm.startCareer(club))).value;
  let i = 0;
  while (!until(M, s) && s.week < s.calendar.length && i < 400) {
    s = tape(seed + 1 + i, () => M.cm.playNextEntry(s, opts)).value.state;
    i += 1;
  }
  return { M, s, entries: i };
}
function saved(M, s) {
  M.store.clear();
  if (!M.cm.saveCareer(s)) cannot('the engine refused to save a walk career');
  return [...M.store.entries()];
}
const saves = {};
{
  const a = await play('Chelsea', undefined, 0x1503a, (M, s) => M.cm.worldUclNightsDone(s) >= 4);
  if (a.s.uclGroup || a.M.cm.worldUclNightsDone(a.s) !== 4) cannot('Chelsea did not reach matchday 4 as a watcher');
  const r = a.M.cm.evalWorldUcl(a.s);
  const md4 = r.nights[3].fixtures.filter(f => f.hg !== undefined).length;
  const md5 = r.nights[4].fixtures.length;
  saves.a = { items: saved(a.M, a.s), md4, md5, table: r.table.length, cupName: a.M.cm.careerLeagueOf(a.s).cupName };
  console.log(`(a) Chelsea, week ${a.s.week} of ${a.s.calendar.length} after ${a.entries} entries: nights done 4, matchday 4 ${md4} scores, matchday 5 ${md5} fixtures, table ${r.table.length}`);
  const b = await play('Chelsea', undefined, 0x1503a, () => false);
  const end = b.M.cm.evalWorldUcl(b.s);
  if (!end?.winner || !end.runnerUp) cannot('the Chelsea season ended without a watched winner');
  const fin = tape(0x1503b, () => b.M.cm.finishSeason(b.s)).value.state;
  saves.b = { items: saved(b.M, fin), winner: end.winner, runnerUp: end.runnerUp };
  console.log(`(b) Chelsea season over after ${b.entries} entries: the engine's final, ${end.winner} beat ${end.runnerUp}`);
  /* (k) the same stream stopped once 11 nights are done (12 on this stream): the play-offs settled and the round of
     16 played as far as the week reached. What each card and each row must read is written here from the engine's
     own ties, never from the screen's code; a round of 16 tie with one leg played reads its first leg and no second. */
  const k = await play('Chelsea', undefined, 0x1503a, (M, s) => M.cm.worldUclNightsDone(s) >= 11);
  const kd = k.M.cm.worldUclNightsDone(k.s);
  const kr = k.M.cm.evalWorldUcl(k.s);
  if (k.s.uclGroup || kd < 11 || !kr) cannot(`Chelsea did not reach night 11 as a watcher (${kd} nights done)`);
  const how = t => (t.pens ? `${t.aet ? 'level after extra time, ' : ''}${t.winner} win on penalties`
    : t.byAwayGoals ? `${t.winner} through on away goals` : t.aet ? `${t.winner} win after extra time` : `${t.winner} through`);
  const cardOf = t => ({
    head: `${t.home} v ${t.away}`,
    first: t.leg1 ? `First leg: ${t.home} ${t.leg1[0]}-${t.leg1[1]} ${t.away}` : null,
    second: t.leg2 ? `Second leg: ${t.away} ${t.leg2[1]}-${t.leg2[0]} ${t.home}` : null,
    words: t.winner && t.agg ? `${t.agg[0]}-${t.agg[1]} on aggregate, ${how(t)}` : 'To be played',
  });
  const po = kr.ties.filter(t => t.round === 'PO');
  const r16 = kr.ties.filter(t => t.round === 'R16');
  if (po.length !== 8 || po.some(t => !t.leg1 || !t.leg2 || !t.agg || !t.winner)) cannot('the play-offs are not all settled at night 11');
  for (const t of po) {
    if (t.agg[0] !== t.leg1[0] + t.leg2[0] || t.agg[1] !== t.leg1[1] + t.leg2[1]) cannot(`the engine's play-off ${t.home} v ${t.away} has an aggregate that is not its two legs`);
  }
  const po2 = kr.nights.findIndex(n => n.stage === 'PO' && n.leg === 2);
  const LEG_NAME = { PO: 'Play-off', R16: 'Round of 16', QF: 'Quarter-final', SF: 'Semi-final' };
  const lastNight = kr.nights[kd - 1];
  const t0 = po[0];
  saves.k = {
    items: saved(k.M, k.s), done: kd, po: po.map(cardOf), r16: r16.map(cardOf),
    opensOn: `${LEG_NAME[lastNight.stage]}, ${lastNight.leg === 2 ? 'second' : 'first'} leg`,
    backToPo2: kd - 1 - po2,
    po2rows: kr.nights[po2].fixtures.map(f => `${f.home}|${f.hg}-${f.ag}|${f.away}`),
    runClub: t0.home, runRow: `${t0.away} ${t0.leg2[1]}-${t0.leg2[0]} ${t0.home}`,
  };
  console.log(`(k) Chelsea, week ${k.s.week} after ${k.entries} entries: ${kd} nights done, ${po.length} play-offs settled, ${r16.length} round of 16 ties, Matchdays opens on ${saves.k.opensOn}`);
  /* A 2005 watcher still in the job when the final is played: Villarreal first (one of the real 32 whose place a
     stand in takes in the game), then two more. The first walk run picked Sunderland, who were sacked in March. */
  for (const club of ['Villarreal', 'Tottenham', 'Everton']) {
    const c = await play(club, 'era2005', 0x1503c, (M, s) => !!s.sacked || (() => { const p = M.cm.worldUclNights(s); return !!p && M.cm.worldUclNightsDone(s) >= p.length; })());
    const cr = c.M.cm.evalWorldUcl(c.s);
    if (c.s.uclGroup || c.s.sacked || !cr?.winner || c.s.week >= c.s.calendar.length) { console.log(`(c) ${club} 2005 cannot serve: ${c.s.uclGroup ? 'in it' : c.s.sacked ? 'sacked' : 'no played final before the season ended'}`); continue; }
    const standIn = c.M.cm.worldUclEraField(c.s)?.standIn ?? null;
    saves.c = { club, items: saved(c.M, c.s), winner: cr.winner, groups: cr.groups.length, standIn };
    console.log(`(c) ${club} 2005, week ${c.s.week} of ${c.s.calendar.length}: ${cr.groups.length} groups, the final won by ${cr.winner}, stand in ${standIn ?? 'none'}`);
    break;
  }
  if (!saves.c) cannot('no 2005 watcher reached a played final in the job');
  const d = await play('Real Madrid', undefined, 0x1503d, (M, s) => (s.uclGroup?.matchday ?? 0) >= 2);
  if (!d.s.uclGroup) cannot('Real Madrid are not in the Champions League in this build');
  saves.d = { items: saved(d.M, d.s), md: d.s.uclGroup.matchday };
  console.log(`(d) Real Madrid, in it, group matchday ${d.s.uclGroup.matchday}`);
  /* (o) The club in it from outside the real 32 of 2015-16, picked the way the unit file picks it (the first club of
     the era's leagues outside the 32 that starts in it). What the screen must say is written here from the engine's
     own groups and the era's verified 32: the one club in it that is not one of the 32, and the one of the 32 that
     is not in it. */
  {
    const M0 = await E.fresh();
    const real = (M0.cm.ERA_UCL_FIELDS.era2015 ?? []).map(e => e.name);
    if (real.length !== 32) cannot(`the era's verified 2015-16 field holds ${real.length} clubs, not 32`);
    let club = null;
    for (const c of (M0.cm.ERA_LEAGUES.era2015 ?? []).flatMap(l => l.clubs).filter(x => !real.includes(x))) {
      if (tape(0x1503e, () => M0.cm.startCareer(c, 'era2015')).value.uclGroup) { club = c; break; }
    }
    if (!club) cannot('no club of the 2015 leagues from outside the real 32 starts in the Champions League');
    const o = await play(club, 'era2015', 0x1503e, (M, s) => (s.uclGroup?.matchday ?? 0) >= 1);
    if (!o.s.uclGroup) cannot(`${club} 2015 is not in the Champions League once played`);
    const inIt = [club, ...o.s.uclGroup.opponents, ...(o.s.uclWorld ?? []).flatMap(g => g.clubs)];
    const outside = inIt.filter(c => !real.includes(c));
    const left = real.filter(c => !inIt.includes(c));
    if (inIt.length !== 32 || outside.join() !== club || left.length !== 1) {
      cannot(`the 2015 field with ${club} in it is not the real 32 with one change (${inIt.length} clubs, outside: ${outside.join(', ')}, left over: ${left.join(', ')})`);
    }
    saves.o = { club, left: left[0], items: saved(o.M, o.s), lines: [
      `${club} are in it in this save, in the place of ${left[0]}, one of the real 32 of 2015-16.`,
      'Every season of this save draws from the same 32 clubs, the real 2015-16 field, whatever the leagues do, with the one change named above.',
    ] };
    console.log(`(o) ${club} 2015, in it from outside the real 32, group matchday ${o.s.uclGroup.matchday}: in the place of ${left[0]}`);
  }
  /* (r) The (d) save played on until both semi-finals are settled. Each knockout night's rows are written here from
     the bracket: leg one home first as stored, leg two at the other ground with its stored score turned (UclTie keeps
     both legs in the tie's own orientation, home first). A second leg that reads the same either way cannot tell a
     turned score from an unturned one, so at least one must differ or the case cannot run. */
  {
    const sfDone = s => { const sf = (s.uclBracket ?? []).filter(t => t.round === 'SF'); return sf.length === 2 && sf.every(t => t.winner); };
    const r = await play('Real Madrid', undefined, 0x1503d, (M, s) => sfDone(s));
    if (!r.s.uclGroup || !sfDone(r.s)) cannot('the Real Madrid save did not reach both semi-finals settled');
    const NAME = { QF: 'Quarter-final', SF: 'Semi-final' };
    const nights = {};
    let differ = 0;
    for (const round of ['QF', 'SF']) {
      const ties = r.s.uclBracket.filter(t => t.round === round);
      if (!ties.length || ties.some(t => t.legs !== 2 || !t.leg1 || !t.leg2)) cannot(`a ${round} tie of the Real Madrid save is not two legs played`);
      nights[`${NAME[round]}, first leg`] = ties.map(t => `${t.home}|${t.leg1.homeGoals}-${t.leg1.awayGoals}|${t.away}`);
      nights[`${NAME[round]}, second leg`] = ties.map(t => `${t.away}|${t.leg2.awayGoals}-${t.leg2.homeGoals}|${t.home}`);
      differ += ties.filter(t => t.leg2.homeGoals !== t.leg2.awayGoals).length;
    }
    if (!differ) cannot('no second leg of the Real Madrid save reads differently turned, so the case could not tell');
    const t0 = r.s.uclBracket.find(t => (t.round === 'QF' || t.round === 'SF') && t.leg2.homeGoals !== t.leg2.awayGoals);
    saves.r = {
      items: saved(r.M, r.s), nights, opensOn: 'Semi-final, second leg',
      runClub: t0.home, runLabel: `${NAME[t0.round]}, second leg · away`, runRow: `${t0.away} ${t0.leg2.awayGoals}-${t0.leg2.homeGoals} ${t0.home}`,
    };
    console.log(`(r) Real Madrid, week ${r.s.week} of ${r.s.calendar.length} after ${r.entries} entries: both semi-finals settled, ${differ} of the six second legs read differently turned, run of ${t0.home}`);
  }
}

/* ---------- Round 1509: the Europa League's saves ---------- */
/* How the screen words a route (clubManagerWorldView.ts's routeWords), the walk's own copy: the line must read it. */
const ROUTE_WORDS = { L: 'its league place', C: 'winning its cup', P: "its cup's place, passed down its league", H: 'winning the Conference League', F: 'the fill, as the next best placed club of a strong league' };
{
  const u = await play('Chelsea', undefined, 0x1503a, (M, s) => M.cm.worldCompNightsDone(s, 'uel') >= 4);
  const ud = u.M.cm.worldCompNightsDone(u.s, 'uel');
  const ur = u.M.cm.evalWorldComp(u.s, 'uel');
  const sl = u.s.worldComps?.uel;
  if (ud !== 4 || !ur || !sl?.via) cannot(`Chelsea did not reach the Europa League's night 4 with a slice (${ud} nights done)`);
  const dates = u.M.cal.worldCompNightDates(u.s, 'uel');
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d4 = dates[3];
  const day4 = new Date(Date.UTC(d4.y, d4.m - 1, d4.d)).getUTCDay();
  if (day4 !== 4) cannot(`the engine dates the Europa League's night 4 on a ${DAYS[day4]}, not a Thursday`);
  saves.u = {
    items: saved(u.M, u.s), md4: ur.nights[3].fixtures.filter(x => x.hg !== undefined).length, md5: ur.nights[4].fixtures.length,
    table: ur.table.length, date4: `${DAYS[day4]} ${d4.d} ${MONTHS[d4.m - 1]}`,
    via: Object.fromEntries(sl.clubs.map((c, i) => [c, sl.via[i]])),
  };
  console.log(`(u) Chelsea, week ${u.s.week}: the Europa League's 4 nights done, night 4 ${saves.u.md4} scores on ${saves.u.date4}, night 5 ${saves.u.md5} fixtures`);
  /* (v) crafted: the cup final's winner set to Everton before the rollover, so the place earned by the cup shows. */
  const v = await play('Everton', undefined, 0x1509a, () => false);
  const fin = tape(0x1509b, () => v.M.cm.finishSeason(v.s)).value.state;
  const final = (fin.cupBracket ?? []).find(t => t.round === 'F');
  if (!final) cannot('the Everton season has no cup final to set');
  final.winner = 'Everton';
  const next = tape(0x1509c, () => v.M.cm.startNextSeason(fin)).value;
  if (next.uclGroup || next.worldComps?.uel?.earned !== 'C') cannot(`the crafted Everton rollover did not earn the cup's place (${next.uclGroup ? 'in the Champions League' : next.worldComps?.uel?.earned ?? 'no route'})`);
  saves.v = { items: saved(v.M, next) };
  console.log(`(v) Everton, season ${next.season}: the cup final's winner set to Everton, the Europa League's earned route C`);
}

/* ---------- the build: the served one, or a control's own ---------- */
let url = process.env.BASE || process.env.SWEEP_BASE || 'http://localhost:4173';
let server = null;
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  const file = path.join(ROOT, c.file);
  const original = fs.readFileSync(file);
  const text = original.toString('utf8');
  const n = text.split(c.from).length - 1;
  if (n !== 1) cannot(`control ${CONTROL}: its line stands in ${c.file} ${n} times, it must be exactly once`);
  const out = path.join(TEMP, `dist-${CONTROL}`);
  try {
    fs.writeFileSync(file, text.replace(c.from, c.to));
    execFileSync(path.join(ROOT, 'node_modules', '.bin', 'vite'), ['build', '--outDir', out, '--emptyOutDir'], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'], timeout: 25 * 60000 });
  } finally {
    fs.writeFileSync(file, original);
  }
  if (!fs.readFileSync(file).equals(original)) cannot(`control ${CONTROL}: ${c.file} was not put back`);
  server = spawn(process.execPath, [path.join(ROOT, 'scripts', 'lib', 'hostLikeServer.mjs'), out, '4191'], { stdio: 'ignore' });
  url = 'http://localhost:4191';
  console.log(`control ${CONTROL}: built ${c.file} with its line patched into ${out}; the file is back as it was`);
}
for (let i = 0; i < 60; i += 1) {
  const up = await fetch(`${url}/robots.txt`).then(r => r.ok).catch(() => false);
  if (up) break;
  if (i === 59) cannot(`nothing is served at ${url}`);
  await new Promise(r => setTimeout(r, 500));
}

/* ---------- the page ---------- */
const findings = [];
const finding = (where, what) => { findings.push(`${where}: ${what}`); console.log(`   FAIL ${where}: ${what}`); };
const BLOCK = /supabase\.co|googlesyndication|doubleclick|google-analytics|googletagmanager|adservice|fundingchoices/;
async function press(page, loc, ms = 3000) {
  try {
    await loc.first().waitFor({ state: 'visible', timeout: ms });
    await loc.first().evaluate(el => el.click());
    await page.waitForTimeout(400);
    return true;
  } catch { return false; }
}
async function open(browser, items, [w, h], reduced = false) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.route(BLOCK, r => r.abort());
  await page.goto(`${url}/robots.txt`);
  await page.evaluate(entries => { localStorage.clear(); for (const [k, v] of entries) localStorage.setItem(k, v); }, items);
  await page.goto(`${url}/club-manager`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await press(page, page.getByRole('button', { name: /^Essential only$/i }), 1500);
  await press(page, page.getByRole('button', { name: 'Resume Career', exact: true }), 5000);
  return { ctx, page, errors };
}
async function toCups(page, where) {
  const ok = await press(page, page.getByRole('button').filter({ has: page.getByText('Cups', { exact: true }) }), 20000);
  const tiles = await page.locator('[data-cm-cups-view="tiles"]').waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
  if (!ok || !tiles) {
    const seen = ((await page.locator('#root').innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 300);
    finding(where, `the Cups panel did not open from the hub (the page reads: ${seen})`);
    await shot(page, `fail-${where.replace(/[^a-z0-9]+/gi, '-')}`);
  }
  return ok && tiles;
}
const shot = async (page, name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: false }).catch(() => {});
const count = async (page, sel) => page.locator(sel).count();
let measured = 0;

/** (e) on the panel as it stands: tap sizes, text sizes, nothing cut, overlapping or sideways. */
async function measure(page, where) {
  const m = await page.evaluate(() => {
    const root = document.querySelector('[data-cm-cups-view]');
    if (!root) return null;
    const vw = window.innerWidth;
    const words = el => (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    const shown = el => { const r = el.getBoundingClientRect(); const st = getComputedStyle(el); return r.width > 0 && r.height > 0 && st.visibility !== 'hidden'; };
    const out = { short: [], small: [], cut: [], overlap: [], controls: 0, texts: 0, sideways: document.scrollingElement.scrollWidth > vw + 1 };
    const ctl = [...root.querySelectorAll('button, a')].filter(shown);
    out.controls = ctl.length;
    for (const el of ctl) { const h = el.getBoundingClientRect().height; if (h < 43.5) out.short.push(`"${words(el)}" ${h.toFixed(1)} px`); }
    for (let i = 0; i < ctl.length; i += 1) {
      for (let j = i + 1; j < ctl.length; j += 1) {
        if (ctl[i].contains(ctl[j]) || ctl[j].contains(ctl[i])) continue;
        const a = ctl[i].getBoundingClientRect(); const b = ctl[j].getBoundingClientRect();
        const x = Math.min(a.right, b.right) - Math.max(a.left, b.left); const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (x > 2 && y > 2) out.overlap.push(`"${words(ctl[i])}" on "${words(ctl[j])}"`);
      }
    }
    for (const el of root.querySelectorAll('*')) {
      if (!shown(el) || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
      out.texts += 1;
      const st = getComputedStyle(el); const r = el.getBoundingClientRect();
      if (parseFloat(st.fontSize) < 11.95) out.small.push(`"${words(el)}" ${st.fontSize}`);
      if (r.right > vw + 1 || r.left < -1) out.cut.push(`"${words(el)}" runs off the screen`);
      if ((st.overflowX === 'hidden' || st.overflowX === 'clip' || st.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 1) out.cut.push(`"${words(el)}" is cut by its box`);
      /* A one word name drawn over two lines is broken in the middle of the word (the first final walk showed
         "Panathinaiko s" at 320): its text range has more than one line box. */
      for (const n of el.childNodes) {
        const word = n.nodeType === 3 ? n.textContent.trim() : '';
        if (word.length < 4 || /\s/.test(word)) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        const lines = new Set([...range.getClientRects()].filter(q => q.width > 0).map(q => Math.round(q.top)));
        if (lines.size > 1) out.cut.push(`"${word}" breaks in the middle of the word`);
      }
    }
    return out;
  });
  if (!m) { finding(where, 'the Cups panel is not on the page'); return; }
  measured += 1;
  for (const s of m.short) finding(where, `a control under 44 px tall: ${s}`);
  for (const s of m.small) finding(where, `text under 12 px: ${s}`);
  for (const s of m.cut) finding(where, s);
  for (const s of m.overlap) finding(where, `two controls overlap: ${s}`);
  if (m.sideways) finding(where, 'the page scrolls sideways');
  console.log(`   ${where}: ${m.controls} controls and ${m.texts} lines measured`);
}

/** Press a tile, look inside, come back with the view's own back button: the page stands where it stood. */
async function roundTrip(page, where, loc, inside, { skipMeasure = false } = {}) {
  await loc.first().scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(250);
  const before = await page.evaluate(() => [Math.round(window.scrollY), document.scrollingElement.scrollHeight]);
  if (!(await press(page, loc))) { finding(where, 'its tile or control could not be pressed'); return false; }
  await page.waitForTimeout(300);
  await inside();
  if (!skipMeasure) await measure(page, where);
  if (!(await press(page, page.locator('[data-cm-world-back]')))) { finding(where, 'no back button'); return false; }
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => [Math.round(window.scrollY), document.scrollingElement.scrollHeight]);
  if (Math.abs(after[0] - before[0]) > 1 || Math.abs(after[1] - before[1]) > 1) {
    finding(where, `back did not put the page where it was: scrollY ${before[0]} then ${after[0]}, height ${before[1]} then ${after[1]}`);
  }
  return true;
}

/* ---------- the cases ---------- */
async function caseA(browser, size, tag) {
  const where = `(a) Chelsea ${tag}`;
  const { ctx, page, errors } = await open(browser, saves.a.items, size);
  try {
    if (!(await toCups(page, where))) return;
    await measure(page, `${where} tiles`);
    /* What scripts/playManagerCustomPromotion.mjs (240 and 241) reads off this panel: the panel's rendered text, so
       a word drawn in capitals by CSS does not count as the word. */
    const panel = await page.getByRole('button', { name: 'Club home', exact: true }).locator('..').innerText().catch(() => '');
    if (!saves.a.cupName || !panel.includes(saves.a.cupName) || !panel.includes('No European football this season')) {
      finding(where, `the panel's text does not hold the cup's name (${saves.a.cupName}) and the no European football line`);
    }
    await shot(page, `a-tiles-${tag}`);
    if (!(await count(page, '[data-cm-world-tile="ucl"]'))) { finding(where, 'no Champions League tile for a club watching it'); return; }
    await roundTrip(page, `${where} screen`, page.locator('[data-cm-world-tile="ucl"]'), async () => {
      if (!(await count(page, '[data-cm-world-mode="watching"][data-cm-world-format="l36"]'))) finding(where, 'the screen is not the watched 36 club league phase');
      await shot(page, `a-screen-${tag}`);
      await roundTrip(page, `${where} table`, page.locator('[data-cm-world-tile="table"]'), async () => {
        const rows = await page.locator('[data-cm-world-table]').first().getAttribute('data-cm-world-table').catch(() => null);
        const zones = [await count(page, '[data-zone="through"]'), await count(page, '[data-zone="playoff"]'), await count(page, '[data-zone="out"]')];
        if (rows !== String(saves.a.table) || zones.join() !== '8,16,12') finding(where, `the table has ${rows} rows in zones ${zones.join(', ')}, not 36 in 8, 16, 12`);
        if (!(await count(page, '[data-cm-world-legend]'))) finding(where, 'the table names no zones');
        await shot(page, `a-table-${tag}`);
      });
      await roundTrip(page, `${where} matchdays`, page.locator('[data-cm-world-tile="matchdays"]'), async () => {
        const md4 = await count(page, '[data-cm-world-fixture="played"]');
        if (md4 !== saves.a.md4) finding(where, `matchday 4 shows ${md4} scores, the engine played ${saves.a.md4}`);
        await shot(page, `a-md4-${tag}`);
        await press(page, page.getByRole('button', { name: 'Night after' }));
        const played5 = await count(page, '[data-cm-world-fixture="played"]');
        const open5 = await count(page, '[data-cm-world-fixture="open"]');
        if (played5) finding(where, `matchday 5 shows ${played5} scores before it is played`);
        if (open5 !== saves.a.md5) finding(where, `matchday 5 lists ${open5} fixtures to play, the engine has ${saves.a.md5}`);
        await shot(page, `a-md5-${tag}`);
        const club = await page.locator('[data-cm-world-fixtures] [data-cm-world-club]').first().getAttribute('data-cm-world-club').catch(() => null);
        await roundTrip(page, `${where} run`, page.locator('[data-cm-world-fixtures] [data-cm-world-club]'), async () => {
          const rec = await count(page, '[data-cm-world-run-row="recorded"]');
          const up = await count(page, '[data-cm-world-run-row="upcoming"]');
          if (!(await count(page, `[data-cm-world-run="${club}"]`)) || rec !== 4 || up !== 4) finding(where, `${club}'s run shows ${rec} played and ${up} to come, not 4 and 4`);
          await shot(page, `a-run-${tag}`);
        });
      });
      await roundTrip(page, `${where} knockouts`, page.locator('[data-cm-world-tile="knockouts"]'), async () => {
        const t = await page.locator('[data-cm-world-undrawn]').first().textContent().catch(() => '');
        if (!/Drawn after matchday 8/.test(t ?? '')) finding(where, `the knockouts do not say they are drawn after matchday 8 (${t})`);
      });
      await roundTrip(page, `${where} final`, page.locator('[data-cm-world-tile="final"]'), async () => {
        if (!(await count(page, '[data-cm-world-final="open"]'))) finding(where, 'the final is not shown as still to come');
      });
      await press(page, page.locator('[data-cm-world-help-toggle]'));
      if (!(await count(page, '[data-cm-world-help]'))) finding(where, 'the ? opens no rules');
      else { await measure(page, `${where} help`); await shot(page, `a-help-${tag}`); }
      await press(page, page.locator('[data-cm-world-help-toggle]'));
    });
    if (errors.length) finding(where, `page errors: ${errors.join(' | ')}`);
  } finally { await ctx.close(); }
}

async function caseB(browser, size, tag) {
  const where = `(b) Chelsea season over ${tag}`;
  const { ctx, page, errors } = await open(browser, saves.b.items, size);
  try {
    const line = page.locator('[data-cm-world-final-line]');
    const got = await line.first().waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
    const text = got ? ((await line.first().textContent()) ?? '').replace(/\s+/g, ' ').trim() : '';
    /* Word for word and in its order (review fix, run lens major 2): "includes the winner and includes the
       runner-up" passed a line that had them the wrong way round. */
    const want = `Champions League: ${saves.b.winner} beat ${saves.b.runnerUp} in the final.`;
    if (!got || !text.endsWith(want)) finding(where, `the season review does not name the final as the engine played it ("${text || 'no line'}"; the engine's: "${want}")`);
    else {
      await line.first().scrollIntoViewIfNeeded().catch(() => {});
      /* The review's lines tick in one after another, so the line is looked at once it is fully drawn. */
      const drawn = await page.waitForFunction(() => {
        const el = document.querySelector('[data-cm-world-final-line]');
        return !!el && parseFloat(getComputedStyle(el).opacity) > 0.99;
      }, null, { timeout: 15000 }).then(() => true, () => false);
      if (!drawn) finding(where, 'the final\'s line is never fully drawn (its opacity stays below 1)');
      const fs12 = await line.first().evaluate(el => parseFloat(getComputedStyle(el).fontSize));
      if (fs12 < 11.95) finding(where, `the final's line is ${fs12} px`);
      const wide = await page.evaluate(() => document.scrollingElement.scrollWidth > window.innerWidth + 1);
      if (wide) finding(where, 'the season review scrolls sideways');
    }
    if (got) await line.first().screenshot({ path: path.join(SHOTS, `b-review-line-${tag}.png`) }).catch(() => {});
    await shot(page, `b-review-${tag}`);
    if (errors.length) finding(where, `page errors: ${errors.join(' | ')}`);
  } finally { await ctx.close(); }
}

async function caseC(browser, size, tag) {
  const where = `(c) ${saves.c.club} 2005 ${tag}`;
  const { ctx, page, errors } = await open(browser, saves.c.items, size);
  try {
    if (!(await toCups(page, where))) return;
    /* Round 1509: an era save keeps its era's format, which has no Europa League in this round. Round 1510: and the
       super cup tile beside it (the era's row is not confirmed, which the tile says): three tiles. */
    const tiles = await count(page, '[data-cm-cups-view="tiles"] [data-cm-world-tile]');
    if (tiles !== 3 || (await count(page, '[data-cm-world-tile="uel"]')) || !(await count(page, '[data-cm-world-tile="dsc"]'))) finding(where, `the 2005 save shows ${tiles} tiles, a Europa League among them, no super cup tile, or not three`);
    await roundTrip(page, `${where} screen`, page.locator('[data-cm-world-tile="ucl"]'), async () => {
      if (!(await count(page, '[data-cm-world-mode="watching"][data-cm-world-format="g8"]'))) finding(where, 'the screen is not the watched eight groups');
      if (saves.c.standIn) {
        const head = (await page.locator('[data-cm-world-mode]').first().textContent().catch(() => '')) ?? '';
        if (!head.includes(`${saves.c.standIn} stand in for `)) finding(where, `the screen does not name ${saves.c.standIn} as the stand in the engine picked`);
      }
      await shot(page, `c-screen-${tag}`);
      await roundTrip(page, `${where} groups`, page.locator('[data-cm-world-tile="table"]'), async () => {
        const pills = await page.locator('[data-cm-world-view="table"] button').filter({ hasText: /^Group [A-H]$/ }).count();
        const rows = await page.locator('[data-cm-world-table]').first().getAttribute('data-cm-world-table').catch(() => null);
        if (pills !== saves.c.groups || rows !== '4') finding(where, `${pills} group pills and ${rows} rows, not ${saves.c.groups} and 4`);
        await shot(page, `c-groups-${tag}`);
      });
      await roundTrip(page, `${where} final`, page.locator('[data-cm-world-tile="final"]'), async () => {
        const t = await page.locator('[data-cm-world-final="done"]').first().textContent().catch(() => '');
        if (!(t ?? '').includes(saves.c.winner)) finding(where, `the final does not name the engine's winner ${saves.c.winner} (${t || 'no final'})`);
        await shot(page, `c-final-${tag}`);
      });
    });
    if (errors.length) finding(where, `page errors: ${errors.join(' | ')}`);
  } finally { await ctx.close(); }
}

async function caseD(browser, size, tag) {
  const where = `(d) Real Madrid ${tag}`;
  const { ctx, page, errors } = await open(browser, saves.d.items, size);
  try {
    if (!(await toCups(page, where))) return;
    /* Round 1509: a club in the Champions League follows the Europa League from outside too. */
    if (!(await count(page, '[data-cm-world-tile="uel"]'))) finding(where, 'no Europa League tile for a club in the Champions League');
    else await roundTrip(page, `${where} Europa League`, page.locator('[data-cm-world-tile="uel"]'), async () => {
      if (!(await count(page, '[data-cm-world-comp="uel"][data-cm-world-mode="watching"]'))) finding(where, 'the Europa League screen of a club in the Champions League does not follow it from outside');
      await shot(page, `d-uel-${tag}`);
    });
    await roundTrip(page, `${where} screen`, page.locator('[data-cm-world-tile="ucl"]'), async () => {
      if (!(await count(page, '[data-cm-world-mode="in"]'))) finding(where, 'the screen does not say the club is in it');
      /* The ? describes what this club plays (review fix, read lens M1): today's stand in sends the group winners to
         the quarter-finals, and no round of 16 is ever played. */
      await press(page, page.locator('[data-cm-world-help-toggle]'));
      const help = ((await page.locator('[data-cm-world-help]').first().textContent().catch(() => '')) ?? '').replace(/\s+/g, ' ');
      if (!help.includes('The eight group winners go through to the quarter-finals') || /round of 16/i.test(help)) {
        finding(where, `the ? for the club in it does not describe the game's stand in: "${help.slice(0, 200)}"`);
      }
      await press(page, page.locator('[data-cm-world-help-toggle]'));
      /* The old groups card, mounted unedited: its own pills, not the adapter's table. Measured for overflow only. */
      await roundTrip(page, `${where} table`, page.locator('[data-cm-world-tile="table"]'), async () => {
        const adapter = await count(page, '[data-cm-world-table]');
        const old = await page.locator('[data-cm-world-view="table"]').getByText('Group A', { exact: false }).count();
        if (adapter || !old) finding(where, `Table is not the old groups card (${adapter} adapter tables, ${old} Group A pills)`);
        const wide = await page.evaluate(() => document.scrollingElement.scrollWidth > window.innerWidth + 1);
        if (wide) finding(where, 'the old groups card scrolls the page sideways');
        await shot(page, `d-table-${tag}`);
      }, { skipMeasure: true });
      await roundTrip(page, `${where} matchdays`, page.locator('[data-cm-world-tile="matchdays"]'), async () => {
        const all = await count(page, '[data-cm-world-fixture]');
        const played = await count(page, '[data-cm-world-fixture="played"]');
        if (!all || !played) finding(where, `Matchdays shows ${all} fixtures and ${played} scores on matchday ${saves.d.md}`);
        await shot(page, `d-matchdays-${tag}`);
      });
    });
    if (errors.length) finding(where, `page errors: ${errors.join(' | ')}`);
  } finally { await ctx.close(); }
}

/** (u) Round 1509: the Europa League followed from outside, against the engine. */
async function caseU(browser, size, tag) {
  const where = `(u) Chelsea Europa League ${tag}`;
  const { ctx, page, errors } = await open(browser, saves.u.items, size);
  try {
    if (!(await toCups(page, where))) return;
    if (!(await count(page, '[data-cm-world-tile="uel"]'))) { finding(where, 'no Europa League tile on the Cups panel'); return; }
    await measure(page, `${where} tiles`);
    await shot(page, `u-tiles-${tag}`);
    await roundTrip(page, `${where} screen`, page.locator('[data-cm-world-tile="uel"]'), async () => {
      if (!(await count(page, '[data-cm-world-comp="uel"][data-cm-world-mode="watching"][data-cm-world-format="l36"]'))) finding(where, 'the screen is not the followed 36 club Europa League');
      await shot(page, `u-screen-${tag}`);
      await roundTrip(page, `${where} table`, page.locator('[data-cm-world-tile="table"]'), async () => {
        const rows = await page.locator('[data-cm-world-table]').first().getAttribute('data-cm-world-table').catch(() => null);
        const zones = [await count(page, '[data-zone="through"]'), await count(page, '[data-zone="playoff"]'), await count(page, '[data-zone="out"]')];
        if (rows !== String(saves.u.table) || zones.join() !== '8,16,12') finding(where, `the table has ${rows} rows in zones ${zones.join(', ')}, not 36 in 8, 16, 12`);
        await shot(page, `u-table-${tag}`);
      });
      await roundTrip(page, `${where} matchdays`, page.locator('[data-cm-world-tile="matchdays"]'), async () => {
        const md4 = await count(page, '[data-cm-world-fixture="played"]');
        if (md4 !== saves.u.md4) finding(where, `night 4 shows ${md4} scores, the engine played ${saves.u.md4}`);
        const head = ((await page.locator('[data-cm-world-night]').first().textContent().catch(() => '')) ?? '').replace(/\s+/g, ' ');
        if (!head.includes(saves.u.date4)) finding(where, `night 4 dated otherwise than the engine's ${saves.u.date4}: "${head.slice(0, 80)}"`);
        await shot(page, `u-md4-${tag}`);
        await press(page, page.getByRole('button', { name: 'Night after' }));
        const played5 = await count(page, '[data-cm-world-fixture="played"]');
        const open5 = await count(page, '[data-cm-world-fixture="open"]');
        if (played5 || open5 !== saves.u.md5) finding(where, `night 5 shows ${played5} scores and ${open5} fixtures to play, the engine has 0 and ${saves.u.md5}`);
        const club = await page.locator('[data-cm-world-fixtures] [data-cm-world-club]').first().getAttribute('data-cm-world-club').catch(() => null);
        await roundTrip(page, `${where} run`, page.locator('[data-cm-world-fixtures] [data-cm-world-club]'), async () => {
          const rec = await count(page, '[data-cm-world-run-row="recorded"]');
          const up = await count(page, '[data-cm-world-run-row="upcoming"]');
          if (rec !== 4 || up !== 4) finding(where, `${club}'s run shows ${rec} played and ${up} to come, not 4 and 4`);
          const via = ((await page.locator('[data-cm-world-via]').first().textContent().catch(() => '')) ?? '').trim();
          const want = `Got in by ${ROUTE_WORDS[saves.u.via[club]]}.`;
          if (via !== want) finding(where, `${club}'s run reads "${via}", the slice's route reads "${want}"`);
          await shot(page, `u-run-${tag}`);
        });
      });
      await roundTrip(page, `${where} knockouts`, page.locator('[data-cm-world-tile="knockouts"]'), async () => {
        const t = await page.locator('[data-cm-world-undrawn]').first().textContent().catch(() => '');
        if (!/Drawn after matchday 8/.test(t ?? '')) finding(where, `the knockouts do not say they are drawn after matchday 8 (${t})`);
      });
      await roundTrip(page, `${where} final`, page.locator('[data-cm-world-tile="final"]'), async () => {
        if (!(await count(page, '[data-cm-world-final="open"]'))) finding(where, 'the final is not shown as still to come');
      });
      await press(page, page.locator('[data-cm-world-help-toggle]'));
      if (!(await count(page, '[data-cm-world-help="uel"]'))) finding(where, 'the ? opens no Europa League rules');
      else { await measure(page, `${where} help`); await shot(page, `u-help-${tag}`); }
      await press(page, page.locator('[data-cm-world-help-toggle]'));
    });
    if (errors.length) finding(where, `page errors: ${errors.join(' | ')}`);
  } finally { await ctx.close(); }
}

/** (v) Round 1509: a place earned by the cup, said on the tile and on the screen's first line. */
async function caseV(browser, size, tag) {
  const where = `(v) Everton earned by the cup ${tag}`;
  const { ctx, page, errors } = await open(browser, saves.v.items, size);
  try {
    if (!(await toCups(page, where))) return;
    const tile = ((await page.locator('[data-cm-world-tile="uel"]').first().textContent().catch(() => '')) ?? '').replace(/\s+/g, ' ');
    if (!tile.includes('You earned a place, but your own nights are not played yet')) finding(where, `the Europa League tile does not say the place was earned: "${tile.slice(0, 120)}"`);
    await shot(page, `v-tiles-${tag}`);
    await roundTrip(page, `${where} screen`, page.locator('[data-cm-world-tile="uel"]'), async () => {
      const text = ((await page.locator('[data-cm-world-comp="uel"]').first().textContent().catch(() => '')) ?? '').replace(/\s+/g, ' ');
      const want = 'Everton earned a place in it by winning its cup, but your own Europa League nights are not in the game yet, so the place went to the next club in line and you follow it from outside.';
      if (!text.includes(want)) finding(where, `the screen's first line is not "${want.slice(0, 60)}...": "${text.slice(0, 160)}"`);
      await shot(page, `v-screen-${tag}`);
    });
    if (errors.length) finding(where, `page errors: ${errors.join(' | ')}`);
  } finally { await ctx.close(); }
}

/** (k) The knockouts against the engine: the cards of two rounds, the play-off second legs on Matchdays, a run. */
async function caseK(browser, size, tag) {
  const where = `(k) Chelsea knockouts ${tag}`;
  const { ctx, page, errors } = await open(browser, saves.k.items, size);
  const squash = s => (s || '').replace(/\s+/g, ' ').trim();
  try {
    if (!(await toCups(page, where))) return;
    await roundTrip(page, `${where} screen`, page.locator('[data-cm-world-tile="ucl"]'), async () => {
      await roundTrip(page, `${where} knockouts`, page.locator('[data-cm-world-tile="knockouts"]'), async () => {
        for (const [pill, prefix, want] of [['Play-offs', 'PO', saves.k.po], ['Last 16', 'R16', saves.k.r16]]) {
          await press(page, page.getByRole('button', { name: pill, exact: true }));
          const cards = await page.locator(`[data-cm-world-tie^="${prefix}-"]`).evaluateAll(els => els.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
          if (cards.length !== want.length) finding(where, `${cards.length} ${pill} cards, the engine drew ${want.length}`);
          let held = 0;
          for (const w of want) {
            const card = cards.find(c => c.startsWith(w.head));
            const bad = !card ? 'no card'
              : w.first && !card.includes(w.first) ? `no "${w.first}"`
                : w.second && !card.includes(w.second) ? `no "${w.second}"`
                  : !w.second && card.includes('Second leg:') ? 'a second leg not yet played'
                    : !card.includes(w.words) ? `no "${w.words}"` : '';
            if (bad) finding(where, `${pill} card not as the engine played it: ${w.head}, ${bad} (the card reads "${card ?? ''}")`);
            else held += 1;
          }
          console.log(`   ${where}: ${held} of ${want.length} ${pill} cards as the engine played them`);
          await shot(page, `k-${prefix.toLowerCase()}-${tag}`);
        }
      });
      await roundTrip(page, `${where} matchdays`, page.locator('[data-cm-world-tile="matchdays"]'), async () => {
        const head = squash(await page.locator('[data-cm-world-night]').first().innerText().catch(() => ''));
        if (!head.includes(saves.k.opensOn)) finding(where, `Matchdays opens on "${head.slice(0, 60)}", not the last night played (${saves.k.opensOn})`);
        for (let i = 0; i < saves.k.backToPo2; i += 1) await press(page, page.getByRole('button', { name: 'Night before' }));
        const night = squash(await page.locator('[data-cm-world-night]').first().innerText().catch(() => ''));
        if (!night.includes('Play-off, second leg')) finding(where, `paging back reached "${night.slice(0, 60)}", not the play-off second legs`);
        const rows = await page.locator('[data-cm-world-fixtures] > div').evaluateAll(els => els.map(e => [...e.children].map(c => c.innerText.trim()).join('|')));
        const miss = saves.k.po2rows.filter(r => !rows.includes(r));
        if (rows.length !== saves.k.po2rows.length || miss.length) finding(where, `the play-off second legs read "${rows.slice(0, 2).join(' / ')}"; ${miss.length} of the engine's rows missing, first "${miss[0] ?? ''}"`);
        await shot(page, `k-po2-${tag}`);
        await roundTrip(page, `${where} run`, page.locator(`[data-cm-world-fixtures] [data-cm-world-club="${saves.k.runClub}"]`), async () => {
          const run = squash(await page.locator(`[data-cm-world-run="${saves.k.runClub}"]`).first().innerText().catch(() => ''));
          if (!run.includes(saves.k.runRow)) finding(where, `${saves.k.runClub}'s run does not hold its play-off second leg "${saves.k.runRow}"`);
        });
      });
    });
    if (errors.length) finding(where, `page errors: ${errors.join(' | ')}`);
  } finally { await ctx.close(); }
}

/** (o) The club in it from outside the real 32: the header's two lines word for word, as the engine drew it. */
async function caseO(browser, size, tag) {
  const where = `(o) ${saves.o.club} 2015 ${tag}`;
  const { ctx, page, errors } = await open(browser, saves.o.items, size);
  try {
    if (!(await toCups(page, where))) return;
    await roundTrip(page, `${where} screen`, page.locator('[data-cm-world-tile="ucl"]'), async () => {
      if (!(await count(page, '[data-cm-world-mode="in"][data-cm-world-format="g8"]'))) finding(where, 'the screen does not say the club is in the eight groups');
      const lines = await page.locator('[data-cm-world-mode] p').evaluateAll(els => els.map(e => (e.textContent || '').replace(/\s+/g, ' ').trim()));
      for (const want of saves.o.lines) {
        if (!lines.includes(want)) finding(where, `the screen does not name the club in it from outside the real 32 as the engine drew it: no line "${want}" (its lines: "${lines.join(' / ').slice(0, 400)}")`);
      }
      if (lines.some(l => l.includes(' stand in for '))) finding(where, 'the club in it is told another club stands in for it');
      await shot(page, `o-screen-${tag}`);
    });
    if (errors.length) finding(where, `page errors: ${errors.join(' | ')}`);
  } finally { await ctx.close(); }
}

/** (r) The club in it, its knockout nights against the bracket, and one club's second leg in its run. */
async function caseR(browser, size, tag) {
  const where = `(r) Real Madrid knockouts ${tag}`;
  const { ctx, page, errors } = await open(browser, saves.r.items, size);
  const squash = s => (s || '').replace(/\s+/g, ' ').trim();
  try {
    if (!(await toCups(page, where))) return;
    await roundTrip(page, `${where} screen`, page.locator('[data-cm-world-tile="ucl"]'), async () => {
      if (!(await count(page, '[data-cm-world-mode="in"]'))) finding(where, 'the screen does not say the club is in it');
      await roundTrip(page, `${where} matchdays`, page.locator('[data-cm-world-tile="matchdays"]'), async () => {
        const want = Object.keys(saves.r.nights);
        const seen = [];
        for (let i = 0; i <= 8 && seen.length < want.length; i += 1) {
          if (i && !(await press(page, page.getByRole('button', { name: 'Night before' })))) break;
          const head = squash(await page.locator('[data-cm-world-night]').first().innerText().catch(() => ''));
          if (i === 0 && !head.includes(saves.r.opensOn)) finding(where, `Matchdays opens on "${head.slice(0, 60)}", not the last night played (${saves.r.opensOn})`);
          const label = want.find(l => head.includes(l));
          if (!label || seen.includes(label)) continue;
          seen.push(label);
          const rows = await page.locator('[data-cm-world-fixtures] > div').evaluateAll(els => els.map(e => [...e.children].map(c => c.innerText.trim()).join('|')));
          const exp = saves.r.nights[label];
          const miss = exp.filter(x => !rows.includes(x));
          if (rows.length !== exp.length || miss.length) finding(where, `knockout night not as the bracket holds it: ${label} reads "${rows.slice(0, 2).join(' / ')}", ${miss.length} of the bracket's ${exp.length} rows missing, first "${miss[0] ?? ''}"`);
          await shot(page, `r-${label.replace(/[^a-z]+/gi, '-').toLowerCase()}-${tag}`);
        }
        if (seen.length !== want.length) finding(where, `paging back from the last night played reached ${seen.length} of the ${want.length} knockout nights (${seen.join(', ')})`);
        console.log(`   ${where}: ${seen.length} of ${want.length} knockout nights read against the bracket`);
        /* Paging ends on the quarter-final first legs, where every club of the last eight has a fixture. */
        await roundTrip(page, `${where} run`, page.locator(`[data-cm-world-fixtures] [data-cm-world-club="${saves.r.runClub}"]`), async () => {
          const rows = await page.locator(`[data-cm-world-run="${saves.r.runClub}"] [data-cm-world-run-row]`).evaluateAll(els => els.map(e => (e.innerText || '').replace(/\s+/g, ' ').trim()));
          if (!rows.some(x => x.includes(saves.r.runLabel) && x.includes(saves.r.runRow))) {
            finding(where, `knockout night not as the bracket holds it: ${saves.r.runClub}'s run has no row "${saves.r.runLabel}" reading "${saves.r.runRow}"`);
          }
          await shot(page, `r-run-${tag}`);
        });
      });
    });
    if (errors.length) finding(where, `page errors: ${errors.join(' | ')}`);
  } finally { await ctx.close(); }
}

/** Reduced motion: with the screen and a view open, nothing inside the panel is animating. */
async function caseMotion(browser) {
  const where = '(e) reduced motion 390';
  const { ctx, page } = await open(browser, saves.a.items, [390, 844], true);
  try {
    if (!(await toCups(page, where))) return;
    let running = 0;
    for (const sel of ['[data-cm-world-tile="ucl"]', '[data-cm-world-tile="table"]', '[data-cm-world-back]', '[data-cm-world-back]', '[data-cm-world-tile="uel"]', '[data-cm-world-tile="table"]']) {
      await press(page, page.locator(sel));
      running += await page.evaluate(() => {
        const root = document.querySelector('[data-cm-cups-view]');
        return document.getAnimations().filter(a => a.playState === 'running' && root && a.effect && a.effect.target && root.contains(a.effect.target)).length;
      });
    }
    if (running) finding(where, `${running} animations run inside the panel under reduced motion`);
    console.log(`   ${where}: ${running} animations inside the panel`);
  } finally { await ctx.close(); }
}

/* ---------- run ---------- */
const RUN = { a: caseA, b: caseB, c: caseC, d: caseD, k: caseK, o: caseO, r: caseR, u: caseU, v: caseV };
const browser = await chromium.launch();
try {
  if (CONTROL) {
    const c = CONTROLS[CONTROL];
    const size = c.size ?? [390, 844];
    const tag = `${size[0]}-${CONTROL}`;
    await RUN[c.run ?? 'a'](browser, size, tag);
  } else {
    for (const size of SIZES) {
      const tag = String(size[0]);
      console.log(`== ${size[0]} by ${size[1]}`);
      for (const k of ALL_CASES) if (CASES.includes(k)) await RUN[k](browser, size, tag);
    }
    if (!NARROW) await caseMotion(browser);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}

if (CONTROL) {
  const want = CONTROLS[CONTROL].finding;
  const hits = findings.filter(f => f.includes(want)).length;
  if (hits) {
    console.log(`playWorldUcl control ${CONTROL}: FIRED, "${want}" reported ${hits} time(s) (${findings.length} findings in all)`);
    process.exit(1);
  }
  console.log(`playWorldUcl control ${CONTROL}: DID NOT FIRE, "${want}" was never reported (${findings.length} other findings)`);
  process.exit(3);
}
if (NARROW) {
  console.log(`playWorldUcl: narrowed run (cases ${CASES}, sizes ${SIZES.map(x => x[0]).join(', ')}), ${findings.length} findings over ${measured} measured views; not the round's proof`);
  process.exit(findings.length ? 1 : 0);
}
if (measured < 20) cannot(`only ${measured} views were measured, so the walk did not really walk`);
if (findings.length) {
  console.log(`playWorldUcl: FAIL, ${findings.length} findings over ${measured} measured views; pictures in ${SHOTS}`);
  process.exit(1);
}
console.log(`playWorldUcl: green. Nine saves at three sizes, ${measured} views measured, every check held; pictures in ${SHOTS}`);
