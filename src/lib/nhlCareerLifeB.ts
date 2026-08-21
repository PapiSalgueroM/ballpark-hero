/**
 * NHL My Career life deck B (Round 59). Forty five extra offseason
 * decisions the base engine never touches: family and home, legacy and
 * records, rivalries, clean business, offseason nonsense, genuinely
 * unhinged hockey life, and the contract forks that decide how a career
 * actually ends. Goalies and skaters live different lives, so several
 * blocks are gated on position.
 *
 * CIRCULAR IMPORT WARNING: nhlMyCareer.ts imports this file, so this
 * module sits inside an import cycle with it. Never read an imported
 * VALUE at module scope. Every imported value below is only ever touched
 * inside a function body, which runs long after both modules finish
 * loading. This exact bug already blanked the page once.
 */

import type { NhlCareerState, NhlCareerEvent } from './nhlMyCareer';
import { nhlTeamLabelOf, nhlEraTeamIds } from './nhlMyCareer';

/** Round 59 life fields are not on NhlCareerState yet, so read them through here. */
type LifeState = NhlCareerState & {
  netWorth?: number;
  dirtyMoney?: number;
  heat?: number;
  purchased?: string[];
  lifeFlags?: Record<string, number>;
};

const L = (c: NhlCareerState): LifeState => c as LifeState;

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));
const m1 = (n: number): number => Math.round(n * 10) / 10;
const m2 = (n: number): number => Math.round(n * 100) / 100;

function addNet(c: NhlCareerState, amt: number): number {
  const l = L(c);
  l.netWorth = m2((l.netWorth ?? 0) + amt);
  return l.netWorth;
}

function addDirty(c: NhlCareerState, amt: number): number {
  const l = L(c);
  l.dirtyMoney = m2((l.dirtyMoney ?? 0) + amt);
  return l.dirtyMoney;
}

function addHeat(c: NhlCareerState, amt: number): number {
  const l = L(c);
  l.heat = clamp((l.heat ?? 0) + amt, 0, 100);
  return l.heat;
}

function flag(c: NhlCareerState, key: string, val = 1): void {
  const l = L(c);
  l.lifeFlags = { ...(l.lifeFlags ?? {}), [key]: val };
}

function own(c: NhlCareerState, item: string): void {
  const l = L(c);
  const list = l.purchased ?? [];
  l.purchased = list.includes(item) ? list : [...list, item];
}

function mood(c: NhlCareerState, d: number): number {
  c.morale = clamp(c.morale + d, 0, 100);
  return c.morale;
}

function fans(c: NhlCareerState, d: number): number {
  c.fanbase = clamp(c.fanbase + d, 0, 100);
  return c.fanbase;
}

function hp(c: NhlCareerState, d: number): number {
  c.health = clamp(c.health + d, 0, 100);
  return c.health;
}

/** Random NHL club that is not the one you play for. Called only at runtime.
 *  Round 173: drawn from the career's own era, read lazily (the function
 *  call happens inside event bodies, never at module scope). */
function otherTeam(c: NhlCareerState, r: () => number): string {
  const pool = nhlEraTeamIds(c.eraId).filter(id => id !== c.team);
  return pool[Math.floor(r() * pool.length)];
}

