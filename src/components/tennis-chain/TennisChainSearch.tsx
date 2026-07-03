import { PlayerAutocomplete } from '@/components/game/PlayerAutocomplete';
import { TENNIS_PLAYER_SOURCE } from '@/hooks/useTennisChain';
import { type PlayerEntity } from '@/lib/playerSearch';
import { useState } from 'react';

interface TennisChainSearchProps {
  usedPlayers: Set<string>;
  onSelect: (name: string) => void;
  disabled?: boolean;
}

/**
 * Tennis Chain's player-name input, now built on the shared PlayerAutocomplete
 * (see src/components/game/PlayerAutocomplete.tsx). validateOnly is set so a
 * player can only be submitted by picking a suggestion row, matching the old
 * "must exist in ALL_TENNIS_PLAYERS or you can still free-type" behavior's
 * intent of "guide toward a real name" while keeping this component itself
 * dumb about whether a pick is actually a valid CHAIN answer: that fact-check
 * (did this player really beat the current one at a Grand Slam) still happens
 * entirely in useTennisChain's makeGuess() via the tennis-chain-validate edge
 * function, unchanged by this migration.
 */
export function TennisChainSearch({ usedPlayers, onSelect, disabled }: TennisChainSearchProps) {
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
        searchOptions={{ source: TENNIS_PLAYER_SOURCE, exclude: usedPlayers, minChars: 2 }}
        placeholder="Type a player who beat them at a Grand Slam..."
        disabled={disabled}
        validateOnly
      />
    </div>
  );
}
