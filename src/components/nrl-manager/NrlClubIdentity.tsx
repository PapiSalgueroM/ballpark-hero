import { createContext, useCallback, useContext } from 'react';
import { nrlClubName, NRL_CLUB_COLOURS, type NrlCustomClub } from '@/lib/nrlClubIdentity';

export const NrlClubIdentity = createContext<NrlCustomClub | undefined>(undefined);

export function useNrlClubName(label: 'short' | 'full' = 'short') {
  const custom = useContext(NrlClubIdentity);
  return useCallback((year: number, id: string) => nrlClubName(year, id, custom, label), [custom, label]);
}

export function NrlCustomBadge({ name, colour }: Pick<NrlCustomClub, 'name' | 'colour'>) {
  const initials = name.split(/\s+/).slice(0, 2).map(word => Array.from(word)[0]).join('').toUpperCase();
  return (
    <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-bold text-white"
      style={{ backgroundColor: NRL_CLUB_COLOURS[colour] }}>{initials}</span>
  );
}
