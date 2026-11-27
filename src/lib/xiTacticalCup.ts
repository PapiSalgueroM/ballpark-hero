import { keyedRng } from '@/lib/keyedRng';
import { gradeFit } from '@/lib/positionFit';
import type { FilledSlot, Formation, PositionRole } from '@/types/lineupBuilder';

export const CUP_KEY = 'dukb-xi-tactical-cup-v1';
export const routes = {
  wide: { label: 'Use the wings', roles: ['LM', 'RM', 'LW', 'RW', 'LWB', 'RWB'], minimum: 2 },
  central: { label: 'Work through midfield', roles: ['CM', 'CDM', 'CAM'], minimum: 3 },
  direct: { label: 'Go direct', roles: ['ST', 'CF'], minimum: 2 },
} satisfies Record<string, { label: string; roles: PositionRole[]; minimum: number }>;
export type CupRoute = keyof typeof routes;
export const adjustments = {
  runner: 'Send another runner',
  steady: 'Keep the shape',
  cover: 'Protect the middle',
};
export type Adjustment = keyof typeof adjustments;

const opponents = [
  { name: 'High Press', loose: 'direct', guarded: 'central', scout: 'They crowd the midfield. Hit the forwards early to get behind the press.' },
  { name: 'Narrow Block', loose: 'wide', guarded: 'direct', scout: 'They sit close together in the box. Stretch them wide before delivering the ball.' },
  { name: 'Overlapping Backs', loose: 'central', guarded: 'wide', scout: 'Their fullbacks hunt in pairs. Work through the middle to leave them outside the play.' },
] as const;

export function cupSquadId(formation: Formation, slots: FilledSlot[]) {
  return JSON.stringify([formation, slots.map(s => [s.role, s.playerName, s.assignedTeam, s.isNation,
    s.pick?.recordId, s.pick?.year, s.pick?.club, s.pick?.position, [...s.pick?.played ?? []].sort()])]);
}

export function routeSupport(slots: FilledSlot[], route: CupRoute) {
  const plan = routes[route];
  const roles: readonly PositionRole[] = plan.roles;
  const assigned = slots.filter(slot => roles.includes(slot.role));
  const natural = assigned.filter(slot => slot.pick?.position
    && gradeFit([slot.pick.position, ...slot.pick.played ?? []], [slot.role]) === 'natural');
  return { assigned, natural, shapeBonus: Number(assigned.length >= plan.minimum), fitBonus: Number(natural.length >= 2) };
}

export function wideDuty(slots: FilledSlot[], tuckIn: boolean) {
  const left = slots.find(slot => ['LM', 'LW', 'LWB'].includes(slot.role));
  return { left, slots: left && tuckIn ? slots.map(slot => slot === left ? { ...slot, role: 'CM' as const } : slot) : slots };
}

export interface CupMatch { route: CupRoute; tuckIn?: true; adjustment?: Adjustment }
export interface TacticalCup { version: 1; squad: string; seed: number; matches: CupMatch[]; tuckIn?: true }

export function startCup(squad: string, seed: number): TacticalCup {
  return { version: 1, squad, seed, matches: [] };
}

export function readCup(raw: string | null, squad: string): TacticalCup | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (value?.version !== 1 || value.squad !== squad || !Number.isSafeInteger(value.seed)
      || value.seed < 0 || value.seed > 0xffffffff || !Array.isArray(value.matches) || value.matches.length > 3) return null;
    const matches: CupMatch[] = [];
    for (const [i, match] of value.matches.entries()) {
      if (!match || (match.tuckIn !== undefined && match.tuckIn !== true) || !Object.keys(routes).includes(match.route)
        || (match.adjustment === undefined ? i !== value.matches.length - 1 : !Object.keys(adjustments).includes(match.adjustment))) return null;
      matches.push({ route: match.route, ...(match.tuckIn && { tuckIn: true }), adjustment: match.adjustment });
    }
    if (value.tuckIn !== undefined && (value.tuckIn !== true || matches.length === 3 || matches.some(match => !match.adjustment))) return null;
    return { ...startCup(squad, value.seed), matches, ...(value.tuckIn && { tuckIn: true }) };
  } catch {
    return null;
  }
}

export function cupOpponents(seed: number) {
  const order = [...opponents];
  const rng = keyedRng('xi-cup-order/' + seed);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function callRoute(cup: TacticalCup, route: CupRoute): TacticalCup {
  if (cup.matches.length === 3 || cup.matches.some(match => !match.adjustment)) return cup;
  return { ...startCup(cup.squad, cup.seed), matches: [...cup.matches, { route, ...(cup.tuckIn && { tuckIn: true }) }] };
}

export function coachHalf(cup: TacticalCup, adjustment: Adjustment): TacticalCup {
  const last = cup.matches[cup.matches.length - 1];
  if (!last || last.adjustment) return cup;
  return { ...cup, matches: [...cup.matches.slice(0, -1), { ...last, adjustment }] };
}

export function cupMatchReport(cup: TacticalCup, index: number, slots: FilledSlot[]) {
  const { route, adjustment, tuckIn } = cup.matches[index];
  const opponent = cupOpponents(cup.seed)[index];
  const duty = wideDuty(slots, !!tuckIn);
  const support = routeSupport(duty.slots, route);
  const matchup = route === opponent.loose ? 2 : route === opponent.guarded ? -1 : 0;
  const created = 2 + support.shapeBonus + support.fitBonus + matchup;
  const conceded = 3 + Number(route === opponent.guarded) + Number(!!tuckIn && opponent.name === 'Overlapping Backs');
  function half(period: number, own: number, against: number) {
    function finish(side: string, chances: number) {
      const rng = keyedRng('xi-cup/' + [cup.seed, index, period, side].join('/'));
      return Array.from({ length: chances }, () => rng()).filter(roll => roll < 0.28).length;
    }
    return { own, against, gf: finish('for', own), ga: finish('against', against) };
  }
  const first = half(1, created, conceded);
  const oppositionPush = Math.sign(first.gf - first.ga);
  const risk = adjustment === 'runner' ? 2 : adjustment === 'cover' ? -2 : 0;
  const second = adjustment ? half(2, Math.max(1, created + risk + oppositionPush), Math.max(1, conceded + risk + oppositionPush)) : null;
  const gf = first.gf + (second?.gf ?? 0);
  const ga = first.ga + (second?.ga ?? 0);
  return { opponent, support, matchup, tucked: tuckIn ? duty.left?.playerName : undefined, first, second, gf, ga, points: second ? (gf > ga ? 3 : gf === ga ? 1 : 0) : 0 };
}
