/* ─── Round 130: the phone stops being a one shot novelty ───────────────────

   What Round 80 shipped: a text arrived between seasons, you picked one of two
   or three replies, karma moved, and that was the end of it forever. The owner
   read it back to us exactly right: "For messages u get sent u should be able
   to continue the convo. Not simply reply and then they don't respond back
   ever again." He also asked for contacts you can message FIRST, a lot more
   preset replies to pick from, a cost for ignoring people, something real to
   come back from messaging, and a sports feed that is about the rest of the
   football world rather than about him.

   This file owns all of that. The engine calls four things:
     phoneSeasonTick   between seasons: neglect, repair, new conversations
     phoneReply        the single write path for every tap in the Messages app
     worldSeasonTick   at season end: the world moves, the feed gets written
     phoneStanding     how the people in your life feel about you, 0 to 100

   THREE RULES THIS FILE LIVES BY

   1. One truth. The feed only ever prints something the sim actually produced.
      Every transfer in the feed happened in WorldState.clubs, and the Ballon
      d'Or screen reads the same map, so a striker cannot be at two clubs in
      two places on the same phone. Real player and club names are fine, and
      the sim's own events about them are fine, but nothing here invents a
      quote and puts it in a real person's mouth, and nothing here states a
      real world fact the sim did not generate.

   2. Bounded storage. Threads that grow forever would eat localStorage. Every
      thread keeps its last MAX_LINES lines, we keep at most MAX_THREADS
      threads, the feed keeps MAX_FEED items and the world keeps ONE season,
      so the phone's share of the save stops growing after about five seasons
      instead of climbing with career length.

   3. Old saves. Everything is optional and everything is repaired lazily by
      ensurePhone, which is pure: the panel can call it to render a save that
      has never ticked, and the engine calls it before every write. Round 127
      learned that repairing at the step function is not enough when a screen
      can be opened first, so the read path repairs too.
*/

import type { CareerState } from "./soccerCareerEngine";
import { getEraStars, getEraTopClubs, getEraLeagueClubs, getEraRivalName } from "./careerEras";

/* ─── storage caps ─── */
export const MAX_LINES = 6;    // lines kept per thread (three exchanges of history)
export const MAX_THREADS = 8;  // threads kept, oldest resting one drops first
export const MAX_FEED = 12;    // sports feed items kept
export const MAX_PERKS = 6;    // stat perks a whole career can ever collect
export const MAX_WORLD_NAMES = 28; // entries kept in the who plays where map
export const MAX_SEEN = 8;     // convo ids remembered per contact

/* ─── types ─── */

export type ContactId =
  | "mum" | "dad" | "grandad" | "partner" | "bestmate"
  | "agent" | "gaffer" | "captain" | "roomie" | "physio" | "fitness"
  | "youthcoach" | "academy" | "kitman" | "journo" | "natcoach" | "rival"
  /** One off senders from the Round 80 pool that are nobody's regular contact.
   *  They still answer you back, they just do not become a saved contact. */
  | "other";

export interface ContactDef {
  id: ContactId;
  /** Relationship word, never an invented name for his real family. */
  name: string;
  emoji: string;
  /** One line under the name in the contacts list. */
  blurb: string;
}

export interface PhoneReplyDef {
  /** Button copy. Short, the way you would actually pick it. */
  label: string;
  /** What your player sends. */
  say: string;
  /** What they text straight back. Specific to THIS choice. */
  back: string;
  /** Relationship move, default +6. */
  warm?: number;
  karma?: number;
  morale?: number;
  popularity?: number;
  cash?: number;
  /** A real one off payoff. See applyPerk. */
  perk?: PerkId;
  /** Overrides the next beat's opening line so branches read differently. */
  nextText?: string;
}

export interface ConvoBeat {
  text: string;
  replies: PhoneReplyDef[];
}

export interface ConvoDef {
  id: string;
  contact: ContactId;
  phase: "youth" | "pro" | "any";
  minAge?: number;
  maxAge?: number;
  /** Can the player open this one himself from Contacts. */
  starter?: boolean;
  /** Extra gate on career state. */
  needs?: (s: CareerState) => boolean;
  beats: ConvoBeat[];
}

export type PerkId = "sharp" | "offer" | "lift" | "spotlight" | "needle" | "calm";

/** w: 0 is them, 1 is you. Short keys because this lives in localStorage. */
export interface PhoneLine { w: 0 | 1; t: string; y: number }

export interface PhoneThread {
  id: string;
  c: ContactId;
  name: string;
  emoji: string;
  lines: PhoneLine[];
  /** 0 to 100. 50 is normal. */
  rel: number;
  /** What is waiting on you right now. */
  pending: { kind: "convo"; convo: string; beat: number } | { kind: "legacy"; msgId: string } | null;
  /** Season year the unanswered line landed, null when nothing is waiting. */
  waiting: number | null;
  /** How many seasons in a row you have left them hanging. */
  cold: number;
  /** Convo ids already used with this contact. */
  seen: string[];
  /** Last season you replied. Drives the contacts list ordering. */
  lastReplyYear: number | null;
}

export interface WorldMove { who: string; from: string; to: string; fee: number }

export interface WorldSeason {
  year: number;
  /** Champions League winner this season. */
  ucl: string;
  /** League name to champion club. */
  leagues: Record<string, string>;
  /** Round 292: league name to domestic cup winner. Absent on saves from before
   *  this round, which the ceremony reads as "no cup honours to hand out". */
  cups?: Record<string, string>;
  moves: WorldMove[];
  topScorer: { who: string; club: string; goals: number; league: string } | null;
  /** International tournament result, when the summer produced one. */
  intl: { name: string; champion: string } | null;
}

export interface PhoneState {
  threads: PhoneThread[];
  /** Pre rendered feed lines, newest last. */
  feed: string[];
  /** The season the feed lines came from, kept so the claims stay checkable. */
  world: WorldSeason | null;
  /** Who plays where, in this sim. The single truth about the wider world. */
  clubs: Record<string, string>;
  /** The rival's club last time we looked, so a move can be spotted. */
  rivalClub: string | null;
  /** Own RNG so the phone never disturbs the world sim's random stream. */
  seed: number;
  /** Perks banked and spent. */
  offers: number;
  perksTaken: number;
  /** Per season budget for what conversations can hand out. See spend(). */
  bYear?: number;
  bK?: number;
  bP?: number;
  bM?: number;
}

