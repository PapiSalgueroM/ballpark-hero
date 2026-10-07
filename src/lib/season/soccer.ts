/* Round 1045: Soccer Career's season, match by match (the first sport on
   src/lib/season/core.ts).

   Everything here reads the saved row and the career's own rules; nothing is
   stored and nothing draws from Math.random. The rules this binding adds:

   - THE TABLE GATE. A full table only when every claim it makes is
     verified: the row has a finish and a verified size (Round 929), the
     club's league that season is known (Round 1037's finishLeague), the
     league was one double round robin table that season, three points a win
     (src/data/leagueFormat.ts, from 1995-96), every pair met twice
     (DERBY_CADENCE, Round 1012), every derby rival on the row was in that
     league that season (namedInLeague), and the season was not cut short by
     a severe injury (that row has no finish). Otherwise results mode: his
     league games only, no table and no position line.
   - THE FRAME. Table mode plays 2(N-1) matchdays. Results mode plays the
     league's verified size when known and the engine's own 38 game frame
     otherwise (projectLeagueApps counts "out of 38").
   - HIS GAMES. The league target is min(leagueApps, games left after the
     injury block, apps), the block is injuryWeeks out of the engine's 46
     week season, and everything else he played (cups, Europe) is the bucket,
     "Cups and other games". On a Golden Boot season none of his goals go to
     the bucket (the award counts all competitions; the review says so).
   - THE CHAMPION is the summary card's, by exactly its rule: the phone's
     world crowned a club for that league that season, not his, and the
     league ledgers put it in that league that season.
   - NAMES. His club, the derby rivals on the row, the champion, and the
     clubs managerLeagueField names for that league and season (the league
     ledgers before 2026-27, the career's own list from then on). Everyone
     else is "another club". Named clubs take places by the game's era tier
     plus keyed noise, never by a ledger's order. */
import type { CareerState, ClubData, SeasonRecord } from '../soccerCareerEngine';
import type { WorldSeason } from '../soccerPhone';
import { LAW, goalLambda, poissonDraw } from './law';
import {
  ownRowRounds, roundRobinRounds,
  type DerivedGame, type FixedGame, type Frame, type SeasonSport, type SlotFacts, type SlotLabel, type StatTotal, type TeamTarget,
} from './core';
import { finishLeague, leagueKeyInYear, leagueSizeFor, managerLeagueField, namedInLeague, readLeagueFinish } from '../soccerCareerLeague';
import { careerDerbyRecord, derbyMeetings, readSeasonDerbies, type DerbyRecord } from '../soccerCareerDerby';
import { adjustClubsForYear } from '../careerEras';
import { keyedRng } from '../keyedRng';
import { leagueFormatFor } from '../../data/leagueFormat';

/** Why a season shows results only (null: it shows a table). */
export type ResultsReason = 'nofinish' | 'nosize' | 'league' | 'format' | 'cadence' | 'severe' | 'rival';

export interface SoccerSeasonCtx {
  playerName: string;
  /** His club that season (the row's). */
  club: string;
  /** The game's tier of his club that season (1 best). */
  clubTier: number;
  position: string;
  mode: 'table' | 'results';
  why: ResultsReason | null;
  /** The league the finish is printed in (the summary card's finishLeague), or null. */
  league: { key: string; name: string } | null;
  finish: { finish: number; size: number | null } | null;
  /** League games in the season. */
  games: number;
  /** The summary card's "X won it", or null. */
  champion: string | null;
  rivals: string[];
  /** Clubs that may be named in the table besides his, the rivals and the champion. */
  named: string[];
  /** The game's era tier of every club it knows, that season. */
  tiers: Record<string, number>;
  goldenBoot: boolean;
  keepsSheets: boolean;
  derbyBefore: DerbyRecord;
  /** "Last season: 3rd with Lyon". */
  lastSeason: { finish: number; club: string } | null;
}

const KEEPS_SHEETS = new Set(['GK', 'CB', 'LB', 'RB']);
/** Points per game a results only title season must sit in (critic C4).
 *  Measured from table mode's champions by scripts/simSeasonCentreAgreement.mjs
 *  over five seed sets of 120 careers: p2 1.97 in every set, p98 2.53 to
 *  2.55. The band keeps 0.07 below and 0.10 above. */
