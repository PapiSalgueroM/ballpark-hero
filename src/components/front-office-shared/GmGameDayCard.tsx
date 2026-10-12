/* Round 1307: a front office's Game Day tile. One box, three faces.

   The board owns the box (GM_GAME_DAY_BOX, src/lib/gmGameLog.ts: one height
   a breakpoint) and this card fills it, so the page is the same height
   while the card's chunk is on its way, on every face and after every
   press. Inside it ONE part scrolls, the story of the game (the shape
   sentence and the plays that decided it, `data-gameday-scroll`); the row
   of season chips scrolls sideways inside itself. Nothing else may be
   taller or wider than its own frame: scripts/playFrontOfficeGameDay.mjs
   asks that of every element in the box at 320, 390 and 1280.

   THE FACES. `next`: nothing told yet, his next game in the board's words.
   `watch`: the match clock (src/components/season-centre/MatchClock.tsx,
   mounted as it is) on the open game with 1x, 3x and Results; NOTHING of
   the result is in the box until the clock is done. `result`: the final,
   the score by period, the story, where he stands, and his season so far
   as chips; a chip opens that game on the same box.

   WATCH IS NOT A SECOND GAME. The game was played and saved by the press;
   the clock tells that saved final again from a stream keyed to it, so a
   reload in the middle shows the result and plays nothing twice. With
   reduced motion, or for a final the law will not tell, there is no clock:
   the result is shown at once and the board is told so (`onWatched`).

   Every word and number comes from src/lib/gmGameDayView.ts, where a unit
   test holds it to the law. No animation class of its own; the clock
   brings the only motion and it stops for reduced motion.

   The "?" is the Season Center's sheet (not edited), drawn over the
   board's whole week box (`helpHost`) and not over this box, where six
   paragraphs and a worked example would be read through a slot. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MatchClock, type ClockSpeed } from '@/components/season-centre/MatchClock';
import { SeasonCentreHelp, type HelpWords } from '@/components/season-centre/SeasonCentreHelp';
import type { GameDayLaw } from '@/lib/gmGameDay';
import type { GmGameDayMount } from '@/lib/gmGameLog';
import { fixtureLine, gameDayClock, gameDayView, logChips, standingLine } from '@/lib/gmGameDayView';

export interface GmGameDayProps extends GmGameDayMount {
  law: GameDayLaw;
  help: HelpWords;
  /** A log entry's `where` in a few letters a chip can hold ("w6" reads "Wk 6"). */
  whereLabel(where: string): string;
}

const reducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const SPEEDS: { speed: ClockSpeed; text: string }[] = [{ speed: 1, text: '1x' }, { speed: 3, text: '3x' }, { speed: 'results', text: 'Results' }];
const ROUND_BUTTON = 'inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-xs font-bold text-foreground hover:bg-muted/40';

