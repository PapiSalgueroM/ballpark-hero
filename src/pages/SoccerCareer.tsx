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
import { ChevronRight } from "lucide-react";
import {
  type CareerState, type SeasonRecord, type ClubData, type ContractOffer, type TransferSituation,
  type RandomEvent, type EventChoice, type WorldCupResult, type WCMatch,
  type RivalPlayer, type RivalryEvent, type RivalrySummary,
  type LifestyleLevel, type FamilyStatus, type BallonDorResult, type BallonDorNominee,
  type UCLResult, type UCLKnockoutMatch, type Award,
  type LegacyResult, type LegacyTier, type PostRetirementChoice, type ManagerState,
  type NewsArticle,
  initCareer, advanceYouthYear, acceptOffer, advanceProSeason,
  dismissSummary, stayAtClub, signExtension, requestTransfer, applyEventChoice,
  dismissDebut, dismissWorldCup, retireFromInternational, dismissRivalryEvent,
  dismissBallonDor, manualRetire, choosePostRetirement, advanceManagerSeason, endManagerCareer,
  dismissNewspaper,
  generateShareText, getYouthAcademyClub,
  getCareerTotals, getFlag, calcOverall, formatWage, formatNetWorth, formatFollowers,
} from "@/lib/soccerCareerEngine";
import { shareResult } from "@/lib/share";

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

type Stats = { pace: number; shooting: number; passing: number; dribbling: number; defending: number; physical: number; reflexes: number };

function generateStats(position: string): Stats {
  const s: Stats = { pace: rand(45, 62), shooting: rand(45, 62), passing: rand(45, 62), dribbling: rand(45, 62), defending: rand(45, 62), physical: rand(45, 62), reflexes: rand(45, 62) };
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

/* ─── Stat Bar ─── */
function StatBarGame({ label, value, color }: { label: string; value: number; color: string }) {
  const rc = value >= 80 ? "text-green-400" : value >= 65 ? "text-emerald-400" : value >= 50 ? "text-yellow-400" : "text-red-400";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-[4.5rem] text-muted-foreground truncate">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${value}%` }} />
      </div>
      <span className={`text-xs font-bold w-6 text-right ${rc}`}>{value}</span>
    </div>
  );
}

