import { supabase } from '@/integrations/supabase/client';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { getTodayET, dailyPrngSeed } from '@/lib/dateUtils';
import { FORMATIONS, normalizePosition } from '@/lib/squadDeal';
import type { FormationSlot } from '@/lib/squadDeal';

/**
 * Player Stock Market, rebuilt in Round 329 to the owner's spec from the
 * 08-28 review, the "invested in footballers using only their stats"
 * format: "start seasons back, move year by year, show stats only, never
 * name, country or club, buy position by position until a full XI."
 *
 * THE CAMPAIGN. You start six seasons back with a 200M wallet and the
 * 4-3-3's eleven slots to fill, two buys a year. Each buy deals four
 * ANONYMOUS candidates who fit the slot: you see the position, the age,
 * the three year market value trajectory and the last two seasons of
 * goals and assists, and NOTHING that names them, no name, no country,
 * no club. You pay a candidate's real market value at the offer year.
 * When the eleventh buy lands, the campaign jumps to the present, every
 * card turns over, and your portfolio is worth whatever those careers
 * really became.
 *
 * DATA LAW. Every number is a real row from player_market_values (values,
 * goals, assists, 2004 to 2026); nothing is authored. Candidates are
 * filtered to careers the data tracks through to the final year, which is
 * stated in the guide: you are picking among players whose story the
 * table can actually finish, and a value can still crater. The engine is
 * split so assembleCampaign is PURE over injected rows, which is what the
 * harness drives with synthetic fixtures; fetchCampaignRows owns the two
 * real queries.
 *
 * SCORING (rewritten in Round 434, see the long note above scoreCampaign).
 * Your return is measured on the whole 200M, not on the slice of it you
 * chose to spend, and your portfolio's final year value is placed between
 * the worst and the best eleven that the same 200M could really have
 * bought out of the same offers. 100 means you played the wallet
 * perfectly, 0 means you could not have done worse with it, and cash you
 * never spend buys nothing.
 */

export const STOCK_BUDGET = 200_000_000;
/** Every slot's punt aims at or under this, so eleven punts (88M at worst)
 *  always fit the 200M wallet with room over. */
export const PUNT_CEILING = 8_000_000;
export const CANDIDATES_PER_SLOT = 4;
export const FINAL_YEAR = 2026;
export const START_YEARS = [2016, 2017, 2018, 2019, 2020] as const;
export const STOCK_FORMATION = FORMATIONS[0]; /* 4-3-3 */

export interface AnonCandidate {
  /** Hidden until the reveal. */
  name: string;
  club: string;
  nationality: string;
  /** Shown while buying. */
  position: string;
  age: number;
  /** Market value trajectory, oldest first, ending at the offer year. */
  series: { year: number; value: number }[];
  /** Goals and assists, the two seasons ending at the offer year. Keepers
   *  legitimately show zeros; the trajectory is their story. */
  output: { year: number; goals: number; assists: number }[];
  /** What you pay: the real market value at the offer year. */
  price: number;
  /** The real market value at FINAL_YEAR. Hidden until the reveal. */
  final: number;
}

export interface CampaignSlot {
  slot: FormationSlot;
  offerYear: number;
  candidates: AnonCandidate[];
}

export interface Campaign {
  startYear: number;
  finalYear: number;
  budget: number;
  slots: CampaignSlot[];
}

export interface MarketRow {
  player_name: string;
  club: string | null;
  position: string | null;
  age: number | null;
  nationality: string | null;
  year: number;
  market_value_usd: number | null;
  goals: number | null;
  assists: number | null;
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
     A day whose old seed was positive keeps its campaign, because >>> 0 is the
     identity there. The 33 days a year whose old seed was a negative multiple
     of 5 also worked, through START_YEARS[-0], and those move from 2016 to
     2017. Measured over the year from 2026-09-03: 161 negative seeds, 128
     broken days fixed, 33 working days re-dealt, 204 days untouched.
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
     `year=in.(NaN)` and got a 400. The player saw "Couldn't open the market
     right now", which reads like a network problem and is not one.
     Part three of this round normalises the seed in dailyCampaignSeed, so this
     is unreachable from Daily mode. It is guarded anyway because the failure mode is
     a silent 400 rather than a visible error: the mode simply refuses to start
     and nothing on screen says why. Wrapping the modulo keeps a stray seed in
     range instead, and a non finite one falls back to the first year. */
  const n = START_YEARS.length;
  if (!Number.isFinite(seed)) return START_YEARS[0];
  return START_YEARS[((Math.trunc(seed) % n) + n) % n];
}

/** Slot i is offered in year startYear + floor(i / 2): two buys a season,
 *  eleven buys across six calendar years. */
