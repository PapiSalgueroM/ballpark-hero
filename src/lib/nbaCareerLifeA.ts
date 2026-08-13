/*
   nbaCareerLifeA.ts, NBA My Career life deck A (Round 57)

   Owner brief: "everything BitLife has, ten times better and more out of
   pocket, at least 200 new additions". This file is 45 of them, the human
   stuff wrapped around the basketball. Rookie duties and locker room rank,
   the media machine that never sleeps, a city that adopts you or burns your
   jersey in a parking lot, your body and your head, deadline day and coach
   firings, the offseason circuit, and the everyday money that shows up long
   before the supermax does.

   Same self gating contract as the NFL and soccer life decks: an event only
   lands in the returned array when its conditions hold, so drawNbaEvent needs
   no extra eligibility rules. Every id is prefixed nbaA_ so it stays unique
   across every other NBA life file.

   apply() MUTATES the career and RETURNS the log line the player reads.

   Nothing imported is touched at module scope. nbaMyCareer.ts imports this
   file, so any top level use of an imported value would be undefined at load
   and blank the page. That bug shipped here once already.
*/
import type { NbaCareerState, NbaCareerEvent } from './nbaMyCareer';
import { nbaTeamLabelOf } from './nbaMyCareer';

/* Round 57 optional fields. Declared locally so this file compiles against
   old and new versions of NbaCareerState alike, and so every read guards with
   ?? 0 the way the save format requires. */
type LifeExtras = {
  netWorth?: number;
  dirtyMoney?: number;
  heat?: number;
  purchased?: string[];
  lifeFlags?: Record<string, number>;
};
type LifeState = NbaCareerState & LifeExtras;
const L = (c: NbaCareerState): LifeState => c as LifeState;

const flag = (c: NbaCareerState, k: string): number => (L(c).lifeFlags || {})[k] || 0;
const setFlag = (c: NbaCareerState, k: string, v: number) => { L(c).lifeFlags = { ...(L(c).lifeFlags || {}), [k]: v }; };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const mor = (c: NbaCareerState, d: number) => { c.morale = clamp(c.morale + d, 0, 100); };
const fan = (c: NbaCareerState, d: number) => { c.fanbase = clamp(c.fanbase + d, 0, 100); };
const hp = (c: NbaCareerState, d: number) => { c.health = clamp(c.health + d, 0, 100); };
const rate = (c: NbaCareerState, d: number) => { c.ovr = clamp(Math.min(c.pot + 1, c.ovr + d), 50, 99); };
const heat = (c: NbaCareerState, d: number) => { const s = L(c); s.heat = clamp((s.heat ?? 0) + d, 0, 100); };

/** Net worth only, for spending and investment returns. */
const bank = (c: NbaCareerState, d: number): number => {
  const s = L(c);
  s.netWorth = Math.round(((s.netWorth ?? 0) + d) * 10) / 10;
  return s.netWorth;
};
/** Money you actually earned: hits career earnings and net worth. */
const paid = (c: NbaCareerState, m: number): number => {
  c.earnings = Math.round((c.earnings + m) * 10) / 10;
  return bank(c, m);
};
const own = (c: NbaCareerState, item: string) => { const s = L(c); s.purchased = [...(s.purchased ?? []), item]; };
const money = (x: number) => Math.round(x * 10) / 10;
// Round 57 expanded the three position buckets into five. These keep the
// original guard / wing / big flavour working across PG, SG, SF, PF and C.
const isGuard = (c: NbaCareerState): boolean => c.pos === 'PG' || c.pos === 'SG';
const isWing = (c: NbaCareerState): boolean => c.pos === 'SF' || c.pos === 'PF';

const posNoun = (c: NbaCareerState): string =>
  isGuard(c) ? 'guard' : isWing(c) ? 'wing' : 'big';
const craftNoun = (c: NbaCareerState): string =>
  isGuard(c) ? 'jumper' : isWing(c) ? 'corner three' : 'touch around the rim';
const soreSpot = (c: NbaCareerState): string =>
  isGuard(c) ? 'left ankle' : isWing(c) ? 'lower back' : 'right knee';
const foilOf = (c: NbaCareerState): string =>
  isGuard(c) ? 'a point guard who has not stopped talking since college'
    : isWing(c) ? 'a wing who picks you up full court out of spite'
      : 'a center who still fouls like it is 1994';
const bagNoun = (c: NbaCareerState): string => {
  const a = c.archetype;
  if (!a) return 'buckets';
  if ((a.playmaking ?? 1) >= 1.2) return 'assists';
  if ((a.rebounding ?? 1) >= 1.2) return 'rebounds';
  return 'buckets';
};
const marketOf = (c: NbaCareerState): number => Math.max(2.5, money((c.ovr - 66) * 2.3 - 6));

/* Local abbr list so this file imports nothing but types and nbaTeamLabelOf. */
const ABBRS = [
  'ATL', 'BOS', 'BKN', 'CHA', 'CHI', 'CLE', 'DAL', 'DEN', 'DET', 'GSW',
  'HOU', 'IND', 'LAC', 'LAL', 'MEM', 'MIA', 'MIL', 'MIN', 'NOP', 'NYK',
  'OKC', 'ORL', 'PHI', 'PHX', 'POR', 'SAC', 'SAS', 'TOR', 'UTA', 'WAS',
];
const otherTeam = (c: NbaCareerState, r: () => number): string => {
  const pool = ABBRS.filter(a => a !== c.team);
  return pool[Math.floor(r() * pool.length)];
};

