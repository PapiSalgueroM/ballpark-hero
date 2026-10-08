/* Round 1048: the Season Centre's record panel, for a season with a won and
   lost record and no table (record mode): the record after the games played
   so far, home and away, the streak, the last ten, the record against each
   group the model names (a division, a conference), and his game log, newest
   first. It reads the derived season and draws nothing of its own.

   Desktop: it fills the right column and the log scrolls with it. Phone
   (`compact`): the record is one tile and the log sits behind a tile button
   that swaps the tile for the log, with a back button above it, in a box of
   fixed height that scrolls inside itself, so nothing under it moves.
   Sport neutral: wins, losses and level games only. */
import { useState } from 'react';
import type { DerivedGame } from '@/lib/season/core';
import type { CentreModel } from './SeasonCentre';

interface Props {
  model: CentreModel;
  /** Games played so far (the round number of the last one finished). */
  played: number;
  compact: boolean;
  reduced?: boolean;
  /** The letter a level game prints. */
  tie?: string;
  /** Slots grouped for a record against each ("Division", "Conference"). */
  groups?: { label: string; slots: number[] }[];
  /** A short name for the phone's log rows ("OKC"). */
  short?: (name: string) => string;
}

type Res = 'W' | 'D' | 'L';
const resOf = (g: DerivedGame): Res => (g.us > g.them ? 'W' : g.us < g.them ? 'L' : 'D');
const PILL: Record<Res, string> = { W: 'bg-emerald-500/20 text-emerald-400', D: 'bg-muted text-muted-foreground', L: 'bg-red-500/20 text-red-400' };

/** "24-17", with the level games added only when there is one ("9-7-1"). */
export function recordOf(games: readonly DerivedGame[]): string {
  let w = 0; let l = 0; let d = 0;
  for (const g of games) { const r = resOf(g); if (r === 'W') w += 1; else if (r === 'L') l += 1; else d += 1; }
  return d > 0 ? `${w}-${l}-${d}` : `${w}-${l}`;
}

/** "W3": the run the last game extended. Empty before a game is played. */
export function streakOf(games: readonly DerivedGame[], tie: string): string {
  if (games.length === 0) return '';
  const last = resOf(games[games.length - 1]);
  let n = 0;
  for (let i = games.length - 1; i >= 0 && resOf(games[i]) === last; i -= 1) n += 1;
  return `${last === 'D' ? tie : last}${n}`;
}

export function RecordPanel({ model, played, compact, reduced = false, tie = 'D', groups, short }: Props) {
  const [logOpen, setLogOpen] = useState(false);
  const { season: s, names, words } = model;
  const done = s.games.filter(g => g.md <= played);
  const rec = recordOf(done);
  const letter = (r: Res) => (r === 'D' ? tie : r);
  const nameOf = (g: DerivedGame) => (compact && short ? short(names[g.opp]) : names[g.opp]);
  const log = (
    <ol className="space-y-1 text-[11px]" data-game-log>
      {done.length === 0 && <li className="text-muted-foreground">No games yet.</li>}
      {[...done].reverse().map(g => {
        const r = resOf(g);
        return (
          <li key={g.md} className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5" data-log-row={g.md}>
            <span className="tabular-nums text-muted-foreground">G{g.md}</span>
            <span className="text-muted-foreground">{g.home ? 'H' : 'A'}</span>
            <span className={names[g.opp] === words.unnamed ? 'italic text-muted-foreground' : 'font-semibold'}>{nameOf(g)}</span>
            <span className={`rounded px-1 font-bold tabular-nums ${PILL[r]}`}>{letter(r)} {g.us}-{g.them}</span>
            <span className="tabular-nums">{g.played ? model.sport.lineOf(g).bits.join(' ') : model.sport.missed(g.why)}</span>
          </li>
        );
      })}
    </ol>
  );
  if (compact && logOpen) {
    return (
      <div className="space-y-2" data-record-panel data-record={rec}>
        <button type="button" onClick={() => setLogOpen(false)} className="h-10 rounded-lg border border-border px-3 text-xs font-semibold">← Back</button>
        <div className="h-48 overflow-y-auto rounded-lg bg-muted/30 p-2">{log}</div>
      </div>
    );
  }
  const home = done.filter(g => g.home);
  const away = done.filter(g => !g.home);
  const streak = streakOf(done, tie);
  return (
    <div className="space-y-2" data-record-panel data-record={rec}>
      <div className="rounded-lg bg-muted/30 p-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-bold">{played === 0 ? 'Before the first game' : `After ${words.round.toLowerCase()} ${played}`}</span>
          <span key={rec} className={`${reduced ? '' : 'cm-tick-in'} text-2xl font-black tabular-nums`} data-record-chip>{rec}</span>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          <span>Home {recordOf(home)}</span>
          <span>Away {recordOf(away)}</span>
          {streak && <span>Streak {streak}</span>}
          {(groups ?? []).map(gr => <span key={gr.label}>{gr.label} {recordOf(done.filter(g => gr.slots.includes(g.opp)))}</span>)}
        </div>
        {done.length > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px]" data-last-ten>
            <span className="mr-0.5 text-muted-foreground">Last {Math.min(10, done.length)}:</span>
            {done.slice(-10).map(g => <span key={g.md} className={`rounded px-1 font-bold ${PILL[resOf(g)]}`}>{letter(resOf(g))}</span>)}
          </div>
        )}
      </div>
      {compact
        ? <button type="button" onClick={() => setLogOpen(true)} className="h-10 w-full rounded-lg border border-border text-xs font-semibold" data-game-log-open>📋 Game log</button>
        : <div><div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Game log</div>{log}</div>}
    </div>
  );
}
