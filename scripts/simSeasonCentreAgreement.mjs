/**
 * Round 1045: the season shown IS the season saved (DESIGN 1045 section 9.2).
 *
 * The Season Centre derives a Soccer Career season match by match from the
 * saved row (src/lib/season/core.ts with the soccer binding in
 * src/lib/season/soccer.ts). This harness plays real careers through the
 * real engine and, for every playing season the Centre can open, checks the
 * derived season against the saved row with an INDEPENDENT checker: it never
 * calls the module's own `disagreements`, it recomputes every item from the
 * row and the derived games (DESIGN 3.6, items 1 to 14, with the critic's
 * corrections C2, C3, C4, C13 and C16).
 *
 * Population: CAREERS seeded careers (default 120), the awards probe's seeds
 * mulberry32(c * 7919 + 11 + SEEDSET * 100003), its nations, positions and
 * potentials, eras 1990/2000/2010/2020/2025, a passive driver (first offer,
 * stay at club, first choice, keep playing before 34), plus the targeted
 * rows of section T (hand built from the engine's own shapes).
 *
 * Measured and printed: the gate split, the table yield among rows that
 * pass the gate, the null rate split injured and uninjured, the attempt and
 * repair distributions, determinism (derive twice, and from a JSON round
 * trip of the row), key reconstruction (drawLeagueFinish fed the key rebuilt
 * from the row reproduces its finish), and realism of the full tables
 * (goals a game, home win share, draw share, champion points a game) against
 * the UNCONDITIONED law over the same strength ladders, so acceptance and
 * its repairs are shown not to bend a season out of shape. No real world
 * anchor is quoted: none was two sourced in this round.
 *
 * Controls (AGREEMENT_CONTROL=), each patches one exact string as the code is
 * bundled (refusing to run if the string is missing) and must turn the named
 * check red:
 *   goals       the allocator drops one goal, self check off      -> item 4
 *   position    acceptance ignores the finish, self check off    -> item 2
 *   title       a 2nd place season is played as 1st              -> item 2
 *   derby       a derby's home flag flips                         -> item 5
 *   cleansheet  clean sheet marks skipped, self check off         -> item 6
 *   points      the format ledger opens tables from 1990          -> item 3 (gate)
 *   resultstitle a results only title ignores the champions' band, self check off -> item 4b
 *   leagueapps  the league target is one game over critic C2's  -> item 1
 *               (the review's M2: item 1 now restates the target itself;
 *               2026-10-07, 1990 failures at item 1, exit 1)
 *   offtime     a yellow may land after he went off (the first cut), self check off -> item 8
 *               (2026-10-07: 29 failures at item 8, a yellow at 79' after an
 *               injury at 77', exit 1)
 *   ladder      a results only finish band starts his club on the top rung
 *               (the first cut's bug)                              -> item 4c
 *
 * Item 4c (Round 1045 review): a results only season that saved a finish
 * has that finish's goal difference, not only its points. Each such season
 * is set against the table mode seasons that finished in the same fifth:
 * the share inside the table's p1 to p99 goal difference a game (widened by
 * 0.1) must be at least 0.8, and a fifth with five or more of them must have
 * a mean within 0.45 of the table's. Measured over five seed sets (SEEDSET 0
 * to 4, 2026-10-07): inside 34 of 35, 34 of 35, 25 of 27, 37 of 41, 23 of
 * 24 (min 0.90; 24 of 27 on seed set 2 after Round 1041 merged); fifth mean
 * gaps at most 0.17 (the standard error of a five
 * season mean is about 0.13). Control ladder: 14 of 35 inside, mean gaps
 * 0.52, 0.71 and 0.90 in fifths 2 to 4 (seed set 0), exit 1.
 *   selfcheck   the goals defect with the self check ON: the self check must
 *               refuse those seasons (the null rate goes red), never pass them
 *
 * Control evidence, 2026-10-07 (20 or 24 careers each, every one exit 1):
 *   goals 362 failed at item 4; position 274 at item 2; title 40 at items 2
 *   and 13; derby 995 at item 5; cleansheet 131 at item 6; points 3 (T8 drew
 *   a 1992 Serie A table, item 3); resultstitle 4 at item 4b (champions on
 *   1.76 to 1.84 a game); selfcheck: the self check refused the defective
 *   seasons (null rate 82.78 percent, table yield 20.49) and the checker saw
 *   none of them.
 *
 * Runs past three minutes at full size: run it through detach.sh and
 * waitfor.sh. Green is the closing "simSeasonCentreAgreement: ... 0 failed"
 * line and exit 0.
 */
import path from 'node:path';
import { bundleAwardsNight } from './lib/careerAwardsNightBundle.mjs';
import { mulberry32 } from './lib/careerAwardsNightProbe.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const CAREERS = Number(process.env.CAREERS ?? 120);
const SEEDSET = Number(process.env.SEEDSET ?? 0);
const CONTROL = process.env.AGREEMENT_CONTROL ?? '';
const DIAGNOSTICS = process.env.AGREEMENT_DIAGNOSTICS === '1';

