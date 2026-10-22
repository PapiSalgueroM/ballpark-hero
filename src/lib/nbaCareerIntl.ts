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
 * A career that ends after this season (the engine's hard stop, or a farewell
 * or retirement he chose) is never called: the board writes the season's
 * curtain before it checks the end, so the call reads the end itself rather
 * than waiting for `retired` to be set.
 *
 * NO REAL PERSON. No player, coach or official of any nation is named; the
 * screens narrate and nobody speaks. The words are "the USA" and "the US
 * national team" (TEAM USA is a registered mark of the US Olympic and
 * Paralympic Committee, so it is never printed).
 */

import {
  answerCallUp, intlCalendar, intlRungHistory, intlRungOf, intlStatsOf, intlStreamKey, intlTournamentOf, parseIntlId, pendingCallUp,
  repairIntlOnLoad, type CareerIntlBlock, type IntlCall, type IntlCareer, type IntlEdition, type IntlRung,
  type IntlSportBind, type IntlSummerEntry, type IntlTournament, type Rng,
} from '@/lib/careerIntl';
import {
  BASKETBALL_INTL_CYCLES, BASKETBALL_INTL_EDITIONS, BASKETBALL_INTL_PARTIAL, BASKETBALL_INTL_SHAPES,
  BASKETBALL_LAST_PLAYED_SUMMER, FIBA_GAME_MINUTES, NBA_GAME_MINUTES,
} from '@/data/basketballIntl';
import { keyedRng } from '@/lib/keyedRng';
import { summerCareerKey } from '@/lib/usCareerSummer';
import { endsAfterSeason } from '@/lib/usCareerRetirementFlow';
import { nbaShouldRetire, type NbaCareerState } from '@/lib/nbaMyCareer';
import type { UsIntlSport } from '@/lib/usCareerSport';

/* ─── the game's own rules ───────────────────────────────────────────────── */

/** The game's own rule: the season's rating that earns a call (Round 1544, the lead's ruling L1: 87, about
 *  one career in two ever called; 86 called 57.5 and 59.5 percent). */
export const INTL_CALL_UP_OVR = 87;
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

/**
 * A nation's strength. In a played edition, its real rung, and nothing is
 * drawn. In one still to come (Round 1544, the lead's ruling L3), a rung drawn
 * from the ones it really reached, one per tournament it played, on the
 * career's stream; a nation that never played one is a field side. Round 1541
 * gave it the MEAN of its rungs, which pulled every rival toward the middle
 * while the USA sat at 89.5, so a 92 to 94 player won gold 88 to 90 percent of
 * the time there against 64.5 in played editions. The draw keeps each nation's
 * real spread: measured, gold by tier sits inside the played editions' bands
 * (scripts/simCareerIntl.mjs section 5, control easyfuture). Taking the mean of
 * the last two played editions was measured too and left medals at 89 to 99
 * percent; drawing once per edition for every career fixed twelve draws and
 * left the band to luck.
 */
export function nbaIntlStrength(e: IntlEdition, nation: string, rng: Rng): number {
  if (e.kind === 'played') return INTL_RUNG_STRENGTH[intlRungOf(e, nation) ?? 'field'];
  const past = intlRungHistory(NBA_INTL_CALENDAR, nation);
  if (!past.length) return INTL_RUNG_STRENGTH.field;
  return INTL_RUNG_STRENGTH[past[Math.min(past.length - 1, Math.floor(rng() * past.length))]];
}

/** The career as it stood at the call of `summer`: the season before it as its last, at the age on the row. */
export function nbaIntlCareerAt(c: NbaCareerState, summer: number, age: number): NbaCareerState | null {
  let i = c.seasons.length - 1;
  while (i >= 0 && nbaIntlSummerOf(c.seasons[i].year) !== summer) i -= 1;
  return i < 0 ? null : { ...c, seasons: c.seasons.slice(0, i + 1), age };
}

export const nbaIntlLift = (ovr: number): number => Math.max(0, Math.min(INTL_LIFT_CAP, (ovr - INTL_CALL_UP_OVR) * INTL_LIFT_PER_POINT));

/** The chance he comes home hurt, at his age that summer. */
export const nbaIntlKnockChance = (age: number): number => INTL_KNOCK_BASE + INTL_KNOCK_PER_YEAR * Math.max(0, age - INTL_KNOCK_AGE);

