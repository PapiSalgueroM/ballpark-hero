import { cn } from '@/lib/utils';

/** Round 74: one hub box (the tile rule). Tap it, it becomes its own screen. */
export default function HubTile({ icon, title, value, sub, accent, onClick }: {
  icon: string; title: string; value: string; sub?: string; accent?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-xl border p-3 text-left transition-all bg-card hover:border-primary hover:-translate-y-0.5',
        accent ? 'border-gold/50' : 'border-border',
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-base leading-none">{icon}</span>
        {accent && <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />}
      </div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{title}</div>
      {/* Round 1328: the value and the line wrap instead of cutting their key
          words at 320 ("-£13.5m projec..."), and the line is 12px. */}
      <div className="text-sm font-bold font-display text-foreground break-words">{value}</div>
      {sub && <div className="text-xs leading-snug text-muted-foreground break-words mt-0.5">{sub}</div>}
    </button>
  );
}
