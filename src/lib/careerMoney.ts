/* ─── Round 469: the money app, one engine for every career ─────────────────

   Round 134 built Soccer Career a market: a savings account that pays a small
   safe rate, five things with a price that moves every season whether you are
   watching or not, a statement, a card school and the game he plays on his
   own phone. Every rule in it was measured over hundreds of careers by
   scripts/simMoney.mjs and it has held since.

   The NFL career had none of it. Its bank was one number and a shop, and a
   player moving from the flagship to the football version found the money
   half of the game missing. His instruction (CLAUDE.md, 2026-09-04): a new
   sport is DATA plus that sport's events, not a new engine. So the rules
   moved here, verbatim, and the two things that were actually soccer about
   them became data a sport hands in:

     MoneyHost   the four fields a save must carry: cash, morale, the season
                 list and the money slot. Both careers already had them.
     MoneySport  the currency, where the seed and the year and the bill come
                 from, what the card losses cost you at home, and the words
                 for the two small games. Soccer plays cards on the bus and
                 nudges karma; the NFL plays them in the locker room and
                 nudges the fanbase.

   soccerMoney.ts is a thin wrapper that binds the soccer descriptor and keeps
   every export name the engine, the phone screens and the harnesses import.
   nflCareerMoney.ts binds the NFL one. Neither carries a rule of its own, and
   scripts/simCareerParity.mjs fails if either grows one back.

   THE FIVE RULES THIS FILE LIVES BY, unchanged from Round 134

   1. Its own random stream. MoneyState carries its own seed so that a trade
      never shifts the world sim's stream. Nothing in this file ever calls
      Math.random.

   2. Prices mean revert toward a moving anchor. A pure random walk cannot be
      timed; pulling the price back toward an anchor is what makes buying a
      dip a real decision and holding a spike a real mistake.

   3. Nothing here is a printer. Fees on both sides of a trade, a savings rate
      below the fund's average, volatility drag on the wild stuff, and a
      lifestyle bill that counts money hidden in the vault.

   4. Bounded storage. Prices keep MAX_HISTORY points, the ledger keeps
      MAX_LEDGER entries and holdings can only ever be as many as there are
      assets. MoneyState does not grow with career length.

   5. Old saves. ensureMoney is pure and repairs anything, so a save from
      before the market existed opens on any screen, at any phase, and starts
      its market at par on the season it is on.
*/

/* ─── storage caps ───────────────────────────────────────────────────────── */

/** Price points kept per asset. Eight seasons is the sparkline plus enough
 *  history to see whether the thing you are holding is on the way up or on
 *  the way back down, and it is the whole reason this state stops growing. */
export const MAX_HISTORY = 8;

/** Transactions kept. A phone screen holds about this many without turning
 *  into a page you scroll. Everything older is gone rather than hidden,
 *  because a ledger nobody can see is just save size. */
export const MAX_LEDGER = 12;

/** Cash that can never be invested away, so a season's bills always have
 *  something to land on. */
export const CASH_FLOOR = 0.1;

/** Smallest trade worth writing down. */
export const MIN_TRADE = 0.05;

/** Both sides of every trade. Small, but it is what stops flipping the same
 *  asset back and forth every season from being free money. */
export const TRADE_FEE = 0.01;

/** What savings pays per season. Below the fund's average on purpose. */
export const SAVINGS_RATE = 0.025;

/* ─── the market ─────────────────────────────────────────────────────────── */

export type AssetKind = "fund" | "property" | "share" | "coin";

export interface AssetDef {
  id: string;
  name: string;
  emoji: string;
  kind: AssetKind;
  /** One line under the name. Plain, no promises. */
  blurb: string;
  /** Long run growth of the anchor price, per season. */
  drift: number;
  /** Size of a one season shock, as a fraction of price. */
  vol: number;
  /** How hard the price is pulled back to the anchor, 0 to 1. */
  pull: number;
  /** Player facing risk word. */
  risk: "steady" | "bumpy" | "wild";
}

/* Every name here is invented. No real fund, exchange, company or coin is
   named anywhere in this file, and none of these are meant to be a stand in
   for a particular real one. The same five trade in every sport: the market
   is the same market whichever game you open it from. */
