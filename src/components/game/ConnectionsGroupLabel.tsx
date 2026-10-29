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
