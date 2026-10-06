/*
   mlbCareerLifeC.ts, MLB My Career life deck C (Round 919)

   The owner, 2026-10-02: "way way way more things for my career type games".
   Decks A and B are 90 cards and exactly one of them reads which of the
   eleven positions you play. Pitchers and hitters live different lives, so
   this deck is 36 more in what was thin: three cards for each of six
   position groups (the rotation, the bullpen, behind the plate, the
   infield, the outfield, the designated hitter), the rookie year, the last
   years, the bench, and baseball's own roster rules told as stories.

   Same shape as the NBA's deck C (nbaCareerLifeC.ts, Round 918), on purpose:

   1. It is a CATALOG. Every card is a definition with its own gate (when)
      and its own builder, so a card can be rebuilt from its id on any save,
      which is what the summer step list needs (a saved queue keeps ids, JSON
      drops the apply functions). getMlbLifeEventsC is the same self gating
      call the draw already makes for A and B, and it draws nothing from rng.

   2. The words are computed from the effect. An option is data (what moves
      and by how much); the chip the button shows and the line the player
      reads afterwards are both written from that data, and the line reports
      what really moved after the 0 to 100 clamps. scripts/simMlbCareer.mjs
      section C2 checks it from the outside anyway.

   Speakers are roles (the manager, the pitching coach, your agent, a
   veteran) and nobody real is named or quoted. League rules, each read from
   two sources on 2026-10-02 and written without a number unless the number
   is gated to the years it was true:
   - An optioned player stays on the 40 man roster and the club keeps him;
     once his option years are used up he cannot be sent down without first
     going through waivers. True in 2004 and now.
     baseballscouter.com/what-are-mlb-minor-league-options ;
     thecubreporter.com/book/export/html/3521
     An optioned player also has a minimum stay before he can be recalled
     (unless he replaces a player going on the injured list), and an option
     year is only used up by a long enough stay down in one season. The day
     counts are left out of the card on purpose, so no era has to be
     checked for them.
     mlb.com/glossary/transactions/minor-league-options ;
     baseballscouter.com/what-are-mlb-minor-league-options (both read
     2026-10-02, Round 919 review fix)
   - Salary arbitration: the panel picks the player's figure or the club's,
     never one in between. In place since the 1970s.
     mlb.com/glossary/transactions/salary-arbitration ;
     kollmanlaw.com/arbitration/the-uniqueness-of-baseball-arbitration
   - A Rule 5 pick has to stay on the big league roster all season or be
     offered back to his old club; a player on the 40 man is protected.
     mlb.com/glossary/transactions/rule-5-draft ;
     baseballamerica.com/stories/explaining-the-rule-5-draft
   - Holding a ready player in the minors for the first few weeks of his
     first season can push his free agency back a full year: a longstanding
     practice, true in 2004 and now (the card gives no day count).
     cbssports.com/mlb/news/mlb-service-time-manipulation-why-longstanding-baseball-practice-is-a-major-issue-in-2021 ;
     cronkitenews.azpbs.org/2021/05/17/service-time-manipulation-debate-rages-as-mlb-teams-hold-off-on-bringing-up-top-prospects
   - Rosters still expand in September (to 28 since 2020, up to 40 before),
     so the card says they expand and gives no size. The three batter
     minimum for pitchers began in 2020, so its card waits for 2020 in a
     2004 career.
     mlbtraderumors.com/2020/02/mlb-rule-changes-2020-season.html ;
     ballparkdigest.com/2020/02/13/2020-mlb-rule-changes-unveiled

   Nothing imported is touched at module scope (mlbMyCareer.ts imports this
   file): the catalog below is functions, and they run at draw time.
*/
import type { MlbCareerState, MlbCareerEvent, MlbCareerPos } from './mlbMyCareer';
import { mlbTeamLabelOf, mlbEraById, mlbEraTeamIds } from './mlbMyCareer';
import { applyDeckCFx, buildDeckCCard, deckCChip, dealDeckC } from './usCareerDeckC';
import type { DeckCDef, DeckCFx, DeckCOptionDef, DeckCSport } from './usCareerDeckC';

/* Round 988: the machinery (the clamps, the era money, the gamble, the
   trade, the flags, the words) is the shared engine in usCareerDeckC.ts.
   This file holds the cards and MLB's settings for that engine. */

/** What an option moves. earned hits career earnings and net worth;
 *  netWorth is spending or a windfall and leaves earnings alone. */
export type MlbLifeCFx = DeckCFx;
export type MlbLifeCOptionDef = DeckCOptionDef<MlbCareerState>;
export type MlbLifeCCategory = 'position' | 'rookie' | 'veteran' | 'bench' | 'rules';
export type MlbLifeCDef = DeckCDef<MlbCareerState, MlbLifeCCategory>;

/** MLB as the engine plays it: cents, the report line, and direction chips
 *  that read the save. Functions only, so nothing imported is read at
 *  module scope (mlbMyCareer.ts imports this file). */
const MLB_DECK_C: DeckCSport<MlbCareerState> = {
  moneyScale: c => mlbEraById(c.eraId).moneyScale,
  money: 'cents',
  log: 'report',
  chip: 'directions',
  chipReadsSave: true,
  teamIds: c => mlbEraTeamIds(c.eraId),
  teamLabel: (id, c) => mlbTeamLabelOf(id, c.eraId),
};

const yrsOf = (c: MlbCareerState): number => c.seasons.length;

/** Applies an effect to the career and returns the words for what really
 *  moved, after the clamps. A stat that could not move is not mentioned. */
export function applyMlbLifeCFx(c: MlbCareerState, fx: MlbLifeCFx): string {
  return applyDeckCFx(MLB_DECK_C, c, fx);
}

/** The short promise on the button, written from the same data. Given the
 *  save the card is shown on, it leaves out a stat that is already at its
 *  ceiling or floor, so "health up" is never shown to a player at 100. */
