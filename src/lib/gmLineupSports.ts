/* Round 945: the sports the lineup engine (gmLineup.ts) knows, as data.

   Each sport says three things: its slot groups and what each slot is worth,
   the men its CURRENT strength reads (so the number with no choices is the
   one the engine gives today, scripts/simGmLineup.mjs holds it to that), and
   how the sim picks a lineup itself.

   Built lazily, never at module scope: this file imports the engines, and a
   later bind has the engines import gmLineup.ts. Reading an engine's export
   while this module is still loading is how the import cycle of CLAUDE.md
   got in, so nothing below touches one until it is called.

   Every weight below is the game's own assumption, not a measured split. */
import { type GmLineupMan, type GmLineupSport, type GmScheme, type GmSlot, type GmSlotGroup, gmFillByRating, gmGroupPool } from './gmLineup';
import { type MlbGmTeam, mlbStrengthUnits } from './mlbFrontOffice';
import { type NhlGmTeam, nhlContributors } from './nhlFrontOffice';
import { type GmTeamState, type DepthPos, DEF_POS, DEF_SLOTS, OL_SLOTS, REPLACEMENT_OVR, SKILL_POS, SKILL_SLOTS, depthOrder, unitStarters } from './frontOffice';

const slots = (label: string, n: number, weight: number, accepts?: readonly string[]): GmSlot[] =>
  Array.from({ length: n }, (_, i) => ({ label: n > 1 ? `${label} ${i + 1}` : label, weight, ...(accepts ? { accepts } : {}) }));

const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

/* ---- MLB ----------------------------------------------------------------
   The batting nine. Every spot comes up once a time through the order, and
   the spots ahead of wherever the game stops come up once more. The game
   takes a game as three full turns and a fourth that stops at a random spot,
   so spot i bats 3 + (10 - i) / 9 times: 4 for the leadoff man down to 3.11
   for the ninth. A model, not a measured split, and all it has to do is make
   the order matter a little without outweighing who is in it.
   Today's strength reads the best 8 bats, so the nine's first 8 are counted.
   The rotation is five men walked start by start: a five man turn is the
   full rest, and every game of rest short of it costs a start 4 points. The
   fifth slot may be left empty on purpose, a four man turn on short rest.
   Today reads the best 3 starters. The pen is a closer and a setup man,
   today's best 2 relievers, the closer's inning weighted a touch higher. */
let mlb: GmLineupSport<MlbGmTeam> | null = null;
export function mlbLineupSport(): GmLineupSport<MlbGmTeam> {
  if (mlb) return mlb;
  const groups: GmSlotGroup[] = [
    {
      key: 'bats', label: 'Batting order', share: 0.55, counted: 8, fallback: 62,
      positions: { not: ['SP', 'RP', 'CL'] },
      slots: ORDINAL.map((label, i) => ({ label, weight: 3 + (10 - (i + 1)) / 9 })),
    },
    {
      key: 'rotation', label: 'Rotation', share: 0.33, counted: 3, fallback: 62,
      positions: ['SP'], slots: slots('Starter', 5, 1),
      rotation: { fullRest: 4, shortRestCost: 4, optional: 1 },
    },
    {
      key: 'pen', label: 'Bullpen', share: 0.12, counted: 2, fallback: 62,
      positions: ['RP', 'CL'], slots: [{ label: 'Closer', weight: 0.55 }, { label: 'Setup', weight: 0.45 }],
    },
  ];
  mlb = {
    id: 'mlb',
    groups,
    men: t => t.players,
    base: t => {
      const u = mlbStrengthUnits(t);
      return { bats: u.bats, rotation: u.rot, pen: u.pen };
    },
    auto: (t, g, s) => gmFillByRating(g, s, gmGroupPool(g, t.players)),
  };
  return mlb;
}

