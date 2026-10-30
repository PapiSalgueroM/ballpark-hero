/**
 * Round 1567: a dated club group keeps its date on one line.
 *
 * The club groups in Baseball, NFL and NHL Connections end in "(as of 2026)",
 * "(as of 2025)" or "(as of 2025-26)". At 390 wide the NHL label broke inside
 * the season, "(as of 2025-" on one line and "26)" on the next
 * (review-run-1567 finding 2). The data keeps its plain hyphen, because the
 * checker parses the season from it; only the rendering holds the
 * parenthetical together. The text a reader or a test sees is unchanged.
 */
import { Fragment } from 'react';

const DATED = /^(.*\S) (\(as of [^)]+\))$/;

export function ConnectionsGroupLabel({ theme }: { theme: string }) {
  const m = theme.match(DATED);
  if (!m) return <>{theme}</>;
  return (
    <>
      {m[1]}{' '}<span className="whitespace-nowrap">{m[2]}</span>
    </>
  );
}

/**
 * Round 1583 (review-run-1583 finding 1): the receipt after a solve carries the
 * group's label mid sentence ("Locked: Played for the Boston Celtics (as of
 * 2025-26). Those five are solved."), and at 390 wide it broke between "(as"
 * and "of 2025-26)". Same rule as the label: the date stays whole on one line,
 * the text is unchanged.
 */
const DATED_INSIDE = /(\(as of [^)]+\))/;

export function ConnectionsReceiptText({ text }: { text: string }) {
  const parts = text.split(DATED_INSIDE);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1 ? <span key={i} className="whitespace-nowrap">{part}</span> : <Fragment key={i}>{part}</Fragment>))}
    </>
  );
}
