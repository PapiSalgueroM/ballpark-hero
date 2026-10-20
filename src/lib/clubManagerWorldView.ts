/**
 * Round 1503: the Champions League as one view, read off the save, for the club in it and for the club watching
 * it. Pure and read only: it draws nothing from Math.random, writes nothing into the save, and is loaded only with
 * the screen that shows it (WorldCompScreen.tsx, lazy), so the Club Manager engine chunk does not carry it.
 *
 * THE TWO CASES, ONE SHAPE.
 * - In it (career.uclGroup set): the participant engine's own state. Its groups are uclGroup (Group A, mine) and
 *   uclWorld (B on), each in its era's order (sortedUclGroup); its nights are the calendar's European weeks with
 *   their dates; a group night's fixtures are my group's two (my opponent and venue by fixtureFor's rule, the other
 *   two by playMyMatch's, both in clubManager.ts) and every other group's (groupFixtures), with the scores the
 *   group ledger holds (a save from before Round 478 has none, so those read "unrecorded"); the knockout nights
 *   are the bracket's ties, leg by leg. Nothing here is a second simulation.
 * - Watching (a slice for this season, Round 1502): evalWorldUcl's result, dated by worldUclNightDates. That result
 *   is memoised and shared (fix-1502 seam 1), so it is read and copied here and never written into, and the call
 *   sits in a try: a view that cannot be built is no view, never a crash.
 *
 * A night counted as played through `seen` (a slice carried across a job move onto a calendar behind the old one,
 * fix-1502 seam 2) can sit on a date after the save's today on the new calendar. It is shown as played before the
 * move, with no date, rather than as a result dated in the future.
 *
 * clubRun gives one club's games in this competition in the row shape of the other lane's club fixtures reader
 * (src/lib/clubDetailFixtures.ts on its manager-club-fixtures branch: round, home, away, homeGoals, awayGoals and
 * status), so a club page can show a club's Champions League run without a second competition reader.
 */
import type { CareerState, TableRow, UclTie } from '@/lib/clubManager';
import {
  ERA_UCL_FIELDS, evalWorldComp, sortedUclGroup, uclLegsFor, worldCompNights, worldCompNightsDone,
  /* Round 1510: the domestic super cup. */
  careerLeagueOf, evalOneOff, leagueRulesOf, oneOffNightPlaces, oneOffPartialOf, oneOffRowOf, worldLeagueDefs,
  /* Round 1514: the UEFA Super Cup, and a slice's row with its dated edition. */
  oneOffSliceRow, uefaSuperCupRowOf, type OneOffKey,
} from '@/lib/clubManager';
import { oneOffEdition, oneOffFixturesOf, oneOffPartialWhy, oneOffPlayedIn, type OneOffRow, type OneOffSkip } from '@/lib/worldOneOffs';
import { nightDateAt } from '@/lib/worldNights';
import { CM_ONE_OFF_MARKS, CM_ONE_OFF_SEASON_ONE } from '@/data/cmOneOffRows';
import { entryDatesOf, worldCompNightDates, worldYearOf, type CalDate } from '@/lib/clubManagerCalendar';
import { isHistoricEra } from '@/lib/clubManagerEras';
import { CM_FINAL_TABLES_2025_26 } from '@/data/clubManagerFinalTables2025_26';
import { UCL_GROUP_LEDGER } from '@/lib/clubManagerUclGroups';
import { groupFixtures, type WorldCompFormat, type WorldCompKey, type WorldKoRound } from '@/lib/worldCompetition';

export type WorldViewStage = 'md' | WorldKoRound;

/** One match of a night, home first. Goals are null until it is played (or when an old save did not keep them). */
export interface WorldViewFixture { home: string; away: string; homeGoals: number | null; awayGoals: number | null }

export interface WorldViewNight {
  /** MD1 to MD8, PO1, PO2, R16_1, R16_2, QF1, QF2, SF1, SF2, F (a one leg round is its round's name). */
  id: string;
  stage: WorldViewStage;
  /** 0 based matchday of the first stage. */
  md?: number;
  leg?: 1 | 2;
  /** Two legs in this round. */
  twoLegs: boolean;
  /** The game's date of the night on this save's calendar; null when the night was played before a job move. */
  date: CalDate | null;
  played: boolean;
  /** Counted as played on the calendar of the club the manager left (it is not on this one yet). */
  beforeMove?: true;
  fixtures: WorldViewFixture[];
}

/** A knockout tie, home first: legs in that orientation, the aggregate once settled. */
export interface WorldViewTie {
  round: WorldKoRound; slot: number; home: string; away: string; legs: 1 | 2;
  leg1?: [number, number]; leg2?: [number, number]; agg?: [number, number];
  winner?: string; aet?: true; pens?: true; byAwayGoals?: true;
}

