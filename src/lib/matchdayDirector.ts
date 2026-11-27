export const campaigns = {
  community: { name: 'Community season', target: 680, reserve: 250, crowds: [82, 96, 108, 118, 134, 152] },
  cup: { name: 'Cup run', target: 510, reserve: 1700, crowds: [70, 84, 105, 123, 146, 174] },
} as const;
export type Campaign = keyof typeof campaigns;
export const ticketPrices = { community: 2, standard: 3, premium: 5 } as const;
export const projects = {
  hold: { label: 'Keep the cash', cost: 0 },
  gate: { label: 'Build a turnstile', cost: 220 },
  kiosk: { label: 'Fit a food counter', cost: 160 },
} as const;
export type Shift = { price: keyof typeof ticketPrices; gates: number; project: keyof typeof projects };
export type Season = { campaign: Campaign; shifts: Shift[] };
export const openingShift: Shift = { price: 'standard', gates: 2, project: 'hold' };
export const openingGround = { cash: 300, admitted: 0, following: 0, gates: 0, kiosks: 0 };
const fixtures = [
  { name: 'Opening day', gateRate: 25, mealRate: 65 },
  { name: 'Family afternoon', gateRate: 20, mealRate: 75 },
  { name: 'Late kickoff', gateRate: 25, mealRate: 85 },
  { name: 'Early doors', gateRate: 30, mealRate: 40 },
  { name: 'Derby day', gateRate: 20, mealRate: 55 },
  { name: 'Season finale', gateRate: 25, mealRate: 80 },
];

export function forecast(campaign: Campaign, week: number, ground: typeof openingGround, shift: Shift) {
  const base = campaigns[campaign].crowds[week];
  const fixture = fixtures[week];
  const crowd = Math.max(0, base + ground.following + (shift.price === 'community' ? 18 : shift.price === 'premium' ? -22 : 0));
  const gates = ground.gates + Number(shift.project === 'gate');
  const kiosks = ground.kiosks + Number(shift.project === 'kiosk');
  const gateCapacity = 16 + gates * 26 + shift.gates * fixture.gateRate;
  const foodCapacity = kiosks * 21 + (4 - shift.gates) * 17;
  const admitted = Math.min(crowd, gateCapacity);
  const turnedAway = crowd - admitted;
  const meals = Math.min(Math.floor(admitted * fixture.mealRate / 100), foodCapacity);
  const receipts = admitted * ticketPrices[shift.price] + meals * 3;
  const operatingCost = 200;
  const cost = projects[shift.project].cost;
  const followingChange = (turnedAway === 0 ? 5 : -Math.ceil(turnedAway / 10)) + (shift.price === 'community' ? 4 : 0);
  const next = { cash: ground.cash + receipts - cost - operatingCost, admitted: ground.admitted + admitted,
    following: Math.max(-30, Math.min(40, ground.following + followingChange)), gates, kiosks };
  return { fixture, crowd, gateCapacity, foodCapacity, admitted, turnedAway, meals, receipts, operatingCost, cost, next };
}

export function playSeason(season: Season) {
  let ground = openingGround;
  return season.shifts.map((shift, week) => {
    const result = forecast(season.campaign, week, ground, shift);
    ground = result.next;
    return result;
  });
}

// Save only the orders. Rebuild every receipt from the published season rules.
export function readDirectorSeason(bytes: string | null): Season | null {
  if (!bytes) return null;
  try {
    const s = JSON.parse(bytes);
    if (!s || typeof s.campaign !== 'string' || !Object.prototype.hasOwnProperty.call(campaigns, s.campaign) || !Array.isArray(s.shifts) || s.shifts.length > 6) return null;
    let ground = openingGround;
    for (const [week, shift] of s.shifts.entries()) {
      if (!shift || typeof shift.price !== 'string' || typeof shift.project !== 'string'
        || !Object.prototype.hasOwnProperty.call(ticketPrices, shift.price) || !Object.prototype.hasOwnProperty.call(projects, shift.project)
        || !Number.isInteger(shift.gates) || shift.gates < 0 || shift.gates > 4) return null;
      const result = forecast(s.campaign, week, ground, shift);
      if (result.cost > Math.max(ground.cash, 0)) return null;
      ground = result.next;
    }
    return { campaign: s.campaign, shifts: s.shifts };
  } catch { return null; }
}
