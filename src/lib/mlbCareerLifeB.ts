/* ==========================================================================
   mlbCareerLifeB.ts, offseason deck B for MLB My Career (Round 58)
   Owner brief: everything a full life sim does, ten times better and more
   out of pocket. This file is 45 offseason decisions across family and home,
   legacy and records, rivalries, clean business, offseason life, genuinely
   unhinged baseball stuff, and the contract forks that decide how a career
   actually ends.

   Contract with the caller: every event gates itself, so drawMlbEvent can
   just concat this deck in with no extra eligibility rules. Every apply
   MUTATES the state and RETURNS the past tense log line the player reads
   after choosing. Ids are all prefixed mlbB_ so they never collide.

   CIRCULAR IMPORT WARNING: mlbMyCareer.ts imports this file, so nothing
   imported here may be evaluated at module scope. mlbTeamLabelOf is only
   ever called inside function bodies. Never hoist it into a constant.
   ========================================================================== */
import type { MlbCareerState, MlbCareerEvent } from './mlbMyCareer';
import { mlbTeamLabelOf } from './mlbMyCareer';

/* Round 58 money and flag fields ride on the save object. Old saves predate
   them and the engine interface has not caught up yet, so every read goes
   through this local view with a default and every write guards. */
type LifeState = MlbCareerState & {
  netWorth?: number;
  dirtyMoney?: number;
  heat?: number;
  purchased?: string[];
  lifeFlags?: Record<string, number>;
};
const L = (c: MlbCareerState): LifeState => c as LifeState;

const clamp = (v: number): number => Math.max(0, Math.min(100, v));
const money = (x: number): number => Math.round(x * 10) / 10;

const flag = (c: MlbCareerState, k: string): number => (L(c).lifeFlags || {})[k] || 0;
const setFlag = (c: MlbCareerState, k: string, v: number) => { L(c).lifeFlags = { ...(L(c).lifeFlags || {}), [k]: v }; };

/** Net worth, seeded from career earnings the first time a save touches it. */
const wealth = (c: MlbCareerState): number => L(c).netWorth ?? money(c.earnings * 0.45);
const spend = (c: MlbCareerState, amount: number) => { L(c).netWorth = money(wealth(c) - amount); };
const bank = (c: MlbCareerState, amount: number) => { L(c).netWorth = money(wealth(c) + amount); };
/** Money that hits the career earnings line AND the bank account. */
const earn = (c: MlbCareerState, amount: number) => { c.earnings = money(c.earnings + amount); bank(c, amount); };
const addHeat = (c: MlbCareerState, d: number) => { L(c).heat = clamp((L(c).heat ?? 0) + d); };
const own = (c: MlbCareerState, item: string) => { L(c).purchased = [...(L(c).purchased || []), item]; };

const bumpMorale = (c: MlbCareerState, d: number) => { c.morale = clamp(c.morale + d); };
const bumpFan = (c: MlbCareerState, d: number) => { c.fanbase = clamp(c.fanbase + d); };
const bumpHealth = (c: MlbCareerState, d: number) => { c.health = clamp(c.health + d); };
const bumpOvr = (c: MlbCareerState, d: number) => { c.ovr = Math.min(c.pot + 1, c.ovr + d); };
const dropOvr = (c: MlbCareerState, d: number) => { c.ovr = Math.max(60, c.ovr - d); };

/* Local club id list so this file imports nothing but types and one label
   helper. Same 30 ids the conquest data uses. */
const CLUB_IDS = [
  'NYY', 'BOS', 'TOR', 'TBR', 'BAL', 'CLE', 'DET', 'KCR', 'MIN', 'CHW',
  'HOU', 'SEA', 'TEX', 'LAA', 'ATH', 'ATL', 'PHI', 'NYM', 'MIA', 'WSN',
  'MIL', 'CHC', 'STL', 'CIN', 'PIT', 'LAD', 'SDP', 'SFG', 'ARI', 'COL',
];
const otherClub = (c: MlbCareerState, r: () => number): string => {
  const pool = CLUB_IDS.filter(a => a !== c.team);
  return pool[Math.floor(r() * pool.length)];
};

/** Same shape as the engine market curve, duplicated so no value is imported. */
const marketOf = (c: MlbCareerState): number => Math.max(1, money((c.ovr - 64) * 1.5 - 6));