export interface WorldCompView {
  /** In it, or watching it from outside. */
  mode: 'in' | 'watching';
  /** The first stage shown: eight groups of four ('g8', the participant's always) or the 36 club league ('l36'). */
  format: WorldCompFormat;
  /** "2026-27". */
  season: string;
  myClub: string;
  /** Every club in it. */
  clubs: string[];
  nights: WorldViewNight[];
  nightsDone: number;
  groups?: { letter: string; rows: TableRow[] }[];
  table?: TableRow[];
  ties: WorldViewTie[];
  /** The knockout's first round. */
  firstKo: WorldKoRound;
  winner?: string;
  runnerUp?: string;
  /** The holders, top of pot one at the draw (watching only, when the save knew them). */
  holder?: string;
  /** An era's stand in: a club from outside the real 32 in the place of one of them. Watching, it is the club the
   *  engine picked for my club's place (Round 1502, correction 19); in it, it is my own club. */
  standIn?: { club: string; for: string };
  /** An era save: every season's field is that era's real 32, whatever the leagues did. */
  eraField: boolean;
  /** Round 1509, the Europa League: how each entrant got in (euroAccess.ts's route codes), and the route my club
   *  earned by the same rule (it is never an entrant yet). */
  via?: Record<string, string>;
  earned?: string;
}

/** "2026-27" for the save's season. */
export function seasonLabel(career: Pick<CareerState, 'startYear' | 'season'>): string {
  const y = worldYearOf(career);
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}

const ROUND_NAMES: Record<WorldKoRound, string> = {
  PO: 'Play-off', R16: 'Round of 16', QF: 'Quarter-final', SF: 'Semi-final', F: 'Final',
};

/** "Matchday 4", "Round of 16, first leg", "Final". */
export function nightLabel(n: Pick<WorldViewNight, 'stage' | 'md' | 'leg' | 'twoLegs'>): string {
  if (n.stage === 'md') return `Matchday ${(n.md ?? 0) + 1}`;
  const name = ROUND_NAMES[n.stage];
  if (!n.twoLegs) return name;
  return `${name}, ${n.leg === 2 ? 'second' : 'first'} leg`;
}

/** The plural name of a knockout round, for lines like "out in the quarter-finals". */
export function roundPlural(r: WorldKoRound): string {
  return r === 'PO' ? 'play-offs' : r === 'R16' ? 'round of 16' : r === 'QF' ? 'quarter-finals' : r === 'SF' ? 'semi-finals' : 'final';
}

/* ---------- in it: the participant engine's own state ---------- */

const KO_ORDER: WorldKoRound[] = ['PO', 'R16', 'QF', 'SF', 'F'];

function tieView(t: UclTie): WorldViewTie {
  const legs = t.legs === 2 ? 2 : 1;
  const out: WorldViewTie = { round: t.round, slot: t.slot, home: t.home, away: t.away, legs };
  if (legs === 2 && t.leg1) out.leg1 = [t.leg1.homeGoals, t.leg1.awayGoals];
  if (legs === 2 && t.leg2) out.leg2 = [t.leg2.homeGoals, t.leg2.awayGoals];
  if (t.winner !== null) {
    out.agg = [t.homeGoals ?? 0, t.awayGoals ?? 0];
    out.winner = t.winner;
    if (t.aet) out.aet = true;
    if (t.pens) out.pens = true;
    if (t.byAwayGoals) out.byAwayGoals = true;
  }
  return out;
}

/** My group's two fixtures of matchday `md`: my opponent and venue by fixtureFor's rule, the other two by
 *  playMyMatch's (they swap ends on the return meetings, matchdays 4 to 6). */
function myGroupPairs(me: string, opponents: string[], md: number): [string, string][] {
  const idx = md % 3;
  const opp = opponents[idx];
  const out: [string, string][] = [];
  if (opp) {
    const home = md < 3 ? idx !== 1 : idx === 1;
    out.push(home ? [me, opp] : [opp, me]);
  }
  const rest = opponents.filter((_, i) => i !== idx);
  const others = rest.length === 2 && md >= 3 ? [rest[1], rest[0]] : rest;
  if (others.length === 2) out.push([others[0], others[1]]);
  return out;
}

