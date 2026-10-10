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
  /** Round 1112: a beat whose outcome is a fact of the season (who made the roster) says exactly what it
   *  does, so its consequence may be read off the same two facts its description is. */
  consequence: string | ((p: P, r: R) => string);
  when: (p: P, r: R) => boolean;
  /** Round 1149: `event` is the card the player is looking at, when the caller holds one (applyRivalryEvent
   *  always does). A fact beat reads it, so the tap does what that card printed and nothing else. */
  apply: (s: P, r: R, rng: () => number, pushLine: (line: string) => void, event?: RivalryEvent) => void;
}

/* ─── Round 1149: a beat that reports a fact of the season ─────────────────────

   Until Round 1112 the All-Star beat flipped a coin for who made the roster,
   in games whose engines pick that roster for real, so the card could say you
   made it in a year your own season card said you did not. Round 1112 fixed
   the NBA's by hand. This is that fix as one builder, for every sport and for
   any beat whose outcome is already on the save.

   A fact beat is a short list of cards. Each card says when the season's
   facts support it, what it reads, what it promises and what the tap moves.
   The beat is dealt when one card is supported, the pending card carries that
   card's words, and the tap finds the card again BY THE PROMISE PRINTED ON IT
   and only then moves anything. Three things follow, and they are the rule:

     no coin        nothing is drawn, at the deal or at the tap.
     no drift       the tap does what the card in front of the player says,
                    because it is found by those words (meterOption in
                    careerRivalryChoices.ts holds a choice to the same rule).
     old cards      a save sitting on a card dealt before a beat moved here
                    (its promise reads "50/50 outcome") matches no card, so
                    Continue moves nothing and only logs the card's title.

   So every card of one beat must promise something different: the promise is
   the key. scripts/simCareerRivalryEvents.mjs holds each sport's cards to
   that, and to their words. */

/** One card a fact beat can deal. */
export interface FactCard<P, R> {
  /** Do the facts on the save and the rival support this card? Nothing is drawn. */
  when: (p: P, r: R) => boolean;
  description: (p: P, r: R) => string;
  /** What the card promises, and how the tap finds the card it was shown: unique within its beat. */
  consequence: string;
  /** What the tap moves: exactly what `consequence` says. */
  move: (s: P, r: R) => void;
  /** The line the tap pushes into the feed before the standard title line. */
  line: (p: P, r: R) => string;
}

/** Build a beat from its cards. The first supported card is the one dealt. */
export function factBeat<P, R>(spec: { id: number; emoji: string; title: string; cards: FactCard<P, R>[] }): RivalryEventDef<P, R> {
  const dealt = (p: P, r: R) => spec.cards.find(k => k.when(p, r));
  return {
    id: spec.id, emoji: spec.emoji, title: spec.title,
    when: (p, r) => !!dealt(p, r),
    description: (p, r) => dealt(p, r)?.description(p, r) ?? '',
    consequence: (p, r) => dealt(p, r)?.consequence ?? '',
    apply: (s, r, _rng, pushLine, event) => {
      const card = spec.cards.find(k => (!event || k.consequence === event.consequence) && k.when(s, r));
      if (!card) return;
      card.move(s, r);
      pushLine(card.line(s, r));
    },
  };
}

/**
 * Round 1149: the save as it stands once the season just played is on it. Every engine rolls its rivalry beat
 * before it pushes the season onto the save, and a fact beat reads that season, so the tick hands the roll this
 * view. Nothing is drawn for it and nothing is written (Round 1112 wrote this line inside the NBA's tick).
 */
export function withSeasonPlayed<P extends { seasons: L[] }, L>(c: P, season?: L): P {
  return season ? { ...c, seasons: [...c.seasons, season] } : c;
}

/** Round 1149: whether the last season on a save holds an award, in the engine's own word for it. Null when the
 *  save holds no season, so a beat that reads this is never dealt on nothing. */
export function lastSeasonHolds(p: { seasons: { awards?: string[] }[] }, award: string): boolean | null {
  const last = p.seasons[p.seasons.length - 1];
  return last ? (last.awards ?? []).includes(award) : null;
}

/** Every beat in the table whose gate is true right now, built into the
 *  plain events a pending-event card actually renders. */
export function rivalryEventPool<P, R>(p: P, r: R, defs: RivalryEventDef<P, R>[]): RivalryEvent[] {
  return defs
    .filter(d => d.when(p, r))
    .map(d => ({ id: d.id, emoji: d.emoji, title: d.title, description: d.description(p, r), consequence: typeof d.consequence === 'function' ? d.consequence(p, r) : d.consequence }));
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
  if (def) def.apply(s, r, rng, pushLine, event);
  pushLine(`${event.emoji} ${event.title}`);
}
