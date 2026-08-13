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
      title: 'The billet family',
      body: 'Sixteen years old, a spare room in a stranger\'s basement, and a billet mom who packs your lunch with a note in it. Your last junior year starts in September.',
      options: [
        { label: 'Stay in the basement', effect: 'Home cooking', apply: (cc) => { const m = mor(cc, 8); const h = hp(cc, 5); flag(cc, 'billetLoyal'); return `Stayed with the billets. Morale +${m}, health +${h}, and she still texts you on game days.`; } },
        { label: 'Get your own place downtown', effect: 'Grown man rent', apply: (cc) => { const m = mor(cc, 3); const h = hp(cc, -4); const spent = cash(cc, -0.01); return `Rented a one bedroom for ${spent}M and learned to make exactly two meals. Morale +${m}, health ${h}.`; } },
        { label: 'Move in with two teammates', effect: 'Room chemistry', apply: (cc) => { const m = mor(cc, 6); const h = hp(cc, -2); flag(cc, 'roomGuy'); return `Three juniors, one couch, zero vegetables. Morale +${m}, health ${h}, but the room loves you.`; } },
      ],
    });
  }

  if (yrs === 0) {
    deck.push({
      id: 'nhlA_junior_final_year',
      title: 'One more year of junior',
      body: 'Your coach wants you on the ice for thirty minutes a night and every faceoff that matters. It is your draft year and everyone is watching.',
      options: [
        { label: 'Play the horse minutes', effect: 'Trial by fire', apply: (cc) => { const g = rate(cc, 2); const h = hp(cc, -7); return `Ninety games including playoffs. Rating +${g}, health ${h}. Scouts saw everything.`; } },
        { label: 'Chase the scoring title', effect: 'Highlight season', apply: (cc, r) => { const g = rate(cc, 1); const f = fan(cc, 8 + Math.floor(r() * 5)); const m = mor(cc, 5); return `Led the league in points and the mixtape went everywhere. Fanbase +${f}, morale +${m}, rating +${g}.`; } },
        { label: 'Manage the load with the trainer', effect: 'Protect the body', apply: (cc) => { const h = hp(cc, 10); const m = mor(cc, 2); const f = fan(cc, -2); return `Sixty games, fresh legs in April. Health +${h}, morale +${m}, fanbase ${f}.`; } },
      ],
    });
  }

  if (yrs <= 3 && c.ovr < 78) {
    deck.push({
      id: 'nhlA_ahl_bus',
      title: 'The bus league',
      body: 'They are sending you down for conditioning. Ten hours to the next barn in a seat that does not recline and a per diem that buys gas station sushi.',
      options: [
        { label: 'Dominate until they call', effect: 'Force their hand', apply: (cc) => { const g = rate(cc, 2); const m = mor(cc, -4); flag(cc, 'ahlMonster'); return `Point a game in the A. Rating +${g}, morale ${m}, and the coaches upstairs noticed.`; } },
        { label: 'Be the leader down there', effect: 'Room respect', apply: (cc) => { const m = mor(cc, 7); const f = fan(cc, 4); const g = rate(cc, 1); return `You ran the room in the minors. Morale +${m}, fanbase +${f}, rating +${g}.`; } },
        { label: 'Let the agent make noise', effect: 'Squeaky wheel', apply: (cc, r) => { const m = mor(cc, 4); const f = fan(cc, -3); const back = r() < 0.5; if (back) { const g = rate(cc, 1); return `The agent got you recalled in three weeks. Morale +${m}, fanbase ${f}, rating +${g}.`; } flag(cc, 'agentNoise'); return `The agent got a meeting and nothing else. Morale +${m}, fanbase ${f}.`; } },
      ],
    });
  }

  if (yrs >= 1 && yrs <= 6 && c.ovr < 80) {
    deck.push({
      id: 'nhlA_waiver_wire',
      title: 'Waiver wire Saturday',
      body: 'To send you down they have to expose you first. Thirty one other teams have until noon tomorrow to change your entire life.',
      options: [
        { label: 'Phone face down, skate at 8am', effect: 'Control the controllable', apply: (cc) => { const m = mor(cc, 6); const h = hp(cc, 3); return `Cleared at noon, never checked once. Morale +${m}, health +${h}.`; } },
        { label: 'Work every contact you have', effect: 'Read the room', apply: (cc, r) => { const m = mor(cc, -3); if (r() < 0.45) { const nf = fan(cc, 5); const g = rate(cc, 1); return `Three teams were interested and your club suddenly found you a role. Morale ${m}, fanbase +${nf}, rating +${g}.`; } return `Twelve calls, zero answers, one very long morning. Morale ${m}.`; } },
        { label: 'Tell the coach you will play anywhere', effect: 'Fourth line pitch', apply: (cc) => { const m = mor(cc, 4); const g = rate(cc, 1); const f = fan(cc, 2); return `Penalty kill, fourth line, whatever. Morale +${m}, rating +${g}, fanbase +${f}. You stayed up.`; } },
      ],
    });
  }

  if (yrs === 0) {
    deck.push({
      id: 'nhlA_nhl_debut',
      title: 'Your first NHL game',
      body: `Warmup, the anthem, your parents crying in row 14 of ${teamName}. Your first shift lasts 32 seconds and you remember none of it.`,
      options: [
        { label: 'Hit the first thing that moves', effect: 'Announce yourself', apply: (cc) => { const f = fan(cc, 9); const m = mor(cc, 6); const h = hp(cc, -4); return `You ran their captain into the bench door. Fanbase +${f}, morale +${m}, health ${h}.`; } },
        { label: 'Simple first pass, live to shift two', effect: 'Coach approved', apply: (cc) => { const g = rate(cc, 1); const m = mor(cc, 5); return `Boring, clean, thirteen minutes. Rating +${g}, morale +${m}, and you were back out there Tuesday.`; } },
        { label: 'Shoot the first puck you touch', effect: 'Swing for it', apply: (cc, r) => { if (r() < 0.4) { const f = fan(cc, 14); const m = mor(cc, 12); flag(cc, 'debutGoal'); return `First shot, first goal, the puck is in a case at your mom\'s house. Fanbase +${f}, morale +${m}.`; } const f2 = fan(cc, 3); const m2 = mor(cc, -2); return `You fired it into the glass from the blue line. Fanbase +${f2}, morale ${m2}.`; } },
      ],
    });
  }

  if (yrs <= 2) {
    deck.push({
      id: 'nhlA_vet_mentor',
      title: 'The 38 year old winger',
      body: 'Two Cups, one working knee, and the locker right next to yours. He offers to drive you to the rink every morning at 7.',
      options: [
        { label: 'Ride with him every day', effect: 'Free education', apply: (cc) => { const m = mor(cc, 7); const g = rate(cc, 1); flag(cc, 'mentored'); return `Twenty minutes of hockey school each way. Morale +${m}, rating +${g}.`; } },
        { label: 'Sleep in, drive yourself', effect: 'Rest first', apply: (cc) => { const h = hp(cc, 6); const m = mor(cc, 2); return `An extra hour of sleep every morning. Health +${h}, morale +${m}.`; } },
        { label: 'Ask him about the Cup year', effect: 'Steal the map', apply: (cc) => { const m = mor(cc, 5); const g = rate(cc, 1); const f = fan(cc, 2); flag(cc, 'mentored'); return `He talked for two hours about one shift in Game 6. Morale +${m}, rating +${g}, fanbase +${f}.`; } },
      ],
    });
  }

  if (yrs <= 1) {
    deck.push({
      id: 'nhlA_jersey_number',
      title: 'That number is taken',
      body: 'The veteran who owns the number you have worn since novice will sell it. He wants a watch and a week in Cabo for his family.',
      options: [
        { label: 'Pay the man', effect: 'Buy your number', apply: (cc) => { const spent = cash(cc, -0.06); buy(cc, 'a watch for a teammate'); const m = mor(cc, 6); const f = fan(cc, 3); return `Watch bought, villa booked, ${spent}M gone. Morale +${m}, fanbase +${f}, and the number is yours.`; } },
        { label: 'Take a random number and make it famous', effect: 'Build your own', apply: (cc) => { const f = fan(cc, 6); const m = mor(cc, 3); return `Nobody wanted 47. In four years the kids will. Fanbase +${f}, morale +${m}.`; } },
      ],
    });
  }

  /* ------------------------------------------------------------------ *
   * 2. THE DRESSING ROOM
   * ------------------------------------------------------------------ */

  if (yrs <= 1) {
    deck.push({
      id: 'nhlA_rookie_dinner',
      title: 'The rookie dinner',
      body: 'Nine veterans, a steakhouse, and a wine list they are treating like a personal challenge. The leather folder gets slid in front of you.',
      options: [
        { label: 'Pay it, laugh, say nothing', effect: 'Buy in fully', apply: (cc) => { const spent = cash(cc, -0.05); const m = mor(cc, 9); const f = fan(cc, 2); flag(cc, 'roomGuy'); return `You covered ${spent}M of steak and 2007 Barolo. Morale +${m}, fanbase +${f}. You are in.`; } },
        { label: 'Split it with the other rookie', effect: 'Rookie solidarity', apply: (cc) => { const spent = cash(cc, -0.026); const m = mor(cc, 4); return `Two rookies, ${spent}M each, one shared trauma. Morale +${m}.`; } },
        { label: 'Ask the captain to cap the wine', effect: 'Set a boundary', apply: (cc) => { const spent = cash(cc, -0.014); const m = mor(cc, 1); flag(cc, 'roomTax'); return `He capped it. You paid ${spent}M and heard about it until Christmas. Morale +${m}.`; } },
      ],
    });
  }

  if (yrs >= 1 && yrs <= 12) {
    deck.push({
      id: 'nhlA_kangaroo_court',
      title: 'The kangaroo court',
      body: 'Late for the bus is 200. Sneakers with a suit is 500. Somehow you are the leading fine earner on the team and it is only November.',
      options: [
        { label: 'Pay everything, never argue', effect: 'Good teammate', apply: (cc) => { const spent = cash(cc, -0.012); const m = mor(cc, 6); flag(cc, 'roomGuy'); return `You funded the Christmas party by yourself, ${spent}M of it. Morale +${m}.`; } },
        { label: 'Appeal every single fine', effect: 'Courtroom drama', apply: (cc) => { const m = mor(cc, 3); const f = fan(cc, 2); return `Your closing arguments became the best part of Tuesdays. Morale +${m}, fanbase +${f}.`; } },
        { label: 'Run for judge yourself', effect: 'Seize the gavel', apply: (cc) => { const m = mor(cc, 5); flag(cc, 'roomBoss'); const f = fan(cc, 3); return `You now decide what sneakers cost. Morale +${m}, fanbase +${f}, and nobody is late anymore.`; } },
      ],
    });
  }

  if (!isG && yrs >= 1) {
    deck.push({
      id: 'nhlA_goalie_screen',
      title: 'The goalie hates screens',
      body: 'Your starter says you are standing in his eyes on every kill. He said it loud, in the room, with everyone sitting there.',
      options: [
        { label: 'Move off the post, keep the peace', effect: 'Keep the peace', apply: (cc) => { const m = mor(cc, 5); const h = hp(cc, 3); return `Fewer pucks off your ankles too. Morale +${m}, health +${h}.`; } },
        { label: 'Tell him to find the puck', effect: 'Hold your ground', apply: (cc) => { const m = mor(cc, -5); const f = fan(cc, 4); const g = rate(cc, 1); return `You kept blocking and he kept complaining. Morale ${m}, fanbase +${f}, rating +${g}.`; } },
        { label: 'Watch a week of tape with him', effect: 'Fix it properly', apply: (cc) => { const g = rate(cc, 1); const m = mor(cc, 6); flag(cc, 'goalieAlly'); return `Turns out you were both a little bit right. Rating +${g}, morale +${m}.`; } },
      ],
    });
  }

  if (isG && yrs >= 1) {
    deck.push({
      id: 'nhlA_screen_machine',
      title: 'Your defenseman is a curtain',
      body: 'Every power play he plants himself in your lane like he is waiting for a bus. Four goals this month you never saw leave a stick.',
      options: [
        { label: 'Snap at him on the bench', effect: 'Public correction', apply: (cc) => { const f = fan(cc, 5); const m = mor(cc, -6); heatUp(cc, 3); return `The bench cam got all of it. Fanbase +${f}, morale ${m}.`; } },
        { label: 'Draw it up after practice', effect: 'Fix the lane', apply: (cc) => { const g = rate(cc, 1); const m = mor(cc, 7); flag(cc, 'dPairAlly'); return `Cones, a whiteboard, and twenty minutes. Rating +${g}, morale +${m}.`; } },
        { label: 'Say nothing, swear in private', effect: 'Bottle it', apply: (cc) => { const m = mor(cc, 2); const f = fan(cc, 3); return `The mask hides a lot. Morale +${m}, fanbase +${f}.`; } },
      ],
    });
  }

  if (yrs >= 4 && c.ovr >= 80) {
    deck.push({
      id: 'nhlA_captain_vote',
      title: 'The letter',
      body: 'The room voted and it was close. Two names on the sheet and one of them is yours.',
      options: [
        { label: 'Take the C', effect: 'Wear the weight', apply: (cc) => { const m = mor(cc, 8); const f = fan(cc, 11); const h = hp(cc, -2); flag(cc, 'captain'); return `Captain of ${nhlTeamLabelOf(cc.team)}. Morale +${m}, fanbase +${f}, health ${h}, and every loss is your fault now.`; } },
        { label: 'Take an A and stay a player', effect: 'Half the weight', apply: (cc) => { const m = mor(cc, 6); const f = fan(cc, 4); flag(cc, 'alternate'); return `An A on the shoulder and no press conferences after losses. Morale +${m}, fanbase +${f}.`; } },
        { label: 'Push it to the older guy', effect: 'Pass the torch back', apply: (cc) => { const m = mor(cc, 5); const f = fan(cc, 6); flag(cc, 'roomBoss'); return `He cried a little in the meeting. Morale +${m}, fanbase +${f}, and the room noticed who did that.`; } },
      ],
    });
  }

  if (c.ovr < 84 || c.morale < 62) {
    deck.push({
      id: 'nhlA_healthy_scratch',
      title: 'Healthy scratch',
      body: 'The coach reads the lineup and your name is not in it. You watch from the press box in a suit that suddenly feels ridiculous.',
      options: [
        { label: 'Skate until they cut the lights', effect: 'Answer with work', apply: (cc) => { const g = rate(cc, 2); const m = mor(cc, -3); const h = hp(cc, -2); return `Extra ice every day for a month. Rating +${g}, morale ${m}, health ${h}.`; } },
        { label: 'Ask him what he actually wants', effect: 'Honest meeting', apply: (cc) => { const m = mor(cc, 7); const g = rate(cc, 1); return `Forty minutes of tape and one clear answer. Morale +${m}, rating +${g}.`; } },
        { label: 'Vent to a reporter', effect: 'Go public', apply: (cc) => { const f = fan(cc, 7); const m = mor(cc, -6); const h = heatUp(cc, 6); return `The quote led the broadcast. Fanbase +${f}, morale ${m}, heat now ${h}.`; } },
      ],
    });
  }

  /* ------------------------------------------------------------------ *
   * 3. MEDIA AND FAME
   * ------------------------------------------------------------------ */

  if (yrs >= 1) {
    deck.push({
      id: 'nhlA_bad_presser',
      title: 'Six words after a 6-1 loss',
      body: 'You said to ask the guys who were actually trying. It is already a graphic on three different shows.',
      options: [
        { label: 'Apologize to the room first', effect: 'Clean it up', apply: (cc) => { const m = mor(cc, 7); const f = fan(cc, -3); heatUp(cc, -4); return `You said it to their faces before you said it to a camera. Morale +${m}, fanbase ${f}.`; } },
        { label: 'Double down on camera', effect: 'No takebacks', apply: (cc) => { const f = fan(cc, 10); const m = mor(cc, -7); const h = heatUp(cc, 7); return `The clip has four million views and two teammates have muted you. Fanbase +${f}, morale ${m}, heat now ${h}.`; } },
        { label: 'Go silent for a week', effect: 'Wait it out', apply: (cc) => { const m = mor(cc, 3); const f = fan(cc, -1); heatUp(cc, -3); return `No comment, seven days, story dead. Morale +${m}, fanbase ${f}.`; } },
      ],
    });
  }

  if (yrs >= 1 && rng() < 0.65) {
    deck.push({
      id: 'nhlA_bench_cam',
      title: 'Bench cam got you',
      body: 'Twelve million views of your face during a line change. Someone added sad piano and your cousins will not stop sending it.',
      options: [
        { label: 'Post it yourself with a caption', effect: 'Own the joke', apply: (cc) => { const f = fan(cc, 11); const m = mor(cc, 5); return `You beat them to it. Fanbase +${f}, morale +${m}.`; } },
        { label: 'Put it on a shirt', effect: 'Monetize the clip', apply: (cc) => { const got = cash(cc, 0.15); const f = fan(cc, 8); const m = mor(cc, -2); return `Sold out in a weekend, ${got}M after the split. Fanbase +${f}, morale ${m}.`; } },
        { label: 'Never acknowledge it', effect: 'Total silence', apply: (cc) => { const m = mor(cc, 3); const g = rate(cc, 1); return `Head down, meme dies in nine days. Morale +${m}, rating +${g}.`; } },
      ],
    });
  }

  if (CANADA.includes(c.team)) {
    deck.push({
      id: 'nhlA_canadian_market',
      title: 'Seven panelists and a countdown clock',
      body: `In ${teamName} there is a television show about the morning skate. A show. About the skate.`,
      options: [
        { label: 'Do every hit, be the guy', effect: 'Face of the market', apply: (cc) => { const f = fan(cc, 13); const m = mor(cc, -5); return `You became the whole conversation. Fanbase +${f}, morale ${m}.`; } },
        { label: 'Hockey answers only, forever', effect: 'Say nothing well', apply: (cc) => { const m = mor(cc, 5); const f = fan(cc, 2); return `Ten minutes of words with no news in them. Morale +${m}, fanbase +${f}.`; } },
        { label: 'Delete the apps until June', effect: 'Go offline', apply: (cc) => { const m = mor(cc, 9); const f = fan(cc, -4); const h = hp(cc, 3); flag(cc, 'offline'); return `You have no idea what they are saying and you sleep great. Morale +${m}, health +${h}, fanbase ${f}.`; } },
      ],
    });
  }

  if (c.fanbase >= 45 || c.ovr >= 84) {
    deck.push({
      id: 'nhlA_doc_crew',
      title: 'The documentary crew',
      body: 'They want cameras in your kitchen, your truck and your rehab table. Ten episodes, streaming in the fall.',
      options: [
        { label: 'Full access, everything', effect: 'All access money', apply: (cc) => { const got = cash(cc, 1.2); const f = fan(cc, 15); const m = mor(cc, -6); return `They filmed your worst week too. ${got}M earned, fanbase +${f}, morale ${m}.`; } },
        { label: 'Rink only, no house', effect: 'Draw the line', apply: (cc) => { const got = cash(cc, 0.4); const f = fan(cc, 7); const m = mor(cc, 2); return `Practice, bus, room, done. ${got}M earned, fanbase +${f}, morale +${m}.`; } },
        { label: 'Pass entirely', effect: 'Keep it private', apply: (cc) => { const m = mor(cc, 7); const h = hp(cc, 2); return `Your summer belongs to you. Morale +${m}, health +${h}.`; } },
      ],
    });
  }

  if (c.ovr >= 83 && c.allStars === 0 && yrs >= 2) {
    deck.push({
      id: 'nhlA_allstar_snub',
      title: 'The All Star snub',
      body: 'Top of your team in ice time, top three in scoring, and the list came out without your name on it anywhere.',
      options: [
        { label: 'Say it stings, on the record', effect: 'Be honest', apply: (cc) => { const f = fan(cc, 9); const m = mor(cc, -3); return `Every fan account in the league defended you for a week. Fanbase +${f}, morale ${m}.`; } },
        { label: 'Take the four days with the kids', effect: 'Free vacation', apply: (cc) => { const h = hp(cc, 9); const m = mor(cc, 7); return `A beach instead of a skills competition. Health +${h}, morale +${m}.`; } },
        { label: 'Answer on the ice in February', effect: 'Let it fuel you', apply: (cc, r) => { const g = rate(cc, 1); const m = mor(cc, 4); if (r() < 0.5) { const f = fan(cc, 8); return `Eleven points in the six games after the break. Rating +${g}, morale +${m}, fanbase +${f}.`; } return `Quietly excellent, nobody wrote about it. Rating +${g}, morale +${m}.`; } },
      ],
    });
  }

  if (c.ovr >= 88 || c.fanbase >= 72) {
    deck.push({
      id: 'nhlA_cover_athlete',
      title: 'The cover',
      body: 'They want you on the front of the hockey game. Your billet mom will buy nine copies of a game she cannot play.',
      options: [
        { label: 'Take the cover and the check', effect: 'Cover money', apply: (cc) => { const got = cash(cc, 0.9); const f = fan(cc, 13); const m = mor(cc, -2); flag(cc, 'coverAthlete'); return `${got}M and your face on every shelf. Fanbase +${f}, morale ${m}, and everyone keeps mentioning a curse.`; } },
        { label: 'Split it with your linemate', effect: 'Share the shine', apply: (cc) => { const got = cash(cc, 0.5); const f = fan(cc, 8); const m = mor(cc, 6); flag(cc, 'coverAthlete'); return `Two of you on the cover, ${got}M each. Fanbase +${f}, morale +${m}, and the room loved it.`; } },
        { label: 'Decline, superstition wins', effect: 'Dodge the curse', apply: (cc) => { const m = mor(cc, 7); const h = hp(cc, 3); return `No cover, no curse, no photoshoot in July. Morale +${m}, health +${h}.`; } },
      ],
    });
  }

  /* ------------------------------------------------------------------ *
   * 4. THE BODY AND THE GRIND
   * ------------------------------------------------------------------ */

  if (yrs >= 1 && (c.health <= 94 || rng() < 0.45)) {
    deck.push({
      id: 'nhlA_quiet_room',
      title: 'The quiet room',
      body: 'You took a shoulder up high and the trainer is asking what city you are in. You know the answer. You think you know the answer.',
      options: [
        { label: 'Full protocol, no shortcuts', effect: 'Do it right', apply: (cc) => { const h = hp(cc, 18); const m = mor(cc, 3); const f = fan(cc, -3); flag(cc, 'headSafe'); return `Cleared properly two weeks later with zero symptoms. Health +${h}, morale +${m}, fanbase ${f}. Best decision of your career.`; } },
        { label: 'Tell the truth and sit tonight', effect: 'Honest answer', apply: (cc) => { const h = hp(cc, 11); const m = mor(cc, 5); flag(cc, 'headSafe'); return `You told them the truth and watched from the bench. Health +${h}, morale +${m}.`; } },
        { label: 'Say you are fine, go back out', effect: 'Hide it', apply: (cc) => { const h = hp(cc, -16); const m = mor(cc, -7); const f = fan(cc, 5); flag(cc, 'hidConcussion'); return `You played nine more minutes and lost the rest of the month anyway. Health ${h}, morale ${m}, fanbase +${f}. Not worth it.`; } },
      ],
    });
  }

  if (yrs >= 2) {
    deck.push({
      id: 'nhlA_broken_hand',
      title: 'Round two, broken hand',
      body: 'The scan is not close and the doc is not smiling. He says a needle, a cast liner, and you can hold the stick with two fingers.',
      options: [
        { label: 'Play with the freeze', effect: 'Playoff legend', apply: (cc) => { const f = fan(cc, 13); const h = hp(cc, -13); const m = mor(cc, 6); const g = rate(cc, -1); flag(cc, 'playoffWarrior'); return `They still talk about it in that city. Fanbase +${f}, morale +${m}, health ${h}, rating ${g}.`; } },
        { label: 'Sit two games, return for the next round', effect: 'Split the difference', apply: (cc) => { const h = hp(cc, 6); const m = mor(cc, 2); const f = fan(cc, -3); return `Two games in a suit, back for the conference final. Health +${h}, morale +${m}, fanbase ${f}.`; } },
        { label: 'Shut it down and get it fixed', effect: 'Fix it now', apply: (cc) => { const h = hp(cc, 15); const m = mor(cc, -4); const f = fan(cc, -7); return `Surgery on Monday, full grip by August. Health +${h}, morale ${m}, fanbase ${f}.`; } },
      ],
    });
  }

  if (!isG && c.health <= 88) {
    deck.push({
      id: 'nhlA_shoulder_surgery',
      title: 'The shoulder',
      body: 'It comes out on faceoffs now, and once in your sleep. Surgery is five months, which means no camp and no October.',
      options: [
        { label: 'Get it done in May', effect: 'Full repair', apply: (cc) => { const h = hp(cc, 21); const g = rate(cc, -1); const m = mor(cc, 2); flag(cc, 'shoulderFixed'); return `Labrum repaired, first surgery of your life. Health +${h}, rating ${g}, morale +${m}. It stays in the socket now.`; } },
        { label: 'Play through with a harness', effect: 'Tape it up', apply: (cc) => { const h = hp(cc, -9); const f = fan(cc, 6); const m = mor(cc, 3); return `A harness under the shoulder pads all year. Health ${h}, fanbase +${f}, morale +${m}.`; } },
        { label: 'Rehab hard, decide in August', effect: 'Buy time', apply: (cc, r) => { const h = hp(cc, 9); const m = mor(cc, 2); if (r() < 0.4) { const h2 = hp(cc, -5); return `It popped out again in camp and you had it done anyway. Health +${h + h2}, morale +${m}.`; } return `Twelve weeks of band work held it together. Health +${h}, morale +${m}.`; } },
      ],
    });
  }

  if (isG && (c.age >= 26 || c.health <= 90)) {
    deck.push({
      id: 'nhlA_goalie_hips',
      title: 'Goalie hips',
      body: 'Twenty years of butterfly and the labrum is fraying on both sides. The surgeon says do it now or do it at 34 when it is worse.',
      options: [
        { label: 'Do it now, miss the fall', effect: 'Fix the hips', apply: (cc) => { const h = hp(cc, 20); const g = rate(cc, -1); const m = mor(cc, -3); flag(cc, 'hipsFixed'); return `Both hips scoped in June. Health +${h}, rating ${g}, morale ${m}, and you can drop into the butterfly without wincing.`; } },
        { label: 'Mobility program instead', effect: 'Manage it', apply: (cc) => { const h = hp(cc, 9); const g = rate(cc, 1); const m = mor(cc, 2); return `Ninety minutes of hip work daily, all summer. Health +${h}, rating +${g}, morale +${m}.`; } },
        { label: 'Play through and freeze it', effect: 'Push it back', apply: (cc) => { const h = hp(cc, -10); const f = fan(cc, 7); const m = mor(cc, 4); return `Sixty two starts on frozen hips. Health ${h}, fanbase +${f}, morale +${m}.`; } },
      ],
    });
  }

  if (yrs >= 1) {
    deck.push({
      id: 'nhlA_sleep_program',
      title: 'The sleep guy',
      body: 'The team hired a sleep scientist who wants your phone out of the bedroom and blackout curtains taped up in every hotel.',
      options: [
        { label: 'Full buy in', effect: 'Sleep like a pro', apply: (cc) => { const h = hp(cc, 10); const g = rate(cc, 1); const m = mor(cc, -2); flag(cc, 'sleepPro'); return `Nine hours a night and no phone after ten. Health +${h}, rating +${g}, morale ${m}.`; } },
        { label: 'Just the naps and the curtains', effect: 'Half measure', apply: (cc) => { const h = hp(cc, 5); const m = mor(cc, 2); return `Twenty minute naps before every game. Health +${h}, morale +${m}.`; } },
        { label: 'Keep the 2am gaming', effect: 'Unplug from him', apply: (cc) => { const m = mor(cc, 7); const h = hp(cc, -6); return `You and three teammates online until the sun. Morale +${m}, health ${h}.`; } },
      ],
    });
  }

  if (c.age <= 28) {
    deck.push({
      id: 'nhlA_skating_coach',
      title: 'Rebuilding the stride',
      body: 'A power skating coach wants to take your stride apart down to the studs. It will feel wrong until roughly Christmas.',
      options: [
        { label: 'Commit to the whole summer', effect: 'Rebuild it', apply: (cc) => { const g = rate(cc, 2); const m = mor(cc, -4); const h = hp(cc, 3); flag(cc, 'strideRebuilt'); return `Two steps quicker out of the turn. Rating +${g}, health +${h}, morale ${m}.`; } },
        { label: 'Do the light version', effect: 'Tweak it', apply: (cc) => { const g = rate(cc, 1); const m = mor(cc, 2); return `Edges and crossovers twice a week. Rating +${g}, morale +${m}.`; } },
        { label: 'Trust what got you here', effect: 'Do not touch it', apply: (cc) => { const m = mor(cc, 7); const f = fan(cc, 2); return `Nobody has ever fixed you before and nobody starts now. Morale +${m}, fanbase +${f}.`; } },
      ],
    });
  }

  if (rng() < 0.7) {
    deck.push({
      id: 'nhlA_nutritionist',
      title: 'The nutritionist versus the postgame pizza',
      body: 'She wants to kill the four slice tradition after home wins. The room has extremely strong feelings about this.',
      options: [
        { label: 'Follow the plan exactly', effect: 'Eat like a pro', apply: (cc) => { const h = hp(cc, 9); const g = rate(cc, 1); const m = mor(cc, -3); flag(cc, 'cleanEater'); return `You showed up to camp at 6 percent body fat. Health +${h}, rating +${g}, morale ${m}.`; } },
        { label: 'Clean on the road, pizza at home', effect: 'Meet in the middle', apply: (cc) => { const h = hp(cc, 5); const m = mor(cc, 3); return `Best of both, mostly. Health +${h}, morale +${m}.`; } },
        { label: 'Order the pizza, lead the room', effect: 'Tradition first', apply: (cc) => { const m = mor(cc, 9); const h = hp(cc, -5); const f = fan(cc, 2); flag(cc, 'roomGuy'); return `Eleven boxes on the plane. Morale +${m}, fanbase +${f}, health ${h}.`; } },
      ],
    });
  }

  /* ------------------------------------------------------------------ *
   * 5. HOCKEY CULTURE
   * ------------------------------------------------------------------ */

  if (yrs >= 1) {
    deck.push({
      id: 'nhlA_playoff_beard',
      title: 'The playoff beard',
      body: 'Round one starts and the razors go in a drawer. Yours has come in patchy since juniors and the boys have noticed.',
      options: [
        { label: 'Grow whatever shows up', effect: 'Honor the code', apply: (cc) => { const m = mor(cc, 6); const f = fan(cc, 6); flag(cc, 'beardCommitted'); return `Three good patches and a lot of hope. Morale +${m}, fanbase +${f}.`; } },
        { label: 'Shave and say it is faster', effect: 'Break the code', apply: (cc) => { const m = mor(cc, -4); const f = fan(cc, 4); const g = rate(cc, 1); return `Clean face, zero superstition, all business. Morale ${m}, fanbase +${f}, rating +${g}.`; } },
        { label: 'Bleach the patchy one blond', effect: 'Lean all the way in', apply: (cc) => { const f = fan(cc, 10); const m = mor(cc, 4); return `Half the arena did it too by Game 4. Fanbase +${f}, morale +${m}.`; } },
      ],
    });
  }

  if (!isG && yrs >= 1) {
    deck.push({
      id: 'nhlA_unwanted_fight',
      title: 'He dropped his gloves and looked at you',
      body: 'You have never fought in your life. He is 6 foot 4, he has done this 40 times, and the whole building is standing up.',
      options: [
        { label: 'Drop them and hang on', effect: 'Answer the bell', apply: (cc, r) => { const f = fan(cc, 12); const m = mor(cc, 6); const h = hp(cc, r() < 0.5 ? -6 : -10); flag(cc, 'answeredTheBell'); return `You threw two and ate five. Fanbase +${f}, morale +${m}, health ${h}. Nobody questions you again.`; } },
        { label: 'Skate away and go score', effect: 'Answer differently', apply: (cc) => { const g = rate(cc, 1); const f = fan(cc, -2); const m = mor(cc, 3); return `You scored on the next shift and pointed at the box. Rating +${g}, morale +${m}, fanbase ${f}.`; } },
        { label: 'Let the tough guy handle it', effect: 'Send the cavalry', apply: (cc) => { const m = mor(cc, 4); const f = fan(cc, 2); flag(cc, 'oweTheEnforcer'); return `Your winger was over the boards in two seconds. Morale +${m}, fanbase +${f}, and you owe him dinner forever.`; } },
      ],
    });
  }

  if (yrs >= 1) {
    deck.push({
      id: 'nhlA_enforcer_teammate',
      title: 'The tough guy is getting waived',
      body: 'He fought everyone in the league for you, he cannot skate anymore, and management wants his roster spot for a kid.',
      options: [
        { label: 'Back him publicly', effect: 'Stand up for him', apply: (cc) => { const m = mor(cc, 7); const f = fan(cc, 6); heatUp(cc, 3); flag(cc, 'roomBoss'); return `You said what everyone was thinking. Morale +${m}, fanbase +${f}, and the GM has a note about you now.`; } },
        { label: 'Buy him the send off dinner', effect: 'Private class', apply: (cc) => { const spent = cash(cc, -0.03); const m = mor(cc, 8); return `Twenty three guys, one back room, ${spent}M. Morale +${m}. He cried at the toast.`; } },
        { label: 'Say nothing, it is a business', effect: 'Stay out of it', apply: (cc) => { const m = mor(cc, -3); const g = rate(cc, 1); return `You kept your head down and your minutes. Morale ${m}, rating +${g}.`; } },
      ],
    });
  }

  if (rng() < 0.7) {
    deck.push({
      id: 'nhlA_superstition',
      title: 'The routine got out of hand',
      body: isG
        ? 'Same tape job, same water bottle angle, same three taps on each post, and now a specific song at a specific volume. It is 40 minutes long.'
        : 'Right skate first, no stick touching the floor before warmups, and now you need the same parking spot or the day is ruined.',
      options: [
        { label: 'Protect the routine at all costs', effect: 'Feed the ritual', apply: (cc) => { const m = mor(cc, 7); const g = rate(cc, 1); const h = hp(cc, -2); flag(cc, 'superstitious'); return `You arrive 90 minutes earlier to guarantee the spot. Morale +${m}, rating +${g}, health ${h}.`; } },
        { label: 'Let a teammate break one on purpose', effect: 'Break the spell', apply: (cc) => { const m = mor(cc, -3); const h = hp(cc, 5); const f = fan(cc, 3); return `He touched your stick to the floor and you played fine. Morale ${m}, health +${h}, fanbase +${f}.`; } },
        { label: 'Tell the media the whole list', effect: 'Feature material', apply: (cc) => { const f = fan(cc, 9); const m = mor(cc, 2); return `Every rival crowd chants about the water bottle now. Fanbase +${f}, morale +${m}.`; } },
      ],
    });
  }

  if (yrs >= 2) {
    deck.push({
      id: 'nhlA_chirp_war',
      title: 'The chirp war',
      body: 'Their center has been in your ear for three seasons and this time he brought up your minus rating in front of a hot mic.',
      options: [
        { label: 'Out chirp him on the broadcast', effect: 'Win the mic', apply: (cc) => { const f = fan(cc, 11); const m = mor(cc, 4); const h = heatUp(cc, 4); return `Your line about his contract ran on every show. Fanbase +${f}, morale +${m}, heat now ${h}.`; } },
        { label: 'Say nothing, beat him head to head', effect: 'Scoreboard reply', apply: (cc) => { const g = rate(cc, 1); const m = mor(cc, 5); const f = fan(cc, 4); return `Four points against him in two meetings. Rating +${g}, morale +${m}, fanbase +${f}.`; } },
        { label: 'Send him a case of beer', effect: 'Disarm him', apply: (cc) => { const spent = cash(cc, -0.002); const m = mor(cc, 6); const f = fan(cc, 6); flag(cc, 'chirpTruce'); return `${spent}M of beer ended a three year war. Morale +${m}, fanbase +${f}.`; } },
      ],
    });
  }

  if (c.seasons.some(s => s.teamResult !== 'Missed the playoffs')) {
    deck.push({
      id: 'nhlA_handshake_line',
      title: 'The handshake line',
      body: 'Game 7 is over and the worst line in sports starts moving. Twenty guys who hate each other, all telling the truth for nine seconds.',
      options: [
        { label: 'Look every one of them in the eye', effect: 'Do it properly', apply: (cc) => { const m = mor(cc, 8); const f = fan(cc, 7); flag(cc, 'respectedTheLine'); return `You told their goalie he stole it and you meant it. Morale +${m}, fanbase +${f}.`; } },
        { label: 'Get through it and get out', effect: 'Just survive it', apply: (cc) => { const m = mor(cc, 2); const g = rate(cc, 1); return `Head down, glove taps, tunnel. Morale +${m}, rating +${g}, and you used the whole summer as fuel.`; } },
        { label: 'Tell their captain you will see him next year', effect: 'Plant a flag', apply: (cc) => { const f = fan(cc, 9); const m = mor(cc, 5); heatUp(cc, 3); return `The camera caught it and the rivalry doubled. Fanbase +${f}, morale +${m}.`; } },
      ],
    });
  }

  if (!isG && yrs >= 1) {
    deck.push({
      id: 'nhlA_three_teeth',
      title: 'Three teeth and a team photo',
      body: 'A deflection took out the front three on Tuesday. The dentist can build the bridge now or you can wait until June like everybody else.',
      options: [
        { label: 'Fix it now, miss two games', effect: 'Get the bridge', apply: (cc) => { const spent = cash(cc, -0.02); const h = hp(cc, 5); const m = mor(cc, 5); const f = fan(cc, -2); return `${spent}M of dental work and two nights in a suit. Health +${h}, morale +${m}, fanbase ${f}.`; } },
        { label: 'Play toothless until June', effect: 'Full hockey player', apply: (cc) => { const f = fan(cc, 9); const m = mor(cc, 3); const h = hp(cc, -3); flag(cc, 'toothless'); return `The team photo is legendary. Fanbase +${f}, morale +${m}, health ${h}.`; } },
        { label: 'Get the flipper, never smile', effect: 'Removable solution', apply: (cc) => { const spent = cash(cc, -0.004); const m = mor(cc, 3); const f = fan(cc, 4); return `A ${spent}M piece of plastic that lives in your glove. Morale +${m}, fanbase +${f}.`; } },
      ],
    });
  }

  /* ------------------------------------------------------------------ *
   * 6. THE SEASON
   * ------------------------------------------------------------------ */

  if (yrs >= 1) {
    deck.push({
      id: 'nhlA_western_canada_trip',
      title: 'The Western Canada trip',
      body: 'Six nights, four cities, three time zones, and minus 31 in the middle of it. Nobody comes home from this the same.',
      options: [
        { label: 'Lead the bonding trip', effect: 'Build the room', apply: (cc) => { const spent = cash(cc, -0.02); const m = mor(cc, 9); const h = hp(cc, -3); flag(cc, 'roomGuy'); return `You booked the steakhouse in Calgary and paid the ${spent}M. Morale +${m}, health ${h}. Went 3-1 on the trip.`; } },
        { label: 'Hotel, ice bath, sleep, repeat', effect: 'Pro trip', apply: (cc) => { const h = hp(cc, 8); const g = rate(cc, 1); const m = mor(cc, -2); return `Nobody saw you outside a rink for six days. Health +${h}, rating +${g}, morale ${m}.`; } },
        { label: 'Bring the family along', effect: 'People not hockey', apply: (cc) => { const spent = cash(cc, -0.04); const m = mor(cc, 8); const h = hp(cc, -2); return `Four flights and a suite, ${spent}M. Morale +${m}, health ${h}, and Vancouver was worth it.`; } },
      ],
    });
  }

  if (rng() < 0.55) {
    deck.push({
      id: 'nhlA_outdoor_game',
      title: 'The outdoor game',
      body: 'A football stadium, 68,000 people, real snow, and ice the crew has been babysitting since Tuesday. It is not good ice.',
      options: [
        { label: 'Play it like a Cup game', effect: 'Send it', apply: (cc) => { const f = fan(cc, 12); const m = mor(cc, 6); const h = hp(cc, -5); flag(cc, 'outdoorGame'); return `Two points and a photo that hangs in your parents\' hallway. Fanbase +${f}, morale +${m}, health ${h}.`; } },
        { label: 'Manage the bad ice, no heroics', effect: 'Survive the surface', apply: (cc) => { const h = hp(cc, 4); const g = rate(cc, 1); const f = fan(cc, 2); return `Chip and chase, nothing fancy, no tweaked groin. Health +${h}, rating +${g}, fanbase +${f}.`; } },
        { label: 'Bring the whole family down to the alumni skate', effect: 'Make the memory', apply: (cc) => { const m = mor(cc, 9); const f = fan(cc, 7); return `Your dad skated on that ice at 61 years old. Morale +${m}, fanbase +${f}.`; } },
      ],
    });
  }

  if (yrs >= 2) {
    deck.push({
      id: 'nhlA_deadline_rumor',
      title: 'Your name is in the deadline graphic',
      body: `The insider put you on the board at 8am. Your wife saw it before you did and the ${teamName} group chat has gone very quiet.`,
      options: [
        { label: 'Ask the GM straight up', effect: 'Get the truth', apply: (cc) => { const m = mor(cc, 6); const f = fan(cc, 2); return `He gave you a real answer, which almost never happens. Morale +${m}, fanbase +${f}.`; } },
        { label: 'Tell the media you want to stay', effect: 'Public loyalty', apply: (cc) => { const f = fan(cc, 10); const m = mor(cc, 3); flag(cc, 'saidStay'); return `The city put your quote on a mural by Friday. Fanbase +${f}, morale +${m}.`; } },
        { label: 'Tell your agent to find a contender', effect: 'Chase a Cup', apply: (cc) => { const m = mor(cc, 5); const f = fan(cc, -7); flag(cc, 'askedOut'); return `Word got out fast. Morale +${m}, fanbase ${f}, and your phone did not stop for a week.`; } },
      ],
    });
  }

  if (yrs >= 1 && (c.morale < 75 || rng() < 0.5)) {
    deck.push({
      id: 'nhlA_coach_fired',
      title: 'They fired the coach on a Tuesday',
      body: 'Eleven games under .500 and he is gone before the morning skate. The assistant runs practice in a track suit and nobody makes eye contact.',
      options: [
        { label: 'Say the players failed him', effect: 'Take the blame', apply: (cc) => { const m = mor(cc, 6); const f = fan(cc, 7); flag(cc, 'accountable'); return `The only honest quote in the whole room. Morale +${m}, fanbase +${f}.`; } },
        { label: 'Play your way into the new guy\'s plans', effect: 'New start', apply: (cc) => { const g = rate(cc, 2); const m = mor(cc, 3); const h = hp(cc, -3); return `Two weeks of auditioning like a rookie. Rating +${g}, morale +${m}, health ${h}.`; } },
        { label: 'Admit you tuned him out in November', effect: 'Brutal honesty', apply: (cc) => { const f = fan(cc, 4); const m = mor(cc, -5); const h = heatUp(cc, 6); return `That answer followed you for two seasons. Fanbase +${f}, morale ${m}, heat now ${h}.`; } },
      ],
    });
  }

  if (yrs >= 1) {
    deck.push({
      id: 'nhlA_losing_streak',
      title: 'Nine in a row',
      body: `The city is taking this personally. Someone put a bag over their head at the ${teamName} home game and the camera stayed on him for a while.`,
      options: [
        { label: 'Call a players only meeting', effect: 'Clear the air', apply: (cc) => { const m = mor(cc, 8); const g = rate(cc, 1); flag(cc, 'roomBoss'); return `Forty minutes, no coaches, some yelling. Morale +${m}, rating +${g}, and you won the next night.`; } },
        { label: 'Buy out the bar for the fans after a win', effect: 'Reconnect with the city', apply: (cc) => { const spent = cash(cc, -0.03); const f = fan(cc, 11); const m = mor(cc, 4); return `${spent}M of tabs and a lot of goodwill. Fanbase +${f}, morale +${m}.`; } },
        { label: 'Tell the city they are entitled', effect: 'Push back', apply: (cc) => { const f = fan(cc, -9); const m = mor(cc, 3); const h = heatUp(cc, 8); return `The sports radio hosts got two weeks of content. Fanbase ${f}, morale +${m}, heat now ${h}.`; } },
      ],
    });
  }

  if (yrs >= 1) {
    deck.push({
      id: 'nhlA_dads_trip',
      title: 'The dads trip',
      body: 'Two games, one charter, and 22 fathers in matching jackets losing their minds in the press box. Yours has never been on a plane like this.',
      options: [
        { label: 'Bring your dad', effect: 'Pay it back', apply: (cc) => { const m = mor(cc, 10); const f = fan(cc, 5); flag(cc, 'dadsTrip'); return `He told the 5am rink stories to the whole plane. Morale +${m}, fanbase +${f}.`; } },
        { label: 'Bring the coach who drove you everywhere', effect: 'Honor the other guy', apply: (cc) => { const m = mor(cc, 9); const f = fan(cc, 8); return `A 63 year old minor hockey coach cried in a hotel lobby. Morale +${m}, fanbase +${f}.`; } },
        { label: 'Bring your billet dad too, pay his way', effect: 'Bring them both', apply: (cc) => { const spent = cash(cc, -0.01); const m = mor(cc, 11); const f = fan(cc, 6); return `${spent}M for one extra seat and a room. Morale +${m}, fanbase +${f}.`; } },
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
      title: 'The gear deal',
      body: `A brand wants your name on their ${gear}. The big one pays more but their stuff feels wrong in your hands.`,
      options: [
        { label: 'Sign with the big brand', effect: 'Take the money', apply: (cc) => { const got = cash(cc, 0.35); const f = fan(cc, 6); const g = rate(cc, -1); return `${got}M a year to use gear you do not love. Fanbase +${f}, rating ${g}.`; } },
        { label: 'Stay with the small shop that fits you', effect: 'Trust the feel', apply: (cc) => { const got = cash(cc, 0.09); const g = rate(cc, 1); const m = mor(cc, 5); return `${got}M and gear that is actually right. Rating +${g}, morale +${m}.`; } },
        { label: 'Sign the big deal, use your old gear anyway', effect: 'The old trick', apply: (cc, r) => { const got = cash(cc, 0.35); if (r() < 0.35) { const f2 = fan(cc, -5); heatUp(cc, 4); return `${got}M banked, then a camera caught the repaint job. Fanbase ${f2}.`; } const m = mor(cc, 4); flag(cc, 'repaintedGear'); return `${got}M banked and a very careful paint job. Morale +${m}. Half the league does it.`; } },
      ],
    });
  }

  if (c.fanbase >= 40 || yrs >= 3) {
    deck.push({
      id: 'nhlA_card_show',
      title: 'The card show',
      body: 'A convention center, a folding table, and 900 people who want your signature on a rookie card. Four hours, flat fee, all above board.',
      options: [
        { label: 'Do the full four hours', effect: 'Sign everything', apply: (cc) => { const got = cash(cc, 0.08); const f = fan(cc, 8); const h = hp(cc, -2); return `${got}M and a wrist that hated you. Fanbase +${f}, health ${h}.`; } },
        { label: 'Two hours, then take photos with kids for free', effect: 'Half paid half free', apply: (cc) => { const got = cash(cc, 0.04); const f = fan(cc, 12); const m = mor(cc, 6); return `${got}M and every kid in line got a photo. Fanbase +${f}, morale +${m}.`; } },
        { label: 'Skip it, stay home with family', effect: 'Keep the weekend', apply: (cc) => { const m = mor(cc, 7); const h = hp(cc, 4); return `A Saturday that belonged to you. Morale +${m}, health +${h}.`; } },
      ],
    });
  }

  if (c.fanbase >= 35) {
    deck.push({
      id: 'nhlA_truck_ad',
      title: 'The truck dealership ad',
      body: 'Local dealer, green screen, one line of dialogue about zero percent financing. They will pay you and give you a truck.',
      options: [
        { label: 'Say the line, take the truck', effect: 'Local legend', apply: (cc) => { const got = cash(cc, 0.06); buy(cc, 'a dealership truck'); const f = fan(cc, 9); const m = mor(cc, -2); flag(cc, 'truckGuy'); return `${got}M, a free truck, and that line follows you to the grave. Fanbase +${f}, morale ${m}.`; } },
        { label: 'Bring your linemate in and split it', effect: 'Two man bit', apply: (cc) => { const got = cash(cc, 0.03); const f = fan(cc, 11); const m = mor(cc, 6); return `The two of you were genuinely funny. ${got}M each, fanbase +${f}, morale +${m}.`; } },
        { label: 'Pass, keep the dignity', effect: 'No green screen', apply: (cc) => { const m = mor(cc, 5); return `You will never have to hear yourself say zero percent. Morale +${m}.`; } },
      ],
    });
  }

  if (net >= 2 || c.earnings >= 6) {
    deck.push({
      id: 'nhlA_parents_house',
      title: 'The house for your parents',
      body: 'They drove you to 5am practice for twelve years in a car with a dying heater. You can end their mortgage this week.',
      options: [
        { label: 'Buy them the house outright', effect: 'Pay them back', apply: (cc) => { const spent = cash(cc, -1.2); buy(cc, 'a house for your parents'); const m = mor(cc, 14); const f = fan(cc, 7); flag(cc, 'boughtParentsHouse'); return `${spent}M, keys on the kitchen table, your mother on the floor crying. Morale +${m}, fanbase +${f}.`; } },
        { label: 'Pay off the mortgage they have', effect: 'Kill the debt', apply: (cc) => { const spent = cash(cc, -0.4); const m = mor(cc, 10); flag(cc, 'boughtParentsHouse'); return `${spent}M and they stay on the street they love. Morale +${m}.`; } },
        { label: 'Set them up with an income instead', effect: 'Long game', apply: (cc) => { const spent = cash(cc, -0.7); const m = mor(cc, 8); flag(cc, 'parentsFund'); return `${spent}M into something boring that pays them monthly forever. Morale +${m}.`; } },
      ],
    });
  }

  if (net >= 1.5 || c.earnings >= 5) {
    deck.push({
      id: 'nhlA_teammate_loan',
      title: 'A teammate needs 300 grand',
      body: 'His brother in law has a restaurant concept and a pitch deck with three fonts on it. He is asking you, quietly, at the back of the plane.',
      options: [
        { label: 'Lend it, no paperwork', effect: 'Trust him', apply: (cc, r) => { const spent = cash(cc, -0.3); if (r() < 0.4) { const back = cash(cc, 0.42); const m = mor(cc, 8); return `He paid back ${back}M in two years after lending ${spent}M. Morale +${m}. The place is packed.`; } const m2 = mor(cc, -5); flag(cc, 'badLoan'); return `${spent}M gone and the restaurant lasted nine months. Morale ${m2}.`; } },
        { label: 'Gift him a smaller number and call it even', effect: 'Cap the damage', apply: (cc) => { const spent = cash(cc, -0.06); const m = mor(cc, 6); return `${spent}M as a gift, never mentioned again, friendship intact. Morale +${m}.`; } },
        { label: 'Say no and introduce him to your advisor', effect: 'Say no kindly', apply: (cc) => { const m = mor(cc, 3); const f = fan(cc, 1); flag(cc, 'financiallySane'); return `He was annoyed for a month and grateful for a decade. Morale +${m}, fanbase +${f}.`; } },
      ],
    });
  }

  if (yrs >= 1 && c.contractYears >= 2) {
    deck.push({
      id: 'nhlA_rent_or_buy',
      title: 'Rent or buy in this city',
      body: `You have ${c.contractYears} years left with ${teamName} and a realtor with a house that has a rink sized garage.`,
      options: [
        { label: 'Buy the house', effect: 'Put down roots', apply: (cc) => { const spent = cash(cc, -1.6); buy(cc, 'a house with a heated garage'); const m = mor(cc, 8); const f = fan(cc, 6); flag(cc, 'homeowner'); return `${spent}M and a mailbox with your name on it. Morale +${m}, fanbase +${f}.`; } },
        { label: 'Rent the condo downtown', effect: 'Stay liquid', apply: (cc) => { const spent = cash(cc, -0.09); const m = mor(cc, 3); flag(cc, 'financiallySane'); return `${spent}M for the year and a lease you can walk away from in March. Morale +${m}.`; } },
        { label: 'Rent, and buy a cabin back home instead', effect: 'Roots elsewhere', apply: (cc) => { const spent = cash(cc, -0.55); buy(cc, 'a lake cabin back home'); const m = mor(cc, 10); const h = hp(cc, 4); return `${spent}M on water you grew up swimming in. Morale +${m}, health +${h}.`; } },
      ],
    });
  }

  return deck;
}
