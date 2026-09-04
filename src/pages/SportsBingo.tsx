import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Package, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { GameNav } from '@/components/game/GameNav';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { getTodayET } from '@/lib/dateUtils';
import { fetchSquadPool } from '@/lib/squadDeal';
import { Player } from '@/types/game';
import {
  BingoGame, CARD_SIZE, CPU_LEVELS, CpuLevel, FREE_INDEX, PACK_COUNT, PACK_SECONDS,
  buildGame, claimableSquares, cpuClaims, dailySeed, lehmer, lineCount, loadDailyBingo, saveDailyBingo,
  scoreGame, squareCondition,
} from '@/lib/sportsBingo';

/**
 * Sports Bingo (Round 323). The owner's spec, verbatim from the 08-28
 * review: "a card of conditions, open packs on a timer, mark squares when a
 * pull matches, most squares wins". Solo daily (one shared card per ET
 * date), solo unlimited, and versus a CPU with three tempers. Online rooms
 * are a real backend project and are out of scope on purpose, the review
 * says so itself.
 *
 * The marking is the skill: matches are NOT auto claimed. Each pack stays
 * open for its window and any square a player in the OPEN pack satisfies
 * can be claimed; when the next pack opens the old one is gone for good. A
 * tap on a square nothing in the pack matches shakes and costs nothing.
 */

type Phase = 'boot' | 'error' | 'setup' | 'playing' | 'done';
type Mode = 'daily' | 'unlimited' | 'cpu';

const SLUG = 'sports-bingo';

