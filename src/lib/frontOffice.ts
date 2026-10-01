import { FO_TEAMS, FO_TEAM_MAP, type FoPlayer, type FoTeam } from '@/data/frontOfficePlayers';
/* Round 828: a type only. The bench and the practice squad are a separate,
   lazily loaded chunk the board hands to initLeague for a new league. */
import type { FoDepthTeam } from '@/data/frontOfficeDepth';
/* Round 211: no two men in one league share a name. */
import { leagueNames, uniqueName } from './foNames';
/* Round 531: the cap comes from one sourced file, never a bare literal here. */
import { NFL_SALARY_CAP_2026 } from './leagueCaps';
import { makeIdMinter, ensureLeagueEntityIds } from './entityIds';
/* Round 631: dead money and the no way back rule, shared by the four GM sims. */
import { type CutLedger, type DeadCapEntry, cutPlayer, payrollWithDeadCap, rollDeadCap, signRefusal, tradeRefusal, rosterFullRefusal } from './frontOfficeCuts';

/**
 * NFL Front Office engine (2026-08-05, the manager-for-every-sport push).
 * A full GM sim over the REAL 2025-26 roster bake in frontOfficePlayers.ts:
 * cap sheet, releases, free agency, trades, a three-round draft of clearly
 * fictional prospects, a 17-game schedule with true divisional structure,
 * injuries, the real 14-team playoff format (7 seeds per conference, first
 * round byes for the 1 seeds), aging and contract churn across unlimited
 * seasons. Everything the GM does is explicitly hypothetical; player
 * ratings are derived by scripts/genFrontOfficeRoster.mjs from the 2026
 * rosters and the 2025 season (see the data file header for every rule).
 *
 * Determinism: all randomness flows through the caller's rng so headless
 * tests can replay seasons.
 */

export const SALARY_CAP_BASE = NFL_SALARY_CAP_2026; // $M; the 5% rise per season in game is the game's own assumption, see leagueCaps.ts
export const REGULAR_WEEKS = 17;

export interface GmPlayer extends FoPlayer {
  id: string;
  /** Weeks remaining out injured (0 = healthy). */
  out: number;
  /** Hidden growth ceiling for young players. */
  pot: number;
  /* Round 723: the franchise tag. All three absent on a man never tagged, so
     every league saved before this round loads unchanged. */
  /** The season the tag covers. */
  tagSeason?: number;
  /** Consecutive tags, 1 for the first. The second costs 120 percent of the first. */
  tagCount?: number;
  /** A fully guaranteed deal. frontOfficeCuts reads it: cutting him is dead money in full. */
  guaranteed?: boolean;
  /** Round 828: he had no 2025 season to rate (a rookie, or hurt all year), so his
      opening rating is draft position and service alone. The board says so. */
  noSeason?: boolean;
}

/** Round 723: the position groups the depth chart is drawn in. The roster
    bake carries these eight; it has no kicker or punter and does not split
    DB into corner and safety, so neither does the chart. */
export const DEPTH_GROUPS: GmPlayer['pos'][] = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB'];
export type DepthPos = GmPlayer['pos'];

/** Round 631: what a cut still costs after the man has gone. See src/lib/frontOfficeCuts.ts. */
export type GmDeadCap = DeadCapEntry;

/* Round 631: CutLedger is the optional deadCap and releasedThisSeason pair,
   so every league saved before this round keeps loading and reads as empty. */
export interface GmTeamState extends CutLedger {
  abbr: string;
  players: GmPlayer[];
  defense: number;
  wins: number;
  losses: number;
  /** Draft capital markers, one entry per round held this year. */
  picks: number[];
  /* Round 723. Both optional: a team without them reads as a chart by rating
     and a tag never used, which is exactly what every older save was. */
  /** The depth chart: player ids in order, per position group. A group that
      is absent, or any man a saved order does not name, falls in by rating. */
  depth?: Partial<Record<DepthPos, string[]>>;
  /** The season the franchise tag was last used for. One tag per offseason. */
  tagUsedFor?: number;
  /* Round 828. Both absent on every league saved before this round, which
     keeps playing exactly as it did: fifteen men, every one of them read. */
  /** A full roster: the units read each group's starters off the chart
      (STARTER_SLOTS), the bench waits, and DEEP_ROSTER_MAX holds. */
  rosterDepth?: 2;
  /** The practice squad: real men off the active roster, off the cap. */
  practice?: GmPlayer[];
}

export interface GmGame {
  week: number;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  winner: string;
}

export interface Prospect {
  id: string;
  name: string;
  pos: GmPlayer['pos'] | 'DEF';
  age: number;
  /** Scouted grade shown to the GM (true ovr hidden until drafted). */
  grade: number;
  trueOvr: number;
}

export interface LeagueState {
  season: number; // 2026, 2027, ...
  cap: number;
  teams: Record<string, GmTeamState>;
  freeAgents: GmPlayer[];
  schedule: GmGame[][]; // week -> games
  week: number; // 1..17, 18 = playoffs
  champions: { season: number; team: string }[];
  /** Round 828: present on a league started with full rosters. Absent on every older save. */
  rosterDepth?: 2;
}

/* Round 568: this counter used to live at module scope, which restarts on
   every page load while the save does not, so a reload handed a new man an
   id a saved man already wore. See src/lib/entityIds.ts for the measurement
   and the rule. Call sites below are unchanged. */
export const freshId = makeIdMinter('p');

/** Round 568: repair a save written before the minter above. First holder
    keeps its id, every shadowed entity gets a fresh one, nobody is dropped.
    Loose lists (a draft class, a recruiting class, a portal) come from the
    same counter, so they are one id space with the rosters. */
export function ensureFoLeagueIds(lg: LeagueState, ...loose: (({ id: string }[]) | null | undefined)[]): number {
  /* Round 828: the practice squads share the id space, so they are passed as
     loose lists. A league without them passes nothing extra. */
  const practice = Object.values(lg.teams ?? {}).map(t => t.practice);
  return ensureLeagueEntityIds(freshId, lg as never, ...practice, ...loose);
}

export function makeGmPlayer(p: FoPlayer, rng: () => number): GmPlayer {
  return {
    ...p,
    id: freshId(),
    out: 0,
    pot: p.age <= 25 ? Math.min(97, p.ovr + 2 + Math.floor(rng() * 6)) : p.ovr,
  };
}

/* ROUND 828: THE WHOLE CLUB. A league started with `depth` carries every
   club's real active roster (the fifteen starters plus the bench) and its
   practice squad, where every league before carried the fifteen alone.

   THE STARTERS ARE DEALT FIRST AND EVERYTHING THE SEASON READS IS DRAWN
   BEFORE THE BENCH ARRIVES. The starters, the opening free agent pool and
   the schedule take the same draws from the same rng in the same order as a
   fifteen man league, and only then do the bench and the practice squad
   draw their growth ceilings. So for one seed a full league and a fifteen
   man league open on the same starters, the same market and the same
   fixtures, which is what lets scripts/simNflFullRosters.mjs show that the
   bench changes no result while every starter is fit. The name book the
   pool is dealt against includes the bench and the practice squad, so no
   invented free agent shares a name with a real backup; simInventedNames
   keeps every name bank clear of every real name, so that book never makes
   uniqueName draw again and the pool is the same either way.

   Without `depth` this is the fifteen man league exactly as it always was,
   which is what every harness and every older save is built on. */
export interface InitLeagueOptions {
  /** The bench and the practice squad per club, from src/data/frontOfficeDepth.ts. */
  depth?: Record<string, FoDepthTeam>;
}

export function initLeague(rng: () => number = Math.random, opts: InitLeagueOptions = {}): LeagueState {
  const teams: Record<string, GmTeamState> = {};
  for (const t of FO_TEAMS) {
    teams[t.abbr] = {
      abbr: t.abbr,
      players: t.players.map(p => makeGmPlayer(p, rng)),
      defense: t.defense,
      wins: 0,
      losses: 0,
      picks: [1, 2, 3],
    };
  }
  const depth = opts.depth;
  const taken = leagueNames({ teams, freeAgents: [] });
  if (depth) {
    for (const d of Object.values(depth)) for (const p of [...d.bench, ...d.practice]) taken.add(p.name);
  }
  const league: LeagueState = {
    season: 2026,
    cap: SALARY_CAP_BASE,
    teams,
    /* Round 211: the pool is dealt against the names already on the
       thirty two rosters, so an invented free agent can never share a name
       with a real player either. */
    freeAgents: buildInitialFreeAgents(rng, taken),
    schedule: buildSchedule(rng),
    week: 1,
    champions: [],
  };
  if (depth) {
    league.rosterDepth = 2;
    for (const t of FO_TEAMS) {
      const team = teams[t.abbr];
      const d = depth[t.abbr];
      team.rosterDepth = 2;
      team.players.push(...(d?.bench ?? []).map(p => makeGmPlayer(p, rng)));
      team.practice = (d?.practice ?? []).map(p => makeGmPlayer(p, rng));
      const unrated = new Set(d?.noSeason ?? []);
      for (const p of [...team.players, ...team.practice]) if (unrated.has(p.name)) p.noSeason = true;
    }
  }
  return league;
}

