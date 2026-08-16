/* ==========================================================================
   nbaCareerLifeB.ts, offseason deck B for NBA My Career (Round 57)
   Owner brief: everything a full life sim does, ten times better and more
   out of pocket. This file is 45 offseason decisions across family and home,
   legacy and records, rivalries, clean business, offseason life, genuinely
   unhinged basketball stuff, and the contract forks that decide how a
   career actually ends.

   Contract with the caller: every event gates itself, so drawNbaEvent can
   just concat this deck in with no extra eligibility rules. Every apply
   MUTATES the state and RETURNS the past tense log line the player reads
   after choosing. Ids are all prefixed nbaB_ so they never collide with the
   base deck.

   Import rule, learned the hard way: nbaMyCareer.ts imports this file, so
   the two modules are circular. NOTHING imported here may be touched at
   module scope. nbaTeamLabelOf is only ever called inside a function body.
   ========================================================================== */
import type { NbaCareerState, NbaCareerEvent } from './nbaMyCareer';
import { nbaTeamLabelOf } from './nbaMyCareer';

// Round 57 expanded the three position buckets into five. These keep the
// original guard / wing / big flavour working across PG, SG, SF, PF and C.
const isGuard = (c: NbaCareerState): boolean => c.pos === 'PG' || c.pos === 'SG';
const isWing = (c: NbaCareerState): boolean => c.pos === 'SF' || c.pos === 'PF';

/* Round 57 money and flag fields ride on the save object. Old saves predate
   them and the engine interface has not caught up yet, so every read goes
   through this local view with a default and every write guards. */
type LifeState = NbaCareerState & {
  netWorth?: number;
  dirtyMoney?: number;
  heat?: number;
  purchased?: string[];
  lifeFlags?: Record<string, number>;
};
const L = (c: NbaCareerState): LifeState => c as LifeState;

const clamp = (v: number): number => Math.max(0, Math.min(100, v));
const money = (x: number): number => Math.round(x * 10) / 10;

const flag = (c: NbaCareerState, k: string): number => (L(c).lifeFlags || {})[k] || 0;
const setFlag = (c: NbaCareerState, k: string, v: number) => { L(c).lifeFlags = { ...(L(c).lifeFlags || {}), [k]: v }; };

/** Net worth, seeded from career earnings the first time a save touches it. */
const wealth = (c: NbaCareerState): number => L(c).netWorth ?? money(c.earnings * 0.45);
const spend = (c: NbaCareerState, amount: number) => { L(c).netWorth = money(wealth(c) - amount); };
const bank = (c: NbaCareerState, amount: number) => { L(c).netWorth = money(wealth(c) + amount); };
/** Money that hits the career earnings line AND the bank account. */
const earn = (c: NbaCareerState, amount: number) => { c.earnings = money(c.earnings + amount); bank(c, amount); };
const addHeat = (c: NbaCareerState, d: number) => { L(c).heat = clamp((L(c).heat ?? 0) + d); };
const own = (c: NbaCareerState, item: string) => { L(c).purchased = [...(L(c).purchased || []), item]; };

const bumpMorale = (c: NbaCareerState, d: number) => { c.morale = clamp(c.morale + d); };
const bumpFan = (c: NbaCareerState, d: number) => { c.fanbase = clamp(c.fanbase + d); };
const bumpHealth = (c: NbaCareerState, d: number) => { c.health = clamp(c.health + d); };
const bumpOvr = (c: NbaCareerState, d: number) => { c.ovr = Math.min(c.pot + 1, c.ovr + d); };

/* Local abbreviation list so this file imports nothing but types and one
   pure label helper. Plain string literals only, safe at module scope. */
const NBA_ABBRS = [
  'ATL', 'BKN', 'BOS', 'CHA', 'CHI', 'CLE', 'DAL', 'DEN', 'DET', 'GSW',
  'HOU', 'IND', 'LAC', 'LAL', 'MEM', 'MIA', 'MIL', 'MIN', 'NOP', 'NYK',
  'OKC', 'ORL', 'PHI', 'PHX', 'POR', 'SAC', 'SAS', 'TOR', 'UTA', 'WAS',
];
const otherTeam = (c: NbaCareerState, r: () => number): string => {
  const pool = NBA_ABBRS.filter(a => a !== c.team);
  return pool[Math.floor(r() * pool.length)];
};

