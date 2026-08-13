/* ────────────────────────────────────────────────────────────────────────────
   soccerCareerRealismA.ts, the realism layer for Soccer Career, batch A
   Owner brief: "everything BitLife has, ten times better and more out of
   pocket." This is the human half of that: the training ground, the press
   pack, the away end, the dressing room, the bad away trips, your own head,
   and the money that is not crooked, just badly spent.

   Seven themes, 45 events, ids 400 to 444:
     400-404  training ground life
     405-410  media and press
     411-416  fans and community
     417-423  teammates and dressing room
     424-430  travel and football culture
     431-437  body and mind
     438-444  money decisions that are legal, if not always wise

   Same self-gating contract as soccerCareerLife.ts and soccerCareerCorruption.ts:
   an event is only in the returned array when its conditions hold, so the
   caller needs no extra eligibility rules. Types only on the import, so there
   is no runtime cycle back into the engine.
   ──────────────────────────────────────────────────────────────────────────── */
import type { CareerState, RandomEvent } from "./soccerCareerEngine";

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

/* ─── The realism catalog, batch A (ids 400-444) ─── */
export function getRealismEventsA(state: CareerState): RandomEvent[] {
  const events: RandomEvent[] = [];
  const push = (e: RandomEvent) => events.push(e);
  const pro = state.seasons.filter(s => s.type === "playing").length;
  const isKeeper = state.position === "GK";
  const abroad = !!state.currentClubCountry && state.currentClubCountry !== state.nationality;

  /* ══ THEME 1: TRAINING GROUND LIFE (400-404) ══ */
  if (pro >= 1) {
    push({ id: 400, emoji: "🔁", title: "Twenty Minutes In The Middle",
      description: "You went into the rondo for one bad touch and did not come out for twenty minutes. The club media team filmed all of it and the caption was not kind.",
      category: "life", choices: [
        { label: "Stay behind for extra rondo work all season", emoji: "🎯", color: "bg-blue-600", consequence: "Passing +2 next season, Morale -2",
          apply: s => { bump(s, "passing", 2); s.morale = clamp(s.morale - 2, 0, 100); s.events = [...s.events, "🔁 Did rondo drills after every session until nobody could nutmeg you again"]; return s; } },
        { label: "Repost the clip yourself with a worse caption", emoji: "😂", color: "bg-pink-600", consequence: "Followers +300k, Popularity +3, Morale +3",
          apply: s => { followers(s, 0.3); s.popularity = clamp(s.popularity + 3, 0, 100); s.morale = clamp(s.morale + 3, 0, 100); s.events = [...s.events, "🔁 Reposted your own rondo humiliation. The internet decided you were fine"]; return s; } },
        { label: "Turn it into a squad forfeit: loser buys lunch", emoji: "🥪", color: "bg-emerald-600", consequence: "Morale +6, costs you €50k of lunches, you are now the fun one",
          apply: s => { s.morale = clamp(s.morale + 6, 0, 100); money(s, -0.05); setFlag(s, "rRondo", 1); s.events = [...s.events, "🔁 Invented the rondo forfeit. The squad ate very well and trained very hard"]; return s; } },
      ] });
  }

  if (pro >= 1 && state.age >= 19) {
    push({ id: 401, emoji: "🏃", title: "The New Gaffer Brought A Sports Scientist",
      description: "Double sessions, GPS vests, and hill runs at six in the morning that three lads have already been sick on. He calls it a reset. The physios call it a lot of new work.",
      category: "life", choices: [
        { label: "Buy in completely, every rep", emoji: "💪", color: "bg-emerald-600", consequence: "Physical +3, Pace +1 next season, Morale -6",
          apply: s => { bump(s, "physical", 3); bump(s, "pace", 1); s.morale = clamp(s.morale - 6, 0, 100); s.events = [...s.events, "🏃 Ran every hill the new gaffer asked for. Came back preseason looking like a different animal"]; return s; } },
        { label: "Do the minimum and protect your legs", emoji: "🧘", color: "bg-blue-600", consequence: "Morale +5, Pace +1 next season, the gaffer notices",
          apply: s => { s.morale = clamp(s.morale + 5, 0, 100); bump(s, "pace", 1); s.events = [...s.events, "🏃 Quietly rationed yourself through the fitness reset. Fresh legs, frosty relationship"]; return s; } },
        { label: "Lead the group from the front of every run", emoji: "🎖️", color: "bg-amber-600", consequence: "Physical +2, Popularity +2, Morale -3, you become the standard",
          apply: s => { bump(s, "physical", 2); s.isLeader = true; s.popularity = clamp(s.popularity + 2, 0, 100); s.morale = clamp(s.morale - 3, 0, 100); s.events = [...s.events, "🏃 Finished first in every run and dragged the stragglers home. The armband talk started here"]; return s; } },
      ] });
  }

  if (pro >= 2) {
    push({ id: 402, emoji: "🧦", title: "The Kit Man's System",
      description: "Barry has been kit man for 41 years. Your shirt must hang facing the door, you must never be first out of the tunnel, and nobody is allowed to touch the spare studs. He has never once been wrong.",
      category: "life", choices: [
        { label: "Follow the system to the letter", emoji: "🙏", color: "bg-emerald-600", consequence: "Morale +7, Popularity +1, Barry is now your closest ally",
          apply: s => { s.morale = clamp(s.morale + 7, 0, 100); s.popularity = clamp(s.popularity + 1, 0, 100); setFlag(s, "rKitSystem", 1); s.events = [...s.events, "🧦 Signed up to Barry the kit man's system. Your shirt has faced the door ever since"]; return s; } },
        { label: "Break it once, purely as an experiment", emoji: "🧪", color: "bg-amber-600", consequence: "Half the time you feel free, half the time you get a nightmare month",
          apply: s => { if (Math.random() < 0.5) { s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "🧦 Broke Barry's rules and played the best game of the season. He still blames the weather"]; } else { s.morale = clamp(s.morale - 6, 0, 100); bump(s, "shooting", -1); s.events = [...s.events, "🧦 Went out first from the tunnel once. Four games without a shot on target. Barry said nothing, loudly"]; } return s; } },
      ] });
  }

  if (state.age >= 24) {
    push({ id: 403, emoji: "🪄", title: "The Sixteen Year Old Has Your Number",
      description: "A youth teamer has nutmegged you in eleven consecutive sessions. He does not celebrate, which is somehow worse. The under-18s coach has started inviting friends to watch.",
      category: "life", choices: [
        { label: "Take him under your wing properly", emoji: "🤝", color: "bg-emerald-600", consequence: "Morale +5, Popularity +3, you become a leader in the building",
          apply: s => { s.isLeader = true; s.morale = clamp(s.morale + 5, 0, 100); s.popularity = clamp(s.popularity + 3, 0, 100); setFlag(s, "rNutmegKid", 1); s.events = [...s.events, "🪄 Adopted the kid who kept nutmegging you. He now does it to opponents instead"]; return s; } },
        { label: "Take the ball, and him, once", emoji: "😤", color: "bg-red-600", consequence: "Defending +1 next season, Popularity -2, the message lands",
          apply: s => { bump(s, "defending", 1); s.popularity = clamp(s.popularity - 2, 0, 100); s.morale = clamp(s.morale + 3, 0, 100); s.events = [...s.events, "🪄 Put the nutmeg kid on the floor once. The nutmegs stopped. So did the invitations to watch"]; return s; } },
        { label: "Study his footage and steal the move", emoji: "🎬", color: "bg-blue-600", consequence: "Dribbling +2 next season",
          apply: s => { bump(s, "dribbling", 2); s.events = [...s.events, "🪄 Watched an hour of a 16 year old's clips and stole his best trick outright"]; return s; } },
      ] });
  }

  if (state.personality === "hothead" || pro >= 3) {
    push({ id: 404, emoji: "💥", title: "It Went Off At The Training Ground",
      description: "A 50/50 in a small sided game turned into a proper fight. It took two coaches, a physio and the goalkeeping coach to separate you, and somebody in the academy filmed it from a window.",
      category: "negative", choices: [
        { label: "Apologise in front of the whole squad", emoji: "🫱", color: "bg-emerald-600", consequence: "Morale +5, Integrity +4, you lead the room afterwards",
          apply: s => { s.morale = clamp(s.morale + 5, 0, 100); s.integrityBonus += 4; s.isLeader = true; s.events = [...s.events, "💥 Apologised to the squad for the training ground scrap. It made the dressing room tighter, not weaker"]; return s; } },
        { label: "Say nothing and let it burn", emoji: "🥶", color: "bg-blue-600", consequence: "Physical +2 next season, Morale -4, two players stop speaking",
          apply: s => { bump(s, "physical", 2); s.morale = clamp(s.morale - 4, 0, 100); s.events = [...s.events, "💥 Never mentioned the fight again. Trained like a man with something to prove for six months"]; return s; } },
        { label: "Tell the club one of you has to go", emoji: "🚪", color: "bg-red-600", consequence: "Morale +6, Popularity -6, the video leaks the week he is sold",
          apply: s => { s.morale = clamp(s.morale + 6, 0, 100); s.popularity = clamp(s.popularity - 6, 0, 100); s.events = [...s.events, "💥 Told the club it was him or you. He was sold in January and the window video leaked in February"]; return s; } },
      ] });
  }

  /* ══ THEME 2: MEDIA AND PRESS (405-410) ══ */
  if (state.popularity >= 20) {
    push({ id: 405, emoji: "🎤", title: "Live, Unfiltered, Unfortunate",
      description: "Pitchside, thirty seconds after the whistle, still breathing like a horse, you described your own manager's game plan as \"whatever that was\". It went out live to four million people.",
      category: "negative", choices: [
        { label: "Apologise publicly and take the hit", emoji: "🙇", color: "bg-blue-600", consequence: "Popularity +2, Morale -3, the gaffer forgives you eventually",
          apply: s => { s.popularity = clamp(s.popularity + 2, 0, 100); s.morale = clamp(s.morale - 3, 0, 100); s.integrityBonus += 3; s.events = [...s.events, "🎤 Apologised on camera for the pitchside outburst. The gaffer accepted it in front of everyone, which was worse"]; return s; } },
        { label: "Double down in the mixed zone", emoji: "🔥", color: "bg-red-600", consequence: "Followers +700k, Morale +5, Popularity -6",
          apply: s => { followers(s, 0.7); s.morale = clamp(s.morale + 5, 0, 100); s.popularity = clamp(s.popularity - 6, 0, 100); s.events = [...s.events, "🎤 Doubled down in the mixed zone. Every pundit in the country had a lovely week"]; return s; } },
        { label: "Total media silence for a month", emoji: "🤐", color: "bg-muted", consequence: "All stats +2 next season, Popularity -2, nothing to quote",
          apply: s => { s.socialMediaFocusBoost = true; s.popularity = clamp(s.popularity - 2, 0, 100); s.morale = clamp(s.morale + 3, 0, 100); s.events = [...s.events, "🎤 Went silent for a month. No quotes, no noise, and the best training block of your career"]; return s; } },
      ] });
  }

  if (state.popularity >= 25 || state.socialMediaFollowers >= 0.5) {
    push({ id: 406, emoji: "😂", title: "The Answer That Broke The Internet",
      description: "Asked whether your team could still win the league, you paused for nine seconds and said \"define win\". It has forty million views, three remixes and a ringtone.",
      category: "positive", choices: [
        { label: "Lean in: t-shirts, mugs, the lot", emoji: "👕", color: "bg-emerald-600", consequence: "Net worth +€400k, followers +1.2M, sponsor income +€200k",
          apply: s => { money(s, 0.4); followers(s, 1.2); s.sponsorshipIncome = Math.round((s.sponsorshipIncome + 0.2) * 100) / 100; s.events = [...s.events, "😂 Printed \"define win\" on a t-shirt and sold out in a day"]; return s; } },
        { label: "Refuse to ever explain it", emoji: "🃏", color: "bg-purple-600", consequence: "Followers +500k, Popularity +4, Morale +3, the mystique holds",
          apply: s => { followers(s, 0.5); s.popularity = clamp(s.popularity + 4, 0, 100); s.morale = clamp(s.morale + 3, 0, 100); s.events = [...s.events, "😂 Never explained the quote. Two years later people still argue about what you meant"]; return s; } },
        { label: "Apologise to the rival boss you accidentally roasted", emoji: "🕊️", color: "bg-blue-600", consequence: "Popularity +6, Integrity +5, followers +200k",
          apply: s => { s.popularity = clamp(s.popularity + 6, 0, 100); s.integrityBonus += 5; followers(s, 0.2); s.events = [...s.events, "😂 Rang the rival manager to explain the quote was not about him. He put it on his own wall anyway"]; return s; } },
      ] });
  }

  if (abroad && flag(state, "rLanguage") === 0) {
    push({ id: 407, emoji: "🗣️", title: "Six Months Of Verb Tables",
      description: "A club translator has done every interview for you since you signed, and the fans have noticed. A tutor offers three sessions a week, which is three fewer naps a week.",
      category: "life", choices: [
        { label: "Do the work and give a full interview in the local language", emoji: "📚", color: "bg-emerald-600", consequence: "Popularity +10, Morale +6, Integrity +3",
          apply: s => { setFlag(s, "rLanguage", 1); s.popularity = clamp(s.popularity + 10, 0, 100); s.morale = clamp(s.morale + 6, 0, 100); s.integrityBonus += 3; s.events = [...s.events, "🗣️ Did a full press conference in the local language. The city adopted you on the spot"]; return s; } },
        { label: "Learn the swear words and the chants first", emoji: "🎺", color: "bg-pink-600", consequence: "Popularity +4, Morale +5, followers +400k, one very awkward yellow card",
          apply: s => { setFlag(s, "rLanguage", 2); s.popularity = clamp(s.popularity + 4, 0, 100); s.morale = clamp(s.morale + 5, 0, 100); followers(s, 0.4); s.events = [...s.events, "🗣️ Learned the chants before the grammar. Got booked for something you did not fully understand"]; return s; } },
        { label: "Keep the translator and spend the hours on video work", emoji: "📺", color: "bg-blue-600", consequence: "Passing +2 next season, Morale +2, the fans stay lukewarm",
          apply: s => { bump(s, "passing", 2); s.morale = clamp(s.morale + 2, 0, 100); s.events = [...s.events, "🗣️ Skipped the language lessons for extra video sessions. Better player, colder relationship with the terraces"]; return s; } },
      ] });
  }

  if (state.overall >= 78 || state.popularity >= 40) {
    push({ id: 408, emoji: "🎥", title: "The Crew Wants Everything",
      description: "A streaming giant wants a season long documentary. Cameras in the dressing room, cameras in your kitchen, cameras in the car on the way home from the worst night of your year.",
      category: "life", choices: [
        { label: "Full access, €3M", emoji: "💸", color: "bg-emerald-600", consequence: "Net worth +€3M, followers +2.5M, Popularity +5, Morale -5",
          apply: s => { money(s, 3); followers(s, 2.5); s.popularity = clamp(s.popularity + 5, 0, 100); s.morale = clamp(s.morale - 5, 0, 100); setFlag(s, "rDocCrew", 1); s.events = [...s.events, "🎥 Sold full documentary access. Three million euros, and a camera in the room on the night you got dropped"]; return s; } },
        { label: "Pitch and press only, €800k", emoji: "🎬", color: "bg-blue-600", consequence: "Net worth +€800k, followers +800k, house stays private",
          apply: s => { money(s, 0.8); followers(s, 0.8); s.events = [...s.events, "🎥 Gave the documentary the football and none of the family. Everyone survived it"]; return s; } },
        { label: "No cameras. None. Anywhere.", emoji: "🚫", color: "bg-muted", consequence: "Morale +6, Physical +1 next season, a very calm season",
          apply: s => { s.morale = clamp(s.morale + 6, 0, 100); bump(s, "physical", 1); s.events = [...s.events, "🎥 Turned down the documentary money for a quiet year. Slept like a baby, played like an adult"]; return s; } },
      ] });
  }

  if (pro >= 3) {
    push({ id: 409, emoji: "🎙️", title: "Three Hours On A Podcast",
      description: "Two hours and forty minutes in, relaxed, laughing, you named the teammate who cannot defend and the chairman who lied to your face. The host's eyes lit up like a slot machine.",
      category: "negative", choices: [
        { label: "Let it run completely unedited", emoji: "🔊", color: "bg-red-600", consequence: "Followers +1.8M, net worth +€150k, Popularity -4",
          apply: s => { followers(s, 1.8); money(s, 0.15); s.popularity = clamp(s.popularity - 4, 0, 100); s.morale = clamp(s.morale + 2, 0, 100); s.events = [...s.events, "🎙️ Let the podcast run unedited. Two people stopped speaking to you and a million people started following you"]; return s; } },
        { label: "Pay €200k to get the last hour cut", emoji: "✂️", color: "bg-blue-600", consequence: "Net worth -€200k, followers +400k, nothing leaks",
          apply: s => { money(s, -0.2); followers(s, 0.4); s.morale = clamp(s.morale + 2, 0, 100); s.events = [...s.events, "🎙️ Paid a podcast €200k to lose the last hour. Best money you ever spent on silence"]; return s; } },
        { label: "Ring the teammate and the chairman before it airs", emoji: "📞", color: "bg-emerald-600", consequence: "Integrity +6, Morale +5, Popularity +2, followers +300k",
          apply: s => { s.integrityBonus += 6; s.morale = clamp(s.morale + 5, 0, 100); s.popularity = clamp(s.popularity + 2, 0, 100); followers(s, 0.3); s.events = [...s.events, "🎙️ Warned both of them before the podcast dropped. Awkward calls, no ambush"]; return s; } },
      ] });
  }

  if (state.popularity >= 30) {
    push({ id: 410, emoji: "📰", title: "They Printed A Quote You Never Said",
      description: "A back page has you calling the fans of your own club spoiled. You have never said it, thought it, or been near the journalist who wrote it. Your phone has 400 notifications and none of them are nice.",
      category: "negative", choices: [
        { label: "Sue the paper, €300k in fees", emoji: "⚖️", color: "bg-red-600", consequence: "Net worth -€300k, then 60%: win €1M and Popularity +4",
          apply: s => { money(s, -0.3); if (Math.random() < 0.6) { money(s, 1); s.popularity = clamp(s.popularity + 4, 0, 100); s.events = [...s.events, "📰 Sued the paper over the fake quote and won a million. The apology was printed near the horoscopes"]; } else { s.morale = clamp(s.morale - 4, 0, 100); s.events = [...s.events, "📰 Sued the paper over the fake quote and lost on a technicality. Lawyers do very well out of back pages"]; } return s; } },
        { label: "Post the full recording of what you actually said", emoji: "🎧", color: "bg-emerald-600", consequence: "Followers +1M, Popularity +6, the paper prints an apology in tiny letters",
          apply: s => { followers(s, 1); s.popularity = clamp(s.popularity + 6, 0, 100); s.integrityBonus += 3; s.events = [...s.events, "📰 Posted the raw audio. The fake quote died in about nine minutes"]; return s; } },
        { label: "Ignore it and play", emoji: "😶", color: "bg-muted", consequence: "Morale +3, Popularity -2, it fades by March",
          apply: s => { s.morale = clamp(s.morale + 3, 0, 100); s.popularity = clamp(s.popularity - 2, 0, 100); s.events = [...s.events, "📰 Never responded to the made up quote. Some fans still believe it, which is the price of peace"]; return s; } },
      ] });
  }

  /* ══ THEME 3: FANS AND COMMUNITY (411-416) ══ */
  if (state.popularity >= 15) {
    push({ id: 411, emoji: "🏥", title: "Ward Six",
      description: "The club does a hospital visit every December. One nine year old knows your assist numbers better than you do, asks about your left foot, and is not going home again.",
      category: "life", choices: [
        { label: "Go back every month, no cameras, no posts", emoji: "🤫", color: "bg-emerald-600", consequence: "Morale +10, Integrity +8, nobody outside the ward ever knows",
          apply: s => { s.morale = clamp(s.morale + 10, 0, 100); s.integrityBonus += 8; setFlag(s, "rWardSix", 1); s.events = [...s.events, "🏥 Went back to the childrens ward every month for a year and never told a single reporter"]; return s; } },
        { label: "Fund the ward's family room: €500k", emoji: "🏗️", color: "bg-blue-600", consequence: "Net worth -€500k, Popularity +8, Integrity +10, Morale +8",
          apply: s => { money(s, -0.5); s.popularity = clamp(s.popularity + 8, 0, 100); s.integrityBonus += 10; s.morale = clamp(s.morale + 8, 0, 100); setFlag(s, "rWardSix", 2); s.events = [...s.events, "🏥 Paid €500k for a family room on ward six. There is a photo of a nine year old on the door"]; return s; } },
        { label: "Let the club film one visit for the campaign", emoji: "📣", color: "bg-amber-600", consequence: "Followers +900k, Popularity +6, Morale +4, it feels slightly wrong",
          apply: s => { followers(s, 0.9); s.popularity = clamp(s.popularity + 6, 0, 100); s.morale = clamp(s.morale + 4, 0, 100); s.integrityBonus += 2; s.events = [...s.events, "🏥 Let the cameras into the hospital visit. It raised a fortune and you still think about the camera"]; return s; } },
      ] });
  }

  if (pro >= 1) {
    push({ id: 412, emoji: "🚌", title: "The Bus Died On The Motorway",
      description: "Fifty away fans are stood on a hard shoulder ninety minutes from kickoff, and the replacement coach is two hours away. Somebody has already tweeted a photo of the smoke.",
      category: "life", choices: [
        { label: "Pay for coaches and refund every ticket: €40k", emoji: "💳", color: "bg-emerald-600", consequence: "Net worth -€40k, Popularity +7, Morale +5",
          apply: s => { money(s, -0.04); s.popularity = clamp(s.popularity + 7, 0, 100); s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "🚌 Paid for replacement coaches and refunded the tickets when the supporters bus died"]; return s; } },
        { label: "Get them all in free next home game and meet them", emoji: "🎟️", color: "bg-blue-600", consequence: "Popularity +5, Integrity +3, Morale +4, costs almost nothing",
          apply: s => { s.popularity = clamp(s.popularity + 5, 0, 100); s.integrityBonus += 3; s.morale = clamp(s.morale + 4, 0, 100); s.events = [...s.events, "🚌 Got the stranded fifty into the next home game for free and shook every hand"]; return s; } },
        { label: "Buy the supporters club a coach outright: €120k", emoji: "🚍", color: "bg-amber-600", consequence: "Net worth -€120k, Popularity +10, followers +300k",
          apply: s => { money(s, -0.12); s.popularity = clamp(s.popularity + 10, 0, 100); followers(s, 0.3); s.events = [...s.events, "🚌 Bought the supporters club an actual coach. They painted your squad number on the back of it"]; return s; } },
      ] });
  }

  if (state.popularity >= 40 || state.overall >= 80) {
    push({ id: 413, emoji: "🎨", title: "Four Storeys Of Your Face",
      description: "Someone has painted your celebration across a gable end near the ground. It is genuinely beautiful. The council has called it unlicensed and sent a letter about paint.",
      category: "positive", choices: [
        { label: "Pay the fine and buy the wall: €200k", emoji: "🧱", color: "bg-emerald-600", consequence: "Net worth -€200k, Popularity +9, Morale +7, the mural is permanent",
          apply: s => { money(s, -0.2); s.popularity = clamp(s.popularity + 9, 0, 100); s.morale = clamp(s.morale + 7, 0, 100); setFlag(s, "rMural", 1); s.events = [...s.events, "🎨 Bought the wall your mural is painted on. It is not going anywhere now"]; return s; } },
        { label: "Ask the artist to paint the fans instead of you", emoji: "🖌️", color: "bg-blue-600", consequence: "Integrity +8, Popularity +7, Morale +5, followers +500k",
          apply: s => { s.integrityBonus += 8; s.popularity = clamp(s.popularity + 7, 0, 100); s.morale = clamp(s.morale + 5, 0, 100); followers(s, 0.5); s.events = [...s.events, "🎨 Asked the muralist to paint the away end instead of your face. It became the most photographed wall in the city"]; return s; } },
        { label: "Get your sponsor to fund it, logo in the corner", emoji: "🏷️", color: "bg-amber-600", consequence: "Sponsor income +€300k, Popularity +2, the corner logo gets noticed",
          apply: s => { s.sponsorshipIncome = Math.round((s.sponsorshipIncome + 0.3) * 100) / 100; s.popularity = clamp(s.popularity + 2, 0, 100); s.morale = clamp(s.morale + 2, 0, 100); s.events = [...s.events, "🎨 Let a sponsor pay for the mural. A boot logo now floats near your left ear forever"]; return s; } },
      ] });
  }

  if (pro >= 2) {
    push({ id: 414, emoji: "🧒", title: "Same Kid, Same Gate, Every Day",
      description: "He has been at the training ground gate every session since August, rain included. One photo, one signature on the same glove, then he runs for the bus to school.",
      category: "life", choices: [
        { label: "Season ticket and a squad signed shirt", emoji: "🎁", color: "bg-emerald-600", consequence: "Morale +8, Integrity +5, Popularity +3",
          apply: s => { s.morale = clamp(s.morale + 8, 0, 100); s.integrityBonus += 5; s.popularity = clamp(s.popularity + 3, 0, 100); s.events = [...s.events, "🧒 Got the gate kid a season ticket and a shirt signed by all 25 players"]; return s; } },
        { label: "Ask the academy to give him a trial", emoji: "⚽", color: "bg-blue-600", consequence: "Morale +6, Integrity +6, you may have started something",
          apply: s => { s.morale = clamp(s.morale + 6, 0, 100); s.integrityBonus += 6; setFlag(s, "rGateKid", 1); s.events = [...s.events, "🧒 Got the gate kid an academy trial. He was better than anyone expected, including him"]; return s; } },
        { label: "Bring him and twenty regulars in to watch a session", emoji: "👥", color: "bg-amber-600", consequence: "Popularity +6, followers +400k, Morale +5",
          apply: s => { s.popularity = clamp(s.popularity + 6, 0, 100); followers(s, 0.4); s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "🧒 Brought the gate regulars inside to watch a full session. The kid told him he could not sleep the night before"]; return s; } },
      ] });
  }

  if (state.netWorth >= 1) {
    push({ id: 415, emoji: "💸", title: "The Away End Cannot Afford The Away End",
      description: "The supporters trust writes you a very polite letter. Coach travel has gone up 60% and the away section has been half empty since October, not because people stopped caring.",
      category: "life", choices: [
        { label: "Fund away travel for the whole season: €250k", emoji: "🎫", color: "bg-emerald-600", consequence: "Net worth -€250k, Popularity +12, Integrity +8, Morale +7",
          apply: s => { money(s, -0.25); s.popularity = clamp(s.popularity + 12, 0, 100); s.integrityBonus += 8; s.morale = clamp(s.morale + 7, 0, 100); s.events = [...s.events, "💸 Paid for a full season of away coaches. The away end sold out for the first time in four years"]; return s; } },
        { label: "Match whatever they raise, up to €100k", emoji: "🤲", color: "bg-blue-600", consequence: "Net worth -€100k, Popularity +7, Integrity +5, they raise more than expected",
          apply: s => { money(s, -0.1); s.popularity = clamp(s.popularity + 7, 0, 100); s.integrityBonus += 5; s.events = [...s.events, "💸 Offered to match the supporters trust pound for pound. They out raised you by a mile"]; return s; } },
        { label: "Get the whole squad to chip in a day's wages", emoji: "🧑‍🤝‍🧑", color: "bg-amber-600", consequence: "Net worth -€50k, Popularity +9, Morale +5, you lead the room",
          apply: s => { money(s, -0.05); s.isLeader = true; s.popularity = clamp(s.popularity + 9, 0, 100); s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "💸 Got all 25 players to give a days wages to away travel. Two lads gave a week"]; return s; } },
      ] });
  }

  if (!!state.academyClubName && state.netWorth >= 2) {
    push({ id: 416, emoji: "🏚️", title: "The Club That Raised You Is Skint",
      description: `${state.academyClubName} cannot heat the changing rooms and is about to fold the under-14s. The man who gave you your first pair of boots is fundraising with a raffle.`,
      category: "life", choices: [
        { label: "Write the cheque: €1M, name off the door", emoji: "✍️", color: "bg-emerald-600", consequence: "Net worth -€1M, Integrity +12, Morale +10, Popularity +6",
          apply: s => { money(s, -1); s.integrityBonus += 12; s.morale = clamp(s.morale + 10, 0, 100); s.popularity = clamp(s.popularity + 6, 0, 100); setFlag(s, "rAcademySave", 1); s.events = [...s.events, `🏚️ Quietly wrote ${s.academyClubName || "the academy"} a cheque for €1M and refused to have anything named after you`]; return s; } },
        { label: "Fund kits and boots, and go coach a session", emoji: "🥾", color: "bg-blue-600", consequence: "Net worth -€100k, Morale +8, Integrity +6, Popularity +4",
          apply: s => { money(s, -0.1); s.morale = clamp(s.morale + 8, 0, 100); s.integrityBonus += 6; s.popularity = clamp(s.popularity + 4, 0, 100); s.events = [...s.events, "🏚️ Paid for the old academy's kits and boots, then coached the under-14s on a Tuesday night in the rain"]; return s; } },
        { label: "Organise a testimonial match to raise it properly", emoji: "🏟️", color: "bg-amber-600", consequence: "Popularity +8, Integrity +7, followers +500k, Morale +5",
          apply: s => { s.popularity = clamp(s.popularity + 8, 0, 100); s.integrityBonus += 7; followers(s, 0.5); s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "🏚️ Put on a testimonial for your old academy. Nine internationals turned up and the under-14s survived"]; return s; } },
      ] });
  }

  /* ══ THEME 4: TEAMMATES AND DRESSING ROOM (417-423) ══ */
  if (state.overall >= 75 && state.age >= 25) {
    push({ id: 417, emoji: "🐣", title: "He Still Has Your Poster",
      description: "The new 18 year old copies your warmup, your celebration and, unfortunately, your haircut. He has asked to sit next to you on the bus for four straight away trips.",
      category: "life", choices: [
        { label: "Mentor him properly: extra sessions, film, everything", emoji: "🧑‍🏫", color: "bg-emerald-600", consequence: "Morale +7, Popularity +3, you become the leader of the group",
          apply: s => { s.isLeader = true; s.morale = clamp(s.morale + 7, 0, 100); s.popularity = clamp(s.popularity + 3, 0, 100); setFlag(s, "rRookie", 1); s.events = [...s.events, "🐣 Took the rookie under your wing for a full season. He turned into a problem for everyone else"]; return s; } },
        { label: "Tell him to stop copying you and find his own game", emoji: "🪞", color: "bg-blue-600", consequence: "Morale +5, Integrity +5, he is better for it",
          apply: s => { s.morale = clamp(s.morale + 5, 0, 100); s.integrityBonus += 5; s.events = [...s.events, "🐣 Told the rookie to stop copying you and go be himself. He got the haircut fixed too"]; return s; } },
        { label: "Keep your distance, he wants your shirt", emoji: "🧊", color: "bg-muted", consequence: "Shooting +1 and Physical +1 next season, Morale +2",
          apply: s => { bump(s, "shooting", 1); bump(s, "physical", 1); s.morale = clamp(s.morale + 2, 0, 100); s.events = [...s.events, "🐣 Kept the kid at arms length and put the energy into your own numbers instead"]; return s; } },
      ] });
  }

  if (pro >= 3 && !state.isLeader) {
    push({ id: 418, emoji: "🎖️", title: "The Squad Voted",
      description: "The manager put the armband to a dressing room vote and you won it by nine votes. The veteran who has been here eleven years came second, and he clapped.",
      category: "positive", choices: [
        { label: "Take the armband", emoji: "©️", color: "bg-emerald-600", consequence: "Wage +5%, Morale +8, Popularity +5, you are captain",
          apply: s => { s.isLeader = true; s.weeklyWage = Math.round(s.weeklyWage * 1.05); s.morale = clamp(s.morale + 8, 0, 100); s.popularity = clamp(s.popularity + 5, 0, 100); s.events = [...s.events, "🎖️ Won the captaincy in a squad vote and wore the armband for the first time at home"]; return s; } },
        { label: "Give it to the veteran in his last season", emoji: "🫡", color: "bg-blue-600", consequence: "Integrity +10, Popularity +4, Morale +6, the room never forgets it",
          apply: s => { s.integrityBonus += 10; s.popularity = clamp(s.popularity + 4, 0, 100); s.morale = clamp(s.morale + 6, 0, 100); s.events = [...s.events, "🎖️ Handed the armband to the veteran for his last season. He led out his kids at his testimonial wearing it"]; return s; } },
        { label: "Refuse: you lead by playing, not by talking", emoji: "⚽", color: "bg-muted", consequence: "Physical +1 next season, Morale +4, no extra meetings",
          apply: s => { bump(s, "physical", 1); s.morale = clamp(s.morale + 4, 0, 100); s.events = [...s.events, "🎖️ Turned the captaincy down and let your football do the talking. Zero committee meetings attended"]; return s; } },
      ] });
  }

  if (pro >= 2) {
    push({ id: 419, emoji: "💰", title: "The Fines Committee",
      description: "Late for the bus is €500, phone in a meeting is €300, and a new haircut on matchday is €1,000. You have just been elected treasurer, mostly as a joke.",
      category: "life", choices: [
        { label: "Run it by the book, pot pays for the Christmas do", emoji: "📒", color: "bg-blue-600", consequence: "Morale +5, Popularity +1, discipline holds",
          apply: s => { s.morale = clamp(s.morale + 5, 0, 100); s.popularity = clamp(s.popularity + 1, 0, 100); s.events = [...s.events, "💰 Ran the fines system with an iron fist. The Christmas do was legendary and legally funded"]; return s; } },
        { label: "Scrap fines and pay for the squad trip yourself: €150k", emoji: "🏝️", color: "bg-emerald-600", consequence: "Net worth -€150k, Morale +10, you own the dressing room",
          apply: s => { money(s, -0.15); s.morale = clamp(s.morale + 10, 0, 100); s.isLeader = true; s.events = [...s.events, "💰 Abolished the fines and paid for the squad trip out of your own pocket. Nobody was late for anything again"]; return s; } },
        { label: "Donate the whole pot to the club food bank", emoji: "🥫", color: "bg-amber-600", consequence: "Integrity +10, Popularity +7, Morale +3",
          apply: s => { s.integrityBonus += 10; s.popularity = clamp(s.popularity + 7, 0, 100); s.morale = clamp(s.morale + 3, 0, 100); s.events = [...s.events, "💰 Gave the entire fines pot to the club food bank. Two lads got fined on purpose after that"]; return s; } },
      ] });
  }

  if (pro >= 2) {
    push({ id: 420, emoji: "🏠", title: "The New Signing Cries In The Ice Bath",
      description: "Nineteen years old, two thousand miles from home, no driving license and four months of hotel pasta. He thinks nobody has noticed. Everybody has noticed.",
      category: "life", choices: [
        { label: "Move him into your spare room and drive him everywhere", emoji: "🚗", color: "bg-emerald-600", consequence: "Morale +7, Integrity +8, Popularity +3",
          apply: s => { s.morale = clamp(s.morale + 7, 0, 100); s.integrityBonus += 8; s.popularity = clamp(s.popularity + 3, 0, 100); s.events = [...s.events, "🏠 Moved the homesick signing into your spare room. He scored nine goals and never washed a plate"]; return s; } },
        { label: "Fly his mum over for a month: €15k", emoji: "✈️", color: "bg-blue-600", consequence: "Net worth -€20k, Morale +8, Integrity +7",
          apply: s => { money(s, -0.02); s.morale = clamp(s.morale + 8, 0, 100); s.integrityBonus += 7; s.events = [...s.events, "🏠 Flew a homesick teammate's mum over for a month. She cooked for the whole back four"]; return s; } },
        { label: "Get the club to hire a proper family liaison", emoji: "🗂️", color: "bg-amber-600", consequence: "Popularity +4, Integrity +5, Morale +4, it helps every signing after him",
          apply: s => { s.popularity = clamp(s.popularity + 4, 0, 100); s.integrityBonus += 5; s.morale = clamp(s.morale + 4, 0, 100); setFlag(s, "rLiaison", 1); s.events = [...s.events, "🏠 Pushed the club into hiring a family liaison officer. Every foreign signing since has had a soft landing"]; return s; } },
      ] });
  }

  if (!isKeeper && state.age <= 31) {
    push({ id: 421, emoji: "🎯", title: "Forty Minutes After Everyone Else Goes In",
      description: "The 36 year old with the ridiculous whip on his free kicks offers to teach you. One condition: every day, no excuses, including the day after a night game.",
      category: "positive", choices: [
        { label: "Every single day, all season", emoji: "🥅", color: "bg-emerald-600", consequence: "Shooting +4 and Passing +1 next season, Morale -2",
          apply: s => { bump(s, "shooting", 4); bump(s, "passing", 1); s.morale = clamp(s.morale - 2, 0, 100); s.events = [...s.events, "🎯 Stayed out with the old man every day for a season. Your free kicks now bend like a rumour"]; return s; } },
        { label: "Twice a week and keep your legs fresh", emoji: "🦵", color: "bg-blue-600", consequence: "Shooting +2 and Pace +1 next season",
          apply: s => { bump(s, "shooting", 2); bump(s, "pace", 1); s.events = [...s.events, "🎯 Did free kick work twice a week. Enough to improve, not enough to hobble"]; return s; } },
        { label: "Ask him to teach the whole group instead", emoji: "👨‍🏫", color: "bg-amber-600", consequence: "Shooting +1 next season, Morale +6, Popularity +2, you lead the room",
          apply: s => { bump(s, "shooting", 1); s.morale = clamp(s.morale + 6, 0, 100); s.popularity = clamp(s.popularity + 2, 0, 100); s.isLeader = true; s.events = [...s.events, "🎯 Turned one veteran's free kick session into a squad wide masterclass. Four lads got better, one got a nickname"]; return s; } },
      ] });
  }

  if (pro >= 2 && state.socialMediaFollowers >= 0.3) {
    push({ id: 422, emoji: "📱", title: "Somebody Screenshotted The Squad Group Chat",
      description: "Two hundred messages are on a fan forum, including your detailed review of the manager's training drills and eleven voice notes you do not remember sending.",
      category: "negative", choices: [
        { label: "Own it: apologise to the group and the gaffer", emoji: "🙇", color: "bg-emerald-600", consequence: "Morale +4, Integrity +6, Popularity +2",
          apply: s => { s.morale = clamp(s.morale + 4, 0, 100); s.integrityBonus += 6; s.popularity = clamp(s.popularity + 2, 0, 100); s.events = [...s.events, "📱 Owned the group chat leak in front of the squad and the gaffer. Nobody enjoyed it, everybody respected it"]; return s; } },
        { label: "Hunt the leaker", emoji: "🔎", color: "bg-red-600", consequence: "Half the time you find him and the room tightens, half the time it eats the season",
          apply: s => { if (Math.random() < 0.5) { s.morale = clamp(s.morale + 6, 0, 100); s.events = [...s.events, "📱 Found the group chat leaker in nine days. He was gone in January and the room got tighter"]; } else { s.morale = clamp(s.morale - 6, 0, 100); s.popularity = clamp(s.popularity - 3, 0, 100); s.events = [...s.events, "📱 Spent four months hunting a leaker you never found. Paranoia is a terrible teammate"]; } return s; } },
        { label: "Delete it, start a new chat with actual rules", emoji: "🧹", color: "bg-blue-600", consequence: "Morale +3, Popularity +1, you set the standard",
          apply: s => { s.morale = clamp(s.morale + 3, 0, 100); s.popularity = clamp(s.popularity + 1, 0, 100); s.isLeader = true; s.events = [...s.events, "📱 Nuked the squad group chat and wrote three rules for the new one. Rule one was no voice notes"]; return s; } },
      ] });
  }

  if (!isKeeper && pro >= 2) {
    push({ id: 423, emoji: "🤝", title: "The New Striker Wants Your Penalties",
      description: "He signed for €40M, he has scored 11 in 14, and he has just asked you, in front of eight people, whether he can take the penalties now.",
      category: "life", choices: [
        { label: "Hand them over for the season", emoji: "🫱", color: "bg-blue-600", consequence: "Morale +5, Integrity +5, Shooting -1 next season, fewer goals for you",
          apply: s => { s.morale = clamp(s.morale + 5, 0, 100); s.integrityBonus += 5; bump(s, "shooting", -1); s.events = [...s.events, "🤝 Gave the new striker the penalties without a word of argument. He missed the first one and never mentioned it again"]; return s; } },
        { label: "Keep them and back it up", emoji: "🥶", color: "bg-emerald-600", consequence: "Shooting +2 next season, Morale +3, tension every time you step up",
          apply: s => { bump(s, "shooting", 2); s.morale = clamp(s.morale + 3, 0, 100); s.events = [...s.events, "🤝 Kept the penalties, scored eight from eight, and enjoyed every single walk back to the halfway line"]; return s; } },
        { label: "Settle it with a shootout after training", emoji: "🎪", color: "bg-amber-600", consequence: "Morale +8 either way, and the winner takes them",
          apply: s => { s.morale = clamp(s.morale + 8, 0, 100); if (Math.random() < 0.5) { bump(s, "shooting", 2); s.events = [...s.events, "🤝 Won the penalty shootout 5-4 in front of the whole squad. The new striker took it very badly"]; } else { s.integrityBonus += 4; s.events = [...s.events, "🤝 Lost the penalty shootout 5-4 and handed the duties over with a straight face. The squad talked about it for months"]; } return s; } },
      ] });
  }

  /* ══ THEME 5: TRAVEL AND FOOTBALL CULTURE (424-430) ══ */
  if (pro >= 2) {
    push({ id: 424, emoji: "🔥", title: "Sixty Thousand People Hate You Specifically",
      description: "Lasers in your eyes during the warmup, coins on the touchline, a flare over the near post and tape on the coach windows on the way in. Your name is on a banner and it is not a compliment.",
      category: "negative", choices: [
        { label: "Feed off it and celebrate in front of the home end", emoji: "📣", color: "bg-red-600", consequence: "Morale +8, Popularity +5, a €50k fine and a booking",
          apply: s => { s.morale = clamp(s.morale + 8, 0, 100); s.popularity = clamp(s.popularity + 5, 0, 100); money(s, -0.05); s.events = [...s.events, "🔥 Scored in the most hostile ground in the league and celebrated directly in front of the home end. Worth every euro of the fine"]; return s; } },
        { label: "Head down, do the job, say nothing", emoji: "🤐", color: "bg-blue-600", consequence: "Physical +1 next season, Morale +4, Integrity +3",
          apply: s => { bump(s, "physical", 1); s.morale = clamp(s.morale + 4, 0, 100); s.integrityBonus += 3; s.events = [...s.events, "🔥 Took 90 minutes of abuse without a flicker and walked off with the three points"]; return s; } },
        { label: "Report the flares to the federation", emoji: "📋", color: "bg-emerald-600", consequence: "Integrity +8, Morale +3, Popularity -3 in that city forever",
          apply: s => { s.integrityBonus += 8; s.morale = clamp(s.morale + 3, 0, 100); s.popularity = clamp(s.popularity - 3, 0, 100); s.events = [...s.events, "🔥 Reported the flares that landed six feet from a ball boy. That city will boo you until you retire"]; return s; } },
      ] });
  }

  if (pro >= 1) {
    push({ id: 425, emoji: "🌏", title: "Preseason Where Football Just Arrived",
      description: "Fourteen hours in the air, forty degrees on landing, and thirty thousand people who learned the club anthem last week. There are nine commercial appearances in six days.",
      category: "life", choices: [
        { label: "Do every appearance and every clinic", emoji: "🤳", color: "bg-emerald-600", consequence: "Followers +1.5M, Popularity +6, sponsor income +€300k, Morale -4",
          apply: s => { followers(s, 1.5); s.popularity = clamp(s.popularity + 6, 0, 100); s.sponsorshipIncome = Math.round((s.sponsorshipIncome + 0.3) * 100) / 100; s.morale = clamp(s.morale - 4, 0, 100); s.events = [...s.events, "🌏 Did all nine tour appearances in six days. Slept for two days on the flight home and gained a million followers"]; return s; } },
        { label: "Skip the commercial circus and train properly", emoji: "🏋️", color: "bg-blue-600", consequence: "Pace +2 next season, Morale +3, an €80k club fine",
          apply: s => { bump(s, "pace", 2); s.morale = clamp(s.morale + 3, 0, 100); money(s, -0.08); s.events = [...s.events, "🌏 Skipped the tour sponsor events to train. Got fined €80k and came back the fittest man at the club"]; return s; } },
        { label: "Run a free kids clinic in a local school on your day off", emoji: "🎒", color: "bg-amber-600", consequence: "Integrity +8, Popularity +5, followers +500k, Morale +5",
          apply: s => { s.integrityBonus += 8; s.popularity = clamp(s.popularity + 5, 0, 100); followers(s, 0.5); s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "🌏 Spent your only tour day off coaching 200 kids in a school yard with two cones and no shade"]; return s; } },
      ] });
  }

  if (pro >= 1) {
    push({ id: 426, emoji: "❄️", title: "Minus Twenty And The League Plays On",
      description: "The pitch is heated. The air is not. Your eyelashes froze during the anthem and a substitute lost feeling in three fingers before he got on.",
      category: "life", choices: [
        { label: "Buy the squad proper cold weather kit: €60k", emoji: "🧤", color: "bg-emerald-600", consequence: "Net worth -€60k, Morale +8, you lead the room",
          apply: s => { money(s, -0.06); s.morale = clamp(s.morale + 8, 0, 100); s.isLeader = true; s.events = [...s.events, "❄️ Bought the whole squad arctic grade base layers. Two lads cried, possibly from the cold"]; return s; } },
        { label: "Train in it every day until it stops mattering", emoji: "🥶", color: "bg-blue-600", consequence: "Physical +3 next season, Morale -4",
          apply: s => { bump(s, "physical", 3); s.morale = clamp(s.morale - 4, 0, 100); s.events = [...s.events, "❄️ Trained outside all winter in minus twenty. Came out the other side basically weatherproof"]; return s; } },
        { label: "Book yourself a warm weather camp in the break: €150k", emoji: "🌴", color: "bg-amber-600", consequence: "Net worth -€150k, Pace +2 next season, Morale +7",
          apply: s => { money(s, -0.15); bump(s, "pace", 2); s.morale = clamp(s.morale + 7, 0, 100); s.events = [...s.events, "❄️ Spent the winter break at a private warm weather camp. Came back tanned, sharp and slightly resented"]; return s; } },
      ] });
  }

  if (pro >= 2) {
    push({ id: 427, emoji: "⛰️", title: "Three Thousand Metres Above Sea Level",
      description: "The home team has lived up here their whole lives. Twenty minutes in, your legs work fine and your lungs have resigned. The stadium is at the top of a road with no barriers.",
      category: "life", choices: [
        { label: "Fly out a week early to acclimatise: €200k of your own money", emoji: "🛫", color: "bg-emerald-600", consequence: "Net worth -€200k, Physical +2 next season, Morale +4",
          apply: s => { money(s, -0.2); bump(s, "physical", 2); s.morale = clamp(s.morale + 4, 0, 100); s.events = [...s.events, "⛰️ Paid €200k to fly out a week early for altitude. Ran the whole 90 while everyone else drowned"]; return s; } },
        { label: "Land three hours before kickoff, the old trick", emoji: "⏱️", color: "bg-blue-600", consequence: "Morale +5, no fitness gain, pure adrenaline",
          apply: s => { s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "⛰️ Landed three hours before an altitude away game and survived on adrenaline and one inhaler"]; return s; } },
        { label: "Get the sports science team to build an altitude plan for everyone", emoji: "📊", color: "bg-amber-600", consequence: "Physical +1 next season, Popularity +3, Morale +4, you lead the room",
          apply: s => { bump(s, "physical", 1); s.popularity = clamp(s.popularity + 3, 0, 100); s.morale = clamp(s.morale + 4, 0, 100); s.isLeader = true; s.events = [...s.events, "⛰️ Made the club build a proper altitude protocol. The whole squad benefited and nobody said thank you"]; return s; } },
      ] });
  }

  if (pro >= 1) {
    push({ id: 428, emoji: "🏖️", title: "They Call It A Pitch",
      description: "Sand, two brave tufts of grass, and a penalty spot marked out with builders chalk. The home side warms up barefoot and looks extremely comfortable.",
      category: "life", choices: [
        { label: "Put it in the air and bully them", emoji: "🪂", color: "bg-blue-600", consequence: "Physical +2 next season, Morale +4",
          apply: s => { bump(s, "physical", 2); s.morale = clamp(s.morale + 4, 0, 100); s.events = [...s.events, "🏖️ Won a cup tie on a sand pitch by putting every ball in the sky. Ugly, effective, unforgettable"]; return s; } },
        { label: "Master the surface: first touch drills all week", emoji: "🦶", color: "bg-emerald-600", consequence: "Dribbling +2 and Passing +1 next season",
          apply: s => { bump(s, "dribbling", 2); bump(s, "passing", 1); s.events = [...s.events, "🏖️ Spent a week training on the worst surface available. Your first touch has never been the same since, in a good way"]; return s; } },
        { label: "Pay to have their pitch relaid after the game: €90k", emoji: "🌱", color: "bg-amber-600", consequence: "Net worth -€90k, Popularity +8, Integrity +10, followers +300k",
          apply: s => { money(s, -0.09); s.popularity = clamp(s.popularity + 8, 0, 100); s.integrityBonus += 10; followers(s, 0.3); s.events = [...s.events, "🏖️ Paid €90k to relay a sand pitch for a club that beat you. The town put a plaque on the gate"]; return s; } },
      ] });
  }

  if (abroad && pro >= 1) {
    push({ id: 429, emoji: "🛃", title: "Detained At Customs Over A Ham",
      description: "You tried to bring your grandmother's cured ham through an airport that has strong feelings about cured ham. Four hours in a small room with a man filling out a form about a leg.",
      category: "life", choices: [
        { label: "Surrender the ham with dignity", emoji: "🫡", color: "bg-blue-600", consequence: "Followers +400k, Morale +2, one grandmother disappointed",
          apply: s => { followers(s, 0.4); s.morale = clamp(s.morale + 2, 0, 100); s.events = [...s.events, "🛃 Gave up the ham at customs. Your grandmother has not fully forgiven the country"]; return s; } },
        { label: "Argue for four hours and miss the team bus", emoji: "😤", color: "bg-red-600", consequence: "€30k club fine, Morale +6, followers +600k, you keep the ham",
          apply: s => { money(s, -0.03); s.morale = clamp(s.morale + 6, 0, 100); followers(s, 0.6); s.events = [...s.events, "🛃 Missed the team bus arguing with customs and won. The ham travelled home in a taxi with you"]; return s; } },
        { label: "Post the whole saga and start a campaign", emoji: "🥓", color: "bg-emerald-600", consequence: "Followers +1.1M, Popularity +4, sponsor income +€200k",
          apply: s => { followers(s, 1.1); s.popularity = clamp(s.popularity + 4, 0, 100); s.sponsorshipIncome = Math.round((s.sponsorshipIncome + 0.2) * 100) / 100; s.events = [...s.events, "🛃 Turned the ham incident into a national story. A meat company now pays you an actual salary"]; return s; } },
      ] });
  }

  if (state.currentClubTier >= 3) {
    push({ id: 430, emoji: "🚐", title: "Twelve Hours On A Minibus To A Cup Tie",
      description: "No flight budget at this level. One minibus, one broken DVD player, a service station at three in the morning, and kickoff at noon on a pitch with a slope.",
      category: "life", choices: [
        { label: "Pay to fly the whole squad: €70k", emoji: "✈️", color: "bg-emerald-600", consequence: "Net worth -€70k, Morale +9, Popularity +4, you lead the room",
          apply: s => { money(s, -0.07); s.morale = clamp(s.morale + 9, 0, 100); s.popularity = clamp(s.popularity + 4, 0, 100); s.isLeader = true; s.events = [...s.events, "🚐 Paid €70k to fly the squad to a cup tie instead of 12 hours on a minibus. It leaked, and the fans loved it"]; return s; } },
        { label: "Take the bus and take the aux cord", emoji: "🎵", color: "bg-blue-600", consequence: "Morale +6, Physical -1 next season, dead legs at noon",
          apply: s => { s.morale = clamp(s.morale + 6, 0, 100); bump(s, "physical", -1); s.events = [...s.events, "🚐 Did the 12 hour minibus with the aux cord in your hand. Legs like concrete, dressing room like a party"]; return s; } },
        { label: "Neck pillow, earplugs, sleep the entire way", emoji: "😴", color: "bg-muted", consequence: "Pace +1 and Physical +1 next season, Morale +3",
          apply: s => { bump(s, "pace", 1); bump(s, "physical", 1); s.morale = clamp(s.morale + 3, 0, 100); s.events = [...s.events, "🚐 Slept 11 of the 12 hours on the minibus and was the only player who looked awake at kickoff"]; return s; } },
      ] });
  }

  /* ══ THEME 6: BODY AND MIND (431-437) ══ */
  if (pro >= 2) {
    push({ id: 431, emoji: "😴", title: "The Sleep Guy Wants Your Bedroom",
      description: "Blackout blinds, seventeen degrees, no screens after nine, and a mattress that costs more than your first car. He charges €90k a year and has a folder about your afternoons.",
      category: "life", choices: [
        { label: "Hire him and follow every single rule", emoji: "🛏️", color: "bg-emerald-600", consequence: "Net worth -€90k, Physical +2 and Pace +1 next season, Morale +4",
          apply: s => { money(s, -0.09); bump(s, "physical", 2); bump(s, "pace", 1); s.morale = clamp(s.morale + 4, 0, 100); s.events = [...s.events, "😴 Hired a sleep specialist and gave up screens after nine. Woke up feeling 23 again"]; return s; } },
        { label: "Take the free advice, bin the invoice", emoji: "📝", color: "bg-blue-600", consequence: "Physical +1 next season, Morale +2, no cost",
          apply: s => { bump(s, "physical", 1); s.morale = clamp(s.morale + 2, 0, 100); s.events = [...s.events, "😴 Took the sleep consultant's three free tips and politely declined the €90k package"]; return s; } },
        { label: "Refuse: your evenings are your own", emoji: "🎮", color: "bg-muted", consequence: "Morale +5, Physical -1 next season",
          apply: s => { s.morale = clamp(s.morale + 5, 0, 100); bump(s, "physical", -1); s.events = [...s.events, "😴 Told the sleep guy that 2am is a lifestyle. Happier, marginally slower"]; return s; } },
      ] });
  }

  if (flag(state, "rKitSystem") > 0 || pro >= 3) {
    push({ id: 432, emoji: "🧿", title: "It Started With The Left Sock",
      description: "Left sock first became a 40 minute ritual involving one specific song, one specific sandwich, and a phone call to an uncle who does not really follow football.",
      category: "life", choices: [
        { label: "Keep the ritual. It is working.", emoji: "🔮", color: "bg-blue-600", consequence: "Morale +6, and a one in four chance the day it breaks costs you dearly",
          apply: s => { s.morale = clamp(s.morale + 6, 0, 100); if (Math.random() < 0.25) { s.morale = clamp(s.morale - 12, 0, 100); s.events = [...s.events, "🧿 The sandwich shop shut down in March and your ritual collapsed with it. Four terrible weeks followed"]; } else { s.events = [...s.events, "🧿 Kept the 40 minute pre-match ritual all season. Uncle Tony took every single call"]; } return s; } },
        { label: "See the club psychologist and strip it back", emoji: "🧠", color: "bg-emerald-600", consequence: "Morale +5, Physical +1 next season, the ritual becomes three deep breaths",
          apply: s => { s.morale = clamp(s.morale + 5, 0, 100); bump(s, "physical", 1); setFlag(s, "rKitSystem", 0); s.events = [...s.events, "🧿 Worked with the club psychologist until the 40 minute ritual became three deep breaths"]; return s; } },
        { label: "Go the other way: do everything differently every week", emoji: "🃏", color: "bg-purple-600", consequence: "Followers +300k, and the chaos either sharpens you or scatters you",
          apply: s => { followers(s, 0.3); if (rand(0, 1) === 1) { bump(s, "dribbling", 3); s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "🧿 Changed your entire routine every week on purpose. Somehow it made you completely unpredictable"]; } else { s.morale = clamp(s.morale - 5, 0, 100); s.events = [...s.events, "🧿 Tried a different routine every week and spent the season feeling like a guest in your own life"]; } return s; } },
      ] });
  }

  if (pro >= 2) {
    push({ id: 433, emoji: "🩻", title: "The Scan Room",
      description: "Something went pop in your knee and then two days of silence while you waited. The consultant said the word \"structurally\", left a pause you will never forget, then said \"fine\".",
      category: "positive", choices: [
        { label: "Take three weeks off anyway to be safe", emoji: "🛋️", color: "bg-blue-600", consequence: "Physical +1 next season, Morale +6, Popularity -2 for the games missed",
          apply: s => { bump(s, "physical", 1); s.morale = clamp(s.morale + 6, 0, 100); s.popularity = clamp(s.popularity - 2, 0, 100); s.events = [...s.events, "🩻 The scan was clear but you took three weeks anyway. The knee has never complained since"]; return s; } },
        { label: "Back in training tomorrow", emoji: "⚡", color: "bg-red-600", consequence: "Morale +5, Pace +1 next season, 30% chance of a nagging issue all year",
          apply: s => { s.morale = clamp(s.morale + 5, 0, 100); bump(s, "pace", 1); if (Math.random() < 0.3) { bump(s, "physical", -2); s.events = [...s.events, "🩻 Went straight back in after the scare and spent the rest of the season managing a knee that never fully shut up"]; } else { s.events = [...s.events, "🩻 Back in training the next morning like nothing happened. Nothing did happen"]; } return s; } },
        { label: "Rebuild the knee properly with a specialist: €120k", emoji: "🔧", color: "bg-emerald-600", consequence: "Net worth -€120k, Physical +3 next season, Morale +7",
          apply: s => { money(s, -0.12); bump(s, "physical", 3); s.morale = clamp(s.morale + 7, 0, 100); s.events = [...s.events, "🩻 Spent €120k rebuilding a knee that was already fine. It is now the strongest joint in your body"]; return s; } },
      ] });
  }

  if (state.socialMediaFollowers >= 1) {
    push({ id: 434, emoji: "📵", title: "Ten Thousand Replies, All Of Them Read",
      description: "You read every single one after every game, good and bad, and your thumb knows the way in the dark. Last Tuesday you were awake at 4am reading a man in another country describe your first touch.",
      category: "life", choices: [
        { label: "Delete the apps for the whole season", emoji: "🗑️", color: "bg-emerald-600", consequence: "All stats +2 next season, Morale +8, followers -300k",
          apply: s => { s.socialMediaFocusBoost = true; followers(s, -0.3); s.morale = clamp(s.morale + 8, 0, 100); s.events = [...s.events, "📵 Deleted every app off your phone for a season. Best football of your life, no idea what anyone said about it"]; return s; } },
        { label: "Hand the accounts to a manager: €40k a year", emoji: "💼", color: "bg-blue-600", consequence: "Net worth -€40k, followers +800k, sponsor income +€200k, Morale +5",
          apply: s => { money(s, -0.04); followers(s, 0.8); s.sponsorshipIncome = Math.round((s.sponsorshipIncome + 0.2) * 100) / 100; s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "📵 Paid someone €40k a year to run your accounts and never see the replies. Followers up, blood pressure down"]; return s; } },
        { label: "Keep reading them and use it as fuel", emoji: "🔥", color: "bg-red-600", consequence: "Shooting +2 and Physical +2 next season, Morale -4",
          apply: s => { bump(s, "shooting", 2); bump(s, "physical", 2); s.morale = clamp(s.morale - 4, 0, 100); s.events = [...s.events, "📵 Kept reading every reply and turned spite into a legitimate energy source. Sleep suffered, numbers did not"]; return s; } },
      ] });
  }

  if (pro >= 1) {
    push({ id: 435, emoji: "🥗", title: "The Nutritionist Took Everything",
      description: "Gone: your mum's cooking, the Sunday takeaway, and the specific fizzy drink you have had at half time since you were twelve. She has a spreadsheet with your name on it and a red column.",
      category: "life", choices: [
        { label: "Full compliance for a season", emoji: "🥦", color: "bg-emerald-600", consequence: "Physical +3 and Pace +1 next season, Morale -6",
          apply: s => { bump(s, "physical", 3); bump(s, "pace", 1); s.morale = clamp(s.morale - 6, 0, 100); s.events = [...s.events, "🥗 Followed the nutrition plan to the gram for a season. Body fat down, joy down, numbers up"]; return s; } },
        { label: "Negotiate one cheat day a week", emoji: "🍕", color: "bg-blue-600", consequence: "Physical +1 next season, Morale +4",
          apply: s => { bump(s, "physical", 1); s.morale = clamp(s.morale + 4, 0, 100); s.events = [...s.events, "🥗 Negotiated Sunday back off the nutritionist. Everybody won, especially the takeaway"]; return s; } },
        { label: "Get her and your mum in a kitchen together", emoji: "👩‍🍳", color: "bg-amber-600", consequence: "Morale +8, Physical +2 next season, Integrity +3, net worth +€100k from the recipe book",
          apply: s => { s.morale = clamp(s.morale + 8, 0, 100); bump(s, "physical", 2); s.integrityBonus += 3; money(s, 0.1); s.events = [...s.events, "🥗 Put the club nutritionist and your mum in the same kitchen. They wrote a recipe book and it actually sold"]; return s; } },
      ] });
  }

  if (pro >= 2) {
    push({ id: 436, emoji: "🫁", title: "The Tunnel Feeling",
      description: "In the tunnel, for the first time, you could not get a full breath. You played 90 minutes, got a 7, and told absolutely nobody about the ten minutes before kickoff.",
      category: "life", choices: [
        { label: "See a sports psychologist every week", emoji: "🧠", color: "bg-emerald-600", consequence: "Morale +10, Physical +1 next season, Integrity +2",
          apply: s => { s.morale = clamp(s.morale + 10, 0, 100); bump(s, "physical", 1); s.integrityBonus += 2; setFlag(s, "rMind", 1); s.events = [...s.events, "🫁 Started seeing a sports psychologist every week. The tunnel stopped being the hardest part of the day"]; return s; } },
        { label: "Say it out loud to the squad", emoji: "🗣️", color: "bg-blue-600", consequence: "Morale +8, Popularity +6, Integrity +8, three teammates admit the same thing",
          apply: s => { s.morale = clamp(s.morale + 8, 0, 100); s.popularity = clamp(s.popularity + 6, 0, 100); s.integrityBonus += 8; s.isLeader = true; setFlag(s, "rMind", 2); s.events = [...s.events, "🫁 Told the dressing room you could not breathe in the tunnel. Three teammates said me too before you sat down"]; return s; } },
        { label: "Bury it and manage it alone", emoji: "🪨", color: "bg-muted", consequence: "Morale -3, Popularity +2, nobody ever sees a crack",
          apply: s => { s.morale = clamp(s.morale - 3, 0, 100); s.popularity = clamp(s.popularity + 2, 0, 100); s.events = [...s.events, "🫁 Handled the tunnel panic alone for a whole season. The crowd saw a machine and never knew"]; return s; } },
      ] });
  }

  if (state.netWorth >= 3) {
    push({ id: 437, emoji: "🧊", title: "The Recovery Palace",
      description: "A cryo chamber, a hyperbaric tent and a compression rig for the spare room. Three hundred thousand euros, six weeks of work, and one electrician who keeps asking what any of it is for.",
      category: "life", choices: [
        { label: "Build the whole lot: €300k", emoji: "🏗️", color: "bg-emerald-600", consequence: "Net worth -€300k, Physical +2 and Pace +1 next season, your career gets longer",
          apply: s => { money(s, -0.3); bump(s, "physical", 2); bump(s, "pace", 1); setFlag(s, "rRecovery", 1); s.properties = [...s.properties, "Home recovery suite"]; s.events = [...s.events, "🧊 Built a full recovery suite in the spare room. Two teammates now visit weekly and one has a key"]; return s; } },
        { label: "Just a sleep pod and a very good physio: €50k", emoji: "🛌", color: "bg-blue-600", consequence: "Net worth -€50k, Physical +1 next season, Morale +4",
          apply: s => { money(s, -0.05); bump(s, "physical", 1); s.morale = clamp(s.morale + 4, 0, 100); s.events = [...s.events, "🧊 Skipped the cryo chamber and hired a brilliant physio instead. Cheaper, warmer, nearly as good"]; return s; } },
        { label: "Spend it on your family's house instead", emoji: "🏡", color: "bg-amber-600", consequence: "Net worth -€300k, Morale +10, Integrity +5, Popularity +2",
          apply: s => { money(s, -0.3); s.morale = clamp(s.morale + 10, 0, 100); s.integrityBonus += 5; s.popularity = clamp(s.popularity + 2, 0, 100); s.events = [...s.events, "🧊 Cancelled the cryo chamber and did up the family house instead. Recovered better anyway"]; return s; } },
      ] });
  }

  /* ══ THEME 7: MONEY DECISIONS, LEGAL BUT NOT ALWAYS WISE (438-444) ══ */
  if (pro >= 2) {
    push({ id: 438, emoji: "👟", title: "The Boot Deal Is Up",
      description: "Your brand offers a renewal at the same money. A rival brand offers a lot more and a boot that, in the two pairs they sent, feels like a shoebox with laces.",
      category: "life", choices: [
        { label: "Stay loyal: less money, boots you trust", emoji: "🤝", color: "bg-emerald-600", consequence: "Sponsor income +€400k, Pace +1 next season, Morale +5",
          apply: s => { s.sponsorshipIncome = Math.round((s.sponsorshipIncome + 0.4) * 100) / 100; bump(s, "pace", 1); s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "👟 Re-signed with the boot brand you have worn since you were 14. Less money, zero blisters"]; return s; } },
        { label: "Take the rival's money", emoji: "💰", color: "bg-amber-600", consequence: "Net worth +€500k, sponsor income +€1.2M, Pace -1 next season, Morale -3",
          apply: s => { money(s, 0.5); s.sponsorshipIncome = Math.round((s.sponsorshipIncome + 1.2) * 100) / 100; bump(s, "pace", -1); s.morale = clamp(s.morale - 3, 0, 100); s.events = [...s.events, "👟 Took the bigger boot deal and spent three months with plasters on both heels"]; return s; } },
        { label: "Go unsponsored and pay for custom boots yourself", emoji: "🧵", color: "bg-blue-600", consequence: "Net worth -€80k, Pace +2 next season, Integrity +5, Morale +6",
          apply: s => { money(s, -0.08); bump(s, "pace", 2); s.integrityBonus += 5; s.morale = clamp(s.morale + 6, 0, 100); s.events = [...s.events, "👟 Turned down every boot deal and paid a cobbler in Italy to build boots around your own feet"]; return s; } },
      ] });
  }

  if (state.popularity >= 30) {
    push({ id: 439, emoji: "🏬", title: "Ribbon Cutting At A Shopping Centre",
      description: "One hundred and twenty thousand euros for forty minutes, a pair of scissors the size of a small child, and a photo with a man in a fox costume who is having a bad day.",
      category: "life", choices: [
        { label: "Take the money, cut the ribbon", emoji: "✂️", color: "bg-blue-600", consequence: "Net worth +€120k, followers +200k, Morale -2, the fox gets handsy",
          apply: s => { money(s, 0.12); followers(s, 0.2); s.morale = clamp(s.morale - 2, 0, 100); s.popularity = clamp(s.popularity + 1, 0, 100); s.events = [...s.events, "🏬 Opened a shopping centre for €120k. The fox mascot has been banned from future events"]; return s; } },
        { label: "Do it and give the fee to the local food bank", emoji: "🥫", color: "bg-emerald-600", consequence: "Integrity +10, Popularity +8, Morale +6",
          apply: s => { s.integrityBonus += 10; s.popularity = clamp(s.popularity + 8, 0, 100); s.morale = clamp(s.morale + 6, 0, 100); s.events = [...s.events, "🏬 Did the mall opening and gave all €120k to the food bank two streets away"]; return s; } },
        { label: "Decline and spend the afternoon on the training pitch", emoji: "⚽", color: "bg-muted", consequence: "Shooting +1 next season, Morale +3",
          apply: s => { bump(s, "shooting", 1); s.morale = clamp(s.morale + 3, 0, 100); s.events = [...s.events, "🏬 Turned down €120k for a ribbon and hit finishing drills instead"]; return s; } },
      ] });
  }

  if (state.popularity >= 25) {
    push({ id: 440, emoji: "🎗️", title: "The Charity Match Nobody Said Was Full Contact",
      description: "A legends and celebrities game for a children's hospice. A reality television star has already announced on camera that he intends to end your career, and he looks like he means it.",
      category: "life", choices: [
        { label: "Play, and play properly", emoji: "💥", color: "bg-emerald-600", consequence: "Popularity +8, Integrity +8, followers +700k, 20% chance of a real injury",
          apply: s => { s.popularity = clamp(s.popularity + 8, 0, 100); s.integrityBonus += 8; followers(s, 0.7); s.morale = clamp(s.morale + 6, 0, 100); if (Math.random() < 0.2) { bump(s, "physical", -2); s.events = [...s.events, "🎗️ Played the charity match properly and got done by a reality TV star. Two weeks out and a great cause"]; } else { s.events = [...s.events, "🎗️ Played the charity match properly, scored four, and made the TV star chase you for an hour"]; } return s; } },
        { label: "Play, but pull out of everything", emoji: "🕊️", color: "bg-blue-600", consequence: "Popularity +5, Integrity +5, Morale +3, no risk",
          apply: s => { s.popularity = clamp(s.popularity + 5, 0, 100); s.integrityBonus += 5; s.morale = clamp(s.morale + 3, 0, 100); s.events = [...s.events, "🎗️ Jogged through the charity match avoiding every tackle. The hospice got its money, your ankles got home"]; return s; } },
        { label: "Donate €300k instead and skip it", emoji: "🏦", color: "bg-amber-600", consequence: "Net worth -€300k, Integrity +6, Popularity +2, Physical +1 next season",
          apply: s => { money(s, -0.3); s.integrityBonus += 6; s.popularity = clamp(s.popularity + 2, 0, 100); bump(s, "physical", 1); s.events = [...s.events, "🎗️ Skipped the charity match and sent €300k instead. Raised more than the game did"]; return s; } },
      ] });
  }

  if (state.overall >= 78) {
    push({ id: 441, emoji: "✍️", title: "Ten Thousand Signatures",
      description: "A memorabilia company wants ten thousand signed shirts for nine hundred thousand euros. They will deliver them to your house in crates, and your wrist has already started negotiating.",
      category: "life", choices: [
        { label: "Sign all ten thousand", emoji: "🖊️", color: "bg-emerald-600", consequence: "Net worth +€900k, Morale -5, Physical -1 next season",
          apply: s => { money(s, 0.9); s.morale = clamp(s.morale - 5, 0, 100); bump(s, "physical", -1); s.events = [...s.events, "✍️ Signed 10,000 shirts over six weeks for €900k. By shirt 4,000 your signature was a rumour"]; return s; } },
        { label: "Sign two thousand and take €200k", emoji: "📦", color: "bg-blue-600", consequence: "Net worth +€200k, Morale -1",
          apply: s => { money(s, 0.2); s.morale = clamp(s.morale - 1, 0, 100); s.events = [...s.events, "✍️ Capped the memorabilia deal at 2,000 shirts. Wrist intact, €200k banked"]; return s; } },
        { label: "Refuse: autographs should be free and in person", emoji: "🙌", color: "bg-amber-600", consequence: "Integrity +8, Popularity +6, Morale +4, followers +400k",
          apply: s => { s.integrityBonus += 8; s.popularity = clamp(s.popularity + 6, 0, 100); s.morale = clamp(s.morale + 4, 0, 100); followers(s, 0.4); s.events = [...s.events, "✍️ Told the memorabilia company no and signed for free at the gate for an hour every Friday instead"]; return s; } },
      ] });
  }

  if (state.netWorth >= 2) {
    push({ id: 442, emoji: "🚗", title: "The Car With Two Hundred Bad Reviews",
      description: "Hand built, seven hundred horsepower, and a warranty document that appears to have been written as a joke. Eight hundred thousand euros. Your teammate has one and it is currently in a workshop.",
      category: "life", choices: [
        { label: "Buy it anyway", emoji: "🏎️", color: "bg-red-600", consequence: "Net worth -€800k, followers +600k, Morale +8, then the repair bills start",
          apply: s => { money(s, -0.8); followers(s, 0.6); s.morale = clamp(s.morale + 8, 0, 100); const repair = rand(5, 25) / 100; money(s, -repair); if (Math.random() < 0.5) { s.morale = clamp(s.morale - 5, 0, 100); s.events = [...s.events, `🚗 Bought the €800k nightmare car. It died on a slip road on the way to a home game and cost another €${Math.round(repair * 1000)}k`]; } else { s.events = [...s.events, `🚗 Bought the €800k nightmare car. Only €${Math.round(repair * 1000)}k of repairs in year one, which counts as a win`]; } return s; } },
        { label: "Buy the sensible fast one instead: €180k", emoji: "🚙", color: "bg-blue-600", consequence: "Net worth -€180k, Morale +5, it starts every morning",
          apply: s => { money(s, -0.18); s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "🚗 Bought the boring fast car. It has started, without drama, every single morning since"]; return s; } },
        { label: "Buy nothing and put it in an index fund", emoji: "📈", color: "bg-emerald-600", consequence: "Net worth +€150k a year, zero horsepower, zero glory",
          apply: s => { money(s, 0.15); s.investments = [...s.investments, "Extremely boring index fund"]; s.events = [...s.events, "📈 Skipped the supercar and put the money in an index fund. Your accountant sent flowers"]; return s; } },
      ] });
  }

  if (state.netWorth >= 2) {
    push({ id: 443, emoji: "🍽️", title: "Your Cousin's Restaurant Needs €400k",
      description: "He has a location, a chef, a logo he designed himself, and a business plan that is mostly vibes and one spreadsheet with a broken formula. He has also never asked you for anything before.",
      category: "life", choices: [
        { label: "Invest €400k and let him run it", emoji: "🤞", color: "bg-amber-600", consequence: "Net worth -€400k, 45% it works and returns €1.2M, otherwise it closes in 18 months",
          apply: s => { money(s, -0.4); if (Math.random() < 0.45) { money(s, 1.2); s.popularity = clamp(s.popularity + 3, 0, 100); s.investments = [...s.investments, "Cousin's restaurant"]; s.events = [...s.events, "🍽️ Backed your cousin's restaurant and it worked. There is a booth with your name on it and a queue outside"]; } else { s.morale = clamp(s.morale - 6, 0, 100); s.events = [...s.events, "🍽️ Backed your cousin's restaurant. It closed in 18 months and Christmas has been quiet since"]; } return s; } },
        { label: "Give him €50k as a gift, no shares, no strings", emoji: "🎁", color: "bg-emerald-600", consequence: "Net worth -€50k, Morale +5, Integrity +5, family stays family",
          apply: s => { money(s, -0.05); s.morale = clamp(s.morale + 5, 0, 100); s.integrityBonus += 5; s.events = [...s.events, "🍽️ Gave your cousin €50k as a gift instead of an investment. Nobody has to fall out over a gift"]; return s; } },
        { label: "Say no, and help him write a real business plan", emoji: "📐", color: "bg-blue-600", consequence: "Integrity +6, Morale +4, he gets a proper bank loan eventually",
          apply: s => { s.integrityBonus += 6; s.morale = clamp(s.morale + 4, 0, 100); s.events = [...s.events, "🍽️ Said no to the €400k and spent four evenings fixing his business plan. The bank said yes 14 months later"]; return s; } },
      ] });
  }

  if (state.netWorth >= 3 && flag(state, "rMumHouse") === 0) {
    push({ id: 444, emoji: "🏠", title: "The House You Promised When You Were Nine",
      description: "You told your mum at nine years old that you would buy her a house one day, and now you can. She says she likes her street, her neighbours and the bus route, and thanks you anyway.",
      category: "life", choices: [
        { label: "Buy the house on her own street: €900k", emoji: "🔑", color: "bg-emerald-600", consequence: "Net worth -€900k, Morale +12, Integrity +5, Popularity +4",
          apply: s => { money(s, -0.9); s.morale = clamp(s.morale + 12, 0, 100); s.integrityBonus += 5; s.popularity = clamp(s.popularity + 4, 0, 100); s.properties = [...s.properties, "Mum's house"]; setFlag(s, "rMumHouse", 1); s.events = [...s.events, "🏠 Bought your mum a house four doors from her old one. She kept the same neighbours and the same bus"]; return s; } },
        { label: "Do up the place she already loves: €200k", emoji: "🛠️", color: "bg-blue-600", consequence: "Net worth -€200k, Morale +10, Integrity +6",
          apply: s => { money(s, -0.2); s.morale = clamp(s.morale + 10, 0, 100); s.integrityBonus += 6; setFlag(s, "rMumHouse", 2); s.events = [...s.events, "🏠 Spent €200k gutting and rebuilding your mum's house around her. She cried at the kitchen island"]; return s; } },
        { label: "Fix every roof on her street and say nothing: €350k", emoji: "🧰", color: "bg-amber-600", consequence: "Net worth -€350k, Morale +9, Integrity +12, and it leaks eventually: Popularity +8",
          apply: s => { money(s, -0.35); s.morale = clamp(s.morale + 9, 0, 100); s.integrityBonus += 12; s.popularity = clamp(s.popularity + 8, 0, 100); setFlag(s, "rMumHouse", 3); s.events = [...s.events, "🏠 Paid to re-roof all 22 houses on your mum's street anonymously. A neighbour worked it out and told a newspaper"]; return s; } },
      ] });
  }

  return events;
}

/** Ids in the realism batch A band, used by the caller for de-duplication. */
export const REALISM_A_ID_MIN = 400;
export const REALISM_A_ID_MAX = 444;
