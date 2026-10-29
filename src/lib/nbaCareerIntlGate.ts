/* Round 1544 (the lead's ruling L5): the static gate of NBA My Career's
 * international summers.
 *
 * WHY IT EXISTS. The ledger (src/data/basketballIntl.ts), the bracket runner
 * (src/lib/careerIntl.ts) and the NBA bind (src/lib/nbaCareerIntl.ts) load in
 * their own chunk, only when a career first meets a call or opens something
 * international, so /nba-my-career does not carry them for the many careers
 * that never get one. What the board needs before that is here and nothing
 * more: the summers that hold an edition, the game's own cycle past them, the
 * bar, the curtain's words and the help's words.
 *
 * A SECOND COPY, FENCED. The edition summers and the facts the help names are
 * the ledger's too. scripts/simCareerIntl.mjs section 2 holds the two equal on
 * every summer 2004 to 2050 and the help's facts equal to the ledger's
 * (control gateyear, one summer moved here: red). A data round that edits the
 * ledger's calendar edits this file in the same commit.
 *
 * Every constant below is the game's own rule, not a claim about FIBA's.
 */

import { nbaShouldRetire, type NbaCareerState } from '@/lib/nbaMyCareer';
import { endsAfterSeason } from '@/lib/usCareerRetirementFlow';
import type { UsIntlLazy } from '@/lib/usCareerSport';

/** The game's own rule: the season's rating that earns a call (the lead's ruling L1: 87, about
 *  one career in two ever called; 86 called 57.5 and 59.5 percent). */
export const INTL_CALL_UP_OVR = 87;
/** The game's own rule: the oldest he can be in the summer of a call. */
export const INTL_MAX_AGE = 36;
/** The game's own rule: the least health he can carry into a call. */
export const INTL_MIN_HEALTH = 50;
/** The game's own rule: he lifts the USA by this much a rating point over the bar, up to the cap. */
export const INTL_LIFT_PER_POINT = 0.5;
export const INTL_LIFT_CAP = 4;
/** The game's own rule: the chance of coming home hurt, plus a point a year over INTL_KNOCK_AGE, and its cost. */
export const INTL_KNOCK_BASE = 0.08;
export const INTL_KNOCK_PER_YEAR = 0.01;
export const INTL_KNOCK_AGE = 30;
export const INTL_KNOCK_HEALTH = 8;
export const INTL_KNOCK_FLOOR = 30;

/** The summers the ledger holds an edition for, oldest first (its rows' years). */
export const NBA_INTL_LEDGER_SUMMERS: readonly number[] = [2004, 2006, 2008, 2010, 2012, 2014, 2016, 2019, 2021, 2023, 2024, 2027, 2028, 2031, 2032];
/** The game's own calendar past the ledger: the first projected summer and every how many years (the ledger's cycles). */
export const NBA_INTL_GATE_CYCLES: readonly (readonly [number, number])[] = [[2036, 4], [2035, 4]];

/** Whether a summer holds an edition: the ledger's, or the game's own past it. */
export const nbaIntlIsEditionSummer = (summer: number): boolean =>
  NBA_INTL_LEDGER_SUMMERS.includes(summer) || NBA_INTL_GATE_CYCLES.some(([first, every]) => summer >= first && (summer - first) % every === 0);

/** The summer after the season labelled Y is Y + 1. */
export const nbaIntlSummerOf = (seasonYear: number): number => seasonYear + 1;

export const nbaIntlLift = (ovr: number): number => Math.max(0, Math.min(INTL_LIFT_CAP, (ovr - INTL_CALL_UP_OVR) * INTL_LIFT_PER_POINT));

/** The chance he comes home hurt, at his age that summer. */
export const nbaIntlKnockChance = (age: number): number => INTL_KNOCK_BASE + INTL_KNOCK_PER_YEAR * Math.max(0, age - INTL_KNOCK_AGE);

/** The summer he is called up for after his last season, or null. A career
 *  that ends after this season is never called: the board writes the season's
 *  curtain before it checks the end, so the call reads the end itself. */
export function nbaIntlCallSummer(c: NbaCareerState): number | null {
  const line = c.seasons[c.seasons.length - 1];
  if (!line || c.retired || nbaShouldRetire(c) || endsAfterSeason(c, line.year)) return null;
  if (line.teamResult === 'SUSPENDED' || (c.suspendedSeasons ?? 0) > 0) return null;
  const summer = nbaIntlSummerOf(line.year);
  if (!nbaIntlIsEditionSummer(summer)) return null;
  if (line.ovr < INTL_CALL_UP_OVR || c.age > INTL_MAX_AGE || c.health < INTL_MIN_HEALTH) return null;
  return summer;
}

/** The summer whose call waits on an answer, or null: a summer already on the save is answered. */
export function nbaIntlPendingYear(c: NbaCareerState): number | null {
  const summer = nbaIntlCallSummer(c);
  if (summer === null) return null;
  const rows = (c as { intl?: { summers?: { year?: unknown }[] } }).intl?.summers;
  return Array.isArray(rows) && rows.some(r => r?.year === summer) ? null : summer;
}

