import { useRef, ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useRulesGateState } from '@/hooks/useRulesGateState';

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
  state?: ReturnType<typeof useRulesGateState>;
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
  state,
}: RulesGateProps) {
  const ownState = useRulesGateState({ enabled: !state });
  const { open, setOpen } = state ?? ownState;
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={triggerRef}
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
        <DialogContent
          aria-describedby={undefined}
          className="max-w-md bg-card border-border text-foreground max-h-[85vh] overflow-y-auto"
          onCloseAutoFocus={event => {
            event.preventDefault();
            triggerRef.current?.focus({ preventScroll: true });
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-display text-primary text-center">
              {title}
            </DialogTitle>
          </DialogHeader>

          {open && <div data-dukb-help-cookie-choices="" className="empty:hidden" />}
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