const SELF_OFF = { file: 'src/lib/season/core.ts', from: 'const bad = disagreements(sport, row, ctx, s);', to: 'const bad: string[] = [];' };
const DROP_GOAL = { file: 'src/lib/season/core.ts', from: 'for (let u = 0; u < rem; u += 1) {', to: "for (let u = 0; u < rem - (t.key === 'goals' && rem > 0 ? 1 : 0); u += 1) {" };
const CONTROLS = {
  goals: [DROP_GOAL, SELF_OFF],
  selfcheck: [DROP_GOAL],
  position: [{ file: 'src/lib/season/core.ts', from: '  const f = target.finish;\n  const pos = rows.findIndex(x => x.slot === 0) + 1;\n  if (pos > f)', to: '  const f = target.finish;\n  const pos = rows.findIndex(x => x.slot === 0) + 1;\n  if (f > 0) return null;\n  if (pos > f)' }, SELF_OFF],
  title: [{ file: 'src/lib/season/soccer.ts', from: "return { kind: 'finish', finish: ctx.finish.finish, title, champion };", to: "return { kind: 'finish', finish: ctx.finish.finish === 2 ? 1 : ctx.finish.finish, title: ctx.finish.finish <= 2, champion: ctx.finish.finish <= 2 ? 'mine' as const : champion };" }, SELF_OFF],
  derby: [{ file: 'src/lib/season/soccer.ts', from: 'const g: FixedGame = { key: d.rival, home: m.home,', to: 'const g: FixedGame = { key: d.rival, home: !m.home,' }],
  cleansheet: [{ file: 'src/lib/season/core.ts', from: "marks[i] = s ? 'shutout' : 'concede';", to: 'marks[i] = undefined;' }, SELF_OFF],
  points: [{ file: 'src/data/leagueFormat.ts', from: '"Serie A": [{ from: 1995 }],', to: '"Serie A": [{ from: 1990 }],' }],
  leagueapps: [{ file: 'src/lib/season/soccer.ts', from: 'const want = Math.min(row.leagueApps ?? row.apps, room, row.apps);', to: 'const want = Math.min((row.leagueApps ?? row.apps) + 1, room, row.apps);' }],
  offtime: [{ file: 'src/lib/season/soccerEvents.ts', from: 'Math.max(1, offAt - lastMine)', to: 'Math.max(1, SOCCER_FULL_TIME + 1 - lastMine)' }, SELF_OFF],
  ladder: [{ file: 'src/lib/season/soccer.ts', from: "const tier = fromFinish ?? (target.kind === 'band' ? 1 : byTier);", to: "const tier = target.kind === 'band' ? 1 : fromFinish ?? byTier;" }],
  resultstitle: [{ file: 'src/lib/season/core.ts', from: "    return ppg < target.ppgMin ? { slot: 0, dir: 1 } : ppg > target.ppgMax ? { slot: 0, dir: -1 } : null;", to: '    return null;' }, SELF_OFF],
};
if (CONTROL && !CONTROLS[CONTROL]) throw new Error(`unknown AGREEMENT_CONTROL ${CONTROL}`);
if (CONTROL) console.log(`CONTROL ${CONTROL}: ${CONTROLS[CONTROL].map(p => p.file).join(', ')} patched in the bundle only`);

const t0 = Date.now();
const B = await bundleAwardsNight(ROOT, {
  patches: CONTROL ? CONTROLS[CONTROL] : [],
  extra: { season: 'src/lib/season/soccer.ts', core: 'src/lib/season/core.ts', league: 'src/lib/soccerCareerLeague.ts', derby: 'src/lib/soccerCareerDerby.ts', leagueWorld: 'src/lib/soccerCareerLeagueWorld.ts' },
});
const { soccer, season: S, core: C, league: LG, derby: DB, leagueWorld: LW } = B;
const CLUBS = soccer.FALLBACK_CLUBS;
console.log(`bundled in ${Date.now() - t0} ms; ${CAREERS} careers, seed set ${SEEDSET}`);

let checks = 0, failed = 0;
const fails = new Map();
const fail = (item, msg) => { failed += 1; if (!fails.has(item)) fails.set(item, []); const l = fails.get(item); if (l.length < 4) l.push(msg); };
const check = (ok, label) => { checks += 1; if (ok) console.log(`ok   ${label}`); else { failed += 1; console.log(`FAIL ${label}`); } };

/* ─── The passive driver ─── */
const NATS = ['England', 'Brazil', 'France', 'Spain', 'Argentina', 'Nigeria', 'Japan', 'Norway'];
const POSITIONS = ['ST', 'LW', 'CAM', 'RW', 'CM', 'CB', 'GK', 'CDM', 'LB', 'RB'];
const ERAS = [{ value: '1990-94', y: 1990 }, { value: '2000-04', y: 2000 }, { value: '2010-14', y: 2010 }, { value: '2020-24', y: 2020 }, { value: '2025', y: 2025 }];
const POT = [95, 92, 89, 86, 83, 80, 77, 93];
const abil = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });

/** Every playing season with apps > 0 as the career saved it, with the
 *  career as it stood the moment the row was added. */
function playCareers(onSeason) {
  for (let c = 0; c < CAREERS; c += 1) {
    const real = Math.random;
    Math.random = mulberry32(c * 7919 + 11 + SEEDSET * 100003);
    let s;
    try {
      const era = ERAS[c % ERAS.length];
      const o = 58 + ((c * 7) % 22);
      s = soccer.initCareer(`Agree ${SEEDSET}.${c}`, NATS[c % NATS.length], POSITIONS[(c * 3) % POSITIONS.length], era.value, abil(o), o, era.y, CLUBS, null, POT[c % POT.length]);
      let rows = s.seasons.length;
      for (let guard = 0; !s.retired && guard < 700; guard += 1) {
        const ph = s.phase;
        if (['retirement_ceremony', 'retired', 'post_retirement', 'manager_season', 'pundit_season', 'owner_season'].includes(ph)) break;
        if (s.seasons.length > rows) {
          rows = s.seasons.length;
          const row = s.seasons[rows - 1];
          if (row.type === 'playing' && row.apps > 0) {
            const keep = Math.random;
            Math.random = () => { throw new Error('Math.random called while deriving'); };
            try { onSeason(s, row, c); } finally { Math.random = keep; }
          }
        }
        s = step(s, ph);
      }
    } finally { Math.random = real; }
  }
}

