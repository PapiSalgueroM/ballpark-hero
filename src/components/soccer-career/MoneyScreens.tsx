/* ─── Round 134: the money screens, all of them inside the phone ────────────

   His note: "In the bank there should be more options on what u can do with ur
   money. Like all those options that appear on your my life should be on ur
   phone instead. And there should be a lot more things u can do with ur
   money."

   So the whole of My Life moved off the season page and into a phone app, and
   four more apps arrived beside it: the bank, the market, the game he plays on
   his own phone, and the card school on the team bus.

   Tile rule, inside the phone, all the way down. Every screen here is one
   screen with a back button at the top, and where there is a list of things,
   the list is the screen rather than one section of a longer page. The shop
   goes home screen, then aisle, then the things in that aisle, and every step
   of that is a tap and a back button.

   No scroll rule, phone edition, same as Round 130 solved it for Messages: the
   handset scrolls its own body and never the page behind it, and the thing you
   just tapped answers inside the frame you are already looking at. */
import { useMemo, useState } from "react";
import type { CareerState, SpendingCategory } from "@/lib/soccerCareerEngine";
import { SPENDING_ITEMS, formatNetWorth } from "@/lib/soccerCareerEngine";
import {
  ASSETS, ensureMoney, bankSummary, holdingValue, unrealised, priceRead, lastMove,
  spendable, fmtM, cardCap, cardStatus, MAX_LEDGER, PAR,
  CARD_WIN, CARD_PAYS, CARD_MAX, CARD_SHUT, ARCADE_PRIZE,
} from "@/lib/soccerMoney";
import type { MoneyAction } from "@/lib/soccerMoney";
import { arcadeQuestions } from "@/lib/soccerArcade";

/* ─── shared bits ────────────────────────────────────────────────────────── */

export function AppHeader({ title, backLabel, onBack }: { title: string; backLabel: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-1 px-2 py-2 border-b border-white/10 bg-zinc-950/95 backdrop-blur shrink-0">
      <button onClick={onBack} className="text-sky-400 text-[11px] font-bold px-1.5 py-1 rounded hover:bg-white/5 shrink-0">‹ {backLabel}</button>
      <div className="flex-1 text-center text-[13px] font-black truncate pr-8">{title}</div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between text-[11px] py-1">
      <span className="text-white/55">{label}</span>
      <span className={`font-black ${tone ?? ""}`}>{value}</span>
    </div>
  );
}

