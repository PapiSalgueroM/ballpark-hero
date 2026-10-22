/* Round 1541: NBA My Career's international summers, the NBA bind of
 * src/lib/careerIntl.ts on the ledger of src/data/basketballIntl.ts.
 *
 * NUMBERS AND WORDS ONLY. The tournament, the field the game draws, the call,
 * the answer and the repair live in careerIntl.ts; this file hands in the
 * game's own rules for basketball (every constant below is the game's own
 * rule, not a claim about FIBA's) and the words the screens print.
 * scripts/simCareerIntl.mjs section 6 fences a copy of the runner out of here.
 *
 * DARK IN THIS ROUND. The NBA binding carries NBA_CAREER_INTL from Round
 * 1541, but the board reads `sport.intl` only from Round 1544 (the call up
 * beat, the result screen, the Trophy Case rows). Until then nothing a player
 * sees changes and no save gains a block.
 *
 * THE SUMMER AFTER A SEASON. The season labelled Y is played from autumn Y to
 * spring Y + 1, so its summer is Y + 1: the season labelled 2003 is followed
 * by Athens 2004, the one labelled 2020 by the Tokyo Games held in 2021. The
 * call reads the last season line's own year and adds one.
 *
 * WHO IS CALLED (v1: every player is eligible for the USA, the game's rule):
 * after a season rated INTL_CALL_UP_OVR or better, not retired, not serving
 * or facing a suspension, at most INTL_MAX_AGE in the summer and with health
 * of INTL_MIN_HEALTH or more, in a summer with an edition. One call a summer.
 *
 * NO REAL PERSON. No player, coach or official of any nation is named; the
 * screens narrate and nobody speaks. The words are "the USA" and "the US
 * national team" (TEAM USA is a registered mark of the US Olympic and
 * Paralympic Committee, so it is never printed).
 */

import {
  answerCallUp, intlCalendar, intlRungHistory, intlRungOf, intlStatsOf, intlStreamKey, parseIntlId, pendingCallUp,
  repairIntlOnLoad, type CareerIntlBlock, type IntlCall, type IntlCareer, type IntlEdition, type IntlRung,
  type IntlSportBind, type IntlSummerEntry, type IntlTournament, type Rng,
} from '@/lib/careerIntl';
import {
  BASKETBALL_INTL_CYCLES, BASKETBALL_INTL_EDITIONS, BASKETBALL_INTL_PARTIAL, BASKETBALL_INTL_SHAPES,
  BASKETBALL_LAST_PLAYED_SUMMER, FIBA_GAME_MINUTES, NBA_GAME_MINUTES,
} from '@/data/basketballIntl';
import { keyedRng } from '@/lib/keyedRng';
import { summerCareerKey } from '@/lib/usCareerSummer';
import type { NbaCareerState } from '@/lib/nbaMyCareer';
import type { UsIntlSport } from '@/lib/usCareerSport';

/* ─── the game's own rules ───────────────────────────────────────────────── */

/** The game's own rule: the season's rating that earns a call. */
export const INTL_CALL_UP_OVR = 86;
/** The game's own rule: the oldest he can be in the summer of a call. */
export const INTL_MAX_AGE = 36;
/** The game's own rule: the least health he can carry into a call. */
export const INTL_MIN_HEALTH = 50;
/** The game's own rule: a nation plays at the strength of where it really finished that summer. */
export const INTL_RUNG_STRENGTH: Record<IntlRung, number> = { gold: 92, silver: 89, bronze: 87, fourth: 85, quarter: 82, field: 76 };
/** The game's own rule: he lifts the USA by this much a rating point over the bar, up to the cap. */
export const INTL_LIFT_PER_POINT = 0.5;
export const INTL_LIFT_CAP = 4;
/** The game's own rule: a side scores BASE + SLOPE x (own minus other) + a normal draw of SPREAD, never under FLOOR. */
export const INTL_SCORE_BASE = 80;
export const INTL_SCORE_SLOPE = 1.2;
export const INTL_SCORE_SPREAD = 9;
export const INTL_SCORE_FLOOR = 45;
/** The game's own rule: a level game goes to five minute overtimes, each side OT_BASE + OT_SLOPE x (own minus other) + a draw of OT_SPREAD. */
export const INTL_OT_BASE = 10;
export const INTL_OT_SLOPE = 0.3;
export const INTL_OT_SPREAD = 3;
/** The game's own rule: his share of his season's numbers in a team of stars. */
export const INTL_STAR_SHARE = 0.75;
/** The game's own rule: the spread on his points and on his rebounds and assists. */
export const INTL_LINE_SPREAD_PTS = 3;
export const INTL_LINE_SPREAD_OTHER = 1.5;
/** The game's own rule: the chance of coming home hurt, plus a point a year over INTL_KNOCK_AGE, and its cost. */
export const INTL_KNOCK_BASE = 0.08;
export const INTL_KNOCK_PER_YEAR = 0.01;
export const INTL_KNOCK_AGE = 30;
export const INTL_KNOCK_HEALTH = 8;
export const INTL_KNOCK_FLOOR = 30;