export const CHAMPION_PPG = { min: 1.9, max: 2.65 };
/** The same for a results only season that saved a finish (a 1992-93 Serie A
 *  4th, the abandoned Ligue 1 2019-20): his points a game must sit where clubs
 *  finishing in that fifth of a table land, so the games shown never read like
 *  another season than the finish beside them. Measured in table mode by
 *  scripts/simSeasonCentreAgreement.mjs (non champions, five seed sets of
 *  120 careers, SEEDSET 0 to 4, 2026-10-07), p1 to p99 by fifth, the
 *  extremes over the five sets: 1.71 to 2.39, 1.45 to 2.03, 1.13 to 1.76,
 *  0.84 to 1.47, 0.39 to 1.11; each band keeps 0.07 to 0.11 outside them.
 *  (The first cut was one seed set and left the bottom fifth's p1 outside.)
 *  The ladder places his club by the same finish (strengths below), and
 *  the harness's item 4c holds the goal difference to that finish too. */
export const FINISH_PPG = [
  { min: 1.6, max: 2.5 },
  { min: 1.35, max: 2.1 },
  { min: 1.05, max: 1.85 },
  { min: 0.75, max: 1.55 },
  { min: 0.3, max: 1.2 },
];
/** Which fifth of the table a finish sits in, 0 (top) to 4. */
export function finishFifth(finish: number, size: number): number {
  return Math.min(4, Math.floor(((finish - 1) / Math.max(1, size - 1)) * 5));
}

function worldFor(career: CareerState, year: number): WorldSeason | null {
  const w = career.phone?.world;
  return w && w.year === year ? w : null;
}

/** The season's facts, read once from the save. `row` is any playing row of
 *  `career.seasons` or the pending summary. */
export function buildSoccerSeasonCtx(career: CareerState, clubs: ClubData[], row: SeasonRecord): SoccerSeasonCtx {
  const finish = readLeagueFinish(row);
  const today = clubs.find(c => c.name === row.club)?.league ?? '';
  const league = finishLeague({ name: row.club, league: today }, row.year, finish?.size ?? null);
  /* the summary card's champion, word for word (SeasonSummaryCard, Round 1037) */
  const world = worldFor(career, row.year);
  const key = league?.key;
  const crowned = finish && finish.finish !== 1 && key && world
    ? (world.leagues?.[key] && world.leagues[key] !== row.club ? world.leagues[key] : null)
    : null;
  const champion = crowned && key && namedInLeague(crowned, key, row.year) ? crowned : null;
  const derbies = readSeasonDerbies(row);
  const rivals = derbies.map(d => d.rival);
  let why: ResultsReason | null = null;
  /* the injury first: the engine strips the finish from every severe injury
     row, so read after !finish this reason could never be given */
  if (row.injurySevere) why = 'severe';
  else if (!finish) why = 'nofinish';
  else if (finish.size === null) why = 'nosize';
  else if (!league) why = 'league';
  else if (!leagueFormatFor(league.key, row.year)) why = 'format';
  else if (derbyMeetings(league.key, row.year) !== 2) why = 'cadence';
  else if (rivals.some(r => !namedInLeague(r, league.key, row.year))) why = 'rival';
  const mode = why === null ? 'table' : 'results';
  const sizeKey = league?.key ?? leagueKeyInYear({ name: row.club, league: today }, row.year);
  const size = mode === 'table' ? finish!.size! : (sizeKey ? leagueSizeFor(sizeKey, row.year) : null);
  const games = size ? 2 * (size - 1) : 38;
  let named: string[] = [];
  if (mode === 'table' && league) {
    const field = managerLeagueField({ clubs, club: row.club, league: league.key, year: row.year }, keyedRng(`${row.club}|${row.year}|centre|field`));
    named = field.named.filter(n => n !== row.club && !rivals.includes(n) && n !== champion);
  }
  const tiers: Record<string, number> = {};
  for (const c of adjustClubsForYear([...clubs], row.year)) if (tiers[c.name] === undefined) tiers[c.name] = c.tier;
  const at = career.seasons.indexOf(row);
  const earlier = (at >= 0 ? career.seasons.slice(0, at) : career.seasons.filter(s => s.year < row.year));
  const prev = [...earlier].reverse().find(s => s.type === 'playing');
  const prevFinish = prev ? readLeagueFinish(prev) : null;
  return {
    playerName: career.playerName,
    club: row.club,
    clubTier: row.clubTier,
    position: career.position,
    mode,
    why,
    league,
    finish,
    games,
    champion,
    rivals,
    named,
    tiers,
    goldenBoot: (career.awards ?? []).some(a => a.year === row.year && a.name === 'Golden Boot'),
    keepsSheets: KEEPS_SHEETS.has(career.position),
    derbyBefore: careerDerbyRecord(earlier),
    lastSeason: prev && prevFinish ? { finish: prevFinish.finish, club: prev.club } : null,
  };
}

