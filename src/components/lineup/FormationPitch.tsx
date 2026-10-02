import { cn } from '@/lib/utils';
import type { PositionSlot, FilledSlot } from '@/types/lineupBuilder';
import { pitchCoords } from '@/lib/xiFit';

interface FormationPitchProps {
  positions: PositionSlot[];
  filledSlots: Map<number, FilledSlot>;
  selectedIndex: number | null;
  onSelectPosition: (index: number) => void;
}

/* Round 825: the layout lives in src/lib/xiFit.ts now, because chemistry
   links neighbours and has to read the same pitch the player sees. Same lines
   as before; inside a line the left sided slots come first, which moves the
   3-5-2's left wing back from the right of the back line to the left. */
const FormationPitch = ({ positions, filledSlots, selectedIndex, onSelectPosition }: FormationPitchProps) => {
  const coords = pitchCoords(positions.map((p) => p.role));

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
              <span className="text-[8px] font-semibold truncate max-w-[7rem] leading-tight mt-0.5 whitespace-nowrap">
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
