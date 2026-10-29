import { useEffect, useRef, useState } from 'react';
import type { CareerState } from '@/lib/soccerCareerEngine';
import { managerSeasonFocusAvailable, readManagerSeasonFocus, type ManagerSeasonFocusChoice } from '@/lib/soccerCareerManagerFocus';
import { useRevealScroll } from '@/hooks/useRevealScroll';

export default function SoccerManagerSeasonFocus({ career, blocked, onChoose, onBack }: {
  career: CareerState; blocked: boolean; onChoose?: (choice: ManagerSeasonFocusChoice) => void; onBack: () => void;
}) {
  const [help, setHelp] = useState(false);
  const root = useRevealScroll<HTMLDivElement>('manager-focus-' + career.managerState?.season + '-' + help, { skipFirst: false });
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [help, career.managerState?.season]);
  const focus = readManagerSeasonFocus(career) ?? 'balanced', available = managerSeasonFocusAvailable(career);
  const choices: { value: ManagerSeasonFocusChoice; title: string; copy: string }[] = [
    { value: 'balanced', title: 'Balanced', copy: 'Keep the usual preparation for both competitions.' },
    { value: 'league', title: 'League focus', copy: 'More league preparation, less cup preparation.' },
    { value: 'cup', title: 'Cup focus', copy: 'More cup preparation, less league preparation.' },
  ];
  return <div ref={root} className="rounded-xl border border-emerald-500/40 bg-card p-3 space-y-3">
    {help ? <section aria-label="Season focus help" className="space-y-3 text-xs">
      <h4 ref={heading} tabIndex={-1} className="font-bold text-sm">Season focus help</h4>
      <p>Preparing for the league adds a little to the table calculation and takes the same amount from the cup. Preparing for the cup does the reverse.</p>
      <p>Example: if your usual chance of winning a cup round is 50%, League focus makes it 47% and Cup focus makes it 53%. A preparation edge is not a guaranteed league point, position or trophy.</p>
      <p>The choice lasts for one played club season. The result records what you used, then your next season starts Balanced. Selecting preparation does not reroll a season.</p>
      <button onClick={() => setHelp(false)} className="min-h-11 w-full rounded-lg border border-border p-2 font-bold">Back</button>
    </section> : <>
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="min-h-11 rounded-lg border border-border px-3 text-xs font-bold">Back</button>
        <h4 ref={heading} tabIndex={-1} className="flex-1 font-bold text-sm">Season focus</h4>
        <button aria-label="Season focus help" onClick={() => setHelp(true)} className="min-h-11 min-w-11 rounded-lg border border-border p-2 text-xs">?</button>
      </div>
      <p className="text-xs text-muted-foreground">Choose preparation for your next club season. Balanced keeps the usual simulation.</p>
      <div className="grid grid-cols-1 min-[390px]:grid-cols-3 gap-2">
        {choices.map(choice => <button key={choice.value} aria-pressed={focus === choice.value}
          disabled={blocked || !available || !onChoose}
          onClick={() => { onChoose?.(choice.value); onBack(); }}
          className="min-h-24 rounded-lg border border-border bg-muted/20 p-3 text-left disabled:opacity-50">
          <span className="block text-sm font-bold">{choice.title}</span>
          <span className="mt-1 block text-xs text-muted-foreground">{choice.copy}</span>
        </button>)}
      </div>
      {blocked && <p className="text-xs text-muted-foreground">Resolve your pending job decision before changing preparation.</p>}
      {!available && <p className="text-xs text-muted-foreground">Choose preparation while you are employed at a club.</p>}
    </>}
  </div>;
}
