import { useState, useEffect, useCallback, useMemo, useRef, MutableRefObject } from "react";
import { Trophy, Zap, Loader2 } from "lucide-react";
import { FlagImg, getFifaRank, rankWinner } from "@/pages/WorldCupPredictor";
import { buildKnockoutRounds, buildRound32, validPick } from "@/lib/wc2026Bracket";
import { clearWc2026ChildStorage, WC2026_STORAGE_KEYS, wc2026SeedSignature } from "@/lib/wc2026Lifecycle";

/* ───── types ───── */

export interface GroupSeed {
  first: string;
  second: string;
  third: string;
  thirdPts: number;
  thirdGD: number;
  thirdGF: number;
}

// picks stored as matchId → winning team name
type KnockoutPicks = Record<string, string>;

export interface BracketMatch {
  id: string;
  teamA: string;
  teamB: string;
  winner: string;
}

/* ───── bracket seeding ─────
   Round 396: the round of 32 comes from src/lib/wc2026Bracket.ts, the real
   bracket order and the real third-place allocation, so the tournament as
   played can be rebuilt here. The old template paired the wrong winners
   with thirds and handed the thirds out in ranking order. */

const ROUND_NAMES = ["Round of 32", "Round of 16", "Quarter-finals", "Semi-finals", "Third Place", "Final"];
const ROUND_PREFIXES = ["r32", "r16", "qf", "sf", "tp", "f"];
const ROUND_MATCH_COUNTS = [16, 8, 4, 2, 1, 1];

function loadPicks(expectedSignature: string): KnockoutPicks {
  try {
    if (localStorage.getItem(WC2026_STORAGE_KEYS.knockoutSignature) !== expectedSignature) return {};
    const raw = localStorage.getItem(WC2026_STORAGE_KEYS.knockout);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // a save written by another version can hold anything, only a plain object is usable
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    // Migration: old format stored {scoreA, scoreB} objects, clear if detected
    const firstVal = Object.values(parsed)[0];
    if (firstVal && typeof firstVal === "object") {
      clearWc2026ChildStorage(localStorage, false);
      return {};
    }
    // drop any non string values so downstream string ops never see garbage
    return Object.fromEntries(Object.entries(parsed).filter(([, v]) => typeof v === "string")) as KnockoutPicks;
  } catch {
    return {};
  }
}

/* ───── component ───── */

export interface AutoFillHandle {
  autoFillAllRounds: () => void;
}

interface KnockoutBracketProps {
  seeds: Record<string, GroupSeed>;
  bestThirds: { team: string; group: string }[];
  onChampionChange?: (champion: string) => void;
  /** Round 395: the rounds as built from the picks, so the page can score them. */
  onRoundsChange?: (rounds: BracketMatch[][]) => void;
  autoFillRef?: MutableRefObject<AutoFillHandle | null>;
}

