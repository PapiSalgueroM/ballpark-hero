import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, X } from 'lucide-react';
import { GameNav } from '@/components/game/GameNav';
import { VALUES } from '@/lib/fetchJeopardy';
import { useJeopardy } from '@/hooks/useJeopardy';

export function JeopardyBoard() {
  const {
    loading, categories, board, openTile, score, answeredCount, totalTiles,
    finished, guess, setGuess, select, submit, closeTile, shareText,
  } = useJeopardy();
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
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="mx-auto h-6 w-40 animate-pulse rounded bg-muted" />
        <p className="mt-4 text-sm text-muted-foreground">Building today's board…</p>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">Couldn't build today's board. Try again shortly.</p>
        <Link to="/" className="mt-4 inline-block text-sm text-primary hover:underline">
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
            ${score}
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
            <span className="text-[10px] font-black uppercase leading-tight tracking-wide text-primary-foreground sm:text-xs">
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
                  className={`flex min-h-[56px] items-center justify-center rounded-lg border text-2xl ${
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
                onClick={() => select(cat, v)}
                className="flex min-h-[56px] items-center justify-center rounded-lg border border-gold/30 bg-card font-display text-lg font-black text-gold transition-colors hover:bg-gold/10 sm:text-xl"
              >
                ${v}
              </button>
            );
          }),
        )}
      </div>

      {/* Clue modal */}
      {openTile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {openTile.clue.category} · ${openTile.clue.value}
              </span>
              <button onClick={closeTile} aria-label="Close">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <p className="py-6 text-center font-display text-xl font-bold leading-snug text-foreground">
              {openTile.clue.clue}
            </p>

            <form
              onSubmit={e => { e.preventDefault(); submit(); }}
              className="flex gap-2"
            >
              <input
                autoFocus
                value={guess}
                onChange={e => setGuess(e.target.value)}
                placeholder="Who or what is…"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
              <button
                type="submit"
                className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
              >
                Answer
              </button>
            </form>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Wrong answers cost you ${openTile.clue.value}. Skipping is free — close this to leave it.
            </p>
          </div>
        </div>
      )}

      {finished && (
        <div className="mt-5 rounded-2xl border border-border bg-card p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Board cleared
          </p>
          <p className={`mt-2 font-display text-5xl font-black ${score < 0 ? 'text-destructive' : 'text-primary'}`}>
            ${score}
          </p>
          <button
            onClick={copyShare}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Share score'}
          </button>
        </div>
      )}

      <GameNav currentPath="/jeopardy" />
    </div>
  );
}
