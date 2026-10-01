import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Package, Timer, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameShell } from '@/components/game/GameShell';
import { ResultScreen } from '@/components/game/ResultScreen';
import { GameNav } from '@/components/game/GameNav';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { BingoCardGrid } from '@/components/sports-bingo/BingoCardGrid';
import { BingoHandOver } from '@/components/sports-bingo/BingoHandOver';
import { BingoPackList } from '@/components/sports-bingo/BingoPackList';
import { PassDeviceSetup } from '@/components/sports-bingo/PassDeviceSetup';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { getTodayET } from '@/lib/dateUtils';
import { fetchSquadPool } from '@/lib/squadDeal';
import { Player } from '@/types/game';
import {
  BingoGame, BingoTable, BingoTableSetup, CARD_SIZE, CPU_LEVELS, CpuLevel, FREE_INDEX, PACK_COUNT, PACK_SECONDS,
  buildGame, claimSquare, claimableSquares, clearBingoTable, closeTurn, cpuClaims, createTable, dailySeed, declareWinner,
  lehmer, lineCount, loadBingoTable, loadDailyBingo, openTurn, revealNext, saveBingoTable, saveDailyBingo, scoreGame,
  seatGame, secondsFor, squaresOf,
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
 *
 * Round 727: pass the device. Two to four seats on one phone, each with its
 * own card, all hearing the same ten packs: every seat takes a turn on a
 * pack before the next one opens, the phone changes hands on a screen that
 * shows only the next name, and the first seat to the goal wins. The table
 * is plain data in src/lib/sportsBingo.ts (the Rebuild seats shape); this
 * page owns the clock, the storage and the drawing. The same setup picks
 * which condition families the cards may use and how long a pack stays open.
 */

type Phase = 'boot' | 'error' | 'setup' | 'tableSetup' | 'playing' | 'table' | 'done';
type Mode = 'daily' | 'unlimited' | 'cpu';

const SLUG = 'sports-bingo';

/** A saved table worth offering to resume: not finished, and never mid turn.
 *  A refresh mid turn restarts that turn from the hand over with nothing
 *  turned up and a full clock, and the squares it already claimed stand, so
 *  the seat gets some scan time back on a pack it has partly seen. That is a
 *  known give in a party mode on one phone: the other ways out (saving the
 *  clock every second, or ending the turn on any reload) cost more than it. */
function resumableTable(): BingoTable | null {
  const t = loadBingoTable();
  if (!t || t.phase === 'done') return null;
  return t.phase === 'turn' ? { ...t, phase: 'handover', revealed: 0 } : t;
}

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
  /* The shake's timer, cleared when the page goes away so it never fires
     after it (in the page test it fired into a torn down window and threw). */
  const shakeTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(shakeTimer.current), []);
  /* The CPU's stream is separate from the board's build stream so its luck
     cannot change which packs everyone sees. */
  const cpuRngRef = useRef<() => number>(lehmer(1));
  /* Round 727: the table, restored from storage when a game was left mid way. */
  const [table, setTable] = useState<BingoTable | null>(resumableTable);

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

  /* ---- Round 727: the table ---- */
  const startTable = useCallback((setup: BingoTableSetup) => {
    if (pool.length === 0) return;
    const t = createTableFor(pool, setup);
    setTable(t);
    setSecondsLeft(secondsFor(t.difficulty));
    setPhase('table');
  }, [pool]);

  const takeTurn = useCallback(() => {
    setTable(t => (t ? openTurn(t) : t));
    if (table) setSecondsLeft(secondsFor(table.difficulty));
  }, [table]);

  const endTurn = useCallback(() => {
    setTable(t => (t ? closeTurn(t) : t));
    if (table) setSecondsLeft(secondsFor(table.difficulty));
  }, [table]);

  const quitTable = useCallback(() => {
    clearBingoTable();
    setTable(null);
    setPhase('setup');
  }, []);

  /* The table is kept across a refresh in every phase, so a group can put
     the phone down and pick the game up where it was. */
  useEffect(() => {
    if (phase === 'table' && table) saveBingoTable(table);
  }, [phase, table]);

  const inTurn = phase === 'table' && table?.phase === 'turn';
  const ticking = phase === 'playing' || inTurn;
  useEffect(() => {
    if (!ticking) return;
    const t = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) return 0;
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [ticking]);

  useEffect(() => {
    if (secondsLeft !== 0) return;
    if (phase === 'playing') advancePack();
    else if (inTurn) endTurn();
  }, [phase, inTurn, secondsLeft, advancePack, endTurn]);

  const pack = game && phase !== 'setup' ? game.packs[packIndex] : null;
  const claimable = useMemo(
    () => (game && pack ? new Set(claimableSquares(game, pack, marked)) : new Set<number>()),
    [game, pack, marked],
  );

  const shake = (sq: number) => {
    setWrongSquare(sq);
    window.clearTimeout(shakeTimer.current);
    shakeTimer.current = window.setTimeout(() => setWrongSquare(w => (w === sq ? null : w)), 450);
  };

  const tapSquare = (sq: number) => {
    if (phase !== 'playing' || !game || sq === FREE_INDEX || marked[sq]) return;
    if (claimable.has(sq)) {
      setMarked(prev => { const next = [...prev]; next[sq] = true; return next; });
    } else {
      shake(sq);
    }
  };

  const tapTableSquare = (sq: number) => {
    if (!table || !inTurn) return;
    const next = claimSquare(table, sq);
    if (next === table) shake(sq);
    else setTable(next);
  };

  const mySquares = squaresOf(marked);
  const cpuSquares = squaresOf(cpuMarked);
  const finalScore = scoreGame(marked);
  const won = mode === 'cpu' ? mySquares > cpuSquares : mySquares >= 12;
  const isDone = phase === 'done';
  /* A daily already in the books is not a finish: a reloaded or reopened
     result never records, and the fresh one records once, in the same
     commit that then books it below. */
  const bookedDaily = mode === 'daily' && dailyDone !== null;
  /* Round 727: a finished table records the first human seat's card, the
     way Rebuild records the first human's run at a fuller table. */
  const tableDone = phase === 'table' && table?.phase === 'done';
  const firstHuman = table?.seats.find(s => s.kind === 'human') ?? null;
  const tableScore = firstHuman ? scoreGame(firstHuman.marked) : 0;
  useGameCompletion(
    SLUG,
    (isDone && !bookedDaily) || tableDone,
    tableDone ? tableScore : finalScore,
    tableDone ? (firstHuman ? squaresOf(firstHuman.marked) : 0) : mySquares,
  );

  useEffect(() => {
    if (!isDone || mode !== 'daily' || dailyDone) return;
    const rec = { date: todayStr, marked };
    saveDailyBingo(rec);
    setDailyDone(rec);
  }, [isDone, mode, dailyDone, marked]);
  const doneSquares = dailyDone ? squaresOf(dailyDone.marked) : 0;

  const boardGrid = (board: boolean[]) => {
    const rows: string[] = [];
    for (let r = 0; r < 5; r += 1) {
      rows.push([0, 1, 2, 3, 4].map(c => {
        const i = r * 5 + c;
        if (i === FREE_INDEX) return '🎁';
        return board[i] ? '🟩' : '⬜';
      }).join(''));
    }
    return rows;
  };

  const emojiGrid = useMemo(() => {
    if (!isDone) return '';
    return [`🎱 Sports Bingo: ${finalScore} pts`, ...boardGrid(marked)].join('\n');
  }, [isDone, marked, finalScore]);

  const verdict = tableDone && table ? declareWinner(table) : null;
  const winnerNames = verdict && table ? verdict.winners.map(i => table.seats[i].name) : [];
  const tableWon = verdict && table ? verdict.winners.some(i => table.seats[i].kind === 'human') : false;
  const tableGrid = useMemo(() => {
    if (!table || !verdict) return '';
    const lead = table.seats[verdict.winners[0]];
    return [`🎱 Sports Bingo, ${table.seats.length} seats: ${winnerNames.join(' and ')} ${verdict.winners.length > 1 ? 'share it' : 'take it'}`, ...boardGrid(lead.marked)].join('\n');
  }, [table, verdict, winnerNames]);

  const modeButton = (label: string, blurb: string, onClick: () => void) => (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-border bg-surface-1 p-4 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors"
    >
      <span className="block font-bold text-foreground">{label}</span>
      <span className="block text-xs text-muted-foreground mt-0.5">{blurb}</span>
    </button>
  );

  const seatInChair = table ? table.seats[table.turn] : null;

  return (
    <>
      <PageSeo
        title="Sports Bingo: The Pack Opening Bingo Game | DoUKnowBall"
        description="A bingo card of football conditions, packs of real players on a timer. Mark the squares your pulls satisfy before the pack closes. Daily shared card, unlimited mode, race a CPU, or pass one phone round the table."
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
            {table && modeButton(
              'Resume pass the device',
              `${table.seats.length} seats, pack ${table.packIndex + 1} of ${PACK_COUNT}, ${table.seats[table.turn].name} is up next`,
              () => { setSecondsLeft(secondsFor(table.difficulty)); setPhase('table'); },
            )}
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
            {modeButton('Pass the device', 'Two to four of you on one phone, your own cards, the same packs. Pick what the squares can be and how fast it goes.', () => setPhase('tableSetup'))}
          </div>
        )}

        {phase === 'tableSetup' && (
          <PassDeviceSetup onBack={() => setPhase('setup')} onStart={startTable} />
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
              <BingoPackList pack={pack} />
              <button
                onClick={advancePack}
                className="mt-2 w-full rounded-lg border border-border bg-background py-2 text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
              >
                {packIndex + 1 >= PACK_COUNT ? 'Finish' : 'Done with this pack, open the next'}
              </button>
            </div>

            {/* The card */}
            <BingoCardGrid game={game} marked={marked} wrongSquare={wrongSquare} onTap={tapSquare} />
            <p className="text-center text-[11px] text-muted-foreground">
              Tap a square someone in the open pack satisfies. Lines: {lineCount(marked)}
            </p>
          </div>
        )}

        {phase === 'table' && table && seatInChair && table.phase === 'handover' && (
          <BingoHandOver
            name={seatInChair.name}
            packNumber={table.packIndex + 1}
            first={table.packIndex === 0 && !table.seats.some(s => s.kind === 'human' && s.index < table.turn)}
            cpuPlayed={table.seats.filter(s => s.kind === 'cpu' && s.index < table.turn).map(s => s.name)}
            onReady={takeTurn}
            onQuit={quitTable}
          />
        )}

        {phase === 'table' && table && seatInChair && table.phase === 'turn' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Package className="w-4 h-4" /> Pack {table.packIndex + 1} of {PACK_COUNT}</span>
              <span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4" /> {seatInChair.name}</span>
              <span className={cn('inline-flex items-center gap-1.5 tabular-nums', secondsLeft <= 4 ? 'text-destructive' : 'text-primary')}>
                <Timer className="w-4 h-4" /> {secondsLeft}s
              </span>
            </div>
            {table.fallback && (
              <p className="text-center text-[11px] text-amber-600 dark:text-amber-400">
                Your families fill {table.allowed} of 24 squares, the rest came from the whole bank.
              </p>
            )}

            {/* The open pack, turned up one player at a time */}
            <div className="rounded-xl border border-border bg-surface-1 p-3">
              <BingoPackList pack={table.packs[table.packIndex]} revealed={table.revealed} onReveal={() => setTable(t => (t ? revealNext(t) : t))} />
              <button
                onClick={endTurn}
                className="mt-2 w-full rounded-lg border border-border bg-background py-2 text-xs font-semibold text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
              >
                Done with this pack, pass the phone
              </button>
            </div>

            <BingoCardGrid game={seatGame(table, table.turn)} marked={seatInChair.marked} wrongSquare={wrongSquare} onTap={tapTableSquare} />
            <p className="text-center text-[11px] text-muted-foreground">
              Tap a square someone turned up satisfies. Lines: {lineCount(seatInChair.marked)} · {table.seats.map(s => `${s.name} ${squaresOf(s.marked)}`).join(' · ')}
            </p>
          </div>
        )}

        {tableDone && table && verdict && (
          <ResultScreen
            won={tableWon}
            outcomeEmoji={verdict.winners.length > 1 ? '🤝' : '🎉'}
            headline={
              verdict.winners.length > 1
                ? `Shared between ${winnerNames.join(' and ')}`
                : `${winnerNames[0]} takes it!`
            }
            statLine={
              verdict.by === 'goal'
                ? table.goal === 'line'
                  ? `First to a line, after ${table.packIndex + 1} pack${table.packIndex === 0 ? '' : 's'}`
                  : `A full card, after ${table.packIndex + 1} pack${table.packIndex === 0 ? '' : 's'}`
                : `Nobody got there in ${PACK_COUNT} packs, so most squares decides`
            }
            statRow={table.seats.map(s => ({ label: s.name, value: `${squaresOf(s.marked)} sq` }))}
            emojiGrid={tableGrid}
            share={{ score: String(scoreGame(table.seats[verdict.winners[0]].marked)), gameName: 'Sports Bingo', gamePath: '/sports-bingo' }}
            onPlayAgain={() => { clearBingoTable(); setTable(null); setPhase('tableSetup'); }}
            playAgainLabel="New table"
          >
            <div className="rounded-xl border border-border bg-background p-3 text-left">
              {table.seats.map(s => (
                <p key={s.index} className="flex items-center justify-between text-xs text-foreground py-0.5">
                  <span className="truncate">{verdict.winners.includes(s.index) ? '🏆 ' : ''}{s.name}{s.kind === 'cpu' ? ' (CPU)' : ''}</span>
                  <span className="ml-2 shrink-0 text-muted-foreground">
                    {squaresOf(s.marked)} squares, {lineCount(s.marked)} line{lineCount(s.marked) === 1 ? '' : 's'}, {scoreGame(s.marked)} pts
                    {s.doneAt !== null ? ` · there after ${s.doneAt} players` : ''}
                  </span>
                </p>
              ))}
            </div>
          </ResultScreen>
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
          description="A 5 by 5 bingo card of football conditions, ten packs of real players on a timer, and the marking is the skill: claim the squares your pulls satisfy before each pack closes. One shared daily card, an unlimited mode, a CPU opponent with three tempers, and a pass the device table for two to four people with custom cards."
        />
        <GameNav />
      </GameShell>
    </>
  );
}

/** A fresh table off a random seed. Not a useState initialiser, so the draw is one per tap. */
function createTableFor(pool: Player[], setup: BingoTableSetup): BingoTable {
  const seed = Math.floor(Math.random() * 2147483645) + 1;
  return createTable(pool, seed, setup);
}
