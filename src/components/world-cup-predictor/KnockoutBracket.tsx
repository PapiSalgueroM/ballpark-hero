import { useState, useEffect, useCallback, useMemo } from "react";
import { Trophy } from "lucide-react";

/* ───── types ───── */

interface KnockoutScore {
  scoreA: number | "";
  scoreB: number | "";
}

type KnockoutScores = Record<string, KnockoutScore>;

export interface GroupSeed {
  first: string;
  second: string;
  third: string;
  thirdPts: number;
  thirdGD: number;
  thirdGF: number;
}

interface BracketMatchData {
  id: string;
  teamA: string;
  teamB: string;
  scoreA: number | "";
  scoreB: number | "";
  winner: string;
}

/* ───── bracket seeding ───── */

// R32 pairings using seed labels → resolved to team names
// 8 group winners vs 3rd-place, 4 group winners vs runners-up, 4 runners-up vs runners-up
const R32_TEMPLATE: [string, string][] = [
  ["1A", "3rd_1"],  // M0
  ["2C", "2D"],     // M1
  ["1B", "3rd_2"],  // M2
  ["2E", "2F"],     // M3
  ["1C", "3rd_3"],  // M4
  ["2G", "2H"],     // M5
  ["1D", "3rd_4"],  // M6
  ["2A", "2B"],     // M7
  ["1E", "3rd_5"],  // M8
  ["1I", "2J"],     // M9
  ["1F", "3rd_6"],  // M10
  ["1J", "2I"],     // M11
  ["1G", "3rd_7"],  // M12
  ["1K", "2L"],     // M13
  ["1H", "3rd_8"],  // M14
  ["1L", "2K"],     // M15
];

const ROUND_NAMES = ["Round of 32", "Round of 16", "Quarter-finals", "Semi-finals", "Third Place", "Final"];
const ROUND_PREFIXES = ["r32", "r16", "qf", "sf", "tp", "f"];
const ROUND_MATCH_COUNTS = [16, 8, 4, 2, 1, 1];

const KO_STORAGE_KEY = "wc2026-knockout";