/** The curtain's line (critic advice 22: shown after the season, so it says what comes next). */
export const NBA_INTL_CURTAIN_LINE = 'The US national team wants you this summer. You decide next.';

/** What the help names off the ledger; section 2 holds it equal to nbaIntlHelpFactsOfLedger(). */
export interface NbaIntlHelpFacts {
  /** the summers the World Cup still went by its old name */
  oldNameYears: string[];
  /** host and year of the first and the last played edition */
  firstPlayed: string;
  lastPlayed: string;
  /** host and year of every edition announced after that */
  announced: string[];
  lastLedgerYear: number;
}
export const NBA_INTL_HELP_FACTS: NbaIntlHelpFacts = {
  oldNameYears: ['2006', '2010'],
  firstPlayed: 'Athens 2004',
  lastPlayed: 'Paris 2024',
  announced: ['Qatar 2027', 'Los Angeles 2028', 'France 2031', 'Brisbane 2032'],
  lastLedgerYear: 2032,
};

const pct = (x: number) => `${Math.round(x * 100)} percent`;
const inWords = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/**
 * The rules behind the page's ?, built from the constants above the way
 * nbaAwardHelpRules is, so the help can never disagree with the code. Static
 * on purpose: the rules show before play, and they need no ledger.
 */
export function nbaIntlHelpRules(f: NbaIntlHelpFacts = NBA_INTL_HELP_FACTS): string[] {
  const exOvr = INTL_CALL_UP_OVR + 2;
  const knockPoints = Math.round(INTL_KNOCK_PER_YEAR * 100);
  return [
    `International summers: after a season rated ${INTL_CALL_UP_OVR} or better, in a summer with an Olympics or a Basketball World Cup (the World Championship in ${inWords(f.oldNameYears)}), the US national team calls you up, as long as you are ${INTL_MAX_AGE} or younger that summer, your health is ${INTL_MIN_HEALTH} or more, you are not suspended and your career is not ending with that season. In this game every player is eligible for the USA.`,
    'You choose: go and play the tournament, or rest. The call waits for your answer, one call a summer, and it comes before the summer\'s cards.',
    'The tournament is groups, then a knockout: the best of each group (and the best third placed sides, when the format has them) go through, and the semi-final losers play for bronze. The knockout is seeded by group finish and record, so you can meet a side from your own group again in the first knockout game. Groups rank by wins, then points for minus against: the game\'s own rule, not FIBA\'s tie rules. A World Cup with a second group round is played as one group round into a round of 16.',
    `In a summer already played, each nation plays at the strength of where it really finished; in one still to come, the game draws each nation's strength for your career from where it really finished in the tournaments it played (a nation new to this stage plays as an outsider). You lift the USA by ${INTL_LIFT_PER_POINT} for every rating point over ${INTL_CALL_UP_OVR}, up to ${INTL_LIFT_CAP}. Groups and results are this career's own.`,
    `If you go, the chance you come home hurt is ${pct(INTL_KNOCK_BASE)} (health drops ${INTL_KNOCK_HEALTH}, never below ${INTL_KNOCK_FLOOR}), plus ${knockPoints} percentage point${knockPoints === 1 ? '' : 's'} for every year you are over ${INTL_KNOCK_AGE}. Resting carries nothing and gives nothing.`,
    'A medal goes in your Trophy Case. It does not change your legacy, your Hall of Fame case, your morale, your fans or your money.',
    `Tournaments from ${f.firstPlayed} to ${f.lastPlayed} use their real hosts and fields. The ones announced after that (${inWords(f.announced)}) use their real hosts and a field the game draws from the nations of that competition's last two tournaments, the same for every career, in that competition's last known format. Past ${f.lastLedgerYear} the game keeps its own calendar, with no host. The game puts the USA in every one of these tournaments, with no qualifying.`,
    `Example: you finish the 2027-28 season rated ${exOvr} and you are 27 that summer. 2028 is an Olympic summer in Los Angeles and the national team calls players rated ${INTL_CALL_UP_OVR} or better, so you are called. Go: three group games, then a top two finish (or one of the two best thirds) puts you in the quarter-final; win it, the semi-final and the final for gold, or lose the semi-final and play for bronze. You lift the USA by ${nbaIntlLift(exOvr)}, and at 27 the chance you come home hurt is ${pct(nbaIntlKnockChance(27))}. Rest: no games, no risk, nothing on the shelf.`,
  ];
}

/** The NBA's face on the binding: the gate now, the whole module on demand. */
export const NBA_CAREER_INTL_LAZY: UsIntlLazy<NbaCareerState> = {
  pendingYear: nbaIntlPendingYear,
  curtainLine: c => (nbaIntlPendingYear(c) === null ? null : NBA_INTL_CURTAIN_LINE),
  load: () => import('@/lib/nbaCareerIntl').then(m => m.NBA_CAREER_INTL),
};
