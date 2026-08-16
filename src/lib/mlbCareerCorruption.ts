/* ────────────────────────────────────────────────────────────────────────────
   mlbCareerCorruption.ts, the dirty side of MLB My Career (Round 58)

   Owner brief: take everything a full life sim does, make it ten times
   better and more out of pocket, add corruption and more things to spend
   money on, at least 200 new additions to each game.

   Baseball has the richest crime history in American sport, so this layer leans
   into it: sign stealing schemes, a substance on the glove, the clinic that
   ships in unmarked boxes, tipping pitches for a bettor, a signing bonus
   skimmed off a 16 year old, and a commissioner's office that never forgets.

   MECHANICS (all optional MlbCareerState fields, so pre-R58 saves load fine):
     heat             0-100 hidden meter. Dirty choices raise it, clean seasons
                      cool it 9/yr. At 65 the league opens a formal probe, at 90
                      comes the suspension that costs a full season.
     dirtyMoney       millions of income nobody can explain.
     suspendedSeasons >0 means the next season is served banned.

   CONTRACT: an option's `apply` MUTATES the state and RETURNS A STRING.

   CIRCULAR IMPORT RULE (this broke the site once, in Round 56): mlbMyCareer.ts
   imports this file, so NEVER evaluate an imported VALUE at module scope here.
   Imported values are only safe inside functions.
   ──────────────────────────────────────────────────────────────────────────── */
import type { MlbCareerState, MlbCareerEvent } from './mlbMyCareer';
import { mlbTeamLabelOf } from './mlbMyCareer';

type DirtyState = MlbCareerState & {
  heat?: number;
  dirtyMoney?: number;
  suspendedSeasons?: number;
  netWorth?: number;
  lifeFlags?: Record<string, number>;
  yearlyCosts?: number;
};
const D = (c: MlbCareerState): DirtyState => c as DirtyState;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const flag = (c: MlbCareerState, k: string): number => (D(c).lifeFlags || {})[k] || 0;
const setFlag = (c: MlbCareerState, k: string, v: number) => {
  D(c).lifeFlags = { ...(D(c).lifeFlags || {}), [k]: v };
};
const heatUp = (c: MlbCareerState, n: number) => { D(c).heat = clamp((D(c).heat ?? 0) + n, 0, 100); };
const dirty = (c: MlbCareerState, n: number) => { D(c).dirtyMoney = Math.round(((D(c).dirtyMoney ?? 0) + n) * 10) / 10; };
const bank = (c: MlbCareerState, n: number) => { D(c).netWorth = Math.round(((D(c).netWorth ?? 0) + n) * 10) / 10; };

/** Heat band for the UI panel. */
export function mlbHeatLabel(h: number): { label: string; tone: string; blurb: string } {
  if (h >= 90) return { label: 'PERMANENTLY INELIGIBLE', tone: 'text-red-400', blurb: 'The commissioner used the word permanent. Everyone knows exactly what that means in this sport.' };
  if (h >= 65) return { label: 'UNDER INVESTIGATION', tone: 'text-red-400', blurb: 'Two investigators from the league office have been in the clubhouse three days running.' };
  if (h >= 40) return { label: 'FLAGGED', tone: 'text-orange-400', blurb: 'Compliance has questions about an offshore account and a very specific series in July.' };
  if (h >= 15) return { label: 'WHISPERS', tone: 'text-amber-400', blurb: 'Nothing solid. Just a beat writer who keeps asking why you touch your belt so much.' };
  return { label: 'CLEAN', tone: 'text-emerald-400', blurb: 'Nobody is looking at you. Keep it that way, or do not.' };
}