function loadKnockoutScores(): KnockoutScores {
  try {
    const raw = localStorage.getItem(KO_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function getWinner(teamA: string, teamB: string, scoreA: number | "", scoreB: number | ""): string {
  if (!teamA || !teamB || scoreA === "" || scoreB === "") return "";
  const a = Number(scoreA);
  const b = Number(scoreB);
  if (a > b) return teamA;
  if (b > a) return teamB;
  return teamA; // home team wins on penalties if draw
}

/* ───── component ───── */

interface KnockoutBracketProps {
  seeds: Record<string, GroupSeed>;
  bestThirds: { team: string }[];
}

const KnockoutBracket = ({ seeds, bestThirds }: KnockoutBracketProps) => {
  const [scores, setScores] = useState<KnockoutScores>(loadKnockoutScores);

  useEffect(() => {
    localStorage.setItem(KO_STORAGE_KEY, JSON.stringify(scores));
  }, [scores]);

  const handleScore = useCallback(
    (matchId: string, field: "scoreA" | "scoreB", val: number | "") => {
      setScores((prev) => ({
        ...prev,
        [matchId]: { ...prev[matchId], [field]: val },
      }));
    },
    [],
  );

  // Resolve seed labels to team names
  const resolveSeed = useCallback(
    (label: string): string => {
      if (label.startsWith("3rd_")) {
        const idx = parseInt(label.split("_")[1]) - 1;
        return bestThirds[idx]?.team || "TBD";
      }
      const pos = label[0]; // "1" or "2"
      const group = label.slice(1); // e.g. "A"
      const seed = seeds[group];
      if (!seed) return "TBD";
      return pos === "1" ? seed.first : seed.second;
    },
    [seeds, bestThirds],
  );

  // Build all rounds
  const rounds = useMemo(() => {
    const allRounds: BracketMatchData[][] = [];

    // R32
    const r32: BracketMatchData[] = R32_TEMPLATE.map(([a, b], i) => {
      const id = `r32-${i}`;
      const teamA = resolveSeed(a);
      const teamB = resolveSeed(b);
      const sc = scores[id] || { scoreA: "", scoreB: "" };
      return {
        id,
        teamA,
        teamB,
        scoreA: sc.scoreA,
        scoreB: sc.scoreB,
        winner: getWinner(teamA, teamB, sc.scoreA, sc.scoreB),
      };
    });
    allRounds.push(r32);

    // Subsequent rounds up to SF (index 3)
    for (let r = 1; r <= 3; r++) {
      const prev = allRounds[r - 1];
      const round: BracketMatchData[] = [];
      for (let i = 0; i < prev.length; i += 2) {
        const id = `${ROUND_PREFIXES[r]}-${i / 2}`;
        const teamA = prev[i].winner || "";
        const teamB = prev[i + 1]?.winner || "";
        const sc = scores[id] || { scoreA: "", scoreB: "" };
        round.push({
          id,
          teamA,
          teamB,
          scoreA: teamA && teamB ? sc.scoreA : "",
          scoreB: teamA && teamB ? sc.scoreB : "",
          winner: teamA && teamB ? getWinner(teamA, teamB, sc.scoreA, sc.scoreB) : "",
        });
      }
      allRounds.push(round);
    }

    // Third Place Play-off (losers of SF)
    const sf = allRounds[3]; // semi-finals
    const sfLoserA = sf[0] ? (sf[0].winner ? (sf[0].winner === sf[0].teamA ? sf[0].teamB : sf[0].teamA) : "") : "";
    const sfLoserB = sf[1] ? (sf[1].winner ? (sf[1].winner === sf[1].teamA ? sf[1].teamB : sf[1].teamA) : "") : "";
    const tpId = "tp-0";
    const tpSc = scores[tpId] || { scoreA: "", scoreB: "" };
    const tpTeamA = sfLoserA || "";
    const tpTeamB = sfLoserB || "";
    allRounds.push([{
      id: tpId,
      teamA: tpTeamA,
      teamB: tpTeamB,
      scoreA: tpTeamA && tpTeamB ? tpSc.scoreA : "",
      scoreB: tpTeamA && tpTeamB ? tpSc.scoreB : "",
      winner: tpTeamA && tpTeamB ? getWinner(tpTeamA, tpTeamB, tpSc.scoreA, tpSc.scoreB) : "",
    }]);

    // Final (winners of SF)
    const fId = "f-0";
    const fSc = scores[fId] || { scoreA: "", scoreB: "" };
    const fTeamA = sf[0]?.winner || "";
    const fTeamB = sf[1]?.winner || "";
    allRounds.push([{
      id: fId,
      teamA: fTeamA,
      teamB: fTeamB,
      scoreA: fTeamA && fTeamB ? fSc.scoreA : "",
      scoreB: fTeamA && fTeamB ? fSc.scoreB : "",
      winner: fTeamA && fTeamB ? getWinner(fTeamA, fTeamB, fSc.scoreA, fSc.scoreB) : "",
    }]);

    return allRounds;
  }, [resolveSeed, scores]);

  // Champion is from the Final (index 5)
  const champion = rounds[5]?.[0]?.winner || "";
  const thirdPlace = rounds[4]?.[0]?.winner || "";

  return (
    <div className="mt-10">
      {/* Champion display */}
      {champion && (
        <div className="text-center mb-6 py-4 rounded-lg bg-[hsl(45,80%,15%)] border border-[hsl(45,70%,30%)]">
          <p className="text-[hsl(45,90%,55%)] text-xs uppercase tracking-widest font-semibold mb-1">
            Your Predicted Champion
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold text-white">
            🏆 {champion} 🏆
          </p>
        </div>
      )}

      <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-[hsl(45,90%,55%)]" />
        Knockout Bracket
      </h2>
      <p className="text-[hsl(150,15%,50%)] text-xs sm:text-sm mb-4">
        Enter scores for each match. Winners auto-advance. Draws decided on penalties (home team advances).
      </p>

      {/* Bracket container — horizontally scrollable */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-2 sm:gap-3" style={{ minWidth: "1100px" }}>
          {rounds.map((round, rIdx) => (
            <div key={rIdx} className="flex flex-col" style={{ width: rIdx === 0 ? "200px" : "185px" }}>
              {/* Round header */}
              <div className="text-center mb-2">
                <span className="text-[hsl(45,90%,55%)] text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                  {ROUND_NAMES[rIdx]}
                </span>
                <span className="block text-[hsl(150,15%,40%)] text-[9px]">
                  {ROUND_MATCH_COUNTS[rIdx]} match{ROUND_MATCH_COUNTS[rIdx] > 1 ? "es" : ""}
                </span>
              </div>

              {/* Matches with spacing to align with bracket tree */}
              <div
                className="flex flex-col justify-around flex-1"
                style={{ minHeight: `${16 * 62}px` }}
              >
                {round.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onScore={handleScore}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ───── Match Card ───── */

interface MatchCardProps {
  match: BracketMatchData;
  onScore: (id: string, field: "scoreA" | "scoreB", val: number | "") => void;
}

const MatchCard = ({ match, onScore }: MatchCardProps) => {
  const { id, teamA, teamB, scoreA, scoreB, winner } = match;
  const bothTeams = !!teamA && !!teamB;
  const isDraw = scoreA !== "" && scoreB !== "" && Number(scoreA) === Number(scoreB);

  const shortName = (name: string) => {
    if (!name) return "—";
    return name.length > 14 ? name.slice(0, 12) + "…" : name;
  };

  return (
    <div className="rounded-md bg-[hsl(150,12%,12%)] border border-[hsl(150,15%,20%)] overflow-hidden text-[11px]">
      {/* Team A */}
      <div
        className={`flex items-center gap-1 px-2 py-1.5 ${
          winner === teamA ? "bg-[hsl(140,40%,18%)]" : ""
        }`}
      >
        <span
          className={`flex-1 truncate font-semibold ${
            teamA ? (winner === teamA ? "text-[hsl(140,60%,65%)]" : "text-white") : "text-[hsl(0,0%,35%)] italic"
          }`}
          title={teamA}
        >
          {shortName(teamA)}
        </span>
        {bothTeams ? (
          <input
            type="number"
            min={0}
            max={9}
            value={scoreA}
            onChange={(e) => {
              const v = e.target.value;
              onScore(id, "scoreA", v === "" ? "" : Math.min(9, Math.max(0, Number(v))));
            }}
            className="w-7 h-6 text-center text-xs font-bold rounded bg-[hsl(150,12%,18%)] border border-[hsl(150,20%,25%)] text-white focus:outline-none focus:border-[hsl(45,90%,55%)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        ) : (
          <span className="w-7 h-6 flex items-center justify-center text-[hsl(0,0%,30%)]">–</span>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-[hsl(150,10%,18%)]" />

      {/* Team B */}
      <div
        className={`flex items-center gap-1 px-2 py-1.5 ${
          winner === teamB ? "bg-[hsl(140,40%,18%)]" : ""
        }`}
      >
        <span
          className={`flex-1 truncate font-semibold ${
            teamB ? (winner === teamB ? "text-[hsl(140,60%,65%)]" : "text-white") : "text-[hsl(0,0%,35%)] italic"
          }`}
          title={teamB}
        >
          {shortName(teamB)}
        </span>
        {bothTeams ? (
          <input
            type="number"
            min={0}
            max={9}
            value={scoreB}
            onChange={(e) => {
              const v = e.target.value;
              onScore(id, "scoreB", v === "" ? "" : Math.min(9, Math.max(0, Number(v))));
            }}
            className="w-7 h-6 text-center text-xs font-bold rounded bg-[hsl(150,12%,18%)] border border-[hsl(150,20%,25%)] text-white focus:outline-none focus:border-[hsl(45,90%,55%)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        ) : (
          <span className="w-7 h-6 flex items-center justify-center text-[hsl(0,0%,30%)]">–</span>
        )}
      </div>

      {/* Penalty indicator */}
      {isDraw && bothTeams && (
        <div className="text-center py-0.5 bg-[hsl(45,60%,15%)] text-[hsl(45,80%,60%)] text-[9px]">
          Pens
        </div>
      )}
    </div>
  );
};

export default KnockoutBracket;