/** A believable opening FA pool: fictional veterans at every position. */
function buildInitialFreeAgents(rng: () => number, taken: Set<string>): GmPlayer[] {
  const out: GmPlayer[] = [];
  /* Round 418: the opening market carries defenders too. It never did, so
     the two position groups Round 416 added were unsignable: you could see
     them on other teams and never acquire one except by trade. */
  const POS: GmPlayer['pos'][] = ['QB', 'RB', 'WR', 'WR', 'TE', 'OL', 'OL', 'DL', 'LB', 'DB'];
  for (let i = 0; i < 20; i++) {
    const pos = POS[i % POS.length];
    const ovr = 70 + Math.floor(rng() * 12);
    out.push({
      id: freshId(),
      name: prospectName(rng, taken),
      pos,
      age: 27 + Math.floor(rng() * 6),
      ovr,
      salary: salaryFor(pos, ovr),
      years: 1 + Math.floor(rng() * 2),
      out: 0,
      pot: ovr,
    });
  }
  return out;
}

export function salaryFor(pos: GmPlayer['pos'], ovr: number): number {
  if (pos === 'QB') return Math.round(Math.max(1.5, (ovr - 66) * 1.8 - 18) * 10) / 10;
  return Math.round(Math.max(1.0, (ovr - 66) * 1.15 - 12) * 10) / 10;
}

/** The roster's salaries plus this season's dead money (Round 631). */
export function capUsed(team: GmTeamState): number {
  return payrollWithDeadCap(team.players, team);
}

export function capRoom(team: GmTeamState, cap: number): number {
  return Math.round((cap - capUsed(team)) * 10) / 10;
}

export const SKILL_POS: GmPlayer['pos'][] = ['RB', 'WR', 'TE'];
export const DEF_POS: GmPlayer['pos'][] = ['DL', 'LB', 'DB'];

/* ROUND 418: THE DEFENCE IS THE DEFENDERS. Until now the 28 percent of team
   strength that defence is worth came from `team.defense`, a single stored
   number, and the men on the roster were worth nothing at all. That was
   deliberate for one round while the bake landed, and it left the game
   saying two different things at once: the old number came from a 2024
   team-unit rating, and measured against the 2026 defenders the same file
   now lists its correlation is MINUS 0.112. In other words a club could
   show you six good defenders and still be rated a poor defence, and
   trading for a great one changed nothing at all.
   It reads the roster now, so signing, trading, drafting or losing a
   defender moves the number the way signing a receiver always has.
   THERE IS NO FALLBACK TO THE STORED NUMBER, and an earlier draft of this
   round had one. It was meant to keep pre 416 saves playing as they always
   had, but no test on a count of defenders can tell a save that never had
   any from a 2026 club that has just cut its last one, so it turned into a
   live exploit: cutting your whole defence dropped you onto the stored
   number, which for 11 of the 32 clubs was an UPGRADE. A pre 416 save
   therefore keeps its titles, its seasons and its squad, and its defence
   sits at replacement level for every club EQUALLY until the first offseason
   gives everyone their six back. Equally is the load bearing word: a result
   reads the gap between two teams, so a uniform floor changes none of them. */
/** The defensive complement the roster file ships: DL 2, LB 2, DB 2. */
export const DEF_SLOTS = 6;
/* A man off the street. The bake's floor is 66, and the depth journeymen
   replenishRosters invents start at 66, so 60 is below anything a real
   roster holds: losing a defender and not replacing him has to cost. */
export const REPLACEMENT_OVR = 60;

/* A MEAN REWARDS CUTTING YOUR WORST MAN, and the first version of this was a
   mean. Releasing a below average defender raised the average, so it raised
   team strength: measured on the shipped league it made all 32 clubs
   stronger, worth a mean of +0.585 and up to +1.04, and cutting five of six
   was worth +2.95 while freeing 27M of cap. Worse, cutting all six fell
   through to the stored 2024 unit number, which for 11 of the 32 was an
   upgrade: Miami went from 73.85 to 79.22 and from 3.65 wins a season to
   6.38. The board displayed the rise as it happened, with the Cut buttons a
   dozen lines below the number, so the game was inviting it.
   The fix is the shape the skill term has always used: a FIXED denominator.
   The best DEF_SLOTS defenders count, and an empty slot counts as a
   replacement level man rather than being quietly left out of the average,
   so removing anybody can only ever lower the number. It is monotone by
   construction rather than by a check that has to think of the exploit
   first. A club that ships its full six is scored exactly as before, so
   nothing about the opening league changed.
   THE STORED NUMBER IS GONE, and that is a deliberate second change. Keeping
   it as the empty roster fallback is what made cutting your whole defence
   pay, and no test on the count of defenders can tell a pre 416 save that
   never had any from a 2026 club that has just cut its last one. A pre 416
   save therefore keeps its titles, its seasons and its squad, and its
   defence sits at replacement level for every club equally until the first
   offseason gives everyone their six back. Equally is the important word:
   game outcomes read the GAP between two teams, so a uniform floor changes
   no result between them. */
export function defenceRating(team: GmTeamState): number {
  const best = unitStarters(team, DEF_POS, DEF_SLOTS).map(p => p.ovr);
  const filled = best.reduce((s, v) => s + v, 0);
  const empty = (DEF_SLOTS - best.length) * REPLACEMENT_OVR;
  return (filled + empty) / DEF_SLOTS;
}

// ---------------------------------------------------------------------------
// Round 723: the depth chart
// ---------------------------------------------------------------------------

/* THE CHART IS THE ORDER THE SIM ALREADY USED, WRITTEN DOWN. Before this round
   team strength picked its men by rating inside each unit: the best healthy
   quarterback, the five best healthy skill men across RB, WR and TE, every
   healthy lineman, the six best healthy defenders across DL, LB and DB. That
   is a depth chart nobody could see or touch. Now every team carries one per
   position group, by rating until the GM reorders it, and the units read it.

   HOW A UNIT READS EIGHT GROUP CHARTS. The skill and defence units cross
   groups (five men from three groups, six from three), so a per group order
   alone cannot say whether the third receiver or the second back is the fifth
   skill starter. The rule: the unit's slots are shared out by rating (the top
   five healthy skill men by rating decide how many slots RB, WR and TE each
   earn), and each group's CHART ORDER decides who fills that group's slots.
   With a chart by rating that is exactly the men the old code picked, for
   every roster shape, which is what keeps every saved league's strength and
   every seeded season's results unchanged (scripts/simNflTagDepth.mjs holds
   the pre round formula as a fixture and checks the two agree on 32 clubs
   over several seeds, injuries and uneven rosters). Reorder a group and the
   men in its slots change but the slot count does not: bench your best
   receiver behind two lesser ones and you are weaker, promote a better backup
   over a starter and you are stronger, and the harness walks 200 such swaps.

   Injured men are skipped before anything is counted, so the next man in the
   chart order steps up on his own.

   THE LINE IS EVERY HEALTHY LINEMAN, as it always was here, and that is on
   purpose. A first draft of this round started five, which matches every
   club the bake ships (two linemen each) but not every saved league: a probe
   of board like careers (the GM taking the best graded prospect, eight seeds,
   fifteen seasons) found six or more linemen on 43 of 3840 club seasons and
   on 23 of the GM's own 120. Every one of those saves would have opened on a
   different strength and played different results from the same seed, which
   is the one thing this round promised not to do. So the line's order is on
   the chart for the GM to see, and every healthy man on it plays. */
export const SKILL_SLOTS = 5;
export const OL_SLOTS = Number.POSITIVE_INFINITY;

/* ROUND 828: A FULL ROSTER STARTS THE SAME SHAPE THE FIFTEEN DID. With the
   whole club on the books, "every healthy man in the group" stops meaning
   "the starters": nine linemen would all play, and a receiver fourth on his
   own chart would compete for a skill slot he never had. So on a club with
   rosterDepth 2 each group offers the units its first STARTER_SLOTS healthy
   men off the chart, which is exactly the shape the fifteen man bake ships
   (scripts/genFrontOfficeRoster.mjs SLOTS), and the units then do what they
   always did with them: QB1, the best five of the six skill men, the line,
   the best six defenders. A fit club therefore reads the same men at the
   same ratings as its fifteen man self, and the bench only plays when a
   starter is hurt or the GM promotes him on the chart. A five man line and
   real formations are a later round (the plan's FO-7); this one moves no
   result. A club without the flag reads every healthy man, as before. */