export function GmGameDayCard({ law, help, whereLabel, log, my, name, short, next, nextNote, mode, onWatched, standing, helpHost }: GmGameDayProps) {
  /* which game is open (null: the last one), whether he asked to watch an open game again, the clock's speed, the "?" */
  const [open, setOpen] = useState<number | null>(null);
  const [again, setAgain] = useState(false);
  const [speed, setSpeed] = useState<ClockSpeed>(1);
  const [helpOpen, setHelpOpen] = useState(false);
  const [reduced] = useState(reducedMotion);
  const chipRow = useRef<HTMLDivElement | null>(null);
  const helpButton = useRef<HTMLButtonElement | null>(null);
  /* THE "?" MUST NOT MOVE THE PAGE FOR NOTHING. The sheet takes the focus when it opens, and a browser brings a
     focused box into view by scrolling the page. When the top of the box the sheet lies over was already readable
     (the reveal hook's own measure: on screen with 160 px of it showing), that scroll is a jump, so the page is put
     back where it was before anything is painted. When the top was off screen the browser's scroll stands. */
  const scrollAt = useRef<number | null>(null);
  const openHelp = () => {
    const over = (helpHost?.parentElement ?? helpButton.current?.closest('[data-gameday]'))?.getBoundingClientRect();
    scrollAt.current = over && over.top >= 0 && window.innerHeight - over.top >= 160 ? window.scrollY : null;
    setHelpOpen(true);
  };
  useLayoutEffect(() => {
    const y = scrollAt.current;
    scrollAt.current = null;
    if (helpOpen && y !== null && window.scrollY !== y) window.scrollTo({ top: y, behavior: 'instant' as ScrollBehavior });
  }, [helpOpen]);

  const index = open !== null && open < log.length ? open : log.length - 1;
  const last = index >= 0 ? log[index] : null;
  const view = last ? gameDayView(law, last, my, name) : null;
  const canWatch = !!view?.game && !reduced;
  const asked = mode === 'watch' || again;
  const watching = asked && canWatch;

  /* asked to watch a game there is no clock for: say at once that the watch is over */
  const nothingToWatch = mode === 'watch' && !canWatch;
  useEffect(() => { if (nothingToWatch) onWatched(); }, [nothingToWatch, onWatched]);
  /* the newest chip is the one in view */
  useEffect(() => { const el = chipRow.current; if (el) el.scrollLeft = el.scrollWidth; }, [log.length, watching]);

  const fullTime = () => { if (again) setAgain(false); if (mode === 'watch') onWatched(); };
  const face = !view ? 'next' : watching ? 'watch' : 'result';
  const where = view ? `${whereLabel(view.where)} · ${view.home ? 'vs' : 'at'} ${short(view.them)}` : '';
  const helpButtonEl = (
    <button ref={helpButton} type="button" onClick={openHelp} aria-label="How Game Day works" className={`${ROUND_BUTTON} w-11`} data-gameday-help>?</button>
  );
  const sheet = helpOpen
    ? <SeasonCentreHelp words={help} onClose={() => { setHelpOpen(false); helpButton.current?.focus({ preventScroll: true }); }} />
    : null;

  return (
    <div className="flex h-full flex-col gap-1.5 text-left" data-gameday data-gameday-face={face}>
      {face === 'next' && (
        <>
          <div className="flex h-11 shrink-0 items-center justify-between gap-2">
            <span className="min-w-0 text-xs font-bold uppercase tracking-wider text-muted-foreground">Game Day</span>
            {helpButtonEl}
          </div>
          <p className="text-sm font-bold text-foreground" data-gameday-next>{next ? `Next up: ${fixtureLine(next)}.` : 'No game for you this week.'}</p>
          <p className="text-xs text-muted-foreground" data-gameday-next-note>{next ? nextNote ?? 'Play it or watch it. Your result lands here.' : 'Your next result lands here.'}</p>
        </>
      )}

      {face === 'watch' && view && view.game && (
        <>
          <div className="flex h-11 shrink-0 items-center justify-between gap-2">
            <span className="min-w-0 text-xs font-bold text-muted-foreground" data-gameday-where>{where}</span>
            {helpButtonEl}
          </div>
          {/* the score bug gets the short names (two long ones do not fit a phone's bug); the feed keeps the full ones.
              THE CLOCK STOPS WHILE THE "?" IS OPEN: the sheet lies over the whole week box, and a game that ran to
              full time behind it would be over, with its result drawn, by the time he closed the rules. */}
          <MatchClock key={last!.key} game={view.game} clock={gameDayClock(law, n => (n === name(view.us) ? short(view.us) : n === name(view.them) ? short(view.them) : n))}
            usName={name(view.us)} themName={name(view.them)}
            speed={speed} paused={helpOpen} reduced={false} onFullTime={fullTime} />
          <div className="flex shrink-0 gap-1.5" role="group" aria-label="Clock speed">
            {SPEEDS.map(s => (
              <button key={s.text} type="button" onClick={() => setSpeed(s.speed)} aria-pressed={speed === s.speed}
                className={`${ROUND_BUTTON} flex-1 ${speed === s.speed ? 'border-primary text-primary' : ''}`} data-gameday-speed={s.text}>{s.text}</button>
            ))}
          </div>
        </>
      )}

      {face === 'result' && view && (
        <>
          <div className="flex h-11 shrink-0 items-center justify-between gap-2">
            <span className="min-w-0 text-xs font-bold text-muted-foreground" data-gameday-where>{where}</span>
            {canWatch && (
              <button type="button" onClick={() => { setSpeed(1); setAgain(true); }} className={`${ROUND_BUTTON} px-3`} data-gameday-again>Watch again</button>
            )}
          </div>
          <div className="flex h-11 shrink-0 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2" data-gameday-final data-won={view.won ? 'true' : 'false'}>
              <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${view.won ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>{view.won ? 'W' : 'L'}</span>
              <span className="text-lg font-black tabular-nums text-foreground">{short(view.us)} {view.final.us}, {short(view.them)} {view.final.them}</span>
            </div>
            {helpButtonEl}
          </div>
          {view.line && (
            <table className="w-full shrink-0 table-fixed text-xs tabular-nums" data-line-score>
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left font-normal"><span className="sr-only">Club</span></th>
                  {view.line.names.map(n => <th key={n} className="w-7 text-center font-normal">{n}</th>)}
                  <th className="w-8 text-right font-normal">T</th>
                </tr>
              </thead>
              <tbody>
                {([['us', view.us, view.line.us, view.final.us], ['them', view.them, view.line.them, view.final.them]] as const).map(([side, club, cells, total]) => (
                  <tr key={side} data-line-row={side}>
                    <td className="text-left text-foreground">{name(club)}</td>
                    {cells.map((n, i) => <td key={i} className="text-center text-muted-foreground">{n}</td>)}
                    <td className="text-right font-black text-foreground">{total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto text-xs" data-gameday-scroll>
            {view.shape && <p className="text-foreground" data-gameday-shape>{view.shape}</p>}
            {view.deciding.length > 0 && (
              <ol className="space-y-1" data-deciding>
                {view.deciding.map(p => (
                  <li key={`${p.clock}-${p.after}`} className="flex gap-2" data-decided={p.decided ? 'true' : undefined}>
                    <span className={`${law.story.clock.labelClass ?? 'w-8'} shrink-0 tabular-nums text-muted-foreground`}>{p.clock}</span>
                    <span className={`min-w-0 flex-1 ${p.decided ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>{p.text}</span>
                    <span className="shrink-0 tabular-nums text-foreground">{p.after}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          {standing && <p className="shrink-0 text-xs text-muted-foreground" data-gameday-standing>{standingLine(standing)}</p>}
          <div ref={chipRow} className="flex shrink-0 gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }} data-gameday-chips>
            {logChips(log, my).map((c, i) => (
              <button key={c.key} type="button" onClick={() => setOpen(i)} aria-pressed={i === index}
                className={`flex h-11 min-w-[52px] shrink-0 flex-col items-center justify-center rounded-lg border px-2 text-xs leading-tight ${i === index ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}
                data-gameday-chip={c.where}>
                <span className="text-muted-foreground">{whereLabel(c.where)}</span>
                <span className={`font-bold tabular-nums ${c.won ? 'text-primary' : 'text-foreground'}`}>{c.text}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {sheet && (helpHost ? createPortal(sheet, helpHost) : sheet)}
    </div>
  );
}
