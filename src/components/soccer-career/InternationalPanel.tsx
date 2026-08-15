import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FlagImg } from "@/components/FlagImg";
import { useRevealScroll } from "@/hooks/useRevealScroll";
import type {
  IntlTournament, IntlTie, IntlRound, IntlTableRow, IntlHistoryEntry,
} from "@/lib/soccerCareerEngine";

/* ─── Round 124: the international screens ───

   Two owner rules shape every line of this file.

   THE TILE RULE. No long stacked page. The tournament screen is a headline
   and a row of small tiles, and each tile takes over the card with its own
   back button. You never scroll past four things to reach the fifth.

   THE NO SCROLL RULE. Opening a tile pulls the detail into view through
   useRevealScroll, so on a phone the thing you just tapped is the thing you
   are looking at.

   There are no crests and no kits anywhere in here. Flags come from FlagImg,
   which is the only external image host the site allows.
*/

const ROUND_LABEL: Record<IntlRound, string> = {
  R32: "Round of 32", R16: "Round of 16", QF: "Quarter-finals",
  SF: "Semi-finals", F: "Final",
};

/** Rounds we always print in full. Everything earlier is trimmed to the
    player's own ties, because a 48 team World Cup has 31 of them and nobody
    wants to thumb past 24 group stage leftovers on a phone. */
const FULL_ROUNDS: IntlRound[] = ["QF", "SF", "F"];

