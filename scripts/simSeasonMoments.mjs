/**
 * Round 1047: Season Centre moments (YOUR CALL and RECREATE), DESIGN 1045 section 9.8.
 *
 * A moment lets the player play one point of a season the save already
 * holds. This harness plays real careers through the real engine and, for
 * every season the Centre can open, proves with its OWN arithmetic (it never
 * calls the module's `otherOutcome`, `disagreements` or `finalLine`):
 *
 *   1. EVERY mix of outcomes of the offered moments (2^k, k at most 3) ends
 *      on the plan's final table row for row, his position, the champion and
 *      every saved total (apps, goals, assists, clean sheets, cards, the
 *      rating to one place). The table is replayed from scratch here.
 *   2. Prefix stability: deciding the moment at matchday k changes game k and
 *      one later game and nothing else, so nothing already watched moves.
 *      Inside game k the events that differ all sit AT the moment's minute
 *      (a missed chance on 22 never takes away his goal on 41).
 *   3. Every YOUR CALL's other outcome is a legal mirror (same opponent, a
 *      later game, neither a derby, equal and opposite score and line moves,
 *      caps held, clean sheet marks true, events adding up, his events inside
 *      his minutes) and every RECREATE replays a success the record holds.
 *   4. The offer is read only and keyed: planning twice, and from a JSON round
 *      trip of the row, gives the same moments; applying twice the same
 *      season; Math.random is trapped throughout.
 *   5. The share of YOUR CALL moments and the moments per season are printed
 *      and held to floors set from measured spread (below).
 *   6. The boards: every engine's best input is a make, a wild one a miss,
 *      stars 1, 2 and 3 are each reachable, and the entry the save keeps
 *      replays to the result the player saw.
 *   7. The ledger: the reader refuses every malformed shape, an attempt is
 *      used once, a new season folds the old count and starts clean.
 *   8. The bank at every step (0 to 3 made, every star count, and fewer
 *      moments taken than offered), never past the ceiling with the daily
 *      drill banked in the same season IN EITHER ORDER, once a season,
 *      latest season only. Leaving a season with a moment still to play
 *      (closeSeasonMoments, what the page runs when the summary is
 *      dismissed) banks exactly what the bank pays against the moments ON
 *      OFFER, on every real season, with Math.random trapped.
 *   9. The default path: a career that never takes a moment has no
 *      `seasonMoments` key at any step, and taking moments changes exactly
 *      seasonMoments, statBoostNextSeason, morale and events on the save.
 *
 * MEASURED 2026-10-07, 40 careers a run, SEEDSET 0 to 4 (695 to 711 seasons a
 * run, 4850 to 4941 outcome mixes, 4488 to 4664 mirrored calls, every run 48
 * checks and 0 failed):
 *   moments a season        2.983 2.997 2.977 2.997 2.986   floor 2.9
 *   YOUR CALL share         0.539 0.545 0.531 0.558 0.545   floor 0.48
 *   seasons with a call     0.894 0.915 0.885 0.918 0.900   floor 0.84
 *   (a share over about 700 seasons has a standard error near 0.011, so
 *   each floor sits four or more of those under the lowest run)
 *   (seed set 0 again after the review of 2026-10-07, on the merged tree:
 *   54 checks, 0 failed, the same 2.983, 0.539 and 0.894; 4556 mirrored
 *   calls, every one changing at its moment's minute and nowhere else in
 *   its game; 707 seasons closed early, 705 of them with more on offer)
 *   boards, of 120 keyed rounds a run: a careful input makes the wall shot
 *   120 119 120 120 120 and the tackle, the glove save and the through ball
 *   120 every run (floors 0.95 and 0.97); the textbook wall shot strike
 *   scores 120 119 120 120 120 (floor 0.95). Planning took 1.2 to 10.4 ms a
 *   season on a loaded machine: it is printed and no longer asserted (a
 *   wall clock on a machine running twenty other jobs is not a rule).
 *
 * Controls (MOMENTS_CONTROL=), each patches exact strings as the code is
 * bundled (the bundler refuses a missing or repeated string) and must turn
 * the named check red:
 *   mirror   the other outcome is absorbed against a different club     -> 1
 *   reroll   the rewrite draws from a stream that moves between calls   -> 4
 *   nogate   a miss with no mirror is offered as a RECREATE             -> 3
 *   ceiling  the bank ignores the ceiling                               -> 8
 *   double   a settled attempt can be taken again, and the bank twice  -> 7, 8
 *   minutegoal    taking his goal away picks any goal of his in the game -> 2
 *   minuteassist  taking his assist away picks any assist in the game    -> 2
 *   minutestop    taking a goal against away picks any of theirs         -> 2
 *   order    the daily drill ignores what the moments banked            -> 8
 *   share    the share is of the stars TAKEN, not the stars on offer    -> 8
 *   closeshort  leaving a season early banks against the moments taken  -> 8
 *
 * Control evidence, 2026-10-07 (8 careers each, every one exit 1):
 *   mirror: "the final table moved" and "absorbed against another club";
 *   reroll: "applying twice differs" (4 determinism); nogate: "a recreate
 *   of a miss" (3 recreate); ceiling: 88 of 200 cases over the ceiling and
 *   16 paid at it (8); double: the settled entry was overwritten (7) and
 *   the second bank paid (8). Every other check stayed green in each run.
 *   Added after the review of 2026-10-07 (8 careers each, every one exit 1
 *   with exactly one check red): minutegoal "an event away from minute 22
 *   changed on md 4" (his goal on 41 went instead); minuteassist the same
 *   on md 10 (the goal on 42, minute 67 asked); minutestop a goal against
 *   on 81 for minute 83; order "moments first: 52 over" of 200; share "10
 *   wrong, one of three for 3 stars pays 2"; closeshort "leaving with 1 of
 *   3 moments taken did not bank against 3" (8 bank).
 *
 * Runs about a minute at 40 careers: run it through detach.sh and
 * waitfor.sh. Green is the closing "simSeasonMoments: ... 0 failed" line
 * and exit 0.
 */
import path from 'node:path';
import { bundleAwardsNight } from './lib/careerAwardsNightBundle.mjs';
import { mulberry32, hashOf } from './lib/careerAwardsNightProbe.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const CAREERS = Number(process.env.CAREERS ?? 40);
const SEEDSET = Number(process.env.SEEDSET ?? 0);
const CONTROL = process.env.MOMENTS_CONTROL ?? '';

