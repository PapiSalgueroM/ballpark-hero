import { oppRosterFor, oppStrengthVsMe, runShootout, shootoutOrderOf, shootoutRosterSide, shootoutSides, shootoutTakerOrder, type CareerState } from '@/lib/clubManager';
import { rehearsalFixture } from '@/lib/clubManagerRehearsal';
import { keyedRng } from '@/lib/keyedRng';

export const PENALTY_ROOM_KEY = 'dukb-cm-penalty-room-v1';

export function penaltyFixture(career: CareerState) {
  const fixture = rehearsalFixture(career);
  if (!fixture) return null;
  const { xi, fx } = fixture;
  const strength = oppStrengthVsMe(career, fx.opponent);
  const opponents = shootoutRosterSide(oppRosterFor(career, fx.opponent), strength);
  const { mine, theirs } = shootoutSides(career, [], xi, opponents, strength);
  const keeper = xi.find(({ slot, p }) => slot ? slot.allowed.includes('GK') : p.position === 'GK')?.p.id ?? null;
  const players = xi.map(({ p }) => ({ id: p.id, name: p.name, rating: p.rating, position: p.position }));
  const ids = players.map(p => p.id);
  const defaultOrder = shootoutOrderOf(career) ?? [
    ...(career.setPieces?.penalties ? [career.setPieces.penalties] : []),
    ...players.filter(p => p.id !== keeper).sort((a, b) => b.rating - a.rating).map(p => p.id),
  ];
  return {
    id: JSON.stringify([fixture.id, theirs]), opponent: fx.opponent, players, ids, keeper,
    keeperRating: mine.keeperRating, theirs, baseline: shootoutTakerOrder(defaultOrder, ids, keeper),
  };
}

export type PenaltyFixture = NonNullable<ReturnType<typeof penaltyFixture>>;
export interface PenaltyRun {
  fixture: string;
  draw: number;
  baseline: string[];
  late: boolean;
  picks: string[];
}

export function beginPenalties(fixture: PenaltyFixture, draw: number, late: boolean): PenaltyRun {
  return { fixture: fixture.id, draw, baseline: [...fixture.baseline], late, picks: late ? fixture.baseline.slice(0, 2) : [] };
}

export function penaltyScore(fixture: PenaltyFixture, run: PenaltyRun, baseline = false) {
  const order = baseline ? run.baseline : shootoutTakerOrder(run.picks, fixture.ids, fixture.keeper);
  const random = keyedRng('cm-penalty-room/' + run.draw);
  const detail = runShootout({
    mine: { keeperRating: fixture.keeperRating, takers: order.map(id => fixture.players.find(p => p.id === id)!) },
    theirs: fixture.theirs, myFirst: random() < 0.5,
  }, random);
  // The engine projects a full shootout. Reveal only kicks that preceded the next uncalled taker.
  let called = 0;
  const next = baseline || run.picks.length === fixture.ids.length ? -1
    : detail.kicks.findIndex(k => k.side === 'me' && called++ === run.picks.length);
  const kicks = next === -1 ? detail.kicks : detail.kicks.slice(0, next);
  const last = kicks.at(-1);
  return { kicks, done: next === -1, mine: next === -1 ? detail.mine : last?.mine ?? 0, theirs: next === -1 ? detail.theirs : last?.theirs ?? 0 };
}

export function readPenaltyRun(raw: string | null, fixture: PenaltyFixture): PenaltyRun | null {
  if (!raw) return null;
  try {
    const r = JSON.parse(raw);
    const validIds = (ids: unknown) => Array.isArray(ids) && ids.length <= fixture.ids.length &&
      ids.every(id => fixture.ids.includes(id)) && new Set(ids).size === ids.length;
    if (!r || r.fixture !== fixture.id || !Number.isSafeInteger(r.draw) || r.draw < 0 || r.draw > 0xffffffff ||
        typeof r.late !== 'boolean' || !validIds(r.baseline) || r.baseline.length !== fixture.ids.length || !validIds(r.picks) ||
        (r.late && (r.picks[0] !== r.baseline[0] || r.picks[1] !== r.baseline[1]))) return null;
    if (r.picks.length && penaltyScore(fixture, { ...r, picks: r.picks.slice(0, -1) }).done) return null;
    return { fixture: r.fixture, draw: r.draw, baseline: r.baseline, late: r.late, picks: r.picks };
  } catch { return null; }
}
