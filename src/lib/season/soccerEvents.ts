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
   none of his events comes after he went off. Imports only from ./core. */
import { shuffled, type DerivedGame, type DerivedSeason, type FixedGame, type GameContext, type Rng, type SeasonEvent } from './core';

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

/** Every way the soccer events of a derived season disagree with its scores and his line. */
export function soccerEventDisagreements(s: DerivedSeason, fixed: readonly FixedGame[]): string[] {
  const out: string[] = [];
  for (const g of s.games) {
    const goals = g.events.filter(e => e.kind === 'goal');
    if (goals.filter(e => e.side === 'us').length !== g.us || goals.filter(e => e.side === 'them').length !== g.them) out.push(`md ${g.md}: events do not add up to the score`);
    if (!g.played) continue;
    if (goals.filter(e => e.mine).length !== (g.line.goals ?? 0)) out.push(`md ${g.md}: his goal events`);
    if (g.events.filter(e => e.kind === 'assist').length !== (g.line.assists ?? 0)) out.push(`md ${g.md}: his assist events`);
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
