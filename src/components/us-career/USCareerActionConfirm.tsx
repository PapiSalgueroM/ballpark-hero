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
}

/* Round 1346: one copy table, so the coaching retirement reuses the prompt Round 886 proved
   (one accept per opening, Cancel first, focus back without scrolling, nothing on unmount). */
const COPY: Record<Action, (sport: Sport) => { title: string; description: string; cancel: string; confirm: string }> = {
  retire: () => ({
    title: 'Retire this player?',
    description: 'Your seasons and stats stay saved, and you can start or resume coaching afterward. You cannot play another season with this player.',
    cancel: 'Keep playing',
    confirm: 'Retire this player',
  }),
  restart: sport => ({
    title: 'Start a new career?',
    description: `This deletes your saved ${sport} player and coaching career on this device. You cannot undo this.`,
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

export default function USCareerActionConfirm({ action, sport, onConfirm, children }: Props) {
  const [open, setOpen] = useState(false);
  const acceptedRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const copy = COPY[action](sport);

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
