import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useLocation, useNavigate, useNavigationType, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, Gamepad2, Search, Shuffle, X } from 'lucide-react';
import type { GameDef } from '@/data/gameRegistry';
import { describeSave, savedGames } from '@/data/continueSaves';
import { useGamePicks } from '@/hooks/useGamePicks';
import { GamePickButton, GamePicksWarning } from '@/components/game/GamePickButton';
import { CATEGORY_SPORT } from '@/data/homeFront';
import { SportGlyph, sportStyle } from '@/components/home/SportGlyph';
import { HUB_NAV } from '@/lib/sportHubNav';
import type { SportHub } from '@/lib/sportHub';
import styles from './HubExperience.module.css';

const arenas = {
  '/soccer': { image: '/arenas/soccer.webp', color: '#75e0a3', line: 'Your next chapter starts on the pitch.' },
  '/pro-basketball': { image: '/arenas/basketball.webp', color: '#ffbc71', line: 'Build your name. Run the league.' },
  '/pro-football': { image: '/arenas/football.webp', color: '#a5cdfa', line: 'Make the roster. Make the big calls.' },
  '/hockey': { image: '/arenas/hockey.webp', color: '#97e5ee', line: 'Take the ice. Build a contender.' },
  '/baseball': { image: '/arenas/baseball.webp', color: '#ffb995', line: 'Chase your call-up. Build for October.' },
  '/college': { image: '/arenas/football.webp', color: '#d6bbff', line: 'Build a program people remember.' },
};

export type HubFilter = 'all' | 'daily' | 'sim' | 'saved';
export function filterHubGames(games: GameDef[], filter: HubFilter, query: string, savedPaths: string[] = []): GameDef[] {
  const needle = query.trim().toLocaleLowerCase();
  return games.filter(game => (filter === 'all' || (filter === 'saved' ? savedPaths.includes(game.path) : filter === 'daily' ? game.daily : game.featured))
    && (!needle || `${game.label} ${game.description}`.toLocaleLowerCase().includes(needle)));
}

function readContinuations(games: GameDef[]) {
  try {
    return Object.fromEntries(savedGames(window.localStorage)
      .filter(({ game }) => games.some(item => item.path === game.path))
      .map(({ entry }) => [entry.path, describeSave(entry, window.localStorage.getItem(entry.saveKey)) || 'Saved in this browser']));
  } catch { return {}; }
}

