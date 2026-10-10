import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { marketWheelPosition, type MarketWheel } from '@/lib/usCareerMarket';

interface Props { wheel: MarketWheel; onContinue: () => void }
const words = { raised: 'Raise request accepted', held: 'Offer held', withdrawn: 'Offer withdrawn' };
const percent = (n: number) => `${Math.round(n * 1000) / 10}%`;
export default function MarketChanceWheel({ wheel, onContinue }: Props) {
  const [stage, setStage] = useState<'ready' | 'spinning' | 'revealed'>(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'revealed' : 'ready');
  const result = useRef<HTMLParagraphElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => { if (stage === 'ready') heading.current?.focus({ preventScroll: true }); }, []);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { if (stage === 'revealed') result.current?.focus({ preventScroll: true }); }, [stage]);
  const reveal = () => { if (timer.current) clearTimeout(timer.current); setStage('revealed'); };
  const spin = () => {
    if (stage !== 'ready') return;
    setStage('spinning');
    timer.current = setTimeout(reveal, 1200);
  };
  const raised = wheel.probabilities.raised * 100;
  const held = (wheel.probabilities.raised + wheel.probabilities.held) * 100;
  const turn = 1080 + marketWheelPosition(wheel) * 360;
  return <section className="space-y-3 rounded-2xl border border-primary/40 bg-card p-4" data-market-wheel data-market-result={stage === 'revealed' ? wheel.result : 'waiting'}>
    <h2 ref={heading} tabIndex={-1} className="text-center text-base font-bold">Negotiation with {wheel.label}</h2>
    <p className="text-center text-xs text-muted-foreground">These are this game's negotiation chances. Your one negotiation is already saved. Spin or skip to reveal it; neither changes the outcome.</p>
    <div className="relative mx-auto h-36 w-36 rounded-full border-4 border-border" aria-hidden="true"
      style={{ background: `conic-gradient(#22c55e 0% ${raised}%, #eab308 ${raised}% ${held}%, #ef4444 ${held}% 100%)` }}>
      <div className="absolute inset-0 flex justify-center" style={{ transform: `rotate(${stage === 'ready' ? 0 : turn}deg)`, transition: stage === 'spinning' ? 'transform 1.2s ease-out' : 'none' }}>
        <span className="mt-1 h-5 w-1 rounded-full bg-foreground" />
      </div>
    </div>
    <ul className="grid grid-cols-3 gap-2 text-center text-[11px]">
      <li>Raise accepted<br /><strong>{percent(wheel.probabilities.raised)}</strong></li>
      <li>Held<br /><strong>{percent(wheel.probabilities.held)}</strong></li>
      <li>Withdrawn<br /><strong>{percent(wheel.probabilities.withdrawn)}</strong></li>
    </ul>
    {stage === 'revealed' ? <>
      <p ref={result} role="status" tabIndex={-1} className="rounded-lg bg-secondary p-3 text-center text-sm font-bold" data-market-wheel-outcome>{words[wheel.result]}</p>
      <button type="button" data-market-continue onClick={onContinue} className="min-h-11 w-full rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">Continue to the offers</button>
    </> : <div className="grid grid-cols-2 gap-2">
      <button type="button" data-market-spin disabled={stage !== 'ready'} onClick={spin} className="min-h-11 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">{stage === 'spinning' ? 'Revealing...' : 'Spin'}</button>
      <button type="button" data-market-skip onClick={reveal} className="min-h-11 rounded-xl border border-border px-3 py-2 text-sm font-semibold">Skip animation</button>
    </div>}
  </section>;
}