/* ---- NHL ----------------------------------------------------------------
   Four lines of three, three pairs, a starter and a backup, and two power
   play units of four forwards and a defender. The lines are weighted
   0.35, 0.30, 0.20 and 0.15, the pairs 0.40, 0.35 and 0.25, and the starter
   takes three nights in four: the game's own split of the ice, not a
   measured one. Today's strength reads six forwards, four defenders and a
   goalie (nhlContributors, the GM's pick or the best by rating), so those
   men open on the top two lines, the top two pairs and in net, and are the
   ones counted. The power play is new: it only moves the number, at a
   tenth of a point per point of unit rating. */
const FWD = ['C', 'W'];
let nhl: GmLineupSport<NhlGmTeam> | null = null;
export function nhlLineupSport(): GmLineupSport<NhlGmTeam> {
  if (nhl) return nhl;
  const line = (n: number, w: number) => slots(`Line ${n}`, 3, w);
  const pair = (n: number, w: number) => slots(`Pair ${n}`, 2, w);
  const unit = (n: number, w: number) => [...slots(`PP${n} F`, 4, w, FWD), ...slots(`PP${n} D`, 1, w, ['D'])];
  const groups: GmSlotGroup[] = [
    { key: 'forwards', label: 'Lines', share: 0.5, counted: 6, fallback: 62, positions: FWD, slots: [...line(1, 0.35), ...line(2, 0.30), ...line(3, 0.20), ...line(4, 0.15)] },
    { key: 'defense', label: 'Pairs', share: 0.3, counted: 4, fallback: 62, positions: ['D'], slots: [...pair(1, 0.40), ...pair(2, 0.35), ...pair(3, 0.25)] },
    { key: 'goalie', label: 'Net', share: 0.2, counted: 1, fallback: 62, positions: ['G'], slots: [{ label: 'Starter', weight: 0.75 }, { label: 'Backup', weight: 0.25 }] },
    { key: 'pp', label: 'Power play', share: 0.1, counted: 0, fallback: 62, positions: [...FWD, 'D'], slots: [...unit(1, 0.6), ...unit(2, 0.4)] },
  ];
  /* The men nhlStrength reads, in the order it reads them. */
  const read = (t: NhlGmTeam): Record<string, GmLineupMan[]> => {
    const healthy = t.players.filter(p => p.out === 0);
    if (t.contributors !== undefined) {
      const s = nhlContributors(t);
      const find = (id: string) => healthy.find(p => p.id === id)!;
      return { forwards: s.forwards.map(find), defense: s.defense.map(find), goalie: s.goalie === null ? [] : [find(s.goalie)] };
    }
    const top = (pos: string[], n: number) => healthy.filter(p => pos.includes(p.pos)).sort((a, b) => b.ovr - a.ovr).slice(0, n);
    return { forwards: top(FWD, 6), defense: top(['D'], 4), goalie: top(['G'], 1) };
  };
  nhl = {
    id: 'nhl',
    groups,
    men: t => t.players,
    base: read,
    auto: (t, g, s) => {
      const pool = gmGroupPool(g, t.players);
      const counted = (read(t)[g.key] ?? []).slice().sort((a, b) => b.ovr - a.ovr);
      return gmFillByRating(g, s, pool, counted);
    },
  };
  return nhl;
}

/* ---- NFL ----------------------------------------------------------------
   The men come off the Round 723 depth chart, which the GM already orders,
   so the NFL lineup is the scheme: the personnel group on offense and the
   front on defense, each a slot shape filled by the first healthy men of
   each position off the chart. Today's strength reads the chart's starters
   (unitStarters: the quarterback, the best five skill men, the line, the
   best six defenders), so those are counted exactly as now, and a scheme
   moves the number by how its eleven read against the default's:
     offense  11 (1 RB, 3 WR, 1 TE, the default), 12 (1 RB, 2 WR, 2 TE), 21 (2 RB, 2 WR, 1 TE)
     defense  4-3 (4 DL, 3 LB, 4 DB, the default), 3-4 (3 DL, 4 LB, 4 DB)
   The line is five off the chart and has no scheme, so it never moves the
   number beyond what the chart already does.
   Sources for the shapes, all read 2026-10-03:
     personnel, first digit backs, second tight ends, receivers the rest of
     the eleven, 11 = 1 RB 1 TE 3 WR, 12 = 1 RB 2 TE 2 WR, 21 = 2 RB 1 TE 2 WR:
       http://www.insidethe49.com/football-101/offensive-personnel-packages-nfl/
       http://www.footballboost.com/OffensiveFormations.html
     fronts, 4-3 four linemen and three linebackers, 3-4 three and four, and
     a nickel brings on a fifth defensive back (so the base front has four):
       https://operations.nfl.com/learn-the-game/nfl-basics/terms-glossary/
     the linebackers (three in a 4-3 base set, four in a 3-4) a second time:
       https://bleacherreport.com/articles/1212418-football-101-linebacker-assignments-and-alignment
     The linemen and defensive back counts rest on the glossary alone: no
     second source read that day states them, so they are flagged for a
     second read in the round's report rather than claimed twice. */
