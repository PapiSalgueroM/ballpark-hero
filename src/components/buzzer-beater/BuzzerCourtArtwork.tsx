import { useId } from 'react';
import type { HoopSetup } from '@/lib/buzzerBeater';

interface CourtArtworkProps {
  setup: HoopSetup | undefined;
  toX: (metres: number) => number;
  toY: (metres: number) => number;
  floorY: number;
  rimHeight: number;
  rimRadius: number;
  releaseHeight: number;
  released: boolean;
  flight: number;
}

/** Decorative side elevation. All shot and contest anchors come from the board. */
export function CourtArtwork({ setup, toX, toY, floorY, rimHeight, rimRadius, releaseHeight, released, flight }: CourtArtworkProps) {
  const id = `court-${useId().replace(/:/g, '')}`;
  const followThrough = released ? Math.min(1, Math.max(0, flight) * 4) : 0;
  const shooterX = toX(0);
  const wristX = toX(0.1) - shooterX;
  const wristY = toY(releaseHeight) - floorY;
  const elbowX = -8 + followThrough * 7;
  const elbowY = -66 - followThrough * 7;
  const kneeX = 7 - followThrough * 5;
  const boardX = setup ? toX(setup.distance + 0.381) : 0;
  const rimY = toY(rimHeight);
  const rimLeft = setup ? toX(setup.distance - rimRadius) : 0;
  const rimRight = setup ? toX(setup.distance + rimRadius) : 0;
  const defenderX = setup ? toX(setup.contestDist) : 0;
  const contestY = setup ? toY(setup.contestReach) : floorY;
  const jump = Math.max(0, floorY - contestY - 99);
  const defenderBase = floorY - jump;
  const handX = setup ? toX(setup.contestDist + 0.12) - defenderX : 0;
  const handY = contestY - defenderBase;

  return <g data-court-artwork="" aria-hidden="true" pointerEvents="none">
    <defs>
      <linearGradient id={`${id}-wall`} x2="0" y2="1">
        <stop stopColor="#111d2c" /><stop offset="1" stopColor="#233247" />
      </linearGradient>
      <linearGradient id={`${id}-wood`} x2="0" y2="1">
        <stop stopColor="#ad8053" /><stop offset="1" stopColor="#785438" />
      </linearGradient>
      <linearGradient id={`${id}-glass`} x2="1" y2="1">
        <stop stopColor="#d5f3f8" stopOpacity=".42" /><stop offset="1" stopColor="#8cafc5" stopOpacity=".12" />
      </linearGradient>
      <linearGradient id={`${id}-shirt`} x2="1" y2="0">
        <stop stopColor="#c58833" /><stop offset=".5" stopColor="#efbc63" /><stop offset="1" stopColor="#d39a42" />
      </linearGradient>
    </defs>
    <rect width="360" height={floorY} fill={`url(#${id}-wall)`} />
    <path d="M 42 0 L 14 145 H 101 L 76 0 Z M 206 0 L 160 145 H 263 L 235 0 Z" fill="#cde8f7" opacity=".035" />
    <path d="M 0 17 H 360 M 0 24 H 360" stroke="#536477" strokeWidth="1" opacity=".35" />
    {[48, 116, 184, 252].map(x => <g key={x}>
      <rect x={x} y="13" width="24" height="3" rx="1.5" fill="#b7cfdf" opacity=".65" />
      <rect x={x - 2} y="11" width="28" height="7" rx="2" fill="#b7cfdf" opacity=".06" />
    </g>)}
    <path d="M 0 147 H 360 M 0 155 H 360 M 0 163 H 360" stroke="#0e1724" strokeWidth="5" opacity=".55" />
    <rect x="0" y="169" width="360" height="21" fill="#1a2737" />
    <path d="M 0 169 H 360 M 0 185 H 360" stroke="#506074" strokeWidth="1" opacity=".55" />
    {[0, 60, 120, 180, 240, 300].map(x => <rect key={x} x={x + 2} y="172" width="56" height="11" rx="1" fill="#223348" />)}
    <rect y={floorY} width="360" height={210 - floorY} fill={`url(#${id}-wood)`} />
    <path d="M 0 198 H 360 M 0 206 H 360 M 42 190 L 30 210 M 110 190 L 105 210 M 180 190 V 210 M 250 190 L 255 210 M 318 190 L 330 210" fill="none" stroke="#3a281f" strokeWidth=".6" opacity=".4" />

    {setup && <>
      <g data-court-hoop="">
        <ellipse cx={boardX + 10} cy={floorY + 1} rx="14" ry="2" fill="#0b1420" opacity=".35" />
        <path d={`M ${boardX + 13} ${floorY - 4} L ${boardX + 13} ${rimY + 31} L ${boardX + 1} ${rimY + 11}`} fill="none" stroke="#111d2b" strokeWidth="7" strokeLinejoin="round" />
        <path d={`M ${boardX + 12} ${floorY - 29} L ${boardX + 12} ${rimY + 32} L ${boardX + 1} ${rimY + 12}`} fill="none" stroke="#71869a" strokeWidth="2" strokeLinejoin="round" />
        <rect x={boardX + 6} y={floorY - 33} width="14" height="32" rx="3" fill="#324a62" stroke="#597187" strokeWidth=".8" />
        <path d={`M ${boardX + 8} ${floorY - 29} V ${floorY - 5}`} stroke="#6e8799" strokeWidth="1" opacity=".7" />
        <rect x={boardX - 2.6} y={toY(3.95)} width="5.2" height={toY(2.9) - toY(3.95)} rx="1" fill={`url(#${id}-glass)`} stroke="#93b1c3" strokeWidth=".7" />
        <path d={`M ${boardX - 1} ${toY(3.82)} V ${toY(3.35)} M ${boardX - 2} ${rimY + 1} H ${rimRight}`} stroke="#d9e7e9" strokeWidth="1" opacity=".75" />
        <g data-court-net="" fill="none" stroke="#cfdae0" strokeWidth=".65" opacity=".8">
          <path d={`M ${rimLeft} ${rimY} L ${rimLeft + 3} ${toY(rimHeight - 0.42)} H ${rimRight - 3} L ${rimRight} ${rimY}`} />
          {[0, 1, 2, 3].map(i => <path key={i} d={`M ${rimLeft + i * (rimRight - rimLeft) / 4} ${rimY} L ${rimLeft + 3 + (i + 1) * (rimRight - rimLeft - 6) / 4} ${toY(rimHeight - 0.42)} M ${rimLeft + (i + 1) * (rimRight - rimLeft) / 4} ${rimY} L ${rimLeft + 3 + i * (rimRight - rimLeft - 6) / 4} ${toY(rimHeight - 0.42)}`} />)}
        </g>
      </g>

      {setup.contestReach > 0 && <g data-court-athlete="defender">
        <ellipse cx={defenderX} cy={floorY + 1} rx="11" ry="2" fill="#080f18" opacity=".4" />
        <g data-court-rig="defender" transform={`translate(${defenderX} ${defenderBase})`}>
          <path d="M -4 -33 L -9 -18 L -12 -3 M 4 -33 L 10 -19 L 13 -4" fill="none" stroke="#966649" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M -16 -3 H -9 L -5 0 H -17 Z M 9 -4 H 15 L 19 -1 H 9 Z" fill="#d4dde5" stroke="#172336" strokeWidth="1" />
          <path d="M -8 -44 H 8 L 8 -29 L 1 -28 L -1 -36 L -3 -28 L -10 -30 Z" fill="#1b2c42" stroke="#526a80" strokeWidth=".7" />
          <path d={`M -6 -60 L -13 -48 L -17 -58 M 6 -60 L 11 -78 L ${handX} ${handY}`} fill="none" stroke="#b88663" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M -7 -62 Q 0 -66 7 -62 L 9 -43 Q 0 -40 -9 -43 Z" fill="#77a9bf" stroke="#305b76" strokeWidth=".8" />
          <path d="M -4 -59 L -5 -46 M 4 -56 L 5 -46" stroke="#c0d8df" strokeWidth=".7" opacity=".55" />
          <path d="M -2 -65 V -69 H 3 V -64" fill="#b88663" />
          <circle cx="0" cy="-73" r="5.3" fill="#bf906c" />
          <path d="M -5 -73 Q -6 -81 1 -79 Q 6 -78 5 -74 L 2 -76 L -4 -75 Z" fill="#22232a" />
          <circle data-court-wrist="defender" cx={handX} cy={handY} r="1.8" fill="#c79b76" />
        </g>
      </g>}

      <g data-court-athlete="shooter">
        <ellipse cx={shooterX + 1} cy={floorY + 1} rx="12" ry="2" fill="#080f18" opacity=".45" />
        <g data-court-rig="shooter" transform={`translate(${shooterX} ${floorY})`}>
          <path d={`M -4 -32 L ${kneeX - 9} -17 L -8 -3 M 5 -32 L ${kneeX + 4} -18 L 8 -3`} fill="none" stroke="#a46c48" strokeWidth="5.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M -12 -4 H -6 L -1 -1 Q 0 1 -3 1 H -14 Z M 5 -4 H 11 L 16 -1 Q 17 1 14 1 H 5 Z" fill="#e7e8df" stroke="#293443" strokeWidth="1" />
          <path d="M -8 -43 H 9 L 9 -29 L 2 -28 L 0 -35 L -2 -28 L -10 -30 Z" fill="#293443" stroke="#67737c" strokeWidth=".7" />
          <path d={`M -6 -57 L -14 ${-70 - followThrough * 3} L ${wristX - 3} ${wristY + 2}`} fill="none" stroke="#a46c48" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M -7 -60 Q -1 -64 6 -59 L 9 -43 Q 0 -40 -9 -44 Z" fill={`url(#${id}-shirt)`} stroke="#9c682f" strokeWidth=".8" />
          <path d="M -4 -55 L -5 -45 M 4 -51 L 5 -45" stroke="#ffe0a2" strokeWidth=".8" opacity=".6" />
          <path d="M -1 -62 V -67 H 4 V -61" fill="#be8659" />
          <path d="M -5 -70 Q -5 -77 1 -77 Q 7 -77 7 -70 L 9 -67 L 6 -66 Q 5 -62 0 -63 Q -5 -64 -5 -70" fill="#c38c61" />
          <path d="M -5 -69 Q -8 -79 0 -79 Q 7 -79 7 -73 L 2 -75 L -4 -73 Z" fill="#29252a" />
          <path d={`M 5 -57 L ${elbowX} ${elbowY} L ${wristX} ${wristY}`} fill="none" stroke="#d19a6c" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d={`M ${wristX} ${wristY} L ${wristX + 3} ${wristY + 2 + followThrough * 3}`} fill="none" stroke="#e1ac7e" strokeWidth="1.8" strokeLinecap="round" />
          <circle data-court-wrist="shooter" cx={wristX} cy={wristY} r="1.6" fill="#e1ac7e" />
        </g>
      </g>
    </>}
  </g>;
}

export function BallSeams({ cx, cy, r, flight }: { cx: number; cy: number; r: number; flight: number }) {
  const rotation = Math.min(1, Math.max(0, flight)) * 540;
  return <g data-ball-seams="" transform={`translate(${cx} ${cy}) rotate(${rotation})`} aria-hidden="true" pointerEvents="none" fill="none" stroke="#683b23" strokeWidth=".55">
    <path d={`M ${-r + 0.4} 0 H ${r - 0.4} M 0 ${-r + 0.4} V ${r - 0.4}`} />
    <path d={`M ${-r * .68} ${-r * .68} Q ${r * .52} 0 ${-r * .68} ${r * .68} M ${r * .68} ${-r * .68} Q ${-r * .52} 0 ${r * .68} ${r * .68}`} />
    <path d={`M ${-r * .6} ${-r * .44} Q ${-r * .35} ${-r * .75} 0 ${-r * .78}`} stroke="#ffd39b" strokeWidth=".65" opacity=".8" />
  </g>;
}
