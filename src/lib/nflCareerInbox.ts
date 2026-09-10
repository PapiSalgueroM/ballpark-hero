/* ─── Round 521: the NFL career's inbox ──────────────────────────────────────

   His 2026-08-28 backlog still marks the Soccer Career depth gap open for
   the NFL career on two items: interactive rivalry events, and an inbox.
   This file is the second one: texts arrive between seasons the same way
   they always have on the flagship's phone, on the engine careerInbox.ts
   lifted from it, bound to the NFL the same way nflCareerMoney.ts binds the
   bank. Nothing below is a rule, it is data: the message bank, and four
   small closures saying which of the NFL save's own fields the mood meter
   and the standing meter actually are. scripts/simCareerInbox.mjs fails if
   this file grows a rule of its own.

   Mood meter: a fresh `karma` field, the exact same 0-100 neutral-50 meter
   the flagship's phone already runs, absent on any save from before this
   round and repaired lazily the same way ensureNflMoney repairs the bank.
   Standing meter: the fanbase the hub already shows, so a good reply and a
   bad one land somewhere the player can already see.

   LEGAL SHAPE. Every "from" below is a role (Mom, Agent, a teammate, a
   reporter), never a name, and nothing here ever speaks as the rival: the
   rival's own voice lives only in nflCareerRivalryEvents.ts, narrated rather
   than quoted, the same rule the flagship's texts already follow. */

import type { CareerState } from "./nflMyCareer";
import {
  receiveInboxTexts as receiveInboxTextsFor,
  answerInboxMessage as answerInboxMessageFor,
  unreadInboxCount as unreadInboxCountFor,
} from "./careerInbox";
import type { InboxSport, InboxMessageDef, InboxMessage } from "./careerInbox";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/* The bank. Twenty two templates, every one gated on the role writing it
   rather than a name, and every choice's effect small on purpose: this is
   flavor and a mood meter, never a lever worth grinding. Ages are the
   career's own age field, which starts at 22 on draft night. */
