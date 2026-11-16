import { Fragment, lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ALL_GAMES, type GameDef } from '@/data/gameRegistry';
import { HOME_STAGE, sportOf, type StageEntry } from '@/data/homeFront';
import { CLUB_MANAGER_ACTIVE_RESUME_QUERY } from '@/lib/clubManagerSaveKeys';
import { homeSaveStorage, useHomeSaveRefresh } from './homeSaveRefresh';
import { SportGlyph, sportStyle } from './SportGlyph';
import styles from './HomeLaunchDeck.module.css';

/* Art stays lazy: every destination is readable and playable before its
   drawing arrives, and the reserved panel keeps the controls in place. */
const HomeArt = lazy(() => import('./art/HomeArt'));

/** Save existence changes the invitation, never opens or rewrites a save. */
const stageSaveKeys = new Set(HOME_STAGE.flatMap(entry => entry.saveKey ? [entry.saveKey] : []));
const managerLinks = [
  { path: '/nrl-team-manager', sport: 'rugby' },
  { path: '/aussie-rules-manager', sport: 'aussie' },
] as const;

function stageSaves(storage: Storage | null): string[] {
  return [...stageSaveKeys].filter(key => {
    try { return !!storage && storage.getItem(key) !== null; }
    catch { return false; }
  });
}

interface Card { entry: StageEntry; game: GameDef }

export function FeaturedStage() {
  const cards = useMemo<Card[]>(() => HOME_STAGE.flatMap(entry => {
    const game = ALL_GAMES.find(g => g.path === entry.path);
    return game ? [{ entry, game }] : [];
  }), []);
  const [saved, setSaved] = useState(() => stageSaves(homeSaveStorage()));
  const refresh = useCallback((storage: Storage | null) => {
    const next = stageSaves(storage);
    setSaved(previous => previous.length === next.length && previous.every((key, i) => key === next[i]) ? previous : next);
  }, []);
  useHomeSaveRefresh(stageSaveKeys, refresh);
  if (cards.length === 0) return null;

  return (
    <section aria-labelledby="home-stage-title" data-home-stage="" className={styles.deck}>
      <h2 id="home-stage-title" className="sr-only">Main event</h2>
      <div className={styles.games}>
        {cards.map((card, index) => (
          <Fragment key={card.game.path}>
            <StageCard card={card} lead={index === 0} saved={!!card.entry.saveKey && saved.includes(card.entry.saveKey)} />
            {index === 0 && (
              <div className={styles.managers}>
                {managerLinks.map(({ path, sport }) => {
                  const game = ALL_GAMES.find(candidate => candidate.path === path);
                  return game && (
                    <Link key={path} to={path} style={sportStyle(sport)} data-home-manager-launch={sport}
                      data-home-nrl-launch={sport === 'rugby' ? '' : undefined} className={styles.managerLaunch}>
                      <SportGlyph sport={sport} className={styles.managerGlyph} />
                      <span>{game.label}</span>
                      <ArrowRight aria-hidden="true" className={styles.launchArrow} />
                    </Link>
                  );
                })}
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </section>
  );
}

function StageCard({ card, lead, saved }: { card: Card; lead: boolean; saved: boolean }) {
  const { entry, game } = card;
  const sport = sportOf(game.path);
  const resuming = saved && !!entry.continueCta;
  const cta = resuming ? entry.continueCta : entry.cta;
  const to = resuming && game.path === '/club-manager' ? game.path + CLUB_MANAGER_ACTIVE_RESUME_QUERY : game.path;

  return (
    <Link to={to} style={sportStyle(sport)} data-stage-card={game.path}
      className={cn(styles.game, lead && styles.lead)}>
      <span aria-hidden="true" className={styles.art}>
        <Suspense fallback={null}><HomeArt art={entry.art} /></Suspense>
      </span>
      <span aria-hidden="true" className={styles.shade} />
      <div className={styles.copy}>
        <span className={styles.kicker}>
          <SportGlyph sport={sport} className={styles.kickerGlyph} />
          {entry.kicker}
        </span>
        <h3 className={cn('font-display', styles.title)}>{game.label}</h3>
        {lead && <p className={styles.description}>{game.description}</p>}
        <span className={cn(styles.cta, lead && styles.primaryCta)}>
          <span>{cta}</span><ArrowRight aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
