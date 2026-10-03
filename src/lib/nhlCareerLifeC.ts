/*
   nhlCareerLifeC.ts, NHL My Career life deck C (Round 920)

   The owner, 2026-10-02: "way way way more things for my career type games".
   Decks A and B are 90 cards and only a handful ask which position you play,
   and a goalie's life is not a winger's. This deck is 36 more in what was
   thin: cards for the crease, the blue line, the middle and the wings, the
   rookie year, the last years, the press box and the fourth line, and the
   league's own roster rules told as stories.

   Same shape as the NBA deck C (nbaCareerLifeC.ts, Round 918), on purpose:

   1. It is a CATALOG. Every card is a definition with its own gate (when)
      and its own builder, so a card can be rebuilt from its id on any save,
      which is what the summer step list needs (a saved queue keeps ids, JSON
      drops the apply functions). getNhlLifeEventsC is the same self gating
      call the draw already makes for A and B, and it draws nothing from rng.

   2. The words are computed from the effect. An option is data (what moves
      and by how much); the chip the button shows and the line the player
      reads afterwards are both written from that data, and the line reports
      what really moved after the 0 to 100 clamps. scripts/simNhlCareer.mjs
      section C2 checks it from the outside anyway: 2,000 draws a card, the
      words parsed back and compared with the save.

   Speakers are roles (the coach, the goalie coach, your agent, the GM, a
   veteran) and nobody real is named or quoted. League rules, each read from
   two sources on 2026-10-02 and written without a number:
   - Before a club can send a player who is no longer exempt to the minors it
     has to put him on waivers, and any other club can claim him, contract
     and all. Young players are exempt for a while and go up and down freely.
     nhl.com/hurricanes/team/transaction-primer ; thehockeywriters.com/nhl-waiver-rules ; puckbeat.com/explained/waivers
   - A conditioning loan sends a player to the minors for game minutes
     without waivers. pensionplanpuppets.com/2021/2/16/22284010 ;
     mylittlefalls.com/ahl-off-season-primer-explaining-contracts-waivers-and-the-development-rule
   - Entry level contracts can carry performance bonuses tied to the season
     a young player has. dkpittsburghsports.com/2019/06/17/nhl-signing-performance-bonuses-faq-tlh ;
     nhl.com/flyers/news/transaction-analysis-explaining-bonk-s-entry-level-deal-345659582
   - An offer sheet: another club signs a restricted free agent, his own club
     can match it, and if it does not it gets draft picks back. Two famous
     ones landed in the summer of 2007, so both eras have them.
     nbcsports.com/nhl/news/pht-time-machine-when-rfa-offer-sheets-actually-happened ;
     dkpittsburghsports.com/2020/10/05/restricted-free-agent-rfa-nhl-offer-sheet-faq-tlh
   - A club trading a player can keep part of his salary, and the player is
     paid the same. New in the 2013 agreement.
     nbcsports.com/nhl/news/heres-the-deal-with-retaining-salary-in-trades ; thehockeywriters.com/nhl-retained-salary-trades
   - Three on three overtime (it had been four on four) and the coach's
     challenge (offside or goalie interference, only with the timeout still
     in hand) both began in 2015-16.
     nbcsports.com/nhl/news/its-official-3-on-3-ot-coachs-challenges-to-begin-next-season ;
     cbssports.com/nhl/news/report-3-on-3-overtime-coming-to-nhl-pending-board-approval ;
     insideedgehockeynews.com/nhl-rule-changes-for-2015-2016

   The era gates follow what the sources prove. The rules the sources date
   (overtime, the challenge, retained salary) wait for their season in a
   2006-07 career. The ones the sources describe only as the current
   agreement (waivers and the exemption, the conditioning loan, the entry
   level bonuses) wait for the 2013-14 season there, rather than claim a
   2006 detail nobody here read twice. c.year at draw time is the season
   ahead (nhlProgress adds the year before the draw).

   Nothing imported is touched at module scope (nhlMyCareer.ts imports this
   file): the catalog below is functions, and they run at draw time.
*/
import type { NhlCareerState, NhlCareerEvent } from './nhlMyCareer';
import { nhlTeamLabelOf, nhlEraById, nhlEraTeamIds } from './nhlMyCareer';

type Option = NhlCareerEvent['options'][number];

/** What an option moves. Money is in millions of modern dollars and is paid
 *  in the career's own era money. earned hits career earnings and net worth;
 *  netWorth is spending or a windfall and leaves earnings alone. */
export interface NhlLifeCFx {
  morale?: number;
  fanbase?: number;
  health?: number;
  rating?: number;
  netWorth?: number;
  earned?: number;
}

/** move: 'trade' is a trade, 'claim' is a waiver claim. Either way the
 *  contract goes with the player and only the team changes. */
interface Outcome { say: string | ((c: NhlCareerState) => string); fx: NhlLifeCFx; move?: 'trade' | 'claim' }
type Extra = { flag?: string };
type SureDef = { label: string } & Outcome & Extra;
type GambleDef = { label: string; p: number; win: Outcome; lose: Outcome } & Extra;
export type NhlLifeCOptionDef = SureDef | GambleDef;

export interface NhlLifeCDef {
  id: string;
  category: 'position' | 'rookie' | 'veteran' | 'bench' | 'rules';
  cooldown: number;
  story?: string;
  when: (c: NhlCareerState) => boolean;
  title: string | ((c: NhlCareerState) => string);
  body: string | ((c: NhlCareerState) => string);
  options: NhlLifeCOptionDef[];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round2 = (x: number) => Math.round(x * 100) / 100;
const flagOf = (c: NhlCareerState, k: string): number => (c.lifeFlags || {})[k] || 0;
const bump = (c: NhlCareerState, k: string) => { c.lifeFlags = { ...(c.lifeFlags || {}), [k]: flagOf(c, k) + 1 }; };
const isModern = (c: NhlCareerState): boolean => nhlEraById(c.eraId).id === 'now';
/** The rule exists in the season ahead: always in today's league, and from
 *  the given season on in a 2006-07 career. */
const ruleFrom = (year: number) => (c: NhlCareerState): boolean => isModern(c) || c.year >= year;
const yrsOf = (c: NhlCareerState): number => c.seasons.length;
const text = (t: string | ((c: NhlCareerState) => string), c: NhlCareerState): string => (typeof t === 'function' ? t(c) : t);
const signed = (n: number): string => (n > 0 ? `+${n}` : `${n}`);
const capital = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);
const team = (c: NhlCareerState): string => nhlTeamLabelOf(c.team, c.eraId);

