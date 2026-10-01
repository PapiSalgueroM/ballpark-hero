/* ─── Round 521: the inbox, one engine for every career ─────────────────────

   Round 80 built Soccer Career a phone: texts arrive between seasons from a
   pool of message templates, gated on age and phase, and how you answer one
   moves a 0-100 mood meter (karma) plus small morale, standing and cash
   effects. It has been on the flagship ever since and it is one of the two
   things his 2026-08-28 backlog still marks open for the NFL career: "an
   inbox".

   The mechanic lived only inside soccerCareerEngine.ts. This file is that
   mechanic with the soccer taken out of it, following the same shape
   careerMoney.ts already proved for the bank:

     InboxHost    the two save fields a career must carry: a morale number
                  every sport already has, and the inbox array itself.
     InboxSport   the pool of message templates, and four small closures for
                  whatever the sport calls its mood meter and its standing
                  meter, since the field names differ (soccer: karma and
                  popularity; the NFL: karma and fanbase) even though the
                  rule they play by does not.

   soccerCareerEngine.ts is a thin wrapper that binds SOCCER_INBOX and keeps
   every export name the panel and the harnesses already import; its Round
   130 thread system (contacts, open conversations, the world feed) sits on
   top of this and is deliberately NOT part of the lift, because nothing
   outside the flagship has anything like it yet. nflCareerInbox.ts binds the
   NFL one with its own message bank. scripts/simCareerInbox.mjs proves the
   soccer half is unchanged and the NFL half actually fires.

   THE RULES THIS FILE LIVES BY, unchanged from Round 80.

   1. Mood drifts back toward 50 by 2 a season, and only couples into morale
      and standing at the extremes (70+ or 30-), so one bad reply never tips
      a career.
   2. Up to `wantPerSeason` new messages arrive, but never enough to leave
      more than that many unanswered at once: a season with two unread texts
      still sitting there gets zero new ones.
   3. The inbox is bounded. Oldest ANSWERED message drops first once the save
      passes `maxInbox`, so an unanswered thread always stays answerable and
      the save never grows with career length.
   4. Every message is used at most once a career (`usedIds`), so the same
      text never arrives twice.
   5. Nothing here calls Math.random directly except through the `rng`
      parameter, which defaults to Math.random so a save that never passed
      one behaves exactly as it always did.

   Round 796: THE CALENDAR. A sport can hand in its own calendar (the NFL's
   is draft night, camp, the bye, the trade deadline, the playoffs, a
   contract year and the offseason) and tag each template with the beat it
   belongs to. The season tick is then told which beats actually happened
   (no playoff texts in a year the team missed them, no contract year texts
   with three years left on the deal) and delivers on those, at most one text
   a beat, a one-off beat first because it may not come round again, then
   the rest at random, and back into calendar order so the inbox reads the
   way the season went. Rules 1 to 4 hold unchanged on that path. A sport
   that passes no beats (Soccer Career) takes the Round 80 path, line for
   line: scripts/simCareerInboxBeats.mjs replays a fixture recorded before
   this round touched the file and requires the soccer output to match. */

/* ─── the pool ───────────────────────────────────────────────────────────── */

/** One answer to a message. Effects are small on purpose: this is flavor and
 *  a mood meter, never a lever worth grinding. */
export interface InboxChoiceDef {
  label: string;
  /** What your player answers, shown once the thread is read back. */
  reply: string;
  /** Mood delta, -12 to 12. Soccer calls its mood meter karma. */
  karma: number;
  morale?: number;
  /** Standing delta: soccer's popularity, the NFL's fanbase. */
  popularity?: number;
  /** Cash delta, in the sport's own currency millions. Can be negative. */
  cash?: number;
}

/** One template in the pool. */
export interface InboxMessageDef {
  id: string;
  from: string;
  emoji: string;
  text: string;
  phase: "youth" | "pro" | "any";
  minAge?: number;
  maxAge?: number;
  choices: InboxChoiceDef[];
  /** Round 796: the calendar beat this text belongs to, for a sport that
   *  hands in a calendar. Absent means the Round 80 between-seasons pool. */
  beat?: string;
}

/** Round 796: one beat on a sport's calendar. */
export interface InboxBeat {
  id: string;
  label: string;
  emoji: string;
  /** A beat that may not come round again (draft night, a contract year, a
   *  playoff run) is offered before the season's ordinary ones. */
  oneOff?: boolean;
}

/** One delivered message, sitting on the save. */
export interface InboxMessage {
  /** Unique per career: defId-year. */
  id: string;
  defId: string;
  from: string;
  emoji: string;
  text: string;
  year: number;
  choices: InboxChoiceDef[];
  /** Index into choices once replied. */
  answered?: number;
  /** Round 796: the beat it arrived on. Absent on every message delivered
   *  before this round and on every Soccer Career text. */
  beat?: string;
}

