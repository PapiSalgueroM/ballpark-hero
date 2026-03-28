import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, ChevronDown, Swords, CalendarClock, Shuffle, RotateCcw, Trash2, Check, ChevronRight, X, Save, Link2, Eye, Loader2, Zap } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import PageSeo from "@/components/seo/PageSeo";
import KnockoutBracket, { type GroupSeed } from "@/components/world-cup-predictor/KnockoutBracket";
import ShareButtons from "@/components/game/ShareButtons";
import AwardsPredictor from "@/components/world-cup-predictor/AwardsPredictor";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

/* ───── FIFA rankings ───── */

const FIFA_RANKINGS: { rank: number; team: string }[] = [
  { rank: 1, team: "France" }, { rank: 2, team: "Spain" }, { rank: 3, team: "England" },
  { rank: 4, team: "Brazil" }, { rank: 5, team: "Portugal" }, { rank: 6, team: "Argentina" },
  { rank: 7, team: "Belgium" }, { rank: 8, team: "Netherlands" }, { rank: 9, team: "Germany" },
  { rank: 10, team: "Colombia" }, { rank: 11, team: "Italy" }, { rank: 12, team: "Morocco" },
  { rank: 13, team: "USA" }, { rank: 14, team: "Mexico" }, { rank: 15, team: "Japan" },
  { rank: 16, team: "Croatia" }, { rank: 17, team: "Senegal" }, { rank: 18, team: "Ecuador" },
  { rank: 19, team: "Australia" }, { rank: 20, team: "Switzerland" }, { rank: 21, team: "Norway" },
  { rank: 22, team: "Denmark" }, { rank: 23, team: "Uruguay" }, { rank: 24, team: "South Korea" },
  { rank: 25, team: "Saudi Arabia" }, { rank: 26, team: "Turkey" }, { rank: 27, team: "Iran" },
  { rank: 28, team: "Egypt" }, { rank: 29, team: "Ghana" }, { rank: 30, team: "Chile" },
  { rank: 31, team: "Nigeria" }, { rank: 32, team: "Canada" }, { rank: 33, team: "Scotland" },
  { rank: 34, team: "Algeria" }, { rank: 35, team: "Ivory Coast" }, { rank: 36, team: "Paraguay" },
  { rank: 37, team: "Poland" }, { rank: 38, team: "Uzbekistan" }, { rank: 39, team: "South Africa" },
  { rank: 40, team: "Cape Verde" }, { rank: 41, team: "Qatar" }, { rank: 42, team: "New Zealand" },
  { rank: 43, team: "Panama" }, { rank: 44, team: "Tunisia" }, { rank: 45, team: "Sweden" },
  { rank: 46, team: "Kosovo" }, { rank: 47, team: "Haiti" }, { rank: 48, team: "Curaçao" },
];

// Rank lookup: team name → rank number (lower = better)
export const FIFA_RANK: Record<string, number> = {};
FIFA_RANKINGS.forEach((r) => { FIFA_RANK[r.team] = r.rank; });

// Also add playoff teams that aren't in top 48 with high rank numbers
const EXTRA_RANKS: Record<string, number> = {
  "Bosnia & Herzegovina": 60, "Czech Republic": 55, "Jamaica": 65, "DR Congo": 62, "Bolivia": 70, "Iraq": 68,
};
Object.entries(EXTRA_RANKS).forEach(([t, r]) => { if (!FIFA_RANK[t]) FIFA_RANK[t] = r; });

/** Get FIFA rank for a team (lower = better). Returns 999 for unknown. */
export function getFifaRank(team: string): number {
  return FIFA_RANK[team] || 999;
}

/** Pick higher-ranked team */
export function rankWinner(a: string, b: string): string {
  return getFifaRank(a) <= getFifaRank(b) ? a : b;
}

const TEAM_GROUP: Record<string, string> = {};
groups.forEach((g) => g.teams.forEach((t) => { if (!t.isTBD) TEAM_GROUP[t.name] = g.letter; }));
playoffMatchups.forEach((m) => { TEAM_GROUP[m.teamA] = m.group; TEAM_GROUP[m.teamB] = m.group; });

/* ───── flag map ───── */