const CORE = 'src/lib/season/core.ts';
const EVENTS = 'src/lib/season/soccerEvents.ts';
const CONTROLS = {
  mirror: [
    { file: CORE, from: 'const back = meetings.find(x => x.md !== g.md)!;', to: 'const back = s.games.find(x => x.opp !== g.opp && x.md > g.md && !x.fixed && x.played) ?? meetings.find(x => x.md !== g.md)!;' },
    { file: CORE, from: '  if (finalLine(season) !== finalLine(s)) return null;\n  if (disagreements(sport, row, ctx, season).length > 0) return null;', to: '' },
    { file: CORE, from: 'return finalLine(s) === finalLine(plan) && disagreements(sport, row, ctx, s).length === 0 ? s : plan;', to: 'return s;' },
  ],
  reroll: [{ file: CORE, from: 'const key = momentKey(s, spot);', to: "const key = momentKey(s, spot) + '|' + (globalThis.__reroll = (globalThis.__reroll ?? 0) + 1);" }],
  nogate: [{ file: CORE, from: 'else if (spot.planSuccess && spot.onRecord) cands.push(', to: 'else cands.push(' }],
  ceiling: [{ file: 'src/lib/season/soccerMoments.ts', from: 'return Math.max(0, Math.min(raw, Math.floor(room)));', to: 'return raw;' }],
  minutegoal: [{ file: EVENTS, from: "const e = pick(ev.filter(x => x.kind === 'goal' && x.mine && at(x)));", to: "const e = pick(ev.filter(x => x.kind === 'goal' && x.mine));" }],
  minuteassist: [{ file: EVENTS, from: "const a = pick(ev.filter(x => x.kind === 'assist' && at(x)));", to: "const a = pick(ev.filter(x => x.kind === 'assist'));" }],
  minutestop: [{ file: EVENTS, from: "x.side === 'them' && at(x) && (!win ||", to: "x.side === 'them' && (!win ||" }],
  order: [{ file: 'src/lib/careerDrills.ts', from: 'const headroom = Math.max(0, drillHeadroom(s) - momentsPaid(s.seasonMoments, year));', to: 'const headroom = drillHeadroom(s);' }],
  share: [{ file: 'src/lib/season/soccerMoments.ts', from: 'const n = Math.max(save.m.length, Math.min(12, Math.floor(offered) || 0));', to: 'const n = save.m.length;' }],
  closeshort: [{ file: 'src/lib/season/soccerMoments.ts', from: 'if (plan) offered = planMoments(SOCCER, row, ctx, plan).length;', to: 'if (plan) offered = save.m.length;' }],
  double: [
    { file: 'src/lib/season/momentsSave.ts', from: 'if (prev.m[at][2] !== -1 || result < 0) return prev;', to: '' },
    { file: 'src/lib/season/soccerMoments.ts', from: 'if (!save || save.banked || save.m.length === 0) return prev;', to: 'if (!save || save.m.length === 0) return prev;' },
  ],
};
if (CONTROL && !CONTROLS[CONTROL]) throw new Error(`unknown MOMENTS_CONTROL ${CONTROL}`);
if (CONTROL) console.log(`CONTROL ${CONTROL}: ${[...new Set(CONTROLS[CONTROL].map(p => p.file))].join(', ')} patched in the bundle only`);

const t0 = Date.now();
const B = await bundleAwardsNight(ROOT, {
  patches: CONTROL ? CONTROLS[CONTROL] : [],
  extra: {
    season: 'src/lib/season/soccer.ts', core: 'src/lib/season/core.ts', moments: 'src/lib/season/soccerMoments.ts',
    ledger: 'src/lib/season/momentsSave.ts', drills: 'src/lib/careerDrills.ts', through: 'src/lib/throughBallDrill.ts',
  },
});
const { soccer, season: S, core: C, moments: M, ledger: L, drills: D, through: T } = B;
const CLUBS = soccer.FALLBACK_CLUBS;
console.log(`bundled in ${Date.now() - t0} ms; ${CAREERS} careers, seed set ${SEEDSET}`);

/* Floors, from the MEASURED block in the header. */
const FLOOR = { perSeason: 2.9, callShare: 0.48, seasonsWithCall: 0.84 };
const BOARD_FLOOR = { wallshot: 0.95, tackle: 0.97, gloves: 0.97, throughball: 0.97 };
const TEXTBOOK_FLOOR = 0.95;

let checks = 0, failed = 0;
const fails = new Map();
const fail = (item, msg) => { if (!fails.has(item)) fails.set(item, []); const l = fails.get(item); if (l.length < 4) l.push(msg); };
const check = (ok, label) => { checks += 1; if (ok) console.log(`ok   ${label}`); else { failed += 1; console.log(`FAIL ${label}`); } };

/* ─── The passive driver (the agreement harness's) ─── */
const NATS = ['England', 'Brazil', 'France', 'Spain', 'Argentina', 'Nigeria', 'Japan', 'Norway'];
const POSITIONS = ['ST', 'LW', 'CAM', 'RW', 'CM', 'CB', 'GK', 'CDM', 'LB', 'RB'];
const ERAS = [{ value: '1990-94', y: 1990 }, { value: '2000-04', y: 2000 }, { value: '2010-14', y: 2010 }, { value: '2020-24', y: 2020 }, { value: '2025', y: 2025 }];
const POT = [95, 92, 89, 86, 83, 80, 77, 93];
const abil = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });

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

/* ─── The independent arithmetic (nothing below calls the module's own checks) ─── */
const KEEPS = new Set(['GK', 'CB', 'LB', 'RB']);
const J = v => JSON.stringify(v);