export const STARTER_SLOTS: Record<DepthPos, number> = { QB: 1, RB: 2, WR: 3, TE: 1, OL: 2, DL: 2, LB: 2, DB: 2 };
/** Round 828: the real active roster limit. Signing is refused at it; the offseason cuts down to it. */
export const DEEP_ROSTER_MAX = 53;
/* The size of each group a full club is refilled to every offseason: the
   median of the thirty two real active rosters the bake read (nflverse,
   2026 week 4), 51 in all. scripts/simNflFullRosters.mjs recomputes the
   medians off the data files and fails if these drift from them. */
export const DEEP_GROUP_TARGET: Record<DepthPos, number> = { QB: 3, RB: 4, WR: 6, TE: 4, OL: 9, DL: 7, LB: 8, DB: 10 };
/* The band a backup sits on, the generator's DEPTH_SCALE: under every
   starter, above REPLACEMENT_OVR. An invented depth man is drawn from it. */
export const DEPTH_BAND: Record<'OL' | 'other', [number, number]> = { OL: [75, 79], other: [61, 65] };

/** The men a group offers its unit: every healthy man, or on a full roster the first STARTER_SLOTS healthy men off the chart. */
function unitCandidates(team: GmTeamState, groups: DepthPos[]): GmPlayer[] {
  if (team.rosterDepth !== 2) return team.players.filter(p => p.out === 0 && groups.includes(p.pos));
  return groups.flatMap(g => depthOrder(team, g).filter(p => p.out === 0).slice(0, STARTER_SLOTS[g]));
}

/** A group's chart: the saved order, with any man it does not name slotted
    in by his rating. With nothing saved this is the order by rating the sim
    always used. */
export function depthOrder(team: GmTeamState, pos: DepthPos): GmPlayer[] {
  const group = team.players.filter(p => p.pos === pos);
  const byRating = [...group].sort((a, b) => b.ovr - a.ovr);
  const saved = team.depth?.[pos];
  if (!saved || saved.length === 0) return byRating;
  const byId = new Map(group.map(p => [p.id, p]));
  const out: GmPlayer[] = [];
  const seen = new Set<string>();
  for (const id of saved) {
    const p = byId.get(id);
    if (p && !seen.has(id)) { out.push(p); seen.add(id); }
  }
  /* A man the saved order does not name (signed, drafted or traded for since
     the GM last touched this group) goes in ahead of the first man rated
     below him. The first draft put him at the bottom whatever his rating, so
     a better newcomer sat and the signing added nothing until the GM found
     him on the chart. Taken best first, so two newcomers keep their order. */
  for (const p of byRating) {
    if (seen.has(p.id)) continue;
    const at = out.findIndex(q => q.ovr < p.ovr);
    if (at < 0) out.push(p); else out.splice(at, 0, p);
  }
  return out;
}

/* A saved order that reads exactly like the order by rating is dropped, so
   the group goes back to following the ratings: a swap and a swap back, or
   a season of development that lines the GM's order up with the ratings,
   leaves a chart the GM has handed back to the sim, and next season's
   development and newcomers then sort by rating like any untouched group. */
function settleDepth(team: GmTeamState, pos: DepthPos): void {
  const saved = team.depth?.[pos];
  if (!team.depth || !saved) return;
  const byRating = team.players.filter(p => p.pos === pos).sort((a, b) => b.ovr - a.ovr).map(p => p.id).join(',');
  if (depthOrder(team, pos).map(p => p.id).join(',') === byRating) delete team.depth[pos];
  if (Object.keys(team.depth).length === 0) delete team.depth;
}

/** True when the GM has set this group's order himself (the board says so). */
export function hasSavedDepth(team: GmTeamState, pos: DepthPos): boolean {
  return !!team.depth?.[pos]?.length;
}

/** The whole chart, every group in DEPTH_GROUPS order. */
export function depthChart(team: GmTeamState): Record<DepthPos, GmPlayer[]> {
  const out = {} as Record<DepthPos, GmPlayer[]>;
  for (const pos of DEPTH_GROUPS) out[pos] = depthOrder(team, pos);
  return out;
}

/** Write a group's order. Refuses unless the ids are exactly the group's men. */
export function setDepthOrder(team: GmTeamState, pos: DepthPos, ids: string[]): boolean {
  const group = team.players.filter(p => p.pos === pos).map(p => p.id).sort();
  const given = [...ids].sort();
  if (group.length !== given.length || group.some((id, i) => id !== given[i])) return false;
  team.depth = { ...(team.depth ?? {}), [pos]: [...ids] };
  settleDepth(team, pos);
  return true;
}

/** Hand a group back to the sim: its order by rating, nothing saved. */
export function resetDepth(team: GmTeamState, pos: DepthPos): void {
  if (!team.depth?.[pos]) return;
  delete team.depth[pos];
  if (Object.keys(team.depth).length === 0) delete team.depth;
}

/** Swap two men in a group's order. The board's tap to swap. */
export function swapDepth(team: GmTeamState, pos: DepthPos, idA: string, idB: string): boolean {
  const ids = depthOrder(team, pos).map(p => p.id);
  const a = ids.indexOf(idA), b = ids.indexOf(idB);
  if (a < 0 || b < 0 || a === b) return false;
  [ids[a], ids[b]] = [ids[b], ids[a]];
  return setDepthOrder(team, pos, ids);
}

/** The healthy men a unit starts: slots shared out by rating, filled by chart order. */
export function unitStarters(team: GmTeamState, groups: DepthPos[], slots: number): GmPlayer[] {
  const pool = unitCandidates(team, groups);
  const top = [...pool].sort((a, b) => b.ovr - a.ovr).slice(0, slots);
  const out: GmPlayer[] = [];
  for (const g of groups) {
    const share = top.filter(p => p.pos === g).length;
    if (share === 0) continue;
    const order = depthOrder(team, g);
    out.push(...order.filter(p => p.out === 0).slice(0, share));
  }
  return out;
}

/** Every man the sim counts as a starter right now, for the chart screen's badges. */
export function starterIds(team: GmTeamState): Set<string> {
  return new Set([
    ...unitStarters(team, ['QB'], 1),
    ...unitStarters(team, SKILL_POS, SKILL_SLOTS),
    ...unitStarters(team, ['OL'], OL_SLOTS),
    ...unitStarters(team, DEF_POS, DEF_SLOTS),
  ].map(p => p.id));
}

/** Team strength: QB 30, skill 30, OL 12, DEF 28, read off the depth chart (injured players excluded). */
export function teamStrength(team: GmTeamState): number {
  const [qb1] = unitStarters(team, ['QB'], 1);
  const qb = Math.max(64, qb1 ? qb1.ovr : 0);
  const skill = unitStarters(team, SKILL_POS, SKILL_SLOTS);
  const skillAvg = skill.length ? skill.reduce((s, p) => s + p.ovr, 0) / skill.length : 64;
  const ol = unitStarters(team, ['OL'], OL_SLOTS);
  const olAvg = ol.length ? ol.reduce((s, p) => s + p.ovr, 0) / ol.length : 64;
  return qb * 0.30 + skillAvg * 0.30 + olAvg * 0.12 + defenceRating(team) * 0.28;
}

// ---------------------------------------------------------------------------
// Schedule: 6 divisional games (home and away vs each rival) + 11 crossover
// games rotated deterministically. Every team plays exactly 17.
// ---------------------------------------------------------------------------

export function divisionOf(abbr: string): string {
  return FO_TEAM_MAP.get(abbr)!.division;
}

/* ROUND 419: EVERY CLUB PLAYS SEVENTEEN GAMES, and until now most seasons had
   one that did not. The shape was documented and believed: six divisional
   games home and away against three rivals, plus eleven crossover games,
   seventeen in all for all thirty two clubs. Measured over 3,000 built
   schedules it delivered that 10.6 percent of the time. In the other 89.4
   percent a club came up short, as low as NINE games, because the crossover
   pairing walked a greedy loop and gave up the moment one club was left
   needing partners nobody could legally supply. Standings sort on wins, so a
   club with eight fewer chances to win is not cosmetic: it cannot reach the
   playoffs, and the mandate ownership grades it against assumes it can. The
   same pass also placed a club in the same week twice 40.8 times a season on
   average, under a comment calling that rare and harmless. It was neither.

   GREEDY CANNOT DO THIS, WHICH IS WHY IT IS NOT GREEDY ANY MORE. Fixing the
   old loop to serve the hungriest club first still only completed the pairing
   17 times in 300, and fitting the result into seventeen weeks with nobody
   playing twice then succeeded 0 times out of those 17. Seventeen weeks of
   sixteen games with all thirty two clubs busy every week is a perfect
   partition, and a greedy walk does not find one by trying harder.
   The league's own shape hands over a construction instead. Eight divisions
   of four is a round robin waiting to be used:
     THE SIX DIVISIONAL WEEKS. Four clubs playing home and away is a double
     round robin, exactly six rounds of two games, and all eight divisions run
     theirs at the same time. Six weeks, sixteen games each, everybody busy.
     THE ELEVEN CROSSOVER WEEKS. Round robin the eight DIVISIONS against each
     other: seven rounds, each pairing four divisions with four others. In a
     week where division X meets division Y their four clubs pair off, so
     every club plays exactly one non division opponent. That is seven weeks.
     For the remaining four, the same division pairings are used again with a
     DIFFERENT internal matching (club i meets club i+m rather than club i),
     so no two clubs ever meet twice.
   Seventeen weeks, sixteen games each, 272 in all, every club on seventeen
   and nobody scheduled twice in a week, by construction rather than by luck.
   The check at the bottom stays anyway and FAILS CLOSED: a game that will not
   start is a bug somebody fixes, a season where one club plays nine games is
   a bug nobody sees. */