const KnockoutBracket = ({ seeds, bestThirds, onChampionChange, onRoundsChange, autoFillRef }: KnockoutBracketProps) => {
  const signature = useMemo(() => wc2026SeedSignature(seeds, bestThirds), [seeds, bestThirds]);
  const signatureRef = useRef(signature);
  const [picks, setPicks] = useState<KnockoutPicks>(() => loadPicks(signature));
  const activePicks = signatureRef.current === signature ? picks : {};
  const [roundLoading, setRoundLoading] = useState<number | null>(null);
  const roundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (signatureRef.current !== signature) return;
    if (Object.keys(picks).length === 0) {
      clearWc2026ChildStorage(localStorage, false);
      return;
    }
    localStorage.setItem(WC2026_STORAGE_KEYS.knockout, JSON.stringify(picks));
    localStorage.setItem(WC2026_STORAGE_KEYS.knockoutSignature, signature);
  }, [picks, signature]);

  useEffect(() => {
    if (signatureRef.current === signature) return;
    signatureRef.current = signature;
    clearWc2026ChildStorage(localStorage, false);
    if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
    roundTimerRef.current = null;
    setRoundLoading(null);
    setPicks({});
    onChampionChange?.("");
    onRoundsChange?.([]);
  }, [signature, onChampionChange, onRoundsChange]);

  useEffect(() => () => {
    if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
  }, []);

  /* Round 396: one builder for the round of 32, shared by the three places
     that rebuild the bracket. */
  const round32Build = useMemo(() => buildRound32(seeds, bestThirds), [seeds, bestThirds]);
  const allocationUnavailable = round32Build.allocation === "unverified";
  const round32 = useCallback(() => round32Build.slots, [round32Build]);

  // When picking a winner, also clear downstream picks that depended on different outcomes
  const handlePick = useCallback((matchId: string, winner: string) => {
    setPicks((prev) => {
      const next = { ...prev };
      // Toggle off if same pick
      if (next[matchId] === winner) {
        delete next[matchId];
        // Clear all downstream
        clearDownstream(next, matchId);
        return next;
      }
      // If changing pick, clear downstream
      if (next[matchId] && next[matchId] !== winner) {
        clearDownstream(next, matchId);
      }
      next[matchId] = winner;
      return next;
    });
  }, []);

  // Build all rounds
  const rounds = useMemo<BracketMatch[][]>(
    () => buildKnockoutRounds(round32(), activePicks),
    [round32, activePicks],
  );

  // Auto-fill a specific round by FIFA rank
  const autoFillRound = useCallback((roundIdx: number) => {
    setPicks((prev) => {
      const next = { ...prev };
      // Rebuild rounds with current picks to get correct teams
      const allRounds: BracketMatch[][] = [];
      const r32: BracketMatch[] = round32().map((slot, i) => {
        const id = `r32-${i}`;
        return { id, teamA: slot.a, teamB: slot.b, winner: validPick(next[id], slot.a, slot.b) };
      });
      allRounds.push(r32);
      for (let r = 1; r <= 3; r++) {
        const prevRound = allRounds[r - 1];
        const round: BracketMatch[] = [];
        for (let i = 0; i < prevRound.length; i += 2) {
          const id = `${ROUND_PREFIXES[r]}-${i / 2}`;
          const teamA = prevRound[i].winner || "";
          const teamB = prevRound[i + 1]?.winner || "";
          round.push({ id, teamA, teamB, winner: validPick(next[id], teamA, teamB) });
        }
        allRounds.push(round);
      }
      // SF losers → tp, SF winners → final
      const sf = allRounds[3];
      const sfLoserA = sf[0]?.winner ? (sf[0].winner === sf[0].teamA ? sf[0].teamB : sf[0].teamA) : "";
      const sfLoserB = sf[1]?.winner ? (sf[1].winner === sf[1].teamA ? sf[1].teamB : sf[1].teamA) : "";
      allRounds.push([{ id: "tp-0", teamA: sfLoserA, teamB: sfLoserB, winner: validPick(next["tp-0"], sfLoserA, sfLoserB) }]);
      allRounds.push([{ id: "f-0", teamA: sf[0]?.winner || "", teamB: sf[1]?.winner || "", winner: validPick(next["f-0"], sf[0]?.winner || "", sf[1]?.winner || "") }]);

      const round = allRounds[roundIdx];
      if (round) {
        for (const m of round) {
          if (m.teamA && m.teamB && !next[m.id]) {
            next[m.id] = rankWinner(m.teamA, m.teamB);
          }
        }
      }
      return next;
    });
  }, [round32]);

  // Auto-fill ALL rounds sequentially
  const autoFillAllRounds = useCallback(() => {
    setPicks((prev) => {
      const next = { ...prev };

      // R32
      const r32: BracketMatch[] = round32().map((slot, i) => {
        const id = `r32-${i}`;
        const tA = slot.a;
        const tB = slot.b;
        if (!validPick(next[id], tA, tB)) delete next[id];
        if (tA && tB && tA !== "TBD" && tB !== "TBD" && !next[id]) next[id] = rankWinner(tA, tB);
        return { id, teamA: tA, teamB: tB, winner: validPick(next[id], tA, tB) };
      });

      // R16, QF, SF
      let prevRound = r32;
      for (let r = 1; r <= 3; r++) {
        const round: BracketMatch[] = [];
        for (let i = 0; i < prevRound.length; i += 2) {
          const id = `${ROUND_PREFIXES[r]}-${i / 2}`;
          const tA = prevRound[i].winner || "";
          const tB = prevRound[i + 1]?.winner || "";
          if (!validPick(next[id], tA, tB)) delete next[id];
          if (tA && tB && !next[id]) next[id] = rankWinner(tA, tB);
          round.push({ id, teamA: tA, teamB: tB, winner: validPick(next[id], tA, tB) });
        }
        prevRound = round;
      }

      // SF = prevRound at this point
      const sf = prevRound;
      // Third place
      const sfLoserA = sf[0]?.winner ? (sf[0].winner === sf[0].teamA ? sf[0].teamB : sf[0].teamA) : "";
      const sfLoserB = sf[1]?.winner ? (sf[1].winner === sf[1].teamA ? sf[1].teamB : sf[1].teamA) : "";
      if (sfLoserA && sfLoserB && !next["tp-0"]) next["tp-0"] = rankWinner(sfLoserA, sfLoserB);

      // Final
      const fA = sf[0]?.winner || "";
      const fB = sf[1]?.winner || "";
      if (fA && fB && !next["f-0"]) next["f-0"] = rankWinner(fA, fB);

      return next;
    });
  }, [round32]);

  // Expose auto-fill to parent via ref
  useEffect(() => {
    if (autoFillRef) {
      autoFillRef.current = { autoFillAllRounds };
    }
  }, [autoFillRef, autoFillAllRounds]);

  const champion = rounds[5]?.[0]?.winner || "";
  const thirdPlace = rounds[4]?.[0]?.winner || "";

  useEffect(() => {
    onChampionChange?.(champion);
  }, [champion, onChampionChange]);

  useEffect(() => {
    onRoundsChange?.(rounds);
  }, [rounds, onRoundsChange]);

  const handleAutoFillRound = (rIdx: number) => {
    if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
    setRoundLoading(rIdx);
    roundTimerRef.current = setTimeout(() => {
      autoFillRound(rIdx);
      setRoundLoading(null);
      roundTimerRef.current = null;
    }, 1000);
  };

  // Check if a round has unfilled matches
  const roundHasUnfilled = (rIdx: number): boolean => {
    const round = rounds[rIdx];
    if (!round) return false;
    return round.some((m) => m.teamA && m.teamB && m.teamA !== "TBD" && m.teamB !== "TBD" && !m.winner);
  };

  return (
    <div className="mt-10">
      {/* Champion banner */}
      {champion && (
        <div className="text-center mb-6 py-5 rounded-xl bg-gradient-to-r from-[hsl(45,80%,12%)] via-[hsl(45,90%,18%)] to-[hsl(45,80%,12%)] border-2 border-[hsl(45,70%,35%)] shadow-lg shadow-[hsl(45,80%,30%)]/20">
          <p className="text-[hsl(45,90%,60%)] text-xs uppercase tracking-[0.2em] font-bold mb-2">
            🏆 Your Predicted Champion 🏆
          </p>
          <p className="text-3xl sm:text-4xl font-black text-white drop-shadow-lg">
            <FlagImg name={champion} size={32} />{champion}
          </p>
          {thirdPlace && (
            <p className="text-sm text-[hsl(150,15%,55%)] mt-3">
              🥉 Third Place: <span className="font-bold text-white"><FlagImg name={thirdPlace} />{thirdPlace}</span>
            </p>
          )}
        </div>
      )}

      <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-[hsl(45,90%,55%)]" />
        Knockout Bracket
      </h2>
      <p className="text-[hsl(150,15%,50%)] text-xs sm:text-sm mb-4">
        Click a team to pick them as the winner. They'll auto-advance to the next round.
      </p>

      {allocationUnavailable && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-amber-500/50 bg-amber-950/40 px-3 py-2 text-xs text-amber-100"
        >
          We could not build the official Round of 32 for these selections. Recheck the eight third-place teams or reset them. No third-place matchup has been guessed.
        </p>
      )}

      {/* Bracket, horizontally scrollable with snap on mobile */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory md:snap-none md:mx-0 md:px-0">
        <div className="flex gap-2 sm:gap-3" style={{ minWidth: "1100px" }}>
          {rounds.map((round, rIdx) => (
            <div key={rIdx} className="flex flex-col snap-start" style={{ width: rIdx === 0 ? "200px" : "185px" }}>
              <div className="text-center mb-2">
                <span className="text-[hsl(45,90%,55%)] text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                  {ROUND_NAMES[rIdx]}
                </span>
                <span className="block text-[hsl(150,15%,48%)] text-[9px]">
                  {ROUND_MATCH_COUNTS[rIdx]} match{ROUND_MATCH_COUNTS[rIdx] > 1 ? "es" : ""}
                </span>
                {/* Per-round auto-fill button */}
                {roundHasUnfilled(rIdx) && (
                  <button
                    onClick={() => handleAutoFillRound(rIdx)}
                    disabled={roundLoading === rIdx}
                    className="mt-1 inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded
                      bg-[hsl(220,20%,18%)] hover:bg-[hsl(220,20%,22%)] text-[hsl(45,80%,60%)]
                      border border-[hsl(220,20%,28%)] transition-colors disabled:opacity-50"
                  >
                    {roundLoading === rIdx ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Zap className="w-2.5 h-2.5" />}
                    Auto Fill
                  </button>
                )}
              </div>

              <div
                className={`flex flex-col flex-1 ${rIdx === 0 ? "gap-3" : "justify-around"}`}
                style={{ minHeight: `${16 * 62}px` }}
              >
                {round.map((match, mIdx) => (
                  <div key={match.id} className="flex flex-col">
                    {rIdx === 0 && (
                      <span className="text-[9px] font-bold text-[hsl(150,15%,48%)] uppercase tracking-wider mb-1 text-center">
                        Match {mIdx + 1}
                      </span>
                    )}
                    <MatchCard
                      match={match}
                      onPick={handlePick}
                      isFinal={rIdx === 5}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ───── clear downstream picks ───── */

function clearDownstream(picks: KnockoutPicks, matchId: string) {
  const [prefix, idxStr] = matchId.split("-");
  const idx = parseInt(idxStr);
  const roundOrder = ROUND_PREFIXES;
  const rIdx = roundOrder.indexOf(prefix);
  if (rIdx < 0) return;

  const toClear: string[] = [];

  if (rIdx <= 2) {
    let currentIdx = idx;
    for (let r = rIdx + 1; r <= 3; r++) {
      currentIdx = Math.floor(currentIdx / 2);
      toClear.push(`${roundOrder[r]}-${currentIdx}`);
    }
    toClear.push("tp-0", "f-0");
  } else if (rIdx === 3) {
    toClear.push("tp-0", "f-0");
  }

  for (const id of toClear) {
    delete picks[id];
  }
}

/* ───── Match Card ───── */

interface MatchCardProps {
  match: BracketMatch;
  onPick: (id: string, winner: string) => void;
  isFinal?: boolean;
}

const MatchCard = ({ match, onPick, isFinal }: MatchCardProps) => {
  const { id, teamA, teamB, winner } = match;
  const bothTeams = !!teamA && !!teamB && teamA !== "TBD" && teamB !== "TBD";

  const shortName = (name: string) => {
    if (!name) return <span>TBD</span>;
    const display = name.length > 12 ? name.slice(0, 10) + "…" : name;
    return <><FlagImg name={name} />{display}</>;
  };

  const teamRow = (team: string, isWinner: boolean) => {
    const canClick = bothTeams && !!team;
    return (
      <button
        disabled={!canClick}
        onClick={() => canClick && onPick(id, team)}
        className={`w-full flex items-center gap-1 px-2 py-2 text-left transition-all ${
          isWinner
            ? "bg-[hsl(140,50%,18%)]"
            : canClick
            ? "hover:bg-[hsl(220,12%,18%)]"
            : ""
        } ${!canClick ? "cursor-default" : "cursor-pointer"}`}
      >
        <span
          className={`flex-1 truncate font-semibold text-[11px] ${
            team
              ? isWinner
                ? "text-[hsl(140,60%,65%)]"
                : "text-white"
              : "text-[hsl(0,0%,52%)] italic"
          }`}
          title={team}
        >
          {shortName(team)}
        </span>
        {isWinner && (
          <span className="text-[hsl(140,60%,50%)] text-[10px] font-bold">✓</span>
        )}
      </button>
    );
  };

  return (
    <div className={`rounded-md overflow-hidden text-[11px] ${
      isFinal
        ? "bg-[hsl(45,20%,12%)] border-2 border-[hsl(45,60%,35%)] shadow-md shadow-[hsl(45,60%,30%)]/15"
        : "bg-[hsl(150,12%,12%)] border border-[hsl(150,15%,20%)]"
    }`}>
      {teamRow(teamA, winner === teamA)}
      <div className="h-px bg-[hsl(150,10%,18%)]" />
      {teamRow(teamB, winner === teamB)}
    </div>
  );
};

export default KnockoutBracket;