/** Applies an effect to the career and returns the words for what really
 *  moved, after the clamps. A stat that could not move is not mentioned. */
export function applyNhlLifeCFx(c: NhlCareerState, fx: NhlLifeCFx): string {
  const parts: string[] = [];
  if (fx.rating) {
    const before = c.ovr;
    /* Growth stays inside the potential headroom, the same ceiling decks A
       and B use (pot + 1), and a raise can never lower a rating. The floor
       is deck A's 55. */
    const next = fx.rating > 0 ? Math.max(before, Math.min(c.pot + 1, before + fx.rating)) : before + fx.rating;
    c.ovr = clamp(next, Math.min(55, before), 99);
    if (c.ovr !== before) parts.push(`rating ${signed(c.ovr - before)} to ${c.ovr}`);
  }
  const meter = (key: 'morale' | 'fanbase' | 'health', d: number | undefined) => {
    if (!d) return;
    const before = c[key];
    c[key] = clamp(before + d, 0, 100);
    if (c[key] !== before) parts.push(`${key} ${signed(c[key] - before)}`);
  };
  meter('morale', fx.morale);
  meter('fanbase', fx.fanbase);
  meter('health', fx.health);
  const scale = nhlEraById(c.eraId).moneyScale;
  if (fx.earned) {
    const amt = round2(scale * fx.earned);
    c.earnings = round2(c.earnings + amt);
    c.netWorth = round2((c.netWorth ?? 0) + amt);
    if (amt) parts.push(`earned ${amt}M`);
  }
  if (fx.netWorth) {
    const amt = round2(scale * fx.netWorth);
    c.netWorth = round2((c.netWorth ?? 0) + amt);
    if (amt) parts.push(`net worth ${signed(amt)}M`);
  }
  return parts.length ? `${capital(parts.join(', '))}.` : '';
}

/** The short promise on the button, written from the same data. */
export function nhlLifeCChip(o: { fx: NhlLifeCFx; move?: 'trade' | 'claim' }): string {
  const bits: string[] = [];
  const dir = (name: string, d: number | undefined) => { if (d) bits.push(`${name} ${d > 0 ? 'up' : 'down'}`); };
  dir('rating', o.fx.rating);
  dir('morale', o.fx.morale);
  dir('fans', o.fx.fanbase);
  dir('health', o.fx.health);
  const cash = (o.fx.earned ?? 0) + (o.fx.netWorth ?? 0);
  if (cash) bits.push(cash > 0 ? 'money in' : 'money out');
  if (o.move) bits.push('new team');
  return bits.length ? bits.join(', ') : 'no change';
}

function settle(cc: NhlCareerState, r: () => number, o: Outcome): string {
  const story = text(o.say, cc);
  let moved = '';
  if (o.move) {
    /* A trade or a claim stays inside the career's own era, and the
       contract goes with the player: salary and years are not touched. */
    const pool = nhlEraTeamIds(cc.eraId).filter(id => id !== cc.team);
    const next = pool[Math.floor(r() * pool.length)];
    cc.team = next;
    moved = `${o.move === 'claim' ? 'Claimed by' : 'Traded to'} ${nhlTeamLabelOf(next, cc.eraId)}.`;
  }
  return [story, moved, applyNhlLifeCFx(cc, o.fx)].filter(Boolean).join(' ');
}

function toOption(o: NhlLifeCOptionDef): Option {
  if ('p' in o) {
    return {
      label: o.label,
      effect: `Could go either way: ${nhlLifeCChip(o.win)}, or ${nhlLifeCChip(o.lose)}`,
      apply: (cc, r) => {
        if (o.flag) bump(cc, o.flag);
        return settle(cc, r, r() < o.p ? o.win : o.lose);
      },
    };
  }
  return {
    label: o.label,
    effect: capital(nhlLifeCChip(o)),
    apply: (cc, r) => {
      if (o.flag) bump(cc, o.flag);
      return settle(cc, r, o);
    },
  };
}

/** One card, built for this career. Works on any save, eligible or not. */
export function buildNhlLifeCCard(def: NhlLifeCDef, c: NhlCareerState): NhlCareerEvent {
  return {
    id: def.id,
    category: def.category,
    cooldown: def.cooldown,
    ...(def.story ? { story: def.story } : {}),
    title: text(def.title, c),
    body: text(def.body, c),
    options: def.options.map(toOption),
  };
}

/* ============================== THE CATALOG ============================== */

const pos = (...ps: NhlCareerState['pos'][]) => (c: NhlCareerState): boolean => ps.includes(c.pos);
const isWing = pos('LW', 'RW');

