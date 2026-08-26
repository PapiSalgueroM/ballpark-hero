import { useState } from 'react';
import { Check, Copy, Lightbulb } from 'lucide-react';
import { GameNav } from '@/components/game/GameNav';
import { useEmojiGuess } from '@/hooks/useEmojiGuess';

const CATEGORY_LABEL: Record<string, string> = {
  player: 'Player',
  club: 'Club',
  manager: 'Manager',
  moment: 'Iconic moment',
};

export function EmojiGuessBoard() {
  const { rounds, index, current, finished, totalScore, solvedCount, hintVisible, guess, next, shareText } =
    useEmojiGuess();
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked, text on screen */ }
  };

  if (finished) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Today's result
          </p>
          <p className="mt-3 font-display text-5xl font-black text-primary">{totalScore}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            points · {solvedCount}/{rounds.length} solved
          </p>
          <div className="mt-4 flex justify-center gap-1 text-2xl">
            {rounds.map((r, i) => (
              <span key={i}>
                {!r.solved ? '🟥' : r.points === 100 ? '🟩' : r.points === 60 ? '🟨' : '🟧'}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            🟩 first try · 🟨 second · 🟧 third · 🟥 missed
          </p>
          <button
            onClick={copyShare}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Share result'}
          </button>
        </div>

        <div className="mt-6 space-y-2">
          {rounds.map((r, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
              <span className="text-2xl">{r.puzzle.emoji}</span>
              <span className="ml-3 min-w-0 flex-1 text-right">
                <span className={`block truncate text-sm font-bold ${r.solved ? 'text-foreground' : 'text-destructive'}`}>
                  {r.puzzle.answer}
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  {CATEGORY_LABEL[r.puzzle.category]} · {r.points} pts
                </span>
              </span>
            </div>
          ))}
        </div>

        <GameNav currentPath="/emoji-guess" />
      </div>
    );
  }

  if (!current) return null;
  const roundDone = current.done;

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Puzzle {index + 1} of {rounds.length}
        </p>
        <div className="flex gap-1">
          {rounds.map((r, i) => (
            <span
              key={i}
              className={`h-1.5 w-5 rounded-full ${
                i < index ? (r.solved ? 'bg-emerald-500' : 'bg-destructive')
                : i === index ? 'bg-primary/50' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {CATEGORY_LABEL[current.puzzle.category]}
        </p>

        <p className="my-8 text-6xl leading-tight tracking-wide">{current.puzzle.emoji}</p>

        {hintVisible && (
          <p className="mb-4 flex items-center justify-center gap-1.5 text-sm text-gold">
            <Lightbulb className="h-4 w-4 shrink-0" />
            {current.puzzle.hint}
          </p>
        )}

        {current.guesses.length > 0 && !roundDone && (
          <div className="mb-3 flex flex-wrap justify-center gap-1.5">
            {current.guesses.map((g, i) => (
              <span key={i} className="rounded-full bg-destructive/10 px-3 py-1 text-xs text-destructive line-through">
                {g}
              </span>
            ))}
          </div>
        )}

        {!roundDone ? (
          <form
            onSubmit={e => { e.preventDefault(); guess(input); setInput(''); }}
            className="flex gap-2"
          >
            <input
              autoFocus
              /* Round 274: a placeholder is not a name. It disappears the moment you
                 type and screen readers treat it inconsistently, so sweepContrast
                 counts a field with only a placeholder as unnamed, correctly. */
              aria-label="Who or what is this"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Who or what is this…"
              className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-40"
            >
              Guess
            </button>
          </form>
        ) : (
          <div>
            <p className={`font-display text-2xl font-black ${current.solved ? 'text-emerald-500' : 'text-destructive'}`}>
              {current.puzzle.answer}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {current.solved ? `+${current.points} points` : 'Nobody gets them all…'}
            </p>
            <button
              onClick={next}
              className="mt-5 w-full rounded-full bg-primary py-3 font-display font-bold text-primary-foreground hover:opacity-90"
            >
              {index + 1 >= rounds.length ? 'See result' : 'Next puzzle'}
            </button>
          </div>
        )}

        {!roundDone && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            {3 - current.guesses.length} guess{3 - current.guesses.length === 1 ? '' : 'es'} left
            {current.guesses.length === 0 ? ' · hint appears after your first miss' : ''}
          </p>
        )}
      </div>

      <GameNav currentPath="/emoji-guess" />
    </div>
  );
}
