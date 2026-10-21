import { useId } from 'react';
import { TACTICS, type BoutResult, type ConditionPoint, type RoundLog, type Tactic } from '@/lib/fightCareer';

interface FightRingProps {
  round: RoundLog | null;
  condition: ConditionPoint;
  finished: Pick<BoutResult, 'method' | 'winner'> | null;
}

type Pose = 'guard' | 'pressure' | 'counter' | 'brawl' | 'down' | 'stopped';
const tacticPose: Record<Tactic, Pose> = { box: 'guard', press: 'pressure', counter: 'counter', brawl: 'brawl' };
const tacticLabel = (tactic: Tactic) => TACTICS.find(t => t.id === tactic)!.label;

function Boxer({ side, pose, condition }: { side: 'player' | 'opp'; pose: Pose; condition: number }) {
  const blue = side === 'player';
  const color = blue ? '#78b9ee' : '#f28c85';
  const dark = blue ? '#234b76' : '#823d48';
  const skin = blue ? '#d4a37d' : '#a97659';
  const x = blue ? 112 : 208;
  const forward = pose === 'pressure' ? 10 : pose === 'brawl' ? 7 : pose === 'counter' ? -6 : 0;
  const lean = pose === 'stopped' ? 8 : condition < 25 ? 4 : pose === 'pressure' ? 3 : 0;
  return <g data-fighter={side} data-pose={pose} aria-hidden="true">
    <ellipse cx={x} cy="143" rx={pose === 'down' ? 30 : 18} ry="4" fill="#111b2d" opacity=".3" />
    <g className="motion-safe:transition-transform motion-safe:duration-500"
      style={{ transform: `translate(${x + (blue ? forward : -forward)}px, 140px) scale(${blue ? 1 : -1}, 1)` }}>
      {pose === 'down' ? <>
        <path d="M -25 -5 L -8 -7 L 5 -4 M -22 0 L -7 -2 L 5 1" fill="none" stroke={skin} strokeWidth="6" strokeLinecap="round" />
        <path d="M -28 -8 L -28 -2 M -25 -2 L -24 3" stroke="#e1e7ed" strokeWidth="5" strokeLinecap="round" />
        <path d="M -8 -11 L 7 -11 L 10 1 L -7 1 Z" fill={dark} />
        <path d="M 8 -9 L 20 -9 L 27 -3 M 10 -1 L 22 2" fill="none" stroke={skin} strokeWidth="6" strokeLinecap="round" />
        <circle cx="26" cy="-9" r="7" fill={skin} />
        <path d="M 21 -14 Q 28 -21 32 -11" fill="#252631" />
        <ellipse cx="28" cy="-1" rx="5" ry="4" fill={color} />
      </> : <>
        <path d="M -6 -29 L -14 -15 L -16 -3 M 5 -29 L 12 -17 L 17 -3" fill="none" stroke={skin} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M -21 -4 H -13 L -8 0 H -23 Z M 13 -4 H 20 L 25 0 H 13 Z" fill="#e1e7ed" stroke="#243247" strokeWidth="1" />
        <path d="M -10 -43 Q 0 -39 10 -43 L 11 -28 L 2 -27 L 0 -34 L -3 -27 L -12 -29 Z" fill={dark} stroke={color} strokeWidth="1" />
        <path d={`M ${-8 + lean} -61 Q ${1 + lean} -65 ${9 + lean} -58 L 10 -42 Q 0 -38 -10 -43 Z`} fill={skin} stroke="#75513e" strokeWidth=".7" />
        <path d={`M ${lean} -64 V -70`} stroke={skin} strokeWidth="6" />
        <ellipse cx={lean + 2} cy="-76" rx="7" ry="9" fill={skin} />
        <path d={`M ${lean - 5} -77 Q ${lean - 7} -87 ${lean + 3} -86 Q ${lean + 11} -85 ${lean + 9} -78 L ${lean + 4} -81 Z`} fill="#252631" />
        <path d={pose === 'stopped' ? 'M -7 -58 L -15 -45 L -12 -32 M 8 -58 L 17 -46 L 14 -33'
          : pose === 'counter' ? 'M -7 -58 L -15 -48 L 1 -59 M 8 -58 L 17 -49 L 21 -66'
            : pose === 'brawl' ? 'M -7 -58 L -18 -48 L -7 -57 M 8 -58 L 20 -50 L 28 -60'
              : 'M -7 -58 L -14 -49 L 0 -64 M 8 -58 L 17 -52 L 20 -69'}
          fill="none" stroke={skin} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
        <ellipse cx={pose === 'stopped' ? -12 : pose === 'brawl' ? -7 : pose === 'counter' ? 1 : 0}
          cy={pose === 'stopped' ? -32 : pose === 'brawl' ? -57 : pose === 'counter' ? -59 : -64} rx="5" ry="6" fill={color} stroke={dark} strokeWidth="1" />
        <ellipse cx={pose === 'stopped' ? 14 : pose === 'brawl' ? 28 : pose === 'counter' ? 21 : 20}
          cy={pose === 'stopped' ? -33 : pose === 'brawl' ? -60 : pose === 'counter' ? -66 : -69} rx="5" ry="6" fill={color} stroke={dark} strokeWidth="1" />
      </>}
    </g>
  </g>;
}

