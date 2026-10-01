/* ─── Round 525: the NBA career's inbox ──────────────────────────────────────

   His 2026-08-28 backlog marked the Soccer Career depth gap open for the
   American careers on two items: interactive rivalry events, and an inbox.
   Round 521 closed both for the NFL. This file is the inbox half for the
   NBA, on the same engine careerInbox.ts lifted from the flagship, bound to
   basketball the same way nbaCareerMoney.ts binds the bank. Nothing below
   is a rule, it is data: the message bank, and four small closures saying
   which of the NBA save's own fields the mood meter and the standing meter
   actually are. scripts/simCareerInbox.mjs fails if this file grows a rule
   of its own.

   Mood meter: a fresh `karma` field, the exact same 0-100 neutral-50 meter
   the flagship's phone and the NFL career already run, absent on any save
   from before this round and repaired lazily the same way ensureNbaMoney
   repairs the bank. Standing meter: the fanbase the hub already shows, so a
   good reply and a bad one land somewhere the player can already see.

   Round 822: THE BASKETBALL CALENDAR, the NFL's Round 796 calendar reaching
   the NBA. Every text belongs to a beat of the basketball year (draft night,
   summer league, camp, the trade deadline, the All-Star break, the playoffs,
   the offseason, and the summer before a contract year) and only arrives on a
   season that actually had that beat: no playoff texts in a year the team
   went home in April, no contract year texts with three years left on the
   deal, and draft night's texts (the draft and your first summer league)
   land the moment your name is called. nbaSeasonBeats reads which beats a
   season had off the season line the engine already wrote; the delivery rule
   (one a beat, one-offs first, calendar order), the final season gate and
   the inbox's own random stream are careerInbox.ts's, shared with the other
   three careers. scripts/simCareerInboxBeats.mjs section 10 proves every text
   arrived on a beat its season really had. The ids of the twenty two Round
   525 templates are unchanged, so a save that already used one never sees it
   again.

   LEGAL SHAPE. Every "from" below is a role (Mom, Agent, a teammate, a beat
   writer), never a name, and nothing here ever speaks as the rival: the
   rival's own voice lives only in nbaCareerRivalryEvents.ts, narrated rather
   than quoted, the same rule the flagship's texts already follow. */

import type { NbaCareerState } from "./nbaMyCareer";
import {
  receiveCalendarInboxTexts as receiveCalendarInboxTextsFor,
  deliverInboxTexts as deliverInboxTextsFor,
  answerInboxMessage as answerInboxMessageFor,
  unreadInboxCount as unreadInboxCountFor,
  inboxStream,
} from "./careerInbox";
import type { InboxSport, InboxMessageDef, InboxMessage, InboxBeat } from "./careerInbox";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Round 822: the basketball year, in the order it runs. Summer league comes
 *  round twice at most: the July after draft night, and the July after your
 *  rookie season. */
export const NBA_CALENDAR: InboxBeat[] = [
  { id: "draft", label: "Draft night", emoji: "🎓", oneOff: true },
  { id: "camp", label: "Training camp", emoji: "🏀" },
  { id: "deadline", label: "Trade deadline", emoji: "⏰" },
  { id: "allstar", label: "All-Star break", emoji: "⭐" },
  { id: "playoffs", label: "Playoffs", emoji: "🏆", oneOff: true },
  { id: "offseason", label: "Offseason", emoji: "🌴" },
  { id: "summer", label: "Summer league", emoji: "☀️", oneOff: true, ahead: true },
  { id: "contract", label: "Contract year ahead", emoji: "✍️", oneOff: true, ahead: true },
];

/* The bank. Every template is gated on the role writing it rather than a
   name, tagged with the beat it belongs to, and every choice's effect is
   small on purpose: this is flavor and a mood meter, never a lever worth
   grinding. Ages are the career's own age field, which starts at 19 to 21 on
   draft night. */
