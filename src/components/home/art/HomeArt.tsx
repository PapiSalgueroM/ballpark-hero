import { useId } from 'react';
import type { StageArt } from '@/data/homeFront';

/**
 * Round 658: the four drawings on the home page's Main Event band.
 *
 * Everything here is SVG primitives drawn in this file and coloured only
 * through CSS variables (the --stage-* set in src/index.css, which flips to a
 * day palette in the light theme). No images, no fonts, no outside host, and
 * nothing that copies a real ground, kit, crest or league mark: a pitch, a
 * clipboard, a stand and a court, each generic.
 *
 * All of it is decoration, so every svg is aria-hidden and the cards carry
 * their meaning in text. Ids for gradients and patterns come from useId, so
 * two copies on one page never collide (the LogoMark lesson).
 *
 * This file is loaded on demand by FeaturedStage, so the drawings stay out of
 * the entry chunk every other page on the site downloads.
 */

const cleanId = (raw: string) => raw.replace(/[^a-zA-Z0-9_-]/g, '');

/* The pitch, seen from the side: far touchline at y 152, near edge off the
   bottom of the frame, twelve mowing stripes converging on the middle. */
const FAR_Y = 152;
const NEAR_Y = 318;
const FAR_L = 70;
const FAR_R = 410;
const SPREAD = 1.75;
const nearX = (x: number) => 240 + (x - 240) * SPREAD;

function stripes(): string[] {
  const out: string[] = [];
  const n = 12;
  const w = (FAR_R - FAR_L) / n;
  for (let i = 1; i < n; i += 2) {
    const a = FAR_L + i * w;
    const b = a + w;
    out.push(`${a},${FAR_Y} ${b},${FAR_Y} ${nearX(b)},${NEAR_Y} ${nearX(a)},${NEAR_Y}`);
  }
  return out;
}

const PYLONS = [
  { x: 36, top: 18, delay: '0s' },
  { x: 150, top: 46, delay: '0.08s' },
  { x: 330, top: 46, delay: '0.16s' },
  { x: 444, top: 18, delay: '0.24s' },
];

function PitchNight() {
  const id = cleanId(useId());
  const sky = `${id}-sky`;
  const cone = `${id}-cone`;
  const crowd = `${id}-crowd`;
  return (
    <svg viewBox="0 0 480 300" preserveAspectRatio="xMidYMax slice" className="hf-art h-full w-full" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="hsl(var(--stage-sky))" />
          <stop offset="1" stopColor="hsl(var(--stage-sky-2))" />
        </linearGradient>
        <linearGradient id={cone} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="hsl(var(--stage-light))" stopOpacity="0.34" />
          <stop offset="1" stopColor="hsl(var(--stage-light))" stopOpacity="0" />
        </linearGradient>
        <pattern id={crowd} width="8" height="7" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.5" fill="hsl(var(--stage-crowd))" />
          <circle cx="6" cy="5.5" r="1.5" fill="hsl(var(--stage-crowd))" fillOpacity="0.7" />
        </pattern>
      </defs>
      <rect width="480" height="160" fill={`url(#${sky})`} />
      <ellipse cx="240" cy="150" rx="250" ry="40" fill="hsl(var(--stage-light))" fillOpacity="0.07" />
      {PYLONS.map(p => (
        <g key={p.x}>
          <line x1={p.x} y1={p.top + 10} x2={p.x} y2={FAR_Y} stroke="hsl(var(--stage-steel))" strokeWidth="3" />
          <rect x={p.x - 14} y={p.top} width="28" height="12" rx="2" fill="hsl(var(--stage-steel))" />
          {[0, 1, 2, 3].map(i => [0, 1].map(j => (
            <rect key={`${i}${j}`} x={p.x - 12 + i * 6.5} y={p.top + 1.8 + j * 5} width="5" height="3.4" rx="0.6" fill="hsl(var(--stage-light))" />
          )))}
        </g>
      ))}
      <rect y="104" width="480" height="48" fill="hsl(var(--stage-stand))" />
      <rect y="111" width="480" height="37" fill={`url(#${crowd})`} />
      <rect y="102" width="480" height="5" fill="hsl(var(--stage-steel))" />
      <rect y="148" width="480" height="4" fill="hsl(var(--stage-steel))" />
      <polygon points={`${FAR_L},${FAR_Y} ${FAR_R},${FAR_Y} ${nearX(FAR_R)},${NEAR_Y} ${nearX(FAR_L)},${NEAR_Y}`} fill="hsl(var(--stage-grass-a))" />
      {stripes().map(pts => <polygon key={pts} points={pts} fill="hsl(var(--stage-grass-b))" />)}
      <g fill="none" stroke="hsl(var(--stage-line))" strokeOpacity="0.55" strokeWidth="1.6">
        <path d="M84 158H396M84 158-25.2 318M396 158 505.2 318M240 158V318" />
        <ellipse cx="240" cy="226" rx="60" ry="19" />
        <path d="M64.3 186.8H116.1L79.2 263.6H11.9M415.7 186.8H363.9L400.8 263.6H468.1" />
      </g>
      {PYLONS.map(p => {
        const bc = 240 + (p.x - 240) * 0.35;
        return (
          <polygon
            key={`c${p.x}`}
            className="hf-cone"
            style={{ animationDelay: p.delay }}
            points={`${p.x - 12},${p.top + 11} ${p.x + 12},${p.top + 11} ${bc + 130},300 ${bc - 130},300`}
            fill={`url(#${cone})`}
          />
        );
      })}
      <ellipse cx="240" cy="229" rx="8" ry="2.2" fill="#000" fillOpacity="0.3" />
      <g className="hf-ball">
        <circle cx="240" cy="220" r="7.5" fill="hsl(var(--stage-ball))" />
        <path d="M240 217.4 242.47 219.2 241.53 222.1 238.47 222.1 237.53 219.2Z" fill="hsl(var(--stage-sky))" fillOpacity="0.8" />
      </g>
    </svg>
  );
}

