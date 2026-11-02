import { useCallback, useRef, useState } from 'react';
import { SeasonCentreHelp, useHelpOnce, type HelpWords } from '@/components/season-centre/SeasonCentreHelp';
import { useBodyLock } from '@/components/season-centre/useBodyLock';
import { escapeCloses, focusDialogOnMount } from '@/lib/dialogA11y';
import type { MlbPlayoffReplayData } from '@/lib/season/mlbPlayoffReplay';

const HELP: HelpWords = {
  title: 'How the playoff replay works',
  intro: [
    'Your season has already been played. This replay follows the finish and team playoff game count on your saved season.',
    'The order of wins and losses is recreated. It always fits the same rounds and ending.',
    'Game scores and individual game stats were not saved.',
  ],
  controls: 'Show game result reveals one win or loss. Next playoff game moves on. Back to regular season returns to where you left it. Use ? to open these rules again.',
  examples: [{ head: 'First to two', body: 'Win, loss, win makes it 2-1. That series ends on the third game, then the next round begins.' }],
  footnote: 'This replay changes no result, stat, award or saved career data.',
};

export default function MlbPlayoffReplay({ replay, club, year, onBack, onClose }: {
  replay: MlbPlayoffReplayData;
  club: string;
  year: number;
  onBack: () => void;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [helpOpen, setHelpOpen] = useHelpOnce('seasonCentre:help:mlb-playoffs');
  const dialog = useRef<HTMLDivElement | null>(null);
  const setDialog = useCallback((element: HTMLDivElement | null) => { dialog.current = element; focusDialogOnMount(element); }, []);
  const closeHelp = () => { setHelpOpen(false); dialog.current?.focus(); };
  useBodyLock();
  const game = replay.games[index];
  const last = index === replay.games.length - 1;
  const mine = game.mine - (!revealed && game.won ? 1 : 0);
  const theirs = game.theirs - (!revealed && !game.won ? 1 : 0);
  const next = () => {
    if (!revealed || last) return;
    setIndex(index + 1);
    setRevealed(false);
  };
  const button = 'min-h-11 rounded-lg border border-border px-3 py-2 text-xs font-bold';
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-background/80 md:items-center md:p-4" data-mlb-playoff-replay>
      <div role="dialog" aria-modal="true" aria-label="Playoff replay" tabIndex={-1} ref={setDialog} onKeyDown={escapeCloses(onClose)}
        className="relative flex h-full w-full max-w-2xl flex-col overflow-hidden bg-background outline-none md:h-[min(760px,calc(100vh-2rem))] md:rounded-2xl md:border md:border-border">
        <header className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <h2 className="min-w-0 flex-1 text-sm font-black">Playoff replay</h2>
          <button type="button" className={`${button} min-w-11`} onClick={() => setHelpOpen(true)} aria-label={HELP.title}>?</button>
          <button type="button" className={button} onClick={onClose}>Back to your season</button>
          <p className="w-full break-words text-xs text-muted-foreground">{club} · {year}</p>
        </header>
        <main className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">A W/L replay built from your saved finish and team playoff game count.</p>
          <section className="space-y-3 rounded-xl border border-border bg-card p-4 text-center" data-mlb-playoff-game={index + 1}>
            <p className="text-xs text-muted-foreground">Playoff game {index + 1} of {replay.games.length}</p>
            <h3 className="text-base font-black">{game.round} · Game {game.no}</h3>
            <p className="text-sm font-bold tabular-nums" aria-live="polite">Series wins: {mine}-{theirs}</p>
            {revealed ? (
              <>
                <p className={`text-3xl font-black ${game.won ? 'text-emerald-400' : 'text-red-400'}`} data-mlb-playoff-result>{game.won ? 'Win' : 'Loss'}</p>
                {(game.mine === game.need || game.theirs === game.need) && <p className="text-sm font-semibold">{game.mine === game.need ? 'You win the series.' : 'Your playoff run ends here.'}</p>}
              </>
            ) : <p className="text-sm text-muted-foreground">Ready for this game?</p>}
          </section>
          {revealed && last && (
            <section className="space-y-2 rounded-xl border border-border bg-card p-3" data-mlb-playoff-finish>
              <h3 className="text-sm font-black">{replay.finish}</h3>
              {replay.line && <><p className="text-xs text-muted-foreground">Your saved playoff line</p><p className="text-sm font-semibold">{replay.line}</p></>}
            </section>
          )}
        </main>
        <footer className="flex flex-wrap gap-2 border-t border-border bg-card p-3">
          <button type="button" className={`${button} flex-1${revealed && last ? '' : ' bg-primary text-primary-foreground'}`}
            onClick={!revealed ? () => setRevealed(true) : !last ? next : () => { setIndex(0); setRevealed(false); }}>
            {!revealed ? 'Show game result' : !last ? 'Next playoff game' : 'Replay again'}
          </button>
          <button type="button" className={button} onClick={onBack}>Back to regular season</button>
        </footer>
        {helpOpen && <SeasonCentreHelp words={HELP} onClose={closeHelp} />}
      </div>
    </div>
  );
}
