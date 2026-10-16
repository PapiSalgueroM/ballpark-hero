/**
 * Round 1347: the world's Champions League as a competition engine, played whether or not your club is in it,
 * in the format of its era. Nothing in the game calls this yet: Round 1502 binds it to Club Manager (the saved
 * slice, the season it belongs to, the nights of the calendar) and Round 1503 shows it.
 *
 * TWO FORMATS. 'g8', the eras' group stage: 32 clubs in eight groups of four, a double round robin, the top two
 * into a round of 16, then knockout ties whose legs the binding gives (the participant's uclLegsFor: two legs to
 * the semi-finals and a one match final; this module decides no round's legs itself). 'l36', the league phase since
 * 2024-25: Round 1228's library (uclLeaguePhase.ts and leagueSlate.ts), bound here and never copied: the slate
 * by drawUclLeaguePhase, the table by sortedLeaguePhaseTable, the bracket by drawUclKnockout and nextRoundTie.
 *
 * WHAT IT KNOWS AND WHAT IT IS HANDED. The formats, the draw of the eras' groups, the nights, the ties and the
 * evaluation of a season from a compact saved slice. The match itself is handed in (WorldCompBind.sim), and so
 * are a knockout round's rules (legs, away goals, the extra time scales) and the eras' round of 16 draw, which are
 * the participant engine's own. That serves a football competition of these two shapes (the Europa League binds
 * as it is); the tables are football's (three points a win, one a draw, goals) and the Champions League's
 * tiebreaks, and the l36 knockout is Round 1228's 36 club bracket, so a six pot competition or a sport without
 * draws needs more than a binding.
 *
 * NOTHING IS STORED BUT THE SLICE. Every result, table, tie and the winner are derived on every read, from the
 * entrants, a strength snapshot and a seed: each fixture draws from its own keyed stream, so a result never
 * depends on the order anything is evaluated in, and the evaluation at k nights is the first k nights of the
 * evaluation at k + 1. Names are put in order as plain text, never by the device's language (Release AV's
 * rule), so one slice gives one table and one winner on every device.
 *
 * THE DATA. Every number below that is a real fact is a verified row of scripts/data/cmWorldCompFormats.json
 * (the eras) or of Round 1228's scripts/data/cmUclFormat.json (the league phase), and scripts/simWorldUcl.mjs
 * section 0 fails if a constant here and its row disagree. A row that could not be read on two publishers is
 * named in WORLD_COMP_PARTIAL and nothing stands on it. What the game plays in place of a real rule it does not
 * model (pots by its own strength, the bracket order after the round of 16, its own calendar's nights) is the
 * ledger's standIns list, said on the screen.
 */
import { keyedRng } from './keyedRng';
import { uclTieOutcome, type UclLegScore } from './uclTieRule';
import { sortedUclGroupTable, type UclGroupRule } from './clubManagerUclGroups';
import {
  UCL_LEAGUE, drawUclKnockout, nextRoundTie, slateFixtures, sortedLeaguePhaseTable,
  type LeaguePhaseRow, type UclLeagueSlate,
} from './uclLeaguePhase';
import type { TableRow } from './clubManager';

/** Ledger rows this module could not stand on (the CM_PARTIAL shape): each is recorded, marked and unused. */
export const WORLD_COMP_PARTIAL: readonly string[] = ['G2-2005', 'G2-2010', 'G4-early', 'G5-2015-ko', 'G5-2020-ko', 'G8'];

/** The eras' group stage (row G1): 32 clubs, eight groups of four, six matches each, the top two through. */
export const G8_SHAPE = { clubs: 32, groups: 8, groupSize: 4, games: 6, advance: 2 } as const;

/** Whether a season's group draw kept clubs of one association apart (rows G3-2005 to G3-2020). */
export const G8_ASSOC_APART: Readonly<Record<number, boolean>> = { 2005: true, 2010: true, 2015: true, 2020: true };

/** Associations a season's group draw kept apart besides a club's own (rows G5-ruling, G5-2015-groups,
 *  G5-2020-groups): UEFA's ruling of July 2014 on Russian and Ukrainian clubs, so none before it. */
