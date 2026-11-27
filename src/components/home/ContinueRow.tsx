import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { CONTINUE_SAVES, continueSaveEntries, describeSave, savedGames, type SavedGame } from '@/data/continueSaves';
import { ALL_GAMES } from '@/data/gameRegistry';
import { sportOf } from '@/data/homeFront';
import { BUILD_XI_DRAFT_KEY, readBuildXiDraft } from '@/lib/buildXiDraft';
import { readWhoAmIRound, readWhoAmIRoundBytes, WHO_AM_I_ROUND_KEY } from '@/lib/whoAmIRoundSave';
import { FIGHT_PROMOTER_MODE_KEY } from '@/lib/fightPromoterRoutes';
import { parkedKey, SLOT_COUNT, SLOTS_INDEX_KEY } from '@/lib/clubManagerSaveKeys';
import { drives, playoffSaveKey, practiceSaveKey } from '@/lib/twoMinuteDrive';
import { homeSaveStorage, useHomeSaveRefresh } from './homeSaveRefresh';
import { SportGlyph, sportStyle } from './SportGlyph';
import styles from './HomeLaunchDeck.module.css';

/** What a card says before its save has been opened, and whenever the save
    has nothing on it that reads cleanly. */
export const SAVED_FALLBACK = 'Saved in this browser';

const xiEntry = { path: '/build-your-xi', saveKey: BUILD_XI_DRAFT_KEY };
const xiGame = ALL_GAMES.find(game => game.path === xiEntry.path);
const whoEntry = { path: '/who-am-i', saveKey: WHO_AM_I_ROUND_KEY };
const whoGame = ALL_GAMES.find(game => game.path === whoEntry.path);
const continueKeys = new Set([
  playoffSaveKey,
  ...drives.map(practiceSaveKey),
  ...CONTINUE_SAVES.flatMap(entry => continueSaveEntries(entry).map(save => save.saveKey)),
  BUILD_XI_DRAFT_KEY,
  WHO_AM_I_ROUND_KEY,
  FIGHT_PROMOTER_MODE_KEY,
  SLOTS_INDEX_KEY,
  ...Array.from({ length: SLOT_COUNT }, (_, index) => parkedKey(index + 1)),
]);

function homeSavedGames(storage: Storage | null): SavedGame[] {
  const saved = savedGames(storage, true);
  if (!storage) return saved;
  let raw: string | null = null;
  try { raw = storage.getItem(BUILD_XI_DRAFT_KEY); } catch { /* The browser could not read this draft. */ }
  const draft = readBuildXiDraft(raw);
  if (xiGame && draft?.slots.length) {
    saved.push({
      entry: xiEntry, game: xiGame,
      description: `${draft.formation} · ${draft.slots.length}/11 picked`,
    });
  }
  const round = readWhoAmIRound(readWhoAmIRoundBytes(storage));
  if (whoGame && round?.phase === 'playing' && round.guesses.length) {
    saved.push({
      entry: whoEntry, game: whoGame,
      description: `${round.guesses.length}/${round.budget} guesses used`,
    });
  }
  return saved;
}

/**
 * Round 717: Continue playing, under the Main Event band.
 *
 * One card for each save destination, including separately saved careers.
 * A visitor with no saves gets no shelf.
 *
 * The first render reads which saves exist and checks Club Manager slots. A change to
 * one of those keys or a return to the page refreshes the links and labels.
 * The card holds its height as details load.
 */
export function ContinueRow() {
  const [{ saved, lines }, setResume] = useState<{ saved: SavedGame[]; lines: Record<string, string> }>(
    () => ({ saved: homeSavedGames(homeSaveStorage()), lines: {} }),
  );
  const refresh = useCallback((storage: Storage | null) => {
    const current = homeSavedGames(storage);
    const descriptions: Record<string, string> = {};
    for (const { entry, description } of current) {
      if (description !== undefined) {
        if (description) descriptions[entry.path] = description;
        continue;
      }
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
  const rail = useRef<HTMLDivElement>(null);
  const [ends, setEnds] = useState({ previous: false, next: false });
  const measure = useCallback(() => {
    const el = rail.current;
    const previous = !!el && el.scrollLeft > 1;
    const next = !!el && el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setEnds(old => old.previous === previous && old.next === next ? old : { previous, next });
  }, []);
  useLayoutEffect(() => {
    measure();
    const el = rail.current;
    if (!el) return;
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [saved.length, measure]);
  function pageSaved(forward: boolean) {
    const el = rail.current;
    if (!el) return;
    el.scrollBy({
      left: (forward ? 1 : -1) * el.clientWidth,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }

  if (saved.length === 0) return null;

  return (
    <section aria-labelledby="home-continue" data-home-continue="" className={saved.length > 1 ? `${styles.continueSection} ${styles.multipleSaves}` : styles.continueSection}>
      <div className={styles.continueHeader}><h2 id="home-continue" className={`font-display ${styles.continueHeading}`}>
        <History aria-hidden="true" />
        Continue playing
      </h2>
        {(ends.previous || ends.next) && <div className={styles.continueControls}>
          <button type="button" aria-label="Previous saved games" aria-disabled={!ends.previous} onClick={() => { if (ends.previous) pageSaved(false); }}><ChevronLeft aria-hidden="true" /></button>
          <button type="button" aria-label="Next saved games" aria-disabled={!ends.next} onClick={() => { if (ends.next) pageSaved(true); }}><ChevronRight aria-hidden="true" /></button>
        </div>}
      </div>
      <div ref={rail} onScroll={measure} data-home-shelf-rail="" className={styles.continueRail}>
        <ul className={styles.continueList}>
          {saved.map(({ entry, game, slot, description: savedDescription, resumeState }) => {
            const sport = sportOf(game.path);
            const line = savedDescription ?? lines[entry.path];
            const description = slot === undefined ? line ?? SAVED_FALLBACK : [`Slot ${slot}`, line].filter(Boolean).join(' · ');
            return (
              <li key={entry.path}>
                <Link
                  to={entry.path}
                  state={resumeState}
                  data-google-vignette="false"
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