export function getMlbLifeEventsB(c: MlbCareerState, rng: () => number): MlbCareerEvent[] {
  const deck: MlbCareerEvent[] = [];
  const yrs = c.seasons.length;
  const last = yrs > 0 ? c.seasons[yrs - 1] : null;
  const nw = wealth(c);
  const isSp = c.pos === 'SP';
  const prevTeam = [...c.seasons].reverse().find(s => s.team !== c.team)?.team ?? '';
  const teamHr = c.seasons.filter(s => s.team === c.team).reduce((n, s) => n + (s.hr ?? 0), 0);
  const teamK = c.seasons.filter(s => s.team === c.team).reduce((n, s) => n + (s.so ?? 0), 0);

  /* ========== 1. FAMILY AND HOME ========== */

  if (yrs >= 1 && c.age >= 23 && flag(c, 'b_newborn') < 2) {
    deck.push({
      id: 'mlbB_newbornRoadTrip',
      title: 'The due date lands in the middle of a ten game trip',
      body: 'Your first kid is due somewhere between Seattle and Anaheim. The doctor keeps repeating that babies do not read the schedule.',
      options: [
        {
          label: 'Leave the trip the second it starts', effect: 'Miss games, be there',
          apply: (cc) => {
            setFlag(cc, 'b_newborn', flag(cc, 'b_newborn') + 1);
            spend(cc, 0.35); bumpMorale(cc, 14); bumpFan(cc, -4); bumpHealth(cc, 2);
            return 'You landed with two hours to spare. Three games missed, one person gained, 0.35M on a charter. Morale +14, fanbase -4, health +2.';
          },
        },
        {
          label: 'Play the day game, fly at night', effect: 'Both, barely',
          apply: (cc) => {
            setFlag(cc, 'b_newborn', flag(cc, 'b_newborn') + 1);
            spend(cc, 0.45); bumpFan(cc, 7); bumpMorale(cc, 5); bumpHealth(cc, -2);
            return 'Two hits, a jog to a running car, a 0.45M red eye. You made the second hour of visiting hours. Fanbase +7, morale +5, health -2.';
          },
        },
        {
          label: 'Fly everybody into the team hotel', effect: 'Expensive togetherness',
          apply: (cc) => {
            setFlag(cc, 'b_newborn', flag(cc, 'b_newborn') + 1);
            spend(cc, 0.8); bumpMorale(cc, 9); bumpHealth(cc, -4);
            return '0.8M of connected suites and zero sleep across three cities. Morale +9, health -4, and the traveling secretary had to add a crib to the manifest.';
          },
        },
      ],
    });
  }

  if (yrs >= 2 && c.age >= 25 && flag(c, 'b_partnerCity') === 0) {
    deck.push({
      id: 'mlbB_partnerCity',
      title: 'They got the job',
      body: 'Your partner just landed the role they have been chasing since college. It is in a city with a different ballpark in it.',
      options: [
        {
          label: 'Tell your agent to get you there', effect: 'Move toward them',
          apply: (cc, r) => {
            setFlag(cc, 'b_partnerCity', 1);
            const nt = otherClub(cc, r); cc.team = nt; cc.fanbase = 42; bumpMorale(cc, 12);
            return `You asked, and you woke up a member of the ${mlbTeamLabelOf(nt)}. Same zip code, new spring training site. Fanbase reset to 42, morale +12.`;
          },
        },
        {
          label: 'Do the long distance season', effect: 'Flights and FaceTime',
          apply: (cc) => {
            setFlag(cc, 'b_partnerCity', 2); spend(cc, 0.6); bumpMorale(cc, -6);
            return 'Seven months of off day flights and 0.6M in charters. You kept your locker. Morale -6.';
          },
        },
        {
          label: 'They put it off for one year', effect: 'Stability, quiet debt',
          apply: (cc) => {
            setFlag(cc, 'b_partnerCity', 3); setFlag(cc, 'b_owedOne', 1); bumpMorale(cc, 3);
            return 'They deferred the whole thing for you. Morale +3, and a favor is now on the books that neither of you will ever forget.';
          },
        },
      ],
    });
  }

  if (yrs >= 2 && c.age >= 24 && flag(c, 'b_sibAgent') === 0) {
    deck.push({
      id: 'mlbB_siblingAgent',
      title: 'Your brother printed business cards',
      body: 'They say AGENT in a font he chose himself. He has already told a bat company and a cleat company that he speaks for you.',
      options: [
        {
          label: 'Hire him, full trust', effect: 'Family on payroll',
          apply: (cc, r) => {
            setFlag(cc, 'b_sibAgent', 1);
            if (r() < 0.45) { earn(cc, 1.2); bumpMorale(cc, 8); return 'He turned out to be genuinely good at this. Closed 1.2M in deals in eleven months. Morale +8.'; }
            spend(cc, 0.9); addHeat(cc, 4); bumpMorale(cc, -6);
            return 'He spent 0.9M on a rebrand nobody asked for and an accountant you have never met. Morale -6, and Thanksgiving is going to be tense.';
          },
        },
        {
          label: 'Real job under your real agency', effect: 'Supervised, safer',
          apply: (cc) => {
            setFlag(cc, 'b_sibAgent', 2); spend(cc, 0.3); bumpMorale(cc, 6);
            return 'He does marketing under your actual agent for 0.3M a year. He is thriving and he cannot lose your money. Morale +6.';
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
      id: 'mlbB_parentCloser',
      title: 'She keeps using the word closer',
      body: 'Your mom has never asked you for a car, a house or a dollar. She has asked, on every phone call for three months, if you could play closer to home.',
      options: [
        {
          label: 'Push your agent toward a club near home', effect: 'Move toward home',
          apply: (cc, r) => {
            setFlag(cc, 'b_parentHome', 1);
            const nt = otherClub(cc, r); cc.team = nt; cc.fanbase = 44; bumpMorale(cc, 12);
            return `You told your agent home was the whole priority and landed with the ${mlbTeamLabelOf(nt)}. Fanbase reset to 44, morale +12.`;
          },
        },
        {
          label: 'Fly her out for every homestand', effect: 'Miles, not moving',
          apply: (cc) => {
            setFlag(cc, 'b_parentHome', 2); spend(cc, 0.35); bumpMorale(cc, 7); bumpFan(cc, 3);
            return '0.35M a year in first class round trips. She knows every usher in section 118 by name now. Morale +7, fanbase +3.';
          },
        },
        {
          label: 'Buy a place ten minutes from her', effect: 'Offseason zip code',
          apply: (cc) => {
            setFlag(cc, 'b_parentHome', 3); spend(cc, 1.6); own(cc, 'Offseason house near mom'); bumpMorale(cc, 9);
            return 'A 1.6M house eleven minutes from her front door. Every December you eat dinner there on a Tuesday. Morale +9.';
          },
        },
      ],
    });
  }

  if (yrs >= 1 && c.fanbase >= 35 && flag(c, 'b_leak') === 0) {
    deck.push({
      id: 'mlbB_groupChatLeak',
      title: 'The family group chat leaked',
      body: 'A cousin screenshotted it. Your review of the hitting coach, that he has never met a baseball and has only read about one, is now a trending audio.',
      options: [
        {
          label: 'Own it at your locker', effect: 'Fame up, coach cold',
          apply: (cc) => {
            setFlag(cc, 'b_leak', 1); bumpFan(cc, 12); bumpMorale(cc, -6);
            return 'You said it, you meant it, and then you said it again into eleven microphones. Fanbase +12, morale -6, and nobody threw you early work all spring.';
          },
        },
        {
          label: 'Claim the phone was hacked', effect: 'Nobody believes you',
          apply: (cc) => {
            setFlag(cc, 'b_leak', 2); bumpFan(cc, -5); addHeat(cc, 6); bumpMorale(cc, 2);
            return 'You blamed a hacker. Nobody bought it, including your cousin, who was in the chat. Fanbase -5, morale +2.';
          },
        },
        {
          label: 'Apologize behind a closed door', effect: 'Quiet repair',
          apply: (cc) => {
            setFlag(cc, 'b_leak', 3); bumpMorale(cc, 7); bumpFan(cc, -3); bumpOvr(cc, 1);
            return 'One closed cage, one real apology, and now he stays after every game to throw you extra. Rating +1, morale +7, fanbase -3.';
          },
        },
      ],
    });
  }

  if ((nw >= 3 || c.earnings >= 12) && flag(c, 'b_house') === 0) {
    deck.push({
      id: 'mlbB_houseForSomeone',
      title: 'Somebody stops paying rent forever',
      body: 'The money is finally there to buy a person a house outright. The list of candidates turned out to be much longer than you expected.',
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
            return 'A 0.9M house with no mortgage and a fund that pays her every month whether baseball works out or not. Morale +8.';
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

  /* ========== 2. LEGACY AND RECORDS ========== */

  if (yrs >= 4 && c.ovr >= 76 && ((isSp && teamK >= 600) || (!isSp && teamHr >= 110)) && flag(c, 'b_record') === 0) {
    const recTitle = isSp ? 'Nine strikeouts from the franchise record' : 'Two homers from the franchise record';
    const recBody = isSp
      ? `The ${mlbTeamLabelOf(c.team)} strikeout record is one start away and the division is already clinched. Game 162 means nothing to anybody in the building except you.`
      : `The ${mlbTeamLabelOf(c.team)} home run record is two swings away and the seed is already locked. The last series means nothing to anybody in the building except you.`;
    deck.push({
      id: 'mlbB_franchiseRecord',
      title: recTitle,
      body: recBody,
      options: [
        {
          label: 'Chase it, whatever it costs', effect: 'Record, real risk',
          apply: (cc, r) => {
            setFlag(cc, 'b_record', 1); bumpFan(cc, 12); bumpMorale(cc, 6); bumpHealth(cc, -5);
            if (r() < 0.25) { bumpHealth(cc, -9); return 'You got the record and something in the back of your shoulder got a vote too. Fanbase +12, morale +6, health -14.'; }
            return 'Franchise record, on the last weekend, in front of 14,000 people who stayed. Fanbase +12, morale +6, health -5.';
          },
        },
        {
          label: 'Sit it out, October is the point', effect: 'Rest for the run',
          apply: (cc) => {
            setFlag(cc, 'b_record', 2); bumpHealth(cc, 6); bumpMorale(cc, 4); bumpFan(cc, -5);
            return 'You wore a hoodie and charted pitches. Health +6, morale +4, fanbase -5, and one radio host called you soft for a week.';
          },
        },
        {
          label: 'Get it early, then come out', effect: 'Greedy but efficient',
          apply: (cc) => {
            setFlag(cc, 'b_record', 3); bumpFan(cc, 8); bumpMorale(cc, 3); bumpHealth(cc, -2);
            return 'Record broken in the first inning, jacket on by the third. Fanbase +8, morale +3, health -2.';
          },
        },
      ],
    });
  }

  if (yrs >= 9 && (c.rings >= 1 || c.allStars >= 3 || c.fanbase >= 78) && flag(c, 'b_number') === 0) {
    deck.push({
      id: 'mlbB_numberRetired',
      title: 'They want your number on the wall',
      body: `The ${mlbTeamLabelOf(c.team)} have three ceremony dates and one very specific request about how long the speech can be.`,
      options: [
        {
          label: 'Sunday afternoon, keep it short', effect: 'Wall forever, quick',
          apply: (cc) => {
            setFlag(cc, 'b_number', 1); bumpFan(cc, 14); bumpMorale(cc, 8);
            return 'Eleven minutes before a 1:10 first pitch and your number goes up forever. Fanbase +14, morale +8.';
          },
        },
        {
          label: 'Opening Day, free jerseys for the bleachers', effect: 'Enormous and expensive',
          apply: (cc) => {
            setFlag(cc, 'b_number', 2); spend(cc, 1.1); bumpFan(cc, 22); bumpMorale(cc, 10);
            return 'You paid 1.1M so 14,000 people in the cheap seats went home wearing your name. Fanbase +22, morale +10.';
          },
        },
        {
          label: 'Ask them to wait until you are done', effect: 'Not yet',
          apply: (cc) => {
            setFlag(cc, 'b_number', 3); bumpMorale(cc, 6); bumpFan(cc, 3); bumpOvr(cc, 1);
            return 'You told them a retired number on an active player feels like a eulogy with a bobblehead. Rating +1, morale +6, fanbase +3.';
          },
        },
      ],
    });
  }

  if (yrs >= 10 && c.age >= 32 && flag(c, 'b_hof') === 0) {
    deck.push({
      id: 'mlbB_hofPush',
      title: 'A firm that specializes in Cooperstown',
      body: 'They say your case needs narrative support. They brought a slide deck about you with a custom title font and a section called The Peak.',
      options: [
        {
          label: 'Hire them for 1.5M', effect: 'Buying the narrative',
          apply: (cc) => {
            setFlag(cc, 'b_hof', 1); spend(cc, 1.5); bumpFan(cc, 10);
            return '1.5M on three years of documentaries, oral histories and extremely warm feature writing. Fanbase +10, and voters keep bringing up your fourth season.';
          },
        },
        {
          label: 'Let the numbers argue', effect: 'Pride, pure',
          apply: (cc) => {
            setFlag(cc, 'b_hof', 2); bumpMorale(cc, 8);
            return 'You said if the back of the card cannot do it, a press release should not. Morale +8, and your agent aged four years in that meeting.';
          },
        },
        {
          label: 'Call fourteen voters yourself', effect: 'Awkward, effective',
          apply: (cc) => {
            setFlag(cc, 'b_hof', 3); bumpFan(cc, 6); bumpMorale(cc, -4);
            return 'Thirteen pleasant calls and one writer who published the voicemail. Fanbase +6, morale -4.';
          },
        },
      ],
    });
  }

  if (yrs >= 5 && c.age >= 28 && flag(c, 'b_heir') === 0) {
    deck.push({
      id: 'mlbB_mentorProspect',
      title: 'They drafted your replacement',
      body: `The ${mlbTeamLabelOf(c.team)} took your position in the first round. The kid has your rookie card framed in his locker, which somehow makes it worse.`,
      options: [
        {
          label: 'Teach him everything you know', effect: 'Mentor, lose at bats',
          apply: (cc) => {
            setFlag(cc, 'b_heir', 1); bumpMorale(cc, 10); bumpFan(cc, 8); bumpHealth(cc, 3);
            return 'You gave him the whole notebook and half your cage time. Fanbase +8, morale +10, health +3, and he thanked you on live television.';
          },
        },
        {
          label: 'Freeze him out completely', effect: 'Cold war in the room',
          apply: (cc) => {
            setFlag(cc, 'b_heir', 2); bumpMorale(cc, -5); bumpFan(cc, -4); bumpOvr(cc, 1);
            return 'You did not say one word to him until August. Rating +1 from playing furious, morale -5, fanbase -4.';
          },
        },
        {
          label: 'Charge him for winter lessons', effect: 'Billable mentorship',
          apply: (cc) => {
            setFlag(cc, 'b_heir', 3); earn(cc, 0.15); bumpMorale(cc, 3); bumpFan(cc, 6);
            return 'You invoiced a rookie 150k for six weeks of offseason work. He paid it, he got better, and the story made you a legend. Fanbase +6, morale +3.';
          },
        },
      ],
    });
  }

  if (yrs >= 10 && (c.rings >= 1 || c.mvpCys >= 1) && flag(c, 'b_statue') === 0) {
    deck.push({
      id: 'mlbB_statueDebate',
      title: 'The statue committee has notes',
      body: 'The club wants bronze outside the center field gate. The sculptor sent eleven poses and one of them is you screaming at a home plate umpire.',
      options: [
        {
          label: 'The iconic pose', effect: 'Bronze forever',
          apply: (cc) => {
            setFlag(cc, 'b_statue', 1); bumpFan(cc, 12); bumpMorale(cc, 6); own(cc, 'Bronze statue');
            return 'Nine feet of you doing the thing everybody remembers. Fanbase +12, morale +6.';
          },
        },
        {
          label: 'Screaming at the umpire', effect: 'Honest bronze',
          apply: (cc) => {
            setFlag(cc, 'b_statue', 2); spend(cc, 0.05); bumpFan(cc, 18); bumpMorale(cc, 4); own(cc, 'Bronze statue');
            return 'The league fined you 50k for a statue. Fanbase +18, morale +4, and children take pictures pointing at an imaginary strike three.';
          },
        },
        {
          label: 'Skip it, build four fields instead', effect: 'Dirt over bronze',
          apply: (cc) => {
            setFlag(cc, 'b_statue', 3); spend(cc, 1.2); bumpFan(cc, 15); bumpMorale(cc, 12); own(cc, 'Four youth fields');
            return 'You turned down bronze and wrote 1.2M for four lit fields and a batting cage that stays unlocked. Fanbase +15, morale +12.';
          },
        },
      ],
    });
  }

  if (yrs >= 12 && c.age >= 35 && flag(c, 'b_tour') === 0) {
    deck.push({
      id: 'mlbB_farewellTour',
      title: 'Announce it, or just go quietly',
      body: 'Say this is the last one and all 29 road parks hand you a framed something. Say nothing and you get to play baseball without a receiving line at second base.',
      options: [
        {
          label: 'Full farewell tour', effect: 'Gifts and goodbyes',
          apply: (cc) => {
            setFlag(cc, 'b_tour', 1); earn(cc, 1); bumpFan(cc, 16); bumpMorale(cc, 8);
            return 'Six months of tributes, rocking chairs and one club that gave you a surfboard. 1M in tour merch, fanbase +16, morale +8.';
          },
        },
        {
          label: 'Say nothing, just play', effect: 'No circus',
          apply: (cc) => {
            setFlag(cc, 'b_tour', 2); bumpMorale(cc, 5); bumpOvr(cc, 1);
            return 'No announcement, no ceremonies, no third base coach handing you a painting. Rating +1, morale +5.';
          },
        },
        {
          label: 'Tease it all year for the merch', effect: 'Milking it',
          apply: (cc) => {
            setFlag(cc, 'b_tour', 3); earn(cc, 2.2); bumpFan(cc, -6); bumpMorale(cc, -2);
            return 'Five months of maybe. 2.2M in merch, fanbase -6, and everyone got very tired of the question by June.';
          },
        },
      ],
    });
  }

  if (yrs >= 3 && c.fanbase >= 45 && flag(c, 'b_bobble') === 0) {
    deck.push({
      id: 'mlbB_bobbleheadNight',
      title: 'The bobblehead does not look like you',
      body: 'Twenty thousand of them ship in March. The face belongs to a stranger and the mold is already paid for.',
      options: [
        {
          label: 'Approve it, let the internet cook', effect: 'Cursed and viral',
          apply: (cc) => {
            setFlag(cc, 'b_bobble', 1); earn(cc, 0.05); bumpFan(cc, 11); bumpMorale(cc, -2);
            return '20,000 haunted little men went out the gates and the photos ran for a week. 50k in royalties, fanbase +11, morale -2.';
          },
        },
        {
          label: 'Pay to have it remade', effect: 'Vanity, on you',
          apply: (cc) => {
            setFlag(cc, 'b_bobble', 2); spend(cc, 0.2); bumpMorale(cc, 6); bumpFan(cc, -2);
            return '0.2M of your own money for a second mold that actually has your jaw. Morale +6, fanbase -2, and marketing thinks you are a diva now.';
          },
        },
        {
          label: 'Sign the ugly ones, auction them off', effect: 'Charity out of chaos',
          apply: (cc) => {
            setFlag(cc, 'b_bobble', 3); spend(cc, 0.03); bumpFan(cc, 16); bumpMorale(cc, 9);
            return 'You signed 500 cursed bobbleheads and the auction raised money for the food bank. Fanbase +16, morale +9.';
          },
        },
      ],
    });
  }

  /* ========== 3. RIVALRIES ========== */

  if (!isSp && yrs >= 2 && flag(c, 'b_nemesisArm') === 0) {
    deck.push({
      id: 'mlbB_pitcherOwnsYou',
      title: 'He owns you and everybody knows it',
      body: 'You are 2 for 34 against a division lefty whose slider starts at your ribs. The graphic runs on the video board every time you step in.',
      options: [
        {
          label: 'Live in his video all winter', effect: 'Rating up, sanity down',
          apply: (cc) => {
            setFlag(cc, 'b_nemesisArm', 1); bumpOvr(cc, 1); bumpMorale(cc, -4);
            return 'Four hundred clips of one man. Rating +1, morale -4, and you now dream in his release point.';
          },
        },
        {
          label: 'Hire his old catcher for the winter', effect: 'Buy the scouting report',
          apply: (cc) => {
            setFlag(cc, 'b_nemesisArm', 2); spend(cc, 0.25); bumpOvr(cc, 1); bumpMorale(cc, 8); bumpFan(cc, 4);
            return '0.25M for six weeks with the one man who called every one of those sliders. Rating +1, morale +8, fanbase +4.';
          },
        },
        {
          label: 'Say his name in every interview', effect: 'Free rent, both ways',
          apply: (cc) => {
            setFlag(cc, 'b_nemesisArm', 3); bumpFan(cc, 10); bumpMorale(cc, -2);
            return 'You made him famous and he made you a segment. Fanbase +10, morale -2.';
          },
        },
      ],
    });
  }

  if (isSp && yrs >= 2 && flag(c, 'b_nemesisBat') === 0) {
    deck.push({
      id: 'mlbB_hitterOwnsYou',
      title: 'Nine homers, one hitter',
      body: 'One right handed bat in your division has taken you deep nine times. He never watches the ball leave. He watches you.',
      options: [
        {
          label: 'Build a new pitch just for him', effect: 'Winter in the lab',
          apply: (cc) => {
            setFlag(cc, 'b_nemesisBat', 1); bumpOvr(cc, 1); bumpMorale(cc, -4);
            return 'Eleven weeks and 900 throws to invent one cutter for one man. Rating +1, morale -4, and the pitching coach is worried about you.';
          },
        },
        {
          label: 'Never give him anything to hit again', effect: 'Cowardly, effective',
          apply: (cc) => {
            setFlag(cc, 'b_nemesisBat', 2); bumpMorale(cc, 6); bumpHealth(cc, 2); bumpFan(cc, -7);
            return 'Four walks in four at bats and a stadium of 41,000 people booing a strategy that worked. Morale +6, health +2, fanbase -7.';
          },
        },
        {
          label: 'Take him to dinner and ask him how', effect: 'Sleeping with the enemy',
          apply: (cc) => {
            setFlag(cc, 'b_nemesisBat', 3); spend(cc, 0.01); bumpOvr(cc, 1); bumpMorale(cc, 7); bumpFan(cc, 5);
            return 'A 10k steak dinner and the man told you exactly what you tip. Rating +1, morale +7, fanbase +5, and he learned two things about you as well.';
          },
        },
      ],
    });
  }

  if (yrs >= 2 && flag(c, 'b_brawl') < 2 && rng() < 0.7) {
    deck.push({
      id: 'mlbB_benchesClearing',
      title: 'The rivalry has a body count now',
      body: 'Their catcher put a forearm in your rookie and both dugouts emptied in four seconds. The league is handing out suspensions by fax.',
      options: [
        {
          label: 'Take the suspension, defend your guy', effect: 'Fines and folk hero',
          apply: (cc) => {
            setFlag(cc, 'b_brawl', flag(cc, 'b_brawl') + 1); spend(cc, 0.05); addHeat(cc, 5); bumpFan(cc, 12); bumpMorale(cc, 8);
            return 'Four games and a 50k fine for being the third man in. Fanbase +12, morale +8, and your rookie will run through a wall for you now.';
          },
        },
        {
          label: 'Stay on the top step, hands in pockets', effect: 'Available in October',
          apply: (cc) => {
            setFlag(cc, 'b_brawl', flag(cc, 'b_brawl') + 1); bumpHealth(cc, 3); bumpOvr(cc, 1); bumpFan(cc, -6); bumpMorale(cc, -4);
            return 'You never left the dugout and you played all 162. Health +3, rating +1, fanbase -6, morale -4.';
          },
        },
        {
          label: 'Get their catcher on the phone after', effect: 'Adults, quietly',
          apply: (cc) => {
            setFlag(cc, 'b_brawl', flag(cc, 'b_brawl') + 1); addHeat(cc, -4); bumpMorale(cc, 6); bumpFan(cc, -2);
            return 'Two twenty minute phone calls and it never happened again. Morale +6, fanbase -2, and nobody outside the two clubhouses ever knew.';
          },
        },
      ],
    });
  }

  if (yrs >= 4 && prevTeam && flag(c, 'b_exMate') === 0) {
    deck.push({
      id: 'mlbB_formerTeammate',
      title: 'Your locker neighbor signed with the rivals',
      body: 'The guy who drove you to the park for four straight years just signed across the rivalry. He knows every sign, every tell and every one of your bad habits.',
      options: [
        {
          label: 'Change every sign in the system', effect: 'Paranoid, thorough',
          apply: (cc) => {
            setFlag(cc, 'b_exMate', 1); bumpOvr(cc, 1); bumpMorale(cc, -3);
            return 'A whole new set of cards and two weeks of a very annoyed coaching staff. Rating +1, morale -3.';
          },
        },
        {
          label: 'Take him to dinner, keep it human', effect: 'Friends first',
          apply: (cc) => {
            setFlag(cc, 'b_exMate', 2); spend(cc, 0.02); bumpMorale(cc, 9); bumpFan(cc, 3);
            return 'A 20k dinner and a rule that the rivalry stops at the parking lot. Morale +9, fanbase +3.';
          },
        },
        {
          label: 'Tell the beat writers he is a snake', effect: 'Burn it down',
          apply: (cc) => {
            setFlag(cc, 'b_exMate', 3); addHeat(cc, 4); bumpFan(cc, 9); bumpMorale(cc, -5);
            return 'Nineteen games a year of genuine hatred and one friendship that is completely over. Fanbase +9, morale -5.';
          },
        },
      ],
    });
  }

  if (yrs >= 3 && flag(c, 'b_oldSkip') === 0) {
    deck.push({
      id: 'mlbB_managerWhoBuriedYou',
      title: 'The manager who buried you got a new job',
      body: isSp
        ? 'He pulled you in the fifth for two straight summers and told reporters you could not go a third time through. He now manages a club you see nineteen times a year.'
        : 'He hit you eighth for a whole summer and told reporters you were not ready. He now manages a club you see nineteen times a year.',
      options: [
        {
          label: 'Own every game against him', effect: 'Play furious',
          apply: (cc) => {
            setFlag(cc, 'b_oldSkip', 1); bumpOvr(cc, 1); bumpMorale(cc, 6); bumpHealth(cc, -3);
            return 'You put up your best numbers of the year against exactly one dugout. Rating +1, morale +6, health -3.';
          },
        },
        {
          label: 'Say the classy thing on camera', effect: 'Take the high road',
          apply: (cc) => {
            setFlag(cc, 'b_oldSkip', 2); bumpFan(cc, 7); bumpMorale(cc, 3);
            return 'You called him a great baseball man on camera and meant about forty percent of it. Fanbase +7, morale +3.';
          },
        },
        {
          label: 'Mail him a framed lineup card', effect: 'Petty legend',
          apply: (cc) => {
            setFlag(cc, 'b_oldSkip', 3); spend(cc, 0.01); addHeat(cc, 3); bumpFan(cc, 13); bumpMorale(cc, 5);
            return 'The card with your name hitting eighth, framed, 10k of shipping and a photographer. Fanbase +13, morale +5.';
          },
        },
      ],
    });
  }

  if (yrs >= 3 && prevTeam && flag(c, 'b_revenge') === 0) {
    deck.push({
      id: 'mlbB_revengeSeries',
      title: 'Three games back where they traded you',
      body: `You return to ${mlbTeamLabelOf(prevTeam)} in June. They have already produced a tribute video you never asked for and a fan poll about whether to boo.`,
      options: [
        {
          label: 'Try to hit a ball onto the highway', effect: 'Swing for the story',
          apply: (cc, r) => {
            setFlag(cc, 'b_revenge', 1);
            if (r() < 0.5) { bumpFan(cc, 14); bumpMorale(cc, 10); return 'Three games, two of the loudest moments of your life, and a curtain call from the wrong crowd. Fanbase +14, morale +10.'; }
            bumpFan(cc, -3); bumpMorale(cc, -8);
            return '0 for 12 with six strikeouts in front of everybody you wanted to prove wrong. Fanbase -3, morale -8.';
          },
        },
        {
          label: 'Treat it like a Tuesday in May', effect: 'Boring on purpose',
          apply: (cc) => {
            setFlag(cc, 'b_revenge', 2); bumpMorale(cc, 5); bumpOvr(cc, 1); bumpFan(cc, -3);
            return 'Same routine, same nap, same nothing. Rating +1, morale +5, fanbase -3, and the tribute video played to a guy stretching.';
          },
        },
        {
          label: 'Buy the clubhouse staff dinner', effect: 'Love the building',
          apply: (cc) => {
            setFlag(cc, 'b_revenge', 3); spend(cc, 0.03); bumpFan(cc, 9); bumpMorale(cc, 8);
            return '30k on dinner for every clubhouse attendant, groundskeeper and security guard in that building. Fanbase +9, morale +8.';
          },
        },
      ],
    });
  }

  if (yrs >= 2 && flag(c, 'b_code') === 0 && rng() < 0.75) {
    deck.push({
      id: 'mlbB_unwrittenRules',
      title: 'The unwritten rules are on the table',
      body: isSp
        ? 'Their starter put one in your shortstop ribs. Your catcher already knows what the first pitch of the next inning is supposed to be.'
        : 'Your best friend on the team took one in the ribs. The rookie starter keeps looking at you to find out what happens next.',
      options: [
        {
          label: 'Handle it, take the ejection', effect: 'Code enforced',
          apply: (cc) => {
            setFlag(cc, 'b_code', 1); spend(cc, 0.03); addHeat(cc, 8); bumpMorale(cc, 10); bumpFan(cc, 11); bumpHealth(cc, -2);
            return 'One pitch, one ejection, one 30k fine and a clubhouse that would die for you. Morale +10, fanbase +11, health -2.';
          },
        },
        {
          label: 'Answer it on the scoreboard', effect: 'Runs over revenge',
          apply: (cc) => {
            setFlag(cc, 'b_code', 2); bumpOvr(cc, 1); bumpMorale(cc, 4); bumpFan(cc, -4);
            return 'You said the scoreboard settles it and then you put up a seven spot. Rating +1, morale +4, fanbase -4.';
          },
        },
        {
          label: 'Call their captain, settle it after', effect: 'Adults in a hallway',
          apply: (cc) => {
            setFlag(cc, 'b_code', 3); addHeat(cc, -4); bumpMorale(cc, 6); bumpHealth(cc, 2); bumpFan(cc, -3);
            return 'One phone call, one apology, zero suspensions. Morale +6, health +2, fanbase -3, and two old timers on TV called you soft.';
          },
        },
      ],
    });
  }

  /* ========== 4. BUSINESS AND INVESTING ========== */

  if (nw >= 2 && flag(c, 'b_restaurant') === 0) {
    deck.push({
      id: 'mlbB_steakhouse',
      title: 'Your name on a steakhouse',
      body: 'A restaurant group wants your face on the door and a booth with a plaque. You have eaten there twice and liked it once.',
      options: [
        {
          label: 'Buy in for 2.5M', effect: 'Real ownership, real risk',
          apply: (cc, r) => {
            setFlag(cc, 'b_restaurant', 1); spend(cc, 2.5); own(cc, 'Steakhouse');
            if (r() < 0.5) { earn(cc, 4.4); bumpFan(cc, 8); return 'The place prints money on homestands. 2.5M in, 4.4M back over four years, fanbase +8.'; }
            bumpMorale(cc, -6);
            return 'Two chefs quit, the landlord doubled the rent and 2.5M turned into a very nice mural of your face. Morale -6.';
          },
        },
        {
          label: 'License the name only', effect: 'No risk, small check',
          apply: (cc) => {
            setFlag(cc, 'b_restaurant', 2); earn(cc, 0.4); bumpFan(cc, 5);
            return '0.4M a year to let them use your name and nothing else. Fanbase +5, and you have never seen the kitchen.';
          },
        },
        {
          label: 'Pass, open a taco spot at home', effect: 'Small and yours',
          apply: (cc) => {
            setFlag(cc, 'b_restaurant', 3); spend(cc, 0.8); own(cc, 'Taco shop at home'); bumpMorale(cc, 8); bumpFan(cc, 6);
            return '0.8M for one small building on the street you grew up on. Morale +8, fanbase +6, and your aunt runs the register.';
          },
        },
      ],
    });
  }

  if (nw >= 4 && yrs >= 3 && flag(c, 'b_tech') === 0) {
    deck.push({
      id: 'mlbB_techPitch',
      title: 'Two guys with a bat knob sensor',
      body: 'It measures everything about a swing and syncs to a phone. They want 1.5M and they have said the word ecosystem nine times.',
      options: [
        {
          label: 'Write the 1.5M check', effect: 'Swing for the fence',
          apply: (cc, r) => {
            setFlag(cc, 'b_tech', 1); spend(cc, 1.5);
            if (r() < 0.35) { earn(cc, 7); own(cc, 'Swing sensor equity'); return 'A big glove company bought them in year three. 1.5M in, 7M out. Retire twice money.'; }
            bumpMorale(cc, -5);
            return 'The app never shipped and the founders now work at a bank. 1.5M gone, morale -5.';
          },
        },
        {
          label: 'Take equity for promoting it', effect: 'Skin, no cash',
          apply: (cc) => {
            setFlag(cc, 'b_tech', 2); earn(cc, 0.2); own(cc, 'Swing sensor equity'); bumpFan(cc, 6);
            return 'You posted about it eleven times for 0.2M and a small slice of paper. Fanbase +6, and no money left your account.';
          },
        },
        {
          label: 'Pass, put it in index funds', effect: 'Boring and rich',
          apply: (cc) => {
            setFlag(cc, 'b_tech', 3); bank(cc, 0.9); bumpMorale(cc, 3);
            return 'The same 1.5M sat in an index fund and quietly made 0.9M. Nobody wrote a single article about it. Morale +3.';
          },
        },
      ],
    });
  }

  if (nw >= 2 && yrs >= 4 && flag(c, 'b_academy') === 0) {
    deck.push({
      id: 'mlbB_youthAcademy',
      title: 'An academy with your name on the gate',
      body: 'Travel ball costs more than college now and the fields at home are still all dirt and no lights. You can change one zip code with one check.',
      options: [
        {
          label: 'Build it, free for every kid', effect: 'Give it away',
          apply: (cc) => {
            setFlag(cc, 'b_academy', 1); spend(cc, 3); own(cc, 'Free youth academy'); bumpFan(cc, 18); bumpMorale(cc, 16);
            return '3M for six cages, two turf fields and a zero dollar fee. Fanbase +18, morale +16, and 400 kids have somewhere to go in February.';
          },
        },
        {
          label: 'Build it as a real business', effect: 'Revenue and reach',
          apply: (cc) => {
            setFlag(cc, 'b_academy', 2); spend(cc, 2); own(cc, 'Youth academy'); earn(cc, 0.8); bumpFan(cc, 6);
            return '2M to build it, 0.8M a year coming back, and scholarships for the kids who cannot pay. Fanbase +6.';
          },
        },
        {
          label: 'Skip the building, pay the fees', effect: 'Money straight to kids',
          apply: (cc) => {
            setFlag(cc, 'b_academy', 3); spend(cc, 0.6); bumpFan(cc, 10); bumpMorale(cc, 10);
            return '0.6M covering travel team fees, gloves and hotel rooms for 90 families. Fanbase +10, morale +10, no ribbon cutting.';
          },
        },
      ],
    });
  }

  if (nw >= 1.5 && yrs >= 3 && flag(c, 'b_bats') === 0) {
    deck.push({
      id: 'mlbB_batCompany',
      title: 'A guy in a barn makes unreal bats',
      body: isSp
        ? 'You have not taken a real swing since college and you still know this wood is different. He wants a partner and a name on the barrel.'
        : 'He turns them by hand in a Pennsylvania barn and every one feels like it was built for your hands. He wants a partner and your name on the barrel.',
      options: [
        {
          label: 'Buy half the company', effect: 'Wood money',
          apply: (cc, r) => {
            setFlag(cc, 'b_bats', 1); spend(cc, 1.2); own(cc, 'Half a bat company');
            if (r() < 0.55) { earn(cc, 3); bumpFan(cc, 7); return 'Nine big leaguers switched to his wood in two years. 1.2M in, 3M back, fanbase +7.'; }
            earn(cc, 0.3);
            return 'He still makes the best bats nobody has heard of. 1.2M in, 0.3M back, and you have 400 of them in a garage.';
          },
        },
        {
          label: 'Endorse it, put in nothing', effect: 'Free money, no risk',
          apply: (cc) => {
            setFlag(cc, 'b_bats', 2); earn(cc, 0.5); bumpFan(cc, 4);
            return '0.5M a year to swing what you were already swinging. Fanbase +4.';
          },
        },
        {
          label: 'Buy him better machines, no equity', effect: 'Just help the guy',
          apply: (cc) => {
            setFlag(cc, 'b_bats', 3); spend(cc, 0.4); bumpMorale(cc, 9); bumpFan(cc, 5);
            return '0.4M of lathes and a second barn, no paperwork, no percentage. Morale +9, fanbase +5, and he named a model after your mother.';
          },
        },
      ],
    });
  }

  if (c.age >= 28 && nw >= 2 && flag(c, 'b_bourbon') === 0) {
    deck.push({
      id: 'mlbB_bourbonLabel',
      title: 'A bourbon with your number on the bottle',
      body: 'A distillery in Kentucky wants a signature barrel with your number on the label. The barrel is already aging, which feels like a negotiating tactic.',
      options: [
        {
          label: 'Full partner, money in', effect: 'Own the barrel',
          apply: (cc, r) => {
            setFlag(cc, 'b_bourbon', 1); spend(cc, 1.4); own(cc, 'Bourbon label');
            if (r() < 0.5) { earn(cc, 4.2); bumpFan(cc, 9); return 'It sold out in nine days three years running. 1.4M in, 4.2M back, fanbase +9.'; }
            earn(cc, 0.7);
            return 'Great whiskey, terrible distribution. 1.4M in, 0.7M back, and every teammate got a bottle for Christmas.';
          },
        },
        {
          label: 'Take the licensing fee', effect: 'Name only, safe',
          apply: (cc) => {
            setFlag(cc, 'b_bourbon', 2); earn(cc, 0.9); bumpFan(cc, 4);
            return '0.9M up front to put your number on a label you had no part in making. Fanbase +4.';
          },
        },
        {
          label: 'Say no, you do not drink', effect: 'Clean and consistent',
          apply: (cc) => {
            setFlag(cc, 'b_bourbon', 3); bumpMorale(cc, 7); bumpHealth(cc, 2); bumpFan(cc, 2);
            return 'You turned down 0.9M because you have never had a drink in your life and you were not going to start selling one. Morale +7, health +2.';
          },
        },
      ],
    });
  }

  if (nw >= 5 && yrs >= 6 && flag(c, 'b_milb') === 0) {
    deck.push({
      id: 'mlbB_minorLeagueClub',
      title: 'A Double A club is for sale',
      body: 'Fourteen million for a ballpark, 4,000 seats in a town of 60,000, and a mascot with a documented history of assault on umpires. The current owner cried during the tour.',
      options: [
        {
          label: 'Buy the whole club', effect: 'Own a team',
          apply: (cc) => {
            setFlag(cc, 'b_milb', 1); spend(cc, 5); own(cc, 'Double A club'); earn(cc, 0.6); bumpFan(cc, 12); bumpMorale(cc, 14);
            return '5M down on a ballpark with your name on the deed and 0.6M a year coming back. Fanbase +12, morale +14, and dollar hot dog night is now a personal project.';
          },
        },
        {
          label: 'Take a minority piece', effect: 'Small slice, no headaches',
          apply: (cc) => {
            setFlag(cc, 'b_milb', 2); spend(cc, 1.5); own(cc, 'Minority stake in a Double A club'); earn(cc, 0.2); bumpFan(cc, 6);
            return '1.5M for a slice, a parking spot and two votes on nothing. 0.2M a year back, fanbase +6.';
          },
        },
        {
          label: 'Pass, buy the scoreboard instead', effect: 'Cheap and visible',
          apply: (cc) => {
            setFlag(cc, 'b_milb', 3); spend(cc, 0.15); bumpFan(cc, 5); bumpMorale(cc, 4);
            return '0.15M for a new video board with your name on the bottom corner forever. Fanbase +5, morale +4.';
          },
        },
      ],
    });
  }

  /* ========== 5. OFFSEASON LIFE ========== */

  if (flag(c, 'b_fish') === 0 && rng() < 0.85) {
    deck.push({
      id: 'mlbB_fishingVideo',
      title: 'The fishing video got away from you',
      body: 'You caught something enormous, screamed a word you cannot un scream, and your buddy posted all four minutes of it. Forty million views by Thursday.',
      options: [
        {
          label: 'Lean in, film a whole series', effect: 'Outdoor content empire',
          apply: (cc) => {
            setFlag(cc, 'b_fish', 1); earn(cc, 0.7); bumpFan(cc, 15); bumpHealth(cc, -2);
            return '0.7M for eight episodes of you on a boat being loud. Fanbase +15, health -2, and a rod company sends you gear forever.';
          },
        },
        {
          label: 'Delete it and apologize to the league', effect: 'Damage control',
          apply: (cc) => {
            setFlag(cc, 'b_fish', 2); spend(cc, 0.02); addHeat(cc, -4); bumpFan(cc, -5); bumpMorale(cc, 3);
            return '20k to a crisis person for one paragraph nobody believed. Fanbase -5, morale +3, and the clip lives forever anyway.';
          },
        },
        {
          label: 'Say nothing, keep fishing', effect: 'Peace over posting',
          apply: (cc) => {
            setFlag(cc, 'b_fish', 3); bumpMorale(cc, 10); bumpHealth(cc, 4); bumpFan(cc, 4);
            return 'You never addressed it and went out on the water 40 more times. Morale +10, health +4, fanbase +4.';
          },
        },
      ],
    });
  }

  if (yrs >= 2 && flag(c, 'b_golf') === 0) {
    deck.push({
      id: 'mlbB_celebrityGolf',
      title: 'The celebrity golf tournament',
      body: 'Three days in February, a pro am pairing and a live television window. Your hitting coach has begged you not to touch a golf club until March.',
      options: [
        {
          label: 'Play all three days', effect: 'Cameras and consequences',
          apply: (cc, r) => {
            setFlag(cc, 'b_golf', 1); earn(cc, 0.2); bumpFan(cc, 10); bumpHealth(cc, -3);
            if (r() < 0.3) { dropOvr(cc, 1); return '0.2M, three days on television and a swing that came into camp eight inches too long. Fanbase +10, rating -1, health -3.'; }
            return '0.2M, three days on television and a hole in one on a par three with 900 people watching. Fanbase +10, health -3.';
          },
        },
        {
          label: 'Show up for the dinner only', effect: 'Face time, no swings',
          apply: (cc) => {
            setFlag(cc, 'b_golf', 2); earn(cc, 0.1); bumpFan(cc, 5); bumpMorale(cc, 4);
            return 'One tuxedo, one auction, 0.1M appearance fee and zero golf swings. Fanbase +5, morale +4.';
          },
        },
        {
          label: 'Stay home in the cage', effect: 'Reps over cameras',
          apply: (cc) => {
            setFlag(cc, 'b_golf', 3); bumpOvr(cc, 1); bumpMorale(cc, -3); bumpFan(cc, -4);
            return 'Six weeks of tee work while everybody else was on a course in Florida. Rating +1, morale -3, fanbase -4.';
          },
        },
      ],
    });
  }

  if ((c.ovr >= 85 || c.allStars >= 2) && flag(c, 'b_cover') === 0) {
    deck.push({
      id: 'mlbB_gameCover',
      title: 'The video game wants your face',
      body: 'Cover athlete, a full day in a motion capture suit with ninety cameras on you. Every single person in your clubhouse has already mentioned the curse.',
      options: [
        {
          label: 'Take the cover', effect: 'Big money, big curse',
          apply: (cc, r) => {
            setFlag(cc, 'b_cover', 1); earn(cc, 2.5); bumpFan(cc, 18);
            if (r() < 0.3) { bumpHealth(cc, -8); return '2.5M and your face on ten million boxes. Fanbase +18, health -8, and the entire internet blamed a video game.'; }
            return '2.5M and your face on ten million boxes. Fanbase +18, and the curse got somebody else this year.';
          },
        },
        {
          label: 'Take a smaller deal, no cover', effect: 'Money without the box',
          apply: (cc) => {
            setFlag(cc, 'b_cover', 2); earn(cc, 0.8); bumpFan(cc, 6);
            return '0.8M to be in the trailer and on the loading screen instead. Fanbase +6, curse successfully dodged.';
          },
        },
        {
          label: 'Turn it down, superstition', effect: 'Nothing over the curse',
          apply: (cc) => {
            setFlag(cc, 'b_cover', 3); bumpMorale(cc, 8); bumpHealth(cc, 4); bumpFan(cc, -6);
            return 'You left 2.5M on a table because of a curse you cannot prove exists. Morale +8, health +4, fanbase -6.';
          },
        },
      ],
    });
  }

  if ((c.ovr < 82 || c.morale < 60) && c.age <= 31 && yrs >= 1 && flag(c, 'b_winterBall') === 0) {
    deck.push({
      id: 'mlbB_winterBall',
      title: 'Winter ball in the Dominican',
      body: 'Sixty games in December in front of crowds that boo like it is Game 7 of the World Series. Your agent says rest. Your bat says reps.',
      options: [
        {
          label: 'Go play the whole winter', effect: 'Reps over rest',
          apply: (cc) => {
            setFlag(cc, 'b_winterBall', 1); bumpOvr(cc, 2); bumpHealth(cc, -6); bumpFan(cc, 8); bumpMorale(cc, 6);
            return 'Sixty games, two hurricanes of noise and the best baseball education of your life. Rating +2, health -6, fanbase +8, morale +6.';
          },
        },
        {
          label: 'Two weeks, then come home', effect: 'Split the winter',
          apply: (cc) => {
            setFlag(cc, 'b_winterBall', 2); bumpOvr(cc, 1); bumpHealth(cc, -2); bumpFan(cc, 4);
            return 'Fourteen games, one very loud playoff atmosphere and a flight home before Christmas. Rating +1, health -2, fanbase +4.';
          },
        },
        {
          label: 'Stay home and heal', effect: 'Body first',
          apply: (cc) => {
            setFlag(cc, 'b_winterBall', 3); bumpHealth(cc, 9); bumpMorale(cc, 3);
            return 'Four months of sleep, treatment and nothing else. Health +9, morale +3.';
          },
        },
      ],
    });
  }

  if (c.age >= 25 && flag(c, 'b_cook') === 0) {
    deck.push({
      id: 'mlbB_learningToCook',
      title: 'You cannot cook a single thing',
      body: `${c.age} years old and your entire menu is a protein shake and whatever the clubhouse chef made at 3pm. That has started to genuinely embarrass you.`,
      options: [
        {
          label: 'Take real classes all winter', effect: 'Skill for life',
          apply: (cc) => {
            setFlag(cc, 'b_cook', 1); spend(cc, 0.05); bumpMorale(cc, 10); bumpHealth(cc, 6);
            return '50k on twelve weeks of classes and now you can actually feed people. Morale +10, health +6.';
          },
        },
        {
          label: 'Hire a private chef instead', effect: 'Buy the outcome',
          apply: (cc) => {
            setFlag(cc, 'b_cook', 2); spend(cc, 0.3); bumpHealth(cc, 8); bumpMorale(cc, 4);
            return '0.3M a year for a chef who weighs your food and never lets you near the stove. Health +8, morale +4.';
          },
        },
        {
          label: 'Learn one dish and make it constantly', effect: 'One trick, mastered',
          apply: (cc) => {
            setFlag(cc, 'b_cook', 3); bumpMorale(cc, 7); bumpHealth(cc, 3); bumpFan(cc, 3);
            return 'You make one pasta and you make it 90 times. Morale +7, health +3, fanbase +3, and the recipe video did 6 million views.';
          },
        },
      ],
    });
  }

  if ((nw >= 3 || c.earnings >= 15) && yrs >= 3 && flag(c, 'b_foundation') === 0) {
    deck.push({
      id: 'mlbB_foundationLaunch',
      title: 'The foundation needs a purpose',
      body: 'The paperwork is filed and the checkbook is real. Your lawyer needs one sentence describing what the thing actually does.',
      options: [
        {
          label: 'Fields and equipment back home', effect: 'Build the thing',
          apply: (cc) => {
            setFlag(cc, 'b_foundation', 1); spend(cc, 1.5); own(cc, 'Foundation fields program'); bumpFan(cc, 14); bumpMorale(cc, 12);
            return '1.5M into lights, turf and 600 gloves in the county you grew up in. Fanbase +14, morale +12.';
          },
        },
        {
          label: 'College money for eleven kids a year', effect: 'Quiet and enormous',
          apply: (cc) => {
            setFlag(cc, 'b_foundation', 2); spend(cc, 1.2); own(cc, 'Scholarship fund'); bumpMorale(cc, 16); bumpFan(cc, 8);
            return '1.2M endowed, eleven full rides a year, forever, whether anybody writes about it or not. Morale +16, fanbase +8.';
          },
        },
        {
          label: 'Keep it small and run it yourself', effect: 'Hands on, tiring',
          apply: (cc) => {
            setFlag(cc, 'b_foundation', 3); spend(cc, 0.4); bumpMorale(cc, 9); bumpHealth(cc, -3);
            return '0.4M, no staff, and 200 hours of your own offseason on the phone. Morale +9, health -3.';
          },
        },
      ],
    });
  }

  if (c.fanbase >= 50 && flag(c, 'b_video') === 0 && rng() < 0.8) {
    deck.push({
      id: 'mlbB_countryMusicVideo',
      title: 'A country singer wants you in the video',
      body: 'You play a guy who loses a fight outside a bar and then drives a truck through a field for no stated reason. Two days of shooting in Tennessee.',
      options: [
        {
          label: 'Do the whole thing', effect: 'Truck, field, paycheck',
          apply: (cc) => {
            setFlag(cc, 'b_video', 1); earn(cc, 0.3); bumpFan(cc, 12); bumpMorale(cc, 6);
            return '0.3M, two days, one truck and a fake punch that actually connected. Fanbase +12, morale +6.';
          },
        },
        {
          label: 'Only if they let you sing one line', effect: 'Fame with a cost',
          apply: (cc) => {
            setFlag(cc, 'b_video', 2); earn(cc, 0.15); bumpFan(cc, 16); bumpMorale(cc, -4);
            return '0.15M and one line of singing that is now a ringtone in every clubhouse in the league. Fanbase +16, morale -4.';
          },
        },
        {
          label: 'Pass, go hunting instead', effect: 'Woods over cameras',
          apply: (cc) => {
            setFlag(cc, 'b_video', 3); bumpMorale(cc, 8); bumpHealth(cc, 3);
            return 'Nine days in the woods with no phone service and no music video. Morale +8, health +3.';
          },
        },
      ],
    });
  }

  /* ========== 6. GENUINELY WEIRD BASEBALL LIFE ========== */

  if (c.fanbase >= 60 && flag(c, 'b_namefan') === 0) {
    deck.push({
      id: 'mlbB_nameChangeFan',
      title: 'A man in Ohio legally changed his name to yours',
      body: 'Forty one years old, three kids, full legal name change at a county courthouse. His wife found out from a piece of mail.',
      options: [
        {
          label: 'Fly him out, jersey, field passes', effect: 'Wholesome and viral',
          apply: (cc) => {
            setFlag(cc, 'b_namefan', 1); spend(cc, 0.06); bumpFan(cc, 14); bumpMorale(cc, 7);
            return '60k for flights, seats behind the dugout and a jersey with a name that is now legally both of yours. Fanbase +14, morale +7.';
          },
        },
        {
          label: 'Have your lawyer send a letter', effect: 'Safe and cold',
          apply: (cc) => {
            setFlag(cc, 'b_namefan', 2); spend(cc, 0.04); bumpFan(cc, -8); bumpMorale(cc, 5);
            return '40k in legal fees and one very sad reply email. Fanbase -8, morale +5, and you sleep fine now.';
          },
        },
        {
          label: 'Hire him as your assistant', effect: 'Two of you now',
          apply: (cc) => {
            setFlag(cc, 'b_namefan', 3); spend(cc, 0.2); bumpFan(cc, 18); bumpMorale(cc, 6);
            return '0.2M a year for an assistant with your exact legal name, which has now broken three airline booking systems. Fanbase +18, morale +6.';
          },
        },
      ],
    });
  }

  if (yrs >= 2 && flag(c, 'b_psychic') === 0 && rng() < 0.8) {
    deck.push({
      id: 'mlbB_ownerPsychic',
      title: 'The owner hired a psychic',
      body: 'She sits behind home plate with a notebook and has firm opinions about the bullpen. The pitching coach stopped arguing with her in May.',
      options: [
        {
          label: 'Take the reading', effect: 'Coin flip for the soul',
          apply: (cc, r) => {
            setFlag(cc, 'b_psychic', 1);
            if (r() < 0.5) { bumpMorale(cc, 12); return 'She said you win a ring in a cold city for a manager you have not met yet. Morale +12, and you think about it constantly.'; }
            bumpMorale(cc, -8); bumpFan(cc, 2);
            return 'She named the exact age your career ends and then refused to explain herself. Morale -8, and you have not slept right since.';
          },
        },
        {
          label: 'Refuse and get called difficult', effect: 'Video over visions',
          apply: (cc) => {
            setFlag(cc, 'b_psychic', 2); bumpOvr(cc, 1); bumpMorale(cc, -3);
            return 'You walked out and watched video instead. Rating +1, morale -3, and the owner used the word attitude twice.';
          },
        },
        {
          label: 'Pay her privately about your contract', effect: 'Expensive advice',
          apply: (cc) => {
            setFlag(cc, 'b_psychic', 3); spend(cc, 0.03); bumpMorale(cc, 6);
            return '30k for a private session in which she told you to ask for more money. She was completely correct. Morale +6.';
          },
        },
      ],
    });
  }

  if (yrs >= 2 && flag(c, 'b_ghost') === 0 && rng() < 0.8) {
    deck.push({
      id: 'mlbB_clubhouseGhost',
      title: 'The clubhouse is haunted',
      body: 'Three rookies swear it is a utility infielder from 1968. The clubhouse manager refuses to deny it, which is somehow much worse.',
      options: [
        {
          label: 'Sleep in the clubhouse overnight', effect: 'Content, no sleep',
          apply: (cc) => {
            setFlag(cc, 'b_ghost', 1); bumpFan(cc, 13); bumpHealth(cc, -3); bumpMorale(cc, 6);
            return 'Nine hours, four cameras and one genuinely unexplained sound at 3:40am. Fanbase +13, morale +6, health -3.';
          },
        },
        {
          label: 'Sage ceremony with a bluetooth speaker', effect: 'Vibes restored',
          apply: (cc) => {
            setFlag(cc, 'b_ghost', 2); spend(cc, 0.01); bumpMorale(cc, 8); bumpFan(cc, 6);
            return '10k of sage, one speaker and the entire starting rotation holding hands in a circle. Morale +8, fanbase +6.';
          },
        },
        {
          label: 'Move your locker across the room', effect: 'Coward, comfortable',
          apply: (cc) => {
            setFlag(cc, 'b_ghost', 3); bumpMorale(cc, -3); bumpHealth(cc, 3); bumpFan(cc, -2);
            return 'You moved and never explained why. The new spot is next to the food room, which rules. Health +3, morale -3, fanbase -2.';
          },
        },
      ],
    });
  }

  if (yrs >= 1 && flag(c, 'b_mascot') === 0 && rng() < 0.85) {
    deck.push({
      id: 'mlbB_mascotFeud',
      title: 'The mascot is coming for you',
      body: 'He mocked your batting stance on the dugout roof in front of 38,000 people. You have been informed there is a man in there and his name is Doug.',
      options: [
        {
          label: 'Escalate publicly, all season', effect: 'War with a costume',
          apply: (cc) => {
            setFlag(cc, 'b_mascot', 1); addHeat(cc, 3); bumpFan(cc, 16); bumpMorale(cc, 7);
            return 'Six months of a genuine feud with a seven foot bird. Fanbase +16, morale +7, and the club sold shirts about it without paying you.';
          },
        },
        {
          label: 'Take Doug to lunch', effect: 'Peace with Doug',
          apply: (cc) => {
            setFlag(cc, 'b_mascot', 2); spend(cc, 0.01); bumpMorale(cc, 9); bumpFan(cc, 5);
            return 'A 10k lunch, a real conversation and a man who has three kids and a torn labrum. Morale +9, fanbase +5.';
          },
        },
        {
          label: 'Complain to the front office', effect: 'Win, look terrible',
          apply: (cc) => {
            setFlag(cc, 'b_mascot', 3); addHeat(cc, -2); bumpFan(cc, -9); bumpMorale(cc, 3);
            return 'Doug got a written warning and the entire city found out within a day. Fanbase -9, morale +3.';
          },
        },
      ],
    });
  }

  if (yrs >= 1 && flag(c, 'b_race') === 0 && rng() < 0.85) {
    deck.push({
      id: 'mlbB_hotDogRace',
      title: 'You entered the hot dog race',
      body: 'Between innings, in full uniform, against three grown adults dressed as condiments. The manager found out from the video board like everybody else.',
      options: [
        {
          label: 'Sprint it and take the belt', effect: 'Glory or a hamstring',
          apply: (cc, r) => {
            setFlag(cc, 'b_race', 1);
            if (r() < 0.75) { bumpFan(cc, 15); bumpMorale(cc, 10); return 'You beat Ketchup by nine feet and the dugout has not recovered. Fanbase +15, morale +10.'; }
            bumpHealth(cc, -10); bumpFan(cc, 8); bumpMorale(cc, -4);
            return 'You pulled a hamstring racing a condiment on national television. Health -10, fanbase +8, morale -4.';
          },
        },
        {
          label: 'Jog it and let Mustard win', effect: 'Bit over the belt',
          apply: (cc) => {
            setFlag(cc, 'b_race', 2); bumpFan(cc, 9); bumpMorale(cc, 6);
            return 'You lost on purpose, threw your helmet in fake despair and Mustard did a backflip. Fanbase +9, morale +6.';
          },
        },
        {
          label: 'Do it on an off day in street clothes', effect: 'Approved and safe',
          apply: (cc) => {
            setFlag(cc, 'b_race', 3); bumpFan(cc, 5); bumpMorale(cc, 7); bumpHealth(cc, 2);
            return 'Cleared by the trainer, in jeans, in front of 900 people at a charity night. Fanbase +5, morale +7, health +2.';
          },
        },
      ],
    });
  }

  if (yrs >= 1 && flag(c, 'b_raccoon') === 0 && rng() < 0.85) {
    deck.push({
      id: 'mlbB_bullpenRaccoon',
      title: 'There is a raccoon living in the bullpen',
      body: 'Nine days now. He has a name. It is Rico and he is 3 for 3 against the strength staff.',
      options: [
        {
          label: 'Adopt Rico as the lucky charm', effect: 'Bullpen mascot',
          apply: (cc) => {
            setFlag(cc, 'b_raccoon', 1); bumpFan(cc, 12); bumpMorale(cc, 9); bumpHealth(cc, -2);
            return 'Rico has a bowl, a nameplate on the bullpen bench and an undefeated record against grown men. Fanbase +12, morale +9, health -2.';
          },
        },
        {
          label: 'Call animal control quietly', effect: 'Clean and boring',
          apply: (cc) => {
            setFlag(cc, 'b_raccoon', 2); bumpHealth(cc, 4); bumpMorale(cc, -4); bumpFan(cc, -3);
            return 'Rico was relocated to a state park 40 miles away. Health +4, morale -4, fanbase -3, and two relievers have not forgiven you.';
          },
        },
        {
          label: 'Give Rico his own account', effect: 'Monetize the raccoon',
          apply: (cc) => {
            setFlag(cc, 'b_raccoon', 3); earn(cc, 0.3); bumpFan(cc, 17); bumpHealth(cc, -3);
            return 'Rico has 1.4 million followers and a snack sponsorship worth 0.3M. Fanbase +17, health -3, and he has more engagement than you do.';
          },
        },
      ],
    });
  }

  /* ========== 7. CONTRACT AND CAREER FORKS ========== */

  if (c.contractYears <= 0 && c.ovr >= 78 && yrs >= 6 && flag(c, 'b_qo') === 0) {
    const qo = money(21 + Math.max(0, c.year - 2026) * 0.4);
    const mkt = marketOf(c);
    deck.push({
      id: 'mlbB_qualifyingOffer',
      title: `The qualifying offer is ${qo}M`,
      body: `The ${mlbTeamLabelOf(c.team)} tagged you with it. Take it and you are here one more year. Turn it down and every club that signs you gives up a draft pick, which your agent calls leverage and you call a problem.`,
      options: [
        {
          label: 'Accept it, bet on yourself', effect: 'One year, prove it',
          apply: (cc) => {
            setFlag(cc, 'b_qo', 1); cc.salary = qo; cc.contractYears = 1; bumpMorale(cc, 4); bumpFan(cc, 8);
            return `Signed for ${qo}M and one season with everything to prove. Fanbase +8, morale +4.`;
          },
        },
        {
          label: 'Reject it and hit the market', effect: 'Roll the dice',
          apply: (cc, r) => {
            setFlag(cc, 'b_qo', 2);
            if (r() < 0.55) {
              const nt = otherClub(cc, r); cc.team = nt; cc.salary = money(mkt * 1.15); cc.contractYears = 4; cc.fanbase = 40; bumpMorale(cc, 10);
              return `Four years and ${money(cc.salary)}M a year from the ${mlbTeamLabelOf(nt)}. Fanbase reset to 40, morale +10.`;
            }
            cc.salary = money(Math.max(2, mkt * 0.8)); cc.contractYears = 2; bumpMorale(cc, -8); bumpFan(cc, -4);
            return `The draft pick scared everybody off until February. Two years at ${money(cc.salary)}M, morale -8, fanbase -4.`;
          },
        },
        {
          label: 'Reject it, extend right now', effect: 'Deal before the market',
          apply: (cc) => {
            setFlag(cc, 'b_qo', 3); cc.salary = money(mkt * 0.95); cc.contractYears = 3; bumpMorale(cc, 6); bumpFan(cc, 10);
            return `Three years at ${money(cc.salary)}M without ever taking a free agent phone call. Fanbase +10, morale +6.`;
          },
        },
      ],
    });
  }

  if (c.contractYears >= 2 && c.salary >= 12 && c.ovr >= 82 && flag(c, 'b_optOut') === 0) {
    const guaranteed = money(c.salary * c.contractYears);
    deck.push({
      id: 'mlbB_optOutClause',
      title: 'The opt out is sitting right there',
      body: `Sit still and ${guaranteed}M is already guaranteed to you. Opt out and you hit the market at the exact peak of your career, which is either genius or the worst decision you will ever make.`,
      options: [
        {
          label: 'Opt out, chase the mega deal', effect: 'Peak leverage swing',
          apply: (cc, r) => {
            setFlag(cc, 'b_optOut', 1);
            if (r() < 0.6) {
              const nt = otherClub(cc, r); cc.team = nt; cc.salary = money(cc.salary * 1.4); cc.contractYears = 6; cc.fanbase = 42; bumpMorale(cc, 12);
              return `Six years at ${money(cc.salary)}M a year with the ${mlbTeamLabelOf(nt)}. You walked away from ${guaranteed}M and got way more. Morale +12.`;
            }
            cc.salary = money(cc.salary * 0.95); cc.contractYears = 3; bumpMorale(cc, -7); bumpFan(cc, -3);
            return `The market went cold on your age. Three years at ${money(cc.salary)}M, less than you already had. Morale -7, fanbase -3.`;
          },
        },
        {
          label: 'Use it as leverage, extend here', effect: 'Cash in without moving',
          apply: (cc) => {
            setFlag(cc, 'b_optOut', 2); cc.salary = money(cc.salary * 1.15); cc.contractYears += 3; bumpMorale(cc, 8); bumpFan(cc, 10);
            return `They tore it up rather than lose you. ${money(cc.salary)}M a year, ${cc.contractYears} years left. Morale +8, fanbase +10.`;
          },
        },
        {
          label: 'Stay quiet, play the deal out', effect: 'Zero drama',
          apply: (cc) => {
            setFlag(cc, 'b_optOut', 3); bumpMorale(cc, 5); bumpFan(cc, 6); bumpHealth(cc, 2);
            return `You never mentioned the clause once and kept every one of the ${guaranteed}M. Morale +5, fanbase +6, health +2.`;
          },
        },
      ],
    });
  }

  if (yrs >= 3 && c.rings === 0 && c.contractYears >= 1 && last && last.teamResult === 'Missed October' && flag(c, 'b_deadline') === 0) {
    deck.push({
      id: 'mlbB_deadlineContender',
      title: 'Your agent needs an answer before July',
      body: `The ${mlbTeamLabelOf(c.team)} are going to be sellers again and everybody knows it. He wants to know now whether you would go to a contender at the deadline.`,
      options: [
        {
          label: 'Yes, get me somewhere that wins', effect: 'Rent a contender',
          apply: (cc, r) => {
            setFlag(cc, 'b_deadline', 1);
            const nt = otherClub(cc, r); cc.team = nt; cc.fanbase = 44; bumpMorale(cc, 14);
            return `Traded to the ${mlbTeamLabelOf(nt)} in July for two prospects and a pitcher nobody has heard of. Fanbase reset to 44, morale +14.`;
          },
        },
        {
          label: 'No, finish what you started here', effect: 'Stay and lead',
          apply: (cc) => {
            setFlag(cc, 'b_deadline', 2); bumpMorale(cc, 6); bumpFan(cc, 14); bumpOvr(cc, 1);
            return 'You told him you were not leaving a 68 win team you helped build. Rating +1, fanbase +14, morale +6.';
          },
        },
        {
          label: 'Yes, but only with an extension attached', effect: 'Move for security',
          apply: (cc, r) => {
            setFlag(cc, 'b_deadline', 3);
            if (r() < 0.5) {
              const nt = otherClub(cc, r); cc.team = nt; cc.salary = money(cc.salary * 1.2); cc.contractYears += 3; cc.fanbase = 46; bumpMorale(cc, 10);
              return `The ${mlbTeamLabelOf(nt)} traded for you and extended you the same night. ${money(cc.salary)}M a year, ${cc.contractYears} years left, morale +10.`;
            }
            bumpMorale(cc, -3); bumpFan(cc, 6);
            return 'Nobody wanted to pay the prospects and the extension. You stayed, and everyone in the building knows exactly how you feel. Morale -3, fanbase +6.';
          },
        },
      ],
    });
  }

  if (c.contractYears <= 0 && yrs >= 5 && flag(c, 'b_homeDisc') === 0) {
    const mkt2 = marketOf(c);
    const home = money(Math.max(1.5, mkt2 * 0.75));
    const away = money(Math.max(2, mkt2 * 1.2));
    deck.push({
      id: 'mlbB_hometownDiscount',
      title: 'Less money to stay put',
      body: `The ${mlbTeamLabelOf(c.team)} offered ${home}M a year. A club two time zones away offered ${away}M and a private jet clause.`,
      options: [
        {
          label: 'Take the discount and stay', effect: 'Loyalty over dollars',
          apply: (cc) => {
            setFlag(cc, 'b_homeDisc', 1); cc.salary = home; cc.contractYears = 4; bumpFan(cc, 18); bumpMorale(cc, 12);
            return `Four years at ${home}M, which is ${money(away - home)}M a year you will never see again. Fanbase +18, morale +12.`;
          },
        },
        {
          label: 'Take the money', effect: 'Every last dollar',
          apply: (cc, r) => {
            setFlag(cc, 'b_homeDisc', 2);
            const nt = otherClub(cc, r); cc.team = nt; cc.salary = away; cc.contractYears = 4; cc.fanbase = 38; bumpMorale(cc, -4);
            return `Four years at ${away}M with the ${mlbTeamLabelOf(nt)}. Generational money, brand new zip code, fanbase reset to 38.`;
          },
        },
        {
          label: 'Shorter deal at full price, at home', effect: 'Split the difference',
          apply: (cc) => {
            setFlag(cc, 'b_homeDisc', 3); cc.salary = money(away * 0.95); cc.contractYears = 2; bumpMorale(cc, 6); bumpFan(cc, 6);
            return `Two years at ${money(cc.salary)}M and you never had to move. Morale +6, fanbase +6, and you are back on the market at 2 years older.`;
          },
        },
      ],
    });
  }

  if (yrs >= 8 && c.age >= 30 && c.health >= 70 && c.earnings >= 40 && flag(c, 'b_walkAway') === 0) {
    deck.push({
      id: 'mlbB_retireHealthy',
      title: 'You could stop right now',
      body: 'Elbow, shoulder, knees and money all intact at the same time. Almost nobody in this sport ever gets handed that combination.',
      options: [
        {
          label: 'Announce this is the last one', effect: 'Leave whole',
          apply: (cc) => {
            setFlag(cc, 'b_walkAway', 1); cc.contractYears = 1; bumpMorale(cc, 12); bumpFan(cc, 14); bumpHealth(cc, 4);
            return 'You told them in January that this was the last one. Morale +12, fanbase +14, health +4, and every single game felt different.';
          },
        },
        {
          label: 'Keep going until the game says stop', effect: 'Chase the ceiling',
          apply: (cc) => {
            setFlag(cc, 'b_walkAway', 2); bumpMorale(cc, 6); bumpOvr(cc, 1); bumpHealth(cc, -3);
            return 'You are not done and you said so out loud into eight microphones. Rating +1, morale +6, health -3.';
          },
        },
        {
          label: 'One more year, decide in the spring', effect: 'Kick the can',
          apply: (cc) => {
            setFlag(cc, 'b_walkAway', 3); bumpMorale(cc, 4); bumpHealth(cc, 2);
            return 'One more season and a decision you moved to next March. Morale +4, health +2.';
          },
        },
      ],
    });
  }

  if (c.age >= 33 && yrs >= 8 && flag(c, 'b_asia') === 0) {
    const jpn = money(Math.max(4, c.salary * 1.5));
    deck.push({
      id: 'mlbB_japanOffer',
      title: `Japan is offering ${jpn}M a year`,
      body: `A club in Japan has two years at ${jpn}M on the table, plus an apartment, a translator and a level of respect that stopped existing for you here around March.`,
      options: [
        {
          label: 'Go play in Japan', effect: 'New country, top billing',
          apply: (cc) => {
            setFlag(cc, 'b_asia', 1);
            cc.team = 'Yomiuri Giants'; cc.salary = jpn; cc.contractYears = 2; cc.fanbase = 34; bumpMorale(cc, 14); bumpHealth(cc, 4);
            return `Two years at ${jpn}M in Tokyo, batting in front of 45,000 people who sing for nine innings straight. Morale +14, health +4, fanbase reset to 34.`;
          },
        },
        {
          label: 'Stay here in a smaller role', effect: 'Home, less money',
          apply: (cc) => {
            setFlag(cc, 'b_asia', 2); cc.salary = money(Math.max(1.2, cc.salary * 0.5)); cc.contractYears = 1; bumpMorale(cc, -4); bumpFan(cc, 6);
            return `One year at ${money(cc.salary)}M for a bench job in a league you refuse to leave. Fanbase +6, morale -4.`;
          },
        },
        {
          label: 'Use the offer as leverage here', effect: 'Bluff with a real hand',
          apply: (cc, r) => {
            setFlag(cc, 'b_asia', 3);
            if (r() < 0.5) { cc.salary = money(Math.max(2, cc.salary * 1.25)); cc.contractYears = 2; bumpMorale(cc, 8); bumpFan(cc, 6); return `Somebody blinked. Two years at ${money(cc.salary)}M without leaving the country. Morale +8, fanbase +6.`; }
            cc.salary = money(Math.max(1.2, cc.salary * 0.85)); cc.contractYears = 1; bumpMorale(cc, -6);
            return `Nobody blinked, and the Japan offer expired while you waited. One year at ${money(cc.salary)}M. Morale -6.`;
          },
        },
      ],
    });
  }

  return deck;
}
