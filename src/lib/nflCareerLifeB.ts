/* ==========================================================================
   nflCareerLifeB.ts, offseason deck B for NFL My Career (Round 56)
   Owner brief: everything BitLife has, ten times better and more out of
   pocket. This file is 45 offseason decisions across family and home,
   legacy and records, rivalries, clean business, offseason life, genuinely
   unhinged football stuff, and the contract forks that decide how a career
   actually ends.

   Contract with the caller: every event gates itself, so drawEvent can just
   concat this deck in with no extra eligibility rules. Every apply MUTATES
   the state and RETURNS the past tense log line the player reads after
   choosing. Ids are all prefixed lifeB_ so they never collide with deck A.
   ========================================================================== */
import type { CareerState, CareerEvent } from './nflMyCareer';
import { teamLabelOf } from './nflMyCareer';

/* Round 56 money and flag fields ride on the save object. Old saves predate
   them and some builds have not caught the engine interface up yet, so every
   read goes through this local view with a default and every write guards. */
type LifeState = CareerState & {
  netWorth?: number;
  dirtyMoney?: number;
  heat?: number;
  purchased?: string[];
  lifeFlags?: Record<string, number>;
};
const L = (c: CareerState): LifeState => c as LifeState;

const clamp = (v: number): number => Math.max(0, Math.min(100, v));
const money = (x: number): number => Math.round(x * 10) / 10;

const flag = (c: CareerState, k: string): number => (L(c).lifeFlags || {})[k] || 0;
const setFlag = (c: CareerState, k: string, v: number) => { L(c).lifeFlags = { ...(L(c).lifeFlags || {}), [k]: v }; };

/** Net worth, seeded from career earnings the first time a save touches it. */
const wealth = (c: CareerState): number => L(c).netWorth ?? money(c.earnings * 0.45);
const spend = (c: CareerState, amount: number) => { L(c).netWorth = money(wealth(c) - amount); };
const bank = (c: CareerState, amount: number) => { L(c).netWorth = money(wealth(c) + amount); };
/** Money that hits the career earnings line AND the bank account. */
const earn = (c: CareerState, amount: number) => { c.earnings = money(c.earnings + amount); bank(c, amount); };
const addHeat = (c: CareerState, d: number) => { L(c).heat = clamp((L(c).heat ?? 0) + d); };
const addDirty = (c: CareerState, d: number) => { L(c).dirtyMoney = money((L(c).dirtyMoney ?? 0) + d); };
const own = (c: CareerState, item: string) => { L(c).purchased = [...(L(c).purchased || []), item]; };

const bumpMorale = (c: CareerState, d: number) => { c.morale = clamp(c.morale + d); };
const bumpFan = (c: CareerState, d: number) => { c.fanbase = clamp(c.fanbase + d); };
const bumpHealth = (c: CareerState, d: number) => { c.health = clamp(c.health + d); };
const bumpOvr = (c: CareerState, d: number) => { c.ovr = Math.min(c.pot + 1, c.ovr + d); };

/* Local abbr list so this file imports nothing but types and teamLabelOf. */
const ABBRS = [
  'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN', 'DET', 'GB',
  'HOU', 'IND', 'JAX', 'KC', 'LA', 'LAC', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG',
  'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WAS',
];
const otherTeam = (c: CareerState, r: () => number): string => {
  const pool = ABBRS.filter(a => a !== c.team);
  return pool[Math.floor(r() * pool.length)];
};

