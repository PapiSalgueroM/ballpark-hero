import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FlagImg } from "@/components/FlagImg";
import { useRevealScroll } from "@/hooks/useRevealScroll";
import { Confetti } from "@/components/soccer-career/CareerFx";
import { revealDelay } from "@/components/club-manager/Celebration";
import { SpeechChoices } from "@/components/career/AwardsNightCard";
import { SOCCER_WORLD_CUP_SPEECHES } from "@/lib/soccerCareerEngine";
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

/* Round 926: the end of a tournament is a moment, and a moment plays once.
   It plays when the card first lands, never again when a tile is opened and
   closed, and never when a save still sitting on this card is reopened: on a
   reload, in a new tab, or after the browser was closed. The save is not ours
   to write (the engine owns it), so the memory is a short list in the same
   localStorage the save lives in, with an in memory set behind it.

   The key is the run, not just the edition. Tournament years follow a fixed
   calendar, so a second career with the same nation reaches the same World
   Cup in the same year; the key therefore carries this run's own numbers (his
   games, his ratings, the scores) through a small hash, and a different
   career's win is a different key and gets its own moment.

   What happens when the memory fails: if storage cannot be read, the card
   plays. That is the storage the save is read from, so a browser that cannot
   read it has not reopened this save from it; the card in front of it is new.
   The one known replay is a save opened in a different browser, which has
   never seen the moment and plays it once there. */
const MOMENT_STORE = "dukb-intl-moments";
const MOMENT_KEEP = 60;
const momentsThisLoad = new Set<string>();

/** FNV-1a over a string, as 8 hex digits. Not security, just a short tag. */
function shortHash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function momentKey(t: IntlTournament): string {
  const run = JSON.stringify([
    t.champion, t.runnerUp, t.playerApps, t.playerGoals, t.playerAssists, t.playerAvgRating,
    t.squad?.myScore,
    (t.matches ?? []).map(m => [m.round, m.home, m.away, m.homeGoals, m.awayGoals, m.playerGoals, m.playerAssists, m.playerRating]),
    (t.bracket ?? []).map(b => [b.round, b.slot, b.home, b.away, b.homeGoals, b.awayGoals]),
  ]);
  return `${t.nation}|${t.name}|${t.year}|${t.myResult}|${shortHash(run)}`;
}

