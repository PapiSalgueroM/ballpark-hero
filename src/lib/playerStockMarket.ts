import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { getTodayET, dailyPrngSeed } from '@/lib/dateUtils';
import { readDailyRecord, writeDailyRecord } from '@/lib/dailyRecord';
import { FORMATIONS, normalizePosition } from '@/lib/squadDeal';
import type { FormationSlot } from '@/lib/squadDeal';

/**
 * Player Stock Market, rebuilt in Round 458 to the owner's format from the
 * 08-28 review: "start seasons back, move year by year, show stats only,
 * never name, country or club, buy position by position until a full XI."
 *
 * THE CAMPAIGN. The market opens in one past season (2015 to 2022, the
 * daily fixes it, unlimited lets you choose or rolls one) with a 200M
 * wallet and the 4-3-3's eleven slots to fill, position by position. Each
 * slot deals four ANONYMOUS cards from that season: position, age, matches,
 * goals, assists, cards and the price, which is that season's real market
 * value. Nothing on a card identifies the man; the card TYPE has no name,
 * club or nationality field at all, the identities live beside the
 * campaign and are only read at the reveal. When the eleventh buy lands
 * the years roll forward one at a time to the latest season and every
 * holding's value moves as it really moved, then the names turn over.
 *
 * DATA LAW. Every number is a real row of player_market_values. The pool
 * comes from the player_market_tracked view (Round 458), which is that
 * table joined to itself: rows of the start season whose player still has
 * a row in the latest full season, carrying that latest value. The join
 * is the whole reason the view exists: the Round 329 engine read eight
 * whole seasons plus the final one to find the overlap, measured at 39 to
 * 42 paged requests and 6.6 to 7.2 MB before a card could be dealt, and
 * the page now reads one to three pages of the overlap alone (549 rows and
 * 119 KiB for a 2016 start, gzipped on the wire). The year by year values
 * come from one query for the eleven holdings after the XI is bought.
 * Where a holding has no row for a year, the step says so; nothing is ever
 * interpolated.
 *
 * SCORING (Round 434, unchanged in shape). Your return is measured on the
 * whole 200M, not on the slice you chose to spend: the eleven's value in
 * the final season is placed between the worst and the best eleven the
 * same wallet could really have bought from the same offers. 100 means you
 * played the wallet perfectly, 0 means you could not have done worse with
 * it, and cash you never spend buys nothing.
 */

export const STOCK_BUDGET = 200_000_000;
/** Every slot's punt aims at or under this, so eleven punts (88M at worst)
 *  always fit the 200M wallet with room over. */
export const PUNT_CEILING = 8_000_000;
export const CANDIDATES_PER_SLOT = 4;
/** A start season row has to be worth this much to be dealt at all. */
export const POOL_FLOOR = 2_000_000;
/**
 * The seasons the market can open in. The floor is MEASURED, not chosen:
 * scripts/simStockFormat.mjs counts, for every slot of the formation, the
 * real players of the season who fit the slot, are worth the pool floor
 * and are still tracked in the latest season, and requires at least four
 * deals' worth (16) in every slot. 2014 fails that floor at centre back
 * (27 tracked centre backs shared by two slots) and is the harness's proof
 * that the floor bites; 2015 is the first season that clears it. The
 * ceiling is a design choice: a start needs at least four year steps to
 * be a story, so the latest start is four seasons before the final one.
 */
export const START_YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022] as const;
export const STOCK_FORMATION = FORMATIONS[0]; /* 4-3-3 */
export const STOCK_SLUG = 'player-stock-market';

/** One row of the player_market_tracked view for the start season. */
export interface TrackedRow {
  player_name: string;
  position: string | null;
  age: number | null;
  matches: number | null;
  goals: number | null;
  assists: number | null;
  yellow_cards: number | null;
  red_cards: number | null;
  market_value_usd: number | null;
  year: number;
  final_year: number;
  final_value_usd: number | null;
}

