/* Round 1224: a postseason a front office can play a round at a time.

   A bracket is DATA (src/lib/finalsBracket.ts, Round 1014, resolves one:
   seeds, winners, losers and "the Nth best seeded of these winners", which is
   how a league that pairs its top seed with the lowest seed left is written).
   This file adds what a GM game needs on top and edits nothing there: a
   format with series lengths, a SAVE of a bracket in progress, the moves that
   play it (a game, a round, the rest), what a recap reads off it, and the
   guard and the repair a board runs when it loads one. The NFL's format is
   src/data/gmBrackets/nfl.ts; a best of seven league and a play in are held
   by the unit test, so the other three front offices bring data and a `play`.

   PURE: no clock, no randomness of its own, no storage. The caller's `play`
   does the drawing, so played with an engine's own game function and one
   generator a bracket spends that generator exactly as the engine's one
   press postseason does (scripts/simGmGameDay.mjs holds the NFL's to a
   recorded fixture, game for game and draw for draw).

   THE SAVE IS OPTIONAL, GUARDED AND REPAIRABLE. `isGmBracketSave` reads the
   outer shape and never throws; `bracketProblems` replays a save against its
   own frozen seeds; `repairGmBracket` hands back a sound save untouched and
   rebuilds anything else UNPLAYED (from its own seeds when they still read,
   else from fresh ones) with one line for the feed. A playoff game leaves a
   league as it found it and no title is counted until the last one, so a
   round played again double counts nothing. */
import { eliminated, finalsWeeks, premierOf, resolveSlot, type FinalsTie, type Pairing, type TieOutcome } from './finalsBracket';

/** A tie with the name of its round. `neutral` is for a card's words only: the first slot is still the one a `play` treats as home. */
export interface BracketTie extends FinalsTie { round: string; neutral?: boolean }

export interface BracketFormat {
  /** A save keeps the id of the format its season opened with. */
  id: string;
  /** How many clubs are seeded. */
  qualifiers: number;
  /** List order is play order inside a week. */
  ties: BracketTie[];
  /** Wins a tie takes, by bracket week (absent or 1: a single game). */
  winsNeeded: Record<number, number>;
  /** Tie ids in an older engine's own order, for `playBracketAll` (an engine that plays one conference to its end before the other). */
  order?: string[];
}

/** One game of a tie. Home and away are the TIE's two sides, whoever hosts that night. */
export interface BracketGame { homeScore: number; awayScore: number; winner: string }
export interface PlayedTie { id: string; home: string; away: string; games: BracketGame[] }
export interface GmBracketSave {
  v: 1;
  format: string;
  season: number;
  /** Frozen when the bracket opens: the list every pairing is resolved from. */
  seeds: string[];
  /** In the order the ties were first played. */
  played: PlayedTie[];
}

/** One game of a tie, drawn by the caller. `gameNo` is 1 for the first. */
export type PlayTie = (home: string, away: string, tie: BracketTie, gameNo: number) => BracketGame;

const winsFor = (format: BracketFormat, tie: FinalsTie): number => Math.max(1, format.winsNeeded[tie.week] ?? 1);

/** The winner and loser of a played tie, or null while neither side has the wins it takes. */
function outcomeOf(format: BracketFormat, tie: FinalsTie, p: PlayedTie): TieOutcome | null {
  const need = winsFor(format, tie);
  const home = p.games.filter(g => g.winner === p.home).length;
  const away = p.games.filter(g => g.winner === p.away).length;
  return home >= need ? { winner: p.home, loser: p.away } : away >= need ? { winner: p.away, loser: p.home } : null;
}

export function openBracket(format: BracketFormat, season: number, seeds: readonly string[]): GmBracketSave {
  return { v: 1, format: format.id, season, seeds: [...seeds], played: [] };
}

/** Decided ties only. */
export function bracketOutcomes(format: BracketFormat, save: GmBracketSave): Record<string, TieOutcome> {
  const out: Record<string, TieOutcome> = {};
  for (const p of save.played) {
    const tie = format.ties.find(t => t.id === p.id);
    const o = tie ? outcomeOf(format, tie, p) : null;
    if (o) out[p.id] = o;
  }
  return out;
}

/** The first week with an undecided tie, or null when the bracket is played out. */
export function bracketWeek(format: BracketFormat, save: GmBracketSave): number | null {
  const done = bracketOutcomes(format, save);
  return finalsWeeks(format.ties).find(w => format.ties.some(t => t.week === w && !done[t.id])) ?? null;
}

/** The two clubs of one tie, or null while a tie it draws from is undecided. */
function pairingOf(format: BracketFormat, save: GmBracketSave, tie: BracketTie, done: Record<string, TieOutcome>): Pairing | null {
  const homeId = resolveSlot(tie.home, save.seeds, done);
  const awayId = resolveSlot(tie.away, save.seeds, done);
  return homeId && awayId && homeId !== awayId ? { id: tie.id, week: tie.week, homeId, awayId } : null;
}

