/* ────────────────────────────────────────────────────────────────────────────
   nflCareerCorruption.ts, the dirty side of NFL My Career (Round 56)

   Owner brief: "imagine everything that bitlife has and then make it ten times
   better and more out of pocket. add corruption and more things to spend money
   on. at least 200 new additions to each game."

   The football version of the crime layer: betting on your own league, a
   bounty pool for big hits, PEDs the union cannot test for yet, shaving points
   in a meaningless week 18, an agent skimming your signing bonus, and the
   league security office slowly working its way toward you.

   MECHANICS (all optional CareerState fields, so pre-Round-56 saves load fine):
     heat             0-100 hidden meter. Dirty choices raise it, clean seasons
                      cool it 9/yr. At 65 league security opens a file, at 90
                      comes the indefinite suspension.
     dirtyMoney       millions of income nobody can explain.
     suspendedSeasons >0 means the next season is served on the banned list.

   Contract note, different from the soccer engine: an NFL event option's
   `apply` MUTATES the state and RETURNS A STRING (the log line the player
   sees). It does not return the state.
   ──────────────────────────────────────────────────────────────────────────── */
import type { CareerState, CareerEvent } from './nflMyCareer';
import { teamLabelOf, NFL_TEAM_NAMES } from './nflMyCareer';

/* CIRCULAR IMPORT GOTCHA (caught by scripts/simNflCareer.mjs, invisible to tsc):
   nflMyCareer imports this file for its event deck, and this file imports
   nflMyCareer for team data. That cycle means any TOP LEVEL evaluation of an
   imported VALUE here runs before nflMyCareer has finished initialising, so
   `NFL_TEAM_NAMES.map(...)` at module scope threw "Cannot read properties of
   undefined" and took the whole page down on load. Reading it lazily inside a
   function is safe, because by then both modules are fully initialised. Keep
   it that way: never touch an imported value at module scope in this file. */
const randomTeamAbbr = (r: () => number): string =>
  NFL_TEAM_NAMES[Math.floor(r() * NFL_TEAM_NAMES.length)].abbr;

/* The Round 56 fields are optional on CareerState, so read and write them
   through this view. Keeps old saves loading and keeps tsc honest. */
type DirtyState = CareerState & {
  heat?: number;
  dirtyMoney?: number;
  suspendedSeasons?: number;
  netWorth?: number;
  lifeFlags?: Record<string, number>;
};
const D = (c: CareerState): DirtyState => c as DirtyState;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const flag = (c: CareerState, k: string): number => (D(c).lifeFlags || {})[k] || 0;
const setFlag = (c: CareerState, k: string, v: number) => {
  D(c).lifeFlags = { ...(D(c).lifeFlags || {}), [k]: v };
};
const heatUp = (c: CareerState, n: number) => {
  D(c).heat = clamp((D(c).heat ?? 0) + n, 0, 100);
};
const dirty = (c: CareerState, n: number) => {
  D(c).dirtyMoney = Math.round(((D(c).dirtyMoney ?? 0) + n) * 10) / 10;
};

/** Heat band for the UI panel, so the danger reads without showing the number. */
export function nflHeatLabel(h: number): { label: string; tone: string; blurb: string } {
  if (h >= 90) return { label: 'INDEFINITE SUSPENSION', tone: 'text-red-400', blurb: 'The commissioner has the file. Your reinstatement is a press conference away from never.' };
  if (h >= 65) return { label: 'UNDER INVESTIGATION', tone: 'text-red-400', blurb: 'League security has opened a file. Two men in polo shirts keep showing up at the facility.' };
  if (h >= 40) return { label: 'FLAGGED', tone: 'text-orange-400', blurb: 'Compliance has questions about your accounts. Your agent stopped putting things in writing.' };
  if (h >= 15) return { label: 'WHISPERS', tone: 'text-amber-400', blurb: 'Nothing solid. Just a beat writer who keeps asking odd questions.' };
  return { label: 'CLEAN', tone: 'text-emerald-400', blurb: 'Nobody is looking at you. Keep it that way, or do not.' };
}