export const NBA_INTL_CALENDAR = intlCalendar({
  shapes: BASKETBALL_INTL_SHAPES, editions: BASKETBALL_INTL_EDITIONS, cycles: BASKETBALL_INTL_CYCLES,
  partial: BASKETBALL_INTL_PARTIAL, lastPlayed: BASKETBALL_LAST_PLAYED_SUMMER,
});

type NbaIntlCareer = NbaCareerState & IntlCareer;
const lastLine = (c: NbaCareerState) => c.seasons[c.seasons.length - 1];

/** The summer after the season labelled Y is Y + 1. */
export const nbaIntlSummerOf = (seasonYear: number): number => seasonYear + 1;

function normal(rng: Rng): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** A nation's strength: its real rung in a played edition, the mean of its rungs before one still to come. */
export function nbaIntlStrength(e: IntlEdition, nation: string): number {
  if (e.kind === 'played') return INTL_RUNG_STRENGTH[intlRungOf(e, nation) ?? 'field'];
  const past = intlRungHistory(NBA_INTL_CALENDAR, nation);
  if (!past.length) return INTL_RUNG_STRENGTH.field;
  return past.reduce((s, r) => s + INTL_RUNG_STRENGTH[r], 0) / past.length;
}

export const nbaIntlLift = (ovr: number): number => Math.max(0, Math.min(INTL_LIFT_CAP, (ovr - INTL_CALL_UP_OVR) * INTL_LIFT_PER_POINT));

/** The chance he comes home hurt, at his age that summer. */
export const nbaIntlKnockChance = (age: number): number => INTL_KNOCK_BASE + INTL_KNOCK_PER_YEAR * Math.max(0, age - INTL_KNOCK_AGE);

/** The edition he is called up for after his last season, or null (decision 4 of the brief). */
export function nbaIntlCallOf(c: NbaCareerState): IntlEdition | null {
  const line = lastLine(c);
  if (!line || c.retired) return null;
  if (line.teamResult === 'SUSPENDED' || (c.suspendedSeasons ?? 0) > 0) return null;
  const e = NBA_INTL_CALENDAR.editionFor(nbaIntlSummerOf(line.year));
  if (!e) return null;
  if (line.ovr < INTL_CALL_UP_OVR || c.age > INTL_MAX_AGE || c.health < INTL_MIN_HEALTH) return null;
  return e;
}

/** One game, never level: overtime until one side leads. */
export function nbaIntlPlay(a: number, b: number, rng: Rng): { a: number; b: number; ot: number } {
  let sa = Math.max(INTL_SCORE_FLOOR, Math.round(INTL_SCORE_BASE + INTL_SCORE_SLOPE * (a - b) + INTL_SCORE_SPREAD * normal(rng)));
  let sb = Math.max(INTL_SCORE_FLOOR, Math.round(INTL_SCORE_BASE + INTL_SCORE_SLOPE * (b - a) + INTL_SCORE_SPREAD * normal(rng)));
  let ot = 0;
  while (sa === sb) {
    ot += 1;
    sa += Math.max(0, Math.round(INTL_OT_BASE + INTL_OT_SLOPE * (a - b) + INTL_OT_SPREAD * normal(rng)));
    sb += Math.max(0, Math.round(INTL_OT_BASE + INTL_OT_SLOPE * (b - a) + INTL_OT_SPREAD * normal(rng)));
  }
  return { a: sa, b: sb, ot };
}