/* Club Manager: a drawn pitch on a clipboard, eleven magnets in a 4-3-3 and
   one dashed run. */
const MAGNETS = [
  { x: 120, y: 150, gk: true },
  { x: 74, y: 128 }, { x: 103, y: 128 }, { x: 137, y: 128 }, { x: 166, y: 128 },
  { x: 88, y: 102 }, { x: 120, y: 102 }, { x: 152, y: 102 },
  { x: 78, y: 68 }, { x: 120, y: 68 }, { x: 162, y: 68 },
];

function TacticsBoard() {
  return (
    <svg viewBox="0 0 240 180" preserveAspectRatio="xMidYMid meet" className="hf-art h-full w-full" aria-hidden="true" focusable="false">
      <g transform="rotate(-6 120 96)">
        <rect x="40" y="18" width="160" height="158" rx="10" fill="hsl(var(--stage-board))" />
        <rect x="94" y="8" width="52" height="20" rx="5" fill="hsl(var(--stage-steel))" />
        <circle cx="120" cy="14" r="3" fill="hsl(var(--stage-board))" />
        <rect x="52" y="36" width="136" height="128" rx="3" fill="hsl(var(--stage-grass-a))" />
        {[52, 84, 116, 148].map(y => <rect key={y} x="52" y={y} width="136" height="16" fill="hsl(var(--stage-grass-b))" />)}
        <g fill="none" stroke="hsl(var(--stage-line))" strokeOpacity="0.6" strokeWidth="1.3">
          <rect x="58" y="42" width="124" height="116" />
          <path d="M58 100H182" />
          <circle cx="120" cy="100" r="14" />
          <rect x="90" y="42" width="60" height="22" />
          <rect x="90" y="136" width="60" height="22" />
        </g>
        <path d="M152 95c18-7 28-23 24-39" fill="none" stroke="hsl(var(--stage-coin))" strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" />
        <path d="M171 59 176.5 51 180.5 60" fill="none" stroke="hsl(var(--stage-coin))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {MAGNETS.map(m => (
          <g key={`${m.x}-${m.y}`}>
            <circle cx={m.x} cy={m.y} r="6.5" fill={m.gk ? 'hsl(var(--stage-coin))' : 'hsl(var(--primary))'} stroke="hsl(var(--stage-board))" strokeWidth="1.5" />
            <circle cx={m.x - 2} cy={m.y - 2} r="2" fill="#fff" fillOpacity="0.35" />
          </g>
        ))}
      </g>
    </svg>
  );
}

/* Stadium Tycoon: stand blocks stepping up in isometric, a strip of pitch in
   front, and a stack of coins. */
const iso = (a: number, b: number, h: number) => `${(112 + (a - b) * 15.6).toFixed(1)},${(70 + (a + b) * 9 - h * 18).toFixed(1)}`;
const quad = (...p: string[]) => p.join(' ');