export function getMlbCorruptionEvents(c: MlbCareerState, rng: () => number): MlbCareerEvent[] {
  const deck: MlbCareerEvent[] = [];
  const d = D(c);
  const h = d.heat ?? 0;
  const dm = d.dirtyMoney ?? 0;
  const pro = c.seasons.length;
  const isPitcher = c.pos === 'SP' || c.pos === 'RP';

  /* ══ ARC 1: the sign stealing system ══ */
  if (flag(c, 'signs') === 0 && pro >= 2 && !isPitcher) {
    deck.push({
      id: 'mcorr_signs',
      title: 'The camera in center field',
      body: 'A staffer explains the system in about nine seconds: a camera, a monitor behind the dugout, and someone banging a trash can. Everyone in the room already knows what pitch is coming.',
      options: [
        { label: 'Use it every at bat', effect: 'Rating +3, heat +22',
          apply: (cc) => { setFlag(cc, 'signs', 1); cc.ovr = Math.min(99, cc.ovr + 3); heatUp(cc, 22); return 'You knew what was coming for a whole season. Rating +3, and a sound you will hear in your sleep. Heat +22.'; } },
        { label: 'Take it in big spots only', effect: 'Rating +1, heat +10',
          apply: (cc) => { setFlag(cc, 'signs', 2); cc.ovr = Math.min(99, cc.ovr + 1); heatUp(cc, 10); return 'You used it in maybe fifteen at bats all year and told yourself that made a difference. Heat +10.'; } },
        { label: 'Tell them to shut it down', effect: 'Morale +8, room turns cold',
          apply: (cc) => { setFlag(cc, 'signs', -1); cc.morale = clamp(cc.morale + 8, 0, 100); cc.fanbase = clamp(cc.fanbase + 5, 0, 100); return 'You told them to kill it. Half the lineup stopped talking to you and you slept fine.'; } },
      ],
    });
  }

  if (flag(c, 'signs') === 1 && rng() < 0.6) {
    deck.push({
      id: 'mcorr_signs_blow',
      title: 'A pitcher talked',
      body: 'A pitcher who got traded away told a reporter everything, with dates and audio. The league is interviewing your whole roster one at a time.',
      options: [
        { label: 'Deny it completely', effect: 'Heat +22, might hold',
          apply: (cc) => { heatUp(cc, 22); setFlag(cc, 'signs', 3); return 'You denied it for four hours. It held, for now, and every road park boos you for the rest of your life. Heat +22.'; } },
        { label: 'Cooperate fully', effect: 'Heat -30, fanbase -14',
          apply: (cc) => { heatUp(cc, -30); cc.fanbase = clamp(cc.fanbase - 14, 0, 100); setFlag(cc, 'signs', 4); return 'You told them everything. The file closed, the ring keeps an asterisk, and the clubhouse never forgave you.'; } },
      ],
    });
  }

  /* ══ ARC 2: the substance ══ */
  if (isPitcher && flag(c, 'sticky') === 0 && pro >= 1) {
    deck.push({
      id: 'mcorr_sticky',
      title: 'The stuff on the glove',
      body: 'A bullpen catcher hands you a tin of something that is not sunscreen. Spin rate goes up 300 rpm and the umpires check gloves maybe twice a month.',
      options: [
        { label: 'Use it every start', effect: 'Rating +3, heat +18',
          apply: (cc) => { setFlag(cc, 'sticky', 1); cc.ovr = Math.min(99, cc.ovr + 3); heatUp(cc, 18); return 'Your breaking ball became illegal in a way nobody could prove. Rating +3. Heat +18.'; } },
        { label: 'Just rosin and sweat', effect: 'Clean, morale +6',
          apply: (cc) => { setFlag(cc, 'sticky', -1); cc.morale = clamp(cc.morale + 6, 0, 100); return 'Rosin and sweat like your grandfather. Your spin rate is what it is.'; } },
      ],
    });
  }

  if (flag(c, 'sticky') === 1 && rng() < 0.5) {
    deck.push({
      id: 'mcorr_sticky_check',
      title: 'The umpire wants the glove',
      body: 'Third inning, and the crew chief walks out to check your hands on national television.',
      options: [
        { label: 'Hand it over and hope', effect: 'Coin flip',
          apply: (cc, r) => {
            if (r() < 0.4) { heatUp(cc, 30); cc.fanbase = clamp(cc.fanbase - 16, 0, 100); cc.ovr = Math.max(60, cc.ovr - 3); setFlag(cc, 'sticky', 2); return 'Ejected on the spot. Ten games, a highlight that runs forever, and a spin rate that quietly returned to normal.'; }
            heatUp(cc, 5); return 'Clean glove. You had wiped it in the second inning on instinct. Heat +5.';
          } },
        { label: 'Quit the stuff tonight', effect: 'Rating -3, heat -18',
          apply: (cc) => { setFlag(cc, 'sticky', 3); cc.ovr = Math.max(60, cc.ovr - 3); heatUp(cc, -18); return 'You threw the tin in a dumpster behind the stadium. Rating -3 and a very large relief.'; } },
      ],
    });
  }

  /* ══ ARC 3: the clinic ══ */
  if (flag(c, 'clinic') === 0 && (c.age >= 28 || c.health < 72) && pro >= 3) {
    deck.push({
      id: 'mcorr_clinic',
      title: 'The clinic in Florida',
      body: 'A trainer swears by a wellness clinic that ships in unmarked boxes and beats the testing panel by about eighteen months. He says four guys at your position are already on it.',
      options: [
        { label: 'Start the program', effect: 'Rating and health up, heat +25',
          apply: (cc, r) => {
            setFlag(cc, 'clinic', 1);
            const up = 3 + Math.floor(r() * 3);
            cc.ovr = Math.min(99, cc.ovr + up); cc.health = clamp(cc.health + 12, 0, 100); heatUp(cc, 25);
            return `You started the program. Rating +${up}, health +12, and a test you think about every single week.`;
          } },
        { label: 'Do it the hard way', effect: 'Health +5, clean',
          apply: (cc) => { setFlag(cc, 'clinic', -1); cc.health = clamp(cc.health + 5, 0, 100); cc.morale = clamp(cc.morale + 4, 0, 100); return 'You said no and doubled the recovery work instead. Health +5 and nothing to hide.'; } },
      ],
    });
  }

  if (flag(c, 'clinic') === 1) {
    deck.push({
      id: 'mcorr_test',
      title: 'The collector at 6am',
      body: 'Somebody is at your door for a random test. Your program is supposedly invisible. Supposedly.',
      options: [
        { label: 'Take it and hope', effect: 'Coin flip on your career',
          apply: (cc, r) => {
            if (r() < 0.45) {
              setFlag(cc, 'clinic', 2); heatUp(cc, 35);
              cc.fanbase = clamp(cc.fanbase - 22, 0, 100); cc.ovr = Math.max(60, cc.ovr - 3);
              return 'Positive. Eighty games, a statement nobody believed, and an asterisk that follows every number you ever put up.';
            }
            heatUp(cc, 6); return 'You passed. You sat in the kitchen for an hour afterward not moving. Heat +6.';
          } },
        { label: 'Stop the program tonight', effect: 'Lose the gains, heat -20',
          apply: (cc) => { setFlag(cc, 'clinic', 3); cc.ovr = Math.max(60, cc.ovr - 3); heatUp(cc, -20); cc.health = clamp(cc.health - 6, 0, 100); return 'You flushed all of it before the collector finished the paperwork. Rating -3 and an enormous quiet relief.'; } },
      ],
    });
  }

  /* ══ ARC 4: tipping pitches for a bettor ══ */
  if (flag(c, 'tips') === 0 && pro >= 3) {
    deck.push({
      id: 'mcorr_tips',
      title: 'The man who likes first innings',
      body: `A man who somehow has your number wants one small thing: a text before first pitch telling him ${isPitcher ? 'what you are opening with' : 'where you are in the order and whether your wrist is right'}. He calls it information. His accountant calls it a business.`,
      options: [
        { label: 'Send the texts, 1.5M a year', effect: '1.5M dirty, heat +20',
          apply: (cc) => { setFlag(cc, 'tips', 1); dirty(cc, 1.5); heatUp(cc, 20); return 'You sent a text before every first pitch for a season. One and a half million dollars. Heat +20.'; } },
        { label: 'Block the number', effect: 'Nothing happens. Yet',
          apply: (cc) => { setFlag(cc, 'tips', -1); return 'You blocked him. He found a second number inside a month.'; } },
        { label: 'Report it', effect: 'Fanbase +6, one enemy',
          apply: (cc) => { setFlag(cc, 'tips', -2); cc.fanbase = clamp(cc.fanbase + 6, 0, 100); cc.morale = clamp(cc.morale + 5, 0, 100); return 'You reported it the same afternoon. The league put you in a training video.'; } },
      ],
    });
  }

  if (flag(c, 'tips') === 1) {
    deck.push({
      id: 'mcorr_tips_escalate',
      title: 'He wants the result, not the information',
      body: 'Texts are not enough anymore. He wants a specific outcome in a specific inning of a game nobody will remember. The number he says out loud has a comma in a new place.',
      options: [
        { label: 'Do it, 4M', effect: '4M dirty, heat +34',
          apply: (cc) => { setFlag(cc, 'tips', 2); dirty(cc, 4); heatUp(cc, 34); cc.morale = clamp(cc.morale - 14, 0, 100); return 'You gave him his inning. Nobody in the ballpark knew. You knew for the rest of your life. Heat +34.'; } },
        { label: 'Refuse and take the leak', effect: 'Fanbase -18, no more asks',
          apply: (cc) => { setFlag(cc, 'tips', 3); heatUp(cc, 12); cc.fanbase = clamp(cc.fanbase - 18, 0, 100); return 'You refused. The old texts ran on a Sunday. Fanbase -18, and it stopped there.'; } },
        { label: 'Walk into the league office', effect: 'Season ban, heat wiped',
          apply: (cc) => { setFlag(cc, 'tips', 4); D(cc).heat = 0; D(cc).dirtyMoney = 0; cc.fanbase = clamp(cc.fanbase - 8, 0, 100); cc.morale = clamp(cc.morale + 12, 0, 100); return 'You self reported with a folder. A season gone, every dollar returned, and the first real sleep in a year.'; } },
      ],
    });
  }

  /* ══ ARC 5: the bonus skim ══ */
  if (flag(c, 'academy') === 0 && (D(c).netWorth ?? 0) >= 6 && c.age >= 28) {
    deck.push({
      id: 'mcorr_academy',
      title: 'The academy in the Dominican',
      body: 'You are offered a piece of a baseball academy that develops 15 year olds. The business model, once you read it properly, is taking a third of a teenager\'s signing bonus for the rest of his career.',
      options: [
        { label: 'Buy in, it prints money', effect: '2M a year dirty, heat +18',
          apply: (cc) => { setFlag(cc, 'academy', 1); dirty(cc, 2); heatUp(cc, 18); return 'You bought in. Two million a year, taken a third at a time from teenagers. Heat +18.'; } },
        { label: 'Buy it and rewrite the contracts', effect: 'Costs 3M, fanbase +10',
          apply: (cc) => { setFlag(cc, 'academy', 2); bank(cc, -3); cc.fanbase = clamp(cc.fanbase + 10, 0, 100); cc.morale = clamp(cc.morale + 10, 0, 100); return 'You bought the academy and tore up every bonus clause. It costs you three million a year and eleven kids kept their money.'; } },
        { label: 'Walk away', effect: 'Nothing gained, nothing lost',
          apply: (cc) => { setFlag(cc, 'academy', -1); return 'You walked out halfway through the pitch.'; } },
      ],
    });
  }

  /* ══ Standalone temptations ══ */
  if (dm >= 2 && flag(c, 'wash') === 0) {
    deck.push({
      id: 'mcorr_wash',
      title: 'The money has nowhere to live',
      body: `You are sitting on ${dm.toFixed(1)}M that cannot be explained to anyone with a badge. Your accountant has said "hypothetically" so often it has lost meaning.`,
      options: [
        { label: 'Buy cash businesses', effect: 'Launder it, heat +10 now',
          apply: (cc) => { setFlag(cc, 'wash', 1); heatUp(cc, 10); return 'You bought car washes and a batting cage complex. The revenue is remarkable for the foot traffic.'; } },
        { label: 'Declare it and eat the tax', effect: 'Lose 55 percent, heat -35',
          apply: (cc) => {
            const keep = Math.round((D(cc).dirtyMoney ?? 0) * 0.45 * 10) / 10;
            bank(cc, keep); D(cc).dirtyMoney = 0; heatUp(cc, -35); setFlag(cc, 'wash', 2);
            return `You declared all of it. The IRS took over half and handed back something better. Kept ${keep}M clean.`;
          } },
      ],
    });
  }

  if (c.fanbase >= 55) {
    deck.push({
      id: 'mcorr_sportsbook',
      title: 'The sportsbook wants your face',
      body: 'A betting app offers a fortune to be their guy. Buried in the fine print is a clause about promoting props on games you play in, which will end your career if anyone reads it out loud.',
      options: [
        { label: 'Sign it, 5M', effect: '5M dirty, heat +20',
          apply: (cc) => { dirty(cc, 5); heatUp(cc, 20); cc.fanbase = clamp(cc.fanbase + 4, 0, 100); return 'You signed. Five million and your face on a parlay slip in every bar in the state. Heat +20.'; } },
        { label: 'Sign the clean version, 1.8M', effect: '1.8M legit',
          apply: (cc) => { cc.earnings += 1.8; return 'Your lawyer stripped the illegal clauses and the number fell to 1.8M. Still 1.8M.'; } },
        { label: 'Turn it down entirely', effect: 'Fanbase +8',
          apply: (cc) => { cc.fanbase = clamp(cc.fanbase + 8, 0, 100); cc.morale = clamp(cc.morale + 5, 0, 100); return 'You turned down sportsbook money out loud, in a sport that banned its best hitter for exactly this.'; } },
      ],
    });
  }

  if (c.ovr >= 82 && rng() < 0.5) {
    deck.push({
      id: 'mcorr_memorabilia',
      title: 'Game used, allegedly',
      body: 'A dealer wants to sell bats and jerseys as game used. Some of them are. Most of them came from a supplier in Ohio last Tuesday.',
      options: [
        { label: 'Authenticate all of it, 1.2M', effect: '1.2M dirty, heat +12',
          apply: (cc) => { dirty(cc, 1.2); heatUp(cc, 12); return 'You signed certificates for bats you never held. Heat +12.'; } },
        { label: 'Only authenticate the real ones', effect: '400k clean',
          apply: (cc) => { cc.earnings += 0.4; return 'You went through the whole inventory and signed off on eleven real pieces out of ninety.'; } },
      ],
    });
  }

  if (h >= 30 && h < 90) {
    deck.push({
      id: 'mcorr_reporter',
      title: 'The reporter is very good',
      body: 'She has an LLC filing, a wire transfer, and video of you touching your belt in a very specific pattern. She would like a comment.',
      options: [
        { label: 'Trade her a different exclusive', effect: 'Heat -12',
          apply: (cc) => { heatUp(cc, -12); cc.fanbase = clamp(cc.fanbase + 3, 0, 100); return 'You gave her a soft exclusive and she shelved the hard one. Journalism. Heat -12.'; } },
        { label: 'Threaten to sue', effect: 'Heat +18',
          apply: (cc) => { heatUp(cc, 18); cc.fanbase = clamp(cc.fanbase - 10, 0, 100); return 'Your lawyers sent a letter. She printed it above the story and it went enormous. Heat +18.'; } },
        { label: 'Tell her the truth, all of it', effect: 'Heat halved',
          apply: (cc) => { D(cc).heat = Math.round((D(cc).heat ?? 0) / 2); cc.fanbase = clamp(cc.fanbase - 14, 0, 100); cc.morale = clamp(cc.morale + 10, 0, 100); return 'You sat down and told a reporter everything on the record. Worst week of your life, best decision in it.'; } },
      ],
    });
  }

  if (h >= 50 && flag(c, 'amnesty') === 0) {
    deck.push({
      id: 'mcorr_amnesty',
      title: 'The window',
      body: 'The league opens a one time amnesty: come forward, take a fixed suspension, keep your career and your pension. Your lawyer calls it the best deal you will ever be offered.',
      options: [
        { label: 'Take it', effect: '50 games, heat nearly wiped',
          apply: (cc) => { setFlag(cc, 'amnesty', 1); D(cc).heat = 6; D(cc).dirtyMoney = 0; cc.fanbase = clamp(cc.fanbase - 6, 0, 100); cc.morale = clamp(cc.morale + 12, 0, 100); return 'You took the amnesty. Fifty games, a closed file, and a phone that finally went quiet.'; } },
        { label: 'Ignore it', effect: 'Heat +12',
          apply: (cc) => { setFlag(cc, 'amnesty', 2); heatUp(cc, 12); return 'You skipped the window. In this sport that is how people end up on a list with one name on it.'; } },
      ],
    });
  }

  if ((D(c).netWorth ?? 0) >= 4) {
    deck.push({
      id: 'mcorr_ponzi',
      title: 'The advisor everybody uses',
      body: 'An advisor who somehow represents nine guys in your clubhouse promises 30 percent returns, guaranteed, in writing. Guaranteed is not a word that exists in investing.',
      options: [
        { label: 'Put in 3M', effect: 'Probably gone',
          apply: (cc, r) => {
            if (r() < 0.2) { bank(cc, 4); return 'It paid out and you got out before it collapsed on everyone else. Luck, not skill.'; }
            bank(cc, -3); cc.morale = clamp(cc.morale - 10, 0, 100);
            return 'It was a Ponzi. Three million gone, along with the savings of nine teammates who trusted him because you did.';
          } },
        { label: 'Ask for audited statements', effect: 'He vanishes',
          apply: (cc) => { cc.morale = clamp(cc.morale + 5, 0, 100); return 'You asked for audited statements and he stopped returning calls inside a week. That was the answer.'; } },
        { label: 'Warn the clubhouse', effect: 'Save everyone',
          apply: (cc) => { cc.morale = clamp(cc.morale + 10, 0, 100); cc.fanbase = clamp(cc.fanbase + 4, 0, 100); return 'You stood up in front of the room and told everyone to pull their money. He was indicted two years later.'; } },
      ],
    });
  }

  if (c.age >= 31 && (D(c).netWorth ?? 0) < 4 && c.earnings >= 35) {
    deck.push({
      id: 'mcorr_broke',
      title: 'Where did it go',
      body: `You have earned ${Math.round(c.earnings)}M in this game and your accountant says you are close to broke. Houses, relatives, an advisor, three businesses that never opened.`,
      options: [
        { label: 'Sell everything and start over', effect: 'Recover cash',
          apply: (cc) => { bank(cc, 4); D(cc).yearlyCosts = 0; cc.morale = clamp(cc.morale - 6, 0, 100); return 'You sold the cars, the lake house and the restaurant. Four million back and a much quieter life.'; } },
        { label: 'Take the money being offered', effect: '5M dirty, heat +26',
          apply: (cc) => { dirty(cc, 5); heatUp(cc, 26); return 'You called the number you swore you never would. Five million, and the meter went straight up. Heat +26.'; } },
        { label: 'Get real advisors and grind it back', effect: 'Boring, works',
          apply: (cc) => { D(cc).yearlyCosts = Math.round((D(cc).yearlyCosts ?? 0) * 0.5 * 100) / 100; cc.morale = clamp(cc.morale + 8, 0, 100); return 'Boring budget, real advisors, no more favours. Nobody tells this story and it works every time.'; } },
      ],
    });
  }

  if ((D(c).heat ?? 0) >= 20 && pro >= 3) {
    deck.push({
      id: 'mcorr_teammate',
      title: 'He wants in',
      body: 'A teammate has worked out exactly what you are doing. He is not threatening you. He is asking to be included, which is somehow worse.',
      options: [
        { label: 'Bring him in', effect: 'Double money, double exposure',
          apply: (cc) => { dirty(cc, 1.8); heatUp(cc, 20); return 'Two of you now. The money doubled and so did the number of people who can end this. Heat +20.'; } },
        { label: 'Talk him out of it', effect: 'Heat -6',
          apply: (cc) => { heatUp(cc, -6); cc.morale = clamp(cc.morale + 6, 0, 100); return 'You told him exactly how it ends and he listened. Years later he thanked you in a text at 2am.'; } },
        { label: 'Use it as your own exit', effect: 'Stop everything, heat -25',
          apply: (cc) => { heatUp(cc, -25); setFlag(cc, 'tips', 7); cc.morale = clamp(cc.morale + 10, 0, 100); return 'Hearing somebody else say it out loud made it real. You stopped everything that week. Heat -25.'; } },
      ],
    });
  }

  if (pro >= 9 && (D(c).heat ?? 0) <= 10 && flag(c, 'cleanHands') === 0) {
    deck.push({
      id: 'mcorr_clean_hands',
      title: 'They want you talking to prospects',
      body: 'The league wants you fronting its integrity program, the one that warns 19 year olds about exactly the phone calls you used to get.',
      options: [
        { label: 'Do it and tell them everything', effect: 'Fanbase +12, morale +10',
          apply: (cc) => { setFlag(cc, 'cleanHands', 1); cc.fanbase = clamp(cc.fanbase + 12, 0, 100); cc.morale = clamp(cc.morale + 10, 0, 100); return 'You stood in front of 200 prospects and told them what nearly happened to you. Some of them will remember it.'; } },
        { label: 'Decline', effect: 'Morale +4',
          apply: (cc) => { setFlag(cc, 'cleanHands', 2); cc.morale = clamp(cc.morale + 4, 0, 100); return 'You passed. Being clean did not have to become a personality.'; } },
      ],
    });
  }

  if (c.rings >= 1 && flag(c, 'hofVote') === 0 && c.age >= 34) {
    deck.push({
      id: 'mcorr_hof_lobby',
      title: 'The voters are people',
      body: 'A firm offers to run a Hall of Fame campaign for you: dinners, access and a very warm documentary aimed at the writers who vote.',
      options: [
        { label: 'Run the campaign, 2M', effect: 'Better odds, heat +8',
          apply: (cc) => { setFlag(cc, 'hofVote', 1); bank(cc, -2); heatUp(cc, 8); cc.fanbase = clamp(cc.fanbase + 6, 0, 100); return 'You ran the campaign. Three hundred writers had a lovely winter and your name stayed in every column.'; } },
        { label: 'Let the numbers argue', effect: 'Morale +8',
          apply: (cc) => { setFlag(cc, 'hofVote', 2); cc.morale = clamp(cc.morale + 8, 0, 100); return 'No campaign. You told them to look at the back of the card and went fishing.'; } },
      ],
    });
  }

  if ((d.suspendedSeasons ?? 0) === 0 && c.seasons.some(s => s.teamResult === 'SUSPENDED') && flag(c, 'afterBan') === 0) {
    deck.push({
      id: 'mcorr_reinstated',
      title: 'Reinstated',
      body: 'You are allowed to play again. One organisation called, they want you in Triple A to start, and the offer is close to the minimum. The manager says the clubhouse voted on it.',
      options: [
        { label: 'Take it and rebuild everything', effect: 'Morale +18, minimum deal',
          apply: (cc) => { setFlag(cc, 'afterBan', 1); cc.morale = clamp(cc.morale + 18, 0, 100); cc.health = clamp(cc.health + 6, 0, 100); cc.salary = 0.8; cc.contractYears = 1; return `You signed a minor league deal with ${mlbTeamLabelOf(cc.team)} and outworked every prospect in camp.`; } },
        { label: 'Call the guy back', effect: '5M dirty, heat +30',
          apply: (cc) => { setFlag(cc, 'afterBan', 2); dirty(cc, 5); heatUp(cc, 30); return 'You called him back inside a week. He said he knew you would. Heat +30.'; } },
      ],
    });
  }

  return deck;
}
