import { useEffect, useRef, useState } from 'react';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import type { CareerDecisionOutcomeData } from '@/lib/usCareerDecisionOutcome';

export default function CareerDecisionOutcome({ outcome, onContinue }: {
  outcome: CareerDecisionOutcomeData;
  onContinue: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const more = useRef<HTMLButtonElement>(null);
  const area = useRevealScroll<HTMLElement>(outcome, { skipFirst: false });
  const shown = expanded ? outcome.changes : outcome.changes.slice(0, 4);

  useEffect(() => { title.current?.focus({ preventScroll: true }); }, [outcome]);
  useEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        const node = area.current;
        if (!node) return;
        if (expanded && body.current && more.current) {
          const bottom = more.current.getBoundingClientRect().bottom;
          const edge = body.current.getBoundingClientRect().bottom;
          if (bottom > edge) body.current.scrollTop += bottom - edge;
        }
        const box = node.getBoundingClientRect();
        if (box.top >= 0 && box.bottom <= window.innerHeight) return;
        node.style.scrollMarginTop = '12px';
        node.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      });
    });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [outcome, expanded, area]);

  return <section ref={area} data-career-decision-outcome="" data-no-prerender="" aria-labelledby="career-decision-title"
    className="mx-auto flex max-h-[calc(100svh-24px)] max-w-lg flex-col overflow-hidden rounded-2xl border border-primary/30 bg-card">
    <div className="shrink-0 border-b border-border bg-primary/10 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Your decision</p>
      <h2 ref={title} id="career-decision-title" tabIndex={-1} data-decision-title="" className="mt-1 break-words font-display text-lg font-bold">{outcome.title}</h2>
      <p data-decision-choice="" className="mt-2 break-words text-sm"><span className="text-muted-foreground">You chose: </span><strong>{outcome.choice}</strong></p>
    </div>
    <div ref={body} data-decision-body="" className="min-h-0 overflow-y-auto p-3">
      {outcome.changes.length ? <dl className="grid grid-cols-2 gap-2">
        {shown.map(change => <div key={change.key} data-decision-change={change.key} className={`min-w-0 rounded-xl bg-secondary/50 p-2.5 ${change.key === 'team' ? 'col-span-2' : ''}`}>
          <dt className="text-xs text-muted-foreground">{change.label}</dt>
          <dd className="mt-1 break-words text-sm tabular-nums"><span data-change-before="">{change.before}</span><span aria-hidden="true"> → </span><span className="sr-only"> to </span><strong data-change-after="">{change.after}</strong></dd>
          {change.delta !== null && <dd data-change-delta="" className="mt-1 text-xs font-semibold tabular-nums">{change.delta}</dd>}
        </div>)}
      </dl> : <p data-decision-unchanged="" className="text-sm text-muted-foreground">No rating, money, team or status changes to show.</p>}
      {outcome.changes.length > 4 && <button ref={more} data-decision-more="" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}
        className="mt-2 min-h-11 w-full rounded-xl border border-border px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        {expanded ? 'Show fewer changes' : `Show all ${outcome.changes.length} changes`}
      </button>}
    </div>
    <div className="shrink-0 border-t border-border p-3">
      <button data-decision-continue="" onClick={onContinue} className="min-h-11 w-full rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Continue</button>
    </div>
  </section>;
}