/* ─── what a save must carry ─────────────────────────────────────────────── */

/** The two fields the inbox needs on a save. Every career already has a
 *  morale number; the inbox array itself is new to nothing but the field
 *  name, which every sport shares so a future sport needs no adapter. */
export interface InboxHost {
  morale: number;
  phoneInbox?: InboxMessage[];
  phoneUsedIds?: string[];
}

/* ─── what a sport hands in ──────────────────────────────────────────────── */

export interface InboxSport<S extends InboxHost> {
  /** The message bank this sport's phone draws from. */
  pool: InboxMessageDef[];
  /** The mood meter, 0-100, neutral 50. Soccer calls it karma. */
  moodOf: (s: S) => number;
  setMood: (s: S, v: number) => void;
  /** Nudge the standing meter (soccer's popularity, the NFL's fanbase) by a
   *  signed amount, clamped 0-100 inside the closure. */
  addPopularity: (s: S, delta: number) => void;
  /** Add a signed cash amount, in the sport's own currency millions. */
  addCash: (s: S, amount: number) => void;
  ageOf: (s: S) => number;
  /** The in-world year, for dating a delivered message. */
  yearOf: (s: S) => number;
  /** Messages kept on the save before the oldest answered one drops. */
  maxInbox: number;
  /** New messages a season tries to deliver, less however many are already
   *  sitting unanswered. */
  wantPerSeason: number;
  /** Round 796: the sport's own calendar, in the order a season runs. Only a
   *  sport that delivers on beats needs one. */
  calendar?: InboxBeat[];
}

/* ─── picking, deterministic given the same rng ──────────────────────────── */

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Up to `count` unseen templates that fit the player's age and phase.
 *  Structurally the exact draw Round 80 always used: filter to what fits,
 *  then pull random entries out of that pool one at a time. */
export function pickInboxTexts<M extends InboxMessageDef>(
  pool: M[], age: number, phase: "youth" | "pro", usedIds: string[], count: number,
  rng: () => number = Math.random,
): M[] {
  const used = new Set(usedIds);
  const fits = pool.filter(t =>
    !used.has(t.id) &&
    (t.phase === "any" || t.phase === phase) &&
    (t.minAge === undefined || age >= t.minAge) &&
    (t.maxAge === undefined || age <= t.maxAge)
  );
  const out: M[] = [];
  const left = [...fits];
  while (out.length < count && left.length > 0) {
    const i = Math.floor(rng() * left.length);
    out.push(left[i]);
    left.splice(i, 1);
  }
  return out;
}

/**
 * Round 796: which templates arrive on a season's beats. `beats` is what
 * actually happened this season, by id; anything not on the sport's calendar
 * is ignored. At most one text per beat; one-off beats first in calendar
 * order, then the ordinary ones drawn at random; the result is put back into
 * calendar order. Within a beat the template is drawn by pickInboxTexts, the
 * same draw the Round 80 path uses.
 */
export function pickBeatTexts<M extends InboxMessageDef>(
  pool: M[], calendar: InboxBeat[], beats: readonly string[], age: number, phase: "youth" | "pro",
  usedIds: string[], count: number, rng: () => number = Math.random,
): { def: M; beat: string }[] {
  const atBeat = (b: InboxBeat) => pool.filter(t => t.beat === b.id);
  /* A beat with nothing left that fits this player is skipped. The probe
     draws with a constant, so it spends nothing from the real stream. */
  const open = calendar.filter(b =>
    beats.includes(b.id) && pickInboxTexts(atBeat(b), age, phase, usedIds, 1, () => 0).length > 0,
  );
  const chosen = open.filter(b => b.oneOff).slice(0, count);
  const rest = open.filter(b => !b.oneOff);
  while (chosen.length < count && rest.length > 0) {
    const i = Math.floor(rng() * rest.length);
    chosen.push(rest[i]);
    rest.splice(i, 1);
  }
  chosen.sort((a, b) => calendar.indexOf(a) - calendar.indexOf(b));
  return chosen.map(b => ({ def: pickInboxTexts(atBeat(b), age, phase, usedIds, 1, rng)[0], beat: b.id }));
}

/* ─── the season ─────────────────────────────────────────────────────────── */

/**
 * One season of the inbox: mood drifts toward 50 and couples into morale and
 * standing at the extremes, then up to `wantPerSeason` new texts arrive.
 * Returns the freshly delivered messages so a sport that mirrors them
 * somewhere else (the flagship's Round 130 threads) can do that on top,
 * without this function needing to know that system exists.
 *
 * Round 796: `beats`, when given, is the season's calendar beats that
 * actually happened, and delivery goes through pickBeatTexts. Left out, this
 * is the Round 80 tick exactly.
 */
export function receiveInboxTexts<S extends InboxHost>(
  s: S, phase: "youth" | "pro", sport: InboxSport<S>, rng: () => number = Math.random,
  beats?: readonly string[],
): InboxMessage[] {
  driftInboxMood(s, sport);
  return deliverInboxTexts(s, phase, sport, rng, beats);
}