export default function SportsBingo() {
  /* Round 428 part two: TODAY IS PINNED AT MOUNT, and every read, write and
     deal below uses it. Calling the clock again at write time was the bug the
     review caught: a run dealt before midnight ET and finished after it was
     filed under TOMORROW, so the next day opened already finished with a score
     from boards it never dealt. Pinning is the convention useDailyPuzzle
     already follows (its own todayStr ref). A session that crosses midnight
     finishes the day it started; a reload after midnight deals the new day. */
  const todayStr = useRef(getTodayET()).current;
  /* Round 428: a finished daily comes back finished. The marked board is
     restored here, in the initializers, so the result screen is on the very
     first render and the recorder (gated below) has no finish to book. */
  const [dailyDone, setDailyDone] = useState(() => loadDailyBingo(todayStr));
  const [phase, setPhase] = useState<Phase>(dailyDone ? 'done' : 'boot');
  const [pool, setPool] = useState<Player[]>([]);
  const [mode, setMode] = useState<Mode>('daily');
  const [cpuLevel, setCpuLevel] = useState<CpuLevel>('casual');
  const [game, setGame] = useState<BingoGame | null>(null);
  const [packIndex, setPackIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(PACK_SECONDS);
  const [marked, setMarked] = useState<boolean[]>(dailyDone?.marked ?? []);
  const [cpuMarked, setCpuMarked] = useState<boolean[]>([]);
  const [wrongSquare, setWrongSquare] = useState<number | null>(null);
  /* The CPU's stream is separate from the board's build stream so its luck
     cannot change which packs everyone sees. */
  const cpuRngRef = useRef<() => number>(lehmer(1));

  useEffect(() => {
    let cancelled = false;
    fetchSquadPool('current')
      .then(p => {
        if (cancelled) return;
        /* Round 428 part three: the error screen never covers a finished
           daily either. Only the success branch was guarded, so a short pool
           or a failed fetch replaced a restored result with "Couldn't load the
           player pool" and the player lost the card they had already filled.
           The result is already on screen and needs no pool to stay there. */
        if (p.length < 100) { setPhase(cur => (cur === 'done' ? cur : 'error')); return; }
        setPool(p);
        /* never over a restored result */
        setPhase(cur => (cur === 'done' ? cur : 'setup'));
      })
      .catch(() => { if (!cancelled) setPhase(cur => (cur === 'done' ? cur : 'error')); });
    return () => { cancelled = true; };
  }, []);

  const start = useCallback((m: Mode, level: CpuLevel) => {
    if (m === 'daily' && dailyDone) {
      /* Today's card is in the books: reopen the result, never redeal it. */
      setMode('daily');
      setMarked(dailyDone.marked);
      setPhase('done');
      return;
    }
    if (pool.length === 0) return;
    const seed = m === 'daily' ? dailySeed(todayStr) : Math.floor(Math.random() * 2147483645) + 1;
    const g = buildGame(pool, seed);
    cpuRngRef.current = lehmer(seed ^ 0x5bf03635 || 7);
    setMode(m);
    setCpuLevel(level);
    setGame(g);
    setPackIndex(0);
    setSecondsLeft(PACK_SECONDS);
    setMarked(new Array(CARD_SIZE).fill(false));
    setCpuMarked(new Array(CARD_SIZE).fill(false));
    setPhase('playing');
  }, [pool, dailyDone]);

  const advancePack = useCallback(() => {
    if (!game) return;
    /* The CPU marks its own board off the pack that just CLOSED, so the
       person always had the same window the machine did. */
    if (mode === 'cpu') {
      setCpuMarked(prev => {
        const next = [...prev];
        for (const sq of cpuClaims(game, game.packs[packIndex], prev, cpuLevel, cpuRngRef.current)) next[sq] = true;
        return next;
      });
    }
    if (packIndex + 1 >= PACK_COUNT) {
      setPhase('done');
      return;
    }
    setPackIndex(i => i + 1);
    setSecondsLeft(PACK_SECONDS);
  }, [game, mode, cpuLevel, packIndex]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const t = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) return 0;
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase === 'playing' && secondsLeft === 0) advancePack();
  }, [phase, secondsLeft, advancePack]);

  const pack = game && phase !== 'setup' ? game.packs[packIndex] : null;
  const claimable = useMemo(
    () => (game && pack ? new Set(claimableSquares(game, pack, marked)) : new Set<number>()),
    [game, pack, marked],
  );

  const tapSquare = (sq: number) => {
    if (phase !== 'playing' || !game || sq === FREE_INDEX || marked[sq]) return;
    if (claimable.has(sq)) {
      setMarked(prev => { const next = [...prev]; next[sq] = true; return next; });
    } else {
      setWrongSquare(sq);
      window.setTimeout(() => setWrongSquare(w => (w === sq ? null : w)), 450);
    }
  };

  const mySquares = marked.filter((m, i) => m && i !== FREE_INDEX).length;
  const cpuSquares = cpuMarked.filter((m, i) => m && i !== FREE_INDEX).length;
  const finalScore = scoreGame(marked);
  const won = mode === 'cpu' ? mySquares > cpuSquares : mySquares >= 12;
  const isDone = phase === 'done';
  /* A daily already in the books is not a finish: a reloaded or reopened
     result never records, and the fresh one records once, in the same
     commit that then books it below. */
  const bookedDaily = mode === 'daily' && dailyDone !== null;
  useGameCompletion(SLUG, isDone && !bookedDaily, finalScore, mySquares);

  useEffect(() => {
    if (!isDone || mode !== 'daily' || dailyDone) return;
    const rec = { date: todayStr, marked };
    saveDailyBingo(rec);
    setDailyDone(rec);
  }, [isDone, mode, dailyDone, marked]);
  const doneSquares = dailyDone ? dailyDone.marked.filter((m, i) => m && i !== FREE_INDEX).length : 0;

  const emojiGrid = useMemo(() => {
    if (!isDone) return '';
    const rows: string[] = [];
    for (let r = 0; r < 5; r += 1) {
      rows.push([0, 1, 2, 3, 4].map(c => {
        const i = r * 5 + c;
        if (i === FREE_INDEX) return '🎁';
        return marked[i] ? '🟩' : '⬜';
      }).join(''));
    }
    return [`🎱 Sports Bingo: ${finalScore} pts`, ...rows].join('\n');
  }, [isDone, marked, finalScore]);

  const modeButton = (label: string, blurb: string, onClick: () => void) => (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-border bg-surface-1 p-4 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors"
    >
      <span className="block font-bold text-foreground">{label}</span>
      <span className="block text-xs text-muted-foreground mt-0.5">{blurb}</span>
    </button>
  );

  return (
    <>
      <PageSeo
        title="Sports Bingo: The Pack Opening Bingo Game | DoUKnowBall"
        description="A bingo card of football conditions, packs of real players on a timer. Mark the squares your pulls satisfy before the pack closes. Daily shared card, unlimited mode, or race a CPU."
        path="/sports-bingo"
      />
      <GameShell width="narrow" title="Sports Bingo" emoji="🎱" subtitle="Open packs, mark what matches, most squares wins.">
        {phase === 'boot' && (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        )}

        {phase === 'error' && (
          <div className="text-center py-12">
            <p className="text-destructive font-semibold mb-3">Couldn't load the player pool right now.</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold">
              Try again
            </button>
          </div>
        )}

        {phase === 'setup' && (
          <div className="space-y-4 max-w-sm mx-auto">
            <div className="rounded-xl border border-border bg-surface-1 p-4 text-sm text-muted-foreground space-y-1.5">
              <p className="font-bold text-foreground">How to play</p>
              <p>Your card holds 24 football conditions plus a free centre. {PACK_COUNT} packs of real players open on a {PACK_SECONDS} second timer.</p>
              <p>While a pack is open, tap every square someone in it satisfies. When the next pack opens, the old one is gone for good.</p>
              <p>Wrong taps cost nothing but time. Squares score 3, completed lines 2 each, a full blackout lands exactly 100.</p>
            </div>
            {dailyDone
              ? modeButton('Daily card done', `${doneSquares} of 24 squares, ${scoreGame(dailyDone.marked)} pts. Tap to see today's card, a new one at midnight ET.`, () => start('daily', cpuLevel))
              : modeButton('Daily card', 'One shared card and pack run per day, same for everyone', () => start('daily', cpuLevel))}
            {modeButton('Unlimited', 'A fresh random card and packs every run', () => start('unlimited', cpuLevel))}
            <div className="rounded-xl border border-border bg-surface-1 p-4">
              <p className="font-bold text-foreground mb-2">Versus the CPU</p>
              <div className="grid grid-cols-3 gap-2">
                {CPU_LEVELS.map(l => (
                  <button
                    key={l.id}
                    onClick={() => start('cpu', l.id)}
                    className="rounded-lg border border-border bg-background px-2 py-2.5 text-center hover:border-primary/50 transition-colors"
                  >
                    <span className="block text-sm font-bold text-foreground">{l.label}</span>
                    <span className="block text-[10px] text-muted-foreground">{l.blurb}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">Same card, same packs, its own board. Most squares after pack {PACK_COUNT} wins.</p>
            </div>
          </div>
        )}

        {phase === 'playing' && game && pack && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Package className="w-4 h-4" /> Pack {packIndex + 1} of {PACK_COUNT}</span>
              <span>You {mySquares}{mode === 'cpu' ? ` · CPU ${cpuSquares}` : ''}</span>
              <span className={cn('inline-flex items-center gap-1.5 tabular-nums', secondsLeft <= 4 ? 'text-destructive' : 'text-primary')}>
                <Timer className="w-4 h-4" /> {secondsLeft}s
              </span>
            </div>

            {/* The open pack */}
            <div className="rounded-xl border border-border bg-surface-1 p-3">
              <div className="grid grid-cols-1 gap-1.5">
                {pack.map(p => (
                  <div key={p.name} className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-semibold text-foreground truncate">{p.name}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {p.position} · {p.age > 0 ? `${p.age}y · ` : ''}{p.nationality} · {p.league} · {p.marketValue}M
                      {p.goals + p.assists > 0 ? ` · ${p.goals}g ${p.assists}a` : ''}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={advancePack}
                className="mt-2 w-full rounded-lg border border-border bg-background py-2 text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
              >
                {packIndex + 1 >= PACK_COUNT ? 'Finish' : 'Done with this pack, open the next'}
              </button>
            </div>

            {/* The card */}
            <div className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: CARD_SIZE }, (_, sq) => {
                const cond = squareCondition(game, sq);
                const isFree = sq === FREE_INDEX;
                const isMarked = isFree || marked[sq];
                return (
                  <button
                    key={sq}
                    onClick={() => tapSquare(sq)}
                    disabled={isFree || marked[sq]}
                    className={cn(
                      'aspect-square rounded-lg border p-1 text-center flex items-center justify-center transition-colors',
                      isMarked
                        ? 'bg-correct/20 border-correct text-foreground'
                        : 'bg-card border-border hover:border-primary/50',
                      wrongSquare === sq && 'animate-shake-wrong border-destructive',
                    )}
                  >
                    <span className="text-[9px] sm:text-[10px] font-semibold leading-tight">
                      {isFree ? '🎁 Free' : cond?.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
              Tap a square someone in the open pack satisfies. Lines: {lineCount(marked)}
            </p>
          </div>
        )}

        {isDone && (
          <ResultScreen
            won={won}
            outcomeEmoji={won ? '🎉' : '🫠'}
            headline={
              mode === 'cpu'
                ? mySquares > cpuSquares ? 'You out-marked the machine!' : mySquares === cpuSquares ? 'Dead level with the machine' : 'The machine took it'
                : mySquares >= 20 ? 'A monster card!' : mySquares >= 12 ? 'Solid card!' : 'The packs got away'
            }
            statLine={`${mySquares} of 24 squares, ${lineCount(marked)} line${lineCount(marked) === 1 ? '' : 's'}${mode === 'cpu' ? ` · CPU marked ${cpuSquares}` : ''}`}
            statRow={[{ label: 'Score', value: finalScore }]}
            emojiGrid={emojiGrid}
            share={{ score: String(finalScore), gameName: 'Sports Bingo', gamePath: '/sports-bingo' }}
            onPlayAgain={() => setPhase('setup')}
            playAgainLabel={mode === 'daily' ? 'Back to modes' : 'New card'}
            playNext={mode === 'daily' ? <p className="text-sm text-muted-foreground">Come back tomorrow for a new card.</p> : undefined}
          />
        )}

        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />
        <div className="flex justify-center mt-6">
          <ReportQuestion gameType={SLUG} />
        </div>

        <GameSeoContent
          pageHasOwnH1
          title="Sports Bingo: The Pack Opening Bingo Game"
          description="A 5 by 5 bingo card of football conditions, ten packs of real players on a timer, and the marking is the skill: claim the squares your pulls satisfy before each pack closes. One shared daily card, an unlimited mode, and a CPU opponent with three tempers."
        />
        <GameNav />
      </GameShell>
    </>
  );
}
