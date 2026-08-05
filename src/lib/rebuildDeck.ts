import { Player } from '@/types/game';
import { FORMATIONS, playerRating, type Formation, type FormationSlot } from '@/lib/squadDeal';
import type { RebuildClub, ClubTier } from '@/lib/fetchRebuild';

/**
 * Rebuild Challenge expansion (owner 2026-08-05, box2box format):
 *  - Coach step: keep your caretaker or pay for one of three candidates.
 *  - Board objectives: two "management cards" dealt at the start. Miss one
 *    and the board force-sells a player at the end. Brutal, like the videos.
 *  - Financial events: money swings mid-rebuild, good and bad.
 *  - Two AI rival managers rebuild comparable clubs alongside you and post
 *    their final XI ratings, so finishing above target isn't the only prize.
 * Everything is seeded off the club name so a given club plays out the same
 * within a run but differently across clubs.
 */

export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

function pick<T>(arr: T[], seed: number, salt: number): T {
  return arr[Math.abs((seed ^ (salt * 2654435761)) >>> 0) % arr.length];
}

/* ---------------- Coaches ---------------- */

export interface CoachOption {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  /** Transfer money it costs to hire them. */
  cost: number;
  /** Added straight onto the final XI rating. */
  bonus: number;
}

const ELITE_COACHES: Omit<CoachOption, 'cost' | 'bonus'>[] = [
  { id: 'pep', name: 'Pep Guardiola', emoji: '🧠', desc: 'Turns training cones into title parades' },
  { id: 'carlo', name: 'Carlo Ancelotti', emoji: '🚬', desc: 'Raises an eyebrow, wins a final' },
  { id: 'klopp', name: 'Jurgen Klopp', emoji: '🔥', desc: 'Heavy metal, heavier trophy cabinet' },
  { id: 'diniz', name: 'The Innovator', emoji: '🧪', desc: 'Football from ten years in the future' },
];
const SOLID_COACHES: Omit<CoachOption, 'cost' | 'bonus'>[] = [
  { id: 'simeone', name: 'Diego Simeone', emoji: '🧱', desc: 'Suffering, but winning suffering' },
  { id: 'emery', name: 'Unai Emery', emoji: '📋', desc: 'Has a dossier on your dossier' },
  { id: 'gasperini', name: 'The Overachiever', emoji: '⚙️', desc: 'Makes mid squads punch up' },
  { id: 'deZerbi', name: 'Roberto De Zerbi', emoji: '🎨', desc: 'Builds out from the back, beautifully' },
];
const BUDGET_COACHES: Omit<CoachOption, 'cost' | 'bonus'>[] = [
  { id: 'youngGun', name: 'The Young Gun', emoji: '🍼', desc: 'Laptop full of ideas, zero scars' },
  { id: 'clubLegend', name: 'The Club Legend', emoji: '🧣', desc: 'Fans love him. Tactics board fears him' },
  { id: 'journeyman', name: 'The Fixer', emoji: '🔧', desc: 'Kept four clubs up. Barely' },
];

export function coachOptionsFor(tier: ClubTier, seed: number): CoachOption[] {
  const scale = tier === 'elite' ? 1.4 : tier === 'strong' ? 1.15 : tier === 'mid' ? 1 : 0.85;
  const elite = pick(ELITE_COACHES, seed, 11);
  const solid = pick(SOLID_COACHES, seed, 23);
  const budget = pick(BUDGET_COACHES, seed, 37);
  return [
    { ...elite, cost: Math.round(28 * scale), bonus: 3 },
    { ...solid, cost: Math.round(12 * scale), bonus: 2 },
    { ...budget, cost: Math.round(4 * scale), bonus: 1 },
  ];
}

export const KEEP_COACH: CoachOption = {
  id: 'caretaker',
  name: 'Keep the Caretaker',
  emoji: '🪑',
  desc: 'Free, loyal, and exactly fine',
  cost: 0,
  bonus: 0,
};

/* ---------------- Board objectives (management cards) ---------------- */

export interface ObjectiveState {
  signed: Player[];
  sold: Player[];
  budget: number;
}

export interface BoardObjective {
  id: string;
  emoji: string;
  text: string;
  penaltyText: string;
  check: (s: ObjectiveState) => boolean;
}

