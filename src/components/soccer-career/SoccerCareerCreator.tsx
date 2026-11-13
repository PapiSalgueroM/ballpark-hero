import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FlagImg } from "@/components/FlagImg";
import AppearanceBuilder from "@/components/soccer-career/AppearanceBuilder";
import { CentreMountBoundary } from "@/components/soccer-career/SoccerCareerOverlays";
import { useAuth } from "@/contexts/AuthContext";
import { useRevealScroll } from "@/hooks/useRevealScroll";
import { groupByConfederation } from "@/lib/confederationGroups";
import { attrTreeFor, deriveAttributes, defaultPhysique, POSITION_OFFSETS, type AttrShape, type PlayerPhysique } from "@/lib/soccerCareerAttributes";
import { defaultAppearance, type PlayerAppearance } from "@/lib/soccerCareerAppearance";
import type { ClubData } from "@/lib/soccerCareerEngine";

const BuildEditor = lazy(() => import("@/components/soccer-career/SoccerCareerBuildEditor"));

export type CareerCreationSupport = {
  clubs: ClubData[];
  getYouthAcademyClub: typeof import("@/lib/soccerCareerEngine").getYouthAcademyClub;
  adjustClubsForYear: typeof import("@/lib/careerEras").adjustClubsForYear;
  rollStartingOverall: typeof import("@/lib/careerEras").rollStartingOverall;
  rollPotential: typeof import("@/lib/careerEras").rollPotential;
  potentialTier: typeof import("@/lib/careerEras").potentialTier;
  playsLike: typeof import("@/lib/careerEras").playsLike;
  leagueSeasonLine: typeof import("@/lib/soccerCareerLeague").leagueSeasonLine;
};

export type SoccerCareerDraft = {
  playerName: string; nationality: string; position: string; era: string;
  stats: Stats; overall: number; potential?: number; startYear: number; clubs: ClubData[];
  appearance: PlayerAppearance; physique: PlayerPhysique; attrShape: AttrShape; academyPreview: string | null;
};

const NATIONALITIES = [
  "Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan",
  "Bahrain","Belarus","Belgium","Benin","Bolivia","Bosnia & Herzegovina","Brazil","Bulgaria",
  "Burkina Faso","Cameroon","Canada","Cape Verde","Chile","China","Colombia","Comoros",
  "Congo","Costa Rica","Croatia","Cuba","Curaçao","Cyprus","Czech Republic","DR Congo",
  "Denmark","Dominican Republic","Ecuador","Egypt","El Salvador","England","Estonia",
  "Ethiopia","Faroe Islands","Finland","France","Gabon","Georgia","Germany","Ghana",
  "Greece","Guatemala","Guinea","Guinea-Bissau","Haiti","Honduras","Hungary","Iceland",
  "India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Ivory Coast","Jamaica",
  "Japan","Jordan","Kazakhstan","Kenya","Kosovo","Kuwait","Latvia","Lebanon","Liberia",
  "Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Mali","Malta","Mexico",
  "Moldova","Montenegro","Morocco","Mozambique","Netherlands","New Zealand","Nigeria",
  "North Korea","North Macedonia","Northern Ireland","Norway","Oman","Panama","Paraguay",
  "Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Saudi Arabia",
  "Scotland","Senegal","Serbia","Sierra Leone","Slovakia","Slovenia","South Africa",
  "South Korea","Spain","Suriname","Sweden","Switzerland","Tajikistan","Tanzania",
  "Thailand","The Gambia","Togo","Trinidad and Tobago","Tunisia","Turkey","Uganda",
  "Ukraine","United Arab Emirates","Uruguay","USA","Uzbekistan","Venezuela","Vietnam",
  "Wales","Zambia","Zimbabwe",
];
export const POSITIONS = [
  { value: "GK", label: "Goalkeeper (GK)" }, { value: "CB", label: "Centre Back (CB)" },
  { value: "LB", label: "Left Back (LB)" }, { value: "RB", label: "Right Back (RB)" },
  { value: "CDM", label: "Defensive Mid (CDM)" }, { value: "CM", label: "Central Mid (CM)" },
  { value: "CAM", label: "Attacking Mid (CAM)" }, { value: "LW", label: "Left Wing (LW)" },
  { value: "RW", label: "Right Wing (RW)" }, { value: "ST", label: "Striker (ST)" },
];
/* Round 302, off the owner's tweaks document ("eras 2015/16, 2010/11, 05/06
   plus more eras"): the engine has modeled eight half decade windows since the
   era system landed, but this picker only exposed four decade starts, so a
   2005 or 2015 kickoff was unreachable. Every row below maps onto one of the
   eight ERA_DEFS windows in careerEras.ts, and simCareerEras keeps that true.
   Old values ("1990s" etc) only ever lived in creation screen state, never in
   a save, so renaming them breaks nothing. */
