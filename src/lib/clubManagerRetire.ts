/* Round 1343: retiring as a manager.

   A player asked how to retire on a manager career, and there was no way: the
   career sat in its slot still running. Retiring is now an ending. It sets one
   field, `retired`, on the save and changes nothing else: no match is played,
   nothing is drawn, the history, the trophies, the job offers and the national
   team job stay exactly where they were, and the career keeps its slot as a
   finished career with a farewell that can be opened any time.

   The save keeps no real date and no clock: `retired` names the season, the
   world season and the moment (the season's end, the middle of a season, or
   out of work), and on a mid season retirement where the club stood.

   Only /club-manager loads this file. The engine never imports it (its one
   reference is a type), so there is no cycle. */
import { LEAGUE_TITLE_NAME, leaguePosition, worldSeasonLabel } from '@/lib/clubManager';
import type { CareerState } from '@/lib/clubManager';
import { highestScoringOf } from '@/lib/clubManagerRecords';
import { formatNumber } from '@/lib/formatNumber';

export type RetirementMoment = 'seasonEnd' | 'midSeason' | 'outOfWork';

export interface Retirement {
  season: number;
  /** The real world season he left in, "2031-32". */
  worldSeason: string;
  when: RetirementMoment;
  /** The club he left (out of work: the last one he had). */
  club: string;
  /** Mid season only: the calendar index of the next entry (printed + 1, capped, as the managers screen prints it),
   *  the league position, the league games played and the points. */
  week?: number;
  position?: number;
  played?: number;
  points?: number;
}

/** A retired career is finished, and a match in progress is never walked out of. */
export function canRetire(c: CareerState | null | undefined): boolean {
  return !!c && !c.retired && !c.live;
}

export function retirementMoment(c: CareerState): RetirementMoment {
  if (c.sacked) return 'outOfWork';
  if (c.pendingSummary) return 'seasonEnd';
  return 'midSeason';
}

/** A new career, equal to c byte for byte except `retired` (and the record written down when the save had none, so
 *  a later lean park cannot thin a finished career's record). null when it cannot retire. Pure, never draws. */
export function retireCareer(c: CareerState): CareerState | null {
  if (!canRetire(c)) return null;
  const next = JSON.parse(JSON.stringify(c)) as CareerState;
  const when = retirementMoment(c);
  const retired: Retirement = { season: c.season, worldSeason: worldSeasonLabel(c), when, club: c.clubName };
  if (when === 'midSeason') {
    const row = (c.table ?? []).find(r => r.club === c.clubName);
    retired.week = c.week;
    retired.position = leaguePosition(c);
    retired.played = row ? row.w + row.d + row.l : 0;
    retired.points = row ? row.pts : 0;
  }
  next.retired = retired;
  if (next.careerStats && next.careerStats.highestScoring === undefined) {
    const high = highestScoringOf(c);
    if (high) next.careerStats.highestScoring = high;
  }
  return next;
}

/** The week the managers screen printed for this save: the next entry, counted from one, capped at the calendar. */
export function printedWeek(c: CareerState, week: number): number {
  return Math.min(week + 1, Array.isArray(c.calendar) ? c.calendar.length : week + 1);
}

export interface LegacyClub {
  club: string;
  /** Finished seasons the history credits to this club, in order. */
  seasons: number[];
  /** No finished season here: part of one. The season when the save still names it, else null. */
  partOf?: number | null;
  /** The season left unfinished at this club by a mid season retirement. */
  unfinished?: number;
}

export interface LegacyTrophy { name: string; emoji: string; seasons: number[] }

export interface CareerLegacy {
  /** Seasons finished (a season left part way or spent out of work is not one). */
  finishedSeasons: number;
  /** The season he retired in, or the one he is in. */
  lastSeason: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  /** Rounded the way the Manager panel rounds it. */
  winRate: number;
  clubs: LegacyClub[];
  cabinet: LegacyTrophy[];
  trophies: number;
  leagueTitles: number;
  nation: { nation: string; since: number; played: number; won: number } | null;
  retired: Retirement | null;
}

