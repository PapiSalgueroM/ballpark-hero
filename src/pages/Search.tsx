import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search as SearchIcon, X } from 'lucide-react';
import PageSeo from '@/components/seo/PageSeo';
import { CATEGORIES, FEATURED_GAMES, TOTAL_GAMES, type CategoryTitle } from '@/data/gameRegistry';
import { searchSite, groupBySport, isBrowse, type SearchResult } from '@/lib/siteSearch';

/**
 * ROUND 526: the whole site in one box.
 *
 * WHY. There are 121 games and three ways to reach one: the home grid, a sport
 * hub, or scrolling. A person who arrives knowing they want the hockey grid has
 * to go hunting for it. The home page has had a filter box on its own list for
 * a while; this is that idea given its own address, its own keyboard handling
 * and its own share of the engine, and both now run on src/lib/siteSearch.ts
 * rather than on two copies of one idea.
 *
 * NOTHING ON THIS PAGE IS COMPUTED FROM A CLOCK, on purpose. Every route but
 * the home page ships as a saved snapshot, and the prerenderer draws each one
 * three times with its own clock days apart and keeps only what all three
 * agree on. A NEW badge derived from today would disagree with itself and take
 * the whole tile out of the saved copy with it, which would cost this page the
 * one thing a crawler wants from it: 121 real internal links. So the tiles
 * carry the Daily badge, which is a flag in the registry and true on any day,
 * and no NEW badge. The home grid still shows NEW, because the home page is
 * never photographed.
 *
 * NOT IN THE SITEMAP, and it says so itself. A query page has no content of its
 * own: every word on it belongs to a game that already has its own indexed
 * page, so asking Google to index this would be asking it to index a second
 * copy of the game list. It passes noindex to PageSeo and keeps "follow", so
 * the links still count, and because the route is live and unsubmitted the
 * prerenderer photographs it anyway (that is what scripts/genHiddenStubs.mjs
 * and simHiddenPages call a hidden route) so the address answers for itself
 * instead of serving a copy of the home page.
 */

const ALL_SPORTS = 'All sports';

