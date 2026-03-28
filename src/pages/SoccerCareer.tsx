import { useState, useCallback, useRef, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { GameNavbar } from "@/components/game/GameNavbar";
import { Footer } from "@/components/game/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { toast } from "sonner";
import { Wind, Target, Zap, User, Shield, Dumbbell, Eye, ChevronRight, Trophy, Star } from "lucide-react";
import {
  type CareerState, type SeasonRecord,
  initCareer, advanceSeason, getCareerTotals, getFlag, getClubColor,
} from "@/lib/soccerCareerEngine";

/* ─── Constants ─── */
const NATIONALITIES = [
  "England","Spain","France","Germany","Brazil","Argentina","Portugal","Italy",
  "Netherlands","USA","Mexico","Japan","South Korea","Nigeria","Senegal","Ghana",
  "Morocco","Colombia","Uruguay","Belgium","Croatia","Denmark","Sweden","Norway",
  "Switzerland","Austria","Scotland","Wales","Ireland","Poland","Czech Republic",
  "Serbia","Romania","Greece","Turkey","Russia","Ukraine","Australia","New Zealand",
  "Canada","Jamaica","Costa Rica","Ecuador","Peru","Chile","Cameroon","Ivory Coast",
  "Egypt","Algeria","Tunisia",
];
const POSITIONS = [
  { value: "GK", label: "Goalkeeper (GK)" }, { value: "CB", label: "Centre Back (CB)" },
  { value: "LB", label: "Left Back (LB)" }, { value: "RB", label: "Right Back (RB)" },
  { value: "CDM", label: "Defensive Mid (CDM)" }, { value: "CM", label: "Central Mid (CM)" },
  { value: "CAM", label: "Attacking Mid (CAM)" }, { value: "LW", label: "Left Wing (LW)" },
  { value: "RW", label: "Right Wing (RW)" }, { value: "ST", label: "Striker (ST)" },
];
const ERAS = [
  { value: "1990s", label: "1990s", startYear: 1990 },
  { value: "2000s", label: "2000s", startYear: 2000 },
  { value: "2010s", label: "2010s", startYear: 2010 },
  { value: "2020s", label: "Modern (2020s)", startYear: 2020 },
];

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

type Stats = { pace: number; shooting: number; passing: number; dribbling: number; defending: number; physical: number; reflexes: number; };

function generateStats(position: string): Stats {
  const s: Stats = {
    pace: rand(45, 62), shooting: rand(45, 62), passing: rand(45, 62),
    dribbling: rand(45, 62), defending: rand(45, 62), physical: rand(45, 62), reflexes: rand(45, 62),
  };
  switch (position) {
    case "GK": s.reflexes = rand(55, 62); s.shooting = rand(20, 35); s.defending = rand(50, 60); break;
    case "CB": s.defending = rand(55, 62); s.physical = rand(52, 62); break;
    case "LB": case "RB": s.pace = rand(52, 62); s.defending = rand(50, 60); break;
    case "CDM": s.defending = rand(52, 62); s.passing = rand(50, 60); break;
    case "CM": s.passing = rand(52, 62); s.dribbling = rand(48, 58); break;
    case "CAM": s.passing = rand(52, 62); s.dribbling = rand(52, 62); s.shooting = rand(48, 58); break;
    case "LW": case "RW": s.pace = rand(55, 62); s.dribbling = rand(52, 62); break;
    case "ST": s.shooting = rand(55, 62); s.pace = rand(50, 60); break;
  }
  return s;
}

function calcOvr(s: Stats, pos: string) {
  if (pos === "GK") return Math.round(s.reflexes * 0.3 + s.defending * 0.2 + s.physical * 0.2 + s.pace * 0.1 + s.passing * 0.1 + s.dribbling * 0.05 + s.shooting * 0.05);
  return Math.round((s.pace + s.shooting + s.passing + s.dribbling + s.defending + s.physical) / 6);
}

/* ─── Sub-components ─── */

function StatBarGame({ label, value, color }: { label: string; value: number; color: string }) {
  const ratingColor = value >= 80 ? "text-green-400" : value >= 65 ? "text-emerald-400" : value >= 50 ? "text-yellow-400" : "text-red-400";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-[4.5rem] text-muted-foreground truncate">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${value}%` }} />
      </div>
      <span className={`text-xs font-bold w-6 text-right ${ratingColor}`}>{value}</span>
    </div>
  );
}

