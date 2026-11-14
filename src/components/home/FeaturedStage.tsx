import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ALL_GAMES, type GameDef } from '@/data/gameRegistry';
import { HOME_STAGE, sportOf, type StageEntry } from '@/data/homeFront';
import { homeSaveStorage, useHomeSaveRefresh } from './homeSaveRefresh';
import { SportGlyph, sportStyle } from './SportGlyph';
import styles from './HomeLaunchDeck.module.css';

/* Art stays lazy: every destination is readable and playable before its
   drawing arrives, and the reserved panel keeps the controls in place. */
const HomeArt = lazy(() => import('./art/HomeArt'));

/** Save existence changes the invitation, never opens or rewrites a save. */
const stageSaveKeys = new Set(HOME_STAGE.flatMap(entry => entry.saveKey ? [entry.saveKey] : []));

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
  const rugbyManager = ALL_GAMES.find(game => game.path === '/nrl-team-manager');
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
        {cards.map((card, index) => <StageCard key={card.game.path} card={card} lead={index === 0}
          saved={!!card.entry.saveKey && saved.includes(card.entry.saveKey)} />)}
      </div>
      {rugbyManager && (
        <Link to={rugbyManager.path} style={sportStyle('rugby')} data-home-nrl-launch="" className={styles.rugbyLaunch}>
          <SportGlyph sport="rugby" className={styles.rugbyGlyph} />
          <span>{rugbyManager.label}</span>
          <ArrowRight aria-hidden="true" className={styles.launchArrow} />
        </Link>
      )}
    </section>
  );
}

function StageCard({ card, lead, saved }: { card: Card; lead: boolean; saved: boolean }) {
  const { entry, game } = card;
  const sport = sportOf(game.path);
  const resuming = saved && !!entry.continueCta;
  const cta = resuming ? entry.continueCta : entry.cta;

  return (
    <Link to={game.path} style={sportStyle(sport)} data-stage-card={game.path}
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