const NFL_INBOX_POOL: InboxMessageDef[] = [
  {
    id: "mom_call", from: "Mom", emoji: "❤️", phase: "any",
    text: "Haven't heard from you in a while sweetheart. Everything okay out there? Call me when you get a second.",
    choices: [
      { label: "Call her tonight", reply: "Calling you right after the walkthrough, promise. Love you", karma: 8, morale: 6 },
      { label: "Leave it on read", reply: "", karma: -6, morale: -2 },
    ],
  },
  {
    id: "kid_dm", from: "Fan DM", emoji: "🧒", phase: "any",
    text: "you're my favorite player ever. im in the hospital and all i want is a signed jersey. no worries if youre busy",
    choices: [
      { label: "Send a signed jersey and visit", reply: "Jersey is on the way and I'm coming to see you next week. Stay strong", karma: 12, popularity: 6, cash: -0.1 },
      { label: "Send the jersey", reply: "On its way little legend", karma: 6, popularity: 3 },
      { label: "Ignore it", reply: "", karma: -8 },
    ],
  },
  {
    id: "agent_cleats", from: "Agent", emoji: "💼", phase: "any",
    text: "Cleat deal on the table. Good money, but the brand got caught running sweatshops last year. Your call.",
    choices: [
      { label: "Take the money", reply: "Money is money. Send the contract", karma: -7, cash: 1.2 },
      { label: "Turn it down publicly", reply: "Not wearing that. And I'm saying why", karma: 9, popularity: 4 },
      { label: "Quietly decline", reply: "Pass on this one. Keep it quiet", karma: 4 },
    ],
  },
  {
    id: "teammate_buried", from: "Teammate", emoji: "😤", phase: "any",
    text: "Coach has me buried on the depth chart again man. Thinking about asking for a trade. What would you do?",
    choices: [
      { label: "Be honest with him", reply: "You deserve snaps mate. If he won't give them, go get them somewhere", karma: 6, morale: 2 },
      { label: "Tell him to stop whining", reply: "Outwork him then. Nobody owes you a jersey", karma: -5 },
      { label: "Dodge the question", reply: "Tough one bro. Sleep on it", karma: -1 },
    ],
  },
  {
    id: "granny_scam", from: "Unknown", emoji: "🎣", phase: "any",
    text: "CONGRATULATIONS! You've won 2 MILLION DOLLARS. Just send your account info plus a small release fee to claim it.",
    choices: [
      { label: "Report and warn fans", reply: "Posting this so nobody falls for it. Stay safe out there", karma: 7, popularity: 3 },
      { label: "Delete it", reply: "", karma: 1 },
      { label: "Reply as a joke", reply: "Amazing news!! My account number is 1-2-3-GET-A-JOB", karma: 2, popularity: 2 },
    ],
  },
  {
    id: "equipment_fine", from: "Equipment manager", emoji: "🧺", phase: "any",
    text: "You left your road pads at the hotel again. Team wants to fine you. I can cover for you this once.",
    choices: [
      { label: "Own it, pay the fine", reply: "My fault Tony. I'll pay it. Lunch is on me too", karma: 7, cash: -0.05 },
      { label: "Let him cover for you", reply: "You're a legend. I owe you", karma: -5, morale: 2 },
    ],
  },
  {
    id: "charity_gala", from: "Foundation", emoji: "🎗️", phase: "any", minAge: 23,
    text: "We're hosting a children's hospital fundraiser Friday. Would mean the world if you came. Press will be there.",
    choices: [
      { label: "Go and donate", reply: "Count me in. And put me down for a donation", karma: 10, popularity: 5, cash: -0.5 },
      { label: "Go for the cameras only", reply: "I'll swing by for an hour", karma: 2, popularity: 3 },
      { label: "Skip it", reply: "Can't make it, good luck", karma: -6 },
    ],
  },
  {
    id: "old_coach", from: "High school coach", emoji: "👴", phase: "any",
    text: "Watched you on TV Sunday. Still remember you at 14 refusing to run the route we called. Proud of you kid.",
    choices: [
      { label: "Thank him properly", reply: "Everything started with you coach. Tickets for you whenever you want, for life", karma: 8, morale: 5 },
      { label: "Thumbs up emoji", reply: "👍", karma: -3 },
    ],
  },
  {
    id: "bye_week_party", from: "Promoter", emoji: "🎉", phase: "any", minAge: 23,
    text: "Biggest party of the year tonight. Table's got your name on it. Bye week starts tomorrow btw.",
    choices: [
      { label: "Stay home and rest", reply: "Rest week for a reason. Another time", karma: 6, morale: 2 },
      { label: "Go but leave early", reply: "One hour max, then I'm gone", karma: -3, popularity: 2 },
      { label: "Full send", reply: "Save me the good table", karma: -9, popularity: 4, morale: 3 },
    ],
  },
  {
    id: "rookie_advice", from: "Rookie", emoji: "🌱", phase: "any", maxAge: 30,
    text: "Just got the locker next to yours. Any advice? Honestly kind of terrified.",
    choices: [
      { label: "Take him under your wing", reply: "Come in early tomorrow, we'll watch extra film together. You'll be fine", karma: 9, morale: 3 },
      { label: "One line of advice", reply: "Learn the playbook before you learn the city. Rest follows", karma: 4 },
      { label: "Big time him", reply: "Earn it like I did", karma: -7 },
    ],
  },
  {
    id: "journalist_leak", from: "Reporter", emoji: "📰", phase: "any",
    text: "I know the locker room turned on the coordinator. Give me the inside story, you stay anonymous.",
    choices: [
      { label: "Keep it in house", reply: "Nothing to tell. Locker room stays in the locker room", karma: 8, morale: 2 },
      { label: "Leak it", reply: "Ok but this NEVER came from me", karma: -10, popularity: 3 },
    ],
  },
  {
    id: "lost_wallet", from: "Stadium worker", emoji: "👛", phase: "any",
    text: "Found a wallet in the players' lot with 800 bucks in it. No ID. What do I do with it?",
    choices: [
      { label: "Hand it to security", reply: "Security, mate. Someone's having a bad day", karma: 6 },
      { label: "Finders keepers", reply: "That's the football gods paying you. Keep it", karma: -6 },
    ],
  },
  {
    id: "crypto_bro", from: "College roommate", emoji: "🪙", phase: "any", minAge: 23,
    text: "Bro I need you to shout out my new coin BallerCoin to your followers. Guaranteed 100x. Family discount.",
    choices: [
      { label: "Hard pass", reply: "Not putting my fans into that. Look after yourself", karma: 7 },
      { label: "Promote it", reply: "Sending the post now. We better get rich", karma: -11, cash: 0.8, popularity: -3 },
    ],
  },
  {
    id: "training_extra", from: "Strength coach", emoji: "🏋️", phase: "any",
    text: "Optional 6am sessions all offseason. Brutal but they work. Half the room is skipping them.",
    choices: [
      { label: "Sign up", reply: "Put my name down. First one in, last one out", karma: 5, morale: -2 },
      { label: "Skip them", reply: "Recovery is part of training too coach", karma: -3, morale: 2 },
    ],
  },
  {
    id: "tax_scheme", from: "Financial advisor", emoji: "🏝️", phase: "any", minAge: 25,
    text: "New structure for your name and image money. Runs through three states with no income tax. Technically legal. Probably.",
    choices: [
      { label: "Keep it clean", reply: "Pay what I owe where I earn it. Not risking my name", karma: 8 },
      { label: "Do the scheme", reply: "If it's legal, file it", karma: -9, cash: 2.0 },
    ],
  },
  {
    id: "injury_teammate", from: "Teammate", emoji: "🏥", phase: "any",
    text: "ACL's gone. Nine months. Sitting in this hospital bed wondering if I'll ever be the same, honestly.",
    choices: [
      { label: "Visit weekly", reply: "I'm there every week bro. Rehab buddies. You're coming back stronger", karma: 10, morale: 2 },
      { label: "Send a message", reply: "Gutted for you. Speedy recovery brother", karma: 3 },
      { label: "Read it later", reply: "", karma: -6 },
    ],
  },
  {
    id: "documentary", from: "Streaming service", emoji: "🎬", phase: "any", minAge: 25,
    text: "All access documentary on your season. Good money. Cameras everywhere, including the bad days.",
    choices: [
      { label: "Do it honestly", reply: "Deal, but you show the real thing, not a highlight reel", karma: 5, popularity: 6, cash: 1.0 },
      { label: "Decline", reply: "Locker room stays sacred. Pass", karma: 3 },
    ],
  },
  {
    id: "podcast_invite", from: "Podcast", emoji: "🎙️", phase: "any", minAge: 24,
    text: "Come on the show. Fans want unfiltered. We will ask about your coach, your contract and your rival.",
    choices: [
      { label: "Go and stay classy", reply: "I'll come on. Keeping team stuff in house though", karma: 5, popularity: 3 },
      { label: "Go and spill everything", reply: "Unfiltered? You'll get unfiltered", karma: -6, popularity: 6 },
      { label: "Decline", reply: "Not my thing, good luck with the show", karma: 1 },
    ],
  },
  {
    id: "hometown_field", from: "Community league", emoji: "🏗️", phase: "any", minAge: 24,
    text: "The field you grew up playing on is closing without funding. Two hundred kids play there every fall.",
    choices: [
      { label: "Fund it and rename it", reply: "I'll cover it. Name it after my old coach, not me", karma: 12, popularity: 5, cash: -1.2 },
      { label: "Fund it quietly", reply: "Send the invoice to my foundation. No press", karma: 10, cash: -1.2 },
      { label: "Share a fundraiser", reply: "Posting the link, let's all chip in", karma: 4, popularity: 1 },
    ],
  },
  {
    id: "barber_cut", from: "Barber", emoji: "💈", phase: "any",
    text: "New look idea for you. Bold. Might break the internet, might get you fined by the head coach. You in?",
    choices: [
      { label: "Send it", reply: "Chair. Tomorrow. Do your worst", karma: 2, popularity: 4 },
      { label: "Keep it classic", reply: "Usual cut mate, big game week", karma: 1 },
    ],
  },
  {
    id: "grandpa_visit", from: "Grandpa", emoji: "🧓", phase: "any",
    text: "Never miss you on Sundays now that I've got the package. Hip's too bad for the stadium these days. Bring the trophy round some day, yeah?",
    choices: [
      { label: "Visit with your jersey", reply: "Coming round Sunday off with a jersey and the game ball. Put the kettle on", karma: 9, morale: 5 },
      { label: "Promise vaguely", reply: "One day grandpa, promise", karma: 1 },
    ],
  },
  {
    id: "referee_apology", from: "League office", emoji: "🟨", phase: "any",
    text: "Your postgame comments about Sunday's officiating went viral. We'd welcome a public clarification.",
    choices: [
      { label: "Apologize properly", reply: "I was out of line. Officials have the hardest job on the field. Apologies", karma: 6, popularity: -1 },
      { label: "Double down", reply: "I said what I said", karma: -7, popularity: 5 },
    ],
  },
];

