/* ────────────────────────────────────────────────────────────────────────────
   nhlCareerCorruption.ts, the dirty side of NHL My Career (Round 59)

   Owner brief: take everything a full life sim does, make it ten times
   better and more out of pocket, add corruption and more things to spend
   money on, at least 200 new additions to each game.

   Hockey's own flavour of trouble: a bounty on a star's head, salary cap
   circumvention through a fake retirement year, a doctor in Europe with a
   suitcase, tipping the starting goalie to a bettor, a junior agent who owns a
   piece of your future, and a league office that has quietly buried worse.

   MECHANICS (all optional NhlCareerState fields, so pre-R59 saves load fine):
     heat             0-100 hidden meter. Dirty choices raise it, clean seasons
                      cool it 9/yr. At 65 the league opens a probe, at 90 comes
                      the suspension that costs a full season.
     dirtyMoney       millions of income nobody can explain.
     suspendedSeasons >0 means the next season is served banned.

   CONTRACT: an option's `apply` MUTATES the state and RETURNS A STRING.

   CIRCULAR IMPORT RULE (this broke the site once, in Round 56): nhlMyCareer.ts
   imports this file, so NEVER evaluate an imported VALUE at module scope here.
   Imported values are only safe inside functions.
   ──────────────────────────────────────────────────────────────────────────── */
import type { NhlCareerState, NhlCareerEvent } from './nhlMyCareer';
import { nhlTeamLabelOf } from './nhlMyCareer';

type DirtyState = NhlCareerState & {
  heat?: number;
  dirtyMoney?: number;
  suspendedSeasons?: number;
  netWorth?: number;
  lifeFlags?: Record<string, number>;
  yearlyCosts?: number;
};
const D = (c: NhlCareerState): DirtyState => c as DirtyState;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const flag = (c: NhlCareerState, k: string): number => (D(c).lifeFlags || {})[k] || 0;
const setFlag = (c: NhlCareerState, k: string, v: number) => {
  D(c).lifeFlags = { ...(D(c).lifeFlags || {}), [k]: v };
};
const heatUp = (c: NhlCareerState, n: number) => { D(c).heat = clamp((D(c).heat ?? 0) + n, 0, 100); };
const dirty = (c: NhlCareerState, n: number) => { D(c).dirtyMoney = Math.round(((D(c).dirtyMoney ?? 0) + n) * 10) / 10; };
const bank = (c: NhlCareerState, n: number) => { D(c).netWorth = Math.round(((D(c).netWorth ?? 0) + n) * 10) / 10; };

/** Heat band for the UI panel. */
export function nhlHeatLabel(h: number): { label: string; tone: string; blurb: string } {
  if (h >= 90) return { label: 'SUSPENDED INDEFINITELY', tone: 'text-red-400', blurb: 'The league released a statement with your name in it and no end date attached.' };
  if (h >= 65) return { label: 'UNDER INVESTIGATION', tone: 'text-red-400', blurb: 'Two people from the league office have been at the rink three mornings running.' };
  if (h >= 40) return { label: 'FLAGGED', tone: 'text-orange-400', blurb: 'Someone flagged a wire transfer and a very specific overtime period in February.' };
  if (h >= 15) return { label: 'WHISPERS', tone: 'text-amber-400', blurb: 'Nothing solid. Just a beat writer asking why your agent flew to Zurich.' };
  return { label: 'CLEAN', tone: 'text-emerald-400', blurb: 'Nobody is looking at you. Keep it that way, or do not.' };
}

