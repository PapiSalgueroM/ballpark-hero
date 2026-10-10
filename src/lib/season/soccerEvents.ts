/* Round 1045 review: soccer's match events, out of the sport neutral core.

   The core (src/lib/season/core.ts) derives every score and his line, then
   hands each game to the sport's `events` hook for its timed events. This
   is soccer's: every goal at a minute from 1 to 90 (one event a goal, each
   worth one on the board), his goals and assists among his club's goals
   while he was on the pitch, a decisive derby goal at its saved place in
   the order, coming on, a card, going off injured or sent off. A card is
   always shown before he goes off (the review found a yellow timed after
   the injury that ended his game). It draws only from the rng it is given.

   `soccerEventDisagreements` is the matching self check, run by the soccer
   binding's `check`: the goal events make the score, his goal and assist
   events make his line, the decisive goal sits where the save says, and
   none of his events comes after he went off. Imports only from ./core and ../ownGoalRule
   (Round 1146: the keyed own goal rolls, shared with Club Manager). */
import { shuffled, type DerivedGame, type DerivedSeason, type FixedGame, type GameContext, type Moment, type MomentDelta, type MomentSpot, type Rng, type SeasonEvent } from './core';
import { ownGoalRole, ownGoalTagged } from '../ownGoalRule';

/** Minutes in a soccer match (the clock's full time). */
export const SOCCER_FULL_TIME = 90;

const RANK: Record<string, number> = { on: 0, goal: 1, assist: 2, yellow: 3, red: 4, injury: 4, off: 5 };

export function soccerEvents(g: DerivedGame, f: FixedGame | null, game: GameContext, rng: Rng): void {
  const mins = (n: number) => Array.from({ length: n }, () => 1 + Math.floor(rng() * SOCCER_FULL_TIME)).sort((x, y) => x - y);
  const ourMins = mins(g.us);
  const theirMins = mins(g.them);
  const his = g.line.goals ?? 0;
  const ast = g.line.assists ?? 0;
  let onAt = 1;
  if (g.played && rng() < game.subChance) onAt = 46 + Math.floor(rng() * 40);
  const order = Array.from({ length: g.us }, (_, i) => i);
  const must = f && f.decisive ? f.them : -1;
  const avoid = f && !f.decisive && f.us > f.them ? f.them : -1;
  const fits = (start: number) => order.filter(i => ourMins[i] >= start && i !== avoid);
  const after = (start: number) => order.filter(i => ourMins[i] >= start).length;
  if (fits(onAt).length < his || after(onAt) < his + ast || (must >= 0 && ourMins[must] < onAt)) onAt = 1;
  const pool = shuffled(fits(onAt).filter(i => i !== must), rng);
  const mineIdx = new Set<number>(must >= 0 && his > 0 ? [must, ...pool.slice(0, his - 1)] : pool.slice(0, his));
  const rest = shuffled(order.filter(i => ourMins[i] >= onAt && !mineIdx.has(i)), rng);
  const astIdx = new Set<number>(rest.slice(0, ast));
  const ev: SeasonEvent[] = [];
  ourMins.forEach((m, i) => {
    ev.push({ min: m, kind: 'goal', side: 'us', pts: 1, ...(mineIdx.has(i) ? { mine: true } : {}) });
    if (astIdx.has(i)) ev.push({ min: m, kind: 'assist', side: 'us', mine: true });
  });
  for (const m of theirMins) ev.push({ min: m, kind: 'goal', side: 'them', pts: 1 });
  if (g.played) {
    const lastMine = Math.max(onAt, ...ev.filter(e => e.mine).map(e => e.min));
    if (onAt > 1) { g.started = false; g.onAt = onAt; ev.push({ min: onAt, kind: 'on', side: 'us', mine: true }); } else g.started = true;
    const red = (g.line.red ?? 0) > 0;
    let offAt = SOCCER_FULL_TIME + 1;
    if (red || game.injured) {
      offAt = Math.min(SOCCER_FULL_TIME, Math.max(lastMine + 1, 15 + Math.floor(rng() * 76)));
      g.offAt = offAt;
      ev.push({ min: offAt, kind: red ? 'red' : 'injury', side: 'us', mine: true });
    }
    /* the card comes before he goes off: from his last event up to the minute he left */
    if ((g.line.yellow ?? 0) > 0) ev.push({ min: Math.min(SOCCER_FULL_TIME, lastMine + Math.floor(rng() * Math.max(1, offAt - lastMine))), kind: 'yellow', side: 'us', mine: true });
  }
  g.events = ev.sort((x, y) => x.min - y.min || (RANK[x.kind] ?? 5) - (RANK[y.kind] ?? 5));
}