/* ─── tiny deterministic RNG, kept off the global stream on purpose ─── */
function nextSeed(s: number): number { return (s * 1664525 + 1013904223) >>> 0; }
class Rng {
  constructor(private s: number) { this.s = s >>> 0 || 1; }
  next(): number { this.s = nextSeed(this.s); return this.s / 4294967296; }
  get state(): number { return this.s; }
  int(lo: number, hi: number): number { return lo + Math.floor(this.next() * (hi - lo + 1)); }
  pick<T>(arr: T[]): T { return arr[Math.floor(this.next() * arr.length)]; }
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/* ─── contacts ────────────────────────────────────────────────────────────
   Family gets relationship words. We do not name the player's real mother.
   Everyone else gets the job they do, except the rival, who already has a
   generated name of his own from the engine. */

export const CONTACTS: ContactDef[] = [
  { id: "mum", name: "Mum", emoji: "❤️", blurb: "Answers on the first ring" },
  { id: "dad", name: "Dad", emoji: "🧔", blurb: "Watched every minute you ever played" },
  { id: "grandad", name: "Grandad", emoji: "🧓", blurb: "Shouts at the telly on your behalf" },
  { id: "partner", name: "Your partner", emoji: "💞", blurb: "The one who sees the bad days" },
  { id: "bestmate", name: "Best mate", emoji: "🤙", blurb: "Knew you before any of this" },
  { id: "agent", name: "Your agent", emoji: "💼", blurb: "Always half a deal ahead of you" },
  { id: "gaffer", name: "The gaffer", emoji: "📋", blurb: "Picks the team, picks his words" },
  { id: "captain", name: "Club captain", emoji: "🦁", blurb: "Runs the dressing room" },
  { id: "roomie", name: "Away room mate", emoji: "😴", blurb: "Snores, shares everything else" },
  { id: "physio", name: "Club physio", emoji: "🩹", blurb: "Knows your body better than you" },
  { id: "fitness", name: "Fitness coach", emoji: "🏋️", blurb: "Owns the sadistic clipboard" },
  { id: "youthcoach", name: "Old youth coach", emoji: "👴", blurb: "Still calls you kid" },
  { id: "academy", name: "Academy kid", emoji: "🌱", blurb: "Looks at you the way you looked at someone" },
  { id: "kitman", name: "Kit man", emoji: "🧺", blurb: "Has seen forty years of you lot" },
  { id: "journo", name: "Journalist", emoji: "📰", blurb: "Friendly until he is not" },
  { id: "natcoach", name: "Country manager", emoji: "🌍", blurb: "Names the squad in March" },
  { id: "rival", name: "Rival", emoji: "🪞", blurb: "The name next to yours, forever" },
];

const CONTACT_BY_ID: Record<string, ContactDef> =
  Object.fromEntries(CONTACTS.map(c => [c.id, c]));

/** Live display name for a contact. The rival borrows his generated name. */
export function contactName(id: ContactId, s: CareerState): string {
  if (id === "rival" && s.rival?.name) return s.rival.name;
  if (id === "natcoach") return `${s.nationality} manager`;
  return CONTACT_BY_ID[id]?.name ?? id;
}

export function contactEmoji(id: ContactId): string {
  return CONTACT_BY_ID[id]?.emoji ?? "💬";
}

/** Which contacts exist for this player right now. */
export function contactAvailable(id: ContactId, s: CareerState, phase: "youth" | "pro"): boolean {
  switch (id) {
    case "partner": return !!s.hasRelationship || !!s.family?.isMarried;
    case "rival": return !!s.rival && !s.rival.retired;
    case "natcoach": return !!s.internationalCareer;
    case "gaffer": case "captain": case "roomie": case "physio": case "kitman":
      return phase === "pro";
    case "journo": return phase === "pro" && s.age >= 19;
    case "academy": return phase === "youth" || s.age >= 21;
    default: return true;
  }
}

/* ─── the conversation catalog ────────────────────────────────────────────
   Every convo is two or three beats. A beat is what they send plus the
   presets you can pick from. Pick one and you send `say`, they answer with
   `back`, and if there is another beat they carry straight on, which is the
   whole point of this round. Written to sound like people texting rather
   than a menu, and matched to the register Round 80 set. */

const R = (
  label: string, say: string, back: string, warm = 6, extra: Partial<PhoneReplyDef> = {},
): PhoneReplyDef => ({ label, say, back, warm, ...extra });

const B = (text: string, ...replies: PhoneReplyDef[]): ConvoBeat => ({ text, replies });

const C = (
  id: string, contact: ContactId, phase: "youth" | "pro" | "any",
  beats: ConvoBeat[], opts: Partial<ConvoDef> = {},
): ConvoDef => ({ id, contact, phase, beats, starter: true, ...opts });

export const CONVOS: ConvoDef[] = [
  /* ── Mum ── */
  C("mum_checkin", "mum", "any", [
    B("Just checking you are eating something other than chicken and rice. Are you?",
      R("Send her a photo of dinner", "Sending you a photo. There are vegetables on it. Two kinds", "TWO kinds. My son. Look at you", 8, { morale: 3 }),
      R("Be honest", "Chicken and rice. Every day. I have made peace with it", "You are a professional athlete not a prisoner. I am posting you a lasagne", 6, { morale: 2 }),
      R("Turn it round on her", "Are YOU eating properly is the question", "Do not do that. Answer the question", 4),
    ),
    B("Right. Next thing. Are you sleeping? And do not say fine.",
      R("Tell her the truth", "Not brilliant. Head is loud after games", "Then ring me after games instead of lying in the dark. Any time. I mean it", 9, { morale: 5, perk: "calm" }),
      R("Say you are fine", "I am fine mum", "You said fine. I said do not say fine", 3),
      R("Make her laugh", "I sleep like a baby. Wake up every two hours crying", "Cheeky. Go to bed", 6, { morale: 2 }),
    ),
    B("One more thing and I will leave you alone. Sunday dinner. Yes or no.",
      R("Yes", "Yes. What time", "One o clock and do not be late like your father", 9, { morale: 5 }),
      R("Bring the whole squad", "Can I bring two of the lads? They live on their own", "Two? I will do a leg of lamb. Tell them to bring nothing", 10, { morale: 6, perk: "lift" }),
      R("Cannot", "Away game Sunday mum", "Then the Sunday after. I am writing it down", 4),
    ),
  ]),
  C("mum_proud", "mum", "any", [
    B("Your nan told the whole street about you again. She has a photo in her purse and everything.",
      R("Send something for nan", "Tell her I am sending a signed shirt for the purse photo wall", "She is going to cry. Then she is going to tell the street again", 9, { karma: 4, morale: 3 }),
      R("Be embarrassed", "Mum that is so embarrassing please stop her", "Absolutely not. Let the woman have this", 5),
      R("Leave it", "Ok", "Ok? That is all I get? Ok?", -2, { warm: -2 }),
    ),
    B("She asked if you are happy. Not doing well. Happy. I said I would ask properly.",
      R("Say yes and mean it", "Honestly? Yeah. Tired, but yeah", "Good. That is the only bit I actually worry about", 8, { morale: 4 }),
      R("Admit it is heavy", "Some weeks it is a lot mum", "Then come home for a weekend. The kettle works and nobody wants anything from you here", 9, { morale: 6, perk: "calm" }),
      R("Dodge it", "Ask me after Saturday", "That is not an answer and you know it", 2),
    ),
    B("She wants to know if you will come to the street party when you next win something.",
      R("Say yes", "If we win anything I am coming home with it. Tell her to get the bunting", "The bunting has been in the loft for two years waiting", 10, { karma: 4, morale: 4 }),
      R("Say it is too much", "I would get mobbed mum", "You would get fed. Different thing", 5),
    ),
  ]),
  C("mum_worry", "mum", "any", [
    B("I saw what they were saying about you online. I know you say do not read it. I read it.",
      R("Tell her to stop reading", "Mum. Log off. Please. It is noise", "It is my son they are talking about. But fine. Logging off", 7, { morale: 2 }),
      R("Let her be angry", "Go on then. Say what you want to say", "I want to say they have never kicked a ball in their lives. There. Done", 8, { morale: 4 }),
      R("Laugh it off", "Half of them are twelve mum", "The other half are grown men which is worse", 6, { morale: 2 }),
    ),
    B("Promise me you are talking to someone about it. Not just me at midnight.",
      R("Promise properly", "I will talk to the club doc this week. Promise", "Good boy. Now go and win something", 9, { morale: 5, karma: 3, perk: "calm" }),
      R("Say you have got it", "I have got it. Really", "Hm. I am checking back in a month", 4),
    ),
    B("And do me a favour. Do not read the comments before a game. Read them never actually.",
      R("Agree to delete the apps", "Deleting the apps til the end of the season", "That is my boy. Watch how much lighter you feel", 10, { morale: 6, perk: "calm" }),
      R("Half agree", "I will stop before games at least", "Half a promise. I will take it", 6, { morale: 2 }),
    ),
  ]),

  /* ── Dad ── */
  C("dad_analysis", "dad", "any", [
    B("Watched it back three times. You were dropping too deep in the second half son. Coming to get the ball because you wanted a touch.",
      R("Take it on the chin", "You are right. I got frustrated and went looking for it", "That is all I wanted to hear. Stay high, they have to deal with you", 8, { perk: "sharp" }),
      R("Argue back", "There was nobody else showing for it. What was I meant to do", "Then let them lose it. Not your job to fix their bottle", 5),
      R("Tell him to relax", "Dad it is one game", "Three times I watched it. THREE", 3),
    ),
    B("Anyway. Your mother says I am not allowed to send you notes at midnight anymore.",
      R("Tell him to keep sending", "Keep sending them. Nobody else tells me the truth", "Right. Notes continue. Do not tell her", 9, { morale: 4 }),
      R("Agree with mum", "She might have a point", "Traitor", 4),
    ),
    B("Right. Last one. What are you actually working on this week. In training. Specifically.",
      R("Give him a real answer", "First touch away from pressure. Doing 200 a day on my own", "THAT is an answer. Two hundred a day. Good lad", 9, { perk: "sharp" }),
      R("Say you do not know", "Whatever the coaches put on honestly", "Then pick something yourself. Nobody built a career doing the group session", 7, { perk: "sharp" }),
      R("Tell him to leave it", "Dad. Enough for tonight", "Alright alright. Night son", 3),
    ),
  ]),
  C("dad_firstboots", "dad", "any", [
    B("Found your first pair of boots in the loft. Size 3. Held together with tape and hope.",
      R("Ask him to keep them", "Do not throw those out. Ever", "They are going in a box with your name on it. Already done", 9, { morale: 5 }),
      R("Ask for a photo", "Send me a photo of them", "Sent. Look at the state of the left one", 7, { morale: 3 }),
      R("Bin them", "Chuck them, I have got hundreds of pairs now", "You have got hundreds of pairs because of that pair", -1, { warm: -4 }),
    ),
    B("Your mother wants to know if you remember who paid for them.",
      R("Say thank you properly", "I know exactly who paid for them. And the petrol to every away game. Thank you", "Stop it. You will set me off", 10, { morale: 6, karma: 4 }),
      R("Joke about it", "The council?", "The COUNCIL. Right", 5),
    ),
    B("She says put them in the cabinet with your medals. I said you have not got a cabinet.",
      R("Promise the cabinet", "Tell her I am building one. Boots go on the top shelf", "Top shelf. Above the medals. She will love that", 10, { morale: 5 }),
      R("Admit you have no medals yet", "I have not won anything yet dad", "Yet. That word is doing a lot of work and I like it", 8, { morale: 4, perk: "sharp" }),
    ),
  ]),
  C("dad_pressure", "dad", "pro", [
    B("Lads at work keep asking me when you are going to a bigger club. I keep telling them to ask you.",
      R("Give him something to say", "Tell them my dad has no idea and neither do I. Which is true", "Perfect. That will shut them up for a week", 7),
      R("Be honest about it", "Honestly? I think about it every day dad", "Then think about it properly and stop letting other people think it for you", 8, { perk: "sharp" }),
      R("Get annoyed", "Tell them to mind their business", "They are just proud of you in a stupid way. That is all it is", 3),
    ),
  ], { minAge: 20 }),

  /* ── Grandad ── */
  C("grandad_ticket", "grandad", "any", [
    B("Still got my seat. Row H. Been in that row since 1974 and I am not moving for anybody.",
      R("Offer him the good seats", "I can get you in the family box. Heated. Cup of tea and everything", "Heated? Row H it is then. But tell your mother I considered it", 8, { morale: 4 }),
      R("Respect the row", "Row H forever. I would not dare move you", "Good lad. You understand", 9, { morale: 3 }),
    ),
    B("Here. When you score, do the thing. You know the thing.",
      R("Promise the celebration", "Next one is for you. Point at Row H", "I will have my hat off and everything", 10, { morale: 6, karma: 3 }),
      R("Play it down", "I do not really do celebrations grandad", "You will do this one", 5),
    ),
    B("And bring your nan a scarf from the away end. She collects them. Do not ask me why.",
      R("Get her the scarf", "Away scarf, next trip. Consider it done", "She has 31 of them. You are keeping a woman happy here", 9, { morale: 4 }),
      R("Get her the whole lot", "I will get her one from every away ground this season", "Now you have started something. She will count them", 10, { morale: 6, karma: 3 }),
    ),
  ]),
  C("grandad_oldtimes", "grandad", "any", [
    B("In my day the ball was heavier and the pitch was mud from November. You lot play on a carpet.",
      R("Wind him up", "And you walked to the ground uphill both ways", "Do not be clever. I have got photographs", 7, { morale: 3 }),
      R("Ask him about it", "What was the best player you ever saw live?", "Now that is a proper question. Get the kettle on, this takes a while", 9, { morale: 4 }),
    ),
  ]),

  /* ── Partner ── */
  C("partner_time", "partner", "any", [
    B("You have been home four nights this month. I counted. I was not going to say anything but I counted.",
      R("Own it", "That is on me. Not the schedule, me. I will fix it", "Thank you for not arguing with the number", 9, { morale: 5, karma: 4 }),
      R("Explain the schedule", "Away trip, then internationals, then away again. It is the calendar not me", "I know what the calendar is. I asked about you", 3),
      R("Get defensive", "This is the job. You knew that", "I did. Does not make the house any less quiet", -3, { warm: -6, morale: -3 }),
    ),
    B("So what does fixing it actually look like. Be specific.",
      R("Make a real plan", "Two nights a week, phone in a drawer, no exceptions. Starting Tuesday", "Tuesday. I am holding you to it and I am putting it in the calendar", 10, { morale: 8, perk: "calm" }),
      R("Promise vaguely", "I will be around more, I promise", "That is not specific. But ok", 3),
    ),
    B("Ok. And when you are home, actually be home. Not on the phone reading about yourself.",
      R("Agree", "Phone in the drawer. I mean it", "Then I will stop pretending I do not check it either", 10, { morale: 6, perk: "calm" }),
      R("Push back gently", "Some of that is work though", "Some of it. Not all of it. You know the difference", 5),
    ),
  ], { needs: s => !!s.hasRelationship || !!s.family?.isMarried }),
  C("partner_afterloss", "partner", "pro", [
    B("I watched it. Do you want me to say something nice or do you want me to leave it alone.",
      R("Ask to be left alone", "Leave it alone tonight. Tomorrow I will talk", "Ok. Food is in the oven. Not talking about it", 8, { morale: 4 }),
      R("Ask for something nice", "Say something nice. I am on the floor here", "You were the only one who kept running. I watched you the whole way", 9, { morale: 7 }),
      R("Snap at her", "Do not watch them if you are going to analyse them", "Right. Noted", -4, { warm: -8, morale: -4 }),
    ),
    B("For what it is worth, the version of you that comes home is the one I actually like.",
      R("Say it back", "That version only exists because of you. I know that", "Now you are just being nice because I made food", 10, { morale: 8 }),
      R("Deflect", "Give it a week and you will change your mind", "Stop it", 4),
    ),
    B("Do you want me at the next one or would you rather I was not in the stand?",
      R("Want them there", "I look for you every time. Be there", "Then I am there. Front row, terrible singing", 10, { morale: 7 }),
      R("Ask them to skip it", "Skip this one. It is going to be horrible", "Ok. But I am watching it at home and shouting anyway", 6, { morale: 2 }),
    ),
  ], { needs: s => !!s.hasRelationship || !!s.family?.isMarried }),
  C("partner_move", "partner", "pro", [
    B("If you moved clubs, would you actually ask me first. Genuine question.",
      R("Say yes and mean it", "You would be the first call. Before my agent. Before anyone", "Good. Because I would go anywhere with you, I just want to be asked", 10, { morale: 6, karma: 4 }),
      R("Be honest about the business", "Honestly these things move fast and sometimes there is no time", "Then make time. It is my life too", 4),
      R("Joke", "Depends where", "Wrong answer. Try again", 2),
    ),
    B("Where would you actually go, if it was only up to you.",
      R("Somewhere you would win", "Somewhere I would win everything. That is the whole point", "Then go and win it. I will find a coffee shop I like", 9, { morale: 5, perk: "offer" }),
      R("Somewhere you would play", "Somewhere I would play every week. Sick of watching", "That is the most honest thing you have said all month", 9, { morale: 5, perk: "offer" }),
      R("Nowhere", "Nowhere. I like it here", "Then stay and stop scrolling transfer rumours at 1am", 7, { morale: 3 }),
    ),
  ], { minAge: 20, needs: s => !!s.hasRelationship || !!s.family?.isMarried }),

  /* ── Best mate from home ── */
  C("mate_fivea", "bestmate", "any", [
    B("Five a side Thursday. Same cage. Lads still think they can mark you. Are you coming or are you too famous",
      R("Turn up", "I am coming and I am not going easy on anyone", "The cage is going to be RAMMED. Word will get out in an hour", 8, { morale: 5, popularity: 2 }),
      R("Send money for the pitch", "Cannot make it but I have paid for the pitch for the rest of the year", "Absolute scenes. You are a legend", 6, { karma: 4, cash: -0.01 }),
      R("Leave him hanging", "", "Right. Say no more", -4, { warm: -8, karma: -4 }),
    ),
    B("Serious question though. Are you alright? You have gone quiet with everyone.",
      R("Open up", "Bit lost if I am honest mate", "Then get in the cage Thursday. Nobody in there cares what you earn", 10, { morale: 7, perk: "calm" }),
      R("Keep it light", "I am fine. Busy", "Busy. Right. Thursday. I am not asking", 5),
    ),
    B("Also everyone keeps asking me if you have changed. I keep saying no. Have you?",
      R("Ask him honestly", "You tell me. You would know before I would", "Bit. Not in a bad way. You are just tired all the time", 9, { morale: 4 }),
      R("Say no", "Not a chance. Same idiot", "Correct answer and mostly true", 8, { morale: 3 }),
      R("Get defensive", "Why, what have they been saying", "Nothing. Forget I said it", 2),
    ),
  ]),
  C("mate_wedding", "bestmate", "pro", [
    B("Getting married in June. You are best man. Not a question, an announcement.",
      R("Say yes immediately", "Obviously. Try and stop me", "Speech better be good. No football stories. Ok one football story", 10, { morale: 7, karma: 4 }),
      R("Check the fixtures", "Let me check the fixture list first mate", "Mate. June. YOU are the fixture list", 3),
      R("Say no", "I cannot commit to anything that far out", "Wow. Ok", -5, { warm: -10, karma: -6 }),
    ),
    B("One more thing. Do not turn up with security. It is a village hall.",
      R("Agree", "Just me and a suit. Promise", "Perfect. Uncle Ray will still ask you for a trial", 9, { morale: 4 }),
      R("Insist", "I have to bring one guy, that is the club rule", "Fine. Put him on the buffet, he will love it", 6),
    ),
    B("Last thing. The speech. Are you actually going to do it or are you going to wing it.",
      R("Write it properly", "I have already started writing it. Two pages", "TWO PAGES. Mate. I am going to cry in front of my in laws", 10, { morale: 6, karma: 3 }),
      R("Wing it", "I will wing it. It will be fine", "Famous last words from a man who cannot do a post match interview", 5),
    ),
  ], { minAge: 22 }),

  /* ── Agent ── */
  C("agent_interest", "agent", "pro", [
    B("Two clubs have called this week. One is serious, one is fishing. Do you want the names or do you want me to handle it",
      R("Ask for the names", "Names. Now. I want to know who actually rates me", "Sending them. Do not screenshot this to anyone", 8, { perk: "offer" }),
      R("Let him handle it", "Handle it. Bring me something real or nothing at all", "That is how I like to work. Leave it with me", 7, { perk: "offer" }),
      R("Shut it down", "Not interested. I am happy here", "Noted. I will tell them the door is shut. For now", 5, { morale: 3 }),
    ),
    B("Before I go back to them. What actually matters to you. Money, minutes, or medals.",
      R("Minutes", "Minutes. I cannot develop watching", "Good. That narrows it and it is the right answer at your age", 9, { perk: "sharp" }),
      R("Medals", "Medals. I want to win things while I still can", "Then we are aiming higher and I am asking for less. Understood", 9, { perk: "offer" }),
      R("Money", "Money. I am not going to pretend otherwise", "Refreshing. I can absolutely work with that", 6, { karma: -3, cash: 0.4 }),
    ),
    B("Right. I am going to go and be annoying at somebody on your behalf. Anything you do NOT want?",
      R("No sideways moves", "Nothing sideways. If it is not a step up I am not moving", "Understood. That rules out two of them already", 9, { perk: "offer" }),
      R("Nowhere I would not play", "Nowhere that signs me to sit me on a bench", "Right. I will ask about minutes before I ask about money", 9, { perk: "offer" }),
      R("Leave it with him", "Surprise me", "Dangerous words to say to an agent", 5),
    ),
  ], { minAge: 18 }),
  C("agent_contract", "agent", "pro", [
    B("Your club want to open contract talks early. That is a good sign and also a trap. They want to lock you in cheap.",
      R("Play it patient", "Let them wait. I will let the season do the talking", "That is the play. Every goal from here is a pay rise", 8, { perk: "offer" }),
      R("Sign now for security", "I would rather have it done. Get me a fair deal now", "Safe. Boring. Honestly, not wrong either", 7, { morale: 4 }),
      R("Demand the world", "Tell them the number and watch their faces", "I will enjoy that meeting. It may not end well", 4, { karma: -3 }),
    ),
    B("One more thing and then I will leave you alone. Are you happy at this club, actually.",
      R("Yes", "Yeah. I would stay", "Then I negotiate like a man who does not want to leave. Costs us a bit. Worth it", 8, { morale: 5 }),
      R("No", "No. I have outgrown it", "Right. Then we are having a very different conversation in January", 7, { perk: "offer" }),
    ),
    B("One last thing, and I ask everybody this. What do you want people to say about you at 35.",
      R("That he was hard to play against", "That I was a nightmare to play against for fifteen years", "Then we build the career around that sentence. Good", 9, { perk: "sharp" }),
      R("That he won things", "That I won. Everything else is noise", "Then we go where the trophies are, even if the money is worse", 9, { perk: "offer" }),
      R("Never thought about it", "Genuinely no idea", "Think about it. It is the only question that decides the rest", 5),
    ),
  ], { minAge: 19 }),
  C("agent_brand", "agent", "pro", [
    B("Boot brand wants you. Small money now, big money if you kick on. Or we wait for a bigger name to notice.",
      R("Take the small deal", "Take it. Money now, and I want to be loyal to whoever backs me early", "Loyalty plays well and pays later. Signing it", 7, { cash: 0.3, popularity: 2 }),
      R("Wait it out", "Wait. I back myself", "So do I. Risky. I like it", 7, { perk: "spotlight" }),
      R("Ask what he would do", "What would you do if it was your career", "I would wait. But I would also stop pretending my agent knows your body better than you", 8, { morale: 3 }),
    ),
  ], { minAge: 19 }),

  /* ── The gaffer ── */
  C("gaffer_role", "gaffer", "pro", [
    B("Come see me at the training ground tomorrow. Nothing bad. I want to tell you what I actually want from you.",
      R("Ask for more", "Before I come in. I want more minutes and I will earn them", "Good. I like being asked. Bring that attitude tomorrow", 8, { perk: "sharp" }),
      R("Just listen", "I will be there. I will listen", "That is the right answer more often than players think", 7, { perk: "sharp" }),
      R("Be wary", "Should I be worried", "If you were, I would not have texted. I would have let you find out", 5),
    ),
    B("One thing I want you to think about tonight. When we lose the ball, what do you do first.",
      R("Win it back", "Win it back. Within five seconds. That is the answer you want", "It is the answer I want AND the right one. See you at nine", 9, { perk: "sharp" }),
      R("Get in shape", "Get back in shape and hold the line", "Boring. Correct. Also see you at nine", 8),
      R("Admit you switch off", "Honestly? Sometimes I stand there annoyed", "At least you know. We can fix knowing. We cannot fix pretending", 8, { morale: 3, perk: "sharp" }),
    ),
    B("Good. Bring one question with you tomorrow. Any question. I will answer it straight.",
      R("Ask about your role", "Am I in your best eleven or am I in the squad", "In it. Not nailed on. That is the honest answer and you can change it by Friday", 9, { morale: 4, perk: "sharp" }),
      R("Ask about the team", "What is the one thing holding this team back", "Nobody talks. Including you. Fix that and we go up the table", 9, { perk: "lift" }),
      R("No question", "I will just listen", "Then listen properly. Nine o clock", 5),
    ),
  ]),
  C("gaffer_dropped", "gaffer", "pro", [
    B("You are on the bench Saturday. I would rather you heard it from me tonight than from a team sheet.",
      R("Ask what to fix", "Tell me exactly what gets me back in", "Two things. Sprint back after you lose it, and stop taking the safe pass. Do that and you start next week", 9, { perk: "sharp", morale: 2 }),
      R("Take it quietly", "Understood. I will be ready if you need me", "That is the response of somebody who plays a lot of games for me", 8, { morale: 3 }),
      R("Kick off", "This is a joke and you know it", "It is my team. Cool down and come see me Monday", -3, { warm: -8, morale: -5 }),
    ),
    B("For what it is worth I was dropped at your age and I sulked for a month. Waste of a month.",
      R("Take the lesson", "Then I will skip the month", "Ha. Good. Nine o clock, extra finishing", 9, { perk: "sharp" }),
      R("Stay annoyed", "I am still not happy about it", "I would be worried if you were", 6),
    ),
    B("Be honest with me. Do you still trust that I will play you when you deserve it?",
      R("Yes", "Yeah. You have never lied to me about it", "Then we are fine. Everything else is just Saturdays", 9, { morale: 5, perk: "lift" }),
      R("Not really", "Honestly, not at the minute", "Fair. I will earn it back the same way you will. See you at nine", 8, { morale: 3 }),
    ),
  ]),

  /* ── Captain ── */
  C("captain_standards", "captain", "pro", [
    B("Quick word. Nothing heavy. Couple of the young lads are drifting and they watch you more than they watch me.",
      R("Set the tone", "I will be first in all week. Let them see it rather than hear it", "That is exactly why I asked you and not somebody louder", 9, { perk: "lift" }),
      R("Talk to them", "I will pull them both aside quietly", "Quietly is right. Nobody learns anything from being embarrassed", 8, { karma: 4 }),
      R("Not your job", "Not really my problem mate", "Fair enough. It becomes your problem in about three years", -2, { warm: -5 }),
    ),
    B("Team meal Thursday. Everyone. Phones in a box at the door.",
      R("In", "In. And I am paying", "Right lads, he is paying. This is now a big night", 9, { morale: 5, cash: -0.02, perk: "lift" }),
      R("In, but not paying", "I will be there. Not paying, I paid last time", "Correct and I respect the memory", 7, { morale: 3 }),
      R("Skip it", "Cannot do Thursday", "Every time mate", -3, { warm: -7 }),
    ),
    B("Good. One more. If I go down injured for a long one, who speaks up in there?",
      R("Say you will", "Me. I will do it", "That is the answer I was fishing for and you did not even flinch", 10, { morale: 6, perk: "lift" }),
      R("Name somebody else", "The keeper. Everyone listens to him", "He would hate it. He would also be brilliant at it", 7),
    ),
  ]),
  C("captain_armband", "captain", "pro", [
    B("I am moving on in the summer. Between us, I have told the gaffer you should have the armband.",
      R("Say you are ready", "I am ready. I have been ready", "That is what I told him. Do not make me look daft", 9, { morale: 7, perk: "lift" }),
      R("Be honest about doubts", "Honestly I do not know if the lads would follow me", "They already do. You just have not noticed", 9, { morale: 6 }),
      R("Turn it down", "Give it to someone who wants it. I just want to play", "Respect that. Rare, but I respect it", 6),
    ),
    B("Whoever gets it, one bit of advice. The armband is not for the good days.",
      R("Ask what he means", "So what is it for", "The week after a hammering, when nobody wants to be first to speak. That is the job", 9, { morale: 4, perk: "lift" }),
      R("Say you know", "I know. I have watched you do it", "Then you already have it, plastic or not", 8, { morale: 4 }),
    ),
  ], { minAge: 24 }),

  /* ── Room mate ── */
  C("roomie_nerves", "roomie", "pro", [
    B("You alright? You have been staring at the ceiling for an hour and it is 1am.",
      R("Admit the nerves", "Big one tomorrow. Head is going", "Same. Every time. Nobody says it out loud though so we all lie awake separately", 9, { morale: 5 }),
      R("Say it is nothing", "Nothing mate. Go to sleep", "You are a terrible liar. Night", 5),
      R("Put the light on", "Put the light on, we are talking", "Great. Now neither of us sleeps. Worth it though", 8, { morale: 4 }),
    ),
    B("Can I ask you something daft. Do you ever feel like you got lucky and they will find out?",
      R("Admit you feel it too", "Every week. Waiting to be found out", "Thank god. I thought it was just me", 10, { morale: 6, perk: "calm" }),
      R("Talk him out of it", "You are here because you are good. Full stop", "Coming from you that actually lands", 9, { morale: 4, perk: "lift" }),
      R("Laugh at him", "Yeah you did get lucky", "Wow. Lights off", -2, { warm: -6 }),
    ),
    B("Do you ever think about what we do after? Like actually after.",
      R("Talk about it", "All the time. Coaching maybe. Or nothing at all for a year", "See I want to open a cafe. Everyone laughs. You did not laugh", 9, { morale: 4, perk: "calm" }),
      R("Refuse to", "I do not let myself think about it", "Probably healthy. Probably not", 6),
    ),
  ]),
  C("roomie_snacks", "roomie", "pro", [
    B("Mate the hotel food is a war crime. I have found a chip shop 400 metres away. Are we doing this",
      R("Go", "Go. Nutritionist will never know", "He will absolutely know. Worth it", 7, { morale: 4, karma: -2 }),
      R("Refuse", "Not the night before a game. Bring me a banana", "A BANANA. You have changed", 6),
      R("Order in for the whole squad", "Do one better. I am ordering proper food for everyone", "You are going to be the most popular man in this hotel", 8, { morale: 5, cash: -0.01, perk: "lift" }),
    ),
  ]),

  /* ── Physio ── */
  C("physio_niggle", "physio", "pro", [
    B("That hamstring. You have been guarding it for two weeks and you think I have not noticed.",
      R("Come clean", "It is tight. I did not want to say in case I got left out", "Thank you. Now I can actually help instead of guessing. In at eight", 10, { perk: "calm", morale: 3 }),
      R("Deny it", "It is fine. Honestly", "Then you will not mind me testing it in front of the gaffer tomorrow", -2, { warm: -6 }),
      R("Ask to manage it", "Can we manage it without me missing games", "Sometimes. If you are honest with me every single day. Deal?", 9, { perk: "calm" }),
    ),
    B("Last thing. How is the sleep and the stress. Both of those show up in soft tissue before they show up anywhere else.",
      R("Be honest", "Sleep is bad. Stress is worse", "Right. Then we treat that too. Half of my job is not legs", 10, { morale: 6, perk: "calm" }),
      R("Say it is fine", "All fine there", "Ok. But that box is ticked in pencil", 4),
    ),
    B("One rule then and we are done. If something feels wrong on a Friday, you tell me on the Friday.",
      R("Agree to the rule", "Friday. Every time. Even if it is nothing", "That one rule will add years to your career. I am not exaggerating", 10, { perk: "calm", morale: 4 }),
      R("Push back", "I do not want to be the one always in the treatment room", "You will not be. You will be the one still playing at 34", 8, { perk: "calm" }),
    ),
  ]),

  /* ── Fitness coach ── */
  C("fitness_extra", "fitness", "any", [
    B("Optional extras start Monday. 6am. Nobody has signed up yet which tells you everything.",
      R("Sign up", "Put my name down. First one in", "Good. Bring a bin. I am not joking", 8, { perk: "sharp", morale: -2 }),
      R("Ask what it does", "What does it actually give me", "Two more sprints in the last ten minutes. That is the difference between a goal and a photo of you jogging", 8, { perk: "sharp" }),
      R("Pass", "I need the rest more", "Fine. Rest is training too. But nobody ever got quicker resting", 3),
    ),
    B("If you come, I want a target. Give me one number to chase.",
      R("Top speed", "Top speed. I want to be the quickest at this club", "Now we are talking. Twelve weeks", 9, { perk: "sharp" }),
      R("Games played", "I just want to finish a season without breaking down", "Best target anyone has given me all year", 9, { perk: "calm" }),
    ),
    B("Last thing. Bring somebody with you. Nobody sticks at 6am on their own.",
      R("Drag a teammate in", "I will drag one of the young lads in with me", "Two of you at 6am and by March half the squad is there. Watch", 10, { perk: "lift" }),
      R("Go alone", "I will be fine on my own", "You will last three weeks. Prove me wrong", 6),
    ),
  ]),

  /* ── Old youth coach ── */
  C("youth_pride", "youthcoach", "any", [
    B("Still got the team photo from your first season up on the wall. You are the small angry one at the front.",
      R("Ask about the others", "Who else from that photo is still playing?", "Two. One is at a non league club and loves it. One is a physio now. Everyone else has a proper job", 9, { morale: 4 }),
      R("Thank him", "You made me. I will say that for the rest of my life", "Get away with you. You made you. I just stopped you kicking people", 10, { morale: 6, karma: 4 }),
      R("Brush it off", "Long time ago that", "It is. And I still watch every week", 3),
    ),
    B("Do me one favour. When a kid asks you for a photo, say yes. Even when you are tired.",
      R("Promise", "Always yes. Even when I am tired. Especially then", "Good lad. That is the whole lesson", 10, { karma: 6, popularity: 3 }),
      R("Be honest about it", "Some days I really do not want to", "Nobody does. Do it anyway. That is what the word professional means", 8, { karma: 3 }),
    ),
    B("And one day, when you are done, come and coach here. I am putting it in writing now.",
      R("Say yes", "When I am done I am coming straight back here", "I will hold this message up in about fifteen years", 10, { morale: 5, karma: 4 }),
      R("Cannot think that far", "I cannot even think about next season coach", "Then do not. I will keep the message anyway", 6),
    ),
  ]),
  C("youth_return", "youthcoach", "pro", [
    B("We have got a session Thursday for the under 12s. Twenty minutes of you would blow their minds. No cameras.",
      R("Do the whole session", "I will do the full session. And no cameras, agreed", "They are going to be unbearable for a month. Thank you", 10, { karma: 8, popularity: 3, morale: 4 }),
      R("Twenty minutes", "Twenty minutes is all I have got but I will be there", "Twenty minutes is twenty more than most", 8, { karma: 4, popularity: 2 }),
      R("Send kit instead", "Cannot do Thursday. Sending a full set of kit for them", "That will help. They would rather have you though", 5, { karma: 2, cash: -0.03 }),
    ),
  ], { minAge: 21 }),

  /* ── Academy kid ── */
  C("academy_firstteam", "academy", "any", [
    B("Training with the first team tomorrow. I have been sick twice. Any advice",
      R("Give him the one rule", "First ball, first tackle, win it. Everything else follows", "First ball first tackle. Ok. Ok I can do that", 8, { karma: 4, perk: "lift" }),
      R("Offer to pick him up", "I will pick you up. We go in together", "Are you serious. I am not going to sleep now", 10, { karma: 8, morale: 4, perk: "lift" }),
      R("Tell him to relax", "You are there because you are good enough. Breathe", "Nobody has said that to me yet. Thank you", 8, { karma: 4 }),
    ),
    B("Last thing sorry. What if I am rubbish and they send me back",
      R("Tell him the truth", "You probably will be rubbish for a bit. Everybody is. Then you are not", "That is weirdly the most calming thing anyone has said", 9, { karma: 4, perk: "lift" }),
      R("Big him up", "You will not be rubbish. I have watched you", "You have WATCHED me? I need to sit down", 8, { morale: 3 }),
    ),
    B("If it goes ok tomorrow can I text you after? I have got nobody else to tell.",
      R("Yes, any time", "Text me after every session. I mean it", "You have no idea what that means. See you tomorrow", 10, { karma: 6, morale: 4, perk: "lift" }),
      R("Set a boundary", "Text me after big ones. I am not your dad", "Fair enough. Big ones only", 5),
    ),
  ]),

  /* ── Kit man ── */
  C("kitman_shirt", "kitman", "pro", [
    B("Lad in the laundry has been here 30 years and never asked a player for anything. He asked me to ask you for a shirt.",
      R("Sign one properly", "Get me the shirt from Saturday. I will write him something proper on it", "He is going to have that framed by Tuesday", 9, { karma: 6, morale: 3 }),
      R("Do one better", "Shirt, boots, and get him and his wife in the box for a game", "Right. Now you have made an old man cry in a laundry room", 10, { karma: 8, popularity: 3, cash: -0.01 }),
      R("Later", "Remind me after the international break", "Course. He has waited 30 years, he can wait a fortnight", -1, { warm: -3 }),
    ),
  ]),

  /* ── Journalist ── */
  C("journo_column", "journo", "pro", [
    B("Doing a piece on players your age carrying clubs. Not a hit job. Ten minutes on the phone, you see quotes before print.",
      R("Do it properly", "Ten minutes, and I want to talk about the lads not just me", "That makes it a better piece anyway. Thursday?", 8, { popularity: 3, karma: 3 }),
      R("Decline politely", "Not for me at the minute. No hard feelings", "None at all. Door is open", 5),
      R("Use it", "I will do it if I can say what I actually think about the club", "Now THAT is a phone call. Thursday, and I am recording", 6, { popularity: 5, karma: -4 }),
    ),
    B("Off the record before we set it up. Are you happy there?",
      R("Nothing off the record", "There is no off the record with you lot. Ask me Thursday", "Fair. Genuinely fair. Thursday", 9, { karma: 5 }),
      R("Give him a hint", "Ask me again in January", "January. Noted. Loudly noted", 4, { karma: -3, popularity: 3 }),
    ),
    B("Fine. Then give me one line for the piece that is actually about football and not about you.",
      R("Praise a teammate", "Put in that our left back is the most underrated player in this league", "That is a lovely line and he will never forget it", 9, { karma: 5, perk: "lift" }),
      R("Praise the fans", "Say the away end has been the best thing about this season", "Cheap. True though. Using it", 8, { popularity: 4 }),
      R("Refuse", "I do not do lines. Watch the games", "Ha. Print that then", 4),
    ),
  ], { minAge: 19 }),

  /* ── Country manager ── */
  C("nat_squad", "natcoach", "pro", [
    B("Naming the squad Monday. Before I do I want to know where your head is, because your club season has been noisy.",
      R("Commit fully", "My head is fine. I will run through a wall for that shirt", "That is what I needed to hear. See you Monday", 9, { morale: 6, perk: "lift" }),
      R("Ask for honesty back", "Am I starting or am I making up the numbers", "You are in the squad. Starting is earned in the week, same as everyone", 8, { perk: "sharp" }),
      R("Ask to be left out", "I am running on empty. Leave me out this window", "Brave call. I would rather have you in March than broken in October", 7, { morale: 4, perk: "calm" }),
    ),
  ], { needs: s => !!s.internationalCareer }),
  C("nat_tournament", "natcoach", "pro", [
    B("Long summer coming. I need players who will still be sprinting in the 85th minute of a semi final.",
      R("Volunteer for anything", "Put me anywhere. Left back if you need it", "I might hold you to that and you will regret typing it", 9, { morale: 5, perk: "lift" }),
      R("Be realistic", "I can give you 60 big minutes every game, not 90", "Honest. Useful. Most players lie to me about this", 9, { perk: "sharp" }),
    ),
  ], { needs: s => !!s.internationalCareer, minAge: 21 }),

  /* ── Rival ── */
  C("rival_respect", "rival", "pro", [
    B("Good game. You were the best player on that pitch and I am only saying it once so screenshot it.",
      R("Give it back", "You were the reason it was close. Screenshot that", "Look at us. Two grown men being nice. Disgusting", 8, { morale: 4, popularity: 2 }),
      R("Stay cold", "Scoreboard said what it said", "Ha. There he is. See you in March", -2, { warm: -6, perk: "needle" }),
      R("Take the compliment", "Appreciated. Genuinely", "Do not get used to it", 6),
    ),
    B("Serious for a second. Does it get to you, the comparison thing?",
      R("Admit it", "Every single week. You?", "Constantly. Nobody else understands it which is the annoying part", 9, { morale: 5 }),
      R("Deny it", "Not once. I do not think about you at all", "You replied in four seconds", 3, { perk: "needle" }),
    ),
    B("Alright. One promise. Whoever finishes with more, the other one turns up to the testimonial.",
      R("Shake on it", "Deal. And I will be the one clapping you off", "We will see. Good luck this season. Genuinely", 9, { morale: 4, popularity: 2 }),
      R("Refuse the deal", "I am not planning a testimonial. I am planning to keep going", "Terrifying. See you in March", 4, { perk: "needle" }),
    ),
  ], { needs: s => !!s.rival && !s.rival.retired }),
  C("rival_needle", "rival", "pro", [
    B("Saw your interview. Bold from someone with fewer trophies than me.",
      R("Fire back", "Count them again in three years", "Oh it is ON. See you in the derby", 4, { popularity: 4, morale: 3, perk: "needle" }),
      R("Kill it with kindness", "You are right. Come and help me get some", "That is so annoying. I cannot even argue with that", 8, { karma: 4 }),
      R("Ignore the bait", "", "Silence. Interesting.", 1, { warm: 0 }),
    ),
    B("Between us though. Would you ever play in the same team as me.",
      R("Yes", "In a heartbeat. We would be unplayable", "We would be. Do not tell anyone I agreed", 8, { morale: 4 }),
      R("Never", "Never. I want to beat you, not carry you", "That is the correct answer and you know it", 3, { perk: "needle", popularity: 3 }),
    ),
  ], { needs: s => !!s.rival && !s.rival.retired }),

  /* ── second wave: more to say to the same people ── */

  C("mum_money", "mum", "pro", [
    B("Somebody at the shop asked me what you earn. I told them to mind their own business.",
      R("Back her up", "Good. It is nobody's business but ours", "That is what I said. Then I told them anyway. Sorry", 8, { morale: 3 }),
      R("Offer to sort her out", "Mum, let me buy you something. Anything. Please", "I do not need anything. Ask me again next year and I might say a new sofa", 9, { morale: 5 }),
      R("Get annoyed", "People are so nosy", "They are proud. It comes out sideways", 5),
    ),
    B("Do not let it change how you are with people. That is my only rule.",
      R("Promise", "Same me. Always. You would tell me if it was not", "I would tell you loudly and in front of everyone", 10, { karma: 5, morale: 4 }),
      R("Joke", "Too late, I am insufferable", "You are not. But keep checking", 6),
    ),
    B("Right. Go and get some sleep. And ring your nan.",
      R("Ring nan now", "Ringing her now before I forget", "You are a good boy. Night love", 10, { morale: 5, karma: 3 }),
      R("Tomorrow", "I will ring her tomorrow", "Tomorrow. I am writing it down", 4),
    ),
  ]),
  C("dad_debut", "dad", "pro", [
    B("Do you remember your first proper game? I do. You were sick behind the dugout.",
      R("Own the memory", "I remember. And I still nearly am, every time", "Everybody is. The ones who say they are not are lying", 9, { morale: 4 }),
      R("Deny it", "That never happened", "I have a photograph of the bucket", 7, { morale: 3 }),
    ),
    B("Point is you did it anyway. That has always been the thing about you.",
      R("Take it in", "I needed to hear that this week actually", "Then I will say it more often instead of sending you diagrams", 10, { morale: 6, perk: "calm" }),
      R("Deflect", "Soft in your old age dad", "Very. Do not tell the lads at work", 6),
    ),
  ], { minAge: 19 }),
  C("partner_home", "partner", "pro", [
    B("I found a house. It is too big and it has a stupid bath and I love it.",
      R("Go and see it", "Send me the link. We are going Saturday", "SATURDAY. Right. I am ringing them now", 9, { morale: 6 }),
      R("Talk about the move risk", "What if we get moved in January though", "Then we rent it out and cry. Come and look at the bath", 7, { morale: 3 }),
      R("Shut it down", "Not while the contract situation is up in the air", "Ok. It will be gone but ok", 2, { warm: -3 }),
    ),
    B("Whatever we do, I do not want to live somewhere that only makes sense if you keep winning.",
      R("Agree completely", "Nothing we cannot keep if it all goes wrong. Agreed", "That is the most attractive thing you have ever said", 10, { morale: 6 }),
      R("Play it big", "I am going to keep winning", "Not what I asked. But ok", 4),
    ),
  ], { minAge: 21, needs: s => !!s.hasRelationship || !!s.family?.isMarried }),
  C("captain_newsigning", "captain", "pro", [
    B("New lad signed today. Speaks about nine words of the language and looks terrified. Sound familiar?",
      R("Take him under your wing", "I will sit with him at lunch. And drive him in", "That is why I texted you and not the group chat", 9, { karma: 5, perk: "lift" }),
      R("Do the basics", "I will make sure he knows where everything is", "Do that much and he sleeps tonight", 7, { karma: 3 }),
      R("Not interested", "He will figure it out like the rest of us did", "We did. It was horrible. That was the point", -2, { warm: -6 }),
    ),
    B("Get him in the five a side on Thursday. That is where anyone actually joins a team.",
      R("Sort it", "He is on my team Thursday. Sorted", "Good. He will be one of us by Friday", 9, { perk: "lift" }),
      R("Let somebody else", "Get one of the young lads to do it", "I asked you because they copy you", 5),
    ),
  ]),
  C("roomie_contract", "roomie", "pro", [
    B("They have not offered me a new deal. Six months left. I am pretending I am fine.",
      R("Be straight with him", "You are not fine and that is fair enough. What do you actually want?", "To stay. Obviously. But nobody has said a word to me", 9, { morale: 3 }),
      R("Offer to ask for him", "Want me to say something to the gaffer? Quietly", "Would you? I would never have asked", 10, { karma: 6, perk: "lift" }),
      R("Change the subject", "Early game tomorrow mate", "Yeah. Night", -3, { warm: -7 }),
    ),
    B("If it goes the other way, will you still answer my messages when I am at some other club?",
      R("Obviously", "You will not get rid of me. Wherever you end up", "Right. Now I am the one lying awake being soft", 10, { morale: 5 }),
      R("Be realistic", "We will see. People drift", "Brutal. Honest though", 4),
    ),
  ]),
  C("physio_comeback", "physio", "pro", [
    B("Four weeks in. I know you feel good. I know you want to play Saturday. Ask me anyway.",
      R("Ask properly", "Am I ready for Saturday, honestly", "No. Two more weeks and you get the rest of the season. Push it and you get neither", 10, { perk: "calm" }),
      R("Push for it", "I am playing Saturday whatever you say", "Then you are picking a fortnight over a season and I will write that down", -2, { warm: -6, morale: -3 }),
      R("Defer to him", "Whatever you say. I will not fight you on it", "Good. Nobody ever regrets that call", 9, { perk: "calm", morale: 3 }),
    ),
    B("While I have got you. Rehab is boring and you have got a whole week of it. Do you want a job?",
      R("Take the job", "Give me something to do or I will lose my mind", "Right. You are coaching the under 18s finishers this week", 9, { morale: 5, perk: "sharp" }),
      R("Just rest", "I am going to switch off completely for a week", "Also a real answer. Go and be a person", 8, { morale: 4 }),
    ),
  ], { minAge: 19 }),
  C("agent_loan", "agent", "pro", [
    B("There is a loan on the table. Lower league, guaranteed starter, nobody watching. Old fashioned option.",
      R("Take the loan", "I will go. I need games more than I need the badge", "Best decision a young player can make and almost none of them make it", 9, { perk: "sharp" }),
      R("Ask what he thinks", "What does it actually do for me", "Thirty games. Men's football. Somebody kicking you every week. It makes you", 8, { perk: "sharp" }),
      R("Refuse", "I am not dropping down. I will fight for my place here", "Brave. Could go either way. I will tell them no", 6, { morale: 3 }),
    ),
    B("Whatever you pick, do not disappear on me for six months. I work better when you talk to me.",
      R("Agree", "I will ring you every month whether there is news or not", "You would be the first player who ever did. Deal", 10, { perk: "offer" }),
      R("Push back", "Ring me when there is something to say", "Fine. There will be less than you think", 3),
    ),
  ], { minAge: 18, maxAge: 25 }),
  C("kitman_boots", "kitman", "pro", [
    B("Your boots have been in the same bag since August and they smell like a crime. Want me to sort them?",
      R("Let him sort them", "Please. And whatever it costs I will double it", "It costs nothing. That is the job. But I will take the tea", 8, { morale: 3 }),
      R("Do it yourself", "I will do them tonight. My mess", "A player cleaning his own boots. I need a lie down", 9, { karma: 4 }),
    ),
    B("Forty years I have done this. You lot come and go. The polite ones I remember.",
      R("Ask about the old days", "Who was the best one you ever kitted out?", "Not telling you. But you are in the top ten and you are 22", 9, { morale: 4 }),
      R("Say thanks", "Thanks for everything you do. Genuinely", "Get out of my kit room before I get emotional", 9, { karma: 4, morale: 3 }),
    ),
  ]),
  C("nat_debut", "natcoach", "pro", [
    B("First cap. I want you to enjoy it, and I want you to remember one thing when you walk out.",
      R("Ask what", "Go on. What is the one thing", "Everybody in that stadium already thinks you belong. Only you are arguing", 9, { morale: 7, perk: "calm" }),
      R("Say you are ready", "I have been ready since I was nine", "Then go and prove it and stop texting me", 8, { morale: 5 }),
    ),
    B("Your family are in the players' box. All of them. I checked.",
      R("Thank him", "That means more than the cap does. Thank you", "Now go and have the best night of your life", 10, { morale: 8 }),
      R("Get emotional", "You have properly got me now", "Good. Use it in the first twenty minutes", 9, { morale: 6 }),
    ),
  ], { needs: s => !!s.internationalCareer }),
  C("grandad_advice", "grandad", "any", [
    B("Your father says you are worrying too much. He worries too much. Runs in the family.",
      R("Admit it", "I do worry. All the time", "Course you do. So did I. Then I got old and it stopped mattering", 9, { morale: 5, perk: "calm" }),
      R("Blame dad", "He is worse than me", "He is much worse than you. Do not tell him I said it", 8, { morale: 3 }),
    ),
    B("Here is my advice and then I am going for my nap. Play like you did in the garden.",
      R("Take it", "Like the garden. I will remember that on Saturday", "That is all it ever was. Everything else is people talking", 10, { morale: 6, perk: "sharp" }),
      R("Ask what he means", "What, terribly and with one boot on?", "Cheeky sod. Nap time", 7, { morale: 3 }),
    ),
  ]),
  C("mate_home", "bestmate", "any", [
    B("Went past your old house today. New people have painted the door red. Thought you should know.",
      R("Ask for a photo", "Send me a picture. Red? Really?", "Bright red. Your mum would have something to say", 8, { morale: 4 }),
      R("Get nostalgic", "I can still see the wall we used as a goal", "It is still there. Still has the mark", 9, { morale: 5 }),
    ),
    B("Do you miss it? Genuinely. Or is that a stupid question when you live where you live.",
      R("Say you miss it", "Every day. It is not stupid at all", "Then come back for a weekend. Nobody will make a fuss", 10, { morale: 6, perk: "calm" }),
      R("Say no", "No. I wanted out and I got out", "Fair. You always did want more than this place", 6),
    ),
  ]),
  C("fitness_recovery", "fitness", "pro", [
    B("Your numbers dip badly in the last fifteen minutes. Not fitness. Recovery. What are you doing after games?",
      R("Admit nothing", "Honestly? Nothing. I go home and sit on my phone", "Right. Then we have found free minutes lying on the floor", 9, { perk: "sharp" }),
      R("Claim you do everything", "Ice bath, stretch, the lot", "Your numbers disagree and numbers do not lie to me", 4),
      R("Ask for a plan", "Write me a proper recovery week and I will follow it", "Sending it tonight. Follow it and you get twenty minutes back", 10, { perk: "sharp" }),
    ),
    B("Sleep is the whole thing by the way. Everything else is decoration.",
      R("Fix the sleep", "Phone out the bedroom starting tonight", "That one change is worth more than anything I can do to you in a gym", 10, { perk: "calm", morale: 4 }),
      R("Say you cannot", "I cannot sleep after night games. Never could", "Then we work on the after, not the sleep. Come see me", 8, { perk: "calm" }),
    ),
  ]),
  C("academy_advice", "academy", "pro", [
    B("They released my mate today. He is 18. He has not stopped crying and I do not know what to say to him.",
      R("Tell him what to say", "Say nothing. Just sit with him. That is the whole job today", "That is what I did. I did not know if it was enough", 10, { karma: 6, morale: 3 }),
      R("Offer to help him", "Give me his name. I know people at three clubs who would look", "Are you serious? He will not believe this", 10, { karma: 8, perk: "lift" }),
      R("Be blunt", "It happens to nearly everyone. He will be fine", "Yeah. Suppose", 1, { warm: -4 }),
    ),
    B("Does it ever stop being scary? Like, at your level?",
      R("Tell the truth", "No. You just get better at carrying it", "Weirdly that helps", 9, { morale: 4 }),
      R("Lie kindly", "It gets easier. Promise", "Ok. I am holding you to that", 6),
    ),
  ], { minAge: 21 }),
  C("journo_column2", "journo", "pro", [
    B("Story doing the rounds that your dressing room has split. I am running something. Do you want a right of reply?",
      R("Kill it flat", "There is no split. Print that and I will stand behind it all season", "That is a strong denial and I will print it word for word", 8, { karma: 5, perk: "lift" }),
      R("Say nothing", "No comment", "No comment reads like yes to every reader alive. Your call", 4),
      R("Point him elsewhere", "Ask whoever fed you it what they want out of it", "Now THAT is a better story than the one I had", 6, { karma: -2, popularity: 3 }),
    ),
    B("Between us, who is actually briefing against you lot? You must know.",
      R("Refuse", "Even if I knew I would not tell you", "Correct answer. Annoying. Respect", 9, { karma: 6 }),
      R("Give him a name", "I have got an idea. Off the record", "Off the record does not exist but go on", 3, { karma: -6, popularity: 4 }),
    ),
  ], { minAge: 21 }),
  C("gaffer_captainask", "gaffer", "pro", [
    B("Something I want your read on, not as a player. Who do the group actually listen to in there?",
      R("Name somebody honestly", "The keeper. Nobody argues with him", "That matches what I see. Thank you for not saying yourself", 9, { perk: "lift" }),
      R("Say yourself", "Me, when it matters", "Bold. Prove it Tuesday when I make you run the warm up", 7, { morale: 4 }),
      R("Dodge it", "Not sure I should be answering that", "Fair. Forget I asked", 4),
    ),
    B("Second question and then I will let you eat. What do the players say about ME when I leave the room?",
      R("Tell him straight", "That you are honest and that you are hard work. Both", "That is the most useful sentence anyone has said to me this season", 10, { perk: "lift", morale: 4 }),
      R("Protect him", "Nothing bad", "Now I know it is bad", 3),
    ),
  ], { minAge: 24 }),
  C("rival_national", "rival", "pro", [
    B("Wild that we are in the same squad this week. Do we have to pretend to like each other in front of the press?",
      R("Play nice for the country", "For ten days, yes. Then back to normal", "Ten days. Then war. Deal", 8, { morale: 4, popularity: 2 }),
      R("Refuse", "I am not pretending anything", "Honestly? Same. See you at breakfast", 3, { perk: "needle" }),
    ),
    B("Room next to yours by the way. If you snore I am telling everyone.",
      R("Wind him up", "I will snore on purpose", "You are the worst. See you at training", 7, { morale: 3 }),
      R("Call a truce", "Truce for the tournament. Properly", "Truce. And if we win it nobody ever mentions this chat again", 9, { morale: 5, perk: "lift" }),
    ),
  ], { needs: s => !!s.rival && !s.rival.retired && !!s.internationalCareer }),
];

const CONVO_BY_ID: Record<string, ConvoDef> = Object.fromEntries(CONVOS.map(c => [c.id, c]));

/* What the button says in Contacts when YOU are the one starting it. Kept in
   one table rather than on every convo so the catalog above stays readable. */
const TOPICS: Record<string, string> = {
  mum_checkin: "Let her fuss over you",
  mum_proud: "Ask about nan",
  mum_worry: "Tell her what people are saying",
  dad_analysis: "Ask him what he saw in the game",
  dad_firstboots: "Talk about when you were a kid",
  dad_pressure: "Ask what people are saying at his work",
  grandad_ticket: "Sort him out for Saturday",
  grandad_oldtimes: "Get him going about the old days",
  partner_time: "Talk about how much you are away",
  partner_afterloss: "Tell them about the game",
  partner_move: "Ask how they would feel about moving",
  mate_fivea: "See if the cage is still on",
  mate_wedding: "Ask about the wedding",
  agent_interest: "Ask if anybody has called",
  agent_contract: "Bring up the contract",
  agent_brand: "Ask about boot deals",
  gaffer_role: "Ask him what he wants from you",
  gaffer_dropped: "Ask why you are not playing",
  captain_standards: "Ask how the group is",
  captain_armband: "Ask about the armband",
  roomie_nerves: "Admit you cannot sleep",
  roomie_snacks: "Ask what the hotel food is like",
  physio_niggle: "Own up about the niggle",
  fitness_extra: "Ask about the extra sessions",
  youth_pride: "Check in with your old coach",
  youth_return: "Offer to come back and coach a session",
  academy_firstteam: "Check on the kid coming up",
  kitman_shirt: "Ask if anybody wants a shirt",
  journo_column: "Ask what he is writing",
  nat_squad: "Ask where you stand for the squad",
  nat_tournament: "Ask about the summer",
  rival_respect: "Say well played",
  rival_needle: "Wind him up",
  mum_money: "Ask how she is coping with all this",
  dad_debut: "Talk about your first game",
  partner_home: "Talk about where you live",
  captain_newsigning: "Ask about the new signing",
  roomie_contract: "Check how his contract is going",
  physio_comeback: "Ask when you can play again",
  agent_loan: "Ask about going out on loan",
  kitman_boots: "Have a word about your boots",
  nat_debut: "Message him about your first cap",
  grandad_advice: "Ask him what he thinks",
  mate_home: "Ask what is happening back home",
  fitness_recovery: "Ask why you fade late in games",
  academy_advice: "Check on the kid",
  journo_column2: "Ask about the rumour going round",
  gaffer_captainask: "Ask what he wants from the group",
  rival_national: "Message him about the squad",
};

/** Button copy for starting a conversation yourself. */
export function convoTopic(def: ConvoDef): string {
  return TOPICS[def.id] ?? "Send them a message";
}

/* ─── neglect copy ─────────────────────────────────────────────────────────
   His examples, near enough his words: "wow I see how it is", "the fame has
   really gotten to u". Three stages, and stage three is different for family
   than for work, because your mum does not text you like your agent does. */

const COLD_WARM: string[][] = [
  [
    "Did you get my last one? No rush.",
    "Still waiting on you. Not sulking. Just saying.",
    "Hello? Anyone in there?",
  ],
  [
    "Wow. I see how it is then.",
    "Right. Message received. Loud and clear.",
    "Cool. Glad we are close.",
  ],
  [
    "The fame has really gotten to you.",
    "You have changed. Everyone says it and I keep defending you.",
    "I will stop texting. You clearly have people for that now.",
  ],
];

const COLD_WORK: string[][] = [
  [
    "Chasing this one. Let me know either way.",
    "Still need an answer on that when you get a sec.",
    "Bumping this up your inbox.",
  ],
  [
    "Wow. I see how it is.",
    "Two months, nothing. Noted.",
    "I will assume that is a no then.",
  ],
  [
    "The fame has really gotten to you.",
    "You were easier to deal with before all this.",
    "I will stop bothering you. Best of luck.",
  ],
];

const WARM_CONTACTS: ContactId[] = ["mum", "dad", "grandad", "partner", "bestmate", "youthcoach", "academy"];

/** However long you leave them, nobody hits absolute zero. They give up first. */
const REL_FLOOR = 22;

/** The apology openers a cooled contact accepts. */
const REPAIR: PhoneReplyDef[] = [
  { label: "Say sorry properly", say: "That is on me. No excuse. I should have replied.", back: "Thank you for actually saying it. That is all I wanted.", warm: 16, karma: 3, morale: 2 },
  { label: "Blame the schedule", say: "Sorry, the season has been mental.", back: "It is always the season. But alright.", warm: 8 },
  { label: "Ring them instead", say: "Forget texting. Are you free now? Ringing you.", back: "Now? Yes. Go on then.", warm: 20, morale: 4 },
  { label: "Brush it off", say: "You know what I am like.", back: "Yeah. I do now.", warm: -4 },
];

/* ─── state repair ───────────────────────────────────────────────────────── */

function blankPhone(): PhoneState {
  return {
    threads: [], feed: [], world: null, clubs: {}, rivalClub: null,
    seed: 1, offers: 0, perksTaken: 0,
  };
}

/**
 * Return a valid PhoneState for any save, old or new, WITHOUT mutating the
 * career passed in. The panel calls this to render, the engine calls it before
 * every write. A save from before this round comes back with an empty phone
 * rather than undefined, which is the whole reason a pre Round 130 save still
 * opens.
 */
export function ensurePhone(s: CareerState): PhoneState {
  const p = (s as CareerState & { phone?: PhoneState }).phone;
  if (!p || typeof p !== "object") return blankPhone();
  const out: PhoneState = {
    threads: Array.isArray(p.threads) ? p.threads.filter(t => t && Array.isArray(t.lines)) : [],
    feed: Array.isArray(p.feed) ? p.feed.filter(f => typeof f === "string") : [],
    world: p.world && typeof p.world === "object" ? p.world : null,
    clubs: p.clubs && typeof p.clubs === "object" ? p.clubs : {},
    rivalClub: typeof p.rivalClub === "string" ? p.rivalClub : null,
    seed: typeof p.seed === "number" && p.seed > 0 ? p.seed : 1,
    offers: typeof p.offers === "number" ? p.offers : 0,
    perksTaken: typeof p.perksTaken === "number" ? p.perksTaken : 0,
  };
  for (const t of out.threads) {
    if (typeof t.rel !== "number" || !Number.isFinite(t.rel)) t.rel = 50;
    t.rel = clamp(Math.round(t.rel), 0, 100);
    if (typeof t.cold !== "number") t.cold = 0;
    if (!Array.isArray(t.seen)) t.seen = [];
    if (t.waiting === undefined) t.waiting = null;
    if (t.lastReplyYear === undefined) t.lastReplyYear = null;
    if (t.pending === undefined) t.pending = null;
  }
  return out;
}

function writePhone(s: CareerState, p: PhoneState): void {
  (s as CareerState & { phone?: PhoneState }).phone = p;
}

const yearOf = (s: CareerState): number =>
  s.seasons.length > 0 ? s.seasons[s.seasons.length - 1].year : 2020;

/* ─── threads ────────────────────────────────────────────────────────────── */

function threadFor(p: PhoneState, id: ContactId, s: CareerState): PhoneThread {
  let t = p.threads.find(x => x.c === id);
  if (t) { t.name = contactName(id, s); return t; }
  t = {
    id: `th_${id}`, c: id, name: contactName(id, s), emoji: contactEmoji(id),
    lines: [], rel: 50, pending: null, waiting: null, cold: 0, seen: [], lastReplyYear: null,
  };
  p.threads.push(t);
  return t;
}

function pushLine(t: PhoneThread, who: 0 | 1, text: string, year: number): void {
  if (!text) return;
  t.lines.push({ w: who, t: text, y: year });
  if (t.lines.length > MAX_LINES) t.lines.splice(0, t.lines.length - MAX_LINES);
}

/** Threads are capped. The oldest one with nothing waiting on it goes first. */
function trimThreads(p: PhoneState): void {
  while (p.threads.length > MAX_THREADS) {
    let idx = p.threads.findIndex(t => t.pending === null);
    if (idx === -1) idx = 0;
    p.threads.splice(idx, 1);
  }
}

function convoEligible(def: ConvoDef, s: CareerState, phase: "youth" | "pro", t: PhoneThread | null): boolean {
  if (def.phase !== "any" && def.phase !== phase) return false;
  if (def.minAge !== undefined && s.age < def.minAge) return false;
  if (def.maxAge !== undefined && s.age > def.maxAge) return false;
  if (!contactAvailable(def.contact, s, phase)) return false;
  if (def.needs && !def.needs(s)) return false;
  if (t && t.seen.includes(def.id)) return false;
  return true;
}

/** Convos this contact has left, in this state, that the player could open. */
export function starterConvos(s: CareerState, id: ContactId, phase: "youth" | "pro"): ConvoDef[] {
  const p = ensurePhone(s);
  const t = p.threads.find(x => x.c === id) ?? null;
  return CONVOS.filter(d => d.contact === id && d.starter && convoEligible(d, s, phase, t));
}

function startConvo(t: PhoneThread, def: ConvoDef, year: number, override?: string): void {
  t.seen.push(def.id);
  if (t.seen.length > MAX_SEEN) t.seen.splice(0, t.seen.length - MAX_SEEN);
  pushLine(t, 0, override ?? def.beats[0].text, year);
  t.pending = { kind: "convo", convo: def.id, beat: 0 };
  t.waiting = year;
}

/* ─── the reply options currently on offer ───────────────────────────────── */

export interface ReplyOption { label: string; idx: number }

/**
 * What the player can tap in this thread right now. Three shapes:
 *  - a cooled contact who is owed an apology gets the repair set
 *  - a live convo beat gets that beat's presets
 *  - a legacy Round 80 text gets its original choices, so an old save's
 *    unanswered messages never become unanswerable
 */
export function threadReplies(s: CareerState, t: PhoneThread): PhoneReplyDef[] {
  if (!t.pending) return [];
  if (t.pending.kind === "legacy") {
    const msg = (s.phoneInbox ?? []).find(m => m.id === (t.pending as { msgId: string }).msgId);
    if (!msg || msg.answered !== undefined) return [];
    return msg.choices.map(c => ({
      label: c.label,
      say: c.reply || "(left on read)",
      back: "",
      warm: c.karma >= 5 ? 8 : c.karma <= -5 ? -6 : 2,
      karma: c.karma, morale: c.morale, popularity: c.popularity, cash: c.cash,
    }));
  }
  if (t.cold >= 1 && t.lines.length > 0 && t.lines[t.lines.length - 1].w === 0 && isColdNudge(t)) {
    return REPAIR;
  }
  const def = CONVO_BY_ID[t.pending.convo];
  if (!def) return [];
  const beat = def.beats[t.pending.beat];
  return beat ? beat.replies : [];
}

/** A thread whose last incoming line was a cold nudge rather than a convo beat. */
function isColdNudge(t: PhoneThread): boolean {
  const last = t.lines[t.lines.length - 1];
  if (!last) return false;
  return COLD_WARM.concat(COLD_WORK).some(stage => stage.includes(last.t));
}

/* ─── perks: the real thing you get back for messaging ───────────────────── */

const STAT_FOR_POS = (pos: string): "shooting" | "passing" | "defending" | "reflexes" | "pace" =>
  pos === "GK" ? "reflexes" :
  ["ST", "LW", "RW", "CAM"].includes(pos) ? "shooting" :
  ["CM", "CDM"].includes(pos) ? "passing" : "defending";

function applyPerk(s: CareerState, p: PhoneState, perk: PerkId): string | null {
  switch (perk) {
    case "sharp": {
      if (p.perksTaken >= MAX_PERKS) return null;
      p.perksTaken += 1;
      const stat = STAT_FOR_POS(s.position);
      s.statBoostNextSeason = { ...s.statBoostNextSeason, [stat]: (s.statBoostNextSeason[stat] || 0) + 1 };
      return "That conversation is worth a point of sharpness next season.";
    }
    case "lift": {
      if (p.perksTaken >= MAX_PERKS) return null;
      p.perksTaken += 1;
      s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) + 1 };
      s.morale = clamp(s.morale + 4, 0, 100);
      return "The dressing room feels lighter for it.";
    }
    case "offer": {
      p.offers = Math.min(3, p.offers + 1);
      return "Your agent goes away with something to work on.";
    }
    case "spotlight":
      s.popularity = clamp(s.popularity + 4, 0, 100);
      return null;
    case "needle":
      s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + 8, 0, 100);
      return null;
    case "calm":
      s.morale = clamp(s.morale + 6, 0, 100);
      return null;
  }
  return null;
}

