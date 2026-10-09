/**
 * Round 1045: the Season Centre's table is a table, and honest (DESIGN 1045
 * section 9.3, with the critic's C5 and C15).
 *
 * On every table season the awards probe's 48 seeded careers play (read
 * through scripts/lib/careerAwardsNightProbe.mjs's onStep hook, which touches
 * nothing) plus targeted rows:
 *  1. Replay: tableAt(k) equals a from scratch replay of rounds 1 to k for
 *     every k; every pair meets once at each ground; every club has played k
 *     games after round k; points are three a win and one a draw.
 *  1b. Order (Round 1045 review): after every round each place sits above
 *     the next by the footnote's rule, points, then goal difference, then
 *     goals scored, read from the replay's numbers. The replay alone compared
 *     per slot values and could not see a tiebreak swap.
 *  2. Naming, recomputed from the ledgers themselves (never the module's own
 *     list): a named place is his club, a derby rival on the row, the summary
 *     card's champion, or a club the Round 1036 league ledgers put in that
 *     league that season (the career's own list of that league from 2026-27);
 *     no name twice; the 1st place carries a name other than his when the
 *     card names that champion, and then it is that club, or (Round 1100)
 *     when the world holds the season and runs no title race in the league,
 *     and then it is a club of the league's own list that is neither his nor
 *     a derby rival. A champion the world crowned and the card cannot name
 *     stays "another club".
 *  3. The gate: no table before 1995-96, outside the leagues of
 *     src/data/leagueFormat.ts (the five big leagues, and from 2026-27 the
 *     eight plain leagues Round 1100 gave a size, a format and a cadence row,
 *     typed again below so the list is this harness's own statement), in a
 *     season whose derby cadence is not two,
 *     or in the abandoned 2019-20 Ligue 1 (a targeted row); and none with a
 *     derby rival the ledgers put outside that league that season (critic
 *     C5; the engine never detects such a derby, so a targeted row, Newcastle
 *     in 2017-18 with Sunderland a division down, must give results, gate
 *     "rival"). Each targeted row's mode and gate are asserted.
 *  4. Ledger order: the league ledgers list each season's clubs the way the
 *     real table finished, so named clubs must not take places in the ledger's
 *     array order. Among tables with at least five named clubs besides his,
 *     the rivals and the champion, the share whose named clubs finish exactly
 *     in ledger order stays under the band (chance alone is 1 in 120 at five).
 *
 * Controls (TABLE_CONTROL=), patched into the bundle only, refusing to run if
 * the needle is missing:
 *   names        today's club list named in past tables       -> 2 red
 *   cadence      the cadence and format holds lifted, so the abandoned
 *                Ligue 1 2019-20 gets 38 matchdays            -> 3 red
 *   ledgerorder  named clubs placed in ledger order           -> 4 red
 *   tiebreak     core.ts sorts goals scored before goal difference -> 1b red
 *   rival        the rival gate line removed                   -> 3 red
 *   opentitle    (Round 1100 review) the 1st place left to the world's
 *                champion alone, so a league with no title race reads
 *                "another club" on top                          -> 2 red
 *   snapshotfield initial membership used after simulated swaps -> 2 red
 *
 * Review fixes measured 2026-10-07: 747 final table neighbours level on
 * points, 273 where goal difference and goals scored disagree (floor 50).
 * Control tiebreak 9497 failures at item 1b; control rival 3 at item 3 (the
 * Newcastle row drew a table with Sunderland in it); each exit 1.
 *
 * Measured 2026-10-07 (the probe is seeded): 358 tables, 525 results only
 * seasons, 5157 places named and 1859 unnamed, ledger order 3 of 223 (1.3
 * percent, band 5). Controls, each exit 1: names 783 failures at item 2 (Lille
 * and Nice named in the 1997 Ligue 1); cadence 5 at item 3 (the abandoned
 * 2019-20 Ligue 1 drew 38 matchdays, the probe reaches it too); ledgerorder
 * 223 of 223 in ledger order at item 4.
 *
 * Green is the closing "simSeasonCentreTable: N checks, 0 failed" line and
 * exit 0.
 */
