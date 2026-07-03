import { useState, useEffect, useCallback, useMemo, MutableRefObject } from "react";
import { Trophy, Zap, Loader2 } from "lucide-react";
import { FlagImg, getFifaRank, rankWinner } from "@/pages/WorldCupPredictor";

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

interface BracketMatch {
  id: string;
  teamA: string;
  teamB: string;
  winner: string;
}

/* ───── bracket seeding ───── */

const R32_TEMPLATE: [string, string][] = [
  ["1A", "3rd_1"],
  ["2C", "2D"],
  ["1B", "3rd_2"],
  ["2E", "2F"],
  ["1C", "3rd_3"],
  ["2G", "2H"],
  ["1D", "3rd_4"],
  ["2A", "2B"],
  ["1E", "3rd_5"],
  ["1I", "2J"],
  ["1F", "3rd_6"],
  ["1J", "2I"],
  ["1G", "3rd_7"],
  ["1K", "2L"],
  ["1H", "3rd_8"],
  ["1L", "2K"],
];

const ROUND_NAMES = ["Round of 32", "Round of 16", "Quarter-finals", "Semi-finals", "Third Place", "Final"];
const ROUND_PREFIXES = ["r32", "r16", "qf", "sf", "tp", "f"];
const ROUND_MATCH_COUNTS = [16, 8, 4, 2, 1, 1];

const KO_STORAGE_KEY = "wc2026-knockout";

