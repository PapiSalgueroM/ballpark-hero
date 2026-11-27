import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ALL_GAMES, type GameDef } from '@/data/gameRegistry';
import { HOME_STAGE, sportOf, type StageEntry } from '@/data/homeFront';
import { SOCCER_CAREER_SAVE, continueSaveEntries } from '@/data/continueSaves';
import { CLUB_MANAGER_ACTIVE_RESUME_QUERY } from '@/lib/clubManagerSaveKeys';
import { homeSaveStorage, useHomeSaveRefresh } from './homeSaveRefresh';
import { SportGlyph, sportStyle } from './SportGlyph';
import styles from './HomeLaunchDeck.module.css';

/* Art stays lazy: every destination is readable and playable before its
   drawing arrives, and the reserved panel keeps the controls in place. */
const HomeArt = lazy(() => import('./art/HomeArt'));

/** Save existence changes the invitation, never opens or rewrites a save. */
const soccerSlots = continueSaveEntries(SOCCER_CAREER_SAVE);
const stageSaveKeys = new Set([
  ...HOME_STAGE.flatMap(entry => entry.saveKey ? [entry.saveKey] : []),
  ...soccerSlots.map(entry => entry.saveKey),
]);
const managerLinks = [
  { path: '/nrl-team-manager', sport: 'rugby' },
  { path: '/aussie-rules-manager', sport: 'aussie' },
] as const;
const moreCareerPaths = ['/nfl-my-career', '/mlb-my-career', '/nhl-my-career', '/fight-career'];

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
  const [featured, setFeatured] = useState(0);
  const [previewed, setPreviewed] = useState(false);
  const refresh = useCallback((storage: Storage | null) => {
    const next = stageSaves(storage);
    setSaved(previous => previous.length === next.length && previous.every((key, i) => key === next[i]) ? previous : next);
  }, []);
  useHomeSaveRefresh(stageSaveKeys, refresh);
  if (cards.length === 0) return null;
  const soccerResumeTo = soccerSlots.find(slot => saved.includes(slot.saveKey))?.path;
  const picks = cards.map(card => {
    const { entry, game } = card;
    const resumeTo = game.path === SOCCER_CAREER_SAVE.path ? soccerResumeTo
      : entry.saveKey && saved.includes(entry.saveKey) ? game.path : undefined;
    const cta = resumeTo && entry.continueCta ? entry.continueCta : entry.cta;
    const to = resumeTo && game.path === '/club-manager' ? game.path + CLUB_MANAGER_ACTIVE_RESUME_QUERY : resumeTo ?? game.path;
    return { ...card, cta, to };
  });
  const current = picks[featured];
  function browse(step: number) {
    setPreviewed(true);
    setFeatured(index => (index + step + picks.length) % picks.length);
  }

  return (
    <section aria-labelledby="home-stage-title" data-home-stage="" className={styles.deck}>
      <h2 id="home-stage-title" className="sr-only">Main event</h2>
      <div className={styles.games}>
        <div className={styles.spotlight}>
          <Link to={current.to} data-google-vignette="false" data-stage-card={current.game.path}
            className={cn(styles.game, styles.lead)}>
            {picks.map((card, index) => (
              <div key={card.game.path} aria-hidden={index !== featured} style={sportStyle(sportOf(card.game.path))}
                className={cn(styles.panel, index === featured && styles.current, index === featured && previewed && styles.reveal)}>
                <StageContent card={card} lead />
              </div>
            ))}
          </Link>
          {picks.length > 1 && <div role="group" aria-label="Browse featured games" className={styles.spotlightControls}
            onKeyDown={event => {
              if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
              event.preventDefault();
              browse(event.key === 'ArrowRight' ? 1 : -1);
            }}>
            <button type="button" aria-label="Previous featured game" onClick={() => browse(-1)}><ChevronLeft aria-hidden="true" /></button>
            <span aria-hidden="true">{featured + 1}/{picks.length}</span>
            <button type="button" aria-label="Next featured game" onClick={() => browse(1)}><ChevronRight aria-hidden="true" /></button>
          </div>}
          <span className="sr-only" role="status">{previewed ? current.game.label : ''}</span>
        </div>
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
        {picks.filter(card => card !== current).map(card => (
          <Link key={card.game.path} to={card.to} data-google-vignette="false" data-stage-card={card.game.path}
            style={sportStyle(sportOf(card.game.path))} className={styles.game}>
            <StageContent card={card} />
          </Link>
        ))}
      </div>
      <details className={styles.careerMenu}>
        <summary>More career games<ChevronDown aria-hidden="true" /></summary>
        <div className={styles.careerChoices}>
          {moreCareerPaths.map(path => {
            const game = ALL_GAMES.find(candidate => candidate.path === path);
            if (!game) return null;
            const sport = sportOf(path);
            return (
              <Link key={path} to={path} data-google-vignette="false" style={sportStyle(sport)} className={styles.managerLaunch}>
                <SportGlyph sport={sport} className={styles.managerGlyph} />
                <span>{game.label}</span><ArrowRight aria-hidden="true" className={styles.launchArrow} />
              </Link>
            );
          })}
        </div>
      </details>
    </section>
  );
}

function StageContent({ card, lead = false }: { card: Card & { cta: string }; lead?: boolean }) {
  const { entry, game, cta } = card;
  const sport = sportOf(game.path);

  return (
    <>
      <span aria-hidden="true" className={styles.art}>
        {lead && entry.art === 'pitch' ? <picture>
          <source media="(min-width: 640px)" srcSet="/home-art/pitch-wide.webp" />
          <img src="/home-art/pitch-small.webp" width={672} height={224} alt="" />
        </picture> : <Suspense fallback={null}><HomeArt art={entry.art} /></Suspense>}
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
    </>
  );
}
