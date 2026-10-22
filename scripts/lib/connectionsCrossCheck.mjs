/**
 * Round 1553: the Connections criterion cross check, one engine for every
 * sport's boards.
 *
 * Round 219 wrote this check for NBA Connections inside simLiveBoards
 * section 2: for every group whose theme a table can see, each listed member
 * must satisfy it, and no man from another group on the same board may
 * satisfy it too, because then the board has two right answers and the game
 * accepts only one (a guess is right only when the four tiles equal one
 * stored group). That is the rule for every sport, so it lives here and each
 * sport brings only its own checker:
 *
 *   criterion(label) -> a criterion object, or null when this sport's data
 *                       cannot judge the label (counted, never skipped
 *                       silently)
 *   fits(name, criterion) -> true, false, or null when the data does not
 *                       reach the man
 *
 * Soccer binds it in scripts/simConnectionsFacts.mjs. Baseball, NFL and NHL
 * bind it next (the long tail ranking's rank 6), and simLiveBoards section 2
 * can then call it with NBA's checker instead of its own loop.
 *
 * Nothing here reads a file, the network or the clock.
 */

/** Every finding the two rules produce over a list of boards. */
export function crossCheckBoards(boards, sport) {
  const labelOf = sport.labelOf ?? (g => g.category ?? g.theme);
  const out = {
    boards: 0,
    groups: 0,
    checked: 0,
    unchecked: [],
    memberChecks: 0,
    memberUnknown: 0,
    otherChecks: 0,
    otherUnknown: 0,
    findings: [],
  };
  for (const board of boards) {
    out.boards += 1;
    const groups = board.groups ?? [];
    for (const g of groups) {
      out.groups += 1;
      const label = labelOf(g);
      const crit = sport.criterion(label);
      if (!crit) {
        out.unchecked.push({ id: board.id, label });
        continue;
      }
      out.checked += 1;
      for (const name of g.players) {
        const v = sport.fits(name, crit);
        if (v === null || v === undefined) { out.memberUnknown += 1; continue; }
        out.memberChecks += 1;
        if (v === false) out.findings.push({ id: board.id, kind: 'not-a-member', label, name, listedUnder: label });
      }
      for (const other of groups) {
        if (other === g) continue;
        for (const name of other.players) {
          const v = sport.fits(name, crit);
          if (v === null || v === undefined) { out.otherUnknown += 1; continue; }
          out.otherChecks += 1;
          if (v === true) out.findings.push({ id: board.id, kind: 'second-fit', label, name, listedUnder: labelOf(other) });
        }
      }
    }
  }
  return out;
}

/** One stable line per finding, for baselines and reports. */
export function findingKey(f) {
  return `${f.id} | ${f.kind} | ${f.name} | ${f.label}${f.kind === 'second-fit' ? ` | listed under ${f.listedUnder}` : ''}`;
}
