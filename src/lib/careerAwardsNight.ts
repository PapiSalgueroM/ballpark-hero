/* ────────────────────────────────────────────────────────────────────────────
   careerAwardsNight.ts, the end of season awards night (Round 834)

   One engine, many sports. Soccer Career's Ballon d'Or night (the shortlist,
   the countdown, the player's own place, the winner's speech) was the deepest
   awards night on the site and lived inside the soccer engine, while the four
   American careers showed their awards as one line on the season curtain. This
   module is the night itself, with no sport in it. A sport binds it with a
   descriptor and gets the same night wearing its own award.

   THE CONTRACT. What a sport's descriptor must supply:
     1. award      the award's id, name and emoji, the shortlist size, the
                   wider ranking size (0 for none), the podium size, and where
                   the rival names come from (`rivals`, see below).
     2. a ballot   per night, from the sport's own scoring (`AwardsBallot`):
                   the field of scored rivals best first, the player's entry
                   or null when he did not make the ballot, his points, an
                   optional generated filler for a short field, the sport's
                   verdict rules in order, and whether the wider ranking may
                   place him. The engine never scores anyone.
     3. meters     every meter a night or a speech may move, each with the
                   label the copy uses and the one function that moves it
                   (clamps and rounding are the sport's).
     4. steps      what winning and a podium finish do, as ordered meter steps.
     5. save hooks where the night is staged for the card, where the place and
                   the win are written on the season record, the trophy
                   cabinet, an optional podium hook, and the career log.
     6. copy       the card's titles and place lines, and each speech option's
                   button and log line.

   WHAT THE ENGINE GUARANTEES, whatever the descriptor:
     - a shortlist never names the same rival twice;
     - after every verdict rule the shortlist is re-ranked by points, so the
       winner is always the top of the list;
     - the player's place is always his index on that list plus one, or the
       wider ranking's number when he is off it, or null;
     - a speech moves exactly the meters its steps name, in the order written,
       and draws at most once (its risk, if it has one), from the rng it is
       given;
     - nothing here draws a random number except a speech's risk, so a sport
       keeps the order of its own draws exactly as it wrote them.

   RIVAL NAMES. A new sport's field must be GENERATED people (the guarded name
   pools in src/lib/intlNames.ts or the sport's own guarded pool), so `rivals`
   is 'generated'. 'legacy-real-era-stars' exists for one reason: Soccer
   Career's Ballon d'Or has ranked the real stars of each era (careerEras.ts)
   with invented goal totals since before this module, and that is an open
   decision for the owner, not a pattern. scripts/simCareerAwardsNight.mjs fails
   if any file but the Soccer engine declares it.
   ──────────────────────────────────────────────────────────────────────────── */

/** One name on an awards night's list. A sport adds whatever its card shows. */
export interface AwardsCandidate {
  name: string;
  points: number;
  isPlayer: boolean;
}

/** The night as the save stores it, winner first. */
export interface AwardsNight<C extends AwardsCandidate = AwardsCandidate> {
  year: number;
  nominees: C[];
  /** 1 to shortlistSize on the list, up to widerSize in the wider ranking, else null. */
  playerRank: number | null;
  playerPoints: number;
  /** Did the player make the ballot at all? */
  playerNominated: boolean;
  /** The winner's speech once given on the card: which one, the log line, and
   *  what it actually moved. Absent on a night with no speech yet. */
  speech?: { id: string; line: string; moved: string };
}

/** Where the field's names come from. See RIVAL NAMES above. */
export type AwardsRivalNames = "generated" | "legacy-real-era-stars";

export interface AwardsDef {
  id: string;
  name: string;
  emoji: string;
  shortlistSize: number;
  /** The wider ranking a player off the shortlist can still be placed in; 0 for none. */
  widerSize: number;
  podiumSize: number;
  rivals: AwardsRivalNames;
}