export function mlbLifeCChip(o: { fx: MlbLifeCFx; move?: 'trade' | 'claim' }, c?: MlbCareerState): string {
  return deckCChip(MLB_DECK_C, o, c);
}

/** One card, built for this career. Works on any save, eligible or not. */
export function buildMlbLifeCCard(def: MlbLifeCDef, c: MlbCareerState): MlbCareerEvent {
  return buildDeckCCard(MLB_DECK_C, def, c);
}

/* ============================== THE CATALOG ============================== */

const among = (...ps: MlbCareerPos[]) => (c: MlbCareerState): boolean => ps.includes(c.pos);
const isSp = among('SP');
const isRp = among('RP');
const isC = among('C');
const isIf = among('1B', '2B', '3B', 'SS');
const isOf = among('LF', 'CF', 'RF');
const isDh = among('DH');
const isHitter = (c: MlbCareerState): boolean => c.pos !== 'SP' && c.pos !== 'RP';
const onBench = (c: MlbCareerState): boolean => c.pos !== 'RP' && c.role === 'backup';
const team = (c: MlbCareerState): string => mlbTeamLabelOf(c.team, c.eraId);
const ifSpot = (c: MlbCareerState): string =>
  c.pos === 'SS' ? 'shortstop' : c.pos === '2B' ? 'second' : c.pos === '3B' ? 'third' : 'first';

