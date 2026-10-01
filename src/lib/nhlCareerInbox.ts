/* ─── Round 525: the NHL career's inbox ──────────────────────────────────────

   The same depth gap the NFL career closed in Round 521: texts arrive
   between seasons on the engine careerInbox.ts lifted from the flagship's
   phone, bound to hockey the same way nhlCareerMoney.ts binds the bank.
   Nothing below is a rule, it is data: the message bank, and four small
   closures saying which of the NHL save's own fields the mood meter and
   the standing meter actually are. scripts/simCareerInbox.mjs fails if this
   file grows a rule of its own.

   Mood meter: a fresh `karma` field, the exact same 0-100 neutral-50 meter
   the flagship's phone and the NFL's inbox already run, absent on any save
   from before this round and repaired lazily the same way ensureNhlMoney
   repairs the bank. Standing meter: the fanbase the hub already shows, so a
   good reply and a bad one land somewhere the player can already see.

   Round 822: THE HOCKEY CALENDAR, the NFL's Round 796 calendar reaching the
   NHL. Every text belongs to a beat of the hockey year (draft day, camp, the
   World Juniors over the holidays while you are still young enough for them,
   the All-Star break, the trade deadline, the playoffs, the offseason, and
   the summer before a contract year) and only arrives on a season that
   actually had that beat: no playoff texts in a year the team missed them,
   no World Juniors once you are past 19, no contract year texts with three
   years left on the deal. nhlSeasonBeats reads which beats a season had off
   the season line the engine already wrote; the delivery rule, the final
   season gate and the inbox's own random stream are careerInbox.ts's, shared
   with the other three careers. The ids of the twenty four Round 525
   templates are unchanged, so a save that already used one never sees it
   again.

   LEGAL SHAPE. Every "from" below is a role (Mom, Agent, a teammate, a
   beat writer), never a name, and nothing here ever speaks as the rival:
   the rival's own voice lives only in nhlCareerRivalryEvents.ts, narrated
   rather than quoted, the same rule the flagship's texts already follow. */

import type { NhlCareerState } from "./nhlMyCareer";
import {
  receiveCalendarInboxTexts as receiveCalendarInboxTextsFor,
  deliverInboxTexts as deliverInboxTextsFor,
  answerInboxMessage as answerInboxMessageFor,
  unreadInboxCount as unreadInboxCountFor,
  inboxStream,
} from "./careerInbox";
import type { InboxSport, InboxMessageDef, InboxMessage, InboxBeat } from "./careerInbox";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Round 822: the hockey year, in the order it runs. The World Juniors is the
 *  under 20 tournament over the holidays, so it only comes round in a season
 *  you start at 19 or younger. */
export const NHL_CALENDAR: InboxBeat[] = [
  { id: "draft", label: "Draft day", emoji: "🎓", oneOff: true },
  { id: "camp", label: "Training camp", emoji: "🏒" },
  { id: "juniors", label: "World Juniors", emoji: "🌍", oneOff: true },
  { id: "allstar", label: "All-Star break", emoji: "⭐" },
  { id: "deadline", label: "Trade deadline", emoji: "⏰" },
  { id: "playoffs", label: "Playoffs", emoji: "🏆", oneOff: true },
  { id: "offseason", label: "Offseason", emoji: "🌴" },
  { id: "contract", label: "Contract year ahead", emoji: "✍️", oneOff: true, ahead: true },
];

/* The bank. Every template is gated on the role writing it rather than a
   name, tagged with the beat it belongs to, and every choice's effect is
   small on purpose: this is flavor and a mood meter, never a lever worth
   grinding. Ages are the career's own age field, which starts at 18 or 19 on
   draft day. */
