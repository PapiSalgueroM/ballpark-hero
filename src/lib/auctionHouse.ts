import { supabase } from '@/integrations/supabase/client';
import { Player, Position } from '@/types/game';
import { LEGENDS, normalizePosition, playerRating } from '@/lib/squadDeal';
import { getEnrichment } from '@/data/footleEnrichment';

/**
 * SIGN THE PLAYER, Auction House (owner brief 2026-07-10, blind auction format):
 * three bidders with £1B each, an 11-position themed pool of 33 players
 * (per position: a great, a good, and a stinker), sold per position in the
 * this order: the 2nd-best goes under the hammer FIRST, then the best,
 * and the 3rd is assigned to whoever still needs the position (they still
 * pay a fee). Then the three squads battle in a simulated mini-league.
 */

/* ---------------- setup ---------------- */

export const START_BUDGET = 1000; // £1B in millions

export interface AuctionSlot { key: string; label: string; allowed: Position[] }
export const AUCTION_SLOTS: AuctionSlot[] = [
  { key: 'GK',  label: 'Goalkeeper',        allowed: ['GK'] },
  { key: 'RB',  label: 'Right Back',        allowed: ['RB', 'RWB'] },
  { key: 'CB1', label: 'Centre Back',       allowed: ['CB'] },
  { key: 'CB2', label: 'Centre Back II',    allowed: ['CB'] },
  { key: 'LB',  label: 'Left Back',         allowed: ['LB', 'LWB'] },
  { key: 'CDM', label: 'Holding Mid',       allowed: ['CDM', 'CM'] },
  { key: 'CM',  label: 'Central Mid',       allowed: ['CM', 'CAM'] },
  { key: 'CAM', label: 'Playmaker',         allowed: ['CAM', 'CM', 'CF'] },
  { key: 'RW',  label: 'Right Wing',        allowed: ['RW', 'RM'] },
  { key: 'LW',  label: 'Left Wing',         allowed: ['LW', 'LM'] },
  { key: 'ST',  label: 'Striker',           allowed: ['ST', 'CF'] },
];

export type AuctionTheme = 'current' | 'legends' | 'wc2026';
export const AUCTION_THEMES: { id: AuctionTheme; label: string; emoji: string; desc: string }[] = [
  { id: 'current', label: 'Current Stars', emoji: '⚡', desc: "Today's elite by 2026 market value" },
  { id: 'legends', label: 'All-Time Legends', emoji: '👑', desc: 'The greatest to ever do it' },
  { id: 'wc2026', label: 'World Cup 2026', emoji: '🏆', desc: 'Stars of the summer tournament' },
];

const WC2026_NATIONS = new Set(['United States','Mexico','Canada','Argentina','France','Spain','England','Brazil','Portugal','Netherlands','Belgium','Croatia','Morocco','Germany','Italy','Uruguay','Colombia','Ecuador','Japan','South Korea','Korea, South','Australia','Iran','Saudi Arabia','Qatar','Senegal','Ghana','Cameroon','Nigeria','Egypt','Algeria','Ivory Coast',"Cote d'Ivoire",'Tunisia','Switzerland','Austria','Poland','Denmark','Sweden','Norway','Scotland','Wales','Serbia','Turkey','Türkiye','Ukraine','Greece','Czechia','Czech Republic','Paraguay','Panama','Costa Rica','Jordan','Uzbekistan','New Zealand','Bolivia','Haiti','Curacao','Cape Verde','South Africa']);

export interface AuctionPlayer extends Player {
  tier: 'great' | 'good' | 'weak';
  slotKey: string;
  basePrice: number; // £M opening price
  rating: number;
}

interface MarketRow {
  player_name: string; position: string | null; age: number; nationality: string;
  club: string; market_value_usd: number; goals: number | null; assists: number | null;
}

async function fetchCurrentPool(theme: AuctionTheme): Promise<Player[]> {
  try {
    const { data, error } = await supabase
      .from('player_market_values')
      .select('player_name, position, age, nationality, club, market_value_usd, goals, assists')
      .eq('year', 2026)
      .not('age', 'is', null)
      .order('market_value_usd', { ascending: false })
      .order('player_name', { ascending: true })
      .limit(600);
    if (error || !data) return [];
    const seen = new Set<string>();
    const out: Player[] = [];
    for (const row of data as MarketRow[]) {
      const position = normalizePosition(row.position ?? '');
      if (!position) continue;
      const k = row.player_name.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      if (theme === 'wc2026' && !WC2026_NATIONS.has(row.nationality)) continue;
      out.push({
        name: row.player_name, club: row.club, nationality: row.nationality,
        league: getEnrichment(row.player_name, row.club).league,
        goals: row.goals ?? 0, assists: row.assists ?? 0, position,
        kitNumber: 0, age: row.age,
        marketValue: Math.round(row.market_value_usd / 1_000_000), difficulty: 'easy',
      });
    }
    return out;
  } catch { return []; }
}