export const G8_BANNED_PAIRS: Readonly<Record<number, readonly (readonly [string, string])[]>> = {
  2005: [], 2010: [], 2015: [['Russia', 'Ukraine']], 2020: [['Russia', 'Ukraine']],
};

/** The league phase's seventeen nights in the order the real 2026-27 season plays them (row N1). */
export const LEAGUE_PHASE_NIGHT_ORDER = [
  'MD1', 'MD2', 'MD3', 'MD4', 'MD5', 'MD6', 'MD7', 'MD8', 'PO1', 'PO2', 'R16_1', 'R16_2', 'QF1', 'QF2', 'SF1', 'SF2', 'F',
] as const;

/**
 * Where the eleven league phase nights after matchday 6 sit, as fractions of the league season: the game's own
 * schedule, not a fact (matchdays 1 to 6 are the calendar's own six European midweeks). Matchdays 7 and 8 come
 * after the January window (0.47 of the season in buildCalendar), then the play-offs, the round of 16, the
 * quarter-finals and the semi-finals, each two legs, and the final after the last league round. The order is
 * the real months' order (row N1); leaguePhaseNightRounds puts each on its own league round.
 */
export const LEAGUE_PHASE_NIGHT_MARKS: readonly number[] = [0.50, 0.53, 0.60, 0.63, 0.68, 0.71, 0.79, 0.82, 0.87, 0.90, 1.0];

/** The two rules of an era season's group draw, read off the rows above. A season the ledger cannot vouch for
 *  is a plain draw (no association rule, no ban), never a guess. */
export function g8DrawRules(year: number): { assocApart: boolean; bans: readonly (readonly [string, string])[] } {
  return { assocApart: G8_ASSOC_APART[year] ?? false, bans: G8_BANNED_PAIRS[year] ?? [] };
}

/** Release AV's comparison: plain text, the same on every device. */
const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export type WorldCompFormat = 'g8' | 'l36';
export type WorldKoRound = 'PO' | 'R16' | 'QF' | 'SF' | 'F';

/**
 * A season of the competition as a save keeps it. The entrants, their strength at the draw and the seed fix
 * every result, so nothing that happens to the world afterwards can rewrite a night already shown; the league
 * phase slate is stored rather than redrawn, so a later change to leagueSlate.ts cannot move a season in flight.
 */
export interface WorldCompSlice {
  v: 1;
  /** The save's season this belongs to. */
  s: number;
  f: WorldCompFormat;
  /** The keyed seed of the season's draw and of every match. */
  seed: number;
  /** g8: the 32 entrants in group order (A is 0 to 3, B 4 to 7, ...). l36: the slate's 36 in pot order. */
  clubs: string[];
  /** Each entrant's strength at the draw, in the same order: every match reads this, never the live world. */
  str: number[];
  /** l36 only: drawUclLeaguePhase's fixture codes, breaks, overCap and fallback exactly as it returned them. */
  fx?: number[]; breaks?: number; overCap?: number; fallback?: true;
  /** g8 only: pairs drawn together against the draw's rules because the field allowed nothing better. */
  clashes?: number;
  /** The holder at the draw (top of pot one) when the save knew one. */
  holder?: string;
}

/** One night of the season, in order. */
export interface WorldNight { id: string; stage: 'md' | WorldKoRound; md?: number; leg?: 1 | 2 }

/** How a knockout round is settled: its legs, whether away goals split a level aggregate, and the scale of the
 *  deciding ninety minutes and of extra time (the participant engine's ET_DEFLATOR and ET_MINUTES). */
export interface TieRules { legs: 1 | 2; awayGoals: boolean; deciderScale: number; etScale: number }

/** A tie as the participant engine keeps one (its UclTie has these fields and more). */
export interface SettleableTie {
  home: string; away: string;
  homeGoals: number | null; awayGoals: number | null; winner: string | null;
  legs?: 1 | 2; leg1?: UclLegScore; leg2?: UclLegScore; byAwayGoals?: boolean; aet?: boolean; pens?: boolean;
}

