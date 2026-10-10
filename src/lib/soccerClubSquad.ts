/**
 * Round 262: where you actually stand in your club's squad.
 *
 * Round 259 put real internationals on the national team sheet, which a
 * player sees every couple of summers. This is the one he lives with: the
 * squad he is in every single week, and the men standing between him and a
 * shirt. Until now the game answered the most important question of a season,
 * "why am I only getting eight games", with a projected range and no names.
 *
 * DISPLAY ONLY, DELIBERATELY. Nothing here feeds selection, minutes, ratings
 * or any other part of the simulation. The appearance model has been tuned
 * across dozens of rounds against measured outcomes and this round does not
 * touch it. What this does is SHOW the player the same thing the model is
 * already expressing, with real names on it, so a thin season stops feeling
 * arbitrary. If the two ever disagree the honest answer is that the depth
 * chart is a picture of the real squad and the projection is the game's, and
 * the card says which club and which season it is describing so nobody has to
 * guess.
 *
 * REAL OR NOT, NEVER PASSED OFF. `seasonSquad` and `depthChart` answer with
 * the real squad or with null, exactly as they always have: a club outside
 * the hand written map in clubSquads.ts, a season outside the baked window,
 * or a club whose data that year could not field a team all produce null,
 * and the lines that read them (the offer fit, the club's verdict) stay real
 * only.
 *
 * Round 1115 adds a second reader beside them, the LIVING squad, for the
 * Squad tile. It has three sources and the screen always says which:
 *   real      the baked squad, exactly as above, where one exists;
 *   roles     a real past season with no checked squad list: the squad is
 *             drawn by role only (position, age, rating), with NO names,
 *             because an invented name is never attached to a real club in
 *             a real past season;
 *   invented  from the summer after the last real season the world is the
 *             game's own: the club's last real squad carries on, each man
 *             until he leaves, and the men who replace them are invented
 *             and named from the fenced name families.
 * Still display only: nothing below is read by the simulation.
 */
import { CLUB_SQUADS, CLUB_DATA_NAME, CLUB_SQUAD_YEARS } from '@/data/clubSquads';
import type { CareerState } from './soccerCareerEngine';
import { projectLeagueApps } from './soccerCareerEngine';
import { phoneAppsSwing } from './soccerPhone';
import { recentClubForm, type RecentClubForm } from './soccerCareerSelection';
import { reducedRoleForSeason, reducedRoleSwing, type ReducedRolePlan } from './soccerCareerRole';
import { genClubSquad, roleName, ELEVEN_SHAPE } from './soccerClubSquadGen';

export type SquadGroup = 'GK' | 'DEF' | 'MID' | 'ATT';

export interface SquadMan {
  name: string;
  pos: string;
  ovr: number;
  group: SquadGroup;
  /** True for the one row that is the player himself. */
  me?: boolean;
  /* Round 1115: invented men only. A real man never has any of these. */
  /** "<slot>:<run>", the same for as long as he is at the club. */
  id?: string;
  age?: number;
  nation?: string;
  /** The season start year of the summer he arrived. */
  since?: number;
  /** Set on a sheet drawn by role only, where `name` holds the role too. */
  role?: string;
}

const GROUP_OF: Record<string, SquadGroup> = {
  GK: 'GK',
  CB: 'DEF', LB: 'DEF', RB: 'DEF',
  CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'MID', RM: 'MID',
  LW: 'ATT', RW: 'ATT', ST: 'ATT', CF: 'ATT',
};

export function groupOf(pos: string): SquadGroup {
  return GROUP_OF[pos] ?? 'MID';
}

const cache = new Map<string, SquadMan[] | null>();

/**
 * One baked row, best first, or null when we have no honest answer. Never
 * throws and never invents. `year` is the row's own key, which is the year
 * its season ENDED in (see seasonSquad): callers that hold a season use
 * seasonSquad, and only the checks that walk the baked rows call this.
 */
