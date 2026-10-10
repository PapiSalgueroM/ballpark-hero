import { rollCareerChance } from "./careerChanceWheel";
/* ────────────────────────────────────────────────────────────────────────────
   soccerCareerLife.ts, the life layer for Soccer Career (Round 49)
   Personalities, agents, and the expanded off-pitch event catalog (ids 200+).
   The goal: life-sim chaos on a scale you rarely see, with real mechanical
   tradeoffs, so two careers never read the same.
   NOTE: this file only imports TYPES from soccerCareerEngine, so the
   engine -> soccerCareerLife runtime import has no cycle (same pattern
   as careerEras.ts).
   All new CareerState fields used here are OPTIONAL (personality, agentId,
   lifeFlags) so pre-Round-49 saves keep loading untouched.
   Round 725: every event carries a cooldown (see COOLDOWN below), the eight
   one button events got a real second choice, and ids 253 to 272 are new:
   family, media, money, injuries, the dressing room, agents, the national
   team, the fans and the late career. Three stories this file shares with
   other catalogs carry a STORY key so they happen once between them. Every
   speaker is a role or a generated person, never a real one.
   scripts/simCareerLifeCooldowns.mjs audits it.
   ──────────────────────────────────────────────────────────────────────────── */
import type { CareerState, RandomEvent } from "./soccerCareerEngine";
import {
  personalityOf, personalityMult, agentOf, agentWage, agentIncomeCut, agentTransferCut, identityBeatDue,
} from "./careerIdentity";
import type { IdentitySport, PersonalityDef, AgentDef } from "./careerIdentity";

/* ─── tiny local helpers (duplicated on purpose: no runtime import cycle) ─── */
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const flag = (s: CareerState, key: string): number => (s.lifeFlags || {})[key] || 0;
const setFlag = (s: CareerState, key: string, value: number) => {
  s.lifeFlags = { ...(s.lifeFlags || {}), [key]: value };
};
type StatKey = "pace" | "shooting" | "passing" | "dribbling" | "defending" | "physical" | "reflexes";
const bump = (s: CareerState, key: StatKey, n: number) => {
  s.statBoostNextSeason = { ...s.statBoostNextSeason, [key]: (s.statBoostNextSeason[key] || 0) + n };
};
const money = (s: CareerState, delta: number) => {
  s.netWorth = Math.round((s.netWorth + delta) * 100) / 100;
};
const followers = (s: CareerState, delta: number) => {
  s.socialMediaFollowers = Math.round((s.socialMediaFollowers + delta) * 100) / 100;
};
const log = (s: CareerState, line: string) => { s.events = [...s.events, line]; };

/* ─── Round 725: cooldowns ───
   Seasons an event sits out after it fires, one number per kind of story so
   the audit table in scripts/simCareerLifeCooldowns.mjs reads straight off
   the catalog. The picker in soccerCareerEngine holds an event out while
   (this season minus the season it last fired) is at most this number. ONCE
   is longer than any career, so that story happens one time. Events with no
   cooldown of their own fall back to the category default in the engine. */
export const COOLDOWN = {
  agent: 2,
  personality: 2,
  dressingRoom: 2,
  media: 1,
  money: 2,
  family: 2,
  injury: 3,
  fans: 2,
  national: 2,
  late: 2,
  once: 99,
} as const;

/* Stories told by more than one catalog. Every event carrying one of these
   shares a single cooldown entry, so the set behaves as one story. */
export const STORY = {
  squadChatLeak: "squadChatLeak",
  statueVote: "statueVote",
  podcastLaunch: "podcastLaunch",
} as const;

/* ─── Personalities ───
   Round 835: the rules (the bound on what a personality may move, the
   fallbacks, the staggered beats) live in careerIdentity.ts and every career
   shares them. What is soccer is below: who you can be, the two multipliers
   each one carries, the agents and their cuts. The multipliers used to be two
   switch statements; they are the same numbers, now on the row they belong
   to, so the perk a card prints and the number behind it sit side by side. */
export type { PersonalityDef, AgentDef } from "./careerIdentity";

export const PERSONALITIES: PersonalityDef[] = [
  { id: "showman", name: "The Showman", emoji: "🎭", blurb: "Cameras find you. You find them first.",
    perk: "Followers grow 60% faster, sponsors pay 25% more, scandals hit harder",
    followerMult: 1.6, sponsorMult: 1.25 },
  { id: "iceman", name: "Ice Cold", emoji: "🧊", blurb: "No celebration. No panic. No comment.",
    perk: "Sponsors trust you, drama slides off, slower follower growth",
    followerMult: 0.9, sponsorMult: 1.05 },
  { id: "hothead", name: "The Hothead", emoji: "🌋", blurb: "Plays angry. Lives angrier.",
    perk: "Exclusive chaos events and fear-factor edges, riskier sponsor money",
    followerMult: 1.15, sponsorMult: 0.9 },
  { id: "professor", name: "The Professor", emoji: "📐", blurb: "Watches film on the team bus. For fun.",
    perk: "Respected by managers and brands, fewer viral moments",
    followerMult: 0.85, sponsorMult: 1.1 },
  { id: "enigma", name: "The Enigma", emoji: "🃏", blurb: "Nobody, including you, knows what happens next.",
    perk: "Wildcard bonuses, cult following, chaos both ways",
    followerMult: 1.25, sponsorMult: 1 },
];

export const getPersonalityDef = (id?: string | null): PersonalityDef | undefined =>
  personalityOf(id, SOCCER_IDENTITY);

export function personalityFollowerMult(id?: string | null): number {
  return personalityMult(id, "followers", SOCCER_IDENTITY);
}

export function personalitySponsorMult(id?: string | null): number {
  return personalityMult(id, "sponsors", SOCCER_IDENTITY);
}

/* ─── Agents ─── */
export const AGENTS: AgentDef[] = [
  { id: "cousin", name: "Cousin Ricky", emoji: "🧢", blurb: "Family discount. Family-grade paperwork.",
    wageMult: 0.95, incomeCut: 0, transferCut: 0.03 },
  { id: "shark", name: "Marco De Luca", emoji: "🦈", blurb: "Mid-table clubs fear his ringtone.",
    wageMult: 1.1, incomeCut: 0.05, transferCut: 0.08 },
  { id: "super", name: "Zara Blackwood", emoji: "👑", blurb: "Has three club presidents on speed dial. Uses all three.",
    wageMult: 1.25, incomeCut: 0.1, transferCut: 0.12 },
  { id: "self", name: "No Agent", emoji: "🤝", blurb: "You negotiate for yourself.",
    wageMult: 1, incomeCut: 0, transferCut: 0 },
];

/** What makes the identity rules the soccer ones. Data, not rules. Legacy
 *  saves without an agent keep the old flat 10% transfer fee. */
export const SOCCER_IDENTITY: IdentitySport = {
  personalities: PERSONALITIES,
  agents: AGENTS,
  noAgentTransferCut: 0.1,
  beats: { personalityAge: 18, agentAge: 19 },
};

export const getAgentDef = (id?: string | null): AgentDef | undefined =>
  agentOf(id, SOCCER_IDENTITY);

export function agentWageMult(id?: string | null): number {
  return agentWage(id, SOCCER_IDENTITY);
}

export function agentIncomeCutRate(id?: string | null): number {
  return agentIncomeCut(id, SOCCER_IDENTITY);
}

export function agentTransferCutRate(id?: string | null): number {
  return agentTransferCut(id, SOCCER_IDENTITY);
}

/** The event that tells each identity beat in this catalog. */
const IDENTITY_EVENT = { personality: 200, agent: 201 } as const;

/** Events that must appear the season they become due (identity beats).
    Staggered on purpose: personality first, agent the season after. */
export function getPriorityLifeEventIds(state: CareerState): number[] {
  const ids: number[] = [];
  const beat = identityBeatDue(state, SOCCER_IDENTITY);
  if (beat) ids.push(IDENTITY_EVENT[beat]);
  /* Round 725: the comeback game (262) is a beat of the same kind. Left in
     the general draw it showed up in about one comeback in three, and a
     return from a long injury is not a story that should lose a raffle. */
  if (comebackDue(state) && !state.retired) ids.push(262);
  return ids;
}

/* The comeback game is only news while the serious injury is recent: it
   happened this season or the one before. Gated on any injury ever, a 33
   year old could be told about his first start since a layoff at 22. The
   injury cooldown keeps it to one comeback per injury. */
function comebackDue(state: CareerState): boolean {
  const lastSerious = state.seriousInjuries?.[state.seriousInjuries.length - 1];
  if (!lastSerious) return false;
  const seasonNow = state.seasons[state.seasons.length - 1]?.year ?? 0;
  return lastSerious.year >= seasonNow - 1;
}

/* ─── The life event catalog (ids 200+) ───
   Every event self-gates: it is only returned when its conditions hold, so
   generateRandomEvents needs no extra eligibility rules for this pool. */
