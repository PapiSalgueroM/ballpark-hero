/* ─── Round 521: rivalry events, one engine for every career ────────────────

   The 2026-08-05 rivalry expansion gave Soccer Career eighteen narrative
   beats gated on where you and your rival actually stand: he wins a Ballon
   d'Or, he signs for your club, you finally pass him in overall, he retires
   and calls you the best rival of his career. One fires roughly every other
   season and the player only ever sees a dismissible card, no choice to
   make: the choice already happened, this is the game telling you what it
   meant.

   careerRival.ts already gives every American career a rival, simulated on
   the same machinery the player is (draftRival, judgeRivalSeason). What it
   does not have is this layer: the flavor beats that turn "he had the
   better year" into a rivalry with a shape. That is what his 2026-08-28
   backlog still marks open for the NFL career alongside the inbox, and this
   file is that layer, lifted the same way careerMoney.ts and careerInbox.ts
   already were.

   THE SHAPE. A RivalryEventDef is a gate plus a mutation, both written
   against the two concrete types a sport hands in (its own save shape and
   its own rival shape), so nothing here needs to know what a soccer club or
   an NFL roster spot even is:

     when         can this beat happen right now, read off the player and
                  the rival exactly the way it always was.
     description  the flavor line, built from the same two facts.
     apply        the mutation. What legitimately differs per sport: soccer
                  nudges a specific stat's growth next season, the NFL has no
                  such bucket and nudges morale or the fanbase instead. Both
                  get a `pushLine` for the rare event (a 50/50 call) that
                  narrates its own outcome before the standard line prints.

   What does NOT differ, and is the actual thing being shared: the roll (a
   coin flip once the rival is drafted and playing, never repeating the same
   beat twice running), the forced beat on retirement, and the single
   pending-event slot a dismiss clears. soccerCareerEngine.ts binds
   SOCCER_RIVALRY_EVENTS and keeps every export name unchanged; its trigger
   still fires from the same two lines it always did, just calling through
   here. nflCareerRivalryEvents.ts binds the NFL's own eighteen-adjacent
   table, written for what an NFL rival's save actually tracks: rings, a
   depth chart spot, a head to head record, never a nationality or a club
   crest, neither of which an NFL career has.

   LEGAL SHAPE. Every description below narrates the rival ("says he
   respects you", "tells reporters", "calls the rivalry the best thing that
   happened to his career") rather than quoting him, the same rule every
   other generated voice on this site follows, and the rival's name is
   proven never to collide with a real player: scripts/simInventedNames.mjs
   section 2c already enumerates every name careerRival.ts's FIRST and LAST
   banks can produce and checks it against the site's whole real-name
   harvest, and scripts/simCareerRivalryEvents.mjs section on invented names
   re-proves it as its own explicit check. */

export interface RivalryEvent {
  id: number;
  emoji: string;
  title: string;
  description: string;
  consequence: string;
}

/**
 * One beat in a sport's table. P is the save shape, R the rival shape.
 * `apply` mutates the save in place; `pushLine` is for the rare beat whose
 * outcome depends on a coin flip and wants to say what happened before the
 * standard "emoji title" line prints.
 */
export interface RivalryEventDef<P, R> {
  id: number;
  emoji: string;
  title: string;
  description: (p: P, r: R) => string;
  consequence: string;
  when: (p: P, r: R) => boolean;
  apply: (s: P, r: R, rng: () => number, pushLine: (line: string) => void) => void;
}

/** Every beat in the table whose gate is true right now, built into the
 *  plain events a pending-event card actually renders. */
export function rivalryEventPool<P, R>(p: P, r: R, defs: RivalryEventDef<P, R>[]): RivalryEvent[] {
  return defs
    .filter(d => d.when(p, r))
    .map(d => ({ id: d.id, emoji: d.emoji, title: d.title, description: d.description(p, r), consequence: d.consequence }));
}

/**
 * The season roll: a coin flip once the rival exists and is still playing,
 * excluding whichever beat fired last so the same line never repeats back
 * to back. Calls `rng` once for the coin flip and, only if that passes and
 * the gated pool is non-empty, once more to pick from it, so a caller
 * relying on a seeded stream's call count sees exactly what the un-lifted
 * code always drew.
 */
export function rollRivalryEvent<P, R extends { retired: boolean }>(
  p: P, r: R | null | undefined, lastId: number | null, defs: RivalryEventDef<P, R>[], rng: () => number = Math.random,
): RivalryEvent | null {
  if (!r || r.retired) return null;
  if (rng() >= 0.5) return null;
  const pool = rivalryEventPool(p, r, defs).filter(e => e.id !== lastId);
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)];
}

/** The forced beat: the rival just retired and the retirement beat has not
 *  already been shown. Draws no rng, exactly like the un-lifted code. */
export function forcedRetirementEvent<P, R extends { retired: boolean }>(
  p: P, r: R | null | undefined, lastId: number | null, defs: RivalryEventDef<P, R>[], retirementEventId: number,
): RivalryEvent | null {
  if (!r?.retired || lastId === retirementEventId) return null;
  return rivalryEventPool(p, r, defs).find(e => e.id === retirementEventId) ?? null;
}

/**
 * Apply a pending event's mutation, then push the standard "emoji title"
 * line. Mutates `s` in place, matching every other apply-and-log function in
 * this codebase (moneyAct, applyInboxMessage's sibling in careerInbox.ts).
 */
export function applyRivalryEvent<P, R>(
  s: P, r: R, event: RivalryEvent, defs: RivalryEventDef<P, R>[], rng: () => number, pushLine: (line: string) => void,
): void {
  const def = defs.find(d => d.id === event.id);
  if (def) def.apply(s, r, rng, pushLine);
  pushLine(`${event.emoji} ${event.title}`);
}