export const ASSETS: AssetDef[] = [
  {
    id: "ladder", name: "Steady Ladder Fund", emoji: "📗", kind: "fund",
    blurb: "A bit of everything. Boring on purpose.",
    drift: 0.055, vol: 0.05, pull: 0.55, risk: "steady",
  },
  {
    id: "bricks", name: "Old Town Bricks", emoji: "🧱", kind: "property",
    blurb: "Flats above the shops back home.",
    drift: 0.04, vol: 0.11, pull: 0.4, risk: "steady",
  },
  {
    id: "cleats", name: "Cleatworks", emoji: "👟", kind: "share",
    blurb: "They make boots. Half the league wears them.",
    drift: 0.032, vol: 0.17, pull: 0.35, risk: "bumpy",
  },
  {
    id: "screens", name: "Matchday Screens", emoji: "📺", kind: "share",
    blurb: "Sells the rights, sells the ads, sells the highlights.",
    drift: 0.025, vol: 0.22, pull: 0.32, risk: "bumpy",
  },
  {
    id: "spark", name: "SparkCoin", emoji: "⚡", kind: "coin",
    blurb: "A coin your mate's cousin made. Halves as often as it doubles.",
    drift: 0.01, vol: 0.5, pull: 0.25, risk: "wild",
  },
];

export const ASSET_BY_ID: Record<string, AssetDef> =
  Object.fromEntries(ASSETS.map(a => [a.id, a]));

/** Price index. 100 is where everything starts, so a price reads as a
 *  percentage of what it opened at and nobody has to do arithmetic. */
export const PAR = 100;

/* ─── state ──────────────────────────────────────────────────────────────── */

/** One line of the statement. Short keys, this lives in localStorage. */
export interface LedgerEntry {
  /** Season year. */
  y: number;
  /** What happened, already written out. */
  t: string;
  /** Signed money, in millions. Positive is into your pocket. */
  a: number;
}

export interface MoneyState {
  /** Own RNG so trading never disturbs the world sim's stream. */
  seed: number;
  /** Savings balance, millions. */
  vault: number;
  /** Units held per asset. A unit is worth price/100 million. */
  hold: Record<string, number>;
  /** What you paid for what you are holding, millions, per asset. */
  cost: Record<string, number>;
  /** Today's price per asset. */
  price: Record<string, number>;
  /** Last MAX_HISTORY prices, oldest first, today last. */
  hist: Record<string, number[]>;
  /** Statement, newest last, capped at MAX_LEDGER. */
  log: LedgerEntry[];
  /** Last season the market moved, so it moves once per season. */
  year: number;
  /** Seasons the market has run, which is what the anchor drifts on. */
  age: number;
  /** Realised profit and realised loss over the whole career, millions. */
  won: number;
  lost: number;
  /** The card school. See cardsPlay. */
  cPlays: number;
  cNet: number;
  cYear: number;
  cShut: boolean;
  /** The game he plays on his own phone. */
  aYear: number;
  aBest: number;
  aPlays: number;
}

/* ─── what a sport hands in ──────────────────────────────────────────────── */

/**
 * The fields a save must carry for the money app to run on it. Both careers
 * already had all four; nothing was added to either save shape for this.
 * netWorth is optional because the US careers declared it so in Round 56, and
 * an absent balance reads as nothing in the account.
 */
export interface MoneyHost {
  netWorth?: number;
  morale: number;
  seasons: { year: number }[];
  money?: MoneyState;
}

/** The words the two small games print. Soccer and the NFL share every rule
 *  and none of the texture. */
export interface MoneyWords {
  cards: {
    /** Ledger text, under 40 characters. */
    ledger: string;
    /** "the lads" / "the guys". */
    crew: string;
    /** Same, opening a sentence. */
    crewCap: string;
    /** "on the bus" / "in the locker room". */
    where: string;
    /** "on that bus" / "in that card game", after "lost". */
    thatPlace: string;
    /** "Next away trip." / "Next road trip." */
    next: string;
  };
  arcade: {
    ledger: string;
    /** "the ball quiz". */
    name: string;
  };
}

export interface MoneySport<S extends MoneyHost> {
  /** Printed on every amount: "€" for the flagship, "$" for the NFL. */
  currency: string;
  /** A stable seed for a save that has never had one, derived from the save
   *  itself and never from Math.random, so opening the bank twice on the
   *  same save shows the same market both times. */
  seedOf: (s: S) => number;
  /** The in-world year the save is on, for dating statement lines. */
  yearOf: (s: S) => number;
  /** The season's living bill in millions, for the buffer rule. */
  billOf: (s: S) => number;
  /** What it costs at home when the card losses get noticed. Soccer nudges
   *  karma, the US careers nudge the fanbase. */
  shame: (s: S) => void;
  words: MoneyWords;
}

