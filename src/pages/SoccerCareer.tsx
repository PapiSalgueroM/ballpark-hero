import { useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { GameNavbar } from "@/components/game/GameNavbar";
import { Footer } from "@/components/game/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { toast } from "sonner";
import { User, Zap, Target, Wind, Shield, Dumbbell, Eye } from "lucide-react";

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
  { value: "GK", label: "Goalkeeper (GK)" },
  { value: "CB", label: "Centre Back (CB)" },
  { value: "LB", label: "Left Back (LB)" },
  { value: "RB", label: "Right Back (RB)" },
  { value: "CDM", label: "Defensive Mid (CDM)" },
  { value: "CM", label: "Central Mid (CM)" },
  { value: "CAM", label: "Attacking Mid (CAM)" },
  { value: "LW", label: "Left Wing (LW)" },
  { value: "RW", label: "Right Wing (RW)" },
  { value: "ST", label: "Striker (ST)" },
];

const ERAS = [
  { value: "1990s", label: "1990s", startYear: 1990 },
  { value: "2000s", label: "2000s", startYear: 2000 },
  { value: "2010s", label: "2010s", startYear: 2010 },
  { value: "2020s", label: "Modern (2020s)", startYear: 2020 },
];

type Stats = {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  reflexes: number;
};

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

function generateStats(position: string): Stats {
  const base = (): Stats => ({
    pace: rand(45, 62),
    shooting: rand(45, 62),
    passing: rand(45, 62),
    dribbling: rand(45, 62),
    defending: rand(45, 62),
    physical: rand(45, 62),
    reflexes: rand(45, 62),
  });

  const s = base();

  // Position-based boosts
  switch (position) {
    case "GK":
      s.reflexes = rand(55, 62);
      s.shooting = rand(20, 35);
      s.defending = rand(50, 60);
      break;
    case "CB":
      s.defending = rand(55, 62);
      s.physical = rand(52, 62);
      s.pace = rand(42, 55);
      break;
    case "LB":
    case "RB":
      s.pace = rand(52, 62);
      s.defending = rand(50, 60);
      break;
    case "CDM":
      s.defending = rand(52, 62);
      s.passing = rand(50, 60);
      s.physical = rand(50, 60);
      break;
    case "CM":
      s.passing = rand(52, 62);
      s.dribbling = rand(48, 58);
      break;
    case "CAM":
      s.passing = rand(52, 62);
      s.dribbling = rand(52, 62);
      s.shooting = rand(48, 58);
      break;
    case "LW":
    case "RW":
      s.pace = rand(55, 62);
      s.dribbling = rand(52, 62);
      break;
    case "ST":
      s.shooting = rand(55, 62);
      s.pace = rand(50, 60);
      s.physical = rand(48, 58);
      break;
  }

  return s;
}

function calcOverall(stats: Stats, position: string): number {
  if (position === "GK") {
    return Math.round(
      (stats.reflexes * 0.3 + stats.defending * 0.2 + stats.physical * 0.2 +
        stats.pace * 0.1 + stats.passing * 0.1 + stats.dribbling * 0.05 + stats.shooting * 0.05)
    );
  }
  return Math.round(
    (stats.pace + stats.shooting + stats.passing + stats.dribbling + stats.defending + stats.physical) / 6
  );
}

const STAT_CONFIG = [
  { key: "pace" as const, label: "Pace", icon: Wind, color: "from-green-500 to-emerald-600" },
  { key: "shooting" as const, label: "Shooting", icon: Target, color: "from-red-500 to-rose-600" },
  { key: "passing" as const, label: "Passing", icon: Zap, color: "from-blue-500 to-indigo-600" },
  { key: "dribbling" as const, label: "Dribbling", icon: User, color: "from-yellow-500 to-amber-600" },
  { key: "defending" as const, label: "Defending", icon: Shield, color: "from-purple-500 to-violet-600" },
  { key: "physical" as const, label: "Physical", icon: Dumbbell, color: "from-orange-500 to-red-600" },
  { key: "reflexes" as const, label: "Reflexes", icon: Eye, color: "from-cyan-500 to-teal-600" },
];

