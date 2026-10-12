/* Round 1320: the glue between the athletic director (src/lib/collegeSeat.ts)
   and a college dynasty's state, written once for both sports.

   collegeSeat.ts never sees a save: it reads a CollegeLeagueView. Every write
   the seat makes into a dynasty's state lives here, so the board, both sport
   descriptors and scripts/simCollegeSeat.mjs run the same lines:
   - the start (a new dynasty gets the athletic director) and the opt in (an
     older dynasty takes him at the first press of a season);
   - the first press of a season (the ask for the season is stored);
   - the close (the season graded off the national bracket only);
   - the move (exactly myTeam and lastRivalry change in the engine's state);
   - the year out (a whole season with nobody in his chair, played through the
     sport's own steps, in the board's order);
   - the load rules (a stored seat checked, and where a save opens).

   Each sport's binding (src/lib/cfbSeatBind.ts, src/lib/cbbSeatBind.ts) says
   how to read its state as a view and where its bracket is, and imports only
   its own engine, so a page never loads the other sport. The seat writes no
   engine field until a move or a firing; a move writes exactly myTeam and
   lastRivalry. */

import {
  bracketOutcome, collegeClose, collegeCanSitOut, collegeSeasonStart, collegeSeatLoad, collegeSitOut, holdsSeat,
  newCollegeSeat, sanitizeCollegeSeat, seasonClosed,
  type CollegeCloseResult, type CollegeLeagueView, type CollegeMove, type CollegeSeatBlock, type CollegeSeatSport,
} from '@/lib/collegeSeat';

export interface CollegeBracketGame { home: string; away: string; winner: string }

/** One sport's binding: its state read as the seat's view, and its national bracket. */
export interface CollegeSeatBinding<S, R> {
  sport: CollegeSeatSport;
  view: (st: S) => CollegeLeagueView;
  /** The national postseason of a closed season, never a conference game. */
  bracketOf: (recap: R) => readonly CollegeBracketGame[];
  /** How many make the field: CFB 12, CBB 32. */
  fieldSize: number;
}

/** The part of a college dynasty's state the seat touches. */
export interface CollegeSeatState {
  season: number;
  round: number;
  myTeam: string;
  seat?: CollegeSeatBlock;
  lastRivalry?: unknown;
}

/** A new dynasty starts with the athletic director. Draws nothing. */
export function startCollegeSeat<S extends CollegeSeatState>(st: S, b: CollegeSeatBinding<S, unknown>): void {
  st.seat = newCollegeSeat(b.view(st));
}

/** An older dynasty takes the athletic director: only at the first press of a season. */
export function optInCollegeSeat<S extends CollegeSeatState>(st: S, b: CollegeSeatBinding<S, unknown>): boolean {
  if (st.seat || st.round !== 1) return false;
  st.seat = newCollegeSeat(b.view(st));
  return true;
}

/** The first press of a season stores its ask (an ask already set for the season, an offer's, is kept). */
export function collegeSeatFirstPress<S extends CollegeSeatState>(st: S, b: CollegeSeatBinding<S, unknown>): void {
  if (!st.seat || st.round !== 1) return;
  const next = collegeSeasonStart(st.seat, b.view(st));
  if (next !== st.seat) st.seat = next;
}

/** The close: after the engine closed the season (champion on record), grade it off the national bracket. */
export function applyCollegeClose<S extends CollegeSeatState, R>(st: S, b: CollegeSeatBinding<S, R>, recap: R): CollegeCloseResult | null {
  if (!st.seat) return null;
  const view = b.view(st);
  const me = view.programs.find(p => p.id === st.myTeam);
  const res = collegeClose(st.seat, view, bracketOutcome(b.bracketOf(recap), st.myTeam, me?.wins ?? 0));
  if (res) st.seat = res.block;
  return res;
}

/** The move: his new program and his seat. In the engine's state exactly myTeam
    and lastRivalry change (the rivalry swing belonged to the program that played it). */
