/* Round 1308: what the four front offices share to play a postseason a round
   at a time, the press and load half. Sport free, no React.

   A sport hands its bracket over once (`GmPostseasonSport`: the year's format
   from its sourced data, the seeds as its engine seeds them, its own check of
   a seed list, what a club is, and the period one above its last regular
   one), and the bracket machine (src/lib/gmBracket.ts, not edited) does the
   rest. The NFL's is src/lib/frontOfficePostseason.ts.

   THIS FILE RIDES IN A BOARD'S OWN CHUNK (a press and a load need it the same
   tick), so it holds nothing only a drawn card reads: the place line and
   every other word of the bracket card are in src/lib/gmBracketView.ts, which
   rides with the card. A module is never split across chunks.

   ASK FIRST, REPAIR SECOND. `repairGmBracket` answers an absent block like a
   damaged one (it rebuilds it and prints that it could not be read), so a
   board asks `inGmPostseason` before it hands a block over, and outside the
   postseason the answer is null whatever the save holds.

   NEVER THROWS, AND READS NOTHING OF A VERSION IT DOES NOT KNOW. A block
   whose `v` is not 1 is handed to the repair as absent, so the rebuild is
   from the engine's own seeds and no field of that block is read (the repair
   itself keeps a block's seeds without asking its version). Two things no
   repair can mend are a refusal, which a board turns into its save error
   screen: a season the sport has no bracket for, and a league whose own
   seeds do not open one (a doctored league with too few clubs in a
   conference). No clock, no randomness, no storage. */
import { repairGmBracket, type BracketFormat, type BracketRepair, type GmBracketSave } from './gmBracket';

/** What a sport hands the postseason, so no board retypes it. */
export interface GmPostseasonSport<L> {
  /** The year's bracket from the sport's sourced data, or null: no bracket is offered for that season. */
  formatFor(season: number): BracketFormat | null;
  /** The seeds as the engine itself seeds them, in the data's order. */
  seeds(league: L): string[];
  /** The league's own check of a seed list (the NFL: fourteen clubs of this league, the AFC's seven then the NFC's). */
  seedsOk(seeds: string[], league: L): boolean;
  /** A real membership test (Object.hasOwn on the league's clubs): a bare lookup says yes to `constructor`. */
  isClub(league: L): (id: string) => boolean;
  /** The period one above the last regular one (18 in the NFL). */
  bracketPeriod: number;
}

/** In its postseason: in the hub, at the bracket period, with no champion for its season yet. */
export function inGmPostseason(at: { period: number; phase: string; seasonHasChampion: boolean }, bracketPeriod: number): boolean {
  return at.phase === 'hub' && at.period === bracketPeriod && at.seasonHasChampion !== true;
}

/** Why a save in its postseason cannot be played: the save error screen's case, never a quiet rebuild. */
export type GmPostseasonRefusal = 'no-format' | 'no-bracket';

/** What a load hands a board: the bracket to play on (with the repair's feed line when it had to start
 *  it again), or a refusal. */
export type GmPostseasonLoad =
  | { kind: 'bracket'; format: BracketFormat; repair: BracketRepair }
  | { kind: 'refused'; refused: GmPostseasonRefusal; why: string };

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** The bracket a board plays on after a load, or null when the save should hold none (outside the
 *  postseason, whatever the block). Never throws. */
export function loadGmPostseason<L>(sport: GmPostseasonSport<L>, league: L, season: number, inPostseason: boolean, block: unknown): GmPostseasonLoad | null {
  if (!inPostseason) return null;
  let format: BracketFormat | null = null;
  try {
    format = sport.formatFor(season);
  } catch {
    format = null;
  }
  if (!format) return { kind: 'refused', refused: 'no-format', why: `there is no playoff bracket for the ${season} season` };
  /* a version this build does not know is read as nothing at all (and a block that throws when asked is one) */
  let known: unknown;
  try {
    known = isRecord(block) && block.v === 1 ? block : undefined;
  } catch {
    known = undefined;
  }
  try {
    const isClub = sport.isClub(league);
    const repair = repairGmBracket(format, known, season, () => sport.seeds(league), isClub, seeds => sport.seedsOk(seeds, league));
    return { kind: 'bracket', format, repair };
  } catch (e) {
    return { kind: 'refused', refused: 'no-bracket', why: e instanceof Error ? e.message : 'the league does not open a playoff bracket' };
  }
}

/** What a board hands its bracket card (a type only: nothing of the card is in a board's chunk). Sport free: a
 *  bound card (the NFL's is src/components/front-office/NflBracket.tsx) adds the "?", the seed numbers and the
 *  week names. THE CARD HOLDS NO PRESS: playing a round, watching it and the rest are the board's own buttons. */
export interface GmBracketMount {
  format: BracketFormat;
  save: GmBracketSave;
  /** His club, and a club's name as a sentence and a row use it. */
  my: string;
  name(id: string): string;
  /** "Your game" on a decided tie of his: the board opens his game of that tie on the tile, in the same box. */
  onOpenGame(tieId: string): void;
  /** Where the "?" sheet is put: an empty element inside the board's week box (as the Game Day tile's); null: not there yet. */
  helpHost: HTMLElement | null;
}