/** Extra contract offers the agent has drummed up. Consumed by the engine. */
export function takePhoneOffers(s: CareerState): number {
  const p = ensurePhone(s);
  const n = p.offers;
  if (n > 0) { p.offers = 0; writePhone(s, p); }
  return n;
}

/* ─── what one season of conversation is allowed to be worth ───────────────
   A Round 80 season handed you at most two texts. A Round 130 season can hand
   you a dozen taps, and without a ceiling the same per reply numbers would
   quietly turn the phone into the strongest button in the game: karma pinned
   at 100 by February, popularity climbing forever, morale on the rail. So
   karma, popularity and morale from conversations run off a season budget.
   Everything past the budget still reads the same in the thread, it just does
   not move the needle again until next season. */
const BUDGET = { k: 4, p: 1, m: 6 };

/* Above this, being nice on a phone is not what is making you famous. */
const POP_FROM_PHONE_MAX = 88;

function spend(p: PhoneState, year: number, kind: "k" | "p" | "m", want: number): number {
  if (p.bYear !== year) { p.bYear = year; p.bK = 0; p.bP = 0; p.bM = 0; }
  const used = kind === "k" ? (p.bK ?? 0) : kind === "p" ? (p.bP ?? 0) : (p.bM ?? 0);
  const room = Math.max(0, BUDGET[kind] - used);
  const give = Math.sign(want) * Math.min(Math.abs(want), room);
  const spent = Math.abs(give);
  if (kind === "k") p.bK = used + spent;
  else if (kind === "p") p.bP = used + spent;
  else p.bM = used + spent;
  return give;
}

