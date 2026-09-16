import { useEffect, useState } from 'react';
import { FlagImg } from '@/components/FlagImg';
import { playerRating } from '@/lib/squadDeal';
import type { PackPlayer, PackTier } from '@/lib/fetchPackPool';
import { WalkoutBurst } from '@/components/mystery-box/WalkoutBurst';

const GLOW: Record<PackTier, string> = {
  superstar: 'border-purple-400 shadow-[0_0_32px_rgba(168,85,247,0.7)]',
  star: 'border-yellow-400 shadow-[0_0_28px_rgba(234,179,8,0.7)]',
  quality: 'border-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.55)]',
  squad: 'border-slate-400 shadow-[0_0_16px_rgba(148,163,184,0.4)]',
  fringe: 'border-stone-500 shadow-[0_0_12px_rgba(120,113,108,0.35)]',
};

const FACE: Record<PackTier, string> = {
  superstar: 'from-purple-900 via-fuchsia-800 to-amber-700',
  star: 'from-yellow-800 via-amber-600 to-yellow-500',
  quality: 'from-emerald-900 via-emerald-700 to-teal-600',
  squad: 'from-slate-800 via-slate-700 to-slate-600',
  fringe: 'from-stone-800 via-stone-700 to-stone-600',
};

const TIER_LABEL: Record<PackTier, string> = {
  superstar: 'SUPERSTAR',
  star: 'STAR',
  quality: 'QUALITY',
  squad: 'SQUAD',
  fringe: 'FRINGE',
};

interface HoloCardProps {
  player: PackPlayer;
  flipped: boolean;
  instant?: boolean;
  burst?: boolean;
  seed: number;
}

export function HoloCard({ player, flipped, instant = false, burst = false, seed }: HoloCardProps) {
  const [faceUp, setFaceUp] = useState(instant || !flipped);

  useEffect(() => {
    if (!flipped) {
      setFaceUp(false);
      return;
    }
    if (instant) {
      setFaceUp(true);
      return;
    }
    setFaceUp(false);
    let inner = 0;
    const id = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setFaceUp(true));
    });
    return () => {
      cancelAnimationFrame(id);
      cancelAnimationFrame(inner);
    };
  }, [flipped, instant, player.name]);

  return (
    <div className="relative mx-auto w-[210px] max-w-full" data-holo-card data-tier={player.tier} data-flipped={faceUp ? 'yes' : 'no'}>
      <WalkoutBurst active={burst && faceUp && !instant} tier={player.tier} seed={seed} />
      <div className="[perspective:1100px]">
        <div
          className="relative h-[300px] w-full"
          style={{
            transformStyle: 'preserve-3d',
            WebkitTransformStyle: 'preserve-3d',
            transform: faceUp ? 'rotateY(0deg)' : 'rotateY(180deg)',
            transition: instant ? 'none' : 'transform 720ms cubic-bezier(0.2, 0.75, 0.2, 1)',
          }}
        >
          <div
            className={`absolute inset-0 overflow-hidden rounded-2xl border-2 bg-gradient-to-br ${FACE[player.tier]} ${GLOW[player.tier]}`}
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-70 mix-blend-overlay"
              style={{
                background:
                  'linear-gradient(115deg, transparent 15%, rgba(255,255,255,0.45) 38%, rgba(192,132,252,0.4) 50%, rgba(255,255,255,0.3) 62%, transparent 85%)',
                backgroundSize: '220% 100%',
                animation: instant ? 'none' : 'mbHoloSweep 2.4s ease-in-out infinite',
              }}
            />
            <div className="relative flex h-full flex-col items-center justify-between p-4 text-center">
              <span className="rounded-full border border-white/30 bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                {TIER_LABEL[player.tier]}
              </span>
              <div>
                <p className="font-display text-5xl font-black text-white/90">{player.position}</p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <FlagImg name={player.nationality} size={20} />
                  <p className="font-display text-lg font-black leading-tight text-white">{player.name}</p>
                </div>
                <p className="mt-1 text-xs text-white/80">
                  {player.club} · {player.age > 0 ? `${player.age}y` : '-'}
                </p>
              </div>
              <div>
                <p className="font-display text-4xl font-black text-white">{playerRating(player)}</p>
                <p className="text-sm font-semibold text-amber-200">€{player.marketValue}M</p>
              </div>
            </div>
          </div>

          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 border-amber-400/70 bg-gradient-to-br from-slate-900 to-slate-800"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <p className="text-5xl" aria-hidden>📦</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-widest text-amber-200">Sealed pack</p>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes mbHoloSweep {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes mbHoloSweep {
            0%, 100% { background-position: 50% 50%; }
          }
        }
      `}</style>
    </div>
  );
}
