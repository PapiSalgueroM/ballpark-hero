/* ────────────────────────────────────────────────────────────────────────────
   soccerCareerLife.ts, the life layer for Soccer Career (Round 49)
   Personalities, agents, and the expanded off-pitch event catalog (ids 200+).
   The goal: BitLife-grade chaos with real mechanical tradeoffs, so two
   careers never read the same.
   NOTE: this file only imports TYPES from soccerCareerEngine, so the
   engine -> soccerCareerLife runtime import has no cycle (same pattern
   as careerEras.ts).
   All new CareerState fields used here are OPTIONAL (personality, agentId,
   lifeFlags) so pre-Round-49 saves keep loading untouched.
   ──────────────────────────────────────────────────────────────────────────── */
import type { CareerState, RandomEvent } from "./soccerCareerEngine";

/* ─── tiny local helpers (duplicated on purpose: no runtime import cycle) ─── */
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const flag = (s: CareerState, key: string): number => (s.lifeFlags || {})[key] || 0;
const setFlag = (s: CareerState, key: string, value: number) => {
  s.lifeFlags = { ...(s.lifeFlags || {}), [key]: value };
};

/* ─── Personalities ─── */
export interface PersonalityDef {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  /** shown as a chip in the UI */
  perk: string;
}

export const PERSONALITIES: PersonalityDef[] = [
  { id: "showman", name: "The Showman", emoji: "🎭", blurb: "Cameras find you. You find them first.",
    perk: "Followers grow 60% faster, sponsors pay 25% more, scandals hit harder" },
  { id: "iceman", name: "Ice Cold", emoji: "🧊", blurb: "No celebration. No panic. No comment.",
    perk: "Sponsors trust you, drama slides off, slower follower growth" },
  { id: "hothead", name: "The Hothead", emoji: "🌋", blurb: "Plays angry. Lives angrier.",
    perk: "Exclusive chaos events and fear-factor edges, riskier sponsor money" },
  { id: "professor", name: "The Professor", emoji: "📐", blurb: "Watches film on the team bus. For fun.",
    perk: "Respected by managers and brands, fewer viral moments" },
  { id: "enigma", name: "The Enigma", emoji: "🃏", blurb: "Nobody, including you, knows what happens next.",
    perk: "Wildcard bonuses, cult following, chaos both ways" },
];

export const getPersonalityDef = (id?: string | null): PersonalityDef | undefined =>
  PERSONALITIES.find(p => p.id === id);

export function personalityFollowerMult(id?: string | null): number {
  switch (id) {
    case "showman": return 1.6;
    case "enigma": return 1.25;
    case "hothead": return 1.15;
    case "iceman": return 0.9;
    case "professor": return 0.85;
    default: return 1;
  }
}

export function personalitySponsorMult(id?: string | null): number {
  switch (id) {
    case "showman": return 1.25;
    case "professor": return 1.1;
    case "iceman": return 1.05;
    case "hothead": return 0.9;
    default: return 1;
  }
}

/* ─── Agents ─── */
export interface AgentDef {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  /** multiplier applied to negotiated wages */
  wageMult: number;
  /** yearly cut of wage + sponsorship income */
  incomeCut: number;
  /** cut of any transfer fee when you move */
  transferCut: number;
}

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

export const getAgentDef = (id?: string | null): AgentDef | undefined =>
  AGENTS.find(a => a.id === id);

export function agentWageMult(id?: string | null): number {
  return getAgentDef(id)?.wageMult ?? 1;
}

export function agentIncomeCutRate(id?: string | null): number {
  return getAgentDef(id)?.incomeCut ?? 0;
}

/** Legacy saves without an agent keep the old flat 10% transfer fee. */
export function agentTransferCutRate(id?: string | null): number {
  if (!id) return 0.1;
  return getAgentDef(id)?.transferCut ?? 0.1;
}

/** Events that must appear the season they become due (identity beats).
    Staggered on purpose: personality first, agent the season after. */
