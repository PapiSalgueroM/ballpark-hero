import { useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, Gamepad2, Search, Shuffle, X } from 'lucide-react';
import type { GameDef } from '@/data/gameRegistry';
import { describeSave, savedGames } from '@/data/continueSaves';
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

export type HubFilter = 'all' | 'daily' | 'sim';
export function filterHubGames(games: GameDef[], filter: HubFilter, query: string): GameDef[] {
  const needle = query.trim().toLocaleLowerCase();
  return games.filter(game => (filter === 'all' || (filter === 'daily' ? game.daily : game.featured))
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
  const [filter, setFilter] = useState<HubFilter>('all');
  const [query, setQuery] = useState('');
  const [continuations] = useState<Record<string, string>>(() => readContinuations(games));
  const arena = arenas[hub.route as keyof typeof arenas] ?? arenas['/soccer'];
  const visible = filterHubGames(games, filter, query);
  const deep = visible.filter(game => game.featured);
  const quick = visible.filter(game => !game.featured).sort((a, b) => Number(!!b.daily) - Number(!!a.daily));
  const first = games.find(game => game.featured) ?? games[0];
  const saved = games.filter(game => continuations[game.path]);
  const dailyCount = games.filter(game => game.daily).length;
  const filters: { id: HubFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All games', count: games.length },
    { id: 'sim', label: 'Careers & sims', count: games.filter(game => game.featured).length },
    { id: 'daily', label: 'Daily puzzles', count: dailyCount },
  ];

  const card = (game: GameDef, featured = false) => (
    <article key={game.path} data-hub-game={game.path} className={featured ? styles.featuredCard : styles.gameCard}>
      <span aria-hidden="true" className={styles.gameIcon}>{game.emoji}</span>
      <div className={styles.gameCopy}>
        <h3><Link className={styles.gameLink} to={game.path}>{game.label}</Link></h3>
        <p>{game.description}</p>
        {continuations[game.path] ? (
          <span data-no-prerender data-hub-resume className={styles.resumeLine}>Resume: {continuations[game.path]}</span>
        ) : <span className={styles.gameAction}>{game.daily ? 'Daily challenge' : featured ? 'Start playing' : 'Play now'} <ArrowUpRight aria-hidden="true" /></span>}
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
        <img src={arena.image} width="1672" height="941" alt="" className={styles.arenaImage} fetchPriority="high" />
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
            {filters.filter(item => item.count > 0).map(item => <button key={item.id} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}<span>{item.count}</span></button>)}
          </div>
          <label className={styles.search}><Search aria-hidden="true" /><input aria-label={`Search ${hub.navLabel} games`} value={query} onChange={event => setQuery(event.target.value)} placeholder="Find your game" />
            {query && <button onClick={() => setQuery('')} aria-label="Clear game search"><X /></button>}
          </label>
        </div>
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
        {visible.length === 0 && <div className={styles.empty}><Search aria-hidden="true" /><h3>No games match that search.</h3><p>Try a shorter name, or see the full collection.</p><button onClick={() => { setQuery(''); setFilter('all'); }}>Show all {hub.navLabel} games</button></div>}
      </section>
    </div>
  );
}
