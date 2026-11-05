import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import MiniPitch from '@/components/season-centre/MiniPitch';
import { MatchClock } from '@/components/season-centre/MatchClock';
import type { SeasonClock } from '@/components/season-centre/MatchClock';
import type { DerivedGame, SeasonEvent } from '@/lib/season/core';
import { PitchMotion } from '@/components/pitch-motion/PitchMotion';
import { ACTION_SPAN, BEAT_SPAN } from '@/components/pitch-motion/contract';
import type { PitchFigure, PitchInput, PitchSide } from '@/components/pitch-motion/contract';
import { pitchPlan, pitchScene } from '@/components/pitch-motion/scene';

type Mode = 'menu' | 'mini' | 'generic' | 'comparison';
type Trust = { label: string; trusted: boolean; at: number };
const BOX = 'relative isolate w-full overflow-hidden rounded-xl aspect-[25/12]';
function frozen<T>(value: T): T {
  if (value && typeof value === 'object') { Object.values(value).forEach(frozen); Object.freeze(value); }
  return value;
}
function figures(prefix: string): PitchFigure[] {
  return [
    { key: prefix + '0', name: prefix + ' keeper', line: 'keeper', slot: { x: 50, y: 90 } },
    ...[20, 40, 60, 80].map((x, i) => ({ key: prefix + (i + 1), name: prefix + ' back ' + i, line: 'defence' as const, slot: { x, y: 72 } })),
    ...[18, 39, 61, 82].map((x, i) => ({ key: prefix + (i + 5), name: prefix + ' middle ' + i, line: 'midfield' as const, slot: { x, y: 52 } })),
    { key: prefix + '9', name: prefix + ' striker', line: 'attack', slot: { x: 37, y: 27 } },
    { key: prefix + '10', name: prefix + ' second striker', line: 'attack', slot: { x: 65, y: 29 } },
  ];
}
function Fixture() {
  const reduced = useMemo(() => matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const colors = useMemo(() => frozen({ mine: '#79baff', theirs: '#edb073' }), []);
  const theme = new URL(location.href).searchParams.get('theme');
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.classList.toggle('light', theme !== 'dark');
  const [mode, setMode] = useState<Mode>('menu'), [side, setSide] = useState<PitchSide>('me');
  const [paused, setPaused] = useState(false), [serial, setSerial] = useState(0), [ended, setEnded] = useState(false);
  const [elapsed, setElapsed] = useState(0), [buildRight, setBuildRight] = useState(false);
  const trusted = useRef<Trust[]>([]), moments = useRef<{ moment: string; minute: number | null; side: string | null }[]>([]);
  const committed = useRef<unknown>(null);
  const stable = useMemo(() => {
    const usEvents: SeasonEvent[] = [{ min: 10, kind: 'goal', side: 'us', pts: 1, mine: true }];
    const themEvents: SeasonEvent[] = [{ min: 10, kind: 'goal', side: 'them', pts: 1 }];
    const mine = figures('home'), theirs = figures('away');
    const plain: PitchInput = { mine, theirs, feed: [], span: { from: 0, to: 30 }, possession: 0.63, seed: 1521 };
    const goals = (goalSide: PitchSide): PitchInput => ({ ...plain,
      feed: [{ minute: 10, side: goalSide, kind: 'goal', text: goalSide === 'me' ? 'home striker' : 'away striker', flank: 'left', freeKick: true }],
      build: { me: 0.4, opp: -0.2 } });
    const value = frozen({ usEvents, themEvents, plain, me: goals('me'), opp: goals('opp'), left: { me: -1, opp: 1 }, right: { me: 1, opp: -1 } });
    return { value, before: JSON.stringify(value) };
  }, []);
  const events = side === 'me' ? stable.value.usEvents : stable.value.themEvents;
  const game: DerivedGame = useMemo(() => ({ md: 1, opp: 1, home: true, us: side === 'me' ? 1 : 0, them: side === 'opp' ? 1 : 0,
    fixed: true, played: true, started: true, onAt: 1, line: {}, events }), [events, side]);
  const clock: SeasonClock = useMemo(() => ({ length: 90, label: min => min + "'", words: e => e.side === 'us' ? 'Home side scores.' : 'Away side scores.' }), []);
  const source = side === 'me' ? stable.value.me : stable.value.opp;
  const goalPlan = useMemo(() => pitchPlan(source), [source]);
  const at = goalPlan.actions[0].at;
  const comparison = useMemo(() => {
    const inputs = [stable.value.plain, { ...stable.value.plain, build: stable.value.left }, { ...stable.value.plain, build: stable.value.right }];
    const plans = inputs.map(input => pitchPlan(input));
    for (let i = 1; i < 78; i++) {
      const time = (i + 0.5) * BEAT_SPAN, scenes = plans.map(plan => pitchScene(plan, time));
      const apart = (a: typeof scenes[0], b: typeof scenes[0]) => Math.hypot(a.ball.x - b.ball.x, a.ball.y - b.ball.y) > 1
        && [...a.theirs, ...a.mine].some((p, n) => Math.hypot(p.x - [...b.theirs, ...b.mine][n].x, p.y - [...b.theirs, ...b.mine][n].y) > 1);
      if (apart(scenes[0], scenes[1]) && apart(scenes[1], scenes[2])) return { clock: time, scenes };
    }
    throw new Error('PITCH_STYLED_REAL_DISTINCT_BUILD_WITNESS_REQUIRED');
  }, [stable]);
  // This binder supplies only a native clock. The actual generic component owns no timer.
  useEffect(() => {
    if (mode !== 'generic' || paused || reduced || ended) return;
    let raf = 0, before = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(100, now - before) / 1000; before = now;
      if (!document.hidden) setElapsed(value => Math.min(ACTION_SPAN - 1e-8, value + dt));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, paused, reduced, ended, serial]);
  useEffect(() => { if (mode === 'generic' && elapsed >= ACTION_SPAN - 1e-8) setEnded(true); }, [mode, elapsed]);
  useLayoutEffect(() => {
    const actualScene = comparison.scenes[buildRight ? 2 : 1];
    committed.current = { mode, side, paused, reduced, ended, serial, elapsed, at, theme,
      inputsBefore: stable.before, inputsAfter: JSON.stringify(stable.value), trusted: trusted.current.slice(), moments: moments.current.slice(),
      comparison: { clock: comparison.clock, right: buildRight, expected: { ball: actualScene.ball,
        figures: [...actualScene.theirs.map(p => ({ side: 'opp', x: p.x, y: p.y })), ...actualScene.mine.map(p => ({ side: 'me', x: p.x, y: p.y }))] } } };
  });
  useEffect(() => {
    const read = () => ({ ...(committed.current as Record<string, unknown>), trusted: trusted.current.slice(), moments: moments.current.slice() });
    Object.defineProperty(window, '__PITCH_FLIGHT_FIXTURE__', { value: { read }, configurable: true });
    return () => { delete (window as Window & { __PITCH_FLIGHT_FIXTURE__?: unknown }).__PITCH_FLIGHT_FIXTURE__; };
  }, []);
  function record(label: string, event: MouseEvent<HTMLButtonElement>) { trusted.current.push({ label, trusted: event.nativeEvent.isTrusted, at: performance.now() }); }
  function start(next: Mode, nextSide: PitchSide, event: MouseEvent<HTMLButtonElement>) {
    record(next + '-' + nextSide, event); setMode(next); setSide(nextSide); setPaused(false); setEnded(false); setElapsed(0); setBuildRight(false); setSerial(value => value + 1); moments.current = [];
  }
  return <main className="mx-auto w-full max-w-xl space-y-2 p-2 text-foreground" data-pitch-fixture>
    <h1 className="text-base font-bold">Pitch flight component fixture</h1>
    <p className="text-xs text-muted-foreground">Fictional committed feeds, actual components and styles. This is an isolated presentation check, not a full career route or a new live caller.</p>
    {mode === 'menu' ? <div className="grid grid-cols-2 gap-2">
      <button onClick={e => start('mini', 'me', e)}>Mini home goal</button><button onClick={e => start('mini', 'opp', e)}>Mini away goal</button>
      <button onClick={e => start('generic', 'me', e)}>Generic home goal</button><button onClick={e => start('generic', 'opp', e)}>Generic away goal</button>
      <button className="col-span-2" onClick={e => start('comparison', 'me', e)}>Still build comparison</button>
    </div> : <>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={e => { record('back', e); setMode('menu'); }}>Back to fixtures</button>
        {mode !== 'comparison' && <button onClick={e => { record(paused ? 'resume' : 'pause', e); setPaused(value => !value); }} disabled={reduced || ended}>{paused ? 'Resume flight' : 'Pause flight'}</button>}
        {mode === 'comparison' && <button disabled={buildRight} onClick={e => { record('change-only-build', e); setBuildRight(true); }}>Change only build</button>}
      </div>
      <h2 className="text-sm font-bold">{mode === 'mini' ? 'Career mini pitch' : mode === 'generic' ? 'Generic pitch' : 'Still plan comparison'}: {side === 'me' ? 'home goal' : 'away goal'}</h2>
      {mode === 'mini' && <div data-fixture-stage="mini"><MatchClock key={serial} game={game} clock={clock} usName="Home side" themName="Away side" speed={1} paused={paused} reduced={reduced}
        onFullTime={() => setEnded(true)}
        stage={state => <MiniPitch md={1} events={events} shown={state.shown} paused={state.paused} instant={state.instant}
          usColor="#79baff" role="ATT" onFrom={1} onTo={90} boxClass={BOX} />} /></div>}
      {mode === 'generic' && <div data-fixture-stage="generic"><PitchMotion key={serial} {...source} colors={colors}
        clock={at + elapsed} playing={!paused} orientation="landscape" onMoment={(moment, event) => moments.current.push({ moment, minute: event?.minute ?? null, side: event?.side ?? null })} /></div>}
      {mode === 'comparison' && <div data-fixture-stage="comparison"><p className="text-xs">Still-form API comparison, with the clock and every input except build held.</p>
        <PitchMotion {...stable.value.plain} build={buildRight ? stable.value.right : stable.value.left} colors={colors}
          clock={comparison.clock} playing reducedMotion orientation="landscape" /></div>}
    </>}
  </main>;
}
const style = document.createElement('style');
style.textContent = '[data-pitch-fixture] button{min-height:44px;min-width:44px;border:1px solid hsl(var(--border));border-radius:8px;padding:4px 8px;font-size:12px;font-weight:700;background:hsl(var(--card));color:hsl(var(--foreground))}[data-pitch-fixture] button:disabled{opacity:.5}';
document.head.append(style);
createRoot(document.getElementById('root')!).render(<Fixture />);