/** Rule 1: the mood meter's season drift and its coupling at the extremes. */
function driftInboxMood<S extends InboxHost>(s: S, sport: InboxSport<S>): void {
  const mood = sport.moodOf(s);
  const next = mood > 50 ? mood - 2 : mood < 50 ? Math.min(50, mood + 2) : mood;
  if (next >= 70) {
    sport.addPopularity(s, 2);
    s.morale = clamp(s.morale + 2, 0, 100);
  } else if (next <= 30) {
    sport.addPopularity(s, -2);
    s.morale = clamp(s.morale - 1, 0, 100);
  }
  sport.setMood(s, next);
}

/**
 * Rules 2 to 4: deliver up to `wantPerSeason` less whatever is unanswered,
 * each template once a career, then trim the oldest answered past the cap.
 * No mood drift, so a sport can also call it for a beat that is not a season
 * end (the NFL's draft night, before a down has been played).
 */
export function deliverInboxTexts<S extends InboxHost>(
  s: S, phase: "youth" | "pro", sport: InboxSport<S>, rng: () => number = Math.random,
  beats?: readonly string[],
): InboxMessage[] {
  const inbox = [...(s.phoneInbox ?? [])];
  const used = [...(s.phoneUsedIds ?? [])];
  const unanswered = inbox.filter(m => m.answered === undefined).length;
  const want = Math.max(0, sport.wantPerSeason - unanswered);
  const year = sport.yearOf(s);
  const age = sport.ageOf(s);
  const fresh: InboxMessage[] = [];
  const deliver = (def: InboxMessageDef, beat?: string) => {
    const msg: InboxMessage = { id: `${def.id}-${year}`, defId: def.id, from: def.from, emoji: def.emoji, text: def.text, year, choices: def.choices, ...(beat ? { beat } : {}) };
    inbox.push(msg);
    fresh.push(msg);
    used.push(def.id);
  };
  if (beats === undefined) {
    for (const def of pickInboxTexts(sport.pool, age, phase, used, want, rng)) {
      deliver(def);
    }
  } else {
    for (const pick of pickBeatTexts(sport.pool, sport.calendar ?? [], beats, age, phase, used, want, rng)) {
      deliver(pick.def, pick.beat);
    }
  }
  while (inbox.length > sport.maxInbox) {
    const idx = inbox.findIndex(m => m.answered !== undefined);
    if (idx === -1) break;
    inbox.splice(idx, 1);
  }
  s.phoneInbox = inbox;
  s.phoneUsedIds = used;
  return fresh;
}

/* ─── reading the inbox ──────────────────────────────────────────────────── */

/** Unanswered messages sitting on the save. A sport with a richer thread
 *  system on top of this (the flagship's Round 130 one) has its own count
 *  and does not need to call this. */
export function unreadInboxCount<S extends InboxHost>(s: S): number {
  return (s.phoneInbox ?? []).filter(m => m.answered === undefined).length;
}

/** Round 796: the "when" line for a text that arrived on a calendar beat
 *  ("⏰ Trade deadline, 2027"), or null for one that did not. */
export function inboxBeatLine(m: InboxMessage, calendar?: InboxBeat[]): string | null {
  const beat = m.beat ? calendar?.find(b => b.id === m.beat) : undefined;
  return beat ? `${beat.emoji} ${beat.label}, ${m.year}` : null;
}

/* ─── the answer flow ────────────────────────────────────────────────────── */

/**
 * Answer one message. Mutates the inbox in place and applies the choice's
 * mood, morale, standing and cash effects; returns the line for the events
 * feed, or null when the message does not exist, is already answered, or
 * the choice index is out of range.
 */
export function answerInboxMessage<S extends InboxHost>(
  s: S, msgId: string, choiceIdx: number, sport: InboxSport<S>,
): string | null {
  const inbox = [...(s.phoneInbox ?? [])];
  const i = inbox.findIndex(m => m.id === msgId);
  if (i === -1) return null;
  const msg = inbox[i];
  if (msg.answered !== undefined) return null;
  const choice = msg.choices[choiceIdx];
  if (!choice) return null;
  inbox[i] = { ...msg, answered: choiceIdx };
  s.phoneInbox = inbox;
  sport.setMood(s, clamp(sport.moodOf(s) + choice.karma, 0, 100));
  if (choice.morale) s.morale = clamp(s.morale + choice.morale, 0, 100);
  if (choice.popularity) sport.addPopularity(s, choice.popularity);
  if (choice.cash) sport.addCash(s, choice.cash);
  const swing = choice.karma >= 5 ? " Karma up." : choice.karma <= -5 ? " Karma down." : "";
  return `📱 Replied to ${msg.from}: ${choice.label}.${swing}`;
}
