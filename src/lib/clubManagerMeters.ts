/**
 * Round 465: the two meters that sit in the Club Manager header on every
 * tab. His words (docs/TWEAKS-2026-08-28.md, the Club Manager arc): "Two
 * meters, always visible: board patience (how close to fired) and fan mood."
 *
 * Both are pure functions of the save. Nothing in here draws a random
 * number, nothing in here is stored, and nothing in here changes the save
 * shape: a meter is a reading of what the engine already knows, taken fresh
 * on every render.
 *
 * THE BOARD METER IS THE SACKING RULE. The engine sacks a manager at exactly
 * one line, when boardConfidence reaches zero at the final whistle
 * (playMyMatch in src/lib/clubManager.ts), so the board meter is that number
 * and nothing else. A meter that read something prettier would be a
 * decoration, and a decoration in the header is a lie the player reads
 * fifty times a season. scripts/simClubManagerMeters.mjs holds that a
 * manager is sacked exactly when this meter says so, after every match of
 * many seeded seasons, and that no path between matches can leave it at
 * zero with the manager still in a job.
 *
 * THE FAN METER is derived, because the engine keeps no fan mood of its own
 * and Round 465 was not going to invent a second hidden number for the
 * board to read. It is built from four things a fan actually feels:
 *   results, recency weighted over this season's fixtures (the big term);
 *   the table against what the club expects of itself;
 *   the ticket policy on the Finances desk;
 *   trophies lifted this season.
 * The same harness measures how it tracks points per game over many seasons
 * and holds the correlation above a floor set from that measurement.
 */
import type { CareerState, FormResult } from '@/lib/clubManager';
import { eraClubDefFor, leaguePosition } from '@/lib/clubManager';

export type MeterTone = 'good' | 'mid' | 'bad';

export interface Meter {
  /** The exact number the engine holds, 0 to 100. */
  value: number;
  /** The integer the header prints. Zero only when the value is zero, so a
   *  manager on 0.3 never reads "0/100" while still in a job. */
  shown: number;
  /** The plain words for the band. */
  band: string;
  tone: MeterTone;
}

/* ---------------- the board ---------------- */

/** At or above this the board are not a story. Same line the header's bar
 *  has coloured green since Round 70 and confidenceLabel calls Secure. */
export const BOARD_SAFE = 60;
/**
 * Below this the words say one bad week can end it, and they have to be
 * true. Measured by scripts/simClubManagerMeters.mjs over its seeded
 * seasons (its own seed and SIM_SEED=1, 2, 3): the largest single week
 * fall in board confidence the engine produced was between 12 and 14, with
 * the 99th percentile of falls near 12. The edge sits under all of that,
 * so everything in the band is a number one measured week has wiped out.
 * If a fresh seed ever measures a largest fall under the edge, lower the
 * edge and the copy, never the other way round.
 */
export const BOARD_EDGE = 10;

export function boardBand(value: number): { band: string; tone: MeterTone } {
  if (value <= 0) return { band: 'Sacked', tone: 'bad' };
  if (value >= BOARD_SAFE) return { band: 'Safe', tone: 'good' };
  if (value >= BOARD_EDGE) return { band: 'Under pressure', tone: 'mid' };
  return { band: 'One bad week from the sack', tone: 'bad' };
}

export function boardMeter(state: Pick<CareerState, 'boardConfidence'>): Meter {
  const raw = state.boardConfidence;
  // A corrupt number fails closed to the floor rather than to a green bar.
  const value = typeof raw === 'number' && Number.isFinite(raw) ? clamp(raw, 0, 100) : 0;
  const shown = value <= 0 ? 0 : Math.max(1, Math.round(value));
  return { value, shown, ...boardBand(value) };
}

/* ---------------- the fans ---------------- */

/** Where the fans sit with nothing to go on. */
export const FAN_BASE = 55;
/** The full swing of the results term: every one of the weighted results a
 *  win adds this, every one a defeat takes it away. */
export const FAN_RESULT_WEIGHT = 34;
/** How much each older result counts against the one after it. */
export const FAN_RESULT_DECAY = 0.85;
/** How many of this season's results the fans still hold against you. */
export const FAN_RESULT_MEMORY = 12;
/** Points per place above or below the club's own expectation, and the cap. */
export const FAN_TABLE_PER_PLACE = 2.5;
export const FAN_TABLE_CAP = 15;
/** Fair prices, standard, premium, indexed like TICKET_TIERS. */
export const FAN_TICKET_TERMS = [4, 0, -5] as const;
/** Per trophy lifted this season, and the most they will add. */
export const FAN_TROPHY_TERM = 8;
export const FAN_TROPHY_CAP = 16;

