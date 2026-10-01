import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Check, Copy, Lightbulb } from 'lucide-react';
import { GameNav } from '@/components/game/GameNav';
import { useEmojiGuess } from '@/hooks/useEmojiGuess';
import styles from './EmojiGuessFeedback.module.css';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const shareRef = useRef<HTMLButtonElement>(null);
  const live = useRef({ index, current, finished });
  const pending = useRef<{ kind: 'guess' | 'next'; index: number; id: string; count: number; opener: Element | null } | null>(null);
  const [cue, setCue] = useState<{ kind: 'miss' | 'solved' | 'failed' | 'next' | 'result'; id: string; count: number } | null>(null);

  useLayoutEffect(() => {
    live.current = { index, current, finished };
    const request = pending.current;
    if (!request) return;
    pending.current = null;
    let target: HTMLElement | null = null;
    if (request.kind === 'guess' && index === request.index && current?.puzzle.id === request.id && current.guesses.length === request.count + 1) {
      setCue({ kind: current.done ? current.solved ? 'solved' : 'failed' : 'miss', id: request.id, count: current.guesses.length });
      target = current.done ? nextRef.current : inputRef.current;
    } else if (request.kind === 'next' && index === request.index + 1) {
      setCue({ kind: finished ? 'result' : 'next', id: current?.puzzle.id ?? request.id, count: 0 });
      target = finished ? shareRef.current : inputRef.current;
    }
    const active = document.activeElement;
    if (target && (active === request.opener || active === document.body || !active?.isConnected)) target.focus({ preventScroll: true });
  }, [index, current, finished]);

  useLayoutEffect(() => {
    if (document.activeElement === document.body) inputRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!cue) return;
    const timer = window.setTimeout(() => setCue(null), 600);
    return () => window.clearTimeout(timer);
  }, [cue]);

  const guardRepeat = (event: KeyboardEvent<HTMLInputElement | HTMLButtonElement>) => {
    if (event.repeat && (event.key === 'Enter' || (event.key === ' ' && event.currentTarget.tagName === 'BUTTON'))) event.preventDefault();
  };
  const submitGuess = () => {
    if (!input.trim() || !current || current.done || pending.current || live.current.finished || live.current.index !== index || live.current.current?.guesses.length !== current.guesses.length) return;
    pending.current = { kind: 'guess', index, id: current.puzzle.id, count: current.guesses.length, opener: document.activeElement };
    guess(input);
    setInput('');
  };
  const advance = () => {
    if (!current?.done || pending.current || live.current.finished || live.current.index !== index) return;
    pending.current = { kind: 'next', index, id: current.puzzle.id, count: current.guesses.length, opener: document.activeElement };
    next();
  };

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked, text on screen */ }
  };

  if (finished) {
    return (
      <div className={`mx-auto max-w-xl px-4 py-8 ${styles.board}`} data-emoji-phase="finished">
        <div data-emoji-cue={cue?.kind === 'result' ? 'result' : undefined} className={`rounded-2xl border border-border bg-card p-6 text-center ${cue?.kind === 'result' ? styles.success : ''}`}>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Today's result
          </p>
          <p className="mt-3 font-display text-5xl font-black text-primary">{totalScore}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            points · {solvedCount}/{rounds.length} solved
          </p>
          <p role="status" aria-live="polite" className="sr-only">{cue?.kind === 'result' ? `${totalScore} points. ${solvedCount} of ${rounds.length} puzzles solved.` : ''}</p>
          <div className="mt-4 flex justify-center gap-1 text-2xl">
            {rounds.map((r, i) => (
              <span key={r.puzzle.id} role="img" aria-label={`Puzzle ${i + 1}: ${r.solved ? `${r.points} points` : 'missed'}`}>
                {!r.solved ? '🟥' : r.points === 100 ? '🟩' : r.points === 60 ? '🟨' : '🟧'}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            🟩 first try · 🟨 second · 🟧 third · 🟥 missed
          </p>
          <button
            ref={shareRef}
            onClick={copyShare}
            onKeyDown={guardRepeat}
            className={`mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 ${styles.action}`}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Share result'}
          </button>
        </div>

        <div className="mt-6 space-y-2">
          {rounds.map(r => (
            <div key={r.puzzle.id} data-emoji-review={r.puzzle.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3">
              <span className={`text-2xl shrink-0 max-w-[40%] ${styles.fullText}`}>{r.puzzle.emoji}</span>
              <span className="ml-3 min-w-0 flex-1 text-right">
                <span className={`block text-sm font-bold ${styles.fullText} ${r.solved ? 'text-foreground' : 'text-destructive'}`}>
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
    <div className={`mx-auto max-w-xl px-4 py-8 ${styles.board}`} data-emoji-phase={roundDone ? 'answered' : 'playing'} data-emoji-round={current.puzzle.id}>
      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">Five puzzles, three guesses each. First try earns 100 points, second 60, third 30. For example, one miss unlocks a hint, then a correct answer earns 60. Use Next puzzle after each answer.</p>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Puzzle {index + 1} of {rounds.length}
        </p>
        <div className="flex gap-1">
          {rounds.map((r, i) => (
            <span
              key={r.puzzle.id}
              role="img"
              aria-label={`Puzzle ${i + 1}: ${i > index ? 'up next' : r.done ? r.solved ? `${r.points} points` : 'missed' : 'in progress'}`}
              className={`h-1.5 w-5 rounded-full ${
                i < index ? (r.solved ? 'bg-emerald-500' : 'bg-destructive')
                : i === index ? 'bg-primary/50' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      <div data-emoji-cue={cue?.id === current.puzzle.id && cue.kind === 'next' ? 'next' : undefined} className={`rounded-2xl border border-border bg-card p-6 text-center ${cue?.id === current.puzzle.id && cue.kind === 'next' ? styles.reveal : ''}`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {CATEGORY_LABEL[current.puzzle.category]}
        </p>

        <p className="my-8 text-6xl leading-tight tracking-wide">{current.puzzle.emoji}</p>

        {hintVisible && (
          <p data-emoji-hint className={`mb-4 flex items-center justify-center gap-1.5 text-sm text-gold ${styles.fullText} ${cue?.kind === 'miss' && cue.count === 1 ? styles.reveal : ''}`}>
            <Lightbulb className="h-4 w-4 shrink-0" />
            {current.puzzle.hint}
          </p>
        )}

        {current.guesses.length > 0 && !roundDone && (
          <div className="mb-3 flex flex-wrap justify-center gap-1.5">
            {current.guesses.map((g, i) => (
              <span key={`${current.puzzle.id}:${i}`} data-emoji-guess={i} data-emoji-cue={cue?.kind === 'miss' && cue.count === i + 1 ? 'miss' : undefined} className={`rounded-full bg-destructive/10 px-3 py-1 text-xs text-destructive line-through ${styles.fullText} ${cue?.kind === 'miss' && cue.count === i + 1 ? styles.failure : ''}`}>
                {g}
              </span>
            ))}
          </div>
        )}

        {!roundDone ? (
          <form
            onSubmit={e => { e.preventDefault(); submitGuess(); }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              onKeyDown={guardRepeat}
              /* Round 274: a placeholder is not a name. It disappears the moment you
                 type and screen readers treat it inconsistently, so sweepContrast
                 counts a field with only a placeholder as unnamed, correctly. */
              aria-label="Who or what is this"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Who or what is this…"
              className={`flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground ${styles.action}`}
            />
            <button
              type="submit"
              onKeyDown={guardRepeat}
              disabled={!input.trim()}
              className={`rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-40 ${styles.action}`}
            >
              Guess
            </button>
          </form>
        ) : (
          <div data-emoji-cue={cue?.id === current.puzzle.id && (cue.kind === 'solved' || cue.kind === 'failed') ? cue.kind : undefined} className={cue?.kind === 'solved' ? styles.success : cue?.kind === 'failed' ? styles.failure : ''}>
            <p className={`font-display text-2xl font-black ${styles.fullText} ${current.solved ? 'text-emerald-500' : 'text-destructive'}`}>
              {current.puzzle.answer}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {current.solved ? `+${current.points} points` : 'Nobody gets them all…'}
            </p>
            <button
              ref={nextRef}
              onClick={advance}
              onKeyDown={guardRepeat}
              className={`mt-5 w-full rounded-full bg-primary py-3 font-display font-bold text-primary-foreground hover:opacity-90 ${styles.action}`}
            >
              {index + 1 >= rounds.length ? 'See result' : 'Next puzzle'}
            </button>
          </div>
        )}

        <p role="status" aria-live="polite" aria-atomic="true" className="mt-3 min-h-[40px] text-xs leading-5 text-muted-foreground">
          {cue?.id === current.puzzle.id && cue.kind === 'miss' ? `Not yet. ${3 - current.guesses.length} ${current.guesses.length === 2 ? 'guess' : 'guesses'} left.${current.guesses.length === 1 ? ' Hint unlocked.' : ''}` :
            cue?.id === current.puzzle.id && cue.kind === 'solved' ? `Solved on try ${current.guesses.length}. ${current.points} points earned.` :
            cue?.id === current.puzzle.id && cue.kind === 'failed' ? 'Three guesses used. Answer revealed, 0 points.' :
            cue?.id === current.puzzle.id && cue.kind === 'next' ? `Puzzle ${index + 1}. Three guesses ready.` : ''}
        </p>

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
