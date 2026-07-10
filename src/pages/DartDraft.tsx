import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Footer } from '@/components/game/Footer';
import { GameNavbar } from '@/components/game/GameNavbar';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import ShareButtons from '@/components/game/ShareButtons';
import { Button } from '@/components/ui/button';
import { Loader2, Target, Trophy, RotateCcw, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { playerRating } from '@/lib/squadDeal';
import {
  BOARD_EDGE, FORMATIONS, RING_LABEL, RING_POINTS, WEDGES,
  drawFromBoard, fetchDartDraftPool, finalScore, machineDraft, resolveHit,
  simulateSeries, squadGrade, squadRating,
  type Formation, type Ring, type SeriesResult, type ThrowResult,
} from '@/lib/dartDraft';
import type { Player } from '@/types/game';

type Phase = 'intro' | 'aimX' | 'aimY' | 'flight' | 'result' | 'squad' | 'sim' | 'done';

const R = 100; // board radius in SVG units

/** Annular wedge sector path between two angles (deg, 0 = +x) and two radii. */
function arcPath(a0: number, a1: number, r0: number, r1: number): string {
  const rad = (d: number) => (d * Math.PI) / 180;
  const x = (a: number, r: number) => Math.cos(rad(a)) * r;
  const y = (a: number, r: number) => Math.sin(rad(a)) * r;
  return [
    `M ${x(a0, r1)} ${y(a0, r1)}`,
    `A ${r1} ${r1} 0 0 1 ${x(a1, r1)} ${y(a1, r1)}`,
    `L ${x(a1, r0)} ${y(a1, r0)}`,
    `A ${r0} ${r0} 0 0 0 ${x(a0, r0)} ${y(a0, r0)}`,
    'Z',
  ].join(' ');
}

const DartDraft = () => {
  const [phase, setPhase] = useState<Phase>('intro');
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<Player[]>([]);
  const [legends, setLegends] = useState<Player[]>([]);
  const [formation, setFormation] = useState<Formation>(FORMATIONS[0]);
  const [slotIndex, setSlotIndex] = useState(0);
  const [squad, setSquad] = useState<(Player | null)[]>([]);
  const [throwLog, setThrowLog] = useState<ThrowResult[]>([]);
  const [lastThrow, setLastThrow] = useState<ThrowResult | null>(null);
  const [aim, setAim] = useState({ x: 0, y: 0 });       // sweeping crosshair (board units, -1.1..1.1)
  const [locked, setLocked] = useState({ x: 0, y: 0 }); // locked coords
  const [impact, setImpact] = useState<{ x: number; y: number } | null>(null);
  const [series, setSeries] = useState<SeriesResult | null>(null);
  const [legShown, setLegShown] = useState(0);
  const rafRef = useRef<number>(0);
  const phaseRef = useRef<Phase>('intro');
  phaseRef.current = phase;

  /* ---------- data ---------- */
  useEffect(() => {
    fetchDartDraftPool().then(({ current: c, legends: l }) => {
      setCurrent(c);
      setLegends(l);
      setLoading(false);
    });
  }, []);

  /* ---------- crosshair sweep ---------- */
  // Sweeps speed up every throw: period 1450ms on throw 1 → ~730ms on throw 11.
  const sweepPeriod = 1450 - slotIndex * 65;
  useEffect(() => {
    if (phase !== 'aimX' && phase !== 'aimY') return;
    const t0 = performance.now();
    const loop = (t: number) => {
      const p = ((t - t0) % sweepPeriod) / sweepPeriod;           // 0..1
      const wave = Math.sin(p * Math.PI * 2);                      // -1..1
      setAim(prev => (phase === 'aimX' ? { ...prev, x: wave * 1.05 } : { ...prev, y: wave * 1.05 }));
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, sweepPeriod]);

  /* ---------- throw resolution ---------- */
  const resolveThrow = useCallback((x: number, y: number) => {
    // hand shake: small jitter that grows with sweep speed
    const shake = 0.018 + (1450 - sweepPeriod) / 1450 * 0.03;
    const hx = x + (Math.random() * 2 - 1) * shake;
    const hy = y + (Math.random() * 2 - 1) * shake;
    setImpact({ x: hx, y: hy });
    setPhase('flight');
    window.setTimeout(() => {
      const { wedgeIndex, ring } = resolveHit(hx, hy);
      const wedge = WEDGES[wedgeIndex];
      const used = new Set(squad.filter((p): p is Player => p !== null).map(p => p.name));
      const slot = formation.slots[slotIndex];
      const result = drawFromBoard(current, legends, wedge, ring, slot, used);
      setLastThrow(result);
      setThrowLog(log => [...log, result]);
      setSquad(sq => {
        const next = [...sq];
        next[slotIndex] = result.player;
        return next;
      });
      setPhase('result');
    }, 520);
  }, [current, legends, formation, slotIndex, squad, sweepPeriod]);

  const lockIn = useCallback(() => {
    if (phaseRef.current === 'aimX') {
      setLocked(prev => ({ ...prev, x: aim.x }));
      setPhase('aimY');
    } else if (phaseRef.current === 'aimY') {
      const y = aim.y;
      setLocked(prev => ({ ...prev, y }));
      resolveThrow(locked.x, y);
    }
  }, [aim, locked.x, resolveThrow]);

  // Space / Enter also throw
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        if (phaseRef.current === 'aimX' || phaseRef.current === 'aimY') {
          e.preventDefault();
          lockIn();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lockIn]);

  const nextAfterResult = () => {
    if (slotIndex + 1 >= formation.slots.length) {
      setPhase('squad');
    } else {
      setSlotIndex(i => i + 1);
      setImpact(null);
      setPhase('aimX');
    }
  };

  const startGame = (f: Formation) => {
    setFormation(f);
    setSquad(new Array(f.slots.length).fill(null));
    setThrowLog([]);
    setSlotIndex(0);
    setImpact(null);
    setSeries(null);
    setLegShown(0);
    setPhase('aimX');
  };

  const startSim = () => {
    const ai = machineDraft(current, legends, formation);
    setSeries(simulateSeries(squad, ai));
    setLegShown(0);
    setPhase('sim');
  };

  /* ---------- scoring + completion ---------- */
  const throwPoints = throwLog.reduce((s, t) => s + t.points, 0);
  const rating = squadRating(squad);
  const grade = squadGrade(rating);
  const score = series ? finalScore(throwPoints, rating, series.outcome) : 0;
  const sharpHits = throwLog.filter(t => t.ring === 'JACKPOT' || t.ring === 'T1').length;
  useGameCompletion('dart-draft', phase === 'done', score, sharpHits);

  const slot = formation.slots[slotIndex];

  /* ---------- board SVG ---------- */
  const board = useMemo(() => (
    <g>
      {WEDGES.map((w, i) => {
        const a0 = -105 + i * 30;
        const a1 = a0 + 30;
        return (
          <g key={w.id}>
            <path d={arcPath(a0, a1, 15, BOARD_EDGE * R)} fill={i % 2 === 0 ? w.color : w.darkColor} stroke="hsl(0 0% 8%)" strokeWidth="0.8" />
            {/* label */}
            <text
              x={Math.cos(((a0 + 15) * Math.PI) / 180) * 92}
              y={Math.sin(((a0 + 15) * Math.PI) / 180) * 92}
              fill={w.id === 'legends' ? 'hsl(45 90% 55%)' : 'hsl(0 0% 80%)'}
              fontSize="6.2"
              fontWeight="800"
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${a0 + 15 + 90} ${Math.cos(((a0 + 15) * Math.PI) / 180) * 92} ${Math.sin(((a0 + 15) * Math.PI) / 180) * 92})`}
            >
              {w.short}
            </text>
          </g>
        );
      })}
      {/* ring highlights: triple + double bands */}
      <circle r={47 /* (0.42+0.52)/2 */} fill="none" stroke="white" strokeOpacity="0.16" strokeWidth={10} />
      <circle r={77 /* (0.72+0.82)/2 */} fill="none" stroke="white" strokeOpacity="0.14" strokeWidth={10} />
      {/* band boundary lines */}
      {[0.42, 0.52, 0.72, 0.82].map(f => (
        <circle key={f} r={f * R} fill="none" stroke="hsl(0 0% 8%)" strokeWidth="0.8" />
      ))}
      {/* bulls */}
      <circle r={15} fill="hsl(150 45% 22%)" stroke="hsl(0 0% 8%)" strokeWidth="0.8" />
      <circle r={7} fill="hsl(0 75% 45%)" stroke="hsl(0 0% 8%)" strokeWidth="0.8" />
      <text y="1.8" fill="white" fontSize="4.6" fontWeight="900" textAnchor="middle">50</text>
    </g>
  ), []);

  const ringBadge = (ring: Ring) => (
    <span className={cn(
      'inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider',
      ring === 'JACKPOT' && 'bg-red-500/20 text-red-400',
      ring === 'T1' && 'bg-amber-500/20 text-amber-400',
      ring === 'T2' && 'bg-emerald-500/20 text-emerald-400',
      ring === 'T3' && 'bg-blue-500/20 text-blue-400',
      ring === 'T4' && 'bg-slate-500/20 text-slate-300',
      ring === 'MISS' && 'bg-zinc-600/30 text-zinc-400',
    )}>
      {RING_LABEL[ring]} · +{RING_POINTS[ring]}
    </span>
  );

  return (
    <>
      <PageSeo
        title="Dart Draft - Timed Darts Squad Builder | DoUKnowBall"
        description="Throw timed darts at the board of fate: every wedge is a league, nation or the Legends pool. Build an XI from wherever your darts land, then simulate the showdown."
        path="/dart-draft"
      />
      <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, hsl(240 30% 8%) 0%, hsl(260 28% 6%) 55%, hsl(150 25% 6%) 100%)' }}>
        <GameNavbar />
        <main className="flex-1 flex flex-col items-center px-4 py-6 sm:py-10">
          <div className="w-full max-w-5xl mx-auto space-y-5 text-center">

            {/* ---------- INTRO ---------- */}
            {phase === 'intro' && (
              <>
                <div className="flex items-center justify-center gap-3 text-primary">
                  <Target className="w-10 h-10 sm:w-14 sm:h-14" />
                </div>
                <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
                  Dart <span className="text-primary">Draft</span>
                </h1>
                <p className="text-base sm:text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
                  11 throws. Every wedge is a league, a nation — or the golden <b>LEGENDS</b> wedge.
                  Time your dart: the <b>triple ring</b> pulls elites, the bullseye pulls superstars,
                  and missing the board gets you the worst player the wedge owns.
                </p>
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-bold uppercase tracking-widest text-primary">Pick your formation</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {FORMATIONS.slice(0, 6).map(f => (
                        <Button key={f.name} variant="outline" size="lg" className="font-mono font-bold" onClick={() => startGame(f)}>
                          {f.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ---------- THROWING ---------- */}
            {(phase === 'aimX' || phase === 'aimY' || phase === 'flight' || phase === 'result') && (
              <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* Board */}
                <div className="w-full lg:flex-1">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/70 border border-border mb-3">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold text-foreground">
                      Throw {slotIndex + 1}/{formation.slots.length}
                    </span>
                    <span className="text-xs font-mono text-primary font-bold uppercase">→ {slot.label} slot</span>
                    <span className="text-xs text-muted-foreground hidden sm:inline">· sweeps get faster every throw</span>
                  </div>
                  <div
                    className="relative mx-auto max-w-[440px] cursor-crosshair select-none touch-none"
                    onPointerDown={() => (phase === 'aimX' || phase === 'aimY') && lockIn()}
                  >
                    <svg viewBox="-112 -112 224 224" className="w-full drop-shadow-2xl">
                      <circle r={108} fill="hsl(240 20% 12%)" stroke="hsl(45 40% 35%)" strokeWidth="2.5" />
                      {board}
                      {/* locked X guide */}
                      {(phase === 'aimY') && (
                        <line x1={locked.x * R} y1={-108} x2={locked.x * R} y2={108} stroke="hsl(45 95% 60%)" strokeWidth="1.4" strokeDasharray="3 2" />
                      )}
                      {/* sweeping crosshairs */}
                      {phase === 'aimX' && (
                        <line x1={aim.x * R} y1={-108} x2={aim.x * R} y2={108} stroke="hsl(150 90% 55%)" strokeWidth="1.8" />
                      )}
                      {phase === 'aimY' && (
                        <line x1={-108} y1={aim.y * R} x2={108} y2={aim.y * R} stroke="hsl(150 90% 55%)" strokeWidth="1.8" />
                      )}
                      {/* dart impact */}
                      {impact && (phase === 'flight' || phase === 'result') && (
                        <g transform={`translate(${impact.x * R} ${impact.y * R})`}>
                          <circle r={phase === 'flight' ? 7 : 4.2} fill="hsl(150 90% 50%)" stroke="white" strokeWidth="1.6"
                            style={{ transition: 'all 480ms cubic-bezier(0.2, 0.9, 0.3, 1)' }} />
                          <line x1={2.5} y1={-2.5} x2={10} y2={-10} stroke="white" strokeWidth="1.6" strokeLinecap="round" />
                        </g>
                      )}
                    </svg>
                    {(phase === 'aimX' || phase === 'aimY') && (
                      <div className="absolute inset-x-0 -bottom-1 flex justify-center">
                        <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest animate-pulse">
                          {phase === 'aimX' ? 'Tap to lock LEFT–RIGHT' : 'Tap to lock UP–DOWN'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Result card */}
                  {phase === 'result' && lastThrow && (
                    <div className="mt-5 mx-auto max-w-md rounded-2xl border border-primary/30 bg-card/70 backdrop-blur-md p-5 space-y-3 animate-in fade-in slide-in-from-bottom-2">
                      <p className="text-sm font-bold uppercase tracking-widest" style={{ color: lastThrow.wedge.color }}>
                        🎯 {lastThrow.usedWorldFallback
                          ? `${lastThrow.wedge.label} had nobody for this slot — WORLD pool stepped in`
                          : lastThrow.wedge.label}
                      </p>
                      {ringBadge(lastThrow.ring)}
                      {lastThrow.player ? (
                        <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 border border-border px-4 py-3">
                          <div className="text-left">
                            <p className="text-lg font-extrabold text-foreground">{lastThrow.player.name}</p>
                            <p className="text-xs text-muted-foreground">{lastThrow.player.club} · {lastThrow.player.nationality} · {lastThrow.player.position}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-2xl font-black text-primary">{playerRating(lastThrow.player)}</p>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">rating</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Nobody fits this slot — the shirt stays empty. Brutal.</p>
                      )}
                      <Button size="lg" className="w-full font-bold" onClick={nextAfterResult}>
                        {slotIndex + 1 >= formation.slots.length ? 'Reveal my XI' : 'Next throw'}
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Roster pitch */}
                <div className="w-full lg:w-[300px] shrink-0">
                  <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-md p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Your XI · {formation.name}</p>
                    <div className="relative w-full rounded-xl overflow-hidden" style={{ paddingBottom: '128%', background: 'linear-gradient(180deg, hsl(145 45% 18%), hsl(145 50% 12%)' + ')' }}>
                      {formation.slots.map((s, i) => {
                        const p = squad[i];
                        const active = i === slotIndex && phase !== 'result';
                        return (
                          <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
                            <div className={cn(
                              'w-9 h-9 rounded-full border-2 flex items-center justify-center text-[10px] font-black mx-auto',
                              p ? 'bg-primary text-primary-foreground border-white/70' : active ? 'bg-amber-400/30 border-amber-400 text-amber-200 animate-pulse' : 'bg-black/30 border-white/25 text-white/50',
                            )}>
                              {p ? playerRating(p) : s.label}
                            </div>
                            {p && <p className="text-[9px] font-bold text-white/90 mt-0.5 max-w-[72px] truncate">{p.name.split(' ').slice(-1)[0]}</p>}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-3 text-xs text-muted-foreground font-semibold">
                      <span>Throw points: <span className="text-primary font-black">{throwPoints}</span></span>
                      <span>Sharp hits: <span className="text-primary font-black">{sharpHits}</span></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ---------- SQUAD REVEAL ---------- */}
            {phase === 'squad' && (
              <div className="space-y-4 max-w-lg mx-auto">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">Your XI is set</h2>
                <div className="rounded-2xl border border-primary/30 bg-card/70 p-6 space-y-2">
                  <p className="text-6xl font-black text-primary">{rating}</p>
                  <p className="text-sm uppercase tracking-widest text-muted-foreground font-bold">Squad rating · Grade {grade.grade}</p>
                  <p className="text-sm text-foreground">{grade.line}</p>
                </div>
                <Button size="lg" className="w-full text-lg py-6 font-bold" onClick={startSim}>
                  <Trophy className="w-5 h-5 mr-2" /> Face The Machine — best of 3
                </Button>
              </div>
            )}

            {/* ---------- SIM ---------- */}
            {(phase === 'sim' || phase === 'done') && series && (
              <div className="space-y-4 max-w-xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">The Showdown</h2>
                {series.legs.slice(0, legShown + (phase === 'done' ? 3 : 1)).slice(0, 3).map((leg, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-card/70 p-4 text-left space-y-1.5">
                    <p className="text-sm font-black uppercase tracking-widest text-primary">Leg {i + 1} — You {leg.userGoals} : {leg.aiGoals} Machine</p>
                    {leg.events.map((e, j) => (
                      <p key={j} className={cn('text-xs sm:text-sm', e.side === 'user' ? 'text-emerald-300' : e.side === 'ai' ? 'text-red-300' : 'text-muted-foreground')}>
                        <span className="font-mono font-bold">{e.minute}'</span> {e.text}
                      </p>
                    ))}
                  </div>
                ))}
                {phase === 'sim' && legShown < 2 && (
                  <Button size="lg" variant="outline" className="font-bold" onClick={() => setLegShown(n => n + 1)}>
                    Next leg <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
                {phase === 'sim' && legShown >= 2 && (
                  <Button size="lg" className="font-bold" onClick={() => setPhase('done')}>
                    Full-time verdict <Trophy className="w-4 h-4 ml-1" />
                  </Button>
                )}
                {phase === 'done' && (
                  <div className="rounded-2xl border border-primary/40 bg-card/80 p-6 space-y-3">
                    <p className="text-lg font-extrabold text-foreground">{series.headline}</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-secondary/50 p-3"><p className="text-2xl font-black text-primary">{throwPoints}</p><p className="text-[10px] uppercase tracking-wider text-muted-foreground">throws</p></div>
                      <div className="rounded-xl bg-secondary/50 p-3"><p className="text-2xl font-black text-primary">{rating}</p><p className="text-[10px] uppercase tracking-wider text-muted-foreground">squad</p></div>
                      <div className="rounded-xl bg-secondary/50 p-3"><p className="text-2xl font-black text-primary">{score}</p><p className="text-[10px] uppercase tracking-wider text-muted-foreground">total score</p></div>
                    </div>
                    <ShareButtons
                      gameName="Dart Draft"
                      gamePath="/dart-draft"
                      score={`${score} pts (Grade ${grade.grade} XI)`}
                      customText={`My darts drafted a Grade ${grade.grade} XI (${rating} rated) and scored ${score} on Dart Draft at DoUKnowBall! 🎯 Can your aim build better? douknowball.com/dart-draft`}
                    />
                    <Button size="lg" variant="outline" className="w-full font-bold" onClick={() => setPhase('intro')}>
                      <RotateCcw className="w-4 h-4 mr-2" /> Throw again
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        <GameSeoContent
          title="Dart Draft: Timed Darts Squad Builder | DoUKnowBall"
          description="The YouTuber dartboard challenge as a game: time your throws, land on leagues, nations or the Legends wedge, draft whoever the board gives you, and simulate the showdown against The Machine."
          howToPlay={[
            'Pick a formation, then make 11 timed throws — lock the left-right sweep, then the up-down sweep. Sweeps get faster every throw.',
            'Wherever the dart lands decides your player: the wedge is the pool (league, nation, Legends), the ring is the quality — triple ring and bullseye pull elites, missing the board pulls the worst player the wedge owns.',
            'When your XI is complete, take your squad rating into a best-of-3 showdown against The Machine and post your total score.',
          ]}
          examples={[
            'Bullseye on the LEGENDS wedge: prime Zidane, Maradona or Messi tier',
            'Triple ring on PREM: an elite Premier League pick for that slot',
            'Off the board on ARG: enjoy the worst Argentine the pool owns',
            'Sweeps speed up: throw 11 is a nerve test',
            'Grade S squad: rating 85+ — the board bowed to you',
          ]}
        />
        <Footer />
      </div>
    </>
  );
};

export default DartDraft;
