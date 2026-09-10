/* ─── Round 521: the inbox panel, drawn once ─────────────────────────────────

   A list of delivered texts, tap one to read it and reply, on
   careerInbox.ts's InboxMessage shape. This covers the Round 80 "legacy"
   half of the flagship's phone (a message, a few canned replies, a small
   mood swing): the flagship's own PhonePanel.tsx also carries its Round 130
   thread system (contacts, open conversations, a world feed) on top of
   that, which nothing outside the flagship has yet, so this file
   deliberately stays the smaller thing rather than trying to be a second
   copy of a 600 line component. Sport neutral: messages and the answer
   callback come in as props. */
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { InboxMessage } from '@/lib/careerInbox';

export function InboxPanel({ messages, onAnswer }: {
  /** Newest delivered first reads best; this component does not resort them. */
  messages: InboxMessage[];
  onAnswer: (msgId: string, choiceIdx: number) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = messages.find(m => m.id === openId) ?? null;

  if (open) {
    return (
      <div className="space-y-3">
        <button onClick={() => setOpenId(null)} className="text-[11px] font-bold text-muted-foreground hover:text-foreground">
          ← Back to inbox
        </button>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{open.emoji} {open.from}</p>
          <p className="mt-2 text-sm text-foreground">{open.text}</p>
        </div>
        {open.answered !== undefined ? (
          <p className="rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
            You replied: <span className="font-semibold text-foreground">{open.choices[open.answered]?.label}</span>
          </p>
        ) : (
          <div className="space-y-1.5">
            {open.choices.map((c, i) => (
              <button
                key={i}
                onClick={() => { onAnswer(open.id, i); setOpenId(null); }}
                className="w-full rounded-xl border border-border bg-secondary px-3 py-2 text-left text-xs font-semibold text-foreground hover:border-primary/50"
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-card p-4 text-center text-xs text-muted-foreground">
        No texts yet. Play a season and your phone will buzz.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {messages.map(m => (
        <button
          key={m.id}
          onClick={() => setOpenId(m.id)}
          className={cn(
            'flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left',
            m.answered === undefined ? 'border-primary/40 bg-primary/5' : 'border-border bg-card',
          )}
        >
          <span className="text-lg leading-none">{m.emoji}</span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              {m.from}
              {m.answered === undefined && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
            </span>
            <span className="block truncate text-[11px] text-muted-foreground">{m.text}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
