import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NRL_SEASONS, type NrlYear } from '@/data/nrlManager2026';
import { NrlCustomBadge } from '@/components/nrl-manager/NrlClubIdentity';
import { nrlCustomClubIssue, NRL_CLUB_COLOURS, type NrlCustomClub } from '@/lib/nrlClubIdentity';

const field = 'min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function NrlCustomClubForm({ year, disabled, onStart }: {
  year: NrlYear; disabled: boolean; onStart: (club: NrlCustomClub) => void;
}) {
  const [name, setName] = useState('');
  const [ground, setGround] = useState('');
  const [colour, setColour] = useState<NrlCustomClub['colour']>('teal');
  const [slotId, setSlot] = useState('');
  const [attempted, setAttempted] = useState(false);
  const clubs = NRL_SEASONS[year].clubs;
  const slot = clubs.find(club => club.id === slotId);
  const spec = { name: name.trim(), ground: ground.trim(), colour, slotId };
  const issue = nrlCustomClubIssue(spec) ?? (slot ? null : 'Choose a league slot.');
  return (
    <details className="group rounded-xl border border-border bg-card px-4">
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span>Create a club</span><ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
      </summary>
      <form className="space-y-3 pb-4" onSubmit={event => {
        event.preventDefault();
        setAttempted(true);
        if (!disabled && !issue) onStart(spec);
      }}>
        <p className="text-sm text-muted-foreground">Build a fictional club with a generated squad. It replaces one club in this career’s simulated competition.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-semibold">
            <span>Club name</span>
            <input className={field} maxLength={26} value={name} onChange={event => setName(event.target.value)} disabled={disabled} />
          </label>
          <label className="space-y-1 text-sm font-semibold">
            <span>Home ground</span>
            <input className={field} maxLength={40} value={ground} onChange={event => setGround(event.target.value)} disabled={disabled} />
          </label>
          <label className="space-y-1 text-sm font-semibold" htmlFor="nrl-custom-colour">
            <span>Club colour</span>
            <select id="nrl-custom-colour" className={field} value={colour}
              onChange={event => setColour(event.target.value as NrlCustomClub['colour'])} disabled={disabled}>
              {Object.keys(NRL_CLUB_COLOURS).map(option => <option key={option} value={option}>{option[0].toUpperCase() + option.slice(1)}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm font-semibold" htmlFor="nrl-custom-slot">
            <span>League slot</span>
            <select id="nrl-custom-slot" className={field} value={slot?.id ?? ''} onChange={event => setSlot(event.target.value)} disabled={disabled}>
              <option value="">Choose a slot</option>
              {clubs.map(club => <option key={club.id} value={club.id}>{club.name}</option>)}
            </select>
          </label>
        </div>
        {slot && <p className="text-sm text-muted-foreground">Your club inherits the simulated {slot.name} slot, with the same starting strength, fixture pattern and salary cap.</p>}
        {spec.name && <div className="flex items-center gap-2 text-sm font-bold">
          <NrlCustomBadge name={spec.name} colour={colour} /><span className="min-w-0 break-words">{spec.name}</span>
        </div>}
        {attempted && issue && <p role="alert" className="text-sm text-destructive">{issue}</p>}
        <Button type="submit" size="lg" disabled={disabled}>Start custom career</Button>
      </form>
    </details>
  );
}
