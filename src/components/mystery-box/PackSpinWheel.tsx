import { useEffect, useRef } from 'react';
import type { PackTier } from '@/lib/fetchPackPool';
import { playPackCue } from '@/lib/mysteryBoxAudio';
import {
  easeOutCubic,
  SPIN_DURATION_MS,
  spinTargetForPack,
  TIER_WHEEL,
  tierUnderPointer,
  wheelSectors,
} from '@/lib/mysteryBoxWheel';

const SIZE = 280;
const CX = 140;
const CY = 140;
const R = 126;

function polar(degFromTop: number, r = R) {
  const rad = ((degFromTop - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function slicePath(startDeg: number, endDeg: number): string {
  const start = polar(startDeg);
  const end = polar(endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${CX} ${CY} L ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)} Z`;
}

interface PackSpinWheelProps {
  targetTier: PackTier;
  packIndex: number;
  spinning: boolean;
  muted: boolean;
  onLanded: () => void;
}

export function PackSpinWheel({ targetTier, packIndex, spinning, muted, onLanded }: PackSpinWheelProps) {
  const groupRef = useRef<SVGGElement>(null);
  const onLandedRef = useRef(onLanded);
  onLandedRef.current = onLanded;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const lastTierRef = useRef<PackTier | null>(null);
  const lastTickAtRef = useRef(0);

  useEffect(() => {
    const el = groupRef.current;
    if (!el) return;

    const target = spinTargetForPack(targetTier, packIndex);

    if (!spinning) {
      el.setAttribute('transform', 'rotate(0 140 140)');
      return;
    }

    let raf = 0;
    let landed = false;
    const start = performance.now();
    lastTierRef.current = tierUnderPointer(0);
    lastTickAtRef.current = start;

    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / SPIN_DURATION_MS);
      const deg = easeOutCubic(t) * target;
      el.setAttribute('transform', `rotate(${deg} 140 140)`);
      const under = tierUnderPointer(deg);
      if (under !== lastTierRef.current) {
        lastTierRef.current = under;
        if (now - lastTickAtRef.current > 42) {
          lastTickAtRef.current = now;
          playPackCue('tick', mutedRef.current);
        }
      }
      if (t < 1) {
        raf = requestAnimationFrame(frame);
      } else if (!landed) {
        landed = true;
        el.setAttribute('transform', `rotate(${target} 140 140)`);
        onLandedRef.current();
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [spinning, targetTier, packIndex]);

  const sectors = wheelSectors();

  return (
    <div className="relative mx-auto w-full max-w-[280px]" data-pack-wheel data-spinning={spinning ? 'yes' : 'no'}>
      <svg
        viewBox="0 0 280 280"
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={spinning ? 'Pack wheel spinning' : 'Pack wheel, ready to spin'}
      >
        <polygon points="140,6 128,26 152,26" fill="hsl(var(--primary))" />
        <g ref={groupRef} transform="rotate(0 140 140)">
          {sectors.map(s => {
            const look = TIER_WHEEL[s.tier];
            const mid = (s.startDeg + s.endDeg) / 2;
            const labelAt = polar(mid, R * 0.62);
            return (
              <g key={s.tier}>
                <path d={slicePath(s.startDeg, s.endDeg)} fill={look.fill} stroke="#0f172a" strokeWidth="1.5" />
                <text
                  x={labelAt.x}
                  y={labelAt.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={look.text}
                  fontSize="11"
                  fontWeight="800"
                  letterSpacing="0.06em"
                >
                  {look.label}
                </text>
              </g>
            );
          })}
          <circle cx={CX} cy={CY} r="22" fill="#0f172a" stroke="#eab308" strokeWidth="3" />
          <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle" fill="#eab308" fontSize="16">📦</text>
        </g>
      </svg>
    </div>
  );
}
