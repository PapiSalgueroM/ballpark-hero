import { useEffect, useId, useRef, useState, type ComponentType, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SiteMenuPanelProps } from './SiteMenuPanel';
import { focusSiteMenuTrigger } from './siteMenuFocus';

const OPEN_EVENT = 'dukb-site-menu-open';

export interface SiteMenuProps {
  mode?: 'host' | 'fallback';
}

export function SiteMenu({ mode = 'fallback' }: SiteMenuProps) {
  const [open, setOpen] = useState(false);
  const [Panel, setPanel] = useState<ComponentType<SiteMenuPanelProps> | null>(null);
  const [failed, setFailed] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const currentOpen = useRef(false);
  const pendingImport = useRef<object | null>(null);
  const handedOff = useRef(false);
  const id = useId();
  const { key } = useLocation();

  const changeOpen = (next: boolean) => {
    currentOpen.current = next;
    if (!next) pendingImport.current = null;
    setOpen(next);
  };
  const openMenu = () => {
    handedOff.current = false;
    document.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: trigger.current }));
    changeOpen(true);
  };

  useEffect(() => {
    const anotherOpened = (event: Event) => {
      if ((event as CustomEvent<HTMLButtonElement | null>).detail === trigger.current) return;
      handedOff.current = true;
      changeOpen(false);
    };
    document.addEventListener(OPEN_EVENT, anotherOpened);
    return () => document.removeEventListener(OPEN_EVENT, anotherOpened);
  }, []);
  useEffect(() => { changeOpen(false); }, [key]);
  useEffect(() => {
    if (!open || Panel || failed) return;
    let active = true;
    const token = {};
    pendingImport.current = token;
    import('./SiteMenuPanel').then(
      module => { if (active && currentOpen.current && pendingImport.current === token) setPanel(() => module.SiteMenuPanel); },
      () => { if (active && currentOpen.current && pendingImport.current === token) setFailed(true); },
    );
    return () => {
      active = false;
      if (pendingImport.current === token) pendingImport.current = null;
    };
  }, [open, Panel, failed]);

  const close = () => {
    changeOpen(false);
    focusSiteMenuTrigger(trigger.current);
  };

  const closeOnEscape = (event: KeyboardEvent) => {
    if (!open || Panel || event.key !== 'Escape') return;
    event.preventDefault();
    close();
  };

  return <>
    <Button ref={trigger} type="button" variant="ghost" aria-label="Open site menu"
      aria-haspopup="dialog" aria-expanded={open} aria-controls={open && Panel ? id : undefined}
      aria-busy={open && !Panel && !failed ? true : undefined}
      onClick={openMenu} onKeyDown={closeOnEscape} className={mode === 'host'
        ? 'h-11 min-h-11 w-11 shrink-0 self-start rounded-none p-0'
        : 'h-11 min-h-11 shrink-0 self-start gap-2 rounded-none px-3 text-sm'}>
      <Menu className="h-5 w-5" aria-hidden="true" />
      {mode === 'fallback' && 'Menu'}
    </Button>
    {Panel ? <Panel open={open} onOpenChange={changeOpen} returnFocusRef={trigger} id={id}
      returnFocusAllowed={() => !handedOff.current && !currentOpen.current} /> : open && createPortal(
      <div role="region" aria-label="Site menu loading" data-site-chrome="" onKeyDown={closeOnEscape}
        className="fixed left-3 right-3 top-28 z-50 max-w-sm rounded-xl border border-border bg-card p-4 shadow-lg">
        <p role={failed ? 'alert' : 'status'} className="text-sm text-muted-foreground">
          {failed ? 'Menu could not load. Use Search Games, or refresh to try again.' : 'Loading menu...'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/search" onClick={close} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm">Search Games</Link>
          <button type="button" onClick={close} className="min-h-11 rounded-lg border border-border px-3 text-sm">Cancel</button>
        </div>
      </div>, document.body,
    )}
  </>;
}