/** One night's scoring, everything the sport decides. */
export interface AwardsBallot<C extends AwardsCandidate> {
  /** Every rival the sport scored, best first. Never the player. */
  field: C[];
  /** The player's entry when he made the ballot, else null. */
  player: C | null;
  /** The player's points, kept even when he is off the ballot. */
  playerPoints: number;
  /** Tops the shortlist up to `need` with generated candidates when the field runs short. */
  fill?: (shortlist: C[], need: number) => void;
  /** The sport's verdict rules, in order. Each may move points on the shortlist,
   *  never add or remove a name; the list is re-ranked after each. */
  verdicts?: Array<(shortlist: C[], place: number | null) => void>;
  /** May the wider ranking place the player when he is off the shortlist? */
  widerEligible: boolean;
}

/** A meter a night or a speech can move. `label` is the word the copy uses. */
export interface AwardsMeter<S> {
  label: string;
  add: (s: S, delta: number) => void;
  /** How a change reads on a card ("+€15M"); a signed number when absent. */
  show?: (delta: number) => string;
}

export interface MeterStep<M extends string> {
  meter: M;
  delta: number;
}

export interface AwardsNightCopy {
  winnerTitle: string;
  title: (year: number) => string;
  winnerLine: string;
  podiumLine: (place: number) => string;
  shortlistLine: (place: number) => string;
  /** The wider ranking line, split around the emphasised "#place". */
  wider: { before: string; after: string };
  notNominated: string;
}

/** A sport's binding of the awards night. S is the save, C a candidate, M the
 *  meter ids, R the season record the place is written on. */
export interface AwardsNightSport<S, C extends AwardsCandidate, M extends string, R> {
  award: AwardsDef;
  meters: Record<M, AwardsMeter<S>>;
  winnerSteps: MeterStep<M>[];
  podiumSteps: MeterStep<M>[];
  /** Puts the night on the save, where the card reads it. */
  stage: (s: S, night: AwardsNight<C>) => void;
  recordPlace: (season: R, place: number) => void;
  recordWin: (season: R) => void;
  addToCabinet: (s: S, entry: { year: number; name: string; emoji: string }) => void;
  onPodium?: (s: S) => void;
  /** Writes a line to the career log. */
  say: (s: S, line: string) => void;
  copy: AwardsNightCopy;
}

/** One speech a winner can give. */
export interface SpeechOption<S, M extends string, Id extends string = string> {
  id: Id;
  emoji: string;
  label: string;
  /** How loud the button is. */
  tone: "gold" | "bold" | "quiet";
  /** Shown only when this holds. A presentation gate: applySpeech still runs
   *  an option it is asked for, as Soccer always has. */
  available?: (s: S) => boolean;
  /** Always lands, in this order. */
  effect: MeterStep<M>[];
  /** A coin with a stated chance: `hit` lands when it comes up, `miss` when not. */
  risk?: { chance: number; hit: MeterStep<M>[]; miss: MeterStep<M>[] };
  /** The log line. `outcome` is "sure" for an option with no risk. */
  line: (s: S, outcome: "sure" | "hit" | "miss") => string;
}

const byPoints = (a: AwardsCandidate, b: AwardsCandidate) => b.points - a.points;

/** The player's place on a ranked list, or null when he is not on it. */
export function placeOf(list: AwardsCandidate[]): number | null {
  const i = list.findIndex(n => n.isPlayer);
  return i >= 0 ? i + 1 : null;
}

/** Rivals with any repeated name dropped, first one kept, order kept. */
function uniqueRivals<C extends AwardsCandidate>(list: C[]): C[] {
  const seen = new Set<string>();
  return list.filter(c => {
    if (c.isPlayer || seen.has(c.name)) return false;
    seen.add(c.name);
    return true;
  });
}

/**
 * The night: take the best of the field (one seat fewer when the player made
 * the ballot), top it up if the field ran short, seat the player, rank by
 * points, apply the sport's verdict rules re-ranking after each, then place a
 * player who missed the list in the wider ranking if the sport allows it.
 */