/** What a caller hands the evaluation: the match, a round's rules, and for the eras the group order and the
 *  round of 16 draw. */
export interface WorldCompBind {
  /** Goals for a match between two strengths, in the order handed, drawn from `rand` and nothing else. */
  sim(strHome: number, strAway: number, scale: number, rand: () => number): [number, number];
  tie(round: WorldKoRound): TieRules;
  /** g8: the era's order of clubs level on points (uclGroupRule). Defaults to the full head to head. */
  groupRule?: UclGroupRule;
  /** g8: the era's round of 16 draw over the group winners and runners-up, in group order. Without one, each
   *  winner meets the runner-up of the next group. */
  drawR16?(field: { winners: string[]; runnersUp: string[]; groupOf: Map<string, string> }): { home: string; away: string }[];
}

export interface WorldFixture { home: string; away: string; hg?: number; ag?: number }

/** A knockout tie as shown: legs in the tie's orientation (home first), leg two after any extra time. */
export interface WorldTieView {
  round: WorldKoRound; slot: number; home: string; away: string;
  leg1?: [number, number]; leg2?: [number, number]; agg?: [number, number];
  winner?: string; aet?: true; pens?: true; byAwayGoals?: true;
}

export interface WorldCompResult {
  f: WorldCompFormat;
  /** Every night played and a winner crowned. */
  done: boolean;
  nightsDone: number;
  nights: (WorldNight & { fixtures: WorldFixture[] })[];
  /** g8: the eight groups, each in its era's order. */
  groups?: { letter: string; rows: TableRow[] }[];
  /** l36: the one table in the league phase's order. */
  table?: LeaguePhaseRow[];
  ties: WorldTieView[];
  winner?: string;
  runnerUp?: string;
}

const GROUP_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/** The two fixtures of one matchday in a four club double round robin. Every club plays every matchday, and
 *  every pairing happens exactly twice with the venue swapped. RECORDED DEBT: today this is a COPY of
 *  clubManager.ts's groupFixtures (the same six matchdays in the same order; its clamp written as Math.max and
 *  Math.min). Round 1347's E2, held for the lead's weight ruling, deletes the engine's copy and imports this one so
 *  the participant's groups and the watched ones play one schedule; until then the unit file holds the two
 *  matchday tables to the same text. */
export function groupFixtures(clubs: string[], md: number): [string, string][] {
  const [a, b, c, d] = clubs;
  const rounds: [string, string][][] = [
    [[a, b], [c, d]],
    [[c, a], [b, d]],
    [[a, d], [b, c]],
    [[b, a], [d, c]],
    [[a, c], [d, b]],
    [[d, a], [c, b]],
  ];
  return rounds[Math.max(0, Math.min(5, md))];
}

const KO_ORDER: Record<WorldCompFormat, WorldKoRound[]> = { g8: ['R16', 'QF', 'SF', 'F'], l36: ['PO', 'R16', 'QF', 'SF', 'F'] };

/** The season's nights in order. `legsOf` gives each knockout round's legs, always from the binding (bind.tie):
 *  the module states no round's legs, so the one match final stands on the participant's uclLegsFor and never on
 *  ledger row G8, which has one publisher. With the participant's legs, g8 is 13 nights and l36 is 17. */
export function nightsOf(f: WorldCompFormat, legsOf: (round: WorldKoRound) => 1 | 2): WorldNight[] {
  const first = f === 'g8' ? G8_SHAPE.games : UCL_LEAGUE.games;
  const out: WorldNight[] = Array.from({ length: first }, (_, md) => ({ id: `MD${md + 1}`, stage: 'md' as const, md }));
  for (const round of KO_ORDER[f]) {
    const legs = legsOf(round);
    if (legs === 1) out.push({ id: round === 'F' ? 'F' : `${round}_1`, stage: round, leg: 1 });
    else for (const leg of [1, 2] as const) out.push({ id: round === 'R16' ? `R16_${leg}` : `${round}${leg}`, stage: round, leg });
  }
  return out;
}