import path from 'node:path';
import { bundleAwardsNight } from './lib/careerAwardsNightBundle.mjs';
import { probeAwardsNight } from './lib/careerAwardsNightProbe.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const CONTROL = process.env.TABLE_CONTROL ?? '';
const CONTROLS = {
  names: [{ file: 'src/lib/season/soccer.ts', from: '    named = members.filter(n => n !== row.club && !rivals.includes(n) && n !== champion);', to: '    named = [...new Set([...members, ...clubs.filter(c => c.league === league.key).map(c => c.name)])].filter(n => n !== row.club && !rivals.includes(n) && n !== champion);' }],
  cadence: [
    { file: 'src/lib/season/soccer.ts', from: "  else if (!snapshot && derbyMeetings(league.key, row.year) !== 2) why = 'cadence';\n", to: '' },
    { file: 'src/data/leagueFormat.ts', from: '"Ligue 1": [{ from: 1995, to: 2018 }, { from: 2020 }],', to: '"Ligue 1": [{ from: 1995 }],' },
  ],
  ledgerorder: [{ file: 'src/lib/season/soccer.ts', from: '  entries.sort((a, b) => a.at - b.at);', to: '  entries.sort(() => 0);' }],
  tiebreak: [{ file: 'src/lib/season/core.ts', from: '  return rows.sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || x.slot - y.slot);', to: '  return rows.sort((x, y) => y.pts - x.pts || y.gf - x.gf || (y.gf - y.ga) - (x.gf - x.ga) || x.slot - y.slot);' }],
  rival: [{ file: 'src/lib/season/soccer.ts', from: "  else if (rivals.some(r => snapshot ? !snapshot.members.some(n => clubKey(n) === clubKey(r)) : !namedInLeague(r, league.key, row.year))) why = 'rival';\n", to: '' }],
  opentitle: [{ file: 'src/lib/season/soccer.ts', from: "    else if (s.champion && ctx.titleOpen && ctx.mode === 'table') open.push(s);\n", to: '' }],
  snapshotfield: [{ file: 'src/lib/season/soccer.ts', from: 'const members = snapshot?.members ?? managerLeagueField(', to: 'const members = managerLeagueField(' }],
};
if (CONTROL && !CONTROLS[CONTROL]) throw new Error(`unknown TABLE_CONTROL ${CONTROL}`);
if (CONTROL) console.log(`CONTROL ${CONTROL}: patched in the bundle only`);

const B = await bundleAwardsNight(ROOT, {
  patches: CONTROL ? CONTROLS[CONTROL] : [],
  extra: { season: 'src/lib/season/soccer.ts', core: 'src/lib/season/core.ts', league: 'src/lib/soccerCareerLeague.ts', derby: 'src/lib/soccerCareerDerby.ts', ledger: 'src/data/careerLeagueSeasons.ts', pool: 'src/data/soccerCareerClubPool.ts', lower: 'src/data/soccerCareerLowerClubs.ts', aliases: 'src/data/clubRivalries.ts' },
});
const { soccer, season: S, core: C, league: LG, derby: DB, ledger: LS } = B;
const CLUBS = soccer.FALLBACK_CLUBS;

let checks = 0, failed = 0;
const fails = new Map();
const fail = (item, msg) => { failed += 1; if (!fails.has(item)) fails.set(item, []); const l = fails.get(item); if (l.length < 4) l.push(msg); };
const check = (ok, label) => { checks += 1; if (ok) console.log(`ok   ${label}`); else { failed += 1; console.log(`FAIL ${label}`); } };

const FIVE = new Set(['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1']);
/* Round 1100: the plain leagues that have a table from 2026-27. Typed here, not read from the ledger
   under test; a league that gains its three rows later is added here in the same commit. */