function participantView(career: CareerState): WorldCompView | null {
  const group = career.uclGroup;
  if (!group || !Array.isArray(career.calendar)) return null;
  const me = career.clubName;
  const ledger = career.pairResults?.[UCL_GROUP_LEDGER] ?? {};
  const world = career.uclWorld ?? [];
  const dates = entryDatesOf(career);
  const bracket = career.uclBracket ?? [];
  const score = (home: string, away: string, played: boolean): WorldViewFixture => {
    const s = played ? ledger[`${home}|${away}`] : undefined;
    return { home, away, homeGoals: s ? s[0] : null, awayGoals: s ? s[1] : null };
  };
  const nights: WorldViewNight[] = [];
  career.calendar.forEach((e, i) => {
    const date = dates[i] ?? null;
    if (e.type === 'uclGroup') {
      const md = e.round;
      const fixtures = [
        ...myGroupPairs(me, group.opponents, md).map(([h, a]) => score(h, a, md < group.matchday)),
        ...world.flatMap(g => groupFixtures(g.clubs, md).map(([h, a]) => score(h, a, md < g.matchday))),
      ];
      nights.push({ id: `MD${md + 1}`, stage: 'md', md, twoLegs: false, date, played: i < career.week, fixtures });
      return;
    }
    if (e.type !== 'uclKo' || !e.uclRound) return;
    const round = e.uclRound;
    const twoLegs = uclLegsFor(career.eraId, round) === 2 && !!e.uclLeg;
    const leg: 1 | 2 = e.uclLeg === 2 ? 2 : 1;
    const fixtures = bracket.filter(t => t.round === round).map((t): WorldViewFixture => {
      if (twoLegs && leg === 2) {
        return { home: t.away, away: t.home, homeGoals: t.leg2 ? t.leg2.awayGoals : null, awayGoals: t.leg2 ? t.leg2.homeGoals : null };
      }
      if (twoLegs) return { home: t.home, away: t.away, homeGoals: t.leg1 ? t.leg1.homeGoals : null, awayGoals: t.leg1 ? t.leg1.awayGoals : null };
      return { home: t.home, away: t.away, homeGoals: t.winner !== null ? t.homeGoals : null, awayGoals: t.winner !== null ? t.awayGoals : null };
    });
    const id = !twoLegs ? (round === 'F' ? 'F' : round) : round === 'R16' ? `R16_${leg}` : `${round}${leg}`;
    nights.push({ id, stage: round, leg: twoLegs ? leg : undefined, twoLegs, date, played: i < career.week, fixtures });
  });
  const groups = [
    { letter: 'A', rows: sortedUclGroup(career, group.table) },
    ...world.map(g => ({ letter: g.letter, rows: sortedUclGroup(career, g.table) })),
  ];
  const ties = [...bracket].sort((a, b) => KO_ORDER.indexOf(a.round) - KO_ORDER.indexOf(b.round) || a.slot - b.slot).map(tieView);
  const final = ties.find(t => t.round === 'F' && t.winner);
  const firstKo: WorldKoRound = ties[0]?.round ?? (nights.find(n => n.stage !== 'md')?.stage as WorldKoRound | undefined) ?? 'QF';
  const clubs = groups.flatMap(g => g.rows.map(r => r.club));
  /* An era save whose club is not one of the real 32: it takes the place of the one initUclWorld leaves over. */
  const standIn = standInOf(career, clubs);
  return {
    mode: 'in', format: 'g8', season: seasonLabel(career), myClub: me,
    clubs,
    nights, nightsDone: nights.filter(n => n.played).length, groups, ties, firstKo,
    ...(final ? { winner: final.winner, runnerUp: final.winner === final.home ? final.away : final.home } : {}),
    ...(standIn ? { standIn } : {}),
    eraField: isHistoricEra(career.eraId),
  };
}

/* ---------- watching: the slice, evaluated ---------- */

/** An era slice's stand in, read off the slice and the era's verified 32 alone (fix-1502 item 13): the club in
 *  it that is not one of the 32, and the one of the 32 that is not in it. */
function standInOf(career: CareerState, clubs: string[]): { club: string; for: string } | undefined {
  const eraId = career.eraId;
  if (!eraId || !isHistoricEra(eraId)) return undefined;
  const real = (ERA_UCL_FIELDS[eraId] ?? []).map(e => e.name);
  if (!real.length) return undefined;
  const inReal = new Set(real);
  const club = clubs.find(c => !inReal.has(c));
  const left = real.find(c => !clubs.includes(c));
  return club && left ? { club, for: left } : undefined;
}