/** One row of player_market_values_dedup for a holding, one per year. */
export interface HistoryRow {
  player_name: string;
  year: number;
  market_value_usd: number | null;
  club: string | null;
  nationality: string | null;
}

/**
 * What the buying screen sees. Deliberately NO name, club, nationality,
 * country or flag field: the type is the fence, and the harness reads the
 * keys of every dealt card to hold it.
 */
export interface StockCard {
  /** Opaque, unique within the campaign; the reveal looks the identity up by it. */
  id: string;
  position: string;
  age: number | null;
  /** Null where the season's row carries no appearance count (right backs
   *  before 2019 in the source), shown as not recorded rather than filled. */
  matches: number | null;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  /** What you pay: the real market value in the start season. */
  price: number;
  /** The real market value in the final season. Never rendered while buying. */
  final: number;
}

export interface CampaignSlot {
  slot: FormationSlot;
  candidates: StockCard[];
}

export interface Campaign {
  startYear: number;
  finalYear: number;
  budget: number;
  slots: CampaignSlot[];
  /** card id -> player name. Read at the reveal and nowhere else. */
  identities: Record<string, string>;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dailyCampaignSeed(dateStr: string = getTodayET()): number {
  /* Round 427: >>> 0 makes this seed unsigned HERE, at this call site only.
     dailyPrngSeed can return a negative number (see the note at its return), and
     a negative seed indexed START_YEARS out of bounds, which became NaN in the
     query and left Daily mode unstartable on 128 of 365 days.
     Scoped deliberately. Fixing the shared hash instead was tried and reverted:
     dozens of daily games seed off it through generatorFrom, and reshuffling
     all of them to fix this one made Sign the Player repeat a board four days
     running.
     The date parameter exists for simStockCampaign section 6, which walks a
     year of dates through this exact path; the page never passes one. */
  return ((dailyPrngSeed(dateStr) ^ 0x50534d32) >>> 0) || 13;
}

export function randomCampaignSeed(): number {
  return Math.floor(Math.random() * 2 ** 31) || 17;
}

export function startYearFor(seed: number): number {
  /* Round 427: never hand back undefined. A negative seed made `seed % length`
     negative, this returned undefined, and the undefined start year turned into
     NaN in the query string, so the Daily market asked Postgres for
     `year=in.(NaN)` and got a 400. Guarded here as well as at the seed because
     the failure mode is a silent 400 rather than a visible error. */
  const n = START_YEARS.length;
  if (!Number.isFinite(seed)) return START_YEARS[0];
  return START_YEARS[((Math.trunc(seed) % n) + n) % n];
}

/**
 * PURE assembly over injected rows of ONE start season. Per slot, in
 * formation order: the candidates are players whose normalized position
 * the slot accepts, worth the pool floor, with a final season value, drawn
 * seeded from value bands (one expensive, two middling, one punt) so the
 * wallet always has real decisions, deduped across the whole campaign, and
 * dealt in a seeded order so the price band cannot be read off the
 * position of a card. The punt band also guarantees every slot keeps at
 * least one candidate a nearly empty wallet can still afford.
 */
export function assembleCampaign(rows: TrackedRow[], seed: number, startYear: number): Campaign | null {
  const rng = mulberry32(seed);

  /* name -> best row for the start season */
  const byName = new Map<string, TrackedRow>();
  let finalYear = 0;
  for (const r of rows) {
    if (r.year !== startYear || !r.player_name || !r.market_value_usd || !r.final_value_usd) continue;
    if (r.final_year <= startYear) continue;
    if (finalYear === 0) finalYear = r.final_year;
    else if (r.final_year !== finalYear) return null; /* two final seasons in one pool: not a pool */
    const prev = byName.get(r.player_name);
    if (!prev || (prev.market_value_usd ?? 0) < r.market_value_usd) byName.set(r.player_name, r);
  }
  if (finalYear === 0) return null;

  const used = new Set<string>();
  const slots: CampaignSlot[] = [];
  const identities: Record<string, string> = {};
  for (let i = 0; i < STOCK_FORMATION.slots.length; i += 1) {
    const slot = STOCK_FORMATION.slots[i];
    const fits = [...byName.values()]
      .filter(r => !used.has(r.player_name) && (r.market_value_usd ?? 0) >= POOL_FLOOR)
      .filter(r => {
        const pos = normalizePosition(r.position || '');
        return pos !== null && (slot.allowed as string[]).includes(pos);
      })
      .sort((a, b) => (b.market_value_usd ?? 0) - (a.market_value_usd ?? 0) || (a.player_name < b.player_name ? -1 : 1));
    if (fits.length < CANDIDATES_PER_SLOT) return null;

    const band = (lo: number, hi: number): TrackedRow => {
      const a = Math.floor(lo * fits.length);
      const b = Math.max(a + 1, Math.floor(hi * fits.length));
      const pool = fits.slice(a, b).filter(r => !used.has(r.player_name));
      const src = pool.length ? pool : fits.filter(r => !used.has(r.player_name));
      return src[Math.floor(rng() * src.length)];
    };
    const picked: TrackedRow[] = [];
    for (const [lo, hi] of [[0, 0.1], [0.15, 0.45], [0.35, 0.7]] as const) {
      let c = band(lo, hi);
      let hops = 0;
      while (picked.includes(c) && hops < 10) { c = band(lo, hi); hops += 1; }
      if (!picked.includes(c)) { picked.push(c); used.add(c.player_name); }
    }
    /* THE PUNT, and the lock proof it carries: the fourth candidate is
       drawn from the cheap end with a hard preference for a price at or
       under PUNT_CEILING, so eleven punts always fit comfortably inside
       the wallet and a run can never strand a slot unaffordable (the page
       reserves the future punts' prices before allowing a splashy buy;
       simStockCampaign proves the arithmetic over hundreds of seeds). */
    const cheapFirst = fits.filter(r => !used.has(r.player_name)).sort((a, b) => (a.market_value_usd ?? 0) - (b.market_value_usd ?? 0));
    const puntPool = cheapFirst.filter(r => (r.market_value_usd ?? 0) <= PUNT_CEILING);
    const puntSrc = puntPool.length ? puntPool : cheapFirst;
    const punt = puntSrc[Math.floor(rng() * Math.max(1, Math.min(6, puntSrc.length)))];
    if (punt && !picked.includes(punt)) { picked.push(punt); used.add(punt.player_name); }
    if (picked.length < CANDIDATES_PER_SLOT) return null;

    /* Seeded deal order: [expensive, mid, mid, punt] would print the band on
       the card's position, and "always take the first card" would be the
       spend it all buyer in disguise. */
    for (let k = picked.length - 1; k > 0; k -= 1) {
      const j = Math.floor(rng() * (k + 1));
      [picked[k], picked[j]] = [picked[j], picked[k]];
    }

    const candidates: StockCard[] = picked.map((r, k) => {
      const id = `s${i}c${k}`;
      identities[id] = r.player_name;
      return {
        id,
        position: normalizePosition(r.position || '') ?? 'CM',
        age: r.age ?? null,
        matches: r.matches ?? null,
        goals: r.goals ?? 0,
        assists: r.assists ?? 0,
        yellowCards: r.yellow_cards ?? 0,
        redCards: r.red_cards ?? 0,
        price: r.market_value_usd!,
        final: r.final_value_usd!,
      };
    });
    slots.push({ slot, candidates });
  }
  return { startYear, finalYear, budget: STOCK_BUDGET, slots, identities };
}

/**
 * The start season pool: one query, one to three pages. The view joins
 * the season's rows to the latest full season, so every row it returns
 * can be finished, and the floor keeps the page to the rows a card can be
 * dealt from (2015: about 430 rows and one page; 2022: about 2,200 and
 * three). Ordered on a unique pair so the pages cannot overlap.
 */
export async function fetchStartSeasonPool(startYear: number): Promise<TrackedRow[] | null> {
  try {
    const { data, error } = await fetchAllRows<TrackedRow>((from, to) =>
      supabase
        .from('player_market_tracked')
        .select('player_name, position, age, matches, goals, assists, yellow_cards, red_cards, market_value_usd, year, final_year, final_value_usd')
        .eq('year', startYear)
        .gte('market_value_usd', POOL_FLOOR)
        .order('player_name', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    );
    if (error || !data || data.length < 100) return null;
    return data as TrackedRow[];
  } catch {
    return null;
  }
}

/**
 * The year by year rows for the holdings: one query for all eleven, every
 * season from the start to the final one, from the dedup view so a name
 * has one row a year (the dearest, the same rule the tracked view uses for
 * the final season).
 */
export async function fetchHoldingHistories(names: string[], fromYear: number, toYear: number): Promise<HistoryRow[] | null> {
  try {
    const { data, error } = await supabase
      .from('player_market_values_dedup')
      .select('player_name, year, market_value_usd, club, nationality')
      .in('player_name', names)
      .gte('year', fromYear)
      .lte('year', toYear)
      .order('player_name', { ascending: true })
      .order('year', { ascending: true });
    if (error || !data) return null;
    return data as HistoryRow[];
  } catch {
    return null;
  }
}

/** The cheapest candidate's price for one slot. */
export function puntPriceOf(slot: CampaignSlot): number {
  return Math.min(...slot.candidates.map(c => c.price));
}

/** What must stay in the wallet after buying at slotIndex so every LATER
 *  slot can still afford its punt. The page's affordability rule. */
export function reserveAfter(campaign: Campaign, slotIndex: number): number {
  let sum = 0;
  for (let j = slotIndex + 1; j < campaign.slots.length; j += 1) sum += puntPriceOf(campaign.slots[j]);
  return sum;
}

export function canAfford(campaign: Campaign, slotIndex: number, candidate: StockCard, remaining: number): boolean {
  return candidate.price + reserveAfter(campaign, slotIndex) <= remaining;
}

/* ---------------- the years, and the reveal ---------------- */

export interface Holding {
  slot: string;
  position: string;
  age: number | null;
  price: number;
  final: number;
  /** The reveal. */
  name: string;
  club: string;
  nationality: string;
  /** One entry per season from startYear to finalYear, in order. Null
   *  where the table has no row for that player and year. */
  series: (number | null)[];
}

export interface StepLine {
  holding: number;
  /** This season's real value, or null when there is no row. */
  value: number | null;
  /** The last value the table knew before this season (the price at the
   *  start), so a move can be shown even after a gap. */
  prev: number;
}

export interface YearStep {
  year: number;
  lines: StepLine[];
  /** How many of the eleven have a row this season. */
  known: number;
  /** The sum of the values that exist this season. */
  total: number;
}

/** name -> year -> the dearest row for that year. */
function indexHistories(rows: HistoryRow[]): Map<string, Map<number, HistoryRow>> {
  const byName = new Map<string, Map<number, HistoryRow>>();
  for (const r of rows) {
    if (!r.player_name) continue;
    let years = byName.get(r.player_name);
    if (!years) { years = new Map(); byName.set(r.player_name, years); }
    const prev = years.get(r.year);
    if (!prev || (prev.market_value_usd ?? 0) < (r.market_value_usd ?? 0)) years.set(r.year, r);
  }
  return byName;
}

/**
 * The real value of one player in one season, or null when the table has
 * no row. This is the only place a year's value comes from, and it never
 * fills a gap: a season with no row is a season with no row.
 */
export function valueAt(index: Map<string, Map<number, HistoryRow>>, name: string, year: number): number | null {
  const row = index.get(name)?.get(year);
  const v = row?.market_value_usd ?? null;
  return v !== null && v > 0 ? v : null;
}

export function identityOf(campaign: Campaign, card: StockCard): string {
  return campaign.identities[card.id] ?? 'Unknown';
}

/** The eleven holdings with their real season by season values. */
export function buildHoldings(campaign: Campaign, picks: StockCard[], histories: HistoryRow[]): Holding[] {
  const index = indexHistories(histories);
  return picks.map((card, i) => {
    const name = identityOf(campaign, card);
    const startRow = index.get(name)?.get(campaign.startYear);
    const series: (number | null)[] = [];
    for (let y = campaign.startYear; y <= campaign.finalYear; y += 1) series.push(valueAt(index, name, y));
    return {
      slot: campaign.slots[i].slot.label,
      position: card.position,
      age: card.age,
      price: card.price,
      final: card.final,
      name,
      club: startRow?.club ?? 'Unknown',
      nationality: startRow?.nationality ?? 'Unknown',
      series,
    };
  });
}

/** One step per season after the start, each holding's move that season. */
export function yearSteps(holdings: Holding[], startYear: number, finalYear: number): YearStep[] {
  const steps: YearStep[] = [];
  const last = holdings.map(h => h.price);
  for (let y = startYear + 1; y <= finalYear; y += 1) {
    const k = y - startYear;
    const lines: StepLine[] = holdings.map((h, i) => {
      const value = h.series[k] ?? null;
      const line = { holding: i, value, prev: last[i] };
      if (value !== null) last[i] = value;
      return line;
    });
    const known = lines.filter(l => l.value !== null).length;
    const total = lines.reduce((s, l) => s + (l.value ?? 0), 0);
    steps.push({ year: y, lines, known, total });
  }
  return steps;
}

/* ---------------- scoring ---------------- */

export interface CampaignResult {
  spend: number;
  /** What the eleven are worth in the final year. */
  finalValue: number;
  /** The return on the WHOLE wallet, not on the part you chose to deploy. */
  growth: number;
  /** The most and the least the same 200M could have been worth. */
  bestValue: number;
  worstValue: number;
  score: number;
}

export function candidateRatio(c: StockCard): number {
  return c.final / c.price;
}

/**
 * ROUND 434: THE SCORE USED TO BE A SPEND RATIO AND THAT MADE INVESTING A
 * MISTAKE.
 *
 * It placed finalValue / SPEND between the best and worst per-slot ratios, so
 * the denominator was the money you chose to deploy rather than the money you
 * were handed. Every pound you put to work made the denominator bigger, which
 * meant the winning play was to keep the wallet shut. Measured over 120 seeded
 * campaigns against the real rows: the cheapest possible XI, 25.4M of a 200M
 * wallet, scored 95.2 out of 100 while a random picker scored 20.5 and an XI
 * that spent the lot scored 13.2.
 *
 * So the score is the return on the whole wallet. Your portfolio's final
 * year value is placed between the WORST and the BEST eleven that the same
 * budget could actually have bought out of the same offers. Money you never
 * spend buys nothing, which is what makes it an investing game: 100 means you
 * played the 200M perfectly, 0 means you could not have done worse with it.
 */

interface Reach { spend: number; value: number; picks: StockCard[] }

/**
 * Every XI the wallet can reach, kept as a frontier of (spend, value) pairs
 * that nothing else beats on both counts. Slot by slot, so it is an exact
 * search rather than a greedy one: the eleven choices interact through the
 * budget, and picking the dearest card early really can strand a later slot.
 *
 * sign +1 keeps the most valuable portfolio at each spend, -1 the least.
 */
function reachable(campaign: Campaign, sign: 1 | -1): Reach[] {
  let points: Reach[] = [{ spend: 0, value: 0, picks: [] }];
  for (const slot of campaign.slots) {
    const grown: Reach[] = [];
    for (const p of points) {
      for (const c of slot.candidates) {
        const spend = p.spend + c.price;
        if (spend > campaign.budget) continue;
        grown.push({ spend, value: p.value + c.final, picks: [...p.picks, c] });
      }
    }
    if (grown.length === 0) {
      /* The punt in every slot is drawn under PUNT_CEILING precisely so eleven
         of them always fit, and simStockLive holds that against the live pool,
         so this cannot happen. It is here because a result screen that throws
         is worse than one that scores a stranded run off its cheapest chain. */
      const cheapest = [...slot.candidates].sort((a, b) => a.price - b.price)[0];
      const from = points.reduce((lo, p) => (p.spend < lo.spend ? p : lo), points[0]);
      grown.push({ spend: from.spend + cheapest.price, value: from.value + cheapest.final, picks: [...from.picks, cheapest] });
    }
    grown.sort((a, b) => a.spend - b.spend || sign * (b.value - a.value));
    const kept: Reach[] = [];
    let edge = sign > 0 ? -Infinity : Infinity;
    for (const p of grown) {
      if (sign > 0 ? p.value > edge : p.value < edge) { kept.push(p); edge = p.value; }
    }
    points = kept;
  }
  return points;
}

/** The most valuable XI the budget could have bought from these offers. */
export function bestAffordableXI(campaign: Campaign): StockCard[] {
  return reachable(campaign, 1).reduce((best, p) => (p.value > best.value ? p : best)).picks;
}

/** The least valuable one, which is the floor the score sits on. */
export function worstAffordableXI(campaign: Campaign): StockCard[] {
  return reachable(campaign, -1).reduce((worst, p) => (p.value < worst.value ? p : worst)).picks;
}

export function scoreCampaign(campaign: Campaign, picks: StockCard[]): CampaignResult {
  const spend = picks.reduce((s, c) => s + c.price, 0);
  const finalValue = picks.reduce((s, c) => s + c.final, 0);
  const bestValue = bestAffordableXI(campaign).reduce((s, c) => s + c.final, 0);
  const worstValue = worstAffordableXI(campaign).reduce((s, c) => s + c.final, 0);
  const growth = campaign.budget > 0 ? finalValue / campaign.budget : 0;
  const score = bestValue === worstValue
    ? 100
    : Math.max(0, Math.min(100, Math.round((100 * (finalValue - worstValue)) / (bestValue - worstValue))));
  return { spend, finalValue, growth, bestValue, worstValue, score };
}

/* ---------------- the finished run, and the daily record ---------------- */

/** Everything the result screen needs, so a finished daily comes back from
 *  storage without a network call and is byte identical to the fresh one. */
export interface StockFinish extends CampaignResult {
  startYear: number;
  finalYear: number;
  budget: number;
  holdings: Holding[];
}

export function finishCampaign(campaign: Campaign, picks: StockCard[], holdings: Holding[]): StockFinish {
  return { ...scoreCampaign(campaign, picks), startYear: campaign.startYear, finalYear: campaign.finalYear, budget: campaign.budget, holdings };
}

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const str = (v: unknown): v is string => typeof v === 'string';

function validateFinish(fields: Record<string, unknown>): StockFinish | null {
  const f = fields as Partial<StockFinish>;
  if (!num(f.startYear) || !num(f.finalYear) || !num(f.budget) || !num(f.spend) || !num(f.finalValue)
    || !num(f.growth) || !num(f.bestValue) || !num(f.worstValue) || !num(f.score)) return null;
  if (!Array.isArray(f.holdings) || f.holdings.length !== STOCK_FORMATION.slots.length) return null;
  const span = f.finalYear - f.startYear + 1;
  if (span < 2) return null;
  for (const h of f.holdings as unknown[]) {
    if (!h || typeof h !== 'object') return null;
    const x = h as Partial<Holding>;
    if (!str(x.slot) || !str(x.position) || !str(x.name) || !str(x.club) || !str(x.nationality)) return null;
    if (!num(x.price) || !num(x.final) || !(x.age === null || num(x.age))) return null;
    if (!Array.isArray(x.series) || x.series.length !== span || !x.series.every(v => v === null || num(v))) return null;
  }
  return f as StockFinish;
}

export function loadDailyResult(date: string): StockFinish | null {
  return readDailyRecord(STOCK_SLUG, date, validateFinish);
}

export function saveDailyResult(date: string, finish: StockFinish): void {
  writeDailyRecord(STOCK_SLUG, date, { ...finish });
}

/* ---------------- formatting ---------------- */

export function formatMoney(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${Math.round(v / 1e6)}M`;
  return `$${Math.round(v / 1e3)}K`;
}

export function formatPct(r: number): string {
  const pct = r * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}