export function offerYearFor(startYear: number, slotIndex: number): number {
  return startYear + Math.floor(slotIndex / 2);
}

/**
 * PURE assembly over injected rows. Per slot, in formation order: the
 * candidates are players whose normalized position the slot accepts, who
 * have a value at the offer year AND at the final year, drawn seeded from
 * value bands (one expensive, two middling, one punt) so the wallet always
 * has real decisions, deduped across the whole campaign. The punt band
 * also guarantees every slot keeps at least one candidate a nearly empty
 * wallet can still afford.
 */
export function assembleCampaign(rows: MarketRow[], seed: number): Campaign | null {
  const startYear = startYearFor(seed);
  const rng = mulberry32(seed);

  /* (name|year) -> best row for that year */
  const byNameYear = new Map<string, MarketRow>();
  for (const r of rows) {
    if (!r.player_name || !r.market_value_usd) continue;
    const k = `${r.player_name}|${r.year}`;
    const prev = byNameYear.get(k);
    if (!prev || (prev.market_value_usd ?? 0) < r.market_value_usd) byNameYear.set(k, r);
  }
  const at = (name: string, year: number) => byNameYear.get(`${name}|${year}`);

  const used = new Set<string>();
  const slots: CampaignSlot[] = [];
  for (let i = 0; i < STOCK_FORMATION.slots.length; i += 1) {
    const slot = STOCK_FORMATION.slots[i];
    const offerYear = offerYearFor(startYear, i);
    const fits = [...byNameYear.values()]
      .filter(r => r.year === offerYear
        && !used.has(r.player_name)
        && (r.market_value_usd ?? 0) >= 2_000_000
        && at(r.player_name, FINAL_YEAR) !== undefined)
      .filter(r => {
        const pos = normalizePosition(r.position || '');
        return pos !== null && (slot.allowed as string[]).includes(pos);
      })
      .sort((a, b) => (b.market_value_usd ?? 0) - (a.market_value_usd ?? 0));
    if (fits.length < CANDIDATES_PER_SLOT) return null;

    const band = (lo: number, hi: number): MarketRow => {
      const a = Math.floor(lo * fits.length);
      const b = Math.max(a + 1, Math.floor(hi * fits.length));
      const pool = fits.slice(a, b).filter(r => !used.has(r.player_name));
      const src = pool.length ? pool : fits.filter(r => !used.has(r.player_name));
      return src[Math.floor(rng() * src.length)];
    };
    const picked: MarketRow[] = [];
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
       the harness proves the arithmetic over hundreds of seeds). */
    const cheapFirst = fits.filter(r => !used.has(r.player_name)).sort((a, b) => (a.market_value_usd ?? 0) - (b.market_value_usd ?? 0));
    const puntPool = cheapFirst.filter(r => (r.market_value_usd ?? 0) <= PUNT_CEILING);
    const punt = (puntPool.length ? puntPool : cheapFirst)[Math.floor(rng() * Math.max(1, Math.min(6, (puntPool.length ? puntPool : cheapFirst).length)))];
    if (punt && !picked.includes(punt)) { picked.push(punt); used.add(punt.player_name); }
    if (picked.length < CANDIDATES_PER_SLOT) return null;

    const candidates: AnonCandidate[] = picked.map(r => {
      const series: { year: number; value: number }[] = [];
      for (let y = offerYear - 2; y <= offerYear; y += 1) {
        const row = at(r.player_name, y);
        if (row?.market_value_usd) series.push({ year: y, value: row.market_value_usd });
      }
      const output: { year: number; goals: number; assists: number }[] = [];
      for (let y = offerYear - 1; y <= offerYear; y += 1) {
        const row = at(r.player_name, y);
        if (row) output.push({ year: y, goals: row.goals ?? 0, assists: row.assists ?? 0 });
      }
      return {
        name: r.player_name,
        club: r.club ?? 'Unknown',
        nationality: r.nationality ?? 'Unknown',
        position: normalizePosition(r.position || '') ?? 'CM',
        age: r.age ?? 0,
        series,
        output,
        price: r.market_value_usd!,
        final: at(r.player_name, FINAL_YEAR)!.market_value_usd!,
      };
    });
    slots.push({ slot, offerYear, candidates });
  }
  return { startYear, finalYear: FINAL_YEAR, budget: STOCK_BUDGET, slots };
}

/** The two real queries. Pool rows for the six offer years, then full
 *  histories for every pooled name so series, output and finals resolve. */