const CROSSOVER_GAMES = 11;
const DIVISIONAL_GAMES = 6;
export const GAMES_PER_CLUB = CROSSOVER_GAMES + DIVISIONAL_GAMES;

/** Round robin pairings of n items, n even: n-1 rounds, the circle method. */
function circleRounds<T>(items: T[]): [T, T][][] {
  const n = items.length;
  const ring = items.slice(1);
  const rounds: [T, T][][] = [];
  for (let r = 0; r < n - 1; r += 1) {
    const round: [T, T][] = [[items[0], ring[r % ring.length]]];
    for (let i = 1; i < n / 2; i += 1) {
      const a = ring[(r + i) % ring.length];
      const b = ring[(r + ring.length - i) % ring.length];
      round.push([a, b]);
    }
    rounds.push(round);
    // rotate for the next round
  }
  return rounds;
}

export function buildSchedule(rng: () => number): GmGame[][] {
  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  /* clubs grouped by division, both orders shuffled so two seasons do not
     produce the same fixture list */
  const byDiv = new Map<string, string[]>();
  for (const t of FO_TEAMS) {
    byDiv.set(t.division, [...(byDiv.get(t.division) ?? []), t.abbr]);
  }
  const divisions = shuffle([...byDiv.keys()]);
  const clubs = new Map(divisions.map(d => [d, shuffle(byDiv.get(d)!)]));

  /* THE CONSTRUCTION ASSUMES THE LEAGUE'S SHAPE, so it says so out loud rather
     than quietly producing nonsense if a data refresh ever changes it. An even
     number of divisions, each the same even size, is what makes both round
     robins work. */
  const divSize = clubs.get(divisions[0])!.length;
  const shapeOk = divisions.length % 2 === 0
    && divSize % 2 === 0
    && divisions.every(d => clubs.get(d)!.length === divSize);
  if (!shapeOk) {
    throw new Error(
      `buildSchedule needs an even number of equal, even sized divisions and found `
      + `${divisions.length} divisions of ${divisions.map(d => clubs.get(d)!.length).join('/')}. `
      + 'Refusing to guess at a schedule for a league shape it was not built for.');
  }
  /* Each division pairing can be reused divSize times before two clubs would
     meet twice, because the internal matching only has that many offsets. */
  const maxCrossover = (divisions.length - 1) * divSize;
  if (CROSSOVER_GAMES > maxCrossover) {
    throw new Error(
      `buildSchedule was asked for ${CROSSOVER_GAMES} crossover games but this league shape `
      + `supports at most ${maxCrossover} before two clubs would have to meet twice.`);
  }

  const weeks: GmGame[][] = [];
  const add = (list: GmGame[], home: string, away: string) => {
    list.push({ week: weeks.length + 1, home, away, homeScore: 0, awayScore: 0, winner: '' });
  };

  /* six divisional weeks: a double round robin inside every division at once */
  for (const [ri, round] of circleRounds([0, 1, 2, 3]).entries()) {
    for (const back of [false, true]) {
      const w: GmGame[] = [];
      for (const d of divisions) {
        const m = clubs.get(d)!;
        for (const [i, j] of round) {
          if (back) add(w, m[j], m[i]);
          else add(w, m[i], m[j]);
        }
      }
      weeks.push(w);
      void ri;
    }
  }

  /* eleven crossover weeks: round robin the divisions, then repeat four of
     those weeks with a different internal matching */
  const divRounds = circleRounds(divisions);
  for (let r = 0; r < CROSSOVER_GAMES; r += 1) {
    const pairs = divRounds[r % divRounds.length];
    const matching = Math.floor(r / divRounds.length);
    const w: GmGame[] = [];
    for (const [x, y] of pairs) {
      const xs = clubs.get(x)!;
      const ys = clubs.get(y)!;
      for (let i = 0; i < xs.length; i += 1) {
        const j = (i + matching) % ys.length;
        /* alternate the host so neither division hosts everything */
        if ((r + i) % 2 === 0) add(w, xs[i], ys[j]);
        else add(w, ys[j], xs[i]);
      }
    }
    weeks.push(w);
  }

  /* the promise, checked before it ships rather than assumed */
  const played = new Map(FO_TEAMS.map(t => [t.abbr, 0]));
  for (const w of weeks) {
    const here = new Set<string>();
    for (const g of w) {
      if (here.has(g.home) || here.has(g.away)) {
        throw new Error(`buildSchedule put a club in week ${g.week} twice, which the season is not allowed to do.`);
      }
      here.add(g.home);
      here.add(g.away);
      played.set(g.home, played.get(g.home)! + 1);
      played.set(g.away, played.get(g.away)! + 1);
    }
  }
  const short = [...played.entries()].filter(([, n]) => n !== GAMES_PER_CLUB);
  if (short.length || weeks.length !== REGULAR_WEEKS) {
    throw new Error(
      `buildSchedule produced ${weeks.length} weeks and left ${short.length} club(s) off ${GAMES_PER_CLUB} games `
      + `(${short.map(([a, n]) => `${a} ${n}`).join(', ')}). Refusing to return a season where somebody plays fewer `
      + 'games than the rest, which is what shipped before Round 419.');
  }
  return weeks;
}

// ---------------------------------------------------------------------------
// Game sim
// ---------------------------------------------------------------------------

export function winProb(home: GmTeamState, away: GmTeamState): number {
  const gap = teamStrength(home) - teamStrength(away) + 2;
  return 1 / (1 + Math.pow(10, -gap / 14));
}

export function simGame(g: GmGame, teams: Record<string, GmTeamState>, rng: () => number): GmGame {
  const home = teams[g.home], away = teams[g.away];
  const p = winProb(home, away);
  const homeWins = rng() < p;
  const base = 16 + Math.floor(rng() * 15);
  const margin = 1 + Math.floor(rng() * 17);
  const hs = homeWins ? base + margin : base;
  const as = homeWins ? base : base + margin;
  const done: GmGame = { ...g, homeScore: hs, awayScore: as, winner: homeWins ? g.home : g.away };
  const loser = homeWins ? away : home;
  const winner = homeWins ? home : away;
  winner.wins += 1;
  loser.losses += 1;
  return done;
}

/** Weekly injury pass: small chance a starter goes down 1-4 weeks. */
export function injuryPass(teams: Record<string, GmTeamState>, rng: () => number): { team: string; player: string; weeks: number }[] {
  const news: { team: string; player: string; weeks: number }[] = [];
  for (const t of Object.values(teams)) {
    for (const p of t.players) {
      if (p.out > 0) { p.out -= 1; continue; }
      if (rng() < 0.012) {
        p.out = 1 + Math.floor(rng() * 4);
        news.push({ team: t.abbr, player: p.name, weeks: p.out });
      }
    }
  }
  return news;
}

// ---------------------------------------------------------------------------
// Standings and the real playoff format
// ---------------------------------------------------------------------------

export function conferenceOf(abbr: string): 'AFC' | 'NFC' {
  return divisionOf(abbr).startsWith('AFC') ? 'AFC' : 'NFC';
}

export function standings(teams: Record<string, GmTeamState>): GmTeamState[] {
  return Object.values(teams).sort(
    (a, b) => b.wins - a.wins || a.losses - b.losses || teamStrength(b) - teamStrength(a),
  );
}

/** Real format: 4 division winners seeded 1-4 by record, plus 3 wildcards. */
export function conferenceSeeds(teams: Record<string, GmTeamState>, conf: 'AFC' | 'NFC'): string[] {
  const confTeams = standings(teams).filter(t => conferenceOf(t.abbr) === conf);
  const divisions = new Map<string, GmTeamState>();
  for (const t of confTeams) {
    const d = divisionOf(t.abbr);
    if (!divisions.has(d)) divisions.set(d, t);
  }
  const winners = [...divisions.values()].sort((a, b) => b.wins - a.wins || a.losses - b.losses);
  const winnerSet = new Set(winners.map(t => t.abbr));
  const wildcards = confTeams.filter(t => !winnerSet.has(t.abbr)).slice(0, 3);
  return [...winners, ...wildcards].map(t => t.abbr);
}

