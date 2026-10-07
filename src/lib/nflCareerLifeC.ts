/*
   nflCareerLifeC.ts, NFL My Career life deck C (Round 917)

   The owner, 2026-10-02: "way way way more things for my career type games".
   Decks A and B hold 90 cards and exactly two of them read the position you
   play. This deck is 36 cards in what was thin: two for each of the eight
   positions, the first two seasons, the years past 30, the backup's life, and
   the league's own roster rules told as stories.

   Same self-gating contract as decks A and B: a card only lands in the
   returned array when its conditions hold, so drawEvent needs no eligibility
   rules of its own. Every id is prefixed lifeC_. No gate draws from the rng,
   so adding this deck moves nothing in the stream before the pick itself.

   THE WORDS ON A BUTTON ARE WHAT THE CODE APPLIES. Every option's effect line
   reads in one grammar ("Morale +5, health -2", "Net worth -0.3M", "Coin
   flip: rating +1 or health -6", "No change") and every log line ends with
   what really moved, measured after the clamps. Since Round 988 both are
   written by the shared engine (usCareerDeckC.ts) from the effect itself,
   and scripts/simUsCareerDeckC.mjs parses them back and compares them with
   the save for all four sports.

   SPEAKERS. Every voice here is a role (the head coach, your agent, the cap
   guy, the long snapper). No name is generated and no real person appears.

   LEAGUE RULES, each written without its number and gated on the season the
   rule arrived (c.year, so a 2005 career meets it the year the league did).
   All read 2026-10-02:
     - Practice squad elevation to the game day roster, the player going back
       down after the game: new in 2020. espn.com/nfl/story/_/id/29820641 and
       espn.com/nfl/story/_/id/31869693 (its 2021 terms); predictthe53.com/rules
       says elevations exist today.
     - Returning from injured reserve: new in 2012, before which the list ended
       a season. From 2012 to 2019 the way back was open to only a very few
       players per team per year, and from 2020 to far more, so the card has
       three eras and states no number in any of them.
       profootballrumors.com/2020/05/nfl-injured-reserve-return,
       nfl.com/news/chargers-first-to-pull-designated-to-return-trigger-0ap1000000058123
       and espn.com/nfl/story/_/id/29820641 (all three read 2026-10-02 by the
       round's review). The card is drawn in the offseason, so it is a
       surgery choice now with the list as the stake in the fall.
     - A restructure turns salary into a signing bonus paid now, the cap charge
       spread over the years left; the player is paid the same money, which is
       what makes it different from a pay cut.
       si.com/nfl/chiefs/onsi/gm-report/the-art-of-nfl-contracts-part-4 and
       profootballnetwork.com/how-do-nfl-contract-restructures-work-everything-around-nfl-contracts-explained
       The card does not make it the player's call: the second of those says
       a team mostly does not even have to consult the player on a simple
       restructure (newsweek.com/how-restructuring-nfl-contracts-works-1875079
       agrees), so the cap guy calls to explain it, not to ask.
     - The offseason program is voluntary and one minicamp is mandatory, with
       fines for skipping it: overthecap.com/collective-bargaining-agreement/article/21
       and tsn.ca/how-do-otas-and-training-camps-work-in-the-nfl-19.79215. Gated
       on 2012, the first spring under the deal that set the program's phases.
     - A team dresses fewer players than it carries, the rest inactive:
       predictthe53.com/rules (a second page, legionreport.com/nfl-inactive-list-explained,
       was read through a search summary only; the card states no number).

   apply() MUTATES the career and RETURNS the log line the player reads.
*/
import type { CareerState, CareerEvent } from './nflMyCareer';
import { nflEraById } from './nflMyCareer';
import { NFL_LIFE_COOLDOWN as CD, NFL_LIFE_STORY as STORY } from './nflCareerLifeTags';
import { deckCMoney, deckCOption } from './usCareerDeckC';
import type { DeckCFx, DeckCSport } from './usCareerDeckC';

/* Round 988: the machinery (the clamps, the era money, the coin flip, the
   words) is the shared engine in usCareerDeckC.ts, the same one the NBA, MLB
   and NHL decks run on. This file holds the cards and the NFL's settings.

   The button's words used to be typed by hand beside the effect and checked
   against it; now they are written from the effect, in the order the card
   writes it ("Morale +5, health -2"). Before the lift every typed line was
   compared with the computed one on 94,224 buttons and not one differed, so
   the lift changed no button. The review of Round 988 then found that the
   numbers were the card's, not the save's: "Morale +2" shown to a player
   already at 100. The button now reads the save it is shown on and prints
   what the option will really move there (played on a copy, through the
   same clamps), so a stat at its limit drops off it. */

