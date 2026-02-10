import { cn } from '@/lib/utils';
import type { NbaPositionSlot, NbaFilledSlot } from '@/types/nba';

interface NbaCourtLayoutProps {
  positions: NbaPositionSlot[];
  filledSlots: Map<number, NbaFilledSlot>;
  selectedPosition: number | null;
  challengeUnit?: string;
}

const positionCoords = [
  { x: 35, y: 72 },  // PG
  { x: 65, y: 72 },  // SG
  { x: 75, y: 38 },  // SF
  { x: 25, y: 38 },  // PF
  { x: 50, y: 18 },  // C
];

const NbaCourtLayout = ({ positions, filledSlots, selectedPosition, challengeUnit }: NbaCourtLayoutProps) => {
  return (
    <div className="relative w-full max-w-lg mx-auto aspect-[3/4] rounded-2xl border border-orange-500/30 overflow-hidden bg-gradient-to-b from-orange-900/20 to-orange-800/10">
      {/* Court markings */}
      <div className="absolute inset-0">
        <div className="absolute top-[8%] left-[10%] right-[10%] h-px bg-orange-500/20" />
        <div className="absolute top-[8%] left-[30%] right-[30%] h-[30%] border-b border-l border-r border-orange-500/20 rounded-b-sm" />
        <div className="absolute top-[28%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-orange-500/15" />
        <div className="absolute top-[8%] left-[12%] right-[12%] h-[52%] border-b border-l border-r border-orange-500/15 rounded-b-[50%]" />
        <div className="absolute bottom-[10%] left-[10%] right-[10%] h-px bg-orange-500/15" />
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-orange-500/30" />
      </div>

      {/* Position cards */}
      {positions.map((pos, i) => {
        const filled = filledSlots.get(i);
        const isSelected = selectedPosition === i;
        const coord = positionCoords[i];

        return (
          <div
            key={i}
            className={cn(
              'absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300',
              'flex flex-col items-center justify-center rounded-lg text-center min-w-[4.5rem] px-2 py-1.5',
              filled
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                : isSelected
                  ? 'bg-primary text-primary-foreground shadow-lg scale-110 ring-2 ring-primary/50 animate-pulse'
                  : 'bg-card border border-border text-foreground opacity-60'
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
              <>
                <span className="text-[9px] font-semibold truncate max-w-[6rem] leading-tight mt-0.5">
                  {filled.playerName}
                </span>
                {filled.statValue !== undefined && filled.statValue !== null && (
                  <span className="text-[8px] font-bold opacity-90 mt-0.5">
                    {typeof filled.statValue === 'number'
                      ? Number.isInteger(filled.statValue) ? filled.statValue : filled.statValue.toFixed(1)
                      : filled.statValue}
                    {challengeUnit ? ` ${challengeUnit}` : ''}
                  </span>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default NbaCourtLayout;
