import { cn } from '@/lib/utils';
import type { NbaPositionSlot, NbaFilledSlot } from '@/types/nba';

interface NbaCourtLayoutProps {
  positions: NbaPositionSlot[];
  filledSlots: Map<number, NbaFilledSlot>;
  currentIndex: number;
}

const positionCoords = [
  { x: 35, y: 72 },  // PG - bottom left-center
  { x: 65, y: 72 },  // SG - bottom right-center
  { x: 75, y: 38 },  // SF - right wing
  { x: 25, y: 38 },  // PF - left wing
  { x: 50, y: 18 },  // C - near basket
];

const NbaCourtLayout = ({ positions, filledSlots, currentIndex }: NbaCourtLayoutProps) => {
  return (
    <div className="relative w-full max-w-lg mx-auto aspect-[3/4] rounded-2xl border border-orange-500/30 overflow-hidden bg-gradient-to-b from-orange-900/20 to-orange-800/10">
      {/* Court markings */}
      <div className="absolute inset-0">
        {/* Baseline */}
        <div className="absolute top-[8%] left-[10%] right-[10%] h-px bg-orange-500/20" />
        {/* Free throw lane / paint */}
        <div className="absolute top-[8%] left-[30%] right-[30%] h-[30%] border-b border-l border-r border-orange-500/20 rounded-b-sm" />
        {/* Free throw circle */}
        <div className="absolute top-[28%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-orange-500/15" />
        {/* Three point arc (simplified) */}
        <div className="absolute top-[8%] left-[12%] right-[12%] h-[52%] border-b border-l border-r border-orange-500/15 rounded-b-[50%]" />
        {/* Center court line */}
        <div className="absolute bottom-[10%] left-[10%] right-[10%] h-px bg-orange-500/15" />
        {/* Basket */}
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-orange-500/30" />
      </div>

      {/* Position cards */}
      {positions.map((pos, i) => {
        const filled = filledSlots.get(i);
        const isCurrent = currentIndex === i;
        const coord = positionCoords[i];

        return (
          <div
            key={i}
            className={cn(
              'absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300',
              'flex flex-col items-center justify-center rounded-lg text-center min-w-[4rem] px-2 py-1.5',
              filled
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                : isCurrent
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
              <span className="text-[9px] font-semibold truncate max-w-[5.5rem] leading-tight mt-0.5">
                {filled.playerName}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default NbaCourtLayout;