export interface PlayoffRound {
  name: string;
  games: GmGame[];
}

/**
 * Runs the full 14-team bracket: wildcard (2v7 3v6 4v5 per conference, 1
 * seeds bye), divisional (1 vs lowest remaining), championship, Super Bowl.
 */
export function runPlayoffs(
  teams: Record<string, GmTeamState>,
  rng: () => number,
): { rounds: PlayoffRound[]; champion: string } {
  const rounds: PlayoffRound[] = [];
  const bracket: Record<'AFC' | 'NFC', string[]> = {
    AFC: conferenceSeeds(teams, 'AFC'),
    NFC: conferenceSeeds(teams, 'NFC'),
  };
  const seedOf: Record<string, number> = {};
  (['AFC', 'NFC'] as const).forEach(conf => bracket[conf].forEach((t, i) => { seedOf[t] = i + 1; }));

  const playRound = (name: string, pairs: [string, string][]): string[] => {
    const games = pairs.map(([h, a]) => simGame({ week: 0, home: h, away: a, homeScore: 0, awayScore: 0, winner: '' }, teams, rng));
    // playoff games should not count toward regular season records
    for (const g of games) {
      teams[g.winner].wins -= 1;
      teams[g.winner === g.home ? g.away : g.home].losses -= 1;
    }
    rounds.push({ name, games });
    return games.map(g => g.winner);
  };

  const alive: Record<'AFC' | 'NFC', string[]> = { AFC: [], NFC: [] };
  for (const conf of ['AFC', 'NFC'] as const) {
    const s = bracket[conf];
    const winners = playRound(`${conf} Wild Card`, [[s[1], s[6]], [s[2], s[5]], [s[3], s[4]]]);
    alive[conf] = [s[0], ...winners].sort((a, b) => seedOf[a] - seedOf[b]);
  }
  for (const conf of ['AFC', 'NFC'] as const) {
    const s = alive[conf];
    const winners = playRound(`${conf} Divisional`, [[s[0], s[3]], [s[1], s[2]]]);
    alive[conf] = winners.sort((a, b) => seedOf[a] - seedOf[b]);
  }
  const finalists: string[] = [];
  for (const conf of ['AFC', 'NFC'] as const) {
    const [w] = playRound(`${conf} Championship`, [[alive[conf][0], alive[conf][1]]]);
    finalists.push(w);
  }
  const [champion] = playRound('Super Bowl', [[finalists[0], finalists[1]]]);
  return { rounds, champion };
}

// ---------------------------------------------------------------------------
// GM moves
// ---------------------------------------------------------------------------

/* Round 631: A CUT IS NOT FREE. Until this round a release dropped the man
   and his whole salary in one move, and signPlayer would take him straight
   back out of the pool on a one year deal, so a cut was full cap relief for
   nothing and a cut plus re-sign was a free contract reset. Measured on the
   shipped engine: Trey McBride, 23.7M with three years left, cap room 190.4
   to 214.1 on the cut and back to 190.4 on the re-sign, his deal now one
   year. The rule (half his salary as dead money now, a quarter next season
   if he had years left, no way back for this team until the offseason) lives
   in src/lib/frontOfficeCuts.ts, once, for all four GM sims. Nothing else
   about the cut changed: he joins the pool on one year, and the floor of six
   stays. runOffseason rolls the ledger through rollDeadCap. */
/** Round 631: the fewest men a club may carry. The board greys Cut at it. The NFL sign path has no ceiling. */
export const NFL_ROSTER_MIN = 6;

export function releasePlayer(team: GmTeamState, freeAgents: GmPlayer[], playerId: string): boolean {
  const done = cutPlayer(team, freeAgents, playerId, NFL_ROSTER_MIN);
  /* Round 723: the guarantee was this club's promise and it has just been
     paid as dead money. In the pool he is an ordinary man on one year. */
  if (done) {
    const fa = freeAgents.find(p => p.id === playerId);
    if (fa) clearTag(fa);
  }
  return done;
}

export function signPlayer(team: GmTeamState, freeAgents: GmPlayer[], playerId: string, cap: number): boolean {
  const idx = freeAgents.findIndex(p => p.id === playerId);
  if (idx < 0) return false;
  /* Round 631: the same refusal the board shows beside the greyed button. */
  if (signRefusal(team, playerId)) return false;
  /* Round 828: a full roster holds 53. A fifteen man club has no ceiling, as before. */
  if (deepRosterRefusal(team)) return false;
  const p = freeAgents[idx];
  if (capRoom(team, cap) < p.salary) return false;
  freeAgents.splice(idx, 1);
  team.players.push(p);
  return true;
}

/** Round 828: why a full roster cannot add a man right now, or null. Always null on a fifteen man club. */
export function deepRosterRefusal(team: GmTeamState): string | null {
  if (team.rosterDepth !== 2) return null;
  return rosterFullRefusal(team, DEEP_ROSTER_MAX);
}

/* Round 828: THE PRACTICE SQUAD. Real men off the active roster and off the
   cap. This round lets the GM call one up when there is room, and the
   offseason calls them up first when a group runs short, before it invents
   anybody. Sending men down in season, the squad's own size rules and
   faster growth for young men on it are the development tier round's. */
export function promoteFromPractice(team: GmTeamState, playerId: string): boolean {
  if (team.rosterDepth !== 2 || !team.practice) return false;
  const idx = team.practice.findIndex(p => p.id === playerId);
  if (idx < 0 || deepRosterRefusal(team)) return false;
  const [p] = team.practice.splice(idx, 1);
  team.players.push(p);
  return true;
}

/* Round 828: the copy the Trade Finder probes on. proposeTrade only ever
   reassigns a club's players array and moves picks between the two picks
   arrays, so copying those two arrays is all a probe needs, and it is what
   keeps the finder quick with fifty men a club. scripts/simNflFullRosters.mjs
   checks it finds exactly the deep copy's offers and leaves the league as it
   found it. */
export function tradeProbeCopy(t: GmTeamState): GmTeamState {
  return { ...t, players: [...t.players], picks: [...t.picks] };
}

/** Trade evaluation: AI accepts when incoming value beats outgoing by margin. */
export function tradeValue(p: GmPlayer): number {
  const posW = p.pos === 'QB' ? 1.5 : 1;
  const ageW = Math.max(0.55, 1.25 - Math.max(0, p.age - 25) * 0.06);
  return p.ovr * posW * ageW;
}

export function proposeTrade(
  my: GmTeamState, their: GmTeamState, myPlayerId: string, theirPlayerId: string,
  sweetenerPick: boolean, cap: number,
): 'accepted' | 'rejected' | 'invalid' {
  const mine = my.players.find(p => p.id === myPlayerId);
  const theirs = their.players.find(p => p.id === theirPlayerId);
  if (!mine || !theirs || my.players.length <= 6 || their.players.length <= 6) return 'invalid';
  /* Round 631: nobody comes back the season he was cut, by trade either. */
  if (tradeRefusal(my, theirPlayerId) || tradeRefusal(their, myPlayerId)) return 'invalid';
  // Round 82: salary matching so cap-strapped teams can still swap contracts
  const fitsMe = capRoom(my, cap) + mine.salary >= theirs.salary || theirs.salary <= mine.salary * 1.5 + 5;
  const fitsThem = capRoom(their, cap) + theirs.salary >= mine.salary || mine.salary <= theirs.salary * 1.5 + 5;
  if (!fitsMe || !fitsThem) return 'invalid';
  const pickValue = sweetenerPick && my.picks.length > 0 ? 14 : 0;
  if (tradeValue(mine) + pickValue < tradeValue(theirs) * 1.08) return 'rejected';
  my.players = my.players.filter(p => p.id !== myPlayerId);
  their.players = their.players.filter(p => p.id !== theirPlayerId);
  my.players.push(theirs);
  their.players.push(mine);
  if (sweetenerPick && my.picks.length > 0) {
    their.picks.push(my.picks.pop()!);
    their.picks.sort();
  }
  return 'accepted';
}

/* Round 190: execute a deal the trade TALKS agreed. The negotiation
   already settled the value question (that is what the phone call was
   for), so this enforces only the hard rules, roster floor and salary
   matching, exactly proposeTrade's, and moves the agreed pick when the
   package includes one. An agreed 1.02 deal executes here where the old
   1.08 threshold would have hung up, which the harness pins. */
