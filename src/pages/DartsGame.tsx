import { useCallback, useEffect, useMemo, useRef, useState, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Play, RotateCcw, Target, Crown, Zap } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import { GameNav } from '@/components/game/GameNav';
import { GameNavbar } from '@/components/game/GameNavbar';
import { Footer } from '@/components/game/Footer';
import AdBanner from '@/components/ads/AdBanner';
import ReportQuestion from '@/components/game/ReportQuestion';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { flagFor } from '@/lib/dealPlayers';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import {
  fetchWhoAmIPool,
  WhoAmIData,
  WhoAmIPlayer,
  DartCategory,
  Ring,
  Dart,
  AiDifficulty,
  AI_LEVELS,
  START_SCORE,
  DARTS_PER_TURN,
  WEDGE_ORDER,
  buildCategories,
  assignBoard,
  resolveAnswer,
  aiTurn,
  applyDart,
  dartScore,
  rollRing,
  wedgeAtAngle,
  ringLabel,
  makeRng,
  checkoutHint,
} from '@/lib/dartsGame';

type Phase = 'boot' | 'error' | 'idle' | 'aiming' | 'answering' | 'ai' | 'gameover';

// ---- board geometry (view only) -----------------------------------------
const CX = 160;
const CY = 160;
const R_OUT = 150;
const R_IN = 30;

function polar(r: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.sin(rad), y: CY - r * Math.cos(rad) };
}