/**
 * The league round after which each league phase night after matchday 6 is played, for a league of `rounds`
 * rounds whose sixth European midweek follows round `lastGroupRound`. buildCalendar's own rule (a fraction of
 * the season, rounded) with its second leg rule made general: every night is at least one league round after
 * the night before, so no two nights share a week and the two legs of a tie are a round apart at any league
 * size. A night the season cannot hold goes after the last league round, a week at a time: a value of
 * rounds - 1 + k is k weeks after the last league round's week.
 */
export function leaguePhaseNightRounds(rounds: number, lastGroupRound: number, marks: readonly number[] = LEAGUE_PHASE_NIGHT_MARKS): number[] {
  const at = (f: number): number => Math.max(0, Math.min(rounds - 1, Math.round(rounds * f)));
  const out: number[] = [];
  let prev = lastGroupRound;
  for (const f of marks) {
    const r = Math.max(prev + 1, at(f));
    out.push(r);
    prev = r;
  }
  return out;
}

/**
 * Settle one knockout tie, exactly the way the participant engine's advanceUclBracket settles a tie it is not
 * in (and, from Round 1347's E2, by this function): two legs, the second at the other ground and deciding the
 * tie, extra time added to leg two when level, then penalties on a coin; or one match, extra time, penalties.
 * `sim(home, away, scale)` returns the goals in the order handed. The tie's fields are written in the order the
 * engine always wrote them (legs, leg1, leg2, aet, the aggregate, byAwayGoals even when undefined, pens, the
 * winner), so a saved bracket is the same bytes whichever of the two calls this.
 * RECORDED DEBT: until E2 (held for the lead's weight ruling) lifts advanceUclBracket's AI tie onto this
 * function, this is a SECOND WRITING of that tie. It is held to the base engine by the golden table
 * (scripts/data/worldTieGolden1347.json) and to the engine of any later commit by
 * `node scripts/recordWorldTieGolden1347.mjs --ref <commit> --check`, which must say SAME before anything merges.
 */
export function settleTie(
  t: SettleableTie, rules: TieRules,
  sim: (home: string, away: string, scale: number) => [number, number], coin: () => number,
): void {
  if (rules.legs === 2) {
    const [h1, a1] = sim(t.home, t.away, 1);
    const [a2, h2] = sim(t.away, t.home, rules.deciderScale);
    t.legs = 2;
    t.leg1 = { homeGoals: h1, awayGoals: a1 };
    t.leg2 = { homeGoals: h2, awayGoals: a2 };
    let out = uclTieOutcome(t, rules.awayGoals);
    if (out.winner === null) {
      const [ea, eh] = sim(t.away, t.home, rules.etScale);
      t.leg2 = { homeGoals: h2 + eh, awayGoals: a2 + ea };
      t.aet = true;
      out = uclTieOutcome(t, rules.awayGoals);
    }
    t.homeGoals = out.homeAgg;
    t.awayGoals = out.awayAgg;
    t.byAwayGoals = out.byAwayGoals || undefined;
    if (out.winner === null) {
      t.pens = true;
      t.winner = coin() < 0.5 ? t.home : t.away;
    } else {
      t.winner = out.winner === 'home' ? t.home : t.away;
    }
    return;
  }
  let [hg, ag] = sim(t.home, t.away, rules.deciderScale);
  if (hg === ag) {
    const [eh, ea] = sim(t.home, t.away, rules.etScale);
    hg += eh;
    ag += ea;
    t.aet = true;
  }
  t.homeGoals = hg;
  t.awayGoals = ag;
  if (hg === ag) {
    t.pens = true;
    t.winner = coin() < 0.5 ? t.home : t.away;
  } else {
    t.winner = hg > ag ? t.home : t.away;
  }
}

/** One club of an era field: its strength for the pots and its association for the draw's rules. */
export interface G8Entrant { club: string; str: number; assoc: string | null }

/* The group draw's search: a few shuffled tries at each number of clashes allowed, each with a step budget, so
   a field that cannot keep the rules is drawn with the fewest clashes the search finds and never hangs. */
const G8_TRIES = 6;
const G8_BUDGET = 4000;

