import { useMemo, useState, useCallback, useEffect, useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { getTodayET, dateSeed } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { Trophy, ArrowDown, RotateCcw } from 'lucide-react';
import styles from './RankEmOrder.module.css';
import {
  RankRound,
  RANK_POINTS_PER_SLOT,
  getDailyRankRound,
  getRandomRankRound,
  scrambledNames,
  scoreRankGuess,
} from '@/lib/orderTheList';

/**
 * Rank 'Em (backlog: Order the List / Factle). Put five players in order by a
 * career stat, most to fewest. One submission; score = exact-position matches.
 * Deterministic ranking from verified DB totals, no answer-check backend.
 * Daily persistence via useDailyPuzzle's action log (sentinel pattern, same as
 * Missing Five/Nine/Eleven).
 */

type Mode = 'daily' | 'unlimited';
type RankAction = { order: string[] };
const SENTINEL = [{ id: 'rank-em-daily' }];

const RankEm = () => {
  const [mode, setMode] = useState<Mode>('daily');

  const dailyRound = useMemo<RankRound>(() => getDailyRankRound(), []);
  const [unlimitedRound, setUnlimitedRound] = useState<RankRound>(() => getRandomRankRound());
  const [unlimitedSeed, setUnlimitedSeed] = useState<number>(() => Math.floor(Math.random() * 1e9));

  const {
    guesses: dailyActions,
    addGuess: addDailyAction,
    gameStatus: rawDailyStatus,
    isLoading,
  } = useDailyPuzzle<{ id: string }, RankAction>({
    gameSlug: 'rank-em',
    puzzles: SENTINEL,
    maxGuesses: 1,
    isWon: (g) => g.length > 0 && scoreRankGuess(g[0].order, dailyRound) === 5,
    isLost: (g) => g.length > 0 && scoreRankGuess(g[0].order, dailyRound) < 5,
    deserializeGuesses: (raw) => raw as RankAction[],
  });

  const [unlimitedActions, setUnlimitedActions] = useState<RankAction[]>([]);

  const round = mode === 'daily' ? dailyRound : unlimitedRound;
  const seed = mode === 'daily' ? dateSeed(getTodayET()) : unlimitedSeed;
  const actions = mode === 'daily' ? dailyActions : unlimitedActions;
  const submitted = actions.length > 0;
  const submittedOrder = submitted ? actions[0].order : null;

  const scramble = useMemo(() => scrambledNames(round, seed), [round.id, seed]);
  const [picks, setPicks] = useState<string[]>([]);
  const draftRef = useRef(picks);
  const poolRefs = useRef(new Map<string, HTMLButtonElement>());
  const moveRefs = useRef(new Map<string, HTMLButtonElement>());
  const rungRefs = useRef(new Map<string, HTMLDivElement>());
  const lockRef = useRef<HTMLButtonElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<{ target: string; opener: Element | null } | null>(null);
  const pendingLock = useRef<{ mode: Mode; roundId: string; order: string[]; opener: Element | null } | null>(null);
  const [committed, setCommitted] = useState(false);

  // Reset the working picks whenever the round or mode changes.
  useLayoutEffect(() => {
    draftRef.current = [];
    pendingFocus.current = null;
    pendingLock.current = null;
    setPicks([]);
    setCommitted(false);
  }, [round.id, mode]);

  const over = submitted;
  const finalOrder = submittedOrder ?? picks;
  const correctCount = submitted ? scoreRankGuess(submittedOrder as string[], round) : 0;
  const score = correctCount * RANK_POINTS_PER_SLOT;
  const won = submitted && correctCount === 5;

  const act = useCallback((a: RankAction) => {
    if (mode === 'daily') addDailyAction(a);
    else setUnlimitedActions((prev) => [...prev, a]);
  }, [mode, addDailyAction]);

  useLayoutEffect(() => {
    draftRef.current = picks;
    const request = pendingLock.current;
    let target: HTMLElement | null = null;
    let opener: Element | null = null;
    if (request && submitted && request.mode === mode && request.roundId === round.id && submittedOrder?.length === request.order.length && submittedOrder.every((name, i) => name === request.order[i])) {
      pendingLock.current = null;
      setCommitted(true);
      target = resultRef.current?.querySelector<HTMLElement>('h2') ?? resultRef.current;
      if (target) target.tabIndex = -1;
      opener = request.opener;
    } else if (pendingFocus.current && !submitted) {
      const focus = pendingFocus.current;
      target = focus.target === 'lock' ? lockRef.current : poolRefs.current.get(focus.target) ?? moveRefs.current.get(focus.target) ?? rungRefs.current.get(focus.target) ?? null;
      if (target instanceof HTMLButtonElement && target.disabled) target = moveRefs.current.get(focus.target.replace(/:(up|down)$/, ':remove')) ?? null;
      opener = focus.opener;
      pendingFocus.current = null;
    }
    const active = document.activeElement;
    if (target && (active === opener || active === document.body || !active?.isConnected)) {
      target.focus({ preventScroll: true });
      const rung = target.closest<HTMLElement>('[data-rank-slot]'), ladder = rung?.parentElement;
      if (rung && ladder) {
        const row = rung.getBoundingClientRect(), box = ladder.getBoundingClientRect();
        if (row.top < box.top) ladder.scrollTop -= box.top - row.top;
        else if (row.bottom > box.bottom) ladder.scrollTop += row.bottom - box.bottom;
      }
      const visible = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect(), list = element.closest<HTMLElement>('[data-rank-ladder]'), box = list?.getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= window.innerHeight && (!box || rect.top >= box.top && rect.bottom <= box.bottom);
      };
      if (!visible(target)) {
        const fallback = [opener, lockRef.current, undoRef.current, ...poolRefs.current.values(), ...moveRefs.current.values()].find(element => element instanceof HTMLElement && element.isConnected && !(element instanceof HTMLButtonElement && element.disabled) && visible(element));
        if (fallback instanceof HTMLElement) fallback.focus({ preventScroll: true });
      }
    }
  }, [picks, submitted, submittedOrder, mode, round.id]);

  useEffect(() => {
    if (!committed) return;
    const timer = window.setTimeout(() => setCommitted(false), 600);
    return () => window.clearTimeout(timer);
  }, [committed]);

  const edit = (order: string[], target: string) => {
    if (submitted || pendingLock.current || order.every((name, i) => name === draftRef.current[i]) && order.length === draftRef.current.length) return;
    draftRef.current = order;
    pendingFocus.current = { target, opener: document.activeElement };
    setPicks(order);
  };
  const pick = (name: string) => {
    const draft = draftRef.current;
    if (!scramble.includes(name) || draft.includes(name) || draft.length >= 5) return;
    const order = [...draft, name];
    edit(order, order.length === 5 ? 'lock' : scramble.find(n => !order.includes(n)) ?? name);
  };
  const remove = (name: string) => edit(draftRef.current.filter(n => n !== name), `rung:${draftRef.current.indexOf(name)}`);
  const move = (name: string, direction: -1 | 1) => {
    const order = [...draftRef.current], from = order.indexOf(name), to = from + direction;
    if (from < 0 || to < 0 || to >= order.length) return;
    [order[from], order[to]] = [order[to], order[from]];
    edit(order, `${to}:${direction === -1 ? 'up' : 'down'}`);
  };
  const undo = () => { const draft = draftRef.current, last = draft[draft.length - 1]; if (last) remove(last); };
  const lockOrder = () => {
    const order = draftRef.current;
    if (submitted || pendingLock.current || order.length !== 5 || new Set(order).size !== 5 || !order.every(name => scramble.includes(name))) return;
    pendingLock.current = { mode, roundId: round.id, order: [...order], opener: document.activeElement };
    act({ order: [...order] });
  };
  const guardRepeat = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
  };

  const newUnlimited = useCallback(() => {
    setUnlimitedRound(getRandomRankRound());
    setUnlimitedSeed(Math.floor(Math.random() * 1e9));
    setUnlimitedActions([]);
    setPicks([]);
    draftRef.current = [];
    pendingFocus.current = null;
    pendingLock.current = null;
    setCommitted(false);
  }, []);

  /* Round 643: the daily status alone, in either mode (the MissingXi shape).
     Gated on the mode, a trip to Unlimited and back went false then true
     over a daily already recorded and paid it again; a restored finish still
     arrives through useDailyPuzzle's markRestoredFinish handshake. */
  useGameCompletion('rank-em', rawDailyStatus !== 'playing', score);

  const valueOf = (name: string): number | undefined => round.items.find((it) => it.name === name)?.value;

  return (
    <>
      <PageSeo
        title="Rank 'Em - Put the Players in Order | DoUKnowBall"
        description="Put five players in the correct order by a career stat, most to fewest. A new daily ranking across the NBA, NHL and MLB, every number verified."
        path="/rank-em"
      />
      <GameShell
        width="narrow"
        className={styles.board}
        title="📊 RANK 'EM"
        subtitle="Put five players in order by the stat, most to fewest."
        headerExtra={
          <div className="flex items-center justify-center gap-1 mt-4 bg-secondary rounded-full p-1 w-fit mx-auto">
            {(['daily', 'unlimited'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                onKeyDown={guardRepeat}
                className={cn(
                  `px-5 py-1.5 rounded-full text-sm font-semibold transition-all ${styles.action}`,
                  mode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {m === 'daily' ? '📅 Daily' : '∞ Unlimited'}
              </button>
            ))}
          </div>
        }
      >
        {!isLoading && (
          <>
            <div className="text-center mb-4">
              <p className="text-sm font-bold text-primary">{round.sport} · {round.statLabel}</p>
              <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                Rank most <ArrowDown className="w-3 h-3" /> fewest
              </p>
            </div>

            {/* Ranking slots */}
            <div data-rank-ladder className={`max-w-md mx-auto space-y-2 mb-4 ${styles.ladder}`}>
              {Array.from({ length: 5 }).map((_, i) => {
                const name = finalOrder[i];
                const isCorrect = over && name === round.items[i].name;
                return (
                  <div
                    key={i}
                    data-rank-slot={i}
                    ref={el => { if (el) rungRefs.current.set(`rung:${i}`, el); else rungRefs.current.delete(`rung:${i}`); }}
                    role="group"
                    aria-label={`Rank ${i + 1}: ${name ?? 'empty'}`}
                    tabIndex={-1}
                    className={cn(
                      `flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-xl border ${styles.rung}`,
                      !name && 'bg-secondary/40 border-dashed border-border',
                      name && !over && 'bg-card border-border',
                      over && (isCorrect ? 'bg-correct/10 border-correct' : 'bg-destructive/10 border-destructive')
                    )}
                  >
                    <span className="w-6 text-sm font-bold text-muted-foreground shrink-0">{i + 1}</span>
                    <span data-rank-name className={`min-w-0 flex-1 text-sm font-semibold text-foreground ${styles.fullText}`}>{name ?? 'Pick a player'}</span>
                    {!over && (
                      <div className={styles.moves}>
                        <button ref={el => { if (el) moveRefs.current.set(`${i}:up`, el); else moveRefs.current.delete(`${i}:up`); }} aria-label={`Move ${name ?? `player in spot ${i + 1}`} up`} disabled={!name || i === 0} onClick={() => { if (name) move(name, -1); }} onKeyDown={guardRepeat} className={styles.action}>↑</button>
                        <button ref={el => { if (el) moveRefs.current.set(`${i}:down`, el); else moveRefs.current.delete(`${i}:down`); }} aria-label={`Move ${name ?? `player in spot ${i + 1}`} down`} disabled={!name || i >= picks.length - 1} onClick={() => { if (name) move(name, 1); }} onKeyDown={guardRepeat} className={styles.action}>↓</button>
                        <button ref={el => { if (el) moveRefs.current.set(`${i}:remove`, el); else moveRefs.current.delete(`${i}:remove`); }} aria-label={`Remove ${name ?? `player from spot ${i + 1}`}`} disabled={!name} onClick={() => { if (name) remove(name); }} onKeyDown={guardRepeat} className={styles.action}>Remove</button>
                      </div>
                    )}
                    {over && name && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {valueOf(name)?.toLocaleString()} {round.unit}
                      </span>
                    )}
                    {over && (isCorrect ? <span className="text-correct text-sm font-bold">✓</span> : <span className="text-destructive text-sm font-bold">✗</span>)}
                  </div>
                );
              })}
            </div>

            {/* Pool */}
            {!over && (
              <div className="max-w-md mx-auto">
                <p role="status" className="text-xs text-muted-foreground text-center mb-2">{picks.length}/5 selected. Review your order, then lock it once.</p>
                <p className="text-xs text-muted-foreground text-center mb-3">Pick highest first. Use the arrows to swap neighbors, or remove a pick. For example, move your second pick up to put it first.</p>
                <button ref={lockRef} onClick={lockOrder} onKeyDown={guardRepeat} disabled={picks.length !== 5} className={`mb-3 w-full rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-40 ${styles.action}`}>Lock order</button>
                <div className="flex flex-wrap justify-center gap-2">
                  {scramble.map((name) => (
                    <button
                      key={name}
                      data-rank-player={name}
                      ref={el => { if (el) poolRefs.current.set(name, el); else poolRefs.current.delete(name); }}
                      disabled={picks.includes(name)}
                      onClick={() => pick(name)}
                      onKeyDown={guardRepeat}
                      className={`px-3 py-2 rounded-xl bg-primary/10 border border-primary/30 text-sm font-semibold text-foreground hover:bg-primary/20 transition-colors disabled:opacity-40 ${styles.action} ${styles.fullText}`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                {picks.length > 0 && (
                  <div className="flex justify-center mt-3">
                    <button ref={undoRef} onClick={undo} onKeyDown={guardRepeat} className={`inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ${styles.action}`}>
                      <RotateCcw className="w-3 h-3" /> Undo last
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Result */}
            {over && (
              <div ref={resultRef} role="region" aria-label="Rank result" tabIndex={-1} data-rank-action-count={actions.length} data-rank-cue={committed ? 'committed' : undefined} className={`mt-4 flex justify-center ${styles.result} ${styles.fullText} ${committed ? styles.committed : ''}`}>
                <ResultScreen
                  won={won}
                  outcomeEmoji={won ? '🏆' : correctCount >= 3 ? '👏' : '🙈'}
                  headline={`${correctCount} / 5 correct`}
                  statLine={<>{round.sport} · {round.statLabel}</>}
                  funFact={<>💡 Correct order: {round.items.map((it) => it.name).join(' › ')}</>}
                  statRow={[{ label: 'Score', value: <span className="inline-flex items-center gap-1"><Trophy className="w-4 h-4" />{score}</span> }]}
                  emojiGrid={`📊 Rank 'Em, ${round.sport} ${round.statLabel}: ${correctCount}/5`}
                  share={{
                    score: `${correctCount}/5 on today's Rank 'Em`,
                    gameName: "Rank 'Em",
                    gamePath: '/rank-em',
                  }}
                  onPlayAgain={mode === 'unlimited' ? newUnlimited : undefined}
                  playAgainLabel="New round"
                  playNext={mode === 'daily' ? <p className="text-sm text-muted-foreground">Come back tomorrow for a new ranking!</p> : undefined}
                />
              </div>
            )}
          </>
        )}

        <GameSeoContent
          pageHasOwnH1
          title="Rank 'Em | DoUKnowBall"
          description="A stat is named and you get five players near the top of it. Put them in the exact order, most to fewest. Every ranking is real career totals from the database, no opinions, one right answer."
          howToPlay={[
            'A career stat is named, with five players who rank near the top of it',
            'Tap the players in order, highest first, down to fifth',
            'You get one submission per day',
            'Your score is how many you place in the exact right spot (200 each, 1000 for a perfect 5/5)',
            'Every ranking is exact career totals from the database',
          ]}
          examples={[
            'Career points: is it Kobe or Dirk on top, and where does Iverson land?',
            'NHL goals: Ovechkin passed Gretzky, but who comes third?',
            'Career home runs: Bonds, Aaron, Ruth, Pujols, Mays, in what order?',
          ]}
        />

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="rank-em" gameContext={{ round: round.id }} />
        </div>
        <GameNav />
      </GameShell>
    </>
  );
};

export default RankEm;