/** A from scratch table: 3, 1, 0; points, goal difference, goals for, slot. */
function replayTable(rounds, teams) {
  const t = Array.from({ length: teams }, (_, slot) => ({ slot, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
  for (const pairs of rounds) for (const [h, a, hg, ag] of pairs) {
    t[h].p++; t[a].p++; t[h].gf += hg; t[h].ga += ag; t[a].gf += ag; t[a].ga += hg;
    if (hg > ag) { t[h].w++; t[a].l++; t[h].pts += 3; } else if (ag > hg) { t[a].w++; t[h].l++; t[a].pts += 3; } else { t[h].d++; t[a].d++; t[h].pts++; t[a].pts++; }
  }
  return t.sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || x.slot - y.slot);
}
const pointsOf = (us, them) => (us > them ? 3 : us === them ? 1 : 0);

/** The first round after which nobody can catch slot 0 on points alone, or null. */
function clinchHere(rounds, teams) {
  const total = new Array(teams).fill(0);
  for (const pairs of rounds) for (const [h, a] of pairs) { total[h] += 1; total[a] += 1; }
  const pts = new Array(teams).fill(0), played = new Array(teams).fill(0);
  for (let r = 0; r < rounds.length; r += 1) {
    for (const [h, a, hg, ag] of rounds[r]) { played[h] += 1; played[a] += 1; pts[h] += pointsOf(hg, ag); pts[a] += pointsOf(ag, hg); }
    let safe = true;
    for (let t = 1; t < teams; t += 1) if (pts[0] <= pts[t] + 3 * (total[t] - played[t])) { safe = false; break; }
    if (safe) return r + 1;
  }
  return null;
}

/** The end of a season as one string: the whole table, or his record where none is shown. */
function finalOf(s) {
  if (s.mode === 'table') return J(replayTable(s.rounds, s.teams));
  let w = 0, d = 0, l = 0, gf = 0, ga = 0;
  for (const g of s.games) { gf += g.us; ga += g.them; if (g.us > g.them) w++; else if (g.us < g.them) l++; else d++; }
  return J([w, d, l, gf, ga]);
}

/** His totals from the games and the bucket, summed here. Ratings in tenths. */
function totalsOf(s, keeps) {
  const on = s.games.filter(g => g.played);
  const b = s.bucket ?? { apps: 0, line: {} };
  const sum = k => on.reduce((x, g) => x + (g.line[k] ?? 0), 0) + (b.line[k] ?? 0);
  return {
    apps: on.length + b.apps, goals: sum('goals'), assists: sum('assists'), yellow: sum('yellow'), red: sum('red'),
    cs: keeps ? on.filter(g => g.them === 0).length + (b.line.cs ?? 0) : null,
    rating10: on.reduce((x, g) => x + Math.round((g.line.rating ?? 0) * 10), 0), n: on.length,
  };
}

/** Why the season's totals are not the saved row's ('' when they are). */
function rowMismatch(s, row, keeps) {
  const t = totalsOf(s, keeps);
  if (t.apps !== row.apps) return `apps ${t.apps} != ${row.apps}`;
  if (t.goals !== row.goals) return `goals ${t.goals} != ${row.goals}`;
  if (t.assists !== row.assists) return `assists ${t.assists} != ${row.assists}`;
  if (t.yellow !== row.yellowCards || t.red !== row.redCards) return 'cards';
  if (keeps && t.cs !== row.cleanSheets) return `clean sheets ${t.cs} != ${row.cleanSheets}`;
  if (t.n && Math.round(t.rating10 / t.n + 1e-9) !== Math.round(row.rating * 10)) return `rating ${(t.rating10 / t.n / 10).toFixed(3)} != ${row.rating}`;
  return '';
}

/** Why one game is not a legal soccer game for him ('' when it is). */
function gameIllegal(g, pos, keeps) {
  const int = v => Number.isInteger(v) && v >= 0 && v <= 7;
  if (!int(g.us) || !int(g.them)) return 'score out of range';
  const goals = g.events.filter(e => e.kind === 'goal');
  if (goals.filter(e => e.side === 'us').length !== g.us || goals.filter(e => e.side === 'them').length !== g.them) return 'events do not make the score';
  for (let i = 1; i < g.events.length; i += 1) if (g.events[i].min < g.events[i - 1].min) return 'events out of order';
  if (g.events.some(e => e.min < 1 || e.min > 90)) return 'a minute outside the match';
  if (!g.played) return Object.keys(g.line).length ? 'a line in a game he missed' : '';
  const hisGoals = g.line.goals ?? 0, ast = g.line.assists ?? 0;
  if (hisGoals > (pos === 'GK' ? 0 : 4) || ast > 3 || hisGoals < 0 || ast < 0) return 'his line over its cap';
  if (hisGoals + ast > g.us) return 'his line above his club score';
  if (goals.filter(e => e.mine).length !== hisGoals) return 'his goal events';
  const assists = g.events.filter(e => e.kind === 'assist');
  if (assists.length !== ast) return 'his assist events';
  for (const a of assists) if (!goals.some(e => e.side === 'us' && !e.mine && e.min === a.min)) return 'an assist with no goal';
  if (keeps && (g.line.cs ?? 0) !== (g.them === 0 ? 1 : 0)) return 'clean sheet mark';
  const r = g.line.rating ?? 0;
  if (r < 3 - 1e-9 || r > 10 + 1e-9) return 'rating out of range';
  const from = g.onAt ?? 1, to = g.offAt ?? 90;
  if (g.events.some(e => e.mine && (e.min < from || e.min > to))) return 'an event of his outside his minutes';
  return '';
}

/** What is in the list `xs` and not in `ys`, counted (two equal events are two). */
const bagMinus = (xs, ys) => { const left = ys.slice(); return xs.filter(x => { const i = left.indexOf(x); if (i < 0) return true; left.splice(i, 1); return false; }); };

/** Why the season `alt` is not the plan with exactly these call moments mirrored ('' when it is). */
function mirrorIllegal(plan, alt, flipped, pos, keeps) {
  const changed = plan.games.filter((g, i) => J(g) !== J(alt.games[i])).map(g => g.md);
  const want = flipped.flatMap(m => [m.md, m.mirrorMd]).sort((x, y) => x - y);
  if (J(changed) !== J(want)) return `changed games ${J(changed)} are not ${J(want)}`;
  for (let r = 0; r < plan.rounds.length; r += 1) {
    for (let k = 0; k < plan.rounds[r].length; k += 1) {
      const p = plan.rounds[r][k], q = alt.rounds[r][k];
      const his = p[0] === 0 || p[1] === 0;
      if (!his && J(p) !== J(q)) return 'another club result moved';
      if (his) { const g = alt.games[r]; if (J(q) !== J(g.home ? [p[0], p[1], g.us, g.them] : [p[0], p[1], g.them, g.us])) return 'the board and his game disagree'; }
    }
  }
  for (const m of flipped) {
    const a0 = plan.games[m.md - 1], a1 = alt.games[m.md - 1], b0 = plan.games[m.mirrorMd - 1], b1 = alt.games[m.mirrorMd - 1];
    if (!(m.mirrorMd > m.md)) return 'the return game is not later';
    if (a0.opp !== b0.opp) return 'absorbed against another club';
    if (a0.fixed || b0.fixed) return 'a derby was rewritten';
    if (!a0.played) return 'a moment in a game he missed';
    /* inside the moment's own game the clock has already shown every minute
       before the stop, so the only events that may differ are AT the moment's
       minute: a missed chance on 22 never takes away his goal on 41 */
    const was = a0.events.map(J), now = a1.events.map(J);
    const moved = [...bagMinus(was, now), ...bagMinus(now, was)];
    if (moved.length === 0) return 'inside the moment game: nothing changed at all';
    const away = moved.filter(e => JSON.parse(e).min !== m.minute);
    if (away.length) return `inside the moment game: an event away from minute ${m.minute} changed on md ${m.md} (${away[0]})`;
    stat.minuteHeld += 1;
    const dUs = a1.us - a0.us, dThem = a1.them - a0.them;
    if (dUs !== m.delta.us || dThem !== m.delta.them) return 'the moment game did not take its delta';
    if (b1.us - b0.us !== -dUs || b1.them - b0.them !== -dThem) return 'the return game is not the mirror';
    if (pointsOf(a1.us, a1.them) - pointsOf(a0.us, a0.them) !== -(pointsOf(b1.us, b1.them) - pointsOf(b0.us, b0.them))) return 'his points do not cancel';
    if (pointsOf(a1.them, a1.us) - pointsOf(a0.them, a0.us) !== -(pointsOf(b1.them, b1.us) - pointsOf(b0.them, b0.us))) return 'their points do not cancel';
    for (const k of ['goals', 'assists', 'cs']) {
      const d = (a1.line[k] ?? 0) - (a0.line[k] ?? 0);
      if (d !== (m.delta.line[k] ?? 0) && !(k === 'cs' && !keeps)) return `his ${k} did not take its delta`;
      if ((b1.line[k] ?? 0) - (b0.line[k] ?? 0) !== -d) return `his ${k} is not mirrored`;
    }
    const dr = Math.round((a1.line.rating ?? 0) * 10) - Math.round((a0.line.rating ?? 0) * 10);
    if (Math.round((b1.line.rating ?? 0) * 10) - Math.round((b0.line.rating ?? 0) * 10) !== -dr) return 'the rating moves do not cancel';
    for (const k of ['yellow', 'red']) if ((a1.line[k] ?? 0) !== (a0.line[k] ?? 0) || (b1.line[k] ?? 0) !== (b0.line[k] ?? 0)) return 'a card moved';
    if (a1.onAt !== a0.onAt || a1.offAt !== a0.offAt || b1.onAt !== b0.onAt || b1.offAt !== b0.offAt || b1.played !== b0.played) return 'his minutes moved';
    const bad = gameIllegal(a1, pos, keeps) || gameIllegal(b1, pos, keeps);
    if (bad) return bad;
  }
  return '';
}

/** Why a moment is not an honest offer on the plan ('' when it is). */
function offerDishonest(plan, m) {
  const g = plan.games[m.md - 1];
  if (!g || !g.played) return 'a moment in a game he did not play';
  const from = g.onAt ?? 1, to = g.offAt ?? 90;
  if (m.minute < from || m.minute > to) return 'a moment while he was off the pitch';
  const hisGoal = g.events.some(e => e.kind === 'goal' && e.mine && e.min === m.minute);
  const hisAssist = g.events.some(e => e.kind === 'assist' && e.min === m.minute);
  const against = g.events.some(e => e.kind === 'goal' && e.side === 'them' && e.min === m.minute);
  if (m.kind === 'finish' && hisGoal !== m.planSuccess) return 'finish: the record and the offer disagree';
  if (m.kind === 'pass' && hisAssist !== m.planSuccess) return 'pass: the record and the offer disagree';
  if ((m.kind === 'save' || m.kind === 'tackle') && against === m.planSuccess) return 'stop: the record and the offer disagree';
  if (m.mode === 'recreate') {
    if (!m.planSuccess) return 'a recreate of a miss';
    if ((m.kind === 'save' || m.kind === 'tackle') && g.them !== 0) return 'a recreated stop in a game that was no shutout';
    if (m.mirrorMd !== null) return 'a recreate with a mirror';
  } else if (!(m.mirrorMd > m.md)) return 'a call with no later return game';
  return '';
}

/* ─── Sections 1 to 5 and 9: every season of every career ─── */
const stat = { seasons: 0, derived: 0, withMoments: 0, moments: 0, call: 0, recreate: 0, withCall: 0, sequences: 0, flips: 0, minuteHeld: 0, closed: 0, closedShort: 0, planMs: 0, kinds: new Map(), perSeason: new Map(), modes: { table: 0, results: 0 } };
const STRIP = ['seasonMoments', 'statBoostNextSeason', 'morale', 'events'];
let sample = null;
const stripped = s => { const c = { ...s }; for (const k of STRIP) delete c[k]; return hashOf(c); };

function onSeason(s, row, c) {
  stat.seasons += 1;
  const pos = s.position, keeps = KEEPS.has(pos);
  const ctx = S.buildSoccerSeasonCtx(s, CLUBS, row);
  const plan = C.deriveSeason(S.SOCCER, row, ctx);
  if (!plan) return;
  stat.derived += 1;
  stat.modes[plan.mode] = (stat.modes[plan.mode] ?? 0) + 1;
  const tag = `career ${c} ${row.year} ${pos}`;
  const before = J(plan);
  const t = Date.now();
  const moments = C.planMoments(S.SOCCER, row, ctx, plan);
  stat.planMs += Date.now() - t;
  if (J(plan) !== before) fail('4 read only', `${tag}: planning changed the season`);
  /* 4: keyed and read only */
  if (J(C.planMoments(S.SOCCER, row, ctx, plan)) !== J(moments)) fail('4 determinism', `${tag}: planning twice differs`);
  const row2 = JSON.parse(J(row));
  const ctx2 = S.buildSoccerSeasonCtx(s, CLUBS, row2);
  const plan2 = C.deriveSeason(S.SOCCER, row2, ctx2);
  if (!plan2 || J(C.planMoments(S.SOCCER, row2, ctx2, plan2)) !== J(moments)) fail('4 determinism', `${tag}: a JSON round trip of the row plans other moments`);
  /* the offer's own shape */
  stat.perSeason.set(moments.length, (stat.perSeason.get(moments.length) ?? 0) + 1);
  if (moments.length > S.MOMENTS_PER_SEASON) fail('3 offer', `${tag}: ${moments.length} moments`);
  const touched = moments.flatMap(m => (m.mirrorMd === null ? [m.md] : [m.md, m.mirrorMd]));
  if (new Set(touched).size !== touched.length) fail('3 offer', `${tag}: two moments share a game`);
  moments.forEach((m, i) => {
    if (m.id !== i || (i > 0 && moments[i - 1].md > m.md)) fail('3 offer', `${tag}: moment order`);
    const why = offerDishonest(plan, m);
    if (why) fail(m.mode === 'recreate' ? '3 recreate' : '3 call', `${tag} md ${m.md}: ${why}`);
    stat[m.mode] += 1;
    const k = `${m.kind} ${m.planSuccess ? 'made' : 'missed'} ${m.mode}`;
    stat.kinds.set(k, (stat.kinds.get(k) ?? 0) + 1);
  });
  if (moments.length === 0) return;
  if (!sample) sample = { s, row };
  stat.withMoments += 1; stat.moments += moments.length;
  if (moments.some(m => m.mode === 'call')) stat.withCall += 1;
  const planEnd = finalOf(plan);
  const planTable = plan.mode === 'table' ? replayTable(plan.rounds, plan.teams) : null;
  const planTotals = J(totalsOf(plan, keeps));
  if (rowMismatch(plan, row, keeps)) fail('1 totals', `${tag}: the plan itself: ${rowMismatch(plan, row, keeps)}`);
  /* a moment taken with the plan's own outcome changes nothing */
  const same = moments.map(m => [m.md, m.id, m.planSuccess ? 3 : 0, 0, 0, 0]);
  if (J(C.applyDecisions(S.SOCCER, row, ctx, plan, moments, same)) !== before) fail('2 prefix', `${tag}: the plan's own outcomes changed the season`);
  /* 1 to 3: every mix of the OTHER outcomes */
  for (let mask = 1; mask < (1 << moments.length); mask += 1) {
    stat.sequences += 1;
    const on = moments.filter((_, i) => mask & (1 << i));
    const entries = on.map(m => [m.md, m.id, m.planSuccess ? 0 : 2, 0.1, 0.2, 0.3]);
    const alt = C.applyDecisions(S.SOCCER, row, ctx, plan, moments, entries);
    if (J(C.applyDecisions(S.SOCCER, row, ctx, plan, moments, entries)) !== J(alt)) fail('4 determinism', `${tag} mask ${mask}: applying twice differs`);
    const flipped = on.filter(m => m.mode === 'call');
    stat.flips += flipped.length;
    if (finalOf(alt) !== planEnd) fail('1 final table', `${tag} mask ${mask}: the final table moved`);
    if (planTable) {
      const tb = replayTable(alt.rounds, alt.teams);
      if (tb.findIndex(r => r.slot === 0) !== planTable.findIndex(r => r.slot === 0)) fail('1 final table', `${tag} mask ${mask}: his position moved`);
      if (tb[0].slot !== planTable[0].slot) fail('1 final table', `${tag} mask ${mask}: another champion`);
      /* the title poster: recomputed here, and never moved once it was seen */
      const pc = plan.clinch?.md ?? null, ac = alt.clinch?.md ?? null;
      const first = flipped.length ? Math.min(...flipped.map(m => m.md)) : Infinity;
      if (pc !== ac && ((pc !== null && pc < first) || (ac !== null && ac < first))) fail('2 prefix', `${tag} mask ${mask}: a clinch already seen moved (${pc} to ${ac})`);
      if (plan.target.kind === 'finish' && plan.target.title && ac !== clinchHere(alt.rounds, alt.teams)) fail('1 final table', `${tag} mask ${mask}: the clinch round is not the table's`);
    }
    const tm = rowMismatch(alt, row, keeps);
    if (tm) fail('1 totals', `${tag} mask ${mask}: ${tm}`);
    if (J(totalsOf(alt, keeps)) !== planTotals) fail('1 totals', `${tag} mask ${mask}: a total (or the rating sum) is not the plan's`);
    const why = mirrorIllegal(plan, alt, flipped, pos, keeps);
    if (why) fail(why.startsWith('changed games') ? '2 prefix' : why.startsWith('inside the moment game') ? '2 moment minute' : '3 call', `${tag} mask ${mask}: ${why}`);
  }
  /* 9: taking every moment and banking changes four keys of the save and nothing else */
  const key = S.soccerSeasonKey(s.playerName, row);
  let led = null;
  for (const m of moments) { led = L.ledgerPut(led, key, m.md, m.id, -1, []); led = L.ledgerPut(led, key, m.md, m.id, 2, [0.5, 0.5, 0.5]); }
  const took = M.applySeasonMomentsBank({ ...s, seasonMoments: led }, moments.length);
  if (stripped(took) !== stripped(s)) fail('9 default path', `${tag}: taking moments changed more than ${STRIP.join(', ')}`);
  if (!took.seasonMoments?.banked) fail('8 bank', `${tag}: a played season did not bank on its latest row`);
  if (M.applySeasonMomentsBank(s, moments.length) !== s) fail('9 default path', `${tag}: the bank touched a career with no ledger`);
  /* 8: leaving the season with a moment still to play (the summary dismissed,
     the next season started) banks what was earned against the stars ON
     OFFER, which the page does not know: closeSeasonMoments plans the season
     itself, with Math.random trapped */
  if (M.closeSeasonMoments(s, CLUBS) !== s) fail('9 default path', `${tag}: leaving the season touched a career with no ledger`);
  let part = L.ledgerPut(null, key, moments[0].md, moments[0].id, -1, []);
  part = L.ledgerPut(part, key, moments[0].md, moments[0].id, 3, [0.5]);
  const closed = M.closeSeasonMoments({ ...s, seasonMoments: part }, CLUBS);
  if (J(closed) !== J(M.applySeasonMomentsBank({ ...s, seasonMoments: part }, moments.length))) fail('8 bank', `${tag}: leaving with 1 of ${moments.length} moments taken did not bank against ${moments.length}`);
  if (!closed.seasonMoments?.banked || M.closeSeasonMoments(closed, CLUBS) !== closed) fail('8 bank', `${tag}: leaving the season did not bank once`);
  stat.closed += 1;
  if (moments.length > 1) stat.closedShort += 1;
}

for (let c = 0; c < CAREERS; c += 1) {
  const real = Math.random;
  Math.random = mulberry32(c * 7919 + 11 + SEEDSET * 100003);
  try {
    const era = ERAS[c % ERAS.length];
    const o = 58 + ((c * 7) % 22);
    let s = soccer.initCareer(`Moment ${SEEDSET}.${c}`, NATS[c % NATS.length], POSITIONS[(c * 3) % POSITIONS.length], era.value, abil(o), o, era.y, CLUBS, null, POT[c % POT.length]);
    let rows = s.seasons.length;
    for (let guard = 0; !s.retired && guard < 700; guard += 1) {
      const ph = s.phase;
      if (['retirement_ceremony', 'retired', 'post_retirement', 'manager_season', 'pundit_season', 'owner_season'].includes(ph)) break;
      if ('seasonMoments' in s) fail('9 default path', `career ${c}: a career that took no moment has the key`);
      if (s.seasons.length > rows) {
        rows = s.seasons.length;
        const row = s.seasons[rows - 1];
        if (row.type === 'playing' && row.apps > 0) {
          const keep = Math.random;
          Math.random = () => { throw new Error('Math.random called while planning or applying moments'); };
          try { onSeason(s, row, c); } finally { Math.random = keep; }
        }
      }
      s = step(s, ph);
    }
  } finally { Math.random = real; }
}

for (const [item, list] of [...fails].sort()) for (const msg of list) console.log(`FAIL [${item}] ${msg}`);
const share = (a, b) => (b ? a / b : 0);
const callShare = share(stat.call, stat.moments), perSeason = share(stat.moments, stat.derived), seasonsWithCall = share(stat.withCall, stat.derived);
console.log(`seasons ${stat.seasons}, derived ${stat.derived} (table ${stat.modes.table}, results ${stat.modes.results}), with moments ${stat.withMoments}; ${stat.sequences} outcome mixes, ${stat.flips} mirrored calls; planning ${(stat.planMs / Math.max(1, stat.derived)).toFixed(1)} ms a season`);
console.log(`MEASURED moments a season ${perSeason.toFixed(3)} (${[...stat.perSeason].sort((a, b) => a[0] - b[0]).map(([n, v]) => `${n}: ${v}`).join(', ')}); YOUR CALL share ${callShare.toFixed(3)}; seasons with a YOUR CALL ${seasonsWithCall.toFixed(3)}`);
console.log(`kinds: ${[...stat.kinds].sort().map(([k, v]) => `${k} ${v}`).join('; ')}`);
for (const item of ['1 final table', '1 totals', '2 prefix', '2 moment minute', '3 offer', '3 call', '3 recreate', '4 read only', '4 determinism', '8 bank', '9 default path']) {
  check(!fails.has(item), `${item}: ${fails.has(item) ? `${fails.get(item).length}+ seasons failed` : `held over ${stat.derived} seasons`}`);
}
check(stat.derived >= CAREERS * 8, `population: ${stat.derived} derived seasons from ${CAREERS} careers (at least ${CAREERS * 8})`);
check(stat.flips >= stat.derived, `the mirror was exercised: ${stat.flips} mirrored calls over ${stat.derived} seasons`);
check(stat.closedShort > stat.withMoments / 2, `8 leaving a season early was exercised: ${stat.closed} seasons closed with one moment taken, ${stat.closedShort} of them with more on offer (of ${stat.withMoments})`);
check(fails.size > 0 || stat.minuteHeld === stat.flips, `2 every mirrored call was read event by event: ${stat.minuteHeld} of ${stat.flips} changed at the moment's minute and nowhere else in its game`);

/* ─── Section 6: the boards (one round of the training ground's own engines) ─── */
const BOARDS = ['wallshot', 'tackle', 'gloves', 'throughball'];
/** Inputs a careful player could make on one setup, from tidy to greedy. */
function skilled(board, setup) {
  const out = [];
  if (board === 'wallshot') {
    for (const power of [0.5, 0.65, 0.8]) for (const y of [0.2, 0.5, 0.85]) for (const dx of [-0.08, 0, 0.08]) {
      let peak = D.wallNextPeak(setup, 0);
      if (peak - D.wallTravel(power) < 0) peak += setup.period;
      out.push([setup.gapCentre + dx * setup.gapMax, y, power, peak - D.wallTravel(power)]);
    }
  } else if (board === 'tackle') {
    for (const lag of [0, 0.1, 0.2, 0.3, 0.35]) for (const off of [0, 0.3, 0.6, 0.85]) {
      const t = D.tackleNextLoose(setup, 0.05) + lag * setup.touchPeriod;
      if (t >= D.tackleDeadline(setup)) continue;
      const b = D.tackleBallAt(setup, t);
      out.push([b.x + setup.dir * off * setup.reach, b.y, t]);
    }
  } else if (board === 'gloves') {
    for (const off of [0, 0.25, 0.5, 0.8]) {
      const radius = Math.round((0.55 - setup.pace * 0.2) * 100) / 100;
      const dx = setup.target.x - D.GLOVE_ORIGIN.x + off * radius, dy = setup.target.y - D.GLOVE_ORIGIN.y;
      const reach = Math.min(1, Math.hypot(dx, dy) / D.GLOVE_MAX_REACH);
      out.push([dx, dy, Math.max(0, D.gloveDeadline(setup) - D.diveTime(reach) - 0.02)]);
    }
  } else {
    const p = T.perfectThroughBall(setup);
    for (const dw of [0, 0.01, 0.02, 0.03, -0.01, -0.02]) for (const dt of [0, -0.1, -0.2]) out.push([p.angle, p.weight + dw, Math.max(0, p.press + dt)]);
  }
  return out;
}
const WILD = { wallshot: [5, 5, 1, 0], tackle: [-1, -1, 0], gloves: [0, 0, 99], throughball: [0, 0, 0] };
for (const board of BOARDS) {
  const stars = [0, 0, 0, 0];
  let setups = 0, makeable = 0, wildMakes = 0, replays = 0, replayBad = 0, textbook = 0;
  for (let i = 0; i < 120; i += 1) {
    const key = `Board ${SEEDSET}|${i}`, md = 1 + (i % 34), id = i % 3, stakes = (i % 11) / 10;
    const setup = M.momentSetup(board, M.momentSeed(key, md, id), M.momentRound(stakes));
    const shot = () => M.momentShotRng(key, md, id, board === 'wallshot' ? setup : undefined);
    setups += 1;
    if (board === 'wallshot' && M.settleMoment(board, setup, M.textbookStrike(setup), shot()).won) textbook += 1;
    let any = false;
    for (const input of skilled(board, setup)) {
      const r = M.settleMoment(board, setup, input, shot());
      if (r.won) any = true;
      stars[r.stars] += 1;
      /* the entry the save keeps replays to the same result */
      const entry = L.ledgerPut(null, key, md, id, r.stars, M.packMomentInput(input)).m[0];
      const again = M.settleMoment(board, setup, entry.slice(3), shot());
      replays += 1;
      if (again.won !== r.won || again.stars !== r.stars || again.verdict !== r.verdict) replayBad += 1;
      if ((r.stars > 0) !== r.won || r.stars < 0 || r.stars > 3) replayBad += 1;
    }
    if (any) makeable += 1;
    const w = M.settleMoment(board, setup, WILD[board], shot());
    if (w.won || w.stars !== 0) wildMakes += 1;
  }
  console.log(`MEASURED ${board}: a careful input makes ${makeable} of ${setups} rounds; stars 0/1/2/3 over the grid ${stars.join('/')}`);
  check(makeable / setups >= BOARD_FLOOR[board], `6 ${board}: a careful input makes the round (${makeable} of ${setups}, floor ${BOARD_FLOOR[board]})`);
  check(stars[1] > 0 && stars[2] > 0 && stars[3] > 0, `6 ${board}: one, two and three stars are each reachable (${stars.slice(1).join(', ')})`);
  if (board === 'wallshot') check(textbook / setups >= TEXTBOOK_FLOOR, `6 wallshot: one shot is fair, the textbook strike scores (${textbook} of ${setups}, floor ${TEXTBOOK_FLOOR})`);
  check(wildMakes === 0, `6 ${board}: a wild input is a miss with no stars (${wildMakes} makes)`);
  check(replayBad === 0, `6 ${board}: the saved entry replays to the result the player saw (${replays} replays, ${replayBad} differ)`);
}
{
  let mono = true;
  for (let i = 1; i <= 10; i += 1) if (M.momentRound(i / 10) < M.momentRound((i - 1) / 10)) mono = false;
  check(mono && M.momentRound(0) === 2 && M.momentRound(1) === 7 && M.momentRound(NaN) === 2, `6 the round follows the stakes at every step: ${Array.from({ length: 11 }, (_, i) => M.momentRound(i / 10)).join(' ')}`);
  const kinds = POSITIONS.map(p => `${p}:${S.momentKindFor(p)}:${M.MOMENT_BOARD[S.momentKindFor(p)]}:${D.drillForPosition(p)}`);
  check(POSITIONS.every(p => M.MOMENT_BOARD[S.momentKindFor(p)] === D.drillForPosition(p)), `6 his own chances are on his training drill: ${kinds.join(' ')}`);
}

/* ─── Section 7: the ledger ─── */
{
  const good = { v: 1, key: 'k', m: [[3, 0, 2, 0.5], [9, 1, -1]] };
  const bad = [
    null, undefined, 7, 'x', [], { v: 2, key: 'k', m: [] }, { v: 1, key: '', m: [] }, { v: 1, key: 'x'.repeat(201), m: [] }, { v: 1, key: 3, m: [] },
    { v: 1, key: 'k' }, { v: 1, key: 'k', m: {} }, { v: 1, key: 'k', m: Array.from({ length: 13 }, (_, i) => [i + 1, 0, 1]) },
    { v: 1, key: 'k', m: [[3, 0]] }, { v: 1, key: 'k', m: [[3, 0, 1, 1, 1, 1, 1, 1, 1]] }, { v: 1, key: 'k', m: [[3, 0, NaN]] }, { v: 1, key: 'k', m: [[3, 0, '1']] },
    { v: 1, key: 'k', m: [[0, 0, 1]] }, { v: 1, key: 'k', m: [[401, 0, 1]] }, { v: 1, key: 'k', m: [[3, 12, 1]] }, { v: 1, key: 'k', m: [[3, -1, 1]] },
    { v: 1, key: 'k', m: [[3, 0, 4]] }, { v: 1, key: 'k', m: [[3, 0, -2]] }, { v: 1, key: 'k', m: [[3, 0, 1.5]] }, { v: 1, key: 'k', m: [[3.5, 0, 1]] },
    { v: 1, key: 'k', m: [], banked: 2 }, { v: 1, key: 'k', m: [], banked: true }, { v: 1, key: 'k', m: [], tally: null },
    { v: 1, key: 'k', m: [], paid: [2020, 1] }, { v: 1, key: 'k', m: [], banked: 1, paid: [2020, 3] }, { v: 1, key: 'k', m: [], banked: 1, paid: [2020, 0] },
    { v: 1, key: 'k', m: [], banked: 1, paid: [2020] }, { v: 1, key: 'k', m: [], banked: 1, paid: 2 }, { v: 1, key: 'k', m: [], banked: 1, paid: [2020.5, 1] }, { v: 1, key: 'k', m: [], banked: 1, paid: [-1, 1] },
    { v: 1, key: 'k', m: [], tally: { seasons: -1, moments: 0, stars: 0 } }, { v: 1, key: 'k', m: [], tally: { seasons: 1, moments: 1.5, stars: 0 } }, { v: 1, key: 'k', m: [], tally: { seasons: 1 } },
  ];
  const refused = bad.filter(x => L.readSeasonMoments(x) === null).length;
  check(refused === bad.length, `7 the reader refuses every malformed ledger (${refused} of ${bad.length})`);
  check(J(L.readSeasonMoments(good)) === J(good) && L.readSeasonMoments({ ...good, m: [...good.m, [3, 0, 3]] }).m.length === 2, '7 a good ledger reads back as written and a duplicate keeps the first');
  const paidGood = { ...good, banked: 1, paid: [2031, 2] };
  check(J(L.readSeasonMoments(paidGood)) === J(paidGood) && L.momentsPaid(paidGood, 2031) === 2 && L.momentsPaid(paidGood, 2032) === 0 && L.momentsPaid(good, 2031) === 0 && L.momentsPaid({ ...paidGood, paid: [2031, 9] }, 2031) === 0 && L.momentsPaid(null, 2031) === 0,
    '7 what a bank paid reads back for its own season, and a refused or unbanked ledger paid nothing');
  let led = L.ledgerPut(null, 'A', 4, 0, -1, []);
  const used = J(led);
  led = L.ledgerPut(led, 'A', 4, 0, 2, [0.123456, 1]);
  const settled = J(led);
  const again = L.ledgerPut(L.ledgerPut(led, 'A', 4, 0, 3, [9]), 'A', 4, 0, -1, []);
  check(used === J({ v: 1, key: 'A', m: [[4, 0, -1]] }) && settled === J({ v: 1, key: 'A', m: [[4, 0, 2, 0.1235, 1]] }) && J(again) === settled, `7 an attempt is used, then settled, and never taken again (${J(again.m)})`);
  let full = led;
  for (let i = 1; i < 14; i += 1) full = L.ledgerPut(full, 'A', 4 + i, i % 12, 1, []);
  check(full.m.length <= L.LEDGER_MAX && L.readSeasonMoments(full) !== null, `7 a ledger never outgrows its reader (${full.m.length} entries)`);
  const next = L.ledgerPut(L.ledgerPut(led, 'A', 9, 1, 3, []), 'B', 2, 0, 1, []);
  check(next.key === 'B' && next.m.length === 1 && J(next.tally) === J({ seasons: 1, moments: 2, stars: 5 }) && next.banked === undefined, `7 a new season folds the old count and starts clean (${J(next.tally)})`);
  check(J(L.ledgerOf(next, 'A')) === '[]' && L.ledgerOf(next, 'B').length === 1 && J(L.momentsTally(next)) === J({ seasons: 2, moments: 3, stars: 6 }), '7 a ledger is only read for its own season, and the career count carries');
}

/* ─── Section 8: the bank, at every step ─── */
if (!sample) check(false, '8 no season with moments to bank on');
else {
  const { s: base, row } = sample;
  const key = S.soccerSeasonKey(base.playerName, row);
  const statKey = D.drillStatFor(D.drillForPosition(base.position), base.position).stat;
  const want = (stars, offered) => { const sh = stars / (3 * offered); return sh >= 0.85 ? 2 : sh >= 0.6 ? 1 : 0; };
  const career = (overall, potential, extra = {}) => ({ ...base, overall, potential, potentialEarned: 0, statBoostNextSeason: {}, morale: 50, events: [], trainingSeasonYear: row.year - 1, ...extra });
  const ledgerOfStars = list => { let l = null; list.forEach((st, i) => { l = L.ledgerPut(l, key, 2 + i * 5, i, -1, []); if (st >= 0) l = L.ledgerPut(l, key, 2 + i * 5, i, st, [0.5]); }); return l; };
  const pending = c => Object.values(c.statBoostNextSeason).reduce((x, v) => x + (v > 0 ? v : 0), 0);
  let combos = 0, wrong = 0, morale = 0, lines = 0;
  const seenBoost = new Set();
  const each = [0, 1, 2, 3];
  const listsOf = n => (n === 1 ? each.map(a => [a]) : n === 2 ? each.flatMap(a => each.map(b => [a, b])) : each.flatMap(a => each.flatMap(b => each.map(c => [a, b, c]))));
  for (let offered = 1; offered <= 3; offered += 1) {
    for (const list of listsOf(offered)) {
      combos += 1;
      const stars = list.reduce((x, v) => x + v, 0);
      const before = career(60, 90, { seasonMoments: ledgerOfStars(list) });
      const after = M.applySeasonMomentsBank(before, offered);
      const got = (after.statBoostNextSeason[statKey] ?? 0);
      seenBoost.add(got);
      if (got !== want(stars, offered) || pending(after) !== got) wrong += 1;
      if ((after.morale - before.morale) !== (list.some(v => v >= 1) ? 2 : 0)) morale += 1;
      if (after.events.length !== 1 || after.seasonMoments.banked !== 1) lines += 1;
    }
  }
  check(wrong === 0 && [0, 1, 2].every(b => seenBoost.has(b)), `8 every star count pays what its share earns: ${combos} mixes of 1 to 3 moments, ${wrong} wrong, boosts seen ${[...seenBoost].sort().join(' ')}`);
  check(morale === 0 && lines === 0, `8 morale moves only when a moment was made, one event line, banked once (${morale} morale, ${lines} line errors)`);
  /* the share is of the stars ON OFFER: a moment left to play still counts
     below the line (take one of three for 3 stars and that is 3 of 9) */
  let fewer = 0, fewerWrong = 0, fewerPaid = 0, fewerLine = 0;
  for (let offered = 2; offered <= 3; offered += 1) for (let taken = 1; taken < offered; taken += 1) for (const list of listsOf(taken)) {
    fewer += 1;
    const stars = list.reduce((x, v) => x + v, 0);
    const after = M.applySeasonMomentsBank(career(60, 90, { seasonMoments: ledgerOfStars(list) }), offered);
    const got = after.statBoostNextSeason[statKey] ?? 0;
    if (got !== want(stars, offered)) fewerWrong += 1;
    if (got > 0) fewerPaid += 1;
    if (!String(after.events[0]).includes(`${stars} of ${offered * 3} stars`)) fewerLine += 1;
  }
  const oneOfThree = M.applySeasonMomentsBank(career(60, 90, { seasonMoments: ledgerOfStars([3]) }), 3);
  check(fewerWrong === 0 && fewerLine === 0 && fewerPaid > 0 && pending(oneOfThree) === 0,
    `8 a moment left to play still counts below the line: ${fewer} ledgers with fewer taken than offered, ${fewerWrong} wrong, ${fewerLine} wrong lines, ${fewerPaid} paid; one of three for 3 stars pays ${pending(oneOfThree)}`);
  /* at the ceiling, and with a drill banked in the same season, never past
     it, in BOTH orders: the drill first, and the moments first (the usual
     way round: the season is watched at the summary, the drill comes after) */
  const drillRaw = n => (n >= 8 ? 2 : n >= 5 ? 1 : 0);
  for (const order of ['drill first', 'moments first']) {
    let over = 0, paidAtCeiling = 0, cases = 0, second = 0;
    for (let headroom = 0; headroom <= 4; headroom += 1) for (const drill of [-1, 5, 8, 10]) for (let stars = 0; stars <= 9; stars += 1) {
      cases += 1;
      const list = [Math.min(3, stars), Math.min(3, Math.max(0, stars - 3)), Math.max(0, stars - 6)];
      let c = career(70, 70 + headroom, { seasonMoments: ledgerOfStars(list) });
      const runDrill = x => (drill >= 0 ? D.applyDrillResult(x, D.drillForPosition(x.position), drill) : x);
      const runBank = x => M.applySeasonMomentsBank(x, 3);
      c = order === 'drill first' ? runDrill(c) : runBank(c);
      const firstPaid = pending(c);
      const after = order === 'drill first' ? runBank(c) : runDrill(c);
      const wantSecond = order === 'drill first' ? want(stars, 3) : (drill >= 0 ? drillRaw(drill) : 0);
      if (pending(after) > headroom) over += 1;
      if (headroom === 0 && pending(after) !== 0) paidAtCeiling += 1;
      if (pending(after) - firstPaid !== Math.min(wantSecond, Math.max(0, headroom - firstPaid))) over += 1;
      if (pending(after) > firstPaid && firstPaid > 0) second += 1;
    }
    check(over === 0 && paidAtCeiling === 0 && second > 0, `8 a drill plus the moments never pass the ceiling, ${order}: ${cases} cases over headroom 0 to 4, ${over} over, ${paidAtCeiling} paid at the ceiling, ${second} where both paid`);
  }
  /* next season's drill owes last season's moments nothing: that growth has landed */
  {
    const banked = M.applySeasonMomentsBank(career(70, 72, { seasonMoments: ledgerOfStars([3, 3, 3]) }), 3);
    const nextYear = { ...banked, statBoostNextSeason: {}, seasons: [...banked.seasons, { ...row, year: row.year + 1 }] };
    const drilled = D.applyDrillResult(nextYear, D.drillForPosition(nextYear.position), 10);
    check(J(banked.seasonMoments.paid) === J([row.year, 2]) && L.momentsPaid(banked.seasonMoments, row.year) === 2 && L.momentsPaid(banked.seasonMoments, row.year + 1) === 0 && pending(drilled) === 2,
      `8 the ledger keeps what it paid for its own season only: paid ${J(banked.seasonMoments.paid)}, next season's drill pays ${pending(drilled)} of 2`);
  }
  const once = M.applySeasonMomentsBank(career(60, 90, { seasonMoments: ledgerOfStars([3, 3, 3]) }), 3);
  check(M.applySeasonMomentsBank(once, 3) === once && once.statBoostNextSeason[statKey] === 2, '8 the bank pays once a season: a second call returns the same career');
  const stale = career(60, 90, { seasonMoments: L.ledgerPut(null, `${key}|older`, 3, 0, 3, []) });
  check(M.applySeasonMomentsBank(stale, 3) === stale, '8 only the latest season banks: a ledger for another season is left alone');
  const left = M.applySeasonMomentsBank(career(60, 90, { seasonMoments: ledgerOfStars([-1]) }), 1);
  check(left.seasonMoments.banked === 1 && pending(left) === 0 && left.morale === 50, '8 an attempt opened and left is a miss: it banks nothing');
  /* 7b: the repair line */
  const kept = soccer.repairCareer({ ...base, seasonMoments: ledgerOfStars([2, 0]) });
  const dropped = soccer.repairCareer({ ...base, seasonMoments: { v: 1, key, m: [[1, 0, 9]] } });
  const none = soccer.repairCareer({ ...base });
  check(J(kept.seasonMoments) === J(ledgerOfStars([2, 0])) && !('seasonMoments' in dropped) && !('seasonMoments' in none) && hashOf({ ...dropped }) === hashOf(none), '7 the repair keeps a good ledger, drops a refused one whole and adds nothing to a save without one');
}

/* ─── Floors (set from the measured spread in the header) ─── */
check(perSeason >= FLOOR.perSeason, `5 moments a season ${perSeason.toFixed(3)} (floor ${FLOOR.perSeason})`);
check(callShare >= FLOOR.callShare, `5 YOUR CALL share ${callShare.toFixed(3)} (floor ${FLOOR.callShare})`);
check(seasonsWithCall >= FLOOR.seasonsWithCall, `5 seasons with a YOUR CALL ${seasonsWithCall.toFixed(3)} (floor ${FLOOR.seasonsWithCall})`);
/* printed, never asserted: a wall clock on a machine running twenty other jobs is not a rule */
console.log(`MEASURED planning ${(stat.planMs / Math.max(1, stat.derived)).toFixed(1)} ms a season (information only)`);

console.log(`simSeasonMoments: ${checks} checks, ${failed} failed${CONTROL ? ` (control ${CONTROL})` : ''}`);
process.exit(failed ? 1 : 0);
