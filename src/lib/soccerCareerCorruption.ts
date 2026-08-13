/* ────────────────────────────────────────────────────────────────────────────
   soccerCareerCorruption.ts, the dirty side of Soccer Career (Round 54)
   Owner brief: "imagine everything BitLife has and make it ten times better
   and more out of pocket. add corruption and more things to spend money on."

   This is the crime layer. Multi-season arcs where money, power and very bad
   decisions compound: bribing officials, laundering through your own
   businesses, tanking matches for a betting syndicate, buying a Ballon d'Or
   vote, and the investigators who slowly close in on all of it.

   MECHANICS (all optional CareerState fields, so pre-R54 saves keep loading):
     corruptionHeat  0-100 hidden meter. Dirty choices raise it, clean seasons
                     cool it 8/yr. At 70 the dawn raid becomes possible, at 90
                     conviction and prison. Handled in advanceProSeason.
     dirtyMoney      millions of unexplained income. Feeds heat every season
                     until laundered through shady shop purchases.
     prisonSeasons   >0 means the next season is served inside.

   Same self-gating contract as soccerCareerLife.ts: an event only appears in
   the returned array when its conditions hold, so the caller needs no extra
   eligibility rules. Ids live in the 300-349 band.
   ──────────────────────────────────────────────────────────────────────────── */
import type { CareerState, RandomEvent } from "./soccerCareerEngine";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const flag = (s: CareerState, key: string): number => (s.lifeFlags || {})[key] || 0;
const setFlag = (s: CareerState, key: string, value: number) => {
  s.lifeFlags = { ...(s.lifeFlags || {}), [key]: value };
};
const heat = (s: CareerState, delta: number) => {
  s.corruptionHeat = clamp((s.corruptionHeat ?? 0) + delta, 0, 100);
};
const dirty = (s: CareerState, delta: number) => {
  s.dirtyMoney = Math.round(((s.dirtyMoney ?? 0) + delta) * 100) / 100;
};

/** Heat band label, used by the UI panel so the player can feel the danger
    without seeing the raw number. */
export function heatLabel(h: number): { label: string; tone: string; blurb: string } {
  if (h >= 90) return { label: "INDICTED", tone: "text-red-400", blurb: "Prosecutors have everything. Lawyers are talking about years, not fines." };
  if (h >= 70) return { label: "UNDER INVESTIGATION", tone: "text-red-400", blurb: "Unmarked cars outside training. Your accountant stopped answering." };
  if (h >= 45) return { label: "QUESTIONS ASKED", tone: "text-orange-400", blurb: "A journalist keeps calling about your car wash. She is very good at her job." };
  if (h >= 20) return { label: "WHISPERS", tone: "text-amber-400", blurb: "Nothing solid. Just a rumour with your name attached to it." };
  return { label: "CLEAN", tone: "text-emerald-400", blurb: "Nobody is looking at you. Keep it that way, or do not." };
}

