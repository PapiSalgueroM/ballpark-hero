import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameNavbar } from '@/components/game/GameNavbar';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import ShareButtons from '@/components/game/ShareButtons';
import { Button } from '@/components/ui/button';
import { FlagImg } from '@/components/FlagImg';
import { Crosshair, Loader2, RotateCcw, Trophy, LifeBuoy, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import {
  fetchDartDraftPool, finalScore, simulateSeries, squadGrade, squadRating,
  type SeriesResult,
} from '@/lib/dartDraft';
import { GEO_COUNTRIES, WORLD_H, WORLD_W, type GeoCountry } from '@/data/worldMapGeo';
import {
  DART_SLOTS, MAP_TOPICS, ROUND_VIEWS, VIEW_LABEL, accuracyPoints, countryAt,
  countryChoices, countryFill, dbNamesFor, isWcNation, legendChoices,
  machineMapDraft, mysteryChoices, oceanTrialist, pathOf, resolveMapThrow,
  rollZones, stormChoices, viewBoxOf, wildcardChoices, wonderkidChoices,
  type DraftChoice, type MapHit, type MapTopic, type Zone,
} from '@/lib/dartMap';
import { LEGENDS, WC2026_NATIONS, playerRating } from '@/lib/squadDeal';
import type { Player } from '@/types/game';
import { useRevealScroll } from '@/hooks/useRevealScroll';

type Phase = 'intro' | 'loading' | 'squad' | 'aim' | 'draft' | 'done';
type AimStage = 'x' | 'y' | 'landed';

const XI_SIZE = DART_SLOTS.length;

const money = (m: number) => (m >= 1000 ? `£${(m / 1000).toFixed(1)}B` : `£${m}M`);

/** Adjust out-of-position picks before rating and simulating. */
function adjustedXi(xi: (Player | null)[], oop: boolean[]): (Player | null)[] {
  return xi.map((p, i) => (p && oop[i] ? { ...p, marketValue: Math.max(1, Math.round(p.marketValue / 3)) } : p));
}

/** One rating everywhere: fillers keep their pinned overall, everyone else FIFA-curve minus the OOP tax. */
const shownRating = (p: Player, isOop: boolean) =>
  p.fixedOverall ?? Math.max(35, playerRating(p) - (isOop ? 8 : 0));

const DartDraft = () => {
  const [phase, setPhase] = useState<Phase>('intro');
  const [topic, setTopic] = useState<MapTopic>('current');
  const [pool, setPool] = useState<Player[]>([]);
  const [xi, setXi] = useState<(Player | null)[]>(Array(XI_SIZE).fill(null));
  const [oop, setOop] = useState<boolean[]>(Array(XI_SIZE).fill(false));
  const [slotIdx, setSlotIdx] = useState<number | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [stage, setStage] = useState<AimStage>('x');
  const [sweep, setSweep] = useState(0);        // 0..1 across the current axis
  const [lockedX, setLockedX] = useState<number | null>(null);
  const [dart, setDart] = useState<{ x: number; y: number } | null>(null);
  const [hit, setHit] = useState<MapHit | null>(null);
  const [blocked, setBlocked] = useState(false); // WC topic: hit a non-qualified nation
  const [choices, setChoices] = useState<DraftChoice[] | null>(null);
  // Round 63: the owner's no scroll rule. After a dart lands, the players you
  // can actually draft render further down the page, so that panel pulls
  // itself into view instead of leaving you looking at the board.
  const revealRef = useRevealScroll<HTMLDivElement>(`${phase}:${slotIdx ?? -1}:${choices.length}`);
  const [choicesLoading, setChoicesLoading] = useState(false);
  const [draftedIsos, setDraftedIsos] = useState<Set<string>>(new Set());
  const [usedNames, setUsedNames] = useState<Set<string>>(new Set());
  const [points, setPoints] = useState(0);
  const [sharpHits, setSharpHits] = useState(0);
  const [lifeboatUsed, setLifeboatUsed] = useState(false);
  const [series, setSeries] = useState<SeriesResult | null>(null);
  const [machineXi, setMachineXi] = useState<(Player | null)[]>([]);
  const seedRef = useRef(Math.floor(Math.random() * 1e9));
  const rafRef = useRef<number | null>(null);
  const dirRef = useRef(1);
  const sweepRef = useRef(0);

  const throwIndex = useMemo(() => xi.filter(Boolean).length, [xi]);
  const view = ROUND_VIEWS[Math.min(throwIndex, ROUND_VIEWS.length - 1)];
  const box = viewBoxOf(view);
  const topicPool = useMemo(() => {
    if (topic === 'wc2026') return pool.filter(p => WC2026_NATIONS.has(p.nationality));
    if (topic === 'alltime') {
      return [...LEGENDS, ...pool].sort((a, b) => b.marketValue - a.marketValue);
    }
    return pool;
  }, [pool, topic]);

  const userRating = useMemo(() => squadRating(adjustedXi(xi, oop)), [xi, oop]);
  const total = useMemo(
    () => (series ? finalScore(points, userRating, series.outcome) : 0),
    [series, points, userRating],
  );
  useGameCompletion('dart-draft', phase === 'done' && series !== null, total, sharpHits);

  /* ---------------- sweep animation ---------------- */
  const stopSweep = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const runSweep = useCallback(() => {
    stopSweep();
    const speed = Math.min(0.0021, 0.0011 + throwIndex * 0.00009); // per ms, faster late game
    let last = performance.now();
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      let v = sweepRef.current + dirRef.current * speed * dt;
      if (v > 1) { v = 2 - v; dirRef.current = -1; }
      if (v < 0) { v = -v; dirRef.current = 1; }
      sweepRef.current = v;
      setSweep(v);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [stopSweep, throwIndex]);

  useEffect(() => () => stopSweep(), [stopSweep]);

  /* ---------------- game flow ---------------- */
  const start = async (t: MapTopic) => {
    setTopic(t);
    setPhase('loading');
    const { current } = await fetchDartDraftPool();
    if (!current.length) { setPhase('intro'); return; }
    setPool(current);
    setXi(Array(XI_SIZE).fill(null));
    setOop(Array(XI_SIZE).fill(false));
    setDraftedIsos(new Set());
    setUsedNames(new Set());
    setPoints(0);
    setSharpHits(0);
    setLifeboatUsed(false);
    setSeries(null);
    seedRef.current = Math.floor(Math.random() * 1e9);
    setPhase('squad');
  };

  const beginThrow = (idx: number) => {
    if (xi[idx]) return;
    setSlotIdx(idx);
    setZones(rollZones(ROUND_VIEWS[Math.min(throwIndex, ROUND_VIEWS.length - 1)], throwIndex, seedRef.current));
    setStage('x');
    setLockedX(null);
    setDart(null);
    setHit(null);
    setBlocked(false);
    setChoices(null);
    sweepRef.current = 0;
    dirRef.current = 1;
    setPhase('aim');
  };

  useEffect(() => {
    if (phase === 'aim' && stage !== 'landed') runSweep();
    else stopSweep();
  }, [phase, stage, runSweep, stopSweep]);

  const resolveLanding = useCallback(async (x: number, y: number) => {
    const zonesNow = zones;
    const landed = resolveMapThrow(x, y, zonesNow);
    setDart({ x, y });
    setStage('landed');
    setHit(landed);

    const slot = DART_SLOTS[slotIdx ?? 0];
    const wcBlocked = topic === 'wc2026' && landed.kind === 'country' && !isWcNation(landed.country);
    setBlocked(wcBlocked);
    const pts = wcBlocked ? 0 : accuracyPoints(landed);
    setPoints(p => p + pts);
    if (!wcBlocked && ((landed.kind === 'zone' && !landed.zone.bad) || pts >= 40)) setSharpHits(h => h + 1);

    window.setTimeout(async () => {
      if (landed.kind === 'ocean' || wcBlocked) {
        setChoices(null); // renders the lifeboat / 40-rated trialist options
        setPhase('draft');
        return;
      }
      if (landed.kind === 'zone') {
        let c: DraftChoice[];
        switch (landed.zone.kind) {
          case 'legend':    c = legendChoices(slot, usedNames); break;
          case 'wonderkid': c = wonderkidChoices(topicPool, slot, usedNames); break;
          case 'mystery':   c = mysteryChoices(topicPool, slot, usedNames); break;
          case 'storm':     c = stormChoices(topicPool, slot, usedNames); break;
          case 'shark':     c = [{ player: oceanTrialist(slot, 'shark'), outOfPosition: false }]; break;
          default:          c = wildcardChoices(topicPool, slot, usedNames);
        }
        if (!c.length && landed.zone.kind !== 'shark') c = wildcardChoices(topicPool, slot, usedNames);
        setChoices(c.length ? c : [{ player: oceanTrialist(slot), outOfPosition: false }]);
        setPhase('draft');
        return;
      }
      setChoicesLoading(true);
      setPhase('draft');
      const c = await countryChoices(landed.country, slot, usedNames, { alltime: topic === 'alltime' });
      setChoices(c.length ? c : [{ player: oceanTrialist(slot), outOfPosition: false }]);
      setChoicesLoading(false);
    }, 850);
  }, [zones, slotIdx, topic, usedNames, topicPool]);

  const lockIn = useCallback(() => {
    if (phase !== 'aim') return;
    if (stage === 'x') {
      setLockedX(box.x + sweepRef.current * box.w);
      sweepRef.current = 0;
      dirRef.current = 1;
      setStage('y');
      return;
    }
    if (stage === 'y' && lockedX !== null) {
      const wob = box.w * 0.006;
      const x = Math.min(box.x + box.w, Math.max(box.x, lockedX + (Math.random() * 2 - 1) * wob));
      const y = Math.min(box.y + box.h, Math.max(box.y, box.y + sweepRef.current * box.h + (Math.random() * 2 - 1) * wob));
      stopSweep();
      resolveLanding(x, y);
    }
  }, [phase, stage, lockedX, box, resolveLanding, stopSweep]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); lockIn(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lockIn]);

  const pickPlayer = (choice: DraftChoice) => {
    if (slotIdx === null) return;
    const nextXi = [...xi];
    nextXi[slotIdx] = choice.player;
    const nextOop = [...oop];
    nextOop[slotIdx] = choice.outOfPosition;
    setXi(nextXi);
    setOop(nextOop);
    setUsedNames(prev => new Set(prev).add(choice.player.name));
    if (hit?.kind === 'country') setDraftedIsos(prev => new Set(prev).add(hit.country.iso));
    finishRound(nextXi, nextOop);
  };

  const takeTrialist = () => {
    if (slotIdx === null) return;
    const t = oceanTrialist(DART_SLOTS[slotIdx], blocked ? 'blocked' : 'ocean');
    const nextXi = [...xi];
    nextXi[slotIdx] = t;
    setXi(nextXi);
    finishRound(nextXi, oop);
  };

  const useLifeboat = () => {
    setLifeboatUsed(true);
    if (slotIdx !== null) beginThrow(slotIdx);
  };

  const finishRound = (nextXi: (Player | null)[], nextOop: boolean[]) => {
    setSlotIdx(null);
    if (nextXi.filter(Boolean).length >= XI_SIZE) {
      const machine = machineMapDraft(topicPool.length >= XI_SIZE ? topicPool : pool);
      setMachineXi(machine);
      setSeries(simulateSeries(adjustedXi(nextXi, nextOop), machine));
      setPhase('done');
    } else {
      setPhase('squad');
    }
  };

  /* ---------------- render helpers ---------------- */
  const graticules = useMemo(() => {
    const els: JSX.Element[] = [];
    for (let i = 1; i < 18; i++) {
      const x = (i * WORLD_W) / 18;
      els.push(<line key={`v${i}`} x1={x} y1={0} x2={x} y2={WORLD_H} stroke="hsl(210 45% 30% / 0.22)" strokeWidth={0.7} vectorEffect="non-scaling-stroke" />);
    }
    for (let j = 1; j < 9; j++) {
      const y = (j * WORLD_H) / 9;
      els.push(<line key={`h${j}`} x1={0} y1={y} x2={WORLD_W} y2={y} stroke="hsl(210 45% 30% / 0.22)" strokeWidth={0.7} vectorEffect="non-scaling-stroke" />);
    }
    return els;
  }, []);

  const countryEls = useMemo(
    () =>
      GEO_COUNTRIES.map(c => {
        const locked = topic === 'wc2026' && !isWcNation(c);
        const drafted = draftedIsos.has(c.iso);
        const isHit = hit?.kind === 'country' && hit.country.iso === c.iso;
        return (
          <path
            key={c.iso}
            d={pathOf(c)}
            fill={isHit ? (blocked ? 'hsl(0 60% 35%)' : 'hsl(45 90% 45%)') : countryFill(c, { locked, drafted })}
            stroke={isHit ? 'hsl(45 95% 70%)' : 'hsl(222 30% 8%)'}
            strokeWidth={isHit ? 1.6 : 0.55}
            vectorEffect="non-scaling-stroke"
          />
        );
      }),
    [topic, draftedIsos, hit, blocked],
  );

  const slotButton = (slot: (typeof DART_SLOTS)[number], i: number) => {
    const p = xi[i];
    return (
      <button
        key={`${slot.label}-${i}`}
        onClick={() => !p && phase === 'squad' && beginThrow(i)}
        disabled={!!p}
        style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
        className={cn(
          'absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border px-1.5 py-1 text-center transition-all',
          'min-w-[64px] max-w-[92px] sm:min-w-[76px]',
          p
            ? 'border-border bg-card/90 cursor-default'
            : 'border-primary bg-primary/15 hover:bg-primary/30 animate-pulse cursor-pointer',
        )}
      >
        <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-primary">{slot.label}</div>
        {p ? (
          <>
            <div className="text-[10px] sm:text-xs font-bold text-foreground leading-tight truncate">{p.name}</div>
            <div className="flex items-center justify-center gap-1 text-[9px] text-muted-foreground">
              <FlagImg name={p.nationality} size={12} />
              <span className={cn('font-bold', oop[i] ? 'text-orange-400' : p.fixedOverall ? 'text-muted-foreground' : 'text-gold')}>
                {shownRating(p, oop[i])}
              </span>
            </div>
          </>
        ) : (
          <div className="text-[10px] text-muted-foreground">throw</div>
        )}
      </button>
    );
  };

  const hitTitle = () => {
    if (!hit) return '';
    if (blocked && hit.kind === 'country') return `${hit.country.name} did not qualify for 2026`;
    if (hit.kind === 'zone') return `${hit.zone.emoji} ${hit.zone.label} ZONE`;
    if (hit.kind === 'country') return hit.country.name;
    return 'LOST AT SEA';
  };

  const zoneCaption =
    hit?.kind === 'zone'
      ? ({
          legend: 'All-time greats at your position. Pick one.',
          wonderkid: 'Under-21 gems only. The future is now.',
          wildcard: 'Free pick off the world top shelf.',
          mystery: 'Three names from anywhere in the pool. Pure gamble.',
          storm: 'Blown into the bargain bin. Best of the cheap seats.',
          shark: 'It ate your dart. A 40-rated trialist swims out instead.',
        } as Record<string, string>)[hit.zone.kind]
      : null;

  /* ---------------- page ---------------- */
  return (
    <>
      <PageSeo
        title="Dart Draft: World Map | DoUKnowBall"
        description="Throw timed darts at a real world map. Hit a country, draft one of its actual players for the position you called. Legend zones, wonderkid zones and continent rounds."
        path="/dart-draft"
      />
      <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, hsl(222 40% 7%) 0%, hsl(210 35% 9%) 55%, hsl(222 35% 6%) 100%)' }}>
        <GameNavbar />
        <main className="flex-1 flex flex-col items-center px-3 py-5 sm:py-8">
          <div className="w-full max-w-3xl mx-auto space-y-4 text-center">

            {phase === 'intro' && (
              <>
                <div className="flex items-center justify-center text-primary"><Target className="w-11 h-11 sm:w-14 sm:h-14" /></div>
                <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground">
                  Dart <span className="text-primary">Draft</span>
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
                  Call your position, then throw a timed dart at a real world map.
                  Whatever country you stick, you draft one of its actual pros. 11 throws, one XI, no take-backs.
                </p>
                <div className="grid sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
                  {MAP_TOPICS.map(t => (
                    <button
                      key={t.id}
                      onClick={() => start(t.id)}
                      className="rounded-xl border border-border bg-card/70 hover:border-primary hover:bg-card px-4 py-4 text-left transition-colors"
                    >
                      <div className="text-2xl">{t.emoji}</div>
                      <div className="font-bold text-foreground">{t.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{t.desc}</div>
                    </button>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground max-w-md mx-auto space-y-1">
                  <p>Gold rings pay out: 👑 legends, 💎 wonderkids, 🃏 free pick, 🎁 mystery gamble.</p>
                  <p>Red rings punish: 🦈 shark eats your dart, 🌪️ storm blows you into the bargain bin.</p>
                  <p>Ocean throws hand you a 40-rated trialist. One lifeboat re-throw per game.</p>
                  <p>Every nation fields a full squad. No pro at your position? Their academy kid steps up.</p>
                </div>
              </>
            )}

            {phase === 'loading' && (
              <div className="py-24"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" /></div>
            )}

            {phase === 'squad' && (
              <>
                <div className="flex items-center justify-center gap-3 text-xs sm:text-sm">
                  <span className="px-3 py-1 rounded-full bg-card/70 border border-border font-bold text-primary">
                    Throw {Math.min(throwIndex + 1, XI_SIZE)}/{XI_SIZE}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-card/70 border border-border text-muted-foreground">
                    Next map: <b className="text-foreground">{VIEW_LABEL[view]}</b>
                  </span>
                  <span className="px-3 py-1 rounded-full bg-card/70 border border-border text-muted-foreground">
                    XI <b className="text-gold">{userRating || '--'}</b>
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">Pick the position you throw for</h2>
                <div
                  className="relative w-full max-w-xl mx-auto rounded-2xl border border-border overflow-hidden"
                  style={{ aspectRatio: '3 / 4', background: 'linear-gradient(180deg, hsl(140 45% 16%) 0%, hsl(140 50% 12%) 100%)' }}
                >
                  <div className="absolute inset-x-0 top-1/2 h-px bg-white/15" />
                  <div className="absolute left-1/2 top-1/2 w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
                  {DART_SLOTS.map((s, i) => slotButton(s, i))}
                </div>
              </>
            )}

            {(phase === 'aim' || phase === 'draft') && slotIdx !== null && (
              <>
                <div className="flex items-center justify-center gap-2 text-xs sm:text-sm flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-primary/15 border border-primary/50 font-bold text-primary">
                    {DART_SLOTS[slotIdx].label} • Throw {Math.min(throwIndex + 1, XI_SIZE)}/{XI_SIZE}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-card/70 border border-border text-muted-foreground">{VIEW_LABEL[view]}</span>
                  <span className="px-3 py-1 rounded-full bg-card/70 border border-border text-muted-foreground">Accuracy <b className="text-gold">{points}</b></span>
                </div>

                <div className="relative w-full rounded-2xl border border-border overflow-hidden bg-[hsl(215,45%,10%)]">
                  <svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} className="w-full h-auto block select-none" onClick={lockIn}>
                    <defs>
                      <radialGradient id="dartOcean" cx="50%" cy="40%" r="80%">
                        <stop offset="0%" stopColor="hsl(211 58% 18%)" />
                        <stop offset="55%" stopColor="hsl(214 58% 13%)" />
                        <stop offset="100%" stopColor="hsl(219 60% 8%)" />
                      </radialGradient>
                    </defs>
                    <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="url(#dartOcean)" />
                    {graticules}
                    {countryEls}
                    {zones.map((z, i) => (
                      <g key={i} opacity={0.95}>
                        <circle
                          cx={z.x} cy={z.y} r={z.r}
                          fill={z.bad ? 'hsl(0 75% 50% / 0.12)' : 'hsl(45 90% 45% / 0.12)'}
                          stroke={z.bad ? 'hsl(0 80% 55%)' : 'hsl(45 90% 55%)'}
                          strokeWidth={1.4} strokeDasharray="4 3" vectorEffect="non-scaling-stroke"
                        />
                        <text x={z.x} y={z.y - z.r - 3} textAnchor="middle" fontSize={Math.max(8, z.r * 0.55)} fill={z.bad ? 'hsl(0 80% 65%)' : 'hsl(45 90% 65%)'} fontWeight={800}>
                          {z.emoji} {z.label}
                        </text>
                      </g>
                    ))}
                    {phase === 'aim' && stage === 'x' && (
                      <line x1={box.x + sweep * box.w} y1={box.y} x2={box.x + sweep * box.w} y2={box.y + box.h} stroke="hsl(0 85% 60%)" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
                    )}
                    {phase === 'aim' && stage === 'y' && lockedX !== null && (
                      <>
                        <line x1={lockedX} y1={box.y} x2={lockedX} y2={box.y + box.h} stroke="hsl(0 85% 60% / 0.5)" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
                        <line x1={box.x} y1={box.y + sweep * box.h} x2={box.x + box.w} y2={box.y + sweep * box.h} stroke="hsl(0 85% 60%)" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
                      </>
                    )}
                    {dart && (
                      <g>
                        <circle cx={dart.x} cy={dart.y} r={Math.max(3, box.w * 0.008)} fill="hsl(0 85% 55%)" stroke="white" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
                        <circle cx={dart.x} cy={dart.y} r={Math.max(7, box.w * 0.02)} fill="none" stroke="hsl(0 85% 55% / 0.6)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                      </g>
                    )}
                  </svg>
                </div>

                {phase === 'aim' && (
                  <div className="space-y-2">
                    <Button size="lg" className="text-lg px-10 py-6 font-black" onClick={lockIn}>
                      <Crosshair className="w-5 h-5 mr-2" />
                      {stage === 'x' ? 'LOCK LEFT-RIGHT' : 'THROW'}
                    </Button>
                    <p className="text-xs text-muted-foreground">Tap the map, the button, or press Space</p>
                  </div>
                )}

                {phase === 'draft' && (
                  <div className="space-y-3">
                    <h2 className="text-xl sm:text-2xl font-extrabold text-foreground flex items-center justify-center gap-2">
                      {hit?.kind === 'country' && !blocked && <FlagImg name={dbNamesFor(hit.country)[0]} size={26} />}
                      {hitTitle()}
                    </h2>
                    {zoneCaption && <p className="text-xs text-muted-foreground">{zoneCaption}</p>}

                    {choicesLoading && <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" />}

                    {!choicesLoading && choices && (
                      <div ref={revealRef} className="grid sm:grid-cols-2 gap-2 max-w-xl mx-auto">
                        {choices.map(({ player: p, outOfPosition }) => (
                          <button
                            key={p.name}
                            onClick={() => pickPlayer({ player: p, outOfPosition })}
                            className="rounded-xl border border-border bg-card/70 hover:border-primary hover:bg-card px-3 py-2.5 text-left transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-bold text-foreground truncate">{p.name}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {p.fixedOverall ? 'Unproven • takes the slot, no questions' : `${p.club} • ${p.position} • ${money(p.marketValue)}`}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className={cn('text-lg font-black', outOfPosition ? 'text-orange-400' : p.fixedOverall ? 'text-muted-foreground' : 'text-gold')}>
                                  {shownRating(p, outOfPosition)}
                                </div>
                                {outOfPosition && <div className="text-[9px] font-bold text-orange-400">OUT OF POSITION</div>}
                                {p.fixedOverall !== undefined && <div className="text-[9px] font-bold text-muted-foreground">FILLER</div>}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {!choicesLoading && !choices && (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">
                          {blocked
                            ? 'That nation is not at the 2026 World Cup, so the dart counts for nothing.'
                            : 'Straight into the water. The fish cannot play.'}
                        </p>
                        <div className="flex gap-3 justify-center">
                          {!lifeboatUsed && (
                            <Button onClick={useLifeboat} className="font-bold">
                              <LifeBuoy className="w-4 h-4 mr-2" /> Lifeboat re-throw
                            </Button>
                          )}
                          <Button variant="outline" onClick={takeTrialist} className="font-bold">
                            Take the 40-rated trialist
                          </Button>
                        </div>
                        {!lifeboatUsed && (
                          <p className="text-[11px] text-muted-foreground">One lifeboat per game. Spend it wisely.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {phase === 'done' && series && (
              <div className="space-y-4">
                <div className="flex items-center justify-center text-gold"><Trophy className="w-12 h-12" /></div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
                  Grade {squadGrade(userRating).grade} • XI {userRating}
                </h2>
                <p className="text-muted-foreground">{squadGrade(userRating).line}</p>
                <p className="text-sm font-bold text-foreground">{series.headline}</p>
                <div className="flex items-center justify-center gap-4 text-sm">
                  <span className="px-3 py-1.5 rounded-full bg-card/70 border border-border">Accuracy <b className="text-gold">{points}</b></span>
                  <span className="px-3 py-1.5 rounded-full bg-card/70 border border-border">Series {series.userWins}-{series.aiWins}</span>
                  <span className="px-3 py-1.5 rounded-full bg-card/70 border border-border">Total <b className="text-gold">{total}</b></span>
                </div>
                <div className="grid sm:grid-cols-2 gap-1.5 max-w-xl mx-auto text-left">
                  {DART_SLOTS.map((s, i) => {
                    const p = xi[i];
                    return (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-card/60 px-3 py-1.5">
                        <span className="text-xs font-black text-primary w-8">{s.label}</span>
                        {p ? (
                          <>
                            <span className="flex-1 min-w-0 truncate text-sm font-semibold text-foreground px-2 flex items-center gap-1.5">
                              <FlagImg name={p.nationality} size={14} />{p.name}
                            </span>
                            <span className={cn('text-sm font-black', oop[i] ? 'text-orange-400' : p.fixedOverall ? 'text-muted-foreground' : 'text-gold')}>
                              {shownRating(p, oop[i])}
                            </span>
                          </>
                        ) : (
                          <span className="flex-1 text-sm text-muted-foreground px-2">empty</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                  <Button size="lg" className="font-bold" onClick={() => setPhase('intro')}>
                    <RotateCcw className="w-4 h-4 mr-2" /> Throw again
                  </Button>
                  <ShareButtons
                    score={`XI ${userRating} (${squadGrade(userRating).grade})`}
                    gameName="Dart Draft"
                    gamePath="/dart-draft"
                    customText={`Dart Draft 🎯 XI ${userRating} (${squadGrade(userRating).grade}), accuracy ${points}, series ${series.userWins}-${series.aiWins}. Can you out-throw me? https://douknowball.com/dart-draft`}
                  />
                </div>
              </div>
            )}

          </div>
        </main>
        <GameSeoContent
          title="Dart Draft: throw darts at the world, draft who you hit"
          description="A timed crosshair sweeps a real world map. Lock left to right, then top to bottom, and the dart lands with a wobble. Hit France and you choose from the best French players at the position you called before the throw. Hit a tiny island and its academy kid steps up. Continent rounds zoom the map for precision throws, gold zones over the ocean pay out legends, wonderkids, free picks and mystery gambles, red zones bite back with sharks and storms, and after 11 throws your XI plays a three match series against The Machine. All-Time mode adds the legends of every nation to their squads."
          howToPlay={[
            'Pick a topic: every nation, the 48 at the 2026 World Cup, or All-Time with legends.',
            'Choose which position you are throwing for from your empty XI slots.',
            'Lock the sweeping line twice: once for left-right, once for up-down.',
            'Hit a country and pick from its real players at your position. No pro there? You get their academy kid.',
            'Gold zones pay legends, wonderkids, free picks and mystery gambles. Red zones are sharks and storms.',
            'Ocean throws hand you a 40-rated trialist, with one lifeboat re-throw per game.',
            'Fill all 11 slots, then your XI plays The Machine in a 3 match series.',
          ]}
        />
      </div>
    </>
  );
};

export default DartDraft;