const personnel = (rb: number, wr: number, te: number): GmSlot[] =>
  [...slots('RB', rb, 1, ['RB']), ...slots('WR', wr, 1, ['WR']), ...slots('TE', te, 1, ['TE'])];
const front = (dl: number, lb: number): GmSlot[] =>
  [...slots('DL', dl, 1, ['DL']), ...slots('LB', lb, 1, ['LB']), ...slots('DB', 4, 1, ['DB'])];
export const NFL_OFFENSE_SCHEMES: readonly GmScheme[] = [
  { key: '11', label: '11 personnel', slots: personnel(1, 3, 1) },
  { key: '12', label: '12 personnel', slots: personnel(1, 2, 2) },
  { key: '21', label: '21 personnel', slots: personnel(2, 2, 1) },
];
export const NFL_DEFENSE_SCHEMES: readonly GmScheme[] = [
  { key: '43', label: '4-3', slots: front(4, 3) },
  { key: '34', label: '3-4', slots: front(3, 4) },
];
let nfl: GmLineupSport<GmTeamState> | null = null;
export function nflLineupSport(): GmLineupSport<GmTeamState> {
  if (nfl) return nfl;
  const groups: GmSlotGroup[] = [
    { key: 'qb', label: 'Quarterback', share: 0.30, counted: 1, fallback: 64, floor: 64, positions: ['QB'], slots: [{ label: 'QB', weight: 1 }] },
    { key: 'skill', label: 'Personnel', share: 0.30, counted: SKILL_SLOTS, fallback: 64, positions: SKILL_POS, slots: NFL_OFFENSE_SCHEMES[0].slots },
    { key: 'ol', label: 'Line', share: 0.12, counted: OL_SLOTS, fallback: 64, positions: ['OL'], slots: slots('OL', 5, 1) },
    { key: 'def', label: 'Front', share: 0.28, counted: DEF_SLOTS, fallback: REPLACEMENT_OVR, empty: REPLACEMENT_OVR, positions: DEF_POS, slots: NFL_DEFENSE_SCHEMES[0].slots },
  ];
  nfl = {
    id: 'nfl',
    groups,
    schemes: { skill: NFL_OFFENSE_SCHEMES, def: NFL_DEFENSE_SCHEMES },
    chartOnly: true,
    men: t => t.players,
    base: t => ({
      qb: unitStarters(t, ['QB'], 1),
      skill: unitStarters(t, SKILL_POS, SKILL_SLOTS),
      ol: unitStarters(t, ['OL'], OL_SLOTS),
      def: unitStarters(t, DEF_POS, DEF_SLOTS),
    }),
    /* Each slot takes the next healthy man of its position off the chart. */
    auto: (t, g, s) => {
      const next: Partial<Record<DepthPos, number>> = {};
      return s.map(slot => {
        const pos = (slot.accepts ?? (g.positions as readonly string[]))[0] as DepthPos;
        const chart = depthOrder(t, pos).filter(p => p.out === 0);
        const at = next[pos] ?? 0;
        next[pos] = at + 1;
        return chart[at] ?? null;
      });
    },
  };
  return nfl;
}
