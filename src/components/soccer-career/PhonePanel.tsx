/* ─── Round 80: the phone. Rebuilt in Round 130. ───
   A phone frame with a home screen of app tiles (tile rule inside the tile
   rule). Round 80 shipped Messages as a stack of one shot cards: a text
   arrived, you picked a reply, and nothing ever came back. His note: "For
   messages u get sent u should be able to continue the convo. Not simply
   reply and then they don't respond back ever again. Also we should have
   contacts."

   So Messages is now a LIST of threads, each opening its own screen with a
   back button, and Contacts is a list of people you can message first. The
   conversation lives in soccerPhone.ts; this file only reads it and sends
   taps back up.

   The write path is still the single onAnswer(id, index) prop, because
   SoccerCareer.tsx belongs to another agent this round. Thread replies ride
   on the thread id and new conversations ride on an "open:<contact>" id, so
   nothing above this component had to change.

   No scroll rule, phone edition: the reply presets sit in a bar welded to the
   bottom of the handset and the message list scrolls itself to the newest line
   after every tap, so the answer you just got is already on screen. The page
   behind the overlay is never touched. */
import { useEffect, useMemo, useRef, useState } from "react";
import { focusDialogOnMount, escapeCloses } from '@/lib/dialogA11y';
import type { CareerState, PhoneMessage } from "@/lib/soccerCareerEngine";
import { karmaOf } from "@/lib/soccerCareerEngine";
import { karmaTier } from "@/lib/careerEras";
import {
  CONTACTS, contactAvailable, contactName, contactEmoji,
  phoneThreads, threadReplies, starterConvos, phoneFeed, convoTopic,
  phoneStanding, standingLabel, relLabel, unreadThreads,
} from "@/lib/soccerPhone";
import type { PhoneThread } from "@/lib/soccerPhone";
/* Round 134: the phone is where you live now. The bank got a savings account
   and a statement, the market arrived beside it, My Life moved off the season
   page and into a tile, and two small things your player does on his own phone
   sit next to them. All of those screens live in MoneyScreens so this file
   stays a home screen and a router. */
import {
  BankScreen, MarketScreen, AssetScreen, ShopScreen, ShopCategoryScreen,
  ArcadeScreen, CardsScreen,
} from "@/components/soccer-career/MoneyScreens";
import type { MoneyAction } from "@/lib/soccerMoney";
import { moneyWealth } from "@/lib/soccerMoney";
import type { SpendingCategory } from "@/lib/soccerCareerEngine";

type AppId =
  | "home" | "messages" | "thread" | "contacts" | "contact" | "news"
  | "bank" | "social" | "player" | "life"
  | "market" | "asset" | "shop" | "shopcat" | "arcade" | "cards";

const fmtFollowers = (m: number) => m >= 1 ? `${m.toFixed(1)}M` : `${Math.round(m * 1000)}K`;
const fmtMoney = (m: number) => {
  const neg = m < 0; const v = Math.abs(m);
  const body = v >= 1000 ? `£${(v / 1000).toFixed(2)}bn` : v >= 1 ? `£${v.toFixed(1)}M` : `£${Math.round(v * 1000)}K`;
  return neg ? `-${body}` : body;
};

function Meter({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </div>
  );
}

function AppHeader({ title, backLabel, onBack }: { title: string; backLabel: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-1 px-2 py-2 border-b border-white/10 bg-zinc-950/95 backdrop-blur shrink-0">
      <button onClick={onBack} className="text-sky-400 text-[11px] font-bold px-1.5 py-1 rounded hover:bg-white/5 shrink-0">‹ {backLabel}</button>
      <div className="flex-1 text-center text-[13px] font-black truncate pr-8">{title}</div>
    </div>
  );
}

