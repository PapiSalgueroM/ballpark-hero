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

   Round 796: THE NFL CALENDAR. Every text now belongs to a beat of the
   football year (draft night, camp, the bye, the trade deadline, the
   playoffs, the offseason, and the summer before a contract year) and only
   arrives on a season that actually had that beat: no playoff texts in a
   year the team went home in January, no contract year texts with three
   years left on the deal, and draft night's text lands the moment your name
   is called, before a down is played. nflSeasonBeats reads which beats a
   season had straight off the season line the engine already wrote; the
   delivery rule (one a beat, one-offs first, then calendar order) is
   careerInbox.ts's, shared. Three a season now rather than two, because a
   football year has more beats than the flagship's between-seasons phone.
   scripts/simCareerInboxBeats.mjs proves every delivered text arrived on a
   beat its season really had.

   LEGAL SHAPE. Every "from" below is a role (Mom, your agent, the head
   coach, the GM, a teammate, a reporter), never a name, and nothing here
   ever speaks as the rival: the rival's own story lives only in
   nflCareerRivalryEvents.ts, narrated rather than quoted, the same rule the
   flagship's texts already follow. */

import type { CareerState } from "./nflMyCareer";
import {
  receiveInboxTexts as receiveInboxTextsFor,
  deliverInboxTexts as deliverInboxTextsFor,
  answerInboxMessage as answerInboxMessageFor,
  unreadInboxCount as unreadInboxCountFor,
} from "./careerInbox";
import type { InboxSport, InboxMessageDef, InboxMessage, InboxBeat } from "./careerInbox";
import { keyedRng } from "./keyedRng";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Round 796: the football year, in the order it runs. */
export const NFL_CALENDAR: InboxBeat[] = [
  { id: "draft", label: "Draft night", emoji: "🎓", oneOff: true },
  { id: "camp", label: "Training camp", emoji: "🏕️" },
  { id: "bye", label: "Bye week", emoji: "🛋️" },
  { id: "deadline", label: "Trade deadline", emoji: "⏰" },
  { id: "playoffs", label: "Playoffs", emoji: "🏟️", oneOff: true },
  { id: "offseason", label: "Offseason", emoji: "🌴" },
  { id: "contract", label: "Contract year ahead", emoji: "✍️", oneOff: true, ahead: true },
];

/* The bank. Every template is gated on the role writing it rather than a
   name, tagged with the beat it belongs to, and every choice's effect is
   small on purpose: this is flavor and a mood meter, never a lever worth
   grinding. Ages are the career's own age field, which starts at 22 on
   draft night. The ids of the twenty two Round 521 templates are unchanged,
   so a save that already used one never sees it again. */