/** Every pairing of one week off the frozen seeds, or null if any of them cannot be named yet. */
export function bracketPairings(format: BracketFormat, save: GmBracketSave, week: number): Pairing[] | null {
  const done = bracketOutcomes(format, save);
  const out: Pairing[] = [];
  for (const tie of format.ties.filter(t => t.week === week)) {
    const p = pairingOf(format, save, tie, done);
    if (!p) return null;
    out.push(p);
  }
  return out;
}

/** One game of one tie. The save itself comes back when the tie is unknown, decided or cannot be named yet. Never mutates. */
export function playBracketGame(format: BracketFormat, save: GmBracketSave, tieId: string, play: PlayTie): GmBracketSave {
  const tie = format.ties.find(t => t.id === tieId);
  const done = bracketOutcomes(format, save);
  if (!tie || done[tieId]) return save;
  const pair = pairingOf(format, save, tie, done);
  if (!pair) return save;
  const before = save.played.find(p => p.id === tieId);
  const game = play(pair.homeId, pair.awayId, tie, (before?.games.length ?? 0) + 1);
  if (!game || (game.winner !== pair.homeId && game.winner !== pair.awayId)) throw new Error(`gmBracket: the game played for ${tieId} names a winner that is neither of its sides`);
  const entry: PlayedTie = { id: tieId, home: pair.homeId, away: pair.awayId, games: [...(before?.games ?? []), { homeScore: game.homeScore, awayScore: game.awayScore, winner: game.winner }] };
  return { ...save, seeds: [...save.seeds], played: before ? save.played.map(p => (p.id === tieId ? entry : p)) : [...save.played, entry] };
}

/** One tie played to its end. */
function playTieOut(format: BracketFormat, save: GmBracketSave, tieId: string, play: PlayTie): GmBracketSave {
  let s = save;
  for (;;) {
    const next = playBracketGame(format, s, tieId, play);
    if (next === s) return s;
    s = next;
  }
}

/** Every tie of the current week, each to its end, in list order. The week's pairings are named before any of them is played. */
export function playBracketWeek(format: BracketFormat, save: GmBracketSave, play: PlayTie): GmBracketSave {
  const week = bracketWeek(format, save);
  if (week === null || !bracketPairings(format, save, week)) return save;
  return format.ties.filter(t => t.week === week).reduce((s, t) => playTieOut(format, s, t.id, play), save);
}

/** The rest of the bracket: in `format.order` when the format has one, else week by week. */
export function playBracketAll(format: BracketFormat, save: GmBracketSave, play: PlayTie): GmBracketSave {
  if (format.order) return format.order.reduce((s, id) => playTieOut(format, s, id, play), save);
  let s = save;
  for (;;) {
    const next = playBracketWeek(format, s, play);
    if (next === s) return s;
    s = next;
  }
}

/** The champion, once the deciding tie is in. */
export function bracketChampion(format: BracketFormat, save: GmBracketSave): string | null {
  return premierOf(format.ties, bracketOutcomes(format, save))?.winner ?? null;
}

/** Clubs knocked out so far. */
export function bracketOut(format: BracketFormat, save: GmBracketSave): Set<string> {
  return eliminated(format.ties, save.seeds, format.qualifiers, bracketOutcomes(format, save));
}

/** The seeds that sit out the first week (1 is the top seed), lowest first. */
export function bracketByes(format: BracketFormat): number[] {
  const first = finalsWeeks(format.ties)[0];
  const inFirst = new Set(format.ties.filter(t => t.week === first).flatMap(t => [t.home, t.away]).flatMap(s => ('seed' in s ? [s.seed] : [])));
  return Array.from({ length: format.qualifiers }, (_, i) => i + 1).filter(n => !inFirst.has(n));
}

/** The games played so far by round, rounds in the format's own first seen order (a round with no game yet is left out). */
export function bracketRounds(format: BracketFormat, save: GmBracketSave): { name: string; games: (BracketGame & { home: string; away: string })[] }[] {
  const rounds: { name: string; games: (BracketGame & { home: string; away: string })[] }[] = [];
  for (const tie of format.ties) {
    const p = save.played.find(x => x.id === tie.id);
    if (!p || p.games.length === 0) continue;
    let round = rounds.find(r => r.name === tie.round);
    if (!round) { round = { name: tie.round, games: [] }; rounds.push(round); }
    for (const g of p.games) round.games.push({ home: p.home, away: p.away, homeScore: g.homeScore, awayScore: g.awayScore, winner: g.winner });
  }
  return rounds;
}

const isText = (x: unknown): x is string => typeof x === 'string' && x !== '';
const isCount = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0;
const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** The outer shape of a saved bracket: version 1, a format id, a season, a
 *  list of distinct club ids, and a list of played ties whose games hold two
 *  counts and a club id. It does not replay the bracket (`bracketProblems`
 *  does) and it never throws. */
