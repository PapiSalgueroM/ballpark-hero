import { cn } from '@/lib/utils';
import { MessageSquare } from 'lucide-react';
import type { CareerState } from '@/lib/clubManager';
import { deskOf } from '@/lib/clubManagerDecisions';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import styles from './InboxCard.module.css';

const KIND_ICON: Record<string, string> = {
  startMe: '😤', wantMove: '🧳', drama: '🍿', praise: '💐', roleTalk: '🤝',
  // Round 474: the five senders who are not in your squad.
  boardChase: '📋', agent: '💼', coachTip: '🏋️', fanGroup: '📣', reporter: '🎙️',
  // Round 783: the job hunt's post.
  jobApplication: '📨',
};

interface InboxCardProps {
  career: CareerState;
  onAnswer: (messageId: string, optionIdx: number) => void;
}

/** Round 73: player DMs. Start-me demands, exit threats, and pure chaos. */
export function InboxCard({ career, onAnswer }: InboxCardProps) {
  const inbox = career.inbox ?? [];
  /* Round 979: the decisions desk, appeals and situations, answered through
     the same onAnswer the messages use (answerMessage routes 'desk-' ids). */
  const desk = deskOf(career);
  const deskPending = desk.filter(d => !d.resolved).length;
  const [view, setView] = useState<'all' | 'pending' | 'resolved'>('all');
  const [search, setSearch] = useState('');
  const [visibleLimit, setVisibleLimit] = useState(4);
  const [answerRequest, setAnswerRequest] = useState<string | null>(null);
  const [loadRequest, setLoadRequest] = useState<string | null>(null);
  const [cueId, setCueId] = useState<string | null>(null);
  const answeredCard = useRef<HTMLDivElement>(null);
  const loadedCard = useRef<HTMLDivElement>(null);
  const viewControl = useRef<HTMLButtonElement>(null);
  const unresolved = inbox.filter(m => !m.resolved).length;
  const query = search.trim().toLowerCase();
  const filtered = inbox.filter(m =>
    (view === 'all' || (view === 'pending' ? !m.resolved : !!m.resolved)) &&
    (!query || [m.from, m.playerName, m.kind.replace(/([a-z])([A-Z])/g, '$1 $2'), m.text, m.resolved]
      .some(value => value?.toLowerCase().includes(query))),
  );
  const visible = filtered.slice(0, visibleLimit);

  useLayoutEffect(() => {
    if (!answerRequest) return;
    if ((inbox.find(m => m.id === answerRequest) ?? desk.find(d => d.id === answerRequest))?.resolved) {
      setCueId(answerRequest);
      (answeredCard.current ?? viewControl.current)?.focus({ preventScroll: true });
    }
    setAnswerRequest(null);
  }, [answerRequest, inbox, desk]);

  useEffect(() => {
    if (!cueId) return;
    const timer = window.setTimeout(() => setCueId(null), 500);
    return () => window.clearTimeout(timer);
  }, [cueId]);

  useEffect(() => {
    if (!loadRequest) return;
    (loadedCard.current ?? viewControl.current)?.focus({ preventScroll: true });
    setLoadRequest(null);
  }, [loadRequest]);

  if (inbox.length === 0 && desk.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-3">
      {desk.length > 0 && (
        <section aria-label="Decisions desk" className={cn(inbox.length > 0 && 'mb-3 pb-3 border-b border-border/60')}>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <span aria-hidden>⚖️</span> Decisions desk
            {deskPending > 0 && (
              <span className="text-[9px] bg-gold text-background rounded-full px-1.5 py-0.5 font-bold">{deskPending}</span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mb-2">Answer before your next match. Anything left open closes with nothing changed.</p>
          <div className="space-y-2">
            {desk.map(d => (
              <div
                key={d.id}
                ref={d.id === answerRequest ? answeredCard : null}
                tabIndex={-1}
                data-desk-card={d.id}
                data-desk-kind={d.kind}
                data-inbox-state={d.resolved ? 'resolved' : 'pending'}
                data-inbox-feedback={cueId === d.id ? 'committed' : undefined}
                className={cn(
                  'rounded-lg border p-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold',
                  styles.card,
                  cueId === d.id && styles.committed,
                  d.resolved ? 'border-border/40 bg-secondary/30' : 'border-gold/40 bg-gold/5',
                )}
              >
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Week {d.week} · {d.from}</div>
                <p className={cn('text-[11px] leading-relaxed', d.resolved ? 'text-muted-foreground' : 'text-foreground')}>
                  <span className="mr-1">{d.kind === 'appeal' ? '🟥' : '🗂️'}</span>
                  {d.text}
                </p>
                {d.kind === 'appeal' && !d.resolved && (
                  <div className="mt-1.5 flex items-center gap-2" aria-hidden>
                    <div className="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-gold" style={{ width: `${d.odds ?? 0}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-gold">{d.odds ?? 0}%</span>
                  </div>
                )}
                {!d.resolved && d.options.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {d.options.map((o, i) => (
                      <button
                        key={i}
                        onClick={() => { setAnswerRequest(d.id); onAnswer(d.id, i); }}
                        className="min-h-[44px] min-w-[44px] max-w-full px-2.5 py-1 rounded-lg text-left text-[10px] font-bold bg-card border border-border text-foreground hover:border-primary transition-all"
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
                {d.resolved && (
                  <p className={cn('text-[10px] italic mt-1', d.outcome === 'won' ? 'text-emerald-400' : d.outcome === 'lost' ? 'text-red-400' : 'text-muted-foreground')}>{d.resolved}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      {inbox.length > 0 && (<>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
        <MessageSquare className="w-3 h-3" /> Your messages
        {unresolved > 0 && (
          <span className="text-[9px] bg-gold text-background rounded-full px-1.5 py-0.5 font-bold">{unresolved}</span>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground mb-2">Recent retained messages. Older messages can leave your save.</p>
      <div className="flex flex-wrap gap-1.5 mb-2" role="group" aria-label="Message view">
        {(['pending', 'resolved', 'all'] as const).map(filter => (
          <button
            key={filter}
            ref={filter === view ? viewControl : null}
            aria-pressed={view === filter}
            onClick={() => { setView(filter); setVisibleLimit(4); setCueId(null); }}
            className={cn('min-h-[44px] min-w-[44px] px-2.5 rounded-lg text-[11px] font-bold border', view === filter ? 'bg-gold/10 border-gold/40 text-gold' : 'bg-card border-border text-muted-foreground')}
          >
            {filter === 'pending' ? `Pending (${unresolved})` : filter === 'resolved' ? `Resolved (${inbox.length - unresolved})` : `All (${inbox.length})`}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        <input
          type="search"
          aria-label="Search messages"
          placeholder="Search messages"
          value={search}
          onChange={event => { setSearch(event.target.value); setVisibleLimit(4); setCueId(null); }}
          className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 text-[11px]"
        />
        <button
          disabled={view === 'all' && !search && visibleLimit === 4}
          onClick={() => { setView('all'); setSearch(''); setVisibleLimit(4); setCueId(null); }}
          className="min-h-[44px] min-w-[44px] px-2.5 rounded-lg text-[11px] font-bold border border-border disabled:opacity-40"
        >Reset filters</button>
      </div>
      <p role="status" className="text-[10px] text-muted-foreground mb-2">Showing {visible.length} of {filtered.length} {view === 'all' ? 'retained' : view} messages.</p>
      <div className="space-y-2">
        {visible.map(m => (
          <div
            key={m.id}
            ref={m.id === answerRequest ? answeredCard : m.id === loadRequest ? loadedCard : null}
            tabIndex={-1}
            data-inbox-message={m.id}
            data-inbox-state={m.resolved ? 'resolved' : 'pending'}
            data-inbox-feedback={cueId === m.id ? 'committed' : undefined}
            className={cn(
              'rounded-lg border p-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold',
              styles.card,
              cueId === m.id && styles.committed,
              m.resolved ? 'border-border/40 bg-secondary/30' : 'border-gold/40 bg-gold/5',
            )}
          >
            <div className="text-[9px] text-muted-foreground mb-0.5">Week {m.week}</div>
            {/* Round 474: who is talking, when it is not somebody in your
                squad. A role or a generated person, so the name over the
                message is never a real man's. */}
            {m.from && (
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">{m.from}</div>
            )}
            <p className={cn('text-[11px] leading-relaxed', m.resolved ? 'text-muted-foreground' : 'text-foreground')}>
              <span className="mr-1">{KIND_ICON[m.kind] ?? '📩'}</span>
              {m.text}
            </p>
            {!m.resolved && m.options.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {m.options.map((o, i) => (
                  <button
                    key={i}
                    onClick={() => { setAnswerRequest(m.id); onAnswer(m.id, i); }}
                    className="min-h-[44px] min-w-[44px] max-w-full px-2.5 py-1 rounded-lg text-left text-[10px] font-bold bg-card border border-border text-foreground hover:border-primary transition-all"
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
      {filtered.length === 0 && (
        <p className="text-[11px] text-muted-foreground py-2">
          {query ? 'No messages match your search in this view.' : view === 'pending' ? 'No pending messages.' : 'No resolved messages yet.'}
        </p>
      )}
      {visible.length < filtered.length && (
        <button
          onClick={event => {
            if (document.activeElement === event.currentTarget && visibleLimit + 4 >= filtered.length) setLoadRequest(filtered[visible.length].id);
            setVisibleLimit(limit => Math.min(inbox.length, limit + 4));
          }}
          className="min-h-[44px] min-w-[44px] w-full mt-2 rounded-lg border border-border text-[11px] font-bold"
        >Load more messages</button>
      )}
      </>)}
    </div>
  );
}

export default InboxCard;
