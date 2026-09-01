import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { focusDialogOnMount, escapeCloses } from '@/lib/dialogA11y';
import { useGameCompletion } from "@/hooks/useGameCompletion";
import { recordCompletion, recordActivity } from "@/lib/completions";
import PageSeo from "@/components/seo/PageSeo";
import GameSeoContent from '@/components/seo/GameSeoContent';
import { GameNavbar } from "@/components/game/GameNavbar";
import { GameHelp } from "@/components/game/GameHelp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";
import { getPersonalityDef, getAgentDef } from "@/lib/soccerCareerLife";
import {
  type CareerState, type SeasonRecord, type ClubData, type ContractOffer, type TransferSituation,
  type RandomEvent, type EventChoice, type WorldCupResult, type WCMatch,
  type RivalPlayer, type RivalryEvent, type RivalrySummary,
  type LifestyleLevel, type FamilyStatus, type BallonDorResult, type BallonDorNominee,
  type UCLResult, type UCLKnockoutMatch, type Award,
  type LegacyResult, type LegacyTier, type PostRetirementChoice, type ManagerState,
  type PunditState, type OwnerState, type PunditAction,
  type NewsArticle, type SpendingItem, type SpendingCategory,
  type SocialMediaAction, type SponsorshipTier,
  type MoralDilemma, type MoralDilemmaChoice,
  initCareer, advanceYouthYear, acceptOffer, advanceProSeason,
  dismissSummary, stayAtClub, signExtension, requestTransfer, applyEventChoice,
  dismissDebut, dismissWorldCup, retireFromInternational, dismissRivalryEvent,
  dismissBallonDor, applyBdorSpeech, type BdorSpeechChoice,
  applyWorldCupSpeech, type WorldCupSpeechChoice, manualRetire, choosePostRetirement, advanceManagerSeason, acceptManagerOffer, endManagerCareer, loadManagerMarket,
  acceptRetirementSuggestion, declineRetirementSuggestion,
  advancePunditSeason, endPunditCareer,
  advanceOwnerSeason, endOwnerCareer,
  dismissNewspaper, purchaseSpendingItem, SPENDING_ITEMS,
  applySocialMediaAction, handleCoverAthleteDecision, dismissSocialMediaPhase,
  applyMoralDilemmaChoice, dismissMoralDilemma, MORAL_DILEMMAS,
  applyRehabChoice,
  SOCIAL_MEDIA_ACTIONS, SPONSORSHIP_TIERS,
  dismissAppealResult,
  generateShareText, getYouthAcademyClub,
  getCareerTotals, calcOverall, formatWage, formatNetWorth, formatFollowers,
  FALLBACK_CLUBS,
  answerPhoneText, unreadPhoneCount,
  applyTrainingResult, trainingAvailable, type TrainingDrill,
  repairCareer, effectivePotential, careerBuildEffects,
  applyMoneyAction,
  acceptLoan, projectLeagueApps,
} from "@/lib/soccerCareerEngine";
/* Round 258, his ask alongside the net worth bug: "depending where u live
   ur currency will be diffrent". `money` rewrites the euro amounts inside
   any line the game draws, so a wage slip, an event consequence and a
   transfer fee all follow the same chosen currency. Display only: every
   number in the save stays in euros. */
import { localizeMoney as money, CURRENCIES, getCurrency, setCurrency, rateNote } from "@/lib/soccerCurrency";
/* Round 262: the squad you are actually in. Display only, and it renders
   nothing at all when we have no honest answer for that club and season. */
import { depthChart, GROUP_LABEL, type DepthChart, type SquadMan } from "@/lib/soccerClubSquad";
import type { MoneyAction } from "@/lib/soccerMoney";
import { bankSummary } from "@/lib/soccerMoney";
import PhonePanel from "@/components/soccer-career/PhonePanel";
import TrainingPanel from "@/components/soccer-career/TrainingPanel";
import { rollStartingOverall, rollPotential, potentialTier, adjustClubsForYear, allocOverall, normalizeAllocation, allocMax, ALLOC_MIN, playsLike, stepAllocation } from "@/lib/careerEras";
/* Round 131: height, weight and the specifics under each family. */
import {
  type PlayerPhysique, type AttrShape,
  attrTreeFor, deriveAttributes, buildEffects, effectsSummary, safePhysique,
  applyFamilyOffset, defaultPhysique, heightLabel, weightLabel, buildLabel,
  POSITION_OFFSETS, SHAPE_MAX, HEIGHT_MIN, HEIGHT_MAX, WEIGHT_MIN, WEIGHT_MAX,
} from "@/lib/soccerCareerAttributes";
import {
  type PlayerAppearance, defaultAppearance, getCelebration,
} from "@/lib/soccerCareerAppearance";
import PlayerAvatar from "@/components/soccer-career/PlayerAvatar";
import AppearanceBuilder from "@/components/soccer-career/AppearanceBuilder";
import { Confetti, CountUp, ShineWrap } from "@/components/soccer-career/CareerFx";
import { heatLabel } from "@/lib/soccerCareerCorruption";
import ShareButtons from "@/components/game/ShareButtons";
import { FlagImg, FlagFromEmoji, TextWithFlags } from "@/components/FlagImg";
import { shareResult } from "@/lib/share";
import { useRevealScroll } from "@/hooks/useRevealScroll";
import { TournamentCard, InternationalHistoryTile } from "@/components/soccer-career/InternationalPanel";

