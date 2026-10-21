import type { DerivedGame } from '@/lib/season/core';
import { scoreAt, type ClockStageAt } from '@/components/season-centre/MatchClock';

interface Props { game: DerivedGame; at: ClockStageAt; usName: string; themName: string }

function Figure({ x, color, highlight = false }: { x: number; color: string; highlight?: boolean }) {
  return <g transform={`translate(${x} 88)`}>
    {highlight && <circle r="25" fill={color} opacity="0.18" data-court-player-hot />}
    <circle cy="-10" r="7" fill={color} />
    <path d="M-12 12 Q-12 0 0 0 Q12 0 12 12 L9 22 H-9Z" fill={color} />
    <path d="M-6 22 L-9 34 M6 22 L9 34" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
  </g>;
}

export function MiniBasketballCourt({ game, at, usName, themName }: Props) {
  const shown = Math.min(48, Math.max(0, at.shown));
  const quarter = Math.min(4, Math.max(1, Math.ceil(shown / 12)));
  const [us, them] = scoreAt(game.events, shown);
  const home = game.home ? { name: usName, score: us, mine: true } : { name: themName, score: them, mine: false };
  const away = game.home ? { name: themName, score: them, mine: false } : { name: usName, score: us, mine: true };
  const hot = game.played && game.events.some(e => e.kind === 'hot' && e.mine && e.side === 'us' && e.min <= shown && Math.ceil(e.min / 12) === quarter);
  const lead = us === them ? `Level at ${us}-${them}` : `${us > them ? usName : themName} lead by ${Math.abs(us - them)}`;
  const participation = game.played ? (hot ? 'Your recorded hot quarter' : 'Your team is on court') : game.why === 'injured' ? 'You are out injured' : 'You are resting';
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-amber-300/20 bg-amber-950/15" data-nba-court data-score={`${us}-${them}`} data-quarter={quarter}>
      <div className="flex items-center justify-between gap-2 px-3 pt-2 text-[11px] font-semibold text-muted-foreground">
        <span>{shown >= 48 ? 'Final' : `Quarter ${quarter}`}</span><span>Quarter recap</span>
      </div>
      <div className="grid grid-cols-2 gap-3 px-3 pt-1 text-xs font-bold">
        <div className="min-w-0 break-words" data-court-home><span className="block text-[10px] font-normal text-muted-foreground">Home</span>{home.name}{home.mine ? ' (you)' : ''}<span className="ml-1 text-muted-foreground">{home.score}</span></div>
        <div className="min-w-0 break-words text-right" data-court-away><span className="block text-[10px] font-normal text-muted-foreground">Away</span>{away.name}{away.mine ? ' (you)' : ''}<span className="ml-1 text-muted-foreground">{away.score}</span></div>
      </div>
      <svg viewBox="0 0 500 166" className="block w-full" role="img" aria-label="Basketball court recap">
        <rect x="10" y="8" width="480" height="150" rx="5" fill="#bd8a50" />
        <path d="M10 8H250V158H10Z" fill="#0f766e" opacity="0.12" />
        <path d="M250 8H490V158H250Z" fill="#ea580c" opacity="0.12" />
        <g fill="none" stroke="#fff4dc" strokeWidth="1.5" opacity="0.85">
          <rect x="20" y="18" width="460" height="130" rx="2" />
          <path d="M250 18V148 M20 49H87V117H20 M480 49H413V117H480" />
          <circle cx="250" cy="83" r="24" /><circle cx="87" cy="83" r="20" /><circle cx="413" cy="83" r="20" />
          <path d="M20 24H45C154 24 154 142 45 142H20 M480 24H455C346 24 346 142 455 142H480" />
          <path d="M32 72V94 M468 72V94" strokeWidth="3" /><circle cx="40" cy="83" r="6" /><circle cx="460" cy="83" r="6" />
        </g>
        <Figure x={185} color="#0f3d3a" highlight={hot && home.mine} />
        <Figure x={315} color="#7c2d12" highlight={hot && away.mine} />
      </svg>
      <p className="px-3 text-center text-xs font-bold" data-court-summary>{lead}</p>
      <div className="grid grid-cols-4 gap-1 px-3 pt-2 text-center text-[11px]" aria-label="Quarter scores">
        {[1, 2, 3, 4].map(q => {
          const revealed = q * 12 <= shown;
          const points = (side: 'us' | 'them') => game.events.filter(e => e.kind === 'quarter' && e.side === side && e.min === q * 12 && e.min <= shown).reduce((sum, e) => sum + (e.pts ?? 0), 0);
          const first = game.home ? 'us' : 'them';
          const second = game.home ? 'them' : 'us';
          return <div key={q} className="rounded-md bg-background/40 py-1" data-court-quarter={q} data-revealed={revealed ? 'true' : 'false'}>
            <div className="text-muted-foreground">Q{q}</div><div className="font-bold tabular-nums">{revealed ? `${points(first)}-${points(second)}` : '?'}</div>
          </div>;
        })}
      </div>
      <p className="px-3 pt-2 text-center text-[11px] font-semibold text-muted-foreground" data-court-participation>{participation}</p>
      <p className="px-3 pb-2 pt-1 text-center text-[10px] leading-snug text-muted-foreground">Scores update each quarter. Figures are an illustration, not play-by-play.</p>
    </section>
  );
}
