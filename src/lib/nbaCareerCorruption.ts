/* ────────────────────────────────────────────────────────────────────────────
   nbaCareerCorruption.ts, the dirty side of NBA My Career (Round 57)

   Owner brief: "imagine everything that bitlife has and then make it ten times
   better and more out of pocket. add corruption and more things to spend money
   on. at least 200 new additions to each game."

   The basketball version of the crime layer: prop betting on your own rebound
   totals, faking a load management injury for a bettor, tanking on purpose,
   tampering calls in June, a sneaker deal built on counterfeit stock, and the
   league office slowly working its way toward you.

   MECHANICS (all optional NbaCareerState fields, so pre-R57 saves load fine):
     heat             0-100 hidden meter. Dirty choices raise it, clean seasons
                      cool it 9/yr. At 65 the league opens an investigation, at
                      90 comes the indefinite suspension.
     dirtyMoney       millions of income nobody can explain.
     suspendedSeasons >0 means the next season is served banned.

   CONTRACT: an option's `apply` MUTATES the state and RETURNS A STRING (the
   log line). It does not return the state.

   CIRCULAR IMPORT RULE (this bit already broke the site once, in Round 56):
   nbaMyCareer.ts imports this file for its event deck, so NEVER evaluate an
   imported VALUE at module scope here. Imported values are only safe inside
   functions, once both modules have finished initialising.
   ──────────────────────────────────────────────────────────────────────────── */
import type { NbaCareerState, NbaCareerEvent } from './nbaMyCareer';
import { nbaTeamLabelOf } from './nbaMyCareer';

type DirtyState = NbaCareerState & {
  heat?: number;
  dirtyMoney?: number;
  suspendedSeasons?: number;
  netWorth?: number;
  lifeFlags?: Record<string, number>;
  yearlyCosts?: number;
};
const D = (c: NbaCareerState): DirtyState => c as DirtyState;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const flag = (c: NbaCareerState, k: string): number => (D(c).lifeFlags || {})[k] || 0;
const setFlag = (c: NbaCareerState, k: string, v: number) => {
  D(c).lifeFlags = { ...(D(c).lifeFlags || {}), [k]: v };
};
const heatUp = (c: NbaCareerState, n: number) => {
  D(c).heat = clamp((D(c).heat ?? 0) + n, 0, 100);
};
const dirty = (c: NbaCareerState, n: number) => {
  D(c).dirtyMoney = Math.round(((D(c).dirtyMoney ?? 0) + n) * 10) / 10;
};
const bank = (c: NbaCareerState, n: number) => {
  D(c).netWorth = Math.round(((D(c).netWorth ?? 0) + n) * 10) / 10;
};

/** Heat band for the UI panel. */
export function nbaHeatLabel(h: number): { label: string; tone: string; blurb: string } {
  if (h >= 90) return { label: 'BANNED FOR LIFE PENDING APPEAL', tone: 'text-red-400', blurb: 'The commissioner read a statement with your name in it. Your lawyers are talking about years.' };
  if (h >= 65) return { label: 'UNDER INVESTIGATION', tone: 'text-red-400', blurb: 'League investigators have your betting records. They keep showing up at shootaround.' };
  if (h >= 40) return { label: 'FLAGGED', tone: 'text-orange-400', blurb: 'An integrity monitor flagged unusual line movement on your props. Twice.' };
  if (h >= 15) return { label: 'WHISPERS', tone: 'text-amber-400', blurb: 'Nothing solid. Just a beat writer asking oddly specific questions about your rebound totals.' };
  return { label: 'CLEAN', tone: 'text-emerald-400', blurb: 'Nobody is looking at you. Keep it that way, or do not.' };
}

