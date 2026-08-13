import { cn } from '@/lib/utils';
import { MessageSquare } from 'lucide-react';
import type { CareerState } from '@/lib/clubManager';

const KIND_ICON: Record<string, string> = {
  startMe: '😤', wantMove: '🧳', drama: '🍿', praise: '💐',
};

interface InboxCardProps {
  career: CareerState;
  onAnswer: (messageId: string, optionIdx: number) => void;
}

/** Round 73: player DMs. Start-me demands, exit threats, and pure chaos. */
export function InboxCard({ career, onAnswer }: InboxCardProps) {
  const inbox = career.inbox ?? [];
  if (inbox.length === 0) return null;
  const unresolved = inbox.filter(m => !m.resolved).length;

  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
        <MessageSquare className="w-3 h-3" /> Your messages
        {unresolved > 0 && (
          <span className="text-[9px] bg-gold text-background rounded-full px-1.5 py-0.5 font-bold">{unresolved}</span>
        )}
      </div>
      <div className="space-y-2">
        {inbox.slice(0, 4).map(m => (
          <div
            key={m.id}
            className={cn(
              'rounded-lg border p-2.5',
              m.resolved ? 'border-border/40 bg-secondary/30' : 'border-gold/40 bg-gold/5',
            )}
          >
            <p className={cn('text-[11px] leading-relaxed', m.resolved ? 'text-muted-foreground' : 'text-foreground')}>
              <span className="mr-1">{KIND_ICON[m.kind] ?? '📩'}</span>
              {m.text}
            </p>
            {!m.resolved && m.options.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {m.options.map((o, i) => (
                  <button
                    key={i}
                    onClick={() => onAnswer(m.id, i)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-card border border-border text-foreground hover:border-primary transition-all"
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
            {m.resolved && (
              <p className="text-[10px] italic text-muted-foreground mt-1">{m.resolved}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default InboxCard;