function watcherView(career: CareerState, comp: WorldCompKey): WorldCompView | null {
  const slice = career.worldComps?.[comp];
  if (!slice || slice.s !== career.season || (comp === 'ucl' && career.uclGroup)) return null;
  let result: ReturnType<typeof evalWorldComp> = null;
  let places: ReturnType<typeof worldCompNights> = null;
  let dates: CalDate[] | null = null;
  let done = 0;
  try {
    result = evalWorldComp(career, comp);
    places = worldCompNights(career, comp);
    dates = worldCompNightDates(career, comp);
    done = worldCompNightsDone(career, comp);
  } catch {
    return null;
  }
  if (!result || !places || !dates || places.length !== result.nights.length) return null;
  const over = career.week >= career.calendar.length;
  const nights = result.nights.map((n, i): WorldViewNight => {
    const played = i < done;
    /* A night counted through `seen` that this calendar has not reached yet: played before the move. */
    const beforeMove = played && !over && places![i].at >= career.week;
    const twoLegs = n.stage !== 'md' && result!.nights.some(o => o.stage === n.stage && o.leg === 2);
    return {
      id: n.id, stage: n.stage, ...(n.md !== undefined ? { md: n.md } : {}), ...(twoLegs ? { leg: n.leg ?? 1 } : {}),
      twoLegs, date: beforeMove ? null : dates![i] ?? null, played, ...(beforeMove ? { beforeMove: true as const } : {}),
      fixtures: n.fixtures.map(f => ({ home: f.home, away: f.away, homeGoals: f.hg ?? null, awayGoals: f.ag ?? null })),
    };
  });
  const ties = result.ties.map((t): WorldViewTie => ({
    round: t.round, slot: t.slot, home: t.home, away: t.away,
    legs: t.leg2 || nights.some(n => n.stage === t.round && n.leg === 2) ? 2 : 1,
    ...(t.leg1 ? { leg1: [t.leg1[0], t.leg1[1]] as [number, number] } : {}),
    ...(t.leg2 ? { leg2: [t.leg2[0], t.leg2[1]] as [number, number] } : {}),
    ...(t.agg ? { agg: [t.agg[0], t.agg[1]] as [number, number] } : {}),
    ...(t.winner ? { winner: t.winner } : {}),
    ...(t.aet ? { aet: true as const } : {}), ...(t.pens ? { pens: true as const } : {}),
    ...(t.byAwayGoals ? { byAwayGoals: true as const } : {}),
  }));
  const rows = (r: TableRow): TableRow => ({ club: r.club, w: r.w, d: r.d, l: r.l, gf: r.gf, ga: r.ga, pts: r.pts });
  return {
    mode: 'watching', format: slice.f, season: seasonLabel(career), myClub: career.clubName,
    clubs: [...slice.clubs], nights, nightsDone: done,
    ...(result.groups ? { groups: result.groups.map(g => ({ letter: g.letter, rows: g.rows.map(rows) })) } : {}),
    ...(result.table ? { table: result.table.map(rows) } : {}),
    ties, firstKo: slice.f === 'l36' ? 'PO' : 'R16',
    ...(result.winner ? { winner: result.winner, runnerUp: result.runnerUp } : {}),
    ...(slice.holder ? { holder: slice.holder } : {}),
    ...(() => { const s = standInOf(career, slice.clubs); return s ? { standIn: s } : {}; })(),
    eraField: isHistoricEra(career.eraId),
    ...(slice.via && slice.via.length === slice.clubs.length ? { via: Object.fromEntries(slice.clubs.map((c, i) => [c, slice.via![i]])) } : {}),
    ...(slice.earned ? { earned: slice.earned } : {}),
  };
}

/** A competition as this save sees it this season, in it or watching, or null when there is neither. Round 1509:
 *  keyed; my club is in the Champions League alone (the Europa League is only ever followed from outside yet). */
export function worldCompView(career: CareerState, comp: WorldCompKey): WorldCompView | null {
  try {
    return comp === 'ucl' && career.uclGroup ? participantView(career) : watcherView(career, comp);
  } catch {
    return null;
  }
}

/** The Champions League as this save sees it this season, in it or watching, or null when there is neither. */
export function worldUclView(career: CareerState): WorldCompView | null { return worldCompView(career, 'ucl'); }

/* ---------- the tile's words, and one club's run ---------- */

export function ordinal(n: number): string {
  const t = n % 100;
  const s = t >= 11 && t <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th';
  return `${n}${s}`;
}

/** How many nights the first stage has. */
export function firstStageNights(view: Pick<WorldCompView, 'nights'>): number {
  return view.nights.filter(n => n.stage === 'md').length;
}

/** The next night to be played, or null when every night is played. */
export function nextNight(view: WorldCompView): WorldViewNight | null {
  return view.nights.find(n => !n.played) ?? null;
}

export interface WorldUclStatus { mode: 'in' | 'watching' | 'none'; value: string; sub: string }

/**
 * fix-1509 (the brief's advice 21, last item): the leagues whose fifth placed club of 2025-26 played the real
 * 2026-27 Champions League through a European Performance Spot, rows A1 and A3 of scripts/data/cmEuroAccess.json
 * (verified, each on two publishers). The game plays its own four places there (both rows are in
 * EURO_ACCESS_PARTIAL), so that club starts a season one career in neither competition, and the tile says why.
 * Read for that line alone, never for a place.
 */
const REAL_FIFTH_IN_UCL: Readonly<Record<string, string>> = { premier: 'England', laliga: 'Spain' };

/** The nation whose real fifth Champions League place this club held, in season one of today's world where the
 *  game's rule made that fifth place a Europa League one instead; else null. */
