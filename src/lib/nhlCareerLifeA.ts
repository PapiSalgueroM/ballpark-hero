/**
 * NHL My Career life events, deck A (Round 59).
 *
 * Forty five offseason decisions: juniors and the call up, the dressing
 * room, media and fame, the body and the grind, hockey culture, the season
 * itself, and everyday money. Goalies live a different life than skaters
 * and defensemen have their own headaches, so the gates check position.
 *
 * CIRCULAR IMPORT WARNING: nhlMyCareer.ts imports this file. Nothing
 * imported here may be touched at module scope. Every use of an imported
 * value happens inside a function body, at call time, after both modules
 * have finished loading. This exact bug shipped once already.
 */

import type { NhlCareerState, NhlCareerEvent } from './nhlMyCareer';
import { nhlTeamLabelOf } from './nhlMyCareer';
import { nhlWaiverRequired } from './nhlCareerWaivers';

/** Round 59 optional fields that are not on NhlCareerState yet. */
type LifeState = NhlCareerState & {
  netWorth?: number;
  dirtyMoney?: number;
  heat?: number;
  purchased?: string[];
  lifeFlags?: Record<string, number>;
};

const L = (c: NhlCareerState): LifeState => c as LifeState;

const clamp = (v: number, lo = 0, hi = 100): number => Math.max(lo, Math.min(hi, v));
const r1 = (v: number): number => Math.round(v * 10) / 10;
const r2 = (v: number): number => Math.round(v * 100) / 100;

/** Every mutator returns the delta that ACTUALLY landed after clamping. */
const mor = (c: NhlCareerState, n: number): number => { const b = c.morale; c.morale = clamp(c.morale + n); return c.morale - b; };
const fan = (c: NhlCareerState, n: number): number => { const b = c.fanbase; c.fanbase = clamp(c.fanbase + n); return c.fanbase - b; };
const hp = (c: NhlCareerState, n: number): number => { const b = c.health; c.health = clamp(c.health + n); return c.health - b; };
const rate = (c: NhlCareerState, n: number): number => { const b = c.ovr; c.ovr = Math.max(55, Math.min(c.pot + 1, c.ovr + n)); return c.ovr - b; };

/** Money in millions. Income also credits career earnings. Returns the absolute size for the log line. */
const cash = (c: NhlCareerState, m: number): number => {
  const l = L(c);
  l.netWorth = r1((l.netWorth ?? 0) + m);
  if (m > 0) c.earnings = r1(c.earnings + m);
  return r2(Math.abs(m));
};
const heatUp = (c: NhlCareerState, n: number): number => { const l = L(c); l.heat = clamp((l.heat ?? 0) + n); return l.heat; };
const flag = (c: NhlCareerState, k: string, n = 1): void => {
  const l = L(c);
  const cur = l.lifeFlags ?? {};
  l.lifeFlags = { ...cur, [k]: (cur[k] ?? 0) + n };
};
const buy = (c: NhlCareerState, item: string): void => { const l = L(c); l.purchased = [...(l.purchased ?? []), item]; };

