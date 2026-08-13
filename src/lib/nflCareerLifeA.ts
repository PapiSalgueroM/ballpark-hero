/*
   nflCareerLifeA.ts, NFL My Career life deck A (Round 56)

   Owner brief: "everything BitLife has, ten times better and more out of
   pocket, at least 200 new additions". This file is 45 of them: the human
   stuff around the football. Rookie tax and locker room politics, the media
   machine, the city that adopts you or turns on you, your body and your head,
   coordinators who do not know what you are, camp fights and primetime, and
   the everyday money that arrives long before the second contract does.

   Same self-gating contract as the soccer life decks: an event only lands in
   the returned array when its conditions hold, so drawEvent needs no extra
   eligibility rules. Every id is prefixed lifeA_ so it stays unique across
   the other NFL life files.

   apply() MUTATES the career and RETURNS the log line the player reads.
*/
import type { CareerState, CareerEvent } from './nflMyCareer';
import { teamLabelOf } from './nflMyCareer';

/* Round 56 optional fields. Declared locally so this file compiles against
   old and new versions of CareerState alike, and so every read guards with
   ?? 0 the way the save format requires. */
type LifeExtras = {
  netWorth?: number;
  dirtyMoney?: number;
  heat?: number;
  purchased?: string[];
  lifeFlags?: Record<string, number>;
};
type LifeState = CareerState & LifeExtras;
const L = (c: CareerState): LifeState => c as LifeState;

const flag = (c: CareerState, k: string): number => (L(c).lifeFlags || {})[k] || 0;
const setFlag = (c: CareerState, k: string, v: number) => { L(c).lifeFlags = { ...(L(c).lifeFlags || {}), [k]: v }; };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const mor = (c: CareerState, d: number) => { c.morale = clamp(c.morale + d, 0, 100); };
const fan = (c: CareerState, d: number) => { c.fanbase = clamp(c.fanbase + d, 0, 100); };
const hp = (c: CareerState, d: number) => { c.health = clamp(c.health + d, 0, 100); };
const rate = (c: CareerState, d: number) => { c.ovr = clamp(Math.min(c.pot + 1, c.ovr + d), 50, 99); };

/** Net worth only, for spending and investment returns. */
const bank = (c: CareerState, d: number): number => {
  const s = L(c);
  s.netWorth = Math.round(((s.netWorth ?? 0) + d) * 10) / 10;
  return s.netWorth;
};
/** Money you actually earned: hits career earnings and net worth. */
const paid = (c: CareerState, m: number): number => {
  c.earnings = Math.round((c.earnings + m) * 10) / 10;
  return bank(c, m);
};
const own = (c: CareerState, item: string) => { const s = L(c); s.purchased = [...(s.purchased ?? []), item]; };

const posNoun = (c: CareerState): string =>
  c.pos === 'QB' ? 'quarterback' : c.pos === 'RB' ? 'running back' : c.pos === 'WR' ? 'receiver' : 'starter';
const craftNoun = (c: CareerState): string =>
  c.pos === 'QB' ? 'throwing motion' : c.pos === 'RB' ? 'running style' : c.pos === 'WR' ? 'release off the line' : 'technique';
const soreSpot = (c: CareerState): string =>
  c.pos === 'QB' ? 'throwing shoulder' : c.pos === 'RB' ? 'hamstring' : c.pos === 'WR' ? 'foot' : 'lower back';
const foilOf = (c: CareerState): string =>
  c.pos === 'QB' ? 'an edge rusher' : c.pos === 'RB' ? 'a linebacker' : c.pos === 'WR' ? 'a corner' : 'a safety';
const marketOf = (c: CareerState): number => {
  const mult = c.pos === 'QB' ? 1.9 : c.pos === 'WR' ? 1.15 : 0.9;
  return Math.max(1.2, Math.round(((c.ovr - 64) * 1.55 - 6) * mult * 10) / 10);
};

const COLD_TOWNS = ['BUF', 'GB', 'CHI', 'CLE', 'PIT', 'DEN', 'NE', 'NYJ', 'NYG', 'PHI', 'BAL', 'CIN', 'WAS', 'KC'];

