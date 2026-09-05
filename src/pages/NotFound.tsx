import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { FEATURED_GAMES, ALL_GAMES, TOTAL_GAMES } from "@/data/gameRegistry";

/* Round 53: a real 404 instead of the stock template. Branded, helpful, and
   noindexed so search engines never waste crawl budget on dead ends. */

const POPULAR_PATHS = ["/soccer-career", "/footle", "/college-grid", "/conquest", "/nba-connections", "/build-your-xi"];

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    document.querySelector('meta[name="robots"][data-dukb-fallback]')?.remove();
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    return () => {
      document.querySelector('meta[name="robots"][data-dukb-fallback]')?.remove();
      document.querySelector('meta[name="robots"][data-dukb-not-found]')?.remove();
    };
  }, [location.pathname]);

  const popular = POPULAR_PATHS
    .map(p => ALL_GAMES.find(g => g.path === p))
    .filter((g): g is NonNullable<typeof g> => Boolean(g));
  const featured = FEATURED_GAMES.filter(g => !POPULAR_PATHS.includes(g.path)).slice(0, 2);
  const suggestions = [...popular, ...featured].slice(0, 6);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Helmet>
        <title>Page Not Found | DoUKnowBall</title>
        <meta name="robots" content="noindex" data-dukb-not-found="" />
      </Helmet>
      <div className="w-full max-w-lg text-center">
        <p className="text-6xl">🥅</p>
        <h1 className="mt-3 font-display text-4xl font-black text-foreground">404: Shot went wide</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          There is no page at <span className="font-mono text-foreground">{location.pathname}</span>.
          Either the link is old, or someone fed you a bad pass.
        </p>

        <p className="mt-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Play something good instead
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {suggestions.map(g => (
            <Link
              key={g.path}
              to={g.path}
              className="rounded-xl border border-border bg-card px-3 py-3 text-center transition-all hover:scale-[1.03] hover:border-primary/60"
            >
              <span className="block text-2xl">{g.emoji}</span>
              <span className="mt-1 block truncate text-xs font-bold text-foreground">{g.label}</span>
            </Link>
          ))}
        </div>

        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
        >
          {`See all ${TOTAL_GAMES} games`}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