export function executeTalksTrade(
  my: GmTeamState, their: GmTeamState, myPlayerId: string, theirPlayerId: string,
  addPick: boolean, cap: number,
): 'done' | 'invalid' {
  const mine = my.players.find(p => p.id === myPlayerId);
  const theirs = their.players.find(p => p.id === theirPlayerId);
  if (!mine || !theirs || my.players.length <= 6 || their.players.length <= 6) return 'invalid';
  /* Round 631: nobody comes back the season he was cut, by trade either. */
  if (tradeRefusal(my, theirPlayerId) || tradeRefusal(their, myPlayerId)) return 'invalid';
  if (addPick && my.picks.length === 0) return 'invalid';
  const fitsMe = capRoom(my, cap) + mine.salary >= theirs.salary || theirs.salary <= mine.salary * 1.5 + 5;
  const fitsThem = capRoom(their, cap) + theirs.salary >= mine.salary || mine.salary <= theirs.salary * 1.5 + 5;
  if (!fitsMe || !fitsThem) return 'invalid';
  my.players = my.players.filter(p => p.id !== myPlayerId);
  their.players = their.players.filter(p => p.id !== theirPlayerId);
  my.players.push(theirs);
  their.players.push(mine);
  if (addPick) {
    their.picks.push(my.picks.pop()!);
    their.picks.sort();
  }
  return 'done';
}

// ---------------------------------------------------------------------------
// Draft (fictional prospects, clearly generated)
// ---------------------------------------------------------------------------

/* Round 211: widened from 20x20 to 34x34. Four hundred possible people
   still put the same man in a new league's free agent pool twice in six of
   thirty measured leagues. Every pairing is enumerated against the
   real-name wall by simInventedNames on each suite run. */
const FIRST = [
  'Jalen', 'Marcus', 'Tyrese', 'Caden', 'DeShawn', 'Malik', 'Brock', 'Xavier', 'Trey', 'Jaxon',
  'Amari', 'Kai', 'Darius', 'Cooper', 'Zion', 'Roman', 'Elijah', 'Nico', 'Grant', 'Omar',
  'Bo', 'Cade', 'Deion', 'Ezra', 'Finn', 'Hollis', 'Isaiah', 'Jamari', 'Keegan', 'Lincoln',
  'Maddox', 'Nash', 'Quincy', 'Rashad',
];
const LAST = [
  'Whitfield', 'Calloway', 'Bridgewater', 'Sterling', 'Maddox', 'Rourke', 'Delacroix', 'Okafor', 'Vandermeer', 'Holloway',
  /* Round 416: Redmond left the bank. The roster bake added the real 2026
     squads, one of whom is Jalen Redmond, and Jalen is in the first name
     list, so the draft class generator could hand a fictional prospect a
     real man's name. simInventedNames caught it the first time it ran
     against the new file, which is what it is for. */
  'Kingsley', 'Beaumont', 'Ashford', 'Winslow', 'Marchetti', 'Duvall', 'Slater', 'Ellingsworth', 'Crowder', 'Bishop',
  'Ravensworth', 'Sutcliffe', 'Thackery', 'Underhill', 'Valentine', 'Wexford', 'Yarborough', 'Zimmerman', 'Aldridge', 'Braddock',
  'Chesterton', 'Draycott', 'Eastmond', 'Fenwick',
];

/**
 * Round 211: a name nobody in this league already has.
 *
 * The `taken` book is optional so the harnesses and any caller that only
 * wants a plausible string still work, but every caller inside the engine
 * passes one, because a free agent who shares a name with a man on a
 * roster is the same bug as two free agents sharing one.
 */
export function prospectName(rng: () => number, taken?: Set<string>): string {
  if (taken) return uniqueName(rng, FIRST, LAST, taken);
  return `${FIRST[Math.floor(rng() * FIRST.length)]} ${LAST[Math.floor(rng() * LAST.length)]}`;
}

export function generateDraftClass(rng: () => number, size = 40, taken: Set<string> = new Set()): Prospect[] {
  /* Round 418: a defensive pick arrives as a person. It used to be one 'DEF'
     entry that added a point or two to the team's defence number and never
     got a position, so the board announced a name you could not look at
     afterwards. Defenders are drafted at their actual position now, in the
     shape the roster carries (two each of DL, LB and DB against one QB). */
  const POS: Prospect['pos'][] = ['QB', 'RB', 'WR', 'WR', 'TE', 'OL', 'OL', 'DL', 'DL', 'LB', 'LB', 'DB', 'DB'];
  const out: Prospect[] = [];
  for (let i = 0; i < size; i++) {
    const pos = POS[Math.floor(rng() * POS.length)];
    const trueOvr = 66 + Math.floor(rng() * 22); // 66-87
    const noise = Math.floor(rng() * 9) - 4;     // scouting error -4..+4
    out.push({
      id: freshId(),
      name: prospectName(rng, taken),
      pos,
      age: 21 + Math.floor(rng() * 3),
      grade: Math.max(62, Math.min(92, trueOvr + noise)),
      trueOvr,
    });
  }
  return out.sort((a, b) => b.grade - a.grade);
}

/** Reverse standings draft order (worst record first). */
export function draftOrder(teams: Record<string, GmTeamState>): string[] {
  return standings(teams).map(t => t.abbr).reverse();
}

export function prospectToPlayer(pr: Prospect, rng: () => number): GmPlayer | null {
  /* Round 418: nothing is refused any more. A pre 418 save can still hold a
     'DEF' prospect in its stored draft class, so that one value is turned
     into a real position rather than dropped on the floor, which is what
     used to happen to every defensive pick. */
  if (pr.pos === 'DEF') {
    const spread = DEF_POS[Math.floor(rng() * DEF_POS.length)];
    return prospectToPlayer({ ...pr, pos: spread }, rng);
  }
  const ovr = pr.trueOvr;
  return {
    id: freshId(),
    name: pr.name,
    pos: pr.pos,
    age: pr.age,
    ovr,
    salary: Math.max(1, Math.round((ovr - 60) * 0.35 * 10) / 10),
    years: 4,
    out: 0,
    pot: Math.min(97, ovr + 3 + Math.floor(rng() * 8)),
  };
}

// ---------------------------------------------------------------------------
// Round 723: the franchise tag
// ---------------------------------------------------------------------------

/* THE REAL RULE, in the CBA's words (Article 10, Section 2), as quoted by the
   Pro Football Hall of Fame's release on the 2020 designations, dated
   2020-03-16,
   https://www.profootballhof.com/news/2020-franchise-and-transition-players-named
   (read 2026-10-01). A second source for the same shape, from the CBA before
   it: the Buffalo Bills' explainer on the tag, dated 2014-02-18, which quotes
   the 2011 CBA's Article 10, Section 2 and calls the tag a one year, fully
   guaranteed contract at the average of the five largest prior year salaries
   at the position or 120 percent of his prior year salary, whichever is
   greater,
   https://www.buffalobills.com/news/a-closer-look-what-is-the-franchise-tag-12632897
   (read 2026-10-01). The Hall of Fame's quote: a club "can
   designate one 'franchise' player ... among its veteran free agents"; the
   exclusive tender is "the greater of (i) the average of the top five
   salaries at the player's position for the current year ... or (ii) the
   amount of the required tender for a 'non-exclusive' franchise player",
   and that non-exclusive tender is "a one year NFL Player Contract for (A)
   the average of the five largest Prior Year Salaries for players at the
   position ... or (B) 120% of his Prior Year Salary, whichever is greater".
   A tagged man is under contract for the year: he cannot leave in free
   agency. The tender is fully guaranteed once signed.

   WHAT THE SIM ENCODES. The exclusive shape, because the sim has the
   contracts to compute it: the mean of the five largest salaries at his
   position across the thirty two rosters this season, or 120 percent of his
   own salary, whichever is greater, on one fully guaranteed year, once per
   club per offseason, decided before free agency opens (the offseason step).
   A man tagged in two straight offseasons therefore costs at least 120
   percent of the first tag, because the first tag is his prior salary. The
   league's real non-exclusive number averages five years of tag history
   against five years of caps (the Cap Percentage Average); the sim has no
   such history and does not pretend to.

   WHAT IT DOES TO THE OFFSEASON. A tagged man never reaches the expiring
   branch: he keeps his tag salary for one more year and stays. Everyone
   else on his last year is read as before (role players walk half the
   time) with one addition: an untagged star walks now and then too, so the
   tag has something to protect and the pool reflects who was tagged. CPU
   clubs tag their best expiring starter rated TAG_CPU_MIN_OVR or better
   when the tender fits their room; scripts/simNflTagDepth.mjs measures the
   rate. */
export const TAG_TOP_N = 5;
export const TAG_PRIOR_MULT = 1.2;
/** The least a CPU club tags. Measured in the harness header. */
export const TAG_CPU_MIN_OVR = 80;
/** How often an untagged expiring star (76 plus) walks. Role players keep their coin flip. */
export const STAR_WALK_CHANCE = 0.15;

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** The mean of the five largest salaries at a position across the league's rosters this season. */
export function topFiveSalary(league: LeagueState, pos: DepthPos): number {
  const top = Object.values(league.teams)
    .flatMap(t => t.players.filter(p => p.pos === pos).map(p => p.salary))
    .sort((a, b) => b - a)
    .slice(0, TAG_TOP_N);
  return top.length ? round1(top.reduce((s, v) => s + v, 0) / top.length) : 0;
}

