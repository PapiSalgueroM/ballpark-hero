import { memo, useEffect, useId, useRef, useState } from 'react';
import type { KickSetup, ShotResult } from '@/lib/freeKick';
import './SetPieceScene.css';

export interface SetPieceSceneProps {
  kick: KickSetup;
  result: ShotResult;
  /** Change only to replay the same committed shot. */
  replayKey?: string | number;
  motion?: 'auto' | 'static';
  className?: string;
}

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => 1 - Math.pow(1 - clamp(t), 3);

function project(result: ShotResult, t: number, wall = false) {
  const wallIndex = Math.round(result.path.length * .45);
  const index = wall ? t <= .45 ? t / .45 * wallIndex : wallIndex + (t - .45) / .55 * (result.path.length - 1 - wallIndex) : t * (result.path.length - 1);
  const a = result.path[Math.floor(index)];
  const b = result.path[Math.ceil(index)];
  const x = lerp(a.x, b.x, index % 1);
  const y = lerp(a.y, b.y, index % 1);
  const wallHeight = 333 - Math.max(0, y) * 160;
  const height = wall ? t <= .45
    ? lerp(432, wallHeight, t / .45) - Math.sin(t / .45 * Math.PI) * 10
    : lerp(wallHeight, 243 - y * 137, (t - .45) / .55)
    : lerp(432, 243 - y * 137, t) - Math.sin(t * Math.PI) * 45;
  return { x: 360 + x * 206 * t, y: height, r: lerp(9, 5, t) };
}

function Player({ x, y, scale, color, angle = 0, keeper = false, hands, reach = 0, foot, kind }: {
  x: number; y: number; scale: number; color: string; angle?: number; keeper?: boolean;
  hands?: { x: number; y: number }; reach?: number; foot?: { x: number; y: number }; kind?: string;
}) {
  const local = (point: { x: number; y: number }) => {
    const a = -angle * Math.PI / 180, dx = (point.x - x) / scale, dy = (point.y - y) / scale;
    return { x: dx * Math.cos(a) - dy * Math.sin(a), y: dx * Math.sin(a) + dy * Math.cos(a) };
  };
  const boot = foot ? local(foot) : { x: 16, y: -1 };
  return <g data-setpiece-player={kind} transform={`translate(${x} ${y}) scale(${scale}) rotate(${angle})`}>
    <ellipse cy="3" rx="15" ry="4" fill="#062a3550" />
    <path d={`M-7-26-9-13-14 0M7-26 Q${lerp(11, boot.x, .4)} ${lerp(-13, boot.y, .35)} ${boot.x} ${boot.y}`} fill="none" stroke="#182c44" strokeWidth="9" />
    <path d="M-14 0-18 1" stroke="#e4eef4" strokeWidth="5" />
    <path data-setpiece-boot d={`M${boot.x - 2.5} ${boot.y}h5`} stroke="#e4eef4" strokeWidth="5" />
    <path d="M0-42V-24" stroke={color} strokeWidth="21" />
    {[-1, 1].map(side => {
      const centre = hands ? local(hands) : null;
      const target = centre ? { x: centre.x + side * 4, y: centre.y } : { x: side < 0 ? -20 : 21, y: side < 0 ? -22 : -23 };
      const hand = { x: lerp(side < 0 ? -20 : 21, target.x, reach), y: lerp(side < 0 ? -22 : -23, target.y, reach) };
      const length = Math.hypot(hand.x - side * 10, hand.y + 43);
      if (keeper && length > 26) {
        hand.x = side * 10 + (hand.x - side * 10) * 26 / length;
        hand.y = -43 + (hand.y + 43) * 26 / length;
      }
      return <g key={side}>
        <path data-setpiece-arm d={`M${side * 10}-43 Q${lerp(side * 18, hand.x, .35)} ${lerp(-32, hand.y, .35)} ${hand.x} ${hand.y}`} fill="none" stroke={color} strokeWidth="7" />
        <circle data-setpiece-hand cx={hand.x} cy={hand.y} r="4" fill={keeper ? '#f7efd4' : '#a97458'} />
      </g>;
    })}
    <ellipse cy="-58" rx="8" ry="9" fill="#bb8569" />
    <ellipse cy="-62" rx="8" ry="4" fill="#263641" />
  </g>;
}

