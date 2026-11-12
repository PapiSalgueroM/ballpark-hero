import styles from './GameAdInventory.module.css';

/** Empty inventory after the game and its guide. No ad loader is attached here. */
export function GameAdInventory() {
  return (
    <div className={styles.inventory} data-game-ad-inventory="" data-no-prerender="" aria-hidden="true">
      <div className={styles.slots}>
        <div className={styles.leaderboard} data-ad-reservation="728x90" />
        <div className={styles.rectangle} data-ad-reservation="300x250" />
        <div className={styles.tower} data-ad-reservation="300x600" />
        <div className={styles.mobileBanner} data-ad-reservation="320x50" />
      </div>
    </div>
  );
}