/** The tender: the top five mean at his position or 120 percent of his salary, whichever is greater. */
export function franchiseTagSalary(league: LeagueState, p: Pick<GmPlayer, 'pos' | 'salary'>): number {
  return Math.max(topFiveSalary(league, p.pos), round1(p.salary * TAG_PRIOR_MULT));
}

/** The men whose deals end at this offseason. */
export function expiringPlayers(team: GmTeamState): GmPlayer[] {
  return team.players.filter(p => p.years <= 1).sort((a, b) => b.ovr - a.ovr);
}

/** Why this team cannot tag this man right now, or null. The board shows the sentence beside a greyed button. */
export function tagRefusal(league: LeagueState, team: GmTeamState, playerId: string): string | null {
  const p = team.players.find(x => x.id === playerId);
  if (!p) return 'He is not on your roster.';
  if (team.tagUsedFor === league.season + 1) return 'One tag per offseason, and yours is used.';
  if (p.years > 1) return `${p.name} has ${p.years} years left, so there is nothing to tag.`;
  const salary = franchiseTagSalary(league, p);
  const short = round1(salary - p.salary - capRoom(team, league.cap));
  if (short > 0) return `The tag would put you $${short}M over the cap.`;
  return null;
}

/** Tag him: one fully guaranteed year at the tender, the cap hit on the books now. */
export function applyFranchiseTag(league: LeagueState, team: GmTeamState, playerId: string): { ok: true; salary: number; prior: number; count: number } | { ok: false; reason: string } {
  const reason = tagRefusal(league, team, playerId);
  if (reason) return { ok: false, reason };
  const p = team.players.find(x => x.id === playerId)!;
  const prior = p.salary;
  const salary = franchiseTagSalary(league, p);
  /* Tagged for the season just played and tagged again: the second in a row. */
  const count = p.tagSeason === league.season ? (p.tagCount ?? 1) + 1 : 1;
  p.salary = salary;
  p.years = 1;
  p.tagSeason = league.season + 1;
  p.tagCount = count;
  p.guaranteed = true;
  team.tagUsedFor = league.season + 1;
  return { ok: true, salary, prior, count };
}

/** The tag year is over and he was not tagged again: an ordinary contract from here. */
function clearTag(p: GmPlayer): void {
  delete p.tagSeason;
  delete p.tagCount;
  delete p.guaranteed;
}

/** CPU clubs tag their best expiring starter when the tender fits, and only
    a man the tender is fair for: one of the five best at his position in the
    whole league (the men the top five mean is made of), rated
    TAG_CPU_MIN_OVR or better, and not tagged last spring. The first two
    drafts of this policy were measured in scripts/simNflTagDepth.mjs: "any
    expiring starter rated 80" had every club tagging every year by the third
    offseason (a tagged man is on one year, so he came up again and was
    tagged again), and dropping only the repeat still had 88 to 92 percent of
    clubs tagging. The top five rule lands at about a third of clubs an
    offseason, the band the harness holds. */