/** What makes the inbox the NFL one. Data, not rules. */
export const NFL_INBOX: InboxSport<CareerState> = {
  pool: NFL_INBOX_POOL,
  moodOf: c => c.karma ?? 50,
  setMood: (c, v) => { c.karma = v; },
  addPopularity: (c, delta) => { c.fanbase = clamp(c.fanbase + delta, 0, 100); },
  addCash: (c, amount) => { c.netWorth = Math.round(((c.netWorth ?? 0) + amount) * 10) / 10; },
  ageOf: c => c.age,
  yearOf: c => (c.seasons.length > 0 ? c.seasons[c.seasons.length - 1].year : c.year),
  maxInbox: 6,
  wantPerSeason: 2,
};

/** One season of the inbox. NFL has no youth phase, so it always answers
 *  "pro"; every template above is gated "any" or by age rather than phase
 *  for exactly that reason. */
export function receiveNflInboxTexts(c: CareerState, rng: () => number = Math.random): InboxMessage[] {
  return receiveInboxTextsFor(c, "pro", NFL_INBOX, rng);
}

export function nflUnreadInboxCount(c: CareerState): number {
  return unreadInboxCountFor(c);
}

/** Answer one message. Returns the line for the feed, or null when the
 *  message does not exist, is already answered, or the choice is invalid. */
export function answerNflInboxMessage(c: CareerState, msgId: string, choiceIdx: number): string | null {
  return answerInboxMessageFor(c, msgId, choiceIdx, NFL_INBOX);
}
