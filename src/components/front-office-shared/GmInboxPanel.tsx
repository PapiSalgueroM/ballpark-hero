/* ─── Round 940: the desk inbox panel ─────────────────────────────────────────

   The us-career InboxPanel, by import, for every manager seat. Two things are
   added on top and nothing inside it is touched:

   1. Every option shows what it moves, written by choiceEffects from the same
      fields answerGmInbox applies, so the button and the effect cannot say
      different things.
   2. Newest first, because the deck appends and the panel does not resort.

   A board mounts it inside its own inbox tab and owns `seen` (the panel's own
   header explains why that set lives on the board). */
import { useMemo } from 'react';
import { InboxPanel } from '@/components/us-career/InboxPanel';
import { gmChoiceLabel, GM_INBOX_OPEN } from '@/lib/gmInbox';
import type { GmChoiceDef, GmInboxPack } from '@/lib/gmInbox';
import type { InboxMessage } from '@/lib/careerInbox';

export function GmInboxPanel({ pack, messages, onAnswer, seen }: {
  pack: GmInboxPack;
  messages: InboxMessage[];
  onAnswer: (msgId: string, choiceIdx: number) => void;
  seen: Set<string>;
}) {
  const shown = useMemo(() => [...messages].reverse().map(m => ({
    ...m,
    choices: m.choices.map(c => ({ ...c, label: gmChoiceLabel(c as GmChoiceDef, pack) })),
  })), [messages, pack]);
  const open = messages.filter(m => m.answered === undefined).length;
  return (
    <div className="space-y-2" data-gm-inbox={pack.seat}>
      <p className="text-[11px] text-muted-foreground">
        {open === 0 ? 'Nothing waiting on you.' : `${open} waiting on you.`} Each answer shows what it moves before you pick it.
        {open >= GM_INBOX_OPEN ? ' Nothing new lands until you answer one.' : ''}
      </p>
      <InboxPanel messages={shown} onAnswer={onAnswer} seen={seen} calendar={pack.calendar} />
    </div>
  );
}