/* ─── the single write path ──────────────────────────────────────────────── */

export interface ReplyOutcome {
  /** false when the id did not match anything, so the caller can no op. */
  ok: boolean;
  /** A line for the season events feed, when the reply earned one. */
  event: string | null;
  /** Legacy message that must go through the Round 80 karma path instead. */
  legacyMsgId?: string;
  legacyChoiceIdx?: number;
}

/**
 * Apply one tap in the Messages app. Mutates the career copy the engine hands
 * over. Every branch here either advances a conversation or repairs a cooled
 * one, and in both cases THE OTHER PERSON ANSWERS, which is the whole round.
 */
export function phoneReply(s: CareerState, threadId: string, idx: number, phase: "youth" | "pro"): ReplyOutcome {
  const p = ensurePhone(s);
  const t = p.threads.find(x => x.id === threadId);
  if (!t || !t.pending) return { ok: false, event: null };
  const year = yearOf(s);
  const opts = threadReplies(s, t);
  const choice = opts[idx];
  if (!choice) return { ok: false, event: null };

  // A legacy Round 80 text keeps its original karma effects, applied by the
  // engine, and THEN becomes a real conversation instead of a dead end.
  if (t.pending.kind === "legacy") {
    const msgId = t.pending.msgId;
    pushLine(t, 1, choice.say, year);
    t.rel = clamp(t.rel + (choice.warm ?? 6), 0, 100);
    t.cold = 0;
    t.waiting = null;
    t.pending = null;
    t.lastReplyYear = year;
    const rng = new Rng(p.seed);
    const follow = pickConvo(s, p, t, phase);
    if (follow) {
      startConvo(t, follow, year);
    } else {
      // A one off sender has no follow up conversation, but they still answer,
      // because being left on read forever was the whole complaint.
      pushLine(t, 0, signOff(choice.karma ?? 0, rng), year);
      p.seed = rng.state;
    }
    trimThreads(p);
    writePhone(s, p);
    return { ok: true, event: null, legacyMsgId: msgId, legacyChoiceIdx: idx };
  }

  const wasRepair = opts === REPAIR;
  pushLine(t, 1, choice.say, year);
  if (choice.back) pushLine(t, 0, choice.back, year);
  t.rel = clamp(t.rel + (choice.warm ?? 6), 0, 100);
  t.cold = 0;
  t.lastReplyYear = year;
  t.waiting = null;

  if (choice.karma) s.karma = clamp((s.karma ?? 50) + spend(p, year, "k", choice.karma), 0, 100);
  if (choice.morale) s.morale = clamp(s.morale + spend(p, year, "m", choice.morale), 0, 100);
  if (choice.popularity && (choice.popularity < 0 || s.popularity < POP_FROM_PHONE_MAX)) {
    s.popularity = clamp(s.popularity + spend(p, year, "p", choice.popularity), 0, 100);
  }
  if (choice.cash) s.netWorth = Math.round((s.netWorth + choice.cash) * 100) / 100;

  let note: string | null = null;
  if (choice.perk) note = applyPerk(s, p, choice.perk);

  if (wasRepair) {
    // Saying sorry puts the conversation back where it was, so the thread
    // carries on instead of restarting from nothing.
    const def = CONVO_BY_ID[t.pending.convo];
    const beat = def?.beats[t.pending.beat];
    if (beat) { pushLine(t, 0, beat.text, year); t.waiting = year; }
    else { t.pending = null; }
  } else {
    const def = CONVO_BY_ID[t.pending.convo];
    const nextIdx = t.pending.beat + 1;
    const nextBeat = def?.beats[nextIdx];
    if (nextBeat) {
      pushLine(t, 0, choice.nextText ?? nextBeat.text, year);
      t.pending = { kind: "convo", convo: def.id, beat: nextIdx };
      t.waiting = year;
    } else {
      t.pending = null;
    }
  }

  trimThreads(p);
  writePhone(s, p);
  const ev = `📱 ${t.name}: ${choice.label}.${note ? " " + note : ""}`;
  return { ok: true, event: ev };
}

