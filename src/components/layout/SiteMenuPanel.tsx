import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { HUB_NAV } from '@/lib/sportHubNav';
import { useRoutePath } from '@/hooks/useRoutePath';
import { isBrowse, searchSite } from '@/lib/siteSearch';

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
  const [query, setQuery] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const searching = !isBrowse(query);
  const results = useMemo(() => isBrowse(query) ? [] : searchSite(query), [query]);
  useEffect(() => { if (!open) setQuery(''); }, [open]);
  const link = (to: string, label: string, detail?: string) => (
    <SheetClose asChild key={to}>
      <Link to={to} aria-current={path === to ? 'page' : undefined}
        className={`flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${path === to ? 'bg-primary/10 text-primary' : 'hover:bg-accent hover:text-accent-foreground'}`}>
        <span className="min-w-0 break-words">
          {label}{detail && <span className="block text-xs font-normal text-muted-foreground"> {detail}</span>}
        </span>
      </Link>
    </SheetClose>
  );
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" id={id} data-site-chrome=""
        onOpenAutoFocus={event => {
          event.preventDefault();
          heading.current?.focus({ preventScroll: true });
        }}
        onCloseAutoFocus={event => { event.preventDefault(); returnFocusRef.current?.focus({ preventScroll: true }); }}
        className="flex h-[100dvh] w-[calc(100vw_-_1rem)] max-w-sm flex-col gap-0 p-0 motion-reduce:!animate-none motion-reduce:!transition-none [&>button]:inline-flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center">
        <SheetHeader className="shrink-0 p-5 pr-16 text-left">
          <SheetTitle ref={heading} tabIndex={-1} className="outline-none">Menu</SheetTitle>
          <SheetDescription>Find games, sports and site links.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6">
          <div data-dukb-help-cookie-choices="" className="mb-4 empty:hidden" />
          <section aria-label="Find a game" className="mb-5">
            <label htmlFor={`${id}-search`} className="text-sm font-semibold">Find a game</label>
            <div className="mt-2 flex items-center gap-2">
              <input ref={field} id={`${id}-search`} type="search" value={query}
                onChange={event => setQuery(event.target.value)} maxLength={80}
                autoComplete="off" spellCheck={false} placeholder="Game name or sport"
                className="min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              {query.length > 0 && <button type="button" aria-label="Clear search"
                onClick={() => { setQuery(''); field.current?.focus({ preventScroll: true }); }}
                className="min-h-11 shrink-0 rounded-lg border border-border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Clear</button>}
            </div>
            {searching && <section aria-label="Game results" className="mt-3">
              <p role="status" className="mb-2 text-sm text-muted-foreground">
                {results.length === 0 ? 'No games found. Try a game name or sport.'
                  : `${results.length} ${results.length === 1 ? 'game' : 'games'} found.${results.length > 6 ? ' Showing the first 6.' : ''}`}
              </p>
              <ul className="space-y-1">
                {results.slice(0, 6).map(({ game, category }) => <li key={game.path}>{link(game.path, game.label, category)}</li>)}
              </ul>
              {results.length > 6 && link('/search?' + new URLSearchParams({ q: query }).toString(), 'See all results')}
            </section>}
          </section>
          <nav aria-label="Site navigation" className="space-y-5">
            <section>
              <h3 className="mb-2 px-3 text-sm font-semibold text-muted-foreground">Play</h3>
              <div className="grid grid-cols-2 gap-1">{PLAY_LINKS.map(([to, label]) => link(to, label))}</div>
            </section>
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