export function getNflLifeEventsA(c: CareerState, rng: () => number): CareerEvent[] {
  const deck: CareerEvent[] = [];
  const yrs = c.seasons.length;
  const last = c.seasons[yrs - 1];
  const missedPlayoffs = !!last && last.teamResult === 'Missed the playoffs';
  const reachedSb = !!last && /super bowl/i.test(last.teamResult);
  const worth = L(c).netWorth ?? 0;

  /* ============================ 1. ROOKIE AND LOCKER ROOM ============================ */

  if (yrs <= 2) {
    deck.push({
      id: 'lifeA_rookie_dinner',
      title: 'The rookie dinner tab',
      body: 'The vets took twelve of you to a steakhouse and ordered like the bill was a rumor. It lands face down in front of you. Your agent warned you about this exact night.',
      options: [
        {
          label: 'Cover all of it without blinking', effect: 'Room love, wallet pain',
          apply: (cc) => { bank(cc, -0.12); mor(cc, 9); setFlag(cc, 'roomRespect', flag(cc, 'roomRespect') + 1); return 'You covered a 120,000 dollar steak dinner and never brought it up again. Three vets started blocking for you differently. Morale +9, net worth down 0.12M.'; },
        },
        {
          label: 'Organize a split with the other rookies', effect: 'Sensible, slightly lame',
          apply: (cc) => { bank(cc, -0.04); mor(cc, 3); return 'You made a spreadsheet. In a steakhouse. It worked, and it will follow you forever. Morale +3, net worth down 0.04M.'; },
        },
        {
          label: 'Refuse and eat the silence', effect: 'Money kept, room chilly',
          apply: (cc) => { mor(cc, -8); setFlag(cc, 'tightwad', 1); return 'You said no in front of everybody. You kept 120,000 dollars and a nickname you did not choose. Morale -8.'; },
        },
      ],
    });
  }

  if (yrs <= 1) {
    deck.push({
      id: 'lifeA_rookie_hazing',
      title: 'Pads, donuts, and the haircut',
      body: 'Until the new draft class walks in you are still the rookie. That means carrying veteran pads, a Friday donut run for 53 people, and a haircut somebody keeps promising to give you in your sleep.',
      options: [
        {
          label: 'Embrace all of it, be the best rookie alive', effect: 'Room love, no ego',
          apply: (cc) => { mor(cc, 8); setFlag(cc, 'roomRespect', flag(cc, 'roomRespect') + 1); return 'You carried pads, learned 53 coffee orders and never complained once. The room decided you were one of them by August. Morale +8.'; },
        },
        {
          label: 'Do everything except the hair', effect: 'Respect, small friction',
          apply: (cc) => { mor(cc, 3); fan(cc, 4); return 'You did every job and drew one line at the clippers. The standoff got filmed and the internet took your side. Morale +3, fanbase +4.'; },
        },
        {
          label: 'Refuse the whole circus, live in the film room', effect: 'Rating up, room cold',
          apply: (cc) => { mor(cc, -6); rate(cc, 1); return `You skipped the donut run and spent it on third down tape instead. Rating +1, morale -6, and the vets have a very long memory. You are now ${cc.ovr} overall.`; },
        },
      ],
    });
  }

  if (yrs >= 1 && yrs <= 5 && c.age <= 27) {
    deck.push({
      id: 'lifeA_vet_mentor',
      title: 'The old head adopts you',
      body: `A 34 year old ${posNoun(c)} at the end of his career started saving you a seat in the meeting room. He wants you there at 6am on Tuesdays. He has never once been late.`,
      options: [
        {
          label: 'Every Tuesday, no exceptions', effect: 'Rating up, sleep gone',
          apply: (cc) => { rate(cc, 2); mor(cc, 5); hp(cc, -2); return `Eleven months of 6am Tuesdays. He gave you everything he knew and asked for nothing. Rating +2 to ${cc.ovr}, morale +5, health -2.`; },
        },
        {
          label: 'Take the notes, keep your own routine', effect: 'Small gain, own clock',
          apply: (cc) => { rate(cc, 1); hp(cc, 3); return 'You took the good stuff and slept in twice a week. Rating +1, health +3. He noticed, and said nothing, which was worse.'; },
        },
        {
          label: 'Politely dodge him all offseason', effect: 'Rest, missed shortcut',
          apply: (cc) => { hp(cc, 6); mor(cc, 2); return 'You rested instead. Your body thanked you and a decade of knowledge walked out of the building in March. Health +6, morale +2.'; },
        },
      ],
    });
  }

  if (yrs >= 1 && c.ovr < 86) {
    deck.push({
      id: 'lifeA_position_battle',
      title: 'They signed a guy for your exact job',
      body: `${teamLabelOf(c.team)} brought in a veteran on a one year deal who plays your position and your role. The coaches keep saying the word competition. Everyone in the building hears the actual message.`,
      options: [
        {
          label: 'Bury him in camp', effect: 'Rating up, body cost',
          apply: (cc) => { rate(cc, 2); hp(cc, -5); mor(cc, 6); return `You treated every walkthrough like a playoff game and won the job in the second preseason week. Rating +2 to ${cc.ovr}, morale +6, health -5.`; },
        },
        {
          label: 'Help him and win the room instead', effect: 'Respect, job unclear',
          apply: (cc, r) => {
            mor(cc, 8);
            if (r() < 0.5) { rate(cc, 1); return `You taught him the checks and got sharper teaching them. Morale +8 and rating +1 to ${cc.ovr}. You split the reps and both played well.`; }
            return 'You taught him the checks and he took 40 percent of your snaps. The room loves you, the stat sheet does not. Morale +8.';
          },
        },
        {
          label: 'Ask the GM to just cut him', effect: 'Bold, could backfire',
          apply: (cc, r) => {
            if (r() < 0.45) { mor(cc, 10); setFlag(cc, 'gmFriction', flag(cc, 'gmFriction') + 1); return 'They cut him in June. You got every first team rep and a permanent note in your file. Morale +10.'; }
            mor(cc, -5); fan(cc, -4); setFlag(cc, 'gmFriction', flag(cc, 'gmFriction') + 1);
            return 'The GM told a radio show that nobody is above competition. He did not say your name. He did not have to. Morale -5, fanbase -4.';
          },
        },
      ],
    });
  }

  if (yrs >= 3 && flag(c, 'captain') === 0) {
    deck.push({
      id: 'lifeA_captain_vote',
      title: 'The C on the jersey',
      body: 'Captain votes are Wednesday morning. Two guys have already told you they are voting for you. One of them is the guy you would be taking it from.',
      options: [
        {
          label: 'Campaign quietly and earn it', effect: 'Leadership, small risk',
          apply: (cc, r) => {
            if (r() < 0.68) { setFlag(cc, 'captain', 1); mor(cc, 10); fan(cc, 6); return 'You got the C in your fourth year. Your mother cried at a patch. Morale +10, fanbase +6.'; }
            mor(cc, -4); return 'You lost by two votes to a special teamer everybody genuinely loves. It stung more than you expected. Morale -4.';
          },
        },
        {
          label: 'Tell everybody to vote for the old head', effect: 'Grace, quiet respect',
          apply: (cc) => { mor(cc, 7); setFlag(cc, 'roomRespect', flag(cc, 'roomRespect') + 2); return 'You gave away a captaincy you had already won. That story got told in that locker room for ten years. Morale +7.'; },
        },
        {
          label: 'Say nothing and just play', effect: 'Neutral, saves energy',
          apply: (cc, r) => {
            if (r() < 0.4) { setFlag(cc, 'captain', 1); mor(cc, 8); fan(cc, 4); return 'You campaigned for nothing and won anyway. Morale +8, fanbase +4.'; }
            mor(cc, 2); hp(cc, 3); return 'No speeches, no politics, no extra meetings. You showed up and worked. Morale +2, health +3.';
          },
        },
      ],
    });
  }

  if (c.morale < 74) {
    deck.push({
      id: 'lifeA_coach_grudge',
      title: 'The coach who does not like you',
      body: 'Your position coach has a favorite and it is not you. He corrects your footwork louder than anyone else in the building and never once in private.',
      options: [
        {
          label: 'Out work the grudge', effect: 'Rating up, grinding morale',
          apply: (cc) => { rate(cc, 1); mor(cc, -3); setFlag(cc, 'grudgeCoach', 1); return `You gave him nothing to yell about for eleven months. Rating +1 to ${cc.ovr}, morale -3. He still has not said your name kindly.`; },
        },
        {
          label: 'Go over his head to the head coach', effect: 'Fifty fifty gamble',
          apply: (cc, r) => {
            if (r() < 0.5) { mor(cc, 11); return 'The head coach heard you out, sat in on your meetings for a week, and quietly fixed it. Morale +11.'; }
            mor(cc, -8); fan(cc, -3); return 'It got back to him within a day and now two coaches think you are difficult. Morale -8, fanbase -3.';
          },
        },
        {
          label: 'Say it out loud in an interview', effect: 'Fanbase up, building tense',
          apply: (cc) => { fan(cc, 8); mor(cc, -2); setFlag(cc, 'gmFriction', flag(cc, 'gmFriction') + 1); return 'You told a reporter you are not the coaching staff\'s guy and you never have been. The clip lived for a week. Fanbase +8, morale -2.'; },
        },
      ],
    });
  }

  if (yrs >= 2 && c.ovr <= 88) {
    deck.push({
      id: 'lifeA_practice_squad_kid',
      title: 'The practice squad kid is dusting you',
      body: 'An undrafted rookie from a school you had to look up has beaten you in one on ones for three straight weeks. Coaches have started saying his name a lot in meetings.',
      options: [
        {
          label: 'Treat every rep like a playoff snap', effect: 'Rating up, wear up',
          apply: (cc) => { rate(cc, 2); hp(cc, -4); return `You stopped coasting through Wednesdays entirely. Rating +2 to ${cc.ovr}, health -4, and the kid stopped winning.`; },
        },
        {
          label: 'Coach him up and make him yours', effect: 'Room love, mutual gain',
          apply: (cc, r) => {
            mor(cc, 8);
            if (r() < 0.6) { rate(cc, 1); return `You taught him your whole release plan and got better explaining it out loud. Morale +8, rating +1 to ${cc.ovr}.`; }
            return 'You taught him everything and he made the 53 over a guy you liked. Morale +8, and a strange amount of guilt.';
          },
        },
        {
          label: 'Ask the coaches to move him off your side', effect: 'Reps kept, respect lost',
          apply: (cc) => { rate(cc, 1); mor(cc, -6); setFlag(cc, 'divaWatch', 1); return `They moved him. You kept every clean rep and the room noticed you asked. Rating +1 to ${cc.ovr}, morale -6.`; },
        },
      ],
    });
  }

  /* ================================ 2. MEDIA AND FAME ================================ */

  if (yrs >= 1) {
    deck.push({
      id: 'lifeA_micd_up',
      title: "Mic'd up goes nuclear",
      body: `The league mic'd you up against ${foilOf(c)} who had been talking all week. What you said back was on a t-shirt within 40 minutes and on a billboard by Thursday.`,
      options: [
        {
          label: 'Lean in and sell the shirt yourself', effect: 'Fame and money',
          apply: (cc) => { fan(cc, 12); paid(cc, 1.6); return 'You trademarked it on a Tuesday and moved 90,000 shirts by Christmas. Fanbase +12 and 1.6M earned.'; },
        },
        {
          label: 'Apologize to him privately', effect: 'Class, less noise',
          apply: (cc) => { mor(cc, 6); fan(cc, 3); return 'You called him, he laughed, and you both let it die. Morale +6, fanbase +3. Two years later he was your teammate.'; },
        },
        {
          label: 'Never explain it, ever', effect: 'Mystique, zero comment',
          apply: (cc) => { fan(cc, 8); mor(cc, 2); return 'You refused to discuss it for the rest of your career, which made it ten times bigger. Fanbase +8, morale +2.'; },
        },
      ],
    });
  }

  if (yrs >= 2) {
    deck.push({
      id: 'lifeA_podcast_take',
      title: 'You said the quiet part on a podcast',
      body: 'Three hours of easy vibes and one sentence about your offensive line. That sentence is now a graphic on every show in America and a printout in a real locker room.',
      options: [
        {
          label: 'Double down on camera', effect: 'Fans up, room down',
          apply: (cc) => { fan(cc, 10); mor(cc, -9); setFlag(cc, 'looseCannon', 1); return 'You said it again slower, looking at the camera. Fanbase +10, morale -9. Nobody helped you up for a month.'; },
        },
        {
          label: 'Apologize to the room first, the public second', effect: 'Repairs the locker room',
          apply: (cc) => { mor(cc, 9); fan(cc, -3); return 'You stood up in a team meeting before you said a word to a reporter. That is the order that matters. Morale +9, fanbase -3.'; },
        },
        {
          label: 'Go completely silent for a month', effect: 'Rating up, story dies',
          apply: (cc) => { rate(cc, 1); mor(cc, 5); fan(cc, -4); return `No interviews, no posts, 31 days of work. Rating +1 to ${cc.ovr}, morale +5, fanbase -4.`; },
        },
      ],
    });
  }

  if (c.fanbase >= 45 || c.morale < 60) {
    deck.push({
      id: 'lifeA_hit_piece',
      title: 'The hit piece',
      body: 'A national writer spent two months on 4,000 words about how you are the reason the locker room is broken. Two anonymous teammates are quoted. You have theories about both.',
      options: [
        {
          label: 'Answer it with a season', effect: 'Quiet fury, rating up',
          apply: (cc) => { rate(cc, 1); mor(cc, 5); fan(cc, 3); return `You taped the headline inside your locker and said nothing for eleven months. Rating +1 to ${cc.ovr}, morale +5, fanbase +3.`; },
        },
        {
          label: 'Go after the writer online at 1am', effect: 'Viral and messy',
          apply: (cc) => { fan(cc, 9); mor(cc, -6); return 'Four posts, one of them deleted, all of them screenshotted. Fanbase +9, morale -6, and the story lived three weeks longer than it should have.'; },
        },
        {
          label: 'Invite the writer to spend a full day with you', effect: 'Risky, could flip it',
          apply: (cc, r) => {
            if (r() < 0.6) { fan(cc, 13); mor(cc, 7); return 'He watched you rehab at 6am, tutor a rookie, and drive your grandmother to church. The follow up piece was an apology in everything but the headline. Fanbase +13, morale +7.'; }
            fan(cc, -6); mor(cc, -4); return 'He came, watched, and wrote a second piece that was somehow worse. Fanbase -6, morale -4. Never again.';
          },
        },
      ],
    });
  }

  if (c.fanbase >= 55 && yrs >= 2) {
    deck.push({
      id: 'lifeA_doc_crew',
      title: 'The documentary crew wants your whole season',
      body: 'A streaming service wants cameras in your kitchen, your rehab table and your worst days. The check is real. So is the part where a stranger films you crying.',
      options: [
        {
          label: 'Full access, take the money', effect: 'Money and fame, no privacy',
          apply: (cc) => { paid(cc, 4.5); fan(cc, 14); mor(cc, -6); return 'Eight episodes, 4.5M, and a scene of you in a hospital hallway that you have never watched. Fanbase +14, morale -6.'; },
        },
        {
          label: 'Football only, no house, no family', effect: 'Balanced deal',
          apply: (cc) => { paid(cc, 1.6); fan(cc, 7); return 'Facility, field and film room only. 1.6M earned, fanbase +7, and your front door stayed yours.'; },
        },
        {
          label: 'No cameras at all', effect: 'Peace, no bag',
          apply: (cc) => { mor(cc, 8); hp(cc, 3); return 'You said no to 4.5M so nobody would film your daughter. Morale +8, health +3, zero regrets.'; },
        },
      ],
    });
  }

  if (reachedSb) {
    deck.push({
      id: 'lifeA_media_day',
      title: 'Media day is a circus',
      body: 'Five thousand credentials, a man in a wedding dress proposing on live television, and a nine year old with better questions than anyone in the room. Kickoff is six days away.',
      options: [
        {
          label: 'Work the room and be the star of it', effect: 'Fame up, energy down',
          apply: (cc) => { fan(cc, 13); paid(cc, 0.4); hp(cc, -2); return 'You did 41 interviews, married the man in the dress on camera, and became the face of the week. Fanbase +13, 0.4M in appearance money, health -2.'; },
        },
        {
          label: 'Answer everything in five words or less', effect: 'Meme, mystery',
          apply: (cc) => { fan(cc, 7); mor(cc, 4); return 'Forty minutes, 63 questions, 61 answers of five words. The supercut has nine million views. Fanbase +7, morale +4.'; },
        },
        {
          label: 'Hide behind the vets and study', effect: 'Focus over shine',
          apply: (cc) => { rate(cc, 1); mor(cc, 5); fan(cc, -2); return `You let the loud guys eat and watched two extra hours of tape in the hotel. Rating +1 to ${cc.ovr}, morale +5, fanbase -2.`; },
        },
      ],
    });
  }

  if (yrs >= 2 && rng() < 0.85) {
    deck.push({
      id: 'lifeA_trash_talk_feud',
      title: 'The feud',
      body: `${foilOf(c)} has said your name in four separate interviews this offseason and none of them were nice. You play him twice a year. Possibly forever.`,
      options: [
        {
          label: 'Answer him every single week', effect: 'Fame up, target on you',
          apply: (cc) => { fan(cc, 11); mor(cc, 3); hp(cc, -3); setFlag(cc, 'feud', flag(cc, 'feud') + 1); return 'You gave the internet a war it did not deserve and he gave you a stinger in week 3. Fanbase +11, morale +3, health -3.'; },
        },
        {
          label: 'Beat him and say absolutely nothing', effect: 'Rating and respect',
          apply: (cc) => { rate(cc, 1); mor(cc, 5); return `You went 2 and 0 against him and never once said his name. Rating +1 to ${cc.ovr}, morale +5. The silence did more damage than any quote.`; },
        },
        {
          label: 'Text him and squash it', effect: 'Peace, fans bored',
          apply: (cc) => { mor(cc, 6); fan(cc, -4); hp(cc, 2); return 'One phone call and it turned out he was quoting a two year old joke. Morale +6, health +2, fanbase -4 from a very disappointed timeline.'; },
        },
      ],
    });
  }

  if (c.fanbase >= 40) {
    deck.push({
      id: 'lifeA_burner_account',
      title: 'The burner account',
      body: 'Somebody found an account with 41 followers that exists only to defend you and argue with a blogger about your third down numbers. It is, obviously, not yours.',
      options: [
        {
          label: 'Admit it and laugh at yourself', effect: 'Human, mocked forever',
          apply: (cc) => { fan(cc, 8); mor(cc, -3); return 'You owned it in a press conference and the room genuinely cheered. Fanbase +8, morale -3, and a permanent nickname.'; },
        },
        {
          label: 'Deny it until the sun burns out', effect: 'Meme legend',
          apply: (cc) => { fan(cc, 6); mor(cc, 2); setFlag(cc, 'burner', 1); return 'You have denied it in eleven separate interviews and the account is still posting. Fanbase +6, morale +2.'; },
        },
        {
          label: 'Delete everything and go dark', effect: 'Peace and focus',
          apply: (cc) => { rate(cc, 1); mor(cc, 6); fan(cc, -5); return `Phone in a drawer, apps off the home screen, one long boring offseason of actual work. Rating +1 to ${cc.ovr}, morale +6, fanbase -5.`; },
        },
      ],
    });
  }

  /* ================================= 3. CITY AND FANS ================================= */

  if (missedPlayoffs || c.fanbase < 55) {
    deck.push({
      id: 'lifeA_booed_home',
      title: 'Booed at home',
      body: 'Not scattered booing. Organized, 60,000 strong, loud enough to get its own segment on the local news. Your family was sitting in section 118 for all of it.',
      options: [
        {
          label: 'Tell them you heard it and you will fix it', effect: 'Honest, wins them back',
          apply: (cc) => { fan(cc, 10); mor(cc, -2); return `You stood at a podium and said they were right. ${teamLabelOf(cc.team)} fans respect exactly one thing and that is it. Fanbase +10, morale -2.`; },
        },
        {
          label: 'Fire straight back at the crowd', effect: 'War with the city',
          apply: (cc) => { fan(cc, -13); mor(cc, 7); setFlag(cc, 'cityWar', 1); return 'You cupped your ear at your own home crowd. Fanbase -13, morale +7, and a rivalry with 60,000 people who paid to be there.'; },
        },
        {
          label: 'Say nothing and play better', effect: 'Slow burn',
          apply: (cc) => { rate(cc, 1); mor(cc, 2); fan(cc, 3); return `No quotes, no excuses, a better offseason than the one before. Rating +1 to ${cc.ovr}, morale +2, fanbase +3.`; },
        },
      ],
    });
  }

  if (c.fanbase >= 62) {
    deck.push({
      id: 'lifeA_fan_mural',
      title: 'They painted you on a wall',
      body: 'Three stories tall on the side of a bakery two blocks from the stadium. The artist wants you at the unveiling. The bakery wants to name a donut after you.',
      options: [
        {
          label: 'Show up and bring the whole offensive line', effect: 'City love',
          apply: (cc) => { fan(cc, 10); mor(cc, 6); return 'You showed up with five enormous men who ate 60 donuts between them. The photo ran on the front page. Fanbase +10, morale +6.'; },
        },
        {
          label: 'Pay the artist properly and fund three more murals', effect: 'Costs money, deep love',
          apply: (cc) => { bank(cc, -0.25); fan(cc, 15); mor(cc, 5); own(cc, 'Neighborhood mural project'); return 'You paid her real money and commissioned three more walls, none of them of you. Net worth down 0.25M, fanbase +15, morale +5.'; },
        },
        {
          label: 'Skip it, you hate that stuff', effect: 'Private, small dip',
          apply: (cc) => { fan(cc, -4); mor(cc, 5); hp(cc, 2); return 'You sent a signed jersey and stayed home with your kids. Fanbase -4, morale +5, health +2.'; },
        },
      ],
    });
  }

  deck.push({
    id: 'lifeA_hospital_visit',
    title: 'Room 412',
    body: 'The team does a childrens hospital visit every December. In room 412 there is a kid with your poster on the wall, your number on his cast, and a very rough month ahead of him.',
    options: [
      {
        label: 'Stay four hours after the cameras leave', effect: 'Morale and city love',
        apply: (cc) => { mor(cc, 11); fan(cc, 8); return 'The bus left without you. You stayed until visiting hours ended and came back twice more that month with no cameras. Morale +11, fanbase +8.'; },
      },
      {
        label: 'Quietly pay off a family bill on the way out', effect: 'Costs money, means everything',
        apply: (cc, r) => {
          bank(cc, -0.15); mor(cc, 12);
          if (r() < 0.5) { fan(cc, 12); return 'You told the billing office to keep your name off it. A nurse told a reporter anyway. Net worth down 0.15M, morale +12, fanbase +12.'; }
          fan(cc, 2); return 'You cleared a family\'s bill and nobody ever found out. Net worth down 0.15M, morale +12, fanbase +2.';
        },
      },
      {
        label: 'Send signed gear and use the day for rehab', effect: 'Recovery over optics',
        apply: (cc) => { hp(cc, 5); fan(cc, 1); return 'Two boxes of signed gear went to the ward and you spent the day on a table with the trainers. Health +5, fanbase +1.'; },
      },
    ],
  });

  if (COLD_TOWNS.includes(c.team)) {
    deck.push({
      id: 'lifeA_snow_game',
      title: 'The snow game',
      body: `Eighteen inches on the field, no visible yard lines, and ${teamLabelOf(c.team)} fans getting paid by the hour to shovel out their own stadium. The league asks if you want it moved to a dome three states away.`,
      options: [
        {
          label: 'Short sleeves, no gloves, be a poster', effect: 'Legend, real body cost',
          apply: (cc) => { fan(cc, 15); mor(cc, 8); hp(cc, -6); return 'That photograph of you steaming in the snow with bare arms hangs in every bar in the city. Fanbase +15, morale +8, health -6.'; },
        },
        {
          label: 'Play it, but bundled up and smart', effect: 'Warm, still counts',
          apply: (cc) => { fan(cc, 5); mor(cc, 3); hp(cc, -1); return 'Sleeves, hand warmers, three pairs of socks, zero frostbite. Fanbase +5, morale +3, health -1.'; },
        },
        {
          label: 'Play, then pay the shovel crew double yourself', effect: 'Money for city love',
          apply: (cc) => { bank(cc, -0.05); fan(cc, 13); mor(cc, 7); hp(cc, -3); return 'You handed 400 shovelers an extra hundred each and coffee at midnight. Net worth down 0.05M, fanbase +13, morale +7, health -3.'; },
        },
      ],
    });
  }

  if (c.fanbase >= 65 && yrs >= 4) {
    deck.push({
      id: 'lifeA_bar_named',
      title: 'A bar wants your name on it',
      body: 'A place four blocks from the stadium wants to rename itself after your nickname and hang your rookie jersey behind the bar. They are offering a small piece of the business.',
      options: [
        {
          label: 'Take the equity', effect: 'Money, some risk',
          apply: (cc, r) => {
            own(cc, 'Stake in a bar near the stadium');
            if (r() < 0.6) { bank(cc, 1.1); fan(cc, 8); return 'The place prints money on every home Sunday. Net worth up 1.1M, fanbase +8, and a booth nobody else is allowed to sit in.'; }
            bank(cc, -0.25); fan(cc, 4); mor(cc, -2); return 'The bar closed in 26 months and you learned what a personal guarantee is. Net worth down 0.25M, fanbase +4, morale -2.';
          },
        },
        {
          label: 'Give them the name for free', effect: 'City love, no money',
          apply: (cc) => { fan(cc, 13); mor(cc, 6); return 'You signed the name rights over for one dollar and a standing tab you never used. Fanbase +13, morale +6.'; },
        },
        {
          label: 'Say no, not a bar, not your name', effect: 'Clean, slightly cold',
          apply: (cc) => { fan(cc, -3); mor(cc, 5); return 'You had your reasons and you did not explain them to anyone. Fanbase -3, morale +5.'; },
        },
      ],
    });
  }

  if (yrs >= 1) {
    deck.push({
      id: 'lifeA_cause_cleats',
      title: 'The cleats with a cause',
      body: 'One week a year the league lets you paint anything you want on your feet. A designer sends three options. The league sends a rules sheet with eleven bullet points.',
      options: [
        {
          label: 'Paint your block on them and auction them off', effect: 'Charity, city love',
          apply: (cc) => { bank(cc, -0.05); fan(cc, 11); mor(cc, 8); return 'Your corner store, your high school field and your grandmother\'s porch, all on two shoes. They raised 210,000 for the neighborhood. Fanbase +11, morale +8.'; },
        },
        {
          label: 'Wear an unapproved design and eat the fine', effect: 'Fine, enormous noise',
          apply: (cc) => { bank(cc, -0.04); fan(cc, 15); mor(cc, 5); setFlag(cc, 'leagueFine', flag(cc, 'leagueFine') + 1); return 'A 40,000 dollar fine and about nine million dollars of free attention for the cause. Fanbase +15, morale +5.'; },
        },
        {
          label: 'Wear the approved team version', effect: 'Safe, sponsor pays',
          apply: (cc) => { paid(cc, 0.3); fan(cc, 4); mor(cc, 2); return 'Tidy, compliant, and the shoe company added a 0.3M bonus for it. Fanbase +4, morale +2.'; },
        },
      ],
    });
  }

  /* ================================= 4. BODY AND MIND ================================= */

  if (c.health < 94) {
    deck.push({
      id: 'lifeA_nagging_injury',
      title: 'The thing you have not told the trainers',
      body: `Something in your ${soreSpot(c)} has been wrong since October. It loosens up by the second quarter. That is the exact part that worries the doctors.`,
      options: [
        {
          label: 'Report it and get it scanned', effect: 'Health up, snaps lost',
          apply: (cc) => { hp(cc, 11); mor(cc, -3); setFlag(cc, 'honestBody', flag(cc, 'honestBody') + 1); return 'The scan found something small that was about to become something enormous. Six weeks of rehab bought you years. Health +11, morale -3.'; },
        },
        {
          label: 'Report it and take the full rehab, miss camp', effect: 'Best long term',
          apply: (cc) => { hp(cc, 19); rate(cc, -1); mor(cc, -5); return `You did the entire twelve week plan and missed all of camp for it. Health +19, rating -1 to ${cc.ovr}, morale -5. Your body will be there at 34.`; },
        },
        {
          label: 'Manage it quietly with the old tricks', effect: 'Play on, wear adds up',
          apply: (cc) => { hp(cc, -7); mor(cc, 2); return 'Tape, heat, and never once saying the word out loud. You played all 17 and paid for it in a way you will feel for a decade. Health -7, morale +2.'; },
        },
      ],
    });
  }

  if (c.age <= 30) {
    deck.push({
      id: 'lifeA_motion_rebuild',
      title: `The guru who wants to rebuild your ${craftNoun(c)}`,
      body: `A man in Arizona with nine cameras and a lot of opinions says your ${craftNoun(c)} is costing you years and yards. The rebuild takes a full offseason and feels awful for the first two months.`,
      options: [
        {
          label: 'Do the full rebuild', effect: 'Big swing, real risk',
          apply: (cc, r) => {
            bank(cc, -0.2);
            if (r() < 0.6) { cc.pot = Math.min(99, cc.pot + 2); rate(cc, 3); return `It clicked in June and you have never felt this clean. Rating +3 to ${cc.ovr}, potential +2, net worth down 0.2M.`; }
            rate(cc, -2); mor(cc, -7); return `You spent an offseason thinking instead of playing and showed up in August as a stranger to yourself. Rating -2 to ${cc.ovr}, morale -7, net worth down 0.2M.`;
          },
        },
        {
          label: 'Take the two best tweaks and go home', effect: 'Small safe gain',
          apply: (cc) => { bank(cc, -0.06); rate(cc, 1); hp(cc, 3); return `Two fixes, four days, no identity crisis. Rating +1 to ${cc.ovr}, health +3.`; },
        },
        {
          label: 'Trust exactly what got you here', effect: 'Confidence, no change',
          apply: (cc) => { mor(cc, 8); hp(cc, 4); return 'You told him you have been doing it this way since you were nine and it has worked every single year. Morale +8, health +4.'; },
        },
      ],
    });
  }

  if (yrs >= 2) {
    deck.push({
      id: 'lifeA_sleep_clinic',
      title: 'The sleep guy',
      body: 'A specialist watched you sleep for three nights and used the phrase structurally alarming. You are averaging five hours and 20 minutes on a body that hits people for a living.',
      options: [
        {
          label: 'Full protocol, phone out of the room', effect: 'Health and rating up',
          apply: (cc) => { bank(cc, -0.08); hp(cc, 11); rate(cc, 1); mor(cc, -2); return `Blackout everything, 9pm bedtime, and the most boring life of anyone you know. Health +11, rating +1 to ${cc.ovr}, morale -2.`; },
        },
        {
          label: 'Just fix the phone habit', effect: 'Cheap, decent gain',
          apply: (cc) => { hp(cc, 5); mor(cc, 1); return 'One rule, no screens after ten, and you gained 70 minutes a night. Health +5, morale +1.'; },
        },
        {
          label: 'Ignore him, you have always slept badly', effect: 'Keep your nights',
          apply: (cc) => { mor(cc, 6); hp(cc, -3); return 'You kept your 1am gaming and your 6am alarms and told him athletes are not lab rats. Morale +6, health -3.'; },
        },
      ],
    });
  }

  if (yrs >= 1) {
    deck.push({
      id: 'lifeA_nutritionist',
      title: 'The chef your agent hired',
      body: 'One hundred and eighty thousand a year for a man who weighs your breakfast and has strong opinions about orange juice. Your mother is offended on a spiritual level.',
      options: [
        {
          label: 'Full plan, no cheat days, all year', effect: 'Health up, joy down',
          apply: (cc) => { bank(cc, -0.18); hp(cc, 10); rate(cc, 1); mor(cc, -4); return `You reported to camp at the exact weight they asked for, three years running. Health +10, rating +1 to ${cc.ovr}, morale -4, net worth down 0.18M.`; },
        },
        {
          label: 'Chef in season, your mom in the offseason', effect: 'Balanced, mom approved',
          apply: (cc) => { bank(cc, -0.1); hp(cc, 5); mor(cc, 5); return 'Macros from September to January, oxtail and rice from February to July. Health +5, morale +5, net worth down 0.1M.'; },
        },
        {
          label: 'Cancel him, eat like a human being', effect: 'Money saved, wear up',
          apply: (cc) => { hp(cc, -3); mor(cc, 8); return 'You fired a man for putting a scale under a plate of your grandmother\'s food. Morale +8, health -3.'; },
        },
      ],
    });
  }

  if (yrs >= 1) {
    deck.push({
      id: 'lifeA_concussion_protocol',
      title: 'The hit you do not remember',
      body: 'You got up fast and told everyone you were fine. You genuinely cannot remember the drive before it. The independent spotter is already walking toward you.',
      options: [
        {
          label: 'Tell the doctor the truth and enter protocol', effect: 'Right call, clearly best',
          apply: (cc) => { hp(cc, 9); mor(cc, 6); fan(cc, 5); setFlag(cc, 'honestBody', flag(cc, 'honestBody') + 1); return 'You told the truth, sat out, and cleared protocol properly nine days later. Health +9, morale +6, fanbase +5. Every teammate with kids noticed.'; },
        },
        {
          label: 'Report it and take an extra week past clearance', effect: 'Safest, some rust',
          apply: (cc) => { hp(cc, 15); rate(cc, -1); mor(cc, 3); fan(cc, 3); setFlag(cc, 'honestBody', flag(cc, 'honestBody') + 2); return `You were cleared and still sat one more game because your head did not feel right. Health +15, morale +3, fanbase +3, rating -1 to ${cc.ovr} from the rust. That is the version of you that gets old comfortably.`; },
        },
        {
          label: 'Say you are fine and go back in', effect: 'Serious lasting damage',
          apply: (cc) => { hp(cc, -19); mor(cc, -9); fan(cc, 2); setFlag(cc, 'hidHead', flag(cc, 'hidHead') + 1); return 'You lied to a doctor and finished the game. You do not remember the fourth quarter, the flight, or the drive home. Health -19, morale -9. Nothing you did on that field was worth it.'; },
        },
      ],
    });
  }

  if (c.health < 82 || c.age >= 29) {
    deck.push({
      id: 'lifeA_offseason_surgery',
      title: 'The elective surgery window',
      body: 'The doctors say you can play three more years the way you are, or take a year of pain now and maybe get six. Nobody is going to make this decision for you.',
      options: [
        {
          label: 'Do it now, miss camp and the opener', effect: 'Long term health',
          apply: (cc) => { hp(cc, 25); rate(cc, -1); mor(cc, -4); return `Full reconstruction in February, crutches in March, running in July. Health +25, rating -1 to ${cc.ovr}, morale -4. You bought years.`; },
        },
        {
          label: 'The small cleanup, back for week one', effect: 'Middle path',
          apply: (cc) => { hp(cc, 11); mor(cc, 1); return 'Forty minutes of arthroscopic work and a six week rehab nobody outside the building heard about. Health +11, morale +1.'; },
        },
        {
          label: 'Wait one more year', effect: 'Play now, pay later',
          apply: (cc) => { hp(cc, -7); mor(cc, 5); return 'You played all 17 games on a joint three doctors wanted to open up. Morale +5, health -7, and a decision that is still waiting for you.'; },
        },
      ],
    });
  }

  if (c.morale < 78 || yrs >= 3) {
    deck.push({
      id: 'lifeA_therapy_room',
      title: 'The room with the couch',
      body: 'The team psychologist has an office nobody walks past on purpose. A ten year vet told you he goes every Tuesday and has since his second season.',
      options: [
        {
          label: 'Go every week', effect: 'Morale way up, clarity',
          apply: (cc) => { mor(cc, 13); rate(cc, 1); setFlag(cc, 'therapy', 1); return `Fifty minutes every Tuesday for a full year. You stopped carrying three bad games into every practice. Morale +13, rating +1 to ${cc.ovr}.`; },
        },
        {
          label: 'Go once and see how it feels', effect: 'Small step',
          apply: (cc) => { mor(cc, 6); return 'One session, which turned into four, which turned into a phone number you actually use. Morale +6.'; },
        },
        {
          label: 'Handle it the way you always have', effect: 'Rating up, harder road',
          apply: (cc) => { rate(cc, 1); mor(cc, -3); return `You put it all into the squat rack at 5am instead. Rating +1 to ${cc.ovr}, morale -3, and the same thing waiting for you in March.`; },
        },
      ],
    });
  }

  /* ============================== 5. COACHING AND SCHEME ============================== */

  if (yrs >= 1 && rng() < 0.8) {
    deck.push({
      id: 'lifeA_new_oc',
      title: 'The new coordinator',
      body: 'The new offensive coordinator is 34, talks entirely in tempo and leverage, and has already told a podcast that everything is being installed from zero this spring.',
      options: [
        {
          label: 'Learn the entire playbook by June', effect: 'Rating up, offseason gone',
          apply: (cc) => { rate(cc, 2); mor(cc, -3); hp(cc, -2); return `You knew all 11 jobs on 140 concepts before anybody else knew their own. Rating +2 to ${cc.ovr}, morale -3, health -2.`; },
        },
        {
          label: 'Push back and keep your old concepts', effect: 'Comfort, friction',
          apply: (cc, r) => {
            mor(cc, 5); setFlag(cc, 'ocFriction', 1);
            if (r() < 0.5) { rate(cc, 1); return `He kept four of your favorites in the third down package. Morale +5, rating +1 to ${cc.ovr}.`; }
            rate(cc, -1); return `He kept none of them and you spent September a half step late. Morale +5, rating -1 to ${cc.ovr}.`;
          },
        },
        {
          label: 'Ask to sit in on the install meetings', effect: 'Ownership and respect',
          apply: (cc) => { rate(cc, 1); mor(cc, 8); fan(cc, 2); return `You spent March in a windowless room helping build it, so by August it was partly yours. Rating +1 to ${cc.ovr}, morale +8, fanbase +2.`; },
        },
      ],
    });
  }

  if (c.ovr >= 72 && yrs >= 1) {
    deck.push({
      id: 'lifeA_scheme_misfit',
      title: 'The scheme does not fit you',
      body: `They are running a system built for somebody else's ${posNoun(c)}. Your tape is going to look like a lie about how good you actually are.`,
      options: [
        {
          label: 'Adapt and become a different player', effect: 'Rating up, identity cost',
          apply: (cc) => { rate(cc, 1); mor(cc, -5); return `You learned a job you never wanted and did it well. Rating +1 to ${cc.ovr}, morale -5. Nobody will ever see the player you were.`; },
        },
        {
          label: 'Bring tape to a meeting and make the case', effect: 'Could reshape the offense',
          apply: (cc, r) => {
            if (r() < 0.58) { rate(cc, 2); mor(cc, 7); return `You brought 40 clips and a plan and they built a package around it by week 4. Rating +2 to ${cc.ovr}, morale +7.`; }
            mor(cc, -5); setFlag(cc, 'ocFriction', 1); return 'They watched all 40 clips, nodded a lot, and changed nothing. Morale -5.';
          },
        },
        {
          label: 'Say it publicly and force the issue', effect: 'Loud, expensive',
          apply: (cc) => { fan(cc, 9); mor(cc, -4); setFlag(cc, 'divaWatch', 1); setFlag(cc, 'gmFriction', flag(cc, 'gmFriction') + 1); return 'You told a reporter the scheme wastes you and the quote traveled for nine days. Fanbase +9, morale -4, and a very long meeting on Monday.'; },
        },
      ],
    });
  }

  if (yrs >= 2) {
    const isQb = c.pos === 'QB';
    deck.push({
      id: 'lifeA_qb_room',
      title: isQb ? 'They drafted a quarterback in the first round' : 'New quarterback, new everything',
      body: isQb
        ? 'Same podium, different smile. The GM said the words we love our room four times in one press conference and never once said the word starter.'
        : 'The guy who made your career is gone. The new one is 23, throws it 60 yards on a rope, and has no idea where you like the ball.',
      options: [
        {
          label: isQb ? 'Mentor him like a professional' : 'Live in the facility with the new kid', effect: 'Chemistry and respect',
          apply: (cc) => {
            if (cc.pos === 'QB') { mor(cc, 6); fan(cc, 7); setFlag(cc, 'roomRespect', flag(cc, 'roomRespect') + 1); return 'You taught the kid your protection calls knowing exactly what it costs you. Morale +6, fanbase +7, and a reputation that outlives your arm.'; }
            rate(cc, 2); mor(cc, 4); return `Four hundred extra throws a week all spring. By September he was looking for you before he finished his drop. Rating +2 to ${cc.ovr}, morale +4.`;
          },
        },
        {
          label: isQb ? 'Play like your job is on fire' : 'Ask to be the safety valve on every play', effect: 'Rating up, wear up',
          apply: (cc) => { rate(cc, 2); hp(cc, -4); mor(cc, -2); return `You added an hour to every day and burned the candle from both ends. Rating +2 to ${cc.ovr}, health -4, morale -2.`; },
        },
        {
          label: 'Say the honest thing on camera', effect: 'Fans up, building tense',
          apply: (cc) => { fan(cc, 9); mor(cc, -4); setFlag(cc, 'gmFriction', flag(cc, 'gmFriction') + 1); return 'You told the truth about how the room actually feels and it led every show in the country. Fanbase +9, morale -4.'; },
        },
      ],
    });
  }

  if (c.contractYears <= 0 && c.ovr >= 78) {
    const tag = Math.round(marketOf(c) * 1.05 * 10) / 10;
    deck.push({
      id: 'lifeA_franchise_tag',
      title: 'They tagged you',
      body: `One year at ${tag}M fully guaranteed, no long term deal, and the right to do the exact same thing to you next February. ${teamLabelOf(c.team)} called it a compliment on the way out of the room.`,
      options: [
        {
          label: 'Sign the tag and go play', effect: 'Big year, no security',
          apply: (cc) => { cc.salary = tag; cc.contractYears = 1; mor(cc, -4); return `Signed the tag at ${tag}M for one season. Morale -4, and every snap this year is a job interview.`; },
        },
        {
          label: 'Hold out until they extend you', effect: 'Leverage, fines, rust',
          apply: (cc, r) => {
            if (r() < 0.5) { cc.salary = Math.round(tag * 1.18 * 10) / 10; cc.contractYears = 4; mor(cc, 9); fan(cc, -4); return `You missed 31 days and signed for ${cc.salary}M over four years on the first day of pads. Morale +9, fanbase -4.`; }
            bank(cc, -0.6); rate(cc, -1); mor(cc, -7); cc.salary = tag; cc.contractYears = 1;
            return `They never budged. You reported in August, 0.6M lighter in fines, and played the tag at ${tag}M anyway. Rating -1 to ${cc.ovr}, morale -7.`;
          },
        },
        {
          label: 'Sign it, then skip the whole offseason program', effect: 'Rest over reps',
          apply: (cc) => { cc.salary = tag; cc.contractYears = 1; hp(cc, 8); rate(cc, -1); mor(cc, 3); return `Signed at ${tag}M and did not enter the building until July. Health +8, morale +3, rating -1 to ${cc.ovr}.`; },
        },
      ],
    });
  }

  if (c.age >= 27 || c.ovr < 76) {
    const pitch = c.pos === 'QB'
      ? 'The coach wants you learning a package at tight end and wildcat. He says the phrase positionless offense without blinking once.'
      : c.pos === 'RB'
        ? 'They want you in the slot full time and off the between the tackles work. Your knees would like a word with your pride.'
        : c.pos === 'WR'
          ? 'They want you inside at slot and returning punts. More snaps, smaller highlights, shorter career for your knees or longer, depending who you ask.'
          : 'They want you at a completely different spot and they want an answer this week.';
    deck.push({
      id: 'lifeA_position_switch',
      title: 'They want to move you',
      body: pitch,
      options: [
        {
          label: 'Take the switch and master it', effect: 'Snaps up, pride down',
          apply: (cc) => { rate(cc, 1); hp(cc, 5); mor(cc, -4); fan(cc, -2); setFlag(cc, 'switched', 1); return `You learned a new job at 28 and played 300 more snaps than last year. Rating +1 to ${cc.ovr}, health +5, morale -4, fanbase -2.`; },
        },
        {
          label: `Refuse, you are a ${posNoun(c)}`, effect: 'Identity, fewer snaps',
          apply: (cc) => { mor(cc, 8); fan(cc, 3); return `You told them what you are and what you are not. Morale +8, fanbase +3, and about 200 fewer snaps than the guy who said yes.`; },
        },
        {
          label: 'Do both and take every rep in camp', effect: 'Everything, body cost',
          apply: (cc) => { rate(cc, 2); hp(cc, -9); mor(cc, 2); return `Two position rooms, two playbooks, zero days off. Rating +2 to ${cc.ovr}, morale +2, health -9.`; },
        },
      ],
    });
  }

  if (yrs >= 2 && (missedPlayoffs || rng() < 0.4)) {
    deck.push({
      id: 'lifeA_coach_fired',
      title: 'Black Monday',
      body: 'The head coach who drafted you got fired in a hallway at 7am. The interim wore a headset for one game and now there are nine candidates and a search firm nobody has met.',
      options: [
        {
          label: 'Lobby publicly for the coordinator', effect: 'Loyalty, front office friction',
          apply: (cc, r) => {
            setFlag(cc, 'gmFriction', flag(cc, 'gmFriction') + 1);
            if (r() < 0.45) { mor(cc, 11); rate(cc, 1); return `They promoted him and he never forgot who said it out loud. Morale +11, rating +1 to ${cc.ovr}.`; }
            mor(cc, -5); fan(cc, 4); return 'They hired an outsider who read every quote you gave about the other guy. Morale -5, fanbase +4.';
          },
        },
        {
          label: 'Say nothing and go to work', effect: 'Neutral, rating up',
          apply: (cc) => { rate(cc, 1); mor(cc, 2); return `You stayed out of it entirely and were the best conditioned player at the first meeting. Rating +1 to ${cc.ovr}, morale +2.`; },
        },
        {
          label: 'Ask ownership for a seat in the interviews', effect: 'Power, and a price',
          apply: (cc, r) => {
            fan(cc, 6); setFlag(cc, 'gmFriction', flag(cc, 'gmFriction') + 1);
            if (r() < 0.55) { mor(cc, 8); return 'The owner let you sit in on two interviews and the whole league heard about it. Fanbase +6, morale +8.'; }
            mor(cc, -6); return 'The request leaked in nine hours and half the country called you a coach killer. Fanbase +6, morale -6.';
          },
        },
      ],
    });
  }

  /* ============================ 6. TRAINING CAMP AND SEASON ============================ */

  if (yrs >= 2 && c.contractYears >= 1 && c.ovr >= 80 && c.salary < marketOf(c) * 0.8) {
    deck.push({
      id: 'lifeA_holdout',
      title: 'Hold out',
      body: `You are paid ${c.salary}M on a deal signed by a worse version of you. The market says ${marketOf(c)}M. Your agent says the only leverage you own is not being in the building.`,
      options: [
        {
          label: 'Full holdout, miss all of camp', effect: 'Money, fines, rust',
          apply: (cc, r) => {
            if (r() < 0.55) {
              cc.salary = Math.round(marketOf(cc) * 1.02 * 10) / 10; cc.contractYears = 4; mor(cc, 9); fan(cc, -7);
              return `Thirty four days out and they blinked. New deal at ${cc.salary}M over four years. Morale +9, fanbase -7.`;
            }
            bank(cc, -1.2); rate(cc, -1); mor(cc, -10); fan(cc, -7);
            return `They never called. You reported in week 2 owing 1.2M in fines and a step behind everybody. Rating -1 to ${cc.ovr}, morale -10, fanbase -7.`;
          },
        },
        {
          label: 'Hold in: report, but do not practice', effect: 'Safe leverage',
          apply: (cc, r) => {
            hp(cc, 5);
            if (r() < 0.45) { cc.salary = Math.round(cc.salary * 1.25 * 10) / 10; mor(cc, 6); return `You stood on the sideline in a bucket hat for three weeks and left with a raise to ${cc.salary}M. Health +5, morale +6.`; }
            mor(cc, -4); return 'Three weeks of watching, no raise, and a hamstring that felt fantastic in September. Health +5, morale -4.';
          },
        },
        {
          label: 'Show up and play it out', effect: 'Respect, no raise',
          apply: (cc) => { mor(cc, 4); fan(cc, 9); rate(cc, 1); return `First man in the building on report day. Rating +1 to ${cc.ovr}, fanbase +9, morale +4, and the same paycheck.`; },
        },
      ],
    });
  }

  if (c.ovr >= 80) {
    deck.push({
      id: 'lifeA_preseason_snub',
      title: 'The list came out',
      body: 'The annual top 100 dropped and you are not on it. Two guys you handle in practice every Wednesday are in the top 60. Your phone has not stopped.',
      options: [
        {
          label: 'Print it and tape it inside your locker', effect: 'Fuel, rating up',
          apply: (cc) => { rate(cc, 1); mor(cc, 5); return `That printout stayed up all season, curling at the corners. Rating +1 to ${cc.ovr}, morale +5.`; },
        },
        {
          label: 'Laugh at the whole thing on camera', effect: 'Fanbase up',
          apply: (cc) => { fan(cc, 8); mor(cc, 3); return 'You read the list out loud on your own show and gave every name a rating out of ten. Fanbase +8, morale +3.'; },
        },
        {
          label: 'Call the analyst who left you off', effect: 'Chaos, content',
          apply: (cc, r) => {
            if (r() < 0.5) { fan(cc, 13); mor(cc, 4); return 'He put the call on air, apologized, and moved you to 34 the next year. Fanbase +13, morale +4.'; }
            fan(cc, 5); mor(cc, -6); return 'He put the call on air and it made you sound exactly as thin skinned as you were. Fanbase +5, morale -6.';
          },
        },
      ],
    });
  }

  if (yrs >= 1) {
    deck.push({
      id: 'lifeA_thanksgiving',
      title: 'Thanksgiving, 12:30, national television',
      body: 'Everyone you went to high school with and 30 million people who are already full will be watching. Your mother has invited 40 people to her house and told all of them you are coming after.',
      options: [
        {
          label: 'Fly the whole family in, 22 tickets', effect: 'Costs money, morale up',
          apply: (cc) => { bank(cc, -0.06); mor(cc, 11); fan(cc, 3); return 'Twenty two people in matching jerseys in section 106, all of them screaming. Net worth down 0.06M, morale +11, fanbase +3.'; },
        },
        {
          label: 'Phone off, treat it like a 1pm in October', effect: 'Focus, rating up',
          apply: (cc) => { rate(cc, 1); mor(cc, -2); return `You ignored 340 texts and played the most locked in game of your year. Rating +1 to ${cc.ovr}, morale -2.`; },
        },
        {
          label: 'Play, then drive four hours to eat at midnight', effect: 'Heart, no sleep',
          apply: (cc) => { mor(cc, 13); hp(cc, -3); fan(cc, 5); return 'You walked into your mother\'s kitchen at 11:50pm still smelling like a stadium and she had a plate in the oven. Morale +13, fanbase +5, health -3.'; },
        },
      ],
    });
  }

  if (c.fanbase >= 45 || c.ovr >= 82) {
    deck.push({
      id: 'lifeA_primetime',
      title: 'Flexed into Sunday night',
      body: 'The league moved your division game into the last window of the day. One night, every eyeball in the country, and a broadcast crew already calling it your audition.',
      options: [
        {
          label: 'Treat it as the biggest night of your life', effect: 'High risk, high fame',
          apply: (cc, r) => {
            if (r() < 0.6) { rate(cc, 1); fan(cc, 15); mor(cc, 9); return `You had the night people describe for 20 years. Rating +1 to ${cc.ovr}, fanbase +15, morale +9.`; }
            fan(cc, -7); mor(cc, -7); return 'You pressed all night and it showed on every replay in slow motion. Fanbase -7, morale -7.';
          },
        },
        {
          label: 'Same routine as any 1pm in October', effect: 'Steady hands',
          apply: (cc) => { rate(cc, 1); mor(cc, 4); return `Same breakfast, same nap, same headphones. Rating +1 to ${cc.ovr}, morale +4.`; },
        },
        {
          label: 'Rent a suite for 60 people from your block', effect: 'Money for city love',
          apply: (cc) => { bank(cc, -0.12); fan(cc, 11); mor(cc, 7); return 'Sixty people from your old neighborhood in a suite on national television. Net worth down 0.12M, fanbase +11, morale +7.'; },
        },
      ],
    });
  }

  if (c.rings === 0 && yrs >= 4) {
    deck.push({
      id: 'lifeA_playoff_ultimatum',
      title: 'Playoffs or changes',
      body: 'The owner said it out loud at a fan event with a microphone in his hand. Everybody in the building heard the second half of that sentence and knew who it was about.',
      options: [
        {
          label: 'Take the whole thing on your back', effect: 'Rating and wear',
          apply: (cc) => { rate(cc, 2); hp(cc, -5); mor(cc, 3); return `You played 17 games like every one was an elimination game. Rating +2 to ${cc.ovr}, health -5, morale +3.`; },
        },
        {
          label: 'Tell the room to ignore the owner', effect: 'Leadership, room steadies',
          apply: (cc) => { mor(cc, 10); fan(cc, 3); setFlag(cc, 'roomRespect', flag(cc, 'roomRespect') + 1); return 'You stood on a chair and told 52 grown men that no billionaire has ever made a tackle. Morale +10, fanbase +3.'; },
        },
        {
          label: 'Say it right back to him in the media', effect: 'Bold and expensive',
          apply: (cc) => { fan(cc, 11); mor(cc, -5); bank(cc, -0.1); setFlag(cc, 'gmFriction', flag(cc, 'gmFriction') + 1); return 'You suggested on camera that the roster is built by people who have never been hit. Fanbase +11, morale -5, and a 100,000 dollar team fine.'; },
        },
      ],
    });
  }

  if (missedPlayoffs && c.morale < 72) {
    deck.push({
      id: 'lifeA_tank_room',
      title: 'The room has stopped caring',
      body: 'Guys are discussing draft position in the cold tub in November. Two starters have asked to be traded. Somebody put a mock draft on the whiteboard as a joke and nobody laughed.',
      options: [
        {
          label: 'Play like it is 14 and 0 anyway', effect: 'Rating up, lonely',
          apply: (cc) => { rate(cc, 2); mor(cc, -4); fan(cc, 7); return `You went full speed in a stadium that was 40 percent empty in December. Rating +2 to ${cc.ovr}, fanbase +7, morale -4.`; },
        },
        {
          label: 'Call a players only meeting', effect: 'Could fix it, could flop',
          apply: (cc, r) => {
            if (r() < 0.55) { mor(cc, 13); rate(cc, 1); return `Ninety minutes, no coaches, some things said that needed saying. You won three of the last four. Morale +13, rating +1 to ${cc.ovr}.`; }
            mor(cc, -7); return 'Nine guys spoke, four were on their phones, and it leaked to a reporter by dinner. Morale -7.';
          },
        },
        {
          label: 'Protect your body, it is a lost year', effect: 'Health, reputation cost',
          apply: (cc) => { hp(cc, 11); fan(cc, -9); mor(cc, 2); return 'You took the reps you had to take and nothing more. Health +11, morale +2, fanbase -9, and a label that took three years to shake.'; },
        },
      ],
    });
  }

  /* ================================ 7. EVERYDAY MONEY ================================ */

  if (yrs >= 1) {
    deck.push({
      id: 'lifeA_cleat_deal',
      title: 'The shoe meeting',
      body: 'Two brands, two very different rooms. The giant offers a small check and a huge logo. The challenger offers real money now and a signature model in three years if you hit.',
      options: [
        {
          label: 'Sign with the giant', effect: 'Fame, small money',
          apply: (cc) => { paid(cc, 0.9); fan(cc, 11); own(cc, 'Global shoe deal'); return 'Three stripes, one commercial with a rapper, 0.9M a year. Fanbase +11.'; },
        },
        {
          label: 'Sign with the challenger', effect: 'Money and upside',
          apply: (cc) => { paid(cc, 2.4); fan(cc, 3); setFlag(cc, 'shoeUpside', 1); own(cc, 'Challenger brand deal'); return 'They tripled the giant and promised your name on a shoe. 2.4M earned, fanbase +3.'; },
        },
        {
          label: 'Stay free and wear whatever feels best', effect: 'No bag, best feet',
          apply: (cc) => { hp(cc, 5); mor(cc, 6); return 'You spray painted over the logos every week and your feet have never felt better. Health +5, morale +6.'; },
        },
      ],
    });
  }

  if (c.fanbase >= 40) {
    deck.push({
      id: 'lifeA_card_show',
      title: 'The card show',
      body: 'Four hours in a folding chair in a convention center, 1,200 autographs, 90,000 dollars, and a man who genuinely wants you to sign a photograph of somebody else.',
      options: [
        {
          label: 'Do the full four hours', effect: 'Money, sore hand',
          apply: (cc) => { paid(cc, 0.09); fan(cc, 5); mor(cc, -2); hp(cc, -1); return 'Twelve hundred signatures and a wrist that did not work right until Tuesday. 0.09M earned, fanbase +5, morale -2.'; },
        },
        {
          label: 'Do two hours, then free photos with every kid', effect: 'Less money, more love',
          apply: (cc) => { paid(cc, 0.045); fan(cc, 12); mor(cc, 6); return 'You cut the paid session in half and stayed another hour taking free pictures with kids. 0.045M earned, fanbase +12, morale +6.'; },
        },
        {
          label: 'Skip it and rest', effect: 'Rest and recovery',
          apply: (cc) => { hp(cc, 5); mor(cc, 3); return 'You slept in, did two hours of pool work and saw nobody. Health +5, morale +3.'; },
        },
      ],
    });
  }

  if (c.fanbase >= 35) {
    deck.push({
      id: 'lifeA_car_dealership',
      title: 'The car commercial',
      body: 'A dealership out on the highway wants you in a 30 second spot saying a slogan that rhymes with your last name. It will run 400 times a week during the local news.',
      options: [
        {
          label: 'Do it, rhyme and all', effect: 'Money, mild mockery',
          apply: (cc) => { paid(cc, 0.35); fan(cc, 6); mor(cc, -2); setFlag(cc, 'localLegend', 1); return 'Every person in that city can still do the jingle. 0.35M earned, fanbase +6, morale -2.'; },
        },
        {
          label: 'Do it, but write your own line', effect: 'Less money, dignity',
          apply: (cc) => { paid(cc, 0.2); fan(cc, 9); mor(cc, 4); return 'You rewrote it in the parking lot and it became the best local ad in the state. 0.2M earned, fanbase +9, morale +4.'; },
        },
        {
          label: 'Pass, you can afford to', effect: 'Clean brand',
          apply: (cc, r) => {
            mor(cc, 4);
            if (r() < 0.4) { paid(cc, 0.7); fan(cc, 4); return 'You passed, and a national bank called six weeks later with 0.7M and a much better script. Morale +4, fanbase +4.'; }
            return 'You passed and nobody called. Morale +4, and a Sunday with no camera crew in your driveway.';
          },
        },
      ],
    });
  }

  if (worth >= 2 || c.earnings >= 6) {
    deck.push({
      id: 'lifeA_mom_house',
      title: 'The house for your mother',
      body: 'She still works Saturdays and still says she is fine. You have the money now. She has strong opinions about the neighborhood and none of them are about the kitchen.',
      options: [
        {
          label: 'Buy the house she picked, no arguments', effect: 'Money out, morale way up',
          apply: (cc) => { bank(cc, -1.2); mor(cc, 18); fan(cc, 6); own(cc, "Mom's house"); return 'You handed her keys in a driveway and she sat down on the step and did not speak for a full minute. Net worth down 1.2M, morale +18, fanbase +6.'; },
        },
        {
          label: 'Buy it and pay her to never work again', effect: 'Bigger money, bigger moment',
          apply: (cc) => { bank(cc, -1.9); mor(cc, 21); fan(cc, 8); own(cc, "Mom's house and pension"); return 'House, car, and a monthly transfer that means she gave her notice after 31 years. Net worth down 1.9M, morale +21, fanbase +8.'; },
        },
        {
          label: 'Set up a trust and let her choose later', effect: 'Smart money',
          apply: (cc) => { bank(cc, -0.25); mor(cc, 10); own(cc, 'Family trust'); return 'A lawyer, a trust, and a plan that grew 0.35M before she ever picked a house. Net worth down 0.25M after the growth, morale +10.'; },
        },
      ],
    });
  }

  if (yrs >= 2 && (worth >= 1 || c.earnings >= 4)) {
    deck.push({
      id: 'lifeA_teammate_loan',
      title: 'The loan',
      body: 'A backup you came up with needs 250,000 for something he will not fully explain. He has never asked you for anything in six years. His hands are shaking.',
      options: [
        {
          label: 'Give it to him and call it a gift', effect: 'Money gone, room love',
          apply: (cc) => { bank(cc, -0.25); mor(cc, 11); setFlag(cc, 'gaveGift', 1); return 'You wrote gift on the memo line so he could never feel it as a debt. Net worth down 0.25M, morale +11.'; },
        },
        {
          label: 'Lend it with an actual written agreement', effect: 'Business, some tension',
          apply: (cc, r) => {
            bank(cc, -0.25);
            if (r() < 0.6) { bank(cc, 0.25); mor(cc, 5); return 'He paid back every cent in 14 months and framed the signed page. Net worth even, morale +5.'; }
            mor(cc, -7); return 'He never paid it back and he stopped answering, which cost more than the money. Net worth down 0.25M, morale -7.';
          },
        },
        {
          label: 'Say no and help another way', effect: 'Money kept, awkward',
          apply: (cc) => { mor(cc, -2); return 'You said no, then got him a job with your trainer that paid him properly for three years. Morale -2, and one very quiet car ride.'; },
        },
      ],
    });
  }

  if (c.fanbase >= 45 && yrs >= 3) {
    deck.push({
      id: 'lifeA_hometown_camp',
      title: 'Your own camp back home',
      body: 'Four hundred kids, one high school field with a bad sprinkler, and a sponsor willing to write a serious check if the logo is big enough.',
      options: [
        {
          label: 'Free camp, you fund every dollar of it', effect: 'Costs money, city love',
          apply: (cc) => { bank(cc, -0.15); fan(cc, 15); mor(cc, 11); own(cc, 'Hometown youth camp'); return 'Free entry, free cleats, free lunch, and a new sprinkler system for the school. Net worth down 0.15M, fanbase +15, morale +11.'; },
        },
        {
          label: 'Take the sponsor and keep it free', effect: 'Money and love',
          apply: (cc) => { paid(cc, 0.45); fan(cc, 9); mor(cc, 5); own(cc, 'Sponsored youth camp'); return 'A logo on 400 t-shirts and not one kid paid a cent. 0.45M earned, fanbase +9, morale +5.'; },
        },
        {
          label: 'Charge admission and run it like a business', effect: 'Real money, cooler reception',
          apply: (cc) => { paid(cc, 0.95); fan(cc, -4); mor(cc, 2); own(cc, 'Youth camp business'); return 'Two hundred and fifty dollars a head, sold out in a day, and a lot of families from your block who did not come. 0.95M earned, fanbase -4, morale +2.'; },
        },
      ],
    });
  }

  return deck;
}