/**
 * The eras' group draw. Four pots of eight by strength (the holder first, then the strongest, then by name as
 * plain text: the game keeps no club coefficient, the ledger's first stand in), one club of each pot in every
 * group, no two clubs of one association in a group when `rules.assocApart` (rows G3) and no club of a banned
 * pair of associations with the other (rows G5). Drawn on keyedRng(`${seed}|g8`). Returns the 32 in group order
 * (group A is the first four, pot one first) and the pairs it had to draw together against the rules, 0 on any
 * field that allows it. Null unless the field is 32 different clubs.
 */
export function drawG8(
  entrants: readonly G8Entrant[], seed: number, holder?: string,
  rules: { assocApart: boolean; bans: readonly (readonly [string, string])[] } = { assocApart: true, bans: [] },
): { clubs: string[]; clashes: number } | null {
  const { clubs: n, groups, groupSize } = G8_SHAPE;
  if (entrants.length !== n || new Set(entrants.map(e => e.club)).size !== n) return null;
  const order = [...entrants].sort((a, b) => Number(b.club === holder) - Number(a.club === holder) || b.str - a.str || byText(a.club, b.club));
  const pots = Array.from({ length: groupSize }, (_, p) => order.slice(p * groups, (p + 1) * groups));
  const banned = (x: string | null, y: string | null): boolean =>
    x !== null && y !== null && rules.bans.some(([p, q]) => (p === x && q === y) || (p === y && q === x));
  const cost = (x: G8Entrant, y: G8Entrant): number =>
    ((rules.assocApart && x.assoc !== null && x.assoc === y.assoc) || banned(x.assoc, y.assoc) ? 1 : 0);
  const rand = keyedRng(`${seed}|g8`);
  const shuffled = <T,>(list: readonly T[]): T[] => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const groupIds = Array.from({ length: groups }, (_, g) => g);
  /* The most hemmed in clubs of each pot go first (a club's own association counted, and a banned partner's),
     and each tries the groups it costs least in first: the first path down is the cheapest greedy draw. */
  const count = new Map<string, number>();
  for (const e of entrants) if (e.assoc !== null) count.set(e.assoc, (count.get(e.assoc) ?? 0) + 1);
  const crowd = (e: G8Entrant): number => (e.assoc === null ? 0 : (rules.assocApart ? (count.get(e.assoc) ?? 0) : 0)
    + rules.bans.reduce((s, [p, q]) => s + (p === e.assoc ? count.get(q) ?? 0 : q === e.assoc ? count.get(p) ?? 0 : 0), 0));
  /* No draw can do better than spreading each association evenly over the groups: start the search there. */
  let floor = 0;
  if (rules.assocApart) {
    for (const m of count.values()) {
      const q = Math.floor(m / groups);
      const r = m % groups;
      floor += r * ((q + 1) * q) / 2 + (groups - r) * (q * (q - 1)) / 2;
    }
  }
  for (let allowed = floor; allowed <= n * n; allowed += 1) {
    for (let attempt = 0; attempt < G8_TRIES; attempt += 1) {
      const seq = pots.flatMap(p => shuffled(p).sort((x, y) => crowd(y) - crowd(x)));
      const tries = seq.map(() => shuffled(groupIds));
      const cells: G8Entrant[][] = groupIds.map(() => []);
      let steps = 0;
      const place = (i: number, used: number): number | null => {
        if (i === seq.length) return used;
        steps += 1;
        if (steps > G8_BUDGET) return null;
        const pot = Math.floor(i / groups);
        const options = tries[i].filter(g => cells[g].length === pot)
          .map(g => ({ g, add: cells[g].reduce((sum, o) => sum + cost(seq[i], o), 0) }))
          .sort((x, y) => x.add - y.add);
        for (const { g, add } of options) {
          if (used + add > allowed) continue;
          cells[g].push(seq[i]);
          const done = place(i + 1, used + add);
          if (done !== null) return done;
          cells[g].pop();
          if (steps > G8_BUDGET) return null;
        }
        return null;
      };
      const used = place(0, 0);
      if (used !== null) return { clubs: cells.flatMap(c => c.map(e => e.club)), clashes: used };
    }
  }
  return null;
}

