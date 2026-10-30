/* Round 1541: NBA My Career's international summers, the NBA bind of
 * src/lib/careerIntl.ts on the ledger of src/data/basketballIntl.ts.
 *
 * NUMBERS AND WORDS ONLY. The tournament, the field the game draws, the call,
 * the answer and the repair live in careerIntl.ts; this file hands in the
 * game's own rules for basketball (every constant below is the game's own
 * rule, not a claim about FIBA's) and the words the screens print.
 * scripts/simCareerIntl.mjs section 6 fences a copy of the runner out of here.
 *
 * LOADED ON DEMAND (Round 1544, the lead's ruling L5). The NBA binding holds
 * the static gate (src/lib/nbaCareerIntlGate.ts: the bar, the edition summers,
 * the curtain and the help) and reaches this file, with the ledger and the
 * bracket runner, through a dynamic import when a career first meets a call
 * or opens something international. Nothing static may import this file:
 * scripts/simCareerIntl.mjs section 12 reads the page's bundle graph.
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
import type { NbaCareerState } from '@/lib/nbaMyCareer';
import type { IntlSummerNotes, UsIntlSport } from '@/lib/usCareerSport';
import {
  INTL_KNOCK_FLOOR, INTL_KNOCK_HEALTH, nbaIntlCallSummer, nbaIntlKnockChance, nbaIntlLift, nbaIntlSummerOf,
  nbaIntlHelpRules, type NbaIntlHelpFacts,
} from '@/lib/nbaCareerIntlGate';

/* Round 1544 (the lead's ruling L5): the bar, the edition summers, the lift,
   the knock's numbers and the help's words live in the static gate
   (src/lib/nbaCareerIntlGate.ts), so the board reads them without this file.
   They are re-exported here so a reader of the bind finds every rule. */
export {
  INTL_CALL_UP_OVR, INTL_MAX_AGE, INTL_MIN_HEALTH, INTL_LIFT_PER_POINT, INTL_LIFT_CAP, INTL_KNOCK_BASE,
  INTL_KNOCK_PER_YEAR, INTL_KNOCK_AGE, INTL_KNOCK_HEALTH, INTL_KNOCK_FLOOR, nbaIntlSummerOf, nbaIntlLift,
  nbaIntlKnockChance, nbaIntlHelpRules,
} from '@/lib/nbaCareerIntlGate';

/* ─── the game's own rules ───────────────────────────────────────────────── */

/** The game's own rule: a nation plays at the strength of where it really finished that summer. */
export const INTL_RUNG_STRENGTH: Record<IntlRung, number> = { gold: 92, silver: 89, bronze: 87, fourth: 85, quarter: 82, field: 76 };
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

export const NBA_INTL_CALENDAR = intlCalendar({
  shapes: BASKETBALL_INTL_SHAPES, editions: BASKETBALL_INTL_EDITIONS, cycles: BASKETBALL_INTL_CYCLES,
  partial: BASKETBALL_INTL_PARTIAL, lastPlayed: BASKETBALL_LAST_PLAYED_SUMMER,
});

type NbaIntlCareer = NbaCareerState & IntlCareer;
const lastLine = (c: NbaCareerState) => c.seasons[c.seasons.length - 1];

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

/** The edition he is called up for after his last season, or null: the
 *  gate's summer (every condition of the call lives there, Round 1544), read
 *  on the ledger's calendar. */
export function nbaIntlCallOf(c: NbaCareerState): IntlEdition | null {
  const summer = nbaIntlCallSummer(c);
  return summer === null ? null : NBA_INTL_CALENDAR.editionFor(summer);
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

/** The words of the call card and the result screen (critic advice 15: nothing
 *  about the real world that goes false on a date, so a drawn field is "the
 *  game's own", never "not settled yet"). */
export function nbaIntlSummerNotes(id: string, age: number): IntlSummerNotes {
  const e = NBA_INTL_CALENDAR.byId(id);
  return {
    label: nbaIntlEditionLabel(id),
    knockPct: Math.round(nbaIntlKnockChance(age) * 100),
    hurtCost: `health down ${INTL_KNOCK_HEALTH}, never below ${INTL_KNOCK_FLOOR}`,
    fieldNote: !e || e.kind === 'played' ? null : e.host ? 'This field is the game\'s own.' : 'Host and field are the game\'s own.',
    /* only a played edition: the ledger has no source for a later World Cup's format, and a projected one has none */
    playedAsNote: e && e.kind === 'played' && !e.shape.playable ? 'The game plays its two group rounds as one, into a round of 16.' : null,
    happened: e?.kind === 'played',
    nation: 'USA',
    statWords: [['pts', 'points'], ['reb', 'rebounds'], ['ast', 'assists']],
  };
}

/** The help's facts read off the ledger: simCareerIntl section 2 holds the
 *  gate's NBA_INTL_HELP_FACTS equal to this, so the static help names what the
 *  ledger holds and nothing it does not. */
export function nbaIntlHelpFactsOfLedger(): NbaIntlHelpFacts {
  const played = BASKETBALL_INTL_EDITIONS.filter(r => r[6] !== null);
  const at = (r: (typeof BASKETBALL_INTL_EDITIONS)[number]) => `${r[4]} ${r[2]}`;
  return {
    oldNameYears: BASKETBALL_INTL_EDITIONS.filter(r => r[3] === 'World Championship').map(r => String(r[2])),
    firstPlayed: at(played[0]),
    lastPlayed: at(played[played.length - 1]),
    announced: BASKETBALL_INTL_EDITIONS.filter(r => r[6] === null).map(at),
    lastLedgerYear: Math.max(...BASKETBALL_INTL_EDITIONS.map(r => r[2])),
  };
}

/* ─── the face the board reads (from Round 1544) ─────────────────────────── */

export const NBA_CAREER_INTL: UsIntlSport<NbaCareerState> = {
  pending: c => pendingCallUp(c as NbaIntlCareer, NBA_INTL_BIND),
  answer: (c, choice) => answerCallUp(c as NbaIntlCareer, NBA_INTL_BIND, choice),
  repairOnLoad: c => repairIntlOnLoad(c as NbaIntlCareer, NBA_INTL_BIND),
  tournamentOf: (c, year) => intlTournamentOf(c as NbaIntlCareer, NBA_INTL_BIND, year),
  trophyRows: nbaIntlTrophyRows,
  medalCount: c => intlStatsOf((c as NbaIntlCareer).intl).medals,
  summersOf: c => (c as NbaIntlCareer).intl?.summers ?? [],
  editionLabel: nbaIntlEditionLabel,
  helpRules: nbaIntlHelpRules,
  summerNotes: nbaIntlSummerNotes,
};

export type { CareerIntlBlock, IntlCall, IntlSummerEntry, IntlTournament };