function StatBar({ label, value, icon: Icon, color, show }: {
  label: string; value: number; icon: React.ElementType; color: string; show: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 ${show ? '' : 'opacity-40'}`}>
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-sm w-20 text-muted-foreground">{label}</span>
      <div className="flex-1 h-3 rounded-full bg-muted/30 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-sm font-bold w-8 text-right">{value}</span>
    </div>
  );
}

export default function SoccerCareer() {
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [nationality, setNationality] = useState("");
  const [position, setPosition] = useState("");
  const [era, setEra] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [overall, setOverall] = useState(0);
  const [saving, setSaving] = useState(false);
  const [careerStarted, setCareerStarted] = useState(false);

  const isFormValid = playerName.trim().length > 0 && nationality && position && era;

  const handlePositionChange = useCallback((pos: string) => {
    setPosition(pos);
    const s = generateStats(pos);
    setStats(s);
    setOverall(calcOverall(s, pos));
  }, []);

  const handleBeginCareer = async () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    if (!stats || !isFormValid) return;

    setSaving(true);
    const eraData = ERAS.find((e) => e.value === era);
    const startYear = eraData?.startYear ?? 2020;

    const { error } = await supabase.from("soccer_careers" as any).insert({
      user_id: user.id,
      player_name: playerName.trim(),
      nationality,
      position,
      starting_era: era,
      age: 16,
      current_club: "Youth Academy",
      pace: stats.pace,
      shooting: stats.shooting,
      passing: stats.passing,
      dribbling: stats.dribbling,
      defending: stats.defending,
      physical: stats.physical,
      reflexes: stats.reflexes,
      overall_rating: overall,
      season_year: startYear,
      career_history: [],
      is_active: true,
    });

    setSaving(false);
    if (error) {
      toast.error("Failed to save career. Please try again.");
      console.error(error);
      return;
    }
    setCareerStarted(true);
    toast.success("Career created! Your journey begins at the Youth Academy.");
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

        <main className="flex-1 w-full max-w-xl mx-auto px-4 py-6 space-y-6">
          {!careerStarted ? (
            <>
              {/* Title */}
              <div className="text-center space-y-2">
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                  ⚽ Soccer Career
                </h1>
                <p className="text-muted-foreground text-sm">
                  Create your player. Start at a youth academy. Build your legend.
                </p>
              </div>

              {/* Character Creation Form */}
              <div className="space-y-5 bg-card border border-border rounded-xl p-5">
                <h2 className="text-lg font-bold">Create Your Player</h2>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="player-name">Player Name</Label>
                  <Input
                    id="player-name"
                    placeholder="Enter your player name..."
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={40}
                    className="bg-muted/30"
                  />
                </div>

                {/* Nationality */}
                <div className="space-y-2">
                  <Label>Nationality</Label>
                  <Select value={nationality} onValueChange={setNationality}>
                    <SelectTrigger className="bg-muted/30">
                      <SelectValue placeholder="Choose your nationality" />
                    </SelectTrigger>
                    <SelectContent>
                      {NATIONALITIES.map((n) => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Position */}
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Select value={position} onValueChange={handlePositionChange}>
                    <SelectTrigger className="bg-muted/30">
                      <SelectValue placeholder="Choose your position" />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Era */}
                <div className="space-y-2">
                  <Label>Starting Era</Label>
                  <Select value={era} onValueChange={setEra}>
                    <SelectTrigger className="bg-muted/30">
                      <SelectValue placeholder="Choose your era" />
                    </SelectTrigger>
                    <SelectContent>
                      {ERAS.map((e) => (
                        <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Stats Preview */}
              {stats && (
                <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">Starting Stats</h2>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">OVR</span>
                      <span className={`text-2xl font-black ${overall >= 55 ? 'text-green-400' : overall >= 50 ? 'text-yellow-400' : 'text-orange-400'}`}>
                        {overall}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {STAT_CONFIG.map((sc) => (
                      <StatBar
                        key={sc.key}
                        label={sc.label}
                        value={stats[sc.key]}
                        icon={sc.icon}
                        color={sc.color}
                        show={sc.key !== "reflexes" ? position !== "GK" || sc.key !== "shooting" : position === "GK"}
                      />
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    Age 16 · Youth Academy · {nationality}
                  </p>
                </div>
              )}

              {/* Begin Career Button */}
              <Button
                onClick={handleBeginCareer}
                disabled={!isFormValid || saving}
                className="w-full h-12 text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white disabled:opacity-40"
              >
                {saving ? "Creating..." : "⚽ Begin Career"}
              </Button>

              {!user && (
                <p className="text-xs text-muted-foreground text-center">
                  You'll need to sign in to save your career
                </p>
              )}
            </>
          ) : (
            /* Career Started - Placeholder for game loop */
            <div className="text-center space-y-6 py-12">
              <div className="text-6xl">⚽</div>
              <h2 className="text-2xl font-black">Career Created!</h2>
              <div className="bg-card border border-border rounded-xl p-5 space-y-3 text-left">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Player</span>
                  <span className="font-bold">{playerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Position</span>
                  <span className="font-bold">{position}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nationality</span>
                  <span className="font-bold">{nationality}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Overall</span>
                  <span className="font-bold">{overall} OVR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Club</span>
                  <span className="font-bold">Youth Academy</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Age</span>
                  <span className="font-bold">16</span>
                </div>
              </div>
              <p className="text-muted-foreground text-sm">
                Career simulation coming soon — your progress has been saved!
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setCareerStarted(false);
                  setStats(null);
                  setPlayerName("");
                  setNationality("");
                  setPosition("");
                  setEra("");
                }}
              >
                Create Another Player
              </Button>
            </div>
          )}
        </main>

        <Footer />
      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}