export function cpuFranchiseTags(league: LeagueState, userTeam?: string): { team: string; player: string; salary: number }[] {
  const out: { team: string; player: string; salary: number }[] = [];
  const everyone = Object.values(league.teams).flatMap(x => x.players);
  const betterAtHisPosition = (p: GmPlayer) => everyone.filter(q => q.pos === p.pos && q.ovr > p.ovr).length;
  for (const t of Object.values(league.teams)) {
    if (t.abbr === userTeam || t.tagUsedFor === league.season + 1) continue;
    const starters = starterIds(t);
    const cands = expiringPlayers(t).filter(p => starters.has(p.id) && p.ovr >= TAG_CPU_MIN_OVR
      && p.tagSeason !== league.season && betterAtHisPosition(p) < TAG_TOP_N);
    for (const p of cands) {
      const res = applyFranchiseTag(league, t, p.id);
      if (res.ok) { out.push({ team: t.abbr, player: p.name, salary: res.salary }); break; }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Offseason
// ---------------------------------------------------------------------------

export interface OffseasonNews {
  retired: { team: string; player: string }[];
  expired: { team: string; player: string }[];
  developed: { team: string; player: string; from: number; to: number }[];
  /** Round 723: the CPU clubs' franchise tags this offseason. */
  tagged: { team: string; player: string; salary: number }[];
  /** Round 828, full rosters only: called up off the practice squad to refill a group. */
  promoted?: { team: string; player: string; pos: string }[];
  /** Round 828, full rosters only: released in the cut to 53 (a real cut, dead money and all). */
  cutDown?: { team: string; player: string; pos: string }[];
}

/* Round 828: A DECLINE NEVER RAISES A MAN. The floor of 62 below was written
   when nobody on a roster sat under it, so "at least 62" only ever stopped a
   veteran falling too far. A real backup can sit at 61, and the same floor
   would have lifted him a point for getting older. Every man at 62 or above
   reads exactly as before. */
const declined = (ovr: number, by: number): number => Math.max(Math.min(62, ovr), ovr - by);

/* Round 723: userTeam is the club whose tag decision is the GM's own, so the
   CPU policy skips it. Callers without one (the harnesses) run it everywhere. */
export function runOffseason(league: LeagueState, rng: () => number, userTeam?: string): OffseasonNews {
  const news: OffseasonNews = { retired: [], expired: [], developed: [], tagged: [] };
  /* Round 723: the tags go on before free agency opens, which is this loop. */
  news.tagged = cpuFranchiseTags(league, userTeam);
  for (const t of Object.values(league.teams)) {
    const keep: GmPlayer[] = [];
    for (const p of t.players) {
      p.age += 1;
      p.out = 0;
      // development and decline
      if (p.age <= 25 && p.ovr < p.pot) {
        const from = p.ovr;
        p.ovr = Math.min(p.pot, p.ovr + 1 + Math.floor(rng() * 2));
        if (p.ovr - from >= 2) news.developed.push({ team: t.abbr, player: p.name, from, to: p.ovr });
      } else if (p.age >= 31) {
        p.ovr = declined(p.ovr, 1 + Math.floor(rng() * 2) + (p.age >= 34 ? 1 : 0));
      }
      // retirement
      if (p.age >= 34 && (p.ovr <= 70 || rng() < 0.3 || p.age >= 40)) {
        news.retired.push({ team: t.abbr, player: p.name });
        continue;
      }
      // contracts
      p.years -= 1;
      if (p.years <= 0) {
        /* Round 723: a tagged man is under contract for the coming season at
           the tender already on his line. He never reaches the pool. */
        if (p.tagSeason === league.season + 1) {
          p.years = 1;
          keep.push(p);
          continue;
        }
        clearTag(p);
        // AI teams re-sign their stars, let the rest walk; the user tags one man beforehand
        p.years = years0(p.age);
        p.salary = salaryFor(p.pos, p.ovr);
        /* Round 723: a star can walk too, now and then, unless he was tagged. */
        const walks = p.ovr < 76 ? rng() < 0.5 : rng() < STAR_WALK_CHANCE;
        if (walks) {
          news.expired.push({ team: t.abbr, player: p.name });
          league.freeAgents.push({ ...p, years: 1 });
          continue;
        }
      }
      keep.push(p);
    }
    t.players = keep;
    /* Round 828: the practice squad ages, grows and retires by the same
       rules. Its deals do not run out yet: the squad's own contract rules
       are the development tier round's. */
    if (t.practice) {
      const stay: GmPlayer[] = [];
      for (const p of t.practice) {
        p.age += 1;
        p.out = 0;
        if (p.age <= 25 && p.ovr < p.pot) p.ovr = Math.min(p.pot, p.ovr + 1 + Math.floor(rng() * 2));
        else if (p.age >= 31) p.ovr = declined(p.ovr, 1 + Math.floor(rng() * 2) + (p.age >= 34 ? 1 : 0));
        if (p.age >= 34 && (p.ovr <= 70 || rng() < 0.3 || p.age >= 40)) {
          news.retired.push({ team: t.abbr, player: p.name });
          continue;
        }
        stay.push(p);
      }
      t.practice = stay;
    }
    t.wins = 0;
    t.losses = 0;
    t.picks = [1, 2, 3];
    rollDeadCap(t);
    /* Round 723: a saved chart order forgets the men who have gone, and one
       that now reads like the order by rating is handed back to the sim. The
       field is only ever written where a GM has reordered something. */
    if (t.depth) {
      const live = new Set(t.players.map(p => p.id));
      for (const pos of DEPTH_GROUPS) {
        const ids = t.depth?.[pos];
        if (t.depth && ids) { t.depth[pos] = ids.filter(id => live.has(id)); settleDepth(t, pos); }
      }
    }
    /* Round 418: team.defense NO LONGER REACHES THE SIM AT ALL. An earlier
       draft of that round kept it as defenceRating's empty roster fallback,
       and that fallback was the exploit (cutting your whole defence dropped
       you onto a stored number that was an upgrade for 11 of the 32 clubs),
       so it was removed. The field and this drift are kept only because they
       sit inside every saved league in localStorage and removing them would
       be a save migration for a number nothing reads. Do not restore a code
       path to it without reading the note above defenceRating first. */
    t.defense = Math.round(Math.max(60, Math.min(95, t.defense + (77 - t.defense) * 0.2 + (rng() * 8 - 4))));
  }
  // trim the FA pool to the useful part
  league.freeAgents = league.freeAgents.sort((a, b) => b.ovr - a.ovr).slice(0, 40);
  for (const fa of league.freeAgents) { fa.age += 1; fa.ovr = fa.age >= 31 ? declined(fa.ovr, 1) : fa.ovr; }
  /* Round 828: a full club refills from its own practice squad first and cuts
     down to 53 last. A fifteen man club goes through the old pass untouched. */
  const deep = Object.values(league.teams).filter(t => t.rosterDepth === 2);
  if (deep.length) {
    news.promoted = [];
    news.cutDown = [];
    const taken = leagueNames(league);
    for (const t of deep) {
      news.promoted.push(...refillDeepRoster(t, taken, rng));
      news.cutDown.push(...cutDownToMax(t, league.freeAgents));
    }
  }
  replenishRosters(league, rng);
  league.cap = Math.round(league.cap * 1.05);
  league.season += 1;
  league.week = 1;
  league.schedule = buildSchedule(rng);
  return news;
}

/**
 * Every club fills out to a playable roster after churn: at least one QB,
 * two OL, two each of DL, LB and DB, and fifteen players total, which is the
 * shape the roster file ships. Depth arrives as clearly generated journeymen
 * (same fictional-name pool as the draft).
 */
export function replenishRosters(league: LeagueState, rng: () => number): void {
  /* Round 211: one name book for the whole replenishment pass. */
  const taken = leagueNames(league);
  for (const t of Object.values(league.teams)) {
    /* Round 828: a full club was refilled by refillDeepRoster already. */
    if (t.rosterDepth === 2) continue;
    const addDepth = (pos: GmPlayer['pos']) => {
      const ovr = 66 + Math.floor(rng() * 8);
      t.players.push({
        id: freshId(),
        name: prospectName(rng, taken),
        pos,
        age: 24 + Math.floor(rng() * 8),
        ovr,
        salary: salaryFor(pos, ovr),
        years: 1 + Math.floor(rng() * 2),
        out: 0,
        pot: ovr,
      });
    };
    /* Round 416: the defence has to be replenished too, or it drains away.
       The roster ships with six defenders per club now, and this pass only
       ever guaranteed a quarterback and two linemen and then filled to nine
       off an offence-only cycle. Left alone, every defender a club released,
       traded or retired was replaced by a receiver, so after enough seasons
       a save quietly reverts to the offence-only roster this round set out
       to end, and the Trade Finder would have nothing defensive left to
       show. The floor and the cycle now match the shape the data file
       actually ships (QB 1, RB 2, WR 3, TE 1, OL 2, DL 2, LB 2, DB 2). */
    if (!t.players.some(p => p.pos === 'QB')) addDepth('QB');
    while (t.players.filter(p => p.pos === 'OL').length < 2) addDepth('OL');
    for (const d of ['DL', 'LB', 'DB'] as GmPlayer['pos'][]) {
      while (t.players.filter(p => p.pos === d).length < 2) addDepth(d);
    }
    const CYCLE: GmPlayer['pos'][] = ['WR', 'RB', 'DB', 'TE', 'LB', 'WR', 'DL', 'OL'];
    let i = 0;
    while (t.players.length < 15) addDepth(CYCLE[i++ % CYCLE.length]);
  }
}

/* Round 828: A FULL CLUB REFILLS FROM ITS OWN PEOPLE FIRST. Every group
   short of DEEP_GROUP_TARGET calls up its best practice squad man at that
   position, and only when the squad has nobody left there does the club
   sign a generated depth man, drawn from the backup band (DEPTH_BAND) and
   the same name bank as the draft, so an invented man never outrates the
   real bench. Groups are walked in DEPTH_GROUPS order so the draws are
   repeatable for a seed. */
export function refillDeepRoster(t: GmTeamState, taken: Set<string>, rng: () => number): { team: string; player: string; pos: string }[] {
  const promoted: { team: string; player: string; pos: string }[] = [];
  for (const g of DEPTH_GROUPS) {
    let have = t.players.filter(p => p.pos === g).length;
    /* a club already at 53 fills only what it needs to start */
    while (have < DEEP_GROUP_TARGET[g] && (t.players.length < DEEP_ROSTER_MAX || have < STARTER_SLOTS[g])) {
      const up = (t.practice ?? []).filter(p => p.pos === g).sort((a, b) => b.ovr - a.ovr)[0];
      if (up) {
        t.practice = (t.practice ?? []).filter(p => p.id !== up.id);
        t.players.push(up);
        promoted.push({ team: t.abbr, player: up.name, pos: g });
      } else {
        const [lo, hi] = g === 'OL' ? DEPTH_BAND.OL : DEPTH_BAND.other;
        const ovr = lo + Math.floor(rng() * (hi - lo + 1));
        t.players.push({
          id: freshId(),
          name: prospectName(rng, taken),
          pos: g,
          age: 24 + Math.floor(rng() * 8),
          ovr,
          salary: salaryFor(g, ovr),
          years: 1 + Math.floor(rng() * 2),
          out: 0,
          pot: ovr,
        });
      }
      have += 1;
    }
  }
  return promoted;
}

/* Round 828: THE CUT DOWN TO 53. A full club over DEEP_ROSTER_MAX after the
   draft releases its lowest rated men who do not start until it is at 53.
   It is a real cut, through cutPlayer like every other: the man goes to the
   pool, half his salary stays on the cap as dead money, and he cannot come
   back this season (simFrontOfficeCuts section 7 holds every engine to that,
   so a quiet move to the practice squad, which would free his salary for
   nothing, is not on offer). A guaranteed deal is never the one released,
   and a group carrying more than its share gives a man up before a thin one
   loses any. A starter is never released. */
export function cutDownToMax(t: GmTeamState, freeAgents: GmPlayer[]): { team: string; player: string; pos: string }[] {
  const out: { team: string; player: string; pos: string }[] = [];
  if (t.rosterDepth !== 2) return out;
  while (t.players.length > DEEP_ROSTER_MAX) {
    const roster = [...t.players];
    const starting = starterIds(t);
    const count = (pos: DepthPos) => roster.reduce((n, q) => n + (q.pos === pos ? 1 : 0), 0);
    const spare = roster.filter(p => !starting.has(p.id) && !p.guaranteed);
    const crowded = spare.filter(p => count(p.pos) > DEEP_GROUP_TARGET[p.pos]);
    const down = (crowded.length ? crowded : spare)
      .sort((a, b) => a.ovr - b.ovr || b.age - a.age || a.name.localeCompare(b.name))[0];
    if (!down || !cutPlayer(t, freeAgents, down.id, NFL_ROSTER_MIN)) break;
    const saved = t.depth?.[down.pos];
    if (t.depth && saved) { t.depth[down.pos] = saved.filter(id => id !== down.id); settleDepth(t, down.pos); }
    out.push({ team: t.abbr, player: down.name, pos: down.pos });
  }
  return out;
}

function years0(age: number): number {
  if (age <= 25) return 4;
  if (age <= 28) return 3;
  if (age <= 31) return 2;
  return 1;
}

/** AI teams take sensible weekly actions: sign a FA upgrade if cap allows. */
export function aiWeeklyMoves(league: LeagueState, userTeam: string, rng: () => number): string[] {
  const log: string[] = [];
  for (const t of Object.values(league.teams)) {
    if (t.abbr === userTeam) continue;
    if (rng() > 0.15) continue;
    const room = capRoom(t, league.cap);
    const target = league.freeAgents
      .filter(p => p.salary <= room)
      .sort((a, b) => b.ovr - a.ovr)[0];
    if (!target) continue;
    /* Round 828: on a full roster the man to beat is the worst STARTER at his
       position, as he was when the starters were the whole group. Measured
       against the bench every free agent would beat somebody, and the CPU
       would sign until the cap ran out. A full club at 53 signs nobody. */
    if (deepRosterRefusal(t)) continue;
    const worstSamePos = (t.rosterDepth === 2
      ? depthOrder(t, target.pos).slice(0, STARTER_SLOTS[target.pos])
      : t.players.filter(p => p.pos === target.pos)).sort((a, b) => a.ovr - b.ovr)[0];
    if (worstSamePos && worstSamePos.ovr + 2 < target.ovr) {
      signPlayer(t, league.freeAgents, target.id, league.cap);
      log.push(`${t.abbr} sign ${target.name} (${target.pos} ${target.ovr})`);
    }
  }
  return log;
}