export function getNhlLifeEventsB(c: NhlCareerState, rng: () => number): NhlCareerEvent[] {
  const deck: NhlCareerEvent[] = [];
  const skater = c.pos !== 'G';
  const yrs = c.seasons.length;
  const net = L(c).netWorth ?? 0;
  const flags = L(c).lifeFlags ?? {};

  /* ================= 1. FAMILY AND HOME ================= */

  if (c.age >= 23 && yrs >= 1) {
    deck.push({
      id: 'nhlB_newbornRoadTrip',
      title: 'Born in the middle of a five game road trip',
      body: 'Your kid picked a Tuesday in Vancouver to show up. There is a red eye at 11:40pm and a morning skate at 10.',
      options: [
        {
          label: 'Red eye home, miss the skate',
          effect: 'Family first',
          apply: (cc) => { mood(cc, 9); fans(cc, 3); return `You made it with an hour to spare. Morale +9, fanbase +3, and one very quiet conversation with the coach.`; },
        },
        {
          label: 'Play the back to back, fly after',
          effect: 'Points for two',
          apply: (cc, r) => { const pts = 1 + Math.floor(r() * 3); fans(cc, 6); mood(cc, -7); return `You put up ${pts} point${pts === 1 ? '' : 's'} and landed at 6am. Fanbase +6, morale -7, and a story you will hear about forever.`; },
        },
        {
          label: 'Charter the whole family to you',
          effect: 'Private jet bill',
          apply: (cc) => { const nw = addNet(cc, -0.35); mood(cc, 7); return `A 350k charter and a hotel suite full of car seats. Net worth -0.35M to ${nw}M, morale +7.`; },
        },
      ],
    });
  }

  if (c.age >= 25 && yrs >= 3) {
    deck.push({
      id: 'nhlB_partnerCityCall',
      title: 'Your partner got the job. It is 2,000 miles away.',
      body: 'It is the exact job they have chased since school. It starts in September and it is nowhere near your rink.',
      options: [
        {
          label: 'Ask for a trade to their city',
          effect: 'Move the whole life',
          apply: (cc, r) => { const nt = otherTeam(cc, r); cc.team = nt; mood(cc, 6); cc.fanbase = 38; flag(cc, 'movedForPartner'); return `Traded to ${nhlTeamLabelOf(nt)}. New barn, fanbase resets to 38, morale +6, one very happy household.`; },
        },
        {
          label: 'Two cities, one calendar',
          effect: 'Frequent flyer life',
          apply: (cc) => { mood(cc, -5); hp(cc, -3); const nw = addNet(cc, -0.2); return `Sixteen flights before Christmas. Morale -5, health -3, 200k in airfare, net worth now ${nw}M.`; },
        },
        {
          label: 'They defer a year',
          effect: 'A debt you owe',
          apply: (cc) => { mood(cc, 3); flag(cc, 'owePartner'); return `They said yes and you both know the tab is open. Morale +3 now, one enormous favor outstanding.`; },
        },
      ],
    });
  }

  if (yrs >= 2) {
    deck.push({
      id: 'nhlB_siblingAgent',
      title: 'Your brother wants to be your agent',
      body: 'He passed the certification exam on the second try and he already has a lanyard. Your current agent has negotiated 400M in contracts.',
      options: [
        {
          label: 'Hand him the whole file',
          effect: 'Blood over billing',
          apply: (cc) => { const before = cc.salary; cc.salary = Math.max(1, m1(cc.salary - 0.4)); mood(cc, 8); return `He negotiated with his whole heart and left 0.4M on the table. Salary ${before}M down to ${cc.salary}M, morale +8, best Christmas of his life.`; },
        },
        {
          label: 'Give him the marketing, keep the agent',
          effect: 'Split the book',
          apply: (cc) => { const nw = addNet(cc, 0.6); mood(cc, 4); flag(cc, 'brotherMarketing'); return `He booked you three regional deals in a month. Net worth +0.6M to ${nw}M, morale +4.`; },
        },
        {
          label: 'Say no over dinner',
          effect: 'Awkward Thanksgiving',
          apply: (cc) => { mood(cc, -6); cc.contractYears += 1; return `He did not order dessert. Morale -6, but your real agent got you an extra year of term: contract now ${cc.contractYears} years.`; },
        },
      ],
    });
  }

  if (c.age >= 27 && yrs >= 4) {
    deck.push({
      id: 'nhlB_parentCloserToHome',
      title: 'Your mom wants you closer to home',
      body: 'She has never once asked you for anything. She asked at the end of a totally normal phone call and then changed the subject.',
      options: [
        {
          label: 'Tell your agent: home or nothing',
          effect: 'Narrow the market',
          apply: (cc) => { mood(cc, 7); cc.salary = Math.max(1, m1(cc.salary - 0.8)); flag(cc, 'homeList'); return `You cut your list to four teams within a four hour drive. Morale +7, projected salary down 0.8M to ${cc.salary}M.`; },
        },
        {
          label: 'Fly her out every month instead',
          effect: 'Buy the miles',
          apply: (cc) => { const nw = addNet(cc, -0.25); mood(cc, 4); fans(cc, 2); return `A monthly flight and a permanent seat eight rows up. Net worth -0.25M to ${nw}M, morale +4.`; },
        },
        {
          label: 'Not yet, one more contract',
          effect: 'Chase the ring first',
          apply: (cc) => { mood(cc, -5); cc.ovr = Math.min(cc.pot, cc.ovr + 1); return `You said next summer and then trained like a lunatic about it. Morale -5, rating +1 to ${cc.ovr}.`; },
        },
      ],
    });
  }

  if (c.fanbase >= 40 && yrs >= 2) {
    deck.push({
      id: 'nhlB_groupChatLeak',
      title: 'The family group chat leaked',
      body: 'Someone screenshotted your uncle calling the head coach a clipboard salesman. It was on every hockey account by noon.',
      options: [
        {
          label: 'Public apology, private laugh',
          effect: 'Damage control',
          apply: (cc) => { fans(cc, -3); mood(cc, 3); const h = addHeat(cc, -4); return `You called the coach yourself before he read it. Fanbase -3, morale +3, no fine, heat down to ${h}.`; },
        },
        {
          label: 'Say absolutely nothing',
          effect: 'Let it die',
          apply: (cc) => { fans(cc, 5); mood(cc, -4); const h = addHeat(cc, 6); return `Three straight days of talk radio. Fanbase +5, morale -4, heat +6 to ${h}.`; },
        },
        {
          label: 'Kick uncle out of the chat',
          effect: 'Family exile',
          apply: (cc) => { fans(cc, 7); mood(cc, -2); return `He built a rival chat within the hour and named it after himself. Fanbase +7, morale -2.`; },
        },
      ],
    });
  }

  if (c.earnings >= 10) {
    deck.push({
      id: 'nhlB_houseYouPromised',
      title: 'The house you promised at fourteen',
      body: 'You told your parents you would buy them a house before you could legally drive. The listing went up Tuesday at 1.9M.',
      options: [
        {
          label: 'Buy it outright, no mortgage',
          effect: 'Cash on the table',
          apply: (cc) => { const nw = addNet(cc, -1.9); own(cc, 'Family home'); mood(cc, 12); fans(cc, 4); return `Wired 1.9M and drove them there with the keys in an envelope. Net worth now ${nw}M, morale +12, fanbase +4.`; },
        },
        {
          label: 'Buy it and put it in a trust',
          effect: 'Lawyers involved',
          apply: (cc) => { const nw = addNet(cc, -2.05); own(cc, 'Family home'); mood(cc, 9); flag(cc, 'familyTrust'); return `1.9M plus 150k of estate lawyers who actually earned it. Net worth now ${nw}M, morale +9, protected forever.`; },
        },
        {
          label: 'Cover the down payment',
          effect: 'Keep the powder dry',
          apply: (cc) => { const nw = addNet(cc, -0.4); mood(cc, 5); return `400k down and they insisted on making the payments. Net worth now ${nw}M, morale +5.`; },
        },
      ],
    });
  }

  if (c.cups >= 1) {
    deck.push({
      id: 'nhlB_dayWithTheCup',
      title: 'Your day with the Cup',
      body: 'Twenty four hours, one white gloved keeper who never blinks, and an entire town that wants a photo. The Cup does not care about your schedule.',
      options: [
        {
          label: 'Home rink, all day, everyone',
          effect: 'The whole town',
          apply: (cc) => { fans(cc, 14); mood(cc, 10); const nw = addNet(cc, -0.06); return `Nine hours, 1,400 photos, 60k of food trucks. Fanbase +14, morale +10, net worth ${nw}M.`; },
        },
        {
          label: 'Something insane for the cameras',
          effect: 'Viral forever',
          apply: (cc, r) => { fans(cc, 20); mood(cc, 6); const h = addHeat(cc, 5); const dent = r() < 0.35; return dent ? `You took it up a chairlift and it came back with a new dent. Fanbase +20, morale +6, heat ${h}, one very cold email from the Hall.` : `You took it up a chairlift and nothing broke. Fanbase +20, morale +6, heat ${h}.`; },
        },
        {
          label: 'Cereal, kitchen table, family only',
          effect: 'Just the people',
          apply: (cc) => { mood(cc, 14); fans(cc, 4); return `Corn flakes out of the bowl at 7am with the four people who drove you to every practice. Morale +14, fanbase +4.`; },
        },
      ],
    });
  }

  /* ================= 2. LEGACY AND RECORDS ================= */

  if (yrs >= 8 && c.ovr >= 78) {
    const cat = c.pos === 'G' ? 'wins' : c.pos === 'D' ? 'assists' : 'goals';
    deck.push({
      id: 'nhlB_franchiseRecordChase',
      title: `Nine ${cat} from the franchise record`,
      body: `You are nine ${cat} from the all time franchise record and the guy who holds it does color on the broadcast. He mentions it every single night.`,
      options: [
        {
          label: 'Chase it, play every night',
          effect: 'Ride the wave',
          apply: (cc) => { hp(cc, -6); fans(cc, 12); mood(cc, 5); flag(cc, 'recordChase'); return `You played 82 and got it in March. Health -6 to ${cc.health}, fanbase +12, morale +5.`; },
        },
        {
          label: 'Say the team comes first',
          effect: 'Hockey answer',
          apply: (cc, r) => { mood(cc, 7); fans(cc, 5); const got = r() < 0.55; if (got) flag(cc, 'recordChase'); return got ? `You refused to discuss it and got it anyway on a Tuesday in Ottawa. Morale +7, fanbase +5.` : `You refused to discuss it and finished two short. Morale +7, fanbase +5, unfinished business.`; },
        },
      ],
    });
  }

  if (c.cups >= 1 && yrs >= 5) {
    deck.push({
      id: 'nhlB_bannerNight',
      title: 'Banner night',
      body: `They raise it before the home opener and they want you on the mic. The last guy who spoke went eleven minutes and lost the building at four.`,
      options: [
        {
          label: 'Twenty seconds, then point up',
          effect: 'Perfect speech',
          apply: (cc) => { fans(cc, 10); mood(cc, 6); return `Twenty two seconds, one gesture at the rafters, 19,000 people losing it. Fanbase +10, morale +6.`; },
        },
        {
          label: `Fly the whole ${c.year - 1} room back in`,
          effect: 'Reunion night',
          apply: (cc) => { fans(cc, 14); mood(cc, 8); const nw = addNet(cc, -0.15); return `You paid to get 23 guys and their families back on that ice. Fanbase +14, morale +8, net worth ${nw}M.`; },
        },
        {
          label: 'Hand the mic to the trainer',
          effect: 'Give the moment away',
          apply: (cc) => { mood(cc, 9); fans(cc, 6); return `Thirty one years of taping ankles and he got the loudest ovation of the night. Morale +9, fanbase +6.`; },
        },
      ],
    });
  }

  if (c.age >= 33 && (c.allStars >= 3 || c.cups >= 1 || c.harts >= 1)) {
    deck.push({
      id: 'nhlB_hallOfFamePush',
      title: 'Someone is running your Hall of Fame campaign',
      body: 'A writer built a spreadsheet, a fan built a website, and both want you to share it. Voters notice things like that. So do teammates.',
      options: [
        {
          label: 'Let them cook, stay silent',
          effect: 'Quiet dignity',
          apply: (cc) => { mood(cc, 5); fans(cc, 4); flag(cc, 'hofPush', 1); return `You never mentioned it once and the case got made anyway. Morale +5, fanbase +4.`; },
        },
        {
          label: 'Do the full media tour',
          effect: 'Campaign hard',
          apply: (cc) => { fans(cc, 12); mood(cc, -4); flag(cc, 'hofPush', 2); return `Eleven podcasts in nine days. Fanbase +12, morale -4, two teammates who think you got weird about it.`; },
        },
        {
          label: 'Tell them to stop',
          effect: 'No thanks',
          apply: (cc) => { mood(cc, 8); fans(cc, -3); return `You asked them to take the site down and they did, sadly. Morale +8, fanbase -3.`; },
        },
      ],
    });
  }

  if (c.age >= 28 && yrs >= 6) {
    deck.push({
      id: 'nhlB_prospectReplacement',
      title: 'They drafted your replacement',
      body: 'Same position, same hand, nineteen years old, already faster than you ever were. His stall is two down from yours.',
      options: [
        {
          label: 'Teach him everything you know',
          effect: 'Build the kid',
          apply: (cc) => { mood(cc, 8); fans(cc, 7); flag(cc, 'mentor'); return `Video every morning, dinner every road city. Morale +8, fanbase +7, and a kid who will say your name in his Hall speech.`; },
        },
        {
          label: 'Bury him in camp',
          effect: 'Hold the job',
          apply: (cc) => { cc.ovr = Math.min(cc.pot, cc.ovr + 1); mood(cc, -5); fans(cc, -4); return `You made his September miserable and won the job outright. Rating +1 to ${cc.ovr}, morale -5, fanbase -4.`; },
        },
        {
          label: 'Charge him for the summer skate',
          effect: 'Bill the rookie',
          apply: (cc) => { const nw = addNet(cc, 0.05); mood(cc, 3); fans(cc, 2); return `Fifty thousand for eight weeks and he paid it happily. Net worth +0.05M to ${nw}M, morale +3.`; },
        },
      ],
    });
  }

  if (yrs >= 12 && c.fanbase >= 65) {
    deck.push({
      id: 'nhlB_statueDebate',
      title: 'The statue argument',
      body: 'A city councillor wants a bronze of you outside the arena. A radio host says you have to be retired first. The sculptor already sent a maquette and the nose is completely wrong.',
      options: [
        {
          label: 'Approve it, fix the nose',
          effect: 'Bronze forever',
          apply: (cc) => { fans(cc, 12); mood(cc, 6); const nw = addNet(cc, -0.1); return `Nine feet of you in a follow through, correct nose. Fanbase +12, morale +6, you chipped in 100k, net worth ${nw}M.`; },
        },
        {
          label: 'Ask them to wait until you retire',
          effect: 'Not yet',
          apply: (cc) => { mood(cc, 7); fans(cc, 3); flag(cc, 'statuePending'); return `You told them a statue of a guy who still plays is a jinx. Morale +7, fanbase +3, bronze deferred.`; },
        },
        {
          label: 'Ask for the equipment manager instead',
          effect: 'Legendary move',
          apply: (cc) => { fans(cc, 18); mood(cc, 10); const nw = addNet(cc, -0.25); return `They cast Barry holding a skate sharpener and the city adored it. Fanbase +18, morale +10, you covered 250k, net worth ${nw}M.`; },
        },
      ],
    });
  }

  if (c.age >= 35 && yrs >= 12) {
    deck.push({
      id: 'nhlB_farewellTour',
      title: 'They want to give you a farewell tour',
      body: 'Thirty one buildings, thirty one tribute videos, thirty one gifts you have to ship home. You also have not actually decided if this is your last year.',
      options: [
        {
          label: 'Announce it, take the tour',
          effect: 'Long goodbye',
          apply: (cc) => { fans(cc, 16); mood(cc, 8); const nw = addNet(cc, 0.4); hp(cc, -4); return `Standing ovations in buildings that booed you for fifteen years. Fanbase +16, morale +8, 400k in tour sponsorship, net worth ${nw}M, health -4.`; },
        },
        {
          label: 'Say nothing, decide in June',
          effect: 'Keep the door open',
          apply: (cc) => { mood(cc, 5); fans(cc, -2); return `No announcement, no paddleboards, no pressure. Morale +5, fanbase -2.`; },
        },
        {
          label: 'Ask every stop to donate instead',
          effect: 'No more canoes',
          apply: (cc) => { fans(cc, 12); mood(cc, 11); return `Thirty one clubs wrote 25k checks to minor hockey instead of buying you a canoe. Fanbase +12, morale +11, 775k raised.`; },
        },
      ],
    });
  }

  /* ================= 3. RIVALRIES ================= */

  if (skater && yrs >= 2) {
    deck.push({
      id: 'nhlB_defensemanRunsYou',
      title: 'Number 44 runs you every single shift',
      body: 'Four meetings a year, eight cross checks a game, zero calls. He wrote your number on his stick tape in Sharpie and did not hide it.',
      options: [
        {
          label: 'Drop them and settle it',
          effect: 'Answer the bell',
          apply: (cc, r) => { const hurt = r() < 0.3; hp(cc, hurt ? -12 : -5); mood(cc, 9); fans(cc, 12); return hurt ? `You won the fight and lost a knuckle for six weeks. Health -12 to ${cc.health}, morale +9, fanbase +12.` : `Two punches, both yours, whole bench on the boards. Health -5, morale +9, fanbase +12.`; },
        },
        {
          label: 'Beat him on the scoresheet',
          effect: 'Points as revenge',
          apply: (cc) => { cc.ovr = Math.min(cc.pot, cc.ovr + 1); mood(cc, 5); fans(cc, 6); return `Seven points in four head to heads and a very quiet 44. Rating +1 to ${cc.ovr}, morale +5, fanbase +6.`; },
        },
        {
          label: 'Get a teammate to handle it',
          effect: 'Outsource it',
          apply: (cc) => { mood(cc, 3); fans(cc, -2); flag(cc, 'oweEnforcer'); return `Your fourth line winger took the five and the suspension. Morale +3, fanbase -2, and you owe that man for life.`; },
        },
      ],
    });
  }

  if (yrs >= 3) {
    deck.push({
      id: 'nhlB_playoffGotPersonal',
      title: 'Round two got personal',
      body: 'Their center said your name on a hot mic and their fans found your family on social. It is 2-2 with four more days of media.',
      options: [
        {
          label: 'Answer in the media',
          effect: 'Bulletin board',
          apply: (cc) => { fans(cc, 11); mood(cc, -3); const h = addHeat(cc, 8); return `Ninety seconds of pure venom at a podium. Fanbase +11, morale -3, heat +8 to ${h}.`; },
        },
        {
          label: 'Answer on the ice',
          effect: 'Say nothing, score',
          apply: (cc) => { mood(cc, 7); cc.ovr = Math.min(cc.pot, cc.ovr + 1); fans(cc, 8); return `You did not say one word and had the best two games of your life. Morale +7, rating +1 to ${cc.ovr}, fanbase +8.`; },
        },
        {
          label: 'Lock the family off social',
          effect: 'Protect the house',
          apply: (cc) => { mood(cc, 9); fans(cc, 1); return `Everyone went private, one security guy in the family room. Morale +9, fanbase +1, zero regrets.`; },
        },
      ],
    });
  }

  if (yrs >= 5) {
    deck.push({
      id: 'nhlB_oldRoommateOtherBench',
      title: 'Your old road roommate is on the other bench',
      body: 'You lived together for three seasons and now he is the guy assigned to make your night miserable. He is unbelievably good at it.',
      options: [
        {
          label: 'Dinner the night before anyway',
          effect: 'Friends first',
          apply: (cc) => { mood(cc, 7); fans(cc, -2); return `Steak, two hours, zero hockey talk. Morale +7, fanbase -2 from the people who wanted blood.`; },
        },
        {
          label: 'Cold shoulder until June',
          effect: 'Business only',
          apply: (cc) => { mood(cc, -3); cc.ovr = Math.min(cc.pot, cc.ovr + 1); fans(cc, 5); return `You did not look at him once in four games. Morale -3, rating +1 to ${cc.ovr}, fanbase +5.`; },
        },
        {
          label: 'Roast him on the podcast',
          effect: 'Public bit',
          apply: (cc) => { fans(cc, 10); mood(cc, -2); const h = addHeat(cc, 5); return `You told the billet family story on air. Fanbase +10, morale -2, heat +5 to ${h}, and he is plotting.`; },
        },
      ],
    });
  }

  if (yrs >= 2 && c.morale <= 78) {
    deck.push({
      id: 'nhlB_coachWhoScratchedYou',
      title: 'The coach who scratched you just got hired here',
      body: 'Three years ago he sat you eleven straight and called you a project in a scrum. He walked into your summer skate with a coffee for you.',
      options: [
        {
          label: 'Take the coffee, move on',
          effect: 'Adult about it',
          apply: (cc) => { mood(cc, 6); cc.ovr = Math.min(cc.pot, cc.ovr + 1); return `Forty minutes in the stands and he actually apologized. Morale +6, rating +1 to ${cc.ovr}.`; },
        },
        {
          label: 'Make him earn it',
          effect: 'Long memory',
          apply: (cc) => { mood(cc, -4); fans(cc, 4); flag(cc, 'coachFeud'); return `You let the coffee go cold on the bench. Morale -4, fanbase +4, and a season of very cold eye contact.`; },
        },
        {
          label: 'Ask for a trade before camp',
          effect: 'Not doing this again',
          apply: (cc, r) => { const nt = otherTeam(cc, r); cc.team = nt; cc.fanbase = 38; mood(cc, 5); return `Traded to ${nhlTeamLabelOf(nt)} in August. Morale +5, fanbase resets to 38, and he lost you for nothing.`; },
        },
      ],
    });
  }

  const oldStint = [...c.seasons].reverse().find(s => s.team !== c.team);
  if (yrs >= 4 && oldStint) {
    deck.push({
      id: 'nhlB_revengeOldBarn',
      title: 'First game back in your old barn',
      body: `${nhlTeamLabelOf(oldStint.team)} traded you in February and the fans booed the trade, not you. Somebody printed 4,000 shirts with your old number for tonight.`,
      options: [
        {
          label: 'Wave to the crowd in warmups',
          effect: 'Classy return',
          apply: (cc) => { fans(cc, 9); mood(cc, 6); return `You stopped at the blue line and put your hand up. Ninety second ovation. Fanbase +9, morale +6.`; },
        },
        {
          label: 'Score and stare at their box',
          effect: 'Cold blooded',
          apply: (cc) => { fans(cc, 14); mood(cc, 8); const h = addHeat(cc, 6); return `Two goals and one very long look at the GM suite. Fanbase +14, morale +8, heat +6 to ${h}.`; },
        },
        {
          label: 'Buy 100 tickets for their equipment staff',
          effect: 'Take care of people',
          apply: (cc) => { const nw = addNet(cc, -0.02); mood(cc, 10); fans(cc, 7); return `Twenty grand of lower bowl for the people who never get thanked. Net worth ${nw}M, morale +10, fanbase +7.`; },
        },
      ],
    });
  }

  if (c.pos === 'G' && yrs >= 2) {
    deck.push({
      id: 'nhlB_goalieStaredown',
      title: 'The other goalie will not stop staring at you',
      body: 'He skated to center after the handshake line and just looked at you. Now he does it every meeting. The internet has already named it.',
      options: [
        {
          label: 'Stare back, every single time',
          effect: 'Own the bit',
          apply: (cc) => { fans(cc, 12); mood(cc, 5); return `Four staredowns, four viral clips, one very confused linesman. Fanbase +12, morale +5.`; },
        },
        {
          label: 'Skate down and drop the blocker',
          effect: 'Goalie fight',
          apply: (cc, r) => { fans(cc, 22); hp(cc, -10); mood(cc, 9); const games = 1 + Math.floor(r() * 2); const fine = m1(cc.salary / 82 * games); cc.earnings = m1(cc.earnings - fine); return `A full goalie fight at center ice. Fanbase +22, health -10, morale +9, ${games} game suspension and ${fine}M in lost salary.`; },
        },
        {
          label: 'Mail him a framed photo of the stare',
          effect: 'Kill it with kindness',
          apply: (cc) => { fans(cc, 8); mood(cc, 7); const nw = addNet(cc, -0.01); return `He hung it in his stall and now you two text. Fanbase +8, morale +7, net worth ${nw}M.`; },
        },
      ],
    });
  }

  /* ================= 4. BUSINESS AND INVESTING ================= */

  if (c.earnings >= 6) {
    deck.push({
      id: 'nhlB_steakhouseDeal',
      title: 'A steakhouse with your name over the door',
      body: 'A restaurant group wants your name, your face and 1.2M. The chef is genuinely good. The projections are genuinely fiction.',
      options: [
        {
          label: 'Put in 1.2M for 30 percent',
          effect: 'Real equity',
          apply: (cc) => { const nw = addNet(cc, -1.2); own(cc, 'Steakhouse stake'); fans(cc, 5); flag(cc, 'restaurant'); return `Doors open in November. Net worth -1.2M to ${nw}M, 30 percent of a room with your jersey on the wall, fanbase +5.`; },
        },
        {
          label: 'License the name only',
          effect: 'Cash, zero risk',
          apply: (cc) => { const nw = addNet(cc, 0.25); fans(cc, 4); return `250k a year to hang your name over a door you never have to visit. Net worth +0.25M to ${nw}M, fanbase +4.`; },
        },
        {
          label: 'Pass, buy into the beef supplier',
          effect: 'Boring money',
          apply: (cc) => { const nw = addNet(cc, -0.5); flag(cc, 'beefCo'); return `Nobody takes a selfie with a distribution warehouse that returns 9 percent. Net worth -0.5M to ${nw}M, invested.`; },
        },
      ],
    });
  }

  if (yrs >= 3) {
    deck.push({
      id: 'nhlB_hockeySchool',
      title: 'Your name on a summer hockey school',
      body: 'Two weeks in July, 300 kids, 1,800 dollars a head. You have to actually be on the ice or the parents revolt in the lobby.',
      options: [
        {
          label: 'Run it yourself, all fourteen days',
          effect: 'Earn every dollar',
          apply: (cc) => { const nw = addNet(cc, 0.45); fans(cc, 9); hp(cc, -3); mood(cc, -2); return `Fourteen days, six hours a day, 540k gross. Net worth +0.45M to ${nw}M, fanbase +9, health -3, morale -2.`; },
        },
        {
          label: 'Show up day one and day fourteen',
          effect: 'Name only',
          apply: (cc) => { const nw = addNet(cc, 0.3); fans(cc, -2); return `Two appearances, one photo line, 300k. Net worth +0.3M to ${nw}M, fanbase -2 from parents who noticed.`; },
        },
        {
          label: 'Free week for kids who cannot pay',
          effect: 'Scholarship week',
          apply: (cc) => { const nw = addNet(cc, 0.15); fans(cc, 16); mood(cc, 10); return `Ninety kids skated for nothing and got gear on the way out. Net worth +0.15M to ${nw}M, fanbase +16, morale +10.`; },
        },
      ],
    });
  }

  if (c.fanbase >= 45 && c.age >= 24) {
    deck.push({
      id: 'nhlB_beerLabel',
      title: 'A lager with your face on the can',
      body: 'A local brewery wants a signature lager. The can art is you mid celebration, badly drawn. The beer itself is legitimately excellent.',
      options: [
        {
          label: 'Sign the licensing deal',
          effect: 'Royalty checks',
          apply: (cc) => { const nw = addNet(cc, 0.2); fans(cc, 8); return `A dollar a case and it moved 200,000 cases. Net worth +0.2M to ${nw}M, fanbase +8.`; },
        },
        {
          label: 'Buy into the brewery',
          effect: 'Own the tanks',
          apply: (cc) => { const nw = addNet(cc, -0.8); own(cc, 'Brewery stake'); fans(cc, 6); flag(cc, 'brewery'); const d = addDirty(cc, 0.05); return `800k for 25 percent and they keep paying your appearance fees out of the till. Net worth ${nw}M, fanbase +6, 0.05M of very untidy cash on the side (dirty money ${d}M).`; },
        },
        {
          label: 'No alcohol deals, do a soda',
          effect: 'Kid friendly',
          apply: (cc) => { const nw = addNet(cc, 0.1); fans(cc, 5); mood(cc, 4); return `A cream soda with a cartoon you on it, sold in every rink canteen in the province. Net worth +0.1M to ${nw}M, fanbase +5, morale +4.`; },
        },
      ],
    });
  }

  if (c.earnings >= 15 && c.age >= 27) {
    deck.push({
      id: 'nhlB_juniorTeamStake',
      title: 'Your junior club is for sale',
      body: 'The team you played for at seventeen is on the market for 6M. The barn seats 3,200 and the roof is very honest about its age.',
      options: [
        {
          label: 'Buy the whole thing',
          effect: 'Own your junior team',
          apply: (cc) => { const nw = addNet(cc, -6); own(cc, 'Junior franchise'); fans(cc, 12); mood(cc, 12); flag(cc, 'ownsJunior'); return `You own the rink where you got cut at fifteen. Net worth -6M to ${nw}M, fanbase +12, morale +12.`; },
        },
        {
          label: 'Take 20 percent and a board seat',
          effect: 'Small stake',
          apply: (cc) => { const nw = addNet(cc, -1.2); own(cc, 'Junior club stake'); fans(cc, 6); mood(cc, 6); return `1.2M for a fifth of it and a vote that actually matters. Net worth ${nw}M, fanbase +6, morale +6.`; },
        },
        {
          label: 'Fix the roof, take no equity',
          effect: 'Just the roof',
          apply: (cc) => { const nw = addNet(cc, -0.6); fans(cc, 9); mood(cc, 9); return `600k, new roof, no plaque requested. They put one up anyway. Net worth ${nw}M, fanbase +9, morale +9.`; },
        },
      ],
    });
  }

  if (c.age >= 25) {
    deck.push({
      id: 'nhlB_techPitch',
      title: 'A guy in a vest has an app',
      body: 'It grades your skating stride off a phone camera. He wants 500k and he keeps saying the Strava of hockey like it is a full sentence.',
      options: [
        {
          label: 'Write the check',
          effect: 'Venture money',
          apply: (cc, r) => { const roll = r(); if (roll < 0.2) { const nw = addNet(cc, 4.5); return `Acquired in eighteen months. Your 500k came back as 5M. Net worth +4.5M to ${nw}M.`; } if (roll < 0.5) { const nw = addNet(cc, -0.1); return `Still alive, still burning cash, small secondary sale. Net worth -0.1M to ${nw}M.`; } const nw = addNet(cc, -0.5); return `The vest is now at a different startup. Net worth -0.5M to ${nw}M, and one lesson.`; },
        },
        {
          label: 'Equity for promotion, no cash',
          effect: 'Sweat equity',
          apply: (cc) => { fans(cc, 3); flag(cc, 'techEquity'); return `Two percent for four posts a year and zero dollars at risk. Fanbase +3, options in the drawer.`; },
        },
        {
          label: 'Pass, put the 500k in index funds',
          effect: 'Boring and rich',
          apply: (cc) => { const nw = addNet(cc, 0.06); mood(cc, 3); return `500k into the boring fund. Net worth +0.06M to ${nw}M this year and you sleep completely fine.`; },
        },
      ],
    });
  }

  if (c.ovr >= 80 && yrs >= 4) {
    const gearWord = c.pos === 'G' ? 'pad' : 'stick';
    deck.push({
      id: 'nhlB_equipmentBrand',
      title: `Start your own ${gearWord} brand`,
      body: `Your current gear deal pays 250k a year. A factory will build your exact ${gearWord} and put your logo on it, if you fund the first run.`,
      options: [
        {
          label: 'Fund the run, launch it',
          effect: 'Own the mold',
          apply: (cc) => { const nw = addNet(cc, -0.9); own(cc, 'Equipment brand'); fans(cc, 7); flag(cc, 'gearBrand'); return `900k for the first production run and your logo on 4,000 units. Net worth ${nw}M, fanbase +7.`; },
        },
        {
          label: 'Re-sign with the big brand',
          effect: 'Safe money',
          apply: (cc) => { const nw = addNet(cc, 0.25); mood(cc, 2); return `250k a year and they ship you anything you want, forever. Net worth +0.25M to ${nw}M, morale +2.`; },
        },
        {
          label: 'Sign with the challenger for double',
          effect: 'Riskier check',
          apply: (cc) => { const nw = addNet(cc, 0.5); cc.ovr = Math.max(60, cc.ovr - 1); mood(cc, -2); return `500k a year and two months of gear that does not feel right. Net worth +0.5M to ${nw}M, rating -1 to ${cc.ovr}, morale -2.`; },
        },
      ],
    });
  }

  if (yrs >= 5) {
    deck.push({
      id: 'nhlB_twinPadRink',
      title: 'Two sheets and a pro shop',
      body: 'A developer wants a partner on a twin pad in your hometown. Ice time rents itself at 5am. The pro shop is where the money actually is.',
      options: [
        {
          label: 'In for 3M',
          effect: 'Own the ice',
          apply: (cc) => { const nw = addNet(cc, -3); own(cc, 'Twin pad arena'); fans(cc, 10); mood(cc, 8); return `Your name on a building with two sheets and a skate sharpener. Net worth -3M to ${nw}M, fanbase +10, morale +8.`; },
        },
        {
          label: 'In for 750k, silent partner',
          effect: 'Small check',
          apply: (cc) => { const nw = addNet(cc, -0.75); fans(cc, 4); return `750k, no meetings, no plaque. Net worth ${nw}M, fanbase +4.`; },
        },
        {
          label: 'Pass, but book all your camps there',
          effect: 'No risk, all access',
          apply: (cc) => { const nw = addNet(cc, 0.1); fans(cc, 3); mood(cc, 3); return `Free ice for life in exchange for filling their July. Net worth +0.1M to ${nw}M, fanbase +3, morale +3.`; },
        },
      ],
    });
  }

  /* ================= 5. OFFSEASON LIFE ================= */

  if (yrs >= 1) {
    deck.push({
      id: 'nhlB_golfTournament',
      title: 'Your name on a golf tournament',
      body: 'Shotgun start, 144 players, a silent auction and a scramble so nobody has to be good. You have to shake 288 hands in six hours.',
      options: [
        {
          label: 'Host it, play a hole with every group',
          effect: 'Full send',
          apply: (cc) => { fans(cc, 9); mood(cc, 5); hp(cc, -2); const nw = addNet(cc, -0.05); return `Six hours in a cart, 288 handshakes, 50k of your own money into the prize table. Fanbase +9, morale +5, health -2, net worth ${nw}M.`; },
        },
        {
          label: 'Host it, charity keeps everything',
          effect: 'All to charity',
          apply: (cc) => { fans(cc, 13); mood(cc, 11); const nw = addNet(cc, -0.15); return `420k raised, zero dollars to you, 150k of costs on your card. Fanbase +13, morale +11, net worth ${nw}M.`; },
        },
        {
          label: 'Skip it, send a signed jersey',
          effect: 'Summer off',
          apply: (cc) => { hp(cc, 4); fans(cc, -4); return `You trained instead and mailed a frame. Health +4, fanbase -4, one mildly annoyed organizing committee.`; },
        },
      ],
    });
  }

  if (yrs >= 2) {
    deck.push({
      id: 'nhlB_fishingVideo',
      title: 'The fishing video got out',
      body: 'You landed a 41 pound catfish in a tank top and screamed a word your mother has never heard you say. Nine million views by Thursday.',
      options: [
        {
          label: 'Lean in, start a fishing show',
          effect: 'New career path',
          apply: (cc) => { fans(cc, 15); const nw = addNet(cc, 0.3); mood(cc, 6); return `Eight episodes, one tackle sponsor, 300k. Fanbase +15, net worth +0.3M to ${nw}M, morale +6.`; },
        },
        {
          label: 'Delete it and apologize',
          effect: 'Clean image',
          apply: (cc) => { fans(cc, -5); mood(cc, 2); const h = addHeat(cc, -5); return `Deleted in nine minutes, screenshotted in four. Fanbase -5, morale +2, heat down to ${h}.`; },
        },
        {
          label: 'Say nothing and post another one',
          effect: 'No notes',
          apply: (cc) => { fans(cc, 11); mood(cc, 8); return `The second one had a bigger fish and worse language. Fanbase +11, morale +8.`; },
        },
      ],
    });
  }

  if (c.ovr >= 85 || c.allStars >= 2) {
    deck.push({
      id: 'nhlB_videoGameCover',
      title: 'Cover athlete shoot',
      body: 'Eleven hours in a motion capture suit with 78 dots glued to your face. They want you to skate in place and look iconic.',
      options: [
        {
          label: 'Take the cover and the check',
          effect: 'Cover curse',
          apply: (cc, r) => { const nw = addNet(cc, 1.4); fans(cc, 18); const cursed = r() < 0.3; if (cursed) hp(cc, -8); return cursed ? `1.4M and every single person you meet now says the word curse. Net worth ${nw}M, fanbase +18, health -8 to ${cc.health}.` : `1.4M and your face on eleven million shelves. Net worth ${nw}M, fanbase +18.`; },
        },
        {
          label: 'Negotiate a lifetime royalty',
          effect: 'Long money',
          apply: (cc) => { const nw = addNet(cc, 0.6); fans(cc, 12); flag(cc, 'gameRoyalty'); return `600k up front and a cut of every copy for as long as the franchise exists. Net worth ${nw}M, fanbase +12.`; },
        },
        {
          label: 'Pass, protect the summer',
          effect: 'Rest instead',
          apply: (cc) => { hp(cc, 6); cc.ovr = Math.min(cc.pot, cc.ovr + 1); return `Eleven hours back in your life. Health +6 to ${cc.health}, rating +1 to ${cc.ovr}.`; },
        },
      ],
    });
  }

  if (yrs >= 2) {
    deck.push({
      id: 'nhlB_charityBallGame',
      title: 'The charity softball game',
      body: 'Hockey players playing baseball is a public safety event. 12,000 tickets sold. Your GM texted please be careful with no punctuation.',
      options: [
        {
          label: 'Play, swing at everything',
          effect: 'Send it',
          apply: (cc, r) => { fans(cc, 10); mood(cc, 7); const hurt = r() < 0.25; if (hurt) hp(cc, -12); return hurt ? `You hit a triple and pulled something rounding second. Fanbase +10, morale +7, health -12 to ${cc.health}, one furious phone call.` : `Two home runs and zero injuries. Fanbase +10, morale +7.`; },
        },
        {
          label: 'Coach first base, do not play',
          effect: 'Smart money',
          apply: (cc) => { fans(cc, 4); mood(cc, 3); return `Full uniform, zero at bats, one very relieved general manager. Fanbase +4, morale +3, health untouched.`; },
        },
        {
          label: 'Pitch nothing but 40 mph meatballs',
          effect: 'Crowd pleaser',
          apply: (cc, r) => { fans(cc, 12); mood(cc, 6); const sore = r() < 0.3; if (sore) hp(cc, -4); return sore ? `Fourteen home runs allowed and a shoulder that hated August. Fanbase +12, morale +6, health -4.` : `Fourteen home runs allowed on purpose and the building loved every one. Fanbase +12, morale +6.`; },
        },
      ],
    });
  }

  if (c.age >= 23) {
    deck.push({
      id: 'nhlB_learnToCook',
      title: `You are ${c.age} and you cannot cook`,
      body: 'Your entire adult menu is chicken, rice, and a shake with one ice cube in it. A real chef will do eight private lessons for 20k.',
      options: [
        {
          label: 'Take the eight lessons',
          effect: 'Learn the knife',
          apply: (cc) => { const nw = addNet(cc, -0.02); hp(cc, 6); mood(cc, 5); return `You can braise now and you will not shut up about it. Net worth ${nw}M, health +6 to ${cc.health}, morale +5.`; },
        },
        {
          label: 'Just hire the chef full time',
          effect: 'Someone else cooks',
          apply: (cc) => { const nw = addNet(cc, -0.18); hp(cc, 9); mood(cc, 3); return `180k a year and you have never eaten better in your life. Net worth ${nw}M, health +9 to ${cc.health}, morale +3.`; },
        },
        {
          label: 'Keep eating chicken and rice',
          effect: 'Zero change',
          apply: (cc) => { const nw = addNet(cc, 0.05); mood(cc, 2); hp(cc, -3); return `Same meal, 1,100 days running. Net worth +0.05M to ${nw}M, morale +2, health -3.`; },
        },
      ],
    });
  }

  if (c.earnings >= 8) {
    deck.push({
      id: 'nhlB_foundationLaunch',
      title: 'Launch the foundation',
      body: 'Learn to skate for kids who cannot afford gear. Setup is 150k, a real director is 90k a year, and the thing will outlive your career.',
      options: [
        {
          label: 'Fund it properly, hire the director',
          effect: 'Build it right',
          apply: (cc) => { const nw = addNet(cc, -0.35); fans(cc, 14); mood(cc, 12); flag(cc, 'foundation', 2); return `240k in year one, 600 kids on the ice by March. Net worth ${nw}M, fanbase +14, morale +12.`; },
        },
        {
          label: 'Run it out of a shoebox yourself',
          effect: 'Hands on',
          apply: (cc) => { const nw = addNet(cc, -0.05); fans(cc, 7); mood(cc, 6); hp(cc, -2); flag(cc, 'foundation', 1); return `You are the director, the driver and the guy who buys the helmets. Net worth ${nw}M, fanbase +7, morale +6, health -2.`; },
        },
        {
          label: 'Just donate to one that exists',
          effect: 'No overhead',
          apply: (cc) => { const nw = addNet(cc, -0.25); fans(cc, 5); mood(cc, 7); return `250k straight to a group that already knows what it is doing. Net worth ${nw}M, fanbase +5, morale +7.`; },
        },
      ],
    });
  }

  /* ================= 6. GENUINELY WEIRD HOCKEY LIFE ================= */

  if (c.fanbase >= 55) {
    deck.push({
      id: 'nhlB_fanChangedHisName',
      title: 'A man legally changed his name to yours',
      body: `Middle name and all. He sent the court documents, a photo of his new licence, and a request to be included in your Christmas card.`,
      options: [
        {
          label: 'Send him a jersey and a card',
          effect: 'Be normal about it',
          apply: (cc) => { fans(cc, 8); mood(cc, 5); return `One 400 dollar jersey and a card with his new legal name on it. Fanbase +8, morale +5.`; },
        },
        {
          label: 'Meet him for a coffee',
          effect: 'Wildly awkward',
          apply: (cc, r) => { fans(cc, 12); mood(cc, 2); const crowd = r() < 0.4; return crowd ? `He brought fourteen relatives and a laminated family tree with you on it. Fanbase +12, morale +2, ninety of the strangest minutes of your life.` : `Forty five minutes, genuinely lovely guy, deeply strange situation. Fanbase +12, morale +2.`; },
        },
        {
          label: 'Have the lawyers send a letter',
          effect: 'Cease and desist',
          apply: (cc) => { fans(cc, -9); mood(cc, -2); const h = addHeat(cc, 6); return `Suing a fan for having your name is a bad look and it looked exactly that bad. Fanbase -9, morale -2, heat +6 to ${h}.`; },
        },
      ],
    });
  }

  if (yrs >= 2) {
    deck.push({
      id: 'nhlB_ownerPsychic',
      title: 'The owner hired a psychic',
      body: 'She sits behind the glass in warmups reading the energy of the room. She told the coach to bench a 30 goal scorer because his aura had gone beige.',
      options: [
        {
          label: 'Get your aura read',
          effect: 'Play along',
          apply: (cc, r) => { mood(cc, 6); fans(cc, 8); const spooky = r() < 0.45; return spooky ? `She named your billet mom, your junior number, and the exact injury you hid in March. Morale +6, fanbase +8, you have not slept since.` : `She said your aura was gold and mostly hungry. Morale +6, fanbase +8.`; },
        },
        {
          label: 'Say it is embarrassing, out loud',
          effect: 'Go public',
          apply: (cc) => { fans(cc, 10); mood(cc, -5); const h = addHeat(cc, 9); return `You said it into a live mic and the owner heard it in his car. Fanbase +10, morale -5, heat +9 to ${h}.`; },
        },
        {
          label: 'Quietly pay her to say you are great',
          effect: 'Bribe the psychic',
          apply: (cc) => { const nw = addNet(cc, -0.02); mood(cc, 7); flag(cc, 'psychicOnPayroll'); return `Twenty grand and suddenly your aura is the strongest in the conference and your ice time went up. Net worth ${nw}M, morale +7.`; },
        },
      ],
    });
  }

  if (yrs >= 1) {
    deck.push({
      id: 'nhlB_dressingRoomGhost',
      title: 'The room is haunted, apparently',
      body: 'Every rookie hears about the ghost in the old visitors room. Last night three grown men swore they heard skates on concrete at 1am. The building is 94 years old.',
      options: [
        {
          label: 'Sleep in there overnight and film it',
          effect: 'Ghost content',
          apply: (cc) => { fans(cc, 14); mood(cc, 4); hp(cc, -3); return `Six hours of night vision footage and one genuinely unexplained bang at 3:40am. Fanbase +14, morale +4, health -3 from zero sleep.`; },
        },
        {
          label: 'Start the legend yourself',
          effect: 'Feed the myth',
          apply: (cc) => { fans(cc, 9); mood(cc, 7); flag(cc, 'ghostStory'); return `You invented three details and now they are printed in the arena tour script. Fanbase +9, morale +7.`; },
        },
        {
          label: 'Get the building blessed',
          effect: 'Full ceremony',
          apply: (cc) => { const nw = addNet(cc, -0.01); mood(cc, 9); fans(cc, 6); return `A priest, a smudge stick and eleven very serious hockey players in a circle. Net worth ${nw}M, morale +9, fanbase +6.`; },
        },
      ],
    });
  }

  if (yrs >= 1) {
    deck.push({
      id: 'nhlB_mascotFeud',
      title: 'The mascot has it out for you',
      body: 'He copied your celebration, then your stride, then your postgame interview voice. There is a man in a nine foot bird suit doing bits about you nightly.',
      options: [
        {
          label: 'Prank war, escalate hard',
          effect: 'All out war',
          apply: (cc) => { fans(cc, 16); mood(cc, 8); const nw = addNet(cc, -0.03); return `You filled his head with 4,000 packing peanuts and he retaliated with a marching band. Fanbase +16, morale +8, net worth ${nw}M.`; },
        },
        {
          label: 'Buy him dinner and end it',
          effect: 'Peace treaty',
          apply: (cc) => { mood(cc, 6); fans(cc, 4); return `He is a 24 year old theater grad named Kyle and he is delightful. Morale +6, fanbase +4.`; },
        },
        {
          label: 'Complain to the team',
          effect: 'Kill the joy',
          apply: (cc) => { fans(cc, -8); mood(cc, 3); return `They made him stop and the entire building found out why. Fanbase -8, morale +3.`; },
        },
      ],
    });
  }

  if (yrs >= 2) {
    deck.push({
      id: 'nhlB_thingOnTheIce',
      title: 'Somebody threw a whole octopus',
      body: 'It cleared the glass, landed six feet from you, and the ice crew guy twirled it over his head. The building has not been that loud all year.',
      options: [
        {
          label: 'Pick it up yourself and twirl it',
          effect: 'Instant folk hero',
          apply: (cc) => { fans(cc, 17); mood(cc, 8); hp(cc, -1); return `You smelled like brine for two days and the city named a sandwich after you. Fanbase +17, morale +8, health -1.`; },
        },
        {
          label: 'Skate away and let the crew work',
          effect: 'Be a pro',
          apply: (cc) => { mood(cc, 4); fans(cc, 1); return `You did your job and let the man in the coveralls do his. Morale +4, fanbase +1.`; },
        },
        {
          label: 'Find the guy, buy him season tickets',
          effect: 'Fund the chaos',
          apply: (cc) => { const nw = addNet(cc, -0.03); fans(cc, 12); mood(cc, 6); return `Thirty grand of seats for a man who smuggled seafood past four security guards. Net worth ${nw}M, fanbase +12, morale +6.`; },
        },
      ],
    });
  }

  if (yrs >= 2) {
    deck.push({
      id: 'nhlB_zamboniDriver',
      title: 'The zamboni driver is your best friend now',
      body: `Gary has flooded this ice for 31 years, could not care less that you make ${Math.round(c.salary)}M, and is the only person who tells you the truth about your game.`,
      options: [
        {
          label: 'Fly Gary to every road game',
          effect: 'Bring Gary',
          apply: (cc) => { const nw = addNet(cc, -0.12); mood(cc, 12); fans(cc, 6); return `120k of flights and hotels for a 63 year old man in a team jacket. Net worth ${nw}M, morale +12, fanbase +6.`; },
        },
        {
          label: 'Get him on the payroll as a scout',
          effect: 'Give him a real job',
          apply: (cc) => { mood(cc, 8); fans(cc, 4); flag(cc, 'garyScout'); return `He watches 200 junior games a year now and he is right about all of them. Morale +8, fanbase +4.`; },
        },
        {
          label: 'Keep it exactly as it is',
          effect: 'Do not ruin it',
          apply: (cc) => { mood(cc, 9); return `Twelve minutes after every practice, no phones, no cameras, no changes. Morale +9.`; },
        },
      ],
    });
  }

  if (yrs >= 3) {
    const bigNight = c.pos === 'G' ? 'a 44 save shutout' : 'a six point night';
    deck.push({
      id: 'nhlB_sandwichSuperstition',
      title: 'The gas station sandwich streak',
      body: `You ate a four dollar egg salad sandwich from the same gas station before ${bigNight} and now you cannot stop. It is October. This is a nine month problem.`,
      options: [
        {
          label: 'Ride the streak all season',
          effect: 'Do not break it',
          apply: (cc) => { mood(cc, 8); hp(cc, -6); fans(cc, 6); return `Eighty two gas station sandwiches. Morale +8, health -6 to ${cc.health}, fanbase +6, one very concerned team nutritionist.`; },
        },
        {
          label: 'Have a chef recreate it exactly',
          effect: 'Lab grown superstition',
          apply: (cc, r) => { const nw = addNet(cc, -0.03); const works = r() < 0.5; if (works) { mood(cc, 4); hp(cc, 2); return `Identical bread, identical sadness, better eggs. Net worth ${nw}M, morale +4, health +2.`; } mood(cc, -4); hp(cc, 2); return `It is not the same and you both know it. Net worth ${nw}M, morale -4, health +2.`; },
        },
        {
          label: 'Break it on purpose in November',
          effect: 'Free yourself',
          apply: (cc) => { mood(cc, -5); hp(cc, 6); cc.ovr = Math.min(cc.pot, cc.ovr + 1); return `You skipped it, went out and had two points anyway. Morale -5, health +6, rating +1 to ${cc.ovr}.`; },
        },
      ],
    });
  }

  /* ================= 7. CONTRACT AND CAREER FORKS ================= */

  if (c.contractYears <= 1 && c.age <= 27 && yrs >= 2) {
    const bridge = Math.max(1.2, m1((c.ovr - 66) * 0.42));
    const long = Math.max(2, m1((c.ovr - 66) * 0.58));
    const mid = m1((bridge + long) / 2);
    deck.push({
      id: 'nhlB_bridgeOrEightYear',
      title: 'Bridge deal or the eight year',
      body: `Two years at ${bridge}M and bet on yourself, or eight years at ${long}M and never think about money again. You are ${c.age}.`,
      options: [
        {
          label: `Two year bridge at ${bridge}M`,
          effect: 'Bet on yourself',
          apply: (cc) => { cc.salary = bridge; cc.contractYears = 2; mood(cc, 4); flag(cc, 'bridgeDeal'); return `Signed 2 years at ${bridge}M. Morale +4, and a very large July waiting for you at 29.`; },
        },
        {
          label: `Eight years at ${long}M`,
          effect: 'Generational security',
          apply: (cc) => { cc.salary = long; cc.contractYears = 8; mood(cc, 8); fans(cc, 8); flag(cc, 'longTerm'); return `Signed 8 years at ${long}M, ${m1(long * 8)}M total. Morale +8, fanbase +8, your grandkids are fine.`; },
        },
        {
          label: `Five years at ${mid}M`,
          effect: 'Split the difference',
          apply: (cc) => { cc.salary = mid; cc.contractYears = 5; mood(cc, 6); fans(cc, 4); return `Signed 5 years at ${mid}M, ${m1(mid * 5)}M total. Morale +6, fanbase +4, nobody mad.`; },
        },
      ],
    });
  }

  if (c.contractYears <= 1 && yrs >= 5) {
    deck.push({
      id: 'nhlB_noTradeClause',
      title: 'The no trade clause fight',
      body: 'They will give you the money or the clause, not both. A full no move costs you 0.9M a year. A ten team list costs 0.3M.',
      options: [
        {
          label: 'Full no move clause',
          effect: 'Control your life',
          apply: (cc) => { cc.salary = Math.max(1, m1(cc.salary - 0.9)); cc.contractYears = 4; mood(cc, 9); flag(cc, 'noMove'); return `Signed 4 years at ${cc.salary}M with a full no move. Morale +9, and nobody moves your family without your signature.`; },
        },
        {
          label: 'Ten team list, take the money',
          effect: 'Mostly protected',
          apply: (cc) => { cc.salary = Math.max(1, m1(cc.salary - 0.3)); cc.contractYears = 4; mood(cc, 5); flag(cc, 'tenTeamList'); return `Signed 4 years at ${cc.salary}M with a ten team list. Morale +5, mostly safe, mostly.`; },
        },
        {
          label: 'No clause, maximum cash',
          effect: 'Pure money',
          apply: (cc) => { cc.salary = m1(cc.salary + 0.6); cc.contractYears = 4; mood(cc, -3); return `Signed 4 years at ${cc.salary}M with zero protection. Morale -3, and a phone that could ring any deadline.`; },
        },
      ],
    });
  }

  if (c.contractYears <= 1 && c.age >= 28 && c.cups === 0) {
    const market = Math.max(2, m1((c.ovr - 66) * 0.55));
    deck.push({
      id: 'nhlB_takeLessToChase',
      title: 'Take less to chase one',
      body: `The contender has 4.5M of room and you are worth ${market}M. The rebuilding club offered ${m1(market + 2)}M and a letter on your jersey.`,
      options: [
        {
          label: 'Take the discount, chase the Cup',
          effect: 'Ring hunting',
          apply: (cc) => { cc.salary = 4.5; cc.contractYears = 3; mood(cc, 10); fans(cc, 10); flag(cc, 'hometownDiscount'); return `Signed 3 years at 4.5M and left ${m1(market - 4.5)}M a year on the table. Morale +10, fanbase +10.`; },
        },
        {
          label: 'Take the money and the letter',
          effect: 'Be the guy',
          apply: (cc, r) => { const nt = otherTeam(cc, r); cc.team = nt; cc.salary = m1(market + 2); cc.contractYears = 4; mood(cc, 6); cc.fanbase = 42; return `Signed 4 years at ${cc.salary}M with ${nhlTeamLabelOf(nt)} and a letter. Morale +6, fanbase resets to 42, ${m1((market + 2) * 4)}M guaranteed.`; },
        },
        {
          label: 'One year prove it deal',
          effect: 'Reset the market',
          apply: (cc) => { cc.salary = market; cc.contractYears = 1; mood(cc, 3); return `Signed 1 year at ${market}M and put the whole thing back on yourself. Morale +3.`; },
        },
      ],
    });
  }

  if (c.age >= 32) {
    deck.push({
      id: 'nhlB_overseasMegaOffer',
      title: 'The offer from overseas',
      body: 'A KHL club and a Swiss club both called. Tax free money, a driver, an apartment, and a league that would treat you like royalty for three years.',
      options: [
        {
          label: 'Take the KHL money for a year',
          effect: 'Cash and a passport',
          apply: (cc) => { const nw = addNet(cc, 5.5); cc.earnings = m1(cc.earnings + 5.5); cc.ovr = Math.max(60, cc.ovr - 3); hp(cc, 8); fans(cc, -10); flag(cc, 'playedOverseas'); return `5.5M tax free and an apartment with a view of a river you cannot pronounce. Net worth ${nw}M, rating -3 to ${cc.ovr}, health +8, fanbase -10.`; },
        },
        {
          label: 'Take the Swiss deal, easier league',
          effect: 'Alps and paychecks',
          apply: (cc) => { const nw = addNet(cc, 3.2); cc.earnings = m1(cc.earnings + 3.2); cc.ovr = Math.max(60, cc.ovr - 1); hp(cc, 12); mood(cc, 10); fans(cc, -6); flag(cc, 'playedOverseas', 2); return `3.2M, mountain air and 50 game seasons. Net worth ${nw}M, rating -1 to ${cc.ovr}, health +12, morale +10, fanbase -6.`; },
        },
        {
          label: 'Stay, finish it in this league',
          effect: 'Legacy over cash',
          apply: (cc) => { mood(cc, 7); fans(cc, 9); cc.salary = Math.max(1, m1(cc.salary * 0.7)); cc.contractYears = 2; return `Signed 2 more years at ${cc.salary}M to finish where people know your name. Morale +7, fanbase +9.`; },
        },
      ],
    });
  }

  if (yrs >= 3 && c.contractYears >= 1) {
    deck.push({
      id: 'nhlB_expansionExposure',
      title: 'Expansion draft exposure',
      body: 'The new franchise picks in June. The GM asked, completely off the record, if you would waive protection so he can keep two young defensemen.',
      options: [
        {
          label: 'Waive it, let them expose you',
          effect: 'Take one for the room',
          apply: (cc, r) => { if (r() < 0.45) { const nt = otherTeam(cc, r); cc.team = nt; cc.fanbase = 40; mood(cc, -4); flag(cc, 'expansionClaimed'); return `Claimed. You are the face of ${nhlTeamLabelOf(nt)} on day one. Fanbase resets to 40, morale -4, brand new everything.`; } mood(cc, 8); fans(cc, 10); return `Exposed, passed over, and the whole room found out you did it for them. Morale +8, fanbase +10.`; },
        },
        {
          label: 'Refuse, make them protect you',
          effect: 'Protect yourself',
          apply: (cc) => { mood(cc, 4); fans(cc, -4); flag(cc, 'refusedWaive'); return `They protected you and lost a 21 year old defenseman for nothing. Morale +4, fanbase -4, two quiet teammates.`; },
        },
        {
          label: 'Waive only if they extend you',
          effect: 'Leverage the favor',
          apply: (cc) => { cc.contractYears += 2; cc.salary = m1(cc.salary + 0.4); mood(cc, 6); return `Two extra years and 0.4M more a year for one signature. Contract now ${cc.contractYears} years at ${cc.salary}M, morale +6.`; },
        },
      ],
    });
  }

  if (c.age >= 30 && c.health >= 72 && yrs >= 8) {
    const left = m1(c.salary * Math.max(1, c.contractYears));
    deck.push({
      id: 'nhlB_walkAwayHealthy',
      title: 'Walk away while you can still walk',
      body: `${yrs} seasons, most of your teeth, and a body that still works in the morning. There is ${left}M left on the deal and a broadcast chair waiting.`,
      options: [
        {
          label: 'One farewell year, then done',
          effect: 'Out at the top',
          apply: (cc) => { cc.ovr = Math.min(cc.ovr, 63); cc.health = 100; cc.morale = 95; const nw = addNet(cc, 3); fans(cc, 12); flag(cc, 'retiringHealthy'); return `You told the room this is it. One farewell season, then out at full health. Net worth +3M to ${nw}M from the broadcast deal, morale 95, fanbase +12.`; },
        },
        {
          label: 'Keep playing, chase one more',
          effect: 'Not done yet',
          apply: (cc) => { cc.contractYears = Math.max(cc.contractYears, 2); hp(cc, -5); mood(cc, 5); fans(cc, 6); return `Two more years signed and a body that will send you the invoice later. Contract ${cc.contractYears} years, health -5 to ${cc.health}, morale +5, fanbase +6.`; },
        },
        {
          label: 'Sign the broadcast deal, play it out',
          effect: 'Both at once',
          apply: (cc) => { const nw = addNet(cc, 1.6); fans(cc, 9); mood(cc, 6); flag(cc, 'broadcastDeal'); return `1.6M a year waiting the second you are done, signed in ink. Net worth ${nw}M, fanbase +9, morale +6.`; },
        },
      ],
    });
  }

  return deck;
}