function step(s, ph) {
  switch (ph) {
    case 'youth': return soccer.advanceYouthYear(s, CLUBS);
    case 'contract_offer': { const offers = s.pendingOffers || []; return offers.length ? soccer.acceptOffer(s, offers[0]) : { ...s, phase: 'playing' }; }
    case 'playing': return soccer.advanceProSeason(s, CLUBS);
    case 'newspaper': return soccer.dismissNewspaper(s);
    case 'season_summary': return soccer.dismissSummary(s, CLUBS);
    case 'ballon_dor': return soccer.dismissBallonDor(s, CLUBS);
    case 'international_debut': return soccer.dismissDebut(s, CLUBS);
    case 'world_cup': return soccer.dismissWorldCup(s, CLUBS);
    case 'rivalry_event': return soccer.dismissRivalryEvent(s, CLUBS);
    case 'social_media_action': return soccer.dismissSocialMediaPhase(s, CLUBS);
    case 'moral_dilemma': { const n = soccer.applyMoralDilemmaChoice(s, 0); return n.phase === 'moral_dilemma' ? soccer.dismissMoralDilemma(n, CLUBS) : n; }
    case 'random_events': { const ev = (s.pendingEvents || [])[0]; return ev && ev.choices && ev.choices.length ? soccer.applyEventChoice(s, 0, CLUBS) : { ...s, phase: 'playing', pendingEvents: [] }; }
    case 'red_card_appeal_result': return soccer.dismissAppealResult(s, CLUBS);
    case 'rehab_choice': return soccer.applyRehabChoice(s, 0);
    case 'transfer_window': return soccer.stayAtClub(s);
    case 'retirement_suggestion': return s.age >= 34 ? soccer.acceptRetirementSuggestion(s) : soccer.declineRetirementSuggestion(s, CLUBS);
    default: throw new Error(`no driver for phase "${ph}"`);
  }
}

/* ─── The independent checker (never calls the module's disagreements) ─── */
const KEEPS = new Set(['GK', 'CB', 'LB', 'RB']);
const keyOf = g => (g.fixedKey ?? null);

/** The summary card's champion, re-read here from the card's own rule. */
function cardChampion(career, row) {
  const finish = LG.readLeagueFinish(row);
  const snapshot = LW.readLeagueWorldSeason(row);
  if (snapshot) return finish && finish.finish !== 1 ? snapshot.champion : null;
  const today = CLUBS.find(c => c.name === row.club)?.league ?? '';
  const lo = LG.finishLeague({ name: row.club, league: today }, row.year, finish?.size ?? null);
  const w = career.phone?.world;
  if (!finish || finish.finish === 1 || !lo || !w || w.year !== row.year) return null;
  const crowned = w.leagues?.[lo.key];
  if (!crowned || crowned === row.club) return null;
  return LG.namedInLeague(crowned, lo.key, row.year) ? crowned : null;
}

