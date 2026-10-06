/* ─── Round 1038: the US offseason becomes a summer ───

   Before this round every NFL, NBA, MLB and NHL offseason dealt one card,
   drawn on the season's own Math.random stream, and nothing remembered it: a
   card could come back the very next year, and a reload on a card you did not
   like threw it away (the season was already saved, so the card was simply
   lost). Soccer Career deals two to four cards a summer from a ledger that
   rests every card after it fires (Round 725).

   This file deals the US summer, for all four sports, reading only the
   sport's binding (src/lib/usCareerSport.ts):
   - up to `cards` cards, each a distinct ledger key, so two cards telling one
     story never land in one offseason;
   - a card on cooldown is held out (src/lib/careerEventDeck.ts, the rule the
     flagship uses), press moments excepted: they react to the season, so a
     champion always gets his podium, and a big press moment is always card 1;
   - every card is dealt from a stream keyed to the career, the year and the
     slot, and the ids are saved, so a reload rebuilds the same card from the
     same save. First show and reload are the same computation.

   The knob path (cards 1, cooldowns off) is the old offseason, draw for draw:
   startSummer hands back sport.drawEvent(c, Math.random) and writes nothing
   onto the career. The parity replay (scripts/simUsBoardParity.mjs) mounts
   every binding that way and must stay byte identical.

   Math.random on the summer path: card 1's answer and the team quality roll
   after the last card, exactly the draws one card made, so cards 2 and 3
   never touch the season's stream (scripts/simUsCareerSummer.mjs, section 4). */
import { keyedRng } from './keyedRng';
import { ledgerKey, onCooldown, sanitizeLedger, stampFired, takeFresh } from './careerEventDeck';
import type { UsCareerCore, UsCareerEvent, UsCareerSport, UsCareerSummer, UsSummerKnob } from './usCareerSport';

/** True unless the knob is the old one card offseason. */
export function summerOn(k: UsSummerKnob): boolean {
  return k.cards > 1 || k.cooldowns;
}

/** The season the ledger stamps and compares: the year of the season just
 *  played, as the flagship's eventSeasonIndex. */
export function summerSeason(c: UsCareerCore): number {
  return c.seasons[c.seasons.length - 1]?.year ?? 0;
}

/** The career's key: the Hall's own (name, position, pick, first year) plus
 *  the salt drawn when the career began. Old saves have no salt and use the
 *  Hall key alone. */
export function summerCareerKey(c: UsCareerCore): string {
  const hall = `${c.name}|${c.pos}|${c.draftPick}|${c.seasons[0]?.year ?? c.year}`;
  return typeof c.summerSalt === 'string' && c.summerSalt ? `${hall}|${c.summerSalt}` : hall;
}

/** A new career's salt. */
export function newSummerSalt(rng: () => number): string {
  return Math.floor(rng() * 0x100000000).toString(36);
}

const slotStream = (c: UsCareerCore, slug: string, year: number, i: number) =>
  keyedRng(`summer:${slug}:${summerCareerKey(c)}:${year}:${i}`);

/** The stream a card after the first applies its answer on. */
export function summerApplyRng(c: UsCareerCore, slug: string, year: number, i: number): () => number {
  return keyedRng(`summer-apply:${slug}:${summerCareerKey(c)}:${year}:${i}`);
}

/** Deal the summer onto the career: the ids, and every dealt card stamped in
 *  the ledger (press moments never are). Mutates c, which is always the
 *  board's own working copy. */
export function dealSummer<C extends UsCareerCore>(c: C, sport: UsCareerSport<C>): UsCareerSummer {
  const knob = sport.summer;
  const year = summerSeason(c);
  const ledger = knob.cooldowns ? sanitizeLedger(c.eventLastFired) : {};
  const outsideLedger = (e: UsCareerEvent<C>) => !!e.press;
  const fresh = knob.cooldowns
    ? (e: UsCareerEvent<C>) => outsideLedger(e) || !onCooldown(ledger, e, year, knob.fallbackCooldown)
    : undefined;
  const first = sport.drawEvent(c, slotStream(c, sport.slug, year, 0), fresh);
  const picked: UsCareerEvent<C>[] = [first];
  const taken = new Set<string>([ledgerKey(first)]);
  for (let i = 1; i < knob.cards; i += 1) {
    const r = slotStream(c, sport.slug, year, i);
    const deck = sport.eventDeck(c, r).filter(e => e.press !== 'big');
    const [e] = takeFresh(deck, 1, knob.cooldowns ? ledger : null, year, knob.fallbackCooldown, taken, r, outsideLedger);
    /* A slot that finds nothing ends the deal, so ids[i] was always dealt
       from slot i's stream and can be rebuilt from it. */
    if (!e) break;
    picked.push(e);
    taken.add(ledgerKey(e));
  }
  if (knob.cooldowns) c.eventLastFired = stampFired(ledger, picked.filter(e => !outsideLedger(e)), year);
  const summer: UsCareerSummer = { year, ids: picked.map(e => e.id), at: 0 };
  c.summer = summer;
  return summer;
}

