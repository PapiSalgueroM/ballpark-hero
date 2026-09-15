import type { ReactNode } from 'react';

/** Presentation over an already awarded trophy. No timers, credits or delayed text. */
export default function VictoryMoment({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <div className={`victory-moment${compact ? ' victory-compact' : ''}`} data-victory-moment>
      <svg className="victory-art" viewBox="0 0 72 72" aria-hidden="true" focusable="false">
        <g className="victory-rays" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M36 7v5M12 17l4 4M60 17l-4 4M7 37h6M65 37h-6" />
        </g>
        <ellipse className="victory-shadow" cx="36" cy="65" rx="19" ry="3" fill="currentColor" opacity=".15" />
        <g className="victory-cup">
          <path d="M24 25H14v6c0 9 5 13 13 13M48 25h10v6c0 9-5 13-13 13" fill="none" stroke="currentColor" strokeWidth="4" />
          <g className="victory-ribbons" fill="currentColor" opacity=".55">
            <path d="M16 29h5l-1 24-4-4-4 3zM51 29h5l4 23-4-3-4 4z" />
          </g>
          <path d="M23 19h26v17c0 9-5 15-13 15s-13-6-13-15z" fill="currentColor" />
          <path d="M28 24v11c0 5 2 8 5 10" fill="none" stroke="white" strokeOpacity=".55" strokeWidth="2" strokeLinecap="round" />
          <path d="M33 49h6v9h7v5H26v-5h7z" fill="currentColor" />
          <path d="m36 27 2 4 5 .6-3.5 3.3.9 4.7-4.4-2.3-4.4 2.3.9-4.7-3.5-3.3 5-.6z" fill="black" fillOpacity=".2" />
        </g>
      </svg>
      <div className="victory-copy">{children}</div>
      <style>{`
        .victory-moment { position: relative; display: flex; align-items: center; justify-content: center; gap: 8px; isolation: isolate; overflow: hidden; border-radius: inherit; }
        .victory-moment::before { content: ''; position: absolute; inset: 0; z-index: -1; pointer-events: none; background: linear-gradient(110deg, transparent 25%, currentColor 50%, transparent 75%); opacity: 0; transform: translateX(-110%); animation: victory-light 1050ms ease-out 1 both; }
        .victory-art { flex: 0 0 64px; width: 64px; height: 64px; overflow: hidden; pointer-events: none; }
        .victory-compact .victory-art { flex-basis: 40px; width: 40px; height: 40px; }
        .victory-copy { min-width: 0; overflow-wrap: anywhere; }
        .victory-cup { transform-origin: 36px 56px; animation: victory-lift 900ms cubic-bezier(.2,.75,.3,1) 1 both; }
        .victory-ribbons { transform-origin: 36px 29px; animation: victory-ribbon 1050ms ease-out 1 both; }
        .victory-rays { transform-origin: 36px 37px; animation: victory-rays 1050ms ease-out 1 both; }
        .victory-shadow { transform-origin: 36px 65px; animation: victory-shadow 900ms ease-out 1 both; }
        @keyframes victory-lift { 0% { transform: translateY(16px) rotate(-12deg) scale(.82); } 55% { transform: translateY(-3px) rotate(4deg) scale(1.04); } 78% { transform: translateY(1px) rotate(-2deg); } 100% { transform: none; } }
        @keyframes victory-ribbon { 0%, 25% { transform: scaleY(.2); } 65% { transform: scaleY(1.12); } 100% { transform: none; } }
        @keyframes victory-rays { 0%, 35% { opacity: 0; transform: scale(.7); } 65% { opacity: .8; transform: scale(1.05); } 100% { opacity: .35; transform: none; } }
        @keyframes victory-shadow { 0% { transform: scaleX(.6); } 100% { transform: none; } }
        @keyframes victory-light { 0% { opacity: 0; transform: translateX(-110%); } 40% { opacity: .12; } 100% { opacity: 0; transform: translateX(110%); } }
        @media (prefers-reduced-motion: reduce) {
          .victory-cup, .victory-ribbons, .victory-rays, .victory-shadow { animation: none; transform: none; }
          .victory-rays { opacity: .35; }
          .victory-moment::before { animation: none; opacity: 0; transform: none; }
        }
      `}</style>
    </div>
  );
}
