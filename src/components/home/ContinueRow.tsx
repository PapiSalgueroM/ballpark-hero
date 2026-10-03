import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, History } from 'lucide-react';
import { describeSave, savedGames, type SavedGame } from '@/data/continueSaves';
import { sportOf } from '@/data/homeFront';
import { SportGlyph, sportStyle } from './SportGlyph';
import styles from './HomeLaunchDeck.module.css';

/** What a card says before its save has been opened, and whenever the save
    has nothing on it that reads cleanly. */
export const SAVED_FALLBACK = 'Saved in this browser';

function browserStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Round 717: Continue playing, under the Main Event band.
 *
 * One card for every long form game this browser holds a save for, linking
 * straight back into it. A visitor with no saves gets nothing at all, not an
 * empty box, so the first screen of a new visitor is exactly what it was.
 *
 * Which cards show is decided on the first render from whether each key
 * exists, so the row's size never changes after it appears. What each card
 * says (a club and a season, a fighter and his fight count) comes from the
 * save itself, opened after the page has drawn, and lands inside a line that
 * already holds its height. src/data/continueSaves.ts holds the list and the
 * reading rules; scripts/simHomeFront.mjs section 7 checks both.
 */
export function ContinueRow() {
  const [saved] = useState<SavedGame[]>(() => savedGames(browserStorage()));
  const [lines, setLines] = useState<Record<string, string>>({});

  useEffect(() => {
    if (saved.length === 0) return;
    const storage = browserStorage();
    const next: Record<string, string> = {};
    for (const { entry } of saved) {
      let raw: string | null = null;
      try { raw = storage ? storage.getItem(entry.saveKey) : null; } catch { raw = null; }
      const line = describeSave(entry, raw);
      if (line) next[entry.path] = line;
    }
    setLines(next);
  }, [saved]);

  if (saved.length === 0) return null;

  return (
    <section aria-labelledby="home-continue" data-home-continue="" className={styles.continueSection}>
      <h2 id="home-continue" className={`font-display ${styles.continueHeading}`}>
        <History aria-hidden="true" />
        Continue playing
      </h2>
      <div className={styles.continueRail}>
        <ul className={styles.continueList}>
          {saved.map(({ entry, game }) => {
            const sport = sportOf(game.path);
            return (
              <li key={game.path}>
                <Link
                  to={game.path}
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
                      {lines[entry.path] ?? SAVED_FALLBACK}
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