/* ─── Constants ─── */
// Round 76: 131 nations (was 49), every one with a real flag in FlagImg,
// sorted alphabetically so yours is findable in the scroll.
const NATIONALITIES = [
  "Albania","Algeria","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan",
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
const POSITIONS = [
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
  { value: "2025", label: "Current era (2025 start)", startYear: 2025 },
];

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

type Stats = { pace: number; shooting: number; passing: number; dribbling: number; defending: number; physical: number; reflexes: number };

function generateStatsFromOverall(overall: number, position: string): Stats {
  /* Round 131: the offsets moved into soccerCareerAttributes because the
     engine now needs the same table to work out what a neutral player at this
     overall looks like. One copy, imported in both places, so the reference
     the season maths measures a build against can never drift from the line
     the creation screen hands out. */
  const o = POSITION_OFFSETS[position] || [0, 0, 0, 0, 0, 0, 0];
  const clamp = (v: number) => Math.max(25, Math.min(99, v));
  const keys: (keyof Stats)[] = ["pace", "shooting", "passing", "dribbling", "defending", "physical", "reflexes"];
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

const FAMILY_COLORS: Record<string, string> = {
  pace: "bg-emerald-500",
  shooting: "bg-red-500",
  passing: "bg-blue-500",
  dribbling: "bg-yellow-500",
  defending: "bg-purple-500",
  physical: "bg-orange-500",
  reflexes: "bg-cyan-500",
};

function getPositionStatBars(pos: string, s: AttrHolder) {
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

/* ─── Position-specific career stats display ─── */
function getPositionCareerStats(pos: string, totals: { apps: number; goals: number; assists: number; cleanSheets: number; leagueTitles: number; domesticCups: number; championsLeagues: number; worldCups: number; continentalCups: number; yellowCards: number; redCards: number }) {
  const trophies = totals.leagueTitles + totals.domesticCups + totals.championsLeagues + totals.worldCups + totals.continentalCups;
  // Derive approximate stats from existing data
  const saves = totals.cleanSheets * 4 + Math.round(totals.apps * 2.5); // ~estimated saves
  const pensSaved = Math.max(0, Math.floor(totals.cleanSheets / 5)); // ~1 per 5 clean sheets
  const tackles = Math.round(totals.apps * 2.8); // ~2.8 tackles per game for defenders
  const interceptions = Math.round(totals.apps * 1.6); // ~1.6 per game
  const keyPasses = Math.round(totals.assists * 3.2 + totals.apps * 0.8); // derived from assists
  const hatTricks = Math.max(0, Math.floor(totals.goals / 15)); // ~1 hat trick per 15 goals

  if (pos === "GK") return [
    { l: "Apps", v: totals.apps },
    { l: "Clean Sheets", v: totals.cleanSheets },
    { l: "Saves", v: saves },
    { l: "Pens Saved", v: pensSaved },
    { l: "Trophies", v: trophies },
  ];
  if (["CB", "LB", "RB"].includes(pos)) return [
    { l: "Apps", v: totals.apps },
    { l: "Tackles", v: tackles },
    { l: "Interceptions", v: interceptions },
    { l: "Goals", v: totals.goals },
    { l: "Clean Sheets", v: totals.cleanSheets },
    { l: "Trophies", v: trophies },
  ];
  if (["CDM", "CM", "CAM"].includes(pos)) return [
    { l: "Apps", v: totals.apps },
    { l: "Goals", v: totals.goals },
    { l: "Assists", v: totals.assists },
    { l: "Key Passes", v: keyPasses },
    { l: "Trophies", v: trophies },
  ];
  // Forwards: ST, LW, RW
  return [
    { l: "Apps", v: totals.apps },
    { l: "Goals", v: totals.goals },
    { l: "Assists", v: totals.assists },
    { l: "Hat Tricks", v: hatTricks },
    { l: "Trophies", v: trophies },
  ];
}

/* ─── Stat Bar ─── */
function StatBarGame({ label, value, color, top }: { label: string; value: number; color: string; top?: string }) {
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

/* ─── Round 131: the stepper he asked for ───

   His words: "It takes forever to manually change the overall of stuff, I
   would prefer if we had like a jump by 5 feature too, or just write the
   number u wanna start with."

   Both, because both are cheap. Minus five, minus one, a box you can type
   straight into, plus one, plus five. The typing is the part that has to be
   careful: the box holds whatever you type as text while you are typing, so
   backspacing to empty does not slam the value to the minimum under your
   finger, but the VALUE it reports is always a clamped whole number, never
   NaN and never out of the legal window. Blur or Enter tidies the text back up
   to the committed number.

   The clamp window is passed in rather than assumed, because on the build
   screen the top of the window is not a constant: it is whichever comes first
   out of the per stat cap and how many points you still have left to spend. */
function NumberStepper({ value, min, max, onChange, label, disabled, wide }: {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  label: string;
  disabled?: boolean;
  wide?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const clampTo = (v: number) => Math.max(min, Math.min(max, Math.round(v)));
  const commit = (raw: string) => {
    /* Keep a leading minus, because the shaping steppers run from -12 to +12,
       and throw away everything that is not a digit. */
    const digits = (raw.match(/-?\d*/) || [""])[0];
    if (digits === "" || digits === "-") { setDraft(digits); return; }
    const n = Number(digits);
    if (!Number.isFinite(n)) { setDraft(""); return; }
    const c = clampTo(n);
    onChange(c);
    /* Found by driving it at 390 wide: typing 99999 into the overall box left
       99999 sitting in it while the career underneath was correctly 99, which
       reads as a broken control even though nothing was broken. The box keeps
       what you typed only while what you typed is legal. */
    setDraft(c === n ? digits : String(c));
  };
  const btn = "h-8 w-8 shrink-0 rounded-md border border-border bg-muted/20 text-[11px] font-black text-foreground disabled:opacity-30 active:scale-95 transition-transform";
  return (
    <div className="flex items-center gap-1">
      <button type="button" aria-label={`${label} down 5`} disabled={disabled || value <= min} onClick={() => onChange(clampTo(value - 5))} className={btn}>-5</button>
      <button type="button" aria-label={`${label} down 1`} disabled={disabled || value <= min} onClick={() => onChange(clampTo(value - 1))} className={btn}>-1</button>
      <input
        aria-label={label}
        inputMode="numeric"
        pattern="[0-9]*"
        disabled={disabled}
        value={draft ?? String(value)}
        onChange={(e) => commit(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={() => setDraft(null)}
        onKeyDown={(e) => { if (e.key === "Enter") { setDraft(null); (e.currentTarget as HTMLInputElement).blur(); } }}
        className={`${wide ? "w-16" : "w-12"} h-8 shrink-0 rounded-md border border-border bg-background text-center text-sm font-black tabular-nums focus:border-emerald-500`}
      />
      <button type="button" aria-label={`${label} up 1`} disabled={disabled || value >= max} onClick={() => onChange(clampTo(value + 1))} className={btn}>+1</button>
      <button type="button" aria-label={`${label} up 5`} disabled={disabled || value >= max} onClick={() => onChange(clampTo(value + 5))} className={btn}>+5</button>
    </div>
  );
}

/* ─── Timeline Entry ─── */
function TimelineEntry({ season, isCurrent, isLast }: { season: SeasonRecord; isCurrent: boolean; isLast: boolean }) {
  const label = season.type === "youth" ? "A" : season.type === "retired" ? "R" : null;
  const trophies = [season.leagueTitle && "🏆", season.domesticCup && "🏆", season.championsLeague && "⭐", season.worldCup && "🌍", season.continentalCup && "🌐", season.ballonDor && "🏅"].filter(Boolean);

  return (
    <div className={`relative flex items-start gap-3 py-2 px-3 rounded-lg transition-colors ${isCurrent ? 'bg-emerald-500/15 border border-emerald-500/30' : ''}`}>
      {!isLast && <div className="absolute left-[1.65rem] top-9 w-0.5 h-[calc(100%-0.5rem)] bg-border" />}
      <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black z-10 ${
        label === "A" ? "bg-amber-500/80 text-amber-950" :
        label === "R" ? "bg-muted text-muted-foreground" :
        isCurrent ? "bg-emerald-500 text-black" : "bg-muted/60 text-muted-foreground"
      }`}>
        {label || (season.year % 100).toString().padStart(2, "0")}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">{season.age}y</span>
          <span className="text-xs font-semibold truncate flex items-center gap-1"><FlagImg name={season.clubCountry} size={16} />{season.club}{season.onLoanFrom ? <span className="text-muted-foreground font-normal"> (loan)</span> : null}</span>
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
/* Round 267: an offer is not just money and a badge, it is a queue you are
   joining. Where the real squad for that club and season exists, the card says
   where you would slot into it and who would be in front of you, which is the
   difference between "Arsenal want me" and "Arsenal want me as a fourth
   choice". Display only, same as the squad card: it reads the same baked data
   and changes nothing about the offer or the simulation. No data for that club
   or year means no line, never a guess. */
function OfferFitLine({ offer, career }: { offer: ContractOffer; career: CareerState }) {
  const year = (career.seasons[career.seasons.length - 1]?.year ?? 0) + 1;
  const chart = depthChart(offer.club.name, year, career.position, career.overall, career.playerName);
  if (!chart) return null;
  const label = GROUP_LABEL[chart.group];
  return (
    <div data-offer-fit className="text-[11px] text-muted-foreground border-t border-border/50 pt-2">
      {chart.ahead === 0
        ? `👑 You would be their best of the ${label} on day one.`
        : `📋 You would be ${ordinalPlace(chart.ahead + 1)} of ${chart.men.length} ${label} there${chart.aheadOfMe ? `, behind ${chart.aheadOfMe.name}` : ""}.`}
    </div>
  );
}

function OfferCard({ offer, onAccept, actionLabel, career }: { offer: ContractOffer; onAccept: () => void; actionLabel?: string; career?: CareerState }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-black shrink-0"
          style={{ backgroundColor: offer.club.color + "22", color: offer.club.color, border: `2px solid ${offer.club.color}44` }}>
          {offer.club.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate flex items-center gap-1"><FlagImg name={offer.club.country} size={16} />{offer.club.name}</div>
          <div className="text-[11px] text-muted-foreground">{offer.club.league}</div>
        </div>
        {offer.isDreamClub && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">⭐ Dream Club</span>}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span>📋 {offer.contractYears}yr</span>
        <span>💰 {formatWage(offer.wage)}</span>
        {offer.transferFee > 0 && <span>🏷️ {money(`€${offer.transferFee.toFixed(1)}M`)} fee</span>}
        {offer.transferFee === 0 && offer.contractYears > 0 && <span className="text-emerald-400 font-semibold">Free transfer</span>}
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/40">Tier {offer.club.tier}</span>
      </div>
      {offer.isPayCut && <div className="text-[11px] text-amber-400">⚠️ Lower wages, but it's a dream move</div>}
      {career && <OfferFitLine offer={offer} career={career} />}
      <Button onClick={onAccept} className="w-full h-9 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-black">
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
              {money(article.headline)}
            </h3>
          </div>
          {/* Separator */}
          <div className="mx-4 border-t border-border" />
          {/* Body */}
          <div className="px-4 pt-2 pb-4">
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
              {money(article.body)}
            </p>
          </div>
        </div>
      ))}
      <Button onClick={onContinue} className="w-full h-10 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-black">
        Continue to Season Summary →
      </Button>
    </div>
  );
}

/* ─── Season Summary Card ─── */
function SeasonSummaryCard({ season, position, onContinue, appearance }: { season: SeasonRecord; position: string; onContinue: () => void; appearance?: PlayerAppearance | null }) {
  const isGK = position === "GK";
  const trophies = [season.leagueTitle && "🏆 League", season.domesticCup && "🏆 Cup", season.championsLeague && "⭐ UCL", season.worldCup && "🌍 World Cup", season.continentalCup && "🌐 Continental", season.ballonDor && "🏅 Ballon d'Or"].filter(Boolean);
  const celebration = appearance ? getCelebration(appearance.celebration) : null;

  return (
    <div className="relative bg-card border-2 border-emerald-500/30 rounded-xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {trophies.length > 0 && <Confetti pieces={trophies.length >= 2 ? 55 : 34} gold />}
      <div className="text-center">
        <h3 className="text-lg font-black">Season Summary</h3>
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><FlagImg name={season.clubCountry} size={14} />{season.club}{season.onLoanFrom ? ` (on loan from ${season.onLoanFrom})` : ""} · {season.year}/{(season.year + 1).toString().slice(-2)}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center bg-muted/20 rounded-lg p-2">
          <div className="text-xl font-black tabular-nums"><CountUp value={season.apps} /></div>
          <div className="text-[10px] text-muted-foreground">Apps</div>
        </div>
        <div className="text-center bg-muted/20 rounded-lg p-2">
          <div className="text-xl font-black tabular-nums"><CountUp value={isGK ? season.cleanSheets : season.goals} duration={1100} /></div>
          <div className="text-[10px] text-muted-foreground">{isGK ? "Clean Sheets" : "Goals"}</div>
        </div>
        <div className="text-center bg-muted/20 rounded-lg p-2">
          <div className="text-xl font-black tabular-nums"><CountUp value={season.assists} /></div>
          <div className="text-[10px] text-muted-foreground">Assists</div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Avg Rating: <strong className="text-foreground">{season.rating.toFixed(1)}</strong></span>
        <span>🟨 {season.yellowCards} 🟥 {season.redCards}</span>
      </div>

      {season.injury && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-center">
          <span className="text-xs font-bold text-red-400">🚑 {season.injury}, out {season.injuryWeeks} weeks</span>
        </div>
      )}

      {celebration && !isGK && season.goals > 0 && (
        <p className="text-[11px] text-muted-foreground text-center leading-snug animate-fade-in">
          {/* Round 129: "7 times this season you rip off toward the corner flag"
              was the shape he flagged. Goals are the thing being counted, so
              count goals, and let the celebration finish the sentence. */}
          {celebration.emoji} {season.goals === 1
            ? <>One goal this season, and you {celebration.line}.</>
            : <>{season.goals} goals this season, and every one of them you {celebration.line}.</>}
        </p>
      )}

      {trophies.length > 0 && (
        <ShineWrap className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-center">
          <span className="text-sm font-bold">{trophies.join(" · ")}</span>
        </ShineWrap>
      )}

      <Button onClick={onContinue} className="w-full h-10 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-black">
        Continue →
      </Button>
    </div>
  );
}

/* ─── Round 129: how far to lift anything welded to the bottom of the screen ───

   This page pins three things to the bottom edge on a phone: the action bar
   with Next Season and Retire, the training ground button and the phone button.
   All three used to keep sitting there once you reached the site footer, on top
   of the About, Contact, Privacy and Terms links, which is the exact thing
   Round 86 was complaining about when it un-stuck the action bar.

   So instead of any of them being switched off, they all move. This returns how
   many pixels the footer has climbed into the bottom of the window, and every
   pinned control translates up by that much, coming to rest directly on top of
   the footer rather than over it. Nobody loses a control and nobody loses a
   link.

   Measured live rather than derived from a class name, for the same reason
   useRevealScroll measures its insets: the footer is App.tsx's, it is shared by
   all 118 routes, and its height changes with the width of the screen because
   the legal paragraph rewraps. 323px tall at 320 wide, less further up.

   It reads on scroll behind a requestAnimationFrame, which is the whole cost:
   one getBoundingClientRect per painted frame while the page is moving, and
   nothing at all when it is still. It never writes to layout, only to a
   transform, so it cannot feed back into what it just measured. That matters:
   the version of this that toggled position instead of translating handed 60px
   of height back to the document every time it fired, which moved the footer,
   which un-fired it, which moved the footer back. */
function useFooterLift(enabled: boolean): number {
  const [lift, setLift] = useState(0);

  useEffect(() => {
    if (!enabled) { setLift(0); return; }
    let raf = 0;
    const measure = () => {
      raf = 0;
      const foot = document.querySelector('footer');
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (!foot) { setLift(0); return; }
      /* Clamped at six tenths of the window so a page that is somehow almost
         all footer cannot throw the controls off the top of the screen. It was
         half until Round 286: the footer grew a row of sport hubs, and at 320
         wide on an 844 tall screen it stands about 440px, so the half clamp
         left the bar parked 17px into the footer at the very bottom of the
         page. simMobileChrome measures exactly that. */
      const next = Math.max(0, Math.min(Math.round(vh - foot.getBoundingClientRect().top), Math.round(vh * 0.6)));
      setLift((prev) => (prev === next ? prev : next));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [enabled]);

  return lift;
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
  // Round 54: the look you build on the creation screen, carried into initCareer
  const [appearance, setAppearance] = useState<PlayerAppearance>(() => defaultAppearance());
  /* Round 131: the frame and the shaping live up here beside the look, because
     they have to survive closing the build screen and reopening it, and they
     both go into initCareer at the end. */
  const [physique, setPhysique] = useState<PlayerPhysique>(() => defaultPhysique("ST"));
  const [attrShape, setAttrShape] = useState<AttrShape>({});
  const [previewOvr, setPreviewOvr] = useState(0);
  const [saving, setSaving] = useState(false);
  /* Round 258: the display currency is a preference in its own storage key,
     not save data, so nothing here needs to know what it is. Bumping this
     counter is all that is needed to redraw every money figure after the
     picker changes, and it costs nothing when nobody touches it. */
  const [, setCurrencyTick] = useState(0);
  const [career, setCareer] = useState<CareerState | null>(() => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as CareerState;
        /* Round 127's lesson, and Round 131 keeps learning it: repairing a save
           only inside the step function is not enough, because the player can
           open the training ground, the phone or the attributes screen before
           taking a single step. repairCareer fills every optional field this
           game has grown, including the primeType migration that used to live
           here, and it runs again at the top of both step functions. */
        return repairCareer(parsed);
      }
    } catch {}
    return null;
  });
  const [clubs, setClubs] = useState<ClubData[]>([]);
  const [clubsLoading, setClubsLoading] = useState(true);
  const [clubsError, setClubsError] = useState(false);
  const [rolledOvr, setRolledOvr] = useState<number | null>(null);
  // Round 78: the potential rolled alongside the overall, threaded into the career.
  const [rolledPot, setRolledPot] = useState<number | null>(null);
  // Round 80: the phone overlay
  const [phoneOpen, setPhoneOpen] = useState(false);
  // Round 81: the training ground overlay
  const [trainingOpen, setTrainingOpen] = useState(false);
  const [showNewCareerConfirm, setShowNewCareerConfirm] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  /* Round 129: the training and phone buttons are pinned to the bottom right on
     every screen of this game, so they were sitting over the footer's Privacy
     and Terms links at the end of the page in exactly the way the action bar
     was. Same lift, same reason. */
  const floatingButtonLift = useFooterLift(!!career);

  // Score tracking on retirement
  const isRetired = career?.retired === true && career?.phase === "retired";
  const legacyScore = useMemo(() => {
    if (!isRetired || !career) return 0;
    const totals = getCareerTotals(career.seasons);
    return Math.min(1000, Math.round(
      (totals.ballonDors * 200) + (totals.championsLeagues * 150) + (totals.worldCups * 150) + (totals.leagueTitles * 50)
    ));
  }, [isRetired, career]);
  useGameCompletion('soccer-career', isRetired, legacyScore);

  // Club roster comes from the bundled FALLBACK_CLUBS list, deliberately.
  //
  // 2026-07-22: this used to fetch a `soccer_career_clubs` table first and fall
  // back to the bundle, but that table does not exist in the database (checked
  // pg_class, no table, view, or matview; only its stale entry in types.ts
  // survives, which the `as any` cast on the old .from() call kept invisible to
  // the compiler). The fetch had therefore failed on EVERY page load since the
  // table was dropped: an error logged to console each visit, a loading state
  // that only ever resolved via the catch path, and a dead code branch that
  // could never run. The bundle IS the source of truth, so load it directly.
  // If a DB-backed roster is ever wanted, recreate the table first and restore
  // a typed (no `as any`) fetch here.
  /* Round 273: start pulling the manager job market the moment a career is
     anywhere near the dugout. Two phases matter: post_retirement, which is the
     screen where the choice is made, and manager_season itself, which is what a
     SAVED career reloads straight into. That second one is the case worth
     naming: without it, a player who closed the tab mid manager career would
     come back to a page that has never loaded the market at all. */
  useEffect(() => {
    const phase = career?.phase;
    if (phase === "post_retirement" || phase === "manager_season") {
      void loadManagerMarket().catch(() => { /* retried on demand, see the engine */ });
    }
  }, [career?.phase]);

  useEffect(() => {
    setClubs(FALLBACK_CLUBS);
    setClubsError(false);
    setClubsLoading(false);
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
    // Clear preview stats; they'll be regenerated when the player rolls
    setPreviewStats(null);
    setPreviewOvr(0);
    setRolledOvr(null);
    setRolledPot(null);
    /* Round 131: the specifics under each family are different for a keeper
       than for anybody else, and a normal frame for a keeper is not a normal
       frame for a winger, so switching position resets both rather than
       carrying over a shape whose attribute names no longer exist. */
    setPhysique(defaultPhysique(pos));
    setAttrShape({});
  }, []);

  useEffect(() => {
    if (career && timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, [career?.seasons.length]);

  const handleBeginCareer = () => {
    // Guests can play; careers live in local state. Sign-in is only a nice-to-have.
    if (!previewStats || !isFormValid || clubs.length === 0 || rolledOvr === null) return;
    const startYear = ERAS.find(e => e.value === era)?.startYear ?? 2020;
    const newCareer = initCareer(playerName.trim(), nationality, position, era, previewStats, rolledOvr, startYear, clubs, appearance, rolledPot ?? undefined, physique, attrShape);
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
    /* Round 159: a played season counts as playing TODAY. The header's games
       played, points and rank only ever moved at retirement, so a whole
       evening deep in a career read as never having played (his screenshot,
       2026-08-18, showed 0/107 mid save). Unscored on purpose: the scored
       completion stays the retirement legacy, this one just marks the play.
       Round 392: an activity ping rather than a completion, so a season no
       longer writes a ranked row and a streak record (Round 301's shape). */
    recordActivity('/soccer-career');
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

  const onAcceptLoan = (offer: ContractOffer) => {
    if (!career) return;
    setCareer(acceptLoan(career, offer));
    toast.success(`Off on loan to ${offer.club.name} for the season`);
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

  const handleWorldCupSpeech = (choice: WorldCupSpeechChoice) => {
    if (!career) return;
    setCareer(applyWorldCupSpeech(career, choice, clubs));
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
  const handleBdorSpeech = (choice: BdorSpeechChoice) => {
    if (!career) return;
    setCareer(applyBdorSpeech(career, choice, clubs));
  };

  const handleManualRetire = () => {
    if (!career) return;
    setCareer(manualRetire(career));
  };

  /* Round 273: picking the dugout is the moment the job market is first
     needed, and it is a separate download now rather than something every
     player carries from the first screen. The effect below has almost always
     fetched it already by the time this runs, because the retirement screen
     is a page of reading; the await is here so that a fast click on a slow
     phone still lands in a manager career with a working offer feed. */
  const handlePostRetirement = async (choice: PostRetirementChoice) => {
    if (!career) return;
    if (choice === "manager") {
      try { await loadManagerMarket(); } catch { /* the engine says so on screen and retries */ }
    }
    setCareer(choosePostRetirement(career, choice, clubs));
  };

  const handleAdvanceManager = () => {
    if (!career) return;
    setCareer(advanceManagerSeason(career, clubs));
  };

  /* Round 111: take one of the jobs on the table after being sacked. */
  const handleAcceptManagerOffer = (index: number) => {
    if (!career) return;
    setCareer(acceptManagerOffer(career, index));
  };

  const handleEndManager = () => {
    if (!career) return;
    setCareer(endManagerCareer(career));
  };

  const handleShare = () => {
    if (!career) return;
    shareResult(generateShareText(career));
  };

  const handlePurchase = (itemId: string) => {
    if (!career) return;
    const result = purchaseSpendingItem(career, itemId);
    if (result !== career) {
      const item = SPENDING_ITEMS.find(i => i.id === itemId);
      setCareer(result);
      toast.success(item ? `${item.emoji} ${item.name} is yours` : "Done");
    } else {
      toast.error("You cannot buy that right now");
    }
  };

  /* Round 134: every money tap on the phone, on one handler. The engine runs
     the action once and hands back both the new state and the line to show,
     because asking twice would burn two draws of the money random stream and
     a hand of cards would be decided on a roll nobody ever saw. */
  const handleMoney = useCallback((action: MoneyAction) => {
    setCareer(prev => {
      if (!prev) return prev;
      const res = applyMoneyAction(prev, action);
      if (res.state === prev) {
        toast.error("That one will not go through");
        return prev;
      }
      if (res.toast) toast.success(res.toast);
      return res.state;
    });
  }, []);

  const handleSocialMediaAction = (actionId: string) => {
    if (!career) return;
    const result = applySocialMediaAction(career, actionId);
    setCareer(result);
    const action = SOCIAL_MEDIA_ACTIONS.find(a => a.id === actionId);
    if (action) toast(action.emoji + " " + action.label);
  };

  const handleCoverAthlete = (accept: boolean) => {
    if (!career) return;
    setCareer(handleCoverAthleteDecision(career, accept));
  };

  const handleDismissSocialMedia = () => {
    if (!career) return;
    setCareer(dismissSocialMediaPhase(career, clubs));
  };

  const handleMoralDilemmaChoice = (choiceIndex: number) => {
    if (!career) return;
    setCareer(applyMoralDilemmaChoice(career, choiceIndex));
  };

  const handleRehabChoice = (choiceIndex: number) => {
    if (!career) return;
    setCareer(applyRehabChoice(career, choiceIndex));
  };

  const handleDismissMoralDilemma = () => {
    if (!career) return;
    setCareer(dismissMoralDilemma(career, clubs));
  };

  const handleDismissAppeal = () => {
    if (!career) return;
    setCareer(dismissAppealResult(career, clubs));
  };

  const handleAcceptRetirement = () => {
    if (!career) return;
    setCareer(acceptRetirementSuggestion(career));
  };

  const handleDeclineRetirement = () => {
    if (!career) return;
    setCareer(declineRetirementSuggestion(career));
  };

  const handlePunditAction = (action: PunditAction) => {
    if (!career) return;
    setCareer(advancePunditSeason(career, action));
  };

  const handleEndPundit = () => {
    if (!career) return;
    setCareer(endPunditCareer(career));
  };

  const handleAdvanceOwner = () => {
    if (!career) return;
    setCareer(advanceOwnerSeason(career));
  };

  const handleEndOwner = () => {
    if (!career) return;
    setCareer(endOwnerCareer(career));
  };

  const handleNewCareer = () => {
    setShowNewCareerConfirm(true);
  };

  // Round 80: the phone
  const handlePhoneAnswer = useCallback((msgId: string, choiceIdx: number) => {
    setCareer(prev => (prev ? answerPhoneText(prev, msgId, choiceIdx) : prev));
  }, []);

  // Round 81: training mini games
  const handleTrainingComplete = useCallback((drill: TrainingDrill, score: number) => {
    setCareer(prev => (prev ? applyTrainingResult(prev, drill, score) : prev));
  }, []);

  const handleConfirmNewCareer = () => {
    localStorage.removeItem(SAVE_KEY);
    setCareer(null);
    setPreviewStats(null);
    setRolledOvr(null);
    setRolledPot(null);
    setPhoneOpen(false);
    setTrainingOpen(false);
    setPlayerName(""); setNationality(""); setPosition(""); setEra("");
    setAppearance(defaultAppearance());
    setShowNewCareerConfirm(false);
  };

  return (
    <>
      <PageSeo
        title="Soccer Career Simulator - Football Career Game | DoUKnowBall"
        description="Simulate your soccer career from youth academy to retirement. Make transfers, win trophies, become a legend."
        path="/soccer-career"
      />

      {/* Round 129: clearance under the last of the page content. The action bar
          rides the bottom of the screen for the whole page now and comes to rest
          on top of the footer, and at the very end of the document that means it
          is parked over the 85px directly above the footer's top edge. The
          footer already carries mt-12, so 48 of those 85 pixels are empty margin
          and only 37 were real content, but 37px of the last FAQ answer is still
          37px he cannot read. 88px of padding here, only while a career is
          loaded, puts the whole thing back in the clear. It is a static class,
          not something that changes as you scroll, so it cannot interact with
          the lift measurement. */}
      <div className={`min-h-screen bg-background text-foreground flex flex-col ${career ? 'pb-[88px]' : ''}`}>
        <GameNavbar />
        <div className="relative z-10 mx-auto w-full max-w-4xl"><GameHelp /></div>
        <main id="dukb-main" className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-4 py-4">
          {!career ? (
            <CreationScreen
              playerName={playerName} setPlayerName={setPlayerName}
              nationality={nationality} setNationality={setNationality}
              position={position} handlePositionChange={handlePositionChange}
              era={era} setEra={setEra}
              previewStats={previewStats} previewOvr={previewOvr}
              isFormValid={isFormValid && clubs.length > 0} saving={saving}
              user={user} onBegin={handleBeginCareer} onShowAuth={() => setShowAuth(true)}
              clubs={clubs} clubsLoading={clubsLoading} clubsError={clubsError}
              onRolledOvr={(ovr: number, pot: number) => { setRolledOvr(ovr); setRolledPot(pot); }}
              onStatsGenerated={(stats: Stats, ovr: number) => { setPreviewStats(stats); setPreviewOvr(ovr); }}
              appearance={appearance} setAppearance={setAppearance}
              physique={physique} setPhysique={setPhysique}
              attrShape={attrShape} setAttrShape={setAttrShape}
            />
          ) : (
            <GameScreen
              career={career}
              clubs={clubs}
              onCurrencyChange={() => setCurrencyTick(t => t + 1)}
              onNextSeason={handleNextSeason}
              onAcceptOffer={handleAcceptOffer}
              onDismissSummary={handleDismissSummary}
              onDismissNewspaper={handleDismissNewspaper}
              onStay={handleStay}
              onAcceptLoan={onAcceptLoan}
              onSignExtension={handleSignExtension}
              onRequestTransfer={handleRequestTransfer}
              onEventChoice={handleEventChoice}
              onDismissDebut={handleDismissDebut}
              onDismissWorldCup={handleDismissWorldCup}
              onWorldCupSpeech={handleWorldCupSpeech}
              onRetireInternational={handleRetireInternational}
              onDismissRivalryEvent={handleDismissRivalryEvent}
              onDismissBallonDor={handleDismissBallonDor}
              onBdorSpeech={handleBdorSpeech}
              onManualRetire={handleManualRetire}
              onPostRetirement={handlePostRetirement}
              onAdvanceManager={handleAdvanceManager}
              onAcceptManagerOffer={handleAcceptManagerOffer}
              onEndManager={handleEndManager}
              onShare={handleShare}
              onNewCareer={handleNewCareer}
              onOpenPhone={() => setPhoneOpen(true)}
              onSocialMediaAction={handleSocialMediaAction}
              onCoverAthlete={handleCoverAthlete}
              onDismissSocialMedia={handleDismissSocialMedia}
              onMoralDilemmaChoice={handleMoralDilemmaChoice}
              onRehabChoice={handleRehabChoice}
              onDismissMoralDilemma={handleDismissMoralDilemma}
              onDismissAppeal={handleDismissAppeal}
              onAcceptRetirement={handleAcceptRetirement}
              onDeclineRetirement={handleDeclineRetirement}
              onPunditAction={handlePunditAction}
              onEndPundit={handleEndPundit}
              onAdvanceOwner={handleAdvanceOwner}
              onEndOwner={handleEndOwner}
              timelineRef={timelineRef}
            />
          )}
        </main>

        {/* Round 80: the phone, an in-world handset. Floating button + full overlay.
            Round 81: the training ground button stacks above it. */}
        {career && (
          <>
            {!career.retired && (
              <button
                onClick={() => setTrainingOpen(true)}
                aria-label="Open the training ground"
                /* Round 129: the lift rides on the `translate` longhand, not on
                   `transform`. These two buttons carry hover:scale-105 and
                   active:scale-95, which Tailwind writes into `transform`, so an
                   inline transform here would silently delete the press
                   animation. `translate` composes with it instead. */
                style={floatingButtonLift ? { translate: `0 -${floatingButtonLift}px` } : undefined}
                className="fixed bottom-[5.5rem] right-4 z-40 w-14 h-14 rounded-2xl bg-zinc-900 border-2 border-zinc-700 shadow-xl flex items-center justify-center text-2xl hover:scale-105 active:scale-95 transition-transform"
              >
                🏋️
                {trainingAvailable(career) && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-zinc-900" />
                )}
              </button>
            )}
            <button
              onClick={() => setPhoneOpen(true)}
              aria-label="Open your phone"
              style={floatingButtonLift ? { translate: `0 -${floatingButtonLift}px` } : undefined}
              className="fixed bottom-5 right-4 z-40 w-14 h-14 rounded-2xl bg-zinc-900 border-2 border-zinc-700 shadow-xl flex items-center justify-center text-2xl hover:scale-105 active:scale-95 transition-transform"
            >
              📱
              {unreadPhoneCount(career) > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-red-500 text-[11px] font-black text-black flex items-center justify-center">
                  {unreadPhoneCount(career)}
                </span>
              )}
            </button>
            {phoneOpen && (
              <PhonePanel
                career={career}
                onAnswer={handlePhoneAnswer}
                onMoney={handleMoney}
                onBuyItem={handlePurchase}
                onClose={() => setPhoneOpen(false)}
              />
            )}
            {trainingOpen && (
              <TrainingPanel
                career={career}
                available={trainingAvailable(career)}
                onComplete={handleTrainingComplete}
                onClose={() => setTrainingOpen(false)}
              />
            )}
          </>
        )}
        <GameSeoContent
          pageHasOwnH1
          title="Soccer Career Simulator | DoUKnowBall"
          description="Live out your soccer dream in a season by season career simulator. Create a player, join a youth academy, develop skills, sign contracts, win trophies, and compete for the Ballon d'Or."
          howToPlay={[
            "Create your player: choose name, nationality, position, and starting era to begin your career.",
            "Each season, develop your skills through training, handle contract offers, and compete for trophies.",
            "Win the Ballon d'Or, lead your team to World Cup glory, and build a legendary career timeline."
          ]}
          examples={[
            "Start at La Masia (Barcelona academy) as a Spanish midfielder",
            "Transfer from Ajax to Premier League for a big contract",
            "Win the Champions League and earn a Ballon d'Or nomination",
            "Buy a Private Chef upgrade (+2 Physical, +2 Stamina)",
            "Break your country's all-time scoring record",
            "Earn Club Legend status with 300+ appearances at one club",
            "Retire after 20 seasons with a legendary career score"
          ]}
        />
      </div>
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      {/* New Career Confirmation Dialog */}
      {showNewCareerConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowNewCareerConfirm(false)}>
          <div role="dialog" aria-modal="true" aria-label="Start a new career?" tabIndex={-1} ref={focusDialogOnMount} onKeyDown={escapeCloses(() => setShowNewCareerConfirm(false))} className="bg-card border-2 border-border rounded-xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-center">⚠️ Start New Career?</h3>
            <p className="text-sm text-muted-foreground text-center">Are you sure? This will delete your current career. All progress will be lost forever.</p>
            <div className="flex gap-3">
              <Button onClick={() => setShowNewCareerConfirm(false)} variant="outline" className="flex-1 h-10 font-bold">Cancel</Button>
              <Button onClick={handleConfirmNewCareer} className="flex-1 h-10 font-bold bg-red-600 hover:bg-red-500 text-black">Delete & Start Over</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Overall tier info ─── */
function getOverallTier(ovr: number): { label: string; color: string; bgColor: string } {
  if (ovr >= 66) return { label: "Exceptional: Born Winner", color: "text-purple-400", bgColor: "bg-purple-500/15 border-purple-500/30" };
  if (ovr >= 62) return { label: "Gifted: High Ceiling", color: "text-amber-400", bgColor: "bg-amber-500/15 border-amber-500/30" };
  if (ovr >= 58) return { label: "Solid Foundation: Good Potential", color: "text-emerald-400", bgColor: "bg-emerald-500/15 border-emerald-500/30" };
  if (ovr >= 40) return { label: "Promising: Hard Work Ahead", color: "text-blue-400", bgColor: "bg-blue-500/15 border-blue-500/30" };
  return { label: "Raw Talent: Rough Around the Edges", color: "text-muted-foreground", bgColor: "bg-muted/20 border-border" };
}

/* ─── Round 79 build editor, rebuilt in Round 131 ───

   Three things changed and all three came straight off his list.

   ONE, THE OVERALL CAP IS GONE. "And there shouldn't be a cap on overalls.
   Like 99 obviously, but when ur building ur player there shouldn't." So the
   starting overall is a control now and it runs all the way to 99.

   That is the easy half. The honest half is that a career which starts at 99
   with nothing left to chase is a WORSE game than one that starts at 62, and
   permitting the choice without answering it would have been the lazy version.
   So the screen answers it in three ways, in view, at the moment you make the
   choice. It shows you your headroom, and the headroom is the whole growth
   economy: at 99 you have none, so training, the shop, the ceiling push and
   every development system in the game are switched off for you on day one. It
   shows you the ceiling the roll gave you and how a high start eats the
   distance to it. And when you retire, the verdict knows what you started at,
   so climbing from 54 to 91 reads as a bigger career than being handed 99 and
   staying there, which is exactly how anybody actually talks about a
   footballer.

   TWO, THE STEPPERS. Minus five, minus one, type it, plus one, plus five, on
   every row including the overall itself.

   THREE, THE SHAPE UNDERNEATH. Each family opens its own screen where you
   split it between the specifics a football person would name, and the frame
   tile sets your height and weight. Both feed real multipliers on goals,
   assists, games played, rating and injury risk, so two strikers with the same
   overall genuinely play differently.

   The tile rule is why all of that is behind three small tiles instead of
   stacked into one enormous scroll. */

type BuildScreen = { kind: "root" } | { kind: "family"; key: string } | { kind: "frame" };

const BUILD_OVR_MIN = 40;
const BUILD_OVR_MAX = 99;

function BuildEditor({ position, targetOvr, baseStats, rolledPot, physique, onPhysique, shape, onShape, onConfirm, onCancel }: {
  position: string;
  targetOvr: number;
  baseStats: Stats;
  rolledPot: number | null;
  physique: PlayerPhysique;
  onPhysique: (p: PlayerPhysique) => void;
  shape: AttrShape;
  onShape: (s: AttrShape) => void;
  onConfirm: (stats: Stats, calcOvr: number) => void;
  onCancel: () => void;
}) {
  /* Round 131: the six rows are named off the attribute tree rather than off
     allocRowsFor. Same keys, same maths, but the tree is the canonical shape
     now, so the row on the build screen, the screen it opens and the bars on
     the career page all use the one set of names. Before this, a striker's
     shooting row was labelled "Finishing", it opened a screen headed
     "Shooting", and the first attribute inside that screen was also called
     "Finishing", which is three names for two different things. */
  const rows = attrTreeFor(position).map(f => ({ key: f.key as string, label: f.label }));
  const sumOf = (s: Stats) => rows.reduce((a, r) => a + ((s as any)[r.key] as number), 0);
  const startRef = useRef<{ stats: Stats; ovr: number } | null>(null);
  if (startRef.current === null) startRef.current = { stats: normalizeAllocation(baseStats, position, targetOvr) as Stats, ovr: targetOvr };

  const [target, setTarget] = useState(targetOvr);
  const [alloc, setAlloc] = useState<Stats>(startRef.current.stats);
  const [budget, setBudget] = useState(() => sumOf(startRef.current!.stats));
  const [screen, setScreen] = useState<BuildScreen>({ kind: "root" });
  /* NO SCROLL RULE, and this one was found by driving it at 390 wide rather
     than by reading the code. The Customize your build button sits near the
     bottom of a long creation screen, so by the time you reach it the page is
     three thousand pixels down. Swapping in a shorter full screen editor left
     the window exactly where it was, which put the player in the middle of the
     page's own How To Play copy with the thing he just opened somewhere above
     him. Same for every drill in from here. The house hook does the right
     thing already: it puts the top of the new screen just under whatever is
     pinned to the top of the window, and it does nothing at all when the new
     screen is already readable. skipFirst is off because a fresh mount IS the
     reveal here, unlike an overlay that appears inside a page. */
  const revealRef = useRevealScroll<HTMLDivElement>(
    screen.kind === "family" ? `family:${screen.key}` : screen.kind,
    { skipFirst: false },
  );

  const spent = sumOf(alloc);
  const pool = budget - spent;
  const maxStat = allocMax(target);
  const liveOvr = allocOverall(alloc, position);
  const comp = playsLike(alloc, position);
  const ceiling = Math.min(99, Math.max(rolledPot ?? liveOvr + 6, liveOvr + 2));
  const headroom = Math.max(0, ceiling - liveOvr);
  const fx = buildEffects(alloc, position, liveOvr, physique, shape);
  const fxLines = effectsSummary(fx, position);

  /* Changing the starting overall renormalizes the whole line onto the new
     number and resets the pool to match, so you can never end up with a budget
     that belongs to an overall you have since moved away from. */
  const retarget = (next: number) => {
    const t = Math.max(BUILD_OVR_MIN, Math.min(BUILD_OVR_MAX, Math.round(next)));
    if (t === target) return;
    const line = normalizeAllocation(alloc, position, t) as Stats;
    setTarget(t);
    setAlloc(line);
    setBudget(sumOf(line));
  };

  /* Both of these are one line because the rules they enforce live in the libs
     rather than in this component. That is deliberate: scripts/simCreation.mjs
     fuzzes the exact same two functions a quarter of a million times, which it
     could not do if the rules only existed inside a React handler. */
  const setStat = (key: string, next: number) => {
    setAlloc(prev => stepAllocation(prev as any, position, key as any, next, budget, target) as Stats);
  };

  const setOffset = (famKey: string, id: string, next: number) => {
    onShape(applyFamilyOffset(position, shape, famKey, id, next));
  };

  const backBar = (title: string, onBack: () => void) => (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={onBack} className="h-8 px-2 text-muted-foreground">← Back</Button>
      <h1 className="text-base font-black truncate">{title}</h1>
    </div>
  );

  /* ── Frame screen: height and weight ── */
  if (screen.kind === "frame") {
    const derived = deriveAttributes(alloc, position, physique, shape).filter(d => d.frameDelta !== 0);
    derived.sort((a, b) => Math.abs(b.frameDelta) - Math.abs(a.frameDelta));
    return (
      <div ref={revealRef} className="max-w-xl mx-auto space-y-3 animate-fade-in">
        {backBar("Height and Weight", () => setScreen({ kind: "root" }))}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold">Height</span>
              <span className="text-[11px] text-muted-foreground tabular-nums">{heightLabel(physique.heightCm)}</span>
            </div>
            <NumberStepper label="Height in centimetres" value={physique.heightCm} min={HEIGHT_MIN} max={HEIGHT_MAX} wide
              onChange={(v) => onPhysique(safePhysique(position, { ...physique, heightCm: v }))} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold">Weight</span>
              <span className="text-[11px] text-muted-foreground tabular-nums">{weightLabel(physique.weightKg)}</span>
            </div>
            <NumberStepper label="Weight in kilograms" value={physique.weightKg} min={WEIGHT_MIN} max={WEIGHT_MAX} wide
              onChange={(v) => onPhysique(safePhysique(position, { ...physique, weightKg: v }))} />
          </div>
          <div className="rounded-lg bg-muted/20 px-3 py-2 text-center">
            <span className="text-xs font-bold">{buildLabel(physique)}</span>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">What your frame is doing</div>
          {derived.length === 0 && <p className="text-[11px] text-muted-foreground">Textbook size for this position, so nothing is pushed either way.</p>}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {derived.slice(0, 12).map(d => (
              <div key={d.id} className="flex items-center justify-between gap-1">
                <span className="text-[11px] text-muted-foreground truncate">{d.label}</span>
                <span className={`text-[11px] font-black tabular-nums ${d.frameDelta > 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {d.frameDelta > 0 ? "+" : ""}{d.frameDelta}
                </span>
              </div>
            ))}
          </div>
        </div>
        <Button variant="outline" className="w-full h-11 text-sm font-bold"
          onClick={() => onPhysique(defaultPhysique(position))}>↩️ Back to a normal frame</Button>
        <Button className="w-full h-11 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-black" onClick={() => setScreen({ kind: "root" })}>Done</Button>
      </div>
    );
  }

  /* ── Family screen: split one family between its specifics ── */
  if (screen.kind === "family") {
    const fam = attrTreeFor(position).find(f => f.key === screen.key);
    if (!fam) { setScreen({ kind: "root" }); return null; }
    const famValue = (alloc as any)[fam.key] as number;
    const derived = deriveAttributes(alloc, position, physique, shape);
    return (
      <div ref={revealRef} className="max-w-xl mx-auto space-y-3 animate-fade-in">
        {backBar(fam.label, () => setScreen({ kind: "root" }))}
        <div className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{fam.label}</div>
            <div className="text-2xl font-black tabular-nums">{famValue}</div>
          </div>
          <p className="text-[10px] text-muted-foreground text-right max-w-[62%] leading-snug">
            Push one up and the others come down. The average never moves, so shaping your player here cannot change your overall.
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 space-y-2.5">
          {fam.children.map(c => {
            const d = derived.find(x => x.id === c.id);
            const off = shape[c.id] ?? 0;
            return (
              <div key={c.id} className="rounded-lg border border-border/60 bg-muted/10 p-2 space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-bold truncate">{c.label}</span>
                  <span className="text-sm font-black tabular-nums shrink-0">{d?.value ?? famValue}</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">{c.does}</p>
                <NumberStepper label={`${c.label} shaping`} value={off} min={-SHAPE_MAX} max={SHAPE_MAX}
                  onChange={(v) => setOffset(fam.key, c.id, v)} />
              </div>
            );
          })}
        </div>
        <Button className="w-full h-11 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-black" onClick={() => setScreen({ kind: "root" })}>Done</Button>
      </div>
    );
  }

  /* ── Root ── */
  return (
    <div ref={revealRef} className="max-w-xl mx-auto space-y-3 animate-fade-in">
      {backBar("🎮 Build Your Player", onCancel)}

      <div className="bg-card border border-border rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Starting overall</div>
            <div className="text-3xl font-black tabular-nums leading-none">{liveOvr}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Room to grow</div>
            <div className={`text-3xl font-black tabular-nums leading-none ${headroom >= 20 ? "text-emerald-400" : headroom >= 8 ? "text-amber-400" : "text-red-400"}`}>{headroom}</div>
          </div>
        </div>
        <NumberStepper label="Starting overall" value={target} min={BUILD_OVR_MIN} max={BUILD_OVR_MAX} wide onChange={retarget} />
        <p className="text-[10px] text-muted-foreground leading-snug">
          {headroom <= 2
            ? `Start here and you are finished before you begin. Scouts have you at a ${ceiling} ceiling, so there is nothing left to train for and the whole development side of the game is switched off for you. Your legacy is judged on how far you climbed, and this is a climb of ${Math.max(0, ceiling - liveOvr)}.`
            : headroom <= 10
              ? `Scouts have you at a ${ceiling} ceiling, so there are ${headroom} points left in you. Starting this high buys the good years now and spends most of the climb.`
              : `Scouts have you at a ${ceiling} ceiling, so there are ${headroom} points left in you. Start low and the climb is the game.`}
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Points to spend</span>
          <span className={`text-lg font-black tabular-nums ${pool > 0 ? "text-emerald-400" : "text-foreground"}`}>{pool}</span>
        </div>
        {rows.map(r => {
          const v = (alloc as any)[r.key] as number;
          const famTop = deriveAttributes(alloc, position, physique, shape)
            .filter(d => d.family === r.key)
            .reduce((best, d) => (best && best.value >= d.value ? best : d), null as any);
          /* Found at 320 wide: the name, the bar and the standout attribute all
             on one line pushed a keeper's build screen 68px off the side of the
             phone, because "Aerial Command" and "Claiming Crosses 62" are both
             long and neither of them can shrink. The bar gets its own line
             instead, which is easier to read anyway. */
          return (
            <div key={r.key} className="rounded-lg border border-border/60 bg-muted/10 p-2 space-y-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <button type="button" onClick={() => setScreen({ kind: "family", key: r.key })} className="flex items-center gap-1 min-w-0 flex-1 text-left">
                  <span className="text-xs font-bold truncate">{r.label}</span>
                  <ChevronRight className="w-3 h-3 shrink-0 opacity-60" />
                </button>
                <span className="text-[10px] text-muted-foreground truncate max-w-[52%] tabular-nums">{famTop ? `${famTop.label} ${famTop.value}` : ""}</span>
              </div>
              <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, v)}%` }} />
              </div>
              <NumberStepper label={r.label} value={v} min={ALLOC_MIN} max={Math.min(maxStat, v + Math.max(0, pool))} onChange={(n) => setStat(r.key, n)} />
            </div>
          );
        })}
        <p className="text-[10px] text-muted-foreground text-center">Take points out of one to spend on another. Cap {maxStat} per attribute at this overall. Tap a name to shape what is underneath it.</p>
      </div>

      <button type="button" onClick={() => setScreen({ kind: "frame" })} className="w-full bg-card border border-border rounded-xl p-3 flex items-center justify-between text-left active:scale-[0.99] transition-transform">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Height and weight</div>
          <div className="text-sm font-black truncate">{physique.heightCm} cm · {physique.weightKg} kg</div>
          <div className="text-[10px] text-muted-foreground truncate">{buildLabel(physique)}</div>
        </div>
        <ChevronRight className="w-4 h-4 shrink-0 opacity-60" />
      </button>

      <div className="bg-card border border-border rounded-xl p-3 space-y-1.5">
        <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">What this build does to your seasons</div>
        <div className="flex flex-wrap gap-1.5">
          {fxLines.map(l => (
            <span key={l} className="px-2 py-1 rounded-md bg-muted/30 text-[11px] font-bold">{l}</span>
          ))}
        </div>
        <div className="pt-1 text-[11px] text-muted-foreground">
          Scouts say you play like <span className="font-black text-foreground">{comp.name}</span>
          {comp.pct > 0 ? ` (${comp.pct}% match)` : ""}
        </div>
      </div>

      {/* Stacked on a narrow phone. These two have sat side by side since
          Round 79 and shadcn's Button carries whitespace-nowrap, so at 320
          wide the Lock In button ran 68px off the right hand edge of the
          screen and could not be pressed. Nobody had measured this screen at
          320 before. */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button variant="outline" className="w-full sm:flex-1 h-11 text-sm font-bold" onClick={() => {
          const s = startRef.current as { stats: Stats; ovr: number };
          setTarget(s.ovr); setAlloc(s.stats); setBudget(sumOf(s.stats));
          onPhysique(defaultPhysique(position)); onShape({});
        }}>↩️ Reset to scout build</Button>
        <Button className="w-full sm:flex-1 h-11 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-black disabled:opacity-40" disabled={pool !== 0} onClick={() => onConfirm(alloc, liveOvr)}>
          {pool !== 0 ? `Spend your ${pool} points first` : "✅ Lock in build"}
        </Button>
      </div>
    </div>
  );
}


/* ─── Round 131: every number, on its own screen ───
   The career page shows six family bars because that is what fits on a phone.
   This is where the rest of it lives: the specifics under each family with
   their real values, the frame that is pushing some of them around, and the
   plain english summary of what the whole build is worth in a season. One tap
   in, one tap back, nothing stacked under anything else. */
function AttributesScreen({ career, onBack }: { career: CareerState; onBack: () => void }) {
  // Same reason as the build screen: a full screen swap has to bring its own top with it.
  const revealRef = useRevealScroll<HTMLDivElement>("attributes", { skipFirst: false });
  const tree = attrTreeFor(career.position);
  const derived = deriveAttributes(career, career.position, career.physique, career.attrShape);
  const phys = safePhysique(career.position, career.physique);
  const fx = careerBuildEffects(career);
  const lines = effectsSummary(fx, career.position);
  const ceiling = effectivePotential(career);
  const earned = career.potentialEarned ?? 0;

  return (
    <div ref={revealRef} className="max-w-xl mx-auto space-y-3 animate-fade-in pb-20">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-8 px-2 text-muted-foreground">← Back</Button>
        <h1 className="text-base font-black truncate">{career.playerName}, full attributes</h1>
      </div>

      <div className="bg-card border border-border rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Overall</div>
          <div className="text-2xl font-black tabular-nums">{career.overall}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Height</div>
          <div className="text-sm font-black tabular-nums pt-1.5">{heightLabel(phys.heightCm)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Weight</div>
          <div className="text-sm font-black tabular-nums pt-1.5">{weightLabel(phys.weightKg)}</div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-3 space-y-1.5">
        <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">What this build is worth</div>
        <div className="flex flex-wrap gap-1.5">
          {lines.map(l => <span key={l} className="px-2 py-1 rounded-md bg-muted/30 text-[11px] font-bold">{l}</span>)}
        </div>
        <div className="pt-1 text-[11px] text-muted-foreground">
          {buildLabel(phys)}. Scouts have your ceiling at {ceiling}
          {earned > 0 ? `, and ${earned} of that you earned by playing your way past what they first wrote down.` : "."}
        </div>
      </div>

      {tree.map(fam => (
        <div key={fam.key} className="bg-card border border-border rounded-xl p-3 space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{fam.label}</span>
            <span className="text-lg font-black tabular-nums">{Math.round((career as any)[fam.key]) || 0}</span>
          </div>
          {fam.children.map(c => {
            const d = derived.find(x => x.id === c.id);
            const v = d?.value ?? 0;
            const rc = v >= 80 ? "text-green-400" : v >= 65 ? "text-emerald-400" : v >= 50 ? "text-yellow-400" : "text-red-400";
            return (
              <div key={c.id} className="flex items-center gap-2">
                <span className="w-[6.5rem] shrink-0 text-[11px] text-muted-foreground truncate">{c.label}</span>
                <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
                  <div className={`h-full rounded-full ${FAMILY_COLORS[fam.key] || "bg-emerald-500"}`} style={{ width: `${v}%` }} />
                </div>
                {d && d.frameDelta !== 0 && (
                  <span className={`text-[9px] font-bold shrink-0 tabular-nums ${d.frameDelta > 0 ? "text-emerald-400/70" : "text-red-400/70"}`}>
                    {d.frameDelta > 0 ? "+" : ""}{d.frameDelta}
                  </span>
                )}
                <span className={`text-xs font-bold w-6 text-right shrink-0 ${rc}`}>{v}</span>
              </div>
            );
          })}
        </div>
      ))}

      <Button onClick={onBack} className="w-full h-11 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-black">Back to your career</Button>
    </div>
  );
}

/* ─── Creation Screen ─── */
function CreationScreen({ playerName, setPlayerName, nationality, setNationality, position, handlePositionChange, era, setEra, previewStats, previewOvr, isFormValid, saving, user, onBegin, onShowAuth, clubs, clubsLoading, clubsError, onRolledOvr, onStatsGenerated, appearance, setAppearance, physique, setPhysique, attrShape, setAttrShape }: any) {
  const [rolledOvr, setRolledOvr] = useState<number | null>(null);
  const [rolledPot, setRolledPot] = useState<number | null>(null);
  const [rollCount, setRollCount] = useState(0);
  const [bestPotSeen, setBestPotSeen] = useState(0);
  const [isRolling, setIsRolling] = useState(false);
  const [displayOvr, setDisplayOvr] = useState(0);
  const [academyClub, setAcademyClub] = useState<ClubData | null>(null);
  // Round 79: the attribute point-spend build editor drill-in
  const [buildOpen, setBuildOpen] = useState(false);
  /* Coming back OUT of the build editor has the same problem in reverse, so
     the creation screen brings its own top with it too. skipFirst stays on
     here, because the very first render is just the page loading and nobody
     wants a game that scrolls the moment it opens. */
  const creationRef = useRevealScroll<HTMLDivElement>(buildOpen ? "build" : "creation");

  const canGenerate = playerName.trim().length > 0 && nationality && position && era;

  const doRoll = useCallback(() => {
    /* Round 78 gave everybody three looks from the scouts and then locked it.
       Round 131 takes the lock off, because he asked for it and because he was
       right: "have unlimited rerolls so people can try to get someone with a
       higher potential." Somebody chasing a dice roll is going to chase it
       either way, and the three roll version only ever meant closing the tab
       and opening it again, which is a worse game and the same outcome. The
       odds behind the roll have not moved a point, so a generational ceiling is
       exactly as rare per roll as it has always been. */
    if (!canGenerate || clubs.length === 0 || isRolling) return;
    setIsRolling(true);
    setAcademyClub(null);
    // Slot machine animation: cycle through random numbers
    let ticks = 0;
    const totalTicks = 18;
    const interval = setInterval(() => {
      ticks++;
      setDisplayOvr(rollStartingOverall(position));
      if (ticks >= totalTicks) {
        clearInterval(interval);
        const finalOvr = rollStartingOverall(position);
        // Round 78: potential rolled alongside the overall. Weighted low,
        // tiny chance of a generational ceiling, exactly like he asked.
        const pot = rollPotential(finalOvr);
        setDisplayOvr(finalOvr);
        setRolledOvr(finalOvr);
        setRolledPot(pot);
        setRollCount(prev => prev + 1);
        setBestPotSeen(prev => Math.max(prev, pot));
        onRolledOvr?.(finalOvr, pot);
        // Generate stats that average to exactly this overall
        const stats = generateStatsFromOverall(finalOvr, position);
        onStatsGenerated?.(stats, finalOvr);
        setIsRolling(false);
        // Preview academy (era-adjusted so it matches initCareer)
        const startYr = ERAS.find(er => er.value === era)?.startYear ?? 2020;
        const club = getYouthAcademyClub(adjustClubsForYear(clubs, startYr), nationality, finalOvr);
        setAcademyClub(club);
      }
    }, 60);
  }, [canGenerate, clubs, nationality, position, isRolling, era]);

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
    onRolledOvr?.(calcOvr, pot);
    onStatsGenerated?.(stats, calcOvr);
    setBuildOpen(false);
    /* Round 131: the academy that takes you depends on how good you are, and
       the build screen can now move that by fifty points, so the placement
       preview underneath has to be recalculated or it is quietly lying. */
    const startYr = ERAS.find(er => er.value === era)?.startYear ?? 2020;
    setAcademyClub(getYouthAcademyClub(adjustClubsForYear(clubs, startYr), nationality, calcOvr));
  };

  // Tile rule: the build editor takes over the whole screen with a back button
  if (buildOpen && previewStats && rolledOvr !== null) {
    return (
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
          <Input id="pname" placeholder="Enter your player name..." value={playerName} onChange={(e: any) => setPlayerName(e.target.value)} maxLength={40} className="bg-muted/30" />
        </div>
        <div className="space-y-1.5">
          <Label>Nationality</Label>
          {/* Round 76: position="popper" pins the list BELOW the trigger with
              its own scroll, fixing his bug where the item-aligned popup shot
              off the top of the screen and cut off the first nations. Flag
              sits to the RIGHT of the name, exactly as he asked. */}
          <Select value={nationality} onValueChange={setNationality}>
            <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Choose nationality" /></SelectTrigger>
            <SelectContent position="popper" className="max-h-72">
              {NATIONALITIES.map(n => (
                <SelectItem key={n} value={n}>
                  <span className="flex items-center gap-2">{n}<FlagImg name={n} size={18} /></span>
                </SelectItem>
              ))}
            </SelectContent>
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

      {/* Round 54: create your appearance */}
      <AppearanceBuilder
        appearance={appearance}
        onChange={setAppearance}
        clubColor={academyClub?.color || "#10B981"}
      />

      {/* Generate Starting Potential */}
      {canGenerate && (
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 space-y-4">
          <h2 className="text-base font-bold text-center">Starting Potential</h2>

          {clubsLoading && (
            <div className="rounded-xl border border-border bg-muted/10 p-4 text-center text-sm text-muted-foreground animate-pulse">
              Loading clubs...
            </div>
          )}
          {!clubsLoading && clubsError && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-center text-xs text-amber-400">
              Couldn't reach the live club database, so we loaded a backup roster. Everything still works.
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
                  <div className={`text-sm font-bold ${potentialTier(rolledPot).color}`}>
                    {potentialTier(rolledPot).label} · {rolledPot} ceiling
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={doRoll}
              disabled={isRolling || clubsLoading}
              className={`flex-1 h-11 text-sm font-bold text-black ${rolledOvr !== null ? "bg-muted/40 hover:bg-muted/60 text-foreground" : "bg-emerald-600 hover:bg-emerald-500"}`}
              variant={rolledOvr !== null ? "outline" : "default"}
            >
              {clubsLoading ? "Loading..." : isRolling ? "🎰 Rolling..." : rolledOvr !== null ? "🎲 Roll again" : "🎲 Generate Starting Potential"}
            </Button>
          </div>
          {rolledOvr !== null && !isRolling && (
            <p className="text-[11px] text-muted-foreground text-center">
              Roll {rollCount}. Reroll as many times as you like, it costs nothing.
              {bestPotSeen > (rolledPot ?? 0) ? ` Best ceiling you have turned up so far: ${potentialTier(bestPotSeen).label.toLowerCase()}.` : ""}
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
            {getPositionStatBars(position, { ...previewStats, physique, attrShape }).map(s => <StatBarGame key={s.l} label={s.l} value={s.v} color={s.c} top={s.top} />)}
          </div>
          {/* Round 79: who your build plays like, live off the actual numbers */}
          {!isRolling && (() => { const comp = playsLike(previewStats, position); return (
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

      <Button onClick={onBegin} disabled={!isFormValid || saving || rolledOvr === null}
        className="w-full h-12 text-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-black disabled:opacity-40">
        {saving ? "Creating..." : "⚽ Begin Career"}
      </Button>
      {rolledOvr === null && canGenerate && <p className="text-xs text-muted-foreground text-center">Generate your starting potential to begin</p>}
      {!user && <p className="text-xs text-muted-foreground text-center">Sign in to save your career</p>}
    </div>
  );
}

/* ─── Transfer Window Card ─── */
function TransferWindowCard({ situation, career, onAcceptOffer, onStay, onSignExtension, onRequestTransfer, onAcceptLoan }: {
  situation: TransferSituation;
  career: CareerState;
  onAcceptOffer: (offer: ContractOffer) => void;
  onStay: () => void;
  onSignExtension: () => void;
  onRequestTransfer: () => void;
  onAcceptLoan: (offer: ContractOffer) => void;
}) {
  const isExpiring = career.contractYearsLeft <= 1;
  /* Round 217: the projection quoted here is drawn from the same band table
     the season simulation rolls from, so this line can never overpromise. */
  const seasonsHere = career.seasons.filter(ss => ss.club === career.currentClub && ss.type === "playing").length;
  const projHere = projectLeagueApps(career.overall, career.currentClubTier, career.currentClub, seasonsHere);

  return (
    <div className="space-y-3">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
        <h3 className="text-lg font-black">🔄 Transfer Window</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {isExpiring ? "⚠️ Your contract is expiring. Decide your future" : "End of season. Review your options"}
        </p>
        <div className="flex items-center justify-center gap-3 mt-2 text-xs text-muted-foreground">
          <span>📋 {career.contractYearsLeft}yr left</span>
          <span>💰 {formatWage(career.weeklyWage)}</span>
          <span>🏷️ {money(`€${career.marketValue >= 1 ? career.marketValue.toFixed(0) : career.marketValue.toFixed(1)}M`)} value</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Projected at {career.currentClub} next season: <span className="font-bold text-foreground">about {projHere.min} to {projHere.max} league games</span>
        </p>
      </div>

      {/* Round 217: the loan window. Only appears when the projection above
          says fringe and the player is young with contract to run. */}
      {career.pendingLoanOffers && career.pendingLoanOffers.length > 0 && (
        <div className="space-y-2">
          <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-3 text-center">
            <span className="text-sm font-bold">🛫 The loan window is open</span>
            <p className="text-xs text-muted-foreground mt-1">
              Clubs further down want to hand you the minutes {career.currentClub} will not. Contract and wage stay where they are, only the football moves. One season, then back.
            </p>
          </div>
          {career.pendingLoanOffers.map(offer => {
            const lp = projectLeagueApps(career.overall, offer.club.tier, offer.club.name, 0);
            return (
              <div key={offer.club.name} className="bg-card border border-border rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate flex items-center gap-1"><FlagImg name={offer.club.country} size={16} />{offer.club.name}</div>
                    <div className="text-xs text-muted-foreground">{offer.club.league} · season long loan</div>
                  </div>
                  <div className="text-right text-xs shrink-0">
                    <div className="font-bold text-foreground">about {lp.min} to {lp.max}</div>
                    <div className="text-muted-foreground">league games</div>
                  </div>
                </div>
                <Button onClick={() => onAcceptLoan(offer)} className="w-full h-9 text-sm bg-sky-500 hover:bg-sky-400 text-black">
                  Go on loan 🛫
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Round 257, his ask: "make it that if u play poorly enough. A team
          just drops u from the squad and ur a free agent or they list for
          transfers or loans." The club's verdict, with the facts it was
          built from printed underneath it, so a release can always be
          traced back to the season card that caused it. */}
      {situation.type === "frozen_out" && (
        <div className="space-y-3">
          <div className="bg-red-500/10 border-2 border-red-500/40 rounded-xl p-4 space-y-2">
            <div className="text-center space-y-1">
              <div className="text-3xl">{situation.mode === "released" ? "📄" : situation.mode === "loan_listed" ? "🛫" : "📤"}</div>
              <h3 className="text-base font-black">
                {situation.mode === "released"
                  ? `${career.currentClub} have released you`
                  : situation.mode === "loan_listed"
                    ? `${career.currentClub} want you out on loan`
                    : `${career.currentClub} have transfer listed you`}
              </h3>
              <p className="text-xs text-muted-foreground">
                {situation.mode === "released"
                  ? "Contract torn up. You are a free agent and the phone is quieter than it was."
                  : situation.mode === "loan_listed"
                    ? "You are not in the plans. Go and play somewhere, then we will talk."
                    : "You can stay. You will not play."}
              </p>
            </div>
            <div className="bg-background/40 rounded-lg p-2.5 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">What they said</div>
              {situation.reasons.map((r, i) => (
                <div key={i} className="text-[11px] flex gap-1.5">
                  <span className="text-red-400 shrink-0">▪</span>
                  <span>{r}</span>
                </div>
              ))}
              {/* Round 263: the squad line, when we have the real squad for
                  that club and season. DISPLAY ONLY and deliberately kept out
                  of seasonStrikes, because that list decides the verdict and
                  a fourth entry in it would move the trigger rate that Round
                  257 measured and tuned. This just puts a name to the wall he
                  was up against. */}
              {(() => {
                const year = career.seasons[career.seasons.length - 1]?.year;
                if (!year) return null;
                const chart = depthChart(career.currentClub, year, career.position, career.overall, career.playerName);
                if (!chart || chart.ahead === 0) return null;
                return (
                  <div className="text-[11px] flex gap-1.5">
                    <span className="text-red-400 shrink-0">▪</span>
                    <span>
                      You were {ordinalPlace(chart.ahead + 1)} of {chart.men.length} {GROUP_LABEL[chart.group]} at {chart.club}
                      {chart.aheadOfMe ? `, behind ${chart.aheadOfMe.name}` : ""}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>

          {situation.offers.map(offer => (
            offer.isLoan ? (
              <div key={offer.club.name} className="bg-card border border-border rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate flex items-center gap-1"><FlagImg name={offer.club.country} size={16} />{offer.club.name}</div>
                    <div className="text-xs text-muted-foreground">{offer.club.league} · season long loan</div>
                  </div>
                  <div className="text-right text-xs shrink-0">
                    <div className="font-bold text-foreground">about {projectLeagueApps(career.overall, offer.club.tier, offer.club.name, 0).min} to {projectLeagueApps(career.overall, offer.club.tier, offer.club.name, 0).max}</div>
                    <div className="text-muted-foreground">league games</div>
                  </div>
                </div>
                <Button onClick={() => onAcceptLoan(offer)} className="w-full h-9 text-sm bg-sky-500 hover:bg-sky-400 text-black">
                  Go on loan 🛫
                </Button>
              </div>
            ) : (
              <OfferCard
                key={offer.club.name}
                offer={offer}
                career={career}
                onAccept={() => onAcceptOffer(offer)}
                actionLabel={situation.mode === "released" ? "Sign as a free agent ✍️" : "Accept and go ✍️"}
              />
            )
          ))}

          {situation.offers.length === 0 && (
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <p className="text-sm">Nobody has come in for you. You are staying whether the club likes it or not.</p>
            </div>
          )}

          {situation.mode !== "released" && (
            <Button variant="outline" onClick={onStay} className="w-full h-9 text-sm">
              Refuse to leave {career.currentClub} 🧊
            </Button>
          )}
          {situation.mode !== "released" && (
            <p className="text-[11px] text-muted-foreground text-center">
              Staying means a season of reserve football: a quarter of the minutes, eight league games at the very most.
            </p>
          )}
        </div>
      )}

      {/* Situation: No Interest */}
      {situation.type === "no_interest" && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-sm text-center">No clubs have made an offer. Your club wants to keep you.</p>
          <div className="flex gap-2">
            <Button onClick={onStay} className="flex-1 h-9 text-sm bg-emerald-600 hover:bg-emerald-500 text-black">
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
          <OfferCard offer={situation.offer} onAccept={() => onAcceptOffer(situation.offer)} actionLabel="Accept Offer ✍️" career={career} />
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
          <OfferCard offer={situation.offerA} onAccept={() => onAcceptOffer(situation.offerA)} actionLabel="Join Club A ✍️" career={career} />
          <OfferCard offer={situation.offerB} onAccept={() => onAcceptOffer(situation.offerB)} actionLabel="Join Club B ✍️" career={career} />
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
            <p className="text-xs text-muted-foreground mt-1">A top club wants you, but they're offering below market value</p>
          </div>
          <OfferCard offer={situation.offer} onAccept={() => onAcceptOffer(situation.offer)} actionLabel="Accept pay cut for dream move ⭐" career={career} />
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
          <Button onClick={onSignExtension} className="w-full h-9 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-black">
            Sign Extension with {career.currentClub} 📝
          </Button>
          {situation.offers.map((offer) => (
            <OfferCard key={offer.club.name} offer={offer} onAccept={() => onAcceptOffer(offer)} actionLabel="Leave on free transfer ✍️" career={career} />
          ))}
        </div>
      )}

      {/* Situation: Request Result */}
      {situation.type === "request_result" && situation.offer && (
        <div className="space-y-3">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
            <span className="text-sm font-bold">📩 A club has responded to your transfer request!</span>
          </div>
          <OfferCard offer={situation.offer} onAccept={() => onAcceptOffer(situation.offer)} career={career} />
          <Button variant="outline" onClick={onStay} className="w-full h-9 text-sm">
            Changed my mind, stay at {career.currentClub}
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
    <div className={`rounded-xl border-2 p-5 space-y-4 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-500 ${categoryColors[event.category] || "border-border bg-card"}`}>
      <div className="text-center space-y-2">
        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
          {categoryLabels[event.category]} · {remaining} event{remaining !== 1 ? "s" : ""} remaining
        </span>
        <div className="text-4xl">{event.emoji}</div>
        <h3 className="text-lg font-black">{event.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{money(event.description)}</p>
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
            <div className="text-[11px] mt-1 opacity-80 ml-8">{money(choice.consequence)}</div>
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
      <div className="flex justify-center"><FlagImg name={career.nationality} size={48} /></div>
      <h3 className="text-2xl font-black tracking-tight">INTERNATIONAL DEBUT</h3>
      <p className="text-sm text-muted-foreground">
        {career.playerName} has been called up to the <strong>{career.nationality}</strong> national team!
      </p>
      <div className="flex items-center justify-center gap-3 text-sm">
        <span><FlagImg name={career.nationality} size={24} /></span>
        <span className="font-bold">{career.nationality}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">Age {career.age}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">OVR {career.overall}</span>
      </div>
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
        <p className="text-xs text-amber-300">🎉 Massive morale boost! Your international journey begins.</p>
      </div>
      <Button onClick={onDismiss} className="w-full h-10 text-sm font-bold bg-amber-600 hover:bg-amber-500 text-black">
        Continue →
      </Button>
    </div>
  );
}

/* ─── World Cup Result Screen ─── */
function WorldCupResultCard({ wc, career, onDismiss, onSpeech }: { wc: WorldCupResult; career: CareerState; onDismiss: () => void; onSpeech: (choice: WorldCupSpeechChoice) => void }) {
  const isWinner = wc.result === "Winner";
  const didNotQualify = wc.result === "Did Not Qualify";
  const borderColor = isWinner ? "border-amber-400/60" : didNotQualify ? "border-red-500/40" : "border-blue-500/40";
  const bgGrad = isWinner ? "from-amber-500/15 to-transparent" : didNotQualify ? "from-red-500/10 to-transparent" : "from-blue-500/10 to-transparent";
  return (
    <div className={`relative rounded-xl border-2 ${borderColor} bg-gradient-to-b ${bgGrad} p-5 space-y-4 animate-in fade-in zoom-in-95 duration-500`}>
      {isWinner && <Confetti pieces={70} gold />}
      <div className="text-center space-y-2">
        <div className="text-4xl">{isWinner ? "🏆" : didNotQualify ? "😞" : "🌍"}</div>
        <h3 className="text-xl font-black">{isWinner ? "WORLD CUP WINNER!" : didNotQualify ? "World Cup Qualifiers" : `World Cup ${wc.year}`}</h3>
        <p className="text-sm font-bold flex items-center justify-center gap-1"><FlagImg name={wc.nation} />{wc.nation}: {wc.result}</p>
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
                  <FlagImg name={m.teamA} size={16} />{m.teamA}
                </span>
                <span className="font-black text-sm mx-2">{m.scoreA} - {m.scoreB}</span>
                <span className={`font-semibold ${m.teamB === wc.nation ? "text-foreground" : "text-muted-foreground"}`}>
                  {m.teamB} <FlagImg name={m.teamB} size={16} />
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
      {isWinner ? (
        <div className="space-y-1.5">
          <p className="text-center text-[11px] font-bold uppercase tracking-wider text-amber-300 animate-fade-in">The microphone is yours. The speech:</p>
          <Button onClick={() => onSpeech("for_the_country")} className="w-full h-auto py-2.5 text-xs font-bold text-black bg-amber-600 hover:bg-amber-500 justify-start text-left whitespace-normal">
            🏆 Dedicate it to every kid back home
          </Button>
          <Button onClick={() => onSpeech("shirt_to_the_fans")} className="w-full h-auto py-2.5 text-xs font-bold text-black bg-amber-600 hover:bg-amber-500 justify-start text-left whitespace-normal">
            🎽 Throw your shirt into the away end
          </Button>
          <Button onClick={() => onSpeech("call_out_doubters")} className="w-full h-auto py-2.5 text-xs font-bold text-black bg-amber-700 hover:bg-amber-600 justify-start text-left whitespace-normal">
            📢 Name the pundits who wrote you off
          </Button>
          <Button onClick={() => onSpeech("quiet_lap")} className="w-full h-auto py-2.5 text-xs font-bold text-white bg-muted hover:bg-muted/80 justify-start text-left whitespace-normal">
            🚶 Say nothing. Walk one slow lap with the trophy
          </Button>
        </div>
      ) : (
        <Button onClick={onDismiss} className="w-full h-10 text-sm font-bold text-black bg-emerald-600 hover:bg-emerald-500">
          Continue →
        </Button>
      )}
    </div>
  );
}

/* ─── International Stats Panel ─── */
function InternationalStatsPanel({ career, onRetire }: { career: CareerState; onRetire: () => void }) {
  const is = career.intStats;
  const hasHistory = (career.intlHistory ?? []).length > 0;
  if (!career.internationalCareer && !is.isRetired && is.caps === 0 && !hasHistory) return null;
  const isLegend = is.caps >= 100;
  return (
    <div className={`bg-card border rounded-xl p-4 space-y-3 ${isLegend ? "border-amber-500/30" : "border-border"}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <FlagImg name={career.nationality} size={16} /> International Career {isLegend && "⭐ LEGEND"}
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
        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-xs text-muted-foreground">
          {is.worldCups > 0 && <span>🌍 {is.worldCups} World Cup{is.worldCups === 1 ? "" : "s"}, won {is.worldCupWins}</span>}
          {is.continentals > 0 && <span>🏆 {is.continentals} continental, won {is.continentalWins}</span>}
        </div>
      )}
      {/* Round 124: the summers that went against you are part of the story. */}
      {((is.squadSnubs ?? 0) > 0 || (is.failedQualifications ?? 0) > 0) && (
        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[11px] text-muted-foreground">
          {(is.failedQualifications ?? 0) > 0 && <span>😞 Missed out {is.failedQualifications} time{is.failedQualifications === 1 ? "" : "s"} on qualifying</span>}
          {(is.squadSnubs ?? 0) > 0 && <span>📋 Left out of {is.squadSnubs} squad{is.squadSnubs === 1 ? "" : "s"}</span>}
        </div>
      )}
      <InternationalHistoryTile
        history={career.intlHistory ?? []}
        nation={career.nationality}
        last={career.lastTournament ?? null}
      />
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
        <p className="text-sm text-muted-foreground leading-relaxed">{money(event.description)}</p>
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
      <Button onClick={onDismiss} className="w-full h-10 text-sm font-bold bg-orange-600 hover:bg-orange-500 text-black">
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
        <span className="font-bold text-orange-400 inline-flex items-center gap-1"><FlagImg name={rival.nationality} size={16} />{rival.name}</span>
      </div>
      <div className="text-[10px] text-center text-muted-foreground mb-1">
        {rival.club} · OVR {rival.overall} · Age {rival.age}
      </div>
      {rows.map(r => (
        <div key={r.l} className="flex items-center justify-between text-xs">
          <span className={`font-bold w-12 text-right ${r.p > r.r ? "text-emerald-400" : r.p < r.r ? "text-muted-foreground" : "text-foreground"}`}>
            {r.l === "Market Value" ? money(`€${(r.p as number).toFixed(0)}M`) : r.p}
          </span>
          <span className="text-[10px] text-muted-foreground flex-1 text-center">{r.l}</span>
          <span className={`font-bold w-12 text-left ${r.r > r.p ? "text-orange-400" : r.r < r.p ? "text-muted-foreground" : "text-foreground"}`}>
            {r.l === "Market Value" ? money(`€${(r.r as number).toFixed(0)}M`) : r.r}
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
        <p className="text-sm text-muted-foreground">{career.playerName} vs {rival.name}: Career Rivalry</p>
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
/* ─── Round 262: your place in the squad ───
   Sign for Arsenal and the question that decides your whole season is who is
   ahead of you. The game used to answer it with a projected number of games
   and no names. This is the real squad, in the real season, with you slotted
   in at your rating, and a tile for the whole thing.

   It renders NOTHING when there is no honest answer: a club outside the hand
   written map, a season outside the baked window, or a squad the data cannot
   fill. No generated teammates stand in, because there is no honest way to
   invent the squad of a real club in a real season. */
/** 1st, 2nd, 3rd, 11th. Used by the verdict screen's squad line. */
function ordinalPlace(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suf = teen ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
  return `${n}${suf}`;
}

function SquadManRow({ man, rank }: { man: SquadMan; rank: number }) {
  return (
    <div
      data-squad-man={man.me ? "me" : "other"}
      className={`grid grid-cols-[auto_1fr_auto_auto] gap-x-2 items-center text-[11px] rounded-md px-2 py-1 ${
        man.me ? "bg-gold/15 border border-gold/50 font-bold" : "bg-muted/20"
      }`}
    >
      <span className="text-muted-foreground w-4 shrink-0 tabular-nums">{rank}</span>
      <span className="truncate">{man.name}</span>
      <span className="text-[9px] uppercase tracking-wide text-muted-foreground w-8 text-right">{man.pos}</span>
      <span className="w-6 text-right tabular-nums font-black">{man.ovr}</span>
    </div>
  );
}

function SquadDepthCard({ chart }: { chart: DepthChart }) {
  const [open, setOpen] = useState(false);
  const revealRef = useRevealScroll<HTMLDivElement>(open);
  const label = GROUP_LABEL[chart.group];

  if (open) {
    return (
      <div ref={revealRef} className="rounded-xl border border-border bg-card p-3 space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {chart.club}, {chart.year}/{(chart.year + 1).toString().slice(-2)}
        </div>
        <div className="space-y-1 max-h-[300px] overflow-y-auto scrollbar-thin">
          {chart.squad.map((m, i) => <SquadManRow key={`${m.name}-${i}`} man={m} rank={i + 1} />)}
        </div>
        <p className="text-[10px] text-muted-foreground">
          The real {chart.club} squad that season, rated on the same scale as the rest of the site.
        </p>
        <Button variant="outline" onClick={() => setOpen(false)} className="w-full h-8 text-xs font-bold">← Back</Button>
      </div>
    );
  }

  return (
    <div ref={revealRef} className="rounded-xl border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Your place in the squad
        </span>
        <span className="text-[9px] text-muted-foreground">{chart.year}/{(chart.year + 1).toString().slice(-2)}</span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {chart.ahead === 0
          ? `Nobody at ${chart.club} is rated above you among the ${label}. The shirt is yours to lose.`
          : `${chart.ahead} of ${chart.club}'s ${label} are rated above you${chart.aheadOfMe ? `, and ${chart.aheadOfMe.name} is the one directly in front` : ""}.`}
      </p>
      <div className="space-y-1">
        {chart.men.slice(0, 6).map((m, i) => <SquadManRow key={`${m.name}-${i}`} man={m} rank={i + 1} />)}
      </div>
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-muted/20 hover:bg-muted/40 border border-border rounded-lg p-2 text-left transition-colors"
      >
        <div className="text-[11px] font-bold">👥 The whole squad</div>
        <div className="text-[9px] text-muted-foreground">{chart.squad.length} players at {chart.club}</div>
      </button>
    </div>
  );
}

function FinancialPanel({ career, onCurrencyChange }: { career: CareerState; onCurrencyChange?: () => void }) {
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

      {/* Round 258: the currency picker, and the line that keeps it honest.
          Every figure on this page is converted from the euro the engine
          actually stores, at published central bank rates for one stated day,
          so the note under it says which day rather than pretending to be
          live. Choosing euro removes the note because nothing is converted. */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-muted-foreground">Show money in</span>
        <select
          aria-label="Display currency"
          value={getCurrency().code}
          onChange={e => { setCurrency(e.target.value); onCurrencyChange?.(); }}
          className="bg-muted/30 border border-border rounded-md text-[10px] px-1.5 py-0.5 text-foreground"
        >
          {CURRENCIES.map(c => (
            <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
          ))}
        </select>
        {rateNote() && <span className="text-[10px] text-muted-foreground">{rateNote()}</span>}
      </div>

      {/* Financial details row */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
        {(career.totalAssetValue || 0) > 0 && <span>🏠 Assets: {money(`€${(career.totalAssetValue || 0).toFixed(1)}M`)}</span>}
        {career.sponsorshipIncome > 0 && <span>🤝 Sponsor: {money(`€${career.sponsorshipIncome.toFixed(1)}M`)}/yr</span>}
        {career.lifestyleCostPerYear > 0 && <span>💸 Costs: {money(`€${career.lifestyleCostPerYear.toFixed(1)}M`)}/yr</span>}
        {career.agentFeesPaid > 0 && <span>🕴️ Agent fees: {money(`€${career.agentFeesPaid.toFixed(1)}M`)} total</span>}
        {career.activeSponsorship && (() => {
          const tier = SPONSORSHIP_TIERS.find(t => t.tier === career.activeSponsorship);
          return tier ? <span className="text-blue-400">{tier.emoji} {tier.name}: {money(`€${tier.income}M`)}/yr</span> : null;
        })()}
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

      {/* Persona & Agent (Round 49) */}
      {(career.personality || career.agentId) && (
        <div className="flex items-center gap-2 text-[10px] flex-wrap">
          {(() => {
            const p = getPersonalityDef(career.personality);
            return p ? (
              <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400" title={p.perk}>
                {p.emoji} {p.name}
              </span>
            ) : null;
          })()}
          {(() => {
            const a = getAgentDef(career.agentId);
            if (!a) return null;
            return a.id === "self" ? (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400" title={a.blurb}>🤝 Self-represented</span>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400" title={a.blurb}>
                {a.emoji} Agent: {a.name}
              </span>
            );
          })()}
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

      {/* Round 54: the heat meter. Only appears once you have something to hide. */}
      {((career.corruptionHeat ?? 0) > 0 || (career.dirtyMoney ?? 0) > 0) && (() => {
        const h = career.corruptionHeat ?? 0;
        const band = heatLabel(h);
        return (
          <div className="rounded-lg border border-red-500/25 bg-red-500/5 p-2.5 space-y-1.5 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">🕶️ Heat</span>
              <span className={`text-[10px] font-black ${band.tone}`}>{band.label}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${h >= 70 ? "bg-red-500" : h >= 40 ? "bg-orange-500" : "bg-amber-500"}`}
                style={{ width: `${h}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground leading-snug">{band.blurb}</p>
            {(career.dirtyMoney ?? 0) > 0 && (
              <p className="text-[10px] text-red-400 font-bold">
                💼 {formatNetWorth(career.dirtyMoney ?? 0)} unexplained. Wash it through the Shady aisle or it keeps burning.
              </p>
            )}
          </div>
        );
      })()}
    </div>
  );
}

/* ─── Ballon d'Or Ceremony Screen ─── */
function BallonDorCeremonyCard({ bdor, career, onDismiss, onSpeech }: { bdor: BallonDorResult; career: CareerState; onDismiss: () => void; onSpeech: (choice: BdorSpeechChoice) => void }) {
  const isWinner = bdor.playerRank === 1;
  const isPodium = bdor.playerRank !== null && bdor.playerRank <= 3;
  const isNominated = bdor.playerNominated;
  const borderColor = isWinner ? "border-amber-400/60" : isPodium ? "border-amber-500/30" : "border-border";
  const bgGrad = isWinner ? "from-amber-500/20 to-transparent" : isPodium ? "from-amber-500/10 to-transparent" : "from-transparent to-transparent";
  
  const rankEmoji = (rank: number) => rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`;
  
  return (
    <div className={`relative rounded-xl border-2 ${borderColor} bg-gradient-to-b ${bgGrad} p-5 space-y-4 animate-in fade-in zoom-in-90 duration-700`}>
      {isWinner && <Confetti pieces={70} gold />}
      <div className="text-center space-y-2">
        {career.appearance && (
          <div className="flex justify-center">
            <div className={`rounded-xl overflow-hidden border-2 ${isWinner ? "border-amber-400/70 animate-trophy-glow" : "border-border"} bg-muted/20`}>
              <PlayerAvatar appearance={career.appearance} clubColor={career.currentClubColor} size={isWinner ? 88 : 64} animate />
            </div>
          </div>
        )}
        <div className={`text-5xl ${isWinner ? "animate-trophy-glow" : ""}`}>{isWinner ? "🏅" : "⭐"}</div>
        <h3 className="text-xl font-black tracking-tight">
          {isWinner ? "BALLON D'OR WINNER!" : `Ballon d'Or ${bdor.year}`}
        </h3>
        {isWinner && (
          <p className="text-sm text-amber-300 font-bold">{money('The best player in the world! Legacy +20, Market Value +€15M')}</p>
        )}
        {!isWinner && isNominated && bdor.playerRank !== null && bdor.playerRank <= 3 && (
          <p className="text-sm text-muted-foreground">You finished {bdor.playerRank === 2 ? "2nd" : "3rd"}! Legacy +5</p>
        )}
        {!isWinner && isNominated && bdor.playerRank !== null && bdor.playerRank > 3 && (
          <p className="text-sm text-muted-foreground">You finished {bdor.playerRank}th, close but not enough this year</p>
        )}
        {!isNominated && bdor.playerRank !== null && bdor.playerRank > 10 && (
          <p className="text-sm text-muted-foreground">Outside the top 10, but you ranked <span className="font-bold text-foreground">#{bdor.playerRank}</span> in the world&apos;s Top 30</p>
        )}
        {!isNominated && bdor.playerRank === null && (
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
                  <FlagImg name={n.nationality} size={14} />{n.name}
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
      
      <Button onClick={onDismiss} className={`w-full h-10 text-sm font-bold text-black ${isWinner ? "bg-amber-600 hover:bg-amber-500" : "bg-emerald-600 hover:bg-emerald-500"}`}>
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
    <div className="relative rounded-xl border-2 border-amber-400/40 bg-gradient-to-b from-amber-500/10 to-transparent p-5 space-y-4">
      {(legacy.tier === "GOAT" || legacy.tier === "LEGEND") && <Confetti pieces={60} gold />}
      <div className="text-center space-y-2">
        {career.appearance ? (
          <div className="flex justify-center">
            <div className="rounded-xl overflow-hidden border-2 border-amber-400/50 bg-muted/20">
              <PlayerAvatar appearance={career.appearance} clubColor={career.currentClubColor} size={96} />
            </div>
          </div>
        ) : (
          <div className="text-5xl">👋</div>
        )}
        <h3 className="text-xl font-black tracking-tight">RETIREMENT</h3>
        <p className="text-sm text-muted-foreground flex items-center justify-center gap-1"><FlagImg name={career.nationality} />{career.playerName} retires at age {career.age}</p>
      </div>

      {/* Career summary grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { l: "Apps", v: totals.apps }, { l: "Goals", v: totals.goals }, { l: "Assists", v: totals.assists },
          { l: "Trophies", v: totals.leagueTitles + totals.domesticCups + totals.championsLeagues + totals.worldCups + totals.continentalCups },
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
        <div className="text-4xl font-black tabular-nums"><CountUp value={legacy.score} duration={1400} /><span className="text-lg text-muted-foreground">/100</span></div>
      </div>

      {/* Post-retirement choices */}
      <div className="space-y-2">
        <div className="text-xs text-center text-muted-foreground font-bold uppercase">What's Next?</div>
        <Button onClick={() => onPostRetirement("retire")} className="w-full h-11 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-black">
          🏖️ Retire and Enjoy Life
        </Button>
        <Button onClick={() => onPostRetirement("manager")} variant="outline" className="w-full h-11 text-sm font-bold">
          📋 Become a Manager
        </Button>
        <Button onClick={() => onPostRetirement("pundit")} variant="outline" className="w-full h-11 text-sm font-bold">
          🎙️ Become a TV Pundit
        </Button>
        {career.netWorth >= 200 && (
          <Button onClick={() => onPostRetirement("owner")} variant="outline" className="w-full h-11 text-sm font-bold">
            🏟️ Buy a Football Club ({formatNetWorth(career.netWorth)} net worth)
          </Button>
        )}
      </div>
    </div>
  );
}

/* ─── Post-Retirement Card (unused since choices are in ceremony, but kept for direct phase) ─── */
function PostRetirementCard({ career, onChoice }: { career: CareerState; onChoice: (c: PostRetirementChoice) => void }) {
  return (
    <div className="rounded-xl border border-border p-5 space-y-3 text-center">
      <h3 className="text-lg font-black">What's Next?</h3>
      <Button onClick={() => onChoice("retire")} className="w-full h-11 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-black">🏖️ Retire and Enjoy Life</Button>
      <Button onClick={() => onChoice("manager")} variant="outline" className="w-full h-11 text-sm font-bold">📋 Become a Manager</Button>
      <Button onClick={() => onChoice("pundit")} variant="outline" className="w-full h-11 text-sm font-bold">🎙️ Become a TV Pundit</Button>
      {career.netWorth >= 200 && (
        <Button onClick={() => onChoice("owner")} variant="outline" className="w-full h-11 text-sm font-bold">🏟️ Buy a Football Club</Button>
      )}
    </div>
  );
}

/* ─── Manager Panel ─── */
function ManagerPanel({ manager, career, onAdvance, onEnd, onAcceptOffer }: { manager: ManagerState; career: CareerState; onAdvance: () => void; onEnd: () => void; onAcceptOffer?: (i: number) => void }) {
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

      {/* Round 227: the season is a table now, so show it: the leaders plus
          your own row, the W-D-L line, and how the cup run ended. */}
      {(() => {
        const last = manager.seasonResults[manager.seasonResults.length - 1];
        if (!last?.table) return null;
        return (
          <div className="rounded-xl border border-border bg-muted/10 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Final table</span>
              {last.record && <span className="text-[10px] text-muted-foreground">{last.record}</span>}
            </div>
            {last.table.map(row => (
              <div
                key={row.club}
                className={`flex items-center justify-between text-xs rounded px-2 py-1 ${row.you ? "bg-primary/15 font-bold" : ""}`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-5 shrink-0 text-right text-muted-foreground">{row.pos}</span>
                  <span className="truncate">{row.club}</span>
                </span>
                <span className="shrink-0 tabular-nums">{row.pts} pts</span>
              </div>
            ))}
            {last.cup && (
              <p className="pt-1 text-[10px] text-muted-foreground">Cup run: {last.cup}</p>
            )}
          </div>
        );
      })()}

      {/* Round 111: out of work, with a feed you had to earn. */}
      {manager.unemployed && (
        <div className="rounded-xl border-2 border-amber-500/50 bg-amber-500/5 p-3 space-y-2">
          <div className="text-center">
            <div className="text-2xl">📪</div>
            <h4 className="text-sm font-black">OUT OF WORK</h4>
            <p className="text-[11px] text-muted-foreground">
              {(manager.seasonsOut ?? 0) === 0 ? 'Just sacked' : `${manager.seasonsOut} season${manager.seasonsOut === 1 ? '' : 's'} without a club`}
            </p>
          </div>
          {manager.offerNote && (
            <p className="text-[11px] text-center text-muted-foreground italic">{manager.offerNote}</p>
          )}
          {(manager.offers ?? []).map((o, i) => (
            <button
              key={`${o.club}-${i}`}
              onClick={() => onAcceptOffer?.(i)}
              className="w-full text-left rounded-lg border border-border bg-card hover:border-primary p-2.5 transition-all"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black truncate">{o.club}</span>
                <span className="text-[9px] text-muted-foreground shrink-0">Tier {o.tier} · {o.league}</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{o.brief}</div>
              <div className="text-[10px] text-amber-400/90 mt-0.5">{o.reason}</div>
            </button>
          ))}
          {(manager.offers ?? []).length === 0 && (
            <p className="text-[10px] text-center text-muted-foreground">
              Sit out another season and see who comes calling. It gets harder every year you wait.
            </p>
          )}
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

  const totalTrophies = totals.leagueTitles + totals.domesticCups + totals.championsLeagues + totals.worldCups + totals.continentalCups;

  return (
    <div className={`rounded-xl border-2 ${tierBorder[legacy.tier]} bg-card p-5 space-y-4`}>
      <div className="text-center space-y-1">
        <div className="text-4xl">{tierEmoji[legacy.tier]}</div>
        <div className={`text-2xl font-black ${tierColors[legacy.tier]}`}>{legacy.tier}</div>
        <div className="text-4xl font-black">{legacy.score}<span className="text-base text-muted-foreground">/100</span></div>
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><FlagImg name={career.nationality} size={16} />{career.playerName} · {career.position}</p>
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

      {/* Owner results */}
      {career.ownerState && career.ownerState.seasonResults.length > 0 && (
        <div className="text-center text-xs text-muted-foreground">
          🏟️ Owner: {career.ownerState.trophies} trophies, {career.ownerState.promotions} promotions in {career.ownerState.season} seasons
        </div>
      )}

      <ShareButtons
        score={`${legacy.tier}: ${legacy.score}/100`}
        gameName="Soccer Career"
        gamePath="/soccer-career"
        customText={generateShareText(career)}
      />
    </div>
  );
}

/* ─── Round 134: the door to the money ───
   What used to sit here was the whole shop: eight tabs, a hundred and ten
   rows, and a scroll a mile long in the middle of the season page. It is a
   phone app now. What is left is one card that tells you what you are worth
   and opens the phone, because the tile rule says a page is a set of doors and
   not a warehouse. */
function MoneyDoor({ career, onOpenPhone }: { career: CareerState; onOpenPhone: () => void }) {
  const bank = bankSummary(career);
  const owned = (career.purchasedItems ?? []).length;
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">🏠 My Life & Money</span>
        <span className="text-[10px] text-muted-foreground">{owned} things owned</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-muted/20 rounded-lg p-2">
          <div className="text-sm font-black">{formatNetWorth(bank.cash)}</div>
          <div className="text-[9px] text-muted-foreground">in the account</div>
        </div>
        <div className="bg-muted/20 rounded-lg p-2">
          <div className="text-sm font-black text-emerald-400">{formatNetWorth(bank.vault)}</div>
          <div className="text-[9px] text-muted-foreground">savings</div>
        </div>
        <div className="bg-muted/20 rounded-lg p-2">
          <div className="text-sm font-black text-blue-400">{formatNetWorth(bank.invested)}</div>
          <div className="text-[9px] text-muted-foreground">invested</div>
        </div>
      </div>
      <button
        type="button"
        onClick={onOpenPhone}
        className="w-full flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-left active:scale-[0.99] transition-transform"
      >
        <span className="min-w-0">
          <span className="block text-xs font-bold">Open your phone</span>
          <span className="block text-[10px] text-muted-foreground truncate">
            Bank, market, everything you can buy, and the card school
          </span>
        </span>
        <ChevronRight className="w-4 h-4 shrink-0 opacity-60" />
      </button>
    </div>
  );
}

/* ─── Moral Dilemma Card ─── */
function MoralDilemmaCard({ career, onChoice, onDismiss }: {
  career: CareerState;
  onChoice: (choiceIndex: number) => void;
  onDismiss: () => void;
}) {
  const [chosen, setChosen] = useState(false);
  const dilemma = career.pendingMoralDilemma;

  if (!dilemma && chosen) {
    return (
      <div className="rounded-xl border-2 border-red-500/40 bg-gradient-to-b from-red-500/10 to-transparent p-6 space-y-4">
        <div className="text-center space-y-2">
          <div className="text-3xl">⚠️</div>
          <h3 className="text-lg font-black">Decision Made</h3>
          <p className="text-xs text-muted-foreground">The consequences of your choice will unfold...</p>
        </div>
        <Button onClick={onDismiss} className="w-full h-10 text-sm font-bold bg-red-600 hover:bg-red-500 text-black">
          Continue →
        </Button>
      </div>
    );
  }

  if (!dilemma) return null;

  return (
    <div className="rounded-xl border-2 border-red-500/60 bg-gradient-to-b from-red-900/30 via-red-500/5 to-transparent p-6 space-y-5 shadow-[0_0_40px_rgba(239,68,68,0.15)]">
      {/* Warning header */}
      <div className="flex items-center justify-center gap-2">
        <div className="h-px flex-1 bg-red-500/30" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400 px-2">⚠️ MORAL DILEMMA ⚠️</span>
        <div className="h-px flex-1 bg-red-500/30" />
      </div>

      <div className="text-center space-y-3">
        <div className="text-5xl">{dilemma.emoji}</div>
        <h3 className="text-xl font-black tracking-tight text-red-300">{dilemma.title}</h3>
        <p className="text-sm text-foreground/80 leading-relaxed max-w-md mx-auto">{dilemma.description}</p>
      </div>

      <div className="space-y-2.5">
        {dilemma.choices.map((choice, i) => (
          <button
            key={i}
            onClick={() => { onChoice(i); setChosen(true); }}
            className="w-full rounded-xl border-2 border-red-500/20 bg-red-500/5 p-4 text-left hover:bg-red-500/15 hover:border-red-500/40 transition-all active:scale-[0.98] group"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0 mt-0.5">{choice.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-foreground group-hover:text-red-300 transition-colors">{choice.label}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{money(choice.consequence)}</div>
                {choice.risk && (
                  <div className="text-[10px] text-red-400 font-bold mt-1.5 flex items-center gap-1">
                    <span>⚠️</span> {choice.risk}
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="text-center text-[9px] text-red-400/60 font-semibold uppercase tracking-wider">
        Your choice will have lasting consequences
      </div>
    </div>
  );
}

/* ─── Social Media Action Card ─── */
function SocialMediaActionCard({ career, onAction, onCoverAthlete, onDismiss }: {
  career: CareerState;
  onAction: (actionId: string) => void;
  onCoverAthlete: (accept: boolean) => void;
  onDismiss: () => void;
}) {
  const hasActed = career.socialMediaActionUsedThisSeason;
  const showCoverAthlete = career.pendingCoverAthleteEvent && hasActed;
  const currentFollowers = career.socialMediaFollowers;
  const activeTier = career.activeSponsorship;
  const activeTierInfo = SPONSORSHIP_TIERS.find(t => t.tier === activeTier);
  const nextTier = SPONSORSHIP_TIERS.find(t => currentFollowers * 1_000_000 < t.minFollowers);

  // Cover athlete special event
  if (showCoverAthlete) {
    return (
      <div className="rounded-xl border-2 border-amber-400/60 bg-gradient-to-b from-amber-500/20 to-transparent p-5 space-y-4">
        <div className="text-center space-y-2">
          <div className="text-5xl">🎮</div>
          <h3 className="text-xl font-black tracking-tight">THE COVER OFFER</h3>
          <p className="text-sm text-amber-300 font-bold">The world's biggest football video game wants YOU on the cover!</p>
          <p className="text-xs text-muted-foreground">With {formatFollowers(currentFollowers)} followers and {career.overall} OVR, you're the perfect choice.</p>
        </div>
        <div className="space-y-2">
          <button
            onClick={() => onCoverAthlete(true)}
            className="w-full rounded-lg border-2 border-amber-500/40 bg-amber-500/15 p-3 text-left hover:bg-amber-500/25 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-amber-300">✅ Accept: Become the Cover Star</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{money('€25M payment')} · +5M followers · Legacy +10</div>
              </div>
              <span className="text-lg">🌟</span>
            </div>
          </button>
          <button
            onClick={() => onCoverAthlete(false)}
            className="w-full rounded-lg border border-border bg-muted/20 p-3 text-left hover:bg-muted/40 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-foreground">❌ Decline: Stay Selective</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Reputation +5 for being humble</div>
              </div>
              <span className="text-lg">🧘</span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // After action chosen (no cover athlete offer), show continue button
  if (hasActed) {
    return (
      <div className="rounded-xl border border-blue-500/30 bg-gradient-to-b from-blue-500/10 to-transparent p-5 space-y-4">
        <div className="text-center space-y-2">
          <div className="text-3xl">📱</div>
          <h3 className="text-lg font-black">Social Media Update</h3>
          <div className="text-lg font-black text-blue-400">{formatFollowers(currentFollowers)} followers</div>
          {activeTierInfo && (
            <div className="text-xs text-emerald-400 font-bold">{activeTierInfo.emoji} {activeTierInfo.name}: {money(`€${activeTierInfo.income}M`)}/year</div>
          )}
        </div>
        <Button onClick={onDismiss} className="w-full h-10 text-sm font-bold bg-blue-600 hover:bg-blue-500 text-black">
          Continue →
        </Button>
      </div>
    );
  }

  // Show action choices
  return (
    <div className="rounded-xl border border-blue-500/30 bg-gradient-to-b from-blue-500/10 to-transparent p-5 space-y-4">
      <div className="text-center space-y-2">
        <div className="text-3xl">📱</div>
        <h3 className="text-lg font-black">Social Media</h3>
        <p className="text-xs text-muted-foreground">Choose one action this season to manage your online presence</p>
        <div className="text-sm font-black text-blue-400">{formatFollowers(currentFollowers)} followers</div>
        {activeTierInfo && (
          <div className="text-[10px] text-emerald-400 font-semibold">{activeTierInfo.emoji} Active: {activeTierInfo.name} ({money(`€${activeTierInfo.income}M`)}/yr)</div>
        )}
        {nextTier && (
          <div className="text-[10px] text-muted-foreground">Next unlock: {nextTier.emoji} {nextTier.name} at {(nextTier.minFollowers / 1_000_000).toFixed(0)}M followers</div>
        )}
      </div>

      {/* Sponsorship milestones */}
      <div className="flex flex-wrap gap-1 justify-center">
        {SPONSORSHIP_TIERS.map(t => {
          const unlocked = currentFollowers * 1_000_000 >= t.minFollowers;
          return (
            <span key={t.tier} className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
              unlocked ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "bg-muted/20 text-muted-foreground/50"
            }`}>
              {t.emoji} {(t.minFollowers / 1_000_000).toFixed(0)}M
            </span>
          );
        })}
      </div>

      <div className="space-y-2">
        {SOCIAL_MEDIA_ACTIONS.map(action => (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            className="w-full rounded-lg border border-border bg-muted/20 p-3 text-left hover:bg-blue-500/10 hover:border-blue-500/30 transition-all active:scale-[0.98]"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span>{action.emoji}</span>
                  <span>{action.label}</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{action.description}</div>
                <div className="flex items-center gap-2 mt-1">
                  {action.followerGain[0] > 0 && (
                    <span className="text-[9px] text-blue-400 font-semibold">
                      +{action.followerGain[0] === action.followerGain[1]
                        ? `${(action.followerGain[0] / 1_000_000).toFixed(1)}M`
                        : `${(action.followerGain[0] / 1_000_000).toFixed(1)}-${(action.followerGain[1] / 1_000_000).toFixed(1)}M`
                      } followers
                    </span>
                  )}
                  {action.extraEffect && (
                    <span className={`text-[9px] font-semibold ${action.reputationChange < 0 ? "text-red-400" : "text-amber-400"}`}>
                      ⚡ {action.extraEffect}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Game Screen ─── */
function GameScreen({ career, clubs, onNextSeason, onAcceptOffer, onDismissSummary, onDismissNewspaper, onStay, onSignExtension, onRequestTransfer, onAcceptLoan, onEventChoice, onDismissDebut, onDismissWorldCup, onWorldCupSpeech, onRetireInternational, onDismissRivalryEvent, onDismissBallonDor, onBdorSpeech, onManualRetire, onPostRetirement, onAdvanceManager, onAcceptManagerOffer, onEndManager, onShare, onNewCareer, onOpenPhone, onSocialMediaAction, onCoverAthlete, onDismissSocialMedia, onMoralDilemmaChoice, onRehabChoice, onDismissMoralDilemma, onDismissAppeal, onAcceptRetirement, onDeclineRetirement, onPunditAction, onEndPundit, onAdvanceOwner, onEndOwner, onCurrencyChange, timelineRef }: {
  career: CareerState;
  clubs: ClubData[];
  onNextSeason: () => void;
  onAcceptOffer: (offer: ContractOffer) => void;
  onDismissSummary: () => void;
  onDismissNewspaper: () => void;
  onStay: () => void;
  onSignExtension: () => void;
  onRequestTransfer: () => void;
  onAcceptLoan: (offer: ContractOffer) => void;
  onEventChoice: (choiceIndex: number) => void;
  onDismissDebut: () => void;
  onDismissWorldCup: () => void;
  onWorldCupSpeech: (choice: WorldCupSpeechChoice) => void;
  onRetireInternational: () => void;
  onDismissRivalryEvent: () => void;
  onDismissBallonDor: () => void;
  onBdorSpeech: (choice: BdorSpeechChoice) => void;
  onManualRetire: () => void;
  onPostRetirement: (choice: PostRetirementChoice) => void;
  onAdvanceManager: () => void;
  onAcceptManagerOffer: (i: number) => void;
  onEndManager: () => void;
  onShare: () => void;
  onNewCareer: () => void;
  onOpenPhone: () => void;
  onSocialMediaAction: (actionId: string) => void;
  onCoverAthlete: (accept: boolean) => void;
  onDismissSocialMedia: () => void;
  onMoralDilemmaChoice: (choiceIndex: number) => void;
  onRehabChoice: (choiceIndex: number) => void;
  onDismissMoralDilemma: () => void;
  onDismissAppeal: () => void;
  onAcceptRetirement: () => void;
  onDeclineRetirement: () => void;
  onPunditAction: (action: PunditAction) => void;
  onEndPundit: () => void;
  onAdvanceOwner: () => void;
  onEndOwner: () => void;
  /* Round 258: bumping this re-renders every money figure on the page
     after the currency picker changes. */
  onCurrencyChange?: () => void;
  timelineRef: React.RefObject<HTMLDivElement>;
}) {
  const totals = getCareerTotals(career.seasons);
  // Round 61: the owner's no scroll rule. Every overlay (event, newspaper,
  // season summary, transfer window, ceremony) pulls itself into view when it
  // appears, instead of rendering below the fold on a phone.
  const revealRef = useRevealScroll<HTMLDivElement>(
    `${career.phase}:${career.pendingEvents[0]?.id ?? ''}:${career.seasons.length}`,
  );
  const currentSeason = career.seasons[career.seasons.length - 1];

  const statBars = getPositionStatBars(career.position, career);

  const [showRetireConfirm, setShowRetireConfirm] = useState(false);
  // Round 131: the whole attribute tree on its own screen with a back button
  const [attrsOpen, setAttrsOpen] = useState(false);
  const showActionButton = career.phase === "youth" || career.phase === "playing" || career.phase === "manager_season" || career.phase === "pundit_season" || career.phase === "owner_season";
  /* ─── Round 129: the controls that walked off when he scrolled ───

     His report: "if I'm just on my screen and don't touch anything then I can
     see the phone and next year and retire and what not. But if I scroll down
     then it disappears."

     MEASURED FIRST, on the built site at 390x844 with a real mid career save,
     before anything was changed. The page is 8500px tall on an 844px screen.
     The bar sat pinned to the bottom from scrollY 0 to about 2300, let go
     somewhere before 2400, and from 3050 all the way to the end of the document
     at 7656 there were no controls on the screen at all. That is 4600px, sixty
     percent of everything he can scroll, with no Next Season and no Retire
     anywhere. The site footer does not even begin until document y 8312, so for
     nearly all of that dead zone he was still inside the game reading its own
     How To Play and FAQ.

     ROUND 86 WAS NOT WRONG, IT PICKED THE WRONG LANDMARK. Its rule was: float
     the bar only while the bar's own natural position is still below the fold,
     so that once you have scrolled past it the bar stops floating and can never
     sit over the Privacy links as an invisible full width click shield. That
     concern is real and it is still satisfied below. The flaw is where this
     bar's natural position happens to be. It lives at the end of the career
     panel, document y 3050 of 8500, so "you have scrolled past the bar" fires
     at 36 percent of the page and the remaining 64 percent is game content, not
     footer. The release was tied to the bar's own address instead of to the
     thing it was supposed to keep clear of.

     SO IT NOW WATCHES THE FOOTER ITSELF, the single global <footer> App.tsx
     renders on every route. The bar rides the bottom of the screen for the
     whole page, and the moment the footer climbs into the bottom of the window
     the bar is lifted so it comes to rest directly on top of it. Lifted, not
     hidden. The controls are reachable at every single scroll position on the
     page, and the footer links are never underneath them, which is strictly
     better than either of the two states we have shipped before.

     THINGS TRIED AND THROWN AWAY, with the numbers that killed them.

     One, keep the fixed/inline switch and just move the trigger to the footer.
     It oscillates, and this is the whole reason the answer is a transform.
     Going from fixed back into the flow hands 60px of measured height back to
     the document, which pushes the footer 60px further down, which un-triggers
     the observer, which re-pins, which pulls the footer back up. A bar
     flickering through a 60px band of scroll. Two observers 200px apart would
     have given enough hysteresis to cover a 60px shift, but that is two
     observers plus a magic gap that has to stay bigger than a height nobody
     will remember to re-measure.

     Two, hide it (translate it off the bottom) once the footer shows. No
     oscillation, because a transform costs the layout nothing, but the controls
     still vanish at the end of the page. That is his exact complaint moved 5000
     pixels further down rather than fixed.

     Three, delete the JS and use position: sticky; bottom: 0. This is the right
     shape, and it is why what follows behaves like sticky. It cannot work here:
     a sticky box is clamped to its containing block, this bar's containing
     block is the career panel, and the panel ends at 3135. Sticky would have
     released at the same place the old code did, give or take 85px. Making it
     work means lifting the bar out of the dashboard and rendering it as a
     sibling of the SEO block, which is a large refactor of a 3100 line file to
     solve a 30 line problem.

     What is left is this: measure where the footer's top edge is on each scroll
     frame and translate the bar up by however much of it is in the way. It
     never touches layout, so nothing it does can feed back into what it
     measures, so it cannot oscillate. If the footer ever disappears the lift is
     zero and the bar simply stays pinned at the bottom, which is the safe
     failure.

     ONE AGREEMENT TO KEEP. useRevealScroll subtracts pinned bottom bars from
     the readable window before deciding whether newly revealed content needs
     scrolling to, and Round 128 measured this bar at 85px at 390 wide. A
     transform leaves position: fixed and the height alone, so that reading is
     unchanged while the bar is down at the bottom, and once it has been lifted
     clear of the bottom edge the hook stops counting it, which is right,
     because at that point it is not covering anything down there. */
  const actionBarFloats = showActionButton || career.phase === "retired";
  const footerLift = useFooterLift(actionBarFloats);
  // Coming back out of the attributes screen lands at the top of the career page.
  const screenRef = useRevealScroll<HTMLDivElement>(attrsOpen ? "attrs" : "career");

  /* Tile rule: the whole attribute tree takes over the screen with a back
     button rather than stacking two dozen more bars under the six. */
  if (attrsOpen) {
    return <AttributesScreen career={career} onBack={() => setAttrsOpen(false)} />;
  }

  return (
    <div ref={screenRef} className="space-y-3 pb-20">
      {/* Header */}
      {/* Round 330, the mobile depth walk: at 320 the Retire and New Career
          buttons plus the OVR block left the name about 30px, so it rendered
          as one letter, which is Round 257's "Can't even see my name" back
          again at a narrower width. Below 480 the identity now takes its own
          full line and the buttons drop underneath, right aligned; from 480
          up the single row is exactly what it was. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0 w-full min-[480px]:w-auto min-[480px]:flex-1">
          {/* Round 54: your face, on your career, everywhere */}
          {career.appearance && (
            <div className="shrink-0 rounded-xl overflow-hidden border border-border bg-muted/20">
              <PlayerAvatar appearance={career.appearance} clubColor={career.currentClubColor} size={52} animate />
            </div>
          )}
          <div className="min-w-0 flex-1">
            {/* Round 257, owner report: "Can't even see my name". truncate on
                a flex CONTAINER does nothing for the text inside it, so the
                name was being crushed to two characters by the buttons on
                the right of the same row. The flag holds its size, the name
                takes the rest and truncates properly if it has to. */}
            <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2 min-w-0">
              <FlagImg name={career.nationality} size={24} />
              <span className="truncate min-w-0">{career.playerName}</span>
            </h1>
            <p className="text-xs text-muted-foreground">{career.position} · Age {career.age} · {career.nationality}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {/* Round 159: his note, "the retire and new career buttons on my
              career are way too small". Real buttons now: bordered, readable,
              44px tall on touch, still quiet enough not to fight the OVR. */}
          {career.phase !== "retired" && career.phase !== "retirement_ceremony" && career.phase !== "post_retirement" && (
            <Button onClick={() => setShowRetireConfirm(true)} variant="outline" className="text-xs font-bold px-3 h-10 border-border text-muted-foreground hover:text-red-400 hover:border-red-400/60">
              🚪 Retire
            </Button>
          )}
          <Button onClick={onNewCareer} variant="outline" className="text-xs font-bold px-3 h-10 border-border text-muted-foreground hover:text-red-400 hover:border-red-400/60">
            🔄 New Career
          </Button>
          <div className="text-center">
            <div className={`text-3xl sm:text-4xl font-black ${career.overall >= 80 ? 'text-green-400' : career.overall >= 65 ? 'text-emerald-400' : career.overall >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
              {career.overall}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">OVR</div>
            {/* Round 78: show the scouted ceiling so growth toward it reads as progress */}
            {typeof career.potential === "number" && !career.retired && career.age < 30 && (
              <div className={`text-[10px] font-bold ${potentialTier(career.potential).color}`}>POT {career.potential}</div>
            )}
          </div>
        </div>
      </div>

      {/* Finances Bar, always visible */}
      {!career.retired && (
        <div className="bg-card/90 backdrop-blur border border-border rounded-xl px-3 py-2 flex items-center justify-between gap-2">
          <div className="text-center flex-1">
            <div className={`text-sm sm:text-base font-black ${career.netWorth >= 50 ? "text-yellow-300" : career.netWorth >= 10 ? "text-emerald-400" : career.netWorth >= 1 ? "text-blue-400" : career.netWorth < 0 ? "text-red-400" : "text-muted-foreground"}`}>
              {formatNetWorth(career.netWorth)}
            </div>
            <div className="text-[9px] text-muted-foreground">Net Worth</div>
          </div>
          <div className="w-px h-6 bg-border" />
          <div className="text-center flex-1">
            <div className="text-sm sm:text-base font-black text-emerald-400">{formatWage(career.weeklyWage)}</div>
            <div className="text-[9px] text-muted-foreground">Wage</div>
          </div>
          <div className="w-px h-6 bg-border" />
          <div className="text-center flex-1">
            <div className="text-sm sm:text-base font-black text-blue-400">{money(`€${career.marketValue >= 1 ? career.marketValue.toFixed(0) : career.marketValue.toFixed(1)}M`)}</div>
            <div className="text-[9px] text-muted-foreground">Value</div>
          </div>
        </div>
      )}

      {/* FINAL SEASON BANNER */}
      {career.isFinalSeason && !career.retired && (
        <div className="bg-amber-500/15 border-2 border-amber-500/40 rounded-xl p-3 text-center animate-pulse">
          <span className="text-sm font-black text-amber-400 uppercase tracking-widest">⚠️ FINAL SEASON</span>
          <p className="text-[10px] text-muted-foreground mt-0.5">This will be your last season as a professional footballer</p>
        </div>
      )}

      {/* Main panels */}
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-3">
        {/* LEFT, Timeline */}
        <div className="bg-card border border-border rounded-xl overflow-hidden order-2 md:order-1">
          <div className="px-3 py-2 border-b border-border bg-muted/20">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Career Timeline</span>
          </div>
          </div>

          <div ref={timelineRef} className="max-h-[280px] md:max-h-[480px] overflow-y-auto p-2 space-y-0.5 scrollbar-thin">
            {career.seasons.map((s, i) => (
              <TimelineEntry key={s.year + s.club} season={s} isCurrent={i === career.seasons.length - 1} isLast={i === career.seasons.length - 1} />
            ))}
          </div>
        </div>

        {/* RIGHT, Stats & Overlays */}
        <div className="space-y-3 order-1 md:order-2">

          <div ref={revealRef}>
          {/* OVERLAY: Newspaper Articles */}
          {career.phase === "newspaper" && career.pendingNews.length > 0 && (
            <NewspaperCard articles={career.pendingNews} onContinue={onDismissNewspaper} />
          )}

          {/* OVERLAY: Season Summary */}
          {career.phase === "season_summary" && career.pendingSummary && (
            <SeasonSummaryCard season={career.pendingSummary} position={career.position} onContinue={onDismissSummary} appearance={career.appearance} />
          )}

          {/* OVERLAY: Contract Offers (youth → pro) */}
          {career.phase === "contract_offer" && career.pendingOffers.length > 0 && (
            <div className="space-y-3">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
                <h3 className="text-lg font-black">📩 Contract Offers</h3>
                <p className="text-xs text-muted-foreground mt-1">Choose a club to start your professional career</p>
              </div>
              {career.pendingOffers.map((offer) => (
                <OfferCard key={offer.club.name} offer={offer} onAccept={() => onAcceptOffer(offer)} career={career} />
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

          {/* OVERLAY: International tournament (Round 124). pendingWorldCup is
              the pre Round 124 shape, still rendered so a save made mid World
              Cup before this round is not left with no way forward. */}
          {career.phase === "world_cup" && career.pendingTournament && (
            <TournamentCard t={career.pendingTournament} onDismiss={onDismissWorldCup} onSpeech={onWorldCupSpeech} />
          )}
          {career.phase === "world_cup" && !career.pendingTournament && career.pendingWorldCup && (
            <WorldCupResultCard wc={career.pendingWorldCup} career={career} onDismiss={onDismissWorldCup} onSpeech={onWorldCupSpeech} />
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

          {/* OVERLAY: Moral Dilemma */}
          {career.phase === "moral_dilemma" && (
            <MoralDilemmaCard
              career={career}
              onChoice={onMoralDilemmaChoice}
              onDismiss={onDismissMoralDilemma}
            />
          )}

          {/* OVERLAY: Rehab choice (Round 253). A serious injury stops the
              season and asks the one question a real footballer gets asked:
              how badly do you want to be back. */}
          {career.phase === "rehab_choice" && career.pendingRehab && (
            <div className="rounded-xl border-2 border-red-500/60 bg-gradient-to-b from-red-500/15 to-transparent p-5 space-y-4">
              <div className="text-center space-y-1">
                <div className="text-5xl">{"\u{1F691}"}</div>
                <h3 className="text-xl font-black tracking-tight">{career.pendingRehab.name.toUpperCase()}</h3>
                <p className="text-sm text-muted-foreground">
                  The scan is back. The club's medical team says {career.pendingRehab.weeks} weeks.
                </p>
                <p className="text-xs text-muted-foreground">How do you want to come back?</p>
              </div>

              <button
                onClick={() => onRehabChoice(0)}
                className="w-full text-left rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 hover:bg-amber-500/20 transition-colors"
              >
                <div className="font-bold text-sm">{"\u{1F3C3}"} Rush it back</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Back in about {Math.max(2, Math.round(career.pendingRehab.weeks * 0.6))} weeks and into real matches.
                  Roughly half of players who do this break down again, and every shortcut leaves you carrying more risk for good.
                </div>
              </button>

              <button
                onClick={() => onRehabChoice(1)}
                className="w-full text-left rounded-lg border border-border bg-secondary/40 p-3 hover:bg-secondary/70 transition-colors"
              >
                <div className="font-bold text-sm">{"\u{1F3E5}"} Follow the club's plan</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  All {career.pendingRehab.weeks} weeks, no shortcuts. A long layoff takes its toll (Pace -2, Physical -1) but you walk back in whole.
                </div>
              </button>

              {career.pendingRehab.specialistCost !== null && career.netWorth >= career.pendingRehab.specialistCost && (
                <button
                  onClick={() => onRehabChoice(2)}
                  className="w-full text-left rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-3 hover:bg-emerald-500/20 transition-colors"
                >
                  <div className="font-bold text-sm">{"\u{2708}\u{FE0F}"} Pay for the specialist ({"\u{20AC}"}{career.pendingRehab.specialistCost}M)</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    The best surgeon and your own rehab team for the full {career.pendingRehab.weeks} weeks. Costs real money, and you come back closest to yourself (Pace -1 only).
                  </div>
                </button>
              )}
              {career.pendingRehab.specialistCost !== null && career.netWorth < career.pendingRehab.specialistCost && (
                <p className="text-[10px] text-muted-foreground text-center">
                  A specialist abroad would cost {"\u{20AC}"}{career.pendingRehab.specialistCost}M. You cannot cover it.
                </p>
              )}
            </div>
          )}

          {/* OVERLAY: Red Card Appeal Result */}
          {career.phase === "red_card_appeal_result" && career.pendingAppealResult && (
            <div className="rounded-xl border-2 border-red-500/60 bg-gradient-to-b from-red-500/15 to-transparent p-6 space-y-4 text-center">
              <div className="text-5xl">{career.pendingAppealResult.success ? "✅" : "❌"}</div>
              <h3 className="text-xl font-black tracking-tight">
                {career.pendingAppealResult.success ? "APPEAL SUCCESSFUL" : "APPEAL REJECTED"}
              </h3>
              <div className={`rounded-lg p-4 border ${career.pendingAppealResult.success ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                <p className="text-sm font-bold">
                  {career.pendingAppealResult.success
                    ? "🎉 Ban Overturned. You are free to play!"
                    : `⚠️ You must serve the ${career.pendingAppealResult.banLength}-match ban.`}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {career.pendingAppealResult.success
                    ? "The disciplinary committee reviewed the footage and decided the red card was unjust. No further action will be taken."
                    : "After reviewing all available evidence, the committee upheld the original decision. The ban remains in effect."}
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground">Result delivered after 3-5 day review period</p>
              <Button onClick={onDismissAppeal} className="w-full h-10 text-sm font-bold">
                Continue →
              </Button>
            </div>
          )}

          {/* OVERLAY: Social Media Action */}
          {career.phase === "social_media_action" && (
            <SocialMediaActionCard
              career={career}
              onAction={onSocialMediaAction}
              onCoverAthlete={onCoverAthlete}
              onDismiss={onDismissSocialMedia}
            />
          )}

          {/* OVERLAY: Retirement Ceremony */}
          {career.phase === "retirement_ceremony" && career.legacy && (
            <RetirementCeremonyCard career={career} totals={totals} onPostRetirement={onPostRetirement} />
          )}

          {/* OVERLAY: Retirement Suggestion */}
          {career.phase === "retirement_suggestion" && (
            <div className="rounded-xl border-2 border-amber-500/50 bg-gradient-to-b from-amber-500/10 to-transparent p-6 space-y-4 text-center">
              <div className="text-5xl">⚠️</div>
              <h3 className="text-xl font-black tracking-tight">YOUR BODY IS SHOWING SIGNS OF WEAR</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                At age {career.age}, your overall has dropped to <strong>{career.overall}</strong> (peak: {career.peakOverall}).
                {career.overall <= 75 ? " Many players retire at this level." : ` That's a ${career.peakOverall - career.overall}-point decline from your prime.`}
                <br/>Consider retirement?
              </p>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-muted/20 rounded-lg p-2"><div className="font-black text-lg">{career.peakOverall}</div><div className="text-muted-foreground">Peak OVR</div></div>
                <div className="bg-muted/20 rounded-lg p-2"><div className="font-black text-lg text-amber-400">{career.overall}</div><div className="text-muted-foreground">Current OVR</div></div>
              </div>
              <div className="space-y-2">
                <Button onClick={onAcceptRetirement} className="w-full h-11 text-sm font-bold bg-amber-600 hover:bg-amber-500 text-black">
                  👋 Hang Up the Boots: Retire
                </Button>
                <Button onClick={onDeclineRetirement} variant="outline" className="w-full h-11 text-sm font-bold">
                  💪 Not Done Yet: Keep Playing
                </Button>
              </div>
            </div>
          )}

          {/* OVERLAY: Post-Retirement Choice */}
          {career.phase === "post_retirement" && (
            <PostRetirementCard career={career} onChoice={onPostRetirement} />
          )}

          {/* OVERLAY: Manager Season */}
          {career.phase === "manager_season" && career.managerState && (
            <ManagerPanel manager={career.managerState} career={career} onAdvance={onAdvanceManager} onEnd={onEndManager} onAcceptOffer={onAcceptManagerOffer} />
          )}

          {/* OVERLAY: Pundit Season */}
          {career.phase === "pundit_season" && career.punditState && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-black">🎙️ TV Pundit Career</h3>
                <p className="text-xs text-muted-foreground">Season {career.punditState.season} · {formatFollowers(career.socialMediaFollowers)} followers</p>
              </div>
              {career.punditEvents.length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {career.punditEvents.slice(-4).map((e, i) => (
                    <div key={i} className="text-xs bg-muted/20 rounded-lg px-3 py-1.5">{money(e)}</div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-muted/20 rounded-lg p-2"><div className="font-black">{career.punditState.predictions.filter(p => p.cameTrue).length}</div><div className="text-[9px] text-muted-foreground">Predictions ✓</div></div>
                <div className="bg-muted/20 rounded-lg p-2"><div className="font-black">{career.punditState.controversies}</div><div className="text-[9px] text-muted-foreground">Controversies</div></div>
                <div className="bg-muted/20 rounded-lg p-2"><div className="font-black">+{career.punditState.legacyBonus}</div><div className="text-[9px] text-muted-foreground">Legacy Bonus</div></div>
              </div>
              <div className="text-xs text-center text-muted-foreground font-bold uppercase mt-2">Choose your action this season</div>
              <div className="space-y-2">
                <Button onClick={() => onPunditAction("praise_player")} variant="outline" className="w-full h-10 text-sm font-bold">⭐ Praise a Rising Star</Button>
                <Button onClick={() => onPunditAction("criticise_manager")} variant="outline" className="w-full h-10 text-sm font-bold">🔥 Criticise a Manager</Button>
                <Button onClick={() => onPunditAction("bold_prediction")} variant="outline" className="w-full h-10 text-sm font-bold">🎯 Make a Bold Prediction</Button>
              </div>
              <Button onClick={onEndPundit} variant="ghost" className="w-full h-8 text-xs text-muted-foreground">🚪 Retire from Punditry</Button>
            </div>
          )}

          {/* OVERLAY: Owner Season */}
          {career.phase === "owner_season" && career.ownerState && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-black">🏟️ Club Owner</h3>
                <p className="text-xs text-muted-foreground">Owning {career.ownerState.club} (Tier {career.ownerState.clubTier}) · Season {career.ownerState.season}</p>
              </div>
              {career.ownerState.seasonResults.length > 0 && (
                <div className="space-y-1">
                  {career.ownerState.seasonResults.slice(-5).map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-muted/20 rounded-lg px-3 py-1.5">
                      <span className="text-muted-foreground">S{r.year}</span>
                      <span className="font-semibold">{r.club}</span>
                      <span className={`text-[10px] ${r.trophy ? "text-amber-400" : "text-muted-foreground"}`}>{r.result}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-muted/20 rounded-lg p-2"><div className="font-black">{career.ownerState.trophies}</div><div className="text-[9px] text-muted-foreground">Trophies</div></div>
                <div className="bg-muted/20 rounded-lg p-2"><div className="font-black">{career.ownerState.promotions}</div><div className="text-[9px] text-muted-foreground">Promotions</div></div>
                <div className="bg-muted/20 rounded-lg p-2"><div className="font-black">{money(`€${career.ownerState.budget.toFixed(0)}M`)}</div><div className="text-[9px] text-muted-foreground">Budget</div></div>
              </div>
            </div>
          )}
          {career.phase === "ballon_dor" && career.pendingBallonDor && (
            <BallonDorCeremonyCard bdor={career.pendingBallonDor} career={career} onDismiss={onDismissBallonDor} onSpeech={onBdorSpeech} />
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
              onAcceptLoan={onAcceptLoan}
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
                <div className="font-bold text-sm truncate flex items-center gap-1"><FlagImg name={career.currentClubCountry} size={16} />{career.currentClub}{(career.isClubCaptain ?? false) && <span title="Club captain" className="text-gold shrink-0">©️</span>}</div>
                <div className="text-xs text-muted-foreground">
                  {career.retired ? "Retired" : career.phase === "youth" ? "Youth Academy" : `${career.currentLeague} · ${career.contractYearsLeft}yr left · ${formatWage(career.weeklyWage)} · ${money(`€${career.marketValue >= 1 ? career.marketValue.toFixed(0) : career.marketValue.toFixed(1)}M`)}`}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-lg font-black" style={{ color: career.currentClubColor }}>{career.position}</div>
                <div className="text-[10px] text-muted-foreground">{currentSeason.year}/{(currentSeason.year + 1).toString().slice(-2)}</div>
              </div>
            </div>
          )}

          {/* Round 262: your place in the squad, above the money because on a
              given season it matters more. Renders only while you are actually
              at a club, and only when there is a real squad to show. */}
          {career.phase === "playing" && (() => {
            /* the season about to be played, which is the one the depth chart
               is describing: the last recorded season plus one. */
            const year = (career.seasons[career.seasons.length - 1]?.year ?? 0) + 1;
            const chart = depthChart(career.currentClub, year, career.position, career.overall, career.playerName);
            return chart ? <SquadDepthCard chart={chart} /> : null;
          })()}

          {/* Financial & Lifestyle Panel */}
          {(career.phase === "youth" || career.phase === "playing" || career.phase === "retired") && (
            <FinancialPanel career={career} onCurrencyChange={onCurrencyChange} />
          )}

          {/* Round 134: My Life used to be a wall of eight tabs and a hundred
              and ten rows sitting in the middle of the season page. His note
              was "all those options that appear on your my life should be on ur
              phone instead", so it is a phone app now, and what is left here is
              a door to it. */}
          {(career.phase === "playing") && (
            <MoneyDoor career={career} onOpenPhone={onOpenPhone} />
          )}

          {/* Stats. Round 131: six family bars on the page and the whole tree
              one tap away on its own screen, because two dozen bars stacked
              here is exactly the endless scroll the tile rule exists to stop. */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Attributes</span>
            {statBars.map(s => <StatBarGame key={s.l} label={s.l} value={s.v} color={s.c} top={s.top} />)}
            <button
              type="button"
              onClick={() => setAttrsOpen(true)}
              className="w-full mt-1 flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-left active:scale-[0.99] transition-transform"
            >
              <span className="min-w-0">
                <span className="block text-xs font-bold">Full attributes</span>
                <span className="block text-[10px] text-muted-foreground truncate">
                  {career.physique?.heightCm ?? 180} cm · {career.physique?.weightKg ?? 76} kg · every number under the six
                </span>
              </span>
              <ChevronRight className="w-4 h-4 shrink-0 opacity-60" />
            </button>
          </div>

          {/* Career totals, position-specific */}
          <div className="bg-card border border-border rounded-xl p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Career Stats</span>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-3">
              {getPositionCareerStats(career.position, totals).map(s => (
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
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
              {[
                { emoji: "🏆", l: "Leagues", v: totals.leagueTitles },
                { emoji: "🏆", l: "Cups", v: totals.domesticCups },
                { emoji: "⭐", l: "UCL", v: totals.championsLeagues },
                { emoji: "🌍", l: "World Cup", v: totals.worldCups },
                // Round 124: continental championships are a trophy too.
                { emoji: "🌐", l: "Continental", v: totals.continentalCups },
                { emoji: "🏅", l: "Ballon d'Or", v: totals.ballonDors },
              ].map(t => (
                <div key={t.l} className={`text-center rounded-lg p-2 ${t.v > 0 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-muted/20 opacity-40'}`}>
                  <div className="text-lg">{t.emoji}</div>
                  <div className="text-sm font-black">{t.v}</div>
                  <div className="text-[9px] text-muted-foreground">{t.l}</div>
                </div>
              ))}
            </div>
            {/* Individual Awards from career */}
            {(() => {
              const individualAwards = [
                { name: "Golden Boot", emoji: "👟" },
                { name: "Golden Glove", emoji: "🧤" },
                { name: "Puskás Award", emoji: "🎯" },
                { name: "UEFA Player of the Year", emoji: "🇪🇺" },
                { name: "Young Player of the Year", emoji: "⭐" },
                { name: "Comeback Player of the Year", emoji: "💪" },
                { name: "Club Legend", emoji: "🏛️" },
                { name: "All Time Top Scorer", emoji: "👑" },
                { name: "Fair Play Award", emoji: "🤝" },
              ];
              const awardItems = individualAwards.map(a => ({
                ...a,
                count: career.awards.filter(ca => ca.name === a.name).length,
              })).filter(a => a.count > 0);
              if (awardItems.length === 0) return null;
              return (
                <div className="grid grid-cols-3 gap-1.5 mt-2">
                  {awardItems.map(a => (
                    <div key={a.name} className="text-center rounded-lg p-1.5 bg-amber-500/10 border border-amber-500/20">
                      <div className="text-base"><FlagFromEmoji emoji={a.emoji} size={16} /></div>
                      <div className="text-xs font-black">{a.count > 1 ? `×${a.count}` : ""}</div>
                      <div className="text-[8px] text-muted-foreground leading-tight">{a.name}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
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
                <span className="shrink-0">›</span><span><TextWithFlags text={money(e)} size={14} /></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action bar */}
      {/* Round 86: the bar only floats when it actually has buttons to offer.
          In button-less phases it stays inline, so no orphan AGE tile ever
          hovers over the page blocking clicks. That rule is untouched.
          Round 129: when it does float it now floats for the whole page and
          steps up onto the footer instead of vanishing. The old 1px sentinel
          and its IntersectionObserver are gone with it. The measurements are in
          the long note above actionBarFloats, and the lift itself is in
          useFooterLift near the top of this file, shared with the training and
          phone buttons because they were parked on the footer too. */}
      <div
        data-career-action-bar={actionBarFloats ? 'floating' : 'inline'}
        className={`flex items-center gap-3 ${actionBarFloats ? 'fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border px-3 sm:px-4 py-3 max-w-5xl mx-auto' : ''}`}
        style={actionBarFloats && footerLift ? { transform: `translateY(-${footerLift}px)` } : undefined}
      >
        {career.phase === "retired" ? (
          <div className="flex-1 flex gap-2">
            <Button onClick={onShare} variant="outline" className="flex-1 h-12 text-sm font-bold">
              📤 Share Legacy
            </Button>
            <Button onClick={onNewCareer} className="flex-1 h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-black">
              ⚽ New Career
            </Button>
          </div>
        ) : career.phase === "manager_season" ? (
          <div className="flex-1 flex gap-2">
            {/* Round 112: when you are out of work you are not managing a
                season, you are waiting for a phone call, and the button
                should say which one of those is happening. */}
            <Button onClick={onAdvanceManager} className="flex-1 h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-black gap-2">
              {career.managerState?.unemployed ? "Sit Out A Season" : "Next Manager Season"} <ChevronRight className="w-5 h-5" />
            </Button>
            <Button onClick={onEndManager} variant="outline" className="h-12 text-sm font-bold">
              {career.managerState?.unemployed ? "Walk Away" : "Retire"}
            </Button>
          </div>
        ) : career.phase === "owner_season" ? (
          <div className="flex-1 flex gap-2">
            <Button onClick={onAdvanceOwner} className="flex-1 h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-black gap-2">
              Next Owner Season <ChevronRight className="w-5 h-5" />
            </Button>
            <Button onClick={onEndOwner} variant="outline" className="h-12 text-sm font-bold">Sell Club</Button>
          </div>
        ) : showActionButton ? (
          <div className="flex-1 flex gap-2">
            <Button onClick={onNextSeason} className="flex-1 h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-black gap-2">
              {career.phase === "youth" ? "Next Year" : "Next Season"} <ChevronRight className="w-5 h-5" />
            </Button>
            {(career.phase === "youth" || career.phase === "playing") && (
              <Button onClick={() => setShowRetireConfirm(true)} variant="outline" className="h-12 text-xs font-bold text-red-400 border-red-400/30 hover:bg-red-500/10">
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

      {/* Retire Confirmation Dialog */}
      {showRetireConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowRetireConfirm(false)}>
          <div role="dialog" aria-modal="true" aria-label="Retire?" tabIndex={-1} ref={focusDialogOnMount} onKeyDown={escapeCloses(() => setShowRetireConfirm(false))} className="bg-card border-2 border-border rounded-xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-center">🚪 Retire?</h3>
            <p className="text-sm text-muted-foreground text-center">Are you sure you want to retire? Your career will end here.</p>
            <div className="flex gap-3">
              <Button onClick={() => setShowRetireConfirm(false)} variant="outline" className="flex-1 h-10 font-bold">Cancel</Button>
              <Button onClick={() => { setShowRetireConfirm(false); onManualRetire(); }} className="flex-1 h-10 font-bold bg-red-600 hover:bg-red-500 text-black">Confirm Retirement</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
