/* ─── Round 796: rivalry choices, one engine for every career ───────────────

   careerRivalryEvents.ts (Round 521) lifted the flagship's eighteen rivalry
   BEATS: things that happen to you and your rival, shown on a card with one
   Continue button. Soccer Career also has the other half, added in the
   2026-08-05 expansion under the line "the feud gets interactive": four
   dilemmas where the rival puts a decision in front of you (his club
   triggers your release clause, he goes through your ankle in the derby, a
   network wants a live debate, his foundation asks for a truce) and what you
   pick moves your money, your standing and the heat of the feud. The NFL
   career never had that half, and his 2026-08-28 backlog row still marks
   "interactive rivalry events" open for it.

   This file is that half with the soccer taken out of it, the same lift
   careerInbox.ts and careerRivalryEvents.ts already made:

     RivalryChoiceDef   a gate, the words on the card, and each option's
                        mutation, written against the two concrete types a
                        sport hands in (its save and its rival). Soccer's four
                        options touch soccer-only fields (integrity, next
                        season's shooting) so they stay closures over
                        soccer's own state.
     rivalryChoiceOpen  the one gate every sport shares: a rival exists, he
                        is still playing, and the beat's own gate holds.
     rollRivalryChoice  the roll a sport WITHOUT a wider dilemma pool uses (a
                        chance, then prefer a choice this career has not seen
                        yet, exactly the preference Soccer Career's dilemma
                        trigger has always had). Soccer keeps its own roll,
                        because its four rival dilemmas are four entries in a
                        pool of twenty eight and moving them out of that pool
                        would change which dilemma a seed draws.
     resolveRivalryChoice  run one option, return the feed line.

   And for the four American careers, which share their meter names
   (morale, fanbase, netWorth, karma, rivalryIntensity), a small descriptor
   and `meterOption`, which writes an option from plain numbers: the card's
   promise is generated from the same numbers the mutation applies, so the
   words on the button cannot drift from what the button does.
   scripts/simCareerInboxBeats.mjs measures exactly that over many seeds.

   LEGAL SHAPE. The rival is always the invented player careerRival.ts
   drafts. Every description narrates him ("drilled you", "his foundation
   asks"), never quotes him. */

/** One option on a rivalry choice card. */
export interface RivalryChoiceOption<P, R> {
  label: string;
  emoji: string;
  /** What the card promises before you pick. */
  consequence: string;
  /** The gamble, when there is one, said out loud on the card. */
  risk?: string;
  /** Apply the option to the save. Returns the line for the feed. `r` is
   *  null only when a save lost its rival between the card and the tap. */
  apply: (s: P, r: R | null, rng: () => number) => string;
  /** The numbers behind `consequence`, when the option was written from
   *  numbers (meterOption). Read by the harness, never by the game. */
  promise?: MeterPromise;
}

/** One rivalry choice in a sport's table. */
export interface RivalryChoiceDef<P, R> {
  id: string;
  emoji: string;
  title: string;
  /** A fixed line, or one built from the save and the rival. */
  description: string | ((p: P, r: R) => string);
  /** The beat's own gate, on top of "a rival exists and is still playing". */
  when: (p: P, r: R) => boolean;
  choices: RivalryChoiceOption<P, R>[];
}

/** A pending choice as it sits on a save: plain data, no closures, so it
 *  survives JSON and a reload. */
export interface RivalryChoiceCard {
  id: string;
  emoji: string;
  title: string;
  description: string;
  choices: { label: string; emoji: string; consequence: string; risk?: string }[];
}

interface LiveRival { retired: boolean }

/** The gate every sport shares. */
export function rivalryChoiceOpen<P, R extends LiveRival>(
  p: P, r: R | null | undefined, def: RivalryChoiceDef<P, R>,
): boolean {
  return !!r && !r.retired && def.when(p, r);
}

/** The card a pending choice shows, built once at roll time. */
export function rivalryChoiceCard<P, R>(def: RivalryChoiceDef<P, R>, p: P, r: R): RivalryChoiceCard {
  return {
    id: def.id,
    emoji: def.emoji,
    title: def.title,
    description: typeof def.description === "string" ? def.description : def.description(p, r),
    choices: def.choices.map(c => (c.risk === undefined
      ? { label: c.label, emoji: c.emoji, consequence: c.consequence }
      : { label: c.label, emoji: c.emoji, consequence: c.consequence, risk: c.risk })),
  };
}

/**
 * The season roll for a sport whose rival choices are their own deck: one
 * draw for the chance, then, only if it passes and something is open, one
 * draw to pick. Prefers choices this career has not seen; once every one has
 * fired, any of them can come round again, the same rule Soccer Career's
 * dilemma trigger has always used.
 */
export function rollRivalryChoice<P, R extends LiveRival>(
  p: P, r: R | null | undefined, seenIds: readonly string[], defs: RivalryChoiceDef<P, R>[],
  chance: number, rng: () => number = Math.random,
): RivalryChoiceCard | null {
  if (!r || r.retired) return null;
  if (rng() >= chance) return null;
  const unseen = defs.filter(d => !seenIds.includes(d.id));
  const pool = (unseen.length > 0 ? unseen : defs).filter(d => rivalryChoiceOpen(p, r, d));
  if (pool.length === 0) return null;
  return rivalryChoiceCard(pool[Math.floor(rng() * pool.length)], p, r);
}