/** What you send when YOU are the one starting it. */
const OPENERS = [
  "You about?",
  "Hey. You free for a bit?",
  "Got a minute?",
  "You there?",
  "Was thinking about you actually.",
];

/** Open a conversation yourself, from the Contacts list. */
export function phoneOpen(s: CareerState, contactId: string, phase: "youth" | "pro", convoIdx = 0): ReplyOutcome {
  const id = contactId as ContactId;
  if (!CONTACT_BY_ID[id]) return { ok: false, event: null };
  if (!contactAvailable(id, s, phase)) return { ok: false, event: null };
  const p = ensurePhone(s);
  const t = threadFor(p, id, s);
  if (t.pending) return { ok: false, event: null }; // already mid conversation
  const options = starterConvos(s, id, phase);
  const def = options[convoIdx] ?? options[0];
  if (!def) return { ok: false, event: null };
  const year = yearOf(s);
  const rng = new Rng(p.seed);
  pushLine(t, 1, OPENERS[rng.int(0, OPENERS.length - 1)], year);
  p.seed = rng.state;
  startConvo(t, def, year);
  trimThreads(p);
  writePhone(s, p);
  return { ok: true, event: null };
}

/* ─── who gets in touch, and who gets cold ───────────────────────────────── */

function pickConvo(s: CareerState, p: PhoneState, t: PhoneThread, phase: "youth" | "pro"): ConvoDef | null {
  const rng = new Rng(p.seed);
  const fits = CONVOS.filter(d => d.contact === t.c && convoEligible(d, s, phase, t));
  p.seed = rng.state;
  if (fits.length === 0) return null;
  return fits[Math.floor(rng.next() * fits.length)];
}