const FLAG_CODES: Record<string, string> = {
  "Mexico": "mx", "South Korea": "kr", "South Africa": "za",
  "Canada": "ca", "Switzerland": "ch", "Qatar": "qa",
  "Brazil": "br", "Morocco": "ma", "Scotland": "gb-sct", "Haiti": "ht",
  "USA": "us", "Paraguay": "py", "Australia": "au",
  "Germany": "de", "Ivory Coast": "ci", "Ecuador": "ec", "Curaçao": "cw",
  "Netherlands": "nl", "Japan": "jp", "Tunisia": "tn",
  "Belgium": "be", "Egypt": "eg", "Iran": "ir", "New Zealand": "nz",
  "Spain": "es", "Uruguay": "uy", "Saudi Arabia": "sa", "Cape Verde": "cv",
  "France": "fr", "Senegal": "sn", "Norway": "no",
  "Argentina": "ar", "Chile": "cl", "Nigeria": "ng", "Algeria": "dz",
  "Portugal": "pt", "Colombia": "co", "Uzbekistan": "uz",
  "England": "gb-eng", "Croatia": "hr", "Ghana": "gh", "Panama": "pa",
  // Playoff teams
  "Italy": "it", "Bosnia & Herzegovina": "ba",
  "Sweden": "se", "Poland": "pl",
  "Kosovo": "xk", "Turkey": "tr",
  "Denmark": "dk", "Czech Republic": "cz",
  "Jamaica": "jm", "DR Congo": "cd",
  "Bolivia": "bo", "Iraq": "iq",
};

export function FlagImg({ name, size = 24 }: { name: string; size?: number }) {
  const code = FLAG_CODES[name];
  if (!code) return null;
  const h = Math.round(size * 0.75);
  return (
    <img
      src={`https://flagcdn.com/${size}x${h}/${code}.png`}
      alt={name}
      style={{ display: "inline", marginRight: "4px", verticalAlign: "middle" }}
      width={size}
      height={h}
    />
  );
}


/* ───── group colors ───── */

const GROUP_COLORS: Record<string, { h: number; s: number; l: number }> = {
  A: { h: 0, s: 75, l: 55 },      // red
  B: { h: 220, s: 75, l: 55 },    // blue
  C: { h: 145, s: 70, l: 45 },    // green
  D: { h: 280, s: 65, l: 55 },    // purple
  E: { h: 28, s: 90, l: 55 },     // orange
  F: { h: 175, s: 70, l: 45 },    // teal
  G: { h: 348, s: 80, l: 45 },    // crimson
  H: { h: 225, s: 60, l: 35 },    // navy
  I: { h: 45, s: 90, l: 55 },     // gold
  J: { h: 16, s: 80, l: 60 },     // coral
  K: { h: 90, s: 70, l: 50 },     // lime
  L: { h: 260, s: 70, l: 50 },    // indigo
};

function gc(letter: string) {
  const c = GROUP_COLORS[letter] || { h: 0, s: 0, l: 50 };
  return {
    accent: `hsl(${c.h}, ${c.s}%, ${c.l}%)`,
    accentDim: `hsl(${c.h}, ${c.s - 20}%, ${c.l - 15}%)`,
    headerBg: `hsl(${c.h}, ${c.s - 10}%, ${Math.max(c.l - 30, 12)}%)`,
    border: `hsl(${c.h}, ${c.s - 15}%, ${c.l - 20}%)`,
    inputBorder: `hsl(${c.h}, ${c.s - 10}%, ${c.l - 10}%)`,
    glow: `0 0 20px hsla(${c.h}, ${c.s}%, ${c.l}%, 0.15)`,
  };
}

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

/* ───── small auto-fill button component ───── */

function SmallAutoButton({ label, onClick, loading }: { label: string; onClick: () => void; loading?: boolean }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      disabled={loading}
      className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-[hsl(220,20%,18%)] hover:bg-[hsl(220,20%,22%)] text-[hsl(45,80%,60%)] border border-[hsl(220,20%,28%)] transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
      {label}
    </button>
  );
}

/* ───── ranking-based auto-fill for a single group ───── */

function rankBasedScoresForGroup(group: Group): Predictions {
  const matchups = getMatchups(group.teams);
  const result: Predictions = {};
  matchups.forEach(([hi, ai], idx) => {
    const home = group.teams[hi].name;
    const away = group.teams[ai].name;
    const homeRank = getFifaRank(home);
    const awayRank = getFifaRank(away);
    const key = `${group.letter}-${idx}`;
    if (homeRank < awayRank) {
      result[key] = { homeGoals: 2, awayGoals: 1 };
    } else if (awayRank < homeRank) {
      result[key] = { homeGoals: 1, awayGoals: 2 };
    } else {
      result[key] = { homeGoals: 1, awayGoals: 1 };
    }
  });
  return result;
}

