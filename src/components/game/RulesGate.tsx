import { useLocation } from 'react-router-dom';
import { useState, useEffect, ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface RulesGateProps {
  /** Dialog title, e.g. "How to Play Missing XI". */
  title: string;
  /** Rules content. Free-form so any game can pass its own sections/lists. */
  children: ReactNode;
  /** Position the trigger absolutely in a relative-positioned header.
   *  Set false to render the trigger inline instead. Defaults to true. */
  floatingTrigger?: boolean;
  /** aria-label for the trigger button. Defaults to "How to play". */
  triggerLabel?: string;
  className?: string;
}

/**
 * Sitewide rules convention: the rules Dialog auto-opens every time the game
 * is entered (every mount, not just first visit), then collapses into a
 * small "?" button that reopens it on demand. This differs from
 * HowToPlayPopover (which only auto-opens once per browser via localStorage
 * on Footle) per the owner's live-testing note that rules should show on
 * every visit, not just the first.
 *
 * Reuses the same Dialog primitives and visual style as HowToPlayPopover so
 * adopting games look identical to existing How-to-Play dialogs.
 */
export function RulesGate({
  title,
  children,
  floatingTrigger = true,
  triggerLabel = 'How to play',
  className,
}: RulesGateProps) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const localStorageKey = `rules-gate-seen:${pathname}`;

  // The rules dialog remains visible on first entry to a game route, then
  // turns into a reusable "?" button. This stays on the same path so
  // first-timers do not get the pop-up every single visit, but a returning
  // player still has a fast way to reopen it.
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const seen = localStorage.getItem(localStorageKey);
      if (!seen) {
        setOpen(true);
        localStorage.setItem(localStorageKey, '1');
      }
    } catch {
      // Storage is not available in every browser mode.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={triggerLabel}
        className={cn(
          floatingTrigger && 'absolute top-0 right-0',
          'p-2 text-muted-foreground hover:text-primary transition-colors rounded-full hover:bg-surface-2',
          className,
        )}
      >
        <HelpCircle className="w-5 h-5 md:w-6 md:h-6" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-card border-border text-foreground max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display text-primary text-center">
              {title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 text-sm">
            {children}

            <button
              onClick={() => setOpen(false)}
              className="w-full py-3 min-h-[44px] bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              Let's Play!
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default RulesGate;