const NBA_INBOX_POOL: InboxMessageDef[] = [
  /* ── draft night ── */
  {
    id: "draft_agent", from: "Agent", emoji: "💼", phase: "any", beat: "draft",
    text: "Congrats, you're in the league. Two sneaker brands and a car dealership already called. Line up the rookie deals now, or wait until you've played a minute?",
    choices: [
      { label: "Sign everything", reply: "Sign it all. Rookie money doesn't last", karma: -3, cash: 0.4, popularity: 2 },
      { label: "Just the sneakers", reply: "Sneakers only for now. The rest can wait", karma: 1, cash: 0.2 },
      { label: "Wait until I earn it", reply: "Nothing until I've done something on the floor", karma: 6, morale: 2 },
    ],
  },
  {
    id: "draft_coach", from: "Head coach", emoji: "🧢", phase: "any", beat: "draft",
    text: "Welcome to the building. Rookies here carry the bags and stay late shooting. Nobody gets handed minutes. See you at the facility Monday.",
    choices: [
      { label: "Yes coach, see you early", reply: "Yes coach. I'll be in the gym before the lights are on", karma: 6, morale: 3 },
      { label: "I'm here to start", reply: "Respect coach. I'm not here to sit though", karma: -3, morale: 2, popularity: 2 },
    ],
  },
  {
    id: "draft_mom", from: "Mom", emoji: "❤️", phase: "any", beat: "draft",
    text: "I cried the whole time they read your name. Your little cousins still haven't stopped screaming. Come home before summer league?",
    choices: [
      { label: "Fly home for the weekend", reply: "Booking it now. Save me a plate", karma: 8, morale: 5, cash: -0.05 },
      { label: "After summer league, promise", reply: "After summer league mama, I promise. Love you", karma: 1, morale: 1 },
    ],
  },
  {
    id: "draft_gm", from: "GM", emoji: "📋", phase: "any", beat: "draft",
    text: "We had you at the top of our board for months. A lot of people in this building put their names on that pick. Make us look smart.",
    choices: [
      { label: "You won't regret it", reply: "You'll never regret it. Promise", karma: 4, morale: 3 },
      { label: "Then pay me like it", reply: "Then the second contract better reflect it", karma: -5, morale: 1, popularity: 1 },
    ],
  },
  {
    id: "draft_aau", from: "AAU coach", emoji: "🎓", phase: "any", beat: "draft",
    text: "Saw your name come up and lost my voice. Remember that gym with no heat? Come back and talk to the young guys sometime.",
    choices: [
      { label: "Send the program new shoes", reply: "Shoes for the whole program are on me. Tell them I said hi", karma: 9, popularity: 2, cash: -0.1 },
      { label: "Thank him", reply: "Wouldn't be here without you coach. I'll be back", karma: 5, morale: 2 },
      { label: "Thumbs up emoji", reply: "👍", karma: -2 },
    ],
  },

  /* ── summer league ── */
  {
    id: "summer_coach", from: "Summer league coach", emoji: "☀️", phase: "any", beat: "summer",
    text: "Summer league starts Friday. You're getting the ball a lot. Mistakes are fine, hiding isn't.",
    choices: [
      { label: "Run the show", reply: "Give me the ball. I'll live with the mistakes", karma: 3, morale: 3, popularity: 2 },
      { label: "Play within the system", reply: "I'll run what you call and learn the reads", karma: 4, morale: 1 },
    ],
  },
  {
    id: "summer_vet", from: "Veteran teammate", emoji: "🧔", phase: "any", beat: "summer",
    text: "Don't play summer league like it's the Finals. Learn the coverages, stay healthy, show up to camp ready.",
    choices: [
      { label: "Thank him", reply: "Needed that. Appreciate you looking out", karma: 4, morale: 2 },
      { label: "I'm still going for 40", reply: "Love you but I'm putting up 40 on somebody", karma: -2, popularity: 3 },
    ],
  },
  {
    id: "summer_agent", from: "Agent", emoji: "💼", phase: "any", beat: "summer",
    text: "A brand wants you in their shoes for summer league. Courtside cameras, decent check. Want it?",
    choices: [
      { label: "Take it", reply: "Send it over. Free shoes and a check, easy", karma: 0, cash: 0.2, popularity: 1 },
      { label: "Not yet", reply: "Let me play a real game first. Then we talk", karma: 4 },
    ],
  },
  {
    id: "summer_trainer", from: "Skills trainer", emoji: "🎯", phase: "any", beat: "summer",
    text: "Two a days through August if you want that jumper fixed. It's not fun. It works.",
    choices: [
      { label: "Book every day", reply: "Every day. Fix it", karma: 5, morale: -2 },
      { label: "Three days a week", reply: "Three a week, I need some summer too", karma: 1, morale: 2 },
    ],
  },
  {
    id: "summer_fan", from: "Fan DM", emoji: "🎟️", phase: "any", beat: "summer",
    text: "drove six hours to watch u in summer league lol. any chance u sign my ticket after?",
    choices: [
      { label: "Sign it and take a picture", reply: "Find me by the tunnel after. Picture too", karma: 7, popularity: 3 },
      { label: "Leave it on read", reply: "", karma: -4 },
    ],
  },

  /* ── training camp ── */
  {
    id: "teammate_bench", from: "Teammate", emoji: "😤", phase: "any", beat: "camp",
    text: "Coach has had me at the end of the bench again man. Thinking about asking for a trade. What would you do?",
    choices: [
      { label: "Be honest with him", reply: "You deserve minutes mate. If he won't give them, go get them somewhere", karma: 6, morale: 2 },
      { label: "Tell him to stop whining", reply: "Outwork him then. Nobody owes you a jersey", karma: -5 },
      { label: "Dodge the question", reply: "Tough one bro. Sleep on it", karma: -1 },
    ],
  },
  {
    id: "rookie_advice", from: "Rookie", emoji: "🌱", phase: "any", maxAge: 30, beat: "camp",
    text: "Just got the locker next to yours. Any advice? Honestly kind of terrified.",
    choices: [
      { label: "Take him under your wing", reply: "Come in early tomorrow, we'll get up extra shots together. You'll be fine", karma: 9, morale: 3 },
      { label: "One line of advice", reply: "Learn the playbook before you learn the city. Rest follows", karma: 4 },
      { label: "Big time him", reply: "Earn it like I did", karma: -7 },
    ],
  },
  {
    id: "camp_conditioning", from: "Strength coach", emoji: "🥵", phase: "any", beat: "camp",
    text: "Conditioning test tomorrow. Seventeens, sideline to sideline, under the minute. Half the room is nervous. You ready?",
    choices: [
      { label: "Been running all summer", reply: "Ready. I've been running all summer", karma: 3, morale: 2 },
      { label: "Ask to push it a day", reply: "Any chance we do it Thursday instead", karma: -3, morale: 1 },
    ],
  },
  {
    id: "camp_number", from: "Equipment manager", emoji: "👕", phase: "any", beat: "camp",
    text: "The number you want belongs to a guy who's been here six years. Ask him for it, or pick a new one?",
    choices: [
      { label: "Pick a new one", reply: "All good, I'll make a new number mean something", karma: 3 },
      { label: "Buy him dinner for it", reply: "Tell him dinner's on me if he'll trade numbers", karma: 1, popularity: 2, cash: -0.05 },
      { label: "Just take it", reply: "Tell him I'm wearing it", karma: -5, morale: 1 },
    ],
  },
  {
    id: "camp_media_day", from: "Team PR", emoji: "🎤", phase: "any", beat: "camp",
    text: "Media day tomorrow. They'll ask about your goals for the year. Safe answer, or say what you really think?",
    choices: [
      { label: "Safe answer", reply: "Team first, one game at a time, you know the drill", karma: 2 },
      { label: "Say it out loud", reply: "I'm telling them I want to be an All-Star", karma: -1, popularity: 3, morale: 2 },
    ],
  },

  /* ── the trade deadline ── */
  {
    id: "mom_call", from: "Mom", emoji: "❤️", phase: "any", beat: "deadline",
    text: "Haven't heard from you since the road trip started sweetheart. Everything okay out there? Call me when you land.",
    choices: [
      { label: "Call her from the tunnel", reply: "Calling you right after shootaround, promise. Love you", karma: 8, morale: 6 },
      { label: "Leave it on read", reply: "", karma: -6, morale: -2 },
    ],
  },
  {
    id: "equipment_fine", from: "Equipment manager", emoji: "🧺", phase: "any", beat: "deadline",
    text: "You left your warm-ups on the team plane again. Front office wants to fine you. I can cover for you this once.",
    choices: [
      { label: "Own it, pay the fine", reply: "My fault Tony. I'll pay it. Team dinner is on me too", karma: 7, cash: -0.05 },
      { label: "Let him cover for you", reply: "You're a legend. I owe you", karma: -5, morale: 2 },
    ],
  },
  {
    id: "beat_writer_leak", from: "Beat writer", emoji: "📰", phase: "any", beat: "deadline",
    text: "I know the locker room turned on the coaching staff. Give me the inside story, you stay anonymous.",
    choices: [
      { label: "Keep it in house", reply: "Nothing to tell. Locker room stays in the locker room", karma: 8, morale: 2 },
      { label: "Leak it", reply: "Ok but this NEVER came from me", karma: -10, popularity: 3 },
    ],
  },
  {
    id: "lost_wallet", from: "Arena usher", emoji: "👛", phase: "any", beat: "deadline",
    text: "Found a wallet in the players' lot with 800 bucks in it. No ID. What do I do with it?",
    choices: [
      { label: "Hand it to security", reply: "Security, mate. Someone's having a bad day", karma: 6 },
      { label: "Finders keepers", reply: "That's the basketball gods paying you. Keep it", karma: -6 },
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
    id: "league_apology", from: "League office", emoji: "🟨", phase: "any", beat: "deadline",
    text: "Your postgame comments about Tuesday's officiating went viral. We'd welcome a public clarification.",
    choices: [
      { label: "Apologize properly", reply: "I was out of line. Officials have the hardest job on the floor. Apologies", karma: 6, popularity: -1 },
      { label: "Double down", reply: "I said what I said", karma: -7, popularity: 5 },
    ],
  },
  {
    id: "deadline_agent", from: "Agent", emoji: "💼", phase: "any", minAge: 22, beat: "deadline",
    text: "Deadline is Thursday. Two teams called asking about you. Want me to shut it down, or let the front office sweat a little?",
    choices: [
      { label: "Shut it down, I'm staying", reply: "Tell them I'm not going anywhere", karma: 6, popularity: 4, morale: 2 },
      { label: "Let them sweat", reply: "Don't say anything. Let them wonder", karma: -4, morale: 3 },
    ],
  },
  {
    id: "deadline_traded", from: "Teammate", emoji: "📦", phase: "any", beat: "deadline",
    text: "They traded me. Cleaning out my locker right now. Been a real one, for real.",
    choices: [
      { label: "Drive him to the airport", reply: "Don't move. I'm coming to help and I'm driving you to the airport", karma: 8, morale: -1 },
      { label: "Text him good luck", reply: "Gonna miss you. Go get buckets over there", karma: 3 },
      { label: "Leave it", reply: "", karma: -5 },
    ],
  },
  {
    id: "deadline_gm", from: "GM", emoji: "📋", phase: "any", beat: "deadline",
    text: "We're making moves before the deadline. Not you, but some guys you're close to. Wanted you to hear it from me first.",
    choices: [
      { label: "Thanks for the heads up", reply: "Appreciate you telling me straight", karma: 3, morale: -2 },
      { label: "Then move me too", reply: "If we're selling, sell me too", karma: -6, morale: -4, popularity: 2 },
    ],
  },

  /* ── the All-Star break ── */
  {
    id: "allstar_party", from: "Promoter", emoji: "🎉", phase: "any", minAge: 23, beat: "allstar",
    text: "Biggest party of All-Star weekend tonight. Table's got your name on it. Practice isn't until Friday.",
    choices: [
      { label: "Stay in and rest", reply: "Rest week for a reason. Another time", karma: 6, morale: 2 },
      { label: "Go but leave early", reply: "One hour max, then I'm gone", karma: -3, popularity: 2 },
      { label: "Full send", reply: "Save me the good table", karma: -9, popularity: 4, morale: 3 },
    ],
  },
  {
    id: "stylist_fit", from: "Stylist", emoji: "🕶️", phase: "any", beat: "allstar",
    text: "New tunnel fit idea for you. Bold. Might break the internet, might get roasted on every broadcast. You in?",
    choices: [
      { label: "Send it", reply: "Send it over. Do your worst", karma: 2, popularity: 4 },
      { label: "Keep it classic", reply: "Usual look tonight, big game", karma: 1 },
    ],
  },
  {
    id: "aau_coach", from: "AAU coach", emoji: "👴", phase: "any", beat: "allstar",
    text: "Watched you on national TV Tuesday. Still remember you at 14 refusing to run the offense we called. Proud of you kid.",
    choices: [
      { label: "Thank him properly", reply: "Everything started with you coach. Tickets for you whenever you want, for life", karma: 8, morale: 5 },
      { label: "Thumbs up emoji", reply: "👍", karma: -3 },
    ],
  },
  {
    id: "kid_dm", from: "Fan DM", emoji: "🧒", phase: "any", beat: "allstar",
    text: "you're my favorite player ever. im in the hospital and all i want is a signed jersey. no worries if youre busy",
    choices: [
      { label: "Send a signed jersey and visit", reply: "Jersey is on the way and I'm coming to see you after the next home stand. Stay strong", karma: 12, popularity: 6, cash: -0.1 },
      { label: "Send the jersey", reply: "On its way little legend", karma: 6, popularity: 3 },
      { label: "Ignore it", reply: "", karma: -8 },
    ],
  },
  {
    id: "allstar_home", from: "Mom", emoji: "🏠", phase: "any", beat: "allstar",
    text: "Four days off for the break. Your room is exactly how you left it. Come home?",
    choices: [
      { label: "Fly home", reply: "On the first flight out. Make the good stuff", karma: 6, morale: 5, cash: -0.02 },
      { label: "Stay and rest", reply: "Body needs the couch this time mama. Next break, promise", karma: 1, morale: 2 },
    ],
  },
  {
    id: "allstar_clinic", from: "Rec center", emoji: "🏟️", phase: "any", beat: "allstar",
    text: "The rec center back home is running a free clinic over the break. The kids would lose their minds if you showed up.",
    choices: [
      { label: "Show up unannounced", reply: "Don't tell them. I'll just walk in", karma: 9, popularity: 3 },
      { label: "Send a video", reply: "Sending a video for the kids tonight", karma: 3, popularity: 1 },
      { label: "Pass", reply: "Can't this time, sorry", karma: -3 },
    ],
  },

  /* ── the playoffs ── */
  {
    id: "playoffs_meeting", from: "Head coach", emoji: "🧢", phase: "any", beat: "playoffs",
    text: "Playoff basketball. Everything since camp was for this. Players only meeting tonight, and I want you to talk.",
    choices: [
      { label: "Speak from the heart", reply: "I'll talk. They'll hear it", karma: 6, morale: 4, popularity: 2 },
      { label: "Let the vets talk", reply: "Let the vets have the floor. I'll lead on the court", karma: 1, morale: 1 },
    ],
  },
  {
    id: "playoffs_tickets", from: "Mom", emoji: "🎟️", phase: "any", beat: "playoffs",
    text: "The whole family wants tickets for the home games. All fourteen of us. Your uncle says he's making a sign.",
    choices: [
      { label: "Buy them all", reply: "Fourteen tickets, done. Tell him to make the sign big", karma: 7, morale: 3, cash: -0.1 },
      { label: "Four tickets, that's it", reply: "Four. Everybody else watches at the house", karma: -2 },
    ],
  },
  {
    id: "playoffs_staff", from: "Agent", emoji: "💼", phase: "any", beat: "playoffs",
    text: "Playoff money just hit. The trainers and equipment staff make a fraction of what you do. Want to do something for them?",
    choices: [
      { label: "Split a bonus with the staff", reply: "Set it up. Every trainer and equipment guy gets something", karma: 10, morale: 3, cash: -0.15 },
      { label: "Buy them dinner", reply: "Steakhouse, whole staff, my card", karma: 5, cash: -0.03 },
      { label: "Keep it", reply: "They get paid. I get paid", karma: -4 },
    ],
  },
  {
    id: "playoffs_film", from: "Assistant coach", emoji: "📼", phase: "any", beat: "playoffs",
    text: "I cut forty minutes of how they guard the pick and roll. Want it tonight, or after shootaround?",
    choices: [
      { label: "Tonight, send it", reply: "Send it now. I'll have it down by morning", karma: 4, morale: -1 },
      { label: "After shootaround", reply: "After shootaround. I need to sleep tonight", karma: 1, morale: 2 },
    ],
  },
  {
    id: "playoffs_radio", from: "Local radio", emoji: "📻", phase: "any", beat: "playoffs",
    text: "We'd love you on the morning show before Game 1. Ten minutes, fire the city up.",
    choices: [
      { label: "Do it, hype the city", reply: "I'm in. Let's get this town loud", karma: 1, popularity: 4, morale: -1 },
      { label: "Decline, locked in", reply: "Locked in this week. After we win", karma: 3, morale: 2 },
    ],
  },
  {
    id: "playoffs_sleep", from: "Performance staff", emoji: "😴", phase: "any", beat: "playoffs",
    text: "Your sleep numbers are a mess this series. Phone off at eleven, no exceptions. Deal?",
    choices: [
      { label: "Deal", reply: "Phone's in the drawer at eleven. Promise", karma: 3, morale: 2 },
      { label: "No promises", reply: "I'll try. No promises", karma: -2 },
    ],
  },

  /* ── the offseason ── */
  {
    id: "lottery_scam", from: "Unknown", emoji: "🎣", phase: "any", beat: "offseason",
    text: "CONGRATULATIONS! You've won 2 MILLION DOLLARS. Just send your account info plus a small release fee to claim it.",
    choices: [
      { label: "Report and warn fans", reply: "Posting this so nobody falls for it. Stay safe out there", karma: 7, popularity: 3 },
      { label: "Delete it", reply: "", karma: 1 },
      { label: "Reply as a joke", reply: "Amazing news!! My account number is 1-2-3-GET-A-JOB", karma: 2, popularity: 2 },
    ],
  },
  {
    id: "agent_sneaker", from: "Agent", emoji: "💼", phase: "any", beat: "offseason", ahead: true,
    text: "Sneaker deal on the table. Good money, but the brand got caught running sweatshops last year. Your call.",
    choices: [
      { label: "Take the money", reply: "Money is money. Send the contract", karma: -7, cash: 1.2 },
      { label: "Turn it down publicly", reply: "Not lacing those up. And I'm saying why", karma: 9, popularity: 4 },
      { label: "Quietly decline", reply: "Pass on this one. Keep it quiet", karma: 4 },
    ],
  },
  {
    id: "charity_clinic", from: "Foundation", emoji: "🎗️", phase: "any", minAge: 23, beat: "offseason",
    text: "We're running a free youth clinic at the rec center this weekend. Would mean the world if you came. Press will be there.",
    choices: [
      { label: "Go and donate", reply: "Count me in. And put me down for a donation", karma: 10, popularity: 5, cash: -0.5 },
      { label: "Go for the cameras only", reply: "I'll swing by for an hour", karma: 2, popularity: 3 },
      { label: "Skip it", reply: "Can't make it, good luck", karma: -6 },
    ],
  },
  {
    id: "cryptobro_college", from: "College roommate", emoji: "🪙", phase: "any", minAge: 23, beat: "offseason",
    text: "Bro I need you to shout out my new coin HoopCoin to your followers. Guaranteed 100x. Family discount.",
    choices: [
      { label: "Hard pass", reply: "Not putting my fans into that. Look after yourself", karma: 7 },
      { label: "Promote it", reply: "Sending the post now. We better get rich", karma: -11, cash: 0.8, popularity: -3 },
    ],
  },
  {
    id: "early_lifts", from: "Strength coach", emoji: "🏋️", phase: "any", beat: "offseason", ahead: true,
    text: "Optional 6am lifts all summer. Brutal but they work. Half the room is skipping them.",
    choices: [
      { label: "Sign up", reply: "Put my name down. First one in, last one out", karma: 5, morale: -2 },
      { label: "Skip them", reply: "Recovery is part of training too coach", karma: -3, morale: 2 },
    ],
  },
  {
    id: "tax_scheme", from: "Financial advisor", emoji: "🏝️", phase: "any", minAge: 25, beat: "offseason",
    text: "New structure for your endorsement money. Runs through three states with no income tax. Technically legal. Probably.",
    choices: [
      { label: "Keep it clean", reply: "Pay what I owe where I earn it. Not risking my name", karma: 8 },
      { label: "Do the scheme", reply: "If it's legal, file it", karma: -9, cash: 2.0 },
    ],
  },
  {
    id: "documentary", from: "Streaming service", emoji: "🎬", phase: "any", minAge: 25, beat: "offseason", ahead: true,
    text: "All access documentary on your season. Good money. Cameras everywhere, including the bad nights.",
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
    id: "hometown_court", from: "Community league", emoji: "🏗️", phase: "any", minAge: 24, beat: "offseason",
    text: "The court you grew up playing on is closing without funding. Two hundred kids run there every summer.",
    choices: [
      { label: "Fund it and rename it", reply: "I'll cover it. Name it after my old coach, not me", karma: 12, popularity: 5, cash: -1.2 },
      { label: "Fund it quietly", reply: "Send the invoice to my foundation. No press", karma: 10, cash: -1.2 },
      { label: "Share a fundraiser", reply: "Posting the link, let's all chip in", karma: 4, popularity: 1 },
    ],
  },
  {
    id: "grandpa_visit", from: "Grandpa", emoji: "🧓", phase: "any", beat: "offseason",
    text: "Never miss you now that I've got League Pass. Hip's too bad for the arena these days. Bring the trophy round some day, yeah?",
    choices: [
      { label: "Visit with your jersey", reply: "Coming round on the off day with a jersey and a game ball. Put the kettle on", karma: 9, morale: 5 },
      { label: "Promise vaguely", reply: "One day grandpa, promise", karma: 1 },
    ],
  },
  {
    id: "offseason_runs", from: "Old teammate", emoji: "🔥", phase: "any", minAge: 22, beat: "offseason", ahead: true,
    text: "Pro runs at the college gym all summer. No cameras, no refs, a lot of trash talk. You in?",
    choices: [
      { label: "Every week", reply: "Save me a spot. I'm coming every week", karma: 3, morale: 3 },
      { label: "Rest this summer", reply: "Body needs a real summer off this time", karma: 1, morale: 1 },
    ],
  },

  /* ── the summer before a contract year ── */
  {
    id: "contract_agent", from: "Agent", emoji: "💼", phase: "any", beat: "contract",
    text: "Last year of the deal coming up. Bet on yourself and play it out, or tell the GM we want to talk now?",
    choices: [
      { label: "Bet on myself", reply: "Play it out. Let the tape do the talking", karma: 1, morale: 4 },
      { label: "Tell him we want to talk", reply: "Open the door. Quietly", karma: 2, morale: -1 },
      { label: "Leak that I want the max", reply: "Let it slip that I want every dollar I can get", karma: -6, popularity: 2, morale: 2 },
    ],
  },
  {
    id: "contract_gm", from: "GM", emoji: "📋", phase: "any", beat: "contract",
    text: "Contract year. We want you here long term. Keep it out of the papers and we'll get something done.",
    choices: [
      { label: "Quiet talks, deal", reply: "Deal. Nothing goes to the papers from my side", karma: 5, morale: 2 },
      { label: "My agent handles that", reply: "Talk to my agent. I just hoop", karma: -1, morale: 1 },
    ],
  },
  {
    id: "contract_vet", from: "Veteran teammate", emoji: "🧔", phase: "any", beat: "contract",
    text: "Contract years get loud. Don't let the money talk get in your head. Hoop first, the bag follows.",
    choices: [
      { label: "Thank him", reply: "Needed that. Appreciate you", karma: 4, morale: 3 },
      { label: "Easy for you to say", reply: "Easy to say when you already got yours", karma: -3, morale: -1 },
    ],
  },
  {
    id: "contract_advisor", from: "Financial advisor", emoji: "📈", phase: "any", beat: "contract",
    text: "If you hit free agency next summer the new money changes everything. Want a plan now, before the calls start?",
    choices: [
      { label: "Make a plan", reply: "Let's sit down this week. Real plan", karma: 3, morale: 2, cash: -0.05 },
      { label: "Later", reply: "After the season. One thing at a time", karma: 0 },
    ],
  },
];

/** What makes the inbox the NBA one. Data, not rules. Three a season rather
 *  than the between-seasons phone's two, because the basketball year has more
 *  beats, the same call Round 796 made for the NFL. */
export const NBA_INBOX: InboxSport<NbaCareerState> = {
  pool: NBA_INBOX_POOL,
  moodOf: c => c.karma ?? 50,
  setMood: (c, v) => { c.karma = v; },
  addPopularity: (c, delta) => { c.fanbase = clamp(c.fanbase + delta, 0, 100); },
  addCash: (c, amount) => { c.netWorth = Math.round(((c.netWorth ?? 0) + amount) * 10) / 10; },
  ageOf: c => c.age,
  yearOf: c => (c.seasons.length > 0 ? c.seasons[c.seasons.length - 1].year : c.year),
  maxInbox: 6,
  wantPerSeason: 3,
  calendar: NBA_CALENDAR,
};

/**
 * Round 822: the beats the season just played actually had, read off the
 * line the engine wrote and the deal as it stands after the year ticked
 * over. A suspended year had no basketball in it, only the offseason. A
 * playoff run is a playoff game played. Summer league comes back once, the
 * July after the rookie season. The contract beat is the summer before the
 * last year of a deal, which is when the extension talk opens. Whether the
 * career goes on is not this reader's question: the shared tick drops every
 * `ahead` beat for a career that ends this season.
 */
export function nbaSeasonBeats(c: NbaCareerState): string[] {
  const line = c.seasons[c.seasons.length - 1];
  if (!line || line.teamResult === "SUSPENDED") return ["offseason"];
  const beats = ["camp", "deadline", "allstar"];
  if ((line.poGames ?? 0) > 0) beats.push("playoffs");
  beats.push("offseason");
  if (c.seasons.length === 1) beats.push("summer");
  if (!c.retired && c.contractYears === 1) beats.push("contract");
  return beats;
}

/** One season of the inbox. The NBA has no youth phase, so it always answers
 *  "pro"; every template above is gated "any" or by age rather than phase
 *  for exactly that reason. `goesOn` false (the career ends this season)
 *  keeps every `ahead` beat and `ahead` text out of it. With no `rng` it
 *  draws from the inbox's own keyed stream, never the season's. */
export function receiveNbaInboxTexts(c: NbaCareerState, goesOn = true, rng?: () => number): InboxMessage[] {
  return receiveCalendarInboxTextsFor(c, "pro", NBA_INBOX, rng ?? inboxStream(c, "season"), nbaSeasonBeats(c), goesOn && !c.retired);
}

/** Round 822: draft night, and the summer league that follows it before a
 *  game is played, so no mood drift: no season has passed. */
export function nbaDraftNightInbox(c: NbaCareerState, rng?: () => number): InboxMessage[] {
  return deliverInboxTextsFor(c, "pro", NBA_INBOX, rng ?? inboxStream(c, "draft"), ["draft", "summer"]);
}

export function nbaUnreadInboxCount(c: NbaCareerState): number {
  return unreadInboxCountFor(c);
}

/** Answer one message. Returns the line for the feed, or null when the
 *  message does not exist, is already answered, or the choice is invalid. */
export function answerNbaInboxMessage(c: NbaCareerState, msgId: string, choiceIdx: number): string | null {
  return answerInboxMessageFor(c, msgId, choiceIdx, NBA_INBOX);
}