export function getLifeEvents(state: CareerState): RandomEvent[] {
  const events: RandomEvent[] = [];
  const p = state.personality;
  const push = (e: RandomEvent) => events.push(e);

  /* ── 200: personality reveal ── */
  if (!state.personality && state.age >= 18) {
    push({ id: 200, cooldown: COOLDOWN.once, emoji: "🪞", title: "Who Are You, Really?",
      description: "Teammates, journalists and fans keep asking the same question: what is your deal? Time to decide what kind of player, and person, you are. This shapes your whole career.",
      category: "life", choices: [
        { label: "The Showman", emoji: "🎭", color: "bg-pink-600", consequence: "Fame comes easy: followers grow 60% faster, sponsors pay 25% more, scandals sting",
          apply: s => { s.personality = "showman"; s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.5) * 100) / 100; s.events = [...s.events, "🎭 You leaned into it: The Showman is born"]; return s; } },
        { label: "Ice Cold", emoji: "🧊", color: "bg-blue-600", consequence: "Unshakeable: steadier morale, trusted by sponsors, slower follower growth",
          apply: s => { s.personality = "iceman"; s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "🧊 You gave a one-word answer and walked off: Ice Cold"]; return s; } },
        { label: "The Hothead", emoji: "🌋", color: "bg-red-600", consequence: "Fire in everything: exclusive chaos events, fear factor, riskier sponsors",
          apply: s => { s.personality = "hothead"; s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) + 1 }; s.events = [...s.events, "🌋 You slammed the mixed zone table: The Hothead"]; return s; } },
        { label: "The Professor", emoji: "📐", color: "bg-emerald-600", consequence: "Student of the game: manager and brand respect, fewer viral moments",
          apply: s => { s.personality = "professor"; s.statBoostNextSeason = { ...s.statBoostNextSeason, passing: (s.statBoostNextSeason.passing || 0) + 1 }; s.events = [...s.events, "📐 You answered with a tactics board: The Professor"]; return s; } },
        { label: "The Enigma", emoji: "🃏", color: "bg-purple-600", consequence: "Pure wildcard: cult following, chaos bonuses in both directions",
          apply: s => { s.personality = "enigma"; s.popularity = clamp(s.popularity + 3, 0, 100); s.events = [...s.events, "🃏 You answered in riddles: The Enigma"]; return s; } },
      ] });
  }

  /* ── 201: pick an agent ── */
  if (state.personality && !state.agentId && state.age >= 19) {
    push({ id: 201, cooldown: COOLDOWN.once, emoji: "📇", title: "Everyone Wants To Rep You",
      description: "Three very different agents are blowing up your phone. Whoever you pick shapes every contract you ever sign.",
      category: "life", choices: [
        { label: "Cousin Ricky", emoji: "🧢", color: "bg-muted", consequence: "Family rates: tiny 3% transfer cut, zero income cut, slightly weak contracts, chaos guaranteed",
          apply: s => { s.agentId = "cousin"; s.events = [...s.events, "🧢 Signed with Cousin Ricky. What could go wrong"]; return s; } },
        { label: "Marco De Luca, the shark", emoji: "🦈", color: "bg-blue-600", consequence: "Solid: +10% wages, 5% income cut, 8% transfer cut",
          apply: s => { s.agentId = "shark"; s.events = [...s.events, "🦈 Signed with Marco De Luca. He already has three clubs circling"]; return s; } },
        { label: "Zara Blackwood, super agent", emoji: "👑", color: "bg-purple-600", consequence: "Elite: +25% wages, dream clubs pick up the phone, but 10% income cut and 12% transfer cut",
          apply: s => { s.agentId = "super"; s.events = [...s.events, "👑 Signed with Zara Blackwood. The market just noticed you"]; return s; } },
        { label: "Represent yourself", emoji: "🤝", color: "bg-emerald-600", consequence: "No cuts at all, no wage boost, no strings",
          apply: s => { s.agentId = "self"; s.events = [...s.events, "🤝 No agent. You read every contract yourself"]; return s; } },
      ] });
  }

  /* ── agent drama ── */
  if (state.agentId === "cousin" && Math.random() < 0.6) {
    push({ id: 205, cooldown: COOLDOWN.agent, emoji: "📱", title: "Ricky Posted Your Contract",
      description: "Cousin Ricky accidentally posted a screenshot of your full contract to his public story. The numbers are everywhere.",
      category: "negative", choices: [
        { label: "Laugh it off", emoji: "😅", color: "bg-amber-600", consequence: "Followers +400k, dressing room teases you forever",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.4) * 100) / 100; s.morale = clamp(s.morale - 3, 0, 100); s.events = [...s.events, "📱 Ricky leaked your contract. The memes were incredible"]; return s; } },
        { label: "Fire him", emoji: "🚪", color: "bg-red-600", consequence: "Represent yourself from now on, awkward family dinners",
          apply: s => { s.agentId = "self"; s.morale = clamp(s.morale - 5, 0, 100); s.events = [...s.events, "🚪 Fired Cousin Ricky. Thanksgiving will be tense"]; return s; } },
      ] });
  }
  if (state.agentId === "cousin" && Math.random() < 0.4) {
    push({ id: 206, cooldown: COOLDOWN.agent, emoji: "✈️", title: "Wrong Preseason, Ricky",
      description: "Ricky booked your preseason flights to the wrong country. You joined a stranger's training camp for two days before anyone noticed.",
      category: "negative", choices: [
        { label: "Train with the strangers anyway", emoji: "🏃", color: "bg-emerald-600", consequence: "Story goes viral: followers +600k, Physical +1 next season",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.6) * 100) / 100; s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) + 1 }; s.events = [...s.events, "✈️ Trained two days with the wrong club. Legendary"]; return s; } },
        { label: "Get home quietly", emoji: "🤫", color: "bg-muted", consequence: "Morale -4, nobody finds out. Probably",
          apply: s => { s.morale = clamp(s.morale - 4, 0, 100); s.events = [...s.events, "✈️ Ricky sent you to the wrong country. You told no one"]; return s; } },
      ] });
  }
  if (state.agentId === "shark" && Math.random() < 0.4) {
    push({ id: 207, cooldown: COOLDOWN.agent, emoji: "🦈", title: "Double Agent",
      description: "You find out Marco also represents your direct rival for the same position, and he has been pitching you both to the same clubs.",
      category: "negative", choices: [
        { label: "Confront him", emoji: "😠", color: "bg-red-600", consequence: "He promises loyalty, next contract gets his full effort: Morale +5",
          apply: s => { s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "🦈 Confronted Marco. He swore loyalty on his ringtone"]; return s; } },
        { label: "Fire him on the spot", emoji: "🚪", color: "bg-amber-600", consequence: "Represent yourself from now on",
          apply: s => { s.agentId = "self"; s.events = [...s.events, "🚪 Fired Marco De Luca mid-espresso"]; return s; } },
        { label: "Use it: make him bid clubs against each other", emoji: "🧠", color: "bg-emerald-600", consequence: "Market value +€3M, integrity -2",
          apply: s => { s.marketValue += 3; s.integrityBonus -= 2; s.events = [...s.events, "🧠 Turned Marco's double game to your advantage"]; return s; } },
      ] });
  }
  if (state.agentId === "super" && Math.random() < 0.4) {
    push({ id: 208, cooldown: COOLDOWN.agent, emoji: "🗞️", title: "The Leak",
      description: "Zara leaked fake transfer interest to three newspapers to spike your value. Your manager is furious. Your value did spike though.",
      category: "negative", choices: [
        { label: "Play dumb, enjoy the raise", emoji: "🤷", color: "bg-amber-600", consequence: "Market value +€5M, Morale -5, integrity -2",
          apply: s => { s.marketValue += 5; s.morale = clamp(s.morale - 5, 0, 100); s.integrityBonus -= 2; s.events = [...s.events, "🗞️ Zara's leak worked. You said nothing"]; return s; } },
        { label: "Publicly shut it down", emoji: "🛑", color: "bg-blue-600", consequence: "Manager trust restored: Morale +5, integrity +3",
          apply: s => { s.morale = clamp(s.morale + 5, 0, 100); s.integrityBonus += 3; s.events = [...s.events, "🛑 Shut down Zara's fake transfer story yourself"]; return s; } },
      ] });
  }

  /* ── personality exclusives ── */
  if (p === "showman" && Math.random() < 0.5) {
    push({ id: 210, cooldown: COOLDOWN.personality, emoji: "🤸", title: "The Halftime Backflip",
      description: "The warm-up DJ plays your song at halftime. The crowd starts chanting for the backflip you posted last summer.",
      category: "life", choices: [
        { label: "Give the people the flip", emoji: "🤸", color: "bg-pink-600", consequence: "Followers +1.5M, 15% chance of a tweaked hamstring (Pace -1)",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1.5) * 100) / 100; if (rollCareerChance(s, 0.15, "The Halftime Backflip", "Hamstring tweaked", "Backflip lands safely")) { s.pace = clamp(s.pace - 1, 20, 99); s.events = [...s.events, "🤸 Backflip landed. Hamstring did not. Pace -1"]; } else { s.events = [...s.events, "🤸 Halftime backflip. The clip hit every platform"]; } return s; } },
        { label: "Point at the scoreboard instead", emoji: "🧠", color: "bg-muted", consequence: "Professional. Boring. Safe",
          apply: s => { s.events = [...s.events, "🤸 Declined the backflip. The crowd booed lovingly"]; return s; } },
      ] });
  }
  if (p === "showman" && Math.random() < 0.35) {
    push({ id: 211, cooldown: COOLDOWN.once, emoji: "🕶️", title: "Trademark the Celebration",
      description: "Your goggles celebration is everywhere. A lawyer suggests trademarking it for merch.",
      category: "life", choices: [
        { label: "Trademark it", emoji: "®️", color: "bg-emerald-600", consequence: "Sponsorship income +€300k/yr",
          apply: s => { s.sponsorBonus = Math.round(((s.sponsorBonus ?? 0) + 0.3) * 100) / 100; s.events = [...s.events, "®️ Trademarked your celebration. The merch prints money"]; return s; } },
        { label: "Let the kids use it free", emoji: "❤️", color: "bg-blue-600", consequence: "Integrity +4, playgrounds everywhere copy you",
          apply: s => { s.integrityBonus += 4; s.popularity = clamp(s.popularity + 4, 0, 100); s.events = [...s.events, "❤️ Kept the celebration free for every playground on earth"]; return s; } },
      ] });
  }
  if (p === "iceman" && Math.random() < 0.5) {
    push({ id: 212, cooldown: COOLDOWN.personality, emoji: "🧊", title: "No Celebration",
      description: "You score against your boyhood club and simply raise both hands in apology. The stadium, both ends, applauds.",
      category: "positive", choices: [
        { label: "Class is permanent", emoji: "🤝", color: "bg-blue-600", consequence: "Integrity +3, Popularity +5",
          apply: s => { s.integrityBonus += 3; s.popularity = clamp(s.popularity + 5, 0, 100); s.events = [...s.events, "🧊 Refused to celebrate against your old club. Pure class"]; return s; } },
        { label: "One small wave to the away end", emoji: "👋", color: "bg-muted", consequence: "Popularity +2, Morale +2, both ends still clap",
          apply: s => { s.popularity = clamp(s.popularity + 2, 0, 100); s.morale = clamp(s.morale + 2, 0, 100); log(s, "👋 Scored against your old club and waved once. Everyone understood"); return s; } },
      ] });
  }
  if (p === "iceman" && Math.random() < 0.35) {
    push({ id: 213, cooldown: COOLDOWN.personality, emoji: "🎤", title: "The One-Word Interview",
      description: "A reporter asks you eleven questions after the match. You answer all eleven with the word 'yes'. It becomes a meme format.",
      category: "life", choices: [
        { label: "Yes", emoji: "🧊", color: "bg-blue-600", consequence: "Followers +500k, journalists hate it",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.5) * 100) / 100; s.popularity = clamp(s.popularity - 2, 0, 100); s.events = [...s.events, "🎤 The all-yes interview became a meme format"]; return s; } },
        { label: "Answer the twelfth question properly", emoji: "🎙️", color: "bg-muted", consequence: "Popularity +2, the meme loses its ending",
          apply: s => { s.popularity = clamp(s.popularity + 2, 0, 100); log(s, "🎙️ Eleven yeses and then a full sentence. The reporter nearly fainted"); return s; } },
      ] });
  }
  if (p === "hothead" && Math.random() < 0.5) {
    push({ id: 214, cooldown: COOLDOWN.personality, emoji: "🚇", title: "Tunnel Incident",
      description: "An opponent stepped on your boot in the tunnel. On purpose. Everyone is watching what you do next.",
      category: "negative", choices: [
        { label: "Get in his face", emoji: "😤", color: "bg-red-600", consequence: "€200k fine, Physical +1 next season, defenders think twice now",
          apply: s => { s.netWorth = Math.round((s.netWorth - 0.2) * 100) / 100; s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) + 1 }; s.events = [...s.events, "🚇 Tunnel confrontation. Fined, feared, worth it"]; return s; } },
        { label: "Stare. Say nothing. Walk away", emoji: "🥶", color: "bg-emerald-600", consequence: "Integrity +2, the stare goes viral anyway",
          apply: s => { s.integrityBonus += 2; s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.3) * 100) / 100; s.events = [...s.events, "🥶 The tunnel stare went viral. Scarier than shouting"]; return s; } },
      ] });
  }
  if (p === "hothead" && Math.random() < 0.35) {
    push({ id: 215, cooldown: COOLDOWN.personality, emoji: "🧃", title: "The Drinks Cart Flip",
      description: "Subbed off at 60 minutes in a match you were winning by yourself. The drinks cart caught the full force of your opinion.",
      category: "negative", choices: [
        { label: "No regrets", emoji: "🌋", color: "bg-red-600", consequence: "Morale +8 (you needed that), €100k fine",
          apply: s => { s.morale = clamp(s.morale + 8, 0, 100); s.netWorth = Math.round((s.netWorth - 0.1) * 100) / 100; s.events = [...s.events, "🧃 Flipped the drinks cart. Honestly? Therapeutic"]; return s; } },
        { label: "Buy the kit man a new cart, apologize", emoji: "🛒", color: "bg-blue-600", consequence: "Integrity +3, dressing room respect",
          apply: s => { s.integrityBonus += 3; s.morale = clamp(s.morale + 3, 0, 100); s.events = [...s.events, "🛒 Bought the kit man a top of the line cart. All good"]; return s; } },
      ] });
  }
  if (p === "professor" && Math.random() < 0.5) {
    push({ id: 216, cooldown: COOLDOWN.personality, emoji: "📽️", title: "Film Room Legend",
      description: "You spotted the opponent's penalty pattern from three seasons of film and briefed the keeper. He saved two in the shootout.",
      category: "positive", choices: [
        { label: "The work is the reward", emoji: "📐", color: "bg-emerald-600", consequence: "Passing +1 next season, Morale +5, manager trust",
          apply: s => { s.statBoostNextSeason = { ...s.statBoostNextSeason, passing: (s.statBoostNextSeason.passing || 0) + 1 }; s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "📽️ Your film study won a shootout. The keeper owes you dinner"]; return s; } },
        { label: "Share the whole dossier with the back line", emoji: "📋", color: "bg-blue-600", consequence: "Integrity +2, Morale +3, the keeper is slightly less special now",
          apply: s => { s.integrityBonus += 2; s.morale = clamp(s.morale + 3, 0, 100); log(s, "📋 Handed the penalty dossier to the whole defence. Four of them now study film"); return s; } },
      ] });
  }
  if (p === "professor" && Math.random() < 0.35) {
    push({ id: 217, cooldown: COOLDOWN.once, emoji: "🗞️", title: "The Tactics Column",
      description: "A newspaper offers you a weekly tactics column. Smart, respected, and guaranteed to annoy your manager whenever you analyze your own team.",
      category: "life", choices: [
        { label: "Write it", emoji: "✍️", color: "bg-emerald-600", consequence: "Popularity +4, Morale -3 when the manager reads issue two",
          apply: s => { s.popularity = clamp(s.popularity + 4, 0, 100); s.morale = clamp(s.morale - 3, 0, 100); s.events = [...s.events, "✍️ Your tactics column is a hit. The gaffer underlines things in red"]; return s; } },
        { label: "Keep the notes private", emoji: "🔒", color: "bg-muted", consequence: "The knowledge stays in-house",
          apply: s => { s.events = [...s.events, "🔒 Declined the column. Your notebook stays classified"]; return s; } },
      ] });
  }
  if (p === "enigma" && Math.random() < 0.5) {
    push({ id: 218, cooldown: COOLDOWN.personality, emoji: "⛰️", title: "The Monastery Offseason",
      description: "You spent the entire offseason at a mountain monastery. No phone. No boots. Nobody knew where you were, including your club.",
      category: "life", choices: [
        { label: "Return enlightened", emoji: "🧘", color: "bg-purple-600", consequence: "60%: all stats +1 next season. 40%: Pace -1, you mostly learned soup",
          apply: s => { if (rollCareerChance(s, 0.6, "The Monastery Offseason", "Sharper after the retreat", "Pace drops by 1")) { s.statBoostNextSeason = { pace: 1, shooting: 1, passing: 1, dribbling: 1, defending: 1, physical: 1 }; s.events = [...s.events, "⛰️ Came back from the monastery visibly sharper. Spooky"]; } else { s.pace = clamp(s.pace - 1, 20, 99); s.events = [...s.events, "⛰️ The monastery taught you inner peace and excellent soup. Pace -1"]; } return s; } },
        { label: "Leave after a week, the silence was loud", emoji: "🔔", color: "bg-muted", consequence: "Morale +3, nothing else changes, the monks send a card",
          apply: s => { s.morale = clamp(s.morale + 3, 0, 100); log(s, "🔔 Lasted a week at the monastery. The card they sent is on your fridge"); return s; } },
      ] });
  }
  if (p === "enigma" && Math.random() < 0.35) {
    push({ id: 219, cooldown: COOLDOWN.once, emoji: "🦇", title: "The Cape Era",
      description: "You arrived at training in a full-length cape. When asked why, you said 'the wind'. You have worn it every day since.",
      category: "life", choices: [
        { label: "Commit to the cape", emoji: "🦇", color: "bg-purple-600", consequence: "Followers +800k, coin flip on public opinion",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.8) * 100) / 100; if (rollCareerChance(s, 0.5, "The Cape Era", "The cape is loved", "The cape divides opinion")) { s.popularity = clamp(s.popularity + 6, 0, 100); s.events = [...s.events, "🦇 The cape era is beloved. Fans wear them to matches"]; } else { s.popularity = clamp(s.popularity - 3, 0, 100); s.events = [...s.events, "🦇 The cape era divides the nation. You do not care"]; } return s; } },
        { label: "Retire the cape", emoji: "🧥", color: "bg-muted", consequence: "The mystery deepens",
          apply: s => { s.events = [...s.events, "🧥 The cape vanished as suddenly as it appeared"]; return s; } },
      ] });
  }

  /* ── wild general pool ── */
  /* 220, 232 and 244 each tell a story another catalog tells too (eras 63
     and realism 422, realism 462, eras 68), so the set shares one story key
     and happens once a career between them. */
  push({ id: 220, story: STORY.squadChatLeak, cooldown: COOLDOWN.once, emoji: "💬", title: "The Group Chat Leak",
    description: "Someone screenshots the squad group chat, including your message rating the manager's new haircut 'a 2, maybe a 3 in fog'.",
    category: "negative", choices: [
      { label: "Own it: it was funny", emoji: "😂", color: "bg-amber-600", consequence: "Followers +700k, Morale -5, manager side-eye",
        apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.7) * 100) / 100; s.morale = clamp(s.morale - 5, 0, 100); s.events = [...s.events, "💬 The haircut text leaked. You stood by your rating"]; return s; } },
      { label: "Apologize with a gift", emoji: "🎁", color: "bg-blue-600", consequence: "A luxury barber voucher: -€20k, Morale +3",
        apply: s => { s.netWorth = Math.round((s.netWorth - 0.02) * 100) / 100; s.morale = clamp(s.morale + 3, 0, 100); s.events = [...s.events, "🎁 Apologized for the haircut text with a barber voucher. He used it"]; return s; } },
      { label: "Hunt the leaker", emoji: "🕵️", color: "bg-red-600", consequence: "50%: find them (Morale +6). 50%: paranoia (Morale -6)",
        apply: s => { if (rollCareerChance(s, 0.5, "The Group Chat Leak", "Leaker found", "Leaker not found")) { s.morale = clamp(s.morale + 6, 0, 100); s.events = [...s.events, "🕵️ Found the group chat leaker. It was the physio"]; } else { s.morale = clamp(s.morale - 6, 0, 100); s.events = [...s.events, "🕵️ Never found the leaker. You trust no one now"]; } return s; } },
    ] });

  push({ id: 221, cooldown: COOLDOWN.once, emoji: "🎤", title: "Karaoke Night Leak",
    description: "Video of your initiation karaoke escapes the team dinner. Your rendition was, being generous, an experience.",
    category: "life", choices: [
      { label: "Post the full version yourself", emoji: "🎶", color: "bg-emerald-600", consequence: "Followers +1M, the people love a bad singer",
        apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1) * 100) / 100; s.popularity = clamp(s.popularity + 4, 0, 100); s.events = [...s.events, "🎶 Posted your own karaoke disaster. Instant classic"]; return s; } },
      { label: "Never speak of it again", emoji: "🤐", color: "bg-muted", consequence: "It resurfaces every birthday forever",
        apply: s => { s.events = [...s.events, "🤐 The karaoke video lives on in the group chat only"]; return s; } },
    ] });

  if (state.morale <= 60) {
    push({ id: 222, cooldown: COOLDOWN.once, emoji: "🛫", title: "Wrong City",
      description: "You boarded the wrong connecting flight after the international break and landed 900 miles from the away match.",
      category: "negative", choices: [
        { label: "Rent a car, drive all night, make kickoff", emoji: "🚗", color: "bg-emerald-600", consequence: "Legendary commitment: Morale +6, Physical -1 next season",
          apply: s => { s.morale = clamp(s.morale + 6, 0, 100); s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) - 1 }; s.events = [...s.events, "🚗 Drove nine hours overnight and still made kickoff"]; return s; } },
        { label: "Miss the match, tell the truth", emoji: "🤷", color: "bg-muted", consequence: "Morale -5, the story becomes a documentary punchline",
          apply: s => { s.morale = clamp(s.morale - 5, 0, 100); s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.3) * 100) / 100; s.events = [...s.events, "🛫 Missed a match by boarding the wrong plane. Iconic, unfortunately"]; return s; } },
      ] });
  }

  push({ id: 223, cooldown: COOLDOWN.dressingRoom, emoji: "🎧", title: "The Aux Cord War",
    description: "The dressing room speaker has been hijacked by a defender who exclusively plays whale sounds 'for focus'. The squad looks to you.",
    category: "life", choices: [
      { label: "Seize the aux", emoji: "🎧", color: "bg-emerald-600", consequence: "Your playlist unites the squad: Morale +6",
        apply: s => { s.morale = clamp(s.morale + 6, 0, 100); s.events = [...s.events, "🎧 Won the aux cord war. The whale era is over"]; return s; } },
      { label: "Broker a schedule", emoji: "📋", color: "bg-blue-600", consequence: "Diplomacy: Morale +3, whales on Wednesdays",
        apply: s => { s.morale = clamp(s.morale + 3, 0, 100); s.integrityBonus += 1; s.events = [...s.events, "📋 Negotiated the aux schedule. Whales on Wednesdays only"]; return s; } },
    ] });

  push({ id: 224, cooldown: COOLDOWN.fans, emoji: "🦅", title: "Mascot Beef",
    description: "The club mascot challenged you to a race at halftime and has been talking trash on the club's official account all week.",
    category: "life", choices: [
      { label: "Race the mascot", emoji: "🏃", color: "bg-amber-600", consequence: "70%: win, +400k followers. 30%: lose to a person in a giant bird suit",
        apply: s => { if (rollCareerChance(s, 0.7, "Mascot Beef", "You win the race", "The mascot wins")) { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.4) * 100) / 100; s.events = [...s.events, "🏃 Beat the mascot in the halftime race. Order restored"]; } else { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.8) * 100) / 100; s.popularity = clamp(s.popularity - 2, 0, 100); s.events = [...s.events, "🦅 Lost a footrace to the mascot. The internet will never let go"]; } return s; } },
      { label: "Ignore the bird", emoji: "🙄", color: "bg-muted", consequence: "The mascot declares victory by forfeit",
        apply: s => { s.events = [...s.events, "🙄 Refused the mascot race. It did a victory lap anyway"]; return s; } },
    ] });

  if (state.age >= 26 && state.popularity >= 55) {
    push({ id: 225, cooldown: COOLDOWN.once, emoji: "📖", title: "The Tell-All Book Offer",
      description: "A publisher offers €1.5M for a tell-all autobiography. NOW, mid-career, with names named.",
      category: "life", choices: [
        { label: "Name names: €1.5M", emoji: "💣", color: "bg-red-600", consequence: "Net worth +€1.5M, Morale -10, dressing room goes cold, integrity -3",
          apply: s => { s.netWorth = Math.round((s.netWorth + 1.5) * 100) / 100; s.morale = clamp(s.morale - 10, 0, 100); s.integrityBonus -= 3; s.events = [...s.events, "💣 Published the tell-all. Two teammates no longer pass to you"]; return s; } },
        { label: "Save it for retirement", emoji: "⏳", color: "bg-blue-600", consequence: "Integrity +3, the stories keep marinating",
          apply: s => { s.integrityBonus += 3; s.events = [...s.events, "⏳ Turned down the tell-all. For now"]; return s; } },
      ] });
  }

  if (state.netWorth >= 1.5 && !flag(state, "esports")) {
    push({ id: 226, cooldown: COOLDOWN.once, emoji: "🎮", title: "Buy an Esports Team?",
      description: "A struggling esports org is for sale for €800k. Your gamer teammates swear it is about to blow up.",
      category: "life", choices: [
        { label: "Buy the org: €800k", emoji: "🕹️", color: "bg-purple-600", consequence: "Results arrive next season",
          apply: s => { s.netWorth = Math.round((s.netWorth - 0.8) * 100) / 100; setFlag(s, "esports", 1); s.events = [...s.events, "🕹️ Bought an esports org. Your bio now says 'investor'"]; return s; } },
        { label: "Pass", emoji: "✋", color: "bg-muted", consequence: "Stick to the grass game",
          apply: s => { s.events = [...s.events, "✋ Passed on the esports org"]; return s; } },
      ] });
  }
  if (flag(state, "esports") === 1) {
    push({ id: 227, cooldown: COOLDOWN.once, emoji: "🏆", title: "Esports Season Results",
      description: "Your esports team's season just wrapped. The group chat has been suspiciously quiet.",
      category: "life", choices: [
        { label: "Check the standings", emoji: "📊", color: "bg-purple-600", consequence: "40%: they won it all (+€2M). 60%: they folded (-€300k more)",
          apply: s => { setFlag(s, "esports", 2); if (rollCareerChance(s, 0.4, "Esports Season Results", "Your team wins", "The organisation folds")) { s.netWorth = Math.round((s.netWorth + 2) * 100) / 100; s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.5) * 100) / 100; s.events = [...s.events, "🏆 Your esports team won the whole thing! +€2M"]; } else { s.netWorth = Math.round((s.netWorth - 0.3) * 100) / 100; s.events = [...s.events, "📉 The esports org folded. The jerseys are collectors items now"]; } return s; } },
        { label: "Sell your stake before the results post", emoji: "💸", color: "bg-muted", consequence: "Net worth +€500k back, you never find out how they did",
          apply: s => { setFlag(s, "esports", 2); money(s, 0.5); log(s, "💸 Sold the esports org the night before the final. You have never checked the score"); return s; } },
      ] });
  }

  push({ id: 228, cooldown: COOLDOWN.once, emoji: "⛳", title: "The Golf Bug",
    description: "A veteran teammate takes you golfing once. ONCE. You now own four putters and talk about wind.",
    category: "life", choices: [
      { label: "Embrace the golf life", emoji: "⛳", color: "bg-emerald-600", consequence: "Morale +8, Pace -1 next season (cart life)",
        apply: s => { s.morale = clamp(s.morale + 8, 0, 100); s.statBoostNextSeason = { ...s.statBoostNextSeason, pace: (s.statBoostNextSeason.pace || 0) - 1 }; s.events = [...s.events, "⛳ Fully golf-pilled. Your happy place has 18 holes"]; return s; } },
      { label: "Delete the tee time app", emoji: "🗑️", color: "bg-muted", consequence: "Focus preserved. The putters stay in the garage",
        apply: s => { s.events = [...s.events, "🗑️ Quit golf before it consumed you. The putters watch silently"]; return s; } },
    ] });

  push({ id: 229, cooldown: COOLDOWN.dressingRoom, emoji: "🥛", title: "The Milk Protocol",
    description: "A wellness influencer convinces half the squad that an all-dairy recovery protocol is the future. There is a group discount.",
    category: "life", choices: [
      { label: "Try the protocol", emoji: "🥛", color: "bg-amber-600", consequence: "50%: Physical +1 next season somehow. 50%: catastrophic gut week, Morale -6",
        apply: s => { if (rollCareerChance(s, 0.5, "The Milk Protocol", "The protocol works", "The protocol goes badly")) { s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) + 1 }; s.events = [...s.events, "🥛 The milk protocol worked?? Nutritionists are furious"]; } else { s.morale = clamp(s.morale - 6, 0, 100); s.events = [...s.events, "🥛 The milk protocol was a war crime against your stomach"]; } return s; } },
      { label: "Trust the club nutritionist", emoji: "🥗", color: "bg-emerald-600", consequence: "Sensible: Morale +2",
        apply: s => { s.morale = clamp(s.morale + 2, 0, 100); s.events = [...s.events, "🥗 Declined the milk protocol. The nutritionist wept with joy"]; return s; } },
    ] });

  if (!flag(state, "cursedBoots")) {
    push({ id: 230, cooldown: COOLDOWN.once, emoji: "👟", title: "The Cursed Boots",
      description: "Your new limited-edition boots have not seen a single win. Seven matches. The kit man refuses to touch them. He crosses himself near your locker.",
      category: "life", choices: [
        { label: "Keep wearing them: superstition is fake", emoji: "🧪", color: "bg-red-600", consequence: "Science! The curse saga continues next season",
          apply: s => { setFlag(s, "cursedBoots", 1); s.morale = clamp(s.morale - 3, 0, 100); s.events = [...s.events, "👟 Kept the cursed boots. The kit man now salts the doorway"]; return s; } },
        { label: "Burn them in the parking lot", emoji: "🔥", color: "bg-amber-600", consequence: "Morale +5, sponsor mildly concerned, the video goes viral",
          apply: s => { s.morale = clamp(s.morale + 5, 0, 100); s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.4) * 100) / 100; s.events = [...s.events, "🔥 Ceremonially burned the cursed boots. The squad attended"]; return s; } },
      ] });
  }
  if (flag(state, "cursedBoots") === 1) {
    push({ id: 231, cooldown: COOLDOWN.once, emoji: "✨", title: "The Curse Breaks",
      description: "You scored a hat trick in the cursed boots. The kit man has framed them. Scientists want to study you.",
      category: "positive", choices: [
        { label: "Vindication", emoji: "✨", color: "bg-emerald-600", consequence: "Shooting +2 next season, followers +500k, curse officially reversed",
          apply: s => { setFlag(s, "cursedBoots", 2); s.statBoostNextSeason = { ...s.statBoostNextSeason, shooting: (s.statBoostNextSeason.shooting || 0) + 2 }; s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.5) * 100) / 100; s.events = [...s.events, "✨ The cursed boots delivered a hat trick. You were right all along"]; return s; } },
        { label: "Retire the boots at their peak", emoji: "🏛️", color: "bg-muted", consequence: "Morale +4, Followers +200k, the kit man builds a small shrine",
          apply: s => { setFlag(s, "cursedBoots", 2); s.morale = clamp(s.morale + 4, 0, 100); followers(s, 0.2); log(s, "🏛️ Retired the boots after the hat trick. The kit man lights a candle on matchdays"); return s; } },
      ] });
  }

  if (state.overall >= 84 && state.age >= 27) {
    push({ id: 232, story: STORY.statueVote, cooldown: COOLDOWN.once, emoji: "🗿", title: "The Statue Vote",
      description: "Your hometown council is voting on a statue of you outside the stadium where you played as a kid.",
      category: "life", choices: [
        { label: "Attend the vote", emoji: "🗿", color: "bg-amber-600", consequence: "60%: it passes, Legacy +8. 40%: rejected 5 votes to 4, ouch",
          apply: s => { if (rollCareerChance(s, 0.6, "The Statue Vote", "Statue vote passes", "Statue vote fails")) { s.integrityBonus += 8; s.morale = clamp(s.morale + 8, 0, 100); s.events = [...s.events, "🗿 The statue vote passed! Bronze you goes up next spring"]; } else { s.morale = clamp(s.morale - 5, 0, 100); s.events = [...s.events, "🗿 The statue vote failed 5 to 4. Councilman Dave will be hearing about this"]; } return s; } },
        { label: "Ask them to fund youth pitches instead", emoji: "⚽", color: "bg-emerald-600", consequence: "Integrity +10, the real legacy",
          apply: s => { s.integrityBonus += 10; s.events = [...s.events, "⚽ Redirected the statue budget to youth pitches. Better than bronze"]; return s; } },
      ] });
  }

  if (state.popularity >= 60) {
    push({ id: 233, cooldown: COOLDOWN.once, emoji: "🗽", title: "The Wax Statue",
      description: "A famous wax museum unveils your figure. It looks like you, if you were a startled substitute teacher from a different, sadder timeline.",
      category: "life", choices: [
        { label: "Pose next to it grinning", emoji: "📸", color: "bg-emerald-600", consequence: "Followers +800k, self-awareness is elite",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.8) * 100) / 100; s.popularity = clamp(s.popularity + 4, 0, 100); s.events = [...s.events, "📸 Posed with your terrible wax figure. Comedy gold"]; return s; } },
        { label: "Demand a redo", emoji: "😤", color: "bg-red-600", consequence: "Popularity -3, the museum posts the demand letter",
          apply: s => { s.popularity = clamp(s.popularity - 3, 0, 100); s.events = [...s.events, "😤 Demanded a wax redo. The internet sided with the statue"]; return s; } },
      ] });
  }

  if (state.popularity >= 40 && !flag(state, "lookalike")) {
    push({ id: 234, cooldown: COOLDOWN.once, emoji: "🥸", title: "The Lookalike",
      description: "A man who looks 70% like you has been opening supermarkets and charging for autographs two towns over.",
      category: "negative", choices: [
        { label: "Send the lawyers: €300k", emoji: "⚖️", color: "bg-blue-600", consequence: "Problem solved permanently",
          apply: s => { s.netWorth = Math.round((s.netWorth - 0.3) * 100) / 100; setFlag(s, "lookalike", 2); s.events = [...s.events, "⚖️ Lawyers ended the lookalike's grand opening career"]; return s; } },
        { label: "Ignore him, it is flattering", emoji: "🤷", color: "bg-muted", consequence: "What is the worst that could happen",
          apply: s => { setFlag(s, "lookalike", 1); s.events = [...s.events, "🤷 Let the lookalike cook. Surely this is fine"]; return s; } },
      ] });
  }
  if (flag(state, "lookalike") === 1) {
    push({ id: 235, cooldown: COOLDOWN.once, emoji: "🚨", title: "The Lookalike Strikes Again",
      description: "Your lookalike crashed a luxury car dealership event, 'test drove' a supercar, and the invoice came to you.",
      category: "negative", choices: [
        { label: "Pay it and END this: €500k total", emoji: "💸", color: "bg-red-600", consequence: "Net worth -€500k, lawyers engaged, lesson learned",
          apply: s => { s.netWorth = Math.round((s.netWorth - 0.5) * 100) / 100; setFlag(s, "lookalike", 2); s.events = [...s.events, "💸 The lookalike's joyride cost you €500k. Never again"]; return s; } },
        { label: "Meet him. Hire him as your official decoy", emoji: "🥸", color: "bg-purple-600", consequence: "Galaxy brain: -€100k/yr but paparazzi chaos, followers +600k",
          apply: s => { s.netWorth = Math.round((s.netWorth - 0.1) * 100) / 100; setFlag(s, "lookalike", 3); s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.6) * 100) / 100; s.events = [...s.events, "🥸 Hired your lookalike as a decoy. The paparazzi are so confused"]; return s; } },
      ] });
  }

  if (!flag(state, "teammateLoan") && state.netWorth >= 0.5) {
    push({ id: 236, cooldown: COOLDOWN.once, emoji: "🤲", title: "A Teammate Needs €200k",
      description: "A squad player pulls you aside. Family trouble back home, he says. He needs €200k and swears he is good for it.",
      category: "life", choices: [
        { label: "Lend it, no questions", emoji: "🤝", color: "bg-blue-600", consequence: "-€200k for now. Repayment story continues later",
          apply: s => { s.netWorth = Math.round((s.netWorth - 0.2) * 100) / 100; setFlag(s, "teammateLoan", 1); s.integrityBonus += 2; s.events = [...s.events, "🤝 Lent a teammate €200k on a handshake"]; return s; } },
        { label: "Offer help finding a proper loan instead", emoji: "🏦", color: "bg-emerald-600", consequence: "Responsible, slightly awkward: Morale -2",
          apply: s => { s.morale = clamp(s.morale - 2, 0, 100); setFlag(s, "teammateLoan", 9); s.events = [...s.events, "🏦 Helped a teammate get a real loan instead of cash"]; return s; } },
      ] });
  }
  if (flag(state, "teammateLoan") === 1) {
    push({ id: 237, cooldown: COOLDOWN.once, emoji: "💌", title: "The Repayment",
      description: "An envelope appears in your locker from the teammate you helped.",
      category: "life", choices: [
        { label: "Open it", emoji: "✉️", color: "bg-blue-600", consequence: "65%: €400k and a thank you letter. 35%: a signed shirt and an apology",
          apply: s => { setFlag(s, "teammateLoan", 2); if (rollCareerChance(s, 0.65, "The Repayment", "Repaid with a letter", "No repayment")) { s.netWorth = Math.round((s.netWorth + 0.4) * 100) / 100; s.morale = clamp(s.morale + 6, 0, 100); s.events = [...s.events, "💌 He paid back double with a handwritten letter. Faith in people: restored"]; } else { s.morale = clamp(s.morale - 4, 0, 100); s.integrityBonus += 2; s.events = [...s.events, "💌 He could not pay it back. The signed shirt hangs in your gym anyway"]; } return s; } },
        { label: "Hand it back unopened, call it a gift", emoji: "🎁", color: "bg-emerald-600", consequence: "Integrity +4, Morale +3, he has a quiet moment in the car park",
          apply: s => { setFlag(s, "teammateLoan", 2); s.integrityBonus += 4; s.morale = clamp(s.morale + 3, 0, 100); log(s, "🎁 Gave the envelope back unopened. He did not say anything. He did not need to"); return s; } },
      ] });
  }

  push({ id: 238, cooldown: COOLDOWN.once, emoji: "🐦", title: "The Pigeon",
    description: "A pigeon landed on your shoulder during a stoppage and refused to leave for four minutes of live television. Commentators named it Gerald.",
    category: "life", choices: [
      { label: "Adopt Gerald", emoji: "🐦", color: "bg-emerald-600", consequence: "Followers +1M, Gerald gets his own merch line",
        apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1) * 100) / 100; s.morale = clamp(s.morale + 4, 0, 100); s.events = [...s.events, "🐦 Adopted Gerald the pigeon. He has a better sponsorship than some teammates"]; return s; } },
      { label: "Gently decline pigeon ownership", emoji: "🕊️", color: "bg-muted", consequence: "Gerald visits on his own schedule now",
        apply: s => { s.events = [...s.events, "🕊️ Gerald remains a free pigeon. He still sits on the crossbar sometimes"]; return s; } },
    ] });

  push({ id: 239, cooldown: COOLDOWN.dressingRoom, emoji: "🐍", title: "Prank War Escalation",
    description: "The dressing room prank war has escalated. There is a (rubber) snake in your boot. Your car is full of packing peanuts. The squad awaits your response.",
    category: "life", choices: [
      { label: "Go nuclear: hire a mariachi band to follow the prankster", emoji: "🎺", color: "bg-amber-600", consequence: "-€30k, Morale +7, instant legend status",
        apply: s => { s.netWorth = Math.round((s.netWorth - 0.03) * 100) / 100; s.morale = clamp(s.morale + 7, 0, 100); s.events = [...s.events, "🎺 The mariachi band followed him for three days. Prank war: won"]; return s; } },
      { label: "Call a truce summit", emoji: "🕊️", color: "bg-blue-600", consequence: "Morale +4, the peace holds until preseason",
        apply: s => { s.morale = clamp(s.morale + 4, 0, 100); s.events = [...s.events, "🕊️ Brokered the great prank war truce of the season"]; return s; } },
    ] });

  push({ id: 240, cooldown: COOLDOWN.media, emoji: "💈", title: "Barber Catastrophe",
    description: "Your barber tried 'something new' the day before the club's official photo day. The photos are permanent. The haircut, mercifully, is not.",
    category: "negative", choices: [
      { label: "Rock it with full confidence", emoji: "😎", color: "bg-emerald-600", consequence: "Followers +600k, confidence is a haircut",
        apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.6) * 100) / 100; s.events = [...s.events, "💈 Owned the disaster haircut so hard it became a trend"]; return s; } },
      { label: "Beanie. Indoors. For a month", emoji: "🧢", color: "bg-muted", consequence: "Morale -3, the beanie raises more questions",
        apply: s => { s.morale = clamp(s.morale - 3, 0, 100); s.events = [...s.events, "🧢 Wore a beanie until the haircut grew out. Everyone knew"]; return s; } },
    ] });

  if (state.popularity >= 50) {
    push({ id: 241, cooldown: COOLDOWN.once, emoji: "🐐", title: "A Village Named a Goat After You",
      description: "A small village in the mountains has named its prize goat after you. They have invited you to the naming festival. The goat has won awards.",
      category: "life", choices: [
        { label: "Attend the goat festival", emoji: "🐐", color: "bg-emerald-600", consequence: "Integrity +4, followers +700k, lifelong goat updates",
          apply: s => { s.integrityBonus += 4; s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.7) * 100) / 100; s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "🐐 Attended your goat's naming festival. Best day of the season"]; return s; } },
        { label: "Send a signed shirt for the goat", emoji: "👕", color: "bg-blue-600", consequence: "Followers +300k, the goat wears it on matchdays",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.3) * 100) / 100; s.events = [...s.events, "👕 The goat now wears your shirt every matchday. Correct"]; return s; } },
      ] });
  }

  if ((state.properties || []).length > 0) {
    push({ id: 242, cooldown: COOLDOWN.once, emoji: "👻", title: "The Mansion Is Haunted, Probably",
      description: "Staff at your mansion report doors opening, cold spots, and someone repeatedly reorganizing your trophy cabinet by 'vibes'.",
      category: "life", choices: [
        { label: "Film a ghost hunt for your channel", emoji: "🎥", color: "bg-purple-600", consequence: "Followers +1.2M, you find nothing, which is scarier",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1.2) * 100) / 100; s.events = [...s.events, "🎥 The mansion ghost hunt got 40M views. The cold spot remains"]; return s; } },
        { label: "Sell the mansion at a loss", emoji: "🏃", color: "bg-red-600", consequence: "-€300k, Morale +4, some things are not worth it",
          apply: s => { s.netWorth = Math.round((s.netWorth - 0.3) * 100) / 100; s.morale = clamp(s.morale + 4, 0, 100); s.events = [...s.events, "🏃 Sold the haunted mansion. The new owner says hello. To someone"]; return s; } },
      ] });
  }

  if (!state.hasRelationship && !state.family?.isMarried && state.popularity >= 45) {
    push({ id: 243, cooldown: COOLDOWN.once, emoji: "🌹", title: "Reality Dating Show Invite",
      description: "A massive reality dating show wants you as the celebrity single next season. Filming is during the offseason. Your agent has opinions. Everyone has opinions.",
      category: "life", choices: [
        { label: "Do the show", emoji: "🌹", color: "bg-pink-600", consequence: "Followers +2M, Popularity +8, 50/50 you leave with a relationship",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 2) * 100) / 100; s.popularity = clamp(s.popularity + 8, 0, 100); if (rollCareerChance(s, 0.5, "Reality Dating Show Invite", "You find a relationship", "Finale argument")) { s.hasRelationship = true; s.morale = clamp(s.morale + 8, 0, 100); s.events = [...s.events, "🌹 Went on the dating show and actually found someone. Plot twist"]; } else { s.morale = clamp(s.morale - 3, 0, 100); s.events = [...s.events, "🌹 The dating show ended in a spectacular finale argument. Great TV"]; } return s; } },
        { label: "Hard pass", emoji: "🚫", color: "bg-muted", consequence: "Your love life stays off the air",
          apply: s => { s.events = [...s.events, "🚫 Declined the dating show. The producers still email monthly"]; return s; } },
      ] });
  }

  if (state.popularity >= 45 && !flag(state, "podcast")) {
    push({ id: 244, story: STORY.podcastLaunch, cooldown: COOLDOWN.once, emoji: "🎙️", title: "Start a Podcast?",
      description: "Every player has a podcast now. Yours would be called whatever you want, and sponsors are already lining up.",
      category: "life", choices: [
        { label: "Launch it", emoji: "🎙️", color: "bg-emerald-600", consequence: "Sponsorship income +€200k/yr, occasional hot take backlash",
          apply: s => { setFlag(s, "podcast", 1); s.sponsorBonus = Math.round(((s.sponsorBonus ?? 0) + 0.2) * 100) / 100; s.events = [...s.events, "🎙️ Launched the podcast. Episode one: surprisingly good"]; return s; } },
        { label: "The world has enough podcasts", emoji: "🛑", color: "bg-muted", consequence: "A rare and noble restraint",
          apply: s => { s.integrityBonus += 1; s.events = [...s.events, "🛑 Declined to start a podcast. Historians will thank you"]; return s; } },
      ] });
  }
  if (flag(state, "podcast") === 1 && Math.random() < 0.4) {
    push({ id: 245, cooldown: COOLDOWN.media, emoji: "🔥", title: "Podcast Hot Take Backlash",
      description: "On episode 14 you said a legendary retired striker 'would not score in today's game'. He has responded. On every platform. Twice.",
      category: "negative", choices: [
        { label: "Double down", emoji: "😤", color: "bg-red-600", consequence: "Followers +800k, Popularity -5, the feud becomes content",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.8) * 100) / 100; s.popularity = clamp(s.popularity - 5, 0, 100); s.events = [...s.events, "😤 Doubled down on the hot take. The legend challenged you to a shootout"]; return s; } },
        { label: "Invite him on the pod to settle it", emoji: "🤝", color: "bg-emerald-600", consequence: "Biggest episode ever: followers +1.5M, Integrity +2",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1.5) * 100) / 100; s.integrityBonus += 2; s.events = [...s.events, "🤝 The legend came on the podcast. Instant classic episode"]; return s; } },
      ] });
  }

  push({ id: 246, cooldown: COOLDOWN.once, emoji: "🌶️", title: "The Spicy Wings Interview",
    description: "The famous spicy wings interview show wants you. Ten questions, ten increasingly unhinged sauces, one camera locked on your face.",
    category: "life", choices: [
      { label: "Face the wings", emoji: "🌶️", color: "bg-red-600", consequence: "Followers +1.5M, training the next day is a war crime",
        apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1.5) * 100) / 100; s.morale = clamp(s.morale - 3, 0, 100); s.events = [...s.events, "🌶️ Survived the wings interview. Sauce ten showed you another dimension"]; return s; } },
      { label: "Politely decline", emoji: "🥛", color: "bg-muted", consequence: "Your stomach thanks you",
        apply: s => { s.events = [...s.events, "🥛 Declined the wings interview. Coward, said your group chat"]; return s; } },
    ] });

  push({ id: 247, cooldown: COOLDOWN.once, emoji: "🦝", title: "The Training Ground Raccoon",
    description: "A raccoon has moved into the training ground and has started attending sessions. It sits in the same spot every day. The squad has started calling it Gaffer Two.",
    category: "life", choices: [
      { label: "Officially adopt it as club mascot", emoji: "🦝", color: "bg-emerald-600", consequence: "Morale +6, Gaffer Two gets a tiny cone to sit on",
        apply: s => { s.morale = clamp(s.morale + 6, 0, 100); s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.4) * 100) / 100; s.events = [...s.events, "🦝 Gaffer Two is now official staff. Attendance: perfect"]; return s; } },
      { label: "Call a wildlife service (humanely)", emoji: "🧤", color: "bg-muted", consequence: "Sensible. The squad holds a small farewell",
        apply: s => { s.events = [...s.events, "🧤 Gaffer Two was relocated to a lovely forest. The squad still salutes"]; return s; } },
    ] });

  if (state.popularity >= 35) {
    push({ id: 248, cooldown: COOLDOWN.fans, emoji: "💍", title: "Pitch Invasion Proposal",
      description: "A fan proposes to their partner in front of you after the match and asks you to hand over the ring. Forty thousand people are watching. No pressure.",
      category: "life", choices: [
        { label: "Deliver the ring with a flourish", emoji: "💍", color: "bg-pink-600", consequence: "Popularity +5, you are now in their wedding photos forever",
          apply: s => { s.popularity = clamp(s.popularity + 5, 0, 100); s.morale = clamp(s.morale + 4, 0, 100); s.events = [...s.events, "💍 Assisted a stadium proposal. They said yes. You cried a little"]; return s; } },
        { label: "Pass the ring to the captain", emoji: "😅", color: "bg-muted", consequence: "Morale +1, Followers +200k, the captain fumbles it on live television",
          apply: s => { s.morale = clamp(s.morale + 1, 0, 100); followers(s, 0.2); log(s, "😅 Handed the proposal to the captain. He dropped the ring. They still said yes"); return s; } },
      ] });
  }

  if (state.overall >= 86 && state.age >= 29) {
    push({ id: 249, cooldown: COOLDOWN.once, emoji: "🎞️", title: "The Biopic Offer",
      description: "A major studio wants the film rights to your life story. They mention an A-list actor for the lead. He is 5 foot 6. You are not.",
      category: "life", choices: [
        { label: "Sell the rights: €2M", emoji: "🎬", color: "bg-emerald-600", consequence: "Net worth +€2M, followers +2M, zero creative control",
          apply: s => { s.netWorth = Math.round((s.netWorth + 2) * 100) / 100; s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 2) * 100) / 100; s.events = [...s.events, "🎬 Sold your biopic rights. The trailer will make you unrecognizable"]; return s; } },
        { label: "Hold out for creative control", emoji: "🎥", color: "bg-blue-600", consequence: "Integrity +2, the story stays yours. For now",
          apply: s => { s.integrityBonus += 2; s.events = [...s.events, "🎥 Refused the biopic until they let you cast the lead"]; return s; } },
      ] });
  }

  if (state.netWorth >= 1) {
    push({ id: 251, cooldown: COOLDOWN.money, emoji: "🪙", title: "The Teammate Coin",
      description: "A teammate launches his own cryptocurrency and corners you at lunch about getting in early. His pitch deck is a napkin.",
      category: "life", choices: [
        { label: "Put in €500k", emoji: "🪙", color: "bg-red-600", consequence: "25%: it 3x somehow. 75%: the napkin was the whole plan",
          apply: s => { if (rollCareerChance(s, 0.25, "The Teammate Coin", "Coin pays out", "Coin loses the investment")) { s.netWorth = Math.round((s.netWorth + 1) * 100) / 100; s.events = [...s.events, "🪙 The teammate coin 3x'd. Nobody understands why, including him"]; } else { s.netWorth = Math.round((s.netWorth - 0.5) * 100) / 100; s.events = [...s.events, "🪙 The teammate coin vanished along with the napkin. -€500k"]; } return s; } },
        { label: "Decline, gently", emoji: "🧠", color: "bg-emerald-600", consequence: "Integrity +2, he still calls you 'paper hands' at training",
          apply: s => { s.integrityBonus += 2; s.events = [...s.events, "🧠 Passed on the teammate coin. Your accountant sends a fruit basket"]; return s; } },
      ] });
  }

  push({ id: 252, cooldown: COOLDOWN.once, emoji: "✉️", title: "The Pen Pal",
    description: "An 84-year-old season ticket holder has written you a handwritten letter after every home match for two years. The kit man finally passes the stack along.",
    category: "life", choices: [
      { label: "Write back and invite them to be your guest", emoji: "💌", color: "bg-emerald-600", consequence: "Integrity +4, Morale +8, the best seat in the house is next to you at dinner",
        apply: s => { s.integrityBonus += 4; s.morale = clamp(s.morale + 8, 0, 100); s.events = [...s.events, "💌 Had dinner with your 84-year-old pen pal. New tactical insights acquired"]; return s; } },
      { label: "Let the club share the story", emoji: "📣", color: "bg-blue-600", consequence: "Followers +600k, the letters keep coming",
        apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.6) * 100) / 100; s.integrityBonus += 2; s.events = [...s.events, "📣 The pen pal story melted the internet for a weekend"]; return s; } },
    ] });

  /* ══ Round 725: ids 253 to 272 ══
     The thin shelves after the audit: family, media, money, injuries, the
     dressing room, agents, the national team, the fans, and a late career
     that until now had nothing to say. */

  /* ── family ── */
  if (state.popularity >= 30) {
    push({ id: 253, cooldown: COOLDOWN.family, emoji: "📱", title: "Your Mum Is In The Comments",
      description: "Your mum has started replying to every critic under your posts. In full sentences. With childhood photos as evidence. A man who said you were slow has now seen your nursery sports day medal.",
      category: "life", choices: [
        { label: "Let her cook", emoji: "🍿", color: "bg-emerald-600", consequence: "Followers +500k, Popularity +4, Morale +5, she now has more followers than the reserve keeper",
          apply: s => { followers(s, 0.5); s.popularity = clamp(s.popularity + 4, 0, 100); s.morale = clamp(s.morale + 5, 0, 100); log(s, "🍿 Let your mum run the comments. She has been verified"); return s; } },
        { label: "Ask her, gently, to stop", emoji: "🙏", color: "bg-muted", consequence: "Morale -3, she posts about that too",
          apply: s => { s.morale = clamp(s.morale - 3, 0, 100); followers(s, 0.1); log(s, "🙏 Asked your mum to log off. Her post about it did numbers"); return s; } },
        { label: "Hand her the account for a week", emoji: "🔑", color: "bg-pink-600", consequence: "Coin flip: the internet falls in love (Followers +1M, Popularity +3) or she replies to a sponsor (Sponsorship -€100k/yr, Morale -2)",
          apply: s => { if (rollCareerChance(s, 0.5, "Your Mum Is In The Comments", "Fans love the account takeover", "Sponsor leaves")) { followers(s, 1); s.popularity = clamp(s.popularity + 3, 0, 100); log(s, "🔑 Mum week on the account. Best engagement of your career"); } else { s.sponsorBonus = Math.round(((s.sponsorBonus ?? 0) - 0.1) * 100) / 100; s.morale = clamp(s.morale - 2, 0, 100); log(s, "🔑 Mum told a sponsor their boots looked cheap. They agreed, then left"); } return s; } },
      ] });
  }

  if (state.age >= 21 && !flag(state, "siblingTrial")) {
    push({ id: 254, cooldown: COOLDOWN.once, emoji: "👟", title: "The Sibling Trial",
      description: "Your younger brother has a trial at your club's academy on Tuesday. Nobody at the club has said the word nepotism out loud. Everybody at the club is thinking it.",
      category: "life", choices: [
        { label: "Stay completely out of it", emoji: "🤐", color: "bg-blue-600", consequence: "Integrity +3. 50%: he earns it himself (Morale +6). 50%: he does not, and blames you anyway (Morale -3)",
          apply: s => { setFlag(s, "siblingTrial", 1); s.integrityBonus += 3; if (rollCareerChance(s, 0.5, "The Sibling Trial", "Your brother earns a place", "Your brother misses out")) { s.morale = clamp(s.morale + 6, 0, 100); log(s, "🤐 Your brother earned his academy place with nobody's help. Family dinner was loud"); } else { s.morale = clamp(s.morale - 3, 0, 100); log(s, "🤐 Your brother missed out at the trial. He has decided it was your fault"); } return s; } },
        { label: "Put in a quiet word with the academy head", emoji: "🗣️", color: "bg-amber-600", consequence: "He gets a contract, Integrity -3, Morale -2, the dressing room has a new nickname for you",
          apply: s => { setFlag(s, "siblingTrial", 1); s.integrityBonus -= 3; s.morale = clamp(s.morale - 2, 0, 100); s.popularity = clamp(s.popularity - 1, 0, 100); log(s, "🗣️ Your brother got his contract. The squad calls you Mr Agent now"); return s; } },
        { label: "Tell him to trial somewhere else", emoji: "🚗", color: "bg-muted", consequence: "Integrity +2, Morale -4, he thrives two towns over and your mum takes his side",
          apply: s => { setFlag(s, "siblingTrial", 1); s.integrityBonus += 2; s.morale = clamp(s.morale - 4, 0, 100); log(s, "🚗 Sent your brother to trial elsewhere. He is flying. Your mum has not forgiven you"); return s; } },
      ] });
  }

  if (state.age >= 19) {
    push({ id: 255, cooldown: COOLDOWN.family, emoji: "🧣", title: "Grandad's Club",
      description: "Your grandad has sat in the same seat at his club for forty one years. You play them on Saturday. He has made it very clear whose scarf he is wearing, and it is not yours.",
      category: "life", choices: [
        { label: "Score and go find him in the crowd", emoji: "🎯", color: "bg-emerald-600", consequence: "50%: you score and the clip is everywhere (Followers +600k, Morale +6). 50%: you do not, and he brings it up every Christmas (Morale -3)",
          apply: s => { if (rollCareerChance(s, 0.5, "Grandad's Club", "You score against the club", "You do not score")) { followers(s, 0.6); s.morale = clamp(s.morale + 6, 0, 100); log(s, "🎯 Scored against grandad's club and ran straight to his seat. He pretended not to smile"); } else { s.morale = clamp(s.morale - 3, 0, 100); log(s, "🎯 Did not score against grandad's club. He has mentioned it four times already"); } return s; } },
        { label: "Get him a seat in the family box", emoji: "🎟️", color: "bg-blue-600", consequence: "He refuses, politely. Integrity +1, Morale +2",
          apply: s => { s.integrityBonus += 1; s.morale = clamp(s.morale + 2, 0, 100); log(s, "🎟️ Offered grandad the family box. He stayed in his seat with his flask"); return s; } },
        { label: "Sign a shirt for his whole pub", emoji: "✍️", color: "bg-amber-600", consequence: "Popularity +3, Followers +200k, the pub still sings against you",
          apply: s => { s.popularity = clamp(s.popularity + 3, 0, 100); followers(s, 0.2); log(s, "✍️ Signed a shirt for grandad's pub. It hangs behind the bar, upside down"); return s; } },
      ] });
  }

  /* ── media ── */
  if (state.popularity >= 35) {
    push({ id: 256, cooldown: COOLDOWN.media, emoji: "🎬", title: "The Documentary Edit",
      description: "The club's behind the scenes series has cut your forty minute press conference down to one eye roll and a sigh. The episode is called Tension.",
      category: "life", choices: [
        { label: "Post the full forty minutes yourself", emoji: "📼", color: "bg-emerald-600", consequence: "Followers +400k, Popularity +3, the editors have to sit through it again",
          apply: s => { followers(s, 0.4); s.popularity = clamp(s.popularity + 3, 0, 100); log(s, "📼 Posted the uncut press conference. Forty minutes of you being perfectly nice"); return s; } },
        { label: "Laugh it off on your story", emoji: "😂", color: "bg-amber-600", consequence: "Followers +500k, Morale +3",
          apply: s => { followers(s, 0.5); s.morale = clamp(s.morale + 3, 0, 100); log(s, "😂 Reposted the eye roll with a caption. It became your most liked post"); return s; } },
        { label: "Demand a re-edit from the club", emoji: "😤", color: "bg-red-600", consequence: "Popularity -3, Morale -2, the club says no and adds a second eye roll",
          apply: s => { s.popularity = clamp(s.popularity - 3, 0, 100); s.morale = clamp(s.morale - 2, 0, 100); log(s, "😤 Demanded a re-edit. Episode two opens with you sighing"); return s; } },
      ] });
  }

  /* ── money and brands ── */
  if (state.popularity >= 30 && !flag(state, "energyDrink")) {
    push({ id: 257, cooldown: COOLDOWN.money, emoji: "🥤", title: "The Energy Drink Pitch",
      description: "A drinks brand wants your face on a can. The flavour is called Blue. Not blueberry. Blue. The money is very real.",
      category: "life", choices: [
        { label: "Sign the deal", emoji: "🥤", color: "bg-emerald-600", consequence: "Sponsorship +€250k/yr. 25%: a product recall (Popularity -5, Morale -3, no deal)",
          apply: s => { setFlag(s, "energyDrink", 1); if (rollCareerChance(s, 0.25, "The Energy Drink Pitch", "Product recall", "Sponsorship succeeds")) { s.popularity = clamp(s.popularity - 5, 0, 100); s.morale = clamp(s.morale - 3, 0, 100); log(s, "🥤 Blue was recalled in nine countries. Your face was on every can"); } else { s.sponsorBonus = Math.round(((s.sponsorBonus ?? 0) + 0.25) * 100) / 100; log(s, "🥤 Signed the Blue deal. You still do not know what it tastes of"); } return s; } },
        { label: "Counter with a water brand instead", emoji: "💧", color: "bg-blue-600", consequence: "Sponsorship +€100k/yr, Integrity +2, the nutritionist frames the contract",
          apply: s => { setFlag(s, "energyDrink", 1); s.sponsorBonus = Math.round(((s.sponsorBonus ?? 0) + 0.1) * 100) / 100; s.integrityBonus += 2; log(s, "💧 Turned Blue into a water deal. Less money, more teeth"); return s; } },
        { label: "Pass", emoji: "✋", color: "bg-muted", consequence: "Blue stays unexplained",
          apply: s => { setFlag(s, "energyDrink", 1); log(s, "✋ Passed on Blue. A teammate signed it. He is now blue"); return s; } },
      ] });
  }

  if (state.netWorth >= 1) {
    push({ id: 258, cooldown: COOLDOWN.once, emoji: "🪴", title: "The Garden Centre Charge",
      description: "Your bank has frozen your card over €80k spent at a garden centre at three on a Tuesday afternoon. You were at training. Your dad has gone very quiet in the family chat.",
      category: "life", choices: [
        { label: "Report it as fraud", emoji: "🏦", color: "bg-blue-600", consequence: "50%: a real fraud, refunded in full (Morale +2). 50%: it was your dad, and now the bank wants a word with him (Net worth -€80k, Morale -5)",
          apply: s => { if (rollCareerChance(s, 0.5, "The Garden Centre Charge", "Fraud charge refunded", "The charge was your dad")) { s.morale = clamp(s.morale + 2, 0, 100); log(s, "🏦 The garden centre charge was a cloned card. Refunded by Friday"); } else { money(s, -0.08); s.morale = clamp(s.morale - 5, 0, 100); log(s, "🏦 Reported the garden centre charge as fraud. It was your dad. The bank rang him at dinner"); } return s; } },
        { label: "Call home first", emoji: "📞", color: "bg-emerald-600", consequence: "Net worth -€80k, Morale +3, there is a pond now and one of the fish has your name",
          apply: s => { money(s, -0.08); s.morale = clamp(s.morale + 3, 0, 100); log(s, "📞 Called home about the garden centre. Your dad built a pond. The biggest fish has your name"); return s; } },
        { label: "Unfreeze the card and never mention it", emoji: "🤐", color: "bg-muted", consequence: "Net worth -€80k, Integrity +1, the pond goes in and nobody says a word",
          apply: s => { money(s, -0.08); s.integrityBonus += 1; log(s, "🤐 Paid the garden centre bill and said nothing. The pond is lovely. Nobody has mentioned it"); return s; } },
      ] });
  }

  if (state.netWorth >= 1) {
    push({ id: 259, cooldown: COOLDOWN.money, emoji: "🧮", title: "The Accountant's Spreadsheet",
      description: "A teammate shows you his accountant's fees over lunch. Yours has been charging four times that for the same job, for three years, plus a 'strategy retainer' nobody can explain.",
      category: "negative", choices: [
        { label: "Fire him, hire the teammate's", emoji: "🧮", color: "bg-emerald-600", consequence: "Net worth +€200k (the overcharge clawed back), Morale +3",
          apply: s => { money(s, 0.2); s.morale = clamp(s.morale + 3, 0, 100); log(s, "🧮 Fired the accountant and clawed back the retainer. The new one charges in actual money"); return s; } },
        { label: "Confront him and renegotiate", emoji: "🗣️", color: "bg-amber-600", consequence: "50%: he refunds €100k. 50%: he quits in tax season (Net worth -€100k, Morale -5)",
          apply: s => { if (rollCareerChance(s, 0.5, "The Accountant's Spreadsheet", "Accountant refunds the retainer", "Accountant quits")) { money(s, 0.1); log(s, "🗣️ The accountant refunded a year of the retainer and found a new word for it"); } else { money(s, -0.1); s.morale = clamp(s.morale - 5, 0, 100); log(s, "🗣️ The accountant quit in March with your paperwork in his boot. The fine was yours"); } return s; } },
        { label: "Leave it, he knows where everything is", emoji: "🤷", color: "bg-muted", consequence: "Morale -2, the retainer stays unexplained",
          apply: s => { s.morale = clamp(s.morale - 2, 0, 100); log(s, "🤷 Kept the expensive accountant. The strategy remains a mystery"); return s; } },
      ] });
  }

  /* ── injuries and recovery ── */
  if (state.age >= 20) {
    push({ id: 260, cooldown: COOLDOWN.injury, emoji: "🧠", title: "The Head Knock",
      description: "An elbow caught you on the side of the head just before half time. You feel fine, mostly. The club doctor wants you off, and the gaffer is looking at the scoreboard.",
      category: "negative", choices: [
        { label: "Come off and do the full protocol", emoji: "🩺", color: "bg-blue-600", consequence: "Morale -1, Integrity +2, back in a week with a clear head",
          apply: s => { s.morale = clamp(s.morale - 1, 0, 100); s.integrityBonus += 2; log(s, "🩺 Came off and did the full head injury protocol. Back a week later, clear as a bell"); return s; } },
        { label: "Talk your way into the second half", emoji: "🤕", color: "bg-red-600", consequence: "65%: you were fine (Morale +2). 35%: the fog lasts a month (Passing -1, Morale -6)",
          apply: s => { if (rollCareerChance(s, 0.65, "The Head Knock", "You play without a setback", "The head knock has a cost")) { s.morale = clamp(s.morale + 2, 0, 100); log(s, "🤕 Talked the doctor round and played the second half. Got away with it this time"); } else { s.passing = clamp(s.passing - 1, 20, 99); s.morale = clamp(s.morale - 6, 0, 100); log(s, "🤕 Played on after the head knock. The fog took a month to lift. Passing -1"); } return s; } },
        { label: "Come off, then talk about it publicly", emoji: "📣", color: "bg-emerald-600", consequence: "Morale -4 (a month of interviews about it), Integrity +3, Followers +200k",
          apply: s => { s.morale = clamp(s.morale - 4, 0, 100); s.integrityBonus += 3; followers(s, 0.2); log(s, "📣 Came off with the head knock and said why on camera. Youth coaches keep sending you thank yous"); return s; } },
      ] });
  }

  if (state.age >= 21) {
    push({ id: 261, cooldown: COOLDOWN.injury, emoji: "🩹", title: "The Niggle",
      description: "There is a twinge in your hamstring you have been hiding from the physio for three weeks. It only hurts when you sprint, which is, unfortunately, your job.",
      category: "negative", choices: [
        { label: "Tell the physio today", emoji: "🏥", color: "bg-blue-600", consequence: "Two weeks out: Morale -3, nothing lasting",
          apply: s => { s.morale = clamp(s.morale - 3, 0, 100); log(s, "🏥 Owned up to the hamstring. Two weeks on the bike, and the physio's look"); return s; } },
        { label: "Play through it", emoji: "🏃", color: "bg-amber-600", consequence: "60%: it settles (Morale +3). 40%: it goes (Pace -1, Morale -6)",
          apply: s => { if (rollCareerChance(s, 0.6, "The Niggle", "The niggle settles", "The hamstring goes")) { s.morale = clamp(s.morale + 3, 0, 100); log(s, "🏃 Played through the niggle and it faded. Nobody ever knew"); } else { s.pace = clamp(s.pace - 1, 20, 99); s.morale = clamp(s.morale - 6, 0, 100); log(s, "🏃 The hamstring went at full sprint in front of everyone. Pace -1"); } return s; } },
        { label: "Tape it and tell nobody, including yourself", emoji: "🩹", color: "bg-red-600", consequence: "70%: fine (Morale +2). 30%: it tears (Pace -1, Physical -1)",
          apply: s => { if (rollCareerChance(s, 0.7, "The Niggle", "The tape holds", "The hamstring tears")) { s.morale = clamp(s.morale + 2, 0, 100); log(s, "🩹 Taped the hamstring for a month and got away with it. Denial is a tactic"); } else { s.pace = clamp(s.pace - 1, 20, 99); s.physical = clamp(s.physical - 1, 20, 99); log(s, "🩹 The taped hamstring tore properly. The physio did not say I told you so. He did not have to"); } return s; } },
      ] });
  }

  if (comebackDue(state)) {
    push({ id: 262, cooldown: COOLDOWN.injury, emoji: "🏟️", title: "The Comeback Game",
      description: "First start since the long injury. The warm up felt like a trial. The stadium stood up when your name was read out and your mum is crying on the big screen.",
      category: "positive", choices: [
        { label: "Play it safe, get through ninety", emoji: "🧘", color: "bg-blue-600", consequence: "Morale +4, Integrity +1",
          apply: s => { s.morale = clamp(s.morale + 4, 0, 100); s.integrityBonus += 1; log(s, "🧘 Ninety careful minutes on the comeback. The leg held and so did you"); return s; } },
        { label: "Go full throttle from the first whistle", emoji: "⚡", color: "bg-red-600", consequence: "65%: Morale +8, Shooting +1 and Pace +1 next season. 35%: the leg says no (Pace -1, Morale -6)",
          apply: s => { if (rollCareerChance(s, 0.65, "The Comeback Game", "Comeback goes well", "The leg says no")) { s.morale = clamp(s.morale + 8, 0, 100); bump(s, "shooting", 1); bump(s, "pace", 1); log(s, "⚡ Came back like you had never left. The physio watched through his fingers"); } else { s.pace = clamp(s.pace - 1, 20, 99); s.morale = clamp(s.morale - 6, 0, 100); log(s, "⚡ Went full throttle on the comeback and the leg said no. Pace -1"); } return s; } },
        { label: "Dedicate the night to the medical team", emoji: "🩺", color: "bg-emerald-600", consequence: "Integrity +3, Morale +5, the physios get a standing ovation",
          apply: s => { s.integrityBonus += 3; s.morale = clamp(s.morale + 5, 0, 100); log(s, "🩺 Brought the physios out at the end. The stadium clapped them longer than you"); return s; } },
      ] });
  }

  /* ── teammates and the dressing room ── */
  if (state.age >= 22) {
    push({ id: 263, cooldown: COOLDOWN.dressingRoom, emoji: "🎁", title: "Secret Santa",
      description: "The squad Secret Santa has a €20 limit, and you have drawn the one teammate who has not spoken to you since a training ground tackle in August.",
      category: "life", choices: [
        { label: "Find him something genuinely thoughtful", emoji: "🎁", color: "bg-emerald-600", consequence: "Morale +4. 60%: he thaws (Integrity +2)",
          apply: s => { s.morale = clamp(s.morale + 4, 0, 100); if (rollCareerChance(s, 0.6, "Secret Santa", "The thoughtful gift helps", "A quiet thanks")) { s.integrityBonus += 2; log(s, "🎁 Got him a framed photo from his first club. He shook your hand at the Christmas do"); } else { log(s, "🎁 Got him something thoughtful. He said thanks. Just thanks"); } return s; } },
        { label: "A joke gift about the tackle", emoji: "😂", color: "bg-amber-600", consequence: "50%: the room loses it (Morale +6). 50%: he does not laugh (Morale -4)",
          apply: s => { if (rollCareerChance(s, 0.5, "Secret Santa", "The joke lands", "The joke does not land")) { s.morale = clamp(s.morale + 6, 0, 100); log(s, "😂 Gave him shin pads with August's date on them. Even he laughed"); } else { s.morale = clamp(s.morale - 4, 0, 100); log(s, "😂 Gave him shin pads with August's date on them. He did not laugh. Nobody did after that"); } return s; } },
        { label: "Ignore the limit and buy him a watch", emoji: "⌚", color: "bg-red-600", consequence: "Net worth -€20k, Popularity +1, Integrity -1, every other €20 gift now looks worse",
          apply: s => { money(s, -0.02); s.popularity = clamp(s.popularity + 1, 0, 100); s.integrityBonus -= 1; log(s, "⌚ Bought your Secret Santa a watch. The other nineteen gifts were socks"); return s; } },
      ] });
  }

  if (state.age >= 24) {
    push({ id: 264, cooldown: COOLDOWN.dressingRoom, emoji: "🚘", title: "The Rookie's First Car",
      description: "The eighteen year old who made his debut last month has just parked a car worth more than his contract in the space next to yours. It is matte gold. It has a name.",
      category: "life", choices: [
        { label: "Take him aside, talk money", emoji: "🧠", color: "bg-emerald-600", consequence: "Integrity +3, Morale +2. 60%: he listens and sells it",
          apply: s => { s.integrityBonus += 3; s.morale = clamp(s.morale + 2, 0, 100); if (rollCareerChance(s, 0.6, "The Rookie's First Car", "The rookie listens", "The rookie keeps the car")) { log(s, "🧠 Talked the rookie through his finances. The gold car is gone. He bought a sensible one in gold"); } else { log(s, "🧠 Talked the rookie through his finances. He nodded a lot and kept the car"); } return s; } },
        { label: "Roast him in the group chat", emoji: "😂", color: "bg-amber-600", consequence: "Morale +4, Followers +200k when it leaks, Integrity -1",
          apply: s => { s.morale = clamp(s.morale + 4, 0, 100); followers(s, 0.2); s.integrityBonus -= 1; log(s, "😂 Roasted the gold car in the group chat. The screenshots leaked by lunch"); return s; } },
        { label: "Say nothing, it is his money", emoji: "🤷", color: "bg-muted", consequence: "25%: he scrapes it on the gate and needs lifts for a month (Morale -3)",
          apply: s => { if (rollCareerChance(s, 0.25, "The Rookie's First Car", "The rookie scrapes the car", "The car stays fine")) { s.morale = clamp(s.morale - 3, 0, 100); log(s, "🤷 The rookie scraped the gold car on the gate. You drove him to training for a month"); } else { log(s, "🤷 Said nothing about the gold car. It is still there. It is still gold"); } return s; } },
      ] });
  }

  /* ── agent and contract ── */
  if (state.agentId && state.agentId !== "self") {
    push({ id: 265, cooldown: COOLDOWN.agent, emoji: "🥂", title: "The Agent Poach",
      description: "A rival agent corners you at a teammate's wedding with a napkin full of numbers. He reckons your representation is leaving money on the table and he can prove it before the speeches.",
      category: "life", choices: [
        { label: "Stay loyal, tell your agent about it", emoji: "🤝", color: "bg-blue-600", consequence: "Integrity +2. 50%: your agent works harder (Market value +€2M). 50%: it gets awkward (Morale -3)",
          apply: s => { s.integrityBonus += 2; if (rollCareerChance(s, 0.5, "The Agent Poach", "Your agent finds interest", "Your agent goes quiet")) { s.marketValue += 2; log(s, "🤝 Told your agent about the napkin. Three clubs called the next week. Funny that"); } else { s.morale = clamp(s.morale - 3, 0, 100); log(s, "🤝 Told your agent about the napkin. The silence on the phone lasted a while"); } return s; } },
        { label: "Go it alone from here", emoji: "🧍", color: "bg-emerald-600", consequence: "You now represent yourself: no cuts, no wage boost, your old agent keeps the wedding favour",
          apply: s => { s.agentId = "self"; log(s, "🧍 Left your agent at the wedding and now read every contract yourself"); return s; } },
        { label: "Take the napkin, give nothing back", emoji: "📝", color: "bg-muted", consequence: "Market value +€1M, Integrity -1, Morale -2, your agent hears about it anyway",
          apply: s => { s.marketValue += 1; s.integrityBonus -= 1; s.morale = clamp(s.morale - 2, 0, 100); log(s, "📝 Kept the rival agent's napkin as leverage. Your agent found out by Tuesday"); return s; } },
      ] });
  }

  if (state.marketValue >= 10 && state.age >= 21) {
    push({ id: 266, cooldown: COOLDOWN.agent, emoji: "🗞️", title: "The Release Clause Rumour",
      description: "A back page has printed your release clause. It is wrong by forty million, in the direction that makes three clubs call your agent before breakfast.",
      category: "life", choices: [
        { label: "Say nothing and let it ride", emoji: "😶", color: "bg-amber-600", consequence: "Market value +€3M. 30%: your club is furious (Morale -5)",
          apply: s => { s.marketValue += 3; if (rollCareerChance(s, 0.3, "The Release Clause Rumour", "Club is furious", "The rumour boosts your value")) { s.morale = clamp(s.morale - 5, 0, 100); log(s, "😶 Let the fake clause ride. The chairman's text was two words long"); } else { log(s, "😶 Let the fake clause ride. The market believed it and so, briefly, did you"); } return s; } },
        { label: "Correct it publicly", emoji: "📣", color: "bg-blue-600", consequence: "Integrity +2, Popularity +1, the paper prints a correction in very small letters",
          apply: s => { s.integrityBonus += 2; s.popularity = clamp(s.popularity + 1, 0, 100); log(s, "📣 Corrected the release clause story yourself. The correction ran under the crossword"); return s; } },
        { label: "Have your agent leak the real one", emoji: "🕵️", color: "bg-red-600", consequence: "Market value +€1M, Integrity -2",
          apply: s => { s.marketValue += 1; s.integrityBonus -= 2; log(s, "🕵️ Had the real clause leaked. Two of the three clubs stayed interested"); return s; } },
      ] });
  }

  /* ── national team ── */
  if (state.internationalCareer && !state.intStats.isRetired) {
    push({ id: 267, cooldown: COOLDOWN.national, emoji: "🛏️", title: "The Camp Roommate",
      description: "International camp has put you in a room with the centre back who has been kicking lumps out of you in league games for three seasons. He snores. He also, it turns out, does a perfect impression of the national coach.",
      category: "international", choices: [
        { label: "Make peace over room service", emoji: "🍝", color: "bg-emerald-600", consequence: "Morale +4, Integrity +1, the next league meeting is a lot more polite",
          apply: s => { s.morale = clamp(s.morale + 4, 0, 100); s.integrityBonus += 1; log(s, "🍝 Made peace with your camp roommate over room service. He still kicks you, but he apologises now"); return s; } },
        { label: "Ask the kit man for a room change", emoji: "🚪", color: "bg-muted", consequence: "Morale -2, Popularity -1, the whole squad knows within the hour",
          apply: s => { s.morale = clamp(s.morale - 2, 0, 100); s.popularity = clamp(s.popularity - 1, 0, 100); log(s, "🚪 Asked to change rooms at camp. The squad chat had a poll on it by dinner"); return s; } },
        { label: "Start a prank war", emoji: "🪥", color: "bg-amber-600", consequence: "50%: the best camp in years (Morale +6, Followers +300k). 50%: the national coach is not amused (Popularity -3)",
          apply: s => { if (rollCareerChance(s, 0.5, "The Camp Roommate", "The prank war is loved", "The coach is unimpressed")) { s.morale = clamp(s.morale + 6, 0, 100); followers(s, 0.3); log(s, "🪥 The camp prank war became the squad's favourite week in years. The clips did numbers"); } else { s.popularity = clamp(s.popularity - 3, 0, 100); log(s, "🪥 The camp prank war ended with the national coach's shoes in the hotel pool"); } return s; } },
      ] });
  }

  /* ── fans and community ── */
  if (state.popularity >= 25) {
    push({ id: 268, cooldown: COOLDOWN.fans, emoji: "🏅", title: "The Under Nines' Medal Night",
      description: "A local under nines team has written, in crayon, asking you to hand out their end of season medals. It is the same evening as a sponsor dinner you already said yes to.",
      category: "life", choices: [
        { label: "Do the medals, apologise to the sponsor", emoji: "🏅", color: "bg-emerald-600", consequence: "Integrity +4, Morale +6. 20%: the sponsor sulks (Sponsorship -€50k/yr)",
          apply: s => { s.integrityBonus += 4; s.morale = clamp(s.morale + 6, 0, 100); if (rollCareerChance(s, 0.2, "The Under Nines' Medal Night", "Sponsor trims the deal", "Sponsor reschedules")) { s.sponsorBonus = Math.round(((s.sponsorBonus ?? 0) - 0.05) * 100) / 100; log(s, "🏅 Handed out forty tiny medals. The sponsor trimmed the deal. Worth it"); } else { log(s, "🏅 Handed out forty tiny medals and got forty tiny hugs. The sponsor rescheduled"); } return s; } },
        { label: "Do the dinner, send the kids a video", emoji: "📹", color: "bg-muted", consequence: "Followers +200k, Integrity -1, the crayon letter stays on your fridge",
          apply: s => { followers(s, 0.2); s.integrityBonus -= 1; log(s, "📹 Sent the under nines a video from the sponsor dinner. They played it on a phone in the car park"); return s; } },
        { label: "Do both and sprint between them", emoji: "🏃", color: "bg-amber-600", consequence: "Morale +3. 30%: you are late to both (Popularity -2)",
          apply: s => { s.morale = clamp(s.morale + 3, 0, 100); if (rollCareerChance(s, 0.3, "The Under Nines' Medal Night", "Late to both events", "You make both events")) { s.popularity = clamp(s.popularity - 2, 0, 100); log(s, "🏃 Tried to do the medals and the dinner. Late to both, in a tracksuit, at a black tie event"); } else { log(s, "🏃 Medals at six, dinner at eight, still in the same shoes. Nobody noticed the mud"); } return s; } },
      ] });
  }

  if (state.popularity >= 40) {
    push({ id: 269, cooldown: COOLDOWN.fans, emoji: "🪧", title: "Forty Feet, One Typo",
      description: "The fans have unveiled a forty foot banner of your face behind the goal. It is magnificent. Your name is spelt wrong on it.",
      category: "life", choices: [
        { label: "Post it with love, typo and all", emoji: "❤️", color: "bg-emerald-600", consequence: "Followers +600k, Popularity +4",
          apply: s => { followers(s, 0.6); s.popularity = clamp(s.popularity + 4, 0, 100); log(s, "❤️ Posted the misspelt banner with a heart. The misspelling is now a chant"); return s; } },
        { label: "Pay for the fix yourself", emoji: "🎨", color: "bg-blue-600", consequence: "Net worth -€20k, Popularity +2, Morale +2",
          apply: s => { money(s, -0.02); s.popularity = clamp(s.popularity + 2, 0, 100); s.morale = clamp(s.morale + 2, 0, 100); log(s, "🎨 Quietly paid to fix the banner. The fans noticed the new letter and cheered it"); return s; } },
        { label: "Pretend not to notice", emoji: "🙈", color: "bg-muted", consequence: "50%: it trends anyway (Followers +300k)",
          apply: s => { if (rollCareerChance(s, 0.5, "Forty Feet, One Typo", "The typo trends", "The typo stays on the banner")) { followers(s, 0.3); log(s, "🙈 Said nothing about the banner. The internet said everything"); } else { log(s, "🙈 Said nothing about the banner. It is still up. It is still wrong"); } return s; } },
      ] });
  }

  /* ── the late career ── */
  if (state.age >= 30 && !flag(state, "coachingBadges")) {
    push({ id: 270, cooldown: COOLDOWN.once, emoji: "📚", title: "The Coaching Badges",
      description: "The club has offered to pay for your coaching licence on your days off. The gaffer says it is a compliment. The gaffer also says it is a good idea to start thinking about afterwards.",
      category: "life", choices: [
        { label: "Start the badges", emoji: "📚", color: "bg-emerald-600", consequence: "Passing +1 next season, Integrity +2, the academy kids start calling you Coach",
          apply: s => { setFlag(s, "coachingBadges", 1); bump(s, "passing", 1); s.integrityBonus += 2; log(s, "📚 Started the coaching badges. You now see the game in arrows"); return s; } },
        { label: "Not yet, still a player", emoji: "⚽", color: "bg-muted", consequence: "Morale +2, the gaffer writes the date down",
          apply: s => { setFlag(s, "coachingBadges", 2); s.morale = clamp(s.morale + 2, 0, 100); log(s, "⚽ Turned down the coaching course. For now. The gaffer wrote the date down"); return s; } },
        { label: "Suggest the captain instead", emoji: "🤝", color: "bg-blue-600", consequence: "Integrity +1, Morale +1",
          apply: s => { setFlag(s, "coachingBadges", 2); s.integrityBonus += 1; s.morale = clamp(s.morale + 1, 0, 100); log(s, "🤝 Pointed the coaching course at the captain. He is already correcting the gaffer"); return s; } },
      ] });
  }

  if (state.age >= 31 && !flag(state, "screenTest")) {
    push({ id: 271, cooldown: COOLDOWN.late, emoji: "📺", title: "The Screen Test",
      description: "A broadcaster wants you to do a punditry screen test, for when the time comes. They keep saying 'when the time comes' in a very gentle voice.",
      category: "life", choices: [
        { label: "Do the screen test", emoji: "🎙️", color: "bg-emerald-600", consequence: "60%: a natural (Popularity +3, Followers +300k, Morale +3). 40%: you freeze on camera (Morale -4)",
          apply: s => { setFlag(s, "screenTest", 1); if (rollCareerChance(s, 0.6, "The Screen Test", "Screen test goes well", "Screen test goes badly")) { s.popularity = clamp(s.popularity + 3, 0, 100); followers(s, 0.3); s.morale = clamp(s.morale + 3, 0, 100); log(s, "🎙️ Nailed the punditry screen test. The producer asked if you had done it before"); } else { s.morale = clamp(s.morale - 4, 0, 100); log(s, "🎙️ Froze on the punditry screen test. Eleven seconds of silence and one very long blink"); } return s; } },
        { label: "Do it, but only talk tactics", emoji: "📋", color: "bg-blue-600", consequence: "Integrity +2, Passing +1 next season, the producer calls it very detailed",
          apply: s => { setFlag(s, "screenTest", 1); s.integrityBonus += 2; bump(s, "passing", 1); log(s, "📋 Spent the whole screen test on pressing triggers. The producer called it very detailed"); return s; } },
        { label: "Not yet, you are still a player", emoji: "⚽", color: "bg-muted", consequence: "Morale +2, they say they will ask again in a couple of years",
          apply: s => { s.morale = clamp(s.morale + 2, 0, 100); log(s, "⚽ Told the broadcaster not yet. They said they would ask again. Gently"); return s; } },
      ] });
  }

  /* 272's physio goes on the books once. The event can come round again at
     37, and a second hire used to add a second €150k a year for good. */
  const hasPhysio = flag(state, "privatePhysio") > 0;
  if (state.age >= 33) {
    push({ id: 272, cooldown: COOLDOWN.injury, emoji: "🪑", title: "The Body Talks",
      description: "The morning stiffness has a routine now. Twenty minutes to get down the stairs, a very specific chair, and a kit man who has stopped making jokes about it.",
      category: "negative", choices: [
        hasPhysio
          ? { label: "Book extra sessions with your physio", emoji: "🧑‍⚕️", color: "bg-emerald-600", consequence: "Physical +1 next season, Morale +2, the physio is already on the books",
            apply: s => { bump(s, "physical", 1); s.morale = clamp(s.morale + 2, 0, 100); log(s, "🧑‍⚕️ Doubled up the sessions with your physio. The chair is getting less use"); return s; } }
          : { label: "Hire a private physio", emoji: "🧑‍⚕️", color: "bg-emerald-600", consequence: "Yearly costs +€150k, Physical +1 next season, Morale +3",
            apply: s => { s.customYearlyCosts = Math.round(((s.customYearlyCosts || 0) + 0.15) * 1000) / 1000; setFlag(s, "privatePhysio", 1); bump(s, "physical", 1); s.morale = clamp(s.morale + 3, 0, 100); log(s, "🧑‍⚕️ Hired a private physio. The stairs are back to one minute"); return s; } },
        { label: "Try the sports scientist's morning routine", emoji: "🧘", color: "bg-blue-600", consequence: "50%: Physical +1 next season. 50%: nothing, but the chair is comfortable",
          apply: s => { if (rollCareerChance(s, 0.5, "The Body Talks", "Morning routine works", "Morning routine changes nothing")) { bump(s, "physical", 1); log(s, "🧘 The morning routine works. Forty minutes of stretching and a very smug sports scientist"); } else { log(s, "🧘 The morning routine is forty minutes you will not get back. The chair remains"); } return s; } },
        { label: "Ignore it, you have always been fine", emoji: "🤷", color: "bg-muted", consequence: "20%: a yard goes (Pace -1)",
          apply: s => { if (rollCareerChance(s, 0.2, "The Body Talks", "Pace drops by 1", "No setback")) { s.pace = clamp(s.pace - 1, 20, 99); log(s, "🤷 Ignored the stiffness. The yard you had went somewhere in February. Pace -1"); } else { log(s, "🤷 Ignored the stiffness. Still fine. Still a very specific chair"); } return s; } },
      ] });
  }

  return events;
}