export function isGmBracketSave(value: unknown, isClub: (id: string) => boolean): value is GmBracketSave {
  try {
    if (!isRecord(value) || value.v !== 1 || !isText(value.format) || !isCount(value.season)) return false;
    const club = (x: unknown): x is string => isText(x) && isClub(x) === true;
    if (!Array.isArray(value.seeds) || !value.seeds.every(club) || new Set(value.seeds).size !== value.seeds.length) return false;
    if (!Array.isArray(value.played)) return false;
    return value.played.every(p => isRecord(p) && isText(p.id) && club(p.home) && club(p.away) && p.home !== p.away && Array.isArray(p.games)
      && p.games.every(g => isRecord(g) && isCount(g.homeScore) && isCount(g.awayScore) && club(g.winner)));
  } catch {
    return false;
  }
}

/** Everything wrong with a saved bracket, found by replaying it against its
 *  own frozen seeds; [] is a sound save. Each played tie must be a tie of the
 *  format, played once, between the two clubs its slots name at that point,
 *  not before an earlier week is settled, with every game won by one of its
 *  two sides on the higher score, and no game after the tie was decided. */
export function bracketProblems(format: BracketFormat, save: GmBracketSave, isClub: (id: string) => boolean): string[] {
  if (!isGmBracketSave(save, isClub)) return ['the block does not read as a saved bracket'];
  const problems: string[] = [];
  if (save.format !== format.id) problems.push(`the save is of format ${save.format}, not ${format.id}`);
  if (save.seeds.length !== format.qualifiers) problems.push(`${save.seeds.length} seeds for a bracket of ${format.qualifiers}`);
  const done: Record<string, TieOutcome> = {};
  const seen = new Set<string>();
  for (const p of save.played) {
    const tie = format.ties.find(t => t.id === p.id);
    if (!tie) { problems.push(`${p.id} is not a tie of this bracket`); continue; }
    if (seen.has(p.id)) { problems.push(`${p.id} is played twice`); continue; }
    seen.add(p.id);
    const early = format.order ? undefined : format.ties.find(t => t.week < tie.week && !done[t.id]);
    if (early) problems.push(`${p.id} was played out of turn, before ${early.id} was settled`);
    const pair = pairingOf(format, save, tie, done);
    if (!pair) problems.push(`${p.id} was played before its two sides were known`);
    else if (pair.homeId !== p.home || pair.awayId !== p.away) problems.push(`${p.id} should be ${pair.homeId} against ${pair.awayId}, the save has ${p.home} against ${p.away}`);
    if (p.games.length === 0) problems.push(`${p.id} is listed with no game`);
    const need = winsFor(format, tie);
    let home = 0;
    let away = 0;
    p.games.forEach((g, i) => {
      if (home >= need || away >= need) problems.push(`${p.id} game ${i + 1} was played after the tie was decided`);
      if (g.winner !== p.home && g.winner !== p.away) problems.push(`${p.id} game ${i + 1} is won by ${g.winner}, who is not in it`);
      else if (g.homeScore === g.awayScore || (g.homeScore > g.awayScore) !== (g.winner === p.home)) problems.push(`${p.id} game ${i + 1} is won by the side on the lower score`);
      if (g.winner === p.home) home += 1; else if (g.winner === p.away) away += 1;
    });
    const o = outcomeOf(format, tie, p);
    if (o) done[p.id] = o;
  }
  return problems;
}

/** What a board says in its feed when a bracket had to be started again. */
export const BRACKET_REBUILT_LINES = {
  seeds: 'The playoff bracket on this save could not be read, so the playoffs start again from the same seeds.',
  fresh: 'The playoff bracket on this save could not be read, so the playoffs start again from the final standings.',
} as const;

export interface BracketRepair { save: GmBracketSave; rebuilt: null | 'seeds' | 'fresh'; line: string | null; problems: string[] }

/** The bracket a board plays on from after a load. A sound save of this
 *  season comes back as it is. Anything else is rebuilt UNPLAYED: from the
 *  block's own seeds when they are still a full list of this league's clubs
 *  for this season (and `seedsOk`, a league's own check, agrees), else from
 *  `freshSeeds()`. Never throws on a damaged block. */
export function repairGmBracket(
  format: BracketFormat, value: unknown, season: number, freshSeeds: () => readonly string[],
  isClub: (id: string) => boolean, seedsOk: (seeds: string[]) => boolean = () => true,
): BracketRepair {
  let problems: string[] = ['the block does not read as a saved bracket'];
  let kept: string[] | null = null;
  try {
    if (isGmBracketSave(value, isClub)) {
      problems = bracketProblems(format, value, isClub);
      if (value.season !== season) problems.push(`the block is of season ${value.season}, not ${season}`);
      if (problems.length === 0) return { save: value, rebuilt: null, line: null, problems };
    }
    const seeds = isRecord(value) && value.season === season && Array.isArray(value.seeds) ? value.seeds : null;
    if (seeds && seeds.length === format.qualifiers && new Set(seeds).size === seeds.length && seeds.every(s => isText(s) && isClub(s) === true) && seedsOk([...seeds]) === true) kept = [...seeds];
  } catch {
    kept = null;
  }
  return kept
    ? { save: openBracket(format, season, kept), rebuilt: 'seeds', line: BRACKET_REBUILT_LINES.seeds, problems }
    : { save: openBracket(format, season, freshSeeds()), rebuilt: 'fresh', line: BRACKET_REBUILT_LINES.fresh, problems };
}
