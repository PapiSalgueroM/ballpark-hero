import { FlagFromEmoji } from '@/components/FlagImg';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, SkipForward, X } from 'lucide-react';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { RulesGate } from '@/components/game/RulesGate';
import { GiveUpButton } from '@/components/game/GiveUpButton';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import {
  BingoCriterion,
  BingoData,
  BingoPlayer,
  BOARD_SIZE,
  START_LIVES,
  buildCriteria,
  buildDeck,
  buildShareGrid,
  countCompletedLines,
  fetchBingoData,
  generateBoard,
  layoutGrid,
} from '@/lib/playerBingo';
import { FirstLineBanner, LineFlash } from '@/components/player-bingo/LineBanner';

/** Why the run ended, for result-screen copy. */
type EndReason = 'deck' | 'strikes' | 'banked' | 'blackout' | null;

type Phase = 'boot' | 'error' | 'playing' | 'won' | 'lost';

const BEST_KEY = 'player_bingo_best_lines_v2';

function loadBest(): number {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}

const PlayerBingo = () => {
  // Every hook sits above any conditional rendering, so the hook count can
  // never change between renders (the React error #310 trap documented in
  // CLAUDE.md: the loading check must sit below every hook).
  const [phase, setPhase] = useState<Phase>('boot');
  const [data, setData] = useState<BingoData | null>(null);
  const [board, setBoard] = useState<BingoCriterion[]>([]);
  const [locked, setLocked] = useState<Record<string, string>>({}); // criterion id -> player name
  const [deck, setDeck] = useState<BingoPlayer[]>([]);
  const [pos, setPos] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [gaveUp, setGaveUp] = useState(false);
  const [best, setBest] = useState(() => loadBest());
  const [extended, setExtended] = useState(false); // accepted "keep playing" after the first bingo
  const [choice, setChoice] = useState(false); // first-line bank/continue prompt is open
  const [lineFlash, setLineFlash] = useState<number | null>(null); // transient extra-line banner
  const [endReason, setEndReason] = useState<EndReason>(null);

  const criteria = useMemo(() => (data ? buildCriteria(data) : []), [data]);
  const cells = useMemo(() => layoutGrid(board), [board]);

  const boot = useCallback(async () => {
    setPhase('boot');
    const d = await fetchBingoData();
    if (!d) {
      setPhase('error');
      return;
    }
    setData(d);
    setPhase('boot');
  }, []);

  const start = useCallback(
    (sourceData: BingoData, sourceCriteria: BingoCriterion[]) => {
      const b = generateBoard(sourceCriteria);
      if (b.length < BOARD_SIZE) {
        setPhase('error');
        return;
      }
      setBoard(b);
      setDeck(buildDeck(sourceData.pool, b));
      setLocked({});
      setPos(0);
      setStrikes(0);
      setGaveUp(false);
      setShakeId(null);
      setExtended(false);
      setChoice(false);
      setLineFlash(null);
      setEndReason(null);
      setPhase('playing');
    },
    [],
  );

  useEffect(() => { boot(); }, [boot]);

  // Once data + criteria are ready, generate the first board.
  useEffect(() => {
    if (phase === 'boot' && data && criteria.length > 0 && board.length === 0) {
      start(data, criteria);
    }
  }, [phase, data, criteria, board.length, start]);

  // Clear the wrong-tap shake after the animation plays.
  useEffect(() => {
    if (!shakeId) return;
    const t = setTimeout(() => setShakeId(null), 450);
    return () => clearTimeout(t);
  }, [shakeId]);

  // Clear the extra-line flash after it has had its moment.
  useEffect(() => {
    if (lineFlash === null) return;
    const t = setTimeout(() => setLineFlash(null), 1800);
    return () => clearTimeout(t);
  }, [lineFlash]);

  const current = deck[pos];
  const seenCount = deck.length > 0 ? Math.min(pos + 1, deck.length) : 0;

  const lockedIndexes = useMemo(() => {
    const idxs = new Set<number>();
    cells.forEach((cell, i) => {
      if (cell && locked[cell.id]) idxs.add(i);
    });
    return idxs;
  }, [cells, locked]);

  const linesCompleted = useMemo(() => countCompletedLines(lockedIndexes), [lockedIndexes]);
  const tilesFilled = Object.keys(locked).length;

  // Extended-run rules (owner spec 2026-07-08): the first bingo pauses the
  // game with a bank-or-continue choice. Continuing grants +1 strike, every
  // line is worth 100 points, and clearing all 24 tiles is a blackout worth
  // a +500 bonus on top.
  const maxStrikes = START_LIVES + (extended ? 1 : 0);
  const blackout = tilesFilled >= BOARD_SIZE;
  const score = linesCompleted * 100 + (blackout ? 500 : 0);

  /** Move to the next reveal, or end the run if the deck is spent. */
  const advanceOrEnd = (linesNow: number) => {
    if (pos + 1 >= deck.length) {
      setEndReason('deck');
      setPhase(linesNow > 0 ? 'won' : 'lost');
      return;
    }
    setPos(p => p + 1);
  };

  const tapTile = (cell: BingoCriterion) => {
    if (phase !== 'playing' || !current || !data || locked[cell.id] || choice) return;
    if (cell.test(current, data)) {
      const next = { ...locked, [cell.id]: current.name };
      setLocked(next);
      const nextIdxs = new Set(lockedIndexes);
      cells.forEach((c, i) => { if (c && next[c.id]) nextIdxs.add(i); });
      const linesNow = countCompletedLines(nextIdxs);
      if (linesNow > 0) {
        setBest(b => {
          const nextBest = Math.max(b, linesNow);
          try { localStorage.setItem(BEST_KEY, String(nextBest)); } catch { /* private mode */ }
          return nextBest;
        });
      }
      // Blackout: the whole board is filled, instant win with the big bonus.
      if (Object.keys(next).length >= BOARD_SIZE) {
        setEndReason('blackout');
        setPhase('won');
        return;
      }
      // First completed line pauses the game: bank the win or keep playing.
      if (linesNow > 0 && linesCompleted === 0 && !extended) {
        setChoice(true);
        return;
      }
      if (linesNow > linesCompleted) setLineFlash(linesNow);
      advanceOrEnd(linesNow);
    } else {
      setShakeId(cell.id);
      const s = strikes + 1;
      setStrikes(s);
      if (s >= maxStrikes) {
        // Busting with a bingo already on the board keeps the win; strikes
        // only end the run. With zero lines it's a loss, exactly as before.
        setEndReason('strikes');
        setPhase(linesCompleted > 0 ? 'won' : 'lost');
        return;
      }
      advanceOrEnd(linesCompleted);
    }
  };

  const skip = () => {
    if (phase !== 'playing' || choice) return;
    advanceOrEnd(linesCompleted);
  };

  const giveUp = () => {
    if (phase !== 'playing' || choice) return;
    setGaveUp(true);
    // Stopping with at least one completed line banks it as a win, not a loss.
    setEndReason('banked');
    setPhase(linesCompleted > 0 ? 'won' : 'lost');
  };

  /** First-line prompt: cash out now. */
  const bankWin = () => {
    setChoice(false);
    setEndReason('banked');
    setPhase('won');
  };

  /** First-line prompt: extend the run on the same board (+1 strike granted). */
  const continueRun = () => {
    setChoice(false);
    setExtended(true);
    if (pos + 1 >= deck.length) {
      setEndReason('deck');
      setPhase('won');
      return;
    }
    setPos(p => p + 1);
  };

  const emojiGrid = `${buildShareGrid(board, locked)}\n${linesCompleted}/12 lines · ${score} pts${blackout ? ' · BLACKOUT' : ''} · ${strikes}/${maxStrikes} strikes · ${seenCount} players seen`;

  const lostHeadline = strikes >= START_LIVES ? 'Three strikes' : gaveUp ? 'Gave up' : 'Out of players';
  const lostCopy =
    strikes >= START_LIVES
      ? 'Three wrong placements. The board wins this one.'
      : gaveUp
      ? 'You bailed before the board got you.'
      : 'You saw every scout report we had without completing a line.';

  return (
    <>
      <PageSeo
        title="Player Bingo: Football Criteria Board Game | DoUKnowBall"
        description="Fill a 5x5 bingo board of hard football criteria. Real players are revealed by name only, one at a time. Complete a row, column, or diagonal to call bingo before three wrong placements end your game."
        path="/player-bingo"
      />
      <GameShell help="none"
        width="wide"
        title="PLAYER BINGO"
        subtitle="Complete a row, column, or diagonal, then keep the board alive for bonus lines and a blackout."
        headerExtra={
          <>
            <RulesGate title="How to Play Player Bingo" floatingTrigger>
              <section>
                <h3 className="font-bold text-foreground mb-2">The board</h3>
                <p className="text-muted-foreground">
                  24 hard football categories plus a FREE center square, laid out 5 by 5. You do not need to
                  fill the whole board. Complete any single row, column, or diagonal (12 possible lines) to
                  call bingo.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">The reveal</h3>
                <p className="text-muted-foreground">
                  Real footballers are revealed one at a time by name only. No flag, no club, no position:
                  you have to know your ball, not just read the card.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">Placing a player</h3>
                <p className="text-muted-foreground">
                  Tap a category the player fits to lock it with their name. A wrong tap costs a strike.
                  Three strikes and the game ends. A player is not guaranteed to fit anything on your
                  board, so weigh the risk before you tap.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">Skipping</h3>
                <p className="text-muted-foreground">
                  Skips are free and unlimited. If a player fits nowhere useful, skip and wait for a better
                  fit. Running out of players without a completed line also ends the game.
                </p>
              </section>
              <section>
                <h3 className="font-bold text-foreground mb-2">After your first bingo</h3>
                <p className="text-muted-foreground">
                  Your first completed line banks the win on the spot. Cash out, or keep playing the same
                  board: every completed line is worth 100 points, the extended run grants one bonus strike
                  (4 total), and filling all 24 tiles is a BLACKOUT worth a +500 bonus. Busting on strikes
                  after a bingo never takes the win away.
                </p>
              </section>
            </RulesGate>
            {best > 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                Best run <span className="text-primary font-bold">{best}/12</span> lines completed
              </p>
            )}
          </>
        }
      >
        {phase === 'boot' && (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        )}

        {phase === 'error' && (
          <div className="text-center py-12">
            <p className="text-destructive font-semibold mb-3">Couldn't load the player pool right now.</p>
            <button onClick={boot} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold">
              Try again
            </button>
          </div>
        )}

        {(phase === 'playing' || phase === 'won' || phase === 'lost') && (
          <>
            <div className="flex items-center justify-between text-sm mb-3 flex-wrap gap-2">
              <span aria-label={`${strikes} of ${maxStrikes} strikes used`} className="flex items-center gap-1">
                {Array.from({ length: maxStrikes }, (_, i) => (
                  <X
                    key={i}
                    className={cn(
                      'w-4 h-4',
                      i < strikes
                        ? 'text-destructive'
                        : i >= START_LIVES
                        ? 'text-primary/50' // the bonus strike earned by extending the run
                        : 'text-muted-foreground/30',
                    )}
                    strokeWidth={3}
                  />
                ))}
              </span>
              <span className="text-muted-foreground">
                Lines <span className="text-primary font-bold">{linesCompleted}/12</span>
                {' · '}Tiles <span className="text-primary font-bold">{tilesFilled}/{BOARD_SIZE}</span>
                {' · '}Score <span className="text-primary font-bold">{score}</span>
                {' · '}Seen <span className="text-primary font-bold">{seenCount}</span>
              </span>
            </div>

            {phase === 'playing' && choice && <FirstLineBanner onBank={bankWin} onContinue={continueRun} />}
            {phase === 'playing' && !choice && lineFlash !== null && <LineFlash lines={lineFlash} />}

            {phase === 'playing' && !choice && current && (
              <div className="bg-card border border-border rounded-2xl p-5 text-center mb-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Player {seenCount} · Tap a matching category below, or skip
                </div>
                <div className="font-bold text-foreground text-2xl leading-tight">{current.name}</div>
                <div className="flex items-center justify-center gap-3 mt-3">
                  <button
                    onClick={skip}
                    className="inline-flex items-center gap-2 px-6 py-2 bg-secondary text-foreground rounded-full font-semibold hover:bg-secondary/70 transition-colors"
                  >
                    <SkipForward className="w-4 h-4" /> Skip player
                  </button>
                  <GiveUpButton onGiveUp={giveUp} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-5 gap-1.5 md:gap-2 mb-5">
              {cells.map((cell, i) => {
                if (cell === null) {
                  return (
                    <div
                      key={`free-${i}`}
                      className="rounded-xl border border-primary bg-primary/10 p-1.5 min-h-[76px] md:min-h-[92px] flex flex-col items-center justify-center text-center"
                    >
                      <span className="text-lg leading-none mb-1">⭐</span>
                      <span className="text-[10px] md:text-[11px] font-bold text-primary">FREE</span>
                    </div>
                  );
                }
                const lockedBy = locked[cell.id];
                return (
                  <button
                    key={cell.id}
                    onClick={() => tapTile(cell)}
                    disabled={phase !== 'playing' || !!lockedBy || choice}
                    title={cell.label}
                    className={cn(
                      'rounded-xl border p-1.5 min-h-[76px] md:min-h-[92px] flex flex-col items-center justify-center text-center transition-colors',
                      lockedBy ? 'bg-primary/10 border-primary' : 'bg-card border-border',
                      phase === 'playing' && !lockedBy && 'hover:border-primary/50',
                      shakeId === cell.id && 'border-destructive',
                    )}
                    style={shakeId === cell.id ? { animation: 'pb-shake 0.4s' } : undefined}
                  >
                    <span className="text-base md:text-lg leading-none mb-1"><FlagFromEmoji emoji={cell.icon} size={18} /></span>
                    <span className="text-[9px] md:text-[10px] font-semibold leading-tight text-foreground">
                      {cell.label}
                    </span>
                    {lockedBy && (
                      <span className="text-[8px] md:text-[9px] text-primary font-bold mt-1 truncate max-w-full px-0.5">
                        {lockedBy}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {phase === 'won' && (
              <ResultScreen
                recordCompletionOnMount
                won
                outcomeEmoji={blackout ? '🏆' : linesCompleted >= 3 ? '🎉' : linesCompleted >= 2 ? '🔥' : '🐐'}
                headline={blackout ? 'BLACKOUT!' : 'BINGO!'}
                statLine={
                  <>
                    {linesCompleted} {linesCompleted === 1 ? 'line' : 'lines'} · {tilesFilled}/{BOARD_SIZE} tiles ·{' '}
                    {strikes} {strikes === 1 ? 'strike' : 'strikes'} ·{' '}
                    <span className="font-bold text-primary">{score} pts</span>
                  </>
                }
                funFact={
                  blackout
                    ? `Full board cleared in ${seenCount} players: ${linesCompleted * 100} line points + 500 blackout bonus.`
                    : endReason === 'strikes'
                    ? 'The extended run ended on strikes, but the bingo stays banked.'
                    : endReason === 'deck'
                    ? `You saw all ${seenCount} players we had.`
                    : best === linesCompleted
                    ? 'That matches your best run yet.'
                    : best > 0
                    ? `Your best is ${best}/12 lines.`
                    : undefined
                }
                emojiGrid={emojiGrid}
                share={{ score: `${linesCompleted}/12 lines · ${score} pts`, gameName: 'Player Bingo', gamePath: '/player-bingo' }}
                onPlayAgain={() => data && start(data, criteria)}
                playAgainLabel="New board"
              />
            )}

            {phase === 'lost' && (
              <ResultScreen
                recordCompletionOnMount
                won={false}
                outcomeEmoji={tilesFilled >= 8 ? '😩' : tilesFilled >= 4 ? '😅' : '🫠'}
                headline={lostHeadline}
                statLine={
                  <>
                    {tilesFilled}/{BOARD_SIZE} tiles filled, {linesCompleted}/12 lines completed.
                  </>
                }
                funFact={`${lostCopy} You saw ${seenCount} players.`}
                emojiGrid={emojiGrid}
                share={{ score: `${linesCompleted}/12 lines`, gameName: 'Player Bingo', gamePath: '/player-bingo' }}
                onPlayAgain={() => data && start(data, criteria)}
                playAgainLabel="Try a new board"
              />
            )}
          </>
        )}

        <style>{'@keyframes pb-shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-5px); } 40% { transform: translateX(5px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }'}</style>

        <AdBanner slot="1234567890" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="player-bingo" />
        </div>

        <GameSeoContent
          pageHasOwnH1
          title="Player Bingo: Fill a Line with Real Footballers"
          description="A 5 by 5 bingo board built from hard football facts. Real players are revealed by name only, one at a time, and completing any row, column, or diagonal calls bingo. After your first line you can keep the same board alive for bonus lines and a full-board blackout."
          howToPlay={[
            'The board has 24 hard category tiles around a FREE center square, arranged 5 by 5.',
            'Real footballers are revealed one at a time by name only, no flag, no club, no position shown.',
            'Tap a category the player fits to lock it in with their name.',
            'A wrong tap costs a strike. Three strikes ends the game.',
            'Skips are free and unlimited. Not every player fits your board, so skipping is often the right call.',
            'Complete any single row, column, or diagonal to call bingo. You do not need the whole board.',
            'After your first bingo, keep playing the same board for +100 per extra line, one bonus strike, and a +500 blackout bonus for all 24 tiles.',
          ]}
          examples={[
            'A one-club veteran centre-back with 20+ yellow-card seasons could lock One-club man, Centre-Back, or 10+ yellow cards in a season. Pick the box that helps your line, not just any match.',
            'Stuck with a player who fits nothing useful? Skip and wait for a better fit rather than wasting a tile.',
          ]}
        />
        <GameNav />
      </GameShell>
    </>
  );
};

export default PlayerBingo;