/** Card i of the summer, rebuilt from the career as it stands now with slot
 *  i's own stream, or null when the career has moved past it. */
export function summerCardAt<C extends UsCareerCore>(c: C, sport: UsCareerSport<C>, i: number): UsCareerEvent<C> | null {
  const s = c.summer;
  if (!s || i < 0 || i >= s.ids.length) return null;
  return sport.eventDeck(c, slotStream(c, sport.slug, s.year, i)).find(e => e.id === s.ids[i]) ?? null;
}

/** The card the summer stands on. A card no longer in its deck (a trade or a
 *  fixed knee moved the career past it) is skipped, the flagship's rule, and
 *  `at` moves past it. When nothing is left the summer is over and leaves
 *  the career. Mutates c. */
export function seekSummerCard<C extends UsCareerCore>(c: C, sport: UsCareerSport<C>): UsCareerEvent<C> | null {
  const s = c.summer;
  if (!s) return null;
  while (s.at < s.ids.length) {
    const card = summerCardAt(c, sport, s.at);
    if (card) return card;
    s.at += 1;
  }
  delete c.summer;
  return null;
}

/** The offseason's first card. On the knob path this is exactly the old
 *  draw and c is not touched; otherwise the summer is dealt onto c. */
export function startSummer<C extends UsCareerCore>(c: C, sport: UsCareerSport<C>, mathRng: () => number): UsCareerEvent<C> | null {
  if (!summerOn(sport.summer)) return sport.drawEvent(c, mathRng);
  dealSummer(c, sport);
  return seekSummerCard(c, sport);
}

/** Answer the card the summer stands on: card 1 answers on the season's own
 *  stream (as the one card offseason always did), every later card on its
 *  own keyed stream. Returns the feed line and the next card, or null when
 *  the summer is over (the board then rolls team quality, once). Mutates c. */
export function answerSummerCard<C extends UsCareerCore>(
  c: C, sport: UsCareerSport<C>, card: UsCareerEvent<C>, optionIdx: number, mathRng: () => number,
): { line: string; next: UsCareerEvent<C> | null } {
  const s = c.summer;
  const i = s?.at ?? 0;
  const rng = !s || i === 0 ? mathRng : summerApplyRng(c, sport.slug, s.year, i);
  const line = card.options[optionIdx].apply(c, rng);
  if (!c.summer) return { line, next: null };
  c.summer.at = i + 1;
  return { line, next: seekSummerCard(c, sport) };
}

/** Repair on load, the house pattern: each block is checked alone and a
 *  broken one is dropped alone. summer needs a four digit year that is the
 *  last season played, a non empty list of ids and an `at` inside it; the
 *  ledger keeps finite numbers only; the salt must be a string. Old saves,
 *  with none of the three, come back untouched. Mutates c. */
export function repairSummerOnLoad(c: UsCareerCore): void {
  const s = c.summer as unknown;
  if (s !== undefined) {
    const o = (s && typeof s === 'object' && !Array.isArray(s) ? s : null) as Partial<UsCareerSummer> | null;
    const ok = !!o
      && Number.isInteger(o.year) && (o.year as number) >= 1000 && (o.year as number) <= 9999
      && Array.isArray(c.seasons) && (o.year as number) === summerSeason(c)
      && Array.isArray(o.ids) && o.ids.length > 0 && o.ids.every(x => typeof x === 'string')
      && Number.isInteger(o.at) && (o.at as number) >= 0 && (o.at as number) < o.ids.length;
    if (!ok) delete c.summer;
  }
  if (c.eventLastFired !== undefined) c.eventLastFired = sanitizeLedger(c.eventLastFired);
  if (c.summerSalt !== undefined && typeof c.summerSalt !== 'string') delete c.summerSalt;
}
