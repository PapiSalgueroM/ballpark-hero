import { useEffect, useRef, useState } from 'react';
import ConquestActionPlayer from './ConquestActionPlayer';
import { actionOf, basketballFrame, footballFrame, playPoints, type ActionKind, type ActionPlay } from './conquestActionFrames';

const ACTION_MS = 1100;
const OFFENSE = '#59d6bb';
const DEFENSE = '#ef9777';
const reducedPreference = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const LABELS: Record<ActionKind, string> = {
  pass: 'Pass complete', rush: 'Run', sack: 'Sack', interception: 'Intercepted', fumble: 'Fumble',
  field_goal: 'Field goal', punt: 'Punt', three: 'Three-point shot', drive: 'At the rim',
  and_one: 'Finish and foul shot', block: 'Rim block', strip: 'Stripped ball', free_throw: 'At the line', steal: 'Pass stolen', unknown: 'Play',
};

/** Presents only the latest already revealed play. It never advances the game. */
export default function ConquestActionScene({ sport, plays, active, attacker, defender }: {
  sport: 'nfl' | 'nba'; plays: ActionPlay[]; active: boolean; attacker: string; defender: string;
}) {
  const play = plays[plays.length - 1];
  const [reduced, setReduced] = useState(reducedPreference);
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
  const [frame, setFrame] = useState<{ play?: ActionPlay; progress: number }>({ play, progress: 0 });
  const completed = useRef<ActionPlay>();
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const motion = () => setReduced(!!media?.matches);
    const visibility = () => setHidden(document.hidden);
    media?.addEventListener('change', motion);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      media?.removeEventListener('change', motion);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  useEffect(() => {
    if (!play) return;
    if (!active || reduced || hidden || completed.current === play) {
      completed.current = play;
      setFrame({ play, progress: 1 });
      return;
    }
    let raf = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / ACTION_MS);
      setFrame({ play, progress });
      if (progress < 1) raf = requestAnimationFrame(tick);
      else completed.current = play;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [play, active, reduced, hidden]);

  const action = play ? actionOf(sport, play) : 'unknown';
  const points = play ? playPoints(play, plays[plays.length - 2]) : 0;
  const progress = !active || reduced || hidden || action === 'unknown' ? 1 : frame.play === play ? frame.progress : 0;
  const pose = sport === 'nfl' ? footballFrame(action, play?.yards ?? 0, points > 0, progress) : basketballFrame(action, points > 0, progress);
  const possession = play?.team === 'def' ? defender : attacker;
  const opposition = play?.team === 'def' ? attacker : defender;
  const offenseColor = play?.team === 'def' ? DEFENSE : OFFENSE;
  const defenseColor = play?.team === 'def' ? OFFENSE : DEFENSE;
  const outcome = sport === 'nfl'
    ? points >= 7 ? 'Touchdown' : action === 'field_goal' ? points > 0 ? 'Good' : 'No good' : action === 'interception' || action === 'fumble' ? 'Turnover' : `${play?.yards ?? 0} yards`
    : points > 0 ? `+${points} points` : action === 'three' || action === 'free_throw' ? 'Missed' : '';
  return <figure data-conquest-action-scene={sport} data-conquest-action={action} data-conquest-play={plays.length}
    data-conquest-points={points} data-conquest-progress={progress.toFixed(3)} data-conquest-motion={reduced || hidden ? 'static' : 'full'}
    className="overflow-hidden rounded-xl border border-border bg-card" aria-label={play ? `Play highlight: ${play.description}` : 'Waiting for the first play'}>
    <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-2 text-[10px]">
      <span className="min-w-0 truncate text-muted-foreground">{play ? `Highlight ${plays.length}` : 'Play preview'}</span>
      <span className="shrink-0 font-semibold text-foreground">{play ? LABELS[action] : sport === 'nfl' ? 'Kickoff next' : 'Tip-off next'}</span>
    </div>
    <svg viewBox="0 0 360 168" className="block w-full" aria-hidden="true" focusable="false">
      <rect width={360} height={168} fill={sport === 'nfl' ? '#163e35' : '#573f2c'} />
      {sport === 'nfl' ? <>
        <path d="M 0 48 H 360 M 0 154 H 360" stroke="#c4e7bf" strokeOpacity={0.5} strokeWidth={1.5} />
        {[40, 84, 128, 172, 216, 260, 304].map(x => <g key={x} stroke="#c4e7bf" strokeOpacity={0.3}>
          <path d={`M ${x} 49 V 153`} />
          <path d={`M ${x - 4} 68 h 8 M ${x - 4} 146 h 8`} strokeWidth={2} />
        </g>)}
        <rect x={306} y={49} width={54} height={104} fill="#bfe5c6" fillOpacity={0.07} />
        {(action === 'field_goal' || action === 'punt') && <path d="M 289 25 V 64 H 319 V 25 M 304 64 V 105" fill="none" stroke="#f2d281" strokeWidth={3} />}
      </> : <>
        <path d="M 12 151 H 348 V 32 H 12 Z M 238 151 V 43 H 321 V 151 M 238 103 C 187 103 187 151 238 151" fill="none" stroke="#f8d6aa" strokeWidth={1.5} strokeOpacity={0.6} />
        <path d="M 94 150 C 92 36 236 16 319 35" fill="none" stroke="#f8d6aa" strokeOpacity={0.4} strokeWidth={1.5} />
        <path d="M 302 42 V 80 M 302 51 H 294 V 62" fill="none" stroke="#e9e9d9" strokeWidth={3} />
        <path d="M 280 69 L 284 85 H 296 L 300 69 M 284 71 L 296 84 M 296 71 L 284 84" fill="none" stroke="#f6eee0" strokeWidth={1.2} opacity={0.8} />
      </>}
      <ConquestActionPlayer pose={pose.offense} color={offenseColor} football={sport === 'nfl'} side="offense" />
      {pose.receiver && <ConquestActionPlayer pose={pose.receiver} color={offenseColor} football={sport === 'nfl'} side="receiver" />}
      <ConquestActionPlayer pose={pose.defense} color={defenseColor} football={sport === 'nfl'} side="defense" />
      {play && <g data-conquest-ball transform={`translate(${pose.ball.x} ${pose.ball.y})`}>
        {sport === 'nfl' ? <g transform="rotate(-24)"><ellipse rx={6} ry={3.5} fill="#b57950" stroke="#f1d9b8" strokeWidth={0.9} /><path d="M -2 0 H 2 M 0 -1.7 V 1.7" stroke="#fff5e0" strokeWidth={0.8} /></g>
          : <><circle r={4.6} fill="#f9a144" stroke="#56391f" strokeWidth={0.9} /><path d="M -4.5 0 H 4.5 M 0 -4.5 Q -2 0 0 4.5" fill="none" stroke="#56391f" strokeWidth={0.7} /></>}
      </g>}
      {sport === 'nba' && <ellipse cx={290} cy={67} rx={11} ry={2} fill="none" stroke="#ef985f" strokeWidth={2.2} />}
    </svg>
    <figcaption className="flex min-w-0 items-center justify-between gap-2 px-3 py-2 text-[10px]">
      <span className="min-w-0 truncate text-muted-foreground"><span style={{ color: offenseColor }}>{possession}</span> vs <span style={{ color: defenseColor }}>{opposition}</span></span>
      <span className="shrink-0 font-bold text-foreground">{play ? outcome : ''}</span>
    </figcaption>
  </figure>;
}