const Stadium = memo(function Stadium({ id }: { id: string }) {
  return <>
    <defs>
      <linearGradient id={`${id}-sky`} x2="0" y2="1"><stop stopColor="#122c47" /><stop offset="1" stopColor="#32627b" /></linearGradient>
      <linearGradient id={`${id}-grass`} x2="0" y2="1"><stop stopColor="#28746e" /><stop offset="1" stopColor="#164e56" /></linearGradient>
      <radialGradient id={`${id}-light`}><stop stopColor="#c8ecf7" stopOpacity=".14" /><stop offset="1" stopColor="#c8ecf7" stopOpacity="0" /></radialGradient>
      <radialGradient id={`${id}-shade`}><stop offset=".35" stopColor="#102c40" stopOpacity="0" /><stop offset="1" stopColor="#102c40" stopOpacity=".31" /></radialGradient>
    </defs>
    <path d="M0 0H720V260H0Z" fill={`url(#${id}-sky)`} />
    <path d="M0 91Q360 164 720 91V232H0Z" fill="#183a52" />
    {Array.from({ length: 7 }, (_, row) => Array.from({ length: 63 }, (_, col) => <ellipse key={`${row}-${col}`} cx={col * 12 + row % 2 * 4} cy={121 + row * 12 + Math.sin(col / 62 * Math.PI) * 17} rx="1.6" ry="2.1" fill={['#7694a6', '#b5af91', '#405c78', '#8babb4'][(row * 7 + col * 13) % 4]} />))}
    <path d="M0 203H720" stroke="#93aec342" strokeWidth="2" />
    <path d="M0 211H720V230H0Z" fill="#14384c" />
    {[47, 673].map(x => <g key={x}><path d={`M${x} 0V108`} stroke="#779db15c" strokeWidth="3" />{[-2, -1, 0, 1, 2].map(i => <ellipse key={i} cx={x + i * 9} cy="68" rx="3" ry="2" fill="#e2f4fa" />)}<ellipse cx={x} cy="75" rx="115" ry="115" fill={`url(#${id}-light)`} /></g>)}
    <path d="M0 230H720V490H0Z" fill={`url(#${id}-grass)`} />
    {Array.from({ length: 7 }, (_, i) => <rect key={i} y={230 + i * i * 5.6} width="720" height={(2 * i + 1) * 5.6} fill={i % 2 ? '#153f4016' : '#88bd9820'} />)}
    <path d="M112 244 20 354H700L608 244M0 244H720" fill="none" stroke="#bbd9c169" strokeWidth="2" />
    <path d="M212 244 190 277H530L508 244" fill="none" stroke="#bbd9c166" strokeWidth="1.5" />
    <ellipse cx="360" cy="434" rx="3" ry="1.6" fill="#d6e6d6" />
    <path d="M154 244 180 260H600L566 244Z" fill="#08293640" />
    <rect x="169" y="114" width="382" height="129" fill="#d8f0ff07" />
    {Array.from({ length: 24 }, (_, i) => <path key={i} d={`M${169 + i * 16} 114V243`} stroke="#cfe5ec30" strokeWidth=".7" />)}
    {Array.from({ length: 11 }, (_, i) => <path key={i} d={`M169 ${114 + i * 12}H551`} stroke="#cfe5ec30" strokeWidth=".7" />)}
    <path d="M154 243 169 229V114L154 106M566 243 551 229V114L566 106" fill="none" stroke="#c9e0e57a" strokeWidth="1.5" />
    <path d="M154 243V106H566V243" fill="none" stroke="#eef5ee" strokeWidth="4.5" />
    <path d="M155 108H565" stroke="#fff" strokeWidth="1.4" />
  </>;
});