/** The farewell's data, all read from the save. Writes nothing. */
export function careerLegacy(c: CareerState): CareerLegacy {
  const history = Array.isArray(c.history) ? c.history : [];
  const names = [...(c.careerStats?.clubsManaged?.length ? c.careerStats.clubsManaged : [c.clubName])];
  for (const h of history) if (!names.includes(h.club)) names.push(h.club);
  if (!names.includes(c.clubName)) names.push(c.clubName);
  const retired = c.retired ?? null;
  const lastMove = c.jobHunt?.lastMove;
  const clubs: LegacyClub[] = names.map(club => {
    const seasons = history.filter(h => h.club === club).map(h => h.season);
    const out: LegacyClub = { club, seasons };
    if (retired?.when === 'midSeason' && retired.club === club) out.unfinished = retired.season;
    else if (!seasons.length) out.partOf = lastMove && lastMove.from === club ? lastMove.season : null;
    return out;
  });
  const cabinet: LegacyTrophy[] = [];
  for (const t of Array.isArray(c.trophies) ? c.trophies : []) {
    const hit = cabinet.find(x => x.name === t.name);
    if (hit) hit.seasons.push(t.season);
    else cabinet.push({ name: t.name, emoji: t.emoji, seasons: [t.season] });
  }
  const s = c.careerStats ?? { played: 0, wins: 0, draws: 0, losses: 0 };
  const nj = c.nationJob;
  return {
    finishedSeasons: history.length,
    lastSeason: retired?.season ?? c.season,
    played: s.played,
    wins: s.wins,
    draws: s.draws,
    losses: s.losses,
    winRate: s.played > 0 ? Math.round((s.wins / s.played) * 100) : 0,
    clubs,
    cabinet,
    trophies: Array.isArray(c.trophies) ? c.trophies.length : 0,
    leagueTitles: (Array.isArray(c.trophies) ? c.trophies : []).filter(t => t.name === LEAGUE_TITLE_NAME).length,
    nation: nj ? { nation: nj.nation, since: nj.since, played: nj.played, won: nj.won } : null,
    retired,
  };
}

const plural = (n: number, one: string, many: string) => `${formatNumber(n)} ${n === 1 ? one : many}`;

/** "I retired from Club Manager after 12 seasons: 7 trophies, 2 league titles, 58% of 540 matches won. Can you beat
 *  me? douknowball.com/club-manager". No club and no person named. */
export function farewellShareText(legacy: CareerLegacy): string {
  const when = legacy.finishedSeasons > 0 ? `after ${plural(legacy.finishedSeasons, 'season', 'seasons')}` : `in Season ${formatNumber(legacy.lastSeason)}`;
  const parts = [legacy.trophies > 0 ? plural(legacy.trophies, 'trophy', 'trophies') : 'no trophies'];
  if (legacy.leagueTitles > 0) parts.push(plural(legacy.leagueTitles, 'league title', 'league titles'));
  if (legacy.played > 0) parts.push(`${legacy.winRate}% of ${plural(legacy.played, 'match', 'matches')} won`);
  return `I retired from Club Manager ${when}: ${parts.join(', ')}. Can you beat me? douknowball.com/club-manager`;
}

export const ordinal = (n: number): string => {
  const t = n % 100;
  const s = t >= 11 && t <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${formatNumber(n)}${s}`;
};

export interface RetireDoorCopy { door: string; title: string; lines: string[]; keep: string; confirm: string }

/** Club Manager's words for the retire door and its confirm, at the moment the career is in. */
export function retireDoorCopy(c: CareerState): RetireDoorCopy {
  const when = retirementMoment(c);
  const lines: string[] = [];
  let title: string;
  if (when === 'midSeason') {
    title = 'Retire now?';
    const pos = leaguePosition(c);
    lines.push(`Your season at ${c.clubName} stops here, in week ${formatNumber(printedWeek(c, c.week))}${pos > 0 ? `, with the club ${ordinal(pos)} in the league` : ''}. Nothing more gets played.`);
  } else if (when === 'seasonEnd') {
    title = `Retire after Season ${formatNumber(c.season)}?`;
    lines.push(`You walk away from ${c.clubName} before the summer.`);
  } else {
    title = 'Stop waiting for the phone?';
    lines.push(`You retire from management. Your last job was ${c.clubName}.`);
  }
  const move = c.pendingMove?.club ?? c.jobHunt?.summerMove?.club;
  if (move) lines.push(`The move to ${move} you agreed is off.`);
  if (c.nationJob) lines.push(`You step down as ${c.nationJob.nation} manager too.`);
  lines.push('Your record and your trophies stay saved in this slot as a finished career, with a farewell you can open any time. A new manager starts in an empty slot.');
  return { door: '👋 Retire from management', title, lines, keep: 'Keep managing', confirm: 'Yes, retire' };
}
