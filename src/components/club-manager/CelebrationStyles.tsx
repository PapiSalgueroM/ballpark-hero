/* Round 423: honour the setting the visitor already made.
         This kit is the site's celebration layer: ResultScreen uses it, and 75
         games end on ResultScreen, so somebody who asked their operating system
         for less motion was getting 28 pieces of confetti and a slamming emoji
         from most of the site. Two components in this repo already do this
         properly (TacticsScreen and ConquestMap), so the convention existed and
         the shared kit was the one place missing it.
         The rules END on their final frame rather than being removed: several of
         these start at opacity 0 and animate IN, so simply cancelling them would
         leave the headline and the stat row invisible, which is a worse bug than
         the one being fixed. The confetti is the only thing that truly stops,
         because it is decoration and carries no content. */

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


      @media (prefers-reduced-motion: reduce) {
        .cm-rise, .cm-slam, .cm-tick-in { animation: none; opacity: 1; transform: none; }
        .cm-win-pulse, .cm-loss-shake, .cm-gold-glow { animation: none; }
      }
    `}</style>
  );
}