/* ─── The corruption catalog (ids 300-349) ─── */
export function getCorruptionEvents(state: CareerState): RandomEvent[] {
  const events: RandomEvent[] = [];
  const push = (e: RandomEvent) => events.push(e);
  const h = state.corruptionHeat ?? 0;
  const dm = state.dirtyMoney ?? 0;
  const pro = state.seasons.filter(s => s.type === "playing").length;
  const isAttacker = ["ST", "CAM", "LW", "RW"].includes(state.position);

  /* ══ ARC 1: The betting syndicate. Three stages, escalating. ══ */
  if (flag(state, "syndicate") === 0 && pro >= 2 && state.age >= 20) {
    push({ id: 300, emoji: "🎲", title: "The Man In The Grey Suit",
      description: "A man you have never met is waiting by your car. He knows your mother's name, your bank, and exactly how many yellow cards you have. He wants one favour: pick up a booking in the 80th minute of a dead rubber. The envelope is already in his hand.",
      category: "negative", choices: [
        { label: "Take the envelope, €400k cash", emoji: "💰", color: "bg-red-600", consequence: "€400k dirty money, Heat +20, and they have your number now",
          apply: s => { setFlag(s, "syndicate", 1); dirty(s, 0.4); heat(s, 20); s.integrityBonus -= 10; s.events = [...s.events, "🎲 Took the envelope. One yellow card, four hundred grand, and a new friend you cannot unfriend"]; return s; } },
        { label: "Walk away and say nothing", emoji: "🚶", color: "bg-muted", consequence: "Nothing happens. Yet",
          apply: s => { setFlag(s, "syndicate", -1); s.events = [...s.events, "🚶 Walked past the grey suit without a word. He smiled like he had all the time in the world"]; return s; } },
        { label: "Report him to the league", emoji: "📞", color: "bg-emerald-600", consequence: "Integrity +15, Popularity +5, and a permanent enemy",
          apply: s => { setFlag(s, "syndicate", -2); s.integrityBonus += 15; s.popularity = clamp(s.popularity + 5, 0, 100); s.events = [...s.events, "📞 Reported the approach. The league called you an example. The grey suit called you nothing at all"]; return s; } },
      ] });
  }

  if (flag(state, "syndicate") === 1) {
    push({ id: 301, emoji: "📉", title: "They Want More Than A Yellow",
      description: "The grey suit is back, and the ask has grown teeth. Miss a penalty. Or concede one. Whatever your position allows. The number this time has a comma in a new place: €3M. He mentions, warmly, that he has photos of the first envelope.",
      category: "negative", choices: [
        { label: "Do it. €3M", emoji: "🩸", color: "bg-red-700", consequence: "€3M dirty, Heat +30, Morale -12. You are in the business now",
          apply: s => { setFlag(s, "syndicate", 2); dirty(s, 3); heat(s, 30); s.morale = clamp(s.morale - 12, 0, 100); s.integrityBonus -= 25; s.events = [...s.events, "🩸 You threw it. Nobody in the stadium knew. You knew for the rest of your life"]; return s; } },
        { label: "Refuse and take the consequences", emoji: "🛡️", color: "bg-blue-600", consequence: "He leaks the first envelope: Popularity -18, Heat +10, but no more asks",
          apply: s => { setFlag(s, "syndicate", 3); heat(s, 10); s.popularity = clamp(s.popularity - 18, 0, 100); s.morale = clamp(s.morale - 8, 0, 100); s.events = [...s.events, "🛡️ Refused. The photos ran on a Sunday front page. At least it stopped there"]; return s; } },
        { label: "Go to the police with everything", emoji: "🚨", color: "bg-emerald-600", consequence: "6-month ban for the first envelope, but Heat resets and Integrity +20",
          apply: s => { setFlag(s, "syndicate", 4); s.corruptionHeat = 0; dirty(s, -Math.min(0.4, s.dirtyMoney ?? 0)); s.integrityBonus += 20; s.popularity = clamp(s.popularity - 6, 0, 100); s.morale = clamp(s.morale + 10, 0, 100); s.events = [...s.events, "🚨 You walked into a police station with a folder. Six-month ban, and you slept properly for the first time in a year"]; return s; } },
      ] });
  }

  if (flag(state, "syndicate") === 2 && Math.random() < 0.7) {
    push({ id: 302, emoji: "🕳️", title: "The Syndicate Owns You",
      description: "It is not requests anymore. It is a schedule. Four matches this season, results pre-agreed, and a courier who arrives before you do. A teammate has started watching you strangely in the tunnel.",
      category: "negative", choices: [
        { label: "Run the season for them, €8M", emoji: "💀", color: "bg-red-700", consequence: "€8M dirty, Heat +35, form collapses. The end is coming and it will be loud",
          apply: s => { dirty(s, 8); heat(s, 35); s.morale = clamp(s.morale - 20, 0, 100); s.integrityBonus -= 40; setFlag(s, "syndicate", 5); s.events = [...s.events, "💀 A whole season sold. The bank account has never looked better or worse"]; return s; } },
        { label: "Burn it all down: confess publicly", emoji: "🔥", color: "bg-amber-600", consequence: "2-season ban, Heat wiped, dirty money seized, but you get your name back",
          apply: s => { s.matchFixBanned = 2; s.corruptionHeat = 0; s.dirtyMoney = 0; s.integrityBonus += 10; s.popularity = clamp(s.popularity - 25, 0, 100); setFlag(s, "syndicate", 6); s.events = [...s.events, "🔥 You confessed on live television with no lawyer beside you. Two years gone. The truth cost everything and was still cheaper"]; return s; } },
        { label: "Disappear: fake an injury and hide", emoji: "🏥", color: "bg-muted", consequence: "Miss most of the season, Heat +15, they will find you again",
          apply: s => { heat(s, 15); s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) - 2 }; s.morale = clamp(s.morale - 10, 0, 100); s.events = [...s.events, "🏥 Six months of a fake groin problem. The physios were confused. The syndicate was patient"]; return s; } },
      ] });
  }

  /* ══ ARC 2: The bent official. Cheap, effective, catastrophic. ══ */
  if (flag(state, "refArc") === 0 && state.overall >= 74 && pro >= 3) {
    push({ id: 305, emoji: "🧑‍⚖️", title: "The Referee's Brother-In-Law",
      description: "At a charity dinner, a man introduces himself as a referee's brother-in-law roughly nine seconds before explaining that penalties are, in his words, 'a matter of interpretation, and interpretation has a price'.",
      category: "negative", choices: [
        { label: "Pay €250k for a friendly whistle", emoji: "🤫", color: "bg-red-600", consequence: "Heat +18, next season the calls go your way",
          apply: s => { setFlag(s, "refArc", 1); s.netWorth = Math.round((s.netWorth - 0.25) * 100) / 100; heat(s, 18); s.integrityBonus -= 12; s.statBoostNextSeason = { ...s.statBoostNextSeason, shooting: (s.statBoostNextSeason.shooting || 0) + 2 }; s.events = [...s.events, "🤫 Paid the brother-in-law. Funny how many penalties you win now"]; return s; } },
        { label: "Tell him you win yours honestly", emoji: "😤", color: "bg-emerald-600", consequence: "Integrity +8, and he tells the referee you were rude",
          apply: s => { setFlag(s, "refArc", -1); s.integrityBonus += 8; s.events = [...s.events, "😤 Told him where to go. Your next three penalty shouts were mysteriously waved away"]; return s; } },
      ] });
  }

  if (flag(state, "refArc") === 1 && Math.random() < 0.5) {
    push({ id: 306, emoji: "🎙️", title: "The Whistle Talks",
      description: "The referee has been suspended, and he is furious about who is being blamed. A journalist reports that a top-flight player paid for calls. Your name is not printed. It is heavily implied.",
      category: "negative", choices: [
        { label: "Pay him off again, €1.5M for silence", emoji: "💵", color: "bg-red-700", consequence: "Heat +25, the story dies, the leverage never does",
          apply: s => { s.netWorth = Math.round((s.netWorth - 1.5) * 100) / 100; heat(s, 25); setFlag(s, "refArc", 2); s.events = [...s.events, "💵 Bought the silence for €1.5M. The invoice said 'consultancy'"]; return s; } },
        { label: "Deny everything and lawyer up", emoji: "⚖️", color: "bg-blue-600", consequence: "Heat +10, Popularity -10, the story fades in months",
          apply: s => { heat(s, 10); s.popularity = clamp(s.popularity - 10, 0, 100); setFlag(s, "refArc", 3); s.events = [...s.events, "⚖️ Flat denial through three lawyers. It worked, mostly, eventually"]; return s; } },
        { label: "Come clean before it breaks", emoji: "🙏", color: "bg-emerald-600", consequence: "1-season ban, Heat -40, Integrity +12",
          apply: s => { s.matchFixBanned = 1; heat(s, -40); s.integrityBonus += 12; s.popularity = clamp(s.popularity - 14, 0, 100); setFlag(s, "refArc", 4); s.events = [...s.events, "🙏 Confessed before the story ran. A season lost, a conscience returned"]; return s; } },
      ] });
  }

  /* ══ ARC 3: Buying the Ballon d'Or. Peak hubris. ══ */
  if (state.overall >= 88 && (state.bdorSnubFuel === true || (state.awards || []).length >= 2) && flag(state, "voteArc") === 0 && state.netWorth >= 15) {
    push({ id: 310, emoji: "🗳️", title: "The Vote Broker",
      description: "A very well-dressed woman explains, over a coffee you did not order, that eleven Ballon d'Or voters are 'reachable'. She does not say bribe. She says 'relationship management'. The fee is €12M.",
      category: "negative", choices: [
        { label: "Buy the votes: €12M", emoji: "🏅", color: "bg-red-700", consequence: "Heat +40, but the trophy is basically ordered",
          apply: s => { s.netWorth = Math.round((s.netWorth - 12) * 100) / 100; heat(s, 40); s.integrityBonus -= 35; setFlag(s, "voteArc", 1); s.events = [...s.events, "🏅 Twelve million on 'relationship management'. If it works, nobody will ever know. If it does not, everybody will"]; return s; } },
        { label: "Refuse. Win it properly or not at all", emoji: "🦁", color: "bg-emerald-600", consequence: "Integrity +18, Morale +8, the hunger sharpens",
          apply: s => { setFlag(s, "voteArc", -1); s.integrityBonus += 18; s.morale = clamp(s.morale + 8, 0, 100); s.statBoostNextSeason = { ...s.statBoostNextSeason, shooting: (s.statBoostNextSeason.shooting || 0) + 1 }; s.events = [...s.events, "🦁 Told the broker you would rather lose it clean. Then went and had the season of your life"]; return s; } },
      ] });
  }

  if (flag(state, "voteArc") === 1 && Math.random() < 0.45) {
    push({ id: 311, emoji: "📰", title: "The Vote Broker Kept Receipts",
      description: "She is under investigation, and she is not the loyal type. Eleven voters have been suspended. Journalists have your bank transfer, labelled, humiliatingly, 'brand consultancy'.",
      category: "negative", choices: [
        { label: "Fight it: €5M in legal fees", emoji: "⚖️", color: "bg-blue-600", consequence: "50/50: cleared and Heat -25, or convicted and stripped of an award",
          apply: s => { s.netWorth = Math.round((s.netWorth - 5) * 100) / 100; if (Math.random() < 0.5) { heat(s, -25); s.events = [...s.events, "⚖️ Cleared on a technicality nobody understood. Your lawyers earned every cent"]; } else { s.awards = s.awards.slice(0, Math.max(0, s.awards.length - 1)); heat(s, 15); s.popularity = clamp(s.popularity - 20, 0, 100); s.events = [...s.events, "⚖️ Convicted of vote buying. An award was stripped and the asterisk is permanent"]; } setFlag(s, "voteArc", 2); return s; } },
        { label: "Admit it and hand the trophy back", emoji: "🕊️", color: "bg-emerald-600", consequence: "Lose an award, Heat -50, Integrity +15. Strangely, respect grows",
          apply: s => { s.awards = s.awards.slice(0, Math.max(0, s.awards.length - 1)); heat(s, -50); s.integrityBonus += 15; s.popularity = clamp(s.popularity - 8, 0, 100); s.morale = clamp(s.morale + 6, 0, 100); setFlag(s, "voteArc", 3); s.events = [...s.events, "🕊️ Gave the trophy back yourself, on camera, no lawyer. Half the world hated it. The other half never forgot it"]; return s; } },
      ] });
  }

  /* ══ ARC 4: Laundering, the boring crime that actually gets people. ══ */
  if (dm >= 2 && flag(state, "washArc") === 0) {
    push({ id: 315, emoji: "🧺", title: "The Money Has Nowhere To Live",
      description: `You are sitting on €${dm.toFixed(1)}M that cannot be explained to anyone with a badge. Your accountant has started using the phrase "hypothetically speaking" a lot.`,
      category: "negative", choices: [
        { label: "Buy a cash business to wash it through", emoji: "🧼", color: "bg-red-600", consequence: "Heat +12 now, but the shady shop unlocks proper laundering",
          apply: s => { setFlag(s, "washArc", 1); heat(s, 12); s.events = [...s.events, "🧼 Bought into cash businesses. The car wash does remarkable numbers for a street with no traffic"]; return s; } },
        { label: "Declare it all and pay the tax", emoji: "🧾", color: "bg-emerald-600", consequence: "Lose 55% to tax and penalties, Heat drops hard, Integrity +12",
          apply: s => { const keep = Math.round((s.dirtyMoney ?? 0) * 0.45 * 100) / 100; s.netWorth = Math.round((s.netWorth + keep) * 100) / 100; s.dirtyMoney = 0; heat(s, -35); s.integrityBonus += 12; setFlag(s, "washArc", 2); s.events = [...s.events, `🧾 Declared everything. The taxman took over half and gave back something better: sleep`]; return s; } },
        { label: "Bury it in a wall and forget about it", emoji: "🧱", color: "bg-muted", consequence: "Heat +5. It is still there. It is always still there",
          apply: s => { heat(s, 5); s.events = [...s.events, "🧱 The money lives in a wall now. You think about that wall every single day"]; return s; } },
      ] });
  }

  /* ══ ARC 5: The whistleblower teammate. Loyalty under pressure. ══ */
  if (h >= 45 && flag(state, "snitchArc") === 0 && pro >= 4) {
    push({ id: 320, emoji: "👀", title: "Someone In The Dressing Room Knows",
      description: "A teammate corners you in the ice bath room. He has seen the courier. He has seen the bags. He has a mortgage, a bad knee, and an offer from a newspaper.",
      category: "negative", choices: [
        { label: "Pay him €2M to forget", emoji: "🤐", color: "bg-red-600", consequence: "Heat +15 and now two people can ruin you",
          apply: s => { s.netWorth = Math.round((s.netWorth - 2) * 100) / 100; heat(s, 15); setFlag(s, "snitchArc", 1); s.events = [...s.events, "🤐 Paid a teammate €2M for silence. He bought a boat. The boat is called 'Nice Try'"]; return s; } },
        { label: "Bring him in on the whole thing", emoji: "🤝", color: "bg-red-700", consequence: "Heat +25, but income doubles while it lasts",
          apply: s => { dirty(s, 2); heat(s, 25); setFlag(s, "snitchArc", 2); s.events = [...s.events, "🤝 Brought him in. Two players, one scheme, zero exit plan"]; return s; } },
        { label: "Stop everything, right now", emoji: "🛑", color: "bg-emerald-600", consequence: "Heat -30, all dirty income ends, Integrity +14",
          apply: s => { heat(s, -30); setFlag(s, "syndicate", 7); s.integrityBonus += 14; s.morale = clamp(s.morale + 10, 0, 100); setFlag(s, "snitchArc", 3); s.events = [...s.events, "🛑 A teammate looked you in the eye and you quit the whole thing that night"]; return s; } },
      ] });
  }

  /* ══ ARC 6: The tax amnesty window. A real out, at a real price. ══ */
  if (h >= 55 && flag(state, "amnesty") === 0) {
    push({ id: 325, emoji: "🪟", title: "The Amnesty Window",
      description: "The government opens a 90-day amnesty: declare everything, pay a flat 40%, walk away with no charges. Your lawyer calls it the best deal you will ever be offered. Your accountant calls it a robbery. Both are right.",
      category: "life", choices: [
        { label: "Take the amnesty", emoji: "🕊️", color: "bg-emerald-600", consequence: "Pay 40% of everything hidden, Heat drops to almost nothing",
          apply: s => { const hidden = (s.dirtyMoney ?? 0); const fee = Math.round((hidden * 0.4 + s.netWorth * 0.05) * 100) / 100; s.netWorth = Math.round((s.netWorth + hidden * 0.6 - s.netWorth * 0.05) * 100) / 100; s.dirtyMoney = 0; s.corruptionHeat = 5; s.integrityBonus += 8; setFlag(s, "amnesty", 1); s.events = [...s.events, `🕊️ Took the amnesty. €${fee.toFixed(1)}M gone, the folder closed, the phone silent for the first time in years`]; return s; } },
        { label: "Ignore it. They have nothing", emoji: "😎", color: "bg-red-600", consequence: "Heat +10, and prosecutors take the refusal personally",
          apply: s => { heat(s, 10); setFlag(s, "amnesty", 2); s.events = [...s.events, "😎 Skipped the amnesty. The lead investigator pinned your photo to a board. An actual board"]; return s; } },
      ] });
  }

  /* ══ Standalone temptations, repeatable and situational ══ */
  if (state.popularity >= 45 && state.netWorth >= 2) {
    push({ id: 330, emoji: "🏗️", title: "The Developer's Envelope",
      description: "A property developer wants your face on a project that has not passed a single environmental review. The fee is enormous, the paperwork is not.",
      category: "negative", choices: [
        { label: "Sign it: €4M", emoji: "✍️", color: "bg-red-600", consequence: "€4M dirty, Heat +14, Popularity -6 when locals find out",
          apply: s => { dirty(s, 4); heat(s, 14); s.popularity = clamp(s.popularity - 6, 0, 100); s.integrityBonus -= 8; s.events = [...s.events, "✍️ Fronted a development that flattened a park. The billboards were beautiful"]; return s; } },
        { label: "Read the paperwork and refuse", emoji: "🌳", color: "bg-emerald-600", consequence: "Integrity +8, Popularity +4 with the neighbourhood",
          apply: s => { s.integrityBonus += 8; s.popularity = clamp(s.popularity + 4, 0, 100); s.events = [...s.events, "🌳 Turned down the development. The park still has your name on a bench now"]; return s; } },
      ] });
  }

  if (state.socialMediaFollowers >= 3) {
    push({ id: 331, emoji: "📉", title: "The Pump And Dump",
      description: "A crypto outfit will pay €2M for one post. The token launches Friday. Their own slide deck has a section titled 'exit liquidity' and it appears to mean your fans.",
      category: "negative", choices: [
        { label: "Post it: €2M", emoji: "📲", color: "bg-red-600", consequence: "€2M dirty, Heat +16, Popularity -12 when it collapses",
          apply: s => { dirty(s, 2); heat(s, 16); s.popularity = clamp(s.popularity - 12, 0, 100); s.integrityBonus -= 12; s.events = [...s.events, "📲 Posted the token. It went to zero in nine days. The replies are a crime scene"]; return s; } },
        { label: "Screenshot the deck and expose them", emoji: "🔍", color: "bg-emerald-600", consequence: "Followers +1.5M, Integrity +12, one very angry startup",
          apply: s => { s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1.5) * 100) / 100; s.integrityBonus += 12; s.popularity = clamp(s.popularity + 5, 0, 100); s.events = [...s.events, "🔍 Posted their own slide deck instead. The internet ate them alive and thanked you"]; return s; } },
      ] });
  }

  if (state.currentClubTier <= 2 && state.age >= 24) {
    push({ id: 332, emoji: "🤲", title: "The Transfer Kickback",
      description: "Your agent explains that a club will pay you a private 'signing consideration' on top of the official deal, routed through a company in a country you cannot pronounce.",
      category: "negative", choices: [
        { label: "Take the kickback, €3M off the books", emoji: "💼", color: "bg-red-600", consequence: "€3M dirty, Heat +18",
          apply: s => { dirty(s, 3); heat(s, 18); s.integrityBonus -= 10; s.events = [...s.events, "💼 Took a €3M kickback through a company registered above a bakery"]; return s; } },
        { label: "Everything on the official contract", emoji: "📃", color: "bg-emerald-600", consequence: "Wage +8% permanently, Integrity +10",
          apply: s => { s.weeklyWage = Math.round(s.weeklyWage * 1.08); s.integrityBonus += 10; s.events = [...s.events, "📃 Insisted every euro went on the official contract. Your accountant framed it"]; return s; } },
      ] });
  }

  if (isAttacker && state.overall >= 80 && Math.random() < 0.5) {
    push({ id: 333, emoji: "🥅", title: "Golden Boot Arithmetic",
      description: "You are one goal behind the Golden Boot with a match left. A rival captain suggests, delicately, that his defenders could have an off day if a certain favour is returned next season.",
      category: "negative", choices: [
        { label: "Take the deal", emoji: "🤝", color: "bg-red-600", consequence: "+4 goals this season, Heat +20, a favour owed you cannot refuse",
          apply: s => { const last = s.seasons[s.seasons.length - 1]; if (last) { last.goals += 4; } heat(s, 20); s.integrityBonus -= 15; setFlag(s, "owedFavour", 1); s.events = [...s.events, "🤝 Four gifted goals and a Golden Boot with an invisible asterisk"]; return s; } },
        { label: "Win it or lose it for real", emoji: "⚽", color: "bg-emerald-600", consequence: "Integrity +10, Morale +6",
          apply: s => { s.integrityBonus += 10; s.morale = clamp(s.morale + 6, 0, 100); s.events = [...s.events, "⚽ Refused the arrangement. Missed the Golden Boot by one and slept fine"]; return s; } },
      ] });
  }

  if (flag(state, "owedFavour") === 1 && Math.random() < 0.6) {
    push({ id: 334, emoji: "🧾", title: "The Favour Comes Due",
      description: "The rival captain is on the phone. His team needs a point to survive. He is not asking, exactly. He is reminding.",
      category: "negative", choices: [
        { label: "Pay the favour back on the pitch", emoji: "😶", color: "bg-red-600", consequence: "Heat +22, Morale -10, debt cleared",
          apply: s => { heat(s, 22); s.morale = clamp(s.morale - 10, 0, 100); s.integrityBonus -= 12; setFlag(s, "owedFavour", 2); s.events = [...s.events, "😶 Played the worst 90 minutes of your life on purpose. Nobody could prove a thing"]; return s; } },
        { label: "Refuse and dare him to talk", emoji: "🎯", color: "bg-blue-600", consequence: "He leaks the Golden Boot deal: Popularity -15, Heat +12, debt gone",
          apply: s => { heat(s, 12); s.popularity = clamp(s.popularity - 15, 0, 100); setFlag(s, "owedFavour", 3); s.events = [...s.events, "🎯 Told him to do his worst. He did. The asterisk became a headline"]; return s; } },
      ] });
  }

  if (state.netWorth >= 30 && state.age >= 28) {
    push({ id: 335, emoji: "🛥️", title: "The Sanctioned Sponsor",
      description: "An enormous offer lands from a sponsor whose owner is on three sanctions lists. Legal says technically possible. Everyone else says absolutely not.",
      category: "negative", choices: [
        { label: "Sign: €18M over three years", emoji: "🖊️", color: "bg-red-700", consequence: "€18M dirty, Heat +30, Popularity -20",
          apply: s => { dirty(s, 18); heat(s, 30); s.popularity = clamp(s.popularity - 20, 0, 100); s.integrityBonus -= 20; s.events = [...s.events, "🖊️ Signed with a sanctioned sponsor. The money cleared. So did most of your goodwill"]; return s; } },
        { label: "Decline publicly", emoji: "📢", color: "bg-emerald-600", consequence: "Popularity +12, Integrity +15, a cleaner sponsor calls next week",
          apply: s => { s.popularity = clamp(s.popularity + 12, 0, 100); s.integrityBonus += 15; s.sponsorshipIncome = Math.round((s.sponsorshipIncome + 1) * 100) / 100; s.events = [...s.events, "📢 Turned down the sanctioned money out loud. A clean brand doubled its offer within a week"]; return s; } },
      ] });
  }

  if (h >= 30 && h < 70) {
    push({ id: 336, emoji: "🕵️", title: "The Journalist Is Very Good",
      description: "She has your car wash revenue figures, your nightclub's license history, and a printout of a transfer you thought was invisible. She would like a comment. She is being polite about it.",
      category: "negative", choices: [
        { label: "Offer her an exclusive on something else", emoji: "🎤", color: "bg-blue-600", consequence: "Heat -12, she runs a puff piece instead. This time",
          apply: s => { heat(s, -12); s.popularity = clamp(s.popularity + 3, 0, 100); s.events = [...s.events, "🎤 Traded a soft exclusive for a hard story spiked. Journalism"]; return s; } },
        { label: "Threaten her with lawyers", emoji: "📨", color: "bg-red-600", consequence: "Heat +18, she publishes the letter itself",
          apply: s => { heat(s, 18); s.popularity = clamp(s.popularity - 10, 0, 100); s.events = [...s.events, "📨 Sent legal threats. She printed the letter in full above the story. It went enormous"]; return s; } },
        { label: "Tell her the truth, all of it", emoji: "🫱", color: "bg-emerald-600", consequence: "Popularity -12 now, but Heat halves and Integrity +18",
          apply: s => { s.corruptionHeat = Math.round((s.corruptionHeat ?? 0) / 2); s.popularity = clamp(s.popularity - 12, 0, 100); s.integrityBonus += 18; s.morale = clamp(s.morale + 8, 0, 100); s.events = [...s.events, "🫱 Sat down and told a journalist everything. It was the worst week and the best decision"]; return s; } },
      ] });
  }

  if ((state.prisonSeasons ?? 0) === 0 && state.seasons.some(s => s.club === "PRISON") && flag(state, "afterPrison") === 0) {
    push({ id: 340, emoji: "🚪", title: "Out",
      description: "You are out. Your body is behind, your name is mud, and exactly one club has called. They are three divisions below where you left off, and the manager says the fans voted on it.",
      category: "life", choices: [
        { label: "Take it. Rebuild from the bottom", emoji: "🧱", color: "bg-emerald-600", consequence: "Morale +15, Physical +3 next season, the comeback arc begins",
          apply: s => { setFlag(s, "afterPrison", 1); s.morale = clamp(s.morale + 15, 0, 100); s.statBoostNextSeason = { ...s.statBoostNextSeason, physical: (s.statBoostNextSeason.physical || 0) + 3 }; s.integrityBonus += 10; s.events = [...s.events, "🧱 Signed for a club whose fans voted you in. You have never trained harder in your life"]; return s; } },
        { label: "Go back to the people who put you inside", emoji: "🕳️", color: "bg-red-700", consequence: "€6M dirty immediately, Heat +30. You learned nothing",
          apply: s => { setFlag(s, "afterPrison", 2); dirty(s, 6); heat(s, 30); s.integrityBonus -= 20; s.events = [...s.events, "🕳️ Straight back to the grey suit. He said he knew you would call"]; return s; } },
      ] });
  }

  if (state.integrityBonus >= 40 && state.overall >= 82) {
    push({ id: 345, emoji: "🎖️", title: "The Clean Hands Award",
      description: "A players' union wants to give you an integrity award and put your face on an anti-corruption campaign shown in every academy in the country.",
      category: "life", choices: [
        { label: "Accept and film the campaign", emoji: "🎬", color: "bg-emerald-600", consequence: "Popularity +12, followers +1M, Integrity +10",
          apply: s => { s.popularity = clamp(s.popularity + 12, 0, 100); s.socialMediaFollowers = Math.round((s.socialMediaFollowers + 1) * 100) / 100; s.integrityBonus += 10; s.events = [...s.events, "🎬 Became the face of the anti-corruption campaign. Somewhere, a grey suit turned off the television"]; return s; } },
        { label: "Decline: awards for basic decency feel odd", emoji: "🙃", color: "bg-blue-600", consequence: "Morale +6, quiet respect from the dressing room",
          apply: s => { s.morale = clamp(s.morale + 6, 0, 100); s.integrityBonus += 4; s.events = [...s.events, "🙃 Politely declined an award for not being a criminal. The squad respected it enormously"]; return s; } },
      ] });
  }

  return events;
}

/** Ids in the corruption band, used by the caller for de-duplication. */
export const CORRUPTION_ID_MIN = 300;
export const CORRUPTION_ID_MAX = 349;
