/* ─── Round 835: the soccer binding for the shared posts and brand ladder ────

   The rules for what a post does live in careerSocial.ts, the brand ladder
   and the cover offer in careerBrand.ts, and every career shares them. This
   file is what makes them Soccer Career: the seven posts the screen has
   always offered, the five deals and their follower lines, the cover offer's
   terms, where each meter lives on the save, the euro, and every line the
   season log prints, verbatim from before the lift. Nothing below is a rule.

   Proof it is the same game: scripts/simCareerSocialBrands.mjs replays the
   Round 835 fixture (48 careers, every save hashed after every step, recorded
   before any of this moved) and requires it byte for byte.

   STORED TIER IDS. The shared ladder's rungs are neutral (local deal, kit
   deal, ambassador, own line, game cover). Soccer saves store the tier under
   the ids written before Round 49 renamed every deal to a fictional one, and
   one of those ids carries two real company names. It is a stored value,
   never printed, and changing it would strand every save holding the boot
   deal, so SOCCER_SAVE_IDS keeps it exactly as live saves hold it. It must
   not be copied into any shared module or any line a player reads.

   This file imports TYPES only from soccerCareerEngine, so the engine can
   import it at runtime with no cycle, the same contract soccerCareerLife
   keeps. Nothing runs at module scope but this file's own data.
*/
import type { CareerState, SeasonRecord } from "./soccerCareerEngine";
import type { SocialPostDef, SocialPostSport, FollowerGrowth, Meter } from "./careerSocial";
import type { BrandSport, BrandTierDef, BrandRung, CoverOfferDef } from "./careerBrand";
import { personalityFollowerMult } from "./soccerCareerLife";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const log = (s: CareerState, line: string) => { s.events = [...s.events, line]; };

const followers: Meter<CareerState> = {
  get: s => s.socialMediaFollowers,
  set: (s, v) => { s.socialMediaFollowers = v; },
};
const popularity: Meter<CareerState> = {
  get: s => s.popularity,
  set: (s, v) => { s.popularity = v; },
};

/* ─── the posts ─── */

export const SOCIAL_MEDIA_ACTIONS: SocialPostDef[] = [
  { id: "training_video", label: "Post training video", emoji: "🏋️", description: "Show off your skills in the gym", followerGain: [50_000, 200_000], reputationChange: 0 },
  { id: "viral_celebration", label: "Go viral with celebration clip", emoji: "🎬", description: "Post an iconic goal celebration", followerGain: [500_000, 2_000_000], reputationChange: 0 },
  { id: "controversial_opinion", label: "Post controversial opinion", emoji: "🔥", description: "Share a hot take about football", followerGain: [1_000_000, 1_000_000], reputationChange: -10, extraEffect: "Reputation -10" },
  { id: "charity_work", label: "Announce charity work", emoji: "❤️", description: "Highlight your philanthropic efforts", followerGain: [200_000, 200_000], reputationChange: 15, extraEffect: "Reputation +15" },
  { id: "personal_life", label: "Post about personal life", emoji: "📸", description: "Share a glimpse into your life off the pitch", followerGain: [300_000, 300_000], reputationChange: 0 },
  { id: "troll_rival", label: "Troll your rival on social media", emoji: "😈", description: "Take a shot at your rival online", followerGain: [800_000, 800_000], reputationChange: 0, extraEffect: "Rivalry intensity increases" },
  { id: "stay_off", label: "Stay off social media", emoji: "🧘", description: "Focus on football, no distractions", followerGain: [0, 0], reputationChange: 0, extraEffect: "+2 to all stats next season" },
];

/** The seven attributes the quiet season raises. */
const FOCUS_STATS = ["pace", "shooting", "passing", "dribbling", "defending", "physical", "reflexes"] as const;

export const SOCCER_SOCIAL: SocialPostSport<CareerState> = {
  posts: SOCIAL_MEDIA_ACTIONS,
  focusPost: "stay_off",
  rivalPost: "troll_rival",
  followerUnit: 1_000_000,
  followers,
  standing: popularity,
  posted: {
    get: s => s.socialMediaActionUsedThisSeason,
    set: (s, v) => { s.socialMediaActionUsedThisSeason = v; },
  },
  focus: {
    get: s => s.socialMediaFocusBoost,
    set: (s, v) => { s.socialMediaFocusBoost = v; },
  },
  payFocus: s => {
    for (const k of FOCUS_STATS) s[k] = clamp(s[k] + 2, 20, 99);
  },
  rivalName: s => (s.rival && !s.rival.retired ? s.rival.name : null),
  log,
  rng: () => Math.random(),
  words: {
    focus: "🧘 Stayed off social media: focus boost for next season (+2 all stats)",
    gained: (p, gain) => `📱 ${p.emoji} ${p.label}: gained ${gain.toFixed(1)}M followers!`,
    standingUp: n => `✨ Reputation +${n}`,
    standingDown: n => `⚠️ Reputation ${n}`,
    rival: name => `😤 Rivalry with ${name} intensifies!`,
    focusPaid: "🧘 Social media detox paid off: +2 to all stats!",
  },
};