/** Ids in this file all start with corr_ so they never collide with the life decks. */
export function getNflCorruptionEvents(c: CareerState, rng: () => number): CareerEvent[] {
  const deck: CareerEvent[] = [];
  const d = D(c);
  const h = d.heat ?? 0;
  const dm = d.dirtyMoney ?? 0;
  const pro = c.seasons.length;

  /* ══ ARC 1: betting on your own league ══ */
  if (flag(c, 'book') === 0 && pro >= 2) {
    deck.push({
      id: 'corr_the_book',
      title: 'The guy with the app',
      body: 'A cousin of a teammate runs an offshore book and wants exactly one thing: a text on Saturday night telling him who is actually playing Sunday. Injury reports lie. He pays for the truth.',
      options: [
        {
          label: 'Text him the real inactives, 200k a month', effect: 'Big money, real heat',
          apply: (cc) => { setFlag(cc, 'book', 1); dirty(cc, 2.4); heatUp(cc, 22); return 'You sold the injury report. Two point four million a year for a text message. Heat +22.'; },
        },
        {
          label: 'Tell him no and say nothing', effect: 'Nothing happens. Yet',
          apply: (cc) => { setFlag(cc, 'book', -1); return 'You said no. He smiled like a man who would ask again.'; },
        },
        {
          label: 'Report it to league security', effect: 'Clean hands, one enemy',
          apply: (cc) => { setFlag(cc, 'book', -2); cc.fanbase = clamp(cc.fanbase + 6, 0, 100); cc.morale = clamp(cc.morale + 5, 0, 100); return 'You reported it. The league called you a model professional. Your teammate has not spoken to you since.'; },
        },
      ],
    });
  }

  if (flag(c, 'book') === 1) {
    deck.push({
      id: 'corr_bet_yourself',
      title: 'He wants you in the game',
      body: 'Texts are not enough anymore. He wants a number: your yards, under. One quiet Sunday in a lost season. The figure he says out loud has a comma in a new place.',
      options: [
        {
          label: 'Take the under, 3M', effect: '3M dirty, heat +32',
          apply: (cc) => { setFlag(cc, 'book', 2); dirty(cc, 3); heatUp(cc, 32); cc.morale = clamp(cc.morale - 14, 0, 100); return 'You played the worst game of your life on purpose. Nobody in the stadium knew. You knew all week. Heat +32.'; },
        },
        {
          label: 'Refuse and cut him off', effect: 'He leaks the texts',
          apply: (cc) => { setFlag(cc, 'book', 3); heatUp(cc, 12); cc.fanbase = clamp(cc.fanbase - 12, 0, 100); return 'You cut him off. The texts ran on a Tuesday. Fanbase -12, but the asks stopped.'; },
        },
        {
          label: 'Walk into league security with everything', effect: '8 game ban, heat wiped',
          apply: (cc) => { setFlag(cc, 'book', 4); D(cc).heat = 0; D(cc).dirtyMoney = 0; cc.fanbase = clamp(cc.fanbase - 8, 0, 100); cc.morale = clamp(cc.morale + 12, 0, 100); return 'You self reported. Eight games gone and every dollar clawed back, and you slept properly for the first time in a year.'; },
        },
      ],
    });
  }

  /* ══ ARC 2: the bounty pool ══ */
  if (flag(c, 'bounty') === 0 && pro >= 3 && rng() < 0.7) {
    deck.push({
      id: 'corr_bounty_pool',
      title: 'The envelope in the meeting room',
      body: 'A veteran passes an envelope down the row. The defense has a pool going: cash for a knockout, more if the other team\'s starter does not come back. He is looking right at you.',
      options: [
        {
          label: 'Put in and play the game', effect: 'Locker room in, heat +18',
          apply: (cc) => { setFlag(cc, 'bounty', 1); heatUp(cc, 18); cc.morale = clamp(cc.morale + 6, 0, 100); return 'You put your money in the envelope. The room decided you were one of them. Heat +18.'; },
        },
        {
          label: 'Pass the envelope along, say nothing', effect: 'Neutral, slightly outside',
          apply: (cc) => { setFlag(cc, 'bounty', -1); cc.morale = clamp(cc.morale - 3, 0, 100); return 'You passed it down without a word. Nobody said anything. Everybody noticed.'; },
        },
        {
          label: 'Tell the coach it stops today', effect: 'Fanbase +8 later, room turns cold',
          apply: (cc) => { setFlag(cc, 'bounty', -2); cc.morale = clamp(cc.morale - 8, 0, 100); cc.fanbase = clamp(cc.fanbase + 8, 0, 100); return 'You killed the pool. Half the defense stopped talking to you and a whole league quietly respected you.'; },
        },
      ],
    });
  }

  if (flag(c, 'bounty') === 1 && rng() < 0.6) {
    deck.push({
      id: 'corr_bounty_blows',
      title: 'Someone talked',
      body: 'A cut player told a reporter everything about the pool, with dates. The league is interviewing everyone in that room one at a time. Your name is on the list.',
      options: [
        {
          label: 'Deny it flat', effect: 'Heat +20, might hold',
          apply: (cc) => { heatUp(cc, 20); setFlag(cc, 'bounty', 2); return 'You denied everything for three hours. It held, mostly, for now. Heat +20.'; },
        },
        {
          label: 'Cooperate fully', effect: '2 game ban, heat -30',
          apply: (cc) => { heatUp(cc, -30); cc.fanbase = clamp(cc.fanbase - 10, 0, 100); setFlag(cc, 'bounty', 3); return 'You told them everything. Two games and a locker room that will never fully trust you again, but the file closed.'; },
        },
      ],
    });
  }

  /* ══ ARC 3: chemistry ══ */
  if (flag(c, 'peds') === 0 && (c.age >= 28 || c.health < 70) && pro >= 3) {
    deck.push({
      id: 'corr_the_program',
      title: 'The doctor in Arizona',
      body: `A trainer swears by a clinic that runs a program the league cannot test for yet. He says three of your position group are already on it. He says it buys you four years.`,
      options: [
        {
          label: 'Start the program', effect: 'Rating and health up, heat +25',
          apply: (cc, r) => {
            setFlag(cc, 'peds', 1);
            const up = 3 + Math.floor(r() * 3);
            cc.ovr = Math.min(99, cc.ovr + up);
            cc.health = clamp(cc.health + 12, 0, 100);
            heatUp(cc, 25);
            return `You started the program. Rating +${up}, health +12, and a test you now think about every single week.`;
          },
        },
        {
          label: 'Do it the hard way', effect: 'Health +5, clean',
          apply: (cc) => { setFlag(cc, 'peds', -1); cc.health = clamp(cc.health + 5, 0, 100); cc.morale = clamp(cc.morale + 4, 0, 100); return 'You said no and doubled your recovery work instead. Health +5 and nothing to hide.'; },
        },
      ],
    });
  }

  if (flag(c, 'peds') === 1) {
    deck.push({
      id: 'corr_random_test',
      title: 'The knock at 6am',
      body: 'A collector is at your door for a random test. Your program is supposedly invisible. Supposedly.',
      options: [
        {
          label: 'Take the test and hope', effect: 'Coin flip on your career',
          apply: (cc, r) => {
            if (r() < 0.45) {
              setFlag(cc, 'peds', 2);
              heatUp(cc, 35);
              cc.fanbase = clamp(cc.fanbase - 20, 0, 100);
              cc.ovr = Math.max(60, cc.ovr - 3);
              return 'It came back positive. Six games, a statement nobody believed, and an asterisk that follows the numbers forever.';
            }
            heatUp(cc, 6);
            return 'You passed. You sat in the kitchen for an hour afterward not moving. Heat +6.';
          },
        },
        {
          label: 'Stop the program tonight', effect: 'Lose the gains, heat drops',
          apply: (cc) => { setFlag(cc, 'peds', 3); cc.ovr = Math.max(60, cc.ovr - 3); heatUp(cc, -20); cc.health = clamp(cc.health - 6, 0, 100); return 'You flushed it all before the collector finished the paperwork. Rating -3 and a quiet, enormous relief.'; },
        },
      ],
    });
  }

  /* ══ ARC 4: the agent skim ══ */
  if (flag(c, 'agentSkim') === 0 && c.earnings >= 20) {
    deck.push({
      id: 'corr_agent_skim',
      title: 'The math does not math',
      body: `Your accountant flags it gently: about ${Math.round(c.earnings * 0.06)}M of your signing bonus went to an LLC you have never heard of. Your agent has an explanation ready before you finish the sentence.`,
      options: [
        {
          label: 'Take the money back and fire him', effect: 'Recover cash, new agent',
          apply: (cc) => {
            setFlag(cc, 'agentSkim', 1);
            const back = Math.round(cc.earnings * 0.06 * 10) / 10;
            D(cc).netWorth = Math.round(((D(cc).netWorth ?? cc.earnings * 0.45) + back) * 10) / 10;
            return `You clawed back ${back}M and fired him in the parking lot. He is already representing two rookies.`;
          },
        },
        {
          label: 'Let it slide, he gets you paid', effect: 'Keep the machine running',
          apply: (cc) => { setFlag(cc, 'agentSkim', 2); heatUp(cc, 8); cc.salary = Math.round(cc.salary * 1.06 * 10) / 10; return 'You let it go. Your next deal came in six percent over market, which is either loyalty or a receipt.'; },
        },
        {
          label: 'Hand the file to the players union', effect: 'He gets decertified',
          apply: (cc) => { setFlag(cc, 'agentSkim', 3); cc.fanbase = clamp(cc.fanbase + 5, 0, 100); return 'The union decertified him within a year. Eleven other players got their money back because you made a phone call.'; },
        },
      ],
    });
  }

  /* ══ Standalone temptations ══ */
  if (c.fanbase >= 55) {
    deck.push({
      id: 'corr_sportsbook_ad',
      title: 'The sportsbook wants your face',
      body: 'A betting app offers a fortune for an endorsement. Reading the fine print, the deal quietly includes promoting parlays on your own games, which is not a thing you are allowed to do.',
      options: [
        {
          label: 'Sign it, 6M', effect: '6M dirty, heat +20',
          apply: (cc) => { dirty(cc, 6); heatUp(cc, 20); cc.fanbase = clamp(cc.fanbase + 4, 0, 100); return 'You signed. Six million and your face on a parlay slip in every bar in the state. Heat +20.'; },
        },
        {
          label: 'Sign the clean version, 2M', effect: '2M legit, no heat',
          apply: (cc) => { cc.earnings += 2; return 'Your lawyer stripped the illegal clauses and the number dropped to two million. Still two million.'; },
        },
        {
          label: 'Turn it down entirely', effect: 'Fanbase +8, integrity',
          apply: (cc) => { cc.fanbase = clamp(cc.fanbase + 8, 0, 100); cc.morale = clamp(cc.morale + 5, 0, 100); return 'You turned down sportsbook money out loud and a lot of people who never liked you started to.'; },
        },
      ],
    });
  }

  if (dm >= 3 && flag(c, 'wash') === 0) {
    deck.push({
      id: 'corr_wash',
      title: 'The money has nowhere to live',
      body: `You are sitting on ${dm.toFixed(1)}M that cannot be explained to anyone with a badge. Your accountant has started saying "hypothetically" a lot.`,
      options: [
        {
          label: 'Buy car washes and a barbershop chain', effect: 'Launder it, heat +10 now',
          apply: (cc) => { setFlag(cc, 'wash', 1); heatUp(cc, 10); return 'You bought into cash businesses. The car wash does remarkable numbers for a street with no traffic.'; },
        },
        {
          label: 'Declare it and eat the tax', effect: 'Lose 55 percent, heat -35',
          apply: (cc) => {
            const keep = Math.round((D(cc).dirtyMoney ?? 0) * 0.45 * 10) / 10;
            D(cc).netWorth = Math.round(((D(cc).netWorth ?? cc.earnings * 0.45) + keep) * 10) / 10;
            D(cc).dirtyMoney = 0;
            heatUp(cc, -35);
            setFlag(cc, 'wash', 2);
            return `You declared all of it. The IRS took over half and handed back something better: sleep. Kept ${keep}M clean.`;
          },
        },
      ],
    });
  }

  if (h >= 30 && h < 90) {
    deck.push({
      id: 'corr_reporter',
      title: 'The reporter is very good',
      body: 'She has your LLC filings, a photo of you leaving a building you should not have been in, and a timeline. She would like a comment. She is being polite about it.',
      options: [
        {
          label: 'Trade her a different exclusive', effect: 'Heat -12, story spiked',
          apply: (cc) => { heatUp(cc, -12); cc.fanbase = clamp(cc.fanbase + 3, 0, 100); return 'You gave her a soft exclusive and she shelved the hard one. Journalism. Heat -12.'; },
        },
        {
          label: 'Threaten to sue', effect: 'Heat +18, she prints the letter',
          apply: (cc) => { heatUp(cc, 18); cc.fanbase = clamp(cc.fanbase - 10, 0, 100); return 'Your lawyers sent a threat. She printed the letter above the story. It went enormous. Heat +18.'; },
        },
        {
          label: 'Tell her the truth, all of it', effect: 'Heat halved, fanbase hit',
          apply: (cc) => { D(cc).heat = Math.round((D(cc).heat ?? 0) / 2); cc.fanbase = clamp(cc.fanbase - 14, 0, 100); cc.morale = clamp(cc.morale + 10, 0, 100); return 'You sat down and told a reporter everything on the record. Worst week of your life, best decision in it.'; },
        },
      ],
    });
  }

  if (h >= 50 && flag(c, 'amnesty') === 0) {
    deck.push({
      id: 'corr_amnesty',
      title: 'The window',
      body: 'The league opens a one time amnesty: come forward, take a fixed suspension, keep your career. Your lawyer calls it the best deal you will ever see. Your agent calls it a trap. They are both right.',
      options: [
        {
          label: 'Take the amnesty', effect: '4 games, heat nearly wiped',
          apply: (cc) => { setFlag(cc, 'amnesty', 1); D(cc).heat = 6; D(cc).dirtyMoney = 0; cc.fanbase = clamp(cc.fanbase - 6, 0, 100); cc.morale = clamp(cc.morale + 12, 0, 100); return 'You took the amnesty. Four games, a clean file, and a phone that finally stopped buzzing at strange hours.'; },
        },
        {
          label: 'Ignore it, they have nothing', effect: 'Heat +12, they take it personally',
          apply: (cc) => { setFlag(cc, 'amnesty', 2); heatUp(cc, 12); return 'You skipped the window. The head of league security pinned your photo to an actual board.'; },
        },
      ],
    });
  }

  if ((d.suspendedSeasons ?? 0) === 0 && c.seasons.some(s => s.teamResult === 'SUSPENDED') && flag(c, 'afterBan') === 0) {
    deck.push({
      id: 'corr_reinstated',
      title: 'Reinstated',
      body: 'You are back on the list of people allowed to play football. Exactly one team called, they are rebuilding, and the offer is close to the minimum. The coach says the locker room voted on it.',
      options: [
        {
          label: 'Take it and rebuild everything', effect: 'Morale +18, health +6',
          apply: (cc) => { setFlag(cc, 'afterBan', 1); cc.morale = clamp(cc.morale + 18, 0, 100); cc.health = clamp(cc.health + 6, 0, 100); cc.salary = 1.2; cc.contractYears = 1; return `You signed for the minimum with ${teamLabelOf(cc.team)} and outworked every rookie in camp.`; },
        },
        {
          label: 'Call the guy with the app again', effect: '5M dirty, heat +30',
          apply: (cc) => { setFlag(cc, 'afterBan', 2); dirty(cc, 5); heatUp(cc, 30); return 'You called him back inside a week. He said he knew you would. Heat +30.'; },
        },
      ],
    });
  }

  /* ══ More standalone temptations, situational and repeatable ══ */
  if (c.draftPick <= 15 && c.seasons.length === 0) {
    deck.push({
      id: 'corr_combine_sample',
      title: 'The sample was not yours',
      body: 'A trainer admits, a year late, that the sample you gave at the combine was swapped for a clean one. Nobody knows. He wants ten percent of your rookie deal to keep it that way.',
      options: [
        { label: 'Pay him, quietly', effect: 'Lose 10 percent, heat +14',
          apply: (cc) => { heatUp(cc, 14); cc.salary = Math.round(cc.salary * 0.9 * 10) / 10; return 'You paid him ten percent to keep a year old secret. Heat +14.'; } },
        { label: 'Tell him to publish it', effect: 'Heat +6, fanbase -8, freedom',
          apply: (cc) => { heatUp(cc, 6); cc.fanbase = clamp(cc.fanbase - 8, 0, 100); setFlag(cc, 'combineOut', 1); return 'You called his bluff. The story ran for two days and then football started.'; } },
      ],
    });
  }

  if (c.ovr >= 82 && rng() < 0.55) {
    deck.push({
      id: 'corr_memorabilia',
      title: 'Signed by somebody',
      body: 'A memorabilia dealer wants 4,000 autographs in a weekend. Halfway through, your hand gives out and his assistant offers to finish them. Nobody would ever know.',
      options: [
        { label: 'Let the assistant sign', effect: '1.2M dirty, heat +10',
          apply: (cc) => { dirty(cc, 1.2); heatUp(cc, 10); return 'Roughly 1,800 of your autographs in the world were signed by a man named Devon. Heat +10.'; } },
        { label: 'Finish all 4,000 yourself', effect: '1M clean, health -3',
          apply: (cc) => { cc.earnings += 1; cc.health = clamp(cc.health - 3, 0, 100); return 'You signed every one of them. Your hand did not work right for a week and every signature is real.'; } },
      ],
    });
  }

  if (c.contractYears <= 1 && c.age >= 26) {
    deck.push({
      id: 'corr_cap_circumvention',
      title: 'The side letter',
      body: 'The team wants you under the cap on paper, so the owner offers a private side agreement: a no show job for a relative worth 2M a year. Completely illegal, entirely common.',
      options: [
        { label: 'Take the side deal', effect: '2M a year dirty, heat +16',
          apply: (cc) => { dirty(cc, 2); heatUp(cc, 16); cc.contractYears = 3; return 'Your uncle is now a paid consultant who has never consulted. Heat +16.'; } },
        { label: 'Everything on the real contract', effect: 'Lower number, zero risk',
          apply: (cc) => { cc.salary = Math.round(cc.salary * 1.05 * 10) / 10; cc.contractYears = 3; return 'You made them put every dollar on the actual contract. Slightly less money, zero people in a room deciding your future.'; } },
      ],
    });
  }

  if (c.fanbase >= 60 && (D(c).netWorth ?? 0) >= 3) {
    deck.push({
      id: 'corr_ponzi_pitch',
      title: 'The guy every athlete knows',
      body: 'A financial advisor who somehow represents nine guys in your locker room promises 30 percent returns, guaranteed, in writing. Guaranteed is not a word that exists in investing.',
      options: [
        { label: 'Put in 3M', effect: 'Probably gone',
          apply: (cc, r) => {
            if (r() < 0.2) { D(cc).netWorth = Math.round(((D(cc).netWorth ?? 0) + 4) * 10) / 10; return 'It actually paid out. You got out before it collapsed on everyone else, which is luck, not skill.'; }
            D(cc).netWorth = Math.round(((D(cc).netWorth ?? 0) - 3) * 10) / 10;
            cc.morale = clamp(cc.morale - 10, 0, 100);
            return 'It was a Ponzi. Three million gone, along with the savings of nine teammates who trusted him because you did.';
          } },
        { label: 'Ask for audited statements', effect: 'He disappears',
          apply: (cc) => { cc.morale = clamp(cc.morale + 5, 0, 100); return 'You asked for audited statements and he stopped returning calls within a week. That was the answer.'; } },
        { label: 'Warn the whole locker room', effect: 'Save everyone, make an enemy',
          apply: (cc) => { cc.morale = clamp(cc.morale + 10, 0, 100); cc.fanbase = clamp(cc.fanbase + 4, 0, 100); return 'You stood up in a team meeting and told everyone to pull their money. Two years later he was indicted.'; } },
      ],
    });
  }

  if (flag(c, 'tank') === 0 && c.seasons.length >= 4) {
    deck.push({
      id: 'corr_tank_talk',
      title: 'The quiet plan',
      body: 'Week 15, the season is dead, and a front office guy mentions that losing out means a better pick. He is not asking you to lose. He is telling you what losing is worth.',
      options: [
        { label: 'Play it out at 70 percent', effect: 'Heat +12, better team next year',
          apply: (cc) => { setFlag(cc, 'tank', 1); heatUp(cc, 12); cc.morale = clamp(cc.morale - 8, 0, 100); return 'You coasted through three meaningless games. The draft pick turned into a player who made you better. Heat +12.'; } },
        { label: 'Play every snap like it is January', effect: 'Morale +10, fanbase +8',
          apply: (cc) => { setFlag(cc, 'tank', -1); cc.morale = clamp(cc.morale + 10, 0, 100); cc.fanbase = clamp(cc.fanbase + 8, 0, 100); return 'You went full speed in a dead season and the tape from those three games is why your next contract exists.'; } },
      ],
    });
  }

  if ((D(c).dirtyMoney ?? 0) >= 1 && c.age >= 27) {
    deck.push({
      id: 'corr_irs_letter',
      title: 'A letter with a seal on it',
      body: 'The IRS wants to discuss three years of returns. Your accountant uses the phrase "worst case" for the first time out loud.',
      options: [
        { label: 'Fight it, 1.5M in lawyers', effect: 'Coin flip',
          apply: (cc, r) => {
            D(cc).netWorth = Math.round(((D(cc).netWorth ?? 0) - 1.5) * 10) / 10;
            if (r() < 0.5) { heatUp(cc, -20); return 'Your lawyers found a filing error on their side and the whole thing evaporated. Heat -20.'; }
            heatUp(cc, 18); cc.fanbase = clamp(cc.fanbase - 10, 0, 100);
            return 'You lost. Back taxes, penalties, and a story with your name and the word "evasion" in the same headline.';
          } },
        { label: 'Settle and pay everything', effect: 'Expensive, clean',
          apply: (cc) => {
            const owed = Math.round(((D(cc).dirtyMoney ?? 0) * 0.6 + 1) * 10) / 10;
            D(cc).netWorth = Math.round(((D(cc).netWorth ?? 0) - owed) * 10) / 10;
            D(cc).dirtyMoney = 0; heatUp(cc, -28);
            return `You settled for ${owed}M and stopped pretending. Heat -28 and a phone that stops buzzing.`;
          } },
      ],
    });
  }

  if (c.seasons.length >= 6 && flag(c, 'painkillers') === 0) {
    deck.push({
      id: 'corr_scripts',
      title: 'The Sunday routine',
      body: 'A team doctor has been writing you whatever gets you on the field, in quantities that are not on any chart. He says everyone at your position does it. He is mostly right, and that is the problem.',
      options: [
        { label: 'Keep the routine going', effect: 'Play through anything, health falls',
          apply: (cc) => { setFlag(cc, 'painkillers', 1); cc.health = clamp(cc.health - 12, 0, 100); cc.ovr = Math.min(99, cc.ovr + 1); heatUp(cc, 8); return 'You played seventeen games on a body that should have played nine. Rating +1, health -12.'; } },
        { label: 'Ask for a second opinion and taper off', effect: 'Miss games, protect the rest of your life',
          apply: (cc) => { setFlag(cc, 'painkillers', -1); cc.health = clamp(cc.health + 10, 0, 100); cc.morale = clamp(cc.morale + 8, 0, 100); return 'You got a real doctor, tapered off, and missed four games. Health +10 and a retirement you will actually be able to enjoy.'; } },
      ],
    });
  }

  if (c.rings >= 1 && rng() < 0.4) {
    deck.push({
      id: 'corr_ring_fakes',
      title: 'Your ring, on sale',
      body: 'Counterfeit versions of your championship ring are selling online. The manufacturer offers you a cut to look the other way and, worse, to authenticate them.',
      options: [
        { label: 'Take the cut, 900k', effect: '900k dirty, heat +12',
          apply: (cc) => { dirty(cc, 0.9); heatUp(cc, 12); return 'You authenticated fakes of your own ring. Nine hundred thousand and a small permanent wince. Heat +12.'; } },
        { label: 'Sue them into the ground', effect: 'Fanbase +6, costs 200k',
          apply: (cc) => { D(cc).netWorth = Math.round(((D(cc).netWorth ?? 0) - 0.2) * 10) / 10; cc.fanbase = clamp(cc.fanbase + 6, 0, 100); return 'You sued and won. The fakes vanished and the real one got a little more real.'; } },
      ],
    });
  }

  if ((D(c).heat ?? 0) >= 20 && c.age >= 24) {
    deck.push({
      id: 'corr_teammate_asks',
      title: 'He wants in',
      body: 'A teammate has clearly worked out what you are doing. He is not threatening you. He is asking to be included, which is somehow worse.',
      options: [
        { label: 'Bring him in', effect: 'Double the money, double the exposure',
          apply: (cc) => { dirty(cc, 1.8); heatUp(cc, 20); return 'Two of you now. The money doubled and so did the number of people who can end this. Heat +20.'; } },
        { label: 'Talk him out of it', effect: 'Heat -6, he owes you',
          apply: (cc) => { heatUp(cc, -6); cc.morale = clamp(cc.morale + 6, 0, 100); return 'You told him exactly how it ends and he listened. Years later he thanked you in a text at 2am.'; } },
        { label: 'Use it as your own exit', effect: 'Stop everything, heat -25',
          apply: (cc) => { heatUp(cc, -25); setFlag(cc, 'book', 7); cc.morale = clamp(cc.morale + 10, 0, 100); return 'Hearing him say it out loud made it real. You stopped everything that week. Heat -25.'; } },
      ],
    });
  }

  if (c.age >= 30 && (D(c).netWorth ?? 0) < 3 && c.earnings >= 25) {
    deck.push({
      id: 'corr_broke',
      title: 'Where did it go',
      body: `You have earned ${Math.round(c.earnings)}M in this league and your accountant says you are close to broke. Houses, relatives, an advisor, three businesses that never opened. It is the most common story in football.`,
      options: [
        { label: 'Sell everything and start over', effect: 'Recover cash, lose the lifestyle',
          apply: (cc) => { D(cc).netWorth = Math.round(((D(cc).netWorth ?? 0) + 4) * 10) / 10; cc.yearlyCosts = 0; cc.morale = clamp(cc.morale - 6, 0, 100); return 'You sold the cars, the second house and the restaurant. Four million back and a much quieter life.'; } },
        { label: 'Take the money that is being offered', effect: '5M dirty, heat +26',
          apply: (cc) => { dirty(cc, 5); heatUp(cc, 26); return 'You called the number you swore you would never call. Five million, and the meter went straight up. Heat +26.'; } },
        { label: 'Get a real financial team and grind it back', effect: 'Slow, boring, works',
          apply: (cc) => { cc.yearlyCosts = Math.round((cc.yearlyCosts ?? 0) * 0.5 * 100) / 100; cc.morale = clamp(cc.morale + 8, 0, 100); return 'Boring budget, real advisors, no more favours. It is not a story anyone tells, and it worked.'; } },
      ],
    });
  }

  if (c.seasons.length >= 8 && flag(c, 'legacyClean') === 0 && (D(c).heat ?? 0) <= 10) {
    deck.push({
      id: 'corr_clean_hands',
      title: 'They want you on the committee',
      body: 'The league wants you on its integrity committee, the one that talks to rookies about exactly the envelopes you were once handed.',
      options: [
        { label: 'Do it and tell them everything', effect: 'Fanbase +12, morale +10',
          apply: (cc) => { setFlag(cc, 'legacyClean', 1); cc.fanbase = clamp(cc.fanbase + 12, 0, 100); cc.morale = clamp(cc.morale + 10, 0, 100); return 'You sat in front of 300 rookies and told them what nearly happened to you. Some of them will remember it.'; } },
        { label: 'Decline, it feels like a lecture', effect: 'Morale +4',
          apply: (cc) => { setFlag(cc, 'legacyClean', 2); cc.morale = clamp(cc.morale + 4, 0, 100); return 'You passed. Being clean did not have to become a personality.'; } },
      ],
    });
  }

  if (c.mvps >= 1 && rng() < 0.35) {
    deck.push({
      id: 'corr_vote_lobby',
      title: 'The voters are people',
      body: 'A PR firm offers to run a campaign for you: gifts, dinners and access for the fifty people who vote on awards. Every word of it is legal and all of it is grim.',
      options: [
        { label: 'Run the campaign, 1.5M', effect: 'Better award odds, heat +8',
          apply: (cc) => { D(cc).netWorth = Math.round(((D(cc).netWorth ?? 0) - 1.5) * 10) / 10; heatUp(cc, 8); cc.fanbase = clamp(cc.fanbase + 5, 0, 100); setFlag(cc, 'lobby', 1); return 'You ran the campaign. Fifty voters had a lovely season and your name stayed in every conversation.'; } },
        { label: 'Let the tape argue', effect: 'Morale +8',
          apply: (cc) => { cc.morale = clamp(cc.morale + 8, 0, 100); return 'No campaign. You told them to watch the tape and went back to work.'; } },
      ],
    });
  }

  if ((D(c).heat ?? 0) >= 45 && c.contractYears <= 1) {
    deck.push({
      id: 'corr_team_knows',
      title: 'The general manager knows',
      body: 'He does not say the word. He says he has "concerns about off field exposure" and slides a contract across the table worth half your market value.',
      options: [
        { label: 'Sign it and stay quiet', effect: 'Half money, heat -10',
          apply: (cc) => { cc.salary = Math.round(cc.salary * 0.5 * 10) / 10; cc.contractYears = 3; heatUp(cc, -10); return 'You signed for half and neither of you ever said what it was about. Heat -10.'; } },
        { label: 'Walk and bet on yourself', effect: 'Free agency with a cloud over you',
          apply: (cc, r) => {
            const team = randomTeamAbbr(r);
            cc.team = team; cc.contractYears = 2; cc.fanbase = clamp(cc.fanbase - 5, 0, 100);
            return `You walked. Only one team called and ${teamLabelOf(team)} got you cheap, but you got to keep your name.`;
          } },
      ],
    });
  }

  return deck;
}
