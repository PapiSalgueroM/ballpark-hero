import type { ActorPose, Point } from './conquestActionFrames';

/** Original figures with planted feet and hands placed by the current play. */
export default function ConquestActionPlayer({ pose, color, football = false, side }: {
  pose: ActorPose; color: string; football?: boolean; side: 'offense' | 'defense' | 'receiver';
}) {
  const { x, y, run = 0, lean = 0 } = pose;
  const rightFoot = pose.foot ? { x: pose.foot.x - x, y: pose.foot.y - y } : { x: 7 + run * 8, y: -Math.max(0, -run) * 6 };
  const leftFoot = { x: -7 - run * 8, y: -Math.max(0, run) * 6 };
  const angle = lean * Math.PI / 180;
  const shoulder = (sign: number): Point => ({ x: sign * 6 * Math.cos(angle) + 18 * Math.sin(angle), y: -12 + sign * 6 * Math.sin(angle) - 18 * Math.cos(angle) });
  const right = shoulder(1);
  const left = shoulder(-1);
  const hand = pose.hand ? { x: pose.hand.x - x, y: pose.hand.y - y } : { x: 13 + run * 4, y: -21 };
  return <g data-conquest-actor={side} transform={`translate(${x} ${y})`} pointerEvents="none">
    <ellipse cy={2} rx={15} ry={3} fill="#041b22" opacity={0.22} />
    <path d={`M -4 -14 Q ${-8 - run * 2} -6 ${leftFoot.x} ${leftFoot.y} M 4 -14 Q ${rightFoot.x * 0.55} ${rightFoot.y * 0.4 - 5} ${rightFoot.x} ${rightFoot.y}`} fill="none" stroke="#426575" strokeWidth={6} strokeLinecap="round" />
    <path d={`M ${leftFoot.x - 2} ${leftFoot.y} h 6 M ${rightFoot.x - 2} ${rightFoot.y} h 6`} stroke="#eef4df" strokeWidth={3} strokeLinecap="round" />
    <g transform={`rotate(${lean} 0 -12)`}>
      <path d="M -7 -32 Q 0 -36 7 -32 L 6 -13 H -6 Z" fill={color} />
      <path d="M -5 -13 H 5" stroke="#426575" strokeWidth={5} />
      <circle cy={-41} r={5.5} fill="#d7ae8a" />
      {football ? <>
        <path d="M -6 -39 Q -8 -49 2 -48 Q 8 -48 7 -41 H 2 V -37 H -5 Z" fill={color} />
        <path d="M 3 -41 H 9 V -37 H 4" fill="none" stroke="#e9f3ec" strokeWidth={1.4} />
      </> : <path d="M -5.4 -42 Q -4 -49 3 -46 L 5 -42" fill="#293338" />}
      <path d="M -4 -30 V -18" stroke="white" strokeOpacity={0.3} strokeWidth={2} />
    </g>
    <path d={`M ${left.x} ${left.y} Q -13 -26 ${-14 - run * 4} -20 M ${right.x} ${right.y} Q ${(right.x + hand.x) / 2 + 3} ${(right.y + hand.y) / 2 - 3} ${hand.x} ${hand.y}`} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" />
    <circle cx={hand.x} cy={hand.y} r={3} fill="#d7ae8a" />
  </g>;
}
