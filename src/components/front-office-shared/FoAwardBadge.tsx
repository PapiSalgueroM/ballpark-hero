/**
 * Round 1542: a man's sim awards on his roster row, shared. The shape the NBA
 * board has drawn since Round 824 (NbaFrontOfficeBoard.tsx, the badge under a
 * roster row), lifted so the NFL board draws it from here. Round 1566: the
 * NBA's board draws it from here too, in place of its own 10 px copy; the MLB
 * and NHL boards can switch to it. The last two awards, newest first, each with
 * "Sim" in front, and "+N more"; the title says they are this save's sim
 * awards. The names on a roster are real, so every award says it is a sim one.
 * Nothing at all for a man with none.
 *
 * Round 1562: 12 px (text-xs), and it wraps instead of cutting an award off
 * on a phone, as the season card's names do.
 */
export function FoAwardBadge({ awards, league }: { awards: readonly string[]; league: string }) {
  if (awards.length === 0) return null;
  return (
    <span data-award-badge className="block break-words text-xs text-gold" title={`This save's sim awards, not real ${league} ones: ${awards.join(', ')}`}>
      🏅 {awards.slice(-2).reverse().map(a => `Sim ${a}`).join(', ')}{awards.length > 2 ? ` +${awards.length - 2} more` : ''}
    </span>
  );
}

export default FoAwardBadge;
