import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import type { MatchDetail } from '@/lib/clubManager';
import { ALL_VIEW_ONLY, timelineRows } from '@/lib/clubManagerMatchCentre';
import type { TimelineRow } from '@/lib/clubManagerMatchCentre';
import { MadeUpTag } from '@/components/club-manager/SquadScreen';

/** One side's entry: icon, words, the man, and a MADE UP tag when the game invented him. */
function Entry({ row, mine }: { row: TimelineRow; mine: boolean }) {
  const loud = row.kind === 'goal' || row.kind === 'red';
  const tone = loud ? 'font-bold text-foreground' : mine ? 'text-foreground' : 'text-muted-foreground';
  const words = `${row.icon} ${row.label}${row.name ? ': ' : ''}`;
  return (
    <span className={cn('inline-flex items-center gap-1 min-w-0 max-w-full', tone)} data-cm-tl-entry="1">
      <span className="truncate" title={`${words}${row.name}${row.mark ?? ''}${row.second ? (row.kind === 'sub' ? ` on for ${row.second}` : ` (assist: ${row.second})`) : ''}`}>
        {words}{row.name}
        {row.kind === 'sub' && row.second && <> on for {row.second}</>}
        {row.kind === 'goal' && row.second && <span className="font-normal text-muted-foreground"> 🅰️ {row.second}</span>}
      </span>
      {/* Round 1146: the mark sits outside the clipped span, so on a narrow column the ellipsis eats the name
          and never the (P) or (O.G). A marked goal has no assist (a penalty and an own goal never do), so
          nothing follows it. */}
      {row.mark && <span className="shrink-0 -ml-1 whitespace-pre" data-cm-tl-mark="1">{row.mark}</span>}
      {(row.gen || row.secondGen) && <MadeUpTag />}
    </span>
  );
}

/**
 * Round 714, master spec section 45: the event timeline, both clubs either
 * side of the clock the way the big score apps draw it. Every row is one line
 * of the report's own timeline (timelineRows), which buildMatchDetail wrote
 * off the committed play, so the screen cannot show a chance, a save or a
 * booking the engine did not draw. Added time reads 45+2' and 90+5' on the
 * rows it belongs to. The key view leaves out the shots off target and the
 * corners (the stats block counts them), and one tap shows every one.
 * No motion: rows are laid out at their final size, so nothing jumps.
 */
export function MatchTimeline({ detail, clubName, opponent }: { detail: MatchDetail; clubName: string; opponent: string }) {
  const [all, setAll] = useState(false);
  const rows = timelineRows(detail, all ? 'all' : 'key');
  const extra = detail.timeline.filter(e => ALL_VIEW_ONLY.includes(e.kind)).length;
  return (
    <div className="mt-3 bg-surface-2 border border-border/60 rounded-xl p-3" data-cm-timeline={all ? 'all' : 'key'}>
      <div className="flex items-center justify-between gap-2 text-[9px] text-muted-foreground uppercase tracking-wider mb-2">
        <span className="text-primary font-bold normal-case truncate">{clubName}</span>
        <span className="shrink-0">Timeline</span>
        <span className="font-bold normal-case truncate">{opponent}</span>
      </div>
      <ol className="space-y-0.5">
        {rows.map(r => (r.side === 'none' ? (
          <li key={r.key} data-cm-tl={r.kind} data-cm-tl-clock={r.clock} className="flex items-center gap-2 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
            <span className="shrink-0 tabular-nums font-bold text-foreground">{r.clock}</span>
            <span className="shrink-0">{r.icon} {r.label}</span>
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
          </li>
        ) : (
          <li key={r.key} data-cm-tl={r.kind} data-cm-tl-side={r.side} data-cm-tl-clock={r.clock} className="grid grid-cols-[1fr_2.5rem_1fr] items-center gap-1.5 text-[10px] min-h-[18px]">
            <div className="min-w-0 flex justify-end">{r.side === 'me' && <Entry row={r} mine />}</div>
            <span className="tabular-nums font-bold text-muted-foreground text-[9px]">{r.clock}</span>
            <div className="min-w-0 flex justify-start">{r.side === 'opp' && <Entry row={r} mine={false} />}</div>
          </li>
        )))}
      </ol>
      {extra > 0 && (
        <button
          type="button"
          onClick={() => setAll(v => !v)}
          data-cm-tl-toggle="1"
          className="mt-1 inline-flex items-center gap-1 min-h-[32px] px-2 text-[10px] text-muted-foreground hover:text-primary transition-colors"
        >
          <ChevronDown className={cn('w-3 h-3 transition-transform', all && 'rotate-180')} />
          {all ? 'Key moments only' : `Every shot and corner (${extra} more)`}
        </button>
      )}
    </div>
  );
}

export default MatchTimeline;
