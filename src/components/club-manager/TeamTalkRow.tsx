import { cn } from '@/lib/utils';
import { Megaphone } from 'lucide-react';
import { TALK_TONES } from '@/lib/clubManager';
import type { TalkTone } from '@/lib/clubManager';

interface TeamTalkRowProps {
  /** What you have already said, or nothing yet. */
  tone: TalkTone | null;
  onTone: (tone: TalkTone) => void;
  /** The read on the situation, in the language a manager would use. */
  read: string | null;
  /** "Before kick off" or "At the interval". */
  when: string;
  /** Round 135: they stop listening if it is the same thing every week. */
  stale?: boolean;
}

/**
 * Round 135: the four things you can say, and nothing else.
 *
 * Four buttons on one row on purpose. This sits directly above Play Match on
 * the club home screen and directly above Second Half in the dressing room, so
 * it has to be one tap and it has to leave the button you came for in view.
 * Anything that opened its own screen here would turn the one moment in the
 * week where a manager actually talks to his players into a form to fill in,
 * and after twenty seasons nobody would ever touch it.
 *
 * The read line above the buttons is the whole game. It tells you what the
 * afternoon looks like without telling you what to say, which is the difference
 * between a decision and a quiz with the answer printed underneath.
 */
export function TeamTalkRow({ tone, onTone, read, when, stale }: TeamTalkRowProps) {
  const said = tone ? TALK_TONES.find(t => t.id === tone) ?? null : null;
  return (
    <div className="rounded-xl border border-border bg-card p-2.5 text-left">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
        <Megaphone className="w-3 h-3" /> Team talk {'·'} {when}
      </div>
      {read && <p className="text-[10px] text-muted-foreground italic mb-1.5 leading-snug">{read}</p>}
      <div className="grid grid-cols-4 gap-1.5">
        {TALK_TONES.map(t => (
          <button
            key={t.id}
            onClick={() => onTone(t.id)}
            title={t.blurb}
            className={cn(
              'rounded-lg border px-1 py-1.5 text-center transition-colors',
              tone === t.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50',
            )}
          >
            <span className="block text-sm leading-none mb-0.5">{t.emoji}</span>
            <span className={cn('block text-[9px] font-bold leading-tight', tone === t.id ? 'text-primary' : 'text-foreground')}>
              {t.label}
            </span>
          </button>
        ))}
      </div>
      <p className="text-[9px] text-muted-foreground mt-1.5 leading-snug">
        {said
          ? `${said.blurb}${stale ? ' They have heard this one a lot lately, so it will not land the way it used to.' : ''}`
          : 'Say nothing and they go out the way they came in. Get it right and they play above themselves. Get it badly wrong and you lose them.'}
      </p>
    </div>
  );
}

export default TeamTalkRow;
