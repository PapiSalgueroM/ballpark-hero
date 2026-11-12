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
import { INTL_CALL_UP_OVR, INTL_MAX_AGE, INTL_MIN_HEALTH } from './nbaCareerIntlRules';
export {
  INTL_CALL_UP_OVR, INTL_MAX_AGE, INTL_MIN_HEALTH, INTL_LIFT_PER_POINT, INTL_LIFT_CAP,
  INTL_KNOCK_BASE, INTL_KNOCK_PER_YEAR, INTL_KNOCK_AGE, INTL_KNOCK_HEALTH, INTL_KNOCK_FLOOR,
  NBA_INTL_HELP_FACTS, nbaIntlLift, nbaIntlKnockChance, nbaIntlHelpRules,
  type NbaIntlHelpFacts,
} from './nbaCareerIntlRules';

/** The summers the ledger holds an edition for, oldest first (its rows' years). */
export const NBA_INTL_LEDGER_SUMMERS: readonly number[] = [2004, 2006, 2008, 2010, 2012, 2014, 2016, 2019, 2021, 2023, 2024, 2027, 2028, 2031, 2032];
/** The game's own calendar past the ledger: the first projected summer and every how many years (the ledger's cycles). */
export const NBA_INTL_GATE_CYCLES: readonly (readonly [number, number])[] = [[2036, 4], [2035, 4]];

/** Whether a summer holds an edition: the ledger's, or the game's own past it. */
export const nbaIntlIsEditionSummer = (summer: number): boolean =>
  NBA_INTL_LEDGER_SUMMERS.includes(summer) || NBA_INTL_GATE_CYCLES.some(([first, every]) => summer >= first && (summer - first) % every === 0);

/** The summer after the season labelled Y is Y + 1. */
export const nbaIntlSummerOf = (seasonYear: number): number => seasonYear + 1;

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

/** The NBA's face on the binding: the gate now, the whole module on demand. */
export const NBA_CAREER_INTL_LAZY: UsIntlLazy<NbaCareerState> = {
  pendingYear: nbaIntlPendingYear,
  curtainLine: c => (nbaIntlPendingYear(c) === null ? null : NBA_INTL_CURTAIN_LINE),
  load: () => import('@/lib/nbaCareerIntl').then(m => m.NBA_CAREER_INTL),
};
