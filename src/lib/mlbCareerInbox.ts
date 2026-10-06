/* ─── Round 525: the MLB career's inbox ──────────────────────────────────────

   His 2026-08-28 backlog row "Bring the Soccer Career depth to the NFL
   career, then the other US careers" is why Round 521 gave the NFL career
   an inbox and rivalry events, and this is that same pair reaching MLB. Texts
   arrive between seasons the same way they always have on the flagship's
   phone, on the engine careerInbox.ts, bound to baseball the same way
   nflCareerInbox.ts bound it to football and mlbCareerMoney.ts binds the
   bank. Nothing below is a rule, it is data: the message bank, and four
   small closures saying which of the MLB save's own fields the mood meter
   and the standing meter actually are. scripts/simCareerInbox.mjs fails if
   this file grows a rule of its own.

   Mood meter: a fresh `karma` field, the exact same 0-100 neutral-50 meter
   the flagship's phone and the NFL career already run, absent on any save
   from before this round and repaired lazily the same way ensureMlbMoney
   repairs the bank. Standing meter: the fanbase the hub already shows, so a
   good reply and a bad one land somewhere the player can already see.

   Round 822: THE BASEBALL CALENDAR, the NFL's Round 796 calendar reaching
   MLB. Every text belongs to a beat of the baseball year (draft day, spring
   training, the All-Star break, the trade deadline, September, October, the
   offseason, an arbitration winter and a free agency winter) and only arrives
   on a season that actually had that beat: no October texts in a year the
   club went home in September, arbitration only in the three winters a
   player under team control is eligible for it (after his third, fourth and
   fifth seasons, the six years of control the career starts on), free agency
   only the winter a deal runs out. mlbSeasonBeats reads which beats a season
   had off the season line the engine already wrote; the delivery rule, the
   final season gate and the inbox's own random stream are careerInbox.ts's,
   shared with the other three careers. The ids of the twenty two Round 525
   templates are unchanged, so a save that already used one never sees it
   again.

   LEGAL SHAPE. Every "from" below is a role (Mom, Agent, a teammate, a beat
   writer), never a name, and nothing here ever speaks as the rival: the
   rival's own voice lives only in mlbCareerRivalryEvents.ts, narrated rather
   than quoted, the same rule the flagship's texts already follow. */

import type { MlbCareerState } from "./mlbMyCareer";
import {
  receiveCalendarInboxTexts as receiveCalendarInboxTextsFor,
  deliverInboxTexts as deliverInboxTextsFor,
  answerInboxMessage as answerInboxMessageFor,
  unreadInboxCount as unreadInboxCountFor,
  inboxStream,
} from "./careerInbox";
import type { InboxSport, InboxMessageDef, InboxMessage, InboxBeat } from "./careerInbox";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Round 822: the baseball year, in the order it runs. */
export const MLB_CALENDAR: InboxBeat[] = [
  { id: "draft", label: "Draft day", emoji: "🎓", oneOff: true },
  { id: "spring", label: "Spring training", emoji: "🌵" },
  { id: "allstar", label: "All-Star break", emoji: "⭐" },
  { id: "deadline", label: "Trade deadline", emoji: "⏰" },
  { id: "september", label: "September", emoji: "🍂" },
  { id: "october", label: "October", emoji: "🏆", oneOff: true },
  { id: "offseason", label: "Offseason", emoji: "❄️" },
  { id: "arbitration", label: "Arbitration winter", emoji: "⚖️", oneOff: true, ahead: true },
  { id: "freeagency", label: "Free agency", emoji: "✍️", oneOff: true, ahead: true },
];

/* The bank. Every template is gated on the role writing it rather than a
   name, tagged with the beat it belongs to, and every choice's effect is
   small on purpose: this is flavor and a mood meter, never a lever worth
   grinding. Ages are the career's own age field, which starts at 21 on draft
   day; the templates are gated "any" or by age rather than a youth phase,
   since MLB My Career has no separate youth phase either. */