function ResultPill({ result }: { result: string }) {
  const good = result === "Winner";
  const okay = result === "Runner-up" || result === "Semi-final";
  const bad = result === "Did Not Qualify" || result === "Not Selected";
  const cls = good
    ? "bg-amber-500/20 text-amber-300 border-amber-400/40"
    : bad
      ? "bg-red-500/15 text-red-300 border-red-500/30"
      : okay
        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
        : "bg-muted/40 text-muted-foreground border-border";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wide ${cls}`}>
      {result}
    </span>
  );
}

function TieRow({ tie, nation }: { tie: IntlTie; nation: string }) {
  const homeWon = tie.winner === tie.home;
  return (
    <div className={`flex items-center gap-1 text-[11px] rounded-md px-2 py-1 ${tie.mine ? "bg-primary/10 border border-primary/30" : "bg-muted/20"}`}>
      <span className={`flex-1 min-w-0 flex items-center gap-1 truncate ${homeWon ? "font-bold" : "opacity-60"}`}>
        <FlagImg name={tie.home} size={14} />
        <span className="truncate">{tie.home}</span>
      </span>
      <span className="shrink-0 font-black tabular-nums px-1">
        {tie.homeGoals}-{tie.awayGoals}
      </span>
      <span className={`flex-1 min-w-0 flex items-center gap-1 justify-end truncate ${!homeWon ? "font-bold" : "opacity-60"}`}>
        <span className="truncate">{tie.away}</span>
        <FlagImg name={tie.away} size={14} />
      </span>
      {tie.pens && <span className="shrink-0 text-[9px] text-amber-400 font-bold">pens</span>}
    </div>
  );
}

function TableCard({ rows, nation, title }: { rows: IntlTableRow[]; nation: string; title: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-2 text-[10px] text-muted-foreground px-2">
        <span>Team</span><span className="w-5 text-right">P</span><span className="w-7 text-right">GD</span><span className="w-6 text-right">Pts</span>
      </div>
      {rows.map((r, i) => (
        <div
          key={r.nation}
          className={`grid grid-cols-[1fr_auto_auto_auto] gap-x-2 items-center text-[11px] rounded-md px-2 py-1 ${r.nation === nation ? "bg-primary/10 border border-primary/30 font-bold" : "bg-muted/20"}`}
        >
          <span className="flex items-center gap-1 min-w-0 truncate">
            <span className="text-muted-foreground w-3 shrink-0">{i + 1}</span>
            <FlagImg name={r.nation} size={14} />
            <span className="truncate">{r.nation}</span>
          </span>
          <span className="w-5 text-right tabular-nums">{r.played}</span>
          <span className="w-7 text-right tabular-nums">{r.gf - r.ga > 0 ? "+" : ""}{r.gf - r.ga}</span>
          <span className="w-6 text-right tabular-nums font-black">{r.points}</span>
        </div>
      ))}
    </div>
  );
}

type Screen = "home" | "qualifying" | "squad" | "bracket" | "matches";

/**
 * The tournament screen. Headline, then tiles. Each tile is its own screen.
 */
export function TournamentCard({
  t, onDismiss, onSpeech,
}: {
  t: IntlTournament;
  onDismiss: () => void;
  onSpeech: (choice: "for_the_country" | "shirt_to_the_fans" | "call_out_doubters" | "quiet_lap") => void;
}) {
  const [screen, setScreen] = useState<Screen>("home");
  const revealRef = useRevealScroll<HTMLDivElement>(screen);
  const isWinner = t.myResult === "Winner";
  const missed = t.myResult === "Did Not Qualify" || t.myResult === "Not Selected";

  const border = isWinner ? "border-amber-400/60" : missed ? "border-red-500/40" : "border-blue-500/40";
  const grad = isWinner ? "from-amber-500/15" : missed ? "from-red-500/10" : "from-blue-500/10";

  const back = (
    <Button variant="outline" onClick={() => setScreen("home")} className="w-full h-9 text-xs font-bold">
      ← Back
    </Button>
  );

  if (screen !== "home") {
    return (
      <div ref={revealRef} className={`rounded-xl border-2 ${border} bg-gradient-to-b ${grad} to-transparent p-4 space-y-3`}>
        {screen === "qualifying" && (
          <>
            <h3 className="text-sm font-black uppercase tracking-wide">Qualifying</h3>
            {t.qualifying.automatic ? (
              <p className="text-xs text-muted-foreground">
                Every side in your confederation goes straight to this one. No qualifying to play.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  {t.qualifying.confederation} group, home and away. Top {t.qualifying.through} go to the finals.
                  You finished {t.qualifying.myPosition}
                  {t.qualifying.myPosition === 1 ? "st" : t.qualifying.myPosition === 2 ? "nd" : t.qualifying.myPosition === 3 ? "rd" : "th"}.
                </p>
                <TableCard rows={t.qualifying.table} nation={t.nation} title="Group table" />
              </>
            )}
            {back}
          </>
        )}
        {screen === "squad" && (
          <>
            <h3 className="text-sm font-black uppercase tracking-wide">The Squad</h3>
            {t.squad ? (
              <>
                <p className="text-xs">{t.squad.reason}</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { l: "Your rank", v: `${t.squad.myRank}` },
                    { l: "Places", v: `${t.squad.places}` },
                    { l: "Your score", v: `${t.squad.myScore}` },
                  ].map(s => (
                    <div key={s.l} className="text-center bg-muted/20 rounded-lg p-2">
                      <div className="text-lg font-black">{s.v}</div>
                      <div className="text-[9px] text-muted-foreground">{s.l}</div>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {t.squad.called
                    ? `Named as a ${t.squad.role?.toLowerCase()}. The last man in scored ${t.squad.cutScore}.`
                    : `The last man in scored ${t.squad.cutScore}. You scored ${t.squad.myScore}. Rating and form, nothing else.`}
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t.nation} never got there, so there was no squad to be in.
              </p>
            )}
            {back}
          </>
        )}
        {screen === "bracket" && (
          <>
            <h3 className="text-sm font-black uppercase tracking-wide">The Bracket</h3>
            {[...FULL_ROUNDS].reverse().map(round => {
              const ties = t.bracket.filter(x => x.round === round);
              if (!ties.length) return null;
              return (
                <div key={round} className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{ROUND_LABEL[round]}</div>
                  {ties.map(tie => <TieRow key={`${tie.round}${tie.slot}`} tie={tie} nation={t.nation} />)}
                </div>
              );
            })}
            {(["R16", "R32"] as IntlRound[]).map(round => {
              const all = t.bracket.filter(x => x.round === round);
              if (!all.length) return null;
              const mine = all.filter(x => x.mine);
              return (
                <div key={round} className="space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {ROUND_LABEL[round]} <span className="normal-case font-normal">({all.length} ties)</span>
                  </div>
                  {mine.length
                    ? mine.map(tie => <TieRow key={`${tie.round}${tie.slot}`} tie={tie} nation={t.nation} />)
                    : <p className="text-[11px] text-muted-foreground px-2">{t.nation} were not in this round.</p>}
                </div>
              );
            })}
            {back}
          </>
        )}
        {screen === "matches" && (
          <>
            <h3 className="text-sm font-black uppercase tracking-wide">Your Tournament</h3>
            {t.matches.length ? (
              <div className="space-y-1">
                {t.matches.map((m, i) => (
                  <div key={i} className="bg-muted/20 rounded-lg px-2 py-1.5 space-y-0.5">
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-[9px] text-muted-foreground w-14 shrink-0">{m.round}</span>
                      <span className="flex-1 min-w-0 flex items-center gap-1 truncate">
                        <FlagImg name={m.home} size={14} /><span className="truncate">{m.home}</span>
                      </span>
                      <span className="shrink-0 font-black tabular-nums px-1">{m.homeGoals}-{m.awayGoals}</span>
                      <span className="flex-1 min-w-0 flex items-center gap-1 justify-end truncate">
                        <span className="truncate">{m.away}</span><FlagImg name={m.away} size={14} />
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground pl-14">
                      {m.playerGoals}G {m.playerAssists}A, rated {m.playerRating.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">You did not kick a ball at this one.</p>
            )}
            {back}
          </>
        )}
      </div>
    );
  }

  const tiles: { key: Screen; emoji: string; label: string; sub: string }[] = [
    {
      key: "qualifying", emoji: "🎫", label: "Qualifying",
      sub: t.qualifying.automatic ? "Straight in" : `${t.qualifying.myPosition} of ${t.qualifying.table.length}`,
    },
    {
      key: "squad", emoji: "📋", label: "The Squad",
      sub: t.squad?.called ? (t.squad.role ?? "In") : t.qualified ? "Left out" : "No squad",
    },
    { key: "bracket", emoji: "🗺️", label: "Bracket", sub: `${t.teams} nations` },
    { key: "matches", emoji: "⚽", label: "Your Games", sub: `${t.playerApps} apps` },
  ];

  return (
    <div ref={revealRef} className={`relative rounded-xl border-2 ${border} bg-gradient-to-b ${grad} to-transparent p-4 space-y-3`}>
      <div className="text-center space-y-1.5">
        <div className="text-3xl">{isWinner ? "🏆" : missed ? "😞" : "🌍"}</div>
        <h3 className="text-lg font-black leading-tight">{t.name} {t.year}</h3>
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold flex items-center gap-1">
            <FlagImg name={t.nation} size={16} />{t.nation}
          </span>
          <ResultPill result={t.myResult} />
        </div>
        <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1 flex-wrap">
          Champions: <FlagImg name={t.champion} size={14} />
          <span className="font-bold text-foreground">{t.champion}</span>
          {t.runnerUp && <span>beat {t.runnerUp} in the final</span>}
        </p>
      </div>

      {t.playerApps > 0 && (
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { l: "Apps", v: t.playerApps },
            { l: "Goals", v: t.playerGoals },
            { l: "Assists", v: t.playerAssists },
            { l: "Rating", v: t.playerAvgRating.toFixed(1) },
          ].map(s => (
            <div key={s.l} className="text-center bg-muted/20 rounded-lg p-1.5">
              <div className="text-base font-black">{s.v}</div>
              <div className="text-[9px] text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      )}

      {(t.bestPlayer || t.goldenBoot) && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-center space-y-0.5">
          {t.bestPlayer && <div className="text-xs font-bold">🌟 Best Player of the tournament</div>}
          {t.goldenBoot && <div className="text-xs font-bold">👟 Golden Boot, {t.playerGoals} goals</div>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        {tiles.map(tile => (
          <button
            key={tile.key}
            onClick={() => setScreen(tile.key)}
            className="bg-muted/20 hover:bg-muted/40 border border-border rounded-lg p-2 text-left transition-colors min-w-0"
          >
            <div className="text-base leading-none">{tile.emoji}</div>
            <div className="text-[11px] font-bold truncate">{tile.label}</div>
            <div className="text-[9px] text-muted-foreground truncate">{tile.sub}</div>
          </button>
        ))}
      </div>

      {isWinner ? (
        <div className="space-y-1.5">
          <p className="text-center text-[11px] font-bold uppercase tracking-wider text-amber-300">The microphone is yours</p>
          <Button onClick={() => onSpeech("for_the_country")} className="w-full h-auto py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 justify-start text-left whitespace-normal">
            🏆 Dedicate it to every kid back home
          </Button>
          <Button onClick={() => onSpeech("shirt_to_the_fans")} className="w-full h-auto py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 justify-start text-left whitespace-normal">
            🎽 Throw your shirt into the away end
          </Button>
          <Button onClick={() => onSpeech("call_out_doubters")} className="w-full h-auto py-2 text-xs font-bold text-white bg-amber-700 hover:bg-amber-600 justify-start text-left whitespace-normal">
            📢 Name the pundits who wrote you off
          </Button>
          <Button onClick={() => onSpeech("quiet_lap")} className="w-full h-auto py-2 text-xs font-bold text-white bg-muted hover:bg-muted/80 justify-start text-left whitespace-normal">
            🚶 Say nothing. Walk one slow lap with the trophy
          </Button>
        </div>
      ) : (
        <Button onClick={onDismiss} className="w-full h-10 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500">
          Continue →
        </Button>
      )}
    </div>
  );
}

/**
 * The every season card in the right hand column: caps, goals, honours, and a
 * tile that opens the tournament history without leaving the page.
 */
export function InternationalHistoryTile({
  history, nation, last,
}: {
  history: IntlHistoryEntry[];
  nation: string;
  last: IntlTournament | null;
}) {
  const [open, setOpen] = useState<"none" | "history" | "bracket">("none");
  const revealRef = useRevealScroll<HTMLDivElement>(open);
  if (!history.length) return null;

  if (open === "history") {
    return (
      <div ref={revealRef} className="space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Every tournament</div>
        <div className="space-y-1 max-h-[260px] overflow-y-auto scrollbar-thin">
          {[...history].reverse().map((h, i) => (
            <div key={`${h.year}-${i}`} className="flex items-center gap-2 bg-muted/20 rounded-md px-2 py-1 text-[11px]">
              <span className="text-muted-foreground w-9 shrink-0 tabular-nums">{h.year}</span>
              <span className="flex-1 min-w-0 truncate font-semibold">{h.short}</span>
              <span className="flex items-center gap-1 shrink-0 min-w-0">
                <FlagImg name={h.champion} size={13} />
                <span className="truncate max-w-[70px]">{h.champion}</span>
              </span>
              <ResultPill result={h.myResult} />
            </div>
          ))}
        </div>
        <Button variant="outline" onClick={() => setOpen("none")} className="w-full h-8 text-xs font-bold">← Back</Button>
      </div>
    );
  }

  if (open === "bracket" && last) {
    return (
      <div ref={revealRef} className="space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {last.name} {last.year}
        </div>
        {[...FULL_ROUNDS].reverse().map(round => {
          const ties = last.bracket.filter(x => x.round === round);
          if (!ties.length) return null;
          return (
            <div key={round} className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{ROUND_LABEL[round]}</div>
              {ties.map(tie => <TieRow key={`${tie.round}${tie.slot}`} tie={tie} nation={last.nation} />)}
            </div>
          );
        })}
        <Button variant="outline" onClick={() => setOpen("none")} className="w-full h-8 text-xs font-bold">← Back</Button>
      </div>
    );
  }

  const latest = history[history.length - 1];
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <button
        onClick={() => setOpen("history")}
        className="bg-muted/20 hover:bg-muted/40 border border-border rounded-lg p-2 text-left transition-colors min-w-0"
      >
        <div className="text-base leading-none">🗂️</div>
        <div className="text-[11px] font-bold truncate">Tournaments</div>
        <div className="text-[9px] text-muted-foreground truncate">{history.length} played out</div>
      </button>
      <button
        onClick={() => setOpen(last ? "bracket" : "history")}
        className="bg-muted/20 hover:bg-muted/40 border border-border rounded-lg p-2 text-left transition-colors min-w-0"
      >
        <div className="text-base leading-none">🏆</div>
        <div className="text-[11px] font-bold truncate">{latest?.short ?? "Last"} {latest?.year ?? ""}</div>
        <div className="text-[9px] text-muted-foreground truncate">{latest?.champion ?? ""} won it</div>
      </button>
    </div>
  );
}