/**
 * Between seasons. Three jobs, in this order: punish silence, let the standing
 * move morale and popularity, and start a couple of new conversations.
 */
export function phoneSeasonTick(s: CareerState, phase: "youth" | "pro"): void {
  const p = ensurePhone(s);
  const year = yearOf(s);
  const rng = new Rng(p.seed || (Math.floor(Math.random() * 4294967295) >>> 0) || 7);

  /* 1. Silence costs you. A thread still waiting on a reply from a previous
        season cools, and the next thing they send is colder than the last.
        The bite shrinks each time and stops after three, because a person who
        has given up on you stops texting rather than getting angrier forever,
        and because a career of never opening the phone should be a worse
        career, not a broken one. */
  const BITE = [14, 9, 5];
  for (const t of p.threads) {
    if (t.pending && t.waiting !== null && t.waiting < year) {
      if (t.cold >= 3) { t.waiting = year; continue; }
      t.cold = Math.min(3, t.cold + 1);
      t.rel = clamp(t.rel - BITE[t.cold - 1], REL_FLOOR, 100);
      const table = WARM_CONTACTS.includes(t.c) ? COLD_WARM : COLD_WORK;
      const stage = table[Math.min(t.cold, table.length) - 1];
      pushLine(t, 0, stage[rng.int(0, stage.length - 1)], year);
      t.waiting = year;
    }
  }

  /* 2. Standing moves the things a phone should move, and both directions are
        pulled toward a level rather than added up season after season. That
        matters: an additive nudge over twenty seasons ends at a rail, so a
        player who never opens the phone would finish on zero morale and no
        followers, which is not a cost, it is a punishment. */
  const standing = standingOf(p);
  if (p.threads.length > 0) {
    /* Down only from a comfortable place, never into a hole. A player whose
       morale is already on the floor for football reasons does not get kicked
       again for not texting his agent back, and a player who never opens the
       phone finishes a WORSE career, not a broken one. */
    const ceiling = 56 + Math.round(standing * 0.38); // standing 78 -> 86
    if (standing < 42 && s.morale > 46) s.morale = clamp(Math.max(46, s.morale - 3), 0, 100);
    else if (standing > 60 && s.morale < ceiling) s.morale = clamp(Math.min(ceiling, s.morale + 3), 0, 100);
    /* Popularity the same way, and the band is deliberately narrow: 40 to 70.
       Trophies and goals are what make you famous, and sponsorship money keys
       off popularity, so if the phone could push past 70 it would quietly
       become the best paid button in the game. It cannot. */
    if (standing >= 70 && s.popularity < 70) s.popularity = clamp(s.popularity + 1, 0, 100);
    else if (standing <= 30 && s.popularity > 40) s.popularity = clamp(s.popularity - 1, 0, 100);
  }

  /* 3. New conversations. Up to two threads waiting at once, so the inbox
        never turns into a chore. */
  const waitingNow = p.threads.filter(t => t.pending !== null).length;
  let want = Math.max(0, 2 - waitingNow);
  const candidates = CONTACTS
    .map(c => c.id)
    .filter(id => contactAvailable(id, s, phase))
    .filter(id => {
      const t = p.threads.find(x => x.c === id);
      return !t || t.pending === null;
    });
  // Shuffle without touching the global random stream.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  for (const id of candidates) {
    if (want <= 0) break;
    const t = threadFor(p, id, s);
    const def = pickConvo(s, p, t, phase);
    if (!def) { if (t.lines.length === 0) p.threads = p.threads.filter(x => x !== t); continue; }
    startConvo(t, def, year);
    want -= 1;
  }

  p.seed = rng.state;
  trimThreads(p);
  writePhone(s, p);
}