/** The edition he is called up for after his last season, or null (decision 4 of the brief). */
export function nbaIntlCallOf(c: NbaCareerState): IntlEdition | null {
  const line = lastLine(c);
  if (!line || c.retired || nbaShouldRetire(c) || endsAfterSeason(c, line.year)) return null;
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
  careerAt: (c, summer, age) => nbaIntlCareerAt(c, summer, age) as NbaIntlCareer | null,
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
const inWords = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
/* Read off the ledger, so the help names what the ledger holds and nothing it does not. */
const OLD_NAME_YEARS = BASKETBALL_INTL_EDITIONS.filter(r => r[3] === 'World Championship').map(r => String(r[2]));
const PLAYED_ROWS = BASKETBALL_INTL_EDITIONS.filter(r => r[6] !== null);
const FIRST_PLAYED = PLAYED_ROWS[0];
const LAST_PLAYED = PLAYED_ROWS[PLAYED_ROWS.length - 1];
const ANNOUNCED = BASKETBALL_INTL_EDITIONS.filter(r => r[6] === null).map(r => `${r[4]} ${r[2]}`);
const KNOCK_POINTS = Math.round(INTL_KNOCK_PER_YEAR * 100);

/**
 * The rules behind the page's ?, built from the constants above the way
 * nbaAwardHelpRules is, so the help can never disagree with the code. Shown
 * from Round 1544, when the board starts reading `sport.intl`.
 */
export function nbaIntlHelpRules(): string[] {
  const exOvr = INTL_CALL_UP_OVR + 2;
  return [
    `International summers: after a season rated ${INTL_CALL_UP_OVR} or better, in a summer with an Olympics or a Basketball World Cup (the World Championship in ${inWords(OLD_NAME_YEARS)}), the US national team calls you up, as long as you are ${INTL_MAX_AGE} or younger that summer, your health is ${INTL_MIN_HEALTH} or more, you are not suspended and your career is not ending with that season. In this game every player is eligible for the USA.`,
    'You choose: go and play the tournament, or rest. The call waits for your answer, one call a summer, and it comes before the summer\'s cards.',
    'The tournament is groups, then a knockout: the best of each group (and the best third placed sides, when the format has them) go through, and the semi-final losers play for bronze. The knockout is seeded by group finish and record, so you can meet a side from your own group again in the first knockout game. Groups rank by wins, then points for minus against: the game\'s own rule, not FIBA\'s tie rules. A World Cup with a second group round is played as one group round into a round of 16.',
    `In a summer already played, each nation plays at the strength of where it really finished; in one still to come, the game draws each nation's strength for your career from where it really finished in the tournaments it played (a nation new to this stage plays as an outsider). You lift the USA by ${INTL_LIFT_PER_POINT} for every rating point over ${INTL_CALL_UP_OVR}, up to ${INTL_LIFT_CAP}. Groups and results are this career's own.`,
    `If you go, the chance you come home hurt is ${pct(INTL_KNOCK_BASE)} (health drops ${INTL_KNOCK_HEALTH}, never below ${INTL_KNOCK_FLOOR}), plus ${KNOCK_POINTS} percentage point${KNOCK_POINTS === 1 ? '' : 's'} for every year you are over ${INTL_KNOCK_AGE}. Resting carries nothing and gives nothing.`,
    'A medal goes in your Trophy Case. It does not change your legacy, your Hall of Fame case, your morale, your fans or your money.',
    `Tournaments from ${FIRST_PLAYED[4]} ${FIRST_PLAYED[2]} to ${LAST_PLAYED[4]} ${LAST_PLAYED[2]} use their real hosts and fields. The ones announced after that (${inWords(ANNOUNCED)}) use their real hosts, but their fields are not settled, so the game draws each from the nations of that competition's last two tournaments, the same for every career, and a format not confirmed yet plays as that competition's last known one. Past ${LAST_LEDGER_YEAR} the game keeps its own calendar, with no host. The game puts the USA in every one of these tournaments, with no qualifying.`,
    `Example: you finish the 2027-28 season rated ${exOvr} and you are 27 that summer. 2028 is an Olympic summer in Los Angeles and the national team calls players rated ${INTL_CALL_UP_OVR} or better, so you are called. Go: three group games, then a top two finish (or one of the two best thirds) puts you in the quarter-final; win it, the semi-final and the final for gold, or lose the semi-final and play for bronze. You lift the USA by ${nbaIntlLift(exOvr)}, and at 27 the chance you come home hurt is ${pct(nbaIntlKnockChance(27))}. Rest: no games, no risk, nothing on the shelf.`,
  ];
}

/* ─── the face the board reads (from Round 1544) ─────────────────────────── */

export const NBA_CAREER_INTL: UsIntlSport<NbaCareerState> = {
  pending: c => pendingCallUp(c as NbaIntlCareer, NBA_INTL_BIND),
  answer: (c, choice) => answerCallUp(c as NbaIntlCareer, NBA_INTL_BIND, choice),
  repairOnLoad: c => repairIntlOnLoad(c as NbaIntlCareer, NBA_INTL_BIND),
  tournamentOf: (c, year) => intlTournamentOf(c as NbaIntlCareer, NBA_INTL_BIND, year),
  curtainLine: nbaIntlCurtainLine,
  trophyRows: nbaIntlTrophyRows,
  medalCount: c => intlStatsOf((c as NbaIntlCareer).intl).medals,
  summersOf: c => (c as NbaIntlCareer).intl?.summers ?? [],
  editionLabel: nbaIntlEditionLabel,
  helpRules: nbaIntlHelpRules,
};

export type { CareerIntlBlock, IntlCall, IntlSummerEntry, IntlTournament };