export const NHL_LIFE_C: NhlLifeCDef[] = [
  /* --------------------------- 1. THE CREASE --------------------------- */
  {
    id: 'nhlC_g_tandem', category: 'position', cooldown: 3,
    when: c => pos('G')(c) && yrsOf(c) >= 2,
    title: 'It is a tandem now',
    body: 'The coach called it a tandem in the paper this morning, which is news to you. You and the other guy split the starts, whoever is hot plays, and nobody is the number one until somebody earns it.',
    options: [
      {
        label: 'Win the net back one start at a time', p: 0.55,
        win: { say: 'You stopped nearly everything for three weeks and the tandem talk quietly went away.', fx: { rating: 1, morale: 5 } },
        lose: { say: 'He was better in March, and the coach split it right down the middle into April.', fx: { morale: -5 } },
      },
      { label: 'Embrace the split and save your legs', say: 'Two nights on, one off. You felt better in April than you had in years, and a few fans wanted more of you.', fx: { health: 6, fanbase: -2 } },
      { label: 'Have your agent call the GM', say: 'The GM listened, said the word competition four times, and changed nothing.', fx: { morale: -2 } },
    ],
  },
  {
    id: 'nhlC_g_pulled', category: 'position', cooldown: 2,
    when: c => pos('G')(c) && yrsOf(c) >= 1,
    title: 'Pulled after three',
    body: 'Three goals on eight shots, the backup tapping your pads on his way past, and the long skate to the end of the bench with the whole building watching. The coach did not look at you.',
    options: [
      { label: 'Sit on the bench and watch every shift', say: 'You watched the rest of it with the mask on top of your head and saw exactly what you were doing wrong.', fx: { rating: 1, morale: -2 } },
      {
        label: 'Break a stick in the tunnel', p: 0.5,
        win: { say: 'The stick went in pieces, the clip went everywhere, and the room loved that you cared that much.', fx: { fanbase: 5, morale: 2 } },
        lose: { say: 'The clip went everywhere, and so did the question about whether you can handle a bad night.', fx: { fanbase: -3, morale: -4 } },
      },
      { label: 'Forget it before the bus leaves', say: 'You were laughing at a card game by the time the bus pulled out. Your next start was clean through two periods.', fx: { morale: 4 } },
    ],
  },
  {
    id: 'nhlC_g_depth', category: 'position', cooldown: 3,
    when: c => pos('G')(c) && yrsOf(c) >= 1 && c.age <= 31,
    title: 'The goalie coach wants you deeper',
    body: 'He says you are out too far, challenging shooters you could be letting come to you. He wants you back in the blue paint, on your edges, letting the angles do the work. It means unlearning the thing that got you here.',
    options: [
      {
        label: 'Rebuild it over the summer', p: 0.6,
        win: { say: 'By October you were quieter in the net and pucks were hitting you in the chest.', fx: { rating: 2, morale: 2 } },
        lose: { say: 'Half new and half old by camp, and you were a step behind on everything for a month.', fx: { rating: -1, morale: -4 } },
      },
      { label: 'Keep your style and tweak the edges', say: 'Two small changes instead of one big one. Nobody noticed, which was the point.', fx: { rating: 1 } },
      { label: 'Tell him it is working fine', say: 'He wrote something on his clipboard and you both know what it said. You slept fine.', fx: { morale: 3 } },
    ],
  },
  {
    id: 'nhlC_g_back_to_back', category: 'position', cooldown: 2,
    when: c => pos('G')(c) && c.role !== 'backup' && yrsOf(c) >= 2,
    title: 'Back to back, and it is your call',
    body: 'Saturday at home, Sunday on the road after a late flight. The backup usually takes the second night. The coach says it is your call this time, which is its own kind of test.',
    options: [
      { label: 'Play both nights', say: 'Sixty five saves across two nights, and you could not lift your arms on the plane home.', fx: { fanbase: 4, health: -5 } },
      { label: 'Give the backup his start', say: 'He stole a point on the road and you slept nine hours. The room liked how you handled it.', fx: { health: 4, morale: 2 } },
      {
        label: 'Play both and ask for a rest week later', p: 0.5,
        win: { say: 'Two wins, and the coach gave you the whole next week off like he promised.', fx: { fanbase: 4, health: 2 } },
        lose: { say: 'You let in a soft one late on Sunday and the rest week never came.', fx: { health: -4, morale: -3 } },
      },
    ],
  },

  /* -------------------------- 2. THE BLUE LINE -------------------------- */
  {
    id: 'nhlC_d_new_partner', category: 'position', cooldown: 3,
    when: c => pos('D')(c) && yrsOf(c) >= 1,
    title: 'A new partner on your pair',
    body: 'The coach broke up your pair. Your new partner is a left shot playing his off side, a step slower than you, and he talks the whole shift, which you are slowly learning is a good thing.',
    options: [
      { label: 'Cover for him until he settles', say: 'You took the hard minutes for a month, and by Christmas the pair was the steadiest thing on the team.', fx: { rating: 1, morale: 3, health: -2 } },
      { label: 'Ask the coach for your old partner', say: 'The coach heard you out and kept the new pair, and now he knows you asked.', fx: { morale: -3 } },
      { label: 'Take him to dinner and talk it out', say: 'Two hours and a deal about who goes back for pucks and who takes the man. It worked.', fx: { morale: 5 } },
    ],
  },
  {
    id: 'nhlC_d_shot_blocks', category: 'position', cooldown: 2,
    when: c => pos('D')(c) && yrsOf(c) >= 1,
    title: 'The shot blocking question',
    body: 'You led the team in blocked shots, and your feet, your shins and one hand have the bruises to prove it. The trainer wants you blocking smarter. The coach loves you blocking everything.',
    options: [
      { label: 'Block everything, it is the job', say: 'You ate pucks all winter and the coach said your name in every postgame.', fx: { fanbase: 4, morale: 3, health: -6 } },
      { label: 'Take away lanes instead of diving', say: 'Fewer highlight blocks and fewer ice bags. Your feet thanked you by March.', fx: { health: 5 } },
      { label: 'Buy better foot guards and keep going', say: 'Better guards, same job, a few less bruises, and a fan who sent you a thank you card.', fx: { health: 2, fanbase: 2, netWorth: -0.1 } },
    ],
  },
  {
    id: 'nhlC_d_pp_point', category: 'position', cooldown: 3,
    when: c => pos('D')(c) && yrsOf(c) >= 2 && c.ovr >= 78,
    title: 'The power play wants a quarterback',
    body: 'The first unit needs somebody at the top who can walk the line and find the seam. The other candidate shoots harder. You see the ice better. The coach is going to pick one of you this week.',
    options: [
      {
        label: 'Take it and run it your way', p: 0.55,
        win: { say: 'A pile of power play points and a unit that finally looked like it had a plan.', fx: { rating: 2, fanbase: 5 } },
        lose: { say: 'Two shorthanded goals against in one week, and the coach moved you to the second unit.', fx: { morale: -5, fanbase: -2 } },
      },
      { label: 'Share it with the other guy', say: 'You run it from the right side, he fires from the left. It works fine.', fx: { rating: 1, morale: 2 } },
      { label: 'Tell the coach you would rather kill penalties', say: 'He looked surprised and then pleased. You became the guy who blocks the shot that matters.', fx: { morale: 3, health: -2 } },
    ],
  },
  {
    id: 'nhlC_d_shutdown', category: 'position', cooldown: 3,
    when: c => pos('D')(c) && yrsOf(c) >= 3 && c.ovr >= 80,
    title: 'Every night against their best line',
    body: 'The coach wants you out against the other team\'s top line, every shift, home and away. No offense, a lot of defending, and very tired legs by March. It also means he trusts you more than anyone on the roster.',
    options: [
      { label: 'Take every matchup', say: 'You held some of the best lines in the league to nothing for a month. It never made a highlight show, and every scout noticed.', fx: { rating: 1, morale: 4, health: -4 } },
      { label: 'Ask for some offensive zone starts too', say: 'He gave you a few, you produced a little, and the shutdown job stayed yours.', fx: { fanbase: 3, morale: 2 } },
      { label: 'Tell him it is too much for your body', say: 'He split the job with another pair. You felt better and it stung a little.', fx: { health: 5, morale: -3 } },
    ],
  },

  /* --------------------------- 3. THE MIDDLE --------------------------- */
  {
    id: 'nhlC_c_faceoffs', category: 'position', cooldown: 2,
    when: c => pos('C')(c) && yrsOf(c) >= 1,
    title: 'You are losing too many draws',
    body: 'The faceoff numbers are on the whiteboard and yours is near the bottom. The coach wants a center who wins the puck, and every lost draw in your own end is a shift spent chasing.',
    options: [
      { label: 'Take a hundred draws a day after practice', say: 'Hands, timing, a little cheating on the drop. By spring you were winning more than you lost.', fx: { rating: 1, morale: 1 } },
      { label: 'Let a winger take the hard ones', say: 'Your winger took the defensive zone draws and you took the rest. Fine, not great, and nobody yelled.', fx: { morale: 2 } },
      {
        label: 'Cheat on every single drop', p: 0.5,
        win: { say: 'The linesmen gave up on throwing you out and you won the big ones.', fx: { fanbase: 4, morale: 3 } },
        lose: { say: 'Thrown out of the circle six times in one game, and the coach stopped sending you out there.', fx: { morale: -4, fanbase: -2 } },
      },
    ],
  },
  {
    id: 'nhlC_c_matchup', category: 'position', cooldown: 3,
    when: c => pos('C')(c) && yrsOf(c) >= 2 && c.ovr >= 76 && c.ovr <= 88,
    title: 'The coach wants a checking center',
    body: 'Third line, hard minutes, a defensive zone start almost every shift. He thinks you can be the guy who shuts down the other team\'s best center. Your agent thinks points pay better.',
    options: [
      { label: 'Take it and own it', say: 'You turned into the center other coaches hate playing against. The points dropped and the respect did not.', fx: { rating: 1, morale: 3, fanbase: -2 } },
      { label: 'Take it, and ask for some power play time too', say: 'You got a few minutes on the second unit and kept your touch around the net.', fx: { fanbase: 2, morale: 1 } },
      {
        label: 'Push for a top six job instead', p: 0.45,
        win: { say: 'You outplayed the guy ahead of you in camp and the job was yours.', fx: { fanbase: 5, morale: 4 } },
        lose: { say: 'He stayed ahead of you, and the coach gave the checking job to somebody else too.', fx: { morale: -6 } },
      },
    ],
  },
  {
    id: 'nhlC_c_wingers', category: 'position', cooldown: 2,
    when: c => pos('C')(c) && yrsOf(c) >= 1,
    title: 'New wingers every week',
    body: 'The coach is throwing line combinations into a blender. You have had nine different wingers since October, and you are the only one on the line who stays the same.',
    options: [
      { label: 'Learn every one of them', say: 'You figured out where each of them wants the puck. The coach noticed you made all of them better.', fx: { rating: 1, morale: 2 } },
      { label: 'Ask for two guys and to be left alone', say: 'He gave you the same two wingers for a month. The line clicked, and then he broke it up anyway.', fx: { morale: 3, fanbase: 2 } },
      { label: 'Stop passing and shoot more', say: 'More shots, more goals, fewer assists, and a winger who stopped talking to you.', fx: { fanbase: 4, morale: -2 } },
    ],
  },

  /* ---------------------------- 4. THE WINGS ---------------------------- */
  {
    id: 'nhlC_w_off_wing', category: 'position', cooldown: 3,
    when: c => isWing(c) && yrsOf(c) >= 1,
    title: 'Try your off wing',
    body: 'The coach wants you on the other side, shooting from the middle of the ice instead of off the boards. Your one timer is suddenly a real weapon, and your backhand along the wall is suddenly a problem.',
    options: [
      {
        label: 'Move over and learn it', p: 0.6,
        win: { say: 'By December you were scoring from the top of the circle like you had always been there.', fx: { rating: 2, fanbase: 3 } },
        lose: { say: 'You fumbled pucks on the wall for a month and got moved back.', fx: { morale: -4 } },
      },
      { label: 'Stay on your strong side', say: 'You told him you play better where you always have. He shrugged and kept you there.', fx: { morale: 2 } },
      { label: 'Switch on the power play only', say: 'Off wing on the power play, your usual side at even strength. A small change and a few more goals.', fx: { rating: 1, fanbase: 2 } },
    ],
  },
  {
    id: 'nhlC_w_net_front', category: 'position', cooldown: 3,
    when: c => isWing(c) && yrsOf(c) >= 1,
    title: 'Stand in front of the goalie',
    body: 'The power play needs a body at the top of the crease: screen the goalie, tip the point shots, take the cross check in the back. It is the least glamorous job on the unit, and it is open.',
    options: [
      { label: 'Take the job and the bruises', say: 'Tips, rebounds and ugly goals. Your back is a map of the league and you scored more than ever.', fx: { rating: 1, fanbase: 3, health: -5 } },
      { label: 'Pass, you are a shooter', say: 'You told the coach you are better on the half wall. Somebody else took the job and the cross checks.', fx: { morale: 2 } },
      {
        label: 'Do it until spring, then ask for the wall', p: 0.5,
        win: { say: 'Four months of dirty work, and the coach gave you the half wall for the playoff push like he said he would.', fx: { fanbase: 4, morale: 3 } },
        lose: { say: 'Four months of dirty work, and the coach forgot the promise.', fx: { health: -4, morale: -3 } },
      },
    ],
  },
  {
    id: 'nhlC_w_line_broken', category: 'position', cooldown: 2,
    when: c => isWing(c) && yrsOf(c) >= 2,
    title: 'They broke up your line',
    body: 'Your line was the best thing on the team for six weeks. Then a loss, then another, and the coach put everybody somewhere new. Your new center does not pass the way the old one did.',
    options: [
      { label: 'Say nothing and make it work', say: 'You found a way with the new guy. Not the same, but close.', fx: { rating: 1, morale: 2 } },
      {
        label: 'Ask the coach to put it back', p: 0.5,
        win: { say: 'He put it back together after a week and you scored in three straight.', fx: { fanbase: 4, morale: 4 } },
        lose: { say: 'He said the lines are his job, not yours.', fx: { morale: -4 } },
      },
      { label: 'Vent to your old center over dinner', say: 'Two hours of complaining over steaks. You both felt better and changed nothing.', fx: { morale: 3 } },
    ],
  },

  /* --------------------------- 5. THE ROOKIE --------------------------- */
  {
    id: 'nhlC_rookie_roommate', category: 'rookie', cooldown: 99,
    when: c => yrsOf(c) <= 2 && c.age <= 22,
    title: 'Your road roommate goes to bed at nine',
    body: 'The team rooms the young guys with veterans on the road. Yours is a defenseman in his fifteenth season who stretches for forty minutes before bed and wants the lights off at nine. He also knows everything.',
    options: [
      { label: 'Live on his schedule', say: 'Lights out at nine, breakfast at seven, and a lot of free advice over eggs. You played better for it.', fx: { rating: 1, health: 3, morale: -1 } },
      { label: 'Ask to room with the other young guys', say: 'Video games until two and a lot of laughing. Good for the room, rough on the legs.', fx: { morale: 5, health: -3 } },
      { label: 'Ask him to teach you the league', say: 'In every road city he walked you through who to watch and who to avoid. Half of it was gold.', fx: { rating: 1, morale: 3 } },
    ],
  },
  {
    id: 'nhlC_rookie_wall', category: 'rookie', cooldown: 99,
    when: c => yrsOf(c) <= 2 && c.age <= 22,
    title: 'The wall in February',
    body: 'Junior was a shorter season with a lot less travel. This is eighty two games plus the flights, and somewhere in February your legs stopped answering. The trainer says it happens to almost everybody the first time. That does not help.',
    options: [
      { label: 'Rest, eat, sleep, repeat', say: 'The team nutritionist basically moved into your kitchen for a month. By March you had your legs back.', fx: { health: 6, morale: 1 } },
      {
        label: 'Push through it', p: 0.4,
        win: { say: 'You pushed through it and came out the other side stronger.', fx: { rating: 1, morale: 3 } },
        lose: { say: 'You pushed and your legs pushed back. Two weeks out with a strained groin.', fx: { health: -7, morale: -2 } },
      },
      { label: 'Ask the veterans how they handled it', say: 'Every one of them had a story. Hearing them made the wall feel smaller.', fx: { morale: 4 } },
    ],
  },
  {
    id: 'nhlC_rookie_summer_home', category: 'rookie', cooldown: 99,
    when: c => yrsOf(c) === 1,
    title: 'Your first summer back home',
    body: 'You left as a kid with a duffel bag. Now there is a banner at the local rink, the mayor wants a photo, and everybody who ever drove you to a 6am practice would like a minute.',
    options: [
      { label: 'Say yes to everything', say: 'Ribbon cuttings, minor hockey camps, a parade nobody planned. The town loved it and you were tired.', fx: { fanbase: 6, health: -2 } },
      { label: 'Hide at the lake with your family', say: 'Three weeks, no phone, one dock and your parents. You came back rested.', fx: { health: 4, morale: 4 } },
      { label: 'Pay for a free camp for the kids', say: 'Two hundred kids, one sheet of ice, and you behind the bench. Best week of the summer.', fx: { fanbase: 4, morale: 3, netWorth: -0.05 } },
    ],
  },
  {
    id: 'nhlC_rookie_second_year', category: 'rookie', cooldown: 99,
    when: c => yrsOf(c) === 1,
    title: 'The second year question',
    body: 'One season in, and people are already warning you about a sophomore slump, which is a strange thing to be warned about. The coach wants more. Your agent wants you visible.',
    options: [
      {
        label: 'Spend the summer adding a new weapon', p: 0.6,
        win: { say: 'You came to camp with a new release on your shot, and the slump talk died in October.', fx: { rating: 2, fanbase: 3 } },
        lose: { say: 'You spent the summer on a new shot and lost a little of the old one.', fx: { rating: -1, morale: -3 } },
      },
      { label: 'Keep doing what worked', say: 'Same summer, same routine, same results. Nobody can complain about that.', fx: { morale: 3 } },
      { label: 'Do the media tour', say: 'Three podcasts, a magazine shoot and a truck commercial. The money was real.', fx: { earned: 0.15, fanbase: 4, health: -2 } },
    ],
  },

  /* -------------------------- 6. THE LAST YEARS -------------------------- */
  {
    id: 'nhlC_vet_minutes', category: 'veteran', cooldown: 3,
    when: c => c.age >= 32 && yrsOf(c) >= 8 && c.pos !== 'G',
    title: 'Your ice time is going down',
    body: 'Nobody said anything. The sheet just says fourteen minutes where it used to say nineteen. The coach is giving the young guys your shifts, and he is not wrong to.',
    options: [
      { label: 'Accept the role and be great in it', say: 'Fourteen good minutes instead of nineteen tired ones. Your body liked it.', fx: { health: 5, morale: 2 } },
      {
        label: 'Ask the coach for the minutes back', p: 0.4,
        win: { say: 'You outplayed the kid for two weeks and got your shifts back.', fx: { fanbase: 3, morale: 4 } },
        lose: { say: 'He said the decision was made, and now it is a thing between you two.', fx: { morale: -6 } },
      },
      { label: 'Have your agent look around', say: c => `He made a few calls. The market for a ${c.age} year old is quieter than it used to be.`, fx: { morale: -2 } },
    ],
  },
  {
    id: 'nhlC_vet_room_with_kid', category: 'veteran', cooldown: 99,
    when: c => c.age >= 31 && yrsOf(c) >= 8,
    title: 'They want you to room with the first rounder',
    body: 'The team\'s top pick is eighteen, has never paid a bill, and is rooming with you on the road. The GM asked you personally. He did not say babysit, but he meant it.',
    options: [
      { label: 'Teach him everything', say: 'Bedtime, film, meals, how to talk to reporters. By spring he was a pro and the GM thanked you twice.', fx: { morale: 5, fanbase: 2 } },
      { label: 'Let him figure it out', say: 'You were polite and kept your own schedule. He learned some things the hard way and you slept fine.', fx: { health: 3 } },
      { label: 'Take him to the best restaurant in every city', say: 'You picked up every check. He will tell that story at your retirement party.', fx: { morale: 4, netWorth: -0.08 } },
    ],
  },
  {
    id: 'nhlC_vet_pp_demoted', category: 'veteran', cooldown: 3,
    when: c => c.age >= 31 && c.ovr <= 84 && c.pos !== 'G',
    title: 'Off the first power play unit',
    body: 'The power play has a new look and you are not in it. A kid with a heavy one timer took your spot on the first unit, and you get whatever time the second unit gets.',
    options: [
      { label: 'Make the second unit dangerous', say: 'Thirty seconds at a time, you made it work, and the second unit outscored the first for a month.', fx: { fanbase: 2, morale: 2 } },
      { label: 'Put the extra work into the penalty kill', say: 'You became the penalty killer every team needs and stopped thinking about the power play.', fx: { rating: 1, health: -2 } },
      { label: 'Ask the coach for an honest talk', say: 'He explained it straight. You did not like it and you respected it.', fx: { morale: 3 } },
    ],
  },
  {
    id: 'nhlC_vet_morning_body', category: 'veteran', cooldown: 3,
    when: c => c.age >= 33,
    title: 'It takes an hour to get going',
    body: 'The first half hour of every morning is stretching, a hot shower and a lot of noises. The young guys laugh. The trainer has a plan if you want it.',
    options: [
      { label: 'Take the plan', say: 'Mobility work, cold tubs, less weight and more bands. You moved like a younger man by November.', fx: { health: 6, netWorth: -0.1 } },
      { label: 'Keep doing what you have always done', say: 'The old routine still mostly works. Your knees disagree.', fx: { health: -3, morale: 2 } },
      { label: 'Film the whole routine for the internet', say: 'A video of your morning got a million views and a sponsor. The young guys stopped laughing.', fx: { fanbase: 5, earned: 0.05 } },
    ],
  },

  /* ----------------------- 7. THE PRESS BOX AND THE FOURTH LINE ----------------------- */
  {
    id: 'nhlC_bench_press_box', category: 'bench', cooldown: 2, story: 'healthyScratch',
    when: c => c.role === 'backup' && c.pos !== 'G' && yrsOf(c) >= 1,
    title: 'Five straight games in the press box',
    body: 'Healthy scratch again. You watch from the press box with a sandwich and a notebook, next to the guys who are actually hurt. The coach has not explained it and you have not asked.',
    options: [
      { label: 'Skate with the extras every morning', say: 'Extra ice with the scratches every day. When your chance came, you were ready for it.', fx: { rating: 1, health: -2 } },
      { label: 'Ask the coach what it takes', say: 'He said compete level. You said fair. You still sat for another week, but you knew why.', fx: { morale: 2 } },
      {
        label: 'Tell a reporter you want to play', p: 0.4,
        win: { say: 'The quote got around, and a week later you were back in the lineup.', fx: { fanbase: 3, morale: 3 } },
        lose: { say: 'The quote got around, the coach read it, and you stayed in the press box.', fx: { morale: -6, fanbase: -2 } },
      },
    ],
  },
  {
    id: 'nhlC_bench_fourth_line', category: 'bench', cooldown: 2,
    when: c => c.role === 'backup' && c.pos !== 'G' && c.pos !== 'D' && yrsOf(c) >= 1,
    title: 'Seven minutes a night on the fourth line',
    body: 'The job is energy: hit, forecheck, get it deep, change. You can make a living doing this, and plenty of guys do. You were also hoping for more.',
    options: [
      { label: 'Be the best fourth liner in the league', say: 'Hits, blocks, one fight, and a crowd that started chanting your name.', fx: { fanbase: 5, health: -4 } },
      { label: 'Ask to learn the penalty kill', say: 'The coach put you on the second kill unit. More minutes and a reason to be on the ice late.', fx: { rating: 1, morale: 2 } },
      { label: 'Save your legs and wait for a chance', say: 'You saved your legs for a chance that did not come this year. It was a long winter.', fx: { morale: -3, health: 2 } },
    ],
  },
  {
    id: 'nhlC_bench_backup_goalie', category: 'bench', cooldown: 2,
    when: c => pos('G')(c) && c.role === 'backup' && yrsOf(c) >= 1,
    title: 'Three weeks without a start',
    body: 'The starter is hot and you are the backup. You take shots in practice, open the bench door, and wonder if you still remember how to read a real game. Then the coach says you have tomorrow night.',
    options: [
      { label: 'Treat every practice like a game', say: 'You were ready when it came, and you stopped all but two.', fx: { rating: 1, morale: 3 } },
      { label: 'Rest up and trust it', say: 'Fresh legs and a little rust. You won it in a shootout and nobody remembers the rust.', fx: { health: 3, morale: 1 } },
      {
        label: 'Ask the goalie coach for extra work', p: 0.6,
        win: { say: 'Extra work every day, and a shutout to show for it.', fx: { fanbase: 5, rating: 1 } },
        lose: { say: 'Extra work every day, and you were tired by the time the start came.', fx: { health: -3, morale: -2 } },
      },
    ],
  },
  {
    id: 'nhlC_bench_black_aces', category: 'bench', cooldown: 99,
    when: c => {
      const last = c.seasons[c.seasons.length - 1];
      return c.role === 'backup' && c.pos !== 'G' && !!last && last.teamResult !== 'Missed the playoffs' && last.teamResult !== 'SUSPENDED';
    },
    title: 'Practicing with the extras in the playoffs',
    body: 'The playoffs started and you were not in the lineup. You practiced with the extras, the guys brought up from the minors to stay ready, and you skated hard every morning in case somebody got hurt.',
    options: [
      { label: 'Skate like you are in the lineup', say: 'Every drill at game speed. Halfway through a series a winger got hurt and you were in.', fx: { rating: 1, health: -2, fanbase: 2 } },
      { label: 'Be the loudest guy in the room', say: 'You kept the room laughing through the tightest month of the year. The coach noticed.', fx: { morale: 4 } },
      { label: 'Ask why you are not in', say: 'The coach said he likes the lineup the way it is. You went back to the extras.', fx: { morale: -2 } },
    ],
  },

  /* ---------------------- 8. THE LEAGUE'S OWN RULES ---------------------- */
  {
    /* The current agreement: a young player is exempt from waivers for a
       while, so the club can send him down and bring him back freely. */
    id: 'nhlC_rule_ahl_assignment', category: 'rules', cooldown: 2, story: 'ahlAssignment',
    when: c => ruleFrom(2013)(c) && yrsOf(c) <= 2 && c.age <= 22 && c.ovr < 78,
    title: 'Sent down, no waivers needed',
    body: 'You are still young enough that the club can send you to the minors and bring you back without putting you on waivers, so nobody else gets a shot at you. They are using that now. Two weeks down, says the GM, and then we will see.',
    options: [
      {
        label: 'Go down and dominate', p: 0.6,
        win: { say: 'A point a game in the minors and a recall before the month was out.', fx: { rating: 2, fanbase: 3 } },
        lose: { say: 'You were good, not great, and two weeks turned into six.', fx: { morale: -5 } },
      },
      { label: 'Use the ice time to fix your skating', say: 'Twenty minutes a night and a skating coach every morning. You came back a step quicker.', fx: { rating: 1, morale: -1 } },
      { label: 'Have your agent call the GM', say: 'Your agent called. The GM said two weeks means two weeks, and now he knows you are counting.', fx: { morale: -3 } },
    ],
  },
  {
    /* Waivers are not a loan: any club can claim him, contract and all. */
    id: 'nhlC_rule_waiver_claim', category: 'rules', cooldown: 99, story: 'waivers',
    when: c => ruleFrom(2013)(c) && yrsOf(c) >= 3 && yrsOf(c) <= 9 && c.ovr <= 79,
    title: 'On waivers, and somebody might want you',
    body: 'You are past the point where they can just send you down, so to get you to the minors the club put you on waivers. For a day any team in the league can claim you, contract and all. Waivers are not a loan. If somebody claims you, you are theirs.',
    options: [
      {
        label: 'Pack a bag for the minors', p: 0.6,
        win: { say: 'Nobody put in a claim. You went down, played big minutes and came back up in a month.', fx: { rating: 1, morale: -2 } },
        lose: { say: 'A team put in a claim before the deadline. You packed for a different city instead.', fx: { morale: -2 }, move: 'claim' },
      },
      {
        label: 'Have your agent talk you up around the league', p: 0.5,
        win: { say: 'Your agent worked the phones, a team with a real job for you put in the claim, and you were gone by dinner.', fx: { morale: 5, fanbase: 2 }, move: 'claim' },
        lose: { say: 'Nobody bit. You cleared, went down, and your own club knows you were shopping yourself.', fx: { morale: -4 } },
      },
      {
        label: 'Turn the phone off and wait it out', p: 0.5,
        win: { say: 'The deadline passed, nobody claimed you, and the minors are a short drive from home.', fx: { morale: 2 } },
        lose: { say: 'Your phone was off for an hour. When you turned it on you belonged to another team.', fx: { morale: -5 }, move: 'claim' },
      },
    ],
  },
  {
    /* A conditioning loan goes to the minors without waivers. */
    id: 'nhlC_rule_conditioning_loan', category: 'rules', cooldown: 3,
    when: c => ruleFrom(2013)(c) && yrsOf(c) >= 4 && c.health <= 85,
    title: 'A conditioning stint in the minors',
    body: 'You are back from the injury but not back to game speed. The club wants to send you to its minor league team for a few games to get your legs under you. It is a conditioning loan, so there are no waivers and nobody else can grab you while you are there.',
    options: [
      { label: 'Go, play big minutes, come back sharp', say: 'A few games, twenty five minutes a night, a bus ride you will never forget. You came back ready.', fx: { health: 6, morale: -1 } },
      { label: 'Skip it and get your legs back in practice', say: 'You did it in practice instead. It took longer, and the first week back was rough.', fx: { health: 2, morale: 2 } },
      { label: 'Go, and sit with the kids on the bus', say: 'They asked a hundred questions and you answered all of them. The minor league coach sent a thank you note.', fx: { morale: 4, health: 3 } },
    ],
  },
  {
    /* Entry level contracts can carry performance bonuses. */
    id: 'nhlC_rule_entry_level_bonuses', category: 'rules', cooldown: 99, story: 'entryLevel',
    when: c => ruleFrom(2013)(c) && yrsOf(c) <= 2 && c.draftPick <= 40,
    title: 'The bonuses in your first contract',
    body: 'Your entry level deal has performance bonuses in it: goals, points, ice time, the awards. Your agent has the list on his fridge. The coach does not care about any of it and wants you to play the system.',
    options: [
      {
        label: 'Chase the numbers', p: 0.5,
        win: { say: 'You hit two of the bonus marks in the last week of the season. Your agent framed the check.', fx: { earned: 0.5, fanbase: 3 } },
        lose: { say: 'You cheated for offense all spring, missed the marks anyway, and the coach sat you for it.', fx: { morale: -5 } },
      },
      { label: 'Play the system and let them come', say: 'You played the way the coach wanted and hit one bonus mark without trying.', fx: { earned: 0.25, morale: 2 } },
      { label: 'Forget the list exists', say: 'You asked your agent to stop texting you about it. He did, mostly.', fx: { morale: 3 } },
    ],
  },
  {
    /* An offer sheet: another club signs a restricted free agent, his club
       can match it or take draft picks back. Both eras (2007). The card
       never signs anything: the contract is still settled in the free
       agency window that follows, so the words promise only the meters. */
    id: 'nhlC_rule_offer_sheet', category: 'rules', cooldown: 99, story: 'offerSheet',
    when: c => c.contractYears <= 0 && yrsOf(c) >= 3 && c.age <= 26 && c.ovr >= 78,
    title: 'Another club wants to send you an offer sheet',
    body: 'Your deal is up and you are a restricted free agent. Another club can sign you to an offer sheet, and then your club can match it and keep you, or let you go and take draft picks back. Your agent says one club is ready. He wants to know how you feel before he picks up the phone.',
    options: [
      {
        label: 'Tell him to take the call', p: 0.5,
        win: { say: 'Word got out, the fans started a campaign to keep you, and the GM called you himself.', fx: { fanbase: 5, morale: 3 } },
        lose: { say: 'Word got out, and the fans decided you wanted to leave. It was quiet when your name was read at the home opener.', fx: { fanbase: -5, morale: -2 } },
      },
      { label: 'Tell him you want to stay', say: 'Your agent let the other club know you are not interested. Your GM heard about it by lunch.', fx: { morale: 4, fanbase: 3 } },
      { label: 'Tell him to keep it quiet and listen', say: 'Nothing signed, nothing public, a lot of phone calls. Your agent loved every minute of it.', fx: { morale: 2 } },
    ],
  },
  {
    /* The C and the A. Reads deck A's letter flags: a captain never sees
       it, and a player who already wears an A is told so. */
    id: 'nhlC_rule_wear_the_a', category: 'rules', cooldown: 99, story: 'captaincy',
    when: c => yrsOf(c) >= 4 && c.ovr >= 78 && !flagOf(c, 'captain') && (flagOf(c, 'alternate') > 0 || yrsOf(c) >= 6),
    title: 'The captain is gone and the room is looking at you',
    body: c => `The captain was traded at the deadline. ${flagOf(c, 'alternate') > 0 ? 'You have worn an A on your sweater for a while now' : 'You are one of the oldest voices in the room'}, and the coach wants to know if you want the C, or if you would rather wear an A and let somebody else carry it.`,
    options: [
      { label: 'Take the C', flag: 'captain', say: 'Your name is the one they read after a loss now. The room is yours.', fx: { fanbase: 6, morale: 4, health: -2 } },
      { label: 'Wear the A', flag: 'alternate', say: 'You stayed an alternate and the C went to an older guy. Fewer microphones, same voice in the room.', fx: { morale: 3 } },
      { label: 'Tell them to wait a year', say: 'No captain for a season, just letters on a few shoulders, and a room that mostly ran itself.', fx: { morale: 2, fanbase: -2 } },
    ],
  },
  {
    /* Reads deck B's clause flags: a player who took the no move or the
       ten team list is told his clause decides it. A long serving star
       without one is asked as a courtesy, and the words say only that. */
    id: 'nhlC_rule_no_trade_list', category: 'rules', cooldown: 99, story: 'noTrade',
    when: c => (flagOf(c, 'noMove') > 0 || flagOf(c, 'tenTeamList') > 0 || (yrsOf(c) >= 8 && c.ovr >= 84)) && c.contractYears >= 1,
    title: 'A contender wants you, and the call is yours',
    body: c => `${flagOf(c, 'noMove') > 0 || flagOf(c, 'tenTeamList') > 0
      ? 'Your deal has trade protection in it, so nothing happens without your signature.'
      : 'You have been here long enough that the GM will not move you without asking first.'} He sat you down: a contender wants you, it is a real shot at a Cup, and your family would have to move by Thursday.`,
    options: [
      { label: 'Say yes and go', say: 'You signed off on it on a Tuesday and were on a plane by dinner.', fx: { morale: 2, fanbase: -2 }, move: 'trade' },
      { label: 'Say no and stay', say: 'You told the GM this is home. He nodded and called the contender back.', fx: { morale: 4, fanbase: 4 } },
      {
        label: 'Ask for a day with your family', p: 0.5,
        win: { say: 'A day at the kitchen table and a yes. The kids picked the new school.', fx: { morale: 5 }, move: 'trade' },
        lose: { say: 'A day at the kitchen table and a no. The GM said he understood.', fx: { morale: 2 } },
      },
    ],
  },
  {
    /* Three on three overtime, from 2015-16. */
    id: 'nhlC_rule_three_on_three', category: 'rules', cooldown: 3,
    when: c => ruleFrom(2015)(c) && c.pos !== 'G' && yrsOf(c) >= 1,
    title: 'Three on three in overtime',
    body: 'Overtime is three skaters a side, with acres of ice and nowhere to hide. The coach is picking his trios, and he wants to know if you want to be in the first one over the boards.',
    options: [
      {
        label: 'Put me out first', p: 0.55,
        win: { say: 'A handful of overtime winners by March and your name in every highlight package.', fx: { fanbase: 6, morale: 3 } },
        lose: { say: 'Two overtime goals against off your stick, and the coach went with somebody else after that.', fx: { morale: -4, fanbase: -2 } },
      },
      { label: 'Let the fast guys go first', say: 'You went out second, kept the puck, and let the speed guys finish it.', fx: { morale: 2 } },
      { label: 'Stay after practice to work on it', say: 'Half an hour of three on three after every practice. You got very good at keeping the puck.', fx: { rating: 1, health: -2 } },
    ],
  },
  {
    /* The coach's challenge, from 2015-16: offside or goalie interference,
       and only with the timeout still in hand. */
    id: 'nhlC_rule_coach_challenge', category: 'rules', cooldown: 3,
    when: c => ruleFrom(2015)(c) && c.pos !== 'G' && yrsOf(c) >= 1,
    title: 'Your goal is under review',
    body: 'You scored the biggest goal of the month and the other coach challenged it for offside. He could only ask because he still had his timeout. The whole building waits while the officials watch your skate on a replay.',
    options: [
      {
        label: 'Celebrate anyway', p: 0.5,
        win: { say: 'The goal stood. You had already celebrated, so you did it again.', fx: { fanbase: 5, morale: 3 } },
        lose: { say: 'Offside by an inch, and you had already done the whole celebration.', fx: { fanbase: -2, morale: -3 } },
      },
      { label: 'Skate to the bench and wait', say: 'You sat and waited like a pro. The goal stood and the building got twice as loud.', fx: { morale: 3, fanbase: 2 } },
      { label: 'Tell the linesman what you think', say: 'He did not agree with what you think, and the clip of you explaining it went around.', fx: { morale: -2, fanbase: 2 } },
    ],
  },
  {
    /* Retained salary in a trade, from the 2013 agreement: the old club
       keeps part of the salary and the player is paid the same. */
    id: 'nhlC_rule_retained_salary', category: 'rules', cooldown: 99, story: 'retainedTrade',
    when: c => ruleFrom(2013)(c) && yrsOf(c) >= 6 && c.age >= 29 && c.ovr >= 78 && c.contractYears >= 1,
    title: 'A trade where your old club keeps part of the money',
    body: 'Your club is out of the race and a contender wants you for the spring. The catch is the salary cap: they cannot fit all of your money. So your club would keep part of your salary and the new team would pay the rest. You get paid the same either way. The GM wants your blessing first.',
    options: [
      { label: 'Go, it is a shot at the Cup', say: 'Your old club kept part of your salary, the new one pays the rest, and you got a real chance in the spring.', fx: { morale: 5, fanbase: -2 }, move: 'trade' },
      {
        label: 'Ask to stay through the deadline', p: 0.5,
        win: { say: 'The GM kept you. The deadline came and went and the room was glad you stayed.', fx: { morale: 3, fanbase: 3 } },
        lose: { say: 'The GM made the trade anyway, part of your salary kept, the rest on the new team\'s books.', fx: { morale: -4 }, move: 'trade' },
      },
      { label: 'Tell your agent to find the best fit', say: 'Your agent picked the contender with the best shot and a real role waiting for you.', fx: { morale: 3 }, move: 'trade' },
    ],
  },

  /* END OF CATALOG */
];

/** The cards this career is eligible for right now. Draws nothing from rng:
 *  the gates are facts about the save, so adding this deck to the draw costs
 *  the stream exactly the one pick it always cost. */
export function getNhlLifeEventsC(c: NhlCareerState, _rng: () => number): NhlCareerEvent[] {
  return NHL_LIFE_C.filter(d => d.when(c)).map(d => buildNhlLifeCCard(d, c));
}