export default function PhonePanel({ career, onAnswer, onMoney, onBuyItem, onClose }: {
  career: CareerState;
  onAnswer: (msgId: string, choiceIdx: number) => void;
  /** Round 134: every money tap, on one prop, the same way every message tap
   *  rides on onAnswer. */
  onMoney: (action: MoneyAction) => void;
  onBuyItem: (itemId: string) => void;
  onClose: () => void;
}) {
  const [app, setApp] = useState<AppId>("home");
  const [openThread, setOpenThread] = useState<string | null>(null);
  const [openContact, setOpenContact] = useState<string | null>(null);
  const [openAsset, setOpenAsset] = useState<string | null>(null);
  const [openCat, setOpenCat] = useState<SpendingCategory | null>(null);
  const karma = karmaOf(career);
  const kt = karmaTier(karma);
  const phase: "youth" | "pro" = career.phase === "youth" ? "youth" : "pro";
  const threads = useMemo(() => phoneThreads(career), [career]);
  const waiting = unreadThreads(career);
  const standing = phoneStanding(career);
  const st = standingLabel(standing);
  const feed = useMemo(() => phoneFeed(career), [career]);
  const year = career.seasons[career.seasons.length - 1]?.year ?? 2020;
  const season = career.seasons[career.seasons.length - 1];
  const clubColor = career.currentClubColor || "#10B981";
  const thread = threads.find(t => t.id === openThread) ?? null;

  const contacts = useMemo(
    () => CONTACTS.filter(c => contactAvailable(c.id, career, phase)),
    [career, phase],
  );

  /* Tile rule: small tiles, each one opening its own screen with a back
     button. Eleven of them fit on the handset at 390 wide without the home
     screen becoming a page you scroll, which is the whole point of tiles. */
  const APPS: { id: AppId; label: string; emoji: string; badge?: number }[] = [
    { id: "messages", label: "Messages", emoji: "💬", badge: waiting },
    { id: "contacts", label: "Contacts", emoji: "👥" },
    { id: "news", label: "SportsFeed", emoji: "📰" },
    { id: "bank", label: "Bank", emoji: "🏦" },
    { id: "market", label: "Market", emoji: "📈" },
    { id: "shop", label: "My Life", emoji: "🛒" },
    { id: "arcade", label: "Ball Quiz", emoji: "🎮" },
    { id: "cards", label: "Cards", emoji: "🃏" },
    { id: "social", label: "SocialGram", emoji: "📸" },
    { id: "player", label: "My Player", emoji: "⭐" },
    { id: "life", label: "Life", emoji: kt.emoji },
  ];

  const fanComments = (() => {
    const f = fmtFollowers(career.socialMediaFollowers);
    if (karma >= 70) return [`Best in the world AND a good person 😭`, `My kid has your poster up. Never change`, `${f} followers and still humble. Rare.`];
    if (karma >= 50) return [`Decent season tbh`, `We rate you around here`, `More goals please 🙏`];
    if (karma >= 30) return [`Talented but man the attitude...`, `Rooting for the old you`, `Focus on football maybe?`];
    return [`Can't support this guy anymore`, `Talent wasted on a villain`, `The boos on Saturday? Deserved.`];
  })();

  /* Legacy Round 80 texts that are still sitting unanswered but whose thread
     has already been trimmed away. Rare, and only on an old save, but they
     would otherwise be unreachable. */
  const orphanTexts: PhoneMessage[] = useMemo(() => {
    const held = new Set(threads.map(t => (t.pending?.kind === "legacy" ? t.pending.msgId : "")));
    return (career.phoneInbox ?? []).filter(m => m.answered === undefined && !held.has(m.id));
  }, [career, threads]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your phone"
        tabIndex={-1}
        ref={focusDialogOnMount}
        onKeyDown={escapeCloses(onClose)}
        className="w-[330px] max-w-[92vw] h-[640px] max-h-[86vh] rounded-[2.4rem] border-[6px] border-zinc-800 bg-zinc-950 text-white shadow-2xl overflow-hidden flex flex-col relative"
        onClick={e => e.stopPropagation()}
      >
        {/* notch */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-24 h-5 bg-zinc-900 rounded-full z-20" />
        {/* status bar */}
        <div className="flex items-center justify-between px-5 pt-8 pb-1 text-[10px] text-white/70 font-bold shrink-0">
          <span>{year} · age {career.age}</span>
          <span className={st.color}>{st.emoji} {standing}</span>
          <span>📶 🔋</span>
        </div>

        {/* screen */}
        <div className="flex-1 min-h-0 flex flex-col">
          {app === "home" && (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3" style={{ background: `linear-gradient(160deg, ${clubColor}33, transparent 55%)` }}>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-2.5 text-center">
                <div className="text-xl font-black leading-tight">{career.playerName}</div>
                <div className="text-[11px] text-white/60">{career.currentClub} · OVR {career.overall}</div>
                <div className="text-[10px] text-emerald-300 font-bold pt-0.5">
                  {fmtMoney(career.netWorth + moneyWealth(career))} to your name
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {APPS.map(a => (
                  <button key={a.id} onClick={() => setApp(a.id)} className="relative flex flex-col items-center gap-0.5 group">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-2xl group-hover:bg-white/20 transition-colors">
                      {a.emoji}
                    </div>
                    {a.badge ? (
                      <span className="absolute -top-1 right-2 min-w-5 h-5 px-1 rounded-full bg-red-500 text-[11px] font-black flex items-center justify-center">{a.badge}</span>
                    ) : null}
                    <span className="text-[9.5px] font-bold text-white/80">{a.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-center text-[9.5px] text-white/40">Keep in touch and people look after you. Money you leave sitting still does nothing.</p>
            </div>
          )}

          {app === "messages" && (
            <>
              <AppHeader title="💬 Messages" backLabel="Home" onBack={() => setApp("home")} />
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                {threads.length === 0 && orphanTexts.length === 0 && (
                  <p className="text-center text-xs text-white/50 py-8">Nothing yet. Open Contacts and message somebody first.</p>
                )}
                {threads.map(t => {
                  const last = t.lines[t.lines.length - 1];
                  return (
                    <button
                      key={t.id}
                      onClick={() => { setOpenThread(t.id); setApp("thread"); }}
                      className="w-full text-left rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 px-3 py-2.5 flex items-start gap-2.5 transition-colors"
                    >
                      <span className="text-xl leading-none pt-0.5">{t.emoji}</span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black truncate">{t.name}</span>
                          <span className="text-[9px] text-white/40 shrink-0">{last?.y ?? ""}</span>
                        </span>
                        <span className="block text-[11px] text-white/55 truncate">
                          {last ? (last.w === 1 ? "You: " : "") + last.t : ""}
                        </span>
                      </span>
                      {t.pending && <span className="w-2.5 h-2.5 rounded-full bg-sky-400 mt-2 shrink-0" />}
                    </button>
                  );
                })}
                {orphanTexts.map(m => (
                  <div key={m.id} className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
                    <div className="text-xs font-black">{m.emoji} {m.from}</div>
                    <div className="rounded-lg rounded-tl-none bg-zinc-800 px-2.5 py-1.5 text-[11px] leading-snug">{m.text}</div>
                    <div className="space-y-1.5">
                      {m.choices.map((c, i) => (
                        <button key={i} onClick={() => onAnswer(m.id, i)}
                          className="w-full text-left rounded-lg border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/25 px-2.5 py-1.5 text-[11px] font-bold transition-colors">
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {app === "thread" && thread && (
            <ThreadScreen
              career={career}
              thread={thread}
              onBack={() => { setOpenThread(null); setApp("messages"); }}
              onPick={i => onAnswer(thread.id, i)}
            />
          )}
          {app === "thread" && !thread && (
            <>
              <AppHeader title="Messages" backLabel="Home" onBack={() => setApp("messages")} />
              <div className="flex-1 flex items-center justify-center text-xs text-white/50 px-6 text-center">That chat is gone. The phone only keeps the recent ones.</div>
            </>
          )}

          {app === "contacts" && (
            <>
              <AppHeader title="👥 Contacts" backLabel="Home" onBack={() => setApp("home")} />
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                {contacts.map(c => {
                  const t = threads.find(x => x.c === c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setOpenContact(c.id); setApp("contact"); }}
                      className="w-full text-left rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 px-3 py-2.5 flex items-center gap-2.5 transition-colors"
                    >
                      <span className="text-xl leading-none">{c.emoji}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-black truncate">{contactName(c.id, career)}</span>
                        <span className="block text-[10px] text-white/50 truncate">{c.blurb}</span>
                      </span>
                      <span className="text-[9px] font-bold text-white/45 shrink-0">{t ? relLabel(t.rel) : "New"}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {app === "contact" && openContact && (
            <ContactScreen
              career={career}
              contactId={openContact}
              phase={phase}
              thread={threads.find(t => t.c === openContact) ?? null}
              onBack={() => setApp("contacts")}
              onOpenThread={id => { setOpenThread(id); setApp("thread"); }}
              /* Starting a conversation drops you straight into it. The thread
                 id for a contact is fixed, so the panel can walk there without
                 waiting to see the new state come back down. */
              onStart={i => { onAnswer(`open:${openContact}`, i); setOpenThread(`th_${openContact}`); setApp("thread"); }}
            />
          )}

          {app === "news" && (
            <>
              <AppHeader title="📰 SportsFeed" backLabel="Home" onBack={() => setApp("home")} />
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                <p className="text-[10px] text-white/40 text-center pb-1">World football. Nothing about you in here.</p>
                {feed.length === 0 && <p className="text-center text-xs text-white/50 py-8">Quiet window. Check back after the season.</p>}
                {feed.map((e, i) => (
                  <div key={i} className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-[11px] leading-snug">{e}</div>
                ))}
              </div>
            </>
          )}

          {app === "bank" && (
            <BankScreen career={career} onBack={() => setApp("home")} onMoney={onMoney} />
          )}

          {app === "market" && (
            <MarketScreen
              career={career}
              onBack={() => setApp("home")}
              onOpen={id => { setOpenAsset(id); setApp("asset"); }}
            />
          )}
          {app === "asset" && openAsset && (
            <AssetScreen career={career} assetId={openAsset} onBack={() => setApp("market")} onMoney={onMoney} />
          )}

          {app === "shop" && (
            <ShopScreen
              career={career}
              onBack={() => setApp("home")}
              onOpen={cat => { setOpenCat(cat); setApp("shopcat"); }}
            />
          )}
          {app === "shopcat" && openCat && (
            <ShopCategoryScreen career={career} cat={openCat} onBack={() => setApp("shop")} onBuy={onBuyItem} />
          )}

          {app === "arcade" && (
            <ArcadeScreen career={career} onBack={() => setApp("home")} onMoney={onMoney} />
          )}

          {app === "cards" && (
            <CardsScreen career={career} onBack={() => setApp("home")} onMoney={onMoney} />
          )}

          {app === "social" && (
            <>
              <AppHeader title="📸 SocialGram" backLabel="Home" onBack={() => setApp("home")} />
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center">
                  <div className="text-3xl font-black">{fmtFollowers(career.socialMediaFollowers)}</div>
                  <div className="text-[10px] text-white/50">followers</div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold"><span>Popularity</span><span>{career.popularity}</span></div>
                  <Meter value={career.popularity} color="bg-pink-500" />
                </div>
                <div className="space-y-2 pt-1">
                  <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Latest comments</div>
                  {fanComments.map((c, i) => (
                    <div key={i} className="rounded-lg bg-white/5 px-3 py-2 text-[11px]">{c}</div>
                  ))}
                </div>
              </div>
            </>
          )}

          {app === "player" && (
            <>
              <AppHeader title="⭐ My Player" backLabel="Home" onBack={() => setApp("home")} />
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="rounded-2xl border border-white/10 p-4 text-center" style={{ background: `linear-gradient(135deg, ${clubColor}44, transparent)` }}>
                  <div className="text-4xl font-black">{career.overall}</div>
                  <div className="text-[10px] text-white/60">{career.position} · {career.currentClub}</div>
                  {typeof career.potential === "number" && career.age < 30 && (
                    <div className="text-[10px] font-bold text-emerald-400 pt-0.5">scouted ceiling {career.potential}</div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold"><span>Morale</span><span>{career.morale}</span></div>
                  <Meter value={career.morale} color="bg-emerald-500" />
                </div>
                {season && (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-white/5 p-2"><div className="text-sm font-black">{season.apps}</div><div className="text-[9px] text-white/50">apps</div></div>
                    {career.position === "GK" ? (
                      <div className="rounded-xl bg-white/5 p-2"><div className="text-sm font-black">{season.cleanSheets}</div><div className="text-[9px] text-white/50">clean sheets</div></div>
                    ) : (
                      <div className="rounded-xl bg-white/5 p-2"><div className="text-sm font-black">{season.goals}</div><div className="text-[9px] text-white/50">goals</div></div>
                    )}
                    <div className="rounded-xl bg-white/5 p-2"><div className="text-sm font-black">{season.assists}</div><div className="text-[9px] text-white/50">assists</div></div>
                  </div>
                )}
              </div>
            </>
          )}

          {app === "life" && (
            <>
              <AppHeader title={`${kt.emoji} Life`} backLabel="Home" onBack={() => setApp("home")} />
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center space-y-2">
                  <div className="text-4xl">{st.emoji}</div>
                  <div className={`text-lg font-black ${st.color}`}>{st.label}</div>
                  <Meter value={standing} color={standing >= 50 ? "bg-emerald-500" : "bg-red-500"} />
                  <div className="text-[10px] text-white/50">people you keep in touch with: {standing} / 100</div>
                </div>
                <div className="rounded-xl bg-white/5 p-3 text-[11px] leading-relaxed text-white/70">
                  Reply to people and this climbs. Leave them hanging a whole season and it drops, they get colder with you, and you feel it in the dressing room and in your head. Say sorry properly and it comes back.
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center space-y-1.5">
                  <div className={`text-sm font-black ${kt.color}`}>{kt.emoji} {kt.label}</div>
                  <Meter value={karma} color={karma >= 50 ? "bg-sky-500" : "bg-amber-500"} />
                  <div className="text-[10px] text-white/50">karma {karma} / 100, how the public sees you</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* home indicator + close */}
        <div className="p-2 flex flex-col items-center gap-1.5 border-t border-white/5 shrink-0">
          <button onClick={onClose} className="text-[10px] font-bold text-white/50 hover:text-white/90 px-3 py-1 rounded-full bg-white/5">Put phone away</button>
          <div className="w-24 h-1 rounded-full bg-white/25" />
        </div>
      </div>
    </div>
  );
}

/* ─── one conversation ───────────────────────────────────────────────────── */

function ThreadScreen({ career, thread, onBack, onPick }: {
  career: CareerState;
  thread: PhoneThread;
  onBack: () => void;
  onPick: (idx: number) => void;
}) {
  const replies = threadReplies(career, thread);
  const bodyRef = useRef<HTMLDivElement>(null);
  const count = thread.lines.length;

  /* Newest line first: the phone scrolls its OWN list, never the page behind
     it, so the answer that just arrived is on screen without anyone moving. */
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count, replies.length]);

  return (
    <>
      <AppHeader title={`${thread.emoji} ${thread.name}`} backLabel="Chats" onBack={onBack} />
      <div className="px-3 py-1 text-[9px] text-white/40 flex items-center justify-between border-b border-white/5 shrink-0">
        <span>Where you stand: {relLabel(thread.rel)}</span>
        {thread.cold > 0 && <span className="text-amber-400 font-bold">left waiting {thread.cold} {thread.cold === 1 ? "season" : "seasons"}</span>}
      </div>
      <div ref={bodyRef} className="flex-1 overflow-y-auto p-3 flex flex-col">
        {/* mt-auto keeps a short conversation sitting on the keyboard the way a
            real chat does, and still scrolls normally once it fills up. */}
        <div className="mt-auto space-y-2">
          {thread.lines.map((l, i) => (
            l.w === 1 ? (
              <div key={i} className="flex justify-end">
                <div className="rounded-2xl rounded-br-sm bg-sky-600/80 px-3 py-1.5 text-[11.5px] leading-snug max-w-[82%]">{l.t}</div>
              </div>
            ) : (
              <div key={i} className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-zinc-800 px-3 py-1.5 text-[11.5px] leading-snug max-w-[82%]">{l.t}</div>
              </div>
            )
          ))}
        </div>
      </div>
      <div className="border-t border-white/10 bg-zinc-950 p-2 space-y-1.5 shrink-0 max-h-[46%] overflow-y-auto">
        {replies.length === 0 ? (
          <p className="text-center text-[10px] text-white/40 py-2">Nothing to answer right now. They will be back.</p>
        ) : (
          replies.map((r, i) => (
            <button key={i} onClick={() => onPick(i)}
              className="w-full text-left rounded-xl border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/25 active:bg-sky-500/35 px-3 py-2 text-[11.5px] font-bold transition-colors">
              {r.label}
            </button>
          ))
        )}
      </div>
    </>
  );
}

/* ─── one contact, and the conversations you could start with them ───────── */

function ContactScreen({ career, contactId, phase, thread, onBack, onOpenThread, onStart }: {
  career: CareerState;
  contactId: string;
  phase: "youth" | "pro";
  thread: PhoneThread | null;
  onBack: () => void;
  onOpenThread: (id: string) => void;
  onStart: (idx: number) => void;
}) {
  const id = contactId as Parameters<typeof starterConvos>[1];
  const starters = starterConvos(career, id, phase);
  const name = contactName(id, career);
  const emoji = contactEmoji(id);
  const busy = !!thread?.pending;

  return (
    <>
      <AppHeader title={`${emoji} ${name}`} backLabel="Contacts" onBack={onBack} />
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center space-y-1.5">
          <div className="text-3xl">{emoji}</div>
          <div className="text-sm font-black">{name}</div>
          <Meter value={thread ? thread.rel : 50} color={(thread?.rel ?? 50) >= 50 ? "bg-emerald-500" : "bg-red-500"} />
          <div className="text-[10px] text-white/50">{thread ? relLabel(thread.rel) : "You have not spoken yet"}</div>
        </div>

        {thread && thread.lines.length > 0 && (
          <button onClick={() => onOpenThread(thread.id)}
            className="w-full rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-2 text-[11px] font-bold transition-colors">
            Open the chat{busy ? " (they are waiting on you)" : ""}
          </button>
        )}

        {busy ? (
          <p className="text-[10px] text-white/40 text-center">Finish what you are already talking about first.</p>
        ) : starters.length === 0 ? (
          <p className="text-[10px] text-white/40 text-center">Nothing new to bring up with them right now.</p>
        ) : (
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest text-white/45 font-bold px-0.5">Message them about</div>
            {starters.map((c, i) => (
              <button key={c.id} onClick={() => onStart(i)}
                className="w-full text-left rounded-xl border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/25 px-3 py-2 text-[11px] leading-snug font-semibold transition-colors">
                {convoTopic(c)}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
