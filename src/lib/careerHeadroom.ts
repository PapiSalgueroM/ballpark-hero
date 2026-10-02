/* ─── Round 833: a bought rating raise stops at potential ──────────────────

   CLAUDE.md names "growth that ignores potential headroom" (Rounds 96 and 116)
   as a regression that must never come back. It had, through the shop: the
   rating items in all four American careers (Vision Training in the NFL, the
   Biomechanics Team in the NBA, MLB and NHL, the Home Shooting Room in the
   NHL) raised the rating with Math.min(99, ovr + n), so a player sitting on
   his ceiling bought his way over it. Measured on the shipped code over 300
   seeded careers a sport, buying the item the first season the rating came
   within one of potential: every NBA buy (5 of 5) and the one NHL career that
   got there left the rating above potential, and it stayed there for 20 and 5
   later seasons, because the growth step only ever moves a rating that is
   under its ceiling. The NFL and MLB careers in that sample never reached
   their ceilings, but they ran the same line.

   One raise for all of them now. It never takes a rating past potential, never
   past 99, and never lowers a rating that already sits above potential (an old
   save, or an offseason card that allows potential plus one). */

/** The rating after a raise of `by`, held at potential. */
export function raiseWithinPotential(ovr: number, pot: number, by: number): number {
  const cap = Math.min(99, pot);
  if (ovr >= cap) return ovr;
  return Math.min(cap, ovr + by);
}

/** What the raise actually did, in the words the shop log ends on. */
export function ratingRaiseNote(before: number, after: number, by: number): string {
  const gain = after - before;
  if (gain >= by) return `Rating +${gain}.`;
  if (gain > 0) return `Rating +${gain}, and that is your ceiling.`;
  return `You were already at your ceiling, so the rating stays at ${after}.`;
}
