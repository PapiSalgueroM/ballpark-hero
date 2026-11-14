import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, History } from 'lucide-react';
import { CONTINUE_SAVES, continueSaveEntries, describeSave, savedGames, type SavedGame } from '@/data/continueSaves';
import { sportOf } from '@/data/homeFront';
import { FIGHT_PROMOTER_MODE_KEY } from '@/lib/fightPromoterRoutes';
import { homeSaveStorage, useHomeSaveRefresh } from './homeSaveRefresh';
import { SportGlyph, sportStyle } from './SportGlyph';
import styles from './HomeLaunchDeck.module.css';

/** What a card says before its save has been opened, and whenever the save
    has nothing on it that reads cleanly. */
export const SAVED_FALLBACK = 'Saved in this browser';

const continueKeys = new Set([
  ...CONTINUE_SAVES.flatMap(entry => continueSaveEntries(entry).map(save => save.saveKey)),
  FIGHT_PROMOTER_MODE_KEY,
]);

/**
 * Round 717: Continue playing, under the Main Event band.
 *
 * One card for each save destination, including separately saved careers.
 * A visitor with no saves gets no shelf.
 *
 * The first render reads only which saves exist. After mount, a change to
 * one of those keys or a return to the page refreshes the links and labels.
 * The card holds its height as details load.
 */
export function ContinueRow() {
  const [{ saved, lines }, setResume] = useState<{ saved: SavedGame[]; lines: Record<string, string> }>(
    () => ({ saved: savedGames(homeSaveStorage(), true), lines: {} }),
  );
  const refresh = useCallback((storage: Storage | null) => {
    const current = savedGames(storage, true);
    const descriptions: Record<string, string> = {};
    for (const { entry } of current) {
      let raw: string | null = null;
      try { raw = storage?.getItem(entry.saveKey) ?? null; } catch { /* show the browser fallback */ }
      const line = describeSave(entry, raw);
      if (line) descriptions[entry.path] = line;
    }
    setResume(previous => previous.saved.length === current.length && current.every(({ entry }, i) =>
      previous.saved[i].entry.path === entry.path && previous.lines[entry.path] === descriptions[entry.path])
      ? previous : { saved: current, lines: descriptions });
  }, []);
  useHomeSaveRefresh(continueKeys, refresh);

  if (saved.length === 0) return null;

  return (
    <section aria-labelledby="home-continue" data-home-continue="" className={styles.continueSection}>
      <h2 id="home-continue" className={`font-display ${styles.continueHeading}`}>
        <History aria-hidden="true" />
        Continue playing
      </h2>
      <div className={styles.continueRail}>
        <ul className={styles.continueList}>
          {saved.map(({ entry, game, slot }) => {
            const sport = sportOf(game.path);
            const line = lines[entry.path];
            const description = slot === undefined ? line ?? SAVED_FALLBACK : [`Slot ${slot}`, line].filter(Boolean).join(' · ');
            return (
              <li key={entry.path}>
                <Link
                  to={entry.path}
                  style={sportStyle(sport)}
                  data-continue-card={game.path}
                  className={styles.continueCard}
                >
                  <span aria-hidden="true" className={styles.continueIcon}>
                    {game.emoji}
                    <SportGlyph sport={sport} className={styles.continueSport} />
                  </span>
                  <span className={styles.continueText}>
                    <span className={styles.continueName}>
                      {game.label}
                    </span>
                    <span data-continue-line="" className={styles.continueLine}>
                      {description}
                    </span>
                  </span>
                  <ArrowRight aria-hidden="true" className={styles.continueArrow} />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
