import type { CSSProperties, ReactNode } from 'react';
import styles from './ArcadeShotFeedback.module.css';

const SPARKS = [[-32, -16], [-14, -30], [22, -26], [34, 8], [12, 30], [-26, 24]];

type Props = {
  sport: 'goal' | 'basket';
  success: boolean;
  verdict: string;
  points: number;
  /** Round 1047: shown in place of the points line on a success (a Season
   *  Centre moment shows its stars). Absent: the points line, as ever. */
  score?: ReactNode;
  detail?: ReactNode;
  children: ReactNode;
};

export default function ArcadeShotFeedback({ sport, success, verdict, points, score, detail, children }: Props) {
  return (
    <div data-arcade-feedback data-outcome={success ? 'success' : 'miss'} className={`rounded-2xl border border-border bg-card p-4 text-center ${styles.card} ${success ? styles.success : styles.miss}`}>
      {success && <span aria-hidden="true" className={styles.sweep} />}
      <div role="status" className={styles.content}>
        <div className={styles.heading}>
          <span aria-hidden="true" className={styles.icon}>
            {success && <>
              <span className={styles.ring} />
              {SPARKS.map(([x, y]) => (
                <span key={`${x},${y}`} className={styles.spark} style={{ '--spark-x': `${x}px`, '--spark-y': `${y}px` } as CSSProperties} />
              ))}
            </>}
            <svg viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {sport === 'goal' ? <>
                <path d="M3 22V7h22v15M3 12h22M3 17h22M9 7v15M15 7v15M21 7v15" />
                <circle cx="19" cy="20" r="4" fill="hsl(var(--card))" />
                <path d="m18 18 2 1-.5 2h-2l-.5-2Z" />
              </> : <>
                <path d="M5 8h18M7 8l3 15h8l3-15M9 12l10 7M19 12l-10 7M10 23l9-11M18 23 9 12" />
                <circle cx="14" cy="4.5" r="3" fill="hsl(var(--card))" />
                <path d="M11 4.5h6M14 1.5v6" />
              </>}
            </svg>
          </span>
          <p className={`font-display font-black ${styles.verdict}`}>{verdict}</p>
        </div>
        {detail}
        {success && <p className={`font-display font-black ${styles.score}`}>{score ?? <>{points} points.</>}</p>}
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