/* ───── sub-components ───── */

interface PlayoffSlotsPanelProps {
  picks: Record<string, string>;
  onPick: (slot: string, winner: string) => void;
  onAutoPickPlayoffs: () => void;
}

const PlayoffSlotsPanel = ({ picks, onPick, onAutoPickPlayoffs }: PlayoffSlotsPanelProps) => {
  const [open, setOpen] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const pickedCount = Object.keys(picks).length;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-8">
      <CollapsibleTrigger className="w-full flex items-center justify-between rounded-lg bg-[hsl(150,15%,12%)] border border-[hsl(150,20%,20%)] px-4 py-3 hover:bg-[hsl(150,15%,15%)] transition-colors">
        <div className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-[hsl(45,90%,55%)]" />
          <span className="font-bold text-[hsl(45,90%,55%)] text-sm sm:text-base">Playoff Slots</span>
          <Badge variant="outline" className={`text-[10px] ml-1 ${pickedCount === 6 ? "border-[hsl(140,60%,40%)] text-[hsl(140,60%,55%)]" : "border-[hsl(0,0%,40%)] text-[hsl(0,0%,55%)]"}`}>
            {pickedCount}/6 picked
          </Badge>
        </div>
        <ChevronDown className={`w-5 h-5 text-[hsl(150,15%,60%)] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-3 rounded-lg bg-[hsl(150,15%,10%)] border border-[hsl(150,20%,18%)] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[hsl(150,15%,55%)] text-xs sm:text-sm">
              Pick the winner of each playoff — they'll replace the TBD slot in their group.
            </p>
            {pickedCount < 6 && (
              <SmallAutoButton
                label="Auto Pick"
                loading={autoLoading}
                onClick={() => {
                  setAutoLoading(true);
                  setTimeout(() => { onAutoPickPlayoffs(); setAutoLoading(false); }, 1000);
                }}
              />
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {playoffMatchups.map((m) => {
              const picked = picks[m.slot];
              return (
                <div key={m.slot} className="rounded-md bg-[hsl(150,12%,14%)] border border-[hsl(150,15%,20%)] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[hsl(45,90%,55%)] text-xs font-semibold">{m.slot}</span>
                    <Badge variant="outline" className="text-[9px] border-[hsl(150,20%,30%)] text-[hsl(150,15%,50%)] px-1.5 py-0">
                      Group {m.group}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <button
                      onClick={() => onPick(m.slot, m.teamA)}
                      className={`flex-1 text-sm font-bold py-2 px-2 rounded-md transition-all ${
                        picked === m.teamA
                          ? "bg-[hsl(140,55%,25%)] text-white border-2 border-[hsl(140,60%,45%)] shadow-md shadow-[hsl(140,60%,40%)]/20"
                          : picked === m.teamB
                          ? "bg-[hsl(220,10%,18%)] text-[hsl(0,0%,40%)] border-2 border-transparent cursor-pointer hover:bg-[hsl(220,10%,22%)]"
                          : "bg-[hsl(220,12%,18%)] text-white border-2 border-[hsl(220,12%,28%)] hover:border-[hsl(140,40%,40%)] hover:bg-[hsl(220,12%,22%)] cursor-pointer"
                      }`}
                    >
                      <FlagImg name={m.teamA} />{m.teamA}
                    </button>
                    <span className="text-[hsl(0,0%,35%)] text-xs font-semibold">vs</span>
                    <button
                      onClick={() => onPick(m.slot, m.teamB)}
                      className={`flex-1 text-sm font-bold py-2 px-2 rounded-md transition-all ${
                        picked === m.teamB
                          ? "bg-[hsl(140,55%,25%)] text-white border-2 border-[hsl(140,60%,45%)] shadow-md shadow-[hsl(140,60%,40%)]/20"
                          : picked === m.teamA
                          ? "bg-[hsl(220,10%,18%)] text-[hsl(0,0%,40%)] border-2 border-transparent cursor-pointer hover:bg-[hsl(220,10%,22%)]"
                          : "bg-[hsl(220,12%,18%)] text-white border-2 border-[hsl(220,12%,28%)] hover:border-[hsl(140,40%,40%)] hover:bg-[hsl(220,12%,22%)] cursor-pointer"
                      }`}
                    >
                      <FlagImg name={m.teamB} />{m.teamB}
                    </button>
                  </div>
                  {picked && (
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <Check className="w-3 h-3 text-[hsl(140,60%,50%)]" />
                      <span className="text-[hsl(140,60%,50%)] text-[10px] font-semibold">Winner: <FlagImg name={picked} />{picked}</span>
                    </div>
                  )}
                </div>
              );
            })}
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
  onRankFillGroup: (letter: string) => void;
  onResetGroup: (letter: string) => void;
}

const GroupPredictionCard = ({ group, predictions, onScoreChange, onAutoFillGroup, onRankFillGroup, onResetGroup }: GroupPredictionCardProps) => {
  const [expanded, setExpanded] = useState(true);
  const [rankLoading, setRankLoading] = useState(false);
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

  const colors = gc(group.letter);

  return (
    <Card
      className="border shadow-lg overflow-hidden"
      style={{ backgroundColor: "hsl(220, 15%, 10%)", borderColor: colors.border, boxShadow: colors.glow }}
    >
      <CardHeader
        className="pb-2 pt-4 px-4 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
        style={{ background: `linear-gradient(135deg, ${colors.headerBg}, hsl(220, 15%, 10%))` }}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold tracking-wide" style={{ color: colors.accent }}>
            Group {group.letter}
          </CardTitle>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            style={{ color: colors.accentDim }}
          />
        </div>
      </CardHeader>

      {/* Team list (always visible) */}
      <CardContent className="px-4 pb-2 pt-0">
        <ul className="space-y-1.5">
          {group.teams.map((team, idx) => (
            <li
              key={idx}
              className={`flex items-center justify-between rounded-md px-3 py-1.5`}
              style={{ backgroundColor: team.isTBD ? "hsl(220, 12%, 14%)" : "hsl(220, 12%, 16%)" }}
            >
              <span className={team.isTBD ? "italic text-[hsl(0,0%,55%)] text-sm" : "font-bold text-white text-sm"}>
                <FlagImg name={team.name} />{team.name}
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
        <CardContent className="px-4 pb-4 pt-2" style={{ borderTopColor: colors.border, borderTopWidth: 1 }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: colors.accentDim }}>
              Predict Scores
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {!allFilled && (
                <>
                  <SmallAutoButton
                    label="By Rank"
                    loading={rankLoading}
                    onClick={() => {
                      setRankLoading(true);
                      setTimeout(() => { onRankFillGroup(group.letter); setRankLoading(false); }, 1000);
                    }}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); onAutoFillGroup(group.letter); }}
                    className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-[hsl(150,12%,20%)] hover:bg-[hsl(150,12%,25%)] text-[hsl(150,15%,60%)] transition-colors"
                    title="Auto-fill random scores"
                  >
                    <Shuffle className="w-3 h-3" /> Random
                  </button>
                </>
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
                <div key={key} className="flex items-center gap-1.5 rounded-md px-2 py-1.5" style={{ backgroundColor: "hsl(220, 12%, 12%)" }}>
                  <span className="text-white text-[11px] font-semibold flex-1 text-right truncate" title={homeName}>
                    <FlagImg name={homeName} />{shortHome}
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
                    className="w-11 h-11 sm:w-8 sm:h-7 text-center text-sm font-bold rounded text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    style={{ backgroundColor: "hsl(220, 15%, 15%)", borderWidth: 2, borderColor: colors.inputBorder }}
                  />
                  <span className="text-[hsl(0,0%,40%)] text-[10px] font-bold">vs</span>
                  <input
                    type="number"
                    min={0}
                    max={9}
                    value={score.awayGoals}
                    onChange={(e) => {
                      const v = e.target.value;
                      onScoreChange(key, "awayGoals", v === "" ? "" : Math.min(9, Math.max(0, Number(v))));
                    }}
                    className="w-11 h-11 sm:w-8 sm:h-7 text-center text-sm font-bold rounded text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    style={{ backgroundColor: "hsl(220, 15%, 15%)", borderWidth: 2, borderColor: colors.inputBorder }}
                  />
                  <span className="text-white text-[11px] font-semibold flex-1 truncate" title={awayName}>
                    <FlagImg name={awayName} />{shortAway}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Standings table */}
          {hasAnyScore && (
            <div className="mt-3">
              <p className="text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: colors.accentDim }}>
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
                      let rowBg = "";
                      if (pos === 0 || pos === 1) rowBg = "hsl(140, 55%, 16%)";  // green — qualified
                      else if (pos === 2) rowBg = "hsl(48, 65%, 18%)";          // yellow — wildcard
                      else rowBg = "hsl(220, 10%, 13%)";                        // grey — eliminated

                      const shortTeam = s.team.length > 14 ? s.team.slice(0, 12) + "…" : s.team;
                      return (
                        <tr key={s.team} className="border-b border-[hsl(220,10%,15%)]" style={{ backgroundColor: rowBg }}>
                          <td className="py-1 pr-1 text-[hsl(0,0%,50%)]">{pos + 1}</td>
                          <td className={`py-1 pr-1 font-semibold truncate max-w-[100px] ${s.isTBD ? "italic text-[hsl(0,0%,50%)]" : "text-white"}`} title={s.team}>
                            <FlagImg name={s.team} />{shortTeam}
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
  const [searchParams] = useSearchParams();
  const sharedBracketId = searchParams.get("bracket");
  const { user, profile } = useAuth();

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
  const [playoffPicks, setPlayoffPicks] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem("wc2026-playoff-picks");
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  const [champion, setChampion] = useState("");

  // Save bracket state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<"login" | "signup">("signup");
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  // Shared bracket viewing state
  const [viewingSharedBracket, setViewingSharedBracket] = useState(false);
  const [sharedOwnerName, setSharedOwnerName] = useState("");
  const [sharedBracketData, setSharedBracketData] = useState<any>(null);

  // Load shared bracket if URL has ?bracket=xxx
  useEffect(() => {
    if (!sharedBracketId) return;
    const loadShared = async () => {
      const { data, error } = await supabase
        .from("saved_brackets" as any)
        .select("*")
        .eq("id", sharedBracketId)
        .single();
      if (error || !data) {
        toast.error("Bracket not found");
        return;
      }
      const bracketRow = data as any;
      const bd = bracketRow.bracket_data;
      // Load bracket data into state
      setPredictions(bd.predictions || {});
      setPlayoffPicks(bd.playoffPicks || {});
      setSelectedThirds(bd.selectedThirds || []);
      setShowBracket(true);
      setSharedBracketData(bd);
      setViewingSharedBracket(true);
      // Fetch owner display name
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("user_id", bracketRow.user_id)
        .single();
      if (ownerProfile) {
        setSharedOwnerName(ownerProfile.display_name || ownerProfile.username || "Someone");
      } else {
        setSharedOwnerName("Someone");
      }
    };
    loadShared();
  }, [sharedBracketId]);

  // Generate unique bracket ID
  const generateBracketId = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let id = "";
    for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
  };

  const handleSaveBracket = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setSaving(true);
    try {
      const bracketId = generateBracketId();
      const bracketData = {
        predictions,
        playoffPicks,
        selectedThirds,
        knockoutPicks: (() => { try { return JSON.parse(localStorage.getItem("wc2026-knockout") || "{}"); } catch { return {}; } })(),
        awards: (() => { try { return JSON.parse(localStorage.getItem("wc2026-awards") || "{}"); } catch { return {}; } })(),
        champion,
      };
      const { error } = await supabase.from("saved_brackets" as any).insert({
        id: bracketId,
        user_id: user.id,
        bracket_data: bracketData,
      } as any);
      if (error) {
        toast.error("Failed to save bracket");
        console.error(error);
        return;
      }
      const url = `${window.location.origin}/world-cup-predictor?bracket=${bracketId}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Bracket saved! Link copied to clipboard.");
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

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

  useEffect(() => {
    localStorage.setItem("wc2026-playoff-picks", JSON.stringify(playoffPicks));
  }, [playoffPicks]);

  // Resolve TBD slots with playoff picks
  const resolvedGroups = useMemo(() => {
    return groups.map((g) => ({
      ...g,
      teams: g.teams.map((t) => {
        if (t.isTBD && playoffPicks[t.name]) {
          return { name: playoffPicks[t.name], isTBD: false };
        }
        return t;
      }),
    }));
  }, [playoffPicks]);

  const handlePlayoffPick = useCallback((slot: string, winner: string) => {
    setPlayoffPicks((prev) => {
      if (prev[slot] === winner) {
        const next = { ...prev };
        delete next[slot];
        return next;
      }
      return { ...prev, [slot]: winner };
    });
  }, []);

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

    for (const group of resolvedGroups) {
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
  }, [predictions, resolvedGroups]);

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

  // Ranking-based auto-fill for a single group
  const handleRankFillGroup = useCallback((letter: string) => {
    const group = resolvedGroups.find((g) => g.letter === letter);
    if (!group) return;
    const scores = rankBasedScoresForGroup(group);
    setPredictions((prev) => ({ ...prev, ...scores }));
  }, [resolvedGroups]);

  // Ranking-based auto-fill for ALL groups
  const handleRankFillAllGroups = useCallback(() => {
    setPredictions((prev) => {
      const next = { ...prev };
      for (const group of resolvedGroups) {
        const scores = rankBasedScoresForGroup(group);
        Object.assign(next, scores);
      }
      return next;
    });
  }, [resolvedGroups]);

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

  // Auto-pick all playoff slots by FIFA ranking
  const handleAutoPickPlayoffs = useCallback(() => {
    const newPicks: Record<string, string> = {};
    playoffMatchups.forEach((m) => {
      newPicks[m.slot] = rankWinner(m.teamA, m.teamB);
    });
    setPlayoffPicks((prev) => ({ ...prev, ...newPicks }));
  }, []);

  // Auto-pick 8 best third-place teams (by pts then FIFA ranking tiebreak)
  const handleAutoPickThirds = useCallback(() => {
    // Sort bestThirds by pts desc, then by FIFA rank asc (lower = better)
    const sorted = [...bestThirds].sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return getFifaRank(a.team) - getFifaRank(b.team);
    });
    setSelectedThirds(sorted.slice(0, 8).map((t) => t.team));
  }, [bestThirds]);

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
    setPlayoffPicks({});
    localStorage.removeItem("wc2026-knockout");
    localStorage.removeItem("wc2026-selected-thirds");
    localStorage.removeItem("wc2026-playoff-picks");
  }, []);

  // Ref for bracket auto-fill
  const bracketAutoFillRef = useRef<{ autoFillAllRounds: () => void } | null>(null);

  // "Auto Fill Everything" — runs all steps sequentially with delays
  const [autoFillEverythingLoading, setAutoFillEverythingLoading] = useState(false);
  const handleAutoFillEverything = useCallback(() => {
    setAutoFillEverythingLoading(true);
    // Step 1: Auto-pick playoffs
    const newPlayoffPicks: Record<string, string> = {};
    playoffMatchups.forEach((m) => {
      newPlayoffPicks[m.slot] = rankWinner(m.teamA, m.teamB);
    });
    setPlayoffPicks((prev) => ({ ...prev, ...newPlayoffPicks }));

    setTimeout(() => {
      // Step 2: After playoffs resolved, fill all groups with rankings
      // Need to build resolved groups with the new playoff picks
      const resolvedForFill = groups.map((g) => ({
        ...g,
        teams: g.teams.map((t) => {
          if (t.isTBD && newPlayoffPicks[t.name]) {
            return { name: newPlayoffPicks[t.name], isTBD: false };
          }
          return t;
        }),
      }));
      setPredictions((prev) => {
        const next = { ...prev };
        for (const group of resolvedForFill) {
          const scores = rankBasedScoresForGroup(group);
          Object.assign(next, scores);
        }
        return next;
      });

      setTimeout(() => {
        // Step 3: Auto pick thirds (will be calculated from new predictions)
        // We need to trigger this after predictions have been set
        // Use a flag to trigger in next render
        setAutoFillStep(3);
      }, 500);
    }, 500);
  }, []);

  const [autoFillStep, setAutoFillStep] = useState(0);

  useEffect(() => {
    if (autoFillStep === 3) {
      // Auto-pick 8 best thirds
      const sorted = [...bestThirds].sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return getFifaRank(a.team) - getFifaRank(b.team);
      });
      setSelectedThirds(sorted.slice(0, 8).map((t) => t.team));
      setAutoFillStep(4);
    } else if (autoFillStep === 4) {
      // Show bracket
      setShowBracket(true);
      setTimeout(() => {
        setAutoFillStep(5);
      }, 500);
    } else if (autoFillStep === 5) {
      // Auto-fill all knockout rounds
      setTimeout(() => {
        bracketAutoFillRef.current?.autoFillAllRounds();
        setAutoFillEverythingLoading(false);
        setAutoFillStep(0);
      }, 500);
    }
  }, [autoFillStep, bestThirds]);

  const handleToggleThird = useCallback((teamName: string) => {
    setSelectedThirds((prev) => {
      if (prev.includes(teamName)) {
        return prev.filter((t) => t !== teamName);
      }
      if (prev.length >= 8) return prev;
      return [...prev, teamName];
    });
  }, []);

  const [rankFillAllLoading, setRankFillAllLoading] = useState(false);
  const [autoPickThirdsLoading, setAutoPickThirdsLoading] = useState(false);

  // Build the user-selected thirds list for the bracket (ordered by bestThirds ranking)
  const userSelectedThirdsForBracket = useMemo(() => {
    return bestThirds.filter((t) => selectedThirds.includes(t.team));
  }, [bestThirds, selectedThirds]);

  // Clean up selectedThirds when third-place teams change (e.g. scores edited)
  useEffect(() => {
    const validTeams = bestThirds.map((t) => t.team);
    setSelectedThirds((prev) => prev.filter((t) => validTeams.includes(t)));
  }, [bestThirds]);

  const [rankingsOpen, setRankingsOpen] = useState(false);

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: "linear-gradient(180deg, hsl(220, 20%, 8%) 0%, hsl(230, 18%, 6%) 50%, hsl(220, 20%, 8%) 100%)" }}>
      <PageSeo
        title="World Cup 2026 Predictor | Sports Trivia Games"
        description="Explore all 12 groups for the FIFA World Cup 2026 hosted in USA, Mexico & Canada."
        path="/world-cup-predictor"
      />

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} defaultTab={authDefaultTab} />

      {/* Shared bracket banner */}
      {viewingSharedBracket && (
        <div className="sticky top-0 z-[60] flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 px-4 py-3 bg-[hsl(220,40%,20%)] border-b border-[hsl(220,40%,30%)] text-center">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[hsl(45,90%,60%)]" />
            <span className="text-white text-sm font-semibold">
              You're viewing <span className="text-[hsl(45,90%,60%)]">{sharedOwnerName}'s</span> bracket
            </span>
          </div>
          <a
            href="/world-cup-predictor"
            className="px-4 py-1.5 rounded-lg bg-[hsl(45,90%,45%)] hover:bg-[hsl(45,90%,50%)] text-[hsl(220,20%,8%)] text-sm font-bold transition-colors"
          >
            Make Your Own
          </a>
        </div>
      )}

      {/* FIFA Rankings Sidebar — Desktop: fixed right panel, Mobile: slide-over */}
      {/* Toggle button */}
      {!rankingsOpen && (
        <button
          onClick={() => setRankingsOpen(true)}
          className="fixed top-4 right-4 z-50 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold
            bg-[hsl(220,15%,15%)] border border-[hsl(220,15%,25%)] text-[hsl(45,90%,60%)]
            hover:bg-[hsl(220,15%,20%)] transition-colors shadow-lg"
        >
          🌍 FIFA Rankings <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Rankings panel */}
      {rankingsOpen && (
        <div className="fixed top-0 right-0 z-50 h-full w-72 bg-[hsl(220,18%,10%)] border-l border-[hsl(220,15%,20%)] shadow-2xl flex flex-col animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(220,15%,20%)]">
            <h3 className="text-sm font-bold text-[hsl(45,90%,60%)]">🌍 FIFA World Rankings</h3>
            <button
              onClick={() => setRankingsOpen(false)}
              className="p-1 rounded hover:bg-[hsl(220,15%,20%)] text-[hsl(150,15%,50%)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[hsl(220,18%,10%)]">
                <tr className="text-[hsl(150,15%,45%)] border-b border-[hsl(220,15%,18%)]">
                  <th className="text-left py-2 px-3 font-semibold">#</th>
                  <th className="text-left py-2 font-semibold">Team</th>
                  <th className="text-center py-2 px-3 font-semibold">Grp</th>
                </tr>
              </thead>
              <tbody>
                {FIFA_RANKINGS.map((r) => (
                  <tr
                    key={r.rank}
                    className="border-b border-[hsl(220,12%,14%)] hover:bg-[hsl(220,15%,14%)] transition-colors"
                  >
                    <td className="py-1.5 px-3 text-[hsl(45,80%,55%)] font-bold">{r.rank}</td>
                    <td className="py-1.5">
                      <span className="flex items-center gap-1.5">
                        <FlagImg name={r.team} size={20} />
                        <span className="text-white">{r.team}</span>
                      </span>
                    </td>
                    <td className="py-1.5 px-3 text-center">
                      <span className="inline-block w-5 h-5 rounded text-[10px] font-bold leading-5 text-center bg-[hsl(220,15%,20%)] text-[hsl(150,15%,60%)]">
                        {TEAM_GROUP[r.team] || "–"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
           USA <FlagImg name="USA" /> · Mexico <FlagImg name="Mexico" /> · Canada <FlagImg name="Canada" /> — 48 Teams · 12 Groups
          </p>
          {champion && !viewingSharedBracket && (
            <div className="mt-4 space-y-3">
              <ShareButtons
                score=""
                gameName="World Cup 2026 Predictor"
                gamePath="/world-cup-predictor"
                customText={`🏆 My World Cup 2026 prediction — I've got ${champion} winning it all! Make yours at douknowball.com/world-cup-predictor`}
              />
              <button
                onClick={handleSaveBracket}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[hsl(220,60%,45%)] hover:bg-[hsl(220,60%,50%)] disabled:opacity-50 text-white font-bold text-sm transition-colors shadow-lg"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save & Share My Bracket"}
              </button>
              {shareUrl && (
                <div className="flex flex-col items-center gap-1.5 mt-2">
                  <div className="flex items-center gap-2 bg-[hsl(220,15%,15%)] border border-[hsl(220,15%,25%)] rounded-lg px-3 py-2 text-xs max-w-md w-full">
                    <Link2 className="w-3.5 h-3.5 text-[hsl(45,90%,55%)] flex-shrink-0" />
                    <span className="text-[hsl(150,15%,60%)] truncate flex-1">{shareUrl}</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Copied!"); }}
                      className="text-[hsl(45,90%,55%)] text-[10px] font-bold hover:underline flex-shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Auth prompt modal content */}
          {showAuthModal && (
            <div className="mt-3 text-center text-[hsl(150,15%,50%)] text-xs">
              Create a free account to save and share your bracket prediction
            </div>
          )}
        </div>

        {/* Playoff Slots Panel */}
        {!viewingSharedBracket && (
          <PlayoffSlotsPanel picks={playoffPicks} onPick={handlePlayoffPick} onAutoPickPlayoffs={handleAutoPickPlayoffs} />
        )}

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
          {!viewingSharedBracket && (
            <div className="flex gap-2 flex-shrink-0 flex-wrap">
              <SmallAutoButton
                label="Fill by Rank"
                loading={rankFillAllLoading}
                onClick={() => { setRankFillAllLoading(true); setTimeout(() => { handleRankFillAllGroups(); setRankFillAllLoading(false); }, 1000); }}
              />
              <button
                onClick={handleAutoFillAll}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-[hsl(150,12%,18%)] hover:bg-[hsl(150,12%,22%)] text-[hsl(150,15%,60%)] border border-[hsl(150,20%,25%)] transition-colors"
              >
                <Shuffle className="w-3.5 h-3.5" /> Random All
              </button>
              <button
                onClick={handleResetEverything}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-[hsl(0,40%,15%)] hover:bg-[hsl(0,40%,20%)] text-[hsl(0,60%,65%)] border border-[hsl(0,30%,25%)] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Reset All
              </button>
            </div>
          )}
        </div>

        {/* Group Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {resolvedGroups.map((group) => (
            <GroupPredictionCard
              key={group.letter}
              group={group}
              predictions={predictions}
              onScoreChange={handleScoreChange}
              onAutoFillGroup={handleAutoFillGroup}
              onRankFillGroup={handleRankFillGroup}
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
                              <FlagImg name={t.team} />{t.team}
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
            <KnockoutBracket seeds={groupSeeds} bestThirds={userSelectedThirdsForBracket} onChampionChange={setChampion} />
          </div>
        )}

        {/* Awards Predictor */}
        <AwardsPredictor champion={champion} />
      </div>
    </div>
  );
};

export default WorldCupPredictor;