const NFL_INBOX_POOL: InboxMessageDef[] = [
  /* ── draft night ── */
  {
    id: "draft_agent", from: "Agent", emoji: "💼", phase: "any", beat: "draft",
    text: "Congrats, you're a pro. Two shoe brands and a car dealership already called. Line up the rookie deals now, or wait until you've played a snap?",
    choices: [
      { label: "Sign everything", reply: "Sign it all. Rookie money doesn't last", karma: -3, cash: 0.4, popularity: 2 },
      { label: "Just the shoes", reply: "Shoes only for now. The rest can wait", karma: 1, cash: 0.2 },
      { label: "Wait until I earn it", reply: "Nothing until I've done something on the field", karma: 6, morale: 2 },
    ],
  },
  {
    id: "draft_coach", from: "Head coach", emoji: "🧢", phase: "any", beat: "draft",
    text: "Welcome to the building. Rookies here carry the pads and show up early. Nobody gets handed anything. See you Monday.",
    choices: [
      { label: "Yes coach, see you at six", reply: "Yes coach. I'll be there before the lights are on", karma: 6, morale: 3 },
      { label: "I'm here to start", reply: "Respect coach. I'm not here to sit though", karma: -3, morale: 2, popularity: 2 },
    ],
  },
  {
    id: "draft_mom", from: "Mom", emoji: "❤️", phase: "any", beat: "draft",
    text: "I cried the whole time they said your name. Your little cousins haven't stopped screaming. Come home before camp?",
    choices: [
      { label: "Fly home for the weekend", reply: "Booking it now. Save me a plate", karma: 8, morale: 5, cash: -0.05 },
      { label: "After camp, promise", reply: "After camp mama, I promise. Love you", karma: 1, morale: 1 },
    ],
  },
  {
    id: "draft_college_coach", from: "College coach", emoji: "🎓", phase: "any", beat: "draft",
    text: "Proud of you. Remember who you were on the scout team. Stay hungry, and come back and talk to the young guys sometime.",
    choices: [
      { label: "Send the team new cleats", reply: "Cleats for the whole roster are on me. Tell them I said hi", karma: 9, popularity: 2, cash: -0.1 },
      { label: "Thank him", reply: "Wouldn't be here without you coach. I'll be back", karma: 5, morale: 2 },
      { label: "Thumbs up emoji", reply: "👍", karma: -2 },
    ],
  },
  {
    id: "draft_gm", from: "GM", emoji: "📋", phase: "any", beat: "draft",
    text: "We moved up to get you. A lot of people in this building put their names on that pick. Don't make us look bad.",
    choices: [
      { label: "You won't regret it", reply: "You'll never regret it. Promise", karma: 4, morale: 3 },
      { label: "Then pay me like it", reply: "Then the second contract better reflect it", karma: -5, morale: 1, popularity: 1 },
    ],
  },

  /* ── training camp ── */
  {
    id: "teammate_buried", from: "Teammate", emoji: "😤", phase: "any", beat: "camp",
    text: "Coach has me buried on the depth chart again man. Thinking about asking for a trade. What would you do?",
    choices: [
      { label: "Be honest with him", reply: "You deserve snaps man. If he won't give them, go get them somewhere", karma: 6, morale: 2 },
      { label: "Tell him to stop whining", reply: "Outwork him then. Nobody owes you a jersey", karma: -5 },
      { label: "Dodge the question", reply: "Tough one bro. Sleep on it", karma: -1 },
    ],
  },
  {
    id: "rookie_advice", from: "Rookie", emoji: "🌱", phase: "any", maxAge: 30, beat: "camp",
    text: "Just got the locker next to yours. Any advice? Honestly kind of terrified.",
    choices: [
      { label: "Take him under your wing", reply: "Come in early tomorrow, we'll watch extra film together. You'll be fine", karma: 9, morale: 3 },
      { label: "One line of advice", reply: "Learn the playbook before you learn the city. Rest follows", karma: 4 },
      { label: "Big time him", reply: "Earn it like I did", karma: -7 },
    ],
  },
  {
    id: "camp_install", from: "Position coach", emoji: "📚", phase: "any", beat: "camp",
    text: "Install starts tomorrow. Three hundred plays in a week. Want the cutups tonight so you're ahead of it?",
    choices: [
      { label: "Send them, I'm up", reply: "Send everything. I'll have it down by breakfast", karma: 4, morale: -1 },
      { label: "I'll learn it on the field", reply: "I learn better with pads on coach", karma: -3, morale: 2 },
    ],
  },
  {
    id: "camp_rookie_show", from: "Locker room vet", emoji: "🎤", phase: "any", maxAge: 24, beat: "camp",
    text: "Rookie show Thursday. You're singing in front of the whole team. Pick a song or we pick it for you.",
    choices: [
      { label: "Sing it loud", reply: "You're not ready for this. Front row Thursday", karma: 3, morale: 3, popularity: 2 },
      { label: "Buy the rookie dinner instead", reply: "Dinner's on me if I can skip the singing", karma: 2, morale: 1, cash: -0.1 },
      { label: "Refuse", reply: "Not singing. Not happening", karma: -4, morale: -3 },
    ],
  },
  {
    id: "camp_holdout", from: "Teammate", emoji: "🚪", phase: "any", minAge: 24, beat: "camp",
    text: "I'm holding out of camp for a new deal. Front office wants guys to say something publicly. Got my back?",
    choices: [
      { label: "Back him publicly", reply: "He's earned it. Pay the man", karma: 4, morale: 2, popularity: -1 },
      { label: "Stay out of it", reply: "Love you bro but that's between you and them", karma: 0 },
      { label: "Side with the front office", reply: "We need him here. Business is business", karma: -5, popularity: 1 },
    ],
  },
  {
    id: "camp_heat", from: "Strength coach", emoji: "🥵", phase: "any", minAge: 25, beat: "camp",
    text: "Heat index is 104 out here and the staff wants full pads anyway. You're a leader now. Say something?",
    choices: [
      { label: "Speak up for the room", reply: "Coach, half pads today. We'll get the work in smarter", karma: 6, morale: 2 },
      { label: "Strap up and shut up", reply: "Pads on. Let's go", karma: -1, morale: -2 },
    ],
  },

  /* ── the bye ── */
  {
    id: "kid_dm", from: "Fan DM", emoji: "🧒", phase: "any", beat: "bye",
    text: "you're my favorite player ever. im in the hospital and all i want is a signed jersey. no worries if youre busy",
    choices: [
      { label: "Send a signed jersey and visit", reply: "Jersey is on the way and I'm coming to see you next week. Stay strong", karma: 12, popularity: 6, cash: -0.1 },
      { label: "Send the jersey", reply: "On its way little legend", karma: 6, popularity: 3 },
      { label: "Ignore it", reply: "", karma: -8 },
    ],
  },
  {
    id: "old_coach", from: "High school coach", emoji: "👴", phase: "any", beat: "bye",
    text: "Watched you on TV Sunday. Still remember you at 14 refusing to run the route we called. Proud of you kid.",
    choices: [
      { label: "Thank him properly", reply: "Everything started with you coach. Tickets for you whenever you want, for life", karma: 8, morale: 5 },
      { label: "Thumbs up emoji", reply: "👍", karma: -3 },
    ],
  },
  {
    id: "bye_week_party", from: "Promoter", emoji: "🎉", phase: "any", minAge: 23, beat: "bye",
    text: "Biggest party of the year tonight. Table's got your name on it. Bye week starts tomorrow btw.",
    choices: [
      { label: "Stay home and rest", reply: "Rest week for a reason. Another time", karma: 6, morale: 2 },
      { label: "Go but leave early", reply: "One hour max, then I'm gone", karma: -3, popularity: 2 },
      { label: "Full send", reply: "Save me the good table", karma: -9, popularity: 4, morale: 3 },
    ],
  },
  {
    id: "lost_wallet", from: "Stadium worker", emoji: "👛", phase: "any", beat: "bye",
    text: "Found a wallet in the players' lot with 800 bucks in it. No ID. What do I do with it?",
    choices: [
      { label: "Hand it to security", reply: "Security, man. Someone's having a bad day", karma: 6 },
      { label: "Finders keepers", reply: "That's the football gods paying you. Keep it", karma: -6 },
    ],
  },
  {
    id: "barber_cut", from: "Barber", emoji: "💈", phase: "any", beat: "bye",
    text: "New look idea for you. Bold. Might break the internet, might get you fined by the head coach. You in?",
    choices: [
      { label: "Send it", reply: "Chair. Tomorrow. Do your worst", karma: 2, popularity: 4 },
      { label: "Keep it classic", reply: "Usual cut, big game week", karma: 1 },
    ],
  },
  {
    id: "bye_treatment", from: "Athletic trainer", emoji: "🧊", phase: "any", beat: "bye",
    text: "Bye week. Your body's a mess and you know it. Stay in town for treatment, or fly home and see your people?",
    choices: [
      { label: "Stay for treatment", reply: "Ice, tub, film. See you at eight", karma: 3, morale: -1 },
      { label: "Fly home", reply: "Need my people this week. I'll be back fresh", karma: 2, morale: 5 },
    ],
  },
  {
    id: "bye_hospital", from: "Team community office", emoji: "🏥", phase: "any", beat: "bye",
    text: "A few guys are visiting the children's hospital on the off Tuesday. Totally optional, no cameras unless you want them.",
    choices: [
      { label: "Go, no cameras", reply: "Count me in. Leave the cameras at the door", karma: 9, morale: 2 },
      { label: "Go and post it", reply: "I'm in, and I'll post about it so people donate", karma: 6, popularity: 3 },
      { label: "Rest instead", reply: "Need the rest this week, next time", karma: -2, morale: 2 },
    ],
  },

  /* ── the trade deadline ── */
  {
    id: "equipment_fine", from: "Equipment manager", emoji: "🧺", phase: "any", beat: "deadline",
    text: "You left your road pads at the hotel again. Team wants to fine you. I can cover for you this once.",
    choices: [
      { label: "Own it, pay the fine", reply: "My fault. I'll pay it. Lunch is on me too", karma: 7, cash: -0.05 },
      { label: "Let him cover for you", reply: "You're a legend. I owe you", karma: -5, morale: 2 },
    ],
  },
  {
    id: "journalist_leak", from: "Reporter", emoji: "📰", phase: "any", beat: "deadline",
    text: "I know the locker room turned on the coordinator. Give me the inside story, you stay anonymous.",
    choices: [
      { label: "Keep it in house", reply: "Nothing to tell. Locker room stays in the locker room", karma: 8, morale: 2 },
      { label: "Leak it", reply: "Ok but this NEVER came from me", karma: -10, popularity: 3 },
    ],
  },
  {
    id: "injury_teammate", from: "Teammate", emoji: "🏥", phase: "any", beat: "deadline",
    text: "ACL's gone. Nine months. Sitting in this hospital bed wondering if I'll ever be the same, honestly.",
    choices: [
      { label: "Visit weekly", reply: "I'm there every week bro. Rehab buddies. You're coming back stronger", karma: 10, morale: 2 },
      { label: "Send a message", reply: "Gutted for you. Speedy recovery brother", karma: 3 },
      { label: "Read it later", reply: "", karma: -6 },
    ],
  },
  {
    id: "referee_apology", from: "League office", emoji: "🟨", phase: "any", beat: "deadline",
    text: "Your postgame comments about Sunday's officiating went viral. We'd welcome a public clarification.",
    choices: [
      { label: "Apologize properly", reply: "I was out of line. Officials have the hardest job on the field. Apologies", karma: 6, popularity: -1 },
      { label: "Double down", reply: "I said what I said", karma: -7, popularity: 5 },
    ],
  },
  {
    id: "deadline_agent", from: "Agent", emoji: "💼", phase: "any", minAge: 23, beat: "deadline",
    text: "Deadline is Tuesday. Three teams called asking about you. Want me to shut it down, or let the front office sweat a little?",
    choices: [
      { label: "Shut it down, I'm staying", reply: "Tell them I'm not going anywhere", karma: 6, popularity: 4, morale: 2 },
      { label: "Let them sweat", reply: "Don't say anything. Let them wonder", karma: -4, morale: 3 },
    ],
  },
  {
    id: "deadline_traded", from: "Teammate", emoji: "📦", phase: "any", beat: "deadline",
    text: "They traded me. Packing my locker right now. Been a good run with you.",
    choices: [
      { label: "Help him pack and drive him", reply: "Don't move. I'm coming to help and I'm driving you to the airport", karma: 8, morale: -1 },
      { label: "Text him good luck", reply: "Gonna miss you. Go ball out over there", karma: 3 },
      { label: "Leave it", reply: "", karma: -5 },
    ],
  },
  {
    id: "deadline_gm", from: "GM", emoji: "📋", phase: "any", beat: "deadline",
    text: "We're sellers at the deadline. Not you, but some guys around you. I wanted you to hear it from me first.",
    choices: [
      { label: "Thanks for the heads up", reply: "Appreciate you telling me straight", karma: 3, morale: -2 },
      { label: "Then trade me too", reply: "If we're selling, sell me too", karma: -6, morale: -4, popularity: 2 },
    ],
  },

  /* ── the playoffs ── */
  {
    id: "playoffs_meeting", from: "Head coach", emoji: "🧢", phase: "any", beat: "playoffs",
    text: "January. Everything we did since camp was for this. Players only meeting tonight, and I want you to talk.",
    choices: [
      { label: "Speak from the heart", reply: "I'll talk. They'll hear it", karma: 6, morale: 4, popularity: 2 },
      { label: "Let the vets talk", reply: "Let the vets have the floor. I'll lead on the field", karma: 1, morale: 1 },
    ],
  },
  {
    id: "playoffs_tickets", from: "Mom", emoji: "🎟️", phase: "any", beat: "playoffs",
    text: "The whole family wants playoff tickets. All fourteen of us. Your uncle says he's bringing a sign.",
    choices: [
      { label: "Buy them all", reply: "Fourteen tickets, done. Tell him to make the sign big", karma: 7, morale: 3, cash: -0.1 },
      { label: "Four tickets, that's it", reply: "Four. Everybody else watches at the house", karma: -2 },
    ],
  },
  {
    id: "playoffs_radio", from: "Local radio", emoji: "📻", phase: "any", beat: "playoffs",
    text: "We'd love you on the pregame show the morning of the game. Ten minutes, fire the city up.",
    choices: [
      { label: "Do it, hype the city", reply: "I'm in. Let's get this town loud", karma: 1, popularity: 4, morale: -1 },
      { label: "Decline, locked in", reply: "Locked in this week. After we win", karma: 3, morale: 2 },
    ],
  },
  {
    id: "playoffs_staff", from: "Agent", emoji: "💼", phase: "any", beat: "playoffs",
    text: "Playoff checks just cleared. The equipment guys and trainers make a fraction of what you do. Want to do something for them?",
    choices: [
      { label: "Split a bonus with the staff", reply: "Set it up. Every trainer and equipment guy gets something", karma: 10, morale: 3, cash: -0.15 },
      { label: "Buy them dinner", reply: "Steakhouse, whole staff, my card", karma: 5, cash: -0.03 },
      { label: "Keep it", reply: "They get paid. I get paid", karma: -4 },
    ],
  },
  {
    id: "playoffs_old_teammate", from: "Old teammate", emoji: "🤙", phase: "any", minAge: 24, beat: "playoffs",
    text: "If we both win this weekend we see each other next round. Loser buys dinner?",
    choices: [
      { label: "Bet's on", reply: "Bet. Start looking at the menu, you're paying", karma: 2, morale: 3 },
      { label: "Not this week, locked in", reply: "Love you man but no jokes this week", karma: 2, morale: 1 },
    ],
  },
  {
    id: "playoffs_street", from: "Neighbor", emoji: "🏠", phase: "any", beat: "playoffs",
    text: "The whole street put your number up in their windows. The kids made a banner and want you to sign it.",
    choices: [
      { label: "Stop by and sign it", reply: "On my way after practice. Get the markers ready", karma: 7, popularity: 3 },
      { label: "Send signed photos", reply: "Sending photos for every kid on the street", karma: 3, popularity: 1 },
    ],
  },
  {
    id: "playoffs_scout_team", from: "Practice squad player", emoji: "🛡️", phase: "any", beat: "playoffs",
    text: "I'm playing the other team's star all week on scout team. Want me to go full speed on you, even if it gets chippy?",
    choices: [
      { label: "Full speed, don't hold back", reply: "Full speed. Make me better", karma: 3, morale: 3 },
      { label: "Keep it clean", reply: "Go hard but nobody gets hurt this week", karma: 4 },
    ],
  },

  /* ── the offseason ── */
  {
    id: "mom_call", from: "Mom", emoji: "❤️", phase: "any", beat: "offseason",
    text: "Haven't heard from you in a while sweetheart. Everything okay out there? Call me when you get a second.",
    choices: [
      { label: "Call her tonight", reply: "Calling you right after the walkthrough, promise. Love you", karma: 8, morale: 6 },
      { label: "Leave it on read", reply: "", karma: -6, morale: -2 },
    ],
  },
  {
    id: "agent_cleats", from: "Agent", emoji: "💼", phase: "any", beat: "offseason", ahead: true,
    text: "Cleat deal on the table. Good money, but the brand got caught running sweatshops last year. Your call.",
    choices: [
      { label: "Take the money", reply: "Money is money. Send the contract", karma: -7, cash: 1.2 },
      { label: "Turn it down publicly", reply: "Not wearing that. And I'm saying why", karma: 9, popularity: 4 },
      { label: "Quietly decline", reply: "Pass on this one. Keep it quiet", karma: 4 },
    ],
  },
  {
    id: "granny_scam", from: "Unknown", emoji: "🎣", phase: "any", beat: "offseason",
    text: "CONGRATULATIONS! You've won 2 MILLION DOLLARS. Just send your account info plus a small release fee to claim it.",
    choices: [
      { label: "Report and warn fans", reply: "Posting this so nobody falls for it. Stay safe out there", karma: 7, popularity: 3 },
      { label: "Delete it", reply: "", karma: 1 },
      { label: "Reply as a joke", reply: "Amazing news!! My account number is 1-2-3-GET-A-JOB", karma: 2, popularity: 2 },
    ],
  },
  {
    id: "charity_gala", from: "Foundation", emoji: "🎗️", phase: "any", minAge: 23, beat: "offseason",
    text: "We're hosting a children's hospital fundraiser Friday. Would mean the world if you came. Press will be there.",
    choices: [
      { label: "Go and donate", reply: "Count me in. And put me down for a donation", karma: 10, popularity: 5, cash: -0.5 },
      { label: "Go for the cameras only", reply: "I'll swing by for an hour", karma: 2, popularity: 3 },
      { label: "Skip it", reply: "Can't make it, good luck", karma: -6 },
    ],
  },
  {
    id: "crypto_bro", from: "College roommate", emoji: "🪙", phase: "any", minAge: 23, beat: "offseason",
    text: "Bro I need you to shout out my new coin BallerCoin to your followers. Guaranteed 100x. Family discount.",
    choices: [
      { label: "Hard pass", reply: "Not putting my fans into that. Look after yourself", karma: 7 },
      { label: "Promote it", reply: "Sending the post now. We better get rich", karma: -11, cash: 0.8, popularity: -3 },
    ],
  },
  {
    id: "training_extra", from: "Strength coach", emoji: "🏋️", phase: "any", beat: "offseason", ahead: true,
    text: "Optional 6am sessions all offseason. Brutal but they work. Half the room is skipping them.",
    choices: [
      { label: "Sign up", reply: "Put my name down. First one in, last one out", karma: 5, morale: -2 },
      { label: "Skip them", reply: "Recovery is part of training too coach", karma: -3, morale: 2 },
    ],
  },
  {
    id: "tax_scheme", from: "Financial advisor", emoji: "🏝️", phase: "any", minAge: 25, beat: "offseason",
    text: "New structure for your name and image money. Runs through three states with no income tax. Technically legal. Probably.",
    choices: [
      { label: "Keep it clean", reply: "Pay what I owe where I earn it. Not risking my name", karma: 8 },
      { label: "Do the scheme", reply: "If it's legal, file it", karma: -9, cash: 2.0 },
    ],
  },
  {
    id: "documentary", from: "Streaming service", emoji: "🎬", phase: "any", minAge: 25, beat: "offseason", ahead: true,
    text: "All access documentary on your season. Good money. Cameras everywhere, including the bad days.",
    choices: [
      { label: "Do it honestly", reply: "Deal, but you show the real thing, not a highlight reel", karma: 5, popularity: 6, cash: 1.0 },
      { label: "Decline", reply: "Locker room stays sacred. Pass", karma: 3 },
    ],
  },
  {
    id: "podcast_invite", from: "Podcast", emoji: "🎙️", phase: "any", minAge: 24, beat: "offseason",
    text: "Come on the show. Fans want unfiltered. We will ask about your coach, your contract and your rival.",
    choices: [
      { label: "Go and stay classy", reply: "I'll come on. Keeping team stuff in house though", karma: 5, popularity: 3 },
      { label: "Go and spill everything", reply: "Unfiltered? You'll get unfiltered", karma: -6, popularity: 6 },
      { label: "Decline", reply: "Not my thing, good luck with the show", karma: 1 },
    ],
  },
  {
    id: "hometown_field", from: "Community league", emoji: "🏗️", phase: "any", minAge: 24, beat: "offseason",
    text: "The field you grew up playing on is closing without funding. Two hundred kids play there every fall.",
    choices: [
      { label: "Fund it and rename it", reply: "I'll cover it. Name it after my old coach, not me", karma: 12, popularity: 5, cash: -1.2 },
      { label: "Fund it quietly", reply: "Send the invoice to my foundation. No press", karma: 10, cash: -1.2 },
      { label: "Share a fundraiser", reply: "Posting the link, let's all chip in", karma: 4, popularity: 1 },
    ],
  },
  {
    id: "grandpa_visit", from: "Grandpa", emoji: "🧓", phase: "any", beat: "offseason",
    text: "Never miss you on Sundays now that I've got the package. Hip's too bad for the stadium these days. Bring the trophy by some day, yeah?",
    choices: [
      { label: "Visit with your jersey", reply: "Coming by on the off day with a jersey and the game ball. Put the coffee on", karma: 9, morale: 5 },
      { label: "Promise vaguely", reply: "One day grandpa, promise", karma: 1 },
    ],
  },

  /* ── the summer before a contract year ── */
  {
    id: "contract_agent", from: "Agent", emoji: "💼", phase: "any", beat: "contract",
    text: "Last year of the deal coming up. Bet on yourself and play it out, or tell the GM we want to talk now?",
    choices: [
      { label: "Bet on myself", reply: "Play it out. Let the tape do the talking", karma: 1, morale: 4 },
      { label: "Tell him we want to talk", reply: "Open the door. Quietly", karma: 2, morale: -1 },
      { label: "Leak that I want top money", reply: "Let it slip that I want to be the highest paid at the spot", karma: -6, popularity: 2, morale: 2 },
    ],
  },
  {
    id: "contract_gm", from: "GM", emoji: "📋", phase: "any", beat: "contract",
    text: "Contract year. We want you here long term. Keep it out of the papers and we'll get something done.",
    choices: [
      { label: "Quiet talks, deal", reply: "Deal. Nothing goes to the papers from my side", karma: 5, morale: 2 },
      { label: "My agent handles that", reply: "Talk to my agent. I just play", karma: -1, morale: 1 },
    ],
  },
  {
    id: "contract_vet", from: "Locker room vet", emoji: "🧔", phase: "any", beat: "contract",
    text: "Contract years get loud. Don't let the money talk get in your head. Ball first, the bag follows.",
    choices: [
      { label: "Thank him", reply: "Needed that. Appreciate you", karma: 4, morale: 3 },
      { label: "Easy for you to say", reply: "Easy to say when you already got yours", karma: -3, morale: -1 },
    ],
  },
  {
    id: "contract_advisor", from: "Financial advisor", emoji: "📈", phase: "any", beat: "contract",
    text: "If you hit the market next year the new money changes everything. Want a plan now, before the agent calls start?",
    choices: [
      { label: "Make a plan", reply: "Let's sit down this week. Real plan", karma: 3, morale: 2, cash: -0.05 },
      { label: "Later", reply: "After the season. One thing at a time", karma: 0 },
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
  wantPerSeason: 3,
  calendar: NFL_CALENDAR,
};

/**
 * Round 796: the beats the season just played actually had, read off the
 * line the engine wrote and the deal as it stands after the year ticked
 * over. A suspended year had no football in it, only the offseason. A
 * playoff run is a playoff game played. The contract beat is the summer
 * before the last year of a deal, which is when that conversation happens
 * (and when the extension card is about to ask about it).
 *
 * `goesOn` is false when this season was the career's last (the engine
 * decides that right after the inbox runs, so progress passes it in): a beat
 * about a season still to come (`ahead` on the calendar) never happened for
 * a player who is about to retire.
 */
export function nflSeasonBeats(c: CareerState, goesOn = true): string[] {
  const line = c.seasons[c.seasons.length - 1];
  if (!line || line.teamResult === "SUSPENDED") return ["offseason"];
  const beats = ["camp", "bye", "deadline"];
  if ((line.poGames ?? 0) > 0) beats.push("playoffs");
  beats.push("offseason");
  if (!c.retired && c.contractYears === 1) beats.push("contract");
  if (goesOn && !c.retired) return beats;
  return beats.filter(id => !NFL_CALENDAR.find(b => b.id === id)?.ahead);
}

/**
 * Round 796: the inbox's own random stream, keyed to the save and the
 * moment. It used to draw from the season's stream, which meant every text
 * the bank gained or lost shifted every draw after it (the next camp, the
 * awards) and reshuffled every seeded NFL career. Now the season's stream
 * never sees the inbox: the same career at the same point always gets the
 * same texts, and scripts/simCareerInboxBeats.mjs section 9 plays seeded
 * careers with the inbox delivering and with it shut and requires every
 * season to come out identical.
 */
function nflInboxRng(c: CareerState, moment: string): () => number {
  return keyedRng(`${c.name}|${c.pos}|${c.team}|${c.draftPick}|${c.rival?.name ?? ""}|${c.year}|${c.seasons.length}|${(c.phoneUsedIds ?? []).length}|inbox-${moment}`);
}

/** One season of the inbox. NFL has no youth phase, so it always answers
 *  "pro"; every template above is gated "any" or by age rather than phase
 *  for exactly that reason. `goesOn` false (the career ends this season)
 *  keeps every `ahead` beat and `ahead` text out of it. With no `rng` it
 *  draws from nflInboxRng, which is what the season tick does. */
export function receiveNflInboxTexts(c: CareerState, goesOn = true, rng?: () => number): InboxMessage[] {
  const sport = goesOn && !c.retired ? NFL_INBOX : { ...NFL_INBOX, pool: NFL_INBOX.pool.filter(t => !t.ahead) };
  return receiveInboxTextsFor(c, "pro", sport, rng ?? nflInboxRng(c, "season"), nflSeasonBeats(c, goesOn));
}

/** Round 796: draft night. The text that lands the moment your name is
 *  called, before a down is played, so no mood drift: no season has passed. */
export function nflDraftNightInbox(c: CareerState, rng?: () => number): InboxMessage[] {
  return deliverInboxTextsFor(c, "pro", NFL_INBOX, rng ?? nflInboxRng(c, "draft"), ["draft"]);
}

export function nflUnreadInboxCount(c: CareerState): number {
  return unreadInboxCountFor(c);
}

/** Answer one message. Returns the line for the feed, or null when the
 *  message does not exist, is already answered, or the choice is invalid. */
export function answerNflInboxMessage(c: CareerState, msgId: string, choiceIdx: number): string | null {
  return answerInboxMessageFor(c, msgId, choiceIdx, NFL_INBOX);
}
