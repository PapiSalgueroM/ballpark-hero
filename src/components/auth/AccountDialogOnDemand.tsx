import { useEffect, useRef, useState, type ComponentType } from 'react';
import type { AuthModalProps } from '@/components/auth/AuthModal';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { reloadToRetryChunk } from '@/lib/freshBuild';

export function AccountDialogOnDemand({ isOpen, onClose, defaultTab }: AuthModalProps) {
  const [Modal, setModal] = useState<ComponentType<AuthModalProps> | null>(null);
  const [failed, setFailed] = useState(false);
  const [retryBlocked, setRetryBlocked] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  const formTookOver = useRef(false);

  if (isOpen && !wasOpen.current) {
    opener.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement : null;
  }
  wasOpen.current = isOpen;

  useEffect(() => {
    if (!isOpen || Modal) return;
    let active = true;
    setFailed(false);
    setRetryBlocked(false);
    import('@/components/auth/AuthModal').then(module => {
      if (active) setModal(() => module.AuthModal);
    }).catch(() => {
      if (active) setFailed(true);
    });
    return () => { active = false; };
  }, [isOpen, Modal]);

  // Keep the loaded form mounted so closing it keeps the fields it already held.
  if (Modal) {
    if (isOpen) formTookOver.current = true;
    return <Modal isOpen={isOpen} onClose={onClose} defaultTab={defaultTab} returnFocusTo={opener.current} />;
  }
  if (!isOpen) return null;

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent
        className="sm:max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto"
        onCloseAutoFocus={event => {
          if (formTookOver.current) {
            event.preventDefault();
            return;
          }
          if (!opener.current?.isConnected) return;
          event.preventDefault();
          opener.current.focus({ preventScroll: true });
        }}
      >
        <DialogHeader>
          <DialogTitle>{failed ? 'Account could not open' : 'Opening your account'}</DialogTitle>
          <DialogDescription>
            {retryBlocked ? 'Reconnect, or save your game, then try again.'
              : failed ? 'Check your connection and try again. You can close this and keep playing.'
                : 'You can close this and keep playing.'}
          </DialogDescription>
        </DialogHeader>
        {failed && (
          <Button onClick={() => {
            if (!reloadToRetryChunk()) setRetryBlocked(true);
          }}>Try again</Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
