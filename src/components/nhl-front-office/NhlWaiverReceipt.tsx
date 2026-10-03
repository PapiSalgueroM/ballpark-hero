import { useRef, useState } from 'react';
import styles from './NhlWaiverReceipt.module.css';

export type NhlWaiverReceiptEvent = {
  id: number;
  playerName: string;
  rosterBefore: number;
  rosterAfter: number;
  capBefore: number;
  capAfter: number;
  deadMoneyAfter: number;
};

const money = (value: number) => `${value < 0 ? '-' : ''}$${Math.abs(value)}M`;

export function NhlWaiverReceipt({ event }: { event: NhlWaiverReceiptEvent | null }) {
  const [dismissedId, setDismissedId] = useState<number | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className={styles.status} style={{ margin: 0 }} data-nhl-waiver-status>
      {event && event.id !== dismissedId && <div key={event.id} className={styles.receipt} data-nhl-waiver-receipt>
        <div className={styles.heading}>
          <div>
            <p className={styles.label}>Last waiver</p>
            <p className={styles.player}>Waived {event.playerName}.</p>
          </div>
          <button type="button" aria-label="Dismiss waiver receipt" className={styles.dismiss}
            onFocus={e => { if (e.relatedTarget instanceof HTMLElement) returnFocus.current = e.relatedTarget; }}
            onPointerDown={e => { if (document.activeElement instanceof HTMLElement && document.activeElement !== e.currentTarget) returnFocus.current = document.activeElement; }}
            onClick={() => {
              setDismissedId(event.id);
              const target = returnFocus.current;
              if (target?.isConnected && !(target instanceof HTMLButtonElement && target.disabled)) target.focus({ preventScroll: true });
            }}>
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <dl className={styles.stats}>
          <div>
            <dt>Roster</dt>
            <dd>{event.rosterBefore} → <strong className={styles.value}>{event.rosterAfter}</strong> players</dd>
          </div>
          <div>
            <dt>Cap space</dt>
            <dd>{money(event.capBefore)} → <strong className={styles.value}>{money(event.capAfter)}</strong></dd>
          </div>
          <div>
            <dt>Dead money this season</dt>
            <dd><strong className={styles.value}>{money(event.deadMoneyAfter)}</strong></dd>
          </div>
        </dl>
      </div>}
    </div>
  );
}
