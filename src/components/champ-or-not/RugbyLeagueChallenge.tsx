import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import type { ChampRow, ChampRound } from '@/lib/champOrNot';
import { buildRugbyLeagueRun, fetchRugbyLeagueRows, RUGBY_ROUNDS } from '@/lib/rugbyLeagueChallenge';
import { cn } from '@/lib/utils';

type Phase = 'loading' | 'error' | 'intro' | 'question' | 'reveal' | 'done' | 'review' | 'retry-question' | 'retry-reveal' | 'retry-done';

export function RugbyLeagueChallenge({ active, onExit }: { active: boolean; onExit: () => void }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const phaseRef = useRef<Phase>('loading');
  const [rows, setRows] = useState<Map<string, ChampRow[]> | null>(null);
  const [rounds, setRounds] = useState<ChampRound[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [lastPick, setLastPick] = useState<boolean | null>(null);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [retryIndex, setRetryIndex] = useState(0);
  const [retryAnswers, setRetryAnswers] = useState<boolean[]>([]);
  const [retryStarted, setRetryStarted] = useState(false);
  const returnFocus = useRef<'review' | 'retry' | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const runNumber = useRef(0);
  const panel = useRef<HTMLElement>(null);
  const wasActive = useRef(false);
  const actionButton = useRef<HTMLButtonElement>(null);
  const actionArea = useRevealScroll<HTMLDivElement>(`${phase}:${index}:${reviewIndex}:${retryIndex}`, { enabled: active && !helpOpen, skipFirst: false });
  const current = rounds[index];
  const score = answers.filter(Boolean).length;
  const lastCorrect = phase === 'reveal' && current ? lastPick === current.isTrue : null;
  const example = rounds.find(round => round.compKey === 'nrl');
  const missed = answers.flatMap((correct, at) => correct ? [] : [at]);
  const reviewed = rounds[reviewIndex];
  const reviewedPick = reviewed ? answers[reviewIndex] ? reviewed.isTrue : !reviewed.isTrue : null;
  const retryCurrent = rounds[missed[retryIndex]];
  const retryCorrect = retryAnswers[retryIndex];
  const retryPick = retryCurrent && retryCorrect !== undefined ? retryCorrect ? retryCurrent.isTrue : !retryCurrent.isTrue : null;
  const corrected = retryAnswers.filter(Boolean).length;

  const moveTo = (next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  };
  const prepareRun = (bank: ReadonlyMap<string, ChampRow[]>) => {
    const next = buildRugbyLeagueRun(bank, `rugby-league:${Date.now()}:${Math.random()}:${++runNumber.current}`);
    if (!next) return false;
    setRounds(next);
    setIndex(0);
    setAnswers([]);
    setLastPick(null);
    setReviewIndex(0);
    setRetryIndex(0);
    setRetryAnswers([]);
    setRetryStarted(false);
    returnFocus.current = null;
    return true;
  };

  useEffect(() => {
    let alive = true;
    const timeout = window.setTimeout(() => {
      if (!alive) return;
      alive = false;
      moveTo('error');
    }, 15000);
    fetchRugbyLeagueRows().then(bank => {
      if (!alive) return;
      window.clearTimeout(timeout);
      if (!prepareRun(bank)) { moveTo('error'); return; }
      setRows(bank);
      moveTo('intro');
    }).catch(() => {
      if (!alive) return;
      window.clearTimeout(timeout);
      moveTo('error');
    });
    return () => { alive = false; window.clearTimeout(timeout); };
  }, [loadAttempt]);

  useEffect(() => {
    const entered = active && !wasActive.current;
    wasActive.current = active;
    if (!active) { setHelpOpen(false); return; }
    if (helpOpen) return;
    const owner = document.activeElement;
    if (entered || owner === document.body || !owner?.isConnected || panel.current?.contains(owner)) {
      const returning = phase === 'done' && returnFocus.current
        ? panel.current?.querySelector<HTMLButtonElement>(`[data-rugby-open-${returnFocus.current}]`) : null;
      (returning ?? actionButton.current ?? panel.current)?.focus({ preventScroll: true });
      returnFocus.current = null;
    }
  }, [active, phase, index, retryIndex]);

  const choose = (pick: boolean) => {
    if (!active || helpOpen || phaseRef.current !== 'question' || !current) return;
    moveTo('reveal');
    setLastPick(pick);
    setAnswers(previous => [...previous, pick === current.isTrue]);
  };
  const advance = () => {
    if (!active || helpOpen || phaseRef.current !== 'reveal') return;
    if (index + 1 === RUGBY_ROUNDS) moveTo('done');
    else {
      moveTo('question');
      setIndex(previous => previous + 1);
      setLastPick(null);
    }
  };
  const openReview = () => {
    if (!active || helpOpen || phaseRef.current !== 'done' || answers.length !== RUGBY_ROUNDS) return;
    setReviewIndex(0);
    moveTo('review');
  };
  const openRetry = () => {
    if (!active || helpOpen || phaseRef.current !== 'done' || answers.length !== RUGBY_ROUNDS || missed.length === 0) return;
    setRetryStarted(true);
    moveTo(retryIndex >= missed.length ? 'retry-done' : retryAnswers.length > retryIndex ? 'retry-reveal' : 'retry-question');
  };
  const chooseRetry = (pick: boolean) => {
    if (!active || helpOpen || phaseRef.current !== 'retry-question' || !retryCurrent) return;
    moveTo('retry-reveal');
    setRetryAnswers(previous => [...previous, pick === retryCurrent.isTrue]);
  };
  const advanceRetry = () => {
    if (!active || helpOpen || phaseRef.current !== 'retry-reveal') return;
    moveTo(retryIndex + 1 === missed.length ? 'retry-done' : 'retry-question');
    setRetryIndex(previous => previous + 1);
  };
  const backToResults = () => {
    if (!active || helpOpen || !['review', 'retry-question', 'retry-reveal', 'retry-done'].includes(phaseRef.current)) return;
    returnFocus.current = phaseRef.current === 'review' ? 'review' : 'retry';
    moveTo('done');
  };
  const categoryScore = (key: string) => answers.filter((correct, i) => correct && rounds[i].compKey === key).length;
  const primary = 'w-full min-h-[44px] rounded-xl bg-primary px-3 py-3 font-semibold text-primary-foreground hover:opacity-90';
  const rules = <div className="space-y-3 text-sm text-muted-foreground">
    <p>Call ten Rugby League claims: five Australian premiers and five Dally M medallists, from records through 2025.</p>
    <p>Choose <strong className="text-foreground">CHAMP</strong> when the named winner matches the year, or <strong className="text-foreground">NOT</strong> when it does not. Every name is a real winner in that category. A false claim puts them in the wrong year.</p>
    <p>Each correct call earns one point. Read the real winner or shared winners after every answer, then move on at your own pace.</p>
    <p>After ten calls, review any claim and your original choice. Retry missed calls offers only the ones you got wrong, once each. Its corrected total is separate: a 7/10 original run stays 7/10 even if you correct all three misses. Back to original results keeps a retry ready to resume.</p>
    {example && <p><strong className="text-foreground">Worked example: </strong>“{example.realTeams[0]} won the top grade rugby league premiership in {example.year}.” Choose CHAMP: {example.realTeams[0]} is listed as a premier that year.</p>}
    <p>This is an unranked run. You can switch modes and return to your place, but reloading starts over. Daily scores stay separate.</p>
  </div>;

  return (
    <section ref={panel} tabIndex={-1} data-rugby-challenge="" data-rugby-phase={phase} aria-label="Rugby League challenge" className="mx-auto max-w-md">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-display text-lg text-foreground">Ten claims. Your call.</h2>
        <HowToPlayPopover title="Rugby League rules" triggerLabel="Rugby League rules" floatingTrigger={false} className="min-h-[44px] min-w-[44px] shrink-0" open={active && helpOpen} onOpenChange={setHelpOpen}>{rules}</HowToPlayPopover>
      </div>

      {phase === 'loading' && <div ref={actionArea} role="status" className="rounded-2xl border border-border bg-card p-8 text-center"><Loader2 aria-hidden="true" className="mx-auto mb-3 h-6 w-6 animate-spin motion-reduce:animate-none text-primary" /><p>Loading Rugby League records...</p></div>}

      {phase === 'error' && <div className="rounded-2xl border border-border bg-card p-5 text-center">
        <p role="alert" className="font-semibold">Rugby League records are unavailable.</p>
        <p className="mt-2 text-sm text-muted-foreground">We need both the premiers and Dally M lists for a full ten. Try loading them again.</p>
        <div ref={actionArea} className="mt-4"><button ref={actionButton} className={primary} onClick={() => {
          if (!active || phaseRef.current !== 'error') return;
          moveTo('loading');
          setLoadAttempt(previous => previous + 1);
        }}>Retry rugby records</button></div>
      </div>}

      {phase === 'intro' && <div ref={actionArea} className="overflow-hidden rounded-2xl border border-primary/30 bg-card">
        <div className="border-b border-primary/20 bg-primary/10 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Five premiers. Five medallists. Ten calls that count.</p>
        </div>
        <div className="space-y-3 p-4">
          <p className="text-sm text-muted-foreground">CHAMP means true. NOT means false. Earn one point for each correct call, then reveal the winners.</p>
          {example && <div className="rounded-xl border border-border bg-secondary/50 p-3 text-sm">
            <p className="font-semibold text-foreground">Try this example</p>
            <p className="mt-1 text-muted-foreground">{example.realTeams[0]} won the top grade rugby league premiership in {example.year}.</p>
            <p className="mt-2 font-semibold text-primary">CHAMP. That winner matches the year.</p>
          </div>}
          <div><button ref={actionButton} className={primary} onClick={() => {
            if (!active || helpOpen || phaseRef.current !== 'intro') return;
            moveTo('question');
          }}>Start ten questions</button><p className="mt-2 text-center text-xs text-muted-foreground">Unranked. Progress stays until you reload.</p></div>
        </div>
      </div>}

      {(phase === 'question' || phase === 'reveal') && current && <div ref={actionArea} data-rugby-question={index + 1} data-rugby-category={current.compKey}>
        <div className="mb-3 flex items-center justify-between text-sm"><p>Claim <strong>{index + 1} / {RUGBY_ROUNDS}</strong></p><p className="text-muted-foreground">Right: <strong className="text-foreground">{score}</strong></p></div>
        <div className={cn('overflow-hidden rounded-2xl border bg-card', phase === 'reveal' ? lastCorrect ? 'border-correct' : 'border-destructive' : 'border-primary/40')}>
          <div className="flex items-center justify-between gap-2 border-b border-primary/20 bg-primary/10 px-4 py-3">
            <span className="text-sm font-semibold">{current.compKey === 'nrl' ? 'Premiers' : 'Dally M Medal'}</span>
            <span className="font-display text-3xl tabular-nums text-primary">{current.year}</span>
          </div>
          <div className="p-4">
            <p data-rugby-statement="" className="text-lg font-semibold leading-snug text-foreground">{current.statement}</p>
            {phase === 'question' && <div className="mt-4 grid grid-cols-2 gap-3">
              <button ref={actionButton} onClick={() => choose(true)} className={primary}>CHAMP</button>
              <button onClick={() => choose(false)} className="min-h-[44px] rounded-xl border border-border bg-secondary px-3 py-3 font-semibold text-foreground hover:bg-secondary/70">NOT</button>
            </div>}
            {phase === 'reveal' && <div className="mt-3">
              <div role="status" className="rounded-xl bg-secondary/50 p-3">
                <p className={cn('flex items-center gap-2 font-bold', lastCorrect ? 'text-correct' : 'text-destructive')}>{lastCorrect ? <Check aria-hidden="true" className="h-5 w-5" /> : <X aria-hidden="true" className="h-5 w-5" />}{lastCorrect ? 'Right call!' : 'Not this time.'}</p>
                <p className="mt-1 text-sm text-muted-foreground">The claim is {current.isTrue ? 'true' : 'false'}. You chose {lastPick ? 'CHAMP' : 'NOT'}.</p>
                <p className="mt-2 text-sm text-foreground"><strong>{current.year} {current.compKey === 'nrl' ? 'premiers' : 'Dally M'}: </strong>{current.realTeams.join(' and ')}.</p>
              </div>
              <button ref={actionButton} onClick={advance} className={cn(primary, 'mt-3')}>{index + 1 === RUGBY_ROUNDS ? 'View results' : 'Next claim'}</button>
            </div>}
          </div>
        </div>
        <ol data-rugby-progress="" aria-label="Challenge progress" className="mt-3 grid grid-cols-10 gap-1">
          {rounds.map((_, i) => <li key={i} aria-label={`Claim ${i + 1}: ${i < answers.length ? answers[i] ? 'correct' : 'incorrect' : i === index ? 'current' : 'not answered'}`} className={cn('flex h-6 items-center justify-center rounded text-xs font-semibold', i < answers.length ? answers[i] ? 'bg-correct/20 text-foreground' : 'bg-destructive/20 text-foreground' : i === index ? 'ring-1 ring-primary bg-primary/10 text-foreground' : 'bg-secondary text-muted-foreground')}>
            {i < answers.length ? answers[i] ? <Check aria-hidden="true" className="h-3 w-3" /> : <X aria-hidden="true" className="h-3 w-3" /> : i + 1}
          </li>)}
        </ol>
      </div>}

      {phase === 'done' && <div ref={actionArea} data-rugby-result="" className="rounded-2xl border border-primary/30 bg-card p-5 text-center">
        <p className="text-3xl" aria-hidden="true">🏉</p>
        <h3 className="mt-2 text-xl font-bold">Ten calls complete</h3>
        <p data-rugby-score="total" className="my-3 font-display text-5xl tabular-nums text-primary">{score} / {RUGBY_ROUNDS}</p>
        <p className="text-sm text-muted-foreground">{score === RUGBY_ROUNDS ? 'Every year, every winner. Perfect run.' : 'The real winners are in. Ready for another set?'}</p>
        <div className="my-4 grid grid-cols-2 gap-3 text-sm">
          <p className="rounded-xl border border-border p-3">Premiers <strong data-rugby-score="nrl" className="block text-xl">{categoryScore('nrl')} / 5</strong></p>
          <p className="rounded-xl border border-border p-3">Dally M <strong data-rugby-score="dallym" className="block text-xl">{categoryScore('dallym')} / 5</strong></p>
        </div>
        <button data-rugby-open-review="" onClick={openReview} className={primary}>Review ten calls</button>
        {missed.length > 0 && <button data-rugby-open-retry="" onClick={openRetry} className="mt-2 min-h-[44px] w-full rounded-xl border border-primary/40 bg-primary/10 px-3 py-3 font-semibold text-primary">
          {!retryStarted ? `Retry ${missed.length} missed ${missed.length === 1 ? 'call' : 'calls'}` : retryIndex >= missed.length ? 'View retry result' : 'Resume missed calls'}
        </button>}
        <button ref={actionButton} className={cn(primary, 'mt-3')} onClick={() => {
          if (!active || helpOpen || phaseRef.current !== 'done' || !rows) return;
          if (prepareRun(rows)) moveTo('question');
          else moveTo('error');
        }}>Play another ten</button>
        <p className="mt-2 text-xs text-muted-foreground">Unranked run. Your Daily score is separate.</p>
      </div>}

      {phase === 'review' && reviewed && <div ref={actionArea} data-rugby-review="" data-rugby-review-index={reviewIndex + 1}>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-lg font-bold">Review your ten calls</h3><p className="text-sm text-muted-foreground" data-rugby-original-score="">Original: {score} / {RUGBY_ROUNDS}</p></div>
        <div role="group" aria-label="Choose a completed claim" className="mb-3 grid grid-cols-5 gap-2">
          {rounds.map((_, at) => <button key={at} ref={at === reviewIndex ? actionButton : null} aria-label={`Review claim ${at + 1}: ${answers[at] ? 'correct' : 'incorrect'}`} aria-pressed={at === reviewIndex}
            onClick={() => { if (active && !helpOpen && phaseRef.current === 'review') setReviewIndex(at); }}
            className={cn('min-h-[44px] rounded-lg border px-1 py-2 text-sm font-semibold', at === reviewIndex ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-secondary text-foreground')}>
            {at + 1}<span aria-hidden="true" className="ml-1">{answers[at] ? '✓' : '×'}</span>
          </button>)}
        </div>
        <div className="rounded-2xl border border-border bg-card p-4" role="region" aria-label={`Original claim ${reviewIndex + 1}`}>
          <p className="text-sm font-semibold text-primary">{reviewed.compKey === 'nrl' ? 'Premiers' : 'Dally M Medal'} · {reviewed.year}</p>
          <p data-rugby-review-statement="" className="mt-2 text-lg font-semibold leading-snug">{reviewed.statement}</p>
          <p data-rugby-review-pick="" className="mt-3 text-sm">Your original call: <strong>{reviewedPick ? 'CHAMP' : 'NOT'}</strong>. {answers[reviewIndex] ? 'Right call.' : 'Not this time.'}</p>
          <p data-rugby-review-truth="" className="mt-2 text-sm text-muted-foreground">The claim is {reviewed.isTrue ? 'true' : 'false'}.</p>
          <p data-rugby-review-winners="" className="mt-2 text-sm"><strong>{reviewed.year} {reviewed.compKey === 'nrl' ? 'premiers' : 'Dally M'}: </strong>{reviewed.realTeams.join(' and ')}.</p>
          <button onClick={backToResults} className={cn(primary, 'mt-4')}>Back to original results</button>
        </div>
      </div>}

      {(phase === 'retry-question' || phase === 'retry-reveal') && retryCurrent && <div ref={actionArea} data-rugby-retry="" data-rugby-retry-phase={phase === 'retry-question' ? 'question' : 'reveal'} data-rugby-retry-original={missed[retryIndex] + 1}>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-lg font-bold">Retry {retryIndex + 1} / {missed.length}</h3><p className="text-sm text-muted-foreground" data-rugby-original-score="">Original: {score} / {RUGBY_ROUNDS}</p></div>
        <div className={cn('rounded-2xl border bg-card p-4', phase === 'retry-reveal' ? retryCorrect ? 'border-correct' : 'border-destructive' : 'border-primary/40')}>
          <p className="text-sm font-semibold text-primary">Original claim {missed[retryIndex] + 1} · {retryCurrent.compKey === 'nrl' ? 'Premiers' : 'Dally M Medal'} · {retryCurrent.year}</p>
          <p data-rugby-retry-statement="" className="mt-2 text-lg font-semibold leading-snug">{retryCurrent.statement}</p>
          {phase === 'retry-question' ? <div className="mt-4 grid grid-cols-2 gap-3">
            <button ref={actionButton} onClick={() => chooseRetry(true)} className={primary}>CHAMP</button>
            <button onClick={() => chooseRetry(false)} className="min-h-[44px] rounded-xl border border-border bg-secondary px-3 py-3 font-semibold">NOT</button>
          </div> : <div className="mt-3">
            <div role="status" data-rugby-retry-feedback="" className="rounded-xl bg-secondary/50 p-3">
              <p className={cn('font-bold', retryCorrect ? 'text-correct' : 'text-destructive')}>{retryCorrect ? 'Corrected!' : 'Still one to learn.'}</p>
              <p data-rugby-retry-pick="" className="mt-1 text-sm text-muted-foreground">You chose {retryPick ? 'CHAMP' : 'NOT'}. The claim is {retryCurrent.isTrue ? 'true' : 'false'}.</p>
              <p data-rugby-retry-winners="" className="mt-2 text-sm"><strong>{retryCurrent.year} {retryCurrent.compKey === 'nrl' ? 'premiers' : 'Dally M'}: </strong>{retryCurrent.realTeams.join(' and ')}.</p>
            </div>
            <button ref={actionButton} onClick={advanceRetry} className={cn(primary, 'mt-3')}>{retryIndex + 1 === missed.length ? 'View retry result' : 'Next missed call'}</button>
          </div>}
        </div>
        <button onClick={backToResults} className="mt-3 min-h-[44px] w-full rounded-xl border border-border px-3 py-2 text-sm font-semibold">Back to original results</button>
      </div>}

      {phase === 'retry-done' && <div ref={actionArea} data-rugby-retry="" data-rugby-retry-phase="done" className="rounded-2xl border border-primary/30 bg-card p-5 text-center">
        <h3 className="text-xl font-bold">Missed calls revisited</h3>
        <p className="my-3 font-display text-4xl text-primary" data-rugby-retry-score="">{corrected} / {missed.length} corrected</p>
        <p data-rugby-original-score="" className="text-sm font-semibold">Original: {score} / {RUGBY_ROUNDS}, unchanged.</p>
        <p className="mt-2 text-sm text-muted-foreground">These are practice corrections, not extra points.</p>
        <button ref={actionButton} onClick={backToResults} className={cn(primary, 'mt-4')}>Back to original results</button>
        <button onClick={() => {
          if (!active || helpOpen || phaseRef.current !== 'retry-done' || missed.length === 0) return;
          setRetryIndex(0);
          setRetryAnswers([]);
          moveTo('retry-question');
        }} className="mt-2 min-h-[44px] w-full rounded-xl border border-border px-3 py-3 text-sm font-semibold">Try missed calls again</button>
      </div>}

      <button onClick={onExit} className="mt-3 min-h-[44px] w-full rounded-xl border border-border px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground">Back to Champ or Not</button>
    </section>
  );
}
