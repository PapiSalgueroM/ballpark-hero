import { PlayerAutocomplete } from '@/components/game/PlayerAutocomplete';
import { NASCAR_DRIVER_SOURCE } from '@/hooks/useNascarChain';
import { type PlayerEntity } from '@/lib/playerSearch';
import { useState } from 'react';

interface Props {
  usedDrivers: Set<string>;
  onSelect: (name: string) => void;
  disabled?: boolean;
}

/**
 * NASCAR Chain's driver-name input, now built on the shared PlayerAutocomplete
 * (see src/components/game/PlayerAutocomplete.tsx) instead of the bespoke
 * smartSearch-driven filter it used previously. validateOnly is set so a
 * driver can only be submitted by picking a suggestion row. This component
 * stays dumb about whether a pick is actually a valid CHAIN answer: that
 * fact-check (did this driver really beat the current one to the Cup title)
 * still happens entirely in useNascarChain's makeGuess() via the
 * nascar-chain-validate edge function, unchanged by this migration.
 */
export function NascarChainSearch({ usedDrivers, onSelect, disabled }: Props) {
  const [value, setValue] = useState('');

  const handleSelect = (entity: PlayerEntity) => {
    onSelect(entity.name);
    setValue('');
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <PlayerAutocomplete
        value={value}
        onChange={setValue}
        onSelect={handleSelect}
        searchOptions={{ source: NASCAR_DRIVER_SOURCE, exclude: usedDrivers, minChars: 2 }}
        placeholder="Type a driver who beat them to the Cup title..."
        disabled={disabled}
        validateOnly
      />
    </div>
  );
}