/** Map a Round 80 sender onto a regular contact, or null for a one off. */
function legacyContact(from: string): ContactId | null {
  const f = from.toLowerCase();
  if (f.includes("mum")) return "mum";
  if (f.includes("grandad")) return "grandad";
  if (f.includes("agent")) return "agent";
  if (f.includes("kit man")) return "kitman";
  if (f.includes("journal")) return "journo";
  if (f.includes("youth coach")) return "youthcoach";
  if (f.includes("academy")) return "academy";
  if (f.includes("captain") || f.includes("veteran")) return "captain";
  if (f.includes("physio") || f.includes("psych") || f.includes("nutrition")) return "physio";
  if (f.includes("fitness")) return "fitness";
  if (f.includes("teammate")) return "roomie";
  if (f.includes("rival")) return "rival";
  if (f.includes("school friend")) return "bestmate";
  return null;
}

const SIGNOFF_WARM = [
  "Knew you would. Cheers.",
  "You did not have to do that. Means a lot.",
  "That is why people rate you, you know.",
  "Proper answer. Thank you.",
];
const SIGNOFF_COLD = [
  "Right. Understood.",
  "Ok. Forget I asked.",
  "Fair enough I suppose.",
  "Noted. Will not bother you again.",
];
const SIGNOFF_FLAT = [
  "Appreciate you getting back to me.",
  "Fair enough. Good luck Saturday.",
  "Cheers for the reply.",
];

