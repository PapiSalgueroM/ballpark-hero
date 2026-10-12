/* Round 1308: every word and number the bracket card prints, decided here
   so a unit test (src/lib/gmBracketView.test.ts) holds each of them. Sport
   free; it rides with the card (src/components/front-office-shared/
   GmBracketCard.tsx) and never sits static in a board's chunk, because only
   a drawn card reads it and a module is never split across chunks.

   THE PLACE LINE says where his club stands in six kinds and states no rule
   the engine does not play: it names the round he is in, the club he meets
   only once the bracket can name it (`bracketPairings`), and nothing about
   who goes through or who hosts (the "?" explains the seeding and the title
   game's site). Clubs are words a board hands over; nobody is quoted.

   No clock, no randomness, no storage. */
import { bracketChampion, bracketOut, bracketOutcomes, bracketPairings, bracketWeek, type BracketFormat, type BracketTie, type GmBracketSave } from './gmBracket';
import { finalTie, finalsWeeks, resolveSlot } from './finalsBracket';

/** Where his club stands, the one line the card prints above the ties, and the tie it is about (null: none). */
export interface GmBracketPlace { kind: 'bye' | 'next' | 'through' | 'out' | 'champion' | 'missed'; line: string; tie: string | null }

/** The lines of the six kinds, as patterns over a round's name and a club's name. A club beaten in the title tie
 *  is out too, and its line says so the way a fan would ("Lost the Super Bowl."). */
export const GM_BRACKET_LINES = {
  bye: 'You have the bye.',
  next: (round: string, against: string | null): string => (against ? `Next: the ${round}, against ${against}.` : `Next: the ${round}.`),
  through: 'Through. The rest of this round is still to play.',
  out: (round: string): string => `Out in the ${round}.`,
  lostFinal: (round: string): string => `Lost the ${round}.`,
  champion: 'Champions.',
  missed: 'No playoffs this year.',
} as const;

/** What the card prints for a side the bracket cannot name yet. */
export const GM_BRACKET_UNKNOWN = 'To be decided';

/** The tie of a week whose slots name this club, or undefined. */
function tieOf(format: BracketFormat, save: GmBracketSave, week: number, club: string): BracketTie | undefined {
  const done = bracketOutcomes(format, save);
  return format.ties.filter(t => t.week === week).find(t => resolveSlot(t.home, save.seeds, done) === club || resolveSlot(t.away, save.seeds, done) === club);
}

export function gmBracketPlace(format: BracketFormat, save: GmBracketSave, club: string, name: (id: string) => string): GmBracketPlace {
  if (!save.seeds.includes(club)) return { kind: 'missed', line: GM_BRACKET_LINES.missed, tie: null };
  if (bracketChampion(format, save) === club) return { kind: 'champion', line: GM_BRACKET_LINES.champion, tie: finalTie(format.ties)?.id ?? null };
  const done = bracketOutcomes(format, save);
  if (bracketOut(format, save).has(club)) {
    /* the last tie he lost in the data's order: in a play in, losing the first game is not yet going out */
    const lost = [...format.ties].reverse().find(t => done[t.id]?.loser === club);
    const line = !lost ? GM_BRACKET_LINES.out('playoffs') : lost.id === finalTie(format.ties)?.id ? GM_BRACKET_LINES.lostFinal(lost.round) : GM_BRACKET_LINES.out(lost.round);
    return { kind: 'out', line, tie: lost ? lost.id : null };
  }
  const week = bracketWeek(format, save);
  /* played out with another champion: only a save the repair would rebuild gets here */
  if (week === null) return { kind: 'out', line: GM_BRACKET_LINES.out('playoffs'), tie: null };
  const mine = tieOf(format, save, week, club);
  if (!mine) return { kind: 'bye', line: GM_BRACKET_LINES.bye, tie: null };
  if (done[mine.id]) return { kind: 'through', line: GM_BRACKET_LINES.through, tie: mine.id };
  const pair = bracketPairings(format, save, week)?.find(p => p.id === mine.id);
  const other = pair ? (pair.homeId === club ? pair.awayId : pair.homeId) : null;
  return { kind: 'next', line: GM_BRACKET_LINES.next(mine.round, other ? name(other) : null), tie: mine.id };
}

/** The bracket's weeks in order, and the one the card opens on: the week to play next, or the last once it is all played. */
export function gmBracketWeeks(format: BracketFormat, save: GmBracketSave): { weeks: number[]; open: number } {
  const weeks = finalsWeeks(format.ties);
  return { weeks, open: bracketWeek(format, save) ?? weeks[weeks.length - 1] };
}

/** One side of a tie as the card draws it. `score`: a one game tie's final for this side once played; a series shows `wins`. */
export interface GmBracketSide { club: string | null; wins: number; score: number | null; won: boolean; out: boolean }
/** One tie of a week as the card draws it, the first slot first (`neutral`: a site picked beforehand, said by the "?"). */
export interface GmBracketRow { id: string; round: string; neutral: boolean; series: boolean; played: number; decided: boolean; mine: boolean; sides: [GmBracketSide, GmBracketSide] }

export function gmBracketRows(format: BracketFormat, save: GmBracketSave, week: number, club: string): GmBracketRow[] {
  const done = bracketOutcomes(format, save);
  const out = bracketOut(format, save);
  return format.ties.filter(t => t.week === week).map(t => {
    const p = save.played.find(x => x.id === t.id);
    const series = Math.max(1, format.winsNeeded[t.week] ?? 1) > 1;
    const ids = p ? [p.home, p.away] : [resolveSlot(t.home, save.seeds, done), resolveSlot(t.away, save.seeds, done)];
    const side = (k: 0 | 1): GmBracketSide => {
      const id = ids[k];
      const wins = p && id ? p.games.filter(g => g.winner === id).length : 0;
      const one = !series && p && p.games.length > 0 ? p.games[p.games.length - 1] : null;
      return { club: id, wins, score: one ? (k === 0 ? one.homeScore : one.awayScore) : null, won: !!id && done[t.id]?.winner === id, out: !!id && out.has(id) };
    };
    return { id: t.id, round: t.round, neutral: t.neutral === true, series, played: p ? p.games.length : 0, decided: !!done[t.id], mine: ids.includes(club), sides: [side(0), side(1)] };
  });
}

/** A seed in front of a club's name ("3"), or nothing for a club the sport gives no seed. */
export const gmSeedText = (seed: number | null): string => (seed === null ? '' : String(seed));

/** What a side shows on the right: a one game tie's score, a series' wins, or nothing before a game. */
export function gmSideText(row: GmBracketRow, k: 0 | 1): string {
  const s = row.sides[k];
  if (row.series) return row.played > 0 ? String(s.wins) : '';
  return s.score === null ? '' : String(s.score);
}

/** The line under a series: before its first game ("First to 4 wins."), under way ("3 played, first to 4 wins.") or
 *  over ("Over in 7 games."), or null for a single game. */
export function gmSeriesNote(format: BracketFormat, row: GmBracketRow, week: number): string | null {
  if (!row.series) return null;
  const need = Math.max(1, format.winsNeeded[week] ?? 1);
  if (row.played === 0) return `First to ${need} wins.`;
  return row.decided ? `Over in ${row.played} games.` : `${row.played} played, first to ${need} wins.`;
}

/** The card's title and the names of its own controls. */
export const GM_BRACKET_WORDS = { title: 'Playoffs', yourGame: 'Your game', help: 'How the playoffs work', weeks: 'Playoff rounds' } as const;