const ERAS = [
  { value: "1990-94", label: "Early 90s (1990 start)", startYear: 1990 },
  { value: "1995-99", label: "Late 90s (1995 start)", startYear: 1995 },
  { value: "2000-04", label: "Early 2000s (2000 start)", startYear: 2000 },
  { value: "2005-09", label: "Late 2000s (2005 start)", startYear: 2005 },
  { value: "2010-14", label: "Early 2010s (2010 start)", startYear: 2010 },
  { value: "2015-19", label: "Late 2010s (2015 start)", startYear: 2015 },
  { value: "2020-24", label: "2020s (2020 start)", startYear: 2020 },
  { value: "2025", label: "2025 start", startYear: 2025 },
  { value: "2026", label: "Current era (2026 start)", startYear: 2026 },
];

type Stats = { pace: number; shooting: number; passing: number; dribbling: number; defending: number; physical: number; reflexes: number };

function generateStatsFromOverall(overall: number, position: string): Stats {
  /* Round 131: the offsets moved into soccerCareerAttributes because the
     engine now needs the same table to work out what a neutral player at this
     overall looks like. One copy, imported in both places, so the reference
     the season maths measures a build against can never drift from the line
     the creation screen hands out. */
  const o = POSITION_OFFSETS[position] || [0, 0, 0, 0, 0, 0, 0];
  const clamp = (v: number) => Math.max(25, Math.min(99, v));
  const vals = o.map(off => clamp(overall + off));

  // Adjust so the average equals exactly the rolled overall
  let avg = Math.round(vals.reduce((a, b) => a + b, 0) / 7);
  while (avg !== overall) {
    if (avg < overall) {
      // Find the largest stat that can go up
      let idx = vals.indexOf(Math.max(...vals.filter(v => v < 99)));
      if (idx === -1) idx = 0;
      vals[idx] = Math.min(99, vals[idx] + 1);
    } else {
      // Find the largest stat that can go down
      let idx = vals.indexOf(Math.max(...vals.filter(v => v > 25)));
      if (idx === -1) idx = 0;
      vals[idx] = Math.max(25, vals[idx] - 1);
    }
    avg = Math.round(vals.reduce((a, b) => a + b, 0) / 7);
  }

  const s: Stats = { pace: vals[0], shooting: vals[1], passing: vals[2], dribbling: vals[3], defending: vals[4], physical: vals[5], reflexes: vals[6] };
  return s;
}

/* ─── Position-specific attribute display ───

   Round 131 rebuilt this. It used to hand back six hardcoded rows per position
   group with labels invented on the spot, so a midfielder's "Dribbling" bar
   was secretly reading his shooting stat and his "Composure" bar was reading
   his reflexes, which for an outfielder is a number nothing else in the game
   touches. It looked like six attributes and it was six mislabelled ones.

   Now it reads the real family list for the position and, under each family,
   names the specific attribute that stands out. Still six rows, because a
   phone screen is a phone screen and the tile rule is the tile rule, but every
   row is honest and the whole tree is one tap away on its own screen. */
