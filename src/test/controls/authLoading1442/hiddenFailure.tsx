import { useEffect, useRef, useState, type ComponentType } from 'react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'signup';
}

export function AuthModal(props: AuthModalProps) {
  const [Body, setBody] = useState<ComponentType<AuthModalProps> | null>(null);
  const [failed, setFailed] = useState(false);
  const requested = useRef(false);
  const opener = useRef<HTMLElement | null>(null);
  const open = useRef(false);

  useEffect(() => {
    if (props.isOpen && !open.current) {
      opener.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
        ? document.activeElement : null;
    }
    open.current = props.isOpen;
    if (props.isOpen && !requested.current) {
      requested.current = true;
      import('@/components/auth/AuthModalBody').then(
        module => {
          if (open.current && opener.current?.isConnected) opener.current.focus({ preventScroll: true });
          setBody(() => module.AuthModal);
        },
        () => setFailed(false),
      );
    }
    return () => { open.current = false; };
  }, [props.isOpen]);

  const cancel = () => {
    props.onClose();
    if (opener.current?.isConnected) opener.current.focus({ preventScroll: true });
  };

  // Keep the loaded form mounted while closed, just as the original dialog was.
  if (Body) return <Body {...props} />;
  if (!props.isOpen) return null;

  // Leave focus on the opener until the real dialog can claim it.
  return (
    <div role="region" aria-label="Account sign in" className="fixed left-4 right-4 top-4 z-[60] mx-auto max-w-md rounded-xl border border-border bg-card p-4 shadow-lg">
      <p role={failed ? 'alert' : 'status'} className="text-sm text-muted-foreground">
        {failed ? 'Account form could not load. Save your game, then refresh to try again.' : 'Loading account form...'}
      </p>
      <button type="button" onClick={cancel} className="mt-2 min-h-11 rounded-lg border border-border px-4 text-sm font-medium">Cancel</button>
    </div>
  );
}