function sectorPath(rIn: number, rOut: number, a0: number, a1: number): string {
  const o0 = polar(rOut, a0);
  const o1 = polar(rOut, a1);
  const i1 = polar(rIn, a1);
  const i0 = polar(rIn, a0);
  return [
    `M ${o0.x.toFixed(2)} ${o0.y.toFixed(2)}`,
    `A ${rOut} ${rOut} 0 0 1 ${o1.x.toFixed(2)} ${o1.y.toFixed(2)}`,
    `L ${i1.x.toFixed(2)} ${i1.y.toFixed(2)}`,
    `A ${rIn} ${rIn} 0 0 0 ${i0.x.toFixed(2)} ${i0.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

interface Wedge {
  num: number;
  path: string;
  label: { x: number; y: number };
}

/** Radius (fraction of R_OUT) where a landed ring is drawn. */
function ringRadius(ring: Ring): number {
  if (ring === 'treble') return R_OUT * 0.5;
  if (ring === 'double') return R_OUT * 0.92;
  if (ring === 'single') return R_OUT * 0.72;
  return R_OUT * 1.08; // miss: off the board
}

interface LogEntry {
  who: 'you' | 'ai';
  text: string;
  good: boolean;
}

const DartsGame = () => {
  const [phase, setPhase] = useState<Phase>('boot');
  const [data, setData] = useState<WhoAmIData | null>(null);
  const [categories, setCategories] = useState<DartCategory[]>([]);
  const [board, setBoard] = useState<Record<number, DartCategory>>({});
  const [ai, setAi] = useState<AiDifficulty>(AI_LEVELS[1]);

  const [youScore, setYouScore] = useState(START_SCORE);
  const [aiScore, setAiScore] = useState(START_SCORE);
  const [turn, setTurn] = useState<'you' | 'ai'>('you');
  const [dartsLeft, setDartsLeft] = useState(DARTS_PER_TURN);

  const [angle, setAngle] = useState(0);
  const angleRef = useRef(0);

  const [current, setCurrent] = useState<{ wedge: number; ring: Ring; cat: DartCategory } | null>(null);
  const [landed, setLanded] = useState<{ x: number; y: number } | null>(null);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [used, setUsed] = useState<Set<string>>(() => new Set<string>());
  const [log, setLog] = useState<LogEntry[]>([]);
  const [winner, setWinner] = useState<'you' | 'ai' | null>(null);

  const rngRef = useRef<() => number>(makeRng(Date.now() >>> 0));
  const inputRef = useRef<HTMLInputElement>(null);

  // ---- boot: load the real player pool -----------------------------------
  const boot = useCallback(async () => {
    setPhase('boot');
    const pool = await fetchWhoAmIPool();
    if (!pool || pool.pool.length < 50) {
      setPhase('error');
      return;
    }
    const cats = buildCategories(pool);
    if (cats.length < 8) {
      setPhase('error');
      return;
    }
    setData(pool);
    setCategories(cats);
    setPhase('idle');
  }, []);

  useEffect(() => {
    boot();
  }, [boot]);

  // ---- the aim sweep: one interval, alive only while you are aiming -------
  useEffect(() => {
    if (phase !== 'aiming') return;
    const id = window.setInterval(() => {
      angleRef.current = (angleRef.current + 6) % 360;
      setAngle(angleRef.current);
    }, 40);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === 'answering') inputRef.current?.focus();
  }, [phase]);

  const currentWedge = wedgeAtAngle(angle);

  const wedges = useMemo<Wedge[]>(() => {
    return WEDGE_ORDER.map((num, i) => {
      const a0 = i * 18 - 9;
      const a1 = i * 18 + 9;
      const label = polar(R_OUT + 12, i * 18);
      return { num, path: sectorPath(R_IN, R_OUT, a0, a1), label };
    });
  }, []);

  // ---- game lifecycle ----------------------------------------------------
  const startGame = (level: AiDifficulty) => {
    const rng = makeRng(Date.now() >>> 0);
    rngRef.current = rng;
    setAi(level);
    setBoard(assignBoard(categories, rng));
    setYouScore(START_SCORE);
    setAiScore(START_SCORE);
    setTurn('you');
    setDartsLeft(DARTS_PER_TURN);
    setUsed(new Set<string>());
    setLog([]);
    setWinner(null);
    setCurrent(null);
    setLanded(null);
    setInput('');
    setFeedback(null);
    angleRef.current = 0;
    setAngle(0);
    setPhase('aiming');
  };

  const throwDart = () => {
    if (phase !== 'aiming') return;
    const wedge = wedgeAtAngle(angleRef.current);
    // You time the wedge with the sweep; the ring (single/double/treble) is chance.
    const ring = rollRing(rngRef.current, 0.5);
    const cat = board[wedge] ?? categories[0];
    setCurrent({ wedge, ring, cat });
    setLanded(null);
    setInput('');
    setFeedback(null);
    setPhase('answering');
  };

  const pushLog = (entry: LogEntry) => setLog((l) => [entry, ...l].slice(0, 8));

  // advance after a player's dart is resolved (banked or missed)
  const afterPlayerDart = (checkedOut: boolean) => {
    if (checkedOut) {
      setWinner('you');
      setPhase('gameover');
      return;
    }
    const remaining = dartsLeft - 1;
    setDartsLeft(remaining);
    if (remaining <= 0) {
      startAiTurn();
    } else {
      setCurrent(null);
      setLanded(null);
      setInput('');
      setFeedback(null);
      setPhase('aiming');
    }
  };

  const resolveDart = (bank: boolean) => {
    if (!current || !data) return;
    const { wedge, ring, cat } = current;

    if (!bank) {
      // player chose to skip / gave up this dart
      setLanded(polar(ringRadius('miss'), angleRef.current));
      pushLog({ who: 'you', text: `Dart skipped on ${cat.label}`, good: false });
      afterPlayerDart(false);
      return;
    }

    const res = resolveAnswer(data, cat, input, used);
    if (res.kind === 'ambiguous') {
      setFeedback('More than one player fits — type the full name.');
      return;
    }
    if (res.kind === 'used') {
      setFeedback('You already used that player this leg. Try another.');
      return;
    }
    if (res.kind === 'notfound') {
      setFeedback(`No player found by that name in the pool. Check the spelling.`);
      return;
    }
    if (res.kind === 'wrongcat') {
      // real player, wrong category → the dart misses the board (scores 0)
      setLanded(polar(ringRadius('miss'), angleRef.current));
      pushLog({ who: 'you', text: `${res.player?.name ?? 'That player'} isn't ${cat.label} — missed`, good: false });
      afterPlayerDart(false);
      return;
    }

    // HIT: correct player for the category
    const player = res.player as WhoAmIPlayer;
    const score = dartScore(wedge, ring);
    const applied = applyDart(youScore, score);
    setUsed((prev) => new Set(prev).add(player.name));
    setLanded(polar(ringRadius(ring), angleRef.current));

    if (applied.bust) {
      pushLog({ who: 'you', text: `${flagFor(player.nationality)} ${player.name} → ${ringLabel(wedge, ring)} busts (need ${youScore})`, good: false });
      afterPlayerDart(false);
      return;
    }

    setYouScore(applied.remaining);
    pushLog({
      who: 'you',
      text: `${flagFor(player.nationality)} ${player.name} → ${ringLabel(wedge, ring)} (−${score}), ${applied.remaining} left`,
      good: true,
    });
    afterPlayerDart(applied.checkout);
  };

  const startAiTurn = () => {
    setTurn('ai');
    setCurrent(null);
    setLanded(null);
    setInput('');
    setFeedback(null);
    setPhase('ai');
    window.setTimeout(() => {
      const { darts, remaining } = aiTurn(aiScore, ai, rngRef.current);
      const scored = darts.reduce((a, d) => a + d.score, 0);
      setAiScore(remaining);
      const detail = darts.map((d: Dart) => (d.score > 0 ? ringLabel(d.wedge, d.ring) : 'miss')).join(', ');
      pushLog({ who: 'ai', text: `${ai.label}: ${detail} (−${scored}), ${remaining} left`, good: scored > 0 });
      if (remaining <= 0) {
        setWinner('ai');
        setPhase('gameover');
        return;
      }
      setTurn('you');
      setDartsLeft(DARTS_PER_TURN);
      angleRef.current = 0;
      setAngle(0);
      setPhase('aiming');
    }, 1400);
  };

  useGameCompletion('darts', phase === 'gameover', winner === 'you' ? Math.max(1, START_SCORE - aiScore) : 0);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      resolveDart(true);
    }
  };

  const sweepEnd = polar(R_OUT, angle);
  const shareLine = winner === 'you'
    ? `🎯 I beat ${ai.label} at Darts on DoUKnowBall — checked out 501 before the machine!`
    : `🎯 ${ai.label} edged me at Darts on DoUKnowBall. Can you check out 501 first?`;

  return (
    <main className="min-h-screen bg-background">
      <GameNavbar />
      <PageSeo
        title="Darts | Name-a-Player 501 vs the Machine | DoUKnowBall"
        description="Football darts: sweep the board, throw, and name a real player from whatever category you land on to bank the points. Race an AI from 501 to zero. Free daily soccer trivia darts."
        path="/darts"
      />
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        <header className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-[0.08em] text-primary font-display mb-1">DARTS</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Land the board, name a player from the category, race the machine from 501 to zero.
          </p>
        </header>

        {phase === 'boot' && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {phase === 'error' && (
          <div className="text-center py-12">
            <p className="text-destructive font-semibold mb-3">Couldn't load the player pool right now.</p>
            <button onClick={boot} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-semibold">
              Try again
            </button>
          </div>
        )}

        {phase === 'idle' && (
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-center font-bold text-foreground mb-1">Pick your opponent</h2>
            <p className="text-center text-xs text-muted-foreground mb-4">
              You both start on 501. Sweep the board, throw, then name a real player who fits the category you hit to
              bank that dart. First to exactly zero wins — overshoot and the dart busts.
            </p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {AI_LEVELS.map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => setAi(lvl)}
                  className={cn(
                    'rounded-xl border p-3 text-center transition-colors',
                    lvl.id === ai.id ? 'border-primary bg-primary/10' : 'border-border bg-background hover:border-primary/40',
                  )}
                >
                  <div className="font-bold text-foreground text-sm">{lvl.label}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight mt-1">{lvl.blurb}</div>
                </button>
              ))}
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 mb-5 max-w-sm mx-auto list-disc list-inside">
              <li>Tap THROW to stop the sweeping pointer — the wedge sets the category and points.</li>
              <li>Treble = ×3, Double = ×2. Name the player right to bank it; wrong = the dart misses.</li>
              <li>Each player can only be used once per leg. Big numbers clear 501 faster.</li>
            </ul>
            <div className="flex justify-center">
              <button
                onClick={() => startGame(ai)}
                className="inline-flex items-center gap-2 px-10 py-3.5 bg-primary text-primary-foreground rounded-full font-bold text-lg hover:opacity-90 transition-opacity"
              >
                <Play className="w-5 h-5" /> Throw first
              </button>
            </div>
          </div>
        )}

        {(phase === 'aiming' || phase === 'answering' || phase === 'ai' || phase === 'gameover') && (
          <div className="space-y-4">
            {/* scoreboard */}
            <div className="grid grid-cols-2 gap-3">
              <div className={cn('rounded-2xl border p-4 text-center', turn === 'you' && phase !== 'gameover' ? 'border-primary bg-primary/10' : 'border-border bg-card')}>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">You</div>
                <div className="text-4xl font-bold text-primary font-display leading-none">{youScore}</div>
                <div className="mt-2 flex justify-center gap-1">
                  {Array.from({ length: DARTS_PER_TURN }).map((_, i) => (
                    <span
                      key={i}
                      className={cn('w-2.5 h-2.5 rounded-full', turn === 'you' && i < dartsLeft ? 'bg-primary' : 'bg-secondary')}
                    />
                  ))}
                </div>
              </div>
              <div className={cn('rounded-2xl border p-4 text-center', turn === 'ai' && phase !== 'gameover' ? 'border-primary bg-primary/10' : 'border-border bg-card')}>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{ai.label}</div>
                <div className="text-4xl font-bold text-foreground font-display leading-none">{aiScore}</div>
                <div className="mt-2 text-[10px] text-muted-foreground">{phase === 'ai' ? 'throwing…' : 'waiting'}</div>
              </div>
            </div>

            {/* board */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <svg viewBox="-16 -12 352 376" className="w-full max-w-[360px] mx-auto block" role="img" aria-label="Dartboard">
                {wedges.map((w, i) => {
                  const isAim = phase === 'aiming' && w.num === currentWedge;
                  const isHit = current?.wedge === w.num && phase !== 'aiming';
                  return (
                    <path
                      key={w.num}
                      d={w.path}
                      className={cn(
                        'transition-colors',
                        isAim
                          ? 'fill-primary'
                          : isHit
                          ? 'fill-primary/60'
                          : i % 2 === 0
                          ? 'fill-secondary'
                          : 'fill-muted',
                      )}
                      stroke="hsl(var(--border))"
                      strokeWidth="0.75"
                    />
                  );
                })}
                {wedges.map((w) => (
                  <text
                    key={`t${w.num}`}
                    x={w.label.x}
                    y={w.label.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-muted-foreground"
                    style={{ fontSize: 11, fontWeight: 700 }}
                  >
                    {w.num}
                  </text>
                ))}
                {/* bull */}
                <circle cx={CX} cy={CY} r={R_IN} className="fill-card" stroke="hsl(var(--border))" strokeWidth="1" />
                <circle cx={CX} cy={CY} r={R_IN * 0.45} className="fill-primary/30" />
                {/* aim pointer */}
                {phase === 'aiming' && (
                  <line x1={CX} y1={CY} x2={sweepEnd.x} y2={sweepEnd.y} stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" />
                )}
                {/* landed dart */}
                {landed && (
                  <g>
                    <circle cx={landed.x} cy={landed.y} r="6" className="fill-primary" stroke="hsl(var(--background))" strokeWidth="2" />
                  </g>
                )}
                {/* caption */}
                <text x={CX} y={334} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11 }}>
                  {phase === 'aiming'
                    ? `Aiming: ${currentWedge}`
                    : current
                    ? ringLabel(current.wedge, current.ring)
                    : phase === 'ai'
                    ? `${ai.label} at the oche`
                    : ''}
                </text>
              </svg>

              {phase === 'aiming' && (
                <div className="mt-3 text-center">
                  <p className="text-xs text-muted-foreground mb-2">{checkoutHint(youScore)}</p>
                  <button
                    onClick={throwDart}
                    className="inline-flex items-center gap-2 px-10 py-3.5 bg-primary text-primary-foreground rounded-full font-bold text-lg hover:opacity-90 transition-opacity"
                  >
                    <Target className="w-5 h-5" /> Throw
                  </button>
                </div>
              )}

              {phase === 'answering' && current && (
                <div className="mt-3">
                  <div className="text-center mb-3">
                    <span className="inline-block text-[10px] uppercase tracking-wider text-muted-foreground">
                      You hit {ringLabel(current.wedge, current.ring)} · worth {dartScore(current.wedge, current.ring)}
                    </span>
                    <div className="mt-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30">
                      <Zap className="w-4 h-4 text-primary" />
                      <span className="font-bold text-foreground text-sm">{current.cat.prompt}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value);
                        setFeedback(null);
                      }}
                      onKeyDown={onKeyDown}
                      placeholder="Name a player…"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => resolveDart(true)}
                      disabled={input.trim().length < 2}
                      className="shrink-0 px-5 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Throw it
                    </button>
                  </div>
                  {feedback && <p className="mt-2 text-xs text-destructive text-center">{feedback}</p>}
                  <div className="mt-2 text-center">
                    <button onClick={() => resolveDart(false)} className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
                      Can't get it — skip this dart
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* log */}
            {log.length > 0 && phase !== 'gameover' && (
              <div className="bg-card border border-border rounded-2xl p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Throw log</div>
                <ul className="space-y-1">
                  {log.map((e, i) => (
                    <li key={i} className={cn('text-xs', e.good ? 'text-foreground' : 'text-muted-foreground')}>
                      <span className={cn('font-semibold', e.who === 'you' ? 'text-primary' : 'text-foreground')}>
                        {e.who === 'you' ? 'You' : ai.label}:
                      </span>{' '}
                      {e.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {phase === 'gameover' && (
              <div className="bg-card border border-border rounded-2xl p-6 text-center">
                <div className="text-4xl mb-2">{winner === 'you' ? '🏆' : '🎯'}</div>
                <h2 className="text-2xl font-bold text-primary font-display mb-1 inline-flex items-center gap-2 justify-center">
                  {winner === 'you' ? (
                    <>
                      <Crown className="w-6 h-6" /> Game shot — you win!
                    </>
                  ) : (
                    `${ai.label} takes it`
                  )}
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {winner === 'you'
                    ? `You checked out 501 before ${ai.label} (${aiScore} left on their board).`
                    : `${ai.label} checked out first — you had ${youScore} left. Run it back?`}
                </p>
                <pre className="text-sm tracking-wide whitespace-pre-wrap mb-2">{shareLine}</pre>
                <ShareButtons
                  score={winner === 'you' ? 'Win' : 'Loss'}
                  gameName="Darts"
                  gamePath="/darts"
                  emojiGrid={shareLine}
                />
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  <button
                    onClick={() => startGame(ai)}
                    className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:opacity-90 transition-opacity"
                  >
                    <RotateCcw className="w-4 h-4" /> Run it back
                  </button>
                  <button
                    onClick={() => setPhase('idle')}
                    className="inline-flex items-center gap-2 px-8 py-3 bg-secondary text-foreground rounded-full font-semibold hover:bg-secondary/70 transition-colors"
                  >
                    Change opponent
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <AdBanner slot="1234567890" format="horizontal" className="mt-8" />

        <div className="flex justify-center mt-6">
          <ReportQuestion gameType="darts" />
        </div>

        <GameSeoContent
          title="Darts: Football Trivia Meets 501"
          description="A soccer darts game that fuses a real dartboard with name-a-player trivia. A pointer sweeps the 20 wedges; you throw to lock in a wedge, which reveals a category drawn from real player data — a nationality, a club a player has turned out for, a position or a market-value tier. Name a real player who fits to bank that dart's value (trebles and doubles multiply it), and race an AI opponent down from 501 to exactly zero. Overshoot zero and the dart busts, just like the real game."
          howToPlay={[
            'You and the AI both start on 501. Lowest to exactly zero wins.',
            'Tap THROW to stop the sweeping pointer. The wedge you land on sets the points (treble ×3, double ×2) and the category.',
            'Name a real player who fits the revealed category to bank the dart. A wrong or unfitting name misses the board and scores nothing.',
            'You get three darts per turn, then the AI throws. Each player can only be used once per leg.',
            'Overshooting zero busts the dart, so line up your finish.',
          ]}
          examples={[
            'Land treble 20 on "Brazil" and name Vinícius Júnior to knock 60 off in one dart.',
            'On a "has played for Barcelona" wedge, anyone from Lewandowski to a former academy graduate counts.',
          ]}
        />
        <GameNav />
        <Footer />
      </div>
    </main>
  );
};

export default DartsGame;