function ratingOf(p: Player, theme: AuctionTheme): number {
  if (theme === 'legends') {
    const r = 85 + ((Math.max(140, Math.min(230, p.marketValue)) - 140) * 14) / 90;
    return Math.round(Math.max(85, Math.min(99, r)));
  }
  return playerRating(p);
}

function shuffle<T>(a: T[]): T[] {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

/** 33-player pool: per slot a great (top band), a good (middle band) and a
 * weak pick (bottom band), randomized per run so no two auctions repeat. */
export async function buildAuctionPool(theme: AuctionTheme): Promise<AuctionPlayer[] | null> {
  const source = theme === 'legends' ? [...LEGENDS] : await fetchCurrentPool(theme);
  if (source.length < 60) return null;
  const used = new Set<string>();
  const result: AuctionPlayer[] = [];
  for (const slot of AUCTION_SLOTS) {
    const fits = source
      .filter(p => slot.allowed.includes(p.position) && !used.has(p.name))
      .sort((a, b) => b.marketValue - a.marketValue);
    if (fits.length < 3) return null;
    const n = fits.length;
    const band = (lo: number, hi: number) => {
      const a = Math.floor(lo * n); const b = Math.max(a + 1, Math.ceil(hi * n));
      return fits.slice(a, Math.min(b, n));
    };
    const pickFrom = (arr: Player[]): Player => arr[Math.floor(Math.random() * arr.length)];
    const great = pickFrom(band(0, 0.15));
    used.add(great.name);
    const goodPool = band(0.2, 0.55).filter(p => !used.has(p.name));
    const good = pickFrom(goodPool.length ? goodPool : band(0.15, 0.6).filter(p => !used.has(p.name)));
    used.add(good.name);
    const weakPool = band(0.7, 1).filter(p => !used.has(p.name));
    const weak = pickFrom(weakPool.length ? weakPool : fits.filter(p => !used.has(p.name)).slice(-5));
    used.add(weak.name);
    for (const [tier, p] of [['great', great], ['good', good], ['weak', weak]] as const) {
      const rating = ratingOf(p, theme);
      /* Round 315 anchored the opening price to the player's REAL market
         value (the old rating curve opened an 82 rated Mile Svilar at 162,
         the owner's report to the digit), opening a fifth below it. Round
         327, his auction spec: the lot opens AT list price now, because the
         decay phase handles the too-expensive case honestly, falling until
         somebody bites instead of discounting upfront. The rating curve
         stays only as a floor for players whose value the pool lacks. */
      const anchored = p.marketValue > 5 ? Math.round(p.marketValue) : Math.round((rating - 55) * 3);
      result.push({
        ...p, tier, slotKey: slot.key, rating,
        basePrice: Math.max(5, anchored),
      });
    }
  }
  return result;
}

/* ---------------- bidders ---------------- */

export interface Bidder {
  id: 'you' | 'sheikh' | 'mike';
  name: string;
  emoji: string;
  budget: number;
  squad: Record<string, AuctionPlayer | null>; // slotKey -> player
  personality: number; // valuation multiplier
}

export function createBidders(): Bidder[] {
  const emptySquad = () => Object.fromEntries(AUCTION_SLOTS.map(s => [s.key, null])) as Record<string, AuctionPlayer | null>;
  return [
    { id: 'you', name: 'You', emoji: '🫵', budget: START_BUDGET, squad: emptySquad(), personality: 1 },
    { id: 'sheikh', name: 'The Sheikh', emoji: '🛢️', budget: START_BUDGET, squad: emptySquad(), personality: 1.22 },
    { id: 'mike', name: 'Moneyball Mike', emoji: '📊', budget: START_BUDGET, squad: emptySquad(), personality: 0.88 },
  ];
}

/** What an AI thinks a player is worth (£M). */
export function aiValuation(b: Bidder, p: AuctionPlayer, slotsLeftAfterThis: number, rand: () => number = Math.random): number {
  /* Round 327: basePrice rose from 0.8x to 1.0x of market value, so the
     multiplier fell from 1.6 to 1.28 and every rival still values a player
     at exactly the number it always did. */
  const base = p.basePrice * 1.28 + (p.tier === 'great' ? 40 : p.tier === 'good' ? 10 : -10);
  const need = b.squad[p.slotKey] === null ? 1.15 : 0; // never bid on a filled slot
  // keep a reserve: don't spend into being unable to pay assignment fees later
  const reserve = slotsLeftAfterThis * 12;
  const cap = Math.max(0, b.budget - reserve);
  const noise = 0.85 + rand() * 0.35;
  return Math.min(cap, Math.round(base * b.personality * need * noise));
}

export const BID_STEPS = [5, 10, 25] as const;

/** The raise a rival makes at a given price, the same ladder BID_STEPS gives you. */
export function bidStepFor(price: number): number {
  return price >= 200 ? 25 : price >= 80 ? 10 : 5;
}

/** Assignment fee for a leftover fill player (0.48 of the new 1.0x base is
 *  the same absolute fee the old 0.6 of 0.8x charged). */
export function assignmentFee(p: AuctionPlayer): number {
  return Math.max(5, Math.round(p.basePrice * 0.48));
}

/* Round 327, the decay phase: a lot nobody bites on falls step by step to a
 * floor instead of being forced onto the richest bidder. */
export const DECAY_STEP = 0.9;
export const DECAY_FLOOR = 0.3;

/* Round 454: a rival can sit a lot out. His format, word for word: "if zero
 * then there price goes down a little and more and more until someone
 * decided they want him". Round 441 measured that case at 0 of 5280 lots in
 * ordinary play, and the reason was arithmetic: a rival's FLOOR valuation is
 * 1.28 x list x 0.88 personality x 1.15 need x 0.85 noise = 1.10 x list, so
 * no rival could ever decline a lot on value and only an empty wallet made
 * him walk. Real rooms are not like that: a club with a plan passes on a
 * player who is not in it. So each rival, on each lot he could bid on, first
 * decides whether the man is on his list at all, and the odds of passing run
 * by tier: the best player in the room is almost never passed on, a weak
 * lot often is. The draw comes from the same seeded generator as everything
 * else, so a seed still replays. Measured on 240 driven auctions, see
 * scripts/simSignThePlayerAuction.mjs section 4c for the band it holds. */
export const WALK_AWAY_ODDS: Record<AuctionPlayer['tier'], number> = { great: 0.04, good: 0.2, weak: 0.5 };

/** Whether a rival passes on a lot before valuing it, drawn from the room's own generator. */
export function walksAway(lot: AuctionPlayer, rand: () => number): boolean {
  return rand() < WALK_AWAY_ODDS[lot.tier];
}

/* Round 327, the owner's running order: pass one is a lot per position from
 * the middle band in a random order, pass two the elite band, and the single
 * most valuable player in the room is held back to headline the final lot.
 * The weak band never comes up as a lot: it fills open chairs at a fee when
 * the last hammer falls. Exported with an injectable rand so the harness can
 * drive it deterministically while the page keeps Math.random. */
export interface OrderedLot { player: AuctionPlayer; pass: 1 | 2; headline?: boolean }
export function orderLots(pool: AuctionPlayer[], rand: () => number = Math.random): { lots: OrderedLot[]; weakFills: AuctionPlayer[] } {
  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const goods = shuffle(pool.filter(p => p.tier === 'good')).map(player => ({ player, pass: 1 as const }));
  const greats = shuffle(pool.filter(p => p.tier === 'great'));
  let bestIdx = 0;
  for (let i = 1; i < greats.length; i += 1) if (greats[i].marketValue > greats[bestIdx].marketValue) bestIdx = i;
  const [headliner] = greats.splice(bestIdx, 1);
  return {
    lots: [
      ...goods,
      ...greats.map(player => ({ player, pass: 2 as const })),
      { player: headliner, pass: 2, headline: true },
    ],
    weakFills: pool.filter(p => p.tier === 'weak'),
  };
}

/* ---------------- one lot, the room's half ----------------
 * Round 441. All of this used to sit inside SignThePlayer.tsx, which meant
 * the rules of the room were the one part of the auction no harness could
 * read. It lives here now, exactly as the page ran it save for the opening
 * bid fix below, and the page replays the events it returns.
 */

export type BidderId = Bidder['id'];

export interface BidEvent {
  kind: 'bid' | 'out';
  bidderId: BidderId;
  price: number;
  leader: BidderId | null;
}

export interface Exchange {
  events: BidEvent[];
  /** Who is still in when the rivals stop. */
  active: BidderId[];
  price: number;
  leader: BidderId | null;
  /** 'sold' the hammer falls now, 'decay' nobody wanted him at list price, 'open' you still have a say. */
  outcome: 'sold' | 'decay' | 'open';
  winner: BidderId | null;
}

/**
 * The rivals answer the current price. Each raise is computed up front so the
 * page can replay them one beat at a time.
 */
export function runRivalBids(args: {
  lot: AuctionPlayer;
  bidders: Bidder[];
  active: Iterable<BidderId>;
  price: number;
  leader: BidderId | null;
  slotsLeftAfter: number;
  rand?: () => number;
}): Exchange {
  const { lot, bidders, slotsLeftAfter } = args;
  const rand = args.rand ?? Math.random;
  const act = new Set<BidderId>(args.active);
  const events: BidEvent[] = [];
  let p = args.price;
  let lead = args.leader;
  let moved = true;
  while (moved) {
    moved = false;
    for (const b of bidders) {
      if (b.id === 'you' || !act.has(b.id) || lead === b.id) continue;
      /* Round 454: a rival who has not bid yet may pass on the man entirely.
         Only before his first bid: once he is in, he is in on value. */
      if (lead !== b.id && !events.some(e => e.kind === 'bid' && e.bidderId === b.id) && walksAway(lot, rand)) {
        act.delete(b.id);
        events.push({ kind: 'out', bidderId: b.id, price: p, leader: lead });
        continue;
      }
      const val = aiValuation(b, lot, slotsLeftAfter, rand);
      /* Round 441, his format to the letter: "if its just one then they win
         the player for the listed price". A lot nobody leads is OPENED at
         list, the way your own open button does it. Before this a rival with
         no one to beat still raised himself one step, so every uncontested
         lot in the room sold 5, 10 or 25 million over the number on the
         card, and the one case his spec is most explicit about was the one
         case the room never played. */
      const target = lead === null ? p : p + bidStepFor(p);
      if (target <= val && b.budget >= target) {
        p = target;
        lead = b.id;
        events.push({ kind: 'bid', bidderId: b.id, price: p, leader: lead });
        moved = true;
      } else {
        act.delete(b.id);
        events.push({ kind: 'out', bidderId: b.id, price: p, leader: lead });
      }
    }
    if (act.has('you')) break;
  }
  const remaining = [...act];
  let outcome: Exchange['outcome'] = 'open';
  let winner: BidderId | null = null;
  if (!act.has('you') && remaining.length <= 1) {
    if (lead) { outcome = 'sold'; winner = lead; } else outcome = 'decay';
  } else if (act.has('you') && remaining.length === 1 && lead === 'you') {
    outcome = 'sold';
    winner = 'you';
  }
  return { events, active: remaining, price: p, leader: lead, outcome, winner };
}

/** The price a decaying lot is withdrawn at. */
export function decayFloorFor(basePrice: number): number {
  return Math.max(5, Math.round(basePrice * DECAY_FLOOR));
}

/** One step down the decay. */
export function nextDecayPrice(price: number): number {
  return Math.round(price * DECAY_STEP);
}

/** Which rival, if any, snaps a decaying lot at this price. The deeper the discount, the harder to resist. */
export function decaySnapper(
  bidders: Bidder[],
  lot: AuctionPlayer,
  price: number,
  slotsLeftAfter: number,
  rand: () => number = Math.random,
): BidderId | null {
  for (const b of bidders) {
    if (b.id === 'you' || b.squad[lot.slotKey] !== null || b.budget < price) continue;
    const val = aiValuation(b, lot, slotsLeftAfter, rand);
    const discount = 1 - price / lot.basePrice;
    if (price <= val && rand() < 0.25 + discount) return b.id;
  }
  return null;
}

/**
 * The end of auction fill. Every open chair takes a body so nobody plays the
 * showdown a man short.
 *
 * Round 441: a body nobody else has. The fill used to hand the same
 * journeyman to every squad still missing that position, so a withdrawn lot
 * put one real man in two of the three teams in the same mini league. The
 * pool has exactly enough: a position only leaves a second chair open when
 * one of its two lots found no taker, and a withdrawn lot goes back into
 * `fillPool`, so the count always works out.
 */
export function fillOpenChairs(bidders: Bidder[], fillPool: AuctionPlayer[]): Bidder[] {
  const taken = new Set<string>();
  for (const b of bidders) for (const p of Object.values(b.squad)) if (p) taken.add(p.name);
  return bidders.map(b => {
    let budget = b.budget;
    const squad = { ...b.squad };
    for (const slot of AUCTION_SLOTS) {
      if (squad[slot.key] !== null) continue;
      const fill = fillPool.find(w => w.slotKey === slot.key && !taken.has(w.name));
      if (!fill) continue;
      taken.add(fill.name);
      const fee = Math.min(assignmentFee(fill), Math.max(0, budget));
      budget = Math.max(0, budget - fee);
      squad[slot.key] = fill;
    }
    return { ...b, budget, squad };
  });
}

/** Hand a settled lot to its buyer. */
export function applySale(bidders: Bidder[], lot: AuctionPlayer, winner: BidderId, price: number): Bidder[] {
  return bidders.map(b => b.id !== winner ? b : ({
    ...b,
    budget: Math.max(0, b.budget - price),
    squad: { ...b.squad, [lot.slotKey]: lot },
  }));
}

/* ---------------- showdown sim ---------------- */

export interface ShowdownRow {
  bidderId: Bidder['id'];
  name: string;
  emoji: string;
  rating: number;
  points: number;
  gf: number;
  ga: number;
  moneyLeft: number;
}
export interface ShowdownResult {
  table: ShowdownRow[];
  lines: string[];
  champion: Bidder['id'];
  topScorer: { player: string; team: string; goals: number };
}

export function squadRatingOf(b: Bidder): number {
  const players = Object.values(b.squad).filter((p): p is AuctionPlayer => !!p);
  if (players.length === 0) return 0;
  return Math.round(players.reduce((s, p) => s + p.rating, 0) / players.length);
}

function poisson(exp: number): number {
  let g = 0;
  for (let i = 0; i < 6; i++) if (Math.random() < exp / 6) g++;
  return g;
}

export function simulateShowdown(bidders: Bidder[]): ShowdownResult {
  const rows: ShowdownRow[] = bidders.map(b => ({
    bidderId: b.id, name: b.name, emoji: b.emoji, rating: squadRatingOf(b),
    points: 0, gf: 0, ga: 0, moneyLeft: Math.round(b.budget),
  }));
  const lines: string[] = [];
  // double round robin
  for (let i = 0; i < rows.length; i++) {
    for (let j = 0; j < rows.length; j++) {
      if (i === j) continue;
      const home = rows[i], away = rows[j];
      const diff = home.rating - away.rating;
      const hg = poisson(Math.max(0.4, 1.55 + diff / 14));
      const ag = poisson(Math.max(0.4, 1.25 - diff / 14));
      home.gf += hg; home.ga += ag; away.gf += ag; away.ga += hg;
      if (hg > ag) home.points += 3; else if (ag > hg) away.points += 3; else { home.points++; away.points++; }
      lines.push(`${home.emoji} ${home.name} ${hg}-${ag} ${away.name} ${away.emoji}`);
    }
  }
  rows.sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
  // top scorer: best striker-ish player on any squad, goals scaled by team gf
  let top = { player: 'Nobody', team: '-', goals: 0 };
  for (const b of bidders) {
    const row = rows.find(r => r.bidderId === b.id)!;
    const atk = Object.values(b.squad).filter((p): p is AuctionPlayer => !!p && ['ST', 'CF', 'LW', 'RW', 'CAM'].includes(p.position))
      .sort((a, c) => c.rating - a.rating)[0];
    if (atk) {
      const goals = Math.max(1, Math.round(row.gf * (0.45 + Math.random() * 0.2)));
      if (goals > top.goals) top = { player: atk.name, team: b.name, goals };
    }
  }
  return { table: rows, lines, champion: rows[0].bidderId, topScorer: top };
}

/** Final score for the leaderboard: table position + squad quality + thrift. */
export function auctionScore(result: ShowdownResult, you: Bidder): number {
  const place = result.table.findIndex(r => r.bidderId === 'you');
  const placeBonus = place === 0 ? 300 : place === 1 ? 150 : 50;
  const yourRow = result.table[place];
  return placeBonus + squadRatingOf(you) * 3 + Math.round(yourRow.moneyLeft / 10);
}
