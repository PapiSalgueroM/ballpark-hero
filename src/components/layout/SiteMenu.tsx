import { useEffect, useId, useRef, useState, type ComponentType, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SiteMenuPanelProps } from './SiteMenuPanel';
import { useSiteMenuPlacement } from './SiteMenuHost';

export function SiteMenu() {
  const [open, setOpen] = useState(false);
  const [Panel, setPanel] = useState<ComponentType<SiteMenuPanelProps> | null>(null);
  const [failed, setFailed] = useState(false);
  const ownTrigger = useRef<HTMLButtonElement>(null);
  const placement = useSiteMenuPlacement();
  const trigger = placement?.trigger ?? ownTrigger;
  const id = useId();
  const { key } = useLocation();

  useEffect(() => { setOpen(false); }, [key]);
  useEffect(() => {
    if (!open || Panel || failed) return;
    let active = true;
    import('./SiteMenuPanel').then(
      module => { if (active) setPanel(() => module.SiteMenuPanel); },
      () => { if (active) setFailed(true); },
    );
    return () => { active = false; };
  }, [open, Panel, failed]);

  const close = () => {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  };

  const closeOnEscape = (event: KeyboardEvent) => {
    if (!open || Panel || event.key !== 'Escape') return;
    event.preventDefault();
    close();
  };

  const host = placement?.host;
  const button = <Button ref={placement?.setTrigger ?? trigger} type="button" variant="ghost" aria-label="Open site menu"
    aria-haspopup="dialog" aria-expanded={open} aria-controls={open && Panel ? id : undefined}
    aria-busy={open && !Panel && !failed ? true : undefined}
    onClick={() => setOpen(true)} onKeyDown={closeOnEscape} className={host
      ? 'h-11 min-h-11 w-11 shrink-0 self-start rounded-none p-0'
      : 'h-11 min-h-11 shrink-0 self-start gap-2 rounded-none px-3 text-sm'}>
    <Menu className="h-5 w-5" aria-hidden="true" />
    {!host && 'Menu'}
  </Button>;
  return <>
    {host ? createPortal(button, host) : <div data-site-chrome="" className="flex h-11 items-center border-b border-border/40 bg-background">{button}</div>}
    {Panel ? <Panel open={open} onOpenChange={setOpen} returnFocusRef={trigger} id={id} /> : open && (
      <div role="region" aria-label="Site menu loading" data-site-chrome="" onKeyDown={closeOnEscape}
        className="fixed left-3 right-3 top-28 z-50 max-w-sm rounded-xl border border-border bg-card p-4 shadow-lg">
        <p role={failed ? 'alert' : 'status'} className="text-sm text-muted-foreground">
          {failed ? 'Menu could not load. Use Search Games, or refresh to try again.' : 'Loading menu...'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/search" onClick={close} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm">Search Games</Link>
          <button type="button" onClick={close} className="min-h-11 rounded-lg border border-border px-3 text-sm">Cancel</button>
        </div>
      </div>
    )}
  </>;
}
