/* ─── Round 80: the phone. GTA/BitLife style overlay for Soccer Career. ───
   A phone frame with a home screen of app tiles (tile rule inside the tile
   rule): Messages is the karma layer (reply to texts, choices move karma),
   News is the season feed, Bank the money picture, Social the fame picture,
   My Player the quick card, Life the karma meter. Everything reads straight
   off CareerState; the only write path is onAnswer -> answerPhoneText. */
import { useState } from "react";
import type { CareerState, PhoneMessage } from "@/lib/soccerCareerEngine";
import { karmaOf, unreadPhoneCount } from "@/lib/soccerCareerEngine";
import { karmaTier } from "@/lib/careerEras";

type AppId = "home" | "messages" | "news" | "bank" | "social" | "player" | "life";

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

function AppHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-white/10 sticky top-0 bg-zinc-950/95 backdrop-blur z-10">
      <button onClick={onBack} className="text-sky-400 text-sm font-bold px-1 py-0.5 rounded hover:bg-white/5">‹ Home</button>
      <div className="flex-1 text-center text-sm font-black pr-10">{title}</div>
    </div>
  );
}

export default function PhonePanel({ career, onAnswer, onClose }: {
  career: CareerState;
  onAnswer: (msgId: string, choiceIdx: number) => void;
  onClose: () => void;
}) {
  const [app, setApp] = useState<AppId>("home");
  const karma = karmaOf(career);
  const kt = karmaTier(karma);
  const unread = unreadPhoneCount(career);
  const inbox = [...(career.phoneInbox ?? [])].reverse();
  const year = career.seasons[career.seasons.length - 1]?.year ?? 2020;
  const season = career.seasons[career.seasons.length - 1];
  const clubColor = career.currentClubColor || "#10B981";

  const APPS: { id: AppId; label: string; emoji: string; badge?: number }[] = [
    { id: "messages", label: "Messages", emoji: "💬", badge: unread },
    { id: "news", label: "SportsFeed", emoji: "📰" },
    { id: "bank", label: "Bank", emoji: "🏦" },
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="w-[330px] max-w-[92vw] h-[640px] max-h-[86vh] rounded-[2.4rem] border-[6px] border-zinc-800 bg-zinc-950 text-white shadow-2xl overflow-hidden flex flex-col relative"
        onClick={e => e.stopPropagation()}
      >
        {/* notch */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-24 h-5 bg-zinc-900 rounded-full z-20" />
        {/* status bar */}
        <div className="flex items-center justify-between px-5 pt-8 pb-1 text-[10px] text-white/70 font-bold">
          <span>{year} · age {career.age}</span>
          <span className={kt.color}>{kt.emoji} karma {karma}</span>
          <span>📶 🔋</span>
        </div>

        {/* screen */}
        <div className="flex-1 overflow-y-auto">
          {app === "home" && (
            <div className="p-4 space-y-4" style={{ background: `linear-gradient(160deg, ${clubColor}33, transparent 55%)` }}>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-3 text-center">
                <div className="text-2xl font-black">{career.playerName}</div>
                <div className="text-[11px] text-white/60">{career.currentClub} · OVR {career.overall}</div>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-1">
                {APPS.map(a => (
                  <button key={a.id} onClick={() => setApp(a.id)} className="relative flex flex-col items-center gap-1 group">
                    <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-3xl group-hover:bg-white/20 transition-colors">
                      {a.emoji}
                    </div>
                    {a.badge ? (
                      <span className="absolute -top-1 right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-[11px] font-black flex items-center justify-center">{a.badge}</span>
                    ) : null}
                    <span className="text-[10px] font-bold text-white/80">{a.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-center text-[10px] text-white/40 pt-2">Replies move your karma. Karma moves your career.</p>
            </div>
          )}

          {app === "messages" && (
            <div>
              <AppHeader title="💬 Messages" onBack={() => setApp("home")} />
              <div className="p-3 space-y-3">
                {inbox.length === 0 && <p className="text-center text-xs text-white/50 py-8">No texts yet. They arrive between seasons.</p>}
                {inbox.map((m: PhoneMessage) => (
                  <div key={m.id} className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black">{m.emoji} {m.from}</span>
                      <span className="text-[9px] text-white/40">{m.year}</span>
                    </div>
                    <div className="rounded-lg rounded-tl-none bg-zinc-800 px-2.5 py-1.5 text-[11px] leading-snug">{m.text}</div>
                    {m.answered === undefined ? (
                      <div className="space-y-1.5 pt-1">
                        {m.choices.map((c, i) => (
                          <button key={i} onClick={() => onAnswer(m.id, i)}
                            className="w-full text-left rounded-lg border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/25 px-2.5 py-1.5 text-[11px] font-bold transition-colors">
                            {c.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex justify-end">
                        <div className="rounded-lg rounded-tr-none bg-sky-600/80 px-2.5 py-1.5 text-[11px] max-w-[85%]">
                          {m.choices[m.answered]?.reply || m.choices[m.answered]?.label || "…"}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {app === "news" && (
            <div>
              <AppHeader title="📰 SportsFeed" onBack={() => setApp("home")} />
              <div className="p-3 space-y-2">
                {career.events.length === 0 && <p className="text-center text-xs text-white/50 py-8">Quiet week. Play on.</p>}
                {career.events.slice().reverse().map((e, i) => (
                  <div key={i} className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-[11px] leading-snug">{e}</div>
                ))}
                {career.seasons.slice(-4, -1).reverse().map((sn, i) => (
                  <div key={`s${i}`} className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2 text-[10px] text-white/50">
                    {sn.year} · {sn.club}: {sn.apps} apps{career.position === "GK" ? `, ${sn.cleanSheets} clean sheets` : `, ${sn.goals}G ${sn.assists}A`}
                  </div>
                ))}
              </div>
            </div>
          )}

          {app === "bank" && (
            <div>
              <AppHeader title="🏦 Bank" onBack={() => setApp("home")} />
              <div className="p-4 space-y-3">
                <div className="rounded-2xl border border-white/10 p-4 text-center" style={{ background: `linear-gradient(135deg, ${clubColor}44, transparent)` }}>
                  <div className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Net worth</div>
                  <div className="text-3xl font-black">{fmtMoney(career.netWorth)}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-xl bg-white/5 p-2.5"><div className="text-sm font-black">£{career.weeklyWage.toLocaleString()}</div><div className="text-[9px] text-white/50">per week</div></div>
                  <div className="rounded-xl bg-white/5 p-2.5"><div className="text-sm font-black">{fmtMoney(career.totalEarnings)}</div><div className="text-[9px] text-white/50">career earnings</div></div>
                  <div className="rounded-xl bg-white/5 p-2.5"><div className="text-sm font-black">{fmtMoney(career.sponsorshipIncome)}</div><div className="text-[9px] text-white/50">sponsors / yr</div></div>
                  <div className="rounded-xl bg-white/5 p-2.5"><div className="text-sm font-black">{career.properties.length + career.investments.length}</div><div className="text-[9px] text-white/50">assets owned</div></div>
                </div>
                <p className="text-[10px] text-white/40 text-center">Spending and investing live in the season menus, this is just your statement.</p>
              </div>
            </div>
          )}

          {app === "social" && (
            <div>
              <AppHeader title="📸 SocialGram" onBack={() => setApp("home")} />
              <div className="p-4 space-y-3">
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
            </div>
          )}

          {app === "player" && (
            <div>
              <AppHeader title="⭐ My Player" onBack={() => setApp("home")} />
              <div className="p-4 space-y-3">
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
            </div>
          )}

          {app === "life" && (
            <div>
              <AppHeader title={`${kt.emoji} Life`} onBack={() => setApp("home")} />
              <div className="p-4 space-y-3">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center space-y-2">
                  <div className="text-4xl">{kt.emoji}</div>
                  <div className={`text-lg font-black ${kt.color}`}>{kt.label}</div>
                  <Meter value={karma} color={karma >= 50 ? "bg-emerald-500" : "bg-red-500"} />
                  <div className="text-[10px] text-white/50">karma {karma} / 100</div>
                </div>
                <div className="rounded-xl bg-white/5 p-3 text-[11px] leading-relaxed text-white/70">
                  How you reply to texts moves this. High karma lifts your morale and popularity every season. Low karma drags both down, and the fans remember. It drifts back toward the middle over time, so one mistake is not forever.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* home indicator + close */}
        <div className="p-2 flex flex-col items-center gap-1.5 border-t border-white/5">
          <button onClick={onClose} className="text-[10px] font-bold text-white/50 hover:text-white/90 px-3 py-1 rounded-full bg-white/5">Put phone away</button>
          <div className="w-24 h-1 rounded-full bg-white/25" />
        </div>
      </div>
    </div>
  );
}
