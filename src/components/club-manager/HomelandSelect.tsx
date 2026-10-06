import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FlagImg } from '@/components/FlagImg';
import { managerHomelands } from '@/lib/clubManager';
import { groupByConfederation } from '@/lib/confederationGroups';

/**
 * Round 965: the manager's homeland, any nation the international engine runs
 * rather than the nineteen league nations, grouped by confederation the way
 * Soccer Career's own nationality picker groups them (Round 453). A dropdown
 * rather than a wall of tiles, because a hundred and forty buttons is a long
 * page and the house rule is small tiles. Open it on managerHomelandFor(...),
 * which maps a league nation onto the engine's spelling.
 */
export default function HomelandSelect({ value, onChange, labelledBy }: { value: string; onChange: (n: string) => void; labelledBy?: string }) {
  const groups = groupByConfederation(managerHomelands(), n => n);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-background" aria-labelledby={labelledBy} data-manager-homeland>
        <SelectValue placeholder="Choose a homeland" />
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-72">
        {groups.map(g => (
          <SelectGroup key={g.conf}>
            <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{g.label}</SelectLabel>
            {g.items.map(n => (
              <SelectItem key={n} value={n}>
                <span className="flex items-center gap-2">{n}<FlagImg name={n} size={16} /></span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
