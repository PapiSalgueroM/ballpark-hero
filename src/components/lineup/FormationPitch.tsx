import { cn } from '@/lib/utils';
import type { PositionSlot, FilledSlot } from '@/types/lineupBuilder';

interface FormationPitchProps {
  positions: PositionSlot[];
  filledSlots: Map<number, FilledSlot>;
  selectedIndex: number | null;
  onSelectPosition: (index: number) => void;
}

// Maps each position index to a grid location based on formation rows
function getPositionCoords(positions: PositionSlot[]): { x: number; y: number }[] {

  const roleOrder: Record<string, number> = {
    GK: 0,
    LWB: 1, LB: 1, CB: 1, RB: 1, RWB: 1,
    CDM: 2, LM: 2, CM: 2, RM: 2,
    CAM: 3, LW: 3, RW: 3,
    CF: 4, ST: 4,
  };

  // Group by role tiers
  const tiers: Map<number, number[]> = new Map();
  positions.forEach((pos, i) => {
    const tier = roleOrder[pos.role] ?? 2;
    if (!tiers.has(tier)) tiers.set(tier, []);
    tiers.get(tier)!.push(i);
  });

  const sortedTiers = [...tiers.entries()].sort(([a], [b]) => a - b);

  const coords: { x: number; y: number }[] = Array.from({ length: positions.length });

  sortedTiers.forEach(([_tier, indices], rowIdx) => {
    const padding = 8; // % padding top/bottom so edge positions aren't clipped
    const rowY = padding + (1 - rowIdx / (sortedTiers.length - 1)) * (100 - 2 * padding); // bottom (GK) to top (ST) with padding
    const count = indices.length;
    indices.forEach((posIdx, col) => {
      const xSpacing = 100 / (count + 1);
      coords[posIdx] = {
        x: xSpacing * (col + 1),
        y: rowY,
      };
    });
  });

  return coords;
}

const FormationPitch = ({ positions, filledSlots, selectedIndex, onSelectPosition }: FormationPitchProps) => {
  const coords = getPositionCoords(positions);

  return (
    <div className="relative w-full max-w-lg mx-auto aspect-[3/4.5] bg-correct/10 rounded-2xl border border-correct/20 overflow-hidden">
      {/* Pitch markings */}
      <div className="absolute inset-0">
        {/* Center line */}
        <div className="absolute top-1/2 left-[10%] right-[10%] h-px bg-correct/20" />
        {/* Center circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-correct/20" />
        {/* Penalty areas */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[15%] border-t border-l border-r border-correct/20 rounded-t-sm" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[15%] border-b border-l border-r border-correct/20 rounded-b-sm" />
      </div>

      {/* Position cards */}
      {positions.map((pos, i) => {
        const filled = filledSlots.get(i);
        const isSelected = selectedIndex === i;
        const coord = coords[i];
        if (!coord) return null;

        return (
          <button
            key={i}
            onClick={() => !filled && onSelectPosition(i)}
            disabled={!!filled}
            className={cn(
              'absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-200',
              'flex flex-col items-center justify-center rounded-lg text-center min-w-[4rem] px-2 py-1.5',
              filled
                ? 'bg-correct text-correct-foreground shadow-md cursor-default'
                : isSelected
                  ? 'bg-primary text-primary-foreground shadow-lg scale-110 ring-2 ring-primary/50'
                  : 'bg-card border border-border text-foreground hover:bg-primary/20 hover:scale-105 cursor-pointer'
            )}
            style={{
              left: `${coord.x}%`,
              top: `${coord.y}%`,
            }}
          >
            <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">
              {pos.label}
            </span>
            {filled && (
              <span className="text-[9px] font-semibold truncate max-w-[5.5rem] leading-tight mt-0.5">
                {filled.playerName}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default FormationPitch;
