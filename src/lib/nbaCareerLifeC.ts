/*
   nbaCareerLifeC.ts, NBA My Career life deck C (Round 918)

   The owner, 2026-10-02: "way way way more things for my career type games".
   Decks A and B are 90 cards and not one of them asks which position you
   play. This deck is 36 more in what was thin: three cards for each of the
   five positions, the rookie year, the last years, the second unit, and the
   league's own roster rules told as stories.

   Two things are different from A and B, both on purpose.

   1. It is a CATALOG. Every card is a definition with its own gate (when)
      and its own builder, so a card can be rebuilt from its id on any save,
      which is what the summer step list needs (a saved queue keeps ids, JSON
      drops the apply functions). getNbaLifeEventsC is the same self gating
      call the draw already makes for A and B, and it draws nothing from rng.

   2. The words are computed from the effect. An option is data (what moves
      and by how much); the chip the button shows and the line the player
      reads afterwards are both written from that data on this save, so the
      chip leaves out a stat already at its limit and the line reports what
      really moved after the 0 to 100 clamps. scripts/simNbaCareer.mjs
      section C2 checks it from the outside anyway: 2,000 draws a card, half
      on the fleet's own saves, the words parsed back and compared with them.

   Speakers are roles (the coach, your agent, a veteran) and nobody real is
   named or quoted. League rules, each read from two sources on 2026-10-02
   and written without a number:
   - The two way contract began with the 2017 offseason, and a two way
     player does not take a standard roster spot.
     gleague.nba.com/faq ; hoopsrumors.com/2017/04/hoops-rumors-glossary-two-way-contracts.html
   - The development league itself played from 2001-02 (gleague.nba.com/faq,
     re-read 2026-10-02), so it existed in 2003-04. What did not was a team
     sending its own young player down: assignment began with the 2005-06
     season, and the league took its current name in 2017-18. So the
     assignment card is gated to the modern era, and to a player's first
     three seasons (the assignment rule: three years of service or less).
     nba.com/suns/news/d_league_050919.html ; gleague.nba.com/faq ; gleague.nba.com/2005-06-nba-assignments
     When it began it covered only a player's first two seasons, which a
     2003-04 career has already played by 2005-06, so deck A's send down
     card is modern only too (both read 2026-10-02):
     oursportscentral.com/services/releases/thunderbirds-announce-nba-affiliations/n-3224930
     (2005-09-19, "during their first two NBA seasons") ;
     deseret.com/2007/7/12/20029195/flash-will-be-affiliated-with-jazz
     (2007-07-12, "in their first or second NBA seasons").
   - A team over the cap has to send out salary close to what it takes back,
     in 2003-04 as now, and a traded player keeps his contract.
     blazersedge.com/2025/1/15/24344488 ; nationalbasketballnews.com/how-nba-trades-work-salary-matching-trade-exceptions-and-draft-picks
     For 2003-04: blogmaverick.com/2004/07/12/some-nba-rules/ (2004-07-12,
     read 2026-10-02: over the cap, the salaries traded must be within 15
     percent plus 100k of each other) ; cbafaq.com/salarycap99.htm (the 1999
     agreement, read on the first pass; a re-read failed on an expired
     certificate). The card states the rule without the number.
   - Since 2023-24 a healthy star is expected to play the national TV games,
     a star being an All-Star or All-NBA pick in the past three seasons, and
     the big awards ask for a minimum number of games. Modern era only.
     nba.com/news/adam-silver-load-management-bog-news-conference-2023 ; espn.com/nba/story/_/id/38386013
   - The All-Star reserves are picked by the league's head coaches, in both
     eras. Now: nba.com/news/2025-nba-all-star-game-reserves ;
     pr.nba.com/2021-nba-all-star-game-reserves. Then (read 2026-10-02):
     cbsnews.com/news/all-star-reserves-announced (2001, reserves picked in
     a vote by coaches) ; espn.com/nba/news/2002/0129/1319553.html (2002-01-29,
     read 2026-10-02: "Reserves were selected in a vote by NBA coaches").
     insidehoops.com/all-star-reserves-2004.shtml was seen through a search
     summary only and is not counted.

   Nothing imported is touched at module scope (nbaMyCareer.ts imports this
   file): the catalog below is functions, and they run at draw time.
*/
import type { NbaCareerState, NbaCareerEvent } from './nbaMyCareer';
import { nbaTeamLabelOf, nbaEraById, nbaEraTeamIds } from './nbaMyCareer';
import { applyDeckCFx, buildDeckCCard, deckCChip, dealDeckC } from './usCareerDeckC';
import type { DeckCDef, DeckCFx, DeckCOptionDef, DeckCSport } from './usCareerDeckC';

/* Round 988: the machinery (the clamps, the era money, the gamble, the
   trade, the words) is the shared engine in usCareerDeckC.ts. This file
   holds the cards and the NBA's settings for that engine. */

/** What an option moves. Money is spending or a windfall: it moves net
 *  worth and leaves career earnings alone. */
export type NbaLifeCFx = DeckCFx;
export type NbaLifeCOptionDef = DeckCOptionDef<NbaCareerState>;
export type NbaLifeCDef = DeckCDef<NbaCareerState, 'position' | 'rookie' | 'veteran' | 'bench' | 'rules'>;

/** The NBA as the engine plays it: cents, the report line, and direction
 *  chips that read the save. A traded player's fans start over in the new
 *  city at the 44 decks A and B use for the same move, so a trade plays the
 *  same whichever deck dealt it. Functions only, so nothing imported is read
 *  at module scope (nbaMyCareer.ts imports this file). */
const NBA_DECK_C: DeckCSport<NbaCareerState> = {
  moneyScale: c => nbaEraById(c.eraId).moneyScale,
  money: 'cents',
  log: 'report',
  chip: 'directions',
  chipReadsSave: true,
  tradeFans: 44,
  teamIds: c => nbaEraTeamIds(c.eraId),
  teamLabel: (id, c) => nbaTeamLabelOf(id, c.eraId),
};