const RULE3 = { win: 3, draw: 1, loss: 0 };
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** The engine's injury block in league games: weeks out of its 46 week season. */
export function injuryBlock(row: SeasonRecord, games: number): number {
  const w = row.injuryWeeks ?? 0;
  return w > 0 ? clamp(Math.round((w * games) / 46), 1, games) : 0;
}

function fixedOf(row: SeasonRecord, ctx: SoccerSeasonCtx): FixedGame[] {
  const out: FixedGame[] = [];
  for (const d of readSeasonDerbies(row)) {
    for (const m of d.meetings) {
      const g: FixedGame = { key: d.rival, home: m.home, us: m.gf, them: m.ga, played: m.played, line: { goals: ctx.position === 'GK' ? 0 : m.goals } };
      if (m.won) g.decisive = true;
      out.push(g);
    }
  }
  return out;
}

export const SOCCER: SeasonSport<SeasonRecord, SoccerSeasonCtx> = {
  id: 'soccer',
  seasonKey: (row, ctx) => (row.type === 'playing' && row.apps > 0
    ? `${ctx.playerName}|${row.club}|${row.year}|${row.apps}|${row.goals}|${row.assists}|${row.rating}|centre`
    : null),
  frame: (_row, ctx): Frame => ({
    mode: ctx.mode,
    teams: ctx.games / 2 + 1,
    games: ctx.games,
    rule: ctx.mode === 'table' ? RULE3 : null,
  }),
  fixtures: f => (f.mode === 'table' ? roundRobinRounds(f.teams) : ownRowRounds(f.teams)),
  target: (row, ctx): TeamTarget => {
    if (ctx.mode === 'table' && ctx.finish) {
      const title = ctx.finish.finish === 1;
      const champion = title ? 'mine' as const : ctx.champion && ctx.rivals.includes(ctx.champion) ? { key: ctx.champion } : 'other' as const;
      return { kind: 'finish', finish: ctx.finish.finish, title, champion };
    }
    if (row.leagueTitle && !row.injurySevere) return { kind: 'band', ppgMin: CHAMPION_PPG.min, ppgMax: CHAMPION_PPG.max };
    if (ctx.finish && ctx.finish.size && !row.injurySevere) {
      const band = FINISH_PPG[finishFifth(ctx.finish.finish, ctx.finish.size)];
      return { kind: 'band', ppgMin: band.min, ppgMax: band.max };
    }
    return { kind: 'none' };
  },
  fixed: (row, ctx) => fixedOf(row, ctx),
  availability: (row, ctx) => {
    const M = ctx.games;
    const block = injuryBlock(row, M);
    const severe = !!row.injurySevere && block > 0;
    const fixedPlayed = fixedOf(row, ctx).filter(f => f.played).length;
    const room = severe ? M : M - block;
    const want = Math.min(row.leagueApps ?? row.apps, room, row.apps);
    return { played: Math.min(Math.max(want, fixedPlayed), room, row.apps), block, severe };
  },
  totals: (row, ctx): StatTotal[] => [
    { key: 'goals', kind: 'sum', total: row.goals, perGameCap: ctx.position === 'GK' ? 0 : 4, teamFor: true, ...(ctx.goldenBoot ? { noBucket: true } : {}) },
    { key: 'assists', kind: 'sum', total: row.assists, perGameCap: 3, teamFor: true },
    { key: 'rating', kind: 'mean', mean: row.rating, dp: 1, perGame: 0.1, min: 3, max: 10 },
    ...(ctx.keepsSheets ? [{ key: 'cs', kind: 'count-of' as const, total: row.cleanSheets, when: 'shutout' as const }] : []),
    { key: 'yellow', kind: 'sum', total: row.yellowCards, perGameCap: 1, distinct: 'card' },
    { key: 'red', kind: 'sum', total: row.redCards, perGameCap: 1, distinct: 'card', suspends: true },
  ],
  apps: row => row.apps,
  score: (edge, home, rng) => [
    poissonDraw(goalLambda(edge, home ? LAW.home : LAW.away), rng),
    poissonDraw(goalLambda(-edge, home ? LAW.away : LAW.home), rng),
  ],
  strengths: (frame, target, slotOf, ctx, rng) => {
    const n = frame.teams;
    const ladder = Array.from({ length: n }, (_, i) => 85 - (20 * i) / Math.max(1, n - 1));
    const byTier = Math.ceil(n * (ctx.clubTier <= 1 ? 0.15 : ctx.clubTier === 2 ? 0.4 : ctx.clubTier === 3 ? 0.6 : 0.8));
    /* his place on the ladder is the saved finish, scaled to this frame's
       clubs (a results only season's frame can differ from the table it
       saved); the champions' band without a finish starts on top. The
       review found every finish band on the top rung, so a 13th of 22 was
       drawn as a contender and dragged down by one goal losses. */
    const f = ctx.finish;
    const fromFinish = f ? (f.size ? 1 + Math.round(((f.finish - 1) / Math.max(1, f.size - 1)) * (n - 1)) : f.finish) : null;
    const tier = fromFinish ?? (target.kind === 'band' ? 1 : byTier);
    const mine = clamp(target.kind === 'finish' ? target.finish : tier, 1, n);
    const out = new Array<number>(n).fill(0);
    out[0] = ladder[mine - 1];
    const rest = ladder.filter((_, i) => i !== mine - 1);
    const champ = target.kind === 'finish' && typeof target.champion === 'object' ? slotOf.get(target.champion.key) : undefined;
    if (champ !== undefined) out[champ] = rest.shift()!;
    const slots = Array.from({ length: n - 1 }, (_, i) => i + 1).filter(s => s !== champ);
    for (let i = slots.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
    slots.forEach((s, i) => { out[s] = rest[i] + (rng() - 0.5) * 2; });
    return out;
  },
  meanBase: (_key, g: DerivedGame) => 6.55 + 0.8 * (g.line.goals ?? 0) + 0.4 * (g.line.assists ?? 0) + 0.35 * (g.line.cs ?? 0)
    + (g.us > g.them ? 0.25 : g.us < g.them ? -0.3 : 0) - (g.started ? 0 : 0.3),
  subChance: (played, games) => clamp(1.15 - (1.3 * played) / Math.max(1, games), 0.04, 0.55),
  labels: (slots, ctx, rng) => soccerLabels(slots, ctx, rng),
  check: (row, ctx, s) => {
    const out: string[] = [];
    const names = s.labels.filter(l => l.named).map(l => l.name);
    if (new Set(names).size !== names.length) out.push('a club named twice');
    if (s.labels[0]?.name !== row.club) out.push('his club is not slot 0');
    return out;
  },
  words: { round: 'Matchday', title: 'Season Centre', unnamed: 'another club' },
};

/** Names on the table's places, after the season is accepted. */
function soccerLabels(slots: SlotFacts[], ctx: SoccerSeasonCtx, rng: () => number): SlotLabel[] {
  const unnamed = (slot: number): SlotLabel => ({ name: 'another club', named: false, key: `u${slot}` });
  const out: SlotLabel[] = slots.map(s => unnamed(s.slot));
  out[0] = { name: ctx.club, named: true, key: ctx.club };
  const open: SlotFacts[] = [];
  for (const s of slots) {
    if (s.slot === 0) continue;
    if (s.fixedKey) out[s.slot] = { name: s.fixedKey, named: true, key: s.fixedKey };
    else if (s.champion) out[s.slot] = ctx.champion ? { name: ctx.champion, named: true, key: ctx.champion } : unnamed(s.slot);
    else open.push(s);
  }
  if (ctx.mode !== 'table') return out;
  open.sort((a, b) => a.pos - b.pos);
  const entries = ctx.named.map(name => ({ name: name as string | null, at: (ctx.tiers[name] ?? 3) + rng() * 1.5 }));
  for (let i = entries.length; i < open.length; i += 1) entries.push({ name: null, at: 1 + rng() * 3.5 });
  entries.sort((a, b) => a.at - b.at);
  open.forEach((s, i) => {
    const e = entries[i];
    if (e && e.name) out[s.slot] = { name: e.name, named: true, key: e.name };
  });
  return out;
}