/** His line in one game: his season's numbers scaled to a 40 minute game and a team of stars, plus a draw. */
export function nbaIntlLine(c: NbaCareerState, rng: Rng): Record<string, number> {
  const line = lastLine(c);
  const k = (FIBA_GAME_MINUTES / NBA_GAME_MINUTES) * INTL_STAR_SHARE;
  const one = (avg: number, spread: number) => Math.max(0, Math.round(avg * k + spread * normal(rng)));
  return {
    pts: one(line?.ppg ?? 0, INTL_LINE_SPREAD_PTS),
    reb: one(line?.rpg ?? 0, INTL_LINE_SPREAD_OTHER),
    ast: one(line?.apg ?? 0, INTL_LINE_SPREAD_OTHER),
  };
}

/** The NBA's face to careerIntl.ts. */
export const NBA_INTL_BIND: IntlSportBind<NbaIntlCareer> = {
  slug: 'nba',
  calendar: NBA_INTL_CALENDAR,
  nationOf: () => 'USA',
  callOf: nbaIntlCallOf,
  strengthOf: nbaIntlStrength,
  liftOf: c => nbaIntlLift(lastLine(c)?.ovr ?? 0),
  play: (a, b, rng) => nbaIntlPlay(a, b, rng),
  groupDraws: false,
  /* Groups rank by wins (a point a win), then points for minus against, then
     the module's keyed coin: the game's simplification, not FIBA's tie rules. */
  groupPoints: [1, 0, 0],
  tableOrder: (x, y) => y.won - x.won || (y.pf - y.pa) - (x.pf - x.pa),
  lineOf: nbaIntlLine,
  knockChance: c => nbaIntlKnockChance(c.age),
  knock: c => { c.health = Math.max(INTL_KNOCK_FLOOR, c.health - INTL_KNOCK_HEALTH); },
  ageOf: c => c.age,
  careerKey: c => summerCareerKey(c),
  rng: keyedRng,
};

/** The stream a career's tournament draws on (the brief's intl:nba:<career key>:<edition>). */
export const nbaIntlStreamKey = (c: NbaCareerState, editionId: string): string => intlStreamKey('nba', summerCareerKey(c), editionId);

/* ─── the words ──────────────────────────────────────────────────────────── */

const MEDAL_WORD: Record<string, string> = { Olympics: 'Olympic', 'World Championship': 'World Championship', 'Basketball World Cup': 'World Cup' };

/** "the 2028 Olympics in Los Angeles", "the 2020 Olympics in Tokyo, held in 2021", "the 2036 Olympics". */
export function nbaIntlEditionLabel(id: string): string {
  const e = NBA_INTL_CALENDAR.byId(id);
  const p = parseIntlId(id);
  if (!e) return p ? `the ${p.year} summer tournament` : 'a summer tournament';
  const when = e.games && e.games !== e.year ? `${e.games} ${e.name} in ${e.host}, held in ${e.year}` : `${e.year} ${e.name}${e.host ? ` in ${e.host}` : ''}`;
  return `the ${when}`;
}

/** The curtain's line when a call is waiting, or null. The same pending call the beat reads, so the two never disagree. */
export function nbaIntlCurtainLine(c: NbaCareerState): string | null {
  const call = pendingCallUp(c as NbaIntlCareer, NBA_INTL_BIND);
  return call ? `The national team wants you for ${nbaIntlEditionLabel(call.edition.id)}. You decide next.` : null;
}

/** The Trophy Case rows: one a medal kind, with the summers it was won. */
export function nbaIntlTrophyRows(c: NbaCareerState): { label: string; n: number; years: number[] }[] {
  const rows = new Map<string, number[]>();
  for (const r of (c as NbaIntlCareer).intl?.summers ?? []) {
    if (!r.went || (r.place !== 'gold' && r.place !== 'silver' && r.place !== 'bronze')) continue;
    const e = NBA_INTL_CALENDAR.byId(r.edition);
    const label = `${MEDAL_WORD[e?.name ?? ''] ?? 'International'} ${r.place}`;
    rows.set(label, [...(rows.get(label) ?? []), r.year]);
  }
  return [...rows.entries()].map(([label, years]) => ({ label, n: years.length, years }));
}