/* ─── Timeline Entry ─── */
function TimelineEntry({ season, isCurrent, isLast }: { season: SeasonRecord; isCurrent: boolean; isLast: boolean }) {
  const label = season.type === "youth" ? "A" : season.type === "retired" ? "R" : null;
  const trophies = [season.leagueTitle && "🏆", season.domesticCup && "🏆", season.championsLeague && "⭐", season.worldCup && "🌍", season.ballonDor && "🏅"].filter(Boolean);

  return (
    <div className={`relative flex items-start gap-3 py-2 px-3 rounded-lg transition-colors ${isCurrent ? 'bg-emerald-500/15 border border-emerald-500/30' : ''}`}>
      {!isLast && <div className="absolute left-[1.65rem] top-9 w-0.5 h-[calc(100%-0.5rem)] bg-border" />}
      <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black z-10 ${
        label === "A" ? "bg-amber-500/80 text-amber-950" :
        label === "R" ? "bg-muted text-muted-foreground" :
        isCurrent ? "bg-emerald-500 text-white" : "bg-muted/60 text-muted-foreground"
      }`}>
        {label || (season.year % 100).toString().padStart(2, "0")}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">{season.age}y</span>
          <span className="text-xs font-semibold truncate">{getFlag(season.clubCountry)} {season.club}</span>
        </div>
        {season.type === "playing" && (
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground">{season.apps}A · {season.goals}G · {season.assists}As</span>
            {trophies.length > 0 && <span className="text-[11px]">{trophies.join("")}</span>}
          </div>
        )}
        {season.type === "youth" && <span className="text-[10px] text-amber-400/70">Youth Academy</span>}
        {season.type === "retired" && <span className="text-[10px] text-muted-foreground">Retired</span>}
      </div>
    </div>
  );
}

/* ─── Contract Offer Card ─── */
function OfferCard({ offer, onAccept, actionLabel }: { offer: ContractOffer; onAccept: () => void; actionLabel?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-black shrink-0"
          style={{ backgroundColor: offer.club.color + "22", color: offer.club.color, border: `2px solid ${offer.club.color}44` }}>
          {offer.club.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate">{getFlag(offer.club.country)} {offer.club.name}</div>
          <div className="text-[11px] text-muted-foreground">{offer.club.league}</div>
        </div>
        {offer.isDreamClub && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">⭐ Dream Club</span>}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span>📋 {offer.contractYears}yr</span>
        <span>💰 {formatWage(offer.wage)}</span>
        {offer.transferFee > 0 && <span>🏷️ €{offer.transferFee.toFixed(1)}M fee</span>}
        {offer.transferFee === 0 && offer.contractYears > 0 && <span className="text-emerald-400 font-semibold">Free transfer</span>}
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/40">Tier {offer.club.tier}</span>
      </div>
      {offer.isPayCut && <div className="text-[11px] text-amber-400">⚠️ Lower wages — but it's a dream move</div>}
      <Button onClick={onAccept} className="w-full h-9 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white">
        {actionLabel || "Sign Contract ✍️"}
      </Button>
    </div>
  );
}

/* ─── Newspaper Card ─── */
function NewspaperCard({ articles, onContinue }: { articles: NewsArticle[]; onContinue: () => void }) {
  const typeColor = (t: string) => {
    switch (t) {
      case "positive": return "text-emerald-400";
      case "negative": return "text-red-400";
      case "transfer": return "text-blue-400";
      case "milestone": return "text-amber-400";
      default: return "text-foreground";
    }
  };
  const typeLabel = (t: string) => {
    switch (t) {
      case "positive": return "📰";
      case "negative": return "⚠️";
      case "transfer": return "💼";
      case "milestone": return "🏆";
      default: return "📰";
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-center py-2">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">📰 In The Headlines</span>
      </div>
      {articles.map((article, i) => (
        <div key={i} className="bg-card border-2 border-border rounded-xl overflow-hidden">
          {/* Newspaper masthead */}
          <div className="bg-muted/30 border-b border-border px-4 py-2 flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-muted-foreground italic">{article.newspaper}</span>
            <span className="text-[10px] text-muted-foreground">{typeLabel(article.type)}</span>
          </div>
          {/* Headline */}
          <div className="px-4 pt-4 pb-2">
            <h3 className={`text-base sm:text-lg font-black leading-tight ${typeColor(article.type)}`} style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
              {article.headline}
            </h3>
          </div>
          {/* Separator */}
          <div className="mx-4 border-t border-border" />
          {/* Body */}
          <div className="px-4 pt-2 pb-4">
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
              {article.body}
            </p>
          </div>
        </div>
      ))}
      <Button onClick={onContinue} className="w-full h-10 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white">
        Continue to Season Summary →
      </Button>
    </div>
  );
}

/* ─── Season Summary Card ─── */
function SeasonSummaryCard({ season, position, onContinue }: { season: SeasonRecord; position: string; onContinue: () => void }) {
  const isGK = position === "GK";
  const trophies = [season.leagueTitle && "🏆 League", season.domesticCup && "🏆 Cup", season.championsLeague && "⭐ UCL", season.worldCup && "🌍 World Cup", season.ballonDor && "🏅 Ballon d'Or"].filter(Boolean);

  return (
    <div className="bg-card border-2 border-emerald-500/30 rounded-xl p-5 space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-black">Season Summary</h3>
        <p className="text-xs text-muted-foreground">{getFlag(season.clubCountry)} {season.club} · {season.year}/{(season.year + 1).toString().slice(-2)}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center bg-muted/20 rounded-lg p-2">
          <div className="text-xl font-black">{season.apps}</div>
          <div className="text-[10px] text-muted-foreground">Apps</div>
        </div>
        <div className="text-center bg-muted/20 rounded-lg p-2">
          <div className="text-xl font-black">{isGK ? season.cleanSheets : season.goals}</div>
          <div className="text-[10px] text-muted-foreground">{isGK ? "Clean Sheets" : "Goals"}</div>
        </div>
        <div className="text-center bg-muted/20 rounded-lg p-2">
          <div className="text-xl font-black">{season.assists}</div>
          <div className="text-[10px] text-muted-foreground">Assists</div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Avg Rating: <strong className="text-foreground">{season.rating.toFixed(1)}</strong></span>
        <span>🟨 {season.yellowCards} 🟥 {season.redCards}</span>
      </div>

      {trophies.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-center">
          <span className="text-sm font-bold">{trophies.join(" · ")}</span>
        </div>
      )}

      <Button onClick={onContinue} className="w-full h-10 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white">
        Continue →
      </Button>
    </div>
  );
}

/* ─── Main Component ─── */
const SAVE_KEY = "soccerCareerSave";

export default function SoccerCareer() {
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [nationality, setNationality] = useState("");
  const [position, setPosition] = useState("");
  const [era, setEra] = useState("");
  const [previewStats, setPreviewStats] = useState<Stats | null>(null);
  const [previewOvr, setPreviewOvr] = useState(0);
  const [saving, setSaving] = useState(false);
  const [career, setCareer] = useState<CareerState | null>(() => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) return JSON.parse(saved) as CareerState;
    } catch {}
    return null;
  });
  const [clubs, setClubs] = useState<ClubData[]>([]);
  const [rolledOvr, setRolledOvr] = useState<number | null>(null);
  const [showNewCareerConfirm, setShowNewCareerConfirm] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Load clubs from Supabase
  useEffect(() => {
    supabase.from("soccer_career_clubs" as any).select("*").then(({ data }) => {
      if (data) setClubs(data as unknown as ClubData[]);
    });
  }, []);

  // Save career to localStorage whenever it changes
  useEffect(() => {
    if (career) {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(career)); } catch {}
    }
  }, [career]);

  const isFormValid = playerName.trim().length > 0 && nationality && position && era;

  const handlePositionChange = useCallback((pos: string) => {
    setPosition(pos);
    const s = generateStats(pos);
    setPreviewStats(s);
    setPreviewOvr(calcOverall(s, pos));
  }, []);

  useEffect(() => {
    if (career && timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, [career?.seasons.length]);

  const handleBeginCareer = () => {
    if (!user) { setShowAuth(true); return; }
    if (!previewStats || !isFormValid || clubs.length === 0 || rolledOvr === null) return;
    const startYear = ERAS.find(e => e.value === era)?.startYear ?? 2020;
    const newCareer = initCareer(playerName.trim(), nationality, position, era, previewStats, rolledOvr, startYear, clubs);
    setCareer(newCareer);
    toast.success(`Joined ${newCareer.currentClub}!`);
  };

  const handleNextSeason = () => {
    if (!career) return;
    if (career.phase === "youth") {
      setCareer(advanceYouthYear(career, clubs));
    } else if (career.phase === "playing") {
      setCareer(advanceProSeason(career, clubs));
    }
  };

  const handleAcceptOffer = (offer: ContractOffer) => {
    if (!career) return;
    setCareer(acceptOffer(career, offer));
    toast.success(`Signed with ${offer.club.name}!`);
  };

  const handleDismissSummary = () => {
    if (!career) return;
    setCareer(dismissSummary(career, clubs));
  };

  const handleDismissNewspaper = () => {
    if (!career) return;
    setCareer(dismissNewspaper(career));
  };

  const handleStay = () => {
    if (!career) return;
    setCareer(stayAtClub(career));
    toast("Staying at " + career.currentClub);
  };

  const handleSignExtension = () => {
    if (!career) return;
    setCareer(signExtension(career));
    toast.success("Contract extended!");
  };

  const handleRequestTransfer = () => {
    if (!career) return;
    const result = requestTransfer(career, clubs);
    const s = { ...career, transferSituation: result };
    if (result.type === "request_result" && !result.offer) {
      toast.error("No clubs are interested right now. You must stay.");
      s.phase = "playing" as const;
      s.transferSituation = null;
    }
    setCareer(s);
  };

  const handleEventChoice = (choiceIndex: number) => {
    if (!career) return;
    const event = career.pendingEvents[0];
    if (!event) return;
    const result = applyEventChoice(career, choiceIndex, clubs);
    setCareer(result);
    toast(event.choices[choiceIndex].consequence);
  };

  const handleDismissDebut = () => {
    if (!career) return;
    setCareer(dismissDebut(career, clubs));
  };

  const handleDismissWorldCup = () => {
    if (!career) return;
    setCareer(dismissWorldCup(career, clubs));
  };

  const handleRetireInternational = () => {
    if (!career) return;
    setCareer(retireFromInternational(career));
    toast("Retired from international football");
  };

  const handleDismissRivalryEvent = () => {
    if (!career) return;
    setCareer(dismissRivalryEvent(career, clubs));
  };

  const handleDismissBallonDor = () => {
    if (!career) return;
    setCareer(dismissBallonDor(career, clubs));
  };

  const handleManualRetire = () => {
    if (!career) return;
    setCareer(manualRetire(career));
  };

  const handlePostRetirement = (choice: PostRetirementChoice) => {
    if (!career) return;
    setCareer(choosePostRetirement(career, choice, clubs));
  };

  const handleAdvanceManager = () => {
    if (!career) return;
    setCareer(advanceManagerSeason(career, clubs));
  };

  const handleEndManager = () => {
    if (!career) return;
    setCareer(endManagerCareer(career));
  };

  const handleShare = () => {
    if (!career) return;
    shareResult(generateShareText(career));
  };

  const handleNewCareer = () => {
    setShowNewCareerConfirm(true);
  };

  const handleConfirmNewCareer = () => {
    localStorage.removeItem(SAVE_KEY);
    setCareer(null);
    setPreviewStats(null);
    setRolledOvr(null);
    setPlayerName(""); setNationality(""); setPosition(""); setEra("");
    setShowNewCareerConfirm(false);
  };

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
            <CreationScreen
              playerName={playerName} setPlayerName={setPlayerName}
              nationality={nationality} setNationality={setNationality}
              position={position} handlePositionChange={handlePositionChange}
              era={era} setEra={setEra}
              previewStats={previewStats} previewOvr={previewOvr}
              isFormValid={isFormValid && clubs.length > 0} saving={saving}
              user={user} onBegin={handleBeginCareer} onShowAuth={() => setShowAuth(true)}
              clubs={clubs} onRolledOvr={setRolledOvr}
            />
          ) : (
            <GameScreen
              career={career}
              clubs={clubs}
              onNextSeason={handleNextSeason}
              onAcceptOffer={handleAcceptOffer}
              onDismissSummary={handleDismissSummary}
              onDismissNewspaper={handleDismissNewspaper}
              onStay={handleStay}
              onSignExtension={handleSignExtension}
              onRequestTransfer={handleRequestTransfer}
              onEventChoice={handleEventChoice}
              onDismissDebut={handleDismissDebut}
              onDismissWorldCup={handleDismissWorldCup}
              onRetireInternational={handleRetireInternational}
              onDismissRivalryEvent={handleDismissRivalryEvent}
              onDismissBallonDor={handleDismissBallonDor}
              onManualRetire={handleManualRetire}
              onPostRetirement={handlePostRetirement}
              onAdvanceManager={handleAdvanceManager}
              onEndManager={handleEndManager}
              onShare={handleShare}
              onNewCareer={handleNewCareer}
              timelineRef={timelineRef}
            />
          )}
        </main>
        <Footer />
      </div>
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}

/* ─── Overall tier info ─── */
function getOverallTier(ovr: number): { label: string; color: string; bgColor: string } {
  if (ovr >= 75) return { label: "Exceptional — Born Winner", color: "text-purple-400", bgColor: "bg-purple-500/15 border-purple-500/30" };
  if (ovr >= 66) return { label: "Gifted — High Ceiling", color: "text-amber-400", bgColor: "bg-amber-500/15 border-amber-500/30" };
  if (ovr >= 55) return { label: "Solid Foundation — Good Potential", color: "text-emerald-400", bgColor: "bg-emerald-500/15 border-emerald-500/30" };
  if (ovr >= 40) return { label: "Promising — Hard Work Ahead", color: "text-blue-400", bgColor: "bg-blue-500/15 border-blue-500/30" };
  return { label: "Raw Talent — Rough Around the Edges", color: "text-muted-foreground", bgColor: "bg-muted/20 border-border" };
}

/* ─── Creation Screen ─── */
function CreationScreen({ playerName, setPlayerName, nationality, setNationality, position, handlePositionChange, era, setEra, previewStats, previewOvr, isFormValid, saving, user, onBegin, onShowAuth, clubs, onRolledOvr }: any) {
  const [rolledOvr, setRolledOvr] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [displayOvr, setDisplayOvr] = useState(0);
  const [academyClub, setAcademyClub] = useState<ClubData | null>(null);

  const canGenerate = playerName.trim().length > 0 && nationality && position && era;

  const doRoll = useCallback(() => {
    if (!canGenerate || clubs.length === 0) return;
    setIsRolling(true);
    setAcademyClub(null);
    // Slot machine animation: cycle through random numbers
    let ticks = 0;
    const totalTicks = 18;
    const interval = setInterval(() => {
      ticks++;
      setDisplayOvr(rand(25, 78));
      if (ticks >= totalTicks) {
        clearInterval(interval);
        const finalOvr = rand(25, 78);
        setDisplayOvr(finalOvr);
        setRolledOvr(finalOvr);
        onRolledOvr?.(finalOvr);
        setIsRolling(false);
        // Preview academy
        const club = getYouthAcademyClub(clubs, nationality, finalOvr);
        setAcademyClub(club);
      }
    }, 60);
  }, [canGenerate, clubs, nationality]);

  const tier = rolledOvr !== null ? getOverallTier(rolledOvr) : (isRolling ? getOverallTier(displayOvr) : null);

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="text-center space-y-1">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">⚽ Soccer Career</h1>
        <p className="text-muted-foreground text-sm">Create your player. Build your legend.</p>
      </div>
      <div className="space-y-4 bg-card border border-border rounded-xl p-4 sm:p-5">
        <h2 className="text-lg font-bold">Create Your Player</h2>
        <div className="space-y-1.5">
          <Label htmlFor="pname">Player Name</Label>
          <Input id="pname" placeholder="Enter your player name..." value={playerName} onChange={(e: any) => setPlayerName(e.target.value)} maxLength={40} className="bg-muted/30" />
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

      {/* Generate Starting Potential */}
      {canGenerate && (
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 space-y-4">
          <h2 className="text-base font-bold text-center">Starting Potential</h2>

          {(rolledOvr !== null || isRolling) && (
            <div className={`rounded-xl border p-5 text-center space-y-2 transition-all ${tier ? tier.bgColor : "bg-muted/20 border-border"}`}>
              <div className={`text-6xl font-black tabular-nums transition-all ${isRolling ? "animate-pulse" : "animate-scale-in"} ${tier ? tier.color : "text-foreground"}`}>
                {isRolling ? displayOvr : rolledOvr}
              </div>
              <div className={`text-sm font-bold ${tier ? tier.color : "text-muted-foreground"}`}>
                {isRolling ? "Rolling..." : tier?.label}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={doRoll}
              disabled={isRolling}
              className={`flex-1 h-11 text-sm font-bold text-white ${rolledOvr !== null ? "bg-muted/40 hover:bg-muted/60 text-foreground" : "bg-emerald-600 hover:bg-emerald-500"}`}
              variant={rolledOvr !== null ? "outline" : "default"}
            >
              {isRolling ? "🎰 Rolling..." : rolledOvr !== null ? "🎲 Reroll" : "🎲 Generate Starting Potential"}
            </Button>
          </div>

          {/* Academy preview */}
          {academyClub && !isRolling && (
            <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-2 animate-fade-in">
              <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground text-center">Academy Placement</div>
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-black shrink-0"
                  style={{ backgroundColor: academyClub.color + "22", color: academyClub.color, border: `2px solid ${academyClub.color}44` }}>
                  {academyClub.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-sm">{getFlag(academyClub.country)} {academyClub.name} Youth</div>
                  <div className="text-[11px] text-muted-foreground">{academyClub.league} · Tier {academyClub.tier}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats preview */}
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

      <Button onClick={onBegin} disabled={!isFormValid || saving || rolledOvr === null}
        className="w-full h-12 text-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40">
        {saving ? "Creating..." : "⚽ Begin Career"}
      </Button>
      {rolledOvr === null && canGenerate && <p className="text-xs text-muted-foreground text-center">Generate your starting potential to begin</p>}
      {!user && <p className="text-xs text-muted-foreground text-center">Sign in to save your career</p>}
    </div>
  );
}

/* ─── Transfer Window Card ─── */
function TransferWindowCard({ situation, career, onAcceptOffer, onStay, onSignExtension, onRequestTransfer }: {
  situation: TransferSituation;
  career: CareerState;
  onAcceptOffer: (offer: ContractOffer) => void;
  onStay: () => void;
  onSignExtension: () => void;
  onRequestTransfer: () => void;
}) {
  const isExpiring = career.contractYearsLeft <= 1;

  return (
    <div className="space-y-3">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
        <h3 className="text-lg font-black">🔄 Transfer Window</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {isExpiring ? "⚠️ Your contract is expiring — decide your future" : "End of season — review your options"}
        </p>
        <div className="flex items-center justify-center gap-3 mt-2 text-xs text-muted-foreground">
          <span>📋 {career.contractYearsLeft}yr left</span>
          <span>💰 {formatWage(career.weeklyWage)}</span>
          <span>🏷️ €{career.marketValue >= 1 ? career.marketValue.toFixed(0) : career.marketValue.toFixed(1)}M value</span>
        </div>
      </div>

      {/* Situation: No Interest */}
      {situation.type === "no_interest" && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-sm text-center">No clubs have made an offer. Your club wants to keep you.</p>
          <div className="flex gap-2">
            <Button onClick={onStay} className="flex-1 h-9 text-sm bg-emerald-600 hover:bg-emerald-500 text-white">
              Stay and fight for place 💪
            </Button>
            <Button variant="outline" onClick={onRequestTransfer} className="flex-1 h-9 text-sm">
              Request transfer 📤
            </Button>
          </div>
        </div>
      )}

      {/* Situation: One Offer */}
      {situation.type === "one_offer" && (
        <div className="space-y-3">
          <OfferCard offer={situation.offer} onAccept={() => onAcceptOffer(situation.offer)} actionLabel="Accept Offer ✍️" />
          <div className="flex gap-2">
            <Button variant="outline" onClick={onStay} className="flex-1 h-9 text-sm">
              Reject & Stay
            </Button>
            <Button variant="outline" onClick={onRequestTransfer} className="flex-1 h-9 text-sm">
              Reject & Request Transfer 📤
            </Button>
          </div>
        </div>
      )}

      {/* Situation: Bidding War */}
      {situation.type === "bidding_war" && (
        <div className="space-y-3">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
            <span className="text-sm font-bold">🔥 Bidding War! Two clubs competing for your signature</span>
          </div>
          <OfferCard offer={situation.offerA} onAccept={() => onAcceptOffer(situation.offerA)} actionLabel="Join Club A ✍️" />
          <OfferCard offer={situation.offerB} onAccept={() => onAcceptOffer(situation.offerB)} actionLabel="Join Club B ✍️" />
          <Button variant="outline" onClick={onStay} className="w-full h-9 text-sm">
            Stay at {career.currentClub}
          </Button>
        </div>
      )}

      {/* Situation: Dream Club */}
      {situation.type === "dream_club" && (
        <div className="space-y-3">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
            <span className="text-sm font-bold">⭐ Dream Club Interest!</span>
            <p className="text-xs text-muted-foreground mt-1">A top club wants you — but they're offering below market value</p>
          </div>
          <OfferCard offer={situation.offer} onAccept={() => onAcceptOffer(situation.offer)} actionLabel="Accept pay cut for dream move ⭐" />
          <div className="flex gap-2">
            <Button variant="outline" onClick={onStay} className="flex-1 h-9 text-sm">
              Stay for better money 💰
            </Button>
            <Button variant="outline" onClick={onRequestTransfer} className="flex-1 h-9 text-sm">
              Wait for better offer 🔍
            </Button>
          </div>
        </div>
      )}

      {/* Situation: Contract Expiry */}
      {situation.type === "contract_expiry" && (
        <div className="space-y-3">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
            <span className="text-sm font-bold">⚠️ Contract Expiring!</span>
            <p className="text-xs text-muted-foreground mt-1">You can sign an extension or leave on a free transfer</p>
          </div>
          <Button onClick={onSignExtension} className="w-full h-9 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white">
            Sign Extension with {career.currentClub} 📝
          </Button>
          {situation.offers.map((offer) => (
            <OfferCard key={offer.club.name} offer={offer} onAccept={() => onAcceptOffer(offer)} actionLabel="Leave on free transfer ✍️" />
          ))}
        </div>
      )}

      {/* Situation: Request Result */}
      {situation.type === "request_result" && situation.offer && (
        <div className="space-y-3">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
            <span className="text-sm font-bold">📩 A club has responded to your transfer request!</span>
          </div>
          <OfferCard offer={situation.offer} onAccept={() => onAcceptOffer(situation.offer)} />
          <Button variant="outline" onClick={onStay} className="w-full h-9 text-sm">
            Changed my mind — stay at {career.currentClub}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Random Event Card ─── */
function RandomEventCard({ event, remaining, onChoice }: { event: RandomEvent; remaining: number; onChoice: (idx: number) => void }) {
  const categoryColors: Record<string, string> = {
    positive: "border-emerald-500/40 bg-emerald-500/5",
    negative: "border-red-500/40 bg-red-500/5",
    international: "border-blue-500/40 bg-blue-500/5",
    life: "border-purple-500/40 bg-purple-500/5",
  };
  const categoryLabels: Record<string, string> = {
    positive: "⚡ Positive Event",
    negative: "⚠️ Challenge",
    international: "🌍 International",
    life: "🏠 Life Event",
  };
  return (
    <div className={`rounded-xl border-2 p-5 space-y-4 ${categoryColors[event.category] || "border-border bg-card"}`}>
      <div className="text-center space-y-2">
        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
          {categoryLabels[event.category]} · {remaining} event{remaining !== 1 ? "s" : ""} remaining
        </span>
        <div className="text-4xl">{event.emoji}</div>
        <h3 className="text-lg font-black">{event.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>
      </div>
      <div className="space-y-2">
        {event.choices.map((choice, idx) => (
          <button
            key={idx}
            onClick={() => onChoice(idx)}
            className={`w-full rounded-xl p-3 text-left transition-all hover:scale-[1.02] active:scale-[0.98] border border-border/50 ${choice.color} text-white`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{choice.emoji}</span>
              <span className="font-bold text-sm">{choice.label}</span>
            </div>
            <div className="text-[11px] mt-1 opacity-80 ml-8">{choice.consequence}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── International Debut Screen ─── */
function InternationalDebutCard({ career, onDismiss }: { career: CareerState; onDismiss: () => void }) {
  return (
    <div className="rounded-xl border-2 border-amber-500/50 bg-gradient-to-b from-amber-500/10 to-transparent p-6 space-y-4 text-center">
      <div className="text-5xl">🇺🇳</div>
      <h3 className="text-2xl font-black tracking-tight">INTERNATIONAL DEBUT</h3>
      <p className="text-sm text-muted-foreground">
        {career.playerName} has been called up to the <strong>{career.nationality}</strong> national team!
      </p>
      <div className="flex items-center justify-center gap-3 text-sm">
        <span>{getFlag(career.nationality)}</span>
        <span className="font-bold">{career.nationality}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">Age {career.age}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">OVR {career.overall}</span>
      </div>
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
        <p className="text-xs text-amber-300">🎉 Massive morale boost! Your international journey begins.</p>
      </div>
      <Button onClick={onDismiss} className="w-full h-10 text-sm font-bold bg-amber-600 hover:bg-amber-500 text-white">
        Continue →
      </Button>
    </div>
  );
}

/* ─── World Cup Result Screen ─── */
function WorldCupResultCard({ wc, career, onDismiss }: { wc: WorldCupResult; career: CareerState; onDismiss: () => void }) {
  const isWinner = wc.result === "Winner";
  const didNotQualify = wc.result === "Did Not Qualify";
  const borderColor = isWinner ? "border-amber-400/60" : didNotQualify ? "border-red-500/40" : "border-blue-500/40";
  const bgGrad = isWinner ? "from-amber-500/15 to-transparent" : didNotQualify ? "from-red-500/10 to-transparent" : "from-blue-500/10 to-transparent";
  return (
    <div className={`rounded-xl border-2 ${borderColor} bg-gradient-to-b ${bgGrad} p-5 space-y-4`}>
      <div className="text-center space-y-2">
        <div className="text-4xl">{isWinner ? "🏆" : didNotQualify ? "😞" : "🌍"}</div>
        <h3 className="text-xl font-black">{isWinner ? "WORLD CUP WINNER!" : didNotQualify ? "World Cup Qualifiers" : `World Cup ${wc.year}`}</h3>
        <p className="text-sm font-bold">{getFlag(wc.nation)} {wc.nation} — {wc.result}</p>
        {didNotQualify && (
          <p className="text-xs text-muted-foreground">Your nation failed to qualify for the tournament this time.</p>
        )}
      </div>
      {!didNotQualify && (
        <>
          {/* Match results */}
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {wc.matches.map((m, i) => (
              <div key={i} className="flex items-center justify-between text-xs bg-muted/20 rounded-lg px-3 py-1.5">
                <span className="text-[10px] text-muted-foreground w-12">{m.round}</span>
                <span className={`font-semibold ${m.teamA === wc.nation ? "text-foreground" : "text-muted-foreground"}`}>
                  {getFlag(m.teamA)} {m.teamA}
                </span>
                <span className="font-black text-sm mx-2">{m.scoreA} - {m.scoreB}</span>
                <span className={`font-semibold ${m.teamB === wc.nation ? "text-foreground" : "text-muted-foreground"}`}>
                  {m.teamB} {getFlag(m.teamB)}
                </span>
              </div>
            ))}
          </div>
          {/* Player stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { l: "Apps", v: wc.playerApps },
              { l: "Goals", v: wc.playerGoals },
              { l: "Assists", v: wc.playerAssists },
              { l: "Avg Rating", v: wc.playerAvgRating.toFixed(1) },
            ].map(s => (
              <div key={s.l} className="text-center bg-muted/20 rounded-lg p-2">
                <div className="text-lg font-black">{s.v}</div>
                <div className="text-[9px] text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
          {wc.bestPlayer && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-center">
              <span className="text-sm font-bold">🌟 Named Best Player of the Tournament!</span>
            </div>
          )}
          {isWinner && (
            <div className="bg-amber-500/15 border border-amber-400/30 rounded-lg p-3 text-center">
              <span className="text-sm font-bold text-amber-300">🏆 WORLD CUP CHAMPION! Legacy cemented forever.</span>
            </div>
          )}
        </>
      )}
      <Button onClick={onDismiss} className={`w-full h-10 text-sm font-bold text-white ${isWinner ? "bg-amber-600 hover:bg-amber-500" : "bg-emerald-600 hover:bg-emerald-500"}`}>
        Continue →
      </Button>
    </div>
  );
}

/* ─── International Stats Panel ─── */
function InternationalStatsPanel({ career, onRetire }: { career: CareerState; onRetire: () => void }) {
  const is = career.intStats;
  if (!career.internationalCareer && !is.isRetired && is.caps === 0) return null;
  const isLegend = is.caps >= 100;
  return (
    <div className={`bg-card border rounded-xl p-4 space-y-3 ${isLegend ? "border-amber-500/30" : "border-border"}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {getFlag(career.nationality)} International Career {isLegend && "⭐ LEGEND"}
        </span>
        {is.isCaptain && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">©️ Captain</span>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { l: "Caps", v: is.caps },
          { l: "Goals", v: is.goals },
          { l: "Assists", v: is.assists },
        ].map(s => (
          <div key={s.l} className="text-center bg-muted/20 rounded-lg p-2">
            <div className="text-lg font-black">{s.v}</div>
            <div className="text-[9px] text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </div>
      {(is.worldCups > 0 || is.continentals > 0) && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {is.worldCups > 0 && <span>🌍 {is.worldCups} World Cup{is.worldCups > 1 ? "s" : ""} ({is.worldCupWins} won)</span>}
          {is.continentals > 0 && <span>🏆 {is.continentals} Continental ({is.continentalWins} won)</span>}
        </div>
      )}
      {is.isRetired && <div className="text-[11px] text-muted-foreground italic">Retired from international football</div>}
      {career.internationalCareer && !is.isRetired && (
        <Button variant="outline" onClick={onRetire} className="w-full h-8 text-xs">
          Retire from International Football 🚶
        </Button>
      )}
    </div>
  );
}

/* ─── Rivalry Event Card ─── */
function RivalryEventCard({ event, rival, career, onDismiss }: { event: RivalryEvent; rival: RivalPlayer; career: CareerState; onDismiss: () => void }) {
  return (
    <div className="rounded-xl border-2 border-orange-500/40 bg-gradient-to-b from-orange-500/10 to-transparent p-5 space-y-4">
      <div className="text-center space-y-2">
        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">😤 Rivalry Event</span>
        <div className="text-4xl">{event.emoji}</div>
        <h3 className="text-lg font-black">{event.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>
      </div>
      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-center">
        <p className="text-xs text-orange-300">⚡ {event.consequence}</p>
      </div>
      <div className="flex items-center justify-between bg-muted/20 rounded-lg p-3">
        <div className="text-center flex-1">
          <div className="text-sm font-bold">{career.playerName}</div>
          <div className="text-2xl font-black text-emerald-400">{career.overall}</div>
        </div>
        <div className="text-lg font-black text-muted-foreground">VS</div>
        <div className="text-center flex-1">
          <div className="text-sm font-bold">{rival.name}</div>
          <div className="text-2xl font-black text-orange-400">{rival.overall}</div>
        </div>
      </div>
      <Button onClick={onDismiss} className="w-full h-10 text-sm font-bold bg-orange-600 hover:bg-orange-500 text-white">
        Continue →
      </Button>
    </div>
  );
}

/* ─── Rival Comparison Panel ─── */
function RivalComparisonPanel({ career }: { career: CareerState }) {
  const rival = career.rival;
  if (!rival) return null;
  const totals = getCareerTotals(career.seasons);
  
  const rows = [
    { l: "Overall", p: career.overall, r: rival.overall },
    { l: "Career Goals", p: totals.goals, r: rival.careerGoals },
    { l: "Career Assists", p: totals.assists, r: rival.careerAssists },
    { l: "League Titles", p: totals.leagueTitles, r: rival.leagueTitles },
    { l: "UCL", p: totals.championsLeagues, r: rival.championsLeagues },
    { l: "Ballon d'Or", p: totals.ballonDors, r: rival.ballonDors },
    { l: "Market Value", p: career.marketValue, r: rival.marketValue },
  ];
  
  const playerWins = rows.filter(r => r.p > r.r).length;
  const rivalWins = rows.filter(r => r.r > r.p).length;
  const leader = playerWins > rivalWins ? "player" : playerWins < rivalWins ? "rival" : "tie";

  return (
    <div className={`bg-card border rounded-xl p-4 space-y-3 ${leader === "player" ? "border-emerald-500/30" : leader === "rival" ? "border-orange-500/30" : "border-border"}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">😤 Rivalry</span>
        {rival.retired && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground">Retired</span>}
      </div>
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="font-bold text-emerald-400">{career.playerName}</span>
        <span className="text-muted-foreground">vs</span>
        <span className="font-bold text-orange-400">{getFlag(rival.nationality)} {rival.name}</span>
      </div>
      <div className="text-[10px] text-center text-muted-foreground mb-1">
        {rival.club} · OVR {rival.overall} · Age {rival.age}
      </div>
      {rows.map(r => (
        <div key={r.l} className="flex items-center justify-between text-xs">
          <span className={`font-bold w-12 text-right ${r.p > r.r ? "text-emerald-400" : r.p < r.r ? "text-muted-foreground" : "text-foreground"}`}>
            {r.l === "Market Value" ? `€${(r.p as number).toFixed(0)}M` : r.p}
          </span>
          <span className="text-[10px] text-muted-foreground flex-1 text-center">{r.l}</span>
          <span className={`font-bold w-12 text-left ${r.r > r.p ? "text-orange-400" : r.r < r.p ? "text-muted-foreground" : "text-foreground"}`}>
            {r.l === "Market Value" ? `€${(r.r as number).toFixed(0)}M` : r.r}
          </span>
        </div>
      ))}
      <div className="text-center mt-2">
        <span className={`text-[11px] font-bold ${leader === "player" ? "text-emerald-400" : leader === "rival" ? "text-orange-400" : "text-muted-foreground"}`}>
          {leader === "player" ? "✅ You're ahead!" : leader === "rival" ? `❌ ${rival.name} leads` : "🤝 Dead even"}
        </span>
      </div>
    </div>
  );
}

/* ─── Rivalry Summary Card (End of Career) ─── */
function RivalrySummaryCard({ summary, career }: { summary: RivalrySummary; career: CareerState }) {
  const rival = career.rival;
  if (!rival) return null;
  const winnerColor = summary.overallWinner === "player" ? "border-emerald-500/50 from-emerald-500/10" : summary.overallWinner === "rival" ? "border-orange-500/50 from-orange-500/10" : "border-amber-500/50 from-amber-500/10";
  
  return (
    <div className={`rounded-xl border-2 ${winnerColor} bg-gradient-to-b to-transparent p-5 space-y-4`}>
      <div className="text-center space-y-2">
        <div className="text-4xl">{summary.overallWinner === "player" ? "👑" : summary.overallWinner === "rival" ? "😔" : "🤝"}</div>
        <h3 className="text-xl font-black">
          {summary.overallWinner === "player" ? "RIVALRY WON!" : summary.overallWinner === "rival" ? "RIVALRY LOST" : "RIVALRY TIED"}
        </h3>
        <p className="text-sm text-muted-foreground">{career.playerName} vs {rival.name} — Career Rivalry</p>
      </div>
      <div className="space-y-1.5">
        {summary.categories.map(c => (
          <div key={c.label} className="flex items-center justify-between text-xs bg-muted/20 rounded-lg px-3 py-1.5">
            <span className={`font-bold w-14 text-right ${c.winner === "player" ? "text-emerald-400" : "text-muted-foreground"}`}>{c.playerVal}</span>
            <span className="text-[10px] text-muted-foreground flex-1 text-center">{c.label}</span>
            <span className={`font-bold w-14 text-left ${c.winner === "rival" ? "text-orange-400" : "text-muted-foreground"}`}>{c.rivalVal}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-6 text-sm font-bold">
        <span className="text-emerald-400">{summary.playerWins} Won</span>
        <span className="text-muted-foreground">{summary.categories.length - summary.playerWins - summary.rivalWins} Tied</span>
        <span className="text-orange-400">{summary.rivalWins} Won</span>
      </div>
      <div className={`text-center text-xs ${summary.legacyBonus > 0 ? "text-emerald-400" : summary.legacyBonus < 0 ? "text-red-400" : "text-muted-foreground"}`}>
        Legacy bonus: {summary.legacyBonus > 0 ? "+" : ""}{summary.legacyBonus} points
      </div>
    </div>
  );
}

/* ─── Financial & Lifestyle Panel ─── */
function FinancialPanel({ career }: { career: CareerState }) {
  const lifestyleEmoji: Record<string, string> = {
    "Humble": "🏚️", "Comfortable": "🏡", "Wealthy": "🏰", "Superstar": "✨", "Billionaire": "👑",
  };
  const lifestyleColor: Record<string, string> = {
    "Humble": "text-muted-foreground", "Comfortable": "text-blue-400", "Wealthy": "text-emerald-400", "Superstar": "text-amber-400", "Billionaire": "text-yellow-300",
  };
  const nwColor = career.netWorth >= 50 ? "text-yellow-300" : career.netWorth >= 10 ? "text-emerald-400" : career.netWorth >= 1 ? "text-blue-400" : career.netWorth < 0 ? "text-red-400" : "text-muted-foreground";

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">💰 Finances & Lifestyle</span>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="text-center bg-muted/20 rounded-lg p-2">
          <div className={`text-lg font-black ${nwColor}`}>{formatNetWorth(career.netWorth)}</div>
          <div className="text-[9px] text-muted-foreground">Net Worth</div>
        </div>
        <div className="text-center bg-muted/20 rounded-lg p-2">
          <div className={`text-sm font-black ${lifestyleColor[career.lifestyleLevel]}`}>
            {lifestyleEmoji[career.lifestyleLevel]} {career.lifestyleLevel}
          </div>
          <div className="text-[9px] text-muted-foreground">Lifestyle</div>
        </div>
        <div className="text-center bg-muted/20 rounded-lg p-2">
          <div className="text-lg font-black text-blue-400">
            {formatFollowers(career.socialMediaFollowers)}
          </div>
          <div className="text-[9px] text-muted-foreground">📱 Followers</div>
        </div>
        <div className="text-center bg-muted/20 rounded-lg p-2">
          <div className="text-lg font-black text-emerald-400">{formatWage(career.weeklyWage)}</div>
          <div className="text-[9px] text-muted-foreground">Weekly Wage</div>
        </div>
      </div>

      {/* Financial details row */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
        {career.sponsorshipIncome > 0 && <span>🤝 Sponsor: €{career.sponsorshipIncome.toFixed(1)}M/yr</span>}
        {career.lifestyleCostPerYear > 0 && <span>💸 Costs: €{career.lifestyleCostPerYear.toFixed(1)}M/yr</span>}
        {career.agentFeesPaid > 0 && <span>🕴️ Agent fees: €{career.agentFeesPaid.toFixed(1)}M total</span>}
      </div>

      {/* Properties & Investments */}
      {(career.properties.length > 0 || career.investments.length > 0) && (
        <div className="flex items-center gap-2 text-[10px] flex-wrap">
          {career.properties.map((p, i) => (
            <span key={`p${i}`} className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">🏠 {p}</span>
          ))}
          {career.investments.map((inv, i) => (
            <span key={`i${i}`} className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">📈 {inv}</span>
          ))}
        </div>
      )}

      {/* Family Status */}
      {(career.family.isMarried || career.family.isDivorced || career.family.children > 0) && (
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          {career.family.isMarried && <span className="text-pink-400">💍 Married</span>}
          {career.family.isDivorced && <span className="text-red-400">💔 Divorced</span>}
          {career.family.children > 0 && <span>👶 {career.family.children} child{career.family.children > 1 ? "ren" : ""}</span>}
        </div>
      )}

      {/* Popularity & Morale bars */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-14">Morale</span>
          <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${career.morale >= 60 ? 'bg-emerald-500' : career.morale >= 30 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${career.morale}%` }} />
          </div>
          <span className="text-[10px] font-bold w-6 text-right">{career.morale}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-14">Popularity</span>
          <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${career.popularity}%` }} />
          </div>
          <span className="text-[10px] font-bold w-6 text-right">{career.popularity}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Ballon d'Or Ceremony Screen ─── */
function BallonDorCeremonyCard({ bdor, career, onDismiss }: { bdor: BallonDorResult; career: CareerState; onDismiss: () => void }) {
  const isWinner = bdor.playerRank === 1;
  const isPodium = bdor.playerRank !== null && bdor.playerRank <= 3;
  const isNominated = bdor.playerNominated;
  const borderColor = isWinner ? "border-amber-400/60" : isPodium ? "border-amber-500/30" : "border-border";
  const bgGrad = isWinner ? "from-amber-500/20 to-transparent" : isPodium ? "from-amber-500/10 to-transparent" : "from-transparent to-transparent";
  
  const rankEmoji = (rank: number) => rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`;
  
  return (
    <div className={`rounded-xl border-2 ${borderColor} bg-gradient-to-b ${bgGrad} p-5 space-y-4`}>
      <div className="text-center space-y-2">
        <div className="text-5xl">{isWinner ? "🏅" : "⭐"}</div>
        <h3 className="text-xl font-black tracking-tight">
          {isWinner ? "BALLON D'OR WINNER!" : `Ballon d'Or ${bdor.year}`}
        </h3>
        {isWinner && (
          <p className="text-sm text-amber-300 font-bold">The best player in the world! Legacy +20, Market Value +€15M</p>
        )}
        {!isWinner && isNominated && bdor.playerRank !== null && bdor.playerRank <= 3 && (
          <p className="text-sm text-muted-foreground">You finished {bdor.playerRank === 2 ? "2nd" : "3rd"}! Legacy +5</p>
        )}
        {!isWinner && isNominated && bdor.playerRank !== null && bdor.playerRank > 3 && (
          <p className="text-sm text-muted-foreground">You finished {bdor.playerRank}th — close but not enough this year</p>
        )}
        {!isNominated && (
          <p className="text-sm text-muted-foreground">You were not nominated this year</p>
        )}
      </div>
      
      {/* Top 10 nominees */}
      <div className="space-y-1">
        {bdor.nominees.map((n, i) => (
          <div key={i} className={`flex items-center justify-between text-xs rounded-lg px-2.5 py-1.5 ${
            n.isPlayer ? (i === 0 ? "bg-amber-500/20 border border-amber-500/30" : "bg-emerald-500/10 border border-emerald-500/20") : "bg-muted/20"
          }`}>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-sm font-black w-6 shrink-0">{rankEmoji(i + 1)}</span>
              <div className="min-w-0 flex-1">
                <span className={`font-bold truncate block text-[11px] ${n.isPlayer ? "text-foreground" : "text-muted-foreground"}`}>
                  {getFlag(n.nationality)} {n.name}
                </span>
                <span className="text-[9px] text-muted-foreground">{n.position} · {n.club}</span>
              </div>
            </div>
            <div className="text-right shrink-0 ml-1">
              <div className="font-bold text-[11px]">{n.points}pts</div>
              <div className="text-[9px] text-muted-foreground">{n.goals}G{n.trophies.length > 0 ? ` · ${n.trophies.join(", ")}` : ""}</div>
            </div>
          </div>
        ))}
      </div>
      
      <Button onClick={onDismiss} className={`w-full h-10 text-sm font-bold text-white ${isWinner ? "bg-amber-600 hover:bg-amber-500" : "bg-emerald-600 hover:bg-emerald-500"}`}>
        Continue →
      </Button>
    </div>
  );
}

/* ─── Retirement Ceremony Card ─── */
function RetirementCeremonyCard({ career, totals, onPostRetirement }: { career: CareerState; totals: ReturnType<typeof getCareerTotals>; onPostRetirement: (c: PostRetirementChoice) => void }) {
  const legacy = career.legacy!;
  const tierColors: Record<LegacyTier, string> = { "GOAT": "text-amber-400", "LEGEND": "text-purple-400", "GREAT": "text-emerald-400", "SOLID PRO": "text-blue-400", "JOURNEYMAN": "text-muted-foreground" };
  const tierEmoji: Record<LegacyTier, string> = { "GOAT": "🐐", "LEGEND": "🏛️", "GREAT": "⭐", "SOLID PRO": "💪", "JOURNEYMAN": "🎒" };
  
  // All clubs played for
  const clubHistory = career.seasons.filter(s => s.type === "playing").reduce<string[]>((acc, s) => {
    if (!acc.includes(s.club)) acc.push(s.club);
    return acc;
  }, []);

  return (
    <div className="rounded-xl border-2 border-amber-400/40 bg-gradient-to-b from-amber-500/10 to-transparent p-5 space-y-4">
      <div className="text-center space-y-2">
        <div className="text-5xl">👋</div>
        <h3 className="text-xl font-black tracking-tight">RETIREMENT</h3>
        <p className="text-sm text-muted-foreground">{getFlag(career.nationality)} {career.playerName} retires at age {career.age}</p>
      </div>

      {/* Career summary grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { l: "Apps", v: totals.apps }, { l: "Goals", v: totals.goals }, { l: "Assists", v: totals.assists },
          { l: "Trophies", v: totals.leagueTitles + totals.domesticCups + totals.championsLeagues + totals.worldCups },
          { l: "Ballon d'Or", v: totals.ballonDors }, { l: "Int'l Caps", v: career.intStats.caps },
        ].map(s => (
          <div key={s.l} className="bg-muted/20 rounded-lg p-2">
            <div className="text-lg font-black">{s.v}</div>
            <div className="text-[9px] text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Clubs played for */}
      <div className="text-center">
        <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Clubs</div>
        <div className="flex flex-wrap justify-center gap-1">
          {clubHistory.map(c => (
            <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/30 text-foreground">{c}</span>
          ))}
        </div>
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <div className="bg-muted/20 rounded-lg p-2">
          <div className="font-black text-emerald-400">{formatNetWorth(career.netWorth)}</div>
          <div className="text-[9px] text-muted-foreground">Net Worth</div>
        </div>
        <div className="bg-muted/20 rounded-lg p-2">
          <div className="font-black">{formatFollowers(career.socialMediaFollowers)}</div>
          <div className="text-[9px] text-muted-foreground">Followers</div>
        </div>
      </div>

      {/* Legacy score */}
      <div className="text-center space-y-1 py-2">
        <div className="text-3xl">{tierEmoji[legacy.tier]}</div>
        <div className={`text-2xl font-black ${tierColors[legacy.tier]}`}>{legacy.tier}</div>
        <div className="text-4xl font-black">{legacy.score}<span className="text-lg text-muted-foreground">/100</span></div>
      </div>

      {/* Post-retirement choices */}
      <div className="space-y-2">
        <div className="text-xs text-center text-muted-foreground font-bold uppercase">What's Next?</div>
        <Button onClick={() => onPostRetirement("retire")} className="w-full h-11 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white">
          🏖️ Retire and Enjoy Life
        </Button>
        <Button onClick={() => onPostRetirement("manager")} variant="outline" className="w-full h-11 text-sm font-bold">
          📋 Become a Manager
        </Button>
        <Button onClick={() => onPostRetirement("pundit")} variant="outline" className="w-full h-11 text-sm font-bold">
          🎙️ Become a TV Pundit (+5 Legacy)
        </Button>
      </div>
    </div>
  );
}

/* ─── Post-Retirement Card (unused since choices are in ceremony, but kept for direct phase) ─── */
function PostRetirementCard({ career, onChoice }: { career: CareerState; onChoice: (c: PostRetirementChoice) => void }) {
  return (
    <div className="rounded-xl border border-border p-5 space-y-3 text-center">
      <h3 className="text-lg font-black">What's Next?</h3>
      <Button onClick={() => onChoice("retire")} className="w-full h-11 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white">🏖️ Retire and Enjoy Life</Button>
      <Button onClick={() => onChoice("manager")} variant="outline" className="w-full h-11 text-sm font-bold">📋 Become a Manager</Button>
      <Button onClick={() => onChoice("pundit")} variant="outline" className="w-full h-11 text-sm font-bold">🎙️ Become a TV Pundit</Button>
    </div>
  );
}

/* ─── Manager Panel ─── */
function ManagerPanel({ manager, career, onAdvance, onEnd }: { manager: ManagerState; career: CareerState; onAdvance: () => void; onEnd: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-black">📋 Manager Career</h3>
        <p className="text-xs text-muted-foreground">Managing {manager.club} (Tier {manager.clubTier}) · Season {manager.season}</p>
      </div>

      {manager.seasonResults.length > 0 && (
        <div className="space-y-1">
          {manager.seasonResults.slice(-5).map((r, i) => (
            <div key={i} className="flex items-center justify-between text-xs bg-muted/20 rounded-lg px-3 py-1.5">
              <span className="text-muted-foreground">S{r.year}</span>
              <span className="font-semibold">{r.club}</span>
              <span className={`text-[10px] ${r.trophy ? "text-amber-400" : "text-muted-foreground"}`}>{r.result}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-muted/20 rounded-lg p-2">
          <div className="font-black">{manager.trophies}</div>
          <div className="text-[9px] text-muted-foreground">Trophies</div>
        </div>
        <div className="bg-muted/20 rounded-lg p-2">
          <div className="font-black">{manager.promotions}</div>
          <div className="text-[9px] text-muted-foreground">Promotions</div>
        </div>
        <div className="bg-muted/20 rounded-lg p-2">
          <div className="font-black">{manager.managingNationalTeam ? "Yes" : "No"}</div>
          <div className="text-[9px] text-muted-foreground">Nat'l Team</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Legacy Card (shown on final retirement screen) ─── */
function LegacyCard({ career, totals, onShare }: { career: CareerState; totals: ReturnType<typeof getCareerTotals>; onShare: () => void }) {
  if (!career.legacy) return null;
  const legacy = career.legacy;
  const tierColors: Record<LegacyTier, string> = { "GOAT": "text-amber-400", "LEGEND": "text-purple-400", "GREAT": "text-emerald-400", "SOLID PRO": "text-blue-400", "JOURNEYMAN": "text-muted-foreground" };
  const tierEmoji: Record<LegacyTier, string> = { "GOAT": "🐐", "LEGEND": "🏛️", "GREAT": "⭐", "SOLID PRO": "💪", "JOURNEYMAN": "🎒" };
  const tierBorder: Record<LegacyTier, string> = { "GOAT": "border-amber-400/50", "LEGEND": "border-purple-400/40", "GREAT": "border-emerald-400/40", "SOLID PRO": "border-blue-400/30", "JOURNEYMAN": "border-border" };

  const totalTrophies = totals.leagueTitles + totals.domesticCups + totals.championsLeagues + totals.worldCups;

  return (
    <div className={`rounded-xl border-2 ${tierBorder[legacy.tier]} bg-card p-5 space-y-4`}>
      <div className="text-center space-y-1">
        <div className="text-4xl">{tierEmoji[legacy.tier]}</div>
        <div className={`text-2xl font-black ${tierColors[legacy.tier]}`}>{legacy.tier}</div>
        <div className="text-4xl font-black">{legacy.score}<span className="text-base text-muted-foreground">/100</span></div>
        <p className="text-xs text-muted-foreground">{getFlag(career.nationality)} {career.playerName} · {career.position}</p>
      </div>

      {/* Breakdown */}
      <div className="space-y-1">
        {legacy.breakdown.filter(b => b.points > 0).map(b => (
          <div key={b.label} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{b.label}</span>
            <span className="font-bold text-foreground">+{b.points}</span>
          </div>
        ))}
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
        <div className="bg-muted/20 rounded-lg p-1.5">
          <div className="font-black text-sm">{totals.goals}</div>
          <div className="text-muted-foreground">Goals</div>
        </div>
        <div className="bg-muted/20 rounded-lg p-1.5">
          <div className="font-black text-sm">{totalTrophies}</div>
          <div className="text-muted-foreground">Trophies</div>
        </div>
        <div className="bg-muted/20 rounded-lg p-1.5">
          <div className="font-black text-sm">{totals.ballonDors}</div>
          <div className="text-muted-foreground">Ballon d'Or</div>
        </div>
        <div className="bg-muted/20 rounded-lg p-1.5">
          <div className="font-black text-sm">{career.intStats.caps}</div>
          <div className="text-muted-foreground">Caps</div>
        </div>
      </div>

      {/* Rival result */}
      {career.rivalrySummary && (
        <div className="text-center text-xs">
          <span className="text-muted-foreground">Rivalry vs {career.rival?.name}: </span>
          <span className={`font-bold ${career.rivalrySummary.overallWinner === "player" ? "text-emerald-400" : career.rivalrySummary.overallWinner === "rival" ? "text-red-400" : "text-amber-400"}`}>
            {career.rivalrySummary.overallWinner === "player" ? "YOU WON" : career.rivalrySummary.overallWinner === "rival" ? "RIVAL WON" : "DRAW"}
          </span>
        </div>
      )}

      {/* Pundit bonus */}
      {career.isPundit && (
        <div className="text-center text-xs text-muted-foreground">🎙️ TV Pundit career · Legacy +5</div>
      )}

      {/* Manager results */}
      {career.managerState && career.managerState.seasonResults.length > 0 && (
        <div className="text-center text-xs text-muted-foreground">
          📋 Manager: {career.managerState.trophies} trophies, {career.managerState.promotions} promotions in {career.managerState.season} seasons
        </div>
      )}

      <Button onClick={onShare} className="w-full h-10 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white">
        📤 Share Your Legacy
      </Button>
    </div>
  );
}

/* ─── Game Screen ─── */
function GameScreen({ career, clubs, onNextSeason, onAcceptOffer, onDismissSummary, onDismissNewspaper, onStay, onSignExtension, onRequestTransfer, onEventChoice, onDismissDebut, onDismissWorldCup, onRetireInternational, onDismissRivalryEvent, onDismissBallonDor, onManualRetire, onPostRetirement, onAdvanceManager, onEndManager, onShare, onNewCareer, timelineRef }: {
  career: CareerState;
  clubs: ClubData[];
  onNextSeason: () => void;
  onAcceptOffer: (offer: ContractOffer) => void;
  onDismissSummary: () => void;
  onDismissNewspaper: () => void;
  onStay: () => void;
  onSignExtension: () => void;
  onRequestTransfer: () => void;
  onEventChoice: (choiceIndex: number) => void;
  onDismissDebut: () => void;
  onDismissWorldCup: () => void;
  onRetireInternational: () => void;
  onDismissRivalryEvent: () => void;
  onDismissBallonDor: () => void;
  onManualRetire: () => void;
  onPostRetirement: (choice: PostRetirementChoice) => void;
  onAdvanceManager: () => void;
  onEndManager: () => void;
  onShare: () => void;
  onNewCareer: () => void;
  timelineRef: React.RefObject<HTMLDivElement>;
}) {
  const totals = getCareerTotals(career.seasons);
  const currentSeason = career.seasons[career.seasons.length - 1];

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

  const showActionButton = career.phase === "youth" || career.phase === "playing" || career.phase === "manager_season";

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
        <div className="flex items-center gap-3">
          <Button onClick={onNewCareer} variant="ghost" className="text-[10px] text-muted-foreground hover:text-red-400 px-2 h-7">
            🔄 New Career
          </Button>
          <div className="text-center">
            <div className={`text-3xl sm:text-4xl font-black ${career.overall >= 80 ? 'text-green-400' : career.overall >= 65 ? 'text-emerald-400' : career.overall >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
              {career.overall}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">OVR</div>
          </div>
        </div>
      </div>

      {/* FINAL SEASON BANNER */}
      {career.isFinalSeason && !career.retired && (
        <div className="bg-amber-500/15 border-2 border-amber-500/40 rounded-xl p-3 text-center animate-pulse">
          <span className="text-sm font-black text-amber-400 uppercase tracking-widest">⚠️ FINAL SEASON</span>
          <p className="text-[10px] text-muted-foreground mt-0.5">This will be your last season as a professional footballer</p>
        </div>
      )}

      {/* Main panels */}
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-3">
        {/* LEFT — Timeline */}
        <div className="bg-card border border-border rounded-xl overflow-hidden order-2 md:order-1">
          <div className="px-3 py-2 border-b border-border bg-muted/20">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Career Timeline</span>
          </div>
          <div ref={timelineRef} className="max-h-[280px] md:max-h-[480px] overflow-y-auto p-2 space-y-0.5 scrollbar-thin">
            {career.seasons.map((s, i) => (
              <TimelineEntry key={s.year + s.club} season={s} isCurrent={i === career.seasons.length - 1} isLast={i === career.seasons.length - 1} />
            ))}
          </div>
        </div>

        {/* RIGHT — Stats & Overlays */}
        <div className="space-y-3 order-1 md:order-2">

          {/* OVERLAY: Newspaper Articles */}
          {career.phase === "newspaper" && career.pendingNews.length > 0 && (
            <NewspaperCard articles={career.pendingNews} onContinue={onDismissNewspaper} />
          )}

          {/* OVERLAY: Season Summary */}
          {career.phase === "season_summary" && career.pendingSummary && (
            <SeasonSummaryCard season={career.pendingSummary} position={career.position} onContinue={onDismissSummary} />
          )}

          {/* OVERLAY: Contract Offers (youth → pro) */}
          {career.phase === "contract_offer" && career.pendingOffers.length > 0 && (
            <div className="space-y-3">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
                <h3 className="text-lg font-black">📩 Contract Offers</h3>
                <p className="text-xs text-muted-foreground mt-1">Choose a club to start your professional career</p>
              </div>
              {career.pendingOffers.map((offer) => (
                <OfferCard key={offer.club.name} offer={offer} onAccept={() => onAcceptOffer(offer)} />
              ))}
            </div>
          )}

          {/* OVERLAY: Random Events */}
          {career.phase === "random_events" && career.pendingEvents.length > 0 && (
            <RandomEventCard
              event={career.pendingEvents[0]}
              remaining={career.pendingEvents.length}
              onChoice={onEventChoice}
            />
          )}

          {/* OVERLAY: International Debut */}
          {career.phase === "international_debut" && (
            <InternationalDebutCard career={career} onDismiss={onDismissDebut} />
          )}

          {/* OVERLAY: World Cup */}
          {career.phase === "world_cup" && career.pendingWorldCup && (
            <WorldCupResultCard wc={career.pendingWorldCup} career={career} onDismiss={onDismissWorldCup} />
          )}

          {/* OVERLAY: Rivalry Event */}
          {career.phase === "rivalry_event" && career.pendingRivalryEvent && (
            <RivalryEventCard
              event={career.pendingRivalryEvent}
              rival={career.rival!}
              career={career}
              onDismiss={onDismissRivalryEvent}
            />
           )}

          {/* OVERLAY: Retirement Ceremony */}
          {career.phase === "retirement_ceremony" && career.legacy && (
            <RetirementCeremonyCard career={career} totals={totals} onPostRetirement={onPostRetirement} />
          )}

          {/* OVERLAY: Post-Retirement Choice */}
          {career.phase === "post_retirement" && (
            <PostRetirementCard career={career} onChoice={onPostRetirement} />
          )}

          {/* OVERLAY: Manager Season */}
          {career.phase === "manager_season" && career.managerState && (
            <ManagerPanel manager={career.managerState} career={career} onAdvance={onAdvanceManager} onEnd={onEndManager} />
          )}
          {career.phase === "ballon_dor" && career.pendingBallonDor && (
            <BallonDorCeremonyCard bdor={career.pendingBallonDor} career={career} onDismiss={onDismissBallonDor} />
          )}

          {/* OVERLAY: Transfer Window */}
          {career.phase === "transfer_window" && career.transferSituation && (
            <TransferWindowCard
              situation={career.transferSituation}
              career={career}
              onAcceptOffer={onAcceptOffer}
              onStay={onStay}
              onSignExtension={onSignExtension}
              onRequestTransfer={onRequestTransfer}
            />
          )}

          {/* Club card */}
          {(career.phase === "youth" || career.phase === "playing" || career.phase === "retired") && (
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-black shrink-0"
                style={{ backgroundColor: career.currentClubColor + "22", color: career.currentClubColor, border: `2px solid ${career.currentClubColor}44` }}>
                {career.currentClub.includes("Youth") ? "YA" : career.currentClub.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{getFlag(career.currentClubCountry)} {career.currentClub}</div>
                <div className="text-xs text-muted-foreground">
                  {career.retired ? "Retired" : career.phase === "youth" ? "Youth Academy" : `${career.currentLeague} · ${career.contractYearsLeft}yr left · ${formatWage(career.weeklyWage)} · €${career.marketValue >= 1 ? career.marketValue.toFixed(0) : career.marketValue.toFixed(1)}M`}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-black" style={{ color: career.currentClubColor }}>{career.position}</div>
                <div className="text-[10px] text-muted-foreground">{currentSeason.year}/{(currentSeason.year + 1).toString().slice(-2)}</div>
              </div>
            </div>
          )}

          {/* Financial & Lifestyle Panel */}
          {(career.phase === "youth" || career.phase === "playing" || career.phase === "retired") && (
            <FinancialPanel career={career} />
          )}

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
            <div className="grid grid-cols-5 gap-2 mt-3">
              {[
                { emoji: "🏆", l: "Leagues", v: totals.leagueTitles },
                { emoji: "🏆", l: "Cups", v: totals.domesticCups },
                { emoji: "⭐", l: "UCL", v: totals.championsLeagues },
                { emoji: "🌍", l: "World Cup", v: totals.worldCups },
                { emoji: "🏅", l: "Ballon d'Or", v: totals.ballonDors },
              ].map(t => (
                <div key={t.l} className={`text-center rounded-lg p-2 ${t.v > 0 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-muted/20 opacity-40'}`}>
                  <div className="text-lg">{t.emoji}</div>
                  <div className="text-sm font-black">{t.v}</div>
                  <div className="text-[9px] text-muted-foreground">{t.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* UCL Result (latest) */}
          {career.lastUCLResult && career.lastUCLResult.qualified && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">⭐ Champions League</span>
              <div className="text-xs text-muted-foreground text-center font-semibold">
                {career.lastUCLResult.result === "Winner" ? "🏆 WINNER!" : career.lastUCLResult.result}
                {career.lastUCLResult.isTopScorer && " · 👟 Top Scorer"}
              </div>
              <div className="space-y-1">
                {career.lastUCLResult.matches.map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-muted/20 rounded-lg px-3 py-1.5">
                    <span className="text-[10px] text-muted-foreground w-10">{m.round}</span>
                    <span className="font-semibold text-foreground">{career.currentClub}</span>
                    <span className="font-black mx-2">{m.goalsFor} - {m.goalsAgainst}</span>
                    <span className="text-muted-foreground">{m.opponent}</span>
                    <span className={`text-[10px] ml-1 ${m.won ? "text-emerald-400" : "text-red-400"}`}>{m.won ? "W" : "L"}</span>
                  </div>
                ))}
              </div>
              {career.lastUCLResult.playerGoals > 0 && (
                <div className="text-[10px] text-center text-muted-foreground">
                  ⚽ {career.lastUCLResult.playerGoals} goal{career.lastUCLResult.playerGoals > 1 ? "s" : ""} in tournament
                </div>
              )}
            </div>
          )}

          {/* Awards */}
          {career.awards.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">🏆 Awards</span>
              <div className="flex flex-wrap gap-1.5">
                {(() => {
                  // Group awards by name and count them
                  const awardCounts: Record<string, { emoji: string; count: number }> = {};
                  career.awards.forEach(a => {
                    if (!awardCounts[a.name]) awardCounts[a.name] = { emoji: a.emoji, count: 0 };
                    awardCounts[a.name].count += 1;
                  });
                  return Object.entries(awardCounts).map(([name, { emoji, count }]) => (
                    <span key={name} className="text-[10px] px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 font-semibold">
                      {emoji} {name} {count > 1 ? `×${count}` : ""}
                    </span>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* International Stats */}
          <InternationalStatsPanel career={career} onRetire={onRetireInternational} />

          {/* Rival Comparison */}
          <RivalComparisonPanel career={career} />

          {/* Rivalry Summary (on retirement) */}
          {career.retired && career.rivalrySummary && (
            <RivalrySummaryCard summary={career.rivalrySummary} career={career} />
          )}
        </div>
      </div>

      {/* Events log */}
      {career.events.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Latest Events</span>
          <div className="mt-2 space-y-1">
            {career.events.slice(-3).map((e, i) => (
              <div key={i} className="text-xs text-foreground/80 flex items-start gap-2">
                <span className="shrink-0">›</span><span>{e}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-3">
        {career.phase === "retired" ? (
          <div className="flex-1 flex gap-2">
            <Button onClick={onShare} variant="outline" className="flex-1 h-12 text-sm font-bold">
              📤 Share Legacy
            </Button>
            <Button onClick={onNewCareer} className="flex-1 h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-white">
              ⚽ New Career
            </Button>
          </div>
        ) : career.phase === "manager_season" ? (
          <div className="flex-1 flex gap-2">
            <Button onClick={onAdvanceManager} className="flex-1 h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
              Next Manager Season <ChevronRight className="w-5 h-5" />
            </Button>
            <Button onClick={onEndManager} variant="outline" className="h-12 text-sm font-bold">
              Retire
            </Button>
          </div>
        ) : showActionButton ? (
          <div className="flex-1 flex gap-2">
            <Button onClick={onNextSeason} className="flex-1 h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
              {career.phase === "youth" ? "Next Year" : "Next Season"} <ChevronRight className="w-5 h-5" />
            </Button>
            {career.phase === "playing" && career.age >= 30 && (
              <Button onClick={onManualRetire} variant="outline" className="h-12 text-xs font-bold text-red-400 border-red-400/30 hover:bg-red-500/10">
                Retire
              </Button>
            )}
          </div>
        ) : null}
        <div className="bg-card border border-border rounded-xl px-4 py-2 text-center shrink-0">
          <div className="text-lg font-black">{career.age}</div>
          <div className="text-[9px] text-muted-foreground uppercase">Age</div>
        </div>
      </div>

      {/* Legacy card (shown when retired) */}
      {career.phase === "retired" && career.legacy && (
        <LegacyCard career={career} totals={totals} onShare={onShare} />
      )}
    </div>
  );
}