/** The goals of one fixture, from the snapshot and the fixture's own keyed stream. */
function playFixture(slice: WorldCompSlice, strOf: Map<string, number>, bind: WorldCompBind, night: string, home: string, away: string): [number, number] {
  return bind.sim(strOf.get(home) ?? 0, strOf.get(away) ?? 0, 1, keyedRng(`${slice.seed}|${night}|${home}|${away}`));
}

const emptyRow = (club: string): TableRow => ({ club, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 });
function addResult(rows: Map<string, TableRow>, home: string, away: string, hg: number, ag: number): void {
  const h = rows.get(home);
  const a = rows.get(away);
  if (!h || !a) return;
  h.gf += hg; h.ga += ag; a.gf += ag; a.ga += hg;
  if (hg > ag) { h.w += 1; h.pts += 3; a.l += 1; } else if (hg < ag) { a.w += 1; a.pts += 3; h.l += 1; } else { h.d += 1; a.d += 1; h.pts += 1; a.pts += 1; }
}

/**
 * The season as far as `nightsDone` nights, from the slice alone. The first stage's nights play their
 * fixtures (g8: groupFixtures of each group; l36: the slate's matchday), then the knockout is drawn (g8: the
 * era's round of 16 draw over the winners and runners-up; l36: drawUclKnockout over the final table, the
 * play-offs, then { the play-off winner of a slot, that slot's seed }) and each later round is paired from the
 * last one's winners in slot order (g8: winners 2i and 2i + 1, the participant engine's pairing; l36:
 * nextRoundTie). Every fixture draws from keyedRng(`${seed}|${night}|${home}|${away}`) and every tie, both legs,
 * extra time and the coin, from keyedRng(`${seed}|${round}|${home}|${away}`). A night not yet played shows its
 * fixtures without scores once they are known. Pure and deterministic, and a prefix.
 */
