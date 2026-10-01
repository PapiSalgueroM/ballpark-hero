import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy } from 'lucide-react';
import { GameNav } from '@/components/game/GameNav';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { VALUES, type ClueValue } from '@/lib/fetchQuizBoard';
import { useQuizBoard } from '@/hooks/useQuizBoard';
import motion from './QuizBoard.module.css';

export function QuizBoard() {
  const {
    loading, categories, board, openTile, score, banked, answeredCount, totalTiles,
    finished, guess, setGuess, select, submit, closeTile, shareText,
  } = useQuizBoard();
  const [copied, setCopied] = useState(false);
  const [pendingAnswer, setPendingAnswer] = useState<{ category: string; value: ClueValue; clueId: string } | null>(null);
  const [feedback, setFeedback] = useState<{ clueId: string; correct: boolean } | null>(null);
  const opener = useRef<{ node: HTMLButtonElement; clueId: string } | null>(null);
  const answeredCells = useRef(new Map<string, HTMLDivElement>());

  useLayoutEffect(() => {
    if (!pendingAnswer) return;
    const tile = board[pendingAnswer.category]?.[pendingAnswer.value];
    if (tile?.clue.clueId === pendingAnswer.clueId && tile.answered && typeof tile.correct === 'boolean') {
      setFeedback({ clueId: tile.clue.clueId, correct: tile.correct });
    }
    setPendingAnswer(null);
  }, [pendingAnswer, board]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 500);
    return () => clearTimeout(timer);
  }, [feedback]);

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="mx-auto h-6 w-40 animate-pulse rounded bg-muted" />
        <p data-no-prerender className="mt-4 text-sm text-muted-foreground">Building today's board…</p>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">Couldn't build today's board. Try again shortly.</p>
        <Link to="/" className="mt-4 inline-flex items-center rounded-full px-4 py-2 text-sm text-primary hover:underline">
          Back to all games →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Score</p>
          <p className={`font-display text-3xl font-black ${score < 0 ? 'text-destructive' : 'text-gold'}`}>
            <span
              key={feedback?.clueId ?? 'score'}
              data-quiz-score={score}
              data-quiz-feedback={feedback ? (feedback.correct ? 'correct' : 'wrong') : undefined}
              className={feedback ? (feedback.correct ? motion.scoreCorrect : motion.scoreWrong) : undefined}
            >${score}</span>
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {answeredCount}/{totalTiles} answered
        </p>
      </div>

      {/* Board */}
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))` }}
      >
        {categories.map(cat => (
          <div
            key={cat}
            className="flex min-h-[52px] items-center justify-center rounded-lg bg-primary/90 px-1 py-2 text-center"
          >
            <span className={`${motion.category} text-[10px] font-black uppercase leading-tight tracking-wide text-primary-foreground sm:text-xs`}>
              {cat}
            </span>
          </div>
        ))}

        {VALUES.map(v =>
          categories.map(cat => {
            const t = board[cat]?.[v];
            if (!t) {
              return <div key={`${cat}-${v}`} className="min-h-[56px] rounded-lg bg-muted/30" />;
            }
            if (t.answered) {
              return (
                <div
                  key={`${cat}-${v}`}
                  ref={node => { if (node) answeredCells.current.set(t.clue.clueId, node); else answeredCells.current.delete(t.clue.clueId); }}
                  role="group"
                  tabIndex={-1}
                  aria-label={`${cat}, $${v}, ${t.correct ? 'correct' : 'wrong'}`}
                  data-quiz-clue={t.clue.clueId}
                  data-quiz-feedback={feedback?.clueId === t.clue.clueId ? (t.correct ? 'correct' : 'wrong') : undefined}
                  className={`${motion.cell} ${feedback?.clueId === t.clue.clueId ? (t.correct ? motion.correct : motion.wrong) : ''} flex min-h-[56px] items-center justify-center rounded-lg border text-2xl ${
                    t.correct
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : 'border-destructive/40 bg-destructive/10'
                  }`}
                >
                  {t.correct ? '🟩' : '🟥'}
                </div>
              );
            }
            return (
              <button
                key={`${cat}-${v}`}
                aria-label={`${cat}, $${v}`}
                data-quiz-clue={t.clue.clueId}
                onClick={e => { opener.current = { node: e.currentTarget, clueId: t.clue.clueId }; select(cat, v); }}
                className="flex min-h-[56px] items-center justify-center rounded-lg border border-gold/30 bg-card font-display text-lg font-black text-gold transition-colors hover:bg-gold/10 sm:text-xl"
              >
                ${v}
              </button>
            );
          }),
        )}
      </div>

      {/* Clue modal */}
      <Dialog open={!!openTile} onOpenChange={open => { if (!open) closeTile(); }}>
        {openTile && (
          <DialogContent
            className={`${motion.dialog} w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border-border bg-card`}
            onCloseAutoFocus={e => {
              e.preventDefault();
              const from = opener.current;
              const target = from?.node.isConnected ? from.node : from && answeredCells.current.get(from.clueId);
              target?.focus({ preventScroll: true });
            }}
          >
              <DialogTitle className="pr-10 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {openTile.clue.category} · ${openTile.clue.value}
              </DialogTitle>

            <DialogDescription className="py-6 text-center font-display text-xl font-bold leading-snug text-foreground">
              {openTile.clue.clue}
            </DialogDescription>

            <form
              onSubmit={e => {
                e.preventDefault();
                setPendingAnswer({ category: openTile.clue.category, value: openTile.clue.value, clueId: openTile.clue.clueId });
                submit();
              }}
              className="flex gap-2"
            >
              <input
                autoFocus
                value={guess}
                onChange={e => setGuess(e.target.value)}
                placeholder="Who or what is…"
                aria-label="Your answer"
                className="flex-1 min-w-0 min-h-[44px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
              <button
                type="submit"
                className="min-h-[44px] rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
              >
                Answer
              </button>
            </form>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Wrong answers cost you ${openTile.clue.value}. Skipping is free, close this to leave it.
            </p>
          </DialogContent>
        )}
      </Dialog>

      {finished && (
        <div className="mt-5 rounded-2xl border border-border bg-card p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Board cleared
          </p>
          <p className="mt-2 font-display text-5xl font-black text-primary">
            ${banked}
          </p>
          {score < 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              You finished on -${Math.abs(score)}. A cleared board never banks below $0.
            </p>
          )}
          <button
            onClick={copyShare}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Share score'}
          </button>
        </div>
      )}

      <GameNav currentPath="/quiz-board" />
    </div>
  );
}
