/**
 * Round 1323: the notice a page shows once another tab has played its save on
 * (src/lib/saveFence.ts, one tab wins). Generic: Club Manager mounts it now,
 * and any long game whose save is fenced mounts the same one with its own
 * words.
 *
 * A fixed dialog over the page, so nothing under it moves: no scroll lock and
 * no layout change, which is the no jump rule. While it shows, everything else
 * in the document is inert, so no press and no key reaches the stale game
 * behind it, and focus sits on its one button. No entrance animation at all,
 * so reduced motion has nothing to turn off.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  /** The game's own words. */
  message: string;
  /** Defaults to a reload of the page, which makes this tab the newest. */
  onReload?: () => void;
}

export default function SaveMovedNotice({ message, onReload }: Props) {
  const [host] = useState(() => (typeof document === 'undefined' ? null : document.createElement('div')));
  const button = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!host) return;
    document.body.appendChild(host);
    const others = Array.from(document.body.children).filter(el => el !== host && !el.hasAttribute('inert'));
    others.forEach(el => el.setAttribute('inert', ''));
    button.current?.focus();
    return () => {
      others.forEach(el => el.removeAttribute('inert'));
      host.remove();
    };
  }, [host]);
  if (!host) return null;
  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-describedby="save-moved-words"
      data-testid="save-moved-notice"
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-background/85 p-4"
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-center shadow-xl">
        <p id="save-moved-words" className="text-base font-bold text-foreground">{message}</p>
        <button
          ref={button}
          type="button"
          onClick={() => (onReload ? onReload() : window.location.reload())}
          className="mt-4 min-h-[44px] w-full rounded-xl bg-primary px-4 py-2.5 text-base font-bold text-primary-foreground"
        >
          Reload
        </button>
      </div>
    </div>,
    host,
  );
}
