/* Round 1500: the dirty money desk, opened from "Deal with it" under the heat meter of all four US My Careers.

   Player report (/nba-my-career, 2026-10-16): "i got shady money and i want to wash it". Four ways out, each tile
   printing every number it will apply (src/lib/careerDirtyMoneyDesk.ts previewDirty, from the numbers the apply runs),
   and a second tap on the same card before anything happens ("Do it" or "Back"): one tap is never enough to spend
   the money. This screen applies the choice by the shared rule and hands the board the dealt career to write to the
   feed and save; it then shows the result once and "Back to your career".

   Loaded with the moment it belongs to (a lazy chunk of the board), and imports no sport (scripts/
   simUsCareerWeight.mjs fences src/components/us-career). NO SCROLL RULE: the card that changes pulls itself into
   view through useRevealScroll, as the board's own panels do. */
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import { useTapSettle } from '@/hooks/useTapSettle';
import { DIRTY_WAYS, canDealWithDirtyMoney, dirtyHeld, moneyText, type DirtyMoneyHost, type DirtyWay } from '@/lib/careerDirtyMoney';
import { dealWithDirtyMoney, previewDirty } from '@/lib/careerDirtyMoneyDesk';

const WAY_COPY: Record<DirtyWay, { emoji: string; title: string }> = {
  clean: { emoji: '\u{1F9FE}', title: 'Come clean' },
  give: { emoji: '\u{1F91D}', title: 'Give it away' },
  quiet: { emoji: '\u{1F910}', title: 'Keep it quiet' },
  wash: { emoji: '\u{1F9FC}', title: 'Wash it' },
};

export interface DirtyMoneyDeskResult { line: string; caught: boolean | null }

export interface DirtyMoneyDeskProps {
  career: DirtyMoneyHost;
  /** Takes the career the desk dealt (dealWithDirtyMoney of `career`: the same career spread, its money fields
   *  changed) and its feed line, and saves it. The rule runs here, in the desk's lazy chunk, so the board's first
   *  load does not carry the desk's words (the Round 1500 review's weight finding). */
  onDealt: (state: DirtyMoneyHost, line: string) => void;
  onClose: () => void;
}

const backButton = 'min-h-11 w-full rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground hover:bg-secondary';

export default function DirtyMoneyDesk({ career, onDealt, onClose }: DirtyMoneyDeskProps) {
  const [picked, setPicked] = useState<DirtyWay | null>(null);
  const [result, setResult] = useState<DirtyMoneyDeskResult | null>(null);
  /* One shot: two clicks in the same frame must not deal twice (the board reads the career of this render). */
  const dealt = useRef(false);
  /* Picking a way moves its card, and "Do it", to where the finger was (Round 1346's double tap lesson): the
     second tap of a double tap on a tile must never be taken as "Do it". */
  const tap = useTapSettle();
  const cardRef = useRevealScroll<HTMLDivElement>(`${picked ?? 'all'}:${result ? 'done' : 'open'}`);

  if (result) {
    return (
      <div ref={cardRef} data-dirty-money-result={result.caught ? 'caught' : 'done'}
        className={cn('cm-rise space-y-3 rounded-2xl border p-4', result.caught ? 'border-destructive/40 bg-destructive/5' : 'border-primary/30 bg-card')}>
        <p className="text-sm font-bold leading-snug text-foreground">{result.line}</p>
        <button onClick={onClose} className={backButton}>Back to your career</button>
      </div>
    );
  }
  if (!canDealWithDirtyMoney(career)) {
    return (
      <div ref={cardRef} className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">You are not holding any dirty money right now.</p>
        <button onClick={onClose} className={backButton}>Back to your career</button>
      </div>
    );
  }

  const doIt = (way: DirtyWay) => {
    if (dealt.current || !tap.settled()) return;
    if (way === 'quiet') { onClose(); return; }
    dealt.current = true;
    const r = dealWithDirtyMoney(career, way);
    if (!r.line) { onClose(); return; }
    onDealt(r.state, r.line);
    setResult({ line: r.line, caught: r.caught });
  };

  const ways = picked ? [picked] : DIRTY_WAYS;
  return (
    <div ref={cardRef} className="space-y-2">
      <p className="text-[11px] leading-snug text-muted-foreground">
        {`$${moneyText(dirtyHeld(career))} nobody can explain, heat ${Math.round(career.heat ?? 0)}. Every way shows exactly what it does before you choose.`}
      </p>
      <div className={cn('grid gap-2', !picked && 'sm:grid-cols-2')}>
        {ways.map(way => {
          const p = previewDirty(career, way);
          const copy = WAY_COPY[way];
          const lines = p.lines.map(line => <span key={line} className="block text-[11px] leading-snug text-muted-foreground">{line}</span>);
          if (!picked) {
            return (
              <button key={way} data-dirty-way={way} onClick={() => { tap.mark(); setPicked(way); }}
                className="flex min-h-11 flex-col justify-start rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/40">
                <span className="mb-1 block text-xs font-bold text-foreground">{`${copy.emoji} ${copy.title}`}</span>
                {lines}
              </button>
            );
          }
          return (
            <div key={way} data-dirty-way={way} className="cm-rise space-y-2 rounded-2xl border border-primary/30 bg-card p-3">
              <p className="text-xs font-bold text-foreground">{`${copy.emoji} ${copy.title}`}</p>
              <div>{lines}</div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setPicked(null)} className={backButton}>Back</button>
                <button data-dirty-do={way} onClick={() => doIt(way)}
                  className="min-h-11 w-full rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground hover:opacity-90 active:scale-95">
                  {way === 'quiet' ? 'Keep it' : 'Do it'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