export function runAwardsNight<C extends AwardsCandidate>(award: AwardsDef, year: number, ballot: AwardsBallot<C>): AwardsNight<C> {
  const seats = ballot.player ? award.shortlistSize - 1 : award.shortlistSize;
  let shortlist = uniqueRivals(ballot.field).slice(0, seats);
  if (shortlist.length < seats && ballot.fill) {
    ballot.fill(shortlist, seats);
    shortlist = uniqueRivals(shortlist);
  }
  if (ballot.player) shortlist.push(ballot.player);
  shortlist.sort(byPoints);
  const nominees = shortlist.slice(0, award.shortlistSize);
  let place = placeOf(nominees);
  for (const verdict of ballot.verdicts ?? []) {
    verdict(nominees, place);
    nominees.sort(byPoints);
    place = placeOf(nominees);
  }
  if (place === null && ballot.widerEligible && award.widerSize > award.shortlistSize) {
    const better = ballot.field.filter(n => !n.isPlayer && n.points > ballot.playerPoints).length;
    const wider = Math.max(award.shortlistSize + 1, better + 1);
    if (wider <= award.widerSize) place = wider;
  }
  return { year, nominees, playerRank: place, playerPoints: ballot.playerPoints, playerNominated: ballot.player !== null };
}

/** Round 834: what a list of steps does, in words, read from the steps
 *  themselves ("Market Value +€15M, Popularity +20"). A card that says what a
 *  night or a speech does builds its line from this, from the same steps the
 *  engine applies, so the words cannot drift from the effect again. */
export function describeSteps<S, M extends string>(meters: Record<M, AwardsMeter<S>>, steps: MeterStep<M>[]): string {
  return steps.map(({ meter, delta }) => {
    const m = meters[meter];
    return `${m.label} ${m.show ? m.show(delta) : `${delta >= 0 ? "+" : ""}${delta}`}`;
  }).join(", ");
}

/** Applies meter steps in the order written. */
export function applyMeterSteps<S, M extends string>(meters: Record<M, AwardsMeter<S>>, s: S, steps: MeterStep<M>[]): void {
  for (const step of steps) meters[step.meter].add(s, step.delta);
}

/** What the night writes on the save: the staged night, the place on the
 *  season record, and the winner's and the podium's consequences. */
export function settleAwardsNight<S, C extends AwardsCandidate, M extends string, R>(
  sport: AwardsNightSport<S, C, M, R>, s: S, season: R, night: AwardsNight<C>,
): void {
  sport.stage(s, night);
  const place = night.playerRank;
  if (place === null) return;
  sport.recordPlace(season, place);
  if (place === 1) {
    sport.recordWin(season);
    sport.addToCabinet(s, { year: night.year, name: sport.award.name, emoji: sport.award.emoji });
    applyMeterSteps(sport.meters, s, sport.winnerSteps);
  } else if (place <= sport.award.podiumSize) {
    applyMeterSteps(sport.meters, s, sport.podiumSteps);
    sport.onPodium?.(s);
  }
}

/** The options a card should show on this save. */
export function availableSpeeches<S, M extends string, Id extends string>(options: SpeechOption<S, M, Id>[], s: S): SpeechOption<S, M, Id>[] {
  return options.filter(o => !o.available || o.available(s));
}

/**
 * Gives a speech: its sure steps, then its risk if it has one (one draw from
 * `rng`, read when it is needed so a seeded Math.random is honoured), then
 * the log line. Returns the line, or null for an id the list does not carry
 * (nothing moves).
 */
export function applySpeech<S, C extends AwardsCandidate, M extends string, R, Id extends string>(
  sport: Pick<AwardsNightSport<S, C, M, R>, "meters" | "say">,
  options: SpeechOption<S, M, Id>[], s: S, id: Id, rng: () => number = () => Math.random(),
): string | null {
  const option = options.find(o => o.id === id);
  if (!option) return null;
  applyMeterSteps(sport.meters, s, option.effect);
  let outcome: "sure" | "hit" | "miss" = "sure";
  if (option.risk) {
    const hit = rng() < option.risk.chance;
    outcome = hit ? "hit" : "miss";
    applyMeterSteps(sport.meters, s, hit ? option.risk.hit : option.risk.miss);
  }
  const line = option.line(s, outcome);
  sport.say(s, line);
  return line;
}

/** The countdown: the last name on the list ticks in first, the winner last. */
export function countdownSlot(index: number, listLength: number): number {
  return listLength - 1 - index;
}

/** The mark beside a place: medals for the podium, then the number. */
export function placeMark(place: number): string {
  return place === 1 ? "🥇" : place === 2 ? "🥈" : place === 3 ? "🥉" : `${place}.`;
}
