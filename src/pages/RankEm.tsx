import { useMemo, useState, useCallback, useEffect, useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { useDailyPuzzle } from '@/hooks/useDailyPuzzle';
import { isRankEmLog } from '@/lib/dailySaveShapes';
import { getTodayET, dateSeed } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { Trophy, ArrowDown, RotateCcw } from 'lucide-react';
import styles from './RankEmOrder.module.css';
import { advanceCircuit, CIRCUIT_SPORTS, circuitRound, circuitScore, createCircuit, editCircuit, loadCircuit, lockCircuit, saveCircuit, startCircuit, type CircuitState } from '@/lib/rankEmCircuit';
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

type Mode = 'daily' | 'unlimited' | 'circuit';
type RankAction = { order: string[] };
const SENTINEL = [{ id: 'rank-em-daily' }];

const RankEm = () => {
  const [mode, setMode] = useState<Mode>('daily');

  const dailyRound = useMemo<RankRound>(() => getDailyRankRound(), []);
  const [unlimitedRound, setUnlimitedRound] = useState<RankRound>(() => getRandomRankRound());
  const [unlimitedSeed, setUnlimitedSeed] = useState<number>(() => Math.floor(Math.random() * 1e9));
  const [circuit, setCircuit] = useState<CircuitState | null>(loadCircuit);
  const circuitRef = useRef(circuit);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [circuitHelp, setCircuitHelp] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const circuitSerial = useRef(0);
  const circuitAction = useRef<HTMLButtonElement>(null);
  const circuitHeading = useRef<HTMLParagraphElement>(null);
  const circuitFocus = useRef<Element | null | false>(false);
  const heldDraft = useRef<{ mode: Mode; roundId: string; picks: string[] } | null>(null);
  const isCircuit = mode === 'circuit' && circuit !== null;
  const circuitIndex = reviewIndex ?? circuit?.index ?? 0;
  const circuitArea = useRevealScroll<HTMLDivElement>(`${mode}:${circuit?.phase}:${circuit?.index}:${reviewIndex}`, { enabled: isCircuit && !circuitHelp, skipFirst: false });
  const storeCircuit = useCallback((next: CircuitState) => {
    if (next === circuitRef.current) return;
    circuitRef.current = next;
    setCircuit(next);
    setSaveFailed(!saveCircuit(next));
  }, []);

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
    isValidGuesses: isRankEmLog,
  });

  const [unlimitedActions, setUnlimitedActions] = useState<RankAction[]>([]);

  const round = isCircuit ? circuitRound(circuit, circuitIndex) : mode === 'daily' ? dailyRound : unlimitedRound;
  const seed = isCircuit ? circuit.seeds[circuitIndex] : mode === 'daily' ? dateSeed(getTodayET()) : unlimitedSeed;
  const actions = isCircuit ? circuit.orders[circuitIndex] ? [{ order: circuit.orders[circuitIndex]! }] : [] : mode === 'daily' ? dailyActions : unlimitedActions;
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
    const restored = isCircuit ? circuit.drafts[circuitIndex] : heldDraft.current?.mode === mode && heldDraft.current.roundId === round.id ? heldDraft.current.picks : [];
    if (!isCircuit && heldDraft.current?.mode === mode) heldDraft.current = null;
    draftRef.current = [...restored];
    pendingFocus.current = null;
    pendingLock.current = null;
    setPicks([...restored]);
    setCommitted(false);
  }, [round.id, mode]);

  const over = submitted;
  const finalOrder = submittedOrder ?? picks;
  const correctCount = submitted ? scoreRankGuess(submittedOrder as string[], round) : 0;
  const score = correctCount * RANK_POINTS_PER_SLOT;
  const won = submitted && correctCount === 5;

  const act = useCallback((a: RankAction) => {
    if (mode === 'circuit') {
      if (circuitRef.current) storeCircuit(lockCircuit(circuitRef.current));
    } else if (mode === 'daily') addDailyAction(a);
    else setUnlimitedActions((prev) => [...prev, a]);
  }, [mode, addDailyAction, storeCircuit]);

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
    if (isCircuit && (circuitHelp || circuitRef.current?.phase !== 'playing')) return;
    if (submitted || pendingLock.current || order.every((name, i) => name === draftRef.current[i]) && order.length === draftRef.current.length) return;
    draftRef.current = order;
    pendingFocus.current = { target, opener: document.activeElement };
    if (isCircuit && circuitRef.current) storeCircuit(editCircuit(circuitRef.current, order));
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
    if (isCircuit && (circuitHelp || circuitRef.current?.phase !== 'playing')) return;
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

  const enterCircuit = () => {
    if (mode === 'circuit') return;
    heldDraft.current = { mode, roundId: round.id, picks: [...draftRef.current] };
    if (!circuitRef.current) {
      const next = createCircuit(getDailyRankRound().id, (Date.now() + Math.floor(Math.random() * 1e9) + ++circuitSerial.current) >>> 0);
      if (!next) return;
      storeCircuit(next);
    }
    circuitFocus.current = document.activeElement;
    setMode('circuit');
  };
  const circuitStep = () => {
    const state = circuitRef.current;
    if (!isCircuit || circuitHelp || !state) return;
    const next = state.phase === 'intro' ? startCircuit(state) : advanceCircuit(state);
    if (next === state) return;
    circuitFocus.current = document.activeElement;
    storeCircuit(next);
  };
  const replayCircuit = () => {
    const state = circuitRef.current;
    if (!isCircuit || circuitHelp || state?.phase !== 'done') return;
    const next = createCircuit(getDailyRankRound().id, (Date.now() + Math.floor(Math.random() * 1e9) + ++circuitSerial.current) >>> 0);
    if (!next) return;
    setReviewIndex(null);
    circuitFocus.current = document.activeElement;
    storeCircuit(startCircuit(next));
  };
  useLayoutEffect(() => {
    if (!isCircuit || circuitHelp || circuitFocus.current === false) return;
    const nextFocus = circuit?.phase === 'playing' ? circuitHeading.current : circuitAction.current;
    if (!nextFocus) return;
    const opener = circuitFocus.current, active = document.activeElement;
    circuitFocus.current = false;
    if (active === opener || active === document.body || !active?.isConnected) nextFocus.focus({ preventScroll: true });
  }, [isCircuit, circuit?.phase, circuit?.index, reviewIndex, circuitHelp, isLoading]);
  useEffect(() => { if (!isCircuit) setCircuitHelp(false); }, [isCircuit]);

  /* Round 643: the daily status alone, in either mode (the MissingXi shape).
     Gated on the mode, a trip to Unlimited and back went false then true
     over a daily already recorded and paid it again; a restored finish still
     arrives through useDailyPuzzle's markRestoredFinish handshake. */
  useGameCompletion('rank-em', rawDailyStatus !== 'playing', isCircuit ? scoreRankGuess(dailyActions[0]?.order ?? [], dailyRound) * RANK_POINTS_PER_SLOT : score);

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
        className={cn(styles.board, isCircuit && styles.circuitPage)}
        help={isCircuit ? 'none' : 'auto'}
        title={isCircuit ? 'LEGENDS CIRCUIT' : "📊 RANK 'EM"}
        subtitle={isCircuit ? 'Three sports. Fifteen places. One run.' : 'Put five players in order by the stat, most to fewest.'}
        headerExtra={
          <div className="flex flex-wrap items-center justify-center gap-1 mt-4 bg-secondary rounded-xl p-1 w-fit mx-auto">
            {(['daily', 'unlimited'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                onKeyDown={guardRepeat}
                className={cn(
                  `px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${styles.action}`,
                  mode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {m === 'daily' ? '📅 Daily' : '∞ Unlimited'}
              </button>
            ))}
            <button onClick={enterCircuit} onKeyDown={guardRepeat} aria-pressed={isCircuit} className={cn(`rounded-lg px-3 py-1.5 text-xs font-semibold ${styles.action}`, isCircuit ? 'bg-primary text-primary-foreground' : 'text-primary hover:bg-primary/10')}>Legends circuit</button>
          </div>
        }
      >
        {!isLoading && (
          <div ref={isCircuit ? circuitArea : undefined} data-rank-circuit={isCircuit ? '' : undefined} data-circuit-phase={isCircuit ? circuit.phase : undefined} data-circuit-sport={isCircuit ? round.sport : undefined} data-circuit-round={isCircuit ? round.id : undefined} className={isCircuit ? styles.circuit : undefined}>
            {isCircuit && <>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">Completed league careers. Unranked.</p>
                <HowToPlayPopover title="Legends circuit rules" triggerLabel="Legends circuit rules" floatingTrigger={false} className={styles.action} open={circuitHelp} onOpenChange={setCircuitHelp}>
                  <p>Rank five players from most to fewest in each sport: NBA, NHL, then MLB. Pick all five, edit with the arrows or Remove, then press Lock order.</p>
                  <p>Each exact position earns one point. Five places per sport, fifteen in the circuit. Your Daily score stays separate.</p>
                  <p>For example, totals of 30, 20 and 10 belong in that order. Swapping the first two leaves only the last player in the right place. These example numbers are not player statistics.</p>
                  <p>Each reveal shows the full names, totals and your positions. Press Next sport when ready. This run saves on this device, including unfinished picks. A new run excludes the Daily board at the time it starts.</p>
                </HowToPlayPopover>
              </div>
              <div className="mb-3 grid grid-cols-3 gap-2" aria-label="Circuit progress">
                {CIRCUIT_SPORTS.map((sport, i) => <div key={sport} className={cn('rounded-xl border px-2 py-2 text-center', i === circuitIndex ? 'border-primary bg-primary/10' : 'border-border bg-card')}>
                  <span aria-hidden="true" className="text-xl">{['🏀', '🏒', '⚾'][i]}</span><span className="block text-xs font-bold">{sport}</span>
                  <span className="block text-xs text-muted-foreground">{circuit.orders[i] ? `${scoreRankGuess(circuit.orders[i]!, circuitRound(circuit, i))} / 5` : i === circuit.index && circuit.phase !== 'intro' ? 'Up now' : 'To play'}</span>
                </div>)}
              </div>
              {saveFailed && <p role="alert" className="mb-3 rounded-lg border border-destructive/50 p-3 text-sm">Your run is open, but this browser could not save it. Keep this tab open to finish.</p>}
              {circuit.phase === 'intro' && <div className="rounded-2xl border border-primary/30 bg-card p-4 text-sm">
                <h2 className="text-lg font-bold">Put the legends in order.</h2>
                <p className="mt-2 text-muted-foreground">Pick five names from most to fewest. Move or remove picks before Lock order. Each exact position earns one point.</p>
                <div className="my-3 rounded-xl bg-secondary p-3"><strong>Worked example</strong><p className="mt-1">30, 20, 10 is the right order. Put 20 first and 30 second: only 10 keeps its correct place. These are example numbers.</p></div>
                <p className="mb-3 text-muted-foreground">Play one NBA, one NHL and one MLB board. Your picks and reveals save here; your Daily stays separate.</p>
                <button ref={circuitAction} onClick={circuitStep} onKeyDown={guardRepeat} className={`w-full rounded-xl bg-primary px-3 py-3 font-bold text-primary-foreground ${styles.action}`}>Start circuit</button>
              </div>}
              {circuit.phase === 'done' && reviewIndex === null && <div data-circuit-result="" className="rounded-2xl border border-primary/30 bg-card p-4 text-center">
                <h2 className="text-xl font-bold">Circuit complete</h2>
                <p data-circuit-total="" className="my-3 font-display text-4xl text-primary">{circuitScore(circuit)} / 15</p>
                <p className="mb-3 text-sm text-muted-foreground">Exact places across three sports. Open a sport to review your order.</p>
                <div className="grid grid-cols-3 gap-2">{CIRCUIT_SPORTS.map((sport, i) => <button key={sport} aria-label={`Review ${sport}`} onClick={() => { circuitFocus.current = document.activeElement; setReviewIndex(i); }} className={`rounded-xl border border-border bg-secondary px-1 py-3 text-sm ${styles.action}`}><strong className="block">{sport}</strong><span data-circuit-score={sport}>{scoreRankGuess(circuit.orders[i]!, circuitRound(circuit, i))} / 5</span><span className="block text-xs text-primary">Review</span></button>)}</div>
                <button ref={circuitAction} onClick={replayCircuit} onKeyDown={guardRepeat} className={`mt-4 w-full rounded-xl bg-primary px-3 py-3 font-bold text-primary-foreground ${styles.action}`}>Play another circuit</button>
                <p className="mt-2 text-xs text-muted-foreground">Saved on this device. No leaderboard points.</p>
              </div>}
            </>}
            {(!isCircuit || circuit.phase === 'playing' || circuit.phase === 'reveal' || reviewIndex !== null) && <>
            <div className="text-center mb-4">
              <p ref={circuitHeading} tabIndex={-1} className="text-sm font-bold text-primary">{round.sport} · {round.statLabel}</p>
              <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                Rank most <ArrowDown className="w-3 h-3" /> fewest
              </p>
            </div>

            {/* Ranking slots */}
            {!(isCircuit && over) && <div data-rank-ladder className={`max-w-md mx-auto space-y-2 mb-4 ${styles.ladder}`}>
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
            </div>}

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
            {over && !isCircuit && (
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
            {isCircuit && over && <div ref={resultRef} role="region" aria-label="Circuit round result" tabIndex={-1} data-circuit-reveal="" className={cn('rounded-2xl border border-primary/30 bg-card p-3', committed && styles.committed)}>
              <h2 className="mb-2 text-center text-lg font-bold">{correctCount} / 5 exact places</h2>
              <ol className="space-y-1">{round.items.map((item, i) => <li key={item.name} className={cn('grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 py-2 text-sm', submittedOrder?.[i] === item.name ? 'bg-correct/10' : 'bg-secondary/60')}>
                <strong>{i + 1}</strong><span className="min-w-0"><span className="block font-semibold">{item.name}</span><span className="block text-xs text-muted-foreground">Your #{submittedOrder!.indexOf(item.name) + 1}{submittedOrder?.[i] === item.name ? ', correct' : ''}</span></span><span className="text-right text-xs tabular-nums">{item.value.toLocaleString()}<span className="block text-muted-foreground">{round.unit}</span></span>
              </li>)}</ol>
              {reviewIndex !== null ? <button ref={circuitAction} onClick={() => { circuitFocus.current = document.activeElement; setReviewIndex(null); }} className={`mt-3 w-full rounded-xl bg-primary px-3 py-3 font-semibold text-primary-foreground ${styles.action}`}>Back to circuit results</button> : <button ref={circuitAction} onClick={circuitStep} onKeyDown={guardRepeat} className={`mt-3 w-full rounded-xl bg-primary px-3 py-3 font-semibold text-primary-foreground ${styles.action}`}>{circuit.index === 2 ? 'View circuit results' : 'Next sport'}</button>}
            </div>}
            </>}
          </div>
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
