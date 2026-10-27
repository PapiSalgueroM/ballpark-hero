import type { RefObject } from 'react';
import { Link } from 'react-router-dom';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { HUB_NAV } from '@/lib/sportHubNav';
import { useRoutePath } from '@/hooks/useRoutePath';
import { savedGames, type SavedGame } from '@/data/continueSaves';

export interface SiteMenuPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef: RefObject<HTMLButtonElement>;
  id: string;
}
const PLAY_LINKS = [['/', 'Home'], ['/search', 'Search Games'], ['/records', 'Record Books'],
  ['/leaderboard', 'Leaderboard'], ['/whats-new', "What's New"]] as const;
const SITE_LINKS = [['/about', 'About'], ['/contact', 'Contact'], ['/privacy', 'Privacy Policy'],
  ['/cookie-policy', 'Cookie Policy'], ['/terms', 'Terms of Service'], ['/accessibility', 'Accessibility']] as const;

export function SiteMenuPanel({ open, onOpenChange, returnFocusRef, id }: SiteMenuPanelProps) {
  const path = useRoutePath();
  let saved: SavedGame[] = [];
  if (open) {
    try { saved = savedGames(window.localStorage); } catch { saved = []; }
  }
  const link = (to: string, label: string) => (
    <SheetClose asChild key={to}>
      <Link to={to} aria-current={path === to ? 'page' : undefined}
        className={`flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${path === to ? 'bg-primary/10 text-primary' : 'hover:bg-accent hover:text-accent-foreground'}`}>
        {label}
      </Link>
    </SheetClose>
  );
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" id={id} data-site-chrome=""
        onCloseAutoFocus={event => { event.preventDefault(); returnFocusRef.current?.focus({ preventScroll: true }); }}
        className="flex h-[100dvh] w-[calc(100vw_-_1rem)] max-w-sm flex-col gap-0 p-0 motion-reduce:!animate-none motion-reduce:!transition-none [&>button]:inline-flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center">
        <SheetHeader className="shrink-0 p-5 pr-16 text-left">
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>Find games, sports and site links.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6">
          <div data-dukb-help-cookie-choices="" className="mb-4 empty:hidden" />
          <nav aria-label="Site navigation" className="space-y-5">
            <section>
              <h3 className="mb-2 px-3 text-sm font-semibold text-muted-foreground">Play</h3>
              <div className="grid grid-cols-2 gap-1">{PLAY_LINKS.map(([to, label]) => link(to, label))}</div>
            </section>
            {saved.length > 0 && <section aria-label="Saved games" data-no-prerender="">
              <h3 className="mb-1 px-3 text-sm font-semibold text-muted-foreground">Saved games</h3>
              <p className="mb-2 px-3 text-xs text-muted-foreground">Saved in this browser</p>
              <div className="space-y-1">{saved.map(({ game }) => link(game.path, game.label))}</div>
            </section>}
            <section>
              <h3 className="mb-2 px-3 text-sm font-semibold text-muted-foreground">Sports</h3>
              <div className="grid grid-cols-2 gap-1">{HUB_NAV.map(hub => link(hub.route, hub.navLabel))}</div>
            </section>
            <section>
              <h3 className="mb-2 px-3 text-sm font-semibold text-muted-foreground">About the site</h3>
              <div className="space-y-1">{SITE_LINKS.map(([to, label]) => link(to, label))}</div>
            </section>
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
