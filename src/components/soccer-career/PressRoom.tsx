import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { answerSoccerPress, pressRoomView, type SoccerPressPromise } from '@/lib/soccerCareerPress';

const BUTTON = 'min-h-[44px] min-w-[44px] rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary';
const season = (year: number) => `${year}/${String((year + 1) % 100).padStart(2, '0')}`;
const promiseWords: Record<SoccerPressPromise['outcome'], string> = {
  pending: 'Waiting for your following season', met: 'Promise kept', missed: 'Promise missed',
  moved: 'Closed after a club move', excused: 'Interrupted season, no penalty',
};

function PromiseLine({ promise }: { promise: SoccerPressPromise }) {
  return <div data-press-promise={promise.outcome} className="space-y-1 rounded-xl border border-border bg-secondary/50 p-3 text-sm">
    <p className="font-bold">{promiseWords[promise.outcome]}</p>
    <p>{promise.label}</p>
    {promise.actual !== undefined && <p className="text-xs text-muted-foreground">Recorded: {promise.actual}{promise.actualRating !== undefined ? `, ${promise.actualRating.toFixed(1)} rating` : ''}{promise.settledYear !== undefined ? ` in ${season(promise.settledYear)}` : ''}</p>}
  </div>;
}

export default function PressRoom({ career, onCareer, onClose }: {
  career: CareerState;
  onCareer: (fn: (prev: CareerState) => CareerState) => void;
  onClose: () => void;
}) {
  const view = useMemo(() => pressRoomView(career), [career]);
  const [screen, setScreen] = useState<'help' | 'question' | 'history' | 'entry'>('help');
  const [entry, setEntry] = useState(0);
  const [helpReturn, setHelpReturn] = useState<'question' | 'history' | 'entry' | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const heldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = heldOverflow; };
  }, []);
  useEffect(() => {
    if (body.current) body.current.scrollTop = 0;
    heading.current?.focus({ preventScroll: true });
  }, [screen]);
  const keydown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    if (event.key !== 'Tab') return;
    const buttons = [...(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])];
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current || document.activeElement === heading.current)) {
      event.preventDefault(); last?.focus({ preventScroll: true });
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first?.focus({ preventScroll: true });
    }
  };
  const held = view.history[entry];
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3" data-press-room>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="press-room-title" tabIndex={-1} onKeyDown={keydown}
      className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground outline-none">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-2">
        <h2 ref={heading} id="press-room-title" tabIndex={-1} className="text-lg font-black outline-none">🎙️ Press room</h2>
        <button type="button" aria-label="Press room help" className={BUTTON} onClick={() => { if (screen !== 'help') setHelpReturn(screen); setScreen('help'); }}>?</button>
      </div>
      <div ref={body} data-press-room-body data-press-screen={screen} className="min-h-0 space-y-3 overflow-y-auto overscroll-contain p-4">
        <p className="text-xs text-muted-foreground">Credibility {view.credibility}/100. This is your simulation's media reputation.</p>
        {screen === 'help' && <>
          <h3 className="font-bold">Say it, then back it up</h3>
          <p className="text-sm">One answer after each season you played. The question uses your saved club and performance. An answer changes morale and popularity once. Reading or closing this room changes nothing.</p>
          <p className="text-sm">Calm: morale +3, popularity -2. Take responsibility: popularity +3, morale -3 and credibility +2. Make a promise: morale -4 now, with a target for your next season at your current club. The promise names that club even if you just moved.</p>
          <p className="text-sm">Keep the promise: popularity +6, morale +3 and credibility +8. Miss it: popularity -6, morale -3 and credibility -8. A club move, a severe injury or a year you could not play closes it without those rewards or penalties. The target follows your position when you answered.</p>
          <div className="rounded-xl bg-secondary p-3 text-sm"><strong>Example:</strong> Your striker scored 12. Promise 15 next season at the same club. A recorded 16 keeps it. A recorded 13 misses it. Move clubs and it closes with no performance penalty.</div>
          <p className="text-xs text-muted-foreground">Career choices can change your future season. This room never changes a season already played or reveals the pending award ballot. Promises left at retirement stay unresolved if you play no following season.</p>
          <button type="button" className={`${BUTTON} w-full bg-primary text-primary-foreground`} data-press-start onClick={() => setScreen(helpReturn ?? (view.eligible ? 'question' : 'history'))}>{helpReturn ? 'Back to the room' : view.eligible ? 'Answer for your season' : 'Read your answers'}</button>
        </>}
        {screen === 'question' && <>
          {view.source && <p className="text-xs text-muted-foreground" data-press-source>{season(view.source.year)} · {view.source.club} · {view.source.position}</p>}
          {view.source && <p data-press-stat-line className="rounded-xl bg-secondary p-3 text-sm font-semibold">{view.source.statLine}</p>}
          <h3 className="font-bold" data-press-question>{view.question}</h3>
          {!view.eligible && <p className="text-sm" role="status">{view.reason}</p>}
          {view.eligible && view.options.map(option => <button type="button" key={option.id} data-press-answer={option.id} disabled={!option.eligible}
            className={`${BUTTON} w-full text-left disabled:opacity-50`} onClick={() => {
              onCareer(prev => answerSoccerPress(prev, option.id));
              setEntry(0); setScreen('entry');
            }}>
            <span className="block font-bold">{option.label}</span>
            <span className="mt-1 block text-xs font-normal text-muted-foreground">{option.effect}</span>
            <span className="mt-1 block text-xs font-normal">{option.tradeoff}</span>
            {!option.eligible && option.reason && <span className="mt-1 block text-xs font-normal">{option.reason}</span>}
          </button>)}
          {view.history.length > 0 && <button type="button" className={`${BUTTON} w-full`} onClick={() => setScreen('history')}>Your past answers</button>}
        </>}
        {screen === 'history' && <>
          <h3 className="font-bold">Your words, season by season</h3>
          {view.history.length === 0 && <p className="text-sm">No press answers yet.</p>}
          <div className="grid grid-cols-2 gap-2">{view.history.map((row, index) => <button key={`${row.source.index}:${row.source.year}:${row.source.club}`} type="button"
            className={`${BUTTON} min-w-0 text-left`} data-press-history={index} onClick={() => { setEntry(index); setScreen('entry'); }}>
            <span className="block font-bold">{season(row.source.year)}</span><span className="block break-words text-xs">{row.source.club}</span>
            <span className="mt-1 block text-xs text-muted-foreground">{row.promise ? promiseWords[row.promise.outcome] : row.answer}</span>
          </button>)}</div>
          {view.eligible && <button type="button" className={`${BUTTON} w-full`} onClick={() => setScreen('question')}>This season's question</button>}
        </>}
        {screen === 'entry' && held && <div data-press-receipt className="space-y-3">
          <p className="text-xs text-muted-foreground">{season(held.source.year)} · {held.source.club} · {held.source.position}</p>
          <p className="rounded-xl bg-secondary p-3 text-sm font-semibold">{held.source.statLine}</p>
          <p className="font-bold">{held.question}</p><p className="text-sm">Your answer: {held.answer}</p>
          {held.promise && <PromiseLine promise={held.promise} />}
          <button type="button" className={`${BUTTON} w-full`} onClick={() => setScreen('history')}>All your answers</button>
        </div>}
      </div>
      <div className="shrink-0 border-t border-border p-3">
        <button type="button" className={`${BUTTON} w-full`} data-press-close onClick={onClose}>← Back to your career</button>
      </div>
    </div>
  </div>;
}