/** A round's stance and condition, never a reconstructed punch sequence. */
export default function FightRing({ round, condition, finished }: FightRingProps) {
  const id = `fight-ring-${useId().replace(/:/g, '')}`;
  const loser = finished?.winner === 'player' ? 'opp' : finished?.winner === 'opp' ? 'player' : null;
  const victim = round?.knockdown === 'player' ? 'opp' : round?.knockdown === 'opp' ? 'player' : null;
  const decision = finished && finished.method !== 'KO' && finished.method !== 'TKO';
  const pose = (side: 'player' | 'opp'): Pose => {
    if (!decision && (finished?.method === 'KO' ? loser === side : victim === side)) return 'down';
    if (finished?.method === 'TKO' && loser === side) return 'stopped';
    return round ? tacticPose[side === 'player' ? round.tactic : round.oppTactic] : 'guard';
  };
  const summary = round
    ? `You: ${tacticLabel(round.tactic)}, ${round.playerLanded} landed. Opponent: ${tacticLabel(round.oppTactic)}, ${round.oppLanded} landed.${victim ? ` ${victim === 'player' ? 'You were' : 'Opponent was'} knocked down this round.` : ''}`
    : 'Both fighters are ready. No round has been revealed.';
  return <svg data-fight-ring="" data-round={round?.round ?? 0} role="img" aria-labelledby={`${id}-title`} aria-describedby={`${id}-desc`}
    viewBox="0 0 320 180" className="block w-full rounded-md" preserveAspectRatio="xMidYMid meet">
    <title id={`${id}-title`}>Boxing ring{round ? `, round ${round.round}` : ', before round 1'}</title>
    <desc id={`${id}-desc`}>{summary} Condition: you {Math.round(condition.player)}, opponent {Math.round(condition.opp)}.
      {finished ? ` Result: ${finished.method}.${loser ? ` ${loser === 'player' ? 'You' : 'Opponent'} ${finished.method === 'KO' ? 'down after the knockout' : finished.method === 'TKO' ? 'stopped' : 'lost the decision'}.` : ' Draw.'}` : ''} Figures illustrate the round recap.</desc>
    <defs>
      <linearGradient id={`${id}-arena`} x2="0" y2="1"><stop stopColor="#17283e" /><stop offset="1" stopColor="#33465b" /></linearGradient>
      <linearGradient id={`${id}-canvas`} x2="0" y2="1"><stop stopColor="#8ea6b4" /><stop offset="1" stopColor="#b1c5ce" /></linearGradient>
    </defs>
    <g aria-hidden="true">
      <rect width="320" height="180" rx="6" fill={`url(#${id}-arena)`} />
      <path d="M 45 0 L 20 90 H 100 L 76 0 M 243 0 L 220 90 H 300 L 275 0" fill="#d7ecf4" opacity=".045" />
      <path d="M 0 43 H 320 M 0 51 H 320" stroke="#91a6ba" opacity=".18" />
      {[45, 119, 193, 267].map(x => <rect key={x} x={x} y="14" width="18" height="3" rx="1" fill="#d4e8f0" opacity=".6" />)}
      <path d="M 35 89 L 285 89 L 310 159 L 10 159 Z" fill={`url(#${id}-canvas)`} stroke="#e0edf1" strokeWidth="1" />
      <path d="M 10 159 H 310 V 170 H 10 Z" fill="#314d67" />
      <path d="M 45 94 H 275 L 294 152 H 26 Z" fill="none" stroke="#e6eff1" opacity=".55" />
      <ellipse cx="160" cy="126" rx="34" ry="13" fill="none" stroke="#e2edf0" opacity=".35" />
      <path d="M 35 69 H 285 M 35 79 H 285 M 35 89 H 285" stroke="#c0cbd3" strokeWidth="2" />
      <path d="M 35 68 L 10 138 M 35 79 L 10 148 M 285 68 L 310 138 M 285 79 L 310 148" fill="none" stroke="#c0cbd3" strokeWidth="2" />
      <Boxer side="player" pose={pose('player')} condition={condition.player} />
      <Boxer side="opp" pose={pose('opp')} condition={condition.opp} />
      <path d="M 10 139 H 310 M 10 149 H 310" stroke="#dde5e9" strokeWidth="2" />
      <path d="M 35 64 V 95 M 285 64 V 95 M 10 132 V 164 M 310 132 V 164" stroke="#283c50" strokeWidth="5" />
      <path d="M 35 69 V 88 M 10 138 V 156" stroke="#78b9ee" strokeWidth="7" strokeLinecap="round" />
      <path d="M 285 69 V 88 M 310 138 V 156" stroke="#f28c85" strokeWidth="7" strokeLinecap="round" />
      <text x="31" y="175" fill="#d5e8f8" fontSize="9" fontWeight="700">You</text>
      <text x="289" y="175" fill="#f8dcd9" textAnchor="end" fontSize="9" fontWeight="700">Opponent</text>
      {finished && <text x="160" y="175" textAnchor="middle" fill="#f1f5f7" fontSize="9" fontWeight="700">{finished.method}</text>}
    </g>
  </svg>;
}
