import { useEffect, useRef, useState } from 'react';
import type { GuessResult } from '@/types/game';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import styles from '@/components/footle/FootleClueDesk.module.css';

const clues = [
  ['nationality', 'Nation', '01'], ['club', 'Club', '02'], ['goals', 'Goals', '03'],
  ['assists', 'Assists', '04'], ['position', 'Position', '05'], ['kitNumber', 'Kit number', '06'],
  ['age', 'Age', '07'], ['marketValue', 'Value', '08'],
] as const;
const verdict = { correct: 'Exact match', close: 'Close', incorrect: 'Not a match', unknown: 'Not on file' };

export default function FootleClueDesk({ guesses, playing, helpOpen, onReturn, reviewing = false }: {
  guesses: GuessResult[]; playing: boolean; helpOpen: boolean; onReturn: () => void; reviewing?: boolean;
}) {
  const [selection, setSelection] = useState<{ index: number; count: number } | null>(null);
  const selected = selection?.count === guesses.length ? selection.index : guesses.length - 1;
  const guess = guesses[selected];
  const heading = useRef<HTMLHeadingElement>(null);
  const previousCount = useRef(guesses.length);
  const initialReview = useRef(reviewing);
  const reveal = useRevealScroll<HTMLElement>(guesses.length, { enabled: (playing || reviewing) && (guesses.length > 0 || reviewing), skipFirst: false });
  useEffect(() => {
    if (!helpOpen && ((playing && guesses.length > previousCount.current) || initialReview.current)) heading.current?.focus({ preventScroll: true });
    initialReview.current = false;
    if (guesses.length < previousCount.current) setSelection(null);
    previousCount.current = guesses.length;
  }, [guesses.length, playing, reviewing, helpOpen]);

  if (!guess) return <section ref={helpOpen ? null : reveal} className={styles.empty} data-footle-clue-empty="">
    <div className={styles.heading}>
      <h2 ref={heading} tabIndex={-1} className={styles.eyebrow}>{reviewing ? 'Puzzle review' : 'Your clue desk'}</h2>
      {reviewing && <button className={styles.return} onClick={onReturn}>Back to run results</button>}
    </div>
    <p>{reviewing ? 'No guesses were made for this puzzle.' : 'Your first guess opens eight clues. Read them, then choose your next player.'}</p>
    {!reviewing && <div className={styles.attempts} aria-label="Eight guesses available">{Array.from({ length: 8 }, (_, i) => <span key={i} aria-hidden="true">{i + 1}</span>)}</div>}
  </section>;

  return <section ref={helpOpen ? null : reveal} className={styles.desk} data-footle-clue-desk="" data-clue-guess={selected + 1} aria-label={reviewing ? 'Saved puzzle clues' : 'Revealed clues'}>
    <div className={styles.heading}>
      <div className={styles.title}>
        <p className={styles.eyebrow}>{reviewing ? 'Puzzle review' : 'Your clue desk'} · Guess {selected + 1} of {guesses.length}</p>
        <h2 ref={heading} tabIndex={-1}>{guess.playerName}</h2>
      </div>
      {(playing || reviewing) && <button className={styles.return} onClick={onReturn}>{reviewing ? 'Back to run results' : <>Back to search <span aria-hidden="true">↑</span></>}</button>}
    </div>
    <div className={styles.history} role="group" aria-label="Guess history">
      {guesses.map((value, index) => <button key={value.playerName} aria-label={`View guess ${index + 1}: ${value.playerName}`} aria-pressed={index === selected}
        onClick={() => setSelection({ index, count: guesses.length })}>{index + 1}<span className="sr-only">{value.isCorrect ? ', solved' : ''}</span></button>)}
    </div>
    <dl key={guess.playerName} className={styles.cards} data-clue-cards="">
      {clues.map(([key, label, number]) => {
        const cell = guess.cells[key];
        const direction = cell.arrow === 'up' ? 'Answer is higher' : 'Answer is lower';
        return <div key={key} className={styles.clue} data-clue={key} data-status={cell.status}>
          <dt><span>{label}</span><span aria-hidden="true">{number}</span></dt>
          <dd className={styles.value}>{cell.value}</dd>
          <dd className={styles.verdict}>{verdict[cell.status]}</dd>
          {cell.arrow && cell.status !== 'unknown' && <dd className={styles.direction}><span aria-hidden="true">{cell.arrow === 'up' ? '↑' : '↓'} </span>{direction}</dd>}
        </div>;
      })}
    </dl>
    <p className={styles.note}>Clues from this guess only. Unknown values give no comparison.</p>
  </section>;
}