export function evaluateWorldComp(slice: WorldCompSlice, nightsDone: number, bind: WorldCompBind): WorldCompResult {
  const f = slice.f;
  const strOf = new Map(slice.clubs.map((c, i) => [c, slice.str[i] ?? 0]));
  const legsOf = (r: WorldKoRound): 1 | 2 => bind.tie(r).legs;
  const nights = nightsOf(f, legsOf).map(n => ({ ...n, fixtures: [] as WorldFixture[] }));
  const k = Math.max(0, Math.min(Math.floor(nightsDone), nights.length));
  const out: WorldCompResult = { f, done: false, nightsDone: k, nights, ties: [] };
  const rows = new Map(slice.clubs.map(c => [c, emptyRow(c)]));
  const results: Record<string, [number, number]> = {};
  const firstStage = f === 'g8' ? G8_SHAPE.games : UCL_LEAGUE.games;
  const slate: UclLeagueSlate | null = f === 'l36' && slice.fx
    ? { v: 1, seed: slice.seed, clubs: slice.clubs, fx: slice.fx, breaks: slice.breaks ?? 0, overCap: slice.overCap ?? 0 } : null;
  const groupsOf = f === 'g8' && slice.clubs.length === G8_SHAPE.clubs
    ? GROUP_NAMES.map((_, g) => slice.clubs.slice(g * G8_SHAPE.groupSize, (g + 1) * G8_SHAPE.groupSize)) : [];
  if (f === 'g8' ? groupsOf.length === 0 : !slate) return out;
  for (let md = 0; md < firstStage; md += 1) {
    const pairs = f === 'g8' ? groupsOf.flatMap(g => groupFixtures(g, md)) : slateFixtures(slate as UclLeagueSlate, md);
    nights[md].fixtures = pairs.map(([home, away]): WorldFixture => {
      if (md >= k) return { home, away };
      const [hg, ag] = playFixture(slice, strOf, bind, nights[md].id, home, away);
      addResult(rows, home, away, hg, ag);
      results[`${home}|${away}`] = [hg, ag];
      return { home, away, hg, ag };
    });
  }
  const groups = groupsOf.map((g, i) => ({
    letter: GROUP_NAMES[i],
    rows: sortedUclGroupTable(g.map(c => rows.get(c) as TableRow), bind.groupRule ?? 'h2hFull', results, byText),
  }));
  if (f === 'g8') out.groups = groups;
  else out.table = sortedLeaguePhaseTable(slice.clubs.map(c => rows.get(c) as TableRow), results);
  if (k < firstStage) return out;

  let field: { home: string; away: string }[];
  let seeds: string[] = [];
  if (f === 'g8') {
    const winners = groups.map(g => g.rows[0].club);
    const runnersUp = groups.map(g => g.rows[1].club);
    const groupOf = new Map(groups.flatMap(g => g.rows.map(r => [r.club, g.letter] as [string, string])));
    field = bind.drawR16 ? bind.drawR16({ winners, runnersUp, groupOf }) : winners.map((w, i) => ({ home: runnersUp[(i + 1) % winners.length], away: w }));
  } else {
    const draw = drawUclKnockout((out.table ?? []).map(r => r.club), slice.seed);
    if (!draw) return out;
    seeds = draw.seeds;
    field = draw.playoffs.map(p => ({ home: p.home, away: p.away }));
  }
  let night = firstStage;
  let last: string[] = [];
  for (const round of KO_ORDER[f]) {
    const rules: TieRules = bind.tie(round);
    const pairs = round === KO_ORDER[f][0] ? field
      : f === 'l36' && round === 'R16' ? seeds.map((seed, i) => ({ home: last[i], away: seed }))
        : f === 'l36' ? Array.from({ length: last.length / 2 }, (_, i) => nextRoundTie(last, i))
          : Array.from({ length: last.length / 2 }, (_, i) => ({ home: last[2 * i], away: last[2 * i + 1] }));
    const first = night;
    const end = night + rules.legs - 1;
    const winners: string[] = [];
    pairs.forEach((p, slot) => {
      const t: SettleableTie = { home: p.home, away: p.away, homeGoals: null, awayGoals: null, winner: null };
      const rand = keyedRng(`${slice.seed}|${round}|${p.home}|${p.away}`);
      settleTie(t, rules, (h, a, scale) => bind.sim(strOf.get(h) ?? 0, strOf.get(a) ?? 0, scale, rand), rand);
      const view: WorldTieView = { round, slot, home: t.home, away: t.away };
      if (rules.legs === 2 && t.leg1 && t.leg2) {
        nights[first].fixtures.push(k > first ? { home: t.home, away: t.away, hg: t.leg1.homeGoals, ag: t.leg1.awayGoals } : { home: t.home, away: t.away });
        nights[end].fixtures.push(k > end ? { home: t.away, away: t.home, hg: t.leg2.awayGoals, ag: t.leg2.homeGoals } : { home: t.away, away: t.home });
        if (k > first) view.leg1 = [t.leg1.homeGoals, t.leg1.awayGoals];
        if (k > end) view.leg2 = [t.leg2.homeGoals, t.leg2.awayGoals];
      } else {
        nights[first].fixtures.push(k > first ? { home: t.home, away: t.away, hg: t.homeGoals ?? 0, ag: t.awayGoals ?? 0 } : { home: t.home, away: t.away });
      }
      if (k > end) {
        view.agg = [t.homeGoals ?? 0, t.awayGoals ?? 0];
        view.winner = t.winner ?? undefined;
        if (t.aet) view.aet = true;
        if (t.pens) view.pens = true;
        if (t.byAwayGoals) view.byAwayGoals = true;
      }
      out.ties.push(view);
      winners.push(t.winner as string);
    });
    night = end + 1;
    if (k < night) return out;
    last = winners;
    if (round === 'F') {
      const fin = out.ties[out.ties.length - 1];
      out.winner = fin.winner;
      out.runnerUp = fin.winner === fin.home ? fin.away : fin.home;
      out.done = k >= nights.length;
    }
  }
  return out;
}

/** The winner and runner-up of a finished season, else null. */
export function worldCompWinner(result: WorldCompResult): { winner: string; runnerUp: string } | null {
  return result.done && result.winner && result.runnerUp ? { winner: result.winner, runnerUp: result.runnerUp } : null;
}