function TimelineEntry({ season, isCurrent, isLast }: { season: SeasonRecord; isCurrent: boolean; isLast: boolean }) {
  const label = season.type === "youth" ? "A" : season.type === "retired" ? "R" : season.type === "manager" ? "M" : null;
  const trophies = [season.leagueTitle && "🏆", season.championsLeague && "⭐", season.worldCup && "🌍", season.ballonDor && "🏅"].filter(Boolean);

  return (
    <div className={`relative flex items-start gap-3 py-2.5 px-3 rounded-lg transition-colors ${isCurrent ? 'bg-emerald-500/15 border border-emerald-500/30' : ''}`}>
      {/* Connector line */}
      {!isLast && <div className="absolute left-[1.65rem] top-10 w-0.5 h-[calc(100%-1rem)] bg-border" />}

      {/* Year dot */}
      <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black z-10 ${
        label === "A" ? "bg-amber-500/80 text-amber-950" :
        label === "R" ? "bg-muted text-muted-foreground" :
        isCurrent ? "bg-emerald-500 text-white" :
        "bg-muted/60 text-muted-foreground"
      }`}>
        {label || (season.year % 100).toString().padStart(2, "0")}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">{season.age}y</span>
          <span className="text-xs font-semibold truncate">{getFlag(season.clubCountry)} {season.club}</span>
        </div>
        {season.type === "playing" && (
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground">
              {season.apps}A · {season.goals}G · {season.assists}As
            </span>
            {trophies.length > 0 && <span className="text-[11px]">{trophies.join("")}</span>}
          </div>
        )}
        {season.type === "youth" && <span className="text-[10px] text-amber-400/70">Youth Academy</span>}
        {season.type === "retired" && <span className="text-[10px] text-muted-foreground">Retired</span>}
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function SoccerCareer() {
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  // Character creation
  const [playerName, setPlayerName] = useState("");
  const [nationality, setNationality] = useState("");
  const [position, setPosition] = useState("");
  const [era, setEra] = useState("");
  const [previewStats, setPreviewStats] = useState<Stats | null>(null);
  const [previewOvr, setPreviewOvr] = useState(0);
  const [saving, setSaving] = useState(false);

  // Game state
  const [career, setCareer] = useState<CareerState | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const isFormValid = playerName.trim().length > 0 && nationality && position && era;

  const handlePositionChange = useCallback((pos: string) => {
    setPosition(pos);
    const s = generateStats(pos);
    setPreviewStats(s);
    setPreviewOvr(calcOvr(s, pos));
  }, []);

  // Scroll timeline to bottom on new season
  useEffect(() => {
    if (career && timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, [career?.seasons.length]);

  const handleBeginCareer = async () => {
    if (!user) { setShowAuth(true); return; }
    if (!previewStats || !isFormValid) return;

    setSaving(true);
    const eraData = ERAS.find(e => e.value === era);
    const startYear = eraData?.startYear ?? 2020;

    const newCareer = initCareer(playerName.trim(), nationality, position, era, previewStats, previewOvr, startYear);
    setCareer(newCareer);
    setSaving(false);
    toast.success("Career started! You've joined the Youth Academy.");
  };

  const handleNextSeason = () => {
    if (!career || career.retired) return;
    setCareer(advanceSeason(career));
  };

  const handleNewCareer = () => {
    setCareer(null);
    setPreviewStats(null);
    setPlayerName(""); setNationality(""); setPosition(""); setEra("");
  };

  /* ─── RENDER ─── */
  return (
    <>
      <Helmet>
        <title>Soccer Career Simulator | douknowball</title>
        <meta name="description" content="Live out your soccer dream in this BitLife-style career simulator. Create a player, join a youth academy, and build your legend." />
        <link rel="canonical" href="https://douknowball.com/soccer-career" />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <GameNavbar />

        <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-4 py-4">
          {!career ? (
            /* ═══════ CHARACTER CREATION ═══════ */
            <div className="max-w-xl mx-auto space-y-5">
              <div className="text-center space-y-1">
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">⚽ Soccer Career</h1>
                <p className="text-muted-foreground text-sm">Create your player. Build your legend.</p>
              </div>

              <div className="space-y-4 bg-card border border-border rounded-xl p-4 sm:p-5">
                <h2 className="text-lg font-bold">Create Your Player</h2>
                <div className="space-y-1.5">
                  <Label htmlFor="pname">Player Name</Label>
                  <Input id="pname" placeholder="Enter your player name..." value={playerName} onChange={e => setPlayerName(e.target.value)} maxLength={40} className="bg-muted/30" />
                </div>
                <div className="space-y-1.5">
                  <Label>Nationality</Label>
                  <Select value={nationality} onValueChange={setNationality}>
                    <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Choose nationality" /></SelectTrigger>
                    <SelectContent>{NATIONALITIES.map(n => <SelectItem key={n} value={n}>{getFlag(n)} {n}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Position</Label>
                  <Select value={position} onValueChange={handlePositionChange}>
                    <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Choose position" /></SelectTrigger>
                    <SelectContent>{POSITIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Starting Era</Label>
                  <Select value={era} onValueChange={setEra}>
                    <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Choose era" /></SelectTrigger>
                    <SelectContent>{ERAS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {previewStats && (
                <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold">Starting Stats</h2>
                    <span className={`text-2xl font-black ${previewOvr >= 55 ? 'text-green-400' : 'text-yellow-400'}`}>{previewOvr}</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { l: "Pace", v: previewStats.pace, c: "bg-emerald-500" },
                      { l: position === "GK" ? "Reflexes" : "Shooting", v: position === "GK" ? previewStats.reflexes : previewStats.shooting, c: "bg-red-500" },
                      { l: "Passing", v: previewStats.passing, c: "bg-blue-500" },
                      { l: "Dribbling", v: previewStats.dribbling, c: "bg-yellow-500" },
                      { l: "Defending", v: previewStats.defending, c: "bg-purple-500" },
                      { l: "Physical", v: previewStats.physical, c: "bg-orange-500" },
                    ].map(s => <StatBarGame key={s.l} label={s.l} value={s.v} color={s.c} />)}
                  </div>
                </div>
              )}

              <Button onClick={handleBeginCareer} disabled={!isFormValid || saving}
                className="w-full h-12 text-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40">
                {saving ? "Creating..." : "⚽ Begin Career"}
              </Button>
              {!user && <p className="text-xs text-muted-foreground text-center">Sign in to save your career</p>}
            </div>
          ) : (
            /* ═══════ GAME SCREEN ═══════ */
            <GameScreen career={career} onNextSeason={handleNextSeason} onNewCareer={handleNewCareer} timelineRef={timelineRef} />
          )}
        </main>
        <Footer />
      </div>
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}

/* ─── Game Screen ─── */
function GameScreen({ career, onNextSeason, onNewCareer, timelineRef }: {
  career: CareerState; onNextSeason: () => void; onNewCareer: () => void;
  timelineRef: React.RefObject<HTMLDivElement>;
}) {
  const totals = getCareerTotals(career.seasons);
  const currentSeason = career.seasons[career.seasons.length - 1];
  const clubColor = getClubColor(career.currentClub);

  const statBars = career.position === "GK"
    ? [
        { l: "Reflexes", v: career.reflexes, c: "bg-cyan-500" },
        { l: "Pace", v: career.pace, c: "bg-emerald-500" },
        { l: "Passing", v: career.passing, c: "bg-blue-500" },
        { l: "Dribbling", v: career.dribbling, c: "bg-yellow-500" },
        { l: "Defending", v: career.defending, c: "bg-purple-500" },
        { l: "Physical", v: career.physical, c: "bg-orange-500" },
      ]
    : [
        { l: "Pace", v: career.pace, c: "bg-emerald-500" },
        { l: "Shooting", v: career.shooting, c: "bg-red-500" },
        { l: "Passing", v: career.passing, c: "bg-blue-500" },
        { l: "Dribbling", v: career.dribbling, c: "bg-yellow-500" },
        { l: "Defending", v: career.defending, c: "bg-purple-500" },
        { l: "Physical", v: career.physical, c: "bg-orange-500" },
      ];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            {getFlag(career.nationality)} {career.playerName}
          </h1>
          <p className="text-xs text-muted-foreground">{career.position} · Age {career.age} · {career.nationality}</p>
        </div>
        <div className="text-center">
          <div className={`text-3xl sm:text-4xl font-black ${career.overall >= 80 ? 'text-green-400' : career.overall >= 65 ? 'text-emerald-400' : career.overall >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
            {career.overall}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">OVR</div>
        </div>
      </div>

      {/* Main panels — stacked on mobile, side by side on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-3">

        {/* LEFT — Timeline */}
        <div className="bg-card border border-border rounded-xl overflow-hidden order-2 md:order-1">
          <div className="px-3 py-2 border-b border-border bg-muted/20">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Career Timeline</span>
          </div>
          <div ref={timelineRef} className="max-h-[320px] md:max-h-[480px] overflow-y-auto p-2 space-y-0.5 scrollbar-thin">
            {career.seasons.map((s, i) => (
              <TimelineEntry key={s.year} season={s} isCurrent={i === career.seasons.length - 1} isLast={i === career.seasons.length - 1} />
            ))}
          </div>
        </div>

        {/* RIGHT — Stats & Info */}
        <div className="space-y-3 order-1 md:order-2">

          {/* Club badge & contract */}
          <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-black shrink-0"
              style={{ backgroundColor: clubColor + "22", color: clubColor, border: `2px solid ${clubColor}44` }}>
              {career.currentClub === "Youth Academy" ? "YA" : career.currentClub.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{getFlag(career.currentClubCountry)} {career.currentClub}</div>
              <div className="text-xs text-muted-foreground">
                {career.retired ? "Retired" : `Contract: ${career.contractYearsLeft}yr · €${career.marketValue >= 1 ? career.marketValue.toFixed(0) : career.marketValue.toFixed(1)}M`}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-lg font-black" style={{ color: clubColor }}>{career.position}</div>
              <div className="text-[10px] text-muted-foreground">
                {currentSeason.year}/{(currentSeason.year + 1).toString().slice(-2)}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Attributes</span>
            {statBars.map(s => <StatBarGame key={s.l} label={s.l} value={s.v} color={s.c} />)}
          </div>

          {/* Career totals */}
          <div className="bg-card border border-border rounded-xl p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Career Stats</span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-3">
              {[
                { l: "Apps", v: totals.apps },
                { l: "Goals", v: totals.goals },
                { l: "Assists", v: totals.assists },
                ...(career.position === "GK" ? [{ l: "CS", v: totals.cleanSheets }] : []),
                { l: "🟨", v: totals.yellowCards },
                { l: "🟥", v: totals.redCards },
              ].map(s => (
                <div key={s.l} className="text-center">
                  <div className="text-lg sm:text-xl font-black">{s.v}</div>
                  <div className="text-[10px] text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Trophies */}
          <div className="bg-card border border-border rounded-xl p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Trophy Cabinet</span>
            <div className="grid grid-cols-4 gap-3 mt-3">
              {[
                { emoji: "🏆", l: "Leagues", v: totals.leagueTitles },
                { emoji: "⭐", l: "UCL", v: totals.championsLeagues },
                { emoji: "🌍", l: "World Cup", v: totals.worldCups },
                { emoji: "🏅", l: "Ballon d'Or", v: totals.ballonDors },
              ].map(t => (
                <div key={t.l} className={`text-center rounded-lg p-2 ${t.v > 0 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-muted/20 opacity-40'}`}>
                  <div className="text-xl">{t.emoji}</div>
                  <div className="text-sm font-black">{t.v}</div>
                  <div className="text-[9px] text-muted-foreground">{t.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Events log */}
      {career.events.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Latest Events</span>
          <div className="mt-2 space-y-1">
            {career.events.slice(-3).map((e, i) => (
              <div key={i} className="text-xs text-foreground/80 flex items-start gap-2">
                <span className="shrink-0">›</span>
                <span>{e}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-3">
        {!career.retired ? (
          <Button onClick={onNextSeason}
            className="flex-1 h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
            Next Season <ChevronRight className="w-5 h-5" />
          </Button>
        ) : (
          <Button onClick={onNewCareer}
            className="flex-1 h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-white">
            ⚽ New Career
          </Button>
        )}
        <div className="bg-card border border-border rounded-xl px-4 py-2 text-center shrink-0">
          <div className="text-lg font-black">{career.age}</div>
          <div className="text-[9px] text-muted-foreground uppercase">Age</div>
        </div>
      </div>
    </div>
  );
}
