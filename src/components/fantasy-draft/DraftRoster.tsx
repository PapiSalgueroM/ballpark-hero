import { cn } from '@/lib/utils';
import { User, Bot } from 'lucide-react';
import type { DraftPlayer } from './PlayerPool';

const POS_COLORS: Record<string, string> = {
  GK: 'text-amber-400',
  DEF: 'text-blue-400',
  MID: 'text-emerald-400',
  FWD: 'text-red-400',
};

interface DraftRosterProps {
  userTeam: DraftPlayer[];
  aiTeam: DraftPlayer[];
  currentTurn: 'user' | 'ai';
  lastPickId?: string | null;
}

const RosterColumn = ({
  label,
  icon,
  players,
  accent,
  lastPickId,
}: {
  label: string;
  icon: React.ReactNode;
  players: DraftPlayer[];
  accent: string;
  lastPickId?: string | null;
}) => (
  <div className="flex-1 min-w-0">
    <div className={cn('flex items-center justify-center gap-1.5 mb-3 pb-2 border-b', accent)}>
      {icon}
      <span className="text-xs sm:text-sm font-bold uppercase tracking-widest">{label}</span>
      <span className="ml-1 text-xs font-mono opacity-60">{players.length}/11</span>
    </div>
    <div className="space-y-1">
      {Array.from({ length: 11 }).map((_, i) => {
        const p = players[i];
        const isLastPick = p && lastPickId === p.id;
        return (
          <div
            key={i}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all duration-500',
              p
                ? isLastPick
                  ? 'bg-primary/20 border border-primary/40'
                  : 'bg-secondary/40'
                : 'bg-secondary/10 border border-dashed border-border/40'
            )}
          >
            <span className="text-[10px] font-mono text-muted-foreground w-4 text-right shrink-0">
              {i + 1}
            </span>
            {p ? (
              <>
                <span className={cn('text-[9px] font-bold w-6 shrink-0', POS_COLORS[p.position])}>
                  {p.position}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-foreground truncate flex-1">
                  {p.name}
                </span>
                <span className="text-[10px] text-primary font-semibold shrink-0">
                  £{p.market_value_millions}M
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground/40 italic">Empty slot</span>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

export const DraftRoster = ({ userTeam, aiTeam, currentTurn, lastPickId }: DraftRosterProps) => {
  return (
    <div className="w-full rounded-2xl border border-border bg-card/60 backdrop-blur-md p-3 sm:p-4">
      <div className="flex gap-3 sm:gap-4">
        <RosterColumn
          label="Your XI"
          icon={<User className="w-4 h-4" />}
          players={userTeam}
          accent={currentTurn === 'user' ? 'border-primary text-primary' : 'border-border text-muted-foreground'}
          lastPickId={lastPickId}
        />
        <div className="w-px bg-border/50 shrink-0" />
        <RosterColumn
          label="AI XI"
          icon={<Bot className="w-4 h-4" />}
          players={aiTeam}
          accent={currentTurn === 'ai' ? 'border-primary text-primary' : 'border-border text-muted-foreground'}
          lastPickId={lastPickId}
        />
      </div>
    </div>
  );
};
