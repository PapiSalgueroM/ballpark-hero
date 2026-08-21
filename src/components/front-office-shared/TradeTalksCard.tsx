/* Round 190: the phone call, shared by all four GM games. Renders a
   TalksState from foTradeTalks: what you are sending, what is currently
   on the table (which a counter can change under you, that is the
   point), the other GM's line, and your three moves. Stand firm is a
   one-shot and the button says so by dying after use. A dead line keeps
   only the walk-away, because there is nobody left on the call. */

import { cn } from '@/lib/utils';
import type { TalksState, TalksPlayer } from '@/lib/foTradeTalks';

export function TradeTalksCard({ talks, partnerLabel, mine, onAccept, onStandFirm, onWalkAway }: {
  talks: TalksState;
  partnerLabel: string;
  mine: TalksPlayer;
  onAccept: () => void;
  onStandFirm: () => void;
  onWalkAway: () => void;
}) {
  const dead = talks.phase === 'dead';
  return (
    <div data-trade-talks className={cn('rounded-xl border p-3 space-y-2', dead ? 'border-border bg-secondary/40' : 'border-gold/40 bg-gold/5')}>
      <p className="text-center text-[11px] font-bold text-foreground">📞 Talks with {partnerLabel}</p>
      <div className="flex items-center justify-center gap-2 text-[11px]">
        <span className="rounded-lg border border-border bg-background px-2 py-1 text-foreground">
          You send: <b>{mine.name}</b> ({mine.pos} {mine.ovr})
        </span>
        {talks.pkg && (
          <span className="rounded-lg border border-border bg-background px-2 py-1 text-foreground">
            On the table: <b>{talks.pkg.theirPlayerName}</b>{talks.pkg.addPick ? ' + your pick' : ''}
          </span>
        )}
      </div>
      <div className="space-y-1">
        {talks.log.map((l, i) => (
          <p key={i} className={cn('rounded-lg px-2 py-1 text-[11px] leading-snug', i === talks.log.length - 1 ? 'bg-background text-foreground' : 'text-muted-foreground')}>
            {l}
          </p>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {!dead && (
          <button onClick={onAccept} className="rounded-full bg-primary px-4 py-1.5 text-[11px] font-bold text-primary-foreground hover:opacity-90">
            {talks.phase === 'agreed' ? 'Shake on it' : 'Take the deal'}
          </button>
        )}
        {talks.phase === 'counter' && (
          <button
            onClick={onStandFirm}
            disabled={talks.stoodFirm}
            className="rounded-full border border-gold px-4 py-1.5 text-[11px] font-bold text-gold disabled:opacity-40"
          >
            {talks.stoodFirm ? 'You already pushed' : 'Stand firm'}
          </button>
        )}
        <button onClick={onWalkAway} className="rounded-full border border-border px-4 py-1.5 text-[11px] text-muted-foreground hover:text-foreground">
          {dead ? 'Put the phone down' : 'Walk away'}
        </button>
      </div>
    </div>
  );
}
