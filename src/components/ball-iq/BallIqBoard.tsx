import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { GameNav } from '@/components/game/GameNav';
import { ResultScreen } from '@/components/game/ResultScreen';
import { RestoredResult, useFreshFinish } from '@/components/game/RestoredResult';
import { useBallIq } from '@/hooks/useBallIq';
import styles from './BallIqFeedback.module.css';

/* Round 951: the card's state follows the rank the hook gave this IQ, which
   is also the card's headline, so retuning the bands in useBallIq moves both
   together. Solid ball knowledge or better is a win, Casual a good try, the
   two ranks under it not this time. */
const WIN_RANKS = new Set(['Certified ball knower', 'Knows ball', 'Solid ball knowledge']);
const CLOSE_RANKS = new Set(['Casual']);

export function BallIqBoard() {
  const { loading, questions, index, current, status, correctCount, iq, rank, answer, next, shareText } =
    useBallIq();
  const nextRef = useRef<HTMLButtonElement>(null);
  const pendingAnswer = useRef<{ index: number; id: string; chosen: string; opener: Element | null } | null>(null);
  const [cue, setCue] = useState<{ id: string; chosen: string } | null>(null);
  const answeredCount = questions.filter(q => q.chosen !== null).length;
  /* The moment plays when the twelfth answer lands here, never on a reopen or reload. */
  const freshFinish = useFreshFinish(!loading, status === 'finished');

  useLayoutEffect(() => {
    const request = pendingAnswer.current;
    if (!request) return;
    pendingAnswer.current = null;
    if (status !== 'revealed' || index !== request.index || current?.clue.clueId !== request.id || current.chosen !== request.chosen) return;
    setCue({ id: request.id, chosen: request.chosen });
    const active = document.activeElement;
    if (active === request.opener || active === document.body || !active?.isConnected) nextRef.current?.focus({ preventScroll: true });
  }, [index, status, current?.clue.clueId, current?.chosen]);

  useEffect(() => {
    if (!cue) return;
    const timer = window.setTimeout(() => setCue(null), 600);
    return () => window.clearTimeout(timer);
  }, [cue]);

  const guardRepeat = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
  };
  const submitAnswer = (option: string) => {
    if (!current || status !== 'answering' || pendingAnswer.current) return;
    pendingAnswer.current = { index, id: current.clue.clueId, chosen: option, opener: document.activeElement };
    answer(option);
  };
  const advance = () => {
    if (status !== 'revealed' || pendingAnswer.current) return;
    setCue(null);
    next();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto h-6 w-40 animate-pulse rounded bg-muted" />
        <p data-no-prerender className="mt-4 text-sm text-muted-foreground">Setting the test…</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">Couldn't load today's test. Try again shortly.</p>
        <Link to="/" className="mt-4 inline-flex items-center rounded-full px-4 py-2 text-sm text-primary hover:underline">
          Back to all games →
        </Link>
      </div>
    );
  }

  if (status === 'finished') {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        {/* Round 951: the test ends on the shared result moment, the answer
            review stays under it. The state follows the rank (see WIN_RANKS). */}
        <RestoredResult restored={!freshFinish}>
        <ResultScreen
          outcome={WIN_RANKS.has(rank) ? 'win' : CLOSE_RANKS.has(rank) ? 'close' : 'loss'}
          score={iq}
          scoreLabel="Ball Knowledge IQ"
          outcomeEmoji="🧠"
          headline={rank}
          statLine={`${correctCount}/${questions.length} correct`}
          emojiGrid={shareText.split('\n').slice(1, -2).join('\n')}
          share={{ score: `IQ ${iq}`, gameName: 'Ball Knowledge IQ', gamePath: '/ball-iq', customText: shareText }}
        />
        </RestoredResult>

        <div className="mt-6 space-y-2">
          {questions.map((q, i) => {
            const right = q.chosen === q.clue.answer;
            return (
              <div key={i} className="rounded-xl border border-border bg-card px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  {q.clue.category} · ${q.clue.value}
                </p>
                <p className="mt-0.5 text-sm text-foreground">{q.clue.clue}</p>
                <p className="mt-1 text-xs">
                  {right ? (
                    <span className="text-emerald-500">✓ {q.clue.answer}</span>
                  ) : (
                    <>
                      <span className="text-destructive">✗ {q.chosen ?? '-'}</span>
                      <span className="text-muted-foreground"> · answer: </span>
                      <span className="font-semibold text-foreground">{q.clue.answer}</span>
                    </>
                  )}
                </p>
              </div>
            );
          })}
        </div>

        <GameNav currentPath="/ball-iq" />
      </div>
    );
  }

  if (!current) return null;
  const revealed = status === 'revealed';
  const correct = current.chosen === current.clue.answer;
  const cueActive = revealed && cue?.id === current.clue.clueId && cue.chosen === current.chosen;
  const announcement = correct ? `Correct. ${current.clue.answer}.` : `Not quite. The answer is ${current.clue.answer}.`;

  return (
    <div className={`mx-auto max-w-xl px-4 py-8 ${styles.board}`}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Question {index + 1} of {questions.length}
        </p>
        <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-bold text-gold">
          ${current.clue.value}
        </span>
      </div>

      <p className="mb-2 text-sm font-semibold text-muted-foreground">{answeredCount}/{questions.length} answered · {correctCount} correct</p>
      <div className="mb-4 flex gap-1" role="progressbar" aria-label="Questions answered" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={answeredCount}>
        {questions.map((q, i) => (
          <span
            key={i}
            data-ball-iq-progress={i}
            data-answer-state={q.chosen !== null ? q.chosen === q.clue.answer ? 'correct' : 'wrong' : 'unanswered'}
            className={`h-1.5 flex-1 rounded-full ${
              q.chosen !== null
                ? q.chosen === q.clue.answer ? 'bg-emerald-500' : 'bg-destructive'
                : i === index ? 'bg-primary/50' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {current.clue.category}
        </p>
        <p className="mt-3 text-center font-display text-xl font-bold leading-snug text-foreground">
          {current.clue.clue}
        </p>

        <div className="mt-6 space-y-2">
          {current.options.map(opt => {
            const isAnswer = opt === current.clue.answer;
            const isChosen = opt === current.chosen;
            let cls = 'border-border bg-background hover:border-primary/50';
            if (revealed) {
              if (isAnswer) cls = 'border-emerald-500/60 bg-emerald-500/10';
              else if (isChosen) cls = 'border-destructive/60 bg-destructive/10';
              else cls = 'border-border bg-background opacity-50';
            }
            return (
              <button
                key={opt}
                disabled={revealed}
                aria-label={revealed ? `${opt}${isAnswer ? ', correct answer' : isChosen ? ', your pick' : ''}` : undefined}
                onClick={() => submitAnswer(opt)}
                onKeyDown={guardRepeat}
                className={`flex min-h-[44px] w-full items-center gap-2 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors ${styles.option} ${styles.fullText} ${cls}`}
              >
                <span className="min-w-0 flex-1">{opt}</span>
                <span aria-hidden="true" className="w-5 shrink-0">{revealed && (isAnswer ? <Check className="h-5 w-5 text-primary" /> : isChosen ? <X className="h-5 w-5 text-destructive" /> : null)}</span>
              </button>
            );
          })}
        </div>

        <div data-ball-iq-outcome={revealed ? correct ? 'correct' : 'wrong' : undefined}
          data-ball-iq-cue={cueActive ? correct ? 'correct' : 'wrong' : undefined}
          className={`${styles.feedback} ${styles.fullText} ${revealed ? correct ? styles.correct : styles.wrong : ''} ${cueActive ? styles.reveal : ''}`}>
          {revealed ? <>
            <p className="font-display text-xl font-black text-foreground">{correct ? 'Correct.' : 'Not quite.'}</p>
            <p className="mt-1 text-sm text-foreground"><span className="text-muted-foreground">Answer: </span><strong>{current.clue.answer}</strong></p>
          </> : <p className="text-sm text-muted-foreground">Your answer locks in when you choose it.</p>}
        </div>
        <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{cueActive ? `${announcement} ${answeredCount} of ${questions.length} answered, ${correctCount} correct.` : ''}</p>

        {revealed && (
          <button
            ref={nextRef}
            onClick={advance}
            onKeyDown={guardRepeat}
            className="mt-5 w-full rounded-full bg-primary py-3 font-display font-bold text-primary-foreground hover:opacity-90"
          >
            {index + 1 >= questions.length ? 'See my IQ' : 'Next question'}
          </button>
        )}
      </div>

      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        Harder questions are worth more. The last few decide your score.
      </p>
    </div>
  );
}
