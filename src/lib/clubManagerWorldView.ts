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
  ERA_UCL_FIELDS, evalWorldUcl, sortedUclGroup, uclLegsFor, worldUclNights, worldUclNightsDone,
} from '@/lib/clubManager';
import { entryDatesOf, worldUclNightDates, worldYearOf, type CalDate } from '@/lib/clubManagerCalendar';
import { isHistoricEra } from '@/lib/clubManagerEras';
import { UCL_GROUP_LEDGER } from '@/lib/clubManagerUclGroups';
import { groupFixtures, type WorldCompFormat, type WorldKoRound } from '@/lib/worldCompetition';

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

function watcherView(career: CareerState): WorldCompView | null {
  const slice = career.worldComps?.ucl;
  if (!slice || slice.s !== career.season || career.uclGroup) return null;
  let result: ReturnType<typeof evalWorldUcl> = null;
  let places: ReturnType<typeof worldUclNights> = null;
  let dates: CalDate[] | null = null;
  let done = 0;
  try {
    result = evalWorldUcl(career);
    places = worldUclNights(career);
    dates = worldUclNightDates(career);
    done = worldUclNightsDone(career);
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
  };
}

/** The Champions League as this save sees it this season, in it or watching, or null when there is neither. */
export function worldUclView(career: CareerState): WorldCompView | null {
  try {
    return career.uclGroup ? participantView(career) : watcherView(career);
  } catch {
    return null;
  }
}

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
    return { mode: 'watching', value, sub: 'You are watching from outside' };
  }
  return { mode: 'none', value: 'Nothing to follow', sub: 'It shows here from next season' };
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