function StandBuilder() {
  const tiers = [0, 1, 2].map(i => ({ b0: i * 1.1, b1: (i + 1) * 1.1, h: 3.3 - i }));
  const coins = [0, 1, 2, 3, 4];
  return (
    <svg viewBox="0 0 240 180" preserveAspectRatio="xMidYMid meet" className="hf-art h-full w-full" aria-hidden="true" focusable="false">
      {tiers.map(t => (
        <g key={t.b0}>
          <polygon points={quad(iso(0, t.b0, t.h), iso(6, t.b0, t.h), iso(6, t.b1, t.h), iso(0, t.b1, t.h))} fill="hsl(var(--stage-seat))" />
          <polygon points={quad(iso(0, t.b1, t.h), iso(6, t.b1, t.h), iso(6, t.b1, 0), iso(0, t.b1, 0))} fill="hsl(var(--stage-concrete))" />
          <polygon points={quad(iso(6, t.b0, t.h), iso(6, t.b1, t.h), iso(6, t.b1, 0), iso(6, t.b0, 0))} fill="hsl(var(--stage-concrete-2))" />
          {[0.37, 0.74].map(f => {
            const [x1, y1] = iso(0.25, t.b0 + f * 1.1, t.h).split(',');
            const [x2, y2] = iso(5.75, t.b0 + f * 1.1, t.h).split(',');
            return <line key={f} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--stage-line))" strokeOpacity="0.4" strokeWidth="1.4" strokeDasharray="3 2.5" />;
          })}
        </g>
      ))}
      <polygon points={quad(iso(0, 3.3, 0), iso(6, 3.3, 0), iso(6, 3.5, 0), iso(0, 3.5, 0))} fill="hsl(var(--stage-concrete-2))" />
      <polygon points={quad(iso(0, 3.5, 0), iso(6, 3.5, 0), iso(6, 5.3, 0), iso(0, 5.3, 0))} fill="hsl(var(--stage-grass-a))" />
      <polygon points={quad(iso(0, 4.1, 0), iso(6, 4.1, 0), iso(6, 4.7, 0), iso(0, 4.7, 0))} fill="hsl(var(--stage-grass-b))" />
      <polyline points={quad(iso(0, 3.75, 0), iso(6, 3.75, 0))} fill="none" stroke="hsl(var(--stage-line))" strokeOpacity="0.6" strokeWidth="1.2" />
      {coins.map(k => {
        const cy = 164 - k * 6.5;
        return (
          <g key={k}>
            <path d={`M191 ${cy}v3a15 5.5 0 0 0 30 0v-3`} fill="hsl(var(--stage-coin-edge))" />
            <ellipse cx="206" cy={cy} rx="15" ry="5.5" fill="hsl(var(--stage-coin))" stroke="hsl(var(--stage-coin-edge))" strokeWidth="0.8" />
          </g>
        );
      })}
      <ellipse cx="206" cy={164 - 4 * 6.5} rx="9" ry="3.2" fill="none" stroke="hsl(var(--stage-coin-edge))" strokeWidth="1" />
    </svg>
  );
}

/* NBA My Career: the hardwood, the key and the arc, and a dotted jump shot
   dropping into the ring. */
function CourtKey() {
  const planks = Array.from({ length: 19 }, (_, i) => 12 * (i + 1));
  return (
    <svg viewBox="0 0 240 180" preserveAspectRatio="xMidYMid meet" className="hf-art h-full w-full" aria-hidden="true" focusable="false">
      <rect width="240" height="180" rx="10" fill="hsl(var(--stage-wood))" />
      <g stroke="hsl(var(--stage-wood-2))" strokeWidth="1">
        {planks.map(x => <line key={x} x1={x} y1="0" x2={x} y2="180" />)}
        {planks.map((x, i) => <line key={`j${x}`} x1={x - 12} y1={(i * 37) % 170 + 5} x2={x} y2={(i * 37) % 170 + 5} />)}
      </g>
      <rect x="84" y="6" width="72" height="90" fill="hsl(var(--tile) / 0.45)" />
      <g fill="none" stroke="hsl(var(--stage-line))" strokeOpacity="0.8" strokeWidth="2">
        <path d="M0 6H240" />
        <rect x="84" y="6" width="72" height="90" />
        <circle cx="120" cy="96" r="30" />
        <path d="M34 6V52A90 90 0 0 0 206 52V6" />
      </g>
      <path d="M100 14H140" stroke="hsl(var(--stage-line))" strokeWidth="3" strokeLinecap="round" />
      <circle cx="120" cy="24" r="7" fill="none" stroke="hsl(var(--stage-rim))" strokeWidth="2.4" />
      <path d="M114 29l2 8M120 31v8M126 29l-2 8" stroke="hsl(var(--stage-line))" strokeOpacity="0.6" strokeWidth="1" />
      <path d="M196 150Q176 18 128 22" fill="none" stroke="hsl(var(--stage-line))" strokeWidth="2.5" strokeDasharray="0.5 6" strokeLinecap="round" />
      <path d="M192 152l8 8M200 152l-8 8" stroke="hsl(var(--stage-line))" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" />
      <g className="hf-ball">
        <circle cx="165.5" cy="45.9" r="8" fill="hsl(var(--stage-rim))" />
        <path d="M157.5 45.9h16M165.5 37.9v16M159.8 40.2c3 2.8 3 8.6 0 11.4M171.2 40.2c-3 2.8-3 8.6 0 11.4" fill="none" stroke="#000" strokeOpacity="0.45" strokeWidth="1" />
      </g>
    </svg>
  );
}

export default function HomeArt({ art }: { art: StageArt }) {
  switch (art) {
    case 'pitch': return <PitchNight />;
    case 'tactics': return <TacticsBoard />;
    case 'stand': return <StandBuilder />;
    case 'court': return <CourtKey />;
    default: return null;
  }
}