export function getNbaLifeEventsA(c: NbaCareerState, rng: () => number): NbaCareerEvent[] {
  const deck: NbaCareerEvent[] = [];
  const yrs = c.seasons.length;
  const last = c.seasons[yrs - 1];
  const missedPlayoffs = !!last && last.teamResult === 'Missed the playoffs';
  const lastPpg = last ? last.ppg : 0;
  const worth = L(c).netWorth ?? 0;

  /* ========================= 1. ROOKIE AND LOCKER ROOM ========================= */

  if (yrs <= 1) {
    deck.push({
      id: 'nbaA_rookie_duties',
      title: 'Donuts, bags, and the karaoke tax',
      body: 'Until next June you carry the speaker, you handle the road breakfast order for 17 grown men, and at some point you are singing on a plane. Everybody in the room has done it. Everybody in the room is watching.',
      options: [
        {
          label: 'Do every job better than anyone ever has', effect: 'Room love, no sleep',
          apply: (cc) => { mor(cc, 9); hp(cc, -2); setFlag(cc, 'roomRespect', flag(cc, 'roomRespect') + 1); return 'You memorized 17 coffee orders, sang a whole Usher song at 30,000 feet, and never complained once. The vets decided you were theirs by November. Morale +9, health -2.'; },
        },
        {
          label: 'Do the jobs, hire a guy for the coffee run', effect: 'Money out, still counts',
          apply: (cc) => { bank(cc, -0.05); mor(cc, 5); return 'You paid an assistant 40,000 for the season to handle breakfast and did everything else yourself. Net worth down 0.05M, morale +5, and one very confused veteran.'; },
        },
        {
          label: 'Skip the circus, live in the gym', effect: 'Rating up, room cold',
          apply: (cc) => { rate(cc, 1); mor(cc, -7); return `You were in the practice gym while they were singing. Rating +1 to ${cc.ovr}, morale -7, and nobody saved you a seat for a month.`; },
        },
      ],
    });
  }

  if (yrs <= 2) {
    deck.push({
      id: 'nbaA_vet_test',
      title: 'The vet who wants to see something',
      body: 'A 33 year old who has started 700 games put a forearm in your chest on the first day of camp, then did it again, then asked if you were going to do anything about it. The whole gym stopped dribbling.',
      options: [
        {
          label: 'Swing back and take the whole gym with you', effect: 'Respect, real risk',
          apply: (cc, r) => {
            if (r() < 0.62) { mor(cc, 12); setFlag(cc, 'roomRespect', flag(cc, 'roomRespect') + 2); return 'You put him on the floor and then helped him up. He told a reporter that week that you were the toughest kid he had been around. Morale +12.'; }
            mor(cc, -6); hp(cc, -4); return 'He was 240 pounds and 33 years old and he had done this a hundred times. You lost, loudly. Morale -6, health -4.';
          },
        },
        {
          label: 'Score on him nine straight times instead', effect: 'Rating up, message sent',
          apply: (cc) => { rate(cc, 2); mor(cc, 6); return `You did not say a single word and went at him until the coaches ended the drill early. Rating +2 to ${cc.ovr}, morale +6.`; },
        },
        {
          label: 'Laugh it off and go back to the line', effect: 'Peace, room shrugs',
          apply: (cc) => { hp(cc, 3); mor(cc, -2); return 'You smiled, jogged back and let it die. Health +3, morale -2, and the room filed it away without a word.'; },
        },
      ],
    });
  }

  if (yrs >= 1 && c.ovr < 84) {
    deck.push({
      id: 'nbaA_minutes_battle',
      title: 'Twenty two minutes, two players',
      body: `${nbaTeamLabelOf(c.team)} has one rotation spot at your position and two bodies for it. The coach keeps using the word earn. Your agent keeps using the word leverage.`,
      options: [
        {
          label: 'Win it in camp, no days off', effect: 'Rating up, body cost',
          apply: (cc) => { rate(cc, 2); hp(cc, -5); mor(cc, 6); return `You treated October scrimmages like Game 7 and had the job locked by the second preseason game. Rating +2 to ${cc.ovr}, morale +6, health -5.`; },
        },
        {
          label: 'Become undeniable on defense instead', effect: 'Safe minutes, fewer shots',
          apply: (cc) => { rate(cc, 1); mor(cc, 4); hp(cc, -2); return `You started guarding the best player on the other team every night and the coach could not sit you. Rating +1 to ${cc.ovr}, morale +4, health -2, and about four shots a game.`; },
        },
        {
          label: 'Have your agent ask about a trade', effect: 'Leverage, building tense',
          apply: (cc, r) => {
            setFlag(cc, 'frontOfficeFriction', flag(cc, 'frontOfficeFriction') + 1);
            if (r() < 0.45) { mor(cc, 9); rate(cc, 1); return `A quiet phone call became 28 minutes a night by December. Morale +9, rating +1 to ${cc.ovr}.`; }
            mor(cc, -6); fan(cc, -3); return 'It leaked in nine hours and now you are the guy who asked out over minutes in year two. Morale -6, fanbase -3.';
          },
        },
      ],
    });
  }

  if (yrs >= 1 && yrs <= 6) {
    deck.push({
      id: 'nbaA_star_freezeout',
      title: 'He will not throw you the ball',
      body: 'The best player on the team has looked at you exactly zero times in four games. You are wide open in the corner on film, over and over, and the ball goes somewhere else every single time.',
      options: [
        {
          label: 'Say it to his face in the locker room', effect: 'Air cleared or war started',
          apply: (cc, r) => {
            if (r() < 0.55) { mor(cc, 11); rate(cc, 1); return `He heard you out, said one honest sentence back, and you got nine catch and shoot looks the next night. Morale +11, rating +1 to ${cc.ovr}.`; }
            mor(cc, -9); setFlag(cc, 'starBeef', 1); return 'He told you to make one first. It got quiet, it got repeated, and it got to a podcast. Morale -9.';
          },
        },
        {
          label: 'Make yourself impossible to ignore', effect: 'Rating up, slow burn',
          apply: (cc) => { rate(cc, 2); hp(cc, -3); mor(cc, 2); return `You started crashing every board and cutting every possession until the ball had nowhere else to go. Rating +2 to ${cc.ovr}, health -3, morale +2.`; },
        },
        {
          label: 'Take it to the coaching staff', effect: 'Structure, some heat',
          apply: (cc) => { mor(cc, 5); setFlag(cc, 'starBeef', 1); return 'They drew up four sets just for you and told him it was analytics. He knew exactly who asked. Morale +5.'; },
        },
      ],
    });
  }

  if (yrs >= 1 && c.ovr <= 88) {
    deck.push({
      id: 'nbaA_fourth_quarter_bench',
      title: 'You did not play the fourth',
      body: 'Eighteen points through three quarters and then you sat and watched a 34 year old miss six shots down the stretch. The coach said the word veteran in the presser without ever saying your name.',
      options: [
        {
          label: 'Ask him why, in his office, on Monday', effect: 'Direct, usually works',
          apply: (cc, r) => {
            if (r() < 0.6) { mor(cc, 10); rate(cc, 1); return `He showed you three clips, you had an answer for two of them, and you closed the next 40 games. Morale +10, rating +1 to ${cc.ovr}.`; }
            mor(cc, -5); return 'He said trust is earned and then said it again in slightly different words for eleven minutes. Morale -5.';
          },
        },
        {
          label: 'Say nothing and fix the tape', effect: 'Rating up, quiet',
          apply: (cc) => { rate(cc, 2); mor(cc, -2); return `You watched every fourth quarter possession of your season alone and found the exact reason. Rating +2 to ${cc.ovr}, morale -2.`; },
        },
        {
          label: 'Let your body language say it on the bench', effect: 'Cameras see everything',
          apply: (cc) => { fan(cc, 6); mor(cc, -4); heat(cc, 4); return 'The camera found you with a towel over your head and it ran on every highlight show for two days. Fanbase +6, morale -4.'; },
        },
      ],
    });
  }

  if (yrs <= 2) {
    deck.push({
      id: 'nbaA_summer_league',
      title: 'Vegas in July',
      body: 'Two gyms, no air conditioning that works, 400 scouts, and a schedule that means nothing and everything at the same time. Your agent says two good games gets you a rotation spot in October.',
      options: [
        {
          label: 'Play all five games and go get 25 a night', effect: 'Rating and buzz, body cost',
          apply: (cc, r) => {
            hp(cc, -4);
            if (r() < 0.65) { rate(cc, 2); fan(cc, 9); mor(cc, 7); return `Summer League MVP, a shirtless celebration clip, and a real rotation promise. Rating +2 to ${cc.ovr}, fanbase +9, morale +7, health -4.`; }
            mor(cc, -5); fan(cc, -3); return 'You shot 31 percent in a gym with no shooters and the internet made a whole week out of it. Morale -5, fanbase -3, health -4.';
          },
        },
        {
          label: 'Play two, then shut it down and train', effect: 'Balanced, sensible',
          apply: (cc) => { rate(cc, 1); hp(cc, 4); mor(cc, 3); return `Two clean games, then six weeks of actual development work in an empty gym. Rating +1 to ${cc.ovr}, health +4, morale +3.`; },
        },
        {
          label: 'Skip it entirely, you are past this', effect: 'Rest, coaches notice',
          apply: (cc) => { hp(cc, 8); mor(cc, -3); setFlag(cc, 'frontOfficeFriction', flag(cc, 'frontOfficeFriction') + 1); return 'You told them you did not need Vegas. Health +8, morale -3, and an assistant coach who mentions it every October.'; },
        },
      ],
    });
  }

  if (yrs >= 1) {
    deck.push({
      id: 'nbaA_charter_seat',
      title: 'The seat map on the plane',
      body: 'The back of the plane is card games and grown men yelling. The middle is headphones and film. The front is coaches. Nobody wrote the rules down and everybody knows them exactly.',
      options: [
        {
          label: 'Go to the back and lose money at cards', effect: 'Brotherhood, small bleed',
          apply: (cc, r) => {
            mor(cc, 8);
            if (r() < 0.55) { bank(cc, -0.04); return 'You lost 40,000 dollars over a season and gained six friends who would fight for you. Net worth down 0.04M, morale +8.'; }
            bank(cc, 0.06); return 'You cleaned out two All Stars and a strength coach on a flight to Portland. Net worth up 0.06M, morale +8.';
          },
        },
        {
          label: 'Middle seat, headphones, film every flight', effect: 'Rating up, quiet reputation',
          apply: (cc) => { rate(cc, 1); mor(cc, 1); return `You watched every opponent twice in the air across 41 road games. Rating +1 to ${cc.ovr}, morale +1.`; },
        },
        {
          label: 'Sleep the entire flight, every flight', effect: 'Health up, invisible',
          apply: (cc) => { hp(cc, 7); mor(cc, -1); return 'Eye mask, neck pillow, out before the wheels left the ground, all 41 trips. Health +7, morale -1.'; },
        },
      ],
    });
  }

  /* ============================ 2. MEDIA AND FAME ============================ */

  if (yrs >= 1) {
    deck.push({
      id: 'nbaA_tunnel_fit',
      title: 'The tunnel walk went nuclear',
      body: 'Forty feet of concrete, eleven cameras, and an outfit your stylist described as a conversation. It is trending before tipoff and two fashion houses have already emailed.',
      options: [
        {
          label: 'Go full runway every single night', effect: 'Fame and bags',
          apply: (cc) => { fan(cc, 13); paid(cc, 1.8); bank(cc, -0.3); own(cc, 'A stylist on retainer'); setFlag(cc, 'fashionGuy', 1); return 'A stylist, a garment bag on every road trip, and a 1.8M fashion house deal by February. Fanbase +13, 1.8M earned, 0.3M a year on clothes.'; },
        },
        {
          label: 'Wear the same hoodie for 82 games as a bit', effect: 'Meme legend, no bag',
          apply: (cc) => { fan(cc, 9); mor(cc, 7); return 'The same grey hoodie, all season, photographed 82 times. It became its own account with 400,000 followers. Fanbase +9, morale +7.'; },
        },
        {
          label: 'Ignore the tunnel, walk in with your head down', effect: 'Focus over shine',
          apply: (cc) => { rate(cc, 1); mor(cc, 4); fan(cc, -4); return `You never once looked at a camera in that hallway. Rating +1 to ${cc.ovr}, morale +4, fanbase -4.`; },
        },
      ],
    });
  }

  if (yrs >= 2) {
    deck.push({
      id: 'nbaA_podcast_take',
      title: 'You said it on a podcast',
      body: 'Two hours of easy laughs and one sentence about how a certain era of players would not survive today. That sentence is a graphic on four shows by morning and a Hall of Famer is typing.',
      options: [
        {
          label: 'Double down and name names', effect: 'Huge fame, huge noise',
          apply: (cc) => { fan(cc, 14); mor(cc, -7); heat(cc, 8); setFlag(cc, 'looseCannon', 1); return 'You did it again on camera, slower, with a list. Fanbase +14, morale -7, and three legends who will never say a kind word about you.'; },
        },
        {
          label: 'Call the guy you insulted, privately', effect: 'Class, story dies',
          apply: (cc) => { mor(cc, 8); fan(cc, -2); return 'One phone call, 40 minutes, and he told a story that ended the whole thing. Morale +8, fanbase -2, and a number in your phone worth having.'; },
        },
        {
          label: 'Delete the app and go silent for a month', effect: 'Rating up, quiet',
          apply: (cc) => { rate(cc, 1); mor(cc, 5); fan(cc, -5); return `Thirty one days, zero posts, one very good stretch of basketball. Rating +1 to ${cc.ovr}, morale +5, fanbase -5.`; },
        },
      ],
    });
  }

  if (c.fanbase >= 40 || c.ovr >= 80) {
    deck.push({
      id: 'nbaA_analyst_beef',
      title: 'The man on the desk has notes',
      body: 'A former player with a very good suit and a microphone said you are the most overrated player in the league, then said it again the next night with a chart. Your group chat has sent it to you 40 times.',
      options: [
        {
          label: 'Go on his show and sit across from him', effect: 'Bold, big television',
          apply: (cc, r) => {
            if (r() < 0.6) { fan(cc, 14); mor(cc, 8); paid(cc, 0.15); return 'You showed up unannounced, were funnier than everyone on the panel, and left with a standing invitation. Fanbase +14, morale +8, 0.15M appearance fee.'; }
            fan(cc, 4); mor(cc, -7); return 'He had done this for 15 years and you had done it once. Fanbase +4, morale -7, and a clip you cannot escape.';
          },
        },
        {
          label: 'Answer him with a 40 point night in his city', effect: 'Rating and fanbase',
          apply: (cc) => { rate(cc, 1); fan(cc, 10); mor(cc, 6); return `You hung a career night on national television and stared at the desk on the way off. Rating +1 to ${cc.ovr}, fanbase +10, morale +6.`; },
        },
        {
          label: 'Never say his name again in your life', effect: 'Mystique, no fuel',
          apply: (cc) => { mor(cc, 4); rate(cc, 1); return `You declined every question about him for six straight years, which somehow made him look worse every time. Rating +1 to ${cc.ovr}, morale +4.`; },
        },
      ],
    });
  }

  if (yrs >= 1) {
    deck.push({
      id: 'nbaA_micd_up',
      title: "Mic'd up, national game, no filter",
      body: `The league put a mic on you against ${foilOf(c)} and forgot to tell you when it was live. What you said in the third quarter is already a t-shirt in two cities.`,
      options: [
        {
          label: 'Trademark it yourself by Tuesday', effect: 'Money and fame',
          apply: (cc) => { paid(cc, 1.2); fan(cc, 12); own(cc, 'A trademarked catchphrase'); return 'Filed on Tuesday, on 60,000 shirts by Christmas, and yelled at you in every airport since. 1.2M earned, fanbase +12.'; },
        },
        {
          label: 'Apologize to him before the story runs', effect: 'Respect, less noise',
          apply: (cc) => { mor(cc, 7); fan(cc, 3); return 'You texted him at midnight, he sent back three laughing faces, and you both let it die. Morale +7, fanbase +3.'; },
        },
        {
          label: 'Never explain it, not once, not ever', effect: 'Legend, zero comment',
          apply: (cc) => { fan(cc, 8); mor(cc, 3); return 'You have been asked about it 200 times and answered zero. It is ten times bigger now than the night it happened. Fanbase +8, morale +3.'; },
        },
      ],
    });
  }

  if (yrs >= 3 && c.age >= 25) {
    deck.push({
      id: 'nbaA_load_mgmt_questions',
      title: 'The load management question',
      body: 'You sat the second night of a back to back in a city where a family drove four hours to see you. A columnist wrote 1,200 words about it and the league office sent the team a letter.',
      options: [
        {
          label: 'Play every single game the rest of the year', effect: 'Fanbase up, body down',
          apply: (cc) => { fan(cc, 13); hp(cc, -9); mor(cc, 4); setFlag(cc, 'ironman', 1); return 'You played all 82 and never sat a fourth quarter you did not have to. Fanbase +13, morale +4, health -9.'; },
        },
        {
          label: 'Defend the science on camera, calmly', effect: 'Health kept, fans cold',
          apply: (cc) => { hp(cc, 8); fan(cc, -7); mor(cc, 3); return 'You cited your own MRI on live television and it did not land the way you hoped. Health +8, morale +3, fanbase -7.'; },
        },
        {
          label: 'Sit, then fly that family out for a home game', effect: 'Costs money, wins the room',
          apply: (cc) => { bank(cc, -0.03); hp(cc, 6); fan(cc, 10); mor(cc, 8); return 'Flights, hotel, courtside, and 20 minutes with them after. Net worth down 0.03M, health +6, fanbase +10, morale +8.'; },
        },
      ],
    });
  }

  if (c.ovr >= 82 || c.fanbase >= 60) {
    deck.push({
      id: 'nbaA_allstar_circus',
      title: 'All Star weekend is a circus',
      body: 'Three days, 41 obligations, a sponsor party every night, a dunk contest that wants you, and a game on Sunday where nobody plays defense until the last four minutes.',
      options: [
        {
          label: 'Do the dunk contest and win the whole weekend', effect: 'Fame, real risk',
          apply: (cc, r) => {
            hp(cc, -3);
            if (r() < 0.55) { fan(cc, 16); mor(cc, 10); paid(cc, 0.25); return 'You jumped over a car and a mascot and the building lost its mind. Fanbase +16, morale +10, 0.25M in prize and appearance money, health -3.'; }
            fan(cc, -5); mor(cc, -6); return 'Nine misses on the same dunk and a very long walk back to the bench. Fanbase -5, morale -6, health -3.';
          },
        },
        {
          label: 'Work every sponsor room and cash out', effect: 'Money, zero sleep',
          apply: (cc) => { paid(cc, 1.4); fan(cc, 7); hp(cc, -5); return 'Eleven appearances in 60 hours and a voice that did not come back until Thursday. 1.4M earned, fanbase +7, health -5.'; },
        },
        {
          label: 'Play Sunday, skip everything else, fly home', effect: 'Rest and family',
          apply: (cc) => { hp(cc, 9); mor(cc, 8); fan(cc, -3); return 'One game, one flight, four days at home with your kids in the actual break. Health +9, morale +8, fanbase -3.'; },
        },
      ],
    });
  }

  if (yrs >= 2 && rng() < 0.85) {
    deck.push({
      id: 'nbaA_caught_liking',
      title: 'The like at 2:41am',
      body: 'A screenshot is going around of your account liking a post about how your team should trade you and start over. You have a whole explanation about the algorithm ready.',
      options: [
        {
          label: 'Blame the algorithm with total confidence', effect: 'Meme, nobody buys it',
          apply: (cc) => { fan(cc, 7); mor(cc, -3); return 'You said the phone was in your cousin\'s hand and your cousin was asleep. Fanbase +7, morale -3, and zero people believed you.'; },
        },
        {
          label: 'Own it and say you meant it', effect: 'Honest and expensive',
          apply: (cc) => { fan(cc, 11); mor(cc, -6); heat(cc, 6); setFlag(cc, 'frontOfficeFriction', flag(cc, 'frontOfficeFriction') + 1); return 'You told the truth on a podium and the front office found out at the same time as everybody else. Fanbase +11, morale -6.'; },
        },
        {
          label: 'Delete the account entirely', effect: 'Peace and focus',
          apply: (cc) => { rate(cc, 1); mor(cc, 7); fan(cc, -6); return `Gone in one afternoon, four million followers included. Rating +1 to ${cc.ovr}, morale +7, fanbase -6.`; },
        },
      ],
    });
  }

  /* ============================== 3. CITY AND FANS ============================== */

  if (missedPlayoffs || c.fanbase < 52) {
    deck.push({
      id: 'nbaA_booed_home',
      title: 'Booed in your own building',
      body: 'Not scattered. Organized, 19,000 strong, starting when your name was announced. Your mother was in section 112 and heard every second of it.',
      options: [
        {
          label: 'Tell them at the podium that they were right', effect: 'Honest, wins them back',
          apply: (cc) => { fan(cc, 11); mor(cc, -2); return `You said you would have booed too. ${nbaTeamLabelOf(cc.team)} fans forgive exactly one thing and that is honesty. Fanbase +11, morale -2.`; },
        },
        {
          label: 'Cup your ear at the crowd next time you score', effect: 'War with the city',
          apply: (cc) => { fan(cc, -14); mor(cc, 8); heat(cc, 5); setFlag(cc, 'cityWar', 1); return 'You did it in front of 19,000 people who paid to be there. Fanbase -14, morale +8, and a rivalry with your own zip code.'; },
        },
        {
          label: 'Say nothing and get in the gym', effect: 'Slow burn, rating up',
          apply: (cc) => { rate(cc, 2); mor(cc, 2); fan(cc, 4); return `No quotes, no excuses, 400 makes a day all summer. Rating +2 to ${cc.ovr}, morale +2, fanbase +4.`; },
        },
      ],
    });
  }

  if (c.fanbase >= 62) {
    deck.push({
      id: 'nbaA_mural',
      title: 'They painted you on a wall',
      body: 'Four stories tall on the side of a laundromat six blocks from the arena, mid follow through, eyes closed. The artist is 24 and wants you at the unveiling on Saturday.',
      options: [
        {
          label: 'Show up with the whole team and the neighborhood', effect: 'City love',
          apply: (cc) => { fan(cc, 11); mor(cc, 7); return 'Two hundred people, a food truck you paid for, and a photo that ran on the front page of the paper. Fanbase +11, morale +7.'; },
        },
        {
          label: 'Pay her properly and fund four more walls', effect: 'Money out, deep love',
          apply: (cc) => { bank(cc, -0.3); fan(cc, 16); mor(cc, 6); own(cc, 'A neighborhood mural fund'); return 'You paid her real money and commissioned four more, none of them of you. Net worth down 0.3M, fanbase +16, morale +6.'; },
        },
        {
          label: 'Skip it, you hate that stuff', effect: 'Private, small dip',
          apply: (cc) => { fan(cc, -4); mor(cc, 6); hp(cc, 3); return 'You sent a signed jersey and spent Saturday on a table with the trainers. Fanbase -4, morale +6, health +3.'; },
        },
      ],
    });
  }

  deck.push({
    id: 'nbaA_hospital_room_308',
    title: 'Room 308',
    body: 'The team does a childrens hospital visit every December. In room 308 there is a kid in your jersey, your number drawn on his cast in marker, and a very rough spring in front of him.',
    options: [
      {
        label: 'Stay three hours after the cameras leave', effect: 'Morale and city love',
        apply: (cc) => { mor(cc, 12); fan(cc, 8); return 'The bus left without you. You came back twice more that month with no cameras and no post about it. Morale +12, fanbase +8.'; },
      },
      {
        label: 'Quietly clear the family bill on the way out', effect: 'Costs money, means everything',
        apply: (cc, r) => {
          bank(cc, -0.2); mor(cc, 13);
          if (r() < 0.5) { fan(cc, 12); return 'You asked the billing office to leave your name off it. A nurse told a reporter anyway. Net worth down 0.2M, morale +13, fanbase +12.'; }
          fan(cc, 2); return 'You cleared it and nobody ever found out. Net worth down 0.2M, morale +13, fanbase +2.';
        },
      },
      {
        label: 'Send gear and use the day for treatment', effect: 'Recovery over optics',
        apply: (cc) => { hp(cc, 6); fan(cc, 1); return 'Three boxes of signed gear went to the ward and you spent the day in the cold tub. Health +6, fanbase +1.'; },
      },
    ],
  });

  if (yrs >= 1) {
    deck.push({
      id: 'nbaA_barbershop',
      title: 'The shop on the corner',
      body: 'Same chair, same barber, every Thursday since your rookie year. Nobody in there is impressed by you and every single one of them has a detailed opinion about your shot selection.',
      options: [
        {
          label: 'Keep going every week, no matter what', effect: 'Sanity and city love',
          apply: (cc) => { mor(cc, 10); fan(cc, 9); return 'Fifteen years, same chair, and the only room in your life where nobody wanted anything from you. Morale +10, fanbase +9.'; },
        },
        {
          label: 'Buy the building so he never gets priced out', effect: 'Money out, neighborhood forever',
          apply: (cc, r) => {
            bank(cc, -0.6); fan(cc, 14); mor(cc, 9); own(cc, 'The barbershop building');
            if (r() < 0.5) { bank(cc, 0.5); return 'You bought the whole building, kept his rent at 1998 prices, and the block appreciated anyway. Net worth down 0.1M net, fanbase +14, morale +9.'; }
            return 'You bought the building so his rent could never move again. Net worth down 0.6M, fanbase +14, morale +9.';
          },
        },
        {
          label: 'Fly the barber to you instead', effect: 'Convenient, loses the room',
          apply: (cc) => { bank(cc, -0.08); hp(cc, 4); mor(cc, -2); return 'He cuts you in a hotel now and gets paid four times as much. Net worth down 0.08M, health +4, morale -2, and something you cannot buy back.'; },
        },
      ],
    });
  }

  if (yrs >= 2) {
    deck.push({
      id: 'nbaA_trade_rumor_city',
      title: 'A reporter tweeted your name',
      body: `Eleven words about ${nbaTeamLabelOf(c.team)} "gauging interest" and the whole city lost it before dinner. Two radio hosts are already arguing about the return package.`,
      options: [
        {
          label: 'Post a photo of your house with no caption', effect: 'Fans read it as loyalty',
          apply: (cc) => { fan(cc, 10); mor(cc, 3); return 'No words, just your front steps in this city. Fifty thousand people decided exactly what it meant. Fanbase +10, morale +3.'; },
        },
        {
          label: 'Call the GM and ask him straight out', effect: 'Clarity, maybe painful',
          apply: (cc, r) => {
            if (r() < 0.55) { mor(cc, 9); return 'He called you back in six minutes and told you the truth, which was that they had said no twice already. Morale +9.'; }
            mor(cc, -8); setFlag(cc, 'frontOfficeFriction', flag(cc, 'frontOfficeFriction') + 1); return 'He gave you 90 seconds of nothing and you learned everything you needed to. Morale -8.';
          },
        },
        {
          label: 'Say you would love a fresh start', effect: 'Honest, city hurt',
          apply: (cc) => { fan(cc, -11); mor(cc, 6); heat(cc, 5); return 'You said out loud that you are open to anything. Fanbase -11, morale +6, and a very quiet home opener.'; },
        },
      ],
    });
  }

  if (yrs >= 3 && (c.fanbase >= 45 || flag(c, 'cityWar') > 0)) {
    deck.push({
      id: 'nbaA_jersey_burning',
      title: 'They are burning your jersey in a parking lot',
      body: 'Somebody filmed twelve people setting your jersey on fire outside a sports bar after you said you would test free agency. It has nine million views and your grandmother has seen it.',
      options: [
        {
          label: 'Buy every one of them a new jersey anyway', effect: 'Disarms the whole thing',
          apply: (cc) => { bank(cc, -0.02); fan(cc, 13); mor(cc, 7); return 'You sent twelve boxes to the bar with a note that said keep the receipts. The follow up video was them wearing them. Net worth down 0.02M, fanbase +13, morale +7.'; },
        },
        {
          label: 'Post the video yourself with three laughing faces', effect: 'Fuel, fame, no peace',
          apply: (cc) => { fan(cc, 6); mor(cc, 5); heat(cc, 8); setFlag(cc, 'cityWar', 1); return 'You gave it another four million views on purpose. Fanbase +6, morale +5, and a road arena that will hate you forever.'; },
        },
        {
          label: 'Say nothing and let it hurt', effect: 'Quiet, real cost',
          apply: (cc) => { mor(cc, -7); rate(cc, 1); fan(cc, 2); return `You watched it once, closed the phone, and went to the gym at 11pm. Morale -7, rating +1 to ${cc.ovr}, fanbase +2.`; },
        },
      ],
    });
  }

  if (yrs >= 2) {
    deck.push({
      id: 'nbaA_neighborhood_court',
      title: 'The court you grew up on has no nets',
      body: 'Two bent rims, a crack running the length of the paint, and 40 kids using it every day anyway. A city councilman has been promising to fix it since you were nine.',
      options: [
        {
          label: 'Rebuild the whole park yourself', effect: 'Money out, permanent love',
          apply: (cc) => { bank(cc, -0.45); fan(cc, 15); mor(cc, 12); own(cc, 'A rebuilt neighborhood court'); return 'New surface, glass backboards, lights that stay on until 10pm, and your name nowhere on it. Net worth down 0.45M, fanbase +15, morale +12.'; },
        },
        {
          label: 'Get a sponsor to fund it and put their logo down', effect: 'Free courts, logo center circle',
          apply: (cc) => { paid(cc, 0.3); fan(cc, 9); mor(cc, 6); return 'A shoe company paid for six courts across the city and got a swoosh at half court on all of them. 0.3M earned, fanbase +9, morale +6.'; },
        },
        {
          label: 'Just send nets and balls every month', effect: 'Cheap, still matters',
          apply: (cc) => { bank(cc, -0.02); fan(cc, 5); mor(cc, 5); return 'Chain nets and a bag of balls on the first of every month for eleven years. Net worth down 0.02M, fanbase +5, morale +5.'; },
        },
      ],
    });
  }

  /* ============================== 4. BODY AND MIND ============================== */

  if (c.health < 95) {
    deck.push({
      id: 'nbaA_nagging_ankle',
      title: `The ${soreSpot(c)} you have not mentioned`,
      body: `It has been wrong since November. It loosens up by the second quarter, which is the exact part the doctors do not like. You have been taping it yourself in the shower.`,
      options: [
        {
          label: 'Tell the trainers and get it scanned', effect: 'Health up, games missed',
          apply: (cc) => { hp(cc, 12); mor(cc, -3); setFlag(cc, 'honestBody', flag(cc, 'honestBody') + 1); return 'The scan found something small that was two months from being enormous. Fourteen games out bought you four years. Health +12, morale -3.'; },
        },
        {
          label: 'Take the full offseason rehab, skip everything', effect: 'Best long term',
          apply: (cc) => { hp(cc, 20); rate(cc, -1); mor(cc, -5); return `Twelve weeks, no pickup, no Pro Am, no cameras. Health +20, rating -1 to ${cc.ovr}, morale -5, and a body that will still be here at 35.`; },
        },
        {
          label: 'Tape it and play all 82', effect: 'Tough, expensive later',
          apply: (cc) => { hp(cc, -8); mor(cc, 3); fan(cc, 6); return 'Tape, a needle nobody talked about, and 82 games. Health -8, morale +3, fanbase +6, and something you will feel every cold morning of your life.'; },
        },
      ],
    });
  }

  if (yrs >= 3) {
    deck.push({
      id: 'nbaA_load_vs_82',
      title: 'Sixty five games or all of them',
      body: 'The performance staff built a plan that has you sitting 17 nights. The coach hates it. The fans hate it. The data says you are 31 percent less likely to miss three months.',
      options: [
        {
          label: 'Follow the plan exactly', effect: 'Health up, noise up',
          apply: (cc) => { hp(cc, 13); fan(cc, -6); rate(cc, 1); return `You sat 17 nights and finished the season feeling like March was October. Health +13, rating +1 to ${cc.ovr}, fanbase -6.`; },
        },
        {
          label: 'Play all 82 and let them write about it', effect: 'Legend, real wear',
          apply: (cc) => { hp(cc, -11); fan(cc, 14); mor(cc, 7); setFlag(cc, 'ironman', 1); return 'Eighty two games, both nights of every back to back, and a city that will name a street after you. Fanbase +14, morale +7, health -11.'; },
        },
        {
          label: 'Split it, sit the second night of back to backs only', effect: 'Middle path',
          apply: (cc) => { hp(cc, 6); fan(cc, 2); mor(cc, 3); return 'Nine nights off, all of them defensible, nobody fully happy. Health +6, fanbase +2, morale +3.'; },
        },
      ],
    });
  }

  if (c.age <= 30) {
    deck.push({
      id: 'nbaA_shooting_coach',
      title: `The man who wants to rebuild your ${craftNoun(c)}`,
      body: `A shooting coach with eight cameras and a laptop full of angles says your ${craftNoun(c)} has a hitch that is costing you four percent from deep. The rebuild takes a full summer and feels terrible for eight weeks.`,
      options: [
        {
          label: 'Tear it down and build it back', effect: 'Big swing, real risk',
          apply: (cc, r) => {
            bank(cc, -0.15);
            if (r() < 0.6) { cc.pot = Math.min(99, cc.pot + 2); rate(cc, 3); return `It clicked in August and the ball has never come off your hand cleaner. Rating +3 to ${cc.ovr}, potential +2, net worth down 0.15M.`; }
            rate(cc, -2); mor(cc, -8); return `You spent a summer thinking about your elbow and showed up in October as a stranger to your own hands. Rating -2 to ${cc.ovr}, morale -8, net worth down 0.15M.`;
          },
        },
        {
          label: 'Take the two best fixes and go home', effect: 'Small safe gain',
          apply: (cc) => { bank(cc, -0.04); rate(cc, 1); hp(cc, 3); return `Two tweaks, five days, no identity crisis. Rating +1 to ${cc.ovr}, health +3.`; },
        },
        {
          label: 'Trust the shot that got you drafted', effect: 'Confidence, no change',
          apply: (cc) => { mor(cc, 9); hp(cc, 4); return 'You told him you have shot it this way since you were seven and it has worked every year since. Morale +9, health +4.'; },
        },
      ],
    });
  }

  if (yrs >= 2) {
    deck.push({
      id: 'nbaA_sleep_program',
      title: 'The sleep guy has bad news',
      body: 'A specialist tracked you for three weeks and used the phrase structurally alarming. You are averaging five hours and ten minutes on a body that runs four miles a night and lands on hardwood.',
      options: [
        {
          label: 'Full protocol, phone out of the room', effect: 'Health and rating up',
          apply: (cc) => { bank(cc, -0.06); hp(cc, 12); rate(cc, 1); mor(cc, -2); return `Blackout curtains, 15 degrees colder, 10pm every night, and the most boring life of anyone you know. Health +12, rating +1 to ${cc.ovr}, morale -2.`; },
        },
        {
          label: 'Just kill the 2am scrolling', effect: 'Cheap, decent gain',
          apply: (cc) => { hp(cc, 6); mor(cc, 2); return 'One rule, no screens after midnight, and you found 80 minutes a night you did not know you had. Health +6, morale +2.'; },
        },
        {
          label: 'Ignore it, you have always been a night guy', effect: 'Freedom now, bill later',
          apply: (cc) => { mor(cc, 6); hp(cc, -6); return 'Video games until 3am on the road, same as always. Morale +6, health -6, and a fourth quarter in March that felt like running in sand.'; },
        },
      ],
    });
  }

  if (yrs >= 1) {
    deck.push({
      id: 'nbaA_nutritionist',
      title: 'She banned the thing you love most',
      body: 'The team nutritionist put together a plan with 40 pages and one very specific ban. Your postgame ritual since high school has been a large pepperoni pizza in the car on the way home.',
      options: [
        {
          label: 'Follow all 40 pages, no exceptions', effect: 'Health and rating up',
          apply: (cc) => { hp(cc, 11); rate(cc, 1); mor(cc, -4); return `Eleven months of grilled everything and zero joy. Health +11, rating +1 to ${cc.ovr}, morale -4, and abs you did not ask for.`; },
        },
        {
          label: 'In season she wins, offseason you win', effect: 'Balanced deal',
          apply: (cc) => { hp(cc, 6); mor(cc, 5); return 'Clean from October to June, absolutely feral in July. Health +6, morale +5, and she agreed it was better than lying to her.'; },
        },
        {
          label: 'Keep the pizza, it is not negotiable', effect: 'Joy over grams',
          apply: (cc) => { mor(cc, 9); hp(cc, -4); return 'You have had a large pepperoni after every home game since you were 16 and you were not stopping at 26. Morale +9, health -4.'; },
        },
      ],
    });
  }

  if (yrs >= 2 && (c.morale < 72 || missedPlayoffs)) {
    deck.push({
      id: 'nbaA_therapy',
      title: 'The thing nobody in your family talks about',
      body: 'You have not slept right since March and you have been snapping at people who love you. The team offers a sports psychologist. Your uncle says real ones just play through it.',
      options: [
        {
          label: 'Go every week and actually do the work', effect: 'Best thing you ever did',
          apply: (cc) => { mor(cc, 18); hp(cc, 8); rate(cc, 1); setFlag(cc, 'therapy', 1); return `Forty sessions in a year and the first honest conversation you had ever had. Morale +18, health +8, rating +1 to ${cc.ovr}, and you started sleeping again.`; },
        },
        {
          label: 'Go, and say so publicly so other guys go too', effect: 'Healing plus real impact',
          apply: (cc) => { mor(cc, 16); fan(cc, 12); hp(cc, 6); setFlag(cc, 'therapy', 1); return 'You said it in a press conference and four teammates booked appointments that week. Morale +16, fanbase +12, health +6.'; },
        },
        {
          label: 'Handle it yourself in the gym at midnight', effect: 'Rating up, nothing fixed',
          apply: (cc) => { rate(cc, 1); mor(cc, -6); hp(cc, -3); return `Six hundred makes a night and none of it touched the actual thing. Rating +1 to ${cc.ovr}, morale -6, health -3.`; },
        },
      ],
    });
  }

  /* ============================= 5. BASKETBALL LIFE ============================= */

  if (yrs >= 1) {
    deck.push({
      id: 'nbaA_deadline_day',
      title: 'Three oclock on deadline day',
      body: 'Your phone is face down on the hotel bed and you are pretending to watch television. Two teams have your name in a trade machine and one of them is real.',
      options: [
        {
          label: 'Ask to be moved somewhere you can win', effect: 'New team, contender energy',
          apply: (cc, r) => {
            const nt = otherTeam(cc, r); cc.team = nt; cc.fanbase = 44; mor(cc, 12); hp(cc, -2);
            return `You woke up a ${nbaTeamLabelOf(nt)} with a locker that still had somebody else's tape on it. Morale +12, fanbase reset to 44.`;
          },
        },
        {
          label: 'Tell them you want to stay and finish it', effect: 'Loyalty, city love',
          apply: (cc) => { fan(cc, 13); mor(cc, 6); setFlag(cc, 'stayedAtDeadline', flag(cc, 'stayedAtDeadline') + 1); return `You called the GM at 1pm and said do not move me. ${nbaTeamLabelOf(cc.team)} fans found out and never forgot it. Fanbase +13, morale +6.`; },
        },
        {
          label: 'Say nothing, let the business be the business', effect: 'Neutral, clear head',
          apply: (cc, r) => {
            if (r() < 0.4) { const nt = otherTeam(cc, r); cc.team = nt; cc.fanbase = 40; mor(cc, -4); return `They moved you at 2:58 and you found out from a notification. You are a ${nbaTeamLabelOf(nt)} now. Morale -4, fanbase reset to 40.`; }
            mor(cc, 4); rate(cc, 1); return `Nothing happened, you played that night, and you scored 26. Morale +4, rating +1 to ${cc.ovr}.`;
          },
        },
      ],
    });
  }

  if (yrs >= 2 && (missedPlayoffs || c.morale < 68)) {
    deck.push({
      id: 'nbaA_coach_fired',
      title: 'They fired him in January',
      body: 'He recruited you, he defended you on the radio, and he got let go at 7am on a Tuesday after a west coast trip. The assistant they promoted runs a completely different offense.',
      options: [
        {
          label: 'Say publicly that this one is on the players', effect: 'Class, room follows you',
          apply: (cc) => { mor(cc, 9); fan(cc, 8); setFlag(cc, 'roomRespect', flag(cc, 'roomRespect') + 1); return 'You stood at the podium and said the coach did not miss those shots. The room saw exactly who you were. Morale +9, fanbase +8.'; },
        },
        {
          label: 'Learn the new system faster than anyone', effect: 'Rating up, new trust',
          apply: (cc) => { rate(cc, 2); hp(cc, -3); mor(cc, 3); return `You had the whole playbook by the All Star break and became the guy he ran everything through. Rating +2 to ${cc.ovr}, morale +3, health -3.`; },
        },
        {
          label: 'Tell the front office they got it wrong', effect: 'Loyal, expensive',
          apply: (cc) => { mor(cc, 6); fan(cc, 5); heat(cc, 5); setFlag(cc, 'frontOfficeFriction', flag(cc, 'frontOfficeFriction') + 1); return 'You said it in a meeting and then again on camera. Morale +6, fanbase +5, and a note in a file you will never see.'; },
        },
      ],
    });
  }

  if (c.ovr >= 80 && c.rings === 0 && yrs >= 3) {
    deck.push({
      id: 'nbaA_superteam_call',
      title: 'Three of them on one call at 11pm',
      body: 'Two All Stars and a Finals MVP have you on speaker. They have already worked out the money. All you have to do is take less and move across the country in July.',
      options: [
        {
          label: 'Take the pay cut and go get a ring', effect: 'Less money, real shot',
          apply: (cc, r) => {
            const nt = otherTeam(cc, r); const was = cc.salary; const cut = Math.max(2.5, money(was * 0.7));
            cc.team = nt; cc.salary = cut; cc.contractYears = 3; cc.fanbase = 46; mor(cc, 14);
            return `You left ${money(was - cut)}M a year on the table to sign with ${nbaTeamLabelOf(nt)} at ${cut}M for three years. Morale +14, fanbase reset to 46, and half the league called you soft for it.`;
          },
        },
        {
          label: 'Tell them to come to you instead', effect: 'Bold, might work',
          apply: (cc, r) => {
            if (r() < 0.4) { rate(cc, 1); mor(cc, 12); fan(cc, 11); return `One of them actually signed with ${nbaTeamLabelOf(cc.team)} in July. Morale +12, fanbase +11, rating +1 to ${cc.ovr}.`; }
            mor(cc, -5); fan(cc, 6); return 'Nobody came, and you spent a year answering questions about a phone call you did not leak. Morale -5, fanbase +6.';
          },
        },
        {
          label: 'Stay and take every dollar', effect: 'Max money, harder road',
          apply: (cc) => { const m = marketOf(cc); cc.salary = m; cc.contractYears = 4; fan(cc, 4); mor(cc, 5); return `You signed for ${m}M a year over four years and told them you would rather beat them. Fanbase +4, morale +5.`; },
        },
      ],
    });
  }

  if (yrs >= 2 && lastPpg >= 16) {
    deck.push({
      id: 'nbaA_iso_system',
      title: 'The offense is just you, over and over',
      body: 'The coach clears a side and everybody watches. You are averaging a career high and the team is 14 games under. The numbers people have a word for what this is and it is not a nice one.',
      options: [
        {
          label: 'Keep eating, the stats are the stats', effect: 'Fame and numbers, losing',
          apply: (cc) => { fan(cc, 11); rate(cc, 1); mor(cc, -5); setFlag(cc, 'emptyStats', 1); return `Twenty eight a night on a lottery team and a highlight package that hides the record. Fanbase +11, rating +1 to ${cc.ovr}, morale -5.`; },
        },
        {
          label: 'Demand the ball moves and take fewer shots', effect: 'Winning, smaller numbers',
          apply: (cc, r) => {
            mor(cc, 8);
            if (r() < 0.6) { fan(cc, 7); rate(cc, 1); return `Your ${bagNoun(cc)} went down and the team won eleven more games. Morale +8, fanbase +7, rating +1 to ${cc.ovr}.`; }
            fan(cc, -4); return 'You gave up six shots a game and the roster was still not good enough. Morale +8, fanbase -4.';
          },
        },
        {
          label: 'Ask out at the deadline instead', effect: 'Fresh start, city stings',
          apply: (cc, r) => {
            const nt = otherTeam(cc, r); cc.team = nt; cc.fanbase = 40; mor(cc, 10);
            return `You told them you would rather win 50 than average 30, and woke up a ${nbaTeamLabelOf(nt)}. Morale +10, fanbase reset to 40.`;
          },
        },
      ],
    });
  }

  if (yrs >= 2 && c.ovr <= 88) {
    deck.push({
      id: 'nbaA_rookie_at_your_spot',
      title: 'They drafted your position in the lottery',
      body: `${nbaTeamLabelOf(c.team)} took a 19 year old ${posNoun(c)} at pick 6. He has your exact build, your exact game and eleven more years of runway. The GM called it depth.`,
      options: [
        {
          label: 'Teach him everything you know', effect: 'Legacy, minutes risk',
          apply: (cc, r) => {
            mor(cc, 9); setFlag(cc, 'roomRespect', flag(cc, 'roomRespect') + 1);
            if (r() < 0.55) { rate(cc, 1); return `Explaining your reads out loud made you better at them. Morale +9, rating +1 to ${cc.ovr}, and you both played.`; }
            return 'You taught him your whole bag and he took nine of your minutes by March. Morale +9, and a strange feeling you could not name.';
          },
        },
        {
          label: 'Bury him in camp and every practice', effect: 'Rating up, room watches',
          apply: (cc) => { rate(cc, 2); hp(cc, -4); mor(cc, 4); return `You went at a teenager every single day until the coaches moved him to the other unit. Rating +2 to ${cc.ovr}, health -4, morale +4.`; },
        },
        {
          label: 'Read the room and ask for a trade now', effect: 'Ahead of it, new city',
          apply: (cc, r) => {
            const nt = otherTeam(cc, r); cc.team = nt; cc.fanbase = 42; mor(cc, 7); hp(cc, 2);
            return `You saw the whole movie and left before the second act. You are a ${nbaTeamLabelOf(nt)} now. Morale +7, fanbase reset to 42.`;
          },
        },
      ],
    });
  }

  if (c.ovr <= 76 && yrs >= 1 && yrs <= 5) {
    deck.push({
      id: 'nbaA_gleague_stint',
      title: 'They want to send you down',
      body: 'A bus league, 3,000 seats, a gym that shares a parking lot with a mattress store, and 35 minutes a night. Or you can stay up here and play nine minutes a week in garbage time.',
      options: [
        {
          label: 'Go down and dominate it', effect: 'Real development',
          apply: (cc) => { rate(cc, 3); mor(cc, -3); fan(cc, -2); return `Twenty six games, 31 a night, and you came back a genuinely different player. Rating +3 to ${cc.ovr}, morale -3, fanbase -2.`; },
        },
        {
          label: 'Refuse and stay on the NBA bench', effect: 'Pride, no reps',
          apply: (cc) => { mor(cc, 4); hp(cc, 4); setFlag(cc, 'frontOfficeFriction', flag(cc, 'frontOfficeFriction') + 1); return 'You said no and spent a year in a warmup jacket. Morale +4, health +4, and a development staff who stopped scheduling you.'; },
        },
        {
          label: 'Go down, and bring your own trainer with you', effect: 'Costs money, best of both',
          apply: (cc) => { bank(cc, -0.1); rate(cc, 2); hp(cc, 5); return `You paid a trainer to live in that city with you for three months. Net worth down 0.1M, rating +2 to ${cc.ovr}, health +5.`; },
        },
      ],
    });
  }

  if (yrs >= 3) {
    deck.push({
      id: 'nbaA_new_system_fit',
      title: 'The new coach wants you off the ball',
      body: 'Nine years of playing one way and a 38 year old with a laptop says you are more valuable in the corner. He has the numbers. You have the muscle memory.',
      options: [
        {
          label: 'Buy in completely for one season', effect: 'Team better, you smaller',
          apply: (cc, r) => {
            mor(cc, -3);
            if (r() < 0.6) { rate(cc, 2); fan(cc, 6); return `It worked. The spacing opened up, you shot a career high, and the team won 49. Rating +2 to ${cc.ovr}, fanbase +6, morale -3.`; }
            rate(cc, -1); mor(cc, -4); return `You stood in a corner for 82 games and touched the ball less than a rookie. Rating -1 to ${cc.ovr}, morale -7 total.`;
          },
        },
        {
          label: 'Fight it and keep your game', effect: 'Rating held, friction',
          apply: (cc) => { rate(cc, 1); mor(cc, 5); setFlag(cc, 'coachFriction', 1); return `You kept doing what has worked since you were 12 and it kept working. Rating +1 to ${cc.ovr}, morale +5, and a coach who talks around you in meetings.`; },
        },
        {
          label: 'Meet him halfway and build a hybrid role', effect: 'Compromise, real gain',
          apply: (cc) => { rate(cc, 1); mor(cc, 7); hp(cc, 2); return `Twelve possessions on the ball, the rest off it, both of you fine with it. Rating +1 to ${cc.ovr}, morale +7, health +2.`; },
        },
      ],
    });
  }

  /* ================================= 6. OFFSEASON ================================= */

  if (yrs >= 1) {
    deck.push({
      id: 'nbaA_pro_am',
      title: 'The Pro Am in August',
      body: 'A high school gym with 900 people crammed inside, a DJ, no defense, and eleven phones filming every possession. A postal worker just crossed you over and the gym has not recovered.',
      options: [
        {
          label: 'Drop 60 and end the entire building', effect: 'Viral, real risk',
          apply: (cc, r) => {
            if (r() < 0.75) { fan(cc, 14); mor(cc, 9); hp(cc, -2); return 'Sixty two points, nine deep threes, and a clip with 30 million views by Monday. Fanbase +14, morale +9, health -2.'; }
            hp(cc, -14); mor(cc, -9); return 'You landed on somebody in a gym with no medical staff in August. Health -14, morale -9, and a summer of rehab you did not need.';
          },
        },
        {
          label: 'Play 12 minutes, sign everything, leave', effect: 'Safe and loved',
          apply: (cc) => { fan(cc, 7); mor(cc, 5); return 'A dunk in warmups, 12 real minutes, and 40 minutes of photos with kids in the parking lot. Fanbase +7, morale +5.'; },
        },
        {
          label: 'Skip it, August is for your knees', effect: 'Boring, correct',
          apply: (cc) => { hp(cc, 9); fan(cc, -4); return 'You watched the highlights from a cold tub in Miami. Health +9, fanbase -4.'; },
        },
      ],
    });
  }

  if (c.fanbase >= 45 && yrs >= 2) {
    deck.push({
      id: 'nbaA_overseas_tour',
      title: 'Eleven days, four countries',
      body: 'A shoe company wants you in Manila, Shanghai, Tokyo and Paris in eleven days. Twelve thousand kids in a mall in Manila. A flight schedule your body has opinions about.',
      options: [
        {
          label: 'Do the whole tour', effect: 'Big money, jet lag',
          apply: (cc) => { paid(cc, 2.2); fan(cc, 13); hp(cc, -7); return 'Eleven days, 26,000 miles, and a mall in Manila that had to close its doors. 2.2M earned, fanbase +13, health -7.'; },
        },
        {
          label: 'Do two cities and add a free clinic in each', effect: 'Less money, more meaning',
          apply: (cc) => { paid(cc, 0.9); fan(cc, 15); mor(cc, 9); hp(cc, -3); return 'Two cities, two free clinics, 600 kids who got shoes. 0.9M earned, fanbase +15, morale +9, health -3.'; },
        },
        {
          label: 'Stay home and train all summer', effect: 'Rating up, no bag',
          apply: (cc) => { rate(cc, 2); hp(cc, 5); fan(cc, -3); return `Ten weeks in the same gym, same time, every day. Rating +2 to ${cc.ovr}, health +5, fanbase -3.`; },
        },
      ],
    });
  }

  if (c.fanbase >= 50 && c.ovr >= 80) {
    deck.push({
      id: 'nbaA_signature_shoe',
      title: 'The signature shoe meeting',
      body: 'A glass room, eleven people, and a table with three prototypes and your logo on all of them. They want to name it after your nickname. The royalty structure is where the actual conversation is.',
      options: [
        {
          label: 'Push for royalties over guaranteed money', effect: 'Upside, real risk',
          apply: (cc, r) => {
            own(cc, 'A signature shoe line');
            if (r() < 0.55) { paid(cc, 6.5); fan(cc, 14); return 'The shoe sold out three colorways in a weekend and the royalty points paid 6.5M in year one. Fanbase +14.'; }
            paid(cc, 1.1); fan(cc, 6); return 'The shoe was fine, the marketing was worse, and points on fine is 1.1M. Fanbase +6.';
          },
        },
        {
          label: 'Take the guaranteed number', effect: 'Safe, capped',
          apply: (cc) => { paid(cc, 3.5); fan(cc, 10); own(cc, 'A signature shoe line'); return 'Three and a half million a year, guaranteed, whatever the shoe does. Fanbase +10.'; },
        },
        {
          label: 'Insist it retails under 100 dollars', effect: 'Less money, real love',
          apply: (cc) => { paid(cc, 2.0); fan(cc, 18); mor(cc, 11); own(cc, 'A shoe every kid can afford'); return 'You gave back two million dollars a year so a kid on your block could buy it with birthday money. 2.0M earned, fanbase +18, morale +11.'; },
        },
      ],
    });
  }

  if (yrs >= 1 && c.age <= 32) {
    deck.push({
      id: 'nbaA_legend_camp',
      title: 'A legend invited you to his summer',
      body: 'A Hall of Famer with five rings runs a two week thing in the mountains for six players. It starts at 5:40am. Nobody has ever described it as fun and everybody who has done it says go.',
      options: [
        {
          label: 'Go and survive all fourteen days', effect: 'Rating and potential',
          apply: (cc) => { rate(cc, 2); cc.pot = Math.min(99, cc.pot + 1); hp(cc, -3); mor(cc, 6); return `Fourteen mornings at 5:40, one very long conversation on a mountain, and something in your footwork that was never there before. Rating +2 to ${cc.ovr}, potential +1, morale +6, health -3.`; },
        },
        {
          label: 'Go for the last week only', effect: 'Half gain, half pain',
          apply: (cc) => { rate(cc, 1); hp(cc, 2); mor(cc, 3); return `Seven days, most of the footwork work, none of the conditioning block. Rating +1 to ${cc.ovr}, health +2, morale +3.`; },
        },
        {
          label: 'Politely decline, you have your own program', effect: 'Rest, missed doorway',
          apply: (cc) => { hp(cc, 7); mor(cc, 3); return 'You rested instead and a decade of knowledge went back into the mountains without you. Health +7, morale +3.'; },
        },
      ],
    });
  }

  if (c.fanbase >= 45) {
    deck.push({
      id: 'nbaA_celebrity_game',
      title: 'The celebrity game wants you as a captain',
      body: 'A comedian, two rappers, a former Olympic sprinter and one actor who is genuinely a hooper. It is on television, it is for charity, and somebody is definitely getting dunked on.',
      options: [
        {
          label: 'Play it completely straight and dominate', effect: 'Funny, fanbase up',
          apply: (cc) => { fan(cc, 10); mor(cc, 5); hp(cc, -1); return 'Fifty two points in a charity game against a comedian in jeans. The internet decided you were a villain and loved it. Fanbase +10, morale +5.'; },
        },
        {
          label: 'Pass every possession and set up the comedians', effect: 'Beloved, no highlights',
          apply: (cc) => { fan(cc, 8); mor(cc, 9); return 'Nineteen assists and a rapper hitting his first ever three on national television. Fanbase +8, morale +9.'; },
        },
        {
          label: 'Skip it and send a real donation instead', effect: 'Money out, quiet good',
          apply: (cc) => { bank(cc, -0.25); mor(cc, 8); fan(cc, 2); return 'You wired 250,000 to the charity and never mentioned it anywhere. Net worth down 0.25M, morale +8, fanbase +2.'; },
        },
      ],
    });
  }

  if (yrs >= 2) {
    deck.push({
      id: 'nbaA_open_run',
      title: 'The 7am run at the college gym',
      body: 'Same eleven guys all summer, no cameras, no refs, and one 24 year old who plays in Europe and is genuinely trying to take your head off every single morning.',
      options: [
        {
          label: 'Show up every morning and out work him', effect: 'Rating up, tired body',
          apply: (cc) => { rate(cc, 2); hp(cc, -3); mor(cc, 6); return `Sixty straight mornings and by August he could not guard you at all. Rating +2 to ${cc.ovr}, morale +6, health -3.`; },
        },
        {
          label: 'Bring him with you, get him a workout', effect: 'Karma, quiet payoff',
          apply: (cc, r) => {
            mor(cc, 8);
            if (r() < 0.5) { rate(cc, 1); return `You got him in front of your front office and he made a two way deal. Morale +8, rating +1 to ${cc.ovr}, and a guy who will run through a wall for you.`; }
            return 'He did not make the roster but he called you every year after that just to say thank you. Morale +8.';
          },
        },
        {
          label: 'Move your workouts to a private gym', effect: 'Health up, less edge',
          apply: (cc) => { bank(cc, -0.06); hp(cc, 8); mor(cc, 1); return 'A private facility, a trainer, and a gym where nobody was trying to hurt you at 7am. Net worth down 0.06M, health +8, morale +1.'; },
        },
      ],
    });
  }

  /* ============================== 7. EVERYDAY MONEY ============================== */

  if (yrs >= 2) {
    deck.push({
      id: 'nbaA_shoe_renewal',
      title: 'The shoe deal is up',
      body: 'Your rookie deal expires in July. The brand you have worn since college offers a modest bump. A challenger with no roster and a lot of money offers nearly triple and total creative control.',
      options: [
        {
          label: 'Re-sign with the brand you grew up in', effect: 'Loyalty, less money',
          apply: (cc) => { paid(cc, 2.0); fan(cc, 9); mor(cc, 6); own(cc, 'A long term shoe deal'); return 'Same three letters on your feet as the poster on your childhood wall. 2.0M a year, fanbase +9, morale +6.'; },
        },
        {
          label: 'Take the challenger money and the control', effect: 'Big bag, unknown shoe',
          apply: (cc, r) => {
            paid(cc, 5.5); own(cc, 'A challenger brand deal');
            if (r() < 0.5) { fan(cc, 10); return 'Five and a half million a year and a shoe you actually designed that people actually bought. Fanbase +10.'; }
            fan(cc, -3); mor(cc, -3); return 'Five and a half million a year and a shoe nobody could find in a store. Fanbase -3, morale -3.';
          },
        },
        {
          label: 'Stay unsigned and wear whatever feels best', effect: 'No bag, best feet',
          apply: (cc) => { hp(cc, 6); mor(cc, 7); rate(cc, 1); return `Black tape over every logo, a different shoe every night, and ankles that finally stopped complaining. Health +6, morale +7, rating +1 to ${cc.ovr}.`; },
        },
      ],
    });
  }

  if (c.fanbase >= 40) {
    deck.push({
      id: 'nbaA_card_show',
      title: 'The card show',
      body: 'A convention center, a folding table, 1,400 autographs in four hours, and a man in line who very much wants you to sign a photograph of a completely different player.',
      options: [
        {
          label: 'Do the full four hours', effect: 'Money, dead hand',
          apply: (cc) => { paid(cc, 0.12); fan(cc, 5); mor(cc, -2); hp(cc, -1); return 'Fourteen hundred signatures and a wrist that did not work right until Wednesday. 0.12M earned, fanbase +5, morale -2.'; },
        },
        {
          label: 'Two paid hours, then free photos with every kid', effect: 'Less money, more love',
          apply: (cc) => { paid(cc, 0.06); fan(cc, 13); mor(cc, 7); return 'You cut the session in half and stayed an extra hour taking free pictures. 0.06M earned, fanbase +13, morale +7.'; },
        },
        {
          label: 'Pass and go to the gym', effect: 'Rating and rest',
          apply: (cc) => { rate(cc, 1); hp(cc, 4); return `You skipped the folding chair and got 500 shots up instead. Rating +1 to ${cc.ovr}, health +4.`; },
        },
      ],
    });
  }

  if (worth >= 1.5 || c.earnings >= 8) {
    deck.push({
      id: 'nbaA_mom_house',
      title: 'The house for your mother',
      body: 'She still does doubles at the same job and still tells you she is fine. You have the money now. She has very firm opinions about which street and none at all about the kitchen.',
      options: [
        {
          label: 'Buy the exact house she picked, no arguments', effect: 'Money out, morale way up',
          apply: (cc) => { bank(cc, -1.4); mor(cc, 19); fan(cc, 7); own(cc, "Mom's house"); return 'You put the keys in her hand in the driveway and she sat down on the step and did not speak for a full minute. Net worth down 1.4M, morale +19, fanbase +7.'; },
        },
        {
          label: 'Buy it and pay her to never work again', effect: 'Bigger money, bigger moment',
          apply: (cc) => { bank(cc, -2.2); mor(cc, 22); fan(cc, 9); own(cc, "Mom's house and a monthly transfer"); return 'House, car, and a transfer on the first of every month that meant she gave notice after 29 years. Net worth down 2.2M, morale +22, fanbase +9.'; },
        },
        {
          label: 'Set up a trust and let her choose in her own time', effect: 'Smart money',
          apply: (cc) => { bank(cc, -0.3); mor(cc, 11); own(cc, 'A family trust'); return 'A lawyer, a trust, and a plan that grew 0.4M before she ever picked a street. Net worth down 0.3M after growth, morale +11.'; },
        },
      ],
    });
  }

  if (yrs >= 2 && (worth >= 1 || c.earnings >= 5)) {
    deck.push({
      id: 'nbaA_teammate_loan',
      title: 'He needs 300,000 and will not say why',
      body: 'A guy on a two way deal you came up with in AAU is sitting in your kitchen at midnight. He has never asked you for a dollar in eight years. His hands will not stay still.',
      options: [
        {
          label: 'Give it to him and call it a gift', effect: 'Money gone, brother kept',
          apply: (cc) => { bank(cc, -0.3); mor(cc, 12); setFlag(cc, 'gaveGift', flag(cc, 'gaveGift') + 1); return 'You wrote the word gift on the memo line so he could never carry it as a debt. Net worth down 0.3M, morale +12.'; },
        },
        {
          label: 'Lend it with a real written agreement', effect: 'Business, some tension',
          apply: (cc, r) => {
            bank(cc, -0.3);
            if (r() < 0.6) { bank(cc, 0.3); mor(cc, 6); return 'He paid back every cent inside 18 months and framed the signed page. Net worth back to even, morale +6.'; }
            mor(cc, -8); return 'He never paid it and he stopped picking up, which cost a lot more than 300,000. Net worth down 0.3M, morale -8.';
          },
        },
        {
          label: 'Say no, then fix the actual problem', effect: 'Money kept, harder conversation',
          apply: (cc) => { bank(cc, -0.05); mor(cc, 3); return 'You said no to the cash and paid for a financial advisor and a lawyer for him instead. Net worth down 0.05M, morale +3, and one very long silence in your kitchen.'; },
        },
      ],
    });
  }

  if (worth >= 2 || c.earnings >= 12) {
    deck.push({
      id: 'nbaA_car_collection',
      title: 'The garage is getting out of hand',
      body: 'Four cars, one of which you have driven twice. A dealer in Miami keeps sending videos at 1am and a teammate just bought something with doors that go up.',
      options: [
        {
          label: 'Buy the one with the doors', effect: 'Money out, pure joy',
          apply: (cc) => { bank(cc, -0.9); mor(cc, 11); fan(cc, 6); own(cc, 'A car with doors that go up'); return 'Nine hundred thousand dollars of car and a parking garage video with two million views. Net worth down 0.9M, morale +11, fanbase +6.'; },
        },
        {
          label: 'Sell three of them and buy one apartment building', effect: 'Boring, grows',
          apply: (cc, r) => {
            bank(cc, 0.4); own(cc, 'An apartment building');
            if (r() < 0.7) { bank(cc, 1.6); mor(cc, 5); return 'Three cars became 22 units that paid you every month for the rest of your life. Net worth up 2.0M, morale +5.'; }
            bank(cc, -0.5); mor(cc, -3); return 'Three cars became a roof problem, a boiler problem and a very long year. Net worth down 0.1M, morale -3.';
          },
        },
        {
          label: 'Keep the truck you drove in high school and nothing else', effect: 'Cheap, grounded',
          apply: (cc) => { bank(cc, 0.6); mor(cc, 9); fan(cc, 8); return 'You sold three cars, kept the 2009 truck with 190,000 miles, and drove it to every home game. Net worth up 0.6M, morale +9, fanbase +8.'; },
        },
      ],
    });
  }

  return deck;
}