const isModern = (c: NbaCareerState): boolean => nbaEraById(c.eraId).id === 'now';
const yrsOf = (c: NbaCareerState): number => c.seasons.length;

/** Applies an effect to the career and returns the words for what really
 *  moved, after the clamps. A stat that could not move is not mentioned. */
export function applyNbaLifeCFx(c: NbaCareerState, fx: NbaLifeCFx): string {
  return applyDeckCFx(NBA_DECK_C, c, fx);
}

/** The short promise on the button, written from the same data and from the
 *  save it will land on, so a stat already at its limit is not promised. */
export function nbaLifeCChip(o: { fx: NbaLifeCFx; move?: 'trade' | 'claim' }, c: NbaCareerState): string {
  return deckCChip(NBA_DECK_C, o, c);
}

/** One card, built for this career: its chips are written from this save.
 *  Works on any save, eligible or not. */
export function buildNbaLifeCCard(def: NbaLifeCDef, c: NbaCareerState): NbaCareerEvent {
  return buildDeckCCard(NBA_DECK_C, def, c);
}

/* ============================== THE CATALOG ============================== */

const pos = (p: NbaCareerState['pos']) => (c: NbaCareerState): boolean => c.pos === p;

export const NBA_LIFE_C: NbaLifeCDef[] = [
  /* ------------------------- 1. YOUR POSITION: PG ------------------------- */
  {
    id: 'nbaC_pg_play_sheet', category: 'position', cooldown: 3,
    when: c => pos('PG')(c) && yrsOf(c) >= 2,
    title: 'The coach hands you the play sheet',
    body: 'He has called every set from the sideline since you got here. Now he wants you calling them on the floor, with the shot clock running and four guys looking at you for the answer.',
    options: [
      {
        label: 'Take it and call your own game', p: 0.6,
        win: { say: 'You called the right thing at the right time for most of a season, and the offense had never looked that calm.', fx: { rating: 2, morale: 5 } },
        lose: { say: 'Three shot clock violations in a national game, and he took the sheet back at halftime without a word.', fx: { morale: -6, fanbase: -3 } },
      },
      { label: 'Split it: you call the half court, he calls after timeouts', say: 'Nobody got everything they wanted and the offense ran fine.', fx: { rating: 1, morale: 2 } },
      { label: 'Tell him you play better when you just play', say: 'He nodded, kept the sheet, and said the offer stays open.', fx: { morale: 3 } },
    ],
  },
  {
    id: 'nbaC_pg_full_court', category: 'position', cooldown: 3,
    when: c => pos('PG')(c) && yrsOf(c) >= 1,
    title: 'Ninety four feet, every possession',
    body: 'The scouting report on you is out: pick the point guard up at the far baseline and make bringing the ball up feel like a job. Every team is doing it. Your legs know by the third quarter.',
    options: [
      { label: 'Spend the summer on your handle against pressure', say: 'Two defenders, one ball, a hundred trips a morning. By October the press was a favor they were doing you.', fx: { rating: 2, health: -4 } },
      { label: 'Let a wing bring it up and save your legs', say: 'You gave up the ball for twenty feet a trip and had something left in the fourth.', fx: { health: 5, morale: -3 } },
      {
        label: 'Go at the guy doing it, first play of every game', p: 0.5,
        win: { say: 'You put the best pest in the league on a highlight twice in a week and the pressure stopped coming.', fx: { fanbase: 7, morale: 5 } },
        lose: { say: 'He took it from you at half court on national TV, and then did it again.', fx: { fanbase: -4, morale: -5 } },
      },
    ],
  },
  {
    id: 'nbaC_pg_turnovers', category: 'position', cooldown: 3,
    when: c => pos('PG')(c) && yrsOf(c) >= 1 && c.ovr <= 86,
    title: 'The turnover meeting',
    body: 'The assistant who handles the guards has every one of your turnovers on one reel. It runs long. He is not mad, which is somehow worse.',
    options: [
      { label: 'Watch all of it, twice', say: 'Half of them were the same pass to the same spot. You stopped throwing it.', fx: { rating: 1, morale: -2 } },
      { label: 'Simplify: fewer home run passes, more easy ones', say: 'The highlights dried up and so did the giveaways. The coach noticed which one he cared about.', fx: { rating: 1, fanbase: -3, morale: 3 } },
      { label: 'Keep throwing them, that is the whole point of you', say: 'Some nights it is a clinic and some nights it is a reel. The crowd is in on every one.', fx: { fanbase: 5, morale: 2 } },
    ],
  },

  /* ------------------------- 2. YOUR POSITION: SG ------------------------- */
  {
    id: 'nbaC_sg_cold_streak', category: 'position', cooldown: 3,
    when: c => pos('SG')(c) && yrsOf(c) >= 1,
    title: 'Two for your last twenty six',
    body: 'A shooting guard who cannot shoot is a tall guy standing in the corner. The slump is three weeks old, everybody has a theory, and your mother has called twice to talk you through your own elbow.',
    options: [
      {
        label: 'Keep shooting, shooters shoot', p: 0.55,
        win: { say: 'The seventh one of the night went in, then the next four did, and the slump was a rumor by the weekend.', fx: { morale: 7, fanbase: 4 } },
        lose: { say: 'It got to two for thirty four before the coach pulled you from the closing lineup.', fx: { morale: -7, fanbase: -3 } },
      },
      { label: 'Go back to the shooting coach and rebuild from the feet up', say: 'A week of one handed form shots a foot from the rim, like you were twelve. It came back slowly and it stayed.', fx: { rating: 1, morale: 2 } },
      { label: 'Stop shooting and get to the rim instead', say: 'You lived at the foul line for a month and wore every bit of contact that comes with it.', fx: { morale: 4, health: -4 } },
    ],
  },
  {
    id: 'nbaC_sg_stopper', category: 'position', cooldown: 3,
    when: c => pos('SG')(c) && yrsOf(c) >= 2,
    title: 'You get their best scorer, every night',
    body: 'The coach wants you on the other team\'s top guard from the opening tip to the last possession. It is the hardest job on the floor and the box score will never mention it.',
    options: [
      { label: 'Take the assignment and live in the film room', say: 'You learned which way forty different scorers like to go, and you were sore in places that do not have names.', fx: { rating: 2, health: -5, morale: 3 } },
      { label: 'Take it, but ask for fewer plays called for you', say: 'You gave up some shots to have legs for the other end. The coaches loved it and your scoring line did not.', fx: { rating: 1, morale: 4, fanbase: -3 } },
      { label: 'Tell him you are here to score', say: 'He gave the job to a rookie and remembered the conversation.', fx: { fanbase: 3, morale: -4 } },
    ],
  },
  {
    id: 'nbaC_sg_shot_diet', category: 'position', cooldown: 3,
    /* A shot chart meeting is a modern front office habit, so it stays out of
       the 2003-04 era. */
    when: c => pos('SG')(c) && yrsOf(c) >= 2 && isModern(c),
    title: 'The shot chart meeting',
    body: 'The analytics staff has a picture of the floor with your favorite spot colored red. They would like you to stop shooting from there. It is the shot you have taken since you were nine.',
    options: [
      { label: 'Trade the pull up twos for threes and layups', say: 'It felt wrong for a month and then the numbers showed up exactly where they said they would.', fx: { rating: 2, morale: -3 } },
      { label: 'Keep the shot, it is who you are', say: 'You kept the midrange and the building loved every one that dropped.', fx: { fanbase: 4, morale: 3 } },
      { label: 'Meet in the middle: keep it for late in the clock', say: 'The staff got most of what they wanted and you kept your shot for when it matters.', fx: { rating: 1, morale: 1 } },
    ],
  },

  /* ------------------------- 3. YOUR POSITION: SF ------------------------- */
  {
    id: 'nbaC_sf_switch_everything', category: 'position', cooldown: 3,
    when: c => pos('SF')(c) && yrsOf(c) >= 1,
    title: 'One through five',
    body: 'The new defense switches every screen, and the wing is the one who ends up on everybody. A point guard at the top of the key, then a center on the block, in the same possession.',
    options: [
      { label: 'Put on ten pounds so the big men stop moving you', say: 'You held your ground in the post all year and gave up a half step to the quick guards.', fx: { rating: 1, health: 3, morale: 2 } },
      { label: 'Drop ten pounds and chase the guards', say: 'You stayed in front of everybody small and got leaned on by everybody large.', fx: { rating: 1, health: -4, fanbase: 3 } },
      { label: 'Stay as you are and learn every matchup on film', say: 'It was a lot of film. By spring you knew where forty guys wanted the ball before they did.', fx: { rating: 2, morale: -3 } },
    ],
  },
  {
    id: 'nbaC_sf_point_forward', category: 'position', cooldown: 3,
    when: c => pos('SF')(c) && yrsOf(c) >= 2 && c.ovr >= 76,
    title: 'He wants you to bring the ball up',
    body: 'The point guard is hurt and the coach has an idea: give the wing the ball and let everybody else run. It is either the best thing that ever happened to your game or a turnover every third trip.',
    options: [
      {
        label: 'Run the offense yourself', p: 0.55,
        win: { say: 'You saw the whole floor from up there. The assists piled up and nobody asked for the ball back.', fx: { rating: 2, fanbase: 5, morale: 4 } },
        lose: { say: 'Six turnovers on opening night, and a smaller, quicker man in your jersey for forty eight minutes.', fx: { morale: -6, fanbase: -2 } },
      },
      { label: 'Share it: you initiate, a guard finishes the play', say: 'You got the ball moving and stayed out of the worst of the pressure.', fx: { rating: 1, morale: 3 } },
      { label: 'Stay on the wing where you make your money', say: 'They found a backup guard on a short deal and you kept your spots.', fx: { morale: 2 } },
    ],
  },
  {
    id: 'nbaC_sf_play_the_four', category: 'position', cooldown: 3,
    when: c => pos('SF')(c) && yrsOf(c) >= 2,
    title: 'Small ball means you are the big',
    body: 'The lineup the coach loves has you at power forward, guarding men who outweigh you by forty pounds and setting the screens you used to come off of.',
    options: [
      { label: 'Do it, the lineup wins', say: 'The lineup was the best one the team had. You iced something after every game.', fx: { morale: 6, health: -6, fanbase: 3 } },
      { label: 'Do it in short bursts only', say: 'Ten minutes a night up a position, and your back agreed to the deal.', fx: { morale: 3, health: -2 } },
      { label: 'Ask to stay at your own spot', say: 'He went with a real big and the lineup lost a step. Your shoulders thanked you.', fx: { health: 4, morale: -3 } },
    ],
  },

  /* ------------------------- 4. YOUR POSITION: PF ------------------------- */
  {
    id: 'nbaC_pf_corner_three', category: 'position', cooldown: 3,
    when: c => pos('PF')(c) && yrsOf(c) >= 1,
    title: 'Shoot it or sit',
    body: 'Your defender has stopped guarding you outside fifteen feet. He just stands in the paint and waits. The coach says the lane is clogged because of it, and he is not wrong.',
    options: [
      {
        label: 'A whole summer in the corner, five hundred makes a day', p: 0.65,
        win: { say: 'It went in often enough that they had to come out and guard you, and the whole floor opened up.', fx: { rating: 2, morale: 5 } },
        lose: { say: 'A summer of corner threes and it still looked like a set shot from 1961. You tried, and your elbow has opinions.', fx: { morale: -4, health: -3 } },
      },
      { label: 'Forget the three, become the best screener alive', say: 'You set a hundred hard screens a week and got everybody else open instead.', fx: { rating: 1, health: -3, morale: 3 } },
      { label: 'Keep working the block, it still works', say: 'Your post game was as good as ever, in a league that runs fewer plays for it every year.', fx: { morale: 2, fanbase: 2 } },
    ],
  },
  {
    id: 'nbaC_pf_enforcer', category: 'position', cooldown: 3,
    when: c => pos('PF')(c) && yrsOf(c) >= 2,
    title: 'Somebody has to answer that',
    body: 'Their center put your point guard on the floor twice tonight, and both times looked at your bench afterwards. Every team has a guy who answers that. On this team everybody is looking at you.',
    options: [
      {
        label: 'Answer it with a hard, clean foul next trip down', p: 0.6,
        win: { say: 'One hard screen, one box out that moved him three feet, and it stopped. The guards bought dinner.', fx: { morale: 8, fanbase: 4 } },
        /* A fine, not a game check: a game check is a share of salary and
           comes with a missed game, and this card moves neither. */
        lose: { say: 'The referees called it a flagrant and the league sent you a fine. The guards still bought dinner.', fx: { morale: 3, netWorth: -0.05, fanbase: -2 } },
      },
      { label: 'Answer it on the scoreboard', say: 'You went at him every possession and fouled him out. Nobody had to say anything.', fx: { rating: 1, morale: 4 } },
      { label: 'Stay out of it', say: 'You played your game. The guards noticed who did not show up.', fx: { morale: -5, health: 2 } },
    ],
  },
  {
    id: 'nbaC_pf_glass', category: 'position', cooldown: 3,
    when: c => pos('PF')(c) && yrsOf(c) >= 1,
    title: 'Crash the glass or get back',
    body: 'The coach wants everybody sprinting back on defense the second a shot goes up. Second chance points are half of what you do. He has drawn the rule on the whiteboard with your number next to it.',
    options: [
      { label: 'Get back every time, like he drew it', say: 'Your rebounds dipped, the defense got better, and he said your name in a film session for the right reason.', fx: { morale: 4, fanbase: -2 } },
      { label: 'Crash anyway and outrun your own mistake', say: 'You went to the glass and then sprinted ninety feet to cover for it, most of a season.', fx: { rating: 1, health: -5, fanbase: 3 } },
      { label: 'Ask for a rule: you crash, a guard stays home', say: 'He changed the drawing. It took one conversation and it was a good one.', fx: { rating: 1, morale: 3 } },
    ],
  },

  /* ------------------------- 5. YOUR POSITION: C -------------------------- */
  {
    id: 'nbaC_c_hunted', category: 'position', cooldown: 3,
    when: c => pos('C')(c) && yrsOf(c) >= 1,
    title: 'They keep calling your man up to screen',
    body: 'Every late possession is the same play: their quickest guard calls for a screen from whoever you are guarding, and suddenly it is you and him on an island thirty feet from the rim.',
    options: [
      { label: 'Spend the summer sliding your feet against guards', say: 'A whole offseason of defensive slides against men a foot shorter. You stopped being the play they called.', fx: { rating: 2, health: -4 } },
      { label: 'Stay back near the rim and dare them to shoot over you', say: 'Some nights they missed and you looked like a wall. Some nights they did not.', fx: { rating: 1, fanbase: -2, health: 2 } },
      { label: 'Tell the coach to hide you on a non shooter late', say: 'He drew it up. It worked until the other bench noticed.', fx: { morale: 2 } },
    ],
  },
  {
    id: 'nbaC_c_free_throws', category: 'position', cooldown: 3,
    when: c => pos('C')(c) && yrsOf(c) >= 1,
    title: 'They are fouling you on purpose',
    body: 'Fourth quarter, close game, and their coach is sending a guy to grab you forty feet from the ball. The whole building knows why. Your free throw percentage is on the big screen.',
    options: [
      {
        label: 'A new routine and two hundred a day until it fixes itself', p: 0.6,
        win: { say: 'Same breath, same two dribbles, every time. They stopped fouling you because it stopped working.', fx: { rating: 2, morale: 6 } },
        lose: { say: 'Two hundred a day and it got into your head worse. You started turning down layups to avoid the line.', fx: { morale: -7 } },
      },
      { label: 'Shoot them underhand, who cares how it looks', say: 'It went in more often. The clips of it went everywhere, and not all of them were kind.', fx: { rating: 1, fanbase: -4, morale: 2 } },
      { label: 'Accept the bench in the last two minutes', say: 'You watched the endings of close games from a chair with a towel on your head.', fx: { morale: -5, health: 2 } },
    ],
  },
  {
    id: 'nbaC_c_frame', category: 'position', cooldown: 3,
    when: c => pos('C')(c) && yrsOf(c) >= 2,
    title: 'Heavier or lighter',
    body: 'The strength coach and the head coach want two different centers. One wants fifteen more pounds to hold the paint. The other wants fifteen fewer so you can run the floor. You have one body.',
    options: [
      { label: 'Bulk up and own the paint', say: 'Nobody moved you all year. Your knees filed a complaint in March.', fx: { rating: 1, health: -5, morale: 3 } },
      { label: 'Lean out and beat everybody down the floor', say: 'You got easy baskets just by running, and felt better in April than you ever had.', fx: { rating: 1, health: 5, fanbase: 2 } },
      { label: 'Stay at your weight and tell them both to relax', say: 'Two coaches, one shrug. Nothing changed, including you.', fx: { morale: 2 } },
    ],
  },

  /* --------------------------- 6. THE ROOKIE YEAR -------------------------- */
  {
    id: 'nbaC_rookie_wall', category: 'rookie', cooldown: 99,
    when: c => yrsOf(c) === 1,
    title: 'The wall',
    body: 'You had played a normal season of games before the holidays this year, and then there were a lot more left. Everybody told you the wall was coming. Nobody said what it feels like.',
    options: [
      { label: 'Hire a full time body person for year two', say: 'A trainer, a soft tissue person and a schedule. Year two will not catch you by surprise.', fx: { health: 8, netWorth: -0.2 } },
      { label: 'Copy the oldest guy on the roster, hour for hour', say: 'He sleeps nine hours and eats the same lunch every day. You did what he did.', fx: { health: 5, morale: 3 } },
      { label: 'Just be younger than the problem', say: 'You are twenty something and it mostly worked. Mostly.', fx: { morale: 2, health: -3 } },
    ],
  },
  {
    id: 'nbaC_rookie_first_check', category: 'rookie', cooldown: 99,
    when: c => yrsOf(c) === 1,
    title: 'The first real check',
    body: 'It was a lot smaller than the number in the headline. Taxes, the agent, the dues. And your phone has been busy: a cousin with a food truck, a friend with a restaurant idea, an uncle with a sure thing.',
    options: [
      { label: 'Hire a boring money person and put it away', say: 'She put most of it somewhere dull and gave you an allowance. You were annoyed for a week and fine forever.', fx: { netWorth: 0.2, morale: -2 } },
      { label: 'Take care of everybody who helped you get here', say: 'A few debts paid, a few cars bought, a lot of hugs. The account felt it.', fx: { netWorth: -0.4, morale: 8 } },
      {
        label: 'Back the food truck', p: 0.35,
        win: { say: 'It turned out your cousin can really cook. There are three trucks now.', fx: { netWorth: 0.5, morale: 5 } },
        lose: { say: 'The truck lasted one summer. Thanksgiving was a little quiet.', fx: { netWorth: -0.3, morale: -3 } },
      },
    ],
  },
  {
    id: 'nbaC_rookie_vet_summer', category: 'rookie', cooldown: 99,
    when: c => yrsOf(c) <= 2 && yrsOf(c) >= 1,
    title: 'A veteran invites you to his summer',
    body: 'The oldest starter on the team works out at six in the morning in a high school gym with no cameras, and he has never invited a young player before. He just did.',
    options: [
      { label: 'Show up every day, a half hour early', say: 'Six weeks of the least glamorous basketball of your life. You came back with two moves that are not on your scouting report yet.', fx: { rating: 2, morale: 4, health: -3 } },
      { label: 'Go for two weeks, then take your vacation', say: 'You got the short version and a tan.', fx: { rating: 1, health: 3 } },
      { label: 'Thank him and do your own thing', say: 'You trained with your own people. He did not ask twice.', fx: { morale: -3, health: 2 } },
    ],
  },
  {
    id: 'nbaC_rookie_book_on_you', category: 'rookie', cooldown: 99,
    when: c => yrsOf(c) === 2 || yrsOf(c) === 1,
    title: 'The league has a book on you now',
    body: 'Last year nobody knew which way you liked to go. Now every team has a page on it: force him left, go under the screen, he does not finish with the off hand. They wrote it because it is true.',
    options: [
      { label: 'Fix the exact things on the page', say: 'A summer on the off hand and the pull up going the wrong way. The book is out of date.', fx: { rating: 2, health: -3 } },
      { label: 'Get better at what already works', say: 'They know what is coming. You made it good enough that knowing does not help.', fx: { rating: 1, morale: 3 } },
      { label: 'Do not read it', say: 'You heard about the report from a teammate and decided it was noise.', fx: { morale: 2 } },
    ],
  },
  {
    id: 'nbaC_rookie_hotel', category: 'rookie', cooldown: 99,
    when: c => yrsOf(c) === 1,
    title: 'You still live in the hotel',
    body: 'It was supposed to be for two weeks after the draft. It has been a season. The front desk knows your order, and there is a team issued suitcase that has never been fully unpacked.',
    options: [
      { label: 'Buy a place near the practice gym', say: 'A real kitchen and a seven minute drive. It felt like you play here now.', fx: { netWorth: -0.6, morale: 7 } },
      { label: 'Rent something small and keep it simple', say: 'A one bedroom with a parking spot. It is fine. It is yours for twelve months.', fx: { netWorth: -0.1, morale: 4 } },
      { label: 'Stay, the room service is good', say: 'Another year of tiny shampoo. The housekeeping staff got you a card on your birthday.', fx: { morale: -2, fanbase: 2 } },
    ],
  },

  /* ---------------------------- 7. THE LAST YEARS -------------------------- */
  {
    id: 'nbaC_vet_minutes_plan', category: 'veteran', cooldown: 3,
    when: c => c.age >= 31 && c.role !== 'backup',
    title: 'The minutes conversation',
    body: 'The coach closes his office door, which he never does. He would like to play you six fewer minutes a night so there is something left in the spring. He is asking. He does not have to ask.',
    options: [
      { label: 'Agree, and mean it', say: 'You sat the first six minutes of every fourth quarter and felt thirty again in April.', fx: { health: 8, morale: -2 } },
      { label: 'Agree to four, and you pick the nights', say: 'A negotiation between adults. You both gave a little.', fx: { health: 4, morale: 2 } },
      { label: 'Tell him you will rest when you retire', say: 'You played every minute he would give you, and your body kept the receipts.', fx: { health: -6, fanbase: 4, morale: 3 } },
    ],
  },
  {
    id: 'nbaC_vet_morning_routine', category: 'veteran', cooldown: 3,
    when: c => c.age >= 32,
    title: 'It takes three hours to get ready now',
    body: 'Ten years ago you rolled out of bed and played. Now there is a hot tub, a cold tub, a table, bands, a bike and a man who cracks your back, and that is before the warmup.',
    options: [
      { label: 'Build a recovery room in the house', say: 'A cold plunge where the pool table used to be. Expensive, and you felt every dollar of it working.', fx: { health: 9, netWorth: -0.5 } },
      { label: 'Add an hour and do it all at the facility', say: 'First car in the lot every morning. The young guys started showing up early to see what you do.', fx: { health: 5, morale: 3 } },
      { label: 'Skip half of it, you have played this long', say: 'It caught up with you on the second night of a back to back in February.', fx: { health: -5, morale: 2 } },
    ],
  },
  {
    id: 'nbaC_vet_film_room', category: 'veteran', cooldown: 3,
    when: c => c.age >= 31 && yrsOf(c) >= 9,
    title: 'He wants you to run the film session',
    body: 'The coaching staff has noticed that when you say something in the huddle, the young players actually do it. They would like you to run a film session a week. It sounds a lot like the first day of your next job.',
    options: [
      { label: 'Run it, and prepare for it like a game', say: 'You cut the clips yourself. The room was quiet in the good way.', fx: { morale: 7, fanbase: 2, health: -2 } },
      { label: 'Do it, but keep it loose', say: 'Twenty minutes, some jokes, three real points. They listened.', fx: { morale: 4 } },
      { label: 'Say no, you are still a player', say: 'You told him to ask again when you cannot run anymore. He laughed. You were only half joking.', fx: { rating: 1, morale: -2 } },
    ],
  },
  {
    id: 'nbaC_vet_new_game', category: 'veteran', cooldown: 4,
    when: c => c.age >= 32 && c.ovr >= 72,
    title: 'The first step is gone',
    /* draftPick 0 is an undrafted camp signing (the Road to the Draft): he
       was never drafted, so his line names the day he signed instead */
    body: c => `You tried the move that has worked for a decade and the defender was just there, waiting, a kid who was in grade school ${c.draftPick > 0 ? 'the night you were drafted' : 'the summer you signed your first deal'}. The burst is not coming back. The question is what replaces it.`,
    options: [
      {
        label: 'Rebuild your whole game around craft and angles', p: 0.6,
        win: { say: 'Footwork, fakes and one very annoying shoulder bump. You got to your spots slower and scored just the same.', fx: { rating: 2, morale: 5 } },
        lose: { say: 'The new game never felt like yours. You spent a season thinking instead of playing.', fx: { morale: -5 } },
      },
      { label: 'Become a spot up shooter and let the kids drive', say: 'You stood in the corner, made your shots, and saved your knees for the playoffs.', fx: { health: 5, fanbase: -3, morale: 1 } },
      { label: 'Pretend it is still there', say: 'It was not still there. The film was hard to watch.', fx: { health: -5, morale: -3 } },
    ],
  },
  {
    id: 'nbaC_vet_player_rep', category: 'veteran', cooldown: 99,
    when: c => c.age >= 30 && yrsOf(c) >= 8,
    title: 'The locker room votes you player rep',
    body: 'Somebody has to be the team\'s voice with the players union: the meetings, the calls, the rookie who does not understand his own pay stub. It was a unanimous vote and you were not in the room.',
    options: [
      { label: 'Take it seriously, go to every meeting', say: 'A lot of conference calls. Half the roster now understands their own contract because of you.', fx: { morale: 6, fanbase: 2, health: -2 } },
      { label: 'Take the title and hand the homework to a younger guy', say: 'He did the work and you signed things. It mostly held together.', fx: { morale: 2 } },
      { label: 'Decline, politely', say: 'The second place guy got it. He is doing fine.', fx: { morale: -2, health: 2 } },
    ],
  },

  /* ---------------------------- 8. THE SECOND UNIT ------------------------- */
  {
    id: 'nbaC_bench_dnp', category: 'bench', cooldown: 2,
    when: c => c.role === 'backup' && yrsOf(c) >= 1,
    title: 'Did not play, coach\'s decision',
    body: 'Three straight games in a warmup jacket. You are healthy. Nobody has said a word to you about it, and the box score has a little abbreviation next to your name.',
    options: [
      {
        label: 'Knock on his door and ask what he needs to see', p: 0.6,
        win: { say: 'He told you exactly what it was: defend without fouling. You did, and you were back in the rotation in a week.', fx: { rating: 1, morale: 6 } },
        lose: { say: 'He said the rotation is the rotation. At least you know.', fx: { morale: -4 } },
      },
      { label: 'Say nothing and be the first one in the gym', say: 'You got your work in at seven every morning. Somebody upstairs keeps track of that.', fx: { rating: 1, health: -2, morale: -2 } },
      { label: 'Have your agent make a call', say: 'The call got made. So did a note in a file somewhere.', fx: { morale: 2, fanbase: -2 } },
    ],
  },
  {
    id: 'nbaC_bench_sixth_man', category: 'bench', cooldown: 3,
    when: c => c.role === 'backup' && c.ovr >= 76,
    title: 'The second unit is yours',
    body: 'The coach is not going to start you and he is not going to pretend otherwise. What he is offering is the whole bench group: your plays, your shots, the ball in your hands the minute you check in.',
    options: [
      { label: 'Own it, and go get the sixth man trophy', say: 'You came in firing every night. Second units around the league started game planning for a bench player.', fx: { rating: 1, fanbase: 6, morale: 5 } },
      { label: 'Take it, but tell him you still want to start', say: 'He respected it. You ran the bench and kept the conversation open.', fx: { morale: 3, fanbase: 2 } },
      { label: 'Ask for a trade to somewhere you start', say: 'Your agent made it known. The front office made it known that they heard.', fx: { morale: -4, fanbase: 3 } },
    ],
  },
  {
    id: 'nbaC_bench_garbage_time', category: 'bench', cooldown: 2,
    when: c => c.role === 'backup' && c.ovr <= 80,
    title: 'Up twenty six with five minutes left',
    body: 'These are your minutes. The starters have ice on their knees and the building is half empty. You can run the offense the way it is drawn, or you can go get yours while there is a camera on.',
    options: [
      { label: 'Run the real offense, every possession', say: 'Nobody will remember those five minutes except the coaches, and they are the ones who decide.', fx: { rating: 1, morale: 2 } },
      { label: 'Go get twelve points', say: 'Twelve in five minutes, a nice clip, and a look from the bench you pretended not to see.', fx: { fanbase: 4, morale: 3 } },
      { label: 'Play defense like it is a tie game', say: 'You picked up full court up twenty six. The other bench hated it. Yours did not.', fx: { rating: 1, health: -2, morale: 3 } },
    ],
  },
  {
    id: 'nbaC_bench_spot_start', category: 'bench', cooldown: 2,
    when: c => c.role === 'backup' && yrsOf(c) >= 1,
    title: 'The starter is out for ten games',
    body: 'A sprained ankle ahead of you on the depth chart. For ten games the job is yours, and everybody in the building knows a ten game audition when they see one.',
    options: [
      {
        label: 'Play like the job is already yours', p: 0.5,
        win: { say: 'Ten games, eight wins, and a real conversation upstairs about who should start when he is back.', fx: { rating: 2, fanbase: 6, morale: 7 } },
        lose: { say: 'You pressed. The shots were forced, and the team went three and seven.', fx: { morale: -6, fanbase: -3 } },
      },
      { label: 'Do his job the way he does it, nothing extra', say: 'Steady and unspectacular. The team did not miss a beat, and the staff wrote that down.', fx: { rating: 1, morale: 4 } },
      { label: 'Play every minute they give you, all of it hard', say: 'You ran yourself into the ground for ten games and made your case.', fx: { rating: 1, health: -6, fanbase: 3 } },
    ],
  },

  /* ------------------- 9. THE LEAGUE'S OWN RULES, AS STORIES ---------------- */
  {
    /* Modern era only, first three seasons: see the header for the sources. */
    id: 'nbaC_rule_g_league', category: 'rules', cooldown: 2, story: 'gLeague',
    when: c => isModern(c) && yrsOf(c) >= 1 && yrsOf(c) <= 3 && c.ovr <= 78,
    title: 'Assigned to the G League affiliate',
    body: 'The team wants to send you to its G League affiliate for a few weeks. You stay on your contract and they can call you back up whenever they like. On paper it is not a demotion. On the road it is a bus.',
    options: [
      { label: 'Go, and play forty minutes a night', say: 'You had the ball in your hands every possession for three weeks. Nothing up here was going to teach you that.', fx: { rating: 2, morale: -3, fanbase: -2 } },
      { label: 'Go, and treat every game like a tryout for your own team', say: 'The staff down there sent a glowing report upstairs. You were back in ten days.', fx: { rating: 1, morale: 3 } },
      { label: 'Ask to stay and fight for minutes here', say: 'They let you stay. You watched a lot of basketball from very good seats.', fx: { morale: 2, health: 3 } },
    ],
  },
  {
    /* Modern era only: the two way contract began with the 2017 offseason. */
    id: 'nbaC_rule_two_way_kid', category: 'rules', cooldown: 3,
    when: c => isModern(c) && yrsOf(c) >= 2 && (c.role === 'backup' || c.ovr <= 78),
    title: 'The two way kid plays your position',
    body: 'There is a kid on a two way deal who plays your spot. Most nights he is with the G League affiliate, some nights he is up here, and he does not take one of the standard roster spots. If the team wants to keep him for real, it has to turn that into a full contract, and a full contract needs a spot. You have counted the spots.',
    options: [
      { label: 'Outwork him, every single practice', say: 'He pushed you harder than any starter ever did. You are better for it, and tired.', fx: { rating: 2, health: -4 } },
      { label: 'Take him under your wing', say: 'You taught him the coverages and where to eat on the road. If he takes your job one day, he will at least feel bad about it.', fx: { morale: 6, fanbase: 2 } },
      {
        label: 'Have your agent ask the front office what the plan is', p: 0.5,
        win: { say: 'The plan has you in it. They said so, and they did not have to.', fx: { morale: 5 } },
        lose: { say: 'The answer was a lot of words about flexibility.', fx: { morale: -5 } },
      },
    ],
  },
  {
    /* Both eras: over the cap, salary out has to come close to salary in.
       The contract travels with the player, so salary and years are left
       alone by every option here. */
    id: 'nbaC_rule_salary_match', category: 'rules', cooldown: 4, story: 'deadlineDay',
    when: c => yrsOf(c) >= 3 && c.ovr <= 86 && c.contractYears >= 1,
    title: 'Your contract makes the math work',
    body: c => `${nbaTeamLabelOf(c.team, c.eraId)} wants a star at the deadline and is over the cap. A team over the cap cannot just add him: the salary going out has to come close to the salary coming in. Your contract is the one that makes the numbers line up. Nothing about your deal changes if you go. Same money, same years, different city.`,
    options: [
      { label: 'Tell your agent you will go without a fuss', say: 'The call came at two in the afternoon. You were on a plane by six with the same contract in a new time zone.', fx: { morale: -4 }, move: 'trade' },
      {
        label: 'Ask the front office to find another contract to send', p: 0.5,
        win: { say: 'They found a different way to make it add up. You stayed, and everybody knows how close it was.', fx: { morale: 4 } },
        lose: { say: 'There was no other way to make it add up.', fx: { morale: -8 }, move: 'trade' },
      },
      {
        /* The win is a team that asked for you, not a promise of minutes:
           the rotation is still settled in camp (nbaCampBattle). */
        label: 'If you are going, ask your agent to steer it', p: 0.5,
        win: { say: 'Your agent got a third team involved, one whose coach had been asking about you for a year.', fx: { morale: 6 }, move: 'trade' },
        lose: { say: 'The deal was the deal. You went where the math sent you.', fx: { morale: -3 }, move: 'trade' },
      },
    ],
  },
  {
    /* Modern era only: the national TV expectation comes from the 2023-24
       Player Participation Policy, which counts as a star anyone picked
       All-Star or All-NBA in the past three seasons. The engine keeps
       All-NBA and MVP (an MVP is always an All-NBA pick) and, since Round
       1103, the All-Star selection too, so the gate reads all three. A season
       saved before that round has no All-Star to read. */
    id: 'nbaC_rule_national_tv', category: 'rules', cooldown: 2, story: 'loadManagement',
    when: c => isModern(c) && c.role !== 'backup' && yrsOf(c) >= 2
      && c.seasons.slice(-3).some(s => (s.awards ?? []).some(a => a === 'All-NBA' || a === 'MVP' || a === 'All-Star')),
    title: 'Your rest night is the national TV game',
    body: 'The training staff has you down to sit the second night of a back to back. The trouble is that it is the national TV game, and the league now expects a healthy star to be on the floor for those. The team can move your rest night. It cannot just sit you.',
    options: [
      { label: 'Play it, the whole country is watching', say: 'Thirty eight minutes on tired legs with the whole country watching. Worth it, and you felt it for a week.', fx: { fanbase: 5, health: -5 } },
      { label: 'Play it on a minutes limit, rest on a quiet night instead', say: 'Twenty six minutes on TV and a night off the following Tuesday that nobody noticed.', fx: { fanbase: 2, health: 2 } },
      { label: 'Let the staff move the whole rest schedule around the TV games', say: 'A new calendar with your rest days on the quiet nights. Dull, and exactly what your knees wanted.', fx: { health: 5, morale: -2 } },
    ],
  },
  {
    /* Modern era only: the games minimum for the big awards is from 2023-24.
       The card is about the knee, not the ballot. It is dealt in the
       offseason, after the awards are settled, and next season's awards read
       only next season's games, so no outcome here claims a place on a
       ballot or the loss of one. */
    id: 'nbaC_rule_award_games', category: 'rules', cooldown: 3, story: 'awardGames',
    when: c => {
      const last = c.seasons[c.seasons.length - 1];
      const missedTime = c.health < 88 || (!!last && last.games > 0 && last.games < 72);
      return isModern(c) && yrsOf(c) >= 2 && c.ovr >= 80 && missedTime;
    },
    title: 'The knee and the games count',
    body: 'Your knee has been sore for a while, and these days the big awards ask for a minimum number of games played, so everybody around you is counting. The knee would like a proper rest. Your competitive streak would like the count to start now.',
    options: [
      {
        label: 'Get back out there as soon as they let you', p: 0.55,
        win: { say: 'You were back early and you finished the year on the floor. The knee is a problem for the summer.', fx: { fanbase: 5, morale: 5, health: -6 } },
        lose: { say: 'The knee went again in the third game back, and the rest of the month went with it.', fx: { health: -12, morale: -5 } },
      },
      { label: 'Rest it properly and stop counting', say: 'Two full weeks off. It was hard to watch, and you came back whole.', fx: { health: 8, morale: -3 } },
      { label: 'Do exactly what the doctors say, whatever that costs', say: 'They cleared you a week later than you wanted. You stopped counting games.', fx: { health: 5, morale: -1 } },
    ],
  },
  {
    /* Both eras: the league's head coaches pick the All-Star reserves. */
    id: 'nbaC_rule_allstar_reserves', category: 'rules', cooldown: 3, story: 'allStarSnub',
    when: c => {
      const last = c.seasons[c.seasons.length - 1];
      const honored = !!last && (last.awards ?? []).some(a => a === 'All-NBA' || a === 'MVP' || a === 'All-Star');
      return yrsOf(c) >= 4 && c.ovr >= 80 && c.ovr <= 89 && !honored;
    },
    title: 'The coaches left you off the list',
    body: 'The starters come from the vote and the league\'s head coaches pick the reserves. You had the numbers, and the coaches picked somebody else. Your phone is full of people being angry on your behalf.',
    options: [
      { label: 'Say nothing and take it out on the schedule', say: 'You were the best player on the floor for a month straight. A few coaches got asked about their ballots.', fx: { rating: 1, morale: 4, fanbase: 5 } },
      { label: 'Say it out loud at the podium', say: 'You said the quiet part into six microphones. Half the league agreed and the other half filed it away.', fx: { fanbase: 6, morale: -3 } },
      { label: 'Take the week off at a beach', say: 'Four days of sun while everybody else flew to the game. You came back with fresh legs.', fx: { health: 7, morale: 2 } },
    ],
  },
  {
    id: 'nbaC_rule_summer_league_return', category: 'rules', cooldown: 99, story: 'summerLeague',
    when: c => yrsOf(c) >= 2 && yrsOf(c) <= 3 && c.ovr <= 80,
    title: 'They want you back in summer league',
    body: 'Summer league is for rookies and for guys trying to make a roster. You are neither, and the team would still like you to play in it: more reps, the ball in your hands, a new assistant to impress. Some people will read it as a message.',
    options: [
      {
        label: 'Go, and be the best player in the gym', p: 0.65,
        win: { say: 'You looked like a grown man playing with kids, which was the point. The staff saw what they needed to see.', fx: { rating: 2, fanbase: 3 } },
        lose: { say: 'You were the best player there until you rolled an ankle in a game that does not count.', fx: { health: -6, morale: -3 } },
      },
      { label: 'Play two games, then shut it down', say: 'Two games, forty minutes, a handshake. Everybody got what they came for.', fx: { rating: 1, health: -1 } },
      { label: 'Skip it and train on your own', say: 'You told them you had a plan for the summer and then you stuck to it.', fx: { health: 3, morale: 2 } },
    ],
  },

  /* END OF CATALOG */
];

/** The cards this career is eligible for right now. Draws nothing from rng:
 *  the gates are facts about the save, so adding this deck to the draw costs
 *  the stream exactly the one pick it always cost. */
export function getNbaLifeEventsC(c: NbaCareerState, _rng: () => number): NbaCareerEvent[] {
  return dealDeckC(NBA_DECK_C, NBA_LIFE_C, c);
}
