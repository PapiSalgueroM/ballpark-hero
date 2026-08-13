/*
   mlbCareerLifeA.ts, MLB My Career life deck A (Round 58)

   Owner brief: "everything BitLife has, ten times better and more out of
   pocket, at least 200 new additions". This file is 45 of them, the human
   half of a baseball life. The bus leagues and the call up, a clubhouse that
   writes its own laws, the media machine, an arm and a back that keep a
   private diary, 162 games in 187 days, the sport's beautiful nonsense, and
   the everyday money that arrives long before the nine figure deal does.

   Same self gating contract as the NFL and NBA life decks: an event only
   lands in the returned array when its conditions hold, so drawMlbEvent needs
   no extra eligibility rules. Every id is prefixed mlbA_ so it stays unique
   across the other MLB life files.

   apply() MUTATES the career and RETURNS the log line the player reads.

   Nothing imported is evaluated at module scope. mlbMyCareer.ts imports this
   file, so any top level use of an imported value is a circular import crash
   on page load. That bug shipped here once. Imported values are only ever
   touched inside functions.
*/
import type { MlbCareerState, MlbCareerEvent } from './mlbMyCareer';
import { mlbTeamLabelOf } from './mlbMyCareer';

/* Round 58 optional fields. Declared locally so this file compiles against
   old and new versions of MlbCareerState alike, and so every read guards
   with ?? 0 the way the save format requires. */
type LifeExtras = {
  netWorth?: number;
  dirtyMoney?: number;
  heat?: number;
  purchased?: string[];
  lifeFlags?: Record<string, number>;
};
type LifeState = MlbCareerState & LifeExtras;
const L = (c: MlbCareerState): LifeState => c as LifeState;

const flag = (c: MlbCareerState, k: string): number => (L(c).lifeFlags || {})[k] || 0;
const setFlag = (c: MlbCareerState, k: string, v: number) => { L(c).lifeFlags = { ...(L(c).lifeFlags || {}), [k]: v }; };
const bump = (c: MlbCareerState, k: string) => setFlag(c, k, flag(c, k) + 1);

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const mor = (c: MlbCareerState, d: number) => { c.morale = clamp(c.morale + d, 0, 100); };
const fan = (c: MlbCareerState, d: number) => { c.fanbase = clamp(c.fanbase + d, 0, 100); };
const hp = (c: MlbCareerState, d: number) => { c.health = clamp(c.health + d, 0, 100); };
const rate = (c: MlbCareerState, d: number) => { c.ovr = clamp(Math.min(c.pot + 1, c.ovr + d), 50, 99); };

/** Net worth only, for spending and investment returns. */
const bank = (c: MlbCareerState, d: number): number => {
  const s = L(c);
  s.netWorth = Math.round(((s.netWorth ?? 0) + d) * 100) / 100;
  return s.netWorth;
};
/** Money you actually earned: hits career earnings and net worth. */
const paid = (c: MlbCareerState, m: number): number => {
  c.earnings = Math.round((c.earnings + m) * 100) / 100;
  return bank(c, m);
};
const own = (c: MlbCareerState, item: string) => { const s = L(c); s.purchased = [...(s.purchased ?? []), item]; };

const posNoun = (c: MlbCareerState): string =>
  c.pos === 'SP' ? 'starter' : c.pos === 'CF' ? 'center fielder' : c.pos === 'SS' ? 'shortstop' : 'first baseman';
const soreSpot = (c: MlbCareerState): string =>
  c.pos === 'SP' ? 'elbow' : c.pos === 'CF' ? 'hamstring' : c.pos === 'SS' ? 'throwing shoulder' : 'lower back';