const OBJECTIVE_DECK: BoardObjective[] = [
  {
    id: 'youth', emoji: '🌱',
    text: 'Sign at least 2 players aged 23 or under',
    penaltyText: 'The board wanted youth. They sold your best signing to fund the academy.',
    check: (s) => s.signed.filter(p => (p.age ?? 99) <= 23).length >= 2,
  },
  {
    id: 'clearout', emoji: '🧹',
    text: 'Sell at least 2 of the current squad',
    penaltyText: 'No clearout, no trust. The board sold a starter behind your back.',
    check: (s) => s.sold.length >= 2,
  },
  {
    id: 'noGalacticos', emoji: '🧾',
    text: 'No single signing over €60M',
    penaltyText: 'You blew the wage structure. The board flipped your priciest buy.',
    check: (s) => s.signed.every(p => p.marketValue <= 60),
  },
  {
    id: 'marquee', emoji: '⭐',
    text: 'Sign at least one player worth €70M or more',
    penaltyText: 'No marquee name, no shirt sales. The board cashed in a star to cover it.',
    check: (s) => s.signed.some(p => p.marketValue >= 70),
  },
  {
    id: 'inTheBlack', emoji: '🏦',
    text: 'Finish the window with money in the bank',
    penaltyText: 'You finished in the red. The board balanced the books the hard way.',
    check: (s) => s.budget >= 0,
  },
  {
    id: 'busy', emoji: '✍️',
    text: 'Make at least 3 signings',
    penaltyText: 'Too quiet. The board decided the squad needed "freshening" without you.',
    check: (s) => s.signed.length >= 3,
  },
  {
    id: 'sameNation', emoji: '🤝',
    text: 'Sign 2 players who share a nationality',
    penaltyText: 'The board wanted a national core and did not get one.',
    check: (s) => {
      const counts = new Map<string, number>();
      for (const p of s.signed) {
        const nat = (p.nationality || '').split('/')[0].trim();
        if (!nat) continue;
        counts.set(nat, (counts.get(nat) ?? 0) + 1);
      }
      return [...counts.values()].some(n => n >= 2);
    },
  },
  {
    id: 'prime', emoji: '📈',
    text: 'Every signing aged 29 or under',
    penaltyText: 'The board saw the age curve and panicked. A veteran got moved on.',
    check: (s) => s.signed.every(p => (p.age ?? 0) <= 29 || !p.age),
  },
];

export function dealObjectives(seed: number): BoardObjective[] {
  const first = pick(OBJECTIVE_DECK, seed, 101);
  let second = pick(OBJECTIVE_DECK, seed, 211);
  let salt = 211;
  while (second.id === first.id) {
    salt += 97;
    second = pick(OBJECTIVE_DECK, seed, salt);
  }
  return [first, second];
}

/* ---------------- Financial events ---------------- */

export interface FinEvent {
  emoji: string;
  text: string;
  delta: number;
}

const FIN_EVENTS: FinEvent[] = [
  { emoji: '👕', text: 'Shirt sales went nuclear in Asia', delta: 30 },
  { emoji: '📺', text: 'New TV deal kicked in early', delta: 40 },
  { emoji: '🤝', text: 'Sleeve sponsor signed on the dotted line', delta: 20 },
  { emoji: '🏟️', text: 'Stadium naming rights sold', delta: 25 },
  { emoji: '🎪', text: 'Preseason tour sold out three continents', delta: 15 },
  { emoji: '💼', text: 'Sell-on clause from an old academy kid paid out', delta: 18 },
  { emoji: '📉', text: 'Main sponsor hit a scandal and pulled out', delta: -25 },
  { emoji: '🚿', text: 'Stadium roof leak. The expensive kind', delta: -15 },
  { emoji: '🧾', text: 'Agent fees came in way over estimate', delta: -12 },
  { emoji: '⚖️', text: 'Lost an arbitration case over an old transfer', delta: -20 },
  { emoji: '🎫', text: 'Season ticket renewals came in soft', delta: -10 },
  { emoji: '🛫', text: 'Charter flight budget tripled. Nobody knows why', delta: -8 },
];

