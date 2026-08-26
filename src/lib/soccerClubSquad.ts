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
 * WHAT IT WILL NOT DO. It shows nothing at all rather than guessing: a club
 * outside the hand written map in clubSquads.ts, a season outside the baked
 * window, or a club whose data that year could not field a team all produce
 * null, and the card simply does not render. No generated teammates stand in
 * for real ones here, because unlike a national squad in 2045 there is no
 * honest way to invent the squad of a real club in a real season.
 */
import { CLUB_SQUADS, CLUB_DATA_NAME, CLUB_SQUAD_YEARS } from '@/data/clubSquads';

export type SquadGroup = 'GK' | 'DEF' | 'MID' | 'ATT';

export interface SquadMan {
  name: string;
  pos: string;
  ovr: number;
  group: SquadGroup;
  /** True for the one row that is the player himself. */
  me?: boolean;
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
 * The real squad a club had in a season, best first, or null when we have no
 * honest answer. Never throws and never invents.
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
 * Where the player sits in his own position queue at his club this season.
 *
 * Ties go to the REAL player, not to the user: a man already at the club who
 * rates the same as you is ahead of you, because he is the one in the team.
 * That is the pessimistic reading and it is the right one for a card whose
 * job is to explain why the minutes are thin.
 */
export function depthChart(
  club: string, year: number, position: string, myOverall: number, myName: string,
): DepthChart | null {
  const squad = clubSquad(club, year);
  if (!squad) return null;
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
