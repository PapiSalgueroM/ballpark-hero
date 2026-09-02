import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PlayerAutocomplete } from '@/components/game/PlayerAutocomplete';
import { NFL_ROSTER_SOURCE, type PlayerEntity } from '@/lib/playerSearch';
import { NFL_GRID_LOCAL_NAMES } from '@/data/nflGridLocalNames';

interface Props {
  onSelect: (name: string) => void;
  disabled: boolean;
}

export function GridPlayerSearch({ onSelect, disabled }: Props) {
  const [input, setInput] = useState('');

  const handleSelect = (entity: PlayerEntity) => {
    onSelect(entity.name);
    setInput('');
  };

  return (
    <div className="relative flex gap-2 w-full max-w-md mx-auto items-start">
      <div className="flex-1">
        <PlayerAutocomplete
          value={input}
          onChange={setInput}
          onSelect={handleSelect}
          searchOptions={{ source: NFL_ROSTER_SOURCE }}
          /* Round 401: the roster table starts in 2002, so a Jim Kelly or an
             O.J. Simpson could not be typed for the board built around him.
             These are the players the Round 350 evidence names, derived by
             scripts/genNflGridLocalNames.mjs; offering a name is not
             accepting it, the validator still judges every guess. */
          localNames={NFL_GRID_LOCAL_NAMES}
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