/** The one line a one off sender comes back with, shaped by what you said. */
function signOff(karma: number, rng: Rng): string {
  const table = karma >= 5 ? SIGNOFF_WARM : karma <= -5 ? SIGNOFF_COLD : SIGNOFF_FLAT;
  return table[rng.int(0, table.length - 1)];
}

const slug = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 14) || "x";

/**
 * Mirror a Round 80 text into the thread list so it is answerable there, and
 * so it becomes the FIRST line of a conversation rather than the only one.
 */
export function mirrorLegacyMessage(s: CareerState, msgId: string, from: string, text: string, year: number): void {
  const p = ensurePhone(s);
  const id = legacyContact(from);
  let t: PhoneThread;
  if (id) {
    t = threadFor(p, id, s);
  } else {
    const tid = `th_x_${slug(from)}`;
    const found = p.threads.find(x => x.id === tid);
    if (found) t = found;
    else {
      t = { id: tid, c: "other", name: from, emoji: "💬", lines: [], rel: 50, pending: null, waiting: null, cold: 0, seen: [], lastReplyYear: null };
      p.threads.push(t);
    }
  }
  if (t.pending) return; // do not stack two prompts on one person
  pushLine(t, 0, text, year);
  t.pending = { kind: "legacy", msgId };
  t.waiting = year;
  trimThreads(p);
  writePhone(s, p);
}

/* ─── standing: the number the rest of the game reads ────────────────────── */

function standingOf(p: PhoneState): number {
  if (p.threads.length === 0) return 50;
  const sum = p.threads.reduce((a, t) => a + t.rel, 0);
  return Math.round(sum / p.threads.length);
}

/** 0 to 100. 50 when the phone has never been touched. */
export function phoneStanding(s: CareerState): number {
  return standingOf(ensurePhone(s));
}

export function standingLabel(v: number): { label: string; color: string; emoji: string } {
  if (v >= 78) return { label: "People have your back", color: "text-emerald-400", emoji: "🫶" };
  if (v >= 62) return { label: "In touch", color: "text-sky-400", emoji: "🙂" };
  if (v >= 45) return { label: "Drifting", color: "text-white/60", emoji: "😐" };
  if (v >= 28) return { label: "Going cold", color: "text-amber-400", emoji: "🥶" };
  return { label: "Nobody hears from you", color: "text-red-400", emoji: "💔" };
}

/** How many league appearances the dressing room is worth. Deliberately tiny:
 *  three out of about thirty at the very extremes, and nothing in the middle. */
export function phoneAppsSwing(s: CareerState): number {
  const p = (s as CareerState & { phone?: PhoneState }).phone;
  if (!p || !Array.isArray(p.threads) || p.threads.length === 0) return 0;
  const v = standingOf(p);
  if (v >= 76) return 3;
  if (v >= 64) return 2;
  if (v <= 24) return -3;
  if (v <= 36) return -2;
  return 0;
}

/** Threads with something waiting on you. Drives the red badge. */
export function unreadThreads(s: CareerState): number {
  const p = ensurePhone(s);
  const held = new Set(p.threads.map(t => (t.pending?.kind === "legacy" ? t.pending.msgId : "")));
  const orphans = (s.phoneInbox ?? []).filter(m => m.answered === undefined && !held.has(m.id)).length;
  return p.threads.filter(t => t.pending !== null).length + orphans;
}

/* ─── the wider world, and the feed that reports it ───────────────────────
   Everything below writes to ONE record per season and the feed is rendered
   from that record and nothing else. If a line says a striker moved, he moved
   in PhoneState.clubs, which is the same map the Ballon d'Or screen reads. */

const ATTACKING = ["ST", "LW", "RW", "CAM"];

/* Past this the era pools run out of people who could plausibly still be
   playing, so the world generates its own names, exactly like the Ballon d'Or
   already does past 2032. Nobody real gets a fictional future. */
const LAST_REAL_YEAR = 2032;

function leagueOfClub(club: string, leagues: Record<string, string[]>): string | null {
  for (const [name, clubs] of Object.entries(leagues)) if (clubs.includes(club)) return name;
  return null;
}

/** "the Premier League" but "La Liga". Small thing, reads wrong otherwise. */
function leaguePhrase(name: string): string {
  return /^(la |serie |ligue |eredivisie|primeira|liga )/i.test(name) ? name : `the ${name}`;
}

/** Keep the who plays where map from growing for the length of a career. */
function pruneClubs(p: PhoneState): void {
  const keys = Object.keys(p.clubs);
  if (keys.length <= MAX_WORLD_NAMES) return;
  const drop = keys.slice(0, keys.length - MAX_WORLD_NAMES);
  for (const k of drop) delete p.clubs[k];
}

/** Where a real name plays in THIS sim. Null when the sim has no opinion. */
export function worldClubOf(s: CareerState, name: string): string | null {
  const p = (s as CareerState & { phone?: PhoneState }).phone;
  if (!p || !p.clubs) return null;
  return p.clubs[name] ?? null;
}

/**
 * Run one season of the wider world and write the feed. Called at season end,
 * before the Ballon d'Or is calculated, so the two agree about who won what.
 */
export function worldSeasonTick(
  s: CareerState,
  opts: { year: number; playerLeagueTitle: boolean; playerUcl: boolean; playerCup?: boolean },
): WorldSeason {
  const p = ensurePhone(s);
  const rng = new Rng(p.seed || (Math.floor(Math.random() * 4294967295) >>> 0) || 11);
  const { year } = opts;
  const topClubs = getEraTopClubs(year);
  const leagues = getEraLeagueClubs(year);
  const allClubs = Array.from(new Set([...topClubs, ...Object.values(leagues).flat()]));
  const realNames = year <= LAST_REAL_YEAR;
  let stars: { name: string; position: string; club: string; baseGoals: [number, number]; power: number }[];
  if (realNames) {
    stars = getEraStars(year).map(st => ({ ...st, baseGoals: st.baseGoals as [number, number] }));
  } else {
    /* Generated names can collide, and two entries for one person would let
       the feed report him joining two clubs in the same window. Dedupe. */
    const seen = new Set<string>();
    stars = [];
    for (let i = 0; i < 14 && stars.length < 8; i++) {
      const name = getEraRivalName(year);
      if (seen.has(name)) continue;
      seen.add(name);
      stars.push({
        name,
        position: rng.next() < 0.45 ? "ST" : "CM",
        club: allClubs[Math.floor(rng.next() * allClubs.length)],
        baseGoals: [10, 26],
        power: rng.int(4, 9),
      });
    }
  }

  // Seed anybody new into the map at their era club, then let the map rule.
  for (const st of stars) if (!p.clubs[st.name]) p.clubs[st.name] = st.club;

  /* Transfers. Two to four of the era's names change clubs, and this map is
     the only place the answer lives, so nothing can contradict it later. */
  const moves: WorldMove[] = [];
  const movers = stars.slice();
  for (let i = movers.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [movers[i], movers[j]] = [movers[j], movers[i]];
  }
  const wanted = rng.int(2, 4);
  const movedAlready = new Set<string>();
  for (const st of movers) {
    if (moves.length >= wanted) break;
    if (movedAlready.has(st.name)) continue;
    movedAlready.add(st.name);
    const from = p.clubs[st.name];
    if (!from) continue;
    const pool = rng.next() < 0.6 ? topClubs : allClubs;
    const dests = pool.filter(c => c !== from && c !== s.currentClub);
    if (dests.length === 0) continue;
    const to = dests[Math.floor(rng.next() * dests.length)];
    const fee = Math.round((22 + st.power * 7 + rng.int(0, 34)) / 5) * 5;
    p.clubs[st.name] = to;
    moves.push({ who: st.name, from, to, fee });
  }

  /* League champions, domestic cups and the Champions League. Uniform over
     the era's title contenders, which is exactly what the Ballon d'Or used to
     do inline.

     ROUND 292: THE PLAYER'S OWN SEASON WINS EVERY ARGUMENT, IN BOTH DIRECTIONS.
     Before this round a player at Real Madrid whose season card said no league
     title could still open the ceremony to find Real Madrid crowned champions
     of Europe or Spain, because the draw below did not know to look away from
     his club; and no cup winner existed at all, so the ceremony rolled a
     private 15% "Cup" for every nominee. Two people reported the shape of it
     from the footer button. Now: if the player won it, his club is the winner;
     if he did not, his club cannot be drawn as the winner. */
  const notMine = (clubs: string[], won: boolean): string[] => {
    if (won) return [s.currentClub];
    const rest = clubs.filter(c => c !== s.currentClub);
    return rest.length ? rest : clubs;
  };
  const draw = (clubs: string[]): string => clubs[Math.floor(rng.next() * clubs.length)];
  const leagueWinners: Record<string, string> = {};
  const cupWinners: Record<string, string> = {};
  for (const [name, clubs] of Object.entries(leagues)) {
    const mine = name === s.currentLeague;
    leagueWinners[name] = draw(mine ? notMine(clubs, opts.playerLeagueTitle) : clubs);
    cupWinners[name] = draw(mine ? notMine(clubs, !!opts.playerCup) : clubs);
  }
  const ucl = draw(notMine(topClubs, opts.playerUcl));

  /* Top scorer: one of the era's forwards, at whatever club he plays for in
     THIS sim, with a goal count inside his own range. */
  const forwards = stars.filter(st => ATTACKING.includes(st.position));
  let topScorer: WorldSeason["topScorer"] = null;
  if (forwards.length > 0) {
    const st = forwards[Math.floor(rng.next() * forwards.length)];
    const club = p.clubs[st.name] ?? st.club;
    const goals = rng.int(st.baseGoals[0], st.baseGoals[1]);
    topScorer = { who: st.name, club, goals, league: leagueOfClub(club, leagues) ?? "the league" };
  }

  const t = s.lastTournament;
  const intl = t && t.year === year && t.champion
    ? { name: t.name, champion: t.champion }
    : null;

  const world: WorldSeason = { year, ucl, leagues: leagueWinners, cups: cupWinners, moves, topScorer, intl };
  p.world = world;

  /* Feed lines. Every one of them is read straight off `world`. */
  const items: string[] = [];
  for (const m of moves) {
    items.push(`🔄 DONE DEAL. ${m.who} joins ${m.to} from ${m.from}. Fee around ${m.fee}m.`);
  }
  if (s.rival && !s.rival.retired && p.rivalClub && p.rivalClub !== s.rival.club) {
    items.push(`🔄 ${s.rival.name} has left ${p.rivalClub} for ${s.rival.club}.`);
  }
  if (ucl !== s.currentClub) items.push(`⭐ ${ucl} are champions of Europe.`);
  const titles = Object.entries(leagueWinners).filter(([, club]) => club !== s.currentClub);
  for (const [lg, club] of titles.slice(0, 2)) {
    items.push(`🏆 ${club} win ${leaguePhrase(lg)}.`);
  }
  if (topScorer && topScorer.club !== s.currentClub) {
    const where = topScorer.league === "the league" ? "his league" : leaguePhrase(topScorer.league);
    items.push(`🥅 ${topScorer.who} finished top scorer in ${where} on ${topScorer.goals}.`);
  }
  if (intl) items.push(`🌍 ${intl.champion} win the ${intl.name}.`);

  p.feed = [...p.feed, ...items].slice(-MAX_FEED);
  p.rivalClub = s.rival && !s.rival.retired ? s.rival.club : null;
  p.seed = rng.state;
  pruneClubs(p);
  writePhone(s, p);
  return world;
}

/** The feed, newest first, ready to print. */
export function phoneFeed(s: CareerState): string[] {
  return ensurePhone(s).feed.slice().reverse();
}

/** The season the feed is describing, so a check can hold it to account. */
export function phoneWorld(s: CareerState): WorldSeason | null {
  return ensurePhone(s).world;
}

/** Threads in the order the Messages app should list them. */
export function phoneThreads(s: CareerState): PhoneThread[] {
  const p = ensurePhone(s);
  return p.threads
    .filter(t => t.lines.length > 0)
    .slice()
    .sort((a, b) => {
      const aw = a.pending ? 1 : 0, bw = b.pending ? 1 : 0;
      if (aw !== bw) return bw - aw;
      const ay = a.lines[a.lines.length - 1]?.y ?? 0;
      const by = b.lines[b.lines.length - 1]?.y ?? 0;
      return by - ay;
    });
}

/** Relationship word for a single thread, used on the thread header. */
export function relLabel(v: number): string {
  if (v >= 80) return "Close";
  if (v >= 62) return "Good";
  if (v >= 45) return "Fine";
  if (v >= 28) return "Cooling";
  return "Cold";
}
