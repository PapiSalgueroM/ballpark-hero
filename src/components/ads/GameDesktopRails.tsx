import type { ReactNode } from 'react';
import styles from './GameDesktopRails.module.css';

/** Keep the game itself and its controls out of both desktop Auto ad rails. */
export function GameDesktopRails({ active, children }: { active: boolean; children: ReactNode }) {
  if (!active) return children;
  return (
    <div className={styles.game} data-game-desktop-rails="" google-side-rail-overlap="false">
      {children}
    </div>
  );
}
