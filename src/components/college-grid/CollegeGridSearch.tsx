import { useEffect, useRef, useState } from 'react';
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

  /* A disabled input drops the cursor. When a pick has been checked and the
     cell is still open (the records did not load, or could not settle him),
     the box takes the cursor back so the next name can be typed without
     another click. Mouse and keyboard only: on a touch screen this would
     raise the keyboard over the message that says what happened.
     preventScroll, because the page must not jump. */
  const box = useRef<HTMLDivElement>(null);
  const wasDisabled = useRef(false);
  useEffect(() => {
    const finePointer = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: fine)').matches;
    if (wasDisabled.current && !disabled && finePointer) box.current?.querySelector('input')?.focus({ preventScroll: true });
    wasDisabled.current = disabled;
  }, [disabled]);

  const handleSelect = (entity: PlayerEntity) => {
    /* The stored display name, exactly as the key spells it (the entity's
       name is title cased for the list). */
    onSelect(entity.rawName || entity.name);
    setInput('');
  };

  return (
    <div ref={box} aria-busy={disabled} className="relative flex gap-2 w-full max-w-md mx-auto items-start">
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
      {/* Round 1105: a pick can now wait up to eight seconds for the records,
          so the wait says what it is. The word also carries the state when
          reduced motion freezes the spinner. */}
      {disabled && (
        <div role="status" className="rounded-full px-4 py-2.5 bg-secondary text-muted-foreground inline-flex items-center gap-2 text-sm whitespace-nowrap">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          <span>Checking...</span>
        </div>
      )}
    </div>
  );
}