export function realFifthNation(career: CareerState): string | null {
  if (career.season !== 1 || career.uclGroup || isHistoricEra(career.eraId) || career.worldComps?.uel?.earned !== 'L') return null;
  for (const [id, nation] of Object.entries(REAL_FIFTH_IN_UCL)) if (CM_FINAL_TABLES_2025_26.leagues[id]?.table[4] === career.clubName) return nation;
  return null;
}

/** The tile's line for that club: why it is in neither. */
export const REAL_FIFTH_TILE = 'Fifth was a real Champions League place, a Europa League one here, not played yet';

/** The Champions League tile's two lines on the Cups panel. */
export function worldUclStatus(career: CareerState, view: WorldCompView | null): WorldUclStatus {
  if (career.uclGroup) {
    const ko = career.uclKoRound;
    const winnerLine = view?.winner ? `Won by ${view.winner}` : 'Follow the rest of it';
    if (ko === 'won') return { mode: 'in', value: 'Champions of Europe', sub: `${seasonLabel(career)} is yours` };
    if (ko === 'out') {
      const exit = career.uclExit;
      return { mode: 'in', value: exit && exit !== 'group' ? `Out in the ${roundPlural(exit)}` : 'Out in the group stage', sub: winnerLine };
    }
    if (ko) return { mode: 'in', value: `In the ${roundPlural(ko)}`, sub: `Next up: ${career.uclDraw?.[ko] ?? 'to be drawn'}` };
    const md = career.uclGroup.matchday;
    const pos = view?.groups?.[0]?.rows.findIndex(r => r.club === career.clubName) ?? -1;
    return {
      mode: 'in',
      value: md === 0 ? 'Group stage, the draw is out' : `Group stage, matchday ${md} of 6`,
      sub: md > 0 && pos >= 0 ? `${ordinal(pos + 1)} in your group` : 'You are in it',
    };
  }
  if (view) {
    const next = nextNight(view);
    const first = firstStageNights(view);
    const value = view.winner ? `Won by ${view.winner}`
      : !next ? 'Season over'
        : next.stage === 'md' ? `Matchday ${(next.md ?? 0) + 1} of ${first} next` : `${nightLabel(next)} next`;
    return { mode: 'watching', value, sub: realFifthNation(career) ? REAL_FIFTH_TILE : 'You are watching from outside' };
  }
  return { mode: 'none', value: 'Nothing to follow', sub: 'It shows here from next season' };
}

/** Round 1509: how a club got into the Europa League, in a few words, by its route code (euroAccess.ts). */
export function routeWords(code: string | undefined): string | null {
  return code === 'L' ? 'its league place' : code === 'C' ? 'winning its cup' : code === 'P' ? "its cup's place, passed down its league"
    : code === 'H' ? 'winning the Conference League' : code === 'F' ? 'the fill, as the next best placed club of a strong league' : null;
}

/** Round 1509: the Europa League tile's two lines on the Cups panel. My club only ever follows it from outside in
 *  this round, so a place it earned says so and that its own nights are not played yet. */
export function worldUelStatus(career: CareerState, view: WorldCompView | null): WorldUclStatus {
  if (!view) return { mode: 'none', value: 'Nothing to follow', sub: 'It shows here from next season' };
  const next = nextNight(view);
  const first = firstStageNights(view);
  const value = view.winner ? `Won by ${view.winner}`
    : !next ? 'Season over'
      : next.stage === 'md' ? `Matchday ${(next.md ?? 0) + 1} of ${first} next` : `${nightLabel(next)} next`;
  return { mode: 'watching', value, sub: view.earned ? 'You earned a place, but your own nights are not played yet' : 'You are following it from outside' };
}

/** One game of a club's run, in the club fixtures reader's row shape (round is the night here). */
export interface WorldRunRow {
  round: string;
  label: string;
  date: CalDate | null;
  beforeMove?: true;
  home: string;
  away: string;
  homeGoals: number | null;
  awayGoals: number | null;
  status: 'recorded' | 'unrecorded' | 'upcoming';
}

/** Where a club finished the first stage (or stands in it), as "2nd in Group C" or "12th in the league phase". */
function firstStagePlace(view: WorldCompView, club: string): { pos: number; text: string } | null {
  if (view.groups) {
    for (const g of view.groups) {
      const i = g.rows.findIndex(r => r.club === club);
      if (i >= 0) return { pos: i + 1, text: `${ordinal(i + 1)} in Group ${g.letter}` };
    }
    return null;
  }
  const i = (view.table ?? []).findIndex(r => r.club === club);
  return i >= 0 ? { pos: i + 1, text: `${ordinal(i + 1)} in the league phase` } : null;
}