/** Deterministic event for the Nth trigger of a run. */
export function drawFinEvent(seed: number, index: number): FinEvent {
  return pick(FIN_EVENTS, seed, 500 + index * 13);
}

/* ---------------- AI rivals ---------------- */

export interface RivalPlan {
  name: string;
  emoji: string;
  club: RebuildClub;
}

export interface RivalResult extends RivalPlan {
  startRating: number;
  finalRating: number;
  signings: string[];
}

const RIVAL_PERSONAS: { name: string; emoji: string }[] = [
  { name: 'The Shark', emoji: '🦈' },
  { name: 'El Profesor', emoji: '🎓' },
  { name: 'Moneyball Mike', emoji: '📊' },
  { name: 'Agent Zero', emoji: '🕶️' },
];

/** Two rival clubs near the player's pick in the tier list, plus personas. */
export function planRivals(myClub: RebuildClub, clubs: RebuildClub[], seed: number): RivalPlan[] {
  const others = clubs.filter(c => c.club !== myClub.club);
  const sameTier = others.filter(c => c.tier === myClub.tier);
  const pool = sameTier.length >= 2 ? sameTier : others;
  const a = pick(pool, seed, 71);
  let b = pick(pool, seed, 149);
  let salt = 149;
  while (b.club === a.club && pool.length > 1) {
    salt += 53;
    b = pick(pool, seed, salt);
  }
  const p1 = pick(RIVAL_PERSONAS, seed, 301);
  let p2 = pick(RIVAL_PERSONAS, seed, 401);
  let psalt = 401;
  while (p2.name === p1.name) {
    psalt += 31;
    p2 = pick(RIVAL_PERSONAS, seed, psalt);
  }
  return [
    { ...p1, club: a },
    { ...p2, club: b },
  ];
}

function bestFor(slot: FormationSlot, pool: Player[], used: Set<string>): Player | undefined {
  return pool
    .filter(p => slot.allowed.includes(p.position) && !used.has(p.name))
    .sort((a, b) => playerRating(b) - playerRating(a))[0];
}

function buildXi(formation: Formation, pool: Player[]): (Player | undefined)[] {
  const used = new Set<string>();
  return formation.slots.map(slot => {
    const p = bestFor(slot, pool, used);
    if (p) used.add(p.name);
    return p;
  });
}

function xiRating(xi: (Player | undefined)[]): number {
  const picked = xi.filter(Boolean) as Player[];
  if (picked.length === 0) return 0;
  return Math.round(picked.reduce((s, p) => s + playerRating(p), 0) / picked.length);
}

/**
 * Simulate one rival's window: sell their 2 lowest-rated starters, then
 * greedily buy the best affordable upgrades for their weakest slots from the
 * market (players the human already signed are off limits). Deterministic.
 * Players this rival won off you in a bidding war are forced into their squad.
 */
export function simulateRival(
  plan: RivalPlan,
  rivalSquad: Player[],
  market: Player[],
  humanSigned: Set<string>,
  seed: number,
  wonInWars: string[] = [],
): RivalResult {
  const formation = FORMATIONS[0];
  const startXi = buildXi(formation, rivalSquad);
  const startRating = xiRating(startXi);

  let budget = 100;
  const squad = [...rivalSquad];

  // Sell the two cheapest starters to raise funds.
  const sellable = (startXi.filter(Boolean) as Player[])
    .sort((a, b) => playerRating(a) - playerRating(b))
    .slice(0, 2);
  for (const s of sellable) {
    budget += s.marketValue;
    const idx = squad.findIndex(p => p.name === s.name);
    if (idx >= 0) squad.splice(idx, 1);
  }

  const signings: string[] = [];
  const taken = new Set(squad.map(p => p.name));

  // War trophies first: they outbid you for these, so they own them now.
  for (const name of wonInWars) {
    const won = market.find(p => p.name === name);
    if (!won || taken.has(won.name)) continue;
    squad.push(won);
    taken.add(won.name);
    budget = Math.max(0, budget - won.marketValue);
    signings.push(won.name);
  }

  // Then up to 3 best affordable players the human didn't take.
  const options = market
    .filter(p => !humanSigned.has(p.name) && !taken.has(p.name))
    .sort((a, b) => playerRating(b) - playerRating(a));
  for (const cand of options) {
    if (signings.length >= 3 + wonInWars.length) break;
    if (cand.marketValue > budget) continue;
    // A rival skips a candidate now and then so runs differ per seed.
    if ((hashSeed(cand.name) ^ seed) % 5 === 0) continue;
    squad.push(cand);
    budget -= cand.marketValue;
    signings.push(cand.name);
  }

  const finalRating = xiRating(buildXi(formation, squad));
  return { ...plan, startRating, finalRating, signings };
}