export function clubSquad(club: string, year: number): SquadMan[] | null {
  if (!club || !Number.isFinite(year)) return null;
  if (year < CLUB_SQUAD_YEARS.first || year > CLUB_SQUAD_YEARS.last) return null;
  const dataName = CLUB_DATA_NAME[club];
  if (!dataName) return null;
  const key = `${dataName}|${year}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  const blob = CLUB_SQUADS[key];
  if (!blob) { cache.set(key, null); return null; }
  const men: SquadMan[] = [];
  for (const entry of blob.split(',')) {
    const [name, pos, ovr] = entry.split(':');
    if (!name || !pos || !ovr) continue;
    men.push({ name, pos, ovr: Number(ovr), group: groupOf(pos) });
  }
  men.sort((a, b) => b.ovr - a.ovr || a.name.localeCompare(b.name));
  const value = men.length ? men : null;
  cache.set(key, value);
  return value;
}

/**
 * WHICH ROW IS A SEASON. The rows in clubSquads.ts are keyed by the calendar
 * year a season ends in: "Manchester City|2023" is the squad of 2022/23 (the
 * striker who signed in the summer of 2022 is in it and is not in the 2022
 * row), and "Real Madrid|2025" is 2024/25. The game counts a season by the
 * year it STARTS in, so a season reads the row one year on. Until the review
 * of Round 1115 the rows were read with no step, and every real squad was
 * shown under the label of the season after its own.
 */
export const SEASON_TO_KEY = 1;

/** The seasons, by the year they start in, a real squad can exist for. */
export function realSeasons(): { first: number; last: number } {
  return { first: CLUB_SQUAD_YEARS.first - SEASON_TO_KEY, last: CLUB_SQUAD_YEARS.last - SEASON_TO_KEY };
}

/** The real squad a club had in the season that starts in `startYear`, or null. */
export function seasonSquad(club: string, startYear: number): SquadMan[] | null {
  return Number.isFinite(startYear) ? clubSquad(club, startYear + SEASON_TO_KEY) : null;
}

export interface DepthChart {
  club: string;
  year: number;
  /** The player's position group, which is the queue he is actually in. */
  group: SquadGroup;
  /** That group, best first, with the player inserted at his rating. */
  men: SquadMan[];
  /** How many men in his group are rated above him. 0 means he is first choice. */
  ahead: number;
  /** The man directly above him, or null when nobody is. */
  aheadOfMe: SquadMan | null;
  /** Everyone at the club, best first, for the full squad view. */
  squad: SquadMan[];
}

/**
 * Where the player sits in his own position queue at his club in the season
 * that starts in `year`.
 *
 * Ties go to the REAL player, not to the user: a man already at the club who
 * rates the same as you is ahead of you, because he is the one in the team.
 * That is the pessimistic reading and it is the right one for a card whose
 * job is to explain why the minutes are thin.
 */
export function depthChart(
  club: string, year: number, position: string, myOverall: number, myName: string,
): DepthChart | null {
  const squad = seasonSquad(club, year);
  return squad ? chartFrom(squad, club, year, position, myOverall, myName) : null;
}

/**
 * Round 1115: the same arithmetic over any squad. This is depthChart's own
 * body, moved unchanged, with the squad as the one new parameter, so the
 * living squad below is ranked by exactly the rule the real one always was.
 */
export function chartFrom(
  squad: SquadMan[], club: string, year: number, position: string, myOverall: number, myName: string,
): DepthChart | null {
  const group = groupOf(position);
  const rivals = squad.filter(m => m.group === group);
  if (!rivals.length) return null;
  const me: SquadMan = { name: myName, pos: position, ovr: Math.round(myOverall), group, me: true };
  const ahead = rivals.filter(m => m.ovr >= me.ovr).length;
  const men = [...rivals];
  men.splice(ahead, 0, me);
  return {
    club,
    year,
    group,
    men,
    ahead,
    aheadOfMe: ahead > 0 ? men[ahead - 1] : null,
    squad,
  };
}

/** Plain English for the group, for a card heading. */
export const GROUP_LABEL: Record<SquadGroup, string> = {
  GK: 'goalkeepers',
  DEF: 'defenders',
  MID: 'midfielders',
  ATT: 'forwards',
};

/* ─── Round 1115: the living squad ──────────────────────────────────────── */

export type SquadSource = 'real' | 'invented' | 'roles';

export interface SquadAt { club: string; country: string; tier: number; year: number }

export interface LivingSquad {
  club: string;
  year: number;
  source: SquadSource;
  /** Best first, the player not in it. */
  men: SquadMan[];
}

/** The manager's plan for his league games, read from the engine's own inputs. */
export interface Trust {
  /** Planned league games as a share of the 38. */
  pct: number;
  expected: number;
  band: { min: number; max: number };
  swing: number;
  form: RecentClubForm;
  role: ReducedRolePlan | null;
  roleSwing: -4 | 0;
  frozen: boolean;
  /** The engine's own line between a starter and cover: a plan of 20 or more. */
  inPlans: boolean;
  label: string;
}

export interface SquadView {
  club: string;
  year: number;
  source: SquadSource;
  /** How many men of the club's last real squad are still here (invented squads only). */
  carried: number;
  group: SquadGroup;
  /** His own line, best first, with him in it. */
  queue: SquadMan[];
  rank: number;
  groupSize: number;
  /** Where RATING alone puts him. Who actually plays is the plan: trust.inPlans. */
  inElevenOnRating: boolean;
  aheadOfMe: SquadMan | null;
  /** The last man of his line inside the eleven on rating, when he is outside it. */
  keepsMeOut: SquadMan | null;
  eleven: Record<SquadGroup, SquadMan[]>;
  bench: SquadMan[];
  /** Men in HIS line who arrived this summer. Never a real man. */
  arrivals: SquadMan[];
  trust: Trust;
}

/**
 * What the invented men are keyed to: facts every save has always held and
 * nothing rewrites. Not the nation: one life event changes it mid career,
 * and that summer every teammate at every club would have been replaced.
 */
export function squadSaveKey(c: CareerState): string {
  const first = c.seasons[0];
  return [c.playerName, c.position, first?.year, first?.club].join('|');
}

/** His club and the season he is about to play, or null when there is no
 *  squad to show: retired, or still in the academy he started at. */
export function squadNow(c: CareerState): SquadAt | null {
  if (c.retired) return null;
  const first = c.seasons[0];
  if (first && first.type === 'youth' && c.currentClub === first.club) return null;
  const last = c.seasons[c.seasons.length - 1];
  /* the season he is about to play starts the year after his last row */
  const comingYear = (last?.year ?? 0) + 1;
  return { club: c.currentClub, country: c.currentClubCountry, tier: c.currentClubTier, year: comingYear };
}

export function livingSquad(saveKey: string, at: SquadAt): LivingSquad | null {
  if (!at.club || !Number.isFinite(at.year) || !Number.isFinite(at.tier)) return null;
  const real = seasonSquad(at.club, at.year);
  if (real) return { club: at.club, year: at.year, source: 'real', men: real };
  const q = { saveKey, club: at.club, country: at.country ?? '', tier: at.tier, year: at.year };
  const lastReal = realSeasons().last;
  if (at.year > lastReal) {
    const last = seasonSquad(at.club, lastReal);
    const base = last ? { men: last, year: lastReal } : null;
    return { club: at.club, year: at.year, source: 'invented', men: genClubSquad({ ...q, base }) };
  }
  return { club: at.club, year: at.year, source: 'roles', men: genClubSquad({ ...q, named: false }) };
}

const clampN = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * The engine's own plan, without the dice: the band calcAppearances draws
 * from, the dressing room swing it adds, and the freeze it applies. Trust
 * reads the phone as it stands on the hub; the engine reads it after that
 * summer's texts arrive, which is why every sentence built on this says
 * "about".
 */
export function managerTrust(c: CareerState, at: SquadAt, myOverall: number = c.overall): Trust {
  const seasonsAtClub = c.seasons.filter(s => s.club === at.club && s.type === 'playing').length;
  const band = projectLeagueApps(myOverall, at.tier, at.club, seasonsAtClub);
  const swing = phoneAppsSwing(c);
  const form = recentClubForm(c, at.club, at.year);
  const role = reducedRoleForSeason(c, at.club, at.year);
  const roleSwing = reducedRoleSwing(c, at.club, at.year);
  const frozen = at.club === c.currentClub && (c.frozenOut ?? 0) > 0;
  let expected = clampN((band.min + band.max) / 2 + swing + form.swing + roleSwing, 0, 38);
  if (frozen) expected = Math.min(8, Math.round(expected * 0.25));
  const pct = Math.round((expected / 38) * 100);
  const label = frozen ? 'Frozen out'
    : pct >= 85 ? 'First name on the team sheet'
      : pct >= 70 ? 'Nailed on starter'
        : pct >= 55 ? 'Starter most weeks'
          : pct >= 38 ? 'In and out of the side'
            : 'Squad player';
  return { pct, expected, band, swing, form, role, roleSwing, frozen, inPlans: !frozen && band.min + roleSwing >= 20, label };
}

/* Left, centre, right inside a line, the way a team sheet reads. */
const SIDE: Record<string, number> = { LB: 0, LM: 0, LW: 0, RB: 2, RM: 2, RW: 2 };
const bySide = (men: SquadMan[]) => men
  .map((m, i) => ({ m, i }))
  .sort((a, b) => (SIDE[a.m.pos] ?? 1) - (SIDE[b.m.pos] ?? 1) || a.i - b.i)
  .map(x => x.m);

const GROUPS: SquadGroup[] = ['GK', 'DEF', 'MID', 'ATT'];

/**
 * His place in the squad for a season: by default the one he is about to
 * play. A caller that passes its own `at` (an offer, a past season) gets
 * that club and season instead.
 */
export function squadView(c: CareerState, at: SquadAt | null = squadNow(c), myOverall: number = c.overall): SquadView | null {
  if (!at) return null;
  const squad = livingSquad(squadSaveKey(c), at);
  if (!squad) return null;
  const men = squad.source === 'roles' ? rolesWithHim(squad.men, groupOf(c.position), myOverall) : squad.men;
  const chart = chartFrom(men, at.club, at.year, c.position, myOverall, c.playerName);
  if (!chart) return null;
  const me = chart.men[chart.ahead];
  const eleven = { GK: [], DEF: [], MID: [], ATT: [] } as Record<SquadGroup, SquadMan[]>;
  const picked = new Set<SquadMan>();
  for (const g of GROUPS) {
    const line = g === chart.group ? chart.men : men.filter(m => m.group === g);
    eleven[g] = bySide(line.slice(0, ELEVEN_SHAPE[g]));
    for (const m of eleven[g]) picked.add(m);
  }
  const everyone = [...men];
  everyone.splice(men.filter(m => m.ovr >= me.ovr).length, 0, me);
  const rank = chart.ahead + 1;
  const inElevenOnRating = rank <= ELEVEN_SHAPE[chart.group];
  return {
    club: at.club,
    year: at.year,
    source: squad.source,
    carried: squad.source === 'invented' ? men.filter(m => !m.id).length : 0,
    group: chart.group,
    queue: chart.men,
    rank,
    groupSize: chart.men.length,
    inElevenOnRating,
    aheadOfMe: chart.aheadOfMe,
    keepsMeOut: inElevenOnRating ? null : chart.men[ELEVEN_SHAPE[chart.group] - 1] ?? null,
    eleven,
    bench: everyone.filter(m => !picked.has(m)),
    /* Only the game's own world has arrivals. A sheet by role is a real club
       in a real past year, and nobody is said to have signed for it. */
    arrivals: squad.source === 'invented'
      ? men.filter(m => m.group === chart.group && m.id !== undefined && m.since === at.year)
      : [],
    trust: managerTrust(c, at, myOverall),
  };
}

/**
 * A sheet by role names every man by his place in his line. In the player's
 * own line he is one of the men being counted, so that line is numbered here
 * with him in it: the man under a player ranked 2nd is the third choice, the
 * roles inside the eleven are the first three (or four) and the next one is
 * on the bench. Ties go to the teammate, exactly as chartFrom ranks them.
 * Copies, never edits: the generator's squad is shared between callers.
 */
function rolesWithHim(men: SquadMan[], group: SquadGroup, myOverall: number): SquadMan[] {
  const mine = Math.round(myOverall);
  const ahead = men.filter(m => m.group === group && m.ovr >= mine).length;
  let k = 0;
  return men.map(m => {
    if (m.group !== group) return m;
    const role = roleName(k < ahead ? k : k + 1, group);
    k += 1;
    return { ...m, name: role, role };
  });
}
