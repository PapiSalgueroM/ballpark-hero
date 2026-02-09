import { ConnectionGroup, ConnectionDifficulty } from '@/types/connections';
import { cn } from '@/lib/utils';

const difficultyColors: Record<ConnectionDifficulty, { bg: string; text: string }> = {
  easy: { bg: 'bg-correct', text: 'text-correct-foreground' },
  medium: { bg: 'bg-close', text: 'text-close-foreground' },
  hard: { bg: 'bg-blue-500', text: 'text-white' },
  tricky: { bg: 'bg-purple-500', text: 'text-white' },
};

interface ConnectionsBoardProps {
  remainingPlayers: string[];
  selected: string[];
  solvedGroups: ConnectionGroup[];
  lastIncorrect: string[] | null;
  onToggle: (player: string) => void;
}

export function ConnectionsBoard({
  remainingPlayers,
  selected,
  solvedGroups,
  lastIncorrect,
  onToggle,
}: ConnectionsBoardProps) {
  return (
    <div className="w-full max-w-xl mx-auto space-y-3">
      {/* Solved groups */}
      {solvedGroups.map((group) => {
        const colors = difficultyColors[group.difficulty];
        return (
          <div
            key={group.category}
            className={cn(
              'rounded-xl p-4 text-center animate-cell-reveal',
              colors.bg,
              colors.text
            )}
          >
            <p className="font-bold text-sm uppercase tracking-wide">{group.category}</p>
            <p className="text-sm mt-1 opacity-90">{group.players.join(', ')}</p>
          </div>
        );
      })}

      {/* Remaining player grid */}
      {remainingPlayers.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {remainingPlayers.map((player) => {
            const isSelected = selected.includes(player);
            const isIncorrect = lastIncorrect?.includes(player);
            return (
              <button
                key={player}
                onClick={() => onToggle(player)}
                className={cn(
                  'rounded-lg px-2 py-4 text-sm font-semibold transition-all text-center leading-tight',
                  'border border-border hover:scale-[1.03] active:scale-[0.97]',
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg'
                    : 'bg-card text-foreground hover:bg-secondary',
                  isIncorrect && !isSelected && 'animate-[shake_0.3s_ease-in-out]'
                )}
              >
                {player}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
