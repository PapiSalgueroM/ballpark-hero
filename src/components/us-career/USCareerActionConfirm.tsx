import { useRef, useState, type ReactElement } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type Sport = 'NFL' | 'NBA' | 'MLB' | 'NHL';
type Action = 'retire' | 'restart' | 'retireCoach';

interface Props {
  action: Action;
  sport: Sport;
  onConfirm: () => void;
  children: ReactElement;
  /** Round 1569 (the lead's ruling R3): the career being cleared is retired and has a Hall of Fame card. The
      card is drawn from this one save, so a restart takes it too, and the prompt says so. */
  hallCard?: boolean;
  /** Round 1570: that card is up on the sport's Hall wall, kept apart from the save, so it stays after the
      restart. False (the default) whenever the browser did not keep the plaque, and the prompt then says it goes. */
  hallKept?: boolean;
}

/* Round 1346: one copy table, so the coaching retirement reuses the prompt Round 886 proved
   (one accept per opening, Cancel first, focus back without scrolling, nothing on unmount). */
const COPY: Record<Action, (sport: Sport, hallCard: boolean, hallKept: boolean) => { title: string; description: string; cancel: string; confirm: string }> = {
  retire: () => ({
    title: 'Retire this player?',
    description: 'Your seasons and stats stay saved, and you can start or resume coaching afterward. You cannot play another season with this player.',
    cancel: 'Keep playing',
    confirm: 'Retire this player',
  }),
  restart: (sport, hallCard, hallKept) => ({
    title: 'Start a new career?',
    description: `This deletes your saved ${sport} player and coaching career on this device.${hallCard ? (hallKept ? ' The Hall of Fame card stays on your Hall wall.' : ' The Hall of Fame card goes too.') : ''} You cannot undo this.`,
    cancel: 'Keep this career',
    confirm: 'Start new career',
  }),
  retireCoach: () => ({
    title: 'Retire from coaching?',
    description: 'Your coaching record and log stay saved. You cannot coach another season with this career.',
    cancel: 'Keep coaching',
    confirm: 'Retire from coaching',
  }),
};

export default function USCareerActionConfirm({ action, sport, onConfirm, children, hallCard = false, hallKept = false }: Props) {
  const [open, setOpen] = useState(false);
  const acceptedRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const copy = COPY[action](sport, hallCard, hallKept);

  const changeOpen = (nextOpen: boolean) => {
    if (nextOpen) acceptedRef.current = false;
    setOpen(nextOpen);
  };

  const confirm = () => {
    if (!open || acceptedRef.current) return;
    acceptedRef.current = true;
    onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={changeOpen}>
      <AlertDialogTrigger asChild ref={triggerRef}>{children}</AlertDialogTrigger>
      <AlertDialogContent
        className="max-w-md"
        onCloseAutoFocus={event => {
          event.preventDefault();
          if (triggerRef.current?.isConnected) triggerRef.current.focus({ preventScroll: true });
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11 min-w-11">
            {copy.cancel}
          </AlertDialogCancel>
          <AlertDialogAction onClick={confirm} className="min-h-11 min-w-11">
            {copy.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
