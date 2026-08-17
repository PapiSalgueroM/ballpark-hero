/**
 * Round 147: shared celebration pieces for Club Manager, the animation pass
 * he asked for twice ("Add more animation especially to the idle game...
 * and all the games"). Same technique as Stadium Tycoon's confetti: pure
 * CSS keyframes, deterministic positions so renders are stable, transforms
 * and opacity only so the no-scroll rule cannot be broken by a celebration.
 */

/** Deterministic [0,1) from an index, so confetti never reshuffles mid-fall. */
function det(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const PIECE_COLORS = ['#22c55e', '#eab308', '#3b82f6', '#ef4444', '#a855f7', '#f97316', '#facc15'];

/**
 * A one-shot confetti burst that fills its nearest positioned ancestor.
 * Give it a changing `seed` to re-fire; same seed, same fall, every render.
 */
export function ConfettiBurst({ seed = 1, count = 30 }: { seed?: number; count?: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const k = i + seed * 97;
        return (
          <span
            key={i}
            className="absolute -top-2 w-1.5 h-2.5 cm-confetti"
            style={{
              left: `${4 + det(k) * 92}%`,
              backgroundColor: PIECE_COLORS[i % PIECE_COLORS.length],
              animationDuration: `${1.1 + det(k * 3) * 1.2}s`,
              animationDelay: `${det(k * 7) * 0.35}s`,
              transform: `rotate(${Math.floor(det(k * 13) * 360)}deg)`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes cmConfettiFall {
          0% { opacity: 0; transform: translateY(-10px) rotate(0deg); }
          8% { opacity: 1; }
          100% { opacity: 0; transform: translateY(240px) rotate(560deg); }
        }
        .cm-confetti { animation-name: cmConfettiFall; animation-timing-function: ease-in; animation-fill-mode: forwards; }
      `}</style>
    </div>
  );
}

/** The keyframes the match report's staged reveal leans on, mounted once. */
export function CelebrationStyles() {
  return (
    <style>{`
      @keyframes cmRise { 0% { opacity: 0; transform: translateY(7px); } 100% { opacity: 1; transform: translateY(0); } }
      .cm-rise { opacity: 0; animation: cmRise 0.45s ease-out forwards; }
      @keyframes cmSlam { 0% { opacity: 0; transform: scale(1.6); } 60% { opacity: 1; transform: scale(0.94); } 100% { opacity: 1; transform: scale(1); } }
      .cm-slam { opacity: 0; animation: cmSlam 0.4s cubic-bezier(0.2, 0.8, 0.3, 1.2) forwards; }
      @keyframes cmWinPulse { 0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.45); } 100% { box-shadow: 0 0 0 26px rgba(34,197,94,0); } }
      .cm-win-pulse { animation: cmWinPulse 0.9s ease-out 1; }
      @keyframes cmLossShake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 55% { transform: translateX(3px); } 80% { transform: translateX(-2px); } }
      .cm-loss-shake { animation: cmLossShake 0.4s ease-in-out 1; }
      @keyframes cmGoldGlow { 0%, 100% { box-shadow: 0 0 8px rgba(234,179,8,0.35); } 50% { box-shadow: 0 0 22px rgba(234,179,8,0.75); } }
      .cm-gold-glow { animation: cmGoldGlow 1.5s ease-in-out infinite; }
      @keyframes cmTickIn { 0% { opacity: 0; transform: translateX(-6px); } 100% { opacity: 1; transform: translateX(0); } }
      .cm-tick-in { opacity: 0; animation: cmTickIn 0.35s ease-out forwards; }
    `}</style>
  );
}
