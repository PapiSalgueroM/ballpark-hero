import { useState, ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface HowToPlayPopoverProps {
  /** Dialog title, e.g. "How to Play Footle". */
  title: string;
  /** Rules content. Free-form so any game can pass its own sections/lists,
   *  matching the content-driven refactor in spec 3.7. */
  children: ReactNode;
  /** Control the open state from a parent (e.g. to also show it on first
   *  visit). If omitted, the component manages its own open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** aria-label for the trigger button. Defaults to "How to play". */
  triggerLabel?: string;
  /** Position the trigger absolutely in a relative-positioned header
   *  (spec 3.2). Set false to render the trigger inline instead. */
  floatingTrigger?: boolean;
  className?: string;
}

/**
 * Generalized how-to-play trigger + dialog per R5 spec 3.7. Content-driven
 * (title + children) instead of hardcoded, so any game can reuse it without
 * forking HowToPlay.tsx, which remains untouched and Footle-specific.
 */
export function HowToPlayPopover({
  title,
  children,
  open,
  onOpenChange,
  triggerLabel = 'How to play',
  floatingTrigger = true,
  className,
}: HowToPlayPopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;

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

      <Dialog open={isOpen} onOpenChange={setOpen}>
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

export default HowToPlayPopover;
