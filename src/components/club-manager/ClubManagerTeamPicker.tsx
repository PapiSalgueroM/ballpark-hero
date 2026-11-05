import { cn } from '@/lib/utils';
import { FlagImg } from '@/components/FlagImg';

type TeamRow = {
  name: string;
  color: string;
  selected: boolean;
  flagName: string;
  tierEmoji: string;
  tierLabel: string;
  partial: boolean;
  modelOnlyRoster?: boolean;
  rating: number;
  budgetLabel: string;
  boardTitle: string;
  boardText: string;
};

type Props = {
  rows: readonly TeamRow[];
  editing: boolean;
  onPick: (name: string) => void;
  onCreate: () => void;
};

export default function ClubManagerTeamPicker({ rows, editing, onPick, onCreate }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {rows.map(c => (
        <button
          key={c.name}
          onClick={() => onPick(c.name)}
          className={cn(
            'rounded-xl border p-3 text-left transition-all',
            c.selected ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:border-primary',
          )}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
            {/* Round 106: flags run all the way through the picker now. */}
            <FlagImg name={c.flagName} size={12} />
            <span className={cn('text-xs font-bold truncate', c.selected ? 'text-primary' : 'text-foreground')}>{c.name}</span>
          </div>
          <div className="text-[9px] text-muted-foreground mt-0.5">
            {c.tierEmoji} {c.tierLabel}
            {c.modelOnlyRoster ? <span className="ml-1 text-yellow-500/80" title="No verified opening roster. Starting players are generated; ratings and budgets are game estimates.">· generated squad</span> : c.partial && <span className="ml-1 text-yellow-500/80" title="The market data covers only part of this squad; the rest is filled with youth players.">· partial data</span>}
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-muted-foreground">{c.modelOnlyRoster ? 'Game rating' : 'Squad'}</span>
            {/* Round 132: the squad number is the squad in the era you
                picked, not the 2026 one, or the tile would be lying
                about the team you are about to take over. */}
            <span className="text-sm font-bold font-display text-foreground">
              {c.rating}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">{c.modelOnlyRoster ? 'Game budget' : 'Budget'}</span>
            {/* Round 514: the club picker runs before a career exists, so there are no
                start options to follow and this one stays in the default symbol. */}
            <span className="text-xs font-bold text-gold">{c.budgetLabel}</span>
          </div>
          {/* Round 145: this line said "Top 20" at a rank 20 club,
              which is exactly the phrasing he told us to stop using.
              It now quotes the board's actual named demand. */}
          {/* Round 1328: the one line that tells clubs apart was cut at
              390 ("Win the Premi..."). It wraps now, at 12px, whole. */}
          <div className="text-xs leading-snug mt-0.5 break-words" data-cm-board-wants>
            <span className="text-muted-foreground">Board wants </span>
            <span className="font-bold text-foreground" title={c.boardTitle}>
              {c.boardText}
            </span>
          </div>
        </button>
      ))}
      {/* Round 964: a founded club is placed against the real lineups, so
          the edited world and a custom club do not mix. */}
      {editing ? (
        <div className="rounded-xl border border-dashed border-border p-3 text-[10px] text-muted-foreground">
          Creating your own club starts in the real world. Reset the world editor to found one.
        </div>
      ) : (
      <button
        onClick={onCreate}
        className="rounded-xl border border-dashed border-primary/50 p-3 text-left transition-all bg-card hover:border-primary hover:bg-primary/5"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-base leading-none">✨</span>
          <span className="text-xs font-bold text-primary truncate">Create your own club</span>
        </div>
        <div className="text-[9px] text-muted-foreground mt-1">
          Your name, your crest, your stadium, your money. It takes the place of the league's weakest side.
        </div>
        <div className="text-[10px] font-bold text-foreground mt-1.5">Full customization →</div>
      </button>
      )}
    </div>
  );
}