const PLAIN_2026 = new Set(['Championship', 'Brasileirao', 'Eredivisie', 'Saudi Pro League', 'Primeira Liga', 'Super Lig', '2. Bundesliga', 'Belgian Pro League']);
/* Round 1100 review: floors for the two counts the restated checks rest on.
   MEASURED 2026-10-08 (the probe is seeded, so both are exact until the
   pool or the engine moves): 67 tables in a plain league outside the five
   (66 from the probe's careers, all in leagues the world crowns, and the
   targeted Championship row), floor about half; 3 tables with nobody
   crowned, all three targeted rows (the two past seasons carry an empty
   world, the Championship has no title race), floor all three. The probe's
   own careers reach no table in the four leagues without a title race:
   scripts/simCareerLeagueWorld.mjs D1 draws those by the hundred. */
const PLAIN_FLOOR = 33;
const OPEN_FLOOR = 3;
const SIM_PYRAMIDS = [
  ['Premier League', 'Championship'], ['Bundesliga', '2. Bundesliga'],
  ['Ligue 1', 'Ligue 2'], ['Serie A', 'Serie B'], ['La Liga', 'Segunda Division'],
];
const clubIdentity = name => (B.aliases.SC_CLUB_CANON[name] ?? name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const initialField = league => B.lower.CAREER_LOWER_CLUBS[league] ?? B.pool.CAREER_LEAGUE_LADDER[league]?.flat() ?? [];
function savedFutureField(row, tag) {
  const held = row.leagueWorld;
  if (!held) return null;
  const pyramid = SIM_PYRAMIDS.find(pair => pair.includes(held.league));
  const members = held.members;
  const allowed = pyramid ? pyramid.flatMap(initialField).map(clubIdentity) : [];
  if (row.type !== 'playing' || row.year < 2026 || !pyramid || !Array.isArray(members)
    || members.length !== initialField(held.league).length || members.some(n => typeof n !== 'string' || !n.trim() || !allowed.includes(clubIdentity(n)))
    || new Set(members.map(clubIdentity)).size !== members.length || !members.some(n => clubIdentity(n) === clubIdentity(row.club))
    || !members.includes(held.champion) || (row.leagueSize !== undefined && row.leagueSize !== members.length)
    || !['simulated', 'simulated-partial'].includes(held.simulation)) {
    fail('2 names', `${tag}: malformed saved simulated field`);
    return null;
  }
  return held;
}
function cardChampion(career, row, held) {
  const finish = LG.readLeagueFinish(row);
  if (held) return finish && finish.finish !== 1 ? held.champion : null;
  const today = CLUBS.find(c => c.name === row.club)?.league ?? '';
  const lo = LG.finishLeague({ name: row.club, league: today }, row.year, finish?.size ?? null);
  const w = career.phone?.world;
  if (!finish || finish.finish === 1 || !lo || !w || w.year !== row.year) return null;
  const crowned = w.leagues?.[lo.key];
  if (!crowned || crowned === row.club) return null;
  return LG.namedInLeague(crowned, lo.key, row.year) ? crowned : null;
}
function replay(rounds, teams, upto) {
  const t = Array.from({ length: teams }, (_, slot) => ({ slot, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
  for (let r = 0; r < upto; r += 1) for (const [h, a, hg, ag] of rounds[r]) {
    t[h].p++; t[a].p++; t[h].gf += hg; t[h].ga += ag; t[a].gf += ag; t[a].ga += hg;
    if (hg > ag) { t[h].w++; t[a].l++; t[h].pts += 3; } else if (ag > hg) { t[a].w++; t[h].l++; t[a].pts += 3; } else { t[h].d++; t[a].d++; t[h].pts++; t[a].pts++; }
  }
  return t;
}

const stats = { tables: 0, results: 0, plain: 0, openTitles: 0, ordered: 0, orderN: 0, named: 0, unnamed: 0, level: 0, levelSplit: 0, future: 0 };
/* the footnote's order, from the replay's own numbers: points, then goal
   difference, then goals scored (a full tie may sit either way) */
const before = (a, b) => a.pts - b.pts || (a.gf - a.ga) - (b.gf - b.ga) || a.gf - b.gf;
function checkTable(career, row, ctx, s, tag) {
  if (s.mode !== 'table') {
    stats.results += 1;
    return;
  }
  stats.tables += 1;
  const key = ctx.league?.key;
  const held = savedFutureField(row, tag);
  if (held) stats.future += 1;
  /* 3 the gate */
  if (row.year < 1995) fail('3 gate', `${tag}: a table in ${row.year}`);
  if (!held && !FIVE.has(key) && !(row.year >= 2026 && PLAIN_2026.has(key))) fail('3 gate', `${tag}: a table in ${key} in ${row.year}`);
  if (held && (key !== held.league || s.teams !== held.members.length || s.rounds.length !== 2 * (held.members.length - 1))) fail('3 gate', `${tag}: displayed division, field size or calendar differs from the saved model`);
  if (!FIVE.has(key)) stats.plain += 1;
  if (!held && DB.derbyMeetings(key, row.year) !== 2) fail('3 gate', `${tag}: a table where the cadence is ${DB.derbyMeetings(key, row.year)}`);
  for (const r of DB.readSeasonDerbies(row).map(d => d.rival)) if (held ? !held.members.some(n => clubIdentity(n) === clubIdentity(r)) : !LG.namedInLeague(r, key, row.year)) fail('3 gate', `${tag}: a table with ${r} as a derby rival, not in the ${row.year} ${key}`);
  if (key === 'Ligue 1' && row.year === 2019) fail('3 gate', `${tag}: a table for the abandoned 2019-20 Ligue 1 (${s.games.length} matchdays)`);
  /* 1 replay */
  const M = s.rounds.length;
  for (let k = 0; k <= M; k += 1) {
    const mine = C.tableAt(s, k);
    const ref = replay(s.rounds, s.teams, k);
    for (const r of mine) {
      const x = ref[r.slot];
      if (r.pts !== x.pts || r.gf !== x.gf || r.ga !== x.ga || r.p !== x.p) { fail('1 replay', `${tag}: slot ${r.slot} after ${k}`); break; }
      if (r.p !== k) { fail('1 replay', `${tag}: slot ${r.slot} played ${r.p} after round ${k}`); break; }
      if (r.pts !== 3 * r.w + r.d) { fail('1 replay', `${tag}: slot ${r.slot} points`); break; }
    }
    /* 1b the order: every place above the next by the footnote's rule */
    for (let i = 1; i < mine.length; i += 1) {
      const a = ref[mine[i - 1].slot], b = ref[mine[i].slot];
      if (before(a, b) < 0) { fail('1b order', `${tag}: after ${k}, slot ${a.slot} (${a.pts} pts, ${a.gf - a.ga} GD, ${a.gf} GF) above slot ${b.slot} (${b.pts}, ${b.gf - b.ga}, ${b.gf})`); break; }
      if (k === M && a.pts === b.pts) {
        stats.level += 1;
        if (Math.sign((a.gf - a.ga) - (b.gf - b.ga)) !== Math.sign(a.gf - b.gf)) stats.levelSplit += 1;
      }
    }
  }
  const pairs = new Set();
  for (const rd of s.rounds) for (const [h, a] of rd) pairs.add(`${h}-${a}`);
  if (pairs.size !== s.teams * (s.teams - 1)) fail('1 replay', `${tag}: ${pairs.size} pairs`);
  /* 2 naming, from the ledgers */
  const rivals = DB.readSeasonDerbies(row).map(d => d.rival);
  const champ = cardChampion(career, row, held);
  const ledger = row.year < 2026 ? LS.CAREER_LEAGUE_SEASONS[key]?.[row.year] : null;
  const pool = held ? new Set(held.members) : row.year < 2026 ? new Set(ledger ? ledger.clubs : []) : new Set(CLUBS.filter(c => c.league === key).map(c => c.name));
  const allowed = new Set([row.club, ...rivals, ...(champ ? [champ] : []), ...pool]);
  const names = s.labels.filter(l => l.named).map(l => l.name);
  stats.named += names.length; stats.unnamed += s.labels.length - names.length;
  for (const n of names) if (held ? !held.members.some(member => clubIdentity(member) === clubIdentity(n)) : !allowed.has(n)) fail('2 names', `${tag}: ${n} named in the ${row.year} ${key}`);
  if (new Set(held ? names.map(clubIdentity) : names).size !== names.length) fail('2 names', `${tag}: a club named twice`);
  if (held && JSON.stringify(names.map(clubIdentity).sort()) !== JSON.stringify(held.members.map(clubIdentity).sort())) fail('2 names', `${tag}: displayed clubs differ from the saved simulated field`);
  if (s.labels[0].name !== row.club) fail('2 names', `${tag}: his place is ${s.labels[0].name}`);
  const final = C.tableAt(s, M);
  const top = s.labels[final[0].slot];
  if (held && clubIdentity(top.name) !== clubIdentity(held.champion)) fail('2 names', `${tag}: 1st is ${top.name}, saved simulated champion ${held.champion}`);
  if (final[0].slot !== 0) {
    /* Round 1100 (review fix): who may stand 1st when it is not him. The
       card's champion when the card names one. Nobody ("another club") when
       the world crowned a club for this league that the card cannot name, or
       when this season's world is not held. And where the world holds this
       season and runs no title race in the league at all (the Championship,
       the Super Lig, the 2. Bundesliga and the Belgian Pro League among the
       leagues that draw a table), a club of the league's own list that is
       neither his nor a derby rival: nothing in the game names a champion
       there, and "another club" on top of a table whose every club is known
       left one real club off it. Worked here from the save, not read off
       the module's own flag. */
    const w = career.phone?.world;
    const openTitle = !!w && w.year === row.year && !w.leagues?.[key];
    if (champ) { if (top.name !== champ) fail('2 names', `${tag}: 1st is ${top.name}, the card names ${champ}`); }
    else if (openTitle) {
      stats.openTitles += 1;
      if (!top.named || !pool.has(top.name) || top.name === row.club || rivals.includes(top.name)) fail('2 names', `${tag}: no title race in the ${row.year} ${key}, yet 1st reads ${top.name}`);
    } else if (top.named) fail('2 names', `${tag}: 1st is named ${top.name}, the card names nobody`);
  }
  /* 4 ledger order */
  if (ledger) {
    const order = final.map(r => s.labels[r.slot]).filter(l => l.named && l.name !== row.club && !rivals.includes(l.name) && l.name !== champ).map(l => ledger.clubs.indexOf(l.name));
    if (order.length >= 5) {
      stats.orderN += 1;
      if (order.every((v, i) => i === 0 || v > order[i - 1])) stats.ordered += 1;
    }
  }
}

const seen = new Set();
probeAwardsNight(B, {
  onStep: s => {
    if (!['newspaper', 'season_summary', 'rehab_choice'].includes(s.phase)) return;
    const row = s.seasons[s.seasons.length - 1];
    if (!row || row.type !== 'playing' || !(row.apps > 0)) return;
    const k = `${s.playerName}|${row.year}`;
    if (seen.has(k)) return;
    seen.add(k);
    const ctx = S.buildSoccerSeasonCtx(s, CLUBS, row);
    const d = C.deriveSeason(S.SOCCER, row, ctx);
    if (d) checkTable(s, row, ctx, d, `${s.playerName} ${row.year} ${row.club}`);
  },
});

/* targeted: the abandoned Ligue 1, and a 1995 table for the names control */
const mkRow = o => ({ year: 2019, age: 26, club: 'PSG', clubCountry: 'France', clubTier: 1, apps: 40, leagueApps: 34, goals: 12, assists: 6, cleanSheets: 0, yellowCards: 2, redCards: 0, rating: 7.2, injury: null, injuryWeeks: 0, injurySevere: false, leagueTitle: false, leagueFinish: 3, leagueSize: 20, domesticCup: false, championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null, type: 'playing', intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null, ...o });
/* critic C5's rival gate: the engine only detects a derby with a club in the
   same league that year, so no probe career reaches it; a hand built row
   whose derby rival was a division down (Sunderland, out of the Premier
   League in 2017-18) must show results only. */
const TYNE = [{ rival: 'Sunderland', name: 'Tyne-Wear derby', kind: 'derby', meetings: [{ home: true, gf: 2, ga: 0, played: true, goals: 1, won: true }, { home: false, gf: 1, ga: 1, played: true, goals: 0 }] }];
const TARGETED = [
  ['Ligue 1 2019-20', mkRow({}), 'results', 'format'],
  ['Premier League 1995-96', mkRow({ year: 1995, club: 'Arsenal', clubCountry: 'England', leagueFinish: 5 }), 'table', null],
  ['La Liga 2005-06', mkRow({ year: 2005, club: 'Real Madrid', clubCountry: 'Spain', leagueFinish: 2 }), 'table', null],
  ['Premier League 2017-18, a derby rival a division down', mkRow({ year: 2017, club: 'Newcastle', clubCountry: 'England', clubTier: 3, leagueFinish: 10, derbies: TYNE }), 'results', 'rival'],
  /* Round 1100 (review fix): a table in a league the world runs no title
     race for. Its 1st place is one of the Championship's own 24 clubs. */
  ['Championship 2027-28, no title race', mkRow({ year: 2027, club: 'Norwich City', clubCountry: 'England', clubTier: 4, apps: 42, leagueApps: 38, leagueFinish: 5, leagueSize: 24 }), 'table', null],
];
for (const [id, row, mode, why] of TARGETED) {
  const career = { playerName: `Table ${id}`, position: 'ST', seasons: [row], awards: [], currentLeague: CLUBS.find(c => c.name === row.club)?.league ?? '', phone: { world: { year: row.year, ucl: '', leagues: {} } } };
  const ctx = S.buildSoccerSeasonCtx(career, CLUBS, row);
  const d = C.deriveSeason(S.SOCCER, row, ctx);
  console.log(`   targeted ${id}: ${d ? d.mode : 'refused'} (gate ${ctx.why ?? 'table'})`);
  if (!d || d.mode !== mode || (ctx.why ?? null) !== why) fail('3 gate', `${id}: ${d ? d.mode : 'refused'} with gate ${ctx.why ?? 'table'}, expected ${mode}${why ? ` (${why})` : ''}`);
  if (d) checkTable(career, row, ctx, d, id);
}

console.log(`tables ${stats.tables} (${stats.plain} of them in a plain league outside the five, from 2026-27; ${stats.openTitles} with nobody crowned by the world, 1st place one of the league's own clubs), results ${stats.results}; places named ${stats.named}, unnamed ${stats.unnamed}`);
check(stats.tables >= 300, `the probe reached enough tables (${stats.tables}, floor 300)`);
check(stats.future > 0, `2. saved simulated fields checked on ${stats.future} future tables`);
/* Round 1100 review: the branch of the gate that lets a plain league draw a
   table, and the open title rule, must each have been walked. The probe is
   seeded, so these counts move only with the pool or the engine (PLAIN_FLOOR
   and OPEN_FLOOR above say what was measured). */
check(stats.plain >= PLAIN_FLOOR, `3. the probe reached tables in a plain league outside the five (${stats.plain}, floor ${PLAIN_FLOOR})`);
check(stats.openTitles >= OPEN_FLOOR, `2. tables with nobody crowned by the world (${stats.openTitles}, floor ${OPEN_FLOOR})`);
check(stats.levelSplit >= 50, `1b. final tables hold ${stats.level} neighbours level on points, ${stats.levelSplit} of them where goal difference and goals scored disagree (floor 50), so the order check has cases to see`);
for (const [item, msgs] of fails) console.log(`FAIL item ${item}: ${msgs.join(' | ')}`);
check(fails.size === 0, `replay, naming and the gate on every table${fails.size ? `: ${[...fails.keys()].join(', ')}` : ''}`);
const share = stats.orderN ? stats.ordered / stats.orderN : 0;
check(stats.orderN >= 100 && share <= 0.05, `4. ledger order: ${stats.ordered} of ${stats.orderN} tables (${(share * 100).toFixed(1)}%) finish in the ledger's order, band 5%`);
console.log(`simSeasonCentreTable: ${checks} checks, ${failed} failed${CONTROL ? ` (control ${CONTROL})` : ''}`);
if (CONTROL === 'snapshotfield') {
  if (!fails.has('2 names')) { console.error('CONTROL snapshotfield: DID NOT FIRE at item 2 names'); process.exit(2); }
  console.log('CONTROL snapshotfield: item 2 names failed as expected');
}
process.exit(failed ? 1 : 0);
