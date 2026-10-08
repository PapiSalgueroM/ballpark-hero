import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BALLS_PER_RACK, CONTEST_RACKS, contestPoints, contestShotValue } from '@/lib/threePointContest';

export function ContestBalls({ outcomes, rack, currentShot, flying = false }: {
  outcomes: boolean[]; rack: number; currentShot?: number; flying?: boolean;
}) {
  return <div className="flex justify-center gap-2" data-contest-balls={currentShot === undefined ? 'recap' : 'live'} data-rack={rack + 1}
    role="group" aria-label={`Rack ${rack + 1} shots`}>
    {Array.from({ length: BALLS_PER_RACK }, (_, ball) => {
      const index = rack * BALLS_PER_RACK + ball;
      const outcome = outcomes[index];
      const status = outcome === true ? 'made' : outcome === false ? 'missed'
        : index === currentShot ? flying ? 'in-flight' : 'current' : 'upcoming';
      const value = contestShotValue(index);
      return <span key={ball} role="img" aria-label={`Ball ${ball + 1}, ${value === 2 ? 'money ball, 2 points' : '1 point'}, ${status === 'in-flight' ? 'in flight' : status}`}
        data-contest-ball-marker={ball + 1} data-ball-status={status}
        className={cn('flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors motion-reduce:transition-none',
          status === 'made' ? 'border-primary bg-primary/15 text-primary'
            : status === 'missed' ? 'border-border bg-muted text-muted-foreground'
              : status === 'current' || status === 'in-flight' ? 'border-gold bg-gold/20 text-gold' : 'border-border bg-card text-foreground')}>
        {status === 'made' ? `✓${value === 2 ? '2' : ''}` : status === 'missed' ? `×${value === 2 ? '2' : ''}` : status === 'in-flight' ? '⋯' : value}
      </span>;
    })}
  </div>;
}

export default function ContestScorecard({ outcomes }: { outcomes: boolean[] }) {
  const [selectedRack, setSelectedRack] = useState(0);
  return <section data-contest-scorecard className="mt-4 space-y-3 text-left" aria-label="Contest rack recap">
    <div>
      <h2 className="text-sm font-semibold">Your racks</h2>
      <p className="mt-1 text-xs text-muted-foreground">Pick a rack to revisit its shots. ✓ made, × missed.</p>
    </div>
    <div className="grid grid-cols-5 gap-1">
      {Array.from({ length: CONTEST_RACKS }, (_, rack) => {
        const points = outcomes.slice(rack * BALLS_PER_RACK, (rack + 1) * BALLS_PER_RACK)
          .reduce((total, made, ball) => total + contestPoints(rack * BALLS_PER_RACK + ball, made), 0);
        return <Button key={rack} variant={selectedRack === rack ? 'secondary' : 'outline'}
          className="h-auto min-h-[44px] min-w-[44px] flex-col gap-0 px-1 py-1 text-xs"
          data-contest-rack-select={rack + 1} data-rack-points={points} aria-pressed={selectedRack === rack}
          aria-label={`Rack ${rack + 1}, ${points} of 6 points`} onClick={() => setSelectedRack(rack)}>
          <span>Rack {rack + 1}</span><span className="tabular-nums">{points}/6</span>
        </Button>;
      })}
    </div>
    <ContestBalls outcomes={outcomes} rack={selectedRack} />
  </section>;
}