/** What soccerOwnGoals answered for a game object, and under which season and protection. */
const OWN_GOALS_KEPT = new WeakMap<DerivedGame, { guard: string; game: DerivedGame }>();

/** Fictional own-goal roles on existing, uncredited goals. The 1/64 tag and
 *  one-of-11 active-player role are provisional game odds, not real data.
 *  Planned moments and their return matches stay outside this pass. */
export function soccerOwnGoals(s: DerivedSeason, moments: readonly Pick<Moment, 'md' | 'minute' | 'mirrorMd'>[]): DerivedSeason {
  const minutes = new Set(moments.map(m => `${m.md}|${m.minute}`));
  const mirrors = new Set(moments.flatMap(m => m.mirrorMd === null ? [] : [m.mirrorMd]));
  const tagged = (g: DerivedGame): DerivedGame => {
    const assists = new Set(g.events.filter(e => e.kind === 'assist' && e.mine).map(e => e.min));
    const ordinals = new Map<string, number>();
    const win = pitchWindow(g);
    return { ...g, events: g.events.map((e): SeasonEvent => {
      if (e.kind !== 'goal') return e;
      const group = `${e.min}|${e.side}`;
      const ordinal = ordinals.get(group) ?? 0;
      ordinals.set(group, ordinal + 1);
      if (e.pts !== 1 || e.mine || mirrors.has(g.md) || minutes.has(`${g.md}|${e.min}`) || (e.side === 'us' && assists.has(e.min))) return e;
      const key = `${s.key}|og|${g.md}|${e.min}|${e.side}|${ordinal}`;
      /* Round 1146: the two keyed rolls are the shared rule's (src/lib/ownGoalRule.ts), the same keys and odds as before. */
      if (!ownGoalTagged(key)) return e;
      const role = ownGoalRole(key, 11);
      const ownGoalBy = e.side === 'us' ? 'opponent' : win && e.min >= win[0] && e.min <= win[1] && role === 0 ? 'you' : 'teammate';
      return { ...e, ownGoalBy };
    }) };
  };
  /* Release AP: a game the pass has already answered comes back as the same object, and a game with
     nothing tagged is handed back as it came. The core keeps the games a decision did not touch
     (withGames), and the little pitch reads a new events array as "a moment changed this match" and
     drops the goal it was playing, so this pass must not hand every game a new array each time the
     season is decided again. The answer is kept per game object, under everything else it depends
     on: the season's key and what the moments protect in that game. */
  return { ...s, games: s.games.map(g => {
    const guard = `${s.key}|${mirrors.has(g.md) ? 'return' : 'own'}|${moments.filter(m => m.md === g.md).map(m => m.minute).join(',')}`;
    const kept = OWN_GOALS_KEPT.get(g);
    if (kept && kept.guard === guard) return kept.game;
    const game = tagged(g);
    const out = game.events.some((e, i) => e !== g.events[i]) ? game : g;
    OWN_GOALS_KEPT.set(g, { guard, game: out });
    return out;
  }) };
}

/** Every way the soccer events of a derived season disagree with its scores and his line. */
export function soccerEventDisagreements(s: DerivedSeason, fixed: readonly FixedGame[]): string[] {
  const out: string[] = [];
  for (const g of s.games) {
    const goals = g.events.filter(e => e.kind === 'goal');
    if (goals.filter(e => e.side === 'us').length !== g.us || goals.filter(e => e.side === 'them').length !== g.them) out.push(`md ${g.md}: events do not add up to the score`);
    if (!g.played) continue;
    if (goals.filter(e => e.mine).length !== (g.line.goals ?? 0)) out.push(`md ${g.md}: his goal events`);
    if (g.events.filter(e => e.kind === 'assist').length !== (g.line.assists ?? 0)) out.push(`md ${g.md}: his assist events`);
    for (const card of ['yellow', 'red']) {
      if (g.events.filter(e => e.kind === card && e.mine).length !== (g.line[card] ?? 0)) out.push(`md ${g.md}: his ${card} card events`);
    }
    if (g.offAt && g.events.some(e => e.mine && e.min > g.offAt!)) out.push(`md ${g.md}: an event of his after he went off`);
  }
  const keys = [...new Set(fixed.map(f => f.key))];
  for (const k of keys) {
    const want = fixed.filter(f => f.key === k);
    const got = s.games.filter(g => g.fixedKey === k);
    want.forEach((f, i) => {
      const g = got[i];
      if (!g || !f.played || f.us <= f.them) return;
      const ours = g.events.filter(e => e.kind === 'goal' && e.side === 'us');
      if (!!ours[f.them]?.mine !== !!f.decisive) out.push(`fixed ${k} #${i + 1} decisive goal`);
    });
  }
  return out;
}

