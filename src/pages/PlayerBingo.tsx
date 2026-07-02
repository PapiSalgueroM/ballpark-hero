import { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { RotateCcw, Loader2, SkipForward, Heart, Timer } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { Footer } from '@/components/game/Footer';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { flagFor, shortName } from '@/lib/dealPlayers';
import {
  BingoCriterion,
  BingoData,
  BingoPlayer,
  BOARD_SIZE,
  START_LIVES,
  buildCriteria,
  buildDeck,
  buildShareGrid,
  fetchBingoData,
  generateBoard,
} from '@/lib/playerBingo';

type Phase = 'boot' | 'error' | 'pick' | 'playing' | 'won' | 'lost';
type EndReason = 'lives' | 'time' | 'deck' | null;
type TimerMode = 0 | 90 | 60;

const BEST_KEY = 'player_bingo_best_v1';

function loadBest(): number {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}

const TIMER_MODES: { mode: TimerMode; label: string; hint: string }[] = [
  { mode: 0, label: 'Relaxed', hint: 'No clock, just you and the board' },
  { mode: 90, label: 'Classic', hint: '90 seconds on the clock' },
  { mode: 60, label: 'Blitz', hint: '60 seconds, no mercy' },
];

const PlayerBingo = () => {
  const [phase, setPhase] = useState<Phase>('boot');
  const [data, setData] = useState<BingoData | null>(null);
  const [board, setBoard] = useState<BingoCriterion[]>([]);
  const [locked, setLocked] = useState<Record<string, string>>({});
  const [deck, setDeck] = useState<BingoPlayer[]>([]);
  const [pos, setPos] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [timerMode, setTimerMode] = useState<TimerMode>(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [shakeId, setShakeId] = useState<string | null>(null);
  const [endReason, setEndReason] = useState<EndReason>(null);
  const [best, setBest] = useState(() => loadBest());

  const criteria = useMemo(() => (data ? buildCriteria(data) : []), [data]);

  const boot = useCallback(async () => {
    setPhase('boot');
    const d = await fetchBingoData();
    if (!d) {
      setPhase('error');
      return;
    }
    setData(d);
    setPhase('pick');
  }, []);

  useEffect(() => { boot(); }, [boot]);

  const start = useCallback(
    (mode: TimerMode) => {
      if (!data) return;
      const b = generateBoard(criteria);
      if (b.length < BOARD_SIZE) {
        setPhase('error');
        return;
      }
      setBoard(b);
      setDeck(buildDeck(data.pool, b));
      setLocked({});
      setPos(0);
      setLives(START_LIVES);
      setTimerMode(mode);
      setTimeLeft(mode);
      setEndReason(null);
      setShakeId(null);
      setPhase('playing');
    },
    [data, criteria],
  );

  // Countdown for the timed modes.
  useEffect(() => {
    if (phase !== 'playing' || timerMode === 0) return;
    if (timeLeft <= 0) {
      setEndReason('time');
      setPhase('lost');
      return;
    }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timerMode, timeLeft]);

  // Clear the wrong-tap shake after the animation plays.
  useEffect(() => {
    if (!shakeId) return;
    const t = setTimeout(() => setShakeId(null), 450);
    return () => clearTimeout(t);
  }, [shakeId]);

  const current = deck[pos];
  const filled = Object.keys(locked).length;
  const seenCount = deck.length > 0 ? Math.min(pos + 1, deck.length) : 0;

  const tapTile = (c: BingoCriterion) => {
    if (phase !== 'playing' || !current || !data || locked[c.id]) return;
    if (c.test(current, data)) {
      const next = { ...locked, [c.id]: current.name };
      setLocked(next);
      if (Object.keys(next).length >= board.length) {
        const seen = pos + 1;
        if (best === 0 || seen < best) {
          setBest(seen);
          try { localStorage.setItem(BEST_KEY, String(seen)); } catch { /* private mode */ }
        }
        setEndReason(null);
        setPhase('won');
      } else if (pos + 1 >= deck.length) {
        setEndReason('deck');
        setPhase('lost');
      } else {
        setPos(p => p + 1);
      }
    } else {
      setShakeId(c.id);
      const l = lives - 1;
      setLives(l);
      if (l <= 0) {
        setEndReason('lives');
        setPhase('lost');
      }
    }
  };

  const skip = () => {
    if (phase !== 'playing') return;
    if (pos + 1 >= deck.length) {
      setEndReason('deck');
      setPhase('lost');
      return;
    }
    setPos(p => p + 1);
  };

  const emojiGrid = `${buildShareGrid(board, locked)}\n${filled}/${BOARD_SIZE} tiles filled · ${seenCount} players seen`;

  const lostCopy =
    endReason === 'time'
      ? 'The clock hit zero before the board did.'
      : endReason === 'deck'
      ? 'You saw every scout report we had.'
      : 'Three wrong taps. The board wins this one.';

  return (
    <main className="min-h-screen bg-background">
      <GameNavbar />
      <PageSeo
        title="Player Bingo: Football Criteria Board Game | DoUKnowBall"
        description="Fill a 3x4 bingo board of football criteria. Real players are revealed one at a time. Lock matching boxes, protect your three lives, and clear the board in as few players as possible."
        path="/player-bingo"
      />
      <style>{'@keyframes pb-shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-5px); } 40% { transform: translateX(5px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }'}</style>
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        <header className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-[0.08em] text-primary font-display mb-1">
            PLAYER BINGO
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Twelve boxes, three lives, unlimited skips. Lock every box with a revealed player to call bingo.
          </p>
          {best > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Best win <span className="text-primary font-bold">{best}</span> players seen
            </p>
          )}
        </header>

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

        {phase === 'pick' && (
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-xl font-bold text-foreground text-center mb-1">Pick your pace</h2>
            <p className="text-sm text-muted-foreground text-center mb-5">
              Fewer players seen means a better score. Skips are free but they all count.
            </p>
            <div className="grid gap-3">
              {TIMER_MODES.map(t => (
                <button
                  key={t.mode}
                  onClick={() => start(t.mode)}
                  className="flex items-center justify-between px-5 py-3.5 bg-secondary rounded-xl hover:bg-secondary/70 transition-colors text-left"
                >
                  <span>
                    <span className="block font-bold text-foreground">{t.label}</span>
                    <span className="block text-xs text-muted-foreground">{t.hint}</span>
                  </span>
                  <Timer className={cn('w-5 h-5', t.mode === 0 ? 'text-muted-foreground/40' : 'text-primary')} />
                </button>
              ))}
            </div>
          </div>
        )}

        {(phase === 'playing' || phase === 'won' || phase === 'lost') && (
          <>
            <div className="flex items-center justify-between text-sm mb-3">
              <span aria-label={`${lives} lives left`}>
                {Array.from({ length: START_LIVES }, (_, i) => (
                  <Heart
                    key={i}
                    className={cn('inline w-4 h-4 mr-0.5', i < lives ? 'text-destructive fill-destructive' : 'text-muted-foreground/30')}
                  />
                ))}
              </span>
              <span className="text-muted-foreground">
                Boxes <span className="text-primary font-bold">{filled}/{BOARD_SIZE}</span>
                {' · '}Players seen <span className="text-primary font-bold">{seenCount}</span>
              </span>
              {timerMode > 0 ? (
                <span className={cn('font-bold', timeLeft <= 10 ? 'text-destructive' : 'text-primary')}>
                  <Timer className="inline w-4 h-4 mr-1" />{timeLeft}s
                </span>
              ) : (
                <span className="text-muted-foreground/50 text-xs">No timer</span>
              )}
            </div>

            {phase === 'playing' && current && (
              <div className="bg-card border border-border rounded-2xl p-4 text-center mb-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Player {seenCount} · Tap a matching box below, or skip
                </div>
                <div className="text-3xl mb-1">{flagFor(current.nationality)}</div>
                <div className="font-bold text-foreground text-xl leading-tight">{current.name}</div>
                <div className="text-xs text-muted-foreground mb-3">
                  {current.club} · {current.position}
                </div>
                <button
                  onClick={skip}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-secondary text-foreground rounded-full font-semibold hover:bg-secondary/70 transition-colors"
                >
                  <SkipForward className="w-4 h-4" /> Skip player
                </button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 mb-5">
              {board.map(c => {
                const lockedBy = locked[c.id];
                return (
                  <button
                    key={c.id}
                    onClick={() => tapTile(c)}
                    disabled={phase !== 'playing' || !!lockedBy}
                    title={c.label}
                    className={cn(
                      'rounded-xl border p-2 min-h-[84px] flex flex-col items-center justify-center text-center transition-colors',
                      lockedBy ? 'bg-primary/10 border-primary' : 'bg-card border-border',
                      phase === 'playing' && !lockedBy && 'hover:border-primary/50',
                      shakeId === c.id && 'border-destructive',
                    )}
                    style={shakeId === c.id ? { animation: 'pb-shake 0.4s' } : undefined}
                  >
                    <span className="text-lg leading-none mb-1">{c.icon}</span>
                    <span className="text-[11px] font-semibold leading-tight text-foreground">{c.label}</span>
                    {lockedBy && (
                      <span className="text-[10px] text-primary font-bold mt-1 truncate max-w-full">
                        {shortName(lockedBy)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {phase === 'won' && (
              <div className="bg-card border border-border rounded-2xl p-6 text-center">
                <div className="text-4xl mb-2">{seenCount <= 20 ? '🐐' : seenCount <= 35 ? '🔥' : '🎉'}</div>
                <h2 className="text-2xl font-bold text-primary font-display mb-1">BINGO!</h2>
                <p className="text-sm text-muted-foreground mb-3">
                  Board cleared in {seenCount} players
                  {best === seenCount ? '. That is your best run yet.' : best > 0 ? `. Your best is ${best}.` : '.'}
                </p>
                <pre className="text-sm tracking-wide whitespace-pre-wrap mb-2">{emojiGrid}</pre>
                <ShareButtons
                  score={`${seenCount} players seen`}
                  gameName="Player Bingo"
                  gamePath="/player-bingo"
                  emojiGrid={emojiGrid}
                />
                <button
                  onClick={() => setPhase('pick')}
                  className="mt-4 inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity"
                >
                  <RotateCcw className="w-4 h-4" /> New board
                </button>
              </div>
            )}

            {phase === 'lost' && (
              <div className="bg-card border border-border rounded-2xl p-6 text-center">
                <div className="text-4xl mb-2">{filled >= 9 ? '😩' : filled >= 5 ? '😅' : '🫠'}</div>
                <h2 className="text-2xl font-bold text-primary font-display mb-1">
                  {filled}/{BOARD_SIZE} boxes filled
                </h2>
                <p className="text-sm text-muted-foreground mb-3">
                  {lostCopy} You saw {seenCount} players.
                </p>
                <pre className="text-sm tracking-wide whitespace-pre-wrap mb-2">{emojiGrid}</pre>
                <ShareButtons
                  score={`${filled}/${BOARD_SIZE} tiles`}
                  gameName="Player Bingo"
                  gamePath="/player-bingo"
                  emojiGrid={emojiGrid}
                />
                <button
                  onClick={() => setPhase('pick')}
                  className="mt-4 inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity"
                >
                  <RotateCcw className="w-4 h-4" /> Try a new board
                </button>
              </div>
            )}
          </>
        )}

        <AdBanner slot="1234567890" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="player-bingo" />
        </div>

        <GameSeoContent
          title="Player Bingo: Fill the Board with Real Footballers"
          description="A bingo board built from twelve football facts. Real players are revealed one at a time, and every one of them can lock a matching box if you know your ball."
          howToPlay={[
            'You get a 3 by 4 board of twelve criteria boxes.',
            'Real footballers are revealed one at a time with their flag, club, and position.',
            'Tap a box the player matches to lock it with their name.',
            'A wrong tap costs one of your three lives and the player stays put.',
            'Skips are free and unlimited, but every player you see counts toward your score.',
            'Fill all twelve boxes to win. Fewer players seen is a better score.',
          ]}
          examples={[
            'A Brazilian winger who came through at Real Madrid can lock From Brazil, Played for Real Madrid, or Forward. Pick the box you will struggle to fill later.',
            'Stuck with a player who fits nothing on your board? Skip and wait for a better fit.',
          ]}
        />
        <GameNav />
        <Footer />
      </div>
    </main>
  );
};

export default PlayerBingo;