export default function HubExperience({ hub, games }: { hub: SportHub; games: GameDef[] }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation(), navigationType = useNavigationType(), owner = useId(), incomingSearch = searchParams.toString();
  const latestSearch = useRef(incomingSearch), sequence = useRef(0);
  const [librarySearch, setLibrarySearch] = useState(incomingSearch);
  useLayoutEffect(() => {
    const issued = location.state?.dukbHubLibrary;
    if (navigationType === 'REPLACE' && issued?.owner === owner && Number.isInteger(issued.sequence)
      && issued.sequence > 0 && issued.sequence <= sequence.current && issued.search === incomingSearch) return;
    latestSearch.current = incomingSearch;
    setLibrarySearch(incomingSearch);
  }, [location.key, location.state, navigationType, owner, incomingSearch]);
  const libraryParams = new URLSearchParams(librarySearch);
  const requestedFilter = libraryParams.get('filter');
  const filter: HubFilter = requestedFilter === 'daily' || requestedFilter === 'sim' || requestedFilter === 'saved' ? requestedFilter : 'all';
  const query = libraryParams.get('q') ?? '';
  const setLibrary = (nextFilter: HubFilter | undefined, nextQuery?: string) => {
    const next = new URLSearchParams(latestSearch.current);
    if (nextFilter !== undefined) {
      if (nextFilter === 'all') next.delete('filter'); else next.set('filter', nextFilter);
    }
    if (nextQuery !== undefined) {
      if (nextQuery) next.set('q', nextQuery); else next.delete('q');
    }
    const value = next.toString();
    latestSearch.current = value;
    setLibrarySearch(value);
    const state = location.state && Object.getPrototypeOf(location.state) === Object.prototype ? location.state : {};
    setSearchParams(next, { replace: true, preventScrollReset: true, state: { ...state, dukbHubLibrary: { owner, sequence: ++sequence.current, search: value } } });
  };
  const setFilter = (nextFilter: HubFilter) => setLibrary(nextFilter);
  const setQuery = (nextQuery: string) => setLibrary(undefined, nextQuery);
  const searchRef = useRef<HTMLInputElement>(null);
  const [saveRevision, setSaveRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setSaveRevision(value => value + 1);
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener('focus', refresh); };
  }, []);
  const continuations = useMemo(() => readContinuations(games), [games, saveRevision]);
  const picks = useGamePicks();
  const arena = arenas[hub.route as keyof typeof arenas] ?? arenas['/soccer'];
  const arenaImage = <img src={arena.image} width="1672" height="941" alt="" className={styles.arenaImage} fetchPriority="high" />;
  const visible = filterHubGames(games, filter, query, Object.keys(continuations));
  const deep = visible.filter(game => game.featured);
  const quick = visible.filter(game => !game.featured).sort((a, b) => Number(!!b.daily) - Number(!!a.daily));
  const first = games.find(game => game.featured) ?? games[0];
  const saved = games.filter(game => continuations[game.path]);
  const dailyCount = games.filter(game => game.daily).length;
  const filters: { id: HubFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All games', count: games.length },
    { id: 'sim', label: 'Careers & sims', count: games.filter(game => game.featured).length },
    { id: 'daily', label: 'Daily puzzles', count: dailyCount },
    { id: 'saved', label: 'Saved games', count: saved.length },
  ];

  const card = (game: GameDef, featured = false) => (
    <article key={game.path} data-hub-game={game.path} className={featured ? styles.featuredCard : styles.gameCard}>
      <span aria-hidden="true" className={styles.gameIcon}>{game.emoji}</span>
      <div className={styles.gameCopy}>
        <h3><Link className={styles.gameLink} to={game.path}>{game.label}</Link></h3>
        <p>{game.description}</p>
        <div className={styles.cardActions}>
          {continuations[game.path] ? (
            <span data-no-prerender data-hub-resume className={styles.resumeLine}>Resume: {continuations[game.path]}</span>
          ) : <span className={styles.gameAction}>{game.daily ? 'Daily challenge' : featured ? 'Start playing' : 'Play now'} <ArrowUpRight aria-hidden="true" /></span>}
          <GamePickButton game={game} pinned={picks.paths.includes(game.path)} onToggle={picks.toggle} className={styles.pickButton} />
        </div>
      </div>
      {game.daily && <CalendarDays className={styles.dailyIcon} aria-label="Daily" />}
    </article>
  );

  return (
    <div data-hub-experience className={styles.experience} style={{ '--arena-accent': arena.color } as CSSProperties}>
      <nav aria-label="Sport hubs" className={styles.sports}>
        {HUB_NAV.map(item => <Link key={item.route} to={item.route} aria-current={item.route === hub.route ? 'page' : undefined} style={sportStyle(CATEGORY_SPORT[item.titles[0]])}>
          <SportGlyph sport={CATEGORY_SPORT[item.titles[0]]} />{item.navLabel}
        </Link>)}
      </nav>

      <header className={styles.arena}>
        {hub.route === '/soccer' ? (
          <picture>
            <source media="(max-width: 640px) and (max-resolution: 2dppx)" srcSet="/arenas/soccer-1280.webp" />
            {arenaImage}
          </picture>
        ) : arenaImage}
        <div className={styles.arenaCopy}>
          <h1 className="font-display">{hub.h1}</h1>
          <p className={styles.tagline}>{arena.line}</p>
          <p className={styles.welcome}>All {games.length} of them in one place. Every one is free with no sign-up.</p>
          {first && <Link to={saved[0]?.path ?? first.path} className={styles.heroPlay}>
            <Gamepad2 aria-hidden="true" />{saved[0] ? `Resume ${saved[0].label}` : `Play ${first.label}`}<ArrowUpRight aria-hidden="true" />
          </Link>}
        </div>
        <div className={styles.arenaScoreboard} aria-label="Available games">
          <span><b>{games.length}</b> games</span><span><b>{dailyCount}</b> daily puzzles</span>
        </div>
      </header>

      {saved.length > 0 && <section data-no-prerender aria-label="Your saved games" className={styles.saved}>
        <h2>Pick up where you left off</h2>
        <div>{saved.map(game => <Link key={game.path} to={game.path} data-hub-saved={game.path}>
          <span aria-hidden="true">{game.emoji}</span><span><b>{game.label}</b><small>{continuations[game.path]}</small></span><ArrowUpRight aria-hidden="true" />
        </Link>)}</div>
      </section>}

      <section className={styles.library} aria-label={`${hub.navLabel} game library`}>
        <div className={styles.libraryTop}>
          <div><h2 className="font-display">What are you playing?</h2><p>{hub.intro}</p></div>
          <button className={styles.shuffle} disabled={visible.length === 0} onClick={() => {
            const game = visible[Math.floor(Math.random() * visible.length)];
            if (game) navigate(game.path);
          }}><Shuffle aria-hidden="true" />Pick a game for me</button>
        </div>
        <div className={styles.controls}>
          <div role="group" aria-label="Filter games" className={styles.filters}>
            {filters.filter(item => item.count > 0 || item.id === 'saved' && filter === 'saved').map(item => <button key={item.id} data-no-prerender={item.id === 'saved' || undefined} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}<span>{item.count}</span></button>)}
          </div>
          <label className={styles.search}><Search aria-hidden="true" /><input ref={searchRef} aria-label={`Search ${hub.navLabel} games`} value={query} onChange={event => setQuery(event.target.value)} placeholder="Find your game" />
            {query && <button onClick={() => { setQuery(''); searchRef.current?.focus({ preventScroll: true }); }} aria-label="Clear game search"><X /></button>}
          </label>
        </div>
        <p className={styles.sectionNote}>Pin a game to keep it on Home.</p>
        {picks.storageFailed && <GamePicksWarning />}
        <p role="status" className={styles.resultCount}>{visible.length} {visible.length === 1 ? 'game' : 'games'}{query ? ` matching "${query.trim()}"` : ''}</p>
        {deep.length > 0 && <section className={styles.deep} aria-label="Careers and simulations">
          <h2 className="font-display">{hub.deep?.heading ?? 'Careers and simulations'}</h2>
          {hub.deep?.blurb && <p className={styles.sectionNote}>{hub.deep.blurb}</p>}
          <div className={styles.featuredGrid}>{deep.map(game => card(game, true))}</div>
        </section>}
        {quick.length > 0 && <section className={styles.quick} aria-label="Puzzles and quick games">
          <h2 className="font-display">{hub.quick.heading}</h2>
          <p className={styles.sectionNote}>{hub.quick.blurb}</p>
          <div className={styles.gameGrid}>{quick.map(game => card(game))}</div>
        </section>}
        {visible.length === 0 && <div className={styles.empty}><Search aria-hidden="true" /><h3>{filter === 'saved' && saved.length === 0 ? 'No saved games here yet.' : 'No games match that search.'}</h3><p>{filter === 'saved' && saved.length === 0 ? 'Play a career or sim to keep your progress in this browser.' : 'Try a shorter name, or see the full collection.'}</p><button onClick={() => { setLibrary('all', ''); searchRef.current?.focus({ preventScroll: true }); }}>Show all {hub.navLabel} games</button></div>}
      </section>
    </div>
  );
}
