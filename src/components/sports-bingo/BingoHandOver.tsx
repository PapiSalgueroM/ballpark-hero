import { PACK_COUNT } from '@/lib/sportsBingo';

/**
 * Round 727: the screen the phone changes hands on. It is handed a name and a
 * pack number and NOTHING ELSE, so no card, no pack and no square can be on
 * it while the last seat's board is being passed across the table.
 * scripts/simBingoSeats.mjs reads this file and the element the page draws
 * it with, and fails on any reading of the deal reaching either.
 */
interface BingoHandOverProps {
  /** The seat about to take the phone. */
  name: string;
  /** 1 based. */
  packNumber: number;
  /** Nobody has taken a turn yet. */
  first: boolean;
  /** A CPU seat (or several) played the pack just before this seat. */
  cpuPlayed: string[];
  onReady: () => void;
  onQuit: () => void;
}

export function BingoHandOver({ name, packNumber, first, cpuPlayed, onReady, onQuit }: BingoHandOverProps) {
  return (
    <div className="mx-auto max-w-sm">
      <div className="rounded-2xl border border-primary/40 bg-card p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {first ? 'First up' : 'Pass the phone'}
        </p>
        <p className="mt-2 font-display text-2xl font-black text-foreground">{name}</p>
        <p className="text-sm text-muted-foreground">Pack {packNumber} of {PACK_COUNT} is next</p>
        {cpuPlayed.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {cpuPlayed.join(' and ')} already took {cpuPlayed.length === 1 ? 'its' : 'their'} turn on this pack.
          </p>
        )}
        <p className="mt-3 text-sm text-muted-foreground">
          {first
            ? 'Everyone else, eyes off the screen while a turn is open.'
            : 'Everyone else, eyes off the screen. The last card is put away and none of it is showing.'}
        </p>
        <button
          onClick={onReady}
          className="mt-4 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
        >
          I'm {name}, show me the pack
        </button>
      </div>
      <button onClick={onQuit} className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-destructive">
        Quit this game
      </button>
    </div>
  );
}

export default BingoHandOver;