/* ---------------- Live bidding wars (owner 2026-08-05: "bidding wars for players") ---------------- */

/** Chance (0-100) a rival hijacks this signing. Stars start wars, squad players don't. */
export function contestChance(p: Player): number {
  const r = playerRating(p);
  if (r >= 86) return 55;
  if (r >= 82) return 40;
  if (r >= 78) return 28;
  if (r >= 74) return 15;
  return 6;
}

/** Seeded per run + player, so a run can't reroll the same deal. */
export function isContested(p: Player, seed: number): boolean {
  return (hashSeed(p.name) ^ seed) % 100 < contestChance(p);
}

/** Which of the two rivals picks the fight over this player. */
export function warRivalIndex(p: Player, seed: number): number {
  return (hashSeed(p.name) ^ (seed >>> 3)) % 2;
}

/** The rival's hidden ceiling: 112% to 157% of market value. */
export function rivalCapFor(p: Player, seed: number): number {
  const wiggle = ((hashSeed(p.name) ^ (seed >>> 5)) % 46) / 100;
  return Math.round(p.marketValue * (1.12 + wiggle));
}

/** Next bid on the ladder. Steps grow with the fee. */
export function nextRaise(price: number): number {
  const step = price >= 120 ? 15 : price >= 60 ? 10 : price >= 25 ? 5 : 3;
  return price + step;
}

/* ---------------- Season simulation (owner 2026-08-05: "simulate the season with stats") ---------------- */

export interface SeasonTeam {
  name: string;      // manager or club display name
  clubName: string;
  emoji: string;
  rating: number;
  isYou?: boolean;
  isRival?: boolean;
}

export interface SeasonRow extends SeasonTeam {
  w: number; d: number; l: number; gf: number; ga: number; pts: number;
}

export interface SeasonResult {
  table: SeasonRow[];
  position: number; // your finish, 1-based
  highlights: string[];
  goldenBoot: { player: string; team: string; goals: number } | null;
  yourTopScorer: { player: string; goals: number } | null;
  yourAssistKing: { player: string; assists: number } | null;
  headline: string;
}

const FILLER_BASE: Record<ClubTier, number> = { elite: 84, strong: 81, mid: 77, modest: 73 };

