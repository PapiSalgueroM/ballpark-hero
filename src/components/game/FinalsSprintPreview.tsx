import { useCallback, useEffect, useRef, useState, type FormEvent, type MutableRefObject } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Share2 } from 'lucide-react';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';
import PageSeo from '@/components/seo/PageSeo';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { getEasternDayRange } from '@/lib/dateUtils';
import { safeLocalStorage } from '@/lib/safeStorage';
import { shareResult } from '@/lib/share';
import {
  createPilotRun, currentPilotPrompt, pilotRecap, pilotScore, pilotStorageKey, readPilotRun, updatePilotRun,
  type PilotMode, type PilotRun, type PilotSport,
} from '@/lib/sportChallengePilot';

import { pilotSports } from '@/data/sportChallengePilot';

const SPORTS = { soccer: 'Soccer', nba: 'NBA', nfl: 'NFL' } as const;
const MODES = { daily: 'Daily preview', practice: 'Practice' } as const;
const RULES = [
  'Type one finalist for each of six clues. A team can only count once.',
  'You have 60 seconds. Defer sends one clue to the end of the round.',
  'The daily clock stops at midnight Eastern, even in the final minute.',
  'Each clue shows its points. Clear all six for 10 bonus points.',
];
const EXAMPLE = 'For example, a correct 15-point answer takes your score from 20 to 35 and opens the next clue.';
const DIFFICULTY: Record<number, string> = { 10: 'Easy', 15: 'Medium', 20: 'Hard' };
const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';
const ACTION = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ' + FOCUS;
const PRIMARY = ACTION + ' bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50';
const SECONDARY = ACTION + ' border border-border bg-background text-foreground hover:bg-accent disabled:opacity-50';
type RoundAction = Parameters<typeof updatePilotRun>[1] | { type: 'start' };
type Picker = 'sport' | 'mode';

function withRoundLock(key: string, commit: () => void) {
  const locks = navigator.locks;
  if (!locks) { commit(); return; }
  let entered = false;
  try {
    void locks.request(key, () => {
      entered = true;
      commit();
    }).catch(() => { if (!entered) commit(); });
  } catch {
    if (!entered) commit();
  }
}

function remainingSeconds(run: PilotRun | null, now: number) {
  return run ? Math.max(0, Math.ceil((run.deadline - now) / 1000)) : 0;
}