/* ─── the season's own follower growth ─── */

/** Playing for one of these nations is worth half as much again online. */
const BIG_NATIONS = ["England", "Spain", "France", "Germany", "Brazil", "Argentina", "USA", "Mexico", "Japan", "Italy"];

export const SOCCER_FOLLOWER_GROWTH: FollowerGrowth<CareerState, SeasonRecord> = {
  buzz: (_s, season) => {
    let growth = 0;
    growth += season.goals * 0.02; // 20k per goal
    if (season.leagueTitle) growth += 0.5;
    if (season.championsLeague) growth += 1;
    if (season.worldCup) growth += 3;
    if (season.ballonDor) growth += 5;
    return growth;
  },
  homeMarket: s => (BIG_NATIONS.includes(s.nationality) ? 1.5 : 1),
  standing: popularity,
  standingRate: 0.005,
  viral: { chance: 0.05, min: 1, max: 5 },
  personality: s => personalityFollowerMult(s.personality),
  rng: () => Math.random(),
};

/* ─── the brand ladder ─── */

/** The tier ids soccer saves hold. See the note at the top of this file. */
export type SponsorshipTier = "local_brand" | "nike_adidas" | "global_ambassador" | "merchandise_line" | "cover_athlete";

const SOCCER_SAVE_IDS: Record<BrandRung, SponsorshipTier> = {
  local_deal: "local_brand",
  kit_deal: "nike_adidas",
  global_ambassador: "global_ambassador",
  own_line: "merchandise_line",
  game_cover: "cover_athlete",
};

const SOCCER_TIERS: BrandTierDef[] = [
  { id: "local_deal", name: "Local Brand Deal", emoji: "🏪", minFollowers: 1_000_000, income: 0.5 },
  { id: "kit_deal", name: "Global Boot Deal", emoji: "👟", minFollowers: 5_000_000, income: 3 },
  { id: "global_ambassador", name: "Global Brand Ambassador", emoji: "🌍", minFollowers: 15_000_000, income: 8 },
  { id: "own_line", name: "Own Merchandise Line", emoji: "👕", minFollowers: 30_000_000, income: 15 },
  { id: "game_cover", name: "Game Cover Athlete", emoji: "🎮", minFollowers: 50_000_000, income: 25 },
];

/** The ladder as the page, the badges and the boot event have always read
 *  it: rows keyed by the stored tier id. */
export const SPONSORSHIP_TIERS: { tier: SponsorshipTier; name: string; emoji: string; minFollowers: number; income: number }[] =
  SOCCER_TIERS.map(t => ({ tier: SOCCER_SAVE_IDS[t.id], name: t.name, emoji: t.emoji, minFollowers: t.minFollowers, income: t.income }));

/** The cover offer's terms. The card and the season log print these. */
export const SOCCER_COVER: CoverOfferDef = {
  minFollowers: 50_000_000,
  minRating: 90,
  pay: 25,
  followers: 5,
  declineStanding: 5,
  award: { name: "Game Cover Athlete", emoji: "🎮" },
};

export const SOCCER_BRAND: BrandSport<CareerState> = {
  tiers: SOCCER_TIERS,
  saveIds: SOCCER_SAVE_IDS,
  followerUnit: 1_000_000,
  followers,
  standing: popularity,
  cash: {
    get: s => s.netWorth,
    set: (s, v) => { s.netWorth = v; },
  },
  rating: s => s.overall,
  tier: {
    get: s => s.activeSponsorship,
    set: (s, stored) => { s.activeSponsorship = stored as SponsorshipTier; },
  },
  cover: {
    ...SOCCER_COVER,
    taken: {
      get: s => s.coverAthleteAccepted,
      set: (s, v) => { s.coverAthleteAccepted = v; },
    },
    waiting: {
      get: s => s.pendingCoverAthleteEvent,
      set: (s, v) => { s.pendingCoverAthleteEvent = v; },
    },
    record: (s, a) => {
      s.awards = [...s.awards, { year: s.seasons[s.seasons.length - 1]?.year || 2024, name: a.name, emoji: a.emoji }];
    },
  },
  fame: [[80, 2], [60, 1], [40, 0.3]],
  perFollower: 0.1, // €100k per 1M followers
  log,
  words: {
    signed: t => `${t.emoji} NEW SPONSORSHIP: ${t.name}, €${t.income}M/year!`,
    coverTaken: `🎮 You are the cover athlete of the world's biggest football video game! €${SOCCER_COVER.pay}M + ${SOCCER_COVER.followers}M followers + Legacy +10`,
    coverDeclined: `🎮 Declined the game cover: gained respect for being selective. Reputation +${SOCCER_COVER.declineStanding}`,
    money: m => `€${m}M`,
  },
};