export default function Search() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(() => params.get('q') ?? '');
  const [sport, setSport] = useState<string>(ALL_SPORTS);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* The address carries the query so a search can be sent to somebody.
     replace: true, or every keystroke would be a back button press. */
  useEffect(() => {
    const current = params.get('q') ?? '';
    if (current === query) return;
    const next = new URLSearchParams(params);
    if (query) next.set('q', query); else next.delete('q');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  /* Focus the box on a pointer device only. On a phone, focusing it on arrival
     throws the keyboard up and shoves the page around, and this site has a rule
     about pages that jump. */
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)')?.matches) {
      inputRef.current?.focus();
    }
  }, []);

  const results = useMemo(() => searchSite(query), [query]);
  const shown = useMemo(
    () => (sport === ALL_SPORTS ? results : results.filter(r => r.category === sport)),
    [results, sport],
  );
  const groups = useMemo(() => groupBySport(shown), [shown]);
  const browsing = isBrowse(query);

  /* Which sports the current query can actually offer, so the filter never
     sends somebody to an empty list. */
  const sportsWithHits = useMemo(() => {
    const seen = new Set<CategoryTitle>(results.map(r => r.category));
    return CATEGORIES.filter(c => seen.has(c.title)).map(c => c.title);
  }, [results]);

  useEffect(() => {
    if (sport !== ALL_SPORTS && !sportsWithHits.includes(sport as CategoryTitle)) setSport(ALL_SPORTS);
  }, [sportsWithHits, sport]);

  /* Arrow keys walk the results and Enter opens one, because a search box you
     have to reach for the mouse in the middle of is half a search box. The
     links stay in the normal tab order as well: this adds a shortcut, it does
     not replace tabbing. */
  const move = (delta: number) => {
    const links = Array.from(listRef.current?.querySelectorAll<HTMLAnchorElement>('a[data-result]') ?? []);
    if (links.length === 0) return;
    const at = links.indexOf(document.activeElement as HTMLAnchorElement);
    const next = at < 0 ? (delta > 0 ? 0 : links.length - 1) : at + delta;
    const clamped = Math.max(0, Math.min(links.length - 1, next));
    links[clamped]?.focus();
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    const target = e.target as HTMLElement;
    /* The sport dropdown owns every arrow key it gets: up and down are how a
       native select is operated, and stealing them would break it. */
    if (target.tagName === 'SELECT') return;
    /* Left and right belong to the text cursor while the box has focus. Taking
       them there would mean a player could not edit their own query. */
    const inBox = target === inputRef.current;
    if (e.key === 'ArrowDown' || (!inBox && e.key === 'ArrowRight')) { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp' || (!inBox && e.key === 'ArrowLeft')) { e.preventDefault(); move(-1); }
    else if (e.key === 'Escape' && query) { e.preventDefault(); setQuery(''); inputRef.current?.focus(); }
  };

  return (
    <main
      id="dukb-main"
      tabIndex={-1}
      className="min-h-screen bg-background text-foreground px-4 py-8 max-w-4xl mx-auto"
      onKeyDown={onKeyDown}
    >
      <PageSeo
        title="Search Every Game - DoUKnowBall"
        description="Search all of the free sports games on DoUKnowBall by name, sport or the kind of game it is."
        path="/search"
        noindex
      />

      <button
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h1 className="text-2xl sm:text-3xl font-display font-bold mb-1">Search every game</h1>
      <p className="text-sm text-muted-foreground mb-5">
        {`All ${TOTAL_GAMES} of them. Type a name, a sport, or the kind of game you are after. Close enough spelling is fine.`}
      </p>

      <div className="flex flex-wrap items-stretch gap-2 mb-4">
        <div className="relative min-w-0 flex-1 basis-[12rem]">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search games"
            placeholder="Try: grid, hockey, manager, footle"
            className="w-full pl-10 pr-10 py-3 rounded-xl border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <label className="min-w-0 basis-full sm:basis-auto">
          <span className="sr-only">Filter by sport</span>
          <select
            value={sport}
            onChange={e => setSport(e.target.value)}
            className="h-full w-full rounded-xl border border-border bg-card px-3 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value={ALL_SPORTS}>{ALL_SPORTS}</option>
            {sportsWithHits.map(title => (
              <option key={title} value={title}>{title}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-xs text-muted-foreground mb-6" role="status">
        {browsing
          ? `${shown.length} ${shown.length === 1 ? 'game' : 'games'}, newest sports last. Start typing to narrow it down.`
          : `${shown.length} ${shown.length === 1 ? 'match' : 'matches'} for "${query.trim()}"`}
      </p>

      <div ref={listRef}>
        {shown.length === 0 ? (
          <EmptyState query={query} onClear={() => { setQuery(''); inputRef.current?.focus(); }} />
        ) : (
          groups.map(group => (
            <section key={group.sport} className="mb-8">
              <h2 className="flex items-baseline gap-2 text-sm font-display font-bold uppercase tracking-wider text-muted-foreground mb-3">
                {group.sport}
                <span className="text-xs font-normal normal-case tracking-normal">
                  ({group.results.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {group.results.map(result => (
                  <ResultTile key={result.game.path} result={result} browsing={browsing} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}

/** Why this game came back, in one word, when it was not the obvious reason.
 *  A result that surprises somebody should be able to explain itself. */
const REASON: Partial<Record<SearchResult['matchedOn'], string>> = {
  sport: 'sport match',
  keyword: 'mentioned in the guide',
  description: 'in the description',
  fuzzy: 'closest spelling',
};

/* The home page's tile, same border, same radius, same hover lift, same
   emoji-then-text shape. Copying the classes rather than inventing a second
   card style is the point: a person who has used the home grid has already
   learned this control. */
function ResultTile({ result, browsing }: { result: SearchResult; browsing: boolean }) {
  const { game } = result;
  const reason = browsing ? null : REASON[result.matchedOn];
  return (
    <Link
      to={game.path}
      data-result=""
      className="group flex items-start gap-3 rounded-xl border border-border bg-surface-1 p-4 hover:border-primary/40 hover:bg-surface-2 hover:-translate-y-0.5 focus-visible:border-primary focus-visible:-translate-y-0.5 transition-all duration-200"
    >
      <span className="text-2xl shrink-0 mt-0.5" aria-hidden="true">{game.emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-display font-bold text-foreground group-hover:text-primary transition-colors">
            {game.label}
          </span>
          {game.daily && (
            <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary">
              Daily
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{game.description}</p>
        {reason && (
          <p className="text-[10px] text-muted-foreground/70 mt-1">{reason}</p>
        )}
      </div>
    </Link>
  );
}

/** Honest: it says nothing matched, it does not pretend the three games below
 *  are what was asked for, and it gives a way back out. */
function EmptyState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
      <p className="text-sm text-foreground mb-1">Nothing matches "{query.trim()}".</p>
      <p className="text-xs text-muted-foreground mb-5">
        Spelling does not have to be perfect, so this one is probably a game we do not have yet.{' '}
        <button onClick={onClear} className="underline underline-offset-2 hover:text-foreground">
          Clear the box
        </button>{' '}
        to see everything.
      </p>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Or start with one of the big ones
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
        {FEATURED_GAMES.slice(0, 3).map(game => (
          <Link
            key={game.path}
            to={game.path}
            data-result=""
            className="group flex items-start gap-2 rounded-xl border border-border bg-surface-1 p-3 hover:border-primary/40 transition-colors"
          >
            <span className="text-xl shrink-0" aria-hidden="true">{game.emoji}</span>
            <span className="min-w-0">
              <span className="block font-display font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                {game.label}
              </span>
              <span className="block text-[11px] text-muted-foreground leading-snug line-clamp-2">{game.description}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