export function getNhlCorruptionEvents(c: NhlCareerState, rng: () => number): NhlCareerEvent[] {
  const deck: NhlCareerEvent[] = [];
  const d = D(c);
  const h = d.heat ?? 0;
  const dm = d.dirtyMoney ?? 0;
  const pro = c.seasons.length;
  const isGoalie = c.pos === 'G';

  /* ══ ARC 1: the bounty ══ */
  if (!isGoalie && flag(c, 'bounty') === 0 && pro >= 2) {
    deck.push({
      id: 'hcorr_bounty',
      title: 'The envelope on the bench',
      body: 'A veteran leans over between periods and explains the room has money on their best player not finishing the series. Not a hit. Just a hit, if you follow.',
      options: [
        { label: 'Take the money and take the number', effect: 'Room loves you, heat +20',
          apply: (cc) => { setFlag(cc, 'bounty', 1); dirty(cc, 0.9); heatUp(cc, 20); cc.morale = clamp(cc.morale + 6, 0, 100); return 'You took your shift and took the number. The bench stood up. Heat +20.'; } },
        { label: 'Play hard, take no envelope', effect: 'Neutral, slightly outside',
          apply: (cc) => { setFlag(cc, 'bounty', -1); cc.morale = clamp(cc.morale - 3, 0, 100); return 'You played the series hard and never touched the envelope. Nobody said anything. Everybody noticed.'; } },
        { label: 'Tell the coach it stops today', effect: 'Fanbase +8, room turns cold',
          apply: (cc) => { setFlag(cc, 'bounty', -2); cc.morale = clamp(cc.morale - 8, 0, 100); cc.fanbase = clamp(cc.fanbase + 8, 0, 100); return 'You killed it in front of the room. Half the bench stopped talking to you and a whole league quietly respected you.'; } },
      ],
    });
  }

  if (flag(c, 'bounty') === 1 && rng() < 0.6) {
    deck.push({
      id: 'hcorr_bounty_out',
      title: 'A cut player talked',
      body: 'Somebody sent home in training camp told a reporter everything about the pool, with dates. The league is interviewing the whole room one at a time.',
      options: [
        { label: 'Deny it flat', effect: 'Heat +20, might hold',
          apply: (cc) => { heatUp(cc, 20); setFlag(cc, 'bounty', 2); return 'You denied it for three hours. It held, for now, and every road building boos you for the rest of your life. Heat +20.'; } },
        { label: 'Cooperate fully', effect: '10 game ban, heat -30',
          apply: (cc) => { heatUp(cc, -30); cc.fanbase = clamp(cc.fanbase - 12, 0, 100); setFlag(cc, 'bounty', 3); return 'You told them everything. Ten games and a room that will never fully trust you, but the file closed.'; } },
      ],
    });
  }

  /* ══ ARC 2: cap circumvention ══ */
  if (flag(c, 'cap') === 0 && c.ovr >= 84 && c.contractYears <= 1 && c.age >= 26) {
    deck.push({
      id: 'hcorr_cap',
      title: 'The tail years',
      body: 'The general manager proposes a twelve year deal where the last four pay almost nothing and everyone in the room understands you will retire before them. It lowers the cap hit. It is also exactly what the league banned.',
      options: [
        { label: 'Sign the twelve year deal', effect: 'Long money, heat +16',
          apply: (cc) => { setFlag(cc, 'cap', 1); heatUp(cc, 16); cc.contractYears = 8; cc.salary = Math.round(cc.salary * 1.2 * 10) / 10; return 'Twelve years on paper, eight in reality, and a cap hit that made the whole roster possible. Heat +16.'; } },
        { label: 'Take a clean shorter deal', effect: 'Less term, zero risk',
          apply: (cc) => { setFlag(cc, 'cap', -1); cc.contractYears = 5; cc.salary = Math.round(cc.salary * 1.1 * 10) / 10; return 'You signed a clean five year deal at a real number. Nobody in a hearing room ever says your name.'; } },
      ],
    });
  }

  if (flag(c, 'cap') === 1 && rng() < 0.45) {
    deck.push({
      id: 'hcorr_cap_ruling',
      title: 'The arbitrator wants to talk',
      body: 'The league is challenging four contracts as circumvention. Yours is the cleanest of the four, which is not a compliment.',
      options: [
        { label: 'Let the union fight it', effect: 'Heat +10, contract holds',
          apply: (cc) => { heatUp(cc, 10); setFlag(cc, 'cap', 2); return 'The union fought it to a draw. Your deal stands and your name is in a ruling forever. Heat +10.'; } },
        { label: 'Renegotiate it clean yourself', effect: 'Lose 15 percent, heat -22',
          apply: (cc) => { cc.salary = Math.round(cc.salary * 0.85 * 10) / 10; heatUp(cc, -22); setFlag(cc, 'cap', 3); return 'You went to the team and rewrote it straight. Fifteen percent gone and the file closed on you specifically.'; } },
      ],
    });
  }

  /* ══ ARC 3: the doctor with the suitcase ══ */
  if (flag(c, 'doctor') === 0 && (c.age >= 28 || c.health < 72) && pro >= 3) {
    deck.push({
      id: 'hcorr_doctor',
      title: 'The doctor in Europe',
      body: 'A trainer knows a clinic that flies in twice a year with a suitcase and a program the testers are eighteen months behind on. He says two guys on your top line are already on it.',
      options: [
        { label: 'Start the program', effect: 'Rating and health up, heat +25',
          apply: (cc, r) => {
            setFlag(cc, 'doctor', 1);
            const up = 3 + Math.floor(r() * 3);
            cc.ovr = Math.min(99, cc.ovr + up); cc.health = clamp(cc.health + 12, 0, 100); heatUp(cc, 25);
            return `You started the program. Rating +${up}, health +12, and a knock at the door you think about every week.`;
          } },
        { label: 'Do it the hard way', effect: 'Health +5, clean',
          apply: (cc) => { setFlag(cc, 'doctor', -1); cc.health = clamp(cc.health + 5, 0, 100); cc.morale = clamp(cc.morale + 4, 0, 100); return 'You said no and doubled the summer work instead. Health +5 and nothing to hide.'; } },
      ],
    });
  }

  if (flag(c, 'doctor') === 1) {
    deck.push({
      id: 'hcorr_test',
      title: 'The knock at 6am',
      body: 'A collector is at your door. Your program is supposedly invisible. Supposedly.',
      options: [
        { label: 'Take the test and hope', effect: 'Coin flip on your career',
          apply: (cc, r) => {
            if (r() < 0.45) {
              setFlag(cc, 'doctor', 2); heatUp(cc, 35);
              cc.fanbase = clamp(cc.fanbase - 20, 0, 100); cc.ovr = Math.max(60, cc.ovr - 3);
              return 'Positive. Twenty games, a statement nobody believed, and an asterisk on every number you ever put up.';
            }
            heatUp(cc, 6); return 'You passed. You sat in the kitchen for an hour afterward not moving. Heat +6.';
          } },
        { label: 'Stop the program tonight', effect: 'Lose the gains, heat -20',
          apply: (cc) => { setFlag(cc, 'doctor', 3); cc.ovr = Math.max(60, cc.ovr - 3); heatUp(cc, -20); cc.health = clamp(cc.health - 6, 0, 100); return 'You flushed all of it before the collector finished the paperwork. Rating -3 and an enormous relief.'; } },
      ],
    });
  }

  /* ══ ARC 4: tipping the starter ══ */
  if (flag(c, 'tips') === 0 && pro >= 3) {
    deck.push({
      id: 'hcorr_tips',
      title: 'Who is starting tonight',
      body: `A man who somehow has your number wants one thing: a text at 4pm telling him ${isGoalie ? 'whether you are in net' : 'which goalie is starting and who is scratched'}. Nobody announces it until warmups and the whole market moves when they know.`,
      options: [
        { label: 'Send the texts, 1.2M a year', effect: '1.2M dirty, heat +20',
          apply: (cc) => { setFlag(cc, 'tips', 1); dirty(cc, 1.2); heatUp(cc, 20); return 'You sent a text at 4pm for a whole season. One point two million dollars. Heat +20.'; } },
        { label: 'Block the number', effect: 'Nothing happens. Yet',
          apply: (cc) => { setFlag(cc, 'tips', -1); return 'You blocked him. He found a second number inside a month.'; } },
        { label: 'Report it', effect: 'Fanbase +6, one enemy',
          apply: (cc) => { setFlag(cc, 'tips', -2); cc.fanbase = clamp(cc.fanbase + 6, 0, 100); cc.morale = clamp(cc.morale + 5, 0, 100); return 'You reported it the same afternoon. The league used you in a training video.'; } },
      ],
    });
  }

  if (flag(c, 'tips') === 1) {
    deck.push({
      id: 'hcorr_tips_more',
      title: 'He wants the result now',
      body: `Texts are not enough. He wants ${isGoalie ? 'one soft goal in a first period nobody will remember' : 'a shift that goes badly in a game already lost'}. The number he says out loud has a comma in a new place.`,
      options: [
        { label: 'Do it, 3.5M', effect: '3.5M dirty, heat +34',
          apply: (cc) => { setFlag(cc, 'tips', 2); dirty(cc, 3.5); heatUp(cc, 34); cc.morale = clamp(cc.morale - 14, 0, 100); return 'You gave him his period. Nobody in the building knew. You knew for the rest of your life. Heat +34.'; } },
        { label: 'Refuse and take the leak', effect: 'Fanbase -18, no more asks',
          apply: (cc) => { setFlag(cc, 'tips', 3); heatUp(cc, 12); cc.fanbase = clamp(cc.fanbase - 18, 0, 100); return 'You refused. The old texts ran on a Tuesday. Fanbase -18, and it stopped there.'; } },
        { label: 'Walk into the league office', effect: 'Season ban, heat wiped',
          apply: (cc) => { setFlag(cc, 'tips', 4); D(cc).heat = 0; D(cc).dirtyMoney = 0; cc.fanbase = clamp(cc.fanbase - 8, 0, 100); cc.morale = clamp(cc.morale + 12, 0, 100); return 'You self reported with a folder. A season gone, every dollar returned, and the first real sleep in a year.'; } },
      ],
    });
  }

  /* ══ ARC 5: the junior agent who owns a piece of you ══ */
  if (flag(c, 'juniorAgent') === 0 && c.earnings >= 12) {
    deck.push({
      id: 'hcorr_junior_agent',
      title: 'The paper you signed at sixteen',
      body: 'A man who billeted you in junior produces a contract you signed at sixteen entitling him to eight percent of your career earnings. Your lawyer says it is almost certainly unenforceable. Almost.',
      options: [
        { label: 'Pay him quietly', effect: 'Lose 8 percent, heat +10',
          apply: (cc) => { setFlag(cc, 'juniorAgent', 1); const cut = Math.round(cc.earnings * 0.08 * 10) / 10; bank(cc, -cut); heatUp(cc, 10); return `You paid him ${cut}M to keep a sixteen year old's signature out of a courtroom. Heat +10.`; } },
        { label: 'Fight it in court', effect: 'Costs 500k, probably wins',
          apply: (cc, r) => {
            setFlag(cc, 'juniorAgent', 2); bank(cc, -0.5);
            if (r() < 0.8) return 'The judge threw it out in nine minutes. Half a million in fees and it is over forever.';
            heatUp(cc, 8); return 'It went badly. The contract partly held and the story ran everywhere. Heat +8.';
          } },
        { label: 'Buy him out and fund a junior program', effect: 'Costs more, fanbase +10',
          apply: (cc) => { setFlag(cc, 'juniorAgent', 3); bank(cc, -2); cc.fanbase = clamp(cc.fanbase + 10, 0, 100); cc.morale = clamp(cc.morale + 8, 0, 100); return 'You paid him off and put two million into the junior program you came through, on the condition nobody signs paper at sixteen again.'; } },
      ],
    });
  }

  /* ══ Standalone temptations ══ */
  if (dm >= 2 && flag(c, 'wash') === 0) {
    deck.push({
      id: 'hcorr_wash',
      title: 'The money has nowhere to live',
      body: `You are sitting on ${dm.toFixed(1)}M that cannot be explained to anyone with a badge. Your accountant has said "hypothetically" so often it has lost all meaning.`,
      options: [
        { label: 'Buy cash businesses', effect: 'Launder it, heat +10 now',
          apply: (cc) => { setFlag(cc, 'wash', 1); heatUp(cc, 10); return 'You bought two car washes and a skate sharpening chain. The revenue is remarkable for the foot traffic.'; } },
        { label: 'Declare it and eat the tax', effect: 'Lose 55 percent, heat -35',
          apply: (cc) => {
            const keep = Math.round((D(cc).dirtyMoney ?? 0) * 0.45 * 10) / 10;
            bank(cc, keep); D(cc).dirtyMoney = 0; heatUp(cc, -35); setFlag(cc, 'wash', 2);
            return `You declared all of it. The taxman took over half and handed back something better. Kept ${keep}M clean.`;
          } },
      ],
    });
  }

  if (c.fanbase >= 55) {
    deck.push({
      id: 'hcorr_sportsbook',
      title: 'The sportsbook wants your face',
      body: 'A betting app offers a fortune to be their guy. Buried in the fine print is a clause about promoting props on your own games, which is the fastest way out of this league.',
      options: [
        { label: 'Sign it, 4M', effect: '4M dirty, heat +20',
          apply: (cc) => { dirty(cc, 4); heatUp(cc, 20); cc.fanbase = clamp(cc.fanbase + 4, 0, 100); return 'You signed. Four million and your face on a parlay slip in every bar in the province. Heat +20.'; } },
        { label: 'Sign the clean version, 1.5M', effect: '1.5M legit',
          apply: (cc) => { cc.earnings += 1.5; return 'Your lawyer stripped the illegal clauses and the number fell to 1.5M. Still 1.5M.'; } },
        { label: 'Turn it down entirely', effect: 'Fanbase +8',
          apply: (cc) => { cc.fanbase = clamp(cc.fanbase + 8, 0, 100); cc.morale = clamp(cc.morale + 5, 0, 100); return 'You turned down sportsbook money out loud and a lot of people who never liked you started to.'; } },
      ],
    });
  }

  if (c.ovr >= 82 && rng() < 0.5) {
    deck.push({
      id: 'hcorr_memorabilia',
      title: 'Game used, allegedly',
      body: 'A dealer wants to sell sticks and jerseys as game used. Some of them are. Most came from a supplier last Tuesday.',
      options: [
        { label: 'Authenticate all of it, 900k', effect: '900k dirty, heat +12',
          apply: (cc) => { dirty(cc, 0.9); heatUp(cc, 12); return 'You signed certificates for sticks you never taped. Heat +12.'; } },
        { label: 'Only authenticate the real ones', effect: '300k clean',
          apply: (cc) => { cc.earnings += 0.3; return 'You went through the whole inventory and signed off on nine real pieces out of eighty.'; } },
      ],
    });
  }

  if (h >= 30 && h < 90) {
    deck.push({
      id: 'hcorr_reporter',
      title: 'The reporter is very good',
      body: 'She has a wire transfer, a numbered company, and a very specific overtime period in February. She would like a comment.',
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
      id: 'hcorr_amnesty',
      title: 'The window',
      body: 'The league opens a one time amnesty: come forward, take a fixed suspension, keep your career. Your lawyer calls it the best offer you will ever get.',
      options: [
        { label: 'Take it', effect: '20 games, heat nearly wiped',
          apply: (cc) => { setFlag(cc, 'amnesty', 1); D(cc).heat = 6; D(cc).dirtyMoney = 0; cc.fanbase = clamp(cc.fanbase - 6, 0, 100); cc.morale = clamp(cc.morale + 12, 0, 100); return 'You took the amnesty. Twenty games, a closed file, and a phone that finally went quiet.'; } },
        { label: 'Ignore it', effect: 'Heat +12',
          apply: (cc) => { setFlag(cc, 'amnesty', 2); heatUp(cc, 12); return 'You skipped the window. The head of league security pinned your photo to an actual board.'; } },
      ],
    });
  }

  if ((D(c).netWorth ?? 0) >= 4) {
    deck.push({
      id: 'hcorr_ponzi',
      title: 'The advisor everybody uses',
      body: 'An advisor who somehow represents nine guys in your room promises 30 percent returns, guaranteed, in writing. Guaranteed is not a word that exists in investing.',
      options: [
        { label: 'Put in 3M', effect: 'Probably gone',
          apply: (cc, r) => {
            if (r() < 0.2) { bank(cc, 4); return 'It paid out and you got out before it collapsed on everyone else. Luck, not skill.'; }
            bank(cc, -3); cc.morale = clamp(cc.morale - 10, 0, 100);
            return 'It was a Ponzi. Three million gone, along with the savings of nine teammates who trusted him because you did.';
          } },
        { label: 'Ask for audited statements', effect: 'He vanishes',
          apply: (cc) => { cc.morale = clamp(cc.morale + 5, 0, 100); return 'You asked for audited statements and he stopped returning calls inside a week. That was the answer.'; } },
        { label: 'Warn the whole room', effect: 'Save everyone',
          apply: (cc) => { cc.morale = clamp(cc.morale + 10, 0, 100); cc.fanbase = clamp(cc.fanbase + 4, 0, 100); return 'You stood up in the room and told everyone to pull their money. He was indicted two years later.'; } },
      ],
    });
  }

  if (c.age >= 30 && (D(c).netWorth ?? 0) < 4 && c.earnings >= 30) {
    deck.push({
      id: 'hcorr_broke',
      title: 'Where did it go',
      body: `You have earned ${Math.round(c.earnings)}M in this league and your accountant says you are close to broke. Houses, relatives, an advisor, a restaurant that never opened.`,
      options: [
        { label: 'Sell everything and start over', effect: 'Recover cash',
          apply: (cc) => { bank(cc, 4); D(cc).yearlyCosts = 0; cc.morale = clamp(cc.morale - 6, 0, 100); return 'You sold the cars, the lake place and the restaurant. Four million back and a much quieter life.'; } },
        { label: 'Take the money being offered', effect: '5M dirty, heat +26',
          apply: (cc) => { dirty(cc, 5); heatUp(cc, 26); return 'You called the number you swore you never would. Five million, and the meter went straight up. Heat +26.'; } },
        { label: 'Get real advisors and grind it back', effect: 'Boring, works',
          apply: (cc) => { D(cc).yearlyCosts = Math.round((D(cc).yearlyCosts ?? 0) * 0.5 * 100) / 100; cc.morale = clamp(cc.morale + 8, 0, 100); return 'Boring budget, real advisors, no more favours. Nobody tells this story and it works every time.'; } },
      ],
    });
  }

  if ((D(c).heat ?? 0) >= 20 && pro >= 3) {
    deck.push({
      id: 'hcorr_teammate',
      title: 'He wants in',
      body: 'A teammate has worked out exactly what you are doing. He is not threatening you. He is asking to be included, which is somehow worse.',
      options: [
        { label: 'Bring him in', effect: 'Double money, double exposure',
          apply: (cc) => { dirty(cc, 1.6); heatUp(cc, 20); return 'Two of you now. The money doubled and so did the number of people who can end this. Heat +20.'; } },
        { label: 'Talk him out of it', effect: 'Heat -6',
          apply: (cc) => { heatUp(cc, -6); cc.morale = clamp(cc.morale + 6, 0, 100); return 'You told him exactly how it ends and he listened. Years later he thanked you in a text at 2am.'; } },
        { label: 'Use it as your own exit', effect: 'Stop everything, heat -25',
          apply: (cc) => { heatUp(cc, -25); setFlag(cc, 'tips', 7); cc.morale = clamp(cc.morale + 10, 0, 100); return 'Hearing somebody else say it out loud made it real. You stopped everything that week. Heat -25.'; } },
      ],
    });
  }

  if (pro >= 9 && (D(c).heat ?? 0) <= 10 && flag(c, 'cleanHands') === 0) {
    deck.push({
      id: 'hcorr_clean_hands',
      title: 'They want you talking to rookies',
      body: 'The league wants you fronting its integrity program, the one that warns 18 year olds about exactly the phone calls you used to get.',
      options: [
        { label: 'Do it and tell them everything', effect: 'Fanbase +12, morale +10',
          apply: (cc) => { setFlag(cc, 'cleanHands', 1); cc.fanbase = clamp(cc.fanbase + 12, 0, 100); cc.morale = clamp(cc.morale + 10, 0, 100); return 'You stood in front of a room of teenagers and told them what nearly happened to you. Some of them will remember it.'; } },
        { label: 'Decline', effect: 'Morale +4',
          apply: (cc) => { setFlag(cc, 'cleanHands', 2); cc.morale = clamp(cc.morale + 4, 0, 100); return 'You passed. Being clean did not have to become a personality.'; } },
      ],
    });
  }

  if (c.cups >= 1 && rng() < 0.35) {
    deck.push({
      id: 'hcorr_cup_ring',
      title: 'Your ring, on sale',
      body: 'Counterfeit championship rings with your name inside are selling online. The manufacturer offers a cut to authenticate them.',
      options: [
        { label: 'Take the cut, 700k', effect: '700k dirty, heat +12',
          apply: (cc) => { dirty(cc, 0.7); heatUp(cc, 12); return 'You authenticated fakes of your own ring. Seven hundred thousand and a small permanent wince. Heat +12.'; } },
        { label: 'Sue them into the ground', effect: 'Fanbase +6, costs 200k',
          apply: (cc) => { bank(cc, -0.2); cc.fanbase = clamp(cc.fanbase + 6, 0, 100); return 'You sued and won. The fakes vanished and the real one got a little more real.'; } },
      ],
    });
  }

  if ((d.suspendedSeasons ?? 0) === 0 && c.seasons.some(s => s.teamResult === 'SUSPENDED') && flag(c, 'afterBan') === 0) {
    deck.push({
      id: 'hcorr_reinstated',
      title: 'Reinstated',
      body: 'You are allowed to play again. One club called, they want you on a tryout, and the money is the minimum. The coach says the room voted on it.',
      options: [
        { label: 'Take it and rebuild everything', effect: 'Morale +18, minimum deal',
          apply: (cc) => { setFlag(cc, 'afterBan', 1); cc.morale = clamp(cc.morale + 18, 0, 100); cc.health = clamp(cc.health + 6, 0, 100); cc.salary = 0.8; cc.contractYears = 1; return `You signed a tryout with ${nhlTeamLabelOf(cc.team)} and outworked every kid in camp.`; } },
        { label: 'Call the guy back', effect: '5M dirty, heat +30',
          apply: (cc) => { setFlag(cc, 'afterBan', 2); dirty(cc, 5); heatUp(cc, 30); return 'You called him back inside a week. He said he knew you would. Heat +30.'; } },
      ],
    });
  }

  /* ══ More standalone temptations ══ */
  if (c.pos === 'G' && flag(c, 'pads') === 0 && pro >= 2) {
    deck.push({
      id: 'hcorr_oversized_pads',
      title: 'The equipment manager has an idea',
      body: 'Your pads can be built a half inch outside the rules in a way the league measures maybe twice a year. Half an inch is an enormous amount of net.',
      options: [
        { label: 'Wear them', effect: 'Rating +2, heat +14',
          apply: (cc) => { setFlag(cc, 'pads', 1); cc.ovr = Math.min(99, cc.ovr + 2); heatUp(cc, 14); return 'You played a season in pads that were quietly illegal. Rating +2. Heat +14.'; } },
        { label: 'Stay legal', effect: 'Clean, morale +5',
          apply: (cc) => { setFlag(cc, 'pads', -1); cc.morale = clamp(cc.morale + 5, 0, 100); return 'You had them rebuilt to spec before camp. Every save is yours.'; } },
      ],
    });
  }

  if (!isGoalie && flag(c, 'stick') === 0 && pro >= 2) {
    deck.push({
      id: 'hcorr_illegal_curve',
      title: 'The curve',
      body: 'Your stick can be curved past legal in a way nobody checks unless the other bench calls for a measurement, which happens about twice a year and only in playoff games.',
      options: [
        { label: 'Use the illegal curve', effect: 'Rating +2, heat +12',
          apply: (cc) => { setFlag(cc, 'stick', 1); cc.ovr = Math.min(99, cc.ovr + 2); heatUp(cc, 12); return 'You played a season on an illegal curve and your shot was never the same afterward. Rating +2. Heat +12.'; } },
        { label: 'Keep it legal', effect: 'Clean, morale +5',
          apply: (cc) => { setFlag(cc, 'stick', -1); cc.morale = clamp(cc.morale + 5, 0, 100); return 'You kept the curve legal. In a game seven that turns out to matter.'; } },
      ],
    });
  }

  if (flag(c, 'stick') === 1 && rng() < 0.35) {
    deck.push({
      id: 'hcorr_measurement',
      title: 'They called for a measurement',
      body: 'Overtime, playoff game, and the other bench points at your stick.',
      options: [
        { label: 'Hand it over', effect: 'Coin flip',
          apply: (cc, r) => {
            if (r() < 0.5) { heatUp(cc, 22); cc.fanbase = clamp(cc.fanbase - 14, 0, 100); setFlag(cc, 'stick', 2); return 'Illegal. Two minutes, they scored on the power play, and the clip has your name on it forever.'; }
            heatUp(cc, 4); return 'Legal by a hair. You had swapped sticks in the second intermission on instinct. Heat +4.';
          } },
        { label: 'Switch sticks first', effect: 'Rating -2, heat -10',
          apply: (cc) => { setFlag(cc, 'stick', 3); cc.ovr = Math.max(60, cc.ovr - 2); heatUp(cc, -10); return 'You grabbed a legal stick off the rack before the referee got there. Rating -2 and a very large relief.'; } },
      ],
    });
  }

  if (c.age >= 27 && c.health < 78 && flag(c, 'scripts') === 0) {
    deck.push({
      id: 'hcorr_scripts',
      title: 'The back to back routine',
      body: 'A team doctor writes you whatever gets you on the ice for the second night in two cities, in amounts that appear on no chart anywhere.',
      options: [
        { label: 'Keep the routine', effect: 'Play every night, health falls',
          apply: (cc) => { setFlag(cc, 'scripts', 1); cc.health = clamp(cc.health - 12, 0, 100); cc.ovr = Math.min(99, cc.ovr + 1); heatUp(cc, 8); return 'You played 82 games on a body built for 55. Rating +1, health -12.'; } },
        { label: 'Get a real second opinion', effect: 'Miss games, protect your life',
          apply: (cc) => { setFlag(cc, 'scripts', -1); cc.health = clamp(cc.health + 10, 0, 100); cc.morale = clamp(cc.morale + 8, 0, 100); return 'You got a real doctor, tapered off and missed fourteen games. Health +10 and a retirement you will be able to enjoy.'; } },
      ],
    });
  }

  if (c.contractYears <= 1 && c.ovr >= 80 && flag(c, 'sideDeal') === 0) {
    deck.push({
      id: 'hcorr_side_deal',
      title: 'The consulting agreement',
      body: 'To keep your cap hit down, the owner offers a private consulting agreement for a relative worth 1.5M a year. It is the oldest trick in the sport and it is still illegal.',
      options: [
        { label: 'Take the side deal', effect: '1.5M a year dirty, heat +16',
          apply: (cc) => { setFlag(cc, 'sideDeal', 1); dirty(cc, 1.5); heatUp(cc, 16); cc.contractYears = 4; return 'Your uncle is a paid consultant who has never consulted. Heat +16.'; } },
        { label: 'Everything on the real contract', effect: 'Slightly more, zero risk',
          apply: (cc) => { setFlag(cc, 'sideDeal', -1); cc.salary = Math.round(cc.salary * 1.05 * 10) / 10; cc.contractYears = 4; return 'You made them put every dollar on the actual contract. Nobody in a hearing room says your name.'; } },
      ],
    });
  }

  if (pro >= 4 && flag(c, 'tickets') === 0) {
    deck.push({
      id: 'hcorr_tickets',
      title: 'Your player tickets',
      body: 'Every player gets comps. A broker offers to buy yours in bulk for playoff games, in cash, forever, which is very much against your contract.',
      options: [
        { label: 'Sell them all, 400k a year', effect: '400k dirty, heat +9',
          apply: (cc) => { setFlag(cc, 'tickets', 1); dirty(cc, 0.4); heatUp(cc, 9); return 'Your comps have been in a broker inventory for two seasons. Heat +9.'; } },
        { label: 'Give them to minor hockey instead', effect: 'Fanbase +8',
          apply: (cc) => { setFlag(cc, 'tickets', -1); cc.fanbase = clamp(cc.fanbase + 8, 0, 100); cc.morale = clamp(cc.morale + 5, 0, 100); return 'Every home game there are twelve kids from a minor hockey team sitting behind the bench.'; } },
      ],
    });
  }

  if ((D(c).dirtyMoney ?? 0) >= 1 && c.age >= 26) {
    deck.push({
      id: 'hcorr_tax_letter',
      title: 'A letter with a seal on it',
      body: 'The revenue agency wants to discuss three years of returns and the numbered company in your accountant\'s filing cabinet.',
      options: [
        { label: 'Fight it, 1.5M in lawyers', effect: 'Coin flip',
          apply: (cc, r) => {
            bank(cc, -1.5);
            if (r() < 0.5) { heatUp(cc, -20); return 'Your lawyers found an error on their side and it evaporated. Heat -20.'; }
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

  if (c.fanbase >= 65 && rng() < 0.4) {
    deck.push({
      id: 'hcorr_pump_dump',
      title: 'The token',
      body: 'A crypto outfit will pay 2.5M for one post. Their own deck has a slide titled exit liquidity and it appears to mean your followers.',
      options: [
        { label: 'Post it, 2.5M', effect: '2.5M dirty, fanbase -12',
          apply: (cc) => { dirty(cc, 2.5); heatUp(cc, 16); cc.fanbase = clamp(cc.fanbase - 12, 0, 100); return 'You posted the token. It went to zero in nine days and the replies are a crime scene.'; } },
        { label: 'Post their slide deck instead', effect: 'Fanbase +8',
          apply: (cc) => { cc.fanbase = clamp(cc.fanbase + 8, 0, 100); cc.morale = clamp(cc.morale + 5, 0, 100); return 'You posted their own exit liquidity slide. The internet ate them alive and thanked you.'; } },
      ],
    });
  }

  if (c.age >= 33 && (D(c).heat ?? 0) <= 15 && flag(c, 'tellAll') === 0) {
    deck.push({
      id: 'hcorr_tell_all',
      title: 'The tell all offer',
      body: 'A publisher offers a fortune for a book naming names: who took envelopes, who was on the program, who got quietly protected. You know most of it, and some of the names are friends.',
      options: [
        { label: 'Write it and name everyone', effect: '3M, fanbase +10, no friends',
          apply: (cc) => { setFlag(cc, 'tellAll', 1); bank(cc, 3); cc.fanbase = clamp(cc.fanbase + 10, 0, 100); cc.morale = clamp(cc.morale - 12, 0, 100); return 'The book named nine people. It sold enormously and your group chat has been silent since.'; } },
        { label: 'Write it without the names', effect: '1.2M, keep everyone',
          apply: (cc) => { setFlag(cc, 'tellAll', 2); bank(cc, 1.2); cc.morale = clamp(cc.morale + 6, 0, 100); return 'You told the stories and protected the names. Smaller advance, same friends.'; } },
        { label: 'Do not write it', effect: 'Morale +8',
          apply: (cc) => { setFlag(cc, 'tellAll', 3); cc.morale = clamp(cc.morale + 8, 0, 100); return 'You turned it down. Some things do not need to be a chapter.'; } },
      ],
    });
  }

  if ((D(c).heat ?? 0) >= 45 && c.contractYears <= 1) {
    deck.push({
      id: 'hcorr_gm_knows',
      title: 'The general manager knows',
      body: 'He never says the word. He says he has concerns about off ice exposure and slides across a contract worth half your market value.',
      options: [
        { label: 'Sign it and stay quiet', effect: 'Half money, heat -10',
          apply: (cc) => { cc.salary = Math.round(cc.salary * 0.5 * 10) / 10; cc.contractYears = 3; heatUp(cc, -10); return 'You signed for half and neither of you ever said what it was about. Heat -10.'; } },
        { label: 'Walk and bet on yourself', effect: 'Cheap deal, keep your name',
          apply: (cc) => { cc.contractYears = 2; cc.fanbase = clamp(cc.fanbase - 5, 0, 100); return `You walked. Only one club called and ${nhlTeamLabelOf(cc.team)} got you cheap, but you kept your name.`; } },
      ],
    });
  }

  return deck;
}