const pct = (x: number) => `${Math.round(x * 100)} percent`;
const LAST_LEDGER_YEAR = Math.max(...BASKETBALL_INTL_EDITIONS.map(r => r[2]));

/**
 * The rules behind the page's ?, built from the constants above the way
 * nbaAwardHelpRules is, so the help can never disagree with the code. Shown
 * from Round 1544, when the board starts reading `sport.intl`.
 */
export function nbaIntlHelpRules(): string[] {
  const exOvr = INTL_CALL_UP_OVR + 2;
  return [
    `International summers: after a season rated ${INTL_CALL_UP_OVR} or better, in a summer with an Olympics or a Basketball World Cup, the US national team calls you up, as long as you are ${INTL_MAX_AGE} or younger that summer, your health is ${INTL_MIN_HEALTH} or more and you are not suspended. In this game every player is eligible for the USA.`,
    'You choose: go and play the tournament, or rest. The call waits for your answer, one call a summer, and it comes before the summer\'s cards.',
    'The tournament is groups, then a knockout: the best of each group (and the best third placed sides, when the format has them) go through, the knockout is seeded by group finish and record, and the semi-final losers play for bronze. Groups rank by wins, then points for minus against: the game\'s own rule, not FIBA\'s tie rules. A World Cup with a second group round is played as one group round into a round of 16.',
    `Each nation plays at the strength of where it really finished that summer; you lift the USA by ${INTL_LIFT_PER_POINT} for every rating point over ${INTL_CALL_UP_OVR}, up to ${INTL_LIFT_CAP}. Groups and results are this career's own.`,
    `Going carries a ${pct(INTL_KNOCK_BASE)} chance of coming home hurt (health drops ${INTL_KNOCK_HEALTH}), ${INTL_KNOCK_PER_YEAR * 100} point more for every year over ${INTL_KNOCK_AGE}. Resting carries nothing and gives nothing.`,
    'A medal goes in your Trophy Case. It does not change your legacy, your Hall of Fame case, your morale, your fans or your money.',
    `Real summers run from Athens 2004 to Brisbane 2032 with their real hosts and fields; a summer still to come draws its field from the nations of that competition's last two tournaments, and past ${LAST_LEDGER_YEAR} the game keeps its own calendar: host and field are the game's own.`,
    `Example: you finish the 2027-28 season rated ${exOvr}. 2028 is an Olympic summer in Los Angeles and the national team calls players rated ${INTL_CALL_UP_OVR} or better, so you are called. Go: three group games, then a top two finish (or one of the two best thirds) puts you in the quarter-final; win the semi-final and the final for gold, lose the semi-final and you play for bronze. You lift the USA by ${nbaIntlLift(exOvr)}, and the chance you come home hurt is ${pct(nbaIntlKnockChance(27))}. Rest: no games, no risk, nothing on the shelf.`,
  ];
}

/* ─── the face the board reads (from Round 1544) ─────────────────────────── */

export const NBA_CAREER_INTL: UsIntlSport<NbaCareerState> = {
  pending: c => pendingCallUp(c as NbaIntlCareer, NBA_INTL_BIND),
  answer: (c, choice) => answerCallUp(c as NbaIntlCareer, NBA_INTL_BIND, choice),
  repairOnLoad: c => repairIntlOnLoad(c as NbaIntlCareer),
  curtainLine: nbaIntlCurtainLine,
  trophyRows: nbaIntlTrophyRows,
  medalCount: c => intlStatsOf((c as NbaIntlCareer).intl).medals,
  summersOf: c => (c as NbaIntlCareer).intl?.summers ?? [],
  editionLabel: nbaIntlEditionLabel,
  helpRules: nbaIntlHelpRules,
};

export type { CareerIntlBlock, IntlCall, IntlSummerEntry, IntlTournament };
