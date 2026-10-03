import { lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ALL_GAMES, type GameDef } from '@/data/gameRegistry';
import { CATEGORY_SPORT, HOME_STAGE, sportOf, type StageEntry } from '@/data/homeFront';
import { HUB_NAV } from '@/lib/sportHubNav';
import { SportGlyph, sportStyle } from './SportGlyph';
import styles from './HomeLaunchDeck.module.css';

/* Art stays lazy: every destination is readable and playable before its
   drawing arrives, and the reserved panel keeps the controls in place. */
const HomeArt = lazy(() => import('./art/HomeArt'));

/** Save existence changes the invitation, never opens or rewrites a save. */
function hasSave(key: string | undefined): boolean {
  if (!key) return false;
  try { return localStorage.getItem(key) !== null; }
  catch { return false; }
}

type Variant = 'lead' | 'wide' | 'small';
interface Card { entry: StageEntry; game: GameDef }

export function FeaturedStage() {
  const cards = useMemo<Card[]>(() => HOME_STAGE.flatMap(entry => {
    const game = ALL_GAMES.find(g => g.path === entry.path);
    return game ? [{ entry, game }] : [];
  }), []);
  if (cards.length === 0) return null;

  return (
    <section aria-labelledby="home-stage-title" data-home-stage="" className={styles.deck}>
      <h2 id="home-stage-title" className="sr-only">Main event</h2>
      <nav aria-label="Sport hubs" className={styles.sports}>
        {HUB_NAV.map(hub => {
          const sport = CATEGORY_SPORT[hub.titles[0]];
          return (
            <Link key={hub.route} to={hub.route} style={sportStyle(sport)} data-home-sport-hub={hub.route} className={styles.sportLink}>
              <SportGlyph sport={sport} className={styles.sportGlyph} />
              <span>{hub.navLabel}</span>
            </Link>
          );
        })}
      </nav>
      <div className={styles.games}>
        {cards.map((card, index) => <StageCard key={card.game.path} card={card} variant={index === 0 ? 'lead' : index === 1 ? 'wide' : 'small'} />)}
      </div>
    </section>
  );
}

function StageCard({ card, variant }: { card: Card; variant: Variant }) {
  const { entry, game } = card;
  const sport = sportOf(game.path);
  const [saved] = useState(() => hasSave(entry.saveKey));
  const resuming = saved && !!entry.continueCta;
  const cta = resuming ? entry.continueCta : entry.cta;
  const lead = variant === 'lead';

  return (
    <Link to={game.path} style={sportStyle(sport)} data-stage-card={game.path}
      className={cn(styles.game, styles[variant])}>
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
        {variant === 'wide' && <p className={styles.secondaryDescription}>{leadIn(game.description)}</p>}
        <span className={cn(styles.cta, lead && styles.primaryCta)}>
          <span>{cta}</span><ArrowRight aria-hidden="true" />
        </span>
        {lead && <span className={styles.saveNote}>Saves in this browser. No account needed.</span>}
      </div>
    </Link>
  );
}

/** A complete opening clause keeps the smaller management panel readable. */
function leadIn(description: string): string {
  const cut = description.search(/[:.!?](\s|$)/);
  return cut === -1 ? description : description.slice(0, cut);
}