import { useState } from 'react';
import { Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GiveUpButtonProps {
  /** Called once the confirm step is accepted. Should reveal the answer,
   *  score the round as 0, and end play cleanly. */
  onGiveUp: () => void;
  /** Disable the button entirely (e.g. already game over, or still loading). */
  disabled?: boolean;
  className?: string;
  label?: string;
}

/**
 * Subtle danger-styled Give Up control with a confirm step, per the sitewide
 * convention: every guessing game needs a way to bail out that reveals the
 * answer, scores 0, and ends the round cleanly instead of leaving the player
 * stuck. Confirm step guards against fat-fingering a mid-guess tap.
 */
export function GiveUpButton({ onGiveUp, disabled, className, label = 'Give up' }: GiveUpButtonProps) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className={cn('flex items-center justify-center gap-2 flex-wrap', className)}>
        <span className="text-xs text-muted-foreground">Give up and see the answer?</span>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            onGiveUp();
          }}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
        >
          Yes, reveal it
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          Keep playing
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
    >
      <Flag className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

export default GiveUpButton;
