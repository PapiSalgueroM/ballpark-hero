import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PlayerAutocomplete } from '@/components/game/PlayerAutocomplete';
import { NFL_ROSTER_SOURCE, type PlayerEntity } from '@/lib/playerSearch';

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
