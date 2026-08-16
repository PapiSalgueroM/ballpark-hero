/* ─── Round 134: DoUKnowBall, inside DoUKnowBall ─────────────────────────────

   He asked for it by name: "And if u can play DoUKnowBall inside DoUKnowBall."

   So your player has the site on his phone, the same as everybody else, and
   between seasons he sits on the bus and plays three questions of it. The
   questions are not written by hand and they are not about real football
   trivia somebody typed in. They are generated from the save: what YOU did
   last season, and what the world model on this same phone says happened
   around you. Two consequences, both deliberate.

   One, it can never be wrong. Every answer is read straight off the same state
   the season summary and the sports feed read, so the quiz cannot claim a
   striker won a league he did not win, which is the rule the phone's feed has
   lived by since Round 130.

   Two, it costs nothing to store. There is no question bank in the save and no
   question bank in the bundle. Three questions are built the moment you open
   the app and thrown away when you close it. The only thing that persists is
   which season you last played and your best score, which is two numbers in
   MoneyState.

   The prize is pocket money and one point of morale, in soccerMoney.ts, and
   it is once a season, because the point of this is that it is a nice thing
   your player does on his phone, not a way to make a living.
*/

import type { CareerState, SeasonRecord } from "./soccerCareerEngine";
import { ensureMoney } from "./soccerMoney";
import type { WorldSeason } from "./soccerPhone";
import { phoneWorld } from "./soccerPhone";

export interface ArcadeQuestion {
  /** What is being asked. */
  q: string;
  /** Four options, already shuffled. */
  options: string[];
  /** Index into options. */
  answer: number;
  /** Where the answer came from, shown after the tap. */
  source: string;
}

/* Own rng again, for the same reason everything else in this round has one:
   opening a quiz must not shift the world sim's Math.random stream. */
function nextSeed(s: number): number { return (s * 1664525 + 1013904223) >>> 0; }
class Rng {
  constructor(private s: number) { this.s = s >>> 0 || 1; }
  next(): number { this.s = nextSeed(this.s); return this.s / 4294967296; }
  int(lo: number, hi: number): number { return lo + Math.floor(this.next() * (hi - lo + 1)); }
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Build a question from a correct answer and three wrong ones. */
function build(q: string, right: string, wrong: string[], source: string, rng: Rng): ArcadeQuestion | null {
  const pool = wrong.filter(w => w && w !== right);
  const uniq = Array.from(new Set(pool));
  if (uniq.length < 3) return null;
  const options = shuffle([right, ...uniq.slice(0, 3)], rng);
  return { q, options, answer: options.indexOf(right), source };
}

/** Numbers near a true number, for a "how many" question. */
function nearNumbers(n: number, rng: Rng): string[] {
  const out = new Set<string>();
  let guard = 0;
  while (out.size < 6 && guard < 40) {
    guard += 1;
    const spread = Math.max(2, Math.round(n * 0.35));
    const v = n + rng.int(-spread, spread);
    if (v < 0 || v === n) continue;
    out.add(String(v));
  }
  return [...out];
}

/**
 * Three questions about this save, or fewer if the career is too young to have
 * anything to ask about. The panel shows whatever comes back and does not
 * offer the app at all when the list is empty.
 */
export function arcadeQuestions(s: CareerState): ArcadeQuestion[] {
  const m = ensureMoney(s);
  const world = phoneWorld(s);
  /* Seeded off the money state and the season, so reopening the app in the
     same season shows the same three questions rather than rerolling until
     you get an easy one. */
  const year = s.seasons.length ? s.seasons[s.seasons.length - 1].year : 2020;
  const rng = new Rng((m.seed ^ (year * 2654435761)) >>> 0 || 3);
  const played = s.seasons.filter(x => x.type !== "youth");
  const candidates: ArcadeQuestion[] = [];

  const last: SeasonRecord | undefined = played[played.length - 1];
  if (last) {
    if (last.apps > 0 && s.position !== "GK") {
      const q = build(
        `How many goals did you score in ${last.year}?`,
        String(last.goals), nearNumbers(last.goals, rng),
        `You got ${last.goals} in ${last.apps} games for ${last.club}.`, rng,
      );
      if (q) candidates.push(q);
    }
    if (last.apps > 0) {
      const q = build(
        `How many games did you play in ${last.year}?`,
        String(last.apps), nearNumbers(last.apps, rng),
        `${last.apps} appearances for ${last.club}.`, rng,
      );
      if (q) candidates.push(q);
    }
    if (last.assists > 0) {
      const q = build(
        `How many assists did you get in ${last.year}?`,
        String(last.assists), nearNumbers(last.assists, rng),
        `${last.assists} of them, in a ${last.rating.toFixed(2)} rated season.`, rng,
      );
      if (q) candidates.push(q);
    }
  }

  if (played.length >= 3) {
    const best = played.slice().sort((a, b) => b.goals - a.goals)[0];
    const q = build(
      "Which season was your best in front of goal?",
      String(best.year), played.filter(x => x.year !== best.year).map(x => String(x.year)),
      `${best.goals} goals in ${best.year}.`, rng,
    );
    if (q) candidates.push(q);
  }

  if (played.length >= 2) {
    const first = played[0];
    const q = build(
      "Which club gave you your first professional season?",
      first.club, played.map(x => x.club).concat(s.currentClub),
      `${first.club}, back in ${first.year}.`, rng,
    );
    if (q) candidates.push(q);
  }

  const w: WorldSeason | null = world;
  if (w) {
    const leagueNames = Object.keys(w.leagues);
    if (w.ucl) {
      const others = Object.values(w.leagues).concat(leagueNames.length ? [] : []);
      const q = build(
        `Who were champions of Europe in ${w.year}?`,
        w.ucl, others.filter(c => c !== w.ucl),
        `${w.ucl} won it that season.`, rng,
      );
      if (q) candidates.push(q);
    }
    if (leagueNames.length >= 2) {
      const lg = leagueNames[rng.int(0, leagueNames.length - 1)];
      const champ = w.leagues[lg];
      const q = build(
        `Who won ${lg} in ${w.year}?`,
        champ, Object.values(w.leagues).filter(c => c !== champ).concat([w.ucl]),
        `${champ} took it.`, rng,
      );
      if (q) candidates.push(q);
    }
    if (w.moves.length >= 1) {
      const mv = w.moves[rng.int(0, w.moves.length - 1)];
      const q = build(
        `Where did ${mv.who} move to in ${w.year}?`,
        mv.to, w.moves.map(x => x.from).concat(w.moves.map(x => x.to)).concat([w.ucl]),
        `He left ${mv.from} for about ${mv.fee}m.`, rng,
      );
      if (q) candidates.push(q);
    }
    if (w.topScorer) {
      const ts = w.topScorer;
      const q = build(
        `How many did ${ts.who} finish on in ${w.year}?`,
        String(ts.goals), nearNumbers(ts.goals, rng),
        `${ts.goals} for ${ts.club}.`, rng,
      );
      if (q) candidates.push(q);
    }
  }

  return shuffle(candidates, rng).slice(0, 3);
}

/** Whether the app has anything to offer this season. */
export function arcadeReady(s: CareerState): boolean {
  const m = ensureMoney(s);
  const year = s.seasons.length ? s.seasons[s.seasons.length - 1].year : 2020;
  return m.aYear !== year && arcadeQuestions(s).length === 3;
}
