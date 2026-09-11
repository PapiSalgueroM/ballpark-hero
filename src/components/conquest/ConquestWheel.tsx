import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { isLightHex } from '@/lib/conquestMapLook';
import type { WheelSpec } from '@/lib/conquestScenes';

/**
 * Round 529: the wheel from the videos, as decoration over a value the
 * engine already fixed.
 *
 * A ring of team colour wedges with the team names on them. It spins and
 * lands on the featured attacker, then a compass needle in the middle spins
 * and settles pointing from the attacker's empire toward the defender's.
 * Both landings are known before the spin starts (spec.landingIndex and
 * arrowDeg), so a reload replays the same run and the wheel cannot change
 * anything. Colour and text only: a wedge is a colour and a name, never a
 * logo.
 *
 * The wedges are circles with a dash pattern rather than paths, on purpose:
 * scripts/simConquestMap.mjs section 4 holds that no file in this directory
 * but the map draws an SVG path, so nobody quietly grows a second map.
 *
 * Reduced motion: the ring and the needle render on their final frame with
 * no transition, so the attacker and the direction still read. Nothing here
 * is hidden.
 */

export interface ConquestWheelProps {
  spec: WheelSpec;
  /** True while the ring should turn; false renders it landed. */
  spinning: boolean;
  /** Where the needle settles after the ring lands, degrees clockwise from pointing right. Null draws no needle. */
  arrowDeg: number | null;
  durationMs?: number;
  reducedMotion?: boolean;
  onLanded?: () => void;
}

/** How long the needle takes to settle once the ring has landed. */
export const ARROW_SPIN_MS = 700;
/** Full turns the ring makes on top of the landing angle. */
const TURNS = 4;
const SIZE = 200;
const CX = 100;
const CY = 100;
/** Ring centre line radius and the ring's width, in viewBox units. */
const R = 66;
const W = 40;
const DEFAULT_SPIN_MS = 1600;

/** The centre of wedge i in degrees clockwise from three o'clock. */
function wedgeCentreDeg(i: number, n: number): number {
  return ((i + 0.5) * 360) / n;
}

/** The rotation that puts the landing wedge under the pointer at twelve o'clock, plus the spin's full turns. */
export function landingRotationDeg(landingIndex: number, wedges: number): number {
  if (wedges <= 0 || landingIndex < 0) return 0;
  const centre = wedgeCentreDeg(landingIndex, wedges);
  const settle = (((270 - centre) % 360) + 360) % 360;
  return TURNS * 360 + settle;
}