/** Presentation only. The caller commits the shot before mounting this scene. */
export function SetPieceScene({ kick, result, replayKey, motion = 'auto', className = '' }: SetPieceSceneProps) {
  const id = useId().replace(/:/g, '');
  const [progress, setProgress] = useState(1);
  const [skipped, setSkipped] = useState(false);
  const stopReplay = useRef(() => {});
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let stopped = false;
    const stop = () => { stopped = true; cancelAnimationFrame(frame); setProgress(1); };
    stopReplay.current = stop;
    const onPreference = () => { if (preference.matches) stop(); };
    const onVisibility = () => { if (document.hidden) stop(); };
    setSkipped(false);
    if (motion === 'static' || preference.matches || document.hidden) { setProgress(1); return; }
    setProgress(0);
    const start = performance.now();
    const tick = (now: number) => {
      if (stopped) return;
      const next = clamp((now - start) / 2100);
      setProgress(next);
      if (next < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    preference.addEventListener('change', onPreference);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { stopped = true; cancelAnimationFrame(frame); preference.removeEventListener('change', onPreference); document.removeEventListener('visibilitychange', onVisibility); };
  }, [kick, result, replayKey, motion]);

  const final = skipped || progress === 1 || motion === 'static';
  const t = final ? 1 : clamp((progress - .19) / .64);
  const stopsShort = !result.onTarget && !result.hitWall && !result.hitPost && Math.abs(result.x) < 1 && result.y > 0 && result.y < 1;
  // A committed wall block ends at the engine's wall sample, before the goal.
  const flight = result.hitWall ? Math.min(t, .45) : stopsShort ? Math.min(t, .62) : t;
  const hasWall = kick.wallSize > 0;
  const ball = project(result, flight, hasWall);
  const wallContact = project(result, .45, true);
  const ground = hasWall ? flight <= .45 ? lerp(434, 335, flight / .45) : lerp(335, 246, (flight - .45) / .55) : lerp(434, 246, flight);
  if (stopsShort) ball.y = lerp(ball.y, ground - ball.r, ease((t - .3) / .4));
  const dive = ease((t - .12) / .85);
  const direction = result.keeperX >= 0 ? 1 : -1;
  const reach = result.saved ? ease((t - .65) / .32) : 0;
  const bodyReach = result.saved ? ease((t - .35) / .5) : 0;
  const catchPoint = project(result, 1, hasWall);
  // The dive follows the committed target, then a saved shot meets both gloves.
  const keeperX = lerp(lerp(360 + kick.keeperLean * 24, 360 + result.keeperX * 206, dive), catchPoint.x - direction * 44, bodyReach);
  const keeperY = lerp(lerp(244, 243 - result.keeperY * 137 + 25, dive), catchPoint.y + 29, bodyReach);
  const contact = t > .97;
  const netRipple = result.scored && !final ? Math.sin(clamp((progress - .83) / .17) * Math.PI) * 9 : 0;
  const trail = Array.from({ length: 49 }, (_, i) => i / 48).filter(n => n <= flight).map(n => { const p = project(result, n, hasWall); return `${p.x},${p.y}`; }).join(' ');
  const strike = final ? 1 : clamp(progress / .19);
  const wallCentre = 360 + (kick.keeperLean > 0 ? -.34 : .34) * 206 * .45;
  const wallStep = .32 * 206 * .45;
  const wallPlayer = Math.max(0, Math.min(kick.wallSize - 1, Math.round((wallContact.x - wallCentre) / wallStep + (kick.wallSize - 1) / 2)));
  const heading = result.scored ? 'Goal' : result.saved ? 'Saved' : result.hitWall ? 'Blocked' : result.hitPost ? 'Off the post' : 'Missed';
  return <section className={`set-piece-scene ${className}`} aria-label="Kick replay" data-motion={final ? 'static' : 'playing'}>
    <div className="set-piece-scene__stage">
      <div className="set-piece-scene__label">{kick.wallSize ? 'Free kick' : 'Penalty spot'}<span>{kick.distance} m, {kick.wallSize ? `${kick.wallSize} in the wall` : 'no wall'}</span></div>
      <svg viewBox="0 0 720 490" aria-hidden="true" focusable="false" strokeLinecap="round" strokeLinejoin="round">
        <Stadium id={id} />
        {netRipple > 0 && <g data-net-contact fill="none" stroke="#e3edf0" strokeOpacity=".35" strokeWidth="1">{[-16, 0, 16].map(offset => <path key={offset} d={`M${catchPoint.x + offset} ${catchPoint.y - 27}q${netRipple} 27 0 54M${catchPoint.x - 27} ${catchPoint.y + offset}q27 ${netRipple} 54 0`} />)}</g>}
        <Player kind="keeper" x={keeperX} y={keeperY} scale={.79} color="#f5b64f" angle={direction * dive * 60} keeper hands={result.saved ? catchPoint : undefined} reach={reach} />
        {Array.from({ length: kick.wallSize }, (_, i) => {
          const startX = wallCentre + (i - (kick.wallSize - 1) / 2) * wallStep;
          const blocks = result.hitWall && i === wallPlayer;
          const react = ease(t / .45);
          const x = blocks ? lerp(startX, wallContact.x, react) : startX;
          const jump = final ? 0 : Math.sin(clamp((t - .12) / .63) * Math.PI) * 3;
          const y = blocks ? lerp(333, Math.min(333, wallContact.y + 42), react) : 333 - jump;
          return <g key={i}><ellipse cx={startX} cy="335" rx="10" ry="3" fill="#062a3540" /><Player kind="wall" x={x} y={y} scale={.72} color="#d7e5ed" /></g>;
        })}
        <polyline points={trail} fill="none" stroke="#e6f1ca34" strokeWidth="3" />
        <Player kind="striker" x={324 + strike * 14} y={442} scale={.96} color="#84b7e1" angle={(-.11 + Math.sin(strike * Math.PI) * .1) * 180 / Math.PI}
          foot={{ x: lerp(337, 360, ease(strike)), y: lerp(442, 432, ease(strike)) - Math.sin(strike * Math.PI) * 8 }} />
        <ellipse cx={ball.x} cy={ground} rx={ball.r * 1.1} ry={ball.r * .35} fill="#061e3260" />
        {contact && result.scored && <circle cx={ball.x} cy={ball.y} r="15" fill="#f8efd81b" />}
        <g data-ball="true" transform={`translate(${ball.x} ${ball.y})`}><circle r={ball.r + 1} fill="#14354c" /><circle r={ball.r} fill="#fff4dc" /><ellipse cx={ball.r * .18} cy={-ball.r * .1} rx={ball.r * .34} ry={ball.r * .32} fill="#193f53" /><ellipse cx={-ball.r * .5} cy={ball.r * .3} rx={ball.r * .18} ry={ball.r * .2} fill="#416572" /></g>
        <path d="M0 0H720V490H0Z" fill={`url(#${id}-shade)`} />
      </svg>
    </div>
    <div className="set-piece-scene__result">
      <div role="status" aria-live="polite" aria-atomic="true"><strong>{heading}</strong><p>{result.verdict}</p></div>
      <button type="button" className="set-piece-scene__skip" disabled={final} onClick={() => { stopReplay.current(); setSkipped(true); }}>{final ? 'Result shown' : 'Show result'}</button>
    </div>
  </section>;
}