export function getNflLifeEventsB(c: CareerState, rng: () => number): CareerEvent[] {
  const deck: CareerEvent[] = [];
  const yrs = c.seasons.length;
  const last = c.seasons[yrs - 1];
  const nw = wealth(c);
  const prevTeam = [...c.seasons].reverse().find(s => s.team !== c.team)?.team ?? '';

  /* ══════════ 1. FAMILY AND HOME ══════════ */

  if (yrs >= 1 && c.age >= 23 && flag(c, 'b_newborn') < 2) {
    deck.push({
      id: 'lifeB_newborn',
      title: 'The due date is a road Sunday',
      body: 'Your first kid is due Week 9, three time zones from the hospital. The doctor keeps repeating that babies do not read the schedule.',
      options: [
        {
          label: 'Fly home the second it starts', effect: 'Miss a game, be there',
          apply: (cc) => {
            setFlag(cc, 'b_newborn', flag(cc, 'b_newborn') + 1);
            spend(cc, 0.3); bumpMorale(cc, 14); bumpFan(cc, -4); bumpHealth(cc, 2);
            return 'You landed with forty minutes to spare. One game missed, one person gained, 0.3M on the charter. Morale +14, fanbase -4.';
          },
        },
        {
          label: 'Play, engine running in the tunnel', effect: 'Both, barely',
          apply: (cc) => {
            setFlag(cc, 'b_newborn', flag(cc, 'b_newborn') + 1);
            spend(cc, 0.4); bumpFan(cc, 7); bumpMorale(cc, 5);
            return 'Two scores, a jog to a running car, a 0.4M flight. You made it for the second hour. Fanbase +7, morale +5.';
          },
        },
        {
          label: 'Move everyone into the road hotel', effect: 'Expensive togetherness',
          apply: (cc) => {
            setFlag(cc, 'b_newborn', flag(cc, 'b_newborn') + 1);
            spend(cc, 0.8); bumpMorale(cc, 9); bumpHealth(cc, -3);
            return 'A 0.8M month of connected suites and zero sleep. Morale +9, health -3, and the team hotel now has a crib on the manifest.';
          },
        },
      ],
    });
  }

  if (yrs >= 2 && c.age >= 25 && flag(c, 'b_partnerCity') === 0) {
    deck.push({
      id: 'lifeB_partnerCity',
      title: 'They got the job',
      body: 'Your partner just landed the role they have been chasing since college. It is in a city with a different team in it.',
      options: [
        {
          label: 'Ask the front office to move you there', effect: 'Trade toward them',
          apply: (cc, r) => {
            setFlag(cc, 'b_partnerCity', 1);
            const nt = otherTeam(cc, r); cc.team = nt; cc.fanbase = 42; bumpMorale(cc, 12);
            return `You asked, and they moved you to ${teamLabelOf(nt)}. Same zip code, new playbook. Fanbase reset to 42, morale +12.`;
          },
        },
        {
          label: 'Do the long distance thing', effect: 'Flights and FaceTime',
          apply: (cc) => {
            setFlag(cc, 'b_partnerCity', 2); spend(cc, 0.6); bumpMorale(cc, -6);
            return 'Nine months of Tuesday flights and 0.6M in charters. You kept your locker. Morale -6.';
          },
        },
        {
          label: 'They pause it for a year', effect: 'Stability, quiet debt',
          apply: (cc) => {
            setFlag(cc, 'b_partnerCity', 3); setFlag(cc, 'b_owedOne', 1); bumpMorale(cc, 3);
            return 'They deferred the job for you. Morale +3, and a favor is now on the books that neither of you will forget.';
          },
        },
      ],
    });
  }

  if (yrs >= 2 && c.age >= 24 && flag(c, 'b_sibAgent') === 0) {
    deck.push({
      id: 'lifeB_siblingManager',
      title: 'Your brother has business cards now',
      body: 'They say MANAGER in a font he chose himself. He has already told two brands he speaks for you.',
      options: [
        {
          label: 'Hire him, full trust', effect: 'Family on payroll',
          apply: (cc, r) => {
            setFlag(cc, 'b_sibAgent', 1);
            if (r() < 0.45) { earn(cc, 1.2); bumpMorale(cc, 8); return 'He turned out to be very good at this. Closed 1.2M in deals in eleven months. Morale +8.'; }
            spend(cc, 0.9); addHeat(cc, 4); bumpMorale(cc, -6);
            return 'He spent 0.9M on a rebrand nobody asked for and an accountant you have never met. Morale -6, and Thanksgiving is going to be tense.';
          },
        },
        {
          label: 'Real job, under a real agency', effect: 'Supervised, safer',
          apply: (cc) => {
            setFlag(cc, 'b_sibAgent', 2); spend(cc, 0.3); bumpMorale(cc, 6);
            return 'He works marketing under your actual agent for 0.3M a year. He is thriving and nobody can lose your money. Morale +6.';
          },
        },
        {
          label: 'Say no, buy him a truck', effect: 'A no with a bow',
          apply: (cc) => {
            setFlag(cc, 'b_sibAgent', 3); spend(cc, 0.09); bumpMorale(cc, -3);
            return 'You said no and handed him keys to a 90k truck. He is still mad. He drives it every single day. Morale -3.';
          },
        },
      ],
    });
  }

  if (yrs >= 3 && flag(c, 'b_parentHome') === 0) {
    deck.push({
      id: 'lifeB_parentCloser',
      title: 'She keeps saying the word closer',
      body: 'Your mom has not asked you for a car, a house or a dime. She has asked, in every phone call for three months, if you could be closer.',
      options: [
        {
          label: 'Push for a team near home', effect: 'Trade toward home',
          apply: (cc, r) => {
            setFlag(cc, 'b_parentHome', 1);
            const nt = otherTeam(cc, r); cc.team = nt; cc.fanbase = 44; bumpMorale(cc, 12);
            return `You told your agent home was the priority and landed with ${teamLabelOf(nt)}. Fanbase reset to 44, morale +12.`;
          },
        },
        {
          label: 'Fly her out for every home game', effect: 'Miles, not moving',
          apply: (cc) => {
            setFlag(cc, 'b_parentHome', 2); spend(cc, 0.35); bumpMorale(cc, 7); bumpFan(cc, 3);
            return 'Nine home games, nine first class round trips, 0.35M a year. She knows the security guards by name now. Morale +7, fanbase +3.';
          },
        },
        {
          label: 'Buy a place ten minutes from her', effect: 'Offseason zip code',
          apply: (cc) => {
            setFlag(cc, 'b_parentHome', 3); spend(cc, 1.6); own(cc, 'Offseason house near mom'); bumpMorale(cc, 9);
            return 'A 1.6M house eleven minutes from her front door. Every February you eat dinner there on a Tuesday. Morale +9.';
          },
        },
      ],
    });
  }

  if (yrs >= 1 && c.fanbase >= 35 && flag(c, 'b_leak') === 0) {
    deck.push({
      id: 'lifeB_groupChatLeak',
      title: 'The family group chat leaked',
      body: 'A cousin screenshotted it. Your review of the offensive coordinator, that he has never seen a football and has only heard of one, is now a trending audio.',
      options: [
        {
          label: 'Own it on camera', effect: 'Fame up, coach cold',
          apply: (cc) => {
            setFlag(cc, 'b_leak', 1); bumpFan(cc, 12); bumpMorale(cc, -6);
            return 'You said it, you meant it, and you said it again into a microphone. Fanbase +12, morale -6, and you got zero targets scripted in the opener.';
          },
        },
        {
          label: 'Claim the phone was hacked', effect: 'Nobody believes you',
          apply: (cc) => {
            setFlag(cc, 'b_leak', 2); bumpFan(cc, -5); addHeat(cc, 6); bumpMorale(cc, 2);
            return 'You blamed a hacker. Nobody bought it, including your cousin, who was in the chat. Fanbase -5.';
          },
        },
        {
          label: 'Apologize to him privately and eat it', effect: 'Quiet repair',
          apply: (cc) => {
            setFlag(cc, 'b_leak', 3); bumpMorale(cc, 7); bumpFan(cc, -3); bumpOvr(cc, 1);
            return 'One closed door, one real apology, and now you sit in the game plan meetings on Wednesdays. Rating +1, morale +7, fanbase -3.';
          },
        },
      ],
    });
  }

  if ((nw >= 3 || c.earnings >= 12) && flag(c, 'b_house') === 0) {
    deck.push({
      id: 'lifeB_houseForSomeone',
      title: 'Somebody never pays rent again',
      body: 'The money is there to buy a person a house outright. The list of candidates turned out to be longer than you expected.',
      options: [
        {
          label: 'Buy your mother the house', effect: 'The big one',
          apply: (cc) => {
            setFlag(cc, 'b_house', 1); spend(cc, 2.2); own(cc, 'House for mom'); bumpMorale(cc, 14); bumpFan(cc, 8);
            return 'A 2.2M house and a set of keys in a gift bag from a gas station. She cried in the driveway for eleven minutes. Morale +14, fanbase +8.';
          },
        },
        {
          label: 'Modest place, invest the rest for her', effect: 'Boring and correct',
          apply: (cc) => {
            setFlag(cc, 'b_house', 2); spend(cc, 0.9); own(cc, 'Paid off family home'); bumpMorale(cc, 8);
            return 'A 0.9M house with no mortgage and a fund that pays her every month whether football works out or not. Morale +8.';
          },
        },
        {
          label: 'Four houses, one per sibling', effect: 'Whole family housed',
          apply: (cc) => {
            setFlag(cc, 'b_house', 3); spend(cc, 5.4); own(cc, 'Four family homes'); bumpMorale(cc, 18); bumpFan(cc, 10);
            return '5.4M gone in one afternoon of closings. Every sibling has an address now. Morale +18, fanbase +10, net worth considerably lighter.';
          },
        },
      ],
    });
  }

  if (yrs >= 2 && c.age >= 24 && flag(c, 'b_holiday') === 0) {
    deck.push({
      id: 'lifeB_familyHoliday',
      title: 'Forty two relatives, one bye week',
      body: 'They all want to come to your house. Someone has already asked whether the theater room has a lock on it.',
      options: [
        {
          label: 'Host every last one of them', effect: 'Chaos, love, cost',
          apply: (cc) => {
            setFlag(cc, 'b_holiday', 1); spend(cc, 0.3); bumpMorale(cc, 10); bumpHealth(cc, -3);
            return '0.3M of catering, air mattresses and one broken banister. Best week of your year. Morale +10, health -3.';
          },
        },
        {
          label: 'Book them a hotel, one big dinner', effect: 'Boundaries with a menu',
          apply: (cc) => {
            setFlag(cc, 'b_holiday', 2); spend(cc, 0.15); bumpMorale(cc, 5);
            return '0.15M on rooms and one enormous dinner. Two aunts will bring this up at every family event for a decade. Morale +5.';
          },
        },
        {
          label: 'Skip it, live in the film room', effect: 'Rating over relatives',
          apply: (cc) => {
            setFlag(cc, 'b_holiday', 3); bumpOvr(cc, 1); bumpMorale(cc, -6);
            return 'Nine days alone with the coaches tape. Rating +1, morale -6, and a voicemail you still have not returned.';
          },
        },
      ],
    });
  }

  /* ══════════ 2. LEGACY AND RECORDS ══════════ */

  const teamYards = c.seasons
    .filter(s => s.team === c.team)
    .reduce((n, s) => n + (s.passYds ?? 0) + (s.rushYds ?? 0) + (s.recYds ?? 0), 0);

  if (yrs >= 4 && teamYards >= 3000 && c.ovr >= 76 && flag(c, 'b_record') === 0) {
    deck.push({
      id: 'lifeB_franchiseRecord',
      title: '218 yards from the franchise record',
      body: `The ${teamLabelOf(c.team)} record is right there, and the seed is already locked. Week 18 means nothing to anybody except you.`,
      options: [
        {
          label: 'Play the whole game and take it', effect: 'Record, real risk',
          apply: (cc, r) => {
            setFlag(cc, 'b_record', 1); bumpFan(cc, 12); bumpMorale(cc, 6); bumpHealth(cc, -5);
            if (r() < 0.25) { bumpHealth(cc, -9); return 'You got the record in the fourth quarter and something in your ankle got a vote too. Fanbase +12, health -14.'; }
            return 'Franchise record, sixty minutes, no need for any of it. Fanbase +12, morale +6, health -5.';
          },
        },
        {
          label: 'Sit. January is the point.', effect: 'Rest for the run',
          apply: (cc) => {
            setFlag(cc, 'b_record', 2); bumpHealth(cc, 6); bumpMorale(cc, 4); bumpFan(cc, -5);
            return 'You wore a hoodie and held a clipboard. Health +6, morale +4, fanbase -5, and talk radio called you soft for one week.';
          },
        },
        {
          label: 'Get it in the first quarter, then sit', effect: 'Greedy but efficient',
          apply: (cc) => {
            setFlag(cc, 'b_record', 3); bumpFan(cc, 8); bumpMorale(cc, 3); bumpHealth(cc, -2);
            return 'Record broken with nine minutes left in the first, hoodie on by the second. Fanbase +8, health -2.';
          },
        },
      ],
    });
  }

  if (yrs >= 8 && (c.rings >= 1 || c.allPros >= 2 || c.fanbase >= 78) && flag(c, 'b_jersey') === 0) {
    deck.push({
      id: 'lifeB_jerseyRetirement',
      title: 'They want your number in the rafters',
      body: `${teamLabelOf(c.team)} have three ceremony dates and one very specific request about how long the speech can be.`,
      options: [
        {
          label: 'Halftime, keep it short', effect: 'Rafters, quick',
          apply: (cc) => {
            setFlag(cc, 'b_jersey', 1); bumpFan(cc, 14); bumpMorale(cc, 8);
            return 'Eleven minutes at halftime and your number goes up forever. Fanbase +14, morale +8.';
          },
        },
        {
          label: 'Home opener, free jerseys for the upper deck', effect: 'Enormous and expensive',
          apply: (cc) => {
            setFlag(cc, 'b_jersey', 2); spend(cc, 1.1); bumpFan(cc, 22); bumpMorale(cc, 10);
            return 'You paid 1.1M so 12,000 people in the cheap seats went home wearing your name. Fanbase +22, morale +10.';
          },
        },
        {
          label: 'Ask them to wait until you are done', effect: 'Not yet',
          apply: (cc) => {
            setFlag(cc, 'b_jersey', 3); bumpMorale(cc, 6); bumpFan(cc, 3); bumpOvr(cc, 1);
            return 'You told them a retired number on an active player feels like a eulogy. Rating +1, morale +6.';
          },
        },
      ],
    });
  }

  if (yrs >= 9 && c.age >= 31 && flag(c, 'b_hof') === 0) {
    deck.push({
      id: 'lifeB_hofPush',
      title: 'A firm that specializes in Canton',
      body: 'They say your case needs narrative support. They have a slide deck about you with a title font and everything.',
      options: [
        {
          label: 'Hire them, 1.5M', effect: 'Buying the narrative',
          apply: (cc) => {
            setFlag(cc, 'b_hof', 1); spend(cc, 1.5); bumpFan(cc, 10);
            return '1.5M on three years of documentaries, oral histories and very warm feature writing. Fanbase +10, and voters keep bringing up your third season.';
          },
        },
        {
          label: 'Let the tape argue', effect: 'Pride, pure',
          apply: (cc) => {
            setFlag(cc, 'b_hof', 2); bumpMorale(cc, 8);
            return 'You said if the film cannot do it, a press release should not. Morale +8, and your agent aged four years in that meeting.';
          },
        },
        {
          label: 'Call twelve voters yourself', effect: 'Awkward, effective',
          apply: (cc) => {
            setFlag(cc, 'b_hof', 3); bumpFan(cc, 6); bumpMorale(cc, -4);
            return 'Eleven pleasant calls and one voter who posted the voicemail. Fanbase +6, morale -4.';
          },
        },
      ],
    });
  }

  if (yrs >= 5 && c.age >= 28 && flag(c, 'b_heir') === 0) {
    deck.push({
      id: 'lifeB_mentorHeir',
      title: 'They drafted your replacement',
      body: `${teamLabelOf(c.team)} took your position in the first round. The kid has your rookie jersey framed in his apartment, which somehow makes it worse.`,
      options: [
        {
          label: 'Teach him everything you know', effect: 'Mentor, lose snaps',
          apply: (cc) => {
            setFlag(cc, 'b_heir', 1); bumpMorale(cc, 10); bumpFan(cc, 8); bumpHealth(cc, 3);
            return 'You gave him the whole notebook. Fanbase +8, morale +10, health +3 from the reps you handed over, and he thanked you on live TV.';
          },
        },
        {
          label: 'Freeze him out completely', effect: 'Cold war in the room',
          apply: (cc) => {
            setFlag(cc, 'b_heir', 2); bumpMorale(cc, -5); bumpFan(cc, -4); bumpOvr(cc, 1);
            return 'You did not say one word to him until December. Rating +1 from playing furious, morale -5, fanbase -4.';
          },
        },
        {
          label: 'Charge him for the lessons', effect: 'Billable mentorship',
          apply: (cc) => {
            setFlag(cc, 'b_heir', 3); earn(cc, 0.15); bumpMorale(cc, 3); bumpFan(cc, 6);
            return 'You invoiced a rookie 150k for offseason training. He paid it, he got better, and the story made you a legend. Fanbase +6.';
          },
        },
      ],
    });
  }

  if (yrs >= 9 && (c.rings >= 1 || c.mvps >= 1) && flag(c, 'b_statue') === 0) {
    deck.push({
      id: 'lifeB_statueDebate',
      title: 'The statue committee has notes',
      body: 'The city wants bronze outside the stadium. The sculptor sent eleven pose options and one of them is you screaming at a referee.',
      options: [
        {
          label: 'The iconic pose', effect: 'Bronze forever',
          apply: (cc) => {
            setFlag(cc, 'b_statue', 1); bumpFan(cc, 12); bumpMorale(cc, 6); own(cc, 'Bronze statue');
            return 'Nine feet of you doing the thing everybody remembers. Fanbase +12, morale +6.';
          },
        },
        {
          label: 'Screaming at the referee', effect: 'Honest bronze',
          apply: (cc) => {
            setFlag(cc, 'b_statue', 2); spend(cc, 0.05); bumpFan(cc, 18); bumpMorale(cc, 4); own(cc, 'Bronze statue');
            return 'The league fined you 50k for a statue. Fanbase +18. Children take pictures pointing at an imaginary official.';
          },
        },
        {
          label: 'Skip it, build a rec center', effect: 'Concrete over bronze',
          apply: (cc) => {
            setFlag(cc, 'b_statue', 3); spend(cc, 1.2); bumpFan(cc, 15); bumpMorale(cc, 12); own(cc, 'Rec center');
            return 'You turned down a statue and wrote 1.2M for two gyms and a homework room. Fanbase +15, morale +12.';
          },
        },
      ],
    });
  }

  if (yrs >= 8 && (c.age >= 33 || (c.pos === 'RB' && c.age >= 30)) && flag(c, 'b_tour') === 0) {
    deck.push({
      id: 'lifeB_retirementTour',
      title: 'Announce it, or just go quietly',
      body: 'Say this is the last one and every road stadium hands you a framed something. Say nothing and you get to play football without a receiving line.',
      options: [
        {
          label: 'Full farewell tour', effect: 'Gifts and goodbyes',
          apply: (cc) => {
            setFlag(cc, 'b_tour', 1); earn(cc, 1); bumpFan(cc, 16); bumpMorale(cc, 8);
            return 'Seventeen weeks of gifts, tributes and one team that gave you a canoe. 1M in tour merch, fanbase +16, morale +8.';
          },
        },
        {
          label: 'Say nothing, just play', effect: 'No circus',
          apply: (cc) => {
            setFlag(cc, 'b_tour', 2); bumpMorale(cc, 5); bumpOvr(cc, 1);
            return 'No announcement, no rocking chairs, no midfield ceremonies. Rating +1, morale +5.';
          },
        },
        {
          label: 'Tease it all year for the merch', effect: 'Milking it',
          apply: (cc) => {
            setFlag(cc, 'b_tour', 3); earn(cc, 2.2); bumpFan(cc, -6); bumpMorale(cc, -2);
            return 'Twelve weeks of maybe. 2.2M in merch, fanbase -6, and everyone got very tired of the question.';
          },
        },
      ],
    });
  }

  if (yrs >= 3 && c.ovr >= 80 && flag(c, 'b_top100') === 0) {
    deck.push({
      id: 'lifeB_top100Snub',
      title: 'Number 74 on the Top 100',
      body: 'Two guys you cover for a living came in the twenties. The list producer says it is a players vote, which is somehow worse.',
      options: [
        {
          label: 'Post the list, no caption', effect: 'Silent shade',
          apply: (cc) => {
            setFlag(cc, 'b_top100', 1); bumpFan(cc, 9); bumpMorale(cc, -3);
            return 'A screenshot and nothing else. Four million views by Tuesday. Fanbase +9, morale -3.';
          },
        },
        {
          label: 'Print it, tape it in your locker', effect: 'Fuel for the year',
          apply: (cc) => {
            setFlag(cc, 'b_top100', 2); bumpOvr(cc, 1); bumpMorale(cc, 6);
            return 'It lived above your locker all season and you looked at it every single day. Rating +1, morale +6.';
          },
        },
        {
          label: 'Call the analyst live on his show', effect: 'Live television chaos',
          apply: (cc) => {
            setFlag(cc, 'b_top100', 3); bumpFan(cc, 14); bumpMorale(cc, -6);
            return 'Eleven minutes of live radio and one host who kept saying we love you here. Fanbase +14, morale -6.';
          },
        },
      ],
    });
  }

  /* ══════════ 3. RIVALRIES ══════════ */

  if (yrs >= 2 && flag(c, 'b_nemesis') === 0) {
    const foe = c.pos === 'QB' ? 'an edge rusher' : 'a corner';
    deck.push({
      id: 'lifeB_nemesisDefender',
      title: 'He has your number',
      body: `There is ${foe} in your division who has genuinely solved you. Twice a year he makes you look like a camp body.`,
      options: [
        {
          label: 'Live in his tape all offseason', effect: 'Rating up, sanity down',
          apply: (cc) => {
            setFlag(cc, 'b_nemesis', 1); bumpOvr(cc, 1); bumpMorale(cc, -4);
            return 'Four hundred clips of one man. Rating +1, morale -4, and you now dream in his stance.';
          },
        },
        {
          label: 'Hire him as your training partner', effect: 'Sleeping with the enemy',
          apply: (cc) => {
            setFlag(cc, 'b_nemesis', 2); spend(cc, 0.25); bumpOvr(cc, 1); bumpMorale(cc, 8); bumpFan(cc, 6);
            return 'Six weeks in Miami at 0.25M. Rating +1, morale +8, fanbase +6, and he got better too, which nobody has mentioned out loud.';
          },
        },
        {
          label: 'Say his name in every interview', effect: 'Free rent, both ways',
          apply: (cc) => {
            setFlag(cc, 'b_nemesis', 3); bumpFan(cc, 10); bumpMorale(cc, -2);
            return 'You made him famous and he made you a segment. Fanbase +10, morale -2.';
          },
        },
      ],
    });
  }

  if (yrs >= 1 && flag(c, 'b_trash') < 2 && rng() < 0.7) {
    deck.push({
      id: 'lifeB_divisionTrashTalk',
      title: 'He did a whole podcast about you',
      body: 'A division rival spent forty minutes explaining that you are a system guy who runs excellent routes at the team buffet.',
      options: [
        {
          label: 'Answer with three paragraphs', effect: 'Fanbase up, bulletin board',
          apply: (cc) => {
            setFlag(cc, 'b_trash', flag(cc, 'b_trash') + 1); bumpFan(cc, 9); bumpMorale(cc, -3);
            return 'You typed for eleven minutes and posted it at 1am. Fanbase +9, morale -3, and it is now printed in their locker room.';
          },
        },
        {
          label: 'Say nothing, then go get 140', effect: 'Quiet violence',
          apply: (cc) => {
            setFlag(cc, 'b_trash', flag(cc, 'b_trash') + 1); bumpMorale(cc, 7); bumpOvr(cc, 1);
            return 'No comment all week. Then you took his afternoon apart on national television. Rating +1, morale +7.';
          },
        },
        {
          label: 'Mail him a signed jersey', effect: 'Petty legend',
          apply: (cc) => {
            setFlag(cc, 'b_trash', flag(cc, 'b_trash') + 1); spend(cc, 0.02); bumpFan(cc, 13); bumpMorale(cc, 3);
            return 'To my biggest fan, in silver marker, 20k in overnight shipping and a photographer. Fanbase +13.';
          },
        },
      ],
    });
  }

  if (yrs >= 3 && prevTeam && flag(c, 'b_oldFriend') === 0) {
    deck.push({
      id: 'lifeB_formerTeammate',
      title: 'He is on the other sideline now',
      body: 'The guy who sat next to you on every flight for four years lines up across from you on Sunday. You were in his wedding.',
      options: [
        {
          label: 'Long hug at midfield', effect: 'Soft, human, viral',
          apply: (cc) => {
            setFlag(cc, 'b_oldFriend', 1); bumpMorale(cc, 8); bumpFan(cc, 5);
            return 'Thirty seconds at midfield with eleven cameras on it. Morale +8, fanbase +5, and one radio guy called it soft.';
          },
        },
        {
          label: 'Nothing. No eye contact.', effect: 'Cold edge',
          apply: (cc) => {
            setFlag(cc, 'b_oldFriend', 2); bumpOvr(cc, 1); bumpMorale(cc, -4);
            return 'You walked past him like a stranger and played the best half of your season. Rating +1, morale -4.';
          },
        },
        {
          label: 'Dinner after, he pays', effect: 'Friendship survives',
          apply: (cc) => {
            setFlag(cc, 'b_oldFriend', 3); bumpMorale(cc, 12); bumpFan(cc, 3);
            return 'Two hours, one steak, zero football talk until the last ten minutes. Morale +12.';
          },
        },
      ],
    });
  }

  if (yrs >= 4 && flag(c, 'b_oldCoach') === 0) {
    deck.push({
      id: 'lifeB_coachWhoCutYou',
      title: 'The coach who wanted you cut',
      body: 'The position coach who told the front office you would be out of the league by 26 is now the coordinator across the field. He has requested a pregame handshake.',
      options: [
        {
          label: 'Run it up and stare at him', effect: 'Petty and public',
          apply: (cc) => {
            setFlag(cc, 'b_oldCoach', 1); bumpFan(cc, 11); bumpMorale(cc, 8);
            return 'You hung a career day on his defense and looked directly at him after every one. Fanbase +11, morale +8.';
          },
        },
        {
          label: 'Shake his hand, say nothing', effect: 'Class, quietly',
          apply: (cc) => {
            setFlag(cc, 'b_oldCoach', 2); bumpMorale(cc, 10); bumpFan(cc, 2);
            return 'A handshake, a nod, and nine years of being right about yourself. Morale +10.';
          },
        },
        {
          label: 'Mail him a framed jersey with the quote on it', effect: 'Framed receipts',
          apply: (cc) => {
            setFlag(cc, 'b_oldCoach', 3); spend(cc, 0.03); bumpFan(cc, 9); bumpMorale(cc, 6);
            return 'Your jersey, his exact words engraved on the mat, 30k with the framing. Fanbase +9, morale +6.';
          },
        },
      ],
    });
  }

  if (yrs >= 3 && prevTeam && flag(c, 'b_revenge') === 0) {
    deck.push({
      id: 'lifeB_revengeGame',
      title: 'They are coming to town',
      body: `${teamLabelOf(prevTeam)} decided you were replaceable. They are on the schedule in three weeks and everyone has noticed.`,
      options: [
        {
          label: 'Torch them and point at the owner box', effect: 'Loud revenge',
          apply: (cc) => {
            setFlag(cc, 'b_revenge', 1); bumpFan(cc, 14); bumpMorale(cc, 10);
            return 'Career day, then a long slow point at a man in a suite. Fanbase +14, morale +10.';
          },
        },
        {
          label: 'Treat it like Week 4', effect: 'Professional revenge',
          apply: (cc) => {
            setFlag(cc, 'b_revenge', 2); bumpMorale(cc, 6); bumpOvr(cc, 1);
            return 'You gave the media absolutely nothing and then quietly ended their season. Rating +1, morale +6.';
          },
        },
        {
          label: 'Buy a billboard in their city', effect: 'Expensive revenge',
          apply: (cc) => {
            setFlag(cc, 'b_revenge', 3); spend(cc, 0.25); bumpFan(cc, 12); bumpMorale(cc, 5);
            return '0.25M for eight weeks of your face on the freeway they all drive to work. Fanbase +12.';
          },
        },
      ],
    });
  }

  if (yrs >= 5 && flag(c, 'b_rivalTeammate') === 0 && rng() < 0.8) {
    deck.push({
      id: 'lifeB_rivalSignsHere',
      title: 'Your rival just signed here',
      body: `The man who has been talking about you for six straight years is now a ${teamLabelOf(c.team)}. His locker is two down from yours.`,
      options: [
        {
          label: 'First man to dap him up', effect: 'Room stays whole',
          apply: (cc) => {
            setFlag(cc, 'b_rivalTeammate', 1); bumpMorale(cc, 9); bumpFan(cc, 5);
            return 'You met him at the door and killed it in front of everybody. Morale +9, fanbase +5.';
          },
        },
        {
          label: 'Make him earn it', effect: 'Tension, edge',
          apply: (cc) => {
            setFlag(cc, 'b_rivalTeammate', 2); bumpMorale(cc, -4); bumpFan(cc, -2); bumpOvr(cc, 1);
            return 'Six weeks of silence in a shared position room. Rating +1 from the competition, morale -4.';
          },
        },
        {
          label: 'Start a podcast with him that week', effect: 'Monetize the beef',
          apply: (cc) => {
            setFlag(cc, 'b_rivalTeammate', 3); earn(cc, 1.6); bumpFan(cc, 12); bumpMorale(cc, 4);
            return 'Two enemies, one microphone, 1.6M in year one. Fanbase +12.';
          },
        },
      ],
    });
  }

  /* ══════════ 4. BUSINESS AND INVESTING ══════════ */

  if (yrs >= 2 && nw >= 1.5 && flag(c, 'b_food') === 0) {
    deck.push({
      id: 'lifeB_restaurantFranchise',
      title: 'Wings at scale',
      body: 'A franchise group wants you as a multi unit owner. The pitch deck says athlete equity nine separate times.',
      options: [
        {
          label: 'Three locations, 2.4M', effect: 'Wings at scale',
          apply: (cc, r) => {
            setFlag(cc, 'b_food', 1); spend(cc, 2.4); own(cc, 'Three wing franchises');
            if (r() < 0.55) { bank(cc, 3.6); return 'All three print. 2.4M in, 3.6M back in the first year, and free wings for life. Net worth up.'; }
            return 'Two of the three bled out by August. 2.4M gone and you now know every food distributor in the state by first name.';
          },
        },
        {
          label: 'Buy one and actually run it', effect: 'One store, real work',
          apply: (cc) => {
            setFlag(cc, 'b_food', 2); spend(cc, 0.9); bank(cc, 1.4); own(cc, 'One wing store'); bumpMorale(cc, -5);
            return 'You did the schedule yourself every Sunday night. 0.9M in, 1.4M out over three years, morale -5 because payroll is not a hobby.';
          },
        },
        {
          label: 'Let your cousin run the register', effect: 'Cash business, obviously',
          apply: (cc) => {
            setFlag(cc, 'b_food', 3); spend(cc, 0.9); addDirty(cc, 0.6); addHeat(cc, 8); bumpMorale(cc, 2);
            return 'The store does 0.6M a year that nobody can quite explain. Heat +8. Your accountant has started emailing in all caps.';
          },
        },
      ],
    });
  }

  if (yrs >= 2 && nw >= 1 && flag(c, 'b_tech') === 0) {
    deck.push({
      id: 'lifeB_techPitch',
      title: 'A founder in a vest',
      body: 'He wants 1.5M for an app that lets you tip your barber in crypto. He has never, in his life, had a barber.',
      options: [
        {
          label: 'Write the 1.5M check', effect: 'Lottery ticket',
          apply: (cc, r) => {
            setFlag(cc, 'b_tech', 1); spend(cc, 1.5);
            if (r() < 0.18) { bank(cc, 14); return 'A bank bought them for parts and your 1.5M came back as 14M. You have told this story at every dinner since.'; }
            return 'They ran out of money in nine months. 1.5M gone, and you still get the newsletter.';
          },
        },
        {
          label: 'Put in 0.2M to stay in the room', effect: 'Cheap seat, real access',
          apply: (cc, r) => {
            setFlag(cc, 'b_tech', 2); spend(cc, 0.2); bumpFan(cc, 2);
            if (r() < 0.18) { bank(cc, 1.9); return '0.2M turned into 1.9M and, more importantly, into four other rooms you would never have been invited to.'; }
            return 'The 0.2M evaporated but the group chat did not. You get shown every deal in the valley now.';
          },
        },
        {
          label: 'Pass, buy the whole market instead', effect: 'Boring compounding',
          apply: (cc) => {
            setFlag(cc, 'b_tech', 3);
            const gain = money(Math.max(0.2, wealth(cc) * 0.06)); bank(cc, gain); bumpMorale(cc, 3);
            return `You bought index funds like a substitute teacher and made ${gain}M doing nothing. Morale +3.`;
          },
        },
      ],
    });
  }

  if (yrs >= 4 && c.fanbase >= 45 && flag(c, 'b_academy') === 0) {
    deck.push({
      id: 'lifeB_trainingAcademy',
      title: 'Every parent in the area code',
      body: 'They all want their kid trained by you specifically. You could turn that into an actual building with your name on it.',
      options: [
        {
          label: 'Build the facility, 3M', effect: 'Bricks and turf',
          apply: (cc) => {
            setFlag(cc, 'b_academy', 1); spend(cc, 3); own(cc, 'Training academy'); bumpFan(cc, 14); bumpMorale(cc, 10);
            return '3M for turf, a weight room and a wall of your own highlights. 400 kids a summer. Fanbase +14, morale +10.';
          },
        },
        {
          label: 'License your name to a chain', effect: 'Passive money',
          apply: (cc) => {
            setFlag(cc, 'b_academy', 2); earn(cc, 1.2); bumpFan(cc, 5); bumpMorale(cc, -3);
            return '1.2M to put your name on 40 gyms you have never visited. Morale -3 the first time you visited one.';
          },
        },
        {
          label: 'Free camp every June instead', effect: 'No revenue, huge love',
          apply: (cc) => {
            setFlag(cc, 'b_academy', 3); spend(cc, 0.4); bumpFan(cc, 18); bumpMorale(cc, 12);
            return '0.4M a year, 900 kids, zero dollars charged. Fanbase +18, morale +12.';
          },
        },
      ],
    });
  }

  if (yrs >= 3 && c.fanbase >= 50 && flag(c, 'b_pod') === 0) {
    deck.push({
      id: 'lifeB_podcastNetwork',
      title: 'Three year podcast money',
      body: 'A network offers a guarantee. Building your own studio pays more, if anyone actually listens.',
      options: [
        {
          label: 'Sign the network deal, 2.5M', effect: 'Guaranteed money',
          apply: (cc) => {
            setFlag(cc, 'b_pod', 1); earn(cc, 2.5); bumpFan(cc, 8); bumpMorale(cc, -3);
            return '2.5M guaranteed and a Tuesday you no longer own. Fanbase +8, morale -3.';
          },
        },
        {
          label: 'Build your own studio, own it all', effect: 'Risk, real upside',
          apply: (cc, r) => {
            setFlag(cc, 'b_pod', 2); spend(cc, 1.4); own(cc, 'Podcast studio');
            if (r() < 0.45) { bank(cc, 6.5); bumpFan(cc, 16); return '1.4M in glass and microphones turned into 6.5M and a top ten show. Fanbase +16.'; }
            bumpFan(cc, 4);
            return '1.4M for a beautiful room that 11,000 people listen to. Fanbase +4, and the guest bookings are getting better.';
          },
        },
        {
          label: 'Stay a guest, no schedule', effect: 'Time protected',
          apply: (cc) => {
            setFlag(cc, 'b_pod', 3); bumpMorale(cc, 6); bumpHealth(cc, 3);
            return 'No studio, no calendar, no producer texting you at 6am. Morale +6, health +3.';
          },
        },
      ],
    });
  }

  if (yrs >= 2 && c.fanbase >= 40 && flag(c, 'b_cards') === 0) {
    deck.push({
      id: 'lifeB_tradingCards',
      title: '25,000 autographs in eleven weeks',
      body: 'A card company has the contract drawn up. Your wrist is already suspicious of this arrangement.',
      options: [
        {
          label: 'Sign all 25,000', effect: 'Wrist money',
          apply: (cc) => {
            setFlag(cc, 'b_cards', 1); earn(cc, 3); bumpHealth(cc, -3); bumpMorale(cc, -5);
            return '3M and eleven weeks of signing through movies, flights and one funeral. Health -3, morale -5.';
          },
        },
        {
          label: 'Sign 5,000 and price them like art', effect: 'Scarcity play',
          apply: (cc) => {
            setFlag(cc, 'b_cards', 2); earn(cc, 1.4); bumpFan(cc, 6);
            return '1.4M for a fifth of the work and a secondary market that went insane. Fanbase +6.';
          },
        },
        {
          label: 'Launch your own card brand', effect: 'Own the print run',
          apply: (cc, r) => {
            setFlag(cc, 'b_cards', 3); spend(cc, 0.8); own(cc, 'Trading card brand');
            if (r() < 0.4) { bank(cc, 3.4); bumpFan(cc, 10); return 'Your first print run sold out in ninety seconds. 0.8M in, 3.4M back. Fanbase +10.'; }
            bank(cc, 0.3);
            return 'You now personally own 61,000 unsold cards of your own face. 0.8M in, 0.3M back, one very full garage.';
          },
        },
      ],
    });
  }

  if (yrs >= 5 && nw >= 4 && flag(c, 'b_club') === 0) {
    deck.push({
      id: 'lifeB_lowerLeagueClub',
      title: 'Two clubs are for sale',
      body: 'A USL side with 6,000 real supporters, or an English non league club with a pub physically attached to the ground.',
      options: [
        {
          label: 'Buy 20 percent of the USL club', effect: 'Minority owner',
          apply: (cc) => {
            setFlag(cc, 'b_club', 1); spend(cc, 2.5); own(cc, 'USL minority stake'); bumpFan(cc, 8); bumpMorale(cc, 8);
            return '2.5M for a fifth of a soccer team and a seat where you can hear the drums. Fanbase +8, morale +8.';
          },
        },
        {
          label: 'Buy the English club outright', effect: 'Chairman chaos',
          apply: (cc) => {
            setFlag(cc, 'b_club', 2); spend(cc, 1.8); own(cc, 'English non league club'); bumpMorale(cc, 12); bumpFan(cc, 10);
            return '1.8M made you a chairman of a seventh tier club with 41 season ticket holders and the best pub in the county. Morale +12, fanbase +10.';
          },
        },
        {
          label: 'Skip it, buy a suite', effect: 'Fan, not owner',
          apply: (cc) => {
            setFlag(cc, 'b_club', 3); spend(cc, 0.15); bumpMorale(cc, 4);
            return '0.15M a year for a box, zero payroll, zero relegation anxiety. Morale +4.';
          },
        },
      ],
    });
  }

  /* ══════════ 5. OFF SEASON LIFE ══════════ */

  if (yrs >= 1 && flag(c, 'b_vacay') === 0) {
    deck.push({
      id: 'lifeB_vacationPhoto',
      title: 'The catamaran photo exists',
      body: 'In it you are holding a jet ski helmet and a wedding cake that belongs to somebody else. You do not know whose wedding it was.',
      options: [
        {
          label: 'Post it yourself with a caption', effect: 'Own the chaos',
          apply: (cc) => {
            setFlag(cc, 'b_vacay', 1); bumpFan(cc, 13); bumpMorale(cc, 3);
            return 'You posted it before anyone could sell it. Fanbase +13, and the GM sent one text that just said call me.';
          },
        },
        {
          label: 'Get it taken down', effect: 'Clean image, small cost',
          apply: (cc) => {
            setFlag(cc, 'b_vacay', 2); spend(cc, 0.1); bumpFan(cc, -4); bumpMorale(cc, 4);
            return '0.1M to a firm that makes photos disappear. Fanbase -4, morale +4, and it worked, mostly.';
          },
        },
        {
          label: 'Say nothing, let it die', effect: 'Wait it out',
          apply: (cc) => {
            setFlag(cc, 'b_vacay', 3); bumpFan(cc, 5); bumpMorale(cc, -1);
            return 'You never addressed it once. Fanbase +5, and a reporter asked about the cake at every camp for two years.';
          },
        },
      ],
    });
  }

  if (c.fanbase >= 40 && flag(c, 'b_golf') === 0) {
    deck.push({
      id: 'lifeB_celebGolf',
      title: 'The Saturday celebrity group',
      body: 'You, an actor, a country singer, and a man who owns 400 car washes. Cameras on every hole.',
      options: [
        {
          label: 'Play it straight, win the thing', effect: 'Trophy for charity',
          apply: (cc) => {
            setFlag(cc, 'b_golf', 1); earn(cc, 0.4); bumpFan(cc, 8); bumpMorale(cc, 6);
            return 'You won by two and sent the 0.4M purse straight to a school district. Fanbase +8, morale +6.';
          },
        },
        {
          label: 'Back nine barefoot with a speaker', effect: 'Viral, unserious',
          apply: (cc) => {
            setFlag(cc, 'b_golf', 2); spend(cc, 0.02); bumpFan(cc, 16); bumpMorale(cc, 8);
            return 'A 20k fine from the tournament and the best eleven seconds of internet all June. Fanbase +16, morale +8.';
          },
        },
        {
          label: 'Skip it and train', effect: 'Rating over rounds',
          apply: (cc) => {
            setFlag(cc, 'b_golf', 3); bumpOvr(cc, 1); bumpHealth(cc, 2);
            return 'You worked while everyone else played a scramble. Rating +1, health +2.';
          },
        },
      ],
    });
  }

  if ((c.ovr >= 85 || c.mvps >= 1 || c.allPros >= 1) && flag(c, 'b_cover') === 0) {
    deck.push({
      id: 'lifeB_gameCover',
      title: 'They want you on the cover',
      body: 'The video game called. Everyone you have ever met has already brought up the curse, unprompted, within one hour.',
      options: [
        {
          label: 'Take the cover and the 4M', effect: 'Money, cursed',
          apply: (cc) => {
            setFlag(cc, 'b_cover', 1); earn(cc, 4); bumpFan(cc, 15); bumpHealth(cc, -4); bumpMorale(cc, 5);
            return '4M and your face on eleven million shelves. Fanbase +15, health -4, and yes, everyone will blame the cover.';
          },
        },
        {
          label: 'Take 3.5M, demand a curse clause', effect: 'Legally uncursed',
          apply: (cc) => {
            setFlag(cc, 'b_cover', 2); earn(cc, 3.5); bumpFan(cc, 12); bumpMorale(cc, 8);
            return 'Their legal team had to define the word curse in a contract. 3.5M, fanbase +12, morale +8.';
          },
        },
        {
          label: 'Decline, stay off the box', effect: 'Superstition wins',
          apply: (cc) => {
            setFlag(cc, 'b_cover', 3); bumpMorale(cc, 6); bumpOvr(cc, 1); bumpHealth(cc, 2);
            return 'You turned down four million dollars because of a rumor. Rating +1, health +2, morale +6.';
          },
        },
      ],
    });
  }

  if (c.fanbase >= 55 && flag(c, 'b_reality') === 0) {
    deck.push({
      id: 'lifeB_realityCameo',
      title: 'Three weeks on an island',
      body: 'A survival show wants you, a former Olympic swimmer and a working magician. Filming ends nine days before camp.',
      options: [
        {
          label: 'Do the island', effect: 'Fame, weight loss',
          apply: (cc) => {
            setFlag(cc, 'b_reality', 1); earn(cc, 1.5); bumpFan(cc, 18); bumpHealth(cc, -6); bumpMorale(cc, 4);
            return '1.5M, nineteen pounds gone, and one magician who was genuinely useful. Fanbase +18, health -6.';
          },
        },
        {
          label: 'Guest judge a baking show instead', effect: 'Air conditioning',
          apply: (cc) => {
            setFlag(cc, 'b_reality', 2); earn(cc, 0.4); bumpFan(cc, 7); bumpMorale(cc, 6);
            return '0.4M for two days of tasting cake in a cold studio. Fanbase +7, morale +6. Easiest money of your life.';
          },
        },
        {
          label: 'Decline, sleep for three weeks', effect: 'Recovery block',
          apply: (cc) => {
            setFlag(cc, 'b_reality', 3); bumpHealth(cc, 8); bumpMorale(cc, 5);
            return 'You did nothing at all for 21 days and arrived at camp brand new. Health +8, morale +5.';
          },
        },
      ],
    });
  }

  if (c.age >= 24 && flag(c, 'b_cook') === 0) {
    deck.push({
      id: 'lifeB_learningToCook',
      title: 'Your signature dish is a shake',
      body: 'A protein shake with a banana in it. Your partner has started describing this to other people as a personality.',
      options: [
        {
          label: 'Hire a private chef', effect: 'Outsourced nutrition',
          apply: (cc) => {
            setFlag(cc, 'b_cook', 1); spend(cc, 0.6); bumpHealth(cc, 7); bumpMorale(cc, 4);
            return '0.6M a year and you have not opened your own fridge since March. Health +7, morale +4.';
          },
        },
        {
          label: 'Take real classes twice a week', effect: 'Skill for life',
          apply: (cc) => {
            setFlag(cc, 'b_cook', 2); spend(cc, 0.05); bumpHealth(cc, 5); bumpMorale(cc, 8); bumpFan(cc, 4);
            return 'Fifty grand of classes and now you can actually cook. The kitchen videos did 30 million views. Health +5, morale +8, fanbase +4.';
          },
        },
        {
          label: 'Stay on facility food, live in film', effect: 'Rating over recipes',
          apply: (cc) => {
            setFlag(cc, 'b_cook', 3); bumpOvr(cc, 1); bumpHealth(cc, -2);
            return 'Three meals a day from the same steam tray for eight months. Rating +1, health -2.';
          },
        },
      ],
    });
  }

  if ((yrs >= 4 || c.earnings >= 15) && flag(c, 'b_charity') === 0) {
    deck.push({
      id: 'lifeB_foundationLaunch',
      title: 'The foundation question',
      body: 'You want to start one. Everyone in the room has a strong opinion about how much of your own money should actually be in it.',
      options: [
        {
          label: 'Fund it properly, 2M and a real director', effect: 'Real money, real work',
          apply: (cc) => {
            setFlag(cc, 'b_charity', 1); spend(cc, 2); own(cc, 'Foundation'); bumpFan(cc, 20); bumpMorale(cc, 14);
            return '2M, a director who has done this for twenty years, and 1,900 kids served in year one. Fanbase +20, morale +14.';
          },
        },
        {
          label: 'Start at 0.4M and grow it', effect: 'Sustainable good',
          apply: (cc) => {
            setFlag(cc, 'b_charity', 2); spend(cc, 0.4); own(cc, 'Foundation'); bumpFan(cc, 9); bumpMorale(cc, 8);
            return '0.4M, one program, done well. Fanbase +9, morale +8, and it still exists in twenty years.';
          },
        },
        {
          label: 'Lend your name, let sponsors fund it', effect: 'Free, and hollow',
          apply: (cc) => {
            setFlag(cc, 'b_charity', 3); bumpFan(cc, 7); bumpMorale(cc, -5);
            return 'Your name, their money, one photo op a year. Fanbase +7, morale -5, and you know exactly why.';
          },
        },
      ],
    });
  }

  /* ══════════ 6. GENUINELY WEIRD FOOTBALL LIFE ══════════ */

  if (yrs >= 1 && flag(c, 'b_goat') === 0 && rng() < 0.85) {
    deck.push({
      id: 'lifeB_goatMascot',
      title: 'The owner bought a goat',
      body: 'A live one. His name is Gary. Gary has eaten a playbook, a glove and most of a hydration cart.',
      options: [
        {
          label: 'Adopt Gary as your responsibility', effect: 'Goat dad',
          apply: (cc) => {
            setFlag(cc, 'b_goat', 1); spend(cc, 0.05); bumpFan(cc, 12); bumpMorale(cc, 9);
            return 'You pay 50k a year in hay and vet bills for a goat that is not legally yours. Fanbase +12, morale +9.';
          },
        },
        {
          label: 'Lobby to send Gary to a farm', effect: 'Sensible, unpopular',
          apply: (cc) => {
            setFlag(cc, 'b_goat', 2); bumpFan(cc, -7); bumpMorale(cc, 3); bumpHealth(cc, 2);
            return 'Gary lives on nine acres now and the facility no longer smells like a barn. Fanbase -7, health +2, equipment staff owe you their lives.';
          },
        },
        {
          label: 'Put Gary in your commercial', effect: 'Goat money',
          apply: (cc) => {
            setFlag(cc, 'b_goat', 3); earn(cc, 0.8); bumpFan(cc, 16);
            return '0.8M for a truck ad co starring a goat who ate the prop check on take four. Fanbase +16.';
          },
        },
      ],
    });
  }

  if (c.fanbase >= 60 && flag(c, 'b_namefan') === 0) {
    deck.push({
      id: 'lifeB_nameChangeFan',
      title: 'A man in Ohio changed his name to yours',
      body: 'Legally. Forty one years old, three kids. His wife found out from the mail.',
      options: [
        {
          label: 'Fly him out, jersey, field passes', effect: 'Wholesome, viral',
          apply: (cc) => {
            setFlag(cc, 'b_namefan', 1); spend(cc, 0.06); bumpFan(cc, 14); bumpMorale(cc, 7);
            return '60k for flights, seats and a jersey with a name that is now legally both of yours. Fanbase +14, morale +7.';
          },
        },
        {
          label: 'Have your lawyer send a letter', effect: 'Safe and cold',
          apply: (cc) => {
            setFlag(cc, 'b_namefan', 2); spend(cc, 0.04); bumpFan(cc, -8); bumpMorale(cc, 5);
            return '40k in legal and one very sad reply email. Fanbase -8, morale +5, and you sleep fine now.';
          },
        },
        {
          label: 'Hire him as your assistant', effect: 'Two of you now',
          apply: (cc) => {
            setFlag(cc, 'b_namefan', 3); spend(cc, 0.2); bumpFan(cc, 18); bumpMorale(cc, 6);
            return '0.2M a year for an assistant with your exact legal name, which has broken three separate airline systems. Fanbase +18.';
          },
        },
      ],
    });
  }

  if (yrs >= 2 && flag(c, 'b_psychic') === 0 && rng() < 0.8) {
    deck.push({
      id: 'lifeB_ownerPsychic',
      title: 'The owner hired a psychic',
      body: 'She sits in on install meetings and has firm opinions about the third down package. The coordinator has stopped arguing.',
      options: [
        {
          label: 'Take the reading', effect: 'Coin flip for the soul',
          apply: (cc, r) => {
            setFlag(cc, 'b_psychic', 1);
            if (r() < 0.5) { bumpMorale(cc, 12); return 'She said you win a ring in a cold city with a coach you have not met yet. Morale +12. You think about it constantly.'; }
            bumpMorale(cc, -8); bumpFan(cc, 2);
            return 'She named the exact age your career ends and then refused to explain. Morale -8, and you have not slept right since.';
          },
        },
        {
          label: 'Refuse, get labeled difficult', effect: 'Film over fortune',
          apply: (cc) => {
            setFlag(cc, 'b_psychic', 2); bumpOvr(cc, 1); bumpMorale(cc, -3);
            return 'You walked out and watched tape instead. Rating +1, morale -3, and the owner used the word attitude twice.';
          },
        },
        {
          label: 'Pay her privately about your contract', effect: 'Expensive advice',
          apply: (cc) => {
            setFlag(cc, 'b_psychic', 3); spend(cc, 0.03); bumpMorale(cc, 6);
            return '30k for a private session in which she told you to ask for more money. She was correct. Morale +6.';
          },
        },
      ],
    });
  }

  if (yrs >= 2 && flag(c, 'b_ghost') === 0 && rng() < 0.8) {
    deck.push({
      id: 'lifeB_lockerRoomGhost',
      title: 'The equipment room is haunted',
      body: 'Three rookies swear it is a linebacker from 1974. The equipment manager will not deny it, which is somehow much worse.',
      options: [
        {
          label: 'Sleep in the facility overnight', effect: 'Content, no sleep',
          apply: (cc) => {
            setFlag(cc, 'b_ghost', 1); bumpFan(cc, 13); bumpHealth(cc, -3); bumpMorale(cc, 6);
            return 'Nine hours, four cameras, one genuinely unexplained noise at 3:40am. Fanbase +13, health -3.';
          },
        },
        {
          label: 'Sage ceremony with a bluetooth speaker', effect: 'Vibes restored',
          apply: (cc) => {
            setFlag(cc, 'b_ghost', 2); spend(cc, 0.01); bumpMorale(cc, 8); bumpFan(cc, 6);
            return '10k of sage, one speaker, and the entire starting defense holding hands. Morale +8, fanbase +6.';
          },
        },
        {
          label: 'Move your locker across the room', effect: 'Coward, comfortable',
          apply: (cc) => {
            setFlag(cc, 'b_ghost', 3); bumpMorale(cc, -3); bumpHealth(cc, 3); bumpFan(cc, -2);
            return 'You moved and never explained why. The new spot is next to the heater, which rules. Health +3, morale -3.';
          },
        },
      ],
    });
  }

  if (c.fanbase >= 45 && flag(c, 'b_proposal') === 0) {
    deck.push({
      id: 'lifeB_stadiumProposal',
      title: 'He wants you to carry the ring',
      body: 'A season ticket holder has diagrammed a midfield proposal like a red zone play. He has sent you three versions of the diagram.',
      options: [
        {
          label: 'Full production, jumbotron, everything', effect: 'Enormous, risky',
          apply: (cc, r) => {
            setFlag(cc, 'b_proposal', 1);
            if (r() < 0.8) { bumpFan(cc, 15); bumpMorale(cc, 8); return 'She said yes, 68,000 people lost their minds, and you were in the middle of it. Fanbase +15, morale +8.'; }
            bumpFan(cc, 3); bumpMorale(cc, -5);
            return 'She said no on the jumbotron and the internet decided it was somehow your fault. Fanbase +3, morale -5.';
          },
        },
        {
          label: 'Hand it over in the tunnel, no cameras', effect: 'Safe and kind',
          apply: (cc) => {
            setFlag(cc, 'b_proposal', 2); bumpFan(cc, 6); bumpMorale(cc, 8);
            return 'Two people, one tunnel, zero cameras. They still send you a Christmas card. Fanbase +6, morale +8.';
          },
        },
        {
          label: 'No. Warmups are sacred.', effect: 'Routine protected',
          apply: (cc) => {
            setFlag(cc, 'b_proposal', 3); bumpOvr(cc, 1); bumpMorale(cc, 4); bumpFan(cc, -4);
            return 'You said your pregame is a religion and you do not do weddings. Rating +1, fanbase -4.';
          },
        },
      ],
    });
  }

  if (yrs >= 1 && flag(c, 'b_raccoon') === 0 && rng() < 0.85) {
    deck.push({
      id: 'lifeB_facilityRaccoon',
      title: 'There is a raccoon in the ceiling',
      body: 'Nine days now. He has a name. It is Bandit and he is 3-0 against the strength staff.',
      options: [
        {
          label: 'Adopt Bandit as the lucky charm', effect: 'Mascot upgrade',
          apply: (cc) => {
            setFlag(cc, 'b_raccoon', 1); bumpFan(cc, 12); bumpMorale(cc, 9); bumpHealth(cc, -2);
            return 'Bandit has a bowl, a locker nameplate and an undefeated record in the tunnel. Fanbase +12, morale +9, health -2.';
          },
        },
        {
          label: 'Call animal control quietly', effect: 'Clean and boring',
          apply: (cc) => {
            setFlag(cc, 'b_raccoon', 2); bumpHealth(cc, 4); bumpMorale(cc, -4); bumpFan(cc, -3);
            return 'Bandit was relocated to a state park. Health +4, morale -4, and two linemen have not forgiven you.';
          },
        },
        {
          label: 'Give Bandit his own account', effect: 'Content empire',
          apply: (cc) => {
            setFlag(cc, 'b_raccoon', 3); earn(cc, 0.3); bumpFan(cc, 17); bumpHealth(cc, -3);
            return 'Bandit has 1.4 million followers and a snack sponsorship worth 0.3M. Fanbase +17, health -3.';
          },
        },
      ],
    });
  }

  if (yrs >= 2 && flag(c, 'b_ritual') === 0 && rng() < 0.8) {
    deck.push({
      id: 'lifeB_taquitoRitual',
      title: 'The gas station taquito',
      body: 'You ate one before a three touchdown game. Now nine grown men require the taquito. The team nutritionist has stopped attending meetings.',
      options: [
        {
          label: 'Commit fully to the taquito', effect: 'Ritual over nutrition',
          apply: (cc) => {
            setFlag(cc, 'b_ritual', 1); bumpMorale(cc, 10); bumpFan(cc, 8); bumpHealth(cc, -4);
            return 'Seventeen weeks, seventeen taquitos, one very concerned team doctor. Morale +10, fanbase +8, health -4.';
          },
        },
        {
          label: 'Have the chef make a clean replica', effect: 'Science wins',
          apply: (cc) => {
            setFlag(cc, 'b_ritual', 2); spend(cc, 0.04); bumpHealth(cc, 4); bumpMorale(cc, -4);
            return '40k for a chef built replica that everybody in the room knew was fake by Week 2. Health +4, morale -4.';
          },
        },
        {
          label: 'Sell taquito merch', effect: 'Monetize the myth',
          apply: (cc) => {
            setFlag(cc, 'b_ritual', 3); earn(cc, 0.6); bumpFan(cc, 12); bumpHealth(cc, -2);
            return '0.6M in shirts with a taquito on them. Fanbase +12, and the gas station chain named a location after you.';
          },
        },
      ],
    });
  }

  /* ══════════ 7. CONTRACT AND CAREER FORKS ══════════ */

  if (yrs >= 3 && c.contractYears >= 1 && c.morale >= 45 && c.morale < 78
      && last && last.teamResult === 'Missed the playoffs' && flag(c, 'b_traderq') === 0) {
    deck.push({
      id: 'lifeB_tradeRequest',
      title: 'You have the leverage to ask out',
      body: `Another January at home. You can force your way off ${teamLabelOf(c.team)} and lose every person who bought your jersey.`,
      options: [
        {
          label: 'Request it publicly', effect: 'Exit, loudly',
          apply: (cc, r) => {
            setFlag(cc, 'b_traderq', 1);
            const nt = otherTeam(cc, r); cc.team = nt; cc.fanbase = 38; bumpMorale(cc, 14);
            return `You said it on your own podcast and were a ${teamLabelOf(nt)} nine days later. Fanbase reset to 38, morale +14.`;
          },
        },
        {
          label: 'Request it privately, let them shop you', effect: 'Quiet exit',
          apply: (cc, r) => {
            setFlag(cc, 'b_traderq', 2);
            if (r() < 0.55) { const nt = otherTeam(cc, r); cc.team = nt; cc.fanbase = 46; bumpMorale(cc, 10); return `A quiet call, a quiet deal, and you woke up a ${teamLabelOf(nt)}. Fanbase 46, morale +10.`; }
            bumpMorale(cc, -4); bumpFan(cc, 2);
            return 'They said no and it never leaked. You are still here and they know exactly how you feel. Morale -4.';
          },
        },
        {
          label: 'Withdraw it and lead', effect: 'Captain money',
          apply: (cc) => {
            setFlag(cc, 'b_traderq', 3); bumpMorale(cc, 8); bumpFan(cc, 12); bumpOvr(cc, 1);
            return 'You told the room you were staying and then ran the entire offseason program. Rating +1, fanbase +12, morale +8.';
          },
        },
      ],
    });
  }

  if (c.salary >= 8 && c.contractYears >= 1 && flag(c, 'b_restructure') === 0) {
    const cut = money(c.salary * 0.25);
    deck.push({
      id: 'lifeB_capRestructure',
      title: 'The cap guy has a slide with your name on it',
      body: `Moving ${cut}M of your ${money(c.salary)}M gets them the pass rusher they have been chasing since March.`,
      options: [
        {
          label: 'Take the restructure', effect: 'Cap help, less cash',
          apply: (cc) => {
            setFlag(cc, 'b_restructure', 1);
            cc.salary = money(cc.salary - cut); cc.contractYears += 1; bumpMorale(cc, 6); bumpFan(cc, 10);
            return `You took ${cut}M less to sign a pass rusher. Salary now ${money(cc.salary)}M, one extra year, fanbase +10.`;
          },
        },
        {
          label: 'No. You signed a contract.', effect: 'Every dollar',
          apply: (cc) => {
            setFlag(cc, 'b_restructure', 2); bumpMorale(cc, -4); bumpFan(cc, -6);
            return `You kept all ${money(cc.salary)}M and the front office wrote it down somewhere. Fanbase -6, morale -4.`;
          },
        },
        {
          label: 'Restructure, but two more guaranteed years', effect: 'Security for cash',
          apply: (cc) => {
            setFlag(cc, 'b_restructure', 3);
            cc.salary = money(cc.salary * 0.9); cc.contractYears += 2; bumpMorale(cc, 8); bumpFan(cc, 6);
            return `Ten percent off the top for two more guaranteed years. Salary ${money(cc.salary)}M, ${cc.contractYears} years left, morale +8.`;
          },
        },
      ],
    });
  }

  if (c.contractYears <= 0 && c.ovr >= 80 && flag(c, 'b_tag') === 0) {
    const posMult = c.pos === 'QB' ? 1.9 : c.pos === 'WR' ? 1.15 : 0.9;
    const tag = money(Math.max(4, (c.ovr - 64) * 1.55 * posMult));
    deck.push({
      id: 'lifeB_franchiseTag',
      title: `Tagged at ${tag}M`,
      body: `${teamLabelOf(c.team)} used the tag. Your agent said the word insulting four times in one sentence and then said it again on the phone with a reporter.`,
      options: [
        {
          label: 'Sign it and play it out', effect: 'One year, prove it',
          apply: (cc) => {
            setFlag(cc, 'b_tag', 1); cc.salary = tag; cc.contractYears = 1; bumpMorale(cc, -3); bumpFan(cc, 4);
            return `Signed the tag at ${tag}M and showed up on time. One year, everything to prove. Fanbase +4.`;
          },
        },
        {
          label: 'Hold out through camp', effect: 'Leverage or fines',
          apply: (cc, r) => {
            setFlag(cc, 'b_tag', 2);
            if (r() < 0.5) {
              cc.salary = money(tag * 1.25); cc.contractYears = 4; bumpMorale(cc, 10); bumpFan(cc, -6);
              return `They blinked in Week 1. Four years at ${money(cc.salary)}M, fanbase -6, and your agent has never been happier.`;
            }
            cc.salary = tag; cc.contractYears = 1; spend(cc, 0.9); bumpMorale(cc, -8); bumpFan(cc, -10);
            return `You blinked first. 0.9M in fines, still ${tag}M for one year, fanbase -10.`;
          },
        },
        {
          label: 'Sign long, slightly under market', effect: 'Security now',
          apply: (cc) => {
            setFlag(cc, 'b_tag', 3); cc.salary = money(tag * 0.92); cc.contractYears = 4; bumpMorale(cc, 8); bumpFan(cc, 8);
            return `Four years at ${money(cc.salary)}M, a little under the number, fully guaranteed. Morale +8, fanbase +8.`;
          },
        },
      ],
    });
  }

  if (yrs >= 5 && c.contractYears <= 0 && c.rings === 0 && c.age >= 27 && flag(c, 'b_ringChase') === 0) {
    const discount = money(Math.max(1.2, c.salary * 0.6));
    const bag = money(Math.max(2, c.salary * 1.35));
    deck.push({
      id: 'lifeB_contenderDiscount',
      title: 'One piece away, for less money',
      body: `A real contender is offering ${discount}M. Two teams with nothing to play for are offering ${bag}M and a lovely facility.`,
      options: [
        {
          label: 'Chase the ring', effect: 'Ring over money',
          apply: (cc, r) => {
            setFlag(cc, 'b_ringChase', 1);
            const nt = otherTeam(cc, r); cc.team = nt; cc.salary = discount; cc.contractYears = 2; cc.fanbase = 52; bumpMorale(cc, 14);
            return `Signed with ${teamLabelOf(nt)} for ${discount}M across two years. You left real money on a real table. Morale +14.`;
          },
        },
        {
          label: 'Take the bag from the rebuild', effect: 'Money over January',
          apply: (cc, r) => {
            setFlag(cc, 'b_ringChase', 2);
            const nt = otherTeam(cc, r); cc.team = nt; cc.salary = bag; cc.contractYears = 3; cc.fanbase = 40; bumpMorale(cc, -6);
            return `Three years, ${bag}M a year, from ${teamLabelOf(nt)}. Generational money, zero playoff games. Morale -6.`;
          },
        },
        {
          label: 'One year prove it with the contender', effect: 'Split the difference',
          apply: (cc, r) => {
            setFlag(cc, 'b_ringChase', 3);
            const nt = otherTeam(cc, r); cc.team = nt; cc.salary = money(Math.max(1.5, cc.salary * 0.8)); cc.contractYears = 1; cc.fanbase = 48; bumpMorale(cc, 8);
            return `One year, ${money(cc.salary)}M, with ${teamLabelOf(nt)}. Win and you get paid twice. Morale +8.`;
          },
        },
      ],
    });
  }

  if (yrs >= 7 && c.age >= 29 && c.health >= 70 && c.earnings >= 40 && flag(c, 'b_walkAway') === 0) {
    deck.push({
      id: 'lifeB_retireHealthy',
      title: 'You could stop right now',
      body: 'Knees, memory and money all intact at the same time. Almost nobody in this sport ever gets handed that combination.',
      options: [
        {
          label: 'Announce this is the last season', effect: 'Leave whole',
          apply: (cc) => {
            setFlag(cc, 'b_walkAway', 1); bumpMorale(cc, 12); bumpFan(cc, 14); bumpHealth(cc, 4);
            return 'You told them in March that this was it. Morale +12, fanbase +14, health +4, and every Sunday felt different.';
          },
        },
        {
          label: 'Keep going until the game says stop', effect: 'Chase the ceiling',
          apply: (cc) => {
            setFlag(cc, 'b_walkAway', 2); bumpMorale(cc, 6); bumpOvr(cc, 1); bumpHealth(cc, -3);
            return 'You are not done and you said so out loud. Rating +1, morale +6, health -3.';
          },
        },
        {
          label: 'Play one more, decide in the spring', effect: 'Kick the can',
          apply: (cc) => {
            setFlag(cc, 'b_walkAway', 3); bumpMorale(cc, 4); bumpHealth(cc, 2);
            return 'One more year and a decision you moved to April. Morale +4, health +2.';
          },
        },
      ],
    });
  }

  if (yrs >= 8 && (c.age >= 33 || c.ovr <= 70) && flag(c, 'b_spring') === 0) {
    deck.push({
      id: 'lifeB_springLeague',
      title: 'The spring league called',
      body: 'A starting job, real money by their standards, and eight weeks of live tape in front of 32 general managers who stopped returning your calls.',
      options: [
        {
          label: 'Play spring ball', effect: 'Tape and reps',
          apply: (cc) => {
            setFlag(cc, 'b_spring', 1); earn(cc, 0.4); bumpOvr(cc, 1); bumpHealth(cc, -4); bumpFan(cc, 7); bumpMorale(cc, 8);
            return '0.4M, ten starts and a highlight tape that got watched in real buildings. Rating +1, fanbase +7, health -4.';
          },
        },
        {
          label: 'Take their TV job instead', effect: 'Blazer money',
          apply: (cc) => {
            setFlag(cc, 'b_spring', 2); earn(cc, 0.9); bumpFan(cc, 9); bumpMorale(cc, 4); bumpHealth(cc, 3);
            return '0.9M to talk about football in a blazer on Saturdays. Fanbase +9, health +3.';
          },
        },
        {
          label: 'Wait by the phone for an NFL call', effect: 'Pride, silence',
          apply: (cc, r) => {
            setFlag(cc, 'b_spring', 3);
            if (r() < 0.35) { bumpMorale(cc, 10); bumpFan(cc, 5); return 'A contender called in October after an injury and you were in pads by Friday. Morale +10, fanbase +5.'; }
            bumpMorale(cc, -8);
            return 'The phone finally rang in March. It was a podcast. Morale -8.';
          },
        },
      ],
    });
  }

  return deck;
}
