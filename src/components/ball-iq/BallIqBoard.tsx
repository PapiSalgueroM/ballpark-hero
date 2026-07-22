import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy } from 'lucide-react';
import { GameNav } from '@/components/game/GameNav';
import { useBallIq } from '@/hooks/useBallIq';

export function BallIqBoard() {
  const { loading, questions, index, current, status, correctCount, iq, rank, answer, next, shareText } =
    useBallIq();
  const [copied, setCopied] = useState(false);

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="mx-auto h-6 w-40 animate-pulse rounded bg-muted" />
        <p className="mt-4 text-sm text-muted-foreground">Setting the test…</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">Couldn't load today's test. Try again shortly.</p>
        <Link to="/" className="mt-4 inline-block text-sm text-primary hover:underline">
          Back to all games →
        </Link>
      </div>
    );
  }

  if (status === 'finished') {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Your Ball Knowledge IQ
          </p>
          <p className="mt-2 font-display text-7xl font-black text-primary">{iq}</p>
          <p className="mt-1 font-display text-xl font-bold text-gold">{rank}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            {correctCount}/{questions.length} correct
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-1 text-xl">
            {questions.map((q, i) => (
              <span key={i}>{q.chosen === q.clue.answer ? '🟩' : '🟥'}</span>
            ))}
          </div>

          <button
            onClick={copyShare}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Share my IQ'}
          </button>
        </div>

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
                      <span className="text-destructive">✗ {q.chosen ?? '—'}</span>
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

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Question {index + 1} of {questions.length}
        </p>
        <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-bold text-gold">
          ${current.clue.value}
        </span>
      </div>

      <div className="mb-4 flex gap-1">
        {questions.map((q, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${
              i < index
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
                onClick={() => answer(opt)}
                className={`w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors ${cls}`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {revealed && (
          <button
            onClick={next}
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