/** One club's games in this competition and where it finished or went out. Null for a club not in it. */
export function clubRun(view: WorldCompView, club: string): { rows: WorldRunRow[]; place: string | null; finish: string } | null {
  if (!view.clubs.includes(club)) return null;
  const rows: WorldRunRow[] = [];
  for (const n of view.nights) {
    for (const f of n.fixtures) {
      if (f.home !== club && f.away !== club) continue;
      const scored = f.homeGoals !== null && f.awayGoals !== null;
      rows.push({
        round: n.id, label: nightLabel(n), date: n.date, ...(n.beforeMove ? { beforeMove: true as const } : {}),
        home: f.home, away: f.away, homeGoals: f.homeGoals, awayGoals: f.awayGoals,
        /* Unrecorded is a group night an old save played without keeping its scores. A knockout first leg the
           participant engine has not settled yet (it plays another club's tie on the second leg's week) is still
           to come, whatever the week. */
        status: scored ? 'recorded' : n.played && n.stage === 'md' ? 'unrecorded' : 'upcoming',
      });
    }
  }
  const place = firstStagePlace(view, club);
  const stageOver = view.nightsDone >= firstStageNights(view);
  const mine = view.ties.filter(t => t.home === club || t.away === club);
  const last = mine[mine.length - 1];
  let finish: string;
  if (last?.winner) {
    finish = last.winner === club ? (last.round === 'F' ? 'Won it' : `Through the ${roundPlural(last.round)}`)
      : last.round === 'F' ? 'Runners-up' : `Out in the ${roundPlural(last.round)}`;
  } else if (last) {
    finish = `Still in: the ${roundPlural(last.round)}`;
  } else if (!stageOver || !place) {
    finish = 'Still in: the first stage';
  } else {
    /* Who goes on: the top two of a group, except for the club in it in today's world, whose stand in sends the
       group winners to the quarter-finals and my club as runner-up in the last winner's place (uclSeededField).
       Once the first knockout round is drawn, a club the league phase does not send straight to the round of 16
       and with no tie in it is out, whatever the rule above says. */
    const winnersOnly = view.mode === 'in' && view.firstKo === 'QF';
    const through = view.format === 'l36' ? place.pos <= 24
      : winnersOnly ? place.pos === 1 || (place.pos === 2 && club === view.myClub) : place.pos <= 2;
    const direct = view.format === 'l36' && place.pos <= 8;
    const drawn = view.ties.some(t => t.round === view.firstKo);
    finish = !through || (drawn && !direct)
      ? (view.format === 'g8' ? 'Out in the group stage' : 'Out after the league phase')
      : 'Through, waiting on the draw';
  }
  return { rows, place: place ? `${place.text}${stageOver ? '' : ' so far'}` : null, finish };
}

/* ================================================================== */
/* Round 1510: the domestic super cup, one card behind a tile          */
/* ================================================================== */

/** One match of the super cup as the card shows it, home first (the first named on a neutral ground). */
export interface SuperCupMatch {
  label: string;
  date: CalDate | null;
  home: string;
  away: string;
  homeGoals: number | null;
  awayGoals: number | null;
  aet?: true;
  pens?: true;
  winner?: string;
  mine?: true;
}

export interface SuperCupView {
  /** The cup's plain name, or null when this country has no row. */
  name: string | null;
  /** A country and year the round looked at and could not prove (no row, named in CM_ONE_OFF_PARTIAL). */
  partial: boolean;
  /** One line on how it is played. */
  format: string;
  /** Where: the season one edition's sourced ground, else the row's rule. */
  ground: string;
  /** Each club and why it is in. */
  clubs: { club: string; why: string }[];
  matches: SuperCupMatch[];
  winner?: string;
  /** The stub's line, when there is no cup to follow this season. */
  stub?: string;
  /** My club is one of its clubs. */
  mine: boolean;
  /** Season one of a new career, followed: the game played it. */
  seasonOne: boolean;
  /** An era save keeps its era's row every season. */
  era: boolean;
  /** Round 1514: what the row simplifies or leaves out (CM_ONE_OFF_MARKS), one line, or empty. */
  mark: string;
  /** Fix-1514: the game plays this row next season too. False on an edition only row's last dated edition
   *  (Italy's 2026-27), so no line promises a cup next summer. */
  later: boolean;
}

/* The critic's correction 8 words, its second sentence made true (fix-1510 minors 6 and 13): a place next summer is
   earned, never promised, as the help says. */
const SETTLED_BEFORE = "Your club's place was settled before you arrived. Your first super cup is the next one your club earns, from next summer.";
/* Fix-1514 (the run lens, major 1): an edition only row's last dated edition has no next summer to promise. */
const ONLY_THIS_EDITION = "Only this season's edition is confirmed, so later seasons are not confirmed yet.";
const SETTLED_LAST = `Your club's place was settled before you arrived. ${ONLY_THIS_EDITION}`;
const STUB_WORDS: Record<OneOffSkip, (name: string) => string> = {
  seasonOne: () => SETTLED_BEFORE,
  joined: () => SETTLED_BEFORE,
  legs: name => `Your club is in this year's two legged ${name}. Club Manager plays one match super cups for now, so this one is not shown.`,
  unfinished: () => 'Last season did not finish in this game, so there is no field for this one.',
  noFinal: () => "Last season's cup had no final in this game, so there is no field for this one.",
  moved: name => `You arrived from another country this summer, so this season's ${name} is not in your game.`,
  notInWorld: () => "One of its clubs is not in this game's world, so it is not shown.",
  noNight: () => 'There is no free midweek for it on this season\'s calendar, so it is not played.',
  noWinner: name => `This year's ${name} is not played: one of last season's European winners is not in your game, and the game never makes one up.`,
};