export function getPriorityLifeEventIds(state: CareerState): number[] {
  const ids: number[] = [];
  if (!state.personality && state.age >= 18 && !state.retired) ids.push(200);
  else if (state.personality && !state.agentId && state.age >= 19 && !state.retired) ids.push(201);
  return ids;
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
    push({ id: 200, emoji: "🪞", title: "Who Are You, Really?",
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
    push({ id: 201, emoji: "📇", title: "Everyone Wants To Rep You",
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
    push({ id: 205, emoji: "📱", title: "Ricky Posted Your Contract",
      description: "Cousin Ricky accidentally posted a screenshot of your full contract to his public story. The numbers are everywhere.",
      category: "negative", choices: [
        { label: "Laugh it off", emoji: "😅", color: "bg-amber-600", consequence: "Followers +400k, dressing room teases you forever",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.4) * 100) / 100; s.morale = clamp(s.morale - 3, 0, 100); s.events = [...s.events, "📱 Ricky leaked your contract. The memes were incredible"]; return s; } },
        { label: "Fire him", emoji: "🚪", color: "bg-red-600", consequence: "Represent yourself from now on, awkward family dinners",
          apply: s => { s.agentId = "self"; s.morale = clamp(s.morale - 5, 0, 100); s.events = [...s.events, "🚪 Fired Cousin Ricky. Thanksgiving will be tense"]; return s; } },
      ] });
  }
  if (state.agentId === "cousin" && Math.random() < 0.4) {
    push({ id: 206, emoji: "✈️", title: "Wrong Preseason, Ricky",
      description: "Ricky booked your preseason flights to the wrong country. You joined a stranger's training camp for two days before anyone noticed.",
      category: "negative", choices: [
        { label: "Train with the strangers anyway", emoji: "🏃", color: "bg-emerald-600", consequence: "Story goes viral: followers +600k, Physical +1 next season",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.6) * 100) / 100; s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) + 1 }; s.events = [...s.events, "✈️ Trained two days with the wrong club. Legendary"]; return s; } },
        { label: "Get home quietly", emoji: "🤫", color: "bg-muted", consequence: "Morale -4, nobody finds out. Probably",
          apply: s => { s.morale = clamp(s.morale - 4, 0, 100); s.events = [...s.events, "✈️ Ricky sent you to the wrong country. You told no one"]; return s; } },
      ] });
  }
  if (state.agentId === "shark" && Math.random() < 0.4) {
    push({ id: 207, emoji: "🦈", title: "Double Agent",
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
    push({ id: 208, emoji: "🗞️", title: "The Leak",
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
    push({ id: 210, emoji: "🤸", title: "The Halftime Backflip",
      description: "The warm-up DJ plays your song at halftime. The crowd starts chanting for the backflip you posted last summer.",
      category: "life", choices: [
        { label: "Give the people the flip", emoji: "🤸", color: "bg-pink-600", consequence: "Followers +1.5M, 15% chance of a tweaked hamstring (Pace -1)",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1.5) * 100) / 100; if (Math.random() < 0.15) { s.pace = clamp(s.pace - 1, 20, 99); s.events = [...s.events, "🤸 Backflip landed. Hamstring did not. Pace -1"]; } else { s.events = [...s.events, "🤸 Halftime backflip. The clip hit every platform"]; } return s; } },
        { label: "Point at the scoreboard instead", emoji: "🧠", color: "bg-muted", consequence: "Professional. Boring. Safe",
          apply: s => { s.events = [...s.events, "🤸 Declined the backflip. The crowd booed lovingly"]; return s; } },
      ] });
  }
  if (p === "showman" && Math.random() < 0.35) {
    push({ id: 211, emoji: "🕶️", title: "Trademark the Celebration",
      description: "Your goggles celebration is everywhere. A lawyer suggests trademarking it for merch.",
      category: "life", choices: [
        { label: "Trademark it", emoji: "®️", color: "bg-emerald-600", consequence: "Sponsorship income +€300k/yr",
          apply: s => { s.sponsorshipIncome += 0.3; s.events = [...s.events, "®️ Trademarked your celebration. The merch prints money"]; return s; } },
        { label: "Let the kids use it free", emoji: "❤️", color: "bg-blue-600", consequence: "Integrity +4, playgrounds everywhere copy you",
          apply: s => { s.integrityBonus += 4; s.popularity = clamp(s.popularity + 4, 0, 100); s.events = [...s.events, "❤️ Kept the celebration free for every playground on earth"]; return s; } },
      ] });
  }
  if (p === "iceman" && Math.random() < 0.5) {
    push({ id: 212, emoji: "🧊", title: "No Celebration",
      description: "You score against your boyhood club and simply raise both hands in apology. The stadium, both ends, applauds.",
      category: "positive", choices: [
        { label: "Class is permanent", emoji: "🤝", color: "bg-blue-600", consequence: "Integrity +3, Popularity +5",
          apply: s => { s.integrityBonus += 3; s.popularity = clamp(s.popularity + 5, 0, 100); s.events = [...s.events, "🧊 Refused to celebrate against your old club. Pure class"]; return s; } },
      ] });
  }
  if (p === "iceman" && Math.random() < 0.35) {
    push({ id: 213, emoji: "🎤", title: "The One-Word Interview",
      description: "A reporter asks you eleven questions after the match. You answer all eleven with the word 'yes'. It becomes a meme format.",
      category: "life", choices: [
        { label: "Yes", emoji: "🧊", color: "bg-blue-600", consequence: "Followers +500k, journalists hate it",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.5) * 100) / 100; s.popularity = clamp(s.popularity - 2, 0, 100); s.events = [...s.events, "🎤 The all-yes interview became a meme format"]; return s; } },
      ] });
  }
  if (p === "hothead" && Math.random() < 0.5) {
    push({ id: 214, emoji: "🚇", title: "Tunnel Incident",
      description: "An opponent stepped on your boot in the tunnel. On purpose. Everyone is watching what you do next.",
      category: "negative", choices: [
        { label: "Get in his face", emoji: "😤", color: "bg-red-600", consequence: "€200k fine, Physical +1 next season, defenders think twice now",
          apply: s => { s.netWorth = Math.round((s.netWorth - 0.2) * 100) / 100; s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) + 1 }; s.events = [...s.events, "🚇 Tunnel confrontation. Fined, feared, worth it"]; return s; } },
        { label: "Stare. Say nothing. Walk away", emoji: "🥶", color: "bg-emerald-600", consequence: "Integrity +2, the stare goes viral anyway",
          apply: s => { s.integrityBonus += 2; s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.3) * 100) / 100; s.events = [...s.events, "🥶 The tunnel stare went viral. Scarier than shouting"]; return s; } },
      ] });
  }
  if (p === "hothead" && Math.random() < 0.35) {
    push({ id: 215, emoji: "🧃", title: "The Drinks Cart Flip",
      description: "Subbed off at 60 minutes in a match you were winning by yourself. The drinks cart caught the full force of your opinion.",
      category: "negative", choices: [
        { label: "No regrets", emoji: "🌋", color: "bg-red-600", consequence: "Morale +8 (you needed that), €100k fine",
          apply: s => { s.morale = clamp(s.morale + 8, 0, 100); s.netWorth = Math.round((s.netWorth - 0.1) * 100) / 100; s.events = [...s.events, "🧃 Flipped the drinks cart. Honestly? Therapeutic"]; return s; } },
        { label: "Buy the kit man a new cart, apologize", emoji: "🛒", color: "bg-blue-600", consequence: "Integrity +3, dressing room respect",
          apply: s => { s.integrityBonus += 3; s.morale = clamp(s.morale + 3, 0, 100); s.events = [...s.events, "🛒 Bought the kit man a top of the line cart. All good"]; return s; } },
      ] });
  }
  if (p === "professor" && Math.random() < 0.5) {
    push({ id: 216, emoji: "📽️", title: "Film Room Legend",
      description: "You spotted the opponent's penalty pattern from three seasons of film and briefed the keeper. He saved two in the shootout.",
      category: "positive", choices: [
        { label: "The work is the reward", emoji: "📐", color: "bg-emerald-600", consequence: "Passing +1 next season, Morale +5, manager trust",
          apply: s => { s.statBoostNextSeason = { ...s.statBoostNextSeason, passing: (s.statBoostNextSeason.passing || 0) + 1 }; s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "📽️ Your film study won a shootout. The keeper owes you dinner"]; return s; } },
      ] });
  }
  if (p === "professor" && Math.random() < 0.35) {
    push({ id: 217, emoji: "🗞️", title: "The Tactics Column",
      description: "A newspaper offers you a weekly tactics column. Smart, respected, and guaranteed to annoy your manager whenever you analyze your own team.",
      category: "life", choices: [
        { label: "Write it", emoji: "✍️", color: "bg-emerald-600", consequence: "Popularity +4, Morale -3 when the manager reads issue two",
          apply: s => { s.popularity = clamp(s.popularity + 4, 0, 100); s.morale = clamp(s.morale - 3, 0, 100); s.events = [...s.events, "✍️ Your tactics column is a hit. The gaffer underlines things in red"]; return s; } },
        { label: "Keep the notes private", emoji: "🔒", color: "bg-muted", consequence: "The knowledge stays in-house",
          apply: s => { s.events = [...s.events, "🔒 Declined the column. Your notebook stays classified"]; return s; } },
      ] });
  }
  if (p === "enigma" && Math.random() < 0.5) {
    push({ id: 218, emoji: "⛰️", title: "The Monastery Offseason",
      description: "You spent the entire offseason at a mountain monastery. No phone. No boots. Nobody knew where you were, including your club.",
      category: "life", choices: [
        { label: "Return enlightened", emoji: "🧘", color: "bg-purple-600", consequence: "60%: all stats +1 next season. 40%: Pace -1, you mostly learned soup",
          apply: s => { if (Math.random() < 0.6) { s.statBoostNextSeason = { pace: 1, shooting: 1, passing: 1, dribbling: 1, defending: 1, physical: 1 }; s.events = [...s.events, "⛰️ Came back from the monastery visibly sharper. Spooky"]; } else { s.pace = clamp(s.pace - 1, 20, 99); s.events = [...s.events, "⛰️ The monastery taught you inner peace and excellent soup. Pace -1"]; } return s; } },
      ] });
  }
  if (p === "enigma" && Math.random() < 0.35) {
    push({ id: 219, emoji: "🦇", title: "The Cape Era",
      description: "You arrived at training in a full-length cape. When asked why, you said 'the wind'. You have worn it every day since.",
      category: "life", choices: [
        { label: "Commit to the cape", emoji: "🦇", color: "bg-purple-600", consequence: "Followers +800k, coin flip on public opinion",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.8) * 100) / 100; if (Math.random() < 0.5) { s.popularity = clamp(s.popularity + 6, 0, 100); s.events = [...s.events, "🦇 The cape era is beloved. Fans wear them to matches"]; } else { s.popularity = clamp(s.popularity - 3, 0, 100); s.events = [...s.events, "🦇 The cape era divides the nation. You do not care"]; } return s; } },
        { label: "Retire the cape", emoji: "🧥", color: "bg-muted", consequence: "The mystery deepens",
          apply: s => { s.events = [...s.events, "🧥 The cape vanished as suddenly as it appeared"]; return s; } },
      ] });
  }

  /* ── wild general pool ── */
  push({ id: 220, emoji: "💬", title: "The Group Chat Leak",
    description: "Someone screenshots the squad group chat, including your message rating the manager's new haircut 'a 2, maybe a 3 in fog'.",
    category: "negative", choices: [
      { label: "Own it: it was funny", emoji: "😂", color: "bg-amber-600", consequence: "Followers +700k, Morale -5, manager side-eye",
        apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.7) * 100) / 100; s.morale = clamp(s.morale - 5, 0, 100); s.events = [...s.events, "💬 The haircut text leaked. You stood by your rating"]; return s; } },
      { label: "Apologize with a gift", emoji: "🎁", color: "bg-blue-600", consequence: "A luxury barber voucher: -€20k, Morale +3",
        apply: s => { s.netWorth = Math.round((s.netWorth - 0.02) * 100) / 100; s.morale = clamp(s.morale + 3, 0, 100); s.events = [...s.events, "🎁 Apologized for the haircut text with a barber voucher. He used it"]; return s; } },
      { label: "Hunt the leaker", emoji: "🕵️", color: "bg-red-600", consequence: "50%: find them (Morale +6). 50%: paranoia (Morale -6)",
        apply: s => { if (Math.random() < 0.5) { s.morale = clamp(s.morale + 6, 0, 100); s.events = [...s.events, "🕵️ Found the group chat leaker. It was the physio"]; } else { s.morale = clamp(s.morale - 6, 0, 100); s.events = [...s.events, "🕵️ Never found the leaker. You trust no one now"]; } return s; } },
    ] });

  push({ id: 221, emoji: "🎤", title: "Karaoke Night Leak",
    description: "Video of your initiation karaoke escapes the team dinner. Your rendition was, being generous, an experience.",
    category: "life", choices: [
      { label: "Post the full version yourself", emoji: "🎶", color: "bg-emerald-600", consequence: "Followers +1M, the people love a bad singer",
        apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1) * 100) / 100; s.popularity = clamp(s.popularity + 4, 0, 100); s.events = [...s.events, "🎶 Posted your own karaoke disaster. Instant classic"]; return s; } },
      { label: "Never speak of it again", emoji: "🤐", color: "bg-muted", consequence: "It resurfaces every birthday forever",
        apply: s => { s.events = [...s.events, "🤐 The karaoke video lives on in the group chat only"]; return s; } },
    ] });

  if (state.morale <= 60) {
    push({ id: 222, emoji: "🛫", title: "Wrong City",
      description: "You boarded the wrong connecting flight after the international break and landed 900 miles from the away match.",
      category: "negative", choices: [
        { label: "Rent a car, drive all night, make kickoff", emoji: "🚗", color: "bg-emerald-600", consequence: "Legendary commitment: Morale +6, Physical -1 next season",
          apply: s => { s.morale = clamp(s.morale + 6, 0, 100); s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) - 1 }; s.events = [...s.events, "🚗 Drove nine hours overnight and still made kickoff"]; return s; } },
        { label: "Miss the match, tell the truth", emoji: "🤷", color: "bg-muted", consequence: "Morale -5, the story becomes a documentary punchline",
          apply: s => { s.morale = clamp(s.morale - 5, 0, 100); s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.3) * 100) / 100; s.events = [...s.events, "🛫 Missed a match by boarding the wrong plane. Iconic, unfortunately"]; return s; } },
      ] });
  }

  push({ id: 223, emoji: "🎧", title: "The Aux Cord War",
    description: "The dressing room speaker has been hijacked by a defender who exclusively plays whale sounds 'for focus'. The squad looks to you.",
    category: "life", choices: [
      { label: "Seize the aux", emoji: "🎧", color: "bg-emerald-600", consequence: "Your playlist unites the squad: Morale +6",
        apply: s => { s.morale = clamp(s.morale + 6, 0, 100); s.events = [...s.events, "🎧 Won the aux cord war. The whale era is over"]; return s; } },
      { label: "Broker a schedule", emoji: "📋", color: "bg-blue-600", consequence: "Diplomacy: Morale +3, whales on Wednesdays",
        apply: s => { s.morale = clamp(s.morale + 3, 0, 100); s.integrityBonus += 1; s.events = [...s.events, "📋 Negotiated the aux schedule. Whales on Wednesdays only"]; return s; } },
    ] });

  push({ id: 224, emoji: "🦅", title: "Mascot Beef",
    description: "The club mascot challenged you to a race at halftime and has been talking trash on the club's official account all week.",
    category: "life", choices: [
      { label: "Race the mascot", emoji: "🏃", color: "bg-amber-600", consequence: "70%: win, +400k followers. 30%: lose to a person in a giant bird suit",
        apply: s => { if (Math.random() < 0.7) { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.4) * 100) / 100; s.events = [...s.events, "🏃 Beat the mascot in the halftime race. Order restored"]; } else { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.8) * 100) / 100; s.popularity = clamp(s.popularity - 2, 0, 100); s.events = [...s.events, "🦅 Lost a footrace to the mascot. The internet will never let go"]; } return s; } },
      { label: "Ignore the bird", emoji: "🙄", color: "bg-muted", consequence: "The mascot declares victory by forfeit",
        apply: s => { s.events = [...s.events, "🙄 Refused the mascot race. It did a victory lap anyway"]; return s; } },
    ] });

  if (state.age >= 26 && state.popularity >= 55) {
    push({ id: 225, emoji: "📖", title: "The Tell-All Book Offer",
      description: "A publisher offers €1.5M for a tell-all autobiography. NOW, mid-career, with names named.",
      category: "life", choices: [
        { label: "Name names: €1.5M", emoji: "💣", color: "bg-red-600", consequence: "Net worth +€1.5M, Morale -10, dressing room goes cold, integrity -3",
          apply: s => { s.netWorth = Math.round((s.netWorth + 1.5) * 100) / 100; s.morale = clamp(s.morale - 10, 0, 100); s.integrityBonus -= 3; s.events = [...s.events, "💣 Published the tell-all. Two teammates no longer pass to you"]; return s; } },
        { label: "Save it for retirement", emoji: "⏳", color: "bg-blue-600", consequence: "Integrity +3, the stories keep marinating",
          apply: s => { s.integrityBonus += 3; s.events = [...s.events, "⏳ Turned down the tell-all. For now"]; return s; } },
      ] });
  }

  if (state.netWorth >= 1.5 && !flag(state, "esports")) {
    push({ id: 226, emoji: "🎮", title: "Buy an Esports Team?",
      description: "A struggling esports org is for sale for €800k. Your gamer teammates swear it is about to blow up.",
      category: "life", choices: [
        { label: "Buy the org: €800k", emoji: "🕹️", color: "bg-purple-600", consequence: "Results arrive next season",
          apply: s => { s.netWorth = Math.round((s.netWorth - 0.8) * 100) / 100; setFlag(s, "esports", 1); s.events = [...s.events, "🕹️ Bought an esports org. Your bio now says 'investor'"]; return s; } },
        { label: "Pass", emoji: "✋", color: "bg-muted", consequence: "Stick to the grass game",
          apply: s => { s.events = [...s.events, "✋ Passed on the esports org"]; return s; } },
      ] });
  }
  if (flag(state, "esports") === 1) {
    push({ id: 227, emoji: "🏆", title: "Esports Season Results",
      description: "Your esports team's season just wrapped. The group chat has been suspiciously quiet.",
      category: "life", choices: [
        { label: "Check the standings", emoji: "📊", color: "bg-purple-600", consequence: "40%: they won it all (+€2M). 60%: they folded (-€300k more)",
          apply: s => { setFlag(s, "esports", 2); if (Math.random() < 0.4) { s.netWorth = Math.round((s.netWorth + 2) * 100) / 100; s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.5) * 100) / 100; s.events = [...s.events, "🏆 Your esports team won the whole thing! +€2M"]; } else { s.netWorth = Math.round((s.netWorth - 0.3) * 100) / 100; s.events = [...s.events, "📉 The esports org folded. The jerseys are collectors items now"]; } return s; } },
      ] });
  }

  push({ id: 228, emoji: "⛳", title: "The Golf Bug",
    description: "A veteran teammate takes you golfing once. ONCE. You now own four putters and talk about wind.",
    category: "life", choices: [
      { label: "Embrace the golf life", emoji: "⛳", color: "bg-emerald-600", consequence: "Morale +8, Pace -1 next season (cart life)",
        apply: s => { s.morale = clamp(s.morale + 8, 0, 100); s.statBoostNextSeason = { ...s.statBoostNextSeason, pace: (s.statBoostNextSeason.pace || 0) - 1 }; s.events = [...s.events, "⛳ Fully golf-pilled. Your happy place has 18 holes"]; return s; } },
      { label: "Delete the tee time app", emoji: "🗑️", color: "bg-muted", consequence: "Focus preserved. The putters stay in the garage",
        apply: s => { s.events = [...s.events, "🗑️ Quit golf before it consumed you. The putters watch silently"]; return s; } },
    ] });

  push({ id: 229, emoji: "🥛", title: "The Milk Protocol",
    description: "A wellness influencer convinces half the squad that an all-dairy recovery protocol is the future. There is a group discount.",
    category: "life", choices: [
      { label: "Try the protocol", emoji: "🥛", color: "bg-amber-600", consequence: "50%: Physical +1 next season somehow. 50%: catastrophic gut week, Morale -6",
        apply: s => { if (Math.random() < 0.5) { s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) + 1 }; s.events = [...s.events, "🥛 The milk protocol worked?? Nutritionists are furious"]; } else { s.morale = clamp(s.morale - 6, 0, 100); s.events = [...s.events, "🥛 The milk protocol was a war crime against your stomach"]; } return s; } },
      { label: "Trust the club nutritionist", emoji: "🥗", color: "bg-emerald-600", consequence: "Sensible: Morale +2",
        apply: s => { s.morale = clamp(s.morale + 2, 0, 100); s.events = [...s.events, "🥗 Declined the milk protocol. The nutritionist wept with joy"]; return s; } },
    ] });

  if (!flag(state, "cursedBoots")) {
    push({ id: 230, emoji: "👟", title: "The Cursed Boots",
      description: "Your new limited-edition boots have not seen a single win. Seven matches. The kit man refuses to touch them. He crosses himself near your locker.",
      category: "life", choices: [
        { label: "Keep wearing them: superstition is fake", emoji: "🧪", color: "bg-red-600", consequence: "Science! The curse saga continues next season",
          apply: s => { setFlag(s, "cursedBoots", 1); s.morale = clamp(s.morale - 3, 0, 100); s.events = [...s.events, "👟 Kept the cursed boots. The kit man now salts the doorway"]; return s; } },
        { label: "Burn them in the parking lot", emoji: "🔥", color: "bg-amber-600", consequence: "Morale +5, sponsor mildly concerned, the video goes viral",
          apply: s => { s.morale = clamp(s.morale + 5, 0, 100); s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.4) * 100) / 100; s.events = [...s.events, "🔥 Ceremonially burned the cursed boots. The squad attended"]; return s; } },
      ] });
  }
  if (flag(state, "cursedBoots") === 1) {
    push({ id: 231, emoji: "✨", title: "The Curse Breaks",
      description: "You scored a hat trick in the cursed boots. The kit man has framed them. Scientists want to study you.",
      category: "positive", choices: [
        { label: "Vindication", emoji: "✨", color: "bg-emerald-600", consequence: "Shooting +2 next season, followers +500k, curse officially reversed",
          apply: s => { setFlag(s, "cursedBoots", 2); s.statBoostNextSeason = { ...s.statBoostNextSeason, shooting: (s.statBoostNextSeason.shooting || 0) + 2 }; s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.5) * 100) / 100; s.events = [...s.events, "✨ The cursed boots delivered a hat trick. You were right all along"]; return s; } },
      ] });
  }

  if (state.overall >= 84 && state.age >= 27) {
    push({ id: 232, emoji: "🗿", title: "The Statue Vote",
      description: "Your hometown council is voting on a statue of you outside the stadium where you played as a kid.",
      category: "life", choices: [
        { label: "Attend the vote", emoji: "🗿", color: "bg-amber-600", consequence: "60%: it passes, Legacy +8. 40%: rejected 5 votes to 4, ouch",
          apply: s => { if (Math.random() < 0.6) { s.integrityBonus += 8; s.morale = clamp(s.morale + 8, 0, 100); s.events = [...s.events, "🗿 The statue vote passed! Bronze you goes up next spring"]; } else { s.morale = clamp(s.morale - 5, 0, 100); s.events = [...s.events, "🗿 The statue vote failed 5 to 4. Councilman Dave will be hearing about this"]; } return s; } },
        { label: "Ask them to fund youth pitches instead", emoji: "⚽", color: "bg-emerald-600", consequence: "Integrity +10, the real legacy",
          apply: s => { s.integrityBonus += 10; s.events = [...s.events, "⚽ Redirected the statue budget to youth pitches. Better than bronze"]; return s; } },
      ] });
  }

  if (state.popularity >= 60) {
    push({ id: 233, emoji: "🗽", title: "The Wax Statue",
      description: "A famous wax museum unveils your figure. It looks like you, if you were a startled substitute teacher from a different, sadder timeline.",
      category: "life", choices: [
        { label: "Pose next to it grinning", emoji: "📸", color: "bg-emerald-600", consequence: "Followers +800k, self-awareness is elite",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.8) * 100) / 100; s.popularity = clamp(s.popularity + 4, 0, 100); s.events = [...s.events, "📸 Posed with your terrible wax figure. Comedy gold"]; return s; } },
        { label: "Demand a redo", emoji: "😤", color: "bg-red-600", consequence: "Popularity -3, the museum posts the demand letter",
          apply: s => { s.popularity = clamp(s.popularity - 3, 0, 100); s.events = [...s.events, "😤 Demanded a wax redo. The internet sided with the statue"]; return s; } },
      ] });
  }

  if (state.popularity >= 40 && !flag(state, "lookalike")) {
    push({ id: 234, emoji: "🥸", title: "The Lookalike",
      description: "A man who looks 70% like you has been opening supermarkets and charging for autographs two towns over.",
      category: "negative", choices: [
        { label: "Send the lawyers: €300k", emoji: "⚖️", color: "bg-blue-600", consequence: "Problem solved permanently",
          apply: s => { s.netWorth = Math.round((s.netWorth - 0.3) * 100) / 100; setFlag(s, "lookalike", 2); s.events = [...s.events, "⚖️ Lawyers ended the lookalike's grand opening career"]; return s; } },
        { label: "Ignore him, it is flattering", emoji: "🤷", color: "bg-muted", consequence: "What is the worst that could happen",
          apply: s => { setFlag(s, "lookalike", 1); s.events = [...s.events, "🤷 Let the lookalike cook. Surely this is fine"]; return s; } },
      ] });
  }
  if (flag(state, "lookalike") === 1) {
    push({ id: 235, emoji: "🚨", title: "The Lookalike Strikes Again",
      description: "Your lookalike crashed a luxury car dealership event, 'test drove' a supercar, and the invoice came to you.",
      category: "negative", choices: [
        { label: "Pay it and END this: €500k total", emoji: "💸", color: "bg-red-600", consequence: "Net worth -€500k, lawyers engaged, lesson learned",
          apply: s => { s.netWorth = Math.round((s.netWorth - 0.5) * 100) / 100; setFlag(s, "lookalike", 2); s.events = [...s.events, "💸 The lookalike's joyride cost you €500k. Never again"]; return s; } },
        { label: "Meet him. Hire him as your official decoy", emoji: "🥸", color: "bg-purple-600", consequence: "Galaxy brain: -€100k/yr but paparazzi chaos, followers +600k",
          apply: s => { s.netWorth = Math.round((s.netWorth - 0.1) * 100) / 100; setFlag(s, "lookalike", 3); s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.6) * 100) / 100; s.events = [...s.events, "🥸 Hired your lookalike as a decoy. The paparazzi are so confused"]; return s; } },
      ] });
  }

  if (!flag(state, "teammateLoan") && state.netWorth >= 0.5) {
    push({ id: 236, emoji: "🤲", title: "A Teammate Needs €200k",
      description: "A squad player pulls you aside. Family trouble back home, he says. He needs €200k and swears he is good for it.",
      category: "life", choices: [
        { label: "Lend it, no questions", emoji: "🤝", color: "bg-blue-600", consequence: "-€200k for now. Repayment story continues later",
          apply: s => { s.netWorth = Math.round((s.netWorth - 0.2) * 100) / 100; setFlag(s, "teammateLoan", 1); s.integrityBonus += 2; s.events = [...s.events, "🤝 Lent a teammate €200k on a handshake"]; return s; } },
        { label: "Offer help finding a proper loan instead", emoji: "🏦", color: "bg-emerald-600", consequence: "Responsible, slightly awkward: Morale -2",
          apply: s => { s.morale = clamp(s.morale - 2, 0, 100); setFlag(s, "teammateLoan", 9); s.events = [...s.events, "🏦 Helped a teammate get a real loan instead of cash"]; return s; } },
      ] });
  }
  if (flag(state, "teammateLoan") === 1) {
    push({ id: 237, emoji: "💌", title: "The Repayment",
      description: "An envelope appears in your locker from the teammate you helped.",
      category: "life", choices: [
        { label: "Open it", emoji: "✉️", color: "bg-blue-600", consequence: "65%: €400k and a thank you letter. 35%: a signed shirt and an apology",
          apply: s => { setFlag(s, "teammateLoan", 2); if (Math.random() < 0.65) { s.netWorth = Math.round((s.netWorth + 0.4) * 100) / 100; s.morale = clamp(s.morale + 6, 0, 100); s.events = [...s.events, "💌 He paid back double with a handwritten letter. Faith in people: restored"]; } else { s.morale = clamp(s.morale - 4, 0, 100); s.integrityBonus += 2; s.events = [...s.events, "💌 He could not pay it back. The signed shirt hangs in your gym anyway"]; } return s; } },
      ] });
  }

  push({ id: 238, emoji: "🐦", title: "The Pigeon",
    description: "A pigeon landed on your shoulder during a stoppage and refused to leave for four minutes of live television. Commentators named it Gerald.",
    category: "life", choices: [
      { label: "Adopt Gerald", emoji: "🐦", color: "bg-emerald-600", consequence: "Followers +1M, Gerald gets his own merch line",
        apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1) * 100) / 100; s.morale = clamp(s.morale + 4, 0, 100); s.events = [...s.events, "🐦 Adopted Gerald the pigeon. He has a better sponsorship than some teammates"]; return s; } },
      { label: "Gently decline pigeon ownership", emoji: "🕊️", color: "bg-muted", consequence: "Gerald visits on his own schedule now",
        apply: s => { s.events = [...s.events, "🕊️ Gerald remains a free pigeon. He still sits on the crossbar sometimes"]; return s; } },
    ] });

  push({ id: 239, emoji: "🐍", title: "Prank War Escalation",
    description: "The dressing room prank war has escalated. There is a (rubber) snake in your boot. Your car is full of packing peanuts. The squad awaits your response.",
    category: "life", choices: [
      { label: "Go nuclear: hire a mariachi band to follow the prankster", emoji: "🎺", color: "bg-amber-600", consequence: "-€30k, Morale +7, instant legend status",
        apply: s => { s.netWorth = Math.round((s.netWorth - 0.03) * 100) / 100; s.morale = clamp(s.morale + 7, 0, 100); s.events = [...s.events, "🎺 The mariachi band followed him for three days. Prank war: won"]; return s; } },
      { label: "Call a truce summit", emoji: "🕊️", color: "bg-blue-600", consequence: "Morale +4, the peace holds until preseason",
        apply: s => { s.morale = clamp(s.morale + 4, 0, 100); s.events = [...s.events, "🕊️ Brokered the great prank war truce of the season"]; return s; } },
    ] });

  push({ id: 240, emoji: "💈", title: "Barber Catastrophe",
    description: "Your barber tried 'something new' the day before the club's official photo day. The photos are permanent. The haircut, mercifully, is not.",
    category: "negative", choices: [
      { label: "Rock it with full confidence", emoji: "😎", color: "bg-emerald-600", consequence: "Followers +600k, confidence is a haircut",
        apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.6) * 100) / 100; s.events = [...s.events, "💈 Owned the disaster haircut so hard it became a trend"]; return s; } },
      { label: "Beanie. Indoors. For a month", emoji: "🧢", color: "bg-muted", consequence: "Morale -3, the beanie raises more questions",
        apply: s => { s.morale = clamp(s.morale - 3, 0, 100); s.events = [...s.events, "🧢 Wore a beanie until the haircut grew out. Everyone knew"]; return s; } },
    ] });

  if (state.popularity >= 50) {
    push({ id: 241, emoji: "🐐", title: "A Village Named a Goat After You",
      description: "A small village in the mountains has named its prize goat after you. They have invited you to the naming festival. The goat has won awards.",
      category: "life", choices: [
        { label: "Attend the goat festival", emoji: "🐐", color: "bg-emerald-600", consequence: "Integrity +4, followers +700k, lifelong goat updates",
          apply: s => { s.integrityBonus += 4; s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.7) * 100) / 100; s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "🐐 Attended your goat's naming festival. Best day of the season"]; return s; } },
        { label: "Send a signed shirt for the goat", emoji: "👕", color: "bg-blue-600", consequence: "Followers +300k, the goat wears it on matchdays",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.3) * 100) / 100; s.events = [...s.events, "👕 The goat now wears your shirt every matchday. Correct"]; return s; } },
      ] });
  }

  if ((state.properties || []).length > 0) {
    push({ id: 242, emoji: "👻", title: "The Mansion Is Haunted, Probably",
      description: "Staff at your mansion report doors opening, cold spots, and someone repeatedly reorganizing your trophy cabinet by 'vibes'.",
      category: "life", choices: [
        { label: "Film a ghost hunt for your channel", emoji: "🎥", color: "bg-purple-600", consequence: "Followers +1.2M, you find nothing, which is scarier",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1.2) * 100) / 100; s.events = [...s.events, "🎥 The mansion ghost hunt got 40M views. The cold spot remains"]; return s; } },
        { label: "Sell the mansion at a loss", emoji: "🏃", color: "bg-red-600", consequence: "-€300k, Morale +4, some things are not worth it",
          apply: s => { s.netWorth = Math.round((s.netWorth - 0.3) * 100) / 100; s.morale = clamp(s.morale + 4, 0, 100); s.events = [...s.events, "🏃 Sold the haunted mansion. The new owner says hello. To someone"]; return s; } },
      ] });
  }

  if (!state.hasRelationship && !state.family?.isMarried && state.popularity >= 45) {
    push({ id: 243, emoji: "🌹", title: "Reality Dating Show Invite",
      description: "A massive reality dating show wants you as the celebrity single next season. Filming is during the offseason. Your agent has opinions. Everyone has opinions.",
      category: "life", choices: [
        { label: "Do the show", emoji: "🌹", color: "bg-pink-600", consequence: "Followers +2M, Popularity +8, 50/50 you leave with a relationship",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 2) * 100) / 100; s.popularity = clamp(s.popularity + 8, 0, 100); if (Math.random() < 0.5) { s.hasRelationship = true; s.morale = clamp(s.morale + 8, 0, 100); s.events = [...s.events, "🌹 Went on the dating show and actually found someone. Plot twist"]; } else { s.morale = clamp(s.morale - 3, 0, 100); s.events = [...s.events, "🌹 The dating show ended in a spectacular finale argument. Great TV"]; } return s; } },
        { label: "Hard pass", emoji: "🚫", color: "bg-muted", consequence: "Your love life stays off the air",
          apply: s => { s.events = [...s.events, "🚫 Declined the dating show. The producers still email monthly"]; return s; } },
      ] });
  }

  if (state.popularity >= 45 && !flag(state, "podcast")) {
    push({ id: 244, emoji: "🎙️", title: "Start a Podcast?",
      description: "Every player has a podcast now. Yours would be called whatever you want, and sponsors are already lining up.",
      category: "life", choices: [
        { label: "Launch it", emoji: "🎙️", color: "bg-emerald-600", consequence: "Sponsorship income +€200k/yr, occasional hot take backlash",
          apply: s => { setFlag(s, "podcast", 1); s.sponsorshipIncome += 0.2; s.events = [...s.events, "🎙️ Launched the podcast. Episode one: surprisingly good"]; return s; } },
        { label: "The world has enough podcasts", emoji: "🛑", color: "bg-muted", consequence: "A rare and noble restraint",
          apply: s => { s.integrityBonus += 1; s.events = [...s.events, "🛑 Declined to start a podcast. Historians will thank you"]; return s; } },
      ] });
  }
  if (flag(state, "podcast") === 1 && Math.random() < 0.4) {
    push({ id: 245, emoji: "🔥", title: "Podcast Hot Take Backlash",
      description: "On episode 14 you said a legendary retired striker 'would not score in today's game'. He has responded. On every platform. Twice.",
      category: "negative", choices: [
        { label: "Double down", emoji: "😤", color: "bg-red-600", consequence: "Followers +800k, Popularity -5, the feud becomes content",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.8) * 100) / 100; s.popularity = clamp(s.popularity - 5, 0, 100); s.events = [...s.events, "😤 Doubled down on the hot take. The legend challenged you to a shootout"]; return s; } },
        { label: "Invite him on the pod to settle it", emoji: "🤝", color: "bg-emerald-600", consequence: "Biggest episode ever: followers +1.5M, Integrity +2",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1.5) * 100) / 100; s.integrityBonus += 2; s.events = [...s.events, "🤝 The legend came on the podcast. Instant classic episode"]; return s; } },
      ] });
  }

  push({ id: 246, emoji: "🌶️", title: "The Spicy Wings Interview",
    description: "The famous spicy wings interview show wants you. Ten questions, ten increasingly unhinged sauces, one camera locked on your face.",
    category: "life", choices: [
      { label: "Face the wings", emoji: "🌶️", color: "bg-red-600", consequence: "Followers +1.5M, training the next day is a war crime",
        apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1.5) * 100) / 100; s.morale = clamp(s.morale - 3, 0, 100); s.events = [...s.events, "🌶️ Survived the wings interview. Sauce ten showed you another dimension"]; return s; } },
      { label: "Politely decline", emoji: "🥛", color: "bg-muted", consequence: "Your stomach thanks you",
        apply: s => { s.events = [...s.events, "🥛 Declined the wings interview. Coward, said your group chat"]; return s; } },
    ] });

  push({ id: 247, emoji: "🦝", title: "The Training Ground Raccoon",
    description: "A raccoon has moved into the training ground and has started attending sessions. It sits in the same spot every day. The squad has started calling it Gaffer Two.",
    category: "life", choices: [
      { label: "Officially adopt it as club mascot", emoji: "🦝", color: "bg-emerald-600", consequence: "Morale +6, Gaffer Two gets a tiny cone to sit on",
        apply: s => { s.morale = clamp(s.morale + 6, 0, 100); s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.4) * 100) / 100; s.events = [...s.events, "🦝 Gaffer Two is now official staff. Attendance: perfect"]; return s; } },
      { label: "Call a wildlife service (humanely)", emoji: "🧤", color: "bg-muted", consequence: "Sensible. The squad holds a small farewell",
        apply: s => { s.events = [...s.events, "🧤 Gaffer Two was relocated to a lovely forest. The squad still salutes"]; return s; } },
    ] });

  if (state.popularity >= 35) {
    push({ id: 248, emoji: "💍", title: "Pitch Invasion Proposal",
      description: "A fan proposes to their partner in front of you after the match and asks you to hand over the ring. Forty thousand people are watching. No pressure.",
      category: "life", choices: [
        { label: "Deliver the ring with a flourish", emoji: "💍", color: "bg-pink-600", consequence: "Popularity +5, you are now in their wedding photos forever",
          apply: s => { s.popularity = clamp(s.popularity + 5, 0, 100); s.morale = clamp(s.morale + 4, 0, 100); s.events = [...s.events, "💍 Assisted a stadium proposal. They said yes. You cried a little"]; return s; } },
      ] });
  }

  if (state.overall >= 86 && state.age >= 29) {
    push({ id: 249, emoji: "🎞️", title: "The Biopic Offer",
      description: "A major studio wants the film rights to your life story. They mention an A-list actor for the lead. He is 5 foot 6. You are not.",
      category: "life", choices: [
        { label: "Sell the rights: €2M", emoji: "🎬", color: "bg-emerald-600", consequence: "Net worth +€2M, followers +2M, zero creative control",
          apply: s => { s.netWorth = Math.round((s.netWorth + 2) * 100) / 100; s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 2) * 100) / 100; s.events = [...s.events, "🎬 Sold your biopic rights. The trailer will make you unrecognizable"]; return s; } },
        { label: "Hold out for creative control", emoji: "🎥", color: "bg-blue-600", consequence: "Integrity +2, the story stays yours. For now",
          apply: s => { s.integrityBonus += 2; s.events = [...s.events, "🎥 Refused the biopic until they let you cast the lead"]; return s; } },
      ] });
  }

  if (state.netWorth >= 1) {
    push({ id: 251, emoji: "🪙", title: "The Teammate Coin",
      description: "A teammate launches his own cryptocurrency and corners you at lunch about getting in early. His pitch deck is a napkin.",
      category: "life", choices: [
        { label: "Put in €500k", emoji: "🪙", color: "bg-red-600", consequence: "25%: it 3x somehow. 75%: the napkin was the whole plan",
          apply: s => { if (Math.random() < 0.25) { s.netWorth = Math.round((s.netWorth + 1) * 100) / 100; s.events = [...s.events, "🪙 The teammate coin 3x'd. Nobody understands why, including him"]; } else { s.netWorth = Math.round((s.netWorth - 0.5) * 100) / 100; s.events = [...s.events, "🪙 The teammate coin vanished along with the napkin. -€500k"]; } return s; } },
        { label: "Decline, gently", emoji: "🧠", color: "bg-emerald-600", consequence: "Integrity +2, he still calls you 'paper hands' at training",
          apply: s => { s.integrityBonus += 2; s.events = [...s.events, "🧠 Passed on the teammate coin. Your accountant sends a fruit basket"]; return s; } },
      ] });
  }

  push({ id: 252, emoji: "✉️", title: "The Pen Pal",
    description: "An 84-year-old season ticket holder has written you a handwritten letter after every home match for two years. The kit man finally passes the stack along.",
    category: "life", choices: [
      { label: "Write back and invite them to be your guest", emoji: "💌", color: "bg-emerald-600", consequence: "Integrity +4, Morale +8, the best seat in the house is next to you at dinner",
        apply: s => { s.integrityBonus += 4; s.morale = clamp(s.morale + 8, 0, 100); s.events = [...s.events, "💌 Had dinner with your 84-year-old pen pal. New tactical insights acquired"]; return s; } },
      { label: "Let the club share the story", emoji: "📣", color: "bg-blue-600", consequence: "Followers +600k, the letters keep coming",
        apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.6) * 100) / 100; s.integrityBonus += 2; s.events = [...s.events, "📣 The pen pal story melted the internet for a weekend"]; return s; } },
    ] });

  return events;
}
