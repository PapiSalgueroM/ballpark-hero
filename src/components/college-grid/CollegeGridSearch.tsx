import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PlayerAutocomplete } from '@/components/game/PlayerAutocomplete';
import type { PlayerEntity } from '@/lib/playerSearch';
import { COLLEGE_GRID_PLAYER_SOURCE, warmCollegeSearch } from '@/lib/collegeGridKey';

/* One identity for the page's life, so PlayerAutocomplete's options memo holds. */
const SEARCH_OPTIONS = { source: COLLEGE_GRID_PLAYER_SOURCE };

interface Props {
  onSelect: (name: string) => void;
  disabled: boolean;
}

export function CollegeGridSearch({ onSelect, disabled }: Props) {
  const [input, setInput] = useState('');

  /* Round 1105: fold the name list when the box opens, not on the third letter typed. */
  useEffect(() => { warmCollegeSearch(); }, []);

  const handleSelect = (entity: PlayerEntity) => {
    /* The stored display name, exactly as the key spells it (the entity's
       name is title cased for the list). */
    onSelect(entity.rawName || entity.name);
    setInput('');
  };

  return (
    <div className="relative flex gap-2 w-full max-w-md mx-auto items-start">
      <div className="flex-1">
        {/* Round 611: the search box offers the answer key's own display
            names (with a school or a season span after a name two or more
            players share), so every name it offers is one the board can
            judge. Round 1105: the names come from the key file that ships
            with the page and are held in memory, so a search makes no
            request and there is nothing to wait for between keystrokes. */}
        <PlayerAutocomplete
          value={input}
          onChange={setInput}
          onSelect={handleSelect}
          searchOptions={SEARCH_OPTIONS}
          debounceMs={0}
          placeholder="Type a player name..."
          disabled={disabled}
          autoFocus
          validateOnly
        />
      </div>
      {disabled && (
        <div className="rounded-full px-4 py-2.5 bg-secondary text-muted-foreground inline-flex items-center">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      )}
    </div>
  );
}
