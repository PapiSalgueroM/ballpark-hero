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

interface Props {
  action: 'retire' | 'restart';
  sport: 'NFL' | 'NBA' | 'MLB' | 'NHL';
  onConfirm: () => void;
  children: ReactElement;
}

export default function USCareerActionConfirm({ action, sport, onConfirm, children }: Props) {
  const [open, setOpen] = useState(false);
  const acceptedRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const retiring = action === 'retire';

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
          <AlertDialogTitle>{retiring ? 'Retire this player?' : 'Start a new career?'}</AlertDialogTitle>
          <AlertDialogDescription>
            {retiring
              ? 'Your seasons and stats stay saved, and you can start or resume coaching afterward. You cannot play another season with this player.'
              : `This deletes your saved ${sport} player and coaching career on this device. You cannot undo this.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11 min-w-11">
            {retiring ? 'Keep playing' : 'Keep this career'}
          </AlertDialogCancel>
          <AlertDialogAction onClick={confirm} className="min-h-11 min-w-11">
            {retiring ? 'Retire this player' : 'Start new career'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
