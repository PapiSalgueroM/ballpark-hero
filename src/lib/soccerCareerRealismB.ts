/* ────────────────────────────────────────────────────────────────────────────
   soccerCareerRealismB.ts, between seasons life catalog batch B (ids 450-494)
   Owner brief: take everything a full life sim does, make it ten times
   better and more out of pocket.

   Forty five events about the parts of a career that are not the football:
   the federation that cannot pay its bonuses, the club record an old man has
   waited forty years to lose, the rival who accidentally hugs you on camera,
   the family group chat that leaks, the new owner with a slide about the moon,
   the pigeon living in the north goal, and the January phone call from a
   league on another continent.

   Same self gating contract as soccerCareerLife.ts and soccerCareerCorruption.ts:
   an event is only returned when its conditions hold, so the caller needs no
   extra eligibility rules. TYPES ONLY import, so there is no runtime cycle
   with the engine.
   ──────────────────────────────────────────────────────────────────────────── */
import type { CareerState, RandomEvent } from "./soccerCareerEngine";

/* ─── tiny local helpers (duplicated on purpose: no runtime import cycle) ─── */
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const flag = (s: CareerState, key: string): number => (s.lifeFlags || {})[key] || 0;
const setFlag = (s: CareerState, key: string, value: number) => {
  s.lifeFlags = { ...(s.lifeFlags || {}), [key]: value };
};
/** rivalry temperature, optional field so pre-expansion saves keep loading */
const feud = (s: CareerState, delta: number) => {
  s.rivalryIntensity = clamp((s.rivalryIntensity ?? 0) + delta, 0, 100);
};