export default function ConquestWheel({
  spec, spinning, arrowDeg, durationMs = DEFAULT_SPIN_MS, reducedMotion = false, onLanded,
}: ConquestWheelProps) {
  const still = !spinning || reducedMotion;
  const [turned, setTurned] = useState(still);
  const [landed, setLanded] = useState(still);
  const onLandedRef = useRef(onLanded);
  onLandedRef.current = onLanded;

  useEffect(() => {
    if (still) {
      setTurned(true);
      setLanded(true);
      return;
    }
    /* The first paint sits at zero so the transition has somewhere to go. */
    const raf = requestAnimationFrame(() => setTurned(true));
    const timer = window.setTimeout(() => {
      setLanded(true);
      onLandedRef.current?.();
    }, durationMs);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [still, durationMs]);

  const n = spec.wedges.length;
  if (spec.landingIndex < 0 || n === 0) return null;

  const landing = spec.wedges[spec.landingIndex];
  const circumference = 2 * Math.PI * R;
  const arc = circumference / n;
  /* Names run along the radius, so the wedge's angular width sets the size
     and the ring's width sets the length; long names on a thin ring shrink. */
  const innerArc = (2 * Math.PI * (R - W / 2)) / n;
  const rotation = turned ? landingRotationDeg(spec.landingIndex, n) : 0;
  const ringStyle: CSSProperties = {
    transform: `rotate(${rotation}deg)`,
    transition: turned && !reducedMotion && spinning ? `transform ${durationMs}ms cubic-bezier(0.15, 0.7, 0.1, 1)` : 'none',
  };
  const needleTarget = arrowDeg === null ? 0 : reducedMotion ? arrowDeg : arrowDeg + 720;
  const needleStyle: CSSProperties = {
    transform: `rotate(${landed ? needleTarget : 0}deg)`,
    transition: landed && !reducedMotion ? `transform ${ARROW_SPIN_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)` : 'none',
  };

  return (
    <div
      data-wheel
      data-landing-team={landing.teamId}
      data-landed={landed ? 'yes' : 'no'}
      className="relative mx-auto"
      style={{ width: 'min(240px, 62vw)', aspectRatio: '1 / 1' }}
      role="img"
      aria-label={`The wheel lands on ${landing.name}`}
    >
      <div className="cq-wheel-pointer" aria-hidden />
      <div className="cq-wheel-ring" style={ringStyle}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" aria-hidden>
          <circle cx={CX} cy={CY} r={R + W / 2 + 1} fill="#0a0f1a" />
          {spec.wedges.map((w, i) => (
            <circle
              key={`wedge-${w.teamId}`}
              data-wedge
              data-team={w.teamId}
              data-landing={i === spec.landingIndex ? 'yes' : 'no'}
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke={w.color}
              strokeWidth={W}
              strokeDasharray={`${arc} ${circumference}`}
              strokeDashoffset={-(i * arc)}
            />
          ))}
          {spec.wedges.map((w, i) => {
            const a = wedgeCentreDeg(i, n);
            const byArc = innerArc * 0.6;
            const byLength = (W - 6) / Math.max(1, w.name.length * 0.58);
            const fontSize = Math.max(1.8, Math.min(6.5, byArc, byLength));
            return (
              <text
                key={`name-${w.teamId}`}
                x={CX + R - W / 2 + 3}
                y={CY}
                transform={`rotate(${a} ${CX} ${CY})`}
                textAnchor="start"
                dominantBaseline="central"
                fontSize={fontSize}
                fontWeight="bold"
                fill={isLightHex(w.color) ? '#111111' : '#ffffff'}
                style={{ letterSpacing: '0.02em' }}
              >
                {w.name}
              </text>
            );
          })}
          <circle cx={CX} cy={CY} r={R - W / 2 - 1} fill="#0a0f1a" stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
        </svg>
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        {landed && arrowDeg !== null ? (
          <svg viewBox="0 0 100 100" className="h-[38%] w-[38%]" aria-hidden>
            <g data-wheel-arrow data-angle={arrowDeg} className="cq-wheel-needle" style={{ ...needleStyle, transformOrigin: '50px 50px' }}>
              <line x1={50} y1={50} x2={88} y2={50} stroke="#ffd166" strokeWidth={7} strokeLinecap="round" />
              <polygon points="84,38 98,50 84,62" fill="#ffd166" />
              <circle cx={50} cy={50} r={7} fill="#ffd166" />
            </g>
          </svg>
        ) : null}
      </div>
      {landed && (
        <p
          data-wheel-landed
          className="cq-wheel-name absolute inset-x-0 -bottom-7 text-center text-xs font-black uppercase tracking-wider"
          style={{ color: landing.color === '#2a3040' ? '#ffffff' : landing.color }}
        >
          {landing.name}
        </p>
      )}
      <style>{`
        .cq-wheel-ring { width: 100%; height: 100%; transform-origin: 50% 50%; will-change: transform; }
        .cq-wheel-pointer {
          position: absolute; left: 50%; top: -6px; z-index: 2; width: 0; height: 0;
          transform: translateX(-50%);
          border-left: 9px solid transparent; border-right: 9px solid transparent; border-top: 16px solid #ffd166;
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.6));
        }
        @keyframes cq-wheel-name { 0% { opacity: 0; transform: scale(1.6); } 60% { opacity: 1; transform: scale(0.94); } 100% { opacity: 1; transform: scale(1); } }
        .cq-wheel-name { opacity: 0; animation: cq-wheel-name 0.4s cubic-bezier(0.2, 0.8, 0.3, 1.2) forwards; }
        @media (prefers-reduced-motion: reduce) {
          .cq-wheel-ring, .cq-wheel-needle { transition: none !important; }
          .cq-wheel-name { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}