const NHL_INBOX_POOL: InboxMessageDef[] = [
  /* ── draft day ── */
  {
    id: "draft_agent", from: "Agent", emoji: "💼", phase: "any", beat: "draft",
    text: "Congrats, you're a pro. A stick company and a skate company already called. Do the deals now, or wait until you've played a shift?",
    choices: [
      { label: "Sign everything", reply: "Sign it all. Rookie money doesn't last", karma: -3, cash: 0.3, popularity: 1 },
      { label: "Just the sticks", reply: "Stick deal only for now. The rest can wait", karma: 1, cash: 0.1 },
      { label: "Wait until I earn it", reply: "Nothing until I've done something on the ice", karma: 6, morale: 2 },
    ],
  },
  {
    id: "draft_coach", from: "Head coach", emoji: "🧢", phase: "any", beat: "draft",
    text: "Welcome. Rookies here are first on the ice and last off it. Nobody gets handed a spot. See you at development camp.",
    choices: [
      { label: "Yes coach, see you early", reply: "Yes coach. I'll be on the ice before the ice crew is done", karma: 6, morale: 3 },
      { label: "I'm here to make the team", reply: "Respect coach. I'm not going back to junior though", karma: -2, morale: 2, popularity: 1 },
    ],
  },
  {
    id: "draft_mom", from: "Mom", emoji: "❤️", phase: "any", beat: "draft",
    text: "I cried when they called your name. Your billet family called too, they're over the moon. Come home before camp?",
    choices: [
      { label: "Fly home for the weekend", reply: "Booking it now. Save me a plate", karma: 8, morale: 5, cash: -0.05 },
      { label: "After camp, promise", reply: "After camp mom, I promise. Love you", karma: 1, morale: 1 },
    ],
  },
  {
    id: "draft_gm", from: "GM", emoji: "📋", phase: "any", beat: "draft",
    text: "We had you circled for months. A lot of people here put their names on that pick. Don't make us look bad.",
    choices: [
      { label: "You won't regret it", reply: "You'll never regret it. Promise", karma: 4, morale: 3 },
      { label: "Then pay me like it", reply: "Then the second contract better reflect it", karma: -5, morale: 1, popularity: 1 },
    ],
  },
  {
    id: "draft_scout", from: "Scout", emoji: "📝", phase: "any", beat: "draft",
    text: "Watched you play in a rink so cold my coffee froze. Wrote your name down that night. Proud of you, kid.",
    choices: [
      { label: "Thank him properly", reply: "You saw it before anybody. Tickets for you whenever you want", karma: 8, morale: 4 },
      { label: "Thumbs up emoji", reply: "👍", karma: -2 },
    ],
  },

  /* ── training camp ── */
  {
    id: "rookie_advice", from: "Rookie", emoji: "🌱", phase: "any", maxAge: 30, beat: "camp",
    text: "Just got the stall next to yours. Any advice? Honestly kind of terrified.",
    choices: [
      { label: "Take him under your wing", reply: "Come in early tomorrow, we'll watch extra video together. You'll be fine", karma: 9, morale: 3 },
      { label: "One line of advice", reply: "Learn the systems before you learn the city. Rest follows", karma: 4 },
      { label: "Big time him", reply: "Earn it like I did", karma: -7 },
    ],
  },
  {
    id: "rookie_dinner", from: "Veteran teammate", emoji: "🍽️", phase: "any", maxAge: 26, beat: "camp",
    text: "Rookie dinner tradition. Bill's coming to about six grand between the whole room. You're covering it, welcome to the league.",
    choices: [
      { label: "Pay it and laugh it off", reply: "Worth every cent. Table's on me boys", karma: 6, morale: -2, cash: -0.6 },
      { label: "Negotiate it down", reply: "I'll cover half, deal?", karma: 2 },
      { label: "Refuse", reply: "Not doing that. Sorry", karma: -8, morale: -3 },
    ],
  },
  {
    id: "camp_fitness", from: "Strength coach", emoji: "🚴", phase: "any", beat: "camp",
    text: "Fitness testing tomorrow. The bike test, the one everybody hates. You ready?",
    choices: [
      { label: "Been riding all summer", reply: "Ready. I've been on the bike all summer", karma: 3, morale: 2 },
      { label: "Ask to push it a day", reply: "Any chance I go last, legs are cooked", karma: -3, morale: 1 },
    ],
  },
  {
    id: "camp_linemates", from: "Assistant coach", emoji: "📺", phase: "any", beat: "camp",
    text: "Trying you with two new linemates this camp. Want to sit down with them over video before the first skate?",
    choices: [
      { label: "Set it up tonight", reply: "Tonight works. I'll bring the food", karma: 5, morale: 2 },
      { label: "We'll figure it out on the ice", reply: "We'll sort it out on the ice coach", karma: -2, morale: 1 },
    ],
  },
  {
    id: "camp_captain", from: "Captain", emoji: "©️", phase: "any", beat: "camp",
    text: "Team building trip before the season. Canoes, campfire, no phones for two days. Everybody goes. You good with that?",
    choices: [
      { label: "I'll bring the guitar", reply: "I'm in. Somebody has to bring the guitar", karma: 4, morale: 4 },
      { label: "No phones is rough", reply: "I'll go but I'm not happy about the phone thing", karma: -1, morale: 1 },
    ],
  },

  /* ── the World Juniors ── */
  {
    id: "juniors_coach", from: "National junior coach", emoji: "🌍", phase: "any", beat: "juniors",
    text: "We want you for the World Juniors over the holidays. Your club has to agree to loan you. Want us to ask?",
    choices: [
      { label: "Ask, I want to go", reply: "Ask them. I want to wear the national jersey", karma: 4, morale: 4, popularity: 3 },
      { label: "Stay with the club", reply: "I want to stay and keep my spot here", karma: 1, morale: -1 },
    ],
  },
  {
    id: "juniors_gm", from: "GM", emoji: "📋", phase: "any", beat: "juniors",
    text: "Your national team asked to borrow you for the World Juniors. Your call. We'll miss you either way.",
    choices: [
      { label: "I'd love to go", reply: "I'd love to go. I'll come back better", karma: 3, morale: 4, popularity: 2 },
      { label: "Keep me here", reply: "I'd rather stay and help us win here", karma: 3, morale: 1 },
    ],
  },
  {
    id: "juniors_mom", from: "Mom", emoji: "❤️", phase: "any", beat: "juniors",
    text: "If you play in the World Juniors I'm booking flights tonight. Your grandmother wants to come too.",
    choices: [
      { label: "Book them, I'll cover it", reply: "Book them both. I've got the flights", karma: 7, morale: 4, cash: -0.03 },
      { label: "Watch it at home", reply: "It's a long trip mom, watch it at home with everybody", karma: -1 },
    ],
  },

  /* ── the All-Star break ── */
  {
    id: "allstar_break_party", from: "Promoter", emoji: "🎉", phase: "any", minAge: 23, beat: "allstar",
    text: "Biggest party of the year tonight. Table's got your name on it. All-Star break starts tomorrow btw.",
    choices: [
      { label: "Stay home and rest", reply: "Rest week for a reason. Another time", karma: 6, morale: 2 },
      { label: "Go but leave early", reply: "One hour max, then I'm gone", karma: -3, popularity: 2 },
      { label: "Full send", reply: "Save me the good table", karma: -9, popularity: 4, morale: 3 },
    ],
  },
  {
    id: "junior_coach", from: "Junior coach", emoji: "👴", phase: "any", beat: "allstar",
    text: "Watched you on TV Saturday. Still remember you at 15 refusing to dump the puck in like I told you. Proud of you kid.",
    choices: [
      { label: "Thank him properly", reply: "Everything started with you coach. Tickets for you whenever you want, for life", karma: 8, morale: 5 },
      { label: "Thumbs up emoji", reply: "👍", karma: -3 },
    ],
  },
  {
    id: "billet_family", from: "Old billet family", emoji: "🏠", phase: "any", beat: "allstar",
    text: "Still can't believe the kid who ate us out of house and cabin during junior is on TV every night. We're so proud of you.",
    choices: [
      { label: "Send them tickets", reply: "Box seats whenever you want them. You two raised me as much as anyone did", karma: 10, morale: 4, cash: -0.2 },
      { label: "Thank them warmly", reply: "Never forget what you two did for me. Love you both", karma: 6, morale: 3 },
      { label: "Let it sit", reply: "", karma: -3 },
    ],
  },
  {
    id: "kid_dm", from: "Fan DM", emoji: "🧒", phase: "any", beat: "allstar",
    text: "youre my favorite player ever. im in the hospital and all i want is a signed stick. no worries if youre busy",
    choices: [
      { label: "Send a signed stick and visit", reply: "Stick is on the way and I'm coming to see you next week. Stay strong", karma: 12, popularity: 6, cash: -0.1 },
      { label: "Send the stick", reply: "On its way little legend", karma: 6, popularity: 3 },
      { label: "Ignore it", reply: "", karma: -8 },
    ],
  },
  {
    id: "allstar_pond", from: "Old teammate", emoji: "❄️", phase: "any", beat: "allstar",
    text: "Pond hockey tournament back home over the break. Outdoor ice, no refs, no systems. Coming?",
    choices: [
      { label: "Lace them up", reply: "Save me a spot. Bringing my old skates", karma: 3, morale: 4, popularity: 2 },
      { label: "Rest the legs", reply: "Legs need the break this year. Next time", karma: 1, morale: 1 },
    ],
  },

  /* ── the trade deadline ── */
  {
    id: "mom_call", from: "Mom", emoji: "❤️", phase: "any", beat: "deadline",
    text: "Haven't heard from you since the road trip started sweetheart. Everything okay out there? Call me when you get a second.",
    choices: [
      { label: "Call her from the bus", reply: "Calling you right after the morning skate, promise. Love you", karma: 8, morale: 6 },
      { label: "Leave it on read", reply: "", karma: -6, morale: -2 },
    ],
  },
  {
    id: "teammate_scratched", from: "Teammate", emoji: "😤", phase: "any", beat: "deadline",
    text: "Healthy scratch again tonight man. Thinking about asking for a trade. What would you do?",
    choices: [
      { label: "Be honest with him", reply: "You deserve a jersey mate. If he won't give you one, go get it somewhere else", karma: 6, morale: 2 },
      { label: "Tell him to stop whining", reply: "Outwork him then. Nobody owes you a lineup spot", karma: -5 },
      { label: "Dodge the question", reply: "Tough one bro. Sleep on it", karma: -1 },
    ],
  },
  {
    id: "equipment_manager_gear", from: "Equipment manager", emoji: "🧺", phase: "any", beat: "deadline",
    text: "You left your road gear at the hotel again. Team wants to fine you. I can cover for you this once.",
    choices: [
      { label: "Own it, pay the fine", reply: "My fault Tony. I'll pay it. Lunch is on me too", karma: 7, cash: -0.05 },
      { label: "Let him cover for you", reply: "You're a legend. I owe you", karma: -5, morale: 2 },
    ],
  },
  {
    id: "beat_writer_leak", from: "Beat writer", emoji: "📰", phase: "any", beat: "deadline",
    text: "I know the room turned on the coach's systems. Give me the inside story, you stay anonymous.",
    choices: [
      { label: "Keep it in house", reply: "Nothing to tell. Room stays in the room", karma: 8, morale: 2 },
      { label: "Leak it", reply: "Ok but this NEVER came from me", karma: -10, popularity: 3 },
    ],
  },
  {
    id: "lost_wallet", from: "Arena staff", emoji: "👛", phase: "any", beat: "deadline",
    text: "Found a wallet in the players' lot with 800 bucks in it. No ID. What do I do with it?",
    choices: [
      { label: "Hand it to security", reply: "Security, mate. Someone's having a bad day", karma: 6 },
      { label: "Finders keepers", reply: "That's the hockey gods paying you. Keep it", karma: -6 },
    ],
  },
  {
    id: "injury_teammate", from: "Teammate", emoji: "🏥", phase: "any", beat: "deadline",
    text: "Knee's gone. Nine months. Sitting in this hospital bed wondering if I'll ever skate the same, honestly.",
    choices: [
      { label: "Visit weekly", reply: "I'm there every week bro. Rehab buddies. You're coming back stronger", karma: 10, morale: 2 },
      { label: "Send a message", reply: "Gutted for you. Speedy recovery brother", karma: 3 },
      { label: "Read it later", reply: "", karma: -6 },
    ],
  },
  {
    id: "referee_apology", from: "League office", emoji: "🟨", phase: "any", beat: "deadline",
    text: "Your postgame comments about Tuesday's officiating went viral. We'd welcome a public clarification.",
    choices: [
      { label: "Apologize properly", reply: "I was out of line. Officials have the hardest job on the ice. Apologies", karma: 6, popularity: -1 },
      { label: "Double down", reply: "I said what I said", karma: -7, popularity: 5 },
    ],
  },
  {
    id: "deadline_agent", from: "Agent", emoji: "💼", phase: "any", minAge: 22, beat: "deadline",
    text: "Deadline is Friday. Two teams called asking about you. Want me to shut it down, or let the front office sweat a little?",
    choices: [
      { label: "Shut it down, I'm staying", reply: "Tell them I'm not going anywhere", karma: 6, popularity: 4, morale: 2 },
      { label: "Let them sweat", reply: "Don't say anything. Let them wonder", karma: -4, morale: 3 },
    ],
  },
  {
    id: "deadline_traded", from: "Teammate", emoji: "📦", phase: "any", beat: "deadline",
    text: "They traded me. Packing my bag in the dressing room right now. Been a good run with you.",
    choices: [
      { label: "Help him pack and drive him", reply: "Don't move. I'm coming to help and I'm driving you to the airport", karma: 8, morale: -1 },
      { label: "Text him good luck", reply: "Gonna miss you. Go light the lamp over there", karma: 3 },
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
    id: "beard_shave", from: "Local barber", emoji: "🧔", phase: "any", beat: "playoffs",
    text: "That playoff beard is a whole personality at this point. Shave it live on stream for the children's charity?",
    choices: [
      { label: "Shave it for charity", reply: "Chair. Tomorrow. Do your worst, it's for a good cause", karma: 8, popularity: 5, cash: -0.3 },
      { label: "Keep the beard", reply: "Sorry, this thing is staying until we're eliminated or we win it all", karma: 1 },
    ],
  },
  {
    id: "playoffs_meeting", from: "Head coach", emoji: "🧢", phase: "any", beat: "playoffs",
    text: "Playoff hockey. Everything since camp was for this. Players only meeting tonight, and I want you to talk.",
    choices: [
      { label: "Speak from the heart", reply: "I'll talk. They'll hear it", karma: 6, morale: 4, popularity: 2 },
      { label: "Let the vets talk", reply: "Let the vets have the floor. I'll lead on the ice", karma: 1, morale: 1 },
    ],
  },
  {
    id: "playoffs_tickets", from: "Mom", emoji: "🎟️", phase: "any", beat: "playoffs",
    text: "The whole family wants playoff tickets. All fourteen of us. Your uncle is painting his face.",
    choices: [
      { label: "Buy them all", reply: "Fourteen tickets, done. Tell him to go big with the paint", karma: 7, morale: 3, cash: -0.1 },
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
    id: "playoffs_radio", from: "Local radio", emoji: "📻", phase: "any", beat: "playoffs",
    text: "We'd love you on the morning show before Game 1. Ten minutes, fire the city up.",
    choices: [
      { label: "Do it, hype the city", reply: "I'm in. Let's get this town loud", karma: 1, popularity: 4, morale: -1 },
      { label: "Decline, locked in", reply: "Locked in this week. After we win", karma: 3, morale: 2 },
    ],
  },

  /* ── the offseason ── */
  {
    id: "scam_prize", from: "Unknown", emoji: "🎣", phase: "any", beat: "offseason",
    text: "CONGRATULATIONS! You've won 2 MILLION DOLLARS. Just send your account info plus a small release fee to claim it.",
    choices: [
      { label: "Report and warn fans", reply: "Posting this so nobody falls for it. Stay safe out there", karma: 7, popularity: 3 },
      { label: "Delete it", reply: "", karma: 1 },
      { label: "Reply as a joke", reply: "Amazing news!! My account number is 1-2-3-GET-A-JOB", karma: 2, popularity: 2 },
    ],
  },
  {
    id: "agent_gear", from: "Agent", emoji: "💼", phase: "any", beat: "offseason", ahead: true,
    text: "Stick and skate deal on the table. Good money, but the brand got caught running sweatshops last year. Your call.",
    choices: [
      { label: "Take the money", reply: "Money is money. Send the contract", karma: -7, cash: 1.2 },
      { label: "Turn it down publicly", reply: "Not wearing that. And I'm saying why", karma: 9, popularity: 4 },
      { label: "Quietly decline", reply: "Pass on this one. Keep it quiet", karma: 4 },
    ],
  },
  {
    id: "charity_game", from: "Foundation", emoji: "🎗️", phase: "any", minAge: 23, beat: "offseason",
    text: "We're hosting a children's hospital charity game Friday. Would mean the world if you dropped the puck. Press will be there.",
    choices: [
      { label: "Go and donate", reply: "Count me in. And put me down for a donation", karma: 10, popularity: 5, cash: -0.5 },
      { label: "Go for the cameras only", reply: "I'll swing by for an hour", karma: 2, popularity: 3 },
      { label: "Skip it", reply: "Can't make it, good luck", karma: -6 },
    ],
  },
  {
    id: "crypto_bro", from: "Old billet kid", emoji: "🪙", phase: "any", minAge: 23, beat: "offseason",
    text: "Bro I need you to shout out my new coin PuckCoin to your followers. Guaranteed 100x. Family discount for the old billet house.",
    choices: [
      { label: "Hard pass", reply: "Not putting my fans into that. Look after yourself", karma: 7 },
      { label: "Promote it", reply: "Sending the post now. We better get rich", karma: -11, cash: 0.8, popularity: -3 },
    ],
  },
  {
    id: "summer_skate", from: "Skills coach", emoji: "🏋️", phase: "any", beat: "offseason", ahead: true,
    text: "Optional 6am skates all summer. Brutal but they work. Half the room is skipping them.",
    choices: [
      { label: "Sign up", reply: "Put my name down. First one on, last one off", karma: 5, morale: -2 },
      { label: "Skip them", reply: "Recovery is part of training too coach", karma: -3, morale: 2 },
    ],
  },
  {
    id: "tax_scheme", from: "Financial advisor", emoji: "🏝️", phase: "any", minAge: 25, beat: "offseason",
    text: "New structure for your endorsement money. Runs through three provinces with almost no tax. Technically legal. Probably.",
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
      { label: "Decline", reply: "Room stays sacred. Pass", karma: 3 },
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
    id: "hometown_rink", from: "Community rink", emoji: "🏗️", phase: "any", minAge: 24, beat: "offseason",
    text: "The rink you grew up skating on is closing without funding. Two hundred kids skate there every winter.",
    choices: [
      { label: "Fund it and rename it", reply: "I'll cover it. Name it after my old coach, not me", karma: 12, popularity: 5, cash: -1.2 },
      { label: "Fund it quietly", reply: "Send the invoice to my foundation. No press", karma: 10, cash: -1.2 },
      { label: "Share a fundraiser", reply: "Posting the link, let's all chip in", karma: 4, popularity: 1 },
    ],
  },
  {
    id: "grandpa_visit", from: "Grandpa", emoji: "🧓", phase: "any", beat: "offseason",
    text: "Never miss you on Saturdays now that I've got the package. Hip's too bad for the rink these days. Bring the trophy round some day, yeah?",
    choices: [
      { label: "Visit with your jersey", reply: "Coming round Saturday off with a jersey and a puck from the game. Put the kettle on", karma: 9, morale: 5 },
      { label: "Promise vaguely", reply: "One day grandpa, promise", karma: 1 },
    ],
  },
  {
    id: "hockey_school", from: "Hockey school", emoji: "⛸️", phase: "any", minAge: 22, beat: "offseason",
    text: "Want to teach at our kids hockey school for a week this summer? Three hundred kids, one rink, a lot of tiny helmets.",
    choices: [
      { label: "Teach all week", reply: "Sign me up for the whole week. I'll bring pucks", karma: 9, popularity: 3, morale: 2 },
      { label: "One afternoon", reply: "I can do one afternoon, signing and a drill or two", karma: 4, popularity: 1 },
      { label: "Not this summer", reply: "Can't this summer, sorry", karma: -2 },
    ],
  },

  /* ── the summer before a contract year ── */
  {
    id: "contract_agent", from: "Agent", emoji: "💼", phase: "any", beat: "contract",
    text: "Last year of the deal coming up. Bet on yourself and play it out, or tell the GM we want to talk now?",
    choices: [
      { label: "Bet on myself", reply: "Play it out. Let the tape do the talking", karma: 1, morale: 4 },
      { label: "Tell him we want to talk", reply: "Open the door. Quietly", karma: 2, morale: -1 },
      { label: "Leak that I want top money", reply: "Let it slip that I want to be paid like the best at my spot", karma: -6, popularity: 2, morale: 2 },
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
    id: "contract_vet", from: "Veteran teammate", emoji: "🧔", phase: "any", beat: "contract",
    text: "Contract years get loud. Don't let the money talk get in your head. Play your game, the money follows.",
    choices: [
      { label: "Thank him", reply: "Needed that. Appreciate you", karma: 4, morale: 3 },
      { label: "Easy for you to say", reply: "Easy to say when you already got yours", karma: -3, morale: -1 },
    ],
  },
  {
    id: "contract_advisor", from: "Financial advisor", emoji: "📈", phase: "any", beat: "contract",
    text: "If you hit the market next summer the new money changes everything. Want a plan now, before the calls start?",
    choices: [
      { label: "Make a plan", reply: "Let's sit down this week. Real plan", karma: 3, morale: 2, cash: -0.05 },
      { label: "Later", reply: "After the season. One thing at a time", karma: 0 },
    ],
  },
];

/** What makes the inbox the NHL one. Data, not rules. Three a season rather
 *  than the between-seasons phone's two, because the hockey year has more
 *  beats, the same call Round 796 made for the NFL. */
export const NHL_INBOX: InboxSport<NhlCareerState> = {
  pool: NHL_INBOX_POOL,
  moodOf: c => c.karma ?? 50,
  setMood: (c, v) => { c.karma = v; },
  addPopularity: (c, delta) => { c.fanbase = clamp(c.fanbase + delta, 0, 100); },
  addCash: (c, amount) => { c.netWorth = Math.round(((c.netWorth ?? 0) + amount) * 10) / 10; },
  ageOf: c => c.age,
  yearOf: c => (c.seasons.length > 0 ? c.seasons[c.seasons.length - 1].year : c.year),
  maxInbox: 6,
  wantPerSeason: 3,
  calendar: NHL_CALENDAR,
};

/**
 * Round 822: the beats the season just played actually had, read off the
 * line the engine wrote and the deal as it stands after the year ticked
 * over. A suspended year had no hockey in it, only the offseason. The World
 * Juniors is a season started at 19 or younger. A playoff run is a playoff
 * game played. The contract beat is the summer before the last year of a
 * deal, which is when the extension talk opens. Whether the career goes on is
 * not this reader's question: the shared tick drops every `ahead` beat for a
 * career that ends this season.
 */
export function nhlSeasonBeats(c: NhlCareerState): string[] {
  const line = c.seasons[c.seasons.length - 1];
  if (!line || line.teamResult === "SUSPENDED") return ["offseason"];
  const beats = ["camp"];
  if (line.age <= 19) beats.push("juniors");
  beats.push("allstar", "deadline");
  if ((line.poGames ?? 0) > 0) beats.push("playoffs");
  beats.push("offseason");
  if (!c.retired && c.contractYears === 1) beats.push("contract");
  return beats;
}

/** One season of the inbox. Hockey has no youth phase on the save, so it
 *  always answers "pro"; every template above is gated "any" or by age
 *  rather than phase for exactly that reason. `goesOn` false (the career
 *  ends this season) keeps every `ahead` beat and `ahead` text out of it.
 *  With no `rng` it draws from the inbox's own keyed stream, never the
 *  season's. */
export function receiveNhlInboxTexts(c: NhlCareerState, goesOn = true, rng?: () => number): InboxMessage[] {
  return receiveCalendarInboxTextsFor(c, "pro", NHL_INBOX, rng ?? inboxStream(c, "season"), nhlSeasonBeats(c), goesOn && !c.retired);
}

/** Round 822: draft day. The text that lands the moment your name is called,
 *  before a shift is played, so no mood drift: no season has passed. */
export function nhlDraftNightInbox(c: NhlCareerState, rng?: () => number): InboxMessage[] {
  return deliverInboxTextsFor(c, "pro", NHL_INBOX, rng ?? inboxStream(c, "draft"), ["draft"]);
}

export function nhlUnreadInboxCount(c: NhlCareerState): number {
  return unreadInboxCountFor(c);
}

/** Answer one message. Returns the line for the feed, or null when the
 *  message does not exist, is already answered, or the choice is invalid. */
export function answerNhlInboxMessage(c: NhlCareerState, msgId: string, choiceIdx: number): string | null {
  return answerInboxMessageFor(c, msgId, choiceIdx, NHL_INBOX);
}