function readMoments(): string[] {
  const raw = window.localStorage.getItem(MOMENT_STORE);
  if (!raw) return [];
  try {
    const list: unknown = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

function momentPlayed(key: string): boolean {
  if (momentsThisLoad.has(key)) return true;
  try {
    return readMoments().includes(key);
  } catch {
    return false;
  }
}

function markMomentPlayed(key: string): void {
  momentsThisLoad.add(key);
  try {
    const kept = readMoments().filter(k => k !== key);
    kept.push(key);
    window.localStorage.setItem(MOMENT_STORE, JSON.stringify(kept.slice(-MOMENT_KEEP)));
  } catch {
    /* Storage blocked or full: the in memory set still stops a replay this visit. */
  }
}

/** The card's entrance pace: the kit's stagger, started early and stepped a
    little tighter than a season feed, because it carries up to fourteen beats
    and the speech should not wait three seconds behind them. */
const beatDelay = (i: number) => revealDelay(i, 0.1, 0.16);

/** 1st, 2nd, 3rd, 4th. */
function ordinal(n: number): string {
  const s = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
  return `${n}${s}`;
}

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
  /* Round 257: which table the first tile is showing. Defaults to the one he
     actually wanted. Declared up here with the other hooks on purpose: this
     component returns early for every non-home screen, and a useState below
     that return is React error #310. */
  const [table, setTable] = useState<"group" | "road">("group");
  const revealRef = useRevealScroll<HTMLDivElement>(screen);
  /* Round 926: true only on the first landing of this tournament's card.
     Read here (pure, so a discarded render reads the same answer), written
     in the effect below once the render has committed. Opening any tile
     turns it off, so Back does not replay the entrance. */
  const momentId = momentKey(t);
  const [fresh, setFresh] = useState(() => !momentPlayed(momentId));
  useEffect(() => {
    if (fresh) markMomentPlayed(momentId);
  }, [fresh, momentId]);
  const isWinner = t.myResult === "Winner";
  const missed = t.myResult === "Did Not Qualify" || t.myResult === "Not Selected";
  /* Saves written before Round 257 carry a tournament with no groupTable at
     all, and a nation that never qualified has an empty one, so the group
     screen only exists when there is a real table to print. */
  const hasGroup = (t.groupTable?.length ?? 0) > 0;
  const myGroupPos = hasGroup
    ? t.groupTable.findIndex(r => r.nation === t.nation) + 1
    : 0;

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
            {/* Round 257, owner report: "U should show the group stage table
                not the qualifying table." He was right, and the annoying part
                is the group table was already there in the save, it just had
                no screen. This tile now leads with the finals group and keeps
                the qualifying road one tap away rather than dropping it. */}
            <h3 className="text-sm font-black uppercase tracking-wide">
              {hasGroup ? `${t.groupLabel ?? "Group stage"}` : "Qualifying"}
            </h3>
            {hasGroup && (
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { k: "group", label: "Group stage" },
                  { k: "road", label: "Qualifying" },
                ] as const).map(b => (
                  <button
                    key={b.k}
                    onClick={() => setTable(b.k)}
                    className={`rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors ${
                      table === b.k
                        ? "border-primary/50 bg-primary/15 text-foreground"
                        : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            )}
            {hasGroup && table === "group" ? (
              <>
                <p className="text-xs text-muted-foreground">
                  {t.groupLabel ?? "Your group"} at the finals, one game against each side. Top two go
                  through{(t.thirdsThrough ?? 0) > 0 ? `, plus the ${t.thirdsThrough} best third placed sides` : ""}.
                  {" "}{t.nation} finished {ordinal(myGroupPos)} of {t.groupTable.length}.
                </p>
                <TableCard rows={t.groupTable} nation={t.nation} title={t.groupLabel ?? "Group table"} />
              </>
            ) : t.qualifying.automatic ? (
              <p className="text-xs text-muted-foreground">
                Every side in your confederation goes straight to this one. No qualifying to play.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  {t.qualifying.confederation} qualifying group, home and away. Top {t.qualifying.through} go
                  to the finals. You finished {ordinal(t.qualifying.myPosition)}.
                </p>
                <TableCard rows={t.qualifying.table} nation={t.nation} title="Qualifying table" />
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
                {/* Round 197, his direct ask: the actual starting eleven,
                    not a rank and a score. The sheet reads the way a team
                    sheet does, front line at the top, keeper at the back. */}
                {t.squad.xi ? (
                  <div data-team-sheet className="rounded-xl border border-border/60 bg-gradient-to-b from-emerald-950/40 to-background p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-[9px] uppercase tracking-wide text-muted-foreground">
                      <span>{t.nation} starting eleven</span>
                      <span>{t.squad.xi.formation}</span>
                    </div>
                    {[t.squad.xi.att, t.squad.xi.mid, t.squad.xi.def, t.squad.xi.gk].map((line, li) => (
                      <div key={li} className="flex justify-center gap-1.5">
                        {line.map((m, mi) => (
                          <div
                            key={`${li}-${mi}`}
                            data-xi-man={m.me ? "me" : "other"}
                            className={[
                              "flex-1 min-w-0 rounded-lg px-1.5 py-1 text-center border",
                              m.me
                                ? "border-gold bg-gold/15 text-foreground"
                                : "border-border/50 bg-background/60 text-muted-foreground",
                            ].join(" ")}
                          >
                            <div className="text-[8px] font-bold uppercase tracking-wide opacity-70">{m.slot}</div>
                            <div className={`truncate text-[10px] ${m.me ? "font-black" : "font-semibold"}`}>{m.name}</div>
                            <div className="text-[9px] tabular-nums opacity-80">{m.ovr}</div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : null}
                <p className="text-[11px] text-muted-foreground">
                  {t.squad.xi?.mySlot
                    ? `You start at ${t.squad.xi.mySlot}${t.squad.role === "Captain" ? ", with the armband" : ""}.`
                    : t.squad.called
                      ? `You are in the squad but not the eleven${t.squad.xi?.aheadOfMe ? `: ${t.squad.xi.aheadOfMe} keeps you out` : ""}. Play your way in.`
                      : `You are watching this one from home. Rating and form, nothing else.`}
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
      key: "qualifying",
      emoji: hasGroup ? "📊" : "🎫",
      label: hasGroup ? "Group Stage" : "Qualifying",
      sub: hasGroup
        ? `${ordinal(myGroupPos)} of ${t.groupTable.length}`
        : t.qualifying.automatic ? "Straight in" : `${t.qualifying.myPosition} of ${t.qualifying.table.length}`,
    },
    {
      key: "squad", emoji: "📋", label: "The Squad",
      sub: t.squad?.called ? (t.squad.role ?? "In") : t.qualified ? "Left out" : "No squad",
    },
    { key: "bracket", emoji: "🗺️", label: "Bracket", sub: `${t.teams} nations` },
    { key: "matches", emoji: "⚽", label: "Your Games", sub: `${t.playerApps} apps` },
  ];

  /* Round 926: a won tournament lands as the biggest night of the career.
     Gold confetti, the trophy and the title slam in, and every line under
     them ticks in on the kit's pace. This is every tournament the engine
     runs, not only the World Cup: the Euros, the Copa, the Africa Cup of
     Nations, the Asian Cup, the Gold Cup and the OFC Nations Cup too.
     Anything else (out in the group, beaten
     in the final, never picked) stays quiet: the card rises in once, no shake
     and no confetti. Every animated class sits on a wrapper, never on a
     control, and every number prints its final value from the first frame.
     Transforms and opacity only, so the card's box never moves. */
  const won = fresh && isWinner;
  const quiet = fresh && !isWinner;
  let beat = 0;
  const nextBeat = () => ({ animationDelay: beatDelay(beat++) });

  return (
    <div
      ref={revealRef}
      data-intl-moment={won ? "won" : quiet ? "quiet" : "none"}
      className={`relative rounded-xl border-2 ${border} bg-gradient-to-b ${grad} to-transparent p-4 space-y-3${quiet ? " cm-rise" : ""}`}
    >
      <div className="text-center space-y-1.5">
        <div className={`text-3xl${won ? " cm-slam" : ""}`} style={won ? nextBeat() : undefined}>
          {isWinner ? "🏆" : missed ? "😞" : "🌍"}
        </div>
        <h3 className={`text-lg font-black leading-tight${won ? " cm-slam" : ""}`} style={won ? nextBeat() : undefined}>
          {t.name} {t.year}
        </h3>
        <div
          className={`flex items-center justify-center gap-1.5 flex-wrap${won ? " cm-rise" : ""}`}
          style={won ? nextBeat() : undefined}
        >
          <span className="text-xs font-bold flex items-center gap-1">
            <FlagImg name={t.nation} size={16} />{t.nation}
          </span>
          <ResultPill result={t.myResult} />
        </div>
        <p
          className={`text-[11px] text-muted-foreground flex items-center justify-center gap-1 flex-wrap${won ? " cm-rise" : ""}`}
          style={won ? nextBeat() : undefined}
        >
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
            <div
              key={s.l}
              className={`text-center bg-muted/20 rounded-lg p-1.5${won ? " cm-tick-in" : ""}`}
              style={won ? nextBeat() : undefined}
            >
              <div className="text-base font-black">{s.v}</div>
              <div className="text-[9px] text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      )}

      {(t.bestPlayer || t.goldenBoot) && (
        <div
          className={`bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-center space-y-0.5${won ? " cm-rise" : ""}`}
          style={won ? nextBeat() : undefined}
        >
          {t.bestPlayer && <div className="text-xs font-bold">🌟 Best Player of the tournament</div>}
          {t.goldenBoot && <div className="text-xs font-bold">👟 Golden Boot, {t.playerGoals} goals</div>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        {tiles.map(tile => (
          /* Round 926: the entrance sits on this wrapper, not the button, so
             the button's hover still works once the animation has filled. It
             is the gated rise because a tile is a control: hidden (so it cannot
             be tapped) through its delay, since one tap ends the moment. */
          <div
            key={tile.key}
            data-intl-tile={tile.key}
            className={`min-w-0${won ? " cm-rise-gated" : ""}`}
            style={won ? nextBeat() : undefined}
          >
            <button
              onClick={() => { setFresh(false); setScreen(tile.key); }}
              className="w-full h-full bg-muted/20 hover:bg-muted/40 border border-border rounded-lg p-2 text-left transition-colors min-w-0"
            >
              <div className="text-base leading-none">{tile.emoji}</div>
              <div className="text-[11px] font-bold truncate">{tile.label}</div>
              <div className="text-[9px] text-muted-foreground truncate">{tile.sub}</div>
            </button>
          </div>
        ))}
      </div>

      {isWinner ? (
        /* Round 834: the shared speech buttons, from the same options the
           engine applies (SOCCER_WORLD_CUP_SPEECHES). Round 926: on the
           night itself they land last and cannot be pressed before they show
           (cm-rise-gated keeps them hidden through the delay). */
        <div className={won ? "cm-rise-gated" : undefined} style={won ? nextBeat() : undefined}>
          <SpeechChoices prompt="The microphone is yours" options={SOCCER_WORLD_CUP_SPEECHES} onChoose={onSpeech} />
        </div>
      ) : (
        <Button onClick={onDismiss} className="w-full h-10 text-sm font-bold text-black bg-emerald-600 hover:bg-emerald-500">
          Continue →
        </Button>
      )}
      {/* Round 926: last child on purpose. It is absolutely positioned over
          the whole card, and as the first child it would push the headline
          down by the space-y gap. Pointer events off, aria hidden, and it
          renders nothing for a visitor who asked for less motion. */}
      {won && <Confetti pieces={60} gold />}
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