type AttrHolder = {
  pace: number; shooting: number; passing: number; dribbling: number;
  defending: number; physical: number; reflexes: number;
  position?: string; physique?: PlayerPhysique | null; attrShape?: AttrShape | null;
};

export const FAMILY_COLORS: Record<string, string> = {
  pace: "bg-emerald-500",
  shooting: "bg-red-500",
  passing: "bg-blue-500",
  dribbling: "bg-yellow-500",
  defending: "bg-purple-500",
  physical: "bg-orange-500",
  reflexes: "bg-cyan-500",
};

export function getPositionStatBars(pos: string, s: AttrHolder) {
  const derived = deriveAttributes(s, pos, s.physique, s.attrShape);
  return attrTreeFor(pos).map(fam => {
    const kids = derived.filter(d => d.family === fam.key);
    let top = kids[0];
    for (const k of kids) if (k.value > top.value) top = k;
    return {
      l: fam.label,
      v: Math.round((s as any)[fam.key]) || 0,
      c: FAMILY_COLORS[fam.key] || "bg-emerald-500",
      top: top ? `${top.label} ${top.value}` : "",
    };
  });
}

/* ─── Stat Bar ─── */
export function StatBarGame({ label, value, color, top }: { label: string; value: number; color: string; top?: string }) {
  const rc = value >= 80 ? "text-green-400" : value >= 65 ? "text-emerald-400" : value >= 50 ? "text-yellow-400" : "text-red-400";
  return (
    <div className="flex items-center gap-2">
      <span className="w-[5.5rem] shrink-0 min-w-0">
        <span className="block text-xs text-muted-foreground truncate">{label}</span>
        {top && <span className="block text-[9px] text-muted-foreground/70 truncate">{top}</span>}
      </span>
      <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${value}%` }} />
      </div>
      <span className={`text-xs font-bold w-6 text-right ${rc}`}>{value}</span>
    </div>
  );
}

function getOverallTier(ovr: number): { label: string; color: string; bgColor: string } {
  if (ovr >= 66) return { label: "Exceptional: Born Winner", color: "text-purple-400", bgColor: "bg-purple-500/15 border-purple-500/30" };
  if (ovr >= 62) return { label: "Gifted: High Ceiling", color: "text-amber-400", bgColor: "bg-amber-500/15 border-amber-500/30" };
  if (ovr >= 58) return { label: "Solid Foundation: Good Potential", color: "text-emerald-400", bgColor: "bg-emerald-500/15 border-emerald-500/30" };
  if (ovr >= 40) return { label: "Promising: Hard Work Ahead", color: "text-blue-400", bgColor: "bg-blue-500/15 border-blue-500/30" };
  return { label: "Raw Talent: Rough Around the Edges", color: "text-muted-foreground", bgColor: "bg-muted/20 border-border" };
}

/* ─── Round 131: every number, on its own screen ───
   The career page shows six family bars because that is what fits on a phone.
   This is where the rest of it lives: the specifics under each family with
   their real values, the frame that is pushing some of them around, and the
   plain english summary of what the whole build is worth in a season. One tap
   in, one tap back, nothing stacked under anything else. */

/* ─── Creation Screen ─── */
export function SoccerCareerCreator({ onBegin, initialSupport, loadSupport }: {
  onBegin: (draft: SoccerCareerDraft) => void;
  initialSupport?: CareerCreationSupport;
  loadSupport?: () => Promise<CareerCreationSupport>;
}) {
  const { user } = useAuth();
  const [playerName, setPlayerName] = useState("");
  const [nationality, setNationality] = useState("");
  const [position, setPosition] = useState("");
  const [era, setEra] = useState("");
  const [previewStats, setPreviewStats] = useState<Stats | null>(null);
  const [appearance, setAppearance] = useState(() => defaultAppearance());
  const [physique, setPhysique] = useState(() => defaultPhysique("ST"));
  const [attrShape, setAttrShape] = useState<AttrShape>({});
  const [support, setSupport] = useState(initialSupport);
  const [clubsLoading, setClubsLoading] = useState(false);
  const [clubsError, setClubsError] = useState(false);
  const loadGeneration = useRef(0);
  const [rolledOvr, setRolledOvr] = useState<number | null>(null);
  const [rolledPot, setRolledPot] = useState<number | null>(null);
  const [rollCount, setRollCount] = useState(0);
  const [bestPotSeen, setBestPotSeen] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [displayOvr, setDisplayOvr] = useState(0);
  const [academyClub, setAcademyClub] = useState<ClubData | null>(null);
  /* Round 1604 (report 3f014b97): the club shown here is the club the career
     starts at. Every placement is drawn in one place, handed up to the page
     for initCareer, and remembers the nationality and era it was drawn for. */
  const academyFor = useRef("");
  const showAcademy = (club: ClubData | null, drawnFor = "") => {
    academyFor.current = drawnFor;
    setAcademyClub(club);
  };
  const placeAcademy = (engine: CareerCreationSupport, ovr: number, nat: string, eraValue: string) => {
    const startYr = ERAS.find(er => er.value === eraValue)?.startYear ?? 2020;
    showAcademy(engine.getYouthAcademyClub(engine.adjustClubsForYear(engine.clubs, startYr), nat, ovr), `${nat}|${eraValue}`);
  };
  const rollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  // A roll belongs to the position it was made for. Keep the form itself mounted.
  useEffect(() => {
    setRolledOvr(null);
    setRolledPot(null);
    setIsRolling(false);
    setAcademyClub(null);
    return () => {
      loadGeneration.current++;
      if (rollTimer.current !== null) clearInterval(rollTimer.current);
      rollTimer.current = null;
    };
  }, [position]);
  // Round 79: the attribute point-spend build editor drill-in
  const [buildOpen, setBuildOpen] = useState(false);
  /* Coming back OUT of the build editor has the same problem in reverse, so
     the creation screen brings its own top with it too. skipFirst stays on
     here, because the very first render is just the page loading and nobody
     wants a game that scrolls the moment it opens. */
  const creationRef = useRevealScroll<HTMLDivElement>(buildOpen ? "build" : "creation");

  const canGenerate = playerName.trim().length > 0 && nationality && position && era;

  const handlePositionChange = (pos: string) => {
    loadGeneration.current++;
    setClubsLoading(false);
    setPosition(pos);
    setPreviewStats(null);
    setPhysique(defaultPhysique(pos));
    setAttrShape({});
  };

  const startRoll = (engine: CareerCreationSupport) => {
    /* Round 78 gave everybody three looks from the scouts and then locked it.
       Round 131 takes the lock off, because he asked for it and because he was
       right: "have unlimited rerolls so people can try to get someone with a
       higher potential." Somebody chasing a dice roll is going to chase it
       either way, and the three roll version only ever meant closing the tab
       and opening it again, which is a worse game and the same outcome. The
       odds behind the roll have not moved a point, so a generational ceiling is
       exactly as rare per roll as it has always been. */
    setIsRolling(true);
    showAcademy(null);
    // Slot machine animation: cycle through random numbers
    let ticks = 0;
    const totalTicks = 18;
    const interval = setInterval(() => {
      ticks++;
      setDisplayOvr(engine.rollStartingOverall(position));
      if (ticks >= totalTicks) {
        clearInterval(interval);
        rollTimer.current = null;
        const finalOvr = engine.rollStartingOverall(position);
        // Round 78: potential rolled alongside the overall. Weighted low,
        // tiny chance of a generational ceiling, exactly like he asked.
        const pot = engine.rollPotential(finalOvr);
        setDisplayOvr(finalOvr);
        setRolledOvr(finalOvr);
        setRolledPot(pot);
        setRollCount(prev => prev + 1);
        setBestPotSeen(prev => Math.max(prev, pot));
        // Generate stats that average to exactly this overall
        const stats = generateStatsFromOverall(finalOvr, position);
        setPreviewStats(stats);
        setIsRolling(false);
        // Preview academy (era-adjusted, and the one initCareer is handed)
        placeAcademy(engine, finalOvr, nationality, era);
      }
    }, 60);
    rollTimer.current = interval;
  };

  const doRoll = () => {
    if (!canGenerate || clubsLoading || isRolling) return;
    if (support) { startRoll(support); return; }
    if (!loadSupport) return;
    const generation = ++loadGeneration.current;
    setClubsError(false);
    setClubsLoading(true);
    loadSupport().then(engine => {
      if (generation !== loadGeneration.current) return;
      setSupport(engine);
      setClubsLoading(false);
      startRoll(engine);
    }, () => {
      if (generation !== loadGeneration.current) return;
      setClubsLoading(false);
      setClubsError(true);
    });
  };

  const beginCareer = () => {
    if (!canGenerate || !support || !previewStats || rolledOvr === null || isRolling) return;
    onBegin({ playerName: playerName.trim(), nationality, position, era, stats: previewStats,
      overall: rolledOvr, potential: rolledPot ?? undefined, startYear: ERAS.find(e => e.value === era)?.startYear ?? 2020,
      clubs: support.clubs, appearance, physique, attrShape, academyPreview: academyClub?.name ?? null });
  };

  const tier = rolledOvr !== null ? getOverallTier(rolledOvr) : (isRolling ? getOverallTier(displayOvr) : null);

  const handleBuildConfirm = (stats: Stats, calcOvr: number) => {
    setRolledOvr(calcOvr);
    setDisplayOvr(calcOvr);
    /* Round 159: the ceiling can never sit below the player. He typed a 99
       overall in the build editor and the scout projection still quoted the
       ORIGINAL roll's 89 ceiling next to it, which reads as broken because it
       is: a ceiling below the floor. The ceiling now rises with the build,
       capped at 99 like everything else. */
    const pot = Math.min(99, Math.max(rolledPot ?? calcOvr + 6, calcOvr));
    setRolledPot(pot);
    setPreviewStats(stats);
    setBuildOpen(false);
    /* Round 131: the academy that takes you depends on how good you are, and
       the build screen can now move that by fifty points, so the placement
       preview underneath has to be recalculated or it is quietly lying. */
    if (support) placeAcademy(support, calcOvr, nationality, era);
  };

  /* Round 1604: a placement belongs to the nationality and era it was drawn
     for. Change either after a roll (or during one) and it is drawn once more
     for the new choice, the roll itself kept, so the club shown is still the
     club Begin Career starts you at. */
  useEffect(() => {
    if (rolledOvr === null || isRolling || !support || !nationality || !era) return;
    if (academyFor.current === `${nationality}|${era}`) return;
    placeAcademy(support, rolledOvr, nationality, era);
  }, [nationality, era, rolledOvr, isRolling, support]);

  /* Round 1604: what still stands between the player and a roll, in plain words. */
  const missingPicks = [!nationality && "a nationality", !position && "a position", !era && "an era"].filter(Boolean) as string[];
  const pickList = missingPicks.length > 1 ? `${missingPicks.slice(0, -1).join(", ")} and ${missingPicks[missingPicks.length - 1]}` : (missingPicks[0] ?? "");
  const needName = !playerName.trim();
  /* Once a roll is on screen the name unlocks a reroll and Begin Career, not a
     first roll, so the two lines say that instead. */
  const missingFor = (goal: string) => !needName && !missingPicks.length ? ""
    : `${needName ? (missingPicks.length ? "Add your name, then pick " : "Add your name") : "Pick "}${pickList} to ${goal}.`;
  const missingLine = missingFor(rolledOvr !== null ? "roll again" : "roll your potential");
  const missingBeginLine = missingFor(rolledOvr !== null ? "start your career" : "roll your potential");

  // Tile rule: the build editor takes over the whole screen with a back button
  if (buildOpen && previewStats && rolledOvr !== null) {
    return (
      <CentreMountBoundary what="build editor" onClose={() => setBuildOpen(false)}>
        <Suspense fallback={<div role="status" className="max-w-xl mx-auto rounded-xl border border-border bg-card p-4 text-sm">Loading build editor...</div>}>
          <BuildEditor
            position={position}
            targetOvr={rolledOvr}
            baseStats={previewStats}
            rolledPot={rolledPot}
            physique={physique}
            onPhysique={setPhysique}
            shape={attrShape}
            onShape={setAttrShape}
            onConfirm={handleBuildConfirm}
            onCancel={() => setBuildOpen(false)}
          />
        </Suspense>
      </CentreMountBoundary>
    );
  }

  return (
    <div ref={creationRef} className="max-w-xl mx-auto space-y-5">
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
          <Label htmlFor="soccer-career-nationality">Nationality</Label>
          {/* Round 76: position="popper" pins the list BELOW the trigger with
              its own scroll, fixing his bug where the item-aligned popup shot
              off the top of the screen and cut off the first nations. Flag
              sits to the RIGHT of the name, exactly as he asked. */}
          <Select value={nationality} onValueChange={setNationality}>
            <SelectTrigger id="soccer-career-nationality" className="bg-muted/30"><SelectValue placeholder={<span>Choose nationality</span>} /></SelectTrigger>
            <SelectContent position="popper" className="max-h-72">
              {/* Round 453: over a hundred nations is a long scroll, so they
                  sit under their confederation, the way qualifying groups them. */}
              {groupByConfederation(NATIONALITIES, n => n).map(g => (
                <SelectGroup key={g.conf}>
                  <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{g.label}</SelectLabel>
                  {g.items.map(n => (
                    <SelectItem key={n} value={n}>
                      <span className="flex items-center gap-2">{n}<FlagImg name={n} size={18} /></span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="soccer-career-position">Position</Label>
          <Select value={position} onValueChange={handlePositionChange}>
            <SelectTrigger id="soccer-career-position" className="bg-muted/30"><SelectValue placeholder={<span>Choose position</span>} /></SelectTrigger>
            <SelectContent>{POSITIONS.map(p => <SelectItem key={p.value} value={p.value}><span>{p.label}</span></SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="soccer-career-era">Starting Era</Label>
          <Select value={era} onValueChange={setEra}>
            <SelectTrigger id="soccer-career-era" className="bg-muted/30"><SelectValue placeholder={<span>Choose era</span>} /></SelectTrigger>
            <SelectContent>{ERAS.map(e => <SelectItem key={e.value} value={e.value}><span>{e.label}</span></SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Round 54: create your appearance */}
      <AppearanceBuilder
        appearance={appearance}
        onChange={setAppearance}
        clubColor={academyClub?.color || "#10B981"}
      />

      {/* Generate Starting Potential. Round 1604: on the page before the form
          is complete too, its button off and one line saying what is missing. */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-5 space-y-4">
        <h2 className="text-base font-bold text-center">Starting Potential</h2>

        {/* Only a complete form waits on the clubs, so an empty one never
            flashes a loading box on its first frame. */}
        {clubsLoading && canGenerate && (
          <div role="status" className="rounded-xl border border-border bg-muted/10 p-4 text-center text-sm text-muted-foreground animate-pulse">
            Loading clubs...
          </div>
        )}
        {!clubsLoading && clubsError && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-center text-xs text-amber-400">
            Couldn't load the clubs. Try generating again.
          </div>
        )}

        {(rolledOvr !== null || isRolling) && (
          <div className={`rounded-xl border p-5 text-center space-y-2 transition-all ${tier ? tier.bgColor : "bg-muted/20 border-border"}`}>
            <div className={`text-6xl font-black tabular-nums transition-all ${isRolling ? "animate-pulse" : "animate-scale-in"} ${tier ? tier.color : "text-foreground"}`}>
              {isRolling ? displayOvr : rolledOvr}
            </div>
            <div className={`text-sm font-bold ${tier ? tier.color : "text-muted-foreground"}`}>
              {isRolling ? "Rolling..." : tier?.label}
            </div>
            {/* Round 78: scout projection. Potential is rolled once and the
                engine walls growth at it, so this number actually matters. */}
            {!isRolling && rolledPot !== null && (
              <div className="pt-1 border-t border-border/50 space-y-0.5 animate-fade-in">
                <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Scout Projection</div>
                <div className={`text-sm font-bold ${support!.potentialTier(rolledPot).color}`}>
                  {support!.potentialTier(rolledPot).label} · {rolledPot} ceiling
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={doRoll}
            disabled={!canGenerate}
            aria-disabled={isRolling || clubsLoading || undefined}
            className={`flex-1 h-11 text-sm font-bold text-black aria-disabled:pointer-events-none aria-disabled:opacity-50 ${rolledOvr !== null ? "bg-muted/40 hover:bg-muted/60 text-foreground" : "bg-emerald-600 hover:bg-emerald-500"}`}
            variant={rolledOvr !== null ? "outline" : "default"}
          >
            {clubsLoading && canGenerate ? "Loading..." : isRolling ? "🎰 Rolling..." : rolledOvr !== null ? "🎲 Roll again" : "🎲 Generate Starting Potential"}
          </Button>
        </div>
        {!canGenerate && <p className="text-[11px] text-muted-foreground text-center">{missingLine}</p>}
        {rolledOvr !== null && !isRolling && (
          <p className="text-[11px] text-muted-foreground text-center">
            Roll {rollCount}. Reroll as many times as you like, it costs nothing.
            {bestPotSeen > (rolledPot ?? 0) ? ` Best ceiling you have turned up so far: ${support!.potentialTier(bestPotSeen).label.toLowerCase()}.` : ""}
          </p>
        )}

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
                <div className="font-bold text-sm flex items-center gap-1"><FlagImg name={academyClub.country} size={16} />{academyClub.name} Youth</div>
                <div className="text-[11px] text-muted-foreground">{(() => {
                  /* Round 1037: the league the club is in the year he joins, or none */
                  const line = support!.leagueSeasonLine(academyClub, ERAS.find(er => er.value === era)?.startYear ?? 2020);
                  return line ? `${line} · ` : "";
                })()}Tier {academyClub.tier}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats preview */}
      {previewStats && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">Starting Stats</h2>
            <span className={`text-2xl font-black ${(rolledOvr ?? 0) >= 55 ? 'text-green-400' : 'text-yellow-400'}`}>{(rolledOvr ?? 0)}</span>
          </div>
          <div className="space-y-2">
            {getPositionStatBars(position, { ...previewStats, physique, attrShape }).map(s => <StatBarGame key={s.l} label={s.l} value={s.v} color={s.c} top={s.top} />)}
          </div>
          {/* Round 79: who your build plays like, live off the actual numbers */}
          {!isRolling && (() => { const comp = support!.playsLike(previewStats, position); return (
            <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-center">
              <span className="text-[11px] text-muted-foreground">Scouts say you play like </span>
              <span className="text-[12px] font-black">{comp.name}</span>
              {comp.pct > 0 && <span className="text-[11px] text-muted-foreground"> ({comp.pct}% match)</span>}
            </div>
          ); })()}
          {rolledOvr !== null && !isRolling && (
            <Button variant="outline" className="w-full h-10 text-sm font-bold" onClick={() => setBuildOpen(true)}>
              🎮 Customize your build
            </Button>
          )}
        </div>
      )}

      <Button onClick={beginCareer} disabled={!canGenerate || rolledOvr === null || !previewStats || isRolling || !support}
        className="w-full h-12 text-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-black disabled:opacity-40">
        ⚽ Begin Career
      </Button>
      {rolledOvr === null && canGenerate && <p className="text-xs text-muted-foreground text-center">Generate your starting potential to begin</p>}
      {!canGenerate && <p className="text-xs text-muted-foreground text-center">{missingBeginLine}</p>}
      {!user && <p className="text-xs text-muted-foreground text-center">Your career saves in this browser. No account needed.</p>}
    </div>
  );
}

/* ─── Transfer Window Card ─── */