/* ─── The batch B catalog (ids 450-494) ─── */
export function getRealismEventsB(state: CareerState): RandomEvent[] {
  const events: RandomEvent[] = [];
  const push = (e: RandomEvent) => events.push(e);
  const pro = state.seasons.filter(s => s.type === "playing").length;
  const clubApps = state.seasons.filter(s => s.club === state.currentClub).reduce((a, s) => a + s.apps, 0);
  const lastSeason = state.seasons[state.seasons.length - 1];
  const lastApps = lastSeason ? lastSeason.apps : 0;
  const thisYear = lastSeason ? lastSeason.year : 2024;
  const rival = state.rival;
  const kids = state.family.children;
  const attached = state.hasRelationship || state.family.isMarried;

  /* ══ 1. INTERNATIONAL LIFE ══ */
  if (state.internationalCareer && state.intStats.caps >= 5 && !state.intStats.isRetired && flag(state, "boycott") === 0) {
    push({ id: 450, emoji: "🪧", title: "The Boycott Vote",
      description: "The squad voted 14 to 9 to refuse the next qualifier over how the federation treats the youth setup and the women's team. The captain wants your name on the letter. A television crew is already in the hotel lobby.",
      category: "international", choices: [
        { label: "Sign the letter, no games until it changes", emoji: "✍️", color: "bg-emerald-600", consequence: "Popularity +10, Integrity +12, Morale +7, dropped for one window",
          apply: s => { setFlag(s, "boycott", 1); s.popularity = clamp(s.popularity + 10, 0, 100); s.integrityBonus += 12; s.morale = clamp(s.morale + 7, 0, 100); s.events = [...s.events, "🪧 Signed the boycott letter. Missed a window and gained a dressing room for life"]; return s; } },
        { label: "Play the qualifier and stay out of it", emoji: "🤐", color: "bg-blue-600", consequence: "Caps +1, Morale -8, three teammates stop passing to you",
          apply: s => { setFlag(s, "boycott", 2); s.intStats = { ...s.intStats, caps: s.intStats.caps + 1 }; s.morale = clamp(s.morale - 8, 0, 100); s.events = [...s.events, "🤐 Played through the boycott. The bus was very quiet on the way home"]; return s; } },
        { label: "Try to broker it with the federation president", emoji: "🤝", color: "bg-amber-600", consequence: "Half the time the bonuses get paid (Popularity +14, Morale +8), half the time you look like his errand boy (Popularity -8)",
          apply: s => { setFlag(s, "boycott", 3); if (Math.random() < 0.5) { s.popularity = clamp(s.popularity + 14, 0, 100); s.morale = clamp(s.morale + 8, 0, 100); s.netWorth = Math.round((s.netWorth + 0.1) * 100) / 100; s.events = [...s.events, "🤝 Brokered the deal yourself. Everyone got paid and the letter went in a bin"]; } else { s.popularity = clamp(s.popularity - 8, 0, 100); s.morale = clamp(s.morale - 4, 0, 100); s.events = [...s.events, "🤝 Tried to broker it and came out looking like the president's driver"]; } return s; } },
      ] });
  }

  if (state.internationalCareer && state.intStats.caps >= 10 && !state.intStats.isRetired) {
    push({ id: 451, emoji: "💸", title: "The Bonus That Never Came",
      description: "The federation owes the squad eight months of bonus money. The treasurer keeps saying next window. Somebody found out he flew business class to a friendly the players flew coach to.",
      category: "international", choices: [
        { label: "Refuse to board the plane until everyone is paid", emoji: "✈️", color: "bg-red-600", consequence: "Squad gets paid, Net worth +€0.2M, Morale +9, Popularity -6",
          apply: s => { s.netWorth = Math.round((s.netWorth + 0.2) * 100) / 100; s.morale = clamp(s.morale + 9, 0, 100); s.popularity = clamp(s.popularity - 6, 0, 100); s.integrityBonus += 6; s.events = [...s.events, "✈️ Sat on your suitcase in the terminal until the federation paid every player"]; return s; } },
        { label: "Quietly cover the young players' bonuses yourself", emoji: "🫶", color: "bg-emerald-600", consequence: "Net worth -€0.4M, Morale +12, Integrity +10",
          apply: s => { s.netWorth = Math.round((s.netWorth - 0.4) * 100) / 100; s.morale = clamp(s.morale + 12, 0, 100); s.integrityBonus += 10; s.events = [...s.events, "🫶 Paid the young lads' bonuses out of your own account and told nobody. They told everybody"]; return s; } },
        { label: "Let it go and put it all into your football", emoji: "🎯", color: "bg-muted", consequence: "Passing +1 next season, Morale -4, the kids clock who stayed silent",
          apply: s => { s.statBoostNextSeason = { ...s.statBoostNextSeason, passing: (s.statBoostNextSeason.passing || 0) + 1 }; s.morale = clamp(s.morale - 4, 0, 100); s.events = [...s.events, "🎯 Said nothing about the bonuses and quietly had your best passing season"]; return s; } },
      ] });
  }

  if (state.age <= 27 && state.overall >= 72 && flag(state, "natSwitch") === 0) {
    push({ id: 452, emoji: "🛂", title: "Two Flags, One Passport",
      description: `A second federation traced a grandparent and wants you now. They are ranked higher, they qualify in their sleep, and they will fly your whole family to every tournament. ${state.nationality} fans have already found the story.`,
      category: "international", choices: [
        { label: "Declare for your grandmother's country", emoji: "🌍", color: "bg-purple-600", consequence: "Caps +6, Morale +6, Popularity -12 back home",
          apply: s => { setFlag(s, "natSwitch", 1); s.internationalCareer = true; s.intStats = { ...s.intStats, caps: s.intStats.caps + 6, isRetired: false }; s.morale = clamp(s.morale + 6, 0, 100); s.popularity = clamp(s.popularity - 12, 0, 100); s.events = [...s.events, "🛂 Declared for your grandmother's country. Six caps in a year and one very cold homecoming"]; return s; } },
        { label: "Stay loyal to where you were born", emoji: "🏠", color: "bg-emerald-600", consequence: "Popularity +11, Morale +5, zero tournament guarantees",
          apply: s => { setFlag(s, "natSwitch", 2); s.popularity = clamp(s.popularity + 11, 0, 100); s.morale = clamp(s.morale + 5, 0, 100); s.integrityBonus += 5; s.events = [...s.events, "🏠 Turned down the switch. You want the hard flag or none at all"]; return s; } },
        { label: "Stall a year and let them bid against each other", emoji: "⏳", color: "bg-amber-600", consequence: "Birth nation panics and caps you: Caps +2, Morale -5",
          apply: s => { setFlag(s, "natSwitch", 3); s.internationalCareer = true; s.intStats = { ...s.intStats, caps: s.intStats.caps + 2 }; s.morale = clamp(s.morale - 5, 0, 100); s.events = [...s.events, "🛂 Stalled both federations for a year. Your birth nation panicked and capped you twice"]; return s; } },
      ] });
  }

  if (state.internationalCareer && state.intStats.caps >= 1 && state.intStats.caps <= 4 && flag(state, "anthem") === 0) {
    push({ id: 453, emoji: "🎶", title: "The Anthem",
      description: "Line one and your voice is gone. Twenty thousand of your own people are singing and you are mouthing shapes. The camera holds on your face for eleven seconds.",
      category: "international", choices: [
        { label: "Sing it badly at full volume", emoji: "🗣️", color: "bg-emerald-600", consequence: "Popularity +8, Followers +0.6M, Morale +8",
          apply: s => { setFlag(s, "anthem", 1); s.popularity = clamp(s.popularity + 8, 0, 100); s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.6) * 100) / 100; s.morale = clamp(s.morale + 8, 0, 100); s.events = [...s.events, "🎶 Sang the anthem loudly and horrifically. The whole country loved it"]; return s; } },
        { label: "Stand still and let the tears come", emoji: "🥹", color: "bg-pink-600", consequence: "Morale +12, Popularity +6, Followers +0.4M",
          apply: s => { setFlag(s, "anthem", 2); s.morale = clamp(s.morale + 12, 0, 100); s.popularity = clamp(s.popularity + 6, 0, 100); s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.4) * 100) / 100; s.events = [...s.events, "🥹 Cried through your first anthem. Your mother has that photo above the stairs now"]; return s; } },
        { label: "Blank face, save all of it for the pitch", emoji: "🧊", color: "bg-blue-600", consequence: "Shooting +1 and Physical +1 next season, Popularity +2",
          apply: s => { setFlag(s, "anthem", 3); s.statBoostNextSeason = { ...s.statBoostNextSeason, shooting: (s.statBoostNextSeason.shooting || 0) + 1, physical: (s.statBoostNextSeason.physical || 0) + 1 }; s.popularity = clamp(s.popularity + 2, 0, 100); s.events = [...s.events, "🧊 Gave the anthem camera absolutely nothing, then gave the game everything"]; return s; } },
      ] });
  }

  if (state.internationalCareer && state.intStats.caps >= 3 && !state.intStats.isRetired) {
    push({ id: 454, emoji: "🌋", title: "Ninety Minutes In A Volcano",
      description: "Away qualifier, 42 degrees, laser pens, coins, and a stadium that has been singing about your family since the warm up. The home bench is timing the water breaks purely to annoy you.",
      category: "international", choices: [
        { label: "Demand the ball every time and shut them up", emoji: "🔇", color: "bg-red-600", consequence: "Shooting +2 next season, Caps +1, Morale -6",
          apply: s => { s.statBoostNextSeason = { ...s.statBoostNextSeason, shooting: (s.statBoostNextSeason.shooting || 0) + 2 }; s.intStats = { ...s.intStats, caps: s.intStats.caps + 1 }; s.morale = clamp(s.morale - 6, 0, 100); s.events = [...s.events, "🌋 Took the ball 94 times in a stadium that hated you. Came home hollow and better"]; return s; } },
        { label: "Take the point and get on the bus", emoji: "🚌", color: "bg-blue-600", consequence: "Passing +1 and Defending +1 next season, Caps +1, Morale +4",
          apply: s => { s.statBoostNextSeason = { ...s.statBoostNextSeason, passing: (s.statBoostNextSeason.passing || 0) + 1, defending: (s.statBoostNextSeason.defending || 0) + 1 }; s.intStats = { ...s.intStats, caps: s.intStats.caps + 1 }; s.morale = clamp(s.morale + 4, 0, 100); s.events = [...s.events, "🚌 Ugly nil nil in a furnace. Best point the nation got all campaign"]; return s; } },
        { label: "Score and point straight at the away end", emoji: "👉", color: "bg-amber-600", consequence: "Popularity +9, Followers +1.2M, €50k fine, Morale -3",
          apply: s => { s.intStats = { ...s.intStats, caps: s.intStats.caps + 1, goals: s.intStats.goals + 1 }; s.popularity = clamp(s.popularity + 9, 0, 100); s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1.2) * 100) / 100; s.netWorth = Math.round((s.netWorth - 0.05) * 100) / 100; s.morale = clamp(s.morale - 3, 0, 100); s.events = [...s.events, "👉 Scored and pointed at 60,000 people. €50k fine, priceless photograph"]; return s; } },
      ] });
  }

  if (state.internationalCareer && state.intStats.caps >= 8 && !state.intStats.isRetired) {
    push({ id: 455, emoji: "✈️", title: "The 9,000 Kilometre Friendly",
      description: "The federation has sold a January friendly to a sponsor on the other side of the planet. Two flights, one training session, and your club manager has already sent three emails written entirely in capital letters.",
      category: "international", choices: [
        { label: "Go, play the 90, take the appearance fee", emoji: "💼", color: "bg-amber-600", consequence: "Net worth +€0.35M, Caps +1, Physical -2 next season",
          apply: s => { s.netWorth = Math.round((s.netWorth + 0.35) * 100) / 100; s.intStats = { ...s.intStats, caps: s.intStats.caps + 1 }; s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) - 2 }; s.events = [...s.events, "✈️ Flew 18,000km for a friendly nobody will remember. The fee cleared on the Tuesday"]; return s; } },
        { label: "Develop a tight calf on the Thursday", emoji: "🦵", color: "bg-muted", consequence: "Physical +1 next season, Morale -5, the coach files it away forever",
          apply: s => { s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) + 1 }; s.morale = clamp(s.morale - 5, 0, 100); s.events = [...s.events, "🦵 Pulled out of the money friendly with a calf only you could feel"]; return s; } },
        { label: "Go, but only if the whole squad flies business", emoji: "🛫", color: "bg-emerald-600", consequence: "Net worth +€0.15M, Caps +1, Morale +10, Popularity +5",
          apply: s => { s.netWorth = Math.round((s.netWorth + 0.15) * 100) / 100; s.intStats = { ...s.intStats, caps: s.intStats.caps + 1 }; s.morale = clamp(s.morale + 10, 0, 100); s.popularity = clamp(s.popularity + 5, 0, 100); s.integrityBonus += 6; s.events = [...s.events, "🛫 Gave up part of your fee so the whole squad turned left on the plane"]; return s; } },
      ] });
  }

  if (state.intStats.isRetired && state.overall >= 78 && state.age <= 36) {
    push({ id: 456, emoji: "📞", title: "One A.M. Call From The National Coach",
      description: "You retired from international football two years ago. He has run out of options, he is calling at one in the morning, and he keeps using the word one. One camp. One tournament. One last time.",
      category: "international", choices: [
        { label: "Come back for one last tournament", emoji: "🔙", color: "bg-emerald-600", consequence: "Caps +7, Morale +10, Physical -2 next season",
          apply: s => { s.internationalCareer = true; s.intStats = { ...s.intStats, isRetired: false, caps: s.intStats.caps + 7 }; s.morale = clamp(s.morale + 10, 0, 100); s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) - 2 }; s.events = [...s.events, "📞 Un-retired at one in the morning for one more tournament. Seven caps, zero regrets, two dead legs"]; return s; } },
        { label: "Stay retired, the body already voted", emoji: "🛌", color: "bg-muted", consequence: "Physical +2 next season, Morale +4",
          apply: s => { s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) + 2 }; s.morale = clamp(s.morale + 4, 0, 100); s.events = [...s.events, "🛌 Said no to the comeback and slept through the whole tournament. Mostly"]; return s; } },
        { label: "Only if the armband comes with it", emoji: "🎗️", color: "bg-amber-600", consequence: "60%: Captain, Caps +7, Popularity +8. 40%: he hangs up, Morale -6",
          apply: s => { if (Math.random() < 0.6) { s.internationalCareer = true; s.intStats = { ...s.intStats, isRetired: false, isCaptain: true, caps: s.intStats.caps + 7 }; s.popularity = clamp(s.popularity + 8, 0, 100); s.isLeader = true; s.events = [...s.events, "🎗️ Came back as national captain. The armband was the whole negotiation"]; } else { s.morale = clamp(s.morale - 6, 0, 100); s.events = [...s.events, "🎗️ Asked for the armband and heard a dial tone at 1:04am"]; } return s; } },
      ] });
  }

  /* ══ 2. LEGACY AND RECORDS ══ */
  if (clubApps >= 180 && flag(state, "appsRecord") === 0) {
    push({ id: 457, emoji: "📋", title: "Eleven Games From The Record",
      description: `You are eleven appearances from the ${state.currentClub} record. The man who holds it is 79, sits behind the dugout every single week, and told a paper he hopes you take it. The manager wants to rest you in three of the next five.`,
      category: "life", choices: [
        { label: "Play every single minute and take it", emoji: "🦿", color: "bg-red-600", consequence: "Record broken: Popularity +12, Followers +1M, Physical -3 next season",
          apply: s => { setFlag(s, "appsRecord", 1); s.popularity = clamp(s.popularity + 12, 0, 100); s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1) * 100) / 100; s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) - 3 }; s.events = [...s.events, `📋 Broke the ${s.currentClub} appearance record on legs made of wet paper`]; return s; } },
        { label: "Let the manager rest you, chase it next year", emoji: "🪑", color: "bg-blue-600", consequence: "Physical +2 next season, Morale +5, the record waits 12 months",
          apply: s => { setFlag(s, "appsRecord", 2); s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) + 2 }; s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "🪑 Took the rest weeks. The record can wait, your hamstrings could not"]; return s; } },
        { label: "Break it, then hand him the match ball", emoji: "🎁", color: "bg-emerald-600", consequence: "Popularity +14, Integrity +6, Morale +10, Physical -2 next season",
          apply: s => { setFlag(s, "appsRecord", 3); s.popularity = clamp(s.popularity + 14, 0, 100); s.integrityBonus += 6; s.morale = clamp(s.morale + 10, 0, 100); s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) - 2 }; s.events = [...s.events, "🎁 Broke the record and gave the ball to the 79-year-old who had held it since 1986"]; return s; } },
      ] });
  }

  if (state.overall >= 84 && pro >= 9 && flag(state, "shirtRetire") === 0) {
    push({ id: 458, emoji: "🔢", title: "They Want To Retire Your Number",
      description: "The club plans to retire your shirt number the day you walk out. A 16-year-old in the academy currently wears it and has just scored 40 goals in a season wearing it.",
      category: "positive", choices: [
        { label: "Accept the honour", emoji: "🖼️", color: "bg-emerald-600", consequence: "Award added, Popularity +10, Morale +8",
          apply: s => { setFlag(s, "shirtRetire", 1); s.awards = [...s.awards, { year: thisYear, name: "Shirt Number Retired", emoji: "🔢" }]; s.popularity = clamp(s.popularity + 10, 0, 100); s.morale = clamp(s.morale + 8, 0, 100); s.events = [...s.events, "🔢 Your number goes up in the rafters and comes down never"]; return s; } },
        { label: "Give the number to the 16-year-old instead", emoji: "👦", color: "bg-pink-600", consequence: "Integrity +12, Morale +10, Popularity +6",
          apply: s => { setFlag(s, "shirtRetire", 2); s.integrityBonus += 12; s.morale = clamp(s.morale + 10, 0, 100); s.popularity = clamp(s.popularity + 6, 0, 100); s.events = [...s.events, "👦 Refused the retirement and handed the number to a kid who cried in the tunnel"]; return s; } },
        { label: "Tell them to wait until you actually stop", emoji: "✋", color: "bg-muted", consequence: "Morale +4, Popularity +2, superstition fully intact",
          apply: s => { setFlag(s, "shirtRetire", 3); s.morale = clamp(s.morale + 4, 0, 100); s.popularity = clamp(s.popularity + 2, 0, 100); s.events = [...s.events, "✋ Told the club not to retire anything while you can still run. Bad luck, apparently"]; return s; } },
      ] });
  }

  if (state.age >= 28 && state.overall >= 78) {
    push({ id: 459, emoji: "🧑‍🏫", title: "The 17-Year-Old Is Better Than You Were",
      description: `He plays ${state.position}, he has twice your first touch at that age, and his agent wears sunglasses indoors. The manager wants you to take him under your wing. He will probably take your shirt in two years.`,
      category: "life", choices: [
        { label: "Mentor him properly, hold nothing back", emoji: "🤲", color: "bg-emerald-600", consequence: "Passing +2 next season, Morale +10, Integrity +8",
          apply: s => { s.statBoostNextSeason = { ...s.statBoostNextSeason, passing: (s.statBoostNextSeason.passing || 0) + 2 }; s.morale = clamp(s.morale + 10, 0, 100); s.integrityBonus += 8; s.events = [...s.events, "🧑‍🏫 Taught the wonderkid everything. He thanks you in every interview he ever gives"]; return s; } },
        { label: "Say nothing and protect your shirt", emoji: "🛡️", color: "bg-red-600", consequence: "Shooting +2 next season, Morale -6, Popularity -4",
          apply: s => { s.statBoostNextSeason = { ...s.statBoostNextSeason, shooting: (s.statBoostNextSeason.shooting || 0) + 2 }; s.morale = clamp(s.morale - 6, 0, 100); s.popularity = clamp(s.popularity - 4, 0, 100); s.events = [...s.events, "🛡️ Froze the wonderkid out and kept your shirt. The dressing room noticed all of it"]; return s; } },
        { label: "Mentor him and take 5% of his future", emoji: "📈", color: "bg-amber-600", consequence: "Net worth +€1.5M, Integrity -6, he never fully trusts you",
          apply: s => { s.netWorth = Math.round((s.netWorth + 1.5) * 100) / 100; s.integrityBonus -= 6; s.events = [...s.events, "📈 Mentored the kid and quietly took 5% of him. Best investment, worst friendship"]; return s; } },
      ] });
  }

  if (state.age >= 33 && pro >= 10) {
    push({ id: 460, emoji: "🎟️", title: "Your Testimonial",
      description: "The club offers you a testimonial: full house, legends XI, every euro of the gate. Your first manager has agreed to play 20 minutes at 71 years old and has been doing hill sprints.",
      category: "life", choices: [
        { label: "Keep the gate money", emoji: "💰", color: "bg-amber-600", consequence: "Net worth +€2.5M, Popularity +5",
          apply: s => { s.netWorth = Math.round((s.netWorth + 2.5) * 100) / 100; s.popularity = clamp(s.popularity + 5, 0, 100); s.events = [...s.events, "🎟️ Sold out your testimonial and kept the €2.5M. Nobody minded, much"]; return s; } },
        { label: "Give every euro to the academy and the local hospital", emoji: "🏥", color: "bg-emerald-600", consequence: "Integrity +18, Popularity +16, Morale +12, Followers +1.5M",
          apply: s => { s.integrityBonus += 18; s.popularity = clamp(s.popularity + 16, 0, 100); s.morale = clamp(s.morale + 12, 0, 100); s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1.5) * 100) / 100; s.events = [...s.events, "🏥 Gave every cent of your testimonial away. The academy pitch has your name on it now"]; return s; } },
        { label: "Split it and make the away end free", emoji: "🎫", color: "bg-blue-600", consequence: "Net worth +€1.2M, Popularity +11, Integrity +8",
          apply: s => { s.netWorth = Math.round((s.netWorth + 1.2) * 100) / 100; s.popularity = clamp(s.popularity + 11, 0, 100); s.integrityBonus += 8; s.events = [...s.events, "🎫 Half the testimonial money kept, half spent making the away end free. Both ends sang"]; return s; } },
      ] });
  }

  if (state.age >= 34 && (state.overall >= 82 || state.awards.length >= 3)) {
    push({ id: 461, emoji: "🏛️", title: "Hall Of Fame Ballot",
      description: "You are on the ballot. Black tie, four minute speech, and the man introducing you is the manager who left you out of a cup final squad and has never mentioned it since.",
      category: "positive", choices: [
        { label: "Accept and give the gracious speech", emoji: "🎤", color: "bg-emerald-600", consequence: "Award added, Popularity +12, Morale +10",
          apply: s => { s.awards = [...s.awards, { year: thisYear, name: "Hall of Fame", emoji: "🏛️" }]; s.popularity = clamp(s.popularity + 12, 0, 100); s.morale = clamp(s.morale + 10, 0, 100); s.events = [...s.events, "🏛️ Inducted into the Hall of Fame. Thanked the man who benched you, and meant it"]; return s; } },
        { label: "Accept and roast him from the podium", emoji: "🔥", color: "bg-amber-600", consequence: "Award added, Followers +2M, Popularity +6, Morale +8",
          apply: s => { s.awards = [...s.awards, { year: thisYear, name: "Hall of Fame", emoji: "🏛️" }]; s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 2) * 100) / 100; s.popularity = clamp(s.popularity + 6, 0, 100); s.morale = clamp(s.morale + 8, 0, 100); s.events = [...s.events, "🔥 Used your Hall of Fame speech to bring up the 2019 cup final squad. Table nine wept laughing"]; return s; } },
        { label: "Skip the black tie dinner entirely", emoji: "🍽️", color: "bg-muted", consequence: "Morale +3, Integrity +4, the plaque goes up without you",
          apply: s => { s.morale = clamp(s.morale + 3, 0, 100); s.integrityBonus += 4; s.events = [...s.events, "🍽️ Skipped the Hall of Fame dinner. They mounted the plaque anyway and you watched on a phone"]; return s; } },
      ] });
  }

  if (state.overall >= 86 && pro >= 10 && flag(state, "statue") === 0) {
    push({ id: 462, emoji: "🗿", title: "The Statue Vote",
      description: "The supporters' trust has raised enough for a bronze statue outside the west stand. The shortlisted sculptor's last piece was described by the local paper as a man slowly melting.",
      category: "life", choices: [
        { label: "Approve it, melting face and all", emoji: "👍", color: "bg-amber-600", consequence: "Popularity +8, Followers +1.8M, Morale +6",
          apply: s => { setFlag(s, "statue", 1); s.popularity = clamp(s.popularity + 8, 0, 100); s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1.8) * 100) / 100; s.morale = clamp(s.morale + 6, 0, 100); s.events = [...s.events, "🗿 Your statue looks like a man melting. It is now the most photographed spot in the city"]; return s; } },
        { label: "Pay for a proper sculptor yourself", emoji: "💳", color: "bg-emerald-600", consequence: "Net worth -€0.6M, Popularity +12, Morale +8",
          apply: s => { setFlag(s, "statue", 2); s.netWorth = Math.round((s.netWorth - 0.6) * 100) / 100; s.popularity = clamp(s.popularity + 12, 0, 100); s.morale = clamp(s.morale + 8, 0, 100); s.events = [...s.events, "💳 Quietly paid €600k for a sculptor who could do faces. Worth every cent"]; return s; } },
        { label: "Ask for a mural of the whole squad instead", emoji: "🎨", color: "bg-blue-600", consequence: "Integrity +10, Morale +12, Popularity +9",
          apply: s => { setFlag(s, "statue", 3); s.integrityBonus += 10; s.morale = clamp(s.morale + 12, 0, 100); s.popularity = clamp(s.popularity + 9, 0, 100); s.events = [...s.events, "🎨 Turned your statue into a mural of the whole squad. The kit man is on it, in scale"]; return s; } },
      ] });
  }

  /* ══ 3. RIVALRY BEATS (all gated on an existing rival) ══ */
  if (rival && !rival.retired) {
    push({ id: 463, emoji: "🎽", title: "The Shirt Swap",
      description: `You have kicked ${rival.name} for a decade. In the tunnel he holds his shirt out without saying a word. A hundred cameras are pointed at both of you and neither of you blinks.`,
      category: "life", choices: [
        { label: "Swap shirts and shake his hand", emoji: "🤝", color: "bg-emerald-600", consequence: "Popularity +9, Morale +8, Followers +0.8M, rivalry cools 15",
          apply: s => { feud(s, -15); s.popularity = clamp(s.popularity + 9, 0, 100); s.morale = clamp(s.morale + 8, 0, 100); s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.8) * 100) / 100; s.events = [...s.events, `🎽 Swapped shirts with ${rival.name} in the tunnel. Ten years of war, one handshake`]; return s; } },
        { label: "Refuse it, in front of everyone", emoji: "😐", color: "bg-red-600", consequence: "Rivalry heat +20, Followers +1.4M, Popularity -5",
          apply: s => { feud(s, 20); s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1.4) * 100) / 100; s.popularity = clamp(s.popularity - 5, 0, 100); s.events = [...s.events, `😐 Left ${rival.name} holding his shirt in a tunnel on live television`]; return s; } },
        { label: "Swap it, frame it, auction it for charity", emoji: "🖼️", color: "bg-blue-600", consequence: "€400k raised, Integrity +10, Popularity +12",
          apply: s => { feud(s, -8); s.integrityBonus += 10; s.popularity = clamp(s.popularity + 12, 0, 100); s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, `🖼️ Framed both shirts and auctioned them for €400k. ${rival.name} matched it out of spite`]; return s; } },
      ] });
  }

  if (rival && state.popularity >= 45) {
    push({ id: 464, emoji: "📸", title: "The Joint Cover",
      description: `A magazine wants you and ${rival.name} on the same cover, backs turned, shot by a photographer who has now said the word tension nine times in four minutes.`,
      category: "life", choices: [
        { label: "Do the shoot, lean all the way into the theatre", emoji: "🎭", color: "bg-amber-600", consequence: "Net worth +€0.5M, Followers +1.6M, Popularity +7",
          apply: s => { s.netWorth = Math.round((s.netWorth + 0.5) * 100) / 100; s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1.6) * 100) / 100; s.popularity = clamp(s.popularity + 7, 0, 100); s.events = [...s.events, `📸 Did the tension cover with ${rival.name}. It sold out in two days and neither of you spoke`]; return s; } },
        { label: "Only if the fee goes to both academies", emoji: "🎒", color: "bg-emerald-600", consequence: "Integrity +12, Popularity +11, Followers +0.9M",
          apply: s => { s.integrityBonus += 12; s.popularity = clamp(s.popularity + 11, 0, 100); s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.9) * 100) / 100; feud(s, -10); s.events = [...s.events, "📸 Made the magazine send the whole fee to both academies. The photographer was furious"]; return s; } },
        { label: "Refuse. He is not your co-star", emoji: "🙅", color: "bg-red-600", consequence: "Rivalry heat +15, Shooting +1 next season, Popularity -3",
          apply: s => { feud(s, 15); s.statBoostNextSeason = { ...s.statBoostNextSeason, shooting: (s.statBoostNextSeason.shooting || 0) + 1 }; s.popularity = clamp(s.popularity - 3, 0, 100); s.events = [...s.events, `🙅 Refused to share a cover with ${rival.name}. Then scored twice against him in October`]; return s; } },
      ] });
  }

  if (rival && !rival.retired && state.popularity >= 40) {
    push({ id: 465, emoji: "🥊", title: "Charity Boxing, Three Rounds",
      description: `${rival.name} has challenged you to three rounds for charity and has been posting videos of himself hitting a bag. He is not good at it. He is enjoying it enormously.`,
      category: "life", choices: [
        { label: "Accept and actually train for it", emoji: "🥊", color: "bg-amber-600", consequence: "Net worth +€1.2M, Followers +2.5M, Physical +1 next season, 35% you get your nose done (Pace -1)",
          apply: s => { s.netWorth = Math.round((s.netWorth + 1.2) * 100) / 100; s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 2.5) * 100) / 100; s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) + 1 }; feud(s, 10); if (Math.random() < 0.35) { s.statBoostNextSeason = { ...s.statBoostNextSeason, pace: (s.statBoostNextSeason.pace || 0) - 1 }; s.events = [...s.events, `🥊 Boxed ${rival.name} for charity and got your nose rearranged in round two. Won on points`]; } else { s.events = [...s.events, `🥊 Boxed ${rival.name} for charity and stopped him in round three. Pay per view record`]; } return s; } },
        { label: "Accept but insist on headguards and no scorecards", emoji: "🪖", color: "bg-blue-600", consequence: "Net worth +€0.8M, Followers +1.4M, Popularity +8",
          apply: s => { s.netWorth = Math.round((s.netWorth + 0.8) * 100) / 100; s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1.4) * 100) / 100; s.popularity = clamp(s.popularity + 8, 0, 100); s.events = [...s.events, `🪖 Three headguarded rounds with ${rival.name} and a declared draw. Everybody kept their teeth`]; return s; } },
        { label: "Decline. Your knees cost more than the pay per view", emoji: "🦵", color: "bg-emerald-600", consequence: "Physical +2 next season, Morale +5, Followers +0.3M",
          apply: s => { s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) + 2 }; s.morale = clamp(s.morale + 5, 0, 100); s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.3) * 100) / 100; s.events = [...s.events, `🦵 Turned down the boxing match. ${rival.name} called you scared and did a full preseason of it`]; return s; } },
      ] });
  }

  if (rival) {
    push({ id: 466, emoji: "👕", title: "His Kid Wants Your Shirt",
      description: `${rival.name}'s eight-year-old walks up after the match, ignores his father completely, and asks for your shirt. ${rival.name} is standing right there. His face is doing something brand new.`,
      category: "life", choices: [
        { label: "Sign it and hand it to the kid", emoji: "✍️", color: "bg-emerald-600", consequence: "Popularity +10, Morale +10, Followers +1.1M, rivalry cools 10",
          apply: s => { feud(s, -10); s.popularity = clamp(s.popularity + 10, 0, 100); s.morale = clamp(s.morale + 10, 0, 100); s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1.1) * 100) / 100; s.events = [...s.events, `👕 Gave your signed shirt to ${rival.name}'s son. The photo ran in nine countries`]; return s; } },
        { label: "Give him the shirt and the boots too", emoji: "👟", color: "bg-pink-600", consequence: "Popularity +13, Integrity +8, Morale +12",
          apply: s => { feud(s, -14); s.popularity = clamp(s.popularity + 13, 0, 100); s.integrityBonus += 8; s.morale = clamp(s.morale + 12, 0, 100); s.events = [...s.events, `👟 Shirt, boots and shin pads to ${rival.name}'s boy. He wore all of it to school for a month`]; return s; } },
        { label: "Hand the kid the shirt, then wink at the cameras", emoji: "😉", color: "bg-amber-600", consequence: "Followers +2M, Popularity +6, rivalry heat +18",
          apply: s => { feud(s, 18); s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 2) * 100) / 100; s.popularity = clamp(s.popularity + 6, 0, 100); s.events = [...s.events, `😉 Gave the shirt to the kid and winked down the lens. ${rival.name} has not spoken to you since`]; return s; } },
      ] });
  }

  if (rival && !rival.retired && pro >= 3) {
    push({ id: 467, emoji: "🫂", title: "The Accidental Hug",
      description: "Ninety-fourth minute, you both go up for the same header, and you end up holding each other upright for four full seconds. From the north stand it looks like the closing scene of a war film.",
      category: "life", choices: [
        { label: "Own it. Post the photo yourself", emoji: "📲", color: "bg-amber-600", consequence: "Followers +2.2M, Popularity +9, rivalry cools 12",
          apply: s => { feud(s, -12); s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 2.2) * 100) / 100; s.popularity = clamp(s.popularity + 9, 0, 100); s.events = [...s.events, `🫂 Posted the accidental hug yourself with no caption. ${rival.name} liked it within 40 seconds`]; return s; } },
        { label: "Claim you were checking he was alright", emoji: "🩹", color: "bg-blue-600", consequence: "Popularity +6, Morale +5, absolutely nobody believes you",
          apply: s => { s.popularity = clamp(s.popularity + 6, 0, 100); s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "🩹 Insisted the four second hug was a welfare check. The internet laughed for a fortnight"]; return s; } },
        { label: "Deny it, badly, on live television", emoji: "🎙️", color: "bg-red-600", consequence: "Followers +1.5M, Popularity -4, rivalry heat +14",
          apply: s => { feud(s, 14); s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1.5) * 100) / 100; s.popularity = clamp(s.popularity - 4, 0, 100); s.events = [...s.events, "🎙️ Denied the hug on live television while the clip played behind your head"]; return s; } },
      ] });
  }

  if (rival && state.age >= 30) {
    push({ id: 468, emoji: "📖", title: "There Is A Chapter About You",
      description: `${rival.name} has written an autobiography. Chapter nine runs to 22 pages and it is entirely about you. Some of it is genuinely generous. Some of it is a knife with your name engraved on it.`,
      category: "life", choices: [
        { label: "Review chapter nine, publicly, line by line", emoji: "📝", color: "bg-amber-600", consequence: "Followers +1.7M, Popularity +5, rivalry heat +12",
          apply: s => { feud(s, 12); s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1.7) * 100) / 100; s.popularity = clamp(s.popularity + 5, 0, 100); s.events = [...s.events, `📝 Live reviewed ${rival.name}'s chapter about you and gave it three stars out of five`]; return s; } },
        { label: "Send him a bottle and a note saying page 214 was fair", emoji: "🍷", color: "bg-emerald-600", consequence: "Rivalry cools 20, Morale +9, Integrity +6",
          apply: s => { feud(s, -20); s.morale = clamp(s.morale + 9, 0, 100); s.integrityBonus += 6; s.events = [...s.events, `🍷 Sent ${rival.name} a bottle and four words: page 214 was fair`]; return s; } },
        { label: "Write your own book and dedicate a chapter back", emoji: "📚", color: "bg-blue-600", consequence: "Net worth +€1.8M, Followers +1.2M, Popularity +7",
          apply: s => { s.netWorth = Math.round((s.netWorth + 1.8) * 100) / 100; s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1.2) * 100) / 100; s.popularity = clamp(s.popularity + 7, 0, 100); s.events = [...s.events, `📚 Wrote your own book with a 30 page chapter about ${rival.name}. Outsold his by double`]; return s; } },
      ] });
  }

  /* ══ 4. FAMILY AND RELATIONSHIPS ══ */
  if (attached && state.age >= 23) {
    push({ id: 469, emoji: "🏙️", title: "Her Job Is In Another City",
      description: "Your partner has been offered the job of a lifetime, 600 kilometres away. Nobody has used the word ultimatum. Everybody in the kitchen is thinking about the word ultimatum.",
      category: "life", choices: [
        { label: "Move the family, do the commute yourself", emoji: "🚗", color: "bg-blue-600", consequence: "Morale -6, Physical -1 next season, Popularity +3",
          apply: s => { s.morale = clamp(s.morale - 6, 0, 100); s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) - 1 }; s.popularity = clamp(s.popularity + 3, 0, 100); s.events = [...s.events, "🚗 Moved the family 600km and drove it twice a week. Nine thousand kilometres a month, one intact relationship"]; return s; } },
        { label: "Ask them to put it off for two more seasons", emoji: "⏳", color: "bg-red-600", consequence: "Shooting +2 next season, Morale -10, 30% it ends the relationship",
          apply: s => { s.statBoostNextSeason = { ...s.statBoostNextSeason, shooting: (s.statBoostNextSeason.shooting || 0) + 2 }; s.morale = clamp(s.morale - 10, 0, 100); if (Math.random() < 0.3) { s.hasRelationship = false; if (s.family.isMarried) { s.family = { ...s.family, isMarried: false, isDivorced: true, divorceAge: s.age }; } s.events = [...s.events, "⏳ Asked them to wait two years for your career. They did not wait two months"]; } else { s.events = [...s.events, "⏳ Asked them to put the dream job on hold. They said yes and you will owe that forever"]; } return s; } },
        { label: "Push the club to sell you to a club in her city", emoji: "📦", color: "bg-emerald-600", consequence: "Market value -€3M as your options shrink, Morale +10, Integrity +6",
          apply: s => { s.marketValue = Math.round(Math.max(0.5, s.marketValue - 3) * 100) / 100; s.morale = clamp(s.morale + 10, 0, 100); s.integrityBonus += 6; s.events = [...s.events, "📦 Told your agent to only call clubs in one city. He aged visibly on the phone"]; return s; } },
      ] });
  }

  if (kids >= 1) {
    push({ id: 470, emoji: "🍼", title: "The First Match He Sees",
      description: "Your youngest is coming to a stadium for the first time. Eight months old, ear defenders on, absolutely furious about every single part of it.",
      category: "life", choices: [
        { label: "Celebrate the first goal straight at the family box", emoji: "🎯", color: "bg-pink-600", consequence: "Morale +12, Popularity +8, Followers +1.3M",
          apply: s => { s.morale = clamp(s.morale + 12, 0, 100); s.popularity = clamp(s.popularity + 8, 0, 100); s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1.3) * 100) / 100; s.events = [...s.events, "🍼 Scored and pointed at the family box. He slept through the entire celebration"]; return s; } },
        { label: "Keep it private, no cameras on the box", emoji: "🙈", color: "bg-emerald-600", consequence: "Morale +9, Integrity +6, Popularity +2",
          apply: s => { s.morale = clamp(s.morale + 9, 0, 100); s.integrityBonus += 6; s.popularity = clamp(s.popularity + 2, 0, 100); s.events = [...s.events, "🙈 Banned the broadcast cameras from the family box. Some things are not content"]; return s; } },
        { label: "Bring him onto the pitch after the whistle", emoji: "👶", color: "bg-blue-600", consequence: "Popularity +10, Followers +1.8M, Morale +7",
          apply: s => { s.popularity = clamp(s.popularity + 10, 0, 100); s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1.8) * 100) / 100; s.morale = clamp(s.morale + 7, 0, 100); s.events = [...s.events, "👶 Carried your baby round the pitch at full time. He screamed for all of it and it was perfect"]; return s; } },
      ] });
  }

  if (state.netWorth >= 3 && flag(state, "brotherAgent") === 0) {
    push({ id: 471, emoji: "🧑‍💼", title: "Your Brother Wants To Be Your Agent",
      description: "He has done a two week online course and printed business cards. The cards spell your surname wrong. He is completely serious about this and he genuinely loves you.",
      category: "life", choices: [
        { label: "Hire him and teach him the job", emoji: "👔", color: "bg-amber-600", consequence: "Save €0.5M in agent fees, next wage 8% worse, Morale +10",
          apply: s => { setFlag(s, "brotherAgent", 1); s.netWorth = Math.round((s.netWorth + 0.5) * 100) / 100; s.weeklyWage = Math.round(s.weeklyWage * 0.92); s.morale = clamp(s.morale + 10, 0, 100); s.events = [...s.events, "🧑‍💼 Made your brother your agent. He negotiated 8% under the market and cried when he signed it"]; return s; } },
        { label: "No, but pay for a real course and an internship", emoji: "🎓", color: "bg-emerald-600", consequence: "Net worth -€0.15M, Morale +6, Integrity +8",
          apply: s => { setFlag(s, "brotherAgent", 2); s.netWorth = Math.round((s.netWorth - 0.15) * 100) / 100; s.morale = clamp(s.morale + 6, 0, 100); s.integrityBonus += 8; s.events = [...s.events, "🎓 Paid for your brother to do it properly. Three years later he represents 11 players and none of them are you"]; return s; } },
        { label: "Flat no, and let him hear it from a journalist", emoji: "🥶", color: "bg-red-600", consequence: "Morale -8, but Passing +1 next season with zero family in your business",
          apply: s => { setFlag(s, "brotherAgent", 3); s.morale = clamp(s.morale - 8, 0, 100); s.statBoostNextSeason = { ...s.statBoostNextSeason, passing: (s.statBoostNextSeason.passing || 0) + 1 }; s.events = [...s.events, "🥶 Your brother found out you said no by reading it. The group chat went dark for a year"]; return s; } },
      ] });
  }

  if (state.age >= 26 && flag(state, "homePull") === 0) {
    push({ id: 472, emoji: "🏡", title: "They Want You Closer To Home",
      description: "On a Sunday call your aunt lets slip that the whole family would feel a lot better if you were nearer. Nobody asks you outright. Somehow that is worse than being asked.",
      category: "life", choices: [
        { label: "Move all of them out to you, whatever it costs", emoji: "🚚", color: "bg-emerald-600", consequence: "Net worth -€1.2M, Morale +14, Popularity +4",
          apply: s => { setFlag(s, "homePull", 1); s.netWorth = Math.round((s.netWorth - 1.2) * 100) / 100; s.morale = clamp(s.morale + 14, 0, 100); s.popularity = clamp(s.popularity + 4, 0, 100); s.events = [...s.events, "🏡 Moved the entire family out to you, two houses and a dog. Sunday dinners are back on"]; return s; } },
        { label: "Sign for a club within an hour of home", emoji: "🧭", color: "bg-blue-600", consequence: "Market value -€4M, wage -10%, Morale +12, Integrity +6",
          apply: s => { setFlag(s, "homePull", 2); s.marketValue = Math.round(Math.max(0.5, s.marketValue - 4) * 100) / 100; s.weeklyWage = Math.round(s.weeklyWage * 0.9); s.morale = clamp(s.morale + 12, 0, 100); s.integrityBonus += 6; s.events = [...s.events, "🧭 Took less money to play 50 minutes from your mother's front door"]; return s; } },
        { label: "Fly home on every single free day instead", emoji: "🛬", color: "bg-amber-600", consequence: "Net worth -€0.3M in flights, Physical -1 next season, Morale +8",
          apply: s => { setFlag(s, "homePull", 3); s.netWorth = Math.round((s.netWorth - 0.3) * 100) / 100; s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) - 1 }; s.morale = clamp(s.morale + 8, 0, 100); s.events = [...s.events, "🛬 Flew home 41 times in one season. Your recovery data hated it, your family did not"]; return s; } },
      ] });
  }

  if (state.popularity >= 40) {
    push({ id: 473, emoji: "📱", title: "The Group Chat Leaked",
      description: "Forty-one screenshots of your family group chat are online. Your father's full opinion of your manager is in there. So is a photo of you asleep in a Christmas jumper aged nine.",
      category: "negative", choices: [
        { label: "Post the Christmas jumper photo yourself", emoji: "🎄", color: "bg-amber-600", consequence: "Followers +1.9M, Popularity +11, Morale +5",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1.9) * 100) / 100; s.popularity = clamp(s.popularity + 11, 0, 100); s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "📱 Beat the leak by posting the Christmas jumper photo yourself. It is now your profile picture"]; return s; } },
        { label: "Lawyers, takedowns and a short statement", emoji: "⚖️", color: "bg-blue-600", consequence: "Net worth -€0.25M, Popularity -3, the manager story dies in a week",
          apply: s => { s.netWorth = Math.round((s.netWorth - 0.25) * 100) / 100; s.popularity = clamp(s.popularity - 3, 0, 100); s.events = [...s.events, "⚖️ Spent €250k killing 41 screenshots. Forty of them stayed dead"]; return s; } },
        { label: "Say nothing, change every password, tunnel vision", emoji: "🔒", color: "bg-muted", consequence: "Popularity -5, Morale -3, Passing +1 and Defending +1 next season",
          apply: s => { s.popularity = clamp(s.popularity - 5, 0, 100); s.morale = clamp(s.morale - 3, 0, 100); s.statBoostNextSeason = { ...s.statBoostNextSeason, passing: (s.statBoostNextSeason.passing || 0) + 1, defending: (s.statBoostNextSeason.defending || 0) + 1 }; s.events = [...s.events, "🔒 Said nothing about the leak, deleted every app, and had a frighteningly focused season"]; return s; } },
      ] });
  }

  if (kids >= 1 && state.age >= 33) {
    push({ id: 474, emoji: "🎭", title: "Your Kid Wants To Quit Football",
      description: "Your eldest has played since they could walk and has just said, very calmly, that they hate it and want to do drama instead. Two academy scouts are already asking about them.",
      category: "life", choices: [
        { label: "Back the drama, cancel the trials", emoji: "🎭", color: "bg-emerald-600", consequence: "Morale +12, Integrity +10, one extremely happy kid",
          apply: s => { s.morale = clamp(s.morale + 12, 0, 100); s.integrityBonus += 10; s.events = [...s.events, "🎭 Cancelled your kid's trials and paid for drama school. They thank you in a curtain call ten years later"]; return s; } },
        { label: "Ask for one more season before deciding", emoji: "🤔", color: "bg-blue-600", consequence: "Morale +4, Popularity +2, the kid resents it slightly",
          apply: s => { s.morale = clamp(s.morale + 4, 0, 100); s.popularity = clamp(s.popularity + 2, 0, 100); s.events = [...s.events, "🤔 Talked your kid into one more season. They played it out and quit in June anyway"]; return s; } },
        { label: "Push them into the academy anyway", emoji: "📣", color: "bg-red-600", consequence: "Popularity +5 for the famous surname, Morale -9, Integrity -8",
          apply: s => { s.popularity = clamp(s.popularity + 5, 0, 100); s.morale = clamp(s.morale - 9, 0, 100); s.integrityBonus -= 8; s.events = [...s.events, "📣 Pushed your kid into the academy. Your surname on a team sheet, their heart nowhere near it"]; return s; } },
      ] });
  }

  if (state.hasRelationship && !state.family.isMarried && state.age >= 23) {
    push({ id: 475, emoji: "💒", title: "The Wedding And The Cup Final",
      description: "The venue was booked 14 months ago. The cup final has just been moved to the same Saturday. Your fiancee is being extremely reasonable about it, which is genuinely terrifying.",
      category: "life", choices: [
        { label: "Move the wedding, play the final", emoji: "🏆", color: "bg-blue-600", consequence: "Morale -5, Shooting +2 next season, the in-laws never forget it",
          apply: s => { s.morale = clamp(s.morale - 5, 0, 100); s.statBoostNextSeason = { ...s.statBoostNextSeason, shooting: (s.statBoostNextSeason.shooting || 0) + 2 }; s.events = [...s.events, "💒 Moved your own wedding for a cup final. Her uncle has mentioned it at every family event since"]; return s; } },
        { label: "Get married, miss the final", emoji: "💍", color: "bg-pink-600", consequence: "Married, Morale +15, Popularity -8, the manager is incandescent",
          apply: s => { s.family = { ...s.family, isMarried: true, marriedAge: s.age }; s.morale = clamp(s.morale + 15, 0, 100); s.popularity = clamp(s.popularity - 8, 0, 100); s.events = [...s.events, "💍 Got married while your teammates lost a cup final. Best day of your life, worst week at training"]; return s; } },
        { label: "Wedding at 11am, kick off at 5pm, do both", emoji: "🚁", color: "bg-amber-600", consequence: "Married, Net worth -€0.2M on a helicopter, Followers +2M, Physical -2 next season",
          apply: s => { s.family = { ...s.family, isMarried: true, marriedAge: s.age }; s.netWorth = Math.round((s.netWorth - 0.2) * 100) / 100; s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 2) * 100) / 100; s.morale = clamp(s.morale + 10, 0, 100); s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) - 2 }; s.events = [...s.events, "🚁 Married at 11, kicked off at 5, still in the suit trousers under the tracksuit. Assisted the winner"]; return s; } },
      ] });
  }

  /* ══ 5. CLUB POLITICS ══ */
  if (pro >= 2) {
    push({ id: 476, emoji: "🤑", title: "The New Owner Has A Slideshow",
      description: `${state.currentClub} has been bought. Slide four promises three Champions League signings. Slide nine is a 90,000 seat stadium. Slide eleven is a hotel and it does not appear to be a joke.`,
      category: "life", choices: [
        { label: "Buy in publicly, be the face of the project", emoji: "📣", color: "bg-amber-600", consequence: "Wage +12%, Popularity +6, 40% it all collapses next season (Morale -12)",
          apply: s => { s.weeklyWage = Math.round(s.weeklyWage * 1.12); s.popularity = clamp(s.popularity + 6, 0, 100); if (Math.random() < 0.4) { s.morale = clamp(s.morale - 12, 0, 100); s.events = [...s.events, "🤑 Fronted the new owner's project. By March the training ground vending machines were empty"]; } else { s.morale = clamp(s.morale + 6, 0, 100); s.events = [...s.events, "🤑 Fronted the new owner's project and the mad slideshow actually started happening"]; } return s; } },
        { label: "Wait and see, say nothing at all", emoji: "🤨", color: "bg-blue-600", consequence: "Morale +2, wage unchanged, every option stays open",
          apply: s => { s.morale = clamp(s.morale + 2, 0, 100); s.events = [...s.events, "🤨 Said nothing about the new owner. Fourteen teammates wished they had done the same"]; return s; } },
        { label: "Ask for the release clause in writing first", emoji: "📄", color: "bg-emerald-600", consequence: "Wage +4%, Integrity +6, Morale +8, an exit that actually exists",
          apply: s => { s.weeklyWage = Math.round(s.weeklyWage * 1.04); s.integrityBonus += 6; s.morale = clamp(s.morale + 8, 0, 100); s.events = [...s.events, "📄 Traded a big raise for a written release clause. Cheapest insurance you ever bought"]; return s; } },
      ] });
  }

  if (pro >= 3) {
    push({ id: 477, emoji: "👋", title: "They Sacked The Man Who Made You",
      description: "The manager who gave you your debut was sacked by text message on a Tuesday. He is in the car park now, putting cardboard boxes into a Skoda, on his own.",
      category: "negative", choices: [
        { label: "Carry the boxes and post the photo", emoji: "📦", color: "bg-emerald-600", consequence: "Popularity +9, Integrity +10, Morale +6, the board is not amused",
          apply: s => { s.popularity = clamp(s.popularity + 9, 0, 100); s.integrityBonus += 10; s.morale = clamp(s.morale + 6, 0, 100); s.events = [...s.events, "📦 Carried your old manager's boxes to his car and posted the photo. The board hated it, the fans framed it"]; return s; } },
        { label: "Say something loyal in the press conference", emoji: "🎙️", color: "bg-blue-600", consequence: "Popularity +6, Morale +1, the new man benches you for 3 games",
          apply: s => { s.popularity = clamp(s.popularity + 6, 0, 100); s.morale = clamp(s.morale + 1, 0, 100); s.events = [...s.events, "🎙️ Defended the sacked manager on camera and watched three games from the bench for it"]; return s; } },
        { label: "Head down, the new man picks the team", emoji: "😶", color: "bg-muted", consequence: "Morale -6, but Shooting +1 and Passing +1 next season starting every week",
          apply: s => { s.morale = clamp(s.morale - 6, 0, 100); s.statBoostNextSeason = { ...s.statBoostNextSeason, shooting: (s.statBoostNextSeason.shooting || 0) + 1, passing: (s.statBoostNextSeason.passing || 0) + 1 }; s.events = [...s.events, "😶 Said nothing when they sacked the man who made you. Started 38 games for the next one"]; return s; } },
      ] });
  }

  if (state.isLeader) {
    push({ id: 478, emoji: "🎗️", title: "The Armband Is Going To Someone Else",
      description: "The new manager wants a fresh voice. Your armband is going to a 24-year-old who calls you sir. You found out from a club Instagram post while eating cereal.",
      category: "negative", choices: [
        { label: "Hand it over and lead without it", emoji: "🫡", color: "bg-emerald-600", consequence: "Morale -4, Integrity +12, Popularity +7, the squad still comes to you",
          apply: s => { s.isLeader = false; s.morale = clamp(s.morale - 4, 0, 100); s.integrityBonus += 12; s.popularity = clamp(s.popularity + 7, 0, 100); s.events = [...s.events, "🎗️ Gave up the armband without a word and kept running the dressing room anyway"]; return s; } },
        { label: "Demand a meeting and fight for it", emoji: "🥊", color: "bg-red-600", consequence: "50%: armband stays, Morale +10. 50%: sold in June, Morale -12",
          apply: s => { if (Math.random() < 0.5) { s.morale = clamp(s.morale + 10, 0, 100); s.events = [...s.events, "🥊 Fought for the armband in a 40 minute meeting and walked out still captain"]; } else { s.isLeader = false; s.morale = clamp(s.morale - 12, 0, 100); s.marketValue = Math.round(Math.max(0.5, s.marketValue - 2) * 100) / 100; s.events = [...s.events, "🥊 Fought for the armband, lost it, and became a name on a June shortlist"]; } return s; } },
        { label: "Ask for a transfer that afternoon", emoji: "🚪", color: "bg-amber-600", consequence: "Market value +€2M as clubs circle, Morale -6, Popularity -4",
          apply: s => { s.isLeader = false; s.marketValue = Math.round((s.marketValue + 2) * 100) / 100; s.morale = clamp(s.morale - 6, 0, 100); s.popularity = clamp(s.popularity - 4, 0, 100); s.events = [...s.events, "🚪 Lost the armband at 9am and asked for a transfer by 2pm"]; return s; } },
      ] });
  }

  if (pro >= 3 && flag(state, "stadiumMove") === 0) {
    push({ id: 479, emoji: "🏗️", title: "The Stadium Move",
      description: "The club is leaving the old ground for a bowl beside a motorway with a retractable roof and 47 food outlets. The last game at the old place is in May and the away end has already started crying.",
      category: "life", choices: [
        { label: "Lead the farewell, carry the old turf to the new pitch", emoji: "🌱", color: "bg-emerald-600", consequence: "Popularity +12, Morale +10, Integrity +8",
          apply: s => { setFlag(s, "stadiumMove", 1); s.popularity = clamp(s.popularity + 12, 0, 100); s.morale = clamp(s.morale + 10, 0, 100); s.integrityBonus += 8; s.events = [...s.events, "🌱 Dug up a square metre of the old centre circle and laid it in the new one yourself"]; return s; } },
        { label: "Do the sponsor's ribbon cutting at the new bowl", emoji: "✂️", color: "bg-amber-600", consequence: "Net worth +€0.4M, Sponsor income +€0.3M a year, Popularity -5",
          apply: s => { setFlag(s, "stadiumMove", 2); s.netWorth = Math.round((s.netWorth + 0.4) * 100) / 100; s.sponsorshipIncome = Math.round((s.sponsorshipIncome + 0.3) * 100) / 100; s.popularity = clamp(s.popularity - 5, 0, 100); s.events = [...s.events, "✂️ Cut the ribbon on a stadium named after a delivery app. €400k and a very long silence from the old ultras"]; return s; } },
        { label: "Say publicly that the old ground should have been kept", emoji: "📢", color: "bg-blue-600", consequence: "Popularity +9, Morale +5, the board fines you €80k",
          apply: s => { setFlag(s, "stadiumMove", 3); s.popularity = clamp(s.popularity + 9, 0, 100); s.morale = clamp(s.morale + 5, 0, 100); s.netWorth = Math.round((s.netWorth - 0.08) * 100) / 100; s.events = [...s.events, "📢 Said the old ground should have stayed and got fined €80k for the privilege"]; return s; } },
      ] });
  }

  if (pro >= 2 && state.currentClubTier >= 2) {
    push({ id: 480, emoji: "📉", title: "The Fans Have Made A Banner About You",
      description: "Four points from safety with six to play, and the away end has unveiled a banner with your weekly wage on it in numbers a metre tall. There is a second banner. The second banner is worse.",
      category: "negative", choices: [
        { label: "Walk to the away end at full time and take it", emoji: "🧍", color: "bg-emerald-600", consequence: "Popularity +13, Morale -5, Defending +1 and Physical +1 next season",
          apply: s => { s.popularity = clamp(s.popularity + 13, 0, 100); s.morale = clamp(s.morale - 5, 0, 100); s.statBoostNextSeason = { ...s.statBoostNextSeason, defending: (s.statBoostNextSeason.defending || 0) + 1, physical: (s.statBoostNextSeason.physical || 0) + 1 }; s.events = [...s.events, "🧍 Stood in front of the banner for ninety seconds and took every word. They sang your name in May"]; return s; } },
        { label: "Play out of your skin and say absolutely nothing", emoji: "⚡", color: "bg-blue-600", consequence: "Shooting +2 and Pace +1 next season, Popularity +6, Morale -3",
          apply: s => { s.statBoostNextSeason = { ...s.statBoostNextSeason, shooting: (s.statBoostNextSeason.shooting || 0) + 2, pace: (s.statBoostNextSeason.pace || 0) + 1 }; s.popularity = clamp(s.popularity + 6, 0, 100); s.morale = clamp(s.morale - 3, 0, 100); s.events = [...s.events, "⚡ Answered the banner with six weeks of the best football of your life and zero interviews"]; return s; } },
        { label: "Hand 8 weeks of wages to the supporters' food bank", emoji: "🥫", color: "bg-amber-600", consequence: "Costs 8 weeks of wages, Integrity +15, Popularity +16, Morale +6",
          apply: s => { const cost = Math.round((s.weeklyWage * 8 / 1000000) * 100) / 100; s.netWorth = Math.round((s.netWorth - cost) * 100) / 100; s.integrityBonus += 15; s.popularity = clamp(s.popularity + 16, 0, 100); s.morale = clamp(s.morale + 6, 0, 100); s.events = [...s.events, `🥫 Gave 8 weeks of wages (€${cost.toFixed(2)}M) to the supporters' food bank. The banner came down that night`]; return s; } },
      ] });
  }

  if (pro >= 4 && state.overall >= 76) {
    push({ id: 481, emoji: "🗄️", title: "The Sporting Director Wants A Favour",
      description: "He needs a senior player to tell the press that a certain teammate has not adapted. That teammate has two kids, a mortgage on a house he just bought, and no idea this meeting exists.",
      category: "negative", choices: [
        { label: "Refuse, and tell the teammate everything", emoji: "🤐", color: "bg-emerald-600", consequence: "Integrity +15, Morale +8, no contract talks for a year",
          apply: s => { s.integrityBonus += 15; s.morale = clamp(s.morale + 8, 0, 100); setFlag(s, "frozenOut", 1); s.events = [...s.events, "🗄️ Warned your teammate about the meeting. The sporting director stopped saying good morning"]; return s; } },
        { label: "Do it, and take the reward", emoji: "💼", color: "bg-red-600", consequence: "Wage +10%, Integrity -14, Morale -8",
          apply: s => { s.weeklyWage = Math.round(s.weeklyWage * 1.1); s.integrityBonus -= 14; s.morale = clamp(s.morale - 8, 0, 100); s.events = [...s.events, "💼 Read the club's line about a teammate into a microphone and got 10% for it. He was gone in nine days"]; return s; } },
        { label: "Refuse, but keep quiet about the meeting", emoji: "😶", color: "bg-blue-600", consequence: "Integrity +6, Morale -3, nobody owes anybody anything",
          apply: s => { s.integrityBonus += 6; s.morale = clamp(s.morale - 3, 0, 100); s.events = [...s.events, "🗄️ Refused to do the club's dirty work and never mentioned that the meeting happened"]; return s; } },
      ] });
  }

  /* ══ 6. WEIRD FOOTBALL LIFE ══ */
  if (state.popularity >= 40) {
    push({ id: 482, emoji: "🌟", title: "Celebrity XI",
      description: "A charity friendly against a team of celebrities. Their striker is a rapper in €900 boots, their keeper is a television chef, and their left back is a 51-year-old actor who has clearly trained for eight months and wants blood.",
      category: "life", choices: [
        { label: "Play it properly and score five", emoji: "🥅", color: "bg-amber-600", consequence: "Followers +1.4M, Popularity +6, Morale +5",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1.4) * 100) / 100; s.popularity = clamp(s.popularity + 6, 0, 100); s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "🌟 Put five past a television chef in a charity game and celebrated every one of them"]; return s; } },
        { label: "Set up every goal for the celebrities instead", emoji: "🎁", color: "bg-emerald-600", consequence: "Popularity +11, Integrity +8, Followers +1M",
          apply: s => { s.popularity = clamp(s.popularity + 11, 0, 100); s.integrityBonus += 8; s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1) * 100) / 100; s.events = [...s.events, "🎁 Spent 90 minutes teeing up goals for celebrities. The rapper has your shirt in a glass case"]; return s; } },
        { label: "Take the actor seriously and go 50/50 with him", emoji: "🦵", color: "bg-red-600", consequence: "Followers +2.3M, 30% you tweak a hamstring (Pace -2 next season)",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 2.3) * 100) / 100; if (Math.random() < 0.3) { s.statBoostNextSeason = { ...s.statBoostNextSeason, pace: (s.statBoostNextSeason.pace || 0) - 2 }; s.events = [...s.events, "🦵 Went 50/50 with a 51-year-old actor in a charity game and pulled a hamstring. He posted about it for weeks"]; } else { s.morale = clamp(s.morale + 6, 0, 100); s.events = [...s.events, "🦵 Went 50/50 with a 51-year-old actor and won it cleanly. He asked for a rematch immediately"]; } return s; } },
      ] });
  }

  if (state.sponsorshipIncome >= 0.5 || state.popularity >= 45) {
    push({ id: 483, emoji: "🐴", title: "The Sponsor Bought A Horse",
      description: "An energy drink wants you to ride a white horse onto the pitch before kick off. There is a contract, there is a horse, and the horse is called Terry. Terry does not want to be there.",
      category: "life", choices: [
        { label: "Ride Terry onto the pitch", emoji: "🤠", color: "bg-amber-600", consequence: "Net worth +€0.8M, Followers +3M, 25% Terry throws you (Physical -2 next season)",
          apply: s => { s.netWorth = Math.round((s.netWorth + 0.8) * 100) / 100; s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 3) * 100) / 100; if (Math.random() < 0.25) { s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) - 2 }; s.morale = clamp(s.morale - 6, 0, 100); s.events = [...s.events, "🐴 Terry threw you into an advertising board in front of 50,000 people. The sponsor called it engagement"]; } else { s.popularity = clamp(s.popularity + 5, 0, 100); s.events = [...s.events, "🐴 Rode a horse called Terry onto a football pitch and somehow made it look deliberate"]; } return s; } },
        { label: "Walk Terry on instead, nobody rides anybody", emoji: "🚶", color: "bg-blue-600", consequence: "Net worth +€0.4M, Followers +1.2M, Popularity +4",
          apply: s => { s.netWorth = Math.round((s.netWorth + 0.4) * 100) / 100; s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1.2) * 100) / 100; s.popularity = clamp(s.popularity + 4, 0, 100); s.events = [...s.events, "🚶 Walked Terry out by the reins like a very calm best man. Half the fee, all of the dignity"]; return s; } },
        { label: "Refuse on animal welfare grounds, loudly", emoji: "🐎", color: "bg-emerald-600", consequence: "Sponsor pulls €0.6M a year, Popularity +12, Integrity +14",
          apply: s => { s.sponsorshipIncome = Math.round(Math.max(0, s.sponsorshipIncome - 0.6) * 100) / 100; s.popularity = clamp(s.popularity + 12, 0, 100); s.integrityBonus += 14; s.events = [...s.events, "🐎 Killed the horse stunt publicly and lost €600k a year. Terry retired to a field in the countryside"]; return s; } },
      ] });
  }

  if (state.socialMediaFollowers >= 2) {
    push({ id: 484, emoji: "💇", title: "Nine Hundred Haircuts",
      description: "A superfan is attempting a world record: 900 people with your exact haircut in one car park on a Sunday. He has hired 30 barbers. He wants you in the 900th chair.",
      category: "life", choices: [
        { label: "Turn up and take the 900th chair", emoji: "✂️", color: "bg-amber-600", consequence: "Followers +2.6M, Popularity +9, Morale +7",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 2.6) * 100) / 100; s.popularity = clamp(s.popularity + 9, 0, 100); s.morale = clamp(s.morale + 7, 0, 100); s.events = [...s.events, "💇 Sat in the 900th chair and broke a world record in a car park. Your own haircut, done badly, by a stranger"]; return s; } },
        { label: "Send them a bus and pay for every haircut", emoji: "🚌", color: "bg-emerald-600", consequence: "Net worth -€0.1M, Popularity +12, Integrity +10, Followers +1.5M",
          apply: s => { s.netWorth = Math.round((s.netWorth - 0.1) * 100) / 100; s.popularity = clamp(s.popularity + 12, 0, 100); s.integrityBonus += 10; s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1.5) * 100) / 100; s.events = [...s.events, "🚌 Paid for 900 haircuts and a bus. Cheapest goodwill in the history of the club"]; return s; } },
        { label: "Send a video message and stay well away", emoji: "📹", color: "bg-muted", consequence: "Followers +0.5M, Morale +3, your hair remains exactly as it is",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.5) * 100) / 100; s.morale = clamp(s.morale + 3, 0, 100); s.events = [...s.events, "📹 Sent a 20 second video to the haircut record attempt and kept your own head out of it"]; return s; } },
      ] });
  }

  push({ id: 485, emoji: "🐦", title: "The Pigeon Lives In The Goal",
    description: "A pigeon has nested in the stanchion at the north end and has now been present for 11 consecutive home wins. The kit man has named it. The manager has started referring to it as part of the system.",
    category: "life", choices: [
      { label: "Declare the pigeon a teammate, put it on the team sheet", emoji: "📋", color: "bg-emerald-600", consequence: "Morale +8, Followers +1.1M, Popularity +5",
        apply: s => { s.morale = clamp(s.morale + 8, 0, 100); s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1.1) * 100) / 100; s.popularity = clamp(s.popularity + 5, 0, 100); s.events = [...s.events, "🐦 Got a pigeon listed as substitute number 19. The league office sent a letter. Framed it"]; return s; } },
      { label: "Score at the north end every week to feed the legend", emoji: "🎯", color: "bg-amber-600", consequence: "Shooting +1 next season, Followers +0.7M, Morale +6",
        apply: s => { s.statBoostNextSeason = { ...s.statBoostNextSeason, shooting: (s.statBoostNextSeason.shooting || 0) + 1 }; s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.7) * 100) / 100; s.morale = clamp(s.morale + 6, 0, 100); s.events = [...s.events, "🎯 Made a point of scoring at the pigeon end. Eleven wins became nineteen"]; return s; } },
      { label: "Tell the groundsman to move it, humanely", emoji: "🧤", color: "bg-muted", consequence: "Popularity -4, Morale -3, Defending +1 next season with nothing in your eyeline",
        apply: s => { s.popularity = clamp(s.popularity - 4, 0, 100); s.morale = clamp(s.morale - 3, 0, 100); s.statBoostNextSeason = { ...s.statBoostNextSeason, defending: (s.statBoostNextSeason.defending || 0) + 1 }; s.events = [...s.events, "🧤 Had the lucky pigeon relocated to a nice loft. The club lost the next three at home and everyone blamed you"]; return s; } },
    ] });

  if (state.socialMediaFollowers >= 1) {
    push({ id: 486, emoji: "🎮", title: "The Streamer Wants Five Penalties",
      description: "A streamer with 19 million subscribers has challenged you to a penalty shootout. He has never played football. He has watched roughly 4,000 hours of it and he has a documented plan.",
      category: "life", choices: [
        { label: "Accept: five penalties, €200k to charity on the line", emoji: "🥅", color: "bg-amber-600", consequence: "Followers +2.8M, Popularity +8, 12% he wins and it costs you €0.2M",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 2.8) * 100) / 100; s.popularity = clamp(s.popularity + 8, 0, 100); if (Math.random() < 0.12) { s.netWorth = Math.round((s.netWorth - 0.2) * 100) / 100; s.morale = clamp(s.morale - 4, 0, 100); s.events = [...s.events, "🎮 Lost a penalty shootout to a streamer. €200k to charity and a clip that will outlive you"]; } else { s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "🎮 Beat a streamer 5 to 1 on penalties. He described the experience as character building"]; } return s; } },
        { label: "Accept, but he takes them in a mascot suit", emoji: "🐻", color: "bg-blue-600", consequence: "Followers +1.9M, Morale +8, Popularity +6",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1.9) * 100) / 100; s.morale = clamp(s.morale + 8, 0, 100); s.popularity = clamp(s.popularity + 6, 0, 100); s.events = [...s.events, "🐻 Made the streamer take all five penalties in a full bear costume. He scored one and fell over twice"]; return s; } },
        { label: "Decline. You are not a content mine", emoji: "⛔", color: "bg-emerald-600", consequence: "Shooting +1 and Passing +1 next season, Morale +4",
          apply: s => { s.statBoostNextSeason = { ...s.statBoostNextSeason, shooting: (s.statBoostNextSeason.shooting || 0) + 1, passing: (s.statBoostNextSeason.passing || 0) + 1 }; s.morale = clamp(s.morale + 4, 0, 100); s.events = [...s.events, "⛔ Turned down the streamer shootout and spent that Sunday on the training pitch instead"]; return s; } },
      ] });
  }

  push({ id: 487, emoji: "🏃", title: "The Pitch Invader Was Faster Than You",
    description: "A 19-year-old in Crocs got on the pitch, went 40 metres, and comfortably outran you and two stewards. The broadcaster put a speed graphic on it. Your teammates have printed the graphic and laminated it.",
    category: "life", choices: [
      { label: "Challenge him to a race on camera for charity", emoji: "🏁", color: "bg-amber-600", consequence: "Followers +2.4M, Popularity +9, Pace +1 next season from the training",
        apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 2.4) * 100) / 100; s.popularity = clamp(s.popularity + 9, 0, 100); s.statBoostNextSeason = { ...s.statBoostNextSeason, pace: (s.statBoostNextSeason.pace || 0) + 1 }; s.events = [...s.events, "🏁 Raced the pitch invader over 60 metres for charity. Won by a stride and never mentioned the Crocs again"]; return s; } },
      { label: "Own the joke, put the speed graphic on a t-shirt", emoji: "👕", color: "bg-emerald-600", consequence: "Followers +1.6M, Morale +8, Popularity +7",
        apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1.6) * 100) / 100; s.morale = clamp(s.morale + 8, 0, 100); s.popularity = clamp(s.popularity + 7, 0, 100); s.events = [...s.events, "👕 Sold t-shirts of the graphic that proved a man in Crocs was faster than you. Sold out in a day"]; return s; } },
      { label: "Refuse to discuss it and live in the sprint drills", emoji: "😤", color: "bg-blue-600", consequence: "Pace +2 next season, Morale -4, Followers +0.3M",
        apply: s => { s.statBoostNextSeason = { ...s.statBoostNextSeason, pace: (s.statBoostNextSeason.pace || 0) + 2 }; s.morale = clamp(s.morale - 4, 0, 100); s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 0.3) * 100) / 100; s.events = [...s.events, "😤 Said nothing about the Crocs incident and did sprint work until the GPS data frightened the staff"]; return s; } },
    ] });

  if (state.popularity >= 50) {
    push({ id: 488, emoji: "🗿", title: "The Mascot Is Your Head",
      description: "The club's new mascot is a two metre foam version of your own head with legs. It waves at you in the tunnel. Children scream at it. It has an Instagram account with more followers than your mother.",
      category: "life", choices: [
        { label: "Embrace it, run out holding its hand every week", emoji: "🤝", color: "bg-amber-600", consequence: "Followers +2M, Popularity +10, Morale +6",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 2) * 100) / 100; s.popularity = clamp(s.popularity + 10, 0, 100); s.morale = clamp(s.morale + 6, 0, 100); s.events = [...s.events, "🗿 Walked out hand in hand with a giant foam version of your own head, 19 home games running"]; return s; } },
        { label: "Ask them to change the face, politely", emoji: "😶", color: "bg-blue-600", consequence: "Popularity +2, Morale +5, the club replaces it with a badger",
          apply: s => { s.popularity = clamp(s.popularity + 2, 0, 100); s.morale = clamp(s.morale + 5, 0, 100); s.events = [...s.events, "😶 Politely got your own giant foam head decommissioned. It was replaced by a badger called Keith"]; return s; } },
        { label: "Buy the rights and license your own head", emoji: "💼", color: "bg-purple-600", consequence: "Net worth -€0.3M now, Sponsor income +€0.5M a year, Integrity -2",
          apply: s => { s.netWorth = Math.round((s.netWorth - 0.3) * 100) / 100; s.sponsorshipIncome = Math.round((s.sponsorshipIncome + 0.5) * 100) / 100; s.integrityBonus -= 2; s.events = [...s.events, "💼 Bought the rights to your own foam head and licensed it back to the club. It sells 40,000 plush toys a year"]; return s; } },
      ] });
  }

  /* ══ 7. CONTRACT AND CAREER CHOICES ══ */
  if (state.overall >= 78 && state.age >= 25 && flag(state, "saudiCall") === 0) {
    push({ id: 489, emoji: "🛢️", title: "The Saudi Pro League Called In January",
      description: "Mid-season, a Saudi Pro League club offers to nearly triple your wage tomorrow morning. Your club would let you go. Your grandfather has asked, on speakerphone, whether you are finished with the real thing.",
      category: "life", choices: [
        { label: "Sign the pre-contract, leave in the summer", emoji: "💰", color: "bg-amber-600", consequence: "Signing bonus +€9M, wage +180%, Popularity -11",
          apply: s => { setFlag(s, "saudiCall", 1); s.netWorth = Math.round((s.netWorth + 9) * 100) / 100; s.weeklyWage = Math.round(s.weeklyWage * 2.8); s.popularity = clamp(s.popularity - 11, 0, 100); s.morale = clamp(s.morale + 6, 0, 100); s.events = [...s.events, "🛢️ Signed for the Saudi Pro League for the summer. €9M up front and one very quiet phone call with your grandfather"]; return s; } },
        { label: "Reject it and use it as leverage right here", emoji: "🪑", color: "bg-blue-600", consequence: "Wage +25%, Morale +6, Popularity +5",
          apply: s => { setFlag(s, "saudiCall", 2); s.weeklyWage = Math.round(s.weeklyWage * 1.25); s.morale = clamp(s.morale + 6, 0, 100); s.popularity = clamp(s.popularity + 5, 0, 100); s.events = [...s.events, "🛢️ Used the Saudi offer to get 25% more where you already were. Your agent framed the fax"]; return s; } },
        { label: "Turn it down publicly and say you want trophies", emoji: "🏆", color: "bg-emerald-600", consequence: "Popularity +14, Morale +10, Shooting +1 next season, zero extra money",
          apply: s => { setFlag(s, "saudiCall", 3); s.popularity = clamp(s.popularity + 14, 0, 100); s.morale = clamp(s.morale + 10, 0, 100); s.statBoostNextSeason = { ...s.statBoostNextSeason, shooting: (s.statBoostNextSeason.shooting || 0) + 1 }; s.integrityBonus += 8; s.events = [...s.events, "🏆 Said no to Saudi money on camera and said the word trophies four times. The fans lost their minds"]; return s; } },
      ] });
  }

  if (state.age >= 30 && state.overall >= 74 && flag(state, "mlsCall") === 0) {
    push({ id: 490, emoji: "🌴", title: "Major League Soccer Wants A Franchise Player",
      description: "An MLS club wants you as their designated player: beach, no relegation, a four year deal, and an owner who keeps calling you the brand. Your knees have already sent an email saying yes.",
      category: "life", choices: [
        { label: "Take the deal and the sunshine", emoji: "🌴", color: "bg-emerald-600", consequence: "Wage +40%, Net worth +€3M, Physical +2 next season, Popularity -4 in Europe",
          apply: s => { setFlag(s, "mlsCall", 1); s.weeklyWage = Math.round(s.weeklyWage * 1.4); s.netWorth = Math.round((s.netWorth + 3) * 100) / 100; s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) + 2 }; s.popularity = clamp(s.popularity - 4, 0, 100); s.events = [...s.events, "🌴 Signed for MLS as a designated player. Sixteen flights a season and a body that finally stopped hurting"]; return s; } },
        { label: "Ask for two years and a coaching clause", emoji: "📋", color: "bg-blue-600", consequence: "Wage +25%, a job waiting for after you stop, Morale +8",
          apply: s => { setFlag(s, "mlsCall", 2); s.weeklyWage = Math.round(s.weeklyWage * 1.25); s.morale = clamp(s.morale + 8, 0, 100); s.events = [...s.events, "📋 Took the MLS deal with a coaching clause written into it. Two careers, one signature"]; return s; } },
        { label: "Stay in Europe and keep chasing it", emoji: "🇪🇺", color: "bg-amber-600", consequence: "Morale +6, Shooting +1 next season, Market value +€2M",
          apply: s => { setFlag(s, "mlsCall", 3); s.morale = clamp(s.morale + 6, 0, 100); s.statBoostNextSeason = { ...s.statBoostNextSeason, shooting: (s.statBoostNextSeason.shooting || 0) + 1 }; s.marketValue = Math.round((s.marketValue + 2) * 100) / 100; s.events = [...s.events, "🌴 Said no to the beach and stayed in Europe for one more crack at everything"]; return s; } },
      ] });
  }

  if (state.age >= 33 && pro >= 12) {
    push({ id: 491, emoji: "📐", title: "Player Coach",
      description: "The club offers a hybrid: you still get about 15 games, you take the set piece sessions, and you sit in selection meetings where people say things out loud about your friends.",
      category: "life", choices: [
        { label: "Take it and start learning the other job", emoji: "🧠", color: "bg-emerald-600", consequence: "Net worth +€0.5M, Passing +1 next season, Morale +8, fewer minutes",
          apply: s => { s.netWorth = Math.round((s.netWorth + 0.5) * 100) / 100; s.statBoostNextSeason = { ...s.statBoostNextSeason, passing: (s.statBoostNextSeason.passing || 0) + 1 }; s.morale = clamp(s.morale + 8, 0, 100); setFlag(s, "playerCoach", 1); s.events = [...s.events, "📐 Went player coach at 33. Took the set pieces, won three games with them, and started thinking in diagrams"]; return s; } },
        { label: "Just be a player until the very last day", emoji: "⚽", color: "bg-blue-600", consequence: "Physical +1 and Shooting +1 next season, Morale +6",
          apply: s => { s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) + 1, shooting: (s.statBoostNextSeason.shooting || 0) + 1 }; s.morale = clamp(s.morale + 6, 0, 100); s.events = [...s.events, "⚽ Turned down the coaching badge and stayed a footballer, entirely and only, to the last whistle"]; return s; } },
        { label: "Take it and use it to run the dressing room", emoji: "🎯", color: "bg-amber-600", consequence: "Leader unlocked, Morale +10, Integrity -4, two teammates stop trusting you",
          apply: s => { s.isLeader = true; s.morale = clamp(s.morale + 10, 0, 100); s.integrityBonus -= 4; setFlag(s, "playerCoach", 2); s.events = [...s.events, "🎯 Took the player coach role and ran the dressing room with it. Two mates never spoke to you the same way again"]; return s; } },
      ] });
  }

  if (pro >= 1 && lastApps <= 18 && state.age <= 26) {
    push({ id: 492, emoji: "📄", title: "A Loan To Get Minutes",
      description: `You played ${lastApps} games last season and the manager keeps using the word patience. A club two divisions down wants you for a year: guaranteed starter, half the wage, real football.`,
      category: "life", choices: [
        { label: "Go on loan and play every single week", emoji: "🚌", color: "bg-emerald-600", consequence: "Wage -45% for a year, Shooting +2 and Pace +1 next season, Morale +8",
          apply: s => { s.weeklyWage = Math.round(s.weeklyWage * 0.55); s.statBoostNextSeason = { ...s.statBoostNextSeason, shooting: (s.statBoostNextSeason.shooting || 0) + 2, pace: (s.statBoostNextSeason.pace || 0) + 1 }; s.morale = clamp(s.morale + 8, 0, 100); s.events = [...s.events, "📄 Dropped two divisions on loan for half the money and 42 starts. Best decision of your twenties"]; return s; } },
        { label: "Stay and fight for the shirt", emoji: "🛡️", color: "bg-blue-600", consequence: "45%: Passing +2 and Dribbling +2 next season. 55%: another year on the bench (Morale -6)",
          apply: s => { if (Math.random() < 0.45) { s.statBoostNextSeason = { ...s.statBoostNextSeason, passing: (s.statBoostNextSeason.passing || 0) + 2, dribbling: (s.statBoostNextSeason.dribbling || 0) + 2 }; s.morale = clamp(s.morale + 8, 0, 100); s.events = [...s.events, "🛡️ Stayed, fought, and forced your way into the XI by November"]; } else { s.morale = clamp(s.morale - 6, 0, 100); s.events = [...s.events, "🛡️ Stayed to fight for the shirt and watched another season from a padded seat"]; } return s; } },
        { label: "Demand a permanent transfer instead", emoji: "📦", color: "bg-amber-600", consequence: "Market value -€2M, Morale +5, Popularity -3",
          apply: s => { s.marketValue = Math.round(Math.max(0.5, s.marketValue - 2) * 100) / 100; s.morale = clamp(s.morale + 5, 0, 100); s.popularity = clamp(s.popularity - 3, 0, 100); s.events = [...s.events, "📦 Refused the loan and demanded a permanent move. Your agent called 30 clubs and admitted it out loud"]; return s; } },
      ] });
  }

  if (state.age >= 31 && state.contractYearsLeft <= 1) {
    push({ id: 493, emoji: "✂️", title: "Take The Pay Cut Or Take The Train",
      description: `${state.currentClub} will keep you for two more years at 40% less. The alternative is a free transfer and a phone that might not ring. The sporting director slides the paper across without looking up.`,
      category: "life", choices: [
        { label: "Sign it. This is your club", emoji: "🖊️", color: "bg-emerald-600", consequence: "Wage -40%, Morale +10, Popularity +12, Integrity +8",
          apply: s => { s.weeklyWage = Math.round(s.weeklyWage * 0.6); s.contractYearsLeft = 2; s.morale = clamp(s.morale + 10, 0, 100); s.popularity = clamp(s.popularity + 12, 0, 100); s.integrityBonus += 8; s.events = [...s.events, "✂️ Took a 40% pay cut to stay. The club shop sold out of your shirt in a weekend"]; return s; } },
        { label: "Refuse and go looking for a bigger deal", emoji: "🚪", color: "bg-amber-600", consequence: "60%: wage +15% elsewhere. 40%: nobody calls (wage -55%, Morale -12)",
          apply: s => { if (Math.random() < 0.6) { s.weeklyWage = Math.round(s.weeklyWage * 1.15); s.morale = clamp(s.morale + 6, 0, 100); s.events = [...s.events, "🚪 Refused the pay cut, walked, and got 15% more somewhere warmer"]; } else { s.weeklyWage = Math.round(s.weeklyWage * 0.45); s.morale = clamp(s.morale - 12, 0, 100); s.events = [...s.events, "🚪 Refused the pay cut and spent a summer watching a phone that did not ring. Signed for 45% in August"]; } return s; } },
        { label: "One year at the same wage, no bonuses", emoji: "🤝", color: "bg-blue-600", consequence: "Wage unchanged, contract 1 year, Morale +4, do this again next June",
          apply: s => { s.contractYearsLeft = 1; s.morale = clamp(s.morale + 4, 0, 100); s.events = [...s.events, "🤝 Signed one more year at the same wage with every bonus stripped out. See you in June"]; return s; } },
      ] });
  }

  if (state.overall >= 80 && state.marketValue >= 30) {
    push({ id: 494, emoji: "🔓", title: "Someone Activated Your Release Clause",
      description: `A club has paid your release clause in full, in one transfer, without asking anybody first. ${state.currentClub} found out from a website. Your phone has ${rand(48, 96)} missed calls on it.`,
      category: "life", choices: [
        { label: "Go. The clause exists for a reason", emoji: "✈️", color: "bg-amber-600", consequence: "Wage +55%, signing bonus +€4M, Popularity -8 at your old club",
          apply: s => { s.weeklyWage = Math.round(s.weeklyWage * 1.55); s.netWorth = Math.round((s.netWorth + 4) * 100) / 100; s.popularity = clamp(s.popularity - 8, 0, 100); s.events = [...s.events, "🔓 Let the release clause do its job and left the same week. The banners outside the ground did not age well"]; return s; } },
        { label: "Refuse to sign and stay out of loyalty", emoji: "🏟️", color: "bg-emerald-600", consequence: "Popularity +16, Morale +12, Integrity +12, wage +10% from a grateful board",
          apply: s => { s.popularity = clamp(s.popularity + 16, 0, 100); s.morale = clamp(s.morale + 12, 0, 100); s.integrityBonus += 12; s.weeklyWage = Math.round(s.weeklyWage * 1.1); s.events = [...s.events, "🏟️ Your clause was paid in full and you said no anyway. The whole stadium sang your name in the 7th minute"]; return s; } },
        { label: "Use it to force a better deal where you are", emoji: "📈", color: "bg-blue-600", consequence: "Wage +35%, Morale +5, Popularity -3",
          apply: s => { s.weeklyWage = Math.round(s.weeklyWage * 1.35); s.morale = clamp(s.morale + 5, 0, 100); s.popularity = clamp(s.popularity - 3, 0, 100); s.events = [...s.events, "🔓 Turned a paid release clause into a 35% raise at the same desk. Two papers called you a mercenary"]; return s; } },
      ] });
  }

  return events;
}
