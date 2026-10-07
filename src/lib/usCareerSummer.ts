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
     same save. First show and reload are the same computation;
   - card 1 is the old one card draw (on that keyed stream), so it keeps the
     old game's share of rating cards, arc cards and press moments. The later
     cards are the life around it: never a card that can move the rating,
     never the corruption deck, never one whose answers lift morale on
     average. Without those three rules the summer made careers far better
     than the one card game did (scripts/simUsCareerSummer.mjs, section 6).

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

/** A probe stream: its first draw is pinned (the low or high end, where a
 *  coin flip on an answer lives), every later one keyed, so a loop on the
 *  stream always ends. */
const probeStream = (key: string, first: number | null): (() => number) => {
  const rest = keyedRng(key);
  let pinned = first !== null;
  return () => {
    if (!pinned) return rest();
    pinned = false;
    return first as number;
  };
};

/** One answer tried on a copy of the career (never the career itself, never
 *  Math.random). Returns the copy, or null when the answer throws. */
function tryAnswer<C extends UsCareerCore>(e: UsCareerEvent<C>, k: number, snapshot: string, first: number | null): C | null {
  const probe = JSON.parse(snapshot) as C;
  try {
    e.options[k].apply(probe, probeStream(`rating-probe:${e.id}:${k}:${first}`, first));
  } catch {
    return null;
  }
  return probe;
}

/** Whether any answer to the card can move the rating or its ceiling. Each
 *  answer is tried with the first draw at the bottom of the range, at the top
 *  and on a keyed stream, so a raise behind a coin flip (mlbA_shoulder_scare's
 *  40 percent) is still found. An answer that throws counts as a move, so a
 *  card that cannot be read is never dealt late. */
export function movesRating<C extends UsCareerCore>(c: C, e: UsCareerEvent<C>, snapshot: string = JSON.stringify(c)): boolean {
  for (let k = 0; k < e.options.length; k += 1) {
    for (const first of [null, 0, 0.9999]) {
      const probe = tryAnswer(e, k, snapshot, first);
      if (!probe || probe.ovr !== c.ovr || probe.pot !== c.pot) return true;
    }
  }
  return false;
}

/** The average morale change over the card's answers, each tried once on the
 *  keyed stream. An answer that throws reads as an unlimited lift. */
export function moraleLiftOf<C extends UsCareerCore>(c: C, e: UsCareerEvent<C>, snapshot: string = JSON.stringify(c)): number {
  if (!e.options.length) return 0;
  let sum = 0;
  for (let k = 0; k < e.options.length; k += 1) {
    const probe = tryAnswer(e, k, snapshot, null);
    if (!probe) return Infinity;
    sum += probe.morale - c.morale;
  }
  return sum / e.options.length;
}

/** A later card whose answers lift morale on average (by more than this) is
 *  passed over, so the later cards are the summer's give and take. Morale
 *  feeds every season's form, and measured over 800 careers a sport, later
 *  cards free to lift it put the median legacy 7 to 11 percent higher and the
 *  Hall share 2 to 6 points higher in every sport even at an average lift of
 *  4; at 0 the four sports sit near the one card game (section 6 of
 *  scripts/simUsCareerSummer.mjs holds them to it). */
export const LATER_CARD_MORALE_LIFT = 0;

/** Deal the summer onto the career: the ids, and every dealt card stamped in
 *  the ledger (press moments never are). Mutates c, which is always the
 *  board's own working copy. */