/** The NFL as the engine plays it: money to the tenth and never under a
 *  tenth, the log tallies what moved ("No change." when nothing did), and
 *  the button prints the numbers this save will really move, a gamble only
 *  ever at even odds ("Coin flip"). Functions only, so nothing imported is
 *  read at module scope (nflMyCareer.ts imports this file). */
const NFL_DECK_C: DeckCSport<CareerState> = {
  moneyScale: c => nflEraById(c.eraId).moneyScale,
  money: 'tenths',
  log: 'tally',
  chip: 'numbers',
  chipReadsSave: true,
};

/** A fixed amount in the career's era money, never rounding to nothing. */
const eraCash = (c: CareerState, m: number): number => deckCMoney(NFL_DECK_C, c, m);
const r1 = (x: number): number => Math.round(x * 10) / 10;

export function getNflLifeEventsC(c: CareerState, _rng: () => number): CareerEvent[] {
  /* A plain option and a coin flip, for this save. Money in an effect is in
     today's dollars; the engine pays it in the era's money. */
  const opt = (label: string, fx: DeckCFx, say: string) => deckCOption(NFL_DECK_C, { label, say, fx }, c);
  const flip = (label: string, win: DeckCFx, winSay: string, lose: DeckCFx, loseSay: string) =>
    deckCOption(NFL_DECK_C, { label, p: 0.5, win: { say: winSay, fx: win }, lose: { say: loseSay, fx: lose } }, c);
  const deck: CareerEvent[] = [];
  const yrs = c.seasons.length;
  const role = c.role ?? 'starter';
  const backup = role === 'backup' && c.pos !== 'K';

  /* ============================== 1. YOUR POSITION ============================== */

  if (c.pos === 'QB') {
    deck.push({
      id: 'lifeC_qb_wristband',
      category: 'position', cooldown: CD.position,
      title: 'The wristband has to go',
      body: 'The play caller wants the wristband off your arm. He says a quarterback who reads the call off his wrist is a quarterback who does not own the offense yet. The call sheet is thick.',
      options: [
        opt('Memorize the whole call sheet', { rating: 1, morale: -3 }, 'You spent a month of nights saying play calls to a bathroom mirror. The huddle got faster and so did you.'),
        opt('Keep the wristband, it works', { morale: 2 }, 'You kept it. The calls still got in on time, and nobody in the huddle cared where you read them from.'),
      ],
    });
    deck.push({
      id: 'lifeC_qb_two_minute',
      category: 'position', cooldown: CD.position,
      title: 'The two minute period is yours',
      body: 'The head coach hands you the two minute period in practice. Your calls, no voice in your ear, the whole defense knowing a pass is coming.',
      options: [
        flip('Call it your way',
          { morale: 7, fanbase: 3 }, 'You went the length of the field on your own calls and somebody leaked the clip. The building talks about you differently now.',
          { morale: -5 }, 'Three plays, a sack and a pick. The coach took the period back without a word.'),
        opt('Call what the coordinator would call', { morale: 2 }, 'You ran his calls from memory. Nothing viral, nothing broken, a nod from the coordinator.'),
      ],
    });
  }

  if (c.pos === 'RB') {
    deck.push({
      id: 'lifeC_rb_committee',
      category: 'position', cooldown: CD.position,
      title: 'The committee backfield',
      body: 'The coaches are splitting the carries this year. Fresh legs in December, they say. Fewer touches in September, you hear. Nobody in a committee leads the league in anything.',
      options: [
        opt('Buy in and stay fresh', { health: 8, fanbase: -3 }, 'You shared the load and your knees thanked you in the cold months. The fantasy crowd did not.'),
        opt('Ask for the goal line work', { morale: 4, health: -3 }, 'You got the short yardage carries, the ones that hurt and the ones that count.'),
        opt('Complain to the beat writers', { fanbase: 4, morale: -6 }, 'The quote ran everywhere. The fans took your side and the running backs room did not.'),
      ],
    });
    deck.push({
      id: 'lifeC_rb_pass_pro',
      category: 'position', cooldown: CD.position,
      title: 'Blitz pickup school',
      body: 'The running backs coach has one rule: the fastest way off the field on third down is missing a blitz pickup. He wants you in the pass protection drill until it is boring.',
      options: [
        opt('Live in the blitz pickup drill', { rating: 1, health: -4 }, 'A summer of meeting linebackers in the hole. You are a three down back now, and you have the bruises to show it.'),
        opt('Stick to carrying the ball', { morale: 2 }, 'You kept your summer for what you do best. Third down still belongs to somebody else.'),
      ],
    });
  }

  if (c.pos === 'WR') {
    deck.push({
      id: 'lifeC_wr_slot',
      category: 'position', cooldown: CD.position,
      title: 'They want you in the slot',
      body: 'The coordinator wants to move you inside on some downs. Different releases, traffic over the middle, a whole new half of the route tree to learn.',
      options: [
        opt('Learn the inside game', { rating: 1, morale: -3 }, 'It was a humbling spring. By camp you could line up anywhere, and the defense could not find you.'),
        opt('Stay outside where you win', { morale: 3 }, 'You told him you are an outside receiver. He shrugged and left the plan alone.'),
      ],
    });
    deck.push({
      id: 'lifeC_wr_extra_work',
      category: 'position', cooldown: CD.position,
      title: 'Your quarterback stays late',
      body: 'Your quarterback throws for half an hour after every practice and he wants a receiver out there with him. Timing, he says, is built when nobody is watching.',
      options: [
        opt('Stay every single day', { morale: 5, health: -3 }, 'Hundreds of extra routes on tired legs. He looks your way first now.'),
        opt('Stay when your legs allow it', { morale: 2 }, 'A couple of days a week. Enough to stay on the same page.'),
        opt('Tell him the timing is his job', { fanbase: 3, morale: -6 }, 'The line got out and the talk shows loved it. Your quarterback did not.'),
      ],
    });
  }

  if (c.pos === 'TE') {
    deck.push({
      id: 'lifeC_te_inline',
      category: 'position', cooldown: CD.position,
      title: 'Block or catch',
      body: 'The tight ends coach wants your hand in the dirt more this year. The run game needs it. The stat sheet will not thank you for a single snap of it.',
      options: [
        opt('Embrace the blocking', { morale: 5, fanbase: -3 }, 'The line adopted you as one of their own. Your catches dipped and nobody on the offense minded.'),
        flip('Lobby for more routes',
          { fanbase: 6 }, 'The coordinator listened, and the seam route became your route.',
          { morale: -5 }, 'The coordinator heard you out and changed nothing. Now he knows you asked.'),
      ],
    });
    deck.push({
      id: 'lifeC_te_weight',
      category: 'position', cooldown: CD.position,
      title: 'Playing weight',
      body: 'The strength staff wants you heavier to hold up against defensive ends. You like how fast you are right now. A tight end is always one of the two and never both.',
      options: [
        opt('Add the weight', { health: 6, morale: -3 }, 'Six meals a day and none of them fun. You stopped getting moved off the ball.'),
        opt('Stay light and quick', { morale: 3, health: -3 }, 'You kept your speed and took the pounding that comes with giving up weight every snap.'),
      ],
    });
  }

  if (c.pos === 'LB') {
    deck.push({
      id: 'lifeC_lb_the_calls',
      category: 'position', cooldown: CD.position,
      title: 'You make the calls now',
      body: 'The coordinator wants you running the defense on the field: setting the front, making the checks, getting everybody lined up before the snap. If it goes wrong, it is your voice on the film.',
      options: [
        flip('Take the job',
          { morale: 7, fanbase: 3 }, 'You had the defense lined up before the offense broke the huddle. They call it your defense now.',
          { morale: -5 }, 'Two busted coverages in one afternoon, both on your check. The coordinator gave the calls back to the old veteran.'),
        opt('Let the veteran keep it', { morale: 2 }, 'You told him you would rather just play fast. He respected the honesty.'),
      ],
    });
    deck.push({
      id: 'lifeC_lb_special_teams',
      category: 'position', cooldown: CD.position,
      title: 'Every unit wants you',
      body: 'The special teams coach wants you on every one of his units. Linebackers who can run are what he builds with, and he has been watching you since camp.',
      options: [
        opt('Volunteer for all of it', { morale: 4, fanbase: 2, health: -5 }, 'You covered every kick and led the team in tackles nobody tracks. The crowd learned your number the hard way.'),
        opt('Keep your legs for defense', { health: 3, morale: -2 }, 'You begged off. The special teams coach nodded and has not looked at you since.'),
      ],
    });
  }

  if (c.pos === 'CB') {
    deck.push({
      id: 'lifeC_cb_shadow',
      category: 'position', cooldown: CD.position,
      title: 'Travel with their best',
      body: 'The coordinator asks if you want to follow the other team\'s top receiver all over the field, every week. No help, no hiding, your name on every highlight one way or the other.',
      options: [
        flip('Yes, every snap',
          { fanbase: 8, morale: 4 }, 'You erased a star in front of a national audience. People started calling your side of the field an island.',
          { fanbase: -5, morale: -4 }, 'He got you twice deep, and both clips ran all week.'),
        opt('Play your side of the field', { morale: 2 }, 'You stayed on your side and did your job. Quiet weeks are good weeks for a corner.'),
      ],
    });
    deck.push({
      id: 'lifeC_cb_the_tell',
      category: 'position', cooldown: CD.position,
      title: 'The tell',
      body: 'Four hours into the tape you see it: a receiver in your own division changes his stance when the deep ball is coming. Nobody else in the room has noticed.',
      options: [
        opt('Share it with the whole secondary', { morale: 6 }, 'You put it on the big screen Wednesday morning. The safeties bought your lunch for a month.'),
        flip('Keep it and jump the route',
          { fanbase: 7 }, 'You sat on it, broke on the ball before he did, and took it the other way.',
          { morale: -4 }, 'He had fixed the stance. You guessed, he ran by you, and you could not explain why you bit.'),
      ],
    });
  }

  if (c.pos === 'EDGE') {
    deck.push({
      id: 'lifeC_edge_counter',
      category: 'position', cooldown: CD.position,
      title: 'One move is not enough',
      body: 'The line coach freezes the tape. Every tackle in the league has your first move by now, and they are setting for it before you take a step. You need a counter.',
      options: [
        opt('Spend the summer on the counter', { rating: 1, health: -3 }, 'A thousand reps against a sled and a patient old tackle. They cannot sit on your first move any more.'),
        opt('Trust the speed', { morale: 2 }, 'You stayed with what got you here. It still wins more than it loses.'),
      ],
    });
    deck.push({
      id: 'lifeC_edge_rotation',
      category: 'position', cooldown: CD.position,
      title: 'The rotation up front',
      body: 'The coaches want a rotation on the line this year. Fewer snaps for you, fresher rushes in the fourth quarter. Sacks get counted. Snaps you did not play do not.',
      options: [
        opt('Buy in', { health: 7, fanbase: -2 }, 'You came off the field on early downs and came back hunting late. The numbers dipped. The legs did not.'),
        opt('Ask to stay on the field', { morale: 3, health: -5 }, 'You played nearly every snap and felt all of them by Thanksgiving.'),
      ],
    });
  }

  if (c.pos === 'K') {
    deck.push({
      id: 'lifeC_k_week',
      category: 'position', cooldown: CD.position,
      title: 'The kicker\'s week',
      body: 'Your week is not their week. One real kicking day, a lot of stretching, and an operation with the long snapper and the holder that nobody notices until it breaks. How do you spend this one?',
      options: [
        flip('Add a second full kicking day',
          { rating: 1 }, 'The extra day sharpened the long ones. You are hitting from a range you used to leave to the punter.',
          { health: -6 }, 'The leg was dead by the weekend. A kicker has only so many swings in a week, and you spent them early.'),
        opt('Keep the routine, protect the leg', { health: 4 }, 'Same routine as always. The leg felt new on game day.'),
        opt('Spend it on the snap and the hold', { morale: 5 }, 'An extra hour a day with the long snapper and the holder. Laces out, every time, and the three of you eat together now.'),
      ],
    });
    if (yrs >= 1) {
      deck.push({
        id: 'lifeC_k_the_miss',
        category: 'position', cooldown: CD.position,
        title: 'The miss',
        body: 'You missed one that mattered and the building went quiet around you for a week. Every kicker knows the next tryout is one phone call away. Everybody else knows it too.',
        options: [
          opt('Own it at your locker', { fanbase: 4, morale: -2 }, 'You stood there and answered every question. It did not feel good, and people remembered that you did it.'),
          opt('Say nothing and hit the next one', { morale: 3 }, 'You said it was one kick and went back to work. The next one was good from the moment it left your foot.'),
          opt('Blame the hold', { morale: -7, fanbase: -4 }, 'You said the laces were in. The holder heard about it from a reporter. Nobody sat with you at lunch.'),
        ],
      });
    }
  }

  /* ============================ 2. THE FIRST TWO SEASONS ============================ */

  if (yrs <= 1) {
    deck.push({
      id: 'lifeC_playbook_test',
      category: 'earlyYears', cooldown: CD.once,
      title: 'The playbook test',
      body: 'The playbook grew over the winter and your position coach gives the young players a written test on it every Friday of the spring. Fail it and you are doing up downs in front of the veterans while they eat.',
      options: [
        opt('Study with the other rookies', { morale: 5 }, 'Flash cards in a hotel hallway until midnight. All of you passed, and all of you are closer for it.'),
        opt('Study alone and ace it', { rating: 1, morale: -3 }, 'You skipped the group and knew every check cold. The game slowed down. The rookie class noticed who was missing.'),
        flip('Wing it',
          { morale: 3 }, 'You guessed right more than you had any business doing. The coach squinted at you and moved on.',
          { morale: -6 }, 'You failed it. Up downs, in front of everybody, with a veteran counting them out loud.'),
      ],
    });
    {
      deck.push({
        id: 'lifeC_first_check',
        category: 'earlyYears', cooldown: CD.once,
        title: 'The first real check',
        body: 'Your rookie season is done and so is your first full year of game checks, and the taxes took more than you were ready for. Your agent knows an adviser who will sit down with you. Your cousins know a truck dealership.',
        options: [
          opt('Sit down and build a budget', { morale: 3 }, 'A boring hour with a spreadsheet. You know what you can spend now, and it is less than you thought.'),
          opt('Buy the truck first', { fanbase: 3, netWorth: -0.3 }, 'It is very large and very loud and the whole parking lot came out to look at it.'),
          opt('Send a share of it home', { morale: 6, netWorth: -0.2 }, 'Your mother called you crying. You would do it again tomorrow.'),
        ],
      });
    }
    deck.push({
      id: 'lifeC_rookie_wall',
      category: 'earlyYears', cooldown: CD.once,
      title: 'The rookie wall',
      body: 'Your first season ran weeks past where a college season ends, and your legs noticed about the time the leaves came down. The strength staff wants this offseason to make sure it never happens again.',
      options: [
        opt('Sleep, eat, cut the extras', { health: 8, fanbase: -2 }, 'You turned down every appearance and went to bed early like it was a job. It is a job.'),
        flip('Pile on extra work',
          { rating: 1 }, 'You worked all offseason like the wall was still in front of you. The veterans stopped calling you rookie.',
          { health: -7 }, 'The extra work found a soft tissue thing that took the whole spring to go away.'),
      ],
    });
  }

  /* A card is drawn in the offseason AFTER a season is played, so yrs is 1 in
     the offseason between the first year and the second, and 2 before the
     third. One window each: when this was written the cooldown tags were read by nothing, so a
     card with two windows could fire twice. */
  if (yrs === 1) {
    deck.push({
      id: 'lifeC_second_year_jump',
      category: 'earlyYears', cooldown: CD.once,
      title: 'The second year jump',
      body: 'Coaches say the biggest jump a player ever makes is the one between his first year and his second. The staff has a plan for your offseason. So does a private trainer back home.',
      options: [
        opt('Stay in the building with the staff', { rating: 1, morale: -2 }, 'You were the first car in the lot all spring. You missed home, and you came back a different player.'),
        opt('Go home to the private trainer', { health: 5, morale: 3 }, 'Home cooking and a trainer who has known you since you were fifteen. You reported fresh and happy.'),
      ],
    });
  }

  if (yrs === 2) {
    deck.push({
      id: 'lifeC_captains_locker',
      category: 'earlyYears', cooldown: CD.once,
      title: 'The locker next to the captain',
      body: 'The equipment staff moved your locker beside an old captain. He does not say much. He does watch.',
      options: [
        opt('Copy his routine', { health: 4, morale: 3 }, 'Cold tub at six, film at seven, the same breakfast every day. It turns out there is a reason he has lasted.'),
        opt('Ask him everything', { morale: 5 }, 'He answered every question, slowly, like he had been waiting for somebody to ask.'),
        opt('Keep your headphones on', { morale: -3 }, 'You kept to yourself. He stopped looking over.'),
      ],
    });
  }

  /* ================================ 3. PAST THIRTY ================================ */

  if (c.age >= 30) {
    deck.push({
      id: 'lifeC_vet_rest_day',
      category: 'veteran', cooldown: CD.veteran,
      title: 'The old man schedule',
      body: 'The head coach offers you one practice a week off, every week. The young guys already have a name for it.',
      options: [
        opt('Take the day', { health: 8, morale: -2 }, 'You watched practice in a bucket hat with a coffee. Your body felt it on game day, in a good way. The jokes wrote themselves.'),
        opt('Practice every day', { morale: 4, health: -5 }, 'You told him you practice when the team practices. The room loved it. Your hips filed a complaint.'),
      ],
    });
    deck.push({
      id: 'lifeC_your_replacement',
      category: 'veteran', cooldown: CD.veteran,
      title: 'They drafted your replacement',
      body: 'The team just used a draft pick on a kid who plays your position. Nobody in the building will say why. Everybody in the building knows why.',
      options: [
        opt('Teach him everything you know', { morale: 5, fanbase: 4 }, 'You gave him your notes, your tape and your seat in the meeting room. The city noticed how you carried it.'),
        flip('Make him earn every rep',
          { morale: 5 }, 'You beat him every day for a whole camp. The coaches stopped mentioning the future.',
          { morale: -5 }, 'He was better than you expected, sooner than you expected. That is a hard thing to watch up close.'),
        opt('Ask the front office for the plan', { morale: -3 }, 'You got a very polite answer that did not contain an answer.'),
      ],
    });
  }

  if (c.age >= 31) {
    {
      deck.push({
        id: 'lifeC_body_bill',
        category: 'veteran', cooldown: CD.veteran,
        title: 'The body sends a bill',
        body: 'What used to take a day to recover from now takes three. A specialist offers the full program: cold tubs, soft tissue work, sleep tracking, a chef. It is not cheap.',
        options: [
          opt('Pay for the full program', { health: 10, netWorth: -0.3 }, 'It cost a fortune and it worked. You are buying time now, and time is the only thing left worth buying.'),
          opt('Do the free version', { health: 4 }, 'Stretching, sleep and a foam roller. Not a miracle. Better than nothing.'),
          opt('Ignore it', { morale: 2, health: -5 }, 'You told yourself you feel fine. Your body kept its own records.'),
        ],
      });
    }
    deck.push({
      id: 'lifeC_two_clips',
      category: 'veteran', cooldown: CD.veteran,
      title: 'Two clips, side by side',
      body: 'Your position coach puts two clips on the screen. You, four years ago. You, last month. He does not say anything. He does not have to.',
      options: [
        flip('Change your game and win with your head',
          { rating: 1 }, 'You stopped trying to be fast and started being early. Old players who last all learn this trick.',
          { morale: -4 }, 'You tried to play a smarter game and mostly played a slower one.'),
        flip('Train like you are 25 again',
          { morale: 5 }, 'You outworked the kids all summer and it showed. For one more year, anyway.',
          { health: -8 }, 'Something pulled in June. You are not 25, and the training table knew it before you did.'),
        opt('Laugh it off', { morale: 2 }, 'You told him the old clip was a worse haircut. He laughed. The tape stayed the tape.'),
      ],
    });
  }

  if (c.age >= 31 && c.fanbase >= 50) {
    deck.push({
      id: 'lifeC_booth_audition',
      category: 'veteran', cooldown: CD.veteran,
      title: 'The booth calls',
      body: 'A network wants you in the studio for a playoff weekend as a guest analyst. Nobody uses the word audition. It is an audition.',
      options: [
        opt('Do it and play it safe', { fanbase: 6, netWorth: 0.2 }, 'You were smooth, prepared and a little dull. The producer asked for your number anyway.'),
        flip('Do it and say what you think',
          { fanbase: 9 }, 'You called a play before it happened, live on air. The clip did numbers.',
          { fanbase: -4, morale: -3 }, 'You criticized a scheme on air and found out Monday that the coach who runs it has friends in your building.'),
        opt('Decline, you still play', { morale: 3 }, 'You said you will talk about the game when you are done playing it.'),
      ],
    });
  }

  /* ============================== 4. THE BACKUP'S LIFE ============================== */

  if (backup) {
    deck.push({
      id: 'lifeC_scout_team',
      category: 'backup', cooldown: CD.backup,
      title: 'Scout team star',
      body: 'Your job this week is to be the other team\'s best player in practice so the starters get a look at him. They are starting to hate how good you are at it.',
      options: [
        opt('Give the starters an honest look', { morale: 5 }, 'You ran it exactly the way the opponent does. The starters were ready, and a coordinator learned your name.'),
        flip('Go at them like it counts',
          { rating: 1, morale: 3 }, 'You won the rep so many times the head coach stopped practice to yell at the starters.',
          { health: -6 }, 'A starter got tired of losing to the scout team and finished a rep through the whistle. You wore it.'),
      ],
    });
    deck.push({
      id: 'lifeC_one_snap_away',
      category: 'backup', cooldown: CD.backup,
      title: 'One snap away',
      body: 'Your position coach says the same thing to you every Friday: you are one snap away. He wants a starter\'s week out of you, every week, for a game you might never enter.',
      options: [
        opt('Prepare like the starter', { morale: 6 }, 'You knew the plan as well as the man ahead of you. Being ready is its own kind of calm.'),
        opt('Take the mental reps and save your legs', { health: 5 }, 'You watched, you listened and you stayed fresh. Nobody could tell you were wrong.'),
      ],
    });
  }

  /* Nobody puts a backup quarterback on the kickoff coverage unit. */
  if (backup && c.pos !== 'QB') {
    deck.push({
      id: 'lifeC_kick_coverage',
      category: 'backup', cooldown: CD.backup,
      title: 'The fastest way onto the field',
      body: 'The special teams coach has a spot on the coverage unit and he says it is the fastest way for a backup to get a jersey on Sunday. It is also a full speed collision, every time.',
      options: [
        opt('Become the best cover man in the building', { fanbase: 4, health: -4 }, 'You were the first one down the field all year. The crowd started cheering for a tackle on a kickoff.'),
        opt('Wait for snaps at your own position', { health: 3, morale: -2 }, 'You saved your body for a chance that has not come yet.'),
      ],
    });
  }

  if (backup && yrs >= 2) {
    deck.push({
      id: 'lifeC_agent_finds_a_door',
      category: 'backup', cooldown: CD.backup,
      title: 'Your agent finds a door',
      body: 'Your agent says there is a team that would give you a real shot at starting. Getting there means letting this front office know you want out.',
      options: [
        flip('Tell him to ask around quietly',
          { morale: 6 }, 'Nothing came of it this year, but your coaches found out other teams were calling and started giving you more to do.',
          { morale: -4, fanbase: -2 }, 'It leaked. A backup who wants out is not a story the fans enjoy.'),
        opt('Stay and win the job here', { morale: 4 }, 'You told him you are not done here. It felt good to say out loud.'),
      ],
    });
  }

  /* ============================ 5. THE LEAGUE'S ROSTER RULES ============================ */

  /* Game day elevation from the practice squad arrived in 2020. */
  if (c.year >= 2020 && yrs >= 2) {
    deck.push({
      id: 'lifeC_ps_elevation',
      category: 'rosterRules', cooldown: CD.rosterRules, story: STORY.practiceSquad,
      title: 'Up on Saturday, down on Monday',
      body: 'The team keeps calling the same practice squad kid up for game day and sending him back down the morning after. The rules only allow that so many times before they have to sign him for real or stop. The last one was last week. A coach asks what you think of him.',
      options: [
        flip('Vouch for him, loudly',
          { morale: 7 }, 'They signed him to the roster. He found you in the locker room and could not get the words out.',
          { morale: -3 }, 'They let him go back down and brought in somebody else. Your word did not carry as far as you thought.'),
        opt('Tell the truth: he is not ready yet', { morale: -2 }, 'You said it kindly and you said it straight. It still felt bad.'),
        opt('Stay out of it', {}, 'You said it was above your pay grade. The coach wrote something down anyway.'),
      ],
    });
  }

  if (c.health < 80) {
    /* The card is drawn in the offseason, so the choice is the surgery now and
       the list is the stake in the fall. What the list costs depends on the
       year: before 2012 it ended a season; from 2012 to 2019 a team could
       bring back only a very few players a year from it; from 2020 the way
       back is open to far more. No number is stated in any era. */
    const irEra = c.year < 2012 ? 'ends' : c.year < 2020 ? 'narrow' : 'open';
    deck.push({
      id: 'lifeC_injured_reserve',
      category: 'rosterRules', cooldown: CD.rosterRules, story: STORY.injuredReserve,
      title: irEra === 'ends' ? 'Injured reserve ends a season' : irEra === 'narrow' ? 'Injured reserve, and a narrow way back' : 'Injured reserve, with a way back',
      body: 'The joint you played on all last season needs surgery, and the trainers want it done now, while there is time to heal before camp. Put it off and the next bad week puts you on injured reserve. '
        + (irEra === 'ends'
          ? 'In this league that list ends a season. There is no coming back in December.'
          : irEra === 'narrow'
            ? 'A team gets to bring back only a very few players a year from that list, and nobody is promising you are one of them.'
            : 'Players come back from that list now, but only after a stretch of games in a sweatsuit.'),
      options: [
        opt('Have the surgery now', { health: 14, morale: -4 }, 'You spent the spring in a rehab room while everybody else was in the weight room. The joint feels new.'),
        opt('Put it off and play through it', { health: -8, fanbase: 4 }, 'You skipped the surgery and kept playing. The crowd knew what you were playing through. So did your body.'),
      ],
    });
  }

  if (c.salary >= eraCash(c, 6) && c.contractYears >= 2) {
    deck.push({
      id: 'lifeC_restructure',
      category: 'rosterRules', cooldown: CD.rosterRules, story: STORY.capRestructure,
      title: 'The cap guy calls',
      body: `The front office is turning a chunk of your ${r1(c.salary)}M salary into a signing bonus, and the cap guy calls to walk you through it. You get that money now, in one check, instead of week by week. The team gets to spread the cap charge over the years left on your deal. Your pay does not drop by a dollar. This is a restructure, not a pay cut.`,
      options: [
        opt('Thank him and tell him to use the room', { morale: 4, fanbase: 3 }, 'The check cleared and the team used the room to add help. Same money, sooner, and a front office that remembers how you took it.'),
        opt('Have your agent read every line first', { morale: 2 }, 'Your agent took two days and found nothing wrong with it. You know exactly what it was.'),
        opt('Complain about it in public', { morale: -3, fanbase: -3 }, 'You told a reporter the cap is their problem. The money landed the same either way, and the story made you sound ungrateful for it.'),
      ],
    });
  }

  if (yrs >= 2) {
    deck.push({
      id: 'lifeC_final_cuts',
      category: 'rosterRules', cooldown: CD.rosterRules,
      title: 'Cutdown day',
      body: 'The roster has to be down to the limit by the end of the day, and the guy who drove you to the facility every morning of camp is on the wrong side of the number.',
      options: [
        opt('Call him that night', { morale: 4 }, 'You talked for an hour about nothing. He will catch on somewhere. You told him so and you meant it.'),
        flip('Tell the coaches they got it wrong',
          { morale: 5 }, 'They brought him back to the practice squad two days later. Maybe your word helped.',
          { morale: -4 }, 'The coach heard you out and said that is why he makes the decisions and you do not.'),
        opt('Keep your head down, it is a business', { morale: -2 }, 'You cleaned out the passenger seat of his car in your head and went to meetings.'),
      ],
    });
  }

  /* The voluntary program and the one mandatory minicamp: 2012 onward. */
  if (c.year >= 2012 && yrs >= 2) {
    deck.push({
      id: 'lifeC_voluntary_spring',
      category: 'rosterRules', cooldown: CD.rosterRules,
      title: 'Voluntary means voluntary',
      body: 'The spring workouts are voluntary. It says so in the labor deal. The minicamp at the end of them is not, and skipping that one costs real money. Your trainer back home wants you with him until camp.',
      options: [
        opt('Show up for all of it', { morale: 5, health: -2 }, 'You were there for every voluntary day. Coaches say they do not keep track. Coaches keep track.'),
        opt('Skip the voluntary part, report for minicamp', { health: 6, morale: -3 }, 'You trained at home and showed up the day you had to. Within the rules, and a little outside the mood of the building.'),
        opt('Skip all of it and pay the fines', { health: 6, morale: -6, netWorth: -0.1 }, 'You stayed home through minicamp. The fines came out of your account and the head coach found a new way to say disappointed.'),
      ],
    });
  }

  if (backup) {
    deck.push({
      id: 'lifeC_inactive_list',
      category: 'rosterRules', cooldown: CD.rosterRules,
      title: 'Not in uniform',
      body: 'A team carries more players than it is allowed to dress on game day. This week you are one of the ones in a sweatsuit: healthy, on the roster and not playing.',
      options: [
        opt('Run the stadium steps before kickoff anyway', { health: 3, morale: 2 }, 'You got your work in while the stands filled up. An usher asked which team you played for.'),
        opt('Ask the coach what gets you a jersey', { morale: 4 }, 'He gave you two things to fix. Two things is a plan.'),
        opt('Sulk where the cameras can see', { morale: -5, fanbase: -3 }, 'The broadcast found you on the bench with your hood up. So did everybody else.'),
      ],
    });
  }

  return deck;
}