/* ─── Round 1047: soccer's moments ───

   Where a soccer game has a moment and how it takes the other outcome. The
   core (planMoments, otherOutcome) decides which are offered and proves the
   season still agrees with the save; this file only knows soccer: a finish
   is his goal or a chance, a pass is his assist or a chance he made, a save
   or a tackle is a goal against or a stop while he was on the pitch. Every
   rewrite keeps the events adding up to the score and his line, and keeps
   his events inside the minutes he played. */

export type SoccerMomentKind = 'finish' | 'pass' | 'save' | 'tackle';
/** Most goals a side holds after a rewrite (the core's own cap). */
const SCORE_CAP = 7;
const HIS_GOALS_CAP = 4;
const HIS_ASSISTS_CAP = 3;

/** The minutes he was on the pitch, or null when he never was. */
function pitchWindow(g: DerivedGame): [number, number] | null {
  if (!g.played) return null;
  const from = g.onAt ?? 1;
  const to = g.offAt ? g.offAt - 1 : SOCCER_FULL_TIME;
  return to >= from ? [from, to] : null;
}

/** A minute in [from, to] that holds no event yet, or null. */
function freeMinute(g: DerivedGame, from: number, to: number, rng: Rng): number | null {
  const taken = new Set(g.events.map(e => e.min));
  for (let n = 0; n < 12; n += 1) {
    const m = from + Math.floor(rng() * (to - from + 1));
    if (!taken.has(m)) return m;
  }
  for (let m = to; m >= from; m -= 1) if (!taken.has(m)) return m;
  return null;
}

/** 0 for a dead rubber to 1 for a late one in a close derby. */
export function soccerStakes(g: DerivedGame, minute: number): number {
  const close = Math.abs(g.us - g.them) <= 1 ? 0.4 : 0;
  const late = minute >= 75 ? 0.3 : minute >= 60 ? 0.15 : 0;
  return Math.min(1, close + late + (g.fixedKey ? 0.3 : 0));
}

/** Every spot of one game: his goals and assists as they stand, one chance
 *  in his own trade (`primary`), and for a keeper or a defender one stop made
 *  and one goal against. */
export function soccerMomentSpots(g: DerivedGame, primary: SoccerMomentKind, keepsSheets: boolean, rng: Rng): MomentSpot[] {
  const win = pitchWindow(g);
  if (!win) return [];
  const [from, to] = win;
  const out: MomentSpot[] = [];
  const add = (minute: number, kind: SoccerMomentKind, planSuccess: boolean, delta: MomentDelta, onRecord = planSuccess) => {
    const noise = rng() * 0.5;
    if (out.some(s => s.minute === minute && s.kind === kind && s.planSuccess === planSuccess)) return;
    const stakes = soccerStakes(g, minute);
    out.push({ md: g.md, minute, kind, planSuccess, onRecord, delta, stakes, weight: (planSuccess ? 2 : 1.2) + stakes * 3 + noise });
  };
  const keeper = primary === 'save';
  if (!keeper) {
    for (const e of g.events) {
      if (e.kind === 'goal' && e.mine) add(e.min, 'finish', true, { us: -1, them: 0, line: { goals: -1 } });
      if (e.kind === 'assist') add(e.min, 'pass', true, { us: -1, them: 0, line: { assists: -1 } });
    }
  }
  if (primary === 'finish' || primary === 'pass') {
    const m = freeMinute(g, from, to, rng);
    const room = g.us < SCORE_CAP && (primary === 'finish' ? (g.line.goals ?? 0) < HIS_GOALS_CAP : (g.line.assists ?? 0) < HIS_ASSISTS_CAP);
    if (m !== null && room) add(m, primary, false, { us: 1, them: 0, line: primary === 'finish' ? { goals: 1 } : { assists: 1 } });
  } else {
    const m = freeMinute(g, from, to, rng);
    /* a stop is on the record only where the game was a shutout */
    if (m !== null && g.them < SCORE_CAP) add(m, primary, true, { us: 0, them: 1, line: keepsSheets && g.them === 0 ? { cs: -1 } : {} }, g.them === 0);
    const against = g.events.filter(e => e.kind === 'goal' && e.side === 'them' && e.min >= from && e.min <= to);
    if (against.length > 0) {
      const e = against[Math.floor(rng() * against.length)];
      add(e.min, primary, false, { us: 0, them: -1, line: keepsSheets && g.them === 1 ? { cs: 1 } : {} });
    }
  }
  return out;
}