export function getNbaCorruptionEvents(c: NbaCareerState, rng: () => number): NbaCareerEvent[] {
  const deck: NbaCareerEvent[] = [];
  const d = D(c);
  const h = d.heat ?? 0;
  const dm = d.dirtyMoney ?? 0;
  const pro = c.seasons.length;

  /* ══ ARC 1: the prop bet ══ */
  if (flag(c, 'props') === 0 && pro >= 2) {
    deck.push({
      id: 'ncorr_props',
      title: 'The under on your rebounds',
      body: 'A man who knows your cousin explains that nobody watches rebound props. Grab two fewer boards in a blowout and a number with a comma in a new place lands in an account that is not yours.',
      options: [
        { label: 'Take the under, 800k', effect: '800k dirty, heat +20',
          apply: (cc) => { setFlag(cc, 'props', 1); dirty(cc, 0.8); heatUp(cc, 20); return 'You boxed out a little slower for a quarter. Eight hundred thousand dollars. Heat +20.'; } },
        { label: 'Say no and block the number', effect: 'Nothing happens. Yet',
          apply: (cc) => { setFlag(cc, 'props', -1); return 'You blocked the number. He found a second one within a month.'; } },
        { label: 'Report it to league security', effect: 'Fanbase +6, one enemy',
          apply: (cc) => { setFlag(cc, 'props', -2); cc.fanbase = clamp(cc.fanbase + 6, 0, 100); cc.morale = clamp(cc.morale + 5, 0, 100); return 'You reported it the same day. The league used you in a training video. Your cousin stopped calling.'; } },
      ],
    });
  }

  if (flag(c, 'props') === 1) {
    deck.push({
      id: 'ncorr_fake_injury',
      title: 'Load management, allegedly',
      body: 'The ask has grown. Sit out a Tuesday in Charlotte with a sore hamstring you do not have. The whole book moves when you are scratched an hour before tip.',
      options: [
        { label: 'Fake the injury, 2.5M', effect: '2.5M dirty, heat +30',
          apply: (cc) => { setFlag(cc, 'props', 2); dirty(cc, 2.5); heatUp(cc, 30); cc.morale = clamp(cc.morale - 12, 0, 100); return 'You were scratched 58 minutes before tip. The line moved four points. Heat +30.'; } },
        { label: 'Refuse and cut him off', effect: 'He leaks the first one',
          apply: (cc) => { setFlag(cc, 'props', 3); heatUp(cc, 12); cc.fanbase = clamp(cc.fanbase - 12, 0, 100); return 'You refused. The first payment showed up in a story that Friday. Fanbase -12, but the asks stopped.'; } },
        { label: 'Walk into the league office with everything', effect: '25 game ban, heat wiped',
          apply: (cc) => { setFlag(cc, 'props', 4); D(cc).heat = 0; D(cc).dirtyMoney = 0; cc.fanbase = clamp(cc.fanbase - 8, 0, 100); cc.morale = clamp(cc.morale + 12, 0, 100); return 'You self reported. Twenty five games and every dollar returned, and the first real sleep in a year.'; } },
      ],
    });
  }

  /* ══ ARC 2: tanking ══ */
  if (flag(c, 'tank') === 0 && pro >= 3) {
    deck.push({
      id: 'ncorr_tank',
      title: 'The front office plan',
      body: 'March, the season is over, and an executive mentions how good the lottery odds get if you lose out. He is not telling you to lose. He is telling you what losing is worth to him.',
      options: [
        { label: 'Coast through the last 15 games', effect: 'Heat +12, better roster next year',
          apply: (cc) => { setFlag(cc, 'tank', 1); heatUp(cc, 12); cc.morale = clamp(cc.morale - 8, 0, 100); return 'You coasted through fifteen meaningless games. The pick became a player who made your life easier. Heat +12.'; } },
        { label: 'Play every night like it is a playoff game', effect: 'Morale +10, fanbase +8',
          apply: (cc) => { setFlag(cc, 'tank', -1); cc.morale = clamp(cc.morale + 10, 0, 100); cc.fanbase = clamp(cc.fanbase + 8, 0, 100); return 'You went full speed in a dead March and that tape is exactly why your next contract exists.'; } },
      ],
    });
  }

  /* ══ ARC 3: the counterfeit sneaker line ══ */
  if (c.fanbase >= 55 && flag(c, 'sneaks') === 0) {
    deck.push({
      id: 'ncorr_sneaks',
      title: 'Your shoe, sort of',
      body: 'A manufacturer is producing your signature shoe in a factory your brand does not know exists, selling the extras out the back door. They offer you a cut to never ask about inventory.',
      options: [
        { label: 'Take the cut, 1.6M a year', effect: '1.6M dirty, heat +16',
          apply: (cc) => { setFlag(cc, 'sneaks', 1); dirty(cc, 1.6); heatUp(cc, 16); return 'You stopped asking about inventory. Roughly a fifth of your shoes in the world are not really yours. Heat +16.'; } },
        { label: 'Tell your brand immediately', effect: 'Fanbase +6, contract bonus',
          apply: (cc) => { setFlag(cc, 'sneaks', -1); cc.earnings += 2; cc.fanbase = clamp(cc.fanbase + 6, 0, 100); return 'You told the brand and they shut the factory down. They added two million to your deal for the loyalty.'; } },
      ],
    });
  }

  /* ══ ARC 4: tampering ══ */
  if (c.ovr >= 84 && c.contractYears <= 2 && flag(c, 'tamper') === 0) {
    deck.push({
      id: 'ncorr_tamper',
      title: 'A call in June',
      body: 'A rival star calls you two weeks before free agency legally opens, with his general manager on speaker. Everything about this call is against the rules and everybody does it.',
      options: [
        { label: 'Agree in principle right there', effect: 'Heat +14, a superteam',
          apply: (cc, r) => {
            setFlag(cc, 'tamper', 1); heatUp(cc, 14);
            cc.salary = Math.round(cc.salary * 0.85 * 10) / 10; cc.contractYears = 4;
            cc.fanbase = clamp(cc.fanbase - 10, 0, 100);
            const t = nbaTeamLabelOf(cc.team);
            return `You agreed on a June phone call that never officially happened. You left money on the table and ${t} found out from a report. Heat +14.`;
          } },
        { label: 'Hang up and wait for the legal window', effect: 'Clean, slower',
          apply: (cc) => { setFlag(cc, 'tamper', -1); cc.morale = clamp(cc.morale + 5, 0, 100); return 'You hung up and waited for the actual start of free agency like a lunatic. It cost you nothing in the end.'; } },
      ],
    });
  }

  /* ══ ARC 5: the money has nowhere to live ══ */
  if (dm >= 2 && flag(c, 'wash') === 0) {
    deck.push({
      id: 'ncorr_wash',
      title: 'The money has nowhere to live',
      body: `You are sitting on ${dm.toFixed(1)}M that cannot be explained to anyone with a badge. Your accountant has started every sentence with "hypothetically" for three months.`,
      options: [
        { label: 'Buy cash businesses to run it through', effect: 'Launder it, heat +10 now',
          apply: (cc) => { setFlag(cc, 'wash', 1); heatUp(cc, 10); return 'You bought into laundromats and a barbershop chain. The numbers are remarkable for the foot traffic.'; } },
        { label: 'Declare it and eat the tax', effect: 'Lose 55 percent, heat -35',
          apply: (cc) => {
            const keep = Math.round((D(cc).dirtyMoney ?? 0) * 0.45 * 10) / 10;
            bank(cc, keep); D(cc).dirtyMoney = 0; heatUp(cc, -35); setFlag(cc, 'wash', 2);
            return `You declared everything. The IRS took more than half and handed back something better. Kept ${keep}M clean.`;
          } },
      ],
    });
  }

  /* ══ Standalone temptations ══ */
  if (c.draftPick <= 20 && pro === 0) {
    deck.push({
      id: 'ncorr_agent_advance',
      title: 'Money before the draft',
      body: 'An agent gave your family 90,000 dollars during your one college season. He would like you to remember that, and to sign with him, and to never mention it.',
      options: [
        { label: 'Sign with him and stay quiet', effect: 'Heat +12, strong agent',
          apply: (cc) => { heatUp(cc, 12); cc.salary = Math.round(cc.salary * 1.08 * 10) / 10; setFlag(cc, 'advance', 1); return 'You signed with him. Your rookie deal came in eight percent above slot and neither of you ever said why. Heat +12.'; } },
        { label: 'Pay it back and go elsewhere', effect: 'Clean, costs 90k',
          apply: (cc) => { bank(cc, -0.09); setFlag(cc, 'advance', -1); return 'You paid back every dollar in a cashiers check and signed with somebody boring. Best 90,000 you ever spent.'; } },
      ],
    });
  }

  if (c.ovr >= 80 && rng() < 0.5) {
    deck.push({
      id: 'ncorr_memorabilia',
      title: 'Signed by somebody',
      body: 'A dealer wants 5,000 autographs in a weekend. Halfway through your hand quits and his assistant offers to finish the stack. Nobody would ever know.',
      options: [
        { label: 'Let the assistant sign', effect: '1.1M dirty, heat +10',
          apply: (cc) => { dirty(cc, 1.1); heatUp(cc, 10); return 'About 2,000 of your autographs in the world were signed by a man named Devon. Heat +10.'; } },
        { label: 'Sign all 5,000 yourself', effect: '900k clean, health -3',
          apply: (cc) => { cc.earnings += 0.9; cc.health = clamp(cc.health - 3, 0, 100); return 'You signed every one. Your shooting hand was numb for a week and every signature is real.'; } },
      ],
    });
  }

  if (c.fanbase >= 60) {
    deck.push({
      id: 'ncorr_sportsbook',
      title: 'The sportsbook wants your face',
      body: 'A betting app offers a fortune to be their guy. Buried in the contract is a clause about promoting parlays on games you play in, which is not a thing you are allowed to do.',
      options: [
        { label: 'Sign it, 7M', effect: '7M dirty, heat +20',
          apply: (cc) => { dirty(cc, 7); heatUp(cc, 20); cc.fanbase = clamp(cc.fanbase + 4, 0, 100); return 'You signed. Seven million and your face on a parlay slip in every bar in the state. Heat +20.'; } },
        { label: 'Sign the cleaned up version, 2.5M', effect: '2.5M clean',
          apply: (cc) => { cc.earnings += 2.5; return 'Your lawyer stripped the illegal clauses and the number fell to 2.5M. Still 2.5M.'; } },
        { label: 'Turn it down entirely', effect: 'Fanbase +8',
          apply: (cc) => { cc.fanbase = clamp(cc.fanbase + 8, 0, 100); cc.morale = clamp(cc.morale + 5, 0, 100); return 'You turned down sportsbook money out loud, and people who never liked you started to.'; } },
      ],
    });
  }

  if ((D(c).netWorth ?? 0) >= 4) {
    deck.push({
      id: 'ncorr_ponzi',
      title: 'The advisor everybody uses',
      body: 'A financial advisor who somehow represents eleven guys around the league promises 30 percent returns, guaranteed, in writing. Guaranteed is not a word that exists in investing.',
      options: [
        { label: 'Put in 4M', effect: 'Probably gone',
          apply: (cc, r) => {
            if (r() < 0.2) { bank(cc, 5); return 'It actually paid out and you got out before it collapsed on everyone else. That is luck, not skill.'; }
            bank(cc, -4); cc.morale = clamp(cc.morale - 10, 0, 100);
            return 'It was a Ponzi. Four million gone, along with the savings of eleven guys who trusted him because you did.';
          } },
        { label: 'Ask for audited statements', effect: 'He vanishes',
          apply: (cc) => { cc.morale = clamp(cc.morale + 5, 0, 100); return 'You asked for audited statements and he stopped returning calls inside a week. That was the answer.'; } },
        { label: 'Warn the whole league group chat', effect: 'Save everyone',
          apply: (cc) => { cc.morale = clamp(cc.morale + 10, 0, 100); cc.fanbase = clamp(cc.fanbase + 4, 0, 100); return 'You put it in the group chat and everyone pulled their money. He was indicted two years later.'; } },
      ],
    });
  }

  if (h >= 30 && h < 90) {
    deck.push({
      id: 'ncorr_reporter',
      title: 'The reporter is very good',
      body: 'She has line movement data on three of your games, a photo of you leaving a building, and a timeline. She would like a comment and she is being polite about it.',
      options: [
        { label: 'Trade her a different exclusive', effect: 'Heat -12',
          apply: (cc) => { heatUp(cc, -12); cc.fanbase = clamp(cc.fanbase + 3, 0, 100); return 'You gave her a soft exclusive and she shelved the hard one. Journalism. Heat -12.'; } },
        { label: 'Threaten to sue', effect: 'Heat +18, she prints the letter',
          apply: (cc) => { heatUp(cc, 18); cc.fanbase = clamp(cc.fanbase - 10, 0, 100); return 'Your lawyers sent a threat. She printed it above the story and it went enormous. Heat +18.'; } },
        { label: 'Tell her the truth, all of it', effect: 'Heat halved, fanbase hit',
          apply: (cc) => { D(cc).heat = Math.round((D(cc).heat ?? 0) / 2); cc.fanbase = clamp(cc.fanbase - 14, 0, 100); cc.morale = clamp(cc.morale + 10, 0, 100); return 'You sat down and told a reporter everything on the record. Worst week of your life and the best decision in it.'; } },
      ],
    });
  }

  if (h >= 50 && flag(c, 'amnesty') === 0) {
    deck.push({
      id: 'ncorr_amnesty',
      title: 'The window',
      body: 'The league offers a one time deal: come forward, take a fixed suspension, keep your career. Your lawyer calls it the best offer you will ever get. Your agent calls it a trap. Both are right.',
      options: [
        { label: 'Take it', effect: '15 games, heat nearly wiped',
          apply: (cc) => { setFlag(cc, 'amnesty', 1); D(cc).heat = 6; D(cc).dirtyMoney = 0; cc.fanbase = clamp(cc.fanbase - 6, 0, 100); cc.morale = clamp(cc.morale + 12, 0, 100); return 'You took the deal. Fifteen games, a closed file, and a phone that stopped buzzing at 3am.'; } },
        { label: 'Ignore it, they have nothing', effect: 'Heat +12',
          apply: (cc) => { setFlag(cc, 'amnesty', 2); heatUp(cc, 12); return 'You skipped the window. The head of league security pinned your photo to an actual board.'; } },
      ],
    });
  }

  if ((D(c).heat ?? 0) >= 20 && pro >= 3) {
    deck.push({
      id: 'ncorr_teammate_knows',
      title: 'He wants in',
      body: 'A teammate has worked out exactly what you are doing. He is not threatening you. He is asking to be included, which is somehow worse.',
      options: [
        { label: 'Bring him in', effect: 'Double money, double exposure',
          apply: (cc) => { dirty(cc, 2); heatUp(cc, 20); return 'Two of you now. The money doubled and so did the number of people who can end this. Heat +20.'; } },
        { label: 'Talk him out of it', effect: 'Heat -6',
          apply: (cc) => { heatUp(cc, -6); cc.morale = clamp(cc.morale + 6, 0, 100); return 'You told him exactly how it ends. Years later he thanked you in a text at 2am.'; } },
        { label: 'Use it as your own exit', effect: 'Stop everything, heat -25',
          apply: (cc) => { heatUp(cc, -25); setFlag(cc, 'props', 7); cc.morale = clamp(cc.morale + 10, 0, 100); return 'Hearing somebody else say it out loud made it real. You stopped everything that week. Heat -25.'; } },
      ],
    });
  }

  if (c.age >= 30 && (D(c).netWorth ?? 0) < 4 && c.earnings >= 40) {
    deck.push({
      id: 'ncorr_broke',
      title: 'Where did it go',
      body: `You have earned ${Math.round(c.earnings)}M in this league and your accountant says you are nearly broke. Houses, relatives, an advisor, four businesses that never opened. It is the most common story in the sport.`,
      options: [
        { label: 'Sell everything and start over', effect: 'Recover cash, lose the lifestyle',
          apply: (cc) => { bank(cc, 5); D(cc).yearlyCosts = 0; cc.morale = clamp(cc.morale - 6, 0, 100); return 'You sold the cars, the second house and the restaurant group. Five million back and a much quieter life.'; } },
        { label: 'Take the money being offered', effect: '6M dirty, heat +26',
          apply: (cc) => { dirty(cc, 6); heatUp(cc, 26); return 'You called the number you swore you never would. Six million, and the meter went straight up. Heat +26.'; } },
        { label: 'Get real advisors and grind it back', effect: 'Boring, works',
          apply: (cc) => { D(cc).yearlyCosts = Math.round((D(cc).yearlyCosts ?? 0) * 0.5 * 100) / 100; cc.morale = clamp(cc.morale + 8, 0, 100); return 'Boring budget, real advisors, no more favours. Nobody tells this story and it works every time.'; } },
      ],
    });
  }

  if (pro >= 8 && (D(c).heat ?? 0) <= 10 && flag(c, 'clean') === 0) {
    deck.push({
      id: 'ncorr_clean_hands',
      title: 'They want you talking to rookies',
      body: 'The league wants you on its integrity program, the one that warns rookies about exactly the phone calls you used to get.',
      options: [
        { label: 'Do it and tell them everything', effect: 'Fanbase +12, morale +10',
          apply: (cc) => { setFlag(cc, 'clean', 1); cc.fanbase = clamp(cc.fanbase + 12, 0, 100); cc.morale = clamp(cc.morale + 10, 0, 100); return 'You stood in front of 60 rookies and told them what almost happened to you. A few of them will remember it.'; } },
        { label: 'Decline, it feels like a lecture', effect: 'Morale +4',
          apply: (cc) => { setFlag(cc, 'clean', 2); cc.morale = clamp(cc.morale + 4, 0, 100); return 'You passed. Being clean did not have to become a personality.'; } },
      ],
    });
  }

  if ((d.suspendedSeasons ?? 0) === 0 && c.seasons.some(s => s.teamResult === 'SUSPENDED') && flag(c, 'afterBan') === 0) {
    deck.push({
      id: 'ncorr_reinstated',
      title: 'Reinstated',
      body: 'You are allowed to play basketball again. One team called, they are rebuilding, and the offer is close to the minimum. The coach says the locker room voted on it.',
      options: [
        { label: 'Take it and rebuild everything', effect: 'Morale +18, minimum deal',
          apply: (cc) => { setFlag(cc, 'afterBan', 1); cc.morale = clamp(cc.morale + 18, 0, 100); cc.health = clamp(cc.health + 6, 0, 100); cc.salary = 1.2; cc.contractYears = 1; return `You signed for the minimum with ${nbaTeamLabelOf(cc.team)} and outworked every rookie in camp.`; } },
        { label: 'Call the guy back', effect: '5M dirty, heat +30',
          apply: (cc) => { setFlag(cc, 'afterBan', 2); dirty(cc, 5); heatUp(cc, 30); return 'You called him back inside a week. He said he knew you would. Heat +30.'; } },
      ],
    });
  }

  /* ══ More standalone temptations ══ */
  if (c.fanbase >= 50 && flag(c, 'shoeKick') === 0) {
    deck.push({
      id: 'ncorr_shoe_kickback',
      title: 'The grassroots money',
      body: 'A shoe company wants you to steer three high school kids toward a program they fund. All you have to do is make a few phone calls and take a consulting fee.',
      options: [
        { label: 'Make the calls, 1.4M', effect: '1.4M dirty, heat +15',
          apply: (cc) => { setFlag(cc, 'shoeKick', 1); dirty(cc, 1.4); heatUp(cc, 15); return 'You made three phone calls and got paid like a consultant. Heat +15.'; } },
        { label: 'Advise the kids honestly instead', effect: 'Fanbase +6, no money',
          apply: (cc) => { setFlag(cc, 'shoeKick', -1); cc.fanbase = clamp(cc.fanbase + 6, 0, 100); return 'You told all three kids the truth about who was paying whom. Two of them still text you.'; } },
      ],
    });
  }

  /* Round 123: the same widening the football version got, for the opposite
     reason. NBA MVP was gated on an overall of 92 that the engine could not
     reach, so c.mvps was zero in all 300 careers measured and this event had
     never fired ONCE. It fires now, and adding All-NBA to the gate means a
     player the voters actually know can get it without having won already. */
  if ((c.mvps >= 1 || c.allNbas >= 1) && rng() < 0.4) {
    deck.push({
      id: 'ncorr_award_lobby',
      title: 'The voters are people',
      body: 'A PR firm offers to run an awards campaign: dinners, access and gifts for the hundred people who vote. All of it is legal and all of it is grim.',
      options: [
        { label: 'Run the campaign, 2M', effect: 'Better odds, heat +8',
          apply: (cc) => { bank(cc, -2); heatUp(cc, 8); cc.fanbase = clamp(cc.fanbase + 5, 0, 100); return 'You ran the campaign. A hundred voters had a lovely season and your name stayed in every conversation.'; } },
        { label: 'Let the tape argue', effect: 'Morale +8',
          apply: (cc) => { cc.morale = clamp(cc.morale + 8, 0, 100); return 'No campaign. You told them to watch the tape and went back to work.'; } },
      ],
    });
  }

  if (c.age >= 27 && c.health < 75 && flag(c, 'scripts') === 0) {
    deck.push({
      id: 'ncorr_scripts',
      title: 'The back to back routine',
      body: 'A team doctor has been writing you whatever gets you on the floor for the second night of a back to back, in amounts that are not on any chart.',
      options: [
        { label: 'Keep the routine', effect: 'Play every night, health falls',
          apply: (cc) => { setFlag(cc, 'scripts', 1); cc.health = clamp(cc.health - 12, 0, 100); cc.ovr = Math.min(99, cc.ovr + 1); heatUp(cc, 8); return 'You played 82 games on a body built for 60. Rating +1, health -12.'; } },
        { label: 'Get a real second opinion', effect: 'Miss games, protect the rest of your life',
          apply: (cc) => { setFlag(cc, 'scripts', -1); cc.health = clamp(cc.health + 10, 0, 100); cc.morale = clamp(cc.morale + 8, 0, 100); return 'You got a real doctor, tapered off and missed twelve games. Health +10 and a retirement you will be able to enjoy.'; } },
      ],
    });
  }

  if (c.rings >= 1 && rng() < 0.35) {
    deck.push({
      id: 'ncorr_ring_fakes',
      title: 'Your ring, on sale',
      body: 'Counterfeit championship rings with your name inside are selling online. The manufacturer offers you a cut to authenticate them.',
      options: [
        { label: 'Take the cut, 800k', effect: '800k dirty, heat +12',
          apply: (cc) => { dirty(cc, 0.8); heatUp(cc, 12); return 'You authenticated fakes of your own ring. Eight hundred thousand and a small permanent wince. Heat +12.'; } },
        { label: 'Sue them into the ground', effect: 'Fanbase +6, costs 200k',
          apply: (cc) => { bank(cc, -0.2); cc.fanbase = clamp(cc.fanbase + 6, 0, 100); return 'You sued and won. The fakes vanished and the real one got a little more real.'; } },
      ],
    });
  }

  if ((D(c).dirtyMoney ?? 0) >= 1 && c.age >= 26) {
    deck.push({
      id: 'ncorr_irs',
      title: 'A letter with a seal on it',
      body: 'The IRS wants to discuss three years of returns. Your accountant says "worst case" out loud for the first time.',
      options: [
        { label: 'Fight it, 2M in lawyers', effect: 'Coin flip',
          apply: (cc, r) => {
            bank(cc, -2);
            if (r() < 0.5) { heatUp(cc, -20); return 'Your lawyers found an error on their side and the whole thing evaporated. Heat -20.'; }
            heatUp(cc, 18); cc.fanbase = clamp(cc.fanbase - 10, 0, 100);
            return 'You lost. Back taxes, penalties, and your name in a headline next to the word evasion.';
          } },
        { label: 'Settle and pay everything', effect: 'Expensive, clean',
          apply: (cc) => {
            const owed = Math.round(((D(cc).dirtyMoney ?? 0) * 0.6 + 1) * 10) / 10;
            bank(cc, -owed); D(cc).dirtyMoney = 0; heatUp(cc, -28);
            return `You settled for ${owed}M and stopped pretending. Heat -28.`;
          } },
      ],
    });
  }

  if (c.contractYears <= 1 && c.ovr >= 80) {
    deck.push({
      id: 'ncorr_side_letter',
      title: 'The side letter',
      body: 'The team wants you cheap on paper for cap reasons, so the owner offers a private arrangement: a no show marketing job for a relative worth 2M a year.',
      options: [
        { label: 'Take the side deal', effect: '2M a year dirty, heat +16',
          apply: (cc) => { dirty(cc, 2); heatUp(cc, 16); cc.contractYears = 3; return 'Your uncle is now a paid marketing consultant who has never marketed anything. Heat +16.'; } },
        { label: 'Everything on the real contract', effect: 'Slightly more, zero risk',
          apply: (cc) => { cc.salary = Math.round(cc.salary * 1.05 * 10) / 10; cc.contractYears = 3; return 'You made them put every dollar on the actual contract. Nobody in a room decides your future now.'; } },
      ],
    });
  }

  if (pro >= 5 && flag(c, 'ticketScalp') === 0) {
    deck.push({
      id: 'ncorr_tickets',
      title: 'Your player tickets',
      body: 'Every player gets comps. A broker offers to buy yours in bulk for playoff games, in cash, forever, which is very much against your contract.',
      options: [
        { label: 'Sell them all, 600k a year', effect: '600k dirty, heat +9',
          apply: (cc) => { setFlag(cc, 'ticketScalp', 1); dirty(cc, 0.6); heatUp(cc, 9); return 'Your comps have been in a broker inventory for two seasons. Heat +9.'; } },
        { label: 'Give them to the neighborhood instead', effect: 'Fanbase +8',
          apply: (cc) => { setFlag(cc, 'ticketScalp', -1); cc.fanbase = clamp(cc.fanbase + 8, 0, 100); cc.morale = clamp(cc.morale + 5, 0, 100); return 'Every home game there are twelve kids from your block sitting behind the bench.'; } },
      ],
    });
  }

  if ((D(c).heat ?? 0) >= 45 && c.contractYears <= 1) {
    deck.push({
      id: 'ncorr_team_knows',
      title: 'The general manager knows',
      body: 'He never says the word. He says he has "concerns about off court exposure" and slides across a contract worth half your market value.',
      options: [
        { label: 'Sign it and stay quiet', effect: 'Half money, heat -10',
          apply: (cc) => { cc.salary = Math.round(cc.salary * 0.5 * 10) / 10; cc.contractYears = 3; heatUp(cc, -10); return 'You signed for half and neither of you ever said what it was about. Heat -10.'; } },
        { label: 'Walk and bet on yourself', effect: 'Cheap deal, keep your name',
          apply: (cc) => { cc.contractYears = 2; cc.fanbase = clamp(cc.fanbase - 5, 0, 100); return `You walked. Only one team called and ${nbaTeamLabelOf(cc.team)} got you cheap, but you kept your name.`; } },
      ],
    });
  }

  if (c.fanbase >= 70 && rng() < 0.4) {
    deck.push({
      id: 'ncorr_pump_dump',
      title: 'The token',
      body: 'A crypto outfit will pay 3M for one post. Their own deck has a slide titled exit liquidity, and it appears to mean your followers.',
      options: [
        { label: 'Post it, 3M', effect: '3M dirty, fanbase -12',
          apply: (cc) => { dirty(cc, 3); heatUp(cc, 16); cc.fanbase = clamp(cc.fanbase - 12, 0, 100); return 'You posted the token. It went to zero in nine days and the replies are a crime scene.'; } },
        { label: 'Post their slide deck instead', effect: 'Fanbase +8',
          apply: (cc) => { cc.fanbase = clamp(cc.fanbase + 8, 0, 100); cc.morale = clamp(cc.morale + 5, 0, 100); return 'You posted their own exit liquidity slide. The internet ate them alive and thanked you.'; } },
      ],
    });
  }

  if (pro >= 2 && pro <= 6 && flag(c, 'summerLeagueFix') === 0 && rng() < 0.3) {
    deck.push({
      id: 'ncorr_exhibition',
      title: 'The exhibition tour',
      body: 'An overseas promoter pays enormous appearance fees for a summer tour. The games have betting lines, the promoter has opinions about the scores, and everyone smiles a lot.',
      options: [
        { label: 'Play the tour their way, 2.2M', effect: '2.2M dirty, heat +18',
          apply: (cc) => { setFlag(cc, 'summerLeagueFix', 1); dirty(cc, 2.2); heatUp(cc, 18); return 'You played four exhibition games to a script. Nobody at home saw a minute of it. Heat +18.'; } },
        { label: 'Play the tour straight, 900k', effect: '900k clean',
          apply: (cc) => { setFlag(cc, 'summerLeagueFix', -1); cc.earnings += 0.9; return 'You played it straight, took the smaller fee and went home. The promoter never called again.'; } },
      ],
    });
  }

  if (c.age >= 33 && (D(c).heat ?? 0) <= 15) {
    deck.push({
      id: 'ncorr_tell_all',
      title: 'The tell all offer',
      body: 'A publisher offers a fortune for a book naming names: who bet, who fixed, who got away with it. You know most of it. Some of the names are friends.',
      options: [
        { label: 'Write it and name everyone', effect: '4M, fanbase +10, no friends',
          apply: (cc) => { bank(cc, 4); cc.fanbase = clamp(cc.fanbase + 10, 0, 100); cc.morale = clamp(cc.morale - 12, 0, 100); return 'The book named eleven people. It sold enormously and your group chat has been silent since.'; } },
        { label: 'Write it without the names', effect: '1.5M, keep everyone',
          apply: (cc) => { bank(cc, 1.5); cc.morale = clamp(cc.morale + 6, 0, 100); return 'You told the stories and protected the names. Smaller advance, same friends.'; } },
        { label: 'Do not write it at all', effect: 'Morale +8',
          apply: (cc) => { cc.morale = clamp(cc.morale + 8, 0, 100); return 'You turned it down. Some things do not need to be a chapter.'; } },
      ],
    });
  }

  return deck;
}
