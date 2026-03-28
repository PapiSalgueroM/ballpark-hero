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
  initCareer, advanceYouthYear, acceptOffer, advanceProSeason,
  dismissSummary, stayAtClub, signExtension, requestTransfer, applyEventChoice,
  dismissDebut, dismissWorldCup, retireFromInternational, dismissRivalryEvent,
  getCareerTotals, getFlag, calcOverall, formatWage,
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
  const trophies = [season.leagueTitle && "🏆", season.championsLeague && "⭐", season.worldCup && "🌍", season.ballonDor && "🏅"].filter(Boolean);

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

/* ─── Season Summary Card ─── */
function SeasonSummaryCard({ season, position, onContinue }: { season: SeasonRecord; position: string; onContinue: () => void }) {
  const isGK = position === "GK";
  const trophies = [season.leagueTitle && "🏆 League", season.championsLeague && "⭐ UCL", season.worldCup && "🌍 World Cup", season.ballonDor && "🏅 Ballon d'Or"].filter(Boolean);

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
  const [career, setCareer] = useState<CareerState | null>(null);
  const [clubs, setClubs] = useState<ClubData[]>([]);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Load clubs from Supabase
  useEffect(() => {
    supabase.from("soccer_career_clubs" as any).select("*").then(({ data }) => {
      if (data) setClubs(data as unknown as ClubData[]);
    });
  }, []);

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
    if (!previewStats || !isFormValid || clubs.length === 0) return;
    const startYear = ERAS.find(e => e.value === era)?.startYear ?? 2020;
    const newCareer = initCareer(playerName.trim(), nationality, position, era, previewStats, previewOvr, startYear, clubs);
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

  const handleNewCareer = () => {
    setCareer(null);
    setPreviewStats(null);
    setPlayerName(""); setNationality(""); setPosition(""); setEra("");
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
            />
          ) : (
            <GameScreen
              career={career}
              clubs={clubs}
              onNextSeason={handleNextSeason}
              onAcceptOffer={handleAcceptOffer}
              onDismissSummary={handleDismissSummary}
              onStay={handleStay}
              onSignExtension={handleSignExtension}
              onRequestTransfer={handleRequestTransfer}
              onEventChoice={handleEventChoice}
              onDismissDebut={handleDismissDebut}
              onDismissWorldCup={handleDismissWorldCup}
              onRetireInternational={handleRetireInternational}
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

/* ─── Creation Screen ─── */
function CreationScreen({ playerName, setPlayerName, nationality, setNationality, position, handlePositionChange, era, setEra, previewStats, previewOvr, isFormValid, saving, user, onBegin, onShowAuth }: any) {
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

      <Button onClick={onBegin} disabled={!isFormValid || saving}
        className="w-full h-12 text-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40">
        {saving ? "Creating..." : "⚽ Begin Career"}
      </Button>
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
  const borderColor = isWinner ? "border-amber-400/60" : "border-blue-500/40";
  const bgGrad = isWinner ? "from-amber-500/15 to-transparent" : "from-blue-500/10 to-transparent";
  return (
    <div className={`rounded-xl border-2 ${borderColor} bg-gradient-to-b ${bgGrad} p-5 space-y-4`}>
      <div className="text-center space-y-2">
        <div className="text-4xl">{isWinner ? "🏆" : "🌍"}</div>
        <h3 className="text-xl font-black">{isWinner ? "WORLD CUP WINNER!" : `World Cup ${wc.year}`}</h3>
        <p className="text-sm font-bold">{getFlag(wc.nation)} {wc.nation} — {wc.result}</p>
      </div>
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
      <Button onClick={onDismiss} className={`w-full h-10 text-sm font-bold text-white ${isWinner ? "bg-amber-600 hover:bg-amber-500" : "bg-blue-600 hover:bg-blue-500"}`}>
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

/* ─── Game Screen ─── */
function GameScreen({ career, clubs, onNextSeason, onAcceptOffer, onDismissSummary, onStay, onSignExtension, onRequestTransfer, onEventChoice, onDismissDebut, onDismissWorldCup, onRetireInternational, onNewCareer, timelineRef }: {
  career: CareerState;
  clubs: ClubData[];
  onNextSeason: () => void;
  onAcceptOffer: (offer: ContractOffer) => void;
  onDismissSummary: () => void;
  onStay: () => void;
  onSignExtension: () => void;
  onRequestTransfer: () => void;
  onEventChoice: (choiceIndex: number) => void;
  onDismissDebut: () => void;
  onDismissWorldCup: () => void;
  onRetireInternational: () => void;
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

  const showActionButton = career.phase === "youth" || career.phase === "playing";

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

          {/* International Stats */}
          <InternationalStatsPanel career={career} onRetire={onRetireInternational} />
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
          <Button onClick={onNewCareer} className="flex-1 h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-white">
            ⚽ New Career
          </Button>
        ) : showActionButton ? (
          <Button onClick={onNextSeason} className="flex-1 h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
            {career.phase === "youth" ? "Next Year" : "Next Season"} <ChevronRight className="w-5 h-5" />
          </Button>
        ) : null}
        <div className="bg-card border border-border rounded-xl px-4 py-2 text-center shrink-0">
          <div className="text-lg font-black">{career.age}</div>
          <div className="text-[9px] text-muted-foreground uppercase">Age</div>
        </div>
      </div>
    </div>
  );
}