export function getNbaLifeEventsB(c: NbaCareerState, rng: () => number): NbaCareerEvent[] {
  const deck: NbaCareerEvent[] = [];
  const yrs = c.seasons.length;
  const last = c.seasons[yrs - 1];
  const nw = wealth(c);
  const prevTeam = [...c.seasons].reverse().find(s => s.team !== c.team)?.team ?? '';
  const teamPts = c.seasons.filter(s => s.team === c.team).reduce((n, s) => n + s.ppg * s.games, 0);
  const careerPts = c.seasons.reduce((n, s) => n + s.ppg * s.games, 0);

  /* ══════════ 1. FAMILY AND HOME ══════════ */

  if (yrs >= 1 && c.age >= 23 && flag(c, 'nb_newborn') < 2) {
    deck.push({
      id: 'nbaB_newborn',
      title: 'The due date is a five game road trip',
      body: 'Your first kid is due in the middle of a west coast swing, two time zones from the hospital. The doctor keeps repeating that babies do not read the schedule.',
      options: [
        {
          label: 'Leave at halftime, plane is running', effect: 'Miss a game, be there',
          apply: (cc) => {
            setFlag(cc, 'nb_newborn', flag(cc, 'nb_newborn') + 1);
            spend(cc, 0.25); bumpMorale(cc, 14); bumpFan(cc, -4); bumpHealth(cc, 2);
            return 'You had 18 at the half, a shower at 9:40 and a hospital wristband by 1am. 0.25M on the charter, one game missed. Morale +14, fanbase -4.';
          },
        },
        {
          label: 'Play both nights, fly at 2am', effect: 'Both, barely',
          apply: (cc) => {
            setFlag(cc, 'nb_newborn', flag(cc, 'nb_newborn') + 1);
            spend(cc, 0.4); bumpFan(cc, 8); bumpMorale(cc, 5); bumpHealth(cc, -3);
            return 'A back to back, a 2am wheels up and 0.4M in flights. You made hour two of a very long day. Fanbase +8, morale +5, health -3.';
          },
        },
        {
          label: 'Move the whole family to the road hotel', effect: 'Expensive togetherness',
          apply: (cc) => {
            setFlag(cc, 'nb_newborn', flag(cc, 'nb_newborn') + 1);
            spend(cc, 0.75); bumpMorale(cc, 10); bumpHealth(cc, -4);
            return '0.75M of connecting suites, a rented crib in three cities and zero sleep. Morale +10, health -4, and the team manifest now lists a car seat.';
          },
        },
      ],
    });
  }

  if (yrs >= 2 && c.age >= 25 && flag(c, 'nb_partnerCity') === 0) {
    deck.push({
      id: 'nbaB_partnerCity',
      title: 'They got the job',
      body: 'Your partner just landed the role they have chased since college. It is 1,800 miles away, in a city with a different arena in it.',
      options: [
        {
          label: 'Ask the front office to move you there', effect: 'Trade toward them',
          apply: (cc, r) => {
            setFlag(cc, 'nb_partnerCity', 1);
            const nt = otherTeam(cc, r); cc.team = nt; cc.fanbase = 42; bumpMorale(cc, 12);
            return `You asked, and the deal got done in July. ${nbaTeamLabelOf(nt)}, same zip code as their office. Fanbase reset to 42, morale +12.`;
          },
        },
        {
          label: 'Do the long distance thing', effect: 'Flights and FaceTime',
          apply: (cc) => {
            setFlag(cc, 'nb_partnerCity', 2); spend(cc, 0.6); bumpMorale(cc, -6);
            return 'Eight months of off day flights and 0.6M in charters. You kept your locker and lost every Tuesday. Morale -6.';
          },
        },
        {
          label: 'They pause it for a season', effect: 'Stability, quiet debt',
          apply: (cc) => {
            setFlag(cc, 'nb_partnerCity', 3); setFlag(cc, 'nb_owedOne', 1); bumpMorale(cc, 4);
            return 'They deferred the job for a year. Morale +4, and a favor went on the books that neither of you will ever forget.';
          },
        },
      ],
    });
  }

  if (yrs >= 2 && c.age >= 24 && flag(c, 'nb_sibAgent') === 0) {
    deck.push({
      id: 'nbaB_siblingManager',
      title: 'Your brother has business cards now',
      body: 'They say MANAGER in a font he picked himself. He has already told two sneaker brands that he speaks for you.',
      options: [
        {
          label: 'Hire him, full trust', effect: 'Family on payroll',
          apply: (cc, r) => {
            setFlag(cc, 'nb_sibAgent', 1);
            if (r() < 0.45) { earn(cc, 1.4); bumpMorale(cc, 9); return 'It turns out he is genuinely good at this. 1.4M in deals closed in eleven months. Morale +9.'; }
            spend(cc, 0.9); addHeat(cc, 4); bumpMorale(cc, -6);
            return 'He spent 0.9M on a rebrand nobody asked for and an accountant you have never met. Morale -6, and Thanksgiving is going to be quiet.';
          },
        },
        {
          label: 'Real job, under your real agency', effect: 'Supervised, safer',
          apply: (cc) => {
            setFlag(cc, 'nb_sibAgent', 2); spend(cc, 0.3); bumpMorale(cc, 7);
            return 'He runs your marketing under the agency for 0.3M a year. He is thriving and nobody can lose your money. Morale +7.';
          },
        },
        {
          label: 'Say no, buy him a truck', effect: 'A no with a bow',
          apply: (cc) => {
            setFlag(cc, 'nb_sibAgent', 3); spend(cc, 0.09); bumpMorale(cc, -3);
            return 'You said no and handed him the keys to a 90k truck. He is still mad. He drives it every single day. Morale -3.';
          },
        },
      ],
    });
  }

  if (yrs >= 3 && flag(c, 'nb_parentHome') === 0) {
    deck.push({
      id: 'nbaB_parentCloser',
      title: 'She keeps saying the word closer',
      body: 'Your mom has never asked you for a car, a bag or a dollar. She has asked, on every call for three months, if you could be closer.',
      options: [
        {
          label: 'Push for a team near home', effect: 'Trade toward home',
          apply: (cc, r) => {
            setFlag(cc, 'nb_parentHome', 1);
            const nt = otherTeam(cc, r); cc.team = nt; cc.fanbase = 44; bumpMorale(cc, 12);
            return `You told your agent home was the whole list and landed with ${nbaTeamLabelOf(nt)}. Fanbase reset to 44, morale +12.`;
          },
        },
        {
          label: 'Fly her out for all 41 home games', effect: 'Miles, not moving',
          apply: (cc) => {
            setFlag(cc, 'nb_parentHome', 2); spend(cc, 0.4); bumpMorale(cc, 8); bumpFan(cc, 3);
            return '41 home games, 41 first class round trips, 0.4M a year. She knows every usher by first name now. Morale +8, fanbase +3.';
          },
        },
        {
          label: 'Buy a place ten minutes from her', effect: 'Offseason zip code',
          apply: (cc) => {
            setFlag(cc, 'nb_parentHome', 3); spend(cc, 1.6); own(cc, 'Offseason house near mom'); bumpMorale(cc, 9);
            return 'A 1.6M house eleven minutes from her front door. Every July you eat dinner there on a Tuesday. Morale +9.';
          },
        },
      ],
    });
  }

  if (yrs >= 1 && c.fanbase >= 35 && flag(c, 'nb_leak') === 0) {
    deck.push({
      id: 'nbaB_groupChatLeak',
      title: 'The family group chat leaked',
      body: 'A cousin screenshotted it. Your review of the head coach, that his out of bounds plays were drawn by a man who has only ever heard basketball described to him, is now a trending audio.',
      options: [
        {
          label: 'Own every word on camera', effect: 'Fame up, coach cold',
          apply: (cc) => {
            setFlag(cc, 'nb_leak', 1); bumpFan(cc, 12); bumpMorale(cc, -6);
            return 'You said it, you meant it, and then you said it again into a microphone. Fanbase +12, morale -6, and you did not touch the ball in the first quarter of the opener.';
          },
        },
        {
          label: 'Claim the phone was hacked', effect: 'Nobody believes you',
          apply: (cc) => {
            setFlag(cc, 'nb_leak', 2); bumpFan(cc, -5); addHeat(cc, 6); bumpMorale(cc, 3);
            return 'You blamed a hacker. Nobody bought it, including the cousin, who was in the chat. Fanbase -5, morale +3.';
          },
        },
        {
          label: 'Apologize to him privately and eat it', effect: 'Quiet repair',
          apply: (cc) => {
            setFlag(cc, 'nb_leak', 3); bumpMorale(cc, 7); bumpFan(cc, -3); bumpOvr(cc, 1);
            return 'One closed office, one real apology, and now you help draw the after timeout stuff. Rating +1, morale +7, fanbase -3.';
          },
        },
      ],
    });
  }

  if ((nw >= 3 || c.earnings >= 12) && flag(c, 'nb_house') === 0) {
    deck.push({
      id: 'nbaB_houseForSomeone',
      title: 'Somebody never pays rent again',
      body: 'The money is there to buy a person a house outright, in cash, this week. The candidate list turned out to be longer than you expected.',
      options: [
        {
          label: 'Buy your mother the house', effect: 'The big one',
          apply: (cc) => {
            setFlag(cc, 'nb_house', 1); spend(cc, 2.2); own(cc, 'House for mom'); bumpMorale(cc, 14); bumpFan(cc, 8);
            return 'A 2.2M house and a set of keys in a gas station gift bag. She cried in the driveway for eleven minutes. Morale +14, fanbase +8.';
          },
        },
        {
          label: 'Modest place, invest the rest for her', effect: 'Boring and correct',
          apply: (cc) => {
            setFlag(cc, 'nb_house', 2); spend(cc, 0.9); own(cc, 'Paid off family home'); bumpMorale(cc, 8);
            return 'A 0.9M house with no mortgage and a fund that pays her monthly whether basketball keeps working or not. Morale +8.';
          },
        },
        {
          label: 'Four houses, one per sibling', effect: 'Whole family housed',
          apply: (cc) => {
            setFlag(cc, 'nb_house', 3); spend(cc, 5.4); own(cc, 'Four family homes'); bumpMorale(cc, 18); bumpFan(cc, 10);
            return '5.4M gone in one afternoon of closings. Every sibling has an address now. Morale +18, fanbase +10, net worth considerably lighter.';
          },
        },
      ],
    });
  }

  if (yrs >= 2 && c.age >= 24 && flag(c, 'nb_houseguests') === 0) {
    deck.push({
      id: 'nbaB_summerHouseguests',
      title: 'Thirty one relatives, one guest house',
      body: 'They all want to spend July at your place. Someone has already asked whether the theater room locks from the inside.',
      options: [
        {
          label: 'Let all of them stay', effect: 'Chaos, love, cost',
          apply: (cc) => {
            setFlag(cc, 'nb_houseguests', 1); spend(cc, 0.3); bumpMorale(cc, 11); bumpHealth(cc, -4);
            return '0.3M of groceries, air mattresses and one cracked banister. Best month of your year, worst month of your jump shot. Morale +11, health -4.';
          },
        },
        {
          label: 'Rent them condos, host one big dinner', effect: 'Boundaries with a menu',
          apply: (cc) => {
            setFlag(cc, 'nb_houseguests', 2); spend(cc, 0.16); bumpMorale(cc, 6);
            return '0.16M on a block of condos and one enormous Sunday dinner. Two aunts will bring this up for a decade. Morale +6.';
          },
        },
        {
          label: 'Say no, live in the gym', effect: 'Reps over relatives',
          apply: (cc) => {
            setFlag(cc, 'nb_houseguests', 3); bumpOvr(cc, 1); bumpMorale(cc, -6);
            return 'Nine hundred shots a day, alone, in a cold gym. Rating +1, morale -6, and four voicemails you still have not returned.';
          },
        },
      ],
    });
  }

  /* ══════════ 2. LEGACY AND RECORDS ══════════ */

  if (yrs >= 4 && teamPts >= 6000 && c.ovr >= 76 && flag(c, 'nb_record') === 0) {
    deck.push({
      id: 'nbaB_franchiseRecord',
      title: '38 points from the franchise record',
      body: `The ${nbaTeamLabelOf(c.team)} all time scoring record is one good night away, and the seed is already locked. Game 82 means nothing to anybody in the building except you.`,
      options: [
        {
          label: 'Play all 48 if that is what it takes', effect: 'Record, real risk',
          apply: (cc, r) => {
            setFlag(cc, 'nb_record', 1); bumpFan(cc, 12); bumpMorale(cc, 6); bumpHealth(cc, -5);
            if (r() < 0.25) { bumpHealth(cc, -9); return 'You got it with four minutes left and your ankle got a vote in the same possession. Fanbase +12, health -14.'; }
            return 'Franchise record, 41 minutes, none of it necessary. Fanbase +12, morale +6, health -5.';
          },
        },
        {
          label: 'Sit. April is the only point.', effect: 'Rest for the run',
          apply: (cc) => {
            setFlag(cc, 'nb_record', 2); bumpHealth(cc, 7); bumpMorale(cc, 4); bumpFan(cc, -5);
            return 'You wore a very expensive sweater and held a towel. Health +7, morale +4, fanbase -5, and one radio host called you allergic to history.';
          },
        },
        {
          label: 'Get it in the first quarter, then sit', effect: 'Greedy but efficient',
          apply: (cc) => {
            setFlag(cc, 'nb_record', 3); bumpFan(cc, 8); bumpMorale(cc, 3); bumpHealth(cc, -2);
            return 'Record broken with 3:12 left in the first, sweater on by the second. Fanbase +8, morale +3, health -2.';
          },
        },
      ],
    });
  }

  if (yrs >= 8 && (c.rings >= 1 || c.allNbas >= 2 || c.fanbase >= 78) && flag(c, 'nb_jersey') === 0) {
    deck.push({
      id: 'nbaB_jerseyRetirement',
      title: 'They want your number in the rafters',
      body: `${nbaTeamLabelOf(c.team)} have three ceremony dates and one very specific request about how long the speech can be.`,
      options: [
        {
          label: 'Halftime, keep it short', effect: 'Rafters, quick',
          apply: (cc) => {
            setFlag(cc, 'nb_jersey', 1); bumpFan(cc, 14); bumpMorale(cc, 8);
            return 'Eleven minutes at halftime and your number goes up forever. Fanbase +14, morale +8.';
          },
        },
        {
          label: 'Home opener, free jerseys for the upper bowl', effect: 'Enormous and expensive',
          apply: (cc) => {
            setFlag(cc, 'nb_jersey', 2); spend(cc, 1.1); bumpFan(cc, 22); bumpMorale(cc, 10);
            return 'You paid 1.1M so 7,000 people in the cheap seats went home wearing your name. Fanbase +22, morale +10.';
          },
        },
        {
          label: 'Ask them to wait until you are done', effect: 'Not yet',
          apply: (cc) => {
            setFlag(cc, 'nb_jersey', 3); bumpMorale(cc, 6); bumpFan(cc, 3); bumpOvr(cc, 1);
            return 'You told them a retired number on an active player feels like a eulogy with a jump shot. Rating +1, morale +6, fanbase +3.';
          },
        },
      ],
    });
  }

  if (yrs >= 9 && c.age >= 31 && flag(c, 'nb_hof') === 0) {
    deck.push({
      id: 'nbaB_hofPush',
      title: 'A firm that specializes in Springfield',
      body: 'They say your case needs narrative support. They have a slide deck about your life with a custom title font and a section called The Forgotten Peak.',
      options: [
        {
          label: 'Hire them, 1.5M', effect: 'Buying the narrative',
          apply: (cc) => {
            setFlag(cc, 'nb_hof', 1); spend(cc, 1.5); bumpFan(cc, 10);
            return '1.5M on three years of documentaries, oral histories and extremely warm feature writing. Fanbase +10, and voters keep bringing up your fourth season.';
          },
        },
        {
          label: 'Let the tape argue', effect: 'Pride, pure',
          apply: (cc) => {
            setFlag(cc, 'nb_hof', 2); bumpMorale(cc, 8);
            return 'You said if the film cannot do it, a press release definitely cannot. Morale +8, and your agent aged four years in that meeting.';
          },
        },
        {
          label: 'Call twelve voters yourself', effect: 'Awkward, effective',
          apply: (cc) => {
            setFlag(cc, 'nb_hof', 3); bumpFan(cc, 6); bumpMorale(cc, -4);
            return 'Eleven pleasant conversations and one voter who posted the voicemail. Fanbase +6, morale -4.';
          },
        },
      ],
    });
  }

  if (yrs >= 5 && c.age >= 28 && flag(c, 'nb_heir') === 0) {
    deck.push({
      id: 'nbaB_mentorHeir',
      title: 'They drafted your replacement',
      body: `${nbaTeamLabelOf(c.team)} took your exact position in the lottery. The kid has your rookie card framed in his apartment, which somehow makes it worse.`,
      options: [
        {
          label: 'Teach him everything you know', effect: 'Mentor, lose minutes',
          apply: (cc) => {
            setFlag(cc, 'nb_heir', 1); bumpMorale(cc, 10); bumpFan(cc, 8); bumpHealth(cc, 4);
            return 'You gave him the whole notebook and six minutes a night. Fanbase +8, morale +10, health +4, and he thanked you on live TV.';
          },
        },
        {
          label: 'Freeze him out completely', effect: 'Cold war in the room',
          apply: (cc) => {
            setFlag(cc, 'nb_heir', 2); bumpMorale(cc, -5); bumpFan(cc, -4); bumpOvr(cc, 1);
            return 'You did not say one word to him until February. Rating +1 from playing furious, morale -5, fanbase -4.';
          },
        },
        {
          label: 'Charge him for the summer workouts', effect: 'Billable mentorship',
          apply: (cc) => {
            setFlag(cc, 'nb_heir', 3); earn(cc, 0.15); bumpMorale(cc, 3); bumpFan(cc, 6);
            return 'You invoiced a rookie 150k for August in the gym. He paid it, he got better, and the story made you a legend. Fanbase +6, morale +3.';
          },
        },
      ],
    });
  }

  if (yrs >= 9 && (c.rings >= 1 || c.mvps >= 1) && flag(c, 'nb_statue') === 0) {
    deck.push({
      id: 'nbaB_statueDebate',
      title: 'The statue committee has notes',
      body: 'The city wants bronze outside the arena. The sculptor sent eleven pose options and one of them is you screaming at an official with both arms out.',
      options: [
        {
          label: 'The iconic pose', effect: 'Bronze forever',
          apply: (cc) => {
            setFlag(cc, 'nb_statue', 1); bumpFan(cc, 12); bumpMorale(cc, 6); own(cc, 'Bronze statue');
            return 'Nine feet of you doing the thing everybody remembers. Fanbase +12, morale +6.';
          },
        },
        {
          label: 'The one where you are yelling at the ref', effect: 'Honest bronze',
          apply: (cc) => {
            setFlag(cc, 'nb_statue', 2); spend(cc, 0.05); bumpFan(cc, 18); bumpMorale(cc, 4); own(cc, 'Bronze statue');
            return 'The league fined you 50k for a statue. Fanbase +18, morale +4. Children take photos pointing at an imaginary official.';
          },
        },
        {
          label: 'Skip it, build twelve courts instead', effect: 'Concrete over bronze',
          apply: (cc) => {
            setFlag(cc, 'nb_statue', 3); spend(cc, 1.2); bumpFan(cc, 15); bumpMorale(cc, 12); own(cc, 'Twelve public courts');
            return 'You turned down bronze and wrote 1.2M for twelve courts with real nets. Fanbase +15, morale +12.';
          },
        },
      ],
    });
  }

  if (yrs >= 8 && c.age >= 33 && flag(c, 'nb_tour') === 0) {
    deck.push({
      id: 'nbaB_farewellTour',
      title: 'Announce it, or just go quietly',
      body: 'Say this is the last one and every road arena hands you a framed something at halftime. Say nothing and you get to play basketball without a receiving line.',
      options: [
        {
          label: 'Full farewell tour', effect: 'Gifts and goodbyes',
          apply: (cc) => {
            setFlag(cc, 'nb_tour', 1); earn(cc, 1.2); bumpFan(cc, 16); bumpMorale(cc, 8);
            return '29 tributes, 29 framed jerseys and one team that gave you a canoe. 1.2M in tour merch, fanbase +16, morale +8.';
          },
        },
        {
          label: 'Say nothing, just hoop', effect: 'No circus',
          apply: (cc) => {
            setFlag(cc, 'nb_tour', 2); bumpMorale(cc, 5); bumpOvr(cc, 1);
            return 'No announcement, no rocking chairs, no midcourt ceremonies. Rating +1, morale +5.';
          },
        },
        {
          label: 'Tease it all year for the merch', effect: 'Milking it',
          apply: (cc) => {
            setFlag(cc, 'nb_tour', 3); earn(cc, 2.4); bumpFan(cc, -6); bumpMorale(cc, -2);
            return 'Six months of maybe. 2.4M in merch, fanbase -6, morale -2, and everyone got very tired of the question.';
          },
        },
      ],
    });
  }

  if (yrs >= 8 && careerPts >= 12000 && flag(c, 'nb_milestone') === 0) {
    deck.push({
      id: 'nbaB_pointsMilestone',
      title: 'Eleven points from 20,000',
      body: 'The arena has a ceremony cued up, a gold ball ready and a script for the PA guy. The other team has a rookie who would love to be the trivia answer that stops you.',
      options: [
        {
          label: 'Get it in the first four minutes', effect: 'Milestone, cued up',
          apply: (cc) => {
            setFlag(cc, 'nb_milestone', 1); bumpFan(cc, 11); bumpMorale(cc, 7);
            return 'Three straight pull ups and a stoppage at 8:04 in the first. Fanbase +11, morale +7, and the confetti guy was ready early.';
          },
        },
        {
          label: 'Refuse the ceremony, keep playing', effect: 'No stoppage',
          apply: (cc) => {
            setFlag(cc, 'nb_milestone', 2); bumpMorale(cc, 8); bumpOvr(cc, 1); bumpFan(cc, -4);
            return 'You waved off the ceremony and inbounded the ball. Rating +1, morale +8, fanbase -4, and the PA guy kept the script anyway.';
          },
        },
        {
          label: 'Auction the ball, give away every dollar', effect: 'Milestone with a receipt',
          apply: (cc) => {
            setFlag(cc, 'nb_milestone', 3); bumpFan(cc, 14); bumpMorale(cc, 6);
            return 'The ball went for 0.4M at auction and all of it went to two school districts. Fanbase +14, morale +6.';
          },
        },
      ],
    });
  }

  /* ══════════ 3. RIVALRIES ══════════ */

  if (yrs >= 2 && flag(c, 'nb_nemesis') === 0) {
    const foe = isGuard(c) ? 'a 6 foot 6 guard' : isWing(c) ? 'a wing with 7 foot arms' : 'a center who never leaves his feet';
    deck.push({
      id: 'nbaB_nemesisDefender',
      title: 'He has your number',
      body: `There is ${foe} in your conference who has genuinely solved you. Nine for 31 across the last two meetings, and he smiles the entire time.`,
      options: [
        {
          label: 'Live in his film all summer', effect: 'Rating up, sanity down',
          apply: (cc) => {
            setFlag(cc, 'nb_nemesis', 1); bumpOvr(cc, 1); bumpMorale(cc, -5); bumpHealth(cc, -2);
            return '400 hours of one man guarding you, on a loop, in the dark. Rating +1, morale -5, health -2.';
          },
        },
        {
          label: 'Pay his old college coach to consult', effect: 'Buy the answers',
          apply: (cc) => {
            setFlag(cc, 'nb_nemesis', 2); spend(cc, 0.25); bumpOvr(cc, 1); bumpMorale(cc, 3);
            return '0.25M for a retired coach with eleven pages on how his feet work. Rating +1, morale +3, and the first counter worked in October.';
          },
        },
        {
          label: 'Spend the summer recruiting him', effect: 'Turn him into a teammate',
          apply: (cc, r) => {
            setFlag(cc, 'nb_nemesis', 3);
            if (r() < 0.35) { bumpMorale(cc, 12); bumpFan(cc, 8); return 'He signed. Your worst matchup now guards you in practice and nobody else. Morale +12, fanbase +8.'; }
            bumpMorale(cc, -4); bumpFan(cc, 4);
            return 'He posted the recruiting texts with three crying laughing faces. Fanbase +4, morale -4, and now it is truly personal.';
          },
        },
      ],
    });
  }

  if (yrs >= 3 && last && last.teamResult.startsWith('Lost') && flag(c, 'nb_series') === 0) {
    deck.push({
      id: 'nbaB_playoffPersonal',
      title: 'Game 4 got personal',
      body: 'He said something about your mother at the free throw line and the courtside mic caught most of it. The clip has 40 million views before your flight lands.',
      options: [
        {
          label: 'Answer in Game 5', effect: 'Scoreboard revenge',
          apply: (cc, r) => {
            setFlag(cc, 'nb_series', 1);
            if (r() < 0.6) { bumpFan(cc, 13); bumpMorale(cc, 9); bumpHealth(cc, -4); return '41 points, a stare at the bench and zero words after. Fanbase +13, morale +9, health -4.'; }
            spend(cc, 0.05); bumpFan(cc, 5); bumpMorale(cc, -6);
            return 'Two technicals in the second quarter and a 50k fine for the ejection. Fanbase +5, morale -6.';
          },
        },
        {
          label: 'Shake his hand and say nothing', effect: 'Ice cold class',
          apply: (cc) => {
            setFlag(cc, 'nb_series', 2); bumpMorale(cc, 7); bumpFan(cc, 4); bumpOvr(cc, 1);
            return 'You shook his hand, said nothing and put it in the vault for October. Rating +1, morale +7, fanbase +4.';
          },
        },
        {
          label: 'Take it to the podium', effect: 'Ten minutes of chaos',
          apply: (cc) => {
            setFlag(cc, 'nb_series', 3); bumpFan(cc, 14); addHeat(cc, 5); bumpMorale(cc, -4);
            return 'Ten minutes at the podium, every second of it a clip. Fanbase +14, morale -4, and the league office called your agent twice.';
          },
        },
      ],
    });
  }

  if (yrs >= 3 && prevTeam && flag(c, 'nb_oldFriend') === 0) {
    deck.push({
      id: 'nbaB_formerTeammate',
      title: 'Your old running mate switched sides',
      body: `He signed with a team you see four times a year and then did an interview about how he finally has structure. Everyone knew exactly who that was about.`,
      options: [
        {
          label: 'Full ice, no hugs, no shootaround chat', effect: 'Cold and focused',
          apply: (cc) => {
            setFlag(cc, 'nb_oldFriend', 1); bumpOvr(cc, 1); bumpMorale(cc, 4); bumpFan(cc, 5);
            return 'You walked past him at every handshake line for a full season. Rating +1, morale +4, fanbase +5.';
          },
        },
        {
          label: 'Dinner the night before every meeting', effect: 'Friends first',
          apply: (cc) => {
            setFlag(cc, 'nb_oldFriend', 2); spend(cc, 0.02); bumpMorale(cc, 9); bumpFan(cc, -3);
            return 'Four dinners, 20k in steak, zero grudges. Morale +9, fanbase -3, and two radio hosts questioned your competitive fire.';
          },
        },
        {
          label: 'Post the old photo, no caption', effect: 'Silent shade',
          apply: (cc) => {
            setFlag(cc, 'nb_oldFriend', 3); bumpFan(cc, 10); bumpMorale(cc, -2);
            return 'One photo from your rookie year, zero words, six million views by lunch. Fanbase +10, morale -2.';
          },
        },
      ],
    });
  }

  if (yrs >= 4 && flag(c, 'nb_oldCoach') === 0) {
    deck.push({
      id: 'nbaB_coachWhoBenched',
      title: 'The coach who benched you got a new job',
      body: 'Fourth quarter of a playoff game, he sat you for a veteran who went 3 for 14. He runs a team you see twice a year now and calls you a great kid in every interview.',
      options: [
        {
          label: 'Drop 40 on him in November', effect: 'Scoreboard rebuttal',
          apply: (cc, r) => {
            setFlag(cc, 'nb_oldCoach', 1);
            if (r() < 0.65) { bumpFan(cc, 12); bumpMorale(cc, 10); return '43 points and a long look at the other bench with 40 seconds left. Fanbase +12, morale +10.'; }
            bumpMorale(cc, -6); bumpFan(cc, -2);
            return 'Five for 19 with the whole world watching you try too hard. Morale -6, fanbase -2.';
          },
        },
        {
          label: 'Let it go completely', effect: 'Peace, cheap',
          apply: (cc) => {
            setFlag(cc, 'nb_oldCoach', 2); bumpMorale(cc, 8); bumpHealth(cc, 3);
            return 'You let it go in one phone call and slept better all year. Morale +8, health +3.';
          },
        },
        {
          label: 'Tell the whole story on a podcast', effect: 'Receipts on tape',
          apply: (cc) => {
            setFlag(cc, 'nb_oldCoach', 3); bumpFan(cc, 11); addHeat(cc, 4); bumpMorale(cc, -3);
            return 'Ninety minutes, names, dates and one very specific timeout. Fanbase +11, morale -3, and he has not spoken since.';
          },
        },
      ],
    });
  }

  if (yrs >= 3 && prevTeam && flag(c, 'nb_revenge') === 0) {
    deck.push({
      id: 'nbaB_revengeGame',
      title: 'First trip back',
      body: `Your return to ${nbaTeamLabelOf(prevTeam)} is a national Tuesday. They are playing a tribute video in the first timeout whether you want one or not.`,
      options: [
        {
          label: 'Go for 45 and hear the boos', effect: 'Swing big',
          apply: (cc, r) => {
            setFlag(cc, 'nb_revenge', 1);
            if (r() < 0.55) { bumpFan(cc, 14); bumpMorale(cc, 12); bumpHealth(cc, -4); return '47 points in the building that traded you. Fanbase +14, morale +12, health -4.'; }
            bumpFan(cc, 2); bumpMorale(cc, -8);
            return 'Four for 17, two turnovers late, and a tribute video that felt like a joke by the fourth. Fanbase +2, morale -8.';
          },
        },
        {
          label: 'Play the right way and win', effect: 'Quiet and correct',
          apply: (cc) => {
            setFlag(cc, 'nb_revenge', 2); bumpOvr(cc, 1); bumpMorale(cc, 8); bumpFan(cc, 5);
            return '19 points, 11 assists, a nine point win and nothing said after. Rating +1, morale +8, fanbase +5.';
          },
        },
        {
          label: 'Buy out a section for your old neighborhood', effect: 'Bigger than the game',
          apply: (cc) => {
            setFlag(cc, 'nb_revenge', 3); spend(cc, 0.12); bumpFan(cc, 12); bumpMorale(cc, 7);
            return '0.12M for 300 seats behind the bench, filled with people from your block. Fanbase +12, morale +7.';
          },
        },
      ],
    });
  }

  if (yrs >= 3 && c.ovr >= 80 && flag(c, 'nb_snub') === 0) {
    deck.push({
      id: 'nbaB_allStarSnub',
      title: 'Left off the All Star team',
      body: '24 and 7 on a winning team, and the coaches took a guy averaging 19 because his team had a better February. One coach said the vote was really hard, on camera, badly.',
      options: [
        {
          label: 'Say nothing, drop 41 on him in March', effect: 'Fuel for the year',
          apply: (cc) => {
            setFlag(cc, 'nb_snub', 1); bumpOvr(cc, 1); bumpMorale(cc, 6); bumpFan(cc, 8);
            return 'You did not say a word until March 14, when you put 41 on him in his own building. Rating +1, morale +6, fanbase +8.';
          },
        },
        {
          label: 'Post the stat comparison yourself', effect: 'Public and petty',
          apply: (cc) => {
            setFlag(cc, 'nb_snub', 2); bumpFan(cc, 11); bumpMorale(cc, -4);
            return 'A side by side graphic you made yourself at 1am. Fanbase +11, morale -4, and your agent asked you to please stop.';
          },
        },
        {
          label: 'Take the whole break off completely', effect: 'Rest and spite',
          apply: (cc) => {
            setFlag(cc, 'nb_snub', 3); bumpHealth(cc, 8); bumpMorale(cc, 6); bumpFan(cc, -6);
            return 'Five days with no phone on an island nobody could spell. Health +8, morale +6, fanbase -6.';
          },
        },
      ],
    });
  }

  /* ══════════ 4. BUSINESS AND INVESTING ══════════ */

  if (yrs >= 2 && nw >= 1.5 && flag(c, 'nb_food') === 0) {
    deck.push({
      id: 'nbaB_restaurantGroup',
      title: 'A chef wants your name on eight more doors',
      body: 'Two packed locations, real food, real books. He needs 3M to go from two restaurants to ten, and he wants your face on the wall of every one.',
      options: [
        {
          label: 'All in, 3M for the group', effect: 'Big swing, real risk',
          apply: (cc, r) => {
            setFlag(cc, 'nb_food', 1); spend(cc, 3); own(cc, 'Restaurant group');
            if (r() < 0.55) { bank(cc, 5.2); bumpFan(cc, 8); bumpMorale(cc, 10); return 'Ten locations in four years and 5.2M back to you. Fanbase +8, morale +10, and you eat free in three states.'; }
            bumpMorale(cc, -8); bumpFan(cc, -2);
            return 'Four of the ten never opened and the 3M is gone. Morale -8, fanbase -2, and the chef now has a podcast about resilience.';
          },
        },
        {
          label: 'One restaurant, in your hometown', effect: 'Small and personal',
          apply: (cc) => {
            setFlag(cc, 'nb_food', 2); spend(cc, 0.9); own(cc, 'Hometown restaurant'); bumpMorale(cc, 9); bumpFan(cc, 7);
            return '0.9M for one room on the street you grew up on. It is booked out for six weeks. Morale +9, fanbase +7.';
          },
        },
        {
          label: 'License the name, own nothing', effect: 'Free money, no soul',
          apply: (cc) => {
            setFlag(cc, 'nb_food', 3); earn(cc, 0.6); bumpFan(cc, 4); bumpMorale(cc, 2);
            return '0.6M a year to let a chef print your name on a menu you did not read. Fanbase +4, morale +2.';
          },
        },
      ],
    });
  }

  if (yrs >= 2 && nw >= 1 && flag(c, 'nb_tech') === 0) {
    deck.push({
      id: 'nbaB_techPitch',
      title: 'A 26 year old in a 900 dollar hoodie',
      body: 'His app tells you which of your friends is actually on the way and which one is still in the shower. He wants 2M and he has said the word ecosystem nine times.',
      options: [
        {
          label: 'Write the 2M check', effect: 'Lottery ticket',
          apply: (cc, r) => {
            setFlag(cc, 'nb_tech', 1); spend(cc, 2);
            if (r() < 0.3) { bank(cc, 9); bumpMorale(cc, 12); bumpFan(cc, 6); return 'Acquired in nineteen months. 9M back on a 2M check. Morale +12, fanbase +6, and you are now called an investor on television.'; }
            bumpMorale(cc, -9);
            return 'A wind down email at 11:40pm on a Friday and 2M gone. Morale -9, and he already has a new deck.';
          },
        },
        {
          label: 'Small check, 0.4M, take the meetings', effect: 'Toe in the water',
          apply: (cc, r) => {
            setFlag(cc, 'nb_tech', 2); spend(cc, 0.4);
            if (r() < 0.4) { bank(cc, 1.7); bumpMorale(cc, 8); return '1.7M back on a 0.4M check and you learned what a cap table is. Morale +8.'; }
            bumpMorale(cc, 3); bumpFan(cc, 2);
            return 'The 0.4M is gone but you sat in twelve real meetings and kept the hoodie. Morale +3, fanbase +2.';
          },
        },
        {
          label: 'Pass, buy boring index funds', effect: 'Coward money',
          apply: (cc) => {
            setFlag(cc, 'nb_tech', 3); bank(cc, 0.9); bumpMorale(cc, 5);
            return 'You put it somewhere boring and it quietly made 0.9M while you slept. Morale +5, and he still texts you every March.';
          },
        },
      ],
    });
  }

  if (yrs >= 4 && c.fanbase >= 45 && flag(c, 'nb_academy') === 0) {
    deck.push({
      id: 'nbaB_youthAcademy',
      title: 'Your name on a gym full of kids',
      body: 'Two courts, a weight room, a study hall and a bus route that actually reaches the neighborhood you came from. The full build is 4M.',
      options: [
        {
          label: 'Build the whole academy, 4M', effect: 'Legacy in concrete',
          apply: (cc) => {
            setFlag(cc, 'nb_academy', 1); spend(cc, 4); own(cc, 'Youth basketball academy'); bumpFan(cc, 18); bumpMorale(cc, 16);
            return '4M, two courts, a study hall and 240 kids in year one. Fanbase +18, morale +16.';
          },
        },
        {
          label: 'One free camp a week every summer', effect: 'Time instead of money',
          apply: (cc) => {
            setFlag(cc, 'nb_academy', 2); spend(cc, 0.2); bumpFan(cc, 9); bumpMorale(cc, 10); bumpHealth(cc, -3);
            return '0.2M and one week of your July, on your feet, in a hot gym. Fanbase +9, morale +10, health -3.';
          },
        },
        {
          label: 'Fund the program that already exists', effect: 'Quiet and efficient',
          apply: (cc) => {
            setFlag(cc, 'nb_academy', 3); spend(cc, 0.6); bumpFan(cc, 7); bumpMorale(cc, 8);
            return '0.6M to a coach who has been doing this for 22 years without you. Fanbase +7, morale +8.';
          },
        },
      ],
    });
  }

  if (yrs >= 3 && c.fanbase >= 50 && flag(c, 'nb_media') === 0) {
    deck.push({
      id: 'nbaB_mediaCompany',
      title: 'Your podcast did 11 million downloads on a laptop mic',
      body: 'A network offered to buy it outright. A studio offered to fund whatever you want to build instead. Your cohost, a cousin, has opinions about both.',
      options: [
        {
          label: 'Sell to the network for 6M', effect: 'Cash now, notes later',
          apply: (cc) => {
            setFlag(cc, 'nb_media', 1); earn(cc, 6); bumpFan(cc, 5); bumpMorale(cc, -3);
            return '6M up front and a producer who now sends you a run of show. Fanbase +5, morale -3.';
          },
        },
        {
          label: 'Build your own studio, 2.5M', effect: 'Own the whole thing',
          apply: (cc, r) => {
            setFlag(cc, 'nb_media', 2); spend(cc, 2.5); own(cc, 'Media company');
            if (r() < 0.5) { bank(cc, 8); bumpFan(cc, 14); bumpMorale(cc, 10); return 'Four shows, one documentary and 8M in revenue in three years. Fanbase +14, morale +10.'; }
            bank(cc, 0.7); bumpMorale(cc, -6); bumpFan(cc, 3);
            return '2.5M in, 0.7M out, and a very nice studio nobody books. Fanbase +3, morale -6.';
          },
        },
        {
          label: 'Keep it a hobby, two mics, no boss', effect: 'Small and happy',
          apply: (cc) => {
            setFlag(cc, 'nb_media', 3); earn(cc, 0.9); bumpMorale(cc, 8); bumpHealth(cc, 2);
            return '0.9M in ad reads a year, zero meetings, zero notes. Morale +8, health +2.';
          },
        },
      ],
    });
  }

  if (yrs >= 5 && nw >= 2 && c.age >= 27 && flag(c, 'nb_wine') === 0) {
    deck.push({
      id: 'nbaB_wineLabel',
      title: 'A wine with your jersey number on the bottle',
      body: 'You have been to Napa twice and both times somebody offered you a vineyard. The third offer came with a spreadsheet, which is how you know it is serious.',
      options: [
        {
          label: 'Buy the vineyard, 3.5M', effect: 'Actually farming now',
          apply: (cc, r) => {
            setFlag(cc, 'nb_wine', 1); spend(cc, 3.5); own(cc, 'Vineyard');
            if (r() < 0.45) { bank(cc, 5.5); bumpFan(cc, 7); bumpMorale(cc, 9); return 'A 94 point rating in year three and 5.5M back. Fanbase +7, morale +9, and you can pronounce everything now.'; }
            bank(cc, 0.4); bumpMorale(cc, -5);
            return '9,000 unsold cases in a warehouse outside Reno and 0.4M recovered. Morale -5, and everyone you know is getting wine for Christmas.';
          },
        },
        {
          label: 'Put your name on somebody else wine', effect: 'Easy licensing money',
          apply: (cc) => {
            setFlag(cc, 'nb_wine', 2); earn(cc, 1.1); bumpFan(cc, 3);
            return '1.1M to sign 400 labels in a hotel conference room. Fanbase +3, and you have never tasted it.';
          },
        },
        {
          label: 'Make 400 cases and give them all away', effect: 'Gifts, not business',
          apply: (cc) => {
            setFlag(cc, 'nb_wine', 3); spend(cc, 0.2); bumpMorale(cc, 9); bumpFan(cc, 7);
            return '0.2M for 400 cases that went to every teammate, trainer, equipment manager and bus driver. Morale +9, fanbase +7.';
          },
        },
      ],
    });
  }

  if (yrs >= 6 && nw >= 4 && flag(c, 'nb_club') === 0) {
    deck.push({
      id: 'nbaB_overseasClub',
      title: 'A second division club in Spain wants your name on the letterhead',
      body: 'Eleven thousand seats, a 90 year old crest and a president who cried during the video call. Promotion is worth real money and he knows you know that.',
      options: [
        {
          label: 'Buy 30 percent, stay out of the way', effect: 'Silent partner',
          apply: (cc, r) => {
            setFlag(cc, 'nb_club', 1); spend(cc, 5); own(cc, '30 percent of a Spanish club'); bumpFan(cc, 8); bumpMorale(cc, 6);
            if (r() < 0.4) { bank(cc, 2.5); bumpMorale(cc, 8); return '5M in, promotion in year two, 2.5M back on paper. Fanbase +8, morale +14, and 11,000 people sang a song about you.'; }
            return '5M for 30 percent, a scarf and a seat in the directors box. Fanbase +8, morale +6, and they finished eleventh.';
          },
        },
        {
          label: 'Buy control and actually run it', effect: 'Owner life',
          apply: (cc) => {
            setFlag(cc, 'nb_club', 2); spend(cc, 8); own(cc, 'A Spanish club'); bumpMorale(cc, 12); bumpFan(cc, 10); bumpHealth(cc, -4);
            return '8M, 42 flights and one coach you had to fire in November. Morale +12, fanbase +10, health -4.';
          },
        },
        {
          label: 'Pass, sponsor their youth side', effect: 'Small and useful',
          apply: (cc) => {
            setFlag(cc, 'nb_club', 3); spend(cc, 0.4); bumpFan(cc, 6); bumpMorale(cc, 8);
            return '0.4M a year for kits, buses and a coach for 90 kids. Fanbase +6, morale +8.';
          },
        },
      ],
    });
  }

  /* ══════════ 5. OFFSEASON LIFE ══════════ */

  if (yrs >= 1 && flag(c, 'nb_vacay') === 0) {
    deck.push({
      id: 'nbaB_vacationPhoto',
      title: 'The yacht photo',
      body: 'You are 400 pounds of joy in a photo taken in July and the internet has decided to have a full week about your conditioning. Your trainer sent it to you with no message.',
      options: [
        {
          label: 'Post the entire album', effect: 'Lean into it',
          apply: (cc) => {
            setFlag(cc, 'nb_vacay', 1); bumpFan(cc, 12); bumpMorale(cc, 7); addHeat(cc, 3);
            return 'Nineteen more photos, all worse, all posted by you at once. Fanbase +12, morale +7.';
          },
        },
        {
          label: 'Go quiet and show up shredded', effect: 'Answer in camp',
          apply: (cc) => {
            setFlag(cc, 'nb_vacay', 2); bumpOvr(cc, 1); bumpHealth(cc, 5); bumpFan(cc, -4);
            return 'Six weeks off the grid and a media day photo that ended the conversation. Rating +1, health +5, fanbase -4.';
          },
        },
        {
          label: 'Turn it into a merch drop', effect: 'Monetize the slander',
          apply: (cc) => {
            setFlag(cc, 'nb_vacay', 3); earn(cc, 0.5); bumpFan(cc, 9); bumpMorale(cc, -2);
            return 'The photo on a hoodie, 0.5M in three days. Fanbase +9, morale -2, and your trainer is still not speaking to you.';
          },
        },
      ],
    });
  }

  if (c.fanbase >= 40 && flag(c, 'nb_golf') === 0) {
    deck.push({
      id: 'nbaB_celebGolf',
      title: 'The celebrity golf tournament',
      body: 'Two days in Lake Tahoe, cameras on every tee box, and a pairing with a country singer who takes this extremely seriously.',
      options: [
        {
          label: 'Play it and try', effect: 'Public golf swing',
          apply: (cc, r) => {
            setFlag(cc, 'nb_golf', 1);
            if (r() < 0.5) { bumpFan(cc, 10); bumpMorale(cc, 8); return 'A hole in one on 14 that led every highlight show in the country. Fanbase +10, morale +8.'; }
            bumpFan(cc, 3); bumpMorale(cc, -4);
            return 'You shot 108 on national television and lost a ball in a lake on the first tee. Fanbase +3, morale -4.';
          },
        },
        {
          label: 'Skip it, stay in the gym', effect: 'Work over vibes',
          apply: (cc) => {
            setFlag(cc, 'nb_golf', 2); bumpOvr(cc, 1); bumpMorale(cc, 3); bumpFan(cc, -3);
            return 'Two extra days of five spot shooting instead of a cart. Rating +1, morale +3, fanbase -3.';
          },
        },
        {
          label: 'Play, and gamble with the group', effect: 'Side action',
          apply: (cc, r) => {
            setFlag(cc, 'nb_golf', 3);
            if (r() < 0.5) { bank(cc, 0.35); bumpMorale(cc, 7); return 'You took 350k off a quarterback and two actors on the back nine. Morale +7.'; }
            spend(cc, 0.4); bumpMorale(cc, -5); bumpFan(cc, 5);
            return 'You lost 0.4M on a press on 18 and the story is now everywhere. Fanbase +5, morale -5.';
          },
        },
      ],
    });
  }

  if ((c.ovr >= 85 || c.mvps >= 1 || c.allNbas >= 1) && flag(c, 'nb_cover') === 0) {
    deck.push({
      id: 'nbaB_gameCover',
      title: 'The video game cover shoot',
      body: 'Four hours in a motion capture suit with 92 dots on your face. They want the cover, the trailer and one very specific dunk you have done twice in your life.',
      options: [
        {
          label: 'Take the cover, 4M', effect: 'Cash and the curse',
          apply: (cc) => {
            setFlag(cc, 'nb_cover', 1); earn(cc, 4); bumpFan(cc, 15); bumpMorale(cc, 8);
            return '4M and your face on eleven million shelves. Fanbase +15, morale +8, and every uncle you have mentioned the cover curse.';
          },
        },
        {
          label: 'Ask for equity instead of cash', effect: 'Bet on the game',
          apply: (cc, r) => {
            setFlag(cc, 'nb_cover', 2);
            if (r() < 0.45) { earn(cc, 9); bumpFan(cc, 12); return 'The game did record numbers and your points paid 9M. Fanbase +12.'; }
            earn(cc, 1.2); bumpFan(cc, 10); bumpMorale(cc, -3);
            return 'The game underperformed and your equity paid 1.2M. Fanbase +10, morale -3.';
          },
        },
        {
          label: 'Turn it down, the curse is real', effect: 'Superstition first',
          apply: (cc) => {
            setFlag(cc, 'nb_cover', 3); bumpMorale(cc, 6); bumpHealth(cc, 4); bumpFan(cc, -5);
            return 'You said no to 4M because of a superstition you refuse to explain. Morale +6, health +4, fanbase -5.';
          },
        },
      ],
    });
  }

  if (yrs >= 2 && c.fanbase >= 45 && flag(c, 'nb_album') === 0) {
    deck.push({
      id: 'nbaB_album',
      title: '14 tracks nobody asked for',
      body: 'You have been in a studio all June. Your engineer keeps saying it is actually not bad in the tone people use about babies that are not cute.',
      options: [
        {
          label: 'Drop the whole album', effect: 'All 14 tracks',
          apply: (cc, r) => {
            setFlag(cc, 'nb_album', 1); spend(cc, 0.3);
            if (r() < 0.3) { earn(cc, 1.4); bumpFan(cc, 16); bumpMorale(cc, 12); return 'Track 9 went viral on a dance app and the album made 1.4M. Fanbase +16, morale +12.'; }
            bumpFan(cc, 6); bumpMorale(cc, -7);
            return '0.3M spent, 41,000 streams, and a review that opened with the words he tried. Fanbase +6, morale -7.';
          },
        },
        {
          label: 'One single, one feature, done', effect: 'Small and survivable',
          apply: (cc) => {
            setFlag(cc, 'nb_album', 2); spend(cc, 0.08); bumpFan(cc, 8); bumpMorale(cc, 6);
            return '0.08M for one song with a real rapper who did it as a favor. Fanbase +8, morale +6.';
          },
        },
        {
          label: 'Keep it on your phone', effect: 'For the group chat only',
          apply: (cc) => {
            setFlag(cc, 'nb_album', 3); bumpMorale(cc, 5); bumpOvr(cc, 1);
            return 'The album lives in a folder called PERSONAL and four teammates have heard it. Rating +1, morale +5.';
          },
        },
      ],
    });
  }

  if (c.age >= 24 && flag(c, 'nb_cook') === 0) {
    deck.push({
      id: 'nbaB_learningToCook',
      title: 'You are 26 and cannot make rice',
      body: 'You have made eleven million dollars and eaten the same three meals since high school. Somebody in your house said this out loud at dinner.',
      options: [
        {
          label: 'Hire a chef to teach you all summer', effect: 'Skills and nutrition',
          apply: (cc) => {
            setFlag(cc, 'nb_cook', 1); spend(cc, 0.15); bumpHealth(cc, 8); bumpMorale(cc, 8);
            return '0.15M for twelve weeks of lessons. You can now cook nine things well and one thing dangerously. Health +8, morale +8.';
          },
        },
        {
          label: 'Teach yourself from videos', effect: 'Free and smoky',
          apply: (cc) => {
            setFlag(cc, 'nb_cook', 2); spend(cc, 0.03); bumpHealth(cc, 4); bumpMorale(cc, 6);
            return 'One grease fire, 30k in kitchen repairs, and a genuinely excellent salmon. Health +4, morale +6.';
          },
        },
        {
          label: 'Keep the private chef, learn nothing', effect: 'Time back',
          apply: (cc) => {
            setFlag(cc, 'nb_cook', 3); spend(cc, 0.25); bumpHealth(cc, 6); bumpOvr(cc, 1);
            return '0.25M a year for perfect macros and two extra hours a day in the gym. Rating +1, health +6.';
          },
        },
      ],
    });
  }

  if ((yrs >= 4 || c.earnings >= 15) && flag(c, 'nb_charity') === 0) {
    deck.push({
      id: 'nbaB_foundationLaunch',
      title: 'The foundation',
      body: 'Everyone has one. Most of them are a logo, a gala and a very confusing tax filing. Yours does not have to be.',
      options: [
        {
          label: 'Fund it yourself, 3M', effect: 'Real money, your name',
          apply: (cc) => {
            setFlag(cc, 'nb_charity', 1); spend(cc, 3); own(cc, 'Foundation'); bumpFan(cc, 16); bumpMorale(cc, 14);
            return '3M of your own money, 900 kids with laptops and one very small staff. Fanbase +16, morale +14.';
          },
        },
        {
          label: 'Small, quiet, no press release', effect: 'Nobody knows',
          apply: (cc) => {
            setFlag(cc, 'nb_charity', 2); spend(cc, 0.7); bumpMorale(cc, 12); bumpFan(cc, 2);
            return '0.7M a year, zero announcements, and a rent fund that has quietly paid 240 families. Morale +12, fanbase +2.';
          },
        },
        {
          label: 'Get sponsors to fund it, you give time', effect: 'Other people money',
          apply: (cc) => {
            setFlag(cc, 'nb_charity', 3); bumpMorale(cc, 8); bumpFan(cc, 10); bumpHealth(cc, -3);
            return 'Three sponsors wrote the checks and you gave 40 days a year. Fanbase +10, morale +8, health -3.';
          },
        },
      ],
    });
  }

  /* ══════════ 6. GENUINELY WEIRD BASKETBALL LIFE ══════════ */

  if (c.fanbase >= 60 && flag(c, 'nb_namefan') === 0) {
    deck.push({
      id: 'nbaB_nameChangeFan',
      title: 'A man in Ohio legally changed his name to yours',
      body: 'Forty one years old, three kids, section 214 every home game. His wife found out from a piece of mail.',
      options: [
        {
          label: 'Fly him out, jersey, courtside seats', effect: 'Wholesome and viral',
          apply: (cc) => {
            setFlag(cc, 'nb_namefan', 1); spend(cc, 0.06); bumpFan(cc, 14); bumpMorale(cc, 7);
            return '60k for flights, courtside and a jersey with a name that is now legally both of yours. Fanbase +14, morale +7.';
          },
        },
        {
          label: 'Have your lawyer send a letter', effect: 'Safe and cold',
          apply: (cc) => {
            setFlag(cc, 'nb_namefan', 2); spend(cc, 0.04); bumpFan(cc, -8); bumpMorale(cc, 5);
            return '40k in legal and one extremely sad reply email. Fanbase -8, morale +5, and you sleep fine now.';
          },
        },
        {
          label: 'Hire him as your assistant', effect: 'Two of you now',
          apply: (cc) => {
            setFlag(cc, 'nb_namefan', 3); spend(cc, 0.2); bumpFan(cc, 18); bumpMorale(cc, 6);
            return '0.2M a year for an assistant with your exact legal name, which has already broken three airline systems. Fanbase +18, morale +6.';
          },
        },
      ],
    });
  }

  if (yrs >= 2 && flag(c, 'nb_psychic') === 0 && rng() < 0.8) {
    deck.push({
      id: 'nbaB_ownerPsychic',
      title: 'The owner hired a psychic',
      body: 'She sits in on shootaround and has firm opinions about the starting lineup. The head coach has stopped arguing with her, which is the scary part.',
      options: [
        {
          label: 'Take the reading', effect: 'Coin flip for the soul',
          apply: (cc, r) => {
            setFlag(cc, 'nb_psychic', 1);
            if (r() < 0.5) { bumpMorale(cc, 12); return 'She said you win a title in a cold city under a coach you have not met yet. Morale +12. You think about it during free throws.'; }
            bumpMorale(cc, -8); bumpFan(cc, 2);
            return 'She named the exact age your career ends and then refused to explain herself. Morale -8, fanbase +2, and you have not slept right since.';
          },
        },
        {
          label: 'Refuse, get labeled difficult', effect: 'Film over fortune',
          apply: (cc) => {
            setFlag(cc, 'nb_psychic', 2); bumpOvr(cc, 1); bumpMorale(cc, -3);
            return 'You walked out and got shots up instead. Rating +1, morale -3, and the owner used the word attitude twice on a podcast.';
          },
        },
        {
          label: 'Pay her privately about your contract', effect: 'Expensive advice',
          apply: (cc) => {
            setFlag(cc, 'nb_psychic', 3); spend(cc, 0.03); bumpMorale(cc, 7);
            return '30k for a private session in which she told you to ask for more money. She was completely correct. Morale +7.';
          },
        },
      ],
    });
  }

  if (yrs >= 2 && flag(c, 'nb_ghost') === 0 && rng() < 0.8) {
    deck.push({
      id: 'nbaB_arenaGhost',
      title: 'The practice gym is haunted',
      body: 'Three rookies swear it is a center who played here in 1971. The security camera has a ball rolling out of the rack at 2:40am with nobody in the building.',
      options: [
        {
          label: 'Sleep in the gym overnight with cameras', effect: 'Content, no sleep',
          apply: (cc) => {
            setFlag(cc, 'nb_ghost', 1); bumpFan(cc, 13); bumpHealth(cc, -3); bumpMorale(cc, 6);
            return 'Nine hours, four cameras and one genuinely unexplained noise at 3:40am. Fanbase +13, morale +6, health -3.';
          },
        },
        {
          label: 'Sage the tunnel with the whole roster', effect: 'Vibes restored',
          apply: (cc) => {
            setFlag(cc, 'nb_ghost', 2); spend(cc, 0.01); bumpMorale(cc, 8); bumpFan(cc, 6);
            return '10k of sage, one bluetooth speaker and the entire starting five holding hands at midcourt. Morale +8, fanbase +6.';
          },
        },
        {
          label: 'Move your locker, explain nothing', effect: 'Coward, comfortable',
          apply: (cc) => {
            setFlag(cc, 'nb_ghost', 3); bumpMorale(cc, -3); bumpHealth(cc, 3); bumpFan(cc, -2);
            return 'You moved across the room and never said why. The new spot is next to the heater, which rules. Health +3, morale -3, fanbase -2.';
          },
        },
      ],
    });
  }

  if (yrs >= 1 && flag(c, 'nb_mascot') === 0 && rng() < 0.85) {
    deck.push({
      id: 'nbaB_mascotFeud',
      title: 'The mascot is doing a bit about you',
      body: 'He mimes your free throw routine at every home game and the jumbotron loves it. Nineteen thousand people love it. You do not love it.',
      options: [
        {
          label: 'Escalate into a full prank war', effect: 'Season long bit',
          apply: (cc) => {
            setFlag(cc, 'nb_mascot', 1); spend(cc, 0.03); bumpFan(cc, 15); bumpMorale(cc, 8);
            return '30k of pranks including 400 pounds of ice in a costume head. Fanbase +15, morale +8, and he got you back twice as hard in March.';
          },
        },
        {
          label: 'Ask the team to shut it down', effect: 'Peace, unpopular',
          apply: (cc) => {
            setFlag(cc, 'nb_mascot', 2); bumpFan(cc, -9); bumpMorale(cc, 5); bumpHealth(cc, 2);
            return 'The bit died in one memo and the crowd noticed immediately. Fanbase -9, morale +5, health +2.';
          },
        },
        {
          label: 'Put him in your commercial', effect: 'Mascot money',
          apply: (cc) => {
            setFlag(cc, 'nb_mascot', 3); earn(cc, 0.5); bumpFan(cc, 12); bumpMorale(cc, 6);
            return '0.5M for a sneaker ad co starring a man in a giant costume who is, it turns out, a very good actor. Fanbase +12, morale +6.';
          },
        },
      ],
    });
  }

  if (yrs >= 1 && flag(c, 'nb_hotdog') === 0 && rng() < 0.85) {
    deck.push({
      id: 'nbaB_hotDogChallenge',
      title: 'The halftime hot dog challenge',
      body: 'A season ticket holder ate nine in four minutes and then called you out on the jumbotron by name. The team wants you in it. The nutritionist is standing directly behind the camera.',
      options: [
        {
          label: 'Accept and eat', effect: 'Third quarter risk',
          apply: (cc, r) => {
            setFlag(cc, 'nb_hotdog', 1);
            if (r() < 0.5) { bumpFan(cc, 14); bumpMorale(cc, 9); bumpHealth(cc, -6); return 'Ten in three minutes and then 14 points in the third. Fanbase +14, morale +9, health -6.'; }
            bumpFan(cc, 7); bumpMorale(cc, -3); bumpHealth(cc, -9);
            return 'You got to six, lost badly and played the third quarter looking like a man with a secret. Fanbase +7, morale -3, health -9.';
          },
        },
        {
          label: 'Decline but fund the prize', effect: 'Sponsor the chaos',
          apply: (cc) => {
            setFlag(cc, 'nb_hotdog', 2); spend(cc, 0.02); bumpFan(cc, 6); bumpMorale(cc, 5);
            return '20k of prize money and a trophy with your name on it that a plumber from the suburbs now owns. Fanbase +6, morale +5.';
          },
        },
        {
          label: 'Judge it instead, with a scorecard', effect: 'Officiate the bit',
          apply: (cc) => {
            setFlag(cc, 'nb_hotdog', 3); bumpFan(cc, 5); bumpMorale(cc, 6); bumpHealth(cc, 1);
            return 'You held up numbered cards in a warmup jacket and took it far too seriously. Fanbase +5, morale +6.';
          },
        },
      ],
    });
  }

  if (yrs >= 1 && flag(c, 'nb_raccoon') === 0 && rng() < 0.85) {
    deck.push({
      id: 'nbaB_facilityRaccoon',
      title: 'There is a raccoon above the film room',
      body: 'Nine days now. He has a name, it is Bandit, and he has taken three mouthguards and sat through an entire defensive install.',
      options: [
        {
          label: 'Adopt Bandit as the team lucky charm', effect: 'Mascot upgrade',
          apply: (cc) => {
            setFlag(cc, 'nb_raccoon', 1); spend(cc, 0.02); bumpFan(cc, 12); bumpMorale(cc, 9); bumpHealth(cc, -2);
            return '20k a year in food and vet bills for an animal that is not legally anybody. Fanbase +12, morale +9, health -2.';
          },
        },
        {
          label: 'Call animal control quietly', effect: 'Clean and boring',
          apply: (cc) => {
            setFlag(cc, 'nb_raccoon', 2); bumpHealth(cc, 4); bumpMorale(cc, -4); bumpFan(cc, -3);
            return 'Bandit lives in a state park now. Health +4, morale -4, fanbase -3, and two centers have not forgiven you.';
          },
        },
        {
          label: 'Give Bandit his own account', effect: 'Content empire',
          apply: (cc) => {
            setFlag(cc, 'nb_raccoon', 3); earn(cc, 0.3); bumpFan(cc, 17); bumpHealth(cc, -3);
            return 'Bandit has 1.4 million followers and a snack sponsorship worth 0.3M. Fanbase +17, health -3.';
          },
        },
      ],
    });
  }

  if (yrs >= 4 && c.fanbase >= 45 && flag(c, 'nb_heckler') === 0) {
    deck.push({
      id: 'nbaB_heckler',
      title: 'Nine years of the same three jokes',
      body: 'A man in section 108 has heckled you at every single home game since you were a rookie. He just mailed a handwritten letter asking if you two could meet.',
      options: [
        {
          label: 'Meet him and mic it for the team feed', effect: 'Wholesome content',
          apply: (cc) => {
            setFlag(cc, 'nb_heckler', 1); bumpFan(cc, 12); bumpMorale(cc, 8);
            return 'Eleven minutes on camera in which he apologized for one joke and defended the other two. Fanbase +12, morale +8.';
          },
        },
        {
          label: 'Quietly buy his seat out from under him', effect: 'Petty and effective',
          apply: (cc) => {
            setFlag(cc, 'nb_heckler', 2); spend(cc, 0.09); bumpMorale(cc, 7); bumpFan(cc, -6);
            return '90k for four seats in section 108 that now sit empty every night. Morale +7, fanbase -6.';
          },
        },
        {
          label: 'Make him your official hype man', effect: 'Recruit the enemy',
          apply: (cc) => {
            setFlag(cc, 'nb_heckler', 3); spend(cc, 0.05); bumpFan(cc, 14); bumpMorale(cc, 6);
            return '50k a year, a jersey and a microphone. He now heckles the other team, badly, with total commitment. Fanbase +14, morale +6.';
          },
        },
      ],
    });
  }

  /* ══════════ 7. CONTRACT AND CAREER FORKS ══════════ */

  if (c.contractYears <= 1 && c.age >= 26 && (c.mvps >= 1 || c.allNbas >= 2 || c.ovr >= 88) && flag(c, 'nb_supermax') === 0) {
    const smax = money(Math.max(38, (c.ovr - 62) * 1.95));
    deck.push({
      id: 'nbaB_supermax',
      title: `The supermax is on the table at ${smax}M`,
      body: `${nbaTeamLabelOf(c.team)} put five years at ${smax}M in front of you. It is more money than your family has ever counted and it eats their entire cap sheet.`,
      options: [
        {
          label: 'Sign it, every dollar', effect: 'Generational money',
          apply: (cc) => {
            setFlag(cc, 'nb_supermax', 1); cc.salary = smax; cc.contractYears = 5; bumpMorale(cc, 10); bumpFan(cc, 8);
            return `Five years at ${smax}M. Fanbase +8, morale +10, and the roster around you is now four rookies and a veteran minimum guy who is 37.`;
          },
        },
        {
          label: 'Take 15 percent less so they can build', effect: 'Money for help',
          apply: (cc) => {
            setFlag(cc, 'nb_supermax', 2); cc.salary = money(smax * 0.85); cc.contractYears = 5; bumpMorale(cc, 7); bumpFan(cc, 15);
            return `Five years at ${money(smax * 0.85)}M and they used the room on a real second option. Fanbase +15, morale +7, and the union sent a very polite email.`;
          },
        },
        {
          label: 'Two years, then hit the market again', effect: 'Short and greedy',
          apply: (cc) => {
            setFlag(cc, 'nb_supermax', 3); cc.salary = money(smax * 1.05); cc.contractYears = 2; bumpMorale(cc, 5); bumpFan(cc, -4);
            return `Two years at ${money(smax * 1.05)}M with all the leverage kept in your pocket. Morale +5, fanbase -4, and this exact meeting happens again in 24 months.`;
          },
        },
      ],
    });
  }

  if (yrs >= 3 && c.contractYears >= 1 && c.morale >= 45 && c.morale < 78 && flag(c, 'nb_tradeReq') === 0) {
    deck.push({
      id: 'nbaB_tradeRequest',
      title: 'You are 27 and they are 14 under .500',
      body: 'The front office keeps saying the word patience in meetings you did not ask to be in. Your prime is not a renewable resource.',
      options: [
        {
          label: 'Request it publicly', effect: 'Force the issue',
          apply: (cc, r) => {
            setFlag(cc, 'nb_tradeReq', 1);
            const nt = otherTeam(cc, r); cc.team = nt; cc.fanbase = 40; bumpMorale(cc, 12); addHeat(cc, 5);
            return `Your agent released a statement at 9am and you were traded to ${nbaTeamLabelOf(nt)} by dinner. Fanbase reset to 40, morale +12.`;
          },
        },
        {
          label: 'Request it privately and let them shop you', effect: 'Quiet exit attempt',
          apply: (cc, r) => {
            setFlag(cc, 'nb_tradeReq', 2);
            if (r() < 0.55) { const nt = otherTeam(cc, r); cc.team = nt; cc.fanbase = 46; bumpMorale(cc, 10); return `One closed door conversation and a clean deal to ${nbaTeamLabelOf(nt)}. Fanbase reset to 46, morale +10.`; }
            bumpMorale(cc, -6); bumpFan(cc, -3);
            return 'It leaked in eleven hours, no deal ever came together, and you are still here. Morale -6, fanbase -3.';
          },
        },
        {
          label: 'Stay and be the reason it turns', effect: 'Franchise guy',
          apply: (cc) => {
            setFlag(cc, 'nb_tradeReq', 3); bumpMorale(cc, 7); bumpFan(cc, 12); bumpOvr(cc, 1);
            return 'You told them you are not going anywhere and then acted like it every day. Rating +1, morale +7, fanbase +12.';
          },
        },
      ],
    });
  }

  if (yrs >= 5 && c.contractYears <= 0 && c.rings === 0 && c.age >= 28 && flag(c, 'nb_ringChase') === 0) {
    const discount = money(Math.max(2.5, c.salary * 0.55));
    const bag = money(Math.max(4, c.salary * 1.3));
    deck.push({
      id: 'nbaB_contenderDiscount',
      title: 'One piece away, for a lot less money',
      body: `A real contender has ${discount}M and a starting spot. Two lottery teams have ${bag}M, a lovely practice facility and 24 wins.`,
      options: [
        {
          label: 'Chase the ring', effect: 'Ring over money',
          apply: (cc, r) => {
            setFlag(cc, 'nb_ringChase', 1);
            const nt = otherTeam(cc, r); cc.team = nt; cc.salary = discount; cc.contractYears = 2; cc.fanbase = 52; bumpMorale(cc, 14);
            return `Two years, ${discount}M, with ${nbaTeamLabelOf(nt)}. You left real money on a real table. Morale +14, fanbase reset to 52.`;
          },
        },
        {
          label: 'Take the bag from the rebuild', effect: 'Money over June',
          apply: (cc, r) => {
            setFlag(cc, 'nb_ringChase', 2);
            const nt = otherTeam(cc, r); cc.team = nt; cc.salary = bag; cc.contractYears = 3; cc.fanbase = 40; bumpMorale(cc, -6);
            return `Three years at ${bag}M from ${nbaTeamLabelOf(nt)}. Generational money, zero playoff games. Morale -6, fanbase reset to 40.`;
          },
        },
        {
          label: 'One year prove it with the contender', effect: 'Split the difference',
          apply: (cc, r) => {
            setFlag(cc, 'nb_ringChase', 3);
            const nt = otherTeam(cc, r); cc.team = nt; cc.salary = money(Math.max(3, cc.salary * 0.8)); cc.contractYears = 1; cc.fanbase = 48; bumpMorale(cc, 8);
            return `One year, ${money(cc.salary)}M, with ${nbaTeamLabelOf(nt)}. Win in June and you get paid twice. Morale +8, fanbase reset to 48.`;
          },
        },
      ],
    });
  }

  if (yrs >= 3 && c.contractYears === 1 && flag(c, 'nb_option') === 0) {
    const opt = money(Math.max(2.5, c.salary));
    const market = money(Math.max(2.5, (c.ovr - 66) * 2.3 - 6));
    deck.push({
      id: 'nbaB_playerOption',
      title: `The player option is ${opt}M`,
      body: `Pick it up and the ${opt}M is guaranteed on July 1. Decline it and the market says ${market}M, right up until the moment it says something else.`,
      options: [
        {
          label: 'Pick up the option', effect: 'Guaranteed money',
          apply: (cc) => {
            setFlag(cc, 'nb_option', 1); cc.salary = opt; cc.contractYears = 1; bumpMorale(cc, 5); bumpFan(cc, 3);
            return `You picked up ${opt}M and went back to work with nothing hanging over you. Morale +5, fanbase +3.`;
          },
        },
        {
          label: 'Decline and bet on yourself', effect: 'Swing for the deal',
          apply: (cc, r) => {
            setFlag(cc, 'nb_option', 2);
            if (r() < 0.55) { cc.salary = market; cc.contractYears = 4; bumpMorale(cc, 12); bumpFan(cc, 6); return `Four years at ${market}M within 40 hours of the market opening. Morale +12, fanbase +6.`; }
            cc.salary = money(Math.max(2.5, market * 0.6)); cc.contractYears = 2; bumpMorale(cc, -9);
            return `The money dried up in one weekend. Two years at ${money(cc.salary)}M. Morale -9, and your agent stopped answering group texts.`;
          },
        },
        {
          label: 'Decline and extend now, slightly under', effect: 'Security today',
          apply: (cc) => {
            setFlag(cc, 'nb_option', 3); cc.salary = money(market * 0.9); cc.contractYears = 4; bumpMorale(cc, 9); bumpFan(cc, 6);
            return `Four years at ${money(market * 0.9)}M, signed before free agency even opened. Morale +9, fanbase +6.`;
          },
        },
      ],
    });
  }

  if (yrs >= 7 && c.age >= 30 && c.health >= 70 && c.earnings >= 60 && flag(c, 'nb_walkAway') === 0) {
    deck.push({
      id: 'nbaB_retireHealthy',
      title: 'You could stop right now',
      body: 'Knees, back and bank account all intact at the same time. Almost nobody in this league is ever handed that exact combination.',
      options: [
        {
          label: 'Announce this is the last season', effect: 'Leave whole',
          apply: (cc) => {
            setFlag(cc, 'nb_walkAway', 1); bumpMorale(cc, 12); bumpFan(cc, 14); bumpHealth(cc, 5);
            return 'You told them in July that this was the last one. Morale +12, fanbase +14, health +5, and every road game felt different.';
          },
        },
        {
          label: 'Keep going until the game says stop', effect: 'Chase the ceiling',
          apply: (cc) => {
            setFlag(cc, 'nb_walkAway', 2); bumpMorale(cc, 6); bumpOvr(cc, 1); bumpHealth(cc, -3);
            return 'You are not done and you said so out loud into eleven microphones. Rating +1, morale +6, health -3.';
          },
        },
        {
          label: 'Play one more, decide next summer', effect: 'Kick the can',
          apply: (cc) => {
            setFlag(cc, 'nb_walkAway', 3); bumpMorale(cc, 5); bumpHealth(cc, 3);
            return 'One more year and a decision you moved to next August. Morale +5, health +3.';
          },
        },
      ],
    });
  }

  if (yrs >= 8 && (c.age >= 34 || c.ovr <= 72) && flag(c, 'nb_overseas') === 0) {
    deck.push({
      id: 'nbaB_overseasMegaOffer',
      title: '12M tax free to play in another hemisphere',
      body: 'A club overseas offered 12M for one season, a private jet clause and a translator who is also, apparently, your driver. The NBA offers you the minimum and a locker by the door.',
      options: [
        {
          label: 'Take the 12M and go', effect: 'Money and passport stamps',
          apply: (cc) => {
            setFlag(cc, 'nb_overseas', 1); earn(cc, 12); bumpFan(cc, -9); bumpMorale(cc, 8); bumpHealth(cc, -3);
            return '12M banked, 38 points a night in a league nobody at home watches, and 40 hours a month on planes. Fanbase -9, morale +8, health -3.';
          },
        },
        {
          label: 'Stay for the minimum with a contender', effect: 'Ring over money',
          apply: (cc) => {
            setFlag(cc, 'nb_overseas', 2); cc.salary = 2.5; cc.contractYears = 1; bumpMorale(cc, 11); bumpFan(cc, 9);
            return 'You turned down 12M for 2.5M and 14 minutes a night on a team that can actually win. Morale +11, fanbase +9.';
          },
        },
        {
          label: 'Use it as leverage with your agent', effect: 'Play both sides',
          apply: (cc, r) => {
            setFlag(cc, 'nb_overseas', 3);
            if (r() < 0.45) { cc.salary = money(Math.max(6, cc.salary)); cc.contractYears = 2; bumpMorale(cc, 9); bumpFan(cc, 4); return `The offer got faxed around and somebody blinked. Two years at ${money(cc.salary)}M. Morale +9, fanbase +4.`; }
            cc.salary = 2.5; cc.contractYears = 1; bumpMorale(cc, -7); bumpFan(cc, -2);
            return 'Nobody blinked, the overseas club moved on, and you signed for 2.5M on the last day of August. Morale -7, fanbase -2.';
          },
        },
      ],
    });
  }

  return deck;
}