export const FAN_SINGING = 65;
export const FAN_TURNING = 40;

const RESULT_VALUE: Record<FormResult, number> = { W: 1, D: 0, L: -1 };

export function fanBand(value: number, resultsSeen: number): { band: string; tone: MeterTone } {
  if (resultsSeen === 0) return { band: 'Hopeful', tone: 'mid' };
  if (value >= FAN_SINGING) return { band: 'Singing', tone: 'good' };
  if (value >= FAN_TURNING) return { band: 'Grumbling', tone: 'mid' };
  return { band: 'Turning', tone: 'bad' };
}

/** This season's results, newest first, from the log the stats centre reads
 *  or, on a save from before the log existed, the five the form dots show. */
function seasonResults(state: CareerState): FormResult[] {
  const log = Array.isArray(state.resultLog) ? state.resultLog : null;
  const fromLog = log
    ? log.map(e => e && e.res).filter((r): r is FormResult => r === 'W' || r === 'D' || r === 'L')
    : [];
  const fromForm = Array.isArray(state.form)
    ? state.form.filter((r): r is FormResult => r === 'W' || r === 'D' || r === 'L')
    : [];
  const list = fromLog.length ? fromLog : fromForm;
  return list.slice(-FAN_RESULT_MEMORY).reverse();
}

export interface FanTerms {
  results: number;
  table: number;
  tickets: number;
  trophies: number;
  resultsSeen: number;
}

export function fanTerms(state: CareerState): FanTerms {
  const results = seasonResults(state);
  let weight = 0;
  let sum = 0;
  results.forEach((r, k) => {
    const w = Math.pow(FAN_RESULT_DECAY, k);
    weight += w;
    sum += w * RESULT_VALUE[r];
  });
  const resultsTerm = weight > 0 ? FAN_RESULT_WEIGHT * (sum / weight) : 0;

  // The table only counts once my club has played a league game; before
  // that the order is whatever the shuffle left (Round 99's lesson).
  let tableTerm = 0;
  const myRow = Array.isArray(state.table) ? state.table.find(r => r && r.club === state.clubName) : undefined;
  const leaguePlayed = myRow ? (myRow.w ?? 0) + (myRow.d ?? 0) + (myRow.l ?? 0) : 0;
  if (myRow && leaguePlayed > 0) {
    const pos = leaguePosition(state);
    const expectation = eraClubDefFor(state.clubName, state.eraId).expectation;
    if (pos > 0 && Number.isFinite(expectation)) {
      tableTerm = clamp((expectation - pos) * FAN_TABLE_PER_PLACE, -FAN_TABLE_CAP, FAN_TABLE_CAP);
    }
  }

  const tier = state.finance?.ticketTier;
  const ticketsTerm = tier === 0 || tier === 1 || tier === 2 ? FAN_TICKET_TERMS[tier] : FAN_TICKET_TERMS[1];

  const lifted = Array.isArray(state.trophies)
    ? state.trophies.filter(t => t && t.season === state.season).length
    : 0;
  const trophiesTerm = Math.min(FAN_TROPHY_CAP, lifted * FAN_TROPHY_TERM);

  return { results: resultsTerm, table: tableTerm, tickets: ticketsTerm, trophies: trophiesTerm, resultsSeen: results.length };
}

export function fanMeter(state: CareerState): Meter {
  const t = fanTerms(state);
  const value = clamp(FAN_BASE + t.results + t.table + t.tickets + t.trophies, 0, 100);
  return { value, shown: Math.round(value), ...fanBand(value, t.resultsSeen) };
}

/** The label under a ticket tier on the Finances desk, so the desk says what
 *  the meter does: "+4 with the fans", "-5 with the fans". */
export function ticketFanLabel(tier: number): string {
  const term = FAN_TICKET_TERMS[tier as 0 | 1 | 2] ?? 0;
  if (term === 0) return 'The fans do not mind';
  return `${term > 0 ? '+' : ''}${term} with the fans`;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