function formatWords(row: OneOffRow): string {
  if (row.shape === 'two') return `Two legs, settled on aggregate${row.awayGoals ? ', away goals counting' : ''}.`;
  if (row.shape === 'four') return 'Four clubs: two semi finals, then the final.';
  return row.decider === 'pens'
    ? 'One match. Level after 90 minutes, it goes straight to penalties.'
    : 'One match. Level after 90 minutes, extra time and then penalties.';
}

/** The country's top flight name and cup name, for why a club is in. */
function namesOf(career: CareerState, row: OneOffRow): { league: string; cup: string } {
  const top = worldLeagueDefs(career).find(l => { const r = leagueRulesOf(l.id); return r.nationId === row.nation && r.ladder === 'top'; });
  return { league: top?.name ?? 'league', cup: (top && leagueRulesOf(top.id).cup) || 'cup' };
}

/** This season's super cup for the Cups panel's card, read off the save. A country with no row says it is not
 *  confirmed (a stub line, no name). Pure and
 *  read only: the evaluation is memoised and shared, so it is copied here and never written into. */
export function superCupView(career: CareerState, key: OneOffKey = 'dsc'): SuperCupView {
  const era = !!career.eraId && isHistoricEra(career.eraId);
  const own = career.worldComps?.[key];
  const slice = own && own.s === career.season ? own : null;
  const row = slice ? oneOffSliceRow(career, slice) : key === 'usc' ? uefaSuperCupRowOf(career) : oneOffRowOf(career);
  const base = { clubs: [], matches: [], mine: false, seasonOne: career.season === 1, era, mark: '', later: true };
  /* No row: the game has not proved this country's super cup (no 'none' row stands on two families either), so
     it says it is not confirmed and plays nothing, never that there is none. Round 1514: a partial row's own
     reason where the ledger gives one (Spain's four club cup, Italy's later editions). */
  if (!row) {
    if (key === 'usc') return { ...base, name: null, partial: false, format: '', ground: '', stub: `The game has not confirmed the UEFA Super Cup ${era ? 'in this era' : 'here'} yet, so none is followed or played.` };
    const partial = oneOffPartialOf(career);
    const where = `this country's super cup${era ? ' in this era' : ''}`;
    const nation = leagueRulesOf(careerLeagueOf(career).id).nationId;
    const why = partial && !era ? oneOffPartialWhy(nation, 2026) : null;
    const stub = why
      ? `${why} Until then none is followed or played here.`
      : partial
      ? `The game looked for ${where} and could not confirm it on two sources, so none is followed or played here.`
      : `The game has not confirmed ${era ? 'a super cup for this country in this era' : 'a super cup for this country'} yet, so none is followed or played here.`;
    return { ...base, name: null, partial, format: '', ground: '', stub };
  }
  const view: SuperCupView = { ...base, name: row.name, partial: false, format: formatWords(row), ground: '', mark: CM_ONE_OFF_MARKS[row.id] ?? '' };
  /* Fix-1514: next season's edition, keyed by its start year as the engine keys it (oneOffEditionYear). */
  view.later = oneOffPlayedIn(row.id, (typeof career.startYear === 'number' ? career.startYear : 2026) + career.season);
  if (!slice) {
    /* Round 1514: season one's UEFA Super Cup is never opened (the 2025-26 Europa League winner is not in the game). */
    view.stub = key === 'usc' && career.season === 1
      ? `This year's ${row.name} is not played: last season's Europa League winner is not in your game. It opens next summer, when this season is done.`
      : view.later ? 'It opens next summer, when this season is done.'
      : `Your save started before the game had this one, so this season's is not followed here. ${ONLY_THIS_EDITION}`;
    return view;
  }
  if (slice.skip) {
    view.stub = !view.later && (slice.skip === 'seasonOne' || slice.skip === 'joined') ? SETTLED_LAST : STUB_WORDS[slice.skip](row.name);
    view.mine = slice.skip === 'seasonOne' || slice.skip === 'joined' || slice.skip === 'legs';
    return view;
  }
  const clubs = slice.clubs ?? [];
  const names = namesOf(career, row);
  view.mine = clubs.includes(career.clubName);
  /* Why each is in, by the row's entry rule and entrantsFrom's order: 'champCup' is the champions then the cup
     winners (on a double the league's or the cup's runners up, as the row's rule says); 'top2cup2' is the league's
     top two then the cup's two finalists, and on a double a cup place goes to whoever the rule hands it. Only
     'champCup' with 'leagueRunnerUp' is played today (eng-2026); the others stand for rows a later ledger proves. */
  const why = (i: number): string => {
    /* Round 1514: the UEFA Super Cup's two European winners. */
    if (row.entry === 'euroWinners') return i === 0 ? 'Champions League winners last season' : 'Europa League winners last season';
    if (i === 0) return `${names.league} champions`;
    if (row.entry === 'top2cup2') {
      if (i === 1) return `${names.league} runners up`;
      if (slice.dbl) return `in on a ${names.cup} place, passed down as its club was already in`;
      return i === 2 ? `${names.cup} winners` : `${names.cup} runners up`;
    }
    if (!slice.dbl) return `${names.cup} winners`;
    return row.double === 'cupRunnerUp' ? `${names.cup} runners up, as the champions won the ${names.cup} too` : `${names.league} runners up, as the champions won the ${names.cup} too`;
  };
  view.clubs = clubs.map((club, i) => ({ club, why: why(i) }));
  const edition = career.season === 1 ? CM_ONE_OFF_SEASON_ONE.find(e => e[0] === row.id) : undefined;
  /* Round 1514: a dated edition's ground (the ledger's, for that season alone). */
  const dated = oneOffEdition(row.id, (typeof career.startYear === 'number' ? career.startYear : 2026) + slice.s - 1);
  const named = edition?.[3] ?? dated?.ground;
  view.ground = named ? `Played at ${named}.` : row.venue === 'n' ? 'On a neutral ground.' : `At ${row.venue === 'c' ? clubs[0] : clubs[1]}'s ground.`;
  try {
    const places = oneOffNightPlaces(career, key) ?? [];
    const dates = entryDatesOf(career);
    const dateOf = (night: number): CalDate | null => {
      const p = places[night];
      if (!p) return null;
      return p.entry ? dates[p.at] ?? null : nightDateAt(dates, p.at);
    };
    const done = evalOneOff(career, undefined, key);
    const shown = new Map((done?.fixtures ?? []).map(f => [f.n, f]));
    for (const f of oneOffFixturesOf(clubs, row)) {
      const got = shown.get(f.n);
      view.matches.push({
        label: row.shape === 'four' ? `Semi final ${f.n + 1}` : row.shape === 'two' ? `Leg ${f.leg}` : 'The match',
        date: dateOf(f.night), home: f.home, away: f.away,
        homeGoals: got?.hg ?? null, awayGoals: got?.ag ?? null,
        ...(got?.aet ? { aet: true as const } : {}), ...(got?.pens ? { pens: true as const } : {}),
        ...(got?.winner && f.settles ? { winner: got.winner } : {}),
        ...(f.home === career.clubName || f.away === career.clubName ? { mine: true as const } : {}),
      });
    }
    if (row.shape === 'four') {
      const final = done?.fixtures.find(f => f.n === 2);
      const semis = done?.fixtures.filter(f => f.night === 0) ?? [];
      view.matches.push({
        label: 'The final', date: dateOf(1),
        home: final?.home ?? semis[0]?.winner ?? 'Winner of semi final 1', away: final?.away ?? semis[1]?.winner ?? 'Winner of semi final 2',
        homeGoals: final?.hg ?? null, awayGoals: final?.ag ?? null,
        ...(final?.aet ? { aet: true as const } : {}), ...(final?.pens ? { pens: true as const } : {}), ...(final?.winner ? { winner: final.winner } : {}),
        ...(final?.mine ? { mine: true as const } : {}),
      });
    }
    if (done?.done && done.winner) view.winner = done.winner;
  } catch {
    view.matches = [];
    view.stub = 'This one cannot be shown right now.';
  }
  return view;
}

/** The super cup tile's two lines on the Cups panel. */
export function superCupStatus(view: SuperCupView): { value: string; sub: string } {
  if (!view.name) return { value: 'Not confirmed', sub: `No super cup confirmed for this country${view.era ? ' in this era' : ''} yet` };
  if (view.stub) return { value: view.name, sub: view.stub };
  const played = view.matches.filter(m => m.homeGoals !== null);
  const last = played[played.length - 1];
  const next = view.matches.find(m => m.homeGoals === null);
  if (view.winner && last) {
    const how = last.pens ? ' on penalties' : last.aet ? ' after extra time' : '';
    return { value: `Won by ${view.winner}${how}`, sub: `${last.home} ${last.homeGoals}-${last.awayGoals} ${last.away}` };
  }
  if (next) return { value: view.mine ? 'Your club is in it' : view.name, sub: `${next.home} v ${next.away}` };
  return { value: view.name, sub: 'Followed from outside' };
}