const MLB_INBOX_POOL: InboxMessageDef[] = [
  /* ── draft day ── */
  {
    id: "draft_agent", from: "Agent", emoji: "💼", phase: "any", beat: "draft",
    text: "Congrats on draft day. A bat company and a glove company already called. Sign now, or wait until you've done something?",
    choices: [
      { label: "Sign everything", reply: "Sign it all. Money's money", karma: -3, cash: 0.3, popularity: 1 },
      { label: "Just the glove", reply: "Glove deal only for now. The rest can wait", karma: 1, cash: 0.1 },
      { label: "Wait until I earn it", reply: "Nothing until I've done something on the field", karma: 6, morale: 2 },
    ],
  },
  {
    id: "draft_scout", from: "Area scout", emoji: "📝", phase: "any", beat: "draft",
    text: "Watched you play through a rain delay in front of eleven people. Wrote big leaguer in my report that night. Proud of you.",
    choices: [
      { label: "Thank him properly", reply: "You saw it before anybody. Tickets for you whenever you want", karma: 8, morale: 4 },
      { label: "Thumbs up emoji", reply: "👍", karma: -2 },
    ],
  },
  {
    id: "draft_mom", from: "Mom", emoji: "❤️", phase: "any", beat: "draft",
    text: "I screamed so loud the neighbors came over. Your grandma wants to frame the announcement. Come home before you report?",
    choices: [
      { label: "Fly home for the weekend", reply: "Booking it now. Save me a plate", karma: 8, morale: 5, cash: -0.05 },
      { label: "After the season, promise", reply: "After the season mama, I promise. Love you", karma: 1, morale: 1 },
    ],
  },
  {
    id: "draft_manager", from: "Manager", emoji: "🧢", phase: "any", beat: "draft",
    text: "Welcome. We run hard to first and we're on time. That's it. That's the whole speech.",
    choices: [
      { label: "Yes sir", reply: "Hard to first, on time. Got it", karma: 5, morale: 2 },
      { label: "I'm here to play every day", reply: "Respect. I'm here to play every day though", karma: -2, morale: 2, popularity: 1 },
    ],
  },
  {
    id: "draft_college_coach", from: "College coach", emoji: "🎓", phase: "any", beat: "draft",
    text: "Proud of you. Remember the bus rides. Come back and throw BP to the young guys sometime.",
    choices: [
      { label: "Send the team new bats", reply: "Bats for the whole roster are on me. Tell them I said hi", karma: 9, popularity: 2, cash: -0.1 },
      { label: "Thank him", reply: "Wouldn't be here without you coach. I'll be back", karma: 5, morale: 2 },
    ],
  },
  /* Round 919: five more for draft day, which had five. */
  {
    id: "draft_hs_coach", from: "High school coach", emoji: "🏫", phase: "any", beat: "draft",
    text: "The booster club wants to paint your number on the outfield fence at the old field. Before they do: are you keeping the number or picking a new one?",
    choices: [
      { label: "Keep it, paint it big", reply: "Same number. Paint it big enough to see from the road", karma: 4, popularity: 2 },
      { label: "Send a signed bat for the trophy case", reply: "Signed bat is coming this week. Tell the kids to swing hard", karma: 7, popularity: 1, cash: -0.01 },
    ],
  },
  {
    id: "draft_bonus_advisor", from: "Financial advisor", emoji: "📈", phase: "any", beat: "draft",
    text: "Signing bonus lands next week. Before anybody sells you a truck, give me one hour. Most of it is taxes and the rest is a plan.",
    choices: [
      { label: "One hour, this week", reply: "Tuesday works. Bring the plan", karma: 4, morale: 1 },
      { label: "Truck first, plan second", reply: "Truck first. I've wanted it since I was twelve", karma: -3, morale: 3, cash: -0.06 },
    ],
  },
  {
    id: "draft_clubhouse", from: "Clubhouse manager", emoji: "🧺", phase: "any", beat: "draft",
    text: "Welcome. I need a cap size, a cleat size and a number. The one you wore in school belongs to a coach here and he is not giving it up.",
    choices: [
      { label: "Pick a new one", reply: "Give me whatever's open. I'll make people remember it", karma: 4, morale: 2 },
      { label: "Ask the coach anyway", reply: "Let me at least ask him. Worst he can say is no", karma: -1, popularity: 1 },
    ],
  },
  {
    id: "draft_farm_director", from: "Farm director", emoji: "🌱", phase: "any", beat: "draft",
    text: "Report Monday. We have a plan for your first summer: innings or at bats, a weight program, and one thing to fix. Want the one thing now?",
    choices: [
      { label: "Tell me now", reply: "Tell me now. I'll start on it tonight", karma: 5, morale: 1 },
      { label: "Let me enjoy tonight", reply: "Monday, I promise. Tonight is for my family", karma: 1, morale: 3 },
    ],
  },
  {
    id: "draft_best_friend", from: "Best friend", emoji: "🤝", phase: "any", beat: "draft",
    text: "bro you got DRAFTED. do i have to buy a jersey or do you just give me one",
    choices: [
      { label: "First one's yours", reply: "First jersey I get is yours. Signed", karma: 5, morale: 2 },
      { label: "Buy it like everybody else", reply: "Buy it like everybody else. Support the team", karma: 1, morale: 2, popularity: 1 },
    ],
  },

  /* ── spring training ── */
  {
    id: "teammate_bench", from: "Teammate", emoji: "😤", phase: "any", beat: "spring",
    text: "Been riding the bench again man. Thinking about asking for a trade. What would you do?",
    choices: [
      { label: "Be honest with him", reply: "You deserve at bats mate. If he won't give them, go get them somewhere", karma: 6, morale: 2 },
      { label: "Tell him to stop whining", reply: "Outwork him then. Nobody owes you a lineup spot", karma: -5 },
      { label: "Dodge the question", reply: "Tough one bro. Sleep on it", karma: -1 },
    ],
  },
  {
    id: "rookie_advice", from: "Rookie", emoji: "🌱", phase: "any", maxAge: 30, beat: "spring",
    text: "Just got the locker next to yours. Any advice? Honestly kind of terrified.",
    choices: [
      { label: "Take him under your wing", reply: "Come in early tomorrow, we'll get extra swings in together. You'll be fine", karma: 9, morale: 3 },
      { label: "One line of advice", reply: "Learn the scouting reports before you learn the city. Rest follows", karma: 4 },
      { label: "Big time him", reply: "Earn it like I did", karma: -7 },
    ],
  },
  {
    id: "early_cage", from: "Hitting coach", emoji: "🏋️", phase: "any", beat: "spring",
    text: "Optional 7am cage sessions all season. Brutal but they work. Half the room is skipping them.",
    choices: [
      { label: "Sign up", reply: "Put my name down. First one in, last one out", karma: 5, morale: -2 },
      { label: "Skip them", reply: "Recovery is part of training too coach", karma: -3, morale: 2 },
    ],
  },
  {
    id: "spring_bus", from: "Veteran teammate", emoji: "🚌", phase: "any", beat: "spring",
    text: "Split squad road game tomorrow, two hours on the bus. Vets don't usually go. You coming?",
    choices: [
      { label: "Get on the bus", reply: "Save me a seat. I'll bring the snacks", karma: 4, morale: -1 },
      { label: "Vets don't ride buses", reply: "That's what the young guys are for", karma: -4, morale: 2 },
    ],
  },
  {
    id: "spring_fence", from: "Fan DM", emoji: "✍️", phase: "any", beat: "spring",
    text: "we drove down from up north just for spring training. any chance u sign for my kids along the fence after BP?",
    choices: [
      { label: "Sign for every kid there", reply: "I'll be at the fence after BP. Bring a pen", karma: 8, popularity: 3 },
      { label: "Sign a couple", reply: "I'll get a few before I head in", karma: 3, popularity: 1 },
      { label: "Head straight in", reply: "", karma: -4 },
    ],
  },
  {
    id: "spring_golf", from: "Teammate", emoji: "⛳", phase: "any", minAge: 23, beat: "spring",
    text: "Tee time at one after the morning workout. Whole infield is going. You in?",
    choices: [
      { label: "I'm in", reply: "I'm in. Loser buys lunch", karma: 2, morale: 3 },
      { label: "Extra work instead", reply: "Going back to the cage. Next time", karma: 2, morale: -1 },
    ],
  },

  /* ── the All-Star break ── */
  {
    id: "offday_party", from: "Promoter", emoji: "🎉", phase: "any", minAge: 23, beat: "allstar",
    text: "Biggest party of the year tonight. Table's got your name on it. Off day tomorrow btw.",
    choices: [
      { label: "Stay home and rest", reply: "Off day for a reason. Another time", karma: 6, morale: 2 },
      { label: "Go but leave early", reply: "One hour max, then I'm gone", karma: -3, popularity: 2 },
      { label: "Full send", reply: "Save me the good table", karma: -9, popularity: 4, morale: 3 },
    ],
  },
  {
    id: "old_coach", from: "High school coach", emoji: "👴", phase: "any", beat: "allstar",
    text: "Watched you on TV last night. Still remember you at 14 refusing to leave the cage after closing. Proud of you kid.",
    choices: [
      { label: "Thank him properly", reply: "Everything started with you coach. Tickets for you whenever you want, for life", karma: 8, morale: 5 },
      { label: "Thumbs up emoji", reply: "👍", karma: -3 },
    ],
  },
  {
    id: "kid_dm", from: "Fan DM", emoji: "🧒", phase: "any", beat: "allstar",
    text: "you're my favorite player ever. im in the hospital and all i want is a signed bat. no worries if youre busy",
    choices: [
      { label: "Send a signed bat and visit", reply: "Bat is on the way and I'm coming to see you next homestand. Stay strong", karma: 12, popularity: 6, cash: -0.1 },
      { label: "Send the bat", reply: "On its way little legend", karma: 6, popularity: 3 },
      { label: "Ignore it", reply: "", karma: -8 },
    ],
  },
  {
    id: "allstar_home", from: "Mom", emoji: "🏠", phase: "any", beat: "allstar",
    text: "Three days off for the break. Your room is exactly how you left it. Come home?",
    choices: [
      { label: "Fly home", reply: "On the first flight out. Make the good stuff", karma: 6, morale: 5, cash: -0.02 },
      { label: "Stay and rest", reply: "Body needs the couch this time mama. Next break, promise", karma: 1, morale: 2 },
    ],
  },
  {
    id: "allstar_little_league", from: "Little league coach", emoji: "⚾", phase: "any", beat: "allstar",
    text: "Our little league team made the town all-star game. The kids would lose it if you sent them a video.",
    choices: [
      { label: "Send a video and gloves", reply: "Video tonight, and new gloves for the whole team", karma: 9, popularity: 2, cash: -0.05 },
      { label: "Send a video", reply: "Recording it now. Tell them to swing hard", karma: 4, popularity: 1 },
    ],
  },

  {
    id: "allstar_lake", from: "Teammate", emoji: "🎣", phase: "any", minAge: 22, beat: "allstar",
    text: "Three days off. My lake house, fishing at sunrise, phones in a drawer. You coming?",
    choices: [
      { label: "Bring the rods", reply: "I'm in. Bringing my own rod, don't laugh", karma: 1, morale: 5 },
      { label: "Staying to rest", reply: "Couch and ice tub for me this time. Next year", karma: 2, morale: 1 },
    ],
  },

  /* ── the trade deadline ── */
  {
    id: "deadline_rumor", from: "Old teammate", emoji: "📲", phase: "any", minAge: 23, beat: "deadline",
    text: "Your name is all over the trade rumor accounts this week lol. You saying anything or nah?",
    choices: [
      { label: "Say nothing", reply: "Not touching it. Just playing ball", karma: 3, morale: -1 },
      { label: "Post a laughing emoji", reply: "Posting the crying laughing face and logging off", karma: -1, popularity: 3, morale: 1 },
    ],
  },
  {
    id: "mom_call", from: "Mom", emoji: "❤️", phase: "any", beat: "deadline",
    text: "Haven't heard from you in a while sweetheart. Everything okay out on the road? Call me when you get a second.",
    choices: [
      { label: "Call her tonight", reply: "Calling you right after batting practice, promise. Love you", karma: 8, morale: 6 },
      { label: "Leave it on read", reply: "", karma: -6, morale: -2 },
    ],
  },
  {
    id: "equipment_fine", from: "Equipment manager", emoji: "🧺", phase: "any", beat: "deadline",
    text: "You left your road grays at the hotel again. Team wants to fine you. I can cover for you this once.",
    choices: [
      { label: "Own it, pay the fine", reply: "My fault Tony. I'll pay it. Lunch is on me too", karma: 7, cash: -0.05 },
      { label: "Let him cover for you", reply: "You're a legend. I owe you", karma: -5, morale: 2 },
    ],
  },
  {
    id: "reporter_leak", from: "Beat writer", emoji: "📰", phase: "any", beat: "deadline",
    text: "I know the clubhouse turned on the pitching coach. Give me the inside story, you stay anonymous.",
    choices: [
      { label: "Keep it in house", reply: "Nothing to tell. Clubhouse stays in the clubhouse", karma: 8, morale: 2 },
      { label: "Leak it", reply: "Ok but this NEVER came from me", karma: -10, popularity: 3 },
    ],
  },
  {
    id: "lost_wallet", from: "Stadium worker", emoji: "👛", phase: "any", beat: "deadline",
    text: "Found a wallet in the players' lot with 800 bucks in it. No ID. What do I do with it?",
    choices: [
      { label: "Hand it to security", reply: "Security, mate. Someone's having a bad day", karma: 6 },
      { label: "Finders keepers", reply: "That's the baseball gods paying you. Keep it", karma: -6 },
    ],
  },
  {
    id: "injury_teammate", from: "Teammate", emoji: "🏥", phase: "any", beat: "deadline",
    text: "Tommy John's gone. Twelve months. Sitting in this hospital bed wondering if I'll ever throw the same again, honestly.",
    choices: [
      { label: "Visit weekly", reply: "I'm there every week bro. Rehab buddies. You're coming back stronger", karma: 10, morale: 2 },
      { label: "Send a message", reply: "Gutted for you. Speedy recovery brother", karma: 3 },
      { label: "Read it later", reply: "", karma: -6 },
    ],
  },
  {
    id: "ump_apology", from: "League office", emoji: "🟨", phase: "any", beat: "deadline",
    text: "Your postgame comments about last night's umpiring went viral. We'd welcome a public clarification.",
    choices: [
      { label: "Apologize properly", reply: "I was out of line. Umpires have the hardest job on the field. Apologies", karma: 6, popularity: -1 },
      { label: "Double down", reply: "I said what I said", karma: -7, popularity: 5 },
    ],
  },
  {
    id: "deadline_agent", from: "Agent", emoji: "💼", phase: "any", minAge: 23, beat: "deadline",
    text: "Deadline is this week. Two clubs called asking about you. Want me to shut it down, or let the front office sweat a little?",
    choices: [
      { label: "Shut it down, I'm staying", reply: "Tell them I'm not going anywhere", karma: 6, popularity: 4, morale: 2 },
      { label: "Let them sweat", reply: "Don't say anything. Let them wonder", karma: -4, morale: 3 },
    ],
  },
  {
    id: "deadline_traded", from: "Teammate", emoji: "📦", phase: "any", beat: "deadline",
    text: "They traded me. Packing my locker in the middle of a homestand. Been a good run with you.",
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

  /* ── September ── */
  {
    id: "barber_cut", from: "Barber", emoji: "💈", phase: "any", beat: "september",
    text: "New look idea for you. Bold. Might break the internet, might get you side eye from the manager. You in?",
    choices: [
      { label: "Send it", reply: "Chair. Tomorrow. Do your worst", karma: 2, popularity: 4 },
      { label: "Keep it classic", reply: "Usual cut mate, big series this week", karma: 1 },
    ],
  },
  {
    id: "sept_callup", from: "Called up rookie", emoji: "🌱", phase: "any", minAge: 23, beat: "september",
    text: "Just got called up from Triple-A. First time in a big league clubhouse. Where do I even sit?",
    choices: [
      { label: "Show him around", reply: "Locker next to mine. Stick with me, I'll show you everything", karma: 8, morale: 2 },
      { label: "Let him figure it out", reply: "Figure it out like I did", karma: -6 },
    ],
  },
  {
    id: "sept_stretch", from: "Manager", emoji: "🧢", phase: "any", beat: "september",
    text: "Last month of the season. I want you in there every night. How's the body holding up, honestly?",
    choices: [
      { label: "Play me every day", reply: "Write me in every day. I'll rest in October", karma: 3, morale: 3 },
      { label: "I need a day here and there", reply: "Honestly a day here and there would help", karma: 3, morale: -1 },
    ],
  },
  {
    id: "sept_scoreboard", from: "Clubhouse attendant", emoji: "📺", phase: "any", beat: "september",
    text: "Somebody keeps switching the clubhouse TV to cartoons right before stretch. Half the guys are blaming you.",
    choices: [
      { label: "Own it", reply: "Guilty. Somebody had to lighten the mood", karma: 2, morale: 3 },
      { label: "Frame the rookie", reply: "Check the rookie's locker for the remote", karma: -3, morale: 2 },
    ],
  },
  {
    id: "sept_kids_day", from: "Team community office", emoji: "🧒", phase: "any", beat: "september",
    text: "Last homestand is kids day. Want to run the bases with the little ones after the game?",
    choices: [
      { label: "Run every lap", reply: "Count me in. I'm letting all of them beat me", karma: 7, popularity: 3 },
      { label: "Wave from the dugout", reply: "I'll wave from the dugout, legs are dead", karma: -1 },
    ],
  },

  {
    id: "sept_bobblehead", from: "Team marketing", emoji: "🎁", phase: "any", beat: "september",
    text: "Your bobblehead night is next week. The face is... a choice. Want to see it before it goes out?",
    choices: [
      { label: "Ship it as is", reply: "Ship it. If it's ugly it's a collector's item", karma: 3, popularity: 3 },
      { label: "Ask for a redo", reply: "Can we fix the nose at least", karma: -1, morale: 1 },
    ],
  },

  /* ── October ── */
  {
    id: "oct_meeting", from: "Manager", emoji: "🧢", phase: "any", beat: "october",
    text: "October. Everything since spring was for this. Want to say something to the room tonight?",
    choices: [
      { label: "Speak from the heart", reply: "I'll say something. They'll hear it", karma: 6, morale: 4, popularity: 2 },
      { label: "Let the vets talk", reply: "Let the vets have the floor. I'll do my talking on the field", karma: 1, morale: 1 },
    ],
  },
  {
    id: "oct_tickets", from: "Mom", emoji: "🎟️", phase: "any", beat: "october",
    text: "The whole family wants playoff tickets. All fourteen of us. Your uncle says he's bringing a sign.",
    choices: [
      { label: "Buy them all", reply: "Fourteen tickets, done. Tell him to make the sign big", karma: 7, morale: 3, cash: -0.1 },
      { label: "Four tickets, that's it", reply: "Four. Everybody else watches at the house", karma: -2 },
    ],
  },
  {
    id: "oct_staff", from: "Agent", emoji: "💼", phase: "any", beat: "october",
    text: "Postseason shares are coming. The clubhouse staff makes a fraction of what you do. Want to do something for them?",
    choices: [
      { label: "Split a bonus with the staff", reply: "Set it up. Every clubbie and trainer gets something", karma: 10, morale: 3, cash: -0.15 },
      { label: "Buy them dinner", reply: "Steakhouse, whole staff, my card", karma: 5, cash: -0.03 },
      { label: "Keep it", reply: "They get paid. I get paid", karma: -4 },
    ],
  },
  {
    id: "oct_rally_cap", from: "Teammate", emoji: "🧢", phase: "any", beat: "october",
    text: "Rally cap plan for tonight. Inside out, backwards, the whole dugout. You in, or too cool?",
    choices: [
      { label: "All in", reply: "Already flipped. Let's go", karma: 2, morale: 4, popularity: 2 },
      { label: "Too cool", reply: "I'll be the one guy with it on straight", karma: -2, morale: -1 },
    ],
  },
  {
    id: "oct_radio", from: "Local radio", emoji: "📻", phase: "any", beat: "october",
    text: "We'd love you on the morning show before Game 1. Ten minutes, fire the city up.",
    choices: [
      { label: "Do it, hype the city", reply: "I'm in. Let's get this town loud", karma: 1, popularity: 4, morale: -1 },
      { label: "Decline, locked in", reply: "Locked in this week. After we win", karma: 3, morale: 2 },
    ],
  },
  /* Round 919: five more for October, which had five. */
  {
    id: "oct_scouting_report", from: "Advance scout", emoji: "📒", phase: "any", beat: "october",
    text: "The series report is forty pages. Every pitch, every count, every tell. Read it tonight, or trust what got you here?",
    choices: [
      { label: "Read every page", reply: "Sending it to my tablet. I'll know it cold by first pitch", karma: 4, morale: 1 },
      { label: "Give me the top three things", reply: "Top three only. I play better when I keep it simple", karma: 2, morale: 3 },
    ],
  },
  {
    id: "oct_old_teammate", from: "Old minor league teammate", emoji: "🚌", phase: "any", beat: "october",
    text: "Watching you in October from a motel in the Dominican winter league. Some of us are still riding the bus. Go win it for the bus.",
    choices: [
      { label: "Send him a playoff hat", reply: "Hat's on the way. Wear it on the bus", karma: 7, morale: 3 },
      { label: "Say thanks", reply: "Means a lot man. Keep swinging", karma: 3, morale: 2 },
    ],
  },
  {
    id: "oct_ex", from: "Ex", emoji: "💔", phase: "any", beat: "october",
    text: "hey. long time. any chance of two tickets for Game 3? no pressure",
    choices: [
      { label: "Leave two at will call", reply: "Two at will call under your name. Enjoy the game", karma: 4, morale: -1, cash: -0.01 },
      { label: "Leave it on read", reply: "", karma: 0, morale: 1 },
    ],
  },
  {
    id: "oct_grounds_crew", from: "Grounds crew", emoji: "🌧️", phase: "any", beat: "october",
    text: "Tarp crew has pulled it four times this week, at 2am twice. The guys would love a signed ball for the shed.",
    choices: [
      { label: "Signed balls and breakfast", reply: "A ball for every guy and breakfast on me tomorrow", karma: 9, popularity: 1, cash: -0.02 },
      { label: "One signed ball", reply: "One ball, signed, for the shed. Thank you guys", karma: 4 },
    ],
  },
  {
    id: "oct_dad_superstition", from: "Dad", emoji: "🧢", phase: "any", beat: "october",
    text: "I wore the same shirt for every game of the last series. Your mother wants to burn it. Do I wash it or not?",
    choices: [
      { label: "Do not wash it", reply: "Do NOT wash that shirt. Not until we're done", karma: 3, morale: 4 },
      { label: "Wash it, it's not the shirt", reply: "Wash it dad. It's not the shirt, I promise", karma: 2, morale: 1 },
    ],
  },

  /* ── the offseason ── */
  {
    id: "scam_dm", from: "Unknown", emoji: "🎣", phase: "any", beat: "offseason",
    text: "CONGRATULATIONS! You've won 2 MILLION DOLLARS. Just send your account info plus a small release fee to claim it.",
    choices: [
      { label: "Report and warn fans", reply: "Posting this so nobody falls for it. Stay safe out there", karma: 7, popularity: 3 },
      { label: "Delete it", reply: "", karma: 1 },
      { label: "Reply as a joke", reply: "Amazing news!! My account number is 1-2-3-GET-A-JOB", karma: 2, popularity: 2 },
    ],
  },
  {
    id: "agent_bats", from: "Agent", emoji: "💼", phase: "any", beat: "offseason", ahead: true,
    text: "Bat and glove deal on the table. Good money, but the brand got caught running sweatshops last year. Your call.",
    choices: [
      { label: "Take the money", reply: "Money is money. Send the contract", karma: -7, cash: 1.2 },
      { label: "Turn it down publicly", reply: "Not using their gear. And I'm saying why", karma: 9, popularity: 4 },
      { label: "Quietly decline", reply: "Pass on this one. Keep it quiet", karma: 4 },
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
    id: "tax_scheme", from: "Financial advisor", emoji: "🏝️", phase: "any", minAge: 25, beat: "offseason",
    text: "New structure for your endorsement money. Runs through three states with no income tax. Technically legal. Probably.",
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
      { label: "Decline", reply: "Clubhouse stays sacred. Pass", karma: 3 },
    ],
  },
  {
    id: "podcast_invite", from: "Podcast", emoji: "🎙️", phase: "any", minAge: 24, beat: "offseason",
    text: "Come on the show. Fans want unfiltered. We will ask about your manager, your contract and your rival.",
    choices: [
      { label: "Go and stay classy", reply: "I'll come on. Keeping team stuff in house though", karma: 5, popularity: 3 },
      { label: "Go and spill everything", reply: "Unfiltered? You'll get unfiltered", karma: -6, popularity: 6 },
      { label: "Decline", reply: "Not my thing, good luck with the show", karma: 1 },
    ],
  },
  {
    id: "hometown_field", from: "Community league", emoji: "🏗️", phase: "any", minAge: 24, beat: "offseason",
    text: "The diamond you grew up playing on is closing without funding. Two hundred kids play there every summer.",
    choices: [
      { label: "Fund it and rename it", reply: "I'll cover it. Name it after my old coach, not me", karma: 12, popularity: 5, cash: -1.2 },
      { label: "Fund it quietly", reply: "Send the invoice to my foundation. No press", karma: 10, cash: -1.2 },
      { label: "Share a fundraiser", reply: "Posting the link, let's all chip in", karma: 4, popularity: 1 },
    ],
  },
  {
    id: "grandpa_visit", from: "Grandpa", emoji: "🧓", phase: "any", beat: "offseason",
    text: "Never miss a game now that I've got the package. Hip's too bad for the ballpark these days. Bring the trophy round some day, yeah?",
    choices: [
      { label: "Visit with a jersey", reply: "Coming round after the homestand with a jersey and a game ball. Put the kettle on", karma: 9, morale: 5 },
      { label: "Promise vaguely", reply: "One day grandpa, promise", karma: 1 },
    ],
  },
  {
    id: "winter_ball", from: "Winter league club", emoji: "🌴", phase: "any", maxAge: 28, beat: "offseason", ahead: true,
    text: "Our winter ball club wants you for six weeks. Good at bats, warm weather, long flights. Interested?",
    choices: [
      { label: "Go play", reply: "Count me in. I want the reps", karma: 3, morale: 2, popularity: 1 },
      { label: "Rest instead", reply: "Body needs the winter off this year", karma: 1, morale: 1 },
    ],
  },

  {
    id: "offseason_wedding", from: "Cousin", emoji: "💒", phase: "any", beat: "offseason",
    text: "I'm getting married in December and you're in the wedding. Do not tell me you have a workout.",
    choices: [
      { label: "I'll be there", reply: "Front row, suit pressed, no workouts. Congrats cuz", karma: 8, morale: 4, cash: -0.02 },
      { label: "Reception only", reply: "I can make the reception, I'm sorry about the ceremony", karma: -2, morale: 1 },
    ],
  },
  {
    id: "offseason_caravan", from: "Team community office", emoji: "🚐", phase: "any", minAge: 22, beat: "offseason",
    text: "Winter caravan. Five towns in four days, schools and hospitals, a lot of handshakes. You in?",
    choices: [
      { label: "All five towns", reply: "All five. Load me up with signed balls", karma: 8, popularity: 4, morale: -1 },
      { label: "One stop", reply: "I can do one stop, the rest of the week is family", karma: 2, popularity: 1 },
    ],
  },

  /* ── an arbitration winter ── */
  {
    id: "arb_agent", from: "Agent", emoji: "💼", phase: "any", beat: "arbitration",
    text: "We're arbitration eligible. We file a number, they file a number. Settle before a hearing, or go all the way?",
    choices: [
      { label: "Settle, keep it friendly", reply: "Find the middle and settle. I like it here", karma: 4, morale: 1 },
      { label: "Go to the hearing", reply: "File our number and don't blink", karma: -2, morale: -1, popularity: 1 },
    ],
  },
  {
    id: "arb_gm", from: "GM", emoji: "📋", phase: "any", beat: "arbitration",
    text: "Heads up. If this goes to a hearing, our side has to argue why you're worth less. Nothing personal. Want to get it done first?",
    choices: [
      { label: "Let's get it done", reply: "Appreciate the honesty. Let's get it done", karma: 4, morale: 2 },
      { label: "Talk to my agent", reply: "My agent has the number. Talk to him", karma: -1 },
    ],
  },
  {
    id: "arb_vet", from: "Veteran teammate", emoji: "🧔", phase: "any", beat: "arbitration",
    text: "Went to a hearing once. Sat there while they picked my season apart in front of me. Settle if you can, man.",
    choices: [
      { label: "Thank him", reply: "Needed to hear that. Thanks for being straight", karma: 4, morale: 2 },
      { label: "I can take it", reply: "Let them say what they want. I know what I did", karma: -1, morale: 1 },
    ],
  },
  {
    id: "arb_mom", from: "Mom", emoji: "❤️", phase: "any", beat: "arbitration",
    text: "Your aunt says you're suing your own team?? Call me and explain this arbitration thing please.",
    choices: [
      { label: "Call and explain", reply: "Calling you now. Nobody's suing anybody, I promise", karma: 6, morale: 3 },
      { label: "Send a link", reply: "Sending you an article mama, it's normal", karma: 0 },
    ],
  },
  /* Round 919: four more for an arbitration winter, which had four. */
  {
    id: "arb_analyst", from: "Agency analyst", emoji: "📊", phase: "any", beat: "arbitration",
    text: "Built your case. Players with your service time and numbers, what they got, why you're better. Want to read it before we file?",
    choices: [
      { label: "Send it, I'll read it all", reply: "Send it. I want to know every number in there", karma: 3, morale: 2 },
      { label: "Just tell me the figure", reply: "Just tell me the number we're filing", karma: 0, morale: 1 },
    ],
  },
  {
    id: "arb_beat_writer", from: "Beat writer", emoji: "📰", phase: "any", beat: "arbitration",
    text: "Hearing your side and the club are still apart. Anything on the record before the figures come out?",
    choices: [
      { label: "No comment, love it here", reply: "It's business. I love it here. That's it", karma: 4, popularity: 1 },
      { label: "Say the club is lowballing", reply: "They know what I did last year. So does everybody else", karma: -4, popularity: 3, morale: -1 },
    ],
  },
  {
    id: "arb_teammate", from: "Teammate", emoji: "⚾", phase: "any", beat: "arbitration",
    text: "Settled an hour before my hearing last year. Split the difference and slept fine. Where are you at?",
    choices: [
      { label: "Leaning toward settling", reply: "Leaning that way. Nobody wins in that room", karma: 3, morale: 2 },
      { label: "Going all the way", reply: "Going in. I want them to say it to my face", karma: -2, morale: 1, popularity: 1 },
    ],
  },
  {
    id: "arb_partner", from: "Partner", emoji: "💛", phase: "any", minAge: 23, beat: "arbitration",
    text: "The hearing is the same week as my birthday. I'm not mad. I'm just saying it out loud so you know I know.",
    choices: [
      { label: "Plan the birthday first", reply: "Birthday is booked. The hearing works around it", karma: 7, morale: 3, cash: -0.02 },
      { label: "We'll celebrate after", reply: "We'll do it big after the hearing, promise", karma: -1, morale: 1 },
    ],
  },

  /* ── a free agency winter ── */
  {
    id: "fa_agent", from: "Agent", emoji: "💼", phase: "any", beat: "freeagency",
    text: "We're free agents. Phones are already ringing. Hear every offer, or do you have a club in mind?",
    choices: [
      { label: "Hear everybody out", reply: "Every offer. Let's see what's out there", karma: -1, morale: 2, popularity: 1 },
      { label: "Talk to my club first", reply: "Call my club first. I want to stay if it's fair", karma: 5, morale: 1 },
    ],
  },
  {
    id: "fa_gm", from: "GM", emoji: "📋", phase: "any", beat: "freeagency",
    text: "We want you back. We know the market will be loud. Give us the last call before you sign anywhere?",
    choices: [
      { label: "You get the last call", reply: "You'll get the last call. Promise", karma: 5, morale: 2 },
      { label: "Best offer wins", reply: "Best offer wins. Nothing personal", karma: -3, morale: 1 },
    ],
  },
  {
    id: "fa_family", from: "Mom", emoji: "🏡", phase: "any", beat: "freeagency",
    text: "Wherever you sign, does it have to be far? Just asking for your grandma.",
    choices: [
      { label: "Promise visits wherever", reply: "Wherever it is, you two are flying out for opening day", karma: 6, morale: 3, cash: -0.03 },
      { label: "Going where the money is", reply: "Going where the best offer is mama", karma: -2 },
    ],
  },
  {
    id: "fa_vet", from: "Veteran teammate", emoji: "🧔", phase: "any", beat: "freeagency",
    text: "Been a free agent twice. Pick the place, not just the number. You have to live there.",
    choices: [
      { label: "Thank him", reply: "Good point. Appreciate you", karma: 4, morale: 2 },
      { label: "It's about the number", reply: "Respect, but the number decides this one", karma: -2, morale: 1 },
    ],
  },
  {
    id: "fa_advisor", from: "Financial advisor", emoji: "📈", phase: "any", beat: "freeagency",
    text: "Big contract coming. Let's set up the plan before the money lands, not after.",
    choices: [
      { label: "Make a plan", reply: "Let's sit down this week. Real plan", karma: 3, morale: 2, cash: -0.05 },
      { label: "Later", reply: "After I sign. One thing at a time", karma: 0 },
    ],
  },
  /* Round 919: five more for a free agency winter, which had five. */
  {
    id: "fa_realtor", from: "Realtor", emoji: "🏠", phase: "any", minAge: 24, beat: "freeagency",
    text: "Do I list the house now or wait until you sign? Spring buyers pay more, but you might be staying.",
    choices: [
      { label: "Wait until I sign", reply: "Hold it. I might be staying", karma: 2, morale: 1 },
      { label: "List it now", reply: "List it. Either way I'm moving on", karma: -1, morale: 2, cash: 0.05 },
    ],
  },
  {
    id: "fa_old_manager", from: "Old minor league manager", emoji: "📋", phase: "any", beat: "freeagency",
    text: "Coaching for a club now. They'd love you here, and I'd love to see you in our dugout. No pressure, just letting you know.",
    choices: [
      { label: "Tell your agent to call them", reply: "I'll have my agent call. Good to hear from you, skip", karma: 3, morale: 2 },
      { label: "Keep it friendly", reply: "Appreciate it skip. Let's see how it shakes out", karma: 2, morale: 1 },
    ],
  },
  {
    id: "fa_little_brother", from: "Little brother", emoji: "🧒", phase: "any", beat: "freeagency",
    text: "if you sign somewhere with a pool in the stadium i'm moving in with you. not a joke",
    choices: [
      { label: "Deal, pack your bags", reply: "Pool or no pool, the guest room is yours", karma: 5, morale: 3 },
      { label: "Finish school first", reply: "Finish the year first. Then we'll talk about the pool", karma: 3, morale: 1 },
    ],
  },
  {
    id: "fa_beat_writer", from: "Beat writer", emoji: "📰", phase: "any", beat: "freeagency",
    text: "Hearing you're close with two clubs. Confirm, deny, or say something I can actually print?",
    choices: [
      { label: "No comment", reply: "When there's something to say, my agent will say it", karma: 3 },
      { label: "Give him a hint", reply: "Let's just say I like warm weather", karma: -2, popularity: 3, morale: 1 },
    ],
  },
  {
    id: "fa_clubhouse_manager", from: "Clubhouse manager", emoji: "🧺", phase: "any", beat: "freeagency",
    text: "Cleaning out lockers for the winter. Yours is still taped up with your name. Leave it, or should I box it up?",
    choices: [
      { label: "Leave it up", reply: "Leave the tape on. I'm trying to come back", karma: 5, morale: 2 },
      { label: "Box it up", reply: "Box it up. Thank you for everything, really", karma: 3, morale: -1, cash: -0.01 },
    ],
  },
];

/** What makes the inbox the MLB one. Data, not rules. Three a season rather
 *  than the between-seasons phone's two, because the baseball year has more
 *  beats, the same call Round 796 made for the NFL. */
export const MLB_INBOX: InboxSport<MlbCareerState> = {
  pool: MLB_INBOX_POOL,
  moodOf: c => c.karma ?? 50,
  setMood: (c, v) => { c.karma = v; },
  addPopularity: (c, delta) => { c.fanbase = clamp(c.fanbase + delta, 0, 100); },
  addCash: (c, amount) => { c.netWorth = Math.round(((c.netWorth ?? 0) + amount) * 10) / 10; },
  ageOf: c => c.age,
  yearOf: c => (c.seasons.length > 0 ? c.seasons[c.seasons.length - 1].year : c.year),
  maxInbox: 6,
  wantPerSeason: 3,
  calendar: MLB_CALENDAR,
};

/**
 * Round 822: the beats the season just played actually had, read off the
 * line the engine wrote and the deal as it stands after the year ticked
 * over. A suspended year had no baseball in it, only the offseason. October
 * is a postseason game played. Arbitration is the winter after a third,
 * fourth or fifth season with team control still left on the deal; free
 * agency is the winter the deal runs out, which is when the board opens the
 * market. Whether the career goes on is not this reader's question: the
 * shared tick drops every `ahead` beat for a career that ends this season.
 */
export function mlbSeasonBeats(c: MlbCareerState): string[] {
  const line = c.seasons[c.seasons.length - 1];
  if (!line || line.teamResult === "SUSPENDED") return ["offseason"];
  const beats = ["spring", "allstar", "deadline", "september"];
  if ((line.poGames ?? 0) > 0) beats.push("october");
  beats.push("offseason");
  const service = c.seasons.length;
  if (!c.retired && service >= 3 && service <= 5 && c.contractYears >= 1) beats.push("arbitration");
  if (!c.retired && c.contractYears <= 0) beats.push("freeagency");
  return beats;
}

/** One season of the inbox. MLB has no youth phase, so it always answers
 *  "pro"; every template above is gated "any" or by age rather than phase
 *  for exactly that reason. `goesOn` false (the career ends this season)
 *  keeps every `ahead` beat and `ahead` text out of it. With no `rng` it
 *  draws from the inbox's own keyed stream, never the season's. */
export function receiveMlbInboxTexts(c: MlbCareerState, goesOn = true, rng?: () => number): InboxMessage[] {
  return receiveCalendarInboxTextsFor(c, "pro", MLB_INBOX, rng ?? inboxStream(c, "season"), mlbSeasonBeats(c), goesOn && !c.retired);
}

/** Round 822: draft day. The text that lands the moment your name is called,
 *  before a pitch is thrown, so no mood drift: no season has passed. */
export function mlbDraftNightInbox(c: MlbCareerState, rng?: () => number): InboxMessage[] {
  return deliverInboxTextsFor(c, "pro", MLB_INBOX, rng ?? inboxStream(c, "draft"), ["draft"]);
}

export function mlbUnreadInboxCount(c: MlbCareerState): number {
  return unreadInboxCountFor(c);
}

/** Answer one message. Returns the line for the feed, or null when the
 *  message does not exist, is already answered, or the choice is invalid. */
export function answerMlbInboxMessage(c: MlbCareerState, msgId: string, choiceIdx: number): string | null {
  return answerInboxMessageFor(c, msgId, choiceIdx, MLB_INBOX);
}