/** A from scratch table: points 3, 1, 0; order by points, goal difference, goals for. */
function replayTable(rounds, teams, upto) {
  const t = Array.from({ length: teams }, (_, slot) => ({ slot, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
  for (let r = 0; r < upto; r += 1) for (const [h, a, hg, ag] of rounds[r]) {
    t[h].p++; t[a].p++; t[h].gf += hg; t[h].ga += ag; t[a].gf += ag; t[a].ga += hg;
    if (hg > ag) { t[h].w++; t[a].l++; t[h].pts += 3; } else if (ag > hg) { t[a].w++; t[h].l++; t[a].pts += 3; } else { t[h].d++; t[a].d++; t[h].pts++; t[a].pts++; }
  }
  return t.sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || x.slot - y.slot);
}

/** Items 1 to 13 of DESIGN 3.6 for one derived season. */
function checkSeason(career, row, ctx, s, tag) {
  const on = s.games.filter(g => g.played);
  const bucket = s.bucket ?? { apps: 0, line: {} };
  const sum = k => on.reduce((a, g) => a + (g.line[k] ?? 0), 0) + (bucket.line[k] ?? 0);
  const pos = career.position;
  const M = s.games.length;
  /* 1 apps */
  if (on.length + bucket.apps !== row.apps) fail('1 apps', `${tag}: ${on.length}+${bucket.apps} != ${row.apps}`);
  {
    /* critic C2's league target, restated here (Round 1045 review): the
       games shown are min(leagueApps or apps, the games the injury block
       leaves, apps), never fewer than the derbies he played */
    const wk = row.injuryWeeks ?? 0;
    const blk = wk > 0 ? Math.min(M, Math.max(1, Math.round((wk * M) / 46))) : 0;
    const missedDerbies = DB.readSeasonDerbies(row).reduce((a, d) => a + d.meetings.filter(m => !m.played).length, 0);
    const room = Math.min(row.injurySevere && blk > 0 ? M : M - blk, M - missedDerbies);
    const derbiesPlayed = DB.readSeasonDerbies(row).reduce((a, d) => a + d.meetings.filter(m => m.played).length, 0);
    const want = Math.min(Math.max(Math.min(row.leagueApps ?? row.apps, room, row.apps), derbiesPlayed), room, row.apps);
    if (on.length !== want) fail('1 apps', `${tag}: ${on.length} league games shown for a target of ${want} (leagueApps ${row.leagueApps}, ${M} games, block ${blk})`);
  }
  const size = s.mode === 'table' ? row.leagueSize : null;
  if (s.mode === 'table' && M !== 2 * (size - 1)) fail('1 apps', `${tag}: ${M} games in a ${size} club league`);
  /* 2 position and champion, 3 points, 13 clinch */
  if (s.mode === 'table') {
    if (row.year < 1995) fail('3 points', `${tag}: a table in ${row.year} (three points for a win not verified before 1995-96)`);
    if (ctx.league?.key === 'Ligue 1' && row.year === 2019) fail('3 points', `${tag}: a table for the abandoned 2019-20 Ligue 1`);
    const t = replayTable(s.rounds, s.teams, s.rounds.length);
    const snapshot = LW.readLeagueWorldSeason(row);
    if (snapshot) {
      const names = s.labels.map(l => l.name).sort();
      if (JSON.stringify(names) !== JSON.stringify([...snapshot.members].sort())) fail('15 league world', `${tag}: displayed clubs differ from the saved season field`);
      const count = { 'Premier League': 3, 'Championship': 3, 'Bundesliga': 2, '2. Bundesliga': 2, 'Ligue 1': 2, 'Ligue 2': 2, 'Serie A': 3, 'Serie B': 3, 'La Liga': 3, 'Segunda Division': 3 }[snapshot.league];
      const lower = ['Championship', '2. Bundesliga', 'Ligue 2', 'Serie B', 'Segunda Division'].includes(snapshot.league);
      const order = t.map(r => s.labels[r.slot].name);
      const expected = lower ? order.slice(0, count) : order.slice(-count);
      const moved = (snapshot.movements ?? []).filter(m => m.from === snapshot.league).map(m => m.club);
      if (snapshot.movements && JSON.stringify([...expected].sort()) !== JSON.stringify([...moved].sort())) fail('15 league world', `${tag}: movement differs from the final displayed places`);
      if (row.leagueApps > 2 * (snapshot.members.length - 1)) fail('15 league world', `${tag}: league apps exceed the simulated division calendar`);
    }
    const at = t.findIndex(r => r.slot === 0);
    if (at + 1 !== row.leagueFinish) fail('2 position', `${tag}: ${at + 1} for a saved ${row.leagueFinish}`);
    if ((at === 0) !== !!row.leagueTitle) fail('2 position', `${tag}: 1st ${at === 0} with leagueTitle ${row.leagueTitle}`);
    if (t[0].pts === t[1].pts) fail('2 position', `${tag}: 1st not alone`);
    if (at > 0 && t[at - 1].pts === t[at].pts) fail('2 position', `${tag}: level with the club above`);
    if (at < t.length - 1 && t[at + 1].pts === t[at].pts) fail('2 position', `${tag}: level with the club below`);
    const champ = cardChampion(career, row);
    const top = s.labels[t[0].slot];
    if (at !== 0) {
      /* Round 1100 (review fix): the same three cases simSeasonCentreTable
         item 2 states. The card's champion when it names one; nobody when
         the world crowned a club the card cannot name or this season's
         world is not held; and a named club that is not his where the world
         holds the season and runs no title race in the league, because no
         page of the game names a champion there. */
      const w = career.phone?.world;
      const openTitle = !!w && w.year === row.year && !!ctx.league?.key && !w.leagues?.[ctx.league.key];
      if (champ) { if (top.name !== champ) fail('2 position', `${tag}: 1st is ${top.name}, the card names ${champ}`); }
      else if (openTitle) { stats.openTitles = (stats.openTitles ?? 0) + 1; if (!top.named || top.name === row.club) fail('2 position', `${tag}: no title race in the ${row.year} ${ctx.league.key}, yet 1st reads ${top.name}`); }
      else if (top.named) fail('2 position', `${tag}: 1st is named ${top.name}, the card names nobody`);
    }
    for (const r of t) if (r.pts !== 3 * r.w + r.d || r.p !== M) fail('3 points', `${tag}: slot ${r.slot} ${r.pts} pts from ${r.w}-${r.d}-${r.l} in ${r.p}`);
    const pairs = new Set();
    for (const rd of s.rounds) for (const [h, a] of rd) pairs.add(`${h}-${a}`);
    if (pairs.size !== s.teams * (s.teams - 1)) fail('3 points', `${tag}: ${pairs.size} home and away pairs for ${s.teams} clubs`);
    if (row.leagueTitle) {
      let md = null;
      for (let k = 1; k <= M && md === null; k += 1) {
        const tk = replayTable(s.rounds, s.teams, k);
        const me = tk.find(r => r.slot === 0);
        if (tk.every(r => r.slot === 0 || me.pts > r.pts + 3 * (M - r.p))) md = k;
      }
      if ((s.clinch?.md ?? null) !== md) fail('13 clinch', `${tag}: clinch ${s.clinch?.md} for ${md}`);
    } else if (s.clinch) fail('13 clinch', `${tag}: a clinch on a season he did not win`);
  }
  /* 4 goals and assists */
  if (sum('goals') !== row.goals) fail('4 goals', `${tag}: ${sum('goals')} goals for ${row.goals}`);
  if (sum('assists') !== row.assists) fail('4 goals', `${tag}: ${sum('assists')} assists for ${row.assists}`);
  if (pos === 'GK' && sum('goals') > 0) fail('4 goals', `${tag}: a keeper scored`);
  if (ctx.goldenBoot && (bucket.line.goals ?? 0) > 0) fail('4 goals', `${tag}: Golden Boot goals in the bucket`);
  for (const g of on) {
    if ((g.line.goals ?? 0) + (g.line.assists ?? 0) > g.us) fail('4 goals', `${tag} md ${g.md}: his goals and assists above the club's ${g.us}`);
    const ev = g.events.filter(e => e.kind === 'goal');
    if (ev.filter(e => e.side === 'us').length !== g.us || ev.filter(e => e.side === 'them').length !== g.them) fail('4 goals', `${tag} md ${g.md}: goal events do not make the score`);
    if (ev.filter(e => e.mine).length !== (g.line.goals ?? 0)) fail('4 goals', `${tag} md ${g.md}: his goal events`);
    if (g.onAt && g.events.some(e => e.mine && e.kind !== 'on' && e.min < g.onAt)) fail('4 goals', `${tag} md ${g.md}: an event before he came on`);
  }
  if (s.mode !== 'table' && row.leagueTitle && !row.injurySevere) {
    let w = 0, d = 0;
    for (const g of s.games) { if (g.us > g.them) w++; else if (g.us === g.them) d++; }
    const ppg = (3 * w + d) / M;
    if (ppg < S.CHAMPION_PPG.min || ppg > S.CHAMPION_PPG.max) fail('4b results title', `${tag}: champions on ${ppg.toFixed(2)} a game`);
  } else if (s.mode !== 'table' && typeof row.leagueFinish === 'number' && row.leagueSize && !row.injurySevere) {
    /* critic C4 widened by the review: a results only season with a saved finish plays like that finish */
    let w = 0, d = 0;
    for (const g of s.games) { if (g.us > g.them) w++; else if (g.us === g.them) d++; }
    const ppg = (3 * w + d) / M;
    const band = S.FINISH_PPG[Math.min(4, Math.floor(((row.leagueFinish - 1) / (row.leagueSize - 1)) * 5))];
    if (ppg < band.min || ppg > band.max) fail('4b results title', `${tag}: ${row.leagueFinish} of ${row.leagueSize} on ${ppg.toFixed(2)} a game`);
  }
  /* 5 derbies */
  const derbies = DB.readSeasonDerbies(row);
  for (const d of derbies) {
    const got = s.games.filter(g => keyOf(g) === d.rival);
    if (got.length !== d.meetings.length) { fail('5 derby', `${tag}: ${got.length} games with ${d.rival}`); continue; }
    d.meetings.forEach((m, i) => {
      const g = got[i];
      if (g.home !== m.home || g.us !== m.gf || g.them !== m.ga || g.played !== m.played || (m.played && (g.line.goals ?? 0) !== m.goals)) fail('5 derby', `${tag}: ${d.rival} #${i + 1}`);
      if (m.played && m.gf > m.ga) {
        const ours = g.events.filter(e => e.kind === 'goal' && e.side === 'us').sort((x, y) => x.min - y.min);
        const decisive = !!ours[m.ga]?.mine;
        if (decisive !== !!m.won) fail('5 derby', `${tag}: ${d.rival} #${i + 1} decisive ${decisive} won ${!!m.won}`);
      }
    });
    if (got.length === 2 && got[0].md >= got[1].md) fail('5 derby', `${tag}: ${d.rival} meetings out of order`);
  }
  /* 6 clean sheets */
  if (KEEPS.has(pos)) {
    const shown = on.filter(g => g.them === 0).length;
    if (shown + (bucket.line.cs ?? 0) !== row.cleanSheets) fail('6 cleansheet', `${tag}: ${shown}+${bucket.line.cs ?? 0} for ${row.cleanSheets}`);
    if ((bucket.line.cs ?? 0) > bucket.apps) fail('6 cleansheet', `${tag}: more bucket clean sheets than games`);
  }
  /* 7 rating */
  if (on.length) {
    const mean = on.reduce((a, g) => a + g.line.rating, 0) / on.length;
    if (Math.round(mean * 10 + 1e-9) !== Math.round(row.rating * 10)) fail('7 rating', `${tag}: mean ${mean.toFixed(3)} for ${row.rating}`);
    if (on.some(g => g.line.rating < 3 || g.line.rating > 10)) fail('7 rating', `${tag}: a rating out of range`);
  }
  /* 8 cards */
  if (sum('yellow') !== row.yellowCards || sum('red') !== row.redCards) fail('8 cards', `${tag}: cards ${sum('yellow')}/${sum('red')} for ${row.yellowCards}/${row.redCards}`);
  s.games.forEach((g, i) => {
    if ((g.line.red ?? 0) > 0 && s.games[i + 1]?.why !== 'suspended' && s.games.slice(i + 1).some(x => x.played)) fail('8 cards', `${tag}: a red with no suspension`);
    /* the review's finding: nothing of his after he went off (a card after the injury) */
    const off = g.events.find(e => e.mine && (e.kind === 'injury' || e.kind === 'red'));
    if (off && g.events.some(e => e.mine && e.min > off.min)) fail('8 cards', `${tag} md ${g.md}: ${g.events.filter(e => e.mine && e.min > off.min).map(e => `${e.kind} ${e.min}'`).join(', ')} after he went off at ${off.min}'`);
  });
  /* 9 injury */
  const w = row.injuryWeeks ?? 0;
  const block = w > 0 ? Math.min(M, Math.max(1, Math.round((w * M) / 46))) : 0;
  const inj = s.games.map(g => g.why === 'injured');
  const first = inj.indexOf(true), last = inj.lastIndexOf(true);
  const run = first < 0 ? 0 : last - first + 1;
  if (first >= 0 && inj.slice(first, last + 1).some(x => !x)) fail('9 injury', `${tag}: injury is not one run`);
  if (row.injurySevere && block > 0) {
    const lastPlayed = s.games.map(g => g.played).lastIndexOf(true);
    if (run !== Math.min(block, M - lastPlayed - 1) || (first >= 0 && first !== lastPlayed + 1)) fail('9 injury', `${tag}: severe run ${run} at ${first} after ${lastPlayed}`);
    if (s.mode === 'table' || s.clinch) fail('9 injury', `${tag}: a table on a severe injury season`);
  } else if (run !== block) fail('9 injury', `${tag}: run ${run} for ${w} weeks (${block})`);
  /* 10, 11 cups and Europe stay in the bucket; 12 loan: every game is his club's */
  if (s.games.some(g => g.md < 1 || g.md > M)) fail('10 cups', `${tag}: a game off the league calendar`);
  if (s.labels[0]?.name !== row.club) fail('12 loan', `${tag}: slot 0 is ${s.labels[0]?.name}, the row says ${row.club}`);
}

/* ─── Thresholds, from five seed sets of 120 careers (SEEDSET 0 to 4, 2026-10-07):
   null rate 0.14, 0.24, 0.09, 0.14, 0.19 percent (max 0.24, band 0.6, 2.5 times);
   table yield 99.72, 99.71, 99.82, 99.73, 99.63 percent (min 99.63, band 99.2);
   realism gaps, derived minus unconditioned: goals a game +0.013, +0.012,
   +0.015, +0.008, +0.018 (band 0.05); home win share within 0.001 and draw
   share within 0.002 (bands 0.015); champions' points a game -0.036, -0.015,
   -0.018, -0.021, -0.021 (band 0.08). Determinism and key reconstruction
   were exact on every season of every set. ─── */
const BANDS = {
  nullRateMax: 0.006,
  tableYieldMin: 0.992,
  realism: { gpg: 0.05, home: 0.015, draw: 0.015, champPpg: 0.08 },
  shape: { pad: 0.1, meanGap: 0.45, insideMin: 0.8 },
};

const stats = { seasons: 0, gate: {}, ok: { table: 0, results: 0 }, nul: { injured: 0, clean: 0 }, injuredN: 0, cleanN: 0, why: {}, attempts: {}, repairs: {}, determinism: 0, determinismBad: 0, keyOk: 0, keyBad: 0, keyN: 0 };
const bump = (o, k) => { o[k] = (o[k] ?? 0) + 1; };
const real = { d: { gpg: [], home: [], draw: [], champPpg: [] }, u: { gpg: [], home: [], draw: [], champPpg: [] } };
const champPpgTable = [];
/* his points a game in table mode, by where he finished (fifths of the table) */
const finishPpg = [];
/* his goal difference a game, table mode by fifth, and results only seasons with a saved finish by fifth */
const finishGd = [];
const resultsGd = [];

function seasonShape(rounds) {
  let g = 0, n = 0, hw = 0, dr = 0;
  for (const rd of rounds) for (const [, , hg, ag] of rd) { g += hg + ag; n += 1; if (hg > ag) hw += 1; else if (hg === ag) dr += 1; }
  return { gpg: g / n, home: hw / n, draw: dr / n };
}

/** The same ladder recipe and the same law, with no acceptance and no repair. */
function unconditioned(row, ctx, s, seed) {
  const frame = S.SOCCER.frame(row, ctx);
  const slotOf = new Map();
  for (const g of s.games) if (g.fixedKey) slotOf.set(g.fixedKey, g.opp);
  const rng = mulberry32(seed);
  const str = S.SOCCER.strengths(frame, S.SOCCER.target(row, ctx, frame), slotOf, ctx, rng);
  const rounds = C.roundRobinRounds(frame.teams).map(rd => rd.map(([h, a]) => { const [hg, ag] = S.SOCCER.score(str[h] - str[a], true, rng); return [h, a, hg, ag]; }));
  return rounds;
}

function onSeason(career, row, c) {
  stats.seasons += 1;
  const ctx = S.buildSoccerSeasonCtx(career, CLUBS, row);
  bump(stats.gate, ctx.why ?? 'table');
  const injured = (row.injuryWeeks ?? 0) > 0;
  if (injured) stats.injuredN += 1; else stats.cleanN += 1;
  const r = C.deriveSeasonOrWhy(S.SOCCER, row, ctx);
  const tag = `c${c} ${row.year} ${row.club}`;
  if (typeof r === 'string') {
    bump(stats.nul, injured ? 'injured' : 'clean');
    bump(stats.why, `${ctx.mode}:${r}`);
    if (DIAGNOSTICS) console.log(`REFUSED ${tag} at ${r}: ${JSON.stringify({ row, ctx })}`);
    return;
  }
  stats.ok[r.mode] += 1;
  bump(stats.attempts, r.attempt < 3 ? r.attempt : r.attempt < 10 ? '3-9' : '10+');
  bump(stats.repairs, r.repairs === 0 ? '0' : r.repairs <= 5 ? '1-5' : r.repairs <= 15 ? '6-15' : '16-40');
  checkSeason(career, row, ctx, r, tag);
  /* 14 determinism: again, and from a JSON round trip of the row */
  const again = C.deriveSeason(S.SOCCER, row, ctx);
  const trip = C.deriveSeason(S.SOCCER, JSON.parse(JSON.stringify(row)), S.buildSoccerSeasonCtx(career, CLUBS, JSON.parse(JSON.stringify(row))));
  if (JSON.stringify(again) === JSON.stringify(r) && JSON.stringify(trip) === JSON.stringify(r)) stats.determinism += 1;
  else { stats.determinismBad += 1; fail('14 determinism', tag); }
  /* key reconstruction: the finish key rebuilt from the row draws the row's finish */
  if (!row.injurySevere && typeof row.leagueFinish === 'number' && !row.leagueTitle) {
    stats.keyN += 1;
    const snapshot = LW.readLeagueWorldSeason(row);
    const simulationOnly = snapshot && ['Ligue 2', 'Serie B', 'Segunda Division'].includes(snapshot.league);
    const drawn = simulationOnly ? { leagueFinish: LW.drawLeagueWorldFinish(row, career.playerName, snapshot.members.length) } : LG.drawLeagueFinish({
      league: snapshot?.league ?? LG.leagueKeyInYear({ name: row.club, league: career.currentLeague }, row.year), year: row.year, tier: row.clubTier,
      elite: LG.eliteInYear(soccer.ELITE_CLUBS, row.club, row.year), rating: row.rating, leagueTitle: false,
      seedKey: `${career.playerName}|${row.club}|${row.year}|${row.apps}|${row.goals}|${row.assists}|${row.rating}`,
    });
    if (drawn.leagueFinish === row.leagueFinish) stats.keyOk += 1; else { stats.keyBad += 1; fail('14 key', `${tag}: drew ${drawn.leagueFinish} for ${row.leagueFinish}`); }
  }
  /* realism: full 20 club tables against the unconditioned law */
  if (r.mode === 'table' && r.teams === 20) {
    const d = seasonShape(r.rounds);
    const u = unconditioned(row, ctx, r, (c * 7919 + row.year) >>> 0);
    const us = seasonShape(u);
    const champ = t => (C.standingsOf(t, 20, { win: 3, draw: 1, loss: 0 }, 38)[0].pts) / 38;
    for (const k of ['gpg', 'home', 'draw']) { real.d[k].push(d[k]); real.u[k].push(us[k]); }
    real.d.champPpg.push(champ(r.rounds)); real.u.champPpg.push(champ(u));
  }
  if (r.mode === 'table' && !row.leagueTitle) {
    const me = C.standingsOf(r.rounds, r.teams, { win: 3, draw: 1, loss: 0 }, r.rounds.length).find(x => x.slot === 0);
    const b = Math.min(4, Math.floor(((row.leagueFinish - 1) / (row.leagueSize - 1)) * 5));
    (finishPpg[b] ??= []).push(me.pts / r.games.length);
    (finishGd[b] ??= []).push((me.gf - me.ga) / r.games.length);
  }
  if (r.mode !== 'table' && typeof row.leagueFinish === 'number' && row.leagueSize && !row.leagueTitle && !row.injurySevere) {
    /* 4c: the shape of a results only season that saved a finish */
    let gf = 0, ga = 0;
    for (const g of r.games) { gf += g.us; ga += g.them; }
    const b = Math.min(4, Math.floor(((row.leagueFinish - 1) / (row.leagueSize - 1)) * 5));
    (resultsGd[b] ??= []).push({ gd: (gf - ga) / r.games.length, tag: `${tag} ${row.leagueFinish} of ${row.leagueSize} GD ${gf - ga}` });
  }
  if (r.mode === 'table') champPpgTable.push(C.standingsOf(r.rounds, r.teams, { win: 3, draw: 1, loss: 0 }, r.rounds.length)[0].pts / r.games.length);
}

const tPlay = Date.now();
playCareers(onSeason);
console.log(`played ${CAREERS} careers in ${Date.now() - tPlay} ms`);

/* ─── Section T: targeted rows, hand built in the engine's own shapes ─── */
const mkRow = o => ({
  year: 2005, age: 26, club: 'Arsenal', clubCountry: 'England', clubTier: 1, apps: 40, leagueApps: 34, goals: 8, assists: 5,
  cleanSheets: 0, yellowCards: 2, redCards: 0, rating: 7.1, injury: null, injuryWeeks: 0, injurySevere: false, leagueTitle: false,
  leagueFinish: 4, leagueSize: 20, domesticCup: false, championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null,
  type: 'playing', intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null, ...o,
});
const NLD = (m1, m2) => [{ rival: 'Tottenham', name: 'North London derby', kind: 'derby', meetings: [m1, m2] }];
const TARGETED = [
  { id: 'T1 old save, no leagueApps, no finish', mode: 'results', pos: 'ST', row: mkRow({ leagueApps: undefined, leagueFinish: undefined, leagueSize: undefined, apps: 30 }) },
  { id: 'T2 keeper, clean sheets equal apps', mode: 'table', pos: 'GK', row: mkRow({ apps: 24, leagueApps: 24, goals: 0, assists: 0, cleanSheets: 24, leagueFinish: 2 }) },
  { id: 'T3 defender with derby shutouts', mode: 'table', pos: 'CB', row: mkRow({ goals: 2, cleanSheets: 12, derbies: NLD({ home: true, gf: 1, ga: 0, played: true, goals: 1, won: true }, { home: false, gf: 0, ga: 0, played: true, goals: 0 }) }) },
  { id: 'T4 severe injury, both derbies played', mode: 'results', pos: 'ST', row: mkRow({ apps: 22, leagueApps: 30, injury: 'ACL', injuryWeeks: 24, injurySevere: true, leagueFinish: undefined, leagueSize: undefined, derbies: NLD({ home: false, gf: 2, ga: 1, played: true, goals: 1 }, { home: true, gf: 1, ga: 1, played: true, goals: 0 }) }) },
  { id: 'T5 on loan', mode: 'table', pos: 'CM', row: mkRow({ club: 'Tottenham', clubTier: 2, onLoanFrom: 'Arsenal', leagueFinish: 9 }) },
  { id: 'T6 red card in his last league game', mode: 'table', pos: 'CDM', row: mkRow({ apps: 44, leagueApps: 38, redCards: 1, yellowCards: 6 }) },
  { id: 'T7 38 league apps in an 18 club league', mode: 'table', pos: 'ST', row: mkRow({ club: 'Bayern Munich', clubCountry: 'Germany', year: 2010, apps: 45, leagueApps: 38, leagueFinish: 2, leagueSize: 18, goals: 20 }) },
  { id: 'T8 a 1992/93 Serie A row', mode: 'results', pos: 'ST', row: mkRow({ club: 'Juventus', clubCountry: 'Italy', year: 1992, leagueFinish: 4, leagueSize: 18 }) },
  { id: 'T9 starter, 36 league apps, 10 week injury', mode: 'table', pos: 'ST', row: mkRow({ apps: 40, leagueApps: 36, injury: 'Hamstring', injuryWeeks: 10, leagueFinish: 3, goals: 14 }) },
  { id: 'T10 injured results mode row', mode: 'results', pos: 'LW', row: mkRow({ club: 'Ajax', clubCountry: 'Netherlands', leagueFinish: undefined, leagueSize: undefined, injury: 'Ankle', injuryWeeks: 6 }) },
  { id: 'T11 Ligue 1 2019-20 champions (abandoned)', mode: 'results', pos: 'ST', row: mkRow({ club: 'PSG', clubCountry: 'France', year: 2019, leagueFinish: 1, leagueSize: 20, leagueTitle: true, goals: 18 }) },
  { id: 'T12 Golden Boot season', mode: 'table', pos: 'ST', row: mkRow({ apps: 46, leagueApps: 35, goals: 31, leagueFinish: 2 }), awards: [{ year: 2005, name: 'Golden Boot', emoji: '' }] },
  { id: 'T13 a title with no verified size', mode: 'results', pos: 'ST', row: mkRow({ club: 'Ajax', clubCountry: 'Netherlands', leagueFinish: 1, leagueSize: undefined, leagueTitle: true }) },
];
for (const t of TARGETED) {
  for (const k of Object.keys(t.row)) if (t.row[k] === undefined) delete t.row[k];
  const career = { playerName: `Targeted ${t.id.split(' ')[0]}`, position: t.pos, seasons: [t.row], awards: t.awards ?? [], currentLeague: CLUBS.find(c => c.name === t.row.club)?.league ?? '', phone: { world: { year: t.row.year, ucl: '', leagues: {} } } };
  const ctx = S.buildSoccerSeasonCtx(career, CLUBS, t.row);
  const r = C.deriveSeasonOrWhy(S.SOCCER, t.row, ctx);
  const ok = typeof r !== 'string' && r.mode === t.mode;
  check(ok, `${t.id}: ${typeof r === 'string' ? `refused at ${r} (gate ${ctx.why ?? 'table'})` : `${r.mode} mode, attempt ${r.attempt}, ${r.repairs} repairs`}`);
  if (typeof r !== 'string') checkSeason(career, t.row, ctx, r, t.id.split(' ')[0]);
}

/* ─── Section M: the measurements and the verdict ─── */
const median = xs => { const a = [...xs].sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : NaN; };
const mean = xs => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const nulls = (stats.nul.injured ?? 0) + (stats.nul.clean ?? 0);
const gated = stats.gate.table ?? 0;
console.log(`seasons ${stats.seasons}; gate ${JSON.stringify(stats.gate)}`);
console.log(`derived: table ${stats.ok.table}, results ${stats.ok.results}; null ${nulls} (injured ${stats.nul.injured ?? 0} of ${stats.injuredN}, uninjured ${stats.nul.clean ?? 0} of ${stats.cleanN}) ${JSON.stringify(stats.why)}`);
console.log(`attempts ${JSON.stringify(stats.attempts)}; repairs ${JSON.stringify(stats.repairs)}`);
console.log(`determinism ${stats.determinism} of ${stats.determinism + stats.determinismBad}; key reconstruction ${stats.keyOk} of ${stats.keyN}`);
console.log(`tables in a league the world runs no title race for, 1st place a named club that is not his: ${stats.openTitles ?? 0}`);
const yieldT = gated ? stats.ok.table / gated : 1;
const nullRate = stats.seasons ? nulls / stats.seasons : 0;
check(stats.seasons > 0 && stats.ok.table > 0 && stats.ok.results > 0, `the population has both modes (${stats.ok.table} table, ${stats.ok.results} results)`);
check(nullRate <= BANDS.nullRateMax, `null rate ${(nullRate * 100).toFixed(2)}% at most ${BANDS.nullRateMax * 100}%`);
check(yieldT >= BANDS.tableYieldMin, `table yield ${(yieldT * 100).toFixed(2)}% of ${gated} gated seasons, at least ${BANDS.tableYieldMin * 100}%`);
check(stats.determinismBad === 0 && stats.determinism > 0, `determinism on ${stats.determinism} seasons`);
check(stats.keyBad === 0 && stats.keyN > 0, `key reconstruction on ${stats.keyN} finishes`);
for (const k of ['gpg', 'home', 'draw', 'champPpg']) {
  const d = mean(real.d[k]), u = mean(real.u[k]);
  check(real.d[k].length > 20 && Math.abs(d - u) <= BANDS.realism[k], `realism ${k}: derived ${d.toFixed(3)} against unconditioned ${u.toFixed(3)} (gap ${(d - u).toFixed(3)}, band ${BANDS.realism[k]}) over ${real.d[k].length} tables`);
}
const sorted = [...champPpgTable].sort((a, b) => a - b);
const pct = q => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
for (let b = 0; b < 5; b += 1) { const xs = [...(finishPpg[b] ?? [])].sort((x, y) => x - y); const q = f => xs[Math.min(xs.length - 1, Math.floor(f * xs.length))]; console.log(`finish fifth ${b + 1} (not champions): points a game p1 ${q(0.01)?.toFixed(2)} p50 ${q(0.5)?.toFixed(2)} p99 ${q(0.99)?.toFixed(2)} over ${xs.length}`); }
/* 4c: a results only season with a saved finish has the goal difference of
   that finish. Every one of them is held to its fifth's table band: inside
   the table's p1 to p99 (widened by BANDS.shape.pad), and the fifth's mean
   within BANDS.shape.meanGap of the table's. */
let shapeN = 0, shapeIn = 0;
for (let b = 0; b < 5; b += 1) {
  const tb = [...(finishGd[b] ?? [])].sort((x, y) => x - y);
  const rs = resultsGd[b] ?? [];
  if (!tb.length) continue;
  const q = f => tb[Math.min(tb.length - 1, Math.floor(f * tb.length))];
  const lo = q(0.01) - BANDS.shape.pad, hi = q(0.99) + BANDS.shape.pad;
  const inside = rs.filter(x => x.gd >= lo && x.gd <= hi);
  shapeN += rs.length; shapeIn += inside.length;
  const rm = rs.length ? mean(rs.map(x => x.gd)) : NaN;
  console.log(`finish fifth ${b + 1}: goal difference a game, table p1 ${q(0.01).toFixed(2)} p50 ${q(0.5).toFixed(2)} p99 ${q(0.99).toFixed(2)} over ${tb.length}; results only mean ${rs.length ? rm.toFixed(2) : '-'} over ${rs.length}, ${inside.length} inside`);
  for (const x of rs.filter(x => !(x.gd >= lo && x.gd <= hi)).slice(0, 2)) console.log(`   outside: ${x.tag}`);
  if (rs.length >= 5 && Math.abs(rm - mean(tb)) > BANDS.shape.meanGap) fail('4c results shape', `fifth ${b + 1}: results only mean ${rm.toFixed(2)} against the table's ${mean(tb).toFixed(2)}`);
}
if (shapeN && shapeIn / shapeN < BANDS.shape.insideMin) fail('4c results shape', `${shapeIn} of ${shapeN} results only finishes inside their fifth's goal difference band`);
check(shapeN > 0, `results only seasons with a saved finish: ${shapeN}, ${shapeIn} inside their fifth's table goal difference band`);
console.log(`champions' points a game in table mode: p2 ${pct(0.02)?.toFixed(2)} p50 ${median(sorted).toFixed(2)} p98 ${pct(0.98)?.toFixed(2)} over ${sorted.length}; results title band ${S.CHAMPION_PPG.min} to ${S.CHAMPION_PPG.max}`);
for (const [item, msgs] of fails) console.log(`FAIL item ${item}: ${msgs.join(' | ')}`);
check(fails.size === 0, `independent checker: ${fails.size === 0 ? 'every derived season agrees with its row' : [...fails.keys()].join(', ')}`);
console.log(`simSeasonCentreAgreement: ${checks} checks, ${failed} failed${CONTROL ? ` (control ${CONTROL})` : ''}`);
process.exit(failed ? 1 : 0);