function FinalsRound({ sport, mode, choose, pickerToFocus }: {
  sport: PilotSport;
  mode: PilotMode;
  choose: (sport: PilotSport, mode: PilotMode) => void;
  pickerToFocus: MutableRefObject<Picker | null>;
}) {
  const storageKey = pilotStorageKey(sport, mode);
  const read = useCallback((now: number) => readPilotRun(safeLocalStorage.getItem(storageKey), sport, mode, now),
    [storageKey, sport, mode]);
  const [run, setRun] = useState(() => read(Date.now()));
  const [seconds, setSeconds] = useState(() => remainingSeconds(run, Date.now()));
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const sportRef = useRef<HTMLButtonElement>(null);
  const modeRef = useRef<HTMLButtonElement>(null);
  const wasPlaying = useRef(false);
  const prompt = run && !run.completed ? currentPilotPrompt(run) : undefined;
  const revealResult = useRevealScroll(run?.completed);
  const score = run ? pilotScore(run) : 0;

  const change = useCallback((action: RoundAction) => {
    withRoundLock(storageKey, () => {
      const now = Date.now();
      const latest = read(now);
      const reveal = (next: PilotRun | null, message = '', clear = true) => {
        setRun(next);
        setSeconds(remainingSeconds(next, now));
        setFeedback(message);
        if (clear) setInput('');
      };
      const save = (next: PilotRun) => safeLocalStorage.setItem(storageKey, JSON.stringify(next));

      if (action.type === 'start') {
        if (latest && (!latest.completed || mode === 'daily')) {
          reveal(latest);
          return;
        }
        const next = createPilotRun(sport, mode, now);
        save(next);
        reveal(next);
        return;
      }
      if (!run || !latest || run.day !== latest.day || run.startedAt !== latest.startedAt || run.deadline !== latest.deadline) {
        reveal(latest, 'The round changed. Check the current round.');
        return;
      }
      if (latest.completed) {
        save(latest);
        reveal(latest);
        return;
      }
      const latestPrompt = currentPilotPrompt(latest);
      if (action.type !== 'tick' && latestPrompt?.id !== prompt?.id) {
        reveal(latest, 'The clue changed. Try this one.');
        return;
      }
      const result = updatePilotRun(latest, action, now);
      if (result.run !== latest) save(result.run);
      reveal(result.run, result.feedback, result.run.completed || currentPilotPrompt(result.run)?.id !== latestPrompt?.id);
    });
  }, [storageKey, read, sport, mode, run, prompt?.id]);

  useEffect(() => {
    if (!run || run.completed) return;
    let expiryQueued = false;
    const refresh = () => {
      const secondsLeft = remainingSeconds(run, Date.now());
      setSeconds(secondsLeft);
      if (secondsLeft === 0 && !expiryQueued) {
        expiryQueued = true;
        change({ type: 'tick' });
      }
    };
    const id = window.setInterval(refresh, 250);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', refresh);
    };
  }, [run, change]);

  useEffect(() => {
    if (mode !== 'daily' || !run?.completed) return;
    const midnight = Date.parse(getEasternDayRange(run.day).end);
    const rollover = () => {
      const now = Date.now();
      if (now < midnight) return;
      const next = read(now);
      setRun(next);
      setSeconds(remainingSeconds(next, now));
      setFeedback('');
    };
    const id = window.setTimeout(rollover, Math.max(0, midnight - Date.now()));
    window.addEventListener('focus', rollover);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('focus', rollover);
    };
  }, [mode, read, run]);

  useEffect(() => {
    const refresh = (event: StorageEvent) => {
      if (event.key !== null && event.key !== storageKey) return;
      const now = Date.now();
      const next = read(now);
      setRun(next);
      setSeconds(remainingSeconds(next, now));
      setInput('');
      setFeedback('');
    };
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, [read, storageKey]);

  useEffect(() => {
    if (prompt?.id) inputRef.current?.focus({ preventScroll: true });
    if (wasPlaying.current && run?.completed) resultRef.current?.focus({ preventScroll: true });
    wasPlaying.current = !!prompt?.id;
  }, [prompt?.id, run?.completed]);

  useEffect(() => {
    const picker = pickerToFocus.current;
    pickerToFocus.current = null;
    if (picker) (picker === 'sport' ? sportRef : modeRef).current?.focus({ preventScroll: true });
  }, [pickerToFocus]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!input.trim() || seconds <= 0) return;
    change({ type: 'answer', text: input });
    inputRef.current?.focus({ preventScroll: true });
  };

  return (
    <>
      <header className="mb-4 flex items-center justify-between gap-2">
        <Link to="/alphabet-sprint" className={'inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:text-foreground ' + FOCUS}>
          <ArrowLeft aria-hidden="true" className="size-4" /> Alphabet Sprint
        </Link>
        <HowToPlayPopover title="Finals Sprint rules" triggerLabel="How to play Finals Sprint"
          floatingTrigger={false} className="inline-flex size-11 shrink-0 items-center justify-center">
          <ul className="list-disc space-y-2 pl-5">{RULES.map(rule => <li key={rule}>{rule}</li>)}</ul>
          <p>{EXAMPLE}</p>
        </HowToPlayPopover>
      </header>

      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Finals Sprint preview</h1>
      {!prompt && <p className="mb-5 mt-1 text-sm text-muted-foreground">Play a 60-second round on this device.</p>}

      {!prompt && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <fieldset>
            <legend className="mb-1 text-sm font-semibold">Sport</legend>
            <div className="grid grid-cols-3 gap-2">
              {pilotSports.map(option => (
                <button key={option} type="button" ref={sport === option ? sportRef : undefined}
                  aria-pressed={sport === option} onClick={() => choose(option, mode)}
                  className={SECONDARY + ' aria-pressed:border-primary aria-pressed:bg-primary/10'}>
                  {SPORTS[option]}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-1 text-sm font-semibold">Mode</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['daily', 'practice'] as const).map(option => (
                <button key={option} type="button" ref={mode === option ? modeRef : undefined}
                  aria-pressed={mode === option} onClick={() => choose(sport, option)}
                  className={SECONDARY + ' aria-pressed:border-primary aria-pressed:bg-primary/10'}>
                  {MODES[option]}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {!run && (
        <section aria-label="Before you start" className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <p className="text-sm font-medium">{mode === 'daily'
            ? 'One attempt per sport, per Eastern day on this browser.'
            : 'Play as many rounds as you like.'}</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {RULES.map(rule => <li key={rule}>{rule}</li>)}
          </ul>
          <p className="text-sm text-muted-foreground">{EXAMPLE}</p>
          <button type="button" className={PRIMARY + ' w-full sm:w-auto'} onClick={() => change({ type: 'start' })}>
            Start {mode === 'daily' ? 'daily preview' : 'practice'}
          </button>
        </section>
      )}

      {run && prompt && (
        <section aria-label="Current round" className="mt-3 space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm">
            <span className="text-muted-foreground">{SPORTS[sport]} · {MODES[mode]}</span>
            <div className="flex items-center gap-3 font-semibold tabular-nums">
              <span>{score} pts</span>
              <span role="timer" className={seconds <= 10 ? 'text-destructive' : 'text-foreground'}>{seconds}s<span className="sr-only"> remaining</span></span>
            </div>
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">{run.answers.length}/{run.order.length} solved · {DIFFICULTY[prompt.points]} · {prompt.points} pts</p>
            <h2 className="text-xl font-bold leading-snug">{prompt.text}</h2>
          </div>
          <form className="flex gap-2" onSubmit={submit}>
            <label htmlFor="finals-sprint-team" className="sr-only">Team name</label>
            <input id="finals-sprint-team" ref={inputRef} type="text" enterKeyHint="send"
              autoComplete="off" autoCorrect="off" spellCheck={false} maxLength={120}
              value={input} onChange={event => { setInput(event.target.value); setFeedback(''); }}
              placeholder="Type a team name" disabled={seconds <= 0}
              className={'min-h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-base ' + FOCUS} />
            <button className={PRIMARY} type="submit" disabled={!input.trim() || seconds <= 0}>Submit</button>
          </form>
          <p role="status" className="min-h-5 text-sm text-muted-foreground">{feedback}</p>
          {run.answers.length + 1 < run.order.length && (
            <button type="button" disabled={run.deferred || seconds <= 0} className={SECONDARY}
              onClick={() => { change({ type: 'defer' }); inputRef.current?.focus({ preventScroll: true }); }}>
              {run.deferred ? 'Defer used' : 'Defer clue'}
            </button>
          )}
        </section>
      )}

      {run?.completed && (
        <section ref={revealResult} aria-label="Round results" className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h2 ref={resultRef} tabIndex={-1} className="text-2xl font-bold outline-none">{score} points</h2>
          <p className="text-sm text-muted-foreground">
            {run.answers.length}/{run.order.length} solved
            {run.answers.length === run.order.length ? ' · 10-point clear bonus' : ''}
            {mode === 'daily' ? ' · Daily preview complete' : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            {mode === 'practice'
              ? <button type="button" className={PRIMARY} onClick={() => change({ type: 'start' })}>Play again</button>
              : <button type="button" className={PRIMARY} onClick={() => choose(sport, 'practice')}>Switch to practice</button>}
            <button type="button" className={SECONDARY}
              onClick={() => void shareResult(SPORTS[sport] + ' Finals Sprint · ' + MODES[mode] + '\n' + score + ' points', 'Finals Sprint preview')}>
              <Share2 aria-hidden="true" className="size-4" /> Share score
            </button>
          </div>
          <details className="rounded-lg border border-border px-3">
            <summary className={'min-h-11 cursor-pointer rounded-lg py-3 text-sm font-semibold ' + FOCUS}>Show recap and sources</summary>
            <ol className="divide-y divide-border text-sm">
              {pilotRecap(run).map(row => (
                <li key={row.prompt} className="space-y-1 py-3">
                  <p className="font-medium">{row.prompt}</p>
                  <p className="text-muted-foreground">{row.answer ? row.answer + ' · +' + row.points + ' pts' : 'Finalists were ' + row.finalists.join(' and ')}</p>
                  <a href={row.sourceUrl} target="_blank" rel="noopener noreferrer"
                    className={'inline-flex min-h-11 items-center rounded-lg text-primary underline underline-offset-2 ' + FOCUS}
                    aria-label={'Source for ' + row.prompt}>Source</a>
                </li>
              ))}
            </ol>
          </details>
        </section>
      )}
    </>
  );
}

export default function FinalsSprintPreview() {
  const [params, setParams] = useSearchParams();
  const pickerToFocus = useRef<Picker | null>(null);
  const sport = pilotSports.find(option => option === params.get('sport')) ?? 'soccer';
  const mode: PilotMode = params.get('mode') === 'practice' ? 'practice' : 'daily';
  const choose = (nextSport: PilotSport, nextMode: PilotMode) => {
    if (nextSport !== sport || nextMode !== mode) {
      pickerToFocus.current = nextSport !== sport ? 'sport' : 'mode';
      setParams({ preview: 'finals', sport: nextSport, mode: nextMode }, { replace: true });
    }
  };

  return (
    <main id="dukb-main" className="min-h-screen bg-background">
      <PageSeo title="Finals Sprint preview | DoUKnowBall" description="Type your way through six soccer, NBA or NFL finals clues."
        path="/alphabet-sprint" />
      <div className="mx-auto max-w-2xl px-3 py-4 sm:px-4 sm:py-6">
        <FinalsRound key={sport + ':' + mode} sport={sport} mode={mode} choose={choose} pickerToFocus={pickerToFocus} />
      </div>
    </main>
  );
}