export async function fetchCampaignRows(startYear: number): Promise<MarketRow[] | null> {
  try {
    const offerYears = Array.from({ length: 6 }, (_, i) => startYear + i);
    const COLUMNS = 'player_name, club, position, age, nationality, year, market_value_usd, goals, assists';

    /* ROUND 364: THIS USED TO ASK FOR 4,000 ROWS AND SILENTLY GET 1,000, WHICH
       BROKE THE GAME'S ECONOMY.
       PostgREST caps every select at 1,000 rows no matter what .limit() says.
       Measured against live data: Content-Range 0-999/24939. Because the sort
       is value descending, the query asked for players from $2,000,000 up and
       the cheapest row it could ever return was $38,000,000, so 73 percent of
       the intended pool was thrown away (18,211 of those 24,939 rows sit in the
       $2m to $8m band). The consequence was not a thin pool, it was a broken
       promise: PUNT_CEILING is $8,000,000, so the punt filter below could never
       match anything and the code silently substituted the cheapest available
       instead. The comment on the punt says eleven punts always fit inside the
       wallet and a run can never strand a slot unaffordable; eleven punts at
       $38m is $418m against a $200m budget, so that guarantee was false against
       live data. simStockCampaign could not see any of it, because it drives
       assembleCampaign with injected fixtures that do contain cheap players.
       Paged properly now, through the same helper the rest of the site uses.
       The year span covers startYear - 2 so the three year price series each
       offer draws has its history. */
    const seriesYears = [startYear - 2, startYear - 1, ...offerYears];
    const { data: poolRows, error: e1 } = await fetchAllRows<MarketRow>((from, to) =>
      supabase
        .from('player_market_values')
        .select(COLUMNS)
        .in('year', seriesYears)
        .gte('market_value_usd', 2_000_000)
        /* Deterministic and unique: fetchAllRows pages with .range(), so an
           ambiguous order can overlap or skip rows between pages. */
        .order('player_name', { ascending: true })
        .order('year', { ascending: true })
        .range(from, to),
    );
    if (e1 || !poolRows || poolRows.length < 200) return null;

    /* The final year decides who is eligible at all (see the at(name,
       FINAL_YEAR) test in assembleCampaign) and supplies the closing price.
       Fetched as a whole year rather than filtered to a list of names: the old
       code capped that list at 900 of the pool's 7,525 distinct names, so even
       with the paging fixed above, every cheap player would have failed the
       eligibility test and been dropped again. */
    const { data: finalRows, error: e2 } = await fetchAllRows<MarketRow>((from, to) =>
      supabase
        .from('player_market_values')
        .select(COLUMNS)
        .eq('year', FINAL_YEAR)
        .order('player_name', { ascending: true })
        .range(from, to),
    );
    if (e2 || !finalRows) return null;
    return [...poolRows, ...finalRows] as MarketRow[];
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

export function canAfford(campaign: Campaign, slotIndex: number, candidate: AnonCandidate, remaining: number): boolean {
  return candidate.price + reserveAfter(campaign, slotIndex) <= remaining;
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

export function candidateRatio(c: AnonCandidate): number {
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
 * that spent the lot scored 13.2. The two stats the card prints beside the
 * price were worse than useless against that rule, landing on the card the
 * score rewarded 22.6 and 18.8 percent of the time against 40.7 for guessing.
 * The game is called Invest on Stats Alone.
 *
 * So the score is now the return on the whole wallet. Your portfolio's final
 * year value is placed between the WORST and the BEST eleven that the same
 * budget could actually have bought out of the same offers. Money you never
 * spend buys nothing, which is what makes it an investing game: 100 means you
 * played the 200M perfectly, 0 means you could not have done worse with it.
 */

interface Reach { spend: number; value: number; picks: AnonCandidate[] }

/**
 * Every XI the wallet can reach, kept as a frontier of (spend, value) pairs
 * that nothing else beats on both counts. Slot by slot, so it is an exact
 * search rather than a greedy one: the eleven choices interact through the
 * budget, and picking the dearest card early really can strand a later slot.
 *
 * sign +1 keeps the most valuable portfolio at each spend, -1 the least.
 * The frontier stays small because a point only survives if it beats every
 * cheaper one (measured over 400 real campaigns: 118 points at the widest).
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
export function bestAffordableXI(campaign: Campaign): AnonCandidate[] {
  return reachable(campaign, 1).reduce((best, p) => (p.value > best.value ? p : best)).picks;
}

/** The least valuable one, which is the floor the score sits on. */
export function worstAffordableXI(campaign: Campaign): AnonCandidate[] {
  return reachable(campaign, -1).reduce((worst, p) => (p.value < worst.value ? p : worst)).picks;
}

export function scoreCampaign(campaign: Campaign, picks: AnonCandidate[]): CampaignResult {
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
