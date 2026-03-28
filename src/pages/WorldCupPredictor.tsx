import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, ChevronDown, Swords, CalendarClock, Shuffle, RotateCcw, Trash2, Check } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import PageSeo from "@/components/seo/PageSeo";
import KnockoutBracket, { type GroupSeed } from "@/components/world-cup-predictor/KnockoutBracket";

/* ───── types ───── */

interface TeamSlot {
  name: string;
  isTBD: boolean;
}

interface Group {
  letter: string;
  teams: TeamSlot[];
}

interface MatchScore {
  homeGoals: number | "";
  awayGoals: number | "";
}

// key = "A-0" (group letter + match index)
type Predictions = Record<string, MatchScore>;

interface Standing {
  team: string;
  isTBD: boolean;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

/* ───── data ───── */

const groups: Group[] = [
  { letter: "A", teams: [
    { name: "Mexico", isTBD: false },
    { name: "South Korea", isTBD: false },
    { name: "South Africa", isTBD: false },
    { name: "UEFA Path D Winner", isTBD: true },
  ]},
  { letter: "B", teams: [
    { name: "Canada", isTBD: false },
    { name: "Switzerland", isTBD: false },
    { name: "Qatar", isTBD: false },
    { name: "UEFA Path A Winner", isTBD: true },
  ]},
  { letter: "C", teams: [
    { name: "Brazil", isTBD: false },
    { name: "Morocco", isTBD: false },
    { name: "Scotland", isTBD: false },
    { name: "Haiti", isTBD: false },
  ]},
  { letter: "D", teams: [
    { name: "USA", isTBD: false },
    { name: "Paraguay", isTBD: false },
    { name: "Australia", isTBD: false },
    { name: "UEFA Path C Winner", isTBD: true },
  ]},
  { letter: "E", teams: [
    { name: "Germany", isTBD: false },
    { name: "Ivory Coast", isTBD: false },
    { name: "Ecuador", isTBD: false },
    { name: "Curaçao", isTBD: false },
  ]},
  { letter: "F", teams: [
    { name: "Netherlands", isTBD: false },
    { name: "Japan", isTBD: false },
    { name: "Tunisia", isTBD: false },
    { name: "UEFA Path B Winner", isTBD: true },
  ]},
  { letter: "G", teams: [
    { name: "Belgium", isTBD: false },
    { name: "Egypt", isTBD: false },
    { name: "Iran", isTBD: false },
    { name: "New Zealand", isTBD: false },
  ]},
  { letter: "H", teams: [
    { name: "Spain", isTBD: false },
    { name: "Uruguay", isTBD: false },
    { name: "Saudi Arabia", isTBD: false },
    { name: "Cape Verde", isTBD: false },
  ]},
  { letter: "I", teams: [
    { name: "France", isTBD: false },
    { name: "Senegal", isTBD: false },
    { name: "Norway", isTBD: false },
    { name: "Inter-Playoff 2 Winner", isTBD: true },
  ]},
  { letter: "J", teams: [
    { name: "Argentina", isTBD: false },
    { name: "Chile", isTBD: false },
    { name: "Nigeria", isTBD: false },
    { name: "Algeria", isTBD: false },
  ]},
  { letter: "K", teams: [
    { name: "Portugal", isTBD: false },
    { name: "Colombia", isTBD: false },
    { name: "Uzbekistan", isTBD: false },
    { name: "Inter-Playoff 1 Winner", isTBD: true },
  ]},
  { letter: "L", teams: [
    { name: "England", isTBD: false },
    { name: "Croatia", isTBD: false },
    { name: "Ghana", isTBD: false },
    { name: "Panama", isTBD: false },
  ]},
];

const playoffMatchups = [
  { slot: "UEFA Path A Winner", group: "B", teamA: "Italy", teamB: "Bosnia & Herzegovina" },
  { slot: "UEFA Path B Winner", group: "F", teamA: "Sweden", teamB: "Poland" },
  { slot: "UEFA Path C Winner", group: "D", teamA: "Kosovo", teamB: "Turkey" },
  { slot: "UEFA Path D Winner", group: "A", teamA: "Denmark", teamB: "Czech Republic" },
  { slot: "Inter-Playoff 1 Winner", group: "K", teamA: "Jamaica", teamB: "DR Congo" },
  { slot: "Inter-Playoff 2 Winner", group: "I", teamA: "Bolivia", teamB: "Iraq" },
];

/* ───── helpers ───── */

/** Generate the 3 round-robin matchups for a 4-team group (0v1, 2v3, 0v2, 1v3, 0v3, 1v2) — FIFA standard pairing */
function getMatchups(teams: TeamSlot[]): [number, number][] {
  return [
    [0, 1],
    [2, 3],
    [0, 2],
    [1, 3],
    [0, 3],
    [1, 2],
  ];
}

function computeStandings(group: Group, predictions: Predictions): Standing[] {
  const map: Record<string, Standing> = {};
  group.teams.forEach((t) => {
    map[t.name] = { team: t.name, isTBD: t.isTBD, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
  });

  const matchups = getMatchups(group.teams);
  matchups.forEach(([hi, ai], idx) => {
    const key = `${group.letter}-${idx}`;
    const score = predictions[key];
    if (!score || score.homeGoals === "" || score.awayGoals === "") return;
    const hg = Number(score.homeGoals);
    const ag = Number(score.awayGoals);
    const home = group.teams[hi].name;
    const away = group.teams[ai].name;

    map[home].played++;
    map[away].played++;
    map[home].gf += hg;
    map[home].ga += ag;
    map[away].gf += ag;
    map[away].ga += hg;

    if (hg > ag) {
      map[home].won++;
      map[home].pts += 3;
      map[away].lost++;
    } else if (hg < ag) {
      map[away].won++;
      map[away].pts += 3;
      map[home].lost++;
    } else {
      map[home].drawn++;
      map[away].drawn++;
      map[home].pts += 1;
      map[away].pts += 1;
    }
  });

  return Object.values(map)
    .map((s) => ({ ...s, gd: s.gf - s.ga }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
}

const STORAGE_KEY = "wc2026-predictions";

function loadPredictions(): Predictions {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/* ───── sub-components ───── */

const PlayoffSlotsPanel = () => {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-8">
      <CollapsibleTrigger className="w-full flex items-center justify-between rounded-lg bg-[hsl(150,15%,12%)] border border-[hsl(150,20%,20%)] px-4 py-3 hover:bg-[hsl(150,15%,15%)] transition-colors">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-[hsl(45,90%,55%)]" />
          <span className="font-bold text-[hsl(45,90%,55%)] text-sm sm:text-base">Playoff Slots</span>
          <Badge variant="outline" className="text-[10px] border-[hsl(0,0%,40%)] text-[hsl(0,0%,55%)] ml-1">6 TBD</Badge>
        </div>
        <ChevronDown className={`w-5 h-5 text-[hsl(150,15%,60%)] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-3 rounded-lg bg-[hsl(150,15%,10%)] border border-[hsl(150,20%,18%)] p-4 space-y-4">
          <p className="text-[hsl(150,15%,55%)] text-xs sm:text-sm text-center">
            6 spots still being decided — winners announced March 31, 2026
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {playoffMatchups.map((m) => (
              <div key={m.slot} className="rounded-md bg-[hsl(150,12%,14%)] border border-[hsl(150,15%,20%)] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[hsl(45,90%,55%)] text-xs font-semibold">{m.slot}</span>
                  <Badge variant="outline" className="text-[9px] border-[hsl(150,20%,30%)] text-[hsl(150,15%,50%)] px-1.5 py-0">
                    Group {m.group}
                  </Badge>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <span className="font-bold text-white">{m.teamA}</span>
                  <span className="text-[hsl(0,0%,45%)] text-xs">vs</span>
                  <span className="font-bold text-white">{m.teamB}</span>
                </div>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <CalendarClock className="w-3 h-3 text-[hsl(150,15%,45%)]" />
                  <span className="text-[hsl(150,15%,45%)] text-[10px]">Final: March 31</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

/* ───── Group Prediction Card ───── */

interface GroupPredictionCardProps {
  group: Group;
  predictions: Predictions;
  onScoreChange: (key: string, field: "homeGoals" | "awayGoals", val: number | "") => void;
  onAutoFillGroup: (letter: string) => void;
  onResetGroup: (letter: string) => void;
}

const GroupPredictionCard = ({ group, predictions, onScoreChange, onAutoFillGroup, onResetGroup }: GroupPredictionCardProps) => {
  const [expanded, setExpanded] = useState(true);
  const matchups = getMatchups(group.teams);

  const standings = useMemo(() => computeStandings(group, predictions), [group, predictions]);
  const hasAnyScore = matchups.some((_, idx) => {
    const s = predictions[`${group.letter}-${idx}`];
    return s && s.homeGoals !== "" && s.awayGoals !== "";
  });
  const allFilled = matchups.every((_, idx) => {
    const s = predictions[`${group.letter}-${idx}`];
    return s && s.homeGoals !== "" && s.awayGoals !== "";
  });

  return (
    <Card className="bg-[hsl(150,15%,12%)] border-[hsl(150,20%,20%)] shadow-lg">
      <CardHeader
        className="pb-2 pt-4 px-4 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-[hsl(45,90%,55%)] tracking-wide">
            Group {group.letter}
          </CardTitle>
          <ChevronDown
            className={`w-4 h-4 text-[hsl(150,15%,50%)] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </CardHeader>

      {/* Team list (always visible) */}
      <CardContent className="px-4 pb-2 pt-0">
        <ul className="space-y-1.5">
          {group.teams.map((team, idx) => (
            <li
              key={idx}
              className={`flex items-center justify-between rounded-md px-3 py-1.5 ${
                team.isTBD ? "bg-[hsl(150,10%,16%)]" : "bg-[hsl(150,12%,18%)]"
              }`}
            >
              <span className={team.isTBD ? "italic text-[hsl(0,0%,55%)] text-sm" : "font-bold text-white text-sm"}>
                {team.name}
              </span>
              {team.isTBD && (
                <Badge variant="outline" className="text-[10px] border-[hsl(0,0%,40%)] text-[hsl(0,0%,50%)] px-1.5 py-0">
                  TBD
                </Badge>
              )}
            </li>
          ))}
        </ul>
      </CardContent>

      {/* Expanded: matchups + standings */}
      {expanded && (
        <CardContent className="px-4 pb-4 pt-2 border-t border-[hsl(150,15%,18%)]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[hsl(150,15%,50%)] text-[10px] uppercase tracking-wider font-semibold">
              Predict Scores
            </p>
            <div className="flex gap-1.5">
              {!allFilled && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAutoFillGroup(group.letter); }}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-[hsl(150,12%,20%)] hover:bg-[hsl(150,12%,25%)] text-[hsl(150,15%,60%)] transition-colors"
                  title="Auto-fill random scores"
                >
                  <Shuffle className="w-3 h-3" /> Fill
                </button>
              )}
              {hasAnyScore && (
                <button
                  onClick={(e) => { e.stopPropagation(); onResetGroup(group.letter); }}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-[hsl(0,40%,20%)] hover:bg-[hsl(0,40%,25%)] text-[hsl(0,60%,65%)] transition-colors"
                  title="Reset group scores"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            {matchups.map(([hi, ai], idx) => {
              const key = `${group.letter}-${idx}`;
              const score = predictions[key] || { homeGoals: "", awayGoals: "" };
              const homeName = group.teams[hi].name;
              const awayName = group.teams[ai].name;
              // truncate long TBD names
              const shortHome = homeName.length > 16 ? homeName.slice(0, 14) + "…" : homeName;
              const shortAway = awayName.length > 16 ? awayName.slice(0, 14) + "…" : awayName;

              return (
                <div key={key} className="flex items-center gap-1.5 bg-[hsl(150,10%,14%)] rounded-md px-2 py-1.5">
                  <span className="text-white text-[11px] font-semibold flex-1 text-right truncate" title={homeName}>
                    {shortHome}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={9}
                    value={score.homeGoals}
                    onChange={(e) => {
                      const v = e.target.value;
                      onScoreChange(key, "homeGoals", v === "" ? "" : Math.min(9, Math.max(0, Number(v))));
                    }}
                    className="w-8 h-7 text-center text-sm font-bold rounded bg-[hsl(150,12%,20%)] border border-[hsl(150,20%,28%)] text-white focus:outline-none focus:border-[hsl(45,90%,55%)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[hsl(0,0%,40%)] text-[10px]">–</span>
                  <input
                    type="number"
                    min={0}
                    max={9}
                    value={score.awayGoals}
                    onChange={(e) => {
                      const v = e.target.value;
                      onScoreChange(key, "awayGoals", v === "" ? "" : Math.min(9, Math.max(0, Number(v))));
                    }}
                    className="w-8 h-7 text-center text-sm font-bold rounded bg-[hsl(150,12%,20%)] border border-[hsl(150,20%,28%)] text-white focus:outline-none focus:border-[hsl(45,90%,55%)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-white text-[11px] font-semibold flex-1 truncate" title={awayName}>
                    {shortAway}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Standings table */}
          {hasAnyScore && (
            <div className="mt-3">
              <p className="text-[hsl(150,15%,50%)] text-[10px] uppercase tracking-wider font-semibold mb-1.5">
                Standings
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-[hsl(150,15%,45%)]">
                      <th className="text-left py-1 pr-1">#</th>
                      <th className="text-left py-1 pr-1">Team</th>
                      <th className="text-center py-1 px-1">P</th>
                      <th className="text-center py-1 px-1">W</th>
                      <th className="text-center py-1 px-1">D</th>
                      <th className="text-center py-1 px-1">L</th>
                      <th className="text-center py-1 px-1">GD</th>
                      <th className="text-center py-1 px-1">GF</th>
                      <th className="text-center py-1 pl-1 font-bold">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s, pos) => {
                      let rowClass = "";
                      if (pos === 0 || pos === 1) rowClass = "bg-[hsl(140,50%,18%)]"; // green — qualified
                      else if (pos === 2) rowClass = "bg-[hsl(50,60%,20%)]"; // yellow — wildcard

                      const shortTeam = s.team.length > 14 ? s.team.slice(0, 12) + "…" : s.team;
                      return (
                        <tr key={s.team} className={`${rowClass} border-b border-[hsl(150,10%,16%)]`}>
                          <td className="py-1 pr-1 text-[hsl(0,0%,50%)]">{pos + 1}</td>
                          <td className={`py-1 pr-1 font-semibold truncate max-w-[80px] ${s.isTBD ? "italic text-[hsl(0,0%,50%)]" : "text-white"}`} title={s.team}>
                            {shortTeam}
                          </td>
                          <td className="text-center py-1 px-1 text-[hsl(0,0%,60%)]">{s.played}</td>
                          <td className="text-center py-1 px-1 text-[hsl(0,0%,60%)]">{s.won}</td>
                          <td className="text-center py-1 px-1 text-[hsl(0,0%,60%)]">{s.drawn}</td>
                          <td className="text-center py-1 px-1 text-[hsl(0,0%,60%)]">{s.lost}</td>
                          <td className={`text-center py-1 px-1 ${s.gd > 0 ? "text-[hsl(140,60%,55%)]" : s.gd < 0 ? "text-[hsl(0,60%,55%)]" : "text-[hsl(0,0%,50%)]"}`}>
                            {s.gd > 0 ? `+${s.gd}` : s.gd}
                          </td>
                          <td className="text-center py-1 px-1 text-[hsl(0,0%,60%)]">{s.gf}</td>
                          <td className="text-center py-1 pl-1 font-bold text-white">{s.pts}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3 mt-2 text-[9px] text-[hsl(0,0%,50%)]">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-[hsl(140,50%,18%)] inline-block" /> Qualified
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-[hsl(50,60%,20%)] inline-block" /> Possible wildcard
                </span>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

/* ───── main page ───── */

const GROUPS_LETTERS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

const WorldCupPredictor = () => {
  const [predictions, setPredictions] = useState<Predictions>(loadPredictions);
  const [showBracket, setShowBracket] = useState(() => {
    try { return localStorage.getItem("wc2026-show-bracket") === "true"; } catch { return false; }
  });
  const bracketRef = useRef<HTMLDivElement>(null);
  const [selectedThirds, setSelectedThirds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("wc2026-selected-thirds");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  // persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(predictions));
  }, [predictions]);

  useEffect(() => {
    localStorage.setItem("wc2026-show-bracket", String(showBracket));
  }, [showBracket]);

  useEffect(() => {
    localStorage.setItem("wc2026-selected-thirds", JSON.stringify(selectedThirds));
  }, [selectedThirds]);

  const handleScoreChange = useCallback(
    (key: string, field: "homeGoals" | "awayGoals", val: number | "") => {
      setPredictions((prev) => ({
        ...prev,
        [key]: { ...prev[key], [field]: val },
      }));
    },
    [],
  );

  // Check if all group matches are filled (12 groups × 6 matches = 72)
  const allGroupsFilled = useMemo(() => {
    for (const g of GROUPS_LETTERS) {
      for (let i = 0; i < 6; i++) {
        const key = `${g}-${i}`;
        const s = predictions[key];
        if (!s || s.homeGoals === "" || s.awayGoals === "") return false;
      }
    }
    return true;
  }, [predictions]);

  // Compute seeds from group standings
  const { groupSeeds, bestThirds } = useMemo(() => {
    const seeds: Record<string, GroupSeed> = {};
    const allThirds: { team: string; group: string; pts: number; gd: number; gf: number; played: number }[] = [];

    for (const group of groups) {
      const standings = computeStandings(group, predictions);
      seeds[group.letter] = {
        first: standings[0]?.team || "TBD",
        second: standings[1]?.team || "TBD",
        third: standings[2]?.team || "TBD",
        thirdPts: standings[2]?.pts || 0,
        thirdGD: standings[2]?.gd || 0,
        thirdGF: standings[2]?.gf || 0,
      };
      if (standings[2]) {
        allThirds.push({
          team: standings[2].team,
          group: group.letter,
          pts: standings[2].pts,
          gd: standings[2].gd,
          gf: standings[2].gf,
          played: standings[2].played,
        });
      }
    }

    // Sort thirds and take best 8
    const sorted = [...allThirds].sort(
      (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf,
    );

    return { groupSeeds: seeds, bestThirds: sorted };
  }, [predictions]);

  // Count filled groups
  const filledGroupCount = useMemo(() => {
    let count = 0;
    for (const g of GROUPS_LETTERS) {
      let filled = true;
      for (let i = 0; i < 6; i++) {
        const key = `${g}-${i}`;
        const s = predictions[key];
        if (!s || s.homeGoals === "" || s.awayGoals === "") { filled = false; break; }
      }
      if (filled) count++;
    }
    return count;
  }, [predictions]);

  const handleGenerateBracket = () => {
    setShowBracket(true);
    setTimeout(() => {
      bracketRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleAutoFillGroup = useCallback((letter: string) => {
    setPredictions((prev) => {
      const next = { ...prev };
      for (let i = 0; i < 6; i++) {
        const key = `${letter}-${i}`;
        const existing = next[key];
        if (!existing || existing.homeGoals === "" || existing.awayGoals === "") {
          next[key] = {
            homeGoals: Math.floor(Math.random() * 4),
            awayGoals: Math.floor(Math.random() * 4),
          };
        }
      }
      return next;
    });
  }, []);

  const handleAutoFillAll = useCallback(() => {
    setPredictions((prev) => {
      const next = { ...prev };
      for (const letter of GROUPS_LETTERS) {
        for (let i = 0; i < 6; i++) {
          const key = `${letter}-${i}`;
          const existing = next[key];
          if (!existing || existing.homeGoals === "" || existing.awayGoals === "") {
            next[key] = {
              homeGoals: Math.floor(Math.random() * 4),
              awayGoals: Math.floor(Math.random() * 4),
            };
          }
        }
      }
      return next;
    });
  }, []);

  const handleResetGroup = useCallback((letter: string) => {
    setPredictions((prev) => {
      const next = { ...prev };
      for (let i = 0; i < 6; i++) {
        delete next[`${letter}-${i}`];
      }
      return next;
    });
  }, []);

  const handleResetEverything = useCallback(() => {
    setPredictions({});
    setShowBracket(false);
    setSelectedThirds([]);
    localStorage.removeItem("wc2026-knockout");
    localStorage.removeItem("wc2026-selected-thirds");
  }, []);

  const handleToggleThird = useCallback((teamName: string) => {
    setSelectedThirds((prev) => {
      if (prev.includes(teamName)) {
        return prev.filter((t) => t !== teamName);
      }
      if (prev.length >= 8) return prev;
      return [...prev, teamName];
    });
  }, []);

  // Build the user-selected thirds list for the bracket (ordered by bestThirds ranking)
  const userSelectedThirdsForBracket = useMemo(() => {
    return bestThirds.filter((t) => selectedThirds.includes(t.team));
  }, [bestThirds, selectedThirds]);

  // Clean up selectedThirds when third-place teams change (e.g. scores edited)
  useEffect(() => {
    const validTeams = bestThirds.map((t) => t.team);
    setSelectedThirds((prev) => prev.filter((t) => validTeams.includes(t)));
  }, [bestThirds]);

  return (
    <div className="min-h-screen bg-[hsl(150,20%,8%)] text-white">
      <PageSeo
        title="World Cup 2026 Predictor | Sports Trivia Games"
        description="Explore all 12 groups for the FIFA World Cup 2026 hosted in USA, Mexico & Canada."
        path="/world-cup-predictor"
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-[hsl(45,90%,55%)]" />
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[hsl(45,90%,55%)]">
              World Cup 2026 Predictor
            </h1>
            <Trophy className="w-8 h-8 text-[hsl(45,90%,55%)]" />
          </div>
          <p className="text-[hsl(150,15%,60%)] text-sm sm:text-base">
            USA 🇺🇸 · Mexico 🇲🇽 · Canada 🇨🇦 — 48 Teams · 12 Groups
          </p>
        </div>

        {/* Playoff Slots Panel */}
        <PlayoffSlotsPanel />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Predict Group Stage</h2>
            <p className="text-[hsl(150,15%,50%)] text-xs sm:text-sm">
              Enter match scores and watch the standings update live.
              <span className="ml-2 text-[hsl(45,80%,55%)]">
                {filledGroupCount}/12 groups complete
              </span>
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleAutoFillAll}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-[hsl(150,12%,18%)] hover:bg-[hsl(150,12%,22%)] text-[hsl(150,15%,60%)] border border-[hsl(150,20%,25%)] transition-colors"
            >
              <Shuffle className="w-3.5 h-3.5" /> Auto-Fill All
            </button>
            <button
              onClick={handleResetEverything}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-[hsl(0,40%,15%)] hover:bg-[hsl(0,40%,20%)] text-[hsl(0,60%,65%)] border border-[hsl(0,30%,25%)] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Reset All
            </button>
          </div>
        </div>

        {/* Group Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {groups.map((group) => (
            <GroupPredictionCard
              key={group.letter}
              group={group}
              predictions={predictions}
              onScoreChange={handleScoreChange}
              onAutoFillGroup={handleAutoFillGroup}
              onResetGroup={handleResetGroup}
            />
          ))}
        </div>

        {/* Pick Your Third Place Qualifiers */}
        {bestThirds.length > 0 && allGroupsFilled && (
          <div className="mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Pick Your Third-Place Qualifiers</h2>
                <p className="text-[hsl(150,15%,50%)] text-xs sm:text-sm">
                  Select exactly 8 of the 12 third-place teams to advance to the Round of 32.
                </p>
              </div>
              <Badge
                className={`text-sm px-3 py-1.5 self-start ${
                  selectedThirds.length === 8
                    ? "bg-[hsl(140,60%,30%)] text-[hsl(140,80%,90%)]"
                    : "bg-[hsl(150,12%,20%)] text-[hsl(45,90%,55%)]"
                }`}
              >
                {selectedThirds.length} / 8 selected
              </Badge>
            </div>
            <Card className="bg-[hsl(150,15%,12%)] border-[hsl(150,20%,20%)] shadow-lg overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[hsl(150,15%,18%)] text-[hsl(150,15%,45%)] text-xs">
                        <th className="text-center py-3 px-3 w-10"></th>
                        <th className="text-left py-3 px-2">#</th>
                        <th className="text-left py-3 px-2">Team</th>
                        <th className="text-center py-3 px-2">Group</th>
                        <th className="text-center py-3 px-2">Pts</th>
                        <th className="text-center py-3 px-2">GD</th>
                        <th className="text-center py-3 px-2">GF</th>
                        <th className="text-right py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bestThirds.map((t, idx) => {
                        const isSelected = selectedThirds.includes(t.team);
                        const isDisabled = !isSelected && selectedThirds.length >= 8;
                        return (
                          <tr
                            key={t.team + t.group}
                            onClick={() => !isDisabled && handleToggleThird(t.team)}
                            className={`border-b border-[hsl(150,10%,16%)] transition-colors ${
                              isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-[hsl(150,12%,16%)]"
                            } ${isSelected ? "bg-[hsl(140,50%,18%)]" : "bg-transparent"}`}
                          >
                            <td className="py-2.5 px-3 text-center">
                              <div
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition-colors ${
                                  isSelected
                                    ? "bg-[hsl(140,60%,40%)] border-[hsl(140,60%,50%)]"
                                    : isDisabled
                                    ? "border-[hsl(0,0%,25%)] bg-transparent"
                                    : "border-[hsl(150,20%,30%)] bg-transparent hover:border-[hsl(150,20%,40%)]"
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                            </td>
                            <td className="py-2.5 px-2 font-bold text-[hsl(0,0%,50%)]">{idx + 1}</td>
                            <td className={`py-2.5 px-2 font-semibold ${isSelected ? "text-white" : "text-[hsl(0,0%,55%)]"}`}>
                              {t.team}
                            </td>
                            <td className="py-2.5 px-2 text-center text-[hsl(45,90%,55%)] font-semibold">{t.group}</td>
                            <td className="py-2.5 px-2 text-center font-bold text-white">{t.pts}</td>
                            <td className={`py-2.5 px-2 text-center ${t.gd > 0 ? "text-[hsl(140,60%,55%)]" : t.gd < 0 ? "text-[hsl(0,60%,55%)]" : "text-[hsl(0,0%,50%)]"}`}>
                              {t.gd > 0 ? `+${t.gd}` : t.gd}
                            </td>
                            <td className="py-2.5 px-2 text-center text-[hsl(0,0%,60%)]">{t.gf}</td>
                            <td className="py-2.5 px-4 text-right">
                              <Badge className={`text-[10px] ${
                                isSelected
                                  ? "bg-[hsl(140,60%,30%)] text-[hsl(140,80%,90%)] hover:bg-[hsl(140,60%,35%)]"
                                  : "bg-[hsl(0,0%,25%)] text-[hsl(0,0%,55%)] hover:bg-[hsl(0,0%,30%)]"
                              }`}>
                                {isSelected ? "Qualified" : "Eliminated"}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Generate Bracket Button */}
        {allGroupsFilled && selectedThirds.length === 8 && !showBracket && (
          <div className="text-center mt-8">
            <button
              onClick={handleGenerateBracket}
              className="px-8 py-3 rounded-lg bg-[hsl(45,90%,45%)] hover:bg-[hsl(45,90%,50%)] text-[hsl(150,20%,8%)] font-bold text-base sm:text-lg transition-colors shadow-lg shadow-[hsl(45,90%,45%)]/20"
            >
              🏆 Generate My Bracket
            </button>
          </div>
        )}

        {allGroupsFilled && selectedThirds.length < 8 && !showBracket && (
          <div className="text-center mt-6">
            <p className="text-[hsl(150,15%,40%)] text-sm">
              Select 8 third-place teams to unlock the knockout bracket ({selectedThirds.length}/8)
            </p>
          </div>
        )}

        {!allGroupsFilled && (
          <div className="text-center mt-6">
            <p className="text-[hsl(150,15%,40%)] text-sm">
              Fill in all group match scores to unlock the knockout bracket
            </p>
          </div>
        )}

        {/* Knockout Bracket */}
        {showBracket && allGroupsFilled && selectedThirds.length === 8 && (
          <div ref={bracketRef}>
            <KnockoutBracket seeds={groupSeeds} bestThirds={userSelectedThirdsForBracket} />
          </div>
        )}
      </div>
    </div>
  );
};

export default WorldCupPredictor;