/* ─── rng, deliberately off the global stream ────────────────────────────── */

function nextSeed(s: number): number { return (s * 1664525 + 1013904223) >>> 0; }
class Rng {
  constructor(private s: number) { this.s = s >>> 0 || 1; }
  next(): number { this.s = nextSeed(this.s); return this.s / 4294967296; }
  get state(): number { return this.s; }
  int(lo: number, hi: number): number { return lo + Math.floor(this.next() * (hi - lo + 1)); }
  /** Roughly normal, mean 0, standard deviation 1. Three uniforms is plenty
   *  for a price shock and it costs nothing. */
  gauss(): number { return (this.next() + this.next() + this.next() - 1.5) / 0.5; }
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const r2 = (v: number) => Math.round(v * 100) / 100;
const r4 = (v: number) => Math.round(v * 10000) / 10000;

/** A name hashed the way the soccer seed always was, so an old flagship save
 *  opens on the exact market it had before this file existed. */
export function seedFromName(name: string, salt: number): number {
  const born = (name || "x").split("").reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return born ^ (salt * 2654435761);
}

/* ─── repair, pure ───────────────────────────────────────────────────────── */

function blankMoney(seed: number): MoneyState {
  const price: Record<string, number> = {};
  const hist: Record<string, number[]> = {};
  const hold: Record<string, number> = {};
  const cost: Record<string, number> = {};
  for (const a of ASSETS) {
    price[a.id] = PAR;
    hist[a.id] = [PAR];
    hold[a.id] = 0;
    cost[a.id] = 0;
  }
  return {
    seed: seed >>> 0 || 1, vault: 0, hold, cost, price, hist, log: [],
    year: 0, age: 0, won: 0, lost: 0,
    cPlays: 0, cNet: 0, cYear: 0, cShut: false,
    aYear: 0, aBest: 0, aPlays: 0,
  };
}

const num = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

/**
 * A valid MoneyState for any save, old or new, WITHOUT touching the career
 * passed in. The screens call this to render a save that has never ticked;
 * the engine calls it before every write.
 */
export function ensureMoney<S extends MoneyHost>(s: S, sport: MoneySport<S>): MoneyState {
  const raw = s.money as Partial<MoneyState> | undefined;
  const out = blankMoney(sport.seedOf(s));
  if (!raw || typeof raw !== "object") return out;
  out.seed = num(raw.seed, out.seed) >>> 0 || 1;
  out.vault = Math.max(0, r2(num(raw.vault, 0)));
  out.year = Math.round(num(raw.year, 0));
  out.age = Math.max(0, Math.round(num(raw.age, 0)));
  out.won = Math.max(0, r2(num(raw.won, 0)));
  out.lost = Math.max(0, r2(num(raw.lost, 0)));
  out.cPlays = Math.max(0, Math.round(num(raw.cPlays, 0)));
  out.cNet = r2(num(raw.cNet, 0));
  out.cYear = Math.round(num(raw.cYear, 0));
  out.cShut = raw.cShut === true;
  out.aYear = Math.round(num(raw.aYear, 0));
  out.aBest = clamp(Math.round(num(raw.aBest, 0)), 0, 3);
  out.aPlays = Math.max(0, Math.round(num(raw.aPlays, 0)));
  for (const a of ASSETS) {
    const p = num(raw.price?.[a.id], PAR);
    out.price[a.id] = clamp(r2(p), 1, PAR * 40);
    out.hold[a.id] = Math.max(0, r4(num(raw.hold?.[a.id], 0)));
    out.cost[a.id] = Math.max(0, r2(num(raw.cost?.[a.id], 0)));
    const h = Array.isArray(raw.hist?.[a.id]) ? raw.hist[a.id].filter(v => typeof v === "number" && Number.isFinite(v)) : [];
    out.hist[a.id] = (h.length ? h : [out.price[a.id]]).slice(-MAX_HISTORY).map(v => clamp(r2(v), 1, PAR * 40));
  }
  const log = Array.isArray(raw.log) ? raw.log : [];
  out.log = log
    .filter(e => e && typeof e === "object" && typeof e.t === "string")
    .slice(-MAX_LEDGER)
    .map(e => ({ y: Math.round(num(e.y, 0)), t: String(e.t).slice(0, 40), a: r2(num(e.a, 0)) }));
  return out;
}

function writeMoney(s: MoneyHost, m: MoneyState): void {
  s.money = m;
}

/* Round 437: the in-world year, which is not the same thing as the last season
   played. The season list stops growing at retirement, so on its own it would
   date everything from the year he hung the boots up however many seasons in
   the dugout, the studio or the boardroom came afterwards. The market's own
   clock is what moves after that, and during a playing career the two are the
   same number. */
const currentYear = <S extends MoneyHost>(s: S, m: MoneyState, sport: MoneySport<S>): number =>
  Math.max(sport.yearOf(s), m.year);

const cashOf = (s: MoneyHost): number => s.netWorth ?? 0;

function note(m: MoneyState, year: number, text: string, amount: number): void {
  m.log.push({ y: year, t: text.slice(0, 40), a: r2(amount) });
  if (m.log.length > MAX_LEDGER) m.log.splice(0, m.log.length - MAX_LEDGER);
}

/* ─── reading the market ─────────────────────────────────────────────────── */

/** What one asset holding is worth today, in millions. */
export function holdingValue(m: MoneyState, id: string): number {
  return r2((m.hold[id] ?? 0) * (m.price[id] ?? PAR) / PAR);
}

/** Everything invested plus everything in savings, in millions. */
export function moneyWealth<S extends MoneyHost>(s: S, sport: MoneySport<S>): number {
  const m = ensureMoney(s, sport);
  let total = m.vault;
  for (const a of ASSETS) total += holdingValue(m, a.id);
  return r2(total);
}

/** Total value of the market holdings only. */
export function investedValue(m: MoneyState): number {
  let total = 0;
  for (const a of ASSETS) total += holdingValue(m, a.id);
  return r2(total);
}

/** The anchor a price is being pulled toward right now. */
export function anchorOf(def: AssetDef, age: number): number {
  return PAR * Math.pow(1 + def.drift, age);
}

/**
 * Where today's price sits against what this thing usually goes for. This is
 * the whole timing signal and it is deliberately honest rather than clever:
 * it tells you the price is low, it does NOT tell you the price is done
 * falling, and for the wild one it very often is not.
 */
export function priceRead(m: MoneyState, id: string): { label: string; tone: string; ratio: number } {
  const def = ASSET_BY_ID[id];
  const ratio = (m.price[id] ?? PAR) / anchorOf(def, m.age);
  if (ratio <= 0.72) return { label: "way under what it usually goes for", tone: "text-emerald-400", ratio };
  if (ratio <= 0.9) return { label: "cheaper than usual", tone: "text-emerald-300", ratio };
  if (ratio < 1.12) return { label: "about what it usually goes for", tone: "text-white/60", ratio };
  if (ratio < 1.35) return { label: "dearer than usual", tone: "text-amber-400", ratio };
  return { label: "way over what it usually goes for", tone: "text-red-400", ratio };
}

/** Season on season move of a price, as a percentage. */
export function lastMove(m: MoneyState, id: string): number {
  const h = m.hist[id] ?? [];
  if (h.length < 2) return 0;
  const prev = h[h.length - 2];
  if (!prev) return 0;
  return Math.round(((h[h.length - 1] - prev) / prev) * 1000) / 10;
}

/** Profit or loss on what you are holding right now, in millions. */
export function unrealised(m: MoneyState, id: string): number {
  const held = m.hold[id] ?? 0;
  if (held <= 0) return 0;
  return r2(holdingValue(m, id) - (m.cost[id] ?? 0));
}

/* ─── the season ─────────────────────────────────────────────────────────── */

export interface MoneyTick {
  /** Lines worth putting in the season events feed. */
  events: string[];
}

/**
 * One season of market. Called once per season from the engine, after the
 * wages and the lifestyle bill have landed, so a shortfall can be covered out
 * of savings before anything else sees a negative balance.
 */
export function moneySeasonTick<S extends MoneyHost>(s: S, year: number, sport: MoneySport<S>): MoneyTick {
  const m = ensureMoney(s, sport);
  const fmt = (v: number) => fmtMoney(v, sport.currency);
  const events: string[] = [];
  if (m.year === year) { writeMoney(s, m); return { events }; }
  m.year = year;
  m.age += 1;
  const rng = new Rng(m.seed);

  /* 1. Savings pays. Small, safe, and the only line in this whole file that
        cannot go the other way. */
  if (m.vault > 0) {
    const interest = r2(m.vault * SAVINGS_RATE);
    if (interest >= 0.01) {
      m.vault = r2(m.vault + interest);
      m.won = r2(m.won + interest);
      note(m, year, "Savings interest", interest);
    }
  }

  /* 2. Prices move, held or not. The pull toward the anchor is what makes a
        cheap price worth buying and an expensive one worth selling. */
  for (const def of ASSETS) {
    const anchor = anchorOf(def, m.age);
    const p = m.price[def.id] ?? PAR;
    const shocked = p * (1 + def.vol * rng.gauss());
    let next = shocked + def.pull * (anchor - shocked);
    next = clamp(next, anchor * 0.18, anchor * 3.4);
    next = clamp(r2(next), 3, PAR * 40);
    const before = p;
    m.price[def.id] = next;
    const h = m.hist[def.id] ?? [];
    h.push(next);
    if (h.length > MAX_HISTORY) h.splice(0, h.length - MAX_HISTORY);
    m.hist[def.id] = h;
    /* Only speak up about something you actually own, and only when it moved
       enough to matter. Two lines a season at the very most. */
    if ((m.hold[def.id] ?? 0) > 0 && events.length < 2) {
      const move = (next - before) / Math.max(before, 1);
      if (move >= 0.28) {
        events.push(`${def.emoji} ${def.name} jumped ${Math.round(move * 100)}%. Your stake is worth ${fmt(holdingValue(m, def.id))} now.`);
      } else if (move <= -0.25) {
        events.push(`${def.emoji} ${def.name} dropped ${Math.round(-move * 100)}%. Your stake is down to ${fmt(holdingValue(m, def.id))}.`);
      }
    }
  }

  /* 3. Nobody gets to go under because of a market. If the season's bills have
        put the balance below the floor, savings covers it, and if savings runs
        out the holdings get sold at whatever today's price is, worst first.
        That last part is a real punishment and it is meant to be: a forced
        sale at the bottom is exactly how a bad month turns into a bad decade
        in real life. It is also the reason a teenager cannot dig a hole here
        that the game will not climb back out of. */
  if (cashOf(s) < CASH_FLOOR) {
    let need = r2(CASH_FLOOR - cashOf(s));
    if (m.vault > 0 && need > 0) {
      const take = Math.min(m.vault, need);
      m.vault = r2(m.vault - take);
      s.netWorth = r2(cashOf(s) + take);
      need = r2(need - take);
      note(m, year, "Savings covered the bills", -take);
      events.push(`🏦 Bills came out of savings this season. ${fmt(take)} gone.`);
    }
    const order = ASSETS.slice().sort((a, b) => holdingValue(m, b.id) - holdingValue(m, a.id));
    for (const def of order) {
      if (need <= 0) break;
      const value = holdingValue(m, def.id);
      if (value <= 0.01) continue;
      const frac = Math.min(1, need / value);
      const got = sellUnits(m, def.id, frac, year, true);
      s.netWorth = r2(cashOf(s) + got);
      need = r2(need - got);
      events.push(`📉 Had to sell ${def.name} to cover the bills. ${fmt(got)} raised at a bad price.`);
    }
  }

  /* 4. Money is not a scoreboard. Being skint is stressful and having a real
        buffer is not, so both show up in his head. Pulled toward a level
        rather than added up season after season, so twenty seasons of either
        never rails him. */
  const buffer = m.vault + investedValue(m);
  const bill = Math.max(0.2, sport.billOf(s) || 0.2);
  if (cashOf(s) + buffer < bill * 0.75) {
    if (s.morale > 44) s.morale = clamp(Math.max(44, s.morale - 3), 0, 100);
  } else if (buffer >= bill * 3 && s.morale < 64) {
    s.morale = clamp(Math.min(64, s.morale + 2), 0, 100);
  }

  /* 5. The card school. Somebody who keeps sitting in and keeps losing hears
        about it at home, once, and then the invitations stop. */
  const w = sport.words.cards;
  if (m.cPlays >= 4 && m.cNet <= -0.12 && !m.cShut && m.cYear === year) {
    s.morale = clamp(s.morale - 3, 0, 100);
    sport.shame(s);
    events.push(`🃏 Somebody at home asked how much you have actually lost ${w.thatPlace}. You did not have a good answer.`);
  }
  if (m.cNet <= -0.5 && !m.cShut) {
    m.cShut = true;
    events.push(`🃏 ${w.crewCap} have stopped dealing you in. Honestly, that is probably for the best.`);
  }

  m.seed = rng.state;
  writeMoney(s, m);
  return { events };
}

/* ─── trading ────────────────────────────────────────────────────────────── */

/** Sell a fraction of a holding. Returns the cash raised, after the fee. */
function sellUnits(m: MoneyState, id: string, frac: number, year: number, forced = false): number {
  const held = m.hold[id] ?? 0;
  if (held <= 0) return 0;
  const f = clamp(frac, 0, 1);
  const units = r4(held * f);
  if (units <= 0) return 0;
  const gross = units * (m.price[id] ?? PAR) / PAR;
  const cash = r2(gross * (1 - TRADE_FEE));
  const basis = r2((m.cost[id] ?? 0) * f);
  m.hold[id] = r4(held - units);
  m.cost[id] = r2(Math.max(0, (m.cost[id] ?? 0) - basis));
  if (m.hold[id] <= 0.0001) { m.hold[id] = 0; m.cost[id] = 0; }
  const profit = r2(cash - basis);
  if (profit >= 0) m.won = r2(m.won + profit);
  else m.lost = r2(m.lost - profit);
  const def = ASSET_BY_ID[id];
  note(m, year, `${forced ? "Forced sale" : "Sold"} ${def.name}`, cash);
  return cash;
}

export type MoneyAction =
  | { t: "deposit"; amount: number }
  | { t: "withdraw"; amount: number }
  | { t: "buy"; id: string; amount: number }
  | { t: "sell"; id: string; frac: number }
  | { t: "cards"; stake: number }
  | { t: "arcade"; right: number };

export interface MoneyOutcome {
  ok: boolean;
  /** A line for the season events feed, when the action earned one. */
  event: string | null;
  /** A line for the toast, always written when ok. */
  toast: string | null;
}

const NO: MoneyOutcome = { ok: false, event: null, toast: null };

/** How much cash is actually free to move right now. */
export function spendable(s: MoneyHost): number {
  return r2(Math.max(0, cashOf(s) - CASH_FLOOR));
}

/** An amount in millions, printed with the sport's currency. */
export function fmtMoney(v: number, currency: string): string {
  const neg = v < 0;
  const a = Math.abs(v);
  const body = a >= 1000 ? `${currency}${(a / 1000).toFixed(2)}bn` : a >= 1 ? `${currency}${a.toFixed(1)}M` : `${currency}${Math.round(a * 1000)}k`;
  return neg ? `-${body}` : body;
}

/**
 * Every money tap that is not a shop purchase. Mutates the career copy the
 * engine hands over and refuses rather than throws when the numbers do not
 * work.
 */
export function moneyAct<S extends MoneyHost>(s: S, action: MoneyAction, sport: MoneySport<S>): MoneyOutcome {
  const m = ensureMoney(s, sport);
  const year = currentYear(s, m, sport);
  const fmt = (v: number) => fmtMoney(v, sport.currency);

  if (action.t === "deposit") {
    const amount = r2(Math.min(action.amount, spendable(s)));
    if (!(amount >= MIN_TRADE)) return NO;
    s.netWorth = r2(cashOf(s) - amount);
    m.vault = r2(m.vault + amount);
    note(m, year, "Into savings", -amount);
    writeMoney(s, m);
    return { ok: true, event: null, toast: `${fmt(amount)} into savings` };
  }

  if (action.t === "withdraw") {
    const amount = r2(Math.min(action.amount, m.vault));
    if (!(amount >= 0.01)) return NO;
    m.vault = r2(m.vault - amount);
    s.netWorth = r2(cashOf(s) + amount);
    note(m, year, "Out of savings", amount);
    writeMoney(s, m);
    return { ok: true, event: null, toast: `${fmt(amount)} out of savings` };
  }

  if (action.t === "buy") {
    const def = ASSET_BY_ID[action.id];
    if (!def) return NO;
    const amount = r2(Math.min(action.amount, spendable(s)));
    if (!(amount >= MIN_TRADE)) return NO;
    const price = m.price[def.id] ?? PAR;
    const units = r4((amount * (1 - TRADE_FEE)) * PAR / price);
    if (units <= 0) return NO;
    s.netWorth = r2(cashOf(s) - amount);
    m.hold[def.id] = r4((m.hold[def.id] ?? 0) + units);
    m.cost[def.id] = r2((m.cost[def.id] ?? 0) + r2(amount * (1 - TRADE_FEE)));
    note(m, year, `Bought ${def.name}`, -amount);
    writeMoney(s, m);
    return {
      ok: true,
      event: `${def.emoji} Put ${fmt(amount)} into ${def.name} at ${Math.round(price)}.`,
      toast: `Bought ${fmt(amount)} of ${def.name}`,
    };
  }

  if (action.t === "sell") {
    const def = ASSET_BY_ID[action.id];
    if (!def) return NO;
    if ((m.hold[def.id] ?? 0) <= 0) return NO;
    const before = holdingValue(m, def.id);
    const basis = m.cost[def.id] ?? 0;
    const frac = clamp(action.frac, 0, 1);
    if (frac <= 0) return NO;
    const cash = sellUnits(m, def.id, frac, year);
    if (cash <= 0) return NO;
    s.netWorth = r2(cashOf(s) + cash);
    writeMoney(s, m);
    const profit = r2(cash - basis * frac);
    const verb = profit >= 0 ? "up" : "down";
    return {
      ok: true,
      event: `${def.emoji} Sold ${fmt(before * frac)} of ${def.name}, ${verb} ${fmt(Math.abs(profit))} on what you paid.`,
      toast: `Sold for ${fmt(cash)}, ${verb} ${fmt(Math.abs(profit))}`,
    };
  }

  if (action.t === "cards") return cardsPlay(s, m, action.stake, year, sport);
  if (action.t === "arcade") return arcadeScore(s, m, action.right, year, sport);
  return NO;
}

/* ─── the card school ────────────────────────────────────────────────────────

   He said "maybe like casino games idk. Gambling aspect", and he was unsure,
   and this game is played by teenagers. So this is the smallest honest version
   of the thing rather than the biggest: the card school that runs on the back
   of every team bus and in every locker room in the world.

   What makes it safe to ship, and all four of these are load bearing.

   You lose more often than you win. The odds are written on the screen before
   you sit in, and the screen also shows, permanently, what this has cost you
   over your whole career. There is no version of this where the number at the
   bottom of the screen quietly stops being mentioned.

   The stake is tiny and it is capped twice: a hard ceiling of CARD_MAX and a
   fraction of what you actually have, so nobody puts a career on a hand. One
   sitting per season, so it cannot be ground.

   Losing has a consequence that is not money. Keep sitting in while you are
   down and it gets noticed at home, once, and that costs morale and standing.

   And it ends. Once you are down CARD_SHUT they stop dealing you in, for
   good, so the worst this can ever cost a career is about half a million
   against career earnings measured in tens of millions. There is no chasing
   your way past that, which is the entire point.

   The upside is not the money. Sitting in is how a dressing room takes to you,
   so it is worth doing occasionally and it is not worth doing every season. */

/** Hard ceiling on a single sitting, in millions. */
export const CARD_MAX = 0.05;
/** Fraction of your money that a single sitting can ever be. */
export const CARD_FRACTION = 0.04;
/** Below this you are not sitting in at all. */
export const CARD_MIN_WORTH = 0.25;
/** Career loss at which the card school closes for good. */
export const CARD_SHUT = 0.5;
/** Chance the hand goes your way. Under half, on purpose and in the copy. */
export const CARD_WIN = 0.42;
/** What a winning hand pays on top of the stake. Under the 1.38 that would
 *  make this an even bet, on purpose and by a clear margin: the whole point of
 *  shipping this at all is that the numbers say, out loud, that sitting in
 *  costs money over time. */
export const CARD_PAYS = 1.15;

/** The biggest stake this player is allowed to put in right now. */
export function cardCap<S extends MoneyHost>(s: S, sport: MoneySport<S>): number {
  const m = ensureMoney(s, sport);
  if (m.cShut) return 0;
  if (cashOf(s) < CARD_MIN_WORTH) return 0;
  return r2(Math.max(0, Math.min(CARD_MAX, cashOf(s) * CARD_FRACTION)));
}

/** Whether the card school is open to this player this season, and why not. */
export function cardStatus<S extends MoneyHost>(s: S, sport: MoneySport<S>): { open: boolean; why: string } {
  const m = ensureMoney(s, sport);
  const year = currentYear(s, m, sport);
  const w = sport.words.cards;
  if (m.cShut) return { open: false, why: `${w.crewCap} have stopped dealing you in. That one is closed for good.` };
  if (cashOf(s) < CARD_MIN_WORTH) return { open: false, why: "You are not sitting in on money you actually need." };
  if (m.cYear === year) return { open: false, why: `You have had your sitting this season. ${w.next}` };
  return { open: true, why: "" };
}

function cardsPlay<S extends MoneyHost>(s: S, m: MoneyState, stake: number, year: number, sport: MoneySport<S>): MoneyOutcome {
  const status = cardStatus(s, sport);
  if (!status.open) return NO;
  const cap = cardCap(s, sport);
  const bet = r2(Math.min(Math.max(stake, 0.01), cap));
  if (bet < 0.01) return NO;
  const fmt = (v: number) => fmtMoney(v, sport.currency);
  const w = sport.words.cards;
  const rng = new Rng(m.seed);
  const win = rng.next() < CARD_WIN;
  m.seed = rng.state;
  m.cYear = year;
  m.cPlays += 1;
  let event: string;
  let toast: string;
  if (win) {
    const profit = r2(bet * CARD_PAYS);
    s.netWorth = r2(cashOf(s) + profit);
    m.cNet = r2(m.cNet + profit);
    note(m, year, w.ledger, profit);
    event = `🃏 Took ${fmt(profit)} off ${w.crew} ${w.where}. They will want it back.`;
    toast = `You won ${fmt(profit)}`;
  } else {
    s.netWorth = r2(cashOf(s) - bet);
    m.cNet = r2(m.cNet - bet);
    note(m, year, w.ledger, -bet);
    event = `🃏 Lost ${fmt(bet)} at cards ${w.where}. That is how it usually goes.`;
    toast = `Lost ${fmt(bet)}. That is the usual outcome`;
  }
  /* The dressing room likes somebody who sits in and does not sulk, and that
     is the actual reason to do this rather than the money. */
  s.morale = clamp(s.morale + (win ? 2 : 1), 0, 100);
  writeMoney(s, m);
  return { ok: true, event, toast };
}

/* ─── the game he plays on his own phone ─────────────────────────────────────
   "And if u can play DoUKnowBall inside DoUKnowBall." So he does, on the bus
   and in hotel rooms, and the questions are about the season the sim itself
   just played, which is the only way this could be truthful. Question writing
   lives in soccerArcade.ts; this half is the prize. */

/** Prize for a perfect round, in millions. Deliberately pocket money. */
export const ARCADE_PRIZE = 0.02;

function arcadeScore<S extends MoneyHost>(s: S, m: MoneyState, right: number, year: number, sport: MoneySport<S>): MoneyOutcome {
  if (m.aYear === year) return NO;
  const got = clamp(Math.round(right), 0, 3);
  const fmt = (v: number) => fmtMoney(v, sport.currency);
  const w = sport.words;
  m.aYear = year;
  m.aPlays += 1;
  if (got > m.aBest) m.aBest = got;
  let event: string;
  if (got === 3) {
    s.netWorth = r2(cashOf(s) + ARCADE_PRIZE);
    s.morale = clamp(s.morale + 2, 0, 100);
    note(m, year, w.arcade.ledger, ARCADE_PRIZE);
    event = `🎮 Three from three on ${w.arcade.name}. ${fmt(ARCADE_PRIZE)} and bragging rights in the group chat.`;
  } else if (got === 2) {
    s.morale = clamp(s.morale + 1, 0, 100);
    event = `🎮 Two from three on ${w.arcade.name}. ${w.cards.crewCap} are not impressed.`;
  } else {
    event = `🎮 ${got} from three on ${w.arcade.name}. You play the sport for a living.`;
  }
  writeMoney(s, m);
  return { ok: true, event, toast: `${got}/3` };
}

/* ─── what the bank screen prints ────────────────────────────────────────── */

export interface BankSummary {
  cash: number;
  vault: number;
  invested: number;
  total: number;
  won: number;
  lost: number;
  entries: LedgerEntry[];
}

export function bankSummary<S extends MoneyHost>(s: S, sport: MoneySport<S>): BankSummary {
  const m = ensureMoney(s, sport);
  const invested = investedValue(m);
  return {
    cash: r2(cashOf(s)),
    vault: m.vault,
    invested,
    total: r2(cashOf(s) + m.vault + invested),
    won: m.won,
    lost: m.lost,
    entries: m.log.slice().reverse(),
  };
}