function loadPicks(): KnockoutPicks {
  try {
    const raw = localStorage.getItem(KO_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // Migration: old format stored {scoreA, scoreB} objects — clear if detected
    const firstVal = Object.values(parsed)[0];
    if (firstVal && typeof firstVal === "object") {
      localStorage.removeItem(KO_STORAGE_KEY);
      return {};
    }
    return parsed;
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
  bestThirds: { team: string }[];
  onChampionChange?: (champion: string) => void;
  autoFillRef?: MutableRefObject<AutoFillHandle | null>;
}

const KnockoutBracket = ({ seeds, bestThirds, onChampionChange, autoFillRef }: KnockoutBracketProps) => {
  const [picks, setPicks] = useState<KnockoutPicks>(loadPicks);

  useEffect(() => {
    localStorage.setItem(KO_STORAGE_KEY, JSON.stringify(picks));
  }, [picks]);

  const resolveSeed = useCallback(
    (label: string): string => {
      if (label.startsWith("3rd_")) {
        const idx = parseInt(label.split("_")[1]) - 1;
        return bestThirds[idx]?.team || "TBD";
      }
      const pos = label[0];
      const group = label.slice(1);
      const seed = seeds[group];
      if (!seed) return "TBD";
      return pos === "1" ? seed.first : seed.second;
    },
    [seeds, bestThirds],
  );

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
  const rounds = useMemo(() => {
    const allRounds: BracketMatch[][] = [];

    // R32
    const r32: BracketMatch[] = R32_TEMPLATE.map(([a, b], i) => {
      const id = `r32-${i}`;
      return {
        id,
        teamA: resolveSeed(a),
        teamB: resolveSeed(b),
        winner: picks[id] || "",
      };
    });
    allRounds.push(r32);

    // R16, QF, SF
    for (let r = 1; r <= 3; r++) {
      const prev = allRounds[r - 1];
      const round: BracketMatch[] = [];
      for (let i = 0; i < prev.length; i += 2) {
        const id = `${ROUND_PREFIXES[r]}-${i / 2}`;
        const teamA = prev[i].winner || "";
        const teamB = prev[i + 1]?.winner || "";
        round.push({ id, teamA, teamB, winner: (teamA && teamB) ? (picks[id] || "") : "" });
      }
      allRounds.push(round);
    }

    // Third Place Play-off
    const sf = allRounds[3];
    const sfLoserA = sf[0]?.winner ? (sf[0].winner === sf[0].teamA ? sf[0].teamB : sf[0].teamA) : "";
    const sfLoserB = sf[1]?.winner ? (sf[1].winner === sf[1].teamA ? sf[1].teamB : sf[1].teamA) : "";
    const tpId = "tp-0";
    allRounds.push([{
      id: tpId,
      teamA: sfLoserA,
      teamB: sfLoserB,
      winner: (sfLoserA && sfLoserB) ? (picks[tpId] || "") : "",
    }]);

    // Final
    const fId = "f-0";
    const fTeamA = sf[0]?.winner || "";
    const fTeamB = sf[1]?.winner || "";
    allRounds.push([{
      id: fId,
      teamA: fTeamA,
      teamB: fTeamB,
      winner: (fTeamA && fTeamB) ? (picks[fId] || "") : "",
    }]);

    return allRounds;
  }, [resolveSeed, picks]);

  // Auto-fill a specific round by FIFA rank
  const autoFillRound = useCallback((roundIdx: number) => {
    setPicks((prev) => {
      const next = { ...prev };
      // Rebuild rounds with current picks to get correct teams
      const allRounds: BracketMatch[][] = [];
      const r32: BracketMatch[] = R32_TEMPLATE.map(([a, b], i) => {
        const id = `r32-${i}`;
        return { id, teamA: resolveSeed(a), teamB: resolveSeed(b), winner: next[id] || "" };
      });
      allRounds.push(r32);
      for (let r = 1; r <= 3; r++) {
        const prevRound = allRounds[r - 1];
        const round: BracketMatch[] = [];
        for (let i = 0; i < prevRound.length; i += 2) {
          const id = `${ROUND_PREFIXES[r]}-${i / 2}`;
          const teamA = prevRound[i].winner || "";
          const teamB = prevRound[i + 1]?.winner || "";
          round.push({ id, teamA, teamB, winner: (teamA && teamB) ? (next[id] || "") : "" });
        }
        allRounds.push(round);
      }
      // SF losers → tp, SF winners → final
      const sf = allRounds[3];
      const sfLoserA = sf[0]?.winner ? (sf[0].winner === sf[0].teamA ? sf[0].teamB : sf[0].teamA) : "";
      const sfLoserB = sf[1]?.winner ? (sf[1].winner === sf[1].teamA ? sf[1].teamB : sf[1].teamA) : "";
      allRounds.push([{ id: "tp-0", teamA: sfLoserA, teamB: sfLoserB, winner: (sfLoserA && sfLoserB) ? (next["tp-0"] || "") : "" }]);
      allRounds.push([{ id: "f-0", teamA: sf[0]?.winner || "", teamB: sf[1]?.winner || "", winner: (sf[0]?.winner && sf[1]?.winner) ? (next["f-0"] || "") : "" }]);

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
  }, [resolveSeed]);

  // Auto-fill ALL rounds sequentially
  const autoFillAllRounds = useCallback(() => {
    setPicks((prev) => {
      const next = { ...prev };

      // R32
      const r32: BracketMatch[] = R32_TEMPLATE.map(([a, b], i) => {
        const id = `r32-${i}`;
        const tA = resolveSeed(a);
        const tB = resolveSeed(b);
        if (tA && tB && !next[id]) next[id] = rankWinner(tA, tB);
        return { id, teamA: tA, teamB: tB, winner: next[id] || "" };
      });

      // R16, QF, SF
      let prevRound = r32;
      for (let r = 1; r <= 3; r++) {
        const round: BracketMatch[] = [];
        for (let i = 0; i < prevRound.length; i += 2) {
          const id = `${ROUND_PREFIXES[r]}-${i / 2}`;
          const tA = prevRound[i].winner || "";
          const tB = prevRound[i + 1]?.winner || "";
          if (tA && tB && !next[id]) next[id] = rankWinner(tA, tB);
          round.push({ id, teamA: tA, teamB: tB, winner: next[id] || "" });
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
  }, [resolveSeed]);

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

  // Per-round loading state
  const [roundLoading, setRoundLoading] = useState<number | null>(null);

  const handleAutoFillRound = (rIdx: number) => {
    setRoundLoading(rIdx);
    setTimeout(() => {
      autoFillRound(rIdx);
      setRoundLoading(null);
    }, 1000);
  };

  // Check if a round has unfilled matches
  const roundHasUnfilled = (rIdx: number): boolean => {
    const round = rounds[rIdx];
    if (!round) return false;
    return round.some((m) => m.teamA && m.teamB && !m.winner);
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

      {/* Bracket — horizontally scrollable with snap on mobile */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory md:snap-none md:mx-0 md:px-0">
        <div className="flex gap-2 sm:gap-3" style={{ minWidth: "1100px" }}>
          {rounds.map((round, rIdx) => (
            <div key={rIdx} className="flex flex-col snap-start" style={{ width: rIdx === 0 ? "200px" : "185px" }}>
              <div className="text-center mb-2">
                <span className="text-[hsl(45,90%,55%)] text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                  {ROUND_NAMES[rIdx]}
                </span>
                <span className="block text-[hsl(150,15%,40%)] text-[9px]">
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
                      <span className="text-[9px] font-bold text-[hsl(150,15%,40%)] uppercase tracking-wider mb-1 text-center">
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
  const bothTeams = !!teamA && !!teamB;

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
              : "text-[hsl(0,0%,35%)] italic"
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