const sortEvents = (ev: SeasonEvent[]) => ev.sort((x, y) => x.min - y.min || (RANK[x.kind] ?? 5) - (RANK[y.kind] ?? 5));

/** One soccer game with `delta` played, or null when it cannot take it. The
 *  shapes it knows: his goal added or taken away, his assist (with the goal
 *  it made) added or taken away, a goal against added or taken away. At the
 *  moment's own game `minute` names the event; at the return game it is null
 *  and a keyed pick is made. `g` is never changed. */
export function soccerApplyDelta(g: DerivedGame, delta: MomentDelta, minute: number | null, keepsSheets: boolean, rng: Rng): DerivedGame | null {
  const us = g.us + delta.us;
  const them = g.them + delta.them;
  if (us < 0 || them < 0 || us > SCORE_CAP || them > SCORE_CAP) return null;
  const dGoals = delta.line.goals ?? 0;
  const dAst = delta.line.assists ?? 0;
  const dCs = delta.line.cs ?? 0;
  if (Object.entries(delta.line).some(([k, v]) => v !== 0 && k !== 'goals' && k !== 'assists' && k !== 'cs')) return null;
  const win = pitchWindow(g);
  if ((dGoals !== 0 || dAst !== 0 || dCs !== 0) && !win) return null;
  const ev = g.events.slice();
  const line = { ...g.line };
  const pick = <T>(xs: T[]): T | null => (xs.length ? xs[Math.floor(rng() * xs.length)] : null);
  const drop = (e: SeasonEvent) => { ev.splice(ev.indexOf(e), 1); };
  const fresh = (): number | null => {
    if (minute !== null) return minute;
    return win ? freeMinute(g, win[0], win[1], rng) : freeMinute(g, 1, SOCCER_FULL_TIME, rng);
  };
  const at = (e: SeasonEvent) => minute === null || e.min === minute;
  if (delta.them === 0 && delta.us === 1 && dGoals === 1 && dAst === 0) {
    if ((line.goals ?? 0) + 1 > HIS_GOALS_CAP) return null;
    const m = fresh();
    if (m === null) return null;
    ev.push({ min: m, kind: 'goal', side: 'us', pts: 1, mine: true });
    line.goals = (line.goals ?? 0) + 1;
  } else if (delta.them === 0 && delta.us === -1 && dGoals === -1 && dAst === 0) {
    const e = pick(ev.filter(x => x.kind === 'goal' && x.mine && at(x)));
    if (!e || (line.goals ?? 0) < 1) return null;
    drop(e);
    line.goals = (line.goals ?? 0) - 1;
  } else if (delta.them === 0 && delta.us === 1 && dAst === 1 && dGoals === 0) {
    if ((line.assists ?? 0) + 1 > HIS_ASSISTS_CAP) return null;
    const m = fresh();
    if (m === null) return null;
    ev.push({ min: m, kind: 'goal', side: 'us', pts: 1 }, { min: m, kind: 'assist', side: 'us', mine: true });
    line.assists = (line.assists ?? 0) + 1;
  } else if (delta.them === 0 && delta.us === -1 && dAst === -1 && dGoals === 0) {
    const a = pick(ev.filter(x => x.kind === 'assist' && at(x)));
    const goal = a ? ev.find(x => x.kind === 'goal' && x.side === 'us' && !x.mine && x.min === a.min) : null;
    if (!a || !goal || (line.assists ?? 0) < 1) return null;
    drop(a); drop(goal);
    line.assists = (line.assists ?? 0) - 1;
  } else if (delta.us === 0 && delta.them === 1 && dGoals === 0 && dAst === 0) {
    const m = fresh();
    if (m === null) return null;
    ev.push({ min: m, kind: 'goal', side: 'them', pts: 1 });
  } else if (delta.us === 0 && delta.them === -1 && dGoals === 0 && dAst === 0) {
    const e = pick(ev.filter(x => x.kind === 'goal' && x.side === 'them' && at(x) && (!win || (x.min >= win[0] && x.min <= win[1]))));
    if (!e) return null;
    drop(e);
  } else return null;
  /* a clean sheet is the score's, never the delta's word for it */
  if (keepsSheets && g.played) {
    const cs = them === 0 ? 1 : 0;
    if (cs - (g.line.cs ?? 0) !== dCs) return null;
    line.cs = cs;
  } else if (dCs !== 0) return null;
  if ((line.goals ?? 0) + (line.assists ?? 0) > us) return null;
  const out: DerivedGame = { ...g, us, them, line, events: sortEvents(ev) };
  if (g.mark) out.mark = them === 0 ? 'shutout' : 'concede';
  return out;
}