export function getNhlLifeEventsA(c: NhlCareerState, rng: () => number): NhlCareerEvent[] {
  const deck: NhlCareerEvent[] = [];

  const teamName = nhlTeamLabelOf(c.team);
  const CANADA = ['TOR', 'MTL', 'OTT', 'WPG', 'CGY', 'EDM', 'VAN'];
  const isG = c.pos === 'G';
  const isD = c.pos === 'D';
  const yrs = c.seasons.length;
  const net = L(c).netWorth ?? 0;

  /* ------------------------------------------------------------------ *
   * 1. JUNIORS AND THE CALL UP
   * ------------------------------------------------------------------ */

  if (yrs === 0 && c.age <= 20) {
    deck.push({
      id: 'nhlA_billet_family',
      category: 'callup', cooldown: 99,
      title: 'The billet family',
      body: 'You moved in at sixteen: a spare room in a stranger\'s basement, a billet mom who packs your lunch with a note in it, and a billet dad who drives you to 6am skates without ever complaining. Your last junior year starts in September, and for the first time you could afford to live somewhere else.',
      options: [
        {
          label: 'Stay in the basement', effect: 'Home cooking',
          apply: (cc) => { const m = mor(cc, 8); const h = hp(cc, 5); flag(cc, 'billetLoyal'); return `Stayed with the billets for one more year of pot roast on Sundays and a curfew nobody enforced. Morale +${m}, health +${h}, and she still texts you on game days.`; },
        },
        {
          label: 'Get your own place downtown', effect: 'Grown man rent',
          apply: (cc) => { const m = mor(cc, 3); const h = hp(cc, -4); const spent = cash(cc, -0.01); return `Rented a one bedroom for ${spent}M and learned to make exactly two meals, both of them pasta. Freedom tastes like takeout. Morale +${m}, health ${h}.`; },
        },
        {
          label: 'Move in with two teammates', effect: 'Room chemistry',
          apply: (cc) => { const m = mor(cc, 6); const h = hp(cc, -2); flag(cc, 'roomGuy'); return `Three juniors, one couch, zero vegetables and a video game tournament that never really ended. Morale +${m}, health ${h}, but the room loves you.`; },
        },
      ],
    });
  }

  if (yrs === 0) {
    deck.push({
      id: 'nhlA_junior_final_year',
      category: 'callup', cooldown: 99,
      title: 'One more year of junior',
      body: 'Your junior coach wants you on the ice for thirty minutes a night, on both special teams and for every faceoff that matters. It is your draft year, there are scouts in the stands every night with notebooks and stopwatches, and everyone has an opinion about how you should play it.',
      options: [
        {
          label: 'Play the horse minutes', effect: 'Trial by fire',
          apply: (cc) => { const g = rate(cc, 2); const h = hp(cc, -7); return `Ninety games including playoffs, and you were on the ice for most of the ones that mattered. Rating +${g}, health ${h}. Scouts saw everything, the good and the tired.`; },
        },
        {
          label: 'Chase the scoring title', effect: 'Highlight season',
          apply: (cc, r) => { const g = rate(cc, 1); const f = fan(cc, 8 + Math.floor(r() * 5)); const m = mor(cc, 5); return `Led the league in points, and the highlight package went everywhere a teenager's phone could reach. Fanbase +${f}, morale +${m}, rating +${g}.`; },
        },
        {
          label: 'Manage the load with the trainer', effect: 'Protect the body',
          apply: (cc) => { const h = hp(cc, 10); const m = mor(cc, 2); const f = fan(cc, -2); return `Sixty games, a few nights off you did not love, and fresh legs in April when it counted. Health +${h}, morale +${m}, fanbase ${f}.`; },
        },
      ],
    });
  }

  if (yrs <= 3 && c.ovr < 78) {
    deck.push({
      id: 'nhlA_ahl_bus',
      category: 'callup', cooldown: 2, story: 'ahlAssignment',
      title: 'The bus league',
      body: 'They are sending you down to the minors to get you more minutes than the big club can give you. Ten hours on a bus to the next barn, a seat that does not recline, a per diem that buys gas station sushi, and a locker room full of guys who would love to take your call up.',
      options: [
        {
          label: 'Dominate until they call', effect: 'Force their hand',
          apply: (cc) => { const g = rate(cc, 2); const m = mor(cc, -4); flag(cc, 'ahlMonster'); return `A point a game in the minors, every shift a message to the people upstairs. It was lonely and it worked. Rating +${g}, morale ${m}, and the coaches upstairs noticed.`; },
        },
        {
          label: 'Be the leader down there', effect: 'Room respect',
          apply: (cc) => { const m = mor(cc, 7); const f = fan(cc, 4); const g = rate(cc, 1); return `You ran the room in the minors: first on the bus, last off the ice, the guy the kids asked about everything. Morale +${m}, fanbase +${f}, rating +${g}.`; },
        },
        {
          label: 'Let the agent make noise', effect: 'Squeaky wheel',
          apply: (cc, r) => { const m = mor(cc, 4); const f = fan(cc, -3); const back = r() < 0.5; if (back) { const g = rate(cc, 1); return `The agent called everybody he knows and got you recalled in three weeks. Some people upstairs did not love how. Morale +${m}, fanbase ${f}, rating +${g}.`; } flag(cc, 'agentNoise'); return `The agent got a meeting, a handshake and nothing else. You stayed on the bus. Morale +${m}, fanbase ${f}.`; },
        },
      ],
    });
  }

  /* Only a player past his waiver exemption, under the agreement that
     nhlCareerWaivers.ts checks (games and years, two sources). The words
     carry no clock time: the claim deadline has moved over the years. */
  if (nhlWaiverRequired(c) && yrs <= 6 && c.ovr < 80) {
    deck.push({
      id: 'nhlA_waiver_wire',
      category: 'callup', cooldown: 2, story: 'waivers',
      title: 'Waiver wire Saturday',
      body: 'To send you down they have to put you on waivers first, and every other team in the league has until this time tomorrow to claim you and change your entire life. Your phone is face up on the kitchen table. Nobody in your family is talking about it, which means everybody is thinking about it.',
      options: [
        {
          label: 'Phone face down, skate at 8am', effect: 'Control the controllable',
          apply: (cc) => { const m = mor(cc, 6); const h = hp(cc, 3); return `You skated, ate, napped and never checked once. Cleared the next day and went down with your head up. Morale +${m}, health +${h}.`; },
        },
        {
          label: 'Work every contact you have', effect: 'Read the room',
          apply: (cc, r) => { const m = mor(cc, -3); if (r() < 0.45) { const nf = fan(cc, 5); const g = rate(cc, 1); return `Three teams were quietly interested, and once word got around your own club suddenly found you a role. Morale ${m}, fanbase +${nf}, rating +${g}.`; } return `Twelve calls, zero answers, one very long morning staring at a phone that never rang. Morale ${m}.`; },
        },
        {
          label: 'Tell the coach you will play anywhere', effect: 'Fourth line pitch',
          apply: (cc) => { const m = mor(cc, 4); const g = rate(cc, 1); const f = fan(cc, 2); return `Penalty kill, fourth line, the shifts nobody wants. You said yes to all of it and meant it. Morale +${m}, rating +${g}, fanbase +${f}. You stayed up.`; },
        },
      ],
    });
  }

  if (yrs === 0) {
    deck.push({
      id: 'nhlA_nhl_debut',
      category: 'callup', cooldown: 99,
      title: 'Your first NHL game',
      body: `Warmup, the anthem, your parents crying in row 14 for ${teamName}. The veterans sent you out alone for the rookie lap and everybody in the building knows exactly why. Your first shift lasts 32 seconds and you will remember none of it.`,
      options: [
        {
          label: 'Hit the first thing that moves', effect: 'Announce yourself',
          apply: (cc) => { const f = fan(cc, 9); const m = mor(cc, 6); const h = hp(cc, -4); return `You ran their captain into the bench door on your second shift and the building came apart. He found you later. Fanbase +${f}, morale +${m}, health ${h}.`; },
        },
        {
          label: 'Simple first pass, live to shift two', effect: 'Coach approved',
          apply: (cc) => { const g = rate(cc, 1); const m = mor(cc, 5); return `Boring, clean, thirteen minutes, not one puck given away. The coach said nothing, which is the best review a rookie can get. Rating +${g}, morale +${m}, and you were back out there Tuesday.`; },
        },
        {
          label: 'Shoot the first puck you touch', effect: 'Swing for it',
          apply: (cc, r) => { if (r() < 0.4) { const f = fan(cc, 14); const m = mor(cc, 12); flag(cc, 'debutGoal'); return `First shot, first goal. The puck is in a case at your mom\'s house and the veterans made you buy dinner for it. Fanbase +${f}, morale +${m}.`; } const f2 = fan(cc, 3); const m2 = mor(cc, -2); return `You fired it into the glass from the blue line and the bench laughed, kindly, mostly. Fanbase +${f2}, morale ${m2}.`; },
        },
      ],
    });
  }

  if (yrs <= 2) {
    deck.push({
      id: 'nhlA_vet_mentor',
      category: 'callup', cooldown: 2,
      title: 'The 38 year old winger',
      body: 'Two Cups, one working knee, and the stall right next to yours. He has seen a hundred kids like you come and go, and for some reason he has decided you are worth the trouble. He offers to drive you to the rink every morning at 7, coffee included, lecture optional.',
      options: [
        {
          label: 'Ride with him every day', effect: 'Free education',
          apply: (cc) => { const m = mor(cc, 7); const g = rate(cc, 1); flag(cc, 'mentored'); return `Twenty minutes of hockey school each way: which refs hold a grudge, which goalies cheat glove side, where to sit on the plane. Morale +${m}, rating +${g}.`; },
        },
        {
          label: 'Sleep in, drive yourself', effect: 'Rest first',
          apply: (cc) => { const h = hp(cc, 6); const m = mor(cc, 2); return `An extra hour of sleep every morning and your own playlist in the car. He did not take it personally. Health +${h}, morale +${m}.`; },
        },
        {
          label: 'Ask him about the Cup year', effect: 'Steal the map',
          apply: (cc) => { const m = mor(cc, 5); const g = rate(cc, 1); const f = fan(cc, 2); flag(cc, 'mentored'); return `He talked for two hours about one shift in Game 6, and somewhere in there was everything you needed to know about the spring. Morale +${m}, rating +${g}, fanbase +${f}.`; },
        },
      ],
    });
  }

  if (yrs <= 1) {
    deck.push({
      id: 'nhlA_jersey_number',
      category: 'callup', cooldown: 99,
      title: 'That number is taken',
      body: 'The veteran who owns the number you have worn since novice will sell it to you, and he has clearly done this before. He wants a watch and a week somewhere warm for his family. The equipment manager is holding two sweaters, one with your old number and one with a number nobody wants.',
      options: [
        {
          label: 'Pay the man', effect: 'Buy your number',
          apply: (cc) => { const spent = cash(cc, -0.06); buy(cc, 'a watch for a teammate'); const m = mor(cc, 6); const f = fan(cc, 3); return `Watch bought, villa booked, ${spent}M gone, and a veteran who now calls you his favorite rookie. Morale +${m}, fanbase +${f}, and the number is yours.`; },
        },
        {
          label: 'Take a random number and make it famous', effect: 'Build your own',
          apply: (cc) => { const f = fan(cc, 6); const m = mor(cc, 3); return `Nobody wanted 47. You wore it like you picked it on purpose, and in four years the kids will want it too. Fanbase +${f}, morale +${m}.`; },
        },
      ],
    });
  }

  /* ------------------------------------------------------------------ *
   * 2. THE DRESSING ROOM
   * ------------------------------------------------------------------ */

  if (yrs <= 1) {
    deck.push({
      id: 'nhlA_rookie_dinner',
      category: 'lockerRoom', cooldown: 99,
      title: 'The rookie dinner',
      body: 'Nine veterans, a private room at the best steakhouse in town, and a wine list they are treating like a personal challenge. Somebody ordered a seafood tower nobody touched. At the end of the night the leather folder gets slid in front of you, and the whole table goes quiet to watch you open it.',
      options: [
        {
          label: 'Pay it, laugh, say nothing', effect: 'Buy in fully',
          apply: (cc) => { const spent = cash(cc, -0.05); const m = mor(cc, 9); const f = fan(cc, 2); flag(cc, 'roomGuy'); return `You covered ${spent}M of steak and very old Barolo without blinking, and the captain stood up and toasted you for it. Morale +${m}, fanbase +${f}. You are in.`; },
        },
        {
          label: 'Split it with the other rookie', effect: 'Rookie solidarity',
          apply: (cc) => { const spent = cash(cc, -0.026); const m = mor(cc, 4); return `Two rookies, ${spent}M each, one shared trauma. You two have been close ever since. Morale +${m}.`; },
        },
        {
          label: 'Ask the captain to cap the wine', effect: 'Set a boundary',
          apply: (cc) => { const spent = cash(cc, -0.014); const m = mor(cc, 1); flag(cc, 'roomTax'); return `He capped it, smiling the whole time. You paid ${spent}M and heard about it on every bus ride until Christmas. Morale +${m}.`; },
        },
      ],
    });
  }

  if (yrs >= 1 && yrs <= 12) {
    deck.push({
      id: 'nhlA_kangaroo_court',
      category: 'lockerRoom', cooldown: 2,
      title: 'The kangaroo court',
      body: 'Late for the bus is 200. Sneakers with a suit is 500. A phone ringing in a video session is a thousand and a speech. The room runs its own court with its own judge, and somehow you are the leading fine earner on the team and it is only November.',
      options: [
        {
          label: 'Pay everything, never argue', effect: 'Good teammate',
          apply: (cc) => { const spent = cash(cc, -0.012); const m = mor(cc, 6); flag(cc, 'roomGuy'); return `You paid every fine with a smile and funded the Christmas party by yourself, ${spent}M of it. The room decided you were all right. Morale +${m}.`; },
        },
        {
          label: 'Appeal every single fine', effect: 'Courtroom drama',
          apply: (cc) => { const m = mor(cc, 3); const f = fan(cc, 2); return `Your closing arguments, with exhibits, became the best part of Tuesdays. You lost every one of them. Morale +${m}, fanbase +${f}.`; },
        },
        {
          label: 'Run for judge yourself', effect: 'Seize the gavel',
          apply: (cc) => { const m = mor(cc, 5); flag(cc, 'roomBoss'); const f = fan(cc, 3); return `You won the election in a landslide and now decide what sneakers cost. Morale +${m}, fanbase +${f}, and nobody is late anymore.`; },
        },
      ],
    });
  }

  if (!isG && yrs >= 1) {
    deck.push({
      id: 'nhlA_goalie_screen',
      category: 'lockerRoom', cooldown: 2,
      title: 'The goalie hates screens',
      body: 'Your starting goalie says you are standing in his eyes on every penalty kill. He said it loud, in the room, between periods, with everyone sitting there and the coach pretending to read his notes. Goalies are allowed to be strange. They are also usually right about what they can and cannot see.',
      options: [
        {
          label: 'Move off the post, keep the peace', effect: 'Keep the peace',
          apply: (cc) => { const m = mor(cc, 5); const h = hp(cc, 3); return `You gave him his sight lines back and he gave you a stick tap after the next kill. Fewer pucks off your ankles too. Morale +${m}, health +${h}.`; },
        },
        {
          label: 'Tell him to find the puck', effect: 'Hold your ground',
          apply: (cc) => { const m = mor(cc, -5); const f = fan(cc, 4); const g = rate(cc, 1); return `You kept blocking shots and he kept complaining about it to anyone who would listen. The fans loved your blocks. Morale ${m}, fanbase +${f}, rating +${g}.`; },
        },
        {
          label: 'Watch a week of tape with him', effect: 'Fix it properly',
          apply: (cc) => { const g = rate(cc, 1); const m = mor(cc, 6); flag(cc, 'goalieAlly'); return `Five sessions in a dark room with a goalie who talks to himself. Turns out you were both a little bit right. Rating +${g}, morale +${m}.`; },
        },
      ],
    });
  }

  if (isG && yrs >= 1) {
    deck.push({
      id: 'nhlA_screen_machine',
      category: 'lockerRoom', cooldown: 2,
      title: 'Your defenseman is a curtain',
      body: 'Every power play against, one of your defensemen plants himself in your sight line like he is waiting for a bus. Four goals this month you never saw leave a stick, and every one of them goes on your save percentage, not his. He thinks he is helping.',
      options: [
        {
          label: 'Snap at him on the bench', effect: 'Public correction',
          apply: (cc) => { const f = fan(cc, 5); const m = mor(cc, -6); heatUp(cc, 3); return `You let him have it during a TV timeout, and the bench cam got all of it. The clip did numbers. The room went quiet for a week. Fanbase +${f}, morale ${m}.`; },
        },
        {
          label: 'Draw it up after practice', effect: 'Fix the lane',
          apply: (cc) => { const g = rate(cc, 1); const m = mor(cc, 7); flag(cc, 'dPairAlly'); return `Cones, a whiteboard and twenty minutes after everybody else had gone home. He got it, and he thanked you for not doing it on the bench. Rating +${g}, morale +${m}.`; },
        },
        {
          label: 'Say nothing, swear in private', effect: 'Bottle it',
          apply: (cc) => { const m = mor(cc, 2); const f = fan(cc, 3); return `The mask hides a lot. So does a hallway with nobody in it. The fans only saw the glove saves. Morale +${m}, fanbase +${f}.`; },
        },
      ],
    });
  }

  if (yrs >= 4 && c.ovr >= 80) {
    deck.push({
      id: 'nhlA_captain_vote',
      category: 'lockerRoom', cooldown: 99, story: 'captaincy',
      title: 'The letter',
      body: 'The coach asked the room who should wear the C, and it was close. Two names came back, and one of them is yours. The other belongs to a veteran who has been here longer than the coach and has never once asked for anything. Everybody is waiting to see what you do with it.',
      options: [
        {
          label: 'Take the C', effect: 'Wear the weight',
          apply: (cc) => { const m = mor(cc, 8); const f = fan(cc, 11); const h = hp(cc, -2); flag(cc, 'captain'); return `Captain of ${nhlTeamLabelOf(cc.team)}. You stood up in the room, said four sentences and sat down, and it was enough. Morale +${m}, fanbase +${f}, health ${h}, and every loss is your fault now.`; },
        },
        {
          label: 'Take an A and stay a player', effect: 'Half the weight',
          apply: (cc) => { const m = mor(cc, 6); const f = fan(cc, 4); flag(cc, 'alternate'); return `An A on the shoulder, a voice in the room and no press conferences after losses. The veteran got the C and thanked you for it. Morale +${m}, fanbase +${f}.`; },
        },
        {
          label: 'Push it to the older guy', effect: 'Pass the torch back',
          apply: (cc) => { const m = mor(cc, 5); const f = fan(cc, 6); flag(cc, 'roomBoss'); return `You stood up and said it should be him. He cried a little in the meeting and pretended he did not. Morale +${m}, fanbase +${f}, and the room noticed who did that.`; },
        },
      ],
    });
  }

  if (c.ovr < 84 || c.morale < 62) {
    deck.push({
      id: 'nhlA_healthy_scratch',
      category: 'lockerRoom', cooldown: 2, story: 'healthyScratch',
      title: 'Healthy scratch',
      body: 'The coach reads the lineup at the morning skate and your name is not in it. Nobody is hurt. You will watch from the press box in a suit that suddenly feels ridiculous, next to a guy from the radio who keeps asking how you are doing.',
      options: [
        {
          label: 'Skate until they cut the lights', effect: 'Answer with work',
          apply: (cc) => { const g = rate(cc, 2); const m = mor(cc, -3); const h = hp(cc, -2); return `Extra ice every day for a month with the other scratches and an assistant who never goes home. It was miserable and it worked. Rating +${g}, morale ${m}, health ${h}.`; },
        },
        {
          label: 'Ask him what he actually wants', effect: 'Honest meeting',
          apply: (cc) => { const m = mor(cc, 7); const g = rate(cc, 1); return `Forty minutes of tape and one clear answer: win more battles on the wall. You knew what to fix, and that helped more than anything. Morale +${m}, rating +${g}.`; },
        },
        {
          label: 'Vent to a reporter', effect: 'Go public',
          apply: (cc) => { const f = fan(cc, 7); const m = mor(cc, -6); const h = heatUp(cc, 6); return `The quote led the broadcast and the fans took your side. The coach did not. Fanbase +${f}, morale ${m}, heat now ${h}.`; },
        },
      ],
    });
  }

  /* ------------------------------------------------------------------ *
   * 3. MEDIA AND FAME
   * ------------------------------------------------------------------ */

  if (yrs >= 1) {
    deck.push({
      id: 'nhlA_bad_presser',
      category: 'media', cooldown: 1,
      title: 'Six words after a 6-1 loss',
      body: 'Somebody asked about effort after a 6-1 loss and you said to ask the guys who were actually trying. Six words, said in a hallway with your gear still on. By the time you got to your car it was a graphic on three different shows and your phone had forty messages on it, none of them from teammates.',
      options: [
        {
          label: 'Apologize to the room first', effect: 'Clean it up',
          apply: (cc) => { const m = mor(cc, 7); const f = fan(cc, -3); heatUp(cc, -4); return `You said it to their faces at the morning skate before you said it to a camera. A couple of the fans wanted the fight. The room did not. Morale +${m}, fanbase ${f}.`; },
        },
        {
          label: 'Double down on camera', effect: 'No takebacks',
          apply: (cc) => { const f = fan(cc, 10); const m = mor(cc, -7); const h = heatUp(cc, 7); return `You said it again, slower. The clip has four million views and two teammates have muted you in the group chat. Fanbase +${f}, morale ${m}, heat now ${h}.`; },
        },
        {
          label: 'Go silent for a week', effect: 'Wait it out',
          apply: (cc) => { const m = mor(cc, 3); const f = fan(cc, -1); heatUp(cc, -3); return `No comment, seven days, and a different team blew a lead on national TV. Story dead. Morale +${m}, fanbase ${f}.`; },
        },
      ],
    });
  }

  if (yrs >= 1 && rng() < 0.65) {
    deck.push({
      id: 'nhlA_bench_cam',
      category: 'media', cooldown: 1,
      title: 'Bench cam got you',
      body: 'Twelve million views of your face during a line change, staring at nothing like you had just remembered something terrible. Someone added sad piano. Your cousins will not stop sending it, and a talk show host did a bit about it.',
      options: [
        {
          label: 'Post it yourself with a caption', effect: 'Own the joke',
          apply: (cc) => { const f = fan(cc, 11); const m = mor(cc, 5); return `You posted it with the caption "me thinking about the power play" and beat everybody to the punchline. Fanbase +${f}, morale +${m}.`; },
        },
        {
          label: 'Put it on a shirt', effect: 'Monetize the clip',
          apply: (cc) => { const got = cash(cc, 0.15); const f = fan(cc, 8); const m = mor(cc, -2); return `Your face, the sad piano, a shirt. Sold out in a weekend, ${got}M after the split, and a part of you will never recover. Fanbase +${f}, morale ${m}.`; },
        },
        {
          label: 'Never acknowledge it', effect: 'Total silence',
          apply: (cc) => { const m = mor(cc, 3); const g = rate(cc, 1); return `Head down, mouth shut, extra time on the ice. The meme died in nine days and you got better in the meantime. Morale +${m}, rating +${g}.`; },
        },
      ],
    });
  }

  if (CANADA.includes(c.team)) {
    deck.push({
      id: 'nhlA_canadian_market',
      category: 'media', cooldown: 1,
      title: 'Seven panelists and a countdown clock',
      body: `In ${teamName} there is a television show about the morning skate. A show. About the skate. There are radio hosts who know your line combinations better than your mother does, and a guy at the grocery store asked about your shot selection while you were buying eggs.`,
      options: [
        {
          label: 'Do every hit, be the guy', effect: 'Face of the market',
          apply: (cc) => { const f = fan(cc, 13); const m = mor(cc, -5); return `Radio, TV, the morning show, the pregame show, the postgame show. You became the whole conversation and it never stopped. Fanbase +${f}, morale ${m}.`; },
        },
        {
          label: 'Hockey answers only, forever', effect: 'Say nothing well',
          apply: (cc) => { const m = mor(cc, 5); const f = fan(cc, 2); return `Ten minutes of words a day with no news in them: one game at a time, good effort, get pucks deep. An art form. Morale +${m}, fanbase +${f}.`; },
        },
        {
          label: 'Delete the apps until June', effect: 'Go offline',
          apply: (cc) => { const m = mor(cc, 9); const f = fan(cc, -4); const h = hp(cc, 3); flag(cc, 'offline'); return `You have no idea what they are saying about you and you sleep great. A few fans called you aloof. You did not see it. Morale +${m}, health +${h}, fanbase ${f}.`; },
        },
      ],
    });
  }

  if (c.fanbase >= 45 || c.ovr >= 84) {
    deck.push({
      id: 'nhlA_doc_crew',
      category: 'media', cooldown: 2,
      title: 'The documentary crew',
      body: 'A streaming service wants cameras in your kitchen, your truck and on your rehab table for a whole season. Ten episodes in the fall, a producer who calls you buddy, and a contract with a paragraph about "authentic moments" your agent read twice and did not love.',
      options: [
        {
          label: 'Full access, everything', effect: 'All access money',
          apply: (cc) => { const got = cash(cc, 1.2); const f = fan(cc, 15); const m = mor(cc, -6); return `They filmed your best month and your worst week, and the worst week is the episode everybody watched. ${got}M earned, fanbase +${f}, morale ${m}.`; },
        },
        {
          label: 'Rink only, no house', effect: 'Draw the line',
          apply: (cc) => { const got = cash(cc, 0.4); const f = fan(cc, 7); const m = mor(cc, 2); return `Practice, bus, room, done, and the front door stayed shut. It was a good show and it was still yours. ${got}M earned, fanbase +${f}, morale +${m}.`; },
        },
        {
          label: 'Pass entirely', effect: 'Keep it private',
          apply: (cc) => { const m = mor(cc, 7); const h = hp(cc, 2); return `You said thanks and no thanks. Your summer belongs to you, and so does your kitchen. Morale +${m}, health +${h}.`; },
        },
      ],
    });
  }

  if (c.ovr >= 83 && c.allStars === 0 && yrs >= 2) {
    deck.push({
      id: 'nhlA_allstar_snub',
      category: 'media', cooldown: 2, story: 'allStarSnub',
      title: 'The All Star snub',
      body: 'Top of your team in ice time, top three in scoring, and the All-Star list came out without your name on it anywhere. A guy with half your points made it because somebody had to go from his team. Your phone is full of people angry on your behalf.',
      options: [
        {
          label: 'Say it stings, on the record', effect: 'Be honest',
          apply: (cc) => { const f = fan(cc, 9); const m = mor(cc, -3); return `You said it stings and you meant it. Every fan account in the league defended you for a week. Fanbase +${f}, morale ${m}.`; },
        },
        {
          label: 'Take the four days with the kids', effect: 'Free vacation',
          apply: (cc) => { const h = hp(cc, 9); const m = mor(cc, 7); return `A beach instead of a skills competition, sand castles instead of a hardest shot contest. You came back rested and a little tanned. Health +${h}, morale +${m}.`; },
        },
        {
          label: 'Answer on the ice in February', effect: 'Let it fuel you',
          apply: (cc, r) => { const g = rate(cc, 1); const m = mor(cc, 4); if (r() < 0.5) { const f = fan(cc, 8); return `Eleven points in the six games after the break, and every one of them felt like a reply. Rating +${g}, morale +${m}, fanbase +${f}.`; } return `Quietly excellent for a month, and nobody wrote about it. You knew. Rating +${g}, morale +${m}.`; },
        },
      ],
    });
  }

  if (c.ovr >= 88 || c.fanbase >= 72) {
    deck.push({
      id: 'nhlA_cover_athlete',
      category: 'media', cooldown: 99, story: 'coverAthlete',
      title: 'The cover',
      body: 'They want you on the front of the hockey video game. A photo shoot in July, a motion capture suit, and your billet mom buying nine copies of a game she cannot play. There is also the cover curse, which everybody mentions and nobody believes in, except a little.',
      options: [
        {
          label: 'Take the cover and the check', effect: 'Cover money',
          apply: (cc) => { const got = cash(cc, 0.9); const f = fan(cc, 13); const m = mor(cc, -2); flag(cc, 'coverAthlete'); return `${got}M and your face on every shelf in every store. Fanbase +${f}, morale ${m}, and everyone keeps mentioning a curse.`; },
        },
        {
          label: 'Split it with your linemate', effect: 'Share the shine',
          apply: (cc) => { const got = cash(cc, 0.5); const f = fan(cc, 8); const m = mor(cc, 6); flag(cc, 'coverAthlete'); return `Two of you on the cover, ${got}M each, and a photo shoot where neither of you could stop laughing. Fanbase +${f}, morale +${m}, and the room loved it.`; },
        },
        {
          label: 'Decline, superstition wins', effect: 'Dodge the curse',
          apply: (cc) => { const m = mor(cc, 7); const h = hp(cc, 3); return `No cover, no curse, no motion capture suit in July. Your summer stayed quiet. Morale +${m}, health +${h}.`; },
        },
      ],
    });
  }

  /* ------------------------------------------------------------------ *
   * 4. THE BODY AND THE GRIND
   * ------------------------------------------------------------------ */

  if (yrs >= 1 && (c.health <= 94 || rng() < 0.45)) {
    deck.push({
      id: 'nhlA_quiet_room',
      category: 'body', cooldown: 2,
      title: 'The quiet room',
      body: 'You took a shoulder up high in the second period, and now the trainer is holding a light in front of your eyes and asking what city you are in. You know the answer. You think you know the answer. The bench is yelling for you to get back out there and the trainer is not.',
      options: [
        {
          label: 'Full protocol, no shortcuts', effect: 'Do it right',
          apply: (cc) => { const h = hp(cc, 18); const m = mor(cc, 3); const f = fan(cc, -3); flag(cc, 'headSafe'); return `A dark room, no screens, the tests every day until they came back clean. Cleared properly two weeks later with zero symptoms. Health +${h}, morale +${m}, fanbase ${f}. Best decision of your career.`; },
        },
        {
          label: 'Tell the truth and sit tonight', effect: 'Honest answer',
          apply: (cc) => { const h = hp(cc, 11); const m = mor(cc, 5); flag(cc, 'headSafe'); return `You told them the room was spinning and watched the third period from the bench with a towel on your head. Health +${h}, morale +${m}.`; },
        },
        {
          label: 'Say you are fine, go back out', effect: 'Hide it',
          apply: (cc) => { const h = hp(cc, -16); const m = mor(cc, -7); const f = fan(cc, 5); flag(cc, 'hidConcussion'); return `You played nine more minutes, the crowd loved it, and you lost the rest of the month to headaches anyway. Health ${h}, morale ${m}, fanbase +${f}. Not worth it.`; },
        },
      ],
    });
  }

  /* Round 920: the card tells a playoff story, so it waits for a season that
     had playoff games in it (poGames is the season line's own count, never a
     parse of the result string). It used to promise a second round to men
     whose team had missed the playoffs. */
  if (yrs >= 2 && (c.seasons[yrs - 1]?.poGames ?? 0) > 0) {
    deck.push({
      id: 'nhlA_broken_hand',
      category: 'body', cooldown: 2,
      title: 'Playoff run, broken hand',
      body: 'A slash on the hands in the playoffs, and the scan is not close. The doctor is not smiling. He says a needle before every game, a cast liner under the glove, and you can probably hold the stick with two fingers. Probably.',
      options: [
        {
          label: 'Play with the freeze', effect: 'Playoff legend',
          apply: (cc) => { const f = fan(cc, 13); const h = hp(cc, -13); const m = mor(cc, 6); const g = rate(cc, -1); flag(cc, 'playoffWarrior'); return `A needle before every game and a stick you could barely feel. They still talk about it in that city. Fanbase +${f}, morale +${m}, health ${h}, rating ${g}.`; },
        },
        {
          label: 'Sit two games, then come back', effect: 'Split the difference',
          apply: (cc) => { const h = hp(cc, 6); const m = mor(cc, 2); const f = fan(cc, -3); return `Two games in a suit, a lot of ice on the hand, and you came back with a little more grip. Health +${h}, morale +${m}, fanbase ${f}.`; },
        },
        {
          label: 'Shut it down and get it fixed', effect: 'Fix it now',
          apply: (cc) => { const h = hp(cc, 15); const m = mor(cc, -4); const f = fan(cc, -7); return `Surgery on Monday, two plates and six screws, full grip by August. Some fans called it soft. Health +${h}, morale ${m}, fanbase ${f}.`; },
        },
      ],
    });
  }

  if (!isG && c.health <= 88) {
    deck.push({
      id: 'nhlA_shoulder_surgery',
      category: 'body', cooldown: 3,
      title: 'The shoulder',
      body: 'It comes out on faceoffs now, and once in your sleep, which was a new kind of morning. The surgeon says five months of recovery, which means no camp and no October. The trainer says you could probably play through it with the right harness. Probably again.',
      options: [
        {
          label: 'Get it done in May', effect: 'Full repair',
          apply: (cc) => { const h = hp(cc, 21); const g = rate(cc, -1); const m = mor(cc, 2); flag(cc, 'shoulderFixed'); return `Labrum repaired, first surgery of your life, and a summer of very boring rehab. Health +${h}, rating ${g}, morale +${m}. It stays in the socket now.`; },
        },
        {
          label: 'Play through with a harness', effect: 'Tape it up',
          apply: (cc) => { const h = hp(cc, -9); const f = fan(cc, 6); const m = mor(cc, 3); return `A harness under the shoulder pads all year and a lot of one handed shots. The fans loved the grit. Health ${h}, fanbase +${f}, morale +${m}.`; },
        },
        {
          label: 'Rehab hard, decide in August', effect: 'Buy time',
          apply: (cc, r) => { const h = hp(cc, 9); const m = mor(cc, 2); if (r() < 0.4) { const h2 = hp(cc, -5); return `It popped out again in camp on the first faceoff and you had it done anyway. Health +${h + h2}, morale +${m}.`; } return `Twelve weeks of band work and a physio who never let you skip a day. It held. Health +${h}, morale +${m}.`; },
        },
      ],
    });
  }

  if (isG && (c.age >= 26 || c.health <= 90)) {
    deck.push({
      id: 'nhlA_goalie_hips',
      category: 'body', cooldown: 2,
      title: 'Goalie hips',
      body: 'Twenty years of dropping into the butterfly, and the labrum is fraying on both sides. You can feel it getting up off the ice now, every time. The surgeon says do it now and miss the fall, or do it at 34 when it is worse and the recovery is longer.',
      options: [
        {
          label: 'Do it now, miss the fall', effect: 'Fix the hips',
          apply: (cc) => { const h = hp(cc, 20); const g = rate(cc, -1); const m = mor(cc, -3); flag(cc, 'hipsFixed'); return `Both hips scoped in June and a backup who got your net for two months. Health +${h}, rating ${g}, morale ${m}, and you can drop into the butterfly without wincing.`; },
        },
        {
          label: 'Mobility program instead', effect: 'Manage it',
          apply: (cc) => { const h = hp(cc, 9); const g = rate(cc, 1); const m = mor(cc, 2); return `Ninety minutes of hip work every day, all summer, with bands and a foam roller and a yoga teacher who did not care that you were famous. Health +${h}, rating +${g}, morale +${m}.`; },
        },
        {
          label: 'Play through and freeze it', effect: 'Push it back',
          apply: (cc) => { const h = hp(cc, -10); const f = fan(cc, 7); const m = mor(cc, 4); return `Sixty two starts on frozen hips and an ice bath after every one. The fans called you a warrior. Your hips called you something else. Health ${h}, fanbase +${f}, morale +${m}.`; },
        },
      ],
    });
  }

  if (yrs >= 1) {
    deck.push({
      id: 'nhlA_sleep_program',
      category: 'body', cooldown: 2,
      title: 'The sleep guy',
      body: 'The team hired a sleep scientist. He wants your phone out of the bedroom, blackout curtains taped up in every hotel room on the road, and a nap schedule printed on the back of your door. Half the room thinks he is a genius and the other half thinks he is a cult.',
      options: [
        {
          label: 'Full buy in', effect: 'Sleep like a pro',
          apply: (cc) => { const h = hp(cc, 10); const g = rate(cc, 1); const m = mor(cc, -2); flag(cc, 'sleepPro'); return `Nine hours a night, no phone after ten, and a sleep tracker that judged you. It worked, annoyingly. Health +${h}, rating +${g}, morale ${m}.`; },
        },
        {
          label: 'Just the naps and the curtains', effect: 'Half measure',
          apply: (cc) => { const h = hp(cc, 5); const m = mor(cc, 2); return `Twenty minute naps before every game and a roll of tape for every hotel window. Good enough. Health +${h}, morale +${m}.`; },
        },
        {
          label: 'Keep the 2am gaming', effect: 'Unplug from him',
          apply: (cc) => { const m = mor(cc, 7); const h = hp(cc, -6); return `You and three teammates online until the sun came up, headsets on, the sleep guy shaking his head. Morale +${m}, health ${h}.`; },
        },
      ],
    });
  }

  if (c.age <= 28) {
    deck.push({
      id: 'nhlA_skating_coach',
      category: 'body', cooldown: 2,
      title: 'Rebuilding the stride',
      body: 'A power skating coach watched your tape and wants to take your stride apart down to the studs: knee bend, push, recovery, all of it. She says it will feel wrong until roughly Christmas and then it will feel like cheating.',
      options: [
        {
          label: 'Commit to the whole summer', effect: 'Rebuild it',
          apply: (cc) => { const g = rate(cc, 2); const m = mor(cc, -4); const h = hp(cc, 3); flag(cc, 'strideRebuilt'); return `Six days a week of drills you thought you left behind at nine years old. Two steps quicker out of the turn by October. Rating +${g}, health +${h}, morale ${m}.`; },
        },
        {
          label: 'Do the light version', effect: 'Tweak it',
          apply: (cc) => { const g = rate(cc, 1); const m = mor(cc, 2); return `Edges and crossovers twice a week and nothing too drastic. A little quicker, a lot less sore. Rating +${g}, morale +${m}.`; },
        },
        {
          label: 'Trust what got you here', effect: 'Do not touch it',
          apply: (cc) => { const m = mor(cc, 7); const f = fan(cc, 2); return `Nobody has ever fixed your stride before and nobody starts now. You skated how you skate. Morale +${m}, fanbase +${f}.`; },
        },
      ],
    });
  }

  if (rng() < 0.7) {
    deck.push({
      id: 'nhlA_nutritionist',
      category: 'body', cooldown: 2,
      title: 'The nutritionist versus the postgame pizza',
      body: 'The new team nutritionist wants to kill the four slice tradition after home wins and replace it with something called a recovery bowl. The room has extremely strong feelings about this, and they are all looking at you to see which side you are on.',
      options: [
        {
          label: 'Follow the plan exactly', effect: 'Eat like a pro',
          apply: (cc) => { const h = hp(cc, 9); const g = rate(cc, 1); const m = mor(cc, -3); flag(cc, 'cleanEater'); return `Recovery bowls, meal prep, no sugar after noon. You showed up to camp at 6 percent body fat and missing pizza. Health +${h}, rating +${g}, morale ${m}.`; },
        },
        {
          label: 'Clean on the road, pizza at home', effect: 'Meet in the middle',
          apply: (cc) => { const h = hp(cc, 5); const m = mor(cc, 3); return `The plan on the road, the four slices after home wins. Best of both, mostly. Health +${h}, morale +${m}.`; },
        },
        {
          label: 'Order the pizza, lead the room', effect: 'Tradition first',
          apply: (cc) => { const m = mor(cc, 9); const h = hp(cc, -5); const f = fan(cc, 2); flag(cc, 'roomGuy'); return `Eleven boxes on the plane after a road win and a nutritionist who sat in the front row in silence. Morale +${m}, fanbase +${f}, health ${h}.`; },
        },
      ],
    });
  }

  /* ------------------------------------------------------------------ *
   * 5. HOCKEY CULTURE
   * ------------------------------------------------------------------ */

  if (yrs >= 1) {
    deck.push({
      id: 'nhlA_playoff_beard',
      category: 'hockey', cooldown: 1,
      title: 'The playoff beard',
      body: 'The playoffs start and the razors go in a drawer until it is over. Everybody on the team is in, from the rookies to the trainers. Yours has come in patchy since juniors, in three separate places that do not connect, and the boys have noticed.',
      options: [
        {
          label: 'Grow whatever shows up', effect: 'Honor the code',
          apply: (cc) => { const m = mor(cc, 6); const f = fan(cc, 6); flag(cc, 'beardCommitted'); return `Three good patches and a lot of hope. It looked terrible and nobody said a word, because that is the code. Morale +${m}, fanbase +${f}.`; },
        },
        {
          label: 'Shave and say it is faster', effect: 'Break the code',
          apply: (cc) => { const m = mor(cc, -4); const f = fan(cc, 4); const g = rate(cc, 1); return `Clean face, zero superstition, all business. Two veterans did not talk to you for a week. Morale ${m}, fanbase +${f}, rating +${g}.`; },
        },
        {
          label: 'Bleach the patchy one blond', effect: 'Lean all the way in',
          apply: (cc) => { const f = fan(cc, 10); const m = mor(cc, 4); return `You leaned all the way into it, and half the arena showed up with bleached chins by the next home game. Fanbase +${f}, morale +${m}.`; },
        },
      ],
    });
  }

  if (!isG && yrs >= 1) {
    deck.push({
      id: 'nhlA_unwanted_fight',
      category: 'hockey', cooldown: 2,
      title: 'He dropped his gloves and looked at you',
      body: 'You have never fought in your life, not once, not even in junior. He is six foot four, he has done this forty times, and he is already circling. The linesmen are backing off and the whole building is on its feet.',
      options: [
        {
          label: 'Drop them and hang on', effect: 'Answer the bell',
          apply: (cc, r) => { const f = fan(cc, 12); const m = mor(cc, 6); const h = hp(cc, r() < 0.5 ? -6 : -10); flag(cc, 'answeredTheBell'); return `You threw two, ate five and grabbed his sweater like your life depended on it, which it did. Fanbase +${f}, morale +${m}, health ${h}. Nobody questions you again.`; },
        },
        {
          label: 'Skate away and go score', effect: 'Answer differently',
          apply: (cc) => { const g = rate(cc, 1); const f = fan(cc, -2); const m = mor(cc, 3); return `You skated away to boos, then scored on the next shift and pointed at his penalty box. Rating +${g}, morale +${m}, fanbase ${f}.`; },
        },
        {
          label: 'Let the tough guy handle it', effect: 'Send the cavalry',
          apply: (cc) => { const m = mor(cc, 4); const f = fan(cc, 2); flag(cc, 'oweTheEnforcer'); return `Your team's tough guy was over the boards in two seconds and handled it. Morale +${m}, fanbase +${f}, and you owe him dinner forever.`; },
        },
      ],
    });
  }

  if (yrs >= 1) {
    deck.push({
      id: 'nhlA_enforcer_teammate',
      category: 'hockey', cooldown: 2,
      title: 'The tough guy is getting waived',
      body: 'He fought everyone in the league for you and the other young guys. His knees are gone, he cannot keep up anymore, and management wants his roster spot for a kid who can. He has been the heart of the room for years and he is going on waivers tomorrow.',
      options: [
        {
          label: 'Back him publicly', effect: 'Stand up for him',
          apply: (cc) => { const m = mor(cc, 7); const f = fan(cc, 6); heatUp(cc, 3); flag(cc, 'roomBoss'); return `You stood at your stall and said what everyone was thinking. Morale +${m}, fanbase +${f}, and the GM has a note about you now.`; },
        },
        {
          label: 'Buy him the send off dinner', effect: 'Private class',
          apply: (cc) => { const spent = cash(cc, -0.03); const m = mor(cc, 8); return `Twenty three guys, one back room, ${spent}M, and every story about every fight told twice. Morale +${m}. He cried at the toast.`; },
        },
        {
          label: 'Say nothing, it is a business', effect: 'Stay out of it',
          apply: (cc) => { const m = mor(cc, -3); const g = rate(cc, 1); return `You kept your head down and your minutes. It is a business. It did not feel like one. Morale ${m}, rating +${g}.`; },
        },
      ],
    });
  }

  if (rng() < 0.7) {
    deck.push({
      id: 'nhlA_superstition',
      category: 'hockey', cooldown: 2,
      title: 'The routine got out of hand',
      body: isG
        ? 'Same tape job, same water bottle angle, same three taps on each post, the same stretch in the same corner of the room, and now a specific song at a specific volume. The whole routine is forty minutes long and the backup has started timing it.'
        : 'Right skate first, no stick touching the floor before warmups, the same stall in every visiting room, and now you need the same parking spot or the whole day is ruined. Last week somebody parked in it and you were not right until the second period.',
      options: [
        {
          label: 'Protect the routine at all costs', effect: 'Feed the ritual',
          apply: (cc) => { const m = mor(cc, 7); const g = rate(cc, 1); const h = hp(cc, -2); flag(cc, 'superstitious'); return `You arrive 90 minutes earlier than anybody else to guarantee the spot, and you have never felt more ready. Morale +${m}, rating +${g}, health ${h}.`; },
        },
        {
          label: 'Let a teammate break one on purpose', effect: 'Break the spell',
          apply: (cc) => { const m = mor(cc, -3); const h = hp(cc, 5); const f = fan(cc, 3); return `He touched your stick to the floor in warmups, grinning, and you played fine. You hated that you played fine. Morale ${m}, health +${h}, fanbase +${f}.`; },
        },
        {
          label: 'Tell the media the whole list', effect: 'Feature material',
          apply: (cc) => { const f = fan(cc, 9); const m = mor(cc, 2); return `You walked a reporter through every step on camera. Every rival crowd chants about the water bottle now. Fanbase +${f}, morale +${m}.`; },
        },
      ],
    });
  }

  if (yrs >= 2) {
    deck.push({
      id: 'nhlA_chirp_war',
      category: 'hockey', cooldown: 1,
      title: 'The chirp war',
      body: 'Their center has been in your ear for three seasons: your hair, your contract, your mother\'s minivan. This time he brought up your plus minus in front of a hot mic, and the clip is already everywhere.',
      options: [
        {
          label: 'Out chirp him on the broadcast', effect: 'Win the mic',
          apply: (cc) => { const f = fan(cc, 11); const m = mor(cc, 4); const h = heatUp(cc, 4); return `You found a mic of your own, and your line about his contract ran on every show in two countries. Fanbase +${f}, morale +${m}, heat now ${h}.`; },
        },
        {
          label: 'Say nothing, beat him head to head', effect: 'Scoreboard reply',
          apply: (cc) => { const g = rate(cc, 1); const m = mor(cc, 5); const f = fan(cc, 4); return `Not a word. Four points against him in the next two meetings, and you skated past his bench after every one. Rating +${g}, morale +${m}, fanbase +${f}.`; },
        },
        {
          label: 'Send him a case of beer', effect: 'Disarm him',
          apply: (cc) => { const spent = cash(cc, -0.002); const m = mor(cc, 6); const f = fan(cc, 6); flag(cc, 'chirpTruce'); return `${spent}M of good beer to his hotel with a note that just said "see you Thursday" ended a three year war. Morale +${m}, fanbase +${f}.`; },
        },
      ],
    });
  }

  if (c.seasons.some(s => s.teamResult !== 'Missed the playoffs')) {
    deck.push({
      id: 'nhlA_handshake_line',
      category: 'hockey', cooldown: 1,
      title: 'The handshake line',
      body: 'The series is over and the hardest line in sports starts moving. Twenty guys who spent two weeks trying to hurt each other, all telling the truth for nine seconds at a time. You have a few things you could say.',
      options: [
        {
          label: 'Look every one of them in the eye', effect: 'Do it properly',
          apply: (cc) => { const m = mor(cc, 8); const f = fan(cc, 7); flag(cc, 'respectedTheLine'); return `Every glove off, every hand, every pair of eyes. You told their goalie he stole it and you meant it. Morale +${m}, fanbase +${f}.`; },
        },
        {
          label: 'Get through it and get out', effect: 'Just survive it',
          apply: (cc) => { const m = mor(cc, 2); const g = rate(cc, 1); return `Head down, glove taps, tunnel. You did not say a word to anybody until August. Morale +${m}, rating +${g}, and you used the whole summer as fuel.`; },
        },
        {
          label: 'Tell their captain you will see him next year', effect: 'Plant a flag',
          apply: (cc) => { const f = fan(cc, 9); const m = mor(cc, 5); heatUp(cc, 3); return `You said it quietly. The camera caught it anyway, and the rivalry doubled overnight. Fanbase +${f}, morale +${m}.`; },
        },
      ],
    });
  }

  if (!isG && yrs >= 1) {
    deck.push({
      id: 'nhlA_three_teeth',
      category: 'hockey', cooldown: 2,
      title: 'Three teeth and a team photo',
      body: 'A deflection took out the front three on Tuesday. You finished the shift and the game. The team dentist can build the bridge now, which means two games out, or you can wait until June like everybody else and smile for the team photo the way you are.',
      options: [
        {
          label: 'Fix it now, miss two games', effect: 'Get the bridge',
          apply: (cc) => { const spent = cash(cc, -0.02); const h = hp(cc, 5); const m = mor(cc, 5); const f = fan(cc, -2); return `${spent}M of dental work, two nights in a suit, and a smile your mom recognizes again. Health +${h}, morale +${m}, fanbase ${f}.`; },
        },
        {
          label: 'Play toothless until June', effect: 'Full hockey player',
          apply: (cc) => { const f = fan(cc, 9); const m = mor(cc, 3); const h = hp(cc, -3); flag(cc, 'toothless'); return `You played the rest of the year with a gap you could fit a puck through. The team photo is legendary. Fanbase +${f}, morale +${m}, health ${h}.`; },
        },
        {
          label: 'Get the flipper, never smile', effect: 'Removable solution',
          apply: (cc) => { const spent = cash(cc, -0.004); const m = mor(cc, 3); const f = fan(cc, 4); return `A ${spent}M piece of plastic that lives in your glove during games and in your pocket at dinner. Morale +${m}, fanbase +${f}.`; },
        },
      ],
    });
  }

  /* ------------------------------------------------------------------ *
   * 6. THE SEASON
   * ------------------------------------------------------------------ */

  if (yrs >= 1) {
    deck.push({
      id: 'nhlA_western_canada_trip',
      category: 'season', cooldown: 1,
      title: 'The Western Canada trip',
      body: 'Six nights, four cities, three time zones and minus 31 in the middle of it. Morning skates in rinks older than your parents, buses at 5am, hotel ballrooms turned into video rooms. Nobody comes home from this trip the same, and the coach knows it.',
      options: [
        {
          label: 'Lead the bonding trip', effect: 'Build the room',
          apply: (cc) => { const spent = cash(cc, -0.02); const m = mor(cc, 9); const h = hp(cc, -3); flag(cc, 'roomGuy'); return `You booked the whole steakhouse in Calgary, paid the ${spent}M and made the rookies give speeches. Morale +${m}, health ${h}. Went 3-1 on the trip.`; },
        },
        {
          label: 'Hotel, ice bath, sleep, repeat', effect: 'Pro trip',
          apply: (cc) => { const h = hp(cc, 8); const g = rate(cc, 1); const m = mor(cc, -2); return `Nobody saw you outside a rink or a hotel room for six days, and you were the freshest guy on the ice every night. Health +${h}, rating +${g}, morale ${m}.`; },
        },
        {
          label: 'Bring the family along', effect: 'People not hockey',
          apply: (cc) => { const spent = cash(cc, -0.04); const m = mor(cc, 8); const h = hp(cc, -2); return `Four flights, a suite, two car seats and a lot of snowsuits, ${spent}M all in. Morale +${m}, health ${h}, and Vancouver was worth it.`; },
        },
      ],
    });
  }

  if (rng() < 0.55) {
    deck.push({
      id: 'nhlA_outdoor_game',
      category: 'season', cooldown: 2,
      title: 'The outdoor game',
      body: 'A football stadium, 68,000 people, real snow coming down sideways, and ice the crew has been babysitting since Tuesday under giant tarps. It is not good ice. It is also the best thing you have ever seen, and your whole family is in the stands in matching toques.',
      options: [
        {
          label: 'Play it like a Cup game', effect: 'Send it',
          apply: (cc) => { const f = fan(cc, 12); const m = mor(cc, 6); const h = hp(cc, -5); flag(cc, 'outdoorGame'); return `Two points, one hard fall on a rut by the far blue line, and a photo that hangs in your parents\' hallway forever. Fanbase +${f}, morale +${m}, health ${h}.`; },
        },
        {
          label: 'Manage the bad ice, no heroics', effect: 'Survive the surface',
          apply: (cc) => { const h = hp(cc, 4); const g = rate(cc, 1); const f = fan(cc, 2); return `Chip and chase, simple plays, nothing fancy on ice that bounced like a driveway. No tweaked groin. Health +${h}, rating +${g}, fanbase +${f}.`; },
        },
        {
          label: 'Bring the whole family down to the alumni skate', effect: 'Make the memory',
          apply: (cc) => { const m = mor(cc, 9); const f = fan(cc, 7); return `The day before the game, your dad skated on that ice at 61 years old in his old beer league sweater. Morale +${m}, fanbase +${f}.`; },
        },
      ],
    });
  }

  if (yrs >= 2) {
    deck.push({
      id: 'nhlA_deadline_rumor',
      category: 'season', cooldown: 2,
      title: 'Your name is in the deadline graphic',
      body: `A TV insider put you on the trade board at 8am. Your partner saw it before you did, your agent has called twice, and the ${teamName} group chat has gone very quiet. Practice is at 11.`,
      options: [
        {
          label: 'Ask the GM straight up', effect: 'Get the truth',
          apply: (cc) => { const m = mor(cc, 6); const f = fan(cc, 2); return `You knocked on his door after practice and asked. He gave you a real answer, which almost never happens. Morale +${m}, fanbase +${f}.`; },
        },
        {
          label: 'Tell the media you want to stay', effect: 'Public loyalty',
          apply: (cc) => { const f = fan(cc, 10); const m = mor(cc, 3); flag(cc, 'saidStay'); return `You said you love it here and want to finish here. The city put your quote on a mural by Friday. Fanbase +${f}, morale +${m}.`; },
        },
        {
          label: 'Tell your agent to find a contender', effect: 'Chase a Cup',
          apply: (cc) => { const m = mor(cc, 5); const f = fan(cc, -7); flag(cc, 'askedOut'); return `Word got out fast, the way it always does. Morale +${m}, fanbase ${f}, and your phone did not stop for a week.`; },
        },
      ],
    });
  }

  if (yrs >= 1 && (c.morale < 75 || rng() < 0.5)) {
    deck.push({
      id: 'nhlA_coach_fired',
      category: 'season', cooldown: 2,
      title: 'They fired the coach on a Tuesday',
      body: 'Eleven games under .500 and he is gone before the morning skate. You found out from a push notification in the parking lot. The assistant runs practice in a track suit, the GM is coming down at noon to talk to the room, and nobody is making eye contact with anybody.',
      options: [
        {
          label: 'Say the players failed him', effect: 'Take the blame',
          apply: (cc) => { const m = mor(cc, 6); const f = fan(cc, 7); flag(cc, 'accountable'); return `You stood in front of the cameras and said the players got him fired. The only honest quote in the whole room. Morale +${m}, fanbase +${f}.`; },
        },
        {
          label: 'Play your way into the new guy\'s plans', effect: 'New start',
          apply: (cc) => { const g = rate(cc, 2); const m = mor(cc, 3); const h = hp(cc, -3); return `Two weeks of auditioning like a rookie for a coach who did not know your name on Monday. By Friday he did. Rating +${g}, morale +${m}, health ${h}.`; },
        },
        {
          label: 'Admit you tuned him out in November', effect: 'Brutal honesty',
          apply: (cc) => { const f = fan(cc, 4); const m = mor(cc, -5); const h = heatUp(cc, 6); return `You said the room stopped listening in November. True, and the answer followed you for two seasons. Fanbase +${f}, morale ${m}, heat now ${h}.`; },
        },
      ],
    });
  }

  if (yrs >= 1) {
    deck.push({
      id: 'nhlA_losing_streak',
      category: 'season', cooldown: 2,
      title: 'Nine in a row',
      body: `Nine straight losses and the city is taking it personally. Someone wore a bag over their head at the ${teamName} home game and the camera stayed on him for a while. The radio callers have moved from angry to sad, which is worse.`,
      options: [
        {
          label: 'Call a players only meeting', effect: 'Clear the air',
          apply: (cc) => { const m = mor(cc, 8); const g = rate(cc, 1); flag(cc, 'roomBoss'); return `Forty minutes, no coaches, some yelling, one apology nobody expected. Morale +${m}, rating +${g}, and you won the next night.`; },
        },
        {
          label: 'Buy out the bar for the fans after a win', effect: 'Reconnect with the city',
          apply: (cc) => { const spent = cash(cc, -0.03); const f = fan(cc, 11); const m = mor(cc, 4); return `When the streak finally ended you bought the whole bar across the street a round. ${spent}M of tabs and a lot of goodwill. Fanbase +${f}, morale +${m}.`; },
        },
        {
          label: 'Tell the city they are entitled', effect: 'Push back',
          apply: (cc) => { const f = fan(cc, -9); const m = mor(cc, 3); const h = heatUp(cc, 8); return `You said the fans should try playing through it. The sports radio hosts got two weeks of content out of you. Fanbase ${f}, morale +${m}, heat now ${h}.`; },
        },
      ],
    });
  }

  if (yrs >= 1) {
    deck.push({
      id: 'nhlA_dads_trip',
      category: 'season', cooldown: 3,
      title: 'The dads trip',
      body: 'Two road games, one charter, and 22 fathers in matching jackets losing their minds in the press box. The team does it every year. Yours has never been on a plane like this, and he has been talking about it on the phone since October.',
      options: [
        {
          label: 'Bring your dad', effect: 'Pay it back',
          apply: (cc) => { const m = mor(cc, 10); const f = fan(cc, 5); flag(cc, 'dadsTrip'); return `He told the 5am rink stories to the whole plane, and to the pilot. Morale +${m}, fanbase +${f}.`; },
        },
        {
          label: 'Bring the coach who drove you everywhere', effect: 'Honor the other guy',
          apply: (cc) => { const m = mor(cc, 9); const f = fan(cc, 8); return `Your old minor hockey coach, 63 years old and fifteen years of driving you to rinks, cried in a hotel lobby. Morale +${m}, fanbase +${f}.`; },
        },
        {
          label: 'Bring your billet dad too, pay his way', effect: 'Bring them both',
          apply: (cc) => { const spent = cash(cc, -0.01); const m = mor(cc, 11); const f = fan(cc, 6); return `${spent}M for one extra seat and a room, and two dads who became best friends by the second game. Morale +${m}, fanbase +${f}.`; },
        },
      ],
    });
  }

  /* ------------------------------------------------------------------ *
   * 7. EVERYDAY MONEY
   * ------------------------------------------------------------------ */

  if (yrs >= 1) {
    const gear = isG ? 'pads, blocker and a painted mask' : isD ? 'sticks, skates and shin pads' : 'sticks and skates';
    deck.push({
      id: 'nhlA_gear_deal',
      category: 'money', cooldown: 2,
      title: 'The gear deal',
      body: `Two gear companies want your name on their ${gear}. The big one pays a lot more and has a commercial in mind, but their stuff feels wrong in your hands. The small one is a family shop that has made your gear since bantam and knows exactly how you like it.`,
      options: [
        {
          label: 'Sign with the big brand', effect: 'Take the money',
          apply: (cc) => { const got = cash(cc, 0.35); const f = fan(cc, 6); const g = rate(cc, -1); return `${got}M a year, a billboard, and gear you do not love. It took you until Christmas to stop thinking about it. Fanbase +${f}, rating ${g}.`; },
        },
        {
          label: 'Stay with the small shop that fits you', effect: 'Trust the feel',
          apply: (cc) => { const got = cash(cc, 0.09); const g = rate(cc, 1); const m = mor(cc, 5); return `${got}M, a handshake, and gear that is actually right. The family put your photo on the wall of the shop. Rating +${g}, morale +${m}.`; },
        },
        {
          label: 'Sign the big deal, use your old gear anyway', effect: 'The old trick',
          apply: (cc, r) => { const got = cash(cc, 0.35); if (r() < 0.35) { const f2 = fan(cc, -5); heatUp(cc, 4); return `${got}M banked, then a camera zoomed in on the repaint job during a TV timeout. Awkward phone calls followed. Fanbase ${f2}.`; } const m = mor(cc, 4); flag(cc, 'repaintedGear'); return `${got}M banked and a very careful paint job by the equipment manager. Morale +${m}. Half the league does it.`; },
        },
      ],
    });
  }

  if (c.fanbase >= 40 || yrs >= 3) {
    deck.push({
      id: 'nhlA_card_show',
      category: 'money', cooldown: 1,
      title: 'The card show',
      body: 'A convention center, a folding table with a paper tablecloth, and 900 people who want your signature on a rookie card. Four hours, a flat fee, all above board. Some of them are kids. Some of them are grown men with rolling suitcases full of your face.',
      options: [
        {
          label: 'Do the full four hours', effect: 'Sign everything',
          apply: (cc) => { const got = cash(cc, 0.08); const f = fan(cc, 8); const h = hp(cc, -2); return `Four hours, nine hundred signatures and one Sharpie per hour. ${got}M and a wrist that hated you. Fanbase +${f}, health ${h}.`; },
        },
        {
          label: 'Two hours, then take photos with kids for free', effect: 'Half paid half free',
          apply: (cc) => { const got = cash(cc, 0.04); const f = fan(cc, 12); const m = mor(cc, 6); return `${got}M for the paid part, and then every kid in line got a photo and a fist bump for nothing. Fanbase +${f}, morale +${m}.`; },
        },
        {
          label: 'Skip it, stay home with family', effect: 'Keep the weekend',
          apply: (cc) => { const m = mor(cc, 7); const h = hp(cc, 4); return `Pancakes, a walk, a nap on the couch. A Saturday that belonged to you. Morale +${m}, health +${h}.`; },
        },
      ],
    });
  }

  if (c.fanbase >= 35) {
    deck.push({
      id: 'nhlA_truck_ad',
      category: 'money', cooldown: 2,
      title: 'The truck dealership ad',
      body: 'The biggest dealer in town wants you for a local ad: a green screen, a cowboy hat they will not let you refuse, and one line of dialogue about zero percent financing. They will pay you and give you a truck. Every player who has done one of these still hears about it.',
      options: [
        {
          label: 'Say the line, take the truck', effect: 'Local legend',
          apply: (cc) => { const got = cash(cc, 0.06); buy(cc, 'a dealership truck'); const f = fan(cc, 9); const m = mor(cc, -2); flag(cc, 'truckGuy'); return `${got}M, a free truck, and a line the student section now chants at you in warmups. It follows you to the grave. Fanbase +${f}, morale ${m}.`; },
        },
        {
          label: 'Bring your linemate in and split it', effect: 'Two man bit',
          apply: (cc) => { const got = cash(cc, 0.03); const f = fan(cc, 11); const m = mor(cc, 6); return `The two of you ad libbed half of it and were genuinely funny. ${got}M each, fanbase +${f}, morale +${m}.`; },
        },
        {
          label: 'Pass, keep the dignity', effect: 'No green screen',
          apply: (cc) => { const m = mor(cc, 5); return `You said no thanks. You will never have to hear yourself say zero percent on a loop. Morale +${m}.`; },
        },
      ],
    });
  }

  if (net >= 2 || c.earnings >= 6) {
    deck.push({
      id: 'nhlA_parents_house',
      category: 'money', cooldown: 99, story: 'parentsHouse',
      title: 'The house for your parents',
      body: 'They drove you to 5am practice for twelve years in a car with a dying heater, sold the boat to pay for a summer camp, and never once told you what any of it cost. You can end their mortgage this week. They will say no. You know that already.',
      options: [
        {
          label: 'Buy them the house outright', effect: 'Pay them back',
          apply: (cc) => { const spent = cash(cc, -1.2); buy(cc, 'a house for your parents'); const m = mor(cc, 14); const f = fan(cc, 7); flag(cc, 'boughtParentsHouse'); return `${spent}M, the keys on the kitchen table under a bow, and your mother on the floor crying. Your dad pretended he had something in his eye. Morale +${m}, fanbase +${f}.`; },
        },
        {
          label: 'Pay off the mortgage they have', effect: 'Kill the debt',
          apply: (cc) => { const spent = cash(cc, -0.4); const m = mor(cc, 10); flag(cc, 'boughtParentsHouse'); return `${spent}M, one phone call to the bank, and they stay on the street they love next to the neighbors who watched every game. Morale +${m}.`; },
        },
        {
          label: 'Set them up with an income instead', effect: 'Long game',
          apply: (cc) => { const spent = cash(cc, -0.7); const m = mor(cc, 8); flag(cc, 'parentsFund'); return `${spent}M into something boring that pays them every month forever. Your dad finally fixed the heater. Morale +${m}.`; },
        },
      ],
    });
  }

  if (net >= 1.5 || c.earnings >= 5) {
    deck.push({
      id: 'nhlA_teammate_loan',
      category: 'money', cooldown: 2,
      title: 'A teammate needs 300 grand',
      body: 'His brother in law has a restaurant concept and a pitch deck with three fonts on it. Your teammate is a good guy, a great teammate, and very bad at saying no to family. He is asking you, quietly, at the back of the plane, and he looks embarrassed to be asking.',
      options: [
        {
          label: 'Lend it, no paperwork', effect: 'Trust him',
          apply: (cc, r) => { const spent = cash(cc, -0.3); if (r() < 0.4) { const back = cash(cc, 0.42); const m = mor(cc, 8); return `You lent ${spent}M on a handshake and he paid back ${back}M in two years. Morale +${m}. The place is packed every Friday.`; } const m2 = mor(cc, -5); flag(cc, 'badLoan'); return `${spent}M gone, and the restaurant lasted nine months. He still cannot look you in the eye on the bus. Morale ${m2}.`; },
        },
        {
          label: 'Gift him a smaller number and call it even', effect: 'Cap the damage',
          apply: (cc) => { const spent = cash(cc, -0.06); const m = mor(cc, 6); return `${spent}M as a gift, no strings, never mentioned again. Friendship intact, restaurant not your problem. Morale +${m}.`; },
        },
        {
          label: 'Say no and introduce him to your advisor', effect: 'Say no kindly',
          apply: (cc) => { const m = mor(cc, 3); const f = fan(cc, 1); flag(cc, 'financiallySane'); return `Your advisor took one look at the pitch deck and asked gentle questions. He was annoyed for a month and grateful for a decade. Morale +${m}, fanbase +${f}.`; },
        },
      ],
    });
  }

  if (yrs >= 1 && c.contractYears >= 2) {
    deck.push({
      id: 'nhlA_rent_or_buy',
      category: 'money', cooldown: 99,
      title: 'Rent or buy in this city',
      body: `You have ${c.contractYears} years left with ${teamName}, a realtor who will not stop texting, and a house she swears is perfect: four bedrooms, a big yard and a garage big enough to build a small rink in. Players get traded. Players also stay.`,
      options: [
        {
          label: 'Buy the house', effect: 'Put down roots',
          apply: (cc) => { const spent = cash(cc, -1.6); buy(cc, 'a house with a heated garage'); const m = mor(cc, 8); const f = fan(cc, 6); flag(cc, 'homeowner'); return `${spent}M, a mailbox with your name on it and a neighborhood that brings you casseroles after losses. Morale +${m}, fanbase +${f}.`; },
        },
        {
          label: 'Rent the condo downtown', effect: 'Stay liquid',
          apply: (cc) => { const spent = cash(cc, -0.09); const m = mor(cc, 3); flag(cc, 'financiallySane'); return `${spent}M for the year, a view of the arena, and a lease you can walk away from in March if the phone rings. Morale +${m}.`; },
        },
        {
          label: 'Rent, and buy a cabin back home instead', effect: 'Roots elsewhere',
          apply: (cc) => { const spent = cash(cc, -0.55); buy(cc, 'a lake cabin back home'); const m = mor(cc, 10); const h = hp(cc, 4); return `${spent}M on the lake you grew up swimming in, with a dock and no cell service. Morale +${m}, health +${h}.`; },
        },
      ],
    });
  }

  return deck;
}