export const MLB_LIFE_C: MlbLifeCDef[] = [
  /* ------------------------ 1. THE ROTATION: SP ------------------------ */
  {
    id: 'mlbC_sp_third_time', category: 'position', cooldown: 3,
    when: c => isSp(c) && yrsOf(c) >= 1,
    title: 'Third time through the order',
    body: 'The numbers say hitters see you better the third time up, so the manager has started walking out in the sixth with the game in your hands. The pitching coach wants you to make that walk harder for him.',
    options: [
      {
        label: 'Add a pitch you only show the third time', p: 0.55,
        win: { say: 'You saved a slow curve for the sixth inning all year, and the hook started coming in the seventh.', fx: { rating: 2, morale: 5 } },
        lose: { say: 'The new pitch hung on three different nights, and the manager started walking out in the fifth.', fx: { rating: -1, morale: -5 } },
      },
      { label: 'Hand him the ball and say nothing', say: 'Five good innings and a handshake, every fifth day. The bullpen got the wins and your arm got the rest.', fx: { health: 6, morale: -2 } },
      { label: 'Tell him you want the seventh', say: 'You said it in his office with the door closed. He liked that you asked and kept the hook right where it was.', fx: { morale: 3, fanbase: 2 } },
    ],
  },
  {
    id: 'mlbC_sp_rain_delay', category: 'position', cooldown: 3,
    when: c => isSp(c) && yrsOf(c) >= 1,
    title: 'Ninety minutes of rain',
    body: 'Four shutout innings, then the tarp. The clouds are not moving and the trainer is watching your arm cool down in a hoodie in the tunnel.',
    options: [
      { label: 'Go back out when it stops', p: 0.5,
        win: { say: 'You threw in the batting cage the whole delay to stay loose and finished the seventh with the shutout alive.', fx: { fanbase: 5, morale: 6 } },
        lose: { say: 'Your arm never really came back that night, and it stayed tight for a week after.', fx: { health: -8, morale: -3 } },
      },
      { label: 'Let the bullpen have it', say: 'You kept the four zeros and a fresh arm. The win went to a reliever and you were fine with that.', fx: { health: 4 } },
      { label: 'Ask for the start pushed to tomorrow', say: 'The manager shuffled the whole rotation for you and a couple of starters noticed.', fx: { health: 6, morale: -3 } },
    ],
  },
  {
    id: 'mlbC_sp_new_pitch', category: 'position', cooldown: 3,
    when: c => isSp(c) && yrsOf(c) >= 2,
    title: 'The fourth pitch',
    body: 'Three pitches got you here. The pitching coach thinks a fourth gets you through a lineup three times, and he wants to spend all of spring training building it.',
    options: [
      { label: 'Build it all spring', p: 0.6,
        win: { say: 'By April it was real, and hitters had one more thing to sit on and miss.', fx: { rating: 3, morale: 3 } },
        lose: { say: 'It never came, and the hours you spent on it cost your slider some bite.', fx: { rating: -1, morale: -4 } },
      },
      { label: 'Sharpen the three you have', say: 'Same three pitches, better commanded. Nobody wrote about it and the walks went down.', fx: { rating: 1, health: 2 } },
      { label: 'Keep it in the bullpen sessions only', say: 'You threw it in side work all year and never once in a game. It is there if you ever need it.', fx: { morale: 2 } },
    ],
  },

  /* ------------------------ 2. THE BULLPEN: RP ------------------------ */
  {
    id: 'mlbC_rp_three_batter', category: 'position', cooldown: 99,
    /* The three batter minimum began in 2020 (sources in the header). c.year
       is the season ahead, so a 2004 career meets it from the 2020 season on. */
    when: c => isRp(c) && yrsOf(c) >= 1 && c.year >= 2020,
    title: 'Three batters, minimum',
    body: 'The rule says a pitcher who comes in has to face at least three hitters or finish the inning. One tough out and a walk back to the dugout is not a job anymore, and the manager wants to know if you can get the other two.',
    options: [
      { label: 'Build a pitch for the other side of the plate', p: 0.6,
        win: { say: 'It took a spring, and then you could get anyone in the box. Your innings went up.', fx: { rating: 2, morale: 4 } },
        lose: { say: 'The new pitch kept leaking over the middle, and the manager started waiting for the clean inning to use you.', fx: { morale: -5 } },
      },
      { label: 'Ask for the clean inning only', say: 'You told him you are best starting an inning, and he mostly found you one.', fx: { morale: 3, health: 2 } },
      { label: 'Take every assignment he gives you', say: 'Messy innings, lefties, righties, whatever came. You wore it and so did your arm.', fx: { fanbase: 3, health: -4, rating: 1 } },
    ],
  },
  {
    id: 'mlbC_rp_third_day', category: 'position', cooldown: 3,
    when: c => isRp(c) && yrsOf(c) >= 1,
    title: 'Third day in a row',
    body: 'You pitched Friday and Saturday. It is Sunday, it is tied in the eighth, and the pitching coach walks down the bench to ask how the arm feels before he asks anyone else.',
    options: [
      { label: 'Tell him you are good to go', p: 0.55,
        win: { say: 'Three days, three clean innings, and a bullpen that knew who wanted the ball.', fx: { fanbase: 4, morale: 6 } },
        lose: { say: 'The fastball was two ticks short and so was the lead. Then the arm needed a week.', fx: { health: -7, morale: -4 } },
      },
      { label: 'Tell him the truth: it is tired', say: 'He said thank you and meant it. Someone else got the eighth and you got the day.', fx: { health: 5, morale: 1 } },
      { label: 'Volunteer to get the last out of the inning', say: 'One out, one groundball, back to the bench. He remembered it in September.', fx: { morale: 3, health: -2 } },
    ],
  },
  {
    id: 'mlbC_rp_ninth_open', category: 'position', cooldown: 3,
    when: c => isRp(c) && yrsOf(c) >= 2 && c.ovr >= 72,
    title: 'The ninth is open',
    body: 'The closer is hurt for at least a month. The manager says it is a committee, which everyone in the bullpen knows means an audition.',
    options: [
      { label: 'Ask for the ninth to his face', p: 0.5,
        win: { say: 'He gave you the ball, and you went eleven for eleven in saves while the closer was out.', fx: { fanbase: 7, morale: 6, rating: 1 } },
        lose: { say: 'Two blown saves in the first week, and the committee went on without you.', fx: { morale: -7, fanbase: -2 } },
      },
      { label: 'Keep pitching the seventh like it is the ninth', say: 'You did not ask and you did not change a thing. The seventh stayed yours and so did the trust.', fx: { morale: 2, rating: 1 } },
      { label: 'Tell the beat writers you want it', say: 'It made the paper, the manager read it, and the city started asking for you.', fx: { fanbase: 5, morale: -2 } },
    ],
  },

  /* --------------------- 3. BEHIND THE PLATE: C --------------------- */
  {
    id: 'mlbC_c_calling_game', category: 'position', cooldown: 3,
    when: c => isC(c) && yrsOf(c) >= 1,
    title: 'Who calls the pitches',
    body: 'The bench has been signaling every pitch to you from the dugout since you got here. The pitching coach says it is time you called your own game, and half the staff is not sure they want that.',
    options: [
      { label: 'Call every pitch yourself', p: 0.55,
        win: { say: 'You learned the staff like a language, and by August the starters were asking for you by name.', fx: { rating: 2, morale: 5 } },
        lose: { say: 'Two starters shook you off all night and one of them said so on the bench. It got fixed, slowly.', fx: { morale: -6 } },
      },
      { label: 'Call it with the ace, take the signs with the rest', say: 'The best arm on the staff trusts you and the others got time to.', fx: { rating: 1, morale: 2 } },
      { label: 'Keep taking the signs from the dugout', say: 'Less on your plate and more time for the swing. The bench kept the game plan.', fx: { health: 2, morale: -1 } },
    ],
  },
  {
    id: 'mlbC_c_foul_tips', category: 'position', cooldown: 3,
    when: c => isC(c) && yrsOf(c) >= 2,
    title: 'Foul tips and knees',
    body: 'Two foul tips off the mask this week and your knees sound like a staircase. The trainer wants you out of the lineup for the day game after the night game, every time.',
    options: [
      { label: 'Take every day game off', say: 'The backup caught every getaway day and you caught everything else with fresher legs.', fx: { health: 8, morale: -2 } },
      { label: 'Catch them all anyway', p: 0.45,
        win: { say: 'You caught 140 games and the pitchers loved you for never leaving.', fx: { fanbase: 5, morale: 4, health: -4 } },
        lose: { say: 'The knee gave out in August and you watched the race from a stool in the training room.', fx: { health: -12, morale: -5 } },
      },
      { label: 'Play first base on the day games', say: 'You found a glove that fit and a way to stay in the lineup without the gear on.', fx: { health: 4, morale: 2 } },
    ],
  },
  {
    id: 'mlbC_c_personal_catcher', category: 'position', cooldown: 3,
    when: c => isC(c) && yrsOf(c) >= 1 && c.ovr >= 70,
    title: 'The ace wants his own catcher',
    body: 'The best starter on the staff told the manager he throws better to the backup. So now you sit every fifth day, and everyone in the room knows exactly why.',
    options: [
      { label: 'Go to the ace and fix it yourself', p: 0.5,
        win: { say: 'One long dinner and a lot of video later, he asked for you in his next start.', fx: { morale: 7, rating: 1 } },
        lose: { say: 'He listened politely and kept throwing to the backup all year.', fx: { morale: -5 } },
      },
      { label: 'Take the day and use it', say: 'Every fifth day became your cage day and your legs thanked you for it.', fx: { health: 5, rating: 1 } },
      { label: 'Complain to the manager', say: 'He told you it was not personal, which made it feel more personal.', fx: { morale: -3, fanbase: 2 } },
    ],
  },

  /* ------------------- 4. THE INFIELD: 1B, 2B, 3B, SS ------------------- */
  {
    id: 'mlbC_if_move_over', category: 'position', cooldown: 99,
    when: c => isIf(c) && yrsOf(c) >= 2,
    title: c => (c.pos === '1B' ? 'They want you somewhere else' : 'They want you to slide over'),
    body: c => (c.pos === '1B'
      ? 'The club signed another first baseman and the manager asked if you still own a glove for third. You have not taken a ground ball there since college.'
      : `The club signed a glove man for ${ifSpot(c)}, and the manager asked if you would take ground balls somewhere new this spring. Nobody calls it a demotion out loud.`),
    options: [
      { label: 'Learn the new spot all spring', p: 0.6,
        win: { say: 'By April you looked like you had played there your whole life, and the lineup had room for both of you.', fx: { rating: 1, morale: 5 } },
        lose: { say: 'The angles never felt right and the errors showed up in the box score.', fx: { morale: -6, fanbase: -2 } },
      },
      { label: 'Tell them you are staying put', say: 'You won the job back in spring the hard way, and the new guy went to the bench.', fx: { morale: 4, health: -2 } },
      { label: 'Ask your agent to call around', say: 'Your agent made a few calls and the club heard about every one of them.', fx: { morale: -3, fanbase: 1 } },
    ],
  },
  {
    id: 'mlbC_if_error_week', category: 'position', cooldown: 3,
    when: c => isIf(c) && yrsOf(c) >= 1,
    title: 'Three errors in a week',
    body: 'Routine plays. A short hop, a throw that sailed, a ball right through the legs on national television. The crowd groans before the ball even gets to you now.',
    options: [
      { label: 'Two hundred ground balls a day', say: 'Early work every single afternoon until your hands stopped thinking.', fx: { rating: 1, health: -2, morale: 2 } },
      { label: 'Sit with the mental skills coach', p: 0.6,
        win: { say: 'It was never your hands. It was your head, and once you knew that it went away.', fx: { morale: 6, rating: 1 } },
        lose: { say: 'You talked for a week and fumbled two more in the next homestand.', fx: { morale: -4, fanbase: -2 } },
      },
      { label: 'Laugh it off in the papers', say: 'You made fun of yourself before anyone else could. The city decided it liked you.', fx: { fanbase: 4, morale: 1 } },
    ],
  },
  {
    id: 'mlbC_if_new_partner', category: 'position', cooldown: 3,
    when: c => isIf(c) && yrsOf(c) >= 1,
    title: 'A new man next to you',
    body: c => `The club traded for a new infielder and he plays right beside you at ${team(c)}. Double plays, cutoffs, who takes the throw: none of it is written down and all of it has to be learned by April.`,
    options: [
      { label: 'Take him to every early workout', say: 'A month of early work together and by Opening Day you could turn two blind.', fx: { rating: 1, morale: 3, health: -1 } },
      { label: 'Let the coaches sort it out', say: 'It came together by June, after a few balls dropped between you.', fx: { morale: -1 } },
      { label: 'Take him to dinner on every road trip', say: 'You learned how he thinks before you learned how he throws. It worked anyway.', fx: { morale: 4, netWorth: -0.02 } },
    ],
  },

  /* --------------------- 5. THE OUTFIELD: LF, CF, RF --------------------- */
  {
    id: 'mlbC_of_wall', category: 'position', cooldown: 3,
    when: c => isOf(c) && yrsOf(c) >= 1,
    title: 'The wall in the ninth',
    body: 'Two outs, tying run on first, and a ball hit to the deepest part of the park. You have the angle. You also know exactly where the padding stops.',
    options: [
      { label: 'Go up the wall for it', p: 0.5,
        win: { say: 'You came down with it and the replay ran for a week.', fx: { fanbase: 8, morale: 6, health: -3 } },
        lose: { say: 'You caught it and the wall caught your shoulder. Ten days on the shelf for the best play of your life.', fx: { fanbase: 6, health: -10 } },
      },
      { label: 'Play it off the wall and hold him to second', say: 'Smart, safe, and the closer got the next out anyway.', fx: { morale: 1 } },
      { label: 'Dive short of the track', p: 0.4,
        win: { say: 'A full extension catch two steps before the dirt. Nobody even had time to worry.', fx: { fanbase: 6, morale: 5 } },
        lose: { say: 'It skipped past you to the wall, the tying run scored, and the inning kept going.', fx: { morale: -6, fanbase: -3 } },
      },
    ],
  },
  {
    id: 'mlbC_of_center', category: 'position', cooldown: 99,
    when: c => isOf(c) && yrsOf(c) >= 2,
    title: c => (c.pos === 'CF' ? 'They want you in a corner' : 'They want you in center'),
    body: c => (c.pos === 'CF'
      ? 'The club found a younger, faster center fielder and the manager wants you in a corner where your legs can last. He says it is about August. You hear it as being about your age.'
      : 'The center fielder is hurt and the manager wants to see if you can cover the middle of the field. More ground, more running, and the whole outfield takes its cue from you.'),
    options: [
      { label: 'Say yes and own it', p: 0.55,
        win: { say: 'You took the new spot and made it yours. The coaches stopped talking about the move by May.', fx: { rating: 1, morale: 4, fanbase: 3 } },
        lose: { say: 'The reads came a step late all year and the scouts noticed.', fx: { morale: -5, health: -2 } },
      },
      { label: 'Ask to stay where you are', say: 'He kept you there for now and you know he is still thinking about it.', fx: { morale: 2 } },
      { label: 'Work on your first step all winter', say: 'A winter of sprint work and a step quicker in March, wherever they put you.', fx: { health: -2, rating: 1, morale: 2 } },
    ],
  },
  {
    id: 'mlbC_of_bleachers', category: 'position', cooldown: 3,
    when: c => isOf(c) && yrsOf(c) >= 1,
    title: 'The bleachers know your name',
    body: 'The fans behind you in the outfield have a chant for you, a sign for you, and a running bit about your batting average. It has been going since April.',
    options: [
      { label: 'Toss them a ball every inning', say: 'You became their favorite, and the chant turned friendly by the end of May.', fx: { fanbase: 7, morale: 3 } },
      { label: 'Buy the section pizza for a month', say: 'Pizza for the whole section every home game in August. The section put your number on a bedsheet.', fx: { fanbase: 8, netWorth: -0.03 } },
      { label: 'Tune it all out', say: 'Earbuds in during batting practice and eyes on the hitter after that. It stopped mattering.', fx: { morale: 2, rating: 1 } },
    ],
  },

  /* ---------------------- 6. THE DESIGNATED HITTER ---------------------- */
  {
    id: 'mlbC_dh_glove', category: 'position', cooldown: 3,
    when: c => isDh(c) && yrsOf(c) >= 1,
    title: 'You want a glove back',
    body: 'Four at bats a night and the rest of the game on the bench with a jacket on. You want to play the field again. The manager thinks your legs are worth more resting.',
    options: [
      { label: 'Ask for a few games at first base', p: 0.55,
        win: { say: 'You got your weekly start at first base, and the bat got hotter when you were in the game.', fx: { morale: 6, rating: 1 } },
        lose: { say: 'You played first twice, pulled a hamstring stretching for a throw, and went back to the bench.', fx: { health: -7, morale: -3 } },
      },
      { label: 'Embrace the bat-only life', say: 'You stopped fighting it and made hitting the whole job. It shows.', fx: { rating: 1, morale: 2 } },
      { label: 'Take infield every day anyway', say: 'You stayed sharp with the glove just in case. No one asked, and you were ready.', fx: { health: -2, morale: 3 } },
    ],
  },
  {
    id: 'mlbC_dh_between', category: 'position', cooldown: 3,
    when: c => isDh(c) && yrsOf(c) >= 1,
    title: 'Forty minutes between at bats',
    body: 'A designated hitter has a whole inning or two to fill between trips to the plate. Some guys watch video, some ride the bike, and some go cold sitting on the bench.',
    options: [
      { label: 'The video room, every inning', say: 'You watched every pitch the man on the mound threw and walked up knowing what was coming.', fx: { rating: 2, morale: -1 } },
      { label: 'The bike and the cage, every inning', say: 'Legs warm, hands warm, and you never went up stiff again.', fx: { health: 4, rating: 1 } },
      { label: 'Sit on the bench and talk hitting', say: 'You became the dugout hitting coach, and the young guys started hitting better too.', fx: { morale: 5, fanbase: 2 } },
    ],
  },
  {
    id: 'mlbC_dh_platoon', category: 'position', cooldown: 3,
    when: c => isDh(c) && yrsOf(c) >= 2,
    title: 'They want a platoon',
    body: 'The front office wants a right handed bat to take the at bats against lefties. Your numbers against left handed pitching say they have a point. Your agent says it will cost you money down the line.',
    options: [
      { label: 'Fight for every at bat', p: 0.5,
        win: { say: 'You hit lefties all spring and the platoon idea went away.', fx: { rating: 2, morale: 4 } },
        lose: { say: 'Lefties ate you up in April and the platoon came anyway.', fx: { morale: -6, fanbase: -2 } },
      },
      { label: 'Accept it and mash righties', say: 'Fewer at bats and better ones. Your numbers looked great.', fx: { rating: 1, health: 3 } },
      { label: 'Spend the winter with a lefty batting practice pitcher', say: 'A thousand swings off left handers in a cold gym. You came back ready.', fx: { rating: 1, netWorth: -0.04, morale: 2 } },
    ],
  },

  /* ------------------------- 7. THE ROOKIE YEAR ------------------------- */
  {
    id: 'mlbC_rookie_book', category: 'rookie', cooldown: 99,
    when: c => yrsOf(c) >= 1 && yrsOf(c) <= 2,
    title: 'The league has a book on you now',
    body: c => (isHitter(c)
      ? 'One season and every advance scout in the league knows you chase the high fastball. Pitchers have started living up there.'
      : 'One season and every hitter in the league knows what you throw when you are behind in the count. They have started sitting on it.'),
    options: [
      { label: 'Rebuild the weakness all winter', p: 0.6,
        win: { say: 'You came back in spring with the hole filled, and the book had to be rewritten.', fx: { rating: 2, morale: 4 } },
        lose: { say: 'You fixed that one and opened another. The scouts found it by May.', fx: { rating: -1, morale: -4 } },
      },
      { label: 'Get even better at what you already do', say: 'You leaned into your strength and made them pay when they missed.', fx: { rating: 1, morale: 2 } },
      { label: 'Ask a veteran to read the book for you', say: 'He spent an hour going through your film and told you three things nobody else would.', fx: { rating: 1, morale: 3 } },
    ],
  },
  {
    id: 'mlbC_rookie_per_diem', category: 'rookie', cooldown: 99,
    when: c => yrsOf(c) === 1,
    title: 'Big league money, for the first time',
    body: 'The checks are bigger than anything you have seen and your phone has 40 new numbers in it. Every one of them has an idea for your money.',
    options: [
      { label: 'Save almost all of it', say: 'You lived like you were still in Triple A and the account grew quietly.', fx: { netWorth: 0.05, morale: -1 } },
      { label: 'Buy your parents something big', say: 'You paid off a house you grew up in. Nothing else this year felt as good.', fx: { netWorth: -0.15, morale: 8 } },
      { label: 'Pick up the tab for the whole bullpen, all year', say: 'Every road dinner, every round. The room had your back by July.', fx: { netWorth: -0.06, morale: 5, fanbase: 1 } },
    ],
  },
  {
    id: 'mlbC_rookie_home', category: 'rookie', cooldown: 99,
    when: c => yrsOf(c) === 1,
    title: 'Home for the winter, a big leaguer',
    body: 'Your hometown wants you at everything: the high school banquet, the little league opener, the local news, a parade nobody asked you about. Your old coach has already told everyone you will be there.',
    options: [
      { label: 'Say yes to all of it', say: 'You shook every hand in town and signed every glove. The whole county follows you now.', fx: { fanbase: 7, morale: 3, health: -2 } },
      { label: 'Do the little league and nothing else', say: 'One morning with the kids, one photo in the paper, and the rest of the winter was yours.', fx: { fanbase: 3, morale: 4 } },
      { label: 'Stay in your team\'s city and train', say: 'You skipped the hometown tour and spent the winter in the weight room. Some people back home took it personally.', fx: { rating: 1, fanbase: -2 } },
    ],
  },
  {
    id: 'mlbC_rookie_sophomore', category: 'rookie', cooldown: 99,
    when: c => yrsOf(c) === 1,
    title: 'The second year',
    body: 'Everyone has a name for the year after your first. The expectations go up, the city knows your face, and your bad weeks get headlines now.',
    options: [
      { label: 'Change nothing that worked', p: 0.5,
        win: { say: 'You trusted the routine and the numbers came back on their own by June.', fx: { morale: 5, rating: 1 } },
        lose: { say: 'They adjusted and you did not, and the slump lasted most of the first half.', fx: { morale: -6, fanbase: -3 } },
      },
      { label: 'Spend the winter on video with the coaches', say: 'You saw exactly how they would attack you and walked into spring with an answer.', fx: { rating: 2, health: -1 } },
      { label: 'Take the winter off to rest', say: 'A real offseason for the first time. You showed up fresh and a little rusty.', fx: { health: 7, rating: -1 } },
    ],
  },

  /* ------------------------- 8. THE LAST YEARS ------------------------- */
  {
    id: 'mlbC_vet_spring_schedule', category: 'veteran', cooldown: 2,
    when: c => c.age >= 33,
    title: 'A veteran spring',
    body: 'The manager offered you the veteran schedule: fewer bus trips, more side work, and a short spring. Some of the kids are watching to see if you take it.',
    options: [
      { label: 'Take the short spring', say: 'You skipped the long bus rides and saved your legs for April.', fx: { health: 6, morale: 2 } },
      { label: 'Ride every bus like a rookie', say: 'You played every spring game you could. The kids noticed and so did your back.', fx: { morale: 4, fanbase: 2, health: -4 } },
      { label: 'Spend spring coaching the young players', say: 'You ran half the drills. The front office started talking about a coaching job someday.', fx: { morale: 5, rating: -1 } },
    ],
  },
  {
    id: 'mlbC_vet_tick_lost', category: 'veteran', cooldown: 3,
    when: c => c.age >= 32 && yrsOf(c) >= 6,
    title: c => (isHitter(c) ? 'The bat is a tick late' : 'The fastball lost a tick'),
    body: c => (isHitter(c)
      ? 'The fastballs you used to hit are getting in on your hands. The hitting coach wants you to start your swing earlier and cheat a little on velocity.'
      : 'The radar gun says you lost a couple miles an hour. The pitching coach wants you to stop trying to throw through people and start pitching around them.'),
    options: [
      { label: 'Reinvent the way you play', p: 0.6,
        win: { say: 'You found a new way to win at the plate or on the mound, and you might have bought yourself two more years.', fx: { rating: 2, morale: 5 } },
        lose: { say: 'The new approach never felt natural and the numbers slid.', fx: { rating: -2, morale: -4 } },
      },
      { label: 'Train harder than ever', say: 'A brutal winter in the weight room and a little of it came back.', fx: { rating: 1, health: -4 } },
      { label: 'Accept it and play smarter', say: 'Less power, more brains. You stayed useful and stopped fighting age.', fx: { morale: 3, health: 3 } },
    ],
  },
  {
    id: 'mlbC_vet_kids_ask', category: 'veteran', cooldown: 3,
    when: c => c.age >= 31 && yrsOf(c) >= 7,
    title: 'The young guys come to you',
    body: 'Three rookies sat at your locker after the game asking about everything from the slider to their first contract. The manager says the room listens to you more than to him.',
    options: [
      { label: 'Teach them everything you know', say: 'You spent half your afternoons with the kids. They got better and you felt it.', fx: { morale: 6, fanbase: 2, health: -1 } },
      { label: 'Teach them, but guard your own time', say: 'A few minutes here and there, and your own work stayed first.', fx: { morale: 3, rating: 1 } },
      { label: 'Tell them to ask the coaches', say: 'You kept your focus. The room noticed you did not want the job.', fx: { morale: -2, rating: 1 } },
    ],
  },
  {
    id: 'mlbC_vet_maintenance', category: 'veteran', cooldown: 2,
    when: c => c.age >= 34,
    title: 'Two hours before you can play',
    body: 'Stretching, the hot tub, the cold tub, massage, the bands. It now takes two hours before batting practice just to feel normal.',
    options: [
      { label: 'Do the whole routine, every day', say: 'Every single day, no shortcuts. Your body held up all season.', fx: { health: 8, morale: -2 } },
      { label: 'Hire a full time trainer', say: 'A trainer who travels with you and knows your body better than you do.', fx: { health: 10, netWorth: -0.3 } },
      { label: 'Skip it when you feel good', p: 0.5,
        win: { say: 'You skipped it on good days and nothing went wrong.', fx: { morale: 4 } },
        lose: { say: 'You skipped it once and your hamstring paid for it for a month.', fx: { health: -9, morale: -3 } },
      },
    ],
  },

  /* ---------------------------- 9. THE BENCH ---------------------------- */
  {
    id: 'mlbC_bench_cold', category: 'bench', cooldown: 2,
    when: c => onBench(c) && yrsOf(c) >= 1,
    title: c => (isSp(c) ? 'Long relief, on no notice' : 'Cold off the bench in the ninth'),
    body: c => (isSp(c)
      ? 'The starter got knocked out in the second inning and the bullpen phone is for you. You have not pitched in nine days and you need to be ready in four minutes.'
      : 'You have not seen a pitch in five days. Now it is the ninth, the tying run is on second, and the manager just said your name.'),
    options: [
      { label: c => (isSp(c) ? 'Throw strikes from the first pitch' : 'Go up looking for one pitch'), p: 0.4,
        win: { say: c => (isSp(c) ? 'Five innings of relief that nobody will remember except the manager.' : 'You got the pitch and you did not miss it. The dugout came over the rail.'), fx: { fanbase: 6, morale: 8 } },
        lose: { say: 'It did not go your way, and you went back to the end of the bench.', fx: { morale: -4 } },
      },
      { label: 'Ask for a set routine to stay ready', say: 'The coaches gave you a pregame plan, and you were never cold again.', fx: { rating: 1, morale: 2 } },
      { label: c => (isSp(c) ? 'Ask for more work in the bullpen' : 'Ask for more work in the cage'), say: 'Extra work every day so the big moments felt normal.', fx: { rating: 1, health: -2 } },
    ],
  },
  {
    id: 'mlbC_bench_utility', category: 'bench', cooldown: 99,
    when: c => onBench(c) && yrsOf(c) >= 1,
    title: c => (isSp(c) ? 'The swingman job' : 'Learn another position'),
    body: c => (isSp(c)
      ? 'The manager says the fastest way back into the rotation is to be the guy who can start one day and close out a game the next. It is a strange job and it is a real one.'
      : 'The bench coach says the man who can play three positions gets three times the chances. He wants you taking ground balls and fly balls everywhere this spring.'),
    options: [
      { label: 'Say yes to everything', say: c => (isSp(c) ? 'You started some, finished some, and got into more games than anyone expected.' : 'You learned the new spots and got into more games than anyone expected.'), fx: { rating: 1, morale: 4, health: -2 } },
      { label: c => (isSp(c) ? 'Wait for a spot in the rotation' : 'Stay focused on your own spot'), say: 'You stayed sharp at what you do and waited for the door to open.', fx: { morale: 1 } },
      { label: c => (isSp(c) ? 'Learn to warm up fast' : 'Pick one new spot and learn it well'), say: c => (isSp(c) ? 'You learned to get loose in ten pitches, and the manager started calling your name in the late innings.' : 'One more glove in the bag and a real case to be in the lineup more.'), fx: { rating: 1, morale: 2 } },
    ],
  },
  {
    id: 'mlbC_bench_out_of_options', category: 'bench', cooldown: 99, story: 'options',
    /* Options are used up after a player's first few seasons; the card never
       says how many (sources in the header). */
    when: c => onBench(c) && yrsOf(c) >= 4 && yrsOf(c) <= 8,
    title: 'Out of options',
    body: 'Your option years are all used up. The club cannot send you to Triple A anymore without putting you on waivers first, where any team can claim you. The manager says your roster spot gets talked about every week.',
    options: [
      { label: 'Ask them to trade you before waivers', say: 'The front office found a deal in a week and you started over somewhere new.', fx: { morale: 3 }, move: 'trade' },
      { label: 'Make the roster spot impossible to cut', p: 0.5,
        win: { say: 'You made yourself the most useful man on the bench, and nobody brought up your spot again.', fx: { rating: 1, morale: 5 } },
        lose: { say: 'You pressed every time they used you and it showed. The weekly meeting kept talking about you.', fx: { morale: -6 } },
      },
      { label: 'Keep your head down', say: 'You said nothing and stayed ready, and the meeting found someone else to talk about.', fx: { morale: -1, health: 2 } },
    ],
  },

  /* ------------------------ 10. THE ROSTER RULES ------------------------ */
  {
    id: 'mlbC_rule_optioned', category: 'rules', cooldown: 2, story: 'options',
    when: c => yrsOf(c) >= 1 && yrsOf(c) <= 3 && c.ovr < 80,
    title: 'Optioned is not traded',
    body: 'They sent you to Triple A in May and you did not know what it meant. Your agent explains: you stay on the 40 man roster and the club still owns you. There is a minimum stay down there before they can call you back, unless somebody up top gets hurt, and a long enough stay this season uses up one of your option years.',
    options: [
      { label: 'Play angry in Triple A', p: 0.6,
        win: { say: c => (isHitter(c) ? 'You hit everything in the minors and they called you back in a month.' : 'You struck out everybody in the minors and they called you back in a month.'), fx: { rating: 2, morale: 3 } },
        lose: { say: 'You pressed in Triple A and stayed there longer than you wanted.', fx: { morale: -6 } },
      },
      { label: 'Ask the club what they want you to fix', say: 'They gave you one clear thing to work on, and you went and fixed it.', fx: { rating: 1, morale: 4 } },
      { label: 'Use the time to get healthy', say: 'You treated the time down there as a reset, and your body thanked you.', fx: { health: 7, morale: 1 } },
    ],
  },
  {
    id: 'mlbC_rule_september', category: 'rules', cooldown: 2, story: 'septemberCallup',
    /* Rosters expand in September in 2004 and now; the size changed in 2020,
       so the card never gives one (sources in the header). */
    when: c => yrsOf(c) >= 1 && yrsOf(c) <= 4,
    title: 'September brings company',
    body: c => `Rosters expanded in September and ${team(c)} called up a kid from Triple A who plays your position. He is 22, he is fast, and the front office wants to see him play.`,
    options: [
      { label: 'Show him around and help him', say: 'You took him to dinner and told him where everything was. He got better and you looked like a leader.', fx: { morale: 4, fanbase: 2 } },
      { label: c => (isHitter(c) ? 'Make sure he does not take your at bats' : 'Make sure he does not take your innings'), p: 0.55,
        win: { say: 'You played the best month of your season and the kid sat and watched.', fx: { rating: 1, morale: 4 } },
        lose: { say: 'You pressed and slumped, and the kid got more starts than you did in the last two weeks.', fx: { morale: -6 } },
      },
      { label: 'Ignore him completely', say: 'You did your thing. He did his. Nobody had a story to write.', fx: { morale: 1 } },
    ],
  },
  {
    id: 'mlbC_rule_arbitration', category: 'rules', cooldown: 1, story: 'arbitration',
    /* Final offer arbitration: the panel picks one figure or the other, in
       2004 and now (sources in the header). Gated to the winters after the
       third, fourth and fifth seasons while the player is still on the six
       years of control the career starts on (contractYears 6, one off per
       season), the same three winters as the inbox's arbitration beat. A
       player who signed a longer deal (deck B's extensions add years) has
       more years left than that clock and no salary to argue about. Three
       real winters, so the tag is a yearly cooldown, not once a career. */
    when: c => yrsOf(c) >= 3 && yrsOf(c) <= 5 && c.contractYears >= 1 && c.contractYears <= 6 - yrsOf(c),
    title: 'Your number or theirs',
    body: 'You and the club are apart on next year\'s salary. You file a number, they file a number, and if nobody budges a panel picks one of the two. Not in between. In the hearing the club has to argue that you are not as good as you think.',
    options: [
      { label: 'Go to the hearing', p: 0.5,
        win: { say: 'The panel picked your number. The difference is yours this season, and the room was still awkward.', fx: { earned: 1.2, morale: 3 } },
        lose: { say: 'The panel picked their number, after an hour of hearing what you cannot do.', fx: { morale: -7 } },
      },
      { label: 'Settle in the middle the night before', say: 'You split the difference over the phone and nobody had to say anything mean.', fx: { earned: 0.6, morale: 3 } },
      { label: 'Take their number and move on', say: 'You signed their figure and told your agent to save the fight for free agency.', fx: { morale: -2, fanbase: 2 } },
    ],
  },
  {
    id: 'mlbC_rule_service_time', category: 'rules', cooldown: 99,
    when: c => yrsOf(c) === 1,
    title: 'The weeks they kept you down',
    body: 'You were ready on Opening Day and the club kept you in Triple A for the first few weeks anyway. Your agent says the timing was not about your swing: a few weeks down there can keep a player under club control for an extra season.',
    options: [
      { label: 'Tell the papers what happened', say: 'You said it out loud and the fans took your side. The front office did not love it.', fx: { fanbase: 5, morale: -2 } },
      { label: 'Let your agent handle it quietly', say: 'Your agent remembered, and so will you when the time comes to talk money.', fx: { morale: 2 } },
      { label: c => (isHitter(c) ? 'Use the anger in the batting cage' : 'Use the anger in the bullpen sessions'), say: 'You played like somebody owed you something. Somebody did.', fx: { rating: 1, morale: -1 } },
    ],
  },
  {
    id: 'mlbC_rule_innings_limit', category: 'rules', cooldown: 99, story: 'inningsLimit',
    when: c => isSp(c) && yrsOf(c) <= 5 && c.age <= 27,
    title: 'Shut down in September',
    body: 'The club set an innings limit for your arm before the season started. You hit it with three weeks left and the team is in the race. The pitching coach says the plan is the plan.',
    options: [
      { label: 'Accept the shutdown', say: 'You watched September from the dugout in a jacket, and your arm was fresh in spring.', fx: { health: 10, morale: -5 } },
      { label: 'Ask to keep pitching', p: 0.45,
        win: { say: 'They let you take two more starts, and you won both.', fx: { fanbase: 6, morale: 6, health: -4 } },
        lose: { say: 'They let you take two more starts and your elbow was sore for the whole winter.', fx: { health: -12, morale: -3 } },
      },
      { label: 'Ask to work out of the bullpen instead', say: 'A few short innings in big spots. The arm handled it and the team got some help.', fx: { morale: 3, health: -2, fanbase: 2 } },
    ],
  },
  {
    id: 'mlbC_rule_bullpen_phone', category: 'rules', cooldown: 3,
    when: c => isRp(c) && yrsOf(c) >= 1,
    title: 'The bullpen phone',
    body: 'Three times tonight the phone rang, three times you got loose, and three times you sat back down. That is a lot of pitches thrown for a game you never pitched in.',
    options: [
      { label: 'Ask the pitching coach for a rule on it', say: 'One warm up per night unless you go in. He wrote it down and mostly stuck to it.', fx: { health: 5, morale: 2 } },
      { label: 'Say nothing, be ready every time', say: 'You got loose every time they asked. The coaches trusted you more and your arm felt it.', fx: { morale: 3, health: -4 } },
      { label: 'Complain to the other relievers', say: 'Everyone agreed with you and nothing changed.', fx: { morale: -2 } },
    ],
  },
  {
    id: 'mlbC_rule_rule_five', category: 'rules', cooldown: 99,
    /* A Rule 5 pick has to stay on the big league roster all season or be
       offered back (sources in the header). */
    when: c => isHitter(c) && yrsOf(c) >= 2 && yrsOf(c) <= 6 && c.ovr < 82,
    title: 'The Rule 5 kid',
    body: 'The club picked a young player from another team\'s system in the Rule 5 draft. He has to stay on the big league roster all season or be offered back, so he is going to get playing time, and some of it is coming from you.',
    options: [
      { label: 'Make him earn every at bat', p: 0.55,
        win: { say: 'You played well enough that the kid hardly saw the field.', fx: { rating: 1, morale: 4 } },
        lose: { say: 'He got hot in April and took a few of your starts every week.', fx: { morale: -6 } },
      },
      { label: 'Help him get through it', say: 'You showed him how to sit on a big league bench and stay ready. The coaches noticed.', fx: { morale: 3, fanbase: 1 } },
      { label: 'Tell the manager you are not happy', say: 'He said he heard you. The kid still got his at bats.', fx: { morale: -3 } },
    ],
  },
  /* END OF CATALOG */
];

/** The cards this career is eligible for right now. Draws nothing from rng:
 *  the gates are facts about the save, so adding this deck to the draw costs
 *  the stream exactly the one pick it always cost. */
export function getMlbLifeEventsC(c: MlbCareerState, _rng: () => number): MlbCareerEvent[] {
  return dealDeckC(MLB_DECK_C, MLB_LIFE_C, c);
}