/** Run one option. Returns the feed line, or null when the choice or the
 *  option does not exist. */
export function resolveRivalryChoice<P, R>(
  s: P, r: R | null, id: string, choiceIdx: number, defs: RivalryChoiceDef<P, R>[], rng: () => number,
): string | null {
  const def = defs.find(d => d.id === id);
  const option = def?.choices[choiceIdx];
  if (!option) return null;
  return option.apply(s, r, rng);
}

/* ─── written from numbers: the four American careers ───────────────────── */

/** What an option can move. Every one is a meter the career already tracks
 *  and already shows: morale feeds the season's form, fanbase is the hub's
 *  number, cash is the bank, mood is the inbox's karma meter, and heat is
 *  the feud's own intensity. */
export interface MeterEffect {
  morale?: number;
  fanbase?: number;
  /** Millions, signed. */
  cash?: number;
  karma?: number;
  heat?: number;
}

/** The numbers behind one option's promise. `effect` always lands; `risk`
 *  is a coin with a stated chance, `hit` landing when it comes up and `miss`
 *  when it does not. */
export interface MeterPromise {
  effect: MeterEffect;
  risk?: { chance: number; hit: MeterEffect; miss: MeterEffect };
}

/** The save fields the four American careers share, by the same names. */
export interface MeterHost {
  morale: number;
  fanbase: number;
  netWorth?: number;
  karma?: number;
  rivalryIntensity?: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Apply one effect to a save. Meters clamp 0-100, cash rounds to $100k
 *  the way every American career's bank already does. */
export function applyMeterEffect(s: MeterHost, e: MeterEffect): void {
  if (e.morale) s.morale = clamp(s.morale + e.morale, 0, 100);
  if (e.fanbase) s.fanbase = clamp(s.fanbase + e.fanbase, 0, 100);
  if (e.cash) s.netWorth = Math.round(((s.netWorth ?? 0) + e.cash) * 10) / 10;
  if (e.karma) s.karma = clamp((s.karma ?? 50) + e.karma, 0, 100);
  if (e.heat) s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + e.heat, 0, 100);
}

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const money = (n: number) => {
  const abs = Math.abs(n);
  const amount = abs >= 1 ? `$${abs}M` : `$${Math.round(abs * 1000)}k`;
  return n > 0 ? `+${amount}` : `-${amount}`;
};

/** The promise in words, generated from the same numbers the mutation uses. */
export function describeMeterEffect(e: MeterEffect): string {
  const parts: string[] = [];
  if (e.morale) parts.push(`Morale ${signed(e.morale)}`);
  if (e.fanbase) parts.push(`Fanbase ${signed(e.fanbase)}`);
  if (e.cash) parts.push(`Net worth ${money(e.cash)}`);
  if (e.karma) parts.push(`Karma ${signed(e.karma)}`);
  if (e.heat) parts.push(e.heat > 0 ? "the feud heats up" : "the feud cools");
  return parts.join(", ");
}

/**
 * Write one option from plain numbers. The card's consequence and risk text
 * come from `promise`, and apply runs exactly `promise`, so the button can
 * never say one thing and do another. `line`, `hitLine` and `missLine` get
 * the rival's name (or "your rival" if the save lost him).
 */
export function meterOption<P extends MeterHost, R extends { name: string }>(spec: {
  label: string;
  emoji: string;
  promise: MeterPromise;
  line?: (rival: string) => string;
  hitLine?: (rival: string) => string;
  missLine?: (rival: string) => string;
  /** Plain words for what the risk is, before the numbers. */
  riskNote?: string;
}): RivalryChoiceOption<P, R> {
  const { promise } = spec;
  const always = describeMeterEffect(promise.effect);
  const consequence = promise.risk
    ? [always, `otherwise ${describeMeterEffect(promise.risk.miss)}`].filter(Boolean).join(", ")
    : always;
  const risk = promise.risk
    ? `${Math.round(promise.risk.chance * 100)}% chance ${spec.riskNote ?? "it goes wrong"}: ${describeMeterEffect(promise.risk.hit)}`
    : undefined;
  return {
    label: spec.label,
    emoji: spec.emoji,
    consequence: consequence.charAt(0).toUpperCase() + consequence.slice(1),
    ...(risk ? { risk } : {}),
    promise,
    apply: (s, r, rng) => {
      const rival = r?.name ?? "your rival";
      applyMeterEffect(s, promise.effect);
      if (!promise.risk) return spec.line ? spec.line(rival) : `${spec.emoji} ${spec.label}.`;
      const hit = rng() < promise.risk.chance;
      applyMeterEffect(s, hit ? promise.risk.hit : promise.risk.miss);
      const say = hit ? spec.hitLine : spec.missLine;
      return say ? say(rival) : `${spec.emoji} ${spec.label}.`;
    },
  };
}
