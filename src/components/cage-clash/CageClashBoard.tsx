import { useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import { CAGE_TICK_MS, canCageAction, cageActionLabel, type CageAction, type CageFighter, type CageStyle } from '@/lib/cageClash';
import { useCageClash, type CageControl } from '@/hooks/useCageClash';
import { CAGE_DRILLS, canCagePracticeAction, nextCageDrill, type CageDrill } from '@/lib/cagePractice';
import { CAGE_CIRCUIT_STYLES, isCageCircuitComplete } from '@/lib/cageCircuit';
import { CageClashCanvas } from './CageClashCanvas';
import { CageFightStats } from './CageFightStats';

const button = 'min-h-11 rounded-lg border border-border bg-background px-2 text-xs font-bold transition-colors hover:bg-muted active:bg-amber-400/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:cursor-not-allowed disabled:opacity-40';
const actions: { action: CageAction; key: string }[] = [{ action: 'jab', key: 'J' }, { action: 'power', key: 'K' }, { action: 'kick', key: 'L' }, { action: 'grapple', key: 'U' }, { action: 'submit', key: 'I' }, { action: 'escape', key: 'O' }];

function FighterHud({ fighter, side, practice = false }: { fighter: CageFighter; side: 'player' | 'cpu'; practice?: boolean }) {
  const player = side === 'player';
  const label = player ? 'You' : practice ? 'Partner' : 'CPU';
  return <div data-cage-fighter={side} data-x={fighter.x} data-health={fighter.health} data-stamina={fighter.stamina} data-submission={fighter.submission} data-hits={fighter.hits} data-damage-dealt={fighter.damageDealt} data-blocked={fighter.blocked} data-takedowns={fighter.takedowns} data-control-ticks={fighter.controlTicks} data-action={fighter.action} data-action-ticks={fighter.actionTicks} className="min-w-0 space-y-1">
    <div className="flex justify-between gap-1 text-[10px] font-bold uppercase tracking-wider"><span className={player ? 'text-blue-600 dark:text-blue-300' : 'text-red-600 dark:text-red-300'}>{label} <span className="hidden min-[380px]:inline font-normal text-muted-foreground">{fighter.style}</span></span><span aria-label={`${player ? 'Your' : label} health`}>{Math.ceil(fighter.health)} HP</span></div>
    <div role="meter" aria-label={`${player ? 'Your' : label} health`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fighter.health)} className="h-2.5 overflow-hidden rounded-sm bg-muted"><div className={player ? 'h-full bg-blue-500' : 'h-full bg-red-400'} style={{ width: `${Math.max(0, fighter.health)}%` }} /></div>
    <div className="flex items-center gap-1.5"><span className="text-[9px] font-semibold text-muted-foreground">GAS</span><div role="meter" aria-label={`${player ? 'Your' : label} stamina`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(fighter.stamina)} className="h-1.5 flex-1 overflow-hidden rounded-sm bg-muted"><div className="h-full bg-amber-500" style={{ width: `${Math.max(0, fighter.stamina)}%` }} /></div><span className="w-5 text-right text-[9px] tabular-nums">{Math.floor(fighter.stamina)}</span></div>
  </div>;
}

