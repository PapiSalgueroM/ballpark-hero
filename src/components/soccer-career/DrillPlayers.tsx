/** Small articulated players. Coordinates come from the drill, never a new roll. */
type Point = { x: number; y: number };
type Tint = 'wall' | 'keeper' | 'attacker' | 'you';

const COLORS: Record<Tint, { shirt: string; shorts: string }> = {
  wall: { shirt: '#6aafe5', shorts: '#294b70' },
  keeper: { shirt: '#f5c64b', shorts: '#594725' },
  attacker: { shirt: '#e86a70', shorts: '#6a303b' },
  you: { shirt: '#51c79a', shorts: '#215d4b' },
};
const SKIN = '#dbab87';
const BOOT = '#122c29';

export function DrillFigure({ x, y, tint, scale = 1, lean = 0, stride = 0, strike = 0, reach, wallHalfWidth }: {
  x: number; y: number; tint: Tint; scale?: number; lean?: number;
  stride?: number; strike?: number; reach?: Point; wallHalfWidth?: number;
}) {
  const { shirt, shorts } = COLORS[tint];
  const left = { x: -4 - stride * 4, y: -Math.max(0, stride) * 3 };
  const right = reach ?? { x: 4 + stride * 4 + strike * 13, y: -Math.max(0, -stride) * 3 - strike * 12 };
  return (
    <g data-drill-player={tint} data-strike={strike.toFixed(3)} transform={`translate(${x} ${y}) scale(${scale})`} pointerEvents="none">
      <ellipse cx={0} cy={2} rx={10} ry={2.5} fill="#102f28" opacity={0.3} />
      <path d={`M -2 -10 Q ${-4 - stride * 2} -4 ${left.x} ${left.y}`} fill="none" stroke={shorts} strokeWidth={4.5} strokeLinecap="round" />
      <path data-drill-reaching-leg d={`M 3 -10 Q ${right.x * 0.45 + 3} ${right.y * 0.3 - 5} ${right.x} ${right.y}`} fill="none" stroke={shorts} strokeWidth={4.5} strokeLinecap="round" />
      <path d={`M ${left.x - 2} ${left.y} h 5`} stroke={BOOT} strokeWidth={3} strokeLinecap="round" />
      <path data-drill-boot d={`M ${right.x - 1} ${right.y} h 5`} stroke={BOOT} strokeWidth={3} strokeLinecap="round" />
      <g transform={`rotate(${lean} 0 -11)`}>
        <path d="M -5 -24 Q 0 -27 5 -24 L 5 -10 Q 0 -8 -5 -10 Z" fill={shirt} />
        <path d="M -4 -11 H 4" stroke={shorts} strokeWidth={4} strokeLinecap="round" />
        <path d={wallHalfWidth ? `M ${-wallHalfWidth} -20 H ${wallHalfWidth}` : `M -5 -22 Q ${-9 - strike * 5} -19 ${-9 - strike * 5} -14 M 5 -22 Q ${9 + strike * 4} -20 ${10 + strike * 4} -17`} fill="none" stroke={shirt} strokeWidth={4.5} strokeLinecap="round" />
        {!wallHalfWidth && <path d={`M ${-9 - strike * 5} -14 v 1 M ${10 + strike * 4} -17 v 1`} stroke={SKIN} strokeWidth={3} strokeLinecap="round" />}
        <path d="M 0 -27 V -25" stroke={SKIN} strokeWidth={4} />
        <circle cy={-30.5} r={4.7} fill={SKIN} />
        <path d="M -4.4 -32 Q -1 -38 4.4 -32" fill="#302c27" />
        <path d="M -3 -23 L -2 -13" stroke="white" strokeOpacity={0.22} strokeWidth={1.5} />
      </g>
    </g>
  );
}

/** The hands meet the actual glove position; the chest and legs follow it. */
export function DrillKeeper({ origin, glove, contact, catching = false }: {
  origin: Point; glove: Point; contact?: Point; catching?: boolean;
}) {
  const dx = glove.x - origin.x;
  const dy = glove.y - origin.y;
  const distance = Math.hypot(dx, dy);
  const direction = distance > 0.01 ? { x: dx / distance, y: dy / distance } : { x: 0, y: -1 };
  const extension = Math.min(1, distance / 45);
  const reach = 14 + extension * 8;
  const chest = { x: glove.x - direction.x * reach, y: glove.y - direction.y * reach };
  const angle = (Math.atan2(direction.y, direction.x) * 180) / Math.PI + 90;
  const hands = contact ?? glove;
  const across = { x: -direction.y, y: direction.x };
  return (
    <g data-drill-keeper data-catching={catching} data-glove-x={glove.x.toFixed(3)} data-glove-y={glove.y.toFixed(3)} pointerEvents="none">
      <g data-drill-keeper-body transform={`translate(${chest.x} ${chest.y}) rotate(${angle})`}>
        <path d={`M -3 9 Q ${-5 - extension * 6} ${18 + extension * 3} ${-4 - extension * 9} 25 M 3 9 Q ${7 + extension * 7} 15 ${6 + extension * 6} ${22 - extension * 5}`} fill="none" stroke={COLORS.keeper.shorts} strokeWidth={4.5} strokeLinecap="round" />
        <path d={`M ${-6 - extension * 9} 25 h 5 M ${4 + extension * 6} ${22 - extension * 5} h 5`} stroke={BOOT} strokeWidth={3} strokeLinecap="round" />
        <path d="M -6 -5 Q 0 -8 6 -5 L 5 11 H -5 Z" fill={COLORS.keeper.shirt} />
        <path d="M -4 10 H 4" stroke={COLORS.keeper.shorts} strokeWidth={4} strokeLinecap="round" />
        <circle cy={-12} r={5} fill={SKIN} />
        <path d="M -4.7 -14 Q 0 -20 4.7 -14" fill="#302c27" />
      </g>
      {[-1, 1].map(side => {
        const shoulder = { x: chest.x + across.x * side * 5, y: chest.y + across.y * side * 5 };
        const hand = { x: hands.x + across.x * side * (catching ? 2 : 4), y: hands.y + across.y * side * (catching ? 2 : 4) };
        return <g key={side}>
          <path d={`M ${shoulder.x} ${shoulder.y} Q ${(shoulder.x + hand.x) / 2 + across.x * side * 4} ${(shoulder.y + hand.y) / 2 + across.y * side * 4} ${hand.x} ${hand.y}`} fill="none" stroke={COLORS.keeper.shirt} strokeWidth={4.5} strokeLinecap="round" />
          <ellipse cx={hand.x} cy={hand.y} rx={3.4} ry={4.2} fill="#f4f1df" stroke="#b9c9bf" strokeWidth={0.8} />
        </g>;
      })}
    </g>
  );
}