function Chip({ label, onClick, disabled, tone }: { label: string; onClick: () => void; disabled?: boolean; tone?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 rounded-xl px-1 py-2 text-[11px] font-black transition-colors ${
        disabled
          ? "bg-white/5 text-white/25"
          : tone === "sell"
            ? "bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30"
            : "bg-sky-500/15 border border-sky-500/40 text-sky-300 hover:bg-sky-500/30"
      }`}
    >
      {label}
    </button>
  );
}

/** Eight seasons of price, drawn small. */
function Spark({ points, up }: { points: number[]; up: boolean }) {
  if (points.length < 2) {
    return <div className="h-14 flex items-center justify-center text-[10px] text-white/35">No history yet. Come back after a season.</div>;
  }
  const lo = Math.min(...points), hi = Math.max(...points);
  const span = Math.max(hi - lo, 1);
  const w = 260, h = 54;
  const d = points
    .map((p, i) => `${(i / (points.length - 1)) * w},${h - ((p - lo) / span) * (h - 6) - 3}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-14" preserveAspectRatio="none">
      <polyline points={d} fill="none" stroke={up ? "#34d399" : "#f87171"} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ─── the bank ───────────────────────────────────────────────────────────── */

export function BankScreen({ career, onBack, onMoney }: {
  career: CareerState;
  onBack: () => void;
  onMoney: (a: MoneyAction) => void;
}) {
  const bank = bankSummary(career);
  const free = spendable(career);
  return (
    <>
      <AppHeader title="🏦 Bank" backLabel="Home" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/45 font-bold">Everything you have</div>
          <div className="text-3xl font-black">{fmtM(bank.total)}</div>
          <div className="text-[10px] text-white/45">wage {`£${career.weeklyWage.toLocaleString()}`} a week</div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/5 p-2"><div className="text-[13px] font-black">{fmtM(bank.cash)}</div><div className="text-[9px] text-white/45">in the account</div></div>
          <div className="rounded-xl bg-white/5 p-2"><div className="text-[13px] font-black text-emerald-300">{fmtM(bank.vault)}</div><div className="text-[9px] text-white/45">savings</div></div>
          <div className="rounded-xl bg-white/5 p-2"><div className="text-[13px] font-black text-sky-300">{fmtM(bank.invested)}</div><div className="text-[9px] text-white/45">invested</div></div>
        </div>

        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black">💷 Savings</span>
            <span className="text-[10px] text-emerald-300 font-bold">pays 2.5% a season, never loses</span>
          </div>
          <p className="text-[10px] text-white/50 leading-snug">Boring, safe, and better than leaving it in the current account doing nothing.</p>
          <div className="flex gap-1.5">
            <Chip label="Save 25%" disabled={free < 0.2} onClick={() => onMoney({ t: "deposit", amount: free * 0.25 })} />
            <Chip label="Save half" disabled={free < 0.1} onClick={() => onMoney({ t: "deposit", amount: free * 0.5 })} />
            <Chip label="Save it all" disabled={free < 0.05} onClick={() => onMoney({ t: "deposit", amount: free })} />
          </div>
          <div className="flex gap-1.5">
            <Chip tone="sell" label="Take out half" disabled={bank.vault < 0.02} onClick={() => onMoney({ t: "withdraw", amount: bank.vault * 0.5 })} />
            <Chip tone="sell" label="Take it all out" disabled={bank.vault < 0.01} onClick={() => onMoney({ t: "withdraw", amount: bank.vault })} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-1">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-black">📄 Statement</span>
            <span className="text-[9px] text-white/40">last {MAX_LEDGER} only</span>
          </div>
          {bank.entries.length === 0 ? (
            <p className="text-[10px] text-white/40 py-3 text-center">Nothing yet. Save something or buy something.</p>
          ) : (
            bank.entries.map((e, i) => (
              <div key={i} className="flex items-center justify-between text-[11px] py-1 border-b border-white/5 last:border-0">
                <span className="min-w-0 truncate text-white/70">{e.t}</span>
                <span className="flex items-center gap-2 shrink-0 pl-2">
                  <span className="text-[9px] text-white/35">{e.y}</span>
                  <span className={`font-black ${e.a >= 0 ? "text-emerald-400" : "text-white/70"}`}>{e.a >= 0 ? "+" : ""}{fmtM(e.a)}</span>
                </span>
              </div>
            ))
          )}
          <p className="text-[9px] text-white/30 pt-1.5">Older lines drop off so your save does not grow forever.</p>
        </div>

        <div className="rounded-xl bg-white/5 p-2.5 flex items-center justify-between text-[10px]">
          <span className="text-white/50">Made on investments</span>
          <span><span className="text-emerald-400 font-black">{fmtM(bank.won)}</span> <span className="text-white/30">/</span> <span className="text-red-400 font-black">{fmtM(bank.lost)}</span> <span className="text-white/40">lost</span></span>
        </div>
      </div>
    </>
  );
}

/* ─── the market ─────────────────────────────────────────────────────────── */

export function MarketScreen({ career, onBack, onOpen }: {
  career: CareerState;
  onBack: () => void;
  onOpen: (id: string) => void;
}) {
  const m = ensureMoney(career);
  const invested = ASSETS.reduce((s, a) => s + holdingValue(m, a.id), 0);
  return (
    <>
      <AppHeader title="📈 Market" backLabel="Home" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] text-white/45">You have {fmtM(spendable(career))} to put in</span>
          <span className="text-[10px] text-white/45">holding {fmtM(invested)}</span>
        </div>
        {ASSETS.map(a => {
          const read = priceRead(m, a.id);
          const move = lastMove(m, a.id);
          const held = holdingValue(m, a.id);
          return (
            <button
              key={a.id}
              onClick={() => onOpen(a.id)}
              className="w-full text-left rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 px-3 py-2.5 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl leading-none">{a.emoji}</span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black truncate">{a.name}</span>
                    <span className="text-xs font-black shrink-0">{Math.round(m.price[a.id])}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] truncate ${read.tone}`}>{read.label}</span>
                    <span className={`text-[10px] font-bold shrink-0 ${move > 0 ? "text-emerald-400" : move < 0 ? "text-red-400" : "text-white/40"}`}>
                      {move > 0 ? "+" : ""}{move}%
                    </span>
                  </span>
                </span>
              </div>
              {held > 0 && (
                <div className="text-[10px] text-sky-300 pt-1 pl-8">you hold {fmtM(held)}, {unrealised(m, a.id) >= 0 ? "up" : "down"} {fmtM(Math.abs(unrealised(m, a.id)))}</div>
              )}
            </button>
          );
        })}
        <p className="text-[9px] text-white/35 text-center px-2 pt-1">
          Prices move every season whether you look or not. Cheap can get cheaper. There is a 1% fee each way.
        </p>
      </div>
    </>
  );
}

export function AssetScreen({ career, assetId, onBack, onMoney }: {
  career: CareerState;
  assetId: string;
  onBack: () => void;
  onMoney: (a: MoneyAction) => void;
}) {
  const m = ensureMoney(career);
  const def = ASSETS.find(a => a.id === assetId);
  const free = spendable(career);
  if (!def) {
    return (
      <>
        <AppHeader title="Market" backLabel="Market" onBack={onBack} />
        <div className="flex-1 flex items-center justify-center text-xs text-white/50">That one is not listed.</div>
      </>
    );
  }
  const read = priceRead(m, def.id);
  const move = lastMove(m, def.id);
  const held = holdingValue(m, def.id);
  const pnl = unrealised(m, def.id);
  const hist = m.hist[def.id] ?? [];
  const riskWord = def.risk === "steady" ? "Steady" : def.risk === "bumpy" ? "Bumpy" : "Wild";
  const riskTone = def.risk === "steady" ? "text-emerald-400" : def.risk === "bumpy" ? "text-amber-400" : "text-red-400";
  return (
    <>
      <AppHeader title={`${def.emoji} ${def.name}`} backLabel="Market" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-black leading-none">{Math.round(m.price[def.id])}</div>
              <div className={`text-[10px] font-bold ${move > 0 ? "text-emerald-400" : move < 0 ? "text-red-400" : "text-white/40"}`}>
                {move > 0 ? "+" : ""}{move}% last season
              </div>
            </div>
            <div className="text-right">
              <div className={`text-[11px] font-black ${riskTone}`}>{riskWord}</div>
              <div className="text-[9px] text-white/40">started at {PAR}</div>
            </div>
          </div>
          <Spark points={hist} up={move >= 0} />
          <div className={`text-[11px] font-bold text-center ${read.tone}`}>{read.label}</div>
        </div>

        <p className="text-[10px] text-white/50 leading-snug px-1">{def.blurb}</p>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-0.5">
          <Row label="You have to spend" value={fmtM(free)} />
          <Row label="You are holding" value={fmtM(held)} tone={held > 0 ? "text-sky-300" : "text-white/40"} />
          {held > 0 && <Row label="Against what you paid" value={`${pnl >= 0 ? "+" : ""}${fmtM(pnl)}`} tone={pnl >= 0 ? "text-emerald-400" : "text-red-400"} />}
        </div>

        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold px-0.5">Buy</div>
          <div className="flex gap-1.5">
            <Chip label="10%" disabled={free < 0.5} onClick={() => onMoney({ t: "buy", id: def.id, amount: free * 0.1 })} />
            <Chip label="25%" disabled={free < 0.2} onClick={() => onMoney({ t: "buy", id: def.id, amount: free * 0.25 })} />
            <Chip label="Half" disabled={free < 0.1} onClick={() => onMoney({ t: "buy", id: def.id, amount: free * 0.5 })} />
            <Chip label="The lot" disabled={free < 0.05} onClick={() => onMoney({ t: "buy", id: def.id, amount: free })} />
          </div>
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold px-0.5 pt-1">Sell</div>
          <div className="flex gap-1.5">
            <Chip tone="sell" label="A quarter" disabled={held <= 0.02} onClick={() => onMoney({ t: "sell", id: def.id, frac: 0.25 })} />
            <Chip tone="sell" label="Half" disabled={held <= 0.02} onClick={() => onMoney({ t: "sell", id: def.id, frac: 0.5 })} />
            <Chip tone="sell" label="All of it" disabled={held <= 0.01} onClick={() => onMoney({ t: "sell", id: def.id, frac: 1 })} />
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── My Life, the shop, moved off the season page ───────────────────────── */

const CATEGORIES: { key: SpendingCategory; label: string; emoji: string }[] = [
  { key: "property", label: "Where you live", emoji: "🏠" },
  { key: "vehicle", label: "What you drive", emoji: "🏎️" },
  { key: "performance", label: "Your football", emoji: "⚡" },
  { key: "lifestyle", label: "Day to day", emoji: "✨" },
  { key: "family", label: "Family and giving", emoji: "❤️" },
  { key: "flex", label: "Pure flex", emoji: "💎" },
  { key: "investment", label: "Businesses", emoji: "💼" },
  { key: "shady", label: "The other list", emoji: "🕶️" },
];

export function ShopScreen({ career, onBack, onOpen }: {
  career: CareerState;
  onBack: () => void;
  onOpen: (cat: SpendingCategory) => void;
}) {
  const owned = career.purchasedItems ?? [];
  const shady = (career.corruptionHeat ?? 0) > 0 || (career.dirtyMoney ?? 0) > 0;
  const cats = CATEGORIES.filter(c => c.key !== "shady" || shady);
  return (
    <>
      <AppHeader title="🛒 My Life" backLabel="Home" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="flex items-center justify-between text-[10px] text-white/50 px-0.5">
          <span>{fmtM(spendable(career))} to spend</span>
          <span>{owned.length} things owned</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {cats.map(c => {
            const n = SPENDING_ITEMS.filter(i => i.category === c.key && !(i.oneTime && owned.includes(i.id))).length;
            return (
              <button
                key={c.key}
                onClick={() => onOpen(c.key)}
                className={`rounded-2xl border p-3 text-left transition-colors ${
                  c.key === "shady"
                    ? "border-red-500/30 bg-red-500/5 hover:bg-red-500/15"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="text-2xl">{c.emoji}</div>
                <div className="text-[11px] font-black leading-tight pt-1">{c.label}</div>
                <div className="text-[9px] text-white/40">{n} left to buy</div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

export function ShopCategoryScreen({ career, cat, onBack, onBuy }: {
  career: CareerState;
  cat: SpendingCategory;
  onBack: () => void;
  onBuy: (id: string) => void;
}) {
  const owned = career.purchasedItems ?? [];
  const meta = CATEGORIES.find(c => c.key === cat);
  const items = useMemo(() => SPENDING_ITEMS.filter(i => i.category === cat), [cat]);
  return (
    <>
      <AppHeader title={`${meta?.emoji ?? "🛒"} ${meta?.label ?? cat}`} backLabel="My Life" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {items.map(item => {
          const isOwned = item.oneTime && owned.includes(item.id);
          /* Mirrored from purchaseSpendingItem so a button never lies about
             what it will do when you press it. */
          const canAfford = item.cost === 0 || career.netWorth >= item.cost * 0.5;
          const meetsMin = !item.minNetWorth || career.netWorth >= item.minNetWorth;
          const meetsFame = !item.minPopularity || career.popularity >= item.minPopularity;
          const meetsDirty = !item.requiresDirty || (career.dirtyMoney ?? 0) > 0;
          const blocked = !canAfford || !meetsMin || !meetsFame || !meetsDirty;
          const lock = !meetsFame
            ? `needs ${item.minPopularity} popularity`
            : !meetsDirty
              ? "needs money nobody can trace"
              : !meetsMin
                ? `needs ${formatNetWorth(item.minNetWorth || 0)} to your name`
                : !canAfford ? "you cannot afford this yet" : null;
          return (
            <div
              key={item.id}
              className={`rounded-xl border p-2.5 ${
                isOwned ? "border-emerald-500/30 bg-emerald-500/5"
                  : blocked ? "border-white/5 bg-white/5 opacity-55"
                    : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg leading-none pt-0.5">{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11.5px] font-black truncate">{item.name}</span>
                    {isOwned && <span className="text-[8px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black shrink-0">OWNED</span>}
                  </div>
                  <p className="text-[10px] text-white/50 leading-snug">{item.description}</p>
                  {item.effect && <p className="text-[10px] text-amber-300/90 leading-snug pt-0.5">⚡ {item.effect}</p>}
                  {!isOwned && lock && <p className="text-[10px] text-red-400/80 pt-0.5">🔒 {lock}</p>}
                  {item.monthlyCost ? <p className="text-[9px] text-white/35 pt-0.5">then €{(item.monthlyCost * 1000).toFixed(0)}k a year, every year</p> : null}
                </div>
                {!isOwned && (
                  <button
                    onClick={() => onBuy(item.id)}
                    disabled={blocked}
                    className={`shrink-0 text-[10px] font-black px-2.5 py-1.5 rounded-lg transition-colors ${
                      blocked ? "bg-white/5 text-white/25" : "bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95"
                    }`}
                  >
                    {item.cost > 0 ? (item.cost >= 1 ? `€${item.cost.toFixed(0)}M` : `€${Math.round(item.cost * 1000)}k`) : "Hire"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ─── the game inside the game ───────────────────────────────────────────── */

export function ArcadeScreen({ career, onBack, onMoney }: {
  career: CareerState;
  onBack: () => void;
  onMoney: (a: MoneyAction) => void;
}) {
  const m = ensureMoney(career);
  const year = career.seasons.length ? career.seasons[career.seasons.length - 1].year : 2020;
  const playedThisSeason = m.aYear === year;
  const questions = useMemo(() => arcadeQuestions(career), [career]);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const [done, setDone] = useState(false);

  const q = questions[step];

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (q && i === q.answer) setRight(r => r + 1);
  };
  const next = () => {
    const got = right;
    if (step + 1 >= questions.length) {
      setDone(true);
      onMoney({ t: "arcade", right: got });
    } else {
      setStep(step + 1);
      setPicked(null);
    }
  };

  return (
    <>
      <AppHeader title="🎮 DoUKnowBall" backLabel="Home" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {playedThisSeason || questions.length < 3 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center space-y-2">
            <div className="text-3xl">🎮</div>
            <p className="text-[11px] text-white/60 leading-snug">
              {questions.length < 3
                ? "Not enough football has happened yet for it to ask you anything. Play a season."
                : "You have had today's three. It reloads next season, on the bus."}
            </p>
            {m.aPlays > 0 && <p className="text-[10px] text-white/40">Best round so far: {m.aBest} out of 3, over {m.aPlays} goes.</p>}
          </div>
        ) : done ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center space-y-2">
            <div className="text-4xl font-black">{right}/3</div>
            <p className="text-[11px] text-white/60 leading-snug">
              {right === 3
                ? `Three from three. ${fmtM(ARCADE_PRIZE)} in the app and the group chat hears about it.`
                : right === 2 ? "Two from three. The lads are not impressed." : "You play the sport for a living."}
            </p>
            <button onClick={onBack} className="text-[11px] font-black px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20">Put it away</button>
          </div>
        ) : q ? (
          <>
            <div className="flex items-center justify-between text-[10px] text-white/40 px-0.5">
              <span>Question {step + 1} of {questions.length}</span>
              <span>{right} right so far</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-[13px] font-black leading-snug">{q.q}</p>
            </div>
            <div className="space-y-1.5">
              {q.options.map((o, i) => {
                const state = picked === null ? "idle" : i === q.answer ? "right" : i === picked ? "wrong" : "dim";
                return (
                  <button
                    key={i}
                    onClick={() => pick(i)}
                    disabled={picked !== null}
                    className={`w-full text-left rounded-xl px-3 py-2 text-[12px] font-bold border transition-colors ${
                      state === "right" ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-200"
                        : state === "wrong" ? "border-red-500/60 bg-red-500/20 text-red-200"
                          : state === "dim" ? "border-white/5 bg-white/5 text-white/35"
                            : "border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/25"
                    }`}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <div className="space-y-2 animate-fade-in">
                <p className="text-[10px] text-white/50 leading-snug text-center">{q.source}</p>
                <button onClick={next} className="w-full rounded-xl bg-sky-600 hover:bg-sky-500 px-3 py-2 text-[12px] font-black">
                  {step + 1 >= questions.length ? "See how you did" : "Next one"}
                </button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </>
  );
}

/* ─── the card school on the bus ─────────────────────────────────────────────
   Read the long note in soccerMoney.ts before changing anything here. The odds
   and the lifetime record are on the screen because they have to be, not
   because there was space. */

export function CardsScreen({ career, onBack, onMoney }: {
  career: CareerState;
  onBack: () => void;
  onMoney: (a: MoneyAction) => void;
}) {
  const m = ensureMoney(career);
  const status = cardStatus(career);
  const cap = cardCap(career);
  const down = m.cNet < 0;
  return (
    <>
      <AppHeader title="🃏 Cards on the bus" backLabel="Home" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-1.5">
          <p className="text-[11px] text-white/70 leading-snug">
            Six hours to an away game and the card school is running down the back. Sitting in is how a dressing room takes to you.
          </p>
          <p className="text-[11px] text-white/70 leading-snug">
            You win about {Math.round(CARD_WIN * 100)} hands in 100, and a winning hand pays {CARD_PAYS} times what you put in. Do that maths and you are losing money slowly. That is what this is.
          </p>
        </div>

        <div className={`rounded-2xl border p-3 text-center ${down ? "border-red-500/30 bg-red-500/5" : "border-white/10 bg-white/5"}`}>
          <div className="text-[10px] uppercase tracking-widest text-white/45 font-bold">Your record on the bus</div>
          <div className={`text-2xl font-black ${down ? "text-red-400" : m.cNet > 0 ? "text-emerald-400" : ""}`}>
            {m.cNet >= 0 ? "+" : ""}{fmtM(m.cNet)}
          </div>
          <div className="text-[10px] text-white/45">over {m.cPlays} {m.cPlays === 1 ? "sitting" : "sittings"}</div>
        </div>

        {status.open ? (
          <>
            <button
              onClick={() => onMoney({ t: "cards", stake: cap })}
              className="w-full rounded-xl border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 px-3 py-2.5 text-[12px] font-black text-amber-200"
            >
              Sit in for {fmtM(cap)}
            </button>
            <button
              onClick={onBack}
              className="w-full rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 text-[11px] font-bold text-white/70"
            >
              Keep your headphones on
            </button>
          </>
        ) : (
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
            <p className="text-[11px] text-white/60 leading-snug">{status.why}</p>
          </div>
        )}

        <p className="text-[9px] text-white/35 leading-snug text-center px-1">
          One sitting a season, never more than {fmtM(CARD_MAX)}, and it stops for good if you ever get {fmtM(CARD_SHUT)} down. Nobody is losing a career on this bus.
        </p>
      </div>
    </>
  );
}