export function getMlbLifeEventsA(c: MlbCareerState, rng: () => number): MlbCareerEvent[] {
  const deck: MlbCareerEvent[] = [];
  const yrs = c.seasons.length;
  const last = c.seasons[yrs - 1];
  const missedOct = !!last && last.teamResult === 'Missed October';
  const madeOct = !!last && last.teamResult !== 'Missed October';
  const worth = L(c).netWorth ?? 0;
  const isSp = c.pos === 'SP';

  /* ========================= 1. THE MINORS AND THE CALL UP ========================= */

  if (yrs === 0) {
    deck.push({
      id: 'mlbA_bus_league',
      title: 'Nine hours to Bowling Green',
      body: 'Low A is a 3am bus, a per diem that does not cover breakfast, and a motel with one working ice machine. Two guys from your draft class quit in June.',
      options: [
        {
          label: 'Extra cage work at every single stop', effect: 'Rating up, no sleep',
          apply: (cc) => { rate(cc, 2); hp(cc, -4); mor(cc, -2); return `You hit off a tee in eleven parking lots. Rating +2 to ${cc.ovr}, health -4, morale -2.`; },
        },
        {
          label: 'Eat right, sleep, survive the year', effect: 'Body first',
          apply: (cc) => { hp(cc, 9); mor(cc, 5); return 'You treated the bus as a bed and August as the real test. Health +9, morale +5.'; },
        },
        {
          label: 'Buy the whole bus dinner every Sunday', effect: 'Room love, money out',
          apply: (cc) => { bank(cc, -0.02); mor(cc, 11); bump(cc, 'roomRespect'); return 'Twenty two guys on 1,100 dollars a month ate real food once a week on your card. Net worth down 0.02M, morale +11.'; },
        },
      ],
    });
  }

  if (yrs === 0) {
    deck.push({
      id: 'mlbA_september_callup',
      title: 'They said your name in September',
      body: `Rosters expand and the Triple A manager asks you to stay behind after batting practice. Ninety minutes later you are on a flight to ${mlbTeamLabelOf(c.team)}.`,
      options: [
        {
          label: 'Fly the whole family out on your dime', effect: 'Money out, moment kept',
          apply: (cc) => { bank(cc, -0.03); mor(cc, 15); fan(cc, 6); return 'Fourteen people in the second deck, all of them crying before the anthem finished. Net worth down 0.03M, morale +15, fanbase +6.'; },
        },
        {
          label: 'Tell nobody until you are in a lineup', effect: 'Quiet and focused',
          apply: (cc) => { rate(cc, 1); mor(cc, 7); return `You did not post a thing and showed up early for three straight weeks. Rating +1 to ${cc.ovr}, morale +7.`; },
        },
        {
          label: 'Post the phone call video everywhere', effect: 'Fame, one raised eyebrow',
          apply: (cc) => { fan(cc, 12); mor(cc, 6); return 'Nine million views of you dropping the phone in a hotel hallway. Fanbase +12, morale +6, and one veteran said the word rookie very slowly.'; },
        },
      ],
    });
  }

  if (yrs <= 1) {
    deck.push({
      id: 'mlbA_debut',
      title: isSp ? 'First big league start' : 'First big league at bat',
      body: isSp
        ? 'Fifty thousand people, a mound that feels three feet higher than the one in Toledo, and a leadoff hitter with 1,900 career hits digging in.'
        : 'Fifty thousand people, a 98 at the letters, and your entire family somewhere behind the dugout screaming a name you can actually hear.',
      options: [
        {
          label: isSp ? 'First pitch fastball, right at him' : 'Swing at the first thing you see', effect: 'Aggressive and honest',
          apply: (cc, r) => {
            fan(cc, 6);
            if (r() < 0.55) { rate(cc, 1); mor(cc, 12); return `${cc.pos === 'SP' ? 'Six innings, one run, and the ball in your locker after.' : 'A double off the wall on pitch one, and the ball in your locker after.'} Rating +1 to ${cc.ovr}, morale +12, fanbase +6.`; }
            mor(cc, 4); return 'It did not go well and you got a standing ovation walking off anyway. Morale +4, fanbase +6, and a story you will tell for 40 years.';
          },
        },
        {
          label: 'Slow it down, take it all in', effect: 'Calm, small edge',
          apply: (cc) => { rate(cc, 1); mor(cc, 8); hp(cc, 2); return `You stepped off, looked at the whole thing once, and then went to work. Rating +1 to ${cc.ovr}, morale +8, health +2.`; },
        },
        {
          label: 'Pretend it is just another game', effect: 'Pro from day one',
          apply: (cc) => { rate(cc, 2); mor(cc, 2); fan(cc, -2); return `Same routine, same headphones, zero acknowledgment that anything was different. Rating +2 to ${cc.ovr}, morale +2, fanbase -2.`; },
        },
      ],
    });
  }

  if (yrs >= 1 && yrs <= 3 && c.ovr < 78) {
    deck.push({
      id: 'mlbA_optioned_back',
      title: 'Optioned. Again.',
      body: 'They needed a fresh bullpen arm so you are the roster move, for the third time this season. Triple A is four hours by bus and one hamstring away.',
      options: [
        {
          label: 'Destroy Triple A until they cannot ignore you', effect: 'Rating up, morale down',
          apply: (cc) => { rate(cc, 2); mor(cc, -5); return `You put up video game numbers against pitchers who will never see a big league mound. Rating +2 to ${cc.ovr}, morale -5.`; },
        },
        {
          label: 'Ask the front office for a straight answer', effect: 'Clarity, maybe friction',
          apply: (cc, r) => {
            if (r() < 0.5) { mor(cc, 10); return 'The GM gave you an actual plan with actual dates and then honored it in six weeks. Morale +10.'; }
            mor(cc, -6); bump(cc, 'fofriction'); return 'You got 20 minutes of words that meant nothing and a note in a file somewhere. Morale -6.';
          },
        },
        {
          label: 'Treat it as a paid reset and heal', effect: 'Health first',
          apply: (cc) => { hp(cc, 10); mor(cc, 3); return 'Six weeks of sleep, real meals, and a body that stopped hurting for the first time since March. Health +10, morale +3.'; },
        },
      ],
    });
  }

  if (yrs >= 1 && yrs <= 6 && c.age <= 28) {
    deck.push({
      id: 'mlbA_old_head',
      title: 'The 38 year old adopts you',
      body: `A ${posNoun(c)} at the very end of the line started saving you the seat next to him on every flight. He wants you in the cage at 1pm for a 7:05 game. He has never once been late.`,
      options: [
        {
          label: '1pm every day, no exceptions', effect: 'Rating up, sleep gone',
          apply: (cc) => { rate(cc, 2); mor(cc, 6); hp(cc, -3); return `Eight months of early work with a man who gave away everything he knew and asked for nothing. Rating +2 to ${cc.ovr}, morale +6, health -3.`; },
        },
        {
          label: 'Take the notes, keep your own clock', effect: 'Some gain, own routine',
          apply: (cc) => { rate(cc, 1); hp(cc, 4); return `You took the good stuff and slept in on day games after nights. Rating +1 to ${cc.ovr}, health +4. He noticed and said nothing, which was worse.`; },
        },
        {
          label: 'Politely dodge him all season', effect: 'Rest, missed shortcut',
          apply: (cc) => { hp(cc, 7); mor(cc, 2); return 'You rested instead. Your body thanked you and eighteen years of knowledge retired to Arizona in October. Health +7, morale +2.'; },
        },
      ],
    });
  }

  if (yrs >= 1 && yrs <= 4 && c.ovr < 80) {
    deck.push({
      id: 'mlbA_forty_man',
      title: 'The 40 man squeeze',
      body: 'They need your roster spot for a reliever with options left. Your agent says the words designated for assignment out loud, to you, for the first time.',
      options: [
        {
          label: 'Accept the outright, stay in the org', effect: 'Safe, quietly stings',
          apply: (cc) => { mor(cc, -5); hp(cc, 5); bump(cc, 'outrighted'); return 'You cleared waivers, kept your locker in Triple A, and got called back up on June 2. Morale -5, health +5.'; },
        },
        {
          label: 'Refuse it and take your chances on waivers', effect: 'Gamble on yourself',
          apply: (cc, r) => {
            if (r() < 0.5) { mor(cc, 9); fan(cc, 4); return 'A rebuilding club claimed you inside 48 hours and handed you 400 plate appearances. Morale +9, fanbase +4.'; }
            mor(cc, -9); return 'Nobody claimed you. You signed a minor league deal with a spring invite and a very long winter. Morale -9.';
          },
        },
      ],
    });
  }

  /* ================================ 2. THE CLUBHOUSE ================================ */

  if (yrs <= 1) {
    deck.push({
      id: 'mlbA_rookie_hazing',
      title: 'The dress up flight',
      body: 'Last road trip of the year, and your locker contains a costume selected by eleven veterans specifically to end you. There is always a photographer at the gate.',
      options: [
        {
          label: 'Wear it proudly through the whole terminal', effect: 'Room love, zero ego',
          apply: (cc) => { mor(cc, 9); fan(cc, 8); bump(cc, 'roomRespect'); return 'You did a full runway walk at gate C14 and the clubhouse decided you were one of them by Tuesday. Morale +9, fanbase +8.'; },
        },
        {
          label: 'Wear it and out-commit every other rookie', effect: 'Legend status',
          apply: (cc) => { mor(cc, 12); fan(cc, 11); bank(cc, -0.01); return 'You bought accessories. With your own money. The photo is still the pinned post on the team account. Morale +12, fanbase +11, net worth down 0.01M.'; },
        },
        {
          label: 'Refuse the whole thing', effect: 'Dignity, cold room',
          apply: (cc) => { mor(cc, -8); rate(cc, 1); return `You walked on in a plain hoodie and nobody said a word to you for three days. Morale -8, rating +1 to ${cc.ovr} from a very quiet winter.`; },
        },
      ],
    });
  }

  if (yrs >= 1) {
    deck.push({
      id: 'mlbA_kangaroo_court',
      title: 'Kangaroo court',
      body: 'The clubhouse has a judge, a gavel from a thrift store, and a fine schedule taped inside a locker. Missing a sign is 50. Getting quoted in the paper is 200.',
      options: [
        {
          label: 'Pay every fine instantly and smile', effect: 'Room love, small bleed',
          apply: (cc) => { bank(cc, -0.01); mor(cc, 8); bump(cc, 'roomRespect'); return 'You paid 9,400 dollars in fake fines across a season and never once appealed. Net worth down 0.01M, morale +8.'; },
        },
        {
          label: 'Appeal loudly, become the entertainment', effect: 'Comedy, mixed results',
          apply: (cc, r) => {
            if (r() < 0.6) { mor(cc, 11); fan(cc, 5); return 'Your defense of a missed cutoff man got a standing ovation and the fine doubled anyway. Morale +11, fanbase +5.'; }
            mor(cc, -4); return 'You argued a 50 dollar fine for nine minutes and the room turned on you in real time. Morale -4.';
          },
        },
        {
          label: 'Take over as the judge yourself', effect: 'Power, some enemies',
          apply: (cc) => { mor(cc, 6); bump(cc, 'clubhouseJudge'); return 'You ran the court, tripled the pot, and gave all 41,000 dollars of it to the clubhouse attendants in September. Morale +6.'; },
        },
      ],
    });
  }

  if (isSp && yrs >= 1) {
    deck.push({
      id: 'mlbA_catcher_shakeoff',
      title: 'He keeps putting down two',
      body: 'Your catcher has called the same breaking ball in the same count for three straight starts and the league is sitting on it. He has caught 1,200 big league games. You have made nine starts.',
      options: [
        {
          label: 'Shake him off every single time', effect: 'Your game, your arm',
          apply: (cc, r) => {
            if (r() < 0.5) { rate(cc, 2); mor(cc, 6); return `You threw your best pitch in your worst counts and it worked. Rating +2 to ${cc.ovr}, morale +6.`; }
            mor(cc, -6); rate(cc, -1); return `Two crooked innings later he stopped putting down anything at all and just let you pick. Rating -1 to ${cc.ovr}, morale -6.`;
          },
        },
        {
          label: 'Throw whatever he calls, talk after', effect: 'Trust, slower fix',
          apply: (cc) => { mor(cc, 5); hp(cc, 2); bump(cc, 'batteryTrust'); return 'You went 33 straight starts without a shake and he learned you inside a month. Morale +5, health +2.'; },
        },
        {
          label: 'Bring the numbers to the pitching coach', effect: 'Third party fix',
          apply: (cc) => { rate(cc, 1); mor(cc, 2); return `A 20 minute video meeting solved a problem that a shouting match would not have. Rating +1 to ${cc.ovr}, morale +2.`; },
        },
      ],
    });
  }

  if (yrs >= 1) {
    deck.push({
      id: 'mlbA_manager_analytics',
      title: 'The manager who hates the iPad',
      body: 'Your manager calls the analytics department the laptop guys, and says it in a tone. They have a 14 page plan for you. He has a gut feeling and a lineup card.',
      options: [
        {
          label: 'Run the 14 page plan quietly', effect: 'Rating up, chilly manager',
          apply: (cc) => { rate(cc, 2); mor(cc, -3); return `Different counts, different targets, better results, and a manager who stopped saying good morning. Rating +2 to ${cc.ovr}, morale -3.`; },
        },
        {
          label: 'Do it his way, all season', effect: 'Trust, less edge',
          apply: (cc) => { mor(cc, 8); bump(cc, 'skipperLove'); return 'You did it exactly how a 61 year old man told you to and he wrote your name in the two hole for 140 straight games. Morale +8.'; },
        },
        {
          label: 'Get both of them in one room', effect: 'Broker a truce',
          apply: (cc, r) => {
            if (r() < 0.6) { rate(cc, 1); mor(cc, 9); return `Ninety minutes, one whiteboard, and a plan they both signed off on. Rating +1 to ${cc.ovr}, morale +9.`; }
            mor(cc, -3); return 'They argued about defensive positioning for an hour and you learned two new words. Morale -3.';
          },
        },
      ],
    });
  }

  if (yrs >= 2) {
    deck.push({
      id: 'mlbA_slumping_teammate',
      title: '0 for 34',
      body: 'Your closest friend on the team has not had a hit in twelve days. He has started taking his bag to the far tunnel so nobody sees his face after.',
      options: [
        {
          label: 'Drag him to early work every morning', effect: 'Both of you sharper',
          apply: (cc) => { rate(cc, 1); mor(cc, 9); hp(cc, -2); return `Thirty one straight mornings at 9am. He went 14 for 38 in July. Rating +1 to ${cc.ovr}, morale +9, health -2.`; },
        },
        {
          label: 'Take him fishing and never mention baseball', effect: 'Human, no numbers',
          apply: (cc) => { mor(cc, 12); hp(cc, 4); bump(cc, 'roomRespect'); return 'Two off days, one boat, zero baseball talk. He homered on the Tuesday. Morale +12, health +4.'; },
        },
        {
          label: 'Leave him alone, it is his to solve', effect: 'Focus kept',
          apply: (cc) => { rate(cc, 2); mor(cc, -4); return `You went to work on yourself instead and had the best six weeks of your career. Rating +2 to ${cc.ovr}, morale -4.`; },
        },
      ],
    });
  }

  if (yrs >= 1) {
    deck.push({
      id: 'mlbA_aux_cord',
      title: 'The aux cord war',
      body: 'Two grown men with violently different taste in music are one more song away from a real problem. Somebody handed you the aux and left the room immediately.',
      options: [
        {
          label: 'Play only what the veterans want', effect: 'Safe, no credit',
          apply: (cc) => { mor(cc, 4); return 'Four hours of music that was popular when you were seven. Morale +4, and total peace.'; },
        },
        {
          label: 'Write a rotation everyone hates equally', effect: 'Fair, unpopular',
          apply: (cc) => { mor(cc, 7); bump(cc, 'clubhouseJudge'); return 'A laminated schedule on the wall. Every man got 25 minutes. Nobody was happy and nobody fought. Morale +7.'; },
        },
        {
          label: 'Play your own stuff at full volume', effect: 'Bold, could go either way',
          apply: (cc, r) => {
            if (r() < 0.5) { mor(cc, 10); fan(cc, 5); return 'The whole clubhouse learned every word by June and it became the team playlist. Morale +10, fanbase +5.'; }
            mor(cc, -5); return 'A 34 year old reliever unplugged the speaker at the wall and nobody plugged it back in. Morale -5.';
          },
        },
      ],
    });
  }

  if (yrs >= 1) {
    deck.push({
      id: 'mlbA_flight_cards',
      title: 'The card game on the charter',
      body: 'The stakes on the back of the plane have quietly climbed from a hundred dollars to a used car. A rookie just lost his entire month of per diem on one hand.',
      options: [
        {
          label: 'Sit in and play for real', effect: 'Real money either way',
          apply: (cc, r) => {
            if (r() < 0.5) { paid(cc, 0.06); mor(cc, 7); return 'You won 60,000 dollars over a season of red eyes and never mentioned it once. 0.06M earned, morale +7.'; }
            bank(cc, -0.07); mor(cc, -3); return 'You lost 70,000 dollars to a bullpen catcher who counts cards. Net worth down 0.07M, morale -3.';
          },
        },
        {
          label: 'Play, but only for singles', effect: 'In the group, safe',
          apply: (cc) => { mor(cc, 6); bump(cc, 'roomRespect'); return 'You sat in every flight, laughed at everything, and lost 340 dollars total across 81 road games. Morale +6.'; },
        },
        {
          label: 'Quietly cover the rookie and go read', effect: 'Money out, real respect',
          apply: (cc) => { bank(cc, -0.02); mor(cc, 10); bump(cc, 'roomRespect'); return 'You slid him his money back in an envelope and told him to never sit at that table again. Net worth down 0.02M, morale +10.'; },
        },
      ],
    });
  }

  /* ================================ 3. MEDIA AND FAME ================================ */

  if (!isSp && yrs >= 1) {
    deck.push({
      id: 'mlbA_bat_flip',
      title: 'The bat flip heard in two dugouts',
      body: 'You hit it 442 feet and let the bat go roughly as high as it will go. The other dugout emptied its opinions instantly. Their closer throws 101 and has a long memory.',
      options: [
        {
          label: 'Do it again next time, higher', effect: 'War, and everyone watches',
          apply: (cc) => { fan(cc, 14); mor(cc, 7); hp(cc, -4); setFlag(cc, 'batFlipWar', 1); return 'Three flips, two hit batters, one benches clearing shove fest, and the highest rated series of their season. Fanbase +14, morale +7, health -4.'; },
        },
        {
          label: 'Apologize like a professional', effect: 'Peace, small dip',
          apply: (cc) => { fan(cc, -3); mor(cc, 3); hp(cc, 3); return 'You called their veteran catcher, said the right thing, and never wore one in the ribs. Fanbase -3, morale +3, health +3.'; },
        },
        {
          label: 'Say nothing at all, ever', effect: 'Mystery, slow burn',
          apply: (cc) => { fan(cc, 7); mor(cc, 5); return 'Forty reporters, one shrug, zero quotes. The clip aged into a poster. Fanbase +7, morale +5.'; },
        },
      ],
    });
  }

  if (yrs >= 1) {
    deck.push({
      id: 'mlbA_radio_hit',
      title: 'The 7am radio hit',
      body: 'You did a phone interview half asleep and used the phrase this city expects way too much. By noon it was a graphic on every local show.',
      options: [
        {
          label: 'Own it on camera before batting practice', effect: 'Honest, wins them back',
          apply: (cc) => { fan(cc, 9); mor(cc, -2); return `You stood at a locker and said you were wrong and half asleep. ${mlbTeamLabelOf(cc.team)} fans respect exactly one thing and that is it. Fanbase +9, morale -2.`; },
        },
        {
          label: 'Double down, you meant it', effect: 'War with the city',
          apply: (cc) => { fan(cc, -12); mor(cc, 8); setFlag(cc, 'cityWar', 1); return 'You said it again, slower, into a better microphone. Fanbase -12, morale +8, and a very long homestand in June.'; },
        },
        {
          label: 'Let your agent kill all media for a month', effect: 'Quiet, small chill',
          apply: (cc) => { fan(cc, -4); mor(cc, 5); rate(cc, 1); return `No availability, no radio, no problems, and the best month of at bats you had all year. Fanbase -4, morale +5, rating +1 to ${cc.ovr}.`; },
        },
      ],
    });
  }

  deck.push({
    id: 'mlbA_dugout_viral',
    title: 'The dugout camera caught it',
    body: 'A slow motion clip of your face reacting to either a called strike or a sunflower seed has 40 million views and a caption you did not write.',
    options: [
      {
        label: 'Lean all the way in, sell the shirt', effect: 'Money and fame',
        apply: (cc) => { paid(cc, 0.12); fan(cc, 12); mor(cc, 5); own(cc, 'Viral face t-shirt'); return 'Nine thousand shirts with your own face on them, and every dollar past cost went to the clubhouse staff. 0.12M earned, fanbase +12, morale +5.'; },
      },
      {
        label: 'Explain it very seriously in a presser', effect: 'Worse, somehow',
        apply: (cc) => { fan(cc, 6); mor(cc, -3); return 'Four minutes of sincere explanation became a second clip with 60 million views. Fanbase +6, morale -3.'; },
      },
      {
        label: 'Never acknowledge it exists', effect: 'Peace and focus',
        apply: (cc) => { rate(cc, 1); mor(cc, 6); fan(cc, -3); return `Phone in the bag, apps off the home screen, one very boring and very productive month. Rating +1 to ${cc.ovr}, morale +6, fanbase -3.`; },
      },
    ],
  });

  if (yrs >= 2 && c.fanbase >= 40) {
    deck.push({
      id: 'mlbA_doc_crew',
      title: 'The documentary crew',
      body: 'A streaming service wants a camera on you for a full season, including the training room, the tunnel and the drive home. The check is real and so is the access.',
      options: [
        {
          label: 'Full access, no restrictions', effect: 'Big bag, room uneasy',
          apply: (cc) => { paid(cc, 1.4); fan(cc, 15); mor(cc, -6); own(cc, 'Season long documentary'); return 'They filmed a slump, a 6am flight and one argument you wish they had not. 1.4M earned, fanbase +15, morale -6.'; },
        },
        {
          label: 'Access with a veto on the final cut', effect: 'Less money, control',
          apply: (cc) => { paid(cc, 0.6); fan(cc, 9); mor(cc, 3); own(cc, 'Documentary with final cut'); return 'You cut four minutes and kept a friendship. 0.6M earned, fanbase +9, morale +3.'; },
        },
        {
          label: 'No cameras, the season is yours', effect: 'Private, sharper',
          apply: (cc) => { rate(cc, 1); mor(cc, 9); return `You said no to 1.4M and nobody filmed a single bad night. Rating +1 to ${cc.ovr}, morale +9.`; },
        },
      ],
    });
  }

  if (yrs >= 2 && c.ovr >= 79 && c.allStars === 0) {
    deck.push({
      id: 'mlbA_allstar_snub',
      title: 'Left off the All Star team',
      body: 'You are top five in the league in every number that matters. The reserve list came out without your name on it. A beat writer shows you the roster on his phone at your locker.',
      options: [
        {
          label: 'Say out loud that it is a joke', effect: 'Fanbase up, office annoyed',
          apply: (cc) => { fan(cc, 11); mor(cc, 7); bump(cc, 'fofriction'); return 'You listed your numbers next to the guy who got picked. The clip ran for two days. Fanbase +11, morale +7.'; },
        },
        {
          label: 'Take the high road and say nothing', effect: 'Class, quiet burn',
          apply: (cc) => { fan(cc, 5); mor(cc, -4); rate(cc, 1); return `You congratulated the guy who took your spot and hit .341 after the break. Fanbase +5, morale -4, rating +1 to ${cc.ovr}.`; },
        },
        {
          label: 'Use all four days off completely', effect: 'Health, no noise',
          apply: (cc) => { hp(cc, 11); mor(cc, 5); return 'Four days with no bat, no phone and no baseball. Health +11, morale +5, and a second half nobody could snub.'; },
        },
      ],
    });
  }

  if (yrs >= 1 && c.fanbase >= 38) {
    deck.push({
      id: 'mlbA_miked_up',
      title: 'Wired for Sunday night',
      body: `National TV wants a microphone in your jersey for three hours. Everything you say to the ${isSp ? 'catcher' : 'shortstop'} goes out to four million people live.`,
      options: [
        {
          label: 'Be yourself and let it fly', effect: 'Beloved, mildly expensive',
          apply: (cc, r) => {
            fan(cc, 12); mor(cc, 6);
            if (r() < 0.4) { bank(cc, -0.01); return 'Broadcast had to dump audio twice and the league sent a letter with a 10,000 dollar number in it. Fanbase +12, morale +6, net worth down 0.01M.'; }
            return 'Three hours of genuinely funny baseball talk and a permanent invitation back. Fanbase +12, morale +6.';
          },
        },
        {
          label: 'Charming, careful, quotable', effect: 'Clean and likeable',
          apply: (cc) => { fan(cc, 7); mor(cc, 3); return 'You explained pitch sequencing to America without saying a single word you would regret. Fanbase +7, morale +3.'; },
        },
        {
          label: 'Turn it down', effect: 'Focus over reach',
          apply: (cc) => { rate(cc, 1); mor(cc, 4); fan(cc, -3); return `No wire, no distraction, seven shutout innings of your own. Rating +1 to ${cc.ovr}, morale +4, fanbase -3.`; },
        },
      ],
    });
  }

  if (c.fanbase >= 48) {
    deck.push({
      id: 'mlbA_bobblehead',
      title: 'Bobblehead night',
      body: 'Twenty thousand small ceramic versions of you with a head that will not stop moving and a face that is legally not your face. The club wants you at the gate.',
      options: [
        {
          label: 'Hand them out at the gate for two hours', effect: 'City love, sore hand',
          apply: (cc) => { fan(cc, 12); mor(cc, 6); hp(cc, -1); return 'Two hours at gate B, 3,000 hellos, and a line that went around the block. Fanbase +12, morale +6, health -1.'; },
        },
        {
          label: 'Sign an hour in a suit inside', effect: 'Money, less warmth',
          apply: (cc) => { paid(cc, 0.03); fan(cc, 5); return 'A roped off table, 400 signatures, 30,000 dollars. 0.03M earned, fanbase +5.'; },
        },
        {
          label: 'Skip it, you have a day game tomorrow', effect: 'Rest over optics',
          apply: (cc) => { fan(cc, -5); hp(cc, 5); mor(cc, 2); return 'You slept ten hours and went 3 for 4 the next afternoon. Fanbase -5, health +5, morale +2.'; },
        },
      ],
    });
  }

  /* ============================== 4. THE BODY AND THE ARM ============================== */

  if (isSp) {
    deck.push({
      id: 'mlbA_elbow_soreness',
      title: 'The elbow talks in August',
      body: 'Not pain exactly. A tightness in the forearm on your slider that goes away after a dozen pitches, which is the exact sentence that comes before every surgery in this sport.',
      options: [
        {
          label: 'Tell the trainer the same day', effect: 'Miss starts, save the arm',
          apply: (cc) => { hp(cc, 14); mor(cc, -3); return 'Three starts on the shelf, one clean MRI, and an elbow that made it to 34 years old. Health +14, morale -3.'; },
        },
        {
          label: 'Cut the slider usage in half', effect: 'Smart compromise',
          apply: (cc) => { hp(cc, 7); rate(cc, -1); return `You threw 9 percent sliders instead of 31 and hitters noticed by September. Health +7, rating -1 to ${cc.ovr}.`; },
        },
        {
          label: 'Say nothing, it is only August', effect: 'Real risk',
          apply: (cc, r) => {
            if (r() < 0.45) { rate(cc, 1); fan(cc, 6); hp(cc, -6); return `You made all 32 starts and nobody ever knew. Rating +1 to ${cc.ovr}, fanbase +6, health -6.`; }
            hp(cc, -20); mor(cc, -8); return 'It let go in the fifth inning on September 11 in front of 38,000 people. Health -20, morale -8.';
          },
        },
      ],
    });
  }

  if (yrs >= 1) {
    deck.push({
      id: 'mlbA_pitch_clock',
      title: 'The clock is beating you',
      body: isSp
        ? 'Two clock violations in a month, both in the seventh, both with the tying run on. The umpire is not sorry.'
        : 'You have been rung up twice for not being in the box with eight seconds left. Your whole pre pitch routine was built when there was no clock.',
      options: [
        {
          label: 'Rebuild the entire routine around it', effect: 'Adapt, feels wrong',
          apply: (cc) => { rate(cc, 2); mor(cc, -3); return `Four months of feeling rushed and then it was just how you played. Rating +2 to ${cc.ovr}, morale -3.`; },
        },
        {
          label: 'Fight it and keep your rhythm', effect: 'Stubborn, costly',
          apply: (cc, r) => {
            mor(cc, 6);
            if (r() < 0.4) { fan(cc, 7); return 'You argued with three crew chiefs and became a folk hero to every old man in the stands. Morale +6, fanbase +7.'; }
            bank(cc, -0.02); rate(cc, -1); return `Six violations, two ejections, and 20,000 dollars in fines. Morale +6, rating -1 to ${cc.ovr}, net worth down 0.02M.`;
          },
        },
        {
          label: 'Work with the mental skills coach', effect: 'Calm under the clock',
          apply: (cc) => { hp(cc, 4); mor(cc, 7); rate(cc, 1); return `Breathing, a shorter reset, and zero violations after May 3. Health +4, morale +7, rating +1 to ${cc.ovr}.`; },
        },
      ],
    });
  }

  if (!isSp && yrs >= 1) {
    deck.push({
      id: 'mlbA_swing_overhaul',
      title: 'They want to rebuild your swing',
      body: 'A hitting coordinator with a laptop wants a new load, a new hand path and eight months of feeling completely wrong, in exchange for four degrees of launch angle.',
      options: [
        {
          label: 'Full teardown, all winter', effect: 'Big swing either way',
          apply: (cc, r) => {
            if (r() < 0.55) { rate(cc, 4); mor(cc, 8); return `It clicked on March 19 and never left. Rating +4 to ${cc.ovr}, morale +8.`; }
            rate(cc, -2); mor(cc, -7); return `You spent until June hitting inside a swing that was not yours yet. Rating -2 to ${cc.ovr}, morale -7.`;
          },
        },
        {
          label: 'Take the one small change only', effect: 'Safe upgrade',
          apply: (cc) => { rate(cc, 1); mor(cc, 3); return `A quieter front foot, nothing else touched. Rating +1 to ${cc.ovr}, morale +3.`; },
        },
        {
          label: 'Keep the swing that got you here', effect: 'Confidence over theory',
          apply: (cc) => { mor(cc, 9); hp(cc, 3); return 'You told him this swing got you drafted 18th overall and went and took 400 cuts your own way. Morale +9, health +3.'; },
        },
      ],
    });
  }

  deck.push({
    id: 'mlbA_sleep_program',
    title: 'The sleep guy',
    body: 'The club hired a sleep specialist who wants blackout curtains, no phone after ten, and no beer on getaway days. Half the clubhouse is convinced he reports to the GM.',
    options: [
      {
        label: 'Follow it to the letter for a year', effect: 'Big health gain',
        apply: (cc) => { hp(cc, 13); rate(cc, 1); mor(cc, -3); return `Eight hours and ten minutes a night, 141 nights straight. Health +13, rating +1 to ${cc.ovr}, morale -3.`; },
      },
      {
        label: 'Curtains yes, phone rules no', effect: 'Half in, half rested',
        apply: (cc) => { hp(cc, 6); mor(cc, 4); return 'You blacked out every hotel room and kept scrolling until 1am anyway. Health +6, morale +4.'; },
      },
      {
        label: 'Ignore it, you are young', effect: 'Fun now, bill later',
        apply: (cc) => { mor(cc, 6); hp(cc, -5); return 'Late food, late flights, late everything, and one very fun season. Morale +6, health -5.'; },
      },
    ],
  });

  deck.push({
    id: 'mlbA_nutritionist',
    title: 'The 11pm spread problem',
    body: 'The postgame food is fried chicken at eleven at night, 81 times a year. A private nutritionist has offered to build every meal and travel with you, for a real fee.',
    options: [
      {
        label: 'Hire her and pay for it yourself', effect: 'Money out, body up',
        apply: (cc) => { bank(cc, -0.2); hp(cc, 12); rate(cc, 1); own(cc, 'Private nutritionist'); return `Every meal for 200 days, cooked and packed. Net worth down 0.2M, health +12, rating +1 to ${cc.ovr}.`; },
      },
      {
        label: 'Half in, keep Sunday chicken', effect: 'Cheaper, still better',
        apply: (cc) => { bank(cc, -0.08); hp(cc, 6); mor(cc, 4); return 'Clean six days, chicken on the seventh. Net worth down 0.08M, health +6, morale +4.'; },
      },
      {
        label: 'The spread is part of the game', effect: 'Room love, worse body',
        apply: (cc) => { mor(cc, 7); hp(cc, -4); bump(cc, 'roomRespect'); return 'You ate at the same table as everybody else all year and they loved you for it. Morale +7, health -4.'; },
      },
    ],
  });

  if (yrs >= 2 || c.health < 85) {
    deck.push({
      id: 'mlbA_shoulder_scare',
      title: 'The MRI you did not want',
      body: `The ${soreSpot(c)} barked, and then the shoulder did too. The imaging shows fraying, and the two doctors you trust most use two completely different words about it.`,
      options: [
        {
          label: 'Shut it down for six weeks right now', effect: 'Lose time, keep career',
          apply: (cc) => { hp(cc, 18); mor(cc, -6); fan(cc, -3); return 'Six weeks, a full rebuild of the scapula work, and zero shoulder problems for the next nine years. Health +18, morale -6, fanbase -3.'; },
        },
        {
          label: 'Rehab hard and keep playing', effect: 'Middle path',
          apply: (cc) => { hp(cc, 6); mor(cc, 2); return 'Ninety minutes of band work before every game and not one day missed. Health +6, morale +2.'; },
        },
        {
          label: 'Play through it, tell nobody', effect: 'Tough, expensive',
          apply: (cc, r) => {
            fan(cc, 6);
            if (r() < 0.4) { rate(cc, 1); hp(cc, -8); return `You gutted 60 more games on a shoulder nobody knew about. Fanbase +6, rating +1 to ${cc.ovr}, health -8.`; }
            hp(cc, -17); mor(cc, -9); return 'It gave out completely in the fourth inning of a Tuesday and cost you four months. Fanbase +6, health -17, morale -9.';
          },
        },
      ],
    });
  }

  if (!isSp && yrs >= 1) {
    deck.push({
      id: 'mlbA_oblique',
      title: 'The oblique',
      body: 'You felt it on a check swing in the sixth. Every person in baseball knows an oblique is four weeks minimum, and every one of them has seen somebody turn it into ten by lying.',
      options: [
        {
          label: 'Take the full four weeks, no shortcuts', effect: 'Safe and correct',
          apply: (cc) => { hp(cc, 13); mor(cc, -3); return 'Twenty nine days, a full progression, and one swing in a rehab game before they activated you. Health +13, morale -3.'; },
        },
        {
          label: 'Back in seventeen days, the race is on', effect: 'Fast, risky',
          apply: (cc, r) => {
            fan(cc, 7);
            if (r() < 0.45) { rate(cc, 1); mor(cc, 6); return `You came back early and drove in 9 runs in the first week. Fanbase +7, rating +1 to ${cc.ovr}, morale +6.`; }
            hp(cc, -15); mor(cc, -8); return 'You re tore it on day three and lost the other ten weeks anyway. Fanbase +7, health -15, morale -8.';
          },
        },
        {
          label: 'DH only until it is completely gone', effect: 'Bat in, glove out',
          apply: (cc) => { hp(cc, 8); mor(cc, 3); fan(cc, -2); return 'Six weeks of nothing but at bats while somebody else took your position. Health +8, morale +3, fanbase -2.'; },
        },
      ],
    });
  }

  /* ================================== 5. THE GRIND ================================== */

  if (yrs >= 1) {
    deck.push({
      id: 'mlbA_one_sixty_two',
      title: '162 games in 187 days',
      body: 'No other sport does this to a person. No week off, no Tuesday to heal, just another 7:05 and another arm you have never seen throwing 98.',
      options: [
        {
          label: 'Play all 162, every inning', effect: 'Iron man, body pays',
          apply: (cc) => { rate(cc, 1); fan(cc, 10); hp(cc, -10); bump(cc, 'ironman'); return `All 162, first man in the lineup card every day. Rating +1 to ${cc.ovr}, fanbase +10, health -10.`; },
        },
        {
          label: 'Take the days the manager offers you', effect: 'Fresh in September',
          apply: (cc) => { hp(cc, 10); mor(cc, 4); return 'Fourteen scheduled days off and an OPS in September that was better than your April. Health +10, morale +4.'; },
        },
        {
          label: 'Demand a fixed weekly maintenance day', effect: 'Structure, mild friction',
          apply: (cc) => { hp(cc, 7); rate(cc, 1); fan(cc, -4); return `Every Wednesday off in writing, 22 of them. Health +7, rating +1 to ${cc.ovr}, fanbase -4 from the talk radio crowd.`; },
        },
      ],
    });
  }

  if (yrs >= 1) {
    deck.push({
      id: 'mlbA_west_coast',
      title: 'Eleven games, three time zones',
      body: 'Seattle, then Oakland, then Anaheim, with a body clock convinced every first pitch is at 2am. The charter lands at 4:40am on the third night.',
      options: [
        {
          label: 'Stay on home time, black out every room', effect: 'Discipline, works',
          apply: (cc) => { hp(cc, 8); rate(cc, 1); mor(cc, -2); return `You ate breakfast at 11am local for eleven days and hit .318 on the trip. Health +8, rating +1 to ${cc.ovr}, morale -2.`; },
        },
        {
          label: 'Live on road time and go out with the guys', effect: 'Fun, tired',
          apply: (cc) => { mor(cc, 10); hp(cc, -6); bump(cc, 'roomRespect'); return 'Three cities, a lot of very late dinners, and a road trip everyone still talks about. Morale +10, health -6.'; },
        },
        {
          label: 'Pay for your own recovery setup on the road', effect: 'Money out, body fine',
          apply: (cc) => { bank(cc, -0.05); hp(cc, 11); return 'A portable pneumatic rig and a sleep pod that shipped city to city. Net worth down 0.05M, health +11.'; },
        },
      ],
    });
  }

  deck.push({
    id: 'mlbA_doubleheader',
    title: 'Rain delay, then two of them',
    body: 'Three hour delay, then a doubleheader on a field that is still basically soup. It is 11:50pm and there is a bottom of the ninth left to play.',
    options: [
      {
        label: 'Play both ends, all eighteen innings', effect: 'Respect, real cost',
        apply: (cc) => { fan(cc, 9); mor(cc, 5); hp(cc, -8); return 'Both games, 1:12am finish, and a manager who told the press exactly who you are. Fanbase +9, morale +5, health -8.'; },
      },
      {
        label: 'Sit the nightcap', effect: 'Sensible, small boos',
        apply: (cc) => { hp(cc, 7); mor(cc, 2); fan(cc, -4); return 'You sat game two and the guy who replaced you went 3 for 4. Health +7, morale +2, fanbase -4.'; },
      },
      {
        label: 'Play, then rip the field conditions publicly', effect: 'Union hero, office cold',
        apply: (cc) => { fan(cc, 7); hp(cc, -5); bump(cc, 'fofriction'); return 'You played both, then told 40 reporters that somebody was going to blow out a knee on that infield. Fanbase +7, health -5.'; },
      },
    ],
  });

  deck.push({
    id: 'mlbA_august_heat',
    title: 'August, 104 degrees, day game',
    body: 'Turf temperature is 130. Two guys have already gone into the tunnel to lie flat on the floor. There are 41 games left after this one.',
    options: [
      {
        label: 'Grind the whole thing, no excuses', effect: 'Tough, drains you',
        apply: (cc) => { fan(cc, 7); mor(cc, 4); hp(cc, -7); return 'Nine innings, four liters of water, and 11 pounds gone by the seventh. Fanbase +7, morale +4, health -7.'; },
      },
      {
        label: 'IV, cold tunnel, every half inning', effect: 'Unglamorous, works',
        apply: (cc) => { hp(cc, 8); mor(cc, 2); return 'You lived in an air conditioned hallway between innings and finished August healthy. Health +8, morale +2.'; },
      },
      {
        label: 'Ask out of day games after night games', effect: 'Smart, some noise',
        apply: (cc) => { hp(cc, 11); fan(cc, -5); rate(cc, 1); return `Nine getaway day afternoons off across the summer. Health +11, fanbase -5, rating +1 to ${cc.ovr}.`; },
      },
    ],
  });

  if (yrs >= 2) {
    deck.push({
      id: 'mlbA_pennant_race',
      title: 'One game up with nine to play',
      body: `Scoreboard watching is a full time job now. Every at bat is being graded by an entire city and ${mlbTeamLabelOf(c.team)} have not been here in eleven years.`,
      options: [
        {
          label: 'Every inning, sleep in November', effect: 'All in',
          apply: (cc, r) => {
            hp(cc, -7); fan(cc, 10);
            if (r() < 0.55) { mor(cc, 12); rate(cc, 1); return `You played all nine and drove in the division clincher. Fanbase +10, morale +12, rating +1 to ${cc.ovr}, health -7.`; }
            mor(cc, -6); return 'You emptied the tank and they won the tiebreaker on the last day. Fanbase +10, morale -6, health -7.';
          },
        },
        {
          label: 'Trust the routine, do not squeeze the bat', effect: 'Steady hands',
          apply: (cc) => { rate(cc, 2); mor(cc, 5); return `Same cage work, same nap, same nine innings, .347 over the last week. Rating +2 to ${cc.ovr}, morale +5.`; },
        },
        {
          label: 'Call a players only meeting', effect: 'Leadership gamble',
          apply: (cc, r) => {
            if (r() < 0.55) { mor(cc, 13); fan(cc, 6); bump(cc, 'roomRespect'); return 'Forty minutes, no coaches, some very direct things said. You won seven of nine. Morale +13, fanbase +6.'; }
            mor(cc, -7); return 'Four guys spoke, two were on their phones, and it was in a column by Thursday. Morale -7.';
          },
        },
      ],
    });
  }

  if (yrs >= 2) {
    deck.push({
      id: 'mlbA_getaway_day',
      title: '4am, terminal C',
      body: 'Getaway day is a day game, a bus, a charter and a hotel key at four in the morning in a city you cannot name yet. Your daughter learned to walk on a video somebody texted you.',
      options: [
        {
          label: 'Fly the family to every road city you can', effect: 'Money out, life kept',
          apply: (cc) => { bank(cc, -0.15); mor(cc, 16); return 'Twenty two road cities, one very tired toddler, and a marriage that survived a baseball season. Net worth down 0.15M, morale +16.'; },
        },
        {
          label: 'Bank the time, be completely present at home', effect: 'Present at home',
          apply: (cc) => { mor(cc, 9); hp(cc, 5); return 'Phone in a drawer for every one of the 81 home dates. Morale +9, health +5.'; },
        },
        {
          label: 'Just work, the family understands', effect: 'Rating up, cost at home',
          apply: (cc) => { rate(cc, 2); mor(cc, -9); return `Video on every flight, cage work in every city, and 71 nights you will not get back. Rating +2 to ${cc.ovr}, morale -9.`; },
        },
      ],
    });
  }

  /* ============================= 6. BASEBALL WEIRDNESS ============================= */

  if (yrs >= 1) {
    deck.push({
      id: 'mlbA_superstition',
      title: 'The socks',
      body: 'You have not washed them in 23 games because you are hitting .380 in them. The clubhouse manager now handles them with gloves. Two teammates have complained in writing.',
      options: [
        {
          label: 'Ride it until the streak dies', effect: 'Peak baseball behavior',
          apply: (cc) => { mor(cc, 9); fan(cc, 8); hp(cc, -2); return 'Thirty one games, one pair of socks, one legend, and one very real smell. Morale +9, fanbase +8, health -2.'; },
        },
        {
          label: 'Wash them and let the streak go', effect: 'Sanity restored',
          apply: (cc) => { rate(cc, 1); mor(cc, -4); return `You put them in a machine like an adult and went 0 for 12 immediately, then 9 for 22. Rating +1 to ${cc.ovr}, morale -4.`; },
        },
        {
          label: 'Buy the whole roster the same socks', effect: 'Money out, room in',
          apply: (cc) => { bank(cc, -0.01); mor(cc, 11); fan(cc, 9); own(cc, 'Team streak socks'); return 'Twenty six identical pairs, one very confused equipment staff, and a nine game winning streak. Net worth down 0.01M, morale +11, fanbase +9.'; },
        },
      ],
    });
  }

  if (!isSp && yrs >= 1) {
    deck.push({
      id: 'mlbA_walkup_song',
      title: 'The walk up song problem',
      body: 'You picked a song your six year old loves and the stadium plays it at full volume 600 times a year. The internet has decided it is either the best or the worst thing in the sport.',
      options: [
        {
          label: 'Keep it forever, it is hers', effect: 'Beloved, slightly mocked',
          apply: (cc) => { fan(cc, 11); mor(cc, 12); return 'Forty thousand adults singing a cartoon theme song in the eighth inning. Fanbase +11, morale +12.'; },
        },
        {
          label: 'Switch to something that scares people', effect: 'Edge over charm',
          apply: (cc) => { fan(cc, 4); rate(cc, 1); mor(cc, -3); return `Something loud with no lyrics, and a very disappointed six year old. Fanbase +4, rating +1 to ${cc.ovr}, morale -3.`; },
        },
        {
          label: 'Let the fans vote on it', effect: 'Chaos, engagement',
          apply: (cc) => { fan(cc, 14); mor(cc, -4); return 'They picked a 1997 novelty song by 71 percent and you were legally bound to it until October. Fanbase +14, morale -4.'; },
        },
      ],
    });
  }

  deck.push({
    id: 'mlbA_bench_clearing',
    title: 'Both benches, right now',
    body: 'A fastball went behind somebody and 52 grown men are jogging toward each other with absolutely no plan. You are the closest player to the mound.',
    options: [
      {
        label: 'Get right in the middle of it', effect: 'Room love, suspension',
        apply: (cc) => { fan(cc, 11); mor(cc, 7); bank(cc, -0.01); hp(cc, -3); bump(cc, 'roomRespect'); return 'Four game suspension, a 12,000 dollar fine, and 25 teammates who will never forget where you were standing. Fanbase +11, morale +7, health -3, net worth down 0.01M.'; },
      },
      {
        label: 'Grab your own guy and drag him out', effect: 'Peacemaker, still counts',
        apply: (cc) => { mor(cc, 8); hp(cc, 2); fan(cc, 4); return 'You pulled your own starter out by the jersey before he did something that cost him 30 days. Morale +8, health +2, fanbase +4.'; },
      },
      {
        label: 'Stand at the edge and do nothing', effect: 'Safe, remembered badly',
        apply: (cc) => { mor(cc, -7); hp(cc, 5); return 'You stood near the third base line with your hands on your hips and it was on camera the whole time. Morale -7, health +5.'; },
      },
    ],
  });

  if (!isSp && yrs >= 2) {
    deck.push({
      id: 'mlbA_hidden_ball',
      title: 'The hidden ball trick',
      body: 'The runner on second has not looked at you once. The ball is in your glove. Your pitcher is standing off the rubber exactly the way you asked him to in the dugout.',
      options: [
        {
          label: 'Run it', effect: 'Glory or clown',
          apply: (cc, r) => {
            if (r() < 0.5) { fan(cc, 13); mor(cc, 12); return 'He took a two step lead and you tagged him. The clip has 30 million views and a very good caption. Fanbase +13, morale +12.'; }
            fan(cc, -3); mor(cc, -4); return 'He stepped back on the bag, looked at you, and laughed on national television. Fanbase -3, morale -4.';
          },
        },
        {
          label: 'Never, it is bush league', effect: 'Old school clean',
          apply: (cc) => { mor(cc, 5); bump(cc, 'roomRespect'); return 'You flipped the ball back and played baseball the way three generations of coaches told you to. Morale +5.'; },
        },
        {
          label: 'Save it and set it up properly later', effect: 'Patient scheming',
          apply: (cc) => { rate(cc, 1); mor(cc, 6); return `You practiced it for a month and pulled it in a tie game in August. Rating +1 to ${cc.ovr}, morale +6.`; },
        },
      ],
    });
  }

  deck.push({
    id: 'mlbA_rally_animal',
    title: 'The rally cockroach',
    body: 'Somebody found a plastic bug in the visiting dugout in Detroit and the team has won nine straight since. It has a name, a locker, and an account run by the bullpen.',
    options: [
      {
        label: 'Become its official keeper', effect: 'Full commitment',
        apply: (cc) => { mor(cc, 10); fan(cc, 9); return 'You carried a plastic insect through four airports in a custom case. The streak hit 13. Morale +10, fanbase +9.'; },
      },
      {
        label: 'Feed the bit on national TV', effect: 'Fame and a small bag',
        apply: (cc) => { paid(cc, 0.04); fan(cc, 13); mor(cc, 5); own(cc, 'Rally bug merchandise cut'); return 'A dugout interview, a plush toy, and a merch cut of 40,000 dollars. 0.04M earned, fanbase +13, morale +5.'; },
      },
      {
        label: 'Refuse to touch the thing', effect: 'Focus, no fun',
        apply: (cc) => { rate(cc, 1); mor(cc, -3); return `You told a camera that a bug does not hit a curveball. Rating +1 to ${cc.ovr}, morale -3, and one very cold week.`; },
      },
    ],
  });

  if (isSp && yrs >= 1) {
    deck.push({
      id: 'mlbA_no_hitter_dugout',
      title: 'Nobody will sit next to you',
      body: 'Twenty one outs, no hits, and the entire dugout has physically moved four feet away from you. You are at 104 pitches. The pitching coach will not make eye contact.',
      options: [
        {
          label: 'Ask for the eighth', effect: 'Chase it, arm pays',
          apply: (cc, r) => {
            hp(cc, -9); fan(cc, 12);
            if (r() < 0.35) { mor(cc, 20); rate(cc, 2); return `One hundred and thirty one pitches and a no hitter. Fanbase +12, morale +20, rating +2 to ${cc.ovr}, health -9.`; }
            mor(cc, -5); return 'Broken bat single, first pitch of the eighth, and a standing ovation on the walk off. Fanbase +12, morale -5, health -9.';
          },
        },
        {
          label: 'Hand him the ball and protect the arm', effect: 'Safe and correct',
          apply: (cc) => { hp(cc, 10); mor(cc, -6); fan(cc, -5); return 'You gave it up at 104 and the bullpen finished it in the ninth without you. Health +10, morale -6, fanbase -5.'; },
        },
        {
          label: 'Tell the manager it is completely his call', effect: 'Trust the room',
          apply: (cc, r) => {
            if (r() < 0.5) { hp(cc, 6); mor(cc, 6); return 'He took the ball, told you why, and you were both fine with it by the car ride. Health +6, morale +6.'; }
            hp(cc, -6); fan(cc, 9); mor(cc, 8); return 'He let you go out there and you got the last six outs on 126 pitches. Fanbase +9, morale +8, health -6.';
          },
        },
      ],
    });
  }

  /* ================================ 7. EVERYDAY MONEY ================================ */

  if (yrs >= 1) {
    deck.push({
      id: 'mlbA_glove_deal',
      title: isSp ? 'The glove meeting' : 'The bat and glove meeting',
      body: 'A small Japanese maker offers real money and an 18 month lead time on custom orders. A giant offers less cash, a wall with your name on it, and gear tomorrow.',
      options: [
        {
          label: 'Sign with the giant', effect: 'Fame, smaller check',
          apply: (cc) => { paid(cc, 0.35); fan(cc, 10); own(cc, 'Major brand gear deal'); return `A national spot, a logo on everything, and 350,000 dollars a year. 0.35M earned, fanbase +10.`; },
        },
        {
          label: 'Sign with the small maker', effect: 'Money and the best gear',
          apply: (cc) => { paid(cc, 0.7); rate(cc, 1); fan(cc, 3); own(cc, 'Custom gear contract'); return `Double the money and ${isSp ? 'a glove built to your exact hand' : 'bats cut to a model that has not existed since 1974'}. 0.7M earned, rating +1 to ${cc.ovr}, fanbase +3.`; },
        },
        {
          label: 'Stay free and use whatever feels right', effect: 'No bag, best feel',
          apply: (cc) => { rate(cc, 1); mor(cc, 6); return `You blacked out logos with a marker all season and used the best of everything. Rating +1 to ${cc.ovr}, morale +6.`; },
        },
      ],
    });
  }

  if (c.fanbase >= 40) {
    deck.push({
      id: 'mlbA_card_show',
      title: 'Four hours, one folding chair',
      body: 'A convention center in January, 900 autographs, 70,000 dollars, and one man who very sincerely wants you to sign a photograph of somebody else.',
      options: [
        {
          label: 'Do the full four hours', effect: 'Money, dead wrist',
          apply: (cc) => { paid(cc, 0.07); fan(cc, 5); mor(cc, -2); hp(cc, -1); return 'Nine hundred signatures and a hand that did not work right until Tuesday. 0.07M earned, fanbase +5, morale -2, health -1.'; },
        },
        {
          label: 'Two paid hours, then free photos with kids', effect: 'Less money, more love',
          apply: (cc) => { paid(cc, 0.035); fan(cc, 13); mor(cc, 7); return 'You cut the paid session in half and stayed an extra hour taking free pictures. 0.035M earned, fanbase +13, morale +7.'; },
        },
        {
          label: 'Skip it and stay in the cage', effect: 'Work over appearance fee',
          apply: (cc) => { rate(cc, 1); hp(cc, 4); return `A Saturday of tee work instead of a folding chair. Rating +1 to ${cc.ovr}, health +4.`; },
        },
      ],
    });
  }

  if (c.fanbase >= 35) {
    deck.push({
      id: 'mlbA_local_ad',
      title: 'The mattress commercial',
      body: 'A furniture warehouse out on the interstate wants 30 seconds of you saying a slogan about sleeping like a champion. It runs 300 times a week between innings.',
      options: [
        {
          label: 'Do it, slogan and all', effect: 'Money, mild mockery',
          apply: (cc) => { paid(cc, 0.18); fan(cc, 6); mor(cc, -2); setFlag(cc, 'localLegend', 1); return 'Every person in that city can still do the line, including your teammates, constantly. 0.18M earned, fanbase +6, morale -2.'; },
        },
        {
          label: 'Do it, but write your own script', effect: 'Less money, dignity',
          apply: (cc) => { paid(cc, 0.11); fan(cc, 10); mor(cc, 5); return 'You rewrote it in the parking lot and it became the best local ad in the state. 0.11M earned, fanbase +10, morale +5.'; },
        },
        {
          label: 'Pass on it', effect: 'Clean brand',
          apply: (cc, r) => {
            mor(cc, 4);
            if (r() < 0.4) { paid(cc, 0.5); fan(cc, 5); return 'You passed and a national insurance company called in November with 500,000 dollars and a much better script. Morale +4, fanbase +5, 0.5M earned.'; }
            return 'You passed and nobody called. Morale +4, and one Saturday with no camera crew in your driveway.';
          },
        },
      ],
    });
  }

  if (worth >= 2 || c.earnings >= 6) {
    deck.push({
      id: 'mlbA_mom_house',
      title: 'The house for your mother',
      body: 'She still works doubles and still says she is fine. You have the money now. She has very strong opinions about the neighborhood and none at all about the kitchen.',
      options: [
        {
          label: 'Buy the house she picked, no arguments', effect: 'Money out, morale way up',
          apply: (cc) => { bank(cc, -1.2); mor(cc, 19); fan(cc, 6); own(cc, "Mother's house"); return 'You put keys in her hand in a driveway and she sat down on the step and said nothing for a full minute. Net worth down 1.2M, morale +19, fanbase +6.'; },
        },
        {
          label: 'Buy it and pay her to never work again', effect: 'Bigger money, bigger moment',
          apply: (cc) => { bank(cc, -1.9); mor(cc, 22); fan(cc, 8); own(cc, "Mother's house and pension"); return 'House, car, and a monthly transfer that meant she gave notice after 29 years of doubles. Net worth down 1.9M, morale +22, fanbase +8.'; },
        },
        {
          label: 'Set up a trust and let her pick later', effect: 'Patient money',
          apply: (cc) => { bank(cc, -0.25); mor(cc, 11); own(cc, 'Family trust'); return 'A lawyer, a trust, and a plan that grew 0.35M before she ever chose a house. Net worth down 0.25M, morale +11.'; },
        },
      ],
    });
  }

  if (yrs >= 2 && (worth >= 1 || c.earnings >= 4)) {
    deck.push({
      id: 'mlbA_teammate_loan',
      title: 'The 40,000 dollar ask',
      body: 'A guy you rode buses with in Double A is out of the game and needs money for something he will not fully explain. He has never asked you for anything in nine years.',
      options: [
        {
          label: 'Give it to him and call it a gift', effect: 'Money gone, real love',
          apply: (cc) => { bank(cc, -0.04); mor(cc, 12); setFlag(cc, 'gaveGift', 1); return 'You wrote gift on the memo line so he could never carry it as a debt. Net worth down 0.04M, morale +12.'; },
        },
        {
          label: 'Lend it with a written agreement', effect: 'Business, some tension',
          apply: (cc, r) => {
            bank(cc, -0.04);
            if (r() < 0.6) { bank(cc, 0.04); mor(cc, 6); return 'He paid back every dollar in 16 months and framed the signed page. Net worth back to even, morale +6.'; }
            mor(cc, -8); return 'He never paid it back and stopped answering, which cost far more than 40,000 dollars. Net worth down 0.04M, morale -8.';
          },
        },
        {
          label: 'Say no and help a different way', effect: 'Money kept, awkward',
          apply: (cc) => { mor(cc, -2); return 'You said no, then got him a hitting instructor job with your trainer that paid him properly for four years. Morale -2, and one very quiet phone call.'; },
        },
      ],
    });
  }

  if (yrs >= 1 && c.age <= 30) {
    deck.push({
      id: 'mlbA_winter_ball',
      title: 'Winter ball money',
      body: 'A club in the Dominican winter league wants six weeks, real at bats and a real check, in front of the loudest crowds you will ever hear. Your body wanted December off.',
      options: [
        {
          label: 'Go, play every game they give you', effect: 'Money and reps, no rest',
          apply: (cc) => { paid(cc, 0.09); rate(cc, 2); hp(cc, -8); fan(cc, 6); return `Six weeks of 25,000 people losing their minds over a January game. 0.09M earned, rating +2 to ${cc.ovr}, fanbase +6, health -8.`; },
        },
        {
          label: 'Go for three weeks and leave', effect: 'Half and half',
          apply: (cc) => { paid(cc, 0.045); rate(cc, 1); hp(cc, -3); return `Three weeks of live at bats and then a plane home. 0.045M earned, rating +1 to ${cc.ovr}, health -3.`; },
        },
        {
          label: 'Stay home and do nothing for six weeks', effect: 'Full reset',
          apply: (cc) => { hp(cc, 13); mor(cc, 8); return 'No bat, no bullpen, no flights, and a body that showed up in February brand new. Health +13, morale +8.'; },
        },
      ],
    });
  }

  return deck;
}