export function CageClashBoard({ onHelp, helpOpen }: { onHelp: () => void; helpOpen: boolean }) {
  const boardRef = useRef<HTMLElement>(null);
  const statsOpener = useRef<HTMLButtonElement | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const game = useCageClash(helpOpen);
  const [style, setStyle] = useState<CageStyle>('balanced');
  const [opponent, setOpponent] = useState<CageStyle>('balanced');
  const [mode, setMode] = useState<'quick' | 'practice' | 'circuit'>('quick');
  const [drill, setDrill] = useState<CageDrill>('striking');
  const { fight, paused, practice, circuit } = game;
  const circuitDone = circuit ? isCageCircuitComplete(circuit) : false;
  const lesson = CAGE_DRILLS.find(item => item.id === (practice?.drill ?? drill))!;
  const focusArena = () => boardRef.current?.querySelector('canvas')?.focus({ preventScroll: true });
  const closeStats = () => { setStatsOpen(false); requestAnimationFrame(() => statsOpener.current?.focus({ preventScroll: true })); };
  const statsButton = <button ref={statsOpener} type="button" className="min-h-11 rounded-lg border border-slate-500 bg-slate-800 px-3 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" onClick={() => setStatsOpen(true)}>Fight stats</button>;
  const resumeFight = () => { game.resume(); focusArena(); };
  const running = fight?.phase === 'fight' && !practice?.complete && !paused && !helpOpen;
  const pointerDown = (event: PointerEvent<HTMLButtonElement>, control: CageControl) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    game.press(`pointer:${event.pointerId}`, control);
  };
  const controlProps = (control: CageControl) => ({
    'data-cage-control': control,
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => pointerDown(event, control),
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => game.release(`pointer:${event.pointerId}`),
    onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => game.release(`pointer:${event.pointerId}`),
    onLostPointerCapture: (event: PointerEvent<HTMLButtonElement>) => game.release(`pointer:${event.pointerId}`),
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); game.press(`button:${control}`, control); }
    },
    onKeyUp: (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); game.release(`button:${control}`); }
    },
    onBlur: () => game.release(`button:${control}`),
    onClick: (event: MouseEvent<HTMLButtonElement>) => {
      if (event.detail === 0 && actions.some(item => item.action === control)) game.tap(control as CageAction);
    },
    style: { touchAction: 'none' as const, userSelect: 'none' as const },
  });
  const position = fight?.position === 'ground' ? `${fight.top === 'player' ? 'You on top' : 'You underneath'} · ${['Guard', 'Half guard', 'Mount'][fight.groundLevel]}` : fight?.position === 'clinch' ? 'Clinch · takedown range' : 'Standing';
  const tip = fight?.position === 'ground'
    ? fight.top === 'player' ? fight.player.posture ? 'Lower posture to submit. Pass to improve your position.' : 'Posture for heavy shots. Pass to improve your submission.' : 'Guard, regain guard or sweep. Escape when you have gas.'
    : fight?.position === 'clinch' ? 'Grapple again for a takedown. Escape to separate.' : 'Release attacks to recover. Guard incoming shots.';

  return <section ref={boardRef} aria-label="Cage Clash game" data-cage-screen={!fight ? 'setup' : fight.phase} data-cage-phase={fight?.phase ?? 'setup'} data-cage-drill={practice?.drill ?? 'none'} data-cage-practice-complete={practice?.complete ? 'true' : 'false'} data-cage-circuit-stage={circuit?.stage ?? 'none'} data-cage-circuit-complete={circuitDone ? 'true' : 'false'} data-cage-fight-score={fight?.result?.score ?? 0} data-cage-winner={fight?.result?.winner ?? 'none'} data-cage-circuit-score={circuit ? game.finalScore : 0} data-cage-position={fight?.position ?? 'standing'} data-cage-top={fight?.top ?? 'none'} data-cage-tick={fight?.tick ?? 0} data-cage-tick-ms={CAGE_TICK_MS} data-cage-paused={paused || helpOpen ? 'true' : 'false'} className="mx-auto w-full max-w-[560px] space-y-2 rounded-xl border border-border bg-card p-2 text-card-foreground shadow-sm sm:p-3">
    <div className="flex min-h-11 items-center justify-between gap-2">
      <p className="text-xs font-black uppercase tracking-[0.14em]">{!fight ? 'Your corner' : practice ? `Drill ${CAGE_DRILLS.indexOf(lesson) + 1} / 4` : circuit ? `Fight ${circuit.stage + 1} / 3` : `Round ${fight.round} / 3`}<span className={`${circuit ? 'block' : 'ml-2'} text-[10px] font-normal tracking-normal text-muted-foreground`}>{fight ? practice ? 'No points' : circuit ? `Round ${fight.round} / 3` : '45s rounds' : ''}</span></p>
      <div className="flex gap-1">
        {!fight && <select aria-label="Mode" className="min-h-11 w-28 rounded-lg border border-border bg-background px-1 text-xs font-bold" value={mode} onChange={event => setMode(event.target.value as typeof mode)}><option value="quick">Quick fight</option><option value="practice">Practice</option><option value="circuit">Circuit</option></select>}
        {fight?.phase === 'fight' && !practice?.complete && <button type="button" className={`${button} min-w-16`} onClick={paused ? resumeFight : game.pause}>{paused ? 'Resume' : 'Pause'}</button>}
        <button type="button" className={`${button} w-11 text-base`} aria-label="How to play Cage Clash" onClick={() => { game.pause(); onHelp(); }}>?</button>
      </div>
    </div>
    {(circuit || (!fight && mode === 'circuit')) && <ol aria-label="Circuit opponents" className="grid grid-cols-3 gap-1 text-center text-[10px]">
      {CAGE_CIRCUIT_STYLES.map((opponentStyle, index) => {
        const result = circuit?.results[index];
        const current = index === (circuit?.stage ?? 0);
        return <li key={opponentStyle} data-cage-circuit-opponent={index} data-cage-circuit-result={result?.winner ?? 'pending'} aria-current={current ? 'step' : undefined} className={`rounded-md border px-1 py-1 ${result?.winner === 'player' ? 'border-primary/50 bg-primary/10' : result ? 'border-red-400/50 bg-red-400/10' : current ? 'border-amber-500/50 bg-amber-500/10' : 'border-border'}`}><span className="block font-bold capitalize">{index + 1}. {opponentStyle}</span><span className="text-[9px] text-muted-foreground">{result ? result.winner === 'player' ? 'Won' : result.winner === 'draw' ? 'Draw' : 'Lost' : current ? fight ? 'In cage' : 'Up first' : 'Waiting'}</span></li>;
      })}
    </ol>}
    {fight && <div className="grid grid-cols-[1fr_52px_1fr] items-center gap-2">
      <FighterHud fighter={fight.player} side="player" />
      <div className="text-center"><div aria-label={practice ? 'Untimed practice' : 'Round time remaining'} className="font-mono text-xl font-black tabular-nums">{practice ? '∞' : Math.ceil(fight.remainingTicks / 20).toString().padStart(2, '0')}</div><div className="text-[9px] font-bold uppercase text-muted-foreground">{practice ? 'practice' : 'seconds'}</div></div>
      <FighterHud fighter={fight.cpu} side="cpu" practice={Boolean(practice)} />
    </div>}
    <div className={`relative mx-auto ${statsOpen ? 'min-h-56' : ''} ${practice || circuit || mode !== 'quick' ? 'max-w-[min(480px,34vh)]' : 'max-w-[min(480px,42vh)]'}`}>
      <CageClashCanvas fightRef={game.fightRef} drawRef={game.drawRef} />
      {paused && fight?.phase === 'fight' && !practice?.complete && <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-slate-950/80 text-white"><p className="text-xl font-black uppercase tracking-widest">Paused</p><p className="text-xs">Take a breath. {practice ? 'Your drill' : 'Your fight'} is waiting.</p><div className="flex gap-2"><button type="button" className="min-h-11 rounded-lg bg-amber-400 px-3 text-xs font-bold text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" disabled={helpOpen} onClick={resumeFight}>{practice ? 'Resume drill' : 'Resume fight'}</button><button type="button" className="min-h-11 rounded-lg border border-slate-500 bg-slate-800 px-3 text-xs font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" disabled={helpOpen} onClick={game.reset}>{practice ? 'Leave drill' : circuit ? 'Leave circuit' : 'Leave fight'}</button></div></div>}
      {practice && (practice.complete || fight?.phase === 'finished') && <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-slate-950/85 px-3 text-center text-white">
        <p className="text-xl font-black">{practice.complete ? 'Drill complete' : 'Try again'}</p>
        <p className="text-xs">{lesson.title} · No points awarded</p>
        <div className="flex gap-2">
          <button type="button" className="min-h-11 rounded-lg border border-slate-500 bg-slate-800 px-3 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" onClick={() => { game.startPractice(practice.drill, fight!.player.style); focusArena(); }}>Retry drill</button>
          {practice.complete && <button type="button" className="min-h-11 rounded-lg bg-amber-400 px-3 text-xs font-bold text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" onClick={() => { if (nextCageDrill(practice.drill)) game.nextDrill(); else { game.reset(); setMode('quick'); } focusArena(); }}>{nextCageDrill(practice.drill) ? 'Next drill' : 'Start a fight'}</button>}
        </div>
      </div>}
      {fight?.phase === 'break' && <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-slate-950/85 px-3 text-center text-white"><p className="text-lg font-black uppercase tracking-widest">Back to your corner</p><p className="text-xs">Round points: {fight.roundCards[fight.roundCards.length - 1]?.player ?? 0} to {fight.roundCards[fight.roundCards.length - 1]?.cpu ?? 0}</p><button type="button" className="min-h-11 rounded-lg bg-amber-400 px-5 text-sm font-bold text-slate-950" onClick={() => { game.nextRound(); focusArena(); }}>Next round</button></div>}
      {!practice && !circuit && fight?.phase === 'finished' && fight.result && <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-lg bg-slate-950/85 px-3 text-center text-white">{statsOpen ? <CageFightStats fight={fight} onBack={closeStats} /> : <><p className="text-2xl font-black uppercase tracking-wider">{fight.result.winner === 'player' ? 'You win' : fight.result.winner === 'draw' ? 'Draw' : 'CPU wins'}</p><p className="text-sm text-amber-300">{fight.result.method} · <strong>{game.finalScore}/100</strong></p><div className="mt-1 flex gap-2"><button type="button" className="min-h-11 rounded-lg bg-amber-400 px-4 text-sm font-bold text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" onClick={game.reset}>Rematch</button>{statsButton}</div></>}</div>}
      {circuit && fight?.phase === 'finished' && fight.result && <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-lg bg-slate-950/85 px-3 text-center text-white">
        {statsOpen ? <CageFightStats fight={fight} onBack={closeStats} /> : <><p className="text-xl font-black">{circuitDone ? fight.result.winner === 'player' ? 'Circuit cleared' : fight.result.winner === 'draw' ? 'Run drawn' : 'Run ended' : 'Fight won'}</p>
        <p className="text-xs text-amber-300">{fight.result.method} · {circuitDone ? 'Run' : 'Fight'} score <strong>{circuitDone ? game.finalScore : fight.result.score}/100</strong></p>
        <div className="mt-1 flex gap-2"><button type="button" className="min-h-11 rounded-lg bg-amber-400 px-3 text-xs font-bold text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" onClick={() => { if (circuitDone) game.reset(); else game.nextCircuitFight(); focusArena(); }}>{circuitDone ? 'New circuit' : 'Next opponent'}</button>{statsButton}</div></>}
      </div>}
    </div>
    {!fight ? <>
      <div className="grid grid-cols-2 gap-2">
        {([{ title: 'Your style', value: style, change: setStyle }, ...(mode === 'quick' ? [{ title: 'Opponent style', value: opponent, change: setOpponent }] : [])]).map(({ title, value, change }) => <label key={title} className="space-y-1 text-[11px] font-bold">{title}<select aria-label={title} className="block min-h-11 w-full rounded-lg border border-border bg-background px-2 text-xs" value={value} onChange={event => change(event.target.value as CageStyle)}><option value="balanced">Balanced</option><option value="striker">Striker</option><option value="grappler">Grappler</option></select></label>)}
        {mode === 'practice' && <label className="space-y-1 text-[11px] font-bold">Practice drill<select aria-label="Practice drill" className="block min-h-11 w-full rounded-lg border border-border bg-background px-2 text-xs" value={drill} onChange={event => setDrill(event.target.value as CageDrill)}>{CAGE_DRILLS.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">{mode === 'practice' ? 'Untimed, no points. Your partner waits while you learn the same range, stamina and ground rules used in a fight.' : mode === 'circuit' ? 'Win all three fights. A loss or draw ends your run. Fresh health and gas for each opponent. Your run score is the sum of fight scores divided by three; unplayed fights count as zero. Quitting earns nothing.' : 'Win by KO, submission or points over three 45-second rounds. Strikers hit harder; grapplers control the mat. Low gas makes attacks weaker.'}</p>
      <p className="rounded-lg bg-muted px-2 py-1.5 text-[11px] leading-relaxed"><strong>{mode === 'practice' ? lesson.objective : 'Try this:'}</strong> {mode === 'practice' ? lesson.example : mode === 'circuit' ? 'beat the balanced opponent, then use Next opponent to face the striker. Adapt on the mat against the grappler. Fight scores of 80, 90 and 85 make a run score of 85/100.' : 'move close, jab, then release to recover. Guard incoming shots. Grapple to clinch, grapple again to take down, then pass and hold Submit.'}</p>
      <button type="button" data-cage-start className="min-h-11 w-full rounded-lg bg-amber-400 text-sm font-black text-slate-950 hover:bg-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500" onClick={() => { if (mode === 'practice') game.startPractice(drill, style); else if (mode === 'circuit') game.startCircuit(style); else game.start(style, opponent); focusArena(); }}>{mode === 'practice' ? 'Start drill' : mode === 'circuit' ? 'Start circuit' : 'Fight'}</button>
    </> : <>
      <div className="flex items-center justify-between gap-2 text-[10px] font-bold"><span data-cage-status>{position}</span><span className="text-muted-foreground" aria-label="Submission progress">Sub: you {Math.round(fight.player.submission)}% · CPU {Math.round(fight.cpu.submission)}%</span></div>
      <p role="status" aria-live="polite" className="min-h-4 text-[11px] font-medium">{practice ? practice.drill === 'striking' ? `Shots ${Math.min(3, fight.player.hits)}/3 · Gas ${Math.floor(fight.player.stamina)}/100. ${fight.player.hits >= 3 ? 'Release every control to reach 90 gas.' : lesson.objective}` : lesson.objective : fight.message || tip}</p>
      {fight.phase === 'fight' && !practice?.complete && <div className="space-y-1.5">
        <div className="grid grid-cols-3 gap-1.5">
          <button type="button" {...controlProps('left')} disabled={!running || fight.position !== 'standing'} className={button} aria-label="Move left">◀ <span className="ml-1">Move</span><span className="ml-1 text-[9px] text-muted-foreground">A</span></button>
          <button type="button" {...controlProps('guard')} disabled={!running} className={`${button} border-amber-500/50`} aria-label="Guard">Guard <span className="text-[9px] text-muted-foreground">Space</span></button>
          <button type="button" {...controlProps('right')} disabled={!running || fight.position !== 'standing'} className={button} aria-label="Move right"><span>Move</span><span className="mx-1 text-[9px] text-muted-foreground">D</span> ▶</button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {actions.map(({ action, key }) => <button type="button" key={action} {...controlProps(action)} disabled={!running || !canCageAction(fight, action) || Boolean(practice && !canCagePracticeAction(practice, action))} className={`${button} ${action === 'grapple' || action === 'submit' ? 'border-blue-400/50 bg-blue-500/5' : ''}`} aria-label={cageActionLabel(fight, action)}>{cageActionLabel(fight, action)} <span className="text-[9px] text-muted-foreground">{key}</span></button>)}
        </div>
        <p className="text-[10px] leading-tight text-muted-foreground">{practice ? 'Only this drill’s moves are active. Release every control to recover gas. P pauses.' : `${tip} Hold buttons or keys. P pauses.`}</p>
      </div>}
      {!practice && fight.phase === 'finished' && <p role="status" className="text-center text-xs text-muted-foreground">Damage {Math.round(fight.player.damageDealt)} · Blocks {fight.player.blocked} · Takedowns {fight.player.takedowns}</p>}
    </>}
  </section>;
}

export default CageClashBoard;