function lcg(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function goalsFrom(exp: number, rnd: () => number): number {
  let g = 0;
  for (let i = 0; i < 6; i++) if (rnd() < exp / 6) g++;
  return g;
}

/**
 * A 6-team mini league season, double round robin (10 games each): you, your
 * two rivals, and three neutral clubs of your tier. Fully seeded, so the
 * result screen never reshuffles on re-render.
 */
export function simulateSeason(
  you: { clubName: string; rating: number; xi: Player[] },
  rivals: RivalResult[],
  fillerClubs: RebuildClub[],
  seed: number,
): SeasonResult {
  const rnd = lcg(seed * 31 + 7);
  const rows: SeasonRow[] = [];
  const mk = (t: SeasonTeam): SeasonRow => ({ ...t, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 });

  rows.push(mk({ name: 'You', clubName: you.clubName, emoji: '🫵', rating: you.rating, isYou: true }));
  for (const r of rivals) {
    rows.push(mk({ name: r.name, clubName: r.club.club, emoji: r.emoji, rating: r.finalRating, isRival: true }));
  }
  for (const c of fillerClubs.slice(0, 3)) {
    const jitter = Math.floor(rnd() * 5) - 2;
    rows.push(mk({ name: c.club, clubName: c.club, emoji: '🏟️', rating: FILLER_BASE[c.tier] + jitter }));
  }

  interface Game { home: SeasonRow; away: SeasonRow; hg: number; ag: number }
  const games: Game[] = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = 0; j < rows.length; j++) {
      if (i === j) continue;
      const home = rows[i], away = rows[j];
      const diff = home.rating - away.rating;
      const hg = goalsFrom(Math.max(0.35, 1.5 + diff / 13), rnd);
      const ag = goalsFrom(Math.max(0.35, 1.2 - diff / 13), rnd);
      home.gf += hg; home.ga += ag; away.gf += ag; away.ga += hg;
      if (hg > ag) { home.w++; away.l++; home.pts += 3; }
      else if (ag > hg) { away.w++; home.l++; away.pts += 3; }
      else { home.d++; away.d++; home.pts++; away.pts++; }
      games.push({ home, away, hg, ag });
    }
  }
  rows.sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
  const position = rows.findIndex(r => r.isYou) + 1;
  const yourRow = rows[position - 1];

  // Highlights: your biggest win, your worst loss, plus the wildest scoreline.
  const highlights: string[] = [];
  const yourGames = games.filter(g => g.home.isYou || g.away.isYou);
  const margin = (g: Game) => (g.home.isYou ? g.hg - g.ag : g.ag - g.hg);
  const wins = yourGames.filter(g => margin(g) > 0).sort((a, b) => margin(b) - margin(a));
  const losses = yourGames.filter(g => margin(g) < 0).sort((a, b) => margin(a) - margin(b));
  const line = (g: Game) => `${g.home.emoji} ${g.home.name} ${g.hg}-${g.ag} ${g.away.name} ${g.away.emoji}`;
  if (wins[0]) highlights.push(`🔥 Statement win: ${line(wins[0])}`);
  if (losses[0]) highlights.push(`🥶 Rough afternoon: ${line(losses[0])}`);
  const thriller = [...games].sort((a, b) => (b.hg + b.ag) - (a.hg + a.ag))[0];
  if (thriller) highlights.push(`🎢 Game of the season: ${line(thriller)}`);
  const champ = rows[0];
  highlights.push(champ.isYou ? '🏆 You lifted the trophy in front of a full house.' : `🏆 ${champ.emoji} ${champ.name} took the title with ${champ.pts} points.`);

  // Golden boot: real names only (your XI + rival signings), goals scaled off team output.
  let goldenBoot: SeasonResult['goldenBoot'] = null;
  const yourAtk = you.xi
    .filter(p => ['ST', 'CF', 'LW', 'RW', 'CAM'].includes(p.position))
    .sort((a, b) => playerRating(b) - playerRating(a));
  let yourTopScorer: SeasonResult['yourTopScorer'] = null;
  let yourAssistKing: SeasonResult['yourAssistKing'] = null;
  if (yourAtk[0]) {
    const goals = Math.max(2, Math.round(yourRow.gf * (0.42 + rnd() * 0.14)));
    yourTopScorer = { player: yourAtk[0].name, goals };
    goldenBoot = { player: yourAtk[0].name, team: 'You', goals };
  }
  const yourMids = you.xi
    .filter(p => ['CM', 'CAM', 'CDM', 'LM', 'RM', 'LW', 'RW'].includes(p.position))
    .filter(p => p.name !== yourTopScorer?.player)
    .sort((a, b) => playerRating(b) - playerRating(a));
  if (yourMids[0]) {
    yourAssistKing = { player: yourMids[0].name, assists: Math.max(2, Math.round(yourRow.gf * (0.24 + rnd() * 0.1))) };
  }
  for (const r of rivals) {
    const row = rows.find(x => x.name === r.name);
    if (!row || r.signings.length === 0) continue;
    const goals = Math.max(2, Math.round(row.gf * (0.38 + rnd() * 0.14)));
    if (!goldenBoot || goals > goldenBoot.goals) goldenBoot = { player: r.signings[0], team: r.name, goals };
  }

  const headline =
    position === 1 ? 'CHAMPIONS. The rebuild worked.'
    : position === 2 ? 'Runners up. One window away.'
    : position <= 4 ? 'Solid season, top half, real progress.'
    : 'A long season. The board is drafting emails.';

  return { table: rows, position, highlights, goldenBoot, yourTopScorer, yourAssistKing, headline };
}