export function dealSummer<C extends UsCareerCore>(c: C, sport: UsCareerSport<C>, exclude: ((e: UsCareerEvent<C>) => boolean) | null = null): UsCareerSummer {
  const knob = sport.summer;
  /* Round 1039: cards the board holds out of this offseason (the deck's
     retirement cards while the retirement talk is pending). Null deals
     exactly the Round 1038 summer. */
  const out = (e: UsCareerEvent<C>) => !!exclude && exclude(e);
  const year = summerSeason(c);
  const ledger = knob.cooldowns ? sanitizeLedger(c.eventLastFired) : {};
  const outsideLedger = (e: UsCareerEvent<C>) => !!e.press;
  const snapshot = JSON.stringify(c);
  /* Card 1 is drawn exactly as the one card offseason draws (the big press
     moment, the open arc's weight, one uniform pick), on its own stream. If
     that card is resting, another fresh card OF THE SAME KIND takes its place:
     a rating card for a rating card, anything else for anything else. Without
     that, the later slots (which deal only cards that leave the rating alone)
     use up the quiet cards and card 1 turns into a rating card more often
     than it ever was: measured on MLB, 38 percent of card 1s became 49. */
  const raw = sport.drawEvent(c, slotStream(c, sport.slug, year, 0));
  let first = raw;
  if (out(raw) || (knob.cooldowns && !outsideLedger(raw) && onCooldown(ledger, raw, year, knob.fallbackCooldown))) {
    const kind = movesRating(c, raw, snapshot);
    const redraw = keyedRng(`summer-redraw:${sport.slug}:${summerCareerKey(c)}:${year}`);
    const deck = sport.eventDeck(c, slotStream(c, sport.slug, year, 0)).filter(e => e.press !== 'big' && !out(e));
    const passed = new Set<string>();
    let any: UsCareerEvent<C> | undefined;
    for (;;) {
      const [cand] = takeFresh(deck, 1, ledger, year, knob.fallbackCooldown, passed, redraw, outsideLedger);
      if (!cand) break;
      any ??= cand;
      if (movesRating(c, cand, snapshot) === kind) { first = cand; break; }
      passed.add(ledgerKey(cand));
    }
    /* No fresh card of that kind: any fresh card, and if every card in the
       deck is resting, the drawn one anyway, so a summer is never empty. */
    if (first === raw && any) first = any;
    /* A held out card is never dealt: with nothing else fresh, any card the
       filter allows, and with none at all the summer is empty. */
    if (out(first)) {
      if (!deck.length) { delete c.summer; return { year, ids: [], at: 0 }; }
      first = deck[0];
    }
  }
  const picked: UsCareerEvent<C>[] = [first];
  const taken = new Set<string>([ledgerKey(first)]);
  for (let i = 1; i < knob.cards; i += 1) {
    const r = slotStream(c, sport.slug, year, i);
    /* The later slots are the rest of your life around the one big call.
       Card 1 is the only card that can move the rating, so a card any of
       whose answers moves it is passed over here, and every button still
       does exactly what it says (scripts/simUsCareerSummer.mjs, section 6,
       measured the careers without this: peak OVR 4 to 7 points higher and
       the Hall share doubled). The integrity arc stays with card 1 too: the
       corruption deck is dealt there only, as it always was, because arcs
       opened by the later slots came back as card 1's arc cards (MLB's PED
       clinic) and lifted the rating that way. */
    const deck = sport.eventDeck(c, r).filter(e => e.press !== 'big' && !e.corruption && !out(e));
    const passed = new Set<string>(taken);
    let e: UsCareerEvent<C> | undefined;
    for (;;) {
      [e] = takeFresh(deck, 1, knob.cooldowns ? ledger : null, year, knob.fallbackCooldown, passed, r, outsideLedger);
      if (!e) break;
      /* The cheap read first: most cards that fail, fail on morale. */
      if (moraleLiftOf(c, e, snapshot) <= LATER_CARD_MORALE_LIFT && !movesRating(c, e, snapshot)) break;
      passed.add(ledgerKey(e));
    }
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

/** Whether any answer to later card i would move the rating or its ceiling
 *  from where the career stands NOW, each answer tried on a copy with the
 *  very stream it will apply on (summerApplyRng is keyed, so the copy sees
 *  exactly the draws the real answer will). The deal judged the card on the
 *  career before card 1 was answered, and an answer in between can open a
 *  raise that the ceiling capped then (a rating lowered under the same
 *  ceiling). This is what makes 'only the first card can move your rating'
 *  exact. An answer that throws counts as a move. */
export function laterAnswerMovesRating<C extends UsCareerCore>(c: C, sport: UsCareerSport<C>, e: UsCareerEvent<C>, i: number): boolean {
  const year = c.summer?.year ?? summerSeason(c);
  const snapshot = JSON.stringify(c);
  for (let k = 0; k < e.options.length; k += 1) {
    const probe = JSON.parse(snapshot) as C;
    try {
      e.options[k].apply(probe, summerApplyRng(c, sport.slug, year, i));
    } catch {
      return true;
    }
    if (probe.ovr !== c.ovr || probe.pot !== c.pot) return true;
  }
  return false;
}

/** The card the summer stands on. A card no longer in its deck (a trade or a
 *  fixed knee moved the career past it) is skipped, the flagship's rule, and
 *  so is a later card that the career as it stands now would let move the
 *  rating; `at` moves past it and `gone` counts it. When nothing is left the
 *  summer is over and leaves the career. Mutates c. */
export function seekSummerCard<C extends UsCareerCore>(
  c: C, sport: UsCareerSport<C>, exclude: ((e: UsCareerEvent<C>) => boolean) | null = null,
): UsCareerEvent<C> | null {
  const s = c.summer;
  if (!s) return null;
  while (s.at < s.ids.length) {
    const card = summerCardAt(c, sport, s.at);
    /* Round 1039: a card the board now holds out (a deck retirement card in
       an offseason whose talk came after the deal, because card 1 moved the
       rating into the rule) is skipped like one the career moved past. */
    if (card && !(exclude && exclude(card)) && (s.at === 0 || !laterAnswerMovesRating(c, sport, card, s.at))) return card;
    s.at += 1;
    s.gone = (s.gone ?? 0) + 1;
  }
  delete c.summer;
  return null;
}

/** Where the board says you are: card `n` of `of`, counted over the cards you
 *  actually get (a skipped card is never shown, so it is never counted), and
 *  `done` of them answered. A card skipped later in the summer can still end
 *  it one early. */
export function summerPlace(s: UsCareerSummer): { n: number; of: number; done: number } {
  const gone = s.gone ?? 0;
  return { n: s.at + 1 - gone, of: s.ids.length - gone, done: s.at - gone };
}

/** The offseason's first card. On the knob path this is exactly the old
 *  draw and c is not touched; otherwise the summer is dealt onto c. */
export function startSummer<C extends UsCareerCore>(
  c: C, sport: UsCareerSport<C>, mathRng: () => number, exclude: ((e: UsCareerEvent<C>) => boolean) | null = null,
): UsCareerEvent<C> | null {
  if (!summerOn(sport.summer)) {
    /* Round 1039: on the one card knob a held out card is dropped unapplied
       (its draw has happened, so the stream is where it always was). */
    const ev = sport.drawEvent(c, mathRng);
    return exclude && exclude(ev) ? null : ev;
  }
  dealSummer(c, sport, exclude);
  return seekSummerCard(c, sport, exclude);
}

/** Answer the card the summer stands on: card 1 answers on the season's own
 *  stream (as the one card offseason always did), every later card on its
 *  own keyed stream. Returns the feed line and the next card, or null when
 *  the summer is over (the board then rolls team quality, once). Mutates c. */
export function answerSummerCard<C extends UsCareerCore>(
  c: C, sport: UsCareerSport<C>, card: UsCareerEvent<C>, optionIdx: number, mathRng: () => number,
  exclude: ((e: UsCareerEvent<C>) => boolean) | null = null,
): { line: string; next: UsCareerEvent<C> | null } {
  const s = c.summer;
  const i = s?.at ?? 0;
  const rng = !s || i === 0 ? mathRng : summerApplyRng(c, sport.slug, s.year, i);
  const line = card.options[optionIdx].apply(c, rng);
  if (!c.summer) return { line, next: null };
  c.summer.at = i + 1;
  return { line, next: seekSummerCard(c, sport, exclude) };
}

/** Repair on load, the house pattern: each block is checked alone and a
 *  broken one is dropped alone. summer needs a four digit year that is the
 *  last season played, a non empty list of ids and an `at` inside it (its
 *  optional skip count, a whole number no larger than `at`); the
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
    /* The skip count only labels the cards: a broken one is dropped alone. */
    else if (o.gone !== undefined && !(Number.isInteger(o.gone) && (o.gone as number) >= 0 && (o.gone as number) <= (o.at as number))) delete o.gone;
  }
  if (c.eventLastFired !== undefined) c.eventLastFired = sanitizeLedger(c.eventLastFired);
  if (c.summerSalt !== undefined && typeof c.summerSalt !== 'string') delete c.summerSalt;
}