export function applyCollegeMove<S extends CollegeSeatState>(st: S, move: CollegeMove): void {
  st.myTeam = move.myTeam;
  if ('lastRivalry' in st) st.lastRivalry = null;
  st.seat = move.block;
}

/** The sport's own steps a year out plays, the board's descriptor methods by name. */
export interface CollegeYearOutSteps<S, R> {
  rounds: number;
  openOffseason: (st: S, rng: () => number) => string[];
  offseason: (st: S, rng: () => number) => string[];
  enableDepth: (st: S, rng: () => number) => void;
  playRound: (st: S, rng: () => number, ctx: { label: (id: string) => string; rivalry: (id: string) => string }) => unknown;
  closeSeason: (st: S, rng: () => number) => R;
}

export type CollegeYearOutRefusal = 'no-seat' | 'in-seat' | 'season-open' | 'market-closed' | 'broken-season';
export type CollegeYearOut<S, R> = { ok: true; st: S; recap: R } | { ok: false; reason: CollegeYearOutRefusal };

const QUIET_CTX = { label: (id: string) => id, rivalry: () => '' };

/**
 * A season he sits out, in the board's order, on a copy: the offseason of the
 * season just closed (no class, no portal and no hire for him), the program
 * layer if an old save never had it, every round, then the close. Nobody coaches
 * the program that let him go, which stays the engine's myTeam for the season,
 * so a coordinator it loses that offseason is not replaced until the next one
 * (the empty chair, named in the card's rules). His titles and seasons played
 * are not touched and no recap is drawn for him. Refused while he holds a seat,
 * while the season is still open, and when next year is shut. The engine draws
 * from rng like every press. After it the season is exactly one higher with its
 * champion on record and his record shows one more year out, or the copy is
 * thrown away.
 */
export function collegeYearOut<S extends CollegeSeatState & { depth?: number }, R>(
  st: S, b: CollegeSeatBinding<S, R>, steps: CollegeYearOutSteps<S, R>, rng: () => number,
): CollegeYearOut<S, R> {
  if (!st.seat) return { ok: false, reason: 'no-seat' };
  const view = b.view(st);
  if (holdsSeat(st.seat)) return { ok: false, reason: 'in-seat' };
  if (!seasonClosed(view)) return { ok: false, reason: 'season-open' };
  if (!collegeCanSitOut(st.seat, view)) return { ok: false, reason: 'market-closed' };
  const copy: S = JSON.parse(JSON.stringify(st));
  steps.openOffseason(copy, rng);
  steps.offseason(copy, rng);
  if (!copy.depth) steps.enableDepth(copy, rng);
  let recap: R | null = null;
  for (let i = 0; i < steps.rounds && recap === null; i++) {
    steps.playRound(copy, rng, QUIET_CTX);
    if (copy.round >= steps.rounds) recap = steps.closeSeason(copy, rng);
    else copy.round += 1;
  }
  if (recap === null || copy.season !== st.season + 1 || !seasonClosed(b.view(copy))) return { ok: false, reason: 'broken-season' };
  copy.seat = collegeSitOut(st.seat, view);
  return { ok: true, st: copy, recap };
}

/**
 * The load rules (collegeSeat.collegeSeatLoad), applied to a parsed save in
 * memory: a stored seat that does not check out is dropped alone, a seat whose
 * stint ended on a path no build writes is dropped alone, and the answer says
 * where the save opens (null: as saved).
 */
export function collegeSeatOnLoad<S extends CollegeSeatState>(
  st: S, phase: string, b: CollegeSeatBinding<S, unknown>,
): 'market' | 'recruit' | 'season' | null {
  const view = b.view(st);
  if (st.seat !== undefined) {
    const ok = sanitizeCollegeSeat(st.seat, { season: st.season, myTeam: st.myTeam, programIds: new Set(view.programs.map(p => p.id)) });
    if (ok) st.seat = ok;
    else delete st.seat;
  }
  const rule = collegeSeatLoad(st.seat ?? null, phase, seasonClosed(view));
  if (rule.dropSeat) delete st.seat;
  return rule.open;
}